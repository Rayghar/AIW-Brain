// The design questions a record faces (rc39, PLAN §4.2), read on the reference project: the drivers reaching a
// component, the questions they open, the answers the canonical records already hold with their state, the story of a
// decided question, the driver's own reading, the project totals, the Model lens's reach, purity and memoisation.
// Run: npm run test:design-questions
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {memoPass, settleDocument} from './public/document-memo.js';
import {designQuestions, driverQuestions, projectQuestions, driverReach, driverReading, optionTitle} from './public/design-questions.js';
import {DESIGN_QUESTIONS} from './public/pattern-dna.js';
const checks = [], pass = n => checks.push(n);
const clone = x => JSON.parse(JSON.stringify(x));
const p = withFinalReview(seedProject()), before = JSON.stringify(p);

// 1. The Payment service: its drivers, its facts, the questions they open and what answers them today.
const api = designQuestions(p, 'api-pod');
assert.equal(api.ref, 'APP-001'); assert.equal(api.chapter, 5); assert.equal(api.kind, 'component');
assert.deepEqual(api.drivers.map(d => d.id), ['QD-001', 'QD-002', 'QD-003', 'QD-005', 'QD-006'], 'the drivers reaching it through the driver scope');
assert.deepEqual(api.drivers.map(d => d.shape), ['integrity', 'availability', 'latency', 'protection', 'trail']);
assert.deepEqual(api.facts, {reads: true, writes: true, remote: true, exposed: true, handsOff: false, stateful: true, worker: false});
const q = id => api.questions.find(x => x.id === id);
assert.equal(q('read-path').state, 'open'); assert.deepEqual(q('read-path').because, ['QD-003']); assert.deepEqual(q('read-path').answers, []);
assert.equal(q('idempotency').state, 'open', 'QD-001 asks for exactly one effect and IF-001 records no idempotency key');
assert.equal(q('persistence').state, 'draft'); assert.ok(q('persistence').answers.some(a => a.kind === 'need' && a.ref === 'TN-002' && a.chapter === 6) && q('persistence').answers.some(a => a.kind === 'realization' && a.ref === 'TR-002' && a.chapter === 7));
assert.equal(q('protection').state, 'draft'); assert.ok(q('protection').answers.some(a => a.kind === 'control' && a.ref === 'SEC-001'), 'the control that targets it, draft while its failure mode is unspecified');
assert.equal(q('recovery').state, 'draft'); assert.ok(q('recovery').answers.some(a => a.kind === 'plan' && a.ref === 'RUN-001'));
assert.equal(q('handoff'), undefined, 'it hands nothing off after a commit, so the queue question is not its question');
assert.equal(q('partitioning'), undefined, 'no growth or throughput target reaches it');
assert.deepEqual(api.counts, {open: 3, draft: 6, decided: 0});
for (const x of api.questions) { assert.ok(x.title && x.question && x.caution && x.decide, x.id); assert.equal(x.story, '', 'nothing is decided yet'); }
pass('the Payment service’s questions');

// 2. A worker that hands off and a capability that answers one category.
const worker = designQuestions(p, 'worker');
assert.equal(worker.facts.worker, true); assert.ok(worker.questions.some(x => x.id === 'handoff'), 'the settlement worker faces the hand-off question');
const queue = designQuestions(p, 'queue');
assert.equal(queue.kind, 'capability'); assert.equal(queue.chapter, 6); assert.deepEqual(queue.questions.map(x => x.id), ['handoff'], 'a messaging capability answers the hand-off question only');
const caching = designQuestions(p, 'tc-004'); assert.deepEqual(caching.questions, [], 'a caching capability no component needs yet answers nothing');
const tr2 = designQuestions(p, 'tr-002'); assert.equal(tr2.kind, 'realization'); assert.equal(tr2.chapter, 7); assert.deepEqual(tr2.questions.map(x => x.id), ['persistence']);
assert.equal(designQuestions(p, 'REQ-001'), null); assert.equal(designQuestions(p, ''), null);
pass('workers, capabilities and realizations');

// 3. A decided question tells its story: an applied read-path task on the Payment service.
const decided = clone(p); decided.coauthoring ||= {}; decided.coauthoring.designTasks = [{id: 'DES-007', kind: 'architecture', topic: 'reads', status: 'applied', optionId: 'cache-aside', requirementId: 'REQ-001', driverId: 'QD-003', basis: {contextIds: ['api-pod']}, answers: {}}];
const d = designQuestions(decided, 'api-pod').questions.find(x => x.id === 'read-path');
assert.equal(d.state, 'decided'); assert.deepEqual(d.answers, [{kind: 'task', ref: 'DES-007', title: 'Reuse a bounded read copy', state: 'decided', chapter: 5, optionId: 'cache-aside', topic: 'reads'}]);
assert.equal(d.story, 'Reuse a bounded read copy for APP-001, because QD-003 (DES-007).');
assert.equal(optionTitle('cache-aside'), 'Reuse a bounded read copy'); assert.equal(optionTitle('protected-call'), 'Isolate and break the circuit'); assert.equal(optionTitle('nope'), 'nope');
const proposed = clone(decided); proposed.coauthoring.designTasks[0].status = 'proposed';
assert.equal(designQuestions(proposed, 'api-pod').questions.find(x => x.id === 'read-path').state, 'draft', 'a proposed task is a draft, never decided');
const dismissed = clone(decided); dismissed.coauthoring.designTasks[0].status = 'dismissed';
assert.equal(designQuestions(dismissed, 'api-pod').questions.find(x => x.id === 'read-path').state, 'open', 'a dismissed task answers nothing');
pass('a decided question and its story');

