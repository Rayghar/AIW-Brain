// The scale readings (round 6, Contract K; audit/round6/DESIGN.md): scaleReadings(p) in public/desk-capacity.js derives,
// from the Chapter 2 drivers that carry a number and the Chapter 8 data definitions that state a count or a size, the
// demand each component carries at peak, compares it with the Chapter 10 placements and the reference latency figures,
// and returns {inputs, derived, findings, figures}. The suite asserts:
//   no numeric target: one SCALE-NO-TARGET for the project (not one per component), a one-line summary that says so, no
//     derived demand; a latency-only project still reads its budget in words without a demand;
//   a rate target: the arrival rate carried along the recorded interactions, × the peak factor (a surge driver's factor,
//     1 when the rate is stated at the peak, else 3 as a named assumption); replicas needed at the desk's assumptions;
//     SCALE-UNDER-PROVISIONED per plan whose placed active copies fall short, in the finding's words; a users target
//     through Little's law; storage from a stated count and size (and growth); bandwidth from a stated size;
//   the latency budget: hops read from where the two ends are placed (one data centre, or a region apart), a provider
//     outside read as a region apart; SCALE-LATENCY-BUDGET when the reference round trips alone spend the target, none
//     when they do not; the figures used are named;
//   SCALE-UNCONFIRMED once per project while a derived number rests on an unconfirmed target or an assumption, cleared
//     when every target is confirmed and nothing is assumed;
//   Chapter 10: runtimeFindings carries them and chapterChecks reads each as to confirm, never to fix;
//   pure: reading changes nothing.
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {createProject} from './shared/projects-domain.js';
import {scaleReadings, scaleTarget, dataFigures, SCALE_PEAK_FACTOR, SCALE_CODES, ASSUMPTIONS} from './public/desk-capacity.js';
import {runtimeFindings, runtimeMilestones} from './public/runtime-domain.js';
import {chapterChecks, CHECK_WORDS} from './public/readiness-model.js';
import {BRAIN_TRADEOFFS} from './public/brain-tradeoffs.js';

const checks = [], pass = n => { checks.push(n); console.log('PASS', n); };
const clone = x => structuredClone(x);
const codes = s => s.findings.map(f => f.code);
const DEF = Object.fromEntries(ASSUMPTIONS.map(a => [a.key, a.def]));
const driver = (id, category, title, operator, targetValue, unit, extra = {}) => ({id, category, title, operator, targetValue, unit, window: '', metric: title, stimulus: '', conditions: '', priority: 'Important', requirementIds: [], responsibilityIds: [], targetConfirmed: false, ...extra});

// ---------------------------------------------------------------- 1. no numeric target
const bank = withFinalReview(seedProject()), before = JSON.stringify(bank);
{
  const s = scaleReadings(bank);
  assert.deepEqual(codes(s), ['SCALE-NO-TARGET'], 'one finding, for the project');
  assert.deepEqual([s.findings[0].objectId, s.findings[0].level, s.findings[0].id], ['project', 'warning', 'SCALE-NO-TARGET:project']);
  assert.match(s.findings[0].detail, /No Chapter 2 driver carries a number for a rate, concurrent users or a data volume/);
  assert.equal(s.derived.filter(x => x.qps > 0 || x.storageGB != null).length, 0, 'no demand is derived');
  assert.equal(s.summary.split('\n').length, 1, 'the summary is one line');
  assert.match(s.summary, /^No rate, concurrent-user or data-volume target is recorded; QD-003 allows 2,000 ms; the reference round trips along the longest required path take about 21\.5 ms \(1 % of it\)/, 'a latency-only project still reads its budget');
  assert.deepEqual(s.figures.sort(), ['LN-006', 'LN-009'], 'the figures used are named');
  assert.deepEqual(s.inputs.map(i => i.id), ['QD-003']);
  const blank = withFinalReview(createProject({name: 'Blank', template: 'blank', brief: 'A plain project with no numbers.'}, 'scale-blank', '2026-10-02T09:00:00.000Z'));
  const sb = scaleReadings(blank);
  assert.deepEqual(codes(sb), ['SCALE-NO-TARGET']); assert.equal(sb.summary, 'No numeric scale target is recorded in Chapter 2, so no demand is derived; the desk sizes for the Playbook\'s example on What it takes.');
  const five = withFinalReview(createProject({name: 'Service permits', template: 'service-permits'}, 'scale-permits', '2026-10-02T09:00:00.000Z'));
  assert.ok(five.realisation.components.length >= 5);
  assert.equal(codes(scaleReadings(five)).filter(c => c === 'SCALE-NO-TARGET').length, 1, 'once per project, not per component (five components)');
  assert.equal(JSON.stringify(bank), before);
  pass('no numeric target: one SCALE-NO-TARGET for the project, once however many components, a one-line summary that says so and no derived demand; a latency-only project still reads its budget (QD-003: 21.5 ms of 2,000) and names the figures used');
}

