// Size and speed at the size of a drafted design (round 12, PS-12; D-11's targets). test:scale holds 500 records per
// chapter with no change history; the costs that dominated a drafted design were the history's: the journal read and
// written by every save, answered whole by every save that touched it, the 40 % of a save spent on a summary nobody read,
// the per-command copies of a batch, a read that upgraded the project again each time. This suite builds a design of
// that shape, synthetic and generated here (no client text): the 500-per-chapter project of the scale gate with 4,000
// changes over 800 records (3,200 superseded, about 100,000 affected records, some reviewed), stored as the code before
// round 12 stored it (the journal whole, explanations twice). Then, in process through the Worker route and timed, each
// within its bound:
//   1. the first read stores the upgrade once (storage-upgrade.js) and the next read is a plain read; the row and the
//      document shrink (journal-archive.js);
//   2. a one-record reviewed change (with the browser's preview), a 20-record batch, a review of one affected record, one
//      review for a whole change, a requirement edit and a bulk confirmation, each a save; every answer carries the
//      journal as a delta (a review answers its change, not the journal);
//   2b. requirement groups at the size of a core-banking workbook (round 12, A3: GR-PERF-15; sdd-fixtures.mjs largeProject,
//      1,400 imported requirements in about 60 rule groups, generic names, restored here): the group index is built once
//      per revision of what it reads (requirement-groups.js), so two documents of one revision share one build, a save that
//      changes no requirement and no group builds none, a save that links groups builds no more than one that does not,
//      and a changed attribute is read into its group at once;
//   3. through server.js (its export and read threads): the SDD's executive and full editions and a page of the journal's
//      annex, each within D-11's 10 s, and a health check answered within a second while a full edition is built and
//      while a project is read.
// Bounds are about three times what this machine measured with other suites running (the timings are reported). Run
// alone (release-checks.mjs EXCLUSIVE). Run: npm run test:size-speed
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
import {withFinalReview} from './public/review-domain.js';
import {changeEvents, changeSummary, changeCauses, changeItemState, changeTargetStamp, causeStamp, isCurrentChange} from './public/changes-domain.js';
import {previewWorkingChange} from './public/workbench-domain.js';
import {mergeSaved} from './public/project-store.js';
import {settleDocument} from './public/document-memo.js';
import {largeProject} from './sdd-fixtures.mjs';
import {groupIndex, groupIndexBuilds, groupMembers, requirementGroups, ruleMatches} from './public/requirement-groups.js';

// The full edition of this design draws its 500-record chapters whole (Chapter 5's tree alone 1,500 nodes, eight times
// the drafted design's): bounded at 25 s here, while the drafted design's full edition is measured against D-11's 10 s.
// A save's answer (round 12, A3: GR-PERF-12): a batch answers the history entries it added and a requirement edit the
// records it changed, each under 300 K characters.
const BUDGET = {firstRead: 30000, read: 4000, save: 2000, batch: 6000, review: 2000, edit: 4000, confirm: 4000, export: 10000, fullExport: 25000, annex: 3000, health: 1000, reviewAnswer: 1e6, answer: 300000};
const checks = [], timings = {}, began = Date.now();
const pass = name => { checks.push(name); console.log('PASS', name, '(' + Math.round((Date.now() - began) / 1000) + ' s)'); };
const within = (name, ms, bound) => { timings[name] = ms; assert(ms <= bound, `${name} took ${ms} ms (bound ${bound} ms)`); };

// ---------------------------------------------------------------- the design and its history
// The scale gate's project, from its cache when the sources it was built from are unchanged (scale-validate.mjs).
const sources = () => { const files = ['scripts/build-scale-fixture.mjs', ...['public', 'shared'].flatMap(dir => readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => dir + '/' + f))]; const h = createHash('sha256'); for (const f of files) h.update(f + '\0' + readFileSync(f, 'utf8') + '\0'); return h.digest('hex').slice(0, 16); };
const cacheDir = '.aiw-local/scale-fixture', cached = cacheDir + '/scale-500-' + sources() + '.json';
let raw;
if (existsSync(cached)) raw = readFileSync(cached, 'utf8');
else { raw = JSON.stringify((await buildScaleProject({perChapter: 500})).document); mkdirSync(cacheDir, {recursive: true}); for (const f of readdirSync(cacheDir)) if (f.startsWith('scale-500-')) rmSync(cacheDir + '/' + f, {force: true}); writeFileSync(cached, raw); }
const design = withFinalReview(JSON.parse(raw)), history = addSyntheticJournal(design, {events: 4000, sources: 1500, items: 25, reviewed: 0.02, seed: 12});
design.id = 'project-size-speed'; design.name = 'Size and speed · synthetic';
const legacy = JSON.stringify(design);
pass(`the design: 500 records per chapter and ${history.events} changes (${history.superseded} superseded, ${history.items} affected records), ${(legacy.length / 1e6).toFixed(1)} M characters stored as before round 12`);

