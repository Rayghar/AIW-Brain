// AIW rc44, wp2 slice S5: component selection as a recorded decision (audit/rc44/design/wp2-adoption.md §b.2, §c.2,
// §e.1 row 9, §g S5; the lead's rulings of 2026-11-18 to 2026-11-21, sections A to O; the registration contract in
// audit/rc44/build-notes/s0-extensions.md). A selection is a Chapter 3 decision: selection.* writes the decision through
// the chapter's own handler and keeps the selection's basis beside it (decision.selection, alternative.candidate).
// The blocks, in the order they run:
//   S5 fails today   record a library candidate as rejected without creating it as a component (the case that
//                    fails before the slice: an alternative could name only components that exist);
//   S5 registration  the five steps at the package's registration point; judge, choose and instantiate a signed-in
//                    person's; no accept step of the slice's own (the profile's acceptance is adoption.accept, a second
//                    person's: rulings D1, D7.1);
//   S5 eligibility   three candidates against two hard constraints give rows pass, fail and unknown; the failing one
//                    cannot be chosen; the unknown one only when named unproven, and approval evidence is then refused;
//   S5 no score      no result object carries a score, a rank or a weight; candidates keep the order they were added;
//                    the decision's weighing (readDecision) is not read for a selection;
//   S5 Q1 readers    readDecision answers a reading without weights for a selection, every caller reads it, and the
//                    built-in 'breaks' error holds for a selection (ruling Q1);
//   S5 Q2 one truth  Chapter 3's own commands are refused on a selection's choice, candidates, rejection reasons and
//                    hard constraints, except as the selection's inner steps; the mismatch finding (ruling Q2);
//   S5 Q4 second person  selection.confirm (a second person's), decision.accept refused without it for every kind of
//                    candidate, approval refused while a row is unproven, a judgement after the choice (ruling Q4);
//   S5 U1 hard constraint  a hard constraint leaves a selection's decision only through the selection; an ineligible
//                    choice is an error worded as the built-in 'breaks' whatever the drivers say, and is not confirmed (U1);
//   S5 U4 proposal   a selection before a person's choice says nothing to the context of the requirement it answers (U4);
//   S5 U3 concern    a candidate concern offers no comparison; a released option is compared only once it is assessed on
//                    every released criterion (what design-concern-validate.mjs held of the guided path, ruling U3);
//   S5 Q5 instantiate creates  a payload with an id is refused; the component's source names its release, claim, hash and
//                    decision, and every reader finds them (ruling Q5);
//   S5 Q6 elsewhere  a recovery import moves the selection's steps aside; facts and standing read on each read (Q6);
//   S5 Q9 the rest   a late hard constraint, the judgement through the chapter, the view's contract, the SDD's current
//                    reading (ruling Q9; the template copy (8) in S5 old documents, the excludes case (10) in S5 parity);
//   S5 candidate knowledge  a candidate profile is read by the chooser, refused by selection.candidate, and reaches no
//                    constraint, eligibility row, finding or reading (plan ruling 6);
//   S5 Sol           a draft by Sol proposes (a selection, a candidate marked by Sol) and states no typed reading of a
//                    hard constraint;
//   S5 server        through the boundary: an agent account's and a draft by Sol's judgement are refused, a person's
//                    keeps its actor; choose and instantiate are a signed-in person's; the profile adoption is accepted
//                    by a second person only;
//   S5 instantiate   the chosen profile is saved as a candidate component linked to the decision, and applied as a
//                    profile adoption pinned to the release and the claim hash, with its obligations open; a chosen
//                    library entry goes through realisation.candidate, the reviewed path, with its pinned reference;
//   S5 parity row 9  a released concern compared through selection.* gives the decision and alternatives the guided
//                    comparison gave at the base (public/architecture-design.js previewReleasedConcern, captured at
//                    5cae40a), and the guided comparison still does;
//   S5 SDD           the record prints the selection basis and each rejected candidate with its reason;
//   S5 fixtures      every fixture reads no clock (ruling Q7);
//   S5 old documents the references, the document with a review list and the two fixtures read as at the base; the
//                    shared helpers of rc44-s0-readings.mjs with the selection's records present;
//   S5 surface       the selection view (adoption-ui.js), held in the comparison tools' entry and opened from the
//                    library chooser by a dynamic import;
//   S5 size          the client build passes every gate; wp2's route bytes (S1 and S5) within 600 B (ruling M4).
import assert from 'node:assert/strict';
import {readFileSync, existsSync, writeFileSync, mkdirSync} from 'node:fs';
import worker, {commandHandler, commandShape} from '../worker.js';
import * as R from '../rc44-s0-readings.mjs';
import {server, A, B, C, AGENT, SELECTION_AT, CONCERN_NOTES, CONCERN_ANSWERS, CONCERN_TAGS, concernProject, decisionSays, selectionProject, PROFILE_FACTS, ARCHETYPE, bankPaymentApplied, governedConcernApplied, otherKindApplied} from '../rc44-wp2-fixtures.mjs';
import {withFinalReview, CHAPTERS, inheritedFindings, reviewSourceStamp} from '../public/review-domain.js';
import {EXTENSIONS} from '../public/design-extensions.js';
import {extensionIssues, extensionConflicts, builtInType} from '../design-extension-boundary.js';
import {isReviewCommand} from '../authorship.js';
import {applyDecisionCommand, decisionFindings, decisionCurrent} from '../public/decisions-domain.js';
import {readDecision} from '../public/decision-reading.js';
import {applyKnowledgeCommand, knowledgeStamp, claimReceiptCurrent} from '../public/knowledge-governance.js';
import {applyArchitectureCommand, previewArchitectureDesign} from '../public/architecture-design.js';
import {architectureMarkdown} from '../public/sdd-architecture.js';
import {instantiateTemplate} from '../project-lifecycle.js';
import {neutraliseImportedAuthority} from '../recovery-service.js';
import {componentSheet} from '../public/component-sheet.js';
import {applyRealisationCommand} from '../public/realisation-domain.js';
import {applyRecordCommand} from '../public/canonical-command.js';
import {componentSpecDocument} from '../public/component-spec-document.js';
import {componentSnapshot} from '../public/component-snapshot.js';
import {snapshotText} from '../public/component-library.js';
import {readingLines} from '../public/decision-reading.js';
import {tradeoffSource, readingStanding} from '../public/tradeoff-model.js';
import {deskModel, decisionProbe} from '../public/desk-model.js';
import {compareArchitectureScenario} from '../public/architecture-whatif.js';
import {reasoningSource, tuneDriver} from '../public/design-reasoning.js';
import {utilitySource, sensitivity} from '../public/utility-model.js';
import {decisionPoints, reasoningRequest, reasoningPacket} from '../public/brain-reasoning.js';
import {suggestEffects} from '../public/decision-suggestions.js';

const list = v => (Array.isArray(v) ? v : []);
const PACKAGE = 'p40-adoption', BASE = JSON.parse(readFileSync(new URL('../rc44-wp2-selection-baseline.json', import.meta.url), 'utf8'));
const EVIDENCE = 'audit/rc44/evidence/wp2-s5-size.json', S1_EVIDENCE = 'audit/rc44/evidence/wp2-s1-size.json';
const AT = SELECTION_AT, person = id => ({kind: 'person', id, account: 'person'}), sol = id => ({kind: 'sol-draft', id, account: 'person'}), agent = id => ({kind: 'person', id, account: 'agent'});
const decision = (p, id) => p.decisions.records.find(d => d.id === id), alt = (d, title) => d.alternatives.find(a => a.title === title);
const FORBIDDEN = /^(score|scores|rank|ranks|ranking|weight|weights|weighted|total|lead)$/i;
// Every key of a value, at any depth, with its path.
const keysOf = (v, path = '', out = []) => { if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { out.push(path + k); keysOf(x, path + k + '.', out); } return out; };

