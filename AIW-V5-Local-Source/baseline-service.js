// Frozen baselines as a job, and their parts read only when a baseline is opened (round 12, A3: GR-STO-02, GR-PERF-13;
// D-11). Freezing a baseline reads the whole design and builds its frozen SDD: at the size of a drafted design that took
// minutes on the request (526 s, measured on the round branch 2026-10-08) and left every later read carrying the
// baseline whole (86 M characters). The freeze now runs as a job with a receipt and its progress part by part, and the
// baseline's parts are kept outside the working document, named by their SHA-256 (project-storage.js):
//
//   POST ?action=freeze {requestId, title, reviewed: true, stamp}  → 202 {id, receipt, status}; the same requestId (or
//                              Idempotency-Key) again → the same job, never a second freeze
//   GET  ?action=status&id=    the job: status, progress (the parts built of FREEZE_STEPS), its result or error
//   GET  ?action=latest        the newest freeze job of the project (a page reloaded finds its receipt here)
//   POST ?action=cancel {id}   a queued or running freeze stops between parts; nothing is saved
//   GET  ?action=open&id=BL-nnn&part=source|review|journal|findings|model|markdown
//                              one part of a frozen baseline, read and checked against its SHA-256 (its ETag)
//   GET  ?action=verify&id=BL-nnn   every part read and checked: the baseline's SHA-256 and each part's
//
// The job checks what review.baseline checks, when it is asked for and again when it saves: current checks of the design
// stamp the person reviewed, a title, the acknowledgement. It freezes through the review domain's own freeze
// (review-domain.js freezeSteps, recordBaseline), with the change journal read back whole for the baseline while the
// working journal stays compact, and saves once. One freeze at a time per project. The job runs after the answer: on the
// local server in its export thread (export-thread.js), else on the host's waitUntil, never on the request. A server that
// stops during a freeze leaves the job interrupted (its lease runs out) and a retried start runs it again. Nothing here
// approves anything: a baseline is a frozen record of the design and its review state.
import {readStoredProject, saveStoredProject, readBaselineParts, openBaseline, BASELINE_PARTS} from './project-storage.js';
import {hydrateJournal} from './journal-archive.js';
import {withFinalReview, freezeSteps, recordBaseline, FREEZE_STEPS, finalChecksCurrent, reviewDesignStamp} from './public/review-domain.js';
import {refreshRepositoryAssurance} from './repository-sync.js';
import {refreshOrganizationAssurance} from './organization-service.js';
import {activityStatement} from './object-service.js';
import {operationStatement} from './operation-service.js';
import {digest} from './public/brain-integrity.js';
import {errorResponse, isInternalError} from './error-message.js';
import {json} from './http.js';

export const BASELINE_JOB = 'baseline';
const LEASE_MS = 120000, HOURLY_JOBS = 30, ID = /^[A-Za-z0-9_-]{16,100}$/, SAVE_ATTEMPTS = 3;
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const leaseNow = () => new Date(Date.now() + LEASE_MS).toISOString();
const rowOf = r => r ? {...JSON.parse(r.document), id: r.id, kind: r.kind, status: r.status, revision: r.revision, leaseUntil: r.lease_until, createdAt: r.created_at, updatedAt: r.updated_at} : null;
const jobById = async (env, owner, project, id) => rowOf(await env.DB.prepare('SELECT * FROM project_jobs WHERE owner_id=? AND project_id=? AND id=?').bind(owner, project, id).first());
// What a reader is told about a job: its state (a running job whose lease ran out was interrupted), progress and result.
export function freezeView(job) {
  if (!job) return null;
  const interrupted = job.status === 'running' && job.leaseUntil && Date.parse(job.leaseUntil) < Date.now();
  return {...job, status: interrupted ? 'interrupted' : job.status, receipt: job.id};
}
async function update(env, owner, project, id, doc, status, lease = null) {
  const {id: _i, kind: _k, status: _s, revision: _r, leaseUntil: _l, createdAt: _c, updatedAt: _u, ...body} = doc;
  return env.DB.prepare("UPDATE project_jobs SET document=?,status=?,revision=revision+1,lease_until=?,updated_at=? WHERE owner_id=? AND project_id=? AND id=? AND status IN ('queued','running')").bind(JSON.stringify(body), status, lease, new Date().toISOString(), owner, project, id).run();
}
const cancelled = async (env, owner, project, id) => (await env.DB.prepare('SELECT status FROM project_jobs WHERE owner_id=? AND project_id=? AND id=?').bind(owner, project, id).first())?.status === 'cancelled';
async function lease(env, owner, project, job) {
  const at = new Date().toISOString();
  const r = await env.DB.prepare("UPDATE project_jobs SET status='running',revision=revision+1,lease_until=?,updated_at=? WHERE owner_id=? AND project_id=? AND id=? AND revision=? AND (status='queued' OR (status='running' AND lease_until<?))").bind(leaseNow(), at, owner, project, job.id, job.revision, at).run();
  return !!r.meta?.changes;
}
// The project as a command reads it: completed, its organisation and repository assurance refreshed.
async function loadProject(env, owner, project) {
  const row = await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner, project).first();
  if (!row) return null;
  const stored = await readStoredProject(env, owner, row.document);
  return {p: await refreshRepositoryAssurance(env, owner, await refreshOrganizationAssurance(env, owner, withFinalReview(stored.document))), revision: row.revision, keys: stored.keys};
}
// What the freeze is asked to capture, as review.baseline takes it.
const freezeInput = job => ({title: job.title, reviewed: true, stamp: job.stamp});

