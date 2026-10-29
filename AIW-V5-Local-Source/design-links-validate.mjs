// The links Chapters 6 to 10 hold of their own (round 12, DM-02, DM-03, DM-04, DM-15, DM-18, DM-23, DM-26):
//   - the requirements and requirement groups a record answers itself, on needs, capabilities, realisations, parties,
//     contracts, data definitions, threats, controls, runtime plans and paths, apart from the trail it inherits; words
//     that cite a requirement the record does not link are one finding per chapter;
//   - a party as an external integration, read from its own words first, then from its contracts;
//   - a runtime plan's targets and schedule, compared with the drivers they name, and the two driver slots a plan of the
//     previous release kept, read as targets on read without changing the stored document;
//   - what a runtime path crosses, read from its contract's ends or stated; a zone that holds several boundaries;
//   - several needs in one category, keyed by id; the systems that capture, post and own a data definition;
//   - field types for a reference, money, a date and a time, and lineage that ends at a party.
// Run: npm run test:design-links
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {seedProject} from './public/requirements-domain.js';
import {applyRequirementsCommand} from './public/requirement-commands.js';
import {applyCanonical} from './public/canonical-command.js';
import {withFinalReview} from './public/review-domain.js';
import * as tech from './public/technology-domain.js';
import * as itf from './public/interfaces-domain.js';
import * as sec from './public/security-domain.js';
import * as rt from './public/runtime-domain.js';
import {planTargets, driverLinksOf, driverLinkText} from './public/driver-links.js';

const checks = [], pass = n => { checks.push(n); console.log('PASS', n); };
const at = '2026-10-08T10:00:00.000Z';
let p = applyRequirementsCommand(withFinalReview(seedProject()), {type: 'requirements.group', payload: {title: 'Payment entry', kind: 'module', memberIds: ['REQ-001', 'REQ-002']}}, at).document;
const group = p.requirementGroups.records[0].id;
const run = (type, payload) => { const r = applyCanonical(p, {type, payload}, at, 'architect-a'); p = r.document; return r.selected; };
const refused = (type, payload, words) => assert.throws(() => applyCanonical(p, {type, payload}, at), words, type);

// 1. Requirements a record answers itself (DM-02, DM-03).
{
  const grounds = {requirementIds: ['REQ-003'], requirementGroupIds: [group]};
  const need = tech.needsFor(p, 'api-pod')[0];
  run('technology.needs', {applicationId: 'api-pod', needs: tech.needsFor(p, 'api-pod').map(n => n.id === need.id ? {id: n.id, category: n.category, ...grounds} : {id: n.id, category: n.category})});
  run('technology.capability', {id: 'tc-001', ...grounds});
  run('techrealisation.plan', {id: 'tr-001', ...grounds});
  run('interfaces.party', {id: 'ext-core', ...grounds});
  run('interfaces.contract', {id: 'rest', ...grounds});
  run('interfaces.data', {id: 'instruction', ...grounds});
  run('security.threat', {id: 'thr-001', ...grounds});
  run('security.control', {id: 'oauth', ...grounds});
  run('runtime.plan', {id: 'run-001', ...grounds});
  run('runtime.path', {id: 'RP-001', ...grounds});
  const records = [tech.needsFor(p, 'api-pod').find(n => n.id === need.id), tech.capability(p, 'tc-001'), p.technologyRealisation.records[0], itf.party(p, 'ext-core'), itf.contract(p, 'rest'), itf.dataRecord(p, 'instruction'), sec.threat(p, 'thr-001'), sec.control(p, 'oauth'), rt.plan(p, 'run-001'), rt.runtimePath(p, 'RP-001')];
  for (const r of records) {
    assert.deepEqual([r.requirementIds, r.requirementGroupIds], [['REQ-003'], [group]], (r.ref || r.id) + ' keeps its links');
    assert.deepEqual(tech.groundIds(p, r), ['REQ-003', 'REQ-001', 'REQ-002'], (r.ref || r.id) + ': a group reads as its members');
  }
  refused('runtime.path', {id: 'RP-001', requirementGroupIds: ['RG-999']}, /Choose existing requirement groups; RG-999 is not in this project\./);
  refused('security.control', {id: 'oauth', requirementIds: ['REQ-001', 'nope', 'REQ-404']}, /Choose existing requirements; nope, REQ-404 are not in this project\./);
  run('interfaces.contract', {id: 'rest', requirementIds: {add: ['REQ-001'], remove: ['REQ-003']}});
  assert.deepEqual(itf.contract(p, 'rest').requirementIds, ['REQ-001']);
  run('interfaces.contract', {id: 'rest', title: 'Payment initiation'});
  assert.deepEqual([itf.contract(p, 'rest').requirementIds, itf.contract(p, 'rest').requirementGroupIds], [['REQ-001'], [group]], 'a save that does not mention the links keeps them');
  const trail = itf.interfaceSources(p, itf.contract(p, 'rest')).requirements.map(a => a.id);
  assert.ok(trail.length, 'the inherited trail is read apart');
  // Words that cite a requirement without linking it: one finding per chapter, cleared by linking.
  run('security.control', {id: 'audit', verificationPlan: 'Replay the posting journey of REQ-004 and check the trail.'});
  const cited = sec.securityFindings(p).filter(f => f.code === 'cited-not-linked');
  assert.equal(cited.length, 1); assert.deepEqual(cited[0].items, [{objectId: 'audit', requirementIds: ['REQ-004']}]);
  run('security.control', {id: 'audit', requirementIds: ['REQ-004']});
  assert.equal(sec.securityFindings(p).filter(f => f.code === 'cited-not-linked').length, 0);
  pass('needs, capabilities, realisations, parties, contracts, data definitions, threats, controls, runtime plans and paths name the requirements and groups they answer (a group read as its members, unknown ids refused by name, {add, remove} and a save that leaves them out keep them), apart from the inherited trail; words citing an unlinked requirement are one finding per chapter until linked');
}

