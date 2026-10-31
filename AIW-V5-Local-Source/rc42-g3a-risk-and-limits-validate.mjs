// AIW v0.10.0-rc.10.73.42, group G3a (owner decision, audit/rc42/OWNER-DECISIONS-AND-PLAN-2026-10-30.md): integrity
// fixes D5 and D13 of the handbook gap review (audit/rc41/handbook-review/AIW-HANDBOOK-GAP-REVIEW-2026-10-30.md §3).
//   D5  the architect who records a Chapter 9 residual-risk acceptance could also record its governance approval, and
//       'risk-approval' cleared (deep dive security-architecture). An approval now keeps the signed-in actor, and is
//       refused without one, from an agent account or a draft by Sol, and from the person who recorded the treatment,
//       whatever the four-eyes setting; an approval recorded before with no independent actor stays, and clears nothing.
//   D13 one reviewer could treat a hard-constraint or invariant breach away in Chapter 11 as an accepted limitation that
//       never expired (gap C11-01). Those findings are not waivable now; any other accepted limitation carries a review-by
//       date, and an overdue one reopens its finding.
//   r2  (review) an accepted Chapter 9 risk no longer clears the non-waivable C9 dual-control-uncovered error; the Chapter 9
//       screens say when an approval is not independent; the Chapter 11 review-by date starts tomorrow. The in-place
//       treatment dialog runs in a browser in rc42-g3a-risk-and-limits-browser-validate.mjs.
// Run: npm run test:rc42-g3a-risk-and-limits
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyDecisionCommand} from './public/decisions-domain.js';
import * as sec from './public/security-domain.js';
import * as rv from './public/review-domain.js';
import {fieldOf} from './public/record-fields.js';
import {neutraliseImportedAuthority} from './recovery-service.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';

const checks = [], pass = n => checks.push(n), AT = '2026-10-30T09:00:00.000Z', PAST = '2020-01-01T09:00:00.000Z';
const clone = x => structuredClone(x);
const scmd = (p, type, payload, actor = 'architect-a', options = {}) => sec.applySecurityCommand(p, {type: 'security.' + type, payload}, AT, actor, options).document;
const rcmd = (p, type, payload, actor = 'architect-a', at = AT) => rv.applyFinalReviewCommand(p, {type: 'review.' + type, payload}, at, actor).document;
const qcmd = (p, type, payload) => applyQualityCommand(p, {type: 'quality.' + type, payload}, AT).document;
const dcmd = (p, type, payload) => applyDecisionCommand(p, {type: 'decision.' + type, payload}, AT).document;
const risk = (p, id, treatment = 'accept') => ({id, stamp: sec.threatStamp(p, sec.threat(p, id)), treatment, owner: 'Accountable fixture risk owner', residual: 'Synthetic residual exposure; no runtime proof.', nextReview: '2099-12-31', reviewer: 'Architect fixture', reference: 'Synthetic architecture review record.', observations: 'Synthetic residual-risk review for this suite only.', reviewed: true});
const governance = (p, id, decision = 'approved') => ({id, stamp: sec.securityGovernanceStamp(p, sec.threat(p, id)), decision, reviewer: 'Governance fixture', reference: 'Synthetic governance record; no real approval.', observations: 'Synthetic approval scope for this suite only.', reviewed: true});
const awaitingApproval = (p, id = 'thr-001') => sec.securityFindings(p).some(f => f.code === 'risk-approval' && f.objectId === id);
// Each part runs on its own and reports its first failed assertion, so one defect's failure does not hide another's.
const failures = [];
const part = async (name, run) => { try { await run(); } catch (e) { failures.push(name); console.error('FAIL ' + name + ': ' + (e?.message || e)); } };

