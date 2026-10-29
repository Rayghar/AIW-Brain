// Product choice checks: what each product is documented to do, suggested judgements, the weighing
// of Chapter 7's options against the drivers, switch points under an objective, and recording
// suggestions through Chapter 7's own command. Run: npm run test:product-choice
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview, applyFinalReviewCommand} from './public/review-domain.js';
import {applyTechnologyRealisationCommand} from './public/technology-realisation-domain.js';
import {ATTRIBUTES} from './public/playbook-knowledge.js';
import {reasoningSource, tuneDriver} from './public/design-reasoning.js';
import {capacityObjective, capacityPlan, ASSUMPTIONS} from './public/desk-capacity.js';
import {TRAITS, CEILINGS, traitsFor, playbookNames, operatingTrait, ceilingOf, spreadsOf} from './public/product-knowledge.js';
import {choiceReading, choiceForDesign, suggest, suggestionCommands, describeChoice} from './public/product-choice.js';
import {deskModel} from './public/desk-model.js';
import {optionsFor, stackSource} from './public/stack-model.js';
import {optionsLayout} from './public/stack-layout.js';
import {choiceTableHTML} from './public/choice-ui.js';
import {productComparison} from './public/product-comparison.js';
import {withConfiguredProductFixtures} from './product-configuration-fixtures.mjs';

const checks = [], pass = n => checks.push(n);
const unconfigured = withFinalReview(seedProject());
const project = withConfiguredProductFixtures(unconfigured), before = JSON.stringify(project);
const clone = x => structuredClone(x);
const attrs = new Set(ATTRIBUTES.map(a => a.id));
const at = (p, users) => { const R = reasoningSource(p), O = capacityObjective(R, p.finalReview?.capacity || null, users ? {kind: 'users', value: users} : p.finalReview?.capacity?.value ? null : {example:true}), plan = capacityPlan(R, O); return {plan, O}; };
const read = (p, id, users = null) => { const {plan, O} = at(p, users); return choiceReading(p, id, {ceiling: plan.rows.find(r => r.id === id)?.ceiling || null, objective: {text: plan.objText, source: O.source}}); };

