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
// A step that changes a document writes into it: the answer names the step's package (notePackages below, ruling D2).
export function upgradeExtensions(p) { for (const e of EXTENSIONS) if (fn(e.upgrade)) { const q = e.upgrade(p) || p; if (q !== p) notePackages(q, [e.id]); p = q; } return p; }
export const extensionUpgradeNeeded = p => upgradeExtensions(p) !== p;
// What the steps did to a document as stored, in the packages' words (upgradeNote: one sentence), for the storage
// upgrade's activity (storage-upgrade.js): only the notes of the steps that change this document, in the chain's order.
export function extensionUpgradeNotes(p) {
  const out = [];
  for (const e of EXTENSIONS) if (fn(e.upgrade)) { const q = e.upgrade(p) || p; if (q !== p && typeof e.upgradeNote === 'string' && e.upgradeNote) out.push(e.upgradeNote); p = q; }
  return out;
}

// ---------------------------------------------------------------- the packages a document names
// A document says which packages have written into it (the lead's ruling D2 of 2026-11-18): their ids, sorted, under
// one key, workspace.packages. The server's boundary writes a package's id there when a command of the package (sent
// on its own, carried by a reviewed batch or applied by a merge: design-extension-boundary.js markPackages) or its
// upgrade step (above) first writes into the document; a document no package wrote into does not gain the key.
// Neither fingerprint reads it (review-domain.js reviewSource reads the workspace's template and nothing else of it).
// A build that does not register a package the document names cannot read the design in full: missingPackages names
// those, the project read names them to the reader, and every command, every export and a freeze are refused with
// missingPackagesRefusal (worker.js). The browser asks the same of its route stubs (design-extensions.js
// ensureExtensions: the stub of the package `id` is registered as `id-route`).
export const PACKAGES_KEY = 'workspace.packages';
export const documentPackages = p => list(p?.workspace?.packages).filter(id => typeof id === 'string' && id);
// A list this build cannot read (not a list, or an entry that is no name) is no empty list: the document is treated as
// naming a package this build lacks, under this name, so that it is read and not changed.
export const UNREADABLE_PACKAGES = 'a list of packages this build cannot read';
const readablePackages = v => v === undefined || Array.isArray(v) && v.every(id => typeof id === 'string' && id);
export const missingPackages = p => (readablePackages(p?.workspace?.packages) ? documentPackages(p).filter(id => !EXTENSIONS.some(e => e.id === id)) : [UNREADABLE_PACKAGES]);
export function missingPackagesRefusal(ids) {
  const one = ids.length === 1;
  return 'This project holds records of ' + (one ? 'a design package' : 'design packages') + ' this build of AIW does not have (' + ids.join(', ') + '). It can be read here; a design this build cannot read in full is not changed, frozen or printed by it. Open the project with a build that has ' + (one ? 'the package' : 'those packages') + '.';
}
// Names the packages in a document its caller owns (the copy a command worked on, the new document a step answered):
// the workspace is replaced, never changed in place, since such a document may share it with the one it was made from.
export function notePackages(p, ids) {
  const had = documentPackages(p), all = [...new Set([...had, ...ids])].sort();
  if (all.length !== had.length) p.workspace = {...p.workspace, packages: all};
  return p;
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
// A package places a section inside the section it follows, and only there (the adversarial review's finding 5): its
// text may print deeper headings, and a heading at or above its anchor's level is refused, with the package named, or
// one section could open a second "# 7. Appendix". An anchor is a heading of the document as assembled: every section
// is placed against the document as it was handed in, so a heading one package prints is never another's anchor.
const fences = lines => { const out = []; let inside = false; for (const line of lines) { if (/^(```|~~~)/.test(line)) { inside = !inside; out.push(true); } else out.push(inside); } return out; };
export function placeSections(document, markdown, p) {
  const texts = [];
  for (const e of EXTENSIONS) for (const s of list(e.sections)) {
    if (s?.document !== document || !fn(s.markdown)) continue;
    const text = String(s.markdown(p) || '').replace(/\n+$/, '');
    if (text) texts.push([e.id, s.after, text.split('\n')]);
  }
  if (!texts.length) return markdown;
  const lines = String(markdown).split('\n'), fenced = fences(lines), places = new Map();
  for (const [id, after, text] of texts) {
    const at = lines.findIndex((line, i) => !fenced[i] && line === after);
    if (at < 0) continue;
    // Every form of a heading counts (the verifier's second round): marks with blanks before them or a tab after, a
    // line under-ruled with = (level 1) or - (level 2), and an HTML heading.
    const level = /^#+/.exec(after)?.[0].length || 1, inner = fences(text), headingLevel = (line, i) => {
      if (inner[i]) return 0;
      const marks = /^\s{0,3}(#{1,6})(?:[ \t]|$)/.exec(line); if (marks) return marks[1].length;
      const html = /<h([1-6])[\s>]/i.exec(line); if (html) return +html[1];
      const next = text[i + 1]; if (line.trim() && !inner[i + 1] && typeof next === 'string') { if (/^\s{0,3}=+\s*$/.test(next)) return 1; if (/^\s{0,3}-+\s*$/.test(next)) return 2; }
      return 0;
    }, above = text.find((line, i) => { const l = headingLevel(line, i); return l > 0 && l <= level; });
    if (above !== undefined) throw Error(id + ': its section after “' + after + '” prints a heading at or above its anchor\'s level (“' + above + '”). A section stays inside the section it follows.');
    let end = lines.length;
    for (let i = at + 1; i < lines.length; i++) { const m = !fenced[i] && /^(#+) /.exec(lines[i]); if (m && m[1].length <= level) { end = i; break; } }
    while (end > at + 1 && lines[end - 1] === '') end--;
    if (!places.has(end)) places.set(end, []);
    places.get(end).push('', ...text);
  }
  // From the last place to the first, so that no insertion moves another's place.
  for (const end of [...places.keys()].sort((a, b) => b - a)) lines.splice(end, 0, ...places.get(end));
  return places.size ? lines.join('\n') : markdown;
}

// ---------------------------------------------------------------- the keys the workbench itself writes
// One statement of them (the lead's ruling D3 of 2026-11-18), for the conformance check and for every reader that must
// tell a package's collection from a built-in one: the keys of a project document that the workbench's own code writes.
// A key that stands with null is the workbench's whole: no package states a path on it or under it (the journal, the
// retired store, the review, the workbench's alternatives, the workspace, the brief, …). A key that stands with a list
// is a container a package may add a key of its own to (a chapter's container, and the knowledge workspace): the list
// names the keys of it the workbench writes, and only those are taken. The last three are no keys of a document: they
// are the names the design fingerprint gives its own readings (review-domain.js reviewSource), which a package's key
// would collide with. rc44-s0-extensions-validate.mjs (case D3) holds the statement against every key of every
// template and of a document after the command families that make a container the first time they write; a slice
// that makes the workbench write a new key adds it here.
const keys = text => Object.freeze(('schemaVersion version counters intake review handoff ' + text).split(' '));
export const WORKBENCH_KEYS = Object.freeze({
  schemaVersion: null, id: null, name: null, contentVersion: null, counters: null, brief: null, artefacts: null, relationships: null, explorer: null, review: null, handoff: null,
  changes: null, coauthoring: null, finalReview: null, roadmap: null, workspace: null, workbench: null, processModel: null, requirementGroups: null, retired: null, assurance: null, intake: null,
  guidance: null, modelAlternatives: null, modelContext: null, modelIdentity: null, model: null, dataOwnership: null, readingsDefinition: null,
  requirementsStorage: null, storageRetained: null, historyLogs: null, caseExtensions: null, interfaceExtensions: null, collaborationEvidence: null,
  quality: keys('drivers conflicts measurements'), decisions: keys('records conflicts'),
  logical: keys('responsibilities groups connections mappings assets scenarios'), realisation: keys('components connections scenarios'),
  technology: keys('capabilities needs mappings dependencies boundaries applicationBoundaries knownApplications simulations asWritten'), technologyRealisation: keys('records mappings connections'),
  interfaces: keys('contracts data lineage parties checks knownData invariants specifications schemaChecks fieldLineage'),
  security: keys('assuranceVersion controls threats evidence risks governance simulations designTasks'), runtime: keys('evidenceVersion environments zones plans placements paths evidence simulations'),
  knowledge: keys('counter sources suggestions claims contradictions releases pins withdrawals links history organizationReleases repositorySync guide storageKey stewardship tactics note'),
  evidence: null, guidedDesign: null, coauthoredNarratives: null
});
// Whether a path (a key of the document, or container.key) is on a key the workbench itself writes.
export function workbenchKey(path) {
  const [a, b] = String(path).split('.');
  return Object.hasOwn(WORKBENCH_KEYS, a) && (!b || !WORKBENCH_KEYS[a] || WORKBENCH_KEYS[a].includes(b));
}
// The collections the registered packages state as their own, [path, chapter, package id] in the packages' id order:
// the lifecycle rows and then the rows stated for the provenance reader alone, each path once (the first package by
// id keeps it) and never one on a key the workbench itself writes. What reads the packages' records beside the
// built-in ones without a table of its own reads this (sdd-architecture.js).
export function packageCollections() {
  const out = [], seen = new Set();
  for (const part of [e => e.lifecycle, e => e.provenance?.records]) for (const e of EXTENSIONS) for (const [path, chapter] of Object.entries(plain(part(e)) ? part(e) : {})) if (!seen.has(path) && !workbenchKey(path)) { seen.add(path); out.push([path, chapter, e.id]); }
  return out;
}

// ---------------------------------------------------------------- the conformance check
// An id is a key of the registry's own table, so the one lower-case name every object carries is no id.
const ID = /^(?!constructor$)[a-z][a-z0-9-]{1,60}$/, TYPE = /^[A-Za-z][A-Za-z0-9]{0,40}$/, PATH = /^[a-z][A-Za-z]{0,40}(\.[a-z][A-Za-z]{0,40})?$/;
export const COMMAND_TYPE = /^[a-z][A-Za-z0-9-]{0,60}\.[A-Za-z][A-Za-z0-9-]{0,60}$/;
const PARTS = new Set(['id', 'objectTypes', 'prefixes', 'records', 'layers', 'hops', 'checks', 'commands', 'track', 'lifecycle', 'canRestore', 'provenance', 'designKeys', 'evidenceKeys', 'design', 'upgrade', 'upgradeNote', 'sections', 'needs', 'load']);
const HOP_PARTS = new Set(['layer', 'types', 'from', 'dir', 'ctx', 'only']);
const COMMAND_PARTS = new Set(['apply', 'staged', 'person', 'second', 'validate', 'undo', 'large']);
const LEVELS = new Set(Object.values(OBJECT_TYPES).map(t => t.level));
const DOCUMENTS = new Set(['registers', 'sdd', 'ars', ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => 'chapter-' + n)]);
// Whether the design fingerprint reads a key as design, asked of the fingerprint itself (review-domain.js).
function fingerprintReads(key) {
  const [a, b] = key.split('.'), probe = {[a]: b ? {[b]: ['x']} : ['x']};
  try { const [d] = designOf(reviewSource(probe)); return b ? !!d[a] && b in d[a] : a in d; } catch { return false; }
}
// The package as registered under the id, when `e` is that registration (its rows are then in the tables already).
const registered = e => EXTENSIONS.find(x => x.id === e?.id) || null;
// A built-in object type: in the table, and not as a registered package states it (the table keeps a package's entry itself).
const builtInKind = type => type in OBJECT_TYPES && !EXTENSIONS.some(x => plain(x.objectTypes) && x.objectTypes[type] === OBJECT_TYPES[type]);
// Whether two keys (a key of the document, or container.key) are one key, or one is the container of the other.
const overKey = (a, b) => a === b || !a.includes('.') && b.split('.')[0] === a || !b.includes('.') && a.split('.')[0] === b;
// The id prefixes of the workbench's own records, journals and codes (2 to 5 capitals before the hyphen): one
// statement, as WORKBENCH_KEYS is, held by the same suite case against every id, ref and code of every template and of
// a document after the built-in command families, and against the product source (every prefix it writes as a quoted
// literal, and the prefix of every Chapter 1 artefact type: a business rule's BR, a review treatment's RF and a
// Chapter 4 connection's code LC are in no template). A package's kind takes none of them.
export const WORKBENCH_PREFIXES = new Set('ACT ADR ALT APP ASM BR CON DAT DF DX ENV EXT GRP IF INT JRN LC LR MAP OBJ OUT PL QD REL REQ RF RM RP RUN SCP SEC SRC STK TB TC TD THR TM TN TO TR ZON CHG RG DES USE QS TRV WA UNDO TXT TS TRANS TI SS SPEC SOL SG SF SA RV RS RR RJ RA QC PROC PLT MIG LIB INV GV FR EV DL DC CT CD BL ASR AN AC AIW'.split(' '));
// What a package states that the contract does not allow, each as a sentence; none for a package that conforms. A row
// that is built in, or that a package earlier by id states, is named: the shared tables leave it out (design-extensions.js
// extendTable), so the package would silently lack it.
export function extensionIssues(e) {
  const out = [], say = text => out.push((ID.test(String(e?.id || '')) ? e.id : 'A design package') + ': ' + text);
  if (!plain(e)) return ['A design package registers an object {id, …parts}.'];
  if (!ID.test(String(e.id || ''))) say('its id is 2 to 61 lower-case letters, digits and hyphens, starting with a letter.');
  for (const k of Object.keys(e)) if (!PARTS.has(k)) say('“' + k + '” is not a part of the contract.');
  const mine = registered(e), same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
  // A key or a collection named after what every object carries (constructor, toString, …) reads, in a document that
  // has no such key, as the inherited value: stated as a design or an evidence key it moved the fingerprints of every
  // old document. No part of a package states one, in its first or its second segment.
  { const part = v => (plain(v) ? v : {}), stated = [...list(e.designKeys), ...list(e.evidenceKeys), ...Object.keys(part(e.design)), ...Object.keys(part(e.lifecycle)), ...Object.keys(part(e.provenance?.records)), ...Object.keys(part(e.provenance?.nouns)), ...Object.values(part(e.provenance?.paths)).flatMap(v => list(v))];
    for (const k of new Set(stated.filter(k => typeof k === 'string'))) if (k.split('.').some(seg => seg in {})) say('“' + k + '” names what every object carries: it is no key of a document.'); }
  // objectTypes
  if (e.objectTypes !== undefined && !plain(e.objectTypes)) say('objectTypes is {type: {label, chapter, level, prefix}}.');
  for (const [type, t] of Object.entries(plain(e.objectTypes) ? e.objectTypes : {})) {
    if (!TYPE.test(type) || !plain(t) || typeof t.label !== 'string' || !t.label || !(Number.isInteger(t.chapter) && t.chapter >= 1 && t.chapter <= 11) || !LEVELS.has(t.level) || typeof t.prefix !== 'string' || !/^[A-Z]{2,5}$/.test(t.prefix)) say('object type “' + type + '” states a label, a chapter (1 to 11), a level (' + [...LEVELS].join(', ') + ') and an id prefix of 2 to 5 capitals.');
    if (type in OBJECT_TYPES && !(mine && same(OBJECT_TYPES[type], mine.objectTypes?.[type]))) say('object type “' + type + '” is built in or another package\'s; it stays as it is.');
    if (WORKBENCH_PREFIXES.has(t?.prefix)) say('id prefix “' + t.prefix + '” is the workbench\'s own: a package\'s record under an id a built-in record holds is left out of the record graph.');
  }
  // The id prefixes a package mints for a built-in type (the lead's ruling J10 of 2026-11-19): the prefix of the records
  // it adds under that type from its own collection, which ruling D7.2 allows only for a type that stands on no built-in
  // layer. The clash check reads it as it reads a kind's prefix (extensionConflicts), so no other package takes it.
  if (e.prefixes !== undefined && !plain(e.prefixes)) say('prefixes is {built-in object type: id prefix}.');
  for (const [type, prefix] of Object.entries(plain(e.prefixes) ? e.prefixes : {})) {
    if (typeof prefix !== 'string' || !/^[A-Z]{2,5}$/.test(prefix)) say('the id prefix of “' + type + '” is 2 to 5 capitals.');
    else if (WORKBENCH_PREFIXES.has(prefix)) say('id prefix “' + prefix + '” is the workbench\'s own: a package\'s record under an id a built-in record holds is left out of the record graph.');
    if (plain(e.objectTypes) && Object.hasOwn(e.objectTypes, type)) say('prefixes: “' + type + '” is the package\'s own type: its prefix is stated with the type.');
    else if (!builtInKind(type)) say('prefixes: “' + type + '” is no built-in object type.');
    else if (OBJECT_TYPES[type].chapter === 1) say('prefixes: “' + type + '” is a type of Chapter 1 records: a package adds none.');
    else { const layer = BUILT_IN_LAYERS.find(l => TRACE_LAYER_TYPES[l] === type); if (layer) say('prefixes: “' + type + '” stands on the built-in layer “' + layer + '”: a package adds no record of that type (it would join a trail the governance checks read).'); }
  }
  if (e.records !== undefined && !fn(e.records)) say('records is a function (p, add, rel, has).');
  // layers and hops
  if (e.layers !== undefined && !plain(e.layers)) say('layers is {layer: object type}.');
  const layers = plain(e.layers) ? e.layers : {}, own = Object.keys(layers);
  for (const [layer, type] of Object.entries(layers)) {
    if (!TYPE.test(layer) || typeof type !== 'string' || !TYPE.test(type)) say('layer “' + layer + '” names the object type it holds.');
    if (BUILT_IN_LAYERS.includes(layer) || layer in TRACE_LAYER_TYPES && !(mine && TRACE_LAYER_TYPES[layer] === mine.layers?.[layer])) say('layer “' + layer + '” is built in or another package\'s; it stays as it is.');
    const holder = Object.entries(TRACE_LAYER_TYPES).find(([, t]) => t === type)?.[0];
    if (holder && holder !== layer) say('layer “' + layer + '” holds the type “' + type + '”, which stands on the layer “' + holder + '”: a type stands on one layer.');
    if (!(type in OBJECT_TYPES) && !(type in (plain(e.objectTypes) ? e.objectTypes : {}))) say('layer “' + layer + '” holds “' + type + '”, which is no object type.');
    // trace-kernel.js: a Chapter 1 record that is no requirement stands on the context layer whatever its type, and the
    // walk reads no hop of a layer no record of the document stands on. A layer over such a type would hold its records
    // in one document and miss them in the next.
    else if (builtInKind(type) && OBJECT_TYPES[type].chapter === 1) say('layer “' + layer + '” holds the built-in type “' + type + '”, which Chapter 1 records have: a Chapter 1 record stands on the context layer, and on no other.');
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
    // A layer of a built-in type (wp2's `mechanism` over `pattern`): the records and relations of documents written
    // before the package are of that type too, so the hop says which relations are the package's own (ruling D6.3).
    const held = Object.hasOwn(layers, h.layer) ? layers[h.layer] : TRACE_LAYER_TYPES[h.layer];
    if (typeof held === 'string' && builtInKind(held) && !fn(h.only)) say(name + ' brings records of the built-in type “' + held + '”: it states only(relation), which says which relations are the package\'s own, so that no trail of a document without the package\'s records moves.');
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
    // authorship.js reads any type with such an ending as a review command, whatever its package states (ruling D7.5).
    if (/\.(?:review|handoff|intake)$/.test(type) && !c.person && !c.second) say(name + ' ends as a review command does (authorship.js): it states person or second.');
    if (c.second !== undefined && !fn(c.second)) say(name + ': second is a function (p, command) that answers the record a second person acts on.');
    // Ruling D1: the boundary reads who stands behind the record from the stored record's stamps, so it must know the collection.
    else if (c.second && ![type, type.split('.')[0]].some(k => list(plain(e.provenance?.paths) ? e.provenance.paths[k] : null).length)) say(name + ' is a second person\'s step: the package states provenance.paths for the type or its prefix (the collection of the records it acts on), so that the boundary can read who stands behind each.');
    if (c.undo !== undefined && !(plain(c.undo) && fn(c.undo.previous) && fn(c.undo.revert))) say(name + ': undo states previous(p, command) and revert(p, previous, at, actor).');
    if (c.undo && c.staged) say(name + ' is staged: a staged change is undone by its batch, not by a receipt.');
    if (c.validate !== undefined && !fn(c.validate)) say(name + ': validate is a function.');
  }
  // The package's tracker (ruling D4): one for the package, called for every commit; a command states none of its own.
  if (e.track !== undefined && !fn(e.track)) say('track is a function (prior, next, command, at): the package\'s tracker, called for every command.');
  // lifecycle and provenance
  if (e.lifecycle !== undefined && !plain(e.lifecycle)) say('lifecycle is {path: chapter}.');
  for (const [path, chapter] of Object.entries(plain(e.lifecycle) ? e.lifecycle : {})) {
    if (!PATH.test(path) || !(Number.isInteger(chapter) && chapter >= 1 && chapter <= 10)) say('collection “' + path + '” is a key of the document or chapter.list, with its chapter from 1 to 10.');
    const row = COLLECTIONS.find(r => r[0] === path);
    if (row && !(mine && mine.lifecycle?.[path] === row[1])) say('collection “' + path + '” is built in or another package\'s; it stays as it is.');
    if (workbenchKey(path)) say('collection “' + path + '” is on a key the workbench itself writes: a package\'s records retire from the package\'s own collection.');
    // record-lifecycle.js keeps the owning container's version, review and handoff: a list that is a key of the document has none (ruling D6.11).
    else if (PATH.test(path) && !path.includes('.')) say('collection “' + path + '” is a list inside a container (container.list): a retirement moves the container\'s version and clears its review and handoff.');
  }
  // (the lead's ruling L3 of 2026-11-20) canRestore {path: (p, record) => void}: a package refuses the restore of a record
  // of its own lifecycle collection (it throws, in a reader's words) where the record would name what is not there.
  // Only on the package's own collections: whether a package gets a rule on a built-in collection is ruled at wp9a slice 2.
  if (e.canRestore !== undefined && !plain(e.canRestore)) say('canRestore is {path: (p, record) => void}, on the package\'s own lifecycle collections.');
  for (const [path, f] of Object.entries(plain(e.canRestore) ? e.canRestore : {})) {
    if (!fn(f)) say('the restore rule of “' + path + '” is a function (p, record) that refuses in words, or answers nothing.');
    if (!(plain(e.lifecycle) && Object.hasOwn(e.lifecycle, path))) say('the restore rule of “' + path + '” is on a collection the package does not state in lifecycle: a package rules on its own collections only.');
  }
  const pv = e.provenance;
  if (pv !== undefined && !(plain(pv) && Object.keys(pv).every(k => k === 'nouns' || k === 'paths' || k === 'records') && ['nouns', 'paths', 'records'].every(k => pv[k] === undefined || plain(pv[k])))) say('provenance is {nouns: {path: noun}, paths: {command type or prefix: [path]}, records: {path: chapter}}.');
  for (const [path, chapter] of Object.entries(plain(pv?.records) ? pv.records : {})) {
    if (!PATH.test(path) || !(Number.isInteger(chapter) && chapter >= 1 && chapter <= 11)) say('collection “' + path + '” is a key of the document or chapter.list, with its chapter from 1 to 11.');
    const row = RECORD_PATHS.find(r => r[0] === path);
    if (path === 'logical.assets' || row && !(mine && mine.provenance?.records?.[path] === row[1] && !COLLECTIONS.some(r => r[0] === path))) say('collection “' + path + '” is read by the provenance reader already (built in, a lifecycle collection or another package\'s); it stays as it is.');
    if (workbenchKey(path)) say('collection “' + path + '” is on a key the workbench itself writes: the provenance reader reads a package\'s own collection for it.');
  }
  for (const [path, noun] of Object.entries(plain(pv?.nouns) ? pv.nouns : {})) {
    if (typeof noun !== 'string' || !noun) say('the noun of “' + path + '” is a word.');
    if (path in RECORD_NOUNS && !(mine && mine.provenance?.nouns?.[path] === RECORD_NOUNS[path])) say('the noun of “' + path + '” is built in or another package\'s; it stays as it is.');
    // A noun the workbench reads one of its own collections under carries that collection's treatment in the SDD
    // (the open fields of a “document”, the SDD's word for the narrative, are not listed): a package's noun is its own.
    if (typeof noun === 'string' && (noun === 'document' || Object.entries(RECORD_NOUNS).some(([other, n]) => n === noun && other !== path && workbenchKey(other)))) say('the noun “' + noun + '” is one the workbench reads a collection of its own under: a package\'s records have a noun of their own.');
  }
  for (const [key, paths] of Object.entries(plain(pv?.paths) ? pv.paths : {})) if (!Array.isArray(paths) || !paths.every(x => typeof x === 'string' && PATH.test(x))) say('the paths of “' + key + '” are a list of collections.');
  // design and evidence keys
  for (const part of ['designKeys', 'evidenceKeys']) {
    if (e[part] !== undefined && !Array.isArray(e[part])) say(part + ' is a list of keys.');
    for (const k of list(e[part])) if (typeof k !== 'string' || !PATH.test(k)) say(part + ': “' + k + '” is a key of the document or chapter.key.');
  }
  // A package leaves only its own keys out of the design: never a key the workbench itself writes, or a change to a
  // requirement, a brief or a driver would no longer move the design fingerprint.
  for (const k of list(e.evidenceKeys)) if (typeof k === 'string' && workbenchKey(k)) say('evidence key “' + k + '” is a key the workbench keeps: a package leaves only its own keys out of the design.');
  for (const k of list(e.designKeys)) if (typeof k === 'string' && PATH.test(k)) {
    if (list(e.evidenceKeys).includes(k)) say('“' + k + '” is stated as design and as evidence.');
    // (a key another package leaves out as its evidence is that package's clash, named by extensionConflicts, not this one's fault)
    else if (!(plain(e.design) && Object.hasOwn(e.design, k)) && !fingerprintReads(k) && !EXTENSIONS.some(x => x.id !== e.id && list(x.evidenceKeys).some(v => typeof v === 'string' && overKey(v, k)))) say('design key “' + k + '” lies where the design fingerprint does not read (review-domain.js reviewSource): it would not move the fingerprint.');
  }
  // What a package's records say to the design fingerprint (the lead's ruling J3 of 2026-11-19; review-domain.js
  // reviewSource reads the statement in place of the raw key): a function for a key of the document that is the
  // package's own. Such a key is design by its statement, so the probe of designKeys above does not ask the
  // fingerprint about it (a statement answers nothing for a document without the package's records).
  if (e.design !== undefined && !plain(e.design)) say('design is {key: p => what the key says to the design fingerprint}.');
  for (const [k, f] of Object.entries(plain(e.design) ? e.design : {})) {
    if (!fn(f)) say('the design statement of “' + k + '” is a function (p) that answers what the key says, or nothing.');
    if (!/^[a-z][A-Za-z]{0,40}$/.test(k)) say('the design statement of “' + k + '” names a key of the document (the row carries no key inside a chapter\'s container).');
    else if (workbenchKey(k)) say('the design statement of “' + k + '” is on a key the workbench itself writes: a package states what its own key says.');
    if (list(e.evidenceKeys).includes(k)) say('“' + k + '” is stated as design and as evidence.');
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
  const out = [], seen = new Map(), later = [], stated = new Map();
  // Built in: in the table, and not as any registered package states it.
  const builtIn = (table, key, part) => key in table && !EXTENSIONS.some(e => plain(e[part]) && e[part][key] === table[key]);
  // A collection: the lifecycle family's rows first (a lifecycle collection is the provenance reader's too), then the
  // rows stated for the provenance reader alone, so the package named as keeping a row is the one whose row stands.
  const rows = Object.fromEntries(COLLECTIONS);
  for (const part of [e => e.lifecycle, e => e.provenance?.records]) for (const e of EXTENSIONS) for (const k of Object.keys(plain(part(e)) ? part(e) : {})) if (!builtIn(rows, k, 'lifecycle') && k !== 'finalReview.narrative') later.push(['collection', k, e.id]);
  const claim = (kind, key, id) => { const k = kind + ' “' + key + '”', first = seen.get(k); if (first && first !== id) out.push(k + ' is stated by ' + first + ' and by ' + id + ': ' + first + ' keeps it.'); else seen.set(k, id); };
  for (const e of EXTENSIONS) {
    for (const [k, t] of Object.entries(plain(e.objectTypes) ? e.objectTypes : {})) if (!builtIn(OBJECT_TYPES, k, 'objectTypes')) { claim('object type', k, e.id); if (typeof t?.prefix === 'string') claim('id prefix', t.prefix, e.id); }
    // A prefix a package mints for a built-in type is its own as a kind's prefix is (ruling J10).
    for (const prefix of Object.values(plain(e.prefixes) ? e.prefixes : {})) if (typeof prefix === 'string') claim('id prefix', prefix, e.id);
    // One key has one statement of what it says to the design fingerprint (ruling J3): the fingerprint would read the later one.
    for (const k of Object.keys(plain(e.design) ? e.design : {})) { const first = stated.get(k); if (first && first !== e.id) out.push('the design statement of “' + k + '” is stated by ' + first + ' and by ' + e.id + ': one key has one statement.'); else stated.set(k, e.id); }
    for (const [k, t] of Object.entries(plain(e.layers) ? e.layers : {})) if (!BUILT_IN_LAYERS.includes(k)) { claim('layer', k, e.id); claim('the layer of the type', t, e.id); }
    for (const k of Object.keys(plain(e.commands) ? e.commands : {})) claim('command', k, e.id);
    for (const k of Object.keys(plain(e.provenance?.nouns) ? e.provenance.nouns : {})) claim('the noun of', k, e.id);
    for (const h of list(e.hops)) for (const l of list(h?.from)) if (TRACE_LAYERS.includes(l) && TRACE_LAYERS.includes(h.layer) && TRACE_LAYERS.indexOf(l) >= TRACE_LAYERS.indexOf(h.layer)) out.push('a hop of ' + e.id + ' onto “' + h.layer + '” comes from “' + l + '”, which the walk reads later.');
  }
  for (const [kind, key, id] of later) claim(kind, key, id);
  // An evidence key of one package on a key another package states (its design key, its collection, or the container of
  // either): it would leave the other's records out of the design, so the other keeps the key and the clash names both.
  const statedKeys = e => [...list(e.designKeys), ...Object.keys(plain(e.design) ? e.design : {}), ...Object.keys(plain(e.lifecycle) ? e.lifecycle : {}), ...Object.keys(plain(e.provenance?.records) ? e.provenance.records : {})].filter(k => typeof k === 'string');
  for (const e of EXTENSIONS) for (const k of list(e.evidenceKeys)) if (typeof k === 'string') for (const x of EXTENSIONS) if (x.id !== e.id && statedKeys(x).some(s => overKey(s, k))) out.push('evidence key “' + k + '” of ' + e.id + ' leaves a key of ' + x.id + ' out of the design: ' + x.id + ' keeps it.');
  return out;
}
