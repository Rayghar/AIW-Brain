// AIW rc44, slice S0 (audit/rc44/BUILD-PLAN-2026-11-16.md section 4): the shared registration point. An optional design
// package tells the shared machinery what it adds through public/design-extensions.js (registerExtension), and the record
// graph, the trace kernel, the chapter checks, the command boundary, the lifecycle, the provenance reader, the design
// fingerprint, the read upgrade, the SDD and ARS assembly and the project store read it. No package exists yet: the
// only extensions here are the synthetic ones this file defines. The suite proves the eight cases of the contract:
//   1 the record in the graph with its relations, on the requirement's trail and in linkedVia;
//   2 the command through the boundary: applied, journalled, stamped, undone, refused for an agent account when
//     person-only and for the author when second-person;
//   3 the finding in the chapter's checks and in readiness; a hard finding takes no treatment;
//   4 retire and restore through the one lifecycle family;
//   5 the design key moves the design fingerprint, the evidence key does not;
//   6 a reference document with no such record reads byte for byte as at the baseline 94dbd4f, with and without the
//     extensions registered (rc44-s0-readings.mjs, rc44-s0-extensions-baseline.json), on three references;
//   7 registering twice, or in another order, changes nothing (separate processes, compared);
//   8 the client build passes every gate, with the route delta measured at the slice (audit/rc44/build-notes/s0-size.json).
// and: an extension only adds (it replaces no built-in type, record, collection, command, check, layer or noun); the
// upgrade step and its sentence in the storage upgrade's activity; the document sections at their anchors (the
// registers, the architecture edition, the ARS and a chapter's register); the needs/load pair the project store awaits;
// the command types of the four designs that will register here are free, and every built-in one is taken.
// Run: npm run test:rc44-s0-extensions
import assert from 'node:assert/strict';
import {readFileSync, existsSync, writeFileSync, mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {REFERENCES, reference, readings, digests, AT} from './rc44-s0-readings.mjs';
import worker, {commandHandler, commandShape} from './worker.js';
import {localDatabase} from './local-db.js';
import {readStoredProject} from './project-storage.js';
import {storageUpgradeNeeded, storeStorageUpgrade} from './storage-upgrade.js';
import {withFinalReview, CHAPTERS, inheritedFindings, chapterInheritedFindings, reviewBlockers, reviewBlockerCount, treatmentsFor, DISPOSITIONS, applyFinalReviewCommand, reviewSourceStamp, evidenceStamp, assembleSDD, reviewRequirements} from './public/review-domain.js';
import {recordGraph, OBJECT_TYPES} from './public/record-graph.js';
import {architectureModel} from './public/architecture-model.js';
import * as kernel from './public/trace-kernel.js';
import {decisionFindings} from './public/decisions-domain.js';
import {chapterChecks, sddBoard} from './public/readiness-model.js';
import * as canonical from './public/canonical-command.js';
import {COLLECTIONS, retiredRecords, retirable, referencesTo} from './public/record-lifecycle.js';
import {eachRecord, findRecord, RECORD_NOUNS, RECORD_PATHS} from './public/provenance.js';
import {architectureMarkdown, provenanceReading} from './public/sdd-architecture.js';
import {isReviewCommand} from './authorship.js';
import {documentCopy, isSettled} from './public/document-memo.js';
import {createProjectStore} from './public/project-store.js';
import {previewWorkingChange, previewScenarioAlternative, rebaseWorkingAlternative} from './public/workbench-domain.js';
import {createProject} from './shared/projects-domain.js';
import {REFERENCE_PROJECTS} from './public/reference-projects.js';

// Read through the namespace, so that the file links against the baseline too and each case fails there on its own.
const {applyCanonical, applyRecordCommand, STAGED_COMMANDS, reviewsOnItsOwn} = canonical, stagedBy = type => canonical.stagedBy(type);
const PROBE = process.argv.indexOf('--probe');
const checks = [], failed = [];
const pass = n => { checks.push(n); if (PROBE < 0) console.log('PASS ' + n); };
const ONLY = process.env.AIW_S0_ONLY ? process.env.AIW_S0_ONLY.split(',') : null; // while working on one block: AIW_S0_ONLY=registration,D1
const block = async (name, fn) => { if (ONLY && !ONLY.some(x => name.startsWith(x))) return; try { await fn(); } catch (e) { failed.push(name); console.log('FAIL ' + name + ': ' + (e?.stack || e?.message || e).split('\n').slice(0, process.env.AIW_S0_VERBOSE ? 40 : 4).join(' | ')); } };
const sha = text => createHash('sha256').update(text).digest('hex');
const list = v => (Array.isArray(v) ? v : []);
const A = 'architect-a', B = 'architect-b', C = 'architect-c', AGENT = 'sol-drafter';

let X = null, boundary = null, loadError = '';
try { X = await import('./public/design-extensions.js'); boundary = await import('./design-extension-boundary.js'); } catch (e) { loadError = e.message; }
const need = () => assert.ok(X && boundary, 'the registration point exists (public/design-extensions.js, design-extension-boundary.js): ' + loadError);

// ---------------------------------------------------------------- the synthetic package
// A record kind of its own in a top-level key the document gains only when the first record is written: p.synthetic
// {version, counter, records, observations}. A record names the requirements it answers, the component it binds and,
// optionally, another synthetic record. Its evidence (observations, and the log beside the design) is not design.
const syn = p => p.synthetic?.records || [];
function applySynthetic(p, command, at, actor, options) {
  const raw = command.payload || {}, s = p.synthetic ??= {version: 0, counter: 0, records: []};
  const find = () => { const r = s.records.find(x => x.id === raw.id); if (!r) throw Error('Choose a synthetic record.'); return r; };
  if (command.type === 'synthetic.save') {
    if (typeof raw.title !== 'string' || !raw.title.trim()) throw Error('Name the synthetic record.');
    let r = raw.id ? find() : null;
    if (!r) { r = {id: 'SYN-' + String(++s.counter).padStart(3, '0'), revision: 0, history: []}; r.ref = r.id; s.records.push(r); }
    Object.assign(r, {title: raw.title.trim(), requirementIds: list(raw.requirementIds), componentId: raw.componentId || '', dependsOn: raw.dependsOn || '', broken: raw.broken === true, note: r.note || '', revision: r.revision + 1, actor});
    r.history.push({revision: r.revision, actor, at});
    s.version++; return {document: p, selected: r.id};
  }
  if (command.type === 'synthetic.note') { const r = find(); r.note = String(raw.note || ''); s.version++; return {document: p, selected: r.id}; }
  if (command.type === 'synthetic.observe') { find(); (s.observations ??= []).push({id: raw.id, text: String(raw.text || ''), at}); (p.syntheticLog ??= []).push({id: raw.id, at}); return {document: p, selected: raw.id}; }
  if (command.type === 'synthetic.sign') { const r = find(); r.signed = {actor, at}; return {document: p, selected: r.id}; }
  // The step keeps who took it and with what kind of account, as the boundary hands them to apply (ruling D7.1).
  if (command.type === 'synthetic.accept') { const r = find(); if (raw.reviewed !== true) throw Error('Confirm the acceptance.'); r.acceptance = {actor, at, account: options?.author?.account ?? null}; return {document: p, selected: r.id}; }
  if (command.type === 'synthetic.endorse') { const r = find(); r.endorsement = {actor, at, account: options?.author?.account ?? null}; return {document: p, selected: r.id}; }
  if (command.type === 'synthetic.confirm') { const r = find(); r.confirmed = true; return {document: p, selected: r.id}; }
  throw Error('Unknown synthetic action.');
}
const SYNTHETIC = {
  id: 'zz-synthetic',
  objectTypes: {synthetic: {label: 'Synthetic record', chapter: 3, level: 'intent', prefix: 'SYN'}},
  records(p, add, rel) {
    for (const r of syn(p)) {
      add(r, 'synthetic', 'synthetic.records.' + r.id);
      for (const id of list(r.requirementIds)) rel('fulfils', id, r.id, {source: 'synthetic.records.requirementIds'});
      if (r.componentId) rel('binds', r.id, r.componentId, {source: 'synthetic.records.componentId', attributes: {role: 'subject'}});
    }
  },
  layers: {synthetic: 'synthetic'},
  // The own chain: what a requirement names. Context: what a component it binds brings, and what an other thing (the
  // layer of the package earlier by id) describes.
  hops: [{layer: 'synthetic', types: ['fulfils'], from: ['requirement'], dir: 'out', ctx: false}, {layer: 'synthetic', types: ['binds'], from: ['component'], dir: 'in', ctx: true}, {layer: 'synthetic', types: ['describes'], from: ['other'], dir: 'out', ctx: true}],
  checks: {3: p => syn(p).flatMap(r => [
    ...(r.componentId ? [] : [{code: 'synthetic-unbound', id: 'synthetic-unbound:' + r.id, title: 'Bind the synthetic record', detail: r.id + ' binds no component.', level: 'warning', objectId: r.id}]),
    ...(r.broken ? [{code: 'synthetic-broken', id: 'synthetic-broken:' + r.id, title: 'The synthetic invariant is broken', detail: r.id + ' is marked broken.', level: 'error', hard: true, objectId: r.id}] : [])
  ]), 11: p => syn(p).filter(r => r.note === 'review me').map(r => ({code: 'synthetic-review', id: 'synthetic-review:' + r.id, chapter: 3, chapterTitle: 'Architecture decisions', title: 'Review the synthetic note', detail: r.id, level: 'warning', objectId: r.id}))},
  commands: {
    // What the type refuses by who writes the commit: a draft by Sol marks no record broken, sent on its own or in a batch.
    'synthetic.save': {apply: applySynthetic, staged: true, validate: (p, command, {author}) => (author?.kind === 'sol-draft' && command.payload?.broken === true ? 'A draft by Sol does not mark a synthetic record broken.' : null)},
    'synthetic.note': {apply: applySynthetic, undo: {previous: (p, c) => ({id: c.payload.id, note: syn(p).find(r => r.id === c.payload.id)?.note ?? ''}), revert(p, was) { const r = syn(p).find(x => x.id === was.id); if (!r) throw Error('The synthetic record changed.'); r.note = was.note; p.synthetic.version++; return {document: p, selected: r.id}; }}},
    'synthetic.observe': {apply: applySynthetic},
    'synthetic.sign': {apply: applySynthetic, person: true},
    'synthetic.accept': {apply: applySynthetic, second: (p, c) => syn(p).find(r => r.id === c.payload?.id) || null},
    // A second person's step that answers a projection of the record (ruling D7.1): who wrote what the step covers.
    'synthetic.endorse': {apply: applySynthetic, second: (p, c) => { const r = syn(p).find(x => x.id === c.payload?.id); return r ? {id: r.id, actor: r.actor, history: r.history} : null; }},
    'synthetic.confirm': {apply: applySynthetic, person: true}
  },
  // The package's tracker (ruling D4): called after the built-in trackers for every command and for each inner
  // command of a batch, a built-in one too. It writes nothing for a document without the package's records. For its
  // own save it journals the change; for any command it keeps a tally in its own container; and when a built-in
  // retirement leaves the design it journals that its records were read again, in the same commit.
  track(prior, next, command, at) {
    if (!syn(next).length) return;
    const event = (r, fields) => next.changes.events.push({id: 'CHG-' + String(++next.changes.counter).padStart(3, '0'), source: {chapter: 3, id: r.id, ref: r.id, kind: 'synthetic', title: r.title}, title: r.title, at, fields, items: []});
    (next.synthetic.tracked ??= []).push(command.type);
    if (command.type === 'synthetic.save') { const r = syn(next).find(x => x.id === (command.payload?.id || syn(next).at(-1)?.id)); if (r) event(r, [{key: 'title', label: 'Title', before: syn(prior).find(x => x.id === r.id)?.title ?? null, after: r.title}]); }
    if (command.type === 'record.retire' && syn(prior).length === syn(next).length) event(syn(next)[0], [{key: 'readAgain', label: 'Read again after a retirement', before: null, after: String(command.payload?.id)}]);
  },
  lifecycle: {'synthetic.records': 3},
  provenance: {nouns: {'synthetic.records': 'synthetic record'}, paths: {synthetic: ['synthetic.records']}},
  // Evidence is a list of records (the evidence fingerprint reads it); an object left out of the design is bookkeeping
  // beside it, which neither fingerprint reads (as dataOwnership is).
  designKeys: ['synthetic'], evidenceKeys: ['synthetic.observations', 'syntheticLog', 'syntheticMigration'],
  // An old document kept `legacySynthetic` titles: read once into records. Returns the document itself when there is nothing to do.
  upgradeNote: 'Its legacy synthetic titles are kept as synthetic records.',
  upgrade(p) { if (!Array.isArray(p.legacySynthetic)) return p; const {legacySynthetic, ...q} = p; q.synthetic = {version: 1, counter: legacySynthetic.length, records: legacySynthetic.map((t, i) => ({id: 'SYN-' + String(i + 1).padStart(3, '0'), ref: 'SYN-' + String(i + 1).padStart(3, '0'), title: String(t), requirementIds: [], componentId: '', revision: 1, history: []}))}; return q; },
  sections: [
    {document: 'registers', after: '## Performance specification', markdown: p => (syn(p).length ? '### Synthetic register\n\n' + syn(p).map(r => '- ' + r.id + ' · ' + r.title).join('\n') + '\n\n' : '')},
    {document: 'sdd', after: '## E. Provenance', markdown: p => (syn(p).length ? 'Synthetic records: ' + syn(p).map(r => r.id).join(', ') + '.\n\n' : '')},
    {document: 'ars', after: '## Open items', markdown: p => (syn(p).length ? 'Synthetic records bear on these requirements: ' + syn(p).length + '.\n\n' : '')},
    {document: 'chapter-3', after: '## Conflicts', markdown: p => (syn(p).length ? '### Synthetic records\n\n' + syn(p).map(r => '- ' + r.id).join('\n') + '\n\n' : '')},
    {document: 'registers', after: '## No such heading', markdown: () => 'NEVER PRINTED\n\n'}
  ]
};
// A second package, earlier by id: its own kind, layer, check and collection, so that order can matter. A hop comes
// from a built-in layer, an earlier layer of its own package or a layer of a package earlier by id.
const other = p => p.runtime?.otherThings || [];
const OTHER = {
  id: 'mm-other',
  objectTypes: {otherThing: {label: 'Other thing', chapter: 10, level: 'deployment', prefix: 'OTH'}},
  records(p, add, rel) { for (const r of other(p)) { add(r, 'otherThing', 'runtime.otherThings.' + r.id); for (const id of list(r.requirementIds)) rel('fulfils', id, r.id, {source: 'runtime.otherThings.requirementIds'}); if (r.syntheticId) rel('describes', r.id, r.syntheticId, {source: 'runtime.otherThings.syntheticId'}); } },
  layers: {other: 'otherThing'},
  hops: [{layer: 'other', types: ['fulfils'], from: ['requirement'], dir: 'out', ctx: false}],
  checks: {3: p => other(p).map(r => ({code: 'other-noted', id: 'other-noted:' + r.id, title: 'Note the other thing', detail: r.id, level: 'warning', objectId: r.id})), 10: p => other(p).map(r => ({code: 'other-placed', id: 'other-placed:' + r.id, title: 'Place the other thing', detail: r.id, level: 'warning', objectId: r.id}))},
  lifecycle: {'runtime.otherThings': 10},
  // otherNotes: read by the provenance reader (who wrote each, the review plan), not retired through the lifecycle family.
  provenance: {nouns: {'runtime.otherThings': 'other thing', 'runtime.otherNotes': 'other note'}, paths: {}, records: {'runtime.otherNotes': 10}},
  designKeys: ['runtime.otherThings'], evidenceKeys: []
};
// A package that tries to replace what is built in: every such row is left out, by construction.
const HOSTILE = {
  id: 'aa-hostile',
  objectTypes: {component: {label: 'Hijacked', chapter: 1, level: 'context'}},
  layers: {component: 'synthetic', hostile: 'component'},
  // It registers a record under a built-in record's id and source, to stand in its place.
  records(p, add) { const c = p.realisation?.components?.[0]; if (c) add({id: c.id, title: 'Hijacked', ref: 'HIJ-001'}, 'synthetic', 'realisation.components[0]'); },
  hops: [{layer: 'component', types: ['binds'], from: ['requirement'], dir: 'out', ctx: false}, {layer: 'control', types: ['fulfils'], from: ['driver'], dir: 'out', ctx: false}, {layer: 'hostile', types: ['realizedBy'], from: ['responsibility'], dir: 'out', ctx: false}],
  commands: {'decision.save': {apply() { throw Error('replaced'); }, staged: true}, 'record.retire': {apply() { throw Error('replaced'); }}, 'quality.driver': {apply() { throw Error('replaced'); }, staged: true},
    // Marked staged by mistake: a person-only or second-person type is never staged.
    'hostile.sign': {apply() { throw Error('staged a person\'s step'); }, person: true, staged: true}, 'hostile.accept': {apply() { throw Error('staged a second person\'s step'); }, second: () => null, staged: true}},
  lifecycle: {'decisions.records': 9},
  provenance: {nouns: {'decisions.records': 'hijacked decision'}, paths: {decision: ['artefacts']}, records: {'decisions.records': 9, 'finalReview.narrative': 3, 'logical.assets': 4}}
};
const withSynthetic = (p, payload, actor = A) => applySynthetic(documentCopy(p), {type: 'synthetic.save', payload}, AT, actor).document;
const firstTrail = p => { const reqs = reviewRequirements(p); for (const r of reqs) { const T = kernel.requirementTrace(p, r.id); if (T.layers.component?.length) return {requirement: r.id, component: T.layers.component[0], T}; } throw Error('no requirement with a component on its trail'); };

// ---------------------------------------------------------------- probe mode (case 7): one registration order per process
if (PROBE >= 0) {
  const order = process.argv[PROBE + 1] || '';
  for (const ch of order) X.registerExtension({h: HOSTILE, o: OTHER, s: SYNTHETIC}[ch]);
  let p = reference('bank-payment'); const t = firstTrail(p);
  p = withSynthetic(p, {title: 'First synthetic record', requirementIds: [t.requirement], componentId: t.component});
  p = withSynthetic(p, {title: 'Second synthetic record', dependsOn: 'SYN-001', broken: true});
  p.runtime.otherThings = [{id: 'OTH-001', ref: 'OTH-001', title: 'Other thing', requirementIds: [t.requirement], syntheticId: 'SYN-002'}]; p.runtime.otherNotes = [{id: 'ON-001', ref: 'ON-001', title: 'A note', syntheticId: 'SYN-001'}];
  p = withFinalReview(p);
  console.log(JSON.stringify({order, extensions: X.EXTENSIONS.map(e => e.id), types: Object.keys(OBJECT_TYPES), collections: COLLECTIONS, layers: kernel.TRACE_LAYERS, hops: kernel.TRACE_HOPS.length, nouns: RECORD_NOUNS, paths: RECORD_PATHS, commands: ['synthetic.save', 'decision.save'].map(t => !!boundary.extensionCommand(t)), readings: digests(p), plain: digests(reference('clinic-appointments'))}));
  process.exit(0);
}

// ---------------------------------------------------------------- case 6, first half: nothing registered
const golden = JSON.parse(readFileSync('rc44-s0-extensions-baseline.json', 'utf8'));
const compare = (when, texts = null) => { for (const t of REFERENCES) { const d = texts ? Object.fromEntries(Object.entries(texts[t]).map(([k, v]) => [k, sha(v)])) : digests(reference(t)); for (const k of Object.keys(golden.readings[t])) assert.equal(d[k], golden.readings[t][k], `${t}: the ${k} reading is byte for byte the baseline's (${when})`); } };
const before = Object.fromEntries(REFERENCES.map(t => [t, readings(reference(t))]));
await block('6a no extension registered', () => {
  assert.equal(golden.capturedFrom, '94dbd4f');
  compare('no extension registered', before);
  if (X) assert.deepEqual(X.EXTENSIONS, [], 'nothing is registered until a package registers');
  pass('6a: with nothing registered, the graph, trails, findings, stamps, readiness, provenance, registers, SDD and ARS of ' + REFERENCES.join(', ') + ' are byte for byte those of 94dbd4f');
});

// ---------------------------------------------------------------- registration
await block('registration', () => {
  need();
  assert.deepEqual(boundary.extensionIssues(OTHER), [], 'the package states every part as the contract asks');
  assert.ok(boundary.extensionIssues(SYNTHETIC).some(i => /comes from “other”, which is no layer/.test(i)), 'a hop comes from a layer that exists');
  assert.ok(boundary.extensionIssues(HOSTILE).length >= 12, 'the conformance check names what a package may not state: ' + boundary.extensionIssues(HOSTILE).join(' | '));
  assert.ok(boundary.extensionIssues({id: 'xy', objectTypes: {xy: {label: 'Xy', chapter: 2, level: 'intent', prefix: 'XY'}}, layers: {xy: 'xy'}, hops: [{layer: 'xy', types: ['a'], from: ['requirement'], dir: 'out'}]}).some(i => /own chain or context/.test(i)), 'a hop says whether it is the own chain or context');
  assert.ok(boundary.extensionIssues({objectTypes: {}}).some(i => /its id/.test(i)), 'a package names itself'); assert.ok(boundary.extensionIssues({id: 'constructor'}).some(i => /its id/.test(i)), 'with an id the registry can keep');
  assert.ok(boundary.extensionIssues({id: 'xy', designKeys: ['workspace.things']}).some(i => /does not read/.test(i)), 'a design key lies where the fingerprint reads');
  assert.deepEqual(boundary.extensionIssues({id: 'xy', designKeys: ['things', 'runtime.things'], evidenceKeys: ['thingLog', 'things.observations', 'runtime.thingEvidence']}), []);
  // a package leaves only its own keys out of the design: a key the workbench keeps is refused when the server starts
  { const kept = ['artefacts', 'quality', 'quality.drivers', 'decisions.records', 'runtime', 'runtime.evidence', 'security.risks', 'finalReview', 'requirementGroups', 'processModel.claims', 'brief'], issues = boundary.extensionIssues({id: 'xy', evidenceKeys: kept});
    for (const key of kept) assert.ok(issues.some(i => i.includes('evidence key “' + key + '” is a key the workbench keeps')), key + ' stays in the design'); assert.equal(issues.length, kept.length); }
  assert.ok(boundary.extensionIssues({id: 'xy', commands: {'xy.sign': {apply() {}, person: true, staged: true}, 'decision.accept': {apply() {}}}}).length === 2, 'a person\'s step is never staged, and a built-in type is the chapter\'s');
  assert.ok(boundary.extensionIssues({id: 'xy', commands: {'decision.accept': {apply() {}, staged: true}}}).some(i => /command “decision\.accept” is built in/.test(i)), 'a built-in type that is not staged is not a package\'s to stage');
  // The command types the four designs state (wp1 knowledge.*, wp2 adoption.* and selection.*, wp3 workload.*, wp9a
  // runtime.* and technology.*) are free: the built-in handler of the prefix refuses each as unknown. Every built-in
  // type is taken, the ones the route calls itself among them.
  for (const type of ['knowledge.concept-pin', 'knowledge.library', 'adoption.apply', 'adoption.accept', 'selection.judge', 'workload.model', 'workload.objective-agree', 'runtime.node', 'runtime.failure-accept', 'runtime.gate-evidence', 'technology.domain', 'technology.domain-evidence']) { assert.equal(boundary.builtInType(type), false, type + ' is free for a package'); assert.deepEqual(boundary.extensionIssues({id: 'xy', commands: {[type]: {apply() {}}}}), []); }
  for (const type of ['runtime.zone', 'runtime.simulation', 'technology.capability', 'knowledge.review', 'knowledge.fetch', 'workspace.view', 'workspace.apply', 'intelligence.adopt', 'decision.accept', 'review.disposition', 'record.retire', 'feedback.import', 'model.apply-impact', 'action.undo']) assert.equal(boundary.builtInType(type), true, type + ' is built in');
  assert.ok(boundary.extensionIssues({id: 'xy', objectTypes: {xy: {label: 'Xy', chapter: 2, level: 'intent', prefix: 'XY'}}, layers: {xy: 'xy'}, hops: [{layer: 'xy', types: ['a'], from: ['requirement'], dir: 'out', ctx: true, step: true}]}).some(i => /“step” is not a part of a hop/.test(i)), 'a hop states only what the contract names');
  assert.ok(boundary.extensionIssues({id: 'xy', provenance: {records: {'xy.things': 12}}}).some(i => /“xy\.things” is a key of the document or chapter\.list, with its chapter from 1 to 11/.test(i)));
  assert.deepEqual(boundary.extensionIssues({id: 'xy', provenance: {records: {'xy.things': 11}, nouns: {'xy.things': 'thing'}}, upgrade: p => p, upgradeNote: 'Its things are kept.', sections: [{document: 'chapter-10', after: '# Runtime plans', markdown: () => ''}]}), []);
  assert.ok(boundary.extensionIssues({id: 'xy', upgradeNote: 'Its things are kept.'}).some(i => /upgradeNote/.test(i)), 'a note goes with a step');
  assert.ok(boundary.extensionIssues({id: 'xy', sections: [{document: 'chapter-11', after: '# T', markdown: () => ''}]}).length === 1, 'chapter-1 to chapter-10 are the chapter registers');
  X.registerExtension(SYNTHETIC); X.registerExtension(HOSTILE); X.registerExtension(OTHER);
  assert.deepEqual(boundary.extensionIssues(SYNTHETIC), [], 'registered, with the package its hop comes from');
  assert.deepEqual(boundary.extensionIssues(OTHER), []);
  assert.deepEqual(X.EXTENSIONS.map(e => e.id), ['aa-hostile', 'mm-other', 'zz-synthetic'], 'readers read the packages sorted by id, whatever order they registered in');
  pass('registration: a package registers by id; the conformance check (design-extension-boundary.js extensionIssues) passes the synthetic packages and names what the hostile one may not state');
});

// ---------------------------------------------------------------- case 6, second half: registered, no record
await block('6b registered, no record of theirs', () => {
  need();
  compare('three extensions registered, none of their records in the document');
  for (const t of REFERENCES) { const now = readings(reference(t)); for (const k of Object.keys(before[t])) assert.equal(now[k], before[t][k], `${t}: ${k} is the same text with and without the extensions`); }
  const p = reference('bank-payment');
  assert.ok(!('synthetic' in p) && !('syntheticLog' in p) && !('otherThings' in p.runtime), 'no key of a package exists until its first record is written');
  for (const t of REFERENCES) { const q = reference(t); assert.equal(boundary.upgradeExtensions(q), q, t + ': the upgrade chain hands back the same document'); assert.equal(boundary.extensionUpgradeNeeded(q), false); }
  pass('6b: with three extensions registered and none of their records in the document, every reading of the three references is still byte for byte the baseline\'s, and no package key exists');
});

// ---------------------------------------------------------------- only adds
await block('an extension only adds', () => {
  need();
  assert.equal(OBJECT_TYPES.component.label, 'Application component'); assert.equal(OBJECT_TYPES.component.chapter, 5);
  assert.deepEqual(OBJECT_TYPES.synthetic, SYNTHETIC.objectTypes.synthetic);
  assert.equal(COLLECTIONS.filter(([path]) => path === 'decisions.records').length, 1, 'a built-in collection is listed once'); assert.equal(COLLECTIONS.find(([path]) => path === 'decisions.records')[1], 3);
  assert.equal(RECORD_NOUNS['decisions.records'], 'decision'); assert.equal(RECORD_NOUNS['synthetic.records'], 'synthetic record'); assert.equal(RECORD_NOUNS['runtime.otherThings'], 'other thing');
  assert.equal(kernel.TRACE_LAYERS.filter(l => l === 'component').length, 1); assert.deepEqual(kernel.TRACE_LAYERS.slice(0, kernel.BUILT_IN_LAYERS.length), kernel.BUILT_IN_LAYERS);
  assert.equal(kernel.layerOf({type: 'component', source: 'realisation.components[0]'}), 'component', 'a built-in type stands on its built-in layer, whatever layer a package states for it');
  assert.equal(kernel.layerOf({type: 'synthetic', source: 'synthetic.records.SYN-001'}), 'synthetic', 'and a package\'s type on the package\'s layer, never on a built-in one');
  assert.ok(!kernel.TRACE_HOPS.some(h => kernel.BUILT_IN_LAYERS.includes(h.layer) && !h.from.every(l => kernel.BUILT_IN_LAYERS.includes(l)) || h.layer === 'control' && h.from.includes('driver')), 'no hop of a package brings a record onto a built-in layer');
  { const p = reference('bank-payment'); for (const r of reviewRequirements(p)) assert.equal(kernel.requirementTrace(p, r.id).layers.hostile, undefined, 'a layer stated for a built-in type holds nothing'); }
  // The hostile package states a hop that would bring a component onto a requirement's trail by a relation of type
  // binds. With such a relation in the graph, the trail's component layer is what it was: a built-in layer reads the
  // built-in hops and no other.
  { const p0 = reference('bank-payment'); let t = null;
    for (const r of reviewRequirements(p0)) { const T = kernel.requirementTrace(p0, r.id), c = p0.realisation.components.find(x => !T.has(x.id)); if (c && T.layers.component.length) { t = {requirement: r.id, off: c.id, T}; break; } }
    assert.ok(t, 'the reference holds a requirement with a component off its trail');
    const q = withFinalReview({...p0, modelContext: {...p0.modelContext, relationships: [...list(p0.modelContext?.relationships), {type: 'binds', from: t.requirement, to: t.off}]}});
    assert.deepEqual(kernel.linkedVia(q, t.requirement, 'binds'), [t.off], 'the relation is in the graph the walks read');
    assert.ok(!kernel.requirementTrace(q, t.requirement).has(t.off), 'and no hop of a package brings its record onto a built-in layer');
    assert.deepEqual(kernel.requirementTrace(q, t.requirement).layers.component, t.T.layers.component); }
  // The hostile emitter registers a record under a built-in record's id and source: the built-in record stays.
  { const p = reference('bank-payment'), c = p.realisation.components[0], o = recordGraph(p).objects.get(c.id), m = architectureModel(p).objects.get(c.id);
    assert.equal(o.type, 'component'); assert.equal(o.record, c); assert.equal(o.title, c.title); assert.equal(m.type, 'component'); assert.equal(m.record, c); }
  // A collection stated for the provenance reader that is built in, or a lifecycle collection, is listed once, as it was.
  for (const path of ['decisions.records', 'finalReview.narrative', 'synthetic.records', 'runtime.otherNotes']) assert.equal(RECORD_PATHS.filter(r => r[0] === path).length, 1, path + ' is read once');
  assert.deepEqual([RECORD_PATHS.find(r => r[0] === 'decisions.records')[1], RECORD_PATHS.find(r => r[0] === 'finalReview.narrative')[1]], [3, 11]); assert.ok(!RECORD_PATHS.some(r => r[0] === 'logical.assets'), 'the twin a component keeps in Chapter 4 is not read twice');
  assert.throws(() => boundary.assertExtensions(), /aa-hostile: object type “component” is built in/, 'the server would not start with it');
  assert.equal(stagedBy('quality.driver'), true, 'a built-in staged type is the chapter\'s, whatever a package states for it'); assert.equal(stagedBy('decision.save'), true); assert.equal(stagedBy('record.retire'), true);
  assert.notEqual(commandHandler('decision.save'), HOSTILE.commands['decision.save'].apply);
  const p = reference('bank-payment');
  assert.doesNotThrow(() => applyCanonical(p, {type: 'quality.driver', payload: {...p.quality.drivers[0]}}, AT, A), 'a built-in staged command is the chapter\'s own');
  assert.equal(boundary.extensionCommand('decision.save'), null, 'a built-in type is never a package\'s'); assert.equal(boundary.extensionCommand('record.retire'), null);
  assert.equal(boundary.extensionCommand('synthetic.save').apply, applySynthetic);
  assert.equal(boundary.extensionCommand('constructor'), null); assert.equal(boundary.extensionCommand('toString'), null);
  pass('only adds: a built-in type, collection, noun, layer, hop target and command stay as they are; a prototype name is no command');
});

// ---------------------------------------------------------------- 1. record graph, trail, linkedVia
let P = null, T0 = null;
await block('1 record graph and trail', () => {
  need();
  const p0 = reference('bank-payment'); T0 = firstTrail(p0);
  const second = reviewRequirements(p0).find(r => r.id !== T0.requirement && !kernel.requirementTrace(p0, r.id).has(T0.component))?.id;
  let p = withSynthetic(p0, {title: 'First synthetic record', requirementIds: [T0.requirement], componentId: T0.component});
  p = withSynthetic(p, {title: 'Bound, named by no requirement', componentId: T0.component});
  p = withFinalReview(p); P = p;
  const G = recordGraph(p), o = G.objects.get('SYN-001');
  assert.ok(o, 'the record is an object of the record graph'); assert.equal(o.type, 'synthetic'); assert.equal(o.source, 'synthetic.records.SYN-001'); assert.equal(o.record, p.synthetic.records[0]);
  const rels = G.relationships.filter(e => e.from === 'SYN-001' || e.to === 'SYN-001').map(e => [e.type, e.from, e.to, e.source]);
  assert.deepEqual(rels, [['fulfils', T0.requirement, 'SYN-001', 'synthetic.records.requirementIds'], ['binds', 'SYN-001', T0.component, 'synthetic.records.componentId']], 'with its typed relations, each naming the field that states it');
  const M = architectureModel(p).objects.get('SYN-001');
  assert.ok(M, 'the connected model draws over the same emitter'); assert.equal(M.chapter, 3); assert.equal(M.level, 'intent');
  const T = kernel.requirementTrace(p, T0.requirement), S = kernel.requirementSpine(p, T0.requirement);
  assert.deepEqual(T.layers.synthetic, ['SYN-001', 'SYN-002'], 'on the trail of the requirement it answers, with the record its component brings as context');
  assert.equal(T.layerOf('SYN-001'), 'synthetic'); assert.deepEqual(T.hops.get('SYN-001').map(h => h.type).sort(), ['binds', 'fulfils']);
  assert.deepEqual(S.layers.synthetic, ['SYN-001'], 'the own chain (the spine) holds only what an own-chain hop brings');
  assert.deepEqual(kernel.linkedVia(p, 'SYN-001', 'binds'), [T0.component]); assert.deepEqual(kernel.linkedVia(p, T0.component, 'binds', 'in'), ['SYN-001', 'SYN-002']);
  assert.deepEqual(kernel.namedBy(p, T0.requirement, 'synthetic'), ['SYN-001']); assert.deepEqual(kernel.namingRequirements(p, 'SYN-001'), [T0.requirement]);
  assert.deepEqual(kernel.servingRequirements(p, 'SYN-001').map(r => r.id).includes(T0.requirement), true, 'the walk back from the record reaches the requirement');
  assert.ok(kernel.forwardTrace(p, T0.component).has('SYN-002'));
  // The built-in layers of every trail are what they were without the records.
  for (const r of reviewRequirements(p0)) { const a = kernel.requirementTrace(p0, r.id), b = kernel.requirementTrace(p, r.id), c = kernel.requirementSpine(p0, r.id), d = kernel.requirementSpine(p, r.id); for (const l of Object.keys(a.layers)) { assert.deepEqual(b.layers[l], a.layers[l], r.id + ' ' + l); assert.deepEqual(d.layers[l], c.layers[l], r.id + ' spine ' + l); } }
  if (second) assert.ok(!kernel.requirementTrace(p, second).has('SYN-001'), 'a record reaches only the trails its hops lead from');
  assert.ok(kernel.TRACE_LAYERS.indexOf('synthetic') > kernel.TRACE_LAYERS.indexOf('path'), 'a package\'s layer stands after the built-in layers');
  assert.ok(kernel.TRACE_LAYERS.indexOf('other') < kernel.TRACE_LAYERS.indexOf('synthetic'), 'in the packages\' id order');
  // a hop from the layer of the package earlier by id
  const third = reviewRequirements(p0).find(r => !kernel.requirementTrace(p, r.id).has('SYN-002'))?.id;
  if (third) { const q = withFinalReview({...p, runtime: {...p.runtime, otherThings: [{id: 'OTH-001', ref: 'OTH-001', title: 'Other thing', requirementIds: [third], syntheticId: 'SYN-002'}]}}), Q = kernel.requirementTrace(q, third); assert.deepEqual(Q.layers.other, ['OTH-001']); assert.deepEqual(Q.layers.synthetic, ['SYN-002'], 'the other thing brings the record it describes'); assert.equal(kernel.requirementSpine(q, third).layers.synthetic, undefined, 'as context, not on the own chain'); assert.deepEqual(kernel.requirementSpine(q, third).layers.other, ['OTH-001']); }
  pass('1: SYN-001 is in the record graph and the connected model with fulfils and binds, on the trail and the spine of ' + T0.requirement + ', in linkedVia both ways, namedBy and servingRequirements; a context hop is on the trail and not on the spine; every built-in layer is unchanged');
});

// ---------------------------------------------------------------- 2. the command boundary
await block('2 command boundary', async () => {
  need();
  const files = new Map(), FILES = {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k)} : null; }, async delete(k) { files.delete(k); }};
  const env = {DB: localDatabase(':memory:'), FILES, ASSETS: {fetch: () => new Response('asset')}, AIW_AGENT_ACTORS: AGENT};
  const api = (path, method = 'GET', body = null, owner = A) => { const headers = new Headers({'oai-authenticated-user-id': owner}); if (body) { headers.set('Content-Type', 'application/json'); headers.set('Origin', 'https://aiw.test'); } return worker.fetch(new Request('https://aiw.test' + path, {method, headers, ...(body ? {body: JSON.stringify(body)} : {})}), env); };
  try {
    let state = await (await api('/api/project')).json();
    const pid = state.document.id, q = '?project=' + encodeURIComponent(pid);
    for (const actorId of [B, AGENT]) assert.equal((await api('/api/access' + q, 'POST', {actorId, role: 'editor'})).status, 200);
    const send = async (type, payload, as = A, extra = {}) => { state = await (await api('/api/project' + q, 'GET', null, as)).json(); const res = await api('/api/commands' + q, 'POST', {revision: state.revision, command: {type, payload}, ...extra}, as); const body = await res.json(); if (res.status === 200) state = body; return {status: res.status, body}; };
    assert.ok(!('synthetic' in state.document), 'the project holds no synthetic key yet');
    const t = firstTrail(withFinalReview(state.document)), journal0 = state.document.changes?.events?.length || 0;
    // applied, journalled, stamped
    const saved = await send('synthetic.save', {title: 'Saved through the boundary', requirementIds: [t.requirement], componentId: t.component});
    assert.equal(saved.status, 200, JSON.stringify(saved.body).slice(0, 300)); assert.equal(saved.body.selected, 'SYN-001');
    const r = () => state.document.synthetic.records.find(x => x.id === 'SYN-001');
    assert.equal(r().actor, A, 'the signed-in actor reaches the handler');
    const event = state.document.changes.events.at(-1);
    assert.ok(state.document.changes.events.length > journal0); assert.equal(event.source.kind, 'synthetic'); assert.equal(event.actor, A); assert.equal(event.authorKind, 'person'); assert.equal(event.reviewed, true);
    assert.deepEqual({kind: r().provenance?.author?.kind, by: r().provenance?.author?.by}, {kind: 'person', by: A}, 'the record is stamped as the commit\'s, as a built-in record is');
    const activity = await (await api('/api/activity' + q)).json();
    assert.ok(JSON.stringify(activity).includes('synthetic.save'), 'the activity row names the command');
    // validated as built-in commands are
    const untitled = await send('synthetic.save', {title: ''}); assert.equal(untitled.status, 400); assert.match(untitled.body.error, /Name the synthetic record/);
    const unknown = await send('synthetic.nope', {}); assert.equal(unknown.status, 400); assert.equal(unknown.body.code, 'unknown_command');
    assert.equal((await send('nopackage.save', {})).body.code, 'unknown_command');
    const stale = await api('/api/commands' + q, 'POST', {revision: state.revision - 1, command: {type: 'synthetic.save', payload: {title: 'Stale'}}}); assert.equal(stale.status, 409, 'the revision check is the boundary\'s');
    // a draft by Sol and an agent account send a design edit unreviewed, and claim no review
    const drafted = await send('synthetic.save', {title: 'Drafted by Sol'}, AGENT); assert.equal(drafted.status, 200, JSON.stringify(drafted.body).slice(0, 300));
    assert.equal(state.document.synthetic.records.at(-1).provenance.author.kind, 'sol-draft'); assert.equal(state.document.changes.events.at(-1).reviewed, false);
    // a reviewed batch carries the package's design edit: applied by the same handler, journalled once per record, stamped
    { const commands = [{type: 'synthetic.save', payload: {title: 'Saved in a reviewed batch', broken: true}}], preview = previewWorkingChange(state.document, commands);
      const batch = await send('workspace.apply', {commands, stamp: preview.stamp, reviewed: true, reason: 'A synthetic edit reviewed as a batch.'}); assert.equal(batch.status, 200, JSON.stringify(batch.body).slice(0, 300));
      const made = state.document.synthetic.records.at(-1); assert.deepEqual([made.title, made.broken, made.provenance?.author?.kind], ['Saved in a reviewed batch', true, 'person']);
      assert.equal(state.document.changes.events.at(-1).source.id, made.id, 'the package\'s tracker reads its command inside the batch');
      // what the type refuses by its author is refused on its own and inside a batch, before anything is applied
      const alone = await send('synthetic.save', {title: 'Broken by Sol', broken: true}, AGENT); assert.equal(alone.status, 400); assert.match(alone.body.error, /A draft by Sol does not mark a synthetic record broken/);
      const drafted = [{type: 'synthetic.save', payload: {title: 'Broken by Sol in a batch', broken: true}}], count = state.document.synthetic.records.length;
      state = await (await api('/api/project' + q, 'GET', null, AGENT)).json();
      const inBatch = await send('workspace.apply', {commands: drafted, stamp: previewWorkingChange(state.document, drafted).stamp, reviewed: false, reason: 'Drafted by Sol.'}, AGENT); assert.equal(inBatch.status, 400); assert.match(inBatch.body.error, /A draft by Sol does not mark a synthetic record broken/);
      state = await (await api('/api/project' + q)).json(); assert.equal(state.document.synthetic.records.length, count, 'nothing of the refused batch is kept');
      // the same batch without what the type refuses is Sol's draft, applied unreviewed: the refusal above was the package's alone
      const plainDraft = [{type: 'synthetic.save', payload: {title: 'Drafted by Sol in a batch'}}]; state = await (await api('/api/project' + q, 'GET', null, AGENT)).json();
      const draftedBatch = await send('workspace.apply', {commands: plainDraft, stamp: previewWorkingChange(state.document, plainDraft).stamp, reviewed: false, reason: 'Drafted by Sol.'}, AGENT); assert.equal(draftedBatch.status, 200, JSON.stringify(draftedBatch.body).slice(0, 300));
      assert.equal(state.document.synthetic.records.at(-1).provenance.author.kind, 'sol-draft'); }
    // undone
    assert.equal((await send('synthetic.note', {id: 'SYN-001', note: 'first'})).status, 200);
    const noted = await send('synthetic.note', {id: 'SYN-001', note: 'second'}); assert.equal(noted.status, 200); assert.equal(r().note, 'second');
    const receipt = state.document.workbench.history.at(-1).undo; assert.equal(receipt?.type, 'synthetic.note', 'the boundary issues the undo receipt');
    const otherActor = await send('action.undo', {receiptId: receipt.id}, B); assert.equal(otherActor.status, 400, 'only the account that saved the action undoes it');
    const undone = await send('action.undo', {receiptId: receipt.id}); assert.equal(undone.status, 200, JSON.stringify(undone.body).slice(0, 300)); assert.equal(r().note, 'first', 'undo restores what the action replaced');
    assert.equal((await send('action.undo', {receiptId: receipt.id})).status, 400, 'a receipt is used once');
    // person-only
    const agentSign = await send('synthetic.sign', {id: 'SYN-001'}, AGENT); assert.equal(agentSign.status, 400); assert.match(agentSign.body.error, /agent or service account does not review, confirm, accept or approve \(synthetic\.sign\)/);
    const solSign = await send('synthetic.sign', {id: 'SYN-001'}, A, {authorKind: 'sol-draft'}); assert.equal(solSign.status, 400); assert.match(solSign.body.error, /A draft by Sol does not review, confirm, accept or approve/);
    const importSign = await send('synthetic.sign', {id: 'SYN-001'}, A, {authorKind: 'import'}); assert.equal(importSign.status, 400); assert.match(importSign.body.error, /signed-in person/);
    assert.equal(r().signed, undefined);
    assert.equal((await send('synthetic.sign', {id: 'SYN-001'})).status, 200); assert.equal(r().signed.actor, A);
    // second-person
    const self = await send('synthetic.accept', {id: 'SYN-001', reviewed: true}); assert.equal(self.status, 400); assert.match(self.body.error, /second signed-in person/i); assert.match(self.body.error, /architect-a wrote SYN-001/);
    const agentAccept = await send('synthetic.accept', {id: 'SYN-001', reviewed: true}, AGENT); assert.equal(agentAccept.status, 400); assert.match(agentAccept.body.error, /agent or service account does not review, confirm, accept or approve/);
    const solAccept = await send('synthetic.accept', {id: 'SYN-001', reviewed: true}, B, {authorKind: 'sol-draft'}); assert.equal(solAccept.status, 400);
    const nobody = await send('synthetic.accept', {id: 'SYN-404', reviewed: true}, B); assert.equal(nobody.status, 400); assert.match(nobody.body.error, /names no record/);
    assert.equal(r().acceptance, undefined, 'nothing is accepted by a refused request');
    const accepted = await send('synthetic.accept', {id: 'SYN-001', reviewed: true}, B); assert.equal(accepted.status, 200, JSON.stringify(accepted.body).slice(0, 300)); assert.equal(r().acceptance.actor, B);
    // B then edits the record: B is an author now, and A (its first author) is one still
    assert.equal((await send('synthetic.save', {id: 'SYN-001', title: 'Edited by the second person', requirementIds: [t.requirement], componentId: t.component}, B)).status, 200);
    assert.match((await send('synthetic.accept', {id: 'SYN-001', reviewed: true}, B)).body.error, /architect-b wrote SYN-001/);
    assert.match((await send('synthetic.accept', {id: 'SYN-001', reviewed: true}, A)).body.error, /architect-a wrote SYN-001/, 'every earlier author is refused, as verifierRefusal reads the history');
    // the lifecycle family through the boundary
    assert.equal((await send('record.retire', {id: 'SYN-002', reason: 'Synthetic retirement through the boundary.'})).status, 200); assert.ok(!state.document.synthetic.records.some(x => x.id === 'SYN-002'));
    assert.equal((await send('record.restore', {id: 'SYN-002'})).status, 200); assert.ok(state.document.synthetic.records.some(x => x.id === 'SYN-002'));
    // the registers and the ARS through the export route carry the package's sections
    const registers = await (await api('/api/export' + q + '&chapter=11&annex=registers&format=md')).text(); assert.match(registers, /### Synthetic register\n\n- SYN-001/);
    const ars = await (await api('/api/export' + q + '&chapter=11&document=ars&format=md')).text(); assert.match(ars, /Synthetic records bear on these requirements: 4\./);
    const chapter3 = await (await api('/api/export' + q + '&chapter=3&format=md')).text(); assert.match(chapter3, /## Conflicts\n[\s\S]*### Synthetic records\n\n- SYN-001\n- SYN-002\n- SYN-003\n- SYN-004\n\n## Open findings/, 'a chapter\'s register carries the section at its anchor');
    assert.ok(!(await (await api('/api/export' + q + '&chapter=10&format=md')).text()).includes('Synthetic'), 'and only that chapter\'s');
    // a document a package's step upgrades is stored again on its next read, and the storage upgrade's activity says what the step did
    { const row = await env.DB.prepare('SELECT document,revision,updated_at FROM projects WHERE owner_id=? AND id=?').bind(A, pid).first(), stored = await readStoredProject(env, A, row.document);
      assert.equal(boundary.extensionUpgradeNeeded(stored.document), false); assert.deepEqual(boundary.extensionUpgradeNotes(stored.document), []);
      stored.document.legacySynthetic = ['Kept from an old document'];
      assert.equal(storageUpgradeNeeded(stored), true, 'a stored row a package must upgrade is stored again'); assert.deepEqual(boundary.extensionUpgradeNotes(stored.document), [SYNTHETIC.upgradeNote]);
      const saved = await storeStorageUpgrade(env, {owner: A, actor: A, role: 'owner'}, pid, row, stored, withFinalReview(stored.document)); assert.ok(saved, 'the upgraded document is stored');
      const events = (await env.DB.prepare('SELECT document FROM project_activity WHERE owner_id=? AND project_id=?').bind(A, pid).all()).results.map(r => JSON.parse(r.document)).filter(e => e.kind === 'storage');
      assert.equal(events.length, 1); assert.ok(events[0].summary.endsWith('the previous version is kept for recovery. ' + SYNTHETIC.upgradeNote), 'the activity states the package\'s step after the storage upgrade\'s own words: ' + events[0].summary.slice(-160));
      state = await (await api('/api/project' + q)).json(); assert.equal(state.revision, saved.revision); assert.deepEqual(state.document.synthetic.records.map(x => x.title), ['Kept from an old document'], 'and the next read answers the upgraded document'); assert.ok(!('legacySynthetic' in state.document));
      const again = await readStoredProject(env, A, (await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(A, pid).first()).document); assert.equal(boundary.extensionUpgradeNeeded(again.document), false, 'once'); }
    // the project store awaits the package a document needs before it settles the document
    let loads = 0, settledAtNeeds = null; const realFetch = globalThis.fetch;
    const stub = {id: 'zz-synthetic-route', needs: p => { settledAtNeeds = isSettled(p); return !!p.synthetic; }, load: async () => { loads++; }};
    assert.deepEqual(boundary.extensionIssues(stub), []); X.registerExtension(stub);
    globalThis.fetch = (url, options = {}) => { const headers = new Headers(options.headers); headers.set('oai-authenticated-user-id', A); if (options.method === 'POST') headers.set('Origin', 'https://aiw.test'); return worker.fetch(new Request(new URL(url, 'https://aiw.test'), {...options, headers}), env); };
    try {
      const store = createProjectStore(); await store.load();
      assert.ok(store.value.document.synthetic, 'the store read the project that holds the records');
      assert.equal(loads, 1, 'reading a project that holds the package\'s records loads the package first'); assert.equal(settledAtNeeds, false, 'before the document is settled'); assert.equal(isSettled(store.value.document), true);
      await store.command({type: 'synthetic.note', payload: {id: store.value.document.synthetic.records[0].id, note: 'from the store'}});
      assert.equal(loads, 2, 'and a save\'s answer is checked the same way before it is settled'); assert.equal(isSettled(store.value.document), true);
    } finally { globalThis.fetch = realFetch; }
  } finally { env.DB.close(); }
  // staging: a design edit marked staged is applied by the same handler; a person-only or second-person type never is
  const p = reference('bank-payment');
  const staged = applyCanonical(p, {type: 'synthetic.save', payload: {title: 'Staged'}}, AT, A); assert.equal(staged.document.synthetic.records[0].title, 'Staged'); assert.ok(!('synthetic' in p), 'the caller\'s document is not changed');
  assert.throws(() => applyCanonical(p, {type: 'synthetic.sign', payload: {id: 'SYN-001'}}, AT, A), /chapter review workflow/); assert.throws(() => applyCanonical(p, {type: 'synthetic.accept', payload: {id: 'SYN-001'}}, AT, A), /chapter review workflow/); assert.throws(() => applyCanonical(p, {type: 'synthetic.note', payload: {id: 'SYN-001'}}, AT, A), /chapter review workflow/);
  assert.throws(() => applyCanonical(p, {type: 'hostile.sign', payload: {}}, AT, A), /chapter review workflow/, 'even when its package marks it staged'); assert.throws(() => applyCanonical(p, {type: 'hostile.accept', payload: {}}, AT, A), /chapter review workflow/);
  // one reading of "may be staged" for the staged path, the workbench's change review and a single edit's review
  assert.equal(stagedBy('synthetic.save'), SYNTHETIC.commands['synthetic.save'], 'the package\'s command, where it says it is a design edit'); assert.equal(reviewsOnItsOwn('synthetic.save'), true, 'a single edit of it is reviewed as a built-in design edit is');
  for (const type of ['synthetic.sign', 'synthetic.accept', 'synthetic.note', 'hostile.sign', 'hostile.accept', 'synthetic.nope', 'constructor', 'toString']) { assert.equal(stagedBy(type), undefined, type + ' is not staged'); assert.equal(reviewsOnItsOwn(type), false); }
  assert.equal(reviewsOnItsOwn('quality.driver'), true); assert.equal(reviewsOnItsOwn('decision.choose'), false, 'the built-in rule is as it was');
  assert.ok(/commands\.some\(c=>!stagedBy\(c\.type\)\)/.test(readFileSync('public/workbench-ui.js', 'utf8')), 'the workbench reviews what the staged path applies');
  assert.ok(!STAGED_COMMANDS.has('synthetic.sign')); assert.ok(!STAGED_COMMANDS.has('synthetic.save'), 'the built-in list is as it was'); assert.ok(isReviewCommand('synthetic.sign') && isReviewCommand('synthetic.accept') && !isReviewCommand('synthetic.save'), 'authorship.js classifies the person-only types as review commands');
  assert.equal(commandShape({type: 'synthetic.save', payload: {}}), null); assert.equal(commandShape({type: 'synthetic.nope'})?.code, 'unknown_command');
  pass('2: synthetic.save applies through POST /api/commands, is journalled with actor and author kind, stamped and listed in the activity; synthetic.note is undone by its receipt; synthetic.sign is refused for an agent account, a draft by Sol and an import; synthetic.accept is refused for every author and accepted for a second person; staged only when a plain design edit');
});

