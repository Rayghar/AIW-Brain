// Drafting as a job (round 12, workstream E; audit/round12/DESIGN.md D-10, D-11). /api/drafting starts Sol's
// architecture draft of a project (public/architecture-drafter.js) as a background job and answers at once with its
// receipt; the job reports its progress per chapter and can be cancelled; a retried start with the same receipt (or
// Idempotency-Key) returns the same job and never drafts twice. The draft is a bundle the person previews (counts and
// a sample per chapter, every cap with its headroom, the trace) and applies as one reviewed step, itself a job: the
// bundle's commands in batches of at most DRAFT_BATCH, through each chapter's own handler, one journal event per
// chapter, one save. Every applied record is Sol's proposal (state proposed, origin sol-draft, provenance.draft),
// applied by the person and reviewed by no one. Nothing here approves, confirms, accepts or chooses anything.
//
//   POST ?action=start   {requestId, chapters?}                      → 202 {id, status, receipt}; the same id again → the same job
//   GET  ?action=status&id=   the job: status, progress per chapter, its summary (counts, caps, trace) or error
//   GET  ?action=latest       the newest draft and apply jobs of the project (a page reloaded finds its receipt here)
//   GET  ?action=preview&id=  the preview of a completed draft against the project as it stands, with its stamp
//   GET  ?action=plan         before a model draft: its themes, runs, estimated tokens and cost, and the drafting budget
//   POST ?action=cancel  {id}                                         → a queued or running job stops between steps
//   POST ?action=apply   {id, requestId, stamp, revision, reviewed: true} → 202 {id, status, receipt} (the apply job)
//   POST ?action=assist  {id, chapter, requestId}                    → 202: a new draft, the chapter worded by Sol with
//                        the model, one bounded request per requirement group (503 without a configured model)
//
// The jobs are rows of project_jobs (kinds 'draft' and 'draft-apply'); a draft's bundle is a private file with its
// SHA-256, read back only when its digest matches. A job runs after the answer (ctx.waitUntil when the host gives one,
// else detached), never on the request: it yields between chapters and batches, holds a lease it renews, and a job
// whose lease ran out (the server stopped) reads as interrupted. A scheduled consumer resumes it without a browser.
import {readStoredProject, saveStoredProject} from './project-storage.js';
import {withFinalReview} from './public/review-domain.js';
import {refreshRepositoryAssurance} from './repository-sync.js';
import {refreshOrganizationAssurance} from './organization-service.js';
import {activityStatement} from './object-service.js';
import {operationStatement, draftingSpent} from './operation-service.js';
import {draftSteps, draftUnits, applySteps, draftPreview, capsOf, groupDraftPackets, withWording, draftArchitecture, DRAFT_CHAPTERS, DRAFT_TITLES, DRAFT_SCHEMA} from './public/architecture-drafter.js';
import {draftGroupWording, budgetedArchitectureDraft} from './intelligence-service.js';
import {runArchitectureJob, architecturePlan} from './architecture-job.js';
import {intelligenceStatus, journeyInstructionsPin, providers, usageCost, jobBudgetOf} from './intelligence-provider.js';
import {draftsByGroup, groupedDraftReason} from './public/readiness-model.js';
import {digest} from './public/brain-integrity.js';
import {errorResponse, integrityError} from './error-message.js';
import {json} from './http.js';

