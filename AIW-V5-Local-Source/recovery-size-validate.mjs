// Recovery at size (round 12, A3: GR-STO-03, GR-STO-04). Before this round a recovery package was one JSON text,
// compressed and encoded in one request: it stopped at 64 MB expanded and 12 MiB on the way in, so a drafted design (125 MB
// of project) could neither leave AIW nor come back; and every import revision kept a whole copy of the mapped workbook,
// counted against a fixed 7 MiB budget, so a second revision of a large workbook broke portable recovery. A package
// (aiw.recovery.v2, recovery-package.js) is now NDJSON entries with a manifest last, each entry with its SHA-256, limited
// per entry, streamed out and sent in in as many requests as it takes; a dataset's later revisions are stored as the
// cells that changed (intake-service.js). Synthetic data only (no client text), in process through the Worker route:
//   A. the synthetic drafted design (the 500-per-chapter scale project with 4,000 changes, a quality conflict whose
//      free-text effect quotes, a frozen baseline and a 7 MiB attachment): its package streams entry by entry, beyond
//      the old 64 MB and 12 MiB, no entry over its limit; it is sent back in entries (no request over 12 MiB), previewed
//      and restored; the package assembles to the project exactly, and the restored project is the project — every
//      section character for character, the restore's documented changes aside (its identity, workspace and imported
//      authority), the baseline's parts the same by their SHA-256, the attachment the same bytes, the conflict's effect
//      as written (markup in an enumerated value still refused). Tampering is refused: an entry altered, out of order or
//      missing, a manifest altered, an entry over its limit; a package left unfinished is swept;
//   B. a dataset imported three times (the synthetic workbook, then two amended revisions: rows changed, added, moved and
//      removed): the first revision is stored whole and the later two as cell deltas, each read back exactly as its
//      workbook maps; the package carries them as stored, restores, and each revision of the restored project reads back
//      the same, and a fourth revision imported there is stored as a delta of the restored third.
// Timings are reported against bounds about three times this machine's measurement. Run alone (release-checks.mjs
// EXCLUSIVE). Run: npm run test:recovery-size
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync} from 'node:fs';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {buildScaleProject} from './scripts/build-scale-fixture.mjs';
import {addSyntheticJournal} from './scripts/synthetic-journal.mjs';
import {syntheticWorkbook, SHEET, HEADER_ROW} from './scripts/synthetic-workbook.mjs';
import {withFinalReview, reviewDesignStamp, registerSDDBuilder} from './public/review-domain.js';
import {openWorkbook} from './public/workbook-reader.js';
import {mapWorkbookRows} from './public/intake-domain.js';
import {readStoredProject, wholeProject} from './project-storage.js';
import {RECOVERY_V2, ENTRY_CHARS, FILE_PART_BYTES, checkManifest, assemblePackage} from './recovery-package.js';
import {SNAPSHOT_DELTA, applySnapshotDelta} from './intake-service.js';
import {neutraliseImportedAuthority} from './recovery-service.js';
import {runRetention, retentionPolicy} from './retention.js';
import {sha256, canonical} from './public/brain-integrity.js';
import {documentSafetyProblems} from './shared/document-safety.js';

// Measured on this machine with other suites running (2026-10-08): export 11.9-23.2 s (the first entry after 4.5-5.8 s),
// sending 12.9-19.1 s, preview 7.8-9.5 s, restore 11.5-21.5 s, an import of 1,400 rows 1.9-3.5 s.
const BUDGET = {export: 60000, firstEntry: 15000, send: 60000, preview: 30000, restore: 60000, import: 10000}, REQUEST_BYTES = 12 * 1024 * 1024, SEND_BYTES = 10 * 1024 * 1024;
const checks = [], timings = {}, sizes = {}, began = Date.now();
const pass = name => { checks.push(name); console.log('PASS', name, '(' + Math.round((Date.now() - began) / 1000) + ' s)'); };
const within = (name, ms, bound) => { timings[name] = ms; assert(ms <= bound, `${name} took ${ms} ms (bound ${bound} ms)`); };
const sentBytes = value => Buffer.byteLength(JSON.stringify(value));
const hex = bytes => createHash('sha256').update(bytes).digest('hex');

