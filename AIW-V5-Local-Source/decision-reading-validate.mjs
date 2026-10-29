// The decision reading (round 25, D-25-01 to D-25-08): what AIW reads when it weighs a decision's alternatives against
// its drivers, and what it never does (choose, change the project, or let knowledge weigh). Run: npm run test:decision-reading
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {createProject} from './shared/projects-domain.js';
import {applyDecisionCommand, decisionFindings, exportDecisionsMarkdown} from './public/decisions-domain.js';
import {applyQualityCommand, driverPriority} from './public/quality-domain.js';
import {applyKnowledgeCommand, knowledgeStamp} from './public/knowledge-governance.js';
import {weighOptions, readDecision, readingLines, WEIGHT, CLASSES, READING_NOTE} from './public/decision-reading.js';
import {suggestEffects, playbookOf} from './public/decision-suggestions.js';
import {tradeoffSource} from './public/tradeoff-model.js';
import {architectureDraftSchema} from './public/architecture-contract.js';
import {REFERENCE_PROJECTS} from './public/reference-projects.js';

const checks = [], pass = n => checks.push(n), at = '2026-10-15T09:00:00.000Z';
const clone = x => JSON.parse(JSON.stringify(x));
let seed = 7;
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = xs => xs[Math.floor(rand() * xs.length)];
const C3 = (ids, cls) => ids.map(id => ({id, cls, weight: WEIGHT[cls]}));
const scoreAt = (o, w) => Object.entries(w).reduce((n, [c, x]) => n + x * (o.values[c] ?? 0), 0);

