// Readings as fingerprints (round 12, D-04). A record that reads requirements and other records keeps their ids and a
// fingerprint of what it read, never a copy (public/source-fingerprint.js), and a document written with copies is
// upgraded on read (public/readings-upgrade.js). Held here four ways:
//   1. the conversion: a copy and the fingerprint of the same reading become the same value; a copy that no longer
//      matched its sources stays unmatched; a fingerprint is left alone; a malformed copy never matches;
//   2. backward: documents that rc.10.73.16 wrote (evaluation/legacy-readings.json.br, built by
//      scripts/build-legacy-readings-fixture.mjs) say exactly what that code said about them once upgraded — every
//      chapter's findings and milestones, every source-change judgement, every affected record's state, every review,
//      trace, disposition, action, analysis and frozen baseline still current or not — in memory, through a stored row
//      read by /api/project (the first read stores the upgrade once, as a storage upgrade recorded in the activity, the
//      row shrinks and the version it upgraded reads back whole from its recovery point: round 12, PS-15), and through
//      an rc.10.73.16 recovery package restored by /api/recovery;
//   3. forward: from the reference journey, through a sequence of edits, every source-change judgement of Chapters 2–7
//      (and every conflict's) equals the judgement rc.10.73.16 would make with its copies — computed here by its own
//      formulas over copies kept beside the document, of the records' content (readings definition 2, round 12 UX-02:
//      review and confirmation state are not read) — and each kept fingerprint is the fingerprint of that copy; a
//      confirmation alone changes no judgement, where rc.10.73.16's copies of whole records would have;
//   4. the upgrade is deterministic and idempotent, and keeps nothing it would convert again.
// Run: npm run test:fingerprint
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {brotliDecompressSync} from 'node:zlib';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {saveStoredProject, readStoredProject} from './project-storage.js';
import {readRecoveryPoint} from './storage-upgrade.js';
import {createProject, templateEvidence} from './shared/projects-domain.js';
import {isBlankProject, projectNodes, projectScenarios} from './public/model-scope.js';
import {nodes as referenceNodes} from './public/model.js';
import {readingJudgements} from './fingerprint-fixtures.mjs';
import {textFingerprint, valueFingerprint, isFingerprint, qualityReading, conflictReading, decisionReading, logicalReading, componentReading, readContent, withReadingsDefinition, READINGS_DEFINITION} from './public/source-fingerprint.js';
import {readingOf, isCopy} from './public/reading-copies.js';
import {needsReadingsUpgrade, upgradeReadings} from './public/readings-upgrade.js';
import * as review from './public/review-domain.js';
import * as quality from './public/quality-domain.js';
import * as decisions from './public/decisions-domain.js';
import * as logical from './public/logical-domain.js';
import * as realisation from './public/realisation-domain.js';
import * as technology from './public/technology-domain.js';
import * as techrealisation from './public/technology-realisation-domain.js';
import * as changes from './public/changes-domain.js';
import * as guidance from './public/guidance-record.js';
import * as memo from './public/document-memo.js';
import {seedProject, applyCommand} from './public/requirements-domain.js';
import {applyRequirementsCommand} from './public/requirement-commands.js';

const M = {review, quality, decisions, logical, realisation, technology, techrealisation, changes, guidance, memo};
const checks = [], pass = name => { checks.push(name); console.log('PASS', name); };
const sig = JSON.stringify, at = '2026-10-07T12:00:00.000Z';
// New chapter rules can add findings to a historical design without changing the meaning of a stored reading.
// Hold the original fixture's reading and change judgments, and compare every current judgment before/after upgrade.
const historicalReading = x => ({readings: x.readings, changes: x.changes, changeSummary: x.changeSummary});

