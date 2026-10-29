// Histories at scale (round 12, A3: GR-STO-05). The workbench kept the history of every batch applied to the design, and
// each guided session the history of its steps, inside their section: every batch or guided step stored the whole
// history again (1.87 M characters of a drafted design's workbench) and every save answered it whole. Each history is now
// an append-only log beside the project (project-storage.js), and a save answers what changed (worker.js sectionDelta).
// On a synthetic copy of the reference project (no client text), in process through the Worker route:
//   1. 300 batches, each a reviewed workspace change of one record: each answer carries the one history entry the batch
//      added and not the workbench's history; each save writes one history object (the log's head, or the segment it
//      sealed) and never a sealed segment again, and the workbench is stored with its history marked, not held whole;
//   2. after them the history is segmented (sealed segments of 25 entries, each with its SHA-256) and reads back whole,
//      the same as the browser holds it after the answers; a segment altered in storage is refused (integrity);
//   3. the guided sessions' histories: a guided step appends to one session's history and writes the log's head alone,
//      and each session reads back its own history in order;
//   4. a project stored with its histories inside their sections is moved to logs by the one-time storage upgrade,
//      recorded in the activity, and the version it replaced reads back whole from its recovery point.
// Run: npm run test:scale-design
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {previewWorkingChange} from './public/workbench-domain.js';
import {mergeSaved} from './public/project-store.js';
import {settleDocument} from './public/document-memo.js';
import {readStoredProject, saveStoredProject, HISTORY_LOG, LOG_ENTRIES} from './project-storage.js';
import {readRecoveryPoint} from './storage-upgrade.js';

