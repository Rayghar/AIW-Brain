// Chapter 4 Model checks: responsibilities laid over the journey, their slicing and layout, the
// coverage of the reasons, walking the journeys, and what the model shows from recorded facts.
// Run: npm run test:responsibility
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyLogicalCommand, logicalProposal} from './public/logical-domain.js';
import {responsibilitySource, responsibilityModel, foldResponsibilities, responsibilityScope, coverage, journeyWalk, describeWalk, describeResponsibility, describeFlow, responsibilityInsights, defaultDepth, laneInfo, PROPOSED, UNGROUPED, UNOWNED, ACROSS} from './public/responsibility-model.js';
import {responsibilityLayout, coverageLayout, cardHeight, CX} from './public/responsibility-layout.js';

const checks = [], pass = name => checks.push(name);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const LM = responsibilitySource(project);
const overlap = (a, b, m = 0) => a.x < b.x + b.w - m && b.x < a.x + a.w - m && a.y < b.y + b.h - m && b.y < a.y + a.h - m;
const rs = M => [...M.R.values()];

// 1. The adapter reads the journey, the responsibilities over it, and what each carries.
assert.deepEqual(LM.steps.map(s => [s.num, s.title, s.served.join()]), [['01', 'Initiate payment', 'api'], ['02', 'Screen for risk', 'risk'], ['03', 'Post ledger entry', 'ledger'], ['04', 'Settle payment', 'hub'], ['05', 'Confirm outcome', 'notify']], 'five journey steps, each served by one responsibility');
assert.deepEqual(rs(LM).map(r => [r.ref, r.group, r.stage]), [['LR-001', 'GRP-001', 0], ['LR-002', 'GRP-002', 1], ['LR-003', 'GRP-002', 2], ['LR-004', 'GRP-003', 3], ['LR-005', 'GRP-001', 4]], 'each stands at the step it serves, in its group');
assert.deepEqual(LM.bands, ['GRP-001', 'GRP-002', 'GRP-003']);
assert.deepEqual(LM.flows.map(f => [f.id, f.label, f.carriedBy.join(), f.scenarios.join()]), [['REL-001', 'Screen', 'INT-001', 'success,hold,timeout'], ['REL-002', 'Allow', 'INT-002', 'success,timeout'], ['REL-003', 'Submit', 'INT-003', 'success,timeout'], ['REL-004', 'Outcome', 'INT-004', 'success']], 'four logical flows, each carried by a Chapter 5 interaction and passed along by the journeys');
assert.equal(LM.flows.find(f => f.id === 'REL-002').condition, 'Only an explicit allow decision permits posting.');
assert.deepEqual(LM.R.get('api').context.map(c => [c.layer, c.label]), [['data', 'owns'], ['interface', 'exposes'], ['security', 'protects']], 'what a responsibility owns, exposes and is protected by');
assert.deepEqual(rs(LM).map(r => r.realisedBy.join()), ['api-pod', 'risk-engine', 'core-adapter', 'worker', 'notify-worker'], 'one layer down: the component that realises each');
assert.deepEqual(LM.R.get('ledger').reqs, ['REQ-003']); assert.deepEqual(LM.R.get('ledger').adrs, ['ADR-002', 'ADR-003']);
assert.deepEqual(LM.R.get('ledger').qds.map(d => d.id + (d.direct ? '' : '*')), ['QD-001', 'QD-003*', 'QD-004', 'QD-005*', 'QD-006*'], 'quality drivers by name, and inherited through requirements or decisions');
assert.deepEqual(LM.R.get('risk').scenarios, ['success', 'hold', 'timeout']); assert.deepEqual(LM.R.get('notify').scenarios, ['success']);
assert.equal(JSON.stringify(project), before, 'the project is not changed');
pass('the adapter reads five journey steps, five responsibilities at the steps they serve in three groups, four logical flows each carried by a Chapter 5 interaction, what each responsibility owns, exposes and is protected by, the component realising it, and the requirements, quality drivers and decisions behind it');

