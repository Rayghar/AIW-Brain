// AIW rc44, build S0-w3-stamps, part B (the lead's ruling Z8 of 2026-11-22, with Z2, Z5 and Z9): a recovery import
// moves every stamp a record carries aside, so that no date decides. Each record's provenance.author and
// provenance.reviewed (with a merge's mergedBy and how 'merged') that an import carries is kept as history under one key
// of the record, provenance.imported, made only when there is something to keep, and names nobody here: reviewOf,
// the second-person rule (the boundary's personBehind and mergedRefusal, verifierRefusal), four eyes, confirmedByPerson,
// the SDD's counts, the review plan and the provenance labels read it so, whatever its dates say. The built-in record
// paths, the narrative, the retired store and the collections a package states through S0 (the boundary's stamp walker)
// are covered, before any early return. The date comparison is retired as the import's guard: it is read only for a
// project imported before this build, which reads exactly as on the start commit until its next import (a known limit,
// recorded). A document never imported gains no key.
//
// Cases through the server where a step is involved: /api/recovery (preview and restore) of a hand-edited project JSON
// and the command route. Goldens of a project imported on the start commit: `node rc44-s0-import-validate.mjs --capture
// <sha>`, captured from the unchanged start commit 4349bb6 into rc44-s0-import-baseline.json (never recaptured).
// In-process Worker, SQLite in memory and files in a map; no network, no provider. The fixtures take fixed times; the
// suite reads no clock (the server stamps its own time on what it writes, as it always does).
// Run: npm run test:rc44-s0-import
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as R from './rc44-s0-readings.mjs';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import * as X from './public/design-extensions.js';
import * as PV from './public/provenance.js';
import * as rv from './public/review-domain.js';
import {reviewPlan} from './public/review-plan.js';
import {verifierRefusal} from './public/architecture-obligations.js';
import {neutraliseImportedAuthority} from './recovery-service.js';
import {knowledgeState} from './public/knowledge-governance.js';
import {previewScenarioAlternative, rebaseWorkingAlternative} from './public/workbench-domain.js';

const AT = R.AT, IMPORT_AT = '2026-10-02T09:00:00.000Z', FUTURE = '2099-01-01T00:00:00.000Z', PAST = '2000-01-01T00:00:00.000Z', BASELINE = 'rc44-s0-import-baseline.json';
const A = 'architect-a', B = 'architect-b', C = 'architect-c', D = 'architect-d', AGENT = 'agent-sol';
const clone = v => structuredClone(v), sha = t => createHash('sha256').update(t).digest('hex'), list = v => (Array.isArray(v) ? v : []);

// ------------------------------------------------------------------------------------------------ a package of the suite's own
// Registered through S0 as any package is: its records (stampsyn.records, Chapter 3) are read by the provenance reader
// (provenance.records) and stamped by the boundary (provenance.paths); a person confirms one, a second person accepts it.
const rows = p => p.stampsyn?.records || [];
function applyStampsyn(p, command, at, actor) {
  const raw = command.payload || {}, s = p.stampsyn ??= {counter: 0, records: []}, find = () => { const r = s.records.find(x => x.id === raw.id); if (!r) throw Error('Choose a stamped record.'); return r; };
  if (command.type === 'stampsyn.save') {
    let r = raw.id ? find() : null;
    if (!r) { r = {id: 'STS-' + String(++s.counter).padStart(3, '0'), revision: 0, history: []}; s.records.push(r); }
    Object.assign(r, {title: String(raw.title || 'A stamped record'), revision: r.revision + 1, actor}); r.history.push({revision: r.revision, actor, at});
    return {document: p, selected: r.id};
  }
  if (command.type === 'stampsyn.confirm') { const r = find(); r.confirmed = true; return {document: p, selected: r.id}; }
  if (command.type === 'stampsyn.accept') { const r = find(); r.acceptance = {actor, at}; return {document: p, selected: r.id}; }
  throw Error('Unknown stamped action.');
}
export const STAMPSYN = {id: 'zx-stamps',
  commands: {'stampsyn.save': {apply: applyStampsyn, staged: true}, 'stampsyn.confirm': {apply: applyStampsyn, person: true}, 'stampsyn.accept': {apply: applyStampsyn, second: (p, c) => rows(p).find(r => r.id === c.payload?.id) || null}},
  provenance: {nouns: {'stampsyn.records': 'stamped record'}, records: {'stampsyn.records': 3}, paths: {stampsyn: ['stampsyn.records']}}};
