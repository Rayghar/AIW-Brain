// Resilience beside security (round 6, Contract K; audit/round6/DESIGN.md): resilienceDrafts(p) in public/security-domain.js
// proposes, for each contract with a party at either end and for each zone, a 'Service disruption' threat and a
// 'Recovery & availability' control in AIW's resilience vocabulary; securityFindings raises RESILIENCE-MISSING (to
// confirm) for an external contract with neither such a control naming it nor its own timeout, retry and failure
// policies; securityProposal offers the control as a reviewed ghost. The suite asserts:
//   the drafts: one pair per external contract and per zone of the bank reference (3 + 2), each threat 'Service
//     disruption' on existing targets, each control 'Recovery & availability' naming its mechanisms from the vocabulary,
//     the provider side and the caller side worded differently, a zone's threat on the parts placed in it (its trust
//     boundary when nothing is placed), a contract already named by a Service disruption threat drafted no more;
//   the guided chain: a draft's answers pass Chapter 9's own creation (compileCreation) and create the threat and the
//     control, exactly as the lead's Chapter 9 journey rule will commit them;
//   RESILIENCE-MISSING: raised for the three external contracts of the bank, cleared by a Recovery & availability control
//     that names the contract, or by the contract's own timeout, retry and failure policies; a warning, so Chapter 9's
//     Validate reads it as to confirm and the design handoff stays attainable;
//   the proposal: securityProposal(p, 'resilience', threatId) returns the control for the contract the threat names, and
//     security.proposal saves it, reviewed; the reference projects draft one pair per external contract plus their zones;
//   pure: nothing changes the project.
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {createProject} from './shared/projects-domain.js';
import {compileCreation, creationFields} from './public/guided-creation.js';
import {applyInterfacesCommand} from './public/interfaces-domain.js';
import {withSecurity, applySecurityCommand, securityFindings, securityProposal, securityTarget, resilienceDraft, resilienceDrafts, externalContracts, contractResilient, RESILIENCE_MECHANISMS, RESILIENCE_THREAT, RESILIENCE_CONTROL, CONTROL_CATEGORIES, THREAT_CATEGORIES, controls, threats, securityMilestones} from './public/security-domain.js';
import {chapterChecks} from './public/readiness-model.js';

const checks = [], pass = n => { checks.push(n); console.log('PASS', n); };
const at = '2026-10-02T09:00:00.000Z';
const bank = withFinalReview(seedProject()), before = JSON.stringify(bank);
const missing = p => securityFindings(p).filter(f => f.code === 'RESILIENCE-MISSING');