// 4. A recorded contract fact answers: an idempotency key on IF-001 decides the idempotency question.
const keyed = clone(p); keyed.interfaces.contracts.find(c => c.ref === 'IF-001').idempotencyKey = 'paymentReference';
const k = designQuestions(keyed, 'api-pod').questions.find(x => x.id === 'idempotency');
assert.equal(k.state, 'decided'); assert.equal(k.answers[0].chapter, 8); assert.match(k.story, /^Payment initiation: key paymentReference for APP-001, because QD-001 \(IF-001\)\.$/);
pass('a contract fact answers');

// 5. The driver's own reading: what QD-003 asks and where it lands.
const dq = driverQuestions(p, 'QD-003');
assert.equal(dq.driver.shape, 'latency'); assert.equal(dq.driver.attribute.family.id, 'efficiency'); assert.ok(dq.driver.attribute.tactics.some(t => t.id === 'T-PF-CACHE'));
assert.deepEqual(dq.questions.map(x => x.id), ['read-path', 'persistence', 'handoff', 'protected-call']);
assert.deepEqual(dq.questions[0].lands.map(l => l.ref + ':' + l.state), ['APP-001:open', 'APP-002:open', 'APP-004:open']);
assert.ok(dq.questions[0].knowledge.tactics.length >= 2 && dq.counts.open + dq.counts.draft + dq.counts.decided === dq.questions.reduce((n, x) => n + x.lands.length, 0));
assert.equal(driverQuestions(p, 'QD-999'), null);
const reading = driverReading(p.quality.drivers.find(x => x.id === 'QD-003')); assert.equal(reading.kind, 'quality'); assert.equal(reading.target, 'At most 2 seconds'); assert.equal(reading.measurable, true);
pass('the driver’s reading');

// 6. The project totals agree with the records, and a project without drivers asks nothing.
const pj = projectQuestions(p);
assert.equal(pj.records.length, 5 + 9 + 9, 'five components, nine capabilities, nine realizations');
const sum = pj.records.reduce((n, r) => n + r.open + r.draft + r.decided, 0); assert.equal(sum, pj.totals.open + pj.totals.draft + pj.totals.decided);
assert.deepEqual(pj.byChapter[5], {open: 6, draft: 15, decided: 0});
assert.ok(pj.byChapter[6].open + pj.byChapter[6].draft < pj.byChapter[5].open + pj.byChapter[5].draft, 'capabilities carry their category’s questions, not every application’s');
const silent = clone(p); silent.quality.drivers = [];
assert.deepEqual(projectQuestions(silent).totals, {open: 0, draft: 0, decided: 0}); assert.deepEqual(designQuestions(silent, 'api-pod').questions, []);
pass('project totals');

// 7. The Model lens's reach: which elements QD-002 lights, with their state; a driver that reaches nothing lights nothing.
const reach = driverReach(p, 'QD-002');
assert.equal(reach.get('api-pod'), 'open'); assert.equal(reach.get('worker'), 'draft'); assert.ok(reach.has('gateway') && reach.has('tr-005'));
assert.equal(driverReach(p, 'QD-999').size, 0);
pass('the lens reach');

// 8. Pure and memoised: the document is untouched; the reading is the same on every call, and one object within a
// memo pass or on a settled document (document-memo.js caches only there, as every projection in the product does).
assert.equal(JSON.stringify(p), before);
assert.deepEqual(designQuestions(p, 'api-pod'), api); assert.deepEqual(projectQuestions(p), pj);
memoPass(p, () => { const a = designQuestions(p, 'api-pod'); assert.equal(designQuestions(p, 'api-pod'), a, 'one object within a pass'); assert.equal(projectQuestions(p), projectQuestions(p)); });
const settled = settleDocument(withFinalReview(seedProject())); assert.equal(designQuestions(settled, 'worker'), designQuestions(settled, 'worker'), 'one object on a settled document');
assert.equal(DESIGN_QUESTIONS.length, 12);
pass('pure and memoised');

console.log(`design-questions: ${checks.length} checks passed (${checks.join('; ')})`);
