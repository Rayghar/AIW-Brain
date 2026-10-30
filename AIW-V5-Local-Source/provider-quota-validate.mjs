// A spend limit is not a rate limit, and a failed run holds only what it may have cost (round 41, FIX NOW 6 and 7). A
// 429 that says the provider account's spend limit or credit is exhausted (OpenAI: insufficient_quota and its codes;
// Anthropic: its billing error, or the 400 it sends for a credit balance too low) is provider_quota: sent once, never
// retried, and answered with the owner's action, because waiting will not clear it. A real rate limit stays
// provider_limit, retried once and answered with the provider's Retry-After. A failed run settles its token reservation
// (intelligence-service.js settleFailedRun): what was billed when that is known, none when no call got an answer, the
// reservation kept where the use is unknown (a timeout or an unreadable answer, of the draft or of the check after it; a
// call another route answered or failed on). A refused request names the budget that refused it. The
// architecture request shares the seam's timer, so a fallback route after a timeout gets a timer of its own.
// Run: npm run test:provider-quota. Synthetic keys and test doubles only; no live LLM call.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {createProject} from './shared/projects-domain.js';
import {applyCanonical} from './public/canonical-command.js';
import {draftSteps} from './public/architecture-drafter.js';
import {themePacket, architectureInstructionsPin} from './public/architecture-contract.js';
import {intelligenceStatus, modelCall, verifyConnection} from './intelligence-provider.js';
import {requestArchitectureDraft} from './architecture-request.js';
import * as service from './intelligence-service.js';
import {answer} from './mock-llm-provider.mjs';

const results = [];
async function check(name, fn) {
  try { await fn(); results.push({name, ok: true}); console.log('PASS', name); }
  catch (e) { results.push({name, ok: false, error: String(e?.message || e).slice(0, 600)}); console.log('FAIL', name, '\n ', String(e?.message || e).slice(0, 600)); }
}
const call = () => ({signal: new AbortController().signal, aborted: false, attempts: 0});
const ask = {instructions: 'x', input: {}, schema: {type: 'object'}, name: 'aiw_probe', mode: 'field'};
const quotaBody = JSON.stringify({error: {message: 'Your project has reached its configured enforced spend limit.', type: 'insufficient_quota', param: null, code: 'project_spend_limit_exceeded'}});
const rateBody = JSON.stringify({error: {message: 'Rate limit reached for requests.', type: 'requests', param: null, code: 'rate_limit_exceeded'}});
const reply = (status, body, headers = {}) => new Response(body, {status, headers: {'Content-Type': 'application/json', ...headers}});
const anthropicError = (status, type, message) => reply(status, JSON.stringify({type: 'error', error: {type, message}}), {'request-id': 'req_synthetic'});
const openaiEnv = {OPENAI_API_KEY: 'synthetic-key-never-returned', AIW_LLM_PROVIDER: 'openai'};
const anthropicEnv = {ANTHROPIC_API_KEY: 'synthetic-key-never-returned', AIW_LLM_PROVIDER: 'anthropic'};
const counted = respond => { const f = async (url, init) => { f.hits++; f.urls.push(String(url)); return respond(url, init); }; f.hits = 0; f.urls = []; return f; };
const hang = signal => new Promise((resolve, reject) => { const abort = () => reject(Object.assign(Error('This operation was aborted'), {name: 'AbortError'})); if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, {once: true}); });

