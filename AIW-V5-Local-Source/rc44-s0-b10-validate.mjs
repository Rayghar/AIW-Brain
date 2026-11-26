// AIW rc44, build S0-w3-stamps, part A (the lead's ruling Y2 of 2026-11-22, the rest of B10; X4, X5 b): in a knowledge
// library (a project carrying the library mark) knowledge.history and knowledge.version are the family's log, not
// design. A library's design source reads the knowledge records themselves and not the log; its evidence reads the log.
// The knowledge package's steps write the family's log again, one line each that names the package, so one trail holds
// every step and the knowledge workspace's history panel draws it from the document alone (the join with the project
// activity is retired). Elsewhere a line a package's step writes, and the version it moves, says nothing to the design
// fingerprint, so a design project reads as it did: findings, stamps, fingerprint and SDD text byte-identical to the
// goldens captured on the start commit. A library stored under the start commit reads with the same findings; its
// design stamp moves once, at the first read under this build, and case B10.7 records exactly what moves.
//
// Goldens: `node rc44-s0-b10-validate.mjs --capture <sha>` prints, from the tree it runs in, the readings of the old
// documents below and the library as the start commit stores it; rc44-s0-b10-baseline.json was captured so from the
// unchanged start commit 4349bb6 (before any product file changed) and is never recaptured to absorb a change.
// Every fixture takes a fixed time (AT); the suite reads no clock. Synthetic fixtures only; no provider is called.
// Run: npm run test:rc44-s0-b10
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as F from './rc44-wp1-knowledge-fixtures.mjs';
import * as R from './rc44-s0-readings.mjs';
import * as K from './public/knowledge-governance.js';
import * as rv from './public/review-domain.js';

const AT = F.AT, LATER = '2026-11-17T09:00:00.000Z', clone = v => structuredClone(v), PACKAGE = 'p10-knowledge';
const BASELINE = 'rc44-s0-b10-baseline.json';
const sha = text => createHash('sha256').update(text).digest('hex');
const CONCEPT = {conceptId: 'SYN-P001', title: 'Transactional outbox', kind: 'pattern', family: 'Reliable publication', scope: ['data-owner', 'interaction'], stages: [5, 8], lenses: ['integrity', 'reliability'], steward: 'Integration guild', reviewDue: '2027-11-16', reviewTriggers: ['platform-contract'], notAdopted: [], forms: []};
const CONCEPT_REVIEW = {decision: 'verified', reviewer: 'Synthetic second person', reason: 'Checked the identity, each form and its membership.', reviewed: true, identityChecked: true, formsChecked: true, crosswalkChecked: true};
const LIBRARY_MARK = {enabled: true, reason: 'This project authors one tranche of the synthetic handbook.', reviewer: 'Synthetic steward', reviewed: true};
const STEP = {reviewer: 'Synthetic architect', reason: 'This design relies on the released concept.', reviewed: true};
const ROW = {conceptId: 'SYN-P001', scheme: 'external', label: 'Outbox (an external register)', relation: 'same', note: 'The register names it so.', aliasId: 'Outbox'};
const ROW_REVIEW = {decision: 'verified', reviewer: 'Synthetic second person', reason: 'Checked the alias against its passage.', reviewed: true, aliasChecked: true};
const NARRATIVE = {title: 'Northquay knowledge library — Solution Design', owner: 'Integration guild', audience: 'Architects', summary: 'One tranche of the synthetic handbook.', scope: 'The synthetic integration concepts.', approach: 'Concepts released through the library.', confirmed: true};

