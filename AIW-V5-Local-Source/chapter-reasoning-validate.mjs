// Sol in every chapter model: a chapter's selected record is a decision point for the AIW Brain.
// The reading is the chapter's own; the packet, contract, checks and adoption are the review desk's.
// Run: npm run test:chapter-reasoning
import assert from 'node:assert/strict';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyCanonical} from './public/canonical-command.js';
import {applyKnowledgeCommand, knowledgeImpactStamp, knowledgeState} from './public/knowledge-governance.js';
import {PRODUCT_PACK} from './public/model-knowledge.js';
import {RECORD_TYPES, solTarget, parseTarget, findRecord, chapterReading, chapterStamp, chapterTitle, chapterCommands, chapterReread, describeReread, chapterRound, whatIfValues, fitReading, chapterSubject, homeChapter} from './public/chapter-reasoning.js';
import {reasoningRequest, reasoningPacket, validateReasoningOutput, guardReasoning, settleReasoning, checkRecordRefinements, reasoningCurrency, adoptReasoning, verdictText, instructionsPin, projectNotes, adoptionStatistics} from './public/brain-reasoning.js';
import {mockAssessment, mockReview, envelope} from './mock-llm-provider.mjs';
import {REASONING_PROMPT_VERSION} from './public/brain-reasoning.js';
import {REASONING_INSTRUCTIONS,REVIEW_INSTRUCTIONS} from './shared/reasoning-instructions.js';
import {sha256} from './public/brain-integrity.js';
import {withConfiguredProductFixtures} from './product-configuration-fixtures.mjs';
import {capacityObjective} from './public/desk-capacity.js';
import {reasoningSource} from './public/design-reasoning.js';

const checks = [], pass = n => checks.push(n);
const withoutWorkload = withConfiguredProductFixtures(withFinalReview(seedProject()));
const project = structuredClone(withoutWorkload);
// The current desk sizes a project only against its declared objective. These
// are explicit synthetic inputs, not defaults added to the shipped seed.
project.finalReview.capacity = {kind:'users',value:100000,reviewer:'Synthetic chapter reasoning workload'};
const before = JSON.stringify(project);
const settle = (packet, raw = mockAssessment(packet)) => { const r = guardReasoning(packet, validateReasoningOutput(raw, packet)); return settleReasoning(packet, r, mockReview({candidate: raw})); };

// 1. What Sol can be asked about, wherever a record is selected.
const T = (ch, id, o) => solTarget(project, ch, id, o);
assert.deepEqual([T(2, 'QD-002'), T(2, 'QD-002', {whatIf: true}), T(3, 'ADR-001'), T(3, 'ALT-002'), T(3, 'QD-001'), T(4, 'api'), T(5, 'api-pod'), T(6, 'tc-001'), T(7, 'tr-001'), T(7, 'TO-002'), T(8, 'rest'), T(8, 'instruction'), T(9, 'thr-001'), T(9, 'oauth'), T(9, 'api-pod'), T(9, 'rest'), T(10, 'run-001'), T(8, 'api-pod')],
  ['M:2:QD-002', 'M:2:QD-002|whatif', 'D:ADR-001', 'D:ADR-001', 'M:2:QD-001', 'M:4:api', 'M:5:api-pod', 'M:6:tc-001', 'M:7:tr-001', 'M:7:tr-001', 'M:8:rest', 'M:8:instruction', 'M:9:thr-001', 'M:9:oauth', 'M:9:api-pod', 'M:9:rest', 'M:10:run-001', 'M:5:api-pod']);
assert.equal(T(4, 'nowhere'), null); assert.equal(parseTarget('M:4:<x>'), null); assert.equal(chapterReading(project, 'M:4:api-pod'), null, 'a record is read by its own chapter');
assert.deepEqual(reasoningRequest({task: 'decisions', ids: ['M:2:QD-002|whatif'], values: {'M:2:QD-002|whatif': {targetValue: '99.99', priority: 'High', extra: 'x'}}}).values, {'M:2:QD-002|whatif': {targetValue: '99.99', priority: 'High'}});
assert.deepEqual(whatIfValues({targetValue: 'lots', priority: 'Urgent'}), {});
pass('what Sol can be asked about: every chapter\'s own records — drivers, responsibilities, components, capabilities, realisations and their options, contracts and data, threats and controls, runtime plans; Chapter 3\'s decisions and alternatives as the desk\'s decisions; a part seen from Chapter 9 as what could go wrong; a What if move with only its target and priority');

