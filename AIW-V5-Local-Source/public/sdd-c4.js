// The C4 levels of the SDD's section 5 (round 12, workstream F; audit/round12/SDD-SPEC.md §5, GR-FIG-08): the system
// context (level 1), its containers (level 2), the components inside each container (level 3) and the deployment that
// runs them. The context and the deployment are the notation model's own pictures (notation-model.js). The container
// and component levels are derived here from the records D1 added: a component's container is the Chapter 7
// realisation it runs in (realisation-domain.js componentContainer: chosen, or derived from its compute need), so a
// container groups the components that run in it and the container picture draws containers, never components. A
// component diagram is drawn for each container that holds two components or more; a container that holds one has
// nothing to decompose and is named in one line, as is a component no container holds yet.
// The diagrams are drawn by the figure set of sdd-figures.js (sddDiagramFigure), with the same layout, renderer, text
// alternative and digest as every other figure. DOM-free; deterministic: the same records draw the same bytes.
// Round 24 (D-24-07): the modules of the requirements (module-model.js) where the containers are not decided yet. When
// the design's containers do not partition its components (no container holds one, or one holds CONTAINER_SHARE of them
// or more), the container level draws the modules as its logical containers, each with the components in it, the
// platform modules apart, and says why; the component level draws one figure per module that holds two components or
// more (its components, the platform services it uses as context, the other modules and the external systems it
// reaches, its stores). Where the containers do partition the components, both levels stay as they were.
// Round 24 part 3 (the register's scale): a component shared by several modules is drawn in full once, in its home module
// (moduleHomes: a platform service in its platform module, a business component in its first module), and each figure
// draws only the lines that touch the components it is about, one counted line per box they reach.
import {notationDiagram, SCENES} from './notation-model.js';
import {KINDS, GROUP_KINDS, styleOf} from './notation-palette.js';
import {componentContainer} from './realisation-domain.js';
import {moduleTree} from './module-model.js';
import {recordModules, recordAttachments} from './module-scope.js';
import {PARTY_KINDS} from './interfaces-domain.js';
import {partyGroupTitle} from './figure-budget.js';
import {reviewRequirements} from './review-domain.js';
import {linkedRequirementIds} from './requirement-links.js';
import {mappingRole} from './logical-domain.js';
import {list, str, plural} from './util.js';
import {passValue} from './document-memo.js';

const cut = (v, n) => { const t = str(v).replace(/\s+/g, ' '); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };
// The scenes of the derived levels: what the caption, the key and the text alternative read.
export const C4_SCENES = {
  moduleMap: SCENES.find(s => s.id === 'module-map'),
  context: SCENES.find(s => s.id === 'context'),
  container: {id: 'c4-container', chapters: [5, 7], title: 'Containers', standard: 'Container view (C4 level 2)', arrangement: 'grouped', audience: 'Delivery teams, operations', purpose: 'The containers the system runs in, each with the components it holds, the stores they keep data in, the external systems they exchange with, and the contracts between them.'},
  component: {id: 'c4-component', chapters: [5], title: 'Components', standard: 'Component view (C4 level 3)', arrangement: 'grouped', audience: 'Delivery teams, architects', purpose: 'The components inside one container, the interactions and contracts between them, and the containers and external systems they reach.'},
  // Round 24: the same levels where the modules stand for the containers.
  moduleContainer: {id: 'c4-container', chapters: [5, 7], title: 'Containers by module', standard: 'Container view (C4 level 2)', arrangement: 'grouped', audience: 'Delivery teams, operations', purpose: 'The modules stand for the containers, because the deployable containers are not decided yet: each module with the components in it, the platform modules apart, the stores the components keep data in, the external systems they exchange with, and the contracts between them.'},
  moduleComponent: {id: 'c4-component', chapters: [5], title: 'Components by module', standard: 'Component view (C4 level 3)', arrangement: 'grouped', audience: 'Delivery teams, architects', purpose: 'The components of one module, the interactions and contracts between them, the platform services they use, and the other modules, external systems and stores they reach.'},
  deployment: SCENES.find(s => s.id === 'deployment')
};

// A diagram under construction, in the notation model's shape (nodes, groups, edges, notes, header, icons).
function diagram(base, scene) {
  const D = {scene, nodes: [], groups: [], edges: [], notes: [], header: base?.header || {model: '', version: ''}, environmentId: null, icons: base?.icons || {}};
  const nodes = new Set(), groups = new Set(), edges = new Set();
  const node = (id, kind, title, {sub = '', group = null, hatched = false, ref = '', record = null, type = null} = {}) => {
    if (!id || nodes.has(id)) return null; nodes.add(id);
    const k = KINDS[kind];
    const n = {id, kind, kicker: k.kicker, family: k.family, layer: k.layer, level: k.level, title: cut(title, 80) || id, fullTitle: str(title).slice(0, 400), sub: cut(sub, 80), ref: str(ref).slice(0, 24), group, hatched, muted: false, record, sol: null, type};
    D.nodes.push(n); return n;
  };
  const group = (id, kind, title, {sub = '', parent = null} = {}) => {
    if (!id || groups.has(id)) return null; groups.add(id);
    const g = {id, kind, layer: GROUP_KINDS[kind]?.layer || 'physical', title: cut(title, 60) || id, fullTitle: str(title).slice(0, 200), sub: cut(sub, 80), parent};
    D.groups.push(g); return g;
  };
  const edge = (from, to, label, {kind = 'uses', qualifier = '', id = null, record = null} = {}) => {
    if (!from || !to || from === to || !nodes.has(from) || !nodes.has(to)) return null;
    const key = id || `${from}>${to}>${label}`; if (edges.has(key)) return null; edges.add(key);
    const st = styleOf(kind);
    const e = {id: key, from, to, label: cut(label, 40), fullLabel: str(label).slice(0, 200), kind, family: st.family, step: null, ends: 'one', qualifier: cut(qualifier, 24), fullQualifier: str(qualifier).slice(0, 200), cardinality: null, weak: false, up: !!st.up, record, crossing: false};
    D.edges.push(e); return e;
  };
  return {D, node, group, edge};
}
const productOf = r => { const o = list(r?.options).find(x => x.id === r?.selectedOptionId); return o ? [o.product || o.title, o.version].filter(Boolean).join(' ') : ''; };