// ---------------------------------------------------------------- 1. the drafts
{
  assert.ok(CONTROL_CATEGORIES.includes(RESILIENCE_CONTROL) && THREAT_CATEGORIES.includes(RESILIENCE_THREAT));
  assert.deepEqual(RESILIENCE_MECHANISMS, ['timeout', 'retry with backoff', 'circuit breaker', 'bulkhead', 'backpressure', 'rate limit', 'failover', 'backup and restore', 'autoscaling']);
  const ds = resilienceDrafts(bank);
  assert.deepEqual(externalContracts(bank).map(c => c.id), ['rest', 'posting-api', 'network']);
  assert.deepEqual(ds.map(d => [d.key, d.about, d.objectId]), [['r1', 'contract', 'rest'], ['r2', 'contract', 'posting-api'], ['r3', 'contract', 'network'], ['r4', 'zone', 'zone-a'], ['r5', 'zone', 'zone-b']], 'one pair per external contract, then per zone');
  for (const d of ds) {
    assert.equal(d.threat.category, RESILIENCE_THREAT); assert.equal(d.control.category, RESILIENCE_CONTROL);
    assert.ok(d.threat.targetIds.length && d.threat.targetIds.every(id => securityTarget(bank, id)), `${d.key}: the threat names existing targets`);
    assert.deepEqual(d.control.targetIds, d.threat.targetIds);
    assert.ok(d.mechanisms.length >= 3 && d.mechanisms.every(m => RESILIENCE_MECHANISMS.includes(m)), `${d.key}: mechanisms from the vocabulary`);
    for (const m of d.mechanisms) assert.ok(d.control.mechanism.toLowerCase().includes(m), `${d.key}: the mechanism text names ${m}`);
    for (const f of ['title', 'actor', 'scenario', 'consequence', 'priority', 'priorityBasis']) assert.ok(d.threat[f], `${d.key}: threat ${f}`);
    for (const f of ['title', 'purpose', 'mechanism', 'enforcement', 'failureMode', 'failureResponse', 'telemetry', 'verificationPlan', 'operatingObligations']) assert.ok(d.control[f], `${d.key}: control ${f}`);
    assert.equal(d.control.failureMode, 'Deny or contain');
    assert.ok(d.upstream.includes(d.objectId));
  }
  const rest = ds[0], posting = ds[1];
  assert.match(rest.threat.title, /^Disruption of Payment initiation$/); assert.match(rest.threat.scenario, /Initiating channel does not answer Payment initiation, answers late or returns errors/);
  assert.deepEqual(rest.mechanisms, ['rate limit', 'backpressure', 'autoscaling', 'timeout'], 'a party that calls in: the caller side');
  assert.deepEqual(posting.mechanisms, ['timeout', 'retry with backoff', 'circuit breaker', 'bulkhead'], 'a party that is called: the provider side');
  assert.match(posting.control.mechanism, /A timeout on Ledger posting \(to be set\)/); assert.match(posting.control.failureResponse, /^When Core banking authority is unavailable: keep each outcome pending/);
  assert.match(posting.control.verificationPlan, /Take Core banking authority away in a test/);
  const timed = structuredClone(bank); timed.interfaces.contracts.find(c => c.id === 'posting-api').timeoutMs = '3000'; timed.interfaces.contracts.find(c => c.id === 'posting-api').failurePolicy = 'Keep the posting pending and enquire by reference.';
  assert.match(resilienceDraft(timed, 'posting-api').control.mechanism, /\(3,000 ms\)/); assert.match(resilienceDraft(timed, 'posting-api').control.failureResponse, /unavailable: Keep the posting pending and enquire by reference\./, 'a recorded failure policy is the control\'s own words');
  const zoneA = ds[3], zoneB = ds[4];
  assert.deepEqual(zoneA.threat.targetIds, ['api-pod', 'risk-engine', 'worker'], 'a zone\'s threat is on the parts placed in it');
  assert.match(zoneA.threat.scenario, /Application zone fails as a whole \(Primary site · assumption\), taking every copy placed in it: Payment service, Risk engine, Settlement worker\./);
  assert.deepEqual(zoneB.threat.targetIds, ['tb-002'], 'nothing placed: its trust boundary');
  assert.deepEqual(zoneA.mechanisms, ['failover', 'backup and restore', 'autoscaling', 'bulkhead']);
  // A contract already named by a Service disruption threat is drafted no more; the proposal still shapes it.
  const named = applySecurityCommand(bank, {type: 'security.threat', payload: {title: 'Channel down', category: RESILIENCE_THREAT, priority: 'High', targetIds: ['rest'], actor: 'x', scenario: 'x', consequence: 'x', owner: 'x', priorityBasis: 'x', assumptions: '', assumptionsResolved: true}}, at).document;
  assert.deepEqual(resilienceDrafts(named).map(d => d.objectId), ['posting-api', 'network', 'zone-a', 'zone-b']);
  assert.ok(resilienceDraft(named, 'rest'));
  assert.equal(resilienceDraft(bank, 'if-does-not-exist'), null); assert.equal(resilienceDraft(bank, 'instruction'), null, 'a data definition is not a contract or a zone');
  assert.equal(JSON.stringify(bank), before);
  pass('the drafts: the bank reference yields a Service disruption threat and a Recovery & availability control for each of its 3 external contracts and 2 zones, the caller side (rate limit, backpressure, autoscaling, timeout) worded apart from the provider side (timeout, retry with backoff, circuit breaker, bulkhead), a recorded timeout and failure policy carried into the words, a zone\'s threat on the parts placed in it or its trust boundary, and a contract already named drafted no more');
}

