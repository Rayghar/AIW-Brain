// Review desk — the Running board (round 4, C): every running part of the design drawn by the shared notation
// renderer, as one more picture of the one model. The grid layouts of the old board graphic are retired; the desk's
// own views read as tables (desk-view.js) and this module gives the one picture the desk draws itself.
//
// runningBoard() reads the desk's model (desk-model.js) into a notation diagram (the shape notation-model.js gives
// every scene): each running part (RUN-xxx) is a placement element inside the container of where Chapter 10 places it
// — its zone, the zones it spans, or "Not placed" — within its environment; the components the parts realize or
// serve and the requirements those components fulfil stand above them, joined by the relationships the vitals trace
// (part → component → requirement) in the kit's relationship kinds. Each part carries its state in the review's
// words — to fix, to confirm or passing — read by rule from its vitals. boardLayout() arranges the diagram with the
// kit's own "grouped" arrangement (notation-layout.js; a container's crowded rank stands as a grid of rows no wider than
// the page, so a large design stays a page wide), ordering the parts inside each container by what
// they connect to so that lines cross as little as they can. Pure and deterministic; nothing here changes the project,
// and a position is never a model fact.
import {notationLayout, NL} from './notation-layout.js';
import {foldDiagram, foldKeys, SCREEN_BUDGET} from './figure-budget.js';
import {KINDS, GROUP_KINDS, PALETTE, styleOf} from './notation-palette.js';
import {CHECK_WORDS, CHECK_GLYPHS} from './readiness-model.js';

// The bands of What it takes (its specification sheet), from the edge inwards.
export const LOAD_BANDS = [
  {id: 'edge', label: 'Edge', note: 'where every request enters'},
  {id: 'parts', label: 'Services and workers', note: 'in the order work flows'},
  {id: 'data', label: 'Data and messaging', note: 'what the parts keep and hand on'},
  {id: 'platform', label: 'Platform', note: 'what everything runs on'},
  {id: 'outside', label: 'Outside', note: 'what other systems must take'}
];

// The picture as a scene of the notation: what viewpointOf, diagramText and the Key read.
export const BOARD_SCENE = {id: 'running-board', chapters: [11], title: 'Running board', standard: 'Deployment view · running parts by placement', arrangement: 'grouped', audience: 'Reviewers, operations',
  purpose: 'Every running part where Chapter 10 places it, its vitals in words, and what it runs: the components it realizes or serves and the requirements they fulfil.'};
export const BOARD_ARRANGEMENT = 'grouped';

// A part's state in the review's words, read by rule from its vitals: to fix while a vital reads critical, to confirm
// while one is to watch or gives no signal, passing otherwise (every vital normal or not carried). The words and their
// glyphs are the ones Validate and Output use (readiness-model.js); never "blocking". `ring` is the state the kit's
// vitals overlay draws around the element.
const RING = {fix: 'bad', confirm: 'warn', pass: 'ok'};
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
export function partStatus(row) {
  const n = s => (row?.vitals || []).filter(v => v.state === s).length;
  const counts = {bad: n('bad'), warn: n('warn'), none: n('none'), ok: n('ok'), na: n('na')};
  const status = counts.bad ? 'fix' : counts.warn || counts.none ? 'confirm' : 'pass';
  const parts = [counts.bad ? `${counts.bad} critical` : '', counts.warn ? `${counts.warn} to watch` : '', counts.none ? `${counts.none} with no signal` : ''].filter(Boolean);
  const behind = status === 'fix' ? counts.bad : status === 'confirm' ? counts.warn + counts.none : 0;
  return {status, word: CHECK_WORDS[status], label: cap1(CHECK_WORDS[status]), glyph: CHECK_GLYPHS[status], ring: RING[status], counts, behind,
    text: parts.length ? `${parts.join(', ')} of ${(row?.vitals || []).length} vitals` : `every vital carried is within its target`};
}

