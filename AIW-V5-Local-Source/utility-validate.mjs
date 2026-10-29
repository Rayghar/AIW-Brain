// Chapter 2 Model checks: the structured SA Playbook, design reasoning over the recorded design,
// the utility tree, "What if" tuning and both layouts. Run: npm run test:utility
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyQualityCommand, qualityProposals, QUALITY_TYPES, playbookDriverProposal} from './public/quality-domain.js';
import {PLAYBOOK, ATTRIBUTES, TACTICS, STYLES, PATTERNS, ANTI_PATTERNS, STYLE_KEY, PATTERN_KEY, DECISION_TEMPLATE, FAMILIES, attribute, tacticsFor} from './public/playbook-knowledge.js';
import {reasoningSource, driverChain, driverTactics, tuneDriver, describeTuning, targetSteps, availabilityBudget, windowDays, tacticsForAttribute} from './public/design-reasoning.js';
import {readDecision} from './public/decision-reading.js';
import {applyDecisionCommand} from './public/decisions-domain.js';
import {utilitySource, foldUtility, utilityScope, utilityInsights, describeDriver, sensitivity, defaultDepth, ROOT, PROPOSED} from './public/utility-model.js';
import {utilityLayout, tuneLayout, rippleCards, treeWires, UT, TU} from './public/utility-layout.js';
import {mergeWires, wireConflicts} from './public/wire-merge.js';