// 2. Each chapter's reading: its own words, the record, what is not recorded, the checks, the vitals.
const read = id => chapterReading(project, id);
const plan = read('M:10:run-001');
assert.equal(plan.kind, 'record'); assert.equal(plan.type, 'plan');
assert.match(plan.reading.chapterReads, /Payment service runs 1 active in Application zone/);
assert.ok(plan.reading.notRecorded.includes('monitoring') && plan.reading.notRecorded.includes('recoveryMinutes'));
assert.ok(plan.reading.checks.some(c => c.level === 'error' && /Define RUN-001 recovery/.test(c.title)));
assert.ok(plan.reading.vitals.some(v => v.vital === 'Capacity' && v.recorded === 'needs 24 replicas' && /100,000 concurrent users/.test(v.why)), 'the desk\'s capacity reading follows the explicitly saved workload');
const omittedObjective = capacityObjective(reasoningSource(withoutWorkload), withoutWorkload.finalReview.capacity);
assert.equal(omittedObjective.source.kind, 'none'); assert.equal(omittedObjective.value, null, 'an omitted workload remains unknown');
assert.ok(!chapterReading(withoutWorkload, 'M:10:run-001').reading.vitals.some(v => v.vital === 'Capacity'), 'the chapter reading does not invent a capacity result when no workload is stated');
assert.deepEqual(plan.knobs.map(k => [k.key, k.type, k.value]), [['maxReplicas', 'number', 1], ['minReady', 'number', 1], ['recoveryMinutes', 'number', ''], ['scalingPolicy', 'textarea', ''], ['recoveryPlan', 'textarea', ''], ['monitoring', 'textarea', '']]);
assert.ok(plan.products.includes('Kubernetes'));
const drv = read('M:2:QD-002');
assert.ok(drv.reading.tactics.named.length && drv.reading.carriedBy.components.includes('APP-001'));
const move = chapterReading(project, 'M:2:QD-002|whatif', {values: {targetValue: '99.99'}});
assert.equal(move.kind, 'whatif'); assert.deepEqual(move.knobs, []);
assert.match(move.reading.whatIf.target, /99\.9 → 99\.99 %/); assert.match(move.reading.whatIf.arithmetic, /4\.3 minutes/); assert.equal(move.reading.whatIf.direction, 'stricter');
const real = read('M:7:tr-001');
assert.deepEqual(real.preferred, ['TO-001', 'TO-002']); assert.ok(real.reading.options.length === 2);
const contract = read('M:8:rest');
assert.match(contract.reading.between, /Initiating channel|ext-channel/); assert.ok(contract.reading.vitals.every(v => ['Latency', 'Integrity', 'Protection', 'Availability'].includes(v.vital)), 'a contract bears on waiting, repeats and protection');
const exposure = read('M:9:api-pod');
assert.equal(exposure.kind, 'exposure'); assert.deepEqual(exposure.proposals.targets.map(t => t.id), ['api-pod', 'rest', 'if-004', 'instruction']);
assert.ok(exposure.reading.threatsRecorded.some(t => /THR-001/.test(t)));
const threat = read('M:9:thr-001');
assert.ok(threat.reading.coveredBy.some(c => /SEC-001/.test(c)));
for (const [type, R] of Object.entries(RECORD_TYPES)) { const r = (R.coll(project) || [])[0]; if (!r) { assert.equal(type, 'action', 'only Chapter 11 delivery actions are absent from the reference project'); continue; } const x = read(`M:${R.chapter}:${r.id}`); assert.ok(x && x.type === type && x.knobs.length === R.knobs.length && x.reading.record, type); }
// Chapter 1's requirements and constraints and Chapter 11's SDD narrative are records like the others (round 2, I2-02).
const requirement = read('M:1:REQ-001');
assert.equal(requirement.type, 'requirement'); assert.deepEqual(requirement.knobs.map(k => k.key), ['description', 'acceptance']); assert.match(requirement.reading.chapterReads, /REQ-001 Accept a traceable payment instruction \(Must\) is needed at/);
assert.ok(requirement.reading.fulfilledBy.some(x => /LR-001/.test(x)) && requirement.reading.scenarios.length && requirement.drivers.includes('QD-002'), 'a requirement reads what fulfils it, its scenarios and its drivers');
assert.ok(requirement.rows.length >= 1 && requirement.reading.vitals?.length, 'the desk\'s vitals for the parts that realise it');
assert.equal(read('M:1:CON-001').type, 'constraint'); assert.equal(solTarget(project, 4, 'REQ-001'), 'M:1:REQ-001', 'a requirement selected anywhere is read by Chapter 1');
const sdd = read('M:11:SDD');
assert.equal(sdd.type, 'narrative'); assert.deepEqual(sdd.knobs, []); assert.match(sdd.reading.chapterReads, /The SDD as Chapter 11 reads it: \d+ findings to fix/); assert.ok(sdd.reading.readiness.blockers > 0 && sdd.reading.notRecorded.includes('summary'));
assert.equal(solTarget(project, 11, 'SDD'), 'M:11:SDD'); assert.throws(() => chapterCommands(project, 'M:11:SDD', {summary: 'x'}), /none of the record’s fields/, 'Chapter 11\'s narrative takes no refinements: its command is not a staged design change');
const reqCmd = chapterCommands(project, 'M:1:REQ-001', {acceptance: 'Given a valid instruction, when it is accepted, then a reference is returned within 2 seconds and can be used for status enquiry.'});
assert.equal(reqCmd[0].type, 'artefact'); assert.equal(applyCanonical(project, reqCmd[0], '2026-09-25T12:00:00Z').document.artefacts.find(a => a.id === 'REQ-001').acceptance, reqCmd[0].payload.acceptance, 'a requirement\'s refinement is the ordinary artefact command');
assert.deepEqual(chapterReread(project, 'M:1:REQ-001', reqCmd).same, true);
assert.deepEqual(chapterRound(project, 1).slice(0, 2), ['M:1:REQ-005', 'M:1:CON-001'], 'Chapter 1\'s round: the artefacts with the most open checks');
pass('Chapter 1\'s requirements and constraints and Chapter 11\'s SDD narrative are read by their chapters: a requirement with what fulfils it, its scenarios, drivers and the desk\'s vitals, refined through the ordinary artefact command; the narrative against the SDD\'s readiness, assessed but never refined');
// Sol's subject on a chapter page (round 2, I2-01): the chapter's own record, never a selection carried from another chapter.
for (const [ch, own] of [[5, 'component'], [6, 'capability'], [7, 'realisation'], [8, 'contract'], [9, 'control'], [10, 'plan']]) { const s = chapterSubject(project, ch, 'api', {tab: 'work'}); assert.notEqual(s.id, 'api', ch); assert.equal(findRecord(project, s.id)?.type === own || RECORD_TYPES[findRecord(project, s.id)?.type]?.chapter === ch, true, `${ch}: ${s.id}`); assert.equal(s.carried, 'api'); assert.equal(s.homeChapter, 4); }
assert.deepEqual(chapterSubject(project, 11, 'api', {tab: 'validate'}), {id: 'project', own: false, carried: 'api', homeChapter: 4});
assert.deepEqual(chapterSubject(project, 4, 'api', {tab: 'work'}), {id: 'api', own: true, carried: null, homeChapter: 4});
assert.deepEqual(chapterSubject(project, 8, 'api', {tab: 'work', pinned: true}), {id: 'api', own: false, carried: null, homeChapter: 4}, 'a pinned selection stays');
assert.deepEqual(chapterSubject(project, 5, 'api', {tab: 'model'}), {id: 'project', own: false, carried: 'api', homeChapter: 4}, 'on the Model tab a carried selection gives way to the companion');
assert.equal(chapterSubject(project, 1, null, {tab: 'work'}).id, 'REQ-005'); assert.equal(chapterSubject(project, 3, 'REQ-001', {tab: 'work'}).id, 'ADR-001'); assert.equal(chapterSubject(project, 2, 'QD-003', {tab: 'output'}).id, 'QD-003');
assert.equal(homeChapter(project, 'nowhere'), null); assert.equal(homeChapter(project, 'TO-002'), 7);
pass('Sol\'s subject on Work, Validate and Output is the chapter\'s own record with the most open checks when the studio carries another chapter\'s selection, that selection named as carried; a pin keeps it; on the Model tab the companion owns it');
// The instruction set is pinned into every packet (round 2, I2-16).
const pin = instructionsPin();
assert.equal(pin.promptVersion, REASONING_PROMPT_VERSION); assert.equal(pin.sha256,sha256(REASONING_INSTRUCTIONS+'\n--- review ---\n'+REVIEW_INSTRUCTIONS)); assert.deepEqual(instructionsPin(), pin);
const pinned = reasoningPacket(project, {task: 'decisions', ids: ['M:10:run-001'], scope: 'pin'});
assert.deepEqual(pinned.brainReceipt.instructions, pin);
pass('every reasoning packet pins the prompt version and the SHA-256 of the exact instruction set, so a recorded assessment can be attributed after the prompt changes');
pass('each chapter\'s reading: the chapter model\'s own words, the record\'s fields and what it does not record, the journey\'s checks on it, the desk\'s vitals for the parts it touches, and what the chapter knows besides — a driver\'s carriers and tactics, a What if\'s reach and arithmetic, a realisation\'s options, a contract\'s ends, a part\'s recorded threats and what a threat on it may target');

