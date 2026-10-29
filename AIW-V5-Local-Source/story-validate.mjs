// Chapter 1 Model checks: the journey map (a story map) and the context, their slicing and layout,
// walking the journey, and what the model shows from recorded facts. Run: npm run test:story
import assert from 'node:assert/strict';
import {seedProject, proposals} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {storySource, storyModel, foldStory, foldContext, storyScope, storyWalk, storyInsights, describeStep, describeRequirement, defaultDepth, OFF, PROPOSED} from './public/story-model.js';
import {storyLayout, contextLayout, cardHeight, SX, CT, CONTEXT_FANS, contextHead} from './public/story-layout.js';
import {laneLayout, LANE} from './public/lane-layout.js';
import {mergeWires, wireConflicts, headDir} from './public/wire-merge.js';

const checks = [], pass = name => checks.push(name);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const SM = storySource(project);
const overlap = (a, b, m = 0) => a.x < b.x + b.w - m && b.x < a.x + a.w - m && a.y < b.y + b.h - m && b.y < a.y + a.h - m;
const qs = M => [...M.R.values()];

// 1. The adapter reads the journey as the backbone of the requirements.
assert.deepEqual(SM.steps.map(s => [s.num, s.id, s.actors.join(), s.reqs.join(), s.linkedNext]), [['01', 'JRN-001', 'ACT-001', 'REQ-001', true], ['02', 'JRN-002', 'ACT-002', 'REQ-002', true], ['03', 'JRN-003', '', 'REQ-003', true], ['04', 'JRN-004', 'ACT-002', 'REQ-004', true], ['05', 'JRN-005', 'ACT-001', 'REQ-005', false]], 'five steps in order, who takes part, what each needs, and the recorded order');
assert.deepEqual(qs(SM).map(q => [q.id, q.priority, q.outcomes.join(), q.covers.map(r => r.ref).join()]), [['REQ-001', 'Must', 'OUT-001', 'LR-001'], ['REQ-002', 'Must', 'OUT-001', 'LR-002'], ['REQ-003', 'Must', 'OUT-002', 'LR-003'], ['REQ-004', 'Must', 'OUT-001', 'LR-004'], ['REQ-005', 'Must', 'OUT-001', 'LR-005']], 'what each delivers, and the Chapter 4 responsibility covering it');
assert.deepEqual([SM.R.get('REQ-003').constraints, SM.R.get('REQ-004').assumptions], [['CON-001'], ['ASM-001']], 'the limits on each requirement');
assert.deepEqual(qs(SM).filter(q => !q.testable).map(q => q.id), ['REQ-005']); assert.ok(SM.R.get('REQ-005').ambiguous);
assert.deepEqual([...SM.outcomes.values()].map(o => [o.id, o.reqs.length, o.owners.join()]), [['OUT-001', 4, 'STK-001'], ['OUT-002', 1, 'STK-002']]);
assert.deepEqual([...SM.limits.values()].map(x => [x.id, x.type, x.scopeMode]), [['ASM-001', 'assumption', 'in'], ['CON-001', 'constraint', 'in'], ['SCP-001', 'scope', 'in'], ['SCP-002', 'scope', 'out']].sort((a, b) => ['SCP', 'CON', 'ASM'].indexOf(a[0].slice(0, 3)) - ['SCP', 'CON', 'ASM'].indexOf(b[0].slice(0, 3))));
assert.deepEqual(SM.bands, ['Must']);
assert.equal(JSON.stringify(project), before, 'the project is not changed');
pass('the adapter reads five journey steps in order with who takes part, the requirement each needs, what each requirement delivers and is limited by, whether its acceptance can be tested, and — one layer down — the Chapter 4 responsibility covering it');

