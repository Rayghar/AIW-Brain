// Modelling on the canvas (rc41, W3): the one module the Diagram and Layers pictures (notation-view.js) and the eleven
// chapter editors share. A person adds an element where the pointer is, or draws a relationship from one element's port
// to another; the picture shows a ghost (a dashed element with the standard's kicker, a dashed line) while the owning
// chapter's own editor opens on Work, prefilled with the type, the picture's group or lane and both ends; the record
// exists only when that editor saves it, through its own command, with its own provenance; cancelling removes the ghost.
// Doctrine: the canvas never writes the document; the ghost and the port handles are presentation (never a pin, never a
// record, never exported, never in the SDD); Undo is the editors'. The relationship kinds offered for a pair are AIW's
// recorded kinds for that pair of record types, each typed as the connected model types the record that editor writes
// (notation-palette.js archimateOf, through the model's own table); a kind the owning editor's own rule refuses for the
// two records (its domain's refusal function, the one its save throws) or the chapter's readiness would report as not
// allowed by the standard is not offered, and the menu says which and why; a pair with nothing to offer says why.
import {esc} from './html-escape.js';
import {KINDS, GROUP_KINDS, paletteOf, archimateTypeOf, archimateOf, archimateRelationship, ARCHIMATE_RELATIONSHIPS, FAMILY_FILL} from './notation-palette.js';
import {OBJECT_TYPES, architectureModel, recordedRelationshipType, relationInvalid} from './architecture-model.js';
import {interactionKind, interactionRefusal} from './realisation-domain.js';
import {linkRefusal} from './requirements-domain.js';
import {connectionRefusal, mappingRefusal, logicalGraph} from './logical-domain.js';
import {dependencyRefusal} from './technology-domain.js';
import {chapterRecordSet, chapterOfRecord} from './chapter-records.js';
import {currentProject, projectURL} from './project-context.js';
import {registerDraftEditor, hasDraftEditor, prefillForm, draftEditor} from './studio-kit.js';
export {registerDraftEditor, hasDraftEditor, prefillForm};

const frame = fn => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => fn()) : setTimeout(fn, 0));

// ---------------------------------------------------------------- what a chapter adds on its canvas
// The element types a chapter's picture adds with "Add … here", the first its default; the Work section each opens on.
export const DRAFT_TYPES = {1: ['requirement', 'journey', 'actor', 'outcome'], 2: ['quality'], 3: ['decision'], 4: ['responsibility'], 5: ['component'], 6: ['capability'], 7: ['technology'], 8: ['contract', 'data', 'party'], 9: ['threat', 'control'], 10: ['instance'], 11: []};
export const NO_DRAFT_REASON = {11: 'Chapter 11 reads the whole design: evidence is history, recorded in the chapter that owns the control, threat or plan.'};
const ELEMENT_SECTION = {requirement: 'requirement', journey: 'journey', actor: 'context', outcome: 'context', quality: 'scenarios', decision: 'record', responsibility: 'responsibilities', component: 'components', capability: 'capabilities', technology: 'plans', contract: 'contracts', data: 'data', party: 'parties', threat: 'threats', control: 'controls', instance: 'placement'};
export const draftTypesFor = chapter => DRAFT_TYPES[Number(chapter)] || [];
export const draftLabel = type => OBJECT_TYPES[type]?.label || paletteOf(type).label || type;
// The notation kind the ghost is drawn in (a capability's default kind until its category is recorded).
export const draftKind = type => paletteOf(type).kind || 'requirement';
export const draftKicker = type => KINDS[draftKind(type)]?.kicker || draftLabel(type);
// The picture's group kinds that prefill an editor: a module (Chapter 4), a trust boundary (Chapter 6), a zone (Chapter 10).
export const GROUP_PREFILL = {module: 'groupId', boundary: 'boundaryId', zone: 'zoneId'};