// ---------------------------------------------------------------- D5: residual-risk approval by another person
await part('D5 residual-risk approval', () => {
  let p = sec.withSecurity(seedProject());
  p = scmd(p, 'risk', risk(p, 'thr-001'));
  assert.ok(awaitingApproval(p), 'an accepted residual risk waits for approval');
  // The defect, reproduced: the same signed-in person records the approval of the acceptance they recorded.
  assert.throws(() => scmd(p, 'governance', governance(p, 'thr-001')), /second signed-in person records the approval: architect-a recorded the risk treatment RR-001/, 'the person who recorded the treatment cannot approve it');
  for (const fourEyes of [false, true]) {
    const q = clone(p); q.workspace = {...(q.workspace || {}), governance: {...(q.workspace?.governance || {}), fourEyes}};
    assert.throws(() => scmd(q, 'governance', governance(q, 'thr-001')), /second signed-in person/, 'refused with four eyes ' + (fourEyes ? 'on' : 'off'));
  }
  assert.equal(p.security.risks.at(-1).actor, 'architect-a', 'the risk treatment keeps who recorded it');
  assert.throws(() => scmd(p, 'governance', governance(p, 'thr-001'), null), /Sign in to record a governance approval/, 'an approval needs a signed-in person');
  assert.throws(() => scmd(p, 'governance', governance(p, 'thr-001'), 'sol-agent', {author: {kind: 'sol-draft', account: 'agent', id: 'sol-agent'}}), /agent account or a draft by Sol does not approve a residual risk/, 'an agent account or a draft by Sol never approves');
  assert.throws(() => scmd(p, 'governance', governance(p, 'thr-001'), 'approver-b', {author: {kind: 'person', account: 'agent', id: 'approver-b'}}), /agent account or a draft by Sol does not approve/, 'an agent account never approves, whatever it says it is');
  assert.ok(awaitingApproval(p), 'nothing refused cleared the approval');
  pass('D5 reproduced and refused: the person who recorded RR-001 cannot approve it (four eyes on or off); an approval needs a signed-in person; an agent account or a draft by Sol never approves');

  const deferred = scmd(p, 'governance', governance(p, 'thr-001', 'deferred'));
  assert.equal(deferred.security.governance.at(-1).actor, 'architect-a', 'every governance record keeps its signed-in actor');
  assert.ok(awaitingApproval(deferred), 'a deferral approves nothing');
  const approved = scmd(p, 'governance', governance(p, 'thr-001'), 'approver-b'), g = approved.security.governance.at(-1);
  assert.equal(g.actor, 'approver-b'); assert.equal(g.decision, 'approved');
  assert.equal(sec.latestGovernance(approved, 'thr-001').id, g.id);
  assert.ok(sec.independentRiskApproval(sec.latestRisk(approved, 'thr-001'), g), 'recorded by a second signed-in person');
  assert.ok(!awaitingApproval(approved), 'an approval by a second signed-in person clears risk-approval');
  assert.match(sec.exportSecurityMarkdown(approved), new RegExp(g.id + ' · approved · Governance fixture'));
  assert.doesNotMatch(sec.exportSecurityMarkdown(approved), /not recorded by a second signed-in person/);
  pass('a governance record keeps its signed-in actor; a deferral by anyone approves nothing; an approval recorded by a second signed-in person is current and clears risk-approval');

  // Kept from before: an approval with no signed-in actor, and a treatment with none.
  const legacy = clone(p);
  legacy.security.governance.push({id: 'SG-001', threatId: 'thr-001', stamp: sec.securityGovernanceStamp(legacy, sec.threat(legacy, 'thr-001')), at: AT, decision: 'approved', reviewer: 'Earlier reviewer', reference: 'Earlier record', observations: 'Recorded before rc.10.73.42.'});
  const L = sec.withSecurity(legacy);
  assert.equal(sec.latestGovernance(L, 'thr-001')?.id, 'SG-001', 'an approval recorded before stays loadable and current');
  assert.ok(awaitingApproval(L), 'but, with no independent actor, it does not clear risk-approval');
  assert.match(sec.securityFindings(L).find(f => f.code === 'risk-approval').detail, /SG-001 was not recorded by a second signed-in person/);
  assert.match(sec.exportSecurityMarkdown(L), /SG-001 · approved · Earlier reviewer · Earlier record · not recorded by a second signed-in person/);
  const same = clone(p); same.security.governance.push({id: 'SG-001', threatId: 'thr-001', stamp: sec.securityGovernanceStamp(same, sec.threat(same, 'thr-001')), at: AT, actor: 'architect-a', decision: 'approved', reviewer: 'Self', reference: 'Self', observations: 'Self-approved before rc.10.73.42.'});
  assert.ok(awaitingApproval(sec.withSecurity(same)), 'an approval its treatment\'s author recorded clears nothing');
  const untreatedAuthor = clone(p); delete untreatedAuthor.security.risks.at(-1).actor;
  assert.throws(() => scmd(untreatedAuthor, 'governance', governance(untreatedAuthor, 'thr-001'), 'approver-b'), /RR-001 has no signed-in author\. Record the risk treatment again/, 'a treatment with no signed-in author cannot be approved independently');
  pass('an approval recorded before (no actor, or the treatment\'s own author) stays loadable and current but clears nothing, and the finding and export say why; a treatment recorded with no signed-in author is recorded again before approval');

  // A recovery package's identities are historical here (recovery-service.js): imported risk and governance actors are kept
  // as importedActor and never count.
  const imported = rv.withFinalReview(clone(approved));
  neutraliseImportedAuthority(imported, AT);
  const ir = imported.security.risks.at(-1), ig = imported.security.governance.at(-1);
  assert.deepEqual([ir.actor, ir.importedActor, ig.actor, ig.importedActor], [null, 'architect-a', null, 'approver-b']);
  assert.ok(awaitingApproval(sec.withSecurity(imported)), 'an imported approval clears nothing here');
  pass('a restored package keeps the risk and governance actors as imported, historical assertions, so an imported approval clears nothing');
});