// 2. Gaps become visible, from recorded facts only.
let q = structuredClone(project);
q.logical.connections = q.logical.connections.filter(c => c.id !== 'REL-008');
q.logical.mappings = q.logical.mappings.filter(m => m.logicalId !== 'notify');
q.realisation.connections = q.realisation.connections.filter(c => c.id !== 'INT-003');
q.logical.connections.push({id: 'REL-T1', from: 'ledger', to: 'instruction', label: 'owns', kind: 'trace', condition: '', origin: 'user'});
q.artefacts.push({...q.artefacts.find(a => a.id === 'REQ-005'), id: 'REQ-006', title: 'Explain a rejected payment', modelRef: ''});
q = applyLogicalCommand(q, {type: 'logical.responsibility', payload: {title: 'Fraud case review', purpose: '', boundary: '', owner: '', source: '', groupId: '', requirementIds: [], decisionIds: []}}).document;
const Q = responsibilitySource(q), fraud = rs(Q).find(r => r.title === 'Fraud case review');
assert.ok(Q.steps[3].hole, 'a step nobody serves is a hole');
assert.equal(Q.R.get('hub').stage, 3, 'a responsibility that serves no step stands with what hands it work'); assert.ok(Q.R.get('hub').derived);
assert.ok(fraud.offJourney && fraud.group === UNGROUPED && fraud.stage === Q.steps.length, 'unconnected and ungrouped: off the journey');
assert.deepEqual(Q.bands, ['GRP-001', 'GRP-002', 'GRP-003', UNGROUPED, UNOWNED]);
assert.equal(Q.flows.find(f => f.id === 'REL-003').carried, false);
const qi = responsibilityInsights(Q).map(i => i.text).join('\n');
assert.match(qi, /1 journey step has no responsibility: 04 Settle payment/);
assert.match(qi, /1 requirement is not covered by any responsibility: REQ-006 Explain a rejected payment/);
assert.match(qi, /1 responsibility has no requirement behind it: LR-006 Fraud case review/);
assert.match(qi, /1 responsibility serves no journey step and connects to none that does: LR-006 Fraud case review/);
assert.match(qi, /2 responsibilities are not realised by any component yet: LR-005 Notification service, LR-006 Fraud case review/);
assert.match(qi, /1 logical flow has no interaction between the components that realise its ends: LR-003 → LR-004 \(Submit\)/);
assert.match(qi, /Payment instruction is owned by LR-001 and LR-003\. Choose one authority/);
const vi = responsibilityInsights(LM);
assert.deepEqual(vi.map(i => i.kind), ['risk', 'risk', 'info', 'info', 'info', 'info', 'info']);
assert.match(vi[0].text, /The Risk hold journey ends at LR-002 Risk screening\. Its onward flow carries a condition — “Only an explicit allow decision permits posting” — and no responsibility owns what happens otherwise/);
assert.equal(vi[0].proposal, 'review', 'the manual review proposal answers the risk hold');
assert.match(vi[1].text, /The Settlement timeout journey ends at LR-004 Settlement hub; 05 Confirm outcome is not reached/); assert.equal(vi[1].proposal, 'recovery');
assert.match(vi.map(i => i.text).join('\n'), /Every journey step is owned, every requirement is covered, and every logical flow is carried[\s\S]*All 3 decisions behind the responsibilities are still drafts \(ADR-001, ADR-002, ADR-003\)[\s\S]*1 responsibility has no decision behind it: LR-002 Risk screening[\s\S]*5 of 5 responsibilities are reference content[\s\S]*0 of 3 journeys have been walked/);
assert.match(describeResponsibility(LM, 'risk'), /LR-002 Risk screening, in Control & accounting, serves 02 Screen for risk\. It owns Risk decision\. It takes over from LR-001 Payment API \(Screen\)\. It hands on to LR-003 Core ledger \(Allow, on condition “Only an explicit allow decision permits posting”\)\. It covers REQ-002 and is realised by APP-002 Risk engine\./);
assert.match(describeFlow(LM, 'REL-004'), /LR-004 Settlement hub hands work to LR-005 Notification service \(Outcome\)\. In Chapter 5, INT-004 \(Settlement worker → Notification worker\) carries it\./);
assert.match(describeFlow(Q, 'REL-003'), /No interaction between APP-003 Core connector and APP-004 Settlement worker carries it yet/);
pass('holes in the journey, uncovered requirements, responsibilities without a reason or off the journey, missing realisations, uncarried flows and double data ownership all surface from recorded facts; journeys that stop early name what they leave unowned and the proposal that answers them');