X.registerExtension(STAMPSYN);

// ------------------------------------------------------------------------------------------------ an imported document, in process
// The Bank Payment reference with stamps written by hand where the server writes them: three records a person wrote
// (dated after the import, before it, and with no date), a decision a second person confirmed (dated after), a component
// merged (prepared by A, merged by B, dated after), a draft by Sol a person confirmed, the narrative confirmed, a record
// of the suite's package, a crosswalk row of the knowledge package (provenance.paths) and a retired record.
export function stampedDocument() {
  const p = clone(R.reference('bank-payment')), by = (kind, who, at, extra = {}) => ({kind, by: who, ...(at ? {at} : {}), ...extra});
  const put = (r, pv) => { r.provenance = {...(r.provenance || {}), ...pv}; return r; };
  put(p.artefacts[0], {author: by('person', A, FUTURE)}); put(p.artefacts[1], {author: by('person', A, PAST)}); put(p.artefacts[2], {author: by('person', A, null)});
  p.decisions.records[0].confirmed = true; put(p.decisions.records[0], {author: by('person', A, FUTURE), reviewed: {by: B, at: FUTURE, how: 'confirmed'}});
  put(p.realisation.components[0], {author: by('person', A, FUTURE, {mergedBy: B}), reviewed: {by: B, at: FUTURE, how: 'merged'}});
  p.quality.drivers[0].confirmed = true; put(p.quality.drivers[0], {author: by('sol-draft', A, FUTURE), reviewed: {by: B, at: FUTURE, how: 'confirmed'}});
  p.finalReview.narrative.confirmed = true; put(p.finalReview.narrative, {reviewed: {by: A, at: FUTURE, how: 'confirmed'}});
  p.stampsyn = {counter: 1, records: [{id: 'STS-001', title: 'A stamped record', revision: 1, actor: A, history: [{revision: 1, actor: A, at: FUTURE}], provenance: {author: by('person', A, FUTURE)}}]};
  p.knowledge = {...clone(knowledgeState(p)), crosswalk: [{id: 'KA-0001', conceptId: 'SYN-P001', scheme: 'external', aliasId: 'Outbox', label: 'Outbox', relation: 'same', actor: A, revision: 1, history: [{revision: 1, actor: A, at: FUTURE}], provenance: {author: by('person', A, FUTURE)}}]};
  p.retired = {records: [{id: 'REQ-RET', path: 'artefacts', chapter: 1, index: 0, at: AT, actor: A, reason: 'Retired there.', priorState: 'authored', record: {id: 'REQ-RET', type: 'requirement', title: 'A retired requirement', provenance: {author: by('person', A, FUTURE), reviewed: {by: B, at: FUTURE, how: 'confirmed'}}}}]};
  return p;
}
// Where the stamps are, by [chapter, path, id], for every reader below.
const STAMPED = p => [[1, 'artefacts', p.artefacts[0].id], [1, 'artefacts', p.artefacts[1].id], [1, 'artefacts', p.artefacts[2].id], [3, 'decisions.records', p.decisions.records[0].id], [5, 'realisation.components', p.realisation.components[0].id], [2, 'quality.drivers', p.quality.drivers[0].id], [11, 'finalReview.narrative', 'narrative'], [3, 'stampsyn.records', 'STS-001']];
const at = (p, path, id) => (path === 'finalReview.narrative' ? p.finalReview.narrative : PV.listAt(p, path).find(r => r?.id === id));
// What the readers say of each stamped record: its author kind, its label, its review, whether a person confirmed it,
// the SDD's counts and people, and the review plan's steps.
function readers(p) {
  const q = rv.withFinalReview(clone(p), {upgrade: false}), s = PV.provenanceSummary(q);
  return {records: STAMPED(q).map(([chapter, path, id]) => { const r = at(q, path, id); return [path, id, PV.authorOf(r), PV.recordLabel(q, r, chapter), PV.reviewOf(q, r, chapter), PV.confirmedByPerson(q, r, chapter)]; }),
    summary: {byKind: s.byKind, reviewed: s.reviewed, writers: s.writers, reviewers: s.reviewers}, plan: reviewPlan(q).steps?.map(x => [x.kind, x.chapter, x.count ?? list(x.ids).length]) ?? null};
}
// A second person's step on the suite's package record, through the boundary (who stands behind it).
async function secondStep(p, id, actor) {
  const {extensionHandler} = await import('./design-extension-boundary.js'), h = extensionHandler('stampsyn.accept');
  try { h(rv.withFinalReview(clone(p), {upgrade: false}), {type: 'stampsyn.accept', payload: {id}}, AT, actor, {author: {kind: 'person', id: actor, account: 'person', reviewed: true}}); return 'taken'; } catch (e) { return e.message; }
}

