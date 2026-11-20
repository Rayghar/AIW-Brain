// AIW rc44, wp2 slice S1: the adoption record, its readers and the upgrade (audit/rc44/design/wp2-adoption.md §g S1,
// §e.3; the lead's rulings of 2026-11-18 and 2026-11-19, sections A, D, F and J; the registration contract in
// audit/rc44/build-notes/s0-extensions.md). The blocks, in the order they run:
//   registration    the package conforms; three steps, each a signed-in person's; the two held back (ruling J6);
//   old documents   the three references and the document with a review list read byte for byte as at the base, with
//                   the package registered and no adoption in them; so do documents with tasks never applied;
//   upgrade         the Bank Payment reference with three applied tasks yields three adoptions with the tasks'
//                   obligations by id, as design e.3 says, once; a lost pointer is put right;
//   e3 rules        1 to 3 and 5: no guarantee and no finding appears, no stamp moves, no verification is lost, a
//                   frozen source is not upgraded; architectureObligationsFor answers the same rows;
//   trace           the adoption on the layer `mechanism`, linkedVia 'binds', the built-in layers as they were;
//   storage upgrade e.3 rule 4 and ruling J8: stored by the first read with a recovery point; a command that arrives
//                   first is answered with a reload;
//   accept          a second signed-in person: refused for the applier, an agent account, a draft by Sol and no
//                   actor; an upgraded adoption no person has stood behind needs a person's confirmation first
//                   (ruling F4); refused while the earlier path's finding for the same design stands (ruling J6);
//   deviation       the projection (a save left in, a save left out: ruling D7.1); the acceptance lapses;
//   template copy   the step is kept under `review`, which a copy from a template clears (ruling F3);
//   tracker         retiring a bound store raises adoption-role-broken in the same commit — the case that fails
//                   today: "retire the store an applied outbox design placed its commit obligation on; a finding
//                   names the applied mechanism";
//   held back       adoption.withdraw is no command of this build; a reversed design takes its adoption with it;
//   J1 to J6, J9    the cases of the fix-up, one block for each ruling; size.
import assert from 'node:assert/strict';
import {readFileSync, existsSync, writeFileSync, mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import worker, {commandHandler, commandShape} from '../worker.js';
import * as R from '../rc44-s0-readings.mjs';
import {bankPaymentApplied, beforeAdoptions, server, A, B, C, AGENT, APPLIED_AT, governedConcernApplied, knowledgeCommand, otherKindApplied} from '../rc44-wp2-fixtures.mjs';
import {readStoredProject, saveStoredProject} from '../project-storage.js';
import {storageUpgradeNeeded} from '../storage-upgrade.js';
import {withFinalReview, CHAPTERS, inheritedFindings, reviewSourceStamp, reviewDesignStamp, evidenceStamp, traceStamp, reviewSource, reviewRequirements} from '../public/review-domain.js';
import {architectureObligationsFor, architectureObligationBasis, architectureEvidenceSources, verifierRefusal} from '../public/architecture-obligations.js';
import {linkedAction, verificationPayload, reviewCommand, obligationAt} from '../architecture-obligation-fixtures.mjs';
import {applyEvidenceCommand} from '../public/evidence-domain.js';
import {recordGraph, OBJECT_TYPES} from '../public/record-graph.js';
import {requirementTrace, requirementSpine, linkedVia, TRACE_LAYERS, BUILT_IN_LAYERS} from '../public/trace-kernel.js';
import {COLLECTIONS} from '../public/record-lifecycle.js';
import {eachRecord, RECORD_NOUNS} from '../public/provenance.js';
import {EXTENSIONS} from '../public/design-extensions.js';
import {extensionIssues, extensionConflicts, upgradeExtensions, extensionUpgradeNeeded, builtInType} from '../design-extension-boundary.js';
import {isReviewCommand} from '../authorship.js';
import {instantiateTemplate} from '../project-lifecycle.js';
import {architectureSourceStamp} from '../public/architecture-design.js';
import {previewReversal} from '../public/model-reversal.js';
import {previewWorkingChange, previewScenarioAlternative, rebaseWorkingAlternative} from '../public/workbench-domain.js';

const {REFERENCES, reference, readings, digests, reviewListDocument, assertBuiltInTrailsUnchanged, assertFindingIdsUnique, assertTemplateCopyClearsSteps, opensWithRecords} = R;
const list = v => (Array.isArray(v) ? v : []);
const AT = '2026-10-05T10:00:00.000Z', LATER = '2026-10-06T10:00:00.000Z';
const PACKAGE = 'p40-adoption', BASE = JSON.parse(readFileSync(new URL('../rc44-wp2-adoption-baseline.json', import.meta.url), 'utf8'));
const EVIDENCE = 'audit/rc44/evidence/wp2-s1-size.json';
const records = p => list(p?.adoptions?.records), byId = (p, id) => records(p).find(a => a.id === id);
const chapter5 = p => CHAPTERS.find(c => c.id === 5).checks(p), own = fs => fs.filter(f => String(f.code || '').startsWith('adoption-'));
const person = id => ({kind: 'person', id, account: 'person'});

export default async function ({block, pass, load}) {
  const at = name => new URL('../public/' + name + '.js', import.meta.url).href;
  const D = await load(at('adoption-domain')), U = await load(at('adoption-upgrade')), BI = await load(at('adoption-builtins')), DEF = await load(at('adoption-definitions'));
  const pkg = () => { const e = EXTENSIONS.find(x => x.id === PACKAGE); assert.ok(e, 'the package ' + PACKAGE + ' is registered by the server (design-packages.js)'); return e; };
  // The readings upgrade runs wherever a document is read on the server (withFinalReview), the package's step with it:
  // a document is read as it was written with {upgrade: false}, and upgraded here by the step itself.
  const asWritten = d => withFinalReview(d, {upgrade: false});
  const upgraded = () => { pkg(); return asWritten(U.upgradeAdoptions(bankPaymentApplied())); };

  // ------------------------------------------------------------ registration
  await block('registration', async () => {
    const e = pkg();
    assert.deepEqual([...extensionIssues(e), ...extensionConflicts()], [], 'the package conforms to the registration contract');
    for (const type of ['adoption.reassess', 'adoption.accept', 'adoption.deviation']) { assert.ok(e.commands?.[type], type + ' is stated'); assert.equal(builtInType(type), false, type + ' is no built-in type'); assert.equal(isReviewCommand(type), true, type + ' is a signed-in person\'s step: an agent account and a draft by Sol are refused before the project is read'); assert.equal(typeof commandHandler(type), 'function'); }
    assert.equal(typeof e.commands['adoption.accept'].second, 'function', 'adoption.accept is a second person\'s step (rulings D1, D7.1)');
    for (const type of ['adoption.reassess', 'adoption.deviation']) assert.equal(e.commands[type].person, true);
    // ruling J6: no second truth while the earlier path stands — the two steps whose readers have not moved are held back
    assert.deepEqual(Object.keys(e.commands).sort(), ['adoption.accept', 'adoption.deviation', 'adoption.reassess'], 'adoption.obligation and adoption.withdraw are held back to the slices that move their readers (S2, S3)');
    for (const type of ['adoption.obligation', 'adoption.withdraw']) { assert.equal(builtInType(type), false, type + ' stays free for the package'); assert.deepEqual(commandShape({type, payload: {id: 'ADP-001', revision: 1, reason: 'x'}}), {error: 'Unknown project action.', code: 'unknown_command'}, type + ' is no command of this build'); }
    assert.ok(!Object.values(e.commands).some(c => c.staged), 'no step of this slice is a plain design edit a reviewed batch may carry');
    assert.deepEqual(e.layers, {mechanism: 'pattern'}); assert.ok(e.hops.length && e.hops.every(h => h.layer === 'mechanism' && typeof h.only === 'function' && typeof h.ctx === 'boolean'), 'each hop states `only` (ruling D6.3): the layer holds a built-in type');
    assert.deepEqual(e.provenance.paths, {adoption: ['adoptions.records']}); assert.deepEqual(e.provenance.records, {'adoptions.records': 3}, 'an adoption is counted under the chapter of its object type (ruling J12)'); assert.equal(OBJECT_TYPES.pattern.chapter, 3); assert.deepEqual(e.prefixes, {pattern: 'ADP'}, 'the package states the id prefix it mints for the built-in type (ruling J10)'); assert.equal(RECORD_NOUNS['adoptions.records'], 'applied mechanism');
    assert.ok(!e.lifecycle, 'an adoption leaves through its own withdraw, not through the lifecycle family'); assert.ok(!COLLECTIONS.some(([path]) => path === 'adoptions.records'));
    assert.ok(!e.evidenceKeys, 'no key of the package is left out of the design'); assert.ok(!('adoptions' in reviewSource(reference('bank-payment'))), 'a document without adoptions keeps no key in its design source'); assert.equal(typeof e.upgrade, 'function'); assert.equal(typeof e.upgradeNote, 'string'); assert.equal(typeof e.track, 'function'); assert.equal(typeof e.checks?.[5], 'function');
    assert.ok(!e.objectTypes, 'the built-in type `pattern` is used; the package states no type of its own');
    assert.ok(TRACE_LAYERS.includes('mechanism') && !BUILT_IN_LAYERS.includes('mechanism') && TRACE_LAYERS.indexOf('mechanism') >= BUILT_IN_LAYERS.length, 'the layer follows the built-in ones');
    // (ruling J4; was: no module of the package names a knowledge store in its source. A reading that never asks reports released knowledge as
    // current unread, so the proof is behaviour: block "J4 knowledge" holds that a candidate claim moves no adoption reading and a deactivated
    // release does. What stays of the scan: the package reads released knowledge through the one existing rule and no other reader.)
    for (const f of ['adoption-domain', 'adoption-upgrade', 'adoption-builtins', 'adoption-definitions', 'adoption-package']) { const src = readFileSync(new URL('../public/' + f + '.js', import.meta.url), 'utf8'); assert.ok(!/domain-knowledge|knowledge-structures|knowledge-concepts|releasedClaims|p\.knowledge\b/.test(src), f + '.js reads no knowledge store of its own'); }
    assert.match(readFileSync(new URL('../public/adoption-domain.js', import.meta.url), 'utf8'), /import \{claimReceiptCurrent,withdrawn,BRAIN_PLAYBOOK\} from '\.\/knowledge-governance\.js';/, 'released knowledge a receipt pins is read with the existing rule');
    // ruling J12: the upgrade and what only it reads are the server's
    assert.equal(typeof e.upgrade, 'function'); for (const f of ['adoption-package', 'adoption-domain']) assert.ok(!/from '\.\/adoption-(?:upgrade|builtins|definitions)\.js'/.test(readFileSync(new URL('../public/' + f + '.js', import.meta.url), 'utf8')), f + '.js, which the browser\'s lazy entry holds, imports neither the upgrade nor its skeletons');
    pass('registration: p40-adoption conforms to the contract; its three steps are a signed-in person\'s, adoption.accept a second person\'s (adoption.obligation and adoption.withdraw are held back: ruling J6); the layer mechanism of the built-in type pattern with hops that state `only`; the minted prefix ADP; records read by provenance under Chapter 3, not retired by the lifecycle family; the upgrade is the server\'s');
  });

  // ------------------------------------------------------------ old documents
  await block('old documents', async () => {
    pkg();
    for (const t of REFERENCES) { const p = reference(t); assert.deepEqual(digests(p), BASE.readings[t], t + ' reads as at the base ' + BASE.capturedFrom); assert.ok(!('adoptions' in p) && !p.workspace?.packages, t + ' gains no key'); assert.equal(U.needsAdoptionUpgrade(p), false); assert.equal(U.upgradeAdoptions(p), p, 'the upgrade step answers the document itself'); assert.equal(extensionUpgradeNeeded(p), false); assert.deepEqual(D.adoptionFindings(p), []); }
    const listed = reviewListDocument(); assert.deepEqual(digests(listed), BASE.reviewList.readings, 'the document with a review list reads as at the base');
    // a document with design tasks that were never applied gains nothing either
    const open = bankPaymentApplied(); for (const t of open.coauthoring.designTasks) { t.status = 'proposed'; delete t.applied; }
    assert.equal(U.needsAdoptionUpgrade(open), false); assert.equal(U.upgradeAdoptions(open), open);
    // should-fix 6: documents whose design tasks are in flight, proposed, set aside or applied and then reversed. Each reads, with the package
    // registered, byte for byte as a process without the server's package list reads it (the ten readings), and gains no key.
    { const variants = {'in flight': t => { t.status = 'questions'; delete t.applied; }, proposed: t => { t.status = 'proposed'; delete t.applied; }, 'set aside': t => { t.status = 'dismissed'; delete t.applied; }, reversed: t => { t.status = 'dismissed'; t.reverted = {at: APPLIED_AT, reviewer: 'Synthetic architect', reason: 'Reversed.'}; }};
      const docs = Object.values(variants).map(edit => { const d = JSON.parse(JSON.stringify(bankPaymentApplied())); d.coauthoring.designTasks.forEach(edit); return d; });
      mkdirSync('.aiw-local/rc44-wp2', {recursive: true}); writeFileSync('.aiw-local/rc44-wp2/tasks-not-applied.json', JSON.stringify(docs));
      const r = spawnSync(process.execPath, ['--input-type=module', '-e', 'import {readFileSync} from "node:fs"; import {EXTENSIONS} from "./public/design-extensions.js"; import * as R from "./rc44-s0-readings.mjs"; import {withFinalReview} from "./public/review-domain.js"; console.log(JSON.stringify({registered: EXTENSIONS.length, digests: JSON.parse(readFileSync(".aiw-local/rc44-wp2/tasks-not-applied.json", "utf8")).map(d => R.digests(withFinalReview(d)))}));'], {encoding: 'utf8', maxBuffer: 1 << 26});
      assert.equal(r.status, 0, r.stderr.slice(0, 300)); const bare = JSON.parse(r.stdout.trim().split('\n').at(-1)); assert.equal(bare.registered, 0, 'the comparison is read with no package registered');
      for (const [i, name] of Object.keys(variants).entries()) { const p = withFinalReview(structuredClone(docs[i])); assert.deepEqual(digests(p), bare.digests[i], 'a document with its design tasks ' + name + ' reads as it does without the package'); assert.ok(!('adoptions' in p) && !p.workspace?.packages && p.coauthoring.designTasks.every(t => !t.adoptionId), name + ': no key is created'); assert.equal(U.upgradeAdoptions(p), p); assert.deepEqual(D.adoptionFindings(p), []); } }
    pass('old documents: the three references and the document with a review list read byte for byte as at ' + BASE.capturedFrom + ' with the package registered (graph, model, trails, findings, stamps, readiness, provenance, registers, SDD, ARS); no key is created; a task that was never applied is left alone; documents with tasks in flight, proposed, set aside or reversed read as a process without the package reads them');
  });

  // ------------------------------------------------------------ the upgrade (design e.3)
  await block('upgrade', async () => {
    pkg();
    const before = bankPaymentApplied(), text = JSON.stringify(before), tasks = before.coauthoring.designTasks;
    assert.deepEqual(tasks.map(t => [t.topic, t.status]), [['delivery', 'applied'], ['resilience', 'applied'], ['persistence', 'applied']]); assert.ok(!('adoptions' in before));
    assert.equal(U.needsAdoptionUpgrade(before), true); assert.equal(extensionUpgradeNeeded(before), true);
    const after = U.upgradeAdoptions(before);
    assert.notEqual(after, before); assert.equal(JSON.stringify(before), text, 'the document handed in is left as it was');
    assert.equal(JSON.stringify(U.upgradeAdoptions(bankPaymentApplied())), JSON.stringify(after), 'the step is deterministic'); assert.equal(U.upgradeAdoptions(after), after, 'and idempotent: the upgraded document needs none'); assert.equal(U.needsAdoptionUpgrade(after), false);
    assert.deepEqual({schemaVersion: after.adoptions.schemaVersion, definition: after.adoptions.definition, counter: after.adoptions.counter}, {schemaVersion: 1, definition: 1, counter: 3});
    assert.deepEqual(records(after).map(a => a.id), ['ADP-001', 'ADP-002', 'ADP-003']);
    // what the upgrade writes: the adoptions and each task's adoptionId, and nothing else
    const strip = d => { const x = JSON.parse(JSON.stringify(d)); delete x.adoptions; for (const t of x.coauthoring.designTasks) delete t.adoptionId; return x; };
    assert.deepEqual(strip(after), strip(before), 'every other key of the document is as it was'); assert.deepEqual(after.coauthoring.designTasks.map(t => t.adoptionId), ['ADP-001', 'ADP-002', 'ADP-003']);
    for (const [i, a] of records(after).entries()) {
      const t = tasks[i], s = t.applied.reasoningGraph.solution;
      assert.deepEqual([a.origin, a.status, a.revision, a.kind], ['upgrade', 'applied', 1, 'pattern']); assert.equal(a.ref, a.id); assert.equal(a.title, t.title); assert.ok(!a.review && !('acceptance' in a), 'no acceptance');
      assert.deepEqual(a.scope, {requirementId: t.requirementId, driverId: t.driverId, contextIds: list(t.basis?.contextIds)});
      assert.deepEqual(a.legacy, {taskId: t.id, solutionId: s.id, alternativeId: t.applied.alternativeId, methodReceipt: t.applied.methodReceipt, governedKnowledge: t.governedKnowledge ?? null, answers: t.answers}, 'legacy holds the task\'s identities, receipt and answers verbatim');
      assert.deepEqual(a.obligations, s.obligations, 'the obligations verbatim, with their ids'); assert.ok(a.obligations.every(o => o.id.startsWith(t.id + ':')));
      assert.deepEqual(a.bindings.map(b => [b.roleId, b.recordId, b.recordType, b.id]), s.placement.map(x => [x.role, x.componentId, 'component', a.id + ':' + x.role]), 'bindings from the solution\'s placement');
      for (const b of a.bindings) { assert.equal(b.mode, t.applied.records.find(r => r.id === b.recordId)?.isNew ? 'created' : 'reused'); assert.equal(b.by, t.applied.reviewer); assert.equal(b.identity, 'typed-name'); }
      assert.deepEqual(Object.keys(a.facts), Object.keys(t.applied.designAnswers).filter(k => t.applied.designAnswers[k] !== '' && t.applied.designAnswers[k] != null));
      for (const [k, f] of Object.entries(a.facts)) assert.deepEqual(f, {value: t.applied.designAnswers[k], status: 'declared', by: t.applied.reviewer, identity: 'typed-name', at: t.applied.at}, 'a fact is the typed reviewer\'s declaration: ' + k);
      const params = s.specifications.flatMap(x => Object.entries(x.parameters || {}).map(([name, value]) => [x.componentId, name, value]));
      assert.deepEqual(a.parameters.map(x => [x.appliesTo, x.name, x.value, x.unit, x.migrated, x.basis]), params.map(x => [...x, '', true, 'stated']), 'parameters from the specifications, unit not stated, marked migrated');
      assert.equal(a.decisionId, t.applied.decisionId); assert.deepEqual(a.deviations, []); assert.ok(!('bounds' in a), 'no bounds are invented');
      assert.deepEqual(a.applied, {at: t.applied.at, reviewer: t.applied.reviewer, reason: t.applied.reason, changeIds: t.applied.changeIds, records: t.applied.records, reviewAuthority: t.applied.reviewAuthority}, 'applied verbatim: a typed reviewer name, no signed-in actor');
      assert.deepEqual([a.definition.definitionId, a.definition.optionId, a.definition.groupId, a.definition.authority, a.definition.version], [t.methodReceipt.methodId, s.optionId, t.topic, 'built-in', t.methodReceipt.sources.version]);
      assert.deepEqual(a.definition.receipt, t.applied.methodReceipt); assert.deepEqual(DEF.definitionIssues(a.definition.snapshot), [], 'the snapshot is a well-formed definition'); assert.match(a.definition.snapshotHash, /^[0-9a-f]{8,}/);
      assert.deepEqual(a.definition.snapshot.roles.map(r => r.id), s.placement.map(x => x.role)); assert.deepEqual(a.definition.snapshot.obligations.map(o => t.id + ':' + o.id), s.obligations.map(o => o.id));
      assert.ok(!a.provenance, 'a record an upgrade writes carries no author stamp'); assert.deepEqual(a.history.map(h => [h.event, h.actor, h.revision]), [['upgrade', null, 1]]);
    }
    // the built-in the receipt identifies
    assert.deepEqual(BI.builtinFromReceipt(tasks[0].methodReceipt), {...BI.BUILTIN_DEFINITIONS['composition-delivery-1'], interpretationCurrent: true}); assert.equal(BI.builtinFromReceipt({methodId: 'no-such-method'}), null);
    assert.equal(BI.builtinFromReceipt({...tasks[0].methodReceipt, sources: {...tasks[0].methodReceipt.sources, evaluationRevision: 1}}).interpretationCurrent, false);
    for (const d of Object.values(BI.BUILTIN_DEFINITIONS)) assert.deepEqual(DEF.definitionIssues(d), [], d.definitionId + ' is a well-formed skeleton');
    assert.ok(DEF.definitionIssues({definitionId: 'x', roles: [{id: 'a'}, {id: 'a'}]}).length > 0); assert.ok(DEF.definitionIssues(null).length > 0);
    // a receipt that names a method this build does not author (and no released concern): the adoption is upgraded under the id its receipt carries,
    // is not called a built-in, and its definition is never read as current
    { const odd = bankPaymentApplied(), t = odd.coauthoring.designTasks[0]; for (const holder of [t, t.applied]) holder.methodReceipt = {...holder.methodReceipt, methodId: 'retired-method-9'};
      const u = asWritten(U.upgradeAdoptions(odd)), x = byId(u, 'ADP-001');
      assert.deepEqual([x.definition.definitionId, x.definition.authority, x.kind, x.definition.snapshot.kind], ['retired-method-9', 'unrecognised', 'method', 'method'], 'a method this build cannot identify is not given the authority of a built-in');
      assert.equal(BI.receiptDefinition({methodId: 'retired-method-9'}).authority, 'unrecognised'); assert.equal(BI.receiptDefinition(null), null); assert.equal(BI.builtinFromReceipt({methodId: 'retired-method-9'}), null);
      assert.deepEqual(D.adoptionReading(u, x).definition, {state: 'not-evaluated', reasons: ['This build does not author the method “retired-method-9”: its interpretation was not evaluated.']}, 'and is not read as current (it was, before this case: the receipt\'s source revisions still matched)'); assert.deepEqual(own(chapter5(u)), [], 'an old document gains no finding for it'); assert.deepEqual(DEF.definitionIssues(x.definition.snapshot), []); }
    // a task of another kind (boundary, exchange, security, operation): roles from the applied records' slots, no obligations
    const other = bankPaymentApplied(); other.coauthoring.designTasks = [{id: 'DES-009', kind: 'exchange', title: 'Exchange instruction status', status: 'applied', requirementId: 'REQ-001', answers: {}, basis: {contextIds: []}, history: [], applied: {at: APPLIED_AT, alternativeId: 'ALT-009', reviewer: 'Synthetic architect', reason: 'Fixture.', changeIds: [], records: [{id: 'api-pod', ref: 'OBJ-001', title: 'Payment service', chapter: 5, slot: 'provider', isNew: false}, {id: 'if-001', ref: 'IF-001', title: 'A contract', chapter: 8, slot: 'contract', isNew: true}]}}];
    const o = records(U.upgradeAdoptions(other))[0];
    // (should-fix 8: a bound record's type is the record graph's; 'if-001' is an id this document does not hold, so it keeps the type of its
    // chapter. The assertion is the one it was, with the type added; block "J2 connected model" holds the types the graph gives.)
    assert.deepEqual([o.kind, o.origin, o.status, o.obligations.length, o.definition.authority, o.definition.definitionId], ['method', 'upgrade', 'applied', 0, 'built-in', 'exchange-contract-1']); assert.deepEqual(o.bindings.map(b => [b.roleId, b.recordId, b.mode, b.recordType]), [['provider', 'api-pod', 'reused', 'component'], ['contract', 'if-001', 'created', 'contract']]);
    // should-fix 10: a task whose pointer names no adoption of its own is linked again or upgraded again, never left on no trail
    { const up = U.upgradeAdoptions(bankPaymentApplied()), lost = structuredClone(up); delete lost.coauthoring.designTasks[1].adoptionId;
      assert.equal(U.needsAdoptionUpgrade(lost), true, 'a task that lost its pointer is due'); const again = U.upgradeAdoptions(lost);
      assert.deepEqual(again.coauthoring.designTasks.map(t => t.adoptionId), ['ADP-001', 'ADP-002', 'ADP-003'], 'it is linked again to the adoption written from it'); assert.equal(records(again).length, 3); assert.equal(JSON.stringify(again.adoptions), JSON.stringify(up.adoptions));
      const gone = structuredClone(up); gone.adoptions.records = gone.adoptions.records.filter(a => a.id !== 'ADP-002'); assert.equal(U.needsAdoptionUpgrade(gone), true, 'a task whose adoption is gone is due');
      const made = U.upgradeAdoptions(gone); assert.deepEqual(made.coauthoring.designTasks.map(t => t.adoptionId), ['ADP-001', 'ADP-004', 'ADP-003'], 'it is upgraded again, under an id never used before'); assert.equal(byId(made, 'ADP-004').legacy.taskId, 'DES-002');
      const wrong = structuredClone(up); wrong.coauthoring.designTasks[0].adoptionId = 'ADP-003'; const fixed = U.upgradeAdoptions(wrong); assert.deepEqual(fixed.coauthoring.designTasks.map(t => t.adoptionId), ['ADP-001', 'ADP-002', 'ADP-003'], 'a pointer at another task\'s adoption is put right');
      const G = recordGraph(asWritten(again)); assert.ok(G.objects.has('ADP-002') && !G.objects.has('DES-002'), 'so the mechanism is on the graph once'); }
    pass('upgrade: the Bank Payment reference with three applied tasks (delivery, resilience, persistence) yields ADP-001 to ADP-003 with the tasks\' obligations by id, bindings from the placement, facts as the typed reviewer\'s declarations, parameters with no unit and marked migrated, the receipt and the legacy identities verbatim, no acceptance, no bounds, no author stamp; it writes the adoptions and each task\'s adoptionId and nothing else, once; a task of another kind gives roles from its applied records and no obligations');
  });

  // ------------------------------------------------------------ e.3 rules 1 to 3 and 5, the rows, what the upgrade moves
  await block('e3 rules', async () => {
    pkg();
    // a verified action and a confirmed narrative before the upgrade
    let before = bankPaymentApplied();
    before = applyEvidenceCommand(before, {type: 'evidence.source', payload: {title: 'Synthetic observed exercise', location: 'fixture://observations/protected-call', excerpt: 'Fixture: the caller kept its deadline while the dependency was interrupted.', status: 'Confirmed', confirmedBy: 'Synthetic evidence reviewer', reviewed: true}}, obligationAt, 'synthetic-reviewer').document;
    const evidence = architectureEvidenceSources(before, [{sourceId: before.coauthoring.sources.at(-1).id, revision: 1}]);
    const duty = architectureObligationsFor(before).find(o => o.id === 'DES-002:dependency-deadline'); assert.ok(duty);
    before = reviewCommand(before, 'action', linkedAction(before, duty)); const actionId = before.finalReview.actions.at(-1).id;
    before = reviewCommand(before, 'delivery', verificationPayload(before, actionId, evidence));
    const ref = duty.reference, read = d => architectureObligationsFor(d).find(o => o.id === duty.id);
    // (the handlers above read the document they are handed, which upgrades it: take the document as it was written)
    before = asWritten(beforeAdoptions(before)); assert.ok(!('adoptions' in before));
    const after = asWritten(U.upgradeAdoptions(before)); assert.equal(records(after).length, 3);
    assert.equal(read(before).verificationState, 'current-verified', 'the document written before holds a verified obligation: ' + JSON.stringify(read(before).verificationReasons));
    // rule 3: no verification is lost
    assert.equal(architectureObligationBasis(after, ref).stamp, architectureObligationBasis(before, ref).stamp, 'the obligation basis stamp is byte-identical'); assert.ok(architectureObligationBasis(after, ref).stamp);
    assert.equal(read(after).verificationState, 'current-verified');
    // the rows
    assert.equal(JSON.stringify(architectureObligationsFor(after)), JSON.stringify(architectureObligationsFor(before)), 'architectureObligationsFor answers the same rows'); assert.equal(architectureObligationsFor(after).length, 22);
    assert.equal(JSON.stringify(architectureObligationsFor(after, ['api-pod'])), JSON.stringify(architectureObligationsFor(before, ['api-pod'])));
    // rule 2: no stamp moves
    assert.equal(reviewSourceStamp(after), reviewSourceStamp(before), 'the design fingerprint'); assert.equal(reviewDesignStamp(after), reviewDesignStamp(before)); assert.equal(evidenceStamp(after), evidenceStamp(before), 'the evidence fingerprint');
    assert.equal(JSON.stringify(reviewSource(after)), JSON.stringify(reviewSource(before)), 'the design source a freeze keeps is byte-identical, so a baseline frozen before reads no change');
    for (const r of reviewRequirements(before)) assert.equal(traceStamp(after, r.id), traceStamp(before, r.id), 'the trace stamp of ' + r.id);
    assert.equal(JSON.stringify(after.finalReview), JSON.stringify(before.finalReview), 'the review record, its actions, verifications, baselines and governance are untouched');
    for (const k of ['review', 'handoff', 'quality', 'decisions', 'logical', 'realisation', 'technology', 'technologyRealisation', 'interfaces', 'security', 'runtime']) assert.equal(JSON.stringify(after[k] ?? null), JSON.stringify(before[k] ?? null), 'chapter record ' + k + ' with its review, handoff and confirmations');
    assert.equal(readings(after).stamps, readings(before).stamps);
    // rule 5: a frozen source is read as frozen
    const frozen = structuredClone(reviewSource(before)); assert.ok(frozen.guidedDesign?.length === 3); assert.equal(U.needsAdoptionUpgrade(frozen), false); assert.equal(U.upgradeAdoptions(frozen), frozen, 'a frozen source is not upgraded');
    // rule 1: no guarantee appears
    // (ruling J7; was: each upgraded adoption raises adoption-acceptance, a warning, and nothing else. No surface offers the step before
    // slice S3, so no finding is raised: the reading states the standing, and an upgraded old document gains no finding at all.)
    const mine = own(chapter5(after));
    assert.deepEqual(mine, [], 'an upgraded old document gains no finding of the package'); assert.deepEqual(D.adoptionFindings(after), []);
    assert.equal(JSON.stringify(inheritedFindings(after)), JSON.stringify(inheritedFindings(before)), 'nor any other: the review inherits what it inherited'); assert.equal(readings(after).findings, readings(before).findings); assert.equal(readings(after).readiness, readings(before).readiness);
    for (const a of records(after)) {
      const g = D.adoptionReading(after, a);
      assert.equal(g.label, 'applied · not accepted by a second person', 'the reading states the standing'); assert.equal(g.accepted, false); assert.equal(D.adoptionAccepted(after, a), false);
      assert.ok(g.acceptance.next && !/adoption\.\w+/.test(g.acceptance.next), 'and what must happen next, in a reader\'s words (should-fix 11): ' + g.acceptance.next);
      assert.deepEqual(g.basis, a.id === 'ADP-003' ? {state: 'current', findingId: null} : {state: 'changed', findingId: 'design-source:' + a.legacy.taskId}, 'the reading carries the earlier path\'s basis state for the same design (ruling J6)');
      assert.ok(g.parameters.every(x => x.unit === 'unit not stated' && x.state === 'stated')); assert.equal(g.parameters.length, a.parameters.length);
      assert.deepEqual(g.definition, {state: 'current', reasons: []}); assert.ok(g.roles.length && g.roles.every(r => r.state === 'bound')); assert.deepEqual(g.bounds.notConsidered, ['runtime behaviour', 'implementation code', 'measured load', 'observed operation']);
      assert.deepEqual(g.obligations.map(o => o.id), a.obligations.map(o => o.id)); assert.ok(g.obligations.every(o => ['open', 'evidence-awaiting', 'current-verified', 'review-required'].includes(o.state)));
    }
    assert.equal(D.adoptionReading(after, byId(after, 'ADP-002')).obligations.find(o => o.id === duty.id).state, 'current-verified', 'the adoption reads the obligation\'s state from the one obligation reading');
    // an interpretation that is not current reads as today's reason does
    const stale = structuredClone(before); stale.coauthoring.designTasks[0].methodReceipt.sources.evaluationRevision = 1; stale.coauthoring.designTasks[0].applied.methodReceipt.sources.evaluationRevision = 1;
    const s = asWritten(U.upgradeAdoptions(asWritten(stale))); assert.deepEqual(D.adoptionReading(s, byId(s, 'ADP-001')).definition, {state: 'interpretation-changed', reasons: ['The architecture method interpretation needs review.']});
    // what the upgrade moves among the ten readings, and what it leaves
    const a = readings(after), b = readings(before), moved = Object.keys(a).filter(k => a[k] !== b[k]);
// (rulings J7 and J9; was: graph, model, trails, findings, readiness, provenance, registers, sdd. With no finding raised, the findings, the
    // readiness and the working registers stay too; the SDD moves by its count of who wrote the records, which block "J9" holds.)
    assert.deepEqual(moved, ['graph', 'model', 'trails', 'provenance', 'sdd'], 'the upgrade moves these readings and leaves the findings, the stamps, the readiness, the registers and the ARS');
    assertFindingIdsUnique(after);
    pass('e.3 rules 1, 2, 3 and 5 and the rows: an upgraded adoption reads "applied · not accepted by a second person", its parameters "unit not stated", no bounds, and raises no finding (ruling J7); the design, evidence and trace stamps, the design source a freeze keeps and the review record are byte-identical; a verified obligation keeps its basis stamp and stays current-verified; architectureObligationsFor answers the same 22 rows; a frozen source is not upgraded; of the ten readings the upgrade moves ' + moved.join(', '));
  });

  // ------------------------------------------------------------ the trace
  await block('trace', async () => {
    pkg();
    const before = bankPaymentApplied(), after = upgraded(), G = recordGraph(after), a = byId(after, 'ADP-001');
    assert.deepEqual([G.objects.get('ADP-001')?.type, G.objects.get('ADP-001')?.source, G.objects.get('ADP-001')?.title], ['pattern', 'adoptions.records.ADP-001', a.title]);
    assert.ok(!G.objects.has('DES-001'), 'the built-in emitter skips a task that has an adoption: one record for one applied mechanism'); assert.equal(recordGraph(before).objects.get('DES-001')?.type, 'pattern', 'and emits it as before while it has none');
    const rels = G.relationships.filter(e => e.from === 'ADP-001');
    assert.deepEqual(rels.filter(e => e.type === 'binds').map(e => [e.to, e.attributes.role, e.attributes.mode, e.source]), a.bindings.map(b => [b.recordId, b.roleId, b.mode, 'adoptions.records.bindings']));
    assert.deepEqual(rels.filter(e => e.type === 'addresses').map(e => e.to), ['REQ-005']); assert.deepEqual(rels.filter(e => e.type === 'assesses').map(e => e.to), ['QD-006']);
    assert.ok(rels.filter(e => e.type === 'scopes').some(e => e.to === a.decisionId)); assert.ok(rels.every(e => G.objects.has(e.to)), 'a relation is stated only to a record the document holds');
    assert.deepEqual(new Set(linkedVia(after, 'ADP-001', 'binds')), new Set(['api-pod', 'obj-001', 'obj-002', 'obj-003', 'notify-worker']), 'linkedVia binds answers the role records');
    assert.deepEqual(linkedVia(after, 'obj-001', 'binds', 'in'), ['ADP-001']);
    const T = requirementTrace(after, 'REQ-005'); assert.ok(list(T.layers.mechanism).includes('ADP-001'), 'the trail of the requirement it addresses holds the adoption on the layer mechanism: ' + JSON.stringify(T.layers.mechanism));
    assert.ok(list(requirementTrace(after, 'REQ-004').layers.mechanism).includes('ADP-002')); assert.ok(list(requirementTrace(after, 'REQ-001').layers.mechanism).includes('ADP-003'));
    assert.equal(requirementTrace(before, 'REQ-005').layers.mechanism, undefined, 'a document without adoptions has no such layer on any trail: a task the built-in emitter states stands on none');
    assert.ok(assertBuiltInTrailsUnchanged(before, after) > 0, 'the built-in layers of every trail and spine hold what they held');
    assert.equal(requirementSpine(after, 'REQ-005').layers.mechanism, undefined, 'the mechanism is context on a trail: no spine holds it, so no governance check reads it');
    assertFindingIdsUnique(after);
    // the provenance reader reads the records (ruling D5 prints them); none carries an author stamp
    const seen = []; eachRecord(after, (r, chapter, path) => { if (path === 'adoptions.records') seen.push([r.id, chapter]); }); assert.deepEqual(seen, [['ADP-001', 3], ['ADP-002', 3], ['ADP-003', 3]], 'counted under the chapter of its object type (ruling J12; was Chapter 5)');
    for (const o of G.objects.values()) if (String(o.source).startsWith('adoptions.records.')) assert.match(o.id, /^ADP-\d{3}$/, 'every record the package adds carries the prefix it mints');
    pass('trace: each adoption is one record of type pattern (the task that has an adoption is no longer emitted beside it), with addresses, assesses, binds {role, mode} and scopes; the requirement\'s trail holds it on the layer mechanism; linkedVia(p, id, \'binds\') answers the role records; every built-in layer of every trail and spine is unchanged (assertBuiltInTrailsUnchanged); finding ids are unique');
  });

  // ------------------------------------------------------------ through the server: rule 4, accept, deviation, tracker
  let h = null;
  const need = () => { assert.ok(h?.ready, 'the server holds the upgraded project (block "storage upgrade")'); return h; };
  const adp = id => byId(h.doc(), id), rev = id => adp(id).revision;
  const accept = (id, as, extra = {}, more = {}) => h.send('adoption.accept', {id, revision: rev(id), deviationIds: list(adp(id).deviations).filter(d => !d.withdrawn).map(d => d.id), note: 'Read against the model.', ...extra}, as, more);
  const reassess = (id, as) => h.ok('adoption.reassess', {id, revision: rev(id), reviewed: true, reason: 'Read against the model as it stands.'}, as);
  await block('storage upgrade', async () => {
    pkg(); h = await server(worker);
    // A design applied on this build through the commands a project used is an adoption from its own commit: the read
    // upgrades run wherever the server reads a document, the commit's own copy included.
    const doc = await h.apply();
    assert.deepEqual(records(doc).map(a => [a.id, a.origin, a.status, a.legacy.taskId]), [['ADP-001', 'upgrade', 'applied', 'DES-001'], ['ADP-002', 'upgrade', 'applied', 'DES-002'], ['ADP-003', 'upgrade', 'applied', 'DES-003']]);
    assert.deepEqual(doc.workspace.packages, [PACKAGE], 'the document names the package that wrote into it (ruling D2)');
    // e.3 rule 4: a row stored before the adoption record existed is stored again at its next read, once, as a storage upgrade
    const {env, pid} = h, row = () => env.DB.prepare('SELECT document,revision,updated_at FROM projects WHERE owner_id=? AND id=?').bind(A, pid).first();
    const first = await row(), stored = await readStoredProject(env, A, first.document), old = beforeAdoptions(stored.document);
    assert.ok(!('adoptions' in old) && !old.workspace.packages && old.coauthoring.designTasks.every(t => t.status === 'applied' && !t.adoptionId));
    assert.ok((await saveStoredProject(env, A, pid, old, first.revision, LATER, stored.keys)).meta?.changes, 'the row is written as a build before the package kept it');
    const before = await row(), kept = await readStoredProject(env, A, before.document);
    assert.ok(!('adoptions' in kept.document)); assert.equal(storageUpgradeNeeded(kept), true, 'a stored row with applied tasks and no adoptions is stored again');
    const journal = list(kept.document.changes?.events).length, points = () => [...h.files.keys()].filter(k => k.startsWith('upgrades/')).length, pointsBefore = points();
    // ruling J8 (should-fix 5): a tab left open across the deploy sends a command at the stored revision before any read. It is answered
    // with a reload; nothing is stored, so the upgrade is not written inside a design change and without its recovery point.
    { const storageRows = async () => (await env.DB.prepare('SELECT document FROM project_activity WHERE owner_id=? AND project_id=?').bind(A, pid).all()).results.map(r => JSON.parse(r.document)).filter(e => e.kind === 'storage').length, rowsBefore = await storageRows();
      for (const [type, payload, as] of [['guide.start', {chapter: 1}, A], ['adoption.reassess', {id: 'ADP-001', revision: 1, reviewed: true, reason: 'x'}, B], ['record.retire', {id: 'obj-005', reason: 'Refused.'}, C]]) {
        const res = await h.api('/api/commands' + h.q, 'POST', {revision: before.revision, command: {type, payload}}, as), body = await res.json();
        assert.equal(res.status, 409, type + ' on a row whose package upgrade is due is answered with a reload: ' + res.status + ' ' + JSON.stringify(body).slice(0, 200)); assert.equal(body.conflict, true); assert.match(body.error, /earlier build of AIW.*Reload the latest project, then apply your preserved changes\./);
      }
      const still = await row(); assert.equal(still.revision, before.revision, 'nothing was stored'); assert.equal(still.document, before.document, 'the row is byte for byte what it was'); assert.equal(points(), pointsBefore, 'no recovery point'); assert.equal(await storageRows(), rowsBefore, 'no activity row');
      // ruling K1 (the fix-up's open question, closed by the lead): nor does any other save store it. A writing route that is not a command is answered
      // with the same reload; a rename from the project list is taken and stores the row as it was, so the upgrade stays due for the read that keeps its recovery point.
      { const res = await h.api('/api/operations' + h.q, 'POST', {action: 'policy', revision: before.revision, enabled: true, hourlyRequests: 10, dailyTokens: 1000, excludedObjectIds: [], reason: 'Budget for the pilot.'}, A), body = await res.json();
        assert.equal(res.status, 409, 'POST /api/operations on a row whose package upgrade is due: ' + res.status + ' ' + JSON.stringify(body).slice(0, 200)); assert.equal(body.conflict, true); assert.match(body.error, /earlier build of AIW.*Reload the latest project/);
        const now = await row(); assert.equal(now.revision, before.revision); assert.equal(now.document, before.document); assert.equal(points(), pointsBefore); assert.equal(await storageRows(), rowsBefore); }
      { const res = await h.api('/api/lifecycle' + h.q, 'POST', {action: 'rename', name: kept.document.name, revision: before.revision}, A), body = await res.json(); assert.equal(res.status, 200, 'a rename is taken: ' + JSON.stringify(body).slice(0, 200));
        const now = await row(), again = await readStoredProject(env, A, now.document); assert.equal(now.revision, before.revision + 1);
        assert.ok(!('adoptions' in again.document) && !again.document.workspace.packages && again.document.coauthoring.designTasks.every(t => !t.adoptionId), 'the rename stores no adoption: the row is as it was but for the lifecycle log');
        assert.equal(storageUpgradeNeeded(again), true, 'the upgrade is still due'); assert.equal(points(), pointsBefore, 'no recovery point is owed'); assert.equal(await storageRows(), rowsBefore, 'no storage upgrade is recorded');
        assert.deepEqual(records(body.document).map(a => a.id), ['ADP-001', 'ADP-002', 'ADP-003'], 'the answer shows the project as this build reads it');
        Object.assign(before, now); } }
    const read = await h.read(B);
    assert.equal(read.revision, before.revision + 1, 'the first read stores the upgrade'); assert.deepEqual(records(read.document).map(a => [a.id, a.origin, a.status]), [['ADP-001', 'upgrade', 'applied'], ['ADP-002', 'upgrade', 'applied'], ['ADP-003', 'upgrade', 'applied']]);
    assert.deepEqual(read.document.workspace.packages, [PACKAGE]); assert.deepEqual(read.document.coauthoring.designTasks.map(t => t.adoptionId), ['ADP-001', 'ADP-002', 'ADP-003']);
    // ruling J1: the stored journal says who sent each apply, so the upgrade itself records the applier, as bookkeeping
    for (const a of records(read.document)) { assert.deepEqual(a.history.map(x => [x.event, x.actor, x.identity ?? null, x.revision]), [['upgrade', null, null, 1], ['apply', A, 'journal', 1]], a.id + ': the upgrade names the applier the journal names'); assert.ok(!a.provenance && !('actor' in a.applied), 'and writes no author stamp: the typed reviewer stays what was applied with'); }
    assert.equal(points(), pointsBefore + 1, 'with a recovery point that keeps the row as it was');
    const point = JSON.parse([...h.files.entries()].filter(([k]) => k.startsWith('upgrades/')).at(-1)[1]); assert.equal(point.revision, before.revision); assert.equal(point.document, before.document);
    const events = (await env.DB.prepare('SELECT document FROM project_activity WHERE owner_id=? AND project_id=?').bind(A, pid).all()).results.map(r => JSON.parse(r.document)).filter(e => e.kind === 'storage');
    assert.equal(events.length, 1, 'recorded once in the activity, as a storage upgrade'); assert.ok(events[0].summary.endsWith(' ' + pkg().upgradeNote), 'whose words end with what the step did: ' + events[0].summary.slice(-140));
    assert.equal(list(read.document.changes?.events).length, journal, 'and not as a design change: the journal holds no event of it');
    await h.read(A); await h.read(B); assert.equal(h.state.revision, read.revision, 'a later read stores nothing'); assert.equal(points(), pointsBefore + 1);
    assert.equal((await env.DB.prepare('SELECT document FROM project_activity WHERE owner_id=? AND project_id=?').bind(A, pid).all()).results.map(r => JSON.parse(r.document)).filter(e => e.kind === 'storage').length, 1);
    h.ready = true;
    pass('e.3 rule 4 and ruling J8: a row stored before the adoption record is stored again at its first read, once, as a storage upgrade with a recovery point that keeps the row as it was and with the step\'s sentence in the activity; the design journal holds no event of it; the document names p40-adoption; the upgrade names the applier the journal names. A command sent at the stored revision before that read is answered with a reload and stores nothing. A design applied on this build through the earlier commands is an adoption from its own commit');
  });

  // The earlier path's step that re-reads a design whose sources changed (architecture.refresh: a typed reviewer name).
  const refresh = async (taskId, as = A) => { const d = withFinalReview(structuredClone(h.doc())), t = d.coauthoring.designTasks.find(x => x.id === taskId); return h.ok('architecture.refresh', {id: t.id, taskRevision: t.revision, reviewed: true, reviewer: 'Synthetic architect', reason: 'Reviewed the current sources of ' + taskId + '.', stamp: architectureSourceStamp(d, t)}, as); };
  const standing = id => own(chapter5(withFinalReview(structuredClone(h.doc())))).filter(f => f.objectId === id).map(f => [f.code, f.level]).sort();
  await block('accept', async () => {
    need(); const id = 'ADP-001', design = () => reviewSourceStamp(withFinalReview(structuredClone(h.doc()))), stamp = design();
    // The upgrade named the applier (A) from the journal; the record carries no author stamp, so no person stands behind it as it stands (ruling F4).
    // (ruling J1; was: B's accept is refused by the one rule with "ADP-001 names no author", since nobody was named. The applier is named now, so
    // the one rule passes B and the two-persons rule asks for a person behind the record first.)
    { const r = await accept(id, B); assert.equal(r.status, 400, JSON.stringify(r.body).slice(0, 300)); assert.match(r.error, /A second person.s step needs two persons: no person other than architect-b stands behind ADP-001 as it stands/, 'a record the upgrade wrote needs a person\'s confirmation first: ' + r.error); assert.ok(!adp(id).review); }
    // (should-fix 11; was: the reading's next step matches /signed-in person confirms it .*adoption\.reassess.*second person accepts/: it named command types)
    { const g = D.adoptionReading(h.doc(), adp(id)); assert.match(g.acceptance.next, /^ADP-001 rests on DES-001, whose sources changed: that design is reviewed first/, 'the reading says in a reader\'s words what comes first: ' + g.acceptance.next); assert.ok(!/adoption\.\w+/.test(g.acceptance.next)); assert.deepEqual(g.basis, {state: 'changed', findingId: 'design-source:DES-001'}); }
    { const g = D.adoptionReading(h.doc(), adp('ADP-003')); assert.match(g.acceptance.next, /^A signed-in person reads ADP-003 against the model and confirms it as it stands; then a second signed-in person, who neither applied ADP-003 nor changed its facts, bindings, parameters or deviations, accepts it\.$/); }
    // the person-only step that confirms it: adoption.reassess
    { const r = await h.send('adoption.reassess', {id, revision: rev(id), reviewed: true, reason: 'x'}, AGENT); assert.equal(r.status, 400); assert.match(r.error, /agent or service account does not review, confirm, accept or approve/); }
    { const r = await h.send('adoption.reassess', {id, revision: rev(id), reviewed: true, reason: 'Read against the model.'}, A, {authorKind: 'sol-draft'}); assert.equal(r.status, 400, 'a draft by Sol confirms nothing: ' + JSON.stringify(r.body).slice(0, 200)); }
    { const r = await h.send('adoption.reassess', {id, revision: rev(id), reason: 'Read against the model.'}, A); assert.equal(r.status, 400); assert.match(r.error, /reviewed/i); }
    { const r = await h.send('adoption.reassess', {id, revision: 7, reviewed: true, reason: 'Read against the model.'}, A); assert.equal(r.status, 400); assert.match(r.error, /This adoption changed\. Reopen it; your input is retained\./); }
    await reassess(id, A);
    assert.equal(adp(id).confirmed, true); assert.deepEqual([adp(id).provenance?.reviewed?.by, adp(id).provenance?.reviewed?.how], [A, 'confirmed'], 'the boundary stamps who confirmed'); assert.equal(adp(id).revision, 1, 'a confirmation changes nothing the record says');
    assert.equal(design(), stamp, 'and moves no design stamp');
    // (rulings J1 and should-fix 1; was: the projection equals {id, actor: A, history: [{revision: 1, actor: A}]} because A confirmed first. It reads the
    // same, with the owner, because A applied: who confirms does not change it.)
    assert.deepEqual(D.acceptanceSubject(adp(id), h.doc()), {id, actor: A, owner: 'Service owner', history: [{revision: 1, actor: A}]}, 'the projection names who applied, and the owner');
    // refused: the applier, an agent account, a draft by Sol, no actor
    { const r = await accept(id, A); assert.equal(r.status, 400); assert.match(r.error, /A second signed-in person, who did not write or own the action, verifies it\. architect-a wrote ADP-001\./, 'the one rule\'s sentence (ruling A5): the applier is not the second person'); }
    { const r = await accept(id, AGENT); assert.equal(r.status, 400); assert.match(r.error, /agent or service account does not review, confirm, accept or approve \(adoption\.accept\)/); }
    { const r = await accept(id, B, {}, {authorKind: 'sol-draft'}); assert.equal(r.status, 400); }
    assert.throws(() => commandHandler('adoption.accept')(structuredClone(h.doc()), {type: 'adoption.accept', payload: {id, revision: 1, deviationIds: [], note: ''}}, AT, null, {author: null}), /Sign in: adoption\.accept is a signed-in person.s step\./);
    assert.throws(() => commandHandler('adoption.accept')(structuredClone(h.doc()), {type: 'adoption.accept', payload: {id, revision: 1, deviationIds: [], note: ''}}, AT, AGENT, {author: {kind: 'person', id: AGENT, account: 'agent'}}), /signed-in person.s step/);
    { const r = await accept(id, B, {revision: 9}); assert.equal(r.status, 400); assert.match(r.error, /This adoption changed/); }
    // ruling J6 (should-fix 2): no second truth while the earlier path stands. Its finding for the same design (design-source:DES-001, an error) is
    // cleared by its own step first; until then a second person's accept is refused, though a person stands behind the record.
    assert.ok(inheritedFindings(withFinalReview(structuredClone(h.doc()))).some(f => String(f.id).endsWith('design-source:DES-001') && f.level === 'error'), 'the earlier path\'s finding for DES-001 stands');
    { const r = await accept(id, B); assert.equal(r.status, 400, 'accept is refused while the earlier path\'s error for the same design stands (it was taken before the fix-up)'); assert.match(r.error, /ADP-001 rests on DES-001, whose sources changed \(design-source:DES-001 stands\): review that design first/); assert.ok(!adp(id).review); }
    await refresh('DES-001');
    assert.ok(!inheritedFindings(withFinalReview(structuredClone(h.doc()))).some(f => String(f.id).endsWith('design-source:DES-001')), 'architecture.refresh, the earlier path\'s step, clears it'); assert.deepEqual(D.adoptionReading(h.doc(), adp(id)).basis, {state: 'current', findingId: null});
    assert.equal(adp(id).confirmed, true, 'the confirmation stands: the task is the earlier path\'s record, not the adoption\'s'); const reviewed = design();
    { const r = await accept(id, B, {deviationIds: ['ADP-001:DEV-09']}); assert.equal(r.status, 400); assert.match(r.error, /deviation/i); }
    assert.ok(!adp(id).review, 'a refused request accepts nothing');
    // accepted by a second person
    { const r = await accept(id, B); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); assert.equal(r.body.selected, id); }
    const a = adp(id);
    assert.deepEqual({actor: a.review.actor, account: a.review.account, revision: a.review.revision, deviationIds: a.review.deviationIds, note: a.review.note}, {actor: B, account: 'person', revision: 1, deviationIds: [], note: 'Read against the model.'}, 'the step is kept under the record\'s key review, with the account kind the boundary handed to apply (ruling F3, D7.1)');
    assert.ok(!('acceptance' in a)); assert.equal(a.status, 'applied', 'the stored status is not moved by the step: accepted is read, never stored'); assert.equal(a.revision, 1);
    assert.deepEqual([a.provenance?.reviewed?.by, a.provenance?.author ?? null], [A, null], 'the stamps of who stands behind the record are as they were');
    const g = D.adoptionReading(h.doc(), a); assert.equal(g.accepted, true); assert.equal(g.label, 'applied · accepted by ' + B); assert.equal(D.adoptionAccepted(h.doc(), a), true); assert.equal(g.acceptance.next, '');
    assert.deepEqual(standing(id), [], 'no finding of the package stands for it');
    // the reader calls the one rule on the same projection with the stored step and requires a person's
    for (const [why, edit] of [['the applier', x => { x.review.actor = A; }], ['an agent account', x => { x.review.account = 'agent'; }], ['no account kind', x => { delete x.review.account; }], ['no actor', x => { x.review.actor = ''; }], ['another revision', x => { x.review.revision = 2; }], ['a status written by hand', x => { delete x.review; x.status = 'accepted'; }]]) {
      const d = structuredClone(h.doc()), x = byId(d, id); edit(x); assert.equal(D.adoptionAccepted(d, x), false, 'not accepted when the stored step names ' + why);
    }
    assert.equal(verifierRefusal(D.acceptanceSubject(a, h.doc()), a.review.actor, a.review.account), null);
    assert.equal(design(), reviewed, 'an acceptance changes nothing the design says: the design fingerprint is where it was');
    // it is not undone, and a second acceptance is refused
    { const r = await accept(id, C); assert.equal(r.status, 400); assert.match(r.error, /already accepted/i); }
    pass('accept: an upgraded adoption carries no author stamp, so a second person\'s accept is refused until a signed-in person confirms it with adoption.reassess (ruling F4: an agent account and a draft by Sol confirm nothing); it is refused for the applier, an agent account, a draft by Sol and no actor; it is refused while the earlier path\'s finding for the same design stands (ruling J6), and taken for a second person once architecture.refresh has cleared it; the step is kept under review with the account kind, the status, the stamps and the design fingerprint stay; the reader requires a person\'s step that the one rule finds independent');
  });

  await block('deviation', async () => {
    need(); const id = 'ADP-001';
    { const r = await h.send('adoption.deviation', {id, revision: rev(id), target: {kind: 'role', id: 'relay'}, statement: 'The relay runs inside the Payment service process.', reason: 'One deployment unit is all the team operates.'}, AGENT); assert.equal(r.status, 400); }
    { const r = await h.send('adoption.deviation', {id, revision: rev(id), target: {kind: 'role', id: 'no-such-role'}, statement: 'x', reason: 'y'}, C); assert.equal(r.status, 400); assert.match(r.error, /not .*this definition|Choose/i); }
    { const r = await h.send('adoption.deviation', {id, revision: rev(id), target: {kind: 'role', id: 'relay'}, statement: 'The relay runs inside the Payment service process.', reason: ''}, C); assert.equal(r.status, 400); assert.match(r.error, /reason/i); }
    { const r = await h.send('adoption.deviation', {id, revision: rev(id), target: {kind: 'role', id: 'relay'}, statement: 'x'.repeat(2001), reason: 'y'}, C); assert.equal(r.status, 400, 'a text past its bound is refused, never cut'); }
    const design = () => reviewSourceStamp(withFinalReview(structuredClone(h.doc()))), stamp = design();
    await h.ok('adoption.deviation', {id, revision: rev(id), target: {kind: 'role', id: 'relay'}, statement: 'The relay runs inside the Payment service process.', reason: 'One deployment unit is all the team operates.'}, C);
    let a = adp(id); assert.notEqual(design(), stamp, 'a deviation is a design change: the design fingerprint moves');
    assert.deepEqual(a.deviations.map(d => [d.id, d.target, d.by, d.statement]), [['ADP-001:DEV-01', {kind: 'role', id: 'relay'}, C, 'The relay runs inside the Payment service process.']]); assert.equal(a.revision, 2);
    // the acceptance lapses
    assert.equal(D.adoptionAccepted(h.doc(), a), false, 'an acceptance lapses when a deviation is added'); assert.equal(a.review.actor, B, 'the lapsed step stays on record'); assert.equal(a.status, 'applied');
    assert.equal(D.adoptionReading(h.doc(), a).label, 'applied · not accepted by a second person');
    // (ruling J7; was: adoption-acceptance and adoption-deviation-unreviewed, both warnings. The standing is the reading's; the unreviewed deviation is the finding.)
    assert.deepEqual(standing(id), [['adoption-deviation-unreviewed', 'warning']]);
    assert.deepEqual([a.provenance.author.kind, a.provenance.author.by, a.provenance.reviewed ?? null, a.confirmed], ['person', C, null, false], 'the record as it stands is C\'s: the earlier confirmation is gone');
    // a save left in: who wrote a deviation is refused by the one rule, whoever confirms the record afterwards
    assert.deepEqual(D.acceptanceSubject(a, h.doc()).history, [{revision: 1, actor: A}, {revision: 2, actor: C}]);
    { const r = await accept(id, C); assert.equal(r.status, 400); assert.match(r.error, /architect-c wrote ADP-001/); }
    await reassess(id, A);
    { const r = await accept(id, C); assert.equal(r.status, 400); assert.match(r.error, /architect-c wrote ADP-001/, 'left in: the deviation\'s author is not the second person'); }
    const afterConfirm = design();
    // (ruling J6; was: the save left out is adoption.obligation, B discharging an obligation, which moved the revision to 3. That step is held back to
    // slice S2. The save left out here is a confirmation of a record whose applier is named: it changes nothing the acceptance covers.)
    await reassess(id, B);
    a = adp(id); assert.deepEqual([a.history.at(-1).event, a.history.at(-1).actor, a.provenance.reviewed.by, a.provenance.author.by, a.revision], ['reassess', B, A, C, 2], 'B read the record C last wrote and A had confirmed: the step is on its history, and a save that changes nothing writes no stamp');
    assert.deepEqual(D.acceptanceSubject(a, h.doc()).history, [{revision: 1, actor: A}, {revision: 2, actor: C}], 'left out: the projection does not name who confirmed a record whose applier is named');
    assert.equal(verifierRefusal(D.acceptanceSubject(a, h.doc()), B, 'person'), null); assert.equal(design(), afterConfirm, 'a confirmation after a deviation moves no design stamp (ruling J3)');
    { const r = await accept(id, B, {deviationIds: []}); assert.equal(r.status, 400); assert.match(r.error, /deviation/i, 'each deviation is acknowledged by id'); }
    { const r = await accept(id, B); assert.equal(r.status, 200, 'left out: who confirmed may accept, since other persons wrote what the acceptance covers (A applied, C deviated): ' + JSON.stringify(r.body).slice(0, 300)); }
    a = adp(id); assert.deepEqual([a.review.actor, a.review.revision, a.review.deviationIds], [B, 2, ['ADP-001:DEV-01']]); assert.equal(D.adoptionAccepted(h.doc(), a), true); assert.equal(design(), afterConfirm, 'nor does the acceptance');
    assert.deepEqual(standing(id), [], 'the deviation is reviewed with the acceptance that names it');
    // the two steps that are held back are no commands of this build (ruling J6): the obligation readers read the task, the one place
    for (const [type, payload] of [['adoption.obligation', {id, revision: rev(id), obligationId: 'DES-001:delivery-recovery', dischargedBy: 'obj-002'}], ['adoption.withdraw', {id, revision: rev(id), reason: 'Withdrawn.'}]]) { const r = await h.send(type, payload, B); assert.equal(r.status, 400, type); assert.equal(r.body.code, 'unknown_command', type + ' is held back: ' + JSON.stringify(r.body).slice(0, 160)); }
    assert.ok(a.obligations.every(o => !o.dischargedBy)); assert.equal(adp(id).status, 'applied');
    // a deviation is withdrawn with a reason, never deleted
    { const r = await h.send('adoption.deviation', {id, revision: rev(id), deviationId: 'ADP-001:DEV-01', withdrawn: true, reason: ''}, C); assert.equal(r.status, 400); }
    await h.ok('adoption.deviation', {id, revision: rev(id), deviationId: 'ADP-001:DEV-01', withdrawn: true, reason: 'The relay became a worker of its own.'}, C);
    a = adp(id); assert.equal(a.deviations.length, 1); assert.equal(a.deviations[0].withdrawn.by, C); assert.equal(D.adoptionAccepted(h.doc(), a), false); assert.notEqual(design(), afterConfirm, 'withdrawing a deviation is a design change');
    pass('deviation: a signed-in person records a deviation against a role of the definition, with a reason; the acceptance lapses (the step stays on record) and adoption-deviation-unreviewed is raised; ruling D7.1 — a save left in: the deviation\'s author is refused by the one rule whoever confirms afterwards; a save left out: who confirmed a record whose applier is named is not named by the projection and accepts; neither a confirmation nor an acceptance moves the design fingerprint, a deviation and its withdrawal do; adoption.obligation and adoption.withdraw are held back (unknown commands); a deviation is withdrawn, never deleted');
  });

  await block('template copy', async () => {
    need(); const id = 'ADP-003';
    // ADP-003 confirmed by A (who applied it) and accepted by B in this project; its design's basis is current
    await reassess(id, A); { const r = await accept(id, B); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); }
    const p = withFinalReview(structuredClone(h.doc())); assert.equal(D.adoptionAccepted(p, byId(p, id)), true);
    assertTemplateCopyClearsSteps(p, records);
    const copy = instantiateTemplate(withFinalReview({...p, workspace: {...p.workspace, reusableTemplate: true}}), 'template-copy', 'A copy', LATER), x = byId(copy, id);
    assert.deepEqual([x.review, x.applied, x.confirmed, x.history], [null, null, false, []], 'the copy holds the record without the steps taken in the template');
    assert.equal(D.adoptionAccepted(copy, x), false); const g = D.adoptionReading(copy, x); assert.equal(g.accepted, false); assert.match(g.label, /not applied or accepted in this project/);
    // (ruling J7; was: the finding adoption-acceptance:ADP-002 is back in the copy. No finding is raised for the standing; the reading says it, and who must act.)
    assert.match(g.acceptance.next, /^No person stands behind ADP-003 in this project: a signed-in person reads it against the model and confirms it as it stands; then a second signed-in person accepts it\.$/); assert.deepEqual(own(chapter5(copy)), []);
    // (rulings J1 and should-fix 1; was: the projection equals {id, actor: null, history: []}: it now carries the owner)
    assert.deepEqual(D.acceptanceSubject(x, copy), {id, actor: null, owner: x.owner, history: []}, 'nobody applied or confirmed it here: the applier named in the template is history from elsewhere'); assert.match(verifierRefusal(D.acceptanceSubject(x, copy), B, 'person'), /names no author/);
    assertFindingIdsUnique(copy); R.assertStepsMoveNoStamp(copy, records);
    pass('template copy (ruling F3): the acceptance is kept under review, which a project made from a template clears (assertTemplateCopyClearsSteps); in the copy the adoption reads "not applied or accepted in this project", says who must act, and nobody stands behind it until a person confirms it there');
  });

  await block('tracker', async () => {
    need(); const id = 'ADP-003', naming = d => list(d.changes?.events).filter(e => e.source?.id === id);
    // the persistence design bound obj-005 as its store and placed its commit obligation on it; it is accepted (block "template copy")
    let a = adp(id); const store = a.bindings.find(b => b.roleId === 'store').recordId; assert.ok(a.obligations.some(o => o.id === 'DES-003:persistence-commit' && o.targetIds.includes(store)), 'the commit obligation rests on the store');
    assert.equal(D.adoptionAccepted(h.doc(), a), true);
    // a change of a bound record is flagged in the same commit, and the acceptance lapses until a person reassesses
    const component = h.doc().realisation.components.find(c => c.id === store);
    const changed = await h.ok('realisation.component', {...component, purpose: component.purpose + ' Sized for the settlement peak.'}, C);
    a = adp(id); let g = D.adoptionReading(h.doc(), a);
    assert.equal(g.changed.required, true, 'the commit that changed the bound store flags the adoption'); assert.deepEqual(g.changed.causes.map(c => [c.kind, c.id, c.detail]), [['binding', store, 'changed']]);
    assert.equal(g.accepted, false); assert.equal(a.revision, 1, 'the tracker changes neither the revision'); assert.equal(a.status, 'applied', 'nor the status'); assert.equal(a.review.actor, B, 'nor the acceptance on record');
    // ruling J5: what the tracker changed is in the journal of that commit, with who sent it
    { const event = naming(changed.document).at(-1); assert.ok(event, 'the commit\'s journal names the adoption'); assert.deepEqual([event.actor, event.authorKind, event.source.chapter, event.source.kind], [C, 'person', 3, 'adoption']); assert.equal(a.history.at(-1).changeId, event.id); }
    // (ruling J7; was: adoption-acceptance and adoption-basis, both warnings)
    assert.deepEqual(standing(id), [['adoption-basis', 'warning']]);
    { const r = await accept(id, B); assert.equal(r.status, 400); assert.match(r.error, /changed since it was last read: a signed-in person reads it against the model again and confirms it first/, 'accept is refused while a change is not reassessed, in a reader\'s words: ' + r.error); assert.ok(!/adoption\.\w+/.test(r.error)); }
    await reassess(id, A); g = D.adoptionReading(h.doc(), adp(id)); assert.equal(g.changed.required, false); assert.equal(g.accepted, false, 'an acceptance given before the change does not stand again');
    // The change of the bound component also changed what the earlier path developed DES-003 from: its finding stands, and accept waits for its step (ruling J6).
    assert.deepEqual(g.basis, {state: 'changed', findingId: 'design-source:DES-003'}); { const r = await accept(id, B); assert.equal(r.status, 400); assert.match(r.error, /ADP-003 rests on DES-003, whose sources changed/); }
    await refresh('DES-003'); { const r = await accept(id, B); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); }
    // the case that fails today: retire the store; a finding names the applied mechanism — in the commit that retires it
    const names = (d, x) => COLLECTIONS.flatMap(([path]) => { const [k, l] = path.split('.'), v = l ? d?.[k]?.[l] : d?.[k]; return list(v).filter(r => r && r.id !== x && JSON.stringify({...r, history: 0, provenance: 0, sourceSnapshot: 0}).includes('"' + x + '"')).map(r => r.id); });
    let commits = 0, last = null;
    const retire = async x => { for (let i = 0; i < 60; i++) { const r = await h.send('record.retire', {id: x, reason: 'Replaced by a managed service.'}, C); if (r.status === 200) { commits++; last = r.body; return; } assert.match(r.error, /still named by/, r.error); const next = names(h.doc(), x)[0]; assert.ok(next, 'a record names ' + x); await retire(next); await h.read(); } throw Error('could not retire ' + x); };
    await h.read(); await retire(store);
    assert.ok(!last.document.realisation.components.some(c => c.id === store), 'the store is retired'); assert.ok(commits > 1);
    const doc = last.document; a = byId(doc, id); g = D.adoptionReading(doc, a);
    const findings = chapter5(withFinalReview(structuredClone(doc))), broken = findings.find(f => f.id === 'adoption-role-broken:' + id);
    assert.ok(broken, 'the document the retiring commit answers holds adoption-role-broken: ' + JSON.stringify(own(findings).map(f => f.id)));
    assert.equal(broken.level, 'error'); assert.equal(broken.objectId, id); assert.ok(broken.detail.includes(id) && broken.detail.includes(a.title) && broken.detail.includes('store') && /retired/.test(broken.detail), 'the finding names the applied mechanism, the role and what happened: ' + broken.detail);
    assert.ok(broken.detail.includes('DES-003:persistence-commit'), 'and the obligations that rest on the record'); for (const x of own(findings)) assert.ok(!/adoption\.\w+/.test(x.title + ' ' + x.detail), 'a finding says the step in a reader\'s words (should-fix 11): ' + x.detail);
    for (const x of records(doc)) assert.ok(!/adoption\.\w+/.test(D.adoptionReading(doc, x).acceptance.next), 'and so does the reading');
    assert.ok(inheritedFindings(withFinalReview(structuredClone(doc))).some(f => String(f.id).endsWith('adoption-role-broken:' + id)), 'the review inherits it');
    assert.deepEqual(g.roles.find(r => r.roleId === 'store'), {roleId: 'store', required: true, state: 'broken', recordIds: [store], issues: ['retired']});
    assert.ok(g.changed.required && g.changed.causes.some(c => c.kind === 'binding' && c.id === store && c.detail === 'retired'), 'the tracker recorded the cause in the commit: ' + JSON.stringify(g.changed)); assert.equal(g.accepted, false);
    // (ruling J5; was: the marker is ['changed', null, 1], "who sent the commit is in the journal" of the command only. The marker is the same, and the
    // journal of the retiring commit holds an event that names the adoption, with who sent it.)
    const marker = a.history.findLast(x => x.event === 'changed'); assert.deepEqual([marker.event, marker.actor, marker.revision], ['changed', null, 1], 'the marker is the tracker\'s');
    { const event = naming(doc).at(-1); assert.ok(event && event.fields.some(f => String(f.after).includes(store + ' retired')), 'the retiring commit\'s journal names the adoption and the cause: ' + JSON.stringify(event?.fields)); assert.deepEqual([event.actor, event.authorKind], [C, 'person']); assert.match(event.title, /^Reassess ADP-003/); }
    assert.ok(!recordGraph(withFinalReview(structuredClone(doc))).relationships.some(e => e.from === id && e.to === store), 'no relation is stated to a record that left');
    { const r = await accept(id, B); assert.equal(r.status, 400); }
    // the other adoptions, which do not bind the store, are not flagged
    assert.equal(D.adoptionReading(doc, byId(doc, 'ADP-002')).changed.required, false);
    assertFindingIdsUnique(withFinalReview(structuredClone(doc)));
    // restoring the store does not make the acceptance stand again: a person reassesses
    await h.ok('record.restore', {id: store}, C); g = D.adoptionReading(h.doc(), adp(id)); assert.equal(g.roles.find(r => r.roleId === 'store').state, 'bound'); assert.equal(g.changed.required, true); assert.equal(g.accepted, false);
    pass('tracker — the case that fails today ("retire the store an applied design placed its commit obligation on; a finding names the applied mechanism"): the commit that retires the bound store answers a document with adoption-role-broken (an error) naming the adoption, its title, the role and the obligations that rest on the record; a change of a bound record is flagged in its own commit, journalled with who sent it (ruling J5) and lapses the acceptance until a person reassesses and a second person accepts again; the tracker moves neither revision, status nor the step on record; other adoptions are not flagged');
  });

  await block('held back', async () => {
    need(); const id = 'ADP-002', rows = d => architectureObligationsFor(withFinalReview(structuredClone(d))).filter(o => o.taskId === 'DES-002').length;
    // the tracker, called as the server calls it, on the outbox (ADP-001): its store is retired; and a design the earlier path reverses
    { const prior = withFinalReview(structuredClone(h.doc())), next = structuredClone(h.doc()), a = byId(next, 'ADP-001'), store = a.bindings.find(b => b.roleId === 'store').recordId, c = next.realisation.components.find(x => x.id === store);
      next.realisation.components = next.realisation.components.filter(x => x !== c); if (next.logical.assets) next.logical.assets = next.logical.assets.filter(x => x.id !== store); (next.retired ??= {records: []}).records.push({id: store, path: 'realisation.components', chapter: 5, record: c, at: AT, actor: C, reason: 'Replaced.'});
      const events = next.changes.events.length;
      pkg().track(prior, next, {type: 'record.retire', payload: {id: store}}, AT); pkg().track(prior, next, {type: 'record.retire', payload: {id: store}}, AT);
      const g = D.adoptionReading(next, a), f = g.findings.find(x => x.code === 'adoption-role-broken');
      assert.ok(f && f.detail.includes('ADP-001') && f.detail.includes(a.title) && f.detail.includes('“store”') && f.detail.includes('DES-001:effect-1'), 'retire the store an applied outbox design bound: a finding names the applied mechanism: ' + f?.detail);
      assert.deepEqual(g.changed.causes.filter(x => x.id === store), [{kind: 'binding', id: store, detail: 'retired'}], 'the tracker is idempotent within a commit');
      assert.equal(next.changes.events.length, events + 1, 'and journals a change once: one event, though it is called for the command and for each command a batch carries'); assert.ok(!('actor' in next.changes.events.at(-1)), 'the event states no author: the server\'s stamp is the only one');
      const back = structuredClone(h.doc()), t = back.coauthoring.designTasks.find(x => x.id === 'DES-001'); t.status = 'dismissed';
      pkg().track(prior, back, {type: 'alternative.rollback', payload: {}}, AT);
      assert.deepEqual([byId(back, 'ADP-001').status, byId(back, 'ADP-001').history.at(-1).event], ['reversed', 'reverse'], 'a design the earlier path reverses takes its adoption with it, in the same commit');
      assert.equal(D.adoptionReading(back, byId(back, 'ADP-001')).label, 'reversed'); assert.deepEqual(D.adoptionFindings(back).filter(x => x.objectId === 'ADP-001'), []);
      // should-fix 9: one rule for a mechanism that no longer stands — it stays an object of the graph, as a design task set aside before the upgrade does, on no trail
      { const q = withFinalReview(back), G = recordGraph(q), o = G.objects.get('ADP-001'); assert.ok(o && o.type === 'pattern', 'a reversed adoption is still an object'); assert.ok(!G.objects.has('DES-001'), 'once');
        assert.ok(G.relationships.some(e => e.from === 'ADP-001' && e.type === 'addresses') && !G.relationships.some(e => e.from === 'ADP-001' && e.type === 'binds'), 'with what it addressed, and no binding');
        for (const r of reviewRequirements(q)) assert.ok(!list(requirementTrace(q, r.id).layers.mechanism).includes('ADP-001'), 'and on no trail: ' + r.id);
        const set = structuredClone(bankPaymentApplied()); set.coauthoring.designTasks[0].status = 'dismissed'; const S = recordGraph(asWritten(U.upgradeAdoptions(asWritten(set)))); assert.equal(S.objects.get('DES-001')?.type, 'pattern', 'as a task set aside before the upgrade is: an object, on no trail'); }
      const fresh = structuredClone(prior); delete fresh.adoptions; pkg().track(fresh, next, {type: 'record.retire', payload: {id: store}}, LATER); assert.equal(byId(next, 'ADP-002').history.some(x => x.event === 'changed' && x.at === LATER), false, 'an adoption a commit wrote is not flagged by that commit');
      const none = structuredClone(reference('bank-payment')), text = JSON.stringify(none); pkg().track(none, none, {type: 'record.retire', payload: {}}, AT); assert.equal(JSON.stringify(none), text, 'the tracker writes nothing into a document without adoptions'); }
    // (ruling J6; was: adoption.withdraw by C marks ADP-002 withdrawn and its task dismissed, and no reader lists its six obligations. The step is held
    // back to slice S3: the task, the model alternative and the adoption would be three places for one standing. The obligations are read from the task.)
    assert.equal(rows(h.doc()), 6);
    { const r = await h.send('adoption.withdraw', {id, revision: rev(id), reason: 'The call is replaced by an asynchronous exchange.'}, C); assert.equal(r.status, 400); assert.equal(r.body.code, 'unknown_command'); }
    assert.equal(adp(id).status, 'applied'); assert.equal(rows(h.doc()), 6, 'the obligations stand where the earlier path keeps them');
    // (should-fix 4: with the step held back, a withdrawn adoption whose design can still be reversed cannot arise; the reversal stays the earlier path's)
    h.close(); h = null;
    pass('held back (ruling J6): adoption.withdraw is no command of this build, and the obligations of an applied design are read from the earlier path, the one place. The tracker as the server calls it: retiring the store the applied outbox bound names the mechanism, once in the journal; a design the earlier path reverses takes its adoption with it, and the record stays one object of the graph on no trail (should-fix 9); nothing is written into a document without adoptions');
  });

  // ============================================================ the fix-up (the lead's rulings J1 to J12 of 2026-11-19)
  // ------------------------------------------------------------ J1: the applier is named
  await block('J1 applier', async () => {
    pkg(); const s = await server(worker);
    try {
      // A applies the three designs through the earlier path; each is an adoption from its own commit
      const doc = await s.apply(), id = 'ADP-003', a0 = byId(doc, id), get = () => byId(s.doc(), id), rev1 = () => get().revision;
      const acc = (as, extra = {}) => s.send('adoption.accept', {id, revision: rev1(), deviationIds: [], note: 'Read against the model.', ...extra}, as);
      const confirm = as => s.send('adoption.reassess', {id, revision: rev1(), reviewed: true, reason: 'Read against the model as it stands.'}, as);
      assert.ok(a0.applied.changeIds.length && doc.changes.events.filter(e => a0.applied.changeIds.includes(e.id)).every(e => e.actor === A && e.authorKind === 'person'), 'the journal events the applied task names say who sent the apply');
      // the projection names the applier, read from the journal events the task names, and the owner
      const subject = D.acceptanceSubject(get(), s.doc());
      assert.deepEqual(subject, {id, actor: A, owner: a0.owner, history: [{revision: 1, actor: A}]}, 'the projection names the signed-in applier and the owner');
      assert.match(verifierRefusal(subject, A, 'person'), /architect-a wrote ADP-003/); assert.equal(verifierRefusal(subject, B, 'person'), null);
      // the applier is refused by the one rule before and after another person confirms; the confirmer by the two-persons rule
      { const r = await acc(A); assert.equal(r.status, 400); assert.match(r.error, /A second signed-in person, who did not write or own the action, verifies it\. architect-a wrote ADP-003\./, 'the applier is not the second person: ' + r.error); }
      { const r = await acc(B); assert.equal(r.status, 400); assert.match(r.error, /A second person.s step needs two persons: no person other than architect-b stands behind ADP-003/, 'an adoption the upgrade wrote carries no author stamp: a person confirms it first (ruling F4): ' + r.error); }
      { const r = await confirm(B); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); }
      // the applier is on the record for good from the next commit on (the tracker reads the journal), as bookkeeping
      assert.deepEqual(get().history.filter(x => x.event === 'apply').map(x => [x.actor, x.identity, x.revision]), [[A, 'journal', 1]], 'the applier is recorded on the adoption, named by the journal');
      assert.deepEqual([get().provenance?.reviewed?.by, get().provenance?.author ?? null, get().revision], [B, null, 1], 'naming the applier is bookkeeping: no author stamp, no revision');
      { const r = await acc(A); assert.equal(r.status, 400, 'A applies, B confirms: A\'s accept is refused (it was taken before the fix-up)'); assert.match(r.error, /architect-a wrote ADP-003/); assert.ok(!get().review); }
      { const r = await acc(B); assert.equal(r.status, 400); assert.match(r.error, /needs two persons/, 'the confirmer is the only person behind the record as it stands'); }
      { const r = await acc(C); assert.equal(r.status, 200, 'a person who neither applied nor is the only one behind the record accepts: ' + JSON.stringify(r.body).slice(0, 300)); }
      assert.equal(D.adoptionAccepted(s.doc(), get()), true); assert.equal(D.adoptionReading(s.doc(), get()).label, 'applied · accepted by ' + C);
      // the reader holds the same rule on the stored step: an acceptance by the applier does not count
      { const d = structuredClone(s.doc()), x = byId(d, id); x.review.actor = A; assert.equal(D.adoptionAccepted(d, x), false, 'a stored acceptance by the applier does not stand'); }
      // the owner is handed to the one rule (should-fix 1)
      { const x = byId(s.doc(), 'ADP-002'); assert.ok(x.owner, 'ADP-002 has an owner: ' + x.owner); const sub = D.acceptanceSubject(x, s.doc()); assert.equal(sub.owner, x.owner); assert.match(verifierRefusal(sub, x.owner.toUpperCase().replace(/ /g, '-'), 'person'), /owns ADP-002/, 'the owner of an adoption does not accept it'); }
      // (two persons suffice — the applier confirms what the upgrade wrote, a second person accepts: blocks "accept" and "template copy")
      // the earlier path's finding for the same design refuses the accept of a design whose basis is flagged, whoever asks (ruling J6)
      { const one = 'ADP-001', r1 = () => byId(s.doc(), one).revision; assert.equal((await s.send('adoption.reassess', {id: one, revision: r1(), reviewed: true, reason: 'Read against the model as it stands.'}, A)).status, 200);
        const r = await s.send('adoption.accept', {id: one, revision: r1(), deviationIds: [], note: ''}, B); assert.equal(r.status, 400); assert.match(r.error, /ADP-001 rests on DES-001, whose sources changed/); }
    } finally { s.close(); }
    // where the journal names nobody (a document whose events carry no actor), a person confirms first, as before
    const old = upgraded(), x = byId(old, 'ADP-001');
    assert.deepEqual(D.acceptanceSubject(x, old), {id: 'ADP-001', actor: null, owner: x.owner, history: []}); assert.match(verifierRefusal(D.acceptanceSubject(x, old), B, 'person'), /names no author/); assert.deepEqual(x.history.map(e => e.event), ['upgrade'], 'the upgrade names no applier the journal does not name');
    const confirmed = commandHandler('adoption.reassess')(structuredClone(old), {type: 'adoption.reassess', payload: {id: 'ADP-001', revision: 1, reviewed: true, reason: 'Read.'}}, AT, A, {author: person(A)}).document, y = byId(confirmed, 'ADP-001');
    assert.deepEqual(D.acceptanceSubject(y, confirmed), {id: 'ADP-001', actor: A, owner: y.owner, history: [{revision: 1, actor: A}]}, 'the first person who confirms stands in the applier\'s place');
    // an event that names an actor without saying it was a person's commit names nobody as the applier, and still refuses that actor
    { const d = structuredClone(old), z = byId(d, 'ADP-001'); z.applied.changeIds = ['CHG-900']; (d.changes ??= {counter: 0, events: []}).events.push({id: 'CHG-900', actor: C, at: APPLIED_AT, fields: [], items: []});
      const sub = D.acceptanceSubject(z, d); assert.equal(sub.actor, null, 'no person is named as the applier'); assert.deepEqual(sub.history, [{revision: 1, actor: C}], 'and whoever the journal names is still not the second person'); }
    pass('J1: the applier is named — the projection reads who applied the design from the journal events the task names (and the owner); A applies, B confirms: A\'s accept is refused by the one rule, B\'s by the two-persons rule, C\'s is taken; the applier is recorded on the adoption as bookkeeping; A applied and confirmed, B accepts; where the journal names nobody a person confirms first');
  });

  // ------------------------------------------------------------ J2: a relation only between objects
  await block('J2 connected model', async () => {
    pkg(); const {architectureModel} = await import('../public/architecture-model.js'), {nativePackage, validateNativePackage} = await import('../public/model-exchange.js');
    const before = bankPaymentApplied(), after = upgraded();
    assert.deepEqual(architectureModel(before).issues, [], 'the old document has no issue in its connected model');
    assert.ok(after.interfaces.lineage.length > 0 && records(after).some(a => a.applied.records.some(r => after.interfaces.lineage.some(l => l.id === r.id))), 'an applied design wrote a lineage, which the graph keeps as a relation');
    assert.deepEqual(architectureModel(after).issues, architectureModel(before).issues, 'the connected model of the upgraded document has the issues it had before (none)');
    const pack = await nativePackage(after), valid = await validateNativePackage(pack); assert.ok(valid.objects > 200, 'the model package of the upgraded document validates: ' + valid.objects + ' objects');
    const G = recordGraph(after); for (const e of G.relationships.filter(e => String(e.source).startsWith('adoptions.'))) assert.ok(G.objects.has(e.from) && G.objects.has(e.to), e.type + ' ' + e.from + ' → ' + e.to + ' is between objects');
    // an applied task of another kind whose records include a record the graph keeps as a relation, and one that left
    const other = otherKindApplied(), up = asWritten(U.upgradeAdoptions(other)), o = records(up)[0];
    assert.deepEqual(architectureModel(up).issues, architectureModel(other).issues, 'the same for an upgraded task of another kind');
    await validateNativePackage(await nativePackage(up));
    // should-fix 8: a bound record's type is the one the record graph gives it, not a guess from its chapter
    assert.deepEqual(o.bindings.map(b => [b.roleId, b.recordId, b.recordType]), [['provider', 'api-pod', 'component'], ['contract', 'rest', 'contract'], ['payload', 'instruction', 'data'], ['need', 'TN-001', 'need'], ['consumer', 'gone-001', 'component']], 'the type the graph gives; a record that left keeps the type of its chapter; a record the graph keeps as a relation is no role');
    assert.deepEqual(o.applied.records.map(r => r.id), other.coauthoring.designTasks[0].applied.records.map(r => r.id), 'what was applied stays verbatim, the allocation with it');
    assert.deepEqual(DEF.definitionIssues(o.definition.snapshot), [], 'the snapshot is a well-formed definition');
    assert.deepEqual(D.adoptionReading(up, o).roles.find(r => r.roleId === 'consumer'), {roleId: 'consumer', required: true, state: 'broken', recordIds: ['gone-001'], issues: ['removed']});
    pass('J2: the emitter states a relation only between objects (has(id) from the registration point): the connected model of the upgraded Bank Payment document has no issue, as before, and its model package validates; the same for an applied task of another kind, whose bound records carry the type the record graph gives them');
  });

  // ------------------------------------------------------------ J3: what of an adoption is design
  await block('J3 design statement', async () => {
    const e = pkg(), stamps = p => [reviewSourceStamp(p), reviewDesignStamp(p)];
    assert.equal(typeof e.design?.adoptions, 'function', 'the package states what its records say to the design fingerprint (the registration row of ruling J3)');
    { const src = readFileSync(new URL('../public/review-domain.js', import.meta.url), 'utf8'); assert.ok(!/['"]adoptions['"]|\.adoptions\b/.test(src), 'review-domain.js names the package\'s key nowhere: the hand-edit of reviewSource is gone'); }
    const old = bankPaymentApplied(), up = upgraded();
    assert.equal(D.adoptionDesign(up), undefined, 'an adoption upgraded from a task says nothing the task does not say already: the design source keeps no key'); assert.ok(!('adoptions' in reviewSource(up)));
    assert.deepEqual(stamps(up), stamps(old), 'the upgrade moves no design stamp');
    // one rule for every revision: no person's or second person's step moves the stamp (the shared helper of S0)
    assert.equal(typeof R.assertStepsMoveNoStamp, 'function', 'S0\'s shared helper for package suites'); R.assertStepsMoveNoStamp(up, records);
    const step = (p, type, payload, actor) => withFinalReview(commandHandler(type)(structuredClone(p), {type, payload}, AT, actor, {author: person(actor)}).document);
    let p = step(up, 'adoption.deviation', {id: 'ADP-003', revision: 1, target: {kind: 'role', id: 'store'}, statement: 'The store is a managed service of the platform team.', reason: 'One operating team.'}, C);
    assert.notDeepEqual(stamps(p), stamps(up), 'a deviation is a design change');
    assert.deepEqual(reviewSource(p).adoptions, [{id: 'ADP-003', deviations: byId(p, 'ADP-003').deviations}], 'the design source reads what the adoption says beyond its task: its deviations, without history, review, confirmed or provenance');
    R.assertStepsMoveNoStamp(p, records);
    const s1 = stamps(p); p = step(p, 'adoption.reassess', {id: 'ADP-003', revision: 2, reviewed: true, reason: 'Read.'}, A); assert.deepEqual(stamps(p), s1, 'a confirmation after a deviation moves no design stamp (it moved it before the fix-up)');
    byId(p, 'ADP-003').provenance = {reviewed: {by: A, at: AT, how: 'confirmed'}, author: {kind: 'person', by: C, at: AT}};
    p = step(p, 'adoption.accept', {id: 'ADP-003', revision: 2, deviationIds: ['ADP-003:DEV-01'], note: ''}, B); assert.equal(D.adoptionAccepted(p, byId(p, 'ADP-003')), true); assert.deepEqual(stamps(p), s1, 'nor does a second person\'s acceptance');
    // a frozen baseline: e.3 rule 2 with a baseline actually frozen before the upgrade (should-fix 6)
    { const {baselineChanges, baselineCurrent, finalChecksCurrent} = await import('../public/review-domain.js');
      let b = reviewCommand(bankPaymentApplied(), 'checks', {}); b = reviewCommand(b, 'baseline', {stamp: reviewDesignStamp(b), title: 'Frozen before the adoption record', reviewed: true});
      b = asWritten(beforeAdoptions(b)); const frozen = b.finalReview.baselines.at(-1); assert.ok(frozen && !('adoptions' in b) && !('adoptions' in frozen.source), 'a baseline frozen by a document without adoptions');
      assert.equal(baselineCurrent(b, frozen), true); assert.equal(finalChecksCurrent(b), true);
      let u = asWritten(U.upgradeAdoptions(b)); assert.equal(records(u).length, 3);
      assert.deepEqual(baselineChanges(u, frozen), [], 'the upgrade reads as no change since the baseline'); assert.equal(baselineCurrent(u, frozen), true); assert.equal(finalChecksCurrent(u), true, 'and the checks stay current');
      u = step(u, 'adoption.reassess', {id: 'ADP-003', revision: 1, reviewed: true, reason: 'Read.'}, A); byId(u, 'ADP-003').provenance = {reviewed: {by: A, at: AT, how: 'confirmed'}};
      u = step(u, 'adoption.accept', {id: 'ADP-003', revision: 1, deviationIds: [], note: ''}, B); assert.equal(D.adoptionAccepted(u, byId(u, 'ADP-003')), true);
      assert.deepEqual(baselineChanges(u, frozen), [], 'a confirmation and an acceptance read as no change since the baseline'); assert.equal(baselineCurrent(u, frozen), true); assert.equal(finalChecksCurrent(u), true);
      u = step(u, 'adoption.deviation', {id: 'ADP-003', revision: 1, target: {kind: 'role', id: 'store'}, statement: 'The store is a managed service.', reason: 'One operating team.'}, C);
      assert.equal(baselineCurrent(u, frozen), false, 'a deviation is a change since the baseline'); assert.equal(finalChecksCurrent(u), false);
      // must-fix 3, as the review states its case: after a deviation and fresh checks, a confirmation and a second person's acceptance leave the
      // design stamp and the checks where they were (at revision 2 they moved both, before the fix-up)
      u = withFinalReview(reviewCommand(u, 'checks', {})); assert.equal(finalChecksCurrent(u), true, 'fresh checks after the deviation'); const fresh = stamps(u);
      u = step(u, 'adoption.reassess', {id: 'ADP-003', revision: 2, reviewed: true, reason: 'Read.'}, A); byId(u, 'ADP-003').provenance = {reviewed: {by: A, at: AT, how: 'confirmed'}, author: {kind: 'person', by: C, at: AT}};
      assert.deepEqual(stamps(u), fresh); assert.equal(finalChecksCurrent(u), true, 'a confirmation after a deviation leaves the checks current');
      u = step(u, 'adoption.accept', {id: 'ADP-003', revision: 2, deviationIds: ['ADP-003:DEV-01'], note: ''}, B); assert.equal(D.adoptionAccepted(u, byId(u, 'ADP-003')), true);
      assert.deepEqual(stamps(u), fresh); assert.equal(finalChecksCurrent(u), true, 'and so does the second person\'s acceptance'); }
    // an adoption with no task beside it (a project copied from a template; slice S2's own) says all but its bookkeeping
    { const copy = instantiateTemplate(withFinalReview({...up, workspace: {...up.workspace, reusableTemplate: true}}), 'template-copy', 'A copy', LATER), said = D.adoptionDesign(copy);
      assert.equal(said.length, 3); for (const x of said) { for (const k of ['history', 'review', 'confirmed', 'provenance']) assert.ok(!(k in x), k + ' is bookkeeping to the fingerprint'); assert.ok(x.definition && x.bindings && x.scope, 'what the adoption says is read'); }
      R.assertStepsMoveNoStamp(copy, records); }
    pass('J3: the package states what its records say to the design fingerprint (S0\'s row), in place of the raw key: nothing for an adoption whose task still says it, its deviations once it has any, all but history, review, confirmed and provenance once no task stands beside it; the upgrade, a confirmation and an acceptance move no design stamp at any revision (S0\'s helper), a baseline frozen before reads no change, a deviation is a change; review-domain.js names the key nowhere');
  });

  // ------------------------------------------------------------ J4: a definition is current only if its knowledge is
  await block('J4 knowledge', async () => {
    pkg(); const {document: old, receipt, releaseId, at: KAT} = governedConcernApplied(), {claimReceiptCurrent} = await import('../public/knowledge-governance.js');
    const up = asWritten(U.upgradeAdoptions(old)), a = byId(up, 'ADP-001'), read = p => D.adoptionReading(p, byId(p, 'ADP-001'));
    // a governed concern has its own skeleton and kind, not the boundary task's
    assert.deepEqual([a.kind, a.definition.authority, a.definition.definitionId, a.definition.groupId, a.definition.snapshot.kind, a.definition.snapshot.title], ['concern', 'released', 'knowledge-concern:service-ownership', 'knowledge:service-ownership', 'concern', 'Service ownership · One application'], 'a released design concern is upgraded under its own skeleton');
    assert.ok(DEF.DEFINITION_KINDS.includes('concern')); assert.deepEqual(DEF.definitionIssues(a.definition.snapshot), []); assert.equal(a.definition.receipt.governedConcern.receipt.claimId, receipt.claimId, 'the receipt pins the released claim');
    assert.equal(claimReceiptCurrent(up, receipt), true); assert.deepEqual(read(up).definition, {state: 'current', reasons: []}); assert.deepEqual(own(chapter5(up)), [], 'while the pinned knowledge is current nothing is raised');
    // candidate and unreleased knowledge moves no adoption reading (plan ruling 6): behaviour, not a scan of imports
    { let q = knowledgeCommand(structuredClone(up), 'knowledge.source', {title: 'A second synthetic note', body: 'A second synthetic note\nA candidate statement about service ownership that nobody has reviewed.\n', path: 'synthetic/second.txt', revision: '1', license: 'Synthetic test material'}, KAT);
      q = knowledgeCommand(q, 'knowledge.claim', {sourceId: q.knowledge.sources.at(-1).id, lineStart: 2, lineEnd: 2, subjectId: 'design-concern:service-ownership', predicate: 'offers a design concern', claimType: 'applicability', polarity: 'neutral', statement: 'A candidate reading of the same concern.', conditions: ['For any architecture.'], limitations: ['Nobody has reviewed this reading.'], tags: ['title:Service ownership', 'question:Where should reservation ownership live?', 'option:local|One application|x', 'option:third|A third way|y']}, KAT);
      q = asWritten(q); assert.equal(q.knowledge.claims.length, 2); assert.notEqual(q.knowledge.claims.at(-1).status, 'released');
      assert.equal(JSON.stringify(read(q)), JSON.stringify(read(up)), 'a candidate claim on the same subject moves no adoption reading'); assert.deepEqual(own(chapter5(q)), []); }
    // deactivated: the definition is no longer current, an error says so and acceptance is refused
    const off = asWritten(knowledgeCommand(structuredClone(up), 'knowledge.deactivate', {reason: 'Withdraw project activation.', id: releaseId}, KAT));
    assert.equal(claimReceiptCurrent(off, receipt), false, 'the existing rule reads the pinned claim as no longer current');
    const g = read(off); assert.equal(g.definition.state, 'withdrawn', 'the reading does not say current of knowledge that is not: ' + JSON.stringify(g.definition)); assert.ok(g.definition.reasons.length > 0);
    const f = own(chapter5(off)).find(x => x.code === 'adoption-definition-withdrawn'); assert.ok(f, 'adoption-definition-withdrawn is raised: ' + JSON.stringify(own(chapter5(off)).map(x => x.id)));
    assert.deepEqual([f.id, f.level, f.objectId], ['adoption-definition-withdrawn:ADP-001', 'error', 'ADP-001']); assert.ok(f.detail.includes('ADP-001'));
    { const d = structuredClone(off), x = byId(d, 'ADP-001'); x.confirmed = true; x.history.push({n: 2, at: AT, event: 'reassess', actor: A, revision: 1}); x.provenance = {reviewed: {by: A, at: AT, how: 'confirmed'}};
      assert.throws(() => commandHandler('adoption.accept')(d, {type: 'adoption.accept', payload: {id: 'ADP-001', revision: 1, deviationIds: [], note: ''}}, AT, B, {author: person(B)}), /open error|no longer current|withdrawn/i, 'acceptance is refused while the pinned knowledge is not current'); }
    // an acceptance given while the knowledge was current does not stand once it is not
    // (the acceptance is written by hand with a time after the fixture's apply, as a real one is; was: at AT, a week before the design was applied and its
    // sources read, which the reader now takes for an acceptance given before the design was re-read: block "J6 basis after acceptance")
    { const d = structuredClone(up), x = byId(d, 'ADP-001'), ACCEPTED_AT = '2026-10-12T10:00:00.000Z'; assert.ok(ACCEPTED_AT > KAT); x.confirmed = true; x.history.push({n: 2, at: ACCEPTED_AT, event: 'reassess', actor: A, revision: 1}); x.review = {actor: B, at: ACCEPTED_AT, account: 'person', revision: 1, seq: 2, note: '', deviationIds: []};
      assert.equal(D.adoptionAccepted(asWritten(d), byId(d, 'ADP-001')), true);
      { const e = structuredClone(d); byId(e, 'ADP-001').review.at = AT; assert.equal(D.adoptionAccepted(asWritten(e), byId(e, 'ADP-001')), false, 'an acceptance dated before the design\'s sources were last read does not stand'); }
      const gone = asWritten(knowledgeCommand(structuredClone(d), 'knowledge.deactivate', {reason: 'Withdraw project activation.', id: releaseId}, KAT)); assert.equal(D.adoptionAccepted(gone, byId(gone, 'ADP-001')), false, 'accepted is read: not while the definition\'s knowledge is not current');
      // and the tracker flags it in the commit that deactivates (design c.3)
      const next = structuredClone(gone); pkg().track(asWritten(d), next, {type: 'knowledge.deactivate', payload: {id: releaseId}}, LATER);
      const change = D.adoptionReading(next, byId(next, 'ADP-001')).changed; assert.ok(change.required && change.causes.some(c => c.kind === 'definition'), 'the commit that deactivates the release flags the adoption: ' + JSON.stringify(change)); }
    // a built-in definition is read as before; its interpretation as before
    assert.deepEqual(D.adoptionReading(upgraded(), byId(upgraded(), 'ADP-001')).definition, {state: 'current', reasons: []});
    pass('J4: an adoption\'s definition is current only if its knowledge is — a released design concern is upgraded under its own skeleton and kind (concern), its receipt is read with the existing rule (claimReceiptCurrent, withdrawn): a candidate claim on the same subject moves no reading; a deactivated release reads withdrawn, raises adoption-definition-withdrawn (error), refuses acceptance, ends a standing acceptance and is flagged by the tracker');
  });

  // ------------------------------------------------------------ J5: what the tracker changes is journalled
  await block('J5 journal', async () => {
    pkg(); const s = await server(worker);
    try {
      await s.apply(); const naming = (body, id) => list(body.document.changes?.events).filter(e => e.source?.id === id);
      // the design reversed through the earlier path (the last one applied, while the model is as its apply left it): one event names the adoption, with who reversed it
      { const id = 'ADP-003', get = () => byId(s.doc(), id), rows = d => architectureObligationsFor(withFinalReview(structuredClone(d))).filter(o => o.taskId === 'DES-003').length;
        const alt = s.doc().modelAlternatives.records.find(x => x.id === get().legacy.alternativeId), pre = previewReversal(withFinalReview(structuredClone(s.doc())), alt);
        assert.equal(pre.allowed, true, 'the persistence design can be reversed: ' + pre.reason); assert.ok(rows(s.doc()) > 0);
        const r = await s.ok('alternative.rollback', {id: alt.id, alternativeRevision: alt.revision, previewStamp: pre.stamp, reviewed: true, reviewer: 'Synthetic architect', reason: 'Fixture: reverse the persistence design.'}, C), ev = naming(r, id), a = get(), task = r.document.coauthoring.designTasks.find(t => t.id === 'DES-003');
        assert.equal(ev.length, 1, 'the commit that reverses the design holds one event naming the adoption: ' + JSON.stringify(ev.map(e => e.title))); assert.deepEqual([ev[0].actor, ev[0].authorKind, ev[0].source.chapter], [C, 'person', 3]); assert.match(ev[0].title, /^Reversed ADP-003/);
        assert.deepEqual([a.status, a.history.at(-1).event, a.history.at(-1).changeId, task.status === 'applied', task.adoptionId], ['reversed', 'reverse', ev[0].id, false, id], 'the design the earlier path reverses takes its adoption with it, in the same commit'); assert.equal(records(r.document).length, 3, 'nothing is deleted');
        assert.equal(a.confirmed, false, 'a confirmation of the record as it stood no longer counts (provenance.js reads a confirmation only of a record that is confirmed)');
        assert.equal(rows(r.document), 0, 'its obligations close with the design: no reader lists them as accepted');
        const p = withFinalReview(structuredClone(r.document)), g = D.adoptionReading(p, byId(p, id)); assert.equal(g.label, 'reversed'); assert.equal(g.accepted, false); assert.ok(g.obligations.every(o => o.state === 'closed')); assert.deepEqual(own(chapter5(p)).filter(f => f.objectId === id), [], 'a reversed adoption raises nothing');
        // should-fix 9: it stays one object of the graph, on no trail
        const G = recordGraph(p); assert.ok(G.objects.get(id)?.type === 'pattern' && !G.objects.has('DES-003'), 'it stays one object of the graph'); for (const q of reviewRequirements(p)) assert.ok(!list(requirementTrace(p, q.id).layers.mechanism).includes(id), 'on no trail');
        assert.deepEqual(reviewSource(p).adoptions, [{id, status: 'reversed'}], 'and says to the design fingerprint that it no longer stands');
        for (const type of ['adoption.accept', 'adoption.reassess', 'adoption.deviation']) { const x = await s.send(type, {id, revision: get().revision, reviewed: true, reason: 'x', deviationIds: [], target: {kind: 'role', id: 'store'}, statement: 'x'}, B); assert.equal(x.status, 400, type + ' on a reversed adoption'); assert.match(x.error, type === 'adoption.accept' ? /needs two persons: no person other than architect-b stands behind ADP-003|ADP-003 is reversed/ : /ADP-003 is reversed: it takes no further step/); } }
      // a change of a bound record: one event names the adoption, with who sent the commit
      const id = 'ADP-001', get = () => byId(s.doc(), id), confirm = () => s.ok('adoption.reassess', {id, revision: get().revision, reviewed: true, reason: 'Read against the model as it stands.'}, A);
      await confirm(); assert.equal(D.adoptionReading(s.doc(), get()).changed.required, false);
      const store = get().bindings.find(b => b.roleId === 'store').recordId, component = s.doc().realisation.components.find(c => c.id === store);
      const had = naming(await s.read(), id).map(e => e.id);
      const changed = await s.ok('realisation.component', {...component, purpose: component.purpose + ' Sized for the settlement peak.'}, C), mine = naming(changed, id).filter(e => !had.includes(e.id));
      assert.equal(mine.length, 1, 'the commit that changes a bound record holds one event naming the adoption: ' + JSON.stringify(naming(changed, id).map(e => e.id)));
      assert.deepEqual([mine[0].actor, mine[0].authorKind, mine[0].source.id, mine[0].source.chapter, mine[0].source.kind], [C, 'person', id, 3, 'adoption'], 'the server says who sent the commit, of what kind'); assert.match(mine[0].title, /^Reassess ADP-001/); assert.ok(mine[0].fields.some(f => String(f.after).includes(store + ' changed')), 'and what changed: ' + JSON.stringify(mine[0].fields));
      assert.equal(get().history.at(-1).event, 'changed'); assert.equal(get().history.at(-1).changeId, mine[0].id, 'the adoption\'s own note points at the journal event');
      { const row = (await s.activity()).find?.(x => x.changeIds?.includes(mine[0].id)); if (row) assert.equal(row.actor ?? row.by ?? C, C); }
      // a second change while the first is open: the cause joins the open change, and the journal names it too
      const driver = s.doc().quality.drivers.find(d => d.id === get().scope.driverId), again = await s.ok('quality.driver', {...driver, response: driver.response + ' Reviewed for the fix-up.'}, B), second = naming(again, id).filter(e => !had.includes(e.id) && e.id !== mine[0].id);
      assert.equal(second.length, 1, 'the commit that changes the driver holds one event naming the adoption'); assert.equal(second[0].actor, B); assert.ok(D.adoptionReading(s.doc(), get()).changed.causes.some(c => c.kind === 'driver'));
      // a commit that changes the decision the adoption rests on
      { await confirm(); const decision = s.doc().decisions.records.find(d => d.id === get().decisionId); assert.ok(decision, 'the adoption rests on a decision');
        const seen = naming(await s.read(), id).map(e => e.id), r = await s.ok('decision.save', {...decision, question: decision.question + ' (reviewed)'}, C), third = naming(r, id).filter(e => !seen.includes(e.id));
        assert.equal(third.length, 1, 'the commit that changes the decision the adoption rests on holds one event naming the adoption'); assert.deepEqual([third[0].actor, third[0].authorKind], [C, 'person']); }
      // should-fix 6: inside a reviewed batch and through a merged alternative — one event each, though the tracker is called for the commit's own command and for each command it carries
      { await confirm(); const c = s.doc().realisation.components.find(x => x.id === store), commands = [{type: 'realisation.component', payload: {...c, purpose: c.purpose + ' In a batch.'}}], seen = naming(await s.read(), id).map(e => e.id);
        const r = await s.ok('workspace.apply', {commands, stamp: previewWorkingChange(s.doc(), commands).stamp, reviewed: true, reason: 'A reviewed batch.'}, C), fresh = naming(r, id).filter(e => !seen.includes(e.id));
        assert.equal(fresh.length, 1, 'a reviewed batch that changes a bound record: one event names the adoption'); assert.equal(fresh[0].actor, C); assert.equal(D.adoptionReading(s.doc(), get()).changed.required, true); }
      { await confirm(); const c = s.doc().realisation.components.find(x => x.id === store), commands = [{type: 'realisation.component', payload: {...c, purpose: c.purpose + ' In an alternative.'}}];
        const saved = await s.ok('workspace.alternative', {commands, stamp: previewScenarioAlternative(s.doc(), commands, undefined).stamp, title: 'An alternative', reason: 'Holds an edit of a bound component.'}, C);
        assert.equal(D.adoptionReading(saved.document, byId(saved.document, id)).changed.required, false, 'an alternative that is only saved changes no bound record');
        const alt = s.doc().workbench.alternatives.at(-1), seen = naming(await s.read(), id).map(e => e.id), r = await s.ok('workspace.merge', {id: alt.id, stamp: rebaseWorkingAlternative(s.doc(), alt).stamp, reviewed: true, reason: 'Merged.'}, B), fresh = naming(r, id).filter(e => !seen.includes(e.id));
        assert.equal(fresh.length, 1, 'a merge that changes a bound record: one event names the adoption'); assert.equal(fresh[0].actor, B); assert.equal(D.adoptionReading(s.doc(), get()).changed.required, true); }
      // a commit that changes nothing the adoption rests on journals nothing of the package
      { const seen = naming(await s.read(), id).length, r = await s.ok('guide.start', {chapter: 1}, B); assert.equal(naming(r, id).length, seen, 'a commit that touches nothing an adoption rests on names none'); }
    } finally { s.close(); }
    // should-fix 6: a bound record that is not a component (an applied task of another kind binds a contract, a data definition and a need)
    { const prior = asWritten(U.upgradeAdoptions(otherKindApplied())), a0 = byId(prior, 'ADP-001'); assert.deepEqual(a0.bindings.map(b => b.recordType), ['component', 'contract', 'data', 'need', 'component']);
      for (const [path, rid] of [['interfaces.data', 'instruction'], ['interfaces.contracts', 'rest'], ['technology.needs', 'TN-001']]) {
        const next = structuredClone(prior), [k, l] = path.split('.'), record = next[k][l].find(x => x.id === rid), events = list(next.changes?.events).length; record.title = (record.title || rid) + ' (changed)';
        pkg().track(prior, next, {type: 'record.edit', payload: {id: rid}}, AT);
        assert.deepEqual(D.adoptionReading(next, byId(next, 'ADP-001')).changed.causes, [{kind: 'binding', id: rid, detail: 'changed'}], 'a change of the bound ' + path + ' record is flagged'); assert.equal(list(next.changes.events).length, events + 1); assert.equal(next.changes.events.at(-1).source.id, 'ADP-001'); } }
    pass('J5: what the tracker changes is journalled — the commit that changes a bound record, the one that changes its driver, the one that changes its decision and the one that reverses the design each hold one change event with the adoption as its source, stamped by the server with who sent the commit and of what kind; the adoption\'s note points at the event; a reversed adoption stays one object of the graph on no trail and takes no further step');
  });

  // ------------------------------------------------------------ J6: no second truth after the acceptance either
  await block('J6 basis after acceptance', async () => {
    pkg(); const id = 'ADP-003', step = (p, type, payload, actor, at = AT) => withFinalReview(commandHandler(type)(structuredClone(p), {type, payload}, at, actor, {author: person(actor)}).document);
    const earlier = p => inheritedFindings(p).filter(f => String(f.id).endsWith('design-source:DES-003')).map(f => f.level), read = p => D.adoptionReading(p, byId(p, id));
    const acceptAs = (p, actor, at) => step(p, 'adoption.accept', {id, revision: byId(p, id).revision, deviationIds: [], note: ''}, actor, at);
    let p = step(upgraded(), 'adoption.reassess', {id, revision: 1, reviewed: true, reason: 'Read.'}, A); byId(p, id).provenance = {reviewed: {by: A, at: AT, how: 'confirmed'}};
    p = acceptAs(p, B, AT); assert.equal(D.adoptionAccepted(p, byId(p, id)), true); assert.deepEqual(earlier(p), [], 'accepted while the earlier path reads the design current');
    // a source of the design changes that the adoption does not rest on by id (another quality driver): the tracker has nothing to flag, and the
    // earlier path raises its finding for the same design, an error
    const prior = p, next = structuredClone(p), other = next.quality.drivers.find(d => d.id !== byId(p, id).scope.driverId && d.id === 'QD-001'); other.response = (other.response || '') + ' Revised.';
    pkg().track(prior, next, {type: 'quality.driver', payload: {id: other.id}}, LATER); p = withFinalReview(next);
    assert.deepEqual(earlier(p), ['error'], 'the earlier path\'s finding for DES-003 stands'); assert.equal(read(p).changed.required, false, 'the tracker flagged nothing: the adoption does not rest on that record by id');
    assert.equal(D.adoptionAccepted(p, byId(p, id)), false, 'an acceptance is not read while the earlier path\'s finding for the same design stands (it was, before this case)');
    { const g = read(p); assert.equal(g.accepted, false); assert.equal(g.label, 'applied · not accepted by a second person'); assert.deepEqual(g.basis, {state: 'changed', findingId: 'design-source:DES-003'}); assert.match(g.acceptance.next, /^ADP-003 rests on DES-003, whose sources changed: that design is reviewed first/); assert.equal(byId(p, id).review.actor, B, 'the step stays on record'); }
    assert.throws(() => acceptAs(p, C, LATER), /ADP-003 rests on DES-003, whose sources changed \(design-source:DES-003 stands\): review that design first/, 'nor is another acceptance taken meanwhile');
    // the earlier path's step re-reads the sources; the acceptance given before that does not stand again: a second person accepts the design as re-read
    const REREAD = '2026-10-07T10:00:00.000Z', t = p.coauthoring.designTasks.find(x => x.id === 'DES-003');
    p = step(p, 'architecture.refresh', {id: t.id, taskRevision: t.revision, reviewed: true, reviewer: 'Synthetic architect', reason: 'Reviewed the current sources of DES-003.', stamp: architectureSourceStamp(p, t)}, A, REREAD);
    assert.deepEqual(earlier(p), [], 'architecture.refresh clears the earlier path\'s finding'); assert.deepEqual(read(p).basis, {state: 'current', findingId: null});
    assert.equal(D.adoptionAccepted(p, byId(p, id)), false, 'an acceptance given before the design\'s sources were re-read does not stand again');
    assert.match(read(p).acceptance.next, /a second signed-in person, who neither applied ADP-003 nor changed its facts, bindings, parameters or deviations, accepts it\.$/i);
    p = acceptAs(p, B, '2026-10-08T10:00:00.000Z'); assert.equal(D.adoptionAccepted(p, byId(p, id)), true, 'accepted again, of the design as re-read'); assert.equal(read(p).label, 'applied · accepted by ' + B);
    // an acceptance and a source review of the same instant: the acceptance is of the design as re-read
    { const d = structuredClone(p); byId(d, id).review.at = REREAD; assert.equal(D.adoptionAccepted(d, byId(d, id)), true); byId(d, id).review.at = '2026-10-07T09:59:59.999Z'; assert.equal(D.adoptionAccepted(d, byId(d, id)), false); }
    pass('J6, after the acceptance: an adoption is not read as accepted while the earlier path\'s finding for the same design stands (a source changed that the tracker does not watch), no acceptance is taken meanwhile, and an acceptance given before architecture.refresh re-read the design does not stand again: a second person accepts the design as re-read');
  });

  // ------------------------------------------------------------ J9, J12: who wrote the records
  await block('J9 SDD provenance', async () => {
    pkg(); const {provenanceReading, architectureMarkdown} = await import('../public/sdd-architecture.js');
    const before = bankPaymentApplied(), after = upgraded(), r0 = provenanceReading(before), r = provenanceReading(after), chapter = (x, n) => x.chapters.find(c => c.chapter === n);
    assert.equal(r.total, r0.total + 3, 'the three adoptions are counted'); assert.equal(r.by.person, r0.by.person, 'and not as written by a person (they were, before the fix-up: ' + r0.by.person + ' became ' + (r0.by.person + 3) + ')');
    assert.equal(r.by.upgrade, 3, 'they are counted as what an upgrade wrote'); assert.ok(!('upgrade' in r0.by), 'a document without such a record has no such count'); assert.equal(r.confirmed, r0.confirmed);
    assert.equal(chapter(r, 3).total, chapter(r0, 3).total + 3, 'under the chapter of their object type (ruling J12)'); assert.equal(chapter(r, 5).total, chapter(r0, 5).total, 'not under Chapter 5'); assert.equal(chapter(r, 3).upgrade, 3); assert.equal(chapter(r, 3).person, chapter(r0, 3).person);
    const text = architectureMarkdown(after).markdown, base = architectureMarkdown(before).markdown, E = t => t.slice(t.indexOf('## E. Provenance'));
    assert.match(E(text), /Written by an upgrade of the project or by a merge, with no author stamp: 3 records\. No person wrote them; none is confirmed by a person\./, 'the SDD counts them on a line of their own: ' + E(text).slice(0, 600));
    assert.ok(!/Written by an upgrade of the project/.test(base), 'a document without such records prints as before'); assert.match(E(text), /3 written by an upgrade of the project or a merge/);
    // once a person has confirmed one, the line says so; it is still not counted as written by a person
    const one = structuredClone(after), x = byId(one, 'ADP-001'); x.confirmed = true; x.provenance = {reviewed: {by: A, at: AT, how: 'confirmed'}};
    const r1 = provenanceReading(withFinalReview(one)); assert.equal(r1.by.upgrade, 3); assert.equal(r1.by.person, r0.by.person); assert.equal(r1.confirmed, r0.confirmed + 1);
    assert.match(E(architectureMarkdown(withFinalReview(one)).markdown), /with no author stamp: 3 records\. No person wrote them; 1 is confirmed by a person since\./);
    // a record a person's step changed is that person's
    const dev = withFinalReview(commandHandler('adoption.deviation')(structuredClone(after), {type: 'adoption.deviation', payload: {id: 'ADP-003', revision: 1, target: {kind: 'role', id: 'store'}, statement: 'A managed store.', reason: 'One team.'}}, AT, C, {author: person(C)}).document); byId(dev, 'ADP-003').provenance = {author: {kind: 'person', by: C, at: AT}};
    const r2 = provenanceReading(withFinalReview(dev)); assert.deepEqual([r2.by.upgrade, r2.by.person], [2, r0.by.person + 1], 'a record a person changed since is counted as that person\'s');
    pass('J9 and J12: the SDD counts the records an upgrade wrote on a line of their own, not as written by a person (' + r0.by.person + ' by a person before and after; 3 by an upgrade), under Chapter 3; a document without such records prints as before; a confirmation is counted as a confirmation, a person\'s change as that person\'s');
  });

  // ------------------------------------------------------------ the browser's side (rulings D7.6, D10, J12)
  // A process that holds what the browser holds: the registry, the list of route stubs and the readers; not worker.js, so not the server's package
  // list and not the upgrade. The stub alone asks for the lazy entry for a document that holds adoptions; once the entry has arrived the package is
  // registered without an upgrade step, and the document reads there as the server reads it.
  await block('browser load', async () => {
    pkg(); const doc = structuredClone(upgraded()); doc.workspace = {...doc.workspace, packages: [PACKAGE]};
    mkdirSync('.aiw-local/rc44-wp2', {recursive: true}); writeFileSync('.aiw-local/rc44-wp2/upgraded.json', JSON.stringify(doc));
    const script = 'import {readFileSync} from "node:fs"; import {EXTENSIONS, ensureExtensions} from "./public/design-extensions.js"; import "./public/design-package-routes.js"; import * as R from "./rc44-s0-readings.mjs"; import {withFinalReview} from "./public/review-domain.js"; import {recordGraph} from "./public/record-graph.js";'
      + 'const doc = JSON.parse(readFileSync(".aiw-local/rc44-wp2/upgraded.json", "utf8")), read = () => withFinalReview(structuredClone(doc), {upgrade: false});'
      + 'const before = EXTENSIONS.map(e => e.id), stub = EXTENSIONS.find(e => e.id === "p40-adoption-route"), needs = !!stub.needs(doc), plain = !!stub.needs(R.reference("bank-payment")), early = recordGraph(read()).objects.has("ADP-001");'
      + 'await ensureExtensions({document: doc}); const e = EXTENSIONS.find(x => x.id === "p40-adoption");'
      + 'console.log(JSON.stringify({before, needs, plain, early, after: EXTENSIONS.map(x => x.id), parts: e ? Object.keys(e).sort() : null, digests: R.digests(read()), old: R.digests(R.reference("bank-payment"))}));';
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], {encoding: 'utf8', maxBuffer: 1 << 26}); assert.equal(r.status, 0, 'the browser-like process: ' + r.stderr.slice(0, 500));
    const out = JSON.parse(r.stdout.trim().split('\n').at(-1));
    assert.deepEqual(out.before, [PACKAGE + '-route'], 'before any document is read the route holds the stub and no package');
    assert.equal(out.needs, true, 'the stub asks for the lazy entry for a document that holds adoptions'); assert.equal(out.plain, false, 'and for none without');
    assert.equal(out.early, false, 'until the entry has arrived no reader knows the adoption (the built-in emitter skips its task): the store loads it before the first draw');
    assert.deepEqual(out.after, [PACKAGE, PACKAGE + '-route'], 'ensureExtensions loads the entry, and the package registers when it arrives');
    assert.deepEqual(out.parts, ['checks', 'commands', 'design', 'hops', 'id', 'layers', 'prefixes', 'provenance', 'records', 'track'], 'the browser\'s package has no upgrade step (ruling J12): the browser reads no old document with it');
    assert.deepEqual(Object.keys(pkg()).sort(), [...out.parts, 'upgrade', 'upgradeNote'].sort(), 'the server\'s is the same package with its upgrade');
    assert.deepEqual(out.digests, digests(asWritten(structuredClone(doc))), 'and the document reads there as the server reads it: graph, model, trails, findings, stamps, readiness, provenance, registers, SDD, ARS');
    assert.deepEqual(out.old, BASE.readings['bank-payment'], 'a document without adoptions reads as at the base with the entry loaded');
    pass('browser load: in a process that holds what the browser holds (the registry, the route stubs, the readers; no server package list), the stub asks for the lazy entry for a document with adoptions, the package registers when the entry arrives, without an upgrade step, and the ten readings of the upgraded document equal the server\'s');
  });

  // ------------------------------------------------------------ size (rulings A3, A4, D7.6, D10)
  await block('size', async () => {
    pkg();
    const {bundleClient, BUDGET} = await import('../client-bundle.mjs');
    const built = await bundleClient('.aiw-local/rc44-wp2/client'), report = built.report, meta = JSON.parse(readFileSync(built.metafile, 'utf8'));
    assert.deepEqual(report.violations, [], 'the client build passes every size gate'); assert.equal(BUDGET.routes.chapters, 3233792, 'the chapters route cap is the one it was'); assert.equal(BUDGET.scripts, 148); assert.equal(report.scripts, 148, '148 script files');
    const HOST = 'public/architecture-task-ui.js', opens = opensWithRecords(meta, HOST, Object.keys(BUDGET.data));
    const holds = Object.entries(meta.outputs).filter(([, o]) => Object.keys(o.inputs || {}).some(i => /public\/adoption-/.test(i))).map(([f]) => f), host = Object.keys(meta.outputs).find(f => meta.outputs[f].entryPoint === HOST);
    assert.deepEqual(holds, [host], 'the package is held in the lazy entry rooted at ' + HOST + ' and nowhere else (ruling D7.6)');
    // ruling J12 (should-fix 12): the browser reads no old document with the upgrade, so the upgrade, its built-in skeletons and the server's registration are in no client output
    const inClient = Object.values(meta.outputs).flatMap(o => Object.keys(o.inputs || {}));
    assert.deepEqual(inClient.filter(i => /adoption-/.test(i)).sort(), ['public/adoption-domain.js', 'public/adoption-package.js'], 'the lazy entry holds the record\'s readers and the registration, and nothing else of the package');
    for (const i of inClient) assert.ok(!/rc44-wp2|design-packages\.js|adoption-server|adoption-upgrade|adoption-builtins|adoption-definitions/.test(i), i + ' is not in the client');
    // The base the allowance is counted against (the lead's task for the fix-up): the integrated base rc44/integration at b59bc88 (S0 as closed, and
    // wp1 S1), built from an archive of that commit with node build.mjs on 2026-11-19. Every route byte of the rows S0 gained by J2, J3 and J10 is wp2's.
    const INTEGRATED = {commit: 'b59bc88 (rc44/integration: S0 closed, wp1 S1 merged)', chapters: 3229840, projects: 506829, scripts: 148, under10k: 53, css: 901873};
    const S0 = JSON.parse(readFileSync('audit/rc44/build-notes/s0-size.json', 'utf8')), measured = {chapters: report.routes.chapters.code, projects: report.routes.projects.code, scripts: report.scripts, under10k: report.buckets.under10k, css: report.css};
    if (process.argv.includes('--measure')) { mkdirSync('audit/rc44/evidence', {recursive: true}); writeFileSync(EVIDENCE, JSON.stringify({schema: 'aiw.rc44.slice-size.v1', name: 'wp2 S1 the adoption record, after its fix-up', measuredWith: 'client-bundle.mjs bundleClient, as node build.mjs builds the client (dist/client-size-report.json: routes.chapters.code)', allowance: {chapters: 600, of: 'all of wp2 (ruling A4), counted against the integrated base; the route bytes of the rows S0 gained by rulings J2, J3 and J10 are wp2\'s', scripts: 148}, caps: {chapters: BUDGET.routes.chapters, scripts: BUDGET.scripts}, before: {name: 'the integrated base', ...INTEGRATED, measured: 'node build.mjs on an archive of the commit, 2026-11-19'}, slice: measured, delta: measured.chapters - INTEGRATED.chapters, projectsDelta: measured.projects - INTEGRATED.projects, headroomAfter: BUDGET.routes.chapters - measured.chapters, firstBuild: {commit: '13a72c2', delta: 304, note: 'the slice as first built, against S0 before its second round'},
      'opens with records': {gate: 'The chapters-route gate measures opening a document that holds no package records (ruling D10).', host: HOST, ...opens, before: {...S0['opens with records'].hosts[HOST], note: 'the lazy entry as S0 measured it, before any package was held in it'}, holds: 'the record\'s readers, steps and tracker (adoption-domain.js) and the registration (adoption-package.js); not the upgrade, which the server alone runs (ruling J12)'}}, null, 1) + '\n'); }
    assert.ok(existsSync(EVIDENCE), 'the slice\'s measurement is kept (node rc44-wp2-adoption-validate.mjs --measure)');
    const size = JSON.parse(readFileSync(EVIDENCE, 'utf8'));
    assert.equal(size.before.chapters, INTEGRATED.chapters, 'the evidence is counted against the integrated base'); assert.equal(size.delta, size.slice.chapters - INTEGRATED.chapters); assert.ok(size.delta > 0 && size.delta <= 600, 'the route delta of wp2 is inside its allowance: ' + size.delta); assert.equal(size.slice.scripts, 148); assert.equal(size.slice.css, INTEGRATED.css, 'no stylesheet rule'); assert.equal(size.slice.under10k, INTEGRATED.under10k);
    assert.ok(size['opens with records'].total === size['opens with records'].route + size['opens with records'].added && size['opens with records'].route === size.slice.chapters);
    assert.ok(size['opens with records'].added < 79189 + 20000, 'the lazy entry grew by the readers only: ' + size['opens with records'].added + ' B beside the route (79,189 B before any package; 97,372 B at the first build, with the upgrade in it)');
    if (process.argv.includes('--measure')) assert.deepEqual(measured, size.slice);
    assert.ok(measured.chapters <= BUDGET.routes.chapters); assert.ok(measured.chapters - INTEGRATED.chapters <= 600, 'this build is inside the allowance of wp2: ' + (measured.chapters - INTEGRATED.chapters) + ' B');
    pass('size: the client build passes every gate with the caps unchanged; wp2 measured ' + size.delta + ' B on the chapters route against the integrated base (' + INTEGRATED.chapters + ' → ' + size.slice.chapters + ' of ' + BUDGET.routes.chapters + '; allowance of wp2: 600 B), 148 script files, no stylesheet rule; the package is held in the lazy entry of ' + HOST + ' without the upgrade; opens with records: ' + size['opens with records'].total + ' B (' + size['opens with records'].added + ' B in ' + size['opens with records'].files + ' scripts beside the route); this build: ' + measured.chapters + ' B');
  });
  if (h) h.close();
}