const BATCHES = 300, checks = [], began = Date.now();
const pass = name => { checks.push(name); console.log('PASS', name, '(' + Math.round((Date.now() - began) / 1000) + ' s)'); };
const dir = await mkdtemp(tmpdir() + '/aiw-scale-design-'), filesDir = path.join(dir, 'files'), files = localFiles(filesDir), written = [];
// The object store, with every write it is asked for listed.
const FILES = {...files, put: async (key, value, options) => { written.push(key); return files.put(key, value, options); }, get: key => files.get(key), delete: key => files.delete(key)};
const env = {DB: localDatabase(path.join(dir, 'project.sqlite')), FILES, ASSETS: {fetch: () => new Response('ok')}};
const owner = 'local-architect', origin = 'https://aiw.test';
const call = async (route, body) => { const r = await worker.fetch(new Request(origin + route, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': owner, Origin: origin, ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env); const text = await r.text(); return {status: r.status, text, data: JSON.parse(text)}; };
const ok = r => { assert(r.status >= 200 && r.status < 300, r.status + ' ' + r.text.slice(0, 300)); return r.data; };
const row = async id => JSON.parse((await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner, id).first()).document);
const localKey = key => path.join(filesDir, createHash('sha256').update(key).digest('hex') + '.json');
const historyWrites = from => written.slice(from).filter(k => k.startsWith('histories/'));
try {
  // ---------------------------------------------------------------- 1. 300 batches
  const id = ok(await call('/api/projects', {name: 'Histories at scale · synthetic', template: 'bank-payment'})).document.id;
  let held = ok(await call('/api/project?project=' + id)); held = {document: settleDocument(held.document), revision: held.revision};
  const reason = 'Histories at scale suite; synthetic, not reviewed by a person';
  let sealed = [], largest = 0;
  for (let n = 1; n <= BATCHES; n++) {
    const commands = [{type: 'artefact', payload: {type: 'assumption', title: 'Scale probe ' + n, description: '', owner: '', source: 'Synthetic', confirmed: false}}];
    const from = written.length, preview = previewWorkingChange(held.document, commands);
    const r = await call('/api/commands?project=' + id + '&response=sections', {revision: held.revision, command: {type: 'workspace.apply', payload: {commands, stamp: preview.stamp, reviewed: true, reason}}});
    assert.equal(r.status, 200, 'batch ' + n + ': ' + r.text.slice(0, 300)); largest = Math.max(largest, r.text.length);
    if (n > 1) {
      assert(!('workbench' in r.data.sections), 'batch ' + n + ': the workbench is not answered whole');
      assert.equal(r.data.deltas.workbench.obj.set.history.grow.add.length, 1, 'batch ' + n + ': the answer carries the history entry it added');
      assert.equal(r.data.deltas.workbench.obj.set.history.grow.since, n - 1);
    }
    held = {document: settleDocument(mergeSaved(held.document, r.data).document), revision: r.data.revision};
    // One history object written: the log's head (or the segment it sealed); the sealed segments as they were.
    assert.equal(historyWrites(from).length, 1, 'batch ' + n + ': one history object written');
    assert(!written.slice(from).some(k => k.includes('/workbench/')), 'batch ' + n + ': the workbench section is not written again');
    const log = (await row(id)).historyLogs.workbench;
    assert.deepEqual(log.segments.slice(0, sealed.length).map(s => s.key), sealed, 'batch ' + n + ': no sealed segment is written again');
    sealed = log.segments.map(s => s.key);
  }
  const stored = await row(id), log = stored.historyLogs.workbench;
  const workbenchStored = stored.workbench?.storageKey ? JSON.parse(readFileSync(localKey(stored.workbench.storageKey), 'utf8')) : stored.workbench;
  assert.equal(workbenchStored.history, HISTORY_LOG, 'the workbench is stored with its history marked, not held whole');
  pass(`${BATCHES} batches: each answered the one history entry it added (the largest answer ${largest} characters), each wrote one history object and no sealed segment again, and the workbench is stored with its history marked`);

  // ---------------------------------------------------------------- 2. segmented, and read back whole
  assert.equal(log.count, BATCHES); assert.equal(log.segments.length, Math.floor(BATCHES / LOG_ENTRIES));
  assert(log.segments.every(s => s.count === LOG_ENTRIES && /^[a-f0-9]{64}$/.test(s.sha256)), 'sealed segments of 25 entries, each with its SHA-256');
  const read = ok(await call('/api/project?project=' + id));
  assert.equal(read.document.workbench.history.length, BATCHES);
  assert.equal(JSON.stringify(read.document.workbench), JSON.stringify(held.document.workbench), 'the history reads back whole, as the browser holds it after the answers');
  assert.deepEqual(read.document.workbench.history.map(h => h.changed.length), Array(BATCHES).fill(1));
  const segment = localKey(log.segments[3].key), good = readFileSync(segment, 'utf8');
  writeFileSync(segment, good.replace('Scale probe', 'Scale probf'));
  const refused = await call('/api/project?project=' + id);
  assert.equal(refused.status, 422); assert.match(refused.data.error, /SHA-256/, 'a segment altered in storage is refused');
  writeFileSync(segment, good);
  pass(`segmented: ${log.segments.length} sealed segments of ${LOG_ENTRIES} entries${log.head ? ' and a head of ' + log.head.count : ''}, each with its SHA-256; the history reads back whole, the same as the browser holds it; a segment altered in storage is refused`);

  // ---------------------------------------------------------------- 3. the guided sessions' histories
  {
    const p = structuredClone(read.document), at = '2026-10-08T12:00:00.000Z', step = k => ({at, actor: owner, event: 'Synthetic guided step ' + k});
    p.guidance = {version: 1, sessions: [{id: 'session-a', chapter: 2, objectId: 'project', answers: [], history: Array.from({length: 30}, (_, k) => step('a' + k))}, {id: 'session-b', chapter: 4, objectId: 'project', answers: [], history: [step('b0')]}], loops: []};
    const before = ok(await call('/api/project?project=' + id));
    let stored0 = await readStoredProject(env, owner, (await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner, id).first()).document);
    assert((await saveStoredProject(env, owner, id, p, before.revision, at, stored0.keys)).meta.changes);
    const once = (await row(id)).historyLogs.guidance;
    assert.equal(once.count, 31); assert.deepEqual(once.sessions, {'session-a': 30, 'session-b': 1});
    // A guided step: one entry on the second session. The log's head alone is written.
    stored0 = await readStoredProject(env, owner, (await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner, id).first()).document);
    const q = stored0.document; q.guidance.sessions[1].history.push(step('b1'));
    const from = written.length;
    assert((await saveStoredProject(env, owner, id, q, before.revision + 1, at, stored0.keys)).meta.changes);
    assert.equal(historyWrites(from).length, 1, 'a guided step writes the log\'s head alone'); assert(!written.slice(from).some(k => k.includes('/guidance/')), 'and not the guidance section');
    const twice = (await row(id)).historyLogs.guidance;
    assert.deepEqual(twice.segments.map(s => s.key), once.segments.map(s => s.key), 'its sealed segment is not written again');
    const back = ok(await call('/api/project?project=' + id)).document.guidance.sessions;
    assert.deepEqual(back.map(s => s.history.map(h => h.event)), [p.guidance.sessions[0].history.map(h => h.event), ['Synthetic guided step b0', 'Synthetic guided step b1']], 'each session reads back its own history, in order');
  }
  pass('the guided sessions\' histories: kept as one log in the order their steps were added; a guided step on one session writes the log\'s head alone and not the guidance section; each session reads back its own history in order');

  // ---------------------------------------------------------------- 4. the storage upgrade moves a history kept inline
  {
    const legacy = structuredClone(read.document); legacy.id = 'project-scale-design-legacy'; legacy.name = 'Histories kept inline · synthetic';
    legacy.workbench.history = legacy.workbench.history.slice(0, 40);
    await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind(owner, legacy.id, JSON.stringify(legacy), '2026-10-02T09:00:00.000Z').run();
    const first = ok(await call('/api/project?project=' + legacy.id));
    assert.equal(first.revision, 2, 'the first read stores the upgrade');
    const upgraded = await row(legacy.id);
    assert.equal(upgraded.historyLogs.workbench.count, 40); assert.equal(upgraded.workbench.history ?? JSON.parse(readFileSync(localKey(upgraded.workbench.storageKey), 'utf8')).history, HISTORY_LOG);
    assert.equal(JSON.stringify(first.document.workbench.history), JSON.stringify(legacy.workbench.history), 'the history reads the same after the upgrade');
    const activity = (await env.DB.prepare('SELECT document FROM project_activity WHERE owner_id=? AND project_id=?').bind(owner, legacy.id).all()).results.map(r => JSON.parse(r.document)).filter(a => a.kind === 'storage');
    assert.equal(activity.length, 1, 'the upgrade is recorded once');
    const previous = await readRecoveryPoint(env, owner, legacy.id, activity[0].recoveryPoint);
    assert.equal(previous.revision, 1); assert.equal(JSON.stringify(previous.document.workbench.history), JSON.stringify(legacy.workbench.history), 'the version it replaced reads back whole');
    assert.equal(ok(await call('/api/project?project=' + legacy.id)).revision, 2, 'the next read writes nothing');
  }
  pass('a project stored with its history inside its section is moved to a log by the one-time storage upgrade, recorded once in its activity; the history reads the same, and the version it replaced reads back whole from its recovery point');
} finally {
  try { env.DB.close(); } catch { /* closed */ }
  await rm(dir, {recursive: true, force: true});
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 1));