// 2. Gaps become visible, from recorded facts only.
const q = structuredClone(project);
q.relationships = q.relationships.filter(r => !['REL-016', 'REL-015'].includes(r.id));
q.artefacts.push({...q.artefacts.find(a => a.id === 'REQ-001'), id: 'REQ-006', title: 'Explain a rejected payment', priority: 'Should', acceptance: 'Given a rejected payment, when the customer asks, then the recorded reason is shown.', modelRef: ''});
q.artefacts.push({...q.artefacts.find(a => a.id === 'OUT-002'), id: 'OUT-003', title: 'Fewer calls to operations'});
q.artefacts.find(a => a.id === 'REQ-002').priority = 'Could';
q.relationships.push({id: 'REL-T1', from: 'SCP-002', to: 'REQ-004', kind: 'supports'});
q.logical.responsibilities.find(r => r.id === 'notify').requirementIds = [];
const Q = storySource(q);
assert.ok(Q.steps[2].hole && Q.R.get('REQ-003').offJourney, 'a step that needs nothing is a hole, and the requirement it needed is off the journey');
assert.deepEqual(Q.bands, ['Must', 'Should', 'Could']);
const qi = storyInsights(Q).map(i => i.text).join('\n');
assert.match(qi, /1 journey step has no requirement: 03 Record the posting/);
assert.match(qi, /2 requirements are needed at no journey step: REQ-003 Prevent duplicate financial effects, REQ-006 Explain a rejected payment/);
assert.match(qi, /1 requirement delivers no business outcome: REQ-006 Explain a rejected payment/);
assert.match(qi, /1 outcome is delivered by no requirement: OUT-003 Fewer calls to operations/);
assert.match(qi, /The journey order is not recorded after 02 Screen the instruction/);
assert.match(qi, /1 requirement is tied to a boundary marked out of scope: REQ-004 Retain an uncertain settlement outcome/);
assert.match(qi, /2 requirements are not yet covered by a Chapter 4 responsibility: REQ-005 Notify the customer quickly, REQ-006 Explain a rejected payment/);
const vi = storyInsights(SM);
assert.deepEqual(vi.map(i => i.kind), ['gap', 'risk', 'info', 'info', 'info', 'info', 'info', 'info']);
assert.match(vi[0].text, /1 requirement has acceptance that cannot be tested yet: REQ-005 Notify the customer quickly/); assert.equal(vi[0].proposal, 'acceptance', 'the chapter\'s acceptance proposal answers it');
assert.match(vi[1].text, /REQ-004 Retain an uncertain settlement outcome rests on ASM-001 Settlement status can be enquired, not yet confirmed/); assert.equal(vi[1].proposal, 'assumption');
assert.match(vi.map(i => i.text).join('\n'), /Every step has a requirement[\s\S]*All 5 requirements are Must: nothing has been traded off yet[\s\S]*REQ-005 Notify the customer quickly[\s\S]*03 Record the posting has no person taking part[\s\S]*4 of 5 requirements deliver OUT-001 A payment with a known outcome; OUT-002 rests on a single requirement[\s\S]*20 of 20 records are reference examples/);
pass('holes in the journey, requirements off the journey or delivering nothing, outcomes nothing delivers, a broken journey order, a requirement tied to an out-of-scope boundary and requirements no responsibility covers all surface; untestable acceptance and an unconfirmed assumption each come with the chapter\'s own proposal');

// 3. Slicing.
for (const M of [SM, Q]) for (const depth of ['requirements', 'steps']) {
  const F = foldStory(M, {kind: 'system'}, depth), members = F.cards.flatMap(c => c.members);
  assert.equal(new Set(members).size, members.length, depth + ': no requirement twice'); assert.equal(members.length, M.R.size, depth + ': every requirement is drawn');
  assert.ok(F.cards.every(c => F.cols.some(k => k.id === c.col) && F.bands.includes(c.band)));
}
const FQ = foldStory(Q);
assert.deepEqual(FQ.cols.map(c => c.id), ['S:0', 'S:1', 'S:2', 'S:3', 'S:4', OFF], 'every step, then what no step needs');
assert.deepEqual(FQ.cards.filter(c => c.kind === 'hole').map(c => [c.id, c.col, c.band]), [['HOLE:JRN-003', 'S:2', 'Must']]);
assert.deepEqual(FQ.cards.filter(c => c.id === 'REQ-002' || c.id === 'REQ-006').map(c => [c.id, c.col, c.band]), [['REQ-006', OFF, 'Should'], ['REQ-002', 'S:1', 'Could']], 'each in its slice');
assert.deepEqual(foldStory(SM, {kind: 'actor', id: 'ACT-002'}).cols.map(c => c.step), ['JRN-002', 'JRN-004'], 'one person\'s journey');
assert.deepEqual(foldStory(SM, {kind: 'outcome', id: 'OUT-002'}).cards.map(c => c.id), ['REQ-003'], 'what delivers one outcome');
assert.deepEqual(storyScope(SM, {kind: 'x', id: 'REQ-004'}), {kind: 'step', id: 'JRN-004', focus: 'REQ-004'}, 'a requirement opens on its step');
assert.equal(defaultDepth(SM), 'requirements');
const ghost = proposals(project, null, 'model').find(p => p.id === 'pending');
const FP = foldStory(SM, {kind: 'system'}, 'requirements', {ghost});
assert.deepEqual(FP.bands, ['Must', 'Should']); assert.deepEqual([FP.ghost.col, FP.ghost.band, FP.ghost.outcomes], ['S:3', 'Should', ['OUT-001']], 'the proposed enquiry stands under Settle, in a Should slice of its own');
const C = foldContext(SM);
assert.deepEqual(C.lanes.map(l => l.id), ['people', 'system', 'why', 'owners']);
assert.equal(C.rows.length, 11); assert.deepEqual(C.links.filter(l => l.kind === 'delivers').map(l => l.label), ['REQ-001', 'REQ-002', 'REQ-003', 'REQ-004', 'REQ-005']);
assert.deepEqual(foldContext(SM, {kind: 'outcome', id: 'OUT-002'}).rows.map(r => r.id), ['JRN-003', 'OUT-002', 'STK-002']);
const limitGhost = proposals(project, null, 'model').find(p => p.id === 'assumption');
const CG = foldContext(SM, {kind: 'system'}, {ghost: limitGhost});
assert.deepEqual(CG.notes.filter(n => n.proposed).map(n => [n.id, n.kind, n.title]), [[PROPOSED, 'assumption', 'Confirm the external enquiry contract']], 'a proposed assumption stands among the limits');
assert.deepEqual(CG.rows, C.rows, 'a proposed limit changes nothing in the lanes');
assert.equal(foldContext(SM, {kind: 'step', id: 'JRN-004'}, {ghost: limitGhost}).notes.length, 0, 'limits are read with the whole journey');
pass('the journey map shows every requirement once, in its slice under the first step that needs it, with holes and what no step needs; it slices to one step, one person or one outcome, and folds to one card per slice of each step; the context slices the same way, and a proposed limit stands among the limits');