// 3. Slicing.
for (const M of [LM, Q]) for (const depth of ['responsibilities', 'groups']) {
  const F = foldResponsibilities(M, {kind: 'system'}, depth), members = F.rows.flatMap(r => r.members);
  assert.equal(new Set(members).size, members.length, depth + ': no responsibility twice'); assert.equal(members.length, M.R.size, depth + ': every responsibility is drawn');
  assert.ok(F.links.every(l => l.from !== l.to));
  if (depth === 'responsibilities') assert.deepEqual(F.lanes.map(l => l.id), M === Q ? ['S:0', 'S:1', 'S:2', 'S:3', 'S:4', ACROSS] : ['S:0', 'S:1', 'S:2', 'S:3', 'S:4'], 'every step is a lane, and what serves none stands off the journey');
  else assert.ok(F.lanes.every(l => F.rows.some(r => r.region === l.id)), 'folded, only the steps something stands at');
  for (let i = 1; i < F.rows.length; i++) assert.ok(F.bands.indexOf(F.rows[i - 1].band) <= F.bands.indexOf(F.rows[i].band), 'rows arrive band by band');
}
const FQ = foldResponsibilities(Q);
assert.deepEqual(FQ.rows.filter(r => r.kind === 'hole').map(r => [r.id, r.region]), [['HOLE:settle', 'S:3']], 'the hole stands in its step, in the band of steps nobody owns');
assert.equal(FQ.rows.find(r => r.id === 'hub').region, 'S:3');
const fg = foldResponsibilities(LM, {kind: 'group', id: 'GRP-002'});
assert.deepEqual(fg.rows.map(r => [r.id, !!r.ctx]), [['api', true], ['risk', false], ['ledger', false], ['hub', true]], 'a group keeps its neighbours as context');
assert.deepEqual(fg.lanes.map(l => l.id), ['S:0', 'S:1', 'S:2', 'S:3'], 'and only the steps it and its neighbours stand at');
const fp = foldResponsibilities(LM, {kind: 'part', id: 'ledger'});
assert.deepEqual(fp.rows.map(r => r.id + (r.subject ? '*' : '')), ['risk', 'ledger*', 'hub']); assert.ok(fp.links.every(l => !l.dim));
assert.deepEqual(responsibilityScope(LM, {kind: 'part', id: 'REL-002'}), {kind: 'part', id: 'risk', focus: 'REL-002'}, 'a flow opens on the responsibility it leaves');
assert.equal(defaultDepth(LM), 'responsibilities');
const FG = foldResponsibilities(Q, {kind: 'system'}, 'groups');
assert.deepEqual(foldResponsibilities(LM, {kind: 'system'}, 'groups').rows.map(r => [r.id, r.region, r.members.join()]), [['G:GRP-001', 'S:0', 'api,notify'], ['G:GRP-002', 'S:1', 'risk,ledger'], ['G:GRP-003', 'S:3', 'hub']], 'folded, each group is one card at the first step it acts on');
assert.ok(FG.rows.filter(r => r.kind === 'cell').every(r => r.id === 'G:' + r.band) && FG.rows.some(r => r.kind === 'hole'));
pass('the whole journey, one group, or one responsibility and its neighbours: every responsibility drawn once, rows band by band, every step a lane, holes in their steps, what serves no step off the journey, and — folded — each group one card at the first step it acts on');

