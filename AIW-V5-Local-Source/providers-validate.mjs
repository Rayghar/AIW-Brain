import assert from 'node:assert/strict';
import {intelligenceStatus, modelCall, providerReceipt, providers, requestReasoning, sumUsage, verifyConnection} from './intelligence-provider.js';
import {viaAnthropic} from './mock-llm-provider.mjs';

const env = {
  AIW_LLM_PROVIDERS: JSON.stringify({sol: {kind: 'openai', apiKey: 'synthetic-key', models: ['architect-model', 'review-model']}}),
  AIW_LLM_ROUTE_ARCHITECTURE: 'sol:architect-model',
  AIW_LLM_ROUTE_ARCHITECTURE_CHECK: 'sol:review-model'
};
const status = intelligenceStatus(env, 'architecture');
assert.equal(status.configured, true, 'a dedicated architecture route works without a default key');
assert.deepEqual(status.route.draft, {provider: 'sol', model: 'architect-model', variable: 'AIW_LLM_ROUTE_ARCHITECTURE'});
assert.deepEqual(status.route.check, {provider: 'sol', model: 'review-model', variable: 'AIW_LLM_ROUTE_ARCHITECTURE_CHECK'});
assert.equal(status.providers.find(p => p.name === 'sol').keyConfigured, true);
assert(!JSON.stringify(status).includes('synthetic-key'), 'credentials stay on the server');
assert.equal(providers(env).byName.get('sol').kind, 'openai');
const invalid = intelligenceStatus({...env, AIW_LLM_ROUTE_ARCHITECTURE_CHECK: 'missing:model'}, 'architecture');
assert.equal(invalid.configured, false);
assert(invalid.missing.some(x => x.includes('AIW_LLM_ROUTE_ARCHITECTURE_CHECK')));
console.log('PASS Providers: dedicated architecture draft/check routing, validation and credential-safe status');

// The three provider wires and their task routes use only synthetic packets and keys.
const secret = 'synthetic-provider-key';
const multi = {
  AIW_LLM_PROVIDERS: JSON.stringify({
    sol: {kind: 'openai', apiKey: secret + '-openai', baseURL: 'https://openai.test/v1', models: ['architect-model'], pricing: {input: 1, output: 2}},
    gateway: {kind: 'openai-compatible', apiKey: secret + '-gateway', baseURL: 'https://gateway.test/v1', models: ['gateway-model'], pricing: {input: 3, output: 4}},
    critic: {kind: 'anthropic', apiKey: secret + '-anthropic', baseURL: 'https://anthropic.test', models: ['critic-model'], pricing: {input: 5, output: 6}}
  }),
  AIW_LLM_ROUTE_ARCHITECTURE: 'sol:architect-model',
  AIW_LLM_ROUTE_ARCHITECTURE_CHECK: 'gateway:gateway-model',
  AIW_LLM_ROUTE_REVIEW: 'critic:critic-model',
  AIW_LLM_FALLBACK: 'gateway:gateway-model'
};
const routed = intelligenceStatus(multi, 'architecture');
assert.equal(routed.configured, true);
assert.deepEqual(routed.route.check, {provider: 'gateway', model: 'gateway-model', variable: 'AIW_LLM_ROUTE_ARCHITECTURE_CHECK'});
assert(routed.providers.find(p => p.name === 'critic').usedBy.some(x => x.mode === 'review' && x.pass === 'draft'));
assert(!JSON.stringify(routed).includes(secret));
const remoteHttp = intelligenceStatus({...multi, AIW_LLM_PROVIDERS: JSON.stringify({local: {kind: 'openai-compatible', models: ['m'], baseURL: 'http://remote.test/v1'}}), AIW_LLM_ROUTE_ARCHITECTURE: 'local:m', AIW_LLM_ROUTE_ARCHITECTURE_CHECK: 'local:m', AIW_LLM_FALLBACK: ''}, 'architecture');
assert.equal(remoteHttp.configured, false);
assert(remoteHttp.missing.some(x => /https, or http on loopback/.test(x)));
const loopback = intelligenceStatus({...multi, AIW_LLM_PROVIDERS: JSON.stringify({local: {kind: 'openai-compatible', models: ['m'], baseURL: 'http://127.0.0.1:4180/v1'}}), AIW_LLM_ROUTE_ARCHITECTURE: 'local:m', AIW_LLM_ROUTE_ARCHITECTURE_CHECK: 'local:m', AIW_LLM_FALLBACK: ''}, 'architecture');
assert.equal(loopback.configured, true);