// 4. Layout.
function checkMap(F, L, tag) {
  L.cols.forEach((c, i) => { if (i) assert.ok(c.x >= L.cols[i - 1].x + L.cols[i - 1].w, tag + ': columns never overlap'); });
  L.bands.forEach((b, i) => { if (i) assert.ok(b.y >= L.bands[i - 1].y + L.bands[i - 1].h, tag + ': slices never overlap'); });
  assert.ok(!L.cols.length || L.cols[0].x >= L.rail, tag + ': the rail stays clear');
  for (const c of L.cards) {
    const col = L.cols.find(k => k.id === c.card.col), b = L.bands.find(x => x.id === c.card.band);
    assert.ok(c.x >= col.x && c.x + c.w <= col.x + col.w, tag + ': a card stays in its step');
    assert.ok(c.y >= b.y && c.y + c.h <= b.y + b.h, tag + ': a card stays in its slice');
    assert.ok(c.h >= cardHeight(c.card), tag + ': a card is tall enough');
  }
  for (let i = 0; i < L.cards.length; i++) for (let j = i + 1; j < L.cards.length; j++) assert.ok(!overlap(L.cards[i], L.cards[j]), tag + ': cards never overlap');
  assert.equal(JSON.stringify(storyLayout(F)), JSON.stringify(L), tag + ': layout is deterministic');
}
function checkContext(F, L, tag) {
  L.lanes.forEach((l, i) => { if (i) assert.ok(l.x >= L.lanes[i - 1].x + L.lanes[i - 1].w, tag + ': lanes never overlap'); });
  for (const c of L.cards) { const ln = L.lanes.find(l => l.id === c.row.region); assert.ok(c.x >= ln.x && c.x + c.w <= ln.x + ln.w, tag + ': a card stays in its lane'); }
  for (let i = 0; i < L.cards.length; i++) for (let j = i + 1; j < L.cards.length; j++) assert.ok(!overlap(L.cards[i], L.cards[j]), tag + ': cards never overlap');
  for (const r of L.routes) for (let i = 1; i < r.pts.length; i++) {
    const [a, b] = [r.pts[i - 1], r.pts[i]];
    assert.ok(Math.abs(a[0] - b[0]) < 0.01 || Math.abs(a[1] - b[1]) < 0.01, tag + ': routes are orthogonal');
    const seg = {x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(a[0] - b[0]) + 0.01, h: Math.abs(a[1] - b[1]) + 0.01};
    for (const c of L.cards) if (c.id !== r.link.from && c.id !== r.link.to) assert.ok(!overlap(seg, c, 0.5), `${tag}: ${r.id} passes through ${c.id}`);
  }
  L.labels.forEach((l, i) => { assert.ok(!L.cards.some(b => overlap(l, b, 0.5)), tag + ': labels avoid cards'); assert.ok(!L.labels.slice(i + 1).some(o => overlap(l, o, 0.5)), tag + ': labels never collide'); });
  for (const n of L.notes) { assert.ok(n.y >= L.lanesH, tag + ': limits sit beneath the lanes'); assert.ok(!L.notes.some(o => o !== n && overlap(o, n))); }
  assert.equal(JSON.stringify(contextLayout(F)), JSON.stringify(L), tag + ': layout is deterministic');
}
let layouts = 0;
for (const M of [SM, Q]) {
  for (const sc of [{kind: 'system'}, {kind: 'step', id: 'JRN-004'}, {kind: 'actor', id: 'ACT-001'}, {kind: 'outcome', id: 'OUT-001'}]) {
    for (const depth of ['requirements', 'steps']) for (const g of [null, ghost]) { const F = foldStory(M, sc, depth, {ghost: g}); checkMap(F, storyLayout(F), `map:${sc.kind}:${depth}:${g ? 'ghost' : ''}`); layouts++; }
    for (const g of [null, limitGhost]) { const C2 = foldContext(M, sc, {ghost: g}); checkContext(C2, contextLayout(C2), `context:${sc.kind}:${g ? 'ghost' : ''}`); layouts++; }
  }
}
const L0 = storyLayout(foldStory(SM)), C0 = contextLayout(C);
assert.equal(L0.bands.length, 1); assert.ok(L0.H < 320, 'the whole journey map fits well within one screen');
assert.equal(C0.labels.length, 5, 'every path to an outcome names its requirements'); assert.equal(C0.notes.length, 4);
assert.ok(!/\blens\b|structure|reasoning/.test(storyLayout.toString() + contextLayout.toString()) && !/\blens\b/.test(cardHeight.toString()), 'layout never reads the lens');
pass(`${layouts} layouts of both views, with and without a proposal: columns, slices and cards never overlap and each card stays in its step and its slice; in the context every route is orthogonal and passes through no other card, labels avoid cards and each other, and the limits sit beneath; the lens cannot move anything`);

