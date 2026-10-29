// The documents the round-10 line evidence measures (scripts/notation-lines-evidence.mjs), built exactly as the app
// builds them: an isolated server on a free port with its own SQLite file under .aiw-local/ (gitignored), the
// 'bank-payment' reference project and the five reference journeys created through POST /api/projects, the
// 300-responsibility recovery fixture restored through scripts/build-scale-fixture.mjs buildRecoveryFixture, each read
// back through GET /api/project, then the server stopped and its files removed. The 44-responsibility stress project
// (notation-fixtures.mjs stressProject) is built in memory. Nothing is invented: every document is the app's own.
//   node scripts/notation-lines-fixtures.mjs [--out <dir>]   writes <dir>/<key>.json and <dir>/index.json
//                                                             (default .aiw-local/notation-lines/documents)
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DOCUMENTS = path.join(REPO, '.aiw-local', 'notation-lines', 'documents');
const imp = rel => import(pathToFileURL(path.join(REPO, rel)).href);
export const sha256 = text => createHash('sha256').update(text).digest('hex');

const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.on('error', reject); s.listen(0, '127.0.0.1', () => { const {port} = s.address(); s.close(() => resolve(port)); }); });
// An isolated workbench: no provider key, its own database file, stopped (and its files removed) by stop().
export async function startServer({log = () => {}} = {}) {
  const port = await freePort(), db = path.join(REPO, '.aiw-local', 'notation-lines-' + port + '.sqlite');
  mkdirSync(path.dirname(db), {recursive: true});
  const child = spawn(process.execPath, ['server.js', '--port', String(port)], {cwd: REPO, env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: '', ANTHROPIC_API_KEY: ''}, stdio: ['ignore', 'pipe', 'pipe']});
  let stopped = false;
  const stop = async () => {
    if (stopped) return; stopped = true;
    if (child.exitCode === null) { const gone = new Promise(r => child.once('exit', r)); child.kill('SIGTERM'); const t = setTimeout(() => child.kill('SIGKILL'), 5000); await gone; clearTimeout(t); }
    for (const s of ['', '-wal', '-shm']) rmSync(db + s, {force: true});
  };
  process.once('exit', () => { if (child.exitCode === null) child.kill('SIGKILL'); for (const s of ['', '-wal', '-shm']) rmSync(db + s, {force: true}); });
  let err = '';
  child.stderr.on('data', d => { err = (err + d).slice(-2000); });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(Error('the server did not start in 30 s: ' + err)), 30000);
    child.stdout.on('data', d => { if (String(d).includes('ready')) { clearTimeout(t); resolve(); } });
    child.once('exit', c => { clearTimeout(t); reject(Error('the server exited with ' + c + ': ' + err)); });
  });
  log('server on ' + port);
  return {port, base: 'http://127.0.0.1:' + port, stop};
}

// Every document, read back from the server as the app stores it, in a fixed order: bank-payment, the five reference
// journeys in the order the Projects page offers them, scale-300; then stress-44 from memory.
export async function acquireDocuments(base, {log = () => {}} = {}) {
  const json = async (p, body) => { const r = await fetch(base + p, {method: body ? 'POST' : 'GET', headers: body ? {'Content-Type': 'application/json', Origin: base} : {Origin: base}, body: body ? JSON.stringify(body) : undefined}); const d = await r.json(); if (!r.ok) throw Error(p + ' → ' + (d.error || r.status)); return d; };
  const {REFERENCE_PROJECTS} = await imp('public/reference-projects.js');
  const {buildRecoveryFixture} = await imp('scripts/build-scale-fixture.mjs');
  const {stressProject} = await imp('notation-fixtures.mjs');
  const out = [];
  const keep = async (key, id, how) => { const {document} = await json('/api/project?project=' + encodeURIComponent(id), null); out.push({key, name: document.name, how, document}); log('kept ' + key); };
  const bank = await json('/api/projects', {name: 'Bank Payment Journey', template: 'bank-payment'});
  await keep('bank-payment', bank.document.id, "POST /api/projects {template:'bank-payment'}");
  for (const r of REFERENCE_PROJECTS) { const c = await json('/api/projects', {name: r.title, template: r.id}); await keep(r.id, c.document.id, `POST /api/projects {template:'${r.id}'}`); }
  const scale = await buildRecoveryFixture({base, count: 300});
  await keep('scale-300', scale.id, 'scripts/build-scale-fixture.mjs buildRecoveryFixture({count:300}) through POST /api/recovery');
  out.push({key: 'stress-44', name: 'notation-fixtures stressProject (44 extra responsibilities)', how: 'notation-fixtures.mjs stressProject()', document: stressProject()});
  return out;
}

export async function buildDocuments({log = () => {}} = {}) {
  const server = await startServer({log});
  try { return await acquireDocuments(server.base, {log}); } finally { await server.stop(); }
}
export function writeDocuments(dir, docs) {
  mkdirSync(dir, {recursive: true});
  const index = docs.map(d => { const text = JSON.stringify(d.document); writeFileSync(path.join(dir, d.key + '.json'), text); return {key: d.key, name: d.name, how: d.how, sha256: sha256(text)}; });
  writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  return index;
}
// Documents from a directory written by writeDocuments (or by the round-10 scratch harness, whose index has no hashes).
export function readDocuments(dir) {
  const index = JSON.parse(readFileSync(path.join(dir, 'index.json'), 'utf8'));
  const docs = index.map(x => { const text = readFileSync(path.join(dir, x.key + '.json'), 'utf8'); if (x.sha256 && x.sha256 !== sha256(text)) throw Error(x.key + '.json does not match its recorded SHA-256'); return {key: x.key, name: x.name, how: x.how, document: JSON.parse(text), sha256: sha256(text)}; });
  if (!docs.some(d => d.key === 'stress-44')) return imp('notation-fixtures.mjs').then(({stressProject}) => [...docs, {key: 'stress-44', name: 'notation-fixtures stressProject (44 extra responsibilities)', how: 'notation-fixtures.mjs stressProject()', document: stressProject(), sha256: sha256(JSON.stringify(stressProject()))}]);
  return docs;
}
// The documents to measure: those in `dir` when it holds a set and `refetch` is not asked, otherwise a fresh set from
// a new server, written to `dir`.
export async function loadDocuments({dir = DOCUMENTS, refetch = false, log = () => {}} = {}) {
  if (!refetch && existsSync(path.join(dir, 'index.json'))) return {docs: await readDocuments(dir), source: 'read from ' + path.relative(REPO, dir)};
  const docs = await buildDocuments({log});
  const index = writeDocuments(dir, docs);
  return {docs: docs.map((d, i) => ({...d, sha256: index[i].sha256})), source: 'built on a fresh server and written to ' + path.relative(REPO, dir)};
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--out'), dir = i > 0 ? path.resolve(process.argv[i + 1]) : DOCUMENTS;
  const docs = await buildDocuments({log: s => console.error(s)});
  console.log(JSON.stringify(writeDocuments(dir, docs), null, 2));
}