// ---------------------------------------------------------------- the routes, for the cases below
// A server with the reference project and four accounts (three persons and an agent account).
async function harness() {
  const files = new Map(), FILES = {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k)} : null; }, async delete(k) { files.delete(k); }};
  const env = {DB: localDatabase(':memory:'), FILES, ASSETS: {fetch: () => new Response('asset')}, AIW_AGENT_ACTORS: AGENT};
  const api = (path, method = 'GET', body = null, owner = A) => { const headers = new Headers({'oai-authenticated-user-id': owner}); if (body) { headers.set('Content-Type', 'application/json'); headers.set('Origin', 'https://aiw.test'); } return worker.fetch(new Request('https://aiw.test' + path, {method, headers, ...(body ? {body: JSON.stringify(body)} : {})}), env); };
  const h = {env, api, files, state: await (await api('/api/project')).json()};
  h.pid = h.state.document.id; h.q = '?project=' + encodeURIComponent(h.pid);
  for (const actorId of [B, C, AGENT]) assert.equal((await api('/api/access' + h.q, 'POST', {actorId, role: 'editor'})).status, 200);
  h.read = async (as = A) => (h.state = await (await api('/api/project' + h.q, 'GET', null, as)).json());
  h.send = async (type, payload, as = A, extra = {}) => { const cur = await h.read(as), res = await api('/api/commands' + h.q, 'POST', {revision: cur.revision, command: {type, payload}, ...extra}, as), body = await res.json(); if (res.status === 200) h.state = body; return {status: res.status, body, error: body.error || ''}; };
  h.rec = id => h.state.document.synthetic.records.find(x => x.id === id);
  h.last = () => h.state.document.synthetic.records.at(-1).id;
  h.close = () => env.DB.close();
  return h;
}

