// Restore and authority (round 2, B2-01, B2-08, B2-23). A recovery package carries the identities that signed in
// on the workbench it came from. Restored here, they are historical assertions: the review, baseline and approval
// authors are cleared (kept as importedActor), so approval evidence on an imported baseline is refused for lack of
// a signed-in review author, and after the restoring account records the architect review again, approval still
// needs a second signed-in person. The complete package leaves a project only for its owner or an editor, and the
// imported audit record is read back against its stored digest. In-process Worker, SQLite and files; no network.
// Synthetic identities and a synthetic fixture: nothing here is a claim about any real approval.
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {seedProject} from './public/requirements-domain.js';
import * as rv from './public/review-domain.js';
import {buildRecovery, previewRecovery, neutraliseImportedAuthority, IMPORTED_AUTHORITY} from './recovery-service.js';
import {saveStoredProject} from './project-storage.js';
import {freezeBaseline} from './scripts/freeze-baseline.mjs';
import {createProject} from './shared/projects-domain.js';
import {applyKnowledgeCommand, releasedClaims, knowledgeStamp, knowledgeEligibility} from './public/knowledge-governance.js';
import {stampWritten, reviewOf, judgementMembers, judgementStamp} from './public/provenance.js';
import {reviewPlan} from './public/review-plan.js';

const checks = [], pass = (name) => checks.push(name);
const scratch = mkdtempSync(path.join(tmpdir(), 'aiw-recovery-authority-'));
const env = {DB: localDatabase(path.join(scratch, 'test.sqlite')), FILES: localFiles(path.join(scratch, 'files')), ASSETS: {fetch: () => new Response('ok')}};
const origin = 'https://aiw.test';
async function api(path, {actor = 'architect', body, method, headers = {}} = {}) {
  const response = await worker.fetch(new Request(origin + path, {method: method || (body ? 'POST' : 'GET'), headers: {'oai-authenticated-user-id': actor, Origin: origin, ...(body ? {'Content-Type': 'application/json'} : {}), ...headers}, ...(body ? {body: JSON.stringify(body)} : {})}), env);
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = {raw: text}; }
  return {status: response.status, data};
}
// The review fixture from review-validate.mjs, driven to an approved, architect-reviewed baseline.
const narrative = {title: 'Synthetic SDD fixture', owner: 'Fixture architect', audience: 'Prototype validation', summary: 'Synthetic review, not a bank approval.', scope: 'Reference project only.', approach: 'Preserve findings and separate design from implementation.', confirmed: true};
// A finding's stamp identifies the finding, and recording review steps does not change it, so each disposition uses
// the stamp read once at the start of the walk (reading the findings again for every step costs minutes).
const treatment = (f) => ({findingId: f.id, stamp: f.stamp, treatment: 'Accepted design limitation', reviewer: 'Synthetic reviewer', reference: 'Test fixture only', rationale: 'Synthetic explicit limitation used to exercise review state transitions.', reviewed: true});
const record = (p, outcome) => ({stamp: rv.reviewDesignStamp(p), outcome, reviewer: 'Synthetic reviewer', reference: 'Fixture outcome, no real approval', rationale: 'Source gaps remain explicit.', reviewed: true});
const capture = (p) => ({stamp: rv.reviewDesignStamp(p), title: 'Synthetic frozen review', reviewed: true});
const trace = (p, id) => ({requirementId: id, stamp: rv.reviewSourceStamp(p), visited: [0, 1, 2, 3, 4], reviewer: 'Synthetic reviewer', notes: 'Fixture links and gaps reviewed; no runtime execution.', reviewed: true});
const approval = (baselineId) => ({baselineId, outcome: 'Approved with conditions', reviewer: 'Synthetic governance fixture', reference: 'No external approval; automated fixture', notes: 'Exercise conditional approval state.', conditions: 'Complete and evidence delivery obligations before any real implementation.', reviewed: true});
// Every step a review needs, in order, as a list of [type, payload-from-project] pairs.
const reviewSteps = (p) => [['intake', () => ({})], ['narrative', () => narrative], ...rv.reviewRequirements(p).map((r) => ['trace', (q) => trace(q, r.id)]), ...rv.inheritedFindings(p).filter((f) => f.level === 'error').map((f) => ['disposition', () => treatment(f)]), ['checks', () => ({})], ['record', (q) => record(q, 'Ready with actions / limitations')], ['baseline', (q) => capture(q)]];

