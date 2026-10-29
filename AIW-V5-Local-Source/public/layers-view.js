// One layer model (round 3, D). The sidebar's eight model layers are the Diagram's layers and every Model view's
// filter: this module says what a picture holds per layer, which layers a chapter opens on, and how a Model view
// reads its layers (the Layers view: a lane for each of the eight layers of the chapter's connected model, drawn by
// the shared renderer with notation-layout's by-layer arrangement; a layer the chapter does not hold, or one hidden,
// is a thin labelled strip). Presentation only: nothing here writes the document.
import {CHAPTER_LAYERS, chapterLayers} from './chapter-names.js';
export {CHAPTER_LAYERS, chapterLayers};
import {LAYERS, LAYER_NAMES} from './notation-model.js';
import {styleOf, STYLE_FAMILIES, KINDS, archimateTypeOf, archimateAspect, STRATEGY_ELEMENTS} from './notation-palette.js';
import {esc} from './html-escape.js';
import {typeCount} from './chapter-records.js';
import {foldKeys} from './figure-budget.js';

// Viewpoint bands describe an architecture concern; the repository's layer ids remain the same
// filters everywhere. In particular, intent records are never presented as business processes.
export const VIEW_BANDS = Object.freeze([
  {id: 'motivation', title: 'Motivation', purpose: 'Outcomes, requirements, drivers and design decisions'},
  // rc41 (W1; PLAN §2 W1.3): the standard's Strategy and Implementation & Migration layers as bands, drawn only when records
  // stand in them (byLayer draws the bands present): an element the standard types as a strategy element (a course of
  // action; rc41 close, C34: never an outcome, a motivation element, nor a technology capability, whatever its record
  // says); Chapter 11's plateaus, delivery actions and the transitions between plateaus.
  {id: 'strategy', title: 'Strategy', purpose: 'Courses of action, capabilities and resources, as the standard types them'},
  {id: 'business', title: 'Business', purpose: 'Actors and their processes'},
  {id: 'application', title: 'Application', purpose: 'Responsibilities, components and services'},
  {id: 'information', title: 'Information & data', purpose: 'Information objects, definitions and stores'},
  {id: 'technology', title: 'Technology', purpose: 'Required capabilities and their realizations'},
  {id: 'security', title: 'Security concerns', purpose: 'Controls, threats and risk assessments'},
  {id: 'deployment', title: 'Deployment', purpose: 'Environments, placements and operation'},
  {id: 'implementation', title: 'Implementation & Migration', purpose: 'Plateaus, delivery actions and the transitions between plateaus'}
]);
const BAND_TYPE = {outcome: 'motivation', requirement: 'motivation', quality: 'motivation', decision: 'motivation', alternative: 'motivation', constraint: 'motivation', assumption: 'motivation', context: 'motivation', evidence: 'motivation', pattern: 'motivation', actor: 'business', journey: 'business', task: 'business', event: 'business', gateway: 'business', subprocess: 'business', dataObject: 'information', account: 'information', data: 'information', field: 'information', control: 'security', threat: 'security', risk: 'security', capability: 'technology', need: 'technology', technology: 'technology', option: 'technology', runtime: 'deployment', instance: 'deployment', plateau: 'implementation', action: 'implementation', course: 'strategy'};
// The ArchiMate type an element is drawn and exported as (rc41 close, C14 and C34): its notation kind's type (the box's
// kicker and the Diagram's exchange), else its record type's (the connected model's exchange) — never a guess from the
// record type alone.
export const elementTypeOf = n => KINDS[n?.kind]?.archimate || (n?.type ? archimateTypeOf(n.type, n.record) : null);
// An element of the standard's Strategy layer stands in the Strategy band (rc41 close, C34: by its type; a record's own
// `strategy` flag no longer moves an outcome or a technology capability there, where its type contradicted the column).
export const strategic = n => STRATEGY_ELEMENTS.has(elementTypeOf(n));
export const viewpointBand = n => n?.viewBand || (strategic(n) ? 'strategy' : null) || BAND_TYPE[n?.type] || ({process: 'business', logical: 'application', physical: 'application', interface: 'application', data: 'information', technology: 'technology', security: 'security', deployment: 'deployment'})[n?.layer] || 'application';
export const viewpointBandTitle = id => VIEW_BANDS.find(b => b.id === id)?.title || LAYER_NAMES[id] || id;
// The ArchiMate framework's aspects as columns inside a band (rc40, W1; PLAN §3): passive structure (what is acted on),
// behaviour (processes, functions, services), active structure (actors, components, interfaces, nodes). Motivation keeps
// its own four columns and the Security band its three; Strategy and Implementation & Migration theirs. rc41 close (C14):
// the core, Strategy and Implementation & Migration columns read the element's ArchiMate type (elementTypeOf; the
// palette's archimateAspect), so a responsibility (an application component), an operating plan (a node) and a capability
// typed as a node stand in Active structure, a capability typed as a technology service in Behaviour; the Motivation and
// Security columns, which name AIW's own record kinds (architectural drivers, design decisions, controls), read the record
// type as before (ASPECT_OF). An element no column names stands in its set's default column, without a header.
// Each column set lists its columns in reading order.
export const VIEW_ASPECTS = Object.freeze({
  core: [{id: 'passive', title: 'Passive structure'}, {id: 'behaviour', title: 'Behaviour'}, {id: 'active', title: 'Active structure'}],
  motivation: [{id: 'drivers', title: 'Drivers'}, {id: 'goals', title: 'Assessments & outcomes'}, {id: 'requirements', title: 'Requirements & constraints'}, {id: 'principles', title: 'Principles & decisions'}],
  security: [{id: 'threats', title: 'Threats'}, {id: 'controls', title: 'Controls'}, {id: 'risks', title: 'Risks'}],
  strategy: [{id: 'resources', title: 'Resources'}, {id: 'capabilities', title: 'Capabilities'}, {id: 'courses', title: 'Courses of action'}],
  implementation: [{id: 'work', title: 'Work packages'}, {id: 'plateaus', title: 'Plateaus'}]
});
export const aspectSetOf = band => (['motivation', 'security', 'strategy', 'implementation'].includes(band) ? band : 'core');
const SET_DEFAULT = {core: 'behaviour', security: 'controls', motivation: 'goals', strategy: 'courses', implementation: 'work'};
// The columns by ArchiMate type: the core aspects from the palette; the Strategy and Implementation & Migration columns.
const TYPE_COLUMN = {
  core: archimateAspect,
  strategy: t => ({Resource: 'resources', Capability: 'capabilities', CourseOfAction: 'courses'})[t] || null,
  implementation: t => ({WorkPackage: 'work', Plateau: 'plateaus'})[t] || null
};
// The Motivation and Security columns by AIW record type, then notation kind.
const ASPECT_OF = {
  quality: 'drivers', outcome: 'goals', context: 'goals', evidence: 'goals', requirement: 'requirements', constraint: 'requirements', assumption: 'requirements', decision: 'principles', alternative: 'principles', pattern: 'principles',
  threat: 'threats', control: 'controls', risk: 'risks'
};
// The column a record's element names in its band's set, or null where it names none.
function aspectHit(n, set) {
  const hit = TYPE_COLUMN[set] ? TYPE_COLUMN[set](elementTypeOf(n)) : ASPECT_OF[n?.type] || ASPECT_OF[n?.kind];
  return hit && VIEW_ASPECTS[set].some(c => c.id === hit) ? hit : null;
}
export function aspectOf(n) {
  const set = aspectSetOf(viewpointBand(n));
  return aspectHit(n, set) || SET_DEFAULT[set];
}
// Whether a record's element maps to a column of its band's set (rc41: the layered Diagram writes the aspect beside a
// band's title only where its elements do; an element no column names stands in its set's default column without a
// header — rc41 close: a name in another set's table no longer counts, so a header never names a column the element is not in).
export const aspectKnown = n => !!n && !!aspectHit(n, aspectSetOf(viewpointBand(n)));
export const aspectTitle = (band, id) => VIEW_ASPECTS[aspectSetOf(band)].find(c => c.id === id)?.title || id;
const TYPE_TITLES = {outcome: 'Outcomes', requirement: 'Requirements', quality: 'Architectural drivers', decision: 'Design decisions', alternative: 'Decision alternatives', constraint: 'Constraints', assumption: 'Assumptions', context: 'Context statements', evidence: 'Evidence', actor: 'Actors', journey: 'Process steps', task: 'Process tasks', gateway: 'Gateways', event: 'Events', subprocess: 'Subprocesses', responsibility: 'Responsibilities', component: 'Application components', contract: 'Application services', party: 'External participants', capability: 'Technology capabilities', need: 'Technology needs', technology: 'Technology realizations', option: 'Candidate options', data: 'Data definitions', field: 'Data fields', dataObject: 'Process data', account: 'Accounts', control: 'Security controls', threat: 'Threats', risk: 'Risks', runtime: 'Operating plans', instance: 'Placements', exchange: 'Data exchanges', system: 'Application', plateau: 'Plateaus', action: 'Delivery actions', course: 'Courses of action'};
const typeTitle = n => TYPE_TITLES[n.type] || (typeCount(n.type || n.kind, 2).replace(/^2\s+/, '').replace(/^./, c => c.toUpperCase()));
const ROLE_LEVELS = {
  application: [['responsibility', 'Application responsibilities'], ['component', 'Application components'], ['contract', 'Application services'], ['party', 'External participants'], ['system', 'Application context']],
  solution: [['component', 'Application components'], ['capability', 'Technology capabilities']],
  stack: [['component', 'Application components'], ['capability', 'Technology capabilities'], ['technology', 'Technology realizations'], ['option', 'Candidate options']],
  usage: [['capability', 'Technology capabilities'], ['technology', 'Technology realizations'], ['instance', 'Deployment placements'], ['runtime', 'Operating plans']],
  motivation: [['outcome', 'Intended outcomes'], ['actor', 'Stakeholders & actors'], ['requirement', 'Requirements'], ['quality', 'Architectural drivers'], ['decision', 'Design decisions'], ['responsibility', 'Application responsibilities']],
  drivers: [['quality', 'Architectural drivers'], ['requirement', 'Requirements'], ['responsibility', 'Application responsibilities'], ['component', 'Application components']],
  rationale: [['requirement', 'Requirements'], ['quality', 'Architectural drivers'], ['decision', 'Design decisions'], ['alternative', 'Alternatives'], ['responsibility', 'Application responsibilities'], ['component', 'Application components'], ['evidence', 'Evidence']]
};
export function viewpointProjection(D, source = D) {
  if (!D) return D;
  const originals = new Map((source?.nodes || []).map(n => [n.id, n])), baseRoles = ROLE_LEVELS[D.scene?.id];
  const roles = baseRoles ? [...baseRoles] : null;
  if (roles) for (const n of source.nodes) if (!n.fold && !roles.some(([type]) => type === n.type)) roles.push([n.type, typeTitle(n)]);
  let nodes = D.nodes.map(n => {
    const record = n.fold ? originals.get(n.fold.members?.[0]) || n : n;
    const role = roles?.findIndex(([type]) => type === record.type), level = role >= 0 ? role : record.level;
    const band = viewpointBand(record), aspect = aspectOf(record);
    return {...n, viewBand: band, aspect, aspectTitle: aspectTitle(band, aspect), aspectKnown: aspectKnown(record), ...(roles ? {level} : {})};
  });
  // A role band names an aspect only where all its elements stand in it (rc41 close, C14): capabilities typed as nodes and
  // as technology services share a band, and a header there would contradict some of its boxes, so it carries none.
  if (roles) {
    const mixed = new Set(), seen = new Map();
    for (const n of nodes) if (n.aspectKnown) { const a = seen.get(n.level); if (a === undefined) seen.set(n.level, n.aspect); else if (a !== n.aspect) mixed.add(n.level); }
    if (mixed.size) nodes = nodes.map(n => (mixed.has(n.level) && n.aspectKnown ? {...n, aspectKnown: false} : n));
  }
  return {...D, nodes, viewBands: VIEW_BANDS, viewAspects: VIEW_ASPECTS, ...(roles ? {viewLevels: roles.map(([, title], level) => ({level, title}))} : {})};
}
// Group by the question's domain and exact record role. A module may contain responsibilities,
// components and services, but those are different realization endpoints and cannot become one node.
// The Layers lanes' groups (rc41 close, C14): one per band, record type and aspect column, since a group box stands in one
// column. A type whose elements stand in more than one aspect of a band (capabilities typed as nodes and as technology
// services) is a group per aspect, keyed `view:<band>:<type>:<aspect>` and titled with the element type its members are
// drawn and exported as ("Technology capabilities · nodes"); every other type keeps `view:<band>:<type>` and its title.
const typeWords = t => { const w = String(t).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase(); return /s$/.test(w) ? w + 'es' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's'; };
export function viewpointGroupKeys(D, project, {layers = false} = {}) {
  const ordinary = layers ? null : foldKeys(D, project), types = new Map();
  const cell = new Map(), aspects = new Map(), elements = new Map();
  if (layers) for (const n of D.nodes) {
    const k = `${viewpointBand(n)}:${n.type || n.kind}`, a = aspectOf(n); cell.set(n.id, a);
    if (!aspects.has(k)) aspects.set(k, new Set()); aspects.get(k).add(a);
    const g = `${k}:${a}`; if (!elements.has(g)) elements.set(g, new Set()); elements.get(g).add(elementTypeOf(n));
  }
  for (const n of D.nodes) {
    const band = viewpointBand(n), type = n.type || n.kind, group = ordinary?.get(n.id);
    const typeOrder = Object.keys(TYPE_TITLES).indexOf(type), order = [VIEW_BANDS.findIndex(b => b.id === band), typeOrder < 0 ? 99 : typeOrder];
    if (layers) {
      const split = aspects.get(`${band}:${type}`).size > 1, aspect = cell.get(n.id), drawn = split ? [...elements.get(`${band}:${type}:${aspect}`)] : [];
      const which = drawn.length === 1 && drawn[0] ? typeWords(drawn[0]) : aspectTitle(band, aspect).toLowerCase();
      types.set(n.id, split ? {key: `view:${band}:${type}:${aspect}`, family: 'kind', title: `${typeTitle(n)} · ${which}`, ref: '', order} : {key: `view:${band}:${type}`, family: 'kind', title: typeTitle(n), ref: '', order});
    } else if (['technology', 'option'].includes(type)) {
      // In a normal-size view every realization remains visible beside the capability it realizes.
      types.set(n.id, {key: `realization:${n.id}`, family: 'kind', title: n.title, ref: n.ref, order});
    } else types.set(n.id, {...group, key: `${group?.key || 'type'}:${band}:${type}`, title: `${group?.title || typeTitle(n)}${group?.family === 'kind' ? '' : ' · ' + typeTitle(n)}`, order: [...(group?.order || order), typeOrder]});
  }
  return types;
}

