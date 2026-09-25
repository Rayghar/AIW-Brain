// Chapter 3 Model checks: decisions weighed by their drivers, patterns and anti-patterns linked to
// the SA Playbook and the pattern catalogue, sensitivity points, architecture style as a decision,
// and both layouts. Run: npm run test:tradeoff
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyDecisionCommand, decisionPatterns, TOPICS} from './public/decisions-domain.js';
import {applyQualityCommand, qualityProposals} from './public/quality-domain.js';
import {STYLES} from './public/playbook-knowledge.js';
import {patternKnowledge, styleAlternative} from './public/design-reasoning.js';
import {tradeoffSource, foldMap, foldMatrix, tradeoffScope, tradeoffInsights, describeDecision, describeAlternative, tallyText, styleSuggestions, styleDecisionPreset, defaultDepth, STYLE_PROPOSAL, PROPOSED_ALT} from './public/tradeoff-model.js';
import {mapLayout, matrixLayout, DM, MX} from './public/tradeoff-layout.js';

const checks = [], pass = n => checks.push(n);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const dcmd = (p, type, payload) => applyDecisionCommand(p, {type: 'decision.' + type, payload}).document;

// 1. Decisions as their drivers weigh them.
const TM = tradeoffSource(project);
assert.deepEqual(TM.decisions.map(x => x.id + ':' + x.alts.map(a => a.id).join('+')), ['ADR-001:ALT-001+ALT-002', 'ADR-002:ALT-003+ALT-004', 'ADR-003:ALT-005+ALT-006']);
assert.deepEqual(TM.drivers.map(d => d.id), ['QD-001', 'QD-004', 'QD-005', 'QD-002', 'QD-003', 'QD-006'], 'drivers by priority, then rank');
assert.deepEqual(TM.decisions.map(x => x.favoured), ['ALT-002', 'ALT-003', 'ALT-005']);
assert.equal(tallyText(TM, TM.D.get('ADR-001'), 'ALT-002'), 'QD-002 +×2 QD-003 +×2 QD-006 −×2 = +2');
assert.equal(tallyText(TM, TM.D.get('ADR-003'), 'ALT-006'), 'QD-001 −×3 QD-004 −×3 QD-006 −×2 = -8');
assert.deepEqual([...TM.sens.keys()], ['QD-001', 'QD-003']);
assert.deepEqual(TM.sens.get('QD-003'), [{decision: 'ADR-002', to: 'Critical', before: 'ALT-003', after: null}]);
assert.match(describeDecision(TM, 'ADR-002'), /Enforce the reference at the posting boundary is favoured\. No working choice yet\./);
assert.match(describeAlternative(TM, 'ALT-006'), /creates tension with QD-001, QD-004 and QD-006\. Avoid: Blind replay/);
pass('each decision reads the drivers it weighs, each alternative its judged effect on every one of them; the drivers\' priorities weigh the alternatives in plain arithmetic (Critical 3, Important 2, Supporting 1) to show which way they lean, and a one-step priority change that tips a decision marks a sensitivity point — QD-001 and QD-003 for ADR-002');

// 2. Patterns and anti-patterns, linked only where the words say so.
const link = id => { const a = TM.A.get(id); return [a.patterns.records.map(r => r.name), a.anti.records.map(r => r.name)]; };
assert.deepEqual(link('ALT-001'), [['Request-Reply'], []]);
assert.deepEqual(link('ALT-002'), [['Message Broker'], []]);
assert.deepEqual(link('ALT-003'), [['Idempotent Consumer'], ['Missing Idempotency']]);
assert.deepEqual(link('ALT-004'), [[], []], 'nothing is linked that the words do not name');
assert.deepEqual(link('ALT-006'), [[], ['Missing Idempotency', 'Retry Storm']]);
assert.deepEqual(patternKnowledge('Standby with a Facade').playbook.map(p => p.name), ['Standby', 'Facade'], 'the playbook\'s own patterns are found by name');
pass('each alternative\'s pattern and failure boundary are linked to the pattern catalogue and the SA Playbook where its words name them — Idempotent Consumer, Missing Idempotency, Retry Storm — and nowhere else');

