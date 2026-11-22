// AIW rc44, slice S0 (audit/rc44/BUILD-PLAN-2026-11-16.md section 4): the shared registration point. An optional design
// package tells the shared machinery what it adds through public/design-extensions.js (registerExtension), and the record
// graph, the trace kernel, the chapter checks, the command boundary, the lifecycle, the provenance reader, the design
// fingerprint, the read upgrade, the SDD and ARS assembly and the project store read it. The build holds real packages
// (the lead's ruling J11 of 2026-11-19: BUILD_PACKAGES below); the contract is proven with the suite's own: the
// extensions it registers are the synthetic ones this file defines. The suite proves the eight cases of the contract:
//   1 the record in the graph with its relations, on the requirement's trail and in linkedVia;
//   2 the command through the boundary: applied, journalled, stamped, undone, refused for an agent account when
//     person-only and for the author when second-person;
//   3 the finding in the chapter's checks and in readiness; a hard finding takes no waiver (the lead's rulings A1
//     and D11 of 2026-11-18, which correct the contract's "takes no disposition");
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
import {readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as R from './rc44-s0-readings.mjs';
const {REFERENCES, reference, readings, digests, AT} = R, {reviewListDocument = () => { throw Error('rc44-s0-readings.mjs gives a document with a review list (reviewListDocument)'); }, reviewListFindings, assertBuiltInTrailsUnchanged, assertFindingIdsUnique, opensWithRecords} = R;
import worker, {commandHandler, commandShape} from './worker.js';
import {localDatabase} from './local-db.js';
import {readStoredProject} from './project-storage.js';
import {storageUpgradeNeeded, storeStorageUpgrade} from './storage-upgrade.js';
import {withFinalReview, CHAPTERS, inheritedFindings, chapterInheritedFindings, reviewBlockers, reviewBlockerCount, treatmentsFor, DISPOSITIONS, applyFinalReviewCommand, reviewSourceStamp, reviewDesignStamp, reviewSource, evidenceStamp, assembleSDD, reviewRequirements, nonWaivable, NON_WAIVABLE, WAIVERS, findingTreatment, findingCause, causeFindings, causeFindingStamp} from './public/review-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyDecisionCommand} from './public/decisions-domain.js';
import {recordGraph, OBJECT_TYPES} from './public/record-graph.js';
import {architectureModel} from './public/architecture-model.js';
import * as kernel from './public/trace-kernel.js';
import {decisionFindings} from './public/decisions-domain.js';
import {chapterChecks, sddBoard} from './public/readiness-model.js';
import * as canonical from './public/canonical-command.js';
import {COLLECTIONS, retiredRecords, retirable, referencesTo} from './public/record-lifecycle.js';
import {eachRecord, findRecord, RECORD_NOUNS, RECORD_PATHS, authorship} from './public/provenance.js';
import {architectureMarkdown, provenanceReading} from './public/sdd-architecture.js';
import {isReviewCommand} from './authorship.js';
import {documentCopy, isSettled} from './public/document-memo.js';
import {createProjectStore} from './public/project-store.js';
import {previewWorkingChange, previewScenarioAlternative, rebaseWorkingAlternative} from './public/workbench-domain.js';
import {createProject} from './shared/projects-domain.js';
import {instantiateTemplate} from './project-lifecycle.js';
import {REFERENCE_PROJECTS} from './public/reference-projects.js';
import {TYPES as ARTEFACT_TYPES} from './public/requirements-domain.js';

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
// The build's own packages (the lead's ruling J11 of 2026-11-19: this suite holds with real packages registered). A
// package is one line of design-packages.js, which worker.js imports, and one route stub in
// public/design-package-routes.js, which project-store.js imports; this file imports both, so this process holds
// them before the suite registers its own. The ids are read from the two lists, never written here: BUILD_IDS is
// what the registry must hold of the build, and "nothing registered" is proven in a process that loads the registry
// and the readers without the server's package list (case 6a).
const codeLines = file => readFileSync(file, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
const STUB_LINE = /^registerExtension\(\{id:'([a-z][a-z0-9-]{1,60})-route',needs:[^;]+,load:\(\)=>import\('\.\/[a-z0-9-]+\.js'\)\}\);$/, SERVER_LINE = /^import '\.\/(?:public\/)?[a-z0-9-]+\.js';(?: \/\/ ([a-z][a-z0-9-]{1,60}):.*)?$/;
const BUILD_PACKAGES = codeLines('public/design-package-routes.js').map(l => STUB_LINE.exec(l)?.[1]).filter(Boolean), BUILD_IDS = [...BUILD_PACKAGES, ...BUILD_PACKAGES.map(id => id + '-route')].sort();
const withBuild = ids => [...BUILD_IDS, ...ids].sort();
// The modules that are a package's own (ruling J10): from the module each line of the server's list imports, every
// module it imports, directly or through its own, that no module of the workbench imports — but for the server's list,
// and for the lazy entry that holds the package, which imports the package's module for its registration alone (an
// import that takes no name from it).
function packageModules(files) {
  const imports = new Map(files.map(f => [f, [...readFileSync(f, 'utf8').matchAll(/^\s*(?:import|export)\b[^'"`;]*?['"]((?:\.\.?\/)[^'"]+\.js)['"]/gm)].map(m => ({bare: /^\s*import\s*['"]/.test(m[0]), to: new URL(m[1], 'file:///' + f).pathname.slice(1)}))]));
  const roots = codeLines('design-packages.js').map(l => /^import '\.\/([^']+)'/.exec(l)?.[1]).filter(Boolean), own = new Set();
  const walk = f => { if (own.has(f) || !imports.has(f)) return; own.add(f); for (const i of imports.get(f)) walk(i.to); }; roots.forEach(walk);
  for (let moved = true; moved;) { moved = false; for (const f of [...own]) for (const [from, list] of imports) if (!own.has(from) && from !== 'design-packages.js' && list.some(i => i.to === f && !i.bare)) { own.delete(f); moved = true; break; } }
  return own;
}
// The collections the build's packages state as their own (their lifecycle rows and the rows for the provenance reader).
const buildCollections = () => X.EXTENSIONS.filter(e => BUILD_PACKAGES.includes(e.id)).flatMap(e => [...Object.keys(e.lifecycle || {}), ...Object.keys(e.provenance?.records || {})]);

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
    // switched on by a case (rulings H3 and Y3): the staged handler journals the save itself, stating author fields of its own
    if (forge === 'staged') p.changes.events.push({id: 'CHG-' + String(++p.changes.counter).padStart(3, '0'), source: {chapter: 3, id: r.id, ref: r.id, kind: 'synthetic', title: r.title}, title: r.title, at, before: null, after: {title: r.title}, fields: [{key: 'staged', label: 'Journalled by the staged handler', before: null, after: r.id}], items: [], actor: 'architect-z', authorKind: 'person', reviewed: true, account: 'person', session: 'forged', reason: 'forged'});
    s.version++; return {document: p, selected: r.id};
  }
  if (command.type === 'synthetic.note') { const r = find(); r.note = String(raw.note || ''); s.version++; return {document: p, selected: r.id}; }
  if (command.type === 'synthetic.observe') { find(); (s.observations ??= []).push({id: raw.id, text: String(raw.text || ''), at}); (p.syntheticLog ??= []).push({id: raw.id, at}); return {document: p, selected: raw.id}; }
  if (command.type === 'synthetic.sign') { const r = find(); r.signed = {actor, at}; return {document: p, selected: r.id}; }
  // The step keeps who took it and with what kind of account, as the boundary hands them to apply (ruling D7.1).
  if (command.type === 'synthetic.accept') { const r = find(); if (raw.reviewed !== true) throw Error('Confirm the acceptance.'); r.acceptance = {actor, at, account: options?.author?.account ?? null}; return {document: p, selected: r.id}; }
  // Kept where the contract tells a package to keep a person's step: under the record's key `review`, which a project
  // made from a template resets and which is bookkeeping to the authorship stamps.
  if (command.type === 'synthetic.endorse') { const r = find(); r.review = {actor, at, account: options?.author?.account ?? null}; return {document: p, selected: r.id}; }
  if (command.type === 'synthetic.confirm') { const r = find(); r.confirmed = true; return {document: p, selected: r.id}; }
  // Two ways a command changes a record without the stamping being told (the verifier's probes on ruling D1): a type
  // under a prefix for which the package states no provenance.paths, and a command that names no record.
  if (command.type === 'syntheticaside.rewrite') { const r = find(); r.title = String(raw.title || ''); s.version++; return {document: p}; }
  if (command.type === 'synthetic.sweep') { for (const r of s.records) r.note = String(raw.note || ''); s.version++; return {document: p}; }
  throw Error('Unknown synthetic action.');
}
const STEP_UNDO = key => ({previous: (p, c) => ({id: c.payload.id, was: syn(p).find(r => r.id === c.payload.id)?.[key] ?? null}), revert(p, old) { const r = syn(p).find(x => x.id === old.id); if (!r) throw Error('The synthetic record changed.'); if (old.was) r[key] = old.was; else delete r[key]; return {document: p, selected: r.id}; }});
// What the cases below switch on to make the second package print a forged heading or state a finding under a taken id.
let forge = '';
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
    // What the type refuses by who writes the commit: a draft by Sol and an import mark no record broken, sent on its
    // own, in a batch or in an alternative.
    'synthetic.save': {apply: applySynthetic, staged: true, validate: (p, command, {author}) => (command.payload?.broken !== true || author?.kind === 'person' ? null : author?.kind === 'import' ? 'An import does not mark a synthetic record broken.' : 'A draft by Sol does not mark a synthetic record broken.')},
    'synthetic.note': {apply: applySynthetic, undo: {previous: (p, c) => ({id: c.payload.id, note: syn(p).find(r => r.id === c.payload.id)?.note ?? ''}), revert(p, was) { const r = syn(p).find(x => x.id === was.id); if (!r) throw Error('The synthetic record changed.'); r.note = was.note; p.synthetic.version++; return {document: p, selected: r.id}; }}},
    'synthetic.observe': {apply: applySynthetic},
    'syntheticaside.rewrite': {apply: applySynthetic}, 'synthetic.sweep': {apply: applySynthetic},
    // A person's step and a second person's step that can be undone by their receipt (should-fix 1: by a person).
    'synthetic.sign': {apply: applySynthetic, person: true, undo: STEP_UNDO('signed')},
    'synthetic.accept': {apply: applySynthetic, second: (p, c) => syn(p).find(r => r.id === c.payload?.id) || null, undo: STEP_UNDO('acceptance')},
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
    const event = (r, fields) => next.changes.events.push({id: 'CHG-' + String(++next.changes.counter).padStart(3, '0'), source: {chapter: 3, id: r.id, ref: r.id, kind: 'synthetic', title: r.title}, title: r.title, at, fields, items: [], ...(forge === 'journal' ? {actor: 'architect-z', authorKind: 'person', reviewed: true, account: 'person', session: 'forged', reason: 'forged'} : {})});
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
    {document: 'registers', after: '## No such heading', markdown: () => 'NEVER PRINTED\n\n'},
    // Its anchor is a heading the document does not print; the package earlier by id may print one like it (should-fix 5).
    {document: 'registers', after: '### Forged anchor', markdown: () => 'CAPTURED BY A FORGED ANCHOR\n\n'}
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
  checks: {3: p => [...other(p).map(r => ({code: 'other-noted', id: 'other-noted:' + r.id, title: 'Note the other thing', detail: r.id, level: 'warning', objectId: r.id})),
    // switched on by a case: a finding under the id the synthetic package's finding has (should-fix 6)
    ...(forge === 'finding' ? syn(p).filter(r => !r.componentId).map(r => ({code: 'synthetic-unbound', id: 'synthetic-unbound:' + r.id, title: 'A second finding under a taken id', detail: r.id, level: 'warning', objectId: r.id})) : [])],
    10: p => other(p).map(r => ({code: 'other-placed', id: 'other-placed:' + r.id, title: 'Place the other thing', detail: r.id, level: 'warning', objectId: r.id}))},
  // switched on by a case: a section that prints a heading at its anchor's level, or one a later package names as its anchor (should-fix 5)
  sections: [{document: 'registers', after: '## Performance specification', markdown: () => (forge.startsWith('raw:') ? 'Some text.\n\n' + forge.slice(4) + '\n\nMore text.\n' : forge === 'heading' ? 'Some text.\n\n## Forged section\n\nUnder a heading at the anchor\'s level.\n\n' : forge === 'above' ? '# 7. Appendix\n\nUnder a heading above the anchor\'s level.\n\n' : forge === 'anchor' ? '### Forged anchor\n\nWhat a later package names as its anchor.\n\n' : forge === 'fenced' ? '```\n## Inside a code fence\n```\n\n' : '')}],
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
// A package whose layer has a numeric name: as a key of an object table it sorts before every built-in layer.
const NUMERIC = {id: 'aa-numeric', objectTypes: {numeric: {label: 'Numeric', chapter: 2, level: 'intent', prefix: 'NUM'}}, layers: {7: 'numeric'}, hops: [{layer: '7', types: ['fulfils'], from: ['requirement'], dir: 'out', ctx: false}]};
const withSynthetic = (p, payload, actor = A) => applySynthetic(documentCopy(p), {type: 'synthetic.save', payload}, AT, actor).document;
const firstTrail = p => { const reqs = reviewRequirements(p); for (const r of reqs) { const T = kernel.requirementTrace(p, r.id); if (T.layers.component?.length) return {requirement: r.id, component: T.layers.component[0], T}; } throw Error('no requirement with a component on its trail'); };

// ---------------------------------------------------------------- emitter mode (ruling J2): what has(id) answers, in a process of its own
// Two probe packages. The first asks has(id) before it states a relation; the second states the same relations
// without asking. A Chapter 4 allocation is a record the graph keeps as a relation, not as an object.
if (process.argv.includes('--emitter')) {
  const seen = {};
  X.registerExtension({id: 'zy-asks', objectTypes: {asked: {label: 'Asked', chapter: 3, level: 'intent', prefix: 'ASK'}}, records(p, add, rel, has) {
    if (!p.asks) return; const ids = [p.logical.mappings[0].id, 'no-such-record', p.realisation.components[0].id];
    Object.assign(seen, {type: typeof has, requirement: has?.(reviewRequirements(p)[0].id), component: has?.(ids[2]), relation: has?.(ids[0]), absent: has?.(ids[1]), before: has?.('ASK-001')});
    add({id: 'ASK-001', ref: 'ASK-001', title: 'Asked'}, 'asked', 'asks.records.ASK-001'); seen.after = has?.('ASK-001'); seen.later = has?.('BLD-001');
    for (const id of ids) if (has?.(id)) rel('probes', 'ASK-001', id, {source: 'asks.records.probes'});
  }});
  X.registerExtension({id: 'zz-blind', objectTypes: {blind: {label: 'Blind', chapter: 3, level: 'intent', prefix: 'BLD'}}, records(p, add, rel) {
    if (!p.blind) return; add({id: 'BLD-001', ref: 'BLD-001', title: 'Blind'}, 'blind', 'blind.records.BLD-001');
    for (const id of [p.logical.mappings[0].id, p.realisation.components[0].id]) rel('probes', 'BLD-001', id, {source: 'blind.records.probes'});
  }});
  const base = reference('bank-payment'), asked = withFinalReview({...base, asks: {records: []}}), blind = withFinalReview({...base, blind: {records: []}}), model = p => { const M = architectureModel(p); return {issues: M.issues, probes: M.relationships.filter(e => e.type === 'probes').map(e => [e.from, e.to])}; };
  const out = {base: model(base).issues, asked: model(asked), seen: {...seen}, graph: recordGraph(asked).relationships.filter(e => e.type === 'probes').map(e => [e.from, e.to]), blind: model(blind), allocation: base.logical.mappings[0].id, component: base.realisation.components[0].id, plain: digests(reference('clinic-appointments'))};
  console.log(JSON.stringify(out)); process.exit(0);
}

// ---------------------------------------------------------------- probe mode (case 7): one registration order per process
if (PROBE >= 0) {
  const order = process.argv[PROBE + 1] || '';
  for (const ch of order) X.registerExtension({h: HOSTILE, o: OTHER, s: SYNTHETIC, n: NUMERIC}[ch]);
  // A package the start check would refuse, registered alone: what the references' trails read with it (should-fix 7).
  // The references name no runtime path from a requirement, so their trails would not show a shifted last layer (the
  // verifier's second round): the probe also reads a document in which a requirement names a path.
  if (order === 'n') { const q = JSON.parse(JSON.stringify(reference('bank-payment'))), req = q.artefacts.find(a => a.type === 'requirement'); q.runtime.paths[0].requirementIds = [req.id];
    console.log(JSON.stringify({layers: kernel.TRACE_LAYERS, trails: Object.fromEntries(REFERENCES.map(t => [t, digests(reference(t)).trails])), path: kernel.requirementTrace(withFinalReview(q), req.id).layers.path, pathId: q.runtime.paths[0].id})); process.exit(0); }
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
// A document whose review list (list 11) is not empty, which no reference is (should-fix 9): its ten readings too.
const compareListed = when => { const p = reviewListDocument(), d = digests(p); assert.deepEqual(reviewListFindings(p).map(f => f.id), golden.reviewList.findings, 'the document holds the review\'s own findings (' + when + ')'); assert.ok(golden.reviewList.findings.length >= 2); for (const k of Object.keys(golden.reviewList.readings)) assert.equal(d[k], golden.reviewList.readings[k], `a document with a review list: the ${k} reading is byte for byte the baseline's (${when})`); };
await block('6a no extension registered', () => {
  assert.equal(golden.capturedFrom, '94dbd4f');
  compare('no extension of the suite registered', before); compareListed('no extension of the suite registered');
  // (ruling J11; was: X.EXTENSIONS deep-equals [], 'nothing is registered until a package registers'. With real
  // packages in the build that reads two ways, and both are held: this process holds exactly the build's packages and
  // their route stubs, and a process without the server's package list holds none and reads the same.)
  if (X) assert.deepEqual(X.EXTENSIONS.map(e => e.id), BUILD_IDS, 'the registry holds exactly the build\'s packages and their route stubs until the suite registers its own');
  { const r = spawnSync(process.execPath, ['--input-type=module', '-e', 'import {EXTENSIONS} from "./public/design-extensions.js"; import * as R from "./rc44-s0-readings.mjs"; const listed = R.reviewListDocument(); console.log(JSON.stringify({registered: EXTENSIONS.length, readings: R.referenceDigests(), listed: R.digests(listed), findings: R.reviewListFindings(listed).map(f => f.id)}));'], {encoding: 'utf8', maxBuffer: 1 << 26});
    assert.equal(r.status, 0, 'a process with the registry and the readers and without the server\'s package list: ' + r.stderr.slice(0, 300)); const bare = JSON.parse(r.stdout.trim().split('\n').at(-1));
    assert.equal(bare.registered, 0, 'nothing is registered until a package registers: the registry and the readers import no package');
    for (const t of REFERENCES) assert.deepEqual(bare.readings[t], golden.readings[t], t + ': with nothing registered every reading is byte for byte the baseline\'s');
    assert.deepEqual(bare.findings, golden.reviewList.findings); assert.deepEqual(bare.listed, golden.reviewList.readings, 'and those of the document with a review list'); }
  pass('6a: with nothing registered (a process without the server\'s package list), and with only the build\'s own packages registered (' + (BUILD_PACKAGES.join(', ') || 'none') + '), the graph, trails, findings, stamps, readiness, provenance, registers, SDD and ARS of ' + REFERENCES.join(', ') + ' are byte for byte those of 94dbd4f');
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
  for (const type of ['knowledge.concept-pin', 'adoption.apply', 'adoption.accept', 'selection.judge', 'workload.model', 'workload.objective-agree', 'runtime.node', 'runtime.failure-accept', 'runtime.gate-evidence', 'technology.domain', 'technology.domain-evidence']) { assert.equal(boundary.builtInType(type), false, type + ' is free for a package'); assert.deepEqual(boundary.extensionIssues({id: 'xy', commands: {[type]: {apply() {}}}}), []); }
  // knowledge.library, .topic and .concept are the workbench's own since wp1 S1 (ruling E5: the concept register is part of
  // the built-in knowledge family), so they are no package's; what S3 registers (knowledge.concept-pin) stays free.
  for (const type of ['knowledge.library', 'knowledge.topic', 'knowledge.concept', 'knowledge.concept-review']) { assert.equal(boundary.builtInType(type), true, type + ' is built in'); assert.ok(boundary.extensionIssues({id: 'xy', commands: {[type]: {apply() {}}}}).some(i => i.includes('is built in')), type + ' is refused to a package'); }
  for (const type of ['runtime.zone', 'runtime.simulation', 'technology.capability', 'knowledge.review', 'knowledge.fetch', 'workspace.view', 'workspace.apply', 'intelligence.adopt', 'decision.accept', 'review.disposition', 'record.retire', 'feedback.import', 'model.apply-impact', 'action.undo']) assert.equal(boundary.builtInType(type), true, type + ' is built in');
  assert.ok(boundary.extensionIssues({id: 'xy', objectTypes: {xy: {label: 'Xy', chapter: 2, level: 'intent', prefix: 'XY'}}, layers: {xy: 'xy'}, hops: [{layer: 'xy', types: ['a'], from: ['requirement'], dir: 'out', ctx: true, step: true}]}).some(i => /“step” is not a part of a hop/.test(i)), 'a hop states only what the contract names');
  assert.ok(boundary.extensionIssues({id: 'xy', provenance: {records: {'xy.things': 12}}}).some(i => /“xy\.things” is a key of the document or chapter\.list, with its chapter from 1 to 11/.test(i)));
  assert.deepEqual(boundary.extensionIssues({id: 'xy', provenance: {records: {'xy.things': 11}, nouns: {'xy.things': 'thing'}}, upgrade: p => p, upgradeNote: 'Its things are kept.', sections: [{document: 'chapter-10', after: '# Runtime plans', markdown: () => ''}]}), []);
  assert.ok(boundary.extensionIssues({id: 'xy', upgradeNote: 'Its things are kept.'}).some(i => /upgradeNote/.test(i)), 'a note goes with a step');
  assert.ok(boundary.extensionIssues({id: 'xy', sections: [{document: 'chapter-11', after: '# T', markdown: () => ''}]}).length === 1, 'chapter-1 to chapter-10 are the chapter registers');
  X.registerExtension(SYNTHETIC); X.registerExtension(HOSTILE); X.registerExtension(OTHER);
  assert.deepEqual(boundary.extensionIssues(SYNTHETIC), [], 'registered, with the package its hop comes from');
  assert.deepEqual(boundary.extensionIssues(OTHER), []);
  // (ruling J11; was: the list equals ['aa-hostile', 'mm-other', 'zz-synthetic']: now the build's ids and the suite's own, sorted)
  assert.deepEqual(X.EXTENSIONS.map(e => e.id), withBuild(['aa-hostile', 'mm-other', 'zz-synthetic']), 'readers read the packages sorted by id, whatever order they registered in: the build\'s and the suite\'s');
  pass('registration: a package registers by id; the conformance check (design-extension-boundary.js extensionIssues) passes the synthetic packages and names what the hostile one may not state');
});

// ---------------------------------------------------------------- case 6, second half: registered, no record
await block('6b registered, no record of theirs', () => {
  need();
  compare('three extensions registered, none of their records in the document'); compareListed('three extensions registered');
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
  // The same, by the helper every package's suite calls (ruling D6.4): the built-in layers and every spine are
  // unchanged with the package's records present, and no two findings share an id. It is seen to catch both ways a
  // package could put a record on a built-in trail: add() with a built-in type that stands on a layer, and a relation
  // of a type a built-in hop reads between two built-in records.
  assert.ok(assertBuiltInTrailsUnchanged(p0, p) > 0); assert.ok(assertFindingIdsUnique(p) > 0);
  // (the lead's ruling K8) and the chains that explain pairs of built-in records, and the built-in records of every record's trace, are the ones p0 gives
  assert.ok(R.assertBuiltInChainsUnchanged(p0, p) > 0, 'the synthetic package\'s records move no chain between built-in records');
  { const reqs = reviewRequirements(p0), last = p0.realisation.components.at(-1), off = reqs.find(r => !kernel.requirementSpine(p0, r.id).has(last.id));
    X.registerExtension({id: 'ab-trespass', records(q, add, rel) { if (q.trespass === 'type') { add({id: 'CMP-FAKE', ref: 'CMP-FAKE', title: 'A package\'s record of a built-in type'}, 'component', 'trespass.records.CMP-FAKE'); rel('fulfils', reqs[0].id, 'CMP-FAKE', {source: 'trespass.records.requirementIds'}); } if (q.trespass === 'relation' && off) rel('fulfils', off.id, last.id, {source: 'trespass.records.requirementIds'}); }});
    assert.throws(() => assertBuiltInTrailsUnchanged(p0, withFinalReview({...p0, trespass: 'type'})), /moved on the built-in layer “component”/, 'a package\'s record of a built-in type on a built-in layer is caught');
    if (off) assert.throws(() => assertBuiltInTrailsUnchanged(p0, withFinalReview({...p0, trespass: 'relation'})), /moved on the built-in layer “component”/, 'and so is a relation a built-in hop reads between two built-in records');
    if (off) assert.throws(() => R.assertBuiltInChainsUnchanged(p0, withFinalReview({...p0, trespass: 'relation'})), /moved/, 'a relation between two built-in records is caught by the chains helper too');
    assert.throws(() => R.assertBuiltInChainsUnchanged(p0, withFinalReview({...p0, trespass: 'type'})), /moved/, 'and so is a package\'s record of a built-in type');
    assert.ok(assertBuiltInTrailsUnchanged(p0, withFinalReview({...p0, trespass: ''})) > 0); }
  try { forge = 'finding'; assert.throws(() => assertFindingIdsUnique(withFinalReview(withSynthetic(p, {title: 'Unbound'}))), /Two findings share the id “C3:synthetic-unbound:SYN-003”/); } finally { forge = ''; }
  // should-fix 8: a package's hops cost a document nothing while it holds no record of the layer's type: the walk
  // does not read them (the hop below counts every relation it is asked about)
  { let asked = 0; X.registerExtension({id: 'ab-counting', objectTypes: {counted: {label: 'Counted', chapter: 2, level: 'intent', prefix: 'CNT'}}, records(q, add) { for (const r of list(q.counted)) add(r, 'counted', 'counted.' + r.id); }, layers: {counted: 'counted'}, hops: [{layer: 'counted', types: null, from: ['requirement', 'component', 'responsibility'], dir: 'out', ctx: true, only: () => { asked++; return true; }}]});
    for (const r of reviewRequirements(p0)) { kernel.requirementTrace(p0, r.id); kernel.requirementSpine(p0, r.id); }
    assert.equal(asked, 0, 'no hop of a package is read for a document that holds no record of its layer\'s type');
    const q = withFinalReview({...p0, counted: [{id: 'CNT-001', ref: 'CNT-001', title: 'Counted'}]}); for (const r of reviewRequirements(q)) kernel.requirementTrace(q, r.id);
    assert.ok(asked > 0, 'and is read once the document holds one'); assert.ok(assertBuiltInTrailsUnchanged(p0, q) > 0); }
  if (second) assert.ok(!kernel.requirementTrace(p, second).has('SYN-001'), 'a record reaches only the trails its hops lead from');
  assert.ok(kernel.TRACE_LAYERS.indexOf('synthetic') > kernel.TRACE_LAYERS.indexOf('path'), 'a package\'s layer stands after the built-in layers');
  assert.ok(kernel.TRACE_LAYERS.indexOf('other') < kernel.TRACE_LAYERS.indexOf('synthetic'), 'in the packages\' id order');
  // a hop from the layer of the package earlier by id
  const third = reviewRequirements(p0).find(r => !kernel.requirementTrace(p, r.id).has('SYN-002'))?.id;
  if (third) { const q = withFinalReview({...p, runtime: {...p.runtime, otherThings: [{id: 'OTH-001', ref: 'OTH-001', title: 'Other thing', requirementIds: [third], syntheticId: 'SYN-002'}]}}), Q = kernel.requirementTrace(q, third); assert.deepEqual(Q.layers.other, ['OTH-001']); assert.deepEqual(Q.layers.synthetic, ['SYN-002'], 'the other thing brings the record it describes'); assert.equal(kernel.requirementSpine(q, third).layers.synthetic, undefined, 'as context, not on the own chain'); assert.deepEqual(kernel.requirementSpine(q, third).layers.other, ['OTH-001']); }
  // The context layer is read whatever stands on it: a requirement linked to the one traced is its context (it stands
  // on the requirement layer), also in a document whose Chapter 1 holds requirements only.
  { const reqs = p0.artefacts.filter(a => a.type === 'requirement'), only = withFinalReview({...p0, artefacts: reqs, relationships: [{...p0.relationships[0], id: 'REL-900', from: reqs[0].id, to: reqs[1].id}]});
    assert.ok(![...recordGraph(only).objects.values()].some(o => o.source.startsWith('artefacts[') && o.type !== 'requirement'), 'the document holds no Chapter 1 record but requirements');
    assert.deepEqual(kernel.requirementTrace(only, reqs[0].id).layers.context, [reqs[1].id], 'the linked requirement is on the context layer'); assert.deepEqual(kernel.requirementTrace(only, reqs[1].id).layers.context, [reqs[0].id]); }
  // The walk's skip must not cost a built-in layer a record (the verifier's second round): a Chapter 1 record whose
  // type a built-in layer holds stands on the context layer, and a hop still brings it onto the layer of its type, as
  // on rc.10.73.42, in a document where no other record stands on that layer. Only a hand-made or imported document
  // holds such a record; it reads as it did.
  { const q = JSON.parse(JSON.stringify(reference('bank-payment'))), req = q.artefacts.find(a => a.type === 'requirement');
    q.artefacts.push({id: 'DAT-900', ref: 'DAT-900', type: 'data', title: 'A Chapter 1 record typed as data', statement: 'x'}, {id: 'PTY-900', ref: 'PTY-900', type: 'party', title: 'A Chapter 1 record typed as party', statement: 'x'});
    q.interfaces.data = []; q.interfaces.parties = [];
    for (const c of q.realisation.components.slice(0, 2)) c.dataIds = [...(c.dataIds || []), 'DAT-900'];
    q.modelContext = {...q.modelContext, relationships: [...(q.modelContext?.relationships || []), {type: 'fulfils', from: req.id, to: 'PTY-900'}]};
    const T = kernel.requirementTrace(withFinalReview(q), req.id);
    assert.ok(list(T.layers.data).includes('DAT-900'), 'a Chapter 1 record typed data is on the data layer, as on rc.10.73.42: ' + JSON.stringify(T.layers.data));
    assert.ok(list(T.layers.party).includes('PTY-900'), 'a Chapter 1 record typed party is on the party layer, as on rc.10.73.42: ' + JSON.stringify(T.layers.party)); }
  pass('1: SYN-001 is in the record graph and the connected model with fulfils and binds, on the trail and the spine of ' + T0.requirement + ', in linkedVia both ways, namedBy and servingRequirements; a context hop is on the trail and not on the spine; every built-in layer is unchanged');
});

// ---------------------------------------------------------------- ruling J2: the emitter is handed has(id)
await block('J2 emitter has', () => {
  need();
  const r = spawnSync(process.execPath, [process.argv[1], '--emitter'], {encoding: 'utf8', maxBuffer: 1 << 26}); assert.equal(r.status, 0, 'emitter probe: ' + r.stderr.slice(0, 400));
  const out = JSON.parse(r.stdout.trim().split('\n').at(-1));
  assert.deepEqual(out.seen, {type: 'function', requirement: true, component: true, relation: false, absent: false, before: false, after: true, later: false}, 'has(id) says whether the graph holds an object under the id: a built-in object, and the package\'s own once added; not a record the graph keeps as a relation, an id nobody holds, or an object of a package later by id');
  assert.deepEqual(out.base, [], 'the reference has no issue in its connected model');
  assert.deepEqual(out.asked.issues, [], 'a package that asks has(id) before it states a relation leaves the connected model without an issue');
  assert.deepEqual(out.asked.probes, [['ASK-001', out.component]], 'and its relation to an object stands'); assert.deepEqual(out.graph, [['ASK-001', out.component]]);
  assert.deepEqual(out.blind.issues.map(i => [i.kind, i.from, i.to]), [['unresolved', 'BLD-001', out.allocation]], 'what the guard is for: a relation stated to a record the graph keeps as a relation is listed as unresolved, and the model package of such a document is refused');
  for (const k of Object.keys(golden.readings['clinic-appointments'])) assert.equal(out.plain[k], golden.readings['clinic-appointments'][k], 'with both probes registered a document without their records reads as the baseline: ' + k);
  pass('J2: the one emitter hands a package has(id) — whether the graph holds an object under that id; a package that asks states a relation only between objects, and the connected model has the issues it had');
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
      // (the lead's ruling J8 of 2026-11-19) a package's upgrade is stored by a read, not inside a command: the row written as an older build kept it
      // takes no command, a built-in one neither, until a read has stored the upgrade. The command is answered with a reload and nothing is stored.
      { assert.equal(typeof boundary.upgradeDueRefusal, 'function', 'the boundary answers the refusal'); assert.equal(boundary.upgradeDueRefusal(reference('bank-payment')), null, 'none for a document no package must upgrade'); assert.match(boundary.upgradeDueRefusal(stored.document), /earlier build of AIW.*Reload the latest project, then apply your preserved changes\./);
        const {saveStoredProject} = await import('./project-storage.js'), kept = await saveStoredProject(env, A, pid, stored.document, row.revision, '2026-10-06T09:00:00.000Z', stored.keys); assert.ok(kept.meta?.changes, 'the row is written as an older build kept it');
        const due = await env.DB.prepare('SELECT document,revision,updated_at FROM projects WHERE owner_id=? AND id=?').bind(A, pid).first(), points = () => [...files.keys()].filter(k => k.startsWith('upgrades/')).length, before = points();
        for (const [type, payload, as] of [['synthetic.save', {title: 'Sent from a tab left open', requirementIds: [t.requirement], componentId: t.component}, A], ['guide.start', {chapter: 1}, B], ['synthetic.accept', {id: 'SYN-001', reviewed: true}, B]]) {
          const res = await api('/api/commands' + q, 'POST', {revision: due.revision, command: {type, payload}}, as), body = await res.json();
          assert.equal(res.status, 409, type + ' on a row whose package upgrade is due is answered with a reload: ' + res.status + ' ' + JSON.stringify(body).slice(0, 200)); assert.equal(body.conflict, true); assert.equal(body.code, 'conflict'); assert.match(body.error, /earlier build of AIW.*Reload the latest project, then apply your preserved changes\./); }
        const still = await env.DB.prepare('SELECT document,revision,updated_at FROM projects WHERE owner_id=? AND id=?').bind(A, pid).first();
        assert.equal(still.revision, due.revision, 'nothing was stored'); assert.equal(still.document, due.document, 'the row is byte for byte what it was'); assert.equal(points(), before, 'and no recovery point was made');
        // (the lead's ruling K1 of 2026-11-20) nor is it stored by any other save. The one writer of a project (project-storage.js saveStoredProject) refuses to store the
        // upgraded document over a row whose package upgrade is due, whichever route asks; a save that leaves the upgrade due is taken (a rename, an archive, a signed notice
        // applied before the read), and so is the storage upgrade itself, which keeps the recovery point.
        { const rowNow = () => env.DB.prepare('SELECT document,revision,updated_at FROM projects WHERE owner_id=? AND id=?').bind(A, pid).first(), storageRows = async () => (await env.DB.prepare('SELECT document FROM project_activity WHERE owner_id=? AND project_id=?').bind(A, pid).all()).results.map(r => JSON.parse(r.document)).filter(e => e.kind === 'storage').length, rowsBefore = await storageRows();
          const read = await readStoredProject(env, A, due.document), upgraded = withFinalReview(structuredClone(read.document)); assert.equal(boundary.extensionUpgradeNeeded(upgraded), false, 'the read upgrade chain ran the step');
          let thrown = null; try { await saveStoredProject(env, A, pid, upgraded, due.revision, '2026-10-06T09:05:00.000Z', read.keys); } catch (e) { thrown = e; }
          assert.ok(thrown, 'the writer does not store a package upgrade for a route that is not the storage upgrade'); assert.equal(thrown.conflict, true); assert.equal(thrown.code, 'conflict'); assert.match(thrown.message, /earlier build of AIW.*Reload the latest project, then apply your preserved changes\./);
          { const {errorResponse} = await import('./error-message.js'), res = errorResponse(thrown, 400), body = await res.json(); assert.equal(res.status, 409, 'every service\'s final catch answers it as a conflict'); assert.deepEqual(body, {error: thrown.message, conflict: true, code: 'conflict'}); }
          // a writing route that is not a command, at the stored revision (the owner's disclosure and budgets)
          { const res = await api('/api/operations' + q, 'POST', {action: 'policy', revision: due.revision, enabled: true, hourlyRequests: 10, dailyTokens: 1000, excludedObjectIds: [], reason: 'Budget for the pilot.'}, A), body = await res.json();
            assert.equal(res.status, 409, 'POST /api/operations on a row whose package upgrade is due is answered with a reload: ' + res.status + ' ' + JSON.stringify(body).slice(0, 200)); assert.equal(body.conflict, true); assert.equal(body.code, 'conflict'); assert.match(body.error, /earlier build of AIW.*Reload the latest project/); }
          { const now = await rowNow(); assert.equal(now.revision, due.revision, 'nothing was stored'); assert.equal(now.document, due.document); assert.equal(points(), before); assert.equal(await storageRows(), rowsBefore); }
          // the rule does not depend on which Map object a route hands back: a copy of the keys it read is the same row (the reviewer of the lead's follow-up)
          { let copied = null; try { await saveStoredProject(env, A, pid, upgraded, due.revision, '2026-10-06T09:06:00.000Z', new Map(read.keys)); } catch (e) { copied = e; } assert.ok(copied?.upgradeDue, 'a save with a copy of the keys is refused too'); }
          // a save that leaves the upgrade due is taken: the owner renames the project from the list, before anyone opened it on this build
          { const res = await api('/api/lifecycle' + q, 'POST', {action: 'rename', name: 'Renamed before it was opened', revision: due.revision}, A), body = await res.json(); assert.equal(res.status, 200, 'a rename is taken: ' + JSON.stringify(body).slice(0, 200));
            const now = await rowNow(), kept = await readStoredProject(env, A, now.document); assert.equal(now.revision, due.revision + 1); assert.equal(kept.document.name, 'Renamed before it was opened');
            assert.deepEqual(kept.document.legacySynthetic, ['Kept from an old document'], 'the row is stored as it was but for the name and the log: the upgrade is not stored with the rename'); assert.equal(storageUpgradeNeeded(kept), true, 'and is still due');
            assert.equal(points(), before, 'no recovery point is owed for it'); assert.equal(await storageRows(), rowsBefore, 'and no storage upgrade is recorded');
            assert.deepEqual(body.document.synthetic?.records?.map(x => x.title), ['Kept from an old document'], 'the answer shows the project as this build reads it'); assert.equal(body.revision, now.revision);
            Object.assign(due, now); }
          // archive, restore from the archive and the template mark: each taken, each stores the row as it was, the upgrade stays due
          for (const body of [{action: 'archive'}, {action: 'restore'}, {action: 'template', enabled: true}, {action: 'template', enabled: false}]) {
            const res = await api('/api/lifecycle' + q, 'POST', {...body, revision: due.revision}, A); assert.equal(res.status, 200, JSON.stringify(body) + ' is taken: ' + res.status);
            const now = await rowNow(), kept = await readStoredProject(env, A, now.document); assert.equal(now.revision, due.revision + 1); assert.deepEqual(kept.document.legacySynthetic, ['Kept from an old document'], JSON.stringify(body) + ' stores no upgrade'); assert.equal(storageUpgradeNeeded(kept), true);
            assert.equal(points(), before); assert.equal(await storageRows(), rowsBefore); Object.assign(due, now); } }
        Object.assign(row, due); Object.assign(stored, await readStoredProject(env, A, due.document)); assert.equal(storageUpgradeNeeded(stored), true); }
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
    // (the acceptance above is kept under a key of the package's own, which is content to the stamps: the commit that took it is the record's author now)
    assert.equal(rec(agentOnly).provenance.author.by, A);
    { const r = await accept(agentOnly, C, 'synthetic.endorse'); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); assert.deepEqual([rec(agentOnly).review.actor, rec(agentOnly).review.account], [C, 'person']);
      assert.equal(rec(agentOnly).provenance.author.by, A, 'a step kept under the record\'s key review leaves the stamp of who wrote the record as it was'); }
    // once a second person has confirmed it; the one who confirmed is one person
    assert.equal((await send('synthetic.confirm', {id: solDraft}, C)).status, 200);
    assert.deepEqual([rec(solDraft).provenance.author.kind, rec(solDraft).provenance.reviewed?.by, rec(solDraft).provenance.reviewed?.how], ['sol-draft', C, 'confirmed']);
    await refused(solDraft, C, 'the person who confirmed it is one person');
    { const r = await accept(solDraft, A); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); assert.equal(rec(solDraft).acceptance.actor, A); }
    // a confirmation holds for the record as it was confirmed: rewritten by the agent account, it is gone
    assert.equal((await send('synthetic.confirm', {id: imported}, C)).status, 200);
    assert.equal((await send('synthetic.save', {id: imported, title: 'Imported, confirmed, then rewritten'}, AGENT)).status, 200);
    await refused(imported, A, 'a confirmation of what the record no longer says');
    // the stamp is kept current by the boundary, not by what a command says of itself: a person's record that an agent
    // account changes through a type whose prefix states no paths, or through a command that names no record, is the
    // agent's text, and one person accepting it is one person
    for (const [type, payload, sender, extra] of [['syntheticaside.rewrite', {title: 'Rewritten aside by the agent account'}, AGENT, {}], ['synthetic.sweep', {note: 'Swept by the agent account'}, AGENT, {}], ['synthetic.sweep', {note: 'Swept in a draft by Sol'}, C, {authorKind: 'sol-draft'}]]) {
      assert.equal((await send('synthetic.save', {title: 'A person\'s record'}, B)).status, 200); const id = h.last();
      assert.deepEqual([rec(id).provenance.author.kind, rec(id).provenance.author.by], ['person', B]);
      const changed = await send(type, {...payload, id}, sender, extra); assert.equal(changed.status, 200, type + ': ' + JSON.stringify(changed.body).slice(0, 200));
      assert.notEqual(rec(id).provenance?.author?.kind, 'person', 'after ' + type + ' the record no longer carries a person\'s stamp');
      await refused(id, A, 'a person\'s record changed by ' + type + ' from an account that is no person');
      // a record the sweep did not change keeps its stamp; one a person then saves is a person's again
      assert.equal((await send('synthetic.save', {id, title: 'Saved again by a person'}, B)).status, 200);
      { const r = await accept(id, A); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 200)); }
    }
    // the author is still refused first, by the one rule (verifierRefusal)
    assert.match((await accept(agentOnly, B)).error, /architect-b wrote /);
  } finally { h.close(); }
  // a record restored from elsewhere: its stamp is history there, not a person behind it on this workbench
  { let p = withSynthetic(reference('bank-payment'), {title: 'Stamped elsewhere'}, B); p.synthetic.records[0].provenance = {author: {kind: 'person', by: B, at: '2026-09-01T09:00:00.000Z'}};
    const author = {kind: 'person', id: A, account: 'person', reviewed: true}, run = q => commandHandler('synthetic.accept')(documentCopy(q), {type: 'synthetic.accept', payload: {id: 'SYN-001', reviewed: true}}, AT, A, {author});
    assert.equal(run(withFinalReview(p)).document.synthetic.records[0].acceptance.actor, A, 'a person\'s stamp of this workbench stands');
    p = withFinalReview(p); p.finalReview.imported = {at: '2026-09-15T09:00:00.000Z', by: A};
    assert.throws(() => run(p), /needs two persons/, 'a stamp from before the project was restored here is history');
    // a record copied from a template: its stamp was made in another project, by people who may not work in this one (ruling F3)
    let q = withFinalReview(withSynthetic(reference('bank-payment'), {title: 'Stamped in the template'}, B)); q.synthetic.records[0].provenance = {author: {kind: 'person', by: B, at: '2026-09-01T09:00:00.000Z'}};
    q.workspace = {...q.workspace, templateOrigin: {projectId: 'template', name: 'Template', at: '2026-09-15T09:00:00.000Z'}};
    assert.throws(() => run(q), /needs two persons/, 'a stamp from before the project was copied from a template is history');
    q.synthetic.records[0].provenance = {author: {kind: 'sol-draft', by: B, at: '2026-09-01T09:00:00.000Z'}, reviewed: {by: C, at: '2026-09-02T09:00:00.000Z', how: 'confirmed'}};
    assert.throws(() => run(q), /needs two persons/, 'a confirmation from before the copy is history too');
    q.synthetic.records[0].provenance = {author: {kind: 'person', by: B, at: '2026-09-16T09:00:00.000Z'}};
    assert.equal(run(q).document.synthetic.records[0].acceptance.actor, A, 'a stamp made in the copy stands'); }
  // the start check: a second person's type states the collection it acts on, so the boundary can read the stamp
  assert.ok(boundary.extensionIssues({id: 'xy', commands: {'xy.accept': {apply() {}, second: () => null}}}).some(i => /command “xy\.accept” is a second person.s step: the package states provenance\.paths/.test(i)), 'a second type without provenance.paths is refused at start');
  assert.ok(boundary.extensionIssues({id: 'xy', commands: {'xy.accept': {apply() {}, second: () => null}}, provenance: {paths: {xy: []}}}).some(i => /states provenance\.paths/.test(i)), 'an empty list states none');
  assert.deepEqual(boundary.extensionIssues({id: 'xy', commands: {'xy.accept': {apply() {}, second: () => null}}, provenance: {paths: {xy: ['xy.records']}}}), []);
  assert.deepEqual(boundary.extensionIssues({id: 'xy', commands: {'xy.accept': {apply() {}, second: () => null}}, provenance: {paths: {'xy.accept': ['xy.records']}}}), []);
  pass('D1: a second person\'s step is refused, in words that fit any package, while no person other than the actor stands behind the record as it stands (written by an agent account, drafted by Sol, rewritten by an agent, imported, restored from elsewhere), and is taken once a second person has saved or confirmed it; a projection is read against the stored record\'s stamp; a second type states provenance.paths');
});

