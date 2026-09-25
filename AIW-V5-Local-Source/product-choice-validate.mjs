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

const checks = [], pass = n => checks.push(n);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const clone = x => structuredClone(x);
const attrs = new Set(ATTRIBUTES.map(a => a.id));
const at = (p, users) => { const R = reasoningSource(p), O = capacityObjective(R, p.finalReview?.capacity || null, users ? {kind: 'users', value: users} : null), plan = capacityPlan(R, O); return {plan, O}; };
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
assert.equal(C2.ceiling.passed, true); assert.equal(Math.round(C2.ceiling.holdsTo), 74667); assert.equal(C2.leanAll, null);
assert.match(C2.ceiling.advice, /TO-004 MongoDB: sharding spreads data and writes across shards/);
assert.equal(read(project, 'tr-005').leanAll, null, 'the playbook naming NGINX and not Kong is not weighed');
const M = deskModel(project);
assert.deepEqual([...M.choices].filter(([, c]) => c.revisit).map(([id]) => id), ['tr-001', 'tr-002', 'tr-003']);
pass('the weighing: RabbitMQ +3 against Kafka +7 with the suggestions, nothing yet recorded; one queue holds to about 224,000 users and one PostgreSQL primary to about 74,667, where the recorded MongoDB option spreads writes; three choices to revisit');

// 4. The objective moves the switch point, and weighs once the project records it.
const C3hi = read(project, 'tr-003', 300000);
assert.equal(C3hi.ceiling.passed, true); assert.equal(C3hi.options[0].cells.at(-1).effect, 'tension');
const saved = applyFinalReviewCommand(project, {type: 'review.objective', payload: {kind: 'users', value: 300000, reviewer: 'Neme', reviewed: true}}).document;
const C3s = read(saved, 'tr-003');
assert.equal(C3s.criteria.find(c => c.id === 'OBJ').weight, 2, 'the saved objective weighs as Important');
assert.deepEqual(C3s.options.map(o => o.score), [1, 9]);
assert.equal(choiceForDesign(saved, 'tr-003').ceiling.passed, true, 'every surface reads the same objective');
pass('the objective moves the switch point: at 300,000 users one queue is past its limit; saved as the review objective it weighs as Important, and the lean to Kafka widens from +4 to +8');

// 5. Recording suggestions through Chapter 7's own command.
let p = clone(project);
const cmds = suggestionCommands(read(p, 'tr-003'));
assert.equal(cmds.length, 12, 'weak namings are offered too, left unticked by the dialog');
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
assert.deepEqual(Cs.sens, [{driver: 'QD-004', to: 'Important', lean: null}, {driver: 'QD-006', to: 'Critical', lean: null}], 'QD-004 one step down, or QD-006 one step up, would leave no lean');
pass('suggestions become judgements only through Chapter 7\'s own assessment command, each with its mechanism as reason and its documentation as evidence; a recorded counter-judgement tips the lean to RabbitMQ and makes QD-004 and QD-006 sensitivity points');

// 6. What if reads the same knowledge, and Chapter 7's options weigh it.
const T = tuneDriver(reasoningSource(project), 'QD-006', {});
const rq = T.effects.find(e => e.kind === 'product' && e.id === 'tr-003');
assert.equal(rq.state, 'revisit'); assert.match(rq.why, /Its documentation suggests a trade-off: A queue removes a message once it is acknowledged/);
const LO = optionsLayout(optionsFor(stackSource(project), 'tr-003'));
assert.equal(LO.weighCells.length, 2); assert.ok(LO.weigh.y >= LO.rows.at(-1).y + LO.rows.at(-1).h && LO.notes[0].y >= LO.weigh.y + LO.weigh.h, 'the weighing sits between the criteria and the notes');
pass('What if reads the same knowledge — tuning QD-006 marks RabbitMQ to revisit, with the mechanism — and Chapter 7\'s options carry the weighing between the criteria and the notes');

assert.equal(JSON.stringify(project), before, 'reading the choice changes nothing');
pass('reading product choices changes nothing in the project');
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
