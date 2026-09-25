// Drafted fixes on the review desk: each critical or silent vital, and each switch point, comes with
// a change built from the desk's own numbers, as the owning chapter's ordinary commands; simulated,
// it shows which cells it turns; applied only through the change review. Run: npm run test:desk-fixes
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {STAGED_COMMANDS, applyCanonical} from './public/canonical-command.js';
import {previewWorkingChange, applyWorkbenchCommand} from './public/workbench-domain.js';
import {deskModel} from './public/desk-model.js';
import {deskSource} from './public/desk-vitals.js';
import {fixDrafts, compose, simulate, describeCommands, describeEffect, monitoringText, MAX_COMMANDS} from './public/desk-fixes.js';

const checks = [], pass = n => checks.push(n);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const V = (D, id, v) => D.rows.find(r => r.id === id).vitals.find(x => x.vital === v);
const D = deskModel(project), F = fixDrafts(D), get = id => F.byId.get(id);
const cmds = (id, values = {}) => compose(project, [get(id)], {[id]: values}).commands;

// 1. Drafts come from the desk's own numbers.
assert.ok(F.drafts.length >= 40, 'every critical or silent vital that numbers can fix is drafted');
const cap = cmds('capacity:run-001');
assert.equal(get('capacity:run-001').title, 'Let RUN-001 grow to 24 replicas');
assert.equal(cap.length, 1); assert.equal(cap[0].type, 'runtime.plan'); assert.equal(cap[0].payload.maxReplicas, 24); assert.equal(cap[0].payload.capacityConfirmed, false);
assert.match(cap[0].payload.scalingPolicy, /Horizontal Pod Autoscaler on CPU at 70 %, from 1 to 24 replicas/);
assert.match(cap[0].payload.capacityBasis, /3,125 req\/s[\s\S]*→ 24/);
const lat = cmds('latency:QD-003');
assert.deepEqual(lat.map(c => [c.payload.ref, c.payload.timeoutMs]), [['IF-001', 2000], ['IF-004', 1300], ['IF-005', 650]], 'nested: each call gives up before its caller');
assert.ok(lat.every(c => c.payload.timeoutConfirmed === false && /QD-003 allows 2,000 ms/.test(c.payload.timeoutBasis)));
const q = cmds('capacity:run-008');
assert.equal(q[0].type, 'techrealisation.plan'); assert.equal(q[0].payload.capacityValue, 2900000); assert.equal(q[0].payload.capacityUnit, 'messages');
assert.match(q[0].payload.capacityBasis, /2,812,500 messages[\s\S]*reject-publish/, 'the bound holds the backlog, and says what the sender does when it is full');
const integ = cmds('integrity:if-004+rest');
assert.deepEqual(integ.map(c => c.payload.idempotencyKey), ['paymentReference', 'paymentReference'], 'the reference the caller already sends');
assert.match(integ[0].payload.duplicatePolicy, /returns the original outcome/);
const s1 = cmds('security:thr-001'), s3 = cmds('security:thr-003');
assert.equal(s1[0].payload.id, 'oauth'); assert.deepEqual(s1[0].payload.targetIds, ['rest', 'api-pod', 'instruction'], 'the control that answers THR-001 is extended to where it also lands');
assert.equal(s3[0].payload.id, null); assert.equal(s3[0].payload.category, 'Data protection'); assert.deepEqual(s3[0].payload.threatIds, ['thr-003'], 'Chapter 9\'s own proposal for data disclosure');
const mon = cmds('observability:run-001')[0].payload.monitoring;
assert.match(mon, /QD-002 when half of the 43\.2 min it allows in 30 days is spent/); assert.match(mon, /QD-003 when the 95th percentile passes 2 seconds/);
assert.equal(monitoringText(D, D.rows.find(r => r.id === 'run-001')), mon);
pass('drafts come from the desk\'s own numbers: 24 replicas for RUN-001, timeouts nested 2,000 › 1,300 › 650 ms on QD-003\'s path, a 2,900,000-message bound that holds the 2,812,500 backlog and says what the sender does when it is full, the caller\'s own reference as idempotency key, Chapter 9\'s own control proposals, and monitoring drawn from what each driver measures');