const COMPONENT = PALETTE.component.label;
const text = (v, n = 80) => { const t = String(v ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

// The Running board as a notation diagram. `p` is the project the desk reads (DM.p); nothing of it is changed.
export function runningBoard(DM) {
  const p = DM?.p || {}, D = {scene: BOARD_SCENE, nodes: [], groups: [], edges: [], notes: [], header: {model: text(p.name), template: 'AIW notation · TOGAF element types · ArchiMate relationships', author: '', created: '', modified: text(p.updatedAt, 30), version: p.contentVersion != null ? 'v' + p.contentVersion : '', baseline: ''}, environmentId: DM?.env || null};
  if (!DM) { D.counts = {nodes: 0, groups: 0, edges: 0}; return D; }
  const seen = new Set();
  const node = (id, kind, title, {kicker = null, sub = '', ref = '', group = null, hatched = false, type = null, record = null, sol = null} = {}) => {
    if (!id || seen.has(id)) return; seen.add(id);
    const k = KINDS[kind];
    D.nodes.push({id, kind, kicker: kicker || k.kicker, family: k.family, layer: k.layer, level: k.level, title: text(title) || id, fullTitle: text(title, 400) || id, sub, ref: text(ref, 24), group, hatched, muted: false, record, sol, type});
  };
  const group = (id, kind, title, {sub = '', parent = null} = {}) => {
    if (!D.groups.some(g => g.id === id)) D.groups.push({id, kind, layer: GROUP_KINDS[kind]?.layer || 'deployment', title: text(title, 60) || id, fullTitle: text(title, 200) || id, sub: text(sub), parent});
    return id;
  };
  const edges = new Set();
  const edge = (from, to, kind, label) => {
    const id = `rb:${from}>${to}`;
    if (!seen.has(from) || !seen.has(to) || from === to || edges.has(id)) return; edges.add(id);
    const st = styleOf(kind);
    D.edges.push({id, from, to, label, fullLabel: label || st.label, kind, family: st.family, step: null, ends: 'one', qualifier: '', cardinality: null, weak: false, up: !!st.up, record: null, crossing: false});
  };
  // Where the parts are placed: the environment the desk reads, its zones (an empty zone is drawn: an empty recovery
  // site is a finding), a container for parts that span zones, and one for the parts without a place to run.
  const env = (p.runtime?.environments || []).find(e => e.id === DM.env) || null;
  if (env) group(env.id, 'environment', env.title, {sub: env.stage || ''});
  const zones = (p.runtime?.zones || []).filter(z => !env || z.environmentId === env.id);
  for (const z of zones) group(z.id, 'zone', z.title, {sub: z.failureDomain || '', parent: env?.id || null});
  const zoneTitle = id => zones.find(z => z.id === id)?.title || id;
  const placeOf = row => {
    const zs = row.f?.zonesAll || [];
    if (!zs.length) return group('unplaced:' + (env?.id || 'design'), 'unplaced', 'Not placed', {sub: 'parts without a place to run', parent: env?.id || null});
    if (zs.length === 1) return zones.some(z => z.id === zs[0]) ? zs[0] : group(zs[0], 'zone', zs[0], {parent: env?.id || null});
    return group('zones:' + zs.join('+'), 'zone', zs.map(zoneTitle).join(' and '), {sub: 'across ' + zs.length + ' zones', parent: env?.id || null});
  };
  // The running parts, each with its state in words.
  for (const row of DM.rows) {
    const s = partStatus(row);
    // Its reference leads its name (a part and the component it runs often share a name); the box keeps its
    // bottom line for the state, so no reference badge stands in its way.
    node(row.id, 'placement', `${row.ref} ${row.title}`, {kicker: 'Running part', sub: `${s.glyph} ${s.label}`, group: placeOf(row), hatched: !(row.f?.zonesAll || []).length, type: 'runtime', record: row.plan || null, sol: row.id});
  }
  // What each part runs: the component it realizes (as the connected model reads a runtime plan), or — for a platform
  // part — the components whose recorded needs the capability it realizes meets, which it serves.
  const comps = DM.rows.filter(r => r.assetKind === 'component' && r.asset);
  // A component keeps the kicker its record type has everywhere (notation-palette.js PALETTE), the short one, so that
  // the components stand in one row above the parts; the Key gives the standard's full name.
  for (const r of comps) { node(r.assetId, 'physicalApp', r.asset.title, {kicker: COMPONENT, ref: r.assetRef, type: 'component', record: r.asset}); edge(r.id, r.assetId, 'realizes', 'realizes'); }
  // The requirements and the components their thread passes through (the trace of Chapter 11): the component fulfils
  // the requirement through the responsibilities it realizes.
  for (const t of DM.trace || []) {
    node(t.id, 'requirement', t.req?.title || t.id, {ref: t.id, type: 'requirement', record: t.req || null});
    for (const c of t.cells?.applications || []) { node(c.id, 'physicalApp', c.label, {kicker: COMPONENT, ref: c.ref, type: 'component'}); edge(c.id, t.id, 'fulfils', 'fulfils'); }
  }
  for (const r of DM.rows.filter(x => x.assetKind === 'realisation')) {
    const caps = new Set((r.caps || []).map(c => c.id));
    for (const c of comps) if ((c.caps || []).some(x => caps.has(x.id))) edge(r.id, c.assetId, 'serves', 'serves');
  }
  const unplaced = DM.rows.filter(r => !(r.f?.zonesAll || []).length).length;
  if (!DM.rows.length) D.notes.push('No running part is recorded yet: Chapter 10 records where each part runs.');
  else if (!env) D.notes.push('No environment is recorded: every running part is drawn without a place to run.');
  else if (unplaced) D.notes.push(`${unplaced} of ${DM.rows.length} running parts have no placement in ${env.title}.`);
  D.counts = {nodes: D.nodes.length, groups: D.groups.length, edges: D.edges.length};
  return D;
}

// The kit's grouped arrangement, twice: the second time each container's parts stand in the order of what they
// connect to (the mean position of their neighbours in the first), so that the lines up to the components cross as
// little as they can. Same diagram, same picture, at any window width. A serving line carries no word on the picture
// (there are many; the Key, the hover and every reading of it say "serves").
const quiet = L => { for (const e of L.edges) if (e.kind === 'serves') e.labelHidden = true; return L; };
// Round 12 (P, pictures at size): a board above the screen's budget (figure-budget.js SCREEN_BUDGET) keeps every running
// part as itself in its zone, and groups what the parts run by module and the requirements by requirement group, the
// relationships between them counted (at most BOARD_GROUPS groups beside the parts). The group the reader selects opens
// in place (boardOpenKey gives it for the selection; `open` draws it), and closes when the selection leaves it.
export const BOARD_GROUPS = 40;
export function boardOpenKey(fold, sel) {
  if (!fold || !sel) return null;
  const s = String(sel), key = s.startsWith('fold:') ? s.slice(5).replace(/:more$/, '') : fold.groups.find(g => g.count > 1 && g.members.includes(s))?.key;
  return key && fold.groups.some(g => g.key === key && g.count > 1) ? key : null;
}
// Round 12 (G, GR-FIG-11): `whole` draws every element, the reader's "Show every element", as the chapter pictures do.
export function boardLayout(D0, {project = null, open = null, whole = false} = {}) {
  let D = D0, fold = null;
  if (!whole && D0.nodes.length > SCREEN_BUDGET.nodes) {
    const keys = foldKeys(D0, project), parts = D0.nodes.filter(n => n.type === 'runtime');
    parts.forEach((n, i) => keys.set(n.id, {key: 'part:' + n.id, family: 'zone', title: n.title, ref: '', order: [-1, i], fixed: true}));
    const F = foldDiagram(D0, {project, budget: parts.length + BOARD_GROUPS, keys, open: open ? [open] : [], containers: true});
    if (F.folded) { D = F.overview; fold = {key: F.key, by: F.by, groups: F.groups, open: F.open, total: F.total}; }
  }
  // A grouped board is laid out on the kit's page (rows packed to its width, never wider), so it reads on a screen or two.
  // Only element positions inform the neighbour order. Routes, labels and bundling belong to the final pass;
  // computing them here would search every connector twice without affecting a single position.
  const page = fold || (whole && D0.nodes.length > SCREEN_BUDGET.nodes) ? {page: {width: NL.PAGE, min: 820}} : {};
  const reorder = D.nodes.length > 0 && D.nodes.length <= 150;
  const L1 = notationLayout(D, {arrangement: BOARD_ARRANGEMENT, positionsOnly: reorder, ...page});
  if (!reorder) return {D, L: quiet(L1), fold};
  const cx = new Map(L1.nodes.map(n => [n.id, n.x + n.w / 2])), near = new Map();
  for (const e of D.edges) for (const [a, b] of [[e.from, e.to], [e.to, e.from]]) { if (!near.has(a)) near.set(a, []); near.get(a).push(cx.get(b)); }
  const score = n => { const xs = (near.get(n.id) || []).filter(Number.isFinite); return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : Infinity; };
  const index = new Map(D.nodes.map((n, i) => [n.id, i]));
  const parts = D.nodes.filter(n => n.type === 'runtime').sort((a, b) => score(a) - score(b) || index.get(a.id) - index.get(b.id));
  const ordered = {...D, nodes: [...parts, ...D.nodes.filter(n => n.type !== 'runtime')]};
  return {D: ordered, L: quiet(notationLayout(ordered, {arrangement: BOARD_ARRANGEMENT, ...page})), fold};
}