// ---------------------------------------------------------------- 2. targets read from the drivers
{
  const t = (op, v, u, extra) => scaleTarget(driver('QD-X', extra?.category || 'scalability', extra?.title || 'x', op, v, u, extra));
  assert.deepEqual(t('At least', '500', 'requests per second'), {kind: 'rate', perSecond: 500, peak: false});
  assert.deepEqual(t('At least', '20', 'deposits per second', {title: 'Carry the evening peak'}), {kind: 'rate', perSecond: 20, peak: true});
  assert.equal(t('At least', '1000', 'holds per hour').perSecond, 1000 / 3600);
  assert.equal(t('At least', '2', 'million orders per day').perSecond, 2e6 / 86400);
  assert.deepEqual(t('At least', '7000', 'concurrent users'), {kind: 'users', users: 7000});
  assert.deepEqual(t('At least', '3', '× normal peak'), {kind: 'surge', factor: 3});
  assert.deepEqual(t('At most', '2', 'TB'), {kind: 'volume', gb: 2048});
  assert.deepEqual(t('At least', '5', 'million records'), {kind: 'count', records: 5e6});
  assert.deepEqual(t('At most', '20', '% a year', {title: 'Growth of the store'}), {kind: 'growth', pct: 20});
  assert.deepEqual(t('At most', '2', 'seconds', {category: 'performance'}), {kind: 'latency', ms: 2000});
  assert.equal(t('At most', '10', 'working days', {category: 'performance'}), null, 'ten working days is not a latency budget');
  assert.equal(t('At most', '', 'seconds'), null);
  assert.deepEqual(dataFigures({purpose: 'Carries the order for REQ-005 Keep a case.', assumptions: 'About 2 million records of 4 KB each are kept for 90 days.', fields: []}), {records: 2e6, recordsText: '2 million records', bytes: 4096, bytesText: '4 KB', retentionDays: null}, 'a count and a size in prose, not the number inside REQ-005');
  assert.equal(dataFigures({purpose: 'Accept 20 deposits per second at the evening peak and keep 90 days of 3 million events.', fields: []}).recordsText, '3 million events', 'a rate in prose is not a record count; the count beside it is');
  assert.equal(dataFigures({purpose: 'Place 1000 holds per hour.', fields: []}).records, null);
  pass('targets: a rate per second, hour or day (with thousand and million), a rate stated at the peak, concurrent users, a surge factor, a volume in TB, a record count, growth in percent a year, a latency in seconds; ten working days is none; a data definition\'s count and size are read from prose, never from a reference like REQ-005 and never from a rate like 20 deposits per second');
}

