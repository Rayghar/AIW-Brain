// Sol's live acceptance probe (round 6, Contract L). It runs only when a provider key is in the shell
// (OPENAI_API_KEY or ANTHROPIC_API_KEY; AIW_LLM_MODEL only to name another model): it starts the server on a scratch database
// with that key, creates a project from a reference brief and the reference project itself, asks Sol for one
// field draft in each of the eleven chapters of the reference project (round 11) and once in the journey and
// review modes, and asks the architecture drafting mode for one synthetic theme. It writes
// evidence/sol-live/<date>-<provider>.json with the receipts:
// provider, model, prompt pins, each run's status, stop reasons and usage, what the checks accepted or withheld,
// and for each chapter's field draft the size of its packet, its grounding and the draft text, so the drafts'
// relevance can be judged. The architecture call is a bounded direct probe, not a project job or an applied
// design. No prompt content and no key are written. It is not in the release gate.
//
//   node scripts/sol-live-check.mjs                 # live, with the shell's key
//   node scripts/sol-live-check.mjs --mock          # the probe itself, against the test double (no key)
//   node scripts/sol-live-check.mjs --out <file>    # write the evidence elsewhere
//
// Exit 0 when every run completed, 1 when one failed, 2 when no key is set (nothing was sent).
import {spawn} from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const args = process.argv.slice(2), flag = n => args.includes(n), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const mock = flag('--mock');
const {referenceBrief} = await import('../shared/reference-journeys.js');
const {sparkFields, draftable, recordsOf, singletonId} = await import('../public/field-suggestions.js');
const {draftSteps, draftUnits} = await import('../public/architecture-drafter.js');
const {architectureInstructionsPin, themePacket} = await import('../public/architecture-contract.js');
const {requestArchitectureDraft} = await import('../architecture-request.js');

// ---------------------------------------------------------------- the key, the provider and the server
const shell = process.env;
let env, mockServer = null, providerId;
if (mock) {
  const {startMockLLM, providerEnv} = await import('../mock-llm-provider.mjs');
  mockServer = await startMockLLM();
  providerId = shell.AIW_LLM_PROVIDER === 'anthropic' ? 'anthropic' : 'openai';
  env = providerEnv({OPENAI_API_KEY: 'test-key-never-returned', AIW_LLM_MODEL: 'test-structured-model', AIW_LLM_BASE_URL: mockServer.url}, providerId);
} else {
  // The provider and what is missing, by the server's own rule (intelligence-provider.js): a key alone connects.
  const {intelligenceStatus} = await import('../intelligence-provider.js');
  const chosen = intelligenceStatus(shell);
  providerId = chosen.providerId;
  if (!chosen.configured) { console.log(`sol-live-check: nothing was sent. Set ${chosen.missing.join(' and ')} in the shell, or the other provider’s key with AIW_LLM_PROVIDER naming it (or run with --mock to exercise the probe against the test double).`); process.exit(2); }
  // The shell's whole provider configuration (round 12, M: the registry, the routes and the fallback chain too).
  env = {...Object.fromEntries(Object.entries(shell).filter(([k, v]) => k.startsWith('AIW_LLM_') && typeof v === 'string')),
    ...(shell.ANTHROPIC_API_KEY ? {ANTHROPIC_API_KEY: shell.ANTHROPIC_API_KEY} : {}), ...(shell.OPENAI_API_KEY ? {OPENAI_API_KEY: shell.OPENAI_API_KEY} : {}),
    ...(shell.AIW_ANTHROPIC_BASE_URL ? {AIW_ANTHROPIC_BASE_URL: shell.AIW_ANTHROPIC_BASE_URL} : {}),
    AIW_LLM_TIMEOUT_MS: shell.AIW_LLM_TIMEOUT_MS || '120000'};
}
const freePort = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const port = await freePort();
fs.mkdirSync('.aiw-local', {recursive: true});
const db = path.join('.aiw-local', `sol-live-${port}.sqlite`);
// Behind an HTTPS proxy the server needs the shell's proxy settings as well (HTTPS_PROXY, NO_PROXY, the CA bundle and
// Node's NODE_USE_ENV_PROXY, since Node's fetch reads the proxy only with it); nothing else of the shell is passed.
const PROXY_VARS = /^(?:HTTPS?_PROXY|NO_PROXY|https?_proxy|no_proxy|NODE_USE_ENV_PROXY|NODE_EXTRA_CA_CERTS|SSL_CERT_FILE)$/;
const proxyEnv = Object.fromEntries(Object.entries(shell).filter(([k]) => PROXY_VARS.test(k)));
const childEnv = {PATH: shell.PATH, HOME: shell.HOME, NODE_OPTIONS: shell.NODE_OPTIONS || '', ...proxyEnv, AIW_LOCAL_DB: db, ...env};
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: childEnv, stdio: ['ignore', 'pipe', 'pipe']});
let serverLog = '';
server.stdout.on('data', d => { serverLog += d; });
server.stderr.on('data', d => { serverLog += d; });
const base = `http://localhost:${port}`;
const stop = () => { try { server.kill(); } catch { /* best effort */ } try { mockServer?.close?.(); } catch { /* best effort */ } for (const f of [db, db + '-wal', db + '-shm']) { try { fs.unlinkSync(f); } catch { /* best effort */ } } };
process.on('exit', stop);
for (let i = 0; i < 80; i++) { try { if ((await fetch(base + '/')).ok) break; } catch { /* best effort */ } await new Promise(r => setTimeout(r, 250)); }

