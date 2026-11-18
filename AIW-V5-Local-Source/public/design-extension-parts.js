// What the server, and only the server, reads of the design packages (rc44, slice S0; design-extensions.js holds the
// registry and the contract): the read upgrade steps, the document sections placed at their anchors, and the check
// that a package states its parts as the contract asks and takes nothing that is built in or another package's. Pure.
// No client module imports this file (the browser upgrades no document, assembles none and trusts the package code the
// server checked when it started), so it is in no bundle.
import {EXTENSIONS} from './design-extensions.js';
import {OBJECT_TYPES} from './record-graph.js';
import {COLLECTIONS} from './record-lifecycle.js';
import {RECORD_NOUNS, RECORD_PATHS} from './provenance.js';
import {TRACE_LAYERS, TRACE_LAYER_TYPES, BUILT_IN_LAYERS} from './trace-kernel.js';
import {reviewSource, designOf} from './review-domain.js';

const list = v => (Array.isArray(v) ? v : []);
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const fn = v => typeof v === 'function';

// ---------------------------------------------------------------- the read upgrade
// Each package's step in id order. A step is idempotent and hands back the document itself when it has nothing to do
// (so "needs an upgrade" is "a step answered another document"), and works on a document as stored: it may lack any
// chapter. readings-upgrade.js runs the chain after its own steps; storage-upgrade.js stores a row a step changes.
export function upgradeExtensions(p) { for (const e of EXTENSIONS) if (fn(e.upgrade)) p = e.upgrade(p) || p; return p; }
export const extensionUpgradeNeeded = p => upgradeExtensions(p) !== p;
// What the steps did to a document as stored, in the packages' words (upgradeNote: one sentence), for the storage
// upgrade's activity (storage-upgrade.js): only the notes of the steps that change this document, in the chain's order.
export function extensionUpgradeNotes(p) {
  const out = [];
  for (const e of EXTENSIONS) if (fn(e.upgrade)) { const q = e.upgrade(p) || p; if (q !== p && typeof e.upgradeNote === 'string' && e.upgradeNote) out.push(e.upgradeNote); p = q; }
  return out;
}