// ---------------------------------------------------------------- 3. a rate target against the placements
const fx = clone(bank);
fx.quality.drivers.push(driver('QD-009', 'scalability', 'Carry the instruction rate', 'At least', '500', 'requests per second'));
{
  const s = scaleReadings(fx), row = id => s.derived.find(x => x.componentId === id);
  assert.equal(s.peak.factor, SCALE_PEAK_FACTOR); assert.match(s.peak.basis, /an assumption until a measurement replaces it/);
  assert.equal(row('api-pod').qps, 1500, '500 a second at the entry × 3 at peak');
  assert.equal(row('api-pod').replicas.needed, Math.ceil(1500 / (DEF.servicePerReplica * DEF.utilisation / 100)), 'replicas at the desk\'s assumptions');
  assert.equal(row('api-pod').replicas.placed, 1); assert.equal(row('api-pod').planRef, 'RUN-001');
  assert.equal(row('worker').replicas.perReplica, DEF.workerPerReplica, 'a worker at the worker assumption');
  assert.ok(s.derived.every(x => x.basis.includes('at peak')), 'every row says what it rests on');
  const under = s.findings.filter(f => f.code === 'SCALE-UNDER-PROVISIONED');
  assert.deepEqual(under.map(f => f.objectId), ['run-001', 'run-002', 'run-003', 'run-004', 'run-005'], 'one per plan placed short');
  assert.equal(under[0].id, 'SCALE-UNDER-PROVISIONED:run-001'); assert.equal(under[0].level, 'warning');
  assert.equal(under[0].title, 'Size RUN-001 for the derived peak');
  assert.match(under[0].detail, /^APP-001 Payment service carries about 1,500 requests a second at peak \(a peak of 3 × the stated load, an assumption until a measurement replaces it\); at 200 a second per replica and 70 % utilisation that is 11 replicas\. 1 active copy is placed and the plan allows at most 1\. Derived from the recorded targets, not measured/);
  assert.match(s.summary, /^From QD-009's at least 500 requests per second and a peak of 3 ×: 1,500 requests a second at the entry over 5 components; 5 placed short of it; 1 % of QD-003's 2,000 ms spent on reference round trips\.$/);
  assert.deepEqual(codes(s).filter(c => c !== 'SCALE-UNDER-PROVISIONED'), ['SCALE-UNCONFIRMED']);
  assert.match(s.findings.find(f => f.code === 'SCALE-UNCONFIRMED').detail, /QD-009[\s\S]*a peak of 3 ×[\s\S]*a payload of 2 KB a request/);
  // Enough copies placed clear it (25: the Settlement worker needs 22 at 100 a second per replica); a surge driver sets the peak; a stated peak needs none.
  const placed = clone(fx); for (const l of placed.runtime.placements) l.replicas = 25; for (const r of placed.runtime.plans) r.maxReplicas = 25;
  assert.deepEqual(scaleReadings(placed).findings.filter(f => f.code === 'SCALE-UNDER-PROVISIONED').map(f => f.objectId), ['run-003', 'run-005'], 'the two plans with no placement stay short');
  const surge = clone(fx); surge.quality.drivers.push(driver('QD-010', 'scalability', 'Absorb a surge', 'At least', '4', '× normal peak'));
  assert.equal(scaleReadings(surge).peak.factor, 4); assert.equal(scaleReadings(surge).derived.find(x => x.componentId === 'api-pod').qps, 2000);
  const stated = clone(bank); stated.quality.drivers.push(driver('QD-009', 'scalability', 'Carry the peak', 'At least', '500', 'requests per second'));
  assert.equal(scaleReadings(stated).peak.factor, 1); assert.match(scaleReadings(stated).peak.basis, /states the rate at the peak/);
  // Concurrent users through Little's law, with the recorded latency target as the response time.
  const users = clone(bank); users.quality.drivers.push(driver('QD-009', 'scalability', 'Serve the users', 'At least', '6400', 'concurrent users'));
  assert.equal(Math.round(scaleReadings(users).base), 200, '6,400 users ÷ (30 s + 2 s) = 200 a second');
  assert.match(scaleReadings(users).derived.find(x => x.componentId === 'api-pod').basis, /6,400 users ÷ \(30 s between requests \+ 2 s response \(QD-003\)\)/);
  pass('a rate target: 500 a second at the entry, carried along the recorded interactions and × 3 at peak as a named assumption, is 11 replicas of APP-001 at the desk\'s assumptions against 1 placed — SCALE-UNDER-PROVISIONED per plan, in words; enough copies clear it; a surge driver sets the peak and a rate stated at the peak needs none; concurrent users through Little\'s law with the recorded response time');
}