// ------------------------------------------------------------------------------------------------ fixtures
// A package command through its boundary (design-extension-boundary.js extensionHandler: who may take the step), in
// process, as wp1's suite sends one, and stamped as the server stamps a commit (worker.js: stampAuthorship, then
// stampExtensions for the package's records the commit changed).
async function packaged(doc, type, payload, actor, opts = F.person(actor), at = AT) {
  await import('./worker.js'); const {extensionHandler, stampExtensions} = await import('./design-extension-boundary.js'), {stampAuthorship} = await import('./public/provenance.js'), h = extensionHandler(type);
  assert(h, type + ' is a type of the design package');
  const command = {type, payload}, r = h(doc, command, at, actor, opts);
  stampAuthorship(doc, r.document, command, r, opts.author, at); stampExtensions(doc, r.document, opts.author, at);
  return r;
}
// A library as wp1 S1 to S3 write it, in process (knowledge-concept-commands.js applyConceptCommand as a person and the
// package's boundary): the mark, a source, SYN-P001 with its definition and applicability forms, a crosswalk row
// proposed and verified, the concept reviewed, released with conceptIds and activated, pinned and REQ-001 linked through
// the pin, and its narrative confirmed. Each step names its actor; the time is fixed.
export async function libraryDocument() {
  const CC = await import('./public/knowledge-concept-commands.js'); let p = F.blankProject();
  const k = (type, payload, actor = 'importer') => { const r = CC.applyConceptCommand(p, {type: 'knowledge.' + type, payload}, AT, actor, F.person(actor)); p = r.document; return r.selected; };
  const step = async (type, payload, actor) => { const r = await packaged(p, 'knowledge.' + type, payload, actor); p = r.document; return r.selected; };
  k('library', LIBRARY_MARK, 'steward');
  const sourceId = k('source', F.sourcePayload('SYN-P001 Transactional outbox', F.SYN_P001));
  const record = k('concept', CONCEPT), all = F.p001Forms(), claimIds = {};
  for (const t of ['definition', 'applicability']) claimIds[t] = k('claim', F.formClaim(sourceId, 'SYN-P001', all[t]));
  k('concept', {...CONCEPT, id: record, forms: ['definition', 'applicability'].map(t => ({type: t, claimId: claimIds[t]}))});
  for (const t of ['definition', 'applicability']) k('review', {...F.REVIEW, formChecked: true, id: claimIds[t]}, 'reviewer');
  const rowId = await step('crosswalk', {...ROW, evidenceClaimId: claimIds.definition}, 'architect');
  await step('crosswalk-review', {...ROW_REVIEW, id: rowId}, 'reviewer');
  k('concept-review', {...CONCEPT_REVIEW, id: record}, 'reviewer');
  const releaseId = k('release', {...F.REVIEW, title: 'Synthetic integration concepts 1', conceptIds: ['SYN-P001']}, 'releaser');
  k('activate', {...F.REVIEW, id: releaseId, stamp: K.knowledgeStamp(p)}, 'releaser');
  const pinId = await step('concept-pin', {conceptId: 'SYN-P001', releaseId, ...STEP}, 'architect');
  const linkId = await step('concept-link', {pinId, objectId: 'REQ-001', ...STEP}, 'architect');
  p = rv.applyFinalReviewCommand(p, {type: 'review.narrative', payload: NARRATIVE}, AT, 'architect').document;
  return {document: p, sourceId, record, claimIds, rowId, releaseId, pinId, linkId};
}
// The same library with its mark cleared by hand (as a recovery import leaves a library: a project that holds concepts
// and is no library): a design project to every reader of the mark.
export const unmarked = p => { const q = clone(p); q.knowledge.library = {...q.knowledge.library, enabled: false}; return q; };
// The old design documents: a blank project and the Bank Payment reference holding the knowledge records the commands
// that existed before rc44 write (a source, a structured claim, a plain claim, a four-eyes review, a release, its
// activation and a link; rc44-wp1-knowledge-fixtures.mjs legacyKnowledge).
export const designDocuments = () => ({'blank-with-knowledge': F.legacyKnowledge().document, 'bank-with-knowledge': F.legacyKnowledge(K.applyKnowledgeCommand, F.bankProject()).document});
// A reading's findings without their stamps (what a finding says, not the stamp it was taken at).
const unstamped = text => JSON.stringify(JSON.parse(text), (k, v) => (k === 'stamp' || k === 'legacyStamp' ? undefined : v));
const read = p => rv.withFinalReview(clone(p));