// D5 through the server: the actor is the signed-in identity the Worker passes to the chapter.
await part('D5 through the server', async () => {
  const DB = localDatabase(':memory:'), env = {DB, ASSETS: {fetch: () => new Response('asset')}};
  const api = (path, body = null, owner = 'architect-a') => { const headers = new Headers({'oai-authenticated-user-id': owner}); if (body) { headers.set('Content-Type', 'application/json'); headers.set('Origin', 'https://aiw.test'); } return worker.fetch(new Request('https://aiw.test' + path, {method: body ? 'POST' : 'GET', headers, ...(body ? {body: JSON.stringify(body)} : {})}), env); };
  try {
    let state = await (await api('/api/project')).json();
    const q = '?project=' + encodeURIComponent(state.document.id);
    let res = await api('/api/commands' + q, {revision: state.revision, command: {type: 'security.risk', payload: risk(state.document, 'thr-001')}});
    assert.equal(res.status, 200); state = await res.json();
    assert.equal(state.document.security.risks.at(-1).actor, 'architect-a');
    res = await api('/api/commands' + q, {revision: state.revision, command: {type: 'security.governance', payload: governance(state.document, 'thr-001')}});
    assert.equal(res.status, 400, 'the acceptor\'s own approval is refused by the server'); assert.match((await res.json()).error, /second signed-in person/);
    assert.equal((await api('/api/access' + q, {actorId: 'approver-b', role: 'editor'})).status, 200);
    state = await (await api('/api/project' + q, null, 'approver-b')).json();
    res = await api('/api/commands' + q, {revision: state.revision, command: {type: 'security.governance', payload: governance(state.document, 'thr-001')}}, 'approver-b');
    assert.equal(res.status, 200); state = await res.json();
    assert.equal(state.document.security.governance.at(-1).actor, 'approver-b');
    assert.ok(!awaitingApproval(state.document), 'a second member\'s approval clears risk-approval');
    pass('through the server: the acceptor\'s own approval answers 400; a second member of the project records it, with their identity, and risk-approval clears');
  } finally { DB.close(); }
});

