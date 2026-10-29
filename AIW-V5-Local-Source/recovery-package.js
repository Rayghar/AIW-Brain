// The recovery package in entries (round 12, A3: GR-STO-03, GR-STO-04). A recovery package carried the whole project as
// one JSON text, compressed and encoded in one request: it stopped at 64 MB expanded and 12 MiB on the way in, so a
// drafted design (125 MB of project) could neither leave AIW nor come back. A package (schema aiw.recovery.v2) is now
// NDJSON, one line per entry and a last line, the manifest, that lists every entry with its SHA-256:
//   - the project, split into entries of at most ENTRY_CHARS characters of JSON each: a part of it that fits whole is one
//     entry, an object larger than that is split by its keys, an array into runs of its items, a string into slices,
//     each with the path where it sits, so the project reassembles exactly, key for key and character for character;
//   - the audit record (reviews, discussions, activity), the same way;
//   - each original file (workbooks, source snapshots, attachments) in parts of at most FILE_PART_BYTES bytes, as
//     base64, each part's SHA-256 over its bytes and the file's over all of them.
// An entry line is {"n":<number>,"value":<JSON>}: its SHA-256 is of the JSON text exactly as the line carries it. The
// manifest names the package (schema, time, revision, project, authority), its files and its entries, and its own
// SHA-256 over all of that (checksum). Limits are per entry — ENTRY_CHARS of JSON, FILE_PART_BYTES of a file — with a
// ceiling on the whole (MAX_ENTRIES, MAX_PACKAGE_CHARS), not per request: an export streams entry by entry, and an
// import sends its entries in as many requests as it takes (recovery-service.js), each checked as it arrives.
// Tampering is detected: an entry that does not match its SHA-256, a manifest that does not match its checksum, an entry
// missing, added or out of place, or a file whose parts do not make its SHA-256 is refused.
import {sha256, canonical} from './public/brain-integrity.js';
import {integrityError} from './error-message.js';

// An entry of ENTRY_CHARS characters, sent in the JSON of a request (where a quote or a backslash takes two characters)
// as UTF-8 (at most three bytes a character), stays within one 12 MiB request: 9 MiB at worst. A file part of
// FILE_PART_BYTES is 4 MiB of base64.
export const RECOVERY_V2 = 'aiw.recovery.v2', ENTRY_CHARS = 3 * 1024 * 1024, FILE_PART_BYTES = 3 * 1024 * 1024;
export const MAX_ENTRIES = 32768, MAX_PACKAGE_CHARS = 2 * 1024 * 1024 * 1024, MAX_FILES = 2000;
const SHA = /^[a-f0-9]{64}$/, FORMS = new Set(['value', 'fields', 'items', 'text']), KINDS = new Set(['project', 'audit', 'file']);
const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v);
// A key set as an own property, never through a setter (a key named __proto__ stays a key, as JSON.parse makes it).
const put = (o, k, v) => { if (k === '__proto__') Object.defineProperty(o, k, {value: v, enumerable: true, writable: true, configurable: true}); else o[k] = v; };
const merge = (o, fields) => { for (const k of Object.keys(fields)) put(o, k, fields[k]); };

