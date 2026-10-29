// The API's service modules, driven over HTTP through the Worker with every project role (round 2, B2-12), and
// the round-2 behaviour of the command and storage paths: a command payload must be an object (B2-05); an
// integrity fault answers 422 with code "integrity" and a programming fault 500, each as one JSON log line, never
// as a transient 503 (B2-06); a workbook import is attributed to the signed-in editor with an activity row (B2-09);
// the change journal is kept in segments, an edit rewrites only the head, superseded objects are swept after the
// grace period (B2-03); ?changes=recent, GET /api/changes and ?response=sections are opt-in response shapes
// (B2-13); repository notices are applied for owners and editors only (B2-08); with local accounts a role can only
// be granted to an existing account (B2-18); organisation release signatures are checked with HMAC verify (B2-24);
// the project list reads a stored summary (B2-19); a keyed POST to a service route is answered once (B2-20).
// In-process Worker, SQLite and files; synthetic identities; no network.
// Run: node service-routes-validate.mjs
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {crc32} from 'node:zlib';
import worker, {commandShape, commandHandler} from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {SEGMENT_EVENTS, SWEEP_GRACE_MS, storedSummary, READINESS_EVERY_MS} from './project-storage.js';
// Every backend module is imported by this suite (B2-12), so a module that no longer loads fails the gate.
import {APP_SECURITY_HEADERS, SIGN_IN_SECURITY_HEADERS, isCompressible} from './security-headers.js';
import {queryRequirements} from './requirement-storage.js';
import {handleCollaboration, projectIdentity, knownActor} from './collaboration-service.js';
import {handleObjects, activityStatement} from './object-service.js';
import {handleOperations, operationStatement} from './operation-service.js';
import {handleOrganizations, verifyOrganizationRelease} from './organization-service.js';
import {handleIntake} from './intake-service.js';
import {handleIntelligence} from './intelligence-service.js';
import {auditEvent, errorEvent} from './audit-log.js';
import {handleRecovery} from './recovery-service.js';
import {handleLifecycle} from './project-lifecycle.js';
import {handleRepositoryCorpus} from './knowledge-repository.js';
import {handleRepositorySync} from './repository-sync.js';
import {prepareRepositoryPacket} from './repository-packet.js';
import {acquireRepositorySource} from './knowledge-service.js';
import {prepareBrainPacket} from './brain-retrieval.js';
import {fetchConnector} from './connection-adapters.js';
import {publicMessage, integrityError, isIntegrityError} from './error-message.js';
import {runRetention} from './retention.js';
import {SETTINGS} from './settings.js';
import {evaluateArchitectureCase} from './architecture-case-evaluation.js';
import {applyCommand} from './public/requirements-domain.js';
import {projectSummary, createProject} from './shared/projects-domain.js';
for (const [name, value] of Object.entries({APP_SECURITY_HEADERS, SIGN_IN_SECURITY_HEADERS, isCompressible, queryRequirements, handleCollaboration, projectIdentity, knownActor, handleObjects, activityStatement, handleOperations, operationStatement, handleOrganizations, handleIntake, handleIntelligence, auditEvent, errorEvent, handleRecovery, handleLifecycle, handleRepositoryCorpus, handleRepositorySync, prepareRepositoryPacket, acquireRepositorySource, prepareBrainPacket, fetchConnector, publicMessage, integrityError, isIntegrityError, runRetention, SETTINGS, evaluateArchitectureCase, applyCommand, commandShape, commandHandler})) assert(value, name + ' is exported');