// ---------------------------------------------------------------- the document sections
// placeSections(document, markdown, p): the sections the packages state for a document ('registers': the working
// registers, review-domain.js exportSDD's text; 'sdd': the architecture edition, sdd-architecture.js; 'ars': the
// requirements specification as a document of its own; 'chapter-1' to 'chapter-10': that chapter's own register, as
// worker.js exports it), each {document, after, markdown(p)}. A section stands at the end
// of the section its anchor opens (`after`: the heading's line, as printed), after what that section holds and before
// the next heading of the same or a higher level; sections of one anchor follow each other in the packages' id order. A
// section that answers no text is not printed, and neither is one whose anchor the document does not print (an edition
// that leaves the anchor's part out leaves the section out). A heading inside a code fence is not a heading.
export function placeSections(document, markdown, p) {
  let lines = null;
  for (const e of EXTENSIONS) for (const s of list(e.sections)) {
    if (s?.document !== document || !fn(s.markdown)) continue;
    const text = String(s.markdown(p) || '').replace(/\n+$/, '');
    if (!text) continue;
    lines ??= String(markdown).split('\n');
    const fenced = []; let inside = false;
    for (const line of lines) { if (/^(```|~~~)/.test(line)) { inside = !inside; fenced.push(true); } else fenced.push(inside); }
    const at = lines.findIndex((line, i) => !fenced[i] && line === s.after);
    if (at < 0) continue;
    const level = /^#+/.exec(s.after)?.[0].length || 1;
    let end = lines.length;
    for (let i = at + 1; i < lines.length; i++) { const m = !fenced[i] && /^(#+) /.exec(lines[i]); if (m && m[1].length <= level) { end = i; break; } }
    while (end > at + 1 && lines[end - 1] === '') end--;
    lines.splice(end, 0, '', ...text.split('\n'));
  }
  return lines ? lines.join('\n') : markdown;
}

// ---------------------------------------------------------------- the conformance check
// An id is a key of the registry's own table, so the one lower-case name every object carries is no id.
const ID = /^(?!constructor$)[a-z][a-z0-9-]{1,60}$/, TYPE = /^[A-Za-z][A-Za-z0-9]{0,40}$/, PATH = /^[a-z][A-Za-z]{0,40}(\.[a-z][A-Za-z]{0,40})?$/;
export const COMMAND_TYPE = /^[a-z][A-Za-z0-9-]{0,60}\.[A-Za-z][A-Za-z0-9-]{0,60}$/;
const PARTS = new Set(['id', 'objectTypes', 'records', 'layers', 'hops', 'checks', 'commands', 'lifecycle', 'provenance', 'designKeys', 'evidenceKeys', 'upgrade', 'upgradeNote', 'sections', 'needs', 'load']);
const HOP_PARTS = new Set(['layer', 'types', 'from', 'dir', 'ctx', 'only']);
const COMMAND_PARTS = new Set(['apply', 'staged', 'person', 'second', 'validate', 'undo', 'track', 'large']);
const LEVELS = new Set(Object.values(OBJECT_TYPES).map(t => t.level));
const DOCUMENTS = new Set(['registers', 'sdd', 'ars', ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => 'chapter-' + n)]);
// Whether the design fingerprint reads a key as design, asked of the fingerprint itself (review-domain.js).
function fingerprintReads(key) {
  const [a, b] = key.split('.'), probe = {[a]: b ? {[b]: ['x']} : ['x']};
  try { const [d] = designOf(reviewSource(probe)); return b ? !!d[a] && b in d[a] : a in d; } catch { return false; }
}
// The package as registered under the id, when `e` is that registration (its rows are then in the tables already).
const registered = e => EXTENSIONS.find(x => x.id === e?.id) || null;
// What a package states that the contract does not allow, each as a sentence; none for a package that conforms. A row
// that is built in, or that a package earlier by id states, is named: the shared tables leave it out (design-extensions.js
// extendTable), so the package would silently lack it.
export function extensionIssues(e) {
  const out = [], say = text => out.push((ID.test(String(e?.id || '')) ? e.id : 'A design package') + ': ' + text);
  if (!plain(e)) return ['A design package registers an object {id, …parts}.'];
  if (!ID.test(String(e.id || ''))) say('its id is 2 to 61 lower-case letters, digits and hyphens, starting with a letter.');
  for (const k of Object.keys(e)) if (!PARTS.has(k)) say('“' + k + '” is not a part of the contract.');
  const mine = registered(e), same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
  // objectTypes
  if (e.objectTypes !== undefined && !plain(e.objectTypes)) say('objectTypes is {type: {label, chapter, level, prefix}}.');
  for (const [type, t] of Object.entries(plain(e.objectTypes) ? e.objectTypes : {})) {
    if (!TYPE.test(type) || !plain(t) || typeof t.label !== 'string' || !t.label || !(Number.isInteger(t.chapter) && t.chapter >= 1 && t.chapter <= 11) || !LEVELS.has(t.level) || typeof t.prefix !== 'string' || !/^[A-Z]{2,5}$/.test(t.prefix)) say('object type “' + type + '” states a label, a chapter (1 to 11), a level (' + [...LEVELS].join(', ') + ') and an id prefix of 2 to 5 capitals.');
    if (type in OBJECT_TYPES && !(mine && same(OBJECT_TYPES[type], mine.objectTypes?.[type]))) say('object type “' + type + '” is built in or another package\'s; it stays as it is.');
  }
  if (e.records !== undefined && !fn(e.records)) say('records is a function (p, add, rel).');
  // layers and hops
  if (e.layers !== undefined && !plain(e.layers)) say('layers is {layer: object type}.');
  const layers = plain(e.layers) ? e.layers : {}, own = Object.keys(layers);
  for (const [layer, type] of Object.entries(layers)) {
    if (!TYPE.test(layer) || typeof type !== 'string' || !TYPE.test(type)) say('layer “' + layer + '” names the object type it holds.');
    if (BUILT_IN_LAYERS.includes(layer) || layer in TRACE_LAYER_TYPES && !(mine && TRACE_LAYER_TYPES[layer] === mine.layers?.[layer])) say('layer “' + layer + '” is built in or another package\'s; it stays as it is.');
    const holder = Object.entries(TRACE_LAYER_TYPES).find(([, t]) => t === type)?.[0];
    if (holder && holder !== layer) say('layer “' + layer + '” holds the type “' + type + '”, which stands on the layer “' + holder + '”: a type stands on one layer.');
    if (!(type in OBJECT_TYPES) && !(type in (plain(e.objectTypes) ? e.objectTypes : {}))) say('layer “' + layer + '” holds “' + type + '”, which is no object type.');
  }
  if (e.hops !== undefined && !Array.isArray(e.hops)) say('hops is a list of {layer, types, from, dir, ctx}.');
  for (const h of list(e.hops)) {
    const name = 'the hop onto “' + h?.layer + '”';
    if (!plain(h)) { say('a hop is {layer, types, from, dir, ctx}.'); continue; }
    for (const k of Object.keys(h)) if (!HOP_PARTS.has(k)) say(name + ': “' + k + '” is not a part of a hop.');
    if (BUILT_IN_LAYERS.includes(h.layer)) say(name + ' would bring records onto a built-in layer: a package\'s hop reaches a package\'s layer only.');
    else if (!own.includes(h.layer) && !TRACE_LAYERS.includes(h.layer)) say(name + ' names a layer nobody states.');
    if (!(h.types === null || Array.isArray(h.types) && h.types.length && h.types.every(t => typeof t === 'string' && t))) say(name + ' lists the relation types that bring a record (types: [...]).');
    if (!Array.isArray(h.from) || !h.from.length) say(name + ' lists the layers it comes from (from: [...]).');
    for (const l of list(h.from)) {
      if (!own.includes(l) && !TRACE_LAYERS.includes(l)) say(name + ' comes from “' + l + '”, which is no layer.');
      else if (own.includes(l) && own.includes(h.layer) && own.indexOf(l) >= own.indexOf(h.layer)) say(name + ' comes from “' + l + '”, which is not an earlier layer: state the layers in the order the walk reads them.');
    }
    if (h.dir !== 'in' && h.dir !== 'out') say(name + ' says which end the earlier record is (dir: \'out\' or \'in\').');
    if (typeof h.ctx !== 'boolean') say(name + ' says whether it is the own chain or context (ctx: false for the own chain, true for context).');
    if (h.only !== undefined && !fn(h.only)) say(name + ': only is a function of the relation.');
  }
  // checks
  if (e.checks !== undefined && !plain(e.checks)) say('checks is {chapter: p => [finding]}.');
  for (const [chapter, find] of Object.entries(plain(e.checks) ? e.checks : {})) if (!/^(?:[1-9]|10|11)$/.test(chapter) || !fn(find)) say('checks states a function for a chapter from 1 to 10, or for 11 (the review\'s own list); “' + chapter + '” is neither.');
  // commands
  if (e.commands !== undefined && !plain(e.commands)) say('commands is {type: {apply, …}}.');
  for (const [type, c] of Object.entries(plain(e.commands) ? e.commands : {})) {
    const name = 'command “' + type + '”';
    if (!COMMAND_TYPE.test(type)) say(name + ' is typed prefix.name.');
    if (!plain(c) || !fn(c.apply)) { say(name + ' states its handler (apply).'); continue; }
    for (const k of Object.keys(c)) if (!COMMAND_PARTS.has(k)) say(name + ': “' + k + '” is not a part of a command.');
    if (c.staged && (c.person || c.second)) say(name + ' is a person\'s step: it is never staged.');
    if (c.second !== undefined && !fn(c.second)) say(name + ': second is a function (p, command) that answers the record a second person acts on.');
    // Ruling D1: the boundary reads who stands behind the record from the stored record's stamps, so it must know the collection.
    else if (c.second && ![type, type.split('.')[0]].some(k => list(plain(e.provenance?.paths) ? e.provenance.paths[k] : null).length)) say(name + ' is a second person\'s step: the package states provenance.paths for the type or its prefix (the collection of the records it acts on), so that the boundary can read who stands behind each.');
    if (c.undo !== undefined && !(plain(c.undo) && fn(c.undo.previous) && fn(c.undo.revert))) say(name + ': undo states previous(p, command) and revert(p, previous, at, actor).');
    if (c.undo && c.staged) say(name + ' is staged: a staged change is undone by its batch, not by a receipt.');
    for (const k of ['validate', 'track']) if (c[k] !== undefined && !fn(c[k])) say(name + ': ' + k + ' is a function.');
  }
  // lifecycle and provenance
  if (e.lifecycle !== undefined && !plain(e.lifecycle)) say('lifecycle is {path: chapter}.');
  for (const [path, chapter] of Object.entries(plain(e.lifecycle) ? e.lifecycle : {})) {
    if (!PATH.test(path) || !(Number.isInteger(chapter) && chapter >= 1 && chapter <= 10)) say('collection “' + path + '” is a key of the document or chapter.list, with its chapter from 1 to 10.');
    const row = COLLECTIONS.find(r => r[0] === path);
    if (row && !(mine && mine.lifecycle?.[path] === row[1])) say('collection “' + path + '” is built in or another package\'s; it stays as it is.');
  }
  const pv = e.provenance;
  if (pv !== undefined && !(plain(pv) && Object.keys(pv).every(k => k === 'nouns' || k === 'paths' || k === 'records') && ['nouns', 'paths', 'records'].every(k => pv[k] === undefined || plain(pv[k])))) say('provenance is {nouns: {path: noun}, paths: {command type or prefix: [path]}, records: {path: chapter}}.');
  for (const [path, chapter] of Object.entries(plain(pv?.records) ? pv.records : {})) {
    if (!PATH.test(path) || !(Number.isInteger(chapter) && chapter >= 1 && chapter <= 11)) say('collection “' + path + '” is a key of the document or chapter.list, with its chapter from 1 to 11.');
    const row = RECORD_PATHS.find(r => r[0] === path);
    if (path === 'logical.assets' || row && !(mine && mine.provenance?.records?.[path] === row[1] && !COLLECTIONS.some(r => r[0] === path))) say('collection “' + path + '” is read by the provenance reader already (built in, a lifecycle collection or another package\'s); it stays as it is.');
  }
  for (const [path, noun] of Object.entries(plain(pv?.nouns) ? pv.nouns : {})) {
    if (typeof noun !== 'string' || !noun) say('the noun of “' + path + '” is a word.');
    if (path in RECORD_NOUNS && !(mine && mine.provenance?.nouns?.[path] === RECORD_NOUNS[path])) say('the noun of “' + path + '” is built in or another package\'s; it stays as it is.');
  }
  for (const [key, paths] of Object.entries(plain(pv?.paths) ? pv.paths : {})) if (!Array.isArray(paths) || !paths.every(x => typeof x === 'string' && PATH.test(x))) say('the paths of “' + key + '” are a list of collections.');
  // design and evidence keys
  for (const part of ['designKeys', 'evidenceKeys']) {
    if (e[part] !== undefined && !Array.isArray(e[part])) say(part + ' is a list of keys.');
    for (const k of list(e[part])) if (typeof k !== 'string' || !PATH.test(k)) say(part + ': “' + k + '” is a key of the document or chapter.key.');
  }
  for (const k of list(e.designKeys)) if (typeof k === 'string' && PATH.test(k)) {
    if (list(e.evidenceKeys).includes(k)) say('“' + k + '” is stated as design and as evidence.');
    else if (!fingerprintReads(k)) say('design key “' + k + '” lies where the design fingerprint does not read (review-domain.js reviewSource): it would not move the fingerprint.');
  }
  // upgrade, sections, needs and load
  if (e.upgrade !== undefined && !fn(e.upgrade)) say('upgrade is a function (p) that answers p itself when it has nothing to do.');
  if (e.upgradeNote !== undefined && !(typeof e.upgradeNote === 'string' && /\S.*\.$/.test(e.upgradeNote) && fn(e.upgrade))) say('upgradeNote is one sentence, ending in a full stop, that says what upgrade(p) did to an old document; it goes with the step.');
  if (e.sections !== undefined && !Array.isArray(e.sections)) say('sections is a list of {document, after, markdown}.');
  for (const s of list(e.sections)) if (!plain(s) || !DOCUMENTS.has(s.document) || typeof s.after !== 'string' || !/^#{1,6} \S/.test(s.after) || !fn(s.markdown)) say('a section names its document (registers, sdd, ars, or chapter-1 to chapter-10 for a chapter\'s register), the heading line it follows (after) and markdown(p).');
  if (fn(e.needs) !== fn(e.load) || e.needs !== undefined && !fn(e.needs) || e.load !== undefined && !fn(e.load)) say('needs(p) and load() are stated together.');
  return out;
}
// What two registered packages both state, each as a sentence naming both: the one earlier by id keeps the row (a row
// that is built in is neither's, and is named by extensionIssues). Also a hop of one package that comes from a layer the
// walk reads later (another package's, later by id).
export function extensionConflicts() {
  const out = [], seen = new Map(), later = [];
  // Built in: in the table, and not as any registered package states it.
  const builtIn = (table, key, part) => key in table && !EXTENSIONS.some(e => plain(e[part]) && e[part][key] === table[key]);
  // A collection: the lifecycle family's rows first (a lifecycle collection is the provenance reader's too), then the
  // rows stated for the provenance reader alone, so the package named as keeping a row is the one whose row stands.
  const rows = Object.fromEntries(COLLECTIONS);
  for (const part of [e => e.lifecycle, e => e.provenance?.records]) for (const e of EXTENSIONS) for (const k of Object.keys(plain(part(e)) ? part(e) : {})) if (!builtIn(rows, k, 'lifecycle') && k !== 'finalReview.narrative') later.push(['collection', k, e.id]);
  const claim = (kind, key, id) => { const k = kind + ' “' + key + '”', first = seen.get(k); if (first && first !== id) out.push(k + ' is stated by ' + first + ' and by ' + id + ': ' + first + ' keeps it.'); else seen.set(k, id); };
  for (const e of EXTENSIONS) {
    for (const [k, t] of Object.entries(plain(e.objectTypes) ? e.objectTypes : {})) if (!builtIn(OBJECT_TYPES, k, 'objectTypes')) { claim('object type', k, e.id); if (typeof t?.prefix === 'string') claim('id prefix', t.prefix, e.id); }
    for (const [k, t] of Object.entries(plain(e.layers) ? e.layers : {})) if (!BUILT_IN_LAYERS.includes(k)) { claim('layer', k, e.id); claim('the layer of the type', t, e.id); }
    for (const k of Object.keys(plain(e.commands) ? e.commands : {})) claim('command', k, e.id);
    for (const k of Object.keys(plain(e.provenance?.nouns) ? e.provenance.nouns : {})) claim('the noun of', k, e.id);
    for (const h of list(e.hops)) for (const l of list(h?.from)) if (TRACE_LAYERS.includes(l) && TRACE_LAYERS.includes(h.layer) && TRACE_LAYERS.indexOf(l) >= TRACE_LAYERS.indexOf(h.layer)) out.push('a hop of ' + e.id + ' onto “' + h.layer + '” comes from “' + l + '”, which the walk reads later.');
  }
  for (const [kind, key, id] of later) claim(kind, key, id);
  return out;
}