if (process.argv.includes('--capture')) {
  // A project imported on the start commit: the stamps stay where they were and a date decides.
  const old = neutraliseImportedAuthority(stampedDocument(), IMPORT_AT, B);
  console.log(JSON.stringify({capturedFrom: process.argv[process.argv.indexOf('--capture') + 1] || 'working tree', importedAt: IMPORT_AT, document: old, digests: R.digests(old), readers: readers(old), second: {[C]: await secondStep(old, 'STS-001', C), [B]: await secondStep(old, 'STS-001', B)}}));
  process.exit(0);
}

// ------------------------------------------------------------------------------------------------ the server
function harness() {
  const files = new Map(), FILES = {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k)} : null; }, async delete(k) { files.delete(k); }};
  const env = {DB: localDatabase(':memory:'), FILES, ASSETS: {fetch: () => new Response('asset')}, AIW_AGENT_ACTORS: AGENT};
  const api = (path, method = 'GET', body = null, as = A) => { const headers = new Headers({'oai-authenticated-user-id': as}); if (body) { headers.set('Content-Type', 'application/json'); headers.set('Origin', 'https://aiw.test'); } return worker.fetch(new Request('https://aiw.test' + path, {method, headers, ...(body ? {body: JSON.stringify(body)} : {})}), env); };
  return {env, api, close: () => env.DB.close()};
}
// A project of `owner` with editors, read and written through the command route.
async function projectOf(h, owner, members, pid = null) {
  if (!pid) pid = (await (await h.api('/api/project', 'GET', null, owner)).json()).document.id;
  const q = '?project=' + encodeURIComponent(pid);
  for (const actorId of members) assert.equal((await h.api('/api/access' + q, 'POST', {actorId, role: 'editor'}, owner)).status, 200);
  let state = null; const read = async (as = owner) => (state = await (await h.api('/api/project' + q, 'GET', null, as)).json()), d = () => state.document;
  const send = async (type, payload, as = owner, extra = {}) => { const cur = await read(as), res = await h.api('/api/commands' + q, 'POST', {revision: cur.revision, command: {type, payload}, ...extra}, as), body = await res.json(); if (res.status === 200) state = body; return {status: res.status, body, error: body.error || ''}; };
  const ok = async (...args) => { const r = await send(...args); assert.equal(r.status, 200, args[0] + ' by ' + (args[2] || owner) + ': ' + JSON.stringify(r.body).slice(0, 300)); return r.body.selected; };
  return {pid, q, read, d, send, ok, owner};
}
// The origin project, through the commands: what each stamp says is the server's; the package then hand-edits the dates.
async function origin(h) {
  const o = await projectOf(h, A, [B, C, D, AGENT]), rec = id => rows(o.d()).find(r => r.id === id);
  const after = await o.ok('stampsyn.save', {title: 'Written by A, dated after the import'}, A);
  const before = await o.ok('stampsyn.save', {title: 'Written by A, dated before the import'}, A);
  const undated = await o.ok('stampsyn.save', {title: 'Written by A, with no date'}, A);
  const confirmed = await o.ok('stampsyn.save', {title: 'Written by A, confirmed by B'}, A); await o.ok('stampsyn.confirm', {id: confirmed}, B);
  const sol = await o.ok('stampsyn.save', {title: 'Drafted by Sol, confirmed by B'}, A, {authorKind: 'sol-draft'}); await o.ok('stampsyn.confirm', {id: sol}, B);
  // merged: prepared by A in an alternative, merged by B (the merge's stamp, ruling Y3)
  await o.read(A); const commands = [{type: 'stampsyn.save', payload: {title: 'Prepared by A, merged by B'}}];
  await o.ok('workspace.alternative', {commands, stamp: previewScenarioAlternative(o.d(), commands, undefined).stamp, title: 'An alternative', reason: 'Prepared for a merge.'}, A);
  await o.read(B); const alt = o.d().workbench.alternatives.at(-1);
  await o.ok('workspace.merge', {id: alt.id, stamp: rebaseWorkingAlternative(o.d(), alt).stamp, reviewed: true, reason: 'Merged by a person.'}, B);
  const merged = rows(o.d()).at(-1).id;
  assert.deepEqual([rec(merged).provenance.author.by, rec(merged).provenance.author.mergedBy, rec(merged).provenance.reviewed.how], [A, B, 'merged'], 'the origin stamps the merge');
  // the narrative, confirmed by A
  const n = o.d().finalReview.narrative; await o.ok('review.narrative', {title: n.title || 'Synthetic SDD', owner: 'Synthetic owner', audience: 'Synthetic audience', summary: 'A synthetic summary.', scope: 'A synthetic scope.', approach: 'A synthetic approach.', confirmed: true}, A);
  assert.equal(o.d().finalReview.narrative.provenance?.reviewed?.by, A, 'the narrative is confirmed by A');
  await o.read(A);
  const pack = clone(o.d()), r = id => rows(pack).find(x => x.id === id);
  r(after).provenance.author.at = FUTURE; r(before).provenance.author.at = PAST; delete r(undated).provenance.author.at;
  for (const id of [confirmed, sol]) { r(id).provenance.author.at = FUTURE; r(id).provenance.reviewed.at = FUTURE; }
  r(merged).provenance.author.at = FUTURE; r(merged).provenance.reviewed.at = FUTURE; pack.finalReview.narrative.provenance.reviewed.at = FUTURE;
  return {o, pack, ids: {after, before, undated, confirmed, sol, merged}};
}
async function restore(h, pack, as, name) {
  const preview = await h.api('/api/recovery?action=preview', 'POST', {package: pack}, as); assert.equal(preview.status, 200, JSON.stringify(await preview.clone().json()).slice(0, 300));
  const restored = await h.api('/api/recovery?action=restore', 'POST', {package: pack, hash: (await preview.json()).hash, name, reviewed: true}, as), made = await restored.json(); assert.equal(restored.status, 201, JSON.stringify(made).slice(0, 300));
  return made.id;
}
const NO_PERSON = id => new RegExp('needs two persons: no person other than \\S+ stands behind ' + id + ' as it stands');
const names = v => [A, B].filter(x => JSON.stringify(v).includes(x));