// ---------------------------------------------------------------- D1. a second person's step needs two persons
await block('D1 two persons', async () => {
  need();
  const h = await harness(), {send, rec} = h, accept = (id, as, type = 'synthetic.accept') => send(type, {id, reviewed: true}, as);
  const refused = async (id, as, why, type) => {
    const r = await accept(id, as, type); assert.equal(r.status, 400, why + ': ' + JSON.stringify(r.body).slice(0, 200));
    assert.match(r.error, /A second person.s step needs two persons/, why); assert.match(r.error, new RegExp('A second signed-in person saves or confirms ' + id + ' first\\.'), 'the refusal says what must happen first');
    assert.ok(!/synthetic|action|verif/i.test(r.error), 'in words that fit any package: ' + r.error); assert.equal(rec(id).acceptance, undefined, 'nothing is accepted by a refused request');
  };
  try {
    // written only by an agent account: one person accepting it is one person, not two
    assert.equal((await send('synthetic.save', {title: 'Written by the agent account'}, AGENT)).status, 200); const agentOnly = h.last();
    assert.deepEqual([rec(agentOnly).actor, rec(agentOnly).provenance.author.kind], [AGENT, 'sol-draft']);
    await refused(agentOnly, A, 'a record only an agent account wrote');
    // a draft by Sol sent from a person's session, not reviewed
    assert.equal((await send('synthetic.save', {title: 'Drafted by Sol in a person\'s session'}, B, {authorKind: 'sol-draft'})).status, 200); const solDraft = h.last();
    assert.equal(rec(solDraft).provenance.author.kind, 'sol-draft');
    await refused(solDraft, A, 'a draft by Sol nobody reviewed');
    // written by a person, then rewritten by the agent account: no person stands behind the record as it stands
    assert.equal((await send('synthetic.save', {title: 'Written by a person'})).status, 200); const rewritten = h.last();
    assert.equal((await send('synthetic.save', {id: rewritten, title: 'Rewritten by the agent account'}, AGENT)).status, 200);
    assert.equal(rec(rewritten).provenance.author.kind, 'sol-draft');
    await refused(rewritten, B, 'a person\'s record an agent account rewrote');
    // an import
    assert.equal((await send('synthetic.save', {title: 'Imported'}, B, {authorKind: 'import'})).status, 200); const imported = h.last();
    await refused(imported, A, 'an imported record');
    await refused(imported, A, 'a projection of the record: the stamp is read from the collection the package states', 'synthetic.endorse');
    // once a second person has saved it
    assert.equal((await send('synthetic.save', {id: agentOnly, title: 'Saved by a second person'}, B)).status, 200);
    assert.deepEqual([rec(agentOnly).provenance.author.kind, rec(agentOnly).provenance.author.by], ['person', B]);
    { const r = await accept(agentOnly, A); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); assert.deepEqual([rec(agentOnly).acceptance.actor, rec(agentOnly).acceptance.account], [A, 'person'], 'the boundary hands the author\'s account kind to apply, which keeps it on the step'); }
    { const r = await accept(agentOnly, C, 'synthetic.endorse'); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); assert.equal(rec(agentOnly).endorsement.actor, C); }
    // once a second person has confirmed it; the one who confirmed is one person
    assert.equal((await send('synthetic.confirm', {id: solDraft}, C)).status, 200);
    assert.deepEqual([rec(solDraft).provenance.author.kind, rec(solDraft).provenance.reviewed?.by, rec(solDraft).provenance.reviewed?.how], ['sol-draft', C, 'confirmed']);
    await refused(solDraft, C, 'the person who confirmed it is one person');
    { const r = await accept(solDraft, A); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); assert.equal(rec(solDraft).acceptance.actor, A); }
    // a confirmation holds for the record as it was confirmed: rewritten by the agent account, it is gone
    assert.equal((await send('synthetic.confirm', {id: imported}, C)).status, 200);
    assert.equal((await send('synthetic.save', {id: imported, title: 'Imported, confirmed, then rewritten'}, AGENT)).status, 200);
    await refused(imported, A, 'a confirmation of what the record no longer says');
    // the author is still refused first, by the one rule (verifierRefusal)
    assert.match((await accept(agentOnly, B)).error, /architect-b wrote /);
  } finally { h.close(); }
  // a record restored from elsewhere: its stamp is history there, not a person behind it on this workbench
  { let p = withSynthetic(reference('bank-payment'), {title: 'Stamped elsewhere'}, B); p.synthetic.records[0].provenance = {author: {kind: 'person', by: B, at: '2026-09-01T09:00:00.000Z'}};
    const author = {kind: 'person', id: A, account: 'person', reviewed: true}, run = q => commandHandler('synthetic.accept')(documentCopy(q), {type: 'synthetic.accept', payload: {id: 'SYN-001', reviewed: true}}, AT, A, {author});
    assert.equal(run(withFinalReview(p)).document.synthetic.records[0].acceptance.actor, A, 'a person\'s stamp of this workbench stands');
    p = withFinalReview(p); p.finalReview.imported = {at: '2026-09-15T09:00:00.000Z', by: A};
    assert.throws(() => run(p), /needs two persons/, 'a stamp from before the project was restored here is history'); }
  // the start check: a second person's type states the collection it acts on, so the boundary can read the stamp
  assert.ok(boundary.extensionIssues({id: 'xy', commands: {'xy.accept': {apply() {}, second: () => null}}}).some(i => /command “xy\.accept” is a second person.s step: the package states provenance\.paths/.test(i)), 'a second type without provenance.paths is refused at start');
  assert.ok(boundary.extensionIssues({id: 'xy', commands: {'xy.accept': {apply() {}, second: () => null}}, provenance: {paths: {xy: []}}}).some(i => /states provenance\.paths/.test(i)), 'an empty list states none');
  assert.deepEqual(boundary.extensionIssues({id: 'xy', commands: {'xy.accept': {apply() {}, second: () => null}}, provenance: {paths: {xy: ['xy.records']}}}), []);
  assert.deepEqual(boundary.extensionIssues({id: 'xy', commands: {'xy.accept': {apply() {}, second: () => null}}, provenance: {paths: {'xy.accept': ['xy.records']}}}), []);
  pass('D1: a second person\'s step is refused, in words that fit any package, while no person other than the actor stands behind the record as it stands (written by an agent account, drafted by Sol, rewritten by an agent, imported, restored from elsewhere), and is taken once a second person has saved or confirmed it; a projection is read against the stored record\'s stamp; a second type states provenance.paths');
});