if (process.argv.includes('--capture')) {
  await import('./worker.js');
  const lib = await libraryDocument(), docs = designDocuments(), out = {capturedFrom: process.argv[process.argv.indexOf('--capture') + 1] || 'working tree', at: AT, design: {}, library: {}};
  for (const [name, p] of Object.entries(docs)) out.design[name] = R.digests(p);
  out.design['library-unmarked'] = R.digests(unmarked(lib.document));
  // The library as the start commit stores it, its readings, and what its findings say without their stamps.
  const L = R.readings(lib.document);
  out.library = {document: lib.document, digests: R.digests(lib.document), stamps: JSON.parse(L.stamps), findings: sha(unstamped(L.findings)), readiness: sha(unstamped(L.readiness)), narrativeCurrent: rv.narrativeCurrent(read(lib.document))};
  console.log(JSON.stringify(out));
  process.exit(0);
}

// ------------------------------------------------------------------------------------------------ the cases
const cases = [], add = (name, run) => cases.push({name, run});
const golden = () => { if (!existsSync(BASELINE)) throw Error(BASELINE + ' is missing: capture it from the start commit.'); return JSON.parse(readFileSync(BASELINE, 'utf8')); };
const stamp = d => { const q = rv.withFinalReview(clone(d), {upgrade: false}); return rv.reviewSourceStamp(q) + ' ' + rv.reviewDesignStamp(q); };
const evidence = d => rv.evidenceStamp(rv.withFinalReview(clone(d), {upgrade: false}));
const lines = d => d.knowledge?.history || [];

// ------------------------------------------------------------------------------------------------ B10.1 (Y2: a design project's reading does not change)
add('B10.1 (ruling Y2): a design project reads as on the start commit, with the package registered: the documents that hold the knowledge records of the commands before rc44, and a library whose mark is cleared, byte for byte in every reading (graph, model, trails, findings, stamps, readiness, provenance, registers, SDD, ARS); the built-in trails and chains with and without the knowledge records', async () => {
  await import('./worker.js'); const G = golden(), lib = await libraryDocument();
  const docs = {...designDocuments(), 'library-unmarked': unmarked(G.library.document)};
  for (const [name, p] of Object.entries(docs)) {
    const now = R.digests(p), was = G.design[name];
    assert.ok(was, name + ' has a golden');
    for (const key of Object.keys(was)) assert.equal(now[key], was[key], name + ': the reading “' + key + '” moved against the start commit');
  }
  // A design project made now with the same knowledge records as the golden's reads the same (the commands write as before).
  assert.equal(R.digests(F.legacyKnowledge().document).stamps, G.design['blank-with-knowledge'].stamps);
  const bare = F.blankProject(), held = F.legacyKnowledge().document;
  assert.ok(R.assertBuiltInTrailsUnchanged(bare, held) > 0); R.assertBuiltInChainsUnchanged(bare, held); R.assertFindingIdsUnique(held);
  // (the same library, with the package's steps written by this build's commands, cleared of its mark, still reads every
  // reading but the log's as the golden does: its trail, graph and findings say what the records say)
  const now = R.readings(unmarked(lib.document)), stored = R.readings(unmarked(G.library.document));
  for (const key of ['graph', 'model', 'trails', 'provenance']) assert.equal(now[key], stored[key], 'library-unmarked: ' + key);
});

// ------------------------------------------------------------------------------------------------ B10.2 (Y2: a library's design source)
add('B10.2 (ruling Y2): a library\'s design source reads the knowledge records and not the family\'s log: knowledge.history and knowledge.version leave its design (no design stamp moves when either changes), its evidence reads the log (the evidence stamp moves with a line); without the mark both are design, as before', async () => {
  await import('./worker.js'); const {document: p} = await libraryDocument(), [design, overlay] = rv.designOf(rv.reviewSource(rv.withFinalReview(clone(p), {upgrade: false})));
  assert.equal('history' in (design.knowledge || {}), false, 'the design source of a library holds no knowledge.history');
  assert.equal('version' in (design.knowledge || {}), false, 'the design source of a library holds no knowledge.version');
  for (const k of ['claims', 'releases', 'sources', 'crosswalk', 'conceptPins', 'conceptLinks']) assert.ok(k in design.knowledge, 'the design source of a library reads knowledge.' + k);
  assert.ok(overlay.some(v => v === p.knowledge.history || JSON.stringify(v) === JSON.stringify(p.knowledge.history)), 'the evidence overlay of a library reads the family\'s log');
  const line = q => { q.knowledge.history = [...q.knowledge.history, {at: LATER, actor: 'reviewer', type: 'knowledge.review', id: 'KC-0099', reason: 'A line.', reviewer: 'Synthetic'}]; q.knowledge.version++; return q; };
  assert.equal(stamp(line(clone(p))), stamp(p), 'a line in a library\'s log moves no design stamp');
  assert.notEqual(evidence(line(clone(p))), evidence(p), 'a line in a library\'s log moves its evidence stamp');
  { const q = clone(p); q.knowledge.version += 5; assert.equal(stamp(q), stamp(p), 'the version of a library\'s log moves no design stamp'); }
  // Without the mark the log is design, as it was on the start commit.
  const d = unmarked(p);
  assert.notEqual(stamp(line(clone(d))), stamp(d), 'without the mark a line of the log is design, as before');
  { const [dd] = rv.designOf(rv.reviewSource(rv.withFinalReview(clone(d), {upgrade: false}))); assert.ok('history' in dd.knowledge && 'version' in dd.knowledge, 'a design project\'s design source reads the log as before'); }
});