// ---------------------------------------------------------------- D13: findings no treatment waives
const treat = (f, extra = {}) => ({findingId: f.id, stamp: f.stamp, treatment: 'Accepted design limitation', rationale: 'Synthetic treatment for this suite only.', reviewer: 'Synthetic reviewer', reference: 'Fixture only', reviewed: true, ...extra});
const findingOf = (p, id) => rv.inheritedFindings(p).find(f => f.id === id);
const treatmentOf = (p, id) => rv.findingTreatment(p, findingOf(p, id));
const blocks = (p, id) => rv.reviewBlockers(p).some(f => f.id === id);
let d = rv.withFinalReview(seedProject());
await part('D13 fixture', () => {
  // A working choice that breaks a hard constraint: CON-001 is a Must, read through a Chapter 2 constraint driver.
  d = qcmd(d, 'driver', {kind: 'constraint', title: 'Runs in the bank\'s own data centres', description: 'Hosting is on premises.', impact: 'Rules out a public cloud runtime.', constraintIds: ['CON-001'], priority: 'High'});
  const C = d.quality.drivers.at(-1).id, adr = () => d.decisions.records.find(x => x.id === 'ADR-001');
  d = dcmd(d, 'save', {id: 'ADR-001', driverIds: [...adr().driverIds, C]});
  d = dcmd(d, 'alternative', {id: 'ADR-001', alternativeId: 'ALT-002', assessments: {...adr().alternatives.find(a => a.id === 'ALT-002').assessments, [C]: {effect: 'violates', reason: 'Needs a public cloud region.', evidence: 'Hosting assessment.'}}});
  d = dcmd(d, 'choose', {id: 'ADR-001', alternativeId: 'ALT-002'});
  // A dual control whose maker and checker are one role.
  d = scmd(d, 'control', {title: 'Release of held payments', category: sec.DUAL_CONTROL, failureMode: 'Deny or contain', targetIds: ['rest'], threatIds: ['thr-001'], purpose: 'Two people release a held payment.', owner: 'Payments operations', enforcement: 'Release screen', mechanism: 'Maker and checker', failureResponse: 'Hold the payment.', telemetry: 'Release log', verificationPlan: 'Release with one person; expect refusal.', operatingObligations: 'Quarterly access review.', makerRole: 'Payments operator', checkerRole: 'payments operator', assumptions: '', assumptionsResolved: true});
  d = rv.withFinalReview(d);
});
const breaks = findingOf(d, 'C3:breaks:ADR-001'), dual = rv.inheritedFindings(d).find(f => f.id.startsWith('C9:dual-control-same:'));
assert.ok(breaks && breaks.level === 'error' && dual && dual.level === 'error', 'the fixture holds a hard-constraint break and a segregation-of-duties breach');
await part('D13 non-waivable findings', () => {
  // The defect, reproduced: one reviewer accepts the hard-constraint break as a limitation (with a review-by date, too).
  assert.throws(() => rcmd(d, 'disposition', treat(breaks, {reviewBy: '2099-12-31'})), /^Error: “[^”]+” breaks a hard constraint: change the design, or its Chapter 1 constraint and Chapter 2 driver by a reviewed change\. It cannot be waived; until then, fix it before review or carry it as an action\.$/);
  for (const treatment of ['Not applicable', rv.SOURCE_SILENT]) assert.throws(() => rcmd(d, 'disposition', treat(breaks, {treatment})), /breaks a hard constraint/, treatment + ' is refused');
  assert.throws(() => rcmd(d, 'disposition', treat(dual, {reviewBy: '2099-12-31'})), /^Error: “[^”]+” breaks an invariant: change the design\. It cannot be waived; until then, fix it before review or carry it as an action\.$/);
  assert.throws(() => rcmd(d, 'disposition', treat(dual, {treatment: 'Not applicable'})), /invariant/);
  for (const f of [breaks, dual]) {
    const key = rv.findingCause(f).key, all = rv.causeFindings(d, key);
    for (const treatment of ['Accepted design limitation', 'Not applicable', rv.SOURCE_SILENT]) assert.throws(() => rcmd(d, 'disposition', {scope: 'cause', cause: key, stamp: rv.causeFindingStamp(d, all), treatment, rationale: 'One treatment for the cause.', reviewer: 'Synthetic reviewer', reference: 'Fixture only', reviewBy: '2099-12-31', reviewed: true}), /It cannot be waived; until then, fix it before review or carry it as an action\./, f.id + ': a cause treatment cannot waive it either (' + treatment + ')');
  }
  assert.ok(blocks(d, breaks.id) && blocks(d, dual.id));
  pass('D13 reproduced and refused: a hard-constraint break (C3 breaks) and a segregation-of-duties breach (C9 dual-control-same) cannot be accepted as a limitation, marked not applicable or raised as source silent, one finding or a whole cause at a time, and the message names the way out');

  const fixLater = rcmd(d, 'disposition', treat(breaks, {treatment: 'Fix before review'}));
  assert.equal(treatmentOf(fixLater, breaks.id), 'Fix before review'); assert.ok(blocks(fixLater, breaks.id), 'fix before review keeps it a blocker');
  let carried = rcmd(d, 'action', {title: 'Choose an on-premises alternative', owner: 'Lead architect', due: '2026-12-01', acceptance: 'ADR-001 records an alternative that meets CON-001.', objectIds: ['api'], findingId: breaks.id});
  carried = rcmd(carried, 'disposition', treat(findingOf(carried, breaks.id), {treatment: 'Carry as action', actionId: carried.finalReview.actions.at(-1).id}));
  assert.equal(treatmentOf(carried, breaks.id), 'Carry as action', 'an owned action to change the design is accepted');
  const changed = rv.withFinalReview(dcmd(d, 'choose', {id: 'ADR-001', alternativeId: 'ALT-001'}));
  assert.ok(!findingOf(changed, breaks.id), 'changing the design resolves it');
  pass('a non-waivable finding can be fixed before review (still a blocker) or carried as an owned action, and changing the design resolves it');

  assert.deepEqual(rv.NON_WAIVABLE, {'hard-constraint': 'C3:breaks C7:hard-constraint', invariant: 'C8:posting-guard C8:invariant-link C9:dual-control-same C9:dual-control-uncovered C9:dual-control-roles C10:state-protection C10:standby C10:backup-zone'});
  assert.ok(Object.isFrozen(rv.NON_WAIVABLE) && Object.values(rv.NON_WAIVABLE).every(x => Object.isFrozen(x) && Object.values(x).every(Object.isFrozen)), 'the class is fixed in code');
  const at = (chapter, code, level = 'error') => rv.nonWaivable({id: 'C' + chapter + ':' + code + ':X-001', chapter, code, level});
  assert.deepEqual([at(3, 'breaks'), at(7, 'hard-constraint'), at(8, 'posting-guard'), at(8, 'invariant-link'), at(9, 'dual-control-same'), at(9, 'dual-control-uncovered'), at(9, 'dual-control-roles'), at(10, 'state-protection'), at(10, 'standby'), at(10, 'backup-zone')], ['hard-constraint', 'hard-constraint', 'invariant', 'invariant', 'invariant', 'invariant', 'invariant', 'invariant', 'invariant', 'invariant']);
  assert.deepEqual([at(3, 'choice'), at(7, 'breaks'), at(9, 'state-protection'), at(8, 'protection'), at(10, 'recovery'), at(3, 'breaks', 'warning'), rv.nonWaivable({id: 'EVIDENCE:breaks:x', code: 'breaks', level: 'error'})], [null, null, null, null, null, null, null], 'a code is non-waivable only in its own chapter, and only as an error');
  assert.equal(rv.nonWaivable(breaks), 'hard-constraint'); assert.equal(rv.nonWaivable(dual), 'invariant');
  pass('the non-waivable class: Chapter 3 breaks and the Chapter 7 hard-constraint error (a Chapter 1 Must constraint, or one with no stated priority, read through its Chapter 2 driver), and the integrity (C8 posting-guard, invariant-link), authorisation (C9 dual control) and recovery (C10 state-protection, standby, backup-zone) invariant errors, each in its own chapter only');

  // A waiver recorded before is kept, and read as no treatment.
  const legacy = clone(d);
  legacy.finalReview.dispositions.push({id: 'RF-001', at: AT, actor: 'architect-a', findingId: breaks.id, stamp: breaks.stamp, basis: 'finding', treatment: 'Accepted design limitation', rationale: 'Recorded before rc.10.73.42.', reviewer: 'Earlier reviewer', reference: 'Earlier record', actionId: null});
  legacy.finalReview.dispositions.push({id: 'RF-002', at: AT, actor: 'architect-a', findingId: dual.id, stamp: dual.stamp, basis: 'finding', treatment: 'Not applicable', rationale: 'Recorded before rc.10.73.42.', reviewer: 'Earlier reviewer', reference: 'Earlier record', actionId: null});
  const L = rv.withFinalReview(legacy);
  assert.equal(L.finalReview.dispositions.length, 2, 'the earlier waivers stay in the record');
  assert.deepEqual([treatmentOf(L, breaks.id), treatmentOf(L, dual.id)], ['Needs assessment', 'Needs assessment']);
  assert.ok(blocks(L, breaks.id) && blocks(L, dual.id), 'and the breaches block a positive review again');
  pass('a waiver of a non-waivable finding recorded before stays in the record and is read as no treatment: the finding blocks again');
});