// ---------------------------------------------------------------- D2. a document says which packages have written into it
await block('D2 packages a document names', async () => {
  need();
  assert.equal(boundary.PACKAGES_KEY, 'workspace.packages', 'the contract names the key');
  const ABSENT = 'p98-absent'; // an id no build registers (the lead's table of ids, ruling D8, holds none such)
  const stamps = p => [reviewSourceStamp(p), evidenceStamp(p)], synthetic = (title = 'Written by the package') => [{type: 'synthetic.save', payload: {title}}];
  // the boundary writes the package's id when a command of the package first writes; no other document gains the key
  let h = await harness(), d = () => h.state.document;
  try {
    assert.equal((await h.send('guide.start', {chapter: 1})).status, 200); assert.ok(!('packages' in d().workspace), 'a built-in command names no package');
    assert.equal((await h.send('synthetic.save', {title: 'First write'})).status, 200); assert.deepEqual(d().workspace.packages, ['zz-synthetic'], 'the first write of a package\'s command names the package');
    assert.equal((await h.send('synthetic.save', {title: 'Second write'})).status, 200); assert.deepEqual(d().workspace.packages, ['zz-synthetic'], 'once');
    // neither fingerprint reads the key
    { const p = withFinalReview(d()), q = withFinalReview({...p, workspace: {...p.workspace, packages: ['zz-synthetic', 'another-package']}}); assert.deepEqual(stamps(q), stamps(p), 'neither the design fingerprint nor the evidence fingerprint reads the key'); }
    // a document that names a package this build does not register: read, with the package named
    const name = async ids => { const row = await h.env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(A, h.pid).first(), doc = JSON.parse(row.document); doc.workspace.packages = ids; await h.env.DB.prepare('UPDATE projects SET document=? WHERE owner_id=? AND id=?').bind(JSON.stringify(doc), A, h.pid).run(); };
    assert.ok(!('missingPackages' in await h.read()), 'a document whose packages this build has is read as before');
    await name(['p99-unknown', 'zz-synthetic']);
    const read = await h.api('/api/project' + h.q), body = await read.json(), revision = body.revision;
    assert.equal(read.status, 200, 'reading the project works'); assert.deepEqual(body.missingPackages, ['p99-unknown'], 'and names the missing package'); assert.equal(body.document.synthetic.records.length, 2);
    // every command is refused in words, a built-in one too
    const WORDS = /holds records of a design package this build of AIW does not have \(p99-unknown\)\. It can be read here; a design this build cannot read in full is not changed, frozen or printed by it\./;
    for (const [type, payload] of [['guide.start', {chapter: 2}], ['synthetic.save', {title: 'Refused'}], ['record.retire', {id: 'SYN-001', reason: 'Refused.'}], ['workspace.apply', {commands: synthetic(), stamp: 'x', reviewed: true, reason: 'Refused.'}]]) {
      const res = await h.api('/api/commands' + h.q, 'POST', {revision, command: {type, payload}}), answer = await res.json();
      assert.equal(res.status, 409, type + ' is refused: ' + JSON.stringify(answer).slice(0, 200)); assert.equal(answer.code, 'missing_package'); assert.match(answer.error, WORDS); assert.deepEqual(answer.packages, ['p99-unknown']);
    }
    // every route that assembles a document for export: the registers, the SDD, the ARS, a chapter's register, the project whole
    for (const query of ['&chapter=11&annex=registers&format=md', '&chapter=11&format=md', '&chapter=11&document=ars&format=md', '&chapter=3&format=md', '&chapter=3&format=html&view=1', '&chapter=2&document=ars&format=json', '']) {
      const res = await h.api('/api/export' + h.q + query); assert.equal(res.status, 409, 'export ' + (query || '(the project whole)') + ' is refused'); assert.match((await res.json()).error, WORDS);
    }
    // and it is not frozen
    { const res = await h.api('/api/baselines' + h.q + '&action=freeze', 'POST', {title: 'Refused'}); assert.equal(res.status, 409, 'a freeze is refused'); assert.match((await res.json()).error, WORDS); }
    assert.equal((await (await h.api('/api/project' + h.q)).json()).revision, revision, 'nothing was saved');
    // ruling F2: one refusal for every route that can change the design or the knowledge of such a project, whatever it is asked
    for (const [path, body] of [['/api/operations' + h.q, {action: 'policy', policy: {}}], ['/api/jobs' + h.q, {kind: 'sync'}], ['/api/connections' + h.q, {name: 'Refused'}], ['/api/reviews' + h.q, {title: 'Refused'}], ['/api/attachments' + h.q, {name: 'refused.txt'}],
      ['/api/knowledge/corpus' + h.q + '&view=notices', {}], ['/api/knowledge/corpus' + h.q, {action: 'fetch'}], ['/api/knowledge/repository-sync' + h.q, {}], ['/api/knowledge/repository-transfer' + h.q, {}], ['/api/knowledge/repository-packet' + h.q, {}],
      ['/api/intake' + h.q, {}], ['/api/drafting' + h.q, {}], ['/api/intelligence/reasoning' + h.q, {}], ['/api/graph' + h.q, {}], ['/api/unknown-route-of-a-later-build' + h.q, {}]]) {
      const res = await h.api(path, 'POST', body), answer = await res.json();
      assert.equal(res.status, 409, 'POST ' + path + ' is refused: ' + res.status + ' ' + JSON.stringify(answer).slice(0, 160)); assert.equal(answer.code, 'missing_package', path); assert.match(answer.error, WORDS, path); assert.deepEqual(answer.packages, ['p99-unknown'], path);
    }
    assert.equal((await (await h.api('/api/project' + h.q)).json()).revision, revision, 'nothing was saved by any of them');
    // what stays possible: reading (above), renaming, archiving and restoring from the archive, a recovery export, access
    { const life = async action => { const cur = await (await h.api('/api/project' + h.q)).json(), res = await h.api('/api/lifecycle' + h.q, 'POST', {revision: cur.revision, ...action}); assert.equal(res.status, 200, JSON.stringify(action) + ' stays possible: ' + JSON.stringify(await res.clone().json()).slice(0, 160)); };
      // a rename, an archive and a restore change the name, the status and their own log, and nothing else: no upgrade of a design this build cannot read in full is stored (the verifier's second round)
      const raw = async () => { const stored = JSON.parse((await h.env.DB.prepare('SELECT document FROM projects WHERE id=?').bind(h.pid).first()).document), {lifecycle, status, ...workspace} = stored.workspace || {}; delete stored.name; return JSON.stringify({...stored, workspace}); };
      // (the stored design is made one the read upgrade would change: its readings are of the design fingerprint before this one)
      { const row = await h.env.DB.prepare('SELECT document FROM projects WHERE id=?').bind(h.pid).first(), stored = JSON.parse(row.document); assert.ok(stored.finalReview.designFingerprint > 1); stored.finalReview.designFingerprint -= 1;
        await h.env.DB.prepare('UPDATE projects SET document=? WHERE id=?').bind(JSON.stringify(stored), h.pid).run(); }
      const before = await raw();
      await life({action: 'rename', name: 'Renamed while a package is missing'}); await life({action: 'archive'}); await life({action: 'restore'});
      assert.equal(await raw(), before, 'the stored design is byte for byte what it was');
      assert.notEqual((await h.api('/api/access' + h.q, 'POST', {actorId: 'architect-d', role: 'viewer'})).status, 409, 'access stays possible');
      assert.notEqual((await h.api('/api/recovery' + h.q + '&action=export', 'POST', {})).status, 409, 'a recovery export stays possible');
      const after = await (await h.api('/api/project' + h.q)).json(); assert.deepEqual(after.missingPackages, ['p99-unknown'], 'and the project still names what this build lacks'); }
    // with the package named again as one this build has, the project is changed and printed as before
    await name(['zz-synthetic']);
    assert.equal((await h.send('synthetic.save', {title: 'Third write'})).status, 200); assert.equal((await h.api('/api/export' + h.q + '&chapter=3&format=md')).status, 200);
  } finally { h.close(); }
  // the first write inside a reviewed batch, and by a merge; an alternative that is only saved writes nothing into the design
  h = await harness(); d = () => h.state.document;
  try {
    assert.equal((await h.send('workspace.alternative', {commands: synthetic('In an alternative'), stamp: previewScenarioAlternative(d(), synthetic('In an alternative'), undefined).stamp, title: 'An alternative', reason: 'Holds a package\'s edit.'})).status, 200);
    assert.ok(!('packages' in d().workspace), 'a saved alternative has written no record of the package');
    const a = d().workbench.alternatives.at(-1); assert.equal((await h.send('workspace.merge', {id: a.id, stamp: rebaseWorkingAlternative(d(), a).stamp, reviewed: true, reason: 'Merged.'})).status, 200);
    assert.equal(d().synthetic.records.length, 1); assert.deepEqual(d().workspace.packages, ['zz-synthetic'], 'a merge that applies a package\'s command names the package');
  } finally { h.close(); }
  h = await harness(); d = () => h.state.document;
  try {
    await h.read(); assert.equal((await h.send('workspace.apply', {commands: synthetic('In a batch'), stamp: previewWorkingChange(d(), synthetic('In a batch')).stamp, reviewed: true, reason: 'A batch.'})).status, 200);
    assert.deepEqual(d().workspace.packages, ['zz-synthetic'], 'a reviewed batch that carries a package\'s command names the package');
  } finally { h.close(); }
  // an upgrade step that writes names its package; a step with nothing to do leaves the document as it is
  { const old = {...reference('bank-payment'), legacySynthetic: ['Kept from an old document']}, frozen = JSON.stringify(old.workspace), up = boundary.upgradeExtensions(old);
    assert.deepEqual(up.workspace.packages, ['zz-synthetic']); assert.equal(JSON.stringify(old.workspace), frozen, 'the document handed in is not changed'); assert.equal(boundary.upgradeExtensions(up), up, 'idempotent');
    const plain = reference('bank-payment'); assert.equal(boundary.upgradeExtensions(plain), plain); assert.ok(!('packages' in plain.workspace)); }
  // a project made from a template keeps the list with the records
  { const source = withFinalReview({...withSynthetic(reference('bank-payment'), {title: 'In a template'}), workspace: {template: 'bank-payment', createdAt: AT, reusableTemplate: true, packages: ['zz-synthetic']}}), copy = instantiateTemplate(source, 'project-copy', 'A copy', AT);
    assert.equal(copy.synthetic.records.length, 1); assert.deepEqual(copy.workspace.packages, ['zz-synthetic'], 'the copy holds the records, so it names the package'); assert.ok(!('packages' in instantiateTemplate(reference('bank-payment'), 'project-plain', 'Plain', AT).workspace));
    // What a person decided on the template's record is not a decision on the copy. The template reset clears it by
    // key name (project-lifecycle.js), for a package's record as for a built-in one: so the contract tells a package to
    // keep a person's step under the record's key `review`, which the reset knows (as it knows `approval`). A key of
    // the package's own choosing is carried: that is the package's to avoid.
    const stepped = documentCopy(source), r = stepped.synthetic.records[0]; Object.assign(r, {confirmed: true, approval: {actor: B, at: AT, account: 'person'}, review: {actor: B, at: AT}, history: [{revision: 1, actor: A, at: AT}]});
    const kept = instantiateTemplate(withFinalReview(stepped), 'project-stepped', 'Stepped', AT).synthetic.records[0];
    assert.deepEqual([kept.approval, kept.review, kept.confirmed, kept.history], [null, null, false, []], 'a person\'s step kept under approval or review, a confirmation and the history are reset in the copy');
    // the shared helper every package with such a step calls (ruling F3): it passes for a step under review, and names a step kept under a key of the package's own
    const own = documentCopy(source); own.synthetic.records[0].review = {actor: B, at: AT, account: 'person'};
    R.assertTemplateCopyClearsSteps(own, d => d.synthetic?.records || []);
    own.synthetic.records[0].acceptance = {actor: B, at: AT, account: 'person'};
    assert.throws(() => R.assertTemplateCopyClearsSteps(own, d => d.synthetic?.records || []), /carried into a project copied from it: SYN-001\.acceptance/);
    assert.throws(() => R.assertTemplateCopyClearsSteps(source, d => d.synthetic?.records || []), /holds no record with a step taken/, 'a helper that was handed nothing to check says so'); }
  assert.deepEqual(boundary.missingPackages({workspace: {packages: ['zz-synthetic', 'mm-other']}}), []); // (ruling J11; was: ['p40-adoption', 'zz-synthetic'] names ['p40-adoption'] as missing, written when no build held that package: an id no build registers stands for it, and a package of this build is not missing)
  assert.deepEqual(boundary.missingPackages({workspace: {packages: [ABSENT, 'zz-synthetic']}}), [ABSENT]); assert.deepEqual(boundary.missingPackages({}), []);
  assert.ok(BUILD_PACKAGES.length > 0 && !X.EXTENSIONS.some(e => e.id === ABSENT)); assert.deepEqual(boundary.missingPackages({workspace: {packages: [...BUILD_PACKAGES, 'zz-synthetic']}}), [], 'a package this build registers is not missing'); assert.deepEqual(boundary.missingPackages({workspace: {packages: [...BUILD_PACKAGES, ABSENT]}}), [ABSENT]);
  // a list of packages this build cannot read is no empty list (the verifier's second round): it is refused as a missing package is
  for (const unreadable of [ABSENT, [[ABSENT]], [ABSENT, 7, 'zz-synthetic'], {0: ABSENT}, BUILD_PACKAGES[0], [BUILD_PACKAGES], [...BUILD_PACKAGES, 7], [''], null, 7])
    assert.deepEqual(boundary.missingPackages({workspace: {packages: unreadable}}), [boundary.UNREADABLE_PACKAGES], JSON.stringify(unreadable) + ' reads as a list this build cannot read');
  assert.match(boundary.missingPackagesRefusal([boundary.UNREADABLE_PACKAGES]), /cannot read/);
  pass('D2 (server): the boundary names a package under workspace.packages when its command (alone, in a batch, by a merge) or its upgrade step first writes, and neither fingerprint reads the key; a document that names a package this build does not register is read with the package named, and every command, every export and a freeze are refused in words');
});

// ---------------------------------------------------------------- D2, in the browser: the route stubs and the store
await block('D2 client', async () => {
  need();
  const names = ids => ({document: {...reference('bank-payment'), workspace: {template: 'bank-payment', createdAt: AT, packages: ids}}, revision: 1});
  // a document that names a package with no route stub is not opened as if the records were not there
  const unknown = await X.ensureExtensions(names(['p99-unknown'])).then(() => null, e => e);
  assert.ok(unknown instanceof Error, 'ensureExtensions rejects for a package this browser has no stub of'); assert.equal(unknown.message, 'Design package p99-unknown did not load.', 'naming the package');
  X.registerExtension({id: 'p98-known-route', needs: () => false, load: async () => {}});
  { const known = names(['p98-known']); assert.equal(await X.ensureExtensions(known), known, 'a package whose stub is registered (<id>-route) is the browser\'s to load'); }
  let mode = 'ok';
  X.registerExtension({id: 'zz-synthetic-route', needs: p => !!p.synthetic, load: async () => {}});
  X.registerExtension({id: 'p97-failing-route', needs: p => mode !== 'ok' && (!!p.synthetic || !!p.failing), load: async () => { if (mode === 'throws') throw new ReferenceError('x is not defined'); throw new TypeError('Failed to fetch dynamically imported module: https://aiw.test/chunk-ABC.js'); }});
  // should-fix 10: a package that does not load, or whose module throws while loading, is said in words, with the
  // package named: not as the browser words a failed import, nor as the module's own error reads
  { const failing = {document: {...reference('bank-payment'), failing: {}}, revision: 1};
    for (mode of ['throws', 'network']) { const e = await X.ensureExtensions(failing).then(() => null, x => x); assert.ok(e instanceof Error, mode); assert.equal(e.message, 'Design package p97-failing-route did not load.', 'when the module ' + (mode === 'throws' ? 'throws while loading' : 'cannot be fetched')); }
    mode = 'ok'; assert.equal(await X.ensureExtensions(failing), failing); }
  // the store: a load that fails after the server answered "saved" is saved and not yet shown
  const h = await harness(), realFetch = globalThis.fetch;
  globalThis.fetch = (url, options = {}) => { const headers = new Headers(options.headers); headers.set('oai-authenticated-user-id', A); if (options.method === 'POST') headers.set('Origin', 'https://aiw.test'); return worker.fetch(new Request(new URL(url, 'https://aiw.test'), {...options, headers}), h.env); };
  try {
    const store = createProjectStore(); await store.load(); const shown = store.value.revision;
    mode = 'network';
    const failed = await store.command({type: 'synthetic.save', payload: {title: 'Saved while the package cannot load'}}).then(() => null, e => e);
    assert.ok(failed instanceof Error, 'the caller is told'); assert.equal(store.status, 'behind', 'the store goes to behind, not to error');
    assert.equal(failed.message, 'Saved, not shown yet. Design package p97-failing-route did not load.', 'reported as saved and not yet shown, with the cause in words'); assert.equal(store.value.revision, shown, 'the tab shows what it showed');
    const server = await (await h.api('/api/project' + h.q)).json(); assert.equal(server.revision, shown + 1, 'the server saved it'); assert.equal(server.document.synthetic.records.at(-1).title, 'Saved while the package cannot load');
    // the next save from that tab is refused before it is sent, in the same words: nothing says another tab changed the project
    const again = await store.command({type: 'guide.start', payload: {chapter: 1}}).then(() => null, e => e);
    assert.ok(again?.behind && again.conflict, 'refused as behind'); assert.match(again.message, /^Saved, not shown yet\./); for (const e of [failed, again]) assert.ok(!/another tab|another session/.test(e.message), 'never says another tab changed the project: ' + e.message);
    assert.equal((await (await h.api('/api/project' + h.q)).json()).revision, shown + 1, 'nothing was sent');
    // loading the latest project shows it; a save by another tab then says so, as before
    mode = 'ok'; await store.load(); assert.equal(store.status, 'saved'); assert.equal(store.value.revision, shown + 1);
    const otherTab = new BroadcastChannel('aiw-project:' + h.pid); otherTab.postMessage({revision: 99}); for (let i = 0; i < 50 && store.status !== 'behind'; i++) await new Promise(r => setTimeout(r, 5)); otherTab.close();
    assert.equal(store.status, 'behind'); assert.match((await store.command({type: 'guide.start', payload: {chapter: 1}}).then(() => null, e => e)).message, /newer version .* another tab\. Load the latest project/, 'the words for another tab are kept for another tab');
  } finally { mode = 'ok'; globalThis.fetch = realFetch; h.close(); }
  // the header of a tab that is behind says what holds in both cases, and keeps the short label the phone shows
  { const ux = readFileSync('public/workspace-ux.js', 'utf8'), said = /if\(status==='behind'\)\{[\s\S]*?updateSaveState\('([^']+)',label\)/.exec(ux)?.[1] || '';
    assert.equal(said, 'A newer version is saved.', 'the header does not say another tab saved it'); assert.match(said, /newer version/i, 'dialog.js updateSaveState shortens it to “New version” as before'); }
  pass('D2 (client): ensureExtensions rejects, naming the package, for a document that names a package with no route stub; a load that fails after a saved answer leaves the store behind, reported as saved and not yet shown, and nothing says another tab changed the project');
});