// Who holds what: each component's container, the containers in register order, and the ends of every contract.
export function c4Reading(p) {
  const comps = list(p?.realisation?.components), reals = new Map(list(p?.technologyRealisation?.records).map(r => [r.id, r])), parties = new Map(list(p?.interfaces?.parties).map(x => [x.id, x]));
  const containerOf = new Map(), containers = new Map(), unplaced = [];
  for (const c of comps) {
    const k = componentContainer(p, c);
    if (!k || k.missing) { unplaced.push(c); continue; }
    containerOf.set(c.id, k.id);
    if (!containers.has(k.id)) containers.set(k.id, {id: k.id, ref: k.ref, title: k.title, derived: k.derived, record: reals.get(k.id) || null, components: []});
    containers.get(k.id).components.push(c);
  }
  // An end of a contract or interaction, as the container level sees it: its container, a party, or the component
  // itself when no container holds it.
  const endOf = id => (containerOf.has(id) ? {kind: 'container', id: containerOf.get(id)} : parties.has(id) ? {kind: 'party', id} : containers.has(id) ? {kind: 'container', id} : comps.some(c => c.id === id) ? {kind: 'component', id} : null);
  return {comps, containers: [...containers.values()], containerOf, unplaced, parties, endOf};
}

// Level 2: the containers (and the components no container holds, each drawn as an open container), the stores the
// components keep data in, the external systems, and the contracts between them, counted between containers.
export function containerDiagram(p, R = c4Reading(p), base = notationDiagram(p, 'container')) {
  if (!R.comps.length) return null;
  const {D, node, group, edge} = diagram(base, C4_SCENES.container), name = str(p?.name) || 'The system';
  group('c4:system', 'system', name, {sub: 'System boundary'});
  // Round 24 (D-24-07): every node says what it is (container, component, store, party), so a fold groups each by its
  // natural group (figure-budget.js foldKeys: a component by its module, a party with the external systems) and names it.
  for (const k of R.containers) node(k.id, 'physicalTech', k.title, {sub: [productOf(k.record), plural(k.components.length, 'component')].filter(Boolean).join(' · '), ref: k.ref, group: 'c4:system', record: k.record, type: 'container'});
  for (const c of R.unplaced) node(c.id, 'physicalApp', c.title, {sub: 'container not chosen', ref: c.ref || '', group: 'c4:system', hatched: true, record: c, type: 'component'});
  // The stores the base container picture found (state capabilities realised by a product), with the uses that reach them.
  for (const n of base?.nodes || []) if (n.kind === 'physicalData') node(n.id, 'physicalData', n.fullTitle || n.title, {sub: n.sub, ref: n.ref, group: 'c4:system', hatched: n.hatched, record: n.record, type: 'store'});
  const at = id => R.endOf(id), keyOf = e => (e ? e.id : null);
  for (const e of base?.edges || []) { const store = D.nodes.find(n => n.id === e.to && n.kind === 'physicalData'); if (store) edge(keyOf(at(e.from)), store.id, e.fullLabel || e.label, {kind: 'uses', qualifier: e.fullQualifier || e.qualifier}); }
  // Contracts between two ends, each pair once, with the contracts it carries.
  const pairs = new Map();
  for (const c of list(p?.interfaces?.contracts)) {
    const a = at(c.from), b = at(c.to); if (!a || !b || a.id === b.id) continue;
    for (const x of [a, b]) if (x.kind === 'party') { const pt = R.parties.get(x.id); node(pt.id, 'physicalApp', pt.title, {sub: 'External system', ref: pt.ref || '', record: pt, type: 'party'}); }
    const key = a.id + '>' + b.id; if (!pairs.has(key)) pairs.set(key, {from: a.id, to: b.id, refs: [], protocols: new Set()});
    const x = pairs.get(key); x.refs.push(c.ref || c.id); if (str(c.protocol)) x.protocols.add(str(c.protocol));
  }
  for (const x of pairs.values()) edge(x.from, x.to, x.refs.length === 1 ? x.refs[0] : plural(x.refs.length, 'contract'), {kind: 'uses', qualifier: [...x.protocols].slice(0, 2).join(', '), id: 'c4c:' + x.from + '>' + x.to});
  if (!R.containers.length) D.notes.push('No component names its container yet (Chapter 5), and none is derived from a compute need: each component is drawn as a container not chosen.');
  return D;
}