// ---------------------------------------------------------------- the seam: one predicate per wire
await check('OpenAI: a 429 insufficient_quota / project_spend_limit_exceeded is provider_quota, sent once (no retry), with the owner action and no upstream text', async () => {
  const f = counted(() => reply(429, quotaBody, {'x-request-id': 'req_quota'}));
  await assert.rejects(modelCall(openaiEnv, intelligenceStatus(openaiEnv, 'field'), ask, call(), f), e => {
    assert.equal(e.code, 'provider_quota');
    assert.match(e.message, /spend limit or credit is exhausted/); assert.match(e.message, /[Ww]aiting will not clear it/);
    assert.doesNotMatch(e.message, /enforced spend limit/, 'the upstream message is never repeated');
    assert.deepEqual(e.providerFailure, {upstreamStatus: 429, upstreamRequestId: 'req_quota', upstreamType: 'insufficient_quota', upstreamCode: 'project_spend_limit_exceeded'});
    return true;
  });
  assert.equal(f.hits, 1, 'a spend-limit refusal is not sent twice');
});
await check('OpenAI: a real rate limit stays provider_limit, retried once, with the provider\'s Retry-After carried', async () => {
  const f = counted(() => reply(429, rateBody, {'retry-after': '1'}));
  await assert.rejects(modelCall(openaiEnv, intelligenceStatus(openaiEnv, 'field'), ask, call(), f), e => e.code === 'provider_limit' && e.retryAfter === 1 && /clears with time/.test(e.message));
  assert.equal(f.hits, 2, 'one bounded retry, then the limit');
});
await check('OpenAI-compatible: the Chat Completions wire reads the same quota signal (provider_quota, one call)', async () => {
  const env = {AIW_LLM_PROVIDERS: JSON.stringify({gateway: {kind: 'openai-compatible', apiKey: 'synthetic-gateway-key', baseURL: 'https://gateway.test/v1', models: ['gateway-model']}}), AIW_LLM_ROUTE_FIELD: 'gateway:gateway-model'};
  const f = counted(() => reply(429, quotaBody));
  await assert.rejects(modelCall(env, intelligenceStatus(env, 'field'), ask, call(), f), e => e.code === 'provider_quota' && e.providerFailure?.upstreamType === 'insufficient_quota');
  assert.equal(f.hits, 1);
});
await check('Anthropic: its billing error (402 billing_error) is provider_quota, sent once', async () => {
  const f = counted(() => anthropicError(402, 'billing_error', 'There is an issue with your billing.'));
  await assert.rejects(modelCall(anthropicEnv, intelligenceStatus(anthropicEnv, 'field'), ask, call(), f), e => e.code === 'provider_quota' && /[Ww]aiting will not clear it/.test(e.message) && !/issue with your billing/.test(e.message) && e.providerFailure?.upstreamType === 'billing_error');
  assert.equal(f.hits, 1);
});
await check('Anthropic: a 400 for a credit balance too low is provider_quota; another 400 stays provider_unavailable', async () => {
  await assert.rejects(modelCall(anthropicEnv, intelligenceStatus(anthropicEnv, 'field'), ask, call(), async () => anthropicError(400, 'invalid_request_error', 'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.')), e => e.code === 'provider_quota' && !/Plans & Billing/.test(e.message));
  await assert.rejects(modelCall(anthropicEnv, intelligenceStatus(anthropicEnv, 'field'), ask, call(), async () => anthropicError(400, 'invalid_request_error', 'max_tokens: field required')), e => e.code === 'provider_unavailable');
});
await check('Anthropic: a 429 rate_limit_error stays provider_limit, retried once', async () => {
  const f = counted(() => anthropicError(429, 'rate_limit_error', 'slow down'));
  await assert.rejects(modelCall(anthropicEnv, intelligenceStatus(anthropicEnv, 'field'), ask, call(), f), e => e.code === 'provider_limit' && !/slow down/.test(e.message));
  assert.equal(f.hits, 2);
});
await check('Connection check: a quota refusal the free probe can see is reported as provider_quota; a passing probe says it cannot see a spend limit', async () => {
  const refused = await verifyConnection(openaiEnv, {force: true, fetcher: async () => reply(429, quotaBody)});
  assert.equal(refused.ok, false); assert.equal(refused.code, 'provider_quota'); assert.equal(refused.upstreamStatus, 429);
  const passed = await verifyConnection(openaiEnv, {force: true, fetcher: async () => reply(200, JSON.stringify({id: 'gpt-4.1-mini', object: 'model'}))});
  assert.equal(passed.ok, true); assert.equal(passed.limitsChecked, false, 'the probe does not claim to have checked the spend limit');
  assert.equal(intelligenceStatus(openaiEnv).connectionVerified.limitsChecked, false, 'the status carries it');
  const billing = await verifyConnection(anthropicEnv, {force: true, fetcher: async () => anthropicError(402, 'billing_error', 'billing')});
  assert.equal(billing.code, 'provider_quota');
});