// ---------------------------------------------------------------- splitting a value into entries
// The entries of value at path, each at most limit characters of JSON: {path, form, from?, count?, text}. Forms:
//   value  — the value whole at path;
//   fields — some consecutive keys of the object at path (merged into it in order);
//   items  — a run of the array at path, from its index `from` (appended in order);
//   text   — a slice of the string at path, from its character `from` (appended in order).
// Assembling the entries in order (assembleEntry) gives back a value whose JSON is the JSON of the value, exactly.
// whole: the value's JSON when the caller has it already (each level is written once, not once more per level below).
export function* splitValue(value, path = [], limit = ENTRY_CHARS, whole = JSON.stringify(value)) {
  if (whole === undefined) return;
  if (whole.length <= limit || value === null || typeof value !== 'object' && typeof value !== 'string') { yield {path, form: 'value', text: whole}; return; }
  if (typeof value === 'string') {
    // A slice never ends between the two halves of a surrogate pair, so each slice is a well-formed string.
    const step = Math.max(1, Math.floor(limit / 6));
    for (let from = 0; from < value.length;) { let to = Math.min(value.length, from + step); const c = value.charCodeAt(to - 1); if (to < value.length && c >= 0xD800 && c <= 0xDBFF) to--; yield {path, form: 'text', from, text: JSON.stringify(value.slice(from, to))}; from = to; }
    return;
  }
  if (Array.isArray(value)) {
    let run = [], size = 2, from = 0;
    const flush = function* () { if (run.length) yield {path, form: 'items', from, count: run.length, text: '[' + run.join(',') + ']'}; from += run.length; run = []; size = 2; };
    for (let i = 0; i < value.length; i++) {
      const t = JSON.stringify(value[i]) ?? 'null';
      if (t.length + 2 > limit) { yield* flush(); yield* splitValue(value[i], [...path, i], limit, t); from = i + 1; continue; }
      if (run.length && size + t.length + 1 > limit) yield* flush();
      run.push(t); size += t.length + (run.length > 1 ? 1 : 0);
    }
    yield* flush();
    if (!value.length) yield {path, form: 'value', text: '[]'};
    return;
  }
  // An object: consecutive keys whose values fit are carried together; a key whose value does not is split on its own.
  let fields = [], size = 2;
  const flush = function* () { if (fields.length) yield {path, form: 'fields', text: '{' + fields.join(',') + '}'}; fields = []; size = 2; };
  let any = false;
  for (const k of Object.keys(value)) {
    const t = JSON.stringify(value[k]);
    if (t === undefined) continue;
    any = true;
    const pair = JSON.stringify(k) + ':' + t;
    if (pair.length + 2 > limit) { yield* flush(); yield* splitValue(value[k], [...path, k], limit, t); continue; }
    if (fields.length && size + pair.length + 1 > limit) yield* flush();
    fields.push(pair); size += pair.length + (fields.length > 1 ? 1 : 0);
  }
  yield* flush();
  if (!any) yield {path, form: 'value', text: '{}'};
}
// The container at path in root, created as it is first reached (an index makes an array, a key an object).
function containerAt(root, path) {
  let at = root;
  for (let i = 0; i < path.length; i++) {
    const k = path[i], next = path[i + 1], make = () => (typeof next === 'number' ? [] : {});
    if (i === path.length - 1) return {holder: at, key: k};
    if (Array.isArray(at)) { if (typeof k !== 'number' || k > at.length) throw integrityError('The recovery package\'s entries are out of order.'); if (k === at.length) at.push(make()); at = at[k]; }
    else { if (typeof k !== 'string') throw integrityError('The recovery package\'s entries are out of order.'); if (!Object.hasOwn(at, k)) put(at, k, make()); at = at[k]; }
    if (!at || typeof at !== 'object') throw integrityError('The recovery package\'s entries are out of order.');
  }
  return null;
}
const own = (o, k) => (Array.isArray(o) ? k < o.length : Object.hasOwn(o, k));
// One entry assembled into box.value (the root at path []), in package order.
export function assembleEntry(box, entry, value) {
  const {path, form} = entry;
  if (!path.length) {
    if (form === 'value') { if (box.value !== undefined) throw integrityError('The recovery package\'s entries are out of order.'); box.value = value; return; }
    if (form === 'fields') { if (box.value === undefined) box.value = {}; if (!isPlain(box.value)) throw integrityError('The recovery package\'s entries are out of order.'); merge(box.value, value); return; }
    if (form === 'items') { if (box.value === undefined) box.value = []; if (!Array.isArray(box.value) || box.value.length !== entry.from) throw integrityError('The recovery package\'s entries are out of order.'); box.value.push(...value); return; }
    if (box.value === undefined) box.value = ''; if (typeof box.value !== 'string' || box.value.length !== entry.from) throw integrityError('The recovery package\'s entries are out of order.'); box.value += value; return;
  }
  if (box.value === undefined) box.value = typeof path[0] === 'number' ? [] : {};
  const {holder, key} = containerAt(box.value, path);
  const set = v => { if (Array.isArray(holder)) { if (key !== holder.length) throw integrityError('The recovery package\'s entries are out of order.'); holder.push(v); } else put(holder, key, v); };
  if (form === 'value') { if (own(holder, key)) throw integrityError('The recovery package\'s entries are out of order.'); set(value); return; }
  if (form === 'fields') { if (!own(holder, key)) set({}); if (!isPlain(holder[key])) throw integrityError('The recovery package\'s entries are out of order.'); merge(holder[key], value); return; }
  if (form === 'items') { if (!own(holder, key)) set([]); if (!Array.isArray(holder[key]) || holder[key].length !== entry.from) throw integrityError('The recovery package\'s entries are out of order.'); holder[key].push(...value); return; }
  if (!own(holder, key)) set(''); if (typeof holder[key] !== 'string' || holder[key].length !== entry.from) throw integrityError('The recovery package\'s entries are out of order.'); put(holder, key, holder[key] + value);
}