// ---------------------------------------------------------------- 1. the conversion
{
  const art = {id: 'REQ-9', type: 'requirement', title: 'A requirement', acceptance: 'Given, when, then.'};
  assert.match(textFingerprint('abc'), /^fp1:3:[0-9a-f]+:[0-9a-f]+$/);
  assert.equal(valueFingerprint(art), textFingerprint(sig(art)), 'a value is fingerprinted by its JSON text');
  assert.equal(valueFingerprint(null), textFingerprint('null'), 'a missing record reads as null');
  // A quality scenario's copy {id: JSON text} becomes {id: fingerprint of that text}, in the same order.
  const copy = {'REQ-9': sig(art), 'REQ-1': 'null'};
  assert.deepEqual(qualityReading(copy), {'REQ-9': valueFingerprint(art), 'REQ-1': valueFingerprint(null)});
  assert.deepEqual(Object.keys(qualityReading(copy)), ['REQ-9', 'REQ-1'], 'the order of the names is kept');
  const converted = qualityReading(copy);
  assert.equal(qualityReading(converted), converted, 'a fingerprint reading is left as it is (the same object)');
  // A driver copy inside a decision or a conflict is read with its own reading converted.
  const driver = {id: 'QD-9', title: 'A driver', requirementIds: ['REQ-9'], sourceSnapshot: copy, rank: 1};
  const modern = {...driver, sourceSnapshot: qualityReading(copy)};
  assert.deepEqual(conflictReading({'QD-9': sig(driver)}), {'QD-9': valueFingerprint(modern)}, 'a conflict reads its driver as the driver reads now');
  assert.deepEqual(decisionReading({requirements: {'REQ-9': sig(art)}, drivers: {'QD-9': sig(driver)}}), {requirements: {'REQ-9': valueFingerprint(art)}, drivers: {'QD-9': valueFingerprint(modern)}});
  // A responsibility's and a component's copy is one JSON text; it becomes one fingerprint over fingerprints.
  const dec = {id: 'ADR-1', revision: 2, status: 'draft', selected: null, rationale: ''};
  const lr = sig({requirements: [art, null], drivers: [driver], decisions: [dec]});
  assert.equal(logicalReading(lr), valueFingerprint({requirements: [valueFingerprint(art), valueFingerprint(null)], drivers: [valueFingerprint(modern)], decisions: [dec]}));
  const comp = sig({logical: [{id: 'LR-1', changed: false}], mappings: [], requirements: [art], drivers: [driver], decisions: [dec]});
  assert.equal(componentReading(comp), valueFingerprint({logical: [{id: 'LR-1', changed: false}], mappings: [], requirements: [valueFingerprint(art)], drivers: [valueFingerprint(modern)], decisions: [dec]}));
  // By field and shape, readingOf converts each kind and leaves Chapters 6–10's readings alone.
  assert.equal(readingOf(lr), logicalReading(lr)); assert.equal(readingOf(comp), componentReading(comp));
  assert.deepEqual(readingOf(copy), qualityReading(copy)); assert.deepEqual(readingOf({'QD-9': sig(driver)}, 'driverSnapshot'), conflictReading({'QD-9': sig(driver)}));
  for (const kept of ['fp1:4:a:b', '[1,2,3]', '{"caps":[],"technology":1}', undefined, null]) assert.equal(readingOf(kept), kept, 'left alone: ' + kept);
  // A malformed copy, or one of an unknown shape, never matches a reading taken now.
  for (const bad of ['{"requirements":[', sig({requirements: {}, drivers: []}), sig({logical: [], requirements: []}), sig({requirements: [], drivers: [], decisions: [], more: []})]) assert.ok(!/^fp1:\d+:/.test(readingOf(bad)), 'an unreadable copy never matches: ' + bad);
  assert.ok(readingOf('{"requirements":[').startsWith('fp1:kept:') && readingOf(sig({logical: [], requirements: []})).startsWith('fp1:kept:'));
  assert.ok(decisionReading({requirements: {}, drivers: {}, extra: 1}).startsWith('fp1:kept:'));
  assert.ok(qualityReading({'REQ-1': {not: 'a text'}})['REQ-1'].startsWith('fp1:kept:'));
  assert.equal(isCopy(copy), true); assert.equal(isCopy(converted), false); assert.equal(isCopy(lr), true); assert.equal(isCopy(logicalReading(lr)), false); assert.equal(isCopy({}), false);
  pass('a copy and the fingerprint of the same reading convert to the same value, in the same order; a fingerprint and Chapters 6–10\'s readings are left alone; a malformed copy never matches a reading taken now');
}