// ---------------------------------------------------------------- 2. through Chapter 9's own creation, as the journey rule commits
{
  const d = resilienceDrafts(bank)[1];
  const answers = {targetId: d.threat.targetIds[0], title: d.threat.title, category: d.threat.category, scenario: d.threat.scenario, consequence: d.threat.consequence, priority: d.threat.priority, priorityBasis: d.threat.priorityBasis, controlTitle: d.control.title, controlCategory: d.control.category, mechanism: d.control.mechanism, verificationPlan: d.control.verificationPlan, owner: d.owner || 'Unassigned'};
  const fields = creationFields(bank, 9, answers);
  for (const f of fields) assert.ok(Object.hasOwn(answers, f.key), 'the draft answers ' + f.key); 
  for (const f of fields.filter(f => f.options)) assert.ok(f.options.some(o => o.id === answers[f.key]), `${f.key}: ${answers[f.key]} is a choice the question offers`);
  const r = compileCreation(bank, 9, answers, at);
  assert.equal(r.created.length, 2, 'a threat and its control');
  const t = threats(r.document).at(-1), k = controls(r.document).at(-1);
  assert.deepEqual([t.category, t.targetIds, t.title], [RESILIENCE_THREAT, ['posting-api'], 'Disruption of Ledger posting']);
  assert.deepEqual([k.category, k.targetIds, k.threatIds, k.title], [RESILIENCE_CONTROL, ['posting-api'], [t.id], 'Keep Core connector serving when Core banking authority is unavailable']);
  assert.equal(k.mechanism, d.control.mechanism);
  assert.deepEqual(resilienceDrafts(r.document).map(x => x.objectId), ['rest', 'network', 'zone-a', 'zone-b'], 'committed, the contract is drafted no more');
  assert.deepEqual(missing(r.document).map(f => f.objectId), ['rest', 'network'], 'and its RESILIENCE-MISSING is cleared');
  pass('through Chapter 9\'s own creation: a draft\'s answers fit every creation question (the categories are choices it offers), compileCreation creates the Service disruption threat and its Recovery & availability control on the contract, and the contract is then drafted no more and no longer missing its resilience');
}

// ---------------------------------------------------------------- 3. RESILIENCE-MISSING raised and cleared
{
  const fs = missing(bank);
  assert.deepEqual(fs.map(f => [f.id, f.objectId, f.level]), [['RESILIENCE-MISSING:rest', 'rest', 'warning'], ['RESILIENCE-MISSING:posting-api', 'posting-api', 'warning'], ['RESILIENCE-MISSING:network', 'network', 'warning']]);
  assert.equal(fs[0].title, 'Plan for the disruption of IF-001');
  assert.match(fs[0].detail, /no Recovery & availability control names it, and its timeout, retry and failure policies are not all recorded in Chapter 8/);
  // Cleared by a control of the category naming the contract.
  const covered = applySecurityCommand(bank, {type: 'security.control', payload: {title: 'Keep intake serving', category: RESILIENCE_CONTROL, failureMode: 'Deny or contain', targetIds: ['rest'], threatIds: ['thr-001'], purpose: 'x', owner: 'x', enforcement: 'x', mechanism: 'timeout, retry with backoff, circuit breaker', failureResponse: 'x', telemetry: 'x', verificationPlan: 'x', operatingObligations: 'x', assumptions: '', assumptionsResolved: true}}, at).document;
  assert.deepEqual(missing(covered).map(f => f.objectId), ['posting-api', 'network']);
  const other = applySecurityCommand(bank, {type: 'security.control', payload: {title: 'Not resilience', category: 'Service trust', failureMode: 'Deny or contain', targetIds: ['rest'], threatIds: ['thr-001'], purpose: 'x', owner: 'x', enforcement: 'x', mechanism: 'x', failureResponse: 'x', telemetry: 'x', verificationPlan: 'x', operatingObligations: 'x', assumptions: '', assumptionsResolved: true}}, at).document;
  assert.equal(missing(other).length, 3, 'a control of another category does not clear it');
  // Cleared by the contract's own policies, all three.
  const c = bank.interfaces.contracts.find(x => x.id === 'posting-api');
  const policy = (patch) => withSecurity(applyInterfacesCommand(bank, {type: 'interfaces.contract', payload: {...c, exchanges: c.exchanges.map(x => ({dataId: x.dataId, role: x.role})), ...patch}}, at).document);
  const full = policy({timeoutMs: '3000', retryPolicy: 'Retry twice with backoff under the idempotency key, then enquire.', failurePolicy: 'Keep the posting pending and enquire by reference before any replay.'});
  assert.ok(contractResilient(full.interfaces.contracts.find(x => x.id === 'posting-api')));
  assert.deepEqual(missing(full).map(f => f.objectId), ['rest', 'network'], 'timeout, retry and failure policies together clear it');
  assert.equal(missing(policy({timeoutMs: '3000', retryPolicy: 'Retry twice.'})).length, 3, 'two of the three do not');
  assert.equal(missing(policy({timeoutMs: '3000', retryPolicy: 'Retry twice.', failurePolicy: 'Open question: what should happen when the outcome is unavailable? Not stated.'})).length, 3, 'an open question is no policy');
  // To confirm on Chapter 9's Validate, on the Chapter 8 record as Chapter 9 reads it; the handoff stays attainable.
  const ck = chapterChecks(bank, 9), x = ck.passages.find(p => p.id === 'rest');
  assert.ok(x && x.confirm.some(i => i.id.endsWith('RESILIENCE-MISSING:rest')) && !x.fix.some(i => /RESILIENCE/.test(i.id)), 'to confirm, never to fix');
  assert.ok(!securityMilestones(bank).find(m => m.id === 'validate').done && securityFindings(bank).filter(f => f.level === 'error').length > 0, 'the bank has its own errors; the resilience finding is not one of them');
  assert.equal(JSON.stringify(bank), before);
  pass('RESILIENCE-MISSING: raised for IF-001, IF-002 and IF-003 of the bank as warnings on the contract; cleared by a Recovery & availability control naming the contract (not by a control of another category) or by the contract\'s own timeout, retry and failure policies, all three and none an open question; Chapter 9\'s Validate reads it as to confirm, never to fix');
}

