// Chapter 1 Model checks: the journey map (a story map) and the context, their slicing and layout,
// walking the journey, and what the model shows from recorded facts. Run: npm run test:story
import assert from 'node:assert/strict';
import {seedProject, proposals} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {storySource, storyModel, foldStory, foldContext, storyScope, storyInsights, describeStep, describeRequirement, defaultDepth, OFF, PROPOSED} from './public/story-model.js';
import {storyLayout, contextLayout, cardHeight, SX} from './public/story-layout.js';

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

// 5. Walking the journey, and reading a requirement.
assert.equal(describeStep(SM, 'JRN-003'), '03 Record the posting. No person takes part — the system acts alone. It needs REQ-003 Prevent duplicate financial effects (Must). That delivers OUT-002 Protect the financial effect. Next: 04 Settle the payment.');
assert.match(describeStep(Q, 'JRN-002'), /Next: 03 Record the posting — but no “precedes” relationship records that order\./);
assert.match(describeStep(SM, 'JRN-005'), /This is the last step of the journey\.$/);
assert.equal(describeRequirement(SM, 'REQ-004'), 'REQ-004 Retain an uncertain settlement outcome (Must) is needed at 04 Settle the payment and delivers OUT-001 A payment with a known outcome. It rests on ASM-001 Settlement status can be enquired. In Chapter 4, LR-004 Settlement hub covers it.');
assert.match(describeRequirement(SM, 'REQ-005'), /Its acceptance cannot be tested yet\./);
pass('the journey is walked step by step — who takes part, what each step needs, what it delivers and whether the order is recorded — and a requirement reads where it is needed, what it delivers, what it rests on and what covers it');

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
  checkMap(F, L, 'scale:steps'); checkMap(FS, LS, 'scale:JRN-7'); checkContext(FC, LC, 'scale:context');
  assert.ok(ins.some(i => /are needed at no journey step/.test(i.text)));
  assert.ok(ms < 5000, 'model, three folds, three layouts and the insights in ' + Math.round(ms) + ' ms');
  pass(`a 1,200-requirement import over twenty steps opens folded to ${F.cards.length} cards (${L.W} × ${L.H}), opens one step with its ${FS.cards.length} requirements, and draws its context without a collision, in ${Math.round(ms)} ms`);
}

console.log(JSON.stringify({suite: 'chapter 1 model (requirements)', passed: checks.length, checks, limits: ['The model shows recorded journey steps, requirements, outcomes and limits. It does not judge whether a requirement is well written beyond the chapter\'s own checks.', 'The context shows people and outcomes recorded in Chapter 1; systems outside appear from Chapter 8 onwards.', 'The synthetic import is generated only for structure and scale.']}, null, 2));
