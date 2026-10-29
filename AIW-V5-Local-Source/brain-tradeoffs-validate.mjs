// AIW's trade-off catalogue and reference latency figures (round 6, Contract K; audit/round6/DESIGN.md): the pack is
// AIW-authored, attributed, hashed and retrieved like the Playbook's passages, and it never scores. The suite asserts:
//   the pack: fifteen trade-off passages (TO-001 …) of 120–220 words, each naming both sides, the forces, when each wins,
//     what AIW records (a chapter and a record kind) and the questions to ask; eleven reference latency figures (LN-001 …)
//     in nanoseconds, in ascending order, marked as reference figures for estimation; every passage and figure carries
//     the SHA-256 of its text, which recomputes, and an attribution with a title, a URL and a licence; the module holds
//     exactly what knowledge/brain-tradeoffs.json holds (hash parity: the generator cannot drift from its source); the
//     authority line says AIW-authored, not calibrated, never scoring;
//   retrieval: architectureBrain returns a trade-off passage for a question that names one ("consistency under partition"
//     → TO-013), with a brain-method source whose receipt names the pack, the passage and its hash and carries
//     scoring:false; an unrelated question and no question retrieve none; the Playbook passages still come;
//   currency and withdrawal: brainSourceCurrent holds for a current receipt and fails for a changed hash or another pack
//     hash; knowledge.withdraw knows the pack by its id, after which no trade-off is retrieved or current, the Playbook
//     still is, and the stewards' queue reads a trade-off source by its own pack id;
//   never scoring: the brain receipt says scoring:false and the decision tally (the only numeric weighing) does not
//     change when the pack is withdrawn; the semantic corpus carries the pack through the same source shape;
//   the bundle: the pack minifies under the bound the client bundle counts it against (client-bundle.mjs BUDGET.data).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BRAIN_TRADEOFFS} from './shared/brain-tradeoffs.js';
import {BRAIN_TRADEOFFS as PUBLIC_PACK} from './public/brain-tradeoffs.js';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {brainContext} from './public/aiw-brain.js';
import {architectureBrain, brainSources, brainSourceCurrent, tradeoffsFor, tradeoffRelevance, methodSources, tradeoffSource, brainTokens} from './public/architecture-brain.js';
import {applyKnowledgeCommand, knowledgeImpactStamp, withdrawn, methodKnowledgeCurrent, BRAIN_PLAYBOOK} from './public/knowledge-governance.js';
import {knowledgeRestedOn} from './public/knowledge-stewardship.js';
import {readDecision} from './public/decision-reading.js';
import {BUDGET} from './client-bundle.mjs';

const checks = [], pass = n => { checks.push(n); console.log('PASS', n); };
const sha256 = t => createHash('sha256').update(t, 'utf8').digest('hex');
const words = t => (String(t).match(/\S+/g) || []).length;
const at = '2026-10-02T09:00:00.000Z', review = {reviewed: true, reviewer: 'Synthetic reviewer', reason: 'Synthetic withdrawal in a test; not a knowledge decision.'};