// ---------------------------------------------------------------- D3. the keys the workbench itself writes
await block('D3 workbench keys', async () => {
  need();
  const K = boundary.WORKBENCH_KEYS; assert.ok(K && Object.isFrozen(K), 'one statement of the keys the workbench itself writes (design-extension-parts.js WORKBENCH_KEYS)');
  // every key of a document is in the statement: a top-level key, and each key of a container a package may add to
  const hold = (p, what) => { for (const [k, v] of Object.entries(p)) { assert.ok(Object.hasOwn(K, k), what + ': the statement names the key “' + k + '”'); if (K[k] && v && typeof v === 'object' && !Array.isArray(v)) for (const b of Object.keys(v)) assert.ok(K[k].includes(b), what + ': the statement names “' + k + '.' + b + '”'); } };
  const templates = ['blank', 'bank-payment', ...REFERENCE_PROJECTS.map(r => r.id)];
  assert.ok(templates.length >= 7, 'every template: ' + templates.join(', '));
  for (const t of templates) hold(withFinalReview(createProject({name: t, template: t}, t, AT)), 'template ' + t);
  hold(withFinalReview(createProject({name: 'From a brief', template: 'blank', brief: 'Customers pay invoices online within two seconds. The system keeps an audit trail of every payment.'}, 'from-a-brief', AT, {briefHash: 'a'.repeat(64)})), 'a blank project from a brief');
  // and of a document after the built-in command families that make a container the first time they write
  const h = await harness(), d = () => h.state.document, ok = async (type, payload, extra) => { const r = await h.send(type, payload, A, extra); assert.equal(r.status, 200, type + ': ' + r.error); };
  try {
    await ok('guide.start', {chapter: 1});
    await ok('interfaces.invariant', {title: 'Postings balance', condition: 'For every posting, debits equal credits.', kind: 'balance', dataIds: [d().interfaces.data[0].id], contractIds: [d().interfaces.contracts[0].id], check: 'Reconcile debits and credits at the end of each day.', owner: 'Finance operations'});
    await ok('review.action', {title: 'Rehearse the cut-over', owner: 'Delivery lead', due: '2027-12-01', acceptance: 'A rehearsal record signed by the delivery lead.', objectIds: ['REQ-001'], status: 'Planned'});
    await ok('requirements.group', {title: 'Payment entry', kind: 'module', memberIds: ['REQ-001', 'REQ-002']});
    await ok('lens.choose', {lensId: 'core-banking', reason: 'A bank.'});
    await ok('record.retire', {id: d().interfaces.invariants.at(-1).id, reason: 'Retired for the key statement.'});
    { const commands = [{type: 'decision.save', payload: {...d().decisions.records[0], title: d().decisions.records[0].title + ' (alternative)'}}];
      await ok('workspace.alternative', {commands, stamp: previewScenarioAlternative(d(), commands, undefined).stamp, title: 'An alternative', reason: 'For the key statement.'});
      const a = d().workbench.alternatives.at(-1); await ok('workspace.merge', {id: a.id, stamp: rebaseWorkingAlternative(d(), a).stamp, reviewed: true, reason: 'Merged for the key statement.'}); }
    await h.read(); for (const key of ['guidance', 'requirementGroups', 'retired', 'workbench']) assert.ok(key in d(), 'the walk made “' + key + '”'); assert.ok(d().interfaces.invariants && d().workspace.domainLens);
    hold(d(), 'after the built-in command families');
  } finally { h.close(); }
  // a path on such a key is refused at start, as a lifecycle collection and as a collection of the provenance reader
  for (const path of ['changes.events', 'retired.records', 'finalReview.baselines', 'finalReview.dispositions', 'finalReview.actions', 'finalReview.reviews', 'workbench.history', 'workbench.alternatives', 'knowledge.claims', 'coauthoring.sources', 'assurance.records', 'security.risks', 'runtime.evidence', 'roadmap.plateaus', 'intake.datasets', 'workspace.members', 'evidence.sources', 'workspace.packages', 'artefacts', 'decisions.records', 'modelAlternatives']) {
    assert.ok(boundary.extensionIssues({id: 'xy', lifecycle: {[path]: 3}}).some(i => i.includes('collection “' + path + '” is on a key the workbench itself writes')), path + ' is no lifecycle collection of a package');
    assert.ok(boundary.extensionIssues({id: 'xy', provenance: {records: {[path]: 3}}}).some(i => i.includes('collection “' + path + '” is on a key the workbench itself writes')), path + ' is no collection a package states for the provenance reader');
  }
  // and as an evidence key: it stays in the design
  for (const key of ['brief.interpreted', 'retired', 'modelContext', 'knowledge', 'intake', 'workspace.governance', 'workspace.packages', 'quality.drivers', 'runtime.evidence', 'finalReview.objectives', 'changes.things', 'dataOwnership', 'readingsDefinition', 'knowledge.claims', 'interfaces.specifications']) assert.ok(boundary.extensionIssues({id: 'xy', evidenceKeys: [key]}).some(i => i.includes('evidence key “' + key + '” is a key the workbench keeps')), key + ' stays in the design');
  // a package's own key, and a new key of a chapter's container or of the knowledge workspace, stay allowed
  assert.deepEqual(boundary.extensionIssues({id: 'xy', lifecycle: {'runtime.nodes': 10, 'technology.domains': 6, 'adoptions.records': 3}, provenance: {records: {'knowledge.concepts': 11, 'workloads.models': 2}}, designKeys: ['adoptions', 'runtime.nodes', 'knowledge.concepts'], evidenceKeys: ['runtime.nodeEvidence', 'knowledge.library', 'adoptions.observations', 'workloadMigration']}), []);
  pass('D3: one statement of the keys the workbench itself writes holds every key of the ' + templates.length + ' templates and of a document after the command families that make a container; a lifecycle path, a provenance.records path or an evidence key on such a key is refused at start; a new key of a chapter container stays allowed');
});

