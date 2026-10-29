// Pictures at size (round 12, P; SDD-SPEC §5, DESIGN D-11 and D-15). A picture keeps to a node budget: above it, its
// elements are grouped by the scene's natural group — requirement groups for requirements, modules for the application
// parts (a component in the module of the responsibilities it realizes, an interface with its provider, data with its
// authority), the containers the scene draws for the rest (zones and placements, trust boundaries, swimlanes, capability
// families, external systems), and the element kind where nothing groups — into an overview: one element per group,
// with its counts, and one relationship per pair of groups that carries the number of relationships it stands for.
// Each group opens as a detail: its own elements and the relationships among them, with every neighbouring group as one
// element and the relationships to it counted. Nothing is dropped: an aggregate names its members and an aggregated
// relationship the relationships it stands for, so every element and relationship of the scene stays reachable.
// Pure and deterministic, DOM-free: the screen (notation-view.js), the SDD's figures (sdd-figures.js) and the Mermaid
// guard (mermaid-figures.js) read it. A grouping is a reading of the picture, never a record; nothing here changes the
// project, and a position is never a fact.
import {KINDS, styleOf} from './notation-palette.js';
import {groupIndex, requirementGroups} from './requirement-groups.js';
import {PARTY_KINDS} from './interfaces-domain.js';
import {COMPONENT_KINDS} from './realisation-domain.js';
import {moduleTree} from './module-model.js';

