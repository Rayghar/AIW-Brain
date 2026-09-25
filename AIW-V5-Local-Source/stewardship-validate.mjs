// The AIW Brain learns: an architect's disagreement with Sol reaches the knowledge stewards, Sol
// advises them, what they capture takes the governed path (review, release, activation, link), and
// from then on Sol reads it with the record. Run: npm run test:stewardship
import assert from 'node:assert/strict';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyKnowledgeCommand, knowledgeStamp, knowledgeImpactStamp, knowledgeState, dismissalSourceBody} from './public/knowledge-governance.js';
import {PRODUCT_PACK} from './public/model-knowledge.js';
import {stewardQueue, captureDraft, stewardshipReading, stewardshipStamp, knowledgeRestedOn, assessmentObject, learnedFor} from './public/knowledge-stewardship.js';
import {reasoningRequest, reasoningPacket, validateReasoningOutput, guardReasoning, settleReasoning, adoptReasoning, reasoningCurrency, verdictText} from './public/brain-reasoning.js';
import {mockAssessment, mockReview, envelope} from './mock-llm-provider.mjs';

const checks = [], pass = n => checks.push(n);
const base = withFinalReview(seedProject()), before = JSON.stringify(base);
let clock = 0;
const at = () => new Date(Date.UTC(2026, 8, 25, 12, clock++)).toISOString();
// A saved run, as the service stores it, from the test double.
const reason = (p, ids, values = {}) => { const packet = reasoningPacket(p, {task: 'decisions', ids, values}), raw = mockAssessment(packet), r = guardReasoning(packet, validateReasoningOutput(raw, packet)); return {id: 'run-' + clock++, status: 'completed', provider: 'OpenAI', model: 'mock-sol', createdAt: at(), packet, result: settleReasoning(packet, r, mockReview({candidate: raw}))}; };
const adopt = (p, run, itemId, outcome, why = '') => adoptReasoning(p, {itemId, outcome, reason: why}, run, at()).document;
const K = (p, type, payload) => applyKnowledgeCommand(p, {type: 'knowledge.' + type, payload}, at(), 'steward-test').document;
const review = {reviewed: true, reviewer: 'Knowledge steward', reason: 'Checked against the architect’s record and the design.'};

// 1. A disagreement reaches the stewards, with what the advice rested on.
const r1 = reason(base, ['M:8:rest']);
assert.equal(r1.result.assessments[0].verdict, 'refine');
let p = adopt(base, r1, 'M:8:rest', 'dismissed', 'The channel gateway already enforces a 2-second budget on this call.');
const sa = p.coauthoring.assessments.at(-1);
assert.equal(sa.outcome, 'dismissed');
let q = stewardQueue(p);
assert.equal(q.open.length, 1); assert.equal(q.count, 1);
const item = q.open[0];
assert.equal(item.key, 'dismissal:' + sa.id); assert.equal(item.objectId, 'rest'); assert.equal(item.ref, 'IF-001'); assert.equal(item.solId, 'K:' + sa.id);
assert.ok(item.knowledge.every(k => !k.withdrawn));
assert.deepEqual([assessmentObject(p, 'F:capacity:run-001'), assessmentObject(p, 'J:security:run-002'), assessmentObject(p, 'F:latency:QD-003'), assessmentObject(p, 'D:ADR-001'), assessmentObject(p, 'M:2:QD-002|whatif')], ['run-001', 'run-002', 'QD-003', 'ADR-001', 'QD-002']);
pass('a disagreement reaches the stewards\' queue with the record it concerned and the knowledge the advice rested on');