// ---------------------------------------------------------------- D4. a package's tracker, for every commit
await block('D4 tracker', async () => {
  need();
  const h = await harness(), {send} = h, d = () => h.state.document, invariant = async title => { const r = await send('interfaces.invariant', {title, condition: 'For every posting, debits equal credits.', kind: 'balance', dataIds: [d().interfaces.data[0].id], contractIds: [d().interfaces.contracts[0].id], check: 'Reconcile at the end of each day.', owner: 'Finance operations'}); assert.equal(r.status, 200, r.error); return d().interfaces.invariants.at(-1).id; };
  try {
    // a document without the package's records: the tracker writes nothing, whatever the command
    const first = await invariant('Before any synthetic record');
    assert.equal((await send('record.retire', {id: first, reason: 'No synthetic record yet.'})).status, 200);
    assert.ok(!('synthetic' in d()), 'no key of the package exists'); assert.ok(!d().changes.events.some(e => e.source?.kind === 'synthetic'), 'and no event of its');
    // its own command, sent on its own
    assert.equal((await send('synthetic.save', {title: 'Tracked'})).status, 200);
    assert.deepEqual(d().synthetic.tracked, ['synthetic.save']); assert.equal(d().changes.events.at(-1).source.kind, 'synthetic');
    // a built-in command: the tracker is called after the built-in trackers, what it writes is in the same commit and is journalled
    const second = await invariant('While a synthetic record exists'), revision = h.state.revision, events = d().changes.events.length;
    assert.equal(d().synthetic.tracked.at(-1), 'interfaces.invariant', 'a built-in save reaches the package\'s tracker');
    const retired = await send('record.retire', {id: second, reason: 'A built-in retirement the package reads.'}); assert.equal(retired.status, 200, retired.error);
    assert.equal(h.state.revision, revision + 1, 'one commit'); assert.equal(d().synthetic.tracked.at(-1), 'record.retire', 'a built-in retirement reaches it');
    const added = d().changes.events.slice(events), mine = added.filter(e => e.source?.kind === 'synthetic');
    assert.equal(mine.length, 1, 'its event is in that commit\'s journal'); assert.equal(added.at(-1), mine[0], 'after what the built-in trackers wrote'); assert.equal(mine[0].fields[0].after, second);
    assert.deepEqual([mine[0].actor, mine[0].authorKind, mine[0].reviewed], [A, 'person', true], 'stamped by the boundary with who and of what kind');
    const activity = JSON.stringify(await (await h.api('/api/activity' + h.q)).json()); assert.ok(activity.includes(mine[0].id), 'the activity row of the commit names the change');
    // a batch: the batch itself and each inner command, the built-in ones too
    { const commands = [{type: 'decision.save', payload: {...d().decisions.records[0], title: d().decisions.records[0].title + ' (tracked)'}}, {type: 'synthetic.save', payload: {title: 'Tracked in a batch'}}], n = d().synthetic.tracked.length;
      const batch = await send('workspace.apply', {commands, stamp: previewWorkingChange(d(), commands).stamp, reviewed: true, reason: 'A batch the tracker reads.'}); assert.equal(batch.status, 200, batch.error);
      assert.deepEqual(d().synthetic.tracked.slice(n), ['workspace.apply', 'decision.save', 'synthetic.save']); }
    // a merge, and a step of the knowledge family
    { const commands = [{type: 'decision.save', payload: {...d().decisions.records[0], title: d().decisions.records[0].title + ' (merged)'}}];
      assert.equal((await send('workspace.alternative', {commands, stamp: previewScenarioAlternative(d(), commands, undefined).stamp, title: 'An alternative', reason: 'For the tracker.'})).status, 200);
      const a = d().workbench.alternatives.at(-1), merged = await send('workspace.merge', {id: a.id, stamp: rebaseWorkingAlternative(d(), a).stamp, reviewed: true, reason: 'Merged for the tracker.'}); assert.equal(merged.status, 200, merged.error);
      assert.deepEqual(d().synthetic.tracked.slice(-2), ['workspace.alternative', 'workspace.merge']); }
    assert.equal((await send('guide.start', {chapter: 1})).status, 200); assert.equal(d().synthetic.tracked.at(-1), 'guide.start');
  } finally { h.close(); }
  // one way: the tracker is the package's, not a command's
  assert.ok(boundary.extensionIssues({id: 'xy', commands: {'xy.save': {apply() {}, track() {}}}}).some(i => /“track” is not a part of a command/.test(i)), 'a tracker is stated once, by the package');
  assert.deepEqual(boundary.extensionIssues({id: 'xy', track() {}}), []); assert.ok(boundary.extensionIssues({id: 'xy', track: true}).some(i => /track is a function/.test(i)));
  pass('D4: the package\'s tracker is called after the built-in trackers for every command (its own, a built-in save, record.retire, workspace.merge, a guide step) and for each inner command of a batch; what it writes is in the same commit, journalled and stamped; it writes nothing for a document without the package\'s records');
});