// Level 3: one container's components, the interactions and contracts between them, and the containers and external
// systems they reach, each drawn once outside the container's boundary.
export function componentDiagram(p, container, R = c4Reading(p), base = notationDiagram(p, 'container')) {
  const {D, node, group, edge} = diagram(base, C4_SCENES.component), mine = new Set(container.components.map(c => c.id));
  group(container.id, 'system', (container.ref ? container.ref + ' · ' : '') + container.title, {sub: 'Container'});
  for (const c of container.components) node(c.id, 'physicalApp', c.title, {sub: str(c.kind) && c.kind !== 'not-stated' ? c.kind : '', ref: c.ref || '', group: container.id, record: c, type: 'component'});
  const outside = id => {
    if (mine.has(id)) return id;
    const e = R.endOf(id); if (!e) return null;
    if (e.kind === 'party') { const pt = R.parties.get(e.id); node(pt.id, 'physicalApp', pt.title, {sub: 'External system', ref: pt.ref || '', record: pt, type: 'party'}); return pt.id; }
    if (e.kind === 'container') { const k = R.containers.find(x => x.id === e.id); node(k.id, 'physicalTech', k.title, {sub: 'Container · ' + plural(k.components.length, 'component'), ref: k.ref, record: k.record, type: 'container'}); return k.id; }
    const c = R.comps.find(x => x.id === e.id); node(c.id, 'physicalApp', c.title, {sub: 'container not chosen', ref: c.ref || '', hatched: true, record: c, type: 'component'}); return c.id;
  };
  for (const c of list(p?.interfaces?.contracts)) {
    if (!mine.has(c.from) && !mine.has(c.to)) continue;
    const a = outside(c.from), b = outside(c.to);
    edge(a, b, c.ref || c.id, {kind: 'uses', qualifier: str(c.operation) || str(c.protocol), id: 'c4k:' + c.id, record: c});
  }
  for (const k of list(p?.realisation?.connections)) {
    if (!mine.has(k.from) && !mine.has(k.to)) continue;
    edge(outside(k.from), outside(k.to), str(k.label) || 'interacts with', {kind: 'flow', qualifier: str(k.interaction), id: 'c4i:' + (k.id || k.from + '>' + k.to)});
  }
  return D;
}

// The containers whose component diagrams the SDD's body draws (the lead's decision on figure heights): the
// BODY_CONTAINERS that hold the most components, in reading order; the figures annex draws every one. Round 24: by
// module, the BODY_MODULES that hold the most components (the same rule; a module's entry carries its own `container`).
export const BODY_CONTAINERS = 6, BODY_MODULES = 6;
export function containersInBody(components, max = BODY_CONTAINERS) {
  const ranked = components.map((x, i) => [x, i]).sort((a, b) => b[0].container.components.length - a[0].container.components.length || a[1] - b[1]);
  return new Set(ranked.slice(0, max).map(([x]) => x));
}
export const modulesInBody = (components, max = BODY_MODULES) => containersInBody(components, max);

