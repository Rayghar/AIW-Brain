// A baseline frozen the way the workbench freezes it, for the suites (round 12, GR-STO-02): as a job through
// /api/baselines (baseline-service.js), its receipt read until the job ends, then the project read again. The suites call
// the Worker in process; a job runs after the answer on the event loop, so the receipt is read until it says completed.
//   request(path, body): the suite's own request — a POST with a JSON body, or a GET without one — answering a Response.
//   freezeBaseline(request, {title, stamp, reviewed = true, project = null})
//     → {state: {document, revision, updatedAt}, baseline: the baseline whole as frozen (every part read and checked),
//        job: the job as it ended}
// A freeze the job refuses or fails answers {error, status, job} instead of throwing, so a suite can assert on it.
let n = 0;
export async function freezeBaseline(request, {title, stamp, reviewed = true, project = null, requestId = null} = {}) {
  const q = project ? (project === 'bank-payment' ? '' : '&project=' + encodeURIComponent(project)) : '', id = requestId || 'suite-freeze-' + Date.now().toString(36) + '-' + (++n).toString(36).padStart(4, '0');
  const read = async response => { const text = await response.text(); try { return {status: response.status, data: JSON.parse(text)}; } catch { return {status: response.status, data: {raw: text}}; } };
  const started = await read(await request('/api/baselines?action=freeze' + q, {requestId: id, title, stamp, reviewed}));
  if (started.status !== 202) return {error: started.data?.error || 'The freeze was refused.', status: started.status, data: started.data};
  let job = null;
  for (let tries = 0; tries < 6000; tries++) {
    const s = await read(await request('/api/baselines?action=status&id=' + encodeURIComponent(started.data.id) + q));
    job = s.data?.job;
    if (job && !['queued', 'running'].includes(job.status)) break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  if (job?.status !== 'completed') return {error: job?.error || 'The freeze did not complete (' + (job?.status || 'unknown') + ').', status: 422, job};
  const loaded = await read(await request('/api/project' + (q ? '?' + q.slice(1) : '')));
  const whole = await read(await request('/api/baselines?action=open&part=whole&id=' + encodeURIComponent(job.result.baselineId) + q));
  return {state: loaded.data, baseline: whole.data, job};
}