// The frozen SDD here is the registers as assembled (review-domain.js, without the figure-drawing builder): this suite
// measures recovery, and test:baseline-size the freeze with its figures.
registerSDDBuilder(null);

// ---------------------------------------------------------------- the design (the size-and-speed suite's)
const sources = () => { const files = ['scripts/build-scale-fixture.mjs', ...['public', 'shared'].flatMap(dir => readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => dir + '/' + f))]; const h = createHash('sha256'); for (const f of files) h.update(f + '\0' + readFileSync(f, 'utf8') + '\0'); return h.digest('hex').slice(0, 16); };
const cacheDir = '.aiw-local/scale-fixture', cached = cacheDir + '/scale-500-' + sources() + '.json';
let raw;
if (existsSync(cached)) raw = readFileSync(cached, 'utf8');
else { raw = JSON.stringify((await buildScaleProject({perChapter: 500})).document); mkdirSync(cacheDir, {recursive: true}); for (const f of readdirSync(cacheDir)) if (f.startsWith('scale-500-')) rmSync(cacheDir + '/' + f, {force: true}); writeFileSync(cached, raw); }
const design = withFinalReview(JSON.parse(raw)), history = addSyntheticJournal(design, {events: 4000, sources: 1500, items: 25, reviewed: 0.02, seed: 12});
design.id = 'project-recovery-size'; design.name = 'Recovery at size · synthetic';

const dir = await mkdtemp(tmpdir() + '/aiw-recovery-size-'), filesDir = path.join(dir, 'files');
const env = {DB: localDatabase(path.join(dir, 'project.sqlite')), FILES: localFiles(filesDir), ASSETS: {fetch: () => new Response('ok')}};
const owner = 'local-architect', origin = 'https://aiw.test', id = design.id;
const request = (route, init = {}) => worker.fetch(new Request(origin + route, {...init, headers: {'oai-authenticated-user-id': owner, Origin: origin, ...init.headers}}), env);
const call = async (route, body) => { const t = performance.now(); const r = await request(route, body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {}); const text = await r.text(); return {status: r.status, ms: Math.round(performance.now() - t), text, data: (() => { try { return JSON.parse(text); } catch { return null; } })()}; };
const ok = (r, status) => { if (status) assert.equal(r.status, status, r.text.slice(0, 400)); else assert(r.status >= 200 && r.status < 300, r.status + ' ' + r.text.slice(0, 400)); return r.data; };
const postBytes = async (route, bytes) => { const r = await request(route, {method: 'POST', body: bytes}); const text = await r.text(); return {status: r.status, text, data: JSON.parse(text)}; };
const rowOf = async project => (await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner, project).first());
// A project as a recovery package carries it: its baselines and journal whole (project-storage.js wholeProject).
const whole = async project => { const stored = await readStoredProject(env, owner, (await rowOf(project)).document); return wholeProject(env, owner, project, withFinalReview(stored.document), stored.keys); };

