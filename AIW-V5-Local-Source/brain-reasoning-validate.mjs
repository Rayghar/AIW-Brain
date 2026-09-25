// The AIW Brain at a decision: Sol assesses the review desk's decisions from a packet of instrument
// readings and governed knowledge; guards and a second pass check every assessment; outcomes are
// recorded; governed knowledge reaches the models. Run: npm run test:brain-reasoning
import assert from 'node:assert/strict';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyKnowledgeCommand, knowledgeImpact, knowledgeImpactStamp} from './public/knowledge-governance.js';
import {deskModel} from './public/desk-model.js';
import {fixDrafts, compose} from './public/desk-fixes.js';
import {choiceForDesign} from './public/product-choice.js';
import {PRODUCT_PACK, packWithdrawn, traitReceipt, modelReceiptCurrent} from './public/model-knowledge.js';
import {TRAITS} from './public/product-knowledge.js';
import {reasoningRequest, reasoningPacket, reasoningSchema, validateReasoningOutput, guardReasoning, settleReasoning, reasoningCurrency, decisionPoints, adoptReasoning, MAX_DECISIONS} from './public/brain-reasoning.js';
import {requestReasoning, llmEndpoint} from './intelligence-provider.js';
import {mockAssessment, mockReview, envelope} from './mock-llm-provider.mjs';

const checks = [], pass = n => checks.push(n);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const IDS = ['F:capacity:run-001', 'F:latency:QD-003', 'F:capacity:run-008', 'J:security:run-002', 'F:switch:tr-003', 'D:ADR-001'];
const packet = reasoningPacket(project, {task: 'decisions', ids: IDS, scope: 'test'});