// ---------------------------------------------------------------- 1. the core on constructed options
{
  // The order at the default weights, ties shared, the margin.
  const crit = [...C3(['a', 'b'], 'High'), ...C3(['c'], 'Medium'), ...C3(['e'], 'Low')];
  const W = weighOptions(crit, [{id: 'P', values: {a: 1, b: 0, c: 1, e: -1}}, {id: 'Q', values: {a: 1, b: 0, c: 0, e: 1}}, {id: 'R', values: {a: 1, b: 0, c: 0, e: 1}}, {id: 'S', values: {a: -1, b: -1, c: 0, e: 0}}]);
  assert.deepEqual(W.rows.map(r => [r.id, r.score, r.rank]), [['P', 4, 1], ['Q', 4, 1], ['R', 4, 1], ['S', -6, 4]], 'equal totals share a rank');
  assert.equal(W.lead, null); assert.deepEqual(W.tied, ['P', 'Q', 'R']); assert.equal(W.margin, null);
  const V = weighOptions(crit, [{id: 'P', values: {a: 1, b: 1, c: 1, e: 0}}, {id: 'Q', values: {a: 1, b: 0, c: 0, e: 1}}]);
  assert.equal(V.lead, 'P'); assert.equal(V.runnerUp, 'Q'); assert.equal(V.margin, 4);
  pass('the order at the default weights (High 3, Medium 2, Low 1): equal totals share a rank and lead no one; a lead names its runner-up and margin');

  // The three levels of how firmly a lead holds, on constructed cases.
  const L1 = weighOptions([...C3(['a', 'b'], 'High'), ...C3(['c'], 'Medium')], [{id: 'L', values: {a: 1, b: 0, c: 1}}, {id: 'B', values: {a: 0, b: 0, c: -1}}]);
  assert.equal(L1.firmness.level, 1); assert.equal(L1.firmness.swing, null);
  const L2 = weighOptions([...C3(['a', 'b'], 'High'), ...C3(['c'], 'Medium')], [{id: 'L', values: {a: 1, b: -1, c: 1}}, {id: 'B', values: {a: -1, b: 1, c: -1}}]);
  assert.equal(L2.lead, 'L'); assert.equal(L2.firmness.level, 2, 'two High drivers pulling apart: not every weighting the priorities allow');
  assert.deepEqual(L2.firmness.swing, {kind: 'within', cls: 'High', weighing: ['b']});
  const L3 = weighOptions([...C3(['h'], 'High'), ...C3(['m1', 'm2'], 'Medium')], [{id: 'L', values: {h: -1, m1: 1, m2: 1}}, {id: 'B', values: {h: 1, m1: -1, m2: -1}}]);
  assert.equal(L3.lead, 'L'); assert.equal(L3.firmness.level, 3, 'the Medium drivers outweigh the High one only at the default weights');
  assert.deepEqual(L3.firmness.swing, {kind: 'across', cls: 'High', weighing: ['h']});
  // A swing is a real weighting the priorities allow, and it puts the named alternative ahead of the leader.
  for (const W of [L2, L3]) { const w = Object.fromEntries(W.firmness.swing.weighing.map(c => [c, 1])), o = id => ({values: W === L2 ? {L: {a: 1, b: -1, c: 1}, B: {a: -1, b: 1, c: -1}}[id] : {L: {h: -1, m1: 1, m2: 1}, B: {h: 1, m1: -1, m2: -1}}[id]}); assert.ok(scoreAt(o('B'), w) > scoreAt(o('L'), w)); }
  pass('how firmly a lead holds: for every weighting the priorities allow (level 1), only if same-priority drivers count alike (level 2: two High drivers pulling apart), or only at the default weights (level 3); each swing names a weighting under which the other alternative comes ahead');

  // Exact, not sampled: a level-1 lead is never beaten under 1,000 random weightings that keep each High driver at least as
  // heavy as each Medium one and each Medium as each Low one; a level-2 lead never under 1,000 class-alike weightings.
  const crit2 = [...C3(['a', 'b'], 'High'), ...C3(['c', 'd'], 'Medium'), ...C3(['e'], 'Low')];
  let firm1 = 0, firm2 = 0;
  for (let t = 0; t < 600 && (firm1 < 20 || firm2 < 10); t++) {
    const opts = ['o1', 'o2', 'o3'].map(id => ({id, values: Object.fromEntries(crit2.map(c => [c.id, pick([-1, 0, 1])]))}));
    const W = weighOptions(crit2, opts); if (!W.lead) continue;
    const L = opts.find(o => o.id === W.lead);
    if (W.firmness.level === 1) { firm1++; for (let s = 0; s < 50; s++) { const l = rand(), m1 = l + rand(), m2 = l + rand(), m = Math.max(m1, m2), w = {a: m + rand(), b: m + rand(), c: m1, d: m2, e: l}; assert.ok(opts.every(o => scoreAt(o, w) <= scoreAt(L, w) + 1e-9), 'a level-1 lead holds under every weighting the priorities allow'); } }
    if (W.firmness.level <= 2) { firm2++; for (let s = 0; s < 50; s++) { const l = rand(), m = l + rand(), h = m + rand(), w = {a: h, b: h, c: m, d: m, e: l}; assert.ok(opts.every(o => scoreAt(o, w) <= scoreAt(L, w) + 1e-9), 'a level-2 lead holds when drivers of a priority count alike'); } }
  }
  assert.ok(firm1 >= 20 && firm2 >= 10, 'enough leads of both levels were drawn');
  pass(`exact, not sampled: ${firm1} level-1 leads each held under 50 random weightings that respect the priorities, and ${firm2} level-1 or level-2 leads under 50 class-alike weightings`);

  // Dominance needs no weights, and is robust over the unstated effects; as the effects stand it is provisional.
  const D = weighOptions([...C3(['a'], 'High'), ...C3(['b'], 'Medium'), {id: 'z', cls: null, weight: 0}], [{id: 'A', values: {a: 1, b: 0, z: 1}}, {id: 'B', values: {a: 0, b: 0, z: -1}}, {id: 'C', values: {a: 1, b: null, z: 0}}]);
  assert.deepEqual(D.dominated.get('B'), {by: 'A', robust: true, better: ['a', 'z'], unstated: []}, 'better on a weighed driver and on one left out of the weights alike');
  assert.equal(D.dominated.get('C')?.robust, false, 'C is dominated by A only as the effects stand: its effect on b is not stated');
  assert.deepEqual(D.dominated.get('C').unstated, [{of: 'C', criterion: 'b'}]);
  for (let t = 0; t < 300; t++) { const w = {a: rand(), b: rand(), z: rand()}; assert.ok(scoreAt({values: {a: 1, b: 0, z: 1}}, w) >= scoreAt({values: {a: 0, b: 0, z: -1}}, w)); }
  pass('dominance: at least as good on every driver and better on one, whatever the unstated effects turn out to be (no weights involved); as the effects stand it is provisional and names the unstated effects that could undo it');

  // What the unstated effects could do, at the default weights.
  const U = weighOptions(C3(['a', 'b'], 'Medium'), [{id: 'L', values: {a: 1, b: null}}, {id: 'B', values: {a: 0, b: null}}]);
  assert.equal(U.lead, 'L'); assert.equal(U.unknowns.couldChange, true); assert.deepEqual(U.unknowns.cells, [{of: 'L', criterion: 'b'}, {of: 'B', criterion: 'b'}]);
  const N = weighOptions([...C3(['a'], 'High'), ...C3(['b'], 'Low')], [{id: 'L', values: {a: 1, b: null}}, {id: 'B', values: {a: -1, b: null}}]);
  assert.equal(N.unknowns.couldChange, false, 'a High lead of 6 that a Low unknown on both sides (at most 2) cannot undo');
  pass('the unstated effects: each total bounded with them at worst and best; whether stating them could change the lead, and which ones');

  // The one-step sensitivity points are the brute-force ones.
  for (let t = 0; t < 200; t++) {
    const crit3 = [...C3(['a'], pick(CLASSES)), ...C3(['b'], pick(CLASSES)), ...C3(['c'], pick(CLASSES))], opts = ['x', 'y', 'z'].map(id => ({id, values: Object.fromEntries(crit3.map(c => [c.id, pick([-1, 0, 1, null])]))}));
    const W = weighOptions(crit3, opts), brute = [];
    for (const c of crit3) { const k = CLASSES.indexOf(c.cls); for (const to of [CLASSES[k - 1], CLASSES[k + 1]].filter(Boolean)) { const alt = weighOptions(crit3.map(x => (x.id === c.id ? {...x, cls: to, weight: WEIGHT[to]} : x)), opts).lead; if (alt !== W.lead) brute.push({criterion: c.id, to, before: W.lead, after: alt}); } }
    assert.deepEqual(W.sensitivity, brute);
  }
  pass('the one-step sensitivity points equal a brute-force recomputation on 200 random decisions');

  // The same reading whatever the order of the alternatives and the drivers; a dominated alternative added changes no lead.
  for (let t = 0; t < 200; t++) {
    const crit4 = [...C3(['a', 'b'], 'High'), ...C3(['c'], 'Medium'), ...C3(['d'], 'Low')], opts = ['p', 'q', 'r'].map(id => ({id, values: Object.fromEntries(crit4.map(c => [c.id, pick([-1, 0, 1, null])]))}));
    const W = weighOptions(crit4, opts), W2 = weighOptions([...crit4].reverse(), [...opts].reverse());
    const sig = X => ({lead: X.lead, tied: [...X.tied].sort(), level: X.firmness?.level ?? null, scores: Object.fromEntries(X.rows.map(r => [r.id, [r.score, r.low, r.high]])), dominated: Object.fromEntries([...X.dominated].map(([k, v]) => [k, v.robust]))});
    assert.deepEqual(sig(W2), sig(W));
    if (W.lead) { const L = opts.find(o => o.id === W.lead), worse = {id: 'w', values: Object.fromEntries(Object.entries(L.values).map(([k, v]) => [k, v === null ? -1 : Math.max(-1, v - (k === 'a' ? 1 : 0))]))}; if (worse.values.a < (L.values.a ?? -1) || Object.keys(L.values).some(k => (L.values[k] ?? 0) > worse.values[k])) { const W3 = weighOptions(crit4, [...opts, worse]); assert.equal(W3.lead, W.lead); assert.equal(W3.firmness?.level, W.firmness?.level); } }
  }
  pass('the same reading whatever the order of the alternatives and the drivers; an alternative the leader dominates, added, changes neither the lead nor how firmly it holds');
}