// 4. Layout.
function checkLayout(F, L, tag) {
  L.lanes.forEach((l, i) => { if (i) assert.ok(l.x >= L.lanes[i - 1].x + L.lanes[i - 1].w, tag + ': lanes never overlap'); });
  assert.ok(L.lanes[0].x >= L.rail, tag + ': the rail stays clear');
  for (const c of L.cards) { const ln = L.lanes.find(l => l.id === c.row.region); assert.ok(ln && c.x >= ln.x && c.x + c.w <= ln.x + ln.w, tag + ': a card stays in its lane'); assert.ok(c.h >= cardHeight(c.row), tag + ': a card is tall enough'); }
  for (let i = 0; i < L.cards.length; i++) for (let j = i + 1; j < L.cards.length; j++) assert.ok(!overlap(L.cards[i], L.cards[j]), tag + ': cards never overlap');
  L.bands.forEach((b, i) => { if (i) assert.ok(b.y >= L.bands[i - 1].y + L.bands[i - 1].h, tag + ': bands never overlap'); for (const c of L.cards.filter(c => c.row.band === b.id)) assert.ok(c.y >= b.y && c.y + c.h <= b.y + b.h, tag + ': a card stays in its band'); });
  assert.equal(L.bands.length, F.bands.length, tag + ': every band is drawn');
  const C = new Map(L.cards.map(c => [c.id, c]));
  for (const r of L.routes) {
    for (let i = 1; i < r.pts.length; i++) {
      const [a, b] = [r.pts[i - 1], r.pts[i]];
      assert.ok(Math.abs(a[0] - b[0]) < 0.01 || Math.abs(a[1] - b[1]) < 0.01, tag + ': routes are orthogonal');
      const seg = {x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(a[0] - b[0]) + 0.01, h: Math.abs(a[1] - b[1]) + 0.01};
      for (const c of L.cards) if (c.id !== r.link.from && c.id !== r.link.to) assert.ok(!overlap(seg, c, 0.5), `${tag}: ${r.id} passes through ${c.id}`);
    }
    const from = C.get(r.link.from), to = C.get(r.link.to);
    assert.ok(r.ya >= from.y && r.ya <= from.y + from.h && r.yb >= to.y && r.yb <= to.y + to.h, tag + ': ports sit on their cards');
  }
  for (let i = 0; i < L.routes.length; i++) for (let j = i + 1; j < L.routes.length; j++) {
    const p = L.routes[i], o = L.routes[j];
    if (Math.abs(p.xt - o.xt) > 0.5) continue;
    assert.ok(Math.max(p.ya, p.yb) < Math.min(o.ya, o.yb) || Math.max(o.ya, o.yb) < Math.min(p.ya, p.yb), `${tag}: ${p.id} and ${o.id} share a track`);
  }
  L.labels.forEach((l, i) => { assert.ok(!L.cards.some(b => overlap(l, b, 0.5)), tag + ': labels avoid cards'); assert.ok(!L.labels.slice(i + 1).some(o => overlap(l, o, 0.5)), tag + ': labels never collide'); });
  assert.equal(JSON.stringify(responsibilityLayout(F)), JSON.stringify(L), tag + ': layout is deterministic');
}
let layouts = 0;
const proposal = logicalProposal(project, 'review');
for (const M of [LM, Q]) for (const sc of [{kind: 'system'}, {kind: 'group', id: 'GRP-002'}, {kind: 'group', id: 'GRP-001'}, {kind: 'part', id: 'ledger'}, {kind: 'part', id: 'api'}]) for (const depth of ['responsibilities', 'groups']) for (const prop of [null, proposal]) {
  const F = foldResponsibilities(M, sc, depth, {proposal: prop}); checkLayout(F, responsibilityLayout(F), `${sc.kind}:${sc.id || ''}:${depth}:${prop ? 'proposal' : ''}`); layouts++;
}
const L0 = responsibilityLayout(foldResponsibilities(LM));
assert.equal(L0.slots, 3, 'five responsibilities in three bands share three rows'); assert.equal(L0.labels.length, 4, 'every flow is labelled');
assert.ok(L0.H < 560, 'the whole journey fits one screen');
assert.equal(responsibilityLayout.length, 1); assert.ok(!/\blens\b|structure|reasoning/.test(responsibilityLayout.toString()) && !/\blens\b/.test(cardHeight.toString()), 'layout never reads the lens');
pass(`${layouts} journey layouts, with and without a proposal: lanes, bands and cards never overlap, each card stays in its step and its group, every route is orthogonal and passes through no other card, gutter tracks never share, labels avoid cards and each other, and the lens cannot move anything`);

