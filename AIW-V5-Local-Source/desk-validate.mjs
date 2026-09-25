// Review desk checks: vitals, what an objective takes, the thread, decisions that ask earlier and
// later chapters to review, anti-patterns as Chapter 11 findings, the review objective in the SDD,
// and the layouts. Run: npm run test:desk
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview, applyFinalReviewCommand, inheritedFindings, reviewBlockers, assembleSDD, findingTreatment} from './public/review-domain.js';
import {applyDecisionCommand} from './public/decisions-domain.js';
import {applyChangeCommand, changeSummary, changeEvents} from './public/changes-domain.js';
import {reasoningSource} from './public/design-reasoning.js';
import {deskSource, VITALS, systemVitals} from './public/desk-vitals.js';
import {capacityObjective, capacityPlan, capacityMarkdown, ASSUMPTIONS, fmtN} from './public/desk-capacity.js';
import {deskModel, TRACE_COLS, treatmentPlan, decisionProbe, partReviewItems, capacityReviewItems, describeTrace} from './public/desk-model.js';
import {decisionImplications, trackDecisionChange} from './public/decision-impact.js';
import {vitalsLayout, loadLayout, traceLayout} from './public/desk-layout.js';
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
assert.equal(V(D, 'run-001', 'latency').state, 'none'); assert.match(V(D, 'run-001', 'latency').why, /3 calls on QD-003's path nest inside 2,000 ms[\s\S]*IF-001, IF-004 record no timeout/);
assert.equal(D.rows.filter(r => V(D, r.id, 'observability').state === 'bad').length, 12);
const sys = Object.fromEntries(D.system.map(s => [s.vital, s]));
assert.equal(sys.availability.head, '99.9 % · 43.2 min / 30 d'); assert.equal(sys.capacity.head, '3,125 req/s'); assert.equal(sys.security.head, '1 of 4 threats covered'); assert.equal(sys.observability.head, '0 of 14 monitored');
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
const R = reasoningSource(project), O = capacityObjective(R);
assert.equal(O.kind, 'users'); assert.equal(O.value, 100000); assert.equal(O.source.kind, 'playbook'); assert.equal(O.source.src, 'QR-Guidebook!F5');
assert.equal(O.response.driverId, 'QD-003'); assert.equal(O.response.ms, 2000);
const C = capacityPlan(R, O), cr = id => C.rows.find(r => r.id === id);
assert.equal(Math.round(C.lambda), 3125); assert.match(C.lambdaMath, /100,000 users ÷ \(30 s between requests \+ 2 s response \(QD-003\)\) = 3,125 req\/s/);
assert.equal(cr('api-pod').replicas, 24); assert.equal(cr('api-pod').loadReplicas, 23); assert.equal(cr('api-pod').verdict.state, 'bad'); assert.match(cr('api-pod').verdict.why, /RUN-001 can grow to 1: short by 23/);
assert.equal(cr('worker').replicas, 46, 'a worker at 100 messages a second per replica');
assert.match(cr('tr-002').verdict.why, /940 connections needed; PostgreSQL allows 100 connections by default \(max_connections\)/);
assert.match(cr('tr-003').spec.find(s => s.k === 'Backlog to hold').v, /^2,812,500 messages$/, '15 minutes of consumer outage at 3,125 a second');
assert.equal(cr('tr-003').replicas, 3, 'quorum queues need three nodes');
assert.deepEqual(C.totals, {pods: 163, vcpu: 81.5, mem: 81.5, nodes: 16});
assert.deepEqual(C.rows.filter(r => r.band === 'outside').map(r => r.ref + ' ' + r.demand.text), ['EXT-002 3,125 req/s', 'EXT-003 3,125 req/s'], 'what the outside must accept');
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
assert.match(capacityMarkdown(C), /## Performance specification[\s\S]*\| APP-001 Payment service \| on Kubernetes 1\.31 \| 3,125 req\/s \|[\s\S]*Planning assumptions:/);
pass('what it takes: 100,000 concurrent users (the SA Playbook\'s example until the project records its own) are 3,125 requests a second — 24 replicas of APP-001, 46 of the settlement worker, 940 connections against PostgreSQL\'s 100, 2.8 million messages to hold for a 15-minute outage, 163 pods on 16 nodes — each against what Chapters 7 and 10 record; a Chapter 2 driver, its surge, a zone rule or a load-tested throughput each change it');

// 4. The thread from each requirement.
const M = deskModel(project);
assert.equal(M.trace.length, 5);
assert.ok(M.trace.every(t => !t.firstBreak), 'every requirement reaches where it runs');
assert.match(describeTrace(M.trace[0]), /^REQ-001 Accept a traceable payment instruction: reaches 8 of 8 places, unbroken to where it runs\.$/);
assert.deepEqual(M.trace[0].cells.platform.map(x => x.label).slice(0, 2), ['Kubernetes 1.31', 'PostgreSQL 17'], 'the platform reads as its products');
const broken = clone(project); broken.logical.mappings = broken.logical.mappings.filter(m => m.logicalId !== 'api');
const Mb = deskModel(broken);
assert.equal(Mb.trace.find(t => t.id === 'REQ-001').firstBreak.id, 'applications', 'with no component, the thread breaks at components');
assert.deepEqual(TRACE_COLS.map(c => c.ch), [2, 3, 4, 5, 7, 8, 9, 10, 11]);
pass('the thread: each requirement followed through drivers, decisions, responsibilities, components, products, interfaces, controls and runtime to its vitals; a missing link is a break where it happens');

// 5. Where to start, and what a probe asks to review.
assert.deepEqual(M.plan.slice(0, 4).map(x => x.vital + ':' + x.state), ['observability:bad', 'capacity:bad', 'security:bad', 'integrity:bad']);
assert.equal(M.plan[0].text, 'Record how the failure of 12 parts would be seen');
const items = partReviewItems(M, M.rows[0]);
assert.deepEqual(items.map(x => x.chapter + ':' + x.id).slice(0, 4), ['10:run-001', '8:if-004', '8:rest', '9:thr-001']);
assert.ok(capacityReviewItems(M).some(x => x.chapter === 10 && x.id === 'run-001'));
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
assert.match(assembleSDD(project), /## Performance specification\n\nNo objective is recorded/);
assert.equal(applyFinalReviewCommand(saved, {type: 'review.objective-clear', payload: {}}).document.finalReview.capacity, null);
pass('anti-patterns are Chapter 11 review items, treated like any finding; the review objective is validated, saved with its assumptions and carried into the SDD as its performance specification');

// 9. Layouts: grids that never overlap, whatever is selected.
const vl = vitalsLayout(M.rows, VITALS), cells = vl.rows.flatMap(r => vl.cols.map(c => ({x: c.x, y: r.y, w: c.w, h: r.h})));
for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) assert.ok(!overlap(cells[i], cells[j]));
assert.ok(vl.rows.every(r => r.y >= vl.top) && vl.cols.every(c => c.x >= vl.rail));
const ll = loadLayout(M.cap.rows);
assert.equal(ll.cards.length, M.cap.rows.length);
for (let i = 0; i < ll.cards.length; i++) for (let j = i + 1; j < ll.cards.length; j++) assert.ok(!overlap(ll.cards[i], ll.cards[j]), ll.cards[i].id + ' / ' + ll.cards[j].id);
for (const c of ll.cards) { const b = ll.bands.find(b => b.id === c.band); assert.ok(c.y >= b.y && c.y + c.h <= b.y + b.h, c.id + ' stays in its band'); }
const tl = traceLayout(M.trace, TRACE_COLS);
for (let i = 1; i < tl.rows.length; i++) assert.ok(tl.rows[i].y >= tl.rows[i - 1].y + tl.rows[i - 1].h);
const big = clone(project);
for (let i = 0; i < 120; i++) { big.realisation.components.push({id: 'c' + i, ref: 'APP-' + (100 + i), title: 'Part ' + i, kind: i % 3 ? 'service' : 'worker', dataIds: [], decisionIds: []}); big.runtime.plans.push({...big.runtime.plans[0], id: 'rp' + i, ref: 'RUN-' + (100 + i), assetId: 'c' + i, title: 'Part ' + i}); if (i) big.realisation.connections.push({id: 'X' + i, from: 'c' + (i - 1), to: 'c' + i, interaction: i % 5 ? 'sync' : 'event', kind: 'flow'}); }
const t0 = Date.now(), MB = deskModel(big), ms = Date.now() - t0;
assert.equal(MB.rows.length, 134); assert.ok(ms < 4000, 'a 134-part design reads in ' + ms + ' ms');
const vb = vitalsLayout(MB.rows, VITALS); assert.equal(vb.rows.length, 134);
pass(`layouts: vitals, what it takes and the trace are grids — no two cells or cards overlap, each card stays in its band, and a 134-part design reads in ${ms} ms`);

assert.equal(JSON.stringify(project), before, 'reading the desk changes nothing');
pass('reading the desk changes nothing in the project');
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