export const DRAFT_KINDS = new Set(['draft', 'draft-apply']);
// A wording job holds a longer lease: one group's request (a draft call and a check call) may take minutes.
const LEASE_MS = 60000, ASSIST_LEASE_MS = 300000, MODEL_LEASE_MS = 900000, HOURLY_JOBS = 30;
const QUEUE_BATCH_MAX = 4;
const prefix = (owner, project) => 'drafting/' + encodeURIComponent(owner) + '/' + project + '/';
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const ID = /^[A-Za-z0-9_-]{16,100}$/;
const REVIEW_PAGE = 20;
const pageKey = (chapter, offset) => String(chapter) + ':' + offset;
const pageTotal = bundle => bundle.chapters.reduce((n, c) => n + Math.ceil(c.records.length / REVIEW_PAGE), 0);
const reviewSummary = (job, bundle, stamp, actor) => {
  const pages = job?.review?.stamp === stamp && job.review.actor === actor ? job.review.pages || [] : [];
  return {done: pages.length, total: pageTotal(bundle), pages};
};
const rowOf = r => r ? {...JSON.parse(r.document), id: r.id, kind: r.kind, status: r.status, revision: r.revision, leaseUntil: r.lease_until, createdAt: r.created_at, updatedAt: r.updated_at} : null;
const jobById = async (env, owner, project, id) => rowOf(await env.DB.prepare('SELECT * FROM project_jobs WHERE owner_id=? AND project_id=? AND id=?').bind(owner, project, id).first());
// What a reader is told about a job: its state (a running job whose lease ran out was interrupted), its progress and
// its summary; never its storage key.
function view(job) {
  if (!job) return null;
  const {outputKey, checkpointKey, leaseToken, ...rest} = job, interrupted = job.status === 'running' && job.leaseUntil && Date.parse(job.leaseUntil) < Date.now();
  return {...rest, status: interrupted ? 'interrupted' : job.status, receipt: job.id};
}
async function loadProject(env, owner, project) {
  const row = await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner, project).first();
  if (!row) return null;
  const stored = await readStoredProject(env, owner, row.document);
  stored.document = await refreshRepositoryAssurance(env, owner, await refreshOrganizationAssurance(env, owner, withFinalReview(stored.document)));
  return {p: stored.document, revision: row.revision, keys: stored.keys};
}
async function readBundle(env, owner, project, job) {
  if (job?.kind !== 'draft' || job.status !== 'completed' || !job.outputKey?.startsWith(prefix(owner, project))) throw Error('Complete this draft before you preview or apply it.');
  const file = await env.FILES.get(job.outputKey);
  if (!file) throw integrityError('The draft is no longer stored. Draft again.', job.outputKey);
  const bundle = JSON.parse(await file.text());
  if (digest(bundle) !== job.outputHash || bundle.schema !== DRAFT_SCHEMA) throw integrityError('The stored draft failed its integrity check. Draft again.', job.outputKey);
  return bundle;
}
// Writes a job's document and status, while the job still holds its lease (a cancelled job keeps its status).
async function update(env, owner, project, id, doc, status, lease = null) {
  const {id: _i, kind: _k, status: _s, revision: _r, leaseUntil: _l, createdAt: _c, updatedAt: _u, ...body} = doc;
  return env.DB.prepare("UPDATE project_jobs SET document=?,status=?,revision=revision+1,lease_until=?,updated_at=? WHERE owner_id=? AND project_id=? AND id=? AND status='running' AND json_extract(document,'$.leaseToken')=?").bind(JSON.stringify(body), status, lease, new Date().toISOString(), owner, project, id, doc.leaseToken).run();
}
const cancelled = async (env, owner, project, id) => (await env.DB.prepare('SELECT status FROM project_jobs WHERE owner_id=? AND project_id=? AND id=?').bind(owner, project, id).first())?.status === 'cancelled';
async function mayContinue(env, owner, project, actor) {
  if (actor === owner) return !!(await env.DB.prepare('SELECT 1 AS found FROM projects WHERE owner_id=? AND id=?').bind(owner, project).first());
  const access = await env.DB.prepare('SELECT role FROM project_access WHERE owner_id=? AND project_id=? AND actor_id=?').bind(owner, project, actor).first();
  return access?.role === 'owner' || access?.role === 'editor';
}
const accessLost = () => Error('This drafting job stopped because its original actor no longer has project editor access.');
const leaseNow = (ms = LEASE_MS) => new Date(Date.now() + ms).toISOString();
// Takes the job for this run: queued, or running with its lease run out (interrupted). False when another holds it.
async function lease(env, owner, project, job) {
  const at = new Date().toISOString(), token = crypto.randomUUID();
  if (job.progress?.phase === 'paused-budget' && job.progress.retryAt > at) return null;
  const r = await env.DB.prepare("UPDATE project_jobs SET status='running',document=json_set(document,'$.leaseToken',?),revision=revision+1,lease_until=?,updated_at=? WHERE owner_id=? AND project_id=? AND id=? AND revision=? AND (status='queued' OR (status='running' AND lease_until<?))").bind(token, leaseNow(job.assist ? ASSIST_LEASE_MS : job.mode === 'model' ? MODEL_LEASE_MS : LEASE_MS), at, owner, project, job.id, job.revision, at).run();
  return r.meta?.changes ? token : null;
}