// 5. Proposals and coverage.
const FP = foldResponsibilities(LM, {kind: 'system'}, 'responsibilities', {proposal});
const ghost = FP.rows.find(r => r.id === PROPOSED);
assert.ok(ghost && ghost.band === 'GRP-002' && ghost.region === 'S:1', 'the proposed review stands in its group at the step of what it works with');
assert.ok(FP.links.some(l => l.from === 'risk' && l.to === PROPOSED && l.proposed && l.label === 'routes held payments to'));
assert.ok(!foldResponsibilities(LM, {kind: 'system'}, 'responsibilities', {proposal: logicalProposal(project, 'dedup')}).rows.some(r => r.id === PROPOSED), 'a data proposal adds no responsibility');
const G = coverage(LM), CG = coverageLayout(G);
assert.deepEqual(G.rows.map(r => r.id), ['REQ-001', 'REQ-002', 'REQ-003', 'REQ-004', 'REQ-005', 'QD-001', 'QD-002', 'QD-003', 'QD-004', 'QD-005', 'QD-006', 'ADR-001', 'ADR-002', 'ADR-003']);
assert.deepEqual(G.cols.map(c => c.ref), ['LR-001', 'LR-005', 'LR-002', 'LR-003', 'LR-004'], 'responsibilities grouped by their group');
assert.deepEqual(G.cells.filter(c => c.row.startsWith('REQ')).map(c => c.row + '>' + c.col), ['REQ-001>api', 'REQ-002>risk', 'REQ-003>ledger', 'REQ-004>hub', 'REQ-005>notify']);
assert.equal(G.cells.filter(c => c.mark === 'direct').length, 13); assert.equal(G.cells.filter(c => c.mark === 'inherited').length, 9);
assert.ok(G.cells.filter(c => c.row.startsWith('ADR')).every(c => c.mark === 'draft'), 'every linked decision is still a draft');
assert.deepEqual(G.cols.filter(c => c.noAdr).map(c => c.ref), ['LR-002']);
const GQ = coverage(Q);
assert.deepEqual(GQ.uncovered, ['REQ-006']); assert.ok(GQ.cols.find(c => c.ref === 'LR-006').noReq);
const GP = coverage(LM, {kind: 'system'}, {proposal});
assert.deepEqual(GP.cols.map(c => c.id), ['api', 'notify', 'risk', 'ledger', PROPOSED, 'hub'], 'the proposal column stands with its group');
assert.ok(GP.cells.some(c => c.row === 'REQ-002' && c.col === PROPOSED && c.mark === 'proposed'));
const GS = coverage(LM, {kind: 'part', id: 'risk'});
assert.deepEqual(GS.rows.map(r => r.id), ['REQ-002', 'QD-003', 'QD-005'], 'one responsibility reads only its own reasons');
CG.rows.forEach((r, i) => { if (i) assert.ok(r.y >= CG.rows[i - 1].y + CG.rows[i - 1].h); });
for (const c of CG.cells) { const r = CG.rows.find(x => x.id === c.row), k = CG.cols.find(x => x.id === c.col); assert.ok(c.x === k.x + k.w / 2 && c.y === r.y + r.h / 2); }
assert.deepEqual(CG.colGroups.map(g => g.group), ['GRP-001', 'GRP-002', 'GRP-003']);
assert.ok(CG.sumX >= CG.cols.at(-1).x + CX.COL_W && CG.W >= CG.sumX + CX.SUM_W);
assert.equal(JSON.stringify(project), before);
pass('a responsibility proposal stands in its group with its relationship drawn; coverage lays the requirements, quality drivers and decisions against the responsibilities, tells covering from inheriting and accepted from draft, shows what nothing covers, and keeps the proposal column with its group');

// 6. Walking the journeys.
assert.deepEqual(journeyWalk(LM, 'success').map(w => w.step), ['initiate', 'screen', 'post', 'settle', 'confirm']);
const hold = journeyWalk(LM, 'hold');
assert.deepEqual(hold.map(w => [w.step, w.from.join(), w.early]), [['initiate', '', false], ['screen', 'REL-001', true]]);
assert.deepEqual(hold[1].onward, ['REL-002']);
assert.match(describeWalk(LM, hold[1]), /02 Screen for risk\. Served by LR-002 Risk screening \(Control & accounting\)\. It takes over from LR-001 Payment API \(Screen\)\. The Risk hold journey ends here — the onward flow carries a condition: “Only an explicit allow decision permits posting”\. Not reached: 03 Post ledger entry, 04 Settle payment, 05 Confirm outcome\./);
assert.match(describeWalk(Q, journeyWalk(Q, 'success')[3]), /04 Settle payment\. No responsibility serves this step — the journey has a hole here\./);
assert.match(describeWalk(LM, journeyWalk(LM, 'success')[4]), /The Successful payment journey is complete\./);
pass('each journey is walked step by step: who serves the step, which flow brought the work there, and — where a journey stops early — the condition it stops on and the steps it never reaches');