const cases = [], add = (name, run) => cases.push({name, run});

// ------------------------------------------------------------------------------------------------ I1 (Z8 through the server)
add('I1 (ruling Z8): through /api/recovery, every stamp a record carries is moved aside and names nobody here, whatever its date (after the import, before it, none), a merge\'s stamp and a confirmed narrative included; a signed-in person here confirms it and is the one named; then a second person takes the step', async () => {
  const h = harness();
  try {
    const {pack, ids} = await origin(h), rid = await restore(h, pack, B, 'Restored with stamps'), r = await projectOf(h, B, [A, C, D, AGENT], rid); await r.read(C);
    const was = id => rows(pack).find(x => x.id === id).provenance, rec = id => rows(r.d()).find(x => x.id === id);
    for (const [name, id] of Object.entries(ids)) {
      const pv = rec(id).provenance || {};
      assert.deepEqual([pv.author, pv.reviewed], [undefined, undefined], name + ': no stamp stands after the import');
      assert.deepEqual(pv.imported, {author: was(id).author, ...(was(id).reviewed ? {reviewed: was(id).reviewed} : {})}, name + ': the stamps are kept as history under provenance.imported');
      assert.equal(PV.reviewOf(r.d(), rec(id), 3), null, name + ': nobody reviewed it here'); assert.equal(PV.confirmedByPerson(r.d(), rec(id), 3), false);
      assert.deepEqual(names(PV.recordLabel(r.d(), rec(id), 3)), [], name + ': its label names nobody: ' + PV.recordLabel(r.d(), rec(id), 3));
    }
    assert.equal(PV.authorOf(rec(ids.sol)), 'sol-draft', 'a draft by Sol stays disclosed as Sol\'s'); assert.equal(PV.authorOf(rec(ids.after)), 'person', 'a person\'s words stay a person\'s, by nobody here');
    { const n = r.d().finalReview.narrative; assert.deepEqual([n.provenance?.reviewed, n.provenance?.imported?.reviewed?.by], [undefined, A]); assert.equal(PV.reviewOf(r.d(), n, 11), null); assert.equal(rv.narrativeCurrent(rv.withFinalReview(clone(r.d()))), false, 'the narrative is not confirmed here'); }
    { const s = PV.provenanceSummary(rv.withFinalReview(clone(r.d()))); assert.deepEqual([names(s.writers), names(s.reviewers)], [[], []], 'the SDD\'s people name nobody from elsewhere'); }
    // a second person's step: nobody stands behind any of them, whatever its date
    for (const [name, id] of Object.entries(ids)) { const x = await r.send('stampsyn.accept', {id}, D); assert.equal(x.status, 400, name + ' was accepted: ' + JSON.stringify(x.body).slice(0, 200)); assert.match(x.error, NO_PERSON(id), name); }
    // a person here confirms one, and is the one named; a second person then takes the step
    await r.ok('stampsyn.confirm', {id: ids.after}, C);
    assert.deepEqual([rec(ids.after).provenance.reviewed.by, rec(ids.after).provenance.reviewed.how, rec(ids.after).provenance.imported.author.by], [C, 'confirmed', A], 'the person here is named; the history is kept');
    assert.match(PV.recordLabel(r.d(), rec(ids.after), 3), new RegExp('confirmed by ' + C + '$')); assert.equal(PV.reviewOf(r.d(), rec(ids.after), 3).by, C);
    await r.ok('stampsyn.accept', {id: ids.after}, D); assert.equal(rec(ids.after).acceptance.actor, D);
    // the narrative, confirmed here
    { const n = r.d().finalReview.narrative; await r.ok('review.narrative', {title: n.title, owner: n.owner, audience: n.audience, summary: n.summary, scope: n.scope, approach: n.approach, confirmed: true}, C); assert.equal(PV.reviewOf(r.d(), r.d().finalReview.narrative, 11)?.by, C); }
  } finally { h.close(); }
});

