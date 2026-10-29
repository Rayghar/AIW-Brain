// Exports off the local server's main loop (round 12, D-11). Building the SDD of a large design takes seconds (the
// SEABaaS-size design's full edition draws twenty figures), and the local server answers every request on one thread:
// while an export was built, nothing else was answered (a health check waited 107 s). server.js hands every
// GET /api/export to this thread, which runs the same Worker route with its own connection to the same database (SQLite
// in write-ahead mode lets it read while the main thread writes) and the same object directory, and keeps the builds per
// project revision (export-cache.js). The answer is the Worker's own, byte for byte; only where it is computed changes.
//
// Built off the request path, too: when a project changes, the thread builds again, a few seconds after the last
// change, the SDD exports that were asked for that project (Markdown and HTML; a JSON export reads the same build), so
// the next export of the new revision finds its build ready. Nothing is built for a project nobody exported.
//
// Project reads off the main loop too (round 12, PS-14): reading a whole project takes about a second at the size of a
// drafted design, and fifteen the one time a project stored before round 12 is read and its upgrade stored
// (storage-upgrade.js). server.js hands GET /api/project and GET /api/changes to a second thread of the same kind
// (readService), so health checks, the project list and saves are answered meanwhile. Each thread's heap is bounded
// (THREAD_HEAP_MB): a request that would hold more fails alone, and the thread starts again for the next.
//
// Jobs in the export thread too (round 12, A3: GR-STO-02): a baseline's freeze builds the frozen SDD and every part of the
// baseline, minutes of work at the size of a drafted design before round 12. server.js gives the Worker env a JOB_THREAD
// binding (job(spec)), and baseline-service.js hands each freeze to it: the job runs here in its turn among the builds,
// the route answers at once with its receipt, and the builds of the project are made again once the freeze is saved.
import {Worker, isMainThread, parentPort, workerData} from 'node:worker_threads';

export const PREBUILD_AFTER_MS = 3000, THREAD_HEAP_MB = 4096;
export const exportService = options => routeService({...options, kind: 'exports'});
export const readService = options => routeService({...options, kind: 'reads'});
// The main thread's side: one thread, started with the server and again after it ends; requests queue in order.
function routeService({databaseFile, filesDirectory, env, prebuildAfterMs = PREBUILD_AFTER_MS, kind}) {
  let thread = null, next = 0;
  const waiting = new Map();
  const fail = error => { for (const {reject} of waiting.values()) reject(error); waiting.clear(); };
  const start = () => {
    const t = new Worker(new URL(import.meta.url), {workerData: {aiwRouteThread: kind, databaseFile, filesDirectory, env, prebuildAfterMs}, resourceLimits: {maxOldGenerationSizeMb: THREAD_HEAP_MB}});
    t.on('message', m => { const w = waiting.get(m.id); if (!w) return; waiting.delete(m.id); if (m.error) w.reject(Object.assign(Error(kind === 'exports' ? 'The export could not be built.' : 'The project could not be read.'), {cause: m.error})); else w.resolve(new Response(m.status === 204 || m.status === 304 ? null : m.body, {status: m.status, headers: m.headers})); });
    t.on('error', e => { if (thread === t) thread = null; fail(e); });
    t.on('exit', () => { if (thread === t) thread = null; fail(Error('The ' + kind + ' thread stopped.')); });
    t.unref();
    return t;
  };
  thread = start();
  return {
    fetch(request) {
      thread ||= start();
      const id = ++next;
      return new Promise((resolve, reject) => { waiting.set(id, {resolve, reject}); thread.postMessage({id, url: request.url, headers: [...request.headers]}); });
    },
    // A project was changed (a write answered 2xx): its exports are built again once it has been quiet for a moment.
    changed(projectId) { if (projectId && kind === 'exports') (thread ||= start()).postMessage({changed: projectId}); },
    // A job to run off the main loop (round 12, GR-STO-02: a baseline's freeze, baseline-service.js runFreeze): queued
    // in the export thread with its builds, never answered; its progress is read from its receipt.
    job(spec) { if (kind === 'exports' && spec?.kind) (thread ||= start()).postMessage({job: spec}); },
    async close() { const t = thread; thread = null; if (t) await t.terminate(); }
  };
}