const packet = {theme: 'synthetic appointments', requirement: 'REQ-001'};
const schema = {type: 'object', properties: {answer: {type: 'string'}}, required: ['answer'], additionalProperties: false};
const request = (mode, name) => ({instructions: 'Return one synthetic answer.', input: packet, schema, name, mode});
const call = () => ({signal: new AbortController().signal, attempts: 0, rearm() {}});
const seen = [];
let refusePrimary = false;
const baseFetch = async (url, init = {}) => {
  const body = JSON.parse(init.body || '{}'), target = String(url);
  seen.push({target, body, headers: init.headers, pass: init.aiwPass});
  if (refusePrimary && /openai\.test/.test(target)) return new Response(JSON.stringify({id: 'refused', model: body.model, status: 'completed', output: [{type: 'message', content: [{type: 'refusal', refusal: 'Synthetic refusal'}]}]}), {status: 200, headers: {'content-type': 'application/json'}});
  if (/\/models\//.test(target)) return new Response(JSON.stringify({id: 'architect-model'}), {status: 200, headers: {'content-type': 'application/json'}});
  const answer = {answer: 'A synthetic proposal, subject to architect review.'};
  if (/\/chat\/completions$/.test(target)) return new Response(JSON.stringify({id: 'chat-synthetic', model: body.model, choices: [{finish_reason: 'stop', message: {content: JSON.stringify(answer)}}], usage: {prompt_tokens: 20, completion_tokens: 10}}), {status: 200, headers: {'content-type': 'application/json'}});
  return new Response(JSON.stringify({id: 'response-synthetic', model: body.model, status: 'completed', output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify(answer)}]}], usage: {input_tokens: 20, output_tokens: 10}}), {status: 200, headers: {'content-type': 'application/json'}});
};
const anthropicFetch = viaAnthropic(baseFetch);
const fetcher = async (url, init) => /\/v1\/messages(?:\?|$)/.test(String(url)) ? anthropicFetch(url, init) : baseFetch(url, init);
const draft = await modelCall(multi, routed, request('architecture', 'aiw_architecture_draft'), call(), fetcher);
const check = await modelCall(multi, routed, request('architecture', 'aiw_architecture_draft_check'), call(), fetcher);
const critique = await modelCall(multi, intelligenceStatus(multi, 'review'), request('review', 'aiw_model_review'), call(), fetcher);
for (const result of [draft, check, critique]) assert.equal(result.raw.answer, 'A synthetic proposal, subject to architect review.');
assert.deepEqual([draft.provider.kind, check.provider.kind, critique.provider.kind], ['openai', 'openai-compatible', 'anthropic']);
assert.deepEqual([draft.pass, check.pass, critique.pass], ['draft', 'check', 'draft']);
assert.equal(seen.find(x => /openai\.test/.test(x.target)).body.store, false);
const chat = seen.find(x => /\/chat\/completions$/.test(x.target));
assert.equal(chat.body.response_format.type, 'json_schema');
assert.deepEqual(chat.body.messages.map(m => m.role), ['system', 'user']);
// Round 23: on the Responses wire the architecture passes get room for a reasoning model's thinking and a full theme of
// proposals; every other mode keeps the earlier 6,000-token ceiling.
assert.equal(seen.find(x => /openai\.test\/v1\/responses$/.test(x.target) && x.body.text?.format?.name === 'aiw_architecture_draft').body.max_output_tokens, 32000);
{
  const fieldEnv = {...multi, AIW_LLM_ROUTE_FIELD: 'sol:architect-model'}, before = seen.length;
  await modelCall(fieldEnv, intelligenceStatus(fieldEnv, 'field'), request('field', 'aiw_field_draft'), call(), fetcher);
  const field = seen.slice(before).find(x => /openai\.test\/v1\/responses$/.test(x.target));
  assert.equal(field?.body.max_output_tokens, 6000, 'other modes keep their ceiling');
}
// The same ceiling on the Chat Completions wire (the check pass routes to the gateway), and the Anthropic wire streams the
// architecture passes at its larger ceiling, as it does a journey.
assert.equal(chat.body.max_tokens, 32000, 'the gateway wire gives the architecture check the same room');
{
  const {anthropicRequest, MAX_TOKENS, STREAM_MAX_TOKENS} = await import('./intelligence-anthropic.js');
  assert.equal(anthropicRequest({model: 'critic-model'}, request('architecture', 'aiw_architecture_draft')).max_tokens, STREAM_MAX_TOKENS);
  assert.equal(anthropicRequest({model: 'critic-model'}, request('field', 'aiw_field_draft')).max_tokens, MAX_TOKENS);
}
assert.equal(chat.body.stream, false);
assert(anthropicFetch.bodies.some(x => x.model === 'critic-model' && Array.isArray(x.messages)), 'the Anthropic Messages request carries the review packet');
assert.equal(draft.usage.cost.amount, 0.00004);
assert.equal(check.usage.cost.amount, 0.0001);
assert(critique.usage.cost.amount >= 0.00016, 'the Anthropic estimate includes its reported cache tokens');
const receipt = providerReceipt(routed, 'architecture', {promptVersion: 'synthetic-1', sha256: 'a'.repeat(64)}, [['draft', draft], ['check', check]]);
assert.deepEqual(receipt.calls.map(c => [c.provider, c.model, c.pass]), [['sol', 'architect-model', 'draft'], ['gateway', 'gateway-model', 'check']]);
assert.equal(sumUsage(multi, draft.usage, check.usage).cost.amount, 0.00014);
assert(!JSON.stringify(receipt).includes(secret));