// 2. Sol advises the stewards: what the disagreement should teach.
assert.equal(reasoningRequest({task: 'decisions', ids: ['K:' + sa.id]}).ids[0], 'K:' + sa.id);
assert.throws(() => reasoningRequest({task: 'decisions', ids: ['K:nobody']}), /stewards’ queue/);
const kp = reasoningPacket(p, {task: 'decisions', ids: ['K:' + sa.id]});
assert.equal(kp.sources[0].kind, 'stewardship-reading');
const S1 = JSON.parse(kp.sources[0].excerpt);
assert.match(S1.reading.architectDisagreed, /2-second budget/); assert.equal(S1.reading.advice.assessment, sa.id); assert.ok(S1.reading.recordNow.record, 'the record as its chapter reads it now');
assert.deepEqual(kp.items[0].allowed.knobs, ['statement', 'conditions', 'limitations']);
assert.equal(kp.items[0].kind, 'stewardship'); assert.equal(verdictText('stewardship', 'refine').short, 'Capture, reworded');
assert.ok(!kp.sources.some(s => s.kind === 'planning-assumptions'), 'no objective for a stewardship decision');
const r2 = reason(p, ['K:' + sa.id]);
const advice = r2.result.assessments[0];
assert.equal(advice.verdict, 'refine'); assert.match(advice.refinements[0].value, /^Within this project: The channel gateway/);
p = adopt(p, r2, 'K:' + sa.id, 'used');
assert.equal(stewardQueue(p).open.length, 1, 'Sol\'s advice to the stewards is not queued again');
pass('Sol advises the stewards through the same reasoning task: the disagreement, the advice it answered, the record as it reads now, and the project\'s knowledge on it; a capture is drafted in the knobs and Sol may reword it');

// 3. Captured: an original source and a candidate claim, on the ordinary governed path.
const draft = captureDraft(p, sa);
assert.equal(draft.subjectId, 'IF-001'); assert.equal(draft.polarity, 'limits'); assert.match(draft.conditions, /Applies to IF-001 Payment initiation/);
assert.throws(() => K(p, 'capture', {...draft, assessmentId: 'SA-999'}), /disagreement/);
assert.throws(() => K(p, 'capture', {...draft, conditions: ''}), /where this knowledge applies/);
p = K(p, 'capture', {...draft, statement: advice.refinements[0].value});
p = adopt(p, r2, 'K:' + sa.id, 'applied');
let s = knowledgeState(p);
const src = s.sources.at(-1), claim = s.claims.at(-1);
assert.equal(src.origin, 'architect-dismissal'); assert.equal(src.body, dismissalSourceBody(sa, draft.subject)); assert.equal(claim.excerpt, 'The architect disagreed: The channel gateway already enforces a 2-second budget on this call.');
assert.equal(claim.review, undefined, 'captured, not yet reviewed');
assert.throws(() => K(p, 'capture', draft), /already handled/);
q = stewardQueue(p);
assert.equal(q.open.length, 0); assert.equal(q.inProgress[0].trail.stage, 'captured');
assert.deepEqual(reasoningCurrency(p, {...r1, packet: r1.packet}).get('M:8:rest'), true, 'capturing changes no design record');
pass('captured: the disagreement becomes an original source — the project\'s own record of it, the architect\'s words on line 4 — and a candidate claim with where it applies and its limits; nothing is reviewed or active yet, and a disagreement is handled once');