// 3. What identifies a reading: the record and what it touches — and, in What if, the move.
const s0 = chapterStamp(project, 'M:10:run-001');
assert.equal(chapterStamp(project, 'M:10:run-001'), s0);
const edited = applyCanonical(project, chapterCommands(project, 'M:10:run-001', {monitoring: 'Alert on the error rate; page the Channels team.'})[0], '2026-09-25T12:00:00Z').document;
assert.notEqual(chapterStamp(edited, 'M:10:run-001'), s0, 'an edit to the record changes its reading');
assert.notEqual(chapterStamp(edited, 'M:4:api'), chapterStamp(project, 'M:4:api'), 'the responsibility the plan runs reads the change in its vitals');
assert.equal(chapterStamp(edited, 'M:8:rest'), chapterStamp(project, 'M:8:rest'), 'a contract, which bears on waiting, repeats and protection, reads the same');
assert.equal(chapterStamp(edited, 'M:10:run-002'), chapterStamp(project, 'M:10:run-002'), 'another part reads the same');
assert.notEqual(chapterStamp(project, 'M:2:QD-002|whatif', {values: {targetValue: '99.99'}}), chapterStamp(project, 'M:2:QD-002|whatif', {values: {targetValue: '99.95'}}), 'another move is another question');
assert.equal(chapterTitle(project, 'M:2:QD-002|whatif', {targetValue: '99.99'}), 'QD-002 · What if At least 99.99 %');
assert.equal(chapterTitle(project, 'M:9:api-pod'), 'APP-001 Payment service · what could go wrong'); assert.match(chapterTitle(project, 'D:ADR-001'), /^ADR-001 · When should/);
pass('what identifies a reading: the record and the checks and vitals of what it touches, so an edit makes earlier advice history — for the record and for the records whose vitals it moves — while the rest keep theirs; in What if, the move itself');