refusePrimary = true;
const fallback = await modelCall(multi, routed, request('architecture', 'aiw_architecture_draft'), call(), fetcher);
assert.equal(fallback.provider.name, 'gateway');
assert.equal(fallback.routeFallback.reason, 'refusal');
assert.deepEqual(fallback.routeFallback.to, {provider: 'gateway', model: 'gateway-model', variable: 'AIW_LLM_FALLBACK'});
assert.equal(providerReceipt(routed, 'architecture', {promptVersion: 'synthetic-1'}, [['draft', fallback]]).calls[0].routeFallback.reason, 'refusal');
const verified = await verifyConnection(multi, {provider: 'sol', model: 'architect-model', fetcher, force: true});
assert.equal(verified.ok, true);
assert.equal((await verifyConnection(multi, {provider: 'sol', model: 'architect-model', fetcher: () => {throw Error('Probe should be cached.')}})).ok, true);
// Round 23 (M-08): the status route checks the provider it names, with that provider's own default model, in one call;
// a name outside the registry checks the mode's draft route instead, never another provider. No key in the answer.
{
  const {handleIntelligence} = await import('./intelligence-service.js');
  const seen = [], realFetch = globalThis.fetch;
  globalThis.fetch = async url => { seen.push(String(url)); return new Response(JSON.stringify({id: 'gateway-model', object: 'model', data: [{id: 'gateway-model', object: 'model'}]}), {status: 200, headers: {'content-type': 'application/json'}}); };
  try {
    const ask = async q => (await handleIntelligence(new Request('https://aiw.test/api/intelligence/status' + q), multi, 'architect', 'project-1')).json();
    const named = await ask('?verify=1&provider=gateway');
    assert.equal(seen.length, 1, 'one provider call for one check');
    assert(seen[0].startsWith('https://gateway.test/v1'), 'the named provider is the one checked: ' + seen[0]);
    assert.equal(named.providers.find(x => x.name === 'gateway').connectionVerified?.ok, true);
    assert(!JSON.stringify(named).includes(secret), 'the status never carries a key');
    seen.length = 0;
    await ask('?verify=1&provider=not-configured');
    assert(seen.every(u => !u.startsWith('https://gateway.test')), 'an unknown name never checks another provider');
  } finally { globalThis.fetch = realFetch; }
}
// Round 23: what the provider billed travels with an incomplete or declined answer on both OpenAI wires, so a failed run
// records the tokens it used.
for (const [kind, reply] of [['openai', {id: 'cut', model: 'architect-model', status: 'incomplete', output: [], usage: {input_tokens: 70, output_tokens: 30}}], ['openai-compatible', {id: 'cut', model: 'gateway-model', choices: [{finish_reason: 'length', message: {content: '{"answer":'}}], usage: {prompt_tokens: 70, completion_tokens: 30}}]]) {
  const route = kind === 'openai' ? 'sol:architect-model' : 'gateway:gateway-model', cutEnv = {...multi, AIW_LLM_ROUTE_FIELD: route, AIW_LLM_FALLBACK: ''};
  await assert.rejects(modelCall(cutEnv, intelligenceStatus(cutEnv, 'field'), request('field', 'aiw_field_draft'), call(), async () => new Response(JSON.stringify(reply), {status: 200, headers: {'content-type': 'application/json'}})),
    e => e.code === 'incomplete' && e.usage?.inputTokens === 70 && e.usage?.outputTokens === 30, kind + ': an incomplete answer carries its billed usage');
}
console.log('PASS Providers: three wires, task and pass routes, ordered refusal fallback, per-provider receipts/costs, cached probe, transport security and credential-safe status');