// ------------------------------------------------------------------------------------------------ B10.3 (Y2: built-in commands in a library)
add('B10.3 (ruling Y2): through the commands, a person\'s step of the built-in knowledge family in a library moves no design stamp through the log: a concept\'s review, a library mark restated, a form\'s review lapsing nothing else; each still writes its one line and moves the version', async () => {
  await import('./worker.js'); const CC = await import('./public/knowledge-concept-commands.js'), L = await libraryDocument();
  const send = (p, type, payload, actor) => CC.applyConceptCommand(p, {type: 'knowledge.' + type, payload}, LATER, actor, F.person(actor)).document;
  for (const [type, payload, actor] of [['concept-review', {...CONCEPT_REVIEW, id: L.record, reason: 'Reviewed again.'}, 'second-architect'], ['library', {...LIBRARY_MARK, reason: 'The tranche is the same; restated.'}, 'steward']]) {
    const before = L.document, after = send(before, type, payload, actor);
    assert.equal(lines(after).length, lines(before).length + 1, type + ' writes one line into the family\'s log'); assert.equal(after.knowledge.version, before.knowledge.version + 1, type + ' moves the version');
    assert.equal(stamp(after), stamp(before), type + ' moves no design stamp of the library (the log is not design there)');
    assert.notEqual(evidence(after), evidence(before), type + ' moves the library\'s evidence stamp (its log and its records are evidence)');
  }
});

// ------------------------------------------------------------------------------------------------ B10.4 (Y2: the package's steps write the log)
add('B10.4 (ruling Y2): the knowledge package\'s steps write the family\'s log again, one line each naming the package and who took the step, and move the version; in a library none of them moves the design stamp through its line, and a step that is no design change moves none at all', async () => {
  await import('./worker.js'); const L = await libraryDocument(), p = L.document;
  // The library the start commit wrote kept no line of the package's steps; this build's library keeps one for each.
  const G = golden(), mine = lines(p).filter(h => h.package === PACKAGE).map(h => [h.type, h.id, h.actor]);
  assert.equal(lines(G.library.document).filter(h => /crosswalk|concept-(pin|link)/.test(h.type)).length, 0, 'the start commit wrote no line for a package\'s step');
  assert.deepEqual(mine, [['knowledge.crosswalk', L.rowId, 'architect'], ['knowledge.crosswalk-review', L.rowId, 'reviewer'], ['knowledge.concept-pin', L.pinId, 'architect'], ['knowledge.concept-link', L.linkId, 'architect']], 'one line for each step of the package, naming it and who took it');
  assert.equal(p.knowledge.version, lines(p).length, 'every line moved the version by one');
  for (const h of lines(p).filter(h => h.package)) assert.deepEqual(Object.keys(h).sort(), ['actor', 'at', 'id', 'package', 'reason', 'reviewer', 'type'], h.type + ': the line of the family\'s log, with the package named');
  for (const h of lines(p).filter(h => !h.package)) assert.equal('package' in h, false, h.type + ': a built-in line names no package');
  // Each step of the package, sent now, in the library: one line, the version moved, the design stamp as its record says.
  const steps = [['knowledge.crosswalk-confirm', {reviewer: 'Synthetic steward', reason: 'Checked the row as it reads.', reviewed: true, id: L.rowId}, 'steward', false], ['knowledge.concept-migration', {pinId: L.pinId, toReleaseId: L.releaseId, reason: 'A proposal.'}, 'architect', null], ['knowledge.concept-unlink', {...STEP, id: L.linkId}, 'architect', true]];
  for (const [type, payload, actor, design] of steps) {
    const r = await (async () => { try { return await packaged(p, type, payload, actor, F.person(actor), LATER); } catch (e) { return {error: e.message}; } })();
    if (r.error) { assert.equal(design, null, type + ' was refused: ' + r.error); continue; }
    const d = r.document, h = lines(d).at(-1);
    assert.equal(lines(d).length, lines(p).length + 1, type + ' writes one line'); assert.deepEqual([h.type, h.package, h.actor, h.at], [type, PACKAGE, actor, LATER]); assert.equal(d.knowledge.version, p.knowledge.version + 1);
    const back = clone(d); back.knowledge.history = clone(p.knowledge.history); back.knowledge.version = p.knowledge.version;
    assert.equal(stamp(d), stamp(back), type + ': its line and version move no design stamp of the library');
    if (design === false) assert.equal(stamp(d), stamp(p), type + ' is a person\'s step and no design change: it moves no design stamp');
    if (design === true) assert.notEqual(stamp(d), stamp(p), type + ' changes what the link says: a design change');
  }
});