// ---------------------------------------------------------------- requests, as the workbench sends them
const headers = {'content-type': 'application/json', origin: base};
const post = async (url, body) => { const r = await fetch(base + url, {method: 'POST', headers, body: JSON.stringify(body)}); const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch { /* best effort */ } return {status: r.status, json, text}; };
const get = async url => { const r = await fetch(base + url, {headers}); return {status: r.status, json: await r.json().catch(() => null)}; };
const uuid = () => crypto.randomUUID();
const failure = (sent, run) => sent.status === 200 ? null : `${sent.status}: ${run?.error || run?.failure || run?.reason || sent.json?.error || sent.text.slice(0, 200)}`;
const until = async (projectId, run, limitMs) => {
  const started = Date.now();
  let current = run;
  while (current && current.status === 'pending' && Date.now() - started < limitMs) {
    await new Promise(r => setTimeout(r, mock ? 200 : 2000));
    const r = await get(`/api/intelligence/runs?project=${encodeURIComponent(projectId)}&id=${encodeURIComponent(current.id)}`);
    if (r.json && r.json.status) current = r.json;
  }
  return current;
};
const summary = (mode, run, checks, error) => ({
  mode, id: run?.id || null, status: run?.status || (error ? 'failed' : 'unknown'), model: run?.model || run?.providerReceipt?.model || null,
  usage: run?.usage || null, prompt: run?.providerReceipt?.prompt || null,
  calls: (run?.providerReceipt?.calls || []).map(c => ({role: c.role, pass: c.pass, provider: c.provider, kind: c.kind, model: c.model, responseId: c.responseId, stopReason: c.stopReason || null, declined: !!c.declined, usage: c.usage || null, fallback: c.fallback || null, routeFallback: c.routeFallback || null})),
  groundingAccepted: run?.groundingReview?.accepted ?? null, withheld: (run?.groundingReview?.withheld || []).length,
  checks, error: error || run?.error || null
});