// 4b. Round 10 (V5): fan-out trees in the context. Each person's part in the journey and each owner's outcomes leave
// their card through one port on one line that divides at a dot, a branch and a head per relationship; a delivers path
// (it carries its requirements) is its own line. A relationship belongs to one structure at most and nothing is shared
// at both ends, so no line joins two people to two steps. Ports sit on their cards' sides, one per source structure and
// one per target relationship; routes share a track only within one fan; the wires are the routes merged as declared,
// and no foreign line meets a fan at a join, along its trunk or as a T.
const segs = pts => pts.slice(1).map((q, i) => [pts[i], q]).filter(([a, b]) => a[0] !== b[0] || a[1] !== b[1]);
const inside = (v, a, b) => v > Math.min(a, b) + 0.5 && v < Math.max(a, b) - 0.5;
// Distinct points where lines of different groups cross, and collinear runs of different groups (one drawn on another).
function drawnLines(lines) {
  const points = new Set(); let on = 0;
  for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
    if (lines[i].g === lines[j].g) continue;
    for (const [a1, a2] of segs(lines[i].pts)) for (const [b1, b2] of segs(lines[j].pts)) {
      const ah = a1[1] === a2[1], bh = b1[1] === b2[1];
      if (ah && !bh && inside(b1[0], a1[0], a2[0]) && inside(a1[1], b1[1], b2[1])) points.add(b1[0] + ',' + a1[1]);
      else if (!ah && bh && inside(a1[0], b1[0], b2[0]) && inside(b1[1], a1[1], a2[1])) points.add(a1[0] + ',' + b1[1]);
      else if (ah && bh && a1[1] === b1[1] && Math.min(Math.max(a1[0], a2[0]), Math.max(b1[0], b2[0])) - Math.max(Math.min(a1[0], a2[0]), Math.min(b1[0], b2[0])) > 0.5) on++;
      else if (!ah && !bh && a1[0] === b1[0] && Math.min(Math.max(a1[1], a2[1]), Math.max(b1[1], b2[1])) - Math.max(Math.min(a1[1], a2[1]), Math.min(b1[1], b2[1])) > 0.5) on++;
    }
  }
  return {crossings: points.size, on};
}
const asDrawn = L => drawnLines(L.wires.chains.map(c => ({g: c.group, pts: c.pts})));
const perRoute = L => drawnLines(L.routes.map(r => ({g: r.id, pts: r.pts})));
function checkFans(F, L, tag) {
  const C = new Map(L.cards.map(c => [c.id, c])), laneOf = id => L.lanes.findIndex(ln => ln.id === C.get(id).row.region);
  const fans = new Map(); for (const r of L.routes) if (r.share != null) (fans.get(r.share) || fans.set(r.share, []).get(r.share)).push(r);
  for (const r of L.routes) {
    assert.equal(r.pts.length, 4, tag + ': ' + r.id + ' keeps its own route through its own ports');
    assert.equal(r.share == null, r.shareEnd == null, tag + ': a shared route says from which end');
    if (r.share != null) assert.ok(r.shareEnd === 'from' && r.entry == null && CONTEXT_FANS.includes(r.link.kind), tag + ': ' + r.id + ' belongs to one structure, a fan from its source (Chapter 1 bundles nothing at a target)');
    const a = C.get(r.link.from), b = C.get(r.link.to), [p, q] = [r.pts[0], r.pts[3]];
    assert.ok((p[0] === a.x || p[0] === a.x + a.w) && p[1] > a.y && p[1] < a.y + a.h, tag + ': ' + r.id + ' leaves its own card through a port on its side');
    assert.ok((q[0] === b.x || q[0] === b.x + b.w) && q[1] > b.y && q[1] < b.y + b.h, tag + ': ' + r.id + ' enters its own card through a port on its side');
  }
  // Every person's or owner's two or more flows into one lane fan out; a delivers path never does.
  const could = new Map(); for (const l of F.links) if (CONTEXT_FANS.includes(l.kind)) { const k = l.kind + '|' + l.from + '|' + laneOf(l.to); could.set(k, (could.get(k) || 0) + 1); }
  for (const r of L.routes) assert.equal(r.share != null, r.link.kind !== 'delivers' && could.get(r.link.kind + '|' + r.link.from + '|' + laneOf(r.link.to)) >= 2, tag + ': ' + r.id + (r.share ? ' fans out' : ' stands alone') + ' as Chapter 1 declares');
  for (const [id, rs] of fans) assert.ok(rs.length >= 2 && rs.every(r => r.link.from === rs[0].link.from && r.link.kind === rs[0].link.kind && laneOf(r.link.to) === laneOf(rs[0].link.to) && r.xa === rs[0].xa && r.ya === rs[0].ya && r.xt === rs[0].xt), tag + ': ' + id + ' is one element\'s flows of one kind, through one port on one track');
  // A port serves one structure: a fan's source port, or one relationship's target port; never both ends shared.
  const port = new Map(), use = (k, who) => (port.get(k) || port.set(k, new Set()).get(k)).add(who);
  for (const r of L.routes) { use(r.link.from + '|' + r.xa + '|' + r.ya, 'from ' + (r.share || r.id)); use(r.link.to + '|' + r.xb + '|' + r.yb, 'to ' + r.id); }
  for (const [k, who] of port) assert.equal(who.size, 1, tag + ': the port ' + k + ' serves one structure (' + [...who].join(', ') + ')');
  // Routes share a track only within one fan.
  for (const r of L.routes) for (const o of L.routes) if (r !== o && r.xt === o.xt && Math.min(Math.max(r.ya, r.yb), Math.max(o.ya, o.yb)) - Math.max(Math.min(r.ya, r.yb), Math.min(o.ya, o.yb)) > 1) assert.ok(r.share != null && r.share === o.share, `${tag}: ${r.id} and ${o.id} share a track only within one fan`);
  // The wires: merged as declared (a fan from its source, drawn by kind), intact, a head per branch, dots only on fans.
  assert.equal(JSON.stringify(L.wires), JSON.stringify(mergeWires(L.routes.map(r => ({id: r.id, pts: r.pts, share: r.share, end: r.shareEnd || 'from', style: r.link.kind})))), tag + ': the wires are the routes merged as declared');
  const X = wireConflicts(L.wires);
  assert.deepEqual([X.atJoin.length, X.onTrunk.length, X.tContacts.length, L.wires.apart.length], [0, 0, 0, 0], tag + ': no foreign line at a join, along a trunk or as a T; nothing drawn apart');
  assert.equal(L.wires.heads.length, L.routes.filter(r => headDir(r.pts)).length, tag + ': every branch keeps its own head');
  const share = new Map(L.routes.map(r => [r.id, r.share]));
  for (const j of L.wires.joins) assert.ok(j.ids.length >= 2 && j.ids.every(id => share.get(id) != null && share.get(id) === share.get(j.ids[0])), tag + ': a dot only where one fan divides');
  const d = asDrawn(L);
  assert.equal(d.on, 0, tag + ': no line is drawn on another');
  return {fans: fans.size, members: [...fans.values()].reduce((n, rs) => n + rs.length, 0), joins: L.wires.joins.length, heads: L.wires.heads.length, crossings: d.crossings};
}
const fanStats = {layouts: 0, fans: 0, members: 0, joins: 0};
for (const M of [SM, Q]) for (const sc of [{kind: 'system'}, {kind: 'step', id: 'JRN-004'}, {kind: 'actor', id: 'ACT-001'}, {kind: 'actor', id: 'ACT-002'}, {kind: 'outcome', id: 'OUT-001'}]) for (const g of [null, limitGhost]) {
  const F2 = foldContext(M, sc, {ghost: g}), s2 = checkFans(F2, contextLayout(F2), `fans:${sc.kind}:${sc.id || ''}:${g ? 'ghost' : ''}`);
  fanStats.layouts++; fanStats.fans += s2.fans; fanStats.members += s2.members; fanStats.joins += s2.joins;
}
// Bank: each of its two people takes part in two steps; their fans, the dots where they divide and a head per relationship.
const B = checkFans(C, C0, 'bank');
assert.deepEqual([B.fans, B.members, B.joins, B.heads], [2, 4, 2, 11], 'bank: two fans of two steps each, a dot where each divides, eleven heads for eleven relationships');
assert.deepEqual([...new Set(C0.routes.filter(r => r.share).map(r => r.link.from))], ['ACT-001', 'ACT-002']);
// Against today's context in the same run (the engine's tracks by interval colouring, no fan-out, one line per route)
// and against the same picture without the fans or without the port rule: fewer crossings, never more.
const ctx = {top: contextHead(), left: 12, cardW: CT.CARD_W, cardH: (row, ports) => Math.max(CT.CARD_H, 22 + ports * LANE.PORT), labelMax: CT.LABEL_MAX, labelInset: 12, labelled: l => l.kind === 'delivers', wireStyle: l => l.kind};
const fanKey = l => (CONTEXT_FANS.includes(l.kind) ? l.kind : null);
const compared = [];
for (const [tag, F2] of [['bank', C], ['gaps', foldContext(Q)]]) {
  const today = perRoute(laneLayout(F2, {...ctx, trackOrder: 'colouring'})), unfanned = perRoute(laneLayout(F2, ctx)), unruled = asDrawn(laneLayout(F2, {...ctx, fromKey: fanKey})), now = asDrawn(contextLayout(F2));
  { const E = laneLayout(F2, {...ctx, fromKey: fanKey, portRule: true}), V = contextLayout(F2); assert.equal(JSON.stringify([E.lanes, E.cards, E.routes, E.wires, E.labels]), JSON.stringify([V.lanes, V.cards, V.routes, V.wires, V.labels]), tag + ': the context is the lane engine with fans and the port rule'); }
  assert.ok(now.crossings <= today.crossings && now.crossings <= unfanned.crossings && now.crossings <= unruled.crossings, `${tag}: ${now.crossings} crossings against ${today.crossings} today, ${unfanned.crossings} without fans and ${unruled.crossings} without the port rule`);
  compared.push(`${tag} ${now.crossings} (today ${today.crossings})`);
}
assert.ok(asDrawn(C0).crossings <= 4, 'bank: at most four crossings (twelve today)');
// The engine's rules, on a small picture of two lanes: s1 and s2 on the left, t1 and t2 on the right.
{
  const S = {lanes: [{id: 'a', kind: 'a'}, {id: 'b', kind: 'b'}], rows: [{id: 's1', region: 'a'}, {id: 's2', region: 'a'}, {id: 't1', region: 'b'}, {id: 't2', region: 'b'}], links: [{id: 'x', from: 's1', to: 't1', kind: 'k'}, {id: 'y', from: 's1', to: 't2', kind: 'k'}, {id: 'z', from: 's2', to: 't1', kind: 'k'}, {id: 'w', from: 's2', to: 't2', kind: 'k'}]};
  const base = {top: 10, labelled: () => false, wireStyle: l => l.kind, fromKey: l => l.kind};
  const shares = L => Object.fromEntries(L.routes.map(r => [r.id, r.share ? r.share + ' ' + r.shareEnd : null]));
  const A = laneLayout(S, base);
  assert.deepEqual(shares(A), {x: 'F:k|s1>1L from', y: 'F:k|s1>1L from', z: 'F:k|s2>1L from', w: 'F:k|s2>1L from'}, 'one fan per source and target lane');
  // Bundled at t1, the links into t1 cannot fan out too; s1 and s2 keep one flow each to t2, which stand alone.
  const Bd = laneLayout(S, {...base, bundleKey: l => (l.to === 't1' ? 't1' : null)});
  assert.deepEqual(shares(Bd), {x: 'E:t1 to', y: null, z: 'E:t1 to', w: null}, 'a relationship belongs to one structure: bundled at its target, it never fans out from its source');
  for (const L of [A, Bd]) for (const c of L.wires.chains) assert.ok(new Set(c.ids.map(id => S.links.find(l => l.id === id).from)).size === 1 || new Set(c.ids.map(id => S.links.find(l => l.id === id).to)).size === 1, 'no drawn line joins two sources to two targets');
  assert.ok(Object.values(shares(laneLayout(S, {...base, wireStyle: undefined}))).every(v => v === null), 'with no drawing style declared, nothing fans out');
  assert.ok(Object.values(shares(laneLayout(S, {...base, labelled: l => l.id !== 'w'}))).every(v => v === null), 'a labelled flow never fans out, and a fan needs two flows');
  assert.ok(Object.values(shares(laneLayout(S, {...base, edgeMarker: l => l.id === 'x'}))).filter(Boolean).length === 2, 'a marked flow never fans out');
  assert.deepEqual(shares(laneLayout(S, {...base, wireStyle: l => (l.id === 'x' ? 'other' : 'k')})), {x: null, y: null, z: 'F:k|s2>1L from', w: 'F:k|s2>1L from'}, 'a fan is drawn alike');
  assert.equal(JSON.stringify(laneLayout(S, {...base, portRule: true})), JSON.stringify(laneLayout(S, {...base, portRule: true})), 'deterministic');
}
pass(`fan-out trees in the context (${fanStats.layouts} layouts, ${fanStats.fans} fans of ${fanStats.members} relationships, ${fanStats.joins} dots): a relationship belongs to one structure at most and never shares both ends; each fan is one element's flows of one kind leaving through one port on one track; every port sits on its card's side and serves one structure; routes share a track only within one fan; the wires are the routes merged as declared, a head per branch, dots only where a fan divides, no foreign line at a join, along a trunk or as a T, no line drawn on another; crossings ${compared.join(', ')}, never above today's, the picture without fans or without the port rule`);