// ---------------------------------------------------------------- writing a package
const base64 = bytes => { let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(binary); };
const unbase64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const bytesHash = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
// The lines of a package, the manifest last: parts = {project, audit}; files = [{kind, key, originalKey?, metadata?,
// read: async () => Uint8Array}]; head = {at, revision, project: {id, name}, authority}. Each line is produced when it is
// asked for, so a package streams with no more of it in memory than one entry.
export async function* packageLines(head, parts, files) {
  const entries = [], fileList = [];
  let n = 0, chars = 0;
  const line = text => '{"n":' + n + ',"value":' + text + '}\n';
  for (const kind of ['project', 'audit']) {
    for (const e of splitValue(parts[kind], [], ENTRY_CHARS)) {
      if (++n > MAX_ENTRIES) throw Error('This project exceeds the recovery package\'s entry ceiling. Use a database and files backup.');
      chars += e.text.length; if (chars > MAX_PACKAGE_CHARS) throw Error('This project exceeds the recovery package\'s ceiling. Use a database and files backup.');
      entries.push({n, kind, path: e.path, form: e.form, ...(e.from !== undefined ? {from: e.from} : {}), ...(e.count !== undefined ? {count: e.count} : {}), chars: e.text.length, sha256: sha256(e.text)});
      yield line(e.text);
    }
  }
  for (const [index, f] of files.entries()) {
    if (index >= MAX_FILES) throw Error('This project holds more original files than a recovery package carries. Use a database and files backup.');
    const bytes = await f.read(), parts = Math.max(1, Math.ceil(bytes.length / FILE_PART_BYTES));
    fileList.push({kind: f.kind, key: f.key, ...(f.originalKey ? {originalKey: f.originalKey} : {}), ...(f.metadata !== undefined ? {metadata: f.metadata} : {}), hash: await bytesHash(bytes), bytes: bytes.length, parts});
    for (let k = 0; k < parts; k++) {
      const slice = bytes.subarray(k * FILE_PART_BYTES, (k + 1) * FILE_PART_BYTES), text = JSON.stringify(base64(slice));
      if (++n > MAX_ENTRIES) throw Error('This project exceeds the recovery package\'s entry ceiling. Use a database and files backup.');
      entries.push({n, kind: 'file', file: index, part: k, from: k * FILE_PART_BYTES, bytes: slice.length, chars: text.length, sha256: await bytesHash(slice)});
      yield line(text);
    }
  }
  const manifest = {schema: RECOVERY_V2, ...head, files: fileList, entries};
  yield JSON.stringify({...manifest, checksum: sha256(canonical(manifest))}) + '\n';
}