// 4. Refinements become the chapter's own change command, and change nothing else.
const KEYS = ['brief', 'artefacts', 'relationships', 'processModel', 'quality', 'decisions', 'logical', 'realisation', 'technology', 'technologyRealisation', 'interfaces', 'security', 'runtime'];
const walk = (a, b, path, out) => {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a)) { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], path + '.' + k, out); return; }
  if (Array.isArray(a) && Array.isArray(b) && a.every(x => x?.id) && b.every(x => x?.id)) { const A = new Map(a.map(x => [x.id, x])), B = new Map(b.map(x => [x.id, x])); for (const k of new Set([...A.keys(), ...B.keys()])) walk(A.get(k), B.get(k), `${path}[${k}]`, out); return; }
  out.push(path);
};
// What a chapter's own editor rewrites with any save: its version, the record's history, and derived fields. Round 12
// (DM-17): the first edit of a record AIW made makes it its author's, so its origin is rewritten too. Round 12 (G-32): a
// record's reading keeps the ids of the drivers and decisions it read beside its fingerprint.
const DERIVED = /\.(version|revision|history|sourceSnapshot|sourceDriverIds|sourceDecisionIds|candidateKey|updatedAt|origin)$|logical\.mappings\[[^\]]+\]\.evidence$|technology\.capabilities\[[^\]]+\]\.need$/;
let knobs = 0;
for (const [type, R] of Object.entries(RECORD_TYPES)) {
  const r = (R.coll(project) || [])[0]; if (!r || !R.knobs.length) continue;
  const id = `M:${R.chapter}:${r.id}`;
  for (const k of R.knobs) {
    const v = k.type === 'number' ? Math.max(k.min, Number(r[k.key]) || 0) + (k.key === 'minReady' ? 0 : k.step || 1) : `Sharpened ${k.label.toLowerCase()} for ${r.ref || r.id}.`;
    const q = applyCanonical(project, chapterCommands(project, id, {[k.key]: v})[0], 'preview').document, out = [];
    for (const key of KEYS) walk(project[key], q[key], key, out);
    assert.deepEqual(out.filter(x => !x.endsWith('.' + k.key) && !DERIVED.test(x)), [], `${type}.${k.key} changes only itself`);
    assert.ok(out.some(x => x.endsWith('.' + k.key)) || String(r[k.key]) === String(v), `${type}.${k.key} is saved`);
    knobs++;
  }
}
assert.throws(() => chapterCommands(project, 'M:10:run-001', {owner: 'Somebody'}), /none of the record’s fields/);
assert.throws(() => chapterCommands(project, 'M:2:QD-002|whatif', {targetValue: '99.99'}), /chapter record/);
pass(`refinements become the chapter's own change command: each of ${knobs} knobs across ${Object.keys(RECORD_TYPES).length} record types changes its own field and nothing else — the component's allocations, the capability's and realisation's mappings and the contract's exchanges are kept — and no other field can be named`);

