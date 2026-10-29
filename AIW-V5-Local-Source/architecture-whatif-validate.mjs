// Focused branch contract: combined priorities, recorded trace, constrained arithmetic,
// unsupported assessments, and a source document that stays byte-for-byte unchanged.
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {compareArchitectureScenario} from './public/architecture-whatif.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyDecisionCommand} from './public/decisions-domain.js';

const p = withFinalReview(seedProject()), snapshot = JSON.stringify(p), checks = [];
const run = (name, fn) => { fn(); checks.push(name); };
const scenario = drivers => compareArchitectureScenario(p, {drivers});

run('two simultaneous changes are evaluated together, including a tie that neither individual change causes', () => {
  const a = {id: 'QD-002', priority: 'Low'}, b = {id: 'QD-003', priority: 'Low'};
  const initial = 'ALT-002';
  assert.equal(scenario([a]).decisions.find(d => d.id === 'ADR-001').afterLead, initial);
  assert.equal(scenario([b]).decisions.find(d => d.id === 'ADR-001').afterLead, initial);
  const joint = scenario([a, b]), d = joint.decisions.find(x => x.id === 'ADR-001');
  assert.equal(d.beforeLead, initial); assert.equal(d.afterLead, null);
  assert.equal(d.changedLean, true); assert.equal(d.selected, null);
  assert.deepEqual(d.viaDriver, ['QD-002', 'QD-003']);
  assert.ok(d.scores.every(x => Number.isInteger(x.before) && Number.isInteger(x.after)));
  assert.equal(d.provisional, true, 'illustrative assessments do not become evidence merely because scores exist');
});

// Round 25 (D-25-03, D-25-05): the reading's words for the branch: a tie names the tied, the lead with the branch says
// how firmly it holds in the reading's own sentence, and an alternative a hard constraint rules out is marked, not ranked.
run('the branch reads the lead in the reading\'s words: the tie, how firmly the lead holds with the branch, and what a hard constraint rules out', () => {
  const joint = scenario([{id: 'QD-002', priority: 'Low'}, {id: 'QD-003', priority: 'Low'}]).decisions.find(x => x.id === 'ADR-001');
  assert.deepEqual(joint.beforeTied, []); assert.deepEqual(joint.afterTied, ['ALT-001', 'ALT-002'], 'the tie names the tied');
  assert.equal(joint.afterFirmnessText, null, 'no lead, so nothing holds');
  const low = scenario([{id: 'QD-006', priority: 'Low'}]).decisions.find(x => x.id === 'ADR-001');
  assert.equal(low.afterLead, 'ALT-002'); assert.equal(low.afterFirmness, 1);
  assert.equal(low.afterFirmnessText, 'The lead holds for any weights that keep each High driver at least as heavy as each Medium one, and each Medium at least as heavy as each Low one.');
  assert.match(scenario([{id: 'QD-002', priority: 'Low'}]).decisions.find(x => x.id === 'ADR-001').afterFirmnessText, /^The lead holds (if drivers of the same priority count alike|only at the default weights)[\s\S]*If only QD-00\d \((Medium|Low)\) counted, Keep the customer request synchronous would come ahead of Acknowledge a durable asynchronous handoff\.$/, 'a weaker lead names its swing, alternatives by title');
  // A constraint driver on CON-001 (a Must), broken by ALT-004.
  let q = applyQualityCommand(p, {type: 'quality.driver', payload: {kind: 'constraint', title: 'Post through the existing core ledger', description: 'Every posting goes through the existing core ledger.', impact: 'Rules out a second store of postings.', constraintIds: ['CON-001'], priority: 'High'}}).document;
  const C = q.quality.drivers.at(-1).id, d2 = () => q.decisions.records.find(d => d.id === 'ADR-002');
  q = applyDecisionCommand(q, {type: 'decision.save', payload: {id: 'ADR-002', driverIds: [...d2().driverIds, C]}}).document;
  q = applyDecisionCommand(q, {type: 'decision.alternative', payload: {id: 'ADR-002', alternativeId: 'ALT-004', assessments: {...d2().alternatives.find(a => a.id === 'ALT-004').assessments, [C]: {effect: 'violates', reason: 'Keeps its own record of postings.', evidence: 'Design review.'}}}}).document;
  const b4 = JSON.stringify(q), x = compareArchitectureScenario(q, {drivers: [{id: 'QD-003', priority: 'Low'}]}).decisions.find(d => d.id === 'ADR-002');
  assert.deepEqual(x.scores.filter(r => r.out).map(r => [r.id, r.breaks]), [['ALT-004', [C]]], 'the ruled-out row says which hard constraint it breaks');
  assert.equal(x.afterLead, 'ALT-003', 'the only alternative that meets the hard constraint');
  assert.match(compareArchitectureScenario(q, {drivers: [{id: 'QD-003', priority: 'Low'}]}).method, /an alternative that breaks a hard constraint takes no part in the lead[\s\S]*Arithmetic on the recorded effects, not a measurement; it does not choose\./);
  assert.equal(JSON.stringify(q), b4, 'the branch changes nothing');
});