// 5. Walking the journey, and reading a requirement.
assert.equal(describeStep(SM, 'JRN-003'), '03 Record the posting. No person takes part — the system acts alone. It needs REQ-003 Prevent duplicate financial effects (Must). That delivers OUT-002 Protect the financial effect. Next: 04 Settle the payment.');
assert.match(describeStep(Q, 'JRN-002'), /Next: 03 Record the posting — but no “precedes” relationship records that order\./);
assert.match(describeStep(SM, 'JRN-005'), /This is the last step of the journey\.$/);
assert.equal(describeRequirement(SM, 'REQ-004'), 'REQ-004 Retain an uncertain settlement outcome (Must) is needed at 04 Settle the payment and delivers OUT-001 A payment with a known outcome. It rests on ASM-001 Settlement status can be enquired. In Chapter 4, LR-004 Settlement hub covers it.');
assert.match(describeRequirement(SM, 'REQ-005'), /Its acceptance cannot be tested yet\./);
pass('the journey is walked step by step — who takes part, what each step needs, what it delivers and whether the order is recorded — and a requirement reads where it is needed, what it delivers, what it rests on and what covers it');

// More than one journey: ordering, walking, and the visible slices have independent boundaries.
{
  const p = structuredClone(project);
  for (const a of p.artefacts.filter(a => a.type === 'journey')) a.journeyId = 'Payment';
  p.artefacts.push({id: 'JRN-R1', type: 'journey', journeyId: 'Reconciliation', order: 1, title: 'Receive statement'}, {id: 'JRN-R2', type: 'journey', journeyId: 'Reconciliation', order: 2, title: 'Match posting'}, {id: 'REQ-R1', type: 'requirement', title: 'Match the posting once', priority: 'Must', acceptance: 'Given a statement, when matched, then the posting is found.'});
  p.relationships.push({id: 'REL-R1', from: 'JRN-R1', to: 'JRN-R2', kind: 'precedes'}, {id: 'REL-R2', from: 'JRN-R2', to: 'REQ-R1', kind: 'requires'});
  const m = storySource(p), reconciliation = storyScope(m, {kind: 'journey', id: 'Reconciliation'}), payment = storyScope(m, {kind: 'journey', id: 'Payment'});
  assert.deepEqual(m.journeys.map(j => [j.id, j.steps.length]), [['Payment', 5], ['Reconciliation', 2]]);
  assert.equal(m.steps[4].next, null, 'the payment ending cannot point to reconciliation');
  assert.equal(m.steps[5].num, '01', 'step numbering starts anew');
  assert.deepEqual(storyWalk(m, 'Reconciliation'), ['JRN-R1', 'JRN-R2']);
  assert.deepEqual(foldStory(m, reconciliation).cols.map(c => c.step), ['JRN-R1', 'JRN-R2']);
  assert.deepEqual(foldStory(m, payment).cards.filter(c => c.kind === 'req').map(c => c.id), ['REQ-001', 'REQ-002', 'REQ-003', 'REQ-004', 'REQ-005']);
  assert.deepEqual(foldContext(m, reconciliation).rows.filter(r => r.kind === 'step').map(r => r.id), ['JRN-R1', 'JRN-R2']);
  assert.match(describeStep(m, 'JRN-005'), /last step of the journey/);
  assert.doesNotMatch(describeStep(m, 'JRN-005'), /Receive statement/);
  for (const a of p.artefacts.filter(a => a.type === 'journey' && a.journeyId === 'Payment')) a.journeyId = '';
  const defaultNamed = storySource(p);
  assert.deepEqual(storyScope(defaultNamed, {kind: 'journey', id: ''}), {kind: 'journey', id: ''});
  assert.deepEqual(storyWalk(defaultNamed, ''), ['JRN-001', 'JRN-002', 'JRN-003', 'JRN-004', 'JRN-005']);
  pass('separate journeys keep their own order, numbers, walk, map and context; the last step of one never points to the next journey');
}