try {
  // 1. The origin workbench: alice-imported records the architect review and freezes the baseline, bob-imported
  // records approval evidence; the delivery handoff is current there.
  let p = rv.withFinalReview(seedProject());
  const run = (type, payload, actor) => { p = rv.applyFinalReviewCommand(p, {type: 'review.' + type, payload}, undefined, actor).document; };
  for (const [type, payload] of reviewSteps(p)) run(type, payload(p), 'alice-imported');
  const originBaseline = p.finalReview.baselines.at(-1);
  assert.equal(originBaseline.classification, 'Architect reviewed'); assert.equal(rv.reviewAuthor(originBaseline), 'alice-imported');
  run('governance', approval(originBaseline.id), 'bob-imported');
  run('handoff', {baselineId: originBaseline.id, acknowledge: true}, 'bob-imported');
  assert(rv.finalHandoffCurrent(p), 'the fixture reaches a current handoff on the origin workbench');
  const originId = 'origin-' + crypto.randomUUID().slice(0, 8), at = '2026-09-01T09:00:00.000Z';
  p.id = originId;
  await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind('origin-owner', originId, JSON.stringify({...p, finalReview: {...p.finalReview, baselines: []}}), at).run();
  assert((await saveStoredProject(env, 'origin-owner', originId, p, 1, at, new Map())).meta.changes, 'the origin project is saved with its baseline in object storage');

  // 2. Export (owner only) and the preview's statement of what the package carries.
  const originIdentity = {owner: 'origin-owner', actor: 'origin-owner', role: 'owner'};
  const pack = await buildRecovery(env, originIdentity, originId);
  const preview = await previewRecovery(pack);
  assert.deepEqual(preview.importedAuthority.actors, ['alice-imported', 'bob-imported'], 'the preview names the imported authors');
  assert.equal(preview.importedAuthority.handoff, true); assert.equal(preview.importedAuthority.authority, IMPORTED_AUTHORITY);
  assert(preview.limits.some((l) => /second signed-in person/.test(l)), 'the preview says approval needs a second signed-in person here');
  const unit = neutraliseImportedAuthority(structuredClone(p), at).finalReview;
  assert(unit.reviews.every((r) => r.actor === null && r.importedActor === 'alice-imported'));
  assert(unit.baselines.every((b) => b.actor === null && b.importedActor === 'alice-imported' && b.review.outcome.actor === null && b.review.outcome.importedActor === 'alice-imported'));
  assert(unit.governance.every((g) => g.actor === null && g.importedActor === 'bob-imported' && g.reviewAuthor === null && g.importedReviewAuthor === 'alice-imported'));
  assert.equal(unit.handoff, null); assert.equal(unit.importedHandoff.baselineId, originBaseline.id); assert.equal(unit.imported.authority, IMPORTED_AUTHORITY);
  pass('neutralisation: every review, baseline (and its frozen review outcome), approval, disposition, trace and handoff author is cleared and kept as importedActor; the preview names them');

  // A D3 group judgement is a signed-in review too. A package may preserve its evidence and the original reviewer,
  // but importing it cannot silently make a new workbench's review plan complete.
  {
    const priorAt = '2026-08-30T09:00:00.000Z', restoredAt = '2026-09-01T09:00:00.000Z';
    let q = rv.withFinalReview(createProject({name: 'Permit review', template: 'blank'}, 'review-transfer', priorAt));
    const item = {id: 'REQ-001', type: 'requirement', title: 'Accept one permit application', description: 'Record it once.', acceptance: 'Given one application, when accepted, then one record exists.', owner: 'Permit office', source: 'Synthetic fixture', priority: 'Must', confirmed: false, origin: 'sol-draft'};
    stampWritten(item, {kind: 'sol-draft', id: 'draft-agent'}, priorAt); q.artefacts.push(item);
    const scope = {kind: 'records', ids: ['1:REQ-001']}, stamp = judgementStamp(q, judgementMembers(q, scope));
    q = rv.applyFinalReviewCommand(q, {type: 'review.judgement', payload: {scope, stamp, outcome: 'kept', rationale: 'The obligation is correctly stated.', evidence: 'Original source reviewed.', reviewed: true}}, priorAt, 'source-reviewer').document;
    assert.equal(reviewOf(q, item, 1)?.by, 'source-reviewer');
    const imported = neutraliseImportedAuthority(structuredClone(q), restoredAt);
    assert.equal(imported.finalReview.judgements[0].actor, null);
    assert.equal(imported.finalReview.judgements[0].importedActor, 'source-reviewer');
    assert.equal(reviewOf(imported, imported.artefacts[0], 1), null, 'the imported judgement is history, not a local review');
    assert(reviewPlan(imported).steps.some(step => step.kind === 'records' && step.chapter === 1 && step.count === 1), 'the review plan opens the draft here');
    const localStamp = judgementStamp(imported, judgementMembers(imported, scope));
    const local = rv.applyFinalReviewCommand(imported, {type: 'review.judgement', payload: {scope, stamp: localStamp, outcome: 'kept', rationale: 'Checked it here.', evidence: 'Read the current source and record.', reviewed: true}}, '2026-09-02T09:00:00.000Z', 'local-reviewer').document;
    assert.equal(reviewOf(local, local.artefacts[0], 1)?.by, 'local-reviewer');
    assert(!reviewPlan(local).steps.some(step => step.kind === 'records' && step.chapter === 1), 'the local judgement closes only this draft');
    pass('group judgements survive recovery as historical evidence; their imported authors cannot satisfy local provenance or the review plan, while a new signed-in judgement can');
  }

  // 3. Restore as the architect through the API, then try to use the imported authority.
  const previewed = await api('/api/recovery?action=preview', {body: {package: pack}});
  assert.equal(previewed.status, 200, JSON.stringify(previewed.data));
  const restored = await api('/api/recovery?action=restore', {body: {package: pack, hash: previewed.data.hash, name: 'Restored with imported approvals', reviewed: true}});
  assert.equal(restored.status, 201, JSON.stringify(restored.data));
  assert.deepEqual(restored.data.importedAuthority.actors, ['alice-imported', 'bob-imported']);
  const id = restored.data.id, project = () => api('/api/project?project=' + id);
  let state = (await project()).data;
  const m = state.document.finalReview;
  assert.equal(m.handoff, null, 'the imported handoff is not current here'); assert(m.importedHandoff);
  assert(m.baselines.every((b) => b.actor === null && b.importedActor === 'alice-imported'), 'imported baseline authors are historical');
  const historical = rv.withFinalReview(state.document);
  assert(!rv.reviewIntakeCurrent(historical) && !rv.narrativeCurrent(historical) && !rv.finalChecksCurrent(historical), 'source intake, narrative confirmation and checks need a local review');
  assert(!rv.traceReviewFor(historical, rv.reviewRequirements(historical)[0].id), 'an imported trace is not a local review');
  assert(!rv.latestDesignReview(historical) && !rv.currentBaseline(historical), 'an imported architect review is historical even if its design stamp matches');
  const priorFinding = rv.inheritedFindings(historical).find(f => m.dispositions.some(d => d.findingId === f.id));
  assert(priorFinding && !rv.latestDisposition(historical, priorFinding), 'an imported finding treatment needs local assessment');
  assert(!rv.finalHandoffCurrent(historical), 'the delivery handoff stays locked after restore');
  assert.equal(rv.finalMilestones(historical).find((x) => x.id === 'handoff').done, false);
  const importedBaseline = m.baselines.at(-1);
  const command = (type, payload, actor = 'architect') => api('/api/commands?project=' + id, {actor, body: {revision: state.revision, command: {type: 'review.' + type, payload}}});
  let r = await command('governance', approval(importedBaseline.id));
  assert.equal(r.status, 400); assert.match(r.data.error, /no signed-in author[\s\S]*Record the architect review again/, 'approval on an imported baseline is refused for the restoring account');
  r = await api('/api/access?project=' + id, {body: {actorId: 'steward', role: 'editor'}});
  assert.equal(r.status, 200, JSON.stringify(r.data));
  r = await command('governance', approval(importedBaseline.id), 'steward');
  assert.equal(r.status, 400); assert.match(r.data.error, /no signed-in author/, 'and for a second real member: the imported review author is nobody here');
  r = await command('handoff', {baselineId: importedBaseline.id, acknowledge: true});
  assert.equal(r.status, 400, 'the handoff cannot be re-established from imported records');
  pass('after restore: intake, narrative, checks, trace, finding treatment and architect review are historical; imported baseline approval is refused for both the restoring account and a second member, and handoff stays locked');

  // 4. A review recorded here, by a signed-in person, and approval by a second signed-in person.
  // Each step's payload is computed from the project the previous command returned (a command answers with the saved
  // project and its revision), so the walk needs no extra reads.
  state = (await project()).data;
  // The baseline is frozen as a job (round 12, GR-STO-02: baseline-service.js), its receipt read until it is saved.
  const raw = (path, body) => worker.fetch(new Request(origin + path, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': 'architect', Origin: origin, ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env);
  for (const [type, payload] of reviewSteps(rv.withFinalReview(state.document))) {
    if (type === 'baseline') { const f = await freezeBaseline(raw, {...payload(rv.withFinalReview(state.document)), project: id}); assert(!f.error, f.error); state = f.state; continue; }
    r = await command(type, payload(rv.withFinalReview(state.document)));
    assert.equal(r.status, 200, type + ': ' + JSON.stringify(r.data));
    state = {document: r.data.document, revision: r.data.revision};
  }
  state = (await project()).data;
  const fresh = state.document.finalReview.baselines.at(-1);
  assert.equal(fresh.classification, 'Architect reviewed'); assert.equal(fresh.actor, 'architect'); assert.equal(rv.reviewAuthor(fresh), 'architect', 'the new baseline\'s review author is the signed-in architect');
  r = await command('governance', approval(fresh.id));
  assert.equal(r.status, 400); assert.match(r.data.error, /second signed-in person[\s\S]*architect recorded the architect review/, 'the same person cannot approve');
  r = await command('governance', approval(fresh.id), 'steward');
  assert.equal(r.status, 200, JSON.stringify(r.data));
  state = (await project()).data;
  const governance = state.document.finalReview.governance.at(-1);
  assert.equal(governance.actor, 'steward'); assert.equal(governance.reviewAuthor, 'architect');
  r = await command('handoff', {baselineId: fresh.id, acknowledge: true});
  assert.equal(r.status, 200, JSON.stringify(r.data));
  state = (await project()).data;
  assert(rv.finalHandoffCurrent(rv.withFinalReview(state.document)), 'the handoff is current only once two signed-in people here recorded review and approval');
  pass('two signed-in people here: the restoring architect records the review and freezes a baseline, the same account cannot approve it, a second signed-in member can, and only then is the handoff current');

  // 5. The complete package leaves the project only for its owner or an editor (B2-08); the imported audit record
  // is read back against its digest (B2-23).
  await api('/api/access?project=' + id, {body: {actorId: 'reader', role: 'viewer'}});
  await api('/api/access?project=' + id, {body: {actorId: 'checker', role: 'reviewer'}});
  for (const actor of ['reader', 'checker']) {
    for (const action of ['export', 'audit']) {
      r = await api('/api/recovery?project=' + id + '&action=' + action, {actor});
      assert.equal(r.status, 403, actor + ' ' + action); assert.equal(r.data.code, 'role');
    }
    assert.equal((await api('/api/project?project=' + id, {actor})).status, 200, actor + ' still reads the project');
  }
  for (const actor of ['steward', 'architect']) {
    r = await api('/api/recovery?project=' + id + '&action=export', {actor}); assert.equal(r.status, 200, actor + ' exports');
    r = await api('/api/recovery?project=' + id + '&action=audit', {actor}); assert.equal(r.status, 200); assert.equal(r.data.authority, 'Historical imported assertions, not current authenticated approvals.');
  }
  const row = JSON.parse((await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind('architect', id).first()).document);
  assert.match(row.workspace.recovery.auditDigest, /^[a-f0-9]{64}$/, 'the audit record is stored with its digest');
  await env.FILES.put(row.workspace.recovery.auditKey, JSON.stringify({importedAt: at, authority: 'altered in storage', audit: {}}));
  r = await api('/api/recovery?project=' + id + '&action=audit');
  assert.equal(r.status, 422); assert.equal(r.data.code, 'integrity'); assert.match(r.data.error, /integrity check/, 'an altered audit record is refused as an integrity fault, not served');
  pass('export and audit: viewers and reviewers are refused (403, code role) while still reading the project; owner and editors export; the imported audit record is verified against its digest and an altered copy answers 422 integrity');

  // 6. Preview and restore read the package once; a package that smuggles storage metadata is refused.
  // A package travels as entries, each with its SHA-256, its manifest last (round 12, GR-STO-03: recovery-package.js).
  const manifest = JSON.parse(pack.trim().split('\n').at(-1));
  assert.equal(manifest.schema, 'aiw.recovery.v2'); assert(manifest.entries.length > 1 && manifest.entries.every((e) => /^[a-f0-9]{64}$/.test(e.sha256)), 'the reference project travels as entries, each with its SHA-256');
  const smuggled = {...structuredClone(p), changes: {schemaVersion: 2, segments: [{key: 'changes/x', count: 1}], counter: 1, eventCount: 1}};
  await assert.rejects(() => previewRecovery(smuggled), /hydrated project export/);
  pass('packages: internal storage references (journal segments) are refused in a package');

  // 7. Knowledge claims follow the same rule: a claim verified on the origin workbench by someone other than its author
  // is not verified here. After restore (pins cleared) a single signed-in person who activates the imported release
  // finds the claim ineligible until a verification is recorded here, by a successor release.
  const review = {reviewed: true, reviewer: 'Synthetic acceptance reviewer', reason: 'Synthetic test of conditions and source trace; not a real knowledge approval.'};
  let k = rv.withFinalReview(createProject({name: 'Workshop equipment', template: 'blank', brief: 'Reserve equipment safely.'}, 'claims-fixture'));
  const kc = (type, payload, actor) => { const result = applyKnowledgeCommand(k, {type: 'knowledge.' + type, payload}, at, actor); k = result.document; return result.selected; };
  const sourceId = kc('source', {title: 'Synthetic cache reference', body: 'Cache copy\nA cached description may lag its authority when the use tolerates bounded staleness.\n', path: 'synthetic/cache.md', revision: 'fixture-1'}, 'alice-imported');
  const claimId = kc('claim', {sourceId, lineStart: 2, lineEnd: 2, subjectId: 'PAT-CACHE-ASIDE', claimType: 'applicability', predicate: 'permits cached descriptions', polarity: 'supports', statement: 'Bounded older descriptions may serve repeated reads.', conditions: ['Read tolerates a bounded older description.'], limitations: ['Does not establish transactional correctness.'], tags: ['cache']}, 'alice-imported');
  kc('review', {...review, id: claimId, decision: 'verified', sourceChecked: true, rightsChecked: true, conditionsChecked: true}, 'bob-imported');
  const releaseId = kc('release', {...review, title: 'Imported release', claimIds: [claimId]}, 'alice-imported');
  kc('activate', {...review, id: releaseId, stamp: knowledgeStamp(k)}, 'alice-imported');
  assert(releasedClaims(k)[0].eligible, 'on the origin workbench the claim is eligible: two different people');
  let restoredKnowledge = neutraliseImportedAuthority(structuredClone(k), at);
  restoredKnowledge.knowledge.pins = []; // as the restore does
  assert.equal(restoredKnowledge.knowledge.claims[0].review.actor, null); assert.equal(restoredKnowledge.knowledge.claims[0].review.importedActor, 'bob-imported');
  assert.equal(restoredKnowledge.knowledge.releases[0].claims[0].review.importedActor, 'bob-imported', 'and in the released copy');
  // Without the neutralisation one signed-in person could activate the imported release and use its claim:
  const unneutralised = structuredClone(k); unneutralised.knowledge.pins = [];
  assert(releasedClaims(applyKnowledgeCommand(unneutralised, {type: 'knowledge.activate', payload: {...review, id: releaseId, stamp: knowledgeStamp(unneutralised)}}, at, 'architect').document)[0].eligible, 'control: imported identities alone would have made the claim usable');
  assert.throws(() => applyKnowledgeCommand(restoredKnowledge, {type: 'knowledge.activate', payload: {...review, id: releaseId, stamp: knowledgeStamp(restoredKnowledge)}}, at, 'architect'), /unavailable or withdrawn support/, 'after restore the imported release cannot be activated');
  const eligibility = knowledgeEligibility(restoredKnowledge, restoredKnowledge.knowledge.releases[0].claims[0], restoredKnowledge.knowledge.releases[0]);
  assert.equal(eligibility.eligible, false); assert(eligibility.reasons.some((reason) => /Another authenticated person must review/.test(reason)), eligibility.reasons.join(' '));
  const knowledgePreview = (await previewRecovery(structuredClone(k))).importedAuthority;
  assert.equal(knowledgePreview.verifiedClaims, 1); assert(knowledgePreview.actors.includes('bob-imported'), 'the preview names the imported verifier');
  pass('knowledge: an imported claim verifier is cleared (kept as importedActor) in the claim and its released copy, so an imported release cannot be activated here and its claim stays ineligible until it is verified here (control: without it, one person could activate it)');
} finally {
  env.DB.close();
  rmSync(scratch, {recursive: true, force: true});
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