// The export, read as it streams: its lines, how soon the first arrived and the largest piece written at once.
async function exportPackage(project) {
  const t = performance.now(), r = await request('/api/recovery?project=' + project + '&action=export');
  assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /^application\/x-ndjson/);
  const reader = r.body.getReader(), decoder = new TextDecoder(), lines = [];
  let first = null, rest = '', pieces = 0, largest = 0, chars = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    first ??= Math.round(performance.now() - t); pieces++; largest = Math.max(largest, value.length);
    rest += decoder.decode(value, {stream: true});
    for (let at; (at = rest.indexOf('\n')) >= 0;) { lines.push(rest.slice(0, at)); chars += at + 1; rest = rest.slice(at + 1); }
  }
  assert.equal(rest + decoder.decode(), '', 'the package ends with a whole line');
  return {lines, manifest: JSON.parse(lines.at(-1)), ms: Math.round(performance.now() - t), first, pieces, largest, chars};
}
// A package sent as the workbench sends it (recovery-ui.js): whole when it fits a request, else its manifest and then its
// entry lines in order, in requests of at most SEND_BYTES as sent. Answers what the preview and the restore name.
async function sendPackage(pack) {
  const t = performance.now(), text = pack.lines.join('\n') + '\n';
  if (sentBytes({package: text}) <= 11 * 1024 * 1024) return {source: {package: text}, requests: 0, largest: sentBytes({package: text}), ms: Math.round(performance.now() - t)};
  const begun = ok(await call('/api/recovery?action=upload', {manifest: pack.manifest}), 201);
  let batch = [], size = 0, requests = 1, largest = sentBytes({manifest: pack.manifest});
  const send = async () => { const body = {upload: begun.upload, lines: batch}; largest = Math.max(largest, sentBytes(body)); const r = ok(await call('/api/recovery?action=upload-entries', body)); assert.equal(r.received, Number(/^\{"n":(\d+),/.exec(batch.at(-1))[1])); requests++; batch = []; size = 0; };
  for (const line of pack.lines.slice(0, -1)) { const n = sentBytes(line) + 1; if (size && size + n > SEND_BYTES) await send(); batch.push(line); size += n; }
  await send();
  assert(largest <= REQUEST_BYTES, `a request of ${largest} bytes`);
  return {source: {upload: begun.upload}, requests, largest, ms: Math.round(performance.now() - t)};
}
async function restore(source, name) {
  const t0 = performance.now(), preview = ok(await call('/api/recovery?action=preview', source)), t1 = performance.now();
  const restored = ok(await call('/api/recovery?action=restore', {...source, hash: preview.hash, name, reviewed: true}), 201);
  return {preview, restored, previewMs: Math.round(t1 - t0), restoreMs: Math.round(performance.now() - t1)};
}
const without = (o, keys) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => !keys.includes(k)));