// 2. Where numbers cannot decide, the desk says so instead of inventing.
const J = F.judgements;
assert.ok(J.some(j => j.id === 'security:run-002' && /does not invent threats/.test(j.text)));
assert.ok(J.some(j => j.id === 'capacity:run-013' && /recovery-point objective/.test(j.text)));
assert.ok(J.every(j => j.fix && j.fix.chapter), 'each points to the chapter that decides');
pass(`${J.length} readings need a judgement the desk will not make — a threat, a recovery point, a drill, a cache's hot set — and each points to the chapter that decides`);

// 3. Each draft is the owning chapter's ordinary change, the whole record with its changed fields.
for (const d of F.drafts) {
  const C = compose(project, [d]);
  assert.equal(C.errors.length, 0, d.id + ' builds');
  for (const c of C.commands) { assert.ok(STAGED_COMMANDS.has(c.type), c.type + ' goes through the change review'); assert.deepEqual(JSON.parse(JSON.stringify(c)), c, 'commands are plain data'); }
}
assert.equal(cap[0].payload.title, 'Payment service'); assert.equal(cap[0].payload.owner, 'Channels team', 'the rest of the record is carried unchanged');
const sw = cmds('switch:tr-003');
assert.deepEqual(sw.map(c => c.type), ['decision.save', 'decision.alternative', 'decision.alternative']);
assert.match(sw[0].payload.question, /Should TR-003 Durable work handoff stay on RabbitMQ for 100,000 concurrent users\?/);
assert.equal(sw[2].payload.assessments['QD-006'].effect, 'supports', 'Kafka\'s retained log supports the payment trail'); assert.match(sw[2].payload.assessments['QD-006'].evidence, /kafka\.apache\.org/);
const rows = describeCommands(project, cap);
assert.deepEqual(rows[0].fields.find(f => f.key === 'maxReplicas'), {key: 'maxReplicas', label: 'Maximum replicas', before: '1', after: '24'});
pass('each draft is the owning chapter\'s ordinary change — runtime.plan, runtime.placement, interfaces.contract, techrealisation.plan, security.control, decision.save — carrying the whole record with only its fields changed; a switch point becomes a Chapter 3 question with an alternative for each product, judged against the drivers');

// 4. The simulation: what a draft does on the desk before anything is applied.
const E1 = simulate(project, [get('capacity:run-001')], {}, {before: D});
assert.deepEqual(E1.changed.map(c => `${c.ref} ${c.vital} ${c.from}→${c.to}`), ['RUN-001 capacity bad→ok']);
assert.equal(describeEffect(E1), '1 vital change: 1 to normal.');
const E2 = simulate(project, [get('availability:run-007')], {}, {before: D});
assert.ok(E2.changed.some(c => c.vital === 'loss' && c.from === 'na' && c.to === 'none'), 'a standby says PostgreSQL holds state: the missing recovery point comes into view');
const E3 = simulate(project, [get('availability:run-008')], {}, {before: D});
assert.equal(V(E3.after, 'run-008', 'availability').state, 'warn'); assert.match(V(E3.after, 'run-008', 'availability').why, /3 nodes in 2 zones, and losing ZON-001 \(2 of them\) leaves 1, short of a majority of 2/);
const EA = simulate(project, F.drafts, {}, {before: D});
const sys = Object.fromEntries(EA.system.map(s => [s.vital, s.to]));
assert.deepEqual([sys.recovery, sys.latency, sys.integrity, sys.observability], ['ok', 'ok', 'ok', 'ok']);
assert.ok(EA.normal >= 45, 'most of the monitor turns normal'); assert.equal(EA.errors.length, 0);
assert.equal(JSON.stringify(project), before, 'simulating changes nothing');
pass(`simulated first: RUN-001's capacity turns normal on its own; a PostgreSQL standby brings its missing recovery point into view; RabbitMQ's three nodes in two zones read "to watch", because losing the zone with two loses the majority; together the ${F.drafts.length} drafts turn ${EA.normal} readings normal, with recovery, latency, integrity and observability normal across the monitor`);