export default async function ({block, pass, load}) {
  const S = await load(new URL('../public/adoption-selection.js', import.meta.url).href), D = await load(new URL('../public/adoption-domain.js', import.meta.url).href);
  const pkg = () => { const e = EXTENSIONS.find(x => x.id === PACKAGE); assert.ok(e, 'the package ' + PACKAGE + ' is registered by the server (design-packages.js)'); return e; };
  // A selection command applied as the boundary applies it: the handler the server resolves for the type, the actor and
  // the author the server classified (authorship.js).
  const send = (p, type, payload, actor = A, author = person(actor)) => { const h = commandHandler(type); assert.equal(typeof h, 'function', type + ' is a command of this build'); return h(structuredClone(p), {type, payload}, AT, actor, {author}); };
  const doc = r => withFinalReview(r.document, {upgrade: false});
  const PREDICATE = {fact: 'topology', op: 'eq', value: 'single-region-north'}; // a typed reading, refused since ruling Q3
  const released = (p, key) => { const c = p.knowledge.claims.find(x => x.subjectId === 'component-profile:' + key); return {scope: 'knowledge', claimId: c.id, releaseId: p.knowledge.releases.at(-1).id}; };
  const library = p => ({scope: 'project', entryId: p.workbench.catalogue.find(e => e.title === 'Ticket consumer v2').id});
  // The selection of the eligibility case: for the Payment API's responsibility, the two hard constraints, and three
  // candidates in this order: the inbox profile, the relay profile, the library entry. No typed reading of a hard
  // constraint is stated (ruling Q3: until the hard gates exist a person judges each row); a second person judges the
  // first constraint of both profiles from what each released profile states: the inbox passes, the relay fails.
  // (Ruling Q3; was: A stated a typed reading of the first constraint at the start, against which both rows read.)
  const JUDGED = {inbox: {state: 'pass', evidence: 'The released profile states topology single-region-north (KC record).', reason: 'Its data stays in region North.'}, relay: {state: 'fail', evidence: 'The released profile states topology multi-region (KC record).', reason: 'It forwards data across regions.'}};
  const threeCandidates = () => {
    let p = selectionProject(), r = send(p, 'selection.start', {kind: 'component', responsibilityIds: ['api'], owner: 'Payments architect'});
    const id = r.selected; p = doc(r);
    for (const [kind, ref, title] of [['profile', released(p, 'inbox'), 'Inbox and deduplication component'], ['profile', released(p, 'relay'), 'Regional message relay'], ['library', library(p), 'Ticket consumer v2']]) p = doc(send(p, 'selection.candidate', {id, candidate: {kind, ref}, title}));
    for (const [key, title] of [['inbox', 'Inbox and deduplication component'], ['relay', 'Regional message relay']]) p = doc(send(p, 'selection.judge', {id, alternativeId: alt(decision(p, id), title).id, constraintId: 'QD-007', ...JUDGED[key]}, B));
    return {p, id};
  };
  // What Chapter 3 asks before the architect accepts a decision (decisions-domain.js decisionFindings), as a person
  // states it through the chapter's own command: each alternative described, and the chosen one's effect on each driver
  // with its reason and evidence. Then the decision is recorded and accepted, as every decision is.
  // (ruling Q2; was: the chosen one's effect on every driver, hard constraints included, stated "neutral" by the architect.
  // Now the selection's rows are Chapter 3's reading of each hard constraint, written by the selection; the architect
  // states the effect on the other drivers, and the hard ones are sent back as they stand.)
  const hardOf = (p, d) => new Set(readDecision(p, d).hard);
  const completion = (d, p) => { const hard = p ? hardOf(p, d) : new Set(['QD-007', 'QD-008']); return d.alternatives.map(a => ({id: d.id, alternativeId: a.id, summary: a.summary || 'The candidate ' + a.title + '.', benefits: a.benefits || 'Stated by the architect.', costs: a.costs || 'Stated by the architect.', consequences: a.consequences || 'Stated by the architect.', ...(list(a.responsibilityIds).length ? {} : {responsibilityIds: ['api']}), ...(a.id === d.selectedAlternativeId ? {assessments: Object.fromEntries(d.driverIds.map(x => [x, hard.has(x) ? a.assessments[x] : {effect: 'neutral', reason: 'Read against the driver by the architect.', evidence: 'Architect review RV-1.'}]))} : {})})); };
  // (ruling Q4: decision.accept of a selection needs a standing confirm by a second person. The confirm is applied here as
  // the boundary applies it once its checks pass; the boundary's refusals are held through the server, S5 Q4.)
  const confirmed = (p, id, by = C) => doc(S.applySelectionCommand(p, {type: 'selection.confirm', payload: {id, note: 'Read the rows and the choice.'}}, AT, by, {author: person(by)}));
  const acceptDecision = (p, id) => { p = confirmed(p, id); for (const payload of completion(decision(p, id), p)) p = withFinalReview(applyDecisionCommand(p, {type: 'decision.alternative', payload}, AT).document, {upgrade: false}); for (const type of ['decision.record', 'decision.accept']) p = withFinalReview(applyDecisionCommand(p, {type, payload: {id, acknowledge: true}}, AT).document, {upgrade: false}); return p; };

  // ------------------------------------------------------------ the case that fails before the slice
  await block('S5 fails today', async () => {
    pkg();
    // today: no command records a candidate that is not a component, so a library entry is compared only by creating it
    let p = selectionProject(); const before = p.realisation.components.length, entry = library(p);
    const r = send(p, 'selection.start', {kind: 'component', responsibilityIds: ['api'], owner: 'Payments architect'}), id = r.selected; p = doc(r);
    p = doc(send(p, 'selection.candidate', {id, candidate: {kind: 'library', ref: entry}, title: 'Ticket consumer v2'}));
    p = doc(send(p, 'selection.candidate', {id, candidate: {kind: 'existing', ref: {componentId: 'api-pod'}}, title: 'Keep the Payment service'}));
    const d0 = decision(p, id), lib = alt(d0, 'Ticket consumer v2'), keep = alt(d0, 'Keep the Payment service');
    assert.deepEqual(list(lib.componentIds), [], 'the library candidate names no component'); assert.deepEqual([lib.candidate.kind, lib.candidate.ref.scope, lib.candidate.ref.entryId], ['library', 'project', entry.entryId], 'it names the library entry it is');
    p = doc(send(p, 'selection.choose', {id, alternativeId: keep.id, reason: 'The Payment service already consumes the notifications.', rejections: {[lib.id]: 'A second consumer duplicates the notification path.'}, unproven: ['QD-007', 'QD-008']}));
    const d = decision(p, id), rejected = alt(d, 'Ticket consumer v2');
    assert.equal(d.selectedAlternativeId, keep.id); assert.equal(rejected.candidate.outcome, 'rejected'); assert.equal(rejected.rejectionReason, 'A second consumer duplicates the notification path.');
    assert.equal(p.realisation.components.length, before, 'no component was created for the rejected candidate');
    assert.ok(!p.realisation.components.some(c => c.library?.entryId === entry.entryId), 'and no component came from the library entry');
    pass('S5 fails today: a library entry is recorded as a candidate of a selection and rejected with its reason, and no component is created for it (before the slice the request is "Unknown project action." and a Chapter 3 alternative could name only components that exist)');
  });

  // ------------------------------------------------------------ registration
  await block('S5 registration', async () => {
    const e = pkg();
    assert.deepEqual([...extensionIssues(e), ...extensionConflicts()], [], 'the package conforms to the registration contract');
    const types = Object.keys(e.commands).filter(t => t.startsWith('selection.')).sort();
    // (ruling Q4; was: five steps, none a second person's. Now six: selection.confirm is a second person's, the rest not.)
    assert.deepEqual(types, ['selection.candidate', 'selection.choose', 'selection.confirm', 'selection.instantiate', 'selection.judge', 'selection.start'], 'the six steps of the selection');
    for (const t of types) { assert.equal(builtInType(t), false, t + ' is no built-in type'); assert.equal(typeof commandHandler(t), 'function'); assert.ok(!e.commands[t].staged, t + ' is no plain design edit a reviewed batch carries'); assert.equal(typeof e.commands[t].second === 'function', t === 'selection.confirm', t + (t === 'selection.confirm' ? ' is a second person\'s step' : ' is no second person\'s step')); }
    assert.equal(isReviewCommand('selection.confirm'), true, 'the confirm: an agent account and a draft by Sol are refused before the project is read');
    for (const t of ['selection.judge', 'selection.choose', 'selection.instantiate']) { assert.equal(e.commands[t].person, true, t + ' is a signed-in person\'s step'); assert.equal(isReviewCommand(t), true, t + ': an agent account and a draft by Sol are refused before the project is read'); }
    for (const t of ['selection.start', 'selection.candidate']) { assert.ok(!e.commands[t].person, t + ' may be proposed by a draft by Sol'); assert.equal(isReviewCommand(t), false); }
    // the one accept step a selection leads to is the adoption's, a second person's (rulings D1, D7.1)
    assert.equal(typeof e.commands['adoption.accept'].second, 'function');
    // the boundary stamps who wrote what a selection writes: the decision, and on instantiation the component and the adoption
    assert.deepEqual(e.provenance.paths, {adoption: ['adoptions.records'], selection: ['decisions.records', 'realisation.components', 'logical.assets', 'adoptions.records']});
    // the package reads released knowledge through the one existing rule, and no store of its own
    const src = readFileSync(new URL('../public/adoption-selection.js', import.meta.url), 'utf8');
    assert.match(src, /import \{[^}]*claimReceiptCurrent[^}]*\} from '\.\/knowledge-governance\.js';/); assert.ok(!/knowledge-concepts|knowledge-structures|p\.knowledge\b/.test(src), 'no knowledge store of its own');
    assert.ok(!/from '\.\/adoption-(?:upgrade|builtins|definitions)\.js'/.test(src), 'the browser\'s entry holds no upgrade (ruling J12)');
    for (const t of types) assert.notDeepEqual(commandShape({type: t, payload: {}}), {error: 'Unknown project action.', code: 'unknown_command'}, t + ' is a command of this build');
    pass('S5 registration: selection.start, .candidate, .judge, .choose and .instantiate at p40-adoption\'s registration point; judge, choose and instantiate a signed-in person\'s (refused for an agent account and a draft by Sol before the project is read); start and candidate may be a draft by Sol\'s proposal; no step is staged and none is a second person\'s of the slice\'s own: the accept step a selection leads to is adoption.accept');
  });

  // ------------------------------------------------------------ eligibility
  await block('S5 eligibility', async () => {
    pkg(); let {p, id} = threeCandidates();
    const d = decision(p, id);
    // (ruling Q3; was: the first constraint carried A's typed reading and both profiles' rows read "evaluated" against it.
    // Now no constraint carries one, and each row is a second person's judgement, with its evidence and reason, or unknown.)
    assert.deepEqual(S.selectionConstraints(p, d).map(c => [c.id, c.driverId, c.hard, c.source, c.predicate || null]), [['QD-007', 'QD-007', true, 'driver', null], ['QD-008', 'QD-008', true, 'driver', null]], 'the two hard constraints that reach the responsibility, neither with a typed reading');
    const rows = title => S.candidateEligibility(p, d, alt(d, title)).rows.map(r => [r.constraintId, r.state, r.basis || null, r.by || null]);
    assert.deepEqual(rows('Inbox and deduplication component'), [['QD-007', 'pass', 'person', B], ['QD-008', 'unknown', null, null]]);
    assert.deepEqual(rows('Regional message relay'), [['QD-007', 'fail', 'person', B], ['QD-008', 'unknown', null, null]]);
    assert.deepEqual(rows('Ticket consumer v2'), [['QD-007', 'unknown', null, null], ['QD-008', 'unknown', null, null]], 'a candidate nobody judged is unknown, never neutral');
    assert.deepEqual(S.candidateEligibility(p, d, alt(d, 'Regional message relay')).rows[0].evidence, JUDGED.relay.evidence, 'a judgement keeps its evidence');
    assert.deepEqual(['Inbox and deduplication component', 'Regional message relay', 'Ticket consumer v2'].map(t => S.candidateEligibility(p, d, alt(d, t)).state), ['unproven', 'ineligible', 'unproven']);
    // (ruling Q6; was: the facts stored on the candidate. Now none is stored, and the reading reads them from the released claim.)
    assert.ok(!('facts' in alt(d, 'Inbox and deduplication component').candidate), 'no copy of the facts is stored');
    assert.deepEqual(S.selectionReading(p, d).candidates.find(c => c.title === 'Inbox and deduplication component').facts.topology, {value: PROFILE_FACTS.inbox.topology, status: 'declared', source: {kind: 'knowledge', claimId: released(p, 'inbox').claimId, field: 'scope.topology'}}, 'the facts are the released profile\'s, with where they are stated');
    const choose = (title, more = {}) => send(p, 'selection.choose', {id, alternativeId: alt(decision(p, id), title).id, reason: 'Fits the payment path.', rejections: Object.fromEntries(decision(p, id).alternatives.filter(a => a.title !== title).map(a => [a.id, 'Not this one: ' + a.title])), ...more});
    assert.throws(() => choose('Regional message relay', {unproven: ['QD-008']}), /cannot be chosen: it fails “Customer records stay in region North”/, 'the failing candidate cannot be chosen');
    assert.throws(() => choose('Ticket consumer v2'), /unproven/, 'the unknown one is not chosen unless named unproven');
    assert.throws(() => choose('Ticket consumer v2', {unproven: ['QD-007']}), /QD-008/, 'every unknown row is named');
    assert.throws(() => choose('Inbox and deduplication component', {unproven: ['QD-007', 'QD-008']}), /QD-007 is not unknown/, 'a row that passes is not named unproven');
    assert.throws(() => send(p, 'selection.choose', {id, alternativeId: alt(d, 'Ticket consumer v2').id, reason: 'x', unproven: ['QD-007', 'QD-008'], rejections: {}}), /reason/, 'every other candidate has a reason');
    p = doc(choose('Ticket consumer v2', {unproven: ['QD-007', 'QD-008']}));
    const c = decision(p, id);
    assert.equal(c.selectedAlternativeId, alt(c, 'Ticket consumer v2').id); assert.deepEqual(c.selection.choice.unproven, ['QD-007', 'QD-008']); assert.equal(c.selection.choice.actor, A);
    assert.match(c.assumptions, /Unproven for Ticket consumer v2: Customer records stay in region North; Run only what the platform team operates\./, 'the unproven rows are written into the decision\'s assumptions');
    assert.deepEqual(c.alternatives.map(a => a.candidate.outcome), ['rejected', 'rejected', 'chosen']);
    // approval evidence is refused while the unproven rows are open (the existing rule of decision.governance)
    p = acceptDecision(p, id);
    assert.equal(decision(p, id).status, 'accepted');
    assert.throws(() => applyDecisionCommand(p, {type: 'decision.governance', payload: {id, status: 'approved', reviewer: 'Governance board', evidence: 'Minutes 12'}}, AT), /Resolve content gaps and decision assumptions before recording approval evidence/, 'approval evidence is refused while a row is unproven');
    pass('S5 eligibility: against "Customer records stay in region North" and "Run only what the platform team operates" (no typed reading: a second person judged the first for both profiles) the inbox profile reads pass and unknown, the relay profile fail and unknown, the library entry unknown twice; the failing candidate cannot be chosen; the library entry is chosen only once both its unknown rows are named unproven, which the decision\'s assumptions then carry, and approval evidence is refused while they are open');
  });

  // ------------------------------------------------------------ no score, rank or weight; insertion order
  await block('S5 no score', async () => {
    pkg(); let {p, id} = threeCandidates();
    p = doc(send(p, 'selection.candidate', {id, candidate: {kind: 'archetype', ref: {scope: 'catalogue', archetypeId: ARCHETYPE.id}}, title: ARCHETYPE.name}));
    p = doc(send(p, 'selection.candidate', {id, candidate: {kind: 'build', ref: null}, title: 'Build a deduplicating consumer'}));
    const d = decision(p, id), reading = S.selectionReading(p, d), titles = ['Inbox and deduplication component', 'Regional message relay', 'Ticket consumer v2', ARCHETYPE.name, 'Build a deduplicating consumer'];
    assert.deepEqual(reading.candidates.map(c => c.title), titles, 'candidates keep the order they were added');
    assert.deepEqual(d.alternatives.map(a => a.title), titles);
    for (const [what, value] of [['the reading', reading], ['the selection', d.selection], ['the candidates', d.alternatives.map(a => a.candidate)], ['the chooser\'s knowledge', S.selectableProfiles(p)], ['the eligibility', d.alternatives.map(a => S.candidateEligibility(p, d, a))]]) {
      const bad = keysOf(value).filter(k => FORBIDDEN.test(k.split('.').at(-1)));
      assert.deepEqual(bad, [], what + ' carries no score, rank or weight key');
    }
    // ruling Q1; was: readDecision(p, d) is null. Now the reading is answered and weighs nothing: no driver has a class or a
    // weight, no total, part or lead, no sensitivity point and no firmness.
    const weighs = r => !r || r.drivers.some(x => x.weight || x.cls) || r.rows.some(x => x.score || x.parts.some(q => q.weight || q.score)) || r.lead !== null || r.sensitivity.length > 0 || !!r.firmness;
    assert.equal(weighs(readDecision(p, d)), false, 'the decision\'s reading weighs nothing for a selection');
    assert.ok(weighs(readDecision(p, p.decisions.records.find(x => !x.selection))), 'and a decision without one is weighed as before');
    p = doc(send(p, 'selection.choose', {id, alternativeId: alt(d, 'Inbox and deduplication component').id, reason: 'Fits the payment path.', unproven: ['QD-008'], rejections: Object.fromEntries(d.alternatives.slice(1).map(a => [a.id, 'Not this one.']))}));
    const after = S.selectionReading(p, decision(p, id));
    assert.deepEqual(after.candidates.map(c => c.title), titles, 'and after the choice'); assert.deepEqual(keysOf(after).filter(k => FORBIDDEN.test(k.split('.').at(-1))), []);
    assert.equal(weighs(readDecision(p, decision(p, id))), false, 'and after the choice'); // ruling Q1; was: readDecision is null
    pass('S5 no score: the reading, the selection, the candidates, the chooser\'s knowledge and every eligibility hold no score, rank or weight key; five candidates (two profiles, a library entry, an archetype, a build) keep the order they were added, before and after the choice; the decision\'s weighing reads nothing for a selection and reads as before for a decision without one');
  });

  // ------------------------------------------------------------ the decision reading's callers (ruling Q1)
  // A selection after its choice: three candidates for the Payment API, a second person's judgement of the inbox
  // profile on the first constraint, the inbox chosen with the second named unproven. No typed reading is stated.
  const chosenSelection = () => {
    let p = selectionProject(), r = send(p, 'selection.start', {kind: 'component', responsibilityIds: ['api'], owner: 'Payments architect'});
    const id = r.selected; p = doc(r);
    for (const [kind, ref, title] of [['profile', released(p, 'inbox'), 'Inbox and deduplication component'], ['profile', released(p, 'relay'), 'Regional message relay'], ['library', library(p), 'Ticket consumer v2']]) p = doc(send(p, 'selection.candidate', {id, candidate: {kind, ref}, title}));
    const d = decision(p, id), inbox = alt(d, 'Inbox and deduplication component');
    p = doc(send(p, 'selection.judge', {id, alternativeId: inbox.id, constraintId: 'QD-007', state: 'pass', evidence: 'The deployment record DEP-4 names region North.', reason: 'Its data stays in region North.'}, B));
    p = doc(send(p, 'selection.choose', {id, alternativeId: inbox.id, reason: 'The inbox deduplicates and stays in region North.', unproven: ['QD-008'], rejections: Object.fromEntries(decision(p, id).alternatives.filter(a => a.id !== inbox.id).map(a => [a.id, 'Not this one: ' + a.title]))}));
    return {p, id};
  };
  await block('S5 Q1 readers', async () => {
    pkg(); const {p, id} = chosenSelection(), d = decision(p, id), title = x => d.alternatives.find(a => a.id === x)?.title || x;
    // the reading: a reading, not null, and without weights
    const r = readDecision(p, d);
    assert.ok(r && Array.isArray(r.rows) && r.rows.length === d.alternatives.length, 'readDecision answers a reading for a selection');
    assert.ok(r.drivers.length > 0 && r.drivers.every(x => x.weight === 0 && x.cls === null), 'no driver of a selection has a class or a weight');
    assert.ok(r.rows.every(x => x.score === 0 && x.parts.every(q => q.weight === 0 && q.score === 0)), 'nothing is weighed');
    assert.deepEqual([r.lead, r.firmness ?? null, r.sensitivity], [null, null, []], 'no lead, no firmness, no sensitivity point');
    for (const pr of ['High', 'Low']) { const w = readDecision(p, d, {priorities: Object.fromEntries(d.driverIds.map(x => [x, pr]))}); assert.ok(w.drivers.every(x => x.weight === 0) && w.lead === null, 'whatever priorities are asked about (' + pr + ')'); }
    const lines = readingLines(r, {alt: title});
    assert.deepEqual(lines.map(l => l.kind), ['lead'], 'the reading says one thing: ' + JSON.stringify(lines)); assert.equal(lines[0].text, 'A selection is not weighed.');
    // each caller reads the selection without throwing
    const T = tradeoffSource(p), t = T.D.get(id); assert.ok(t && t.reading && t.lead === null, 'the trade-off model');
    assert.deepEqual(d.alternatives.map(a => readingStanding(t.reading, a.id).kind), d.alternatives.map(() => 'selection'), 'whose map and desk show each candidate as one of a selection, not tied or ranked'); assert.match(readFileSync(new URL('../public/decisions.js', import.meta.url), 'utf8'), /if\(!r\|\|r\.rows\.length<2\|\|d\.selection\)return '';/, 'Chapter 3 draws no panel on the drivers for a selection');
    const probe = decisionProbe(deskModel(p), id); assert.ok(probe && probe.reading && !probe.alts.some(a => a.leads), 'the desk probe'); assert.equal(probe.lean, d.selectedAlternativeId, 'it follows the working choice');
    const driver = d.driverIds.find(x => !['QD-007', 'QD-008'].includes(x)) || d.driverIds[0], dp = p.quality.drivers.find(x => x.id === driver).priority === 'Low' ? 'High' : 'Low';
    const w = compareArchitectureScenario(p, {drivers: [{id: driver, priority: dp}]}).decisions.find(x => x.id === id); assert.ok(w, 'the what-if reads the decision'); assert.deepEqual([w.beforeLead, w.afterLead, w.changedLean], [null, null, false], 'and finds nothing that leads, before or after');
    const tuned = tuneDriver(reasoningSource(p), driver, {priority: dp}); assert.ok(tuned, 'design-reasoning tunes a driver the selection names');
    assert.deepEqual(sensitivity(utilitySource(p), driver).filter(s => s.decision.id === id), [], 'utility-model: no sensitivity point in a selection');
    const sol = decisionPoints(p, reasoningRequest({task: 'decisions', ids: ['D:' + id]})); assert.deepEqual([sol.missing, sol.items.length], [[], 1], 'Sol\'s decision item reads the decision');
    assert.doesNotThrow(() => reasoningPacket(p, {task: 'decisions', ids: ['D:' + id], scope: 'test'}), 'and the packet is built ("The desk no longer holds" no more)');
    assert.doesNotThrow(() => suggestEffects(p, d), 'the suggestions');
    assert.doesNotThrow(() => architectureMarkdown(withFinalReview(p)), 'the SDD');
    // the built-in error "The working choice breaks a hard constraint" holds for a selection
    const q = structuredClone(p), c = q.decisions.records.find(x => x.id === id), chosen = c.alternatives.find(a => a.id === c.selectedAlternativeId);
    chosen.assessments['QD-007'] = {effect: 'violates', reason: 'Keeps a copy outside region North.', evidence: 'Architect review RV-2.'};
    const breaks = decisionFindings(withFinalReview(q, {upgrade: false})).filter(f => f.decisionId === id && f.code === 'breaks');
    assert.deepEqual(breaks.map(f => [f.title, f.level, f.alternativeId, f.driverIds]), [['The working choice breaks a hard constraint', 'error', chosen.id, ['QD-007']]], 'a selection whose chosen candidate breaks a hard constraint raises the built-in error');
    assert.deepEqual(decisionFindings(p).filter(f => f.decisionId === id && f.code === 'breaks'), [], 'and not when it does not');
    pass('S5 Q1 readers: readDecision answers a selection with a reading without weights (no class, weight, total, lead, firmness or sensitivity point, whatever priorities are asked about; its one line says it is not weighed); the trade-off model, the desk probe, the what-if, design-reasoning, utility-model, Sol\'s decision item and packet, the suggestions and the SDD read it without throwing; a chosen candidate that breaks a hard constraint raises the built-in error "The working choice breaks a hard constraint"');
  });

  // ------------------------------------------------------------ one truth for the choice (ruling Q2)
  // A server whose project holds a selection for the Payment API: the two constraint drivers on its requirement, the
  // inbox profile released (B reviews A's claim), the profile and an archetype as candidates; B judges the inbox on the
  // first constraint, A chooses it with the second named unproven. Answers the server and the decision's id.
  const serverSelection = async () => {
    const h = await server(worker);
    for (const x of [{kind: 'constraint', title: 'Customer records stay in region North', description: 'Kept in region North.', impact: 'Rules out a store elsewhere.', priority: 'High', requirementIds: ['REQ-001']}, {kind: 'constraint', title: 'Run only what the platform team operates', description: 'On the platform.', impact: 'Rules out another platform.', priority: 'High', requirementIds: ['REQ-001']}]) await h.ok('quality.driver', x);
    const REVIEW = {reviewed: true, reviewer: B, reason: 'Verified source and limited interpretation.'};
    await h.ok('knowledge.source', {title: 'Synthetic component profiles', body: 'Synthetic component profiles\nAn inbox that deduplicates by message id and keeps its data in region North.\n', path: 'synthetic/profiles.txt', revision: '1', license: 'Synthetic test material'});
    await h.ok('knowledge.claim', {sourceId: h.doc().knowledge.sources.at(-1).id, lineStart: 2, lineEnd: 2, subjectId: 'component-profile:inbox', predicate: 'is profiled as', claimType: 'component-attribute', polarity: 'neutral', statement: 'An inbox that deduplicates by message id and keeps its data in region North.', conditions: ['For a payment path of this kind.'], limitations: ['The source makes no measured claim.'], tags: ['title:Inbox and deduplication component'], architectureUnit: {kind: 'product-mechanism', mechanism: 'An inbox that deduplicates by message id.', scope: PROFILE_FACTS.inbox, effects: [{quality: 'integrity', direction: 'supports', rationale: 'One effect per message id.'}], obligations: [{action: 'Keep the deduplication key with each message.', evidence: 'A replay test shows one effect per message id.'}]}});
    const claimId = h.doc().knowledge.claims.at(-1).id;
    await h.ok('knowledge.review', {...REVIEW, id: claimId, decision: 'verified', sourceChecked: true, rightsChecked: true, conditionsChecked: true}, B);
    await h.ok('knowledge.release', {...REVIEW, title: 'Synthetic component profiles', claimIds: [claimId]});
    await h.ok('knowledge.activate', {...REVIEW, id: h.doc().knowledge.releases.at(-1).id, stamp: knowledgeStamp(h.doc())});
    const id = (await h.ok('selection.start', {kind: 'component', responsibilityIds: ['api'], owner: 'Payments architect'})).selected;
    await h.ok('selection.candidate', {id, candidate: {kind: 'profile', ref: {scope: 'knowledge', claimId, releaseId: h.doc().knowledge.releases.at(-1).id}}, title: 'Inbox and deduplication component'});
    await h.ok('selection.candidate', {id, candidate: {kind: 'archetype', ref: {scope: 'catalogue', archetypeId: ARCHETYPE.id}}, title: ARCHETYPE.name});
    const inbox = alt(decision(h.doc(), id), 'Inbox and deduplication component'), other = alt(decision(h.doc(), id), ARCHETYPE.name);
    await h.ok('selection.judge', {id, alternativeId: inbox.id, constraintId: 'QD-007', state: 'pass', evidence: 'The deployment record DEP-4 names region North.', reason: 'Its data stays in region North.'}, B);
    await h.ok('selection.choose', {id, alternativeId: inbox.id, reason: 'The inbox deduplicates and stays in region North.', unproven: ['QD-008'], rejections: {[other.id]: 'An archetype holds no profile of the inbox.'}});
    return {h, id, inbox: inbox.id, other: other.id};
  };
  const WHO = [['a person', A, {}], ['an agent account', AGENT, {}], ['a draft by Sol', A, {authorKind: 'sol-draft'}]];
  await block('S5 Q2 one truth', async () => {
    pkg(); const {h, id, inbox, other} = await serverSelection();
    try {
      let d = decision(h.doc(), id);
      // the selection's rows are Chapter 3's reading of each hard constraint: a person's judgement reads "supports" with
      // its reason and evidence, an unproven row "needs evidence"; the chosen one's unproven row asks no support of it
      assert.deepEqual([d.selectedAlternativeId, d.selection.choice.alternativeId], [inbox, inbox]);
      const a = d.alternatives.find(x => x.id === inbox);
      assert.equal(a.assessments['QD-007'].effect, 'supports', 'the judged row is written into Chapter 3'); assert.match(a.assessments['QD-007'].reason, /architect-b/); assert.equal(a.assessments['QD-007'].evidence, 'The deployment record DEP-4 names region North.');
      assert.equal(a.assessments['QD-008'].effect, 'unknown', 'the unproven row reads "needs evidence"');
      assert.ok(!decisionFindings(h.doc()).some(f => f.decisionId === id && f.code === 'support-QD-008'), 'and Chapter 3 asks no support of the unproven row of the chosen candidate: the selection names it unproven');
      // every path that would give Chapter 3 a second truth is refused, to a person, an agent account and a draft by Sol
      const hardEdit = {...a.assessments, 'QD-008': {effect: 'supports', reason: 'Runs on the platform.', evidence: 'Ticket OPS-12.'}};
      const paths = [['decision.choose', {id, alternativeId: other}], ['decision.clear-choice', {id}], ['decision.alternative (a new alternative)', {id, title: 'A plain alternative', summary: 'x', benefits: 'x', costs: 'x', consequences: 'x', responsibilityIds: ['api']}], ['decision.alternative (a rejection reason)', {id, alternativeId: other, rejectionReason: 'Another reason.'}], ['decision.alternative (the effect on a hard constraint)', {id, alternativeId: inbox, assessments: hardEdit}]];
      const before = JSON.stringify(decision(h.doc(), id));
      for (const [what, payload] of paths) for (const [who, actor, extra] of WHO) {
        const r = await h.send(what.split(' ')[0], payload, actor, extra);
        assert.equal(r.status, 400, what + ' by ' + who + ' is refused: ' + JSON.stringify(r.body).slice(0, 200));
        assert.match(r.error, /through its selection/, what + ' by ' + who + ' says why');
      }
      assert.equal(JSON.stringify(decision(h.doc(), id)), before, 'and nothing of the decision changed');
      // what is not the selection's stays Chapter 3's: a person states the effect on another driver and the texts
      const soft = d.driverIds.find(x => !['QD-007', 'QD-008'].includes(x));
      await h.ok('decision.alternative', {id, alternativeId: inbox, summary: 'An inbox in region North.', assessments: {...a.assessments, [soft]: {effect: 'neutral', reason: 'Read by the architect.', evidence: 'Architect review RV-1.'}}});
      // the selection's own steps still write the choice (an inner step of selection.*, which no request carries)
      d = decision(h.doc(), id);
      assert.equal(d.alternatives.find(x => x.id === inbox).assessments[soft].effect, 'neutral');
      // an error finding when Chapter 3's choice is not the selection's, or names no candidate: accept and governance refuse
      const q = structuredClone(h.doc()), x = decision(q, id); x.selectedAlternativeId = other;
      const f = decisionFindings(withFinalReview(q, {upgrade: false})).filter(y => y.decisionId === id && y.code === 'selection-choice');
      assert.deepEqual(f.map(y => y.level), ['error'], 'a choice in Chapter 3 that is not the selection\'s is an error');
      const plain = structuredClone(h.doc()), y = decision(plain, id); y.alternatives.push({...structuredClone(y.alternatives[1]), id: 'ALT-999', title: 'A plain alternative', candidate: undefined}); delete y.alternatives.at(-1).candidate; y.selectedAlternativeId = 'ALT-999'; y.selection.choice.alternativeId = 'ALT-999';
      assert.deepEqual(decisionFindings(withFinalReview(plain, {upgrade: false})).filter(z => z.decisionId === id && z.code === 'selection-choice').map(z => z.level), ['error'], 'and so is a choice that names no candidate');
      for (const type of ['decision.record', 'decision.accept']) { try { q.decisions = applyDecisionCommand(q, {type, payload: {id, acknowledge: true}}, AT).document.decisions; } catch (e) { assert.equal(type, 'decision.accept', String(e.message)); assert.match(e.message, /Resolve this decision/); } }
      assert.notEqual(decision(q, id).status, 'accepted', 'the decision is not accepted while they differ');
      pass('S5 Q2 one truth: a selection writes its rows into Chapter 3 (a person\'s judgement reads supports with its reason and evidence; an unproven row needs evidence and the chosen one\'s asks no support); decision.choose, decision.clear-choice, a new alternative, a candidate\'s rejection reason and its effect on a hard constraint are each refused to a person, an agent account and a draft by Sol, and change nothing; the effect on another driver stays Chapter 3\'s; a Chapter 3 choice that is not the selection\'s, or names no candidate, is an error that refuses acceptance');
    } finally { h.close(); }
  });

  // ------------------------------------------------------------ a second person stands behind every person's word (ruling Q4)
  await block('S5 Q4 second person', async () => {
    pkg(); const {h, id, inbox} = await serverSelection();
    try {
      const findingOf = code => decisionFindings(h.doc()).filter(f => f.decisionId === id && f.code === code);
      const complete = async k => { for (const payload of completion(decision(h.doc(), k), h.doc())) await h.ok('decision.alternative', payload); await h.ok('decision.record', {id: k, acknowledge: true}); };
      await complete(id);
      // no acceptance without a standing confirm
      assert.deepEqual(findingOf('selection-confirm').map(f => f.level), ['error'], 'a chosen selection nobody confirmed is an error');
      { const r = await h.send('decision.accept', {id, acknowledge: true}); assert.equal(r.status, 400, 'decision.accept is refused without a confirm'); }
      // the confirm's projection names the chooser (who named the unproven row) and the judge of the chosen candidate's row
      for (const [who, actor, extra] of [['the chooser', A, {}], ['the judge', B, {}], ['an agent account', AGENT, {}], ['a draft by Sol', A, {authorKind: 'sol-draft'}]]) { const r = await h.send('selection.confirm', {id}, actor, extra); assert.equal(r.status, 400, who + ' does not confirm: ' + JSON.stringify(r.body).slice(0, 200)); }
      assert.ok(!decision(h.doc(), id).selection.confirm, 'nothing is written');
      await h.ok('selection.confirm', {id, note: 'Read the rows and the choice.'}, C);
      assert.deepEqual(findingOf('selection-confirm'), [], 'the confirm stands');
      assert.deepEqual(decisionFindings(h.doc()).filter(f => f.decisionId === id && f.level === 'error').map(f => f.code + ': ' + f.detail), [], 'no error stands in the way of the acceptance');
      await h.ok('decision.accept', {id, acknowledge: true});
      // while the chosen candidate's row is unproven: no approval evidence, and the assumptions are not resolved
      { const r = await h.send('decision.governance', {id, status: 'approved', reviewer: 'Governance board', evidence: 'Minutes 12'}); assert.equal(r.status, 400); assert.match(r.error, /Resolve content gaps and decision assumptions/); }
      { const r = await h.send('decision.save', {id, assumptionsResolved: true, assumptionEvidence: 'I checked.'}); assert.equal(r.status, 400, 'the assumptions are not resolved while a row is unproven'); assert.match(r.error, /unproven/); }
      // the profile is instantiated, and its adoption's projection names the chooser and the judge too
      const component = {title: 'Inbox and deduplication component', kind: 'service', purpose: 'Deduplicate payment notifications by message id.', boundary: 'The inbox owns its deduplication store.', owner: 'Payments platform'};
      await h.ok('selection.instantiate', {id, reviewed: true, component});
      const adp = D.adoptionRecords(h.doc()).find(a => a.kind === 'profile');
      assert.deepEqual(D.acceptanceSubject(adp, h.doc()).history.map(x => x.actor).sort(), [A, B].sort(), 'the profile adoption\'s projection names the chooser and the judge');
      for (const as of [A, B]) { const r = await h.send('adoption.accept', {id: adp.id, revision: adp.revision, deviationIds: [], note: ''}, as); assert.equal(r.status, 400, as + ' does not accept the profile adoption'); }
      // the unproven row is judged after the choice by a person other than the chooser; the choice's rows follow and the
      // confirm and the acceptance lapse
      const judge = {id, alternativeId: inbox, constraintId: 'QD-008', state: 'pass', evidence: 'The platform team runs the inbox (ticket OPS-12).', reason: 'Operated on the platform.'};
      { const r = await h.send('selection.judge', judge, A); assert.equal(r.status, 400, 'the chooser does not judge the row named unproven'); }
      { const other = decision(h.doc(), id).alternatives.find(a => a.candidate && a.id !== inbox), r = await h.send('selection.judge', {...judge, alternativeId: other.id}, C); assert.equal(r.status, 400, 'after the choice only a row of the chosen candidate is judged'); }
      await h.ok('selection.judge', judge, C);
      const d = decision(h.doc(), id);
      assert.deepEqual([d.selection.choice.unproven, d.selection.choice.rows[inbox].rows.map(r => [r.constraintId, r.state, r.by || null])], [[], [['QD-007', 'pass', B], ['QD-008', 'pass', C]]], 'the choice\'s rows are the rows as they now read');
      assert.equal(d.status, 'draft', 'the acceptance lapses: the decision is revised'); assert.ok(!/Unproven for/.test(d.assumptions || ''), 'and its assumptions no longer name the row');
      assert.deepEqual(findingOf('selection-confirm').map(f => f.level), ['error'], 'the confirm lapses');
      { const r = await h.send('selection.confirm', {id}, C); assert.equal(r.status, 400, 'the new judge does not confirm'); }
      // a row a person judged fail after the choice: the built-in error "breaks a hard constraint" (ruling Q1)
      const {h: g, id: k, inbox: ib} = await serverSelection();
      try { await g.ok('selection.judge', {id: k, alternativeId: ib, constraintId: 'QD-008', state: 'fail', evidence: 'The inbox runs outside the platform (ticket OPS-13).', reason: 'Another platform.'}, C);
        const e = decisionFindings(g.doc()).filter(f => f.decisionId === k && f.code === 'breaks'); assert.deepEqual(e.map(f => [f.level, f.driverIds]), [['error', ['QD-008']]], 'a chosen candidate a person judged fail breaks a hard constraint');
        assert.equal(decision(g.doc(), k).alternatives.find(a => a.id === ib).assessments['QD-008'].effect, 'violates', 'Chapter 3 shows the row'); } finally { g.close(); }
      // every kind of candidate: decision.accept is refused until a second person confirms
      const REVIEW = {reviewed: true, reviewer: B, reason: 'Verified source and limited interpretation.'};
      await h.ok('workspace.catalogue', {kind: 'component', title: 'Ticket consumer v2', content: snapshotText(componentSnapshot(h.doc(), 'notify-worker', {at: AT})), owner: 'Platform team', reviewNote: 'A consumer filed from the notification worker.'});
      const entryId = h.doc().workbench.catalogue.find(x => x.title === 'Ticket consumer v2').id;
      await h.ok('knowledge.source', {title: 'Synthetic scheduling note', body: 'Synthetic scheduling note\nCompare owning the schedule in one application with a separate service.\n', path: 'synthetic/schedule.txt', revision: '1', license: 'Synthetic test material'});
      await h.ok('knowledge.claim', {sourceId: h.doc().knowledge.sources.at(-1).id, lineStart: 2, lineEnd: 2, subjectId: 'design-concern:schedule-ownership', predicate: 'offers a design concern', claimType: 'applicability', polarity: 'neutral', statement: 'Compare owning the schedule in one application with a separate service.', conditions: ['For a schedule two teams change.'], limitations: ['The source makes no measured recovery claim.'], tags: CONCERN_TAGS});
      const concernClaim = h.doc().knowledge.claims.at(-1).id;
      await h.ok('knowledge.review', {...REVIEW, id: concernClaim, decision: 'verified', sourceChecked: true, rightsChecked: true, conditionsChecked: true}, B);
      await h.ok('knowledge.release', {...REVIEW, title: 'Synthetic K2 concern', claimIds: [concernClaim]});
      await h.ok('knowledge.activate', {...REVIEW, id: h.doc().knowledge.releases.at(-1).id, stamp: knowledgeStamp(h.doc())});
      const kinds = [['library', {kind: 'library', ref: {scope: 'project', entryId}}, 'Ticket consumer v2'], ['archetype', {kind: 'archetype', ref: {scope: 'catalogue', archetypeId: ARCHETYPE.id}}, ARCHETYPE.name], ['existing', {kind: 'existing', ref: {componentId: 'api-pod'}}, 'Keep the Payment service'], ['build', {kind: 'build', ref: null}, 'Build a deduplicating consumer'], ['buy', {kind: 'buy', ref: null}, 'Buy a hosted inbox'], ['option', null, 'One application']];
      for (const [kind, candidate, title] of kinds) {
        let k;
        if (kind === 'option') { k = (await h.ok('selection.start', {kind: 'option', concernId: 'schedule-ownership', requirementId: 'REQ-001', driverId: decision(h.doc(), id).driverIds.find(x => !['QD-007', 'QD-008'].includes(x)), owner: 'Payments architect', reason: 'One application fits the present team.'})).selected;
          for (const optionId of ['local', 'separate']) await h.ok('selection.candidate', {id: k, candidate: {kind: 'option', ref: {optionId}}, notes: CONCERN_NOTES[optionId]}); }
        else { k = (await h.ok('selection.start', {kind: 'component', responsibilityIds: ['api'], owner: 'Payments architect'})).selected;
          await h.ok('selection.candidate', {id: k, candidate, title}); await h.ok('selection.candidate', {id: k, candidate: kind === 'build' ? {kind: 'buy', ref: null} : {kind: 'build', ref: null}, title: kind === 'build' ? 'Buy a hosted inbox' : 'Build a deduplicating consumer'}); }
        const x = decision(h.doc(), k), chosen = x.alternatives.find(a => a.title === title), unknown = S.candidateEligibility(h.doc(), x, chosen).rows.filter(r => r.state === 'unknown').map(r => r.constraintId);
        assert.ok(unknown.length > 0, kind + ': the hard constraints reach the selection');
        await h.ok('selection.choose', {id: k, alternativeId: chosen.id, reason: 'Chosen for the test.', unproven: unknown, rejections: Object.fromEntries(x.alternatives.filter(a => a.candidate && a.id !== chosen.id).map(a => [a.id, 'Not this one.']))});
        await complete(k);
        assert.deepEqual(decisionFindings(h.doc()).filter(f => f.decisionId === k && f.level === 'error').map(f => f.code), ['selection-confirm'], kind + ': the one error is the confirm nobody gave');
        { const r = await h.send('decision.accept', {id: k, acknowledge: true}); assert.equal(r.status, 400, kind + ': decision.accept is refused without a standing confirm'); }
        { const r = await h.send('selection.confirm', {id: k}, A); assert.equal(r.status, 400, kind + ': the chooser does not confirm'); }
        await h.ok('selection.confirm', {id: k}, B);
        assert.deepEqual(decisionFindings(h.doc()).filter(f => f.decisionId === k && f.level === 'error').map(f => f.code + ': ' + f.detail), [], kind + ': no error stands in the way of the acceptance');
        await h.ok('decision.accept', {id: k, acknowledge: true});
        assert.equal(decision(h.doc(), k).status, 'accepted', kind + ': accepted once a second person confirmed');
      }
      pass('S5 Q4 second person: a chosen selection nobody confirmed is an error and decision.accept is refused, for a profile, a library entry, an archetype, an existing component, a build, a buy and a released option; selection.confirm is refused to the chooser, the judge of a chosen row, an agent account and a draft by Sol, and taken from a third person; approval evidence and resolving the assumptions are refused while a chosen row is unproven; the profile adoption\'s projection names the chooser and the judge, each refused adoption.accept; the unproven row is judged after the choice only by a person other than the chooser, only on the chosen candidate, and the choice\'s rows follow, the acceptance and the confirm lapse and the new judge does not confirm; a row judged fail after the choice raises the built-in "breaks" error, and Chapter 3 shows it');
    } finally { h.close(); }
  });

  // ------------------------------------------------------------ a hard constraint leaves a selection only through the selection (ruling U1)
  // The verifier's walk H-A, through the server: B judges the inbox on the first constraint (pass), A chooses it with the
  // second named unproven, C judges the second fail. Then A, an agent account and a draft by Sol each send a decision.save
  // that drops the second from the decision's drivers (at the fix-up's head: taken, and 'breaks' vanished while the
  // candidate read ineligible; a third person's confirm, the acceptance and the approval followed).
  await block('S5 U1 hard constraint', async () => {
    pkg(); const {h, id, inbox} = await serverSelection();
    try {
      await h.ok('selection.judge', {id, alternativeId: inbox, constraintId: 'QD-008', state: 'fail', evidence: 'The inbox runs outside the platform (ticket OPS-13).', reason: 'Another platform.'}, C);
      const d = decision(h.doc(), id), drop = d.driverIds.filter(x => x !== 'QD-008'), soft = d.driverIds.find(x => !['QD-007', 'QD-008'].includes(x)), title = 'The working choice breaks a hard constraint';
      assert.equal(S.candidateEligibility(h.doc(), d, d.alternatives.find(a => a.id === inbox)).state, 'ineligible', 'C judged the chosen candidate\'s second row fail');
      const before = JSON.stringify(decision(h.doc(), id));
      for (const [who, actor, extra] of WHO) {
        const r = await h.send('decision.save', {id, driverIds: drop}, actor, extra);
        assert.equal(r.status, 400, 'a decision.save that drops a hard constraint from a selection, by ' + who + ', is refused: ' + JSON.stringify(r.body).slice(0, 200));
        assert.match(r.error, /through its selection/, 'and says why (' + who + ')');
      }
      assert.equal(JSON.stringify(decision(h.doc(), id)), before, 'nothing of the decision changed');
      // what is not a hard constraint stays Chapter 3's: a person's save of the texts, and of the other drivers, is taken
      await h.ok('decision.save', {id, mitigation: 'Verify on the platform before acceptance.'});
      await h.ok('decision.save', {id, driverIds: d.driverIds.filter(x => x !== soft)});
      assert.deepEqual(decision(h.doc(), id).driverIds.filter(x => ['QD-007', 'QD-008'].includes(x)), ['QD-007', 'QD-008'], 'the hard constraints stay named');
      // the rest of the walk through the server: no second person confirms an ineligible choice, and nothing is accepted
      const breaks = q => decisionFindings(q).filter(f => f.decisionId === id && f.title === title && f.level === 'error');
      assert.ok(breaks(h.doc()).length > 0, 'an error says the working choice breaks a hard constraint');
      for (const payload of completion(decision(h.doc(), id), h.doc())) await h.ok('decision.alternative', payload); await h.ok('decision.record', {id, acknowledge: true});
      // (B and C judged the chosen candidate's rows, so the one rule refuses them; a fourth person, who neither chose nor
      // judged, is refused because the choice breaks a hard constraint)
      const D4 = 'architect-d'; assert.equal((await h.api('/api/access' + h.q, 'POST', {actorId: D4, role: 'editor'})).status, 200);
      for (const as of [B, C, D4]) { const r = await h.send('selection.confirm', {id, note: 'Read the rows and the choice.'}, as); assert.equal(r.status, 400, as + ' does not confirm an ineligible choice: ' + JSON.stringify(r.body).slice(0, 200)); if (as === D4) assert.match(r.error, /breaks a hard constraint \(QD-008, judged fail\): it is not confirmed/); }
      assert.ok(!decision(h.doc(), id).selection.confirm, 'nothing is confirmed');
      { const r = await h.send('decision.accept', {id, acknowledge: true}); assert.equal(r.status, 400, 'decision.accept is refused'); }
      // a document whose drivers no longer name the constraint (edited by hand: no command writes it): the chosen candidate
      // still reads ineligible, and the package's error, worded as the built-in, stands whatever the drivers say
      const q = structuredClone(h.doc()), x = decision(q, id); x.driverIds = x.driverIds.filter(k => k !== 'QD-008'); for (const a of x.alternatives) delete a.assessments['QD-008']; delete x.sourceSnapshot.drivers['QD-008'];
      const hand = withFinalReview(q, {upgrade: false}), y = decision(hand, id), ya = y.alternatives.find(a => a.id === inbox);
      assert.equal(S.candidateEligibility(hand, y, ya).state, 'ineligible', 'the constraint still reaches the responsibility');
      assert.deepEqual(decisionFindings(hand).filter(f => f.decisionId === id && f.code === 'breaks'), [], 'Chapter 3\'s own finding reads the drivers the decision names');
      assert.deepEqual(breaks(hand).map(f => [f.code, f.alternativeId, f.driverIds, f.detail]), [['selection-breaks', inbox, ['QD-008'], ya.title + ' breaks QD-008. Choose an alternative that meets it, or change the constraint in Chapter 1 and its driver in Chapter 2.']], 'the package raises the error, worded as the built-in');
      assert.throws(() => send(hand, 'selection.confirm', {id, note: 'x'}, D4), /breaks a hard constraint \(QD-008, judged fail\)/, 'no confirm on it, by a person who neither chose nor judged');
      assert.throws(() => applyDecisionCommand(hand, {type: 'decision.accept', payload: {id, acknowledge: true}}, AT), /Resolve this decision/, 'no acceptance');
      const acc = structuredClone(hand); decision(acc, id).status = 'accepted'; const accd = withFinalReview(acc, {upgrade: false});
      assert.equal(decisionCurrent(accd, decision(accd, id)), true, 'read as accepted as it stands');
      assert.throws(() => applyDecisionCommand(accd, {type: 'decision.governance', payload: {id, status: 'approved', reviewer: 'Governance board', evidence: 'Minutes 12'}}, AT), /Resolve content gaps/, 'and no approval evidence');
      pass('S5 U1 hard constraint: after a person other than the chooser judged a chosen row fail (the verifier\'s walk H-A, through the server), a decision.save that drops that hard constraint from the decision\'s drivers is refused to a person, an agent account and a draft by Sol and changes nothing, while a save of the texts or of a driver that is no hard constraint is taken; no second person confirms the ineligible choice and it is not accepted; on a document whose drivers no longer name the constraint, the chosen candidate still reads ineligible, the package raises "The working choice breaks a hard constraint" in the built-in\'s words, and the confirm, the acceptance and the approval are refused');
    } finally { h.close(); }
  });

  // ------------------------------------------------------------ a selection is a proposal until a person chooses (ruling U4)
  // What a selection's start, its candidates and a judgement write before a person's choice says nothing to the design
  // source (as rulings L6 and M6 rule for a package's proposals): the context of the requirement it answers (aiw-brain.js
  // brainContext, which a generation's currentness reads) reads as before, so a generation that read it stays current;
  // the person's choice is a design change that context reads. (architecture-intelligence-validate.mjs holds the same
  // for the option selection the intelligence's compare action opens as a draft by Sol, with its two assertions of
  // 5cae40a.)
  await block('S5 U4 proposal', async () => {
    pkg(); const {brainContext, generationCurrent} = await import('../public/aiw-brain.js'), {journeyIndex} = await import('../public/journey-context.js');
    const p = selectionProject(), context = {chapter: 1, id: 'REQ-001'}, g = {context, basisStamp: brainContext(p, context).stamp, sources: []};
    for (const [who, actor, author] of [['a person', A, person(A)], ['a draft by Sol', A, sol(A)], ['an agent account', AGENT, agent(AGENT)]]) {
      const r = send(p, 'selection.start', {kind: 'component', responsibilityIds: ['api'], owner: 'Payments architect'}, actor, author), id = r.selected; let q = doc(r);
      assert.ok(decision(q, id).requirementIds.includes('REQ-001'), 'the selection answers REQ-001');
      assert.ok(generationCurrent(q, g), 'a selection ' + who + ' starts says nothing to the requirement\'s context');
      for (const [kind, ref, title] of [['profile', released(q, 'inbox'), 'Inbox and deduplication component'], ['library', library(q), 'Ticket consumer v2']]) q = doc(send(q, 'selection.candidate', {id, candidate: {kind, ref}, title}, actor, author));
      q = doc(send(q, 'selection.judge', {id, alternativeId: alt(decision(q, id), 'Inbox and deduplication component').id, constraintId: 'QD-007', ...JUDGED.inbox}, B));
      assert.ok(generationCurrent(q, g), 'nor do its candidates and a judgement (' + who + ')');
      // the decision itself is still read: it is in the journey's records, and it is the subject of its own context
      assert.ok(journeyIndex(q).nodes.has(id), 'the decision is a record of the journey'); assert.equal(brainContext(q, {chapter: 3, id}).selected.id, id, 'and its own context is its own');
      const d = decision(q, id), inbox = alt(d, 'Inbox and deduplication component');
      const chosen = doc(send(q, 'selection.choose', {id, alternativeId: inbox.id, reason: 'Fits.', unproven: ['QD-008'], rejections: Object.fromEntries(d.alternatives.filter(a => a.id !== inbox.id).map(a => [a.id, 'Not this one.']))}));
      assert.equal(generationCurrent(chosen, g), false, 'a person\'s choice is a design change the requirement\'s context reads (' + who + ' started it)');
      assert.ok(brainContext(chosen, context).decisions.some(x => x.id === id), 'and the chosen selection is read there');
      // a recovery import moves the choice aside (ruling Q6): the selection is a proposal again until a person chooses here
      const back = withFinalReview(neutraliseImportedAuthority(structuredClone(chosen), AT), {upgrade: false});
      assert.ok(!brainContext(back, context).decisions.some(x => x.id === id), 'after a recovery import it is a proposal again (' + who + ')');
    }
    pass('S5 U4 proposal: a selection started by a person, by a draft by Sol or by an agent account, its candidates and a judgement say nothing to the context of the requirement it answers (a generation that read it stays current), while the decision stays a record of the journey and the subject of its own context; a person\'s choice is a design change that context reads; after a recovery import the selection is a proposal again');
  });

  // ------------------------------------------------------------ the released concern's comparison, re-pointed (ruling U3)
  // What design-concern-validate.mjs held of the guided comparison, as selection.* holds it: a candidate concern offers no
  // comparison (refused by selection.start, and by selection.candidate on a document whose selection names one), and no
  // released option is compared before it is assessed on every released criterion (the guided path's "Assess every
  // released approach before preparing a decision"; at the fix-up's head an option was added with no assessment at all).
  await block('S5 U3 concern', async () => {
    pkg(); const k = (q, type, payload, actor = 'author') => applyKnowledgeCommand(q, {type, payload}, AT, actor).document;
    let p = concernProject();
    p = k(p, 'knowledge.claim', {sourceId: p.knowledge.sources.at(-1).id, lineStart: 2, lineEnd: 2, subjectId: 'design-concern:candidate-ownership', predicate: 'offers a design concern', claimType: 'applicability', polarity: 'neutral', statement: 'Compare owning the schedule in one application with a separate service.', conditions: ['For a schedule two teams change.'], limitations: ['The source makes no measured recovery claim.'], tags: CONCERN_TAGS.map(x => (x.startsWith('title:') ? 'title:Candidate ownership' : x))});
    const START = {kind: 'option', requirementId: 'REQ-001', driverId: 'QD-001', owner: CONCERN_ANSWERS.owner, reason: CONCERN_ANSWERS.reason}, cand = p.knowledge.claims.at(-1);
    for (const [who, actor, author] of [['a person', A, person(A)], ['a draft by Sol', A, sol(A)], ['an agent account', AGENT, agent(AGENT)]])
      assert.throws(() => send(p, 'selection.start', {...START, concernId: 'candidate-ownership'}, actor, author), /Choose a current, released architecture concern/, 'a candidate concern offers no comparison (' + who + ')');
    const r = send(p, 'selection.start', {...START, concernId: 'schedule-ownership'}), id = r.selected; let q = doc(r);
    // a selection that names the candidate concern (a document made by hand: no command writes one) is offered no option
    const hand = structuredClone(q); decision(hand, id).selection.concern = {id: 'candidate-ownership', title: 'Candidate ownership', receipt: {...decision(q, id).selection.concern.receipt, claimId: cand.id}};
    assert.throws(() => send(withFinalReview(hand, {upgrade: false}), 'selection.candidate', {id, candidate: {kind: 'option', ref: {optionId: 'local'}}, notes: CONCERN_NOTES.local}), /no longer current/, 'candidate claims cannot offer a comparison: selection.candidate refuses an option of a candidate concern');
    // every released approach is assessed on every released criterion before it is compared, whoever adds it
    const before = JSON.stringify(q);
    for (const [who, actor, author] of [['a person', A, person(A)], ['a draft by Sol', A, sol(A)], ['an agent account', AGENT, agent(AGENT)]])
      for (const notes of [undefined, {}, {recovery: CONCERN_NOTES.local.recovery}, {...CONCERN_NOTES.local, operations: '  '}])
        assert.throws(() => send(q, 'selection.candidate', {id, candidate: {kind: 'option', ref: {optionId: 'local'}}, ...(notes ? {notes} : {})}, actor, author), /Assess every released approach before it is compared: One application · Operations|Assess every released approach before it is compared: One application · Recovery, Operations/, 'an option not assessed on every criterion is not compared (' + who + ', ' + JSON.stringify(notes) + ')');
    assert.equal(JSON.stringify(q), before, 'and nothing was written');
    for (const optionId of ['local', 'separate']) q = doc(send(q, 'selection.candidate', {id, candidate: {kind: 'option', ref: {optionId}}, notes: CONCERN_NOTES[optionId]}, A, sol(A)));
    assert.deepEqual(decision(q, id).alternatives.map(a => [a.title, a.summary]), [['One application', 'Recovery: Restore one process and reconcile reservations. Operations: Facilities runs the rebuild.'], ['Separate service', 'Recovery: Coordinate partial failure across services. Operations: A platform team runs the rebuild.']], 'assessed on every criterion, both are compared, in the order they were added');
    pass('S5 U3 concern: a candidate concern offers no comparison (selection.start refuses it for a person, a draft by Sol and an agent account; selection.candidate refuses an option of it on a document whose selection names it); a released option is compared only once it is assessed on every released criterion, whoever adds it (no notes, an empty note, a missing or blank criterion), and nothing is written until it is');
  });

  // ------------------------------------------------------------ instantiate creates, never updates (ruling Q5)
  await block('S5 Q5 instantiate creates', async () => {
    pkg(); let {p, id} = threeCandidates(); const d0 = decision(p, id), inbox = alt(d0, 'Inbox and deduplication component');
    p = doc(send(p, 'selection.judge', {id, alternativeId: inbox.id, constraintId: 'QD-008', state: 'pass', evidence: 'Ticket OPS-12.', reason: 'Operated on the platform.'}, B));
    p = doc(send(p, 'selection.choose', {id, alternativeId: inbox.id, reason: 'Fits.', rejections: Object.fromEntries(d0.alternatives.filter(a => a.id !== inbox.id).map(a => [a.id, 'Not this one.']))}));
    p = acceptDecision(p, id);
    const component = {title: 'Inbox', kind: 'service', purpose: 'Deduplicate payment notifications by message id.', boundary: 'The inbox owns its deduplication store.', owner: 'Payments platform'}, payment = structuredClone(p.realisation.components.find(c => c.id === 'api-pod'));
    for (const idValue of ['api-pod', 'COMP-NEW', null]) assert.throws(() => send(p, 'selection.instantiate', {id, reviewed: true, component: {...component, id: idValue}}), /a new component: it names no id/, 'a payload that names an id is refused (' + idValue + ')');
    assert.deepEqual(p.realisation.components.find(c => c.id === 'api-pod'), payment, 'and the Payment service is as it was');
    // what the payload says beyond the reviewed fields is not taken: the status, the links, the library pin, the source
    const r = send(p, 'selection.instantiate', {id, reviewed: true, component: {...component, status: 'accepted', decisionIds: ['ADR-001'], library: {scope: 'project', entryId: 'LIB-S5-0001'}, source: 'Typed by hand.', patternIds: ['PB-1']}}), q = doc(r), c = q.realisation.components.find(x => x.id === r.selected);
    assert.notEqual(c.id, 'api-pod'); assert.equal(q.realisation.components.length, p.realisation.components.length + 1, 'a component is created');
    assert.deepEqual([c.title, c.status, c.decisionIds, c.library ?? null, list(c.patternIds)], ['Inbox', 'candidate', [id], null, []], 'from the reviewed fields only');
    const ref = alt(decision(q, id), 'Inbox and deduplication component').candidate.ref;
    for (const part of [ref.releaseId, ref.claimId, ref.claimHash, id]) assert.ok(c.source.includes(part), 'its source names ' + part + ': ' + c.source);
    const a = D.adoptionRecords(q).find(x => x.kind === 'profile');
    assert.deepEqual(a.bindings.find(b => b.roleId === 'component').mode, 'created'); assert.equal(a.applied.records[0].isNew, true);
    // every reader asking where the component came from finds the release, the claim, its hash and the decision
    const sheet = componentSheet(q, c.id), field = JSON.stringify(sheet), spec = JSON.stringify(componentSpecDocument(q, c.id));
    for (const part of [ref.releaseId, ref.claimId, ref.claimHash, id]) { assert.ok(field.includes(part), 'the component sheet names ' + part); assert.ok(spec.includes(part), 'the component specification names ' + part); }
    assert.deepEqual([a.definition.receipt.claimId, a.definition.receipt.releaseId, a.definition.receipt.claimHash], [ref.claimId, ref.releaseId, ref.claimHash], 'and the profile adoption pins the same release, claim and hash');
    pass('S5 Q5 instantiate creates: a payload that names an id (an existing component\'s, a new one, null) is refused and changes nothing; the component is created from the reviewed fields only (no status, link, library pin, pattern or source taken from the payload); its source names the release, the claim, the claim\'s hash and the decision, and the component sheet, the specification and the profile adoption find them; the profile adoption binds the component it created');
  });

  // ------------------------------------------------------------ steps from elsewhere count as nobody's; facts come from the release (ruling Q6)
  await block('S5 Q6 elsewhere', async () => {
    pkg(); let {p, id} = threeCandidates(); const d0 = decision(p, id), inbox = alt(d0, 'Inbox and deduplication component');
    p = doc(send(p, 'selection.choose', {id, alternativeId: inbox.id, reason: 'Fits.', unproven: ['QD-008'], rejections: Object.fromEntries(d0.alternatives.filter(a => a.id !== inbox.id).map(a => [a.id, 'Not this one.']))}));
    p = confirmed(p, id);
    // a recovery import: the judgements, the confirm, the choice and the instantiation are moved aside, nobody's here
    const sel = q => q.decisions.records.filter(d => d.selection).map(d => d.selection);
    R.assertRecoveryClearsSteps(p, sel);
    const back = withFinalReview(neutraliseImportedAuthority(structuredClone(p), AT), {upgrade: false}), b = decision(back, id);
    assert.deepEqual(S.candidateEligibility(back, b, alt(b, 'Inbox and deduplication component')).rows.map(r => r.state), ['unknown', 'unknown'], 'after a recovery import a judged row reads unknown');
    assert.deepEqual([b.selection.choice, b.selection.confirm ?? null, b.selection.judgements], [null, null, []]); assert.equal(b.selection.imported.choice.actor, A, 'kept as history');
    assert.ok(decisionFindings(back).some(f => f.decisionId === id && f.code === 'selection-choice' && f.level === 'error'), 'and Chapter 3\'s choice is no selection\'s here until a person chooses again');
    // facts are the released claim's, read on each read; a hand-written copy is not read
    const hand = structuredClone(p), h = decision(hand, id);
    alt(h, 'Inbox and deduplication component').candidate.facts = {topology: {value: 'multi-region', status: 'declared'}};
    alt(h, 'Ticket consumer v2').candidate.facts = {topology: {value: 'single-region-north', status: 'declared'}};
    const read = S.selectionReading(hand, h), of = t => read.candidates.find(c => c.title === t).facts;
    assert.equal(of('Inbox and deduplication component').topology.value, PROFILE_FACTS.inbox.topology, 'a profile\'s facts are its released claim\'s');
    assert.deepEqual(of('Ticket consumer v2'), {}, 'a library entry states no fact');
    // the standing of a library entry, an archetype and an existing component is read on each read, with the reason
    let {p: s2, id: k} = threeCandidates();
    s2 = doc(send(s2, 'selection.candidate', {id: k, candidate: {kind: 'archetype', ref: {scope: 'catalogue', archetypeId: ARCHETYPE.id}}, title: ARCHETYPE.name}));
    { const made = applyRealisationCommand(s2, {type: 'realisation.component', payload: {title: 'Notification relay', kind: 'service', purpose: 'Relays notifications.', boundary: 'Its queue.', owner: 'Platform team'}}, AT); s2 = doc(made);
      s2 = doc(send(s2, 'selection.candidate', {id: k, candidate: {kind: 'existing', ref: {componentId: made.selected}}, title: 'Keep the Notification worker'})); }
    const gone = structuredClone(s2); gone.workbench.catalogue = gone.workbench.catalogue.filter(e => e.id !== 'LIB-S5-0001');
    const relay = alt(decision(s2, k), 'Keep the Notification worker').candidate.ref.componentId;
    // an existing component is not retired while a selection compares it (the lifecycle's own rule), and a document
    // without it (as a hand-made one may be) reads the candidate as no longer standing
    assert.throws(() => applyRecordCommand(s2, {type: 'record.retire', payload: {id: relay, reason: 'The relay is withdrawn from the design.'}}, AT, A), /still named by Chapter 3/);
    const off = structuredClone(s2); off.realisation.components = off.realisation.components.filter(c => c.id !== relay);
    const arch = structuredClone(s2); decision(arch, k).alternatives.find(a => a.title === ARCHETYPE.name).candidate.ref.archetypeId = 'not-an-archetype';
    for (const [q, title, why] of [[withFinalReview(gone, {upgrade: false}), 'Ticket consumer v2', /library entry/], [off, 'Keep the Notification worker', /component/], [withFinalReview(arch, {upgrade: false}), ARCHETYPE.name, /archetype/]]) {
      const e = S.candidateEligibility(q, decision(q, k), alt(decision(q, k), title));
      assert.ok(e.reasons.some(x => why.test(x)), title + ' no longer stands, and says why: ' + JSON.stringify(e.reasons));
      assert.throws(() => send(q, 'selection.choose', {id: k, alternativeId: alt(decision(q, k), title).id, reason: 'x', unproven: e.rows.map(r => r.constraintId), rejections: Object.fromEntries(decision(q, k).alternatives.filter(a => a.title !== title).map(a => [a.id, 'y']))}), /no longer|not selected/, title + ' is not chosen');
    }
    pass('S5 Q6 elsewhere: a recovery import moves each selection\'s judgements, confirm and choice aside (assertRecoveryClearsSteps), so a judged row reads unknown and Chapter 3\'s choice is no selection\'s until a person chooses again; a profile\'s facts are read from its released claim on each read, never from the stored copy, and a library entry states none; a library entry removed, an archetype this build does not know and an existing component no longer in the model (the lifecycle refuses to retire one a selection compares) no longer stand, say why, and are not chosen');
  });

  // ------------------------------------------------------------ the other should-fix items (ruling Q9)
  await block('S5 Q9 the rest', async () => {
    pkg(); const Q = (await import('../public/quality-domain.js')).applyQualityCommand;
    let {p, id} = threeCandidates(); const d0 = decision(p, id), inbox = alt(d0, 'Inbox and deduplication component');
    // (5) a judgement is written through the chapter's own handler: the decision is revised
    const before = d0.revision; p = doc(send(p, 'selection.judge', {id, alternativeId: inbox.id, constraintId: 'QD-008', state: 'pass', evidence: 'Ticket OPS-12.', reason: 'Operated on the platform.'}, B));
    assert.ok(decision(p, id).revision > before, 'selection.judge revises the decision through Chapter 3\'s handler');
    p = doc(send(p, 'selection.choose', {id, alternativeId: inbox.id, reason: 'Fits.', rejections: Object.fromEntries(d0.alternatives.filter(a => a.id !== inbox.id).map(a => [a.id, 'Not this one.']))}));
    p = acceptDecision(p, id);
    // (1) a hard constraint that reaches the responsibility after the start is read: the confirm lapses and nothing is instantiated
    p = withFinalReview(Q(p, {type: 'quality.driver', payload: {kind: 'constraint', title: 'Encrypt payment data at rest', description: 'Every store of the payment path encrypts at rest.', impact: 'Rules out a store without encryption.', priority: 'High', requirementIds: ['REQ-001']}}, AT).document, {upgrade: false});
    const late = p.quality.drivers.at(-1).id;
    assert.ok(S.selectionConstraints(p, decision(p, id)).some(k => k.id === late), 'the late hard constraint is one of the selection\'s');
    assert.ok(decisionFindings(p).some(f => f.decisionId === id && f.code === 'selection-confirm' && f.level === 'error'), 'the confirm no longer covers what the selection says');
    assert.throws(() => send(p, 'selection.instantiate', {id, reviewed: true, component: {title: 'Inbox', kind: 'service', purpose: 'Deduplicate.', boundary: 'Its store.', owner: 'Payments platform'}}), /changed since it was chosen|confirmed by a second person/, 'and the chosen candidate is not instantiated');
    // (6) the view's module says the package imports it, and the hook is a contract
    const ui = readFileSync(new URL('../public/adoption-ui.js', import.meta.url), 'utf8');
    assert.match(ui, /adoption-package\.js imports this module/); assert.match(ui, /window\.aiwSelection is a contract/);
    // (9) the SDD prints the current reading beside the rows stored at the choice
    const off = withFinalReview(applyKnowledgeCommand(p, {type: 'knowledge.deactivate', payload: {reviewed: true, reviewer: 'Second reviewer', reason: 'Withdraw project activation.', id: p.knowledge.releases.at(-1).id, stamp: knowledgeStamp(p)}}, AT, 'author').document, {upgrade: false});
    const md = architectureMarkdown(withFinalReview(off)).markdown;
    assert.match(md, /Inbox and deduplication component \(profile[^)]*\): chosen · at the choice: Customer records stay in region North: pass \(judged by architect-b\)[^·]*· now: Customer records stay in region North: unknown[^\n]*no longer current/, 'a withdrawn profile does not keep printing pass');
    pass('S5 Q9 the rest: a judgement revises the decision through Chapter 3\'s handler (5); a hard constraint that reaches the responsibility after the start is the selection\'s, the confirm no longer covers the selection and the chosen candidate is not instantiated (1); the view\'s module states who imports it and the hook it sets as a contract (6); the SDD prints the current reading beside the rows stored at the choice, so a withdrawn profile does not keep printing pass (9)');
  });

  // ------------------------------------------------------------ candidate knowledge is inert
  await block('S5 candidate knowledge', async () => {
    pkg(); let {p, id} = threeCandidates();
    const outbox = p.knowledge.claims.find(c => c.subjectId === 'component-profile:outbox'), shown = S.selectableProfiles(p).find(x => x.claimId === outbox.id);
    assert.ok(shown, 'the chooser reads the candidate profile'); assert.equal(shown.selectable, false); assert.match(shown.label, /^Candidate · not reviewed/); assert.equal(shown.title, 'MSG 004 Transactional outbox relay');
    assert.ok(!('facts' in shown) || shown.facts === null, 'and hands over no facts of it');
    assert.deepEqual(S.selectableProfiles(p).filter(x => x.selectable).map(x => x.title), ['Inbox and deduplication component', 'Regional message relay']);
    for (const ref of [{scope: 'knowledge', claimId: outbox.id, releaseId: p.knowledge.releases.at(-1).id}, {scope: 'knowledge', claimId: outbox.id, releaseId: 'KR-9999'}, {scope: 'knowledge', claimId: outbox.id}])
      assert.throws(() => send(p, 'selection.candidate', {id, candidate: {kind: 'profile', ref}, title: 'MSG 004'}), /Candidate knowledge can be read, not selected\./, 'selection.candidate refuses a candidate profile: ' + JSON.stringify(ref));
    // inert: a document with the candidate claim reads as one without it (the selection, its eligibility, findings)
    const without = structuredClone(p); without.knowledge.claims = without.knowledge.claims.filter(c => c.id !== outbox.id);
    const d = decision(p, id), e = decision(without, id), read = (q, x) => JSON.stringify({reading: S.selectionReading(q, x), eligibility: x.alternatives.map(a => S.candidateEligibility(q, x, a)), findings: decisionFindings(q).filter(f => f.decisionId === id), chapters: CHAPTERS.map(c => c.checks(q).filter(f => f.objectId === id))});
    assert.equal(read(p, d), read(withFinalReview(without, {upgrade: false}), e), 'the candidate profile reaches no constraint, eligibility row, finding or reading');
    // a release deactivated: its profile is no longer selectable, and a candidate of it reads unknown, never pass
    const off = withFinalReview(applyKnowledgeCommand(p, {type: 'knowledge.deactivate', payload: {reviewed: true, reviewer: 'Second reviewer', reason: 'Withdraw project activation.', id: p.knowledge.releases.at(-1).id, stamp: knowledgeStamp(p)}}, AT, 'author').document, {upgrade: false});
    const g = decision(off, id), inbox = alt(g, 'Inbox and deduplication component');
    assert.equal(claimReceiptCurrent(off, inbox.candidate.ref), false);
    assert.deepEqual(S.candidateEligibility(off, g, inbox).rows.map(r => [r.constraintId, r.state]), [['QD-007', 'unknown'], ['QD-008', 'unknown']], 'knowledge that is no longer released states no fact');
    assert.ok(S.candidateEligibility(off, g, inbox).reasons.some(x => /no longer current/.test(x)));
    assert.deepEqual(S.selectableProfiles(off).filter(x => x.selectable), []);
    pass('S5 candidate knowledge: the candidate profile "MSG 004 Transactional outbox relay" is read by the chooser, labelled a candidate nobody reviewed, with no facts handed over; selection.candidate refuses it ("Candidate knowledge can be read, not selected."), under any release id; a document with it reads, in the selection, every eligibility row and every finding, as one without it; a profile whose release is deactivated states no fact and is not selectable');
  });

  // ------------------------------------------------------------ a draft by Sol proposes
  await block('S5 Sol', async () => {
    pkg(); let p = selectionProject();
    // (ruling Q3; was: a draft by Sol and an agent account were refused a typed reading, a person's was taken. Now it is
    // refused to everyone, whatever is sent under the key, and a person judges each row with evidence and a reason.)
    for (const [who, actor, author] of [['a draft by Sol', A, sol(A)], ['an agent account', AGENT, agent(AGENT)], ['a person', A, person(A)]]) for (const predicates of [{'QD-007': PREDICATE}, {}, null])
      assert.throws(() => send(p, 'selection.start', {kind: 'component', responsibilityIds: ['api'], owner: 'Payments architect', predicates}, actor, author), /No typed reading of a hard constraint is stated/, who + ' states no typed reading of a hard constraint: ' + JSON.stringify(predicates));
    const r = send(p, 'selection.start', {kind: 'component', responsibilityIds: ['api'], owner: 'Payments architect'}, A, sol(A)), id = r.selected; p = doc(r);
    assert.equal(decision(p, id).selection.prepared, 'sol-draft', 'a selection a draft by Sol starts is a proposal');
    p = doc(send(p, 'selection.candidate', {id, candidate: {kind: 'library', ref: library(p)}, title: 'Ticket consumer v2'}, A, sol(A)));
    assert.equal(alt(decision(p, id), 'Ticket consumer v2').candidate.by, 'sol', 'a candidate a draft by Sol adds is marked as Sol\'s');
    p = doc(send(p, 'selection.candidate', {id, candidate: {kind: 'existing', ref: {componentId: 'api-pod'}}, title: 'Keep the Payment service'}));
    assert.ok(!('by' in alt(decision(p, id), 'Keep the Payment service').candidate), 'a person\'s is not');
    // the start's author is kept in fields of its own, with the account kind, whatever steps follow (should-fix 2)
    const started = structuredClone(decision(p, id).selection.started);
    assert.deepEqual(started, {actor: A, at: AT, account: 'person', kind: 'sol-draft'}, 'the start keeps who started it and how');
    const lib = alt(decision(p, id), 'Ticket consumer v2'), keep = alt(decision(p, id), 'Keep the Payment service');
    p = doc(send(p, 'selection.judge', {id, alternativeId: keep.id, constraintId: 'QD-007', state: 'pass', evidence: 'Ticket OPS-7.', reason: 'Runs in region North.'}, B));
    p = doc(send(p, 'selection.choose', {id, alternativeId: keep.id, reason: 'It exists.', unproven: ['QD-008'], rejections: {[lib.id]: 'A second consumer.'}}, C));
    assert.deepEqual(decision(p, id).selection.started, started, 'and keeps it after a judgement and a choice by others');
    assert.deepEqual([decision(p, id).selection.actor, decision(p, id).selection.account], [C, 'person'], 'the selection\'s last step is the choice');
    // an agent account's selection and candidate say so (prepared and by: agent), in the reading, the view and the SDD
    let q = selectionProject(); const r2 = send(q, 'selection.start', {kind: 'component', responsibilityIds: ['api'], owner: 'Payments architect'}, AGENT, agent(AGENT)), k = r2.selected; q = doc(r2);
    q = doc(send(q, 'selection.candidate', {id: k, candidate: {kind: 'library', ref: library(q)}, title: 'Ticket consumer v2'}, AGENT, agent(AGENT)));
    assert.deepEqual([decision(q, k).selection.prepared, decision(q, k).selection.started.account, alt(decision(q, k), 'Ticket consumer v2').candidate.by], ['agent', 'agent', 'agent'], 'an agent account\'s selection is prepared by an agent and its candidate is marked so');
    assert.deepEqual([S.selectionReading(q, decision(q, k)).prepared, S.selectionReading(q, decision(q, k)).started.account], ['agent', 'agent']);
    const U = await load(new URL('../public/adoption-ui.js', import.meta.url).href), view = U.selectionView(q, {decisionId: k});
    assert.match(view, /prepared by an agent account/); assert.match(view, /added by an agent account/);
    const md = architectureMarkdown(withFinalReview(q)).markdown; assert.match(md, /Prepared by an agent account\./); assert.match(md, /Ticket consumer v2 \(library entry [^)]*, added by an agent account\)/);
    pass('S5 Sol: no typed reading of a hard constraint is stated, by a draft by Sol, an agent account or a person; a selection a draft by Sol starts is marked as a proposal (prepared sol-draft) and a candidate it adds is marked by Sol; a person\'s candidate is not; the start\'s author is kept with its account kind after others judge and choose; an agent account\'s selection and candidate are marked as an agent\'s in the reading, the view and the SDD');
  });

  // ------------------------------------------------------------ through the server's boundary
  let h = null;
  await block('S5 server', async () => {
    pkg(); h = await server(worker);
    // the Payment API's requirement gains two constraint drivers; knowledge of one released profile (B reviews A's claim)
    for (const x of [{kind: 'constraint', title: 'Customer records stay in region North', description: 'Kept in region North.', impact: 'Rules out a store elsewhere.', priority: 'High', requirementIds: ['REQ-001']}, {kind: 'constraint', title: 'Run only what the platform team operates', description: 'On the platform.', impact: 'Rules out another platform.', priority: 'High', requirementIds: ['REQ-001']}]) await h.ok('quality.driver', x);
    const REVIEW = {reviewed: true, reviewer: B, reason: 'Verified source and limited interpretation.'};
    await h.ok('knowledge.source', {title: 'Synthetic component profiles', body: 'Synthetic component profiles\nAn inbox that deduplicates by message id and keeps its data in region North.\n', path: 'synthetic/profiles.txt', revision: '1', license: 'Synthetic test material'});
    await h.ok('knowledge.claim', {sourceId: h.doc().knowledge.sources.at(-1).id, lineStart: 2, lineEnd: 2, subjectId: 'component-profile:inbox', predicate: 'is profiled as', claimType: 'component-attribute', polarity: 'neutral', statement: 'An inbox that deduplicates by message id and keeps its data in region North.', conditions: ['For a payment path of this kind.'], limitations: ['The source makes no measured claim.'], tags: ['title:Inbox and deduplication component'], architectureUnit: {kind: 'product-mechanism', mechanism: 'An inbox that deduplicates by message id.', scope: PROFILE_FACTS.inbox, effects: [{quality: 'integrity', direction: 'supports', rationale: 'One effect per message id.'}], obligations: [{action: 'Keep the deduplication key with each message.', evidence: 'A replay test shows one effect per message id.'}, {action: 'Name the region the data is kept in.', evidence: 'The deployment record names the region.'}]}});
    const claimId = h.doc().knowledge.claims.at(-1).id;
    await h.ok('knowledge.review', {...REVIEW, id: claimId, decision: 'verified', sourceChecked: true, rightsChecked: true, conditionsChecked: true}, B);
    await h.ok('knowledge.release', {...REVIEW, title: 'Synthetic component profiles', claimIds: [claimId]});
    await h.ok('knowledge.activate', {...REVIEW, id: h.doc().knowledge.releases.at(-1).id, stamp: knowledgeStamp(h.doc())});
    const ref = {scope: 'knowledge', claimId, releaseId: h.doc().knowledge.releases.at(-1).id};
    const started = await h.ok('selection.start', {kind: 'component', responsibilityIds: ['api'], owner: 'Payments architect'}), id = started.selected;
    assert.match(id, /^ADR-/); assert.equal(decision(h.doc(), id).provenance?.author?.kind, 'person', 'the decision a person\'s selection writes is stamped as theirs');
    await h.ok('selection.candidate', {id, candidate: {kind: 'profile', ref}, title: 'Inbox and deduplication component'});
    await h.ok('selection.candidate', {id, candidate: {kind: 'archetype', ref: {scope: 'catalogue', archetypeId: ARCHETYPE.id}}, title: ARCHETYPE.name});
    const inbox = alt(decision(h.doc(), id), 'Inbox and deduplication component'), judge = {id, alternativeId: inbox.id, constraintId: 'QD-008', state: 'pass', evidence: 'The platform team runs the inbox (ticket OPS-12).', reason: 'Operated on the platform.'};
    // an agent account's and a draft by Sol's judgement are refused; a person's keeps its actor
    { const r = await h.send('selection.judge', judge, AGENT); assert.equal(r.status, 400); assert.match(r.error, /agent or service account does not review, confirm, accept or approve/); }
    { const r = await h.send('selection.judge', judge, A, {authorKind: 'sol-draft'}); assert.equal(r.status, 400, 'a draft by Sol judges nothing: ' + JSON.stringify(r.body).slice(0, 200)); }
    assert.deepEqual(list(decision(h.doc(), id).selection.judgements), [], 'nothing is written by either');
    await h.ok('selection.judge', judge, B);
    // (ruling Q3; was: a row the profile's facts answered through A's typed reading was not judged. Now a row a person
    // judged is not judged again, by anyone.)
    for (const as of [B, C]) { const r = await h.send('selection.judge', {...judge, state: 'fail'}, as); assert.equal(r.status, 400); assert.match(r.error, /only a row that reads unknown is judged/i, 'a row a person judged is not judged again'); }
    await h.ok('selection.judge', {...judge, constraintId: 'QD-007', evidence: 'The released profile states topology single-region-north.', reason: 'Its data stays in region North.'}, B);
    const j = decision(h.doc(), id).selection.judgements[0];
    assert.deepEqual([j.alternativeId, j.constraintId, j.state, j.actor, j.account], [inbox.id, 'QD-008', 'pass', B, 'person'], 'a person\'s judgement keeps its actor and account kind');
    assert.deepEqual(S.candidateEligibility(h.doc(), decision(h.doc(), id), alt(decision(h.doc(), id), 'Inbox and deduplication component')).rows.map(r => [r.constraintId, r.state, r.basis, r.by || null]), [['QD-007', 'pass', 'person', B], ['QD-008', 'pass', 'person', B]]);
    // choose and instantiate: a signed-in person's
    const others = {[alt(decision(h.doc(), id), ARCHETYPE.name).id]: 'An archetype holds no profile of the inbox.'}, choose = {id, alternativeId: inbox.id, reason: 'The inbox deduplicates and stays in region North.', rejections: others};
    { const r = await h.send('selection.choose', choose, AGENT); assert.equal(r.status, 400); }
    { const r = await h.send('selection.choose', choose, A, {authorKind: 'sol-draft'}); assert.equal(r.status, 400); }
    await h.ok('selection.choose', choose);
    for (const payload of completion(decision(h.doc(), id), h.doc())) await h.ok('decision.alternative', payload); await h.ok('selection.confirm', {id, note: 'Read the rows and the choice.'}, C); for (const type of ['decision.record', 'decision.accept']) await h.ok(type, {id, acknowledge: true});
    const component = {title: 'Inbox and deduplication component', kind: 'service', purpose: 'Deduplicate payment notifications by message id.', boundary: 'The inbox owns its deduplication store.', owner: 'Payments platform'};
    { const r = await h.send('selection.instantiate', {id, reviewed: true, component}, AGENT); assert.equal(r.status, 400); }
    await h.ok('selection.instantiate', {id, reviewed: true, component});
    const adp = D.adoptionRecords(h.doc()).find(a => a.kind === 'profile'); assert.ok(adp, 'the profile adoption is written');
    // the profile adoption is accepted by a second person only: the person who instantiated it is refused
    { const r = await h.send('adoption.accept', {id: adp.id, revision: adp.revision, deviationIds: [], note: ''}, A); assert.equal(r.status, 400); assert.match(r.error, /second signed-in person/, 'the applier does not accept: ' + r.error); }
    { const r = await h.send('adoption.accept', {id: adp.id, revision: adp.revision, deviationIds: [], note: ''}, AGENT); assert.equal(r.status, 400); }
    await h.ok('adoption.accept', {id: adp.id, revision: adp.revision, deviationIds: [], note: 'Read against the model.'}, C);
    const accepted = D.adoptionRecords(h.doc()).find(a => a.id === adp.id);
    assert.equal(D.adoptionAccepted(h.doc(), accepted), true, 'accepted by a second person'); assert.deepEqual([accepted.review.actor, accepted.review.account], [C, 'person']);
    pass('S5 server: an agent account\'s and a draft by Sol\'s judgement are refused and write nothing; a row a person judged is not judged again; a person\'s judgement keeps its actor and account kind and the row reads it; choose and instantiate are refused to an agent account and a draft by Sol; the profile adoption is refused to the person who instantiated it and to an agent account, and accepted by a second signed-in person');
  });

  // ------------------------------------------------------------ instantiate
  await block('S5 instantiate', async () => {
    pkg(); let {p, id} = threeCandidates();
    const d0 = decision(p, id), inbox = alt(d0, 'Inbox and deduplication component');
    p = doc(send(p, 'selection.judge', {id, alternativeId: inbox.id, constraintId: 'QD-008', state: 'pass', evidence: 'The platform team runs the inbox (ticket OPS-12).', reason: 'Operated on the platform.'}, B));
    const component = {title: 'Inbox and deduplication component', kind: 'service', purpose: 'Deduplicate payment notifications by message id.', boundary: 'The inbox owns its deduplication store.', owner: 'Payments platform'};
    assert.throws(() => send(p, 'selection.instantiate', {id, reviewed: true, component}), /Choose a candidate first|accepted/i, 'nothing is instantiated before a choice is accepted');
    p = doc(send(p, 'selection.choose', {id, alternativeId: inbox.id, reason: 'The inbox deduplicates and stays in region North.', rejections: Object.fromEntries(d0.alternatives.slice(1).map(a => [a.id, 'Not this one.']))}));
    assert.throws(() => send(p, 'selection.instantiate', {id, reviewed: true, component}), /accept/i, 'the decision is accepted first');
    p = acceptDecision(p, id);
    assert.throws(() => send(p, 'selection.instantiate', {id, component}), /Review/, 'the reviewed proposal is stated');
    const before = p.realisation.components.length, r = send(p, 'selection.instantiate', {id, reviewed: true, component}); p = doc(r);
    const c = p.realisation.components.find(x => x.id === r.selected), receipt = alt(decision(p, id), 'Inbox and deduplication component').candidate.ref;
    assert.equal(p.realisation.components.length, before + 1); assert.equal(c.title, component.title); assert.equal(c.status, 'candidate', 'a candidate component, as the reviewed path saves one');
    assert.ok(!c.library, 'a profile is no library entry: the pin is the adoption\'s'); assert.ok(c.source.includes(receipt.claimId) && c.source.includes(receipt.releaseId) && c.source.includes(id), 'the component names the profile and the decision it comes from: ' + c.source);
    assert.ok(c.decisionIds.includes(id), 'linked to the decision'); assert.deepEqual(p.logical.mappings.filter(m => m.physicalId === c.id).map(m => m.logicalId), ['api'], 'and allocated the responsibility it was selected for');
    const a = D.adoptionRecords(p).find(x => x.kind === 'profile');
    assert.deepEqual([a.status, a.origin, a.decisionId, a.definition.authority, a.definition.receipt.kind, a.definition.receipt.claimId, a.definition.receipt.releaseId, a.definition.receipt.claimHash, a.definition.receipt.releaseHash], ['applied', 'person', id, 'released', 'governed-claim', receipt.claimId, receipt.releaseId, receipt.claimHash, receipt.releaseHash], 'the adoption pins the release, the claim and their hashes');
    assert.ok(claimReceiptCurrent(p, a.definition.receipt), 'read with the existing rule');
    assert.deepEqual(a.bindings.map(b => [b.roleId, b.recordId, b.mode]), [['component', c.id, 'created'], ['responsibility', 'api', 'reused']]);
    const reading = D.adoptionReading(p, a);
    assert.deepEqual(reading.obligations.map(o => o.state), ['open', 'open'], 'the profile\'s obligations are open'); assert.deepEqual(a.obligations.map(o => o.action), ['Keep the deduplication key with each message.', 'Name the region the data is kept in.']);
    assert.equal(reading.definition.state, 'current'); assert.equal(reading.accepted, false); assert.equal(reading.label, 'applied · not accepted by a second person');
    assert.throws(() => send(p, 'selection.instantiate', {id, reviewed: true, component}), /already/i, 'a selection is instantiated once');
    // the pinned knowledge withdrawn: the adoption reads it (ruling J4), and a selection not yet instantiated is refused
    const off = withFinalReview(applyKnowledgeCommand(p, {type: 'knowledge.deactivate', payload: {reviewed: true, reviewer: 'Second reviewer', reason: 'Withdraw project activation.', id: receipt.releaseId, stamp: knowledgeStamp(p)}}, AT, 'author').document, {upgrade: false});
    assert.equal(D.adoptionReading(off, D.adoptionRecords(off).find(x => x.kind === 'profile')).definition.state, 'withdrawn', 'a profile whose release is no longer active reads withdrawn');
    // a chosen library entry is saved through the reviewed candidate path with its pinned reference, and applies no adoption
    { let {p: q, id: k} = threeCandidates(); const lib = alt(decision(q, k), 'Ticket consumer v2');
      q = doc(send(q, 'selection.choose', {id: k, alternativeId: lib.id, reason: 'Filed from the notification worker.', unproven: ['QD-007', 'QD-008'], rejections: Object.fromEntries(decision(q, k).alternatives.filter(x => x.id !== lib.id).map(x => [x.id, 'Not this one.']))}));
      q = acceptDecision(q, k); const rr = send(q, 'selection.instantiate', {id: k, reviewed: true, component: {...component, title: 'Ticket consumer v2'}}); q = doc(rr);
      const lc = q.realisation.components.find(x => x.id === rr.selected);
      assert.deepEqual([lc.origin, lc.library.scope, lc.library.entryId, lc.status], ['library', 'project', 'LIB-S5-0001', 'candidate'], 'the library entry through realisation.candidate'); assert.ok(lc.decisionIds.includes(k)); assert.ok(!D.adoptionRecords(q).some(x => x.decisionId === k)); }
    pass('S5 instantiate: refused before an accepted choice and without the reviewed proposal; the chosen profile is saved as a candidate component that names the profile and the decision, allocated its responsibility, with the decision in its decisionIds; a chosen library entry through the reviewed candidate path with its pinned reference; a profile adoption pinned to the release, the claim and their hashes is applied with the component and the responsibility bound, the released claim as its definition and its two obligations open, not accepted by a second person; once only; a deactivated release reads withdrawn');
  });

  // ------------------------------------------------------------ parity for row 9 of the retirement table (design §e.1)
  await block('S5 parity row 9', async () => {
    pkg();
    // (ruling Q8; was: the guided comparison of a released concern, run now, gives what it gave at the base. Now the guided
    // front-end is retired: its start, its answers, its preparation and the preview of an alternative it prepared are
    // refused, a task an older project holds can be set aside, and the comparison is read only through selection.*, which
    // gives the decision the guided comparison gave at the base, captured then: BASE.guided.)
    { const p = concernProject();
      assert.throws(() => applyArchitectureCommand(p, {type: 'architecture.start', payload: {requirementId: 'REQ-001', driverId: 'QD-001', topic: 'knowledge:schedule-ownership'}}, AT), /guided comparison of a released concern is retired/, 'the guided start of a released concern is refused');
      const old = governedConcernApplied().document, task = old.coauthoring.designTasks.find(t => t.governedConcern), held = structuredClone(old), t = held.coauthoring.designTasks.find(x => x.id === task.id); t.status = 'questions';
      for (const [type, payload] of [['architecture.answers', {answers: {reason: 'x'}}], ['architecture.prepare', {optionId: 'local'}], ['architecture.refresh', {reviewed: true, reason: 'x', reviewer: 'y', stamp: 'z'}]]) assert.throws(() => applyArchitectureCommand(held, {type, payload: {id: t.id, taskRevision: t.revision, ...payload}}, AT), /retired/, type + ' of a task an older project holds is refused');
      assert.equal(applyArchitectureCommand(held, {type: 'architecture.dismiss', payload: {id: t.id, taskRevision: t.revision, reason: 'Compared as a selection now.'}}, AT).document.coauthoring.designTasks.find(x => x.id === t.id).status, 'dismissed', 'and it can be set aside');
      const prepared = structuredClone(old), pt = prepared.coauthoring.designTasks.find(x => x.id === task.id), alternative = prepared.modelAlternatives.records.find(a => a.taskId === task.id); pt.status = 'proposed';
      assert.throws(() => previewArchitectureDesign(prepared, alternative, AT), /retired/, 'an alternative the guided comparison prepared is not previewed, so not applied');
      const src = readFileSync(new URL('../public/architecture-design.js', import.meta.url), 'utf8'), ui = readFileSync(new URL('../public/architecture-task-ui.js', import.meta.url), 'utf8');
      assert.ok(!/concernComparison|previewReleasedConcern/.test(src), 'the guided comparison\'s builder and preview are gone from the route');
      assert.ok(!/releasedDesignConcerns\(p\)\.map\(c=>'knowledge:'/.test(ui), 'the comparison tools offer no released concern as a guided topic');
      assert.match(ui, /window\.aiwSelection\?\.\(\{store:[^}]*concernId:[^}]*\}\)/, 'a released concern opened from the tools or the intelligence (openConcern) opens a selection of its options'); }
    // the same comparison through selection.*
    for (const o of ['local', 'separate']) {
      let p = concernProject(); const r = send(p, 'selection.start', {kind: 'option', concernId: 'schedule-ownership', requirementId: 'REQ-001', driverId: 'QD-001', owner: CONCERN_ANSWERS.owner, reason: CONCERN_ANSWERS.reason}), id = r.selected; p = doc(r);
      for (const optionId of ['local', 'separate']) p = doc(send(p, 'selection.candidate', {id, candidate: {kind: 'option', ref: {optionId}}, notes: CONCERN_NOTES[optionId]}));
      const d = decision(p, id), chosen = d.alternatives.find(a => a.candidate.ref.optionId === o);
      p = doc(send(p, 'selection.choose', {id, alternativeId: chosen.id, reason: CONCERN_ANSWERS.reason, rejections: Object.fromEntries(d.alternatives.filter(a => a !== chosen).map(a => [a.id, CONCERN_ANSWERS.reason]))}));
      const x = decision(p, id);
      assert.deepEqual(decisionSays(x), BASE.guided[o], 'a released concern compared through selection.* gives the same decision and alternatives as the guided comparison (' + o + ')');
      assert.equal(x.selection.kind, 'option'); assert.equal(x.selection.concern.id, 'schedule-ownership'); assert.ok(claimReceiptCurrent(p, x.selection.concern.receipt), 'the selection pins the released concern');
      assert.deepEqual(x.alternatives.map(a => [a.candidate.kind, a.candidate.ref.optionId, a.candidate.outcome]), [['option', 'local', o === 'local' ? 'chosen' : 'rejected'], ['option', 'separate', o === 'separate' ? 'chosen' : 'rejected']]);
    }
    // an option meets the hard constraints too: with a constraint driver on the requirement its row reads unknown (a
    // released concern states no typed fact of an option), so it is chosen only when named unproven.
    // MARKED FOR wp1's selection form (ruling Q9 (10); design S5: "an option with a failing excludes predicate is now
    // ineligible"): this holds today's reading, unknown, not ineligible; when wp1 gives options typed content and wp9b
    // typed gates, this case flips to ineligible.
    { let p = withFinalReview(applyKnowledgeCommand(concernProject(), {type: 'knowledge.source', payload: {title: 'x', body: 'x\ny\n', path: 'x.txt', revision: '1', license: 'Synthetic'}}, AT, 'author').document, {upgrade: false});
      p = withFinalReview((await import('../public/quality-domain.js')).applyQualityCommand(p, {type: 'quality.driver', payload: {kind: 'constraint', title: 'Stay on the shared platform', description: 'One platform.', impact: 'No second platform.', priority: 'High', requirementIds: ['REQ-001']}}, AT).document, {upgrade: false});
      const r = send(p, 'selection.start', {kind: 'option', concernId: 'schedule-ownership', requirementId: 'REQ-001', driverId: 'QD-001', owner: CONCERN_ANSWERS.owner, reason: CONCERN_ANSWERS.reason}), id = r.selected; p = doc(r);
      for (const optionId of ['local', 'separate']) p = doc(send(p, 'selection.candidate', {id, candidate: {kind: 'option', ref: {optionId}}, notes: CONCERN_NOTES[optionId]}));
      const d = decision(p, id), local = d.alternatives[0], cid = S.selectionConstraints(p, d)[0]?.id;
      assert.ok(cid, 'the constraint reaches the selection'); assert.deepEqual(S.candidateEligibility(p, d, local).rows.map(x => x.state), ['unknown']);
      assert.throws(() => send(p, 'selection.choose', {id, alternativeId: local.id, reason: 'x', rejections: {[d.alternatives[1].id]: 'y'}}), /unproven/); }
    // a concern that is no longer released is not compared
    { const p = concernProject(), off = withFinalReview(applyKnowledgeCommand(p, {type: 'knowledge.deactivate', payload: {reviewed: true, reviewer: 'Second reviewer', reason: 'Withdraw project activation.', id: p.knowledge.releases.at(-1).id, stamp: knowledgeStamp(p)}}, AT, 'author').document, {upgrade: false});
      assert.throws(() => send(off, 'selection.start', {kind: 'option', concernId: 'schedule-ownership', requirementId: 'REQ-001', driverId: 'QD-001', owner: 'x', reason: 'y'}), /current, released/); }
    // (ruling Q8; was: the one builder in architecture-design.js, which the guided comparison and the selection both wrote
    // through. Now the builder is the selection's alone, off the route, and nothing else writes a released concern's decision.)
    const sel = readFileSync(new URL('../public/adoption-selection.js', import.meta.url), 'utf8');
    assert.match(sel, /export function concernComparison\(/, 'the released concern\'s comparison is one builder, the selection\'s');
    assert.equal(sel.match(/run\('decision\.alternative',\{id:decisionId,title:option\.title,summary:reasons/g)?.length, 1, 'its alternatives are written in one place');
    for (const f of ['architecture-design', 'architecture-task-ui', 'architecture-intelligence']) assert.ok(!/concernComparison|previewReleasedConcern/.test(readFileSync(new URL('../public/' + f + '.js', import.meta.url), 'utf8')), f + ' writes no released concern\'s comparison');
    // a selection's decision raises the finding the guided path raised through its concern adoption once its released
    // knowledge is withdrawn (should-fix 4): an error on Chapter 3
    { let p = concernProject(); const r = send(p, 'selection.start', {kind: 'option', concernId: 'schedule-ownership', requirementId: 'REQ-001', driverId: 'QD-001', owner: CONCERN_ANSWERS.owner, reason: CONCERN_ANSWERS.reason}), id = r.selected; p = doc(r);
      for (const optionId of ['local', 'separate']) p = doc(send(p, 'selection.candidate', {id, candidate: {kind: 'option', ref: {optionId}}, notes: CONCERN_NOTES[optionId]}));
      const d = decision(p, id); p = doc(send(p, 'selection.choose', {id, alternativeId: d.alternatives[0].id, reason: CONCERN_ANSWERS.reason, rejections: {[d.alternatives[1].id]: 'Two teams.'}}));
      assert.deepEqual(decisionFindings(p).filter(f => f.decisionId === id && f.code === 'selection-withdrawn'), [], 'no finding while the concern is current');
      const off = withFinalReview(applyKnowledgeCommand(p, {type: 'knowledge.deactivate', payload: {reviewed: true, reviewer: 'Second reviewer', reason: 'Withdraw project activation.', id: p.knowledge.releases.at(-1).id, stamp: knowledgeStamp(p)}}, AT, 'author').document, {upgrade: false});
      assert.deepEqual(decisionFindings(off).filter(f => f.decisionId === id && f.code === 'selection-withdrawn').map(f => f.level), ['error'], 'a selection of options whose concern is withdrawn raises an error on its decision'); }
    { let {p, id} = threeCandidates(); const d0 = decision(p, id), inbox = alt(d0, 'Inbox and deduplication component');
      p = doc(send(p, 'selection.choose', {id, alternativeId: inbox.id, reason: 'Fits.', unproven: ['QD-008'], rejections: Object.fromEntries(d0.alternatives.filter(a => a.id !== inbox.id).map(a => [a.id, 'Not this one.']))}));
      const off = withFinalReview(applyKnowledgeCommand(p, {type: 'knowledge.deactivate', payload: {reviewed: true, reviewer: 'Second reviewer', reason: 'Withdraw project activation.', id: p.knowledge.releases.at(-1).id, stamp: knowledgeStamp(p)}}, AT, 'author').document, {upgrade: false});
      assert.deepEqual(decisionFindings(off).filter(f => f.decisionId === id && f.code === 'selection-withdrawn').map(f => f.level), ['error'], 'and so does the decision behind a chosen profile whose release is withdrawn'); }
    pass('S5 parity row 9: the guided front-end of a released concern is retired (its start, answers, preparation, re-reading and the preview of an alternative it prepared are refused; a task an older project holds can be set aside; no route module builds the comparison; the tools and the intelligence open a selection of the options); selection.* with kind option gives, for each option chosen, the decision and alternatives the guided comparison gave at ' + BASE.capturedFrom + ' (captured then), with the concern pinned and each option a candidate; an option meets the hard constraints (unknown, so chosen only as unproven); a concern that is no longer released is not compared, and a selection whose concern or chosen profile is withdrawn raises an error on its decision; the comparison has one builder, the selection\'s');
  });

  // ------------------------------------------------------------ the SDD
  await block('S5 SDD', async () => {
    pkg(); let {p, id} = threeCandidates();
    const d0 = decision(p, id), lib = alt(d0, 'Ticket consumer v2'), relay = alt(d0, 'Regional message relay'), inbox = alt(d0, 'Inbox and deduplication component');
    p = doc(send(p, 'selection.choose', {id, alternativeId: inbox.id, reason: 'The inbox deduplicates and stays in region North.', unproven: ['QD-008'], rejections: {[relay.id]: 'It keeps messages outside region North.', [lib.id]: 'It states nothing about where it keeps data.'}}));
    const md = architectureMarkdown(withFinalReview(p)).markdown, at = md.indexOf(id + ' ·'), section = md.slice(at, md.indexOf('\n### ', at + 1) > 0 ? md.indexOf('\n### ', at + 1) : at + 6000);
    assert.ok(at >= 0, 'the decision is printed');
    // (ruling Q3; was: the first constraint printed A's typed reading "(topology eq single-region-north)" and the rows read
    // against it. Now neither constraint has one, and each row a person judged names its judge.)
    assert.match(section, /\*\*Selection basis\*\*: a component for LR-001 · Payment API, against 2 hard constraints: Customer records stay in region North \(no typed reading: unknown until a person judges it\); Run only what the platform team operates \(no typed reading: unknown until a person judges it\)\./);
    assert.match(section, /Inbox and deduplication component \(profile, released KC-\d+ in KR-\d+\): chosen · Customer records stay in region North: pass \(judged by architect-b\); Run only what the platform team operates: unknown, named unproven/);
    assert.match(section, /Regional message relay \(profile, released KC-\d+ in KR-\d+\): rejected · Customer records stay in region North: fail \(judged by architect-b\)/);
    assert.match(section, /Not chosen: It keeps messages outside region North\./); assert.match(section, /Not chosen: It states nothing about where it keeps data\./);
    assert.ok(!/score|weigh/i.test(section.slice(section.indexOf('**Selection basis**'))), 'the basis weighs nothing');
    pass('S5 SDD: the decision record prints the selection basis (what is selected, each hard constraint, none with a typed reading), each candidate with its kind, its pinned knowledge, its outcome and its rows, the unproven rows named, and each rejected candidate with its reason; nothing is weighed');
  });

  // ------------------------------------------------------------ the fixtures read no clock (ruling Q7)
  await block('S5 fixtures', async () => {
    // Each fixture of the package's suite, built under two clocks years apart, is the same document: none reads the
    // time, so a golden captured once holds on every later day.
    const atClock = (t, fn) => { const Real = Date; class Fake extends Real { constructor(...a) { super(...(a.length ? a : [t])); } static now() { return new Real(t).getTime(); } } globalThis.Date = Fake; try { return fn(); } finally { globalThis.Date = Real; } };
    for (const [name, make] of [['bankPaymentApplied', bankPaymentApplied], ['governedConcernApplied', () => governedConcernApplied().document], ['otherKindApplied', otherKindApplied], ['concernProject', concernProject], ['selectionProject', selectionProject]])
      assert.equal(JSON.stringify(atClock('2031-01-01T00:00:00.000Z', make)), JSON.stringify(atClock('2032-06-01T12:00:00.000Z', make)), name + ' reads no clock: built on two days it is the same document');
    pass('S5 fixtures: every fixture of the package\'s suite (bankPaymentApplied, governedConcernApplied, otherKindApplied, concernProject, selectionProject) is the same document built under two clocks years apart: none reads the time');
  });

  // ------------------------------------------------------------ old documents and the shared helpers
  await block('S5 old documents', async () => {
    pkg();
    for (const t of R.REFERENCES) assert.deepEqual(R.digests(R.reference(t)), BASE.readings[t], t + ' reads as at ' + BASE.capturedFrom);
    assert.deepEqual(R.digests(R.reviewListDocument()), BASE.reviewList.readings, 'the document with a review list reads as at the base');
    assert.deepEqual(R.digests(selectionProject()), BASE.documents.selectionProject, 'the selection fixture without a selection reads as at the base (graph, model, trails, findings, stamps, readiness, provenance, registers, SDD, ARS)');
    assert.deepEqual(R.digests(concernProject()), BASE.documents.concernProject);
    for (const t of R.REFERENCES) { const p = R.reference(t); assert.ok(!p.decisions.records.some(d => 'selection' in d || d.alternatives.some(a => 'candidate' in a)), t + ' gains no key'); }
    // with the selection's records: a profile adoption on the package's layer only; finding ids unique; steps cleared in a template copy
    let {p, id} = threeCandidates(); const d0 = decision(p, id), inbox = alt(d0, 'Inbox and deduplication component');
    p = doc(send(p, 'selection.judge', {id, alternativeId: inbox.id, constraintId: 'QD-008', state: 'pass', evidence: 'Ticket OPS-12.', reason: 'Operated on the platform.'}, B));
    p = doc(send(p, 'selection.choose', {id, alternativeId: inbox.id, reason: 'Fits.', rejections: Object.fromEntries(d0.alternatives.slice(1).map(a => [a.id, 'Not this one.']))}));
    p = acceptDecision(p, id);
    p = doc(send(p, 'selection.instantiate', {id, reviewed: true, component: {title: 'Inbox and deduplication component', kind: 'service', purpose: 'Deduplicate.', boundary: 'Its store.', owner: 'Payments platform'}}));
    const without = structuredClone(p); delete without.adoptions;
    assert.ok(R.assertBuiltInTrailsUnchanged(withFinalReview(without, {upgrade: false}), p) > 0, 'the profile adoption joins the package\'s layer only');
    assert.ok(R.assertBuiltInChainsUnchanged(withFinalReview(without, {upgrade: false}), p) > 0);
    assert.ok(R.assertFindingIdsUnique(p) >= 0);
    R.assertTemplateCopyClearsSteps(p, q => q.decisions.records.filter(d => d.selection));
    // (ruling Q9 (8); was: the copy keeps the decision with selection null, its alternatives with their candidate blocks,
    // neither a selection nor weighed. Now the copy keeps the decision's alternatives as plain alternatives: no selection
    // key, no candidate block or facts, nothing chosen; a plain Chapter 3 decision, weighed as one.)
    { const copy = instantiateTemplate(withFinalReview({...p, workspace: {...p.workspace, reusableTemplate: true}}), 'copy', 'A copy', AT), d = decision(copy, id), was = decision(p, id);
      assert.equal('selection' in d, false, 'a project copied from a template carries no selection: the choice, the judgements and the confirm are persons\' steps in the template');
      assert.deepEqual(d.alternatives.map(a => a.title), was.alternatives.map(a => a.title), 'its alternatives are kept'); assert.ok(d.alternatives.every(a => !('candidate' in a)), 'as plain alternatives, with no candidate block or facts');
      assert.deepEqual([d.selectedAlternativeId, d.status], [null, 'draft'], 'nothing is chosen');
      assert.ok(readDecision(copy, d).drivers.some(x => x.cls), 'and it is weighed as a plain decision'); assert.deepEqual(S.selectionReading(copy, d), null);
      assert.deepEqual(decisionFindings(copy).filter(f => f.decisionId === id && /^selection-/.test(f.code)), [], 'the selection raises nothing there'); }
    { const a = D.adoptionRecords(p).find(x => x.kind === 'profile'), q = structuredClone(p); D.adoptionRecords(q).find(x => x.id === a.id).review = {actor: C, at: AT, account: 'person', revision: a.revision, seq: 9, note: '', deviationIds: []}; R.assertTemplateCopyClearsSteps(q, x => D.adoptionRecords(x)); }
    assert.ok(R.assertStepsMoveNoStamp(p, x => D.adoptionRecords(x)) > 0, 'no person\'s step on the profile adoption moves a design stamp');
    pass('S5 old documents: the three references, the document with a review list and the two fixtures without a selection read byte for byte as at ' + BASE.capturedFrom + ' (graph, model, trails, findings, stamps, readiness, provenance, registers, SDD, ARS) and gain no key; with a selection chosen and instantiated the profile adoption moves no built-in layer or chain, finding ids are unique, the selection\'s steps and the adoption\'s acceptance are cleared in a template copy, and no step moves a design stamp');
  });

  // ------------------------------------------------------------ the surface
  await block('S5 surface', async () => {
    pkg(); const U = await load(new URL('../public/adoption-ui.js', import.meta.url).href);
    let {p, id} = threeCandidates(); const html = U.selectionView(p, {decisionId: id});
    for (const t of ['Customer records stay in region North', 'Run only what the platform team operates', 'Inbox and deduplication component', 'Regional message relay', 'Ticket consumer v2']) assert.ok(html.includes(t), 'the view names ' + t);
    assert.match(html, /data-selection-row="QD-007" data-state="pass"/); assert.match(html, /data-selection-row="QD-007" data-state="fail"/); assert.match(html, /data-selection-row="QD-008" data-state="unknown"/);
    assert.ok(!/typed reading|predicate/i.test(html.replace('no typed reading', '')), 'the view states no typed reading'); assert.match(html, /topology single-region-north/, 'and shows what each released profile states, for the person who judges');
    assert.match(html, /MSG 004 Transactional outbox relay[\s\S]*?Candidate · not reviewed[\s\S]*?<button[^>]*disabled[^>]*title="Candidate knowledge can be read, not selected\."/, 'the candidate profile is read, labelled, and its Add is disabled with the reason');
    assert.ok(!/score|rank|weigh/i.test(html), 'the view weighs nothing');
    // naming a row unproven is the person's act, row by row (ruling Q4, should-fix 7): each row that reads unknown has its own
    // box, none ticked, and the choice sends the rows ticked, not every unknown row
    assert.equal((html.match(/data-sel-unproven="[^"]+"/g) || []).length, 4, 'one box for each row that reads unknown (inbox 1, relay 1, library 2)'); assert.ok(!/data-sel-unproven="[^"]+" checked/.test(html), 'none ticked');
    assert.match(readFileSync(new URL('../public/adoption-ui.js', import.meta.url), 'utf8'), /unproven:\[\.\.\.d\.querySelectorAll\('\[data-sel-unproven\^="'\+c\.alternativeId\+':"\]:checked'\)\]/, 'the choice sends the rows the person ticked');
    { let q = p; const d = decision(q, id), inbox = alt(d, 'Inbox and deduplication component'); q = doc(send(q, 'selection.choose', {id, alternativeId: inbox.id, reason: 'Fits.', unproven: ['QD-008'], rejections: Object.fromEntries(d.alternatives.filter(a => a.id !== inbox.id).map(a => [a.id, 'Not this one.']))}));
      const v = U.selectionView(q, {decisionId: id}); assert.match(v, /data-sel-action="confirm"/, 'once chosen, a second person confirms from the view'); assert.match(v, /data-sel-action="judge" data-alternative="[^"]+" data-constraint="QD-008"/, 'and the unproven row can be judged by a person other than the chooser'); }
    const src = f => readFileSync(new URL('../public/' + f + '.js', import.meta.url), 'utf8'), lib = src('component-library-ui'), host = src('architecture-task-ui');
    assert.match(lib, /await import\('\.\/architecture-task-ui\.js'\);window\.aiwSelection\?\.\(\{store:s,modal\}\)/, 'the library chooser loads the comparison tools\' entry by a dynamic import and opens the selection through the hook it sets');
    assert.ok(!/from '\.\/adoption-/.test(lib), 'it imports no adoption module statically (a second lazy chunk would split a shared one)');
    assert.match(src('adoption-package'), /^import '\.\/adoption-ui\.js';/m, 'the package holds the view, so the comparison tools\' entry does (it imports the package)'); assert.ok(!/adoption-ui/.test(host), 'and no workbench module imports a module of the package but the package itself (S0 tells a package\'s modules by who imports them)');
    assert.match(src('adoption-ui'), /window\.aiwSelection=openSelection/);
    pass('S5 surface: the selection view names the constraints, the candidates in order and each row\'s state; the candidate profile is shown labelled with its Add disabled and the reason; nothing is weighed; the library chooser opens it through a dynamic import of the comparison tools\' entry, which holds it');
  });

  // ------------------------------------------------------------ size (rulings A3, A4, D7.6, D10, K6, M4, N1)
  await block('S5 size', async () => {
    pkg();
    const {bundleClient, BUDGET} = await import('../client-bundle.mjs');
    const built = await bundleClient('.aiw-local/rc44-wp2-s5/client'), report = built.report, meta = JSON.parse(readFileSync(built.metafile, 'utf8'));
    assert.deepEqual(report.violations, [], 'the client build passes every size gate'); assert.equal(BUDGET.routes.chapters, 3233792, 'the chapters route cap is the one it was'); assert.equal(BUDGET.scripts, 148); assert.equal(report.scripts, 148, '148 script files');
    const HOST = 'public/architecture-task-ui.js', host = Object.keys(meta.outputs).find(f => meta.outputs[f].entryPoint === HOST), opens = R.opensWithRecords(meta, HOST, Object.keys(BUDGET.data));
    const holds = Object.entries(meta.outputs).filter(([, o]) => Object.keys(o.inputs || {}).some(i => /public\/adoption-/.test(i))).map(([f]) => f);
    assert.deepEqual(holds, [host], 'the package, the selection and its view are held in the lazy entry rooted at ' + HOST + ' and nowhere else (rulings A3, D7.6)');
    const inClient = Object.values(meta.outputs).flatMap(o => Object.keys(o.inputs || {})).filter(i => /adoption-/.test(i)).sort();
    assert.deepEqual(inClient, ['public/adoption-domain.js', 'public/adoption-package.js', 'public/adoption-selection.js', 'public/adoption-ui.js'], 'the client holds the readers, the steps, the selection and its view, and no upgrade (ruling J12)');
    const libOut = Object.keys(meta.outputs).find(f => meta.outputs[f].entryPoint === 'public/component-library-ui.js'); assert.ok(!Object.keys(meta.outputs[libOut].inputs).some(i => /adoption-/.test(i)), 'the library chooser\'s entry holds no adoption module');
    const START = 3230605, INTEGRATED = 3229840, measured = {chapters: report.routes.chapters.code, projects: report.routes.projects.code, scripts: report.scripts, under10k: report.buckets.under10k, css: report.css};
    if (process.argv.includes('--measure')) { mkdirSync('audit/rc44/evidence', {recursive: true}); writeFileSync(EVIDENCE, JSON.stringify({schema: 'aiw.rc44.slice-size.v3', name: 'wp2 S5 component selection as a recorded decision', measuredWith: 'client-bundle.mjs bundleClient, as node build.mjs builds the client (dist/client-size-report.json: routes.chapters.code, scripts, buckets)', allowance: {chapters: 800, of: 'all of wp2 (ruling Q10, was 600 B by ruling A4): S1 books 325 B (ruling N1), so S5 may add at most 475 B', scripts: 148}, caps: {chapters: BUDGET.routes.chapters, scripts: BUDGET.scripts}, bases: {start: {commit: '5cae40a (wp9a slice 1 after its second fix-up, on rc44/integration a4c1690)', chapters: START, projects: 507338, scripts: 148, under10k: 53, css: 901873}, integrated: {commit: '9673661', chapters: INTEGRATED}}, slice: measured, ownBytes: Math.max(0, measured.chapters - START), routeDelta: measured.chapters - START, routeDeltaNote: 'The chapters route against the start: negative once the fix-up retired the guided comparison of a released concern (ruling Q8), whose code left the route. A package books no negative figure (ruling O1): S5 books 0, and the saving is the lead\'s to book at the merge (lead-bookings-size.json).', projectsDelta: measured.projects - 507338, headroomAfter: BUDGET.routes.chapters - measured.chapters,
      'opens with records': {gate: 'The chapters-route gate measures opening a document that holds no package records (ruling D10).', host: HOST, ...opens, holds: 'the adoption record\'s readers, steps and tracker (adoption-domain.js), the registration (adoption-package.js), the selection (adoption-selection.js) and its view (adoption-ui.js); not the upgrade (ruling J12)'}}, null, 1) + '\n'); }
    assert.ok(existsSync(EVIDENCE), 'the slice\'s measurement is kept (node rc44-wp2-adoption-validate.mjs --measure)');
    const size = JSON.parse(readFileSync(EVIDENCE, 'utf8')), s1 = JSON.parse(readFileSync(S1_EVIDENCE, 'utf8')), s1Own = s1.ownBytes ?? s1.delta;
    // (the fix-up, rulings O1 and Q10; was: ownBytes within 275 B and equal to the route's growth over the start. Now
    // ownBytes is an integer of at least 0 within the 475 B wp2 has left of 800 B, equal to the growth when the route
    // grew and 0 when it shrank, and the measured delta is kept beside it, exactly.)
    assert.ok(Number.isInteger(size.ownBytes) && size.ownBytes >= 0 && size.ownBytes <= 475, 'S5\'s own route bytes are an integer within what wp2 has left: ' + size.ownBytes);
    assert.equal(size.routeDelta, size.slice.chapters - size.bases.start.chapters); assert.equal(size.ownBytes, Math.max(0, size.routeDelta)); assert.equal(size.slice.scripts, 148); assert.equal(size.slice.css, 901873, 'no stylesheet rule'); assert.equal(size['opens with records'].route, size.slice.chapters);
    if (process.argv.includes('--measure')) assert.deepEqual(measured, size.slice);
    // ruling M4: this build's growth over the integrated base, less every other package's own bytes and the shared pool's, is wp2's (S1's and S5's own)
    const booked = R.routeBookings(EVIDENCE), notWp2 = Object.entries(booked.others).filter(([f]) => !/\/wp2-/.test(f)).reduce((n, [, b]) => n + b, 0), wp2 = measured.chapters - INTEGRATED - notWp2 - booked.poolTotal;
    assert.ok(wp2 <= 800, 'wp2\'s bytes on this build are within its 800 B (ruling Q10): ' + wp2);
    assert.equal(wp2, s1Own + (measured.chapters - START), 'wp2\'s bytes on this build are S1\'s own and S5\'s: ' + wp2 + ' (the route grew ' + (measured.chapters - INTEGRATED) + ' B over the integrated base; other packages\' own ' + notWp2 + ' B; the shared pool ' + booked.poolTotal + ' B)');
    assert.ok(s1Own + size.ownBytes <= 800, 'S1\'s own bytes and S5\'s stay within wp2\'s 800 B (ruling Q10; was 600 B): ' + s1Own + ' + ' + size.ownBytes);
    assert.ok(measured.chapters <= BUDGET.routes.chapters);
    pass('S5 size: every gate passes with the caps unchanged; 148 script files; the selection and its view are held in the lazy entry of ' + HOST + ' with the package, and the library chooser\'s entry holds none of it; S5 books ' + size.ownBytes + ' B of its own on the chapters route (' + START + ' → ' + size.slice.chapters + ', ' + size.routeDelta + ' B), wp2 ' + wp2 + ' B of 800 (S1 ' + s1Own + ' + S5 ' + size.ownBytes + ' booked, the route ' + size.routeDelta + ' B against the start, rulings M4, O1, Q10); opens with records: ' + size['opens with records'].total + ' B (' + size['opens with records'].added + ' B in ' + size['opens with records'].files + ' scripts beside the route)');
  });
  if (h) h.close();
}