// ---------------------------------------------------------------- reading a package
// The manifest, checked: its shape, its limits and its checksum. Throws an integrity error for a tampered one.
export function checkManifest(m) {
  if (!isPlain(m) || m.schema !== RECOVERY_V2 || !Array.isArray(m.entries) || !Array.isArray(m.files)) throw Error('Choose an AIW recovery package.');
  const {checksum, ...rest} = m;
  if (typeof checksum !== 'string' || checksum !== sha256(canonical(rest))) throw integrityError('The recovery package\'s manifest does not match its checksum.');
  if (!m.entries.length || m.entries.length > MAX_ENTRIES || m.files.length > MAX_FILES) throw Error('This recovery package exceeds its entry ceiling.');
  let chars = 0;
  m.entries.forEach((e, i) => {
    if (!isPlain(e) || e.n !== i + 1 || !KINDS.has(e.kind) || !SHA.test(e.sha256 || '') || !Number.isInteger(e.chars) || e.chars < 1) throw integrityError('The recovery package\'s manifest lists an entry it cannot carry.');
    if (e.kind === 'file') { const f = m.files[e.file]; if (!f || !Number.isInteger(e.part) || e.part < 0 || e.part >= f.parts || !Number.isInteger(e.bytes) || e.bytes < 0 || e.bytes > FILE_PART_BYTES || e.chars > Math.ceil(FILE_PART_BYTES / 3) * 4 + 2) throw integrityError('The recovery package\'s manifest lists a file part it cannot carry.'); }
    else if (!Array.isArray(e.path) || e.path.some(k => typeof k !== 'string' && !(Number.isInteger(k) && k >= 0)) || !FORMS.has(e.form) || e.chars > ENTRY_CHARS + 2) throw integrityError('The recovery package\'s manifest lists an entry it cannot carry.');
    chars += e.chars;
  });
  if (chars > MAX_PACKAGE_CHARS) throw Error('This recovery package exceeds its ceiling.');
  for (const [i, f] of m.files.entries()) if (!isPlain(f) || !['workbook', 'snapshot', 'attachment'].includes(f.kind) || typeof f.key !== 'string' || !SHA.test(f.hash || '') || !Number.isInteger(f.bytes) || f.bytes < 0 || f.parts !== Math.max(1, Math.ceil(f.bytes / FILE_PART_BYTES)) || m.entries.filter(e => e.kind === 'file' && e.file === i).length !== f.parts) throw integrityError('The recovery package\'s manifest lists a file it cannot carry.');
  return m;
}
// One entry line, checked against the manifest: its number (the one expected, when the caller reads in order), its
// length and its SHA-256. Answers its JSON value.
export async function checkLine(m, text, expected) {
  const match = /^\{"n":(\d+),"value":/.exec(text);
  if (!match || !text.endsWith('}')) throw integrityError('A recovery package entry could not be read.');
  if (expected !== undefined && Number(match[1]) !== expected) throw integrityError('The recovery package\'s entries are out of order.', 'entry:' + expected);
  const e = m.entries[Number(match[1]) - 1], body = text.slice(match[0].length, -1);
  if (!e || e.n !== Number(match[1]) || body.length !== e.chars) throw integrityError('A recovery package entry does not match its manifest.', 'entry:' + match[1]);
  let value;
  try { value = JSON.parse(body); } catch { throw integrityError('A recovery package entry could not be read.', 'entry:' + e.n); }
  if (e.kind === 'file') { if (typeof value !== 'string') throw integrityError('A recovery package file part could not be read.', 'entry:' + e.n); const bytes = unbase64(value); if (bytes.length !== e.bytes || await bytesHash(bytes) !== e.sha256) throw integrityError('A recovery package file part does not match its SHA-256.', 'entry:' + e.n); return {entry: e, value: bytes}; }
  if (sha256(body) !== e.sha256) throw integrityError('A recovery package entry does not match its SHA-256.', 'entry:' + e.n);
  return {entry: e, value};
}
// The package assembled from its checked entries, read in order by line(n) (async): {manifest, project, audit, files}
// with each file's bytes, its SHA-256 checked over all its parts.
export async function assemblePackage(m, line) {
  const boxes = {project: {value: undefined}, audit: {value: undefined}}, files = m.files.map(f => ({...f, chunks: []}));
  for (const e of m.entries) {
    const {value} = await checkLine(m, await line(e.n), e.n);
    if (e.kind === 'file') { const f = files[e.file]; if (f.chunks.length !== e.part) throw integrityError('The recovery package\'s file parts are out of order.', 'entry:' + e.n); f.chunks.push(value); continue; }
    assembleEntry(boxes[e.kind], e, value);
  }
  const out = [];
  for (const f of files) {
    const bytes = new Uint8Array(f.bytes);let at = 0;
    for (const c of f.chunks) { if (at + c.length > bytes.length) throw integrityError('A recovered file does not match its size.', f.key); bytes.set(c, at); at += c.length; }
    if (at !== f.bytes || await bytesHash(bytes) !== f.hash) throw integrityError('A recovered file does not match its SHA-256.', f.key);
    const {chunks: _c, parts: _p, ...meta} = f;
    out.push({...meta, data: bytes});
  }
  if (!isPlain(boxes.project.value)) throw Error('The recovery package carries no project.');
  return {manifest: m, project: boxes.project.value, audit: isPlain(boxes.audit.value) ? boxes.audit.value : {}, files: out};
}
// Where an entry of a package being sent in entries is kept until it is restored or swept (recovery-service.js).
export const stagingKey = (actor, upload, n) => 'recovery-staging/' + encodeURIComponent(actor) + '/' + upload + '/' + n + '.json';
// A whole package text (NDJSON): its manifest (the last line) and its entry lines by number.
export function packageText(text) {
  if (typeof text !== 'string') throw Error('Choose an AIW recovery package.');
  const lines = text.split('\n').filter(l => l.length);
  if (lines.length < 2) throw Error('Choose an AIW recovery package.');
  let manifest;
  try { manifest = JSON.parse(lines.at(-1)); } catch { throw Error('Choose an AIW recovery package.'); }
  checkManifest(manifest);
  if (lines.length - 1 !== manifest.entries.length) throw integrityError('The recovery package does not hold the entries its manifest lists.');
  return {manifest, line: async n => lines[n - 1]};
}