// 5. The architect's numbers: a knob changes the draft, and the desk reads it again.
const short = simulate(project, [get('capacity:run-001')], {'capacity:run-001': {maxReplicas: 10}}, {before: D});
assert.equal(V(short.after, 'run-001', 'capacity').state, 'bad'); assert.match(V(short.after, 'run-001', 'capacity').why, /short by 14/);
const inverted = simulate(project, [get('latency:QD-003')], {'latency:QD-003': {'if-005': 1500}}, {before: D});
assert.equal(V(inverted.after, 'run-002', 'latency').state, 'bad'); assert.match(V(inverted.after, 'run-002', 'latency').why, /IF-005 waits 1,500 ms, but its caller IF-004 gives up at 1,300 ms/);
pass('the numbers stay the architect\'s: 10 replicas instead of 24 reads short by 14, and a 1,500 ms timeout under a 1,300 ms caller reads critical — the work would go on after the caller had gone');

// 6. Applied only through the change review.
const draft = compose(project, [get('capacity:run-001'), get('availability:run-001'), get('observability:run-001')]);
const Q = previewWorkingChange(project, draft.commands);
assert.ok(Q.diff.records.some(r => r.id === 'run-001'));
assert.throws(() => applyWorkbenchCommand(project, {type: 'workspace.apply', payload: {commands: draft.commands, stamp: Q.stamp, reviewed: false, reason: 'x'}}, '2026-09-25T12:00:00Z', 'Neme'), /Review the changed objects/);
const kept = applyWorkbenchCommand(project, {type: 'workspace.alternative', payload: {commands: draft.commands, stamp: Q.stamp, title: 'RUN-001 fixes', reason: 'Drafted on the desk'}}, '2026-09-25T12:00:00Z', 'Neme').document;
assert.equal(V(deskSource(kept), 'run-001', 'capacity').state, 'bad', 'kept as an alternative, the working design is unchanged');
const applied = applyWorkbenchCommand(project, {type: 'workspace.apply', payload: {commands: draft.commands, stamp: Q.stamp, reviewed: true, reason: 'Drafted on the desk'}}, '2026-09-25T12:00:00Z', 'Neme').document;
const DA = deskModel(applied);
assert.deepEqual(['availability', 'capacity', 'observability'].map(v => V(DA, 'run-001', v).state), ['ok', 'ok', 'ok']);
assert.match(V(DA, 'run-001', 'capacity').why, /Not yet confirmed by a load test/, 'a drafted number is marked as not yet proven');
const FA = fixDrafts(DA);
assert.ok(!FA.byId.has('capacity:run-001') && !FA.byId.has('observability:run-001') && !FA.byId.has('availability:run-001'), 'once applied, the draft is gone');
pass('applied only through the change review: unreviewed it is refused, kept as an alternative the working design is unchanged, and applied RUN-001 reads normal on availability, capacity and observability — marked not yet confirmed by a load test — and its drafts are gone');

// 7. Many at once: composed in order, at most 20 changes to a review, and the rest stay drafted.
const L = compose(project, F.drafts, {}, {limit: MAX_COMMANDS});
assert.ok(L.commands.length <= MAX_COMMANDS && L.used.length > 5 && L.skipped.length > 0);
let p = project;
for (let i = 0; i < 12; i++) { const Fi = fixDrafts(deskModel(p)).drafts.filter(d => !d.switchPoint); if (!Fi.length) break; const C = compose(p, Fi, {}, {limit: MAX_COMMANDS}); if (!C.commands.length) break; p = C.document; }
const FL = fixDrafts(deskModel(p));
assert.deepEqual(FL.drafts.filter(d => !d.switchPoint).map(d => d.id), [], 'applied in batches of 20, every drafted fix is used up');
assert.ok(FL.judgements.some(j => j.vital === 'availability' && /third failure domain/.test(j.text)), 'what is left needs judgement: a third site');
pass(`many at once: drafts compose on each other's results, a review takes at most ${MAX_COMMANDS} changes and the rest stay drafted; applied batch by batch, every drafted fix is used up and what remains is judgement — a third site, threats, recovery points`);

assert.equal(JSON.stringify(project), before);
pass('drafting and simulating change nothing in the project');
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