// A failed OpenAI response retains only bounded diagnostic identifiers. Provider messages may echo
// credentials and client material, so neither the saved error nor the server log may contain them.
const failureEnv = {...multi, AIW_LLM_FALLBACK: ''};
const failureStatus = intelligenceStatus(failureEnv, 'architecture');
const privateText = 'synthetic-provider-key and confidential workbook text';
const failures = [], originalError = console.error;
console.error = (...parts) => failures.push(parts.join(' '));
try {
  await assert.rejects(modelCall(failureEnv, failureStatus, request('architecture', 'aiw_architecture_draft'), call(), async () =>
    new Response(JSON.stringify({error: {type: 'invalid_request_error', code: 'invalid_json_schema', message: privateText}}),
      {status: 400, headers: {'content-type': 'application/json', 'x-request-id': 'req_synthetic_123'}})), e => {
    assert.equal(e.code, 'provider_unavailable');
    assert.deepEqual(e.providerFailure, {upstreamStatus: 400, upstreamRequestId: 'req_synthetic_123', upstreamType: 'invalid_request_error', upstreamCode: 'invalid_json_schema'});
    assert(!JSON.stringify(e.providerFailure).includes(privateText));
    return true;
  });
  await assert.rejects(modelCall(failureEnv, failureStatus, request('architecture', 'aiw_architecture_draft'), call(), async () =>
    new Response(JSON.stringify({error: {type: privateText, code: privateText, message: privateText}}),
      {status: 400, headers: {'x-request-id': 'not a safe identifier'}})), e => {
    assert.deepEqual(e.providerFailure, {upstreamStatus: 400});
    return true;
  });
  // Round 25 (D-25-12): the Anthropic wire logs its failures the same way: an account gate's 400, say, reads as its
  // status, type and request id, without the provider's text or the key.
  await assert.rejects(modelCall(failureEnv, intelligenceStatus(failureEnv, 'review'), request('review', 'aiw_model_review'), call(), async () =>
    new Response(JSON.stringify({type: 'error', error: {type: 'invalid_request_error', message: privateText}}),
      {status: 400, headers: {'content-type': 'application/json', 'request-id': 'req_ant_synthetic_456'}})), e => {
    assert.equal(e.code, 'provider_unavailable');
    assert.deepEqual(e.providerFailure, {upstreamStatus: 400, upstreamRequestId: 'req_ant_synthetic_456', upstreamType: 'invalid_request_error'});
    return true;
  });
} finally {console.error = originalError;}
assert.equal(failures.length, 3);
assert(failures.every(s => !s.includes(privateText) && !s.includes(secret) && !s.includes('Authorization')));
assert.deepEqual(JSON.parse(failures[0]), {event: 'openai-provider-failure', upstreamStatus: 400, upstreamRequestId: 'req_synthetic_123', upstreamType: 'invalid_request_error', upstreamCode: 'invalid_json_schema'});
assert.deepEqual(JSON.parse(failures[2]), {event: 'anthropic-provider-failure', upstreamStatus: 400, upstreamRequestId: 'req_ant_synthetic_456', upstreamType: 'invalid_request_error'});
const failedProbe = await verifyConnection(failureEnv, {provider: 'sol', model: 'architect-model', force: true, fetcher: async () =>
  new Response('{}', {status: 503, headers: {'x-request-id': 'req_probe_123'}})});