const checks = [], pass = (name) => checks.push(name);
const scratch = mkdtempSync(path.join(tmpdir(), 'aiw-service-routes-'));
const env = {DB: localDatabase(path.join(scratch, 'test.sqlite')), FILES: localFiles(path.join(scratch, 'files')), ASSETS: {fetch: () => new Response('ok')}};
const origin = 'https://aiw.test';
const logged = [];
const stderr = console.error;
console.error = (line) => { logged.push(String(line)); };
async function api(path, {actor = 'owner', body, bytes, method, headers = {}, raw = false} = {}) {
  const response = await worker.fetch(new Request(origin + path, {method: method || (body || bytes ? 'POST' : 'GET'), headers: {'oai-authenticated-user-id': actor, Origin: origin, ...(body ? {'Content-Type': 'application/json'} : {}), ...headers}, ...(body ? {body: raw ? body : JSON.stringify(body)} : bytes ? {body: bytes} : {})}), env);
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = {raw: text}; }
  return {status: response.status, data, headers: response.headers};
}
// A minimal .xlsx (stored ZIP entries, inline strings) with the columns the intake maps by name.
function workbook(rows) {
  const xml = (cells) => cells.map((v, i) => `<c r="${String.fromCharCode(65 + i)}${cells.row}" t="inlineStr"><is><t>${v}</t></is></c>`).join('');
  const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((cells, i) => `<row r="${i + 1}">${xml(Object.assign(cells, {row: i + 1}))}</row>`).join('')}</sheetData></worksheet>`;
  const files = [
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Requirements" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ['xl/worksheets/sheet1.xml', sheet],
  ];
  const locals = [], central = [];
  let offset = 0;
  for (const [name, text] of files) {
    const body = Buffer.from(text, 'utf8'), nameBytes = Buffer.from(name), crc = crc32(body);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6); local.writeUInt16LE(0, 8); local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(body.length, 22); local.writeUInt16LE(nameBytes.length, 26);
    const entry = Buffer.alloc(46); entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0, 8); entry.writeUInt16LE(0, 10); entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(body.length, 20); entry.writeUInt32LE(body.length, 24); entry.writeUInt16LE(nameBytes.length, 28); entry.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, body); central.push(entry, nameBytes);
    offset += local.length + nameBytes.length + body.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, directory, end]));
}
const lastLog = () => JSON.parse(logged.at(-1));
try {
  // 1. Fixture: the owner's reference project, and four members.
  let state = (await api('/api/project')).data;
  const id = state.document.id;
  const command = (type, payload, {actor = 'owner', query = '', revision = state.revision} = {}) => api('/api/commands?project=' + id + query, {actor, body: {revision, command: {type, ...(payload === undefined ? {} : {payload})}}});
  for (const [actorId, role] of [['editor', 'editor'], ['reviewer', 'reviewer'], ['viewer', 'viewer']]) assert.equal((await api('/api/access?project=' + id, {body: {actorId, role}})).status, 200);
  assert.equal(commandShape({type: 'brief', payload: 'x'}).code, 'invalid_payload');
  assert.equal(commandShape({type: 'brief', payload: ['x']}).code, 'invalid_payload');
  assert.equal(commandShape({type: 'brief', payload: null}).code, 'invalid_payload');
  assert.equal(commandShape({type: 'review.intake'}), null, 'a parameterless action may omit its payload');
  assert.equal(commandShape({type: 'nonsense.thing', payload: {}}).code, 'unknown_command');
  assert.equal(commandShape({type: 'deleteRelationship', payload: {}}), null, 'unprefixed types are the requirements domain\'s to judge');
  const requirement = state.document.artefacts.find((a) => a.type === 'requirement');
  let r = await command('brief', 'x');
  assert.equal(r.status, 400); assert.equal(r.data.code, 'invalid_payload');
  const unchanged = (await api('/api/project')).data;
  assert.equal(unchanged.revision, state.revision, 'nothing was applied'); assert.deepEqual(unchanged.document.brief, state.document.brief, 'the brief was not blanked');
  r = await command('nonsense.thing', {});
  assert.equal(r.status, 400); assert.equal(r.data.code, 'unknown_command');
  r = await command('review.nonsense', {});
  assert.equal(r.status, 400); assert.equal(r.data.code, 'unknown_command', 'a domain\'s refusal of an unknown type carries the same code');
  r = await command('workspace.apply', {});
  assert.notEqual(r.status, 503, 'a command without its list of commands is not a storage outage: ' + r.status);
  assert.notEqual(r.status, 500);
  pass('command shape: a string, array or null payload is refused with invalid_payload and nothing is applied; an unknown prefix is refused before the project is loaded; unknown types in a known domain carry unknown_command');

  // 2. The journal lives in segments: an edit rewrites the head only; the head seals at SEGMENT_EVENTS events; a
  // review on an earlier event rewrites that one segment; superseded objects are listed and swept after the grace period.
  const row = async () => JSON.parse((await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind('owner', id).first()).document);
  // Each edit a change of its own: the owner and an editor take turns, since consecutive saves of one record's fields by
  // one person fold into one change (round 12, A3: GR-STO-07: journal-archive.js foldChange).
  const edit = async (n) => { state = (await api('/api/project')).data; r = await command('artefact', {...requirement, title: requirement.title.replace(/ \(edit \d+\)$/, '') + ' (edit ' + n + ')'}, {actor: n % 2 ? 'owner' : 'editor'}); assert.equal(r.status, 200, JSON.stringify(r.data)); };
  await edit(1);
  let stored = await row();
  assert.equal(stored.changes.schemaVersion, 2); assert.equal(stored.changes.segments.length, 0); assert.equal(stored.changes.head.count, 1);
  const firstHead = stored.changes.head.key;
  await edit(2);
  stored = await row();
  assert.equal(stored.changes.head.count, 2); assert.notEqual(stored.changes.head.key, firstHead, 'the head is rewritten under a new key');
  assert.deepEqual(stored.storageSweep.superseded.map((s) => s.key), [firstHead], 'the previous head is listed as superseded, not deleted yet');
  assert(await env.FILES.get(firstHead), 'and still readable for a read that holds the old reference');
  for (let n = 3; n <= SEGMENT_EVENTS + 1; n++) await edit(n);
  stored = await row();
  assert.equal(stored.changes.segments.length, 1); assert.equal(stored.changes.segments[0].count, SEGMENT_EVENTS, 'the head sealed at ' + SEGMENT_EVENTS + ' events');
  assert.equal(stored.changes.head.count, 1); assert.equal(stored.changes.eventCount, SEGMENT_EVENTS + 1);
  const sealedKey = stored.changes.segments[0].key, headKey = stored.changes.head.key;
  state = (await api('/api/project')).data;
  // A read leaves the archived changes out and counts them (round 12, A3: GR-PERF-13: changes-domain.js journalView);
  // GET /api/changes reads the whole journal, newest first.
  assert.equal(state.document.changes.events.length + (state.document.changes.archivedCount || 0), SEGMENT_EVENTS + 1, 'the read holds every change not archived and counts the archived ones');
  const paged = (await api('/api/changes?project=' + id + '&limit=100')).data.events;
  assert.equal(paged.length, SEGMENT_EVENTS + 1, 'GET /api/changes reads the whole journal');
  const bytesPerEdit = (await env.FILES.get(headKey)) ? JSON.stringify(state.document.changes.events.at(-1)).length : 0;
  assert(bytesPerEdit > 0 && bytesPerEdit < 64 * 1024, 'an edit writes one event, not the whole journal');
  // A review recorded on an event inside the sealed segment rewrites that segment, and that segment only.
  // (Round 12, PS-08: an earlier change archived with the journal's archive keeps no affected records of its own; a review
  // of it is refused like any superseded change's.)
  const first = paged.at(-1), item = first.items[0];
  r = await command('change.review', {changeId: first.id, itemKey: item?.key || 'archived', targetStamp: item?.capturedStamp || '', outcome: 'unchanged', reviewer: 'Synthetic reviewer', rationale: 'Fixture', evidence: 'Fixture', reviewed: true});
  if (r.status === 200) { stored = await row(); assert.notEqual(stored.changes.segments[0].key, sealedKey, 'the sealed segment that changed was rewritten'); assert.equal(stored.changes.head.key, headKey, 'the head was left alone'); }
  else assert.match(r.data.error, /newer change|changed/, 'the earliest event is superseded by later edits of the same requirement: ' + r.data.error);
  // The sweep: age the superseded list past the grace period, save once more, and the old objects are gone.
  stored = await row();
  const aged = {...stored, storageSweep: {superseded: stored.storageSweep.superseded.map((s) => ({...s, at: new Date(Date.now() - SWEEP_GRACE_MS - 1000).toISOString()}))}};
  const due = aged.storageSweep.superseded.map((s) => s.key);
  // Every rewritten head is listed, and the sealed segment as it was before its earlier changes were archived (round 12,
  // PS-08: the 25th superseded change moved them to the journal's archive, whose pages are referenced, never listed).
  assert.equal(due.length, SEGMENT_EVENTS, 'every rewritten head and the sealed segment the archive compacted are listed');
  assert.equal(stored.changes.archive.length, 1, 'one archive page'); assert(!due.includes(stored.changes.archive[0].key), 'the archive page is referenced, not superseded');
  for (const key of due) assert(await env.FILES.get(key), 'superseded objects are kept until the grace period passes');
  await env.DB.prepare('UPDATE projects SET document=? WHERE owner_id=? AND id=?').bind(JSON.stringify(aged), 'owner', id).run();
  await edit(SEGMENT_EVENTS + 2);
  stored = await row();
  for (const key of due) assert.equal(await env.FILES.get(key), null, 'swept after the grace period: ' + key);
  assert.equal((stored.storageSweep?.superseded || []).length, 1, 'only the head this save superseded remains listed');
  state = (await api('/api/project')).data;
  assert.equal(state.document.changes.events.length + (state.document.changes.archivedCount || 0), SEGMENT_EVENTS + 2, 'the journal is intact after the sweep (the read counts its archived changes)');
  assert.equal((await api('/api/changes?project=' + id + '&limit=100')).data.events.length, SEGMENT_EVENTS + 2, 'and reads back whole');
  assert.equal(state.document.storageSweep, undefined, 'the sweep list is storage metadata, not part of the document');
  pass('journal segments: an edit rewrites the head only; the head seals at ' + SEGMENT_EVENTS + ' events; superseded objects are listed in the row and deleted by a later save after the grace period; the hydrated journal is complete throughout');

  // 3. Opt-in response shapes (B2-13): ?changes=recent, GET /api/changes, ?response=sections.
  const recent = (await api('/api/project?project=' + id + '&changes=recent')).data;
  // ?changes=recent keeps the newest 25 of the changes a read carries (the archived ones are not among them: GR-PERF-13).
  const carried = (await api('/api/project?project=' + id)).data.document.changes;
  assert.deepEqual(recent.document.changes.events.map(e => e.id), carried.events.slice(-25).map(e => e.id)); assert.equal(recent.document.changes.truncated, carried.events.length > 25 || undefined);
  assert.equal(recent.document.changes.events.at(-1).id, state.document.changes.events.at(-1).id, 'the newest events');
  const all = (await api('/api/changes?project=' + id + '&limit=100')).data.events;
  assert.equal(all.length, SEGMENT_EVENTS + 2);
  let page = (await api('/api/changes?project=' + id + '&limit=10')).data;
  assert.equal(page.events.length, 10); assert.equal(page.events[0].id, all[0].id, 'newest first'); assert.equal(page.events[0].id, state.document.changes.events.at(-1).id); assert.equal(page.eventCount, SEGMENT_EVENTS + 2);
  const older = (await api('/api/changes?project=' + id + '&limit=10&before=' + page.next)).data;
  assert.equal(page.next, all[9].id, 'the cursor is the oldest event on the page'); assert.equal(older.events[0].id, all[10].id, 'the next page starts with the event just before the cursor'); assert.equal(older.events.length, 10);
  assert.equal((await api('/api/changes?project=' + id + '&before=CHG-999')).status, 400);
  assert.equal((await api('/api/changes?project=' + id, {actor: 'nobody'})).status, 404, 'a non-member cannot page the journal');
  state = (await api('/api/project')).data;
  r = await command('brief', {problem: 'A sectioned answer', goal: state.document.brief.goal, source: state.document.brief.source, confirmed: false}, {query: '&response=sections'});
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.document, undefined, 'no full document'); assert.equal(r.data.revision, state.revision + 1); assert.equal(r.data.sections.brief.problem, 'A sectioned answer');
  assert(!('artefacts' in r.data.sections), 'untouched sections are absent');
  state = (await api('/api/project')).data;
  r = await command('brief', {problem: 'A full answer', goal: state.document.brief.goal, source: state.document.brief.source, confirmed: false});
  assert.equal(r.status, 200); assert(r.data.document?.artefacts?.length, 'the default answer is still the full document');
  pass('opt-in shapes: ?changes=recent trims the journal and says so, GET /api/changes pages older events newest first, ?response=sections answers with the changed sections; the default shapes are unchanged');

  // 4. An integrity fault answers 422 with code "integrity" and one JSON log line; a 503 is reserved for an unreachable adapter.
  stored = await row();
  const sealed = stored.changes.segments[0].key, saved = await (await env.FILES.get(sealed)).text();
  await env.FILES.delete(sealed);
  logged.length = 0;
  r = await api('/api/project');
  assert.equal(r.status, 422, JSON.stringify(r.data)); assert.equal(r.data.code, 'integrity'); assert.match(r.data.error, /change history could not be loaded/);
  assert.equal(lastLog().event, 'integrity-fault'); assert.equal(lastLog().key, sealed); assert.equal(lastLog().project, id);
  state = {revision: stored.revision};
  r = await command('brief', {problem: 'x', goal: 'y', source: 'z', confirmed: false}, {revision: (await env.DB.prepare('SELECT revision FROM projects WHERE owner_id=? AND id=?').bind('owner', id).first()).revision});
  assert.equal(r.status, 422, 'a command on a project with a missing object is refused as an integrity fault, not saved: ' + JSON.stringify(r.data));
  assert.equal((await api('/api/export?project=' + id)).status, 422);
  // The service modules answer the same way (their own catch, through errorResponse).
  for (const route of ['/api/discussions?project=' + id + '&object=' + encodeURIComponent(requirement.id), '/api/graph?project=' + id + '&object=' + encodeURIComponent(requirement.id), '/api/jobs?project=' + id]) {
    logged.length = 0;
    const got = await api(route);
    assert.equal(got.status, 422, route + ' ' + JSON.stringify(got.data)); assert.equal(got.data.code, 'integrity'); assert.equal(lastLog().event, 'integrity-fault'); assert.equal(lastLog().key, sealed);
  }
  await env.FILES.put(sealed, saved);
  assert.equal((await api('/api/project')).status, 200, 'restored objects read again');
  const tampered = JSON.parse(saved); tampered.push({id: 'CHG-999', items: []});
  await env.FILES.put(sealed, JSON.stringify(tampered));
  r = await api('/api/project');
  assert.equal(r.status, 422); assert.match(r.data.error, /does not match its saved reference/);
  await env.FILES.put(sealed, saved);
  // An unreachable adapter is the one transient outage.
  const broken = {...env, DB: {prepare: () => ({bind: () => ({first: async () => { throw Error('SQLITE_IOERR: disk I/O error'); }, all: async () => { throw Error('SQLITE_IOERR'); }, run: async () => { throw Error('SQLITE_IOERR'); }})})}};
  logged.length = 0;
  const outage = await worker.fetch(new Request(origin + '/api/project?project=' + id, {headers: {'oai-authenticated-user-id': 'owner'}}), broken);
  assert.equal(outage.status, 503); assert.equal((await outage.json()).code, 'storage_unavailable'); assert.equal(lastLog().event, 'storage-unavailable');
  // The Worker's own health answer (hosted): no identity needed; degraded when the database does not answer.
  const healthy = await worker.fetch(new Request(origin + '/api/health'), env);
  assert.equal(healthy.status, 200); assert.deepEqual((await healthy.json()).checks, {database: 'ok', files: 'ok'});
  const degraded = await worker.fetch(new Request(origin + '/api/health'), broken);
  assert.equal(degraded.status, 503); assert.equal((await degraded.json()).checks.database, 'failed');
  assert.equal(isIntegrityError(integrityError('x', 'k')), true); assert.equal(integrityError('x', 'k').key, 'k');
  pass('error taxonomy: a missing or altered object answers 422 integrity on read, command and export with a JSON log line naming the key; an unreachable database answers 503 storage_unavailable; nothing is written on either; the service modules answer the same way; the Worker health answer reports the database');

  // 5. Every route against every role (the audit's table): members read, writers write, outsiders see nothing.
  const expect = async (path, actor, status, options = {}) => { const got = await api(path, {actor, ...options}); assert.equal(got.status, status, `${actor} ${options.method || (options.body || options.bytes ? 'POST' : 'GET')} ${path} → ${got.status} ${JSON.stringify(got.data).slice(0, 120)}`); return got; };
  const p = '?project=' + id;
  for (const actor of ['viewer', 'reviewer', 'editor', 'owner']) {
    await expect('/api/project' + p, actor, 200); await expect('/api/activity' + p, actor, 200); await expect('/api/export' + p, actor, 200);
    await expect('/api/access' + p, actor, 200); await expect('/api/reviews' + p, actor, 200); await expect('/api/attachments' + p, actor, 200);
    await expect('/api/operations' + p, actor, 200); await expect('/api/connections' + p, actor, 200); await expect('/api/jobs' + p, actor, 200);
    await expect('/api/requirements' + p, actor, 200); await expect('/api/intelligence/status' + p, actor, 200); await expect('/api/intelligence/runs' + p, actor, 200);
    await expect('/api/knowledge/corpus' + p + '&view=status', actor, 200);
  }
  for (const actor of ['viewer', 'reviewer']) {
    await expect('/api/commands' + p, actor, 403, {body: {revision: 1, command: {type: 'brief', payload: {}}}});
    await expect('/api/access' + p, actor, 403, {body: {actorId: 'x', role: 'viewer'}});
    await expect('/api/lifecycle' + p, actor, 403, {body: {action: 'archive', revision: 1}});
    await expect('/api/operations' + p, actor, 403, {body: {action: 'policy'}});
    await expect('/api/jobs' + p + '&action=create', actor, 403, {body: {kind: 'validate', requestId: crypto.randomUUID()}});
    await expect('/api/recovery' + p + '&action=export', actor, 403); await expect('/api/recovery' + p + '&action=audit', actor, 403);
    await expect('/api/knowledge/corpus' + p + '&view=notices', actor, 403, {method: 'POST'});
    await expect('/api/knowledge/repository-packet' + p, actor, 403); await expect('/api/knowledge/repository-sync' + p, actor, 403);
    await expect('/api/intake' + p + '&action=upload&filename=x.xlsx', actor, 403, {bytes: new Uint8Array(30)});
  }
  // Discussions on an existing object: every member reads, a viewer cannot open a thread, a reviewer can.
  const discussions = '/api/discussions' + p + '&object=' + encodeURIComponent(requirement.id);
  const thread = await expect(discussions, 'viewer', 200);
  await expect(discussions, 'viewer', 403, {body: {action: 'create', title: 'x', text: 'y', basis: thread.data.object.basis}});
  const opened = await expect(discussions, 'reviewer', 200, {body: {action: 'create', title: 'Reviewer question', text: 'Synthetic question from the reviewer.', basis: thread.data.object.basis}});
  assert.equal(opened.data.saved, true);
  await expect('/api/discussions' + p + '&object=no-such-object', 'reviewer', 404);
  await expect('/api/graph' + p + '&object=' + encodeURIComponent(requirement.id), 'viewer', 200);
  await expect('/api/lifecycle' + p, 'editor', 403, {body: {action: 'archive', revision: 1}});
  await expect('/api/operations' + p, 'editor', 403, {body: {action: 'policy'}});
  await expect('/api/connections' + p, 'editor', 403, {body: {profileId: 'x'}});
  await expect('/api/access' + p, 'editor', 403, {body: {actorId: 'x', role: 'viewer'}});
  await expect('/api/recovery' + p + '&action=export', 'editor', 200);
  // An outsider names another owner's project: every route answers as if it did not exist. (The reference project id
  // is everyone's own seeded project, so this uses a project the owner created.)
  const created = await api('/api/projects', {body: {name: 'Private project for the outsider checks', template: 'blank'}});
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const q = '?project=' + created.data.document.id;
  for (const route of ['/api/project', '/api/activity', '/api/access', '/api/reviews', '/api/attachments', '/api/operations', '/api/connections', '/api/jobs', '/api/requirements', '/api/export', '/api/intelligence/runs', '/api/changes']) await expect(route + q, 'outsider', 404);
  await expect('/api/recovery' + q + '&action=export', 'outsider', 404);
  await expect('/api/commands' + q, 'outsider', 404, {body: {revision: 1, command: {type: 'brief', payload: {}}}});
  await expect('/api/project' + q, 'owner', 200);
  pass('roles: viewers and reviewers read every route and write nowhere (commands, access, lifecycle, policy, jobs, recovery export, notices, packets, uploads all 403); editors write but do not own (lifecycle, policy, connections, access 403); an outsider sees 404 on every route of another owner\'s project');

  // 6. A workbook import by an editor is attributed to the editor, with an activity row (B2-09).
  const bytes = workbook([['ID', 'Requirement', 'Description'], ['IMP-1', 'Settle each instruction exactly once.', 'Imported by the editor'], ['IMP-2', 'Report a pending outcome within one minute.', 'Imported by the editor']]);
  r = await api('/api/intake' + p + '&action=upload&filename=editor.xlsx', {actor: 'editor', bytes});
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const uploadId = r.data.id;
  r = await api('/api/intake' + p + '&action=inspect', {actor: 'editor', body: {uploadId}});
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const mapping = r.data.mapping, sheet = r.data.sheet, headerRow = r.data.headerRow;
  assert.equal(mapping.externalId, 'A'); assert.equal(mapping.description, 'B');
  r = await api('/api/intake' + p + '&action=preview', {actor: 'editor', body: {uploadId, sheet, headerRow, mapping}});
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const revision = r.data.projectRevision, previewStamp = r.data.stamp;
  assert.equal(r.data.counts.add, 2, 'two new requirements in the preview');
  r = await api('/api/intake' + p + '&action=apply', {actor: 'editor', body: {uploadId, sheet, headerRow, mapping, revision, previewStamp, reviewed: true}});
  assert.equal(r.status, 200, JSON.stringify(r.data));
  state = (await api('/api/project')).data;
  const dataset = state.document.intake.datasets.at(-1);
  assert.equal(dataset.versions.at(-1).actor, 'editor', 'the dataset version names the editor, not the owner');
  const imported = state.document.artefacts.filter((a) => a.provenance?.datasetId === dataset.id);
  assert.equal(imported.length, 2);
  const activity = (await api('/api/activity' + p)).data;
  const entry = (activity.activity || activity.events || activity.items || []).find((e) => e.kind === 'import');
  assert(entry, 'an activity row records the import: ' + JSON.stringify(activity).slice(0, 200));
  assert.equal(entry.actor, 'editor'); assert.equal(entry.datasetId, dataset.id); assert.equal(entry.uploadId, uploadId); assert(entry.counts, 'with its counts');
  // An update of the same dataset changes an imported requirement: the change journal records it under the editor.
  const updated = workbook([['ID', 'Requirement', 'Description'], ['IMP-1', 'Settle each instruction exactly once, with a receipt.', 'Updated by the editor'], ['IMP-2', 'Report a pending outcome within one minute.', 'Imported by the editor']]);
  r = await api('/api/intake' + p + '&action=upload&filename=editor-2.xlsx', {actor: 'editor', bytes: updated});
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const secondUpload = r.data.id;
  r = await api('/api/intake' + p + '&action=preview', {actor: 'editor', body: {uploadId: secondUpload, sheet, headerRow, mapping, datasetId: dataset.id}});
  assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.counts.update, 1, 'one requirement changed: ' + JSON.stringify(r.data.counts));
  r = await api('/api/intake' + p + '&action=apply', {actor: 'editor', body: {uploadId: secondUpload, sheet, headerRow, mapping, datasetId: dataset.id, revision: r.data.projectRevision, previewStamp: r.data.stamp, reviewed: true}});
  assert.equal(r.status, 200, JSON.stringify(r.data));
  state = (await api('/api/project')).data;
  const journal = state.document.changes.events.filter((e) => imported.some((a) => a.id === e.requirementId));
  assert(journal.length >= 1, 'the update is journaled');
  assert(journal.every((e) => e.actor === 'editor'), 'journal entries for the imported requirements name the editor: ' + JSON.stringify(journal.map((e) => e.actor)));
  assert.equal(state.document.intake.datasets.find((d) => d.id === dataset.id).versions.at(-1).actor, 'editor');
  pass('import attribution: an editor\'s workbook import and its update are recorded under the editor in the dataset versions, the change journal and an activity row with dataset, upload and counts');

  // 7. With local accounts a role can only be granted to an existing account (B2-18); without the registry nothing changes.
  const registry = {...env, AIW_KNOWN_ACTORS: 'owner,editor,reviewer,viewer,steward'};
  const grant = async (actorId, e = registry) => worker.fetch(new Request(origin + '/api/access' + p, {method: 'POST', headers: {'oai-authenticated-user-id': 'owner', Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify({actorId, role: 'viewer'})}), e);
  r = await grant('zed'); assert.equal(r.status, 400); assert.match((await r.json()).error, /No account with this ID exists/);
  r = await grant('steward'); assert.equal(r.status, 200);
  r = await grant('steward'); assert.equal(r.status, 200);
  assert.equal((await grant('zed', env)).status, 200, 'without a registry (hosted) grants are not checked');
  assert.equal(knownActor({}, 'anyone'), true); assert.equal(knownActor({AIW_KNOWN_ACTORS: 'a,b'}, 'c'), false);
  pass('known accounts: with AIW_LOCAL_ACCOUNTS a grant to an unknown account is refused; hosted, where there is no registry, grants are unchanged');

  // 8. An organisation release signature is verified with HMAC verify (constant time, B2-24): the exact payload passes,
  // an altered payload, an altered or malformed signature, and a release of another organisation do not.
  const {createHmac, randomBytes} = await import('node:crypto');
  const signingKey = randomBytes(32);
  await env.FILES.put('organizations/org-test/signing-key', signingKey);
  const payload = {organizationId: 'org-test', id: 'REL-1', entries: [{kind: 'pattern', title: 'Synthetic pattern'}]};
  const release = {...payload, signature: createHmac('sha256', signingKey).update(JSON.stringify(payload)).digest('hex')};
  assert.equal(await verifyOrganizationRelease(env, release), true, 'the signed payload verifies');
  assert.equal(await verifyOrganizationRelease(env, {...release, entries: [{kind: 'pattern', title: 'Altered'}]}), false, 'an altered payload does not');
  assert.equal(await verifyOrganizationRelease(env, {...release, signature: release.signature.replace(/^./, (c) => c === '0' ? '1' : '0')}), false, 'an altered signature does not');
  assert.equal(await verifyOrganizationRelease(env, {...release, signature: 'not-a-signature'}), false, 'a malformed signature does not');
  await assert.rejects(() => verifyOrganizationRelease(env, {...release, organizationId: 'org-without-key'}), /signing key is unavailable/);
  pass('organisation releases: the signature is checked with HMAC verify; altered payloads and signatures, malformed signatures and another organisation\'s release are refused');

  // 9. The project list reads the stored summary (B2-19): the same entries as parsing every document, and a row written
  // before the summary column is still listed from its document.
  const listed = (await api('/api/projects')).data.projects;
  const rows = (await env.DB.prepare('SELECT document,summary,revision,updated_at FROM projects WHERE owner_id=?').bind('owner').all()).results;
  assert(rows.length >= 2 && rows.every((r) => r.summary), 'every row the API wrote carries its summary');
  // The stored summary also carries the card's readiness line and next milestone (round 2, I2-23), worked out from the
  // whole document when it was saved; the rest is exactly what parsing the stored document gives (changed with I2-23).
  for (const row of rows) {
    const {readiness, ...entry} = listed.find((p) => p.id === JSON.parse(row.document).id);
    assert.deepEqual(entry, {...projectSummary(row), role: 'owner'}, 'the summary lists what the document would');
    assert.ok(readiness && typeof readiness.summary === 'string' && readiness.summary && Number.isInteger(readiness.blockers) && typeof readiness.ready === 'boolean' && readiness.at && Number.isInteger(readiness.revision), 'the card reads its readiness from the summary');
    assert.ok(readiness.next === null || (Number.isInteger(readiness.next.chapter) && typeof readiness.next.name === 'string'), 'and its next milestone');
  }
  // The reading is made at most once a minute (READINESS_EVERY_MS): a save within the minute keeps the previous one,
  // which names its revision and time; a later save makes a new one (added with I2-23).
  {
    const doc = createProject({name: 'Readiness', template: 'blank'}, 'readiness-check'), text = JSON.stringify(doc), t0 = Date.parse('2026-10-01T10:00:00.000Z');
    const first = JSON.parse(storedSummary(text, doc, {at: new Date(t0).toISOString(), revision: 1}));
    const soon = JSON.parse(storedSummary(text, doc, {previous: JSON.stringify(first), at: new Date(t0 + READINESS_EVERY_MS - 1000).toISOString(), revision: 2}));
    const later = JSON.parse(storedSummary(text, doc, {previous: JSON.stringify(first), at: new Date(t0 + READINESS_EVERY_MS + 1000).toISOString(), revision: 3}));
    assert.deepEqual([first.readiness.revision, soon.readiness.revision, later.readiness.revision], [1, 1, 3]);
    assert.deepEqual(first.readiness.next, {chapter: 1, name: 'Confirm the project brief'});
    assert.equal(first.readiness.ready, false);
  }
  await env.DB.prepare('UPDATE projects SET summary=NULL WHERE owner_id=? AND id=?').bind('owner', created.data.document.id).run();
  const legacy = (await api('/api/projects')).data.projects.find((p) => p.id === created.data.document.id);
  assert.equal(legacy.name, 'Private project for the outsider checks'); assert.equal(legacy.role, 'owner');
  assert.deepEqual((await api('/api/projects', {actor: 'editor'})).data.projects.map((p) => [p.id, p.role]), [[id, 'editor']], 'a member lists the shared project with its role');
  pass('project list: GET /api/projects reads the stored summary written with each save and lists exactly what parsing each document would; rows without a summary are still listed from the document');

  // 10. Idempotency beyond commands (B2-20): a retried discussion with the same key is answered from its receipt and
  // opens one thread; the same key for another request is refused; a failed request releases its key; another caller's
  // key is its own; a stale in-progress claim is taken over.
  const object = encodeURIComponent(requirement.id), discussionsAt = '/api/discussions' + p + '&object=' + object;
  const basis = (await api(discussionsAt)).data.object.basis, threadsBefore = (await api(discussionsAt)).data.threads.length;
  const keyed = (key, body, actor = 'reviewer') => api(discussionsAt, {actor, body, headers: {'Idempotency-Key': key}});
  const ask = {action: 'create', title: 'Retried question', text: 'Synthetic question sent twice.', basis};
  const firstAsk = await keyed('route-key-000000000001', ask);
  assert.equal(firstAsk.status, 200, JSON.stringify(firstAsk.data)); assert.equal(firstAsk.headers.get('idempotency-replayed'), null);
  const retried = await keyed('route-key-000000000001', ask);
  assert.equal(retried.status, 200); assert.equal(retried.headers.get('idempotency-replayed'), 'true'); assert.deepEqual(retried.data, firstAsk.data, 'the retry is answered with the saved outcome');
  assert.equal((await api(discussionsAt)).data.threads.length, threadsBefore + 1, 'one thread, not two');
  r = await keyed('route-key-000000000001', {...ask, title: 'Another question'});
  assert.equal(r.status, 422); assert.equal(r.data.code, 'key_reused');
  r = await keyed('route-key-000000000002', {...ask, basis: 'stale'});
  assert.equal(r.status, 400, 'a refused request'); r = await keyed('route-key-000000000002', ask);
  assert.equal(r.status, 200, 'releases its key: the corrected request with the same key is applied'); assert.equal(r.headers.get('idempotency-replayed'), null);
  r = await keyed('route-key-000000000001', ask, 'editor');
  assert.equal(r.status, 200); assert.equal(r.headers.get('idempotency-replayed'), null, 'another caller\'s key is its own');
  assert.equal((await keyed('short', ask)).status, 400, 'a malformed key is refused');
  await env.DB.prepare("INSERT INTO route_receipts (actor_id,project_id,route,key,request_hash,status,response,created_at) VALUES ('reviewer',?,'/api/discussions','route-key-000000000003','x',0,NULL,?)").bind(id, new Date().toISOString()).run();
  r = await keyed('route-key-000000000003', ask);
  assert.equal(r.status, 422, 'a claim for a different request body is refused, in progress or not');
  const claimHash = async (body) => { const sent = await keyed('route-key-000000000004', body); return sent; };
  await env.DB.prepare("INSERT INTO route_receipts (actor_id,project_id,route,key,request_hash,status,response,created_at) SELECT actor_id,project_id,route,'route-key-000000000004',request_hash,0,NULL,? FROM route_receipts WHERE actor_id='reviewer' AND key='route-key-000000000001'").bind(new Date().toISOString()).run();
  r = await claimHash(ask);
  assert.equal(r.status, 409); assert.equal(r.data.code, 'in_progress', 'a request still in progress is not run twice');
  await env.DB.prepare("UPDATE route_receipts SET created_at=? WHERE key='route-key-000000000004'").bind(new Date(Date.now() - 180000).toISOString()).run();
  r = await claimHash(ask);
  assert.equal(r.status, 200, 'a claim abandoned for over two minutes is taken over: ' + JSON.stringify(r.data));
  // A binary attachment with a key: the retry (which would otherwise meet the revision check) returns the first
  // attachment, and one file is stored.
  const attachRevision = (await api('/api/project')).data.revision;
  const attachOnce = () => api('/api/attachments' + p + '&revision=' + attachRevision + '&filename=retried.pdf&title=Retried%20evidence&excerpt=Synthetic%20excerpt', {actor: 'editor', bytes: new TextEncoder().encode('synthetic evidence bytes'), headers: {'Idempotency-Key': 'route-key-attach-0001'}});
  const attachedOnce = await attachOnce(), attachedAgain = await attachOnce();
  assert.equal(attachedOnce.status, 201, JSON.stringify(attachedOnce.data)); assert.equal(attachedAgain.status, 201, JSON.stringify(attachedAgain.data)); assert.equal(attachedAgain.headers.get('idempotency-replayed'), 'true');
  assert.equal(attachedAgain.data.id, attachedOnce.data.id, 'the same attachment');
  assert.equal((await env.DB.prepare("SELECT COUNT(*) AS n FROM project_attachments WHERE filename='retried.pdf'").bind().first()).n, 1, 'one stored attachment');
  pass('route receipts: a retried POST with the same Idempotency-Key is answered from its receipt (one thread, Idempotency-Replayed), a reused key for another request is refused, a refused request releases its key, keys are per caller, an in-progress claim answers 409 and an abandoned one is taken over; a retried binary attachment stores one file');
} finally {
  console.error = stderr;
  env.DB.close();
  rmSync(scratch, {recursive: true, force: true});
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