// ------------------------------------------------------------------------------------------------ I2 (Z8: no imported stamp refuses anyone)
add('I2 (ruling Z8): four eyes and the second-person rule refuse nobody on account of an imported stamp: the merger elsewhere takes the second person\'s step once a person here stands behind the record; the writer elsewhere confirms under four eyes', async () => {
  const h = harness();
  try {
    const {pack, ids} = await origin(h), rid = await restore(h, pack, B, 'Restored with stamps'), r = await projectOf(h, B, [A, C, D, AGENT], rid), rec = id => rows(r.d()).find(x => x.id === id);
    // the merged record: C confirms it here; B, who merged it elsewhere (and wrote no revision of it), is no merger here
    await r.ok('stampsyn.confirm', {id: ids.merged}, C);
    assert.equal(verifierRefusal(rec(ids.merged), B, 'person'), null, 'verifierRefusal refuses nobody on account of an imported merge stamp');
    await r.ok('stampsyn.accept', {id: ids.merged}, B); assert.equal(rec(ids.merged).acceptance.actor, B);
    // four eyes on: A, the writer elsewhere, is nobody's author here, so A may confirm the record
    await r.ok('workspace.governance', {fourEyes: true, reason: 'Two persons for every review here.'}, B);
    await r.ok('stampsyn.confirm', {id: ids.before}, A); assert.deepEqual([rec(ids.before).provenance.reviewed.by, rec(ids.before).provenance.imported.author.by], [A, A]);
    // (four eyes still refuses a person who wrote the record here)
    await r.ok('stampsyn.save', {id: ids.undated, title: 'Written by C here'}, C);
    const x = await r.send('stampsyn.confirm', {id: ids.undated}, C); assert.equal(x.status, 400); assert.match(x.error, /^Four eyes: architect-c wrote/);
  } finally { h.close(); }
});

