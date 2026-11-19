// AIW rc44, wp2 slice S1: the adoption record, its readers and the upgrade (audit/rc44/design/wp2-adoption.md §g S1,
// §e.3; the lead's rulings of 2026-11-18, sections A, D and F; the registration contract in
// audit/rc44/build-notes/s0-extensions.md). The cases, in the order the design lists them:
//   old documents   the three references and the document with a review list read byte for byte as at the base, with
//                   the package registered and no adoption in them;
//   upgrade         the Bank Payment reference with three applied tasks yields three adoptions with the tasks'
//                   obligations by id, as design e.3 says, once;
//   e.3 rules 1-5   no guarantee appears, no stamp moves, no verification is lost, a storage upgrade and not a design
//                   change, a frozen source is not upgraded;
//   rows            architectureObligationsFor answers the same rows before and after;
//   trace           the adoption on the layer `mechanism`, linkedVia 'binds', the built-in layers as they were;
//   accept          a second signed-in person: refused for the confirmer, an agent account, a draft by Sol and no
//                   actor; an upgraded adoption no person has stood behind needs a person's confirmation first
//                   (ruling F4); the projection (a save left in, a save left out: ruling D7.1); the step is kept under
//                   `review` and a copy from a template clears it (ruling F3); it lapses when a deviation is added;
//   tracker         retiring a bound store raises adoption-role-broken in the same commit — the case that fails
//                   today: "retire the store an applied outbox design placed its commit obligation on; a finding
//                   names the applied mechanism";
//   withdraw, definitions, registration, size.
import assert from 'node:assert/strict';
import {readFileSync, existsSync, writeFileSync, mkdirSync} from 'node:fs';
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
    pass('old documents: the three references and the document with a review list read byte for byte as at ' + BASE.capturedFrom + ' with the package registered (graph, model, trails, findings, stamps, readiness, provenance, registers, SDD, ARS); no key is created; a task that was never applied is left alone');
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
    const read = await h.read(B);
    assert.equal(read.revision, before.revision + 1, 'the first read stores the upgrade'); assert.deepEqual(records(read.document).map(a => [a.id, a.origin, a.status]), [['ADP-001', 'upgrade', 'applied'], ['ADP-002', 'upgrade', 'applied'], ['ADP-003', 'upgrade', 'applied']]);
    assert.deepEqual(read.document.workspace.packages, [PACKAGE]); assert.deepEqual(read.document.coauthoring.designTasks.map(t => t.adoptionId), ['ADP-001', 'ADP-002', 'ADP-003']);
    assert.equal(points(), pointsBefore + 1, 'with a recovery point that keeps the row as it was');
    const point = JSON.parse([...h.files.entries()].filter(([k]) => k.startsWith('upgrades/')).at(-1)[1]); assert.equal(point.revision, before.revision); assert.equal(point.document, before.document);
    const events = (await env.DB.prepare('SELECT document FROM project_activity WHERE owner_id=? AND project_id=?').bind(A, pid).all()).results.map(r => JSON.parse(r.document)).filter(e => e.kind === 'storage');
    assert.equal(events.length, 1, 'recorded once in the activity, as a storage upgrade'); assert.ok(events[0].summary.endsWith(' ' + pkg().upgradeNote), 'whose words end with what the step did: ' + events[0].summary.slice(-140));
    assert.equal(list(read.document.changes?.events).length, journal, 'and not as a design change: the journal holds no event of it');
    await h.read(A); await h.read(B); assert.equal(h.state.revision, read.revision, 'a later read stores nothing'); assert.equal(points(), pointsBefore + 1);
    assert.equal((await env.DB.prepare('SELECT document FROM project_activity WHERE owner_id=? AND project_id=?').bind(A, pid).all()).results.map(r => JSON.parse(r.document)).filter(e => e.kind === 'storage').length, 1);
    h.ready = true;
    pass('e.3 rule 4: a row stored before the adoption record is stored again at its first read, once, as a storage upgrade with a recovery point that keeps the row as it was and with the step\'s sentence in the activity; the design journal holds no event of it; the document names p40-adoption. A design applied on this build through the earlier commands is an adoption from its own commit');
  });

  await block('accept', async () => {
    need(); const id = 'ADP-001', design = () => reviewSourceStamp(withFinalReview(structuredClone(h.doc()))), stamp = design();
    // ruling F4: no person has stood behind an upgraded adoption (it carries no author stamp, and its applier is a typed name)
    { const r = await accept(id, B); assert.equal(r.status, 400, JSON.stringify(r.body).slice(0, 300)); assert.match(r.error, /ADP-001 names no author/, 'the one rule refuses a record that names no author: ' + r.error); assert.ok(!adp(id).review); }
    assert.match(D.adoptionReading(h.doc(), adp(id)).acceptance.next, /signed-in person confirms it .*adoption\.reassess.*second person accepts/i, 'the package says in its own words which step comes first');
    // the person-only step that confirms it: adoption.reassess
    { const r = await h.send('adoption.reassess', {id, revision: rev(id), reviewed: true, reason: 'x'}, AGENT); assert.equal(r.status, 400); assert.match(r.error, /agent or service account does not review, confirm, accept or approve/); }
    { const r = await h.send('adoption.reassess', {id, revision: rev(id), reviewed: true, reason: 'Read against the model.'}, A, {authorKind: 'sol-draft'}); assert.equal(r.status, 400, 'a draft by Sol confirms nothing: ' + JSON.stringify(r.body).slice(0, 200)); }
    { const r = await h.send('adoption.reassess', {id, revision: rev(id), reason: 'Read against the model.'}, A); assert.equal(r.status, 400); assert.match(r.error, /reviewed/i); }
    { const r = await h.send('adoption.reassess', {id, revision: 7, reviewed: true, reason: 'Read against the model.'}, A); assert.equal(r.status, 400); assert.match(r.error, /This adoption changed\. Reopen it; your input is retained\./); }
    await reassess(id, A);
    assert.equal(adp(id).confirmed, true); assert.deepEqual([adp(id).provenance?.reviewed?.by, adp(id).provenance?.reviewed?.how], [A, 'confirmed'], 'the boundary stamps who confirmed'); assert.equal(adp(id).revision, 1, 'a confirmation changes nothing the record says');
    assert.deepEqual(D.acceptanceSubject(adp(id)), {id, actor: A, history: [{revision: 1, actor: A}]}, 'the projection names who stands behind the applied record');
    // refused: the confirmer, an agent account, a draft by Sol, no actor
    { const r = await accept(id, A); assert.equal(r.status, 400); assert.match(r.error, /A second signed-in person, who did not write or own the action, verifies it\. architect-a wrote ADP-001\./, 'the one rule\'s sentence (ruling A5)'); }
    { const r = await accept(id, AGENT); assert.equal(r.status, 400); assert.match(r.error, /agent or service account does not review, confirm, accept or approve \(adoption\.accept\)/); }
    { const r = await accept(id, B, {}, {authorKind: 'sol-draft'}); assert.equal(r.status, 400); }
    assert.throws(() => commandHandler('adoption.accept')(structuredClone(h.doc()), {type: 'adoption.accept', payload: {id, revision: 1, deviationIds: [], note: ''}}, AT, null, {author: null}), /Sign in: adoption\.accept is a signed-in person.s step\./);
    assert.throws(() => commandHandler('adoption.accept')(structuredClone(h.doc()), {type: 'adoption.accept', payload: {id, revision: 1, deviationIds: [], note: ''}}, AT, AGENT, {author: {kind: 'person', id: AGENT, account: 'agent'}}), /signed-in person.s step/);
    { const r = await accept(id, B, {revision: 9}); assert.equal(r.status, 400); assert.match(r.error, /This adoption changed/); }
    { const r = await accept(id, B, {deviationIds: ['ADP-001:DEV-09']}); assert.equal(r.status, 400); assert.match(r.error, /deviation/i); }
    assert.ok(!adp(id).review, 'a refused request accepts nothing');
    // accepted by a second person
    { const r = await accept(id, B); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); assert.equal(r.body.selected, id); }
    const a = adp(id);
    assert.deepEqual({actor: a.review.actor, account: a.review.account, revision: a.review.revision, deviationIds: a.review.deviationIds, note: a.review.note}, {actor: B, account: 'person', revision: 1, deviationIds: [], note: 'Read against the model.'}, 'the step is kept under the record\'s key review, with the account kind the boundary handed to apply (ruling F3, D7.1)');
    assert.ok(!('acceptance' in a)); assert.equal(a.status, 'applied', 'the stored status is not moved by the step: accepted is read, never stored'); assert.equal(a.revision, 1);
    assert.deepEqual([a.provenance?.reviewed?.by, a.provenance?.author ?? null], [A, null], 'the stamps of who stands behind the record are as they were');
    const g = D.adoptionReading(h.doc(), a); assert.equal(g.accepted, true); assert.equal(g.label, 'applied · accepted by ' + B); assert.equal(D.adoptionAccepted(h.doc(), a), true);
    assert.ok(!own(chapter5(withFinalReview(structuredClone(h.doc())))).some(f => f.objectId === id), 'the finding is gone');
    // the reader calls the one rule on the same projection with the stored step and requires a person's
    for (const [why, edit] of [['the confirmer', x => { x.review.actor = A; }], ['an agent account', x => { x.review.account = 'agent'; }], ['no account kind', x => { delete x.review.account; }], ['no actor', x => { x.review.actor = ''; }], ['another revision', x => { x.review.revision = 2; }], ['a status written by hand', x => { delete x.review; x.status = 'accepted'; }]]) {
      const d = structuredClone(h.doc()), x = byId(d, id); edit(x); assert.equal(D.adoptionAccepted(d, x), false, 'not accepted when the stored step names ' + why);
    }
    assert.equal(verifierRefusal(D.acceptanceSubject(a), a.review.actor, a.review.account), null);
    assert.equal(design(), stamp, 'confirming and accepting an adoption that reads as it was upgraded changes nothing the design says: the design fingerprint is where it was');
    // it is not undone, and a second acceptance is refused
    { const r = await accept(id, C); assert.equal(r.status, 400); assert.match(r.error, /already accepted/i); }
    pass('accept: an upgraded adoption no person has stood behind is refused by the one rule until a signed-in person confirms it with adoption.reassess (ruling F4: the person-only step that confirms; an agent account and a draft by Sol confirm nothing); then adoption.accept is refused for the confirmer, an agent account, a draft by Sol and no actor, and taken for a second person; the step is kept under review with the account kind, the status and the stamps stay; the reader requires a person\'s step that the one rule finds independent');
  });

  await block('deviation', async () => {
    need(); const id = 'ADP-001';
    { const r = await h.send('adoption.deviation', {id, revision: rev(id), target: {kind: 'role', id: 'relay'}, statement: 'The relay runs inside the Payment service process.', reason: 'One deployment unit is all the team operates.'}, AGENT); assert.equal(r.status, 400); }
    { const r = await h.send('adoption.deviation', {id, revision: rev(id), target: {kind: 'role', id: 'no-such-role'}, statement: 'x', reason: 'y'}, C); assert.equal(r.status, 400); assert.match(r.error, /not .*this definition|Choose/i); }
    { const r = await h.send('adoption.deviation', {id, revision: rev(id), target: {kind: 'role', id: 'relay'}, statement: 'The relay runs inside the Payment service process.', reason: ''}, C); assert.equal(r.status, 400); assert.match(r.error, /reason/i); }
    { const r = await h.send('adoption.deviation', {id, revision: rev(id), target: {kind: 'role', id: 'relay'}, statement: 'x'.repeat(2001), reason: 'y'}, C); assert.equal(r.status, 400, 'a text past its bound is refused, never cut'); }
    const design = () => reviewSourceStamp(withFinalReview(structuredClone(h.doc()))), stamp = design();
    await h.ok('adoption.deviation', {id, revision: rev(id), target: {kind: 'role', id: 'relay'}, statement: 'The relay runs inside the Payment service process.', reason: 'One deployment unit is all the team operates.'}, C);
    let a = adp(id); assert.notEqual(design(), stamp, 'a deviation is a design change: the adoption joins the design source and the design fingerprint moves');
    assert.deepEqual(a.deviations.map(d => [d.id, d.target, d.by, d.statement]), [['ADP-001:DEV-01', {kind: 'role', id: 'relay'}, C, 'The relay runs inside the Payment service process.']]); assert.equal(a.revision, 2);
    // the acceptance lapses
    assert.equal(D.adoptionAccepted(h.doc(), a), false, 'an acceptance lapses when a deviation is added'); assert.equal(a.review.actor, B, 'the lapsed step stays on record'); assert.equal(a.status, 'applied');
    assert.equal(D.adoptionReading(h.doc(), a).label, 'applied · not accepted by a second person');
    assert.deepEqual(own(chapter5(withFinalReview(structuredClone(h.doc())))).filter(f => f.objectId === id).map(f => [f.code, f.level]).sort(), [['adoption-acceptance', 'warning'], ['adoption-deviation-unreviewed', 'warning']]);
    assert.deepEqual([a.provenance.author.kind, a.provenance.author.by, a.provenance.reviewed ?? null, a.confirmed], ['person', C, null, false], 'the record as it stands is C\'s: the earlier confirmation is gone');
    // a save left in: who wrote a deviation is refused by the one rule, whoever confirms the record afterwards
    assert.deepEqual(D.acceptanceSubject(a).history, [{revision: 1, actor: A}, {revision: 2, actor: C}]);
    { const r = await accept(id, C); assert.equal(r.status, 400); assert.match(r.error, /architect-c wrote ADP-001/); }
    await reassess(id, A);
    { const r = await accept(id, C); assert.equal(r.status, 400); assert.match(r.error, /architect-c wrote ADP-001/, 'left in: the deviation\'s author is not the second person'); }
    // a save left out: discharging an obligation changes nothing the acceptance covers (facts, bindings, parameters, deviations)
    const duty = a.obligations.find(o => o.id === 'DES-001:delivery-recovery');
    { const r = await h.send('adoption.obligation', {id, revision: rev(id), obligationId: duty.id, dischargedBy: 'no-such-record'}, B); assert.equal(r.status, 400); assert.match(r.error, /record/i); }
    { const r = await h.send('adoption.obligation', {id, revision: rev(id), obligationId: 'DES-001:nope', dischargedBy: 'obj-002'}, B); assert.equal(r.status, 400); }
    await h.ok('adoption.obligation', {id, revision: rev(id), obligationId: duty.id, dischargedBy: 'obj-002'}, B);
    a = adp(id); assert.deepEqual([a.obligations.find(o => o.id === duty.id).dischargedBy.recordId, a.obligations.find(o => o.id === duty.id).dischargedBy.by, a.revision], ['obj-002', B, 3]);
    assert.deepEqual(D.acceptanceSubject(a).history, [{revision: 1, actor: A}, {revision: 2, actor: C}], 'left out: the projection does not name who discharged an obligation');
    assert.equal(verifierRefusal(D.acceptanceSubject(a), B, 'person'), null);
    // the boundary still asks for two persons behind the record as it stands (ruling D1): B wrote its last save
    { const r = await accept(id, B); assert.equal(r.status, 400); assert.match(r.error, /A second person.s step needs two persons/); }
    await reassess(id, A);
    { const r = await accept(id, B, {deviationIds: []}); assert.equal(r.status, 400); assert.match(r.error, /deviation/i, 'each deviation is acknowledged by id'); }
    { const r = await accept(id, B); assert.equal(r.status, 200, 'left out: who discharged an obligation may accept once another person stands behind the record: ' + JSON.stringify(r.body).slice(0, 300)); }
    a = adp(id); assert.deepEqual([a.review.actor, a.review.revision, a.review.deviationIds], [B, 3, ['ADP-001:DEV-01']]); assert.equal(D.adoptionAccepted(h.doc(), a), true);
    assert.deepEqual(own(chapter5(withFinalReview(structuredClone(h.doc())))).filter(f => f.objectId === id), [], 'the deviation is reviewed with the acceptance that names it');
    // a deviation is withdrawn with a reason, never deleted
    { const r = await h.send('adoption.deviation', {id, revision: rev(id), deviationId: 'ADP-001:DEV-01', withdrawn: true, reason: ''}, C); assert.equal(r.status, 400); }
    await h.ok('adoption.deviation', {id, revision: rev(id), deviationId: 'ADP-001:DEV-01', withdrawn: true, reason: 'The relay became a worker of its own.'}, C);
    a = adp(id); assert.equal(a.deviations.length, 1); assert.equal(a.deviations[0].withdrawn.by, C); assert.equal(D.adoptionAccepted(h.doc(), a), false);
    pass('deviation: a signed-in person records a deviation against a role of the definition, with a reason; the acceptance lapses (the step stays on record) and adoption-deviation-unreviewed joins adoption-acceptance; ruling D7.1 — a save left in: the deviation\'s author is refused by the one rule whoever confirms afterwards; a save left out: who discharged an obligation is not named by the projection and accepts once another person stands behind the record (ruling D1 asked first); each deviation is acknowledged by id; a deviation is withdrawn, never deleted');
  });

  await block('template copy', async () => {
    need();
    // ADP-002 confirmed by A and accepted by B in this project
    await reassess('ADP-002', A); { const r = await accept('ADP-002', B); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); }
    const p = withFinalReview(structuredClone(h.doc())); assert.equal(D.adoptionAccepted(p, byId(p, 'ADP-002')), true);
    assertTemplateCopyClearsSteps(p, records);
    const copy = instantiateTemplate(withFinalReview({...p, workspace: {...p.workspace, reusableTemplate: true}}), 'template-copy', 'A copy', LATER), x = byId(copy, 'ADP-002');
    assert.deepEqual([x.review, x.applied, x.confirmed, x.history], [null, null, false, []], 'the copy holds the record without the steps taken in the template');
    assert.equal(D.adoptionAccepted(copy, x), false); const g = D.adoptionReading(copy, x); assert.equal(g.accepted, false); assert.match(g.label, /not applied or accepted in this project/);
    assert.ok(own(chapter5(copy)).some(f => f.id === 'adoption-acceptance:ADP-002'), 'the finding is back in the copy');
    assert.deepEqual(D.acceptanceSubject(x), {id: 'ADP-002', actor: null, history: []}); assert.match(verifierRefusal(D.acceptanceSubject(x), B, 'person'), /names no author/);
    assertFindingIdsUnique(copy);
    pass('template copy (ruling F3): the acceptance is kept under review, which a project made from a template clears (assertTemplateCopyClearsSteps); in the copy the adoption reads "not applied or accepted in this project", its finding is back, and nobody stands behind it until a person confirms it there');
  });

  await block('tracker', async () => {
    need(); const id = 'ADP-003';
    // the persistence design bound obj-005 as its store and placed its commit obligation on it
    await reassess(id, A); { const r = await accept(id, B); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); }
    let a = adp(id); const store = a.bindings.find(b => b.roleId === 'store').recordId; assert.ok(a.obligations.some(o => o.id === 'DES-003:persistence-commit' && o.targetIds.includes(store)), 'the commit obligation rests on the store');
    assert.equal(D.adoptionAccepted(h.doc(), a), true);
    // a change of a bound record is flagged in the same commit, and the acceptance lapses until a person reassesses
    const component = h.doc().realisation.components.find(c => c.id === store);
    await h.ok('realisation.component', {...component, purpose: component.purpose + ' Sized for the settlement peak.'}, C);
    a = adp(id); let g = D.adoptionReading(h.doc(), a);
    assert.equal(g.changed.required, true, 'the commit that changed the bound store flags the adoption'); assert.deepEqual(g.changed.causes.map(c => [c.kind, c.id, c.detail]), [['binding', store, 'changed']]);
    assert.equal(g.accepted, false); assert.equal(a.revision, 1, 'the tracker changes neither the revision'); assert.equal(a.status, 'applied', 'nor the status'); assert.equal(a.review.actor, B, 'nor the acceptance on record');
    assert.deepEqual(own(chapter5(withFinalReview(structuredClone(h.doc())))).filter(f => f.objectId === id).map(f => [f.code, f.level]).sort(), [['adoption-acceptance', 'warning'], ['adoption-basis', 'warning']]);
    { const r = await accept(id, B); assert.equal(r.status, 400); assert.match(r.error, /reassess/i, 'accept is refused while a change is not reassessed'); }
    await reassess(id, A); g = D.adoptionReading(h.doc(), adp(id)); assert.equal(g.changed.required, false); assert.equal(g.accepted, false, 'an acceptance given before the change does not stand again'); { const r = await accept(id, B); assert.equal(r.status, 200); }
    // the case that fails today: retire the store; a finding names the applied mechanism — in the commit that retires it
    const naming = (d, x) => COLLECTIONS.flatMap(([path]) => { const [k, l] = path.split('.'), v = l ? d?.[k]?.[l] : d?.[k]; return list(v).filter(r => r && r.id !== x && JSON.stringify({...r, history: 0, provenance: 0, sourceSnapshot: 0}).includes('"' + x + '"')).map(r => r.id); });
    let commits = 0, last = null;
    const retire = async x => { for (let i = 0; i < 60; i++) { const r = await h.send('record.retire', {id: x, reason: 'Replaced by a managed service.'}, C); if (r.status === 200) { commits++; last = r.body; return; } assert.match(r.error, /still named by/, r.error); const next = naming(h.doc(), x)[0]; assert.ok(next, 'a record names ' + x); await retire(next); await h.read(); } throw Error('could not retire ' + x); };
    await h.read(); await retire(store);
    assert.ok(!last.document.realisation.components.some(c => c.id === store), 'the store is retired'); assert.ok(commits > 1);
    const doc = last.document; a = byId(doc, id); g = D.adoptionReading(doc, a);
    const findings = chapter5(withFinalReview(structuredClone(doc))), broken = findings.find(f => f.id === 'adoption-role-broken:' + id);
    assert.ok(broken, 'the document the retiring commit answers holds adoption-role-broken: ' + JSON.stringify(own(findings).map(f => f.id)));
    assert.equal(broken.level, 'error'); assert.equal(broken.objectId, id); assert.ok(broken.detail.includes(id) && broken.detail.includes(a.title) && broken.detail.includes('store') && /retired/.test(broken.detail), 'the finding names the applied mechanism, the role and what happened: ' + broken.detail);
    assert.ok(broken.detail.includes('DES-003:persistence-commit'), 'and the obligations that rest on the record');
    assert.ok(inheritedFindings(withFinalReview(structuredClone(doc))).some(f => String(f.id).endsWith('adoption-role-broken:' + id)), 'the review inherits it');
    assert.deepEqual(g.roles.find(r => r.roleId === 'store'), {roleId: 'store', required: true, state: 'broken', recordIds: [store], issues: ['retired']});
    assert.ok(g.changed.required && g.changed.causes.some(c => c.kind === 'binding' && c.id === store && c.detail === 'retired'), 'the tracker recorded the cause in the commit: ' + JSON.stringify(g.changed)); assert.equal(g.accepted, false);
    const marker = a.history.at(-1); assert.deepEqual([marker.event, marker.actor, marker.revision], ['changed', null, 1], 'the marker is the tracker\'s: who sent the commit is in the journal');
    assert.ok(!recordGraph(withFinalReview(structuredClone(doc))).relationships.some(e => e.from === id && e.to === store), 'no relation is stated to a record that left');
    { const r = await accept(id, B); assert.equal(r.status, 400); }
    // the other adoptions, which do not bind the store, are not flagged
    assert.equal(D.adoptionReading(doc, byId(doc, 'ADP-002')).changed.required, false);
    assertFindingIdsUnique(withFinalReview(structuredClone(doc)));
    // restoring the store does not make the acceptance stand again: a person reassesses
    await h.ok('record.restore', {id: store}, C); g = D.adoptionReading(h.doc(), adp(id)); assert.equal(g.roles.find(r => r.roleId === 'store').state, 'bound'); assert.equal(g.changed.required, true); assert.equal(g.accepted, false);
    pass('tracker — the case that fails today ("retire the store an applied design placed its commit obligation on; a finding names the applied mechanism"): the commit that retires the bound store answers a document with adoption-role-broken (an error) naming the adoption, its title, the role and the obligations that rest on the record; a change of a bound record is flagged in its own commit and lapses the acceptance until a person reassesses and a second person accepts again; the tracker moves neither revision, status nor the step on record; other adoptions are not flagged');
  });

  await block('withdraw', async () => {
    need(); const id = 'ADP-002', rows = d => architectureObligationsFor(withFinalReview(structuredClone(d))).filter(o => o.taskId === 'DES-002').length;
    // the tracker, called as the server calls it, on the outbox (ADP-001): its store is retired; and a design the earlier path reverses
    { const prior = withFinalReview(structuredClone(h.doc())), next = structuredClone(h.doc()), a = byId(next, 'ADP-001'), store = a.bindings.find(b => b.roleId === 'store').recordId, c = next.realisation.components.find(x => x.id === store);
      next.realisation.components = next.realisation.components.filter(x => x !== c); if (next.logical.assets) next.logical.assets = next.logical.assets.filter(x => x.id !== store); (next.retired ??= {records: []}).records.push({id: store, path: 'realisation.components', chapter: 5, record: c, at: AT, actor: C, reason: 'Replaced.'});
      pkg().track(prior, next, {type: 'record.retire', payload: {id: store}}, AT); pkg().track(prior, next, {type: 'record.retire', payload: {id: store}}, AT);
      const g = D.adoptionReading(next, a), f = g.findings.find(x => x.code === 'adoption-role-broken');
      assert.ok(f && f.detail.includes('ADP-001') && f.detail.includes(a.title) && f.detail.includes('“store”') && f.detail.includes('DES-001:effect-1'), 'retire the store an applied outbox design bound: a finding names the applied mechanism: ' + f?.detail);
      assert.deepEqual(g.changed.causes.filter(x => x.id === store), [{kind: 'binding', id: store, detail: 'retired'}], 'the tracker is idempotent within a commit');
      const back = structuredClone(h.doc()), t = back.coauthoring.designTasks.find(x => x.id === 'DES-001'); t.status = 'dismissed';
      pkg().track(prior, back, {type: 'alternative.rollback', payload: {}}, AT);
      assert.deepEqual([byId(back, 'ADP-001').status, byId(back, 'ADP-001').history.at(-1).event], ['reversed', 'reverse'], 'a design the earlier path reverses takes its adoption with it, in the same commit');
      assert.equal(D.adoptionReading(back, byId(back, 'ADP-001')).label, 'reversed'); assert.deepEqual(D.adoptionFindings(back).filter(x => x.objectId === 'ADP-001'), []);
      const fresh = structuredClone(prior); delete fresh.adoptions; pkg().track(fresh, next, {type: 'record.retire', payload: {id: store}}, LATER); assert.equal(byId(next, 'ADP-002').history.some(x => x.event === 'changed' && x.at === LATER), false, 'an adoption a commit wrote is not flagged by that commit');
      const none = structuredClone(reference('bank-payment')), text = JSON.stringify(none); pkg().track(none, none, {type: 'record.retire', payload: {}}, AT); assert.equal(JSON.stringify(none), text, 'the tracker writes nothing into a document without adoptions'); }
    assert.equal(rows(h.doc()), 6);
    { const r = await h.send('adoption.withdraw', {id, revision: rev(id), reason: ''}, C); assert.equal(r.status, 400); assert.match(r.error, /reason/i); }
    { const r = await h.send('adoption.withdraw', {id, revision: rev(id), reason: 'Withdrawn.'}, AGENT); assert.equal(r.status, 400); }
    await h.ok('adoption.withdraw', {id, revision: rev(id), reason: 'The call is replaced by an asynchronous exchange.'}, C);
    const doc = h.doc(), a = adp(id), task = doc.coauthoring.designTasks.find(t => t.id === 'DES-002');
    assert.deepEqual([a.status, a.history.at(-1).event, a.history.at(-1).actor, a.history.at(-1).note], ['withdrawn', 'withdraw', C, 'The call is replaced by an asynchronous exchange.']); assert.equal(records(doc).length, 3, 'nothing is deleted');
    assert.deepEqual([task.status, task.adoptionId, !!task.applied], ['dismissed', id, true], 'the task the adoption was upgraded from no longer stands as applied; its record of what was applied stays');
    assert.equal(rows(doc), 0, 'its obligations close with it: no reader lists them as accepted');
    const g = D.adoptionReading(doc, a); assert.equal(g.label, 'withdrawn'); assert.equal(g.accepted, false);
    const p = withFinalReview(structuredClone(doc)); assert.ok(!own(chapter5(p)).some(f => f.objectId === id), 'a withdrawn adoption raises nothing'); assert.ok(!recordGraph(p).objects.has(id) && !recordGraph(p).objects.has('DES-002'), 'and is on no trail');
    assert.ok(doc.realisation.components.some(c => c.id === 'core-adapter'), 'the records it bound stay');
    for (const type of ['adoption.accept', 'adoption.reassess', 'adoption.deviation', 'adoption.withdraw']) { const r = await h.send(type, {id, revision: rev(id), reviewed: true, reason: 'x', deviationIds: [], target: {kind: 'role', id: 'caller'}, statement: 'x'}, B); assert.equal(r.status, 400, type + ' on a withdrawn adoption'); assert.match(r.error, /withdrawn/); }
    h.close(); h = null;
    pass('withdraw: a signed-in person withdraws an adoption with a reason; the record stays with its history, the records it bound stay, the task it was upgraded from no longer stands as applied and its obligations are listed by no reader; a withdrawn adoption takes no further step. The tracker as the server calls it: retiring the store the applied outbox bound names the mechanism; a design the earlier path reverses takes its adoption with it; nothing is written into a document without adoptions');
  });

  // ============================================================ the fix-up (the lead's rulings J1 to J12 of 2026-11-19)
  // ------------------------------------------------------------ J1: the applier is named
  await block('J1 applier', async () => {
    pkg(); const s = await server(worker);
    try {
      // A applies the three designs through the earlier path; each is an adoption from its own commit
      const doc = await s.apply(), id = 'ADP-001', a0 = byId(doc, id), get = () => byId(s.doc(), id), rev1 = () => get().revision;
      const acc = (as, extra = {}) => s.send('adoption.accept', {id, revision: rev1(), deviationIds: [], note: 'Read against the model.', ...extra}, as);
      const confirm = as => s.send('adoption.reassess', {id, revision: rev1(), reviewed: true, reason: 'Read against the model as it stands.'}, as);
      assert.ok(a0.applied.changeIds.length && doc.changes.events.filter(e => a0.applied.changeIds.includes(e.id)).every(e => e.actor === A && e.authorKind === 'person'), 'the journal events the applied task names say who sent the apply');
      // the projection names the applier, read from the journal events the task names, and the owner
      const subject = D.acceptanceSubject(get(), s.doc());
      assert.deepEqual(subject, {id, actor: A, owner: a0.owner, history: [{revision: 1, actor: A}]}, 'the projection names the signed-in applier and the owner');
      assert.match(verifierRefusal(subject, A, 'person'), /architect-a wrote ADP-001/); assert.equal(verifierRefusal(subject, B, 'person'), null);
      // the applier is refused by the one rule before and after another person confirms; the confirmer by the two-persons rule
      { const r = await acc(A); assert.equal(r.status, 400); assert.match(r.error, /A second signed-in person, who did not write or own the action, verifies it\. architect-a wrote ADP-001\./, 'the applier is not the second person: ' + r.error); }
      { const r = await acc(B); assert.equal(r.status, 400); assert.match(r.error, /A second person.s step needs two persons: no person other than architect-b stands behind ADP-001/, 'an adoption the upgrade wrote carries no author stamp: a person confirms it first (ruling F4): ' + r.error); }
      { const r = await confirm(B); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); }
      // the applier is on the record for good from the next commit on (the tracker reads the journal), as bookkeeping
      assert.deepEqual(get().history.filter(x => x.event === 'apply').map(x => [x.actor, x.identity, x.revision]), [[A, 'journal', 1]], 'the applier is recorded on the adoption, named by the journal');
      assert.deepEqual([get().provenance?.reviewed?.by, get().provenance?.author ?? null, get().revision], [B, null, 1], 'naming the applier is bookkeeping: no author stamp, no revision');
      { const r = await acc(A); assert.equal(r.status, 400, 'A applies, B confirms: A\'s accept is refused (it was taken before the fix-up)'); assert.match(r.error, /architect-a wrote ADP-001/); assert.ok(!get().review); }
      { const r = await acc(B); assert.equal(r.status, 400); assert.match(r.error, /needs two persons/, 'the confirmer is the only person behind the record as it stands'); }
      { const r = await acc(C); assert.equal(r.status, 200, 'a person who neither applied nor is the only one behind the record accepts: ' + JSON.stringify(r.body).slice(0, 300)); }
      assert.equal(D.adoptionAccepted(s.doc(), get()), true); assert.equal(D.adoptionReading(s.doc(), get()).label, 'applied · accepted by ' + C);
      // the reader holds the same rule on the stored step: an acceptance by the applier does not count
      { const d = structuredClone(s.doc()), x = byId(d, id); x.review.actor = A; assert.equal(D.adoptionAccepted(d, x), false, 'a stored acceptance by the applier does not stand'); }
      // the owner is handed to the one rule (should-fix 1)
      { const x = byId(s.doc(), 'ADP-002'); assert.ok(x.owner, 'ADP-002 has an owner: ' + x.owner); const sub = D.acceptanceSubject(x, s.doc()); assert.equal(sub.owner, x.owner); assert.match(verifierRefusal(sub, x.owner.toUpperCase().replace(/ /g, '-'), 'person'), /owns ADP-002/, 'the owner of an adoption does not accept it'); }
      // two persons suffice: the applier confirms what the upgrade wrote, a second person accepts
      { const two = 'ADP-003', r3 = () => byId(s.doc(), two).revision;
        assert.equal((await s.send('adoption.reassess', {id: two, revision: r3(), reviewed: true, reason: 'Read against the model as it stands.'}, A)).status, 200);
        const r = await s.send('adoption.accept', {id: two, revision: r3(), deviationIds: [], note: ''}, B); assert.equal(r.status, 200, 'A applied and confirmed, B accepts: ' + JSON.stringify(r.body).slice(0, 300)); }
    } finally { s.close(); }
    // where the journal names nobody (a document whose events carry no actor), a person confirms first, as before
    const old = upgraded(), x = byId(old, 'ADP-001');
    assert.deepEqual(D.acceptanceSubject(x, old), {id: 'ADP-001', actor: null, owner: x.owner, history: []}); assert.match(verifierRefusal(D.acceptanceSubject(x, old), B, 'person'), /names no author/);
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
      assert.equal(baselineCurrent(u, frozen), false, 'a deviation is a change since the baseline'); assert.equal(finalChecksCurrent(u), false); }
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
    { const d = structuredClone(up), x = byId(d, 'ADP-001'); x.confirmed = true; x.history.push({n: 2, at: AT, event: 'reassess', actor: A, revision: 1}); x.review = {actor: B, at: AT, account: 'person', revision: 1, seq: 2, note: '', deviationIds: []};
      assert.equal(D.adoptionAccepted(asWritten(d), byId(d, 'ADP-001')), true);
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
      await s.apply(); const id = 'ADP-003', get = () => byId(s.doc(), id), naming = body => list(body.document.changes?.events).filter(e => e.source?.id === id);
      const store = get().bindings.find(b => b.roleId === 'store').recordId, component = s.doc().realisation.components.find(c => c.id === store);
      // a change of a bound record: one event names the adoption, with who sent the commit
      const had = naming(await s.read()).map(e => e.id);
      const changed = await s.ok('realisation.component', {...component, purpose: component.purpose + ' Sized for the settlement peak.'}, C), mine = naming(changed).filter(e => !had.includes(e.id));
      assert.equal(mine.length, 1, 'the commit that changes a bound record holds one event naming the adoption: ' + JSON.stringify(naming(changed).map(e => e.id)));
      assert.deepEqual([mine[0].actor, mine[0].authorKind, mine[0].source.id, mine[0].source.chapter], [C, 'person', id, 3], 'the server says who sent the commit, of what kind'); assert.match(mine[0].title, /reassess/i); assert.ok(mine[0].fields.some(f => String(f.after).includes(store)), 'and what changed: ' + JSON.stringify(mine[0].fields));
      assert.equal(get().history.at(-1).event, 'changed'); assert.equal(get().history.at(-1).changeId, mine[0].id, 'the adoption\'s own note points at the journal event');
      // a second change while the first is open: the cause joins the open change, and the journal names it too
      const driver = s.doc().quality.drivers.find(d => d.id === get().scope.driverId), again = await s.ok('quality.driver', {...driver, response: driver.response + ' Reviewed for the fix-up.'}, B), second = naming(again).filter(e => !had.includes(e.id) && e.id !== mine[0].id);
      assert.equal(second.length, 1); assert.equal(second[0].actor, B); assert.ok(D.adoptionReading(s.doc(), get()).changed.causes.some(c => c.kind === 'driver'));
      // a commit that journals nothing of its own still journals what the tracker changed
      { await s.ok('adoption.reassess', {id, revision: get().revision, reviewed: true, reason: 'Read against the model as it stands.'}, A);
        const decision = s.doc().decisions.records.find(d => d.id === get().decisionId); assert.ok(decision, 'the adoption rests on a decision');
        const seen = naming(await s.read()).map(e => e.id), r = await s.ok('decision.save', {...decision, title: decision.title + ' (reviewed)'}, C), third = naming(r).filter(e => !seen.includes(e.id));
        assert.equal(third.length, 1, 'the commit that changes the decision the adoption rests on holds one event naming the adoption'); assert.deepEqual([third[0].actor, third[0].authorKind], [C, 'person']); }
      // the design reversed through the earlier path: one event names the adoption, with who reversed it
      const other = 'ADP-002', alt = s.doc().modelAlternatives.records.find(x => x.id === byId(s.doc(), other).legacy.alternativeId), {previewReversal} = await import('../public/model-reversal.js');
      const pre = previewReversal(withFinalReview(structuredClone(s.doc())), alt);
      if (pre.allowed) {
        const r = await s.ok('alternative.rollback', {id: alt.id, alternativeRevision: alt.revision, previewStamp: pre.stamp, reviewed: true, reviewer: 'Synthetic architect', reason: 'Fixture: reverse the protected call.'}, C);
        const ev = list(r.document.changes.events).filter(e => e.source?.id === other); assert.equal(byId(r.document, other).status, 'reversed');
        assert.equal(ev.length, 1, 'the commit that reverses the design holds one event naming the adoption'); assert.deepEqual([ev[0].actor, ev[0].authorKind], [C, 'person']); assert.match(ev[0].title, /revers/i);
        assert.deepEqual([byId(r.document, other).provenance?.author?.by, byId(r.document, other).provenance?.reviewed ?? null], [C, null], 'and the record whose status changed is stamped as that commit\'s (ruling H2)');
      } else assert.fail('the fixture\'s protected call can be reversed: ' + JSON.stringify(pre).slice(0, 300));
    } finally { s.close(); }
    pass('J5: what the tracker changes is journalled — the commit that changes a bound record, the one that changes its driver and the one that reverses the design each hold one change event with the adoption as its source, stamped by the server with who sent the commit and of what kind; the adoption\'s note points at the event');
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
    for (const o of Object.values(meta.outputs)) for (const i of Object.keys(o.inputs || {})) assert.ok(!/rc44-wp2|design-packages\.js/.test(i), i + ' is not in the client');
    const S0 = JSON.parse(readFileSync('audit/rc44/build-notes/s0-size.json', 'utf8')).slice, measured = {chapters: report.routes.chapters.code, projects: report.routes.projects.code, scripts: report.scripts, under10k: report.buckets.under10k, css: report.css};
    if (process.argv.includes('--measure')) { mkdirSync('audit/rc44/evidence', {recursive: true}); writeFileSync(EVIDENCE, JSON.stringify({schema: 'aiw.rc44.slice-size.v1', name: 'wp2 S1 the adoption record', measuredWith: 'client-bundle.mjs bundleClient, as node build.mjs builds the client (dist/client-size-report.json: routes.chapters.code)', allowance: {chapters: 600, of: 'all of wp2 (ruling A4)', scripts: 148}, caps: {chapters: BUDGET.routes.chapters, scripts: BUDGET.scripts}, before: {name: 'S0 shared registration (audit/rc44/build-notes/s0-size.json)', ...S0}, slice: measured, delta: measured.chapters - S0.chapters, headroomAfter: BUDGET.routes.chapters - measured.chapters, 'opens with records': {gate: 'The chapters-route gate measures opening a document that holds no package records (ruling D10).', host: HOST, ...opens, before: JSON.parse(readFileSync('audit/rc44/build-notes/s0-size.json', 'utf8'))['opens with records'].hosts[HOST]}}, null, 1) + '\n'); }
    assert.ok(existsSync(EVIDENCE), 'the slice\'s measurement is kept (node rc44-wp2-adoption-validate.mjs --measure)');
    const size = JSON.parse(readFileSync(EVIDENCE, 'utf8'));
    assert.equal(size.delta, size.slice.chapters - S0.chapters); assert.ok(size.delta > 0 && size.delta <= 600, 'the route delta of the slice is inside the allowance of wp2: ' + size.delta); assert.equal(size.slice.scripts, 148); assert.equal(size.slice.css, S0.css, 'no stylesheet rule'); assert.equal(size.slice.under10k, S0.under10k);
    assert.ok(size['opens with records'].total === size['opens with records'].route + size['opens with records'].added && size['opens with records'].route === size.slice.chapters);
    if (process.argv.includes('--measure')) assert.deepEqual(measured, size.slice);
    assert.ok(measured.chapters <= BUDGET.routes.chapters);
    pass('size: the client build passes every gate with the caps unchanged; the slice measured ' + size.delta + ' B on the chapters route (' + S0.chapters + ' → ' + size.slice.chapters + ' of ' + BUDGET.routes.chapters + '; allowance of wp2: 600 B), 148 script files, no stylesheet rule; the package is held in the lazy entry of ' + HOST + '; opens with records: ' + size['opens with records'].total + ' B (' + size['opens with records'].added + ' B in ' + size['opens with records'].files + ' scripts beside the route); this build: ' + measured.chapters + ' B');
  });
  if (h) h.close();
}