// ---------------------------------------------------------------- D3. the keys the workbench itself writes
await block('D3 workbench keys', async () => {
  need();
  const K = boundary.WORKBENCH_KEYS; assert.ok(K && Object.isFrozen(K), 'one statement of the keys the workbench itself writes (design-extension-parts.js WORKBENCH_KEYS)');
  // every key of a document is in the statement: a top-level key, and each key of a container a package may add to
  // and every id prefix of its records is in the statement of the workbench's own prefixes (should-fix 6): 2 to 5 capitals before the hyphen of an id, a ref or a code
  const PREFIXES = boundary.WORKBENCH_PREFIXES, prefixes = v => { if (Array.isArray(v)) v.forEach(prefixes); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if ((k === 'id' || k === 'ref' || k === 'code') && typeof x === 'string') { const m = /^([A-Z]{2,5})-/.exec(x); if (m) assert.ok(PREFIXES.has(m[1]), 'the statement of prefixes names “' + m[1] + '” (' + x + ')'); } prefixes(x); } };
  const hold = (p, what) => { prefixes(p); for (const [k, v] of Object.entries(p)) { assert.ok(Object.hasOwn(K, k), what + ': the statement names the key “' + k + '”'); if (K[k] && v && typeof v === 'object' && !Array.isArray(v)) for (const b of Object.keys(v)) assert.ok(K[k].includes(b), what + ': the statement names “' + k + '.' + b + '”'); } };
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
  // and against the product source, for the kinds no template holds and no command above writes (a business rule, a
  // review treatment, a Chapter 4 connection's code): every id prefix the source writes as a quoted literal ('ADR-',
  // `CHG-${…}`), and the prefix of every Chapter 1 artefact type. A literal that is no id prefix would only keep a
  // package from a prefix it does not need.
  // (ruling J10; was: every module of public/, the root and shared/ is read. The scan reads the workbench's own modules only: a package's
  // modules are those only its own modules import, from the module the server's list names (packageModules). What a package's modules write
  // as an id prefix is the journal's or another workbench prefix, or a prefix the package states: its kind's, or one it mints.)
  { const named = new Map(), all = [...readdirSync('public').map(f => 'public/' + f), ...readdirSync('.'), ...readdirSync('shared').map(f => 'shared/' + f)].filter(f => f.endsWith('.js')), owned = packageModules(all), sources = all.filter(f => !owned.has(f));
    const LITERAL = /['"`]([A-Z]{2,5})-(?:['"`]|\$\{)/g, stated = new Set(X.EXTENSIONS.filter(e => BUILD_PACKAGES.includes(e.id)).flatMap(e => [...Object.values(e.objectTypes || {}).map(t => t.prefix), ...Object.values(e.prefixes || {})]));
    assert.equal(owned.size > 0, BUILD_PACKAGES.length > 0, 'the packages\' own modules are told from the workbench\'s: ' + [...owned].join(', ')); for (const f of owned) assert.ok(!/^(?:worker|design-packages)\.js$/.test(f) && !['public/design-extensions.js', 'public/record-graph.js', 'public/review-domain.js', 'public/architecture-task-ui.js'].includes(f), f + ' is the workbench\'s');
    for (const f of owned) for (const m of readFileSync(f, 'utf8').matchAll(LITERAL)) assert.ok(PREFIXES.has(m[1]) || stated.has(m[1]), 'a package states every id prefix its modules mint: “' + m[1] + '” (' + f + ')');
    for (const f of sources) for (const m of readFileSync(f, 'utf8').matchAll(LITERAL)) named.set(m[1], f);
    for (const t of ARTEFACT_TYPES) if (/^[A-Z]{2,5}$/.test(t.prefix)) named.set(t.prefix, 'public/requirements-domain.js TYPES');
    assert.ok(sources.length > 400 && named.size >= 80, 'the product source is read: ' + sources.length + ' modules, ' + named.size + ' prefixes');
    for (const [prefix, where] of named) assert.ok(PREFIXES.has(prefix), 'the statement of prefixes names “' + prefix + '” (' + where + ')');
    for (const prefix of ['BR', 'LC', 'RF']) assert.ok(boundary.extensionIssues({id: 'xy', objectTypes: {xy: {label: 'Xy', chapter: 2, level: 'intent', prefix}}}).some(i => i.includes('id prefix “' + prefix + '” is the workbench\'s own')), prefix + ' is the workbench\'s (a business rule, a Chapter 4 connection\'s code, a review treatment)'); }
  // a path on such a key is refused at start, as a lifecycle collection and as a collection of the provenance reader
  for (const path of ['changes.events', 'retired.records', 'finalReview.baselines', 'finalReview.dispositions', 'finalReview.actions', 'finalReview.reviews', 'workbench.history', 'workbench.alternatives', 'knowledge.claims', 'coauthoring.sources', 'assurance.records', 'security.risks', 'runtime.evidence', 'roadmap.plateaus', 'intake.datasets', 'workspace.members', 'evidence.sources', 'workspace.packages', 'artefacts', 'decisions.records', 'modelAlternatives']) {
    assert.ok(boundary.extensionIssues({id: 'xy', lifecycle: {[path]: 3}}).some(i => i.includes('collection “' + path + '” is on a key the workbench itself writes')), path + ' is no lifecycle collection of a package');
    assert.ok(boundary.extensionIssues({id: 'xy', provenance: {records: {[path]: 3}}}).some(i => i.includes('collection “' + path + '” is on a key the workbench itself writes')), path + ' is no collection a package states for the provenance reader');
  }
  // and as an evidence key: it stays in the design
  for (const key of ['brief.interpreted', 'retired', 'modelContext', 'knowledge', 'intake', 'workspace.governance', 'workspace.packages', 'quality.drivers', 'runtime.evidence', 'finalReview.objectives', 'changes.things', 'dataOwnership', 'readingsDefinition', 'knowledge.claims', 'interfaces.specifications']) assert.ok(boundary.extensionIssues({id: 'xy', evidenceKeys: [key]}).some(i => i.includes('evidence key “' + key + '” is a key the workbench keeps')), key + ' stays in the design');
  // a package's own key, and a new key of a chapter's container or of the knowledge workspace, stay allowed
  // (ruling J11; was: the package's own key in this assertion is `adoptions`, written when no package held that key. It is the key of a package of the
  // build now, so a key no package states stands for "a package's own key"; and the same rows on the build's package's key are refused or clash.)
  // (ruling L10; was: the new keys of a chapter's container in this assertion are runtime.nodes and technology.domains,
  // written when no package held them. They are the collections of a package of the build now, which the loop below
  // refuses to another package; new keys no package of the build states stand in their place.)
  assert.ok(!buildCollections().some(path => ['runtime.stations', 'technology.vaults'].includes(path)) && !X.EXTENSIONS.some(e => [...(e.designKeys || []), ...(e.evidenceKeys || [])].some(k => /^(runtime\.stations|technology\.vaults)/.test(k))), 'the keys below are stated by no package of the build');
  assert.deepEqual(boundary.extensionIssues({id: 'xy', lifecycle: {'runtime.stations': 10, 'technology.vaults': 6, 'journals.records': 3}, provenance: {records: {'knowledge.concepts': 11, 'workloads.models': 2}}, designKeys: ['journals', 'runtime.stations', 'knowledge.concepts'], evidenceKeys: ['runtime.nodeEvidence', 'knowledge.library', 'journals.observations', 'workloadMigration']}), []);
  for (const path of buildCollections()) { assert.ok(boundary.extensionIssues({id: 'xy', provenance: {records: {[path]: 3}}}).some(i => i.includes('collection “' + path + '” is read by the provenance reader already')), path + ' is a package\'s of this build: another package does not state it'); }
  pass('D3: one statement of the keys the workbench itself writes holds every key of the ' + templates.length + ' templates and of a document after the command families that make a container, and the statement of id prefixes holds every prefix the product source writes; a lifecycle path, a provenance.records path or an evidence key on such a key is refused at start; a new key of a chapter container stays allowed');
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
    // who wrote a change is what the server says, never what a package's tracker or handler says (the verifier's second
    // round): an event a tracker writes with an actor, an author kind and a review of its own, in an agent account's commit
    try { forge = 'journal'; const third = await invariant('A second invariant a package reads'), before = d().changes.events.length;
      const r = await send('record.retire', {id: third, reason: 'Retired by the agent account.'}, AGENT); assert.equal(r.status, 200, r.error);
      const forged = d().changes.events.slice(before).filter(e => e.source?.kind === 'synthetic'); assert.equal(forged.length, 1);
      assert.deepEqual([forged[0].actor, forged[0].authorKind, forged[0].reviewed, forged[0].account, forged[0].session, forged[0].reason === 'forged'], [AGENT, 'sol-draft', false, 'agent', undefined, false], 'the event carries the commit\'s author, not the tracker\'s words: ' + JSON.stringify(forged[0]).slice(0, 300));
    } finally { forge = ''; }
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
  // (the lead's ruling J9 of 2026-11-19) a package's record that carries no author stamp was written by an upgrade step or a merge: it is
  // counted as that, on a line of its own, never as written by a person
  { const q = documentCopy(p0); q.synthetic = {version: 1, counter: 2, records: [1, 2].map(n => ({id: 'SYN-00' + n, ref: 'SYN-00' + n, title: 'Written by an upgrade ' + n, requirementIds: [], componentId: 'none', revision: 1}))}; Object.assign(q.synthetic.records[1], {confirmed: true, provenance: {reviewed: {by: A, at: AT, how: 'confirmed'}}});
    const u = provenanceReading(withFinalReview(q)), t = architectureMarkdown(withFinalReview(q)).markdown;
    assert.equal(u.total, r0.total + 2); assert.equal(u.by.person, r0.by.person, 'an unstamped record of a package is not counted as written by a person'); assert.equal(u.by.upgrade, 2); assert.ok(!('upgrade' in r0.by), 'a document without such a record has no such count');
    // (the lead's ruling Z6, slice S0-D12; was: /Written by an upgrade of the project or by a merge, with no author stamp: 2 records\. …/) a merge
    // stamps what it writes unless its alternative names no preparer for the command, and the line says so
    assert.match(t.slice(t.indexOf('## E. Provenance')), /Written by an upgrade of the project or by a merge of an alternative that names no preparer, with no author stamp: 2 records\. No person wrote them; 1 is confirmed by a person since\./, 'on a line of their own');
    // an unstamped built-in record reads as it always did (rc.10.73.42 documents hold many)
    const b = documentCopy(p0); b.realisation.components = b.realisation.components.map(({provenance, ...c}) => c); assert.equal(provenanceReading(withFinalReview(b)).by.upgrade, undefined, 'the count is of the packages\' collections only'); }
  // a row a package states over a built-in collection is not read a second time (the hostile package states decisions.records)
  // (ruling J11; was: the list equals the three synthetic collections: now those and the ones the build's packages state, and no built-in collection among them)
  assert.deepEqual(boundary.packageCollections().map(x => x[0]).sort(), [...buildCollections(), 'runtime.otherNotes', 'runtime.otherThings', 'synthetic.records'].sort());
  for (const path of ['decisions.records', 'finalReview.narrative', 'logical.assets']) assert.ok(!boundary.packageCollections().some(x => x[0] === path), path + ' stays the workbench\'s own'); assert.ok(boundary.packageCollections().every(x => !boundary.workbenchKey(x[0])));
  pass('D5: the SDD\'s provenance reading and its open items read the packages\' collections: ' + r.total + ' records with ' + r.by.sol + ' drafted by Sol (' + r0.total + ' and ' + r0.by.sol + ' without them); a built-in collection a package names is not counted twice');
});

// ---------------------------------------------------------------- should-fix 1, 2 and 6: undo, alternatives, a finding id stated twice
await block('SF boundary', async () => {
  need();
  const h = await harness(), {send, rec} = h, d = () => h.state.document, PERSONS = /Undoing a signed-in person.s step is a signed-in person.s step/;
  try {
    // 1. the undo of a person's step is a person's step, and stays with the account that saved the step
    assert.equal((await send('synthetic.save', {title: 'To sign and to accept'})).status, 200); const id = h.last();
    assert.equal((await send('synthetic.sign', {id})).status, 200); assert.equal(rec(id).signed.actor, A);
    let receipt = d().workbench.history.at(-1).undo; assert.equal(receipt.type, 'synthetic.sign');
    for (const [as, extra, words, why] of [[A, {authorKind: 'sol-draft'}, PERSONS, 'a draft by Sol'], [A, {authorKind: 'import'}, PERSONS, 'an import'], [AGENT, {}, /agent|Only the account/, 'an agent account'], [B, {}, /Only the account that saved this action may undo it/, 'another account']]) {
      const r = await send('action.undo', {receiptId: receipt.id}, as, extra); assert.equal(r.status, 400, why + ' does not undo a person\'s step: ' + JSON.stringify(r.body).slice(0, 160)); assert.match(r.error, words, why); await h.read(); assert.equal(rec(id).signed?.actor, A, 'the signature stands (' + why + ')');
    }
    assert.equal((await send('action.undo', {receiptId: receipt.id})).status, 200, 'the person who signed undoes it'); assert.equal(rec(id).signed, undefined);
    assert.equal((await send('synthetic.accept', {id, reviewed: true}, B)).status, 200); receipt = d().workbench.history.at(-1).undo; assert.equal(receipt.type, 'synthetic.accept');
    { const r = await send('action.undo', {receiptId: receipt.id}, B, {authorKind: 'sol-draft'}); assert.equal(r.status, 400, 'a draft by Sol does not undo an acceptance'); assert.match(r.error, PERSONS); await h.read(); assert.equal(rec(id).acceptance?.actor, B); }
    assert.equal((await send('action.undo', {receiptId: receipt.id}, A)).status, 400, 'nor does another person');
    assert.equal((await send('action.undo', {receiptId: receipt.id}, B)).status, 200); assert.equal(rec(id).acceptance, undefined);
    // an ordinary step of a package is undone as before, by a draft too (the rule is for a person's steps)
    assert.equal((await send('synthetic.note', {id, note: 'a note'})).status, 200); receipt = d().workbench.history.at(-1).undo;
    assert.equal((await send('action.undo', {receiptId: receipt.id}, A, {authorKind: 'sol-draft'})).status, 200);
    // 2. validate is asked for every command an alternative carries: when it is saved, revised and merged
    const broken = title => [{type: 'synthetic.save', payload: {title, broken: true}}], plain = [{type: 'synthetic.save', payload: {title: 'In an alternative'}}], count = () => (d().workbench?.alternatives || []).length;
    await h.read(AGENT);
    { const commands = broken('Marked broken by the agent account'), r = await send('workspace.alternative', {commands, stamp: previewScenarioAlternative(d(), commands, undefined).stamp, title: 'Drafted', reason: 'Drafted by the agent account.'}, AGENT);
      assert.equal(r.status, 400, 'an alternative that holds what the type refuses of its author is not saved'); assert.match(r.error, /A draft by Sol does not mark a synthetic record broken/); await h.read(); assert.equal(count(), 0); }
    assert.equal((await send('workspace.alternative', {commands: plain, stamp: previewScenarioAlternative(d(), plain, undefined).stamp, title: 'An alternative', reason: 'A person\'s.'})).status, 200);
    let a = d().workbench.alternatives.at(-1);
    const revise = (commands, extra) => send('workspace.revise-alternative', {id: a.id, revision: a.revision, commands, stamp: previewScenarioAlternative(d(), commands, a.scenario).stamp, basisStamp: rebaseWorkingAlternative(d(), a).stamp, reviewed: true, title: a.title, reason: 'Revised.'}, A, extra);
    { const r = await revise(broken('Marked broken by an import'), {authorKind: 'import'}); assert.equal(r.status, 400, 'nor revised to hold it'); assert.match(r.error, /An import does not mark a synthetic record broken/); await h.read(); assert.equal(d().workbench.alternatives.at(-1).revision, a.revision); }
    assert.equal((await revise(broken('Marked broken by a person'))).status, 200, 'a person revises it so'); a = d().workbench.alternatives.at(-1);
    const merge = extra => send('workspace.merge', {id: a.id, stamp: rebaseWorkingAlternative(d(), a).stamp, reviewed: true, reason: 'Merged.'}, A, extra);
    { const r = await merge({authorKind: 'import'}); assert.equal(r.status, 400, 'nor merged by an author the type refuses'); assert.match(r.error, /An import does not mark a synthetic record broken/); await h.read(); assert.ok(!d().synthetic.records.some(x => x.broken)); }
    assert.equal((await merge()).status, 200); assert.equal(rec(h.last()).broken, true, 'a person merges it');
    // 6. two findings under one id: a treatment would cover both, so none is recorded
    assert.equal((await send('synthetic.save', {title: 'Unbound'})).status, 200); const unbound = h.last(), fid = 'C3:synthetic-unbound:' + unbound;
    const treat = () => { const f = inheritedFindings(withFinalReview(d())).find(x => x.id === fid); return send('review.disposition', {findingId: fid, stamp: f.stamp, treatment: 'Not applicable', rationale: 'Synthetic.', reviewer: 'A reviewer', reference: 'REF-1', reviewed: true}); };
    forge = 'finding'; await h.read(); assert.equal(inheritedFindings(withFinalReview(d())).filter(x => x.id === fid).length, 2, 'two packages state one finding id');
    { const r = await treat(); assert.equal(r.status, 400, 'a treatment of an id two findings share is refused'); assert.match(r.error, new RegExp('Two findings share the id “' + fid + '”')); }
    forge = ''; await h.read(); assert.equal((await treat()).status, 200, 'one finding under the id is treated as any other');
  } finally { forge = ''; h.close(); }
  pass('should-fix 1, 2, 6: the undo of a person-only or second-person step is refused for a draft by Sol, an import, an agent account and another account; validate is asked for every command an alternative carries when it is saved, revised and merged; a treatment of a finding id two findings share is refused');
});

// ---------------------------------------------------------------- D12. who wrote what a merge writes (rulings D12, Y3)
// (the lead's ruling Y3 of 2026-11-22, which settles D12; this block replaces the block of the same name, recorded old ->
// new in audit/rc44/build-notes/s0-d12-merge-author.md) An alternative records who prepared each command it holds: the
// author kind, actor and account kind of the commit that saved it, as the server classified it (authorship.js), and a
// revision names the reviser only for what it changes or adds. A record a merge writes is stamped as written by whoever
// prepared the command that wrote it, a draft by Sol as Sol's and an agent account's as the agent's, and as reviewed by
// the person who merged it: the merge is their reviewed step. So the second-person rule refuses both the preparer and the
// merger as the second person, and a third person takes the step; so for a package's record and for a built-in one. An
// alternative saved before this build records nobody: it merges as before, and its records carry no author stamp (no
// stamp is invented), so a second person's step on them is refused until a person saves or confirms them (the cases of
// the earlier block, kept below as they were).
// A second person's step on a built-in record, as a package may state one (wp2's selection.confirm acts on
// decisions.records): a decision keeps no writer of its own, so the projection names whom the server's stamp names.
const VOUCH = {id: 'zm-vouch', commands: {'vouch.accept': {apply(p, c, at, actor, o) { const r = p.decisions.records.find(x => x.id === c.payload?.id); if (!r) throw Error('Choose a decision.'); r.review = {actor, at, account: o?.author?.account ?? null}; return {document: p, selected: r.id}; }, second: (p, c) => { const r = (p.decisions?.records || []).find(x => x.id === c.payload?.id); return r ? {id: r.id, actor: r.provenance?.author?.by ?? null, history: []} : null; }}}, provenance: {paths: {vouch: ['decisions.records']}}};
await block('D12 a record a merge wrote', async () => {
  need();
  assert.deepEqual(boundary.extensionIssues(VOUCH), []); X.registerExtension(VOUCH);
  const h = await harness(), {send, rec} = h, d = () => h.state.document, accept = (id, as) => send('synthetic.accept', {id, reviewed: true}, as), NO_PERSON = id => new RegExp('needs two persons: no person other than \\S+ stands behind ' + id + ' as it stands .*names no author\\)\\. A second signed-in person saves or confirms ' + id + ' first\\.');
  const ok = (r, why = '') => assert.equal(r.status, 200, why + ' ' + JSON.stringify(r.body).slice(0, 300));
  const stage = async (commands, as, extra = {}) => { await h.read(as); ok(await send('workspace.alternative', {commands, stamp: previewScenarioAlternative(d(), commands, undefined).stamp, title: 'An alternative', reason: 'Prepared for a merge.'}, as, extra), 'saved'); return d().workbench.alternatives.at(-1); };
  const merge = async (id, as = B) => { await h.read(as); const a = d().workbench.alternatives.find(x => x.id === id); const r = await send('workspace.merge', {id, stamp: rebaseWorkingAlternative(d(), a).stamp, reviewed: true, reason: 'Merged by a person.'}, as); ok(r, 'merged'); return r; };
  const step = (type, id, as) => send(type, {id, reviewed: true}, as), decision = id => d().decisions.records.find(x => x.id === id), node = id => d().runtime.nodes.find(x => x.id === id);
  const stamps = r => [r?.provenance?.author?.kind, r?.provenance?.author?.by, r?.provenance?.author?.mergedBy, r?.provenance?.reviewed?.by, r?.provenance?.reviewed?.how];
  const MERGED = (id, by, merger) => new RegExp('^A second person.s step needs two persons: ' + id + ' reads as ' + by + ' prepared it in an alternative and ' + merger + ' merged it\\. A signed-in person who neither prepared nor merged ' + id + ' takes this step\\.$');
  const refused = async (type, id, as, words, why) => { const r = await step(type, id, as); assert.equal(r.status, 400, why + ': ' + JSON.stringify(r.body).slice(0, 200)); assert.match(r.error, words, why + ': ' + r.error); };
  // the stored row rewritten as an older build kept it (a list this build writes taken out, or a restore marked)
  const rewrite = async change => { const row = await h.env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(A, h.pid).first(), stored = await readStoredProject(h.env, A, row.document); change(stored.document); const {saveStoredProject} = await import('./project-storage.js'); assert.ok((await saveStoredProject(h.env, A, h.pid, stored.document, row.revision, new Date().toISOString(), stored.keys)).meta?.changes); await h.read(); };
  try {
    // 1. who prepared each command, for an alternative a person staged, one Sol drafted and one an agent account staged;
    // a built-in record (a decision) and a package's record, each merged by a second person
    for (const [who, as, extra, prepared] of [['a person', A, {}, {kind: 'person', by: A, account: 'person'}], ['a draft by Sol', A, {authorKind: 'sol-draft'}, {kind: 'sol-draft', by: A, account: 'person'}], ['an agent account', AGENT, {}, {kind: 'sol-draft', by: AGENT, account: 'agent'}]]) {
      const a = await stage([{type: 'synthetic.save', payload: {title: 'Prepared by ' + who}}, {type: 'decision.save', payload: {question: 'Which queue holds the retries, as ' + who + ' prepared it?'}}], as, extra);
      assert.deepEqual(list(a.authors).map(({at, ...x}) => x), [prepared, prepared], who + ': the alternative names who prepared each command: ' + JSON.stringify(a.authors));
      assert.ok(a.authors.every(x => x.at === a.at), 'and when');
      await merge(a.id, B);
      const syn = d().synthetic.records.at(-1), dec = d().decisions.records.at(-1);
      assert.deepEqual([syn.title, dec.question], ['Prepared by ' + who, 'Which queue holds the retries, as ' + who + ' prepared it?']);
      for (const r of [syn, dec]) assert.deepEqual(stamps(r), [prepared.kind, prepared.by, B, B, 'merged'], who + ': ' + r.id + ' is stamped as written by whoever prepared it and as reviewed by the person who merged it: ' + JSON.stringify(r.provenance));
      assert.equal(authorship(syn).kind, prepared.kind, who + ': a draft by Sol stays a draft by Sol, an agent account\'s stays the agent\'s, a person\'s is the person\'s');
      // (the lead's ruling Z1; was: assert.equal(syn.actor, B, 'the record names who applied it, as before')) the preparer is the domain's actor for it
      assert.deepEqual([syn.actor, syn.history.map(x => x.actor)], [prepared.by, [prepared.by]], who + ': the record names whoever prepared it as its writer, as a direct write names its writer');
      // the second person is neither the preparer nor the merger
      if (as === AGENT) { const r = await step('synthetic.accept', syn.id, AGENT); assert.equal(r.status, 400); assert.equal(r.body.code, 'authorship', 'an agent account takes no second person\'s step'); }
      else { await refused('synthetic.accept', syn.id, as, MERGED(syn.id, as, B), who + ': the preparer of a package\'s record'); await refused('synthetic.endorse', syn.id, as, MERGED(syn.id, as, B), who + ': on a projection that names only who applied it'); await refused('vouch.accept', dec.id, as, MERGED(dec.id, as, B), who + ': the preparer of a built-in record (ruling Z1: the boundary reads the merge\'s stamp first; was: new RegExp(as + \' wrote \' + dec.id), the projection\'s words read before it)'); }
      // (ruling Z1; was: /architect-b wrote /, when the record named the merger, who applied it) the merge's stamp names the merger
      await refused('synthetic.accept', syn.id, B, MERGED(syn.id, prepared.by, B), 'the merger of a package\'s record'); await refused('synthetic.endorse', syn.id, B, MERGED(syn.id, prepared.by, B), 'and on its projection');
      await refused('vouch.accept', dec.id, B, MERGED(dec.id, prepared.by, B), 'the merger of a built-in record');
      await h.read(); assert.deepEqual([rec(syn.id).acceptance, decision(dec.id).review], [undefined, undefined], 'nothing is accepted by a refused request');
      // a third person: two persons stand behind it, the one who prepared or merged it and the one who takes the step
      { const r = await step('synthetic.accept', syn.id, C); ok(r, who + ': a third person accepts the package\'s record'); assert.equal(rec(syn.id).acceptance.actor, C); }
      { const r = await step('vouch.accept', dec.id, C); ok(r, who + ': and the built-in one'); assert.equal(decision(dec.id).review.actor, C); }
    }
    // a merge request that carries commands of its own (a merge names none: workbench-domain.js applies the alternative's)
    // restamps nothing as the merger's: (the lead's ruling Z6; was: either outcome, a 200 whose stamp stood or a 400 and a
    // merge again) one outcome, refused in words, and the merge without them stamps as the alternative names
    { const a = await stage([{type: 'decision.save', payload: {question: 'Which store keeps the drafts, as a person prepared it?'}}], A); await h.read(B);
      const x = d().workbench.alternatives.find(y => y.id === a.id), r = await send('workspace.merge', {id: a.id, stamp: rebaseWorkingAlternative(d(), x).stamp, reviewed: true, reason: 'Merged by a person.', commands: [{type: 'decision.save', payload: {id: 'ADR-001'}}]}, B);
      assert.equal(r.status, 400, JSON.stringify(r.body).slice(0, 200)); assert.equal(r.error, 'A merge applies the commands the alternative holds: send none with it.');
      ok(await send('workspace.merge', {id: a.id, stamp: rebaseWorkingAlternative(d(), x).stamp, reviewed: true, reason: 'Merged by a person.'}, B));
      const dec = d().decisions.records.find(y => y.question === 'Which store keeps the drafts, as a person prepared it?'); assert.deepEqual(stamps(dec), ['person', A, B, B, 'merged'], 'the stamp stands: ' + JSON.stringify(dec.provenance)); }
    // 2. per command: a revision names the reviser for what it changes or adds and keeps the preparer of what it carries
    { const a = await stage([{type: 'synthetic.save', payload: {title: 'Kept as the agent account prepared it'}}, {type: 'synthetic.save', payload: {title: 'Changed in the revision'}}], AGENT), r = rebaseWorkingAlternative(d(), a);
      const commands = [a.commands[0], {type: 'synthetic.save', payload: {title: 'Changed in the revision by a person'}}, {type: 'synthetic.save', payload: {title: 'Added in the revision'}}];
      await h.read(C); ok(await send('workspace.revise-alternative', {id: a.id, revision: a.revision, commands, stamp: previewScenarioAlternative(d(), commands, a.scenario).stamp, basisStamp: r.stamp, reviewed: true, title: a.title, reason: 'Revised by a person.'}, C), 'revised');
      const b = d().workbench.alternatives.find(x => x.id === a.id);
      assert.deepEqual(b.authors.map(x => [x.kind, x.by, x.account]), [['sol-draft', AGENT, 'agent'], ['person', C, 'person'], ['person', C, 'person']], 'the reviser prepared what the revision changed or added');
      assert.deepEqual(b.authors[0], a.authors[0], 'and the earlier preparer what it carried as it was'); assert.deepEqual(b.history.at(-1).authors, a.authors, 'the revision it replaced keeps its list');
      await merge(a.id, B);
      const [kept, changed, added] = d().synthetic.records.slice(-3);
      assert.deepEqual([stamps(kept), stamps(changed), stamps(added)], [['sol-draft', AGENT, B, B, 'merged'], ['person', C, B, B, 'merged'], ['person', C, B, B, 'merged']]);
      await refused('synthetic.accept', changed.id, C, MERGED(changed.id, C, B), 'the reviser prepared it');
      ok(await accept(changed.id, A), 'a person who neither prepared nor merged it'); ok(await accept(kept.id, C), 'the reviser did not prepare what they carried'); }
    // 3. a later save: one that changes nothing leaves the merge's stamps; a confirmation leaves who wrote it; a person's
    // change makes it that person's, as any save does
    { const a = await stage([{type: 'synthetic.save', payload: {title: 'Saved again later'}}, {type: 'synthetic.save', payload: {title: 'Confirmed later'}}], A); await merge(a.id, B);
      const [saved, confirmed] = d().synthetic.records.slice(-2).map(r => r.id);
      // (the package's record keeps who saved it, `actor`, among what it says: so the preparer's save is the unchanged one; ruling Z1, was the merger's,
      // when the merger was the domain's actor)
      ok(await send('synthetic.save', {id: saved, title: 'Saved again later'}, A)); assert.deepEqual(stamps(rec(saved)), ['person', A, B, B, 'merged'], 'an unchanged save stamps nothing');
      await refused('synthetic.accept', saved, A, MERGED(saved, A, B), 'still the preparer\'s words');
      ok(await send('synthetic.confirm', {id: confirmed}, C)); assert.deepEqual(stamps(rec(confirmed)), ['person', A, B, C, 'confirmed'], 'a confirmation is a review, not a write');
      await refused('synthetic.accept', confirmed, A, MERGED(confirmed, A, B), 'the preparer\'s words still stand'); await refused('synthetic.accept', confirmed, B, MERGED(confirmed, A, B), 'and the merger merged them (ruling Z1; was: /architect-b wrote /, when the merger applied them)');
      ok(await send('synthetic.save', {id: saved, title: 'Saved again later, changed by a person'}, C)); assert.deepEqual(stamps(rec(saved)), ['person', C, undefined, undefined, undefined], 'a person\'s change is that person\'s write');
      await refused('synthetic.accept', saved, C, /architect-c wrote /, 'its writer'); }
    // a keep a person prepared in an alternative (only a person carries one: ruling L1), merged by another person: the
    // proposal is kept by whoever prepared the keep, with the merger named beside it; neither is the second person
    // (a decision: a record an alternative can name by its id, which a package's record is not: workbench-domain.js targetSnapshot)
    { ok(await send('decision.save', {question: 'Which store holds the drafts, as Sol proposes it?'}, AGENT)); const prop = d().decisions.records.at(-1).id; await rewrite(p => { p.decisions.records.find(x => x.id === prop).state = 'proposed'; });
      const a = await stage([{type: 'record.keep', payload: {id: prop, chapter: 3}}], A); await merge(a.id, B); const pv = decision(prop).provenance;
      assert.deepEqual([decision(prop).state === 'proposed', pv.author.kind, pv.author.by, pv.author.mergedBy, pv.reviewed.by, pv.reviewed.how, pv.reviewed.mergedBy], [false, 'sol-draft', AGENT, undefined, A, 'kept', B], 'kept by its preparer, merged by the merger: ' + JSON.stringify(pv));
      // (the lead's ruling Z6; was: MERGED(prop, A, B), which said A prepared the record, where A prepared the keep) worded as kept
      await refused('vouch.accept', prop, B, new RegExp('^A second person.s step needs two persons: ' + prop + ' reads as ' + A + ' kept it in an alternative and ' + B + ' merged it\\. A signed-in person who neither kept nor merged ' + prop + ' takes this step\\.$'), 'the merger of a keep'); await refused('vouch.accept', prop, A, NO_PERSON(prop), 'the one who kept it is one person');
      ok(await step('vouch.accept', prop, C), 'a third person'); }
    // 4. a topology node, a package's record of its own kind: a person's is stamped as theirs and reviewed by the merger; a
    // node a draft by Sol or an agent account prepared arrives as their proposal, which no merge stands behind (a person
    // keeps it: rulings F4 and L1)
    { ok(await send('runtime.topology-start', {}), 'typed');
      const a = await stage([{type: 'runtime.node', payload: {title: 'Sweden Central', kind: 'region'}}], A); await merge(a.id, B); const placed = d().runtime.nodes.at(-1).id;
      assert.deepEqual(stamps(node(placed)), ['person', A, B, B, 'merged'], 'a person\'s node');
      for (const [as, extra] of [[AGENT, {}], [A, {authorKind: 'sol-draft'}]]) { const b = await stage([{type: 'runtime.node', payload: {title: 'Iceland ' + as, kind: 'region', origin: 'sol-draft'}}], as, extra); await merge(b.id, B); const n = d().runtime.nodes.at(-1);
        assert.deepEqual([n.state, n.origin, authorship(n).kind, ...stamps(n)], ['proposed', 'sol-draft', 'sol-draft', undefined, undefined, undefined, undefined, undefined], 'a proposal: no merge stands behind it'); } }
    // and an agent account's change of a person's record, merged by a person, is the agent's, reviewed by the merger (it
    // read as the merger's before this build: the packages' restamp of a collection they hold, here decisions.records)
    { const target = d().decisions.records.find(x => x.provenance?.author?.kind === 'person' && x.provenance.author.by === A).id;
      const a = await stage([{type: 'decision.save', payload: {id: target, question: 'Which queue holds the retries, as the agent account redrafted it?'}}], AGENT); await merge(a.id, B);
      assert.deepEqual([decision(target).question, ...stamps(decision(target))], ['Which queue holds the retries, as the agent account redrafted it?', 'sol-draft', AGENT, B, B, 'merged']);
      await refused('vouch.accept', target, B, MERGED(target, AGENT, B), 'the merger'); }
    // 5. an adoption: no command an alternative carries writes one (its steps are a person's or a second person's, and
    // the selection's are never staged), so a merge writes none
    for (const type of ['adoption.accept', 'adoption.reassess', 'selection.start', 'selection.choose']) {
      assert.throws(() => previewScenarioAlternative(d(), [{type, payload: {id: 'ADP-001'}}], undefined), /This action must use its chapter review workflow/, type + ' is not staged');
      const r = await send('workspace.alternative', {commands: [{type, payload: {id: 'ADP-001'}}], stamp: 'none', title: 'An alternative', reason: 'Holds ' + type + '.'}); assert.equal(r.status, 400, type + ' is refused in an alternative'); }
    // 6. an alternative saved before this build names nobody: it merges as before (the earlier block's cases, as they were)
    { const commands = [{type: 'synthetic.save', payload: {title: 'Written by a merge'}}, {type: 'synthetic.save', payload: {title: 'Written by the same merge'}}];
      assert.equal((await send('workspace.alternative', {commands, stamp: previewScenarioAlternative(d(), commands, undefined).stamp, title: 'An alternative', reason: 'Two records of a package.'})).status, 200);
      const id = d().workbench.alternatives.at(-1).id; await rewrite(p => { delete p.workbench.alternatives.find(x => x.id === id).authors; });
      const a = d().workbench.alternatives.find(x => x.id === id); assert.equal(a.authors, undefined, 'as an older build kept it');
      assert.equal((await send('workspace.merge', {id: a.id, stamp: rebaseWorkingAlternative(d(), a).stamp, reviewed: true, reason: 'Merged by a person.'})).status, 200);
      const [first, second] = d().synthetic.records.slice(-2).map(r => r.id);
      assert.deepEqual([rec(first).actor, rec(first).provenance?.author, rec(second).provenance?.author], [A, undefined, undefined], 'the merge wrote them for the person who merged, and stamped no author (as before this build)');
      for (const as of [B, C]) { const r = await accept(first, as); assert.equal(r.status, 400, 'refused while the record carries no author stamp'); assert.match(r.error, NO_PERSON(first)); }
      await h.read(); assert.equal(rec(first).acceptance, undefined);
      assert.match((await accept(first, A)).error, /architect-a wrote /, 'the person who merged is its author to the one rule, as before');
      assert.equal((await send('synthetic.save', {id: first, title: 'Written by a merge'})).status, 200); assert.equal(rec(first).provenance?.author, undefined, 'an unchanged save stamps no author');
      { const r = await accept(first, B); assert.equal(r.status, 400, 'still refused after a save that changed nothing'); assert.match(r.error, NO_PERSON(first)); }
      assert.equal((await send('synthetic.save', {id: first, title: 'Written by a merge, saved by a person'})).status, 200); assert.deepEqual([rec(first).provenance.author.kind, rec(first).provenance.author.by], ['person', A]);
      { const r = await accept(first, B); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); assert.equal(rec(first).acceptance.actor, B); }
      assert.equal((await send('synthetic.confirm', {id: second}, C)).status, 200); assert.equal(rec(second).provenance.reviewed.by, C);
      { const r = await accept(second, C); assert.equal(r.status, 400); assert.match(r.error, NO_PERSON(second)); }
      { const r = await accept(second, B); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); assert.equal(rec(second).acceptance.actor, B); } }
    // (the lead's ruling Z2; was: a list dated before a restore marker set by hand, finalReview.imported.at, merged with no stamp:
    // [undefined x 5]) no date decides: a list made elsewhere never stands here, because the import moves every list aside
    // (block Z2, through /api/recovery, with future dates); a list on the stored row was written on this workbench and stands
    // whatever date a restore marker carries
    { const a = await stage([{type: 'synthetic.save', payload: {title: 'Prepared before a restore marker'}}], A); await rewrite(p => { p.finalReview.imported = {...(p.finalReview.imported || {}), at: new Date(Date.parse(a.at) + 1).toISOString()}; });
      await merge(a.id, B); assert.deepEqual(stamps(d().synthetic.records.at(-1)), ['person', A, B, B, 'merged'], 'no date is compared with the list'); }
  } finally { h.close(); }
  pass('D12 (ruling Y3): an alternative records who prepared each command; a record a merge writes, a built-in one and a package\'s, is stamped as written by its preparer (a person, a draft by Sol, an agent account) and as reviewed by the merger, and the second-person step is refused for both and taken by a third person; a proposal stays no one\'s; an adoption is written by no merge; an alternative saved before this build merges as before');
});