const checks = [], pass = n => checks.push(n);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const clone = x => structuredClone(x);
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// 1. The playbook, structured with its locators.
assert.equal(PLAYBOOK.files[0].file, 'SA Playbook_v2.xlsx'); assert.match(PLAYBOOK.files[0].sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(ATTRIBUTES.map(a => a.id), ['integrity', 'availability', 'recoverability', 'performance', 'scalability', 'security', 'traceability', 'maintainability', 'testability', 'deployability', 'usability', 'interoperability']);
assert.deepEqual(ATTRIBUTES.filter(a => a.guide).map(a => a.id).sort(), ['availability', 'deployability', 'maintainability', 'performance', 'scalability', 'usability']);
for (const a of ATTRIBUTES) { assert.ok(FAMILIES.some(f => f.id === a.family)); if (a.guide) { assert.ok(a.guide.definition && a.guide.metrics.length && a.guide.decisions.length && a.guide.technologies.length && a.guide.src.startsWith('QR-Guidebook!')); assert.ok(a.tradeoffs.length >= 3 && a.tradeoffSrc.startsWith('Quality Requirements!'), a.id); } else assert.ok(a.note, a.id + ' says why the playbook is silent'); }
assert.match(attribute('availability').guide.definition, /^The degree to which a system is operational and accessible/);
assert.ok(attribute('performance').guide.technologies.some(t => t.names.includes('Redis') || t.names.some(n => /Redis/.test(n))), 'the playbook names the technologies for an attribute');
assert.ok(TACTICS.length >= 50 && TACTICS.every(t => t.concept && t.src && t.cues.length && attribute(t.attribute)));
assert.deepEqual(tacticsFor('availability').filter(t => t.kind === 'tactic').map(t => t.name), ['Heartbeat', 'Timestamp', 'Self-test', 'Redundancy', 'Rollback', 'Degradation', 'Shadow', 'Removal from service', 'Predictive model']);
assert.deepEqual([...new Set(tacticsFor('availability').map(t => t.group))], ['Detect faults', 'Recover from faults', 'Prevent faults', 'Design decisions']);
assert.equal(tacticsForAttribute('recoverability').length, 7, 'recoverability reads the playbook\'s recovery tactics');
assert.deepEqual(STYLES.map(s => s.name), ['Layered', 'Microkernel', 'Modular Monolith', 'SOA', 'Microservices']);
assert.ok(STYLES.every(s => Object.values(s.effects).every(m => m === 'x' || m === '(x)') && s.questions.length >= 4));
assert.deepEqual(STYLES.find(s => s.name === 'Microservices').effects, {deployability: 'x', interoperability: 'x', maintainability: 'x', scalability: 'x', testability: 'x'});
assert.match(STYLE_KEY['(x)'], /conditional/); assert.match(PATTERN_KEY.x, /directly contributes/);
assert.equal(PATTERNS.length, 14); assert.deepEqual(PATTERNS.find(p => p.name === 'Standby').effects, {availability: 'x'});
assert.deepEqual(ANTI_PATTERNS.map(a => a.name), ['Tight Coupling', 'God Services', 'Duplicated Code', 'Lack of Documentation']);
assert.deepEqual(DECISION_TEMPLATE.fields, ['Decision ID', 'Decision Name', 'Decision Description', 'Rationale', 'Assumptions and Risks', 'Scaling', 'Trade-offs']);
pass('the SA Playbook is structured with a locator for every entry: 12 quality attributes in 5 families (6 with the guidebook\'s definition, measures, example targets, design decisions, technologies, tests, risks and trade-offs), 56 tactics and design decisions by attribute, the style × quality and pattern × quality tables with their marks, its anti-patterns and its decision template');

// 2. One chain for every driver, through every chapter that carries it.
const R = reasoningSource(project);
const c2 = driverChain(R, 'QD-002');
// rc39: the chain's responsibilities are the driver's scope (driver-scope.js): the ones it names (api, hub) and the ones
// reached through the decisions that cite it (ADR-001 is linked by notify), never fewer.
assert.deepEqual(c2.responsibilities.map(r => r.ref), ['LR-001', 'LR-004', 'LR-005'], 'QD-002 reaches the responsibilities it names and those its citing decisions link'); assert.deepEqual(c2.components.map(c => c.ref), ['APP-001', 'APP-004', 'APP-005'], 'and the components that realise those three responsibilities');
assert.ok(c2.plans.some(f => f.plan.ref === 'RUN-001') && c2.plans.some(f => f.plan.ref === 'RUN-004'));
assert.deepEqual(c2.realisations.map(r => r.product?.product).filter(Boolean), ['Kubernetes', 'PostgreSQL', 'RabbitMQ', 'Kong Gateway', 'Keycloak', 'OpenTelemetry · Prometheus · Grafana', 'pgBackRest', 'Patroni']);
assert.deepEqual(c2.decisions.map(x => x.record.id), ['ADR-001']);
assert.equal(c2.decisions[0].alternatives.find(a => a.alt.id === 'ALT-001').effect, 'tension');
const t2 = driverTactics(R, 'QD-002');
assert.deepEqual(t2.filter(t => t.state === 'named').map(t => t.tactic.name), ['Heartbeat', 'Redundancy', 'Degradation', 'Failover Mechanisms']);
assert.ok(t2.find(t => t.tactic.name === 'Heartbeat').evidence.every(e => e.ref === 'QD-002' && /Health checks/.test(e.excerpt)), 'evidence quotes where the tactic is named');
assert.deepEqual(driverTactics(R, 'QD-003').filter(t => t.state === 'considered').map(t => t.tactic.name), ['Introduce concurrency'], 'a tactic only in a rejected or open alternative is "considered", not named');
assert.equal(driverTactics(R, 'QD-004').filter(t => t.state !== 'open').length, 0);
assert.deepEqual(driverTactics(R, 'QD-001'), [], 'the playbook has no integrity tactics, and none are invented');
pass('every driver has one chain through the design — requirements, Chapter 4 responsibilities, Chapter 5 components, Chapter 6 capabilities, Chapter 7 products, Chapter 10 plans, Chapter 3 decisions — and the playbook\'s tactics are found in it only with quoted evidence, telling named from merely considered');

// 3. What if: arithmetic on recorded facts.
assert.equal(Math.round(availabilityBudget('99.9', 30) * 10) / 10, 43.2); assert.equal(Math.round(availabilityBudget('99.99', 30) * 100) / 100, 4.32);
assert.deepEqual(windowDays({window: 'Over an illustrative 30-day service window'}), {days: 30, stated: true}); assert.deepEqual(windowDays({window: ''}), {days: 30, stated: false});
let T = tuneDriver(R, 'QD-002', {targetValue: '99.99'});
assert.equal(T.direction, 1); assert.match(T.budget.text, /99\.99 % over 30 days allows 4\.3 minutes of unavailability; 99\.9 % allowed 43\.2/);
assert.ok(T.effects.filter(e => e.kind === 'plan').every(e => e.state === 'unknown'), 'nothing recorded, nothing claimed');
assert.equal(T.effects.find(e => e.id === 'ADR-001').state, 'revisit');
assert.deepEqual(T.tradeoffs.filter(t => t.drivers.length).map(t => t.with + ':' + t.drivers.map(d => d.id)), ['Performance:QD-003', 'Security:QD-005']);
assert.match(describeTuning(T), /^Moving QD-002 from At least 99\.9 to 99\.99 %: 1 to revisit, \d+ not recorded\.$/);
// With a recorded recovery time, one replica holds at 99.9 % and stops holding at 99.99 %.
const p1 = clone(project); Object.assign(p1.runtime.plans.find(r => r.id === 'run-001'), {recoveryMinutes: 10, recoveryStrategy: 'Restart'});
T = tuneDriver(reasoningSource(p1), 'QD-002', {targetValue: '99.99'});
let e = T.effects.find(x => x.id === 'run-001');
assert.deepEqual([e.was, e.state], ['holds', 'breaks']); assert.match(e.why, /one restart recovery \(10 min\) is more than the whole budget \(4\.3 min\)/);
// A second active replica in the other zone makes it hold again.
p1.runtime.placements.push({id: 'PL-X', planId: 'run-001', zoneId: 'zone-b', role: 'active', replicas: 1});
e = tuneDriver(reasoningSource(p1), 'QD-002', {targetValue: '99.99'}).effects.find(x => x.id === 'run-001');
assert.equal(e.state, 'holds'); assert.match(e.why, /2 active replicas across 2 zones/);
// Recovery and response-time targets compare with recorded recovery times and timeouts.
const p2 = clone(project); Object.assign(p2.runtime.plans.find(r => r.id === 'run-004'), {recoveryMinutes: 10});
e = tuneDriver(reasoningSource(p2), 'QD-004', {targetValue: '5'}).effects.find(x => x.id === 'run-004');
assert.deepEqual([e.was, e.state], ['holds', 'breaks']);
const p3 = clone(project); p3.interfaces.contracts.find(c => c.id === 'rest').timeoutMs = '1500'; p3.interfaces.contracts.find(c => c.ref === 'IF-004').timeoutMs = '800';
const tp = tuneDriver(reasoningSource(p3), 'QD-003', {});
assert.equal(tp.effects.find(x => x.kind === 'path').state, 'breaks'); assert.match(tp.effects.find(x => x.kind === 'path').why, /2300 ms/);
assert.equal(tuneDriver(reasoningSource(p3), 'QD-003', {targetValue: '3'}).effects.find(x => x.kind === 'path').state, 'holdsNow');
// Priorities: a one-step change that flips a decision marks a sensitivity point.
const tq = tuneDriver(R, 'QD-003', {priority: 'High'}), adr2 = tq.effects.find(x => x.id === 'ADR-002');
assert.equal(adr2.flipped, true); assert.equal(adr2.state, 'revisit'); assert.match(adr2.why, /QD-003 is a sensitivity point/);
assert.equal(readDecision(project, project.decisions.records.find(d => d.id === 'ADR-002')).lead, 'ALT-003');
// Round 25 (D-25-03): an alternative that breaks a constraint driver is named when the driver is tuned, and a chosen one
// is flagged whichever way it moves.
{
  let q = applyQualityCommand(clone(project), {type: 'quality.driver', payload: {kind: 'constraint', title: 'Post through the existing core ledger', description: 'Every posting goes through the existing core ledger.', impact: 'Rules out a second store of postings.', constraintIds: ['CON-001'], priority: 'High'}}).document;
  const C = q.quality.drivers.at(-1).id, d2 = () => q.decisions.records.find(d => d.id === 'ADR-002');
  q = applyDecisionCommand(q, {type: 'decision.save', payload: {id: 'ADR-002', driverIds: [...d2().driverIds, C]}}).document;
  q = applyDecisionCommand(q, {type: 'decision.alternative', payload: {id: 'ADR-002', alternativeId: 'ALT-004', assessments: {...d2().alternatives.find(a => a.id === 'ALT-004').assessments, [C]: {effect: 'violates', reason: 'Keeps its own record of postings.', evidence: 'Design review.'}}}}).document;
  const title = d2().alternatives.find(a => a.id === 'ALT-004').title;
  let e = tuneDriver(reasoningSource(q), C, {priority: 'Medium'}).effects.find(x => x.id === 'ADR-002');
  assert.ok(e.why.endsWith(' ' + title + ' breaks ' + C + '.'), e.why); assert.equal(e.state, 'holds', 'nothing chosen: named, not flagged');
  q = applyDecisionCommand(q, {type: 'decision.choose', payload: {id: 'ADR-002', alternativeId: 'ALT-004'}}).document;
  e = tuneDriver(reasoningSource(q), C, {priority: 'Medium'}).effects.find(x => x.id === 'ADR-002');
  assert.equal(e.state, 'breaks'); assert.ok(e.why.endsWith(' ' + title + ' breaks ' + C + ', and it is the chosen alternative.'), e.why);
}
assert.deepEqual(targetSteps(R.driver('QD-002')), ['99', '99.5', '99.9', '99.95', '99.99', '99.999']); assert.deepEqual(targetSteps(R.driver('QD-003')), ['8', '4', '2', '1', '0.5']);
assert.equal(JSON.stringify(project), before, 'the project is not changed');
pass('What if reads a moved target or priority against recorded facts: 99.9 % → 99.99 % over 30 days shrinks the budget from 43.2 to 4.3 minutes, so a single replica that restarts in 10 minutes stops holding and a second zone makes it hold again; recovery targets meet recovery times, response targets meet recorded timeouts, a priority that flips a decision is a sensitivity point, and what is not recorded is said to be unknown');

// 4. The utility tree: families, attributes, drivers and the playbook's holes.
const UM = utilitySource(project);
{
  const mixed = clone(project), base = mixed.quality.drivers[0];
  mixed.quality.drivers.push({...base, id: 'QD-B', kind: 'business', title: 'Increase completed payments'}, {...base, id: 'QD-O', kind: 'operational', title: 'Resolve exceptions promptly'});
  const landscape = utilitySource(mixed);
  assert.equal(landscape.drivers.length, UM.drivers.length, 'the utility tree remains a quality-scenario tree');
  assert.deepEqual(landscape.landscape.filter(g => g.drivers.length).map(g => [g.kind.id, g.drivers.length]), [['business', 1], ['quality', UM.drivers.length], ['operational', 1]], 'the companion can show every kind from the same register');
  pass('the same driver register exposes business and operational drivers alongside quality scenarios, while the utility tree retains its measurable quality focus');
}
assert.deepEqual(UM.families.map(f => f.id + ':' + f.attributes.join('+')), ['reliability:integrity+availability+recoverability', 'efficiency:performance+scalability', 'protection:security+traceability', 'change:maintainability+deployability', 'use:usability']);
assert.deepEqual([...UM.attrs.values()].filter(a => a.hole).map(a => a.id), ['scalability', 'maintainability', 'deployability', 'usability']);
assert.deepEqual(UM.drivers.map(d => d.id), ['QD-001', 'QD-004', 'QD-005', 'QD-002', 'QD-003', 'QD-006'], 'High first (the stored Critical reads as High), then by rank');
let F = foldUtility(UM);
assert.equal(F.nodes.filter(n => n.kind === 'driver').length, 6); assert.equal(F.nodes.filter(n => n.kind === 'hole').length, 4);
assert.deepEqual(foldUtility(UM, {kind: 'attribute', id: 'availability'}).nodes.map(n => n.id), [ROOT, 'F:reliability', 'A:availability', 'QD-002']);
assert.deepEqual(foldUtility(UM, {kind: 'x', id: 'QD-003'}).nodes.map(n => n.id), [ROOT, 'F:efficiency', 'A:performance', 'QD-003']);
assert.equal(foldUtility(UM, {kind: 'system'}, 'attributes').nodes.filter(n => n.kind === 'driver').length, 0);
assert.equal(utilityScope(UM, {kind: 'attribute', id: 'nope'}).kind, 'system');
const miss = qualityProposals(project, null, 'model').find(q => q.id === 'missing');
assert.equal(miss.record.category, 'scalability'); assert.deepEqual(miss.record.requirementIds, ['REQ-001']);
F = foldUtility(UM, {kind: 'system'}, 'drivers', {ghost: miss});
assert.ok(F.nodes.some(n => n.id === PROPOSED && n.attr === 'scalability') && F.nodes.some(n => n.id === 'A:scalability' && n.kind === 'attribute'), 'a proposed driver fills its hole');
for (const t of QUALITY_TYPES.filter(t => t.playbook)) assert.ok(playbookDriverProposal(project, t.id).record.category === t.id);
const saved = applyQualityCommand(project, {type: 'quality.driver', payload: {...miss.record, id: undefined}}).document;
assert.ok(saved.quality.drivers.some(d => d.category === 'scalability'), 'a scalability driver can be recorded');
const ins = utilityInsights(UM).map(x => x.text);
assert.ok(ins.some(t => /^Scalability, maintainability, deployability and usability have no driver/.test(t)));
assert.ok(ins.some(t => /ADR-002 turns on QD-001's priority/.test(t)) && ins.some(t => /QD-002 and QD-003 pull against each other/.test(t)));
assert.ok(ins.some(t => /QD-002 — 99\.9 % over 30 days allows 43\.2 minutes/.test(t)));
assert.deepEqual(sensitivity(UM, 'QD-003').map(s => s.decision.id + '→' + s.to), ['ADR-002→High']);
assert.match(describeDriver(UM, 'QD-002'), /names 4 of the playbook's 15 availability tactics/);
pass('the utility tree reads utility → quality → attribute → driver, High first; the playbook\'s core attributes nobody covers (scalability, maintainability, deployability, usability) stand as holes a proposed driver can fill; it slices to a quality, an attribute or a driver, folds to attributes, and says what it shows — holes, what cannot be told, sensitivity points and the playbook\'s trade-offs between the project\'s own drivers');

// 5. Layouts.
function checkTree(F, L, tag) {
  const cards = L.cards, byId = new Map(cards.map(c => [c.id, c]));
  for (const a of cards) for (const b of cards) if (a !== b) assert.ok(!overlap(a, b), `${tag}: ${a.id} overlaps ${b.id}`);
  for (const c of cards) assert.equal(c.x, L.cols[c.node.level].x, `${tag}: ${c.id} stands in its column`);
  for (const e of L.edges) {
    const a = byId.get(e.from), b = byId.get(e.to);
    assert.ok(e.pts.every((p, i) => !i || p[0] === e.pts[i - 1][0] || p[1] === e.pts[i - 1][1]), tag + ': orthogonal');
    assert.ok(e.pts[1][0] > a.x + a.w && e.pts[1][0] < b.x, tag + ': the trunk runs in the gutter');
    for (const c of cards) if (c !== a && c !== b) assert.ok(!(e.pts[1][0] >= c.x && e.pts[1][0] <= c.x + c.w && Math.min(e.pts[1][1], e.pts[2][1]) < c.y + c.h && Math.max(e.pts[1][1], e.pts[2][1]) > c.y), `${tag}: ${e.id} crosses ${c.id}`);
  }
  for (const n of F.nodes) { const kids = F.edges.filter(e => e.from === n.id).map(e => byId.get(e.to)); if (!kids.length) continue; const p = byId.get(n.id), lo = Math.min(...kids.map(k => k.y)), hi = Math.max(...kids.map(k => k.y + k.h)); assert.ok(p.y >= lo - 1 && p.y + p.h <= hi + 1 || p.h >= hi - lo, `${tag}: ${n.id} stands within its children`); }
  assert.equal(JSON.stringify(utilityLayout(F)), JSON.stringify(L), tag + ': deterministic');
  checkCombs(L, tag);
}
// Round 10, V4: one comb per parent, exactly its edges, drawn once (treeWires).
const segsOf = pts => pts.slice(1).map((p, i) => [pts[i], p]).filter(([a, b]) => a[0] !== b[0] || a[1] !== b[1]);
const lenOf = pts => segsOf(pts).reduce((t, [a, b]) => t + Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]), 0);
let combsSeen = 0, chainsSeen = 0, dashedTeeth = 0;
function checkCombs(L, tag) {
  const parents = [...new Set(L.edges.map(e => e.from))], kindOf = new Map(L.cards.map(c => [c.id, c.node.kind])), card = new Map(L.cards.map(c => [c.id, c]));
  assert.deepEqual(L.combs.map(c => c.from), parents, tag + ': one comb per parent with children, in the order of its edges');
  for (const c of L.combs) {
    const es = L.edges.filter(e => e.from === c.from), p = card.get(c.from);
    assert.equal(c.id, 'comb:' + c.from);
    assert.deepEqual(c.to, es.map(e => e.to), tag + ': the comb\'s children are its parent\'s edges');
    assert.deepEqual(c.teeth, es.map(e => ({to: e.to, x: card.get(e.to).x, y: card.get(e.to).y + card.get(e.to).h / 2})), tag + ': one tooth per child, into its side at its middle');
    assert.ok(c.x0 === p.x + p.w && c.y === p.y + p.h / 2 && c.x > c.x0 && c.teeth.every(t => t.x > c.x), tag + ': the stub leaves the parent\'s side for the gutter');
    for (const e of es) assert.ok(e.pts[1][0] === c.x && e.pts[2][0] === c.x && e.pts[0][0] === c.x0 && e.pts[0][1] === c.y, tag + ': the comb spine x equals the edges\' trunk x');
    assert.ok(c.y1 === Math.min(c.y, ...c.teeth.map(t => t.y)) && c.y2 === Math.max(c.y, ...c.teeth.map(t => t.y)), tag + ': the spine spans its teeth and the stub');
    assert.equal(c.fork, c.teeth.length >= 2 && c.teeth.some(t => Math.abs(t.y - c.y) < 0.5), tag + ': a comb whose child runs straight on through the spine carries the fork cue');
  }
  combsSeen += L.combs.length;
  // Drawn once: one sub-share per parent, no piece twice, every edge whole on its chains, no foreign line at a join.
  const W = treeWires(L), comb = new Map(L.edges.map(e => [e.id, e.from])), edge = new Map(L.edges.map(e => [e.id, e]));
  assert.equal(JSON.stringify(treeWires(L)), JSON.stringify(W), tag + ': the wires are deterministic');
  assert.equal(new Set(W.chains.map(c => c.group)).size, parents.length, tag + ': one drawn structure per parent');
  assert.deepEqual(W.apart, [], tag + ': nothing drawn apart');
  for (const c of W.chains) assert.equal(new Set(c.ids.map(id => comb.get(id))).size, 1, tag + ': a chain never mixes parents');
  for (const e of L.edges) assert.equal(W.chains.filter(c => c.ids.includes(e.id)).reduce((t, c) => t + lenOf(c.pts), 0), lenOf(e.pts), tag + ': ' + e.id + ' stays whole on its chains');
  const sum = L.edges.reduce((t, e) => t + lenOf(e.pts), 0), unique = (() => { const runs = new Map(); for (const e of L.edges) for (const [a, b] of segsOf(e.pts)) { const h = a[1] === b[1], k = h ? 'h' + a[1] : 'v' + a[0]; (runs.get(k) || runs.set(k, []).get(k)).push(h ? [Math.min(a[0], b[0]), Math.max(a[0], b[0])] : [Math.min(a[1], b[1]), Math.max(a[1], b[1])]); } let u = 0; for (const iv of runs.values()) { iv.sort((p, q) => p[0] - q[0]); let [lo, hi] = iv[0]; for (const [x, y] of iv.slice(1)) { if (x > hi) { u += hi - lo; lo = x; hi = y; } else hi = Math.max(hi, y); } u += hi - lo; } return u; })();
  assert.ok(Math.abs(W.ink - unique) < 0.01 && W.ink <= sum, `${tag}: ink ${W.ink} is each run once (${unique}), not per edge (${sum})`);
  const cf = wireConflicts(W); assert.deepEqual([cf.atJoin.length, cf.onTrunk.length, cf.tContacts.length], [0, 0, 0], tag + ': no foreign line at a join, along a comb or as a T');
  // Rounded only where the spine ends: a chain turns at most once, and only into a tooth at the spine's end.
  for (const c of W.chains) {
    const corners = c.pts.length - 2, cb = L.combs.find(k => k.from === comb.get(c.ids[0]));
    if (cb.to.length < 2) { assert.ok(corners <= 2 && c.ids.length === 1, tag + ': a single child keeps its own route'); continue; }
    assert.ok(corners <= 1, `${tag}: ${c.ids} turns ${corners} times`);
    if (corners === 1) { const [x, y] = c.pts[1]; assert.ok(x === cb.x && (y === cb.y1 || y === cb.y2) && (y === cb.y || (c.ids.length === 1 && edge.get(c.ids[0]).pts[3][1] === y)), `${tag}: a rounded corner sits at an end of ${cb.id}`); }
  }
  // Solid where a recorded child travels; a hole's or a proposal's own tooth keeps its dash.
  for (const c of W.chains) {
    const ks = c.ids.map(id => kindOf.get(edge.get(id).to)), recorded = ks.some(k => k !== 'hole' && k !== 'proposed');
    assert.equal(c.kind, recorded ? '' : ks[0], tag + ': a stretch is solid exactly while a recorded child travels it');
    if (c.ids.length === 1 && ['hole', 'proposed'].includes(ks[0])) { const end = c.pts.at(-1), to = edge.get(c.ids[0]).pts[3]; if (end[0] === to[0] && end[1] === to[1]) { assert.equal(c.kind, ks[0]); dashedTeeth++; } }
  }
  chainsSeen += W.chains.length;
}
function checkTune(T, L, tag) {
  for (const a of L.cards) { for (const b of L.cards) if (a !== b) assert.ok(!overlap(a, b), `${tag}: ${a.id} overlaps ${b.id}`); const band = L.bands.find(b => b.id === a.col); assert.ok(a.y >= band.y && a.y + a.h <= band.y + band.h, `${tag}: ${a.id} stays in its band`); assert.ok(a.x >= L.rail); }
  L.bands.forEach((b, i) => { if (i) assert.ok(b.y >= L.bands[i - 1].y + L.bands[i - 1].h, tag + ': bands in order'); });
  assert.equal(L.cards.reduce((n, c) => n + c.card.members.length, 0), T.effects.length, tag + ': every effect is drawn once');
}
let layouts = 0;
const big = clone(project);
for (let i = 0; i < 60; i++) big.quality.drivers.push({...clone(project.quality.drivers[i % 6]), id: 'QD-' + String(100 + i), scenarioId: 'QS-' + (100 + i), category: QUALITY_TYPES[i % QUALITY_TYPES.length].id, rank: 10 + i, priority: ['Critical', 'Important', 'Supporting'][i % 3]});
const UB = utilitySource(big);
assert.equal(defaultDepth(UB), 'attributes', 'more than forty drivers open folded');
for (const M of [UM, UB]) for (const sc of [{kind: 'system'}, {kind: 'family', id: 'reliability'}, {kind: 'attribute', id: 'availability'}, {kind: 'driver', id: 'QD-002'}]) for (const depth of ['drivers', 'attributes']) for (const g of [null, miss]) { const F2 = foldUtility(M, sc, depth, {ghost: g}); checkTree(F2, utilityLayout(F2), `tree:${sc.kind}:${depth}:${g ? 'ghost' : ''}`); layouts++; }
for (const id of ['QD-001', 'QD-002', 'QD-003', 'QD-004']) for (const ch of [{}, {targetValue: '1'}, {priority: 'Low'}]) { const T2 = tuneDriver(reasoningSource(p1), id, ch); checkTune(T2, tuneLayout(T2), `tune:${id}`); layouts++; }
const cards = rippleCards(tuneDriver(R, 'QD-002', {}).effects);
assert.ok(cards.some(c => c.aggregate && c.members.length >= 5), 'like effects read as one card');
const L0 = utilityLayout(foldUtility(UM));
assert.equal(L0.cards.length, 22); assert.ok(L0.W < 1100);
pass(`${layouts} layouts of the utility tree and What if: cards never overlap, each stands in its column, parents stand within their children, every connector is orthogonal and runs its trunk in the gutter without crossing a card; What if keeps every card in its chapter's band and draws every effect once; sixty drivers open folded to attributes`);
// The bank's tree as drawn: each run once, the holes' teeth dashed.
{
  const W0 = treeWires(L0), per = L0.edges.reduce((t, e) => t + lenOf(e.pts), 0);
  assert.equal(L0.combs.length, 12, 'twelve parents, twelve combs'); assert.equal(per, 3906, 'one line per edge drew 3,906 px');
  assert.equal(W0.ink, 2925, 'the combs draw 2,925 px'); assert.equal(W0.chains.filter(c => c.kind === 'hole').length, 5); assert.equal(W0.joins.length >= 1, true);
  // Splitting a comb by its children's styles instead would draw a parent's stub twice where a hole hangs beside a
  // recorded attribute (the overlap the round-10 harness found): each run once is what the comb adds.
  const kind = new Map(L0.cards.map(c => [c.id, c.node.kind])), split = mergeWires(L0.edges.map(e => ({id: e.id, pts: e.pts, share: e.from, end: 'from', style: kind.get(e.to) === 'hole' ? 'hole' : ''})));
  assert.ok(split.ink > W0.ink, `split by style: ${split.ink} px, a stub drawn twice`);
  const G0 = utilityLayout(foldUtility(UM, {kind: 'system'}, 'drivers', {ghost: miss})), WG = treeWires(G0), pe = G0.edges.find(e => e.to === PROPOSED);
  assert.deepEqual(WG.chains.filter(c => c.ids.includes(pe.id)).map(c => c.kind), ['proposed'], 'the proposal hangs alone from its attribute: its whole line is dashed');
  assert.ok(combsSeen >= 150 && chainsSeen > combsSeen && dashedTeeth >= 16, `${combsSeen} combs, ${chainsSeen} chains, ${dashedTeeth} dashed teeth checked`);
  pass(`round 10: every parent with children has one comb — exactly its edges, its spine on the edges' trunk — drawn once with no run twice, every edge whole on its chains, no foreign line at a join, rounded only where the spine ends, solid where a recorded child travels and dashed on a hole's or proposal's own tooth (${combsSeen} combs over ${layouts - 12} trees; the bank's tree ${per} → ${W0.ink} px)`);
}


// Round 11: a category the playbook does not list (compliance, privacy, cost, capacity) is an attribute of the family it
// names once a driver records it; with no driver it draws nothing, so the reference tree is what it was.
{
  const U0 = utilitySource(project);
  assert.ok(!U0.families.some(f => f.attributes.includes('compliance') || f.attributes.includes('cost')) && !foldUtility(U0, {kind: 'system'}, 'drivers').nodes.some(n => n.attr === 'compliance' || n.attr === 'cost'), 'nothing is drawn for an added category without a driver');
  const withCompliance = applyQualityCommand(project, {type: 'quality.driver', payload: {category: 'compliance', title: 'Show the regulator the audit trail', stimulus: 'The regulator asks for the trail of one payment.', conditions: 'Any payment of the last seven years.', response: 'Produce the trail with its evidence.', metric: 'Days to produce the trail', operator: 'At most', targetValue: '5', unit: 'days', window: 'Each request', measurement: 'Time each request.', priority: 'Supporting', requirementIds: [project.artefacts.find(a => a.type === 'requirement').id], responsibilityIds: ['api']}}).document;
  const U1 = utilitySource(withCompliance), a = U1.attrs.get('compliance');
  assert.ok(a && a.family === 'protection' && a.drivers.length === 1 && !a.hole && !a.core && a.knowledge.guide === null && /obligation/.test(a.knowledge.note), 'a compliance driver is an attribute of the Security family with its own description and no playbook guide');
  assert.ok(U1.families.find(f => f.id === 'protection').attributes.includes('compliance') && !U1.other.length, 'drawn in its family, not under Other');
  const F1 = foldUtility(U1, {kind: 'system'}, 'drivers');
  assert.ok(F1.nodes.some(n => n.id === 'A:compliance' && n.kind === 'attribute') && F1.nodes.some(n => n.attr === 'compliance' && n.kind === 'driver'), 'the tree draws the attribute and its driver');
  assert.ok(describeDriver(U1, a.drivers[0]), 'the driver reads like any other');
  pass('round 11: compliance, privacy, cost and capacity join the utility tree as attributes of the family each names once a driver records one, with the category\'s own description where the playbook has no guide; without a driver nothing is drawn for them');
}
console.log(JSON.stringify({suite: 'chapter 2 model (quality)', passed: checks.length, checks, limits: [
  'The playbook\'s x and (x) marks are qualitative judgements from the supplied workbook; the model shows them, it does not score with them.',
  'Tactic evidence is found in recorded text and structured runtime facts; named in the design is not the same as implemented.',
  'What if reads recorded recovery times, replicas, placements and timeouts; where they are not recorded it says so rather than estimating them.'
]}, null, 2));