// The layers each chapter's own records stand in ("Only this chapter's layers").
export function layerCounts(D) { const out = Object.fromEntries(LAYERS.map(l => [l, 0])); for (const n of D?.nodes || []) if (n.layer in out) out[n.layer]++; return out; }
// What the sidebar shows on the Model tab for the picture on screen.
export function layerSummary({chapter, view, picture, full, D, layers}) {
  const counts = layerCounts(full), drawn = layerCounts(D);
  return {chapter: Number(chapter), view, picture, counts, drawn, visible: [...layers], hidden: (full?.nodes.length || 0) - (D?.nodes.length || 0), chapterLayers: chapterLayers(chapter)};
}
// The relationship families a picture draws, for the edge-kind filter.
export function edgeFamilies(D) {
  const n = new Map(); for (const e of D?.edges || []) { const f = styleOf(e.kind).family; n.set(f, (n.get(f) || 0) + 1); }
  return STYLE_FAMILIES.filter(([f]) => n.has(f)).map(([f, title]) => ({family: f, title, count: n.get(f)}));
}
// Connection levels (rc40, W1; PLAN §3 progressive disclosure): the Connections control steps None → Structure →
// Adjacent → All, with Selected (the held element's neighbourhood) beside them. Structure is composition, aggregation
// and assignment inside one lane; Adjacent adds every relationship between two neighbouring lanes (and inside one);
// All is every recorded relationship. A lane is a role level on the Diagram's layered pictures (D.viewLevels: the
// distance is the number of levels between two roles present in the picture) and a concern band everywhere else (the
// ArchiMate order, with the AIW concern bands beside the core layer they belong to: BAND_NEIGHBOURS). Pure reading:
// the Key, the packet Sol reads and the view's control all take the same map.
export const CONNECTION_LEVELS = Object.freeze([
  {id: 'none', title: 'None', rank: 0, hint: 'Hide connecting lines; keep every element'},
  {id: 'structure', title: 'Structure', rank: 1, hint: 'Composition, aggregation and assignment inside one lane'},
  {id: 'adjacent', title: 'Adjacent', rank: 2, hint: 'Structure, and every relationship between neighbouring lanes'},
  {id: 'all', title: 'All', rank: 3, hint: 'Every recorded relationship between the displayed elements'},
  {id: 'neighbourhood', title: 'Selected', rank: null, hint: 'The selected element’s direct connections'}
]);
export const STEPPED_LEVELS = Object.freeze(['structure', 'adjacent']);
export const isConnectionLevel = id => CONNECTION_LEVELS.some(l => l.id === id);
export const connectionLevelTitle = id => CONNECTION_LEVELS.find(l => l.id === id)?.title || id;
export const levelRank = id => CONNECTION_LEVELS.find(l => l.id === id)?.rank ?? 3;
const STRUCTURAL_FAMILIES = new Set(['composition', 'assignment']);
const BAND_NEIGHBOURS = [['motivation', 'business'], ['business', 'application'], ['application', 'information'], ['application', 'technology'], ['application', 'security'], ['technology', 'security'], ['technology', 'deployment'], ['motivation', 'strategy'], ['strategy', 'business'], ['implementation', 'deployment'], ['implementation', 'application']];
const neighbours = new Set(BAND_NEIGHBOURS.flatMap(([a, b]) => [a + '|' + b, b + '|' + a]));
export const bandDistance = (a, b) => (a === b ? 0 : neighbours.has(a + '|' + b) ? 1 : 2);
// The lanes a picture's elements stand in, for the levels: the role level's index among the levels present, or the band.
export function laneIndex(D) {
  const byLevel = !!D?.viewLevels, levels = byLevel ? [...new Set((D.nodes || []).map(n => n.level))].sort((a, b) => a - b) : null;
  return new Map((D?.nodes || []).map(n => [n.id, byLevel ? levels.indexOf(n.level) : viewpointBand(n)]));
}
export const laneDistance = (D, lanes, a, b) => (D?.viewLevels ? Math.abs((lanes.get(a) ?? 0) - (lanes.get(b) ?? 0)) : bandDistance(lanes.get(a), lanes.get(b)));
// Each relationship's level: 'structure', 'adjacent' or 'all' (the first level that shows it).
export function connectionLevelOf(D) {
  const lanes = laneIndex(D), out = new Map();
  for (const e of D?.edges || []) {
    const d = laneDistance(D, lanes, e.from, e.to), family = styleOf(e.kind).family;
    out.set(e.id, d === 0 && STRUCTURAL_FAMILIES.has(family) ? 'structure' : d <= 1 ? 'adjacent' : 'all');
  }
  return out;
}
export const spansLevels = D => !!D?.viewLevels && new Set((D.nodes || []).map(n => n.level)).size > 1;
// Where a picture opens: Layers at Adjacent; a Diagram that spans role levels at Adjacent, a picture of one level, or one
// drawn in a notation that reads complete (BPMN, a sequence, a lifecycle), at All.
export function defaultConnectionLevel(D, {layers = false} = {}) {
  if (!D) return 'all';
  if (['process', 'sequence', 'lifecycle'].includes(D.scene?.id)) return 'all';
  if (layers || D.scene?.id === 'connected') return 'adjacent';
  return spansLevels(D) ? 'adjacent' : 'all';
}
// The Layers overview reads the same recorded relationships as the connected model, grouped only by their
// directional source and destination lanes. Its ids name the exact records for the companion's drill. Keeping
// direction matters: a dependency back into an earlier layer cannot be mistaken for a forward realization.
export function layerRelationshipIndex(D) {
  const layered = !!D?.viewBands, order = layered ? VIEW_BANDS.map(b => b.id) : LAYERS;
  const layerOf = new Map((D?.nodes || []).map(n => [n.id, layered ? viewpointBand(n) : n.layer])), pairs = new Map();
  for (const e of D?.edges || []) {
    const from = layerOf.get(e.from), to = layerOf.get(e.to);
    if (!from || !to) continue;
    const key = `${from}|${to}`;
    let pair = pairs.get(key);
    if (!pair) pairs.set(key, pair = {key, from, to, count: 0, members: [], families: new Map()});
    pair.count++; pair.members.push(e.id);
    const family = styleOf(e.kind).family;
    pair.families.set(family, (pair.families.get(family) || 0) + 1);
  }
  return [...pairs.values()].sort((a, b) => order.indexOf(a.from) - order.indexOf(b.from) || order.indexOf(a.to) - order.indexOf(b.to)).map(p => ({...p, fromTitle: layered ? viewpointBandTitle(p.from) : LAYER_NAMES[p.from], toTitle: layered ? viewpointBandTitle(p.to) : LAYER_NAMES[p.to], families: [...p.families].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([family, count]) => ({family, count}))}));
}
// The on-screen Layers overview (rc39, W2): the fold's overview drawn by the shared renderer — one list box per type group
// (figure-budget.js aggregate: its kind band, its title, its counts and up to six members), a group of one as the record
// itself, the relationships between groups as counted lines (fold edges) that the layout bundles between the lanes — with
// the directional band-to-band index (`layerSummary`) kept for the companion's pair reading, the Key and Sol's packet.
// In Chapter 7 an option group is titled as candidate options; an unchosen candidate is never presented as the design's
// selected product. F.overview retains its own aggregated edges for other consumers and the source is untouched.
export function layerOverview(F, source) {
  const byId = new Map((source?.nodes || []).map(n => [n.id, n]));
  const nodes = F.overview.nodes.map(n => {
    if (!n.fold) return n;
    const members = n.fold.members.map(id => byId.get(id)).filter(Boolean);
    const types = new Map(); for (const member of members) types.set(member.type || member.kind, (types.get(member.type || member.kind) || 0) + 1);
    const composition = [...types].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([type, count]) => ({type, count, label: typeCount(type, count)}));
    return {...n, fold: {...n.fold, composition, typeSummary: composition.map(t => t.label).join(' · ')}};
  });
  const pairs = layerRelationshipIndex(source);
  const counts = source.viewBands ? Object.fromEntries(VIEW_BANDS.map(b => [b.id, source.nodes.filter(n => viewpointBand(n) === b.id).length])) : layerCounts(source);
  const overview = {...F.overview, nodes, layerSummary: {pairs, total: source.edges.length, counts, ...(source.viewBands ? {layout: 'viewpoint'} : {})}};
  return source.viewBands ? viewpointProjection(overview, source) : overview;
}
// The records the layers hide, per viewpoint band (rc39, W2): what a band's lane says beside its count, and the collapsed
// strip a band whose every record is hidden is drawn as (notation-layout.js byLayer `collapsed`).
export function hiddenBands(full, layers) {
  const out = new Map();
  for (const n of full?.nodes || []) if (!layers.includes(n.layer)) { const b = viewpointBand(n); out.set(b, (out.get(b) || 0) + 1); }
  return VIEW_BANDS.filter(b => out.has(b.id)).map(b => ({layer: b.id, count: out.get(b.id), title: b.title}));
}
// The note the picture carries while layers hide part of it.
export function hiddenNoteHTML(hidden, edgesOff = 0) {
  if (!hidden && !edgesOff) return '';
  const parts = [hidden ? `<b>${hidden} hidden by layers</b>` : '', edgesOff ? `<b>${edgesOff} relationship kind${edgesOff === 1 ? '' : 's'} hidden</b>` : ''].filter(Boolean);
  return `<div class="nt-layer-note" role="status">${parts.join(' · ')} · <button type="button" data-nt="layers-all">show</button></div>`;
}
// The Layers view's reading: all eight lanes, each drawn, hidden or with nothing in this chapter, and what crosses
// between them.
export function laneStates(D, full, layers) {
  const counts = layerCounts(full), drawn = layerCounts(D);
  return LAYERS.map(l => ({layer: l, name: LAYER_NAMES[l], count: counts[l], drawn: drawn[l], state: !counts[l] ? 'none' : !layers.includes(l) ? 'hidden' : 'drawn'}));
}
// Reading the visible graph never labels an isolated element as a design defect: its links may
// belong to another viewpoint. Count only exact endpoints; filtering is distinct from absence.
export function layerConnectivity(D, full = D) {
  const nodes = new Map((D?.nodes || []).map(n => [n.id, n])), connected = new Set();
  let across = 0, within = 0, outside = 0;
  for (const e of D?.edges || []) {
    const from = nodes.get(e.from), to = nodes.get(e.to); if (!from || !to) continue;
    connected.add(from.id); connected.add(to.id); if ((D.viewBands ? viewpointBand(from) === viewpointBand(to) : from.layer === to.layer)) within++; else across++;
  }
  for (const e of full?.edges || []) if (nodes.has(e.from) !== nodes.has(e.to)) outside++;
  return {across, within, outside, isolatedIds: [...nodes.keys()].filter(id => !connected.has(id))};
}
// Two lines (round 5, Contract G): what the picture is, and what the checks on it say (`lead`, from the kit); the rest
// under More.
export function layersReadingHTML(D, full, layers, chapter, {lead = ''} = {}) {
  const {across, within, outside, isolatedIds} = layerConnectivity(D, full);
  const semantic = !!D?.viewBands;
  const lanes = semantic ? VIEW_BANDS.map(b => { const count = (full?.nodes || []).filter(n => viewpointBand(n) === b.id).length, drawn = (D?.nodes || []).filter(n => viewpointBand(n) === b.id).length; return {layer: b.id, name: b.title, count, drawn, state: !count ? 'none' : !drawn ? 'hidden' : 'drawn'}; }).filter(b => b.count) : laneStates(D, full, layers), held = lanes.filter(l => l.state !== 'none').length;
  const say = l => (l.state === 'none' ? 'none in this chapter' : l.state === 'hidden' ? `hidden · ${l.count} in its collapsed lane` : l.drawn < l.count ? `${l.drawn} of ${l.count} drawn · the rest outside the focus` : `${l.drawn} drawn`);
  const rows = lanes.map(l => `<div class="nt-read-${l.state}" data-lane="${l.layer}"><dt>${esc(l.name)}</dt><dd>${esc(say(l))}</dd></div>`).join('');
  const unconnected = isolatedIds.slice(0, 5).map(id => { const n = D.nodes.find(x => x.id === id); return n.ref || n.title || id; });
  return `<section class="nt-reading"><h4 aria-level="3">Reading this picture</h4>${lead || `<p class="nt-lead"><span>Chapter ${esc(chapter)} · ${held} occupied ${semantic ? 'concern bands' : 'repository layers'}</span></p>`}<details class="nt-more"><summary>Why these groups / connections</summary><p>${semantic ? 'Concern bands separate motivation, business behavior, application realization and supporting concerns. A type group never merges responsibilities with components or capabilities with products.' : 'Repository layers retain the saved record scope.'} ${across} relationship${across === 1 ? ' crosses' : 's cross'} between bands and ${within} ${within === 1 ? 'stays' : 'stay'} within a band; each arrow keeps its recorded direction. Open a type group to explore its members, or a connection summary to inspect exact relationships. The Connections control steps None, Structure (composition and assignment inside a band), Adjacent (every relationship between neighbouring bands) and All; a dense level opens with its first twelve paths, and Reveal next adds paths, inside the level first, without moving the elements. A + count marks connections the level still keeps back.</p>${outside ? `<p>${outside} recorded connection${outside === 1 ? ' leads' : 's lead'} to elements outside the current view. Show the relevant layers or clear the focus to inspect them.</p>` : ''}${isolatedIds.length ? `<p>${isolatedIds.length} element${isolatedIds.length === 1 ? ' has' : 's have'} no relationship in this view: ${esc(unconnected.join(', '))}${isolatedIds.length > unconnected.length ? ' and ' + (isolatedIds.length - unconnected.length) + ' more' : ''}. Other viewpoints may show additional links.</p>` : ''}<dl class="cm-dl nt-vp nt-lanes-read">${rows}</dl><p class="cm-muted">Repository filters keep their saved layer identities. Layout and connection visibility change only the presentation.</p></details></section>`;
}