// 2. A party as an external integration (DM-15): its own words first, then its contracts.
{
  run('interfaces.party', {id: 'ext-network', kind: 'payment network', status: 'current', source: 'Scheme rulebook, section 4', protocols: 'ISO 20022 over a private link'});
  const x = itf.partyIntegration(p, 'ext-network');
  assert.deepEqual([x.kind, x.status, x.source, x.protocols.source, x.protocols.text], ['payment network', 'current', 'Scheme rulebook, section 4', 'party', 'ISO 20022 over a private link']);
  assert.equal(x.dataFormats.source, 'contracts'); assert.ok(x.dataFormats.refs.length);
  assert.ok(x.contracts.some(c => c.id === 'network'), 'its contracts');
  assert.deepEqual(itf.partyIntegration(p, 'nobody'), null);
  refused('interfaces.party', {id: 'ext-network', kind: 'bank'}, /Choose the kind of party, or leave it not stated\./);
  run('interfaces.lineage', {from: 'settlement', to: 'ext-network', title: 'Settlement report to the scheme', transformation: 'Daily file', owner: 'Payments operations'});
  assert.deepEqual(itf.partyIntegration(p, 'ext-network').flows.map(f => f.dataId), ['settlement'], 'lineage may end at a party');
  assert.ok(!itf.interfaceFindings(p).some(f => f.code === 'lineage-link'));
  assert.ok(itf.exportInterfacesMarkdown(p).includes('Kind: payment network · State: current'));
  pass('a party records its kind, state, source and integration words; partyIntegration reads its own words first, then its contracts, with the data that flows to it through lineage; an unknown kind is refused; lineage may end at a party');
}