// 1. The request and the packet: the instruments' readings first, then what is known about them.
assert.throws(() => reasoningRequest({task: 'decisions', ids: []}), /1 to 8/);
assert.throws(() => reasoningRequest({task: 'decisions', ids: Array.from({length: MAX_DECISIONS + 1}, (_, i) => 'F:x' + i)}), /1 to 8/);
assert.throws(() => reasoningRequest({task: 'decisions', ids: ['<script>']}), /review desk/);
assert.throws(() => reasoningPacket(project, {task: 'decisions', ids: ['F:capacity:nowhere']}), /no longer holds/);
assert.deepEqual(packet.items.map(i => [i.id, i.kind, i.ref]), [['F:capacity:run-001', 'fix', 'S1'], ['F:latency:QD-003', 'fix', 'S2'], ['F:capacity:run-008', 'fix', 'S3'], ['J:security:run-002', 'judgement', 'S4'], ['F:switch:tr-003', 'switch', 'S5'], ['D:ADR-001', 'decision', 'S6']]);
const kinds = new Set(packet.sources.map(s => s.kind));
for (const k of ['instrument-reading', 'planning-assumptions', 'product-mechanism', 'model', 'playbook-entry']) assert.ok(kinds.has(k), k + ' is in the packet');
assert.ok(packet.sources.length <= 22 && packet.coverage.characters <= 28000);
const S1 = JSON.parse(packet.sources[0].excerpt);
assert.deepEqual(S1.knobs.map(k => [k.key, k.value, k.min, k.max]), [['maxReplicas', 24, 1, 10000], ['scalingPolicy', 'Horizontal Pod Autoscaler on CPU at {utilisation} %, from {min} to {max} replicas.', undefined, undefined]]);
assert.equal(S1.reading[0].recorded, 'needs 24 replicas'); assert.match(S1.draft.changes[0], /Maximum replicas: 1 → 24/);
const mech = packet.sources.find(s => s.kind === 'product-mechanism');
assert.equal(mech.receipt.packId, PRODUCT_PACK.id); assert.match(mech.receipt.locator, /^https:\/\//); assert.equal(mech.receipt.excerptHash.length, 64);
assert.deepEqual(packet.items.find(i => i.kind === 'judgement').allowed.proposals.targets, ['risk-engine', 'if-004', 'if-005', 'risk-record']);
assert.deepEqual(packet.items.find(i => i.kind === 'decision').allowed.preferred, ['ALT-001', 'ALT-002']);
assert.equal(reasoningPacket(project, {task: 'decisions', ids: IDS, scope: 'test'}).stamp, packet.stamp, 'the same design and request give the same packet');
assert.notEqual(reasoningPacket(project, {task: 'decisions', ids: IDS, scope: 'test', values: {'capacity:run-001': {maxReplicas: 30}}}).stamp, packet.stamp, 'the architect\'s numbers are part of what Sol reads');
assert.equal(JSON.stringify(project), before);
pass(`the packet: ${packet.items.length} decisions, each as the instruments read it — its reading, draft, knobs with their bounds and simulated effect — then the objective and assumptions, the documented product mechanisms with receipts, the quality drivers and the SA Playbook's tactics; ${packet.sources.length} sources within the 22-source, 28,000-character bound`);

// 2. The contract: what Sol may say, and what it may not.
const good = mockAssessment(packet);
const result = guardReasoning(packet, validateReasoningOutput(good, packet));
assert.ok(result.assessments.every(a => !a.problems.length), JSON.stringify(result.assessments.map(a => a.problems)));
assert.throws(() => validateReasoningOutput({...good, assessments: [{...good.assessments[0], id: 'F:elsewhere'}]}, packet), /outside the packet/);
assert.throws(() => validateReasoningOutput({...good, sourceRefs: ['S99']}, packet), /outside the reviewed packet/);
assert.throws(() => validateReasoningOutput({...good, extra: 1}, packet), /unsupported response/);
const bad = structuredClone(good);
bad.assessments[0].refinements = [{key: 'maxReplicas', value: '20000', why: 'More.'}];
bad.assessments[1].verdict = 'judge';
bad.assessments[2].reasoning = 'Holding 3,000,000 messages guarantees zero loss.';
bad.assessments[3].proposals = [{title: 'x', category: 'Data disclosure', priority: 'High', targetIds: ['not-a-target'], scenario: 's', consequence: 'c'}];
bad.assessments[5].preferred = 'ALT-999';
const flagged = guardReasoning(packet, validateReasoningOutput(bad, packet)).assessments;
assert.match(flagged[0].problems.join(' '), /outside 1–10000/); assert.match(flagged[0].problems.join(' '), /refine the draft but proposes no change/);
assert.match(flagged[1].problems.join(' '), /not a verdict/);
assert.match(flagged[2].problems.join(' '), /3000000, which no reading/); assert.match(flagged[2].problems.join(' '), /guaranteeing a verified outcome/);
assert.match(flagged[3].problems.join(' '), /no listed target/);
assert.match(flagged[5].problems.join(' '), /does not have/);
pass('the contract: only the packet\'s decisions and sources; verdicts that fit each kind; refinements only on the draft\'s own knobs and within their bounds; threats only on listed targets; no number the readings do not contain, and nothing guaranteed');

// 3. Settling: what fails a check is withheld and the reading stands.
const settled = settleReasoning(packet, result, mockReview({candidate: result}, {reject: ['F:capacity:run-008']}));
assert.equal(settled.assessments.length, packet.items.length);
const q = settled.assessments.find(a => a.id === 'F:capacity:run-008');
assert.equal(q.withheld, true); assert.equal(q.verdict, 'insufficient'); assert.match(q.reasoning, /overstates/);
const partial = settleReasoning(packet, {...result, assessments: result.assessments.slice(0, 2)}, null);
assert.equal(partial.assessments.filter(a => a.withheld).length, 4, 'decisions Sol did not reach are withheld, not invented');
pass('settling: an assessment the second pass does not support, or one Sol did not reach, is withheld — its reading stands and no advice is invented');

// 4. The provider path: draft, guard, second pass, settled result — with a stand-in provider.
let calls = [];
const fetcher = async (url, options) => { const body = JSON.parse(options.body); calls.push([url, body.text.format.name, body.store]); const input = JSON.parse(body.input[0].content); return new Response(JSON.stringify(envelope(body.text.format.name === 'aiw_desk_assessment' ? mockAssessment(input) : mockReview(input)))); };
const env0 = {OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'test-model'};
const run = await requestReasoning(env0, packet, {fetcher});
assert.deepEqual(calls.map(c => c[1]), ['aiw_desk_assessment', 'aiw_desk_assessment_check']); assert.ok(calls.every(c => c[0] === 'https://api.openai.com/v1/responses' && c[2] === false));
assert.equal(run.groundingReview.accepted, true); assert.equal(run.result.assessments.length, 6);
await assert.rejects(requestReasoning({}, packet, {fetcher}), /not configured/);
assert.equal(llmEndpoint({AIW_LLM_BASE_URL: 'http://127.0.0.1:9/v1/'}, 'responses'), 'http://127.0.0.1:9/v1/responses');
assert.throws(() => llmEndpoint({AIW_LLM_BASE_URL: 'http://example.com/v1'}, 'responses'), /https, or http on loopback/);
assert.equal(llmEndpoint({AIW_LLM_BASE_URL: 'https://gateway.example/v1'}, 'responses'), 'https://gateway.example/v1/responses');
pass('the provider path: one call drafts the assessments against a strict schema, the guard and a second call check them, nothing is stored by the provider; an enterprise gateway may replace the endpoint only over https (or loopback, for tests)');

// 5. Through the server: prepare and show, then send only the packet that was shown.
const files = new Map(), owner = 'reasoning-test', id = project.id;
const env = {DB: localDatabase(':memory:'), OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'test-model', FILES: {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k)} : null; }, async delete(k) { files.delete(k); }}, ASSETS: {fetch: () => new Response('asset')}};
await env.DB.prepare('INSERT INTO projects (owner_id,id,document,revision,updated_at) VALUES (?,?,?,1,?)').bind(owner, id, JSON.stringify(project), new Date().toISOString()).run();
const req = async (path, body, {origin = 'https://aiw.test', bindings = env} = {}) => { const r = await worker.fetch(new Request('https://aiw.test' + path + (path.includes('?') ? '&' : '?') + 'project=' + id, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': owner, Origin: origin, 'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined}), bindings); return {status: r.status, data: await r.json()}; };
const previous = globalThis.fetch;
calls = [];
globalThis.fetch = async (url, options) => { const body = JSON.parse(options.body); calls.push(body.text.format.name); const input = JSON.parse(body.input[0].content); return new Response(JSON.stringify(envelope(body.text.format.name === 'aiw_desk_assessment' ? mockAssessment(input) : mockReview(input)))); };
try {
  const raw = {task: 'decisions', ids: ['F:capacity:run-001', 'J:security:run-002'], scope: 'item'};
  assert.equal((await req('/api/intelligence/reasoning-context', raw, {origin: 'https://other.test'})).status, 403);
  const prepared = await req('/api/intelligence/reasoning-context', raw);
  assert.equal(prepared.status, 200); assert.equal(prepared.data.packet.items.length, 2); assert.equal(prepared.data.configuration.configured, true); assert.equal(calls.length, 0, 'preparing sends nothing');
  const requestId = crypto.randomUUID();
  assert.equal((await req('/api/intelligence/reason', {...raw, packetStamp: 'changed', requestId})).status, 409);
  assert.equal((await req('/api/intelligence/reason', {...raw, packetStamp: prepared.data.packet.stamp, requestId}, {bindings: {...env, OPENAI_API_KEY: undefined}})).status, 503);
  const reasoned = await req('/api/intelligence/reason', {...raw, packetStamp: prepared.data.packet.stamp, requestId});
  assert.equal(reasoned.status, 200, JSON.stringify(reasoned.data)); assert.equal(reasoned.data.status, 'completed'); assert.deepEqual(calls, ['aiw_desk_assessment', 'aiw_desk_assessment_check']);
  assert.equal((await req('/api/project')).data.revision, 1, 'reasoning changes nothing in the design');
  const replay = await req('/api/intelligence/reason', {...raw, packetStamp: prepared.data.packet.stamp, requestId});
  assert.equal(replay.data.id, requestId); assert.equal(calls.length, 2, 'a replay is not billed again');
  const listed = await req('/api/intelligence/reasonings');
  assert.equal(listed.data.runs.length, 1); assert.equal(listed.data.runs[0].result.assessments.length, 2);
  // 6. Recording what the architect did with it.
  const cmd = (revision, payload) => req('/api/commands', {revision, command: {type: 'intelligence.adopt', payload: {runId: requestId, kind: 'assessment', ...payload}}});
  assert.equal((await cmd(1, {itemId: 'F:capacity:run-001', outcome: 'applied'})).status, 400, 'applied needs a use first');
  assert.equal((await cmd(1, {itemId: 'J:security:run-002', outcome: 'dismissed'})).status, 400, 'a dismissal needs a reason');
  const used = await cmd(1, {itemId: 'F:capacity:run-001', outcome: 'used'});
  assert.equal(used.status, 200, JSON.stringify(used.data));
  const rec = used.data.document.coauthoring.assessments[0];
  assert.equal(rec.id, 'SA-001'); assert.equal(rec.outcome, 'used'); assert.equal(rec.verdict, 'refine'); assert.equal(rec.model, 'mock-sol'); assert.ok(rec.sources.some(s => s.kind === 'instrument-reading'));
  const again = await cmd(used.data.revision, {itemId: 'F:capacity:run-001', outcome: 'used'});
  assert.equal(again.data.document.coauthoring.assessments.length, 1, 'recording is idempotent');
  const dismissed = await cmd(again.data.revision, {itemId: 'J:security:run-002', outcome: 'dismissed', reason: 'The risk engine is internal only.'});
  assert.equal(dismissed.status, 200); assert.equal(dismissed.data.document.coauthoring.assessments.at(-1).reason, 'The risk engine is internal only.');
  // Applying the drafted fix changes the reading: the assessment is then history, not advice.
  let doc = dismissed.data.document;
  const D = deskModel(doc), C = compose(doc, [fixDrafts(D).byId.get('capacity:run-001')], {'capacity:run-001': {maxReplicas: 26}});
  let changed = doc; for (const c of C.commands) changed = (await import('./public/canonical-command.js')).applyCanonical(changed, c, '2026-09-25T12:00:00Z').document;
  const runDoc = JSON.parse(files.get([...files.keys()].find(k => k.endsWith(requestId + '.json'))));
  assert.equal(reasoningCurrency(doc, runDoc).get('F:capacity:run-001'), true);
  assert.equal(reasoningCurrency(changed, runDoc).get('F:capacity:run-001'), false, 'the reading changed');
  const fresh = structuredClone(changed); fresh.coauthoring.assessments = [];
  assert.throws(() => adoptReasoning(fresh, {itemId: 'F:capacity:run-001', outcome: 'used'}, runDoc), /reading changed/);
  const applied = adoptReasoning(changed, {itemId: 'F:capacity:run-001', outcome: 'applied'}, runDoc, '2026-09-25T12:01:00Z');
  assert.equal(applied.document.coauthoring.assessments.at(-1).outcome, 'applied');
  pass('through the server: the packet is prepared and shown without sending anything; only the packet that was shown is sent, and only when the provider is configured; the design is unchanged and a replay is not billed again; the architect\'s use, application or dismissal (with a reason) is recorded with the model and the sources it rested on, and an applied fix leaves the advice as history');
} finally { globalThis.fetch = previous; }