await check('Sol\'s status sentence says what a passing probe cannot see, and says a quota refusal in words', async () => {
  const {SOL, solStatusLine} = await import('./public/brain-reasoning-ui.js');
  const at = '2026-10-30T10:00:00.000Z', base = {configured: true, provider: 'OpenAI', providerId: 'openai', model: 'gpt-4.1-mini', retention: 'Sent over the server.', missing: []};
  SOL.config = {...base, connectionVerified: {at, ok: true, model: 'gpt-4.1-mini', limitsChecked: false}};
  assert.match(solStatusLine(), /verified at 2026-10-30 10:00 \(a spend limit or exhausted credit shows only when a request is refused\)/);
  SOL.config = {...base, connectionVerified: {at, ok: false, model: 'gpt-4.1-mini', code: 'provider_quota', upstreamStatus: 429}};
  assert.match(solStatusLine(), /last probe was refused: the provider account’s spend limit or credit is exhausted/); assert.doesNotMatch(solStatusLine(), /provider_quota/, 'no code name in the sentence a person reads');
  SOL.config = null;
});

// ---------------------------------------------------------------- the run's calls: what a failed run was billed, and whether that is all
await check('runCalls: a call that timed out or could not be read after the draft answered is not settled, nor a call another route answered or failed on; the failing call\'s own usage is read before the draft\'s is attached', async () => {
  const {runCalls, parsed} = await import('./intelligence-provider.js');
  assert.equal(typeof runCalls, 'function', 'the seam tracks a request\'s calls');
  const usage = (inputTokens, outputTokens) => ({inputTokens, outputTokens}), draft = {usage: usage(1200, 400)}, fallback = {from: {provider: 'default'}, to: {provider: 'backup'}, reason: 'timeout'};
  const coded = (code, extra = {}) => Object.assign(Error(code), {code, ...extra});
  const thrown = fn => { try { fn(); } catch (e) { return e; } throw Error('expected a throw'); };
  // answered: the calls that returned; error: the failing call's error (fromCall) or one thrown after the calls.
  const fail = async (answered, error, fromCall = true) => { const run = runCalls({}); for (const a of answered) await run.call(Promise.resolve(a)); if (fromCall) await run.call(Promise.reject(error)).catch(() => {}); return run.failed(error); };
  const settle = async (...args) => { const e = await fail(...args); return {settled: e.settled, used: service.settleFailedRun(e)}; };
  assert.deepEqual(await settle([draft], coded('timeout')), {settled: false, used: null}, 'the check timed out after the draft answered: its use is unknown, the reservation stands');
  assert.deepEqual(await settle([draft], coded('invalid_output')), {settled: false, used: null}, 'the check\'s answer could not be read (no usage): the reservation stands');
  assert.deepEqual(await settle([draft], coded('provider_unavailable', {transportFailure: {phase: 'processing'}})), {settled: false, used: null}, 'a connection lost while the answer was read');
  assert.deepEqual(await settle([draft], thrown(() => parsed({parseError: 'x', usage: usage(300, 50)}))), {settled: true, used: 1950}, 'a check that answered unparsable text reported its usage: the draft\'s and the check\'s');
  assert.deepEqual(await settle([draft], coded('provider_quota', {status: 429})), {settled: true, used: 1600}, 'a check refused before it answered: the draft\'s usage');
  assert.deepEqual(await settle([draft], coded('invalid_output'), false), {settled: true, used: 1600}, 'an error after the calls (a draft that did not fit): the draft\'s usage');
  assert.deepEqual(await settle([], coded('provider_quota', {status: 429})), {settled: true, used: 0}, 'no call got an answer');
  assert.deepEqual(await settle([{...draft, routeFallback: fallback}], coded('provider_quota', {status: 429})), {settled: false, used: null}, 'a draft another route answered after the first timed out');
  assert.deepEqual(await settle([{...draft, call: {routeFallback: fallback}}], coded('invalid_output'), false), {settled: false, used: null}, 'the generate pass keeps its call under call');
  assert.deepEqual(await settle([draft], coded('incomplete', {usage: usage(100, 20), routeFallback: fallback})), {settled: false, used: null}, 'a check that failed on another route with its own usage, after the first route timed out');
  const viaFallback = thrown(() => parsed({parseError: 'x', usage: usage(100, 20), routeFallback: fallback}));
  assert.deepEqual(viaFallback.routeFallback, fallback, 'an unparsable answer keeps the route that answered it');
  assert.deepEqual(await settle([], viaFallback), {settled: false, used: null});
  // A fallback route refused at the connection, after the primary timed out: the timer rebuilds the error, and the rebuilt
  // error keeps the route that was tried, so the run's use stays unknown (rc41 close: the rebuild had dropped it).
  const {timed} = await import('./intelligence-provider.js');
  const refused = await timed(5000, async () => { throw Object.assign(new TypeError('fetch failed'), {cause: {code: 'ECONNREFUSED'}, routeFallback: fallback}); }).then(() => null, e => e);
  assert.deepEqual([refused?.code, refused?.routeFallback], ['provider_unavailable', fallback], 'the rebuilt connection error keeps its route fallback');
  assert.deepEqual(await settle([], refused), {settled: false, used: null}, 'the draft: primary timed out, the fallback refused the connection');
  assert.deepEqual(await settle([draft], refused), {settled: false, used: null}, 'the check: primary timed out after the draft answered, the fallback refused the connection');
});