// ---------------------------------------------------------------- 2. backward: what rc.10.73.16 said about its documents
const fixture = JSON.parse(brotliDecompressSync(readFileSync('evaluation/legacy-readings.json.br')).toString('utf8'));
assert.equal(fixture.schema, 'aiw.legacy-readings-fixture.v1');
const readingFields = p => { const out = []; for (const [list, field] of [[p.quality.drivers, 'sourceSnapshot'], [p.quality.conflicts, 'driverSnapshot'], [p.decisions.records, 'sourceSnapshot'], [p.logical.responsibilities, 'sourceSnapshot'], [p.realisation.components, 'sourceSnapshot']]) for (const r of list) out.push(r[field]); return out; };
const allFingerprints = p => readingFields(p).every(v => typeof v === 'string' ? isFingerprint(v) : Object.values(v.requirements && v.drivers ? {...v.requirements, ...v.drivers} : v).every(isFingerprint));
for (const state of fixture.states.filter(s => s.document)) {
  const doc = state.document;
  assert.ok(needsReadingsUpgrade(doc), state.name + ': the fixture keeps copies');
  const t = performance.now(), up = review.withFinalReview(structuredClone(doc)), ms = Math.round(performance.now() - t);
  assert.ok(!needsReadingsUpgrade(up) && allFingerprints(up), state.name + ': every reading is a fingerprint after the upgrade');
  const said = withReadingsDefinition(1, () => readingJudgements(M, doc));
  assert.deepEqual(historicalReading(said), historicalReading(state.expected), state.name + ': old source-change and change-journal judgments hold');
  assert.deepEqual(readingJudgements(M, up), said, state.name + ': all current judgments are identical before and after upgrading readings');
  assert.equal(sig(review.withFinalReview(structuredClone(doc))), sig(up), state.name + ': the upgrade is deterministic');
  assert.equal(sig(review.withFinalReview(up)), sig(up), state.name + ': an upgraded document passes through unchanged');
  assert.equal(upgradeReadings(up), up, state.name + ': nothing is left to convert');
  assert.ok(sig(up).length < sig(doc).length, state.name + ': the document is smaller');
  // A frozen baseline is left exactly as it was frozen.
  assert.deepEqual(up.finalReview.baselines, doc.finalReview.baselines, state.name + ': frozen baselines are untouched');
  pass(`${state.name}: upgraded in memory in ${ms} ms, source-change judgments agree with rc.10.73.16 and all current findings agree before/after upgrade; deterministic, idempotent, ${sig(doc).length} → ${sig(up).length} characters, frozen baselines untouched`);
}
const dir = await mkdtemp(tmpdir() + '/aiw-fingerprint-'), env = {DB: localDatabase(dir + '/f.sqlite'), FILES: localFiles(dir + '/files'), ASSETS: {fetch: () => new Response('ok')}};
const ACTOR = 'fingerprint-architect', origin = 'https://aiw.test';
const api = async (route, body, actor = ACTOR) => { const r = await worker.fetch(new Request(origin + route, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': actor, Origin: origin, ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env); const text = await r.text(); return {status: r.status, data: JSON.parse(text)}; };
const row = (id, owner = ACTOR) => env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner, id).first();
try {
  // A row as rc.10.73.16 stored it: read through /api/project it is upgraded, and stays as it was until the next save.
  // States A and B are one project at two moments: each is stored for an owner of its own.
  for (const [n, state] of fixture.states.filter(s => s.document).entries()) {
    const doc = structuredClone(state.document), id = doc.id, owner = ACTOR + '-' + n;
    const before = withReadingsDefinition(1, () => readingJudgements(M, doc));
    await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind(owner, id, JSON.stringify(createProject({name: doc.name, template: 'blank'}, id, at)), at).run();
    await saveStoredProject(env, owner, id, doc, 1, at, new Map());
    const stored = await row(id, owner);
    assert.ok(needsReadingsUpgrade(JSON.parse(stored.document)), state.name + ': the stored row keeps copies');
    const previous = JSON.stringify((await readStoredProject(env, owner, stored.document)).document);
    const read = await api('/api/project?project=' + id, null, owner);
    assert.equal(read.status, 200);
    assert.deepEqual(readingJudgements(M, review.withFinalReview(read.data.document)), before, state.name + ': a stored row reads with the same current judgments');
    // The first read stores the upgrade (round 12, PS-15: storage-upgrade.js), once, as a storage upgrade in the project's
    // activity; the version it upgraded is kept for recovery and reads back whole.
    const upgraded = await row(id, owner);
    assert.equal(upgraded.revision, stored.revision + 1, state.name + ': the read stored the upgrade as a new revision'); assert.equal(read.data.revision, upgraded.revision);
    assert.ok(!needsReadingsUpgrade(JSON.parse(upgraded.document)), state.name + ': the stored row keeps fingerprints');
    assert.ok(upgraded.document.length < stored.document.length * 0.6, `${state.name}: the stored row shrank (${stored.document.length} → ${upgraded.document.length} characters)`);
    const storage = async () => (await env.DB.prepare('SELECT document FROM project_activity WHERE owner_id=? AND project_id=?').bind(owner, id).all()).results.map(r => JSON.parse(r.document)).filter(a => a.kind === 'storage');
    const recorded = await storage();
    assert.equal(recorded.length, 1, state.name + ': recorded once in the activity'); assert.equal(recorded[0].fromRevision, stored.revision);
    const recovered = await readRecoveryPoint(env, owner, id, recorded[0].recoveryPoint);
    assert.equal(recovered.revision, stored.revision); assert.equal(JSON.stringify(recovered.document), previous, state.name + ': the version it upgraded reads back whole from its recovery point');
    const reread = await api('/api/project?project=' + id, null, owner);
    assert.equal(reread.data.revision, upgraded.revision); assert.equal((await row(id, owner)).document, upgraded.document, state.name + ': the next read writes nothing'); assert.equal((await storage()).length, 1);
    // A save after it: a pinned diagram position is a workspace preference.
    const node = (await import('./public/notation-model.js')).notationDiagram(read.data.document, 'process').nodes[0];
    const saved = await api('/api/commands?project=' + id, {revision: read.data.revision, command: {type: 'workspace.diagram-arrangement', payload: {chapter: 1, scene: 'process', arrangement: 'tree', pins: {[node.id]: {x: 10, y: 20}}, revision: 0}}}, owner);
    assert.equal(saved.status, 200, JSON.stringify(saved.data).slice(0, 300));
    const after = await row(id, owner);
    assert.ok(!needsReadingsUpgrade(JSON.parse(after.document)), state.name + ': the save keeps the upgrade');
    assert.ok(await readRecoveryPoint(env, owner, id, recorded[0].recoveryPoint), state.name + ': the recovery point is kept by later saves');
    const again = await api('/api/project?project=' + id, null, owner);
    assert.deepEqual(readingJudgements(M, review.withFinalReview(again.data.document)), before, state.name + ': a second read keeps all judgments');
    pass(`${state.name}: a row stored with copies reads as rc.10.73.16 read it; the first read stores the upgrade once (${stored.document.length} → ${upgraded.document.length} characters), recorded in the activity, the version it upgraded kept and read back whole from its recovery point; later reads write nothing and the judgements hold`);
  }
  // A recovery package rc.10.73.16 exported restores, and says what rc.10.73.16 said after its own restore.
  for (const state of fixture.states.filter(s => s.recovery)) {
    const preview = await api('/api/recovery?action=preview', {package: state.recovery});
    assert.equal(preview.status, 200, JSON.stringify(preview.data).slice(0, 300));
    const restored = await api('/api/recovery?action=restore', {package: state.recovery, hash: preview.data.hash, name: 'Legacy readings fixture · restored', reviewed: true});
    assert.equal(restored.status, 201, JSON.stringify(restored.data).slice(0, 300));
    const stored = await row(restored.data.id);
    assert.ok(!needsReadingsUpgrade(JSON.parse(stored.document)), state.name + ': the restored row keeps fingerprints');
    const read = await api('/api/project?project=' + restored.data.id);
    assert.deepEqual(historicalReading(readingJudgements(M, review.withFinalReview(read.data.document))), historicalReading(state.expectedRestored), state.name + ': restored source-change judgments still say what rc.10.73.16 said');
    // An rc.10.73.16 project export (the document alone) restores too.
    const bare = structuredClone(state.recovery.project), p2 = await api('/api/recovery?action=preview', {package: bare});
    assert.equal(p2.status, 200);
    const r2 = await api('/api/recovery?action=restore', {package: bare, hash: p2.data.hash, name: 'Legacy export · restored', reviewed: true});
    assert.equal(r2.status, 201);
    assert.ok(!needsReadingsUpgrade(JSON.parse((await row(r2.data.id)).document)));
    pass(`${state.name}: the rc.10.73.16 recovery package and the bare project export restore through /api/recovery, are stored with fingerprints, and the restored project says what rc.10.73.16 said of its own restore`);
  }
  // A document stored without a template (round 12, A3: GR-DOM-15). Documents written before templates existed were all
  // the Bank Payment reference, and the reads defaulted to it: a document from elsewhere without the field was read as
  // the reference and seeded with its payment model. The storage upgrade now stamps the template from the document's own
  // evidence (the reference's records it holds): one without that evidence reads as blank, never seeded; one holding
  // the reference's records reads as the reference, as it always has.
  {
    const owner = ACTOR + '-template', foreign = createProject({name: 'Stored without a template', template: 'blank'}, 'project-without-template', at);
    delete foreign.workspace.template;
    foreign.artefacts.push({id: 'REQ-900', type: 'requirement', title: 'Record the parcel hand-over at the depot', description: 'Synthetic record of a document made elsewhere.', priority: 'Must', origin: 'import', confirmed: false, scopeMode: 'in', order: 0, modelRef: ''});
    assert.equal(isBlankProject(foreign), false, 'before round 12 a document without a template read as the reference');
    await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind(owner, foreign.id, JSON.stringify(foreign), at).run();
    const read = await api('/api/project?project=' + foreign.id, null, owner);
    assert.equal(read.status, 200); assert.equal(read.data.revision, 2, 'the first read stores the upgrade');
    assert.equal(read.data.document.workspace.template, 'blank', 'stamped blank from its own evidence');
    assert.equal(isBlankProject(read.data.document), true); assert.deepEqual(projectScenarios(read.data.document), ['success']);
    const ids = new Set(referenceNodes.map(n => n.id));
    assert(!projectNodes(read.data.document).some(n => ids.has(n.id)), 'and never seeded with the reference\'s payment model');
    assert.equal(JSON.parse((await row(foreign.id, owner)).document).workspace.template, 'blank', 'the stamp is stored');
    const recorded = (await env.DB.prepare('SELECT document FROM project_activity WHERE owner_id=? AND project_id=?').bind(owner, foreign.id).all()).results.map(r => JSON.parse(r.document)).filter(a => a.kind === 'storage');
    assert.equal(recorded.length, 1, 'recorded once in the activity');
    const before = await readRecoveryPoint(env, owner, foreign.id, recorded[0].recoveryPoint);
    assert.equal(before.revision, 1); assert.equal(before.document.workspace.template, undefined, 'the row it replaced reads back whole from its recovery point');
    const listed = await api('/api/projects', null, owner);
    assert.equal(listed.data.projects.find(p => p.id === foreign.id).template, 'blank', 'and listed as blank');
    // The reference stored without a template holds its records: it reads as the reference, without an upgrade.
    const reference = review.withFinalReview(seedProject()); reference.id = 'project-reference-without-template';
    assert.equal(templateEvidence(reference), 'bank-payment');
    await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind(owner, reference.id, JSON.stringify(reference), at).run();
    const ref = await api('/api/project?project=' + reference.id, null, owner);
    assert.equal(ref.data.revision, 1); assert.equal(isBlankProject(ref.data.document), false, 'the reference reads as the reference');
    pass('a document stored without a template: one without the reference\'s records is stamped blank by the storage upgrade (recorded once, the replaced row kept in its recovery point) and reads as blank, never seeded with the payment model; the reference stored without one still reads as the reference');
  }
} finally { env.DB.close(); await rm(dir, {recursive: true, force: true}); }

// ---------------------------------------------------------------- 2b. readings of whole records (definition 1)
// A document written while readings read whole records (D-04 as first written: the reference journey edited, two
// requirements confirmed and a driver's target confirmed) says, once upgraded to readings of content, exactly what it said.
{
  const doc1 = withReadingsDefinition(1, () => {
    let x = review.withFinalReview(seedProject(), {upgrade: false});
    const run = (apply, type, payload) => { x = review.withFinalReview(apply(x, {type, payload}, at).document, {upgrade: false}); };
    const r = id => x.artefacts.find(a => a.id === id);
    run(applyCommand, 'artefact', {...r('REQ-001'), acceptance: r('REQ-001').acceptance + ' Kept with its reference.'});
    run(applyCommand, 'artefact', {...r('REQ-002'), confirmed: true});
    run(quality.applyQualityCommand, 'quality.driver', {...x.quality.drivers[0]});
    run(applyCommand, 'artefact', {...r('REQ-003'), confirmed: true});
    run(applyCommand, 'artefact', {...r('REQ-005'), title: r('REQ-005').title + ' (revised)'});
    run(logical.applyLogicalCommand, 'logical.responsibility', {...x.logical.responsibilities[0]});
    return x;
  });
  delete doc1.readingsDefinition;
  const said = withReadingsDefinition(1, () => readingJudgements(M, doc1));
  assert.ok(needsReadingsUpgrade(doc1), 'a document of whole-record readings is upgraded');
  const up = upgradeReadings(structuredClone(doc1));
  assert.equal(up.readingsDefinition, READINGS_DEFINITION);
  assert.deepEqual(readingJudgements(M, up), said, 'the upgraded document says what it said under readings of whole records');
  assert.equal(sig(upgradeReadings(structuredClone(doc1))), sig(up), 'deterministic');
  assert.equal(upgradeReadings(up), up, 'nothing left to upgrade');
  assert.equal(sig(review.withFinalReview(structuredClone(up))), sig(review.withFinalReview(structuredClone(up))), 'an upgraded document passes through unchanged');
  pass('a document whose readings read whole records (definition 1) says exactly what it said once upgraded to readings of content (' + Object.keys(said).length + ' judgements); the upgrade is deterministic and idempotent');
}

// ---------------------------------------------------------------- 3. forward: rc.10.73.16's judgements, from its copies
// The copies rc.10.73.16 kept, by its own formulas, beside the document: a record's copy is taken when its kept
// reading is written, and its judgement compares the copy with the copy it would take now.
const art = (p, id) => p.artefacts.find(a => a.id === id) || null;
const shadow = new Map(), key = (kind, id) => kind + ':' + id;
// What a reading reads of a record: its content, without review state (definition 2), or the whole record (definition 1).
let whole = false;
const C = r => r && !whole ? readContent(r) : r;
const legacyDriver = d => ({...C(d), sourceSnapshot: shadow.get(key('driver', d.id))});
const legacy = {
  driver: (p, d) => Object.fromEntries(d.requirementIds.map(id => [id, sig(C(art(p, id)))])),
  conflict: (p, c) => Object.fromEntries(c.driverIds.map(id => { const d = p.quality.drivers.find(x => x.id === id); return [id, sig(d ? legacyDriver(d) : null)]; })),
  decision: (p, d) => ({requirements: Object.fromEntries(d.requirementIds.map(id => [id, sig(C(art(p, id)))])), drivers: Object.fromEntries(d.driverIds.map(id => { const x = p.quality.drivers.find(q => q.id === id); return [id, sig(x ? legacyDriver(x) : null)]; }))}),
  responsibility: (p, r) => sig({requirements: r.requirementIds.map(id => C(art(p, id))), drivers: logical.driversForResponsibility(p, r).map(legacyDriver), decisions: r.decisionIds.map(id => { const d = p.decisions.records.find(x => x.id === id); return d ? {id: d.id, revision: d.revision, status: d.status, selected: d.selectedAlternativeId, rationale: d.rationale} : null; })}),
  component: (p, c) => { const s = realisation.componentSources(p, c.id); return sig({logical: s.logical.map(r => ({id: r.id, title: r.title, purpose: r.purpose, boundary: r.boundary, requirements: r.requirementIds, decisions: r.decisionIds, changed: oracle.responsibility(p, r)})), mappings: realisation.allocations(p, c.id).map(m => ({id: m.id, logicalId: m.logicalId, scope: m.scope, current: logical.mappingCurrent(p, m)})), requirements: s.requirements.map(C), drivers: s.drivers.map(legacyDriver), decisions: s.decisions.map(d => ({id: d.id, revision: d.revision, status: d.status, rationale: d.rationale, selected: d.selectedAlternativeId}))}); }
};
const oracle = {
  driver: (p, d) => sig(shadow.get(key('driver', d.id)) || {}) !== sig(legacy.driver(p, d)),
  conflict: (p, c) => c.status === 'resolved' && !!c.resolution?.trim() && !!c.owner?.trim() && sig(shadow.get(key('conflict', c.id)) || {}) === sig(legacy.conflict(p, c)),
  decision: (p, d) => sig(shadow.get(key('decision', d.id))) !== sig(legacy.decision(p, d)),
  responsibility: (p, r) => shadow.get(key('responsibility', r.id)) !== legacy.responsibility(p, r),
  component: (p, c) => shadow.get(key('component', c.id)) !== legacy.component(p, c)
};
const kinds = [['driver', p => p.quality.drivers, 'sourceSnapshot', quality.sourceChanged], ['conflict', p => p.quality.conflicts, 'driverSnapshot', quality.conflictIsResolved], ['decision', p => p.decisions.records, 'sourceSnapshot', decisions.decisionSourceChanged], ['responsibility', p => p.logical.responsibilities, 'sourceSnapshot', logical.logicalSourceChanged], ['component', p => p.realisation.components, 'sourceSnapshot', realisation.componentSourceChanged]];
const kept = p => new Map(kinds.flatMap(([kind, list, field]) => list(p).map(r => [key(kind, r.id), sig(r[field])])));
// After a command: every record whose kept reading was written takes rc.10.73.16's copy of the document as it is now
// (drivers first: the other copies read the drivers' copies), then each judgement is compared and each kept
// fingerprint is the fingerprint of the copy.
let p = review.withFinalReview(seedProject()), judged = 0, steps = 0;
const settle = (before, label) => {
  const now = kept(p);
  for (const [kind, list] of kinds) for (const r of list(p)) { const k = key(kind, r.id); if (!before || before.get(k) !== now.get(k)) shadow.set(k, legacy[kind](p, r)); }
  for (const [kind, list, field, judge] of kinds) for (const r of list(p)) {
    assert.equal(judge(p, r), oracle[kind](p, r), `${label}: ${kind} ${r.id} is judged as rc.10.73.16 judged it`);
    assert.deepEqual(readingOf(shadow.get(key(kind, r.id)), field), r[field], `${label}: ${kind} ${r.id} keeps the fingerprint of rc.10.73.16's copy`);
    judged++;
  }
  steps++;
};
settle(null, 'the reference journey');
const step = (label, apply, type, payload) => { const before = kept(p); p = review.withFinalReview(apply(p, {type, payload}, at).document); settle(before, label); };
const req = id => art(p, id), driverOf = id => p.quality.drivers.find(d => d.id === id), decisionOf = id => p.decisions.records.find(d => d.id === id), lrOf = id => p.logical.responsibilities.find(r => r.id === id);
step('a requirement edited', applyCommand, 'artefact', {...req('REQ-001'), acceptance: req('REQ-001').acceptance + ' The outcome keeps the reference.'});
const changedNow = () => kinds.flatMap(([kind, list, , judge]) => list(p).filter(r => kind !== 'conflict' && judge(p, r)).map(r => kind + ' ' + r.id));
const staleAfterEdit = changedNow();
assert.ok(staleAfterEdit.some(x => x.startsWith('driver')) && staleAfterEdit.some(x => x.startsWith('responsibility')) && staleAfterEdit.some(x => x.startsWith('component')), 'the edit leaves drivers, responsibilities and components to review: ' + staleAfterEdit.join(', '));
step('a second requirement edited', applyCommand, 'artefact', {...req('REQ-003'), title: req('REQ-003').title + ' (revised)'});
step('a requirement added', applyCommand, 'artefact', {type: 'requirement', title: 'Record a refund with its reference', description: 'A refund is recorded once with its original reference.', acceptance: 'Given a refund, when it repeats, then the first outcome returns.', owner: 'Payments team', source: 'Fixture brief', priority: 'Should', confirmed: false});
const added = p.artefacts.at(-1).id;
const [qd1, qd2] = p.quality.drivers.map(d => d.id);
step('a conflict resolved', quality.applyQualityCommand, 'quality.conflict', {driverIds: [qd1, qd2], title: 'Checks and response time', effect: 'Checks add latency.', owner: 'Architecture lead', resolution: 'Measure under load.', status: 'resolved'});
step('a driver re-saved, its reading taken again', quality.applyQualityCommand, 'quality.driver', {...driverOf(qd1)});
step('a driver linked to the new requirement', quality.applyQualityCommand, 'quality.driver', {...driverOf(qd2), requirementIds: [...driverOf(qd2).requirementIds, added]});
step('a driver added', quality.applyQualityCommand, 'quality.driver', {category: 'integrity', title: 'Record each refund once', priority: 'Critical', operator: 'At most', targetValue: '0', metric: 'Duplicate refunds', unit: 'refunds', stimulus: 'A refund repeats', conditions: 'Normal operation', response: 'The first outcome returns', window: 'Per refund', measurement: 'Reconcile refunds', rationale: 'A second refund loses money.', owner: 'Quality owner', source: 'Fixture brief', requirementIds: [added], responsibilityIds: [p.logical.responsibilities[0].id]});
const qd3 = p.quality.drivers.at(-1).id;
const adr = p.decisions.records[0];
step('a decision revised', decisions.applyDecisionCommand, 'decision.save', {...adr, rationale: 'Bind the reference to the recorded outcome.', driverIds: [...adr.driverIds, qd3], requirementIds: [...adr.requirementIds, added]});
step('a decision added', decisions.applyDecisionCommand, 'decision.save', {question: 'Where is a refund recorded once?', context: 'A repeated refund must not pay twice.', topic: 'custom', requirementIds: [added], driverIds: [qd3], owner: 'Architecture lead', rationale: '', assumptions: '', risks: '', mitigation: '', source: 'Fixture workshop'});
const adr2 = p.decisions.records.at(-1).id;
step('the driver in the conflict renamed', quality.applyQualityCommand, 'quality.driver', {...driverOf(qd2), title: driverOf(qd2).title + ' (renamed)'});
const lr1 = p.logical.responsibilities[0];
step('a responsibility re-saved', logical.applyLogicalCommand, 'logical.responsibility', {...lr1});
step('a responsibility linked to the new decision', logical.applyLogicalCommand, 'logical.responsibility', {...lrOf(lr1.id), decisionIds: [...lrOf(lr1.id).decisionIds, adr2], requirementIds: [...lrOf(lr1.id).requirementIds, added]});
step('a responsibility added', logical.applyLogicalCommand, 'logical.responsibility', {title: 'Record refunds', purpose: 'Owns refund recording.', boundary: 'Keeps the refund reference.', owner: 'Operations team', source: 'Fixture brief', groupId: p.logical.groups?.[0]?.id, requirementIds: [added], decisionIds: [adr2]});
const lr3 = p.logical.responsibilities.at(-1).id;
step('a component allocated the new responsibility', realisation.applyRealisationCommand, 'realisation.component', {title: 'Refund service', kind: 'service', purpose: 'Runs refund recording.', boundary: 'Owns the refund record.', owner: 'Delivery team', inputs: 'Refund with its reference', outputs: 'Recorded refund', rationale: 'Allocated from its responsibility.', source: 'Fixture design', technologyNeeds: 'Compute and durable storage.', status: 'draft', allocations: [{logicalId: lr3, scope: 'All of it'}], dataIds: [], decisionIds: [adr2]});
step('the new requirement edited', applyCommand, 'artefact', {...req(added), acceptance: req(added).acceptance + ' Within a day.'});
step('a decision re-saved after it', decisions.applyDecisionCommand, 'decision.save', {...decisionOf(adr2)});
const comp0 = p.realisation.components[0];
step('a component re-saved', realisation.applyRealisationCommand, 'realisation.component', {...comp0, allocations: p.logical.mappings.filter(m => m.physicalId === comp0.id).map(m => ({logicalId: m.logicalId, scope: m.scope}))});
step('a requirement edited again', applyCommand, 'artefact', {...req('REQ-002'), owner: 'Payments operations'});
// A confirmation alone (round 12, UX-02): no reading moves, no judgement changes, and the requirements' content version
// (which Chapters 6–10's stamps read) stays; under readings definition 1 the requirement's reading would have moved.
const confirmedBefore = changedNow(), versionBefore = p.contentVersion, unconfirmed = req('REQ-004');
assert.equal(unconfirmed.confirmed, false);
step('a requirement confirmed', applyCommand, 'artefact', {...unconfirmed, confirmed: true});
assert.equal(req('REQ-004').confirmed, true); assert.equal(p.contentVersion, versionBefore, 'a confirmation is not a change of the requirements\' content');
assert.deepEqual(changedNow(), confirmedBefore, 'a confirmation alone leaves no record to review');
assert.notEqual(withReadingsDefinition(1, () => valueFingerprint(unconfirmed)), withReadingsDefinition(1, () => valueFingerprint(req('REQ-004'))), 'a reading of the whole record would have moved');
assert.equal(valueFingerprint(readContent(unconfirmed)), valueFingerprint(readContent(req('REQ-004'))), 'a reading of the content does not');
// Confirming the rest in one reviewed step (requirements.confirm): the same.
const rest = p.artefacts.filter(a => a.type === 'requirement' && !a.confirmed).length;
assert.ok(rest > 0);
step('the rest confirmed in one reviewed step', applyRequirementsCommand, 'requirements.confirm', {filter: {unconfirmed: true}, count: rest, reviewed: true});
assert.equal(p.artefacts.filter(a => a.type === 'requirement' && !a.confirmed).length, 0); assert.equal(p.contentVersion, versionBefore, 'a bulk confirmation is not a change of the requirements\' content');
assert.deepEqual(changedNow(), confirmedBefore, 'a bulk confirmation leaves no record to review');
pass(`forward, through ${steps - 1} edits of the reference journey (a confirmation and a bulk confirmation among them, which move nothing): ${judged} source-change judgements of drivers, conflicts, decisions, responsibilities and components equal rc.10.73.16's judgements from its own copies (the first edit leaves ${staleAfterEdit.length} records to review), and every kept fingerprint is the fingerprint of that copy`);

// ---------------------------------------------------------------- 5. readings definition 3 (round 12, A3: GR-STO-08)
// A design task's security basis reads its threat's and control's readings, not the versions of Chapters 1-8: a change
// elsewhere in Chapter 8 leaves it current, a change to what its threat reads does not. A Chapter 8-10 record whose reading
// was kept as the versions of the chapters it reads (before D4) is converted when the project is read: one that was
// current keeps its reading of the records it reads, one that was not stays as it was, and every judgement is the same.
{
  const ifc = await import('./public/interfaces-domain.js'), sec = await import('./public/security-domain.js'), run = await import('./public/runtime-domain.js'), {designBasis, designBasisStamp} = await import('./public/design-basis.js');
  const ref = review.withFinalReview(seedProject()), threat = ref.security.threats.find(t => (t.targetIds || []).some(id => ifc.contract(ref, id))), requirement = ref.artefacts.find(a => a.type === 'requirement');
  const target = threat.targetIds.find(id => ifc.contract(ref, id)), other = ref.interfaces.contracts.find(c => !threat.targetIds.includes(c.id));
  const stampOf = p => designBasisStamp(designBasis(p, requirement.id, null, null, {threatId: threat.id}, null));
  const edit = (p, id) => { const q = structuredClone(p), c = q.interfaces.contracts.find(x => x.id === id); q.interfaces.version++; c.purpose = (c.purpose || '') + ' Revised for the reading check.'; c.revision++; return q; };
  assert.equal(stampOf(edit(ref, other.id)), stampOf(ref), 'a change elsewhere in Chapter 8 leaves a security basis current');
  assert.notEqual(stampOf(edit(ref, target)), stampOf(ref), 'a change to a contract its threat reads does not');
  assert.notEqual(withReadingsDefinition(2, () => stampOf(edit(ref, other.id))), withReadingsDefinition(2, () => stampOf(ref)), 'before definition 3, any change in Chapter 8 marked it');
  // A project stored at definition 2 with Chapter 8-10 readings kept as versions (the first record of each chapter's
  // lists not current), read through /api/project.
  const legacy = structuredClone(ref); legacy.id = 'project-readings-as-versions'; legacy.readingsDefinition = 2;
  const stamps = {interfaces: ifc.inputStamp(legacy), security: sec.securityInputStamp(legacy), runtime: run.runtimeInputStamp(legacy)};
  const lists = p => ({interfaces: [...p.interfaces.contracts, ...p.interfaces.data], security: [...p.security.threats, ...p.security.controls], runtime: [...p.runtime.plans, ...(p.runtime.paths || [])]});
  for (const [kind, records] of Object.entries(lists(legacy))) records.forEach((r, i) => { r.sourceSnapshot = i === 0 ? JSON.stringify(['a version before the last change']) : stamps[kind]; });
  const judge = p => ({interfaces: lists(p).interfaces.map(r => ifc.interfaceSourceChanged(p, r)), security: lists(p).security.map(r => sec.securitySourceChanged(p, r)), runtime: lists(p).runtime.map(r => run.runtimeSourceChanged(p, r))});
  const was = judge(legacy);
  for (const kind of Object.keys(was)) { assert(was[kind].length > 1 && was[kind][0] === true && was[kind].slice(1).every(x => !x), kind + ': kept as versions, current but for the first'); }
  const dir3 = await mkdtemp(tmpdir() + '/aiw-fingerprint-3-'), env3 = {DB: localDatabase(dir3 + '/f.sqlite'), FILES: localFiles(dir3 + '/files'), ASSETS: {fetch: () => new Response('ok')}};
  try {
    await env3.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind(ACTOR, legacy.id, JSON.stringify(legacy), at).run();
    const r = await worker.fetch(new Request(origin + '/api/project?project=' + legacy.id, {headers: {'oai-authenticated-user-id': ACTOR}}), env3), read = await r.json();
    assert.equal(r.status, 200); assert.equal(read.revision, 2, 'the first read stores the upgrade'); assert.equal(read.document.readingsDefinition, READINGS_DEFINITION);
    assert.deepEqual(judge(read.document), was, 'every Chapter 8-10 judgement is the same after it');
    for (const [kind, records] of Object.entries(lists(read.document))) { assert.equal(records[0].sourceSnapshot, JSON.stringify(['a version before the last change']), kind + ': one not current stays as it was'); assert(records.slice(1).every(x => isFingerprint(x.sourceSnapshot)), kind + ': each current one keeps its reading of the records it reads'); }
    const stored = JSON.parse((await env3.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(ACTOR, legacy.id).first()).document);
    assert.equal(stored.readingsDefinition, READINGS_DEFINITION);
  } finally { env3.DB.close(); await rm(dir3, {recursive: true, force: true}); }
  pass(`readings definition 3: a security basis reads its threat and control, so a change elsewhere in Chapter 8 leaves it current (before, any change marked it); a project whose Chapter 8-10 readings were kept as versions is converted on its first read, stored, each current reading now of the records it reads (${Object.values(was).reduce((n, x) => n + x.length - 1, 0)} records), each one not current as it was, every judgement the same`);
}

console.log(`\n${checks.length} checks passed.`);
