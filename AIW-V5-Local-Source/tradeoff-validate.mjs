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
import {tradeoffSource, foldMap, foldMatrix, tradeoffScope, tradeoffInsights, describeDecision, describeAlternative, tallyText, alternativeCoverage, styleSuggestions, styleDecisionPreset, defaultDepth, readingStanding, readingWords, STYLE_PROPOSAL, PROPOSED_ALT} from './public/tradeoff-model.js';
import {suggestionHypothesis} from './public/decision-suggestions.js';
import {signed} from './public/decision-reading.js';
import {mapLayout, matrixLayout, mapWireRoutes, DM, MX, TRACKS} from './public/tradeoff-layout.js';
import {mergeWires, wireConflicts} from './public/wire-merge.js';

const checks = [], pass = n => checks.push(n);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const dcmd = (p, type, payload) => applyDecisionCommand(p, {type: 'decision.' + type, payload}).document;

// 1. Decisions as their drivers weigh them.
const TM = tradeoffSource(project);
assert.deepEqual(TM.decisions.map(x => x.id + ':' + x.alts.map(a => a.id).join('+')), ['ADR-001:ALT-001+ALT-002', 'ADR-002:ALT-003+ALT-004', 'ADR-003:ALT-005+ALT-006']);
assert.deepEqual(TM.drivers.map(d => d.id), ['QD-001', 'QD-004', 'QD-005', 'QD-002', 'QD-003', 'QD-006'], 'drivers by priority, then rank');
assert.deepEqual(TM.decisions.map(x => x.lead), ['ALT-002', 'ALT-003', 'ALT-005']);
// Round 25: the model carries the reading and its lead; favoured is the lead under its round-24 name, kept only because
// the SDD (sdd-architecture.js) still reads it.
assert.deepEqual(TM.decisions.map(x => x.lead), ['ALT-002', 'ALT-003', 'ALT-005'], 'the alternative that leads on the drivers');
assert.ok(TM.decisions.every(x => x.lead === x.reading.lead && !('favoured' in x) && x.tally === x.reading), 'the lead is the reading\'s, computed when read');
assert.equal(tallyText(TM, TM.D.get('ADR-001'), 'ALT-002'), 'QD-002 +×2 QD-003 +×2 QD-006 −×2 = +2');
assert.equal(tallyText(TM, TM.D.get('ADR-003'), 'ALT-006'), 'QD-001 −×3 QD-004 −×3 QD-006 −×2 = -8');
const cov = alternativeCoverage(TM.D.get('ADR-001'), 'ALT-002');
assert.equal(cov.total, 3);
assert.equal(cov.judged, Object.values(TM.A.get('ALT-002').effects).filter(e => e.effect !== 'unknown').length);
const partial = structuredClone(project);
partial.decisions.records[0].alternatives.find(a => a.id === 'ALT-002').assessments['QD-002'] = {effect: 'unknown', reason: '', evidence: ''};
const partialModel = tradeoffSource(partial), partialCoverage = alternativeCoverage(partialModel.D.get('ADR-001'), 'ALT-002');
assert.deepEqual([partialCoverage.total, partialCoverage.judged], [3, cov.judged - 1]);
assert.equal(partialModel.D.get('ADR-001').tally.rows.find(r => r.alt.id === 'ALT-002').open, 1, 'the numerical lean can have an unknown effect; coverage must remain visible');
pass('each alternative reports how many effects were judged and how many have reasons and evidence, keeping uncertainty beside the weighted lean');
assert.deepEqual([...TM.sens.keys()], ['QD-001', 'QD-003']);
assert.deepEqual(TM.sens.get('QD-003'), [{decision: 'ADR-002', to: 'High', before: 'ALT-003', after: null}]);
assert.match(describeDecision(TM, 'ADR-002'), /Enforce the reference at the posting boundary leads on the drivers\. No working choice yet\./);
assert.match(describeAlternative(TM, 'ALT-006'), /creates tension with QD-001, QD-004 and QD-006\. Avoid: Blind replay/);
pass('each decision reads the drivers it weighs, each alternative its judged effect on every one of them; the drivers\' priorities weigh the alternatives in plain arithmetic (High 3, Medium 2, Low 1) to show which way they lean, and a one-step priority change that tips a decision marks a sensitivity point — QD-001 and QD-003 for ADR-002');