// ------------------------------------------------------------------------------------------------ I3 (Z8: every record path, before any early return)
add('I3 (ruling Z8): the import moves the stamps of every record path (the built-in collections, the narrative, the retired store, a package\'s collections through S0: provenance.records and provenance.paths) before any early return; a document holding no stamp gains no key; the import says it moved them', () => {
  const p = stampedDocument(), q = neutraliseImportedAuthority(clone(p), IMPORT_AT, B);
  for (const [, path, id] of STAMPED(p)) { const was = at(p, path, id).provenance, now = at(q, path, id).provenance; assert.deepEqual([now.author, now.reviewed], [undefined, undefined], path + ' ' + id); assert.deepEqual(now.imported, {...(was.author ? {author: was.author} : {}), ...(was.reviewed ? {reviewed: was.reviewed} : {})}, path + ' ' + id); }
  { const was = p.knowledge.crosswalk[0].provenance, now = q.knowledge.crosswalk[0].provenance; assert.deepEqual([now.author, now.imported], [undefined, {author: was.author}], 'a package\'s row (provenance.paths)'); }
  { const now = q.retired.records[0].record.provenance; assert.deepEqual([now.author, now.reviewed, now.imported.author.by, now.imported.reviewed.by], [undefined, undefined, A, B], 'a retired record'); }
  assert.ok(Number.isInteger(q.finalReview.imported.stamps) && q.finalReview.imported.stamps >= 10, 'the import says how many records\' stamps it kept aside: ' + q.finalReview.imported.stamps);
  // without finalReview (as wp9a's S1.16 calls it): the stamps move before the early return
  { const d = {artefacts: [{id: 'REQ-1', provenance: {author: {kind: 'person', by: A, at: FUTURE}}}], relationships: []}; neutraliseImportedAuthority(d, IMPORT_AT); assert.deepEqual(d.artefacts[0].provenance, {imported: {author: {kind: 'person', by: A, at: FUTURE}}}); }
  // a document with no stamp gains no key; a provenance that keeps other things keeps them
  { const d = clone(R.reference('bank-payment')); delete d.stampsyn; const before = JSON.stringify(PV.RECORD_PATHS.map(([path]) => PV.listAt(d, path).map(r => r?.provenance ?? null))); neutraliseImportedAuthority(d, IMPORT_AT); assert.equal(JSON.stringify(PV.RECORD_PATHS.map(([path]) => PV.listAt(d, path).map(r => r?.provenance ?? null))), before, 'no record gains a key'); assert.equal(d.finalReview.imported.stamps, 0); }
  { const d = {artefacts: [{id: 'REQ-1', provenance: {source: {kind: 'brief'}, author: {kind: 'import', by: A}}}], relationships: []}; neutraliseImportedAuthority(d, IMPORT_AT); assert.deepEqual(d.artefacts[0].provenance, {source: {kind: 'brief'}, imported: {author: {kind: 'import', by: A}}}); }
});