assert.deepEqual({ok: failedProbe.ok, code: failedProbe.code, upstreamStatus: failedProbe.upstreamStatus, upstreamRequestId: failedProbe.upstreamRequestId},
  {ok: false, code: 'provider_unavailable', upstreamStatus: 503, upstreamRequestId: 'req_probe_123'});
assert.deepEqual(intelligenceStatus(failureEnv, 'architecture').providers.find(p => p.name === 'sol').connectionVerified,
  {at: failedProbe.at, ok: false, model: 'architect-model', code: 'provider_unavailable', upstreamStatus: 503, upstreamRequestId: 'req_probe_123'});
console.log('PASS Providers: OpenAI non-2xx and probe report bounded diagnostics without provider text, client material or credentials');

// When fetch rejects before any HTTP response, the probe and failed call preserve only an allowed
// exception name and network cause code; messages and arbitrary cause fields are never retained.
const transportLogs = [], oldError = console.error;
console.error = (...parts) => transportLogs.push(parts.join(' '));
let transportProbe;
try {
  const networkFailure = async () => {throw Object.assign(new TypeError(privateText), {cause: {code: 'ENETUNREACH', url: privateText}});};
  transportProbe = await verifyConnection(failureEnv, {provider: 'sol', model: 'architect-model', force: true, fetcher: networkFailure});
  assert.deepEqual({ok: transportProbe.ok, code: transportProbe.code, transportFailure: transportProbe.transportFailure},
    {ok: false, code: 'provider_unavailable', transportFailure: {phase: 'fetch', name: 'TypeError', causeCode: 'ENETUNREACH'}});
  assert.deepEqual(intelligenceStatus(failureEnv, 'architecture').providers.find(p => p.name === 'sol').connectionVerified,
    {at: transportProbe.at, ok: false, model: 'architect-model', code: 'provider_unavailable', transportFailure: {phase: 'fetch', name: 'TypeError', causeCode: 'ENETUNREACH'}});
  await assert.rejects(requestReasoning(failureEnv, {items: [], sources: [], brainReceipt: {instructions: {promptVersion: 'synthetic'}}}, {fetcher: async () => {
    throw Object.assign(new TypeError(privateText), {cause: {code: 'ECLIENT_SECRET', url: privateText}});
  }}), e => {
    assert.equal(e.code, 'provider_unavailable');
    assert.deepEqual(e.transportFailure, {phase: 'fetch', name: 'TypeError'}, 'unknown cause codes are omitted');
    assert(!JSON.stringify(e.transportFailure).includes(privateText));
    return true;
  });
} finally {console.error = oldError;}
assert.equal(transportLogs.length, 2);
assert(transportLogs.every(s => !s.includes(privateText) && !s.includes('url') && !s.includes(secret)));
const cyclicPacket = {items: [], sources: [], brainReceipt: {instructions: {promptVersion: 'synthetic'}}};
cyclicPacket.self = cyclicPacket;
const processingLogs = [], beforeProcessing = console.error;
console.error = (...parts) => processingLogs.push(parts.join(' '));
try {
  await assert.rejects(requestReasoning(failureEnv, cyclicPacket, {fetcher: () => {throw Error('No fetch expected');}}), e => {
    assert.deepEqual(e.transportFailure, {phase: 'processing', name: 'RangeError'});
    return true;
  });
} finally {console.error = beforeProcessing;}
assert.equal(processingLogs.length, 1);
console.log('PASS Providers: pre-response transport failures expose allowlisted diagnostics without exception messages, URLs or secrets');