// ------------------------------------------------------------------------------------------------ B10.5 (Y2, X4: one trail, drawn from the document)
add('B10.5 (rulings Y2 and X4): the knowledge workspace\'s history panel draws the one trail from the family\'s log alone: the package\'s steps with who took them, the family\'s own lines as before; the join with the project activity is retired (no second argument is read, no activity is fetched)', async () => {
  await import('./worker.js'); const KW = await import('./public/knowledge-workspace-ui.js'), L = await libraryDocument(), doc = L.document;
  const panel = html => html.slice(html.indexOf('Recorded knowledge history'));
  const drawn = panel(KW.renderKnowledgeReleases(doc));
  assert.match(drawn, new RegExp('^Recorded knowledge history · ' + lines(doc).length + '<'), 'the panel counts the log, which holds every step');
  for (const [type, id] of [['crosswalk', L.rowId], ['crosswalk-review', L.rowId], ['concept-pin', L.pinId], ['concept-link', L.linkId]]) assert.match(drawn, new RegExp(' · ' + type + ' · ' + id + ' · (architect|reviewer)<'), type + ' is in the trail, with who took it');
  for (const h of lines(doc).filter(h => !h.package)) { assert.ok(drawn.includes(' · ' + h.type.replace('knowledge.', '') + ' · ' + h.id + '<br>'), h.type + ' of the family is drawn as before (no actor)'); }
  // An activity handed to the panel is not read: the trail is the log.
  const fake = [{command: 'knowledge.concept-pin', objectId: 'KU-0999', at: LATER, actor: 'someone', reason: 'Not in the log.'}];
  assert.equal(KW.renderKnowledgeReleases(doc, fake), KW.renderKnowledgeReleases(doc), 'the panel reads no activity');
  const source = readFileSync('public/knowledge-workspace-ui.js', 'utf8');
  assert.ok(!source.includes('/api/activity') && !/function stepsOf\b/.test(source), 'the knowledge workspace fetches no project activity for its history panel');
});