// 5. The instruments read the design again with them.
const r1 = chapterReread(project, 'M:10:run-001', chapterCommands(project, 'M:10:run-001', {monitoring: 'Alert on error rate above 1 % for 5 minutes; page the Channels team.', recoveryMinutes: 5}));
assert.ok(r1.moved.some(m => m.ref === 'RUN-001' && m.vital === 'Observability' && m.to === 'Normal' && m.better));
assert.match(describeReread(r1), /RUN-001 observability: critical → normal/);
const r2 = chapterReread(project, 'M:8:rest', chapterCommands(project, 'M:8:rest', {idempotencyKey: 'paymentReference', duplicatePolicy: 'Return the recorded outcome for a repeated reference.'}));
assert.ok(r2.cleared.includes('Define duplicate handling for IF-001'));
assert.throws(() => chapterReread(project, 'M:10:run-001', chapterCommands(project, 'M:10:run-001', {minReady: 5})), /cannot be below the minimum/);
assert.match(describeReread({same: true}, {numeric: true}), /new numbers do not change/);
pass('the instruments read the design again with the refinements: which checks clear and which appear, and which vitals move (monitoring turns RUN-001\'s observability from critical to normal; a duplicate policy clears IF-001\'s check); a value the chapter\'s own rules reject fails here, before any review');