// ---------------------------------------------------------------- D13: an accepted limitation is reviewed by a date
await part('D13 limitation review-by date', () => {
  const w = rv.inheritedFindings(d).find(f => f.id.startsWith('C8:protection:'));
  assert.ok(w, 'the fixture holds a waivable error');
  assert.throws(() => rcmd(d, 'disposition', treat(w)), /Give the accepted limitation a review-by date/, 'an accepted limitation without a review-by date is refused');
  assert.equal(rv.nonWaivable(w), null, 'C8 protection is not in the non-waivable class');
  assert.throws(() => rcmd(d, 'disposition', treat(w, {reviewBy: '2099-02-30'})), /review-by date/);
  assert.throws(() => rcmd(d, 'disposition', treat(w, {reviewBy: AT.slice(0, 10)})), /review-by date after today/);
  const kept = rcmd(d, 'disposition', treat(w, {reviewBy: '2099-12-31'}));
  assert.equal(kept.finalReview.dispositions.at(-1).reviewBy, '2099-12-31');
  assert.equal(treatmentOf(kept, w.id), 'Accepted design limitation'); assert.ok(!blocks(kept, w.id));
  const na = rcmd(d, 'disposition', treat(w, {treatment: 'Not applicable'}));
  assert.equal(treatmentOf(na, w.id), 'Not applicable'); assert.equal(na.finalReview.dispositions.at(-1).reviewBy, undefined, 'only a limitation carries a review-by date');
  pass('an accepted limitation needs a valid review-by date after the day it is recorded, and keeps it; not applicable needs none');

  const overdue = rcmd(d, 'disposition', treat(w, {reviewBy: '2021-06-30'}), 'architect-a', PAST);
  assert.equal(overdue.finalReview.dispositions.at(-1).reviewBy, '2021-06-30');
  assert.equal(treatmentOf(overdue, w.id), 'Needs assessment', 'a limitation past its review-by date reopens its finding');
  assert.ok(blocks(overdue, w.id)); assert.ok(rv.causeFindings(overdue, rv.findingCause(w).key).some(f => f.id === w.id), 'and it can be treated again');
  assert.equal(treatmentOf(rcmd(overdue, 'disposition', treat(findingOf(overdue, w.id), {reviewBy: '2099-12-31'})), w.id), 'Accepted design limitation');

  const key = rv.findingCause(w).key, all = rv.causeFindings(d, key), cause = {scope: 'cause', cause: key, stamp: rv.causeFindingStamp(d, all), treatment: 'Accepted design limitation', rationale: 'One treatment for the cause.', reviewer: 'Synthetic reviewer', reference: 'Fixture only', reviewed: true};
  assert.throws(() => rcmd(d, 'disposition', cause), /review-by date/, 'a cause limitation needs a review-by date too');
  const causeKept = rcmd(d, 'disposition', {...cause, reviewBy: '2099-12-31'});
  assert.equal(causeKept.finalReview.dispositions.at(-1).reviewBy, '2099-12-31'); assert.ok(all.every(f => treatmentOf(causeKept, f.id) === 'Accepted design limitation'));
  const causeOverdue = rcmd(d, 'disposition', {...cause, reviewBy: '2021-06-30'}, 'architect-a', PAST);
  assert.ok(all.every(f => treatmentOf(causeOverdue, f.id) === 'Needs assessment'), 'an overdue cause limitation reopens every finding it covered');

  const undated = clone(d);
  undated.finalReview.dispositions.push({id: 'RF-001', at: AT, actor: 'architect-a', findingId: w.id, stamp: w.stamp, basis: 'finding', treatment: 'Accepted design limitation', rationale: 'Recorded before rc.10.73.42.', reviewer: 'Earlier reviewer', reference: 'Earlier record', actionId: null});
  assert.equal(treatmentOf(rv.withFinalReview(undated), w.id), 'Needs assessment', 'a limitation recorded before with no review-by date is due for review');
  pass('a limitation past its review-by date, one finding or a whole cause, reopens what it covered, which can be treated again; a limitation recorded before with no review-by date is due');

  const field = fieldOf('review.disposition', 'reviewBy');
  assert.ok(field && field.kind === 'date', 'the treatment form asks for the review-by date');
  pass('the Chapter 11 treatment form has a review-by date field');
});