// ---------------------------------------------------------------- 2. a decision, read: the seed project
const base = withFinalReview(seedProject()), before = JSON.stringify(base);
const dcmd = (p, type, payload) => applyDecisionCommand(p, {type: 'decision.' + type, payload}, at).document;
const qcmd = (p, type, payload) => applyQualityCommand(p, {type: 'quality.' + type, payload}, at).document;
{
  // The reading agrees with the tally it replaces wherever the old one was sound: an oracle of the round-24 arithmetic.
  const OLD = {High: 3, Medium: 2, Low: 1, '': 0}, EFF = {supports: 1, tension: -1};
  const oldTally = (p, d, over = {}) => { const pr = id => over[id] ?? driverPriority(p.quality.drivers.find(x => x.id === id)); const rows = d.alternatives.map(a => ({id: a.id, score: d.driverIds.reduce((n, id) => n + (OLD[pr(id)] ?? 1) * (EFF[a.assessments?.[id]?.effect] || 0), 0)})); const m = Math.max(...rows.map(r => r.score)), top = rows.filter(r => r.score === m); return {rows, favoured: rows.length > 1 && top.length === 1 ? top[0].id : null}; };
  const templates = ['bank-payment', ...REFERENCE_PROJECTS.map(x => x.id)], projects = [base, ...templates.map(t => withFinalReview(createProject({name: 'Reference ' + t, template: t}, 'dr-' + t, at)))];
  assert.equal(projects.length, 7, 'the seed and every reference project');
  let compared = 0, sensitivities = 0;
  for (const p of projects) for (const d of p.decisions.records) {
    const r = readDecision(p, d), o = oldTally(p, d);
    assert.equal(r.lead, o.favoured, d.id + ' leads as the old tally favoured');
    assert.deepEqual(r.rows.map(x => [x.id, x.score]), o.rows.map(x => [x.id, x.score]), d.id + ' totals');
    const oldSens = d.driverIds.filter(id => CLASSES.includes(driverPriority(p.quality.drivers.find(x => x.id === id)))).flatMap(id => { const k = CLASSES.indexOf(driverPriority(p.quality.drivers.find(x => x.id === id))); return [CLASSES[k - 1], CLASSES[k + 1]].filter(Boolean).flatMap(to => { const after = oldTally(p, d, {[id]: to}).favoured; return after !== o.favoured ? [{driverId: id, to, before: o.favoured, after}] : []; }); });
    assert.deepEqual(r.sensitivity, oldSens, d.id + ' sensitivity points'); compared++; sensitivities += oldSens.length;
  }
  assert.ok(compared >= 12, compared + ' decisions compared');
  pass(`on ${projects.length} reference project${projects.length === 1 ? '' : 's'} (${compared} decisions) the reading leads where the round-24 tally favoured, with the same totals and the same ${sensitivities} one-step sensitivity points`);
  assert.equal(JSON.stringify(base), before, 'reading changes nothing');
}
{
  // A driver with no stated priority weighs nothing and is named (GR-DRV-02); a link to one that no longer exists too.
  let p = clone(base);
  p.quality.drivers.find(d => d.id === 'QD-006').priority = '';
  p.decisions.records.find(d => d.id === 'ADR-001').driverIds.push('QD-099');
  const r = readDecision(p, p.decisions.records.find(d => d.id === 'ADR-001'));
  assert.deepEqual(r.leftOut, ['QD-006']); assert.deepEqual(r.missing, ['QD-099']);
  assert.ok(r.rows.every(x => x.parts.find(q => q.driverId === 'QD-006').weight === 0 && !x.parts.some(q => q.driverId === 'QD-099')));
  const lines = readingLines(r).map(l => l.kind + ': ' + l.text);
  assert.ok(lines.includes('left-out: QD-006 weighs nothing: no priority is stated.') && lines.includes('missing: QD-099 no longer exists and weighs nothing.'), lines.join('\n'));
  pass('a driver with no stated priority weighs nothing and the reading names it (GR-DRV-02); a link to a driver that no longer exists weighs nothing (it weighed 1 before) and is named');
}
{
  // Hard constraints (D-25-03): "breaks" only against a constraint driver; a hard one rules the alternative out.
  let p = qcmd(base, 'driver', {kind: 'constraint', title: 'Runs in the bank\'s own data centres', description: 'Hosting is on premises.', impact: 'Rules out a public cloud runtime.', constraintIds: ['CON-001'], priority: 'High'});
  const C = p.quality.drivers.at(-1).id;
  p = dcmd(p, 'save', {id: 'ADR-001', driverIds: [...p.decisions.records.find(d => d.id === 'ADR-001').driverIds, C]});
  assert.throws(() => dcmd(p, 'alternative', {id: 'ADR-001', alternativeId: 'ALT-002', assessments: {'QD-002': {effect: 'violates', reason: 'x', evidence: 'y'}}}), /“Breaks it” is for a constraint/);
  p = dcmd(p, 'alternative', {id: 'ADR-001', alternativeId: 'ALT-002', assessments: {...p.decisions.records.find(d => d.id === 'ADR-001').alternatives.find(a => a.id === 'ALT-002').assessments, [C]: {effect: 'violates', reason: 'Needs a public cloud region.', evidence: 'Hosting assessment.'}}});
  const read = q => readDecision(q, q.decisions.records.find(d => d.id === 'ADR-001'));
  let r = read(p);
  assert.deepEqual(r.ruledOut, [{id: 'ALT-002', breaks: [C]}]); assert.equal(r.state, 'only'); assert.equal(r.lead, 'ALT-001', 'the only alternative that meets the constraint');
  assert.ok(!readingLines(r).some(l => l.kind === 'force'), 'a Must binds without comment');
  const soft = clone(p); soft.artefacts.find(a => a.id === 'CON-001').priority = 'Should';
  r = read(soft); assert.deepEqual(r.ruledOut, []); assert.equal(r.rows.find(x => x.id === 'ALT-002').parts.find(q => q.driverId === C).score, -3, 'breaking a soft constraint counts as tension');
  const unstated = clone(p); unstated.artefacts.find(a => a.id === 'CON-001').priority = '';
  r = read(unstated); assert.deepEqual(r.ruledOut.map(x => x.id), ['ALT-002']);
  assert.ok(readingLines(r).some(l => l.kind === 'force' && /no priority is stated for its constraint record/.test(l.text)));
  const unlinked = clone(p); unlinked.quality.drivers.find(d => d.id === C).constraintIds = [];
  assert.ok(readingLines(read(unlinked)).some(l => l.kind === 'force' && /links no constraint record/.test(l.text)));
  pass('"breaks" is refused against a driver that is not a constraint; breaking a hard constraint (a Must, or a constraint whose priority nobody stated, or a constraint driver with no record) rules the alternative out and the reading says why it binds; breaking a Should counts as tension');

  // The working choice and the reading (D-25-07): breaking a hard constraint blocks acceptance; a dominated choice warns.
  // Every effect of the choice carries a reason and evidence, so "breaks" is the only error the decision has.
  const alt2 = p.decisions.records.find(d => d.id === 'ADR-001').alternatives.find(a => a.id === 'ALT-002');
  let w = dcmd(p, 'alternative', {id: 'ADR-001', alternativeId: 'ALT-002', assessments: Object.fromEntries(Object.entries(alt2.assessments).map(([k, v]) => [k, {...v, reason: v.reason || 'Judged in the workshop.', evidence: v.evidence || 'Workshop notes.'}]))});
  w = dcmd(w, 'choose', {id: 'ADR-001', alternativeId: 'ALT-002'});
  w = dcmd(w, 'save', {id: 'ADR-001', rationale: 'Chosen for the drivers.', owner: 'Lead architect', context: 'Context.', source: 'Workshop.'});
  const errors = q => decisionFindings(q).filter(x => x.decisionId === 'ADR-001' && x.level === 'error');
  assert.deepEqual(errors(w).map(x => x.code), ['breaks']); assert.deepEqual(errors(w)[0].driverIds, [C]);
  w = dcmd(w, 'record', {id: 'ADR-001'});
  assert.throws(() => dcmd(w, 'accept', {id: 'ADR-001', acknowledge: true}), /Resolve this decision’s content and conflict gaps/, 'a choice that breaks a hard constraint cannot be accepted');
  const softened = clone(w); softened.artefacts.find(a => a.id === 'CON-001').priority = 'Should';
  assert.deepEqual(errors(softened), [], 'a Should does not bind');
  assert.equal(dcmd(softened, 'accept', {id: 'ADR-001', acknowledge: true}).decisions.records.find(d => d.id === 'ADR-001').status, 'accepted', 'with the constraint softened by a person, the same choice can be accepted');
  // A dominated working choice: ADR-003's ALT-006 is in tension with every driver ALT-005 supports.
  const dom = dcmd(base, 'choose', {id: 'ADR-003', alternativeId: 'ALT-006'}), g = decisionFindings(dom).find(x => x.code === 'dominated' && x.decisionId === 'ADR-003');
  assert.equal(g?.level, 'warning'); assert.equal(g.dominatedBy, 'ALT-005');
  assert.equal(readDecision(dom, dom.decisions.records.find(d => d.id === 'ADR-003')).choice.standing, 'dominated');
  pass('a working choice that breaks a hard constraint is an error finding (acceptance and approval refuse it); one another alternative dominates is a warning naming the dominating one');
}
{
  // The drafted marks (D-25-09): an assessment AIW's rules drafted (by: 'rules'), like one Sol drafted (by: 'sol'), keeps
  // its mark while it is not sent again and on Sol's own proposal; sent again by a person on their own decision, it is
  // theirs. No other mark survives.
  const alt = q => q.decisions.records.find(d => d.id === 'ADR-001').alternatives.find(a => a.id === 'ALT-001');
  const marked = by => { const q = clone(base); for (const v of Object.values(alt(q).assessments)) v.by = by; return q; };
  for (const by of ['rules', 'sol']) {
    const p = marked(by);
    assert.ok(Object.keys(alt(p).assessments).length > 1);
    const kept = dcmd(p, 'alternative', {id: 'ADR-001', alternativeId: 'ALT-001', title: 'Renamed by a person'});
    assert.equal(alt(kept).title, 'Renamed by a person');
    assert.ok(Object.values(alt(kept).assessments).every(v => v.by === by), by + ': not sent again, the mark stays');
    const sent = dcmd(p, 'alternative', {id: 'ADR-001', alternativeId: 'ALT-001', assessments: alt(p).assessments});
    assert.ok(Object.values(alt(sent).assessments).every(v => !Object.hasOwn(v, 'by')), by + ': sent again by a person on their own decision, the assessment is theirs');
    const proposed = clone(p), d = proposed.decisions.records.find(x => x.id === 'ADR-001');
    Object.assign(d, {state: 'proposed', provenance: {...d.provenance, draft: {by: 'sol', engine: 'rules'}}});
    const redrafted = dcmd(proposed, 'alternative', {id: 'ADR-001', alternativeId: 'ALT-001', assessments: alt(proposed).assessments});
    assert.ok(Object.values(alt(redrafted).assessments).every(v => v.by === by), by + ': on Sol\'s own proposal, the mark stays');
    const r = readDecision(p, p.decisions.records.find(x => x.id === 'ADR-001'));
    assert.ok(Object.keys(alt(p).assessments).every(id => !r.drivers.some(x => x.id === id) || r.rows.find(x => x.id === 'ALT-001').parts.some(q => q.driverId === id)));
    // The decision register says whose an assessment no person has reviewed is.
    assert.match(exportDecisionsMarkdown(p), by === 'rules' ? /\(drafted by AIW’s rules from the SA Playbook, not reviewed by a person\)/ : /\(assessed by Sol, not reviewed by a person\)/, by + ': the register marks it');
    assert.ok(!/not reviewed by a person/.test(exportDecisionsMarkdown(sent)), by + ': and a person\'s is not marked');
  }
  const forged = dcmd(marked('someone'), 'alternative', {id: 'ADR-001', alternativeId: 'ALT-001', title: 'Renamed'});
  assert.ok(Object.values(alt(forged).assessments).every(v => !Object.hasOwn(v, 'by')), 'a mark other than Sol\'s or the rules\' is dropped');
  pass('an assessment drafted by AIW\'s rules keeps its mark as Sol\'s does: while not sent again and on Sol\'s own proposal; a person\'s send makes it theirs, and no other mark survives');
}
{
  // Sol's contract keeps its four effects: a model never rules an alternative out.
  const schema = JSON.stringify(architectureDraftSchema({requirements: [], upstream: [], passages: [], concerns: [], skeleton: [], platform: {services: []}}));
  assert.ok(schema.includes('"tension"') && !schema.includes('"violates"'));
  pass('Sol\'s drafting contract offers supports, tension, neutral and unknown, never "breaks": whether an alternative breaks a hard constraint is a person\'s to record');
}