// ------------------------------------------------------------------------------------------------ I4 (Z8: the readers, whatever the dates)
add('I4 (ruling Z8): the readers read a kept stamp as nobody\'s whatever its dates: reviewOf, confirmedByPerson, the boundary\'s personBehind, verifierRefusal, the label, the SDD\'s counts and people, the review plan; the kept stamp is no content to a reading (that it survives a later save, case I1)', async () => {
  const q = neutraliseImportedAuthority(stampedDocument(), IMPORT_AT, B), R1 = readers(q);
  for (const [path, id, kind, label, review, confirmed] of R1.records) { assert.equal(review, null, path + ' ' + id + ': no review'); assert.equal(confirmed, false); assert.deepEqual(names(label), [], path + ' ' + id + ': ' + label); assert.ok(kind, path + ' ' + id + ' has an author kind'); }
  assert.deepEqual([names(R1.summary.writers), names(R1.summary.reviewers)], [[], []]);
  assert.equal(R1.summary.reviewed['sol-draft'], 0, 'the draft by Sol confirmed elsewhere is counted as not reviewed');
  assert.ok((R1.plan || []).length > 0, 'the review plan lists what nobody here reviewed');
  assert.match(await secondStep(q, 'STS-001', C), NO_PERSON('STS-001'), 'nobody stands behind the record here');
  assert.equal(verifierRefusal(PV.listAt(q, 'realisation.components')[0] && {...PV.listAt(q, 'realisation.components')[0], actor: A}, B, 'person'), null, 'no merger is named here');
  // the kept stamp is no content: a reading of the record is the reading it had with its stamps in place
  const {recordStamp} = await import('./public/source-fingerprint.js'), p = stampedDocument();
  for (const [, path, id] of STAMPED(p).filter(([, path]) => path !== 'finalReview.narrative')) assert.equal(recordStamp(q, at(q, path, id)), recordStamp(p, at(p, path, id)), path + ' ' + id + ': the import moves no reading of the record');
});

// ------------------------------------------------------------------------------------------------ I5 (Z8: old documents and the date)
add('I5 (ruling Z8): a project imported on the start commit reads exactly as there (every reading, every reader, the second person\'s step), and nothing moves on its read; the date is read for it alone, a known limit until its next import; the next import moves its stamps aside', async () => {
  if (!existsSync(BASELINE)) throw Error(BASELINE + ' is missing: capture it from the start commit.');
  const G = JSON.parse(readFileSync(BASELINE, 'utf8')), old = G.document;
  const now = R.digests(old); for (const k of Object.keys(G.digests)) assert.equal(now[k], G.digests[k], 'the reading “' + k + '” of a project imported before this build moved');
  assert.deepEqual(JSON.parse(JSON.stringify(readers(old))), G.readers, 'every reader reads it as on the start commit');
  for (const as of [C, B]) assert.equal(await secondStep(old, 'STS-001', as), G.second[as], 'the second person\'s step, as ' + as);
  { const read = rv.withFinalReview(clone(old)); assert.equal(JSON.stringify(STAMPED(read).map(([, path, id]) => at(read, path, id).provenance)), JSON.stringify(STAMPED(old).map(([, path, id]) => at(old, path, id).provenance)), 'no stamp moves on read'); assert.equal(read.finalReview.imported.stamps, undefined); }
  // its next import moves every stamp aside, and the date no longer decides
  const again = neutraliseImportedAuthority(clone(old), '2026-11-20T09:00:00.000Z', C);
  assert.equal(at(again, 'stampsyn.records', 'STS-001').provenance.imported.author.at, FUTURE); assert.match(await secondStep(again, 'STS-001', C), NO_PERSON('STS-001'));
});