// One field per chapter: the chapter's main draftable field of the first saved record of that type.
const CHAPTER_FIELDS = [[1, 'artefact', 'description'], [2, 'quality.driver', 'response'], [3, 'decision.save', 'rationale'], [4, 'logical.responsibility', 'purpose'], [5, 'realisation.component', 'boundary'], [6, 'technology.capability', 'purpose'], [7, 'techrealisation.plan', 'operationsPlan'], [8, 'interfaces.contract', 'failurePolicy'], [9, 'security.control', 'mechanism'], [10, 'runtime.plan', 'readiness'], [11, 'review.narrative', 'summary']];
const notes = [], runs = [];
let status = null;
try {
  // The connection as the status reports it, with one verification probe.
  status = (await get('/api/intelligence/status?verify=1')).json;
  if (!status?.configured) throw Error(`Sol is not configured on the server: ${(status?.missing || []).join(', ') || 'unknown reason'}`);

  // Two projects: a blank one from a reference brief for the journey mode, and the reference project itself for the
  // field and review modes, so every mode has something real to read.
  const ref = {id: 'clinic-appointments', brief: referenceBrief('clinic-appointments')};
  if (!ref.brief) throw Error('the clinic-appointments reference brief is missing');
  const blank = await post('/api/projects', {name: 'Sol live check · brief', template: 'blank', brief: ref.brief});
  if (blank.status !== 201) throw Error(`creating the brief project failed: ${blank.status} ${blank.text.slice(0, 160)}`);
  const briefProject = blank.json.document.id;
  const filled = await post('/api/projects', {name: 'Sol live check · reference', template: ref.id});
  if (filled.status !== 201) throw Error(`creating the reference project failed: ${filled.status} ${filled.text.slice(0, 160)}`);
  const refProject = filled.json.document.id;

  // Field mode, one draft per chapter (round 11): a saved record of the reference project in each of the eleven
  // chapters, one of its draftable free-text fields (the chapter's main field where it is draftable, else the first),
  // the packet prepared and recorded by its size and sources, then the draft with its grounding and text.
  const refDoc = filled.json.document;
  for (const [chapter, command, wanted] of CHAPTER_FIELDS) {
    const record = recordsOf(refDoc, command)[0], recordId = singletonId(command) || record?.id || null;
    const draftables = sparkFields(command).map(d => d.name).filter(n => draftable(command, n)), field = draftables.includes(wanted) ? wanted : draftables[0];
    const request = {command, field, recordId, values: {}, links: {}};
    if (!record || !field) { runs.push({mode: 'field', id: null, status: 'failed', chapter, command, field: field || null, recordId, error: `the reference project holds no ${command} record to draft for`}); continue; }
    const ctx = await post(`/api/intelligence/field-context?project=${encodeURIComponent(refProject)}`, request);
    if (ctx.status !== 200) { runs.push({mode: 'field', id: null, status: 'failed', chapter, command, field, recordId, error: `field-context: ${ctx.status} ${ctx.text.slice(0, 160)}`}); continue; }
    const packet = ctx.json.packet, sent = await post(`/api/intelligence/field?project=${encodeURIComponent(refProject)}`, {...request, requestId: uuid(), packetStamp: packet.stamp});
    const run = sent.json?.id ? (sent.status === 200 ? await until(refProject, sent.json, 240000) : sent.json) : null;
    const kinds = {}; for (const s of packet.sources || []) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
    runs.push({...summary('field', run, {field, hasDraft: !!run?.result?.value, sourcesInPacket: packet.sources?.length ?? null}, failure(sent, run)),
      chapter, command, field, recordId, record: packet.target?.record || null,
      packet: {characters: packet.coverage?.characters ?? null, maxCharacters: packet.coverage?.maxCharacters ?? null, sources: packet.sources?.length ?? null, kinds, neighbours: (packet.sources || []).filter(s => s.kind === 'neighbour').map(s => s.title), omissions: (packet.omissions || []).map(o => o.title), help: packet.target?.help || ''},
      grounding: run?.groundingReview ? {accepted: run.groundingReview.accepted, issues: run.groundingReview.issues || [], withheld: !!run.result?.withheld} : null,
      draft: run?.result ? {value: run.result.value || '', basis: run.result.basis || '', sourceRefs: run.result.sourceRefs || []} : null});
  }
  // Journey mode: Chapter 1 drafted from the brief, Sol asked for the same chapter.
  {
    const ctx = await post(`/api/intelligence/journey-context?project=${encodeURIComponent(briefProject)}`, {chapter: 1});
    if (ctx.status !== 200) throw Error(`journey-context: ${ctx.status} ${ctx.text.slice(0, 160)}`);
    const sent = await post(`/api/intelligence/journey?project=${encodeURIComponent(briefProject)}`, {chapter: 1, requestId: uuid(), packetStamp: ctx.json.packet.stamp});
    const run = sent.json?.id ? (sent.status === 200 ? await until(briefProject, sent.json, 300000) : sent.json) : null;
    runs.push(summary('journey', run, {chapter: 1, recordsInDraft: ctx.json.draft?.records?.length ?? null, fieldsInPacket: (ctx.json.packet.records || []).reduce((n, r) => n + (r.fields || []).length, 0) || null, answers: run?.result?.answers?.length ?? null, fallback: run?.result?.reason || null}, failure(sent, run)));
  }
  // Review mode: Chapter 4 of the reference project.
  {
    const ctx = await post(`/api/intelligence/review-context?project=${encodeURIComponent(refProject)}`, {chapter: 4});
    if (ctx.status !== 200) throw Error(`review-context: ${ctx.status} ${ctx.text.slice(0, 160)}`);
    const sent = await post(`/api/intelligence/review?project=${encodeURIComponent(refProject)}`, {chapter: 4, requestId: uuid(), packetStamp: ctx.json.packet.stamp});
    const run = sent.json?.id ? (sent.status === 200 ? await until(refProject, sent.json, 300000) : sent.json) : null;
    runs.push(summary('review', run, {chapter: 4, elementsInPacket: ctx.json.packet.elementIds?.length ?? null, sourcesInPacket: ctx.json.packet.sources?.length ?? null, findings: run?.result?.findings?.length ?? null}, failure(sent, run)));
  }
  // Architecture mode: just one requirement theme of the synthetic reference project. The existing theme
  // packet, draft/check guard and provider router are exercised without creating or applying a project job.
  {
    const unit = draftUnits(refDoc).find(x => x.members?.length && x.key);
    if (!unit) throw Error('the synthetic reference project has no architecture theme');
    const steps = draftSteps(refDoc); let step;
    while (!(step = steps.next()).done) { /* finish the rules skeleton the theme is compared with */ }
    const packet = themePacket(refDoc, step.value, unit, {instructions: architectureInstructionsPin()});
    if (!packet.requirements.length) throw Error('the selected synthetic theme has no disclosed requirement');
    try {
      const result = await requestArchitectureDraft(env, packet, {timeoutMs: 120000});
      runs.push({...summary('architecture', {...result, id: result.providerResponseId || 'theme:' + packet.stamp.slice(0, 16), status: 'completed'}, {
        theme: unit.key, requirements: packet.requirements.length, proposalCount: result.result.proposals.length,
        withheldCount: result.result.withheld.length, packetStamp: packet.stamp
      }, null), theme: {key: unit.key, title: unit.title}, proposalRefs: result.result.proposals.map(x => ({kind: x.kind, title: x.title || x.question || '', requirements: x.requirementRefs || []})),
      withheldReasons: result.result.withheld.map(x => ({id: x.id, issues: x.issues || []})), packet: {requirements: packet.requirements.length, passages: packet.passages.length, claims: packet.claims.length, omissions: packet.omissions}});
    } catch (e) {
      runs.push({mode: 'architecture', id: null, status: 'failed', theme: {key: unit.key, title: unit.title}, checks: {packetStamp: packet.stamp}, error: String(e?.message || e).slice(0, 240)});
    }
  }
} catch (e) {
  notes.push(String(e.message || e));
}
stop();

