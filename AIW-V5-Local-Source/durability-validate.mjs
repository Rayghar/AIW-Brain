// Writes that survive retries and upgrades (audit C-27, C-29, B-10, B-16, B-17, B-18, B-19, B-14): local
// migrations apply atomically and refuse edited history; a retried command is answered from its receipt,
// never applied twice; the change journal and activity name who acted; internal errors stay internal;
// requirement pages stop at the last page; access changes are audited; connectors refuse internal addresses.
// In-process Worker and SQLite; no network. Run: npm run test:durability
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync, cpSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import worker from './worker.js';
import {localDatabase, migrateLocalDatabase} from './local-db.js';
import {publicMessage} from './error-message.js';
import {privateAddress, fetchConnector} from './connection-adapters.js';

const checks = [], pass = (name) => checks.push(name);
const scratch = mkdtempSync(path.join(tmpdir(), 'aiw-durability-'));
try {
  // 1. Migrations: atomic, checksummed, and adopted by databases made before checksums.
  const migrations = path.join(scratch, 'drizzle');
  cpSync('drizzle', migrations, {recursive: true});
  const db = new DatabaseSync(':memory:');
  migrateLocalDatabase(db, migrations);
  const applied = db.prepare('SELECT name, sha256 FROM _local_migrations ORDER BY name').all();
  assert(applied.length >= 9 && applied.every((m) => /^[a-f0-9]{64}$/.test(m.sha256)), 'every applied migration keeps its checksum');
  assert(db.prepare("SELECT name FROM sqlite_master WHERE name='command_receipts'").get(), 'the receipts table exists');
  migrateLocalDatabase(db, migrations);
  const first = path.join(migrations, applied[0].name), original = readFileSync(first, 'utf8');
  writeFileSync(first, original + '\n-- edited after it was applied\n');
  assert.throws(() => migrateLocalDatabase(db, migrations), /changed after it was applied/);
  writeFileSync(first, original.replace(/\n/g, '\r\n'));
  migrateLocalDatabase(db, migrations);
  writeFileSync(first, original);
  writeFileSync(path.join(migrations, '9999_broken.sql'), 'CREATE TABLE half_applied (x TEXT);\n--> statement-breakpoint\nCREATE TABLE ??? (y);');
  assert.throws(() => migrateLocalDatabase(db, migrations), /9999_broken\.sql failed and was rolled back/);
  assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='half_applied'").get(), undefined, 'nothing of a failed migration remains');
  assert.equal(db.prepare("SELECT name FROM _local_migrations WHERE name='9999_broken.sql'").get(), undefined);
  rmSync(path.join(migrations, '9999_broken.sql'));
  db.exec('UPDATE _local_migrations SET sha256=NULL');
  migrateLocalDatabase(db, migrations);
  assert(db.prepare('SELECT sha256 FROM _local_migrations').all().every((m) => m.sha256), 'records made before checksums adopt the current files');
  db.close();
  pass('migrations apply inside a transaction with a checksum; an edited applied migration stops start-up; a failed one leaves nothing behind; line endings do not count as edits');

  // 1b. The schema in db/schema.ts and the database the migrations build agree (round 2, B2-22): the same tables, the
  // same columns, primary keys and indexes, so a schema edit without `npm run db:generate` (or the reverse) fails here.
  const schemaSource = readFileSync('db/schema.ts', 'utf8');
  const declared = new Map();
  for (const part of schemaSource.split(/sqliteTable\(/).slice(1)) {
    const name = /^'([a-z_0-9]+)'/.exec(part)[1], keys = new Map(), columns = [];
    for (const m of part.matchAll(/(\w+):(?:text|integer|real|blob)\('([a-z_0-9]+)'\)([^,}]*)/g)) { keys.set(m[1], m[2]); columns.push(m[2]); }
    const pkInline = [...part.matchAll(/(\w+):(?:text|integer|real|blob)\('([a-z_0-9]+)'\)[^,}]*\.primaryKey\(\)/g)].map((m) => m[2]);
    const pkComposite = /primaryKey\(\{columns:\[([^\]]*)\]/.exec(part)?.[1].split(',').map((c) => keys.get(c.trim().replace(/^\w+\./, ''))) || [];
    const indexes = [...part.matchAll(/(unique)?[iI]ndex\('([a-z_0-9]+)'\)\.on\(([^)]*)\)/g)].map((m) => ({name: m[2], unique: !!m[1], columns: m[3].split(',').map((c) => keys.get(c.trim().replace(/^\w+\./, '')))}));
    declared.set(name, {columns: columns.sort(), primaryKey: [...pkInline, ...pkComposite], indexes: indexes.sort((a, b) => a.name.localeCompare(b.name))});
  }
  const built = new DatabaseSync(':memory:');
  migrateLocalDatabase(built, 'drizzle');
  const tables = built.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name<>'_local_migrations' ORDER BY name").all().map((t) => t.name);
  assert.deepEqual(tables, [...declared.keys()].sort(), 'the migrations build exactly the tables db/schema.ts declares');
  for (const [name, want] of declared) {
    const info = built.prepare(`PRAGMA table_info(${name})`).all();
    assert.deepEqual(info.map((c) => c.name).sort(), want.columns, name + ': columns');
    assert.deepEqual(info.filter((c) => c.pk).sort((a, b) => a.pk - b.pk).map((c) => c.name), want.primaryKey, name + ': primary key');
    const live = built.prepare(`PRAGMA index_list(${name})`).all().filter((i) => i.origin === 'c').map((i) => ({name: i.name, unique: !!i.unique, columns: built.prepare(`PRAGMA index_info(${i.name})`).all().sort((a, b) => a.seqno - b.seqno).map((c) => c.name)})).sort((a, b) => a.name.localeCompare(b.name));
    assert.deepEqual(live, want.indexes, name + ': indexes');
  }
  built.close();
  pass('schema parity: db/schema.ts and the database the drizzle migrations build have the same ' + declared.size + ' tables, columns, primary keys and indexes');

  // 2. The local batch is atomic, like D1's.
  const local = localDatabase(':memory:');
  await local.prepare('CREATE TABLE atom (x TEXT UNIQUE)').run();
  await assert.rejects(local.batch([local.prepare('INSERT INTO atom VALUES (?)').bind('a'), local.prepare('INSERT INTO atom VALUES (?)').bind('a')]));
  assert.equal((await local.prepare('SELECT COUNT(*) AS n FROM atom').first()).n, 0, 'a failing batch commits nothing');
  pass('a failing statement rolls back the whole local batch, matching the hosted database');

  // 3. Idempotent commands.
  const FILES = new Map();
  const env = {DB: local, FILES: {async put(k, v) { FILES.set(k, v); }, async get(k) { return FILES.has(k) ? {text: async () => FILES.get(k), arrayBuffer: async () => new TextEncoder().encode(FILES.get(k)).buffer} : null; }, async delete(k) { FILES.delete(k); }}, ASSETS: {fetch: () => new Response('')}};
  const origin = 'https://aiw.test';
  const logged = [], log = console.log;
  console.log = (...args) => { logged.push(args.join(' ')); };
  const api = async (pathName, {body, key, actor = 'architect-a', method} = {}) => {
    const response = await worker.fetch(new Request(origin + pathName, {method: method || (body ? 'POST' : 'GET'), headers: {'oai-authenticated-user-id': actor, ...(body ? {Origin: origin, 'Content-Type': 'application/json'} : {}), ...(key ? {'Idempotency-Key': key} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env);
    return {status: response.status, data: await response.json()};
  };
  try {
    const opened = (await api('/api/project')).data, id = opened.document.id;
    const requirement = opened.document.artefacts.find((a) => a.id === 'REQ-001');
    const body = {revision: opened.revision, command: {type: 'artefact', payload: {...requirement, description: requirement.description + ' Recorded once.'}}};
    const key = 'retry-key-0000000000000001';
    const saved = await api('/api/commands?project=' + id, {body, key});
    assert.equal(saved.status, 200, JSON.stringify(saved.data).slice(0, 200)); assert.equal(saved.data.revision, opened.revision + 1);
    const replay = await api('/api/commands?project=' + id, {body, key});
    assert.equal(replay.status, 200, 'a retry of a saved command is answered, not refused'); assert.equal(replay.data.replayed, true);
    assert.equal(replay.data.revision, opened.revision + 1, 'and not applied a second time');
    assert.equal((replay.data.document.artefacts.find((a) => a.id === 'REQ-001').description.match(/Recorded once\./g) || []).length, 1);
    assert.equal((await api('/api/commands?project=' + id, {body: {...body, command: {...body.command, payload: {...body.command.payload, title: 'Other'}}}, key})).status, 422, 'a key cannot be reused for a different change');
    assert.equal((await api('/api/commands?project=' + id, {body})).status, 409, 'without a key, a stale revision is still a conflict');
    assert.equal((await api('/api/commands?project=' + id, {body, key: 'short'})).status, 400);
    pass('a retried command with the same Idempotency-Key returns the saved outcome and current project instead of a conflict or a second change; a reused key for a different change is refused');

    // 4. Who acted is recorded on the journal and the activity.
    const current = (await api('/api/project?project=' + id)).data;
    const events = current.document.changes?.events || [];
    assert(events.length > 0, 'the requirement edit is journalled');
    assert(events.every((e) => e.actor === 'architect-a'), 'each journal entry names the signed-in person');
    const activity = await api('/api/activity?project=' + id);
    assert.equal(activity.status, 200);
    assert(JSON.stringify(activity.data).includes('"changeIds"'), 'the activity row links the journal entries it made');
    pass('change-journal entries and activity rows name the signed-in person, and activity links the journal entries');

    // 5. Paging stops at the last page.
    const far = await api('/api/requirements?project=' + id + '&page=99999');
    assert.equal(far.status, 200); assert.equal(far.data.page, Math.max(1, Math.ceil(far.data.total / far.data.pageSize)));
    pass('a requirement page past the end reads as the last page');

    // 6. Access changes are audited.
    const granted = await api('/api/access?project=' + id, {body: {actorId: 'steward-b', role: 'editor'}});
    assert.equal(granted.status, 200, JSON.stringify(granted.data));
    const line = logged.map((l) => { try { return JSON.parse(l); } catch { return null; } }).find((l) => l?.event === 'project-access');
    assert(line && line.by === 'architect-a' && line.member === 'steward-b' && line.role === 'editor', 'the role change is written to the audit log');
    pass('project role changes are written to the audit log with who changed whose access');
  } finally { console.log = log; }

  // 7. Internal errors stay internal; authored messages are kept.
  const errors = console.error; console.error = () => {};
  try {
    assert.match(publicMessage(new TypeError("Cannot read properties of undefined (reading 'x')")), /could not be completed/);
    assert.equal(publicMessage(Error('Choose a project role.')), 'Choose a project role.');
  } finally { console.error = errors; }
  pass('programming faults answer with a general message; validation messages are kept');

  // 8. Generic connectors refuse names that resolve inside the network.
  assert(privateAddress('10.0.0.8') && privateAddress('169.254.169.254') && privateAddress('::ffff:192.168.0.1') && !privateAddress('93.184.216.34'));
  const profile = {id: 'runtime', kind: 'runtime-json', url: 'https://metrics.example.com/runtime.json', owners: ['x']};
  let fetched = false;
  await assert.rejects(fetchConnector({AIW_RESOLVE_HOST: async () => ['10.0.0.8']}, profile, {fetcher: async () => { fetched = true; return new Response('{}'); }}), /private network address/);
  assert.equal(fetched, false, 'no request is sent');
  pass('a generic connector whose endpoint resolves to a private address is refused before any request');
} finally {
  rmSync(scratch, {recursive: true, force: true});
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