// ---------------------------------------------------------------- by module (round 24, D-24-07)
// The containers decide the C4 levels when they partition the components: at least one holds a component and none holds
// CONTAINER_SHARE of them or more.
export const CONTAINER_SHARE = 0.8;
export function containersDecided(R) {
  if (!R.comps.length) return true;
  const most = Math.max(0, ...R.containers.map(k => k.components.length));
  return most > 0 && most < CONTAINER_SHARE * R.comps.length;
}
// A record's home module (round 24 part 3): the one module whose figures draw it in full, and under which the SDD's section
// 4 prints it in full (sdd-architecture.js moduleLayout reads it from here): its platform module when it is in one (in
// several, the one that owns or serves the most of the requirements it realises, the tree's order breaking a tie, so a
// reporting service stands under the reporting module rather than under a module whose reporting it also serves), else
// its first module in the tree's order; '' for a record in no module. `modulesOf(id)`: its modules in the tree's order,
// as module-scope.js places it (recordModules, else recordAttachments). The requirements a component realises are the
// curated links section 4 reads: those of the responsibilities allocated to it (apart from those it only supports) and
// those it names itself.
export function moduleHomes(p) {
  return passValue(p, 'sdd:module-homes', () => {
    const T = moduleTree(p), RM = recordModules(p), RA = recordAttachments(p), rank = new Map(T.modules.map((m, i) => [m.group.id, i])), platform = new Set(T.modules.filter(m => m.group.role === 'platform').map(m => m.group.id));
    const modulesOf = id => { const e = RM.get(id), ms = e?.modules?.length ? e.modules : RA.get(id)?.modules || []; return ms.filter(m => rank.has(m)).sort((a, b) => rank.get(a) - rank.get(b)); };
    const inScope = new Set(reviewRequirements(p).map(r => r.id)), resp = new Map(list(p?.logical?.responsibilities).map(r => [r.id, r])), comps = new Map(list(p?.realisation?.components).map(c => [c.id, c]));
    const mapsOf = new Map(); for (const m of list(p?.logical?.mappings)) { if (!mapsOf.has(m.physicalId)) mapsOf.set(m.physicalId, []); mapsOf.get(m.physicalId).push(m); }
    const realised = id => {
      const c = comps.get(id), out = new Set(); if (!c) return out;
      for (const m of mapsOf.get(id) || []) { const r = resp.get(m.logicalId); if (r && (mappingRole(m) || 'realises') !== 'supports') for (const q of linkedRequirementIds(p, r)) if (inScope.has(q)) out.add(q); }
      for (const q of linkedRequirementIds(p, c)) if (inScope.has(q)) out.add(q);
      return out;
    };
    const reach = (id, m) => { let n = 0; for (const q of realised(id)) if (T.home.get(q)?.moduleId === m || (T.served.get(q) || []).includes(m)) n++; return n; };
    const homes = new Map();
    const homeOf = id => {
      if (!homes.has(id)) { const ms = modulesOf(id), ps = ms.filter(m => platform.has(m)); homes.set(id, ps.length > 1 ? ps.map(m => [m, reach(id, m)]).sort((a, b) => b[1] - a[1] || rank.get(a[0]) - rank.get(b[0]))[0][0] : ps[0] || ms[0] || ''); }
      return homes.get(id);
    };
    return {homeOf, modulesOf};
  });
}
// The modules as the C4 levels read them, placed as module-scope.js places a record for every reader that lays the design
// out by module (the SDD's Section 4 among them): each module of the tree with the components in it (recordModules:
// through the Chapter 4 responsibility group that realises it, or the component's own links; a record those place
// nowhere, by what it touches, recordAttachments), and the components no module holds. A component in several modules
// is in each (`components`; `shared` counts them, `modulesOf` names its modules in the tree's order) and has one home
// (`home`, the components a module is home to; `moduleOf`, a component's home: moduleHomes), where the figures draw it in
// full and from where its lines run. Empty without a module structure.
export function c4Modules(p, R = c4Reading(p)) {
  const T = moduleTree(p);
  if (!T.modules.length) return {modules: [], moduleOf: new Map(), modulesOf: new Map(), outside: R.comps.slice(), shared: 0};
  const H = moduleHomes(p);
  const modules = T.modules.map((m, i) => ({id: m.group.id, ref: m.group.id, title: m.group.title, platform: m.group.role === 'platform', record: m.group, order: i, components: [], home: []}));
  const byId = new Map(modules.map(u => [u.id, u])), moduleOf = new Map(), modulesOf = new Map(), outside = []; let shared = 0;
  for (const c of R.comps) {
    const ms = H.modulesOf(c.id).filter(m => byId.has(m));
    if (!ms.length) { outside.push(c); continue; }
    if (ms.length > 1) shared++;
    for (const m of ms) byId.get(m).components.push(c);
    const h = byId.has(H.homeOf(c.id)) ? H.homeOf(c.id) : ms[0];
    byId.get(h).home.push(c); moduleOf.set(c.id, h); modulesOf.set(c.id, ms);
  }
  return {modules, moduleOf, modulesOf, outside, shared};
}
const moduleKicker = u => (u.platform ? 'Platform module' : 'Business module');
// Why the modules stand for the containers, in a sentence for the figure's note and the section's text.
export function moduleContainerWhy(R) {
  const most = Math.max(0, ...R.containers.map(k => k.components.length));
  return !most ? 'No container is named for the components yet: each module stands for a container until they are decided.' : `One container holds ${most === R.comps.length ? 'all ' + plural(most, 'component') : plural(most, 'component') + ' of ' + R.comps.length.toLocaleString('en-GB')}: each module stands for a container until they are decided.`;
}

// A set of records as one compact box that lists them (notation-layout.js listBox: the module map's style), the most
// connected first: a module and its components, a kind of external system and its systems.
const MAP_W = 136, LIST_LINES = 3;
// The lines a box of the container level by module keeps (round 24 part 3), the heaviest it can (the module map keeps two,
// notation-model.js MAP.LINKS). Three: on the synthetic register of the owner's shape (twenty modules, their shared
// services, five stores; 136 pairs of boxes with a line) two keep 18 lines, three 25, four 33 and five 41, each on one A4
// page with every word at 7 pt or more and none over another (every line does not fit a page); from four on, the routes
// between the business modules and the platform band run side by side in bands a reader cannot follow, and with two a
// shared service keeps too few of the modules that use it to show what it is for. The notes count the lines left out;
// the component figures and section 4 name every contract.
export const CONTAINER_LINKS = 3;
// A counted line's words: its count in print (a contract's reference stays on the line's title, the hover on screen, and
// in section 4's tables), what it stands for on its title.
const countWords = (n, one, refs) => ({label: plural(n, one), full: plural(n, one) + (refs.length ? ': ' + refs.slice(0, 12).join(', ') + (refs.length > 12 ? ' …' : '') : '')});
const rankBy = (xs, weight) => xs.map((x, i) => [x, i]).sort((a, b) => (weight.get(b[0].id) || 0) - (weight.get(a[0].id) || 0) || a[1] - b[1]).map(([x]) => x);
// (a component carries its reference, `refs`: the components of one module often share the start of their names, which a
// short line cuts; an external system keeps its name alone)
const listing = (xs, weight, lines, {refs = false, ...extra} = {}) => ({list: rankBy(xs, weight).slice(0, lines).map(x => ({id: x.id, ref: refs ? str(x.ref) : '', title: x.title || x.id})), count: xs.length, n: xs.length, compact: true, w: MAP_W, ...extra});