// ------------------------------------------------------------------------------------------------ B10.6 (Y2: a design project's line says nothing)
add('B10.6 (ruling Y2): in a design project (no library mark) a line a package\'s step writes, and the version it moves, say nothing to the design fingerprint: a proposal and a person\'s confirmation of it move no design stamp and no evidence stamp; the design source reads the log less those lines as before', async () => {
  await import('./worker.js'); const L = await libraryDocument(), d = unmarked(L.document);
  const m = await packaged(d, 'knowledge.concept-migration', {pinId: L.pinId, toReleaseId: L.releaseId, reason: 'A proposal.'}, 'architect', F.person('architect'), LATER).catch(e => ({error: e.message}));
  // A migration to the version the pin already holds is refused ("nothing to migrate"); the case then reads the line by hand.
  const after = m.error ? (() => { const q = clone(d); q.knowledge.history.push({at: LATER, actor: 'architect', type: 'knowledge.concept-migration', id: 'KM-0001', reason: 'A proposal.', reviewer: '', package: PACKAGE}); q.knowledge.version++; return q; })() : m.document;
  assert.equal(lines(after).at(-1).package, PACKAGE);
  assert.equal(stamp(after), stamp(d), 'a package\'s line in a design project moves no design stamp');
  assert.equal(evidence(after), evidence(d), 'nor the evidence stamp: it is bookkeeping there');
  const [dd] = rv.designOf(rv.reviewSource(rv.withFinalReview(clone(after), {upgrade: false})));
  assert.deepEqual(dd.knowledge.history, d.knowledge.history.filter(h => !h.package), 'the design source reads the family\'s own lines');
  assert.equal(dd.knowledge.version, d.knowledge.version - d.knowledge.history.filter(h => h.package).length, 'and the version they moved');
  // A built-in line in a design project is design, as before.
  const own = clone(d); own.knowledge.history.push({at: LATER, actor: 'architect', type: 'knowledge.link', id: 'KL-0099', reason: 'A line.', reviewer: ''}); own.knowledge.version++;
  assert.notEqual(stamp(own), stamp(d), 'a built-in line in a design project moves the design stamp, as before');
});

// ------------------------------------------------------------------------------------------------ B10.7 (Y2: a library stored under the start commit)
add('B10.7 (ruling Y2): a library stored under the start commit reads with the same findings; its design stamp moves once, at the first read under this build, and this case records exactly what moves (for the merge evidence)', async () => {
  await import('./worker.js'); const G = golden(), stored = G.library.document;
  // The first read under this build (the server's read: withFinalReview with the readings upgrade, as worker.js reads a row).
  const first = read(stored), now = R.readings(first), digests = R.digests(first), moved = Object.keys(G.library.digests).filter(k => digests[k] !== G.library.digests[k]).sort();
  assert.deepEqual(first.finalReview.libraryLogUpgrade, {design: {[JSON.parse(now.stamps).design]: G.library.stamps.design}}, 'the upgrade keeps the stamp it read, and says it is done');
  assert.equal(sha(unstamped(now.findings)), G.library.findings, 'the same findings, what each says (its stamp aside)');
  assert.equal(sha(unstamped(now.readiness)), G.library.readiness, 'the same readiness');
  const stamps = JSON.parse(now.stamps);
  assert.notEqual(stamps.design, G.library.stamps.design, 'the design stamp moves: the log leaves the library\'s design');
  assert.notEqual(stamps.evidence, G.library.stamps.evidence, 'the evidence stamp moves: the log joins the evidence');
  // What moves, exactly: the stamps, the findings' stamps that are taken of the whole design, and what prints them.
  assert.deepEqual(moved, ['findings', 'stamps'], 'what moves at the first read: ' + JSON.stringify(moved));
  assert.equal(rv.narrativeCurrent(first), G.library.narrativeCurrent, 'the confirmed narrative reads as it did');
  // Once: the document as the first read leaves it (the next save stores it) reads the same at every later read.
  const again = read(JSON.parse(JSON.stringify(first)));
  assert.deepEqual(R.digests(again), digests, 'the stamps move once, not at each read'); assert.equal(again.finalReview.narrative.sourceStamp, first.finalReview.narrative.sourceStamp);
  assert.notEqual(first.finalReview.narrative.sourceStamp, stored.finalReview.narrative.sourceStamp, 'the narrative\'s stamp is carried over to the stamp the design has now');
  console.log('    B10.7 moves at the first read: design ' + G.library.stamps.design + ' -> ' + stamps.design + ', design version ' + G.library.stamps.designVersion + ' -> ' + stamps.designVersion + ', evidence ' + G.library.stamps.evidence + ' -> ' + stamps.evidence + '; readings moved: ' + moved.join(', '));
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
console.log(JSON.stringify({suite: 'rc44-s0-b10', passed: passed.length, failed: failed.length, failures: failed}));
if (failed.length) process.exit(1);
console.log('PASS rc44 S0-B10: ' + passed.length + ' cases. Synthetic fixtures only; the suite reads no clock.');