// ---------------------------------------------------------------- H3. an event a package's staged handler adds
// (the lead's rulings H3 and Y3 of 2026-11-22) Inside a reviewed batch or a merge, a package's staged handler is called
// with four arguments, as every staged handler is, and an event it adds to the journal states no author fields: the
// boundary removes them, as it does for a tracker and for a command sent on its own, so the server's stamp of the commit
// is the only one.
await block('H3 a staged handler states no author', async () => {
  need();
  const h = await harness(), {send} = h, d = () => h.state.document, at = () => d().changes.events.length, written = from => d().changes.events.slice(from).filter(e => e.fields?.[0]?.key === 'staged');
  const who = e => [e.actor, e.authorKind, e.reviewed, e.account, e.session, e.reason];
  try {
    forge = 'staged';
    // sent on its own (so before this build too)
    { const from = at(); assert.equal((await send('synthetic.save', {title: 'Sent on its own'})).status, 200); const e = written(from); assert.equal(e.length, 1, 'the handler journals'); assert.deepEqual(who(e[0]), [A, 'person', true, undefined, undefined, undefined]); }
    // in a reviewed batch
    { const commands = [{type: 'synthetic.save', payload: {title: 'In a reviewed batch'}}], from = at(); await h.read();
      const r = await send('workspace.apply', {commands, stamp: previewWorkingChange(d(), commands).stamp, reviewed: true, reason: 'A reviewed batch.'}); assert.equal(r.status, 200, r.error);
      const e = written(from); assert.equal(e.length, 1); assert.deepEqual(who(e[0]), [A, 'person', true, undefined, undefined, 'A reviewed batch.'], 'the commit\'s author, not the handler\'s words: ' + JSON.stringify(e[0]).slice(0, 300)); }
    // in a batch an agent account drafted
    { const commands = [{type: 'synthetic.save', payload: {title: 'In a drafted batch'}}], from = at(); await h.read(AGENT);
      const r = await send('workspace.apply', {commands, stamp: previewWorkingChange(d(), commands).stamp, reviewed: false, reason: 'A drafted batch.'}, AGENT); assert.equal(r.status, 200, r.error);
      const e = written(from); assert.equal(e.length, 1); assert.deepEqual(who(e[0]), [AGENT, 'sol-draft', false, 'agent', undefined, 'A drafted batch.']); }
    // in a merge
    { const commands = [{type: 'synthetic.save', payload: {title: 'In a merge'}}]; await h.read();
      assert.equal((await send('workspace.alternative', {commands, stamp: previewScenarioAlternative(d(), commands, undefined).stamp, title: 'An alternative', reason: 'For a merge.'})).status, 200);
      const a = d().workbench.alternatives.at(-1), from = at(); await h.read(B); const r = await send('workspace.merge', {id: a.id, stamp: rebaseWorkingAlternative(d(), a).stamp, reviewed: true, reason: 'Merged.'}, B); assert.equal(r.status, 200, r.error);
      const e = written(from); assert.equal(e.length, 1); assert.deepEqual(who(e[0]), [B, 'person', true, undefined, undefined, 'Merged.'], 'the merge\'s author: ' + JSON.stringify(e[0]).slice(0, 300)); }
  } finally { forge = ''; h.close(); }
  pass('H3: an event a package\'s staged handler adds states no author fields of its own, sent on its own, in a reviewed batch, in a drafted batch and in a merge: the server\'s stamp of the commit is the only one');
});

// ---------------------------------------------------------------- Z. who wrote what a merge writes, after its review
// (the lead's rulings Z1 to Z7 of 2026-11-22) What the merge cases below share: a server with a fourth person (D), an
// alternative staged by an account, merged by another, and the stamps a record carries.
const D = 'architect-d';
async function mergeKit() {
  const h = await harness(), d = () => h.state.document, ok = (r, why = '') => { assert.equal(r.status, 200, why + ' ' + JSON.stringify(r.body).slice(0, 300)); return r; };
  assert.equal((await h.api('/api/access' + h.q, 'POST', {actorId: D, role: 'editor'})).status, 200);
  const k = {h, d, ok, send: h.send, rec: h.rec,
    stage: async (commands, as, extra = {}) => { await h.read(as); ok(await h.send('workspace.alternative', {commands, stamp: previewScenarioAlternative(d(), commands, undefined).stamp, title: 'An alternative', reason: 'Prepared for a merge.'}, as, extra), 'saved'); return d().workbench.alternatives.at(-1); },
    mergeRequest: async (id, as = B) => { await h.read(as); const a = d().workbench.alternatives.find(x => x.id === id); return h.send('workspace.merge', {id, stamp: rebaseWorkingAlternative(d(), a).stamp, reviewed: true, reason: 'Merged by a person.'}, as); },
    stamps: r => [r?.provenance?.author?.kind, r?.provenance?.author?.by, r?.provenance?.author?.mergedBy, r?.provenance?.reviewed?.by, r?.provenance?.reviewed?.how],
    action: id => d().finalReview.actions.find(x => x.id === id),
    // the stored row rewritten as an older build kept it
    rewrite: async change => { const row = await h.env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(A, h.pid).first(), stored = await readStoredProject(h.env, A, row.document); change(stored.document); const {saveStoredProject} = await import('./project-storage.js'); assert.ok((await saveStoredProject(h.env, A, h.pid, stored.document, row.revision, new Date().toISOString(), stored.keys)).meta?.changes); await h.read(); }};
  k.merge = async (id, as = B) => ok(await k.mergeRequest(id, as), 'merged');
  k.step = (type, id, as) => h.send(type, {id, reviewed: true}, as);
  // the words of a refused step, or null when it is taken (and then what it took is asserted by the case)
  k.words = async (type, id, as) => { const r = await k.step(type, id, as); return r.status === 200 ? null : (assert.equal(r.status, 400, type + ' as ' + as + ': ' + JSON.stringify(r.body).slice(0, 200)), r.error); };
  return k;
}
const ACTION = objectId => ({title: 'Verify the merged delivery evidence', owner: 'Delivery lead', due: '2026-12-01', acceptance: 'Record the observed result and its limits.', objectIds: [objectId], findingId: ''});
const VERIFY = id => ({id, status: 'Verified', progress: 'Observed check recorded.', reviewer: 'Typed external reviewer', reference: 'Fixture evidence', reviewed: true});
// Z1. One source of who wrote a merged record: the preparer is the domain's actor in a merge, as in a direct write.
await block('Z1 one source of who wrote a merged record', async () => {
  need();
  const k = await mergeKit(), {ok, send, rec, stage, merge, stamps, words} = k, same = (x, y, from, to) => assert.equal(x, y.split(from).join(to), 'refused in the words a direct writer is refused in: ' + x);
  try {
    // a package's record: whoever prepared it is its writer to the domain (actor, history), as a direct write names them
    ok(await send('synthetic.save', {title: 'Written directly by A'}, A)); const direct = k.h.last();
    { const a = await stage([{type: 'synthetic.save', payload: {title: 'Prepared by A'}}], A); await merge(a.id, B); }
    const merged = k.h.last();
    assert.deepEqual([rec(merged).actor, rec(merged).history.map(x => x.actor)], [rec(direct).actor, rec(direct).history.map(x => x.actor)], 'the record\'s actor and history name the preparer, as a direct write names its writer');
    assert.deepEqual(stamps(rec(merged)), ['person', A, B, B, 'merged'], 'the merger is named beside the stamp and as the review');
    // the merger's later change of what it says: the preparer stays among its writers for good, as a direct writer does
    ok(await send('synthetic.save', {id: direct, title: 'Changed by B'}, B)); ok(await send('synthetic.save', {id: merged, title: 'Changed by B'}, B));
    assert.deepEqual(stamps(rec(merged)), ['person', B, undefined, undefined, undefined], 'a later change is its writer\'s');
    for (const type of ['synthetic.endorse', 'synthetic.accept']) {
      const w = await words(type, direct, A); assert.match(w || '', /architect-a wrote /, 'the direct writer is refused (' + type + ')');
      same(await words(type, merged, A), w, direct, merged); same(await words(type, merged, B), await words(type, direct, B), direct, merged); }
    { ok(await k.step('synthetic.endorse', merged, C), 'a third person'); ok(await k.step('synthetic.accept', merged, C)); assert.deepEqual([rec(merged).review.actor, rec(merged).acceptance.actor], [C, C]); }
    // a third person's later change: the preparer and that person are refused as a direct writer and an editor are
    ok(await send('synthetic.save', {title: 'Written directly by A, then by C'}, A)); const direct2 = k.h.last();
    { const a = await stage([{type: 'synthetic.save', payload: {title: 'Prepared by A, then changed by C'}}], A); await merge(a.id, B); }
    const merged2 = k.h.last();
    ok(await send('synthetic.save', {id: direct2, title: 'Changed by C'}, C)); ok(await send('synthetic.save', {id: merged2, title: 'Changed by C'}, C));
    for (const type of ['synthetic.endorse', 'synthetic.accept']) for (const as of [A, C]) {
      const w = await words(type, direct2, as); assert.match(w || '', new RegExp(as + ' wrote '), type + ': ' + as + ' is refused on the direct record');
      same(await words(type, merged2, as), w, direct2, merged2); }
    // (the merger, once a later change replaced the merge's stamp, is no writer of it: a merge's stamp refuses the merger while it stands)
    { ok(await k.step('synthetic.endorse', merged2, B), 'the merger, after another person\'s change'); ok(await k.step('synthetic.accept', merged2, D), 'a fourth person'); }
  } finally { k.h.close(); }
  // the obligation verifier (review.delivery), the built-in second person's step a merge can feed (a project without the
  // synthetic package's records, whose tracker changes the design at every commit and so leaves no action current)
  const k2 = await mergeKit();
  try {
    const {d, ok, send, stage, merge, stamps, action} = k2, objectId = d().artefacts[0].id, verify = (id, as) => send('review.delivery', VERIFY(id), as);
    const deliveryWords = async (id, as) => { const r = await verify(id, as); return r.status === 200 ? null : (assert.equal(r.status, 400, JSON.stringify(r.body).slice(0, 200)), r.error); };
    // (each pair in turn: a later change of the design leaves an earlier action not current, so the direct action's
    // refusals are read, and it is verified, before the alternative is staged and merged)
    const pair = async (saver, verifier) => {
      ok(await send('review.action', ACTION(objectId), A)); const direct = d().finalReview.actions.at(-1).id; ok(await send('review.action', {...ACTION(objectId), id: direct}, saver));
      const refusals = {}; for (const as of [A, saver]) { const w = await deliveryWords(direct, as); assert.match(w || '', new RegExp(as + ' wrote ' + direct), as + ' is refused on the direct action: ' + w); refusals[as] = w; }
      ok(await verify(direct, verifier), 'directly, ' + verifier + ' verifies it');
      { const a = await stage([{type: 'review.action', payload: ACTION(objectId)}], A); await merge(a.id, B); }
      const id = d().finalReview.actions.at(-1).id; assert.notEqual(id, direct);
      assert.deepEqual([action(id).actor, ...stamps(action(id))], [A, 'person', A, B, B, 'merged'], 'the action names its preparer as its author, as a direct save does');
      ok(await send('review.action', {...ACTION(objectId), id}, saver));
      for (const as of [A, saver]) same(await deliveryWords(id, as), refusals[as], direct, id);
      ok(await verify(id, verifier), verifier + ' verifies it'); assert.equal(action(id).verification.actor, verifier); };
    // (1) A prepares, B merges, B saves it again (a merged action is current once saved again); directly: A writes, B saves it again; C verifies
    await pair(B, C);
    // (2) A prepares, B merges, C saves it again: A and C are refused as on a direct action A wrote and C saved again; D verifies
    await pair(C, D);
    // (3) while the merge's stamp stands (the preparer saves it again unchanged, to make it current), the merger is refused too
    { const a = await stage([{type: 'review.action', payload: ACTION(objectId)}], A); await merge(a.id, B); }
    const standing = d().finalReview.actions.at(-1).id; ok(await send('review.action', {...ACTION(objectId), id: standing}, A));
    assert.deepEqual(stamps(action(standing)), ['person', A, B, B, 'merged'], 'an unchanged save by its preparer leaves the merge\'s stamp');
    assert.equal(await deliveryWords(standing, B), 'A second signed-in person, who did not write or own the action, verifies it. ' + B + ' merged ' + standing + '.', 'the merger, in the verifier\'s words');
    assert.match(await deliveryWords(standing, A) || '', new RegExp(A + ' wrote ' + standing)); assert.equal(action(standing).verification, null, 'nothing is verified by a refused request');
    ok(await verify(standing, C), 'a third person verifies it');
  } finally { k2.h.close(); }
  pass('Z1: a merged command whose preparer is known is applied with the preparer as the domain\'s actor; after a later change by the merger or by a third person, a package\'s second-person step (a projection and the record) and the obligation verifier refuse the preparer and the editor in the words a direct writer is refused in, and a third person takes the step; while the merge\'s stamp stands the verifier refuses the merger too');
});

// Z2. A preparer cannot be forged by an import: a recovery import moves who prepared each command aside, whatever its dates.
// The same steps as mergeKit's, in a project of another owner (a restored one).
async function projectKit(h, pid, owner, members) {
  const q = '?project=' + encodeURIComponent(pid), ok = (r, why = '') => { assert.equal(r.status, 200, why + ' ' + JSON.stringify(r.body).slice(0, 300)); return r; };
  for (const actorId of members) assert.equal((await h.api('/api/access' + q, 'POST', {actorId, role: 'editor'}, owner)).status, 200);
  let state = null; const read = async as => (state = await (await h.api('/api/project' + q, 'GET', null, as)).json()), d = () => state.document;
  const send = async (type, payload, as, extra = {}) => { const cur = await read(as), res = await h.api('/api/commands' + q, 'POST', {revision: cur.revision, command: {type, payload}, ...extra}, as), body = await res.json(); if (res.status === 200) state = body; return {status: res.status, body, error: body.error || ''}; };
  const merge = async (id, as) => { await read(as); const a = d().workbench.alternatives.find(x => x.id === id); return ok(await send('workspace.merge', {id, stamp: rebaseWorkingAlternative(d(), a).stamp, reviewed: true, reason: 'Merged by a person.'}, as), 'merged'); };
  const stage = async (commands, as) => { await read(as); ok(await send('workspace.alternative', {commands, stamp: previewScenarioAlternative(d(), commands, undefined).stamp, title: 'An alternative', reason: 'Prepared for a merge.'}, as), 'saved'); return d().workbench.alternatives.at(-1); };
  return {q, ok, read, d, send, merge, stage};
}
await block('Z2 an import forges no preparer', async () => {
  need();
  const k = await mergeKit(), {d, ok, send, stage, stamps} = k, FUTURE = '2099-01-01T00:00:00.000Z', Z = 'architect-z';
  const NO_PERSON = id => new RegExp('needs two persons: no person other than \\S+ stands behind ' + id + ' as it stands .*names no author\\)\\. A second signed-in person saves or confirms ' + id + ' first\\.');
  try {
    // three alternatives on the workbench the package comes from, one revised there (its history keeps the list it replaced)
    const third = await stage([{type: 'synthetic.save', payload: {title: 'Prepared by A, relabelled as a third person'}}], A);
    { const r = rebaseWorkingAlternative(d(), third), commands = [{type: 'synthetic.save', payload: {title: 'Prepared by A, revised by C, relabelled as a third person'}}]; await k.h.read(C);
      ok(await send('workspace.revise-alternative', {id: third.id, revision: third.revision, commands, stamp: previewScenarioAlternative(d(), commands, third.scenario).stamp, basisStamp: r.stamp, reviewed: true, title: third.title, reason: 'Revised by a person.'}, C), 'revised'); }
    const agent = await stage([{type: 'synthetic.save', payload: {title: 'Prepared by the agent account, relabelled as a person'}}], AGENT);
    const own = await stage([{type: 'synthetic.save', payload: {title: 'Prepared by A, relabelled as another person here'}}], A);
    // the package, hand-edited (a project JSON needs no checksum): every list dated after the import, naming someone else
    const pack = structuredClone((await k.h.read()).document), alt = id => pack.workbench.alternatives.find(x => x.id === id), forged = (by, extra = {}) => [{kind: 'person', by, account: 'person', at: FUTURE, ...extra}];
    alt(third.id).authors = forged(Z); alt(third.id).history.at(-1).authors = forged(Z); alt(agent.id).authors = forged(AGENT); alt(own.id).authors = forged(D);
    const preview = await k.h.api('/api/recovery?action=preview', 'POST', {package: pack}, B); assert.equal(preview.status, 200, JSON.stringify(await preview.clone().json()).slice(0, 300));
    const restored = await k.h.api('/api/recovery?action=restore', 'POST', {package: pack, hash: (await preview.json()).hash, name: 'Restored with forged preparers', reviewed: true}, B), made = await restored.json(); assert.equal(restored.status, 201, JSON.stringify(made).slice(0, 300));
    const r = await projectKit(k.h, made.id, B, [A, C, D, AGENT]); await r.read(C);
    // each list is kept as history (importedAuthors), its history's too, and names nobody here
    const back = id => r.d().workbench.alternatives.find(x => x.id === id);
    for (const [id, was] of [[third.id, forged(Z)], [agent.id, forged(AGENT)], [own.id, forged(D)]]) { assert.equal(back(id).authors, undefined, 'no list stands after the import'); assert.deepEqual(back(id).importedAuthors, was, 'it is kept as history'); }
    assert.deepEqual([back(third.id).history.at(-1).authors, back(third.id).history.at(-1).importedAuthors], [undefined, forged(Z)], 'and the list its history kept');
    const syn = () => r.d().synthetic.records.at(-1), accept = async (id, as) => { const x = await r.send('synthetic.accept', {id, reviewed: true}, as); assert.equal(x.status, 400, as + ' on ' + id + ': ' + JSON.stringify(x.body).slice(0, 200)); return x.error; };
    // (1) future-dated authors naming a third person: merged as an alternative saved before this build, no stamp names anyone
    await r.merge(third.id, C); { const x = syn(); assert.deepEqual(stamps(x), [undefined, undefined, undefined, undefined, undefined], 'no stamp names who prepared it elsewhere: ' + JSON.stringify(x.provenance)); assert.ok(!JSON.stringify(x).includes(Z), Z + ' is named nowhere on the record'); assert.equal(x.actor, C, 'its writer to the domain is the person who merged it here'); }
    // (2) an agent account's entry relabelled as a person's: no person stands behind what the agent prepared
    await r.merge(agent.id, C); { const x = syn(); assert.deepEqual(stamps(x), [undefined, undefined, undefined, undefined, undefined]); assert.match(await accept(x.id, D), NO_PERSON(x.id), 'a second person\'s step is refused until a person saves or confirms it'); }
    // (3) the real preparer, relabelled, then takes the second person's step: refused in the words for a record no person stands behind
    await r.merge(own.id, C); { const x = syn(); assert.deepEqual(stamps(x), [undefined, undefined, undefined, undefined, undefined]); for (const as of [A, D]) assert.match(await accept(x.id, as), NO_PERSON(x.id), as + ' is refused'); assert.equal(syn().acceptance, undefined); }
    // an alternative saved here after the restore is stamped as its preparer's: what the import moved decides, never a date
    { const a = await r.stage([{type: 'synthetic.save', payload: {title: 'Prepared by A after the restore'}}], A); assert.deepEqual(a.authors.map(x => [x.kind, x.by]), [['person', A]]); await r.merge(a.id, C); assert.deepEqual(stamps(syn()), ['person', A, C, C, 'merged']); }
  } finally { k.h.close(); }
  // (4) a document without finalReview (as wp9a's S1.16 calls it): the lists are moved before the early return; a document
  // whose alternatives name nobody gains no key
  { const {neutraliseImportedAuthority} = await import('./recovery-service.js'), x = {kind: 'person', by: Z, account: 'person', at: FUTURE};
    const p = {workbench: {alternatives: [{id: 'WA-1', commands: [{type: 'synthetic.save', payload: {}}], authors: [x], history: [{revision: 1, authors: [x]}, {revision: 2}]}, {id: 'WA-2', commands: []}]}};
    neutraliseImportedAuthority(p, AT); const [one, two] = p.workbench.alternatives;
    assert.deepEqual([one.authors, one.importedAuthors, one.history[0].authors, one.history[0].importedAuthors, 'importedAuthors' in one.history[1], 'importedAuthors' in two], [undefined, [x], undefined, [x], false, false]); }
  pass('Z2: a recovery import moves each alternative\'s list of preparers, and its history\'s, aside as importedAuthors, with or without finalReview: future-dated authors naming a third person, an agent account\'s entry relabelled as a person\'s and a preparer relabelled who then takes the second person\'s step (refused in the words for a record no person stands behind) merge stamping nothing as anyone\'s; an alternative saved here after the restore is stamped as its preparer\'s');
});

// Z3. A revision keeps a preparer through a rebase: the editor sends the rebased commands (public/alternative-editor.js).
await block('Z3 a revision keeps a preparer through a rebase', async () => {
  need();
  const k = await mergeKit(), {d, ok, send, stage, merge, stamps} = k, decision = id => d().decisions.records.find(x => x.id === id), list3 = a => a.authors.map(x => [x.kind, x.by, x.account]);
  const revise = async (a, commands, as, title = a.title + ' (revised)') => { await k.h.read(as); const x = d().workbench.alternatives.find(y => y.id === a.id), r = rebaseWorkingAlternative(d(), x);
    ok(await send('workspace.revise-alternative', {id: x.id, revision: x.revision, commands: commands(r, x), stamp: previewScenarioAlternative(d(), commands(r, x), x.scenario).stamp, basisStamp: r.stamp, resolutions: {}, reviewed: true, title, reason: 'Revised by a person.'}, as), 'revised'); return d().workbench.alternatives.find(y => y.id === a.id); };
  try {
    // the reviewer's case: A writes a decision; the agent account stages a redraft of it; C changes its owner directly;
    // A revises the alternative as the editor sends it (the rebased commands, only the title changed, nothing to resolve)
    ok(await send('decision.save', {question: 'Which queue holds the retries?', owner: 'Payments team'}, A)); const target = d().decisions.records.at(-1).id;
    const a = await stage([{type: 'decision.save', payload: {id: target, question: 'Which queue holds the retries, as the agent account redrafted it?', owner: 'Payments team'}}], AGENT);
    ok(await send('decision.save', {id: target, owner: 'Platform team'}, C));
    { const r = rebaseWorkingAlternative(d(), d().workbench.alternatives.find(x => x.id === a.id)); assert.equal(r.conflicts.length, 0); assert.notDeepEqual(r.commands[0], a.commands[0], 'the rebased command carries C\'s owner'); }
    const b = await revise(a, r => structuredClone(r.commands), A);
    assert.deepEqual(list3(b), [['sol-draft', AGENT, 'agent']], 'a command carried as rebased keeps its preparer: ' + JSON.stringify(b.authors));
    await merge(a.id, B);
    assert.deepEqual([decision(target).question, decision(target).owner, ...stamps(decision(target))], ['Which queue holds the retries, as the agent account redrafted it?', 'Platform team', 'sol-draft', AGENT, B, B, 'merged'], 'the agent\'s words stay the agent\'s');
    // each stored command is matched once: two the agent prepared alike, and a third alike that the reviser adds
    { const same = {type: 'synthetic.save', payload: {title: 'Prepared alike'}}, x = await stage([same, same], AGENT), y = await revise(x, () => [same, same, same], C);
      assert.deepEqual(list3(y), [['sol-draft', AGENT, 'agent'], ['sol-draft', AGENT, 'agent'], ['person', C, 'person']], 'the third is the reviser\'s'); }
    // a command that differs from both is the reviser's, and says whose draft it started from, as settle says of a direct edit
    // (a command that names no record pairs with a stored one of its type that nothing matched: a new one has none left)
    { const x = await stage([{type: 'synthetic.save', payload: {title: 'Drafted by Sol in A\'s session'}}], A, {authorKind: 'sol-draft'});
      const y = await revise(x, () => [{type: 'synthetic.save', payload: {title: 'Drafted by Sol, rewritten by C'}}, {type: 'synthetic.save', payload: {title: 'Added by C'}}], C);
      assert.deepEqual(y.authors.map(e => [e.kind, e.by, e.from]), [['person', C, 'sol-draft'], ['person', C, undefined]], 'the rewrite names Sol\'s draft as where it started; what C added names none');
      await merge(x.id, B); const [rewritten, added] = d().synthetic.records.slice(-2);
      assert.deepEqual([rewritten.provenance.author.from, authorship(rewritten).kind, authorship(rewritten).from], ['sol-draft', 'person', 'sol-draft'], 'the merged record is C\'s, from Sol\'s draft: ' + JSON.stringify(rewritten.provenance));
      assert.deepEqual([added.provenance.author.from, authorship(added).from], [undefined, null]); }
    // and the reviewer's case with a change: A rewrites the agent's redraft, so the merged decision is A's, from Sol's draft
    { ok(await send('decision.save', {question: 'Which store keeps the drafts?', owner: 'Payments team'}, A)); const t2 = d().decisions.records.at(-1).id;
      const x = await stage([{type: 'decision.save', payload: {id: t2, question: 'Which store keeps the drafts, as the agent account redrafted it?', owner: 'Payments team'}}], AGENT);
      ok(await send('decision.save', {id: t2, owner: 'Platform team'}, C));
      const y = await revise(x, r => { const c = structuredClone(r.commands); c[0].payload.question = 'Which store keeps the drafts, as A rewrote the agent\'s redraft?'; return c; }, A);
      assert.deepEqual(y.authors.map(e => [e.kind, e.by, e.from]), [['person', A, 'sol-draft']]); await merge(x.id, B);
      assert.deepEqual([...stamps(decision(t2)), decision(t2).provenance.author.from], ['person', A, B, B, 'merged', 'sol-draft']); }
  } finally { k.h.close(); }
  pass('Z3: a revision keeps the preparer of a command it carries as stored or as rebased (the editor\'s payload after another person\'s direct edit of the target), each stored command matched once; a command that differs from both is the reviser\'s and names the earlier preparer\'s kind as from, which the merged record keeps (a revised draft by Sol is still disclosed as from Sol\'s draft)');
});