// The draft job: the chapters one after another, each reported as it is drafted; the bundle kept privately.
async function runDraft(env, identity, project, id) {
  const {owner} = identity, job = await jobById(env, owner, project, id);
  if (!job) return;
  const token = await lease(env, owner, project, job);
  if (!token) return;
  if (job.assist) return runWording(env, identity, project, job, token);
  const started = Date.now(), model = job.mode === 'model', doc = {...job, leaseToken: token, progress: model ? {phase: 'model', themes: [], total: 0, done: 0} : {phase: 'drafting', chapters: [], total: DRAFT_CHAPTERS.length, records: 0}};
  try {
    if (!await mayContinue(env, owner, project, identity.actor)) throw accessLost();
    const loaded = await loadProject(env, owner, project);
    if (!loaded) throw Error('This project is unavailable.');
    if (model && loaded.p.workspace?.aiPolicy?.enabled === false) throw Error('The project owner disabled external AI processing while this draft was waiting.');
    doc.basis = {revision: loaded.revision, contentVersion: loaded.p.contentVersion || 0};
    const steps = draftSteps(loaded.p, {chapters: model ? DRAFT_CHAPTERS : job.chapters || DRAFT_CHAPTERS});
    let bundle;
    for (;;) {
      const x = steps.next();
      if (x.done) { bundle = x.value; break; }
      if (!model) { doc.progress.chapters.push({chapter: x.value.chapter, title: x.value.title, records: x.value.records.length}); doc.progress.records += x.value.records.length; }
      await update(env, owner, project, id, doc, 'running', leaseNow(model ? MODEL_LEASE_MS : LEASE_MS));
      if (await cancelled(env, owner, project, id)) return;
      await tick();
    }
    if (model) {
      // Each lease writes to its own key. A timed-out invocation cannot replace a newer checkpoint.
      const checkpointKey = prefix(owner, project) + id + '.checkpoint.' + token + '.json';
      let completed = [];
      const savedCheckpointKey = job.checkpointKey || prefix(owner, project) + id + '.checkpoint.json';
      const file = await env.FILES.get(savedCheckpointKey);
      if (job.checkpointKey && !file) throw integrityError('The model draft checkpoint is missing. Start a new draft.', job.checkpointKey);
      if (file) {
        const saved = JSON.parse(await file.text());
        if (saved.revision !== loaded.revision || saved.skeletonStamp !== bundle.stamp || digest(saved.themes) !== saved.hash) throw integrityError('The model draft checkpoint does not match this project. Start a new draft.', savedCheckpointKey);
        completed = saved.themes;
        doc.checkpointKey = savedCheckpointKey;
      }
      doc.progress.total = draftUnits(loaded.p).length + 1;
      await update(env, owner, project, id, doc, 'running', leaseNow(MODEL_LEASE_MS));
      const result = await runArchitectureJob(loaded.p, bundle, {
        // One provider theme (or the cross pass) per invocation. The durable checkpoint is written before yielding;
        // the workbench starts the next slice with the same receipt. A hosted waitUntil never owns the entire job.
        request: async packet => { if (!await mayContinue(env, owner, project, identity.actor)) throw accessLost(); return budgetedArchitectureDraft(env, owner, project, loaded.p, packet, {actor: identity.actor, jobId: id}); }, completed, maxNewUnits: 1,
        cancelled: () => cancelled(env, owner, project, id),
        onTheme: async (theme, done, total, themes) => {
          if (!await mayContinue(env, owner, project, identity.actor)) throw accessLost();
          if (await cancelled(env, owner, project, id)) return;
          const previousCheckpoint = doc.checkpointKey;
          await env.FILES.put(checkpointKey, JSON.stringify({revision: loaded.revision, skeletonStamp: bundle.stamp, themes, hash: digest(themes)}), {httpMetadata: {contentType: 'application/json'}});
          doc.checkpointKey = checkpointKey;
          doc.progress.done = done; doc.progress.total = total;
          doc.progress.themes = themes.map(t => ({key: t.key, title: t.title, status: t.status, proposals: t.proposals.length, withheld: t.withheld, ...(t.withheldDetails?.length ? {reason: t.withheldDetails[0].issues?.[0]} : {}), ...(t.error ? {error: t.error} : {})}));
          const saved = await update(env, owner, project, id, doc, 'running', leaseNow(MODEL_LEASE_MS));
          if (!saved.meta?.changes) { await env.FILES.delete(checkpointKey); throw Error('The drafting lease ended before this checkpoint was saved.'); }
          if (previousCheckpoint && previousCheckpoint !== checkpointKey) await env.FILES.delete(previousCheckpoint).catch(() => {});
        }
      });
      if (!result) return;
      if (result.pending) {
        doc.progress.phase = 'awaiting-next';
        doc.progress.next = result.next;
        await update(env, owner, project, id, doc, 'queued');
        return;
      }
      bundle = result.bundle;
      doc.modelReview = {themes: result.themes.length, accepted: result.themes.filter(t => t.status === 'accepted').length, withheld: result.themes.filter(t => t.status === 'withheld').length, failed: result.themes.filter(t => t.status === 'failed').length, notSent: result.themes.filter(t => t.status === 'not-sent').length, cross: result.cross?.status || 'not-sent'};
    }
    if (!await mayContinue(env, owner, project, identity.actor)) throw accessLost();
    const key = prefix(owner, project) + id + '.json';
    await env.FILES.put(key, JSON.stringify(bundle), {httpMetadata: {contentType: 'application/json'}});
    doc.outputKey = key; doc.outputHash = digest(bundle);
    doc.summary = {mode: model ? 'model' : 'rules', stamp: bundle.stamp, counts: bundle.counts, caps: bundle.caps, trace: bundle.trace, notes: bundle.notes, asks: bundle.asks, basis: bundle.basis, chapters: bundle.chapters.map(c => ({chapter: c.chapter, title: c.title, records: c.records.length, commands: c.commands}))};
    doc.progress.phase = 'drafted'; doc.elapsedMs = Date.now() - started;
    const finishedCheckpoint = doc.checkpointKey;
    delete doc.checkpointKey;
    const saved = await update(env, owner, project, id, doc, 'completed');
    if (!saved.meta?.changes) { await env.FILES.delete(key); return; }
    if (finishedCheckpoint) await env.FILES.delete(finishedCheckpoint).catch(() => {});
    await operationStatement(env, owner, project, 'job', {id, kind: 'draft', status: 'completed', records: bundle.counts.records, elapsedMs: doc.elapsedMs, actor: identity.actor}).run();
  } catch (e) {
    if (e?.code === 'budget') {
      doc.progress.phase = 'paused-budget';
      doc.progress.retryAt = new Date(Date.now() + 300000).toISOString();
      doc.progress.message = String(e.message).slice(0, 240);
      await update(env, owner, project, id, doc, 'queued');
      return;
    }
    doc.error = String(e?.message || e).slice(0, 700);
    await update(env, owner, project, id, doc, 'failed');
  }
}