const dir = await mkdtemp(tmpdir() + '/aiw-size-speed-'), dbFile = path.join(dir, 'project.sqlite'), filesDir = path.join(dir, 'baselines');
const env = {DB: localDatabase(dbFile), FILES: localFiles(filesDir), ASSETS: {fetch: () => new Response('ok')}};
const owner = 'local-architect', origin = 'https://aiw.test';
const call = async (route, body) => { const t = performance.now(); const r = await worker.fetch(new Request(origin + route, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': owner, Origin: origin, ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env); const text = await r.text(); return {status: r.status, ms: Math.round(performance.now() - t), text, data: (() => { try { return JSON.parse(text); } catch { return null; } })()}; };
let server = null;
try {
  await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind(owner, design.id, legacy, '2026-10-02T09:00:00.000Z').run();
  const id = design.id;
  // ---------------------------------------------------------------- 1. reads
  const first = await call('/api/project?project=' + id);
  assert.equal(first.status, 200, first.text.slice(0, 300)); within('first read (stores the upgrade)', first.ms, BUDGET.firstRead);
  const stored = await env.DB.prepare('SELECT length(document) AS n, revision FROM projects WHERE id=?').bind(id).first();
  assert.equal(stored.revision, 2, 'the first read stored the upgrade');
  const second = await call('/api/project?project=' + id);
  within('read', second.ms, BUDGET.read); assert.equal(second.data.revision, 2, 'the next read writes nothing');
  timings.documentChars = {before: legacy.length, after: second.text.length}; timings.rowChars = {before: legacy.length, after: stored.n};
  assert(second.text.length < legacy.length * 0.5, 'the project read is less than half the size it was');
  // The journal out of the read (round 12, A3: GR-PERF-13): a read carries no archived change (each is read with the
  // journal's annex, GET /api/changes) and counts them, so its size does not grow with the changes archived.
  const archivedStored = JSON.parse((await env.DB.prepare('SELECT document FROM projects WHERE id=?').bind(id).first()).document).changes.archive.reduce((n, page) => n + page.count, 0);
  assert(archivedStored > 0 && !second.data.document.changes.events.some(e => e.archived), 'a read carries no archived change');
  assert.equal(second.data.document.changes.archivedCount, archivedStored, 'and counts them');
  timings.journalRead = {events: second.data.document.changes.events.length, archived: archivedStored};
  let held = {document: settleDocument(second.data.document), revision: second.data.revision};
  const summary = changeSummary(held.document);
  pass(`the first read stores the upgrade in ${first.ms} ms; a read then takes ${second.ms} ms; the stored row ${legacy.length} → ${stored.n} characters, the project read ${second.text.length} (${summary.open} affected records open over ${changeCauses(held.document).length} causes)`);

  // ---------------------------------------------------------------- 2. saves
  const answers = {};
  const send = async (label, command, bound) => {
    const r = await call('/api/commands?project=' + id + '&response=sections', {revision: held.revision, command});
    assert.equal(r.status, 200, label + ': ' + r.text.slice(0, 300)); within(label, r.ms, bound);
    if (r.data.sections.changes) assert(r.data.sections.changes.delta, label + ': the journal answers as a delta');
    held = {document: settleDocument(mergeSaved(held.document, r.data).document), revision: r.data.revision};
    timings[label + ' answer'] = r.text.length; answers[label] = r.data; return r;
  };
  const reason = 'Size and speed suite; synthetic, not reviewed by a person';
  const assumption = n => ({type: 'artefact', payload: {type: 'assumption', title: 'Size probe ' + n, description: '', owner: '', source: 'Synthetic', confirmed: false}});
  let t = performance.now(); const one = previewWorkingChange(held.document, [assumption(1)]); timings['preview of one record'] = Math.round(performance.now() - t);
  await send('one-record reviewed change', {type: 'workspace.apply', payload: {commands: [assumption(1)], stamp: one.stamp, reviewed: true, reason}}, BUDGET.save);
  const requirements = held.document.artefacts.filter(a => a.type === 'requirement'), outcome = held.document.artefacts.find(a => a.type === 'outcome');
  const links = requirements.filter(r => !held.document.relationships.some(l => l.from === r.id && l.to === outcome.id)).slice(0, 20).map(r => ({type: 'relationship', payload: {from: r.id, to: outcome.id, kind: 'supports'}}));
  t = performance.now(); const batch = previewWorkingChange(held.document, links); timings['preview of 20 records'] = Math.round(performance.now() - t);
  await send('20-record batch', {type: 'workspace.apply', payload: {commands: links, stamp: batch.stamp, reviewed: true, reason}}, BUDGET.batch);
  const p = held.document, open = changeEvents(p).filter(e => isCurrentChange(p, e) && e.items.some(i => !changeItemState(p, e, i).complete));
  const e1 = open.at(-1), item = e1.items.find(i => !changeItemState(p, e1, i).complete);
  const reviewed = await send('review of one affected record', {type: 'change.review', payload: {changeId: e1.id, itemKey: item.key, targetStamp: changeTargetStamp(p, item), outcome: 'unchanged', reviewer: 'Synthetic reviewer', rationale: 'Still holds.', evidence: 'Synthetic', reviewed: true}}, BUDGET.review);
  assert(reviewed.text.length < BUDGET.reviewAnswer, `a review answers its change, not the journal (${reviewed.text.length} characters)`);
  const q = held.document, e2 = changeEvents(q).filter(e => isCurrentChange(q, e) && e.items.filter(i => !changeItemState(q, e, i).complete).length >= 10).at(0);
  await send('one review for a whole change', {type: 'change.review', payload: {scope: 'cause', changeId: e2.id, stamp: causeStamp(q, e2), outcome: 'unchanged', reviewer: 'Synthetic reviewer', rationale: 'Still holds for every record.', evidence: 'Synthetic', reviewed: true}}, BUDGET.review);
  const r1 = held.document.artefacts.find(a => a.type === 'requirement');
  await send('requirement edit', {type: 'artefact', payload: {...r1, acceptance: (r1.acceptance || '') + ' Edited at size.'}}, BUDGET.edit);
  const unconfirmed = held.document.artefacts.filter(a => a.type === 'requirement' && !a.confirmed).length;
  if (unconfirmed) await send('bulk confirmation', {type: 'requirements.confirm', payload: {filter: {unconfirmed: true}, count: unconfirmed, reviewed: true}}, BUDGET.confirm);
  const reload = await call('/api/project?project=' + id);
  within('reload', reload.ms, BUDGET.read);
  assert.equal(JSON.stringify(reload.data.document.changes), JSON.stringify(held.document.changes), 'the journal the browser holds after the deltas is the one saved');
  // Answers by record (GR-PERF-12): a batch answers its history entry, not the workbench; a requirement edit the record it
  // changed, not the artefacts; what the browser holds after them is what was saved.
  for (const label of ['one-record reviewed change', '20-record batch', 'requirement edit']) assert(timings[label + ' answer'] < BUDGET.answer, `${label}: an answer of ${timings[label + ' answer']} characters (bound ${BUDGET.answer})`);
  const batchAnswer = answers['20-record batch'], editAnswer = answers['requirement edit'];
  assert.equal(batchAnswer.deltas.workbench.obj.set.history.grow.add.length, 1, 'a batch answers the one history entry it added');
  assert(Object.values(batchAnswer.deltas.workbench.obj.set).every(d => d.grow || JSON.stringify(d).length < 200), 'and of the rest of the workbench only what changed (its version)');
  assert.equal(batchAnswer.deltas.relationships.rec.add.length, 20, 'and the 20 relationships it added');
  assert(!('workbench' in batchAnswer.sections) && !('artefacts' in editAnswer.sections), 'neither section is answered whole');
  assert.equal(editAnswer.deltas.artefacts.rec.at.length, 1, 'a requirement edit answers the one record it changed'); assert(!editAnswer.deltas.artefacts.rec.add && !editAnswer.deltas.artefacts.rec.del);
  for (const key of ['artefacts', 'relationships', 'workbench']) assert.equal(JSON.stringify(reload.data.document[key]), JSON.stringify(held.document[key]), 'the ' + key + ' the browser holds after the answers is the one saved');
  pass(`saves at size: one record ${timings['one-record reviewed change']} ms (preview ${timings['preview of one record']} ms), 20 records ${timings['20-record batch']} ms (preview ${timings['preview of 20 records']} ms), one review ${timings['review of one affected record']} ms answering ${reviewed.text.length} characters, a whole change ${timings['one review for a whole change']} ms, a requirement edit ${timings['requirement edit']} ms${unconfirmed ? ', a bulk confirmation ' + timings['bulk confirmation'] + ' ms' : ''}; reload ${reload.ms} ms, and the journal held after the deltas is the one saved; answers of ${timings['one-record reviewed change answer']}, ${timings['20-record batch answer']} and ${timings['requirement edit answer']} characters for one record, 20 records and a requirement edit (bound ${BUDGET.answer}), each section by what changed in it`);

  // ---------------------------------------------------------------- 2b. requirement groups (round 12, A3: GR-PERF-15)
  {
    const built = await largeProject(), big = built.document;
    const pv = await call('/api/recovery?action=preview', {package: big}); assert.equal(pv.status, 200, pv.text.slice(0, 300));
    const rs = await call('/api/recovery?action=restore', {package: big, hash: pv.data.hash, name: 'Synthetic large platform', reviewed: true}); assert.equal(rs.status, 201, rs.text.slice(0, 300));
    const gid = rs.data.id, read = await call('/api/project?project=' + gid);
    let g = {revision: read.data.revision};
    const doc = read.data.document, groups = requirementGroups(doc), reqs = doc.artefacts.filter(a => a.type === 'requirement');
    assert(reqs.length === 1400 && groups.length >= 55 && groups.every(x => x.rule?.length), `1,400 requirements in ${groups.length} rule groups`);
    // Two documents of one revision (each a read, as the server and the browser hold them) share one build.
    let n0 = groupIndexBuilds();
    const a = settleDocument(JSON.parse(read.text).document), b = settleDocument(JSON.parse(read.text).document);
    assert.equal(groupIndex(a), groupIndex(b), 'two documents of one revision share one index');
    assert(groupIndexBuilds() - n0 <= 1, 'built at most once for both');
    // Saves of a driver and a decision, each with its groups and without them, alternating, after one save to warm up.
    const driver = doc.quality.drivers.find(d => d.requirementGroupIds?.length), decision = doc.decisions.records.find(d => d.requirementGroupIds?.length);
    const save = async (label, type, payload) => { const before = groupIndexBuilds(), r = await call('/api/commands?response=sections&project=' + gid, {revision: g.revision, command: {type, payload}}); assert.equal(r.status, 200, label + ': ' + r.text.slice(0, 300)); g = {revision: r.data.revision}; return {ms: r.ms, builds: groupIndexBuilds() - before}; };
    const decided = (linked, i) => ({id: decision.id, question: decision.question, requirementIds: decision.requirementIds || [], driverIds: decision.driverIds || [], requirementGroupIds: linked ? decision.requirementGroupIds : [], context: 'Size and speed suite ' + i + (linked ? ' with' : ' without') + ' its groups; synthetic.'});
    await save('warm-up', 'quality.driver', {id: driver.id, rationale: 'Size and speed suite, warm-up; synthetic.'});
    const runs = {driverLinked: [], driverUnlinked: [], decisionLinked: [], decisionUnlinked: []};
    for (let i = 0; i < 3; i++) {
      runs.driverLinked.push(await save('a driver with its groups', 'quality.driver', {id: driver.id, requirementGroupIds: driver.requirementGroupIds, rationale: 'Size and speed suite ' + i + ' with its groups; synthetic.'}));
      runs.driverUnlinked.push(await save('a driver without groups', 'quality.driver', {id: driver.id, requirementGroupIds: [], rationale: 'Size and speed suite ' + i + ' without groups; synthetic.'}));
      runs.decisionLinked.push(await save('a decision with its groups', 'decision.save', decided(true, i)));
      runs.decisionUnlinked.push(await save('a decision without groups', 'decision.save', decided(false, i)));
    }
    const builds = Object.fromEntries(Object.entries(runs).map(([k, v]) => [k, v.reduce((n, r) => n + r.builds, 0)]));
    assert.deepEqual(builds, {driverLinked: 0, driverUnlinked: 0, decisionLinked: 0, decisionUnlinked: 0}, 'a save that changes no requirement and no group builds no index, with its groups or without');
    const median = xs => { const s = xs.map(r => r.ms).sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    timings.groupSaves = Object.fromEntries(Object.entries(runs).map(([k, v]) => [k, median(v)]));
    // A changed attribute is read into its group at once: the index of the changed document is built again, and holds it.
    const rule = groups[0].rule, inside = reqs.find(r => ruleMatches(rule, r)), changed = JSON.parse(read.text).document, target = changed.artefacts.find(r => r.id === inside.id);
    const top = {domain: 'domain', capabilityTheme: 'capability', module: 'module', userGroup: 'userGroup'};
    for (const c of rule) { if (top[c.field]) target[top[c.field]] = 'Elsewhere'; else target.assessment = {...target.assessment, [c.field]: 'Elsewhere'}; }
    settleDocument(changed); n0 = groupIndexBuilds();
    assert(groupMembers(a, groups[0].id).includes(inside.id) && !groupMembers(changed, groups[0].id).includes(inside.id), 'a requirement whose attribute changed leaves the group at once');
    assert.equal(groupIndexBuilds() - n0, 1, 'the changed document\'s index is built once');
    timings.groupIndex = {requirements: reqs.length, groups: groups.length, fixtureMs: built.ms};
    pass(`requirement groups at size (${reqs.length} requirements in ${groups.length} rule groups): the index is built once per revision of what it reads; saves with and without groups built none (a driver ${timings.groupSaves.driverLinked} ms with its groups, ${timings.groupSaves.driverUnlinked} ms without; a decision ${timings.groupSaves.decisionLinked} ms and ${timings.groupSaves.decisionUnlinked} ms); a changed attribute is read into its group at once`);
  }

  // ---------------------------------------------------------------- 3. through server.js
  env.DB.close();
  const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const n = s.address().port; s.close(() => r(n)); }); });
  let log = '';
  server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: dbFile, AIW_LOCAL_ACCOUNTS: '', OPENAI_API_KEY: '', ANTHROPIC_API_KEY: ''}, stdio: ['ignore', 'pipe', 'pipe']});
  server.stderr.on('data', d => { log += d; });
  await new Promise((resolve, reject) => { server.stdout.on('data', d => { log += d; if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c + ' ' + log.slice(-500)))); });
  const base = 'http://127.0.0.1:' + port, timed = async route => { const s = performance.now(); const r = await fetch(base + route); const body = await r.text(); return {status: r.status, ms: Math.round(performance.now() - s), bytes: body.length}; };
  // A health check while the full edition is built and while the project is read: the main loop answers.
  const health = async work => { const pending = work(); await new Promise(r => setTimeout(r, 300)); const h = await timed('/api/health'); const w = await pending; return {health: h.ms, work: w}; };
  const full = await health(() => timed('/api/export?project=' + id + '&chapter=11&format=md&edition=full&audience=all'));
  assert.equal(full.work.status, 200); within('SDD full edition (server)', full.work.ms, BUDGET.fullExport); within('health during a full edition', full.health, BUDGET.health);
  const executive = await timed('/api/export?project=' + id + '&chapter=11&format=md&edition=executive&audience=review');
  assert.equal(executive.status, 200); within('SDD executive edition (server)', executive.ms, BUDGET.export);
  const annex = await timed('/api/export?project=' + id + '&chapter=11&document=changes&format=md&page=20');
  assert.equal(annex.status, 200); within('journal annex page (server)', annex.ms, BUDGET.annex);
  const read = await health(() => timed('/api/project?project=' + id));
  assert.equal(read.work.status, 200); within('read (server)', read.work.ms, BUDGET.read); within('health during a read', read.health, BUDGET.health);
  pass(`through server.js: the full edition ${full.work.ms} ms (${(full.work.bytes / 1e6).toFixed(1)} M characters), the executive edition ${executive.ms} ms, a page of the annex ${annex.ms} ms; health answered in ${full.health} ms during the full edition and ${read.health} ms during a read`);
} finally {
  server?.kill('SIGKILL');
  try { env.DB.close(); } catch { /* closed above */ }
  await rm(dir, {recursive: true, force: true});
}
console.log(JSON.stringify({passed: checks.length, timings, checks}, null, 1));