run('driver target arithmetic uses a recorded method and exposes unconfirmed assumptions', () => {
  const x = scenario([{id: 'QD-002', targetValue: '99.99'}]);
  const t = x.measured[0];
  assert.equal(t.id, 'QD-002'); assert.equal(t.confirmed, false);
  assert.equal(t.budgetUnit, 'min'); assert.ok(t.afterBudget < t.beforeBudget);
  assert.match(t.method, /allows .* minutes of unavailability/);
  assert.ok(t.checks.every(c => ['plan', 'capability', 'product', 'path'].some(k => c.chapter === ({plan:10,capability:6,product:7,path:8})[k])));
  assert.ok(x.records.some(r => r.chapter === 10 && r.targetCheck?.some(c => c.driver === 'QD-002')));
});

run('changed constraint follows direct source links and never creates numerical claims', () => {
  const x = compareArchitectureScenario(p, {constraints: [{id: 'CON-001', description: 'Posting must preserve exactly one effect across retries and recovery.'}]});
  assert.equal(x.measured.length, 0);
  assert.ok(x.records.some(r => r.chapter === 1 && r.id === 'CON-001'));
  assert.ok(x.records.some(r => r.chapter === 1 && r.id === 'REQ-003'));
  assert.ok(x.decisions.some(d => d.viaRequirement.includes('REQ-003') || d.viaDriver.length));
  assert.match(x.method, /neither a changed constraint nor a priority supplies a measured capacity/);
});

run('unlinked constraints are exposed rather than silently propagated', () => {
  const q = structuredClone(p);
  q.artefacts.push({...q.artefacts.find(a => a.id === 'CON-001'), id: 'CON-999', title: 'External premise'});
  const x = compareArchitectureScenario(q, {constraints: [{id: 'CON-999', description: 'A hypothetical external condition.'}]});
  assert.equal(x.decisions.length, 0);
  assert.deepEqual(x.records.map(r => r.id), ['CON-999']);
  assert.match(x.warnings[0], /no directly linked requirement/);
});

run('limits, duplicate IDs, invalid targets and empty branches are rejected', () => {
  assert.throws(() => scenario([]), /Change at least one/);
  assert.throws(() => scenario([{id:'QD-002',priority:'Low'},{id:'QD-002',priority:'High'}]), /once/);
  assert.throws(() => scenario([{id:'QD-002',targetValue:'-1'}]), /numeric target/);
  assert.throws(() => scenario([{id:'QD-002',priority:'Emergency'}]), /High, Medium, or Low/);
  assert.throws(() => scenario(['QD-001','QD-002','QD-003','QD-004','QD-005'].map(id => ({id,priority:'Low'}))), /at most four/);
});

assert.equal(JSON.stringify(p), snapshot, 'branch comparison did not change the project');
checks.push('the source project remains unchanged');
console.log(JSON.stringify({suite:'architecture what-if',passed:checks.length,checks},null,2));