// 7. Governed knowledge reaches the models and Sol.
const withdraw = p => applyKnowledgeCommand(p, {type: 'knowledge.withdraw', payload: {id: PRODUCT_PACK.id, reviewer: 'Knowledge steward', reason: 'Vendor pages under review.', reviewed: true, stamp: knowledgeImpactStamp(p, PRODUCT_PACK.id)}}, '2026-09-25T12:00:00Z').document;
const off = withdraw(project);
assert.ok(packWithdrawn(off, PRODUCT_PACK.id));
const Coff = choiceForDesign(off, 'tr-003');
assert.equal(Coff.counts.suggested, 2, 'only the operating model — the project\'s own record — still suggests'); assert.equal(Coff.ceiling, null, 'no single-unit limit from withdrawn knowledge');
assert.ok(!fixDrafts(deskModel(off)).byId.has('switch:tr-003'), 'no switch point rests on withdrawn knowledge');
assert.ok(!reasoningPacket(off, {task: 'decisions', ids: IDS.filter(i => i !== 'F:switch:tr-003')}).sources.some(s => s.kind === 'product-mechanism'), 'Sol no longer receives it');
assert.equal(modelReceiptCurrent(off, traitReceipt(TRAITS[0])), false);
const withRecord = structuredClone(project); withRecord.coauthoring.assessments = [{id: 'SA-009', title: 'Bound TR-003', sources: [{receipt: {packId: PRODUCT_PACK.id}}]}];
assert.ok(knowledgeImpact(withRecord, PRODUCT_PACK.id).some(x => x.kind === 'Sol assessment' && x.id === 'SA-009'), 'the withdrawal names the assessments that rested on it');
pass('governed knowledge reaches the models: withdrawing the product mechanisms stops the product suggestions and single-unit limits, Sol no longer receives them, their receipts go stale, and the withdrawal names the assessments that rested on them');

assert.equal(JSON.stringify(project), before);
pass('reading, reasoning and simulating change nothing in the project');
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