// The freeze job: the baseline built part by part, each reported as it is built; then recorded and saved once.
export async function runFreeze(env, identity, project, id) {
  const {owner, actor} = identity, job = await jobById(env, owner, project, id);
  if (!job || job.kind !== BASELINE_JOB || !(await lease(env, owner, project, job))) return;
  const started = Date.now(), doc = {...job, progress: {phase: 'reading', parts: [], steps: FREEZE_STEPS.length}};
  delete doc.error;
  try {
    let loaded = await loadProject(env, owner, project);
    if (!loaded) throw Error('This project is unavailable.');
    if (loaded.p.workspace?.status === 'archived') throw Error('Restore this project before changing its design.');
    // The baseline keeps the change journal whole: its archived changes read back for it (journal-archive.js), while
    // the document saved keeps the journal compact as stored.
    const whole = await hydrateJournal(env, loaded.keys.get('__change_journal')?.archive || [], loaded.p);
    const at = new Date().toISOString(), steps = freezeSteps(whole, freezeInput(job), at, actor);
    doc.progress = {phase: 'building', parts: [], steps: FREEZE_STEPS.length, next: FREEZE_STEPS[0][0]};
    await update(env, owner, project, id, doc, 'running', leaseNow());
    let baseline, mark = Date.now();
    for (;;) {
      const x = steps.next();
      if (x.done) { baseline = x.value; break; }
      const k = FREEZE_STEPS.findIndex(([name]) => name === x.value);
      doc.progress.parts.push({part: x.value, title: FREEZE_STEPS[k][1], ms: Date.now() - mark}); mark = Date.now();
      doc.progress.next = FREEZE_STEPS[k + 1]?.[0] || null;
      await update(env, owner, project, id, doc, 'running', leaseNow());
      if (await cancelled(env, owner, project, id)) return;
      await tick();
    }
    doc.progress.phase = 'saving'; doc.progress.next = null;
    await update(env, owner, project, id, doc, 'running', leaseNow());
    if (await cancelled(env, owner, project, id)) return;
    // Saved once. A save another request made meanwhile is read again: the baseline is recorded on it while the design is
    // still the one frozen (recordBaseline refuses otherwise), and nothing is built twice.
    let saved = null, entry = null;
    for (let attempt = 0; attempt < SAVE_ATTEMPTS && !saved; attempt++) {
      if (attempt) { loaded = await loadProject(env, owner, project); if (!loaded) throw Error('This project is unavailable.'); }
      const p = loaded.p;
      recordBaseline(p, baseline);
      const result = await saveStoredProject(env, owner, project, p, loaded.revision, at, loaded.keys, stamp => [activityStatement(env, identity, project, {at, kind: 'model', title: 'review.baseline', summary: String(job.title).slice(0, 160), objectId: baseline.id, revision: loaded.revision + 1, jobId: id}, stamp)]);
      if (result.meta?.changes) { saved = loaded.revision + 1; entry = p.finalReview.baselines.find(b => b.id === baseline.id); }
    }
    if (!saved) throw Error('The project kept changing while the baseline was saved. Nothing was saved: freeze it again.');
    doc.progress.phase = 'frozen';
    doc.elapsedMs = Date.now() - started;
    doc.result = {baselineId: baseline.id, savedRevision: saved, sha256: entry?.frozen?.sha256 || null, parts: entry?.frozen ? Object.fromEntries(Object.entries(entry.frozen.parts).map(([k, v]) => [k, {sha256: v.sha256, chars: v.chars}])) : null};
    await update(env, owner, project, id, doc, 'completed');
    await operationStatement(env, owner, project, 'job', {id, kind: BASELINE_JOB, status: 'completed', baselineId: baseline.id, elapsedMs: doc.elapsedMs, actor}).run();
  } catch (e) {
    doc.error = String(e?.message || e).slice(0, 700);
    if (isInternalError(e)) console.error(JSON.stringify({at: new Date().toISOString(), event: 'freeze-fault', owner, project, id, message: doc.error, stack: typeof e?.stack === 'string' ? e.stack.split('\n').slice(0, 6).join(' | ') : null}));
    await update(env, owner, project, id, doc, 'failed');
  }
}

