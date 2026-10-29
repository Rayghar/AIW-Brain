// Baselines at size (round 12, A3: GR-STO-02, GR-PERF-13). Before this round a freeze of a drafted design ran on the
// request for minutes (526 s on the drafted 5,000-record design; 1,238 s on this suite's synthetic design, both measured
// on the round branch 2026-10-08) and every later read carried each baseline whole (51 M characters a baseline). On the
// synthetic design of the size-and-speed suite (the 500-per-chapter scale project with 4,000 changes, generated here, no
// client text), through the Worker route in process unless said otherwise:
//   1. a freeze is a job: POST /api/baselines answers at once (202) with its receipt; its progress names each part as it
//      is built, in order; it completes within BUDGET.freeze; a save never freezes (/api/commands refuses
//      review.baseline); a freeze cancelled saves nothing;
//   2. a project read does not grow with the baselines: a freeze adds a few kilobytes of metadata to it (under 5 % and
//      under PER_BASELINE characters a baseline), the same for each further one, and no part;
//   3. its parts load only when the baseline is opened, each checked against its SHA-256: the verify route reads them all
//      and names the baseline's SHA-256; the frozen SDD exports from them; a second freeze of the same design stores only
//      the parts that differ (its SDD), the rest shared by their SHA-256;
//   4. immutable and exact: opened, a baseline holds the design source, the journal (whole, its archived changes read
//      back), the findings, the model and the SDD the design had when it was frozen; on the reference project a baseline
//      frozen, stored and opened again is the same, character for character; a part or a metadata record altered in
//      storage is refused (422 integrity);
//   5. through server.js the job runs in the export thread: a health check answers within a second while a freeze runs.
// The frozen SDD is built by the registered SDD builder (sdd-document.js, workstream F's), and its figure cost decides
// most of a freeze's time: the bound below holds with its figures drawn inside one memo pass (GR-PERF-11). The timings
// are reported. Run alone (release-checks.mjs EXCLUSIVE). Run: npm run test:baseline-size
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync} from 'node:fs';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import net from 'node:net';
import path from 'node:path';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {buildScaleProject} from './scripts/build-scale-fixture.mjs';
import {addSyntheticJournal} from './scripts/synthetic-journal.mjs';
import {withFinalReview, reviewDesignStamp, reviewSource, inheritedFindings, freezeSteps, recordBaseline} from './public/review-domain.js';
import {logicalGraph} from './public/logical-domain.js';
import {seedProject} from './public/requirements-domain.js';
import {digest} from './public/brain-integrity.js';
import {readStoredProject, saveStoredProject, openBaseline, baselinePartKey, wholeProject} from './project-storage.js';

const BUDGET = {freeze: 60000, start: 3000, read: 4000, health: 1000}, PER_BASELINE = 4096, GROWTH = 0.05;
const checks = [], timings = {}, began = Date.now();
const pass = name => { checks.push(name); console.log('PASS', name, '(' + Math.round((Date.now() - began) / 1000) + ' s)'); };
const within = (name, ms, bound) => { timings[name] = ms; assert(ms <= bound, `${name} took ${ms} ms (bound ${bound} ms)`); };

// ---------------------------------------------------------------- the design (the size-and-speed suite's)
const sources = () => { const files = ['scripts/build-scale-fixture.mjs', ...['public', 'shared'].flatMap(dir => readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => dir + '/' + f))]; const h = createHash('sha256'); for (const f of files) h.update(f + '\0' + readFileSync(f, 'utf8') + '\0'); return h.digest('hex').slice(0, 16); };
const cacheDir = '.aiw-local/scale-fixture', cached = cacheDir + '/scale-500-' + sources() + '.json';
let raw;
if (existsSync(cached)) raw = readFileSync(cached, 'utf8');
else { raw = JSON.stringify((await buildScaleProject({perChapter: 500})).document); mkdirSync(cacheDir, {recursive: true}); for (const f of readdirSync(cacheDir)) if (f.startsWith('scale-500-')) rmSync(cacheDir + '/' + f, {force: true}); writeFileSync(cached, raw); }
const design = withFinalReview(JSON.parse(raw)), history = addSyntheticJournal(design, {events: 4000, sources: 1500, items: 25, reviewed: 0.02, seed: 12});
design.id = 'project-baseline-size'; design.name = 'Baselines at size · synthetic';