// The SDD's figure budget (SDD-SPEC §5: about 40 nodes), the detail figures a folded SDD scene gets at most, and the
// screen's: a picture opens grouped above 120 elements or above 400 relationships (STRAIGHT_EDGES in
// notation-layout.js, where a picture would lose its routes).
export const FIGURE_BUDGET = 40, DETAILS_MAX = 12, SCREEN_BUDGET = Object.freeze({nodes: 120, edges: 400});
// Round 24 (D-24-07): a folded group is drawn as a list box that names up to LIST_MAX of its members, then "N more"; a
// printed level that fits no page with six names a box tries LIST_FEWER before it folds again (sdd-document.js). Where
// the caller does not say how many (the screen, the Running board, the chapter figures), an overview names about
// LIST_ROOM members in all: six a box up to 24 groups, fewer above, never under two, so that a large overview stays
// within the zoom that brings it all into view (the screen hides the names below 0.8 and shows the groups' names).
export const LIST_MAX = 6, LIST_FEWER = 3, LIST_ROOM = 144;
export const listFor = groups => Math.max(2, Math.min(LIST_MAX, Math.floor(LIST_ROOM / Math.max(1, groups))));
// The families a group can belong to, in reading order; the first a fold uses is its grouping key. Round 24 (D-24-07):
// the components no module holds group by their component kind, and external parties by their party kind wherever they
// fold (the context, the containers, the components and every other picture); 'external' stays for the box of an
// external system that a picture draws around the services it provides.
export const FOLD_FAMILIES = ['requirement-group', 'module', 'component-kind', 'zone', 'boundary', 'lane', 'family', 'category', 'party-kind', 'external', 'record', 'kind'];
const FAMILY = {'requirement-group': ['Requirement group', 'requirement groups'], module: ['Module', 'modules'], 'component-kind': ['Component kind', 'component kinds'], zone: ['Zone', 'zones'], boundary: ['Trust boundary', 'trust boundaries'], lane: ['Swimlane', 'swimlanes'], family: ['Capability family', 'capability families'], category: ['Category', 'categories'], 'party-kind': ['Party kind', 'party kinds'], external: ['External system', 'external systems'], record: ['Data definition', 'data definitions'], kind: ['Elements', 'element kinds']};
export const familyWord = (f, many = false) => (FAMILY[f] || FAMILY.kind)[many ? 1 : 0];
// The families a caption names, in reading order and joined as a sentence joins them: "module and external system",
// "module, zone and element kind" (round 24, D-24-07: a caption names every grouping family a fold uses, not the first).
const CAPTION_WORD = {kind: 'element kind'};
export function familiesPhrase(families) {
  const fs = [...new Set(families || [])].sort((a, b) => FOLD_FAMILIES.indexOf(a) - FOLD_FAMILIES.indexOf(b)).map(f => CAPTION_WORD[f] || familyWord(f).toLowerCase());
  return fs.length > 1 ? fs.slice(0, -1).join(', ') + ' and ' + fs[fs.length - 1] : fs[0] || CAPTION_WORD.kind;
}
// The boxes a scene draws for a set of records (round 24: sdd-c4.js and the module map: a module of the requirements, a
// kind of external system, the smallest modules together, the components in no module, the people) and the family each
// stands in.
const SETS = {'requirement-group': 'module', 'party-kind': 'party-kind', 'module-group': 'module', 'component-group': 'component-kind', 'actor-group': 'kind'};
// A container kind of the scene and the family it groups by; a system boundary and a pool hold everything, so they do not.
const CONTAINER = {module: 'module', zone: 'zone', unplaced: 'zone', node: 'zone', environment: 'zone', boundary: 'boundary', lane: 'lane', subprocess: 'lane', family: 'family', external: 'external', record: 'record'};
const cut = (v, n) => { const t = String(v ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };
const plural = (n, one, many = one + 's') => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
const natural = (a, b) => String(a).localeCompare(String(b), 'en', {numeric: true});
const list = v => (Array.isArray(v) ? v : []);
// A kind's name for a count of its elements ("12 components"), from the palette's short name; the record types a picture
// draws in another kind's shape are named for what they are (round 24: "36 external systems", never "36 components").
const TYPE_WORDS = {instance: ['running part', 'running parts'], party: ['external system', 'external systems'], container: ['container', 'containers'], system: ['system', 'systems'], module: ['module', 'modules']};
const kindWords = kind => { if (TYPE_WORDS[kind]) return TYPE_WORDS[kind]; const s = (KINDS[kind]?.short || 'element').toLowerCase(); return [s, /[^aeiou]y$/.test(s) ? s.slice(0, -1) + 'ies' : s.endsWith('s') ? s : s + 's']; };
export const countWords = (n, kind) => { const [one, many] = kindWords(kind); return plural(n, one, many); };
// A party kind (interfaces-domain.js PARTY_KINDS) as the title of its group in the context.
const PARTY_GROUP = {'directory or identity': 'Directory and identity services'};
export const partyGroupTitle = kind => (!kind ? 'External systems of no stated kind' : PARTY_GROUP[kind] || cap(kind.endsWith('s') ? kind : kind + 's'));
// A component kind (realisation-domain.js COMPONENT_KINDS) as the title of its group.
export const componentGroupTitle = kind => (!kind || kind === 'not-stated' ? 'Components of no stated kind' : cap(kind) + ' components');

// The module of every component (through the responsibilities it realizes) and of every responsibility, the
// requirement group of every requirement, read once per project.
const projectKeys = new WeakMap();
function keysOf(p) {
  if (!p || typeof p !== 'object') return {modules: new Map(), moduleOf: new Map(), groups: new Map(), parties: new Set(), componentKind: new Map(), assetOf: new Map(), reqGroup: () => null};
  let k = projectKeys.get(p); if (k) return k;
  // Round 24 (D-24-03, D-24-07): a Chapter 4 responsibility group that realises a module of the requirements (its
  // requirementGroupIds; module-model.js) is that module: it groups under the module's key, name and place in the tree,
  // so two groups that realise one module are one group of a figure, and a figure names the module the reader knows.
  let tree = null; try { tree = moduleTree(p); } catch { tree = null; }
  const order = new Map((tree?.modules || []).map((m, i) => [m.group.id, i])), top = id => { const g = tree?.byId.get(id); return !g ? '' : g.kind === 'module' ? g.id : g.parentId || ''; };
  const modules = new Map(list(p.logical?.groups).map((g, i) => { const m = list(g.requirementGroupIds).map(top).find(Boolean), M = m ? tree.byId.get(m) : null; return [g.id, M ? {key: m, title: M.title || m, i: order.get(m) ?? i, platform: M.role === 'platform'} : {key: g.id, title: g.title || g.id, i}]; }));
  const resp = new Map(list(p.logical?.responsibilities).map(r => [r.id, r.groupId || null])), moduleOf = new Map();
  for (const [id, gid] of resp) if (gid) moduleOf.set(id, gid);
  for (const m of list(p.logical?.mappings)) { const gid = resp.get(m.logicalId); if (gid && !moduleOf.has(m.physicalId)) moduleOf.set(m.physicalId, gid); }
  let index = null; try { index = groupIndex(p); } catch { index = null; }
  const groups = new Map(); try { requirementGroups(p).forEach((g, i) => groups.set(g.id, {title: g.title || g.id, i})); } catch { /* a project without groups */ }
  // Round 24 (D-24-07): each component's kind (the group of a component no module holds) and each runtime plan's asset
  // (what a placement runs, for the deployment grouped inside its one zone).
  const componentKind = new Map(list(p.realisation?.components).map(c => [c.id, typeof c.kind === 'string' ? c.kind : '']));
  const assetOf = new Map(list(p.runtime?.plans).map(r => [r.id, r.assetId || null]));
  const partyKind = new Map(list(p.interfaces?.parties).map(x => [x.id, typeof x.kind === 'string' ? x.kind : '']));
  k = {modules, moduleOf, groups, parties: new Set(partyKind.keys()), partyKind, componentKind, assetOf, reqGroup: id => index?.of.get(id)?.[0] || null};
  projectKeys.set(p, k); return k;
}

// Each element's group in a scene: {key, family, title, ref, order}. `p` (the project) gives requirement groups and
// modules; without it a requirement falls to its kind and a component to its container. `budget` (round 24) is the fold's:
// a zone of a deployment that holds more placements than it is split by module (below).
export function foldKeys(D, p = null, {budget = FIGURE_BUDGET} = {}) {
  const K = keysOf(p), G = new Map((D?.groups || []).map((g, i) => [g.id, {...g, i}])), out = new Map(), nodes = new Map((D?.nodes || []).map(n => [n.id, n]));
  const family = f => FOLD_FAMILIES.indexOf(f);
  const moduleGroup = gid => { const m = K.modules.get(gid); return {key: 'module:' + (m?.key || gid), family: 'module', title: m?.title || gid, ref: '', order: [family('module'), m?.i ?? 0]}; };
  const module = id => { const gid = K.moduleOf.get(id); return gid ? moduleGroup(gid) : null; };
  // A module container is the project's module, so an element in it and one read through the mappings group together.
  const container = n => { let g = G.get(n.group), guard = 0; while (g && !CONTAINER[g.kind] && guard++ < 20) g = G.get(g.parent); if (!g) return null; const f = CONTAINER[g.kind]; return f === 'module' && K.modules.has(g.id) ? moduleGroup(g.id) : {key: (f === 'module' ? 'module:' : 'group:') + g.id, family: f, title: g.title || g.id, ref: '', order: [family(f), g.i]}; };
  const typeOf = n => n.type || n.record?.type || null;
  // An element no family groups stands with its kind; a container, a system and a party are named for what they are, not
  // for the shape they are drawn in (round 24).
  const kind = n => { const t = typeOf(n), k = ['container', 'system'].includes(t) ? t : n.kind === 'lifeline' ? 'physicalApp' : n.kind; return {key: 'kind:' + k, family: 'kind', title: cap(kindWords(k)[1]), ref: '', order: [family('kind'), Object.keys(KINDS).indexOf(k)]}; };
  // Round 24 (D-24-07): a component no module holds stands with the components of its kind (service, store …); an
  // external party, in every picture, with the parties of its kind (interfaces-domain.js PARTY_KINDS).
  const partOfKind = kd => { const k = typeof kd === 'string' ? kd : '', i = k && k !== 'not-stated' ? COMPONENT_KINDS.indexOf(k) : -1; return {key: 'component-kind:' + k, family: 'component-kind', title: componentGroupTitle(k), ref: '', order: [family('component-kind'), i < 0 ? 1e6 : i]}; };
  const partyOfKind = kd => { const k = PARTY_KINDS.includes(kd) ? kd : ''; return {key: 'party-kind:' + k, family: 'party-kind', title: partyGroupTitle(k), ref: '', order: [family('party-kind'), k ? PARTY_KINDS.indexOf(k) : 1e6]}; };
  const partyKindOf = id => K.partyKind?.get(id);
  for (const n of D?.nodes || []) {
    const t = typeOf(n), r = n.record || {};
    let g = null;
    if (t === 'requirement' || (!t && n.kind === 'requirement')) {
      const id = K.reqGroup(n.id);
      if (p) { const x = id ? K.groups.get(id) : null; g = id ? {key: 'rg:' + id, family: 'requirement-group', title: x?.title || id, ref: id, order: [family('requirement-group'), x?.i ?? 0]} : {key: 'rg:', family: 'requirement-group', title: 'In no requirement group', ref: '', order: [family('requirement-group'), 1e6]}; }
    }
    // Round 24: a module drawn as one element (the C4 levels by module, sdd-c4.js) is a group of its own, so an overview
    // keeps every module and folds what stands around them; the components inside the module a figure is about (its
    // boundary marked `focus`) stand with the components of their kind.
    if (!g && t === 'module') g = {key: 'module:' + n.id, family: 'module', title: n.title, ref: '', order: [family('module'), K.modules.get(n.id)?.i ?? 0]};
    // A box that already stands for a set (a kind of external system, the components in no module, the people) is one too.
    if (!g && SETS[t]) g = {key: t + ':' + n.id, family: SETS[t], title: n.title, ref: '', order: [family(SETS[t]), 0]};
    if (!g && t === 'component' && n.group && G.get(n.group)?.focus) g = partOfKind(K.componentKind.get(r.id || n.id) ?? r.kind);
    if (!g) g = container(n);
    if (!g && t === 'party') g = partyOfKind(r.kind ?? partyKindOf(n.id));
    if (!g && (t === 'component' || t === 'responsibility' || n.kind === 'lifeline')) { const id = r.id && nodes.has(r.id) ? r.id : n.id; g = module(id) || (t === 'component' ? partOfKind(K.componentKind.get(id) ?? r.kind) : null); }
    if (!g && t === 'contract') g = K.parties.has(r.to) ? partyOfKind(partyKindOf(r.to)) : K.parties.has(r.from) ? partyOfKind(partyKindOf(r.from)) : module(r.to) || module(r.from);
    if (!g && t === 'data') g = module(r.authorityId);
    // Decisions, quality scenarios, capabilities, threats and controls by the category their record keeps.
    const c = !g && ['decision', 'quality', 'capability', 'threat', 'control'].includes(t) && typeof r.category === 'string' && r.category.trim() ? r.category.trim() : null;
    if (c) g = {key: 'category:' + n.kind + ':' + c.toLowerCase(), family: 'category', title: cap(kindWords(n.kind)[1]) + ' · ' + c, ref: '', order: [family('category'), Object.keys(KINDS).indexOf(n.kind) * 1000]};
    out.set(n.id, g || kind(n));
  }
  // Round 24 (D-24-07): a deployment whose placements all stand in one zone (or one environment) says nothing by its
  // zones, so its placements are grouped inside that zone by the module of the part each runs, or by the part's kind where
  // no module holds it; each group says the zone it stands in (`within`). A zone that holds more placements than the
  // fold's budget is split the same way, among the other zones: each of its groups is named "zone · module".
  if (D?.scene?.id === 'deployment') {
    const placed = (D.nodes || []).filter(n => typeOf(n) === 'instance' && out.get(n.id)?.family === 'zone'), zones = new Map();
    for (const n of placed) { const k = out.get(n.id).key; if (!zones.has(k)) zones.set(k, []); zones.get(k).push(n); }
    const one = placed.length > 1 && zones.size === 1;
    const runs = id => module(id) || (K.componentKind.has(id) ? partOfKind(K.componentKind.get(id)) : {key: 'component-kind:technology', family: 'component-kind', title: 'Technology products', ref: '', order: [family('component-kind'), 1e6 + 1]});
    // (only where the project says what each placement runs; else the zone stays the group)
    for (const [k, ns] of zones) {
      if (!(one || ns.length > budget) || !ns.every(n => K.assetOf.get(n.record?.planId))) continue;
      const z = out.get(ns[0].id);
      for (const n of ns) { const g = runs(K.assetOf.get(n.record.planId)); out.set(n.id, one ? {...g, within: z.title} : {...g, key: k + ':' + g.key, title: z.title + ' · ' + g.title, order: [g.order[0], z.order[1] * 1e7 + g.order[1]]}); }
    }
  }
  return out;
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const byOrder = (a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1] || natural(a.key, b.key);

// The groups of a scene, in reading order, merged when there are more of them than the budget holds. The budget is
// shared fairly between the families (requirement groups, modules, categories …): the family with the most groups gives
// up a place until all fit, so a picture of 60 requirement groups and 18 modules keeps the largest of each rather than
// requirement groups alone; within a family the smallest groups become one "Other …" group. A group a caller marks
// `fixed` (the Running board's parts) is never merged and takes its place first. Returns {groups, keyOf}.
function groupsOf(D, keys, budget) {
  const by = new Map();
  for (const n of D.nodes) { const g = keys.get(n.id); let x = by.get(g.key); if (!x) by.set(g.key, x = {...g, members: [], merged: []}); x.members.push(n.id); }
  let groups = [...by.values()].sort(byOrder);
  if (groups.length > budget) {
    const fixed = groups.filter(g => g.fixed), fams = new Map(); budget = Math.max(2, budget - fixed.length);
    for (const g of groups) if (!g.fixed) { let x = fams.get(g.family); if (!x) fams.set(g.family, x = []); x.push(g); }
    const share = new Map([...fams].map(([f, gs]) => [f, gs.length]));
    // A family above its share keeps share − 1 of its groups and one "Other …" group: the total is the sum of the shares.
    while ([...share.values()].reduce((a, b) => a + b, 0) > budget) { const [f] = [...share].sort((a, b) => b[1] - a[1] || FOLD_FAMILIES.indexOf(a[0]) - FOLD_FAMILIES.indexOf(b[0]))[0]; if (share.get(f) <= 2) break; share.set(f, share.get(f) - 1); }
    groups = [...fixed];
    for (const [f, gs] of fams) {
      const room = share.get(f); if (gs.length <= room) { groups.push(...gs); continue; }
      const sorted = gs.slice().sort((a, b) => b.members.length - a.members.length || byOrder(a, b)), o = {key: 'other:' + f, family: f, title: 'Other ' + familyWord(f, true), ref: '', order: [sorted[0].order[0], 1e7], members: [], merged: []};
      for (const g of sorted.slice(room - 1)) { o.members.push(...g.members); o.merged.push({key: g.key, title: g.title, ref: g.ref, count: g.members.length}); }
      o.title = `Other ${familyWord(f, true)} (${o.merged.length})`;
      groups.push(...sorted.slice(0, room - 1), o);
    }
    groups.sort(byOrder);
  }
  const keyOf = new Map(); for (const g of groups) for (const id of g.members) keyOf.set(id, g.key);
  return {groups, keyOf};
}

// The most frequent value of fn over xs (ties: the first in sorted order), and how often each value occurs.
function tally(xs, fn) { const m = new Map(); for (const x of xs) { const k = fn(x); m.set(k, (m.get(k) || 0) + 1); } const top = [...m].sort((a, b) => b[1] - a[1] || natural(a[0], b[0]))[0]?.[0]; return {top, counts: m}; }
// One element standing for many: the group's reference and title, its family as the element type, its counts in the
// sub-line (a running part counted as one, whatever it runs; an external system, a container or a system named for what it
// is). Its kind, and so its colour, is its members' most frequent. Round 24 (D-24-07): it names up to LIST_MAX of its
// members (`fold.list`), the most connected in the scene first, ties in the scene's order, and the renderer draws it as a
// list box with "N more" for the rest (notation-layout.js listBox); every member stays in `fold.members`.
export const wordKind = n => (TYPE_WORDS[n.type] ? n.type : n.kind === 'lifeline' ? 'physicalApp' : n.kind);
// How connected each element of the scene is and where it stands in the scene's order, read once per scene.
const ranking = D => D.rank || (D.rank = (() => { const degree = new Map(), at = new Map(D.nodes.map((n, i) => [n.id, i])); for (const e of D.edges) for (const id of [e.from, e.to]) degree.set(id, (degree.get(id) || 0) + 1); return {degree, at}; })());
// `near` (a detail's neighbouring group): how many relationships tie each member to the group the detail draws, so the
// members it names first are the ones that group reaches; `max`, how many it names.
function aggregate(id, g, members, D, near = null, max = LIST_MAX) {
  const nodes = members.map(m => D.nodeOf.get(m)).filter(Boolean), {counts} = tally(nodes, wordKind), {top} = tally(nodes, n => (n.kind === 'lifeline' ? 'physicalApp' : n.kind)), k = KINDS[top] || KINDS.physicalApp;
  const sub = [...counts].sort((a, b) => b[1] - a[1] || natural(a[0], b[0])).slice(0, 2).map(([kind, c]) => countWords(c, kind)).join(', ') + (counts.size > 2 ? ', …' : ''), title = (g.ref ? g.ref + ' · ' : '') + g.title;
  const R = ranking(D), tie = id => near?.get(id) || 0, list = nodes.slice().sort((a, b) => tie(b.id) - tie(a.id) || (R.degree.get(b.id) || 0) - (R.degree.get(a.id) || 0) || R.at.get(a.id) - R.at.get(b.id)).slice(0, Math.max(1, max)).map(n => ({id: n.id, title: n.title || n.id, ref: n.ref || ''}));
  return {id, kind: top || 'physicalApp', kicker: g.family === 'kind' ? 'Group' : familyWord(g.family), family: k.family, layer: k.layer, level: k.level, title: cut(title, 80) || id, fullTitle: cut(title, 400), sub: cut(sub, 80), ref: '', group: null, hatched: false, muted: false, record: null, sol: null, type: 'fold', fold: {key: g.key, family: g.family, ref: g.ref || '', title: g.title, members: nodes.map(n => n.id), count: nodes.length, kinds: Object.fromEntries(counts), list}};
}
// One relationship standing for several between the same two ends, in either direction: the most frequent kind's line
// in the direction most of them run (both ends marked when they run both ways), its word and the count.
function aggregateEdge(x, stand) {
  const fwd = x.members.filter(e => stand.get(e.from) === x.a).length, n = x.members.length, [from, to] = fwd * 2 >= n ? [x.a, x.b] : [x.b, x.a], both = fwd > 0 && fwd < n;
  const {top: kind} = tally(x.members, e => e.kind), {top: word, counts: words} = tally(x.members, e => e.fullLabel || e.label || styleOf(e.kind).label), st = styleOf(kind);
  const label = cut(n === 1 ? word : words.size === 1 && !both ? `${word} ×${n}` : `${n} relationships`, 40), mix = [...words].sort((a, b) => b[1] - a[1] || natural(a[0], b[0])).slice(0, 4).map(([w, c]) => `${w} ×${c}`).join(', ');
  return {id: `fold:${from}>${to}`, from, to, label, fullLabel: `${n} relationship${n === 1 ? '' : 's'}${both ? ` (${Math.max(fwd, n - fwd)} one way, ${Math.min(fwd, n - fwd)} the other)` : ''}: ${mix}`, kind, family: st.family, step: null, ends: both ? 'both' : 'one', qualifier: '', fullQualifier: '', cardinality: null, weak: x.members.every(e => e.weak), up: !both && tally(x.members, e => !!e.up).top === 'true', record: null, crossing: x.members.some(e => e.crossing), fold: {members: x.members.map(e => e.id), count: n}};
}
// The relationships of a folded picture: one between two elements drawn as themselves stays itself; the rest are joined
// per pair of drawn ends (stand: element id → the drawn element it stands in). Above `limit` the first by `rank` are drawn
// and the others are counted in `hidden`. Returns {edges, internal: Map(drawn id → relationships inside it), hidden}.
function joinEdges(edges, stand, limit = Infinity, rank = null) {
  const pairs = new Map(), internal = new Map(); let out = [];
  for (const e of edges) {
    const a = stand.get(e.from), b = stand.get(e.to); if (!a || !b) continue;
    if (a === b) { internal.set(a, (internal.get(a) || 0) + 1); continue; }
    if (a === e.from && b === e.to) { out.push(e); continue; }
    const k = a < b ? a + '\u0001' + b : b + '\u0001' + a; let x = pairs.get(k); if (!x) pairs.set(k, x = {a, b, members: []}); x.members.push(e);
  }
  for (const x of pairs.values()) out.push(aggregateEdge(x, stand));
  let hidden = [];
  if (out.length > limit) {
    const at = new Map(out.map((e, i) => [e.id, i])), weight = e => (rank ? rank(e) : 0) * 1e6 + (e.fold?.count || 1);
    const keep = new Set(out.slice().sort((p, q) => weight(q) - weight(p) || at.get(p.id) - at.get(q.id)).slice(0, limit).map(e => e.id));
    hidden = out.filter(e => !keep.has(e.id)).map(e => ({id: e.id, from: e.from, to: e.to, count: e.fold?.count || 1, members: e.fold ? e.fold.members : [e.id]}));
    out = out.filter(e => keep.has(e.id));
  }
  return {edges: out, internal, hidden};
}
const indexed = D => (D.nodeOf ? D : Object.assign(D, {nodeOf: new Map(D.nodes.map(n => [n.id, n]))}));

// Whether a picture is over a budget: a number of elements, or {nodes, edges}.
export const overBudget = (D, budget = FIGURE_BUDGET) => { const b = typeof budget === 'number' ? {nodes: budget, edges: Infinity} : budget; return !!D && (D.nodes.length > b.nodes || D.edges.length > (b.edges ?? Infinity)); };

// The fold of a scene: {folded, key, by, budget, groups, overview, detail(key, opts), total}. Under the budget nothing is
// folded and the overview is the picture itself. `groups` are in reading order: {key, family, title, ref, count,
// members, merged, id} (merged: the groups an "Other …" group stands for; id: the overview element that draws it). The
// overview's elements are `fold:<key>` for a group of several elements and the element itself for a group of one; its
// relationships `fold:<a>><b>` where they stand for several or join an aggregate, the relationship itself otherwise.
// `edges` (the SDD's figures; a number, or a function of the elements drawn) bounds the relationships an overview or a
// detail draws: the heaviest are drawn and the rest counted in fold.hidden, each still reachable through the detail of
// either end's group. `open` names groups drawn open in place (their elements as themselves, the most connected
// SCREEN_BUDGET.nodes of a larger one and the rest as one element): the Running board opens the group the reader selects.
// `containers` keeps the scene's containers around the elements drawn as themselves (the board's zones); without it an
// overview draws no container.
const limitOf = (limit, n) => (typeof limit === 'function' ? limit(n) : limit);
export function foldDiagram(D, {project = null, budget = FIGURE_BUDGET, keys = null, edges: edgeLimit = Infinity, open = [], containers = false, force = false, list = null} = {}) {
  if (!D) return null;
  const nodeBudget = typeof budget === 'number' ? budget : budget.nodes, total = {nodes: D.nodes.length, edges: D.edges.length, groups: D.groups.length};
  if (!force && !overBudget(D, budget)) return {folded: false, key: null, by: [], budget: nodeBudget, groups: [], overview: D, detail: () => null, total};
  const src = indexed({...D}), K = keys || foldKeys(D, project, {budget: nodeBudget}), {groups, keyOf} = groupsOf(D, K, Math.max(2, nodeBudget));
  if (list == null) list = listFor(groups.length);
  const byKey = new Map(groups.map(g => [g.key, g])), stand = new Map(), opened = new Set(open), nodes = []; // stand: node id → the overview element it stands in
  const itself = id => { const n = src.nodeOf.get(id); nodes.push(containers ? n : {...n, group: null}); stand.set(id, id); };
  for (const g of groups) {
    if (g.members.length === 1) { itself(g.members[0]); continue; }
    if (!opened.has(g.key)) { nodes.push(aggregate('fold:' + g.key, g, g.members, src, null, list)); for (const id of g.members) stand.set(id, 'fold:' + g.key); continue; }
    const degree = new Map(); for (const e of D.edges) for (const id of [e.from, e.to]) degree.set(id, (degree.get(id) || 0) + 1);
    const room = SCREEN_BUDGET.nodes, keep = new Set(g.members.length > room ? g.members.slice().sort((a, b) => (degree.get(b) || 0) - (degree.get(a) || 0)).slice(0, room - 1) : g.members), more = g.members.filter(id => !keep.has(id));
    for (const id of g.members) if (keep.has(id)) itself(id);
    if (more.length) { const m = aggregate('fold:' + g.key + ':more', {...g, title: `${more.length} more in ${g.title}`}, more, src, null, list); m.kicker = 'More in this group'; nodes.push(m); for (const id of more) stand.set(id, m.id); }
  }
  const J = joinEdges(D.edges, stand, limitOf(edgeLimit, nodes.length));
  for (const n of nodes) if (n.fold) n.fold.internal = J.internal.get(n.id) || 0;
  // The containers that still hold an element drawn as itself, with the containers around them.
  const used = new Set(containers ? nodes.map(n => n.group).filter(Boolean) : []), parent = new Map(D.groups.map(x => [x.id, x.parent]));
  for (const id of [...used]) { let p = parent.get(id); while (p && !used.has(p)) { used.add(p); p = parent.get(p); } }
  const kept = D.groups.filter(x => used.has(x.id));
  // `within` (round 24): the one zone a deployment's placements all stand in, which its groups subdivide (foldKeys).
  const by = [...new Set(groups.map(g => g.family))], info = {key: by[0] || 'kind', by, budget: nodeBudget, total, within: groups.find(g => g.within)?.within || null, list, open: [...opened].filter(k => byKey.has(k)), groups: groups.map(g => ({key: g.key, family: g.family, title: g.title, ref: g.ref, count: g.members.length, members: g.members.slice(), merged: g.merged, id: g.members.length === 1 ? g.members[0] : 'fold:' + g.key}))};
  const overview = {...D, nodes, edges: J.edges, groups: kept, counts: {nodes: nodes.length, groups: kept.length, edges: J.edges.length}, fold: {...info, view: 'overview', hidden: J.hidden}};
  return {folded: true, ...info, overview, detail: (key, opts = {}) => foldDetail(src, byKey, keyOf, key, {budget: nodeBudget, edges: edgeLimit, list, ...opts, info})};
}

// One group of a fold drawn on its own: its elements (the most connected first when they exceed the budget, the rest as
// one "more" element), the relationships among them, and each neighbouring group as one element with the relationships
// to it counted (the `stubs` most connected neighbours; the rest as one "other groups" element).
function foldDetail(src, byKey, keyOf, key, {budget, stubs = 8, edges: edgeLimit = Infinity, keep = [], list = LIST_MAX, info}) {
  const g = byKey.get(key); if (!g) return null;
  const mine = new Set(g.members), degree = new Map(), near = new Map(), tied = new Map(); // tied: a neighbour's member → its relationships with the group
  for (const e of src.edges) {
    const a = mine.has(e.from), b = mine.has(e.to); if (!a && !b) continue;
    for (const [x, y, inside] of [[e.from, e.to, a], [e.to, e.from, b]]) if (inside) { degree.set(x, (degree.get(x) || 0) + 1); if (!mine.has(y)) { const k = keyOf.get(y); near.set(k, (near.get(k) || 0) + 1); tied.set(y, (tied.get(y) || 0) + 1); } }
  }
  const neighbours = [...near].sort((a, b) => b[1] - a[1] || byOrder(byKey.get(a[0]), byKey.get(b[0])));
  const shownNear = neighbours.slice(0, neighbours.length > stubs ? stubs - 1 : stubs), restNear = neighbours.slice(shownNear.length);
  const room = Math.max(2, budget - shownNear.length - (restNear.length ? 1 : 0)), order = new Map(g.members.map((id, i) => [id, i]));
  // The elements a caller must see (the selected one) are drawn first, then the most connected.
  const must = new Set(keep), rank = id => (must.has(id) ? 1e9 : degree.get(id) || 0);
  const ranked = g.members.length > room ? g.members.slice().sort((a, b) => rank(b) - rank(a) || order.get(a) - order.get(b)).slice(0, room - 1).sort((a, b) => order.get(a) - order.get(b)) : g.members;
  const kept = new Set(ranked), more = g.members.filter(id => !kept.has(id)), stand = new Map();
  for (const id of ranked) stand.set(id, id);
  const nodes = ranked.map(id => ({...src.nodeOf.get(id), group: null}));
  if (more.length) { const m = aggregate('fold:' + key + ':more', {...g, title: `${more.length} more in ${g.title}`}, more, src, null, list); m.kicker = 'More in this group'; nodes.push(m); for (const id of more) stand.set(id, m.id); }
  for (const [k] of shownNear) { const h = byKey.get(k); if (h.members.length === 1) { const n = src.nodeOf.get(h.members[0]); nodes.push({...n, group: null}); stand.set(n.id, n.id); } else { nodes.push(aggregate('fold:' + k, h, h.members, src, tied, list)); for (const id of h.members) stand.set(id, 'fold:' + k); } }
  if (restNear.length) { const ids = restNear.flatMap(([k]) => byKey.get(k).members), o = aggregate('fold:near:' + key, {key: 'near:' + key, family: 'kind', title: plural(restNear.length, 'other group'), ref: ''}, ids, src, tied, list); o.kicker = 'Other groups'; nodes.push(o); for (const id of ids) stand.set(id, o.id); }
  // The group's own relationships are drawn before those to its neighbours.
  const own = id => mine.has(id) || id === 'fold:' + key + ':more', J = joinEdges(src.edges.filter(e => mine.has(e.from) || mine.has(e.to)), stand, limitOf(edgeLimit, nodes.length), e => (own(e.from) && own(e.to) ? 1 : 0));
  for (const n of nodes) if (n.fold) n.fold.internal = J.internal.get(n.id) || 0;
  return {...src, nodeOf: undefined, rank: undefined, nodes, edges: J.edges, groups: [], counts: {nodes: nodes.length, groups: 0, edges: J.edges.length}, fold: {...info, view: 'detail', hidden: J.hidden, group: {key, family: g.family, title: g.title, ref: g.ref, count: g.members.length, shown: ranked.length, more: more.length, neighbours: neighbours.length}}};
}

// The members an aggregate element or relationship of a folded picture stands for, read against the whole picture:
// {nodes: [...], edges: [...]} (each the scene's own element or relationship), or null for a plain one.
export function foldMembers(full, part) {
  if (!part?.fold?.members) return null;
  const N = new Map((full?.nodes || []).map(n => [n.id, n])), E = new Map((full?.edges || []).map(e => [e.id, e]));
  return part.fold.members.map(id => N.get(id) || E.get(id)).filter(Boolean);
}