// 3. Architecture style as a decision.
assert.ok(TOPICS.some(t => t[0] === 'style')); assert.equal(TM.styleDecision, null);
let F = foldMap(TM);
assert.deepEqual(F.blocks.map(b => b.id), ['ADR-001', 'ADR-002', 'ADR-003', STYLE_PROPOSAL]);
let G = foldMatrix(TM);
assert.deepEqual(G.groups.at(-1).cols, STYLES.map(s => 'STY:' + s.id)); assert.equal(G.rows.length, 6);
assert.ok(tradeoffInsights(TM).some(i => /No decision records the architecture style\. The SA Playbook compares 5 styles; on this design's own drivers its table speaks only for SOA \(performance, conditional\)/.test(i.text)));
// Record it, with a maintainability driver the playbook can speak for.
let p = applyQualityCommand(project, {type: 'quality.driver', payload: {...qualityProposals(project, null, 'model').find(q => q.id === 'missing').record, category: 'maintainability', title: 'Add a scheme without touching the core', id: undefined}}).document;
p = dcmd(p, 'save', {...styleDecisionPreset(tradeoffSource(p))});
let T2 = tradeoffSource(p);
assert.equal(T2.styleDecision?.id, 'ADR-004'); assert.equal(styleSuggestions(T2).length, 5);
assert.equal(decisionPatterns(p.decisions.records.find(d => d.id === 'ADR-004'))[4].title, 'Microservices', 'Mind Factory offers the styles for a style decision');
const ms = styleSuggestions(T2).find(s => s.style.name === 'Microservices');
const md = p.quality.drivers.find(d => d.category === 'maintainability').id;
assert.equal(ms.record.assessments[md].effect, 'supports'); assert.match(ms.record.assessments[md].reason, /SA Playbook style table: strong support for maintainability/);
assert.equal(ms.record.assessments['QD-001'].effect, 'unknown'); assert.match(ms.record.assessments['QD-001'].reason, /does not cover transaction integrity/);
assert.match(ms.record.antiPattern, /Premature Microservices; Distributed Monolith/, 'the catalogue\'s declared conflicts become the failure boundary');
p = dcmd(p, 'alternative', {id: 'ADR-004', ...ms.record});
p = dcmd(p, 'alternative', {id: 'ADR-004', ...styleSuggestions(tradeoffSource(p)).find(s => s.style.name === 'Modular Monolith').record});
T2 = tradeoffSource(p);
assert.deepEqual(T2.D.get('ADR-004').alts.map(a => a.style?.name), ['Microservices', 'Modular Monolith']);
assert.equal(styleSuggestions(T2).length, 3); assert.ok(!foldMatrix(T2).groups.some(g => g.id === STYLE_PROPOSAL), 'recorded, the style decision replaces the playbook\'s table');
assert.equal(T2.D.get('ADR-004').favoured, null, 'on these drivers the playbook cannot tell the two apart');
assert.equal(JSON.stringify(project), before, 'the project is not changed');
pass('architecture style is a decision: while none is recorded the playbook\'s five styles are read against the project\'s drivers (it speaks only for SOA, conditionally, on performance); recorded, each style the architect adds arrives with the playbook\'s marks as its reasons and the catalogue\'s declared conflicts as its failure boundary');

// 4. Slicing and the proposal.
assert.deepEqual(tradeoffScope(TM, {kind: 'x', id: 'ALT-004'}), {kind: 'decision', id: 'ADR-002', focus: 'ALT-004'});
assert.deepEqual(foldMap(TM, {kind: 'driver', id: 'QD-004'}).blocks.map(b => b.id), ['ADR-003']);
assert.deepEqual(foldMap(TM, {kind: 'decision', id: 'ADR-001'}).drivers, ['QD-002', 'QD-003', 'QD-006']);
assert.equal(foldMap(TM, {kind: 'system'}, 'decisions').blocks.every(b => !b.alts.length), true);
const prop = {existingId: null, record: {title: 'Enquire before any replay', pattern: 'Idempotent receiver'}};
assert.ok(foldMap(TM, {kind: 'system'}, 'alternatives', {proposal: prop, proposalFor: 'ADR-003'}).blocks.find(b => b.id === 'ADR-003').alts.some(a => a.id === PROPOSED_ALT));
assert.equal(defaultDepth(TM), 'alternatives');
pass('the map slices to one decision or one driver\'s decisions, folds to decisions, and draws an unsaved alternative in its decision');

// 5. Layouts.
function checkMap(F, L, tag) {
  for (const a of L.cards) for (const b of L.cards) if (a !== b) assert.ok(!overlap(a, b), `${tag}: ${a.id} overlaps ${b.id}`);
  const C = new Map(L.cards.map(c => [c.id, c]));
  const segs = [];
  for (const r of L.routes) {
    assert.ok(r.pts.every((p, i) => !i || p[0] === r.pts[i - 1][0] || p[1] === r.pts[i - 1][1]), tag + ': orthogonal');
    for (let i = 1; i < r.pts.length; i++) {
      const [a, b] = [r.pts[i - 1], r.pts[i]];
      for (const c of L.cards) if (c.id !== r.from && c.id !== r.to) { const x1 = Math.min(a[0], b[0]), x2 = Math.max(a[0], b[0]), y1 = Math.min(a[1], b[1]), y2 = Math.max(a[1], b[1]); assert.ok(!(x1 < c.x + c.w && x2 > c.x && y1 < c.y + c.h && y2 > c.y), `${tag}: ${r.id} crosses ${c.id}`); }
      segs.push({r, a, b});
    }
  }
  // Routes from different drivers never share a segment.
  for (const s of segs) for (const t of segs) if (s.r.kind === 'weighs' && t.r.kind === 'weighs' && s.r.from !== t.r.from) {
    const sameV = s.a[0] === s.b[0] && t.a[0] === t.b[0] && s.a[0] === t.a[0] && Math.max(Math.min(s.a[1], s.b[1]), Math.min(t.a[1], t.b[1])) < Math.min(Math.max(s.a[1], s.b[1]), Math.max(t.a[1], t.b[1]));
    const sameH = s.a[1] === s.b[1] && t.a[1] === t.b[1] && s.a[1] === t.a[1] && Math.max(Math.min(s.a[0], s.b[0]), Math.min(t.a[0], t.b[0])) < Math.min(Math.max(s.a[0], s.b[0]), Math.max(t.a[0], t.b[0]));
    assert.ok(!sameV && !sameH, `${tag}: ${s.r.id} and ${t.r.id} share a segment`);
  }
  for (const c of L.cards.filter(c => c.decision)) { const d = C.get(c.decision); assert.ok(c.x > d.x + d.w, tag + ': alternatives stand right of their decision'); }
  assert.equal(JSON.stringify(mapLayout(F)), JSON.stringify(L), tag + ': deterministic');
}
function checkMatrix(F, L, tag) {
  for (let i = 1; i < L.cols.length; i++) assert.ok(L.cols[i].x >= L.cols[i - 1].x + L.cols[i - 1].w, tag + ': columns in order');
  for (let i = 1; i < L.rows.length; i++) assert.equal(L.rows[i].y, L.rows[i - 1].y + L.rows[i - 1].h, tag + ': rows contiguous');
  assert.ok(L.footY >= L.rows.at(-1).y + L.rows.at(-1).h, tag + ': the weighted row stands beneath');
  assert.equal(L.cols.length, F.groups.reduce((n, g) => n + g.cols.length, 0));
}
let layouts = 0;
const big = structuredClone(project);
for (let i = 0; i < 12; i++) big.decisions.records.push({...structuredClone(project.decisions.records[i % 3]), id: 'ADR-' + (100 + i), alternatives: project.decisions.records[i % 3].alternatives.map((a, k) => ({...structuredClone(a), id: `ALT-${100 + i}-${k}`}))});
for (const M of [TM, T2, tradeoffSource(big)]) {
  for (const sc of [{kind: 'system'}, {kind: 'decision', id: 'ADR-002'}, {kind: 'driver', id: 'QD-003'}]) for (const depth of ['alternatives', 'decisions']) for (const g of [null, prop]) { const F2 = foldMap(M, sc, depth, {proposal: g, proposalFor: 'ADR-002'}); checkMap(F2, mapLayout(F2), `map:${sc.kind}:${depth}`); layouts++; }
  for (const sc of [{kind: 'system'}, {kind: 'decision', id: 'ADR-001'}, {kind: 'driver', id: 'QD-001'}]) { const G2 = foldMatrix(M, sc); checkMatrix(G2, matrixLayout(G2), `matrix:${sc.kind}`); layouts++; }
}
pass(`${layouts} layouts of the decision map and the trade-off matrix: cards never overlap, routes are orthogonal, pass through no other card, and routes from different drivers never share a segment; alternatives stand right of their decision; the matrix keeps its rows contiguous with the weighted row beneath`);

console.log(JSON.stringify({suite: 'chapter 3 model (decisions)', passed: checks.length, checks, limits: [
  'The weighting shows which way the recorded priorities lean; it does not choose, and it counts an unjudged effect as nothing.',
  'Patterns and anti-patterns are linked by the words recorded; a pattern not named is not inferred.',
  'The playbook\'s style table covers only some qualities; where it is silent the model says so rather than filling it in.'
]}, null, 2));
