// Retention and the provider path (round 2, B2-04, B2-11): the sweep removes Sol runs and their files, operation
// events, activity and receipts past the policy and nothing else; a run cut off mid-flight becomes "interrupted"
// with no tokens used, which releases its reservation from the daily budget; the provider adapter retries a 429 or
// a 5xx once within a per-call timer and reports an estimated cost from the operator's price table. In-process
// SQLite and files; the provider is a test double; no network. Run: node retention-validate.mjs
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {runRetention, retentionPolicy, releaseInterruptedRuns, DEFAULT_RETENTION, retentionChanged} from './retention.js';
import {providerFetch, usageCost, intelligenceStatus, verifyConnection, requestDirectBaseline, callTimeout} from './intelligence-provider.js';
import {errorEvent} from './audit-log.js';

const checks = [], pass = (name) => checks.push(name);
const scratch = mkdtempSync(path.join(tmpdir(), 'aiw-retention-'));
const dbFile = path.join(scratch, 'store', 'project.sqlite');
const env = {DB: localDatabase(dbFile), FILES: localFiles(path.join(scratch, 'store', 'baselines'))};
const now = Date.parse('2026-10-01T12:00:00.000Z');
const ago = (ms) => new Date(now - ms).toISOString();
const DAY = 86400000, HOUR = 3600000, MINUTE = 60000;
try {
  // 1. Migration 0009 is applied: the indexes the budget and the sweep use exist.
  const indexes = (await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name IN ('intelligence_project_status_created','brain_retrieval_project_created')").bind().all()).results.map((r) => r.name).sort();
  assert.deepEqual(indexes, ['brain_retrieval_project_created', 'intelligence_project_status_created']);
  assert.equal((await env.DB.prepare('PRAGMA journal_mode').bind().first()).journal_mode, 'wal', 'the local database runs in WAL mode');
  assert.equal((await env.DB.prepare('PRAGMA busy_timeout').bind().first()).timeout, 5000, 'with a busy timeout');
  assert(existsSync(path.dirname(dbFile)), 'the database directory was created for the file');
  pass('schema: migration 0009 adds the run and retrieval indexes; the local database uses WAL and a 5 s busy timeout; its directory follows the file');

  // 2. A fixture across the policy: old and recent rows in every swept table, with files for the runs.
  const run = async (id, created, status, extra = {}) => {
    const key = 'intelligence/owner/p1/' + id + '.json';
    await env.FILES.put(key, JSON.stringify({id, projectId: 'p1'}));
    await env.DB.prepare('INSERT INTO intelligence_runs (owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens,used_tokens) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('owner', id, extra.project || 'p1', 'obj', 'explain', 's', status, 'OpenAI', 'm', key, created, created, 'owner', extra.reserved ?? 200000, extra.used ?? null).run();
    return key;
  };
  const retrieval = async (id, created, status, extra = {}) => {
    const key = 'brain-packets/owner/p1/' + id + '.json';
    await env.FILES.put(key, JSON.stringify({id}));
    await env.DB.prepare('INSERT INTO brain_retrieval_runs (owner_id,id,project_id,input_hash,status,storage_key,created_at,reserved_tokens,used_tokens) VALUES (?,?,?,?,?,?,?,?,?)').bind('owner', id, 'p1', 'h', status, key, created, extra.reserved ?? 30000, extra.used ?? null).run();
    return key;
  };
  const oldRun = await run('old-completed', ago(100 * DAY), 'completed', {used: 5000});
  const keptRun = await run('recent-completed', ago(2 * DAY), 'completed', {used: 7000});
  const stale = await run('stale-pending', ago(11 * MINUTE), 'pending');
  const fresh = await run('fresh-pending', ago(1 * MINUTE), 'pending');
  const otherStale = await run('other-project-stale', ago(30 * MINUTE), 'pending', {project: 'p2'});
  const oldRetrieval = await retrieval('old-retrieval', ago(100 * DAY), 'completed', {used: 1000});
  const keptRetrieval = await retrieval('recent-retrieval', ago(1 * DAY), 'completed', {used: 1000});
  const staleRetrieval = await retrieval('stale-retrieval', ago(15 * MINUTE), 'pending');
  for (const [table, columns, rows] of [
    ['operation_events', '(owner_id,project_id,id,kind,document,created_at)', [['old-event', ago(400 * DAY)], ['recent-event', ago(3 * DAY)]]],
    ['project_activity', '(owner_id,project_id,id,actor_id,document,created_at)', [['old-activity', ago(400 * DAY)], ['recent-activity', ago(3 * DAY)]]],
  ]) for (const [id, created] of rows) await env.DB.prepare(`INSERT INTO ${table} ${columns} VALUES (?,?,?,?,?,?)`).bind('owner', 'p1', id, table === 'operation_events' ? 'job' : 'owner', '{}', created).run();
  for (const [key, created] of [['old-receipt-0000000000', ago(25 * HOUR)], ['recent-receipt-00000000', ago(1 * HOUR)]]) {
    await env.DB.prepare('INSERT INTO command_receipts (owner_id,project_id,key,request_hash,revision,selected,created_at) VALUES (?,?,?,?,?,?,?)').bind('owner', 'p1', key, 'h', 2, null, created).run();
    await env.DB.prepare('INSERT INTO route_receipts (actor_id,project_id,route,key,request_hash,status,response,created_at) VALUES (?,?,?,?,?,?,?,?)').bind('owner', 'p1', '/api/discussions', key, 'h', 200, '{"headers":{},"body":"{}"}', created).run();
  }
  // Uploads: one applied (a dataset version names it), one never applied and old, one never applied and recent, one
  // whose project is gone, and one in a project that cannot be read (its stored requirements are missing).
  await env.DB.prepare('INSERT INTO projects (owner_id,id,document,revision,updated_at) VALUES (?,?,?,1,?)').bind('owner', 'p1', JSON.stringify({id: 'p1', intake: {datasets: [{id: 'workbook-u-applied', uploadId: 'u-applied', versions: [{revision: 1, uploadId: 'u-applied'}]}]}}), ago(400 * DAY)).run();
  await env.DB.prepare('INSERT INTO projects (owner_id,id,document,revision,updated_at) VALUES (?,?,?,1,?)').bind('owner', 'p3', JSON.stringify({id: 'p3', requirementsStorage: {artefacts: [{key: 'requirements/owner/p3/missing.json', count: 1, hash: 'x'}], relationships: []}}), ago(400 * DAY)).run();
  const upload = async (id, project, created) => { const key = 'intake/owner/' + project + '/' + id + '.xlsx'; await env.FILES.put(key, 'workbook bytes'); await env.DB.prepare('INSERT INTO workbook_uploads (owner_id,id,project_id,filename,sha256,bytes,storage_key,created_at) VALUES (?,?,?,?,?,?,?,?)').bind('owner', id, project, id + '.xlsx', 'h', 1, key, created).run(); return key; };
  const appliedUpload = await upload('u-applied', 'p1', ago(400 * DAY)), abandoned = await upload('u-abandoned', 'p1', ago(40 * DAY)), pendingUpload = await upload('u-recent', 'p1', ago(2 * DAY));
  const orphaned = await upload('u-orphan', 'p-gone', ago(40 * DAY)), unreadable = await upload('u-unreadable', 'p3', ago(40 * DAY));

  // 3. The budget before: a reservation cut off mid-flight still counts.
  const reserved = async () => (await env.DB.prepare("SELECT COALESCE(SUM(COALESCE(used_tokens,reserved_tokens)),0) AS tokens FROM intelligence_runs WHERE owner_id='owner' AND project_id='p1' AND created_at>?").bind(ago(DAY)).first()).tokens;
  assert.equal(await reserved(), 200000 + 200000, 'before: both pending reservations count against the day (the completed run is older than the day)');
  assert.equal(await releaseInterruptedRuns(env, {owner: 'owner', projectId: 'p1', now}), 2, 'before a new run, the project\'s stale pending run and its stale pending retrieval are released (both count against the budget)');
  assert.deepEqual({...await env.DB.prepare("SELECT status,used_tokens FROM brain_retrieval_runs WHERE id='stale-retrieval'").bind().first()}, {status: 'interrupted', used_tokens: 0}, 'the stale retrieval reservation is released with the run');
  assert.equal(await reserved(), 200000, 'the interrupted reservation no longer counts; the fresh pending one does');
  const interrupted = await env.DB.prepare("SELECT status,error_code,used_tokens FROM intelligence_runs WHERE id='stale-pending'").bind().first();
  assert.deepEqual({...interrupted}, {status: 'interrupted', error_code: 'interrupted', used_tokens: 0});
  assert.equal((await env.DB.prepare("SELECT status FROM intelligence_runs WHERE id='other-project-stale'").bind().first()).status, 'pending', 'another project\'s run is not touched by the project-scoped release');
  pass('reservation release: a run or retrieval pending for longer than ten minutes becomes interrupted with used_tokens=0 and leaves the daily budget; a fresh pending run and other projects are untouched');

  // 4. The sweep with the default policy at a fixed clock.
  const policy = retentionPolicy({});
  assert.deepEqual(policy, DEFAULT_RETENTION);
  const result = await runRetention(env, policy, now);
  assert.deepEqual({interrupted: result.interrupted, runs: result.runs, runFiles: result.runFiles, retrievals: result.retrievals, retrievalFiles: result.retrievalFiles, events: result.events, activity: result.activity, uploads: result.uploads, uploadFiles: result.uploadFiles, receipts: result.receipts}, {interrupted: 1, runs: 1, runFiles: 1, retrievals: 1, retrievalFiles: 1, events: 1, activity: 1, uploads: 2, uploadFiles: 2, receipts: 2}, JSON.stringify(result));
  assert.equal(result.errors.length, 1, 'one project could not be read: ' + JSON.stringify(result.errors)); assert.equal(result.errors[0].project, 'p3'); assert.match(result.errors[0].message, /^Skipped: the project could not be read/);
  assert(retentionChanged(result));
  const ids = async (table) => (await env.DB.prepare(`SELECT id FROM ${table} ORDER BY id`).bind().all()).results.map((r) => r.id);
  assert.deepEqual(await ids('intelligence_runs'), ['fresh-pending', 'other-project-stale', 'recent-completed', 'stale-pending']);
  assert.deepEqual(await ids('brain_retrieval_runs'), ['recent-retrieval', 'stale-retrieval']);
  assert.deepEqual(await ids('operation_events'), ['recent-event']); assert.deepEqual(await ids('project_activity'), ['recent-activity']);
  assert.deepEqual((await env.DB.prepare('SELECT key FROM command_receipts').bind().all()).results.map((r) => r.key), ['recent-receipt-00000000']);
  assert.deepEqual((await env.DB.prepare('SELECT key FROM route_receipts').bind().all()).results.map((r) => r.key), ['recent-receipt-00000000'], 'route receipts follow the same day');
  assert.equal(await env.FILES.get(oldRun), null, 'the old run\'s file is removed'); assert(await env.FILES.get(keptRun), 'the recent run\'s file stays');
  assert.equal(await env.FILES.get(oldRetrieval), null); assert(await env.FILES.get(keptRetrieval)); assert(await env.FILES.get(stale) && await env.FILES.get(fresh) && await env.FILES.get(otherStale) && await env.FILES.get(staleRetrieval));
  assert.equal((await env.DB.prepare("SELECT status FROM intelligence_runs WHERE id='other-project-stale'").bind().first()).status, 'interrupted', 'the sweep releases every project\'s stale runs');
  assert.equal((await env.DB.prepare("SELECT status,used_tokens FROM brain_retrieval_runs WHERE id='stale-retrieval'").bind().first()).used_tokens, 0);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM projects').bind().first()).n, 2, 'projects are never swept');
  assert.deepEqual(await ids('workbook_uploads'), ['u-applied', 'u-recent', 'u-unreadable'], 'an applied upload, a recent one and one in a project that cannot be read stay');
  assert(await env.FILES.get(appliedUpload) && await env.FILES.get(pendingUpload) && await env.FILES.get(unreadable)); assert.equal(await env.FILES.get(abandoned), null); assert.equal(await env.FILES.get(orphaned), null);
  const again = await runRetention(env, policy, now);
  assert.equal(again.interrupted + again.runs + again.retrievals + again.events + again.activity + again.uploads + again.receipts, 0, 'a second sweep removes nothing more');
  assert.equal(again.errors.length, 1, 'and still reports the project it cannot read');
  pass('sweep: runs and retrieval packets older than 90 days go with their files, operation events and activity older than a year, never-applied uploads older than 30 days, receipts older than a day; recent rows, projects and applied uploads stay; a project that cannot be read is reported and left alone; the sweep is idempotent');

  // 5. Policy settings: 0 keeps for ever, non-integers are refused.
  assert.equal(retentionPolicy({AIW_RETENTION_RUNS_DAYS: '0', AIW_RETENTION_EVENTS_DAYS: '30'}).runsDays, 0);
  assert.equal(retentionPolicy({AIW_RETENTION_EVENTS_DAYS: '30'}).eventsDays, 30);
  assert.throws(() => retentionPolicy({AIW_RETENTION_ACTIVITY_DAYS: 'soon'}), /whole numbers of days/);
  await run('very-old-kept', ago(500 * DAY), 'completed', {used: 1});
  const keepRuns = await runRetention(env, retentionPolicy({AIW_RETENTION_RUNS_DAYS: '0'}), now);
  assert.equal(keepRuns.runs, 0, 'runsDays=0 keeps every run');
  pass('policy: each class has its own setting in days, 0 keeps for ever, and a non-numeric setting is refused');

  // 6. The on-demand script reports a dry run and applies the policy against the same database. It runs on the real
  // clock, so the runs it should remove are counted against the real clock here (at least the 500-day-old run).
  const realCutoff = new Date(Date.now() - DEFAULT_RETENTION.runsDays * DAY).toISOString();
  const dueRuns = (await env.DB.prepare('SELECT COUNT(*) AS n FROM intelligence_runs WHERE created_at<?').bind(realCutoff).first()).n;
  assert(dueRuns >= 1, 'the 500-day-old run is due on the real clock');
  env.DB.close();
  const dry = spawnSync(process.execPath, ['scripts/retention.mjs', '--dry-run'], {encoding: 'utf8', env: {...process.env, AIW_LOCAL_DB: dbFile}});
  assert.equal(dry.status, 0, dry.stderr);
  assert(dry.stdout.trim(), 'dry-run reported no output: ' + JSON.stringify({error: dry.error?.message, stderr: dry.stderr, signal: dry.signal}));
  const report = JSON.parse(dry.stdout);
  assert.equal(report.dryRun, true); assert.equal(report.database, dbFile); assert.equal(report.files, path.join(scratch, 'store', 'baselines'));
  assert.equal(report.wouldRemove.runs, dueRuns, 'the dry run counts the runs past the policy without removing anything');
  assert.equal(report.wouldRemove.uploads, 0, 'the never-applied uploads were already removed by the sweep above'); assert.equal(report.errors.length, 1, 'the dry run reports the project it cannot read');
  const applied = spawnSync(process.execPath, ['scripts/retention.mjs'], {encoding: 'utf8', env: {...process.env, AIW_LOCAL_DB: dbFile}});
  assert.equal(applied.status, 1, 'a project the sweep could not read makes the run exit 1, so an operator notices: ' + applied.stderr);
  assert(applied.stdout.trim(), 'the sweep must print its report even when it exits 1: ' + applied.stderr);
  const appliedReport = JSON.parse(applied.stdout);
  assert.equal(appliedReport.runs, dueRuns, 'the dry run removed nothing: the applied run removes the same count');
  assert.equal(appliedReport.errors.length, 1); assert.equal(appliedReport.errors[0].project, 'p3');
  env.DB = localDatabase(dbFile);
  assert.equal((await env.DB.prepare("SELECT COUNT(*) AS n FROM intelligence_runs WHERE id='very-old-kept'").bind().first()).n, 0);
  pass('script: node scripts/retention.mjs --dry-run reports the policy, the counts and what it cannot read; without the flag it applies the policy to AIW_LOCAL_DB and its object directory and exits 1 when anything was skipped');

  // 7. The provider adapter: one bounded retry on 429/5xx, a per-call timer, a cost estimate, a connection probe.
  const responses = (list) => { let i = 0; const calls = []; return {calls, fetcher: async (url, init) => { calls.push({url, signal: init.signal}); const next = list[Math.min(i++, list.length - 1)]; if (next instanceof Error) throw next; return next(); }}; };
  const ok = () => new Response('{}', {status: 200});
  let double = responses([() => new Response('slow down', {status: 429, headers: {'retry-after': '0'}}), ok]);
  let call = {signal: new AbortController().signal, aborted: false, attempts: 0};
  let answer = await providerFetch(double.fetcher, 'https://provider.test/v1/responses', {method: 'POST'}, call);
  assert.equal(answer.status, 200); assert.equal(call.attempts, 2); assert.equal(double.calls.length, 2, 'a 429 is retried once');
  double = responses([() => new Response('', {status: 503}), () => new Response('', {status: 503}), ok]);
  call = {signal: new AbortController().signal, aborted: false, attempts: 0};
  answer = await providerFetch(double.fetcher, 'https://provider.test/v1/responses', {method: 'POST'}, call);
  assert.equal(answer.status, 503); assert.equal(double.calls.length, 2, 'a second failure is returned, not retried again: the retry is bounded');
  double = responses([Object.assign(Error('socket hang up'), {code: 'ECONNRESET'}), ok]);
  call = {signal: new AbortController().signal, aborted: false, attempts: 0};
  assert.equal((await providerFetch(double.fetcher, 'https://provider.test/v1/responses', {method: 'POST'}, call)).status, 200, 'a connection that failed before any answer is retried once');
  double = responses([() => new Response('', {status: 400})]);
  call = {signal: new AbortController().signal, aborted: false, attempts: 0};
  assert.equal((await providerFetch(double.fetcher, 'https://provider.test/v1/responses', {method: 'POST'}, call)).status, 400); assert.equal(double.calls.length, 1, 'a 4xx other than 429 is not retried');
  const provider = {OPENAI_API_KEY: 'test-key-not-real', AIW_LLM_MODEL: 'test-model', AIW_LLM_TIMEOUT_MS: '1000', AIW_LLM_PRICE_INPUT_PER_MTOK: '2', AIW_LLM_PRICE_OUTPUT_PER_MTOK: '8', AIW_LLM_CURRENCY: 'EUR'};
  assert.equal(callTimeout(provider, 45000), 1000); assert.equal(callTimeout({}, 45000), 45000); assert.equal(callTimeout({AIW_LLM_TIMEOUT_MS: '5'}, 45000), 45000, 'a timer under a second is ignored');
  assert.deepEqual(usageCost(provider, {inputTokens: 1000000, outputTokens: 500000}), {amount: 6, currency: 'EUR', basis: 'Estimated from AIW_LLM_PRICE_INPUT_PER_MTOK and AIW_LLM_PRICE_OUTPUT_PER_MTOK; not a provider invoice.'});
  assert.equal(usageCost({}, {inputTokens: 1, outputTokens: 1}), null, 'no price table, no estimate');
  const started = Date.now();
  await assert.rejects(() => requestDirectBaseline(provider, {instructions: 'x', input: {}, schema: {type: 'object'}, name: 'probe'}, {fetcher: (url, init) => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(Error('aborted'), {name: 'AbortError'}))))}), (e) => e.code === 'timeout');
  assert(Date.now() - started < 4000, 'the per-call timer (one second here), not the caller\'s 60 s default, bounds the call');
  const baseline = await requestDirectBaseline(provider, {instructions: 'x', input: {}, schema: {type: 'object'}, name: 'probe'}, {fetcher: async () => new Response(JSON.stringify({id: 'resp_1', status: 'completed', model: 'test-model', usage: {input_tokens: 100, output_tokens: 50}, output: [{type: 'message', content: [{type: 'output_text', text: '{"ok":true}'}]}]}), {status: 200})});
  assert.deepEqual(baseline.usage, {inputTokens: 100, outputTokens: 50, cost: {amount: 0.0006, currency: 'EUR', basis: 'Estimated from AIW_LLM_PRICE_INPUT_PER_MTOK and AIW_LLM_PRICE_OUTPUT_PER_MTOK; not a provider invoice.'}}, 'a run reports its tokens and the estimated cost');
  assert.equal(baseline.attempts, 1);
  let status = intelligenceStatus(provider);
  assert.equal(status.configured, true); assert.equal(status.defaultHourlyRequests, 30); assert.equal(status.retryAttempts, 2); assert.equal(status.callTimeoutMs, 1000); assert.deepEqual(status.pricing, {configured: true, currency: 'EUR'}); assert.equal(status.connectionVerified, null, 'unverified until probed');
  const probe = await verifyConnection(provider, {fetcher: async (url) => { assert.match(url, /\/models\/test-model$/); return new Response('{}', {status: 200}); }, force: true});
  assert.equal(probe.ok, true); assert.equal(intelligenceStatus(provider).connectionVerified.ok, true, 'status reports the probe');
  const denied = await verifyConnection(provider, {fetcher: async () => new Response('', {status: 401}), force: true});
  assert.equal(denied.ok, false); assert.equal(denied.code, 'authentication');
  assert.equal((await verifyConnection({}, {})).code, 'not_configured');
  pass('provider: a 429, a 5xx or a failed connection is retried once and no more; each call has its own timer (AIW_LLM_TIMEOUT_MS); runs carry an estimated cost from the price table; status reports the last connection probe');

  // 8. Error lines are one JSON object each (B2-10).
  const lines = [];
  const stderr = console.error; console.error = (line) => lines.push(line);
  try { errorEvent('request-error', new TypeError('boom'), {requestId: 'r1', method: 'GET', path: '/api/x'}); } finally { console.error = stderr; }
  const parsed = JSON.parse(lines[0]);
  assert.equal(parsed.event, 'request-error'); assert.equal(parsed.message, 'boom'); assert.equal(parsed.requestId, 'r1'); assert.match(parsed.stack, /TypeError: boom/); assert.match(parsed.at, /^\d{4}-/);
  pass('error logging: one JSON line with time, event, request id, message and the first stack frames');
} finally {
  try { env.DB.close(); } catch { /* closed */ }
  rmSync(scratch, {recursive: true, force: true});
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