// GR-DRV-02 (round 25): a driver with no stated priority weighs nothing, and the reading and its observations say which.
{
  const p = JSON.parse(JSON.stringify(project));
  p.quality.drivers.find(d => d.id === 'QD-006').priority = '';
  const T = tradeoffSource(p), x = T.D.get('ADR-001'), code = T.R.driver('QD-006').code;
  assert.deepEqual(x.reading.leftOut, ['QD-006']);
  assert.ok(x.tally.rows.every(r => r.parts.find(q => q.driverId === 'QD-006').weight === 0), 'it weighs nothing');
  const said = tradeoffInsights(T).find(i => i.kind === 'gap' && i.text.includes(code) && /no stated priority, so the weights leave it out/.test(i.text));
  assert.ok(said, 'the observations name the driver the weights leave out');
  assert.equal(said.id, 'QD-006');
  pass('GR-DRV-02: a driver with no stated priority weighs nothing in the reading, and the model\'s observations name it as left out of the weights');
}

// Round 25 (D-25-03 to D-25-08): the reading as the screens say it. A constraint driver on CON-001 (a Must) that ADR-002
// weighs and ALT-004 breaks; an ADR-002 alternative following the SA Playbook's Protected System pattern with no effect
// stated on QD-005; QD-004 with no stated priority.
{
  let p = applyQualityCommand(project, {type: 'quality.driver', payload: {kind: 'constraint', title: 'Post through the existing core ledger', description: 'Every posting goes through the existing core ledger.', impact: 'Rules out a second store of postings.', constraintIds: ['CON-001'], priority: 'High'}}).document;
  const C = p.quality.drivers.at(-1).id, alt = (q, a) => q.decisions.records.find(x => x.id === 'ADR-002').alternatives.find(x => x.id === a), said = (effect, reason) => ({effect, reason, evidence: 'Design review.'});
  p = dcmd(p, 'save', {id: 'ADR-002', driverIds: [...p.decisions.records.find(d => d.id === 'ADR-002').driverIds, C]});
  p = dcmd(p, 'alternative', {id: 'ADR-002', alternativeId: 'ALT-004', assessments: {...alt(p, 'ALT-004').assessments, [C]: said('violates', 'Keeps its own record of postings.')}});
  p = dcmd(p, 'alternative', {id: 'ADR-002', alternativeId: 'ALT-003', assessments: {...alt(p, 'ALT-003').assessments, [C]: said('supports', 'Posts through the ledger.')}});
  p = dcmd(p, 'alternative', {id: 'ADR-002', title: 'Guard the posting boundary', pattern: 'Protected System', summary: 's', benefits: 'b', costs: 'c', consequences: 'q', assessments: {'QD-001': said('neutral', 'r'), 'QD-003': said('neutral', 'r'), [C]: said('supports', 'r')}});
  p = applyQualityCommand(p, {type: 'quality.driver', payload: {id: 'QD-004', priority: ''}}).document;
  const b4 = JSON.stringify(p), T = tradeoffSource(p), x2 = T.D.get('ADR-002'), guard = x2.alts.at(-1).id, title = id => T.A.get(id).a.title;
  assert.equal(C, 'QD-007');
  const st = (x, id, names) => { const s = readingStanding(x.reading, id, names); return [s.kind, s.line, s.foot, s.total, s.bounds]; };
  assert.deepEqual(st(x2, 'ALT-004'), ['out', 'Ruled out · breaks QD-007', 'ruled out', '−4', ''], 'ruled out by the hard constraint it breaks, and not ranked');
  assert.equal(readingStanding(x2.reading, 'ALT-004').row.rank, null);
  assert.deepEqual(st(x2, 'ALT-003'), ['lead', '★ Leads on the drivers · holds for any weights the priorities allow · unstated effects could change it', '★ leads', '+4', '']);
  assert.deepEqual(st(x2, guard), ['below', 'Ranks 2 of 2 on the drivers', 'ranks 2 of 2', '+3', 'between 0 and +6'], 'its rank among those the hard constraints leave in, and the range its unstated effect could move it to');
  assert.deepEqual(st(T.D.get('ADR-003'), 'ALT-006', {alt: title}), ['dominated', 'Dominated by Enquire and reconcile before replay', 'dominated', '−5', '']);
  assert.deepEqual(st(T.D.get('ADR-001'), 'ALT-002'), ['lead', '★ Leads on the drivers · holds if same-priority drivers count alike', '★ leads', '+2', '']);
  // Dominance as the effects stand is provisional, and says so.
  const q = JSON.parse(b4), a3 = q.decisions.records.find(d => d.id === 'ADR-003');
  a3.alternatives.find(a => a.id === 'ALT-005').assessments['QD-001'] = {effect: 'unknown', reason: '', evidence: ''}; a3.alternatives.find(a => a.id === 'ALT-006').assessments['QD-001'] = {effect: 'neutral', reason: 'r', evidence: 'e'};
  assert.deepEqual(st(tradeoffSource(q).D.get('ADR-003'), 'ALT-006').slice(0, 2), ['dominated', 'Dominated by ALT-005 as the effects stand']);
  // A tie, a single alternative and a ruled-out working choice keep their words.
  const tie = JSON.parse(b4), d1 = tie.decisions.records.find(d => d.id === 'ADR-001');
  d1.alternatives.find(a => a.id === 'ALT-001').assessments = structuredClone(d1.alternatives.find(a => a.id === 'ALT-002').assessments);
  assert.deepEqual(st(tradeoffSource(tie).D.get('ADR-001'), 'ALT-001').slice(0, 3), ['tied', 'Tied on the drivers with ALT-002', 'tied']);
  assert.equal(signed(0), '0'); assert.equal(signed(-3), '−3'); assert.equal(signed(2), '+2');
  // The reading's sentences, its alternatives named by title; the hypothesis of recording the suggestions, labelled.
  const words = readingWords(T, 'ADR-002').map(l => l.kind + ': ' + l.text);
  assert.ok(words.includes('ruled-out: Suppress repeats in the application cache is ruled out: it breaks QD-007, a hard constraint.'), words.join('\n'));
  assert.ok(words.includes('unknowns: One weighed effect is not stated; stating it could change the lead: Guard the posting boundary’s on QD-005.'));
  assert.ok(readingWords(T, 'ADR-003').some(l => l.kind === 'left-out' && l.text === 'QD-004 weighs nothing: no priority is stated.'));
  const S = T.suggestions('ADR-002');
  assert.equal(T.suggestions('ADR-002'), S, 'worked out once per model');
  assert.deepEqual(S.cells.map(c => [c.alternativeId, c.driverId, c.effect, c.suggestions[0].from]), [[guard, 'QD-005', 'supports', 'playbook']]);
  assert.match(S.cells[0].suggestions[0].evidence, /^SA Playbook, /);
  assert.equal(suggestionHypothesis(S, x2.reading, title), 'Hypothesis, not a result: if the suggested effects were recorded, Guard the posting boundary would lead instead of Enforce the reference at the posting boundary.');
  assert.equal(suggestionHypothesis(T.suggestions('ADR-001'), T.D.get('ADR-001').reading, title), '', 'nothing suggested, nothing said');
  assert.equal(x2.reading.rows.find(r => r.id === guard).score, 3, 'a suggestion is never counted');
  // The words around the reading: "Breaks it" counts as tension in the arithmetic; nothing favours, nothing is scored.
  assert.equal(tallyText(T, x2, 'ALT-004'), 'QD-001 −×3 QD-003 +×2 QD-005 0 QD-007 −×3 = -4');
  assert.match(describeAlternative(T, 'ALT-004'), /it breaks QD-007/);
  assert.match(describeDecision(T, 'ADR-002'), /Enforce the reference at the posting boundary leads on the drivers\. 1 alternative is ruled out by a hard constraint\. No working choice yet\./);
  const insights = tradeoffInsights(T).map(i => i.text + ' Ask: ' + (i.ask || '')).join('\n');
  assert.match(insights, /The drivers lean to Acknowledge a durable asynchronous handoff \(ADR-001\)[\s\S]*Ask: Do you agree with where the drivers lean\? The choice is yours\./);
  assert.match(insights, /ADR-002 turns on QD-001's priority: at Medium, no alternative would lead instead of Enforce the reference at the posting boundary\./);
  assert.doesNotMatch(insights + words.join(' '), /favou?r|scored|winner|recommend|AIW chooses/i);
  // A working choice that breaks a hard constraint: its standing in full, and the risk.
  const chosen = tradeoffSource(dcmd(p, 'choose', {id: 'ADR-002', alternativeId: 'ALT-004'}));
  assert.equal(chosen.D.get('ADR-002').reading.choice.standing, 'ruled-out');
  assert.ok(tradeoffInsights(chosen).some(i => i.kind === 'risk' && /ADR-002's working choice, Suppress repeats in the application cache, breaks C1, a hard constraint\./.test(i.text)));
  assert.equal(JSON.stringify(p), b4, 'reading, wording and suggesting change nothing');
  pass('round 25, the reading on the screens: ruled out by the hard constraint it breaks (not ranked), dominated (provisionally "as the effects stand"), the lead with how firmly it holds and whether the unstated effects could change it, a tie, a rank among those left in, and each total with the range of its unstated effects; the reading\'s sentences with alternatives by title; the suggested effects worked out once per model, never counted, and the hypothesis of recording them labelled as one; "Breaks it" counted as tension in the arithmetic; the words lean and lead, never favour or score');
}

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
assert.equal(decisionPatterns(p.decisions.records.find(d => d.id === 'ADR-004'))[4].title, 'Microservices', 'Proposals offers the styles for a style decision');
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
assert.equal(T2.D.get('ADR-004').lead, null, 'on these drivers the playbook cannot tell the two apart');
assert.equal(T2.D.get('ADR-004').lead, null, 'no alternative leads on the drivers');
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

// 6. Round 10 (V3): crossing-aware driver tracks, the port rule and option combs, against the map as drawn before.
// The decision map's routes as laid out before round 10 (a retired copy): each driver's track at its priority index,
// a port per driver on each decision in priority order, every alternative on one trunk from the decision's middle.
function retiredRoutes(F, L) {
  const C = new Map(L.cards.map(c => [c.id, c])), out = [], incoming = new Map();
  for (const l of F.links) { if (!incoming.has(l.to)) incoming.set(l.to, []); incoming.get(l.to).push(l.from); }
  for (const [to, froms] of incoming) {
    const d = C.get(to), ordered = F.drivers.filter(id => froms.includes(id));
    ordered.forEach((from, k) => {
      const s = C.get(from), i = F.drivers.indexOf(from), tx = DM.PAD + DM.DRV_W + 16 + i * DM.TRACK;
      const py = Math.round(d.y + 26 + (k + 0.5) * ((d.h - 40) / ordered.length)), sy = Math.round(s.y + s.h / 2);
      out.push({id: from + '>' + to, from, to, kind: 'weighs', pts: [[s.x + s.w, sy], [tx, sy], [tx, py], [d.x, py]]});
    });
  }
  for (const c of L.cards.filter(c => c.decision)) {
    const d = C.get(c.decision), sy = Math.round(d.y + d.h / 2), ty = Math.round(c.y + Math.min(c.h / 2, 48)), xm = d.x + d.w + DM.G2 / 2;
    out.push({id: c.decision + '>' + c.id, from: c.decision, to: c.id, kind: c.kind === 'alt' ? 'option' : c.kind, pts: [[d.x + d.w, sy], [xm, sy], [xm, ty], [c.x, ty]]});
  }
  return out;
}
// What lines drawn in groups show: distinct interior points where a horizontal of one group crosses a vertical of
// another, the crossing pairs, and the runs two groups share (collinear overlap).
function drawnLines(lines) {
  const segs = lines.map(l => ({g: l.g, s: l.pts.slice(1).map((p, i) => [l.pts[i], p]).filter(([a, b]) => a[0] !== b[0] || a[1] !== b[1])}));
  const btw = (v, a, b) => v > Math.min(a, b) + 0.5 && v < Math.max(a, b) - 0.5, points = new Set();
  let pairs = 0, shared = 0;
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    if (segs[i].g === segs[j].g) continue;
    for (const [a, b] of segs[i].s) for (const [c, d] of segs[j].s) {
      const ah = a[1] === b[1], ch = c[1] === d[1];
      if (ah && !ch && btw(c[0], a[0], b[0]) && btw(a[1], c[1], d[1])) { pairs++; points.add(c[0] + ',' + a[1]); }
      else if (!ah && ch && btw(a[0], c[0], d[0]) && btw(c[1], a[1], b[1])) { pairs++; points.add(a[0] + ',' + c[1]); }
      else if (ah && ch && a[1] === c[1] && Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0])) > Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0]))) shared++;
      else if (!ah && !ch && a[0] === c[0] && Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1])) > Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1]))) shared++;
    }
  }
  return {points: points.size, pairs, shared};
}
// The weighs lines as the view draws them: each driver's ink once (its merged chains), one group per driver.
const weighsDrawn = L => drawnLines(mergeWires(L.routes.filter(r => r.kind === 'weighs').map(r => ({id: r.id, pts: r.pts, share: 'drv:' + r.from, end: 'from', style: 'weighs'}))).chains.map(c => ({g: c.share, pts: c.pts})));
// An independent search of every track order under the port rule (the rule restated from the layout's contract): a
// decision's ports are spread down its left side, each moved just clear (TRACKS.CLEAR + 2 px, away from it where it
// can, in order and on the card) of any driver's stub it comes within TRACKS.CLEAR of; drivers whose stub is at or
// above the decision's middle take the top ports, the track nearest the decisions first, the others the bottom ports
// in mirror order. A stub crosses every other track whose span holds it strictly; a decision stub within TRACKS.CLEAR
// of a farther driver's stub runs along it.
function bestUnderRule(F, L) {
  const C = new Map(L.cards.map(c => [c.id, c])), sy = id => Math.round(C.get(id).y + C.get(id).h / 2), decs = [], E = TRACKS.CLEAR;
  for (const b of F.blocks) {
    const froms = F.links.filter(l => l.to === b.id).map(l => l.from), ordered = F.drivers.filter(id => froms.includes(id));
    if (!ordered.length) continue;
    const d = C.get(b.id), mid = d.y + d.h / 2;
    decs.push({id: b.id, d, slots: ordered.map((_, k) => Math.round(d.y + 26 + (k + 0.5) * ((d.h - 40) / ordered.length))), up: ordered.filter(id => sy(id) <= mid), down: ordered.filter(id => sy(id) > mid)});
  }
  const linked = F.drivers.filter(id => decs.some(D => D.up.includes(id) || D.down.includes(id))), stubs = linked.map(sy);
  for (const D of decs) for (let k = 0; k < D.slots.length; k++) {
    const y = D.slots[k], hit = stubs.find(v => Math.abs(v - y) <= E);
    if (hit === undefined) continue;
    const lo = k ? D.slots[k - 1] + E : D.d.y + 12, hi = k + 1 < D.slots.length ? D.slots[k + 1] - E : D.d.y + D.d.h - 12;
    const to = (y >= hit ? [hit + E + 2, hit - E - 2] : [hit - E - 2, hit + E + 2]).find(v => v > lo && v < hi && stubs.every(w => Math.abs(w - v) > E));
    if (to !== undefined) D.slots[k] = to;
  }
  const Y = new Map(linked.map(id => [id, sy(id)]));
  const cost = order => {
    const r = new Map(order.map((id, i) => [id, i])), outs = new Map(linked.map(id => [id, []]));
    for (const D of decs) [...[...D.up].sort((a, b) => r.get(b) - r.get(a)), ...[...D.down].sort((a, b) => r.get(a) - r.get(b))].forEach((id, k) => outs.get(id).push(D.slots[k]));
    const T = order.map(id => ({y: Y.get(id), outs: outs.get(id), a: Math.min(Y.get(id), ...outs.get(id)) + 0.5, b: Math.max(Y.get(id), ...outs.get(id)) - 0.5}));
    let x = 0, along = 0;
    for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) { // T[i] nearer the drivers than T[j]
      const p = T[i], q = T[j];
      if (q.y > p.a && q.y < p.b) x++;
      for (const y of p.outs) { if (y > q.a && y < q.b) x++; if (Math.abs(y - q.y) <= TRACKS.CLEAR) along++; }
    }
    return along * 1e6 + x;
  };
  let best = null;
  const walk = (prefix, rest) => {
    if (!rest.length) { const c = cost(prefix); if (!best || c < best.cost) best = {cost: c, order: prefix}; return; }
    rest.forEach((id, i) => walk([...prefix, id], [...rest.slice(0, i), ...rest.slice(i + 1)]));
  };
  walk([], linked);
  return best;
}
const nearRuns = [];
function checkV3(F, tag, {exact = true, dense = false} = {}) {
  const L = mapLayout(F), P = mapLayout(F, {trackOrder: 'priority'}), old = retiredRoutes(F, P);
  const plan = L.trackPlan, weighs = L.routes.filter(r => r.kind === 'weighs');
  // The control is the map drawn before round 10; nothing but the lines moves.
  assert.deepEqual(P.routes.filter(r => r.kind === 'weighs'), old.filter(r => r.kind === 'weighs'), tag + ': in priority order the driver tracks and ports are as drawn before round 10');
  assert.deepEqual(L.cards, P.cards, tag + ': the cards stay where they were, the drivers in priority order down the page');
  assert.deepEqual([L.W, L.H, L.gutter], [P.W, P.H, P.gutter], tag + ': the gutter keeps its width');
  assert.equal(L.gutter.w, 34 + F.drivers.length * DM.TRACK);
  assert.deepEqual(L.routes.map(r => r.id).sort(), old.map(r => r.id).sort(), tag + ': one route per relationship, the same relationships');
  // Each driver keeps its own track.
  const tx = new Map();
  for (const r of weighs) { if (tx.has(r.from)) assert.equal(r.pts[1][0], tx.get(r.from), tag + ': one track per driver'); tx.set(r.from, r.pts[1][0]); }
  assert.equal(new Set(tx.values()).size, tx.size, tag + ': no two drivers share a track');
  for (const x of tx.values()) assert.ok(x > L.gutter.x && x < L.gutter.x + L.gutter.w, tag + ': tracks stay in the gutter');
  assert.deepEqual(L.tracks.map(t => [t.id, t.x]), [...tx].filter(([id]) => L.tracks.some(t => t.id === id)).sort((a, b) => F.drivers.indexOf(a[0]) - F.drivers.indexOf(b[0])), tag + ': the tracks listed are the tracks drawn');
  // The model is the drawing, and the drawing never crosses more than the priority order.
  const now = weighsDrawn(L), ctl = weighsDrawn(P);
  if (!plan.alongs) assert.equal(now.points, plan.crossings, tag + ': the modelled crossings are the crossing points drawn');
  if (!ctl.shared) assert.equal(ctl.points, plan.priority.crossings, tag + ': and so are the priority order\'s (where no two of its drivers share a run, which merges crossing points)');
  // A decision weighed by so many drivers that its ports sit closer than TRACKS.CLEAR cannot keep them all clear; such
  // a map still has no more of these runs, or crossings, than the map drawn before.
  if (dense) assert.ok(plan.alongs <= plan.priority.alongs && plan.crossings <= plan.priority.crossings, tag + ': no more runs beside another driver\'s stub, or crossings, than before');
  else assert.equal(now.shared + plan.alongs, 0, tag + ': no driver\'s line runs along or beside another\'s');
  // Where the map drawn before round 10 keeps its ports clear of other drivers' stubs, the new map never crosses more;
  // where it does not (a decision stub beside another driver's stub, through the dot where its track divides), the new
  // map has no such run (asserted above), even at the price of a crossing.
  if (!plan.priority.alongs && !dense) assert.ok(now.points <= ctl.points && now.pairs <= ctl.pairs, `${tag}: crossings at or below the priority order computed in the same run (${now.points} vs ${ctl.points})`);
  else nearRuns.push(`${tag} ${ctl.points} → ${now.points}`);
  // The port rule: on each decision, from above the track nearest the decisions takes the top port; from below, the
  // bottom port.
  if (plan.how !== 'priority') for (const d of L.cards.filter(c => c.kind === 'decision' || c.kind === 'style-proposal')) {
    const rs = weighs.filter(r => r.to === d.id).sort((a, b) => a.pts[2][1] - b.pts[2][1]), up = rs.filter(r => r.pts[0][1] <= d.y + d.h / 2), down = rs.filter(r => r.pts[0][1] > d.y + d.h / 2);
    assert.deepEqual(rs.map(r => r.id), [...up, ...down].map(r => r.id), tag + ': routes from above take the top ports');
    up.forEach((r, i) => i && assert.ok(r.pts[1][0] < up[i - 1].pts[1][0], tag + ': from above, nearer the decisions, higher'));
    down.forEach((r, i) => i && assert.ok(r.pts[1][0] > down[i - 1].pts[1][0], tag + ': from below, nearer the decisions, lower'));
  }
  // Exact up to TRACKS.EXACT linked drivers: no order under the rule crosses less, and the control is kept only where
  // it is strictly better.
  if (exact && L.tracks.length <= TRACKS.EXACT) {
    const best = bestUnderRule(F, L), got = plan.alongs * 1e6 + plan.crossings, control = plan.priority.alongs * 1e6 + plan.priority.crossings;
    assert.equal(got, Math.min(best.cost, control), tag + ': the least crossings of any track order');
    if (plan.how === 'exact') assert.deepEqual(L.tracks.slice().sort((a, b) => a.level - b.level).map(t => t.id), best.order, tag + ': ties keep the priority order');
  }
  // One comb per decision with alternatives; its styles each on their own stub and spine, clear of one another.
  const C = new Map(L.cards.map(c => [c.id, c])), kids = L.cards.filter(c => c.decision), options = L.routes.filter(r => r.kind !== 'weighs');
  assert.deepEqual(L.combs.map(c => c.from), [...new Set(kids.map(c => c.decision))], tag + ': one comb per decision with alternatives');
  for (const comb of L.combs) {
    assert.ok(!comb.clashes, tag + ': ' + comb.id + ' has no style crossing another');
    const d = C.get(comb.from), mine = options.filter(r => r.from === comb.from), olds = old.filter(r => r.from === comb.from);
    assert.deepEqual(comb.parts.flatMap(p => p.ids).sort(), mine.map(r => r.id).sort(), tag + ': every alternative on exactly one part of its comb');
    assert.equal(new Set(comb.parts.map(p => p.kind)).size, comb.parts.length, tag + ': a part per style');
    for (const p of comb.parts) for (const id of p.ids) { const r = mine.find(q => q.id === id); assert.equal(r.kind, p.kind); assert.deepEqual(r.pts.slice(0, 2), [[d.x + d.w, p.y], [p.x, p.y]]); assert.equal(r.pts[2][0], p.x); }
    if (comb.parts.length === 1) assert.deepEqual(mine, olds, tag + ': a comb in one style is the trunk drawn before round 10');
    else { const k = drawnLines(mine.map(r => ({g: r.kind, pts: r.pts}))); assert.deepEqual([k.points, k.shared], [0, 0], tag + ': ' + comb.id + '\'s styles neither cross nor share a run'); }
  }
  // Ink drawn once, as the view draws it: a driver's lines share ink, a decision's lines in one style share ink; a
  // share whose merged ink would mislead is drawn apart and recorded (only where ports sit closer than TRACKS.CLEAR).
  const D = mapWireRoutes(L), Ww = mergeWires(D.weighs), Wo = mergeWires(D.options);
  assert.deepEqual(D.weighs.map(w => [w.id, w.share, w.style]), weighs.map(r => [r.id, L.apart.some(a => a.share === 'drv:' + r.from) ? null : 'drv:' + r.from, 'weighs']), tag + ': weighs share their driver\'s ink');
  assert.deepEqual(D.options.map(w => [w.id, w.share, w.style]), options.map(r => [r.id, L.apart.some(a => a.share === 'dec:' + r.from) ? null : 'dec:' + r.from, r.kind]), tag + ': alternatives share their decision\'s ink in their own style');
  if (!dense) assert.deepEqual(L.apart, [], tag + ': no share drawn apart');
  else assert.ok(L.apart.every(a => a.reason), tag + ': every share drawn apart is recorded with its reason');
  for (const [W, what] of [[Ww, 'weighs'], [Wo, 'options']]) {
    const c = wireConflicts(W);
    assert.deepEqual([c.atJoin.length, c.onTrunk.length, c.tContacts.length, W.apart.length], [0, 0, 0, 0], `${tag}: ${what} wires have no foreign line at a join, along shared ink or as a T, and none drawn apart`);
  }
  assert.equal(Ww.heads.length, weighs.length, tag + ': every weighs route keeps its own head');
  const ink = rs => rs.reduce((t, r) => t + r.pts.slice(1).reduce((u, p, i) => u + Math.abs(p[0] - r.pts[i][0]) + Math.abs(p[1] - r.pts[i][1]), 0), 0);
  assert.ok(Ww.ink <= ink(weighs) && Wo.ink <= ink(options), tag + ': ink drawn once is at most one line per route');
  assert.equal(JSON.stringify(mapLayout(F)), JSON.stringify(L), tag + ': deterministic');
  return {L, now, ctl, weighsInk: Ww.ink, optionsInk: Wo.ink};
}
let v3 = 0;
for (const M of [TM, T2, tradeoffSource(big)]) for (const sc of [{kind: 'system'}, {kind: 'decision', id: 'ADR-002'}, {kind: 'driver', id: 'QD-003'}]) for (const depth of ['alternatives', 'decisions']) for (const g of [null, prop]) { checkV3(foldMap(M, sc, depth, {proposal: g, proposalFor: 'ADR-002'}), `v3:${sc.kind}:${depth}${g ? ':proposal' : ''}`); v3++; }
// bank-payment as the chapter opens it (the reference journeys are measured in chapter-lines-validate.mjs, whose
// evidence holds the spec's numbers: bank 21 → 12, library 7 → 2, parcel lockers 10 → 4, clinic 6 → 1, warehouse 5 → 2,
// service permits 1 → 1).
const bankRead = checkV3(foldMap(TM, tradeoffScope(TM, {kind: 'system'}), defaultDepth(TM), {}), 'v3:bank-payment');
v3++;
assert.ok(bankRead.weighsInk < 4656 && bankRead.optionsInk < 816, 'bank-payment: weighs and options ink below one line per route (4,656 and 816 px)');
// Folds no project holds yet: random decision maps with up to TRACKS.EXACT drivers (exact), and larger ones that the
// shared assigner orders (never above the priority order).
const rand = seed => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const randomFold = (seed, nDrv, nDec, p) => {
  const r = rand(seed), drivers = [...Array(nDrv).keys()].map(i => 'QD-' + String(i + 1).padStart(3, '0')), blocks = [], links = [];
  for (let j = 0; j < nDec; j++) {
    const id = 'ADR-' + String(j + 1).padStart(3, '0'), alts = [...Array(Math.floor(r() * 4)).keys()].map(k => ({id: `ALT-${j}-${k}`, kind: 'alt'}));
    if (r() < 0.2) alts.push({id: 'SUG-' + j, kind: 'suggested'});
    if (r() < 0.1) alts.push({id: PROPOSED_ALT + j, kind: 'proposed'});
    blocks.push({id, kind: 'decision', alts, folded: false});
    const mem = drivers.filter(() => r() < p); if (!mem.length) mem.push(drivers[Math.floor(r() * nDrv)]);
    for (const d of mem) links.push({from: d, to: id});
  }
  return {scope: {kind: 'system'}, depth: 'alternatives', drivers, blocks, links};
};
const how = {};
let gained = 0, drawnBefore = 0, drawnAfter = 0, cleared = 0;
for (let seed = 1; seed <= 124; seed++) {
  const F2 = seed > 120 ? randomFold(seed, 8, 6 + seed % 5, 0.35) : randomFold(seed, 2 + (seed % 6), 2 + (seed * 7 % 9), 0.25 + (seed % 5) * 0.1), r = checkV3(F2, 'v3:random ' + seed);
  how[r.L.trackPlan.how] = (how[r.L.trackPlan.how] || 0) + 1; gained += r.now.points < r.ctl.points ? 1 : 0; drawnBefore += r.ctl.points; drawnAfter += r.now.points; v3++;
  if (r.L.trackPlan.alongs === 0 && r.L.trackPlan.priority.alongs) cleared++;
}
for (const [seed, nDrv, nDec, p, dense] of [[7, 12, 14, 0.3], [8, 30, 30, 0.3], [9, 130, 12, 0.15], [10, 130, 6, 0.5, true]]) {
  const r = checkV3(randomFold(seed, nDrv, nDec, p), `v3:large ${nDrv} drivers`, {exact: false, dense});
  if (r.L.trackPlan.how !== 'priority') assert.equal(r.L.trackPlan.how, r.L.tracks.length > TRACKS.ASSIGN ? 'ports' : 'assigned', 'the assigner orders maps above the exact limit, and the port rule alone the largest');
  how[r.L.trackPlan.how] = (how[r.L.trackPlan.how] || 0) + 1; v3++;
}
pass(`round 10 (V3), ${v3} decision maps: in priority order the tracks and ports are those drawn before round 10 (the in-run control); otherwise the drivers keep their place down the page and their own track, the gutter its width, and the track order is the one with the fewest crossings under the port rule (exact up to ${TRACKS.EXACT} linked drivers, against an independent search of every order; ${JSON.stringify(how)}), never above the priority order where that order keeps its ports clear of other drivers' stubs (bank-payment ${bankRead.ctl.points} → ${bankRead.now.points}; random maps ${drawnBefore} → ${drawnAfter} crossings, ${gained} of 124 fewer); ports keep clear of every driver's stub, so no driver's line runs along or beside another's (the old map ran a decision stub beside another driver's stub in ${nearRuns.length} of these maps, ${cleared} of them random; the new map crosses more than the old in ${nearRuns.filter(t => { const [a, b] = t.split(' → ').map(v => +v.split(' ').at(-1)); return b > a; }).length} of those), except where a decision's ports sit closer than ${TRACKS.CLEAR} px, which records the shares it draws apart; each decision's alternatives hang from one comb, a stub and spine per style that neither cross nor share a run; ink drawn once has no foreign line at a join, along it or as a T, every weighs route keeps its head, and bank-payment draws ${Math.round(bankRead.weighsInk)} px of weighs ink (4,656 one line per route) and ${Math.round(bankRead.optionsInk)} px of options ink (816)`);

console.log(JSON.stringify({suite: 'chapter 3 model (decisions)', passed: checks.length, checks, limits: [
  'The weighting shows which way the recorded priorities lean; it does not choose, and it counts an unjudged effect as nothing.',
  'Patterns and anti-patterns are linked by the words recorded; a pattern not named is not inferred.',
  'The playbook\'s style table covers only some qualities; where it is silent the model says so rather than filling it in.',
  'The decision map\'s track order is the fewest crossings for the ports the port rule gives (exact up to ' + TRACKS.EXACT + ' linked drivers); the ports themselves are not searched, and the driver and decision cards do not move.'
]}, null, 2));