// ---------------------------------------------------------------- the allowed pairs
// AIW's recorded relationship kinds by pair of record types, with the chapter and the editor that record each. `swap`
// says the record is written the other way round (a component dragged to a responsibility records the responsibility's
// implementation link). `model` is where the connected model registers the saved record (architecture-model.js: its
// source), so each offer is typed exactly as the model types the record (rc41 close, C11): a recorded source's row reads
// as the model's own table says for the row the editor writes (WRITES); any other source registers the kind itself.
// A row whose editor refuses some records of its types names the domain's own refusal (`refuses(p, from, to, relation)`,
// from and to as the record is written: '' when the save would be accepted), and a kind it refuses for the two records is
// not offered (rc41 close, C12: a component's support by a capability is recorded as the component's need, met by the
// capability's own mapping, so the table has no component → capability dependency; a Chapter 1 link joins two saved
// Chapter 1 records, not a process step drawn with them, and not twice; a Chapter 4 connection reaches a journey step as
// its process step; a Chapter 5 interaction has an application component at one end; an implementation link and a
// Chapter 6 dependency are not recorded twice). The other editors open on a record and tick the other end.
const ARTEFACTS = ['requirement', 'journey', 'actor', 'outcome', 'constraint', 'assumption', 'context'];
const SECURITY_TARGETS = ['contract', 'data', 'component', 'technology', 'capability', 'boundary'];
const OFFERS = [
  {chapter: 1, editor: 'link', section: 'requirement', record: 'requirement relationship', model: 'relationships', kinds: ['requires', 'delivers', 'precedes', 'constrains', 'supports', 'informs', 'participates in'], from: ARTEFACTS, to: ARTEFACTS, refuses: linkRefusal},
  {chapter: 4, editor: 'connection', section: 'connections', record: 'logical connection', model: 'logical.connections', kinds: ['flow', 'trace'], from: ['responsibility'], to: ['responsibility'], refuses: connectionRefusal},
  {chapter: 4, editor: 'connection', section: 'connections', record: 'logical connection', model: 'logical.connections', kinds: ['serves', 'realises'], from: ['responsibility'], to: ['journey'], refuses: connectionRefusal},
  {chapter: 4, editor: 'mapping', section: 'mappings', record: 'implementation link', model: 'logical.mappings', kinds: ['realizedBy'], from: ['responsibility'], to: ['component'], refuses: mappingRefusal},
  {chapter: 4, editor: 'mapping', section: 'mappings', record: 'implementation link', model: 'logical.mappings', kinds: ['realizedBy'], from: ['component'], to: ['responsibility'], swap: true, refuses: mappingRefusal},
  {chapter: 5, editor: 'interaction', section: 'interactions', record: 'component interaction', model: 'realisation.connections', kinds: ['interaction'], from: ['component', 'party'], to: ['component', 'party'], interaction: 'sync', refuses: interactionRefusal},
  {chapter: 5, editor: 'interaction', section: 'interactions', record: 'component interaction', model: 'realisation.connections', kinds: ['data'], from: ['component'], to: ['data'], interaction: 'data', refuses: interactionRefusal},
  {chapter: 6, editor: 'dependency', section: 'dependencies', record: 'technology dependency', model: 'technology.dependencies', kinds: ['dependency', 'data', 'trust', 'resilience'], from: ['capability'], to: ['capability'], refuses: (p, from, to, relation) => dependencyRefusal(p, from, to, relation)},
  {chapter: 6, editor: 'need', section: 'needs', record: 'technology need', model: 'technology.needs', kinds: ['hasNeed'], from: ['component'], to: ['capability']},
  {chapter: 7, editor: 'realisation', section: 'plans', record: 'technology realization mapping', model: 'technologyRealisation.mappings', kinds: ['implementedBy'], from: ['capability'], to: ['technology']},
  {chapter: 7, editor: 'realisation', section: 'plans', record: 'technology realization mapping', model: 'technologyRealisation.mappings', kinds: ['implementedBy'], from: ['technology'], to: ['capability'], swap: true},
  {chapter: 7, editor: 'tr-connection', section: 'connections', record: 'technology interface', model: 'technologyRealisation.connections', kinds: ['dependency'], from: ['technology'], to: ['technology']},
  {chapter: 8, editor: 'contract', section: 'contracts', record: 'interface contract', model: 'interfaces.contracts', kinds: ['interaction'], from: ['component', 'party'], to: ['component', 'party']},
  {chapter: 8, editor: 'authority', section: 'data', record: 'data authority', model: 'interfaces.data.authorityId', kinds: ['owns'], from: ['component', 'party'], to: ['data']},
  {chapter: 8, editor: 'lineage', section: 'lineage', record: 'data derivation', model: 'interfaces.lineage', kinds: ['transforms'], from: ['data'], to: ['data', 'party']},
  {chapter: 9, editor: 'control-protects', section: 'controls', record: 'control scope', model: 'security.controls.targetIds', kinds: ['protects'], from: ['control'], to: SECURITY_TARGETS},
  {chapter: 9, editor: 'control-mitigates', section: 'controls', record: 'control scope', model: 'security.controls.threatIds', kinds: ['mitigates'], from: ['control'], to: ['threat']},
  {chapter: 9, editor: 'control-mitigates', section: 'controls', record: 'control scope', model: 'security.controls.threatIds', kinds: ['mitigates'], from: ['threat'], to: ['control'], swap: true},
  {chapter: 9, editor: 'threat-targets', section: 'threats', record: 'threat exposure', model: 'security.threats.targetIds', kinds: ['threatens'], from: ['threat'], to: SECURITY_TARGETS},
  {chapter: 10, editor: 'plan-controls', section: 'operate', record: 'operating plan', model: 'runtime.plans.controlIds', kinds: ['enforces'], from: ['runtime'], to: ['control']}
];
// What each editor writes into a recorded source for the kind chosen (its own fields, prefilled by the draft): a Chapter 1
// link and a Chapter 4 connection keep the kind, a Chapter 5 interaction its interaction type (stored as a flow or a trace
// by the domain's own rule), a Chapter 6 dependency its type, a Chapter 7 interface none.
const WRITES = {
  relationships: relation => ({kind: relation}),
  'logical.connections': relation => ({kind: relation}),
  'realisation.connections': (relation, o) => ({interaction: o.interaction, kind: interactionKind(o.interaction)}),
  'technology.dependencies': relation => ({type: relation}),
  'technologyRealisation.connections': () => ({})
};
// The type the connected model gives the saved record of an offer, from its two record ends.
const savedType = (p, o, relation, from, to) => (WRITES[o.model] ? recordedRelationshipType(o.model, {from, to, ...WRITES[o.model](relation, o)}, p) : relation);
// The kinds in a reader's words (the record's own vocabulary, as the connected model labels it).
const KIND_WORDS = {flow: 'flows to', trace: 'relates to', serves: 'serves', realises: 'realises', realizedBy: 'is realized by', interaction: 'interacts with', data: 'reads or writes', dependency: 'requires', trust: 'trusts', resilience: 'recovers through', hasNeed: 'needs', implementedBy: 'is implemented by', owns: 'is the authority for', transforms: 'is transformed into', protects: 'protects', mitigates: 'mitigates', threatens: 'threatens', enforces: 'enforces', requires: 'requires', delivers: 'delivers', precedes: 'precedes', constrains: 'constrains', supports: 'supports', informs: 'informs', 'participates in': 'participates in'};
export const kindWord = kind => KIND_WORDS[kind] || kind;
// The record types that can start a relationship on the canvas: the ones some offer draws from.
const FROM_TYPES = new Set(OFFERS.flatMap(o => o.from));
export const canConnectFrom = type => FROM_TYPES.has(type);
export const connectableTypes = () => [...FROM_TYPES];
const typeLabel = type => (OBJECT_TYPES[type]?.label || paletteOf(type).label || type).toLowerCase();
// A record's type and record as the connected model holds them (a node of the picture carries the same id).
// (a party drawn as a caller carries the id `party:<id>` on the picture; the record is the party's.)
function objectOf(p, id) { try { const O = p && architectureModel(p).objects; return (O && (O.get(id) || O.get(String(id).replace(/^party:/, '')))) || null; } catch { return null; } }
// The ends an owning editor can take (rc41 close): the connected model also holds elements no chapter records (the
// reference project's process steps, drawn beside its journey steps with the same titles), and an editor given an end
// its form does not list falls back to its first option, so the relationship saved is not the one drawn. An end is
// offered only when the editor lists it: Chapter 4's connection editor lists the elements of its own model (logical
// graph: responsibilities and the process steps), every other editor a saved chapter record.
const EDITOR_ENDS = {connection: p => new Set(logicalGraph(p).nodes.filter(n => n.layer !== 'physical').map(n => n.id))};
const EDITOR_NAMES = {connection: 'Chapter 4 connection editor'};
function editorTakes(p, editor, id) {
  try { const ends = EDITOR_ENDS[editor]; return ends ? ends(p).has(id) : chapterOfRecord(p, id) != null; } catch { return false; }
}
// An end in a sentence: its reference when it has one (APP-001, JRN-001; not a slug such as "initiate"), and its title.
const endName = o => { const ref = /[A-Z]/.test(String(o.ref || '')) && /\d/.test(String(o.ref || '')) ? o.ref + ' ' : ''; return o.title ? `${ref}“${o.title}”` : ref.trim() || o.id; };
// The relationship kinds the standard allows for the two elements, each with the chapter and the editor that records
// it: {from, to, offers: [{key, chapter, editor, section, relation, record, model, word, archimate, swap, interaction}],
// refused: [{key, chapter, editor, relation, record, model, word, why, swap, interaction, archimate}], withheld: [{key,
// chapter, editor, relation, model, word, swap, interaction, wanted, source, target, rule}], reason} — `refused` are the kinds the owning editor's own rule
// refuses for the two records (`why`, its words: the save would throw them), `withheld` the kinds the chapter's readiness
// would report as not allowed by the standard; `reason` is the one line said when nothing is offered. Pure: reads the
// saved document only.
export function relationshipOffers(p, fromId, toId) {
  const a = objectOf(p, fromId), b = objectOf(p, toId);
  if (!a || !b) return {from: a, to: b, offers: [], refused: [], withheld: [], reason: 'Both ends must be saved records of the design.'};
  if (a.id === b.id) return {from: a, to: b, offers: [], refused: [], withheld: [], reason: 'An element cannot be connected to itself here.'};
  const sType = archimateTypeOf(a.type, a.record), tType = archimateTypeOf(b.type, b.record);
  const offers = [], withheld = [], refused = [], untaken = [];
  for (const o of OFFERS) {
    if (!o.from.includes(a.type) || !o.to.includes(b.type)) continue;
    // A pair of the right types whose editor cannot take one of the ends is not offered (said below when nothing is).
    // An end the owning editor cannot take (canvas C1). Where the row names its editor's refusal rule, that rule speaks
    // first, in the words its save would throw (standard C12, one source of truth); a kind it does not refuse is still
    // never offered with an end the editor cannot take (rc41 close, lead, on merging the two packages).
    const missing = [a, b].find(x => !editorTakes(p, o.editor, x.id));
    if (missing && !o.refuses) { untaken.push({o, missing}); continue; }
    for (const relation of o.kinds) {
      // The record is written from the owner to the owned (swap); the model types it from the record's own ends, with the
      // type its source gives the row the editor writes and that source's own reading (C11): the menu says what the saved
      // record will read as — its type, whether the standard allows it, and which way the standard reads it.
      const [rf, rt] = o.swap ? [b, a] : [a, b];
      const arch = archimateOf(savedType(p, o, relation, rf.id, rt.id), o.swap ? tType : sType, o.swap ? sType : tType, o.model);
      const key = `${o.chapter}:${o.editor}:${relation}`;
      // A kind the owning editor's own rule refuses for these two records is not offered: its save would throw `why` (C12).
      const why = o.refuses ? o.refuses(p, rf.id, rt.id, relation) : '';
      if (why) { refused.push({key, chapter: o.chapter, editor: o.editor, relation, record: o.record, model: o.model, word: kindWord(relation), why, swap: !!o.swap, interaction: o.interaction || null, archimate: {type: arch.type, valid: arch.valid, wanted: arch.wanted, source: arch.source, target: arch.target}}); continue; }
      if (missing) { untaken.push({o, missing}); continue; }
      // A kind whose saved record the chapter's readiness reports as RELATION-INVALID (the standard allows neither its
      // type nor a fallback between these two element types) is withheld, and the menu says so (C13).
      if (relationInvalid(o.model, arch)) { withheld.push({key, chapter: o.chapter, editor: o.editor, relation, model: o.model, word: kindWord(relation), swap: !!o.swap, interaction: o.interaction || null, wanted: arch.wanted, source: arch.source, target: arch.target, rule: arch.rule}); continue; }
      // The standard reads it from the drop target to the drag start when the record is written the other way round or
      // the standard turns the record round (a capability serves the component that requires it), not both.
      offers.push({key, chapter: o.chapter, editor: o.editor, section: o.section, relation, record: o.record, model: o.model, word: kindWord(relation), archimate: {type: arch.type, valid: arch.valid, rule: arch.rule, wanted: arch.wanted, reversed: arch.reversed, source: arch.source, target: arch.target, readsBack: !!o.swap !== !!arch.reversed}, swap: !!o.swap, interaction: o.interaction || null});
    }
  }
  // Nothing offered: an end its editor cannot take (canvas, rc41 close) is said first when nothing else was refused or
  // withheld; otherwise the editors' refusals and the standard's withheld kinds (noOfferReason).
  let reason = '';
  if (!offers.length && untaken.length && !withheld.length && !refused.length) {
    const {o, missing} = untaken[0];
    reason = chapterOfRecord(p, missing.id) == null
      ? `Both ends must be saved records of the design: ${endName(missing)} is drawn on the picture but is not a saved record.`
      : `The ${EDITOR_NAMES[o.editor] || `Chapter ${o.chapter} ${o.record} editor`} cannot take ${endName(missing)} as an end: it lists only the elements of its own model.`;
  } else if (!offers.length) reason = noOfferReason(a, b, sType, tType, {withheld, refused});
  return {from: a, to: b, offers, refused, withheld, reason};
}
// The one line a pair with nothing to offer says (pure; exported for the suites): what the owning editors refuse for the
// two records, in their own words; what the standard allows none of between their element types; or, when AIW records
// nothing for the pair at all, what the standard would allow.
export function noOfferReason(a, b, sType, tType, {withheld = [], refused = []} = {}) {
  const parts = refusedLines(refused);
  if (withheld.length) parts.push(`AIW records nothing from ${aOrAn(typeLabel(a.type))} to ${aOrAn(typeLabel(b.type))} that ArchiMate 3.2 allows between ${aOrAn(sType)} and ${aOrAn(tType)}: ${withheld.map(w => `“${w.word}” would read as ${w.wanted}`).join('; ')}.`);
  if (parts.length) return parts.join(' ');
  const allowed = ARCHIMATE_RELATIONSHIPS.filter(t => t !== 'Association' && archimateRelationship(t, sType, tType).kept);
  return `AIW records no relationship from ${aOrAn(typeLabel(a.type))} to ${aOrAn(typeLabel(b.type))}; ArchiMate 3.2 allows ${allowed.length ? allowed.join(', ') + ' or' : 'only'} an Association between ${aOrAn(sType)} and ${aOrAn(tType)}, kept in the records' own fields.`;
}
// The refused kinds as sentences: one per chapter and refusal, the editor's own words after the kinds it refuses.
const refusedLines = refused => {
  const by = new Map(); for (const r of refused) { const k = `${r.chapter}\u0001${r.record}\u0001${r.why}`; by.set(k, [...(by.get(k) || []), `“${r.word}”`]); }
  return [...by].map(([k, ws]) => { const [chapter, record, why] = k.split('\u0001'); return `Not offered: ${ws.join(', ')} (a Chapter ${chapter} ${record}), as its editor says: ${why}`; });
};
// What a pair's menu does not offer, as plain sentences (C13; rc41 close): the kinds the standard allows none of, one
// sentence per pair of element types, then the kinds an editor refuses. The menu shows them under its items as its
// description, and the live region reads them with the count of kinds offered.
export function notOfferedLines({withheld = [], refused = []} = {}) {
  const pairs = new Map(); for (const w of withheld) { const k = `${w.source} to ${w.target}`; pairs.set(k, [...(pairs.get(k) || []), `“${w.word}” (${w.wanted})`]); }
  const held = pairs.size ? [`${[...pairs].map(([k, ws]) => `Not offered, as ArchiMate 3.2 allows none of them from ${k}: ${ws.join(', ')}`).join('; ')}.`] : [];
  return [...held, ...refusedLines(refused)];
}
// The table itself, for the note and the suites: every row as {chapter, editor, record, model, from, to, kinds, swap,
// interaction, refuses} (`refuses`: whether the row names its editor's refusal rule).
export const allowedPairs = () => OFFERS.map(o => ({chapter: o.chapter, editor: o.editor, record: o.record, model: o.model, from: [...o.from], to: [...o.to], kinds: [...o.kinds], swap: !!o.swap, interaction: o.interaction || null, refuses: !!o.refuses}));