// ---------------------------------------------------------------- review r2: no way round through Chapter 9
// C9 'dual-control-uncovered' is a non-waivable authorisation invariant (NON_WAIVABLE above), so Chapter 11 refuses to
// accept it as a limitation. Before r2 the same architect cleared it in Chapter 9 by recording an 'accept' risk treatment,
// approved by no one. An accepted risk is a waiver: only a linked dual control, or avoiding the activity, clears it.
await part('r2 Chapter 9 accept does not waive dual control', () => {
  const made = sec.applySecurityCommand(sec.withSecurity(seedProject()), {type: 'security.threat', payload: {title: 'One officer enters and releases a payment', category: sec.DUAL_CONTROL, actor: 'An officer acting alone', scenario: 'The officer who enters a payment also releases it.', consequence: 'A fraudulent payment leaves the bank.', owner: 'Operations risk', priority: 'High', priorityBasis: 'Fraud loss.', targetIds: ['rest']}}, AT, 'architect-a');
  const p = made.document, thr = made.selected, mine = f => f.code === 'dual-control-uncovered' && f.objectId === thr;
  const open = q => rv.inheritedFindings(rv.withFinalReview(q)).find(mine), blocking = q => rv.reviewBlockers(rv.withFinalReview(q)).some(mine);
  const f = open(p);
  assert.ok(f && f.level === 'error' && rv.nonWaivable(f) === 'invariant' && blocking(p), 'a dual control threat with no dual control is a non-waivable error that blocks the review');
  assert.throws(() => rcmd(rv.withFinalReview(p), 'disposition', treat(f, {reviewBy: '2099-12-31'})), /invariant/, 'Chapter 11 refuses to waive it');
  // The route round the refusal, reproduced: the same architect accepts the residual risk in Chapter 9.
  const accepted = scmd(p, 'risk', risk(p, thr));
  assert.equal(sec.latestRisk(accepted, thr).actor, 'architect-a');
  assert.ok(open(accepted), 'one architect\'s accepted risk leaves the invariant breach open');
  assert.ok(blocking(accepted), 'and C9:dual-control-uncovered stays in reviewBlockers');
  assert.match(open(accepted).detail, /or avoid the activity; an accepted risk does not clear it/, 'the finding says what clears it');
  const approved = scmd(accepted, 'governance', governance(accepted, thr), 'approver-b');
  assert.ok(sec.independentRiskApproval(sec.latestRisk(approved, thr), sec.latestGovernance(approved, thr)), 'a second signed-in person approved the acceptance');
  assert.ok(blocking(approved), 'an independently approved acceptance waives the invariant no more than a limitation does');
  assert.ok(!open(scmd(p, 'risk', risk(p, thr, 'avoid'))), 'avoiding the activity clears it');
  const controlled = scmd(p, 'control', {title: 'Maker-checker on payment release', category: sec.DUAL_CONTROL, purpose: 'No payment leaves on one person\'s word.', owner: 'Payments operations', enforcement: 'The release step', mechanism: 'A second officer approves each release.', targetIds: ['rest'], threatIds: [thr]});
  assert.ok(!open(controlled), 'a linked dual control clears it');
  pass('r2: an accepted Chapter 9 risk, by one architect or approved by a second person, no longer clears the non-waivable C9 dual-control-uncovered error, which stays in reviewBlockers; a linked dual control or avoiding the activity clears it');
});