// ---------------------------------------------------------------- the architecture request on the seam's own timer
await check('Architecture: the request uses the seam\'s timer, so a fallback after a primary timeout answers with a timer of its own', async () => {
  const at = '2026-10-10T00:00:00Z';
  let p = createProject({name: 'Statement pilot', template: 'blank'}, 'architect', at);
  p = applyCanonical(p, {type: 'artefact', payload: {type: 'requirement', title: 'Account statement', description: 'Customers shall see and download account statements.', source: 'Synthetic workshop', confirmed: false}}, at).document;
  const steps = draftSteps(p); let step; while (!(step = steps.next()).done) { /* the rules skeleton */ }
  const packet = themePacket(p, step.value, {key: 'pilot', title: 'Pilot', kind: 'area', id: null, stored: false, members: p.artefacts.filter(a => a.type === 'requirement')}, {instructions: architectureInstructionsPin()});
  const env = {OPENAI_API_KEY: 'synthetic-primary-key', AIW_LLM_PROVIDER: 'openai', AIW_LLM_BACKUP_KIND: 'openai', AIW_LLM_BACKUP_BASE_URL: 'https://backup.test/v1', AIW_LLM_BACKUP_API_KEY: 'synthetic-backup-key', AIW_LLM_BACKUP_MODELS: 'backup-model', AIW_LLM_FALLBACK: 'backup:backup-model'};
  const f = counted(async (url, init) => {
    if (String(url).startsWith('https://api.openai.com/')) return hang(init.signal);
    if (init.signal?.aborted) throw Object.assign(Error('This operation was aborted'), {name: 'AbortError'});
    const sent = JSON.parse(init.body), theme = JSON.parse(sent.input[0].content), envelope = body => reply(200, JSON.stringify({id: 'backup-' + sent.text.format.name, model: 'backup-model', status: 'completed', output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify(body)}]}], usage: {input_tokens: 10, output_tokens: 8}}));
    if (sent.text.format.name === 'aiw_architecture_draft_check') return envelope({proposals: [{id: 'A1', supported: true, defects: [], notes: ['The basis matches the cited requirement.']}]});
    return envelope({proposals: [{kind: 'responsibility', title: 'Statement retrieval', statement: 'Sol proposes a statement retrieval boundary.', requirementRefs: [theme.requirements[0].ref], passages: [], basis: 'Customers shall see and download account statements.', interpretation: 'Sol proposes a retrieval responsibility that can be allocated to a component.'}], keep: []});
  });
  const drafted = await requestArchitectureDraft(env, packet, {fetcher: f, timeoutMs: 300, retry: false});
  assert.equal(drafted.result.proposals.length, 1, 'the fallback answered the draft and its check');
  assert.deepEqual(drafted.providerReceipt.calls.map(c => [c.role, c.provider, c.routeFallback?.reason]), [['draft', 'backup', 'timeout'], ['check', 'backup', 'timeout']]);
  assert.equal(f.urls.filter(u => u.startsWith('https://backup.test/')).length, 2);
  const source = readFileSync(new URL('./architecture-request.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /function startCall|async function timed|const parsed\s*=|async function declinable/, 'no shim of the seam\'s timer, parser or refusal reader');
});

