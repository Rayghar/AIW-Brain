// Review desk checks: vitals, what an objective takes, the thread, decisions that ask earlier and
// later chapters to review, anti-patterns as Chapter 11 findings, the review objective in the SDD,
// and the layouts. Run: npm run test:desk
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview, applyFinalReviewCommand, inheritedFindings, reviewBlockers, assembleSDD, exportSDD, findingTreatment} from './public/review-domain.js';
import {applyDecisionCommand} from './public/decisions-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyChangeCommand, changeSummary, changeEvents} from './public/changes-domain.js';
import {reasoningSource} from './public/design-reasoning.js';
import {deskSource, VITALS, systemVitals} from './public/desk-vitals.js';
import {capacityObjective, capacityPlan, capacityMarkdown, ASSUMPTIONS, fmtN, scaleReadings, NO_LOAD, EXAMPLE_LABEL} from './public/desk-capacity.js';
import {sddDocument} from './public/sdd-document.js';
import {deskModel, TRACE_COLS, treatmentPlan, decisionProbe, partReviewItems, capacityReviewItems, describeTrace} from './public/desk-model.js';
import {decisionImplications, trackDecisionChange} from './public/decision-impact.js';
import {runningBoard, boardLayout, partStatus, LOAD_BANDS} from './public/desk-layout.js';
import {NL} from './public/notation-layout.js';
import {PRODUCT_FACTS, fact} from './public/product-facts.js';

const checks = [], pass = n => checks.push(n);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const clone = x => structuredClone(x);
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const V = (D, plan, vital) => D.rows.find(r => r.id === plan).vitals.find(v => v.vital === vital);

