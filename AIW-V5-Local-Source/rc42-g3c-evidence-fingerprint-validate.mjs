// AIW v0.10.0-rc.10.73.42 · G3c (D14, gap C11-04): recording evidence no longer makes the approved design stale.
// The design fingerprint (review-domain.js reviewSourceStamp: the review, the checks, the baseline and the approval are
// bound to it) reads the design records, not the evidence recorded about them: assurance records, Chapter 9's and
// Chapter 10's evidence, and the check markers of those chapters that read it. Evidence is still judged against the
// design it judged, so it goes stale when that design changes. The stored stamps are versioned (fingerprint 2): a
// document written under fingerprint 1 is upgraded on read (readings-upgrade.js, stored once by storage-upgrade.js); a
// stamp that was current is carried over, one that was not stays as it was, and a frozen baseline keeps the stamp it was
// frozen with, answered through the upgrade's record of the old value while the design is unchanged.
// Run: npm run test:rc42-g3c-evidence-fingerprint
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {brotliDecompressSync} from 'node:zlib';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {readRecoveryPoint} from './storage-upgrade.js';
import {seedProject, applyCommand} from './public/requirements-domain.js';
import * as rv from './public/review-domain.js';
import {applySecurityCommand, controlStamp, evidenceCurrent, threatStamp, securityGovernanceStamp} from './public/security-domain.js';
import {applyRuntimeCommand, runtimePlanStamp, runtimeEvidenceCurrent, runtimeEnvironmentStamp, runtimeHandoffCurrent} from './public/runtime-domain.js';
import {applyAssuranceCommand, assuranceCurrent} from './public/assurance-domain.js';
import {needsReadingsUpgrade, upgradeReadings} from './public/readings-upgrade.js';
import {withReadingsDefinition} from './public/source-fingerprint.js';
import {applyEvidenceCommand} from './public/evidence-domain.js';
import {verificationContext, verificationResult} from './public/architecture-verification.js';
import {changesSinceBaseline} from './public/sdd-document.js';
import {memoPass} from './public/document-memo.js';
import {digest} from './public/brain-integrity.js';
import {verificationFixture, obligationAt} from './architecture-verification-fixtures.mjs';

const at = '2026-10-30T09:00:00.000Z', ARCHITECT = 'architect-a', APPROVER = 'approver-b', checks = [];
const pass = name => { checks.push(name); console.log('ok - ' + name); };
// Before this release review-domain.js has no fingerprint versions: a document is read under the only one there is.
const underV1 = fn => (typeof rv.withDesignFingerprint === 'function' ? rv.withDesignFingerprint(1, fn) : fn());
const sig = JSON.stringify;
const review = (p, type, payload = {}, actor = ARCHITECT) => rv.applyFinalReviewCommand(p, {type: 'review.' + type, payload}, at, actor).document;
const security = (p, type, payload = {}) => rv.withFinalReview(applySecurityCommand(p, {type: 'security.' + type, payload}, at).document);
const runtime = (p, type, payload = {}) => rv.withFinalReview(applyRuntimeCommand(p, {type: 'runtime.' + type, payload}, at).document);
const assurance = (p, payload) => rv.withFinalReview(applyAssuranceCommand(p, {type: 'assurance.record', payload}, at, ARCHITECT).document);

// The reference journey taken to an approved, handed-off baseline the way a team takes it: Chapters 9 and 10 checked and
// handed off, every Chapter 11 step recorded by the architect, approval evidence recorded by a second signed-in person.
// Every source error is carried as its own owned delivery action (actions not bound to an obligation, so each is current
// only against the design stamp). A synthetic fixture: no real review, approval or evidence is claimed.
// approve(p) takes any project through those Chapter 11 steps (rc42 r2: the reference journey and the typed-check fixture).
const checkedChapters = p => { p = security(p, 'review'); p = security(p, 'handoff', {acknowledge: true}); p = runtime(p, 'intake'); p = runtime(p, 'review'); return runtime(p, 'handoff', {acknowledge: true}); };
function approvedProject() { return approve(checkedChapters(rv.withFinalReview(seedProject()))); }
function approve(p) {
  p = review(p, 'intake');
  p = review(p, 'narrative', {title: 'Synthetic SDD fixture', owner: 'Fixture architect', audience: 'Validation only', summary: 'Synthetic review, not an approval.', scope: 'Reference project only.', approach: 'Keep design and evidence apart.', confirmed: true});
  for (const f of rv.inheritedFindings(p).filter(x => x.level === 'error')) {
    p = review(p, 'action', {title: 'Resolve ' + f.id.slice(0, 60), owner: 'Fixture owner', due: '2026-12-01', acceptance: 'Record the observed result and its limits.', objectIds: [rv.reviewObjects(p).some(o => o.id === f.objectId) ? f.objectId : rv.reviewObjects(p).some(o => o.id === 'api') ? 'api' : rv.reviewObjects(p)[0].id], findingId: f.id});
    const actionId = p.finalReview.actions.at(-1).id, current = rv.inheritedFindings(p).find(x => x.id === f.id);
    p = review(p, 'disposition', {findingId: f.id, stamp: current.stamp, treatment: 'Carry as action', actionId, reviewer: 'Synthetic reviewer', reference: 'Fixture only', rationale: 'Carried as an owned delivery action.', reviewed: true});
  }
  for (const r of rv.reviewRequirements(p)) p = review(p, 'trace', {requirementId: r.id, stamp: rv.traceStamp(p, r.id), visited: [0, 1, 2, 3, 4], reviewer: 'Synthetic reviewer', notes: 'Fixture trail followed; no runtime execution.', reviewed: true});
  p = review(p, 'checks');
  p = review(p, 'record', {stamp: rv.reviewDesignStamp(p), outcome: 'Ready with actions / limitations', reviewer: 'Synthetic reviewer', reference: 'Fixture outcome, no real approval', rationale: 'Limitations explicit.', reviewed: true});
  p = review(p, 'baseline', {stamp: rv.reviewDesignStamp(p), title: 'Synthetic approved baseline', reviewed: true});
  const b = p.finalReview.baselines.at(-1);
  p = review(p, 'governance', {baselineId: b.id, outcome: 'Approved with conditions', reviewer: 'Synthetic governance fixture', reference: 'No external approval; automated fixture', notes: 'Exercise approval state.', conditions: 'Discharge the delivery actions.', reviewed: true}, APPROVER);
  p = review(p, 'handoff', {baselineId: b.id, acknowledge: true});
  // One action verified, by a person other than its author: its verification reads the action's definition, which names
  // the design stamp it was defined against.
  p = review(p, 'delivery', {id: p.finalReview.actions.find(a => !a.architectureObligation).id, status: 'Verified', progress: 'Synthetic observed check only', reviewer: 'Fixture verifier', reference: 'Fixture evidence, no real check', reviewed: true}, APPROVER);
  return p;
}
// What approval reads: whether the latest review, the baseline, its approval and the handoff are current, each plain
// action's currency, and the milestones of Chapter 11.
const approval = p => { const b = p.finalReview.baselines.at(-1); return {designReview: rv.latestDesignReview(p)?.id || null, checks: rv.finalChecksCurrent(p), intake: rv.reviewIntakeCurrent(p), narrative: rv.narrativeCurrent(p), baseline: rv.baselineCurrent(p, b), current: rv.currentBaseline(p)?.id || null, handoff: rv.finalHandoffCurrent(p), actions: p.finalReview.actions.map(a => a.id + ':' + rv.actionCurrent(p, a)).join(' '), verified: p.finalReview.actions.filter(a => rv.actionComplete(p, a)).map(a => a.id).join(' '), milestones: rv.finalMilestones(p).filter(m => ['review', 'baseline', 'governance', 'handoff'].includes(m.id)).map(m => m.id + ':' + m.done).join(' '), actionSource: rv.finalFindings(p).filter(f => f.code === 'action-source').length}; };
const approvedState = {designReview: 'FR-001', checks: true, intake: true, narrative: true, baseline: true, current: 'BL-001', handoff: true, verified: 'RA-001', milestones: 'review:true baseline:true governance:true handoff:true', actionSource: 0};