// Level 2 by module: each module that holds a component as one logical container, a box with the components it is home to
// counted and the most connected named (up to `lines`), and the components it shares with other modules counted (each is
// drawn in its home module); the business modules in the system's grid and the platform modules in a band below them;
// the components no module holds in one box; the stores; the external systems by their kind in a band above. One line
// per pair of boxes, its count in print: the contracts between their components ("3 contracts"), a module's components'
// uses of a store ("uses: 4"); each box keeps its `links` heaviest lines (CONTAINER_LINKS) and the notes count the rest.
// The SDD names fewer components a box until the figure fits a page (sdd-document.js). Positions are a grid
// (notation-layout.js GRID).
export function moduleContainerDiagram(p, R = c4Reading(p), Mo = c4Modules(p, R), base = notationDiagram(p, 'container'), {lines = LIST_LINES, links = CONTAINER_LINKS} = {}) {
  if (!R.comps.length) return null;
  const {D, node, group, edge} = diagram(base, C4_SCENES.moduleContainer), name = str(p?.name) || 'The system', used = Mo.modules.filter(u => u.components.length);
  const contracts = list(p?.interfaces?.contracts), weight = new Map(), isComp = new Set(R.comps.map(c => c.id));
  for (const c of contracts) for (const id of [c.from, c.to]) weight.set(id, (weight.get(id) || 0) + 1);
  // The external systems that exchange with a component, by their kind, in a band above the system.
  const inPlay = new Set(contracts.flatMap(c => (isComp.has(c.from) || isComp.has(c.to) ? [c.from, c.to] : [])).filter(id => R.parties.has(id)));
  const kinds = new Map();
  for (const id of inPlay) { const pt = R.parties.get(id), k = PARTY_KINDS.includes(pt.kind) ? pt.kind : ''; if (!kinds.has(k)) kinds.set(k, []); kinds.get(k).push(pt); }
  const kindOf = new Map();
  if (kinds.size) group('c4:outside', 'external', 'External systems', {sub: 'by kind'}).grid = true;
  for (const k of [...PARTY_KINDS, ''].filter(k => kinds.has(k))) {
    const xs = kinds.get(k), id = 'c4:parties:' + (k || 'none'), n = node(id, 'physicalApp', partyGroupTitle(k), {sub: plural(xs.length, 'external system'), group: 'c4:outside', type: 'party-kind'});
    n.kicker = 'External systems'; n.listing = listing(xs, weight, lines); for (const pt of xs) kindOf.set(pt.id, id);
  }
  // The modules are a set, not a flow: they stand as a grid, the platform band below the business modules.
  const sys = group('c4:system', 'system', name, {sub: 'modules for the containers not decided yet'}); sys.grid = true; D.grid = true;
  // (a box counts the components it is home to and names the most connected; those it shares, drawn in their home, are counted)
  const box = (u, gid) => {
    const home = u.home || u.components, others = u.components.length - home.length;
    const n = node(u.id, 'logicalApp', u.title, {sub: [home.length ? plural(home.length, 'component') : 'no component of its own', others ? others + ' shared' : ''].filter(Boolean).join(' · '), ref: u.ref, group: gid, record: u.record, type: 'module'});
    n.kicker = moduleKicker(u); if (home.length) n.listing = listing(home, weight, lines, {refs: true});
  };
  for (const u of used) if (!u.platform) box(u, 'c4:system');
  if (Mo.outside.length) { const n = node('c4:no-module', 'physicalApp', 'In no module', {sub: plural(Mo.outside.length, 'component'), group: 'c4:system', hatched: true, type: 'component-group'}); n.kicker = 'Components'; n.listing = listing(Mo.outside, weight, lines, {refs: true}); }
  for (const n of base?.nodes || []) if (n.kind === 'physicalData') node(n.id, 'physicalData', n.fullTitle || n.title, {sub: n.sub, ref: n.ref, group: 'c4:system', hatched: n.hatched, record: n.record, type: 'store'});
  if (used.some(u => u.platform)) group('c4:platform', 'module', 'Platform modules', {sub: 'shared services', parent: 'c4:system'}).grid = true;
  for (const u of used) if (u.platform) box(u, 'c4:platform');
  // A component stands in its home module (c4Modules), an external system in the box of its kind.
  const at = id => (Mo.moduleOf.has(id) ? Mo.moduleOf.get(id) : kindOf.has(id) ? kindOf.get(id) : isComp.has(id) ? 'c4:no-module' : null);
  // The lines: one per pair of boxes, whichever way its contracts run (drawn the way most of them run, both ends marked
  // when they run both ways), and one per module and store its components keep data in, each counted.
  const pairs = new Map(), refOf = id => str(R.comps.find(c => c.id === id)?.ref) || id;
  for (const c of contracts) {
    const a = at(c.from), b = at(c.to); if (!a || !b || a === b) continue;
    const key = 'c:' + (a < b ? a + '>' + b : b + '>' + a); if (!pairs.has(key)) pairs.set(key, {key, a: a < b ? a : b, b: a < b ? b : a, fwd: 0, n: 0, refs: [], one: 'contract'});
    const x = pairs.get(key); x.n++; x.refs.push(c.ref || c.id); if (x.a === a) x.fwd++;
  }
  for (const e of base?.edges || []) {
    const store = D.nodes.find(n => n.id === e.to && n.kind === 'physicalData'), a = store ? at(e.from) : null; if (!a) continue;
    const key = 's:' + a + '>' + store.id; if (!pairs.has(key)) pairs.set(key, {key, a, b: store.id, fwd: 0, n: 0, refs: [], uses: new Set(), store: true});
    const x = pairs.get(key); if (!x.uses.has(e.from)) { x.uses.add(e.from); x.n++; x.fwd++; x.refs.push(refOf(e.from)); }
  }
  // Each box keeps `links` lines at most, the heaviest it can: first every box its heaviest line whose other end has room
  // (the boxes with the fewest lines first, toward the least held end, so a module the shared services and stores draw
  // on keeps a line of its own before those hubs fill), then the heaviest of the rest while both ends have room. The rest
  // are counted in the notes.
  const all = [...pairs.values()].sort((x, y) => y.n - x.n || (x.key < y.key ? -1 : 1)), held = new Map(), kept = new Set(), linesOf = new Map(), place = new Map(D.nodes.map((n, i) => [n.id, i]));
  for (const x of all) for (const id of [x.a, x.b]) { if (!linesOf.has(id)) linesOf.set(id, []); linesOf.get(id).push(x); }
  const room = id => (held.get(id) || 0) < links, take = x => { kept.add(x); for (const id of [x.a, x.b]) held.set(id, (held.get(id) || 0) + 1); };
  for (const id of [...linesOf.keys()].sort((a, b) => linesOf.get(a).length - linesOf.get(b).length || (place.get(a) ?? 1e9) - (place.get(b) ?? 1e9))) {
    if (held.get(id)) continue;
    const other = x => (x.a === id ? x.b : x.a), x = linesOf.get(id).filter(x => !kept.has(x) && room(x.a) && room(x.b)).sort((x, y) => y.n - x.n || (held.get(other(x)) || 0) - (held.get(other(y)) || 0) || (x.key < y.key ? -1 : 1))[0];
    if (x) take(x);
  }
  for (const x of all) if (!kept.has(x) && room(x.a) && room(x.b)) take(x);
  for (const x of all.filter(x => kept.has(x))) {
    const [from, to] = x.store || x.fwd * 2 >= x.n ? [x.a, x.b] : [x.b, x.a], w = x.store ? {label: x.n === 1 ? 'uses' : 'uses: ' + x.n, full: 'uses: ' + x.n + ' (' + x.refs.slice(0, 12).join(', ') + ')'} : countWords(x.n, x.one, x.refs);
    const e = edge(from, to, w.label, {kind: 'uses', id: (x.store ? 'c4s:' : 'c4c:') + from + '>' + to});
    if (!e) continue;
    if (!x.store && x.fwd > 0 && x.fwd < x.n) e.ends = 'both';
    e.aggregate = true; e.fullLabel = w.full;
  }
  // Its boxes and bands say what they are (modules, the platform band, external systems by kind): its key keys the lines.
  // (its notes, the most important first: a printed figure carries the first ones, sdd-figures.js printNotes)
  D.key = 'relationships';
  D.notes.push(moduleContainerWhy(R));
  const left = all.length - kept.size;
  if (left) D.notes.push(`${plural(left, 'lighter line')} ${left === 1 ? 'is' : 'are'} not drawn: each box keeps ${links} at most, the heaviest it can; the component figures and section 4 name every contract.`);
  if (Mo.shared) D.notes.push(`${plural(Mo.shared, 'component')} ${Mo.shared === 1 ? 'is' : 'are'} in more than one module: ${Mo.shared === 1 ? 'it is' : 'each is'} counted and drawn in ${Mo.shared === 1 ? 'its' : 'its own'} home module (a platform service in its platform module, else the first), where section 4 describes ${Mo.shared === 1 ? 'it' : 'each'} in full.`);
  const empty = Mo.modules.length - used.length;
  if (empty) D.notes.push(`${plural(empty, 'module')} ${empty === 1 ? 'holds' : 'hold'} no component yet (the module map shows ${empty === 1 ? 'it' : 'them'}).`);
  return D;
}