// The wording job (DRF-18): Sol rewords one chapter of a completed draft, one requirement group at a time (one bounded
// request each: architecture-drafter.js groupDraftPackets, intelligence-service.js draftGroupWording), and the accepted
// answers make a new draft (withWording) the person previews and applies like any other. One group is requested per
// lease, with answers checkpointed before yielding to the scheduler. A browser is not needed between groups.
async function runWording(env, identity, project, job, token) {
  const {owner} = identity, id = job.id, started = Date.now(), doc = {...job, leaseToken: token, progress: {phase: 'wording', chapter: job.assist.chapter, groups: [], total: 0}};
  try {
    if (!await mayContinue(env, owner, project, identity.actor)) throw accessLost();
    await update(env, owner, project, id, doc, 'running', leaseNow(ASSIST_LEASE_MS));
    const source = await jobById(env, owner, project, job.assist.from), bundle = await readBundle(env, owner, project, source), loaded = await loadProject(env, owner, project);
    if (!loaded) throw Error('This project is unavailable.');
    if (source.basis?.revision !== loaded.revision) throw Error('The project changed after the draft was made. Draft again before asking Sol to word it.');
    doc.basis = {revision: loaded.revision, contentVersion: loaded.p.contentVersion || 0};
    const packets = groupDraftPackets(loaded.p, bundle, job.assist.chapter, {instructions: journeyInstructionsPin()});
    const packetStamps = digest(packets.map(p => [p.groupId, p.packet.stamp]));
    const checkpointKey = prefix(owner, project) + id + '.wording.' + token + '.json';
    let completed = [];
    if (job.checkpointKey) {
      const file = await env.FILES.get(job.checkpointKey);
      if (!file) throw integrityError('The wording checkpoint is missing. Start again from the source draft.', job.checkpointKey);
      const saved = JSON.parse(await file.text());
      if (saved.revision !== loaded.revision || saved.sourceStamp !== bundle.stamp || saved.packetStamps !== packetStamps || digest(saved.results) !== saved.hash) throw integrityError('The wording checkpoint does not match the source draft.', job.checkpointKey);
      completed = saved.results;
    }
    if (completed.length > packets.length || completed.some((r, i) => r.groupId !== packets[i].groupId)) throw integrityError('The wording checkpoint is out of order.', job.checkpointKey);
    doc.progress.total = packets.length;
    doc.progress.groups = completed.map(r => ({groupId: r.groupId, status: r.status, answers: r.answers.length, ...(r.runId ? {runId: r.runId} : {}), ...(r.error ? {error: r.error} : {})}));
    await update(env, owner, project, id, doc, 'running', leaseNow(ASSIST_LEASE_MS));
    if (completed.length < packets.length && completed.at(-1)?.status !== 'not-sent') {
      await draftGroupWording(env, owner, project, loaded.p, packets.slice(completed.length, completed.length + 1), {actor: identity.actor, cancelled: async () => await cancelled(env, owner, project, id) || !await mayContinue(env, owner, project, identity.actor), onGroup: async r => {
        if (!await mayContinue(env, owner, project, identity.actor)) throw accessLost();
        if (await cancelled(env, owner, project, id)) return;
        const previousCheckpoint = doc.checkpointKey;
        completed.push(r);
        await env.FILES.put(checkpointKey, JSON.stringify({revision: loaded.revision, sourceStamp: bundle.stamp, packetStamps, results: completed, hash: digest(completed)}), {httpMetadata: {contentType: 'application/json'}});
        doc.checkpointKey = checkpointKey;
        doc.progress.groups.push({groupId: r.groupId, status: r.status, answers: r.answers.length, ...(r.runId ? {runId: r.runId} : {}), ...(r.error ? {error: r.error} : {})});
        const saved = await update(env, owner, project, id, doc, 'running', leaseNow(ASSIST_LEASE_MS));
        if (!saved.meta?.changes) { await env.FILES.delete(checkpointKey); throw Error('The wording lease ended before this checkpoint was saved.'); }
        if (previousCheckpoint && previousCheckpoint !== checkpointKey) await env.FILES.delete(previousCheckpoint).catch(() => {});
      }});
    }
    if (await cancelled(env, owner, project, id)) return;
    if (!await mayContinue(env, owner, project, identity.actor)) throw accessLost();
    if (completed.length < packets.length && completed.at(-1)?.status !== 'not-sent') {
      doc.progress.phase = 'awaiting-next';
      doc.progress.next = completed.length;
      await update(env, owner, project, id, doc, 'queued');
      return;
    }
    const bundle2 = withWording(loaded.p, bundle, job.assist.chapter, completed), key = prefix(owner, project) + id + '.json';
    await env.FILES.put(key, JSON.stringify(bundle2), {httpMetadata: {contentType: 'application/json'}});
    doc.outputKey = key; doc.outputHash = digest(bundle2);
    doc.summary = {stamp: bundle2.stamp, counts: bundle2.counts, caps: bundle2.caps, trace: bundle2.trace, notes: bundle2.notes, asks: bundle2.asks, basis: bundle2.basis, assisted: bundle2.assisted, chapters: bundle2.chapters.map(c => ({chapter: c.chapter, title: c.title, records: c.records.length, commands: c.commands}))};
    doc.progress.phase = 'worded'; doc.elapsedMs = Date.now() - started;
    const finishedCheckpoint = doc.checkpointKey;
    delete doc.checkpointKey;
    const saved = await update(env, owner, project, id, doc, 'completed');
    if (!saved.meta?.changes) { await env.FILES.delete(key); return; }
    if (finishedCheckpoint) await env.FILES.delete(finishedCheckpoint).catch(() => {});
    await operationStatement(env, owner, project, 'job', {id, kind: 'draft', status: 'completed', records: bundle2.counts.records, reworded: bundle2.assisted.reworded, elapsedMs: doc.elapsedMs, actor: identity.actor}).run();
  } catch (e) {
    doc.error = String(e?.message || e).slice(0, 700);
    await update(env, owner, project, id, doc, 'failed');
  }
}