const approved = approvedProject(), b = approved.finalReview.baselines.at(-1), stamp = rv.reviewDesignStamp(approved);
{
  const s = approval(approved);
  assert.deepEqual({...s, actions: undefined}, {...approvedState, actions: undefined}, 'the fixture reaches an approved, handed-off baseline');
  assert(approved.finalReview.actions.length > 0 && s.actions.split(' ').every(x => x.endsWith(':true')), 'every plain action is current');
  assert(approved.security.review && approved.security.handoff && approved.runtime.intake && approved.runtime.review && approved.runtime.handoff, 'Chapters 9 and 10 were checked and handed off before approval');
  assert.deepEqual(rv.baselineChanges(approved, b), [], 'nothing changed since the baseline');
  pass('fixture: the reference journey reaches an approved (second person), handed-off baseline with ' + approved.finalReview.actions.length + ' plain delivery actions, Chapters 9 and 10 checked and handed off');
}

// ---------------------------------------------------------------- 1. evidence recorded after approval
const control = approved.security.controls[0], plan = approved.runtime.plans[0], requirement = rv.reviewRequirements(approved)[0];
const observation = {kind: 'observation', title: 'Synthetic payment-entry observation', statement: 'Observed in a synthetic run; no real environment.', requirementIds: [requirement.id], release: 'R-fixture', environment: 'Synthetic test', observedAt: '2026-10-29', cycle: 'Fixture cycle 1'};
const securityEvidence = p => ({id: control.id, stamp: controlStamp(p, p.security.controls.find(c => c.id === control.id)), kind: 'verification', result: 'pass', reviewed: true, reviewer: 'Fixture tester', reference: 'Synthetic test run', observations: 'Synthetic pass; no real enforcement observed.'});
const runtimeEvidence = p => ({id: plan.id, stamp: runtimePlanStamp(p, p.runtime.plans.find(r => r.id === plan.id)), kind: 'exercise', result: 'partial', reviewed: true, reviewer: 'Fixture operator', reference: 'Synthetic exercise', observations: 'Synthetic partial exercise.'});
const steps = [
  ['an assurance observation (Chapter 1 assurance record)', p => assurance(p, observation)],
  ['Chapter 9 verification evidence for ' + control.ref, p => security(p, 'evidence', securityEvidence(p))],
  ['Chapter 10 exercise evidence for ' + plan.ref, p => runtime(p, 'evidence', runtimeEvidence(p))],
  ['Chapter 9 checked and handed off again, then Chapter 10 taken in, checked and handed off again', p => { p = security(p, 'review'); p = security(p, 'handoff', {acknowledge: true}); p = runtime(p, 'intake'); p = runtime(p, 'review'); return runtime(p, 'handoff', {acknowledge: true}); }],
  ['the Chapter 9 evidence withdrawn', p => security(p, 'withdraw-evidence', {evidenceId: p.security.evidence.at(-1).id, reason: 'Synthetic withdrawal.', reviewed: true})]
];
let evidenced = approved;
for (const [name, step] of steps) {
  evidenced = step(evidenced);
  const s = approval(evidenced);
  assert.equal(rv.reviewDesignStamp(evidenced), stamp, name + ': the design fingerprint does not move');
  assert.deepEqual(s, approval(approved), name + ': the review, the checks, the baseline, its approval, the handoff and every plain action stay current');
  assert.deepEqual(rv.baselineChanges(evidenced, b), ['Evidence recorded since the baseline'], name + ': named as evidence, never as a design change');
}
assert.equal(evidenced.assurance.records.length, 1); assert.equal(evidenced.security.evidence.length, 1); assert.equal(evidenced.runtime.evidence.length, 1);
pass('evidence recorded after approval (an assurance observation, Chapter 9 and Chapter 10 evidence, the chapters checked and handed off again, a withdrawal) leaves the design fingerprint, the review, the baseline, its approval, the handoff and every plain action current; baselineChanges names it as evidence');