// 6. Scale: a large import — 1,200 requirements over twenty steps.
{
  const artefacts = [], relationships = [];
  let rel = 0; const link = (from, kind, to) => relationships.push({id: 'R' + (++rel), from, to, kind});
  for (let i = 0; i < 20; i++) { artefacts.push({id: 'JRN-' + i, type: 'journey', title: 'Step ' + (i + 1), order: i + 1}); if (i) link('JRN-' + (i - 1), 'precedes', 'JRN-' + i); }
  for (let i = 0; i < 8; i++) { artefacts.push({id: 'ACT-' + i, type: 'actor', title: 'Actor ' + i}); for (let k = i; k < 20; k += 5) link('ACT-' + i, 'participates in', 'JRN-' + k); }
  for (let i = 0; i < 12; i++) { artefacts.push({id: 'OUT-' + i, type: 'outcome', title: 'Outcome ' + i}); artefacts.push({id: 'STK-' + i, type: 'stakeholder', title: 'Owner ' + i}); link('STK-' + i, 'owns', 'OUT-' + i); }
  for (let i = 0; i < 1200; i++) { artefacts.push({id: 'REQ-' + String(i).padStart(4, '0'), type: 'requirement', title: 'Requirement ' + i, priority: ['Must', 'Should', 'Could'][i % 3], acceptance: 'Given a case, when it happens, then it is observable.'}); if (i % 17) link('JRN-' + (i % 20), 'requires', 'REQ-' + String(i).padStart(4, '0')); link('REQ-' + String(i).padStart(4, '0'), 'delivers', 'OUT-' + (i % 12)); }
  const t0 = performance.now();
  const BM = storyModel({artefacts, relationships});
  const F = foldStory(BM, {kind: 'system'}, defaultDepth(BM)), L = storyLayout(F);
  const FS = foldStory(BM, {kind: 'step', id: 'JRN-7'}), LS = storyLayout(FS);
  const FC = foldContext(BM), LC = contextLayout(FC);
  const ins = storyInsights(BM);
  const ms = performance.now() - t0;
  assert.equal(defaultDepth(BM), 'steps', 'a large import opens folded');
  assert.ok(F.cards.length <= 21 * 3, 'one card per slice of each step');
  checkMap(F, L, 'scale:steps'); checkMap(FS, LS, 'scale:JRN-7'); checkContext(FC, LC, 'scale:context'); checkFans(FC, LC, 'scale:context');
  assert.ok(ins.some(i => /are needed at no journey step/.test(i.text)));
  assert.ok(ms < 5000, 'model, three folds, three layouts and the insights in ' + Math.round(ms) + ' ms');
  pass(`a 1,200-requirement import over twenty steps opens folded to ${F.cards.length} cards (${L.W} × ${L.H}), opens one step with its ${FS.cards.length} requirements, and draws its context without a collision, in ${Math.round(ms)} ms`);
}

console.log(JSON.stringify({suite: 'chapter 1 model (requirements)', passed: checks.length, checks, limits: ['The model shows recorded journey steps, requirements, outcomes and limits. It does not judge whether a requirement is well written beyond the chapter\'s own checks.', 'The context shows people and outcomes recorded in Chapter 1; systems outside appear from Chapter 8 onwards.', 'The synthetic import is generated only for structure and scale.']}, null, 2));