// 1. What each product is documented to do, with where.
assert.ok(TRAITS.length >= 20);
for (const t of TRAITS) { assert.match(t.src, /^https:\/\//, t.id + ' names its source'); assert.ok(t.attrs.every(a => attrs.has(a)), t.id + ' bears on known attributes'); assert.ok(['supports', 'tension', 'ceiling'].includes(t.effect)); assert.ok(t.text.length > 30); }
for (const c of Object.values(CEILINGS)) assert.ok(ASSUMPTIONS.some(a => a.key === c.key), c.key + ' is a planning assumption the reviewer can change');
assert.deepEqual(traitsFor('RabbitMQ').map(t => t.id), ['rabbit-quorum', 'rabbit-ack', 'rabbit-consumed', 'rabbit-leader']);
assert.equal(ceilingOf('RabbitMQ').key, 'queueMsgPerSec'); assert.equal(ceilingOf('PostgreSQL').key, 'primaryWritesPerSec'); assert.equal(ceilingOf('Apache Kafka'), null);
assert.ok(spreadsOf('Apache Kafka') && spreadsOf('MongoDB') && !spreadsOf('RabbitMQ'));
assert.deepEqual(playbookNames('RabbitMQ').map(n => n.attr + ' ' + n.src), ['performance QR-Guidebook!H4', 'scalability QR-Guidebook!H5'], 'the playbook\'s own technology lists, with their cells');
assert.equal(operatingTrait('Self managed').effect, 'tension'); assert.equal(operatingTrait('Provider managed').effect, 'supports'); assert.equal(operatingTrait('Shared group service'), null);
pass('what each product is documented to do: 24 traits, each a mechanism with its source and the attributes it bears on; two single-unit ceilings (one queue, one primary) whose limits are planning assumptions; the SA Playbook\'s own technology lists; and the operating model');

// 2. Suggested judgements, from mechanisms.
const R3 = project.technologyRealisation.records.find(r => r.id === 'tr-003'), [rabbit, kafka] = R3.options;
const crit = id => ({id, kind: 'driver', attr: project.quality.drivers.find(d => d.id === id).category});
const unconfiguredMessaging=unconfigured.technologyRealisation.records.find(r=>r.id==='tr-003');
assert.notEqual(suggest(unconfiguredMessaging.options[1],crit('QD-006')).effect,'supports','a product name does not declare retention');
assert.equal(choiceForDesign(unconfigured,'tr-003').ceiling,null,'neither an unstated load nor an unstated queue topology creates a project ceiling');
const unconfiguredPlan=at(unconfigured).plan,configuredPlan=at(project).plan;
assert.equal(unconfiguredPlan.rows.find(r=>r.id==='tr-003').ceiling,null,'an explicit example objective does not invent a quorum queue');
assert.equal(unconfiguredPlan.rows.find(r=>r.id==='tr-002').ceiling,null,'a database name does not declare a single write primary');
assert.equal(unconfiguredPlan.lambda,configuredPlan.lambda,'configuration gating preserves the analytical arrival-rate equation');
const noPartitioning=clone(project);noPartitioning.technologyRealisation.records.find(r=>r.id==='tr-002').options.find(o=>o.product==='MongoDB').configurationFacts['mongo.sharding']=false;
assert(!at(noPartitioning).plan.rows.find(r=>r.id==='tr-002').ceiling.others.some(o=>o.product==='MongoDB'),'a conflicting alternative topology cannot supply spreading advice');
assert.equal(suggest(rabbit, crit('QD-006')).effect, 'tension'); assert.match(suggest(rabbit, crit('QD-006')).reasons[0].text, /removes a message once it is acknowledged/);
assert.equal(suggest(kafka, crit('QD-006')).effect, 'supports'); assert.match(suggest(kafka, crit('QD-006')).reasons[0].src, /kafka\.apache\.org/);
assert.equal(suggest(rabbit, crit('QD-003')).weak, true, 'the playbook naming a product is shown as weak');
assert.equal(suggest(rabbit, crit('QD-001')), null, 'nothing documented bears on it, so nothing is suggested');
assert.equal(suggest(rabbit, {id: 'operations', kind: 'other'}).effect, 'tension');
pass('suggestions come from mechanisms: a RabbitMQ queue removes what it delivers, so it strains the payment trail (QD-006) where Kafka\'s retained log supports it; the playbook merely naming a product is shown as weak; where nothing is documented, nothing is suggested');

// 3. The weighing and the switch points, at the playbook's objective.
const C3 = read(project, 'tr-003');
assert.equal(C3.leanRecorded, null, 'nothing is judged yet'); assert.equal(C3.leanAll, 'TO-006');
assert.deepEqual(C3.options.map(o => o.score), [3, 7]);
assert.equal(C3.counts.recorded, 0); assert.equal(C3.counts.suggested, 14);
assert.equal(Math.round(C3.ceiling.holdsTo), 224000); assert.equal(C3.ceiling.passed, false);
assert.equal(C3.criteria.find(c => c.id === 'OBJ').weight, 0, 'the playbook\'s example objective is shown, not weighed');
assert.equal(describeChoice(C3), 'RabbitMQ holds to ≈220,000 concurrent users on one queue; with the suggestions, the drivers lean to Apache Kafka.');
const C2 = read(project, 'tr-002');
assert.equal(C2.ceiling.passed, true); assert.equal(Math.round(C2.ceiling.holdsTo), 74667);
// rc39: the drivers reach the choice through their scope (driver-scope.js), so the suggestions now weigh 5 against 8 and lean to MongoDB; the ceiling and the lean are both said.
assert.deepEqual(C2.options.map(o => o.score), [5, 8]); assert.equal(C2.leanAll, 'TO-004'); assert.equal(C2.leanRecorded, null, 'nothing is judged yet');
assert.equal(describeChoice(C2), 'PostgreSQL needs more than one primary above ≈75,000 concurrent users; with the suggestions, the drivers lean to MongoDB.');
assert.match(C2.ceiling.advice, /TO-004 MongoDB: sharding spreads data and writes across shards/);
assert.equal(read(project, 'tr-005').leanAll, null, 'the playbook naming NGINX and not Kong is not weighed');
const M = deskModel(project,{objective:{example:true}});
assert.deepEqual([...M.choices].filter(([, c]) => c.revisit).map(([id]) => id), ['tr-001', 'tr-002', 'tr-003']);
pass('the weighing: RabbitMQ +3 against Kafka +7 with the suggestions, nothing yet recorded; one queue holds to about 224,000 users and one PostgreSQL primary to about 74,667, where the recorded MongoDB option spreads writes; three choices to revisit');

// 4. The objective moves the switch point, and weighs once the project records it.
const C3hi = read(project, 'tr-003', 300000);
assert.equal(C3hi.ceiling.passed, true); assert.equal(C3hi.options[0].cells.at(-1).effect, 'tension');
const saved = applyFinalReviewCommand(project, {type: 'review.objective', payload: {kind: 'users', value: 300000, reviewer: 'Neme', reviewed: true}}).document;
const C3s = read(saved, 'tr-003');
assert.equal(C3s.criteria.find(c => c.id === 'OBJ').weight, 2, 'the saved objective weighs as Medium');
assert.deepEqual(C3s.options.map(o => o.score), [1, 9]);
assert.equal(choiceForDesign(saved, 'tr-003').ceiling.passed, true, 'every surface reads the same objective');
pass('the objective moves the switch point: at 300,000 users one queue is past its limit; saved as the review objective it weighs as Medium, and the lean to Kafka widens from +4 to +8');

// 5. Recording suggestions through Chapter 7's own command.
let p = clone(project);
const cmds = suggestionCommands(read(p, 'tr-003'));
assert.equal(cmds.length, 10, 'only conditional mechanisms and explicit operating-model judgements can be adopted; weak namings stay descriptive');
for (const c of cmds.filter(c => !c.weak)) p = applyTechnologyRealisationCommand(p, c.command, '2026-09-25T12:00:00Z').document;
const C3r = read(p, 'tr-003');
assert.equal(C3r.leanRecorded, 'TO-006', 'recorded, the judgements lean the same way');
assert.equal(C3r.counts.recorded, 10); assert.ok(C3r.options.every(o => o.cells.every((x, i) => !x.recorded || (C3r.criteria[i].kind === 'driver' ? /^https:\/\//.test(x.recorded.evidence) : x.recorded.evidence))), 'each carries its source as evidence');
const G = optionsFor(stackSource(p), 'tr-003');
assert.equal(G.cells.filter(c => c.effect === 'supports').length, 7); assert.equal(G.cells.filter(c => c.effect === 'tension').length, 3);
// A recorded counter-judgement can make a driver a sensitivity point.
p = applyTechnologyRealisationCommand(p, {type: 'techrealisation.assessment', payload: {id: 'tr-003', optionId: 'TO-006', criterionId: 'QD-004', effect: 'tension', reason: 'Replay without idempotent consumers repeats effects.', evidence: 'Design review'}}, '2026-09-25T12:01:00Z').document;
const Cs = read(p, 'tr-003');
assert.equal(Cs.leanAll, 'TO-005');
assert.deepEqual(Cs.sens, [{driver: 'QD-004', to: 'Medium', lean: null}, {driver: 'QD-006', to: 'High', lean: null}], 'QD-004 one step down, or QD-006 one step up, would leave no lean');
pass('suggestions become judgements only through Chapter 7\'s own assessment command, each with its mechanism as reason and its documentation as evidence; a recorded counter-judgement tips the lean to RabbitMQ and makes QD-004 and QD-006 sensitivity points');

// 6. What if reads the same knowledge, and Chapter 7's options weigh it.
const T = tuneDriver(reasoningSource(project), 'QD-006', {});
const rq = T.effects.find(e => e.kind === 'product' && e.id === 'tr-003');
assert.equal(rq.state, 'revisit'); assert.match(rq.why, /Its documentation suggests a trade-off in the declared context: A queue removes a message once it is acknowledged/);
const LO = optionsLayout(optionsFor(stackSource(project), 'tr-003'));
assert.equal(LO.weighCells.length, 2); assert.ok(LO.weigh.y >= LO.rows.at(-1).y + LO.rows.at(-1).h && LO.notes[0].y >= LO.weigh.y + LO.weigh.h, 'the weighing sits between the criteria and the notes');
pass('What if reads the same knowledge — tuning QD-006 marks RabbitMQ to revisit, with the mechanism — and Chapter 7\'s options carry the weighing between the criteria and the notes');

// 7. Round 25 (D-25-11): the comparison table (choice-ui.js, shown on the review desk and in the knowledge workspace's
// product comparison) shows, on the recorded judgements alone, the range each total could move to while criteria are
// unjudged, and the option another dominates, by name; product-comparison.js carries both.
{
  let q = clone(project);
  const C0 = read(q, 'tr-004'), html0 = choiceTableHTML(C0);
  assert.ok(!C0.criteria.some(c => c.kind === 'objective'), 'tr-004 carries no objective criterion');
  assert.deepEqual(C0.options.map(o => [o.option.id, o.recordedScore, o.bounds.low, o.bounds.high, o.dominatedBy]), [['TO-007', 0, -4, 4, null], ['TO-008', 0, -4, 4, null]]);
  assert.match(html0, /recorded 0, between −4 and \+4 once every criterion is judged/, 'the bounds while nothing is judged');
  assert.match(html0, /Arithmetic on the recorded effects, not a measurement; it does not choose\./);
  assert.doesNotMatch(html0, /Dominated by/);
  // Every criterion judged (Chapter 7 judges supports or a trade-off): Redis as good on each and better on the first.
  const first = C0.criteria[0].id;
  for (const c of C0.criteria) for (const o of C0.options) q = applyTechnologyRealisationCommand(q, {type: 'techrealisation.assessment', payload: {id: 'tr-004', optionId: o.option.id, criterionId: c.id, effect: o.option.id === 'TO-008' && c.id === first ? 'tension' : 'supports', reason: 'Synthetic judgement for the comparison.', evidence: 'Synthetic design review notes.'}}, '2026-10-15T12:00:00Z').document;
  const C1 = read(q, 'tr-004'), html1 = choiceTableHTML(C1);
  assert.deepEqual(C1.options.map(o => [o.option.id, o.bounds.low === o.bounds.high, o.dominatedBy]), [['TO-007', true, null], ['TO-008', true, 'TO-007']], 'judged on every criterion, Memcached is dominated by Redis');
  assert.match(html1, /Dominated by Redis: at least as good on every criterion and better on one/);
  assert.doesNotMatch(html1, /between/, 'no range once every criterion is judged');
  assert.deepEqual(productComparison(q, 'tr-004').options.map(o => [o.option.id, o.dominatedBy, o.bounds.low, o.bounds.high]), [['TO-007', null, C1.options[0].bounds.low, C1.options[0].bounds.high], ['TO-008', {id: 'TO-007', product: 'Redis'}, 2, 2]], 'Redis +4, Memcached +2 on the judgements recorded');
  pass('the comparison table shows, on the recorded judgements, the range each total could move to while criteria are unjudged and, once judged, the option another dominates ("Dominated by Redis: at least as good on every criterion and better on one"), with the reading\'s note; the desk\'s product comparison carries both');
}

// The objective holds no recorded judgement, so it takes no part in the recorded weighing: with every other criterion
// judged, an option another dominates is named although the realisation carries an objective.
{
  let q = clone(project);
  const C = read(q, 'tr-003'), [a, b] = C.options.map(o => o.option.id), judged = C.criteria.filter(c => c.kind !== 'objective');
  assert.ok(C.criteria.some(c => c.kind === 'objective'), 'tr-003 carries the objective criterion');
  for (const c of judged) for (const id of [a, b]) q = applyTechnologyRealisationCommand(q, {type: 'techrealisation.assessment', payload: {id: 'tr-003', optionId: id, criterionId: c.id, effect: id === a && c.id === judged[0].id ? 'tension' : 'supports', reason: 'Synthetic judgement for the test.', evidence: 'Synthetic evidence.'}}).document;
  const C1 = read(q, 'tr-003');
  assert.deepEqual(C1.options.map(o => [o.option.id, o.bounds.low === o.bounds.high, o.dominatedBy]), [[a, true, b], [b, true, null]], 'judged on every criterion it can be, the first option is dominated, the objective notwithstanding');
  pass('the objective, which holds no recorded judgement, takes no part in the recorded weighing: an option another dominates on every judged criterion is named although the realisation carries an objective');
}

assert.equal(JSON.stringify(project), before, 'reading the choice changes nothing');
pass('reading product choices changes nothing in the project');
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