// Z4. Four eyes (a project's setting) in a merge: a command that confirms what its own preparer wrote is refused, in
// words for the person who merges (on 53ce4cf the merge went through and the narrative read as confirmed).
await block('Z4 four eyes in a merge', async () => {
  need();
  const k = await mergeKit(), {d, ok, send, stage} = k, narrative = confirmed => ({title: 'Payments platform design', owner: 'Architecture team', audience: 'Delivery teams', summary: 'The design as A wrote it.', scope: 'Payments.', approach: 'Event-driven.', confirmed});
  try {
    ok(await send('workspace.governance', {fourEyes: true, reason: 'A second person on every confirmation.'}, A));
    const a = await stage([{type: 'review.narrative', payload: narrative(true)}], A), was = structuredClone(d().finalReview.narrative);
    const r = await k.mergeRequest(a.id, B);
    assert.equal(r.status, 400, 'the merge is refused: ' + JSON.stringify(r.body).slice(0, 300));
    assert.match(r.error, /^Four eyes: command 1 of “An alternative” \(review\.narrative\) was prepared by architect-a and confirms what architect-a wrote \([^)]+\)\. Revise the alternative without the confirmation; another signed-in person confirms it after the merge\.$/, 'in words for the merger: ' + r.error);
    await k.h.read(B); assert.deepEqual([d().workbench.alternatives.find(x => x.id === a.id).status, d().finalReview.narrative], ['draft', was], 'nothing is merged, nothing confirmed');
    // what the words say to do: the alternative without the confirmation merges, and another signed-in person confirms it after
    const b = await stage([{type: 'review.narrative', payload: narrative(false)}], A); await k.merge(b.id, B);
    assert.deepEqual([d().finalReview.narrative.summary, d().finalReview.narrative.confirmed], ['The design as A wrote it.', false]);
    { const r2 = await send('review.narrative', {...narrative(true)}, A); assert.equal(r2.status, 400); assert.match(r2.error, /^Four eyes: architect-a wrote /, 'directly, its preparer does not confirm it either'); }
    ok(await send('review.narrative', {...narrative(true)}, C), 'another signed-in person confirms it'); assert.deepEqual([d().finalReview.narrative.confirmed, d().finalReview.narrative.provenance.reviewed.by, d().finalReview.narrative.provenance.reviewed.how], [true, C, 'confirmed']);
  } finally { k.h.close(); }
  pass('Z4: with four eyes on, a merge whose command confirms what its own preparer wrote is refused, naming the command, the alternative and its preparer and saying what to do; the alternative without the confirmation merges and another signed-in person confirms it after');
});

// Z5. One merge path: a command of an alternative that names no preparer (saved before this build, carried from one, or
// imported) stamps what it writes as nobody's, built-in and package records alike; the merge-level stamping as the
// merger's is retired. Such records fail closed: a person saves, confirms or keeps them before a second person's step.
await block('Z5 one merge path', async () => {
  need(); if (!X.EXTENSIONS.some(e => e.id === VOUCH.id)) X.registerExtension(VOUCH);
  const k = await mergeKit(), {d, ok, send, stage, merge, stamps, rewrite, rec} = k, decision = id => d().decisions.records.find(x => x.id === id), none = [undefined, undefined, undefined, undefined, undefined];
  const refused = async (type, id, as, words) => { const r = await k.step(type, id, as); assert.equal(r.status, 400, type + ' as ' + as + ' on ' + id + ': ' + JSON.stringify(r.body).slice(0, 200)); assert.match(r.error, words, r.error); };
  const NO_AUTHOR = id => new RegExp('^' + id + ' names no author: save it again first\\.$'), NO_PERSON = id => new RegExp('needs two persons: no person other than \\S+ stands behind ' + id + ' as it stands');
  try {
    // a person's decision, which an alternative saved before this build (its list taken out of the stored row) changes, beside a new decision and a package's record
    ok(await send('decision.save', {question: 'Which queue holds the retries?'}, A)); const target = d().decisions.records.at(-1).id; assert.deepEqual(stamps(decision(target)).slice(0, 2), ['person', A]);
    const old = await stage([{type: 'decision.save', payload: {id: target, question: 'Which queue holds the retries, as an older build kept the redraft?'}}, {type: 'decision.save', payload: {question: 'Which store keeps the drafts, from an older build?'}}, {type: 'synthetic.save', payload: {title: 'From an alternative saved before this build'}}], AGENT);
    await rewrite(p => { delete p.workbench.alternatives.find(x => x.id === old.id).authors; });
    await merge(old.id, B); const made = d().decisions.records.at(-1).id, syn = k.h.last();
    assert.equal(decision(target).question, 'Which queue holds the retries, as an older build kept the redraft?');
    assert.deepEqual([stamps(decision(target)), stamps(decision(made)), stamps(rec(syn))], [none, none, none], 'what the merge wrote is stamped as nobody\'s, the changed record too (it read as A\'s before: ' + JSON.stringify(decision(target).provenance) + ')');
    // it fails closed: nobody takes a second person's step on it, the merger and a third person included
    for (const as of [B, C]) { await refused('vouch.accept', target, as, NO_AUTHOR(target)); await refused('synthetic.accept', syn, as, as === B ? /architect-b wrote / : NO_PERSON(syn)); }
    // until a person saves or confirms it: then a second person takes the step
    ok(await send('decision.save', {id: target, question: 'Which queue holds the retries, as C read the redraft?'}, C)); ok(await k.step('vouch.accept', target, D), 'a second person, once a person saved it');
    ok(await send('synthetic.confirm', {id: syn}, C)); ok(await k.step('synthetic.accept', syn, D), 'a second person, once a person confirmed it');
    // a mixed list (a command carried from such an alternative names nobody, null): each command is stamped as its entry says
    ok(await send('decision.save', {question: 'Which store keeps the audit trail?'}, A)); const t2 = d().decisions.records.at(-1).id;
    const mixed = await stage([{type: 'synthetic.save', payload: {title: 'Prepared by A in a mixed list'}}, {type: 'decision.save', payload: {id: t2, question: 'Which store keeps the audit trail, from an older build?'}}], A);
    await rewrite(p => { p.workbench.alternatives.find(x => x.id === mixed.id).authors[1] = null; });
    await merge(mixed.id, B); const named = d().synthetic.records.at(-1);
    assert.deepEqual([stamps(named), named.actor, stamps(decision(t2))], [['person', A, B, B, 'merged'], A, none], 'the named command is its preparer\'s, merged by B; the unnamed one is nobody\'s');
    await refused('synthetic.accept', named.id, A, /reads as architect-a prepared it in an alternative and architect-b merged it/); await refused('vouch.accept', t2, C, NO_AUTHOR(t2));
    ok(await k.step('synthetic.accept', named.id, C), 'a third person');
    // the storage upgrade's report counts the stored draft alternatives that name nobody for some command (here: one with
    // no list, one with an entry null; the merged ones are no drafts)
    { const third = await stage([{type: 'synthetic.save', payload: {title: 'A draft with no list'}}], A), fourth = await stage([{type: 'synthetic.save', payload: {title: 'A draft whose list names a preparer'}}, {type: 'synthetic.save', payload: {title: 'And one carried with none'}}], A);
      await stage([{type: 'synthetic.save', payload: {title: 'A draft that names its preparer'}}], A);
      await rewrite(p => { delete p.workbench.alternatives.find(x => x.id === third.id).authors; p.workbench.alternatives.find(x => x.id === fourth.id).authors[1] = null; });
      const row = await k.h.env.DB.prepare('SELECT document,revision,updated_at FROM projects WHERE owner_id=? AND id=?').bind(A, k.h.pid).first(), stored = await readStoredProject(k.h.env, A, row.document);
      assert.ok(await storeStorageUpgrade(k.h.env, {owner: A, actor: A, role: 'owner'}, k.h.pid, row, stored, withFinalReview(structuredClone(stored.document))), 'stored');
      const events = (await k.h.env.DB.prepare('SELECT document FROM project_activity WHERE owner_id=? AND project_id=?').bind(A, k.h.pid).all()).results.map(r => JSON.parse(r.document)).filter(e => e.kind === 'storage');
      assert.equal(events.length, 1); assert.ok(events[0].summary.endsWith('the previous version is kept for recovery. 2 draft alternatives name no one who prepared some of their commands (saved before this version of AIW, carried from one, or restored): a merge stamps what those commands write as nobody\'s, so a signed-in person saves, confirms or keeps each such record before a second person\'s step.'), events[0].summary.slice(-400)); }
  } finally { k.h.close(); }
  // a project with no such alternative: the report says nothing of them (the case of block 2 holds its whole sentence)
  pass('Z5: an alternative that names no preparer, wholly or for one command, merges stamping what those commands write as nobody\'s, a changed built-in record and a package\'s record alike, so a second person\'s step on it is refused until a person saves or confirms it; a named command in the same merge is stamped as its preparer\'s; the merge-level stamping as the merger\'s is retired; the storage upgrade\'s report counts the draft alternatives that name nobody');
});

// Z6. The review's should-fix items (the lead's ruling Z6): a merge request carries no commands of its own (one outcome);
// the words for the merger of a keep or a confirmation say kept or confirmed. (Mixed lists: block Z5; the reviser's from:
// block Z3; unstatedStaged reads the commands markPackages reads: worker.js, no behaviour changes; the words: block D5.)
// A second person's step on a requirement, as a package may state one: a requirement carries a confirmation of its own.
const VOUCH_REQ = {id: 'zn-vouch-requirement', commands: {'vouchreq.accept': {apply(p, c, at, actor) { const r = p.artefacts.find(x => x.id === c.payload?.id); if (!r) throw Error('Choose a requirement.'); r.review = {actor, at}; return {document: p, selected: r.id}; }, second: (p, c) => { const r = (p.artefacts || []).find(x => x.id === c.payload?.id); return r ? {id: r.id, actor: r.provenance?.author?.by ?? null, history: []} : null; }}}, provenance: {paths: {vouchreq: ['artefacts']}}};
await block('Z6 a merge carries no commands; the merger of a keep or a confirmation', async () => {
  need(); for (const e of [VOUCH, VOUCH_REQ]) if (!X.EXTENSIONS.some(x => x.id === e.id)) { assert.deepEqual(boundary.extensionIssues(e), []); X.registerExtension(e); }
  const k = await mergeKit(), {d, ok, send, stage, merge, stamps, rewrite} = k, req = id => d().artefacts.find(x => x.id === id);
  const words = (id, by, how, merger) => new RegExp('^A second person.s step needs two persons: ' + id + ' reads as ' + by + ' ' + how + ' it in an alternative and ' + merger + ' merged it\\. A signed-in person who neither ' + how + ' nor merged ' + id + ' takes this step\\.$');
  try {
    // (should-fix 1) a merge request that carries commands of its own is refused, and nothing is written or named
    { const a = await stage([{type: 'decision.save', payload: {question: 'Which store keeps the drafts, as a person prepared it?'}}], A); await k.h.read(B);
      const x = d().workbench.alternatives.find(y => y.id === a.id), r = await send('workspace.merge', {id: a.id, stamp: rebaseWorkingAlternative(d(), x).stamp, reviewed: true, reason: 'Merged by a person.', commands: [{type: 'synthetic.save', payload: {title: 'Carried by the request'}}]}, B);
      assert.equal(r.status, 400, 'one outcome: refused: ' + JSON.stringify(r.body).slice(0, 200)); assert.equal(r.error, 'A merge applies the commands the alternative holds: send none with it.');
      await k.h.read(B); assert.deepEqual([d().workbench.alternatives.find(y => y.id === a.id).status, d().synthetic, list(d().workspace?.packages).includes(SYNTHETIC.id)], ['draft', undefined, false], 'nothing is merged, written or named (ruling P2)');
      await merge(a.id, B); assert.deepEqual(stamps(d().decisions.records.at(-1)), ['person', A, B, B, 'merged'], 'merged as the alternative holds it'); }
    // (should-fix 4) a keep a person prepared, merged by another: the merger is refused in words that say kept
    { ok(await send('decision.save', {question: 'Which store holds the drafts, as Sol proposes it?'}, AGENT)); const prop = d().decisions.records.at(-1).id; await rewrite(p => { p.decisions.records.find(x => x.id === prop).state = 'proposed'; });
      const a = await stage([{type: 'record.keep', payload: {id: prop, chapter: 3}}], A); await merge(a.id, B);
      const r = await k.step('vouch.accept', prop, B); assert.equal(r.status, 400); assert.match(r.error, words(prop, A, 'kept', B)); ok(await k.step('vouch.accept', prop, C), 'a third person'); }
    // and a confirmation a person prepared (a requirement B wrote, confirmed by A in an alternative, merged by C)
    { ok(await send('artefact', {type: 'requirement', title: 'Record the fee paid', description: 'The service records the fee paid with its receipt.', acceptance: 'Given a payment, when it is received, then the receipt is kept.', owner: 'Permits office', priority: 'Must'}, B));
      const own = d().artefacts.find(x => x.title === 'Record the fee paid'), a = await stage([{type: 'artefact', payload: {...own, confirmed: true}}], A); await merge(a.id, C);
      assert.deepEqual([req(own.id).confirmed, ...stamps(req(own.id)), req(own.id).provenance.reviewed.mergedBy], [true, 'person', B, undefined, A, 'confirmed', C], 'B wrote it, A confirmed it, C merged the confirmation');
      const r = await k.step('vouchreq.accept', own.id, C); assert.equal(r.status, 400); assert.match(r.error, words(own.id, A, 'confirmed', C));
      ok(await k.step('vouchreq.accept', own.id, D), 'a fourth person'); }
  } finally { k.h.close(); }
  pass('Z6: a merge request that carries commands of its own is refused in words and writes and names nothing; the merger of a keep or of a confirmation an alternative carried is refused in words that say kept or confirmed');
});
// Z7. Readings: a merge is a person's review of the batch, which D1 counts as a person standing behind the record, but it
// confirms no record's words. The SDD counts a merged record as its preparer's, not as confirmed, and names its merger;
// the review plan lists a merged draft by Sol until a person confirms or keeps it; a record's label names the merger.
await block('Z7 a merge confirms no record\'s words', async () => {
  need();
  const {reviewPlan} = await import('./public/review-plan.js'), {recordProvenance} = await import('./public/provenance.js');
  const k = await mergeKit(), {d, ok, send, stage, merge, rec} = k, listed = p => reviewPlan(p).steps.filter(s => s.kind === 'records' && /synthetic/.test(s.id)).reduce((n, s) => n + s.count, 0);
  try {
    ok(await send('synthetic.save', {title: 'Written directly'}, A)); const p0 = d(), r0 = provenanceReading(p0), plan0 = listed(p0);
    const a = await stage([{type: 'synthetic.save', payload: {title: 'Drafted by the agent account'}}], AGENT); await merge(a.id, B); const sol = k.h.last();
    const b = await stage([{type: 'synthetic.save', payload: {title: 'Prepared by A'}}], A); await merge(b.id, B); const own = k.h.last();
    const r1 = provenanceReading(d());
    assert.deepEqual([r1.total - r0.total, r1.by.sol - r0.by.sol, r1.by.person - r0.by.person, r1.confirmed - r0.confirmed], [2, 1, 1, 0], 'each counted as its preparer\'s, neither as confirmed');
    const text = architectureMarkdown(d()).markdown, e = text.slice(text.indexOf('## E. Provenance'));
    assert.match(e, /Merged from workbench alternatives: 2 records, counted as written by whoever prepared them; merged by architect-b\. A merge is a person.s review of the alternative and confirms no record.s words\./, 'Appendix E names the merger');
    assert.ok(!architectureMarkdown(p0).markdown.includes('Merged from workbench alternatives'), 'a document with no merged record prints no such line');
    assert.equal(listed(d()), plan0 + 1, 'the review plan lists the merged draft by Sol (the person\'s merged record is no draft)');
    assert.deepEqual([recordProvenance(d(), rec(sol), 3).label, recordProvenance(d(), rec(own), 3).label], ['Drafted by Sol · merged by architect-b, not reviewed', 'Written by architect-a · merged by architect-b'], 'the label names the merger');
    assert.deepEqual([recordProvenance(d(), rec(sol), 3).reviewed, recordProvenance(d(), rec(own), 3).reviewed], [null, null], 'a merge is no review of the record');
    // a person confirms it: then it is confirmed and leaves the plan
    ok(await send('synthetic.confirm', {id: sol}, C)); assert.equal(listed(d()), plan0, 'confirmed by a person, it leaves the plan'); assert.equal(provenanceReading(d()).confirmed - r0.confirmed, 1);
    assert.equal(recordProvenance(d(), rec(sol), 3).label, 'Drafted by Sol · confirmed by architect-c');
    // D1 still counts the merge as a person behind the record: a third person takes a second person's step on the agent's merged record
    ok(await k.step('synthetic.accept', own, C), 'a third person accepts the person\'s merged record');
  } finally { k.h.close(); }
  pass('Z7: a merged record counts as its preparer\'s and not as confirmed in the SDD, whose Appendix E names the merger; the review plan lists a merged draft by Sol until a person confirms it; the label names the merger; D1 still counts the merge');
});