// ------------------------------------------------------------------------------------------------ I6 (Z8: the same package imported twice)
add('I6 (ruling Z8): the same package imported twice reads the same twice; a project imported here and exported again keeps what it kept, and moves aside only what was written here since, under the same one key', async () => {
  const h = harness();
  try {
    const {pack, ids} = await origin(h), one = await restore(h, pack, B, 'Restored once'), two = await restore(h, pack, C, 'Restored twice');
    const r1 = await projectOf(h, B, [C, D], one), r2 = await projectOf(h, C, [B, D], two); await r1.read(); await r2.read();
    assert.deepEqual(rows(r2.d()).map(x => x.provenance), rows(r1.d()).map(x => x.provenance), 'the same stamps kept aside, twice');
    assert.deepEqual(readers(r2.d()).records.filter(x => x[0] === 'stampsyn.records'), readers(r1.d()).records.filter(x => x[0] === 'stampsyn.records'));
    // a person here confirms one; the project is exported and imported again
    await r1.ok('stampsyn.confirm', {id: ids.before}, C); await r1.read();
    const again = await restore(h, clone(r1.d()), D, 'Restored again'), r3 = await projectOf(h, D, [], again); await r3.read();
    const kept = rows(r3.d()).find(x => x.id === ids.after).provenance, moved = rows(r3.d()).find(x => x.id === ids.before).provenance;
    assert.deepEqual(kept, rows(r1.d()).find(x => x.id === ids.after).provenance, 'what the first import kept stays as it was');
    assert.deepEqual([moved.reviewed, moved.imported.reviewed.by, moved.imported.earlier.author.by], [undefined, C, A], 'what was written here since is kept aside too, the earlier history under it');
  } finally { h.close(); }
});

// ------------------------------------------------------------------------------------------------ I7 (Z8: one path)
add('I7 (ruling Z8): the date comparison is retired as the import\'s guard: the provenance reader and the boundary read the import\'s date only for a project imported before this build (provenance.js historicalReview, design-extension-boundary.js personBehind); the template copy\'s date stays the guard of a copy (ruling F3)', () => {
  const pv = readFileSync('public/provenance.js', 'utf8'), b = readFileSync('design-extension-boundary.js', 'utf8');
  assert.match(pv, /const historicalReview=\(p,at\)=>datedImport\(p\)&&/, 'historicalReview reads the date only for a project imported before this build');
  assert.match(pv, /export const datedImport=p=>/, 'one statement of which import is dated');
  assert.ok(/datedImport\(p\)\s*\?\s*p\.finalReview\.imported\.at/.test(b), 'the boundary\'s personBehind reads the import\'s date only for such a project');
  assert.ok(b.includes('p?.workspace?.templateOrigin?.at'), 'the template copy keeps its date (ruling F3)');
});

// ------------------------------------------------------------------------------------------------ the runner
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : '';
const passed = [], failed = [];
for (const c of cases) {
  if (only && !c.name.includes(only)) continue;
  try { await c.run(); passed.push(c.name); console.log('PASS', c.name); }
  catch (e) { const line = String(e?.message || e).split('\n')[0].slice(0, 700); failed.push({name: c.name, error: line}); console.log('FAIL', c.name, '\n   ', line); }
}
if (!passed.length && !failed.length) failed.push({name: only ? '--only ' + only : 'the run', error: 'No case was executed: a run that executes nothing is not a pass.'});
console.log(JSON.stringify({suite: 'rc44-s0-import', passed: passed.length, failed: failed.length, failures: failed}));
if (failed.length) process.exit(1);
console.log('PASS rc44 S0-import: ' + passed.length + ' cases. Synthetic identities and fixtures only; the suite reads no clock.');