// 3. A runtime plan's targets and schedule (DM-04), compared with the drivers they name.
{
  run('runtime.plan', {id: 'run-002', lossMinutes: '30', targets: [{kind: 'availability', driverId: 'QD-002', operator: 'At least', value: '99.5', window: '', basis: 'Vendor service level'}, {kind: 'data-loss', driverId: 'QD-004'}, {kind: 'latency', driverId: 'QD-003', operator: 'At most', value: '1500', unit: 'ms'}],
    schedule: {serviceHours: 'Every day, all day', maintenanceWindows: [{name: 'Patching', start: '02:00', end: '03:00', timeZone: 'UTC', recurrence: 'Sundays'}], batchWindows: [{name: 'End of day', start: '23:00', end: '01:30', timeZone: 'UTC', cutOff: '22:30', contents: 'Settlement files', contractIds: ['network'], onlineDuring: 'Payment entry', driverId: 'QD-004'}]}});
  const op = rt.planOperation(p, rt.plan(p, 'run-002'));
  assert.deepEqual(op.targets.map(t => [t.kind, t.link?.state]), [['availability', 'breaks'], ['data-loss', 'breaks'], ['latency', 'holds']]);
  assert.match(op.targets[0].link.why, /99\.5 % does not meet QD-002's at least 99\.9 %; its measurement window is not stated\./);
  assert.match(op.targets[1].link.why, /Loses at most 30 min, longer than QD-004's 15 min\./);
  assert.equal(op.schedule.batchWindows[0].minutes, 150); assert.equal(op.schedule.batchWindows[0].link.state, 'breaks');
  assert.match(op.text, /Availability: at least 99\.5 %; its window is not stated; serves QD-002\./);
  const fs = rt.runtimeFindings(p).filter(f => f.objectId === 'run-002');
  assert.deepEqual(fs.filter(f => ['target-driver', 'batch-driver'].includes(f.code)).map(f => f.id), ['target-driver:run-002:0', 'target-driver:run-002:1', 'batch-driver:run-002:0']);
  run('runtime.plan', {id: 'run-002', schedule: {serviceHours: 'Weekdays 08:00 to 18:00'}});
  assert.deepEqual([rt.plan(p, 'run-002').schedule.serviceHours, rt.plan(p, 'run-002').schedule.batchWindows.length], ['Weekdays 08:00 to 18:00', 1], 'a schedule field left out is kept');
  for (const [payload, words] of [
    [{targets: [{kind: 'availability', value: '101'}]}, /percentage from 0 to 100/],
    [{targets: [{kind: 'uptime'}]}, /Choose what each target measures/],
    [{targets: [{kind: 'latency', driverId: 'QD-999'}]}, /existing quality drivers/],
    [{schedule: {batchWindows: [{start: '25:00'}]}}, /HH:MM on a 24-hour clock/],
    [{schedule: {batchWindows: [{contractIds: ['missing']}]}}, /Choose existing contracts for the batch window; missing is not in this project\./]]) refused('runtime.plan', {id: 'run-002', ...payload}, words);
  run('runtime.plan', {id: 'run-002', schedule: null, targets: null});
  assert.deepEqual([rt.plan(p, 'run-002').schedule, rt.plan(p, 'run-002').targets], [undefined, []]);
  pass('a plan states targets (availability against a percentage, its window stated or not; data loss read from the plan; latency across units) and a schedule (hours, maintenance and batch windows, a batch window against its driver), each compared with the driver it names; a field left out is kept; bad values are refused by name; null clears them');
}

// 4. A plan the previous release wrote: two driver slots read as targets on read, nothing stored changes until a save.
{
  const fixture = JSON.parse(brotliDecompressSync(readFileSync('evaluation/legacy-readings.json.br')).toString('utf8'));
  const legacy = structuredClone(fixture.states[0].document);
  Object.assign(legacy.runtime.plans[0], {recoveryMinutes: '20', driverId: 'QD-004', capacityDriverId: 'QD-002'});
  const stored = JSON.stringify(legacy), r0 = legacy.runtime.plans[0];
  assert.deepEqual(planTargets(r0).map(t => [t.kind, t.driverId, t.value]), [['recovery-time', 'QD-004', ''], ['capacity', 'QD-002', '']]);
  const links = driverLinksOf(legacy, r0.id).map(driverLinkText);
  assert.deepEqual(links, ['Serves QD-004 Resolve uncertainty without unsafe retries · recorded 20 minutes · target at most 15 minutes · disagrees: Recovers in 20 min, longer than QD-004\'s 15 min.', 'Serves QD-002 ' + legacy.quality.drivers.find(d => d.id === 'QD-002').title + ' · recorded 1 replicas · target at least 99.9 % · not compared: Recorded in replicas, the target in %: compare them by hand.'], 'the readings the previous release gave');
  const read = rt.withRuntime(legacy);
  assert.equal(JSON.stringify(legacy), stored, 'reading changes nothing stored');
  assert.deepEqual([read.runtime.plans[0].driverId, 'targets' in read.runtime.plans[0]], ['QD-004', false]);
  let q = applyCanonical(read, {type: 'runtime.plan', payload: {id: r0.id, recoveryMinutes: '20'}}, at).document;
  assert.deepEqual([rt.plan(q, r0.id).revision, rt.plan(q, r0.id).driverId], [r0.revision, 'QD-004'], 'an unchanged save keeps the plan as the previous release wrote it');
  q = applyCanonical(read, {type: 'runtime.plan', payload: {id: r0.id, owner: 'Payments on-call'}}, at).document;
  const r1 = rt.plan(q, r0.id);
  assert.deepEqual([r1.driverId, r1.capacityDriverId, r1.targets.map(t => [t.kind, t.driverId])], [undefined, undefined, [['recovery-time', 'QD-004'], ['capacity', 'QD-002']]], 'a save stores the targets and no slot');
  assert.deepEqual(driverLinksOf(q, r0.id).map(driverLinkText), links, 'and reads the same');
  pass('a plan the previous release wrote keeps its two driver slots stored and reads them as a recovery-time and a capacity target, giving the readings that release gave; an unchanged save keeps it as written; the next save stores the targets, drops the slots and reads the same');
}

// 5. What a runtime path crosses (DM-23), and a zone that holds several boundaries.
{
  const x = rt.pathCrossing(p, rt.runtimePath(p, 'RP-001'));
  assert.deepEqual([x.outside, x.source, x.boundaryIds], [true, 'contract', ['tb-002']], 'a contract from a party crosses into its component\'s boundary');
  run('runtime.path', {id: 'RP-001', access: 'Mutual TLS at the edge.', route: 'edge to API', owner: 'Edge team', failureResponse: 'Reject with retry advice.'});
  const crossing = rt.runtimeFindings(p).filter(f => f.code === 'crossing-control');
  assert.equal(crossing.length, 1); assert.ok(crossing[0].items.some(i => i.objectId === 'RP-001'));
  run('security.control', {id: 'mtls', targetIds: {add: ['tb-002']}});
  run('runtime.path', {id: 'RP-001', access: 'Mutual TLS at the edge, enforced by ' + sec.control(p, 'mtls').ref + '.'});
  assert.ok(!rt.runtimeFindings(p).filter(f => f.code === 'crossing-control').some(f => f.items.some(i => i.objectId === 'RP-001')), 'naming the control of the crossed boundary clears it');
  run('runtime.path', {id: 'RP-001', boundaryIds: ['tb-001', 'tb-002']});
  assert.deepEqual([rt.pathCrossing(p, rt.runtimePath(p, 'RP-001')).source, rt.pathCrossing(p, rt.runtimePath(p, 'RP-001')).boundaryIds], ['path', ['tb-001', 'tb-002']]);
  run('runtime.path', {id: 'RP-001', boundaryIds: null});
  assert.equal(rt.pathCrossing(p, rt.runtimePath(p, 'RP-001')).source, 'contract', 'null reads them from the contract again');
  refused('runtime.path', {id: 'RP-001', boundaryIds: ['tb-404']}, /Choose existing trust boundaries; tb-404 is not in this project\./);
  run('runtime.zone', {id: 'zone-a', kind: 'hosting', boundaryIds: ['tb-002', 'tb-003']});
  assert.deepEqual([rt.zone(p, 'zone-a').boundaryIds, rt.zone(p, 'zone-a').boundaryId, rt.zoneBoundaries(rt.zone(p, 'zone-a'))], [['tb-002', 'tb-003'], 'tb-002', ['tb-002', 'tb-003']]);
  const branch = run('runtime.zone', {environmentId: 'env-001', title: 'Branches', kind: 'access', owner: 'Branch operations', failureDomain: 'Branch network', isolation: 'Separate network'});
  assert.ok(!rt.runtimeFindings(p).some(f => f.code === 'zone-trust' && f.objectId === branch), 'a zone people connect from holds no boundary of the design');
  assert.deepEqual(rt.zoneBoundaries({boundaryId: 'tb-001'}), ['tb-001'], 'a zone of the previous release reads its one boundary');
  pass('a path\'s crossing is read from its contract\'s ends (a party is outside), or stated, and null reads it again; a crossing path whose access names no control of the crossed boundary is one finding until it does; a zone holds several boundaries (the first kept for earlier readers) and an access zone holds none');
}

// 6. Several needs in one category (DM-26), and the systems that capture, post and own a data definition.
{
  const before = tech.needsFor(p, 'risk-engine');
  run('technology.needs', {applicationId: 'risk-engine', needs: [...before.map(n => ({id: n.id, category: n.category})), {category: 'compute', description: 'Run the nightly rescoring batch apart from the online checks.', criticality: 'degraded'}]});
  const after = tech.needsFor(p, 'risk-engine');
  assert.equal(after.filter(n => n.category === 'compute').length, 2, 'two compute needs');
  assert.deepEqual(after.slice(0, before.length).map(n => n.id), before.map(n => n.id), 'each kept by its id');
  refused('technology.needs', {applicationId: 'risk-engine', needs: [{id: 'TN-404', category: 'compute'}]}, /TN-404 is not a need of/);
  run('interfaces.data', {id: 'posting', authorities: [{id: 'ext-core', role: 'owns'}, {id: 'worker', role: 'posts'}, {id: 'api-pod', role: 'captures'}]});
  assert.deepEqual(itf.dataAuthorities(p, itf.dataRecord(p, 'posting')).map(a => a.role + ':' + a.id), ['owns:ext-core', 'posts:worker', 'captures:api-pod']);
  assert.equal(itf.dataRecord(p, 'posting').authorityId, 'ext-core');
  assert.deepEqual(itf.dataAuthorities(p, itf.dataRecord(p, 'settlement')).map(a => a.role), ['owns'], 'a definition with one authority reads it as the owner');
  refused('interfaces.data', {id: 'posting', authorities: [{id: 'worker', role: 'edits'}]}, /Say whether .* captures, posts or owns the data\./);
  pass('an application holds several needs in one category, each kept by its id (an unknown id refused); a data definition names the systems that capture, post and own it, and one with a single authority reads it as the owner');
}

// 7. Field types (DM-18): a reference, money, a date and a time, checked by the sample payload.
{
  run('interfaces.field', {id: 'instruction', field: {name: 'debtorAccountId', type: 'reference', referencesDataId: 'posting', cardinality: 'one', description: 'The account the payment debits.'}});
  run('interfaces.field', {id: 'instruction', field: {name: 'fee', type: 'money', currency: 'NGN', description: 'The fee charged.'}});
  run('interfaces.field', {id: 'instruction', field: {name: 'valueDate', type: 'date', description: 'The day the payment takes value.'}});
  run('interfaces.field', {id: 'instruction', field: {name: 'receivedAt', type: 'date-time', description: 'When the instruction arrived.'}});
  run('interfaces.field', {id: 'instruction', field: {name: 'charges', type: 'money', description: 'Other charges.'}});
  const fs = itf.interfaceFindings(p);
  assert.ok(fs.some(f => f.code.startsWith('field-currency') && f.detail.includes('currency')), 'money without its currency is a warning');
  refused('interfaces.field', {id: 'instruction', field: {name: 'badRef', type: 'reference', referencesDataId: 'nothing', description: 'x'}}, /Choose the existing data definition this field refers to\./);
  refused('interfaces.field', {id: 'instruction', field: {name: 'badMoney', type: 'money', currency: 'naira', description: 'x'}}, /three-letter code, or the field that carries it/);
  const sample = itf.samplePayload(p, itf.contract(p, 'rest'));
  const good = itf.evaluateContract(p, 'rest', sample);
  assert.ok(!good.issues.some(i => /valueDate|receivedAt|fee|debtorAccountId/.test(i.message)), 'the sample satisfies the new types: ' + JSON.stringify(good.issues));
  const bad = itf.evaluateContract(p, 'rest', JSON.stringify({...JSON.parse(sample), valueDate: '31/01/2026', receivedAt: 'yesterday', fee: '12'}));
  assert.deepEqual(bad.issues.filter(i => /valueDate|receivedAt|fee/.test(i.message)).map(i => i.message), ['fee must be an amount.', 'valueDate must be a date (YYYY-MM-DD).', 'receivedAt must be a date and time (ISO 8601).']);
  pass('a field may be a reference (to an existing definition, with its cardinality), money (with its currency code or field), a date or a time; the sample payload satisfies them and the contract check names a value of the wrong form');
}

console.log(JSON.stringify({suite: 'design-links', passed: checks.length, checks}, null, 1));