// The apply job: the bundle a person previewed, applied as one reviewed step, saved once.
async function runApply(env, identity, project, id) {
  const {owner, actor} = identity, job = await jobById(env, owner, project, id);
  if (!job) return;
  const token = await lease(env, owner, project, job);
  if (!token) return;
  const started = Date.now(), doc = {...job, leaseToken: token, progress: {phase: 'applying', chapter: null, done: 0, total: 0, chapters: []}};
  try {
    if (!await mayContinue(env, owner, project, actor)) throw accessLost();
    const draft = await jobById(env, owner, project, job.draftId), bundle = await readBundle(env, owner, project, draft), loaded = await loadProject(env, owner, project);
    if (!loaded) throw Error('This project is unavailable.');
    if (loaded.revision !== job.projectRevision) throw Error('The project changed after the preview. Nothing was applied: preview the draft again.');
    doc.progress.total = bundle.counts.commands;
    const at = new Date().toISOString(), steps = applySteps(loaded.p, bundle, {at, actor, jobId: id, reason: job.reason || ''});
    let result, before = 0, last = 0;
    for (;;) {
      const x = steps.next();
      if (x.done) { result = x.value; break; }
      // Progress: the commands of the chapters applied before this one, and this one's so far (at most DRAFT_BATCH a step).
      doc.progress.chapter = x.value.chapter; doc.progress.done = Math.min(before + x.value.done, doc.progress.total);
      if (x.value.done === x.value.total) { doc.progress.chapters.push({chapter: x.value.chapter, title: DRAFT_TITLES[x.value.chapter], commands: x.value.total}); before += x.value.total; }
      // Progress is written at most every half second; a cancel is read before each batch.
      if (Date.now() - last > 500 || x.value.done === x.value.total) { last = Date.now(); await update(env, owner, project, id, doc, 'running', leaseNow()); }
      if (await cancelled(env, owner, project, id)) return;
      await tick();
    }
    doc.progress.phase = 'saving';
    await update(env, owner, project, id, doc, 'running', leaseNow());
    if (await cancelled(env, owner, project, id)) return;
    if (!await mayContinue(env, owner, project, actor)) throw accessLost();
    const records = bundle.counts.records, summary = `Applied Sol's architecture draft: ${records.toLocaleString('en-GB')} proposals in ${bundle.chapters.length} chapters, not reviewed by a person`;
    doc.progress.phase = 'applied';
    doc.result = {savedRevision: loaded.revision + 1, records, commands: bundle.counts.commands, counts: result.counts, events: result.events, created: Object.keys(result.created).length};
    doc.elapsedMs = Date.now() - started;
    const {id: _i, kind: _k, status: _s, revision: _r, leaseUntil: _l, createdAt: _c, updatedAt: _u, ...finished} = doc;
    const now = new Date().toISOString();
    const saved = await saveStoredProject(env, owner, project, result.document, loaded.revision, at, loaded.keys, stamp => [
      activityStatement(env, identity, project, {at, kind: 'model', title: 'draft.apply', summary, authorKind: 'sol-draft', reviewed: false, reason: job.reason || `Sol's architecture draft, applied as proposals for a person to review.`, jobId: id, draftId: job.draftId, revision: loaded.revision + 1, changeIds: result.events}, stamp),
      env.DB.prepare("UPDATE project_jobs SET document=?,status='completed',revision=revision+1,lease_until=NULL,updated_at=? WHERE owner_id=? AND project_id=? AND id=? AND status='running' AND json_extract(document,'$.leaseToken')=? AND EXISTS(SELECT 1 FROM projects WHERE owner_id=? AND id=? AND index_stamp=?)").bind(JSON.stringify(finished), now, owner, project, id, token, owner, project, stamp),
      env.DB.prepare("UPDATE project_jobs SET document=json_set(document,'$.applied',json(?)),revision=revision+1,updated_at=? WHERE owner_id=? AND project_id=? AND id=? AND status='completed' AND EXISTS(SELECT 1 FROM projects WHERE owner_id=? AND id=? AND index_stamp=?)").bind(JSON.stringify({id, at, actor, savedRevision: loaded.revision + 1}), now, owner, project, job.draftId, owner, project, stamp)
    ], {jobGuard: {id, token, actor}});
    if (!saved.meta?.changes) throw Error('The project changed while the draft was applied. Nothing was saved: preview the draft again.');
    // The project, completed apply receipt and source draft's applied marker are committed in one DB transaction.
    await operationStatement(env, owner, project, 'job', {id, kind: 'draft-apply', status: 'completed', records, elapsedMs: doc.elapsedMs, actor}).run();
  } catch (e) {
    doc.error = String(e?.message || e).slice(0, 700);
    await update(env, owner, project, id, doc, 'failed');
  }
}

// Starts a job after the answer: on the host's waitUntil when it gives one, else detached. Never awaited here.
function background(ctx, task, env = null) {
  const run = Promise.resolve().then(task).catch(() => {}), host = ctx?.waitUntil ? ctx : env?.AIW_BACKGROUND;
  if (host?.waitUntil) host.waitUntil(run);
  return run;
}
const RUNNERS = {draft: runDraft, 'draft-apply': runApply};

// The scheduled Worker and local server call this independently of any signed-in browser. Each invocation claims
// at most a few jobs, and a model draft consumes at most one new provider theme per claim. The persisted actor came
// from the authenticated start; the scheduler cannot review or apply a draft on a person's behalf.
export async function processDraftingQueue(env, {maxJobs = 1} = {}) {
  const limit = Math.min(QUEUE_BATCH_MAX, Math.max(1, Number.isInteger(maxJobs) ? maxJobs : 1));
  const at = new Date().toISOString();
  // Keep queued and expired-lease probes separate so SQLite can use kind/status and the lease range
  // from jobs_due_queue; an OR across the statuses reduces the index to its kind prefix.
  const rows = (await env.DB.prepare("SELECT * FROM project_jobs WHERE kind IN ('draft','draft-apply') AND status='queued' AND (json_extract(document,'$.progress.phase') IS NULL OR json_extract(document,'$.progress.phase')!='paused-budget' OR json_extract(document,'$.progress.retryAt')<=?) UNION ALL SELECT * FROM project_jobs WHERE kind IN ('draft','draft-apply') AND status='running' AND lease_until<? ORDER BY updated_at ASC LIMIT ?").bind(at, at, limit).all()).results;
  let claimed = 0;
  for (const row of rows) {
    const job = rowOf(row);
    if (typeof job.actor !== 'string' || !job.actor || !RUNNERS[job.kind]) continue;
    const before = await jobById(env, row.owner_id, row.project_id, row.id);
    if (before?.status !== job.status || before?.revision !== job.revision) continue;
    await RUNNERS[job.kind](env, {owner: row.owner_id, actor: job.actor, role: 'editor', account: 'person'}, row.project_id, row.id);
    claimed++;
  }
  return {examined: rows.length, dispatched: claimed};
}