// ---------------------------------------------------------------- D5. the SDD's reading of who wrote the records
await block('D5 SDD provenance', () => {
  need();
  const p0 = reference('bank-payment'), r0 = provenanceReading(p0), base = architectureMarkdown(p0).markdown;
  // five records of a package, drafted by Sol and still proposals, and one a person wrote in a collection stated for the provenance reader alone
  let p = documentCopy(p0);
  p.synthetic = {version: 1, counter: 5, records: [1, 2, 3, 4, 5].map(n => ({id: 'SYN-00' + n, ref: 'SYN-00' + n, title: 'Drafted by Sol ' + n, requirementIds: [], componentId: 'none', revision: 1, state: 'proposed', provenance: {draft: {by: 'sol', engine: 'rules'}}}))};
  p.runtime.otherNotes = [{id: 'ON-001', ref: 'ON-001', title: 'A note a person wrote', provenance: {author: {kind: 'person', by: A, at: AT}}}];
  p = withFinalReview(p);
  const seen = []; eachRecord(p, (r, chapter, path) => { if (path === 'synthetic.records' || path === 'runtime.otherNotes') seen.push(r.id); }); assert.equal(seen.length, 6, 'the provenance reader reads all six');
  const r = provenanceReading(p), chapter = (x, n) => x.chapters.find(c => c.chapter === n);
  assert.equal(r.total, r0.total + 6, 'the SDD counts the packages\' records'); assert.equal(r.by.sol, r0.by.sol + 5, 'the five Sol drafted'); assert.equal(r.by.person, r0.by.person + 1);
  assert.equal(r.engines.rules, r0.engines.rules + 5); assert.equal(chapter(r, 3).sol, (chapter(r0, 3)?.sol || 0) + 5); assert.equal(chapter(r, 10).total, chapter(r0, 10).total + 1);
  assert.match(r.line, /5 records drafted by Sol, not reviewed by a person/, 'the cover line says so: ' + r.line); assert.ok(!/drafted by Sol/.test(r0.line));
  const text = architectureMarkdown(p).markdown, open = text.slice(text.indexOf('## B. Open items'), text.indexOf('## C. '));
  assert.notEqual(text, base, 'the architecture edition says so too');
  assert.match(open, /\*\*Drafted by Sol, to keep, change or retire\*\* \(synthetic record, awaiting a person\): 5 records, SYN-001–SYN-005\. Resolve in Chapter 3/, 'the open items list the drafts a person has yet to keep, change or retire, under the package\'s noun');
  assert.ok(!base.slice(base.indexOf('## B. Open items'), base.indexOf('## C. ')).includes('Drafted by Sol, to keep'), 'a document without such records prints as before (6b holds the whole text)');
  // a field a package's record keeps open is an open item under the package's noun
  { const q = documentCopy(p); q.synthetic.records[0] = {...q.synthetic.records[0], state: 'authored', provenance: undefined, open: {window: {state: 'open-question', question: 'Which window applies?'}}}; const t = architectureMarkdown(withFinalReview(q)).markdown; assert.match(t.slice(t.indexOf('## B. Open items'), t.indexOf('## C. ')), /SYN-001/, 'an open field of a package\'s record is listed'); }
  // a row a package states over a built-in collection is not read a second time (the hostile package states decisions.records)
  assert.deepEqual(boundary.packageCollections().map(x => x[0]).sort(), ['runtime.otherNotes', 'runtime.otherThings', 'synthetic.records']);
  pass('D5: the SDD\'s provenance reading and its open items read the packages\' collections: ' + r.total + ' records with ' + r.by.sol + ' drafted by Sol (' + r0.total + ' and ' + r0.by.sol + ' without them); a built-in collection a package names is not counted twice');
});