// A job runs after the answer: in the local server's export thread when it offers one (env.JOB_THREAD), else on the
// host's waitUntil, else detached. Never awaited on the request.
function background(ctx, env, identity, project, id) {
  if (env?.JOB_THREAD?.run) { env.JOB_THREAD.run({kind: BASELINE_JOB, identity: {owner: identity.owner, actor: identity.actor, role: identity.role}, project, id}); return; }
  const run = Promise.resolve().then(() => runFreeze(env, identity, project, id)).catch(() => {}), host = ctx?.waitUntil ? ctx : env?.AIW_BACKGROUND;
  if (host?.waitUntil) host.waitUntil(run);
}

// A part of a frozen baseline as JSON, with its SHA-256 as its ETag (a part never changes).
async function openPart(request, env, owner, project, entry, part) {
  const tag = entry.frozen ? '"' + (part === 'journal' ? entry.frozen.parts.journal?.sha256 : entry.frozen.parts[part]?.sha256) + '"' : null;
  const headers = {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-cache', 'X-Content-Type-Options': 'nosniff', ...(tag ? {ETag: tag} : {})};
  if (tag && request.headers.get('If-None-Match') === tag) return new Response(null, {status: 304, headers});
  let value;
  if (entry.frozen) value = (await readBaselineParts(env, owner, project, entry, [part]))[part];
  else value = part === 'journal' ? entry.review?.changes : part === 'review' ? (({changes: _c, ...rest}) => rest)(entry.review || {}) : entry[part];
  if (value === undefined) return json({error: 'This baseline keeps no ' + part + '.'}, 404);
  return new Response(JSON.stringify(value), {headers});
}

export async function handleBaselines(request, env, identity, project, ctx) {
  const {owner, actor, role} = identity, url = new URL(request.url), action = url.searchParams.get('action') || 'latest';
  if (!['GET', 'POST'].includes(request.method)) return json({error: 'Unsupported baseline action.'}, 405);
  if (request.method === 'POST' && request.headers.get('Origin') !== url.origin) return json({error: 'Freeze baselines from your private workbench.'}, 403);
  try {
    if (request.method === 'GET') {
      if (action === 'latest') {
        const row = await env.DB.prepare("SELECT * FROM project_jobs WHERE owner_id=? AND project_id=? AND kind=? ORDER BY created_at DESC LIMIT 1").bind(owner, project, BASELINE_JOB).first();
        return json({job: freezeView(rowOf(row))});
      }
      if (action === 'status') {
        const job = await jobById(env, owner, project, url.searchParams.get('id') || '');
        if (!job || job.kind !== BASELINE_JOB) return json({error: 'Choose a freeze of this project.'}, 404);
        return json({job: freezeView(job)});
      }
      if (!['open', 'verify'].includes(action)) return json({error: 'Unknown baseline action.'}, 400);
      const row = await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner, project).first();
      if (!row) return json({error: 'This project is unavailable.'}, 404);
      const stored = await readStoredProject(env, owner, row.document), entry = (stored.document.finalReview?.baselines || []).find(b => b.id === url.searchParams.get('id'));
      if (!entry) return json({error: 'Choose a frozen baseline of this project.'}, 404);
      if (action === 'open') {
        const part = url.searchParams.get('part') || 'source';
        // The whole baseline, as it was frozen (a model package carries it whole: model-exchange.js).
        if (part === 'whole') { const tag = entry.frozen ? '"' + entry.frozen.sha256 + '"' : null; if (tag && request.headers.get('If-None-Match') === tag) return new Response(null, {status: 304, headers: {ETag: tag, 'Cache-Control': 'private, no-cache'}}); return new Response(JSON.stringify(await openBaseline(env, owner, project, entry)), {headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-cache', 'X-Content-Type-Options': 'nosniff', ...(tag ? {ETag: tag} : {})}}); }
        if (!BASELINE_PARTS.includes(part)) return json({error: 'Choose a part of the baseline: ' + BASELINE_PARTS.join(', ') + ', or whole.'}, 400);
        return await openPart(request, env, owner, project, entry, part);
      }
      // Every part read and checked against its SHA-256 (openBaseline), and what the check covered.
      const whole = await openBaseline(env, owner, project, entry);
      return json({id: entry.id, title: entry.title, verified: true, sha256: entry.frozen?.sha256 || null, digest: digest(whole), parts: entry.frozen ? Object.fromEntries(Object.entries(entry.frozen.parts).map(([k, v]) => [k, {sha256: v.sha256, chars: v.chars}])) : null, stored: entry.frozen ? 'parts' : 'whole'});
    }
    if (!['owner', 'editor'].includes(role)) return json({error: 'A project editor freezes baselines.', code: 'role'}, 403);
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({error: 'Expected a baseline request.'}, 415);
    const body = await request.text();
    if (body.length > 8000) return json({error: 'A baseline request is short.'}, 413);
    let raw;
    try { raw = JSON.parse(body); } catch { return json({error: 'The baseline request could not be read.'}, 400); }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return json({error: 'The baseline request is incomplete.'}, 400);
    if (action === 'cancel') {
      const job = await jobById(env, owner, project, raw.id || '');
      if (!job || job.kind !== BASELINE_JOB) return json({error: 'Choose a freeze of this project.'}, 404);
      const r = await env.DB.prepare("UPDATE project_jobs SET status='cancelled',revision=revision+1,lease_until=NULL,updated_at=? WHERE owner_id=? AND project_id=? AND id=? AND status IN ('queued','running')").bind(new Date().toISOString(), owner, project, job.id).run();
      return json({job: freezeView(await jobById(env, owner, project, job.id)), cancelled: !!r.meta?.changes});
    }
    if (action !== 'freeze') return json({error: 'Unknown baseline action.'}, 400);
    // The receipt: the request's own id, or its Idempotency-Key; a retry with it returns the job it started.
    const key = request.headers.get('Idempotency-Key');
    if (key && !ID.test(key)) return json({error: 'The request key is not valid. Freeze again from the workbench.'}, 400);
    const id = typeof raw.requestId === 'string' && ID.test(raw.requestId) ? raw.requestId : key;
    if (!id) return json({error: 'Freeze the baseline from the workbench.'}, 400);
    const input = {kind: BASELINE_JOB, title: typeof raw.title === 'string' ? raw.title.trim().slice(0, 180) : '', stamp: String(raw.stamp || ''), reviewed: raw.reviewed === true};
    const hash = digest(input), existing = await jobById(env, owner, project, id);
    if (existing) {
      if (existing.kind !== BASELINE_JOB || existing.inputHash !== hash) return json({error: 'This receipt already belongs to other work. Freeze again from the workbench.'}, 409);
      const seen = freezeView(existing);
      if (seen.status === 'interrupted' || existing.status === 'queued') background(ctx, env, identity, project, existing.id);
      return json({id: existing.id, receipt: existing.id, status: seen.status, replayed: true}, 200);
    }
    // What review.baseline checks, at once, so a request that cannot be frozen is told so before any job starts.
    const loaded = await loadProject(env, owner, project);
    if (!loaded) return json({error: 'This project is unavailable.'}, 404);
    if (loaded.p.workspace?.status === 'archived') return json({error: 'Restore this project before changing its design.', code: 'archived'}, 409);
    if (!finalChecksCurrent(loaded.p) || input.stamp !== reviewDesignStamp(loaded.p)) return json({error: 'Run current checks before freezing this baseline.'}, 400);
    if (!input.title || !input.reviewed) return json({error: 'Name the baseline and acknowledge its open findings.'}, 400);
    const busy = (await env.DB.prepare("SELECT * FROM project_jobs WHERE owner_id=? AND project_id=? AND kind=? AND status IN ('queued','running')").bind(owner, project, BASELINE_JOB).all()).results.map(rowOf).map(freezeView).find(j => j.status !== 'interrupted');
    if (busy) return json({error: 'A baseline of this project is being frozen already; its progress is shown.', id: busy.id, receipt: busy.id, status: busy.status, running: true}, 409);
    const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM project_jobs WHERE owner_id=? AND project_id=? AND created_at>?').bind(owner, project, new Date(Date.now() - 3600000).toISOString()).first();
    if (count.count >= HOURLY_JOBS) return json({error: 'Thirty jobs have been started in this project this hour. Open the ones there are before starting more.'}, 429);
    const at = new Date().toISOString(), doc = {...input, actor, inputHash: hash, basis: {revision: loaded.revision}, progress: {phase: 'queued', parts: [], steps: FREEZE_STEPS.length}};
    await env.DB.prepare("INSERT INTO project_jobs(owner_id,project_id,id,kind,status,input_hash,document,revision,created_at,updated_at) VALUES(?,?,?,?,'queued',?,?,1,?,?)").bind(owner, project, id, BASELINE_JOB, hash, JSON.stringify(doc), at, at).run();
    background(ctx, env, identity, project, id);
    return json({id, receipt: id, status: 'queued', steps: FREEZE_STEPS.map(([part, title]) => ({part, title}))}, 202);
  } catch (e) { return errorResponse(e, 400, {route: url.pathname, owner, project}); }
}
