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
//   S5 old documents the references, the document with a review list and the two fixtures read as at the base; the
//                    shared helpers of rc44-s0-readings.mjs with the selection's records present;
//   S5 surface       the selection view (adoption-ui.js), held in the comparison tools' entry and opened from the
//                    library chooser by a dynamic import;
//   S5 size          the client build passes every gate; wp2's route bytes (S1 and S5) within 600 B (ruling M4).
import assert from 'node:assert/strict';
import {readFileSync, existsSync, writeFileSync, mkdirSync} from 'node:fs';
import worker, {commandHandler, commandShape} from '../worker.js';
import * as R from '../rc44-s0-readings.mjs';
import {server, A, B, C, AGENT, SELECTION_AT, CONCERN_NOTES, CONCERN_ANSWERS, concernProject, guidedConcernPreview, decisionSays, selectionProject, PROFILE_FACTS, ARCHETYPE} from '../rc44-wp2-fixtures.mjs';
import {withFinalReview, CHAPTERS, inheritedFindings, reviewSourceStamp} from '../public/review-domain.js';
import {EXTENSIONS} from '../public/design-extensions.js';
import {extensionIssues, extensionConflicts, builtInType} from '../design-extension-boundary.js';
import {isReviewCommand} from '../authorship.js';
import {applyDecisionCommand, decisionFindings} from '../public/decisions-domain.js';
import {readDecision} from '../public/decision-reading.js';
import {applyKnowledgeCommand, knowledgeStamp, claimReceiptCurrent} from '../public/knowledge-governance.js';
import {architectureMarkdown} from '../public/sdd-architecture.js';
import {instantiateTemplate} from '../project-lifecycle.js';

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
  const PREDICATE = {fact: 'topology', op: 'eq', value: 'single-region-north'};
  const released = (p, key) => { const c = p.knowledge.claims.find(x => x.subjectId === 'component-profile:' + key); return {scope: 'knowledge', claimId: c.id, releaseId: p.knowledge.releases.at(-1).id}; };
  const library = p => ({scope: 'project', entryId: p.workbench.catalogue.find(e => e.title === 'Ticket consumer v2').id});
  // The selection of the eligibility case: for the Payment API's responsibility, the two hard constraints with a
  // person's typed reading of the first, and three candidates in this order: the inbox profile, the relay profile, the
  // library entry.
  const threeCandidates = () => {
    let p = selectionProject(), r = send(p, 'selection.start', {kind: 'component', responsibilityIds: ['api'], owner: 'Payments architect', predicates: {'QD-007': PREDICATE}});
    const id = r.selected; p = doc(r);
    for (const [kind, ref, title] of [['profile', released(p, 'inbox'), 'Inbox and deduplication component'], ['profile', released(p, 'relay'), 'Regional message relay'], ['library', library(p), 'Ticket consumer v2']]) p = doc(send(p, 'selection.candidate', {id, candidate: {kind, ref}, title}));
    return {p, id};
  };
  // What Chapter 3 asks before the architect accepts a decision (decisions-domain.js decisionFindings), as a person
  // states it through the chapter's own command: each alternative described, and the chosen one's effect on each driver
  // with its reason and evidence. Then the decision is recorded and accepted, as every decision is.
  const completion = d => d.alternatives.map(a => ({id: d.id, alternativeId: a.id, summary: a.summary || 'The candidate ' + a.title + '.', benefits: a.benefits || 'Stated by the architect.', costs: a.costs || 'Stated by the architect.', consequences: a.consequences || 'Stated by the architect.', ...(a.id === d.selectedAlternativeId ? {assessments: Object.fromEntries(d.driverIds.map(x => [x, {effect: 'neutral', reason: 'Read against the driver by the architect.', evidence: 'Architect review RV-1.'}]))} : {})}));
  const acceptDecision = (p, id) => { for (const payload of completion(decision(p, id))) p = withFinalReview(applyDecisionCommand(p, {type: 'decision.alternative', payload}, AT).document, {upgrade: false}); for (const type of ['decision.record', 'decision.accept']) p = withFinalReview(applyDecisionCommand(p, {type, payload: {id, acknowledge: true}}, AT).document, {upgrade: false}); return p; };

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
    assert.deepEqual(types, ['selection.candidate', 'selection.choose', 'selection.instantiate', 'selection.judge', 'selection.start'], 'the five steps of the selection');
    for (const t of types) { assert.equal(builtInType(t), false, t + ' is no built-in type'); assert.equal(typeof commandHandler(t), 'function'); assert.ok(!e.commands[t].staged, t + ' is no plain design edit a reviewed batch carries'); assert.ok(!e.commands[t].second, t + ': the slice states no second-person step of its own'); }
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
    assert.deepEqual(S.selectionConstraints(p, d).map(c => [c.id, c.driverId, c.hard, c.source, c.predicate || null]), [['QD-007', 'QD-007', true, 'driver', PREDICATE], ['QD-008', 'QD-008', true, 'driver', null]], 'the two hard constraints that reach the responsibility, the first with the person\'s typed reading');
    const rows = title => S.candidateEligibility(p, d, alt(d, title)).rows.map(r => [r.constraintId, r.state, r.basis]);
    assert.deepEqual(rows('Inbox and deduplication component'), [['QD-007', 'pass', 'evaluated'], ['QD-008', 'unknown', 'evaluated']]);
    assert.deepEqual(rows('Regional message relay'), [['QD-007', 'fail', 'evaluated'], ['QD-008', 'unknown', 'evaluated']]);
    assert.deepEqual(rows('Ticket consumer v2'), [['QD-007', 'unknown', 'evaluated'], ['QD-008', 'unknown', 'evaluated']], 'a candidate that states no fact is unknown, never neutral');
    assert.deepEqual(['Inbox and deduplication component', 'Regional message relay', 'Ticket consumer v2'].map(t => S.candidateEligibility(p, d, alt(d, t)).state), ['unproven', 'ineligible', 'unproven']);
    assert.deepEqual(alt(d, 'Inbox and deduplication component').candidate.facts.topology, {value: PROFILE_FACTS.inbox.topology, status: 'declared', source: {kind: 'knowledge', claimId: released(p, 'inbox').claimId, field: 'scope.topology'}}, 'the facts are the released profile\'s, with where they are stated');
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
    pass('S5 eligibility: against "Customer records stay in region North" (with a person\'s typed reading) and "Run only what the platform team operates" the inbox profile reads pass and unknown, the relay profile fail and unknown, the library entry unknown twice; the failing candidate cannot be chosen; the library entry is chosen only once both its unknown rows are named unproven, which the decision\'s assumptions then carry, and approval evidence is refused while they are open');
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
    assert.equal(readDecision(p, d), null, 'the decision\'s weighing is not read for a selection');
    assert.notEqual(readDecision(p, p.decisions.records.find(x => !x.selection)), undefined, 'and a decision without one reads as before');
    p = doc(send(p, 'selection.choose', {id, alternativeId: alt(d, 'Inbox and deduplication component').id, reason: 'Fits the payment path.', unproven: ['QD-008'], rejections: Object.fromEntries(d.alternatives.slice(1).map(a => [a.id, 'Not this one.']))}));
    const after = S.selectionReading(p, decision(p, id));
    assert.deepEqual(after.candidates.map(c => c.title), titles, 'and after the choice'); assert.deepEqual(keysOf(after).filter(k => FORBIDDEN.test(k.split('.').at(-1))), []);
    assert.equal(readDecision(p, decision(p, id)), null);
    pass('S5 no score: the reading, the selection, the candidates, the chooser\'s knowledge and every eligibility hold no score, rank or weight key; five candidates (two profiles, a library entry, an archetype, a build) keep the order they were added, before and after the choice; the decision\'s weighing reads nothing for a selection and reads as before for a decision without one');
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
    assert.throws(() => send(p, 'selection.start', {kind: 'component', responsibilityIds: ['api'], owner: 'Sol', predicates: {'QD-007': PREDICATE}}, A, sol(A)), /typed reading of a hard constraint is a signed-in person's/, 'a draft by Sol states no typed reading of a hard constraint');
    assert.throws(() => send(p, 'selection.start', {kind: 'component', responsibilityIds: ['api'], owner: 'An agent', predicates: {'QD-007': PREDICATE}}, AGENT, agent(AGENT)), /typed reading of a hard constraint is a signed-in person's/);
    const r = send(p, 'selection.start', {kind: 'component', responsibilityIds: ['api'], owner: 'Payments architect'}, A, sol(A)), id = r.selected; p = doc(r);
    assert.equal(decision(p, id).selection.prepared, 'sol-draft', 'a selection a draft by Sol starts is a proposal');
    p = doc(send(p, 'selection.candidate', {id, candidate: {kind: 'library', ref: library(p)}, title: 'Ticket consumer v2'}, A, sol(A)));
    assert.equal(alt(decision(p, id), 'Ticket consumer v2').candidate.by, 'sol', 'a candidate a draft by Sol adds is marked as Sol\'s');
    p = doc(send(p, 'selection.candidate', {id, candidate: {kind: 'existing', ref: {componentId: 'api-pod'}}, title: 'Keep the Payment service'}));
    assert.ok(!('by' in alt(decision(p, id), 'Keep the Payment service').candidate), 'a person\'s is not');
    pass('S5 Sol: a draft by Sol, and an agent account, are refused a typed reading of a hard constraint; a selection a draft by Sol starts is marked as a proposal (prepared sol-draft) and a candidate it adds is marked by Sol; a person\'s candidate is not');
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
    const started = await h.ok('selection.start', {kind: 'component', responsibilityIds: ['api'], owner: 'Payments architect', predicates: {'QD-007': PREDICATE}}), id = started.selected;
    assert.match(id, /^ADR-/); assert.equal(decision(h.doc(), id).provenance?.author?.kind, 'person', 'the decision a person\'s selection writes is stamped as theirs');
    await h.ok('selection.candidate', {id, candidate: {kind: 'profile', ref}, title: 'Inbox and deduplication component'});
    await h.ok('selection.candidate', {id, candidate: {kind: 'archetype', ref: {scope: 'catalogue', archetypeId: ARCHETYPE.id}}, title: ARCHETYPE.name});
    const inbox = alt(decision(h.doc(), id), 'Inbox and deduplication component'), judge = {id, alternativeId: inbox.id, constraintId: 'QD-008', state: 'pass', evidence: 'The platform team runs the inbox (ticket OPS-12).', reason: 'Operated on the platform.'};
    // an agent account's and a draft by Sol's judgement are refused; a person's keeps its actor
    { const r = await h.send('selection.judge', judge, AGENT); assert.equal(r.status, 400); assert.match(r.error, /agent or service account does not review, confirm, accept or approve/); }
    { const r = await h.send('selection.judge', judge, A, {authorKind: 'sol-draft'}); assert.equal(r.status, 400, 'a draft by Sol judges nothing: ' + JSON.stringify(r.body).slice(0, 200)); }
    assert.deepEqual(list(decision(h.doc(), id).selection.judgements), [], 'nothing is written by either');
    { const r = await h.send('selection.judge', {...judge, constraintId: 'QD-007'}, B); assert.equal(r.status, 400); assert.match(r.error, /only a row that reads unknown is judged/i, 'a row the profile\'s facts answer is not judged'); }
    await h.ok('selection.judge', judge, B);
    const j = decision(h.doc(), id).selection.judgements[0];
    assert.deepEqual([j.alternativeId, j.constraintId, j.state, j.actor, j.account], [inbox.id, 'QD-008', 'pass', B, 'person'], 'a person\'s judgement keeps its actor and account kind');
    assert.deepEqual(S.candidateEligibility(h.doc(), decision(h.doc(), id), alt(decision(h.doc(), id), 'Inbox and deduplication component')).rows.map(r => [r.constraintId, r.state, r.basis, r.by || null]), [['QD-007', 'pass', 'evaluated', null], ['QD-008', 'pass', 'person', B]]);
    // choose and instantiate: a signed-in person's
    const others = {[alt(decision(h.doc(), id), ARCHETYPE.name).id]: 'An archetype holds no profile of the inbox.'}, choose = {id, alternativeId: inbox.id, reason: 'The inbox deduplicates and stays in region North.', rejections: others};
    { const r = await h.send('selection.choose', choose, AGENT); assert.equal(r.status, 400); }
    { const r = await h.send('selection.choose', choose, A, {authorKind: 'sol-draft'}); assert.equal(r.status, 400); }
    await h.ok('selection.choose', choose);
    for (const payload of completion(decision(h.doc(), id))) await h.ok('decision.alternative', payload); for (const type of ['decision.record', 'decision.accept']) await h.ok(type, {id, acknowledge: true});
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
    pass('S5 server: an agent account\'s and a draft by Sol\'s judgement are refused and write nothing; a row the profile\'s facts answer is not judged; a person\'s judgement keeps its actor and account kind and the row reads it; choose and instantiate are refused to an agent account and a draft by Sol; the profile adoption is refused to the person who instantiated it and to an agent account, and accepted by a second signed-in person');
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
    // the guided comparison, as the code at the base gave it (captured at 5cae40a), for each option chosen
    for (const o of ['local', 'separate']) assert.deepEqual(decisionSays(guidedConcernPreview(concernProject(), o).preview.document.decisions.records[0]), BASE.guided[o], 'the guided comparison of a released concern gives what it gave at ' + BASE.capturedFrom + ' (' + o + ')');
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
    // released concern states no typed fact of an option), so it is chosen only when named unproven
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
    // retired: the guided comparison's own builder; it reads the one builder the selection uses (architecture-design.js)
    const src = readFileSync(new URL('../public/architecture-design.js', import.meta.url), 'utf8');
    assert.match(src, /export function concernComparison\(/, 'the released concern\'s comparison is one builder');
    assert.equal(src.match(/run\('decision\.alternative',\{id:decisionId,title:option\.title,summary:reasons/g)?.length, 1, 'its alternatives are written in one place');
    const guided = src.slice(src.indexOf('function previewReleasedConcern('), src.indexOf('export function previewArchitectureDesign('));
    assert.match(guided, /concernComparison\(input,t,assessment\.optionId,notes,run\)/, 'the guided comparison writes through that builder'); assert.ok(!/run\('decision\.(?:save|alternative)'/.test(guided), 'and writes no decision or alternative of its own');
    assert.match(readFileSync(new URL('../public/adoption-selection.js', import.meta.url), 'utf8'), /concernComparison/, 'the selection writes its options through that builder');
    pass('S5 parity row 9: the guided comparison of a released concern gives, for each option chosen, the decision and alternatives it gave at ' + BASE.capturedFrom + ' (question, context, requirements, drivers, owner, source, rationale, assumptions, risks, mitigation, status; each alternative\'s texts, assessments and rejection reason); selection.* with kind option gives the same, with the concern pinned and each option a candidate; an option meets the hard constraints (unknown, so chosen only as unproven); a concern that is no longer released is not compared; the comparison has one builder');
  });

  // ------------------------------------------------------------ the SDD
  await block('S5 SDD', async () => {
    pkg(); let {p, id} = threeCandidates();
    const d0 = decision(p, id), lib = alt(d0, 'Ticket consumer v2'), relay = alt(d0, 'Regional message relay'), inbox = alt(d0, 'Inbox and deduplication component');
    p = doc(send(p, 'selection.choose', {id, alternativeId: inbox.id, reason: 'The inbox deduplicates and stays in region North.', unproven: ['QD-008'], rejections: {[relay.id]: 'It keeps messages outside region North.', [lib.id]: 'It states nothing about where it keeps data.'}}));
    const md = architectureMarkdown(withFinalReview(p)).markdown, at = md.indexOf(id + ' ·'), section = md.slice(at, md.indexOf('\n### ', at + 1) > 0 ? md.indexOf('\n### ', at + 1) : at + 6000);
    assert.ok(at >= 0, 'the decision is printed');
    assert.match(section, /\*\*Selection basis\*\*: a component for LR-001 · Payment API, against 2 hard constraints: Customer records stay in region North \(topology eq single-region-north\); Run only what the platform team operates \(no typed reading: unknown until a person judges it\)\./);
    assert.match(section, /Inbox and deduplication component \(profile, released KC-\d+ in KR-\d+\): chosen · Customer records stay in region North: pass; Run only what the platform team operates: unknown, named unproven/);
    assert.match(section, /Regional message relay \(profile, released KC-\d+ in KR-\d+\): rejected · Customer records stay in region North: fail/);
    assert.match(section, /Not chosen: It keeps messages outside region North\./); assert.match(section, /Not chosen: It states nothing about where it keeps data\./);
    assert.ok(!/score|weigh/i.test(section.slice(section.indexOf('**Selection basis**'))), 'the basis weighs nothing');
    pass('S5 SDD: the decision record prints the selection basis (what is selected, each hard constraint with its typed reading or none), each candidate with its kind, its pinned knowledge, its outcome and its rows, the unproven rows named, and each rejected candidate with its reason; nothing is weighed');
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
    { const copy = instantiateTemplate(withFinalReview({...p, workspace: {...p.workspace, reusableTemplate: true}}), 'copy', 'A copy', AT), d = decision(copy, id);
      assert.equal(d.selection, null, 'a project copied from a template carries no selection step: the choice, the judgements and the typed readings are a person\'s in the template');
      assert.equal(readDecision(copy, d), null, 'and its alternatives are still not weighed'); assert.deepEqual(S.selectionReading(copy, d), null); }
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
    assert.match(html, /MSG 004 Transactional outbox relay[\s\S]*?Candidate · not reviewed[\s\S]*?<button[^>]*disabled[^>]*title="Candidate knowledge can be read, not selected\."/, 'the candidate profile is read, labelled, and its Add is disabled with the reason');
    assert.ok(!/score|rank|weigh/i.test(html), 'the view weighs nothing');
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
    if (process.argv.includes('--measure')) { mkdirSync('audit/rc44/evidence', {recursive: true}); writeFileSync(EVIDENCE, JSON.stringify({schema: 'aiw.rc44.slice-size.v3', name: 'wp2 S5 component selection as a recorded decision', measuredWith: 'client-bundle.mjs bundleClient, as node build.mjs builds the client (dist/client-size-report.json: routes.chapters.code, scripts, buckets)', allowance: {chapters: 600, of: 'all of wp2 (ruling A4): S1 books 325 B (ruling N1), so S5 may add at most 275 B', scripts: 148}, caps: {chapters: BUDGET.routes.chapters, scripts: BUDGET.scripts}, bases: {start: {commit: '5cae40a (wp9a slice 1 after its second fix-up, on rc44/integration a4c1690)', chapters: START, projects: 507338, scripts: 148, under10k: 53, css: 901873}, integrated: {commit: '9673661', chapters: INTEGRATED}}, slice: measured, ownBytes: measured.chapters - START, projectsDelta: measured.projects - 507338, headroomAfter: BUDGET.routes.chapters - measured.chapters,
      'opens with records': {gate: 'The chapters-route gate measures opening a document that holds no package records (ruling D10).', host: HOST, ...opens, holds: 'the adoption record\'s readers, steps and tracker (adoption-domain.js), the registration (adoption-package.js), the selection (adoption-selection.js) and its view (adoption-ui.js); not the upgrade (ruling J12)'}}, null, 1) + '\n'); }
    assert.ok(existsSync(EVIDENCE), 'the slice\'s measurement is kept (node rc44-wp2-adoption-validate.mjs --measure)');
    const size = JSON.parse(readFileSync(EVIDENCE, 'utf8')), s1 = JSON.parse(readFileSync(S1_EVIDENCE, 'utf8')), s1Own = s1.ownBytes ?? s1.delta;
    assert.ok(Number.isInteger(size.ownBytes) && size.ownBytes >= 0 && size.ownBytes <= 275, 'S5\'s own route bytes are an integer within what wp2 has left: ' + size.ownBytes);
    assert.equal(size.ownBytes, size.slice.chapters - size.bases.start.chapters); assert.equal(size.slice.scripts, 148); assert.equal(size.slice.css, 901873, 'no stylesheet rule'); assert.equal(size['opens with records'].route, size.slice.chapters);
    if (process.argv.includes('--measure')) assert.deepEqual(measured, size.slice);
    // ruling M4: this build's growth over the integrated base, less every other package's own bytes and the shared pool's, is wp2's (S1's and S5's own)
    const booked = R.routeBookings(EVIDENCE), notWp2 = Object.entries(booked.others).filter(([f]) => !/\/wp2-/.test(f)).reduce((n, [, b]) => n + b, 0), wp2 = measured.chapters - INTEGRATED - notWp2 - booked.poolTotal;
    assert.equal(wp2, s1Own + (measured.chapters - START), 'wp2\'s bytes on this build are S1\'s own and S5\'s: ' + wp2 + ' (the route grew ' + (measured.chapters - INTEGRATED) + ' B over the integrated base; other packages\' own ' + notWp2 + ' B; the shared pool ' + booked.poolTotal + ' B)');
    assert.ok(s1Own + size.ownBytes <= 600, 'S1\'s own bytes and S5\'s stay within wp2\'s 600 B: ' + s1Own + ' + ' + size.ownBytes);
    assert.ok(measured.chapters <= BUDGET.routes.chapters);
    pass('S5 size: every gate passes with the caps unchanged; 148 script files; the selection and its view are held in the lazy entry of ' + HOST + ' with the package, and the library chooser\'s entry holds none of it; S5 books ' + size.ownBytes + ' B of its own on the chapters route (' + START + ' → ' + size.slice.chapters + '), wp2 ' + wp2 + ' B of 600 (S1 ' + s1Own + ' + S5 ' + size.ownBytes + ', ruling M4); opens with records: ' + size['opens with records'].total + ' B (' + size['opens with records'].added + ' B in ' + size['opens with records'].files + ' scripts beside the route)');
  });
  if (h) h.close();
}