// Level 3 by module (round 24 part 3: drawn for the components it is about): the module's own components, those it is home
// to (c4Modules), in full inside its boundary (marked `focus`: a fold groups them by kind), each saying which other modules
// share it. Everything else stands outside as one box per end its components reach, and only when one of its own
// components reaches it: the module that is home to another component (a platform module's box names the services used,
// another module's the components used, the most used first), the components in no module, each kind of external system,
// each store. One line per own component and box (and per two own components), its count in print ("2 contracts", the
// references on the line's title): no line runs between two boxes outside, so a service many modules share is drawn in
// full once, in its home module's figure, with one line from it to each module that uses it.
export function moduleComponentDiagram(p, u, R = c4Reading(p), Mo = c4Modules(p, R), base = notationDiagram(p, 'container'), {lines = LIST_LINES} = {}) {
  const {D, node, group, edge} = diagram(base, C4_SCENES.moduleComponent), own = u.home || u.components, mine = new Set(own.map(c => c.id)), byId = new Map(Mo.modules.map(m => [m.id, m]));
  const boundary = group(u.id, 'system', (u.ref ? u.ref + ' · ' : '') + u.title, {sub: moduleKicker(u)}); if (boundary) { boundary.focus = true; boundary.grid = true; } D.grid = true; D.key = 'lines';
  // (a component the module shares with others says with which: its home figure is the one place it is drawn in full)
  const also = c => (Mo.modulesOf?.get(c.id) || []).filter(m => m !== u.id).map(m => byId.get(m)?.ref || m);
  for (const c of own) { const xs = also(c); node(c.id, 'physicalApp', c.title, {sub: [str(c.kind) && c.kind !== 'not-stated' ? c.kind : '', xs.length ? 'shared with ' + (xs.length > 2 ? plural(xs.length, 'module') : xs.join(', ')) : ''].filter(Boolean).join(' · '), ref: c.ref || '', group: u.id, record: c, type: 'component'}); }
  const comp = new Map(R.comps.map(c => [c.id, c]));
  // The box an outside end stands in: the module that is home to it, the components in no module, its kind of external
  // system; and what each box names (the records its own components reach there, with how often; `members`, all of them).
  const boxOf = id => {
    if (mine.has(id)) return id;
    if (R.parties.has(id)) { const k = R.parties.get(id).kind; return 'c4:parties:' + (PARTY_KINDS.includes(k) ? k : 'none'); }
    if (comp.has(id)) { const m = Mo.moduleOf.get(id); return m ? 'ctx:' + m : 'c4:no-module'; }
    return null;
  };
  const members = new Map(), reached = (box, id) => { if (mine.has(id)) return; let m = members.get(box); if (!m) members.set(box, m = new Map()); m.set(id, (m.get(id) || 0) + 1); };
  // One line per own component and box (or per two own components), whichever way its contracts run, counted.
  const pairs = new Map(), add = (from, to, kind, ref, one) => {
    const a = boxOf(from), b = boxOf(to); if (!a || !b || a === b || (!mine.has(a) && !mine.has(b))) return;
    reached(a, from); reached(b, to);
    const [x, y] = mine.has(a) && (!mine.has(b) || a < b) ? [a, b] : [b, a], key = kind + ':' + x + '>' + y;
    if (!pairs.has(key)) pairs.set(key, {key, a: x, b: y, kind, one, fwd: 0, n: 0, refs: []});
    const q = pairs.get(key); q.n++; if (ref) q.refs.push(ref); if (x === a) q.fwd++;
  };
  for (const c of list(p?.interfaces?.contracts)) if (mine.has(c.from) || mine.has(c.to)) add(c.from, c.to, 'uses', c.ref || c.id, 'contract');
  for (const k of list(p?.realisation?.connections)) if (mine.has(k.from) || mine.has(k.to)) add(k.from, k.to, 'flow', str(k.label), 'interaction');
  // The boxes, in a stable order: the modules in the tree's order, the components in no module, the kinds of external system.
  const listed = box => [...(members.get(box) || new Map())].sort((a, b) => b[1] - a[1]);
  for (const m of Mo.modules) {
    const box = 'ctx:' + m.id; if (!members.has(box)) continue;
    const xs = listed(box), n = node(box, 'logicalApp', m.title, {sub: plural(xs.length, m.platform ? 'service' : 'component') + ' used', ref: m.ref, record: m.record, type: 'module'});
    if (n) { n.kicker = moduleKicker(m); n.listing = {list: xs.slice(0, lines).map(([id]) => ({id, ref: str(comp.get(id)?.ref), title: comp.get(id)?.title || id})), count: xs.length}; n.members = xs.map(([id]) => id); }
  }
  if (members.has('c4:no-module')) { const xs = listed('c4:no-module'), n = node('c4:no-module', 'physicalApp', 'In no module', {sub: plural(xs.length, 'component') + ' used', hatched: true, type: 'component-group'}); if (n) { n.kicker = 'Components'; n.listing = {list: xs.slice(0, lines).map(([id]) => ({id, ref: str(comp.get(id)?.ref), title: comp.get(id)?.title || id})), count: xs.length}; n.members = xs.map(([id]) => id); } }
  for (const k of [...PARTY_KINDS, 'none']) {
    const box = 'c4:parties:' + k; if (!members.has(box)) continue;
    const xs = listed(box), n = node(box, 'physicalApp', partyGroupTitle(k === 'none' ? '' : k), {sub: plural(xs.length, 'external system'), type: 'party-kind'});
    if (n) { n.kicker = 'External systems'; n.listing = {list: xs.slice(0, lines).map(([id]) => ({id, ref: '', title: R.parties.get(id)?.title || id})), count: xs.length}; n.members = xs.map(([id]) => id); }
  }
  for (const q of pairs.values()) {
    const [from, to] = q.fwd * 2 >= q.n ? [q.a, q.b] : [q.b, q.a], w = countWords(q.n, q.one, q.refs);
    const e = edge(from, to, w.label, {kind: q.kind, id: 'c4k:' + q.key}); if (!e) continue;
    if (q.fwd > 0 && q.fwd < q.n) e.ends = 'both';
    e.aggregate = true; e.fullLabel = w.full;
  }
  // The stores its own components keep data in (the base container picture's stores and the uses that reach them).
  for (const e of base?.edges || []) { if (!mine.has(e.from)) continue; const s = base.nodes.find(n => n.id === e.to && n.kind === 'physicalData'); if (!s) continue; node(s.id, 'physicalData', s.fullTitle || s.title, {sub: s.sub, ref: s.ref, hatched: s.hatched, record: s.record, type: 'store'}); const x = edge(e.from, s.id, 'uses', {kind: 'uses', id: 'c4s:' + e.from + '>' + s.id}); if (x) x.fullLabel = 'uses ' + (e.fullLabel || e.label || 'the store') + (e.fullQualifier || e.qualifier ? ' (' + (e.fullQualifier || e.qualifier) + ')' : ''); }
  // The components the module shares but another module is home to: drawn in full there, named here.
  const away = u.components.filter(c => !mine.has(c.id));
  if (away.length) D.notes.push(`${away.length === 1 ? 'One component it shares is' : plural(away.length, 'component') + ' it shares are'} drawn in full in ${away.length === 1 ? 'its' : 'their'} home module's figure: ${away.slice(0, 3).map(c => (c.ref ? c.ref + ' ' : '') + c.title + ' (' + (byId.get(Mo.moduleOf.get(c.id))?.ref || '') + ')').join(', ')}${away.length > 3 ? ' and ' + (away.length - 3) + ' more' : ''}.`);
  return D;
}