// ---------------------------------------------------------------- 3. checks and readiness
await block('3 checks and readiness', () => {
  need(); assert.ok(P, 'case 1 built the project');
  let p = withSynthetic(P, {title: 'Unbound and broken', broken: true}); p = withFinalReview(p);
  const own = decisionFindings(p), ids = own.map(f => f.id);
  assert.ok(ids.includes('synthetic-unbound:SYN-003') && ids.includes('synthetic-broken:SYN-003'), 'the finding is in the chapter\'s own checks');
  assert.deepEqual(CHAPTERS[2].checks(p).map(f => f.id), ids, 'the review reads the same list');
  const builtIn = decisionFindings(reference('bank-payment')).map(f => f.id); assert.deepEqual(ids.slice(0, builtIn.length), builtIn, 'after the chapter\'s own findings, which are as they were');
  const inherited = chapterInheritedFindings(p, 3), hard = inherited.find(f => f.id === 'C3:synthetic-broken:SYN-003'), soft = inherited.find(f => f.id === 'C3:synthetic-unbound:SYN-003');
  assert.ok(hard && soft); assert.equal(hard.hard, true); assert.equal(hard.objectId, 'SYN-003'); assert.ok(hard.stamp && soft.stamp);
  assert.ok(inheritedFindings(p).some(f => f.id === hard.id));
  const C = chapterChecks(p, 3), flat = JSON.stringify(C);
  assert.ok(flat.includes('The synthetic invariant is broken') && flat.includes('Bind the synthetic record'), 'readiness shows both');
  const base = chapterChecks(P, 3); assert.equal(C.toFix, base.toFix + 1, 'the hard error is one more finding to fix'); assert.equal(C.toConfirm, base.toConfirm + 1);
  assert.equal(sddBoard(p).chapters.find(c => c.chapter === 3).toFix, C.toFix);
  assert.ok(reviewBlockers(p).some(f => f.id === hard.id)); assert.equal(reviewBlockerCount(p), reviewBlockerCount(P) + 1);
  // a hard finding takes no treatment at all; an ordinary one takes any
  assert.deepEqual(treatmentsFor(hard), []); assert.deepEqual(treatmentsFor(soft), DISPOSITIONS);
  for (const treatment of DISPOSITIONS) assert.throws(() => applyFinalReviewCommand(p, {type: 'review.disposition', payload: {findingId: hard.id, stamp: hard.stamp, treatment, rationale: 'Synthetic.', reviewer: 'A reviewer', reference: 'REF-1', reviewBy: '2099-01-01', reviewed: true}}, AT, A), /takes no treatment/, treatment + ' is refused for a hard finding');
  const treated = applyFinalReviewCommand(p, {type: 'review.disposition', payload: {findingId: soft.id, stamp: soft.stamp, treatment: 'Not applicable', rationale: 'Synthetic.', reviewer: 'A reviewer', reference: 'REF-1', reviewed: true}}, AT, A).document;
  assert.equal(treated.finalReview.dispositions.length, 1, 'an ordinary finding of a package is treated as any other');
  assert.ok(reviewBlockers(treated).some(f => f.id === hard.id), 'and the hard one still blocks');
  // a package's finding in another chapter joins that chapter only
  const q = withFinalReview({...p, runtime: {...p.runtime, otherThings: [{id: 'OTH-001', ref: 'OTH-001', title: 'Other thing', syntheticId: 'SYN-001'}]}});
  assert.ok(CHAPTERS[9].checks(q).some(f => f.id === 'other-placed:OTH-001')); assert.ok(!CHAPTERS[9].checks(q).some(f => f.code?.startsWith('synthetic')));
  assert.deepEqual(CHAPTERS[2].checks(q).map(f => f.id).slice(-3), ['other-noted:OTH-001', 'synthetic-unbound:SYN-003', 'synthetic-broken:SYN-003'], 'two packages\' findings of one chapter are listed in the order of their ids');
  pass('3: the package\'s findings are in decisionFindings, the review\'s chapter checks, the inherited findings and readiness; the hard one is an error no treatment is offered for and review.disposition refuses every treatment of');
});

// ---------------------------------------------------------------- 4. lifecycle and provenance
await block('4 lifecycle', () => {
  need(); assert.ok(P && T0);
  let p = withSynthetic(P, {title: 'Depends on the first', dependsOn: 'SYN-001'}); p = withFinalReview(p);
  assert.ok(retirable(p, 'SYN-001', 3));
  assert.throws(() => applyRecordCommand(p, {type: 'record.retire', payload: {id: 'SYN-001', reason: 'No longer wanted.'}}, AT, A), /SYN-001 is still named by Chapter 3 · SYN-003/, 'a record another still names is not retired');
  assert.ok(referencesTo(p, T0.component).includes('Chapter 3 · SYN-001') && referencesTo(p, T0.requirement).includes('Chapter 3 · SYN-001'), 'a built-in record a package\'s record names is named by it, as by any record');
  const version = p.synthetic.version;
  const retired = withFinalReview(applyRecordCommand(p, {type: 'record.retire', payload: {id: 'SYN-003', reason: 'Synthetic retirement.'}}, AT, A).document);
  assert.deepEqual(retired.synthetic.records.map(r => r.id), ['SYN-001', 'SYN-002']); assert.equal(retired.synthetic.version, version + 1, 'the owning container\'s version moves, as a chapter\'s does');
  const kept = retired.retired.records.at(-1); assert.deepEqual({id: kept.id, path: kept.path, chapter: kept.chapter, actor: kept.actor, reason: kept.reason}, {id: 'SYN-003', path: 'synthetic.records', chapter: 3, actor: A, reason: 'Synthetic retirement.'});
  assert.ok(retiredRecords(retired, 3).some(x => x.id === 'SYN-003')); assert.ok(!recordGraph(retired).objects.has('SYN-003'), 'a retired record leaves every reader');
  const restored = withFinalReview(applyRecordCommand(retired, {type: 'record.restore', payload: {id: 'SYN-003'}}, AT, A).document);
  assert.deepEqual(restored.synthetic.records.map(r => r.id), ['SYN-001', 'SYN-002', 'SYN-003']); assert.deepEqual(restored.synthetic.records[2], p.synthetic.records[2], 'restored as it was'); assert.ok(recordGraph(restored).objects.has('SYN-003'));
  assert.equal(applyCanonical(p, {type: 'record.retire', payload: {id: 'SYN-003', reason: 'Staged retirement.'}}, AT, A).document.synthetic.records.length, 2, 'the staged path is the same family');
  // provenance reads the collection
  const seen = []; eachRecord(p, (r, chapter, path) => { if (path === 'synthetic.records') seen.push([r.id, chapter]); });
  assert.deepEqual(seen, [['SYN-001', 3], ['SYN-002', 3], ['SYN-003', 3]]); assert.equal(findRecord(p, 3, 'SYN-002').path, 'synthetic.records');
  // a collection a package states for the provenance reader only: read there, never retired by the family, and its
  // records stop no retirement
  const noted = withFinalReview({...p, runtime: {...p.runtime, otherNotes: [{id: 'ON-001', ref: 'ON-001', title: 'A note on the third', syntheticId: 'SYN-003'}]}}), notes = [];
  eachRecord(noted, (r, chapter, path, link) => { if (path === 'runtime.otherNotes') notes.push([r.id, chapter, link]); });
  assert.deepEqual(notes, [['ON-001', 10, false]], 'the provenance reader reads it'); assert.equal(findRecord(noted, 10, 'ON-001').path, 'runtime.otherNotes'); assert.equal(RECORD_NOUNS['runtime.otherNotes'], 'other note');
  assert.ok(!COLLECTIONS.some(([path]) => path === 'runtime.otherNotes'), 'it is no lifecycle collection');
  assert.throws(() => applyRecordCommand(noted, {type: 'record.retire', payload: {id: 'ON-001', reason: 'Not the family\'s to retire.'}}, AT, A), /ON-001 no longer exists/);
  assert.ok(!referencesTo(noted, 'SYN-003').some(x => /ON-001/.test(x)));
  assert.equal(applyRecordCommand(noted, {type: 'record.retire', payload: {id: 'SYN-003', reason: 'Named only by a note.'}}, AT, A).document.synthetic.records.length, 2, 'a record only such a record names retires');
  pass('4: a synthetic record retires and restores through record.retire and record.restore with who, when and why; a named record is refused; the provenance reader lists the collection');
});

// ---------------------------------------------------------------- 5. design and evidence keys
await block('5 design fingerprint', () => {
  need(); assert.ok(P);
  const p0 = reference('bank-payment'), d0 = reviewSourceStamp(p0), e0 = evidenceStamp(p0);
  assert.notEqual(reviewSourceStamp(P), d0, 'writing the first record moves the design fingerprint');
  const edited = withFinalReview(applySynthetic(documentCopy(P), {type: 'synthetic.save', payload: {id: 'SYN-001', title: 'Renamed', requirementIds: P.synthetic.records[0].requirementIds, componentId: P.synthetic.records[0].componentId}}, AT, A).document);
  assert.notEqual(reviewSourceStamp(edited), reviewSourceStamp(P), 'a design key moves it');
  const observed = withFinalReview(applySynthetic(documentCopy(P), {type: 'synthetic.observe', payload: {id: 'SYN-001', text: 'Observed once.'}}, AT, A).document);
  assert.ok(observed.synthetic.observations.length === 1 && observed.syntheticLog.length === 1);
  assert.equal(reviewSourceStamp(observed), reviewSourceStamp(P), 'an evidence key does not, nested in the package\'s container or beside the design');
  assert.notEqual(evidenceStamp(observed), evidenceStamp(P), 'it moves the evidence fingerprint'); assert.equal(evidenceStamp(reference('bank-payment')), e0);
  const moved = withFinalReview({...P, runtime: {...P.runtime, otherThings: [{id: 'OTH-001', title: 'Other thing'}]}}); assert.notEqual(reviewSourceStamp(moved), reviewSourceStamp(P), 'a design key inside a chapter moves it');
  // bookkeeping beside the design (an object a package leaves out of the design): neither fingerprint reads it
  const kept = withFinalReview({...P, syntheticMigration: {definition: 1, toConfirm: [{id: 'LS-001', stamp: 'x'}]}});
  assert.equal(reviewSourceStamp(kept), reviewSourceStamp(P), 'an object a package leaves out of the design moves no design stamp'); assert.equal(evidenceStamp(kept), evidenceStamp(P), 'and is not evidence either');
  assert.notEqual(reviewSourceStamp(withFinalReview({...P, syntheticUnstated: {definition: 1}})), reviewSourceStamp(P), 'a key no package leaves out is design, as any key is');
  pass('5: synthetic (design) moves reviewSourceStamp; synthetic.observations and syntheticLog (evidence lists) leave it and move evidenceStamp; syntheticMigration (an object left out) moves neither');
});