// An OpenAI key containing line breaks or non-ASCII cannot make a valid Authorization header. No
// key bytes enter status. Only the official OpenAI probe may make a second, unauthenticated GET.
const officialEnv = {AIW_LLM_PROVIDER: 'openai', AIW_LLM_MODEL: 'gpt-4.1-mini', OPENAI_API_KEY: 'sk-synthetic-key'};
for (const badKey of ['sk-synthetic\nkey', ' sk-synthetic-key', 'sk-synthetic-✓']) {
  const bad = intelligenceStatus({...officialEnv, OPENAI_API_KEY: badKey});
  assert.equal(bad.configured, false);
  assert(bad.missing.some(x => x.includes('OPENAI_API_KEY') && x.includes('single-line visible ASCII')));
  assert(!JSON.stringify(bad).includes(badKey));
}
assert.equal((await verifyConnection({...officialEnv, OPENAI_API_KEY: 'sk-synthetic\nkey'},
  {force: true, fetcher: () => {throw Error('An invalid key must not reach fetch');}})).code, 'not_configured');
const reachabilityLogs = [], oldReachabilityError = console.error;
console.error = (...parts) => reachabilityLogs.push(parts.join(' '));
let authHeaders = [], reachable, unreachable;
try {
  reachable = await verifyConnection(officialEnv, {force: true, fetcher: async (url, init) => {
    assert.equal(String(url), 'https://api.openai.com/v1/models/gpt-4.1-mini');
    authHeaders.push(init.headers?.Authorization || null);
    if(authHeaders.length === 1)throw new TypeError(privateText);
    return new Response('{}', {status: 401});
  }});
  assert.deepEqual(authHeaders, ['Bearer sk-synthetic-key', null]);
  assert.equal(reachable.unauthenticatedStatus, 401);
  assert.deepEqual(reachable.transportFailure, {phase: 'fetch', name: 'TypeError'});
  assert.equal(intelligenceStatus(officialEnv).connectionVerified.unauthenticatedStatus, 401);
  unreachable = await verifyConnection(officialEnv, {force: true, fetcher: async (_url, init) => {
    assert.equal(init.method, 'GET');
    throw Object.assign(new TypeError(privateText), {cause: {code: 'ENETUNREACH', url: privateText}});
  }});
  assert.deepEqual(unreachable.unauthenticatedTransportFailure, {phase: 'fetch', name: 'TypeError', causeCode: 'ENETUNREACH'});
  assert.deepEqual(intelligenceStatus(officialEnv).connectionVerified.unauthenticatedTransportFailure, unreachable.unauthenticatedTransportFailure);
} finally {console.error = oldReachabilityError;}
assert(reachabilityLogs.every(s => !s.includes(privateText) && !s.includes('sk-synthetic-key') && !s.includes('Authorization')));
assert(reachabilityLogs.some(s => JSON.parse(s).event === 'openai-probe-reachability' && JSON.parse(s).unauthenticatedStatus === 401));
console.log('PASS Providers: visible-ASCII OpenAI key validation and one keyless official reachability GET after fetch failure');