// The deployment the SDD draws: the production environment when one is recorded (else the first with placements, else
// the first), and the others named.
export function deploymentChoice(p) {
  const envs = list(p?.runtime?.environments), placed = new Set(list(p?.runtime?.placements).map(l => list(p?.runtime?.plans).find(r => r.id === l.planId)?.environmentId).filter(Boolean));
  const pick = envs.find(e => /^production/i.test(str(e.stage)) && placed.has(e.id)) || envs.find(e => placed.has(e.id)) || envs[0] || null;
  return {environment: pick, others: envs.filter(e => e !== pick)};
}

// The four levels as diagrams, with what the section says around them: read once in a pass over the document (the
// figures and the text of section 5 read the same diagrams; nothing changes them).
export function c4Diagrams(p) {
  return passValue(p, 'sdd:c4', () => c4Of(p));
}
// Round 24 (D-24-07): `byModule` says the levels read the modules (the containers do not partition the components and
// the modules hold some of them); then `components` holds one entry per module drawn at level 3 ({container: the module
// as its pseudo-container {id, ref, title, components (those it is home to), shared (those it shares, drawn in their
// home), module: true, platform}, module, D}): a module home to a component that holds two components or more, or is home
// to one shared with other modules (part 3: the one figure that draws it in full). `single` the modules of one component
// of their own and no other, `elsewhere` the modules whose components are all drawn in their home elsewhere, `unplaced`
// the components no module holds, and `containerWhy` says why the modules stand for the containers.
function c4Of(p) {
  const R = c4Reading(p), dep = deploymentChoice(p), base = R.comps.length ? notationDiagram(p, 'container') : null;
  const context = notationDiagram(p, 'context'), deployment = dep.environment ? notationDiagram(p, 'deployment', {environmentId: dep.environment.id}) : null;
  const Mo = c4Modules(p, R), byModule = !containersDecided(R) && Mo.modules.some(u => u.components.length);
  const levels = byModule ? (() => {
    const as = u => ({id: u.id, ref: u.ref, title: u.title, components: u.home, shared: u.components.filter(c => !u.home.includes(c)), module: true, platform: u.platform});
    const drawn = u => u.home.length > 0 && (u.components.length > 1 || u.home.some(c => (Mo.modulesOf.get(c.id) || []).length > 1));
    return {container: moduleContainerDiagram(p, R, Mo, base), components: Mo.modules.filter(drawn).map(u => ({container: as(u), module: u, D: moduleComponentDiagram(p, u, R, Mo, base)})), single: Mo.modules.filter(u => !drawn(u) && u.home.length === 1).map(as), elsewhere: Mo.modules.filter(u => !u.home.length && u.components.length).map(as), unplaced: Mo.outside};
  })() : (() => {
    const many = R.containers.filter(k => k.components.length > 1);
    return {container: containerDiagram(p, R, base), components: many.map(k => ({container: k, D: componentDiagram(p, k, R, base)})), single: R.containers.filter(k => k.components.length === 1), elsewhere: [], unplaced: R.unplaced};
  })();
  // (`containerAt(lines)`: the container level by module naming fewer components a box, for a page it must fit)
  return {reading: R, modules: Mo, byModule, containerBy: byModule ? 'module' : 'container', containerWhy: byModule ? moduleContainerWhy(R) : '', containerAt: byModule ? lines => moduleContainerDiagram(p, R, Mo, base, {lines}) : null, context: context?.nodes.length ? context : null, contextNote: context?.notes?.[0] || '', ...levels, deployment: deployment?.nodes.length ? deployment : null, deploymentNote: deployment?.notes?.[0] || '', environment: dep.environment, otherEnvironments: dep.others};
}