// 1. Vitals: every running part against the targets its drivers and platform set.
const D = deskSource(project);
assert.equal(D.rows.length, 14);
assert.deepEqual(D.rows.slice(0, 5).map(r => r.ref), ['RUN-001', 'RUN-002', 'RUN-003', 'RUN-004', 'RUN-005'], 'the parts that do the work come first, in the order recorded');
assert.deepEqual(D.rows.slice(5).map(r => r.product), ['Kong Gateway 3.9', 'Keycloak 26', 'PostgreSQL 17', 'RabbitMQ 4.0', 'Redis 7.4', 'OpenTelemetry · Prometheus · Grafana', 'pgBackRest 2.54', 'Patroni 4.0', 'Kubernetes 1.31'], 'then the platform, from the edge inwards');
assert.ok(D.rows.every(r => r.vitals.length === VITALS.length && r.vitals.every(v => ['ok', 'warn', 'bad', 'none', 'na'].includes(v.state) && v.why)));
assert.equal(V(D, 'run-001', 'availability').state, 'none'); assert.match(V(D, 'run-001', 'availability').target, /99\.9 % · 43\.2 min in 30 days/);
assert.match(V(D, 'run-001', 'availability').why, /One active replica in one zone[\s\S]*recovery time is not recorded/);
assert.equal(V(D, 'run-002', 'availability').state, 'na', 'no availability driver reaches the risk engine');
assert.equal(V(D, 'run-001', 'integrity').state, 'bad'); assert.match(V(D, 'run-001', 'integrity').why, /IF-001, IF-004 record no idempotency key/);
assert.equal(V(D, 'run-001', 'security').state, 'bad'); assert.match(V(D, 'run-001', 'security').why, /THR-001[\s\S]*THR-003/);
assert.equal(V(D, 'run-004', 'recovery').state, 'none'); assert.match(V(D, 'run-004', 'recovery').target, /15 min \(QD-004\)/);
assert.equal(V(D, 'run-001', 'latency').state, 'none'); assert.match(V(D, 'run-001', 'latency').why, /^6 calls on QD-003's path nest inside 2,000 ms — about 400 ms for each level — but IF-001, IF-004 record no timeout, so how long a caller may wait is unknown\.$/);
// rc39: a driver reaches a part through its scope (driver-scope.js), so every part but Redis, which carries no driver, now
// carries a Critical one and nothing records how its failure would be seen: the thirteen are named, not counted.
assert.deepEqual(D.rows.filter(r => V(D, r.id, 'observability').state === 'bad').map(r => r.id).sort(), D.rows.map(r => r.id).filter(id => id !== 'run-009').sort(), 'every part that carries a driver has no way to see its failure');
assert.equal(V(D, 'run-009', 'observability').state, 'na'); assert.match(V(D, 'run-009', 'observability').why, /^It carries no driver\.$/);
const sys = Object.fromEntries(D.system.map(s => [s.vital, s]));
// Round 12 (G, GR-RUN-04): the illustrative reference reads AIW's example as its illustration, labelled on the tile.
assert.equal(sys.availability.head, '99.9 % · 43.2 min / 30 d'); assert.equal(sys.capacity.head, NO_LOAD); assert.equal(sys.security.head, '1 of 4 threats covered'); assert.equal(sys.observability.head, '0 of 14 monitored');
assert.deepEqual(D.rows.find(r => r.id === 'run-001').alarms.map(a => a.id).sort(), ['observability', 'sync-chain', 'spof'].sort(), 'a part carries the anti-patterns it is part of');
pass('vitals: 14 running parts, services first and then the platform from the edge inwards, each read on 8 vitals against the targets its drivers and Chapter 6 set — critical, watch, normal, no signal or not carried, each with its reason');

// 2. Each vital follows the recorded facts.
const fixed = clone(project);
fixed.runtime.placements.push({id: 'PL-X1', revision: 1, planId: 'run-001', zoneId: 'zone-b', role: 'active', replicas: 1, basis: 'test', confirmed: true});
fixed.runtime.plans.find(r => r.id === 'run-001').monitoring = 'Intake probes and error-rate alerts on QD-002';
fixed.runtime.plans.find(r => r.id === 'run-004').recoveryMinutes = 20;
for (const id of ['rest', 'if-004']) fixed.interfaces.contracts.find(c => c.id === id).idempotencyKey = 'instructionId';
fixed.security.controls.push({id: 'ctl-x', ref: 'SEC-009', title: 'Minimise the instruction', threatIds: ['thr-003', 'thr-001'], targetIds: ['instruction', 'rest', 'settlement']});
const D2 = deskSource(fixed);
assert.equal(V(D2, 'run-001', 'availability').state, 'ok', 'a second zone keeps it within the budget');
assert.equal(V(D2, 'run-001', 'observability').state, 'ok');
assert.equal(V(D2, 'run-001', 'integrity').state, 'ok');
assert.equal(V(D2, 'run-001', 'security').state, 'ok');
assert.equal(V(D2, 'run-004', 'recovery').state, 'bad', '20 minutes is longer than QD-004\'s 15');
// Timeouts nest: each call must give up before its caller does.
const timed = clone(project), setMs = (id, v) => { timed.interfaces.contracts.find(c => c.id === id).timeoutMs = String(v); };
setMs('rest', 2000); setMs('if-004', 1300); setMs('if-005', 650);
assert.equal(V(deskSource(timed), 'run-001', 'latency').state, 'ok'); assert.equal(V(deskSource(timed), 'run-002', 'latency').value, 'waits up to 650 ms');
setMs('if-005', 1500);
assert.equal(V(deskSource(timed), 'run-002', 'latency').state, 'bad'); assert.match(V(deskSource(timed), 'run-002', 'latency').why, /IF-005 waits 1,500 ms, but its caller IF-004 gives up at 1,300 ms/);
assert.equal(V(deskSource(timed), 'run-001', 'latency').state, 'ok', 'the fault is where the inverted call is');
assert.equal(JSON.stringify(project), before);
pass('each vital follows the facts: a second zone, monitoring, idempotency keys and a covering control turn them normal; a recovery time past the target turns it critical; timeouts nested 2,000 › 1,300 › 650 ms read normal, and a call that waits longer than its caller reads critical');

// 3. What it takes: an objective turned into a specification.
// Round 12 (G, GR-RUN-04): no load stated computes nothing; the playbook's example is explored only when asked for, and
// every line it feeds says "assumed (playbook example)".
// A project of its own (here the reference on the blank template) that states no load: "no load stated", nothing computed.
const own = clone(project); own.workspace = {...(own.workspace || {}), template: 'blank'};
const R = reasoningSource(project), none = capacityObjective(reasoningSource(own)), N = capacityPlan(reasoningSource(own), none);
assert.equal(none.value, null); assert.equal(none.source.kind, 'none'); assert.match(none.source.text, /^No load stated/);
assert.ok(N.noLoad && N.lambda == null && N.rows.length === 0 && N.totals.pods === 0 && N.objText === NO_LOAD && N.exampleFigures.length === 0, 'no load, no capacity reading');
const O = capacityObjective(R, null, {example: true});
assert.equal(capacityObjective(R).source.kind, 'none', 'reference projects also need a recorded objective; the example is opt-in');
const DN = deskSource(own), sysN = Object.fromEntries(DN.system.map(s => [s.vital, s]));
assert.equal(sysN.capacity.head, NO_LOAD); assert.equal(sysN.capacity.state, 'none');
assert.ok(DN.rows.every(r => { const v = V(DN, r.id, 'capacity'); return v.state === 'na' && v.value === NO_LOAD && v.target === NO_LOAD; }), 'no part has a capacity reading without a load');
assert.equal(O.kind, 'users'); assert.equal(O.value, 100000); assert.equal(O.source.kind, 'playbook'); assert.equal(O.source.src, 'QR-Guidebook!F5'); assert.ok(O.source.text.endsWith(EXAMPLE_LABEL));
assert.equal(O.response.driverId, 'QD-003'); assert.equal(O.response.ms, 2000);
const C = capacityPlan(R, O), cr = id => C.rows.find(r => r.id === id);
assert.equal(Math.round(C.lambda), 3125); assert.match(C.lambdaMath, /100,000 users ÷ \(30 s between requests \+ 2 s response \(QD-003\)\) = 3,125 req\/s, assumed \(playbook example\)$/);
assert.equal(C.objText, '100,000 concurrent users, ' + EXAMPLE_LABEL); assert.ok(C.rows.every(r => r.demand.text.endsWith(' · ' + EXAMPLE_LABEL)), 'every part\'s demand read from the example says so');
assert.equal(cr('api-pod').replicas, 24); assert.equal(cr('api-pod').loadReplicas, 23); assert.equal(cr('api-pod').verdict.state, 'bad'); assert.match(cr('api-pod').verdict.why, /RUN-001 can grow to 1: short by 23/);
assert.equal(cr('worker').replicas, 46, 'a worker at 100 messages a second per replica');
assert.match(cr('tr-002').verdict.why, /940 connections needed; PostgreSQL allows 100 connections by default \(max_connections\)/);
assert.match(cr('tr-003').spec.find(s => s.k === 'Backlog to hold').v, /^2,812,500 messages$/, '15 minutes of consumer outage at 3,125 a second');
assert.equal(cr('tr-003').replicas, 3, 'quorum queues need three nodes');
assert.equal(cr('risk-engine').replicas, 24, 'rc39: QD-003 reaches the risk engine through its scope, so it is planned like its peers');
assert.deepEqual(C.totals, {pods: 164, vcpu: 82, mem: 82, nodes: 16});
assert.deepEqual(C.rows.filter(r => r.band === 'outside').map(r => r.ref + ' ' + r.demand.text), ['EXT-002 3,125 req/s · ' + EXAMPLE_LABEL, 'EXT-003 3,125 req/s · ' + EXAMPLE_LABEL], 'what the outside must accept');
assert.ok(C.rows.every(r => r.verdict && r.spec.length && r.fix), 'every part has a verdict, a specification and where to change it');
const zone = capacityPlan(R, capacityObjective(R, null, {kind: 'users', value: 100000, assumptions: {survive: 'zone'}}));
assert.equal(zone.rows.find(r => r.id === 'api-pod').replicas, 46, 'surviving a zone of two doubles what one zone carries');
const rate = capacityPlan(R, capacityObjective(R, null, {kind: 'rate', value: 500}));
assert.equal(rate.rows.find(r => r.id === 'api-pod').replicas, 5);
const tuned = capacityPlan(R, capacityObjective(R, null, {kind: 'users', value: 100000, perReplica: {'api-pod': 1000}}));
assert.equal(tuned.rows.find(r => r.id === 'api-pod').replicas, 6, 'a load-tested replica throughput replaces the assumption');
const withDriver = clone(project); withDriver.quality.drivers.push({id: 'QD-009', category: 'scalability', title: 'Serve the peak', operator: 'At least', targetValue: '40000', unit: 'concurrent users', priority: 'Important', requirementIds: [], responsibilityIds: []}, {id: 'QD-010', category: 'scalability', title: 'Absorb a surge', operator: 'At least', targetValue: '3', unit: '× normal peak', priority: 'Important', requirementIds: [], responsibilityIds: []});
const O2 = capacityObjective(reasoningSource(withDriver));
assert.equal(O2.source.id, 'QD-009'); assert.equal(O2.value, 40000); assert.equal(O2.surge.factor, 3);
assert.equal(Math.round(capacityPlan(reasoningSource(withDriver), O2).lambda), 3750, 'a Chapter 2 driver sets the objective, and its surge multiplies it');
const scaled = clone(project); for (const r of scaled.runtime.plans) r.maxReplicas = 60;
assert.equal(capacityPlan(reasoningSource(scaled), O).rows.find(r => r.id === 'api-pod').verdict.state, 'ok', 'room to grow meets it');
assert.ok(PRODUCT_FACTS.every(f => /^https:\/\//.test(f.src)) && fact('PostgreSQL 17', 'maxConnections').value === 100);
assert.match(capacityMarkdown(C), /## Performance specification[\s\S]*\| APP-001 Payment service \| on Kubernetes 1\.31 \| 3,125 req\/s · assumed \(playbook example\) \|[\s\S]*Planning assumptions:/);
// The desk's vitals with the example explored: each reading it feeds is labelled on its own line.
const DX = deskSource(project, {objective: {example: true}}), sysX = Object.fromEntries(DX.system.map(s => [s.vital, s]));
assert.equal(sysX.capacity.head, '3,125 req/s · ' + EXAMPLE_LABEL); assert.ok(DX.rows.map(r => V(DX, r.id, 'capacity')).filter(v => v.state !== 'na').every(v => v.value.endsWith(EXAMPLE_LABEL) && v.why.includes(EXAMPLE_LABEL)), 'every capacity reading from the example is labelled');
// The SDD reads the same readings: on a project of its own with no load stated, no capacity figure and no example sizing;
// on the illustrative reference, the example's figures labelled on each line. Since F's architecture edition (round 12)
// the readings stand in the SDD's review registers annex (exportSDD, /api/export?chapter=11&annex=registers), so the
// document set read here is the edition and that annex.
const sddSet = p => sddDocument(p, {figures: false}).markdown + '\n' + exportSDD(p, null);
const sddMd = sddSet(own), sddRef = sddSet(project);
assert.match(sddMd, /read against the drivers they carry; no load is stated, so the desk computes no capacity reading\./); assert.match(sddMd, /\| Capacity \| No signal \| no load stated \|/); assert.ok(!/100,000 concurrent users|3,125 req\/s/.test(sddMd), 'the SDD prints no figure from the example');
assert.match(sddRef, /read against the drivers they carry; no load is stated/); assert.ok(!/100,000 concurrent users|3,125 req\/s/.test(sddRef), 'reference SDD never silently adopts example capacity');
assert.ok([...sddRef.matchAll(/[^\n]*(?:100,000 concurrent users|3,125 (?:req|msg)\/s)[^\n]*/g)].every(m => m[0].includes(EXAMPLE_LABEL)), 'every SDD line an example figure feeds is labelled');
// GR-RUN-07: an availability target with no window says the 30 days are assumed wherever its budget is printed.
const noWindow = clone(project); noWindow.quality.drivers.find(d => d.id === 'QD-002').window = '';
const DW = deskSource(noWindow), sysW = Object.fromEntries(DW.system.map(s => [s.vital, s]));
assert.equal(sysW.availability.head, '99.9 % · 43.2 min / 30 d · window not stated (30 days assumed)'); assert.match(V(DW, 'run-001', 'availability').target, /43\.2 min in 30 days · window not stated \(30 days assumed\)$/); assert.match(V(DW, 'run-001', 'availability').why, /QD-002: window not stated \(30 days assumed\)\./);
assert.match(sddSet(noWindow), /\| Availability \| [^|]+ \| 99\.9 % · 43\.2 min \/ 30 d · window not stated \(30 days assumed\) \|/, 'the SDD prints the assumed window with the budget');
pass('GR-RUN-04 and GR-RUN-07: on a project of its own with no load stated the desk and the SDD say "no load stated" and compute no capacity reading (no rate, no part\'s demand, no cluster, no example figure in the SDD); the playbook\'s example is explored only when asked for (the illustrative reference reads it as its illustration), and every figure it feeds is labelled "assumed (playbook example)" on the desk and in the SDD; an availability target with no window prints "window not stated (30 days assumed)" on the desk tile, the part\'s reading and the SDD');
pass('what it takes: 100,000 concurrent users (the SA Playbook\'s example until the project records its own) are 3,125 requests a second — 24 replicas of APP-001, 46 of the settlement worker, 940 connections against PostgreSQL\'s 100, 2.8 million messages to hold for a 15-minute outage, 164 pods on 16 nodes — each against what Chapters 7 and 10 record; a Chapter 2 driver, its surge, a zone rule or a load-tested throughput each change it');

// 4. The thread from each requirement.
const M = deskModel(project);
assert.equal(M.trace.length, 5);
assert.ok(M.trace.every(t => !t.firstBreak), 'every requirement reaches where it runs');
assert.match(describeTrace(M.trace[0]), /^REQ-001 Accept a traceable payment instruction: reaches 9 of 9 recorded places; recorded links reach its running part\. Design links do not verify implementation\.$/);
assert.deepEqual(M.trace[0].cells.platform.map(x => x.label).slice(0, 2), ['Kubernetes 1.31', 'PostgreSQL 17'], 'the platform reads as its products');
const broken = clone(project); broken.logical.mappings = broken.logical.mappings.filter(m => m.logicalId !== 'api');
const Mb = deskModel(broken);
assert.equal(Mb.trace.find(t => t.id === 'REQ-001').firstBreak.id, 'applications', 'with no component, the thread breaks at components');
assert.deepEqual(TRACE_COLS.map(c => c.ch), [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
pass('the thread: each requirement followed through drivers, decisions, responsibilities, components, products, interfaces, controls and runtime to its vitals; a missing link is a break where it happens');

// An environment selected on Chapter 11 must scope every runtime-derived projection together:
// vitals, capacity, trace and the Running board. A missing plan in this environment is not a
// plan from production and is never silently substituted.
const twoEnv = clone(project), second = 'env-test';
twoEnv.runtime.environments.push({...twoEnv.runtime.environments[0], id: second, ref: 'ENV-TEST', title: 'Test environment', assetIds: ['api-pod']});
twoEnv.runtime.zones.push({...twoEnv.runtime.zones[0], id: 'zone-test', ref: 'ZON-TEST', environmentId: second, title: 'Test zone'});
twoEnv.runtime.plans.push({...twoEnv.runtime.plans.find(p => p.id === 'run-001'), id: 'run-test', ref: 'RUN-TEST', environmentId: second, maxReplicas: 80});
twoEnv.runtime.placements.push({...twoEnv.runtime.placements.find(p => p.planId === 'run-001'), id: 'PL-TEST', planId: 'run-test', zoneId: 'zone-test', replicas: 2});
const testDesk = deskModel(twoEnv, {envId: second, objective: {kind: 'rate', value: 20}});
assert.equal(testDesk.env, second);
assert.deepEqual(testDesk.rows.map(r => r.id), ['run-test']);
assert.equal(testDesk.cap.zones, 1);
assert.equal(testDesk.cap.rows.find(r => r.id === 'api-pod').plan.plan.id, 'run-test');
twoEnv.quality.drivers.push({id: 'QD-TEST', category: 'scalability', title: 'Test load', operator: 'At least', targetValue: '20', unit: 'requests/second', priority: 'Important', requirementIds: [], responsibilityIds: []});
assert.equal(scaleReadings(twoEnv, {envId: second}).derived.find(d => d.componentId === 'api-pod').planId, 'run-test', 'derived scale compares with the selected environment too');
assert.ok(testDesk.trace.every(t => t.cells.runtime.every(r => r.id === 'run-test')));
assert.ok(testDesk.trace.some(t => t.runtimeElsewhere && !t.cells.runtime.length), 'a runtime link in another environment does not silently count here');
const testBoard = runningBoard(testDesk);
assert.ok(testBoard.groups.some(g => g.id === second) && testBoard.groups.some(g => g.id === 'zone-test'));
assert.ok(!testBoard.groups.some(g => g.id === 'env-001' || g.id === 'zone-a'));
assert.equal(deskModel(twoEnv, {envId: 'not-an-environment'}).env, 'env-001', 'stale preferences fall back to a recorded environment');
pass('an environment selector scopes the desk, capacity plan, requirement trails and Running board together; plans from another environment do not leak into this one');

// 5. Where to start, and what a probe asks to review.
// The illustrative reference's example joins where to start; a project of its own with no load has no capacity to fix (GR-RUN-04).
// rc39: groups of one state are ordered by how many parts they hold; integrity now reaches more parts than security through the drivers' scope.
assert.deepEqual(M.plan.slice(0, 3).map(x => x.vital + ':' + x.state), ['observability:bad', 'integrity:bad', 'security:bad']);
assert.ok(M.plan[0].rows.length >= M.plan[1].rows.length && M.plan[1].rows.length >= M.plan[2].rows.length, 'the first three are the largest groups to fix, largest first');
const MN = deskModel(own);
assert.ok(!MN.plan.some(x => x.vital === 'capacity'), 'no load, no capacity in where to start');
assert.equal(M.plan[0].text, 'Record how the failure of 13 parts would be seen');
const items = partReviewItems(M, M.rows[0]);
assert.deepEqual(items.map(x => x.chapter + ':' + x.id).slice(0, 4), ['10:run-001', '8:if-004', '8:rest', '9:thr-001']);
assert.equal(capacityReviewItems(M).length, 0, 'reference projects also need an explicit load before capacity review'); assert.equal(capacityReviewItems(MN).length, 0, 'no load, no capacity review to ask for');
const capacityFixture = clone(project); capacityFixture.finalReview.capacity = {kind: 'users', value: 100000, reviewer: 'Synthetic fixture', assumptions: {}};
assert.ok(capacityReviewItems(deskModel(capacityFixture)).some(x => x.chapter === 10 && x.id === 'run-001'), 'a saved synthetic objective still produces capacity review items');
pass('where to start: the vitals that read critical or silent, grouped by what fixes them, most first; a probe on a part asks the records behind its critical vitals to review');

// 6. A decision reaches both ways, and choosing it asks both ways to review.
const I = decisionImplications(project, 'ADR-001', {alternativeId: 'ALT-002'});
assert.deepEqual(I.upstream.map(x => x.chapter + ':' + x.ref), ['1:REQ-001', '1:REQ-002', '1:REQ-005', '2:QD-002', '2:QD-003', '2:QD-006']);
assert.match(I.upstream.find(x => x.ref === 'QD-006').why, /creates tension with it/);
assert.deepEqual([...new Set(I.downstream.map(x => x.chapter))], [4, 5, 8, 10]);
const q = decisionProbe(M, 'ADR-001');
assert.equal(q.lean, 'ALT-002'); assert.deepEqual(q.alts.map(a => a.patterns.records.map(r => r.name)), [['Request-Reply'], ['Message Broker']]);
const chosen = withFinalReview(applyDecisionCommand(clone(project), {type: 'decision.choose', payload: {id: 'ADR-001', alternativeId: 'ALT-002'}}).document);
trackDecisionChange(project, chosen, {type: 'decision.choose'}, '2026-09-25T10:00:00Z');
const ev = changeEvents(chosen).at(-1);
assert.deepEqual(ev.source, {chapter: 3, id: 'ADR-001', ref: 'ADR-001', kind: 'decision', title: 'When should the customer receive a payment acknowledgement?'});
assert.deepEqual(ev.fields, [{key: 'selectedAlternativeId', label: 'Working choice', before: null, after: 'Acknowledge a durable asynchronous handoff'}]);
assert.equal(ev.items.length, 16); assert.ok(ev.items.some(i => i.chapter === 1) && ev.items.some(i => i.chapter === 2), 'earlier chapters are asked too');
assert.deepEqual(changeSummary(chosen, ev), {events: 1, total: 16, reviewed: 0, open: 16, followUp: 0, stale: 0});
const again = clone(chosen); trackDecisionChange(chosen, again, {type: 'decision.save'}, '2026-09-25T10:01:00Z');
assert.equal(changeEvents(again).length, 1, 'nothing changed, nothing is asked');
const reviewed = applyChangeCommand(chosen, {type: 'change.review', payload: {changeId: ev.id, itemKey: '1:REQ-001', targetStamp: ev.items[0].capturedStamp, outcome: 'unchanged', reviewer: 'Neme', rationale: 'Acceptance names the acknowledgement, not completion.', evidence: 'REQ-001 acceptance', reviewed: true}}).document;
assert.equal(changeSummary(reviewed).reviewed, 1);
pass('a decision reaches both ways: ADR-001\'s handoff asks REQ-001, REQ-002, REQ-005 and QD-002, QD-003, QD-006 whether they still hold, and shapes Chapters 4, 5, 8 and 10; choosing it records a change that all 16 review in their own chapter');

// 6b. Round 25: a probe reads the decision reading. leads marks the alternative that leads on the drivers (the probe's
// "favoured" is retired); lines are the reading's sentences, alternatives by title: how firmly the lead holds, what is
// dominated, what a hard constraint rules out. The probe follows the working choice, else the lead; it chooses nothing.
{
  assert.deepEqual(q.alts.map(a => [a.alt.id, a.leads]), [['ALT-001', false], ['ALT-002', true]]); assert.ok(q.alts.every(a => !('favoured' in a)));
  assert.ok(q.lines.some(l => l.kind === 'firmness' && l.text === 'The lead holds if drivers of the same priority count alike, not for every weighting the priorities allow. If only QD-006 (Medium) counted, Keep the customer request synchronous would come ahead of Acknowledge a durable asynchronous handoff.'), q.lines.map(l => l.text).join('\n'));
  assert.ok(decisionProbe(M, 'ADR-003').lines.some(l => l.kind === 'dominated' && /^Retry immediately after a timeout is dominated by Enquire and reconcile before replay:/.test(l.text)));
  let k = applyQualityCommand(clone(project), {type: 'quality.driver', payload: {kind: 'constraint', title: 'Post through the existing core ledger', description: 'Every posting goes through the existing core ledger.', impact: 'Rules out a second store of postings.', constraintIds: ['CON-001'], priority: 'High'}}).document;
  const C = k.quality.drivers.at(-1).id, d2 = () => k.decisions.records.find(d => d.id === 'ADR-002');
  k = applyDecisionCommand(k, {type: 'decision.save', payload: {id: 'ADR-002', driverIds: [...d2().driverIds, C]}}).document;
  k = applyDecisionCommand(k, {type: 'decision.alternative', payload: {id: 'ADR-002', alternativeId: 'ALT-004', assessments: {...d2().alternatives.find(a => a.id === 'ALT-004').assessments, [C]: {effect: 'violates', reason: 'Keeps its own record of postings.', evidence: 'Design review.'}}}}).document;
  const b4 = JSON.stringify(k), q2 = decisionProbe(deskModel(k), 'ADR-002');
  assert.equal(q2.lean, 'ALT-003', 'no working choice: the probe follows the only alternative that meets the hard constraint');
  assert.ok(q2.lines.some(l => l.kind === 'ruled-out' && l.text === 'Suppress repeats in the application cache is ruled out: it breaks QD-007, a hard constraint.'));
  assert.deepEqual(q2.alts.map(a => [a.alt.id, a.leads, a.effects.find(e => e.id === C).effect]), [['ALT-003', true, 'unknown'], ['ALT-004', false, 'violates']]);
  assert.equal(JSON.stringify(k), b4, 'probing changes nothing');
  pass('a probe reads the decision reading: the alternative that leads on the drivers, and the reading\'s own sentences for how firmly it holds (ADR-001: only if drivers of the same priority count alike), what another dominates (ADR-003) and what a hard constraint rules out (ADR-002 with a constraint driver ALT-004 breaks); probing changes nothing');
}

// 7. A review asked for by hand.
const ask = (payload) => applyChangeCommand(project, {type: 'change.request', payload});
assert.throws(() => ask({source: {chapter: 10, id: 'run-001'}, items: [{chapter: 10, id: 'run-001'}], reason: '', requestedBy: 'Neme', reviewed: true}), /why the review is needed/);
assert.throws(() => ask({source: {chapter: 10, id: 'nope'}, items: [{chapter: 10, id: 'run-001'}], reason: 'x', requestedBy: 'Neme', reviewed: true}), /record the review is about/);
assert.throws(() => ask({source: {chapter: 10, id: 'run-001'}, items: [{chapter: 99, id: 'x'}], reason: 'x', requestedBy: 'Neme', reviewed: true}), /at least one record/);
const asked = ask({source: {chapter: 10, id: 'run-001', kind: 'runtime plan'}, items: [...items, items[0]], reason: 'The desk reads it critical on capacity.', requestedBy: 'Neme', reviewed: true}).document;
const rq = changeEvents(asked).at(-1);
assert.equal(rq.items.length, items.length, 'each record is asked once'); assert.equal(rq.request.by, 'Neme'); assert.match(rq.title, /^Review requested · /);
const ok = applyChangeCommand(asked, {type: 'change.review', payload: {changeId: rq.id, itemKey: '10:run-001', targetStamp: rq.items[0].capturedStamp, outcome: 'follow-up', owner: 'Platform team', action: 'Size replicas for the objective', reviewer: 'Neme', rationale: 'Short by 23', evidence: 'Review desk', reviewed: true}}).document;
assert.equal(changeSummary(ok, changeEvents(ok).at(-1)).followUp, 1);
pass('a review asked for by hand is recorded like any change: it names who asks and why, each record once, and each is reviewed in its own chapter');

// 8. Anti-patterns as Chapter 11 findings; the review objective in the SDD.
const fs = inheritedFindings(project).filter(f => f.id.startsWith('ANTI:'));
assert.deepEqual(fs.map(f => f.id), ['ANTI:spof', 'ANTI:sync-chain', 'ANTI:idempotency', 'ANTI:queue', 'ANTI:observability']);
assert.ok(fs.every(f => f.level === 'warning' && f.chapter && f.detail.includes('Ask:')));
assert.equal(reviewBlockers(project).length, 211, 'review items, not blockers');
const treated = applyFinalReviewCommand(project, {type: 'review.disposition', payload: {findingId: 'ANTI:queue', stamp: fs[3].stamp, treatment: 'Accepted design limitation', rationale: 'Bounded by the core banking limit, recorded in Chapter 8.', reviewer: 'Neme', reference: 'CHG review', reviewed: true}}).document;
assert.equal(findingTreatment(treated, inheritedFindings(treated).find(f => f.id === 'ANTI:queue')), 'Accepted design limitation');
assert.equal(deskModel(treated).findings.find(f => f.anti.id === 'queue').treatment, 'Accepted design limitation');
assert.throws(() => applyFinalReviewCommand(project, {type: 'review.objective', payload: {kind: 'users', value: 0, reviewer: 'Neme', reviewed: true}}), /positive number/);
assert.throws(() => applyFinalReviewCommand(project, {type: 'review.objective', payload: {kind: 'users', value: 1000, reviewer: '', reviewed: true}}), /Name who sets/);
const saved = applyFinalReviewCommand(project, {type: 'review.objective', payload: {kind: 'users', value: 50000, reviewer: 'Neme', reviewed: true, assumptions: {thinkSeconds: 20, utilisation: 150, survive: 'zone', readShare: 0}}}).document;
assert.deepEqual(saved.finalReview.capacity.assumptions, {thinkSeconds: 20, survive: 'zone', readShare: 0}, 'out-of-range assumptions are left out');
assert.equal(capacityObjective(reasoningSource(saved), saved.finalReview.capacity).source.kind, 'review');
assert.match(assembleSDD(saved), /## Performance specification\n\nObjective: 50,000 concurrent users \(The review objective, saved in Chapter 11 by Neme\)/);
assert.match(assembleSDD(project), /## Performance specification\n\nNo load stated: no objective is recorded/);
assert.equal(applyFinalReviewCommand(saved, {type: 'review.objective-clear', payload: {}}).document.finalReview.capacity, null);
pass('anti-patterns are Chapter 11 review items, treated like any finding; the review objective is validated, saved with its assumptions and carried into the SDD as its performance specification');

// 9. The Running board (round 4, C; the grid layouts of the old board graphic are retired): every running part one
//    element, inside the container of where it is placed, with its state in words read from its vitals, joined to
//    the components it runs and the requirements those fulfil in the kit's relationship kinds; no two elements overlap,
//    and the same design gives the same picture.
const RB = runningBoard(M), {D: RD, L: RL} = boardLayout(RB);
const partsOf = D => D.nodes.filter(n => n.type === 'runtime');
assert.equal(partsOf(RD).length, M.rows.length, 'one element for each running part');
assert.deepEqual(partsOf(RD).map(n => n.id).sort(), M.rows.map(r => r.id).sort());
assert.deepEqual(RD.groups.map(g => [g.id, g.kind, g.title]), [['env-001', 'environment', 'Payment production design'], ['zone-a', 'zone', 'Application zone'], ['zone-b', 'zone', 'Recovery zone'], ['unplaced:env-001', 'unplaced', 'Not placed']]);
for (const r of M.rows) {
  const n = RD.nodes.find(x => x.id === r.id), st = partStatus(r), worst = r.vitals.some(v => v.state === 'bad') ? 'to fix' : r.vitals.some(v => v.state === 'warn' || v.state === 'none') ? 'to confirm' : 'passing';
  assert.equal(st.word, worst, r.ref);
  assert.equal(n.group, r.f.zonesAll.length === 1 ? r.f.zonesAll[0] : r.f.zonesAll.length ? 'zones:' + r.f.zonesAll.join('+') : 'unplaced:env-001', r.ref + ' stands where it is placed');
  assert.equal(n.hatched, !r.f.zonesAll.length);
  assert.ok(n.sub.endsWith(st.label) && n.title.startsWith(r.ref + ' ') && n.layer === 'deployment' && n.kind === 'placement');
}
assert.ok(!/blocking/i.test(JSON.stringify(RD)), 'never "blocking"');
const kinds = {}; for (const e of RD.edges) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
assert.deepEqual(kinds, {realizes: 5, fulfils: 5, serves: 28}, 'part → component → requirement');
assert.ok(RD.edges.every(e => RD.nodes.some(n => n.id === e.from) && RD.nodes.some(n => n.id === e.to)));
assert.ok(RD.edges.filter(e => e.kind === 'realizes').every(e => M.rows.find(r => r.id === e.from)?.assetId === e.to), 'a part realizes its own component');
for (let i = 0; i < RL.nodes.length; i++) for (let j = i + 1; j < RL.nodes.length; j++) assert.ok(!overlap(RL.nodes[i], RL.nodes[j]), RL.nodes[i].id + ' / ' + RL.nodes[j].id);
for (const n of RL.nodes) { const g = RL.groups.find(x => x.id === RD.nodes.find(y => y.id === n.id).group); if (g) assert.ok(n.x >= g.x && n.y >= g.y && n.x + n.w <= g.x + g.w && n.y + n.h <= g.y + g.h, n.id + ' stays in its container'); }
assert.ok(RL.edges.filter(e => e.kind === 'serves').every(e => e.labelHidden), 'the many serving lines carry no word on the picture');
assert.equal(JSON.stringify(boardLayout(runningBoard(deskModel(project))).L), JSON.stringify(RL), 'deterministic');
assert.ok(LOAD_BANDS.some(b => b.id === 'parts'));
const big = clone(project);
for (let i = 0; i < 120; i++) { big.realisation.components.push({id: 'c' + i, ref: 'APP-' + (100 + i), title: 'Part ' + i, kind: i % 3 ? 'service' : 'worker', dataIds: [], decisionIds: []}); big.runtime.plans.push({...big.runtime.plans[0], id: 'rp' + i, ref: 'RUN-' + (100 + i), assetId: 'c' + i, title: 'Part ' + i}); if (i) big.realisation.connections.push({id: 'X' + i, from: 'c' + (i - 1), to: 'c' + i, interaction: i % 5 ? 'sync' : 'event', kind: 'flow'}); }
const t0 = Date.now(), MB = deskModel(big), ms = Date.now() - t0;
assert.equal(MB.rows.length, 134); assert.ok(ms < 4000, 'a 134-part design reads in ' + ms + ' ms');
const t1 = Date.now(), BB = boardLayout(runningBoard(MB)), msb = Date.now() - t1;
assert.equal(partsOf(BB.D).length, 134); assert.ok(msb < 4000, 'its board is drawn in ' + msb + ' ms');
// The kit's grouped arrangement lays a crowded rank out as a grid no wider than the page (notation-layout.js crowded):
// the 125 components and the 131 parts not placed stand in rows of six, not in a staircase 26,796 px wide.
assert.ok(BB.L.W <= NL.PAGE + 2 * NL.LEFT, 'the 134-part board is ' + BB.L.W + ' px wide');
for (let i = 0; i < BB.L.nodes.length; i++) for (let j = i + 1; j < BB.L.nodes.length; j++) assert.ok(!overlap(BB.L.nodes[i], BB.L.nodes[j]), BB.L.nodes[i].id + ' / ' + BB.L.nodes[j].id);
for (const n of BB.L.nodes) { const g = BB.L.groups.find(x => x.id === BB.D.nodes.find(y => y.id === n.id).group); if (g) assert.ok(n.x >= g.x && n.y >= g.y && n.x + n.w <= g.x + g.w && n.y + n.h <= g.y + g.h, n.id + ' stays in its container'); }
pass(`the Running board: ${M.rows.length} running parts, one element each, in the containers of where they are placed, each with its state in words read from its vitals, below the components they realize or serve and the requirements those fulfil; no two elements overlap, every part stays in its container, the same design gives the same picture; a 134-part design reads in ${ms} ms and its board, ${BB.L.W} px wide with its crowds in rows, is arranged in ${msb} ms`);

// 10. The Scale reading (round 6, Contract K): what the recorded targets imply, derived and compared, in the desk's words.
{
  const s = scaleReadings(project);
  assert.deepEqual(s.findings.map(f => f.id), ['SCALE-NO-TARGET:project'], 'the reference records no demand target: one finding, for the project');
  assert.match(s.summary, /^No rate, concurrent-user or data-volume target is recorded; QD-003 allows 2,000 ms; the reference round trips along the longest required path take about 21\.5 ms \(1 % of it\)/);
  const withRate = clone(project); withRate.quality.drivers.push({id: 'QD-009', category: 'scalability', title: 'Carry the instruction rate', operator: 'At least', targetValue: '500', unit: 'requests per second', window: '', metric: 'rate', priority: 'Important', requirementIds: [], responsibilityIds: [], targetConfirmed: false});
  const s2 = scaleReadings(withRate), api = s2.derived.find(x => x.componentId === 'api-pod');
  assert.deepEqual([api.qps, api.replicas.needed, api.replicas.placed, api.planRef], [1500, 11, 1, 'RUN-001'], '500 a second × 3 at peak: 11 replicas against 1 placed');
  assert.equal(s2.findings.filter(f => f.code === 'SCALE-UNDER-PROVISIONED').length, 5);
  const blockersBefore = new Set(reviewBlockers(project).map(b => b.id)), blockersNow = reviewBlockers(withRate), extra = blockersNow.filter(b => !blockersBefore.has(b.id));
  assert.ok(!blockersNow.some(b => /SCALE-/.test(b.id)) && extra.length && extra.every(b => (b.objectId || b.driverId) === 'QD-009'), 'to confirm, never a blocker: the only new blockers are the new driver\'s own Chapter 2 checks');
  pass('the Scale reading: the reference records no demand target, so one finding and a one-line summary with the latency budget; with a rate of 500 a second, 1,500 at peak over the recorded interactions is 11 replicas of APP-001 against 1 placed, to confirm and never a blocker');
}
assert.equal(JSON.stringify(project), before, 'reading the desk changes nothing');
pass('reading the desk changes nothing in the project');
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