// 6. The packet: the chapter's reading first, fitted to its share, then what is known about it.
const k1 = reasoningPacket(project, {task: 'decisions', ids: ['M:10:run-001']});
assert.equal(k1.sources[0].kind, 'chapter-reading'); assert.equal(k1.sources[0].objectId, 'run-001'); assert.equal(k1.sources[0].truncated, false);
assert.match(k1.sources[0].posture, /Chapter 10’s reading of its own record/);
const kinds = new Set(k1.sources.map(s => s.kind));
// rc39: the packet admits the saved architecture context (model records) and the contextual deductions before optional
// knowledge, so a playbook entry may be left out when the budget is spent; then it is recorded as omitted for the
// character budget and the packet is in fact at its bound. Nothing is dropped in silence.
const omittedKinds = new Set(k1.omissions.filter(o => o.reason === 'character budget').map(o => o.id.split(':')[0]));
const atBound = k1.sources.reduce((n, s) => n + s.excerpt.length, 0) > 28000 * 0.85;
for (const k of ['planning-assumptions', 'product-mechanism', 'model']) assert.ok(kinds.has(k), k);
assert.ok(kinds.has('playbook-entry') || (omittedKinds.has('tactic') && atBound), 'playbook-entry: present, or omitted for the character budget with the packet at its bound');
assert.equal(k1.items[0].objectId, 'run-001'); assert.deepEqual(k1.items[0].allowed.verdicts, ['apply', 'refine', 'reconsider', 'judge', 'insufficient']);
const k4 = reasoningPacket(project, {task: 'decisions', ids: ['M:4:api']});
assert.ok(!k4.sources.some(s => s.kind === 'planning-assumptions'), 'the objective only where capacity is read');
const round = chapterRound(project, 9);
assert.equal(round.length, 6); assert.ok(round.every(id => id.startsWith('M:9:')));
const k9 = reasoningPacket(project, {task: 'decisions', ids: round});
assert.ok(k9.sources.filter(s => s.kind === 'chapter-reading').every(s => !s.truncated), 'six readings, each fitted whole to its share');
assert.ok(k9.coverage.characters <= 28000 && k9.sources.length <= 22);
const kw = reasoningPacket(project, {task: 'decisions', ids: ['M:2:QD-002|whatif'], values: {'M:2:QD-002|whatif': {targetValue: '99.99'}}});
assert.match(kw.sources[0].excerpt, /"whatIf":\{"target":"At least 99\.9 → 99\.99 %"/);
assert.deepEqual(kw.items[0].allowed.verdicts, ['apply', 'reconsider', 'judge', 'insufficient']);
for (const id of ['M:5:api-pod', 'M:10:run-001', 'M:2:QD-002']) { const f = fitReading(read(id).reading, 900); assert.ok(JSON.stringify(f).length <= 1500 && f.record && f.recorded && f.checks, id + ': a fitted reading keeps the record, its fields and its checks'); }
const secret = structuredClone(project); secret.workspace = {...(secret.workspace || {}), aiPolicy: {...(secret.workspace?.aiPolicy || {}), excludedObjectIds: ['rest']}};
assert.throws(() => reasoningPacket(secret, {task: 'decisions', ids: ['M:8:rest']}), /disclosure policy excludes/);
const off = applyKnowledgeCommand(project, {type: 'knowledge.withdraw', payload: {id: PRODUCT_PACK.id, reviewer: 'Knowledge steward', reason: 'Vendor pages under review.', reviewed: true, stamp: knowledgeImpactStamp(project, PRODUCT_PACK.id)}}, '2026-09-25T12:00:00Z').document;
assert.ok(!reasoningPacket(off, {task: 'decisions', ids: ['M:10:run-001']}).sources.some(s => s.kind === 'product-mechanism'), 'withdrawn knowledge is not sent');
pass('the packet: the chapter\'s reading first and whole, fitted to its share (six in a round), then the objective only where capacity is read, the documented product mechanisms, the drivers and the playbook\'s tactics; a What if carries its move and cannot be refined; the disclosure policy and knowledge withdrawals apply as on the desk');

// 7. The contract per kind, and the chapter's own rules as a further check.
const a1 = settle(k1);
assert.equal(a1.assessments[0].verdict, 'refine'); assert.equal(a1.assessments[0].refinements[0].key, 'maxReplicas');
const checked = checkRecordRefinements(project, k1, a1);
assert.match(checked.assessments[0].reread, /read the same|Read again/);
const wrong = structuredClone(a1); wrong.assessments[0].refinements = [{key: 'minReady', label: 'Ready copies', value: 5, why: 'More ready copies.'}];
const rejected = checkRecordRefinements(project, k1, wrong).assessments[0];
assert.equal(rejected.withheld, true); assert.match(rejected.reasoning, /chapter’s own rules reject its refinements: Maximum replicas cannot be below/);
const bad = mockAssessment(kw); bad.assessments[0].verdict = 'refine';
assert.match(guardReasoning(kw, validateReasoningOutput(bad, kw)).assessments[0].problems.join(' '), /not a verdict/, 'a move cannot be refined');
const ke = reasoningPacket(project, {task: 'decisions', ids: ['M:9:api-pod']}), ae = settle(ke);
assert.equal(ae.assessments[0].verdict, 'judge'); assert.deepEqual(ae.assessments[0].proposals[0].targetIds, ['api-pod']);
const kr = reasoningPacket(project, {task: 'decisions', ids: ['M:7:tr-001']}), ar = settle(kr);
assert.equal(ar.assessments[0].preferred, 'TO-002', 'a preferred option, as advice');
const guarantee = mockAssessment(k1); guarantee.assessments[0].refinements = [{key: 'scalingPolicy', value: 'Scale out on CPU; this guarantees zero loss of capacity.', why: 'Scale.'}];
const g0 = guardReasoning(k1, validateReasoningOutput(guarantee, k1)).assessments[0];
assert.deepEqual(g0.refinements, [], 'refined wording that guarantees an outcome is never offered for use');
assert.deepEqual(g0.setAside.map(r => r.key), ['scalingPolicy']); assert.match(g0.setAside[0].reason, /guaranteeing an outcome[\s\S]*never applied/);
assert.deepEqual(g0.problems, [], 'the rest of the advice stands');
assert.deepEqual([verdictText('record', 'apply').short, verdictText('whatif', 'apply').short, verdictText('exposure', 'apply').short, verdictText('fix', 'apply').short], ['Sound', 'Holds up', 'Covered', 'Apply']);
pass('the contract per kind: a record may be refined within its knobs, a move may not; a part seen from Chapter 9 takes proposed threats on its listed targets; a realisation may name a preferred option; refined wording that guarantees an outcome is set aside, never applied, while the rest of the advice stands; and a refinement the chapter\'s own rules reject is withheld, while one that passes carries the instruments\' re-reading');

// 8. Through the server, and what the architect did with it.
const files = new Map(), owner = 'chapter-sol-test', id = project.id;
const env = {DB: localDatabase(':memory:'), OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'test-model', FILES: {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k)} : null; }, async delete(k) { files.delete(k); }}, ASSETS: {fetch: () => new Response('asset')}};
await env.DB.prepare('INSERT INTO projects (owner_id,id,document,revision,updated_at) VALUES (?,?,?,1,?)').bind(owner, id, JSON.stringify(project), new Date().toISOString()).run();
const req = async (path, body) => { const r = await worker.fetch(new Request('https://aiw.test' + path + (path.includes('?') ? '&' : '?') + 'project=' + id, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': owner, Origin: 'https://aiw.test', 'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined}), env); return {status: r.status, data: await r.json()}; };
const previous = globalThis.fetch;
globalThis.fetch = async (url, options) => { const body = JSON.parse(options.body), input = JSON.parse(body.input[0].content); return new Response(JSON.stringify(envelope(body.text.format.name === 'aiw_desk_assessment' ? mockAssessment(input) : mockReview(input)))); };
try {
  const raw = {task: 'decisions', ids: ['M:10:run-001', 'M:9:api-pod', 'M:2:QD-002|whatif'], values: {'M:2:QD-002|whatif': {targetValue: '99.99'}}, scope: 'chapter-test'};
  const prepared = await req('/api/intelligence/reasoning-context', raw);
  assert.equal(prepared.status, 200, JSON.stringify(prepared.data));
  const requestId = crypto.randomUUID(), reasoned = await req('/api/intelligence/reason', {...raw, packetStamp: prepared.data.packet.stamp, requestId});
  assert.equal(reasoned.status, 200, JSON.stringify(reasoned.data));
  const [aPlan, aPart, aMove] = reasoned.data.result.assessments;
  assert.equal(aPlan.verdict, 'refine'); assert.match(aPlan.reread, /read the same|Read again/); assert.equal(aPart.proposals.length, 1); assert.equal(aMove.verdict, 'judge');
  const cmd = (revision, payload) => req('/api/commands', {revision, command: {type: 'intelligence.adopt', payload: {runId: requestId, kind: 'assessment', ...payload}}});
  const used = await cmd(1, {itemId: 'M:10:run-001', outcome: 'used'});
  assert.equal(used.status, 200, JSON.stringify(used.data));
  const rec = used.data.document.coauthoring.assessments[0];
  assert.equal(rec.kind, 'record'); assert.equal(rec.chapter, 10); assert.ok(rec.sources.some(s => s.kind === 'chapter-reading' && s.objectId === 'run-001'));
  const agreed = await cmd(used.data.revision, {itemId: 'M:2:QD-002|whatif', outcome: 'used'});
  assert.equal(agreed.status, 200, 'agreeing with a move is recorded while the move reads as it did');
  const runDoc = JSON.parse(files.get([...files.keys()].find(k => k.endsWith(requestId + '.json'))));
  const doc = agreed.data.document, changed = applyCanonical(doc, chapterCommands(doc, 'M:10:run-001', {maxReplicas: 2})[0], '2026-09-25T12:00:00Z').document;
  const cur = reasoningCurrency(changed, runDoc);
  assert.equal(cur.get('M:10:run-001'), false, 'applied, the advice is history'); assert.equal(cur.get('M:9:api-pod'), true); assert.equal(cur.get('M:2:QD-002|whatif'), true);
  assert.equal(adoptReasoning(changed, {itemId: 'M:10:run-001', outcome: 'applied'}, runDoc).document.coauthoring.assessments.at(-1).outcome, 'applied');
  assert.deepEqual(rec.instructions, instructionsPin(), 'the recorded outcome names the prompt it answered');
  // A recorded disagreement becomes a project note Sol reads with the record, as testimony, until the stewards capture it (round 2, I2-19).
  const declined = adoptReasoning(doc, {itemId: 'M:9:api-pod', outcome: 'dismissed', reason: 'The gateway already enforces caller authority for this part.'}, runDoc).document;
  const noted = reasoningPacket(declined, {task: 'decisions', ids: ['M:9:api-pod'], scope: 'note'}), note = noted.sources.find(s => s.kind === 'project-note');
  assert.ok(note && /the architect’s recorded reason, unreviewed/.test(note.title) && /gateway already enforces/.test(note.excerpt) && /not yet captured/.test(note.excerpt), 'the dismissal is read as a project note');
  assert.equal(projectNotes(declined, {id: 'M:9:api-pod', objectId: 'api-pod'}).length, 1); assert.equal(projectNotes(declined, {id: 'K:SA-003', objectId: 'api-pod'}).length, 0, 'a stewardship item takes none');
  assert.ok(!reasoningPacket(declined, {task: 'decisions', ids: ['M:10:run-001'], scope: 'note'}).sources.some(s => s.kind === 'project-note'), 'another record reads no note');
  const captured = structuredClone(declined); captured.knowledge = {...structuredClone(knowledgeState(declined)), stewardship: [{assessmentId: declined.coauthoring.assessments.at(-1).id, decision: 'captured', claimId: 'x'}]};
  assert.ok(!reasoningPacket(captured, {task: 'decisions', ids: ['M:9:api-pod'], scope: 'note'}).sources.some(s => s.kind === 'project-note'), 'once captured by the stewards the note is no longer sent as testimony');
  const excludedP = structuredClone(declined); excludedP.workspace = {...(excludedP.workspace || {}), aiPolicy: {excludedObjectIds: ['api-pod']}};
  assert.throws(() => reasoningPacket(excludedP, {task: 'decisions', ids: ['M:9:api-pod'], scope: 'note'}), /disclosure policy/);
  // What architects did with the advice, counted (round 2, I2-17).
  const stats = adoptionStatistics(declined);
  assert.equal(stats.items, 3); assert.equal(stats.taken, 2); assert.equal(stats.dismissed, 1); assert.equal(stats.acceptance, 0.667);
  assert.ok(stats.byChapter.find(r => r.key === 9)?.dismissed === 1 && stats.byField.find(r => r.key === 'maxReplicas')?.taken === 1 && stats.bySource.find(r => r.key === 'chapter-reading')?.advised === 3);
  assert.ok(stats.byVerdict.find(r => r.key === 'judge')?.advised === 2 && stats.byKind.find(r => r.key === 'exposure')?.dismissed === 1);
  const fresh = structuredClone(changed); fresh.coauthoring.assessments = [];
  assert.throws(() => adoptReasoning(fresh, {itemId: 'M:10:run-001', outcome: 'used'}, runDoc), /reading changed/);
  assert.equal((await req('/api/intelligence/reasonings')).data.runs[0].packet.items[0].objectId, 'run-001');
  pass('through the server: chapter records, a Chapter 9 part and a What if move in one request; the refinement arrives with the instruments\' re-reading; use, agreement and application are recorded with the chapter and the chapter reading they rested on; once the record changes, the advice is history');
} finally { globalThis.fetch = previous; }

assert.equal(JSON.stringify(project), before);
pass('reading, reasoning, re-reading and adopting change nothing in the project itself');
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