// ---------------------------------------------------------------- review r2: the screens read what the domain reads
// The Chapter 9 risk panel, the threat's assurance strip and the Output register line say when an approval was not
// recorded by a second signed-in person, as the finding and the Markdown export do; the Chapter 11 treatment dialog
// offers no waiver for a non-waivable finding and asks for a review-by date from tomorrow, the server's rule.
await part('r2 screens', async () => {
  const {Window} = await import('happy-dom');
  const w = new Window({url: 'https://aiw.test/?chapter=9&tab=work', settings: {disableIframePageLoading: true, disableCSSFileLoading: true}});
  const kept = {};
  for (const k of ['window', 'document', 'history', 'location', 'localStorage', 'CustomEvent', 'Event', 'FormData', 'Node', 'Element', 'HTMLElement', 'MutationObserver', 'navigator', 'CSS']) { kept[k] = Object.getOwnPropertyDescriptor(globalThis, k); Object.defineProperty(globalThis, k, {value: k === 'window' ? w : w[k], configurable: true, writable: true}); }
  for (const k of ['matchMedia', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) { kept[k] = Object.getOwnPropertyDescriptor(globalThis, k); globalThis[k] = w[k].bind(w); }
  const bridge = state => ({state, getNode: () => null, render() {}, persist() {}, toast() {}, setTab() {}, setChapter() {}, selectNode() {}, hideTip() {}, refreshSimulation() {}});
  try {
    const {createSecurityStudio} = await import('./public/security-ui.js'), {recordRowsHTML} = await import('./public/output-documents.js');
    let p = sec.withSecurity(seedProject());
    p = scmd(p, 'risk', risk(p, 'thr-001'));
    const legacy = clone(p);
    legacy.security.governance.push({id: 'SG-001', threatId: 'thr-001', stamp: sec.securityGovernanceStamp(legacy, sec.threat(legacy, 'thr-001')), at: AT, decision: 'approved', reviewer: 'Earlier reviewer', reference: 'Earlier record', observations: 'Recorded before rc.10.73.42.'});
    const independent = scmd(p, 'governance', governance(p, 'thr-001'), 'approver-b');
    const screens = doc => {
      const studio = createSecurityStudio({value: {document: doc, revision: 1}}), state = {chapter: 9, tab: 'work', selected: 'thr-001', visible: ['security'], cursor: true};
      window.aiwProjectStore = {value: {document: doc, revision: 1}};
      studio.bind(bridge(state));
      const strip = /Governance evidence<\/small><b>([^<]*)/.exec(studio.work())?.[1];
      studio.openSection('assurance');
      const badge = /Governance evidence: ([^<]*)/.exec(studio.work())?.[1];
      const line = /Governance: ([^<]*)/.exec(recordRowsHTML(doc, 9))?.[1];
      return [strip, badge, line].map(s => String(s).replace(/&#39;|&amp;/g, ''));
    };
    for (const s of screens(sec.withSecurity(legacy))) assert.match(s, /^approved · not recorded by a second signed-in person/, 'an approval with no independent actor reads as not independent on every Chapter 9 surface: ' + s);
    for (const s of screens(independent)) assert.equal(s.trim(), 'approved', 'an independent approval reads as approved');
    pass('r2: the Chapter 9 threat strip, the risk panel badge and the Output register line read a legacy approval as not recorded by a second signed-in person, as the finding and the export do; an independent approval reads as approved');

    const {createReviewStudio} = await import('./public/review-ui.js');
    const store = {value: {document: d, revision: 1}, command: async () => { throw Error('not sent in this check'); }};
    window.aiwProjectStore = store;
    const review = createReviewStudio(store);
    review.bind(bridge({chapter: 11, tab: 'validate', selected: null, visible: [], focus: false, zoom: 1, pan: {x: 0, y: 0}}));
    const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    const dialogFor = f => {
      for (const e of document.querySelectorAll('dialog')) e.remove();
      document.body.innerHTML = '<button type="button" data-rv-action="disposition" data-rv-id="' + f.id + '">Treat</button>';
      document.querySelector('[data-rv-action]').click();
      const form = document.querySelector('#rv-disposition-form');
      assert.ok(form, 'the treatment dialog opens for ' + f.id);
      return {options: [...form.elements.treatment.options].map(o => o.value), reviewBy: form.elements.reviewBy};
    };
    const hard = dialogFor(findingOf(d, breaks.id)), inv = dialogFor(findingOf(d, dual.id));
    assert.deepEqual(hard.options, ['Fix before review', 'Carry as action'], 'no waiver is offered for a hard-constraint break');
    assert.deepEqual(inv.options, ['Fix before review', 'Carry as action'], 'nor for an invariant breach');
    const soft = dialogFor(rv.inheritedFindings(d).find(f => f.id.startsWith('C8:protection:')));
    assert.deepEqual(soft.options, rv.DISPOSITIONS, 'every treatment is offered for a waivable finding');
    assert.equal(soft.reviewBy?.type, 'date', 'the dialog asks for a review-by date');
    assert.equal(soft.reviewBy.min, tomorrow, 'from tomorrow, the server\'s rule');
    assert.equal(rv.reviewByMin(), tomorrow, 'one rule for both treatment dialogs (review-ui.js and app.js)');
    pass('r2: the Chapter 11 treatment dialog offers no waiver for a hard-constraint or invariant finding, every treatment for another, and a review-by date input whose earliest day is tomorrow');
  } finally {
    await w.happyDOM.close();
    for (const [k, v] of Object.entries(kept)) { if (v) Object.defineProperty(globalThis, k, v); else delete globalThis[k]; }
  }
});

assert.deepEqual(failures, [], failures.length + ' part(s) failed: ' + failures.join('; '));
console.log(`PASS rc42 G3a (D5, D13): ${checks.length} checks\n- ` + checks.join('\n- '));
