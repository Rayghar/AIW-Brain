import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {syntheticWorkbook} from './scripts/synthetic-workbook.mjs';
import {processDraftingQueue} from './drafting-service.js';
import {groupDraftPackets, DRAFT_CHAPTERS} from './public/architecture-drafter.js';
import {journeyInstructionsPin} from './intelligence-provider.js';
import {answer as mockProviderAnswer} from './mock-llm-provider.mjs';
import {readStoredProject, saveStoredProject} from './project-storage.js';
import {budgetedArchitectureDraft} from './intelligence-service.js';

const root = await mkdtemp(path.join(tmpdir(), 'aiw-architecture-service-'));
const env = {DB: localDatabase(path.join(root, 'project.sqlite')), FILES: localFiles(path.join(root, 'files')), ASSETS: {fetch: () => new Response('asset')}, OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'mock-architect'};
const origin = 'https://aiw.test', owner = 'pilot-architect';
let project = '';
const api = async (route, body, {ownerId = owner, projectId = project, bytes} = {}) => {
  const request = new Request(origin + route + (route.includes('?') ? '&' : '?') + 'project=' + projectId, {method: body || bytes ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': ownerId, Origin: origin, ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : bytes ? {body: bytes} : {})});
  const response = await worker.fetch(request, env);
  return {status: response.status, data: await response.json()};
};
const provider = body => new Response(JSON.stringify({id: 'mock-' + Math.random().toString(36).slice(2), model: 'mock-architect', status: 'completed', output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify(body)}]}], usage: {input_tokens: 40, output_tokens: 20}}));
const sourceTitle = statement => {
  const topic = /\b(?:standing instruction|fee waiver|cash withdrawal|tax deduction|customer profile|account balance|ledger entry|loan repayment|statement of account)\b/i.exec(statement)?.[0] || 'business process';
  return topic[0].toUpperCase() + topic.slice(1) + ' handling';
};
const previousFetch = globalThis.fetch;
let drafts = 0, checks = 0, cutNext = false;
globalThis.fetch = async (_url, init) => {
  const request = JSON.parse(init.body), name = request.text.format.name;
  if (name.startsWith('aiw_journey_draft')) return new Response(JSON.stringify(mockProviderAnswer(request)));
  if (name === 'aiw_architecture_draft_check') { checks++; return provider({proposals: [{id: 'A1', supported: true, defects: [], notes: []}]}); }
  assert.equal(name, 'aiw_architecture_draft'); drafts++;
  if (cutNext) { cutNext = false; return new Response(JSON.stringify({id: 'cut', model: 'mock-architect', status: 'incomplete', output: [], usage: {input_tokens: 1234, output_tokens: 567}})); }
  const packet = JSON.parse(request.input[0].content);
  if (packet.task === 'architecture-cross') return provider({proposals: [], keep: [], merges: []});
  return provider({proposals: [{kind: 'responsibility', title: sourceTitle(packet.requirements[0].statement), statement: 'Sol proposes a bounded responsibility for this source.', requirementRefs: [packet.requirements[0].ref], passages: [], basis: packet.requirements[0].statement, interpretation: 'Sol proposes a responsibility for the cited process.'}], keep: packet.skeleton.map(s => s.key)});
};
try {
  const duePlan = (await env.DB.prepare("EXPLAIN QUERY PLAN SELECT * FROM project_jobs WHERE kind IN ('draft','draft-apply') AND status='running' AND lease_until<? ORDER BY updated_at LIMIT 1").bind(new Date().toISOString()).all()).results;
  assert(duePlan.some(row => row.detail.includes('jobs_due_queue') && row.detail.includes('lease_until<?')), 'the scheduled expired-lease scan uses its global due-job index');
  const created = await api('/api/projects', {name: 'Architecture pilot', template: 'blank'});
  assert.equal(created.status, 201, JSON.stringify(created.data)); project = created.data.document.id;
  const {bytes, manifest} = syntheticWorkbook({rows: 4});
  const up = (await api('/api/intake?action=upload&filename=Synthetic.xlsx', null, {bytes})).data;
  const ins = (await api('/api/intake?action=inspect', {uploadId: up.id, sheet: manifest.sheet})).data;
  const input = {uploadId: up.id, sheet: ins.sheet, headerRow: ins.headerRow, mapping: ins.mapping, priorityMap: ins.bands.map, groups: {domain: true, capabilityTheme: true}};
  const preview = (await api('/api/intake?action=preview', input)).data;
  const imported = await api('/api/intake?action=apply', {...input, revision: preview.projectRevision, previewStamp: preview.stamp, reviewed: true});
  assert.equal(imported.status, 200, JSON.stringify(imported.data).slice(0, 400));
  const id = '11111111-2222-4333-8444-555555555555';
  const started = await api('/api/drafting?action=start', {requestId: id, mode: 'model'});
  assert.equal(started.status, 202, JSON.stringify(started.data));
  let job, consumed = 0, provedLease = false;
  for (let i = 0; i < 2000; i++) {
    job = (await api('/api/drafting?action=status&id=' + id)).data.job;
    if (job.status === 'queued' && job.progress?.phase === 'awaiting-next') {
      if (!provedLease) {
        // An unexpired claim cannot be stolen; an expired one is reclaimed using the same receipt.
        const at = new Date().toISOString(), future = new Date(Date.now() + 60000).toISOString();
        await env.DB.prepare("UPDATE project_jobs SET status='running',lease_until=?,updated_at=? WHERE owner_id=? AND project_id=? AND id=?").bind(future, at, owner, project, id).run();
        assert.equal((await processDraftingQueue(env)).dispatched, 0, 'a current lease blocks the scheduler');
        await env.DB.prepare("UPDATE project_jobs SET lease_until=? WHERE owner_id=? AND project_id=? AND id=?").bind(new Date(Date.now() - 1000).toISOString(), owner, project, id).run();
        provedLease = true;
      }
      const slice = await processDraftingQueue(env);
      assert.equal(slice.dispatched, 1, 'the scheduled consumer reclaims the receipt without a browser start');
      consumed++;
    }
    if (!['queued', 'running'].includes(job.status)) break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(job.status, 'completed', job.error);
  assert(consumed > 1 && provedLease, 'the provider completed across unattended scheduled slices');
  assert(drafts > 0 && checks > 0, 'the job called the provider and its source check');
  assert.equal(job.summary.mode, 'model');
  assert(drafts > 1, 'the job used more than one durable provider slice');
  assert(job.modelReview.accepted > 0);
  const sourceRow = await env.DB.prepare('SELECT document FROM project_jobs WHERE owner_id=? AND project_id=? AND id=?').bind(owner, project, id).first();
  const sourceFile = await env.FILES.get(JSON.parse(sourceRow.document).outputKey), sourceBundle = JSON.parse(await sourceFile.text());
  const working = (await api('/api/project')).data.document;
  const wordingChapter = DRAFT_CHAPTERS.find(chapter => groupDraftPackets(working, sourceBundle, chapter, {instructions: journeyInstructionsPin()}).length > 1);
  assert(wordingChapter !== undefined, 'the fixture has more than one wording group for an unattended continuation');
  const wordingId = '44444444-2222-4333-8444-555555555555';
  assert.equal((await api('/api/drafting?action=assist', {id, chapter: wordingChapter, requestId: wordingId})).status, 202);
  let wording, wordingSlices = 0;
  for (let i = 0; i < 2000; i++) {
    wording = (await api('/api/drafting?action=status&id=' + wordingId)).data.job;
    if (wording.status === 'queued' && wording.progress?.phase === 'awaiting-next') { await processDraftingQueue(env); wordingSlices++; }
    if (!['queued', 'running'].includes(wording.status)) break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(wording.status, 'completed', wording.error);
  assert(wordingSlices > 0 && wording.summary.assisted.groups.length > 1, 'wording completes across saved one-group slices');
  const page = await api('/api/drafting?action=records&id=' + id + '&chapter=4');
  assert.equal(page.status, 200, JSON.stringify(page.data));
  assert(page.data.records.some(r => r.sol.engine === 'model' && r.reasoning?.basis && r.reasoning?.interpretation));
  assert.equal((await api('/api/drafting?action=records&id=' + id + '&chapter=4', null, {ownerId: 'another-person'})).status, 404);
  const pv = (await api('/api/drafting?action=preview&id=' + id)).data;
  const appliedId = '22222222-2222-4333-8444-555555555555';
  assert.equal((await api('/api/drafting?action=apply', {id, requestId: appliedId, stamp: pv.preview.stamp, revision: pv.revision, reviewed: true})).status, 409, 'one acknowledgement cannot bypass the proposal pages');
  for (const chapter of pv.preview.chapters) for (let offset = 0; offset < chapter.records; offset += 20) {
    const page = await api('/api/drafting?action=records&id=' + id + '&chapter=' + chapter.chapter + '&offset=' + offset);
    assert.equal(page.status, 200);
    assert(page.data.records.length > 0 && page.data.records.length <= 20);
    assert.equal((await api('/api/drafting?action=review-page', {id, chapter: chapter.chapter, offset, stamp: pv.preview.stamp})).status, 200);
  }
  const reviewed = (await api('/api/drafting?action=preview&id=' + id)).data.review;
  assert.equal(reviewed.done, reviewed.total, 'all pages are durably reviewed');
  assert.equal((await api('/api/drafting?action=apply', {id, requestId: appliedId, stamp: pv.preview.stamp, revision: pv.revision, reviewed: true})).status, 202);
  let applied;
  for (let i = 0; i < 2000; i++) {
    applied = (await api('/api/drafting?action=status&id=' + appliedId)).data.job;
    if (!['queued', 'running'].includes(applied.status)) break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(applied.status, 'completed', applied.error);
  const doc = (await api('/api/project')).data.document;
  assert(doc.logical.responsibilities.some(r => / handling$/.test(r.title) && r.state === 'proposed' && r.provenance?.draft?.engine === 'model'));
  const at = new Date().toISOString(), editor = 'revoked-editor', revokedId = '55555555-2222-4333-8444-555555555555', callsBeforeRevocation = drafts;
  await env.DB.prepare('INSERT INTO project_access(owner_id,project_id,actor_id,role,created_at) VALUES(?,?,?,?,?)').bind(owner, project, editor, 'editor', at).run();
  await env.DB.prepare("INSERT INTO project_jobs(owner_id,project_id,id,kind,status,input_hash,document,revision,created_at,updated_at) VALUES(?,?,?,'draft','queued',?,?,1,?,?)").bind(owner, project, revokedId, 'test-revoke', JSON.stringify({actor: editor, kind: 'draft', mode: 'model', progress: {phase: 'queued'}}), at, at).run();
  await env.DB.prepare("UPDATE project_access SET role='viewer' WHERE owner_id=? AND project_id=? AND actor_id=?").bind(owner, project, editor).run();
  assert.equal((await processDraftingQueue(env)).dispatched, 1);
  const revoked = (await api('/api/drafting?action=status&id=' + revokedId)).data.job;
  assert.equal(revoked.status, 'failed');
  assert.match(revoked.error, /editor access/);
  assert.equal(drafts, callsBeforeRevocation, 'a demoted editor cannot use the provider through a queued job');
  // Even if access changes after a long apply prepared its document, the final project commit checks access and
  // lease atomically with the saved revision. No project data is changed by a stale worker.
  const revRow = await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner, project).first();
  const revStored = await readStoredProject(env, owner, revRow.document), guardedToken = crypto.randomUUID();
  await env.DB.prepare("UPDATE project_jobs SET status='running',document=json_set(document,'$.leaseToken',?) WHERE owner_id=? AND project_id=? AND id=?").bind(guardedToken, owner, project, revokedId).run();
  const guardedSave = await saveStoredProject(env, owner, project, revStored.document, revRow.revision, at, revStored.keys, () => [], {jobGuard: {id: revokedId, token: guardedToken, actor: editor}});
  assert.equal(guardedSave.meta?.changes, 0, 'a demoted editor cannot commit a previously prepared apply');
  assert.equal((await env.DB.prepare('SELECT revision FROM projects WHERE owner_id=? AND id=?').bind(owner, project).first()).revision, revRow.revision);
  await env.DB.prepare("UPDATE project_jobs SET status='failed',lease_until=NULL WHERE owner_id=? AND project_id=? AND id=?").bind(owner, project, revokedId).run();
  const cancelledId = '33333333-2222-4333-8444-555555555555', callsBeforeCancel = drafts;
  await env.DB.prepare("INSERT INTO project_jobs(owner_id,project_id,id,kind,status,input_hash,document,revision,created_at,updated_at) VALUES(?,?,?,'draft','queued',?,?,1,?,?)").bind(owner, project, cancelledId, 'test-cancel', JSON.stringify({actor: owner, kind: 'draft', mode: 'model', progress: {phase: 'queued'}}), at, at).run();
  const cancelled = await api('/api/drafting?action=cancel', {id: cancelledId});
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.data.job.status, 'cancelled');
  assert.equal((await processDraftingQueue(env)).dispatched, 0, 'cancelled jobs cannot be reclaimed');
  assert.equal(drafts, callsBeforeCancel, 'cancellation makes no provider call');
  // The drafting plan (round 23, BR-06), read before a start: the themes, runs and estimated tokens, against the project's
  // drafting budget and what its drafting used in the last 24 hours. It starts nothing and reserves nothing.
  const runsBefore = (await env.DB.prepare('SELECT COUNT(*) AS n FROM intelligence_runs WHERE owner_id=? AND project_id=?').bind(owner, project).first()).n;
  const planned = await api('/api/drafting?action=plan');
  assert.equal(planned.status, 200, JSON.stringify(planned.data));
  const {plan: draftPlan, budget: draftBudget} = planned.data;
  assert(draftPlan.themes.length > 0 && draftPlan.runs === draftPlan.themes.length + 1 && draftPlan.calls === 2 * draftPlan.runs, 'a run per theme and one cross-cutting pass, each a draft and a check call');
  assert(draftPlan.tokens > 0 && draftPlan.themes.every(t => t.packetTokens > 0));
  assert.deepEqual([draftBudget.requests, draftBudget.tokens], [120, 6000000], 'the default drafting budget');
  assert(draftBudget.used.runs > 0, 'the plan counts the drafting runs already used');
  assert.equal(planned.data.fits, true);
  assert.equal(planned.data.cost, null, 'no prices are configured, so no cost is estimated');
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM intelligence_runs WHERE owner_id=? AND project_id=?').bind(owner, project).first()).n, runsBefore, 'reading the plan reserves nothing');
  // The interactive budget does not hold a drafting job (BR-06): with the hour's interactive requests all taken, the
  // job's next theme still runs, under the project's drafting budget.
  const hour = new Date(Date.now() - 3600000).toISOString();
  const taken = (await env.DB.prepare("SELECT COUNT(*) AS n FROM intelligence_runs WHERE owner_id=? AND mode<>'architecture' AND created_at>?").bind(owner, hour).first()).n, budgetIds = [];
  for (let i = taken; i < 30; i++) {
    const fake = crypto.randomUUID(); budgetIds.push(fake);
    await env.DB.prepare("INSERT INTO intelligence_runs(owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens,used_tokens) VALUES(?,?,?,?,?,?,'completed',?,?,?,?,?,?,0,0)").bind(owner, fake, project, 'test-quota', 'field', 'test', 'OpenAI', 'mock-architect', 'test/' + fake, at, at, owner).run();
  }
  const pauseId = '66666666-2222-4333-8444-555555555555', beforeQuota = drafts;
  assert.equal((await api('/api/drafting?action=start', {requestId: pauseId, mode: 'model'})).status, 202);
  let paused;
  for (let i = 0; i < 400; i++) {
    paused = (await api('/api/drafting?action=status&id=' + pauseId)).data.job;
    if (paused.progress?.phase === 'awaiting-next' || !['queued', 'running'].includes(paused.status)) break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(paused.progress.phase, 'awaiting-next', paused.error || paused.progress.message);
  assert(drafts > beforeQuota, 'the interactive quota leaves the drafting job running');
  for (const fake of budgetIds) await env.DB.prepare('DELETE FROM intelligence_runs WHERE owner_id=? AND id=?').bind(owner, fake).run();
  // Another Sol request of the project still running pauses the job instead of failing a theme; it resumes after.
  const busyRun = crypto.randomUUID(), beforePause = drafts;
  await env.DB.prepare("INSERT INTO intelligence_runs(owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens) VALUES(?,?,?,?,?,?,'pending',?,?,?,?,?,?,1000)").bind(owner, busyRun, project, 'test-busy', 'field', 'test', 'OpenAI', 'mock-architect', 'test/' + busyRun, new Date().toISOString(), new Date().toISOString(), owner).run();
  assert.equal((await processDraftingQueue(env)).dispatched, 1);
  for (let i = 0; i < 400; i++) {
    paused = (await api('/api/drafting?action=status&id=' + pauseId)).data.job;
    if (paused.progress?.phase === 'paused-budget' || !['queued', 'running'].includes(paused.status)) break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(paused.status, 'queued');
  assert.equal(paused.progress.phase, 'paused-budget', 'a running request pauses the job instead of failing a theme');
  assert(paused.progress.retryAt > at);
  assert.equal((await processDraftingQueue(env)).dispatched, 0, 'a paused budget is not polled before retryAt');
  assert.equal(drafts, beforePause, 'a pause sends no provider data');
  await env.DB.prepare('DELETE FROM intelligence_runs WHERE owner_id=? AND id=?').bind(owner, busyRun).run();
  await env.DB.prepare("UPDATE project_jobs SET document=json_set(document,'$.progress.retryAt',?) WHERE owner_id=? AND project_id=? AND id=?").bind(new Date(Date.now() - 1000).toISOString(), owner, project, pauseId).run();
  assert.equal((await processDraftingQueue(env)).dispatched, 1, 'the saved job resumes automatically when the request ends');
  for (let i = 0; i < 400 && drafts === beforePause; i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert(drafts > beforePause);
  const themeRun = await env.DB.prepare("SELECT * FROM intelligence_runs WHERE owner_id=? AND project_id=? AND object_id=? AND mode='architecture' AND status='completed' ORDER BY created_at DESC LIMIT 1").bind(owner, project, 'draft-theme:'+pauseId).first();
  assert(themeRun?.used_tokens > 0);
  const charged = (await env.DB.prepare("SELECT COUNT(*) AS n FROM intelligence_runs WHERE owner_id=? AND project_id=? AND object_id=?").bind(owner, project, 'draft-theme:'+pauseId).first()).n, callsBeforeReplay = drafts;
  await budgetedArchitectureDraft(env, owner, project, doc, {stamp: themeRun.input_stamp}, {actor: owner, jobId: pauseId});
  assert.equal((await env.DB.prepare("SELECT COUNT(*) AS n FROM intelligence_runs WHERE owner_id=? AND project_id=? AND object_id=?").bind(owner, project, 'draft-theme:'+pauseId).first()).n, charged, 'replaying a completed theme does not reserve a second run');
  assert.equal(drafts, callsBeforeReplay, 'replaying a completed theme does not send a second provider call');
  for (let i = 0; i < 400; i++) { const j = (await api('/api/drafting?action=status&id=' + pauseId)).data.job; if (j.status !== 'running') break; await new Promise(resolve => setTimeout(resolve, 10)); }
  assert.equal((await api('/api/drafting?action=cancel', {id: pauseId})).data.job.status, 'cancelled');
  assert.equal((await processDraftingQueue(env)).dispatched, 0);
  // A failed theme run records what the provider billed (round 23): an incomplete answer's tokens, not none.
  {
    const {themePacket, architectureInstructionsPin} = await import('./public/architecture-contract.js');
    const {draftArchitecture, draftUnits} = await import('./public/architecture-drafter.js');
    const now = (await api('/api/project')).data.document, unit = draftUnits(now)[0];
    const cutPacket = themePacket(now, draftArchitecture(now), unit, {instructions: architectureInstructionsPin()});
    cutNext = true;
    await assert.rejects(budgetedArchitectureDraft(env, owner, project, now, cutPacket, {actor: owner, jobId: 'accounting-check'}), e => e.code === 'incomplete' && e.usage?.inputTokens === 1234 && e.usage?.outputTokens === 567);
    const cutRun = await env.DB.prepare('SELECT status,used_tokens FROM intelligence_runs WHERE owner_id=? AND project_id=? AND object_id=?').bind(owner, project, 'draft-theme:accounting-check').first();
    assert.deepEqual({...cutRun}, {status: 'failed', used_tokens: 1801}, 'a failed run records the tokens the provider billed');
  }
  // The owner's drafting budget (BR-06): set in the policy within its bounds, and once the project's drafting has used
  // it, a new draft's themes keep the rules skeleton without a provider call, each saying why (final, never retried).
  const opsPost = async body => { const response = await worker.fetch(new Request(origin + '/api/operations?project=' + project, {method: 'POST', headers: {'oai-authenticated-user-id': owner, Origin: origin, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID()}, body: JSON.stringify(body)}), env); return {status: response.status, data: await response.json()}; };
  const ops = (await api('/api/operations')).data, used = ops.draftingBudget.last24h.runs;
  assert(used > 0 && ops.draftingBudget.requests === 120 && ops.draftingBudget.maxRequests === 1000, 'Operations shows the drafting budget and its use');
  const policy = extra => ({action: 'policy', revision: ops.projectRevision, enabled: true, hourlyRequests: 30, dailyTokens: 1000000, excludedObjectIds: [], reason: 'Synthetic drafting budget', ...extra});
  const tooMany = await opsPost(policy({jobRequests: 1001}));
  assert.equal(tooMany.status, 400); assert.match(tooMany.data.error, /drafting requests/);
  assert.equal((await opsPost(policy({jobTokens: 20000001}))).status, 400);
  const setBudget = await opsPost(policy({jobRequests: used, jobTokens: 6000000}));
  assert.equal(setBudget.status, 200, JSON.stringify(setBudget.data));
  const tight = (await api('/api/drafting?action=plan')).data;
  assert.deepEqual([tight.budget.requests, tight.budget.remaining.runs, tight.fits], [used, 0, false], 'the plan says the draft would pass the budget');
  const spentId = '77777777-2222-4333-8444-555555555555', beforeSpent = drafts;
  assert.equal((await api('/api/drafting?action=start', {requestId: spentId, mode: 'model'})).status, 202);
  let spentJob;
  for (let i = 0; i < 2000; i++) {
    spentJob = (await api('/api/drafting?action=status&id=' + spentId)).data.job;
    if (spentJob.status === 'queued' && spentJob.progress?.phase === 'awaiting-next') await processDraftingQueue(env);
    if (!['queued', 'running'].includes(spentJob.status)) break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(spentJob.status, 'completed', spentJob.error);
  assert.equal(drafts, beforeSpent, 'a spent drafting budget sends no provider data');
  assert(spentJob.progress.themes.length > 0 && spentJob.progress.themes.every(t => t.status === 'failed' && /drafting budget is spent/.test(t.error)), 'each theme says why it keeps the skeleton');
  assert.equal(spentJob.modelReview.accepted, 0);
  assert.equal((await env.DB.prepare("SELECT COUNT(*) AS n FROM intelligence_runs WHERE owner_id=? AND project_id=? AND object_id=?").bind(owner, project, 'draft-theme:'+spentId).first()).n, 0, 'nothing is reserved past the budget');
  console.log(`PASS Architecture service: unattended model and wording slices, lease recovery, revocation, the drafting plan and budget (interactive quota apart, pause on a running request, owner's bounds, final when spent), replay and failure accounting, cancellation, ${drafts} architecture draft calls and ${checks} checks, paged review and human-gated apply`);
} finally { globalThis.fetch = previousFetch; env.DB.close(); await rm(root, {recursive: true, force: true}); }