const fields = runs.filter(r => r.mode === 'field');
const architecture = runs.find(r => r.mode === 'architecture');
const passed = runs.length === CHAPTER_FIELDS.length + 3 && fields.length === CHAPTER_FIELDS.length &&
  runs.every(r => r.status === 'completed' && !r.error) && architecture?.calls?.length >= 1 && !notes.length;
const evidence = {
  schema: 'aiw.sol-live-check/3', at: new Date().toISOString(), live: !mock, provider: status?.providerId || providerId, model: status?.model || null, modelDefaulted: status?.modelDefaulted ?? null, effort: status?.effort || null,
  callTimeoutMs: status?.callTimeoutMs || null, connectionVerified: status?.connectionVerified ?? null, pins: [...new Set(runs.map(r => r.prompt?.promptVersion).filter(Boolean))],
  // The eleven chapters at a glance: the record, the field, the packet's size, the grounding and the draft text.
  chapters: fields.map(r => ({chapter: r.chapter, command: r.command, field: r.field, record: r.record, status: r.status, packetCharacters: r.packet?.characters ?? null, sources: r.packet?.sources ?? null, neighbours: r.packet?.neighbours?.length ?? 0, groundingAccepted: r.grounding?.accepted ?? null, withheld: r.grounding?.withheld ?? null, draft: r.draft?.value ?? null, error: r.error || null})),
  runs, passed, notes: [...notes, ...(mock ? ['Run against the test double: it proves the probe, not the provider.'] : []),
    'Receipts, field drafts and one synthetic architecture theme: packet counts, grounding result, accepted proposal titles and withheld reasons are recorded without prompt content or keys.',
    'The architecture theme uses the model request path directly to bound this probe; it is not a persisted project job, applied decision, provider quality acceptance or evidence of scheduled continuation.',
    'Advice only: nothing Sol returned was applied; the runs were read and discarded with the scratch database.'],
  authority: 'Acceptance evidence for the Sol connection on one day. It does not approve the design, calibrate Sol or accept the release for production.'
};
if (!passed && serverLog.trim()) evidence.serverLog = serverLog.split('\n').filter(l => /error|fail|warn/i.test(l)).slice(-20).map(l => l.replace(/sk-[A-Za-z0-9_-]{8,}/g, '[key]').slice(0, 300));
const out = opt('--out') || path.join('evidence', 'sol-live', `${evidence.at.slice(0, 10)}-${mock ? 'test-double' : evidence.provider}.json`);
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, JSON.stringify(evidence, null, 2) + '\n');
for (const r of runs) console.log(`${r.mode.padEnd(8)} ${String(r.status).padEnd(10)} ${r.chapter ? `ch ${String(r.chapter).padStart(2)} ${r.command}.${r.field} ` : ''}${r.model || ''} ${r.usage ? `in ${r.usage.inputTokens ?? r.usage.input_tokens ?? '?'} out ${r.usage.outputTokens ?? r.usage.output_tokens ?? '?'}` : ''} ${r.error ? '· ' + r.error : ''} ${r.mode === 'architecture' && r.packet ? `theme ${r.theme.key}, ${r.packet.requirements} requirement, ${r.checks.proposalCount} proposals, ${r.checks.withheldCount} withheld` : r.packet ? `packet ${r.packet.characters} chars, ${r.packet.sources} sources` : JSON.stringify(r.checks)}${r.draft ? ` · draft: ${JSON.stringify(String(r.draft.value).slice(0, 100))}` : ''}`);
for (const n of notes) console.log('note: ' + n);
console.log(`${passed ? 'passed' : 'FAILED'} · ${evidence.provider} ${evidence.model || ''} · evidence ${out}`);
process.exit(passed ? 0 : 1);