// The plan of a model draft before it starts (round 23, BR-06): what the job will send (architecturePlan), the tokens it
// is expected to use and, where both routes' providers have prices, what that would cost, beside the project's drafting
// budget and what its drafting used in the last 24 hours. It reads; it starts nothing and reserves nothing. With a module
// structure (round 24) the units it counts are the modules and their parts, each with its module, role and part.
async function planResponse(env, owner, project) {
  const loaded = await loadProject(env, owner, project);
  if (!loaded) return json({error: 'This project is unavailable.'}, 404);
  if (!draftsByGroup(loaded.p)) return json({error: 'This project is drafted chapter by chapter from its brief: use the journey draft.', code: 'journey'}, 409);
  const status = intelligenceStatus(env, 'architecture'), policy = loaded.p.workspace?.aiPolicy || {}, budget = jobBudgetOf(policy), used = await draftingSpent(env, owner, project);
  const plan = architecturePlan(loaded.p, draftArchitecture(loaded.p)), reg = providers(env);
  const priced = (route, usage) => route ? usageCost(env, usage, reg.byName.get(route.provider)?.pricing || null) : null;
  const draft = priced(status.route?.draft, plan.draft), check = priced(status.route?.check, plan.check);
  const cost = draft && check && draft.currency === check.currency ? {amount: Math.round((draft.amount + check.amount) * 10000) / 10000, currency: draft.currency || null} : null;
  const remaining = {runs: Math.max(0, budget.requests - used.runs), tokens: Math.max(0, budget.tokens - used.tokens)};
  const route = r => r ? {provider: r.provider, model: r.model} : null;
  return json({configured: status.configured, enabled: policy.enabled !== false, routes: {draft: route(status.route?.draft), check: route(status.route?.check)},
    plan: {...plan, themes: plan.themes.map(({key, title, requirements, packetTokens, module, role, part, served}) => ({key, title, requirements, packetTokens, module, role, part, served}))}, cost, budget: {...budget, used, remaining},
    fits: plan.runs <= remaining.runs && plan.tokens + plan.largestReservation <= remaining.tokens});
}