// ---------------------------------------------------------------- upgrade, sections
await block('upgrade and sections', () => {
  need(); assert.ok(P);
  const old = {...reference('bank-payment'), legacySynthetic: ['Kept from an old document']};
  assert.equal(boundary.extensionUpgradeNeeded(old), true);
  const up = withFinalReview(old); assert.equal(up.synthetic?.records?.[0]?.title, 'Kept from an old document', 'the read upgrade chain runs the package\'s step'); assert.ok(!('legacySynthetic' in up));
  assert.equal(boundary.upgradeExtensions(up), up, 'idempotent: an upgraded document passes through');
  assert.deepEqual(boundary.extensionUpgradeNotes(old), [SYNTHETIC.upgradeNote]); assert.deepEqual(boundary.extensionUpgradeNotes(up), [], 'a note is given only for a document the step changes');
  { const fresh = reference('bank-payment'), frozen = JSON.stringify(fresh); boundary.upgradeExtensions(fresh); boundary.extensionUpgradeNeeded({...fresh, legacySynthetic: ['x']}); assert.equal(JSON.stringify(fresh), frozen, 'a step changes no document it is handed'); }
  const registers = boundary.placeSections('registers', assembleSDD(P), P), at = registers.indexOf('### Synthetic register'), perf = registers.indexOf('## Performance specification'), next = registers.indexOf('\n## ', perf + 5);
  assert.ok(perf >= 0 && at > perf && at < next, 'the section stands at the end of the section its anchor names');
  assert.equal(registers.replace('### Synthetic register\n\n- SYN-001 · First synthetic record\n- SYN-002 · Bound, named by no requirement\n\n', ''), assembleSDD(P), 'and nothing else moves');
  assert.equal(boundary.placeSections('registers', '# T\n\n```\n## Performance specification\n```\n', P), '# T\n\n```\n## Performance specification\n```\n', 'a heading inside a code fence is no anchor');
  assert.ok(!registers.includes('NEVER PRINTED'), 'a section whose anchor is not printed is not printed');
  const all = architectureMarkdown(P), delivery = architectureMarkdown(P, {audience: 'delivery'});
  assert.match(all.markdown, /## E\. Provenance[\s\S]*Synthetic records: SYN-001, SYN-002\./); assert.ok(!delivery.markdown.includes('Synthetic records:'), 'an edition that does not print the anchor does not print the section');
  pass('upgrade and sections: the package\'s idempotent step runs in the read upgrade chain; its sections stand at their anchors in the registers and the architecture edition');
});

// ---------------------------------------------------------------- needs / load
await block('needs and load', async () => {
  need();
  let loads = 0;
  X.registerExtension({id: 'zz-lazy-route', needs: p => !!p.lazyThing, load: async () => { loads++; X.registerExtension({id: 'zz-lazy', objectTypes: {lazyThing: {label: 'Lazy thing', chapter: 2, level: 'intent', prefix: 'LZ'}}}); }});
  assert.equal(OBJECT_TYPES.lazyThing, undefined, 'the route knows only whether a document needs the package and how to load it');
  const plain = {document: reference('bank-payment'), revision: 1}, lazy = {document: {...reference('bank-payment'), lazyThing: {}}, revision: 2};
  assert.equal(await X.ensureExtensions(plain), plain, 'it answers the project it was handed'); assert.equal(loads, 0, 'a document without its records loads nothing');
  assert.equal(await X.ensureExtensions(lazy), lazy); assert.equal(loads, 1);
  assert.equal(OBJECT_TYPES.lazyThing?.label, 'Lazy thing', 'the loaded module registers the package');
  await X.ensureExtensions(lazy); assert.equal(loads, 2, 'load() is asked again for each document that needs it (a module import answers at once the second time)');
  assert.equal(X.EXTENSIONS.filter(e => e.id === 'zz-lazy').length, 1, 'and registering it again changes nothing');
  // the first registration under an id stands
  X.registerExtension({id: 'zz-lazy', objectTypes: {lazyThing: {label: 'Replaced', chapter: 9, level: 'protection', prefix: 'XX'}, another: {label: 'Another', chapter: 2, level: 'intent', prefix: 'AN'}}});
  assert.equal(OBJECT_TYPES.lazyThing.label, 'Lazy thing'); assert.equal(OBJECT_TYPES.another, undefined, 'a second registration under an id adds and replaces nothing');
  const src = readFileSync('public/project-store.js', 'utf8'); assert.ok((src.match(/await ensureExtensions\(await /g) || []).length === 2, 'the project store awaits it where it reads a project and where a save answers');
  // the browser's list of packages (the route stubs) is read by the project store, and never by the entry script, whose own dynamic imports are measured as the route
  assert.ok(src.includes("import './design-package-routes.js';")); assert.ok(!readFileSync('public/entry.js', 'utf8').includes('design-package-routes'));
  assert.ok(!/^\s*(?:import|registerExtension)\b/m.test(readFileSync('public/design-package-routes.js', 'utf8')) && !/^\s*import\b/m.test(readFileSync('design-packages.js', 'utf8')), 'no package exists at this slice: neither list names one');
  pass('needs and load: ensureExtensions loads a package only for a document that holds its records; the first registration under an id stands');
});

// ---------------------------------------------------------------- 7. twice, and in another order
await block('7 idempotent and order-free', () => {
  need();
  const run = order => { const r = spawnSync(process.execPath, [process.argv[1], '--probe', order], {encoding: 'utf8', maxBuffer: 1 << 26}); assert.equal(r.status, 0, 'probe ' + order + ': ' + r.stderr.slice(0, 400)); const out = JSON.parse(r.stdout.trim().split('\n').at(-1)); delete out.order; return JSON.stringify(out); };
  const base = run('hos');
  for (const order of ['soh', 'ohs', 'hhoossoh', 'shosho']) assert.equal(run(order), base, 'registered as ' + order + ': the same types, collections, layers, nouns and readings as h, o, s');
  const out = JSON.parse(base); assert.deepEqual(out.extensions, ['aa-hostile', 'mm-other', 'zz-synthetic']);
  for (const k of Object.keys(golden.readings['clinic-appointments'])) assert.equal(out.plain[k], golden.readings['clinic-appointments'][k]);
  assert.notEqual(out.readings.graph, golden.readings['bank-payment'].graph, 'the probe\'s document does hold the packages\' records');
  // the same object again, in this process: nothing moves
  const p = withFinalReview(withSynthetic(reference('bank-payment'), {title: 'Again'})), d = digests(p), types = Object.keys(OBJECT_TYPES).join(), layers = kernel.TRACE_LAYERS.join(), rows = JSON.stringify(COLLECTIONS), paths = JSON.stringify(RECORD_PATHS);
  X.registerExtension(SYNTHETIC); X.registerExtension(OTHER); X.registerExtension({...SYNTHETIC});
  assert.deepEqual(digests(withFinalReview(withSynthetic(reference('bank-payment'), {title: 'Again'}))), d); assert.equal(Object.keys(OBJECT_TYPES).join(), types); assert.equal(kernel.TRACE_LAYERS.join(), layers); assert.equal(JSON.stringify(COLLECTIONS), rows);
  // two packages stating one row: the first by id keeps it, and the server's start check names the clash
  assert.deepEqual(boundary.extensionConflicts(), [], 'the registered packages share no row');
  X.registerExtension({id: 'zzz-duplicate', objectTypes: {synthetic: {label: 'Duplicate', chapter: 4, level: 'logical', prefix: 'DUP'}, twin: {label: 'Twin', chapter: 4, level: 'logical', prefix: 'SYN'}}, layers: {synthetic: 'duplicate'}, lifecycle: {'synthetic.records': 4}, commands: {'synthetic.save': {apply() { throw Error('duplicate'); }}}, provenance: {nouns: {'synthetic.records': 'duplicate'}, paths: {}, records: {'synthetic.records': 9, 'runtime.otherNotes': 3}}});
  assert.equal(OBJECT_TYPES.synthetic.label, 'Synthetic record'); assert.equal(JSON.stringify(COLLECTIONS), rows); assert.equal(kernel.TRACE_LAYERS.join(), layers); assert.equal(RECORD_NOUNS['synthetic.records'], 'synthetic record'); assert.equal(boundary.extensionCommand('synthetic.save').apply, applySynthetic);
  assert.equal(JSON.stringify(RECORD_PATHS), paths, 'the provenance reader reads what it read'); assert.deepEqual([RECORD_PATHS.filter(r => r[0] === 'synthetic.records'), RECORD_PATHS.filter(r => r[0] === 'runtime.otherNotes')], [[['synthetic.records', 3]], [['runtime.otherNotes', 10]]], 'a collection another package states is read once, as its first package states it');
  const clashes = boundary.extensionConflicts(); assert.ok(clashes.length >= 7 && clashes.every(c => /zzz-duplicate/.test(c) && /zz-synthetic|mm-other/.test(c)), 'each clash names both packages: ' + clashes.join(' | '));
  assert.ok(clashes.some(c => /id prefix “SYN” is stated by zz-synthetic and by zzz-duplicate/.test(c)), 'two kinds of record never share an id prefix');
  assert.ok(clashes.some(c => /collection “runtime\.otherNotes” is stated by mm-other and by zzz-duplicate: mm-other keeps it/.test(c)) && clashes.some(c => /collection “synthetic\.records” is stated by zz-synthetic and by zzz-duplicate: zz-synthetic keeps it/.test(c)));
  X.registerExtension({id: 'ab-early', objectTypes: {early: {label: 'Early', chapter: 2, level: 'intent', prefix: 'EAR'}}, layers: {early: 'early'}, hops: [{layer: 'early', types: ['binds'], from: ['synthetic'], dir: 'in', ctx: true}]});
  assert.ok(boundary.extensionConflicts().some(c => /a hop of ab-early onto “early” comes from “synthetic”, which the walk reads later/.test(c)), 'a hop from a layer of a package later by id is named');
  pass('7: five registration orders, with repeats, in separate processes give the same object types, collections, layers, nouns and the same ten readings; registering again in this process changes nothing');
});

// ---------------------------------------------------------------- 8. the client build
// The client is built as build.mjs builds it (client-bundle.mjs bundleClient with its defaults), so the route figure is
// the one dist/client-size-report.json reports. The measurement at the slice is kept in audit/rc44/build-notes/s0-size.json
// (written by `node rc44-s0-extensions-validate.mjs --measure`, from the same build); the baseline figure is the build of
// 94dbd4f. Later slices add to the route, so the suite compares its own build with the evidence only when asked
// (AIW_S0_MEASURE=1, at the slice's own commit); the gates and the slice's recorded delta are checked always.
const BASELINE = {commit: '94dbd4f', chapters: 3228863, projects: 506102, scripts: 148, under10k: 53, css: 901873}, EVIDENCE = 'audit/rc44/build-notes/s0-size.json';
await block('8 client build', async () => {
  need();
  const {bundleClient, BUDGET} = await import('./client-bundle.mjs');
  const out = '.aiw-local/rc44-s0/client', built = await bundleClient(out), report = built.report;
  assert.deepEqual(report.violations, [], 'the client build passes every size gate');
  assert.equal(BUDGET.routes.chapters, 3233792, 'the chapters route cap is the one it was'); assert.equal(BUDGET.routes.projects, 1213 * 1024); assert.equal(BUDGET.scripts, 148); assert.equal(BUDGET.tiny, 61); assert.equal(BUDGET.css, 881 * 1024);
  const meta = JSON.parse(readFileSync(built.metafile, 'utf8')), on = Object.values(meta.outputs).flatMap(o => Object.entries(o.inputs || {})).filter(([i]) => i === 'public/design-extensions.js');
  assert.equal(on.length, 1, 'the registry is in one chunk'); assert.ok(on[0][1].bytesInOutput <= 300, 'and small: ' + on[0][1].bytesInOutput + ' B');
  for (const o of Object.values(meta.outputs)) for (const i of Object.keys(o.inputs || {})) assert.ok(!/design-extension-boundary|design-extension-parts|design-packages|rc44-s0/.test(i), i + ' is not in the client');
  const measured = {chapters: report.routes.chapters.code, projects: report.routes.projects.code, scripts: report.scripts, under10k: report.buckets.under10k, css: report.css, registry: on[0][1].bytesInOutput};
  if (process.argv.includes('--measure')) { mkdirSync('audit/rc44/build-notes', {recursive: true}); writeFileSync(EVIDENCE, JSON.stringify({schema: 'aiw.rc44.slice-size.v1', name: 'S0 shared registration', measuredWith: 'client-bundle.mjs bundleClient, as node build.mjs builds the client (dist/client-size-report.json: routes.chapters.code)', allowance: {chapters: 700, scripts: 148}, caps: {chapters: BUDGET.routes.chapters, projects: BUDGET.routes.projects, scripts: BUDGET.scripts, under10k: BUDGET.tiny, css: BUDGET.css}, baseline: BASELINE, slice: measured, delta: measured.chapters - BASELINE.chapters, projectsDelta: measured.projects - BASELINE.projects, headroomAfter: BUDGET.routes.chapters - measured.chapters}, null, 1) + '\n'); }
  assert.ok(existsSync(EVIDENCE), 'the slice\'s measurement is kept (node rc44-s0-extensions-validate.mjs --measure)');
  const size = JSON.parse(readFileSync(EVIDENCE, 'utf8'));
  assert.deepEqual(size.baseline, BASELINE, 'against the build of 94dbd4f'); assert.equal(size.slice.scripts, 148, '148 script files'); assert.equal(size.slice.under10k, BASELINE.under10k); assert.equal(size.slice.css, BASELINE.css, 'no stylesheet rule');
  assert.equal(size.delta, size.slice.chapters - size.baseline.chapters); assert.ok(size.delta > 0 && size.delta <= 700, 'the route delta measured at the slice is at most 700 B: ' + size.delta);
  assert.ok(size.slice.chapters <= BUDGET.routes.chapters);
  assert.ok(measured.chapters >= size.slice.chapters - 700, 'the route as built now is the slice\'s or a later one\'s: ' + measured.chapters);
  if (process.env.AIW_S0_MEASURE || process.argv.includes('--measure')) assert.deepEqual(measured, size.slice, 'at the slice\'s commit the build measures what the evidence says');
  pass('8: the client build passes every gate with the caps unchanged; S0 measured ' + size.delta + ' B on the chapters route (' + size.baseline.chapters + ' → ' + size.slice.chapters + ' of ' + BUDGET.routes.chapters + '), 148 script files; the registry is ' + on[0][1].bytesInOutput + ' B; this build: ' + measured.chapters + ' B');
});

assert.deepEqual(failed, [], 'every rc44 S0 block passes');
console.log(`rc44 S0 design extensions: ${checks.length} checks passed`);