// ---------------------------------------------------------------- the service: the run, its reservation and its answer
const owner = 'quota-test', projectId = 'quota-project', files = new Map();
const db = localDatabase(':memory:');
const baseEnv = {DB: db, FILES: {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k)} : null; }, async delete(k) { files.delete(k); }}, ASSETS: {fetch: () => new Response('asset')}};
const store = async (id, policy) => { const doc = {...structuredClone(withFinalReview(seedProject())), id}; if (policy) doc.workspace = {...(doc.workspace || {}), aiPolicy: policy}; await db.prepare('INSERT INTO projects (owner_id,id,document,revision,updated_at) VALUES (?,?,?,1,?)').bind(owner, id, JSON.stringify(doc), new Date().toISOString()).run(); };
await store(projectId);
const previousFetch = globalThis.fetch;
const req = async (path, body, {env = baseEnv, project = projectId} = {}) => { const response = await worker.fetch(new Request('https://aiw.test' + path + (path.includes('?') ? '&' : '?') + 'project=' + project, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': owner, Origin: 'https://aiw.test', 'Content-Type': 'application/json'}, ...(body ? {body: JSON.stringify(body)} : {})}), env); return {status: response.status, headers: response.headers, data: await response.json()}; };
const review = async (env, project = projectId) => { const preview = await req('/api/intelligence/review-context', {chapter: 4}, {env, project}); assert.equal(preview.status, 200, JSON.stringify(preview.data)); return req('/api/intelligence/review', {chapter: 4, packetStamp: preview.data.packet.stamp, requestId: crypto.randomUUID()}, {env, project}); };
const row = id => db.prepare('SELECT status,error_code,reserved_tokens,used_tokens FROM intelligence_runs WHERE owner_id=? AND id=?').bind(owner, id).first();
const counts = async id => (await db.prepare('SELECT COALESCE(used_tokens,reserved_tokens) AS held FROM intelligence_runs WHERE owner_id=? AND id=?').bind(owner, id).first()).held;
const keyed = {...baseEnv, ...openaiEnv};
try {
  await check('Service: a spend-limit refusal is one call, answered with provider_quota and the owner action (not a 429), and releases its reservation', async () => {
    const f = counted(() => reply(429, quotaBody)); globalThis.fetch = f;
    const refused = await review(keyed);
    assert.equal(f.hits, 1, 'sent once');
    assert.notEqual(refused.status, 429, 'not the retry-later answer');
    assert.equal(refused.data.status, 'failed');
    assert.match(refused.data.error, /spend limit or credit is exhausted/); assert.match(refused.data.error, /waiting will not clear it/i); assert.doesNotMatch(refused.data.error, /request limit/);
    const r = await row(refused.data.id);
    assert.equal(r.error_code, 'provider_quota');
    assert.equal(r.used_tokens, 0, 'no call got an answer, so the reservation is released');
    assert.equal(await counts(refused.data.id), 0, 'the budget counts nothing for it');
    assert(r.reserved_tokens > 0);
  });
  await check('Service: a rate limit stays provider_limit (429) with the provider\'s Retry-After, retried once, and releases its reservation', async () => {
    const f = counted(() => reply(429, rateBody, {'retry-after': '1'})); globalThis.fetch = f;
    const limited = await review(keyed);
    assert.equal(f.hits, 2); assert.equal(limited.status, 429); assert.match(limited.data.error, /request limit/);
    assert.equal(limited.headers.get('retry-after'), '1'); assert.equal(limited.data.retryAfterSeconds, 1);
    const r = await row(limited.data.id); assert.equal(r.error_code, 'provider_limit'); assert.equal(r.used_tokens, 0);
  });
  await check('Service: a run whose draft answered and whose check hit the spend limit records the draft\'s billed tokens', async () => {
    const f = counted((url, init) => { const body = JSON.parse(init.body); return body.text.format.name === 'aiw_model_review_check' ? reply(429, quotaBody) : reply(200, JSON.stringify(answer(body))); }); globalThis.fetch = f;
    const failed = await review(keyed);
    assert.equal(f.hits, 2, 'the draft, then the check once');
    const r = await row(failed.data.id); assert.equal(r.error_code, 'provider_quota');
    assert.equal(r.used_tokens, 1600, 'the draft call\'s billed usage (1,200 in, 400 out), not the reservation');
  });
  await check('Service: a timeout keeps the reservation (the provider may have billed it)', async () => {
    const f = counted((url, init) => hang(init.signal)); globalThis.fetch = f;
    const timed = await review({...keyed, AIW_LLM_TIMEOUT_MS: '1000'});
    assert.equal(timed.data.status, 'failed');
    const r = await row(timed.data.id); assert.equal(r.error_code, 'timeout');
    assert.equal(r.used_tokens, null, 'the reservation stands');
    assert.equal(await counts(timed.data.id), r.reserved_tokens);
  });
  await store('quota-check-pass');
  const draftThen = respond => counted((url, init) => { const body = JSON.parse(init.body); return body.text.format.name === 'aiw_model_review_check' ? respond(init) : reply(200, JSON.stringify(answer(body))); });
  await check('Service: a check that times out after the draft answered keeps the reservation (the check may have been billed)', async () => {
    const f = draftThen(init => hang(init.signal)); globalThis.fetch = f;
    const timed = await review({...keyed, AIW_LLM_TIMEOUT_MS: '1000'}, 'quota-check-pass');
    assert.equal(timed.data.status, 'failed'); assert.equal(f.hits, 2, 'the draft, then the check');
    const r = await row(timed.data.id); assert.equal(r.error_code, 'timeout');
    assert.equal(r.used_tokens, null, 'not the draft\'s 1,600 tokens alone: the reservation stands');
    assert.equal(await counts(timed.data.id), r.reserved_tokens);
  });
  await check('Service: a check whose answer could not be read after the draft answered keeps the reservation', async () => {
    const f = draftThen(() => reply(200, 'not a JSON body')); globalThis.fetch = f;
    const unread = await review(keyed, 'quota-check-pass');
    assert.equal(unread.data.status, 'failed'); assert.equal(f.hits, 2);
    const r = await row(unread.data.id); assert.equal(r.error_code, 'invalid_output');
    assert.equal(r.used_tokens, null, 'the reservation stands');
  });
  await check('Service: every failure UPDATE settles used_tokens, and settleFailedRun keeps the reservation where the use is unknown', async () => {
    const source = readFileSync(new URL('./intelligence-service.js', import.meta.url), 'utf8'), updates = source.match(/UPDATE intelligence_runs SET status='failed'[^"]*"/g) || [];
    assert(updates.length >= 7, 'the six mode failures and the architecture theme');
    for (const u of updates) assert.match(u, /used_tokens=\?/, u);
    assert.equal(typeof service.settleFailedRun, 'function');
    assert.equal(service.settleFailedRun(Object.assign(Error('x'), {code: 'storage'})), null);
    assert.equal(service.settleFailedRun(Object.assign(Error('x'), {code: 'timeout'})), null);
    assert.equal(service.settleFailedRun(Object.assign(Error('x'), {code: 'not_configured'})), 0);
  });
  await check('Service: a refused request names the budget that refused it (the daily tokens, the hourly requests), not always the hourly one', async () => {
    await store('quota-tokens', {enabled: true, hourlyRequests: 30, dailyTokens: 1000});
    await store('quota-hourly', {enabled: true, hourlyRequests: 0, dailyTokens: 1000000});
    const f = counted(() => reply(200, '{}')); globalThis.fetch = f;
    const tokens = await review(keyed, 'quota-tokens');
    assert.equal(tokens.status, 429); assert.match(tokens.data.error, /daily token budget/); assert.match(tokens.data.error, /1,000 tokens/); assert.doesNotMatch(tokens.data.error, /hourly/);
    const hourly = await review(keyed, 'quota-hourly');
    assert.equal(hourly.status, 429); assert.match(hourly.data.error, /hourly request budget/); assert.doesNotMatch(hourly.data.error, /token/);
    assert.equal(f.hits, 0, 'nothing reaches the provider');
  });
} finally { globalThis.fetch = previousFetch; db.close?.(); }

const failed = results.filter(r => !r.ok);
console.log(JSON.stringify({passed: results.length - failed.length, failed: failed.length, checks: results}, null, 1));
process.exitCode = failed.length ? 1 : 0;
