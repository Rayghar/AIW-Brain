// Exports built per revision, off the local server's main loop (round 12, D-11; export-cache.js, export-thread.js).
// The same route answers the same bytes whichever way it is built:
//   1. in process, with the export thread's environment (the builds kept per revision) and without it: every SDD
//      edition and format of the reference project, the Markdown and HTML byte for byte, the JSON the same apart from
//      when it was exported; a kept build is reused for the same revision and built again for the next one, equal to a
//      fresh build;
//   2. through server.js, whose exports run in their own thread: the same bytes as the route in process, and after a
//      save the thread builds the asked-for exports again on its own (the log says so) so the next export is served
//      from that build.
// The size-and-speed suite (size-speed-validate.mjs) holds the timings and the main loop's responsiveness at size.
// Run: node export-build-validate.mjs
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import net from 'node:net';
import path from 'node:path';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {exportCache} from './export-cache.js';

const checks = [], pass = name => { checks.push(name); console.log('PASS', name); };
const dir = mkdtempSync(path.join(tmpdir(), 'aiw-export-build-')), owner = 'local-architect';
const DB = localDatabase(path.join(dir, 'project.sqlite')), FILES = localFiles(path.join(dir, 'baselines'));
const plain = {DB, FILES, ASSETS: {fetch: () => new Response('asset')}};
const kept = {...plain, EXPORT_CACHE: exportCache()};
const call = (env, route, body) => worker.fetch(new Request('https://aiw.test' + route, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': owner, ...(body ? {'Content-Type': 'application/json', Origin: 'https://aiw.test'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env);
const text = async r => { assert.equal(r.status, 200, await r.clone().text()); return r.text(); };
const EDITIONS = [];
for (const edition of ['full', 'executive']) for (const audience of ['all', 'delivery', 'review']) for (const format of ['md', 'html', 'json']) EDITIONS.push(`chapter=11&format=${format}&edition=${edition}&audience=${audience}`);
EDITIONS.push('chapter=11&format=md&edition=full&audience=all&figures=mermaid');
const withoutTime = body => JSON.stringify({...JSON.parse(body), exportedAt: null});
let server = null;
try {
  const created = await (await call(plain, '/api/projects', {name: 'Export build · QA only', template: 'bank-payment'})).json(), id = created.document.id;
  // 1. The same bytes with and without the kept builds; a kept build reused, and built again per revision.
  const compare = async label => {
    for (const q of EDITIONS) {
      const a = await text(await call(plain, '/api/export?project=' + id + '&' + q)), b = await text(await call(kept, '/api/export?project=' + id + '&' + q));
      if (q.includes('format=json')) assert.equal(withoutTime(b), withoutTime(a), label + ': ' + q); else assert.equal(b, a, label + ': ' + q);
    }
  };
  await compare('first revision');
  const first = kept.EXPORT_CACHE.state();
  assert(first.built >= 7 && first.reused > 0, JSON.stringify(first));
  await compare('first revision again');
  const again = kept.EXPORT_CACHE.state();
  assert.equal(again.built, first.built, 'nothing is built again for the same revision');
  assert(again.reused > first.reused);
  const read = await (await call(plain, '/api/project?project=' + id)).json();
  const saved = await call(plain, '/api/commands?project=' + id, {revision: read.revision, command: {type: 'artefact', payload: {type: 'assumption', title: 'Export build assumption', description: '', owner: '', source: 'Synthetic', confirmed: false}}});
  assert.equal(saved.status, 200, await saved.clone().text());
  await compare('next revision');
  assert(kept.EXPORT_CACHE.state().built > again.built, 'a new revision is built anew');
  pass(EDITIONS.length + ' SDD exports (every edition, audience and format, and Mermaid) answer the same bytes with the builds kept per revision as without them (the JSON apart from its export time); a revision is built once and its next one anew');

  // 2. Through server.js: exports in their own thread, the same bytes; after a save, the asked-for exports built again.
  const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
  let log = '';
  server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: path.join(dir, 'project.sqlite'), AIW_LOCAL_ACCOUNTS: '', OPENAI_API_KEY: '', ANTHROPIC_API_KEY: ''}, stdio: ['ignore', 'pipe', 'pipe']});
  server.stderr.on('data', d => { log += d; });
  await new Promise((resolve, reject) => { server.stdout.on('data', d => { log += d; if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c + ' ' + log))); });
  const base = 'http://127.0.0.1:' + port;
  for (const q of ['chapter=11&format=md&edition=full&audience=all', 'chapter=11&format=html&edition=executive&audience=review', 'chapter=11&format=md&edition=full&audience=all&figures=mermaid']) {
    const over = await fetch(base + '/api/export?project=' + id + '&' + q), body = await over.text();
    assert.equal(over.status, 200, body.slice(0, 300));
    assert.equal(body, await text(await call(plain, '/api/export?project=' + id + '&' + q)), 'over HTTP: ' + q);
  }
  const health = await fetch(base + '/api/health'); assert.equal(health.status, 200);
  const now = await (await fetch(base + '/api/project?project=' + id)).json();
  const save = await fetch(base + '/api/commands?project=' + id, {method: 'POST', headers: {'Content-Type': 'application/json', Origin: base}, body: JSON.stringify({revision: now.revision, command: {type: 'artefact', payload: {type: 'assumption', title: 'Export build assumption 2', description: '', owner: '', source: 'Synthetic', confirmed: false}}})});
  assert.equal(save.status, 200, await save.clone().text());
  const deadline = Date.now() + 60000;
  while (!/"event":"exports-prebuilt"/.test(log) && Date.now() < deadline) await new Promise(r => setTimeout(r, 200));
  const line = log.split('\n').find(l => l.includes('"exports-prebuilt"'));
  assert(line, 'the thread built the asked-for exports again after the save: ' + log.slice(-500));
  const prebuilt = JSON.parse(line);
  assert.equal(prebuilt.project, id); assert.equal(prebuilt.exports, 3); assert.equal(prebuilt.built, 3);
  const after = await fetch(base + '/api/export?project=' + id + '&chapter=11&format=md&edition=full&audience=all');
  assert.equal(await after.text(), await text(await call(plain, '/api/export?project=' + id + '&chapter=11&format=md&edition=full&audience=all')), 'the export after the save is the new revision\'s');
  pass('through server.js the exports are built in their own thread and answer the same bytes as the route in process; after a save the thread builds the 3 asked-for exports again by itself, and the next export is the new revision\'s');
} finally {
  server?.kill('SIGKILL');
  DB.close(); rmSync(dir, {recursive: true, force: true});
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 1));