// 4. Review, release, activation and a link: the trail, and then Sol reads it with the record.
p = K(p, 'review', {id: claim.id, decision: 'verified', sourceChecked: true, rightsChecked: true, conditionsChecked: true, ...review});
assert.equal(stewardQueue(p).inProgress[0].trail.stage, 'verified');
p = K(p, 'release', {title: 'Learned from Sol’s advice · IF-001', claimIds: [claim.id], ...review});
const rel = knowledgeState(p).releases.at(-1);
assert.equal(stewardQueue(p).inProgress[0].trail.stage, 'released');
assert.ok(!reasoningPacket(p, {task: 'decisions', ids: ['M:8:rest']}).sources.some(s => /learned by the project/.test(s.title)), 'released but not active: not read');
p = K(p, 'activate', {id: rel.id, stamp: knowledgeStamp(p), ...review});
assert.equal(stewardQueue(p).inProgress[0].trail.stage, 'active');
p = K(p, 'link', {claimId: claim.id, releaseId: rel.id, objectId: 'rest', ...review});
q = stewardQueue(p);
assert.equal(q.handled[0].trail.stage, 'linked'); assert.equal(q.count, 0);
assert.equal(learnedFor(p, ['rest']).length, 1); assert.equal(learnedFor(p, ['run-002']).length, 0);
const again = reasoningPacket(p, {task: 'decisions', ids: ['M:8:rest']});
const learned = again.sources.find(x => /learned by the project/.test(x.title));
assert.ok(learned && learned.kind === 'governed-claim' && learned.receipt.claimId === claim.id);
assert.match(learned.excerpt, /Within this project: The channel gateway/);
const r3 = reason(p, ['M:8:rest']);
assert.equal(r3.result.assessments[0].verdict, 'apply'); assert.ok(r3.result.assessments[0].sourceRefs.includes(learned.ref));
for (const other of ['F:latency:QD-003', 'M:10:run-005', 'M:4:ledger']) assert.ok(reasoningPacket(p, {task: 'decisions', ids: [other]}).sources.every(x => x.receipt?.claimId !== claim.id), other + ': knowledge captured from a disagreement is read with the record it is linked to, not wherever its words match');
pass('the governed path, followed on the queue: reviewed, released, activated, linked to IF-001 — only then does Sol read it, with that record, as knowledge the project learned; asked again, Sol does not repeat the advice the project ruled out');

// 5. The stewards may also decide the knowledge and design stand, or withdraw what the advice rested on.
const r4 = reason(p, ['M:10:run-001']);
p = adopt(p, r4, 'M:10:run-001', 'dismissed', 'Replica counts wait for the platform team’s load test.');
const sa2 = p.coauthoring.assessments.at(-1);
assert.throws(() => K(p, 'steward', {key: 'dismissal:' + sa2.id, decision: 'holds'}), /Review the exact change/);
assert.throws(() => K(p, 'steward', {key: 'dismissal:' + sa2.id, decision: 'ignore', ...review}), /what the project learns/);
p = K(p, 'steward', {key: 'dismissal:' + sa2.id, decision: 'holds', ...review});
assert.equal(stewardQueue(p).handled.find(i => i.sa.id === sa2.id).disposition.decision, 'holds');
const r5 = reason(p, ['M:10:run-003']);
p = adopt(p, r5, 'M:10:run-003', 'used');
const sa3 = p.coauthoring.assessments.at(-1);
const mech = knowledgeRestedOn(p, sa3).find(k => k.kind === 'product-mechanism');
assert.ok(mech && mech.target === PRODUCT_PACK.id && mech.source, 'the mechanism it rested on, with its current text');
p = K(p, 'withdraw', {id: PRODUCT_PACK.id, stamp: knowledgeImpactStamp(p, PRODUCT_PACK.id), ...review});
q = stewardQueue(p);
const impact = q.open.find(i => i.kind === 'withdrawn' && i.sa.id === sa3.id);
assert.ok(impact, 'advice acted on, whose knowledge is now withdrawn, comes back to the stewards');
assert.ok(knowledgeRestedOn(p, sa3).filter(k => k.withdrawn).every(k => !k.source), 'withdrawn knowledge is never sent to Sol again');
const kp2 = reasoningPacket(p, {task: 'decisions', ids: [impact.solId]});
assert.equal(kp2.items[0].kind, 'stewardship-impact'); assert.match(kp2.sources[0].excerpt, /withdrawn/);
assert.ok(!kp2.sources.some(x => x.kind === 'product-mechanism'));
assert.equal(settleReasoning(kp2, guardReasoning(kp2, validateReasoningOutput(mockAssessment(kp2), kp2))).assessments[0].verdict, 'apply');
p = K(p, 'steward', {key: impact.key, decision: 'revisit', ...review});
assert.equal(stewardQueue(p).handled.find(i => i.key === impact.key).disposition.decision, 'revisit');
pass('the stewards may record that the knowledge and design stand, or send a record back for a revisit; advice acted on whose knowledge is later withdrawn returns to the queue, and Sol weighs whether the change still holds without being sent the withdrawn text');