// Evidence is judged against the design it judged, as before: current now, stale once that design changes.
{
  let p = evidenced; p = security(p, 'evidence', securityEvidence(p));
  const e = p.security.evidence.at(-1), r = p.runtime.evidence.at(-1), a = p.assurance.records.at(-1);
  assert(evidenceCurrent(p, e) && runtimeEvidenceCurrent(p, r) && assuranceCurrent(p, a), 'recorded evidence is current against the design it judged');
  assert.equal(approval(p).baseline, true);
  const c = p.security.controls.find(x => x.id === control.id), edited = security(p, 'control', {...c, purpose: c.purpose + ' Revised for the fixture.'});
  assert.equal(evidenceCurrent(edited, edited.security.evidence.at(-1)), false, 'a change to the control makes its evidence stale');
  const req = p.artefacts.find(x => x.id === requirement.id), restated = rv.withFinalReview(applyCommand(p, {type: 'artefact', payload: {...req, description: req.description + ' Restated for the fixture.'}}, at).document);
  assert.equal(assuranceCurrent(restated, restated.assurance.records.at(-1)), false, 'a change to the requirement makes the observation stale');
  pass('evidence currency is unchanged: Chapter 9, Chapter 10 and assurance evidence read current against the design they judged, and stale once that design changes');
}

// ---------------------------------------------------------------- 2. a design change still makes the baseline stale
{
  const c = evidenced.security.controls.find(x => x.id === control.id), edited = security(evidenced, 'control', {...c, purpose: c.purpose + ' Revised design.'});
  assert.notEqual(rv.reviewDesignStamp(edited), stamp, 'a design change moves the fingerprint');
  const s = approval(edited);
  assert.equal(s.designReview, null); assert.equal(s.checks, false); assert.equal(s.baseline, false); assert.equal(s.current, null); assert.equal(s.handoff, false);
  assert(s.actions.split(' ').every(x => x.endsWith(':false')), 'every plain action needs review against the changed design');
  assert(rv.baselineChanges(edited, b).includes(rv.CHAPTERS[8].title), 'the changed chapter is named');
  const zone = runtime(approved, 'zone', {...approved.runtime.zones[0], isolation: 'Changed for the fixture'});
  assert.equal(rv.baselineCurrent(zone, b), false); assert(rv.baselineChanges(zone, b).includes(rv.CHAPTERS[9].title));
  const req = approved.artefacts.find(x => x.id === requirement.id), restated = rv.withFinalReview(applyCommand(approved, {type: 'artefact', payload: {...req, acceptance: (req.acceptance || '') + ' Revised.'}}, at).document);
  assert.equal(rv.baselineCurrent(restated, b), false); assert.equal(rv.finalHandoffCurrent(restated), false);
  pass('a design change (a Chapter 9 control, a Chapter 10 zone, a requirement) still moves the fingerprint and makes the review, the baseline, the approval, the handoff and the plain actions stale');
}

// ---------------------------------------------------------------- 3. a new baseline says which fingerprint it was frozen under
{
  assert.equal(b.designFingerprint, 2, 'a baseline frozen now names fingerprint 2');
  assert.equal(typeof b.evidenceStamp, 'string', 'and the evidence it was frozen beside');
  assert(Array.isArray(b.source.security.evidence) && Array.isArray(b.source.runtime.evidence) && b.source.security.review && b.source.runtime.handoff, 'the frozen design source is kept whole, its evidence and check markers with it');
  pass('a baseline frozen now names the fingerprint version its stamps were taken under, and the evidence it was frozen beside');
}

// ---------------------------------------------------------------- 4. an old document upgrades without changing its approval state
// A document written under fingerprint 1 (before this release: every evidence record inside the design fingerprint, and
// neither the review nor a baseline naming a fingerprint version or an evidence stamp).
const asV1 = build => underV1(() => { const p = build(); delete p.finalReview.designFingerprint; for (const x of p.finalReview.baselines) { delete x.designFingerprint; delete x.evidenceStamp; } return p; });
const legacyApproved = asV1(approvedProject), fromLegacy = (...edits) => asV1(() => edits.reduce((p, edit) => edit(p), structuredClone(legacyApproved)));
{
  assert(needsReadingsUpgrade(legacyApproved), 'a document of fingerprint 1 needs the upgrade');
  const before = underV1(() => approval(legacyApproved));
  assert.deepEqual({...before, actions: undefined}, {...approvedState, actions: undefined}, 'under fingerprint 1 it is approved and handed off');
  const up = rv.withFinalReview(structuredClone(legacyApproved)), lb = up.finalReview.baselines.at(-1);
  assert.equal(up.finalReview.designFingerprint, 2, 'the upgraded document is at fingerprint 2');
  assert.equal(legacyApproved.workspace?.template, undefined); assert.equal(up.workspace.template, 'bank-payment', 'the reference named as its template (what the storage upgrade stamps), its stamps carried over to it');
  assert.deepEqual(approval(up), before, 'its approval state is the same after the upgrade');
  assert.deepEqual(up.finalReview.baselines, legacyApproved.finalReview.baselines, 'the frozen baseline is left exactly as it was frozen (its fingerprint-1 stamp kept)');
  const kept = up.finalReview.designFingerprintUpgrade;
  assert.equal(kept?.from, 1, 'the upgrade records the version it upgraded from');
  assert.equal(kept.design[rv.reviewSourceStamp(up)] + ':' + up.finalReview.version, lb.stamp, 'and the fingerprint-1 stamp of the design it read, which the baseline keeps');
  assert.equal(sig(rv.withFinalReview(structuredClone(legacyApproved))), sig(up), 'deterministic');
  assert.equal(upgradeReadings(up), up, 'idempotent: nothing is left to upgrade');
  assert.equal(needsReadingsUpgrade(up), false);
  // Upgraded, it behaves as fingerprint 2: evidence does not stale it, a design change does.
  let e = assurance(up, observation); e = security(e, 'evidence', securityEvidence(e)); e = runtime(e, 'evidence', runtimeEvidence(e));
  e = security(e, 'review'); e = security(e, 'handoff', {acknowledge: true}); e = runtime(e, 'intake'); e = runtime(e, 'review'); e = runtime(e, 'handoff', {acknowledge: true});
  assert.deepEqual(approval(e), before, 'after the upgrade, evidence leaves the old approval current');
  assert.equal(rv.baselineChanges(e, lb).length, 0, 'an old baseline names no chapter or design change for evidence');
  const c = e.security.controls.find(x => x.id === control.id), changed = security(e, 'control', {...c, purpose: c.purpose + ' Revised design.'});
  assert.equal(rv.baselineCurrent(changed, lb), false, 'and a design change makes the old baseline stale');
  assert.equal(rv.finalHandoffCurrent(changed), false);
  assert(rv.baselineChanges(changed, lb).includes(rv.CHAPTERS[8].title));
  pass('an approved, handed-off document of fingerprint 1 upgrades with the same approval state, its frozen baseline untouched and the old stamp recorded; deterministic and idempotent; afterwards evidence leaves the approval current and a design change makes it stale');
}
// One whose baseline was already stale under fingerprint 1, because evidence was recorded after it, stays stale: the
// upgrade never decides what the old fingerprint could not tell apart.
{
  const legacy = fromLegacy(p => security(p, 'evidence', securityEvidence(p)));
  const before = underV1(() => approval(legacy));
  assert.equal(before.baseline, false, 'under fingerprint 1 evidence made the baseline stale'); assert.equal(before.handoff, false);
  const up = rv.withFinalReview(structuredClone(legacy));
  assert.deepEqual(approval(up), before, 'after the upgrade its approval state is the same: still stale, never silently current');
  pass('a document whose baseline evidence had already made stale under fingerprint 1 stays stale after the upgrade (no silent flip to current)');
}
// One whose design changed after its baseline stays stale, and a document with nothing stamped needs no upgrade.
{
  const legacy = fromLegacy(p => { const c = p.security.controls[0]; return security(p, 'control', {...c, purpose: c.purpose + ' Revised design.'}); });
  const before = underV1(() => approval(legacy)), up = rv.withFinalReview(structuredClone(legacy));
  assert.equal(before.baseline, false); assert.deepEqual(approval(up), before, 'a baseline stale by a design change stays stale');
  const blank = asV1(() => rv.withFinalReview(seedProject()));
  assert.equal(needsReadingsUpgrade(blank), false, 'a document that keeps no stamp of the design needs no upgrade');
  pass('a fingerprint-1 document whose design changed after its baseline stays stale after the upgrade; one that keeps no stamp of the design needs none');
}

