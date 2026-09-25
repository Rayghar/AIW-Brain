// Chapter 2 Model checks: the structured SA Playbook, design reasoning over the recorded design,
// the utility tree, "What if" tuning and both layouts. Run: npm run test:utility
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyQualityCommand, qualityProposals, QUALITY_TYPES, playbookDriverProposal} from './public/quality-domain.js';
import {PLAYBOOK, ATTRIBUTES, TACTICS, STYLES, PATTERNS, ANTI_PATTERNS, STYLE_KEY, PATTERN_KEY, DECISION_TEMPLATE, FAMILIES, attribute, tacticsFor} from './public/playbook-knowledge.js';
import {reasoningSource, driverChain, driverTactics, tuneDriver, describeTuning, targetSteps, availabilityBudget, windowDays, styleFit, decisionTally, tacticsForAttribute} from './public/design-reasoning.js';
import {utilitySource, foldUtility, utilityScope, utilityInsights, describeDriver, sensitivity, defaultDepth, ROOT, PROPOSED} from './public/utility-model.js';
import {utilityLayout, tuneLayout, rippleCards, UT, TU} from './public/utility-layout.js';

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
assert.deepEqual(c2.responsibilities.map(r => r.ref), ['LR-001', 'LR-004']); assert.deepEqual(c2.components.map(c => c.ref), ['APP-001', 'APP-004']);
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
const tq = tuneDriver(R, 'QD-003', {priority: 'Critical'}), adr2 = tq.effects.find(x => x.id === 'ADR-002');
assert.equal(adr2.flipped, true); assert.equal(adr2.state, 'revisit'); assert.match(adr2.why, /QD-003 is a sensitivity point/);
assert.equal(decisionTally(project.decisions.records.find(d => d.id === 'ADR-002'), Object.fromEntries(R.drivers.map(d => [d.id, d.priority]))).favoured, 'ALT-003');
assert.deepEqual(targetSteps(R.driver('QD-002')), ['99', '99.5', '99.9', '99.95', '99.99', '99.999']); assert.deepEqual(targetSteps(R.driver('QD-003')), ['8', '4', '2', '1', '0.5']);
assert.equal(JSON.stringify(project), before, 'the project is not changed');
pass('What if reads a moved target or priority against recorded facts: 99.9 % → 99.99 % over 30 days shrinks the budget from 43.2 to 4.3 minutes, so a single replica that restarts in 10 minutes stops holding and a second zone makes it hold again; recovery targets meet recovery times, response targets meet recorded timeouts, a priority that flips a decision is a sensitivity point, and what is not recorded is said to be unknown');

// 4. The utility tree: families, attributes, drivers and the playbook's holes.
const UM = utilitySource(project);
assert.deepEqual(UM.families.map(f => f.id + ':' + f.attributes.join('+')), ['reliability:integrity+availability+recoverability', 'efficiency:performance+scalability', 'protection:security+traceability', 'change:maintainability+deployability', 'use:usability']);
assert.deepEqual([...UM.attrs.values()].filter(a => a.hole).map(a => a.id), ['scalability', 'maintainability', 'deployability', 'usability']);
assert.deepEqual(UM.drivers.map(d => d.id), ['QD-001', 'QD-004', 'QD-005', 'QD-002', 'QD-003', 'QD-006'], 'Critical first, then by rank');
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
assert.deepEqual(sensitivity(UM, 'QD-003').map(s => s.decision.id + '→' + s.to), ['ADR-002→Critical']);
assert.match(describeDriver(UM, 'QD-002'), /names 4 of the playbook's 15 availability tactics/);
pass('the utility tree reads utility → quality → attribute → driver, Critical first; the playbook\'s core attributes nobody covers (scalability, maintainability, deployability, usability) stand as holes a proposed driver can fill; it slices to a quality, an attribute or a driver, folds to attributes, and says what it shows — holes, what cannot be told, sensitivity points and the playbook\'s trade-offs between the project\'s own drivers');

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
for (const id of ['QD-001', 'QD-002', 'QD-003', 'QD-004']) for (const ch of [{}, {targetValue: '1'}, {priority: 'Supporting'}]) { const T2 = tuneDriver(reasoningSource(p1), id, ch); checkTune(T2, tuneLayout(T2), `tune:${id}`); layouts++; }
const cards = rippleCards(tuneDriver(R, 'QD-002', {}).effects);
assert.ok(cards.some(c => c.aggregate && c.members.length >= 5), 'like effects read as one card');
const L0 = utilityLayout(foldUtility(UM));
assert.equal(L0.cards.length, 22); assert.ok(L0.W < 1100);
pass(`${layouts} layouts of the utility tree and What if: cards never overlap, each stands in its column, parents stand within their children, every connector is orthogonal and runs its trunk in the gutter without crossing a card; What if keeps every card in its chapter's band and draws every effect once; sixty drivers open folded to attributes`);

console.log(JSON.stringify({suite: 'chapter 2 model (quality)', passed: checks.length, checks, limits: [
  'The playbook\'s x and (x) marks are qualitative judgements from the supplied workbook; the model shows them, it does not score with them.',
  'Tactic evidence is found in recorded text and structured runtime facts; named in the design is not the same as implemented.',
  'What if reads recorded recovery times, replicas, placements and timeouts; where they are not recorded it says so rather than estimating them.'
]}, null, 2));