// ---------------------------------------------------------------- should-fix 3, 6, 11 and ruling D7.5: the start check
await block('SF start check', () => {
  need();
  const issues = e => boundary.extensionIssues(e), has = (e, re) => issues(e).some(i => re.test(i)), kind = (prefix = 'XY') => ({xy: {label: 'Xy', chapter: 2, level: 'intent', prefix}});
  // 3. a hop onto a layer of a built-in type states `only`: without it, every such relation of an old document would bring a record
  const overBuiltIn = only => ({id: 'xy', layers: {setting: 'environment'}, hops: [{layer: 'setting', types: ['inEnvironment'], from: ['plan'], dir: 'out', ctx: true, ...(only ? {only} : {})}]});
  assert.ok(has(overBuiltIn(null), /the hop onto “setting” brings records of the built-in type “environment”: it states only\(relation\)/), 'a hop onto a layer of a built-in type states only: ' + issues(overBuiltIn(null)).join(' | '));
  assert.deepEqual(issues(overBuiltIn(rel => rel.source === 'xy.records.environmentId')), []);
  assert.deepEqual(issues({id: 'xy', objectTypes: kind(), layers: {xy: 'xy'}, hops: [{layer: 'xy', types: ['a'], from: ['requirement'], dir: 'out', ctx: true}]}), [], 'a hop onto a layer of the package\'s own type needs none');
  // 6. an id prefix a built-in kind uses; the retired command names
  for (const prefix of ['ADR', 'REQ', 'IF', 'CHG', 'LR', 'THR', 'ENV', 'WA']) assert.ok(has({id: 'xy', objectTypes: kind(prefix)}, new RegExp('id prefix “' + prefix + '” is the workbench.s own')), prefix + ' is a built-in kind\'s');
  // (ruling J10; was: XY, ADP, WL, FD, DN and SLO are each free. ADP is a prefix a package of the build mints for a built-in type; it is
  // held by the clash check in case 7, with a synthetic minted prefix beside it. The others stay free.)
  for (const prefix of ['XY', 'WL', 'FD', 'DN', 'SLO']) assert.deepEqual(issues({id: 'xy', objectTypes: kind(prefix)}), [], prefix + ' is free');
  // J10. the row for the id prefixes a package mints for a built-in type (the records it adds under that type from its own collection, ruling D7.2)
  assert.deepEqual(issues({id: 'xy', prefixes: {risk: 'XRK', environment: 'XEN'}}), [], 'a package states the prefix of the records it adds under a built-in type that stands on no built-in layer');
  assert.ok(has({id: 'xy', prefixes: ['XRK']}, /prefixes is \{built-in object type: id prefix\}/)); assert.ok(has({id: 'xy', prefixes: {risk: 'xrk'}}, /the id prefix of “risk” is 2 to 5 capitals/)); assert.ok(has({id: 'xy', prefixes: {risk: 'TOOLONG'}}, /2 to 5 capitals/));
  for (const prefix of ['ADR', 'REQ', 'CHG', 'DES']) assert.ok(has({id: 'xy', prefixes: {risk: prefix}}, new RegExp('id prefix “' + prefix + '” is the workbench.s own')), 'a minted prefix is never the workbench\'s: ' + prefix);
  assert.ok(has({id: 'xy', prefixes: {component: 'XCO'}}, /prefixes: “component” stands on the built-in layer “component”: a package adds no record of that type/), 'only a type that stands on no built-in layer (ruling D7.2)');
  assert.ok(has({id: 'xy', prefixes: {actor: 'XAC'}}, /prefixes: “actor” is a type of Chapter 1 records/)); assert.ok(has({id: 'xy', prefixes: {nosuch: 'XNS'}}, /prefixes: “nosuch” is no built-in object type/));
  assert.ok(has({id: 'xy', objectTypes: kind('XY'), prefixes: {xy: 'XYZ'}}, /prefixes: “xy” is the package.s own type: its prefix is stated with the type/));
  // (the verifier of wp2 S1) a name every object inherits is no built-in object type
  // It is read in a process where only the build's packages are registered (the reviewer of the lead's follow-up): once a package that states objectTypes is
  // registered, an inherited name compares equal to the registry's and the check passes for the wrong reason.
  { const r = spawnSync(process.execPath, ['--input-type=module', '-e', 'await import("./worker.js"); const b = await import("./design-extension-boundary.js"); const {EXTENSIONS} = await import("./public/design-extensions.js"); console.log(JSON.stringify({stated: EXTENSIONS.filter(e => e.objectTypes && Object.keys(e.objectTypes).length).map(e => e.id), issues: ["constructor", "toString", "hasOwnProperty", "__proto__", "valueOf"].map(t => b.extensionIssues({id: "xy", prefixes: JSON.parse("{\\"" + t + "\\":\\"XCN\\"}")}).some(i => /is no built-in object type/.test(i)))}));'], {encoding: 'utf8', cwd: process.cwd(), env: {...process.env, AIW_QUIET: '1'}, maxBuffer: 1 << 24});
    assert.equal(r.status, 0, 'inherited-name probe: ' + r.stderr.slice(0, 400)); const out = JSON.parse(r.stdout.trim().split('\n').filter(l => l.startsWith('{"stated"')).at(-1));
    assert.ok(!out.stated.some(id => /^(?:zz|mm|aa|ab|zzz)-/.test(id)), 'no synthetic package is registered in the probe: ' + out.stated); assert.deepEqual(out.issues, [true, true, true, true, true], 'prefixes: an inherited name is refused in a process with the build\'s packages only'); }
  const retired = ['technology.keep-seed', 'technology.dismiss-seed', 'technology.restore-seed', 'interfaces.keep-seed', 'interfaces.dismiss-seed', 'interfaces.restore-seed', 'interfaces.remove-contract', 'runtime.keep-seed', 'runtime.dismiss-seed', 'runtime.restore-seed', 'runtime.remove-plan', 'runtime.remove-path'];
  for (const type of retired) { assert.ok(canonical.isRetiredCommand(type)); assert.equal(boundary.builtInType(type), true, type + ' is a retired name the workbench still reads'); assert.ok(has({id: 'xy', commands: {[type]: {apply() {}}}}, /is built in/)); }
  // before the server has said which types are built in, none is free (a package's command is then unknown, never applied)
  { const r = spawnSync(process.execPath, ['--input-type=module', '-e', 'import * as b from "./design-extension-boundary.js"; import {registerExtension} from "./public/design-extensions.js"; registerExtension({id: "xy", commands: {"xy.save": {apply() {}}}}); let stopped = ""; try { b.assertExtensions(); } catch (e) { stopped = e.message; } console.log(JSON.stringify([b.builtInType("xy.save"), b.extensionCommand("xy.save"), b.extensionHandler("xy.save"), stopped]));'], {encoding: 'utf8'});
    assert.equal(r.status, 0, r.stderr.slice(0, 300)); const [taken, command, handler, stopped] = JSON.parse(r.stdout.trim().split('\n').at(-1));
    assert.deepEqual([taken, command, handler], [true, null, null], 'without the built-in resolver no type is a package\'s'); assert.match(stopped, /built-in commands are not installed/); }
  // 8. the walk reads no hop of a layer no record of the document stands on, and a Chapter 1 record stands on the
  // context layer whatever its type: so a package's layer holds no built-in type of Chapter 1 (its records would be
  // brought by a hop in one document and skipped in another). A built-in type of a later chapter that stands on no
  // built-in layer stays allowed (wp2's `mechanism` over `pattern`).
  { const over = type => ({id: 'xy', layers: {held: type}, hops: [{layer: 'held', types: ['binds'], from: ['component'], dir: 'in', ctx: true, only: rel => rel.source === 'xy.records.bindings'}]});
    for (const type of ['actor', 'outcome', 'journey', 'constraint', 'assumption', 'context', 'system']) assert.ok(has(over(type), new RegExp('layer “held” holds the built-in type “' + type + '”, which Chapter 1 records have: a Chapter 1 record stands on the context layer')), 'a layer over the Chapter 1 type ' + type + ' is refused: ' + issues(over(type)).join(' | '));
    // (ruling J11; was: issues(over('pattern')) is [], written when no package held `pattern`. The rule is held on a built-in type of a
    // later chapter that still stands on no layer; the package of the build that holds `pattern` conforms; and a second layer over it is refused.)
    assert.ok(OBJECT_TYPES.risk.chapter > 1 && !Object.values(kernel.TRACE_LAYER_TYPES).includes('risk')); assert.deepEqual(issues(over('risk')), [], 'a layer over a built-in type of a later chapter that stands on no built-in layer is allowed');
    const holder = X.EXTENSIONS.find(e => Object.values(e.layers || {}).includes('pattern') && BUILD_PACKAGES.includes(e.id));
    if (holder) { assert.deepEqual(issues(holder), [], holder.id + ' holds the built-in type pattern on a layer of its own and conforms'); const layer = Object.keys(holder.layers).find(l => holder.layers[l] === 'pattern');
      assert.ok(has(over('pattern'), new RegExp('layer “held” holds the type “pattern”, which stands on the layer “' + layer + '”: a type stands on one layer')), 'a second layer over pattern is refused: ' + issues(over('pattern')).join(' | ')); }
    else assert.deepEqual(issues(over('pattern')), [], 'pattern stands on no layer in this build'); }
  // 11. a lifecycle collection is a list inside a container: the family keeps the container's version, review and handoff
  assert.ok(has({id: 'xy', lifecycle: {things: 3}}, /collection “things” is a list inside a container \(container\.list\)/), 'a single-segment lifecycle path is refused');
  assert.deepEqual(issues({id: 'xy', lifecycle: {'things.records': 3}, provenance: {records: {thingNotes: 3}}}), []);
  // D7.5: a type that ends as a review command does to authorship.js states that it is a person's step
  for (const end of ['review', 'handoff', 'intake']) {
    assert.ok(isReviewCommand('xy.' + end)); assert.ok(has({id: 'xy', commands: {['xy.' + end]: {apply() {}}}}, /command “xy\.\w+” ends as a review command does \(authorship\.js\): it states person or second/), 'xy.' + end);
    assert.deepEqual(issues({id: 'xy', commands: {['xy.' + end]: {apply() {}, person: true}}}), []); assert.deepEqual(issues({id: 'xy', commands: {['xy.' + end]: {apply() {}, second: () => null}}, provenance: {paths: {xy: ['xy.records']}}}), []);
  }
  // the verifier's second round: a key named after what every object carries is no key of a document (it moved the
  // fingerprints of every old document), and a package's noun is not one a built-in collection reads under
  for (const k of ['constructor', 'hasOwnProperty', 'toString', 'valueOf', '__proto__', 'constructor.name', 'synthetic.constructor', 'toString.list']) {
    for (const part of [{evidenceKeys: [k]}, {designKeys: [k]}, {lifecycle: {[k]: 3}}, {provenance: {records: {[k]: 3}}}, {provenance: {nouns: {[k]: 'thing'}}}, {provenance: {paths: {xy: [k]}}}])
      assert.ok(issues({id: 'xy', ...part}).some(i => /names what every object carries/.test(i)), JSON.stringify(part) + ' is refused: ' + JSON.stringify(issues({id: 'xy', ...part})));
  }
  assert.ok(issues({id: 'xy', lifecycle: {'xy.things': 3}, provenance: {nouns: {'xy.things': 'document'}}}).some(i => /the noun “document” is one the workbench reads a collection of its own under/.test(i)), 'a built-in noun is not a package\'s');
  assert.ok(issues({id: 'xy', lifecycle: {'xy.things': 3}, provenance: {nouns: {'xy.things': 'driver'}}}).some(i => /the noun “driver” is one the workbench reads a collection of its own under/.test(i)));
  assert.deepEqual(issues({id: 'xy', lifecycle: {'xy.things': 3}, provenance: {nouns: {'xy.things': 'thing'}}}), []);
  pass('should-fix 3, 6, 11 and D7.5 at the start check: a hop onto a layer of a built-in type states only; an id prefix of the workbench and a retired command name are taken; no type is free before the built-in resolver is installed; a single-segment lifecycle path is refused; a layer over a built-in type of Chapter 1 is refused; a type ending in .review, .handoff or .intake states person or second');
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
  // A hard finding takes no waiver (the lead's rulings A1 and D11, which correct the contract's test 3; replaced here,
  // old -> new: "treatmentsFor(hard) is empty and review.disposition refuses every treatment with /takes no treatment/"
  // -> the block below). `hard` is the rc.10.73.42 non-waivable class and nothing stricter: it is read inside
  // nonWaivable(), the class's one reader, and NON_WAIVABLE stays the frozen table of built-in codes.
  assert.equal(nonWaivable(hard), true); assert.equal(nonWaivable(soft), null); assert.equal(nonWaivable({...hard, level: 'warning'}), null, 'only as an error, as the class is');
  assert.ok(Object.isFrozen(NON_WAIVABLE)); assert.deepEqual(Object.keys(NON_WAIVABLE), ['hard-constraint', 'invariant'], 'the table of built-in codes is as it was');
  { // beside a built-in non-waivable finding of the same document: the Chapter 3 break of a hard constraint, as rc42-g3a builds it
    let q = applyQualityCommand(p, {type: 'quality.driver', payload: {kind: 'constraint', title: 'Runs in the bank\'s own data centres', description: 'Hosting is on premises.', impact: 'Rules out a public cloud runtime.', constraintIds: ['CON-001'], priority: 'High'}}, AT).document;
    const con = q.quality.drivers.at(-1).id, adr = () => q.decisions.records.find(x => x.id === 'ADR-001');
    q = applyDecisionCommand(q, {type: 'decision.save', payload: {id: 'ADR-001', driverIds: [...adr().driverIds, con]}}, AT).document;
    q = applyDecisionCommand(q, {type: 'decision.alternative', payload: {id: 'ADR-001', alternativeId: 'ALT-002', assessments: {...adr().alternatives.find(a => a.id === 'ALT-002').assessments, [con]: {effect: 'violates', reason: 'Needs a public cloud region.', evidence: 'Hosting assessment.'}}}}, AT).document;
    q = withFinalReview(applyDecisionCommand(q, {type: 'decision.choose', payload: {id: 'ADR-001', alternativeId: 'ALT-002'}}, AT).document);
    const find = (doc, id) => inheritedFindings(doc).find(f => f.id === id), builtIn = find(q, 'C3:breaks:ADR-001'), mine = find(q, hard.id);
    assert.ok(mine && builtIn && nonWaivable(builtIn) === 'hard-constraint', 'the document holds a built-in non-waivable finding beside the package\'s');
    const treat = (f, extra = {}) => ({findingId: f.id, stamp: f.stamp, treatment: 'Accepted design limitation', rationale: 'Synthetic.', reviewer: 'A reviewer', reference: 'REF-1', reviewed: true, ...extra});
    const review = (doc, payload, type = 'review.disposition') => withFinalReview(applyFinalReviewCommand(doc, {type, payload}, AT, A).document);
    // the dialog offers the other treatments and no waiver: the built-in non-waivable finding's treatments
    assert.deepEqual(treatmentsFor(mine), treatmentsFor(builtIn)); assert.deepEqual(treatmentsFor(mine), ['Fix before review', 'Carry as action']); assert.deepEqual(treatmentsFor(mine), DISPOSITIONS.filter(t => !WAIVERS.includes(t))); assert.deepEqual(treatmentsFor(soft), DISPOSITIONS);
    // the three waivers are refused in words that fit any package, for the finding and for its cause
    const WORDS = 'Error: “The synthetic invariant is broken” cannot be waived: change the design. Until then, fix it before review or carry it as an action.';
    assert.equal(WAIVERS.length, 3);
    for (const treatment of WAIVERS) {
      assert.throws(() => review(q, treat(mine, {treatment, reviewBy: '2099-12-31'})), e => String(e) === WORDS, treatment + ' is refused for a hard finding, in words that fit any package');
      const key = findingCause(mine).key, all = causeFindings(q, key);
      assert.throws(() => review(q, {scope: 'cause', cause: key, stamp: causeFindingStamp(q, all), treatment, rationale: 'One treatment for the cause.', reviewer: 'A reviewer', reference: 'REF-1', reviewBy: '2099-12-31', reviewed: true}), e => String(e) === WORDS, treatment + ': a treatment of its cause cannot waive it either');
    }
    // the built-in class's own words are what they were
    assert.throws(() => review(q, treat(builtIn, {reviewBy: '2099-12-31'})), /^Error: “[^”]+” breaks a hard constraint: change the design, or its Chapter 1 constraint and Chapter 2 driver by a reviewed change\. It cannot be waived; until then, fix it before review or carry it as an action\.$/);
    // and it blocks exactly as the built-in non-waivable finding does, step for step
    const state = (doc, f) => [findingTreatment(doc, find(doc, f.id)), reviewBlockers(doc).some(x => x.id === f.id)];
    assert.deepEqual(state(q, mine), ['Needs assessment', true]); assert.deepEqual(state(q, mine), state(q, builtIn));
    let fix = review(q, treat(mine, {treatment: 'Fix before review'})); fix = review(fix, treat(find(fix, builtIn.id), {treatment: 'Fix before review'}));
    assert.deepEqual(state(fix, mine), ['Fix before review', true], 'fix before review is recorded and keeps it a blocker'); assert.deepEqual(state(fix, mine), state(fix, builtIn));
    const carry = (doc, f) => { const c = review(doc, {title: 'Change the design: ' + f.id, owner: 'Lead architect', due: '2027-12-01', acceptance: 'The finding is gone.', objectIds: ['api'], findingId: f.id}, 'review.action'); return review(c, treat(find(c, f.id), {treatment: 'Carry as action', actionId: c.finalReview.actions.at(-1).id})); };
    const carried = carry(carry(q, mine), builtIn);
    assert.equal(state(carried, mine)[0], 'Carry as action', 'carried as an owned action'); assert.deepEqual(state(carried, mine), state(carried, builtIn), 'it reads and blocks as the built-in one carried as an action does');
    // a waiver kept from before the finding was hard is no treatment, for both
    const legacy = documentCopy(q); for (const f of [mine, builtIn]) legacy.finalReview.dispositions.push({id: 'RF-90' + legacy.finalReview.dispositions.length, at: AT, actor: A, findingId: f.id, stamp: f.stamp, basis: 'finding', treatment: 'Not applicable', rationale: 'Recorded before.', reviewer: 'Earlier reviewer', reference: 'Earlier record', actionId: null});
    const L = withFinalReview(legacy); assert.deepEqual(state(L, mine), ['Needs assessment', true], 'a waiver in the record is read as no treatment'); assert.deepEqual(state(L, mine), state(L, builtIn));
    // until the design changes
    assert.ok(!find(withFinalReview(withSynthetic(q, {id: 'SYN-003', title: 'Unbound, no longer broken', broken: false})), hard.id), 'changing the design resolves it');
  }
  const treated = applyFinalReviewCommand(p, {type: 'review.disposition', payload: {findingId: soft.id, stamp: soft.stamp, treatment: 'Not applicable', rationale: 'Synthetic.', reviewer: 'A reviewer', reference: 'REF-1', reviewed: true}}, AT, A).document;
  assert.equal(treated.finalReview.dispositions.length, 1, 'an ordinary finding of a package is treated as any other');
  assert.ok(reviewBlockers(treated).some(f => f.id === hard.id), 'and the hard one still blocks');
  // a package's finding in another chapter joins that chapter only
  const q = withFinalReview({...p, runtime: {...p.runtime, otherThings: [{id: 'OTH-001', ref: 'OTH-001', title: 'Other thing', syntheticId: 'SYN-001'}]}});
  assert.ok(CHAPTERS[9].checks(q).some(f => f.id === 'other-placed:OTH-001')); assert.ok(!CHAPTERS[9].checks(q).some(f => f.code?.startsWith('synthetic')));
  assert.deepEqual(CHAPTERS[2].checks(q).map(f => f.id).slice(-3), ['other-noted:OTH-001', 'synthetic-unbound:SYN-003', 'synthetic-broken:SYN-003'], 'two packages\' findings of one chapter are listed in the order of their ids');
  pass('3: the package\'s findings are in decisionFindings, the review\'s chapter checks, the inherited findings and readiness; the hard one is in the non-waivable class: the three waivers are refused in words that fit any package, the dialog offers the built-in non-waivable finding\'s treatments, and it blocks as that one does until the design changes or it is carried as an action');
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

// ---------------------------------------------------------------- ruling J3: what of a package's record is design
await block('J3 design statement', () => {
  need();
  const things = p => p.statedThings?.records || [], BOOKKEEPING = ['history', 'review', 'confirmed', 'provenance'];
  // The package states what its records say, as the fingerprint reads it, in place of the raw key: each record without its bookkeeping.
  // (ruling L5 of wp9a) and a new key of a chapter's container, chapter.key: a marker without who set it
  const STATED = {id: 'zw-stated', design: {statedThings: p => (things(p).length ? {records: things(p).map(r => Object.fromEntries(Object.entries(r).filter(([k]) => !BOOKKEEPING.includes(k))))} : undefined), 'runtime.statedMark': p => (p.runtime?.statedMark ? {marked: true} : undefined)}, provenance: {nouns: {'statedThings.records': 'stated thing'}, records: {'statedThings.records': 3}}};
  assert.deepEqual(boundary.extensionIssues(STATED), [], 'a package states the row: design {key: p => what the key says}');
  // the start check: a function for each key; a key of the document that is the package's own; never a key the workbench keeps
  const issues = e => boundary.extensionIssues(e), has = (e, re) => issues(e).some(i => re.test(i));
  assert.ok(has({id: 'xy', design: p => p}, /design is \{key: p => what the key says to the design fingerprint\}/)); assert.ok(has({id: 'xy', design: {things: 'all'}}, /the design statement of “things” is a function/));
  for (const key of ['quality', 'decisions', 'finalReview', 'workspace', 'guidedDesign', 'coauthoring', 'changes']) assert.ok(has({id: 'xy', design: {[key]: () => 1}}, new RegExp('the design statement of “' + key + '” is on a key the workbench itself writes')), key + ' is the workbench\'s: a package restates none of it');
  // (ruling L5 of wp9a; was: a statement of “runtime.nodes” is refused, "the row carries a key of the document, not a key
  // inside a chapter's container") the row also carries a new key of a chapter's container, chapter.key, and refuses
  // every key a chapter's container already holds for the workbench, a deeper key and a key that is no name
  assert.deepEqual(issues({id: 'xy', design: {'runtime.otherThings': () => 1, 'statedThings.records': () => 1}}), [], 'a new key of a chapter\'s container, or a key inside the package\'s own key, may be stated');
  for (const key of ['runtime.zones', 'runtime.placements', 'technology.capabilities', 'quality.drivers', 'workspace.packages', 'finalReview.version']) assert.ok(has({id: 'xy', design: {[key]: () => 1}}, new RegExp('the design statement of “' + key.replace('.', '\\.') + '” is on a key the workbench itself writes')), key + ' is the workbench\'s: a package restates none of it');
  for (const key of ['runtime.nodes.items', 'Runtime', 'runtime.', '.nodes', 'runtime-nodes']) assert.ok(has({id: 'xy', design: {[key]: () => 1}}, /names a key of the document, or chapter\.key for a new key of a chapter.s container/), key + ' names no key the row carries');
  assert.ok(has({id: 'xy', design: {toString: () => 1}}, /names what every object carries/)); assert.ok(has({id: 'xy', design: {things: () => 1}, evidenceKeys: ['things']}, /“things” is stated as design and as evidence/));
  assert.deepEqual(issues({id: 'xy', design: {things: () => 1}, designKeys: ['things'], evidenceKeys: ['things.observations']}), [], 'a key with a statement may be listed as a design key too; evidence inside it still leaves the design');
  X.registerExtension(STATED);
  const base = reference('bank-payment'), record = more => ({id: 'ST-001', ref: 'ST-001', title: 'A stated thing', revision: 1, ...more}), doc = more => withFinalReview({...base, statedThings: {records: [record(more)]}});
  const stamp = p => [reviewSourceStamp(p), reviewDesignStamp(p)], p = doc({});
  assert.notDeepEqual(stamp(p), stamp(base), 'the first record moves the design fingerprint'); assert.notDeepEqual(stamp(doc({title: 'Renamed'})), stamp(p), 'and so does what a record says');
  // no person's and no second person's step moves the stamp: the four keys are bookkeeping to the fingerprint (the shared helper every package's suite calls)
  for (const [key, value] of [['history', [{revision: 1, actor: A, at: AT}]], ['review', {actor: B, at: AT, account: 'person'}], ['confirmed', true], ['provenance', {author: {kind: 'person', by: A, at: AT}, reviewed: {by: B, at: AT, how: 'confirmed'}}]]) assert.deepEqual(stamp(doc({[key]: value})), stamp(p), key + ' of a package\'s record moves no design stamp');
  assert.equal(typeof R.assertStepsMoveNoStamp, 'function', 'rc44-s0-readings.mjs gives the helper'); assert.equal(R.assertStepsMoveNoStamp(p, things), 1);
  // a package that states the raw key and no statement is caught by the helper: the fingerprint reads its records whole
  const raw = withFinalReview({...base, runtime: {...base.runtime, otherThings: [{id: 'OTH-001', ref: 'OTH-001', title: 'Other thing', requirementIds: []}]}});
  assert.throws(() => R.assertStepsMoveNoStamp(raw, d => d.runtime.otherThings), /A person.s step moves the design stamp: the design fingerprint reads “(?:history|review|confirmed|provenance)” of OTH-001/, 'the helper names the key and the record');
  assert.throws(() => R.assertStepsMoveNoStamp(base, things), /holds no record of the package/, 'a helper that was handed nothing to check says so');
  // a statement that answers nothing leaves no key: a document without the records reads as it did, and a frozen source holds none
  assert.ok(!('statedThings' in reviewSource(base))); assert.deepEqual(stamp(withFinalReview({...base, statedThings: {records: []}})), stamp(base), 'a container with no record says nothing');
  assert.deepEqual(reviewSource(p).statedThings, {records: [{id: 'ST-001', ref: 'ST-001', title: 'A stated thing', revision: 1}]}, 'the design source holds what the package states, in place of the raw key');
  // (ruling L5 of wp9a) a statement of chapter.key stands under that key of the chapter, in place of the raw key, and the
  // document itself is not changed; a document without the key reads as it did
  { const mark = review => withFinalReview({...base, runtime: {...base.runtime, statedMark: {marked: true, review}}}), m = mark({actor: A, at: AT, account: 'person'});
    assert.deepEqual(reviewSource(m).runtime.statedMark, {marked: true}); assert.deepEqual(m.runtime.statedMark.review, {actor: A, at: AT, account: 'person'}, 'the document keeps its raw key');
    assert.notDeepEqual(stamp(m), stamp(base), 'what the statement answers moves the stamp'); assert.deepEqual(stamp(mark(null)), stamp(m), 'what it leaves out does not');
    assert.ok(!('statedMark' in reviewSource(base).runtime)); assert.equal(JSON.stringify(reviewSource(base).runtime), JSON.stringify(base.runtime), 'a chapter without the key reads as it did, key for key'); }
  // (two packages that state one key: case 7 holds the clash, with the other rows two packages both state)
  pass('J3: a package states what its records say to the design fingerprint, in place of the raw key (design {key: p => …}); history, review, confirmed and provenance of its records move no design stamp, and the shared helper assertStepsMoveNoStamp catches a package whose records the fingerprint reads whole; a statement on a key the workbench writes is refused at start');
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
  // should-fix 5: a section stays inside the section it follows, and an anchor is a heading of the document as assembled
  try {
    for (forge of ['heading', 'above']) assert.throws(() => boundary.placeSections('registers', assembleSDD(P), P), /mm-other: its section after “## Performance specification” prints a heading at or above its anchor.s level \(“#+ [^”]+”\)/, 'a heading at or above the anchor\'s level is refused (' + forge + ')');
    forge = 'fenced'; assert.match(boundary.placeSections('registers', assembleSDD(P), P), /```\n## Inside a code fence\n```\n\n### Synthetic register/, 'a heading inside a code fence is text; two packages\' sections at one anchor follow each other in id order');
    forge = 'anchor'; const forged = boundary.placeSections('registers', assembleSDD(P), P);
    assert.match(forged, /### Forged anchor\n\nWhat a later package names as its anchor\.\n\n### Synthetic register/, 'a deeper heading inside a section is printed'); assert.ok(!forged.includes('CAPTURED BY A FORGED ANCHOR'), 'and is no anchor: a later package\'s section is placed against the document as assembled');
  } finally { forge = ''; }
  assert.equal(boundary.placeSections('registers', assembleSDD(P), P), registers, 'with the switch off the registers are what they were');
  const all = architectureMarkdown(P), delivery = architectureMarkdown(P, {audience: 'delivery'});
  assert.match(all.markdown, /## E\. Provenance[\s\S]*Synthetic records: SYN-001, SYN-002\./); assert.ok(!delivery.markdown.includes('Synthetic records:'), 'an edition that does not print the anchor does not print the section');
  // the verifier's second round: every form of a heading is a heading (setext, indented, a tab after the marks, HTML)
  try {
    for (const forged of ['Forged\n======', 'Forged\n------', '  # Forged', '#\tForged', '<h1>Forged</h1>', '<H2 class="x">Forged</H2>']) {
      forge = 'raw:' + forged; assert.throws(() => boundary.placeSections('registers', assembleSDD(P), P), /mm-other: its section after “## Performance specification” prints a heading/, JSON.stringify(forged) + ' is refused'); }
    // what is no heading stays text: a rule between paragraphs, a deeper heading, an HTML heading below the anchor's level
    for (const fine of ['Text.\n\n---\n\nMore.', '### Deeper', '<h3>Deeper</h3>', 'a # in a line']) { forge = 'raw:' + fine; assert.ok(boundary.placeSections('registers', assembleSDD(P), P).includes(fine), JSON.stringify(fine) + ' is printed'); }
  } finally { forge = ''; }
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
  const src = readFileSync('public/project-store.js', 'utf8'); assert.ok((src.match(/await ensureExtensions\((?:saved=)?await /g) || []).length === 2, 'the project store awaits it where it reads a project and where a save answers');
  // the browser's list of packages (the route stubs) is read by the project store, and never by the entry script, whose own dynamic imports are measured as the route
  assert.ok(src.includes("import './design-package-routes.js';")); assert.ok(!readFileSync('public/entry.js', 'utf8').includes('design-package-routes'));
  // (ruling J11; was: neither list holds an import or a registerExtension line, 'no package exists at this slice: neither list names one'.
  // With packages in the build: the browser's list holds the registry's import and one route stub a package and nothing else, so no
  // package module is imported statically on the route; the server's list holds one import a package; and the two lists name the same packages.)
  { const routes = codeLines('public/design-package-routes.js'), server = codeLines('design-packages.js'), REGISTRY = "import {registerExtension} from './design-extensions.js';";
    for (const l of routes) assert.ok(l === REGISTRY || STUB_LINE.test(l), 'every code line of the browser\'s list is the registry\'s import or one route stub {id: <id>-route, needs, load}: ' + l);
    assert.equal(routes.filter(l => l === REGISTRY).length, BUILD_PACKAGES.length ? 1 : 0, 'the registry is imported once, and only when a stub needs it'); assert.equal(routes.length, BUILD_PACKAGES.length + (BUILD_PACKAGES.length ? 1 : 0)); assert.equal(new Set(BUILD_PACKAGES).size, BUILD_PACKAGES.length);
    for (const l of server) assert.ok(SERVER_LINE.test(l), 'every code line of the server\'s list is one import of a package\'s module: ' + l);
    assert.equal(server.length, BUILD_PACKAGES.length, 'one route stub for each line of design-packages.js');
    assert.deepEqual(server.map(l => SERVER_LINE.exec(l)[1]).sort(), [...BUILD_PACKAGES].sort(), 'each line of the server\'s list says which package it registers, and the browser\'s list has that package\'s stub');
    for (const id of BUILD_PACKAGES) { const stub = X.EXTENSIONS.find(e => e.id === id + '-route'), held = X.EXTENSIONS.find(e => e.id === id);
      assert.ok(held && boundary.extensionIssues(held).length === 0, id + ' is registered by the server\'s list and conforms');
      assert.deepEqual(Object.keys(stub || {}).sort(), ['id', 'load', 'needs'], 'the stub of ' + id + ' states its id, needs and load and no other part'); assert.ok(!stub.needs(reference('bank-payment')), 'and asks for nothing for a document without the package\'s records'); } }
  pass('needs and load: ensureExtensions loads a package only for a document that holds its records; the first registration under an id stands');
});

// ---------------------------------------------------------------- 7. twice, and in another order
await block('7 idempotent and order-free', () => {
  need();
  const run = order => { const r = spawnSync(process.execPath, [process.argv[1], '--probe', order], {encoding: 'utf8', maxBuffer: 1 << 26}); assert.equal(r.status, 0, 'probe ' + order + ': ' + r.stderr.slice(0, 400)); const out = JSON.parse(r.stdout.trim().split('\n').at(-1)); delete out.order; return JSON.stringify(out); };
  const base = run('hos');
  for (const order of ['soh', 'ohs', 'hhoossoh', 'shosho']) assert.equal(run(order), base, 'registered as ' + order + ': the same types, collections, layers, nouns and readings as h, o, s');
  // (ruling J11; was: out.extensions equals ['aa-hostile', 'mm-other', 'zz-synthetic'])
  const out = JSON.parse(base); assert.deepEqual(out.extensions, withBuild(['aa-hostile', 'mm-other', 'zz-synthetic']));
  for (const k of Object.keys(golden.readings['clinic-appointments'])) assert.equal(out.plain[k], golden.readings['clinic-appointments'][k]);
  assert.notEqual(out.readings.graph, golden.readings['bank-payment'].graph, 'the probe\'s document does hold the packages\' records');
  // the same object again, in this process: nothing moves
  const p = withFinalReview(withSynthetic(reference('bank-payment'), {title: 'Again'})), d = digests(p), types = Object.keys(OBJECT_TYPES).join(), layers = kernel.TRACE_LAYERS.join(), rows = JSON.stringify(COLLECTIONS), paths = JSON.stringify(RECORD_PATHS);
  X.registerExtension(SYNTHETIC); X.registerExtension(OTHER); X.registerExtension({...SYNTHETIC});
  assert.deepEqual(digests(withFinalReview(withSynthetic(reference('bank-payment'), {title: 'Again'}))), d); assert.equal(Object.keys(OBJECT_TYPES).join(), types); assert.equal(kernel.TRACE_LAYERS.join(), layers); assert.equal(JSON.stringify(COLLECTIONS), rows);
  // two packages stating one row: the first by id keeps it, and the server's start check names the clash
  assert.deepEqual(boundary.extensionConflicts(), [], 'the registered packages share no row');
  // (ruling J10) a prefix a package mints for a built-in type is claimed as a kind's prefix is: zx-minter mints SRK; the build's packages mint theirs
  X.registerExtension({id: 'zx-minter', prefixes: {risk: 'SRK'}}); assert.deepEqual(boundary.extensionConflicts(), [], 'a minted prefix nobody else states is no clash');
  const MINTED = X.EXTENSIONS.filter(e => BUILD_PACKAGES.includes(e.id)).flatMap(e => Object.entries(e.prefixes || {}).map(([type, prefix]) => [e.id, type, prefix]));
  X.registerExtension({id: 'zzz-duplicate', prefixes: {environment: 'SRK', ...(MINTED[0] ? {alternative: MINTED[0][2]} : {})}, design: {statedThings: () => 'another reading', 'statedThings.records': () => 'a reading inside it'}, objectTypes: {synthetic: {label: 'Duplicate', chapter: 4, level: 'logical', prefix: 'DUP'}, twin: {label: 'Twin', chapter: 4, level: 'logical', prefix: 'SYN'}}, layers: {synthetic: 'duplicate'}, lifecycle: {'synthetic.records': 4}, commands: {'synthetic.save': {apply() { throw Error('duplicate'); }}}, provenance: {nouns: {'synthetic.records': 'duplicate'}, paths: {}, records: {'synthetic.records': 9, 'runtime.otherNotes': 3}}});
  assert.equal(OBJECT_TYPES.synthetic.label, 'Synthetic record'); assert.equal(JSON.stringify(COLLECTIONS), rows); assert.equal(kernel.TRACE_LAYERS.join(), layers); assert.equal(RECORD_NOUNS['synthetic.records'], 'synthetic record'); assert.equal(boundary.extensionCommand('synthetic.save').apply, applySynthetic);
  assert.equal(JSON.stringify(RECORD_PATHS), paths, 'the provenance reader reads what it read'); assert.deepEqual([RECORD_PATHS.filter(r => r[0] === 'synthetic.records'), RECORD_PATHS.filter(r => r[0] === 'runtime.otherNotes')], [[['synthetic.records', 3]], [['runtime.otherNotes', 10]]], 'a collection another package states is read once, as its first package states it');
  // (rulings J3 and J10; was: at least 7 clashes, each naming zzz-duplicate and zz-synthetic or mm-other. The duplicate now also states a minted
  // prefix of zx-minter, one of the build's package and a design statement of zw-stated: each clash names zzz-duplicate and the package that keeps the row.)
  const keepers = ['zz-synthetic', 'mm-other', 'zx-minter', 'zw-stated', ...BUILD_PACKAGES], added = 1 + (MINTED[0] ? 1 : 0) + (X.EXTENSIONS.some(e => e.id === 'zw-stated') ? 1 : 0);
  const clashes = boundary.extensionConflicts(); assert.ok(clashes.length >= 7 + added && clashes.every(c => /zzz-duplicate/.test(c) && keepers.some(id => c.includes(id))), 'each clash names both packages: ' + clashes.join(' | '));
  assert.equal(clashes.filter(c => /zz-synthetic|mm-other/.test(c)).length >= 7, true, 'the seven rows of the synthetic packages are each named');
  if (X.EXTENSIONS.some(e => e.id === 'zw-stated')) { assert.ok(clashes.some(c => /the design statement of “statedThings” is stated by zw-stated and by zzz-duplicate: one key has one statement/.test(c)), 'two statements of one key are a clash that names both (the server does not start with one): ' + clashes.filter(c => /statement/.test(c)).join(' | '));
    assert.ok(clashes.some(c => /the design statement of “statedThings\.records” is stated by zw-stated and by zzz-duplicate: one key has one statement/.test(c)), '(ruling L5) a statement of a key inside a key another package states is a clash too'); }
  assert.ok(clashes.some(c => /id prefix “SYN” is stated by zz-synthetic and by zzz-duplicate/.test(c)), 'two kinds of record never share an id prefix');
  assert.ok(clashes.some(c => /id prefix “SRK” is stated by zx-minter and by zzz-duplicate: zx-minter keeps it/.test(c)), 'nor a prefix one package mints for a built-in type: ' + clashes.filter(c => /prefix/.test(c)).join(' | '));
  // (ruling J10; was, in the start check: ADP is free for a package's kind) the prefix a package of the build mints is taken: stated by another package it is a clash that names both
  for (const [id, , prefix] of MINTED.slice(0, 1)) assert.ok(clashes.some(c => c.includes('id prefix “' + prefix + '” is stated by ' + id + ' and by zzz-duplicate: ' + id + ' keeps it')), prefix + ' is ' + id + '\'s: ' + clashes.filter(c => /prefix/.test(c)).join(' | '));
  assert.ok(MINTED.some(([id, type, prefix]) => id === 'p40-adoption' && type === 'pattern' && prefix === 'ADP') || !BUILD_PACKAGES.includes('p40-adoption'), 'the package of applied mechanisms states the prefix it mints for the built-in type pattern: ' + JSON.stringify(MINTED));
  { const kindWith = prefix => ({id: 'zzzz-kind', objectTypes: {kindThing: {label: 'Kind thing', chapter: 4, level: 'logical', prefix}}}); X.registerExtension(kindWith('SRK'));
    assert.ok(boundary.extensionConflicts().some(c => /id prefix “SRK” is stated by zx-minter and by zzzz-kind: zx-minter keeps it/.test(c)), 'a kind\'s prefix that another package mints is a clash too'); }
  assert.ok(clashes.some(c => /collection “runtime\.otherNotes” is stated by mm-other and by zzz-duplicate: mm-other keeps it/.test(c)) && clashes.some(c => /collection “synthetic\.records” is stated by zz-synthetic and by zzz-duplicate: zz-synthetic keeps it/.test(c)));
  X.registerExtension({id: 'ab-early', objectTypes: {early: {label: 'Early', chapter: 2, level: 'intent', prefix: 'EAR'}}, layers: {early: 'early'}, hops: [{layer: 'early', types: ['binds'], from: ['synthetic'], dir: 'in', ctx: true}]});
  assert.ok(boundary.extensionConflicts().some(c => /a hop of ab-early onto “early” comes from “synthetic”, which the walk reads later/.test(c)), 'a hop from a layer of a package later by id is named');
  // should-fix 6: an evidence key that is another package's key is a clash that names both; the package whose key it is is not blamed
  { const victim = {id: 'zy-victim', designKeys: ['victimThings', 'runtime.victimNodes', 'victimStore']}, thief = {id: 'zz-thief', evidenceKeys: ['victimThings', 'runtime.victimNodes', 'victimStore.log', 'thiefLog']};
    assert.deepEqual(boundary.extensionIssues(victim), []); X.registerExtension(victim); X.registerExtension(thief);
    const clashes = boundary.extensionConflicts();
    for (const key of ['victimThings', 'runtime.victimNodes', 'victimStore.log']) assert.ok(clashes.some(c => c.includes('evidence key “' + key + '” of zz-thief leaves a key of zy-victim out of the design: zy-victim keeps it')), key + ': ' + clashes.filter(c => /thief/.test(c)).join(' | '));
    assert.ok(!clashes.some(c => c.includes('“thiefLog”')), 'its own key is its own'); assert.ok(!clashes.some(c => /“synthetic\.observations”|“syntheticLog”/.test(c)), 'a package\'s evidence inside its own container is no clash');
    assert.deepEqual(boundary.extensionIssues(victim), [], 'the package whose key it is is not told its design key lies where the fingerprint does not read'); }
  // should-fix 7: a layer whose name sorts before the built-in layers (a numeric key) moves no built-in layer's hops
  { const r = spawnSync(process.execPath, [process.argv[1], '--probe', 'n'], {encoding: 'utf8', maxBuffer: 1 << 26}); assert.equal(r.status, 0, r.stderr.slice(0, 400)); const out = JSON.parse(r.stdout.trim().split('\n').at(-1));
    assert.equal(out.layers[0], '7', 'the probe\'s layer does sort first'); assert.deepEqual(out.path, [out.pathId], 'a path a requirement names is on the last built-in layer with such a layer registered'); for (const t of REFERENCES) assert.equal(out.trails[t], golden.readings[t].trails, t + ': every trail is the baseline\'s with such a layer registered');
    assert.ok(boundary.extensionIssues(NUMERIC).some(i => /layer “7” names the object type it holds/.test(i)), 'and the start check refuses the name'); }
  pass('7: five registration orders, with repeats, in separate processes give the same object types, collections, layers, nouns and the same ten readings; registering again in this process changes nothing');
});

// ---------------------------------------------------------------- 8. the client build
// The client is built as build.mjs builds it (client-bundle.mjs bundleClient with its defaults), so the route figure is
// the one dist/client-size-report.json reports. The measurement at the slice is kept in audit/rc44/build-notes/s0-size.json
// (written by `node rc44-s0-extensions-validate.mjs --measure`, from the same build); the baseline figure is the build of
// 94dbd4f. Later slices add to the route, so the suite compares its own build with the evidence only when asked
// (AIW_S0_MEASURE=1, at the slice's own commit); the gates and the slice's recorded delta are checked always.
const BASELINE = {commit: '94dbd4f', chapters: 3228863, projects: 506102, scripts: 148, under10k: 53, css: 901873}, EVIDENCE = 'audit/rc44/build-notes/s0-size.json';
let clientBuilt = null; // the build of block 8, which the lead's merge check below reads
await block('8 client build', async () => {
  need();
  const {bundleClient, BUDGET} = await import('./client-bundle.mjs');
  const out = '.aiw-local/rc44-s0/client', built = clientBuilt = await bundleClient(out), report = built.report;
  assert.deepEqual(report.violations, [], 'the client build passes every size gate');
  assert.equal(BUDGET.routes.chapters, 3233792, 'the chapters route cap is the one it was'); assert.equal(BUDGET.routes.projects, 1213 * 1024); assert.equal(BUDGET.scripts, 148); assert.equal(BUDGET.tiny, 61); assert.equal(BUDGET.css, 881 * 1024);
  const meta = JSON.parse(readFileSync(built.metafile, 'utf8')), on = Object.values(meta.outputs).flatMap(o => Object.entries(o.inputs || {})).filter(([i]) => i === 'public/design-extensions.js');
  // (was "at most 300 B" before the fix-up: the registry now also holds the check of ruling D2 and the wording of a package that does not load; the gate is the route's)
  // (ruling J11; was: on[0][1].bytesInOutput <= 420, measured when no route stub existed and the bundler left registerExtension out of the
  // client. The first route stub keeps registerExtension on the route (wp2's own route bytes). The same bound is held on the same thing: the
  // registry as the route held it at S0, bundled apart with the build's options; and the registry in the client is that plus registerExtension.)
  assert.equal(on.length, 1, 'the registry is in one chunk');
  const {build: bundle} = await import('esbuild'), apart = async names => Object.values((await bundle({stdin: {contents: 'import {' + names + '} from "./public/design-extensions.js";globalThis.x=[' + names + '];', resolveDir: process.cwd(), loader: 'js'}, bundle: true, format: 'esm', minify: true, target: 'es2022', write: false, metafile: true, logLevel: 'error'})).metafile.outputs)[0].inputs['public/design-extensions.js'].bytesInOutput;
  const READERS = 'EXTENSIONS,extendTable,ensureExtensions', registry = await apart(READERS), registering = await apart(READERS + ',registerExtension') - registry;
  assert.ok(registry <= 420, 'and small, as the route held it at S0 (what its readers use): ' + registry + ' B'); assert.ok(registering > 0 && registering < 120, 'registerExtension itself: ' + registering + ' B');
  assert.ok(on[0][1].bytesInOutput - (BUILD_PACKAGES.length ? registering : 0) <= 420, 'and in the client build it is that and, once a route stub exists, registerExtension: ' + on[0][1].bytesInOutput + ' B');
  for (const o of Object.values(meta.outputs)) for (const i of Object.keys(o.inputs || {})) assert.ok(!/design-extension-boundary|design-extension-parts|design-packages|rc44-s0/.test(i), i + ' is not in the client');
  const measured = {chapters: report.routes.chapters.code, projects: report.routes.projects.code, scripts: report.scripts, under10k: report.buckets.under10k, css: report.css, registry: on[0][1].bytesInOutput};
  // "Opens with records" (ruling D10): the gate measures opening a document that holds no package records; a document
  // that holds a package's records also loads the lazy entry that holds the package. No package exists at S0; the
  // helper every package measures with is held to the gate's own figure here, on the entry wp2's design names.
  const HOST = 'public/architecture-task-ui.js', opens = opensWithRecords(meta, HOST, Object.keys(BUDGET.data));
  assert.equal(opens.route, report.routes.chapters.code, 'the helper counts the chapters route as the gate does'); assert.ok(opens.added > 0 && opens.total === opens.route + opens.added && opens.files > 0, 'and what the lazy entry adds to it: ' + JSON.stringify(opens));
  assert.throws(() => opensWithRecords(meta, 'public/no-such-entry.js'), /holds no lazy entry/);
  if (process.argv.includes('--measure')) { mkdirSync('audit/rc44/build-notes', {recursive: true}); writeFileSync(EVIDENCE, JSON.stringify({schema: 'aiw.rc44.slice-size.v1', name: 'S0 shared registration', measuredWith: 'client-bundle.mjs bundleClient, as node build.mjs builds the client (dist/client-size-report.json: routes.chapters.code)', allowance: {chapters: 915, scripts: 148, ruling: 'F7 of 2026-11-19 (was 900 B by D9, 700 B before)'}, caps: {chapters: BUDGET.routes.chapters, projects: BUDGET.routes.projects, scripts: BUDGET.scripts, under10k: BUDGET.tiny, css: BUDGET.css}, baseline: BASELINE, slice: measured, delta: measured.chapters - BASELINE.chapters, projectsDelta: measured.projects - BASELINE.projects, headroomAfter: BUDGET.routes.chapters - measured.chapters,
    'opens with records': {gate: 'The chapters-route gate is unchanged and measures opening a document that holds no package records (ruling D10 of 2026-11-18).', S0: 'No package exists at S0, so no document holds package records: every document opens as measured above.', how: 'A package reports, in its notes and in its size evidence under this field: the code of the chapters route and of the static closure of the lazy entry its route stub loads, each script counted once, as rc44-s0-readings.mjs opensWithRecords(metafile, entry, Object.keys(BUDGET.data)) answers it from the metafile of the same build: {route, added, total, files}.', hosts: {[HOST]: {...opens, note: 'the lazy entry wp2\'s design names for its surface, as it is before any package is held in it'}}}}, null, 1) + '\n'); }
  assert.ok(existsSync(EVIDENCE), 'the slice\'s measurement is kept (node rc44-s0-extensions-validate.mjs --measure)');
  const size = JSON.parse(readFileSync(EVIDENCE, 'utf8'));
  // (ruling R4; was: size.slice.under10k equal to BASELINE.under10k) the files-under-10-KB bucket is a ceiling, as client-bundle.mjs reads it: at most
  // the gate, and at most the base's count plus the script files the slice adds (rc44-s0-readings.mjs assertUnder10kCeiling); this build is inside the gate
  const {assertUnder10kCeiling} = R; assert.equal(typeof assertUnder10kCeiling, 'function', 'rc44-s0-readings.mjs states assertUnder10kCeiling(slice, base, gate)');
  for (const [slice, ok] of [[{scripts: 148, under10k: 53}, true], [{scripts: 148, under10k: 52}, true], [{scripts: 148, under10k: 54}, false], [{scripts: 149, under10k: 54}, true], [{scripts: 149, under10k: 55}, false], [{scripts: 158, under10k: 62}, false], [{scripts: 147, under10k: 53}, true]]) {
    const run = () => assertUnder10kCeiling(slice, BASELINE, BUDGET.tiny);
    if (ok) assert.doesNotThrow(run, JSON.stringify(slice)); else assert.throws(run, /^Error: \d+ script files under 10 KB: at most \d+ \(the gate \d+, and the base's \d+ plus the \d+ script files? the slice adds\)\.$/, JSON.stringify(slice)); }
  assert.deepEqual(size.baseline, BASELINE, 'against the build of 94dbd4f'); assert.equal(size.slice.scripts, 148, '148 script files'); assertUnder10kCeiling(size.slice, BASELINE, BUDGET.tiny); assert.ok(measured.under10k <= BUDGET.tiny, 'this build: ' + measured.under10k + ' files under 10 KB'); assert.equal(size.slice.css, BASELINE.css, 'no stylesheet rule');
  // (was "at most 700 B", then 900 B by ruling D9 of 2026-11-18; ruling F7 of 2026-11-19 sets S0's allowance to 915 B
  // in all: the 14 B that give a Chapter 1 record its rc.10.73.42 place on the layer of its type back)
  assert.equal(size.allowance.chapters, 915); assert.equal(size.delta, size.slice.chapters - size.baseline.chapters); assert.ok(size.delta > 0 && size.delta <= 915, 'the route delta measured at the slice is at most 915 B: ' + size.delta);
  assert.ok(size.slice.chapters <= BUDGET.routes.chapters);
  { const w = size['opens with records']; assert.ok(w && /holds no package records/.test(w.gate) && /opensWithRecords/.test(w.how) && w.hosts?.[HOST]?.total === w.hosts[HOST].route + w.hosts[HOST].added, 'the size file says what the gate measures and how a package measures what a document with its records opens with'); }
  // (the lead's ruling U2 of 2026-11-22; was: measured >= the slice's route - 700 B. A later slice may retire an old path, whose saving the lead
  // books as a negative item of the shared pool in the lead's own file: the lower bound is the slice's route less 700 B, less the savings the
  // lead books there, each an integer, and no more.)
  const LEAD = 'audit/rc44/evidence/lead-bookings-size.json', saved = existsSync(LEAD) ? -Object.values(JSON.parse(readFileSync(LEAD, 'utf8')).sharedPoolBytes || {}).filter(b => { assert.ok(Number.isInteger(b), 'the lead\'s pool items are counts of bytes'); return b < 0; }).reduce((n, b) => n + b, 0) : 0;
  assert.ok(measured.chapters >= size.slice.chapters - 700 - saved, 'the route as built now is the slice\'s or a later one\'s: ' + measured.chapters + ' (the lower bound ' + (size.slice.chapters - 700 - saved) + ': the slice\'s ' + size.slice.chapters + ' B less 700 B, less the ' + saved + ' B the lead books as saved)');
  if (process.env.AIW_S0_MEASURE || process.argv.includes('--measure')) assert.deepEqual(measured, size.slice, 'at the slice\'s commit the build measures what the evidence says');
  pass('8: the client build passes every gate with the caps unchanged; S0 measured ' + size.delta + ' B on the chapters route (' + size.baseline.chapters + ' → ' + size.slice.chapters + ' of ' + BUDGET.routes.chapters + '), 148 script files; the registry is ' + on[0][1].bytesInOutput + ' B; this build: ' + measured.chapters + ' B');
});

// ---------------------------------------------------------------- O1. the bookings are checked, not trusted
// (the lead's ruling O1 of 2026-11-21; new problem 1 of the second verifier of wp9a slice 1) Every rc44 size file
// (audit/rc44/evidence/*-size.json) books route bytes: a package's own (ownBytes, or delta), an integer of at least 0
// (a slice that adds nothing to the route books 0), and the shared pool's items (sharedPoolBytes), each an integer that
// one file books. A negative pool item is the lead's alone, in the lead's own file (lead-bookings-size.json, ownBytes
// 0), which books what merging packages adds or saves together (ruling N1: stub bytes are not additive) and S0's rows
// a package's slice needed. The lead's merge check, beside the build: on this build the chapters route less the
// integrated base (3,229,840 B at 9673661) is every file's own bytes plus the pool's, exactly, so a stale, foreign or
// mistyped file fails loudly, naming each file's figure (rc44-s0-readings.mjs routeBookings, assertBookingsAddUp).
const INTEGRATED = {commit: '9673661', chapters: 3229840}, BOOKINGS = 'audit/rc44/evidence', LEAD_FILE = BOOKINGS + '/lead-bookings-size.json';
await block('O1 the bookings add up', async () => {
  // hostile evidence, each in a scratch copy of the evidence directory: every one is refused, in its own words
  const scratch = (name, files) => { const dir = '.aiw-local/rc44-s0/bookings/' + name; rmSync(dir, {recursive: true, force: true}); mkdirSync(dir, {recursive: true});
    for (const f of readdirSync(BOOKINGS).filter(f => /-size\.json$/.test(f))) writeFileSync(dir + '/' + f, readFileSync(BOOKINGS + '/' + f, 'utf8'));
    for (const [f, edit] of Object.entries(files)) { const at = dir + '/' + f, was = existsSync(at) ? JSON.parse(readFileSync(at, 'utf8')) : {schema: 'aiw.rc44.slice-size.v3', name: 'a file of no package of this build'}; writeFileSync(at, JSON.stringify(edit(was), null, 1) + '\n'); }
    return dir; };
  const misses = [], refused = (why, dir, words) => { try { R.routeBookings(null, dir); misses.push(why + ': accepted'); } catch (e) { if (!words.test(e.message)) misses.push(why + ': refused in other words: ' + e.message); } };
  refused('a negative own figure', scratch('negative-own', {'zz-foreign-size.json': e => ({...e, ownBytes: -300})}), /zz-foreign-size\.json states no route bytes of its own \(ownBytes, or delta\): an integer of at least 0, not -300\./);
  refused('an own figure that is no integer', scratch('fraction-own', {'zz-foreign-size.json': e => ({...e, ownBytes: 1.5})}), /zz-foreign-size\.json states no route bytes of its own \(ownBytes, or delta\): an integer of at least 0, not 1\.5\./);
  refused('an own figure written as text', scratch('text-own', {'wp9a-s1-size.json': e => ({...e, ownBytes: String(e.ownBytes)})}), /wp9a-s1-size\.json states no route bytes of its own \(ownBytes, or delta\): an integer of at least 0, not "342"\./);
  refused('a pool item two files book', scratch('twice', {'zz-foreign-size.json': e => ({...e, ownBytes: 0, sharedPoolBytes: {baselineDefectFmtL10: 34}})}), /The shared pool's baselineDefectFmtL10 is booked twice: by \S+wp9a-s1-size\.json and by \S+zz-foreign-size\.json\. One file books each item\./);
  refused('a negative pool item in a package\'s file', scratch('foreign-negative', {'zz-foreign-size.json': e => ({...e, ownBytes: 0, sharedPoolBytes: {sharedOnce: -46}})}), /zz-foreign-size\.json: the shared pool's sharedOnce is -46 B: a negative pool item is the lead's alone, in lead-bookings-size\.json\./);
  refused('a pool item that is no count of bytes', scratch('pool-text', {'zz-foreign-size.json': e => ({...e, ownBytes: 0, sharedPoolBytes: {sharedOnce: '46'}})}), /zz-foreign-size\.json: the shared pool's sharedOnce is no count of bytes\./);
  refused('the lead\'s file stating bytes of its own', scratch('lead-own', {'lead-bookings-size.json': e => ({...e, ownBytes: 5})}), /lead-bookings-size\.json is the lead's: it books the shared pool only \(ownBytes 0\), not 5\./);
  // (ruling R3) a size file it cannot read is refused with its path, as every other refusal names its file: one that is not valid JSON, and one that is no object
  for (const [name, text, words] of [['zz-broken-size.json', '{"ownBytes": 0, sharedPoolBytes: {}}\n', 'it is not valid JSON \\('], ['zz-null-size.json', 'null\n', 'a size file is a JSON object\\.$']]) {
    const dir = scratch('unreadable-' + name.replace(/\.json$/, ''), {}); writeFileSync(dir + '/' + name, text);
    refused('a size file it cannot read (' + name + ')', dir, new RegExp('^' + dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/' + name.replace('.', '\\.') + ' is no size file this check can read: ' + words)); }
  assert.deepEqual(misses, [], 'routeBookings refuses each: ' + misses.join(' | '));
  // the lead's own file may book a negative pool item, which the merge check then holds to the build like any other
  { const dir = scratch('lead-negative', {'lead-bookings-size.json': e => ({...e, sharedPoolBytes: {...e.sharedPoolBytes, sharedOnceN1: -46}})}); assert.equal(R.routeBookings(null, dir).pool[dir + '/lead-bookings-size.json:sharedOnceN1'], -46, 'a negative pool item in the lead\'s own file is read'); }
  // the lead's merge check, on this build
  const {assertBookingsAddUp} = R; assert.equal(typeof assertBookingsAddUp, 'function', 'rc44-s0-readings.mjs states the lead\'s merge check (assertBookingsAddUp)');
  const route = (clientBuilt || await (await import('./client-bundle.mjs')).bundleClient('.aiw-local/rc44-s0/client')).report.routes.chapters.code;
  assert.ok(existsSync(LEAD_FILE), 'the lead\'s own file exists (' + LEAD_FILE + ')'); const lead = JSON.parse(readFileSync(LEAD_FILE, 'utf8'));
  assert.deepEqual([lead.schema, lead.ownBytes, lead.productionAccepted, typeof lead.name, typeof lead.whatWasMeasured, lead.bases?.integrated?.commit, lead.bases?.integrated?.chapters], ['aiw.rc44.slice-size.v3', 0, false, 'string', 'string', INTEGRATED.commit, INTEGRATED.chapters], 'the lead\'s file is a size file like the others, with no bytes of its own');
  const real = assertBookingsAddUp(route, INTEGRATED);
  assert.equal(real.grew, route - INTEGRATED.chapters); assert.equal(real.grew, real.own + real.pool, 'the route\'s growth is every file\'s own bytes plus the pool\'s');
  // a stale figure: each file's own figure changed by one byte, in turn, fails, naming each file's figure
  const own = R.routeBookings(null, BOOKINGS).own; assert.ok(Object.keys(own).length >= 3, 'the files of the build\'s packages and the lead\'s: ' + JSON.stringify(own));
  // (the lead's own figure is 0 by rule: a changed one is refused above)
  // (the lead's ruling V3 of 2026-11-22; was: /the chapters route grew \d+ B … and the size files book \d+ B: /) the growth, and the
  // bookings it is held to, are signed numbers: a retirement's saving (U2) makes both negative, so each reads -?\d+; the message shape and
  // every file's figure are still required
  for (const file of Object.keys(own).filter(f => !f.endsWith('/lead-bookings-size.json'))) { const name = file.split('/').pop(), key = name === 'wp2-s1-size.json' && !('ownBytes' in JSON.parse(readFileSync(file, 'utf8'))) ? 'delta' : 'ownBytes', dir = scratch('stale-' + name.replace(/\.json$/, ''), {[name]: e => ({...e, [key]: e[key] + 1})});
    assert.throws(() => assertBookingsAddUp(route, INTEGRATED, dir), e => { assert.match(e.message, /^The bookings do not add up: the chapters route grew -?\d+ B against 9673661 \(\d+ - 3229840\), and the size files book -?\d+ B: /, name + ' stale: ' + e.message); for (const [f, n] of Object.entries(own)) assert.ok(e.message.includes(f.split('/').pop() + ' ' + (f === file ? n + 1 : n) + ' B of its own'), name + ' stale: the failure names ' + f + '\'s figure: ' + e.message); return true; }, name + ' changed by one byte'); }
  // a foreign file that books bytes, and one that books a pool item, fail the check too
  for (const [why, files] of [['a foreign file with bytes of its own', {'zz-foreign-size.json': e => ({...e, ownBytes: 300})}], ['a foreign pool item', {'zz-foreign-size.json': e => ({...e, ownBytes: 0, sharedPoolBytes: {strayItem: 12}})}], ['the lead\'s negative pool item that no build shows', {'lead-bookings-size.json': e => ({...e, sharedPoolBytes: {...e.sharedPoolBytes, sharedOnceN1: -46}})}]])
    assert.throws(() => assertBookingsAddUp(route, INTEGRATED, scratch('add-' + why.replace(/\W+/g, '-'), files)), /^Error: The bookings do not add up: /, why);
  pass('O1, R3: routeBookings refuses an own figure that is no integer of at least 0, a pool item two files book, a negative pool item outside the lead\'s own file, bytes of the lead\'s own and, with its path, a size file it cannot read; the lead\'s merge check holds on this build (the chapters route ' + route + ' B less the integrated base ' + INTEGRATED.chapters + ' B: ' + real.grew + ' B = ' + Object.entries(own).map(([f, n]) => f.split('/').pop() + ' ' + n).join(' + ') + ' + the shared pool ' + real.pool + '), and a stale figure (each file\'s own changed by one byte), a foreign file and a foreign pool item each fail it, naming each file\'s figure');
});

// ---------------------------------------------------------------- L1. keeping a proposal is a signed-in person's step
// (the lead's ruling L1 of 2026-11-20) record.keep makes AIW's proposal a person's record. An agent account, a draft by
// Sol and an import keep nothing: refused alone and as an inner command of a reviewed batch or of a saved alternative,
// at any depth. A person's keep is taken as on rc.10.73.42 and stamped as kept by them. Built-in records first (the gap
// is there on 94dbd4f for AIW's own proposals); every package's records ride the same rule.
await block('L1 keep is a person\'s step', async () => {
  const {refuseUnreviewable} = await import('./authorship.js');
  const h = await harness(), d = () => h.state.document, SOL = {authorKind: 'sol-draft', reason: 'Drafted.'}, IMPORT = {authorKind: 'import', reason: 'Imported.'};
  try {
    // a blank project of A's, where AIW proposes the needs a component states (the reference project holds its needs already)
    { const made = await h.api('/api/projects', 'POST', {name: 'Keep probe', template: 'blank'}); assert.equal(made.status, 201); h.pid = (await made.json()).document.id; h.q = '?project=' + encodeURIComponent(h.pid);
      for (const actorId of [B, C, AGENT]) assert.equal((await h.api('/api/access' + h.q, 'POST', {actorId, role: 'editor'})).status, 200); }
    assert.equal((await h.send('realisation.component', {title: 'Keep probe service', kind: 'service', purpose: 'Takes probes.', technologyNeeds: 'Persist each probe record and authenticate the caller.'})).status, 200);
    const seeds = d().technology.needs.filter(n => n.state === 'proposed' && n.origin === 'seeded').map(n => n.id); assert.ok(seeds.length >= 2, 'AIW proposed needs');
    const [one, two] = seeds, keep = id => ({type: 'record.keep', payload: {ids: [id], chapter: 6}}), still = id => assert.equal(d().technology.needs.find(n => n.id === id)?.state, 'proposed', id + ' is still a proposal');
    const batch = async (commands, as, extra) => { await h.read(as); return h.send('workspace.apply', {commands, stamp: previewWorkingChange(d(), commands).stamp, reason: 'A batch.', reviewed: !extra?.authorKind}, as, extra); };
    const alternative = async (commands, as, extra) => { await h.read(as); return h.send('workspace.alternative', {commands, stamp: previewScenarioAlternative(d(), commands, undefined).stamp, title: 'A kept proposal', reason: 'An alternative.'}, as, extra); };
    for (const [as, extra, who] of [[AGENT, {}, 'an agent account'], [A, SOL, 'a draft by Sol'], [A, IMPORT, 'an import']]) {
      for (const [how, send] of [['alone', () => h.send('record.keep', keep(one).payload, as, extra)], ['in a reviewed batch', () => batch([keep(one)], as, extra)], ['in a saved alternative', () => alternative([keep(one)], as, extra)]]) {
        const r = await send();
        assert.equal(r.status, 400, who + ' keeps nothing ' + how + ': ' + JSON.stringify(r.body).slice(0, 200)); assert.equal(r.body.code, 'authorship', who + ' ' + how);
        assert.match(r.error, /A signed-in person keeps a proposal/, who + ' ' + how + ': ' + r.error); assert.ok(!/record\.keep/.test(r.error), 'the refusal names no command type');
        await h.read(); still(one);
      }
    }
    // at any depth: a keep inside an applied impact inside a batch
    { const deep = {type: 'workspace.apply', payload: {commands: [{type: 'model.apply-impact', payload: {command: keep(one)}}]}};
      for (const author of [{kind: 'sol-draft', account: 'agent'}, {kind: 'sol-draft', account: 'person'}, {kind: 'import', account: 'person'}]) assert.throws(() => refuseUnreviewable(deep, author), /A signed-in person keeps a proposal/, JSON.stringify(author));
      assert.doesNotThrow(() => refuseUnreviewable(deep, {kind: 'person', account: 'person'}), 'a person\'s keep at any depth is taken'); }
    // a person's keep: alone and in a batch, as today, stamped as kept by them
    assert.equal((await h.send('record.keep', keep(one).payload, B)).status, 200);
    // (a need's keep dates it, keptAt, so the person's stamp is the author stamp from AIW's words, as on rc.10.73.42)
    const theirs = n => [n.state, n.origin, n.provenance?.author?.kind, n.provenance?.author?.by, n.provenance?.author?.from, authorship(n)];
    let n = d().technology.needs.find(x => x.id === one); assert.deepEqual(theirs(n), [undefined, 'suggestion', 'person', B, 'seeded', {kind: 'person', from: 'seeded'}]);
    { const r = await batch([keep(two)], B); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); n = d().technology.needs.find(x => x.id === two); assert.deepEqual(theirs(n), [undefined, 'suggestion', 'person', B, 'seeded', {kind: 'person', from: 'seeded'}]); }
  } finally { h.close(); }
  pass('L1: record.keep from an agent account, a draft by Sol or an import is refused alone, in a reviewed batch, in a saved alternative and at any depth, and AIW\'s proposal stays one; a person\'s keep is taken alone and in a batch and stamped as kept by them');
});

// ---------------------------------------------------------------- L3. a package's restore rule, on its own collections only
await block('L3 restore rule', () => {
  assert.deepEqual(boundary.extensionIssues({id: 'xy', lifecycle: {'journals.records': 3}, canRestore: {'journals.records': () => {}}}), [], 'a rule on the package\'s own collection');
  assert.ok(boundary.extensionIssues({id: 'xy', canRestore: {'runtime.zones': () => {}}}).some(i => /restore rule of “runtime\.zones” is on a collection the package does not state in lifecycle/.test(i)), 'never on a built-in collection');
  assert.ok(boundary.extensionIssues({id: 'xy', lifecycle: {'journals.records': 3}, canRestore: {'journals.records': 1}}).some(i => /restore rule of “journals\.records” is a function/.test(i)));
  assert.ok(boundary.extensionIssues({id: 'xy', canRestore: []}).some(i => /canRestore is \{path/.test(i)));
  // (the lead's ruling M6, wp9a slice 1 second fix-up) quietProposals {path: true}: on the package's own lifecycle collections only
  assert.deepEqual(boundary.extensionIssues({id: 'xy', lifecycle: {'journals.records': 3}, quietProposals: {'journals.records': true}}), [], 'quietProposals on the package\'s own collection');
  assert.ok(boundary.extensionIssues({id: 'xy', quietProposals: {'runtime.zones': true}}).some(i => /quietProposals “runtime\.zones” is on a collection the package does not state in lifecycle/.test(i)), 'never on a built-in collection');
  assert.ok(boundary.extensionIssues({id: 'xy', lifecycle: {'journals.records': 3}, quietProposals: {'journals.records': 1}}).some(i => /quietProposals “journals\.records” is true or not stated/.test(i)));
  assert.ok(boundary.extensionIssues({id: 'xy', quietProposals: []}).some(i => /quietProposals is \{path: true\}/.test(i)));
  pass('L3: a package states a restore rule (canRestore) for its own lifecycle collections only, as a function; and (M6) quietProposals for its own lifecycle collections only');
});

// ---------------------------------------------------------------- O2. the boundary, not the package, says what a tracker changed
// (the lead's ruling O2 of 2026-11-21; new problem 2 of the second verifier of wp9a slice 1; it amends M1 and completes
// H2) A package whose tracker mends records of a built-in collection states those collections as trackPaths (beside
// track; checked at start: it needs track and names no collection of the package's own). Before each call of a tracker
// the boundary copies the records of those paths, and after it stamps as the commit's (provenance.js stampTracked, with
// the boundary's own copy as `was`) each record whose content the call changed; what a tracker answers is ignored. A
// tracker changes no other built-in collection: rc44-s0-readings.mjs assertTrackerStaysInPaths(extension, cases) holds
// it on a package's cases.
// (the lead's ruling T1 of 2026-11-22: an allow-list, not a deny-list) trackPaths is {'chapter.collection': [field, …]}:
// the content fields the package's mend may change in each collection. The boundary puts back every field it does not
// list from its copy, and a revision moves only forward, by one, and only where a listed field changed; a collection
// whose records a chapter accepts, approves or marks reviewed is refused at start, and so is a listed field that is a
// record's identity, revision or history or says whether and how it stands.
// The synthetic package below mends a Chapter 4 responsibility's purpose and boundary and a Chapter 6 need's description
// when its own command says how (this block registers it, last of the suite, so no earlier block reads it). (Ruling T1;
// was: it mended a Chapter 3 decision and a Chapter 5 contract, trackPaths ['decisions.records', 'interfaces.contracts'],
// collections a chapter accepts or marks reviewed, which the start check now refuses.)
const TRACK_FIELDS = {'logical.responsibilities': ['purpose', 'boundary'], 'technology.needs': ['description']};
// (ruling T1) the fields a trackPaths list may never name, as the start check and assertTrackerStaysInPaths refuse them
const NEVER_TRACKED = ['id', 'ref', 'code', 'alias', 'revision', 'history', 'state', 'origin', 'keptAt', 'confirmed', 'targetConfirmed', 'review', 'reviews', 'provenance', 'status', 'governance', 'approval', 'approvals', 'recorded', 'appliedImpact', 'assumptionsResolved', 'acceptedAt', 'acceptedBy', 'timeoutConfirmed', 'targetsConfirmed', 'estimatesConfirmed', 'retentionConfirmed', 'sourceSnapshot', 'logicalSnapshot', 'driverSnapshot', 'lastReview', 'reviewedAt', 'reviewer', 'approvedBy', 'governanceReference', 'selectedOptionId', 'selectedAlternativeId', 'stamp', 'sourceDriverIds', 'sourceDecisionIds', 'priorHistory'];
const TRACKING = {
  id: 'zt-tracking',
  commands: {'tracking.mode': {apply(p, command, at) { const raw = command.payload || {}; p.trackingProbe = {mode: String(raw.mode || ''), target: String(raw.target || ''), at};
    // (ruling R2; set-up only, by the package's own command, not its tracker) a responsibility made AIW's proposal; a need made one by the chapter's reading
    if (raw.mode === 'propose') p.logical.responsibilities.find(r => r.id === raw.target).state = 'proposed';
    if (raw.mode === 'seed') { const n = p.technology.needs.find(r => r.id === raw.target); Object.assign(n, {origin: 'suggestion', confirmed: false}); delete n.state; delete n.keptAt; }
    return {document: p}; }}},
  track(prior, next, command, at) {
    const t = next.trackingProbe; if (!t || command.type !== 'tracking.mode') return;
    const records = next.logical.responsibilities, target = records.find(r => r.id === t.target), was = structuredClone(target);
    // it mends what it mends and answers nothing, as a tracker does
    if (t.mode === 'mend') { target.purpose += ' (mended by the tracker)'; return; }
    // it changes nothing, and answers a record it did not change as if it had (the answer of ruling M1)
    if (t.mode === 'fabricate') return [[{...was, title: 'What it never said'}, target]];
    // it adds a record to the path, with a stamp of its own, and answers it as changed
    if (t.mode === 'add') { const added = {...structuredClone(target), id: 'lr-990', ref: 'LR-990', title: 'Added by the tracker', provenance: {author: {kind: 'person', by: C, at}}}; records.push(added); return [[{...was, id: 'lr-990'}, added]]; }
    // it writes a stamp of its own on a record whose content it leaves as it was
    if (t.mode === 'stamp') { target.provenance = {...target.provenance, author: {kind: 'person', by: C, at}}; return; }
    // it confirms a record: a tracker's call is no person's confirmation, whoever sent the commit
    if (t.mode === 'confirm') { target.confirmed = true; return; }
    // (ruling R2: a tracker mends content; it decides nothing and makes nothing) it mends a record and moves every lifecycle and review field of it
    if (t.mode === 'decide') { Object.assign(target, {purpose: target.purpose + ' (decided by the tracker)', state: 'proposed', origin: 'suggestion', keptAt: at, confirmed: true, targetConfirmed: true, review: {actor: C, account: 'person', at, note: 'Kept by the tracker.'}, reviews: [{by: C, at, outcome: 'kept'}], provenance: {...target.provenance, reviewed: {by: C, at, how: 'confirmed'}, draft: {by: 'sol', job: 'tracker'}, source: 'Written by the tracker'}}); return; }
    // (ruling T1) it mends a record and on the way accepts it, records governance, a recording and approvals, an applied impact and resolved
    // assumptions, writes a snapshot and its history, and moves its revision back
    if (t.mode === 'accept') { Object.assign(target, {purpose: target.purpose + ' (accepted by the tracker)', status: 'accepted', governance: {status: 'approved', by: C, at, reference: 'Forged by the tracker'}, recorded: {by: B, at}, approval: {by: C, at, outcome: 'approved'}, approvals: [{by: C, at}], appliedImpact: {by: C, at}, assumptionsResolved: true, sourceSnapshot: 'fp1:forged-by-the-tracker', history: [...list(target.history), {at, revision: target.revision, purpose: 'Forged by the tracker'}], revision: target.revision - 1}); return; }
    // (ruling T1) it changes a field it does not list
    if (t.mode === 'title') { target.title += ' (renamed by the tracker)'; return; }
    // (ruling T1) with its mend it moves the revision forward by one, by two, or back; and it moves the revision with no mend
    if (t.mode === 'forward') { target.boundary += ' (mended by the tracker)'; target.revision += 1; return; }
    if (t.mode === 'leap') { target.boundary += ' (mended by the tracker)'; target.revision += 2; return; }
    if (t.mode === 'back') { target.boundary += ' (mended by the tracker)'; target.revision -= 1; return; }
    if (t.mode === 'bump') { target.revision += 1; return; }
    // it mends AIW's proposal and keeps it on the way
    if (t.mode === 'keep') { target.purpose += ' (mended while proposed)'; delete target.state; return; }
    // it makes a need that is AIW's proposal by the chapter's reading (a suggestion in the catalogue's words) a person's by mending its description
    if (t.mode === 'unseed') { const n = next.technology.needs.find(r => r.id === t.target); n.description += ' (mended by the tracker)'; return; }
    // it removes a record of a path it states
    if (t.mode === 'remove') { records.splice(records.indexOf(target), 1); return; }
    // what assertTrackerStaysInPaths refuses: a built-in collection it does not state, the journal rewritten, prior changed
    if (t.mode === 'outside') next.quality.drivers[0].title += ' (changed outside its paths)';
    if (t.mode === 'rewrite') next.changes.events[0].title = 'Rewritten by the tracker';
    if (t.mode === 'counter') next.changes.counter += 1;
    if (t.mode === 'prior') prior.decisions.records[0].rationale += ' (prior changed)';
    if (t.mode === 'journal') { next.changes.events.push({id: 'CHG-' + String(++next.changes.counter).padStart(3, '0'), source: {chapter: 4, id: target.id, kind: 'tracking'}, title: 'Read again', at, fields: [], items: []}); target.purpose += ' (mended and journalled)'; }
  },
  trackPaths: TRACK_FIELDS,
  designKeys: ['trackingProbe']
};
await block('O2 tracked paths', async () => {
  need();
  // the start check: trackPaths needs track, is {'chapter.collection': [field, …]} and names no collection of the package's own (ruling T1; was: a list
  // of 'chapter.collection' paths, ['decisions.records', 'runtime.zones'] accepted)
  const f = () => {}, words = (e, re, why) => assert.ok(boundary.extensionIssues(e).some(i => re.test(i)), why + ': ' + boundary.extensionIssues(e).join(' | ')), MENDS = ['title'];
  assert.deepEqual(boundary.extensionIssues({id: 'xy', track: f, trackPaths: {'logical.responsibilities': ['purpose'], 'runtime.zones': ['nodeId', 'domainIds']}}), [], 'a tracker that states the built-in collections it mends, each with the fields it mends there');
  words({id: 'xy', trackPaths: {'logical.responsibilities': ['purpose']}}, /xy: trackPaths names the built-in collections the package's tracker mends: it states track\./, 'not without a tracker');
  // (ruling T1; was: "trackPaths is a list of 'chapter.collection' paths, each a collection of a chapter's container", for 'decisions.records', [],
  // ['decisions'], ['decisions.records.x'], [3], ['Decisions.records'], ['decisions.records', null]) a map of chapter.collection paths, each with its fields
  for (const bad of ['logical.responsibilities', [], ['logical.responsibilities'], null, 3, {}, {logical: ['purpose']}, {'logical.responsibilities.x': ['purpose']}, {'Logical.responsibilities': ['purpose']}, {'logical.responsibilities': ['purpose'], 'runtime.zones.x': ['nodeId']}]) words({id: 'xy', track: f, trackPaths: bad}, /xy: trackPaths is \{'chapter\.collection': \[field, …\]\}: the built-in collections the tracker mends, each a collection of a chapter's container, with the content fields it mends there\./, 'a map of chapter.collection paths: ' + JSON.stringify(bad));
  for (const bad of [[], 'purpose', [3], ['purpose', null], ['purpose.text'], ['Purpose'], [''], {purpose: true}]) words({id: 'xy', track: f, trackPaths: {'logical.responsibilities': bad}}, /xy: trackPaths “logical\.responsibilities” lists the content fields the tracker mends there: one or more field names\./, 'each path lists its fields: ' + JSON.stringify(bad));
  words({id: 'xy', track: f, lifecycle: {'journals.records': 3}, trackPaths: {'journals.records': MENDS}}, /xy: trackPaths “journals\.records” is the package's own collection: the boundary stamps those already; trackPaths names built-in collections only\./, 'never a lifecycle collection of its own');
  words({id: 'xy', track: f, provenance: {records: {'journals.notes': 3}}, trackPaths: {'journals.notes': MENDS}}, /trackPaths “journals\.notes” is the package's own collection/, 'nor one it states for the provenance reader');
  words({id: 'xy', track: f, provenance: {paths: {'xy.save': ['journals.items']}}, trackPaths: {'journals.items': MENDS}}, /trackPaths “journals\.items” is the package's own collection/, 'nor one its commands write');
  // (ruling R1) a built-in record collection only: one the lifecycle family keeps and the provenance reader reads (COLLECTIONS and RECORD_PATHS),
  // never the review's (the narrative and every finalReview.* list), the change journal's, the workbench's or the members', never a collection a
  // registered package states as its own; (ruling T1; was, by R1: each path once, refused when named twice, which a map cannot) each field once
  { const misses = [], esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), refused = (paths, re, why) => { const issues = boundary.extensionIssues({id: 'xy', track: f, trackPaths: paths}); if (!issues.some(i => re.test(i))) misses.push(why + ' ' + JSON.stringify(paths) + ': ' + (issues.join(' | ') || 'accepted')); };
    for (const path of ['finalReview.narrative', 'finalReview.judgements', 'finalReview.dispositions', 'finalReview.actions']) refused({[path]: MENDS}, new RegExp('^xy: trackPaths “' + esc(path) + '” is the review\'s: a tracker mends a chapter\'s records, never the review, the change journal, the workbench or the members\\.$'), 'the review\'s');
    for (const [path, whose] of [['changes.events', 'the change journal\'s'], ['workbench.history', 'the workbench\'s'], ['members.roles', 'the members\'']]) refused({[path]: MENDS}, new RegExp('^xy: trackPaths “' + esc(path) + '” is ' + esc(whose) + ': a tracker mends a chapter\'s records'), whose);
    // another registered package's own collections: its lifecycle rows and the rows it states for the provenance reader alone (the build's packages, read from the registry)
    const held = boundary.packageCollections(), of = id => X.EXTENSIONS.find(x => x.id === id), theirs = held.find(([path, , id]) => Object.hasOwn(of(id).lifecycle || {}, path)), reader = held.find(([path, , id]) => !Object.hasOwn(of(id).lifecycle || {}, path));
    assert.ok(theirs && reader, 'the registry holds a package with a lifecycle collection and one with a collection for the provenance reader alone: ' + JSON.stringify(held));
    for (const [path, , id] of [theirs, reader]) refused({[path]: MENDS}, new RegExp('^xy: trackPaths “' + esc(path) + '” is ' + esc(id) + '\'s collection: a tracker mends built-in collections only, never another package\'s\\.$'), 'another package\'s');
    refused({'logical.responsibilities': ['purpose', 'boundary', 'purpose']}, /^xy: trackPaths “logical\.responsibilities” lists “purpose” twice\.$/, 'a field twice');
    // (ruling T2; the fourth verifier's nit: 'constructor.name' was refused as “function Object() { [native code] }”) a chapter named after what every
    // object carries is no built-in record collection, in those words
    for (const path of ['runtime.things', 'security.risks', 'runtime.evidence', 'logical.assets', 'knowledge.claims', 'constructor.name', 'toString.value', 'hasOwnProperty.list', 'valueOf.records']) refused({[path]: MENDS}, new RegExp('^xy: trackPaths “' + esc(path) + '” is no collection of records that the lifecycle family keeps and the provenance reader reads \\(record-lifecycle\\.js COLLECTIONS, provenance\\.js RECORD_PATHS\\): a tracker mends built-in records only\\.$'), 'no built-in record collection');
    // (ruling T1, belt and braces) never a collection whose records a chapter accepts, approves or marks reviewed: the lead's five (the decisions and their
    // conflicts, the quality conflicts, the technology realisations, the logical mappings) and the others the chapters hold (the module structure a person
    // accepts, the components and the capabilities a person marks reviewed, the contracts and the data a person records a review of)
    const ACCEPTED = ['requirementGroups.records', 'quality.conflicts', 'decisions.records', 'decisions.conflicts', 'logical.mappings', 'realisation.components', 'technology.capabilities', 'technologyRealisation.records', 'interfaces.contracts', 'interfaces.data'];
    const accepted = path => refused({[path]: MENDS}, new RegExp('^xy: trackPaths “' + esc(path) + '” holds records a chapter accepts, approves or marks reviewed: a tracker mends none of them\\.$'), 'a collection a chapter accepts, approves or marks reviewed');
    for (const path of ACCEPTED) accepted(path);
    // and the walk: every built-in record collection whose records, in any template, carry an acceptance, an approval or a recorded review (a field so
    // named, or a status the chapters read as one) is refused so, whatever list it is on
    { const KEYS = new Set(['governance', 'approval', 'approvals', 'recorded', 'review', 'reviews', 'acceptedAt', 'acceptedBy']), STATUSES = new Set(['accepted', 'approved', 'resolved', 'reviewed', 'recorded', 'superseded']), found = new Set();
      for (const t of ['blank', 'bank-payment', ...REFERENCE_PROJECTS.map(r => r.id)]) { const p = withFinalReview(createProject({name: t, template: t}, t, AT));
        for (const [path] of COLLECTIONS) for (const r of list(path.split('.').reduce((v, k) => v?.[k], p))) if (r && typeof r === 'object' && Object.keys(r).some(k => KEYS.has(k) || k === 'status' && STATUSES.has(r[k]) || k === 'state' && r[k] === 'accepted')) found.add(path); }
      assert.ok(['decisions.records', 'technologyRealisation.records', 'interfaces.contracts', 'interfaces.data'].every(x => found.has(x)), 'the walk finds the collections whose records carry an acceptance, an approval or a recorded review: ' + [...found].join(', '));
      for (const path of found) accepted(path); }
    // (ruling T1) a field the tracker lists is content: never the record's identity, revision or history, never what says whether and how it stands
    // (TRACKED_STANDING), never what the chapters read as an acceptance, an approval, a review, a confirmation or a snapshot
    for (const field of NEVER_TRACKED)
      refused({'logical.responsibilities': ['purpose', field]}, new RegExp('^xy: trackPaths “logical\\.responsibilities” lists “' + esc(field) + '”, which a tracker never changes: a record\'s identity, revision and history, and whether and how it stands \\(its state, an acceptance, an approval, a review, a confirmation, a snapshot, its provenance\\), are the chapter\'s and the boundary\'s\\.$'), 'a field a tracker never changes');
    for (const field of ['constructor', 'toString', 'hasOwnProperty', 'valueOf']) refused({'logical.responsibilities': [field]}, new RegExp('^xy: trackPaths “logical\\.responsibilities” lists “' + field + '”, which names what every object carries: it is no field of a record\\.$'), 'a field every object carries');
    assert.deepEqual(misses, [], 'the start check refuses each: ' + misses.join(' | '));
    // and accepts every other built-in record collection of a chapter's container, together, each with a content field
    const builtIn = COLLECTIONS.map(([path]) => path).filter(path => path.includes('.') && RECORD_PATHS.some(([x]) => x === path) && !ACCEPTED.includes(path) && !X.EXTENSIONS.some(x => [...Object.keys(x.lifecycle || {}), ...Object.keys(x.provenance?.records || {})].includes(path)));
    // (ruling T1; was: builtIn.length >= 30, every built-in record collection accepted) at least 30 built-in record collections, as before: the ten a
    // chapter accepts, approves or marks reviewed are each refused above, and the rest (at least 20) are accepted
    assert.ok(builtIn.length >= 20 && builtIn.length + ACCEPTED.length >= 30 && ['runtime.zones', 'runtime.placements', 'logical.responsibilities', 'technology.needs', 'processModel.claims'].every(x => builtIn.includes(x)) && !builtIn.includes('logical.assets'), 'the built-in record collections: ' + builtIn.join(', '));
    assert.deepEqual(boundary.extensionIssues({id: 'xy', track: f, trackPaths: Object.fromEntries(builtIn.map(path => [path, MENDS]))}), [], 'every other built-in record collection may be mended'); }
  assert.deepEqual(boundary.extensionIssues(TRACKING), [], 'the synthetic package conforms');
  X.registerExtension(TRACKING);
  // assertTrackerStaysInPaths, on documents the handler of the package's own command leaves
  const {assertTrackerStaysInPaths} = R; assert.equal(typeof assertTrackerStaysInPaths, 'function', 'rc44-s0-readings.mjs states assertTrackerStaysInPaths(extension, cases)');
  { const base = reference('bank-payment'), first = base.logical.responsibilities[0], id = first.id, ref = first.ref; base.changes.events.push({id: 'CHG-001', title: 'An earlier change', at: AT, fields: [], items: []}); base.changes.counter = 1;
    const kase = mode => { const command = {type: 'tracking.mode', payload: {mode, target: id}}; return {prior: base, next: withFinalReview(TRACKING.commands['tracking.mode'].apply(structuredClone(base), command, AT).document), command, at: AT}; };
    // (ruling T1; was: changed {'decisions.records': 2, 'interfaces.contracts': 0}, the synthetic package's paths then) what the tracker changed in its paths and its journal
    const read = assertTrackerStaysInPaths(TRACKING, [kase('mend'), kase('journal'), kase('fabricate'), kase('')]); assert.deepEqual(read, {cases: 4, changed: {'logical.responsibilities': 2, 'technology.needs': 0}, journalled: 1}, 'what the tracker changed in its paths and its journal: ' + JSON.stringify(read));
    // (ruling T1) a mend that moves the revision forward by one is inside its paths
    assert.deepEqual(assertTrackerStaysInPaths(TRACKING, [kase('forward')]).changed, {'logical.responsibilities': 1, 'technology.needs': 0}, 'a mend with its revision forward by one');
    for (const [mode, re] of [['outside', /zt-tracking's tracker changed “quality\.drivers” outside its own keys, its trackPaths and the change journal \(case 1, tracking\.mode\)/], ['rewrite', /zt-tracking's tracker changed the change journal's earlier events \(case 1, tracking\.mode\): a tracker only adds to the journal/], ['counter', /zt-tracking's tracker moved the change journal's counter by 1 for 0 events it added \(case 1, tracking\.mode\)/], ['prior', /zt-tracking's tracker changed the document as the request found it \(prior, case 1, tracking\.mode\)/]]) assert.throws(() => assertTrackerStaysInPaths(TRACKING, [kase(mode)]), re, mode);
    // (ruling R2; was: "a record added to a path it states is inside its paths", changed['decisions.records'] equal to 1) inside its paths a tracker
    // adds no record and removes none; (ruling T1; was: none of TRACKED_STANDING moves, in the words "a tracker mends content; whether and how a record
    // stands, its confirmations, reviews and provenance are the lifecycle family's and the boundary's", naming the fields in the record's order) a
    // tracker changes only the fields it lists for the path, named in their alphabetical order, and moves a revision only forward by one with a mend
    assert.deepEqual(R.TRACKED_STANDING, boundary.TRACKED_STANDING, 'the helper holds the fields the boundary restores (rc44-s0-readings.mjs TRACKED_STANDING)');
    assert.deepEqual(boundary.TRACKED_STANDING, ['state', 'origin', 'keptAt', 'confirmed', 'targetConfirmed', 'review', 'reviews', 'provenance'], 'the lifecycle and review fields, with the fields the lifecycle family reads as standing and the provenance, which is the server\'s');
    const PATHS_ONLY = 'a tracker mends the records of its trackPaths; it makes none and removes none\\.$', FIELDS_ONLY = 'a tracker changes only the content fields its trackPaths lists for the path; every other field of a record \\(its identity and history, whether and how it stands, an acceptance, an approval, a review, a confirmation, a snapshot\\) is the chapter\'s and the boundary\'s\\.$';
    const REVISION = (from, to) => new RegExp('^Error: zt-tracking\'s tracker moved the revision of ' + ref + ' in “logical\\.responsibilities” from ' + from + ' to ' + to + ' \\(case 1, tracking\\.mode\\): a mend moves a revision forward by one, and only when it changes a field its trackPaths lists\\.$');
    const FIELDS = names => new RegExp('^Error: zt-tracking\'s tracker changed ' + names.map(n => '“' + n + '”').join(', ') + ' of ' + ref + ' in “logical\\.responsibilities” \\(case 1, tracking\\.mode\\): ' + FIELDS_ONLY);
    for (const [mode, re] of [['add', new RegExp('^Error: zt-tracking\'s tracker added LR-990 to “logical\\.responsibilities” \\(case 1, tracking\\.mode\\): ' + PATHS_ONLY)], ['remove', new RegExp('^Error: zt-tracking\'s tracker removed ' + ref + ' from “logical\\.responsibilities” \\(case 1, tracking\\.mode\\): ' + PATHS_ONLY)],
      ['confirm', FIELDS(['confirmed'])], ['decide', FIELDS(['confirmed', 'keptAt', 'origin', 'provenance', 'review', 'reviews', 'state', 'targetConfirmed'])],
      ['accept', FIELDS(['appliedImpact', 'approval', 'approvals', 'assumptionsResolved', 'governance', 'history', 'recorded', 'sourceSnapshot', 'status'])], ['title', FIELDS(['title'])],
      ['back', REVISION(first.revision, first.revision - 1)], ['leap', REVISION(first.revision, first.revision + 2)], ['bump', REVISION(first.revision, first.revision + 1)]])
      assert.throws(() => assertTrackerStaysInPaths(TRACKING, [kase(mode)]), re, mode);
    // (ruling T1) the helper reads trackPaths as the start check does: a map of paths, each with its fields, none of them a standing field
    assert.throws(() => assertTrackerStaysInPaths({...TRACKING, trackPaths: ['logical.responsibilities']}, [kase('mend')]), /^Error: assertTrackerStaysInPaths: zt-tracking states trackPaths as \{'chapter\.collection': \[field, …\]\}\.$/, 'the list of ruling O2');
    assert.throws(() => assertTrackerStaysInPaths({...TRACKING, trackPaths: {'logical.responsibilities': ['purpose', 'confirmed']}}, [kase('mend')]), /^Error: assertTrackerStaysInPaths: zt-tracking lists “confirmed” for “logical\.responsibilities”, which a tracker never changes\.$/, 'a standing field');
    assert.throws(() => assertTrackerStaysInPaths({...TRACKING, trackPaths: {'logical.responsibilities': ['purpose', 'revision']}}, [kase('mend')]), /lists “revision” for “logical\.responsibilities”, which a tracker never changes/, 'the revision');
    // (ruling T1: the helper holds the same) and every field the start check refuses: the helper states the rule itself (it imports only modules of
    // the baseline), as it states TRACKED_STANDING, and this suite holds the two equal on every field the start check's case names and on content fields
    for (const field of NEVER_TRACKED) assert.throws(() => assertTrackerStaysInPaths({...TRACKING, trackPaths: {'logical.responsibilities': ['purpose', field]}}, [kase('mend')]), new RegExp('^Error: assertTrackerStaysInPaths: zt-tracking lists “' + field + '” for “logical\\.responsibilities”, which a tracker never changes\\.$'), 'the helper refuses ' + field);
    { const names = [...NEVER_TRACKED, 'purpose', 'boundary', 'description', 'nodeId', 'domainIds', 'title', 'name', 'notes', 'owner', 'requirementIds'];
      assert.equal(typeof R.trackFieldRefused, 'function', 'rc44-s0-readings.mjs states trackFieldRefused(field)');
      assert.deepEqual(names.filter(x => R.trackFieldRefused(x)), names.filter(x => boundary.trackFieldRefused(x)), 'the helper refuses the fields the start check refuses');
      assert.deepEqual(names.filter(x => boundary.trackFieldRefused(x)), NEVER_TRACKED, 'and only those of these'); }
    assert.throws(() => assertTrackerStaysInPaths({id: 'xy'}, [kase('mend')]), /xy states no tracker/); assert.throws(() => assertTrackerStaysInPaths(TRACKING, []), /no case/); }
  // through the server: who sent the commit stamps what the tracker changed; an answer is ignored; what it may not change is put back or refused
  const h = await harness(), d = () => h.state.document, ok = (r, why) => assert.equal(r.status, 200, why + ': ' + JSON.stringify(r.body).slice(0, 300)), res = id => d().logical.responsibilities.find(r => r.id === id), stamp = id => res(id).provenance?.author;
  try {
    const [one, two, three] = d().logical.responsibilities.map(r => r.id);
    // B saves the three responsibilities first, so each is a person's other than the one who commits next
    for (const id of [one, two, three]) ok(await h.send('logical.responsibility', {...res(id), purpose: res(id).purpose + ' (B\'s wording)'}, B), 'B saves ' + id);
    assert.deepEqual([stamp(one)?.kind, stamp(one)?.by, stamp(two)?.by, stamp(three)?.by], ['person', B, B, B], 'the three are B\'s');
    const misses = [], check = (why, test) => { try { test(); } catch (e) { misses.push(why + ': ' + e.message.split('\n')[0]); } };
    // a person's commit: the record the tracker mended, answering nothing, is stamped as A's commit
    ok(await h.send('tracking.mode', {mode: 'mend', target: one}), 'A\'s commit');
    check('a person\'s commit', () => { assert.ok(/\(mended by the tracker\)$/.test(res(one).purpose), 'the tracker mended it'); assert.deepEqual([stamp(one)?.kind, stamp(one)?.by, stamp(one)?.at, authorship(res(one)).kind], ['person', A, d().trackingProbe.at, 'person'], 'the record the tracker mended is stamped as the commit\'s, A\'s'); });
    // an agent account's commit: stamped as the draft it is
    ok(await h.send('tracking.mode', {mode: 'mend', target: one}, AGENT), 'the agent account\'s commit');
    check('an agent account\'s commit', () => assert.deepEqual([stamp(one)?.kind, stamp(one)?.by, stamp(one)?.at, authorship(res(one)).kind], ['sol-draft', AGENT, d().trackingProbe.at, 'sol-draft'], 'the record the tracker mended is stamped as the commit\'s, the agent account\'s draft'));
    // a fabricated answer that names a record the call did not change stamps nothing
    { const was = JSON.stringify(res(two)); ok(await h.send('tracking.mode', {mode: 'fabricate', target: two}), 'a fabricated answer'); check('a fabricated answer', () => assert.equal(JSON.stringify(res(two)), was, 'the record the answer names is as it was, B\'s')); }
    // (ruling R2; was: the record a tracker adds to a path it states is stamped as no one's) a tracker call that adds a record to a path it states is
    // refused, in a person's commit and in an agent account's: the commit is not stored, and the answer names the package (a mend changes records; it
    // does not make them); so is one that removes a record (it does not unmake them either)
    const REFUSED = what => new RegExp('^This action could not be completed: the design package zt-tracking\'s tracker ' + what + '\\. A tracker mends the records of the collections it states \\(trackPaths\\); it decides nothing and makes nothing, so nothing was saved\\.$');
    const read = (doc, path) => JSON.stringify(path.split('.').reduce((v, k) => v?.[k], doc));
    const refusedCall = async (why, payload, as, what, paths) => { const before = structuredClone(await h.read()), r = await h.send('tracking.mode', payload, as), after = await h.read();
      check(why, () => { assert.equal(r.status, 500, 'refused: ' + JSON.stringify(r.body).slice(0, 300)); assert.equal(r.body.code, 'fault'); assert.match(r.error, REFUSED(what)); assert.equal(after.revision, before.revision, 'the commit is not stored'); for (const path of paths) assert.equal(read(after.document, path), read(before.document, path), path + ' is as it was'); }); };
    for (const as of [A, AGENT]) await refusedCall('an added record (' + as + ')', {mode: 'add', target: two}, as, 'added LR-990 to logical\\.responsibilities', ['logical.responsibilities', 'trackingProbe']);
    await refusedCall('a removed record', {mode: 'remove', target: one}, A, 'removed ' + res(one).ref + ' from logical\\.responsibilities', ['logical.responsibilities', 'trackingProbe']);
    // a stamp a tracker writes on a record whose content it leaves is not kept: the stamp is the boundary's
    { const was = JSON.stringify(stamp(two)); ok(await h.send('tracking.mode', {mode: 'stamp', target: two}), 'a stamp of its own'); check('a stamp of the tracker\'s own', () => assert.equal(JSON.stringify(stamp(two)), was, 'B\'s stamp stands')); }
    // (ruling R2; was: "a confirmation the tracker sets is no person's review": confirmed stays true and the provenance is as it was) a confirmation the
    // tracker sets is restored from the boundary's copy, in a person's commit and in an agent account's: the record is as it was, byte for byte, B's
    for (const as of [A, AGENT]) { const was = JSON.stringify(res(two)); ok(await h.send('tracking.mode', {mode: 'confirm', target: two}, as), 'a confirmation of its own (' + as + ')'); check('a confirmation the tracker sets (' + as + ')', () => assert.equal(JSON.stringify(res(two)), was, 'the confirmation is restored and nothing is stamped: ' + JSON.stringify(res(two)).slice(0, 300))); }
    // (ruling R2) a tracker call that mends a record and moves its lifecycle and review fields: the boundary restores each of them from its copy and stamps
    // the content change as the commit's, a person's and an agent account's; nothing of the tracker's provenance stands
    for (const [as, kind] of [[A, 'person'], [AGENT, 'sol-draft']]) { const was = structuredClone(res(three)); ok(await h.send('tracking.mode', {mode: 'decide', target: three}, as), 'a decision the tracker makes (' + as + ')');
      check('the lifecycle and review fields restored (' + as + ')', () => { const now = res(three); assert.ok(now.purpose.endsWith(' (decided by the tracker)'), 'the tracker mended it');
        for (const k of ['state', 'origin', 'keptAt', 'confirmed', 'targetConfirmed', 'review', 'reviews']) assert.deepEqual(now[k], was[k], '“' + k + '” is as the record had it: ' + JSON.stringify(now[k]));
        const {author, ...rest} = now.provenance || {}, {author: earlier, ...wasRest} = was.provenance || {};
        assert.deepEqual([author?.kind, author?.by, author?.at, rest], [kind, as, d().trackingProbe.at, wasRest], 'its provenance is the boundary\'s: the content change stamped as the commit\'s, nothing of the tracker\'s (' + JSON.stringify(now.provenance) + ', was ' + JSON.stringify(earlier) + ')');
        assert.equal(authorship(now).kind, kind, 'and read as the commit\'s'); }); }
    // (ruling T1) a tracker call that mends a record and on the way accepts it, records governance, a recording and approvals, an applied impact and
    // resolved assumptions, writes a snapshot and its history and moves its revision back: every field it does not list is put back from the boundary's
    // copy, in the record's order, the revision as it was, and only the mend stands, stamped as the commit's, a person's and an agent account's
    for (const [as, kind] of [[A, 'person'], [AGENT, 'sol-draft']]) { const was = structuredClone(res(two)); ok(await h.send('tracking.mode', {mode: 'accept', target: two}, as), 'a decision the tracker would take (' + as + ')');
      check('an acceptance, governance, a recording, an approval, a snapshot, a history and a revision moved back, put back (' + as + ')', () => { const now = res(two), {purpose, provenance, ...rest} = now, {purpose: earlier, provenance: wasProvenance, ...wasRest} = was;
        assert.equal(purpose, earlier + ' (accepted by the tracker)', 'the mend stands');
        assert.equal(JSON.stringify(rest), JSON.stringify(wasRest), 'every field the tracker does not list is as the record had it: ' + JSON.stringify(rest).slice(0, 400));
        assert.deepEqual(['status', 'governance', 'recorded', 'approval', 'approvals', 'appliedImpact', 'assumptionsResolved'].filter(k => Object.hasOwn(now, k)), [], 'nothing of the acceptance or the approval is written');
        assert.deepEqual([now.revision, now.sourceSnapshot, now.history], [was.revision, was.sourceSnapshot, was.history], 'the revision, the snapshot and the history as they were');
        const {author, ...pv} = provenance || {}, {author: before, ...wasPv} = wasProvenance || {};
        assert.deepEqual([author?.kind, author?.by, author?.at, pv], [kind, as, d().trackingProbe.at, wasPv], 'the content change stamped as the commit\'s (was ' + JSON.stringify(before) + ')');
        assert.equal(authorship(now).kind, kind, 'and read as the commit\'s'); }); }
    // (ruling T1) a revision moves forward by one with a mend of a field the tracker lists, and in no other way: moved by two with its mend it is put back;
    // moved with no mend, or with a field the tracker does not list, the record is as it was, byte for byte
    { const was = structuredClone(res(one)); ok(await h.send('tracking.mode', {mode: 'forward', target: one}), 'a revision forward by one');
      check('a revision forward by one with its mend', () => assert.deepEqual([res(one).revision, res(one).boundary, stamp(one)?.by], [was.revision + 1, was.boundary + ' (mended by the tracker)', A])); }
    { const was = structuredClone(res(one)); ok(await h.send('tracking.mode', {mode: 'leap', target: one}), 'a revision forward by two');
      check('a revision moved by two with its mend', () => assert.deepEqual([res(one).revision, res(one).boundary], [was.revision, was.boundary + ' (mended by the tracker)'], 'the mend stands and the revision is as it was')); }
    for (const [mode, why] of [['bump', 'a revision moved with no mend'], ['title', 'a field the tracker does not list']]) { const was = JSON.stringify(res(one)); ok(await h.send('tracking.mode', {mode, target: one}, AGENT), why);
      check(why, () => assert.equal(JSON.stringify(res(one)), was, 'the record is as it was, and nothing is stamped: ' + JSON.stringify(res(one)).slice(0, 300))); }
    // a tracker that keeps AIW's proposal while it mends it keeps nothing: the record stays a proposal, its content change stamped as the commit's
    ok(await h.send('tracking.mode', {mode: 'propose', target: three}, B), 'the package\'s own command makes ' + three + ' a proposal'); assert.equal(res(three).state, 'proposed');
    ok(await h.send('tracking.mode', {mode: 'keep', target: three}), 'a keep the tracker makes');
    check('a proposal the tracker keeps', () => { assert.ok(res(three).purpose.endsWith(' (mended while proposed)'), 'the tracker mended it'); assert.equal(res(three).state, 'proposed', 'it is AIW\'s proposal still'); assert.deepEqual([stamp(three)?.kind, stamp(three)?.by, res(three).provenance?.reviewed], ['person', A, undefined], 'stamped as A\'s commit, kept by no one'); });
    // where the chapter's reading of AIW's proposal rests on a field that is content (a need in the catalogue's words that AIW suggested), what cannot be
    // restored without undoing the mend is refused instead: the tracker would decide that the proposal is a person's record (was, before ruling T1: an
    // inherited contract at its first revision, in interfaces.contracts, which the start check now refuses)
    const need = d().technology.needs[0]; ok(await h.send('tracking.mode', {mode: 'seed', target: need.id}, B), 'the package\'s own command makes ' + need.id + ' AIW\'s proposal by the chapter\'s reading');
    assert.ok(canonical.LIFECYCLE_RULES['technology.needs'].seed(d(), d().technology.needs[0]), need.id + ' is AIW\'s proposal by the chapter\'s reading');
    await refusedCall('a proposal the tracker unmakes by its description', {mode: 'unseed', target: need.id}, A, 'would change whether ' + need.id + ' in technology\\.needs is AIW\'s proposal', ['technology.needs', 'trackingProbe']);
    assert.deepEqual(misses, [], 'the boundary, not the package, says what a tracker changed: ' + misses.join(' | '));
  } finally { h.close(); }
  // (the lead's follow-up after the fifth verifier) every field a path does not list is put back as it was, a field named
  // "__proto__" included: the boundary writes the record's fields as its own, never by assignment
  { const p = JSON.parse(JSON.stringify(reference('bank-payment'))), r = p.logical.responsibilities[0];
    Object.defineProperty(r, '__proto__', {value: {note: 'kept as written'}, enumerable: true, writable: true, configurable: true});
    const prior = JSON.parse(JSON.stringify(p)), next = JSON.parse(JSON.stringify(p)); next.trackingProbe = {mode: 'mend', target: r.id, at: AT};
    assert.ok(Object.hasOwn(next.logical.responsibilities[0], '__proto__'), 'the document holds the field as its own');
    boundary.trackExtensions(prior, next, {type: 'tracking.mode', payload: {mode: 'mend', target: r.id}}, AT, {author: {kind: 'person', id: A, account: 'person'}});
    const now = next.logical.responsibilities[0];
    assert.ok(now.purpose.endsWith(' (mended by the tracker)'), 'the listed field is mended');
    assert.ok(Object.hasOwn(now, '__proto__') && JSON.stringify(Object.getOwnPropertyDescriptor(now, '__proto__')?.value) === '{"note":"kept as written"}' && Object.getPrototypeOf(now) === Object.prototype, 'and the field named __proto__ is put back as the record held it, as its own field: ' + JSON.stringify(Object.keys(now))); }
  pass('O2, R1, R2, T1, T2: trackPaths is checked at start (it needs track, is {chapter.collection: [field, …]}, each path a built-in record collection the lifecycle family keeps and the provenance reader reads (a chapter named after what every object carries is none), never the review\'s, the change journal\'s, the workbench\'s or the members\', never a collection a registered package states, never one whose records a chapter accepts, approves or marks reviewed, each with one or more content fields, each once, never a record\'s identity, revision or history or a field that says whether and how it stands); through the server the record a tracker mends in a path it states, answering nothing, is stamped as the commit\'s, a person\'s and an agent account\'s; a fabricated answer stamps nothing; a stamp the tracker writes itself is not kept; a confirmation it sets, every lifecycle and review field, an acceptance, governance, a recording, an approval, a snapshot and a history it writes while it mends, and every field it does not list, is put back from the boundary\'s copy, a person\'s commit and an agent account\'s alike, and a proposal stays one; a revision moves only forward by one with a mend of a field it lists; a call that adds or removes a record, or that moves the chapter\'s reading of a proposal through content, is refused, nothing is stored and the answer names the package; assertTrackerStaysInPaths refuses a tracker that changes a built-in collection it does not state, rewrites the journal, moves its counter without an event or changes prior, and inside its paths one that adds or removes a record, changes a field it does not list or moves a revision otherwise');
});

assert.deepEqual(failed, [], 'every rc44 S0 block passes');
console.log(`rc44 S0 design extensions: ${checks.length} checks passed`);