export async function handleDrafting(request, env, identity, project, ctx) {
  const {owner, actor, role} = identity, url = new URL(request.url), action = url.searchParams.get('action') || 'latest';
  if (!['GET', 'POST'].includes(request.method)) return json({error: 'Unsupported drafting action.'}, 405);
  if (request.method === 'POST' && request.headers.get('Origin') !== url.origin) return json({error: 'Draft from your private workbench.'}, 403);
  try {
    if (request.method === 'GET') {
      if (action === 'latest') {
        const rows = await env.DB.prepare("SELECT * FROM project_jobs WHERE owner_id=? AND project_id=? AND kind IN ('draft','draft-apply') ORDER BY created_at DESC LIMIT 20").bind(owner, project).all();
        const jobs = rows.results.map(rowOf), draft = jobs.find(j => j.kind === 'draft') || null, apply = jobs.find(j => j.kind === 'draft-apply') || null;
        return json({draft: view(draft), apply: view(apply)});
      }
      if (action === 'plan') return planResponse(env, owner, project);
      const job = await jobById(env, owner, project, url.searchParams.get('id') || '');
      if (!job || !DRAFT_KINDS.has(job.kind)) return json({error: 'Choose a drafting job of this project.'}, 404);
      if (action === 'status') return json({job: view(job)});
      if (action === 'preview') {
        const bundle = await readBundle(env, owner, project, job), loaded = await loadProject(env, owner, project);
        if (!loaded) return json({error: 'This project is unavailable.'}, 404);
        const preview = draftPreview(loaded.p, bundle, loaded.revision), stale = job.basis?.revision !== loaded.revision;
        // Whether Sol may word a chapter of it with the model (a configured provider, and the owner's policy allows it).
        const sol = {configured: intelligenceStatus(env, 'architecture').configured, enabled: loaded.p.workspace?.aiPolicy?.enabled !== false};
        return json({preview, revision: loaded.revision, stale, sol, review: reviewSummary(job, bundle, preview.stamp, actor), ...(stale ? {reason: 'The project changed after this draft was made. Draft again before you apply it.'} : {})});
      }
      if (action === 'records') {
        const bundle = await readBundle(env, owner, project, job);
        const chapter = bundle.chapters.find(c => String(c.chapter) === url.searchParams.get('chapter'));
        if (!chapter) return json({error: 'Choose a chapter in this draft.'}, 400);
        const offset = Number(url.searchParams.get('offset') || 0);
        if (!Number.isSafeInteger(offset) || offset < 0 || offset > chapter.records.length) return json({error: 'Choose a valid page of records.'}, 400);
        const limit = REVIEW_PAGE;
        return json({chapter: chapter.chapter, title: chapter.title, offset, total: chapter.records.length, next: offset + limit < chapter.records.length ? offset + limit : null,
          reviewed: (job.review?.actor === actor && (job.review.pages || []).includes(pageKey(chapter.chapter, offset))),
          records: chapter.records.slice(offset, offset + limit).map(r => ({key: r.key, kind: r.kind, title: r.title, note: r.note || '', groups: r.groups, cites: r.cites, sol: r.sol || {engine: 'rules'}, wording: r.wording || [], reasoning: r.reasoning || null, commands: r.commands}))});
      }
      return json({error: 'Unknown drafting action.'}, 400);
    }
    if (!['owner', 'editor'].includes(role)) return json({error: 'A project editor drafts and applies.'}, 403);
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({error: 'Expected a drafting request.'}, 415);
    const body = await request.text();
    if (body.length > 8000) return json({error: 'A drafting request is short.'}, 413);
    let raw;
    try { raw = JSON.parse(body); } catch { return json({error: 'The drafting request could not be read.'}, 400); }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return json({error: 'The drafting request is incomplete.'}, 400);
    if (action === 'review-page') {
      if (identity.account === 'agent') return json({error: 'A person reviews proposal pages.'}, 403);
      const job = await jobById(env, owner, project, String(raw.id || ''));
      if (!job || job.kind !== 'draft' || job.status !== 'completed' || job.applied) return json({error: 'Choose an unapplied completed draft.'}, 404);
      const bundle = await readBundle(env, owner, project, job), loaded = await loadProject(env, owner, project);
      if (!loaded || job.basis?.revision !== loaded.revision) return json({error: 'The project changed. Draft again before reviewing.'}, 409);
      const preview = draftPreview(loaded.p, bundle, loaded.revision);
      if (preview.stamp !== raw.stamp) return json({error: 'Open the current preview before reviewing its pages.'}, 409);
      const chapter = bundle.chapters.find(c => String(c.chapter) === String(raw.chapter)), offset = Number(raw.offset);
      if (!chapter || !Number.isSafeInteger(offset) || offset < 0 || offset % REVIEW_PAGE || offset >= chapter.records.length) return json({error: 'Open a valid proposal page.'}, 400);
      const key = pageKey(chapter.chapter, offset), previous = reviewSummary(job, bundle, preview.stamp, actor);
      if (previous.pages.includes(key)) return json({review: previous, reviewed: true});
      const pages = [...previous.pages, key], {id: _i, kind: _k, status: _s, revision: _r, leaseUntil: _l, createdAt: _c, updatedAt: _u, ...doc} = job;
      doc.review = {stamp: preview.stamp, actor, pages};
      const changed = await env.DB.prepare("UPDATE project_jobs SET document=?,revision=revision+1,updated_at=? WHERE owner_id=? AND project_id=? AND id=? AND revision=? AND status='completed'").bind(JSON.stringify(doc), new Date().toISOString(), owner, project, job.id, job.revision).run();
      if (!changed.meta?.changes) return json({error: 'Another review update arrived. Reload the page and try again.'}, 409);
      return json({review: {done: pages.length, total: pageTotal(bundle), pages}, reviewed: true});
    }
    if (action === 'cancel') {
      const job = await jobById(env, owner, project, raw.id || '');
      if (!job || !DRAFT_KINDS.has(job.kind)) return json({error: 'Choose a drafting job of this project.'}, 404);
      const r = await env.DB.prepare("UPDATE project_jobs SET status='cancelled',revision=revision+1,lease_until=NULL,updated_at=? WHERE owner_id=? AND project_id=? AND id=? AND status IN ('queued','running')").bind(new Date().toISOString(), owner, project, job.id).run();
      return json({job: view(await jobById(env, owner, project, job.id)), cancelled: !!r.meta?.changes});
    }
    if (!['start', 'apply', 'assist'].includes(action)) return json({error: 'Unknown drafting action.'}, 400);
    // The receipt: the request's own id, or its Idempotency-Key; a retry with it returns the job it started.
    const key = request.headers.get('Idempotency-Key');
    if (key && !ID.test(key)) return json({error: 'The request key is not valid. Start again from the workbench.'}, 400);
    const id = typeof raw.requestId === 'string' && ID.test(raw.requestId) ? raw.requestId : key;
    if (!id) return json({error: 'Start the draft from the workbench.'}, 400);
    const kind = action === 'apply' ? 'draft-apply' : 'draft';
    const loaded = await loadProject(env, owner, project);
    if (!loaded) return json({error: 'This project is unavailable.'}, 404);
    if (loaded.p.workspace?.status === 'archived') return json({error: 'Restore this project before drafting.'}, 409);
    let input;
    if (action === 'assist') {
      // Sol words one chapter of a completed draft, group by group (DRF-18): only with a model configured and allowed.
      const source = await jobById(env, owner, project, typeof raw.id === 'string' ? raw.id : '');
      if (!source || source.kind !== 'draft' || source.status !== 'completed') return json({error: 'Choose a completed draft of this project.'}, 404);
      if (source.applied) return json({error: 'This draft was applied already. Draft again before asking Sol to word it.'}, 409);
      const chapter = DRAFT_CHAPTERS.find(c => String(c) === String(raw.chapter));
      if (chapter === undefined) return json({error: 'Choose a chapter of the draft for Sol to word.'}, 400);
      const status = intelligenceStatus(env, 'journey');
      if (!status.configured) return json({error: 'LLM connection is not configured. The deterministic wording of the draft stands.', configuration: status}, 503);
      if (loaded.p.workspace?.aiPolicy?.enabled === false) return json({error: 'The project owner has disabled external AI processing.'}, 403);
      input = {kind, assist: {from: source.id, chapter: String(chapter)}};
    } else if (kind === 'draft') {
      if (!draftsByGroup(loaded.p)) return json({error: 'This project is drafted chapter by chapter from its brief: use the journey draft.', code: 'journey'}, 409);
      if (raw.mode != null && !['model', 'rules'].includes(raw.mode)) return json({error: 'Choose model or rules drafting.'}, 400);
      const mode = raw.mode || 'rules';
      if (mode === 'model') {
        const status = intelligenceStatus(env, 'architecture');
        if (!status.configured) return json({error: 'An architecture model connection is not configured. Use the rules draft or configure the architecture route.', configuration: status}, 503);
        if (loaded.p.workspace?.aiPolicy?.enabled === false) return json({error: 'The project owner has disabled external AI processing.'}, 403);
        if (Array.isArray(raw.chapters) && raw.chapters.length) return json({error: 'The model drafts the whole architecture; choose the rules draft for selected chapters.'}, 400);
      }
      const chapters = Array.isArray(raw.chapters) && raw.chapters.length ? DRAFT_CHAPTERS.filter(c => raw.chapters.map(String).includes(String(c))) : DRAFT_CHAPTERS;
      input = {kind, mode, chapters};
    } else {
      const draft = await jobById(env, owner, project, typeof raw.id === 'string' ? raw.id : '');
      if (!draft || draft.kind !== 'draft') return json({error: 'Choose a completed draft of this project.'}, 404);
      // Why the person applies it (GR-GOV-08): kept on the journal events and the activity row.
      input = {kind, draftId: draft.id, stamp: String(raw.stamp || ''), projectRevision: Number(raw.revision), ...(typeof raw.reason === 'string' && raw.reason.trim() ? {reason: raw.reason.trim().slice(0, 600)} : {})};
    }
    const hash = digest(input), existing = await jobById(env, owner, project, id);
    if (existing) {
      if (existing.inputHash !== hash) return json({error: 'This receipt already belongs to other work. Start again from the workbench.'}, 409);
      // A retry: the same job. One that stopped with the server (its lease ran out) is run again from its start.
      const seen = view(existing);
      if (seen.status === 'interrupted' || existing.status === 'queued') background(ctx, () => RUNNERS[existing.kind](env, identity, project, existing.id), env);
      return json({id: existing.id, receipt: existing.id, status: seen.status, replayed: true}, 200);
    }
    // One draft at a time: a draft (or an apply) running in this project is the one a second start attaches to.
    const busy = (await env.DB.prepare("SELECT * FROM project_jobs WHERE owner_id=? AND project_id=? AND kind=? AND status IN ('queued','running')").bind(owner, project, kind).all()).results.map(rowOf).map(view).find(j => j.status !== 'interrupted');
    if (busy) return json({error: kind === 'draft' ? 'A draft of this project is running already; its progress is shown.' : 'A draft is being applied to this project already.', id: busy.id, receipt: busy.id, status: busy.status, running: true}, 409);
    if (kind === 'draft-apply') {
      if (raw.reviewed !== true) return json({error: 'Review the draft\'s preview, then say that you did.'}, 400);
      // Round 12 (GR-GOV-12): the review of the preview is a person's; an agent or service account never claims one.
      if (identity.account === 'agent') return json({error: 'An agent or service account does not review a draft\'s preview. A person signs in to apply it.', code: 'authorship'}, 403);
      const draft = await jobById(env, owner, project, input.draftId), bundle = await readBundle(env, owner, project, draft);
      if (draft.basis?.revision !== loaded.revision || input.projectRevision !== loaded.revision) return json({error: 'The project changed after this draft was made. Draft again, then preview and apply.', conflict: true}, 409);
      const preview = draftPreview(loaded.p, bundle, loaded.revision);
      if (preview.stamp !== input.stamp) return json({error: 'Review the current preview of the draft before you apply it.', conflict: true}, 409);
      const review = reviewSummary(draft, bundle, preview.stamp, actor);
      if (review.done !== review.total) return json({error: `Review every proposal page before applying (${review.done} of ${review.total} marked).`}, 409);
      const over = capsOf(loaded.p, bundle).filter(c => c.headroom < 0);
      if (over.length) return json({error: 'The draft would pass a cap: ' + over.map(c => c.label).join(', ') + '. Nothing is applied.'}, 409);
      if (draft.applied) return json({error: 'This draft was applied already (' + draft.applied.id + ').', id: draft.applied.id}, 409);
    }
    const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM project_jobs WHERE owner_id=? AND project_id=? AND created_at>?').bind(owner, project, new Date(Date.now() - 3600000).toISOString()).first();
    if (count.count >= HOURLY_JOBS) return json({error: 'Thirty jobs have been started in this project this hour. Open the ones there are before starting more.'}, 429);
    const at = new Date().toISOString(), doc = {...input, actor, inputHash: hash, progress: {phase: 'queued'}};
    await env.DB.prepare("INSERT INTO project_jobs(owner_id,project_id,id,kind,status,input_hash,document,revision,created_at,updated_at) VALUES(?,?,?,?,'queued',?,?,1,?,?)").bind(owner, project, id, kind, hash, JSON.stringify(doc), at, at).run();
    background(ctx, () => RUNNERS[kind](env, identity, project, id), env);
    return json({id, receipt: id, status: 'queued', ...(kind === 'draft' ? {reason: groupedDraftReason(loaded.p)} : {})}, 202);
  } catch (e) { return errorResponse(e, 400, {route: url.pathname, owner, project}); }
}