{
  // The reading in words reads as written in a document (found by W3 in print): each sentence starts with a capital; one
  // unstated effect is "it"; when only some unstated effects could change the lead, those are named; an accepted
  // decision's choice is the chosen alternative; the only alternative not ruled out is not said to meet a hard constraint
  // its effect on which is not stated.
  const D = (id, priority, extra = {}) => ({id, title: id, kind: 'quality', priority, requirementIds: [], ...extra});
  const A = (id, eff) => ({id, title: id, assessments: Object.fromEntries(Object.entries(eff).map(([k, v]) => [k, {effect: v, reason: '', evidence: ''}]))});
  const doc = (drivers, alts, extra = {}) => ({artefacts: [{id: 'CON-001', type: 'constraint', title: 'On premises', priority: 'Must'}], quality: {drivers}, decisions: {records: [{id: 'ADR-1', question: 'Q', driverIds: drivers.map(d => d.id), alternatives: alts, ...extra}]}});
  const words = p => readingLines(readDecision(p, p.decisions.records[0])).map(l => l.kind + ': ' + l.text);
  const two = [D('QD-1', 'High'), D('QD-2', 'High')];
  let w = words(doc(two, [A('ALT-1', {'QD-1': 'supports'}), A('ALT-2', {'QD-1': 'neutral', 'QD-2': 'neutral'})]));
  assert.ok(w.includes('unknowns: One weighed effect is not stated; stating it could change the lead: ALT-1’s on QD-2.'), w.join('\n'));
  const three = [...two, D('QD-3', 'High')];
  w = words(doc(three, [A('ALT-1', {'QD-1': 'supports', 'QD-3': 'neutral'}), A('ALT-2', {'QD-1': 'neutral', 'QD-2': 'neutral', 'QD-3': 'neutral'}), A('ALT-3', {'QD-1': 'tension', 'QD-3': 'tension'})]));
  assert.ok(w.includes('unknowns: Two weighed effects are not stated; stating ALT-1’s on QD-2 could change the lead.'), w.join('\n'));
  assert.ok(w.every(l => /^[a-z-]+: [A-Z]/.test(l)), 'every sentence starts with a capital: ' + w.join('\n'));
  const lead = [A('ALT-1', {'QD-1': 'supports', 'QD-2': 'supports'}), A('ALT-2', {'QD-1': 'tension', 'QD-2': 'neutral'})];
  assert.ok(words(doc(two, lead, {selectedAlternativeId: 'ALT-1', status: 'draft'})).includes('choice: The working choice, ALT-1, leads on the drivers.'));
  assert.ok(words(doc(two, lead, {selectedAlternativeId: 'ALT-1', status: 'accepted'})).includes('choice: The chosen alternative, ALT-1, leads on the drivers.'));
  const bound = [D('QD-1', 'High'), D('C-1', 'High', {kind: 'constraint', constraintIds: ['CON-001']})];
  w = words(doc(bound, [A('ALT-1', {'QD-1': 'supports'}), A('ALT-2', {'QD-1': 'supports', 'C-1': 'violates'})]));
  assert.ok(w.includes('lead: ALT-1 is the only alternative a hard constraint does not rule out.') && w.includes('unshown: Whether ALT-1 meets C-1 is not stated.') && !w.some(l => /ALT-1 is the only alternative that meets/.test(l)), w.join('\n'));
  w = words(doc(bound, [A('ALT-1', {'QD-1': 'supports', 'C-1': 'supports'}), A('ALT-2', {'QD-1': 'supports', 'C-1': 'violates'})]));
  assert.ok(w.includes('lead: ALT-1 is the only alternative that meets the hard constraints.'), w.join('\n'));
  pass('the reading in words reads as written: a capital at the start of every sentence, "it" for one unstated effect, the effects named when only some could change the lead, the chosen alternative of an accepted decision, and the only alternative not ruled out not said to meet a constraint it is not shown to meet');
}