const dir = await mkdtemp(tmpdir() + '/aiw-baseline-size-'), dbFile = path.join(dir, 'project.sqlite'), filesDir = path.join(dir, 'baselines');
const env = {DB: localDatabase(dbFile), FILES: localFiles(filesDir), ASSETS: {fetch: () => new Response('ok')}};
const owner = 'local-architect', origin = 'https://aiw.test', id = design.id;
const call = async (route, body) => { const t = performance.now(); const r = await worker.fetch(new Request(origin + route, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': owner, Origin: origin, ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env); const text = await r.text(); return {status: r.status, ms: Math.round(performance.now() - t), text, data: (() => { try { return JSON.parse(text); } catch { return null; } })()}; };
const read = async () => { const r = await call('/api/project?project=' + id); assert.equal(r.status, 200, r.text.slice(0, 300)); return r; };
const partFiles = () => readdirSync(filesDir).length;
// A freeze through its job: started, its progress read until it ends (cancelled past twice the bound).
const freeze = async (title, stamp, {cancel = false} = {}) => {
  const requestId = 'size-freeze-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  const t = performance.now(), started = await call('/api/baselines?project=' + id + '&action=freeze', {requestId, title, reviewed: true, stamp});
  assert.equal(started.status, 202, started.text.slice(0, 300));
  if (cancel) assert.equal((await call('/api/baselines?project=' + id + '&action=cancel', {id: requestId})).status, 200);
  const seen = [];
  for (;;) {
    await new Promise(resolve => setTimeout(resolve, 50));
    const job = (await call('/api/baselines?project=' + id + '&action=status&id=' + requestId)).data.job;
    for (const part of job.progress?.parts || []) if (!seen.includes(part.part)) seen.push(part.part);
    if (!['queued', 'running'].includes(job.status)) return {job, ms: Math.round(performance.now() - t), startMs: started.ms, seen};
    if (performance.now() - t > 2 * BUDGET.freeze) { await call('/api/baselines?project=' + id + '&action=cancel', {id: requestId}); assert.fail(`the freeze did not end within ${2 * BUDGET.freeze} ms (cancelled); its progress: ${JSON.stringify(job.progress)}`); }
  }
};
let server = null;
try {
  await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind(owner, id, JSON.stringify(design), '2026-10-02T09:00:00.000Z').run();
  await read(); // the first read stores the project as this version keeps it (storage-upgrade.js)
  const before = await read();
  let held = {document: before.data.document, revision: before.data.revision};
  const checked = await call('/api/commands?project=' + id, {revision: held.revision, command: {type: 'review.checks', payload: {}}});
  assert.equal(checked.status, 200, checked.text.slice(0, 300)); held = {document: checked.data.document, revision: checked.data.revision};
  const stamp = reviewDesignStamp(withFinalReview(structuredClone(held.document)));
  const read0 = await read();
  pass(`the design: 500 records per chapter and ${history.events} changes (${history.superseded} superseded), a project read of ${read0.text.length} characters in ${read0.ms} ms`);

  // ---------------------------------------------------------------- 1. a freeze is a job
  const refused = await call('/api/commands?project=' + id, {revision: held.revision, command: {type: 'review.baseline', payload: {title: 'On the request', reviewed: true, stamp}}});
  assert.equal(refused.status, 400); assert.equal(refused.data.code, 'freeze_job', 'a save never freezes a baseline');
  const stopped = await freeze('Cancelled freeze', stamp, {cancel: true});
  assert.equal(stopped.job.status, 'cancelled'); assert.equal((await read()).data.document.finalReview.baselines.length, 0, 'a cancelled freeze saves nothing');
  const files0 = partFiles(), one = await freeze('Synthetic baseline one', stamp);
  assert.equal(one.job.status, 'completed', one.job.error || '');
  within('freeze answered (202)', one.startMs, BUDGET.start); within('freeze (job, to saved)', one.ms, BUDGET.freeze);
  assert.deepEqual(one.seen, ['source', 'review', 'findings', 'model', 'document'], 'the progress names each part as it is built, in order');
  timings['freeze parts'] = Object.fromEntries(one.job.progress.parts.map(p => [p.part, p.ms]));
  pass(`a freeze is a job: answered 202 with its receipt in ${one.startMs} ms, its parts reported in order (${JSON.stringify(timings['freeze parts'])} ms), saved in ${one.ms} ms (bound ${BUDGET.freeze} ms); /api/commands refuses review.baseline; a cancelled freeze saves nothing`);

  // ---------------------------------------------------------------- 2. a read does not grow with the baselines
  const read1 = await read(), b1 = read1.data.document.finalReview.baselines.at(-1);
  within('read after a freeze', read1.ms, BUDGET.read);
  const grow1 = read1.text.length - read0.text.length;
  assert(grow1 < read0.text.length * GROWTH && grow1 < PER_BASELINE, `a freeze adds ${grow1} characters to a read of ${read0.text.length}`);
  for (const part of ['source', 'findings', 'model', 'markdown']) assert(!(part in b1), 'a read carries no ' + part);
  assert.deepEqual(Object.keys(b1.review), ['outcome'], 'of the review state, only the outcome its four-eyes rule reads');
  assert.equal(b1.frozen.sha256, one.job.result.sha256);
  pass(`a project read after a freeze is ${read1.text.length} characters (${grow1} more: the baseline's metadata, ${(100 * grow1 / read0.text.length).toFixed(3)} %), in ${read1.ms} ms; it carries no part`);

  // ---------------------------------------------------------------- 3. parts load when the baseline is opened
  const verified = await call('/api/baselines?project=' + id + '&action=verify&id=' + b1.id);
  assert.equal(verified.status, 200, verified.text.slice(0, 300)); assert.equal(verified.data.verified, true); assert.equal(verified.data.sha256, b1.frozen.sha256);
  timings['verify (every part read and checked)'] = verified.ms;
  const whole = (await call('/api/baselines?project=' + id + '&action=open&part=whole&id=' + b1.id)).data;
  const md = await call('/api/export?project=' + id + '&chapter=11&format=md&baseline=' + b1.id);
  assert.equal(md.status, 200); assert.equal(md.text, whole.markdown, 'the frozen SDD exports from its part');
  for (const f of ['html', 'json']) { const r = await call('/api/export?project=' + id + '&chapter=11&format=' + f + '&baseline=' + b1.id); assert.equal(r.status, 200, f + ': ' + r.text.slice(0, 200)); timings['frozen SDD ' + f] = r.ms; }
  // A second freeze of the same design stores only what differs: its SDD (it names its baseline).
  const files1 = partFiles(), two = await freeze('Synthetic baseline two', stamp);
  assert.equal(two.job.status, 'completed', two.job.error || ''); within('second freeze (job, to saved)', two.ms, BUDGET.freeze);
  const read2 = await read(), [e1, e2] = read2.data.document.finalReview.baselines, grow2 = read2.text.length - read1.text.length;
  for (const part of ['source', 'review', 'journal', 'findings', 'model']) assert.equal(e2.frozen.parts[part].sha256, e1.frozen.parts[part].sha256, 'the second freeze shares its ' + part + ' with the first');
  assert.notEqual(e2.frozen.parts.markdown.sha256, e1.frozen.parts.markdown.sha256);
  assert.equal(partFiles() - files1, 1, 'and stores one part: its SDD');
  assert(Math.abs(grow2 - grow1) < 256 && grow2 < PER_BASELINE, `each baseline adds the same few characters to a read (${grow1}, then ${grow2})`);
  // The row lists only object keys to sweep or keep: never a baseline's entry, and never a part (parts are never swept).
  const listed = JSON.parse((await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner, id).first()).document);
  for (const key of [...(listed.storageSweep?.superseded || []).map(x => x.key), ...(listed.storageRetained || [])]) assert(!key.startsWith('{') && !key.includes('/parts/'), 'a swept or kept object is an object key: ' + key.slice(0, 80));
  timings.readChars = {before: read0.text.length, afterOne: read1.text.length, afterTwo: read2.text.length}; timings.partsStored = {first: files1 - files0, second: partFiles() - files1};
  pass(`parts load when a baseline is opened: verified (every part against its SHA-256) in ${verified.ms} ms; the frozen SDD exports from its part; a second freeze of the same design stored 1 part (its SDD) and shared ${Object.keys(e1.frozen.parts).length - 1}; reads ${read0.text.length} → ${read1.text.length} → ${read2.text.length} characters`);

  // ---------------------------------------------------------------- 4. immutable and exact
  const now = withFinalReview(structuredClone(read2.data.document)), stored = await readStoredProject(env, owner, (await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner, id).first()).document);
  const hydrated = await wholeProject(env, owner, id, withFinalReview(stored.document), stored.keys);
  assert.equal(digest(whole.source), b1.frozen.sourceDigest); assert.equal(JSON.stringify(whole.source), JSON.stringify(reviewSource(now)), 'the design source as it was frozen');
  assert.equal(JSON.stringify(whole.review.changes.events), JSON.stringify(hydrated.changes.events), 'the change journal as it was frozen, whole');
  assert(!whole.review.changes.events.some(e => e.archived), 'no archived stub: the journal of a baseline holds its archived changes whole');
  assert.equal(JSON.stringify(whole.findings), JSON.stringify(inheritedFindings(now)), 'the findings as they were');
  assert.equal(JSON.stringify(whole.model), JSON.stringify(logicalGraph(now)), 'the connected model as it was');
  // On the reference project: a baseline frozen, stored and opened again is the same, character for character.
  {
    const p = withFinalReview(seedProject()); p.id = 'project-baseline-exact';
    const q = withFinalReview((await import('./public/review-domain.js')).applyFinalReviewCommand(p, {type: 'review.checks', payload: {}}, '2026-10-08T12:00:00.000Z', owner).document);
    const steps = freezeSteps(q, {title: 'Exact', reviewed: true, stamp: reviewDesignStamp(q)}, '2026-10-08T12:00:01.000Z', owner); let x = steps.next(); while (!x.done) x = steps.next();
    const frozenText = JSON.stringify(x.value); recordBaseline(q, x.value);
    await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind(owner, q.id, JSON.stringify({...q, finalReview: {...q.finalReview, baselines: []}}), '2026-10-08T12:00:00.000Z').run();
    assert((await saveStoredProject(env, owner, q.id, q, 1, '2026-10-08T12:00:02.000Z', new Map())).meta.changes);
    const entry = JSON.parse((await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner, q.id).first()).document).finalReview.baselines[0];
    assert.equal(JSON.stringify(await openBaseline(env, owner, q.id, entry)), frozenText, 'opened again, the baseline frozen');
  }
  // A part altered in storage is refused; so is a baseline's record altered in the row.
  const key = baselinePartKey(owner, id, e1.frozen.parts.model.sha256), localKey = path.join(filesDir, createHash('sha256').update(key).digest('hex') + '.json'), good = readFileSync(localKey, 'utf8');
  writeFileSync(localKey, good.replace('"nodes"', '"nodez"'));
  const tampered = await call('/api/baselines?project=' + id + '&action=verify&id=' + e1.id);
  assert.equal(tampered.status, 422); assert.equal(tampered.data.code, 'integrity'); assert.match(tampered.data.error, /SHA-256/);
  assert.equal((await call('/api/export?project=' + id + '&chapter=11&format=html&baseline=' + e1.id)).status, 422, 'an export of it is refused');
  writeFileSync(localKey, good);
  const row = await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner, id).first(), altered = JSON.parse(row.document);
  altered.finalReview.baselines[0].title = 'Renamed in storage';
  await env.DB.prepare('UPDATE projects SET document=? WHERE owner_id=? AND id=?').bind(JSON.stringify(altered), owner, id).run();
  const refusedRead = await call('/api/project?project=' + id);
  assert.equal(refusedRead.status, 422); assert.match(refusedRead.data.error, /does not match its SHA-256/);
  await env.DB.prepare('UPDATE projects SET document=? WHERE owner_id=? AND id=?').bind(row.document, owner, id).run();
  assert.equal((await call('/api/baselines?project=' + id + '&action=verify&id=' + e1.id)).data.verified, true);
  pass('immutable and exact: opened, a baseline holds the design source, the journal (whole), the findings and the model the design had when it was frozen; on the reference project a baseline frozen, stored and opened is the same character for character; a part altered in storage is refused (422 integrity, and its export), and so is its record altered in the row (its SHA-256)');

  // ---------------------------------------------------------------- 5. through server.js: the job runs off the main loop
  env.DB.close();
  const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const n = s.address().port; s.close(() => r(n)); }); });
  let log = '';
  server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: dbFile, AIW_LOCAL_ACCOUNTS: '', OPENAI_API_KEY: '', ANTHROPIC_API_KEY: ''}, stdio: ['ignore', 'pipe', 'pipe']});
  server.stderr.on('data', d => { log += d; });
  await new Promise((resolve, reject) => { server.stdout.on('data', d => { log += d; if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c + ' ' + log.slice(-500)))); });
  const base = 'http://127.0.0.1:' + port, http = async (route, body) => { const t = performance.now(); const r = await fetch(base + route, body ? {method: 'POST', headers: {'Content-Type': 'application/json', Origin: base}, body: JSON.stringify(body)} : {}); const text = await r.text(); return {status: r.status, ms: Math.round(performance.now() - t), data: (() => { try { return JSON.parse(text); } catch { return null; } })()}; };
  const requestId = 'size-freeze-server-' + Date.now().toString(36), t = performance.now();
  const started = await http('/api/baselines?project=' + id + '&action=freeze', {requestId, title: 'Synthetic baseline three', reviewed: true, stamp});
  assert.equal(started.status, 202);
  let job, slowest = 0, healthChecks = 0;
  for (;;) {
    await new Promise(resolve => setTimeout(resolve, 250));
    const h = await http('/api/health'); healthChecks++; slowest = Math.max(slowest, h.ms); assert.equal(h.status, 200);
    job = (await http('/api/baselines?project=' + id + '&action=status&id=' + requestId)).data.job;
    if (!['queued', 'running'].includes(job.status)) break;
    assert(performance.now() - t < 2 * BUDGET.freeze, 'the freeze through server.js ends');
  }
  assert.equal(job.status, 'completed', job.error || ''); within('freeze through server.js (job, to saved)', Math.round(performance.now() - t), BUDGET.freeze); within('slowest health check during a freeze', slowest, BUDGET.health);
  assert.equal((await http('/api/project?project=' + id)).data.document.finalReview.baselines.length, 3);
  pass(`through server.js the freeze runs in the export thread: saved in ${timings['freeze through server.js (job, to saved)']} ms while ${healthChecks} health checks answered, the slowest in ${slowest} ms`);
} finally {
  server?.kill('SIGKILL');
  try { env.DB.close(); } catch { /* closed above */ }
  await rm(dir, {recursive: true, force: true});
}
console.log(JSON.stringify({passed: checks.length, timings, checks}, null, 1));