// The thread's side.
if (!isMainThread && workerData?.aiwRouteThread) {
  const exportsThread = workerData.aiwRouteThread === 'exports';
  // node:sqlite announces itself as experimental; the main thread records that notice once (server.js).
  const emitWarning = process.emitWarning;
  process.emitWarning = function (warning, ...rest) {
    const type = typeof rest[0] === 'string' ? rest[0] : rest[0]?.type;
    if (type === 'ExperimentalWarning' && /SQLite is an experimental feature/.test(String(warning?.message ?? warning))) return;
    return emitWarning.call(process, warning, ...rest);
  };
  const [{default: worker}, {localDatabase}, {localFiles}, {exportCache}] = await Promise.all([import('./worker.js'), import('./local-db.js'), import('./local-files.js'), import('./export-cache.js')]);
  // The exports thread keeps the builds; the reads thread keeps nothing between requests.
  const env = {...workerData.env, DB: localDatabase(workerData.databaseFile), FILES: localFiles(workerData.filesDirectory), ASSETS: {fetch: async () => new Response('Not found', {status: 404})}, ...(exportsThread ? {EXPORT_CACHE: exportCache()} : {})};
  const run = (url, headers) => worker.fetch(new Request(url, {method: 'GET', headers}), env);
  // The SDD exports asked for, per project: the request (address and headers, so the same account reads it) to build
  // again when the project changes. JSON reads the build of its Markdown, so it is built through that.
  const asked = new Map(), timers = new Map(), ASKED = 8;
  const remember = (url, headers) => {
    const u = new URL(url), id = u.searchParams.get('project');
    if (!id || u.searchParams.get('chapter') !== '11' || u.searchParams.has('document') || u.searchParams.has('baseline')) return;
    if (u.searchParams.get('format') === 'json') u.searchParams.set('format', 'md');
    u.searchParams.delete('view');
    const list = asked.get(id) || new Map(); list.delete(u.href); list.set(u.href, headers);
    while (list.size > ASKED) list.delete(list.keys().next().value);
    asked.set(id, list);
  };
  // One request at a time, in the order they came: a build holds the thread until it is done.
  let queue = Promise.resolve();
  const enqueue = job => (queue = queue.then(job, job));
  // A changed project: its asked-for exports built again once it has been quiet for a moment.
  const changed = projectId => {
    clearTimeout(timers.get(projectId));
    timers.set(projectId, setTimeout(() => {
      timers.delete(projectId);
      const urls = [...(asked.get(projectId) || [])];
      if (!urls.length) return;
      enqueue(async () => {
        const started = Date.now();let built = 0;
        for (const [url, headers] of urls) { try { const r = await run(url, headers); await r.arrayBuffer(); if (r.ok) built++; } catch { /* a build that fails here fails again, and is answered, when it is asked for */ } }
        console.log(JSON.stringify({at: new Date().toISOString(), event: 'exports-prebuilt', project: projectId, exports: urls.length, built, ms: Date.now() - started}));
      });
    }, workerData.prebuildAfterMs).unref());
  };
  parentPort.on('message', m => {
    if (m.changed) { changed(m.changed); return; }
    // A baseline's freeze (baseline-service.js runFreeze), run here in its turn; the project it saves is a changed one.
    if (m.job) {
      if (!exportsThread || m.job.kind !== 'baseline') return;
      enqueue(async () => {
        try { const {runFreeze} = await import('./baseline-service.js'); await runFreeze(env, m.job.identity, m.job.project, m.job.id); } catch (e) { console.error(JSON.stringify({at: new Date().toISOString(), event: 'job-error', kind: m.job.kind, project: m.job.project, message: String(e?.message || e)})); }
        changed(m.job.project);
      });
      return;
    }
    enqueue(async () => {
      try {
        const response = await run(m.url, m.headers);
        const body = new Uint8Array(await response.arrayBuffer());
        if (response.ok && exportsThread) remember(m.url, m.headers);
        parentPort.postMessage({id: m.id, status: response.status, headers: [...response.headers], body}, [body.buffer]);
      } catch (e) {
        parentPort.postMessage({id: m.id, error: String(e?.stack || e?.message || e)});
      }
    });
  });
}