// ---------------------------------------------------------------- 5. documents rc.10.73.16 wrote (the legacy readings fixture)
{
  const fixture = JSON.parse(brotliDecompressSync(readFileSync('evaluation/legacy-readings.json.br')).toString('utf8'));
  let baselines = 0;
  for (const state of fixture.states.filter(s => s.document)) {
    const doc = state.document, before = withReadingsDefinition(1, () => underV1(() => approval(doc))), up = rv.withFinalReview(structuredClone(doc));
    assert.equal(up.finalReview.designFingerprint, 2, state.name + ': upgraded to fingerprint 2');
    assert.deepEqual(approval(up), before, state.name + ': its approval state is the same after the upgrade');
    assert.deepEqual(up.finalReview.baselines, doc.finalReview.baselines, state.name + ': frozen baselines untouched');
    baselines += doc.finalReview.baselines.length;
  }
  assert(baselines > 0, 'the fixture holds frozen baselines');
  pass('documents rc.10.73.16 wrote (' + baselines + ' frozen baselines) upgrade to fingerprint 2 with the same review, baseline, approval, handoff and action states, their baselines untouched');
}

// ---------------------------------------------------------------- 6. the stored row: upgraded once on read, the old version kept
{
  const dir = await mkdtemp(tmpdir() + '/aiw-rc42-g3c-'), env = {DB: localDatabase(dir + '/f.sqlite'), FILES: localFiles(dir + '/files'), ASSETS: {fetch: () => new Response('ok')}};
  const origin = 'https://aiw.test', owner = ARCHITECT, id = legacyApproved.id;
  const api = async (route, body, actor = owner) => { const r = await worker.fetch(new Request(origin + route, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': actor, Origin: origin, ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env); return {status: r.status, data: JSON.parse(await r.text())}; };
  try {
    // The approved, handed-off fingerprint-1 document as the release before this one stored it (its baseline whole).
    const legacy = structuredClone(legacyApproved), before = underV1(() => approval(legacy));
    assert.deepEqual({...before, actions: undefined}, {...approvedState, actions: undefined});
    await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind(owner, id, JSON.stringify(legacy), at).run();
    const read = await api('/api/project');
    assert.equal(read.status, 200); assert.equal(read.data.revision, 2, 'the first read stores the upgrade');
    assert.equal(read.data.document.finalReview.designFingerprint, 2);
    assert.deepEqual(approval(rv.withFinalReview(read.data.document)), before, 'the stored row reads with the same approval state');
    const activity = (await env.DB.prepare('SELECT document FROM project_activity WHERE owner_id=? AND project_id=?').bind(owner, id).all()).results.map(r => JSON.parse(r.document)).filter(a => a.kind === 'storage');
    assert.equal(activity.length, 1, 'recorded once in the activity as a storage upgrade');
    assert.match(activity[0].summary, /design fingerprint without the evidence/, 'the activity says the design fingerprint now leaves evidence out');
    const recovered = await readRecoveryPoint(env, owner, id, activity[0].recoveryPoint);
    assert.equal(recovered.revision, 1); assert.equal(recovered.document.finalReview.designFingerprint, undefined, 'the fingerprint-1 row reads back whole from its recovery point');
    assert.equal(recovered.document.finalReview.reviews.at(-1).stamp, legacy.finalReview.reviews.at(-1).stamp, 'with the old stamps it kept');
    const again = await api('/api/project');
    assert.equal(again.data.revision, 2, 'the next read writes nothing');
    // Evidence recorded through the command route after the upgrade leaves the approval current; a design change does not.
    const doc = read.data.document;
    const saved = await api('/api/commands', {revision: read.data.revision, command: {type: 'security.evidence', payload: securityEvidence(doc)}});
    assert.equal(saved.status, 200, sig(saved.data).slice(0, 300));
    const after = await api('/api/project');
    assert.equal(after.data.document.security.evidence.length, 1);
    assert.deepEqual(approval(rv.withFinalReview(after.data.document)), before, 'evidence recorded through /api/commands leaves the review, the baseline, its approval, the handoff and the actions current');
    const c = after.data.document.security.controls.find(x => x.id === control.id);
    const edited = await api('/api/commands', {revision: after.data.revision, command: {type: 'security.control', payload: {...c, purpose: c.purpose + ' Revised design.'}}});
    assert.equal(edited.status, 200, sig(edited.data).slice(0, 300));
    const changed = rv.withFinalReview((await api('/api/project')).data.document);
    assert.equal(rv.baselineCurrent(changed, changed.finalReview.baselines.at(-1)), false, 'a design change through /api/commands makes the old baseline stale');
    assert.equal(rv.finalHandoffCurrent(changed), false);
  } finally { env.DB.close(); await rm(dir, {recursive: true, force: true}); }
  pass('an approved fingerprint-1 row read through /api/project is upgraded and stored once (a storage upgrade in the activity, the old row with its old stamps kept in a recovery point) with the same approval state; evidence recorded through /api/commands then leaves it current, and a design change makes it stale');
}

// ================================================================ rc42 r2 (the review of G3c)
// The evidence a typed check or a reviewed observation needs, and a connector sync's, arrives with a project source of
// its own (evidence.source): a source no design record cites is evidence too, and a source the design cites stays design.
// The assurance records journey-context.js holds as design nodes, and the domains' own evidence flags, decide the rest.
// Each section below reads only the fixture above and the helpers here.
const r2Requirement = rv.reviewRequirements(approved)[0];
const r2Report = {title: 'Synthetic payment test report', location: 'fixture://reports/payment-entry', version: 'fixture-1', date: '2026-10-29', excerpt: 'Synthetic report: payment entry observed in a fixture run. No real environment, release or result.', status: 'Unconfirmed'};
const attach = (p, payload = r2Report) => rv.withFinalReview(applyEvidenceCommand(p, {type: 'evidence.source', payload}, at, ARCHITECT).document);
const r2Observation = (p, sourceId) => ({kind: 'observation', title: 'Synthetic reviewed observation', statement: 'Observed in a synthetic run; no real environment.', requirementIds: [r2Requirement.id], release: 'R-fixture', environment: 'Synthetic test', observedAt: '2026-10-29', cycle: 'Fixture cycle 2', sourceId, reviewed: true, reviewer: 'Fixture reviewer', reviewNote: 'Read against the attached synthetic report; no real result.'});
const r2RuntimeEvidence = p => ({id: p.runtime.plans[0].id, stamp: runtimePlanStamp(p, p.runtime.plans[0]), kind: 'exercise', result: 'partial', reviewed: true, reviewer: 'Fixture operator', reference: 'Synthetic exercise', observations: 'Synthetic partial exercise.'});
const r2SecurityEvidence = p => ({id: p.security.controls[0].id, stamp: controlStamp(p, p.security.controls[0]), kind: 'verification', result: 'pass', reviewed: true, reviewer: 'Fixture tester', reference: 'Synthetic test run', observations: 'Synthetic pass; no real enforcement observed.'});
// What stays current after approval when only evidence was recorded: the reading section 1 takes, against any fixture.
// A baseline frozen under fingerprint 1 kept no evidence stamp: it names nothing for evidence (named = []).
const stillApproved = (before, after, name, named = ['Evidence recorded since the baseline']) => {
  assert.equal(rv.reviewDesignStamp(after), rv.reviewDesignStamp(before), name + ': the design fingerprint does not move');
  assert.deepEqual(approval(after), approval(before), name + ': the review, the checks, the baseline, its approval, the handoff and every plain action stay current');
  assert.deepEqual(rv.baselineChanges(after, before.finalReview.baselines.at(-1)), named, name + ': named as evidence, never as a design change');
};
const approvedReading = (p, name) => { const s = approval(p); assert(s.designReview && s.checks && s.baseline && s.current && s.handoff && s.actionSource === 0 && s.actions.split(' ').every(x => x.endsWith(':true')), name + ' reaches an approved, handed-off baseline with every plain action current: ' + sig(s)); };
// A document as the release before this one wrote it (section 4's reading: fingerprint 1, no version or evidence stamp).
const asV1r2 = build => underV1(() => { const p = build(); delete p.finalReview.designFingerprint; for (const x of p.finalReview.baselines) { delete x.designFingerprint; delete x.evidenceStamp; } return p; });

// ---------------------------------------------------------------- 7. a reviewed observation with its original source
{
  let p = attach(approved);
  const source = p.coauthoring.sources.at(-1);
  assert.equal(source.versions.at(-1).status, 'Unconfirmed');
  stillApproved(approved, p, 'an Unconfirmed test-report source attached after approval');
  assert.throws(() => assurance(p, r2Observation(p, '')), /original source/, 'a reviewed observation is refused without its original source');
  p = assurance(p, r2Observation(p, source.id));
  const o = p.assurance.records.at(-1);
  assert.equal(o.sourceEvidence?.id, source.id); assert.equal(o.reviewed, true);
  stillApproved(approved, p, 'a reviewed observation citing that source');
  assert(assuranceCurrent(p, o), 'the observation is current against the source and the requirement it read');
  // Evidence currency is unchanged: a new revision of the source only the observation cites makes the observation stale
  // and leaves the approved design as it was.
  const revised = attach(p, {...r2Report, id: source.id, excerpt: r2Report.excerpt + ' Revised.'});
  assert.equal(assuranceCurrent(revised, revised.assurance.records.at(-1)), false, 'a new revision of its source makes the observation stale');
  stillApproved(approved, revised, 'a new revision of a source only evidence cites');
  pass('r2: a source attached after approval and a reviewed observation citing it (evidence.source, then assurance.record with sourceId) leave the design fingerprint, the review, the checks, the baseline, its approval, the handoff and every plain action current; a new revision of that source makes the observation stale, not the design');
}

// ---------------------------------------------------------------- 8. a typed-check observation with its verification source
{
  const vApproved = approve(rv.withFinalReview(verificationFixture().p)), check = vApproved.finalReview.actions.find(a => a.verificationContract);
  approvedReading(vApproved, 'the typed-check fixture');
  assert(check?.architectureObligation && verificationContext(vApproved, check).ready, 'its typed check is ready after approval');
  const typed = (p, source) => { const receipt = verificationContext(p, check).receipt, version = source?.versions.at(-1); return {kind: 'test-result', title: 'Synthetic caller exercise', statement: 'Recorded synthetic observation; no production result.', status: 'Source says passed', owner: 'Synthetic operator', release: receipt.release, environment: receipt.environmentName, cycle: 'Synthetic retained exercise', observedAt: obligationAt, requirementIds: receipt.requirementIds, objectIds: receipt.objectIds, sourceId: source?.id || '', verificationSource: source ? {id: source.id, revision: version.revision, hash: digest(version)} : null, verificationObservation: {...receipt, value: 200, unit: receipt.contract.unit}, verificationCurrent: true, reviewed: false, reviewer: '', reviewNote: ''}; };
  let p = assurance(vApproved, typed(vApproved, null));
  assert.equal(verificationResult(p, p.assurance.records.at(-1)).state, 'unknown', 'without its source the typed comparison stays incomplete');
  stillApproved(vApproved, p, 'a typed-check observation without its source');
  p = attach(p, {title: 'Synthetic timed exercise report', location: 'fixture://verification/deadline-2', excerpt: 'Synthetic observation of the caller deadline under the declared test load; no production result.', status: 'Unconfirmed'});
  p = assurance(p, typed(p, p.coauthoring.sources.at(-1)));
  assert.equal(verificationResult(p, p.assurance.records.at(-1)).state, 'pass', 'with its source attached the typed comparison completes');
  stillApproved(vApproved, p, 'the source the typed check needs, and the observation compared against it');
  pass('r2: on an approved project with a typed check, attaching the source the comparison needs and recording the observation with its verificationSource completes the comparison and leaves the review, the checks, the baseline, its approval, the handoff and every plain action current');
}

// ---------------------------------------------------------------- 9. a connector sync that imports observations
{
  const dir = await mkdtemp(tmpdir() + '/aiw-rc42-g3c-sync-'), env = {DB: localDatabase(dir + '/f.sqlite'), FILES: localFiles(dir + '/files'), ASSETS: {fetch: () => new Response('ok')}};
  env.AIW_CONNECTIONS_JSON = JSON.stringify([{id: 'issues', title: 'Synthetic issue tracker', kind: 'github-issues', owners: [ARCHITECT], url: 'https://api.github.com/repos/example/fixture/issues'}]);
  env.CONNECTION_FETCH = async (url, options) => { assert.equal(options.method, 'GET'); assert.equal(new URL(url).hostname, 'api.github.com'); return new Response(JSON.stringify([{number: 7, title: 'Synthetic payment defect', body: 'Synthetic defect reported by a fixture; no real system.', state: 'open', updated_at: '2026-10-29T10:00:00Z'}]), {headers: {ETag: '"fixture-1"'}}); };
  const origin = 'https://aiw.test', api = async (route, body) => { const r = await worker.fetch(new Request(origin + route, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': ARCHITECT, Origin: origin, ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env); return {status: r.status, data: JSON.parse(await r.text())}; };
  try {
    // The approved reference project, named as the reference so that storing it stamps nothing (GR-DOM-15).
    const doc = approve(checkedChapters(rv.withFinalReview({...seedProject(), workspace: {template: 'bank-payment'}})));
    await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind(ARCHITECT, doc.id, JSON.stringify(doc), at).run();
    const read = await api('/api/project'); assert.equal(read.status, 200);
    const stored = rv.withFinalReview(read.data.document);
    approvedReading(stored, 'the stored project');
    const connection = await api('/api/connections', {profileId: 'issues', title: 'Synthetic delivery issues', enabled: true}); assert.equal(connection.status, 200, sig(connection.data));
    const requestId = crypto.randomUUID();
    assert.equal((await api('/api/jobs?action=create', {kind: 'sync', connectionId: connection.data.id, requestId})).status, 201);
    const ran = await api('/api/jobs?action=run', {id: requestId}); assert.equal(ran.data.job?.status, 'completed', sig(ran.data));
    const selection = {id: requestId, selected: ['7'], mapping: {7: [r2Requirement.id]}}, preview = await api('/api/jobs?action=preview', selection);
    assert.equal(preview.status, 200, sig(preview.data));
    const applied = await api('/api/jobs?action=apply', {...selection, stamp: preview.data.stamp, revision: read.data.revision, reviewed: true});
    assert.equal(applied.status, 200, sig(applied.data));
    const synced = rv.withFinalReview((await api('/api/project')).data.document), source = synced.coauthoring.sources.at(-1), observed = synced.assurance.records.at(-1);
    assert.equal(source.originalJob?.id, requestId, 'the sync keeps the source it retrieved'); assert.equal(observed.sourceEvidence?.id, source.id, 'and each observation it imported names it'); assert.equal(observed.externalId, '7'); assert.equal(observed.reviewed, false);
    stillApproved(stored, synced, 'a connector sync that imports observations (evidence.source, then feedback.import with its sourceId)');
  } finally { env.DB.close(); await rm(dir, {recursive: true, force: true}); }
  pass('r2: a connector sync applied through /api/jobs (operation-service.js: its retrieved source, then feedback.import with that sourceId) leaves the stored approved project\'s review, checks, baseline, approval, handoff and every plain action current');
}

// ---------------------------------------------------------------- 10. a source the design cites stays design
{
  // An applied guided task (evidence-domain.js evidence.apply) cites its source: the requirement, the scenario and the
  // decision were drafted from it.
  let p = checkedChapters(rv.withFinalReview(seedProject()));
  const rules = {title: 'Synthetic payment instruction rules', location: 'fixture://rules/instructions', excerpt: 'Synthetic rule: a repeated instruction must not repeat its business effect. Fixture text only.', status: 'Confirmed', confirmedBy: 'Fixture reviewer', reviewed: true};
  p = attach(p, rules);
  const cited = p.coauthoring.sources.at(-1).id, task = (q, type, payload) => rv.withFinalReview(applyEvidenceCommand(q, {type: 'evidence.' + type, payload}, at, ARCHITECT).document);
  p = task(p, 'task', {sourceId: cited, intent: 'duplicate', title: 'Synthetic repeat protection'});
  const id = p.coauthoring.tasks.at(-1).id;
  p = task(p, 'answers', {id, title: 'Synthetic single effect per instruction', need: 'A repeated payment instruction produces one business effect.', acceptance: 'Two identical instructions leave one posting; the second is answered with the first outcome.', owner: 'Fixture owner'});
  p = task(p, 'prepare', {id});
  const proposal = p.coauthoring.tasks.at(-1).proposal;
  p = task(p, 'proposal', {id, proposal: {...proposal, driver: {...proposal.driver, title: 'Synthetic integrity under repeated instructions'}, decision: {...proposal.decision, question: 'Synthetic: where is the single effect enforced?'}}});
  p = task(p, 'apply', {id, reviewed: true, reviewer: 'Fixture reviewer', reason: 'Synthetic fixture: the drafts follow the cited rule.'});
  assert.equal(p.coauthoring.tasks.at(-1).status, 'applied');
  // rc42 integration (with G3b, D6): a trace review is refused on a broken trail, so the fixture gives the requirement the
  // task drafted the trail a team would give it: the responsibility that already serves REQ-001 names it too.
  { const q = structuredClone(p), drafted = rv.reviewRequirements(q).map(r => r.id).filter(id => rv.traceBreaks(p, id).length);
    assert.deepEqual(drafted, ['REQ-006'], 'only the requirement the task drafted has no trail yet');
    q.logical.responsibilities.find(r => r.requirementIds?.includes('REQ-001')).requirementIds.push(...drafted); p = rv.withFinalReview(q);
    assert.deepEqual(rv.traceBreaks(p, 'REQ-006'), [], 'its trail is whole before the fixture reviews it'); }
  const cApproved = approve(p);
  approvedReading(cApproved, 'a project with an applied guided task');
  // Evidence beside it, with a source of its own, is evidence.
  let e = attach(cApproved); e = assurance(e, r2Observation(e, e.coauthoring.sources.at(-1).id));
  stillApproved(cApproved, e, 'a reviewed observation with a source of its own, beside a source the design cites');
  // A new revision of the cited source is a design change.
  const revised = attach(e, {...rules, id: cited, excerpt: 'Synthetic rule, revised: a repeated instruction within one day must not repeat its business effect.'});
  assert.notEqual(rv.reviewDesignStamp(revised), rv.reviewDesignStamp(cApproved), 'a new revision of the source an applied task cites moves the design fingerprint');
  const r = approval(revised);
  assert.equal(r.designReview, null); assert.equal(r.checks, false); assert.equal(r.baseline, false); assert.equal(r.current, null); assert.equal(r.handoff, false);
  assert(r.actions.split(' ').every(x => x.endsWith(':false')), 'every plain action needs review against the revised source');
  const named = rv.baselineChanges(revised, cApproved.finalReview.baselines.at(-1));
  assert(named.includes('Review narrative, traceability, findings, or delivery plan'), 'named as a design change: ' + named.join('; '));
  pass('r2: a new revision of the source an applied guided task cites still moves the design fingerprint and makes the review, the checks, the baseline, its approval, the handoff and every plain action stale; evidence with a source of its own beside it does not');
}

// ---------------------------------------------------------------- 11. what the design graph holds, and the domains' own evidence flags
{
  // A capability (Chapter 4) or value-outcome (Chapter 1) record is a node of the design graph (journey-context.js).
  for (const kind of ['capability', 'value-outcome']) {
    const q = assurance(approved, {kind, title: 'Synthetic ' + kind, statement: 'Synthetic ' + kind + ' for the fixture.', requirementIds: [r2Requirement.id]});
    assert.notEqual(rv.reviewDesignStamp(q), stamp, 'a ' + kind + ' record is a design change');
    assert.equal(rv.baselineCurrent(q, b), false); assert.equal(rv.finalHandoffCurrent(q), false);
    assert(!rv.baselineChanges(q, b).includes('Evidence recorded since the baseline'), 'a ' + kind + ' record is not reported as evidence');
  }
  // A repeat judgement (Chapter 1, requirement-commands.js) and a legacy capability group (Chapter 4) are design too.
  for (const [name, part] of [['a repeat judgement', {repeats: [{id: 'repeat-fixture', ids: [r2Requirement.id], judgement: 'distinct scope', reason: 'Synthetic judgement for the fixture.'}]}], ['a legacy capability group', {groups: [{id: 'CG-fixture', title: 'Synthetic group', requirementIds: [r2Requirement.id]}]}]]) {
    const q = structuredClone(approved); q.assurance = {version: 2, counter: 0, records: [], ...part};
    assert.notEqual(rv.reviewDesignStamp(q), stamp, name + ' is a design change');
    assert(!rv.baselineChanges(q, b).includes('Evidence recorded since the baseline'), name + ' is not reported as evidence');
  }
  // What Chapter 9 records as assurance (security-domain.js: residual-risk treatment, governance, walkthroughs) and
  // Chapter 10 as evidence (runtime-domain.js: walkthroughs) is evidence here too.
  const threat = approved.security.threats[0], fixture = {reviewed: true, reviewer: 'Synthetic reviewer', reference: 'Synthetic fixture, no real review', observations: 'Synthetic record only.'};
  let p = security(approved, 'risk', {...fixture, id: threat.id, stamp: threatStamp(approved, threat), treatment: 'mitigate', owner: 'Fixture owner', residual: 'Synthetic residual risk.', nextReview: '2026-12-01'});
  stillApproved(approved, p, 'a Chapter 9 residual-risk treatment');
  p = security(p, 'governance', {...fixture, id: threat.id, stamp: securityGovernanceStamp(p, p.security.threats[0]), decision: 'deferred'});
  stillApproved(approved, p, 'Chapter 9 governance evidence');
  p = security(p, 'simulation', {id: threat.id, mode: 'planned', stamp: threatStamp(p, p.security.threats[0]), reviewed: true, observations: 'Synthetic walkthrough.', visited: [0, 1, 2, 3]});
  stillApproved(approved, p, 'a Chapter 9 walkthrough');
  const environment = p.runtime.environments[0], zone = p.runtime.zones.find(z => z.environmentId === environment.id);
  p = runtime(p, 'simulation', {environmentId: environment.id, zoneId: zone.id, mode: 'zone', durationMinutes: 30, stamp: runtimeEnvironmentStamp(p, environment.id), reviewed: true, observations: 'Synthetic zone walkthrough.', visited: [0, 1, 2, 3]});
  stillApproved(approved, p, 'a Chapter 10 walkthrough');
  assert.equal(p.security.risks.length, 1); assert.equal(p.security.governance.length, 1); assert.equal(p.security.simulations.length, 1); assert.equal(p.runtime.simulations.length, 1);
  pass('r2: capability and value-outcome records, repeat judgements and capability groups stay design (stale, never reported as evidence); Chapter 9 risk treatments, governance and walkthroughs and Chapter 10 walkthroughs, which their domains record as assurance or evidence, leave the approval current');
}

// ---------------------------------------------------------------- 12. Chapter 11 notices a Chapter 10 handoff that evidence cleared
{
  const handoffWarning = p => rv.finalFindings(p).filter(f => f.code === 'runtime-handoff');
  assert.equal(approved.finalReview.intake.runtimeHandoffCurrent, true); assert.deepEqual(handoffWarning(approved), []);
  const p = runtime(approved, 'evidence', r2RuntimeEvidence(approved));
  assert.equal(runtimeHandoffCurrent(p), false, 'Chapter 10 evidence clears its handoff');
  assert.equal(rv.reviewIntakeCurrent(p), true, 'the Chapter 11 intake stays current (the design did not change)');
  assert.equal(handoffWarning(p).length, 1, 'Chapter 11 says that the Chapter 10 handoff it took in has changed');
  assert.equal(handoffWarning(p)[0].level, 'warning');
  let again = runtime(p, 'review'); again = runtime(again, 'handoff', {acknowledge: true});
  assert.deepEqual(handoffWarning(again), [], 'handed off again, the warning goes');
  pass('r2: Chapter 11 warns when the Chapter 10 handoff its intake took in is no longer current (evidence cleared it), and stops once Chapter 10 is handed off again');
}

// ---------------------------------------------------------------- 13. the SDD's changes since the last baseline
{
  const none = changesSinceBaseline(approved);
  assert.deepEqual([none.chapters, none.edges, none.other], [[], 0, []], 'nothing changed since the baseline');
  let p = assurance(approved, {kind: 'observation', title: 'Synthetic unreviewed observation', statement: 'Observed in a synthetic run; no real environment.', requirementIds: [r2Requirement.id], release: 'R-fixture', environment: 'Synthetic test', observedAt: '2026-10-29', cycle: 'Fixture cycle 3'});
  p = security(p, 'evidence', r2SecurityEvidence(p)); p = runtime(p, 'evidence', r2RuntimeEvidence(p)); p = attach(p); p = assurance(p, r2Observation(p, p.coauthoring.sources.at(-1).id));
  const c = changesSinceBaseline(p);
  assert.deepEqual(c.chapters, [], 'evidence is not listed as a chapter change'); assert.equal(c.edges, 0, 'nor as a changed link');
  assert.deepEqual(c.other, ['Evidence recorded since the baseline'], 'it is named on the evidence line');
  const control = p.security.controls[0], edited = changesSinceBaseline(security(p, 'control', {...control, purpose: control.purpose + ' Revised design.'}));
  assert.deepEqual(edited.chapters.map(x => x.chapter), [9], 'a design change is listed under its chapter'); assert(edited.chapters[0].changed.some(x => x.ref === control.ref));
  pass('r2: the SDD\'s changes since the last baseline list a design change under its chapter and name evidence only on the evidence line (no assurance record or link listed as a design change)');
}

// ---------------------------------------------------------------- 14. one alias table, and the fingerprint-1 stamp taken once per pass
{
  const legacy = asV1r2(approvedProject), up = rv.withFinalReview(structuredClone(legacy)), lb = up.finalReview.baselines.at(-1), m = up.finalReview, now = rv.reviewSourceStamp(up), chapters = rv.computeChapterStamps(up);
  assert.equal(m.readingsUpgrade?.design?.[now] + ':' + m.version, lb.stamp, 'the alias table a later readings upgrade chains through (readingsUpgrade) answers for the fingerprint-1 baseline under the current stamp');
  for (const id of [9, 10]) assert.equal(m.readingsUpgrade.chapters[id]?.[chapters[id]], lb.chapterStamps[id], 'and for its Chapter ' + id + ' stamp');
  const alone = structuredClone(up); delete alone.finalReview.designFingerprintUpgrade;
  assert.equal(rv.baselineCurrent(alone, lb), true, 'the baseline is answered through that one table'); assert.deepEqual(rv.baselineChanges(alone, lb), []);
  assert.equal(m.designFingerprintUpgrade?.from, 1, 'the fingerprint-1 stamps the upgrade read are kept for audit');
  assert.equal(m.designFingerprintUpgrade.design[now] + ':' + m.version, lb.stamp);
  const json = JSON.stringify; let taken = 0;
  JSON.stringify = function (v, ...rest) { if (v && typeof v === 'object' && !Array.isArray(v) && 'artefacts' in v && 'security' in v && !('finalReview' in v)) taken++; return json.call(this, v, ...rest); };
  try { rv.withDesignFingerprint(1, () => memoPass(legacy, () => { rv.reviewSourceStamp(legacy); rv.reviewSourceStamp(legacy); rv.reviewDesignStamp(legacy); })); } finally { JSON.stringify = json; }
  assert.equal(taken, 1, 'within one pass the fingerprint-1 design source is serialised once');
  pass('r2: the fingerprint upgrade keeps one alias table (readingsUpgrade, keyed by the current stamp, which a later readings upgrade chains through) and the fingerprint-1 stamps for audit; the fingerprint-1 design stamp is taken once per pass');
}

// ---------------------------------------------------------------- 15. fingerprint-1 documents with sources, under the same rule
{
  const legacy = asV1r2(() => { let p = attach(checkedChapters(rv.withFinalReview(seedProject()))); p = assurance(p, r2Observation(p, p.coauthoring.sources.at(-1).id)); return approve(p); });
  const before = underV1(() => approval(legacy));
  assert(before.baseline && before.handoff && before.designReview, 'under fingerprint 1 the project with a sourced observation is approved and handed off');
  const up = rv.withFinalReview(structuredClone(legacy));
  assert.deepEqual(approval(up), before, 'after the upgrade its approval state is the same');
  let e = attach(up, {...r2Report, title: 'Synthetic second report'}); e = assurance(e, r2Observation(e, e.coauthoring.sources.at(-1).id));
  stillApproved(up, e, 'after the upgrade, a new source and a reviewed observation citing it', []);
  // One whose baseline a source attached after it had made stale under fingerprint 1 stays stale (no silent flip).
  const late = asV1r2(() => attach(structuredClone(asV1r2(approvedProject)))), lateBefore = underV1(() => approval(late));
  assert.equal(lateBefore.baseline, false, 'under fingerprint 1 a source attached after the baseline made it stale');
  assert.deepEqual(approval(rv.withFinalReview(structuredClone(late))), lateBefore, 'after the upgrade it is still stale');
  pass('r2: fingerprint-1 documents carry their approval state over under the source rule (current stays current, stale stays stale); afterwards a new source with a reviewed observation leaves the approval current');
}

console.log(`\n${checks.length} checks passed.`);