// ---------------------------------------------------------------- 3. it never chooses, never changes the project, and knowledge never weighs
{
  const p = clone(base), b4 = JSON.stringify(p);
  for (const d of p.decisions.records) { readingLines(readDecision(p, d)); suggestEffects(p, d); }
  tradeoffSource(p);
  assert.equal(JSON.stringify(p), b4, 'reading, wording and suggesting change nothing');
  const words = p.decisions.records.flatMap(d => readingLines(readDecision(p, d)).map(l => l.text)).join(' ');
  assert.ok(!/recommend|approv|you should|AIW chooses|best choice/i.test(words), words);
  assert.match(READING_NOTE, /does not choose/);
  const src = readFileSync('./public/decision-reading.js', 'utf8'), imports = [...src.matchAll(/from '\.\/([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(imports, ['util.js', 'document-memo.js', 'quality-domain.js'], 'the reading imports no knowledge, playbook, catalogue or Brain module');
  pass('the reading never chooses (its words recommend and approve nothing) and changes nothing; it imports no knowledge, playbook, catalogue or Brain module, so knowledge cannot weigh');
}

// ---------------------------------------------------------------- 4. suggested effects (D-25-08)
{
  // The playbook: a strong mark suggests supports, a conditional one asks; never counted.
  let p = clone(base);
  p = qcmd(p, 'driver', {title: 'Easy to change', category: 'maintainability', stimulus: 'A rule changes.', response: 'One module changes.', metric: 'Modules touched', operator: 'At most', targetValue: '1', unit: 'modules', priority: 'High'});
  const M = p.quality.drivers.at(-1).id;
  p = qcmd(p, 'driver', {title: 'Testable alone', category: 'testability', stimulus: 'A release.', response: 'Each part is tested alone.', metric: 'Parts tested alone', operator: 'At least', targetValue: '90', unit: '%', priority: 'Medium'});
  const T = p.quality.drivers.at(-1).id;
  p = dcmd(p, 'save', {question: 'Which architecture style should structure this design?', topic: 'style', context: 'Style.', driverIds: [M, T], requirementIds: [p.artefacts.find(a => a.type === 'requirement').id]});
  const id = p.decisions.records.at(-1).id;
  p = dcmd(p, 'alternative', {id, title: 'Adopt the Layered style', strategy: 'style:S-LAYERED', pattern: 'Layered', summary: 's', benefits: 'b', costs: 'c', consequences: 'q'});
  p = dcmd(p, 'alternative', {id, title: 'Adopt the Microservices style', pattern: 'Microservices', summary: 's', benefits: 'b', costs: 'c', consequences: 'q'});
  const d = p.decisions.records.find(x => x.id === id), b4 = JSON.stringify(readDecision(p, d).rows.map(r => [r.id, r.score]));
  const S = suggestEffects(p, d), layered = d.alternatives[0].id;
  const m = S.cells.find(c => c.alternativeId === layered && c.driverId === M), t = S.cells.find(c => c.alternativeId === layered && c.driverId === T);
  assert.equal(m.effect, 'supports'); assert.equal(m.suggestions[0].from, 'playbook'); assert.match(m.suggestions[0].evidence, /SA Playbook, Arch Style \+ Quality Props/);
  assert.equal(t.effect, null); assert.equal(t.suggestions[0].ask, true, 'a conditional mark is not support: it asks whether the condition holds');
  assert.equal(JSON.stringify(readDecision(p, d).rows.map(r => [r.id, r.score])), b4, 'a suggestion is never counted');
  assert.ok(S.hypothesis && typeof S.hypothesis.changes === 'boolean');
  // A pattern is a whole word of the alternative's pattern (a plural too), never inside another word; an alternative a
  // released design concern offers follows none of the Playbook's, whatever its concern's title says.
  const names = pattern => playbookOf({pattern}).patterns.map(x => x.name);
  assert.deepEqual(names('A facade over the core'), ['Facade']); assert.deepEqual(names('Facades'), ['Facade']);
  assert.deepEqual(names('Intermediators'), [], 'not inside another word');
  assert.deepEqual(playbookOf({pattern: 'Released design concern · Throttling and the Facade'}), {style: null, patterns: []}, 'a concern\'s option follows no Playbook pattern');
  pass('the SA Playbook\'s strong mark suggests supports, with its cell; its conditional mark suggests nothing and asks whether the condition holds; no suggestion is counted, and the hypothesis of recording them is labelled as one; a pattern is read as a whole word of the alternative\'s pattern, and a design concern\'s option follows none');

  // Released knowledge: a candidate claim linked to nothing suggests nothing; a released, eligible claim the alternative links does.
  let k = applyQualityCommand(withFinalReview(createProject({name: 'Synthetic reading project', template: 'blank'}, 'reading-fixture', at)), {type: 'quality.driver', payload: {title: 'Recover quickly', category: 'recoverability', stimulus: 'A node fails.', response: 'Service resumes.', metric: 'Recovery time', operator: 'At most', targetValue: '5', unit: 'minutes', priority: 'High'}}, at).document;
  const R = k.quality.drivers[0].id;
  k = applyKnowledgeCommand(k, {type: 'knowledge.source', payload: {title: 'Synthetic recovery note', body: 'Synthetic recovery note\nA warm standby replica restores service within minutes after a node failure.\n', path: 'synthetic/recovery.txt', revision: '1', license: 'Synthetic test material'}}, at, 'author').document;
  k = applyKnowledgeCommand(k, {type: 'knowledge.claim', payload: {sourceId: k.knowledge.sources[0].id, lineStart: 2, lineEnd: 2, subjectId: 'pattern:warm-standby', predicate: 'supports', claimType: 'benefit', polarity: 'supports', statement: 'A warm standby replica restores service within minutes after a node failure.', conditions: ['The standby is kept in step with the primary.'], limitations: ['A failure of both sites is not covered.'], tags: [], architectureUnit: {kind: 'pattern', mechanism: 'A warm standby replica takes over after a failure.', effects: [{quality: 'Recoverability', direction: 'supports', rationale: 'Service resumes on the standby.'}], obligations: [{action: 'Test failover to the standby.', evidence: 'A failover test record.'}]}}}, at, 'author').document;
  k = dcmd(k, 'save', {question: 'How should the service recover?', context: 'c', driverIds: [R], requirementIds: []});
  const kd = k.decisions.records[0].id;
  k = dcmd(k, 'alternative', {id: kd, title: 'Warm standby', summary: 's', benefits: 'b', costs: 'c', consequences: 'q'});
  k = dcmd(k, 'alternative', {id: kd, title: 'Restore from backup', summary: 's', benefits: 'b', costs: 'c', consequences: 'q'});
  const warm = k.decisions.records[0].alternatives[0].id;
  assert.deepEqual(suggestEffects(k, k.decisions.records[0]).cells, [], 'a candidate claim suggests nothing');
  const reviewed = {reviewed: true, reviewer: 'Second reviewer', reason: 'Verified source and limited interpretation.'};
  k = applyKnowledgeCommand(k, {type: 'knowledge.review', payload: {id: k.knowledge.claims[0].id, ...reviewed, decision: 'verified', sourceChecked: true, rightsChecked: true, conditionsChecked: true, interpretationChecked: true}}, at, 'reviewer').document;
  k = applyKnowledgeCommand(k, {type: 'knowledge.release', payload: {...reviewed, title: 'Synthetic recovery', claimIds: [k.knowledge.claims[0].id]}}, at, 'author').document;
  k = applyKnowledgeCommand(k, {type: 'knowledge.activate', payload: {...reviewed, id: k.knowledge.releases[0].id, stamp: knowledgeStamp(k)}}, at, 'author').document;
  const rb4 = JSON.stringify(readDecision(k, k.decisions.records[0]).rows.map(r => [r.id, r.score]));
  assert.deepEqual(suggestEffects(k, k.decisions.records[0]).cells, [], 'released but not linked to the alternative: nothing');
  k = applyKnowledgeCommand(k, {type: 'knowledge.link', payload: {...reviewed, claimId: k.knowledge.claims[0].id, releaseId: k.knowledge.releases[0].id, objectId: warm}}, at, 'author').document;
  const KS = suggestEffects(k, k.decisions.records[0]), cell = KS.cells.find(c => c.alternativeId === warm && c.driverId === R);
  assert.equal(cell?.effect, 'supports'); assert.equal(cell.suggestions[0].from, 'claim'); assert.match(cell.suggestions[0].evidence, /Released claim/);
  assert.equal(JSON.stringify(readDecision(k, k.decisions.records[0]).rows.map(r => [r.id, r.score])), rb4, 'released knowledge suggests and never weighs');
  assert.equal(KS.hypothesis.lead, warm, 'recorded, the suggestion would put the warm standby ahead: a labelled hypothesis');
  const off = applyKnowledgeCommand(k, {type: 'knowledge.deactivate', payload: {...reviewed, id: k.knowledge.releases[0].id, stamp: knowledgeStamp(k)}}, at, 'author').document;
  assert.deepEqual(suggestEffects(off, off.decisions.records[0]).cells, [], 'a release no longer active suggests nothing');
  pass('released knowledge: a candidate claim suggests nothing, nor a released one the alternative does not link; a released, eligible claim it links suggests the effect its architecture unit states, with its receipt, and moves no total; deactivated, it suggests nothing');
}

console.log(`PASS decision reading: ${checks.length} checks\n- ` + checks.join('\n- '));