// ---------------------------------------------------------------- 4. the proposal, and the reference projects
{
  const q = securityProposal(bank, 'resilience', 'thr-001');
  assert.ok(q && q.kind === 'control' && q.objectId === 'thr-001');
  assert.deepEqual([q.record.category, q.record.threatIds, q.record.targetIds], [RESILIENCE_CONTROL, ['thr-001'], ['rest', 'instruction']], 'the control for the contract the threat names, on the threat\'s other targets too (the data it names)');
  assert.match(q.record.title, /^Keep Payment service serving when Initiating channel is unavailable$/);
  assert.match(q.reason, /resilience vocabulary, not a measurement/);
  const saved = applySecurityCommand(bank, {type: 'security.proposal', payload: {key: 'resilience', objectId: 'thr-001', record: q.record, reviewed: true}}, at).document;
  assert.equal(controls(saved).at(-1).category, RESILIENCE_CONTROL); assert.equal(controls(saved).at(-1).origin, 'suggestion');
  assert.deepEqual(missing(saved).map(f => f.objectId), ['posting-api', 'network'], 'the saved proposal clears the contract');
  assert.throws(() => applySecurityCommand(bank, {type: 'security.proposal', payload: {key: 'resilience', objectId: 'thr-001', record: q.record}}, at), /Review/);
  assert.equal(securityProposal(bank, 'resilience', 'thr-003'), null, 'a threat on data alone names no contract or zone');
  // The five reference projects, before and after the lead wires resilienceDrafts into the Chapter 9 journey rule: the
  // drafts are exactly the external contracts no Service disruption threat names yet, plus every zone (Chapter 9 is drafted
  // before Chapter 10 exists, so the zones' pairs wait for a re-run); RESILIENCE-MISSING is exactly the external contracts
  // without a resilience control or their own policies; before the wiring that is every external contract.
  const counts = {};
  for (const id of ['service-permits', 'warehouse-fulfilment', 'clinic-appointments', 'parcel-lockers', 'library-reservations']) {
    const p = withFinalReview(createProject({name: id, template: id}, 'res-' + id, at)), ds = resilienceDrafts(p), ext = externalContracts(p);
    const named = new Set(threats(p).filter(t => t.category === RESILIENCE_THREAT).flatMap(t => t.targetIds)), open = ext.filter(c => !named.has(c.id));
    counts[id] = {external: ext.length, disruptionThreats: ext.length - open.length, zones: p.runtime.zones.length, drafts: ds.length, missing: missing(p).length};
    assert.deepEqual(ds.filter(d => d.about === 'contract').map(d => d.objectId), open.map(c => c.id), `${id}: one pair per external contract no Service disruption threat names yet`);
    assert.equal(ds.filter(d => d.about === 'zone').length, p.runtime.zones.length, `${id}: one pair per zone`);
    assert.deepEqual(missing(p).map(f => f.objectId), ext.filter(c => !controls(p).some(k => k.category === RESILIENCE_CONTROL && k.targetIds.includes(c.id)) && !contractResilient(c)).map(c => c.id), `${id}: RESILIENCE-MISSING is exactly the external contracts without a resilience control or their own policies`);
    assert.ok(ext.length >= 1, `${id}: the brief reaches at least one party outside the design`);
  }
  assert.equal(JSON.stringify(bank), before, 'nothing changes the project');
  pass('the proposal: securityProposal(p, "resilience", THR-001) shapes the Recovery & availability control for the contract the threat names and security.proposal saves it reviewed, clearing the contract; the five reference projects: one pair per external contract not yet named by a Service disruption threat and per zone, RESILIENCE-MISSING exactly the external contracts without a resilience control: ' + JSON.stringify(counts));
}
console.log(JSON.stringify({passed: checks.length, checks, limits: ['The drafts are AIW\'s resilience vocabulary applied to the recorded contracts and zones: proposals to confirm, not measurements and not controls in force; the Chapter 9 journey rule commits them only once the lead wires resilienceDrafts into it.']}, null, 2));