// ---------------------------------------------------------------- 4. storage and bandwidth from the data
{
  const d = clone(fx); d.interfaces.data.find(x => x.id === 'instruction').assumptions = 'About 2 million records of 4 KB each are kept.';
  const s = scaleReadings(d), owner = d.interfaces.data.find(x => x.id === 'instruction').authorityId, row = s.derived.find(x => x.componentId === owner);
  assert.ok(owner, 'the instruction has an authority');
  assert.equal(Math.round(row.storageGB * 100) / 100, Math.round(2e6 * 4096 / 1073741824 * 100) / 100, '2 million × 4 KB');
  assert.match(row.basis, /DAT-001: 2 million records × 4 KB/);
  assert.ok(s.inputs.some(i => i.id === 'instruction' && /2 million records, 4 KB/.test(i.words)), 'the data definition is an input');
  assert.equal(Math.round(row.bandwidthMBs * 1000) / 1000, Math.round(row.qps * 4096 / 1e6 * 1000) / 1000, 'bandwidth from the stated size');
  const g = clone(d); g.quality.drivers.push(driver('QD-011', 'scalability', 'Growth of the store', 'At most', '50', '% a year'));
  assert.equal(Math.round(scaleReadings(g).derived.find(x => x.componentId === owner).storageGB * 100) / 100, Math.round(1.5 * 2e6 * 4096 / 1073741824 * 100) / 100, 'growth adds a year');
  const v = clone(fx); v.quality.drivers.push(driver('QD-012', 'scalability', 'Hold the ledger', 'At most', '2', 'TB', {responsibilityIds: ['api']}));
  const sv = scaleReadings(v), named = v.logical.mappings.filter(m => m.logicalId === 'api').map(m => m.physicalId);
  assert.ok(named.length && named.every(id => Math.abs(sv.derived.find(x => x.componentId === id).storageGB - 2048 / named.length) < 1e-6), 'a recorded volume goes to the components the driver\'s responsibilities name');
  // A data volume with no rate: storage is still read, the summary says no request demand is derived, no SCALE-NO-TARGET.
  const only = clone(bank); only.quality.drivers.push(driver('QD-012', 'scalability', 'Hold the ledger', 'At most', '2', 'TB', {responsibilityIds: ['api']}));
  const so = scaleReadings(only);
  assert.ok(!codes(so).includes('SCALE-NO-TARGET') && so.derived.length && so.derived.every(x => x.qps === 0) && so.derived.some(x => x.storageGB > 0), 'a volume alone derives storage and no request demand');
  assert.match(so.summary, /^From QD-012's at most 2 TB: 2,048(\.0)? GB over \d+ components?; no rate or concurrent-user target is recorded, so no request demand is derived; QD-003 allows 2,000 ms/);
  assert.match(so.derived.find(x => x.storageGB > 0).basis, /^no rate or concurrent-user target is recorded, so no request demand is derived\. QD-012: at most 2 TB/);
  // A record count on a driver: storage at the desk's record size, named as an assumption.
  const cnt = clone(bank); cnt.quality.drivers.push(driver('QD-013', 'scalability', 'Keep the instructions', 'At least', '5', 'million records'));
  const sc = scaleReadings(cnt);
  assert.ok(Math.abs(sc.derived.reduce((n, x) => n + (x.storageGB || 0), 0) - 5e6 * DEF.recordKB * 1024 / 1073741824) < 1e-6, '5 million records × the record-size assumption');
  assert.ok(sc.assumptions.some(a => /KB for QD-013's count/.test(a)) && codes(sc).includes('SCALE-UNCONFIRMED'), 'named as an assumption, to confirm');
  const sized = clone(d); for (const x of sized.quality.drivers) x.targetConfirmed = true; sized.quality.drivers.push(driver('QD-010', 'scalability', 'Absorb a surge', 'At least', '2', '× normal peak', {targetConfirmed: true}));
  for (const x of sized.interfaces.data) x.assumptions = 'About 1 million records of 2 KB each.';
  assert.ok(!codes(scaleReadings(sized)).includes('SCALE-UNCONFIRMED'), 'confirmed targets, a surge driver and stated sizes leave nothing to confirm');
  pass('storage and bandwidth: 2 million records of 4 KB are 7.6 GB for the data\'s authority and 4 KB a request on the wire; growth adds a year; a recorded volume goes to the components the driver names, and is read without a rate (storage, no request demand, said so); a count on a driver is storage at the record-size assumption; SCALE-UNCONFIRMED names the unconfirmed targets and the assumptions, and is cleared when every target is confirmed and every size stated');
}

// ---------------------------------------------------------------- 5. the latency budget across regions
{
  const r = clone(fx); r.quality.drivers.find(x => x.id === 'QD-003').targetValue = '15'; r.quality.drivers.find(x => x.id === 'QD-003').unit = 'ms';
  r.runtime.zones[0].failureDomain = 'Region north'; r.runtime.zones[1].failureDomain = 'Region south';
  r.runtime.placements.find(l => l.planId === 'run-002').zoneId = 'zone-b';
  const s = scaleReadings(r), f = s.findings.find(x => x.code === 'SCALE-LATENCY-BUDGET');
  assert.ok(f, 'raised'); assert.equal(f.objectId, 'run-001', 'on the entry\'s plan'); assert.equal(f.level, 'warning');
  assert.equal(f.title, 'Fit QD-003\'s 15 ms along APP-001\'s path');
  assert.match(f.detail, /about 31 ms against the 15 ms QD-003 allows: APP-001 → APP-002 \(round trip across a region, 10 ms\), APP-002 → APP-003 \(round trip inside one data centre, 0\.5 ms\), APP-003 → EXT-002 \(round trip across a region, 10 ms\)/);
  assert.match(f.detail, /Reference figures for estimation \(LN-009, LN-006\), not measurements/);
  assert.equal(s.budget.ms, 31); assert.equal(s.budget.targetMs, 15); assert.equal(s.budget.hops, 5);
  assert.deepEqual(s.figures.sort(), ['LN-006', 'LN-009']);
  assert.equal(BRAIN_TRADEOFFS.figures.find(x => x.id === 'LN-009').value / 1e6, 10, 'a round trip across a region is the pack\'s 10 ms');
  const same = clone(r); same.runtime.placements.find(l => l.planId === 'run-002').zoneId = 'zone-a';
  assert.equal(scaleReadings(same).budget.ms, 21.5, 'back in one failure domain the first hop is 0.5 ms');
  assert.ok(!codes(scaleReadings(fx)).includes('SCALE-LATENCY-BUDGET'), 'a 2,000 ms target is not spent');
  const racks = clone(r); racks.runtime.zones[0].failureDomain = 'Rack 1'; racks.runtime.zones[1].failureDomain = 'Rack 2';
  assert.equal(scaleReadings(racks).budget.ms, 21.5, 'different domains that name no region read as one data centre');
  pass('the latency budget: with APP-001 and APP-002 in regions apart, the reference round trips along the required path take 31 ms against a 15 ms target — SCALE-LATENCY-BUDGET on the entry\'s plan, naming each hop, its figure and LN-006/LN-009 as estimation figures; one domain reads 0.5 ms a hop, racks are one data centre, and a 2,000 ms target raises nothing');
}

// ---------------------------------------------------------------- 6. Chapter 10 carries them as to confirm
{
  const fs = runtimeFindings(fx);
  for (const code of SCALE_CODES.filter(c => c !== 'SCALE-NO-TARGET' && c !== 'SCALE-LATENCY-BUDGET')) assert.ok(fs.some(f => f.code === code), code + ' reaches Chapter 10\'s checks');
  assert.ok(fs.filter(f => f.code.startsWith('SCALE-')).every(f => f.level === 'warning'));
  assert.ok(runtimeFindings(bank).some(f => f.id === 'SCALE-NO-TARGET:project'));
  const ck = chapterChecks(fx, 10), run1 = ck.passages.find(x => x.id === 'run-001'), whole = ck.passages.find(x => x.id === 'project');
  assert.ok(run1.confirm.some(c => c.id.endsWith('SCALE-UNDER-PROVISIONED:run-001')), 'the plan\'s passage reads the finding as to confirm');
  assert.ok(!run1.fix.some(c => /SCALE-/.test(c.id)), 'never to fix');
  assert.ok(whole.confirm.some(c => c.id.endsWith('SCALE-UNCONFIRMED:project')), 'the project-level finding sits on the chapter as a whole');
  assert.equal(CHECK_WORDS.confirm, 'to confirm');
  assert.deepEqual(runtimeMilestones(fx).map(m => m.done), runtimeMilestones(bank).map(m => m.done), 'the milestones do not move on a derived reading');
  assert.equal(JSON.stringify(bank), before, 'reading changes nothing');
  pass('Chapter 10 carries the scale findings as warnings: Validate reads each on its plan, or on the chapter as a whole, as to confirm and never to fix; the milestones do not move; reading changes nothing');
}
console.log(JSON.stringify({passed: checks.length, checks, limits: ['Derived from the recorded targets with named assumptions; the reference latency figures are orders of magnitude for estimation, not measurements of any system.']}, null, 2));