// 6. A withdrawal made from the queue handles its item; stamps follow the stewards' decisions.
const r6 = reason(base, ['M:9:thr-001']);
let w = adopt(base, r6, 'M:9:thr-001', 'dismissed', 'The playbook tactic does not fit our identity provider.');
const sa4 = w.coauthoring.assessments.at(-1), key4 = 'dismissal:' + sa4.id;
const st0 = stewardshipStamp(w, 'K:' + sa4.id);
w = K(w, 'withdraw', {id: 'SA-PLAYBOOK', stamp: knowledgeImpactStamp(w, 'SA-PLAYBOOK'), stewardKey: key4, ...review});
assert.equal(stewardQueue(w).handled.find(i => i.key === key4).disposition.decision, 'withdrawn');
assert.notEqual(stewardshipStamp(w, 'K:' + sa4.id), st0, 'the stewards\' decision changes the reading');
pass('a withdrawal made from the queue handles its item, and the stewards\' decisions change what Sol read, so earlier stewardship advice becomes history');

// 7. Through the server: capture, steward and Sol's stewardship advice as ordinary commands and requests.
const files = new Map(), owner = 'steward-test', id = base.id;
const env = {DB: localDatabase(':memory:'), OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'test-model', FILES: {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k)} : null; }, async delete(k) { files.delete(k); }}, ASSETS: {fetch: () => new Response('asset')}};
await env.DB.prepare('INSERT INTO projects (owner_id,id,document,revision,updated_at) VALUES (?,?,?,1,?)').bind(owner, id, JSON.stringify(base), new Date().toISOString()).run();
const req = async (path, body) => { const r = await worker.fetch(new Request('https://aiw.test' + path + (path.includes('?') ? '&' : '?') + 'project=' + id, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': owner, Origin: 'https://aiw.test', 'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined}), env); return {status: r.status, data: await r.json()}; };
const previous = globalThis.fetch;
globalThis.fetch = async (url, options) => { const body = JSON.parse(options.body), input = JSON.parse(body.input[0].content); return new Response(JSON.stringify(envelope(body.text.format.name === 'aiw_desk_assessment' ? mockAssessment(input) : mockReview(input)))); };
try {
  const send = async raw => { const prepared = await req('/api/intelligence/reasoning-context', raw); assert.equal(prepared.status, 200, JSON.stringify(prepared.data)); const requestId = crypto.randomUUID(); const r = await req('/api/intelligence/reason', {...raw, packetStamp: prepared.data.packet.stamp, requestId}); assert.equal(r.status, 200, JSON.stringify(r.data)); return requestId; };
  const cmd = (revision, command) => req('/api/commands', {revision, command});
  const run1 = await send({task: 'decisions', ids: ['M:8:rest']});
  let res = await cmd(1, {type: 'intelligence.adopt', payload: {runId: run1, kind: 'assessment', itemId: 'M:8:rest', outcome: 'dismissed', reason: 'The channel gateway already enforces a 2-second budget on this call.'}});
  assert.equal(res.status, 200, JSON.stringify(res.data));
  const said = res.data.document.coauthoring.assessments.at(-1);
  const run2 = await send({task: 'decisions', ids: ['K:' + said.id]});
  res = await cmd(res.data.revision, {type: 'intelligence.adopt', payload: {runId: run2, kind: 'assessment', itemId: 'K:' + said.id, outcome: 'used'}});
  assert.equal(res.status, 200, JSON.stringify(res.data));
  res = await cmd(res.data.revision, {type: 'knowledge.capture', payload: captureDraft(res.data.document, said)});
  assert.equal(res.status, 200, JSON.stringify(res.data));
  assert.equal(knowledgeState(res.data.document).stewardship[0].decision, 'captured');
  assert.equal(stewardQueue(res.data.document).inProgress.length, 1);
  pass('through the server: the disagreement, Sol\'s stewardship advice, its use and the capture are ordinary requests and commands, recorded with the project');
} finally { globalThis.fetch = previous; }

assert.equal(JSON.stringify(base), before);
pass('the stewards\' queue, its readings and Sol\'s advice change nothing until a steward records a decision');
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