// ---------------------------------------------------------------- the ghosts (presentation only)
const num = v => String(Math.round(Number(v) * 10) / 10);
// A ghost element: the standard's box, dashed, with the type's kicker and a "not saved" line; never exported.
export function ghostElementSVG({x, y, w = 176, h = 64, type, title = '', far = 0}) {
  const kind = draftKind(type), k = KINDS[kind] || {}, fam = k.family || 'intent', fill = FAMILY_FILL[fam] || '#eee';
  const name = title || `New ${typeLabel(type)}`;
  // Far out the screen draws only a short name, as it does for every element (the far title the semantic zoom shows),
  // sized to stay inside the box.
  const short = `New ${String(k.short || draftLabel(type)).toLowerCase()}`, size = Math.min(far, (w - 12) / Math.max(1, short.length * 0.56));
  const farTitle = far ? `<text class="nt-ftitle" text-anchor="middle" font-size="${num(size)}" x="${num(w / 2)}" y="${num(h / 2 + size * 0.36)}">${esc(short)}</text>` : '';
  return `<g class="nt-node nt-draft-ghost nt-${esc(fam)}" data-nt-ghost="${esc(type)}" aria-hidden="true" transform="translate(${num(x)} ${num(y)})"><rect class="nt-box" width="${num(w)}" height="${num(h)}" rx="3" fill="${esc(fill)}"/><rect class="nt-kband" y="3" width="${num(w)}" height="14"/><text x="8" y="11.5" class="nt-kicker">${esc(draftKicker(type))}</text><text class="nt-title" x="${num(w / 2)}" y="34" text-anchor="middle">${esc(name)}</text><text class="nt-sub nt-draft-sub" x="${num(w / 2)}" y="${num(h - 10)}" text-anchor="middle">not saved yet</text>${farTitle}</g>`;
}
// A ghost line from the port to the pointer (or to the target's centre), dashed, with the pointer's end marked.
export function ghostLineSVG(x1, y1, x2, y2, {state = ''} = {}) {
  return `<g class="nt-draft-line${state ? ' nt-draft-' + esc(state) : ''}" aria-hidden="true"><path d="M${num(x1)} ${num(y1)}L${num(x2)} ${num(y2)}"/><circle cx="${num(x2)}" cy="${num(y2)}" r="5"/></g>`;
}
// The port handle at an element's right edge; pointer only (the keyboard path is the selection toolbar's "Connect to…").
export function portSVG(w, h, id, {x = 0, y = 0} = {}) {
  return `<g class="nt-port" data-nt-port="${esc(id)}" aria-hidden="true" transform="translate(${num(x + w)} ${num(y + h / 2)})"><g class="nt-port-s"><title>Drag to another element to record a relationship</title><circle cx="0" cy="0" r="8"/><path d="M-4 0h8M0 -4v8"/></g></g>`;
}

