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
import {applySecurityCommand, controlStamp, evidenceCurrent} from './public/security-domain.js';
import {applyRuntimeCommand, runtimePlanStamp, runtimeEvidenceCurrent} from './public/runtime-domain.js';
import {applyAssuranceCommand, assuranceCurrent} from './public/assurance-domain.js';
import {needsReadingsUpgrade, upgradeReadings} from './public/readings-upgrade.js';
import {withReadingsDefinition} from './public/source-fingerprint.js';

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
function approvedProject() {
  let p = rv.withFinalReview(seedProject());
  p = security(p, 'review'); p = security(p, 'handoff', {acknowledge: true});
  p = runtime(p, 'intake'); p = runtime(p, 'review'); p = runtime(p, 'handoff', {acknowledge: true});
  p = review(p, 'intake');
  p = review(p, 'narrative', {title: 'Synthetic SDD fixture', owner: 'Fixture architect', audience: 'Validation only', summary: 'Synthetic review, not an approval.', scope: 'Reference project only.', approach: 'Keep design and evidence apart.', confirmed: true});
  for (const f of rv.inheritedFindings(p).filter(x => x.level === 'error')) {
    p = review(p, 'action', {title: 'Resolve ' + f.id.slice(0, 60), owner: 'Fixture owner', due: '2026-12-01', acceptance: 'Record the observed result and its limits.', objectIds: [rv.reviewObjects(p).some(o => o.id === f.objectId) ? f.objectId : 'api'], findingId: f.id});
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
  p = review(p, 'delivery', {id: p.finalReview.actions[0].id, status: 'Verified', progress: 'Synthetic observed check only', reviewer: 'Fixture verifier', reference: 'Fixture evidence, no real check', reviewed: true}, APPROVER);
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

console.log(`\n${checks.length} checks passed.`);