try {
  // ================================================================ A. the synthetic drafted design
  await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind(owner, id, JSON.stringify(design), '2026-10-02T09:00:00.000Z').run();
  ok(await call('/api/project?project=' + id)); // the first read stores the project as this version keeps it
  let held = ok(await call('/api/project?project=' + id));
  // A quality conflict as the architect records it (quality.js): its effect is free text, quoted and on two lines as the
  // drafted design's may be; the restore reads it as text, not as an enumerated value (shared/document-safety.js).
  const EFFECT = 'Both drivers ask one step to answer "at once" and "after every check".\nOne of them waits for the other.', [qa, qb] = held.document.quality.drivers;
  held = ok(await call('/api/commands?project=' + id, {revision: held.revision, command: {type: 'quality.conflict', payload: {driverIds: [qa.id, qb.id], title: 'Synthetic trade-off', effect: EFFECT, owner: '', resolution: '', status: 'open'}}}));
  held = ok(await call('/api/commands?project=' + id, {revision: held.revision, command: {type: 'review.checks', payload: {}}}));
  const requestId = 'recovery-size-freeze-' + Date.now().toString(36);
  ok(await call('/api/baselines?project=' + id + '&action=freeze', {requestId, title: 'Synthetic baseline', reviewed: true, stamp: reviewDesignStamp(withFinalReview(structuredClone(held.document)))}), 202);
  for (let job; ;) { await new Promise(resolve => setTimeout(resolve, 100)); job = ok(await call('/api/baselines?project=' + id + '&action=status&id=' + requestId)).job; if (!['queued', 'running'].includes(job.status)) { assert.equal(job.status, 'completed', job.error || ''); break; } }
  // A 7 MiB attachment of synthetic bytes: three file parts.
  const attachment = new Uint8Array(7 * 1024 * 1024); for (let i = 0, x = 12; i < attachment.length; i++) { x = (x * 1103515245 + 12345) >>> 0; attachment[i] = x >>> 24; }
  const attached = await postBytes('/api/attachments?project=' + id + '&revision=' + (await rowOf(id)).revision + '&filename=' + encodeURIComponent('synthetic-evidence.bin') + '&title=' + encodeURIComponent('Synthetic evidence') + '&excerpt=' + encodeURIComponent('Synthetic bytes for the recovery suite.'), attachment);
  assert(attached.status < 300, attached.text.slice(0, 300));
  const original = await whole(id), originalText = JSON.stringify(original);
  assert.equal(original.finalReview.baselines.length, 1); assert(original.changes.events.length >= history.events);
  pass(`the design: 500 records per chapter, ${original.changes.events.length} changes, a frozen baseline and a 7 MiB attachment: ${(originalText.length / 1e6).toFixed(1)} M characters as a package carries it`);

  // ---------------------------------------------------------------- streamed out, in entries, limited per entry
  const pack = await exportPackage(id), m = pack.manifest;
  within('export (streamed, whole package)', pack.ms, BUDGET.export); within('export (first entry written)', pack.first, BUDGET.firstEntry);
  checkManifest(m); assert.equal(m.schema, RECOVERY_V2); assert.equal(pack.lines.length, m.entries.length + 1);
  assert(pack.chars > 64 * 1024 * 1024 && pack.chars > REQUEST_BYTES, `the package (${pack.chars} characters) is beyond the old 64 MB package and 12 MiB request`);
  for (const e of m.entries) { if (e.kind === 'file') assert(e.bytes <= FILE_PART_BYTES); else assert(e.chars <= ENTRY_CHARS, `entry ${e.n} has ${e.chars} characters`); assert.match(e.sha256, /^[a-f0-9]{64}$/); }
  assert(pack.largest <= Math.max(ENTRY_CHARS, Math.ceil(FILE_PART_BYTES / 3) * 4) + 64, `the stream writes an entry at a time (its largest piece ${pack.largest} bytes)`);
  const file = m.files.find(f => f.kind === 'attachment'); assert.equal(file.parts, 3); assert.equal(file.hash, hex(attachment));
  const assembled = await assemblePackage(m, async n => pack.lines[n - 1]);
  assert.equal(JSON.stringify(assembled.project), originalText, 'the package assembles to the project, character for character');
  assert.equal(hex(assembled.files.find(f => f.kind === 'attachment').data), hex(attachment));
  sizes.package = {chars: pack.chars, entries: m.entries.length, largestEntry: Math.max(...m.entries.map(e => e.chars)), files: m.files.length, pieces: pack.pieces};
  pass(`the package streams: ${m.entries.length} entries (${(pack.chars / 1e6).toFixed(1)} M characters, beyond the old 64 MB and 12 MiB), each with its SHA-256 and at most ${ENTRY_CHARS} characters (a file part ${FILE_PART_BYTES} bytes), written an entry at a time in ${pack.ms} ms, the first after ${pack.first} ms; it assembles to the project exactly`);

  // ---------------------------------------------------------------- tampering refused, limits per entry, sweeping
  const forged = structuredClone(m); forged.entries[0].sha256 = '0'.repeat(64);
  let r = await call('/api/recovery?action=upload', {manifest: forged});
  assert.equal(r.status, 422); assert.match(r.data.error, /checksum/, 'a manifest altered is refused');
  const oversize = structuredClone(m); delete oversize.checksum; oversize.entries[0].chars = ENTRY_CHARS + 1024; oversize.checksum = sha256(canonical(oversize));
  r = await call('/api/recovery?action=upload', {manifest: oversize});
  assert.equal(r.status, 422); assert.match(r.data.error, /cannot carry/, 'an entry beyond its limit is refused, whatever the request');
  const trial = ok(await call('/api/recovery?action=upload', {manifest: m}), 201);
  const digit = 20 + pack.lines[0].slice(20).search(/[0-9]/), altered = pack.lines[0].slice(0, digit) + (pack.lines[0][digit] === '1' ? '2' : '1') + pack.lines[0].slice(digit + 1);
  assert.notEqual(altered, pack.lines[0]); assert.equal(altered.length, pack.lines[0].length);
  r = await call('/api/recovery?action=upload-entries', {upload: trial.upload, lines: [altered]});
  assert.equal(r.status, 422); assert.match(r.data.error, /SHA-256/, 'an entry altered is refused as it arrives');
  r = await call('/api/recovery?action=upload-entries', {upload: trial.upload, lines: [pack.lines[1]]});
  assert.equal(r.status, 409); assert.match(r.data.error, /in order/, 'an entry out of order is refused');
  ok(await call('/api/recovery?action=upload-entries', {upload: trial.upload, lines: [pack.lines[0]]}));
  r = await call('/api/recovery?action=preview', {upload: trial.upload});
  assert.equal(r.status, 400); assert.match(r.data.error, /not complete/, 'a package with entries missing is not previewed');
  const swapped = [...pack.lines]; [swapped[2], swapped[3]] = [swapped[3], swapped[2]];
  await assert.rejects(() => assemblePackage(m, async n => swapped[n - 1]), /out of order/, 'entries swapped are refused');
  const swept = await runRetention(env, retentionPolicy({}), Date.now() + 2 * 86400000);
  assert.equal(swept.recoveryUploads, 1, 'a package left unfinished is swept');
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM recovery_uploads').first()).n, 0);
  pass('tampering is refused: a manifest altered (its checksum), an entry over its limit (whatever the request), an entry altered (its SHA-256, as it arrives), out of order or missing; a package left unfinished is swept with its entries');

  // ---------------------------------------------------------------- sent back in entries and restored
  const sent = await sendPackage(pack);
  within('send (manifest and entries, each checked as it arrives)', sent.ms, BUDGET.send);
  assert(sent.requests > 1, 'the package is sent in entries');
  const back = await restore(sent.source, 'Recovery at size · restored');
  within('preview (staged entries assembled and checked)', back.previewMs, BUDGET.preview); within('restore', back.restoreMs, BUDGET.restore);
  assert.equal(back.preview.baselines, 1); assert.equal(back.preview.files, m.files.length);
  const copy = back.restored.id, restored = await whole(copy), restoredText = JSON.stringify(restored);
  assert.equal(restored.quality.conflicts.find(c => c.title === 'Synthetic trade-off')?.effect, EFFECT, 'a conflict\'s free-text effect restores as written');
  // A conflict's effect is text wherever the quality chapter is held (here, the baseline's frozen source too); the
  // boundary still refuses markup where a value is enumerated: a conflict's status, an effect anywhere else.
  const crafted = {quality: {conflicts: [{effect: EFFECT, status: 'open"><b>'}]}, finalReview: {baselines: [{source: {quality: {conflicts: [{effect: EFFECT}]}}}]}, decisions: {records: [{effects: [{effect: 'supports"><b>'}]}]}};
  assert.deepEqual(documentSafetyProblems(crafted).map(p => p.split(' ')[0]), ['$.quality.conflicts[0].status', '$.decisions.records[0].effects[0].effect'], 'markup in an enumerated value is still refused');
  // Every section the restore does not change by its rules is the same, character for character.
  const changedKeys = [...new Set([...Object.keys(original), ...Object.keys(restored)])].filter(k => JSON.stringify(original[k]) !== JSON.stringify(restored[k]));
  assert.deepEqual(changedKeys.filter(k => !['id', 'name', 'workspace', 'finalReview', 'knowledge', 'workbench'].includes(k)), [], 'every other section restores exactly');
  assert.equal(JSON.stringify(restored.changes.events), JSON.stringify(original.changes.events), 'the change journal, whole');
  // The review restores with its imported authority neutralised (recovery-service.js), and nothing else changed.
  const expected = neutraliseImportedAuthority({finalReview: structuredClone(original.finalReview)}, restored.finalReview.imported.at).finalReview;
  assert.equal(JSON.stringify(restored.finalReview), JSON.stringify(expected), 'the review, its baseline whole, with imported authority neutralised');
  assert.equal(JSON.stringify(without(restored.knowledge, ['pins', 'history', 'repositorySync', 'claims', 'releases'])), JSON.stringify(without(original.knowledge, ['pins', 'history', 'repositorySync', 'claims', 'releases'])));
  assert.equal(JSON.stringify(without(restored.workbench, ['catalogue', 'views'])), JSON.stringify(without(original.workbench, ['catalogue', 'views'])));
  assert.equal(restored.workspace.recovery.originProjectId, id); assert.equal(restored.workspace.recovery.packageHash, m.checksum);
  // The baseline is stored as parts again: the same parts, by their SHA-256.
  const parts = async project => JSON.parse((await rowOf(project)).document).finalReview.baselines[0].frozen.parts;
  const [p0, p1] = [await parts(id), await parts(copy)];
  assert.deepEqual(Object.fromEntries(Object.entries(p1).map(([k, v]) => [k, v.sha256])), Object.fromEntries(Object.entries(p0).map(([k, v]) => [k, v.sha256])), 'the baseline\'s parts restore the same, by their SHA-256');
  ok(await call('/api/baselines?project=' + copy + '&action=verify&id=' + original.finalReview.baselines[0].id));
  const got = await request('/api/attachments?project=' + copy + '&id=' + file.metadata.id);
  assert.equal(got.status, 200); assert.equal(hex(new Uint8Array(await got.arrayBuffer())), hex(attachment), 'the attachment, the same bytes');
  sizes.restored = {chars: restoredText.length, requests: sent.requests, largestRequest: sent.largest};
  pass(`restored identically: sent in ${sent.requests} requests (the largest ${sent.largest} bytes, under 12 MiB) in ${sent.ms} ms, previewed in ${back.previewMs} ms and restored in ${back.restoreMs} ms; every section the same (the review with imported authority neutralised, as the restore rules), the journal whole, the baseline's ${Object.keys(p0).length} parts the same by their SHA-256 and verified, the attachment the same bytes; a quality conflict's free-text effect (quoted, on two lines) restores as written, while markup in an enumerated value is still refused`);

  // ================================================================ B. a dataset with three import revisions
  const project = ok(await call('/api/projects', {name: 'Three revisions · synthetic', template: 'blank'})).document.id;
  // Revision 2: some gaps delivered, rows added in the middle (the rows after them move), rows removed; revision 3: test
  // counts changed and statements reworded. Revision 4 (after the restore): one more row delivered.
  const second = rows => { rows.filter(r => r.status !== 'Delivered').filter((_, i) => i % 9 === 0).forEach(r => Object.assign(r, {status: 'Delivered', band: 'Delivered', score: '0', comments: 'Closed in the second review.'})); rows.splice(500, 0, ...Array.from({length: 12}, (_, k) => ({...rows[500], id: 'ADD-' + String(k + 1).padStart(4, '0'), statement: 'The system shall record the added requirement ' + (k + 1) + ' before posting.', comments: ''}))); rows.splice(1300, 6); };
  const third = rows => { second(rows); rows.filter((_, i) => i % 25 === 0).forEach(r => { r.uatCount = String(Number(r.uatCount) + 1); r.uatPass = String(Number(r.uatPass) + 1); }); rows.filter((_, i) => i % 280 === 7).forEach(r => { r.statement += ' Reworded in the third review.'; }); };
  const fourth = rows => { third(rows); const r = rows.find(x => x.status !== 'Delivered'); Object.assign(r, {status: 'Delivered', band: 'Delivered', score: '0'}); };
  const revisions = [null, second, third].map(amend => syntheticWorkbook(amend ? {amend} : {}));
  const upload = async (target, bytes) => { const r = await postBytes('/api/intake?project=' + target + '&action=upload&filename=' + encodeURIComponent('Synthetic-requirements.xlsx'), bytes); assert.equal(r.status, 201, r.text.slice(0, 300)); return r.data; };
  let dataset = null, mapping = null;
  const importRevision = async (target, bytes, k) => {
    const t = performance.now(), u = await upload(target, bytes);
    if (!mapping) { const inspect = ok(await call('/api/intake?project=' + target + '&action=inspect', {uploadId: u.id, sheet: SHEET})); mapping = {sheet: inspect.sheet, headerRow: inspect.headerRow, mapping: inspect.mapping, priorityMap: inspect.bands.map}; }
    const input = {uploadId: u.id, ...mapping, ...(dataset ? {datasetId: dataset} : {})}, preview = ok(await call('/api/intake?project=' + target + '&action=preview', input));
    // A record whose source moved or changed under the person's edits asks keep or replace: here the source is taken.
    const decisions = Object.fromEntries(preview.changes.filter(c => c.kind === 'conflict').map(c => [c.externalId, 'replace']));
    const applied = ok(await call('/api/intake?project=' + target + '&action=apply', {...input, revision: preview.projectRevision, previewStamp: preview.stamp, reviewed: true, decisions}));
    dataset ??= preview.datasetId; within('import of revision ' + k, Math.round(performance.now() - t), BUDGET.import);
    return {preview, applied};
  };
  for (const [k, w] of revisions.entries()) await importRevision(project, w.bytes, k + 1);
  // Each revision as its workbook maps, read independently of AIW's storage (the whole revision, as stored before).
  const mapped = await Promise.all(revisions.map(async w => mapWorkbookRows(await (await openWorkbook(w.bytes)).sheet(SHEET), HEADER_ROW, mapping.mapping)));
  const versionsOf = async target => (await whole(target)).intake.datasets.find(d => d.id === dataset).versions;
  const versions = await versionsOf(project), stored = await Promise.all(versions.map(async v => (await env.FILES.get(v.snapshotKey)).text()));
  assert.deepEqual(versions.map(v => v.revision), [1, 2, 3]);
  assert(!JSON.parse(stored[0]).schema, 'the first revision is stored whole');
  const replay = []; // each revision read back from what is stored: the first whole, each later one its delta applied
  for (const [k, text] of stored.entries()) {
    const s = JSON.parse(text);
    if (k) { assert.equal(s.schema, SNAPSHOT_DELTA, 'revision ' + (k + 1) + ' is stored as a cell delta'); assert.equal(s.base.revision, k); assert.equal(s.base.sha256, sha256(JSON.stringify(replay[k - 1]))); }
    const source = k ? applySnapshotDelta(replay[k - 1], s) : s;
    if (k) { const t = JSON.stringify(source); assert.equal(t.length, s.chars); assert.equal(sha256(t), s.sha256, 'and makes its revision again, by its SHA-256'); }
    assert.equal(JSON.stringify(source.rows), JSON.stringify(mapped[k].rows), 'revision ' + (k + 1) + ' reads back exactly as its workbook maps'); assert.deepEqual(source.headers, mapped[k].headers);
    replay.push(source);
  }
  const wholeChars = replay.map(s => JSON.stringify(s).length), storedChars = stored.map(t => t.length);
  assert(storedChars[1] < wholeChars[1] / 10 && storedChars[2] < wholeChars[2] / 10, `the deltas are small: ${storedChars} characters stored for revisions of ${wholeChars}`);
  // The rows that changed, moved, were added or removed, as the API reads them.
  const source = async (target, revision, externalId) => ok(await call('/api/intake?project=' + target + '&action=source&dataset=' + dataset + '&revision=' + revision + (externalId ? '&externalId=' + encodeURIComponent(externalId) : '')));
  const ids = mapped.map(x => new Map(x.rows.map(r => [r.externalId, r])));
  const delivered = mapped[1].rows.find(r => r.fields.delivery === 'Delivered' && ids[0].get(r.externalId)?.fields.delivery !== 'Delivered');
  const moved = mapped[1].rows.at(-1), added = ids[1].get('ADD-0001'), removed = mapped[0].rows.find(r => !ids[1].has(r.externalId));
  assert(delivered && added && removed, 'the amended revisions change, add and remove rows');
  const samples = [[1, removed.externalId], [2, delivered.externalId], [2, added.externalId], [2, moved.externalId], [3, delivered.externalId], [3, moved.externalId], [1, moved.externalId], [3, mapped[2].rows[7].externalId]];
  const answers = [];
  for (const [revision, externalId] of samples) { const a = await source(project, revision, externalId); assert.equal(JSON.stringify(a.row), JSON.stringify(mapped[revision - 1].rows.find(r => r.externalId === externalId))); answers.push(a); }
  for (const revision of [1, 2, 3]) answers.push(await source(project, revision));
  assert.equal(ids[1].get(moved.externalId).sourceRow - ids[0].get(moved.externalId).sourceRow, 12 - 6, 'a row after those added and removed moves');
  sizes.revisions = {whole: wholeChars, stored: storedChars};
  pass(`three import revisions: the first stored whole (${storedChars[0]} characters), the second and third as cell deltas (${storedChars[1]} and ${storedChars[2]} characters for revisions of ${wholeChars[1]} and ${wholeChars[2]}); each reads back exactly as its workbook maps, row by row, a moved row's cells at its new place`);

  const bpack = await exportPackage(project), bm = bpack.manifest, snapshots = bm.files.filter(f => f.kind === 'snapshot');
  assert.equal(bm.files.filter(f => f.kind === 'workbook').length, 3); assert.equal(snapshots.length, 3);
  assert.deepEqual(snapshots.map(f => f.bytes), storedChars.map((c, k) => Buffer.byteLength(stored[k])), 'the package carries each revision as it is stored');
  const wholeBytes = replay.reduce((n, s) => n + Buffer.byteLength(JSON.stringify(s)), 0);
  const bsent = await sendPackage(bpack), bback = await restore(bsent.source, 'Three revisions · restored'), bcopy = bback.restored.id;
  const restoredVersions = await versionsOf(bcopy);
  assert.deepEqual(restoredVersions.map(v => v.revision), [1, 2, 3]);
  const rest = JSON.parse((await rowOf(bcopy)).document).workspace.recovery;
  for (const [k, v] of versions.entries()) { const copied = await env.FILES.get(rest.keys[v.snapshotKey]); assert.equal(await copied.text(), stored[k], 'revision ' + (k + 1) + ' restores as stored'); }
  let at = 0;
  for (const [revision, externalId] of samples) { const a = await source(bcopy, revision, externalId); assert.equal(JSON.stringify(a.row), JSON.stringify(answers[at++].row), 'each revision of the restored project reads back the same'); }
  for (const revision of [1, 2, 3]) { const a = await source(bcopy, revision); assert.equal(JSON.stringify(a.rows), JSON.stringify(answers[at++].rows)); }
  // A fourth revision imported into the restored project is a delta of its restored third.
  const w4 = syntheticWorkbook({amend: fourth});
  await importRevision(bcopy, w4.bytes, 4);
  const v4 = (await versionsOf(bcopy)).at(-1), s4 = JSON.parse(await (await env.FILES.get(v4.snapshotKey)).text());
  assert.equal(v4.revision, 4); assert.equal(s4.schema, SNAPSHOT_DELTA); assert.equal(s4.base.revision, 3);
  const m4 = mapWorkbookRows(await (await openWorkbook(w4.bytes)).sheet(SHEET), HEADER_ROW, mapping.mapping), changed = m4.rows.find(r => r.fields.delivery === 'Delivered' && ids[2].get(r.externalId)?.fields.delivery !== 'Delivered');
  assert.equal(JSON.stringify((await source(bcopy, 4, changed.externalId)).row), JSON.stringify(changed));
  sizes.threeRevisions = {packageChars: bpack.chars, files: bm.files.length, snapshotBytes: snapshots.map(f => f.bytes), wholeRevisionBytes: wholeBytes};
  assert(wholeBytes > 7 * 1024 * 1024, 'three whole revisions would exceed the 7 MiB budget of a package written before round 12');
  pass(`the dataset exports (${bm.files.length} files: 3 workbooks and 3 revisions as stored, ${(snapshots.reduce((n, f) => n + f.bytes, 0) / 1e6).toFixed(2)} MB where whole revisions would be ${(wholeBytes / 1e6).toFixed(2)} MB, beyond the 7 MiB budget a package had before round 12) and restores: each revision restores as stored and reads back the same; a fourth revision imported into the restored project is a delta of its restored third`);
} finally {
  try { env.DB.close(); } catch { /* closed */ }
  await rm(dir, {recursive: true, force: true});
}
console.log(JSON.stringify({passed: checks.length, timings, sizes, checks}, null, 1));