// ---------------------------------------------------------------- the controls' HTML
// The "Add … here" entries of a chapter's Add menu (one per type the chapter adds), or the reason it adds nothing.
// `role` is set when the entries stand in a menu of the bar (role="menu"); in a chapter's Add disclosure they are buttons.
export const ADD_HERE_WAIT = 'Open the Diagram or Layers view to place it on the picture.';
export function addHereHTML(chapter, {view = 'diagram', role = ''} = {}) {
  const types = draftTypesFor(chapter), onPicture = ['diagram', 'layers'].includes(view);
  if (!types.length) return `<p class="nt-add-here-note">${esc(NO_DRAFT_REASON[Number(chapter)] || 'This chapter adds nothing on the picture.')}</p>`;
  // On a sheet the entries wait for a picture, and the reason stands as text beside them (rc41 close: a title alone is
  // read only on a mouse hover, never by the keyboard or on a touch screen); the entries name it as their description.
  const reasonId = `nt-add-here-wait-${Number(chapter)}`;
  return types.map(t => `<button type="button"${role ? ` role="${esc(role)}"` : ''} data-nt="add-here" data-id="${esc(t)}"${onPicture ? '' : ` disabled aria-describedby="${reasonId}"`} title="${esc(onPicture ? `Place a new ${typeLabel(t)} on the picture, then record it in the Chapter ${chapter} editor` : ADD_HERE_WAIT)}">Add ${esc(aOrAn(typeLabel(t)))} here</button>`).join('') + (onPicture ? '' : `<p class="nt-add-here-note nt-add-here-wait" id="${reasonId}"${role ? ' role="none"' : ''}>${esc(ADD_HERE_WAIT)}</p>`);
}
const aOrAn = word => (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word;
// The status line while a placement or a connection is in progress. A placement also offers the keyboard its way to put
// the ghost down (rc41 close): "Place in view" stands it in the middle of the view, or beside the selected element.
export const draftNoteHTML = (text, {cancel = true, place = false} = {}) => `<div class="nt-draft-note" role="status"><span>${esc(text)}</span>${place ? '<button type="button" class="cm-btn" data-nt="draft-place" title="Place it in the middle of the view, or beside the selected element · Enter on an element places it beside that one">Place in view</button>' : ''}${cancel ? '<button type="button" class="cm-btn" data-nt="draft-cancel" title="Cancel · Escape">Cancel</button>' : ''}</div>`;
// The kinds menu on drop: one item per allowed kind, the standard's type and the owning chapter on each; or the reason.
// A typed relationship the standard reads from the drop target says so with both references (C11: "Serving, read
// LR-002 → LR-001"); the kinds withheld for the pair are named under the items with the type each would read as (C13).
export function kindsMenuHTML(result) {
  const {from, to, offers, reason, withheld = []} = result;
  const head = `<p class="nt-draft-menu-head"><b>${esc(from?.ref || from?.id || '')}</b> → <b>${esc(to?.ref || to?.id || '')}</b><small>${esc(from?.title || '')} → ${esc(to?.title || '')}</small></p>`;
  // A refused pair is a small dialog that takes the keyboard on its Close (rc41 close: it never took focus, and its
  // Close stood after the whole picture in the tab order); its reason is its description.
  if (!offers.length) return `<div class="nt-draft-menu nt-draft-refused" role="dialog" aria-label="No relationship allowed" aria-describedby="nt-draft-reason">${head}<p class="nt-draft-reason" id="nt-draft-reason">${esc(reason)}</p><button type="button" class="cm-btn" data-nt="draft-cancel" data-nt-focus>Close<small> · Escape</small></button></div>`;
  const reads = o => (o.archimate.type !== 'Association' && o.archimate.readsBack ? `, read ${to?.ref || to?.id || ''} → ${from?.ref || from?.id || ''}` : '');
  // What is not offered stands under the items as the menu's description (aria-describedby), so a screen reader moving
  // into the menu hears it as well as the items (rc41 close).
  const lines = notOfferedLines({withheld, refused: result.refused || []});
  const held = lines.length ? `<p class="nt-draft-withheld" id="nt-draft-not-offered">${lines.map(esc).join('<br>')}</p>` : '';
  return `<div class="nt-draft-menu" role="menu" aria-label="Relationship kinds the standard allows"${held ? ' aria-describedby="nt-draft-not-offered"' : ''}>${head}${offers.map(o => `<button type="button" role="menuitem" data-nt="draft-kind" data-id="${esc(o.key)}" title="${esc(o.archimate.rule)}"><b>${esc(o.word)}</b><small>${esc(o.archimate.type + reads(o))}${o.archimate.valid ? '' : ' (the standard reads it as an association)'} · ${esc(o.record)} · Chapter ${esc(o.chapter)}</small></button>`).join('')}${held}<button type="button" role="menuitem" class="nt-draft-menu-cancel" data-nt="draft-cancel">Cancel<small>Escape</small></button></div>`;
}
// The target picker of the keyboard path: every element of the picture a relationship can reach, filterable.
export function targetPickerHTML(from, nodes) {
  const items = nodes.filter(n => n.id !== from.id && !n.fold && n.type).sort((a, b) => String(a.ref || a.title).localeCompare(String(b.ref || b.title), undefined, {numeric: true}));
  // The count under the Find box says how many targets the words leave (rc41 close: filtering said nothing, and Enter
  // with no match took the list's Cancel); it is polite, as the bar's own Find count is.
  return `<div class="nt-draft-menu nt-draft-targets" role="menu" aria-label="Connect ${esc(from.ref || from.title)} to"><p class="nt-draft-menu-head"><b>Connect ${esc(from.ref || from.title)} to…</b><small>Choose the other end; the kinds the standard allows come next.</small></p><label class="nt-find"><span>Find</span><input type="search" data-nt-field="draft-target-find" placeholder="reference or name" aria-label="Find an element" aria-describedby="nt-draft-target-count"></label><p class="nt-draft-count" id="nt-draft-target-count" role="status" aria-live="polite">${esc(targetCountWords(items.length, items.length, ''))}</p><div class="nt-draft-targets-list">${items.map(n => `<button type="button" role="menuitem" data-nt="draft-target" data-id="${esc(n.id)}" data-text="${esc((n.ref + ' ' + n.title).toLowerCase())}"><b>${esc(n.ref || n.title)}</b><small>${esc(n.ref ? n.title : typeLabel(n.type))}</small></button>`).join('') || '<p class="nt-draft-reason">No other element is drawn in this picture.</p>'}</div><button type="button" role="menuitem" class="nt-draft-menu-cancel" data-nt="draft-cancel">Cancel<small>Escape</small></button></div>`;
}
// The target list's count: every target, how many the words leave, or that none does.
export function targetCountWords(shown, total, query) {
  if (!total) return 'No other element to connect to';
  if (!String(query || '').trim()) return `${total} element${total === 1 ? '' : 's'} to choose from`;
  return shown ? `${shown} of ${total} element${total === 1 ? '' : 's'} match “${String(query).trim()}”` : `No element matches “${String(query).trim()}”`;
}

// ---------------------------------------------------------------- the editors' registry and the pending draft
// The registry lives in studio-kit.js (rc41 close, lead): the chapter adapters register there without loading
// the canvas itself, which the Model views load with the picture.

let pending = null;
export const pendingDraft = () => (pending ? {...pending.spec, saved: pending.saved} : null);
const recordIds = (p, chapter) => new Set(p ? chapterRecordSet(p, chapter).records.map(r => r.id) : []);
// The record a save created for an element draft: among the ids the command names (the store's answer names the
// record it selected), a chapter record that did not exist before, whatever type the person chose in the editor (rc41
// close: a type changed in the editor was read as a cancel, and the canvas said "nothing was recorded" of a saved
// record); only when the command names no new record, a new record of the draft's type.
function createdRecord(P, ids) {
  const p = currentProject(); if (!p) return null;
  const set = chapterRecordSet(p, P.chapter).records, isNew = r => !P.before.has(r.id);
  return set.find(r => ids.includes(r.id) && isNew(r)) || set.find(r => isNew(r) && (!P.spec.type || r.type === P.spec.type)) || null;
}
function watchDialog(P) {
  let tries = 0;
  const look = () => {
    if (pending !== P || P.done) return;
    const d = document.querySelector('dialog[open]');
    if (!d) { if (++tries < 12) setTimeout(look, 150); else finish(P, P.saved ? 'saved' : 'failed', 'The editor did not open.'); return; }
    if (P.dialog === d) return;
    P.dialog = d;
    d.addEventListener('aiw:dialog-closed', () => { if (pending !== P || P.done) return; setTimeout(() => { if (pending !== P || P.done) return; if (P.saved) finish(P, 'saved'); else if (document.querySelector('dialog[open]')) { P.dialog = null; tries = 0; look(); } else finish(P, 'cancelled'); }, 350); }, {once: true});
  };
  look();
}
function finish(P, outcome, note = '') {
  if (P.done) return; P.done = true; if (pending === P) pending = null;
  const {hooks, spec} = P;
  try { if (outcome === 'saved') hooks.onSaved?.(P.saved === true ? null : P.saved, spec, {type: P.savedType || null}); else if (outcome === 'cancelled') hooks.onCancelled?.(spec); else hooks.onFailed?.(note || 'The draft could not be recorded.', spec); } catch (e) { console.warn('canvas draft', e?.message || e); }
}
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') document.addEventListener('aiw:project-command', e => {
  const P = pending; if (!P || P.done) return;
  const ids = Array.isArray(e.detail?.ids) ? e.detail.ids.map(String) : [];
  if (P.spec.kind === 'element') { const r = createdRecord(P, ids); if (!r) return; P.saved = r.id; P.savedType = r.type; }
  else P.saved = ids[0] || true;
  // The editor usually closes right after its save; when it has already gone, the draft is finished here.
  if (!document.querySelector('dialog[open]')) setTimeout(() => { if (pending === P && !P.done) finish(P, 'saved'); }, 50);
});
// Opens the owning chapter's own Work editor over the picture, prefilled from `spec` ({kind: 'element', type, chapter,
// group, lane} or {kind: 'relationship', chapter, editor, relation, from, to, …}), so the ghost stays in view while the
// record is written; the hooks hear the outcome (the id the save created, a cancel, a failure). One draft at a time. The
// record then lives on that chapter's Work tab (`section` names where) exactly as one created there.
export function openDraft(spec, hooks = {}) {
  if (pending) cancelDraft();
  const chapter = Number(spec.chapter), p = currentProject();
  // A relationship reaches its editor only as one the table offers for these two saved ends (rc41 close): an end the
  // owning editor does not list would be replaced by its first option, and the person would save a relationship they
  // never drew.
  if (spec.kind === 'relationship') {
    const r = relationshipOffers(p, spec.from, spec.to);
    if (!r.offers.some(o => o.chapter === chapter && o.editor === spec.editor && o.relation === spec.relation)) { hooks.onFailed?.(r.reason || 'AIW records no such relationship between these two elements.', {...spec, chapter}); return false; }
  }
  const P = {spec: {...spec, chapter, section: spec.section || ELEMENT_SECTION[spec.type] || ''}, hooks, chapter, before: recordIds(p, chapter), dialog: null, saved: null, done: false};
  pending = P;
  const run = handler => { if (pending !== P) return; if (typeof handler !== 'function') { finish(P, 'failed', `Chapter ${chapter} has no editor for this draft.`); return; } try { handler(P.spec); } catch (e) { finish(P, 'failed', e?.message || 'The editor could not open.'); return; } watchDialog(P); };
  const handler = draftEditor(chapter, spec.kind);
  if (typeof handler === 'function') { frame(() => run(handler)); return true; }
  // The Chapter 1 to 3 studios are bound only while their chapter is open: a relationship one of them owns, drawn on
  // another chapter's picture, opens that chapter's Work tab first (its studio binds) and then its editor there.
  const href = projectURL(`/?chapter=${chapter}&tab=work${P.spec.section ? '&section=' + encodeURIComponent(P.spec.section) : ''}`);
  const routed = (() => { try { return !!window.aiwRoute?.(href); } catch { return false; } })();
  if (!routed) { pending = null; hooks.onFailed?.(`Chapter ${chapter} could not be opened for this draft.`, P.spec); return false; }
  let tries = 0; const later = () => { if (pending !== P) return; const h = draftEditor(chapter, spec.kind); if (h || ++tries > 20) run(h); else setTimeout(later, 150); };
  setTimeout(later, 150);
  return true;
}
// Cancels the pending draft (the editor, if open, is closed by its own control; the ghost goes).
export function cancelDraft() {
  const P = pending; if (!P) return false;
  P.done = true; pending = null;
  try { P.hooks.onCancelled?.(P.spec); } catch { /* presentation */ }
  return true;
}
// For the suites: the group kinds that prefill, and the Work section a type opens on.
export const draftSection = type => ELEMENT_SECTION[type] || '';
export const groupKindLabel = kind => GROUP_KINDS[kind]?.label || kind;