// Round 23 (M-12): the per-provider variable form registers a provider without the JSON and wins over the JSON field
// with the same meaning; the fallback is tried after a 5xx and after a timeout on the route, never after a 4xx.
{
  const varEnv = {AIW_LLM_BACKUP_KIND: 'openai-compatible', AIW_LLM_BACKUP_BASE_URL: 'https://backup.test/v1', AIW_LLM_BACKUP_API_KEY: 'synthetic-backup-key', AIW_LLM_BACKUP_MODELS: 'backup-model,backup-small', AIW_LLM_BACKUP_DAILY_TOKENS: '500000', AIW_LLM_ROUTE_ARCHITECTURE: 'backup', AIW_LLM_ROUTE_ARCHITECTURE_CHECK: 'backup:backup-small'};
  const vs = intelligenceStatus(varEnv, 'architecture'), b = vs.providers.find(p => p.name === 'backup');
  assert.equal(vs.configured, true, 'a provider named by its variables alone answers its routes');
  assert.deepEqual([b.kind, b.keyConfigured, b.dailyTokens, vs.route.draft.model, vs.route.check.model], ['openai-compatible', true, 500000, 'backup-model', 'backup-small'], 'its kind, key state, daily tokens, and its first model for a route that names no model');
  assert.ok(!JSON.stringify(vs).includes('synthetic-backup-key'), 'its key stays on the server');
  assert.deepEqual(providers({...multi, AIW_LLM_GATEWAY_MODELS: 'gateway-model-2'}).byName.get('gateway').sources.sort(), ['AIW_LLM_GATEWAY_MODELS', 'AIW_LLM_PROVIDERS'], 'the variable and the JSON both configure it');
  assert.ok(String(providers({...multi, AIW_LLM_GATEWAY_MODELS: 'gateway-model-2'}).byName.get('gateway').models).includes('gateway-model-2') && !String(providers({...multi, AIW_LLM_GATEWAY_MODELS: 'gateway-model-2'}).byName.get('gateway').models).includes('gateway-model,'), 'the variable wins over the JSON field');

  const primaryHits = () => seen.filter(x => /openai\.test/.test(x.target)).length;
  // A 5xx on the route: retried once on that route, then the fallback answers, and the run says why.
  let before = primaryHits();
  const unavailable = async (url, init) => /openai\.test/.test(String(url)) ? (seen.push({target: String(url)}), new Response('{}', {status: 503})) : baseFetch(url, init);
  const r5 = await modelCall(multi, routed, request('architecture', 'aiw_architecture_draft'), call(), unavailable);
  assert.deepEqual([r5.provider.name, r5.routeFallback.reason, r5.routeFallback.to.provider], ['gateway', 'unavailable', 'gateway'], 'a 5xx falls back');
  assert.ok(primaryHits() - before >= 1, 'the route was tried first');
  // A timeout on the route: the call's clock is re-armed and the fallback answers.
  let ac = new AbortController();
  const timed = {get signal() { return ac.signal; }, get aborted() { return ac.signal.aborted; }, attempts: 0, rearm() { ac = new AbortController(); }};
  const slow = async (url, init) => { if (/openai\.test/.test(String(url))) { ac.abort(); throw Object.assign(Error('aborted'), {name: 'AbortError'}); } return baseFetch(url, init); };
  const rt = await modelCall(multi, routed, request('architecture', 'aiw_architecture_draft'), timed, slow);
  assert.deepEqual([rt.provider.name, rt.routeFallback.reason], ['gateway', 'timeout'], 'a timeout falls back');
  // A 4xx: the request itself is wrong, so no other route is asked.
  before = seen.filter(x => /gateway\.test/.test(x.target)).length;
  const refusedKey = async (url, init) => /openai\.test/.test(String(url)) ? new Response(JSON.stringify({error: {type: 'invalid_request_error', code: 'invalid_api_key'}}), {status: 401}) : baseFetch(url, init);
  const quiet = console.error; console.error = () => {};
  try { await assert.rejects(modelCall(multi, routed, request('architecture', 'aiw_architecture_draft'), call(), refusedKey), e => !e.routeFallback || e.routeFallback.to?.provider !== 'gateway'); } finally { console.error = quiet; }
  assert.equal(seen.filter(x => /gateway\.test/.test(x.target)).length, before, 'a 4xx asks no other route');
  console.log('PASS Providers (round 23, M-12): a provider named by its variables alone; a variable over the JSON field; the fallback after a 5xx and a timeout, never after a 4xx');
}