// 7. Scale: fifty responsibilities (the most Chapter 4 accepts) in twelve groups over sixteen steps.
{
  const N = 50, S = 16, K = 12;
  const steps = Array.from({length: S}, (_, i) => ({id: 'st' + i, title: 'Step ' + (i + 1)}));
  const groups = Array.from({length: K}, (_, i) => ({id: 'g' + i, title: 'Group ' + (i + 1), purpose: 'Synthetic group'}));
  const resp = Array.from({length: N}, (_, i) => ({id: 'r' + i, ref: 'LR-' + String(i + 1).padStart(3, '0'), title: 'Responsibility ' + (i + 1), purpose: 'p', boundary: 'b', owner: 'o', source: 's', group: 'g' + (i * 7 % K), order: i, requirementIds: ['q' + (i % 40)], decisionIds: i % 3 ? ['d' + (i % 8)] : [], drivers: [{id: 'x' + (i % 12), direct: i % 2 === 0}], confirmed: i % 4 === 0}));
  const connections = [];
  resp.forEach((r, i) => { if (i % 7 !== 3 && i !== 49) connections.push({id: 'S' + i, from: 'st' + Math.floor(i * S / N), to: r.id, label: 'served by', kind: 'trace'}); });
  for (let i = 0; i < N - 2; i++) { connections.push({id: 'F' + i, from: 'r' + i, to: 'r' + (i + 1), label: 'Hands on ' + i, kind: 'flow', condition: i % 9 === 0 ? 'Only when allowed' : ''}); if (i % 5 === 0 && i + 3 < N - 1) connections.push({id: 'J' + i, from: 'r' + i, to: 'r' + (i + 3), label: 'Also ' + i, kind: i % 2 ? 'trace' : 'flow'}); }
  const components = Array.from({length: 30}, (_, i) => ({id: 'c' + i, ref: 'APP-' + i, title: 'Component ' + i}));
  const mappings = resp.filter((_, i) => i % 11 !== 5).map((r, i) => ({id: 'M' + i, logicalId: r.id, physicalId: 'c' + (Number(r.id.slice(1)) % 30), scope: 'scope', status: 'candidate', current: true}));
  const interactions = Array.from({length: 29}, (_, i) => ({id: 'I' + i, from: 'c' + i, to: 'c' + (i + 1), kind: 'sync'}));
  const src = {steps, groups, responsibilities: resp, connections, components, mappings, interactions, requirements: Array.from({length: 44}, (_, i) => ({id: 'q' + i, title: 'Requirement ' + i})), drivers: Array.from({length: 12}, (_, i) => ({id: 'x' + i, title: 'Driver ' + i})), decisions: Array.from({length: 8}, (_, i) => ({id: 'd' + i, question: 'Decision ' + i, status: 'draft'})), scenarios: [{id: 'success', title: 'All', steps: steps.map((_, i) => i)}, {id: 'hold', title: 'Early stop', steps: [0, 1, 2, 3, 4, 5]}]};
  const t0 = performance.now();
  const SM = responsibilityModel(src);
  const F = foldResponsibilities(SM, {kind: 'system'}, defaultDepth(SM)), L = responsibilityLayout(F);
  const FR = foldResponsibilities(SM, {kind: 'system'}, 'responsibilities'), LR = responsibilityLayout(FR);
  const FGp = foldResponsibilities(SM, {kind: 'group', id: 'g3'}), LGp = responsibilityLayout(FGp);
  const CV = coverageLayout(coverage(SM));
  const ms = performance.now() - t0;
  assert.equal(defaultDepth(SM), 'groups', 'fifty responsibilities open folded into groups');
  assert.deepEqual(rs(SM).filter(r => r.offJourney).map(r => r.id), ['r49'], 'every responsibility finds its step, directly or through its flows — but the one connected to nothing');
  assert.ok(F.rows.length < N, 'groups fold the rows');
  checkLayout(F, L, 'synthetic:groups'); checkLayout(FR, LR, 'synthetic:responsibilities'); checkLayout(FGp, LGp, 'synthetic:g3');
  assert.equal(FR.rows.filter(r => r.kind === 'resp').length, N); assert.equal(CV.cols.length, N);
  assert.ok(responsibilityInsights(SM).some(i => /44 requirements|4 requirements are not covered/.test(i.text)), 'uncovered synthetic requirements surface');
  assert.ok(ms < 5000, 'model, three folds, three layouts and the coverage in ' + Math.round(ms) + ' ms');
  pass(`fifty synthetic responsibilities in twelve groups over sixteen steps fold to ${F.rows.length} group cards (${L.W} × ${L.H}), open one group (${FGp.rows.length} rows), and lay out all fifty with ${FR.links.length} flows without a single collision in ${Math.round(ms)} ms`);
}

console.log(JSON.stringify({suite: 'chapter 4 model (logical application)', passed: checks.length, checks, limits: ['The model shows recorded responsibilities, flows, journey steps and reasons. It does not judge whether a responsibility boundary is well chosen.', 'Journey scenarios are the ones the project records; walking one is a design walkthrough, not an execution.', 'The synthetic design is generated only for structure and scale.']}, null, 2));