// ---------------------------------------------------------------- 1. the pack
{
  assert.equal(BRAIN_TRADEOFFS, PUBLIC_PACK, 'shared/ re-exports the one pack in public/');
  assert.equal(BRAIN_TRADEOFFS.id, 'AIW-TRADEOFFS-1'); assert.equal(BRAIN_TRADEOFFS.authored, 'AIW');
  assert.match(BRAIN_TRADEOFFS.authority, /AIW-authored/); assert.match(BRAIN_TRADEOFFS.authority, /not calibrated/); assert.match(BRAIN_TRADEOFFS.authority, /never affects scoring/); assert.match(BRAIN_TRADEOFFS.authority, /approver/);
  assert.equal(BRAIN_TRADEOFFS.passages.length, 15);
  assert.deepEqual(BRAIN_TRADEOFFS.passages.map(x => x.id), Array.from({length: 15}, (_, i) => 'TO-' + String(i + 1).padStart(3, '0')));
  const TITLES = ['Vertical against horizontal scaling', 'SQL against NoSQL', 'Batch against stream', 'Push against pull', 'Strong against eventual consistency', 'Stateful against stateless', 'Synchronous against asynchronous', 'REST against GraphQL against gRPC', 'Long polling against WebSockets against server-sent events', 'Read-through against write-through against write-back caching', 'Normalisation against denormalisation', 'Latency against throughput', 'Availability against consistency under partition', 'Monolith against modular monolith against microservices', 'Build against buy against SaaS'];
  assert.deepEqual(BRAIN_TRADEOFFS.passages.map(x => x.title), TITLES, 'the fifteen trade-offs Contract K names');
  for (const x of BRAIN_TRADEOFFS.passages) {
    const n = words(x.text);
    assert.ok(n >= 120 && n <= 220, `${x.id} is ${n} words`);
    assert.equal(x.sha256, sha256(x.text), `${x.id}: the hash is the text's`);
    assert.match(x.text, /The forces:/, `${x.id} names the forces`);
    assert.match(x.text, /\bwins?\b/, `${x.id} says when each side wins`);
    assert.match(x.text, /AIW records/, `${x.id} says what AIW records`);
    assert.match(x.text, /Chapter \d+/, `${x.id} says where`);
    assert.ok((x.text.match(/\?/g) || []).length >= 2, `${x.id} asks two or three questions`);
    assert.ok(x.chapters.length >= 2 && x.chapters.every(c => c >= 1 && c <= 11) && x.records.length >= 1, `${x.id} names chapters and record kinds`);
    assert.ok(Array.isArray(x.cues) && x.cues.length >= 4, `${x.id} carries cue words for retrieval`);
    assert.ok(x.attribution.length >= 1 && x.attribution.every(a => a.title && /^https:\/\/github\.com\//.test(a.url) && a.licence), `${x.id} attributes the sources it follows, each with a title, a URL and a licence`);
    assert.ok(x.attribution.some(a => /CC BY 4\.0 \(verified/.test(a.licence)), `${x.id} follows at least one source whose CC BY 4.0 licence was verified`);
  }
  assert.equal(BRAIN_TRADEOFFS.figures.length, 11);
  assert.deepEqual(BRAIN_TRADEOFFS.figures.map(x => x.id), Array.from({length: 11}, (_, i) => 'LN-' + String(i + 1).padStart(3, '0')));
  for (const f of BRAIN_TRADEOFFS.figures) { assert.equal(f.unit, 'ns'); assert.ok(Number.isFinite(f.value) && f.value > 0); assert.equal(f.sha256, sha256(f.text)); assert.ok(f.text.length > 40 && f.attribution.length >= 1, `${f.id} reads in one sentence with its attribution`); }
  assert.ok(BRAIN_TRADEOFFS.figures.every((f, i, xs) => i === 0 || f.value >= xs[i - 1].value), 'the figures ascend from the L1 cache to a round trip across the world');
  assert.match(BRAIN_TRADEOFFS.figuresNote, /not measurements/);
  const titles = BRAIN_TRADEOFFS.figures.map(f => f.title.toLowerCase());
  for (const want of ['l1 cache', 'main memory', 'ssd', 'inside one data centre', 'across a region', 'across the world', 'disk seek', '1 mb sequentially from memory', '1 mb sequentially from an ssd', '1 mb sequentially from disk', 'compress 1 kb']) assert.ok(titles.some(t => t.includes(want)), `a figure for ${want}`);
  assert.equal(BRAIN_TRADEOFFS.sha256, sha256([...BRAIN_TRADEOFFS.passages, ...BRAIN_TRADEOFFS.figures].map(x => x.id + ':' + x.sha256).join('\n')), 'the pack hash is the hash of its passages\' and figures\' hashes');
  // Hash parity with the source JSON the generator reads.
  const src = JSON.parse(readFileSync('knowledge/brain-tradeoffs.json', 'utf8'));
  assert.deepEqual(src.passages.map(x => [x.id, sha256(x.text.trim())]), BRAIN_TRADEOFFS.passages.map(x => [x.id, x.sha256]), 'the module holds the JSON\'s passages, hash for hash (node scripts/build-brain-tradeoffs.mjs)');
  assert.deepEqual(src.figures.map(x => [x.id, x.value, sha256(x.text.trim())]), BRAIN_TRADEOFFS.figures.map(x => [x.id, x.value, x.sha256]));
  assert.deepEqual(BRAIN_TRADEOFFS.passages.map(x => x.attribution.map(a => a.url)), src.passages.map(x => x.attribution.map(k => src.sources[k].url)), 'each attribution is the source the JSON names');
  for (const s of Object.values(src.sources)) assert.ok(/verified from the repository|AIW-authored|not verified from here/.test(s.licence), `${s.title}: the licence says whether it was verified`);
  const text = readFileSync('public/brain-tradeoffs.js', 'utf8');
  assert.match(text, /^\/\/ AIW's trade-off catalogue/); assert.doesNotMatch(text, /\bimport\b/, 'the pack is data: it imports nothing');
  pass('the pack: fifteen AIW-authored trade-off passages of 120–220 words, each with both sides, the forces, when each wins, what AIW records and where, and its questions; eleven reference latency figures in nanoseconds, ascending, marked for estimation; every text hashed, attributed with a title, a URL and a verified licence; hash parity with knowledge/brain-tradeoffs.json; the authority line says AIW-authored, not calibrated, never scoring');
}

// ---------------------------------------------------------------- 2. retrieval
const bank = withFinalReview(seedProject()), before = JSON.stringify(bank);
const c = brainContext(bank, {chapter: 3, id: 'ADR-001'});
{
  const b = architectureBrain(bank, c, {query: 'consistency under partition'});
  assert.equal(b.tradeoffs[0].tradeoff.id, 'TO-013', 'the question names the passage');
  assert.deepEqual(b.methods, [], 'a consistency question does not bring an unrelated Playbook passage from the decision context');
  const sources = brainSources(bank, b), to = sources.filter(s => s.receipt?.packId === BRAIN_TRADEOFFS.id);
  assert.ok(to.length >= 1 && to.length <= 2);
  assert.equal(to[0].kind, 'brain-method'); assert.equal(to[0].objectId, 'TO-013'); assert.equal(to[0].id, 'tradeoff:TO-013');
  assert.deepEqual([to[0].receipt.kind, to[0].receipt.packId, to[0].receipt.packHash, to[0].receipt.passageId, to[0].receipt.excerptHash, to[0].receipt.scoring], ['brain-method', 'AIW-TRADEOFFS-1', BRAIN_TRADEOFFS.sha256, 'TO-013', BRAIN_TRADEOFFS.passages[12].sha256, false], 'the receipt names the pack, its hash, the passage and its hash, and says scoring:false');
  assert.equal(to[0].excerpt, BRAIN_TRADEOFFS.passages[12].text); assert.equal(to[0].posture, BRAIN_TRADEOFFS.authority);
  assert.ok(to[0].receipt.attribution.every(a => a.title && a.url && a.licence), 'the receipt carries the attribution');
  assert.equal(b.receipt.scoring, false); assert.equal(b.receipt.tradeoffsHash, BRAIN_TRADEOFFS.sha256); assert.deepEqual(b.receipt.tradeoffIds, b.tradeoffs.map(h => h.tradeoff.id));
  assert(!sources.some(s => s.id.startsWith('playbook:')), 'the cited trade-off remains useful without unrelated Playbook passages');
  // Ten questions, each answered by the passage it names first.
  const QUERIES = [['sql or nosql for the case record', 'TO-002'], ['batch or stream for notifications', 'TO-003'], ['strong or eventual consistency', 'TO-005'], ['stateless or stateful service', 'TO-006'], ['synchronous or asynchronous hand-over', 'TO-007'], ['rest, graphql or grpc for the api', 'TO-008'], ['websockets or server-sent events for live updates', 'TO-009'], ['read-through, write-through or write-back caching', 'TO-010'], ['monolith, modular monolith or microservices', 'TO-014'], ['scale up or scale out', 'TO-001']];
  const hits = QUERIES.filter(([q, id]) => architectureBrain(bank, c, {query: q}).tradeoffs[0]?.tradeoff.id === id);
  assert.equal(hits.length, QUERIES.length, 'ten of ten questions retrieve the passage they name first');
  // An unrelated question, and no question, retrieve none; a question still orders by the record's context.
  assert.deepEqual(architectureBrain(bank, c, {query: 'Explain the payment acknowledgement'}).tradeoffs, []);
  assert.deepEqual(architectureBrain(bank, c, {}).tradeoffs, [], 'no question, no trade-off: the context orders but never retrieves');
  const r = tradeoffRelevance(BRAIN_TRADEOFFS.passages[12], {explicit: new Set(brainTokens('consistency under partition')), terms: new Set(brainTokens('consistency under partition replicas'))});
  assert.ok(r.kept && r.titleHits === 3 && r.relevance > r.titleHits * 3, 'relevance: title hits weigh three, asked words two, context one');
  assert.equal(tradeoffsFor(bank, {explicit: new Set(['against']), terms: new Set()}).length, 0, '"against", in every title, names none');
  assert.equal(JSON.stringify(bank), before, 'retrieval changes nothing');
  pass('retrieval: "consistency under partition" brings TO-013 as a brain-method source with its pack, passage and hash receipt and scoring:false; unrelated Playbook passages stay out; ten of ten trade-off questions bring the passage they name first; an unrelated question or none brings none; nothing changes');
}

// ---------------------------------------------------------------- 3. currency, withdrawal, stewardship, never scoring
{
  const m = BRAIN_TRADEOFFS.passages[4], s = tradeoffSource(m);
  assert.equal(brainSourceCurrent(bank, s), true);
  assert.equal(brainSourceCurrent(bank, {...s, receipt: {...s.receipt, excerptHash: '0'.repeat(64)}}), false, 'a changed passage hash is not current');
  assert.equal(brainSourceCurrent(bank, {...s, receipt: {...s.receipt, packHash: 'other'}}), false, 'another pack hash is not current');
  assert.equal(brainSourceCurrent(bank, {...s, receipt: {...s.receipt, passageId: 'TO-999'}}), false);
  assert.ok(methodSources(bank).some(x => x.receipt.packId === BRAIN_TRADEOFFS.id) && methodSources(bank).some(x => x.receipt.packId === BRAIN_PLAYBOOK.id), 'the one method-source shape carries both packs (the semantic corpus reads it)');
  assert.ok(methodKnowledgeCurrent(bank, s.receipt));
  // The decision reading with the project's own priorities (round 25: the earlier check passed the drivers where a
  // priority map belongs, so every weight read 1).
  const fingerprint = (p, d) => { const r = readDecision(p, d); return {lead: r.lead, tied: r.tied, order: r.order, scores: r.rows.map(x => [x.id, x.score, x.low, x.high]), firmness: r.firmness, dominated: [...r.dominated], ruledOut: r.ruledOut, sensitivity: r.sensitivity, weights: r.drivers.map(x => [x.id, x.weight])}; };
  const tally = fingerprint(bank, bank.decisions.records[0]);
  assert.ok(tally.weights.some(([, w]) => w > 1), 'the reading weighs the drivers by their own priorities');
  assert.throws(() => applyKnowledgeCommand(bank, {type: 'knowledge.withdraw', payload: {...review, id: 'AIW-TRADEOFFS-9', stamp: knowledgeImpactStamp(bank, 'AIW-TRADEOFFS-9')}}, at), /recorded source, claim, release or method/, 'an unknown pack cannot be withdrawn');
  const gone = applyKnowledgeCommand(bank, {type: 'knowledge.withdraw', payload: {...review, id: BRAIN_TRADEOFFS.id, stamp: knowledgeImpactStamp(bank, BRAIN_TRADEOFFS.id)}}, at).document;
  assert.equal(withdrawn(gone, [BRAIN_TRADEOFFS.id]).length, 1, 'knowledge.withdraw knows the pack');
  assert.deepEqual(architectureBrain(gone, brainContext(gone, {chapter: 3, id: 'ADR-001'}), {query: 'consistency under partition'}).tradeoffs, [], 'withdrawn, no trade-off is retrieved');
  assert.equal(brainSourceCurrent(gone, s), false, 'and none is current');
  assert.equal(methodKnowledgeCurrent(gone, s.receipt), false);
  assert.equal(architectureBrain(gone, brainContext(gone, {chapter: 3, id: 'ADR-001'}), {query: 'Assess the Facade pattern for a complex subsystem'}).methods[0]?.method.id, 'PB-104', 'the Playbook is untouched by the trade-off pack\'s withdrawal');
  assert.ok(!methodSources(gone).some(x => x.receipt.packId === BRAIN_TRADEOFFS.id) && methodSources(gone).some(x => x.receipt.packId === BRAIN_PLAYBOOK.id));
  assert.deepEqual(fingerprint(gone, gone.decisions.records[0]), tally, 'the decision reading does not move: knowledge never scores');
  // The stewards' queue: advice that rested on a trade-off passage is withdrawn by the pack's own id, not the Playbook's.
  const sa = {sources: [{ref: 'S3', kind: 'brain-method', title: s.title, receipt: s.receipt}, {ref: 'S4', kind: 'brain-method', title: 'PB-001', receipt: {kind: 'brain-method', packId: BRAIN_PLAYBOOK.id, passageId: 'PB-001', excerptHash: BRAIN_PLAYBOOK.passages[0].sha256}}]};
  const rested = knowledgeRestedOn(bank, sa);
  assert.deepEqual(rested.map(x => [x.target, x.withdrawn]), [[BRAIN_TRADEOFFS.id, false], ['SA-PLAYBOOK', false]]);
  assert.equal(rested[0].source.excerpt, m.text, 'while not withdrawn, Sol can read the passage again');
  assert.deepEqual(knowledgeRestedOn(gone, sa).map(x => [x.target, x.withdrawn, x.source]), [[BRAIN_TRADEOFFS.id, true, null], ['SA-PLAYBOOK', false, null]]);
  assert.equal(JSON.stringify(bank), before);
  pass('currency and withdrawal: a receipt is current while the pack, the passage and its hash are; a changed hash or another pack is not; knowledge.withdraw knows AIW-TRADEOFFS-1, after which no trade-off is retrieved or current while the Playbook still is; the stewards\' queue withdraws by the pack\'s own id; the decision tally does not move: never scoring');
}

// ---------------------------------------------------------------- 4. the bundle counts the pack as data
// client-bundle.mjs counts each shipped pack per module against BUDGET.data, so the pack's growth is a decision someone
// makes. Its entry is the lead's line in a file this workstream does not own, so the suite measures the pack as esbuild
// minifies it, holds it under the bound the report names (43 KB: the measured 41,404 B on 2026-10-02 plus about 5 %,
// rounded up to whole KB), and checks the entry against that measurement once it is there.
const BOUND = 43 * 1024;
{
  const {transform} = await import('esbuild');
  const minified = (await transform(readFileSync('public/brain-tradeoffs.js', 'utf8'), {loader: 'js', minify: true, format: 'esm'})).code.length;
  assert.ok(minified > 30 * 1024 && minified <= BOUND, `the pack minifies to ${minified} B, under the ${BOUND} B bound the bundle counts it against`);
  const entry = Object.hasOwn(BUDGET.data, 'brain-tradeoffs') ? BUDGET.data['brain-tradeoffs'] : null;
  if (entry != null) assert.ok(entry >= minified && entry <= minified * 1.25, `BUDGET.data['brain-tradeoffs'] (${entry} B) is within 25 % above the measured ${minified} B`);
  pass(`the bundle counts the pack as data: ${minified} B minified, under its ${BOUND / 1024} KB bound` + (entry != null ? `; client-bundle.mjs holds the entry (${entry} B)` : `; client-bundle.mjs BUDGET.data still needs 'brain-tradeoffs': 43 * KB (the lead's line)`));
}
console.log(JSON.stringify({passed: checks.length, checks, measured: {passages: BRAIN_TRADEOFFS.passages.length, figures: BRAIN_TRADEOFFS.figures.length, bytes: readFileSync('public/brain-tradeoffs.js').length, words: BRAIN_TRADEOFFS.passages.map(x => words(x.text))}, limits: ['AIW-authored teaching knowledge: not calibrated, not expert-reviewed, pending the owner\'s approver; the licences are as read from each repository\'s LICENSE file on 2026-10-02 and are not clearance.']}, null, 2));
