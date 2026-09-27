// Chapter 2 Model — Quality drivers.
//
// Two architecture models of the same drivers, drawn from recorded facts and the SA Playbook:
// - Utility tree: utility → quality family → attribute → driver. An attribute the playbook treats
//   as core but no driver covers stands as a hole. Each driver reads what carries it, its
//   scenario, and the playbook tactics the design names — with the evidence.
// - What if: move a driver's target or priority and see, before anything is saved, what stops
//   holding in the decisions, runtime plans, platform and products that carry it, which tactics
//   the playbook offers for the gap, and which other drivers it pulls against.
// Sliced like every chapter model, read through Structure, Flow and Reasoning, walked in priority
// order, and edited only through Chapter 2's own editor and proposals.
import {utilitySource, foldUtility, utilityScope, utilityInsights, describeDriver, utilityWalk, tacticCounts, defaultDepth, sensitivity, ROOT, PROPOSED, PRIORITIES} from './utility-model.js';
import {utilityLayout, utilityHead, tuneLayout, tuneHead, RIPPLE_COLS, UT} from './utility-layout.js';
import {tuneDriver, describeTuning, targetSteps, driverTradeoffs, STATES, planFacts, productLabel} from './design-reasoning.js';
import {attribute, family, locator, FAMILIES} from './playbook-knowledge.js';
import {targetText} from './quality-domain.js';
import {modelStage, sizeModel, placeTip} from './model-stage.js';
import {projectPreferenceKey, projectURL} from './project-context.js';
import {mountBrainContext} from './brain-context-ui.js';
import {solChapterMount, solChapterBind, solSection, solInto, solMark, solOwner} from './chapter-sol.js';
import {createNotation} from './notation-view.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const project = () => window.aiwProjectStore?.value?.document || window.aiwCurrentProject;
// Sol's advice changes the project only through a store command; the view then reads the new document.
const solRefresh = () => { if (root?.isConnected) mountChapterModel({id: pageSel}, cbs); };
const page = () => window.aiwQualityPage;
const PATHS = {diagram: 'M4 4h6v5H4zM14 4h6v5h-6zM9 15h6v5H9zM7 9v3h10V9M12 12v3', structure: 'M6 3v18M18 3v18M6 8h12M6 16h12', flow: 'M3 12h13m-4-5 5 5-5 5M3 5h6M3 19h6', reasoning: 'M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9M9 7h6M9 17h6', tree: 'M4 12h4M8 5v14M8 5h4M8 12h4M8 19h4M12 5h8M12 12h8M12 19h8', tune: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', panel: 'M3 4h18v16H3zM15 4v16', explore: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', plus: 'M12 5v14M5 12h14', spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z', mind: 'm3 7 9-4 9 4-9 4-9-4m0 5 9 4 9-4m-18 5 9 4 9-4', edit: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4', dissect: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14M21 21l-5-5M8 11h6', play: 'M7 4v16l13-8z', book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7', back: 'M15 5l-7 7 7 7'};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[n] || PATHS.tree}"/></svg>`;
const LENSES = [
  {id: 'structure', label: 'Structure', like: 'skeleton', q: 'What carries each driver: the components, platform, products and runtime plans it reaches.'},
  {id: 'flow', label: 'Flow', like: 'muscles', q: 'Each driver as a scenario: what happens, how the system must respond, and how that is measured.'},
  {id: 'reasoning', label: 'Reasoning', like: 'DNA', q: 'Why the design can meet it: the playbook tactics it names, and the decisions that weigh it.'}
];
const STATE = {confirmed: 'Confirmed', reference: 'Reference', draft: 'Draft', suggestion: 'Proposal'};
const OP = {'At least': '≥', 'At most': '≤', Exactly: '='};
const EFFECT = {supports: ['✓', 'supports'], tension: ['⚠', 'creates tension'], neutral: ['·', 'little direct effect'], unknown: ['?', 'needs evidence']};

let root = null, UM = null, lastDoc = null, cbs = {}, F = null, L = null, T = null, fitPending = true, stage = null, lastClick = {id: null, t: 0}, pageSel, lastGhost = '';
let NT = null;
let S = {view: 'tree', lens: 'reasoning', scope: {kind: 'system'}, depth: 'auto', sel: null, panel: true, walk: -1, tune: {driver: null, targetValue: null, priority: null}};
// The standard diagram (notation-view.js) and the elements only it draws.
const diagramView = () => S.view === 'diagram';
const drawn = id => diagramView() && !!NT?.diagram()?.nodes.some(n => n.id === id);
const seen = new Set();
const pref = () => projectPreferenceKey('aiw-utility-model-v1');
function load() { try { const v = JSON.parse(localStorage.getItem(pref()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
function save() { try { localStorage.setItem(pref(), JSON.stringify({view: S.view, lens: S.lens, scope: S.scope, depth: S.depth, panel: S.panel})); } catch { /* preferences are optional */ } }

// ---------------------------------------------------------------- mount / leave

export function mountChapterModel(selection, callbacks = {}) {
  const p = project(), host = document.querySelector('.r-studio > .r-surface');
  if (!p || !host) return;
  cbs = callbacks;
  solChapterMount(p, 2, solRefresh);
  if (!root) {
    root = document.createElement('section'); root.className = 'cm um'; root.setAttribute('aria-label', 'Chapter 2 model: quality drivers');
    root.innerHTML = shell();
    stage = modelStage(root, {headHeight: () => (S.view === 'diagram' ? 0 : tuneView() ? tuneHead() : utilityHead()), railWidth: l => l.rail || 0, onHover: tip});
    stage.bind(); bind();
    // The standard diagram shares the stage, the companion and the selection with the chapter's own views.
    NT = createNotation({chapter: 2, root, stage, project, onSelect: id => select(id)});
    NT.onChange = full => { if (full) fitPending = true; render(); };
    NT.bindDrag();
    const v = load();
    for (const k of ['lens', 'depth']) if (typeof v[k] === 'string') S[k] = v[k];
    if (v.scope && typeof v.scope === 'object') S.scope = v.scope;
    if (typeof v.panel === 'boolean') S.panel = v.panel;
    if (!LENSES.some(l => l.id === S.lens)) S.lens = 'reasoning';
  }
  const first = !UM;
  if (host.firstElementChild !== root) host.prepend(root);
  document.body.classList.add('cm-active', 'am-active');
  if (p !== lastDoc || !UM) { lastDoc = p; rebuild(p); }
  if (first && UM) { S.sel = null; const want = window.aiwChapterModels ? window.aiwChapterModels.takeLink(2) : null; if (known(want)) { S.sel = want; setTimeout(revealSelection, 60); } }
  else if (UM && pageSel !== undefined && selection?.id !== pageSel && known(selection?.id)) { S.sel = selection.id; setTimeout(revealSelection, 60); }
  pageSel = selection?.id ?? null;
  followGhost();
  render();
  sizeModel(root, 'cm-expanded');
}
export function leaveChapterModel() {
  document.body.classList.remove('cm-active', 'cm-expanded');
  root?.remove();
}
function rebuild(p) {
  try { UM = utilitySource(p); } catch (e) { console.error('Quality model', e); UM = null; return; }
  if (S.sel && !known(S.sel)) S.sel = null;
  if (S.scope?.id && utilityScope(UM, S.scope).kind === 'system') S.scope = {kind: 'system'};
  if (S.tune.driver && !UM.D.has(S.tune.driver)) S.tune = {driver: null, targetValue: null, priority: null};
}
const knownBase = id => !!id && !!UM && (UM.D.has(id) || id === ROOT || (id.startsWith('A:') && UM.attrs.has(id.slice(2))) || (id.startsWith('F:') && UM.families.some(f => 'F:' + f.id === id)) || (id === PROPOSED && !!newGhost()));
const known = id => drawn(id) || knownBase(id);
const ghost = () => { const g = page()?.ghost; return g && g.record ? g : null; };
const newGhost = () => { const g = ghost(); return g && g.mode === 'new' ? g : null; };
function followGhost() {
  const g = ghost(), key = g ? g.id + ':' + (g.target || '') + ':' + (g.record?.category || '') : '';
  if (key && key !== lastGhost) { S.sel = g.mode === 'new' ? PROPOSED : g.target && known(g.target) ? g.target : S.sel; S.walk = -1; if (tuneView()) { S.view = 'tree'; fitPending = true; } setTimeout(revealSelection, 80); }
  if (!key && S.sel === PROPOSED) S.sel = null;
  lastGhost = key;
}

// ---------------------------------------------------------------- shell

function shell() {
  return `<header class="cm-top"><div class="cm-title"><small>Chapter 2 · Model</small><strong>Quality drivers</strong></div>
   <nav class="cm-crumbs" aria-label="Where you are"></nav>
   <div class="cm-views" role="group" aria-label="Model"><button type="button" class="cm-view" data-um="view" data-id="diagram" title="The quality drivers in the standard notation">${icon('diagram')}<span>Diagram</span></button><button type="button" class="cm-view" data-um="view" data-id="tree">${icon('tree')}<span>Utility tree</span></button><button type="button" class="cm-view" data-um="view" data-id="tune">${icon('tune')}<span>What if</span></button></div>
   <div class="cm-actions"><button type="button" class="cm-btn" data-um="add">${icon('plus')}<span>Add driver</span></button>
    <button type="button" class="cm-btn" data-um="explore" title="Chapter 2's own quality map, with every perspective">${icon('explore')}<span>All perspectives</span></button>
    <button type="button" class="cm-btn icon" data-um="expand" aria-pressed="false" aria-label="Expand the model" title="Expand">${icon('expand')}</button>
    <button type="button" class="cm-btn icon" data-um="panel" aria-pressed="true" aria-label="Show the companion panel" title="Companion">${icon('panel')}</button></div></header>
  <div class="cm-bar"><div class="cm-lenses" role="group" aria-label="Lens"></div><div class="cm-depth" role="group" aria-label="Elements"></div><div class="um-controls" role="group" aria-label="What if"></div><p class="cm-state" role="status" aria-live="polite"></p></div>
  <div class="cm-banner"></div>
  <div class="cm-body"><div class="cm-stage" tabindex="0" aria-label="Quality canvas. Drag or scroll to move; Ctrl or Command and scroll to zoom.">
    <div class="cm-world"><svg class="cm-svg" aria-hidden="true"></svg><div class="cm-html"></div></div>
    <div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div>
    <div class="cm-key cm-min"><button type="button" class="cm-kt" data-um="key" aria-expanded="false">Key</button><div class="cm-legend"></div></div>
    <div class="cm-zoom"><button type="button" data-um="zout" aria-label="Zoom out">−</button><button type="button" data-um="zin" aria-label="Zoom in">+</button><button type="button" data-um="fit" aria-label="Fit the width">${icon('fit')}</button></div>
  </div><aside class="cm-panel" aria-label="Companion"></aside></div>
  <footer class="cm-walk" aria-label="Walk the priorities"></footer><div class="cm-tip" role="tooltip" hidden></div>`;
}

// ---------------------------------------------------------------- render

const D = id => UM.D.get(id);
const tuneView = () => S.view === 'tune';
function scope() { return utilityScope(UM, S.scope); }
function depth() { return S.depth === 'auto' ? defaultDepth(UM) : S.depth; }
const stateOf = d => (d.confirmed ? 'confirmed' : d.origin === 'reference' ? 'reference' : d.origin === 'suggestion' ? 'suggestion' : 'draft');
const target = (d, value = d.targetValue) => value === '' || value == null ? '<em class="miss">no target</em>' : `<b>${esc(OP[d.operator] || d.operator)} ${esc(value)} ${esc(d.unit)}</b>`;
const titleOf = id => D(id)?.title || (id?.startsWith('A:') ? UM.attrs.get(id.slice(2))?.name : id?.startsWith('F:') ? family(id.slice(2))?.name : id === ROOT ? 'Utility' : id === PROPOSED ? newGhost()?.record.title : '') || id;
const refTitle = id => (D(id) ? id + ' ' + D(id).title : titleOf(id));
function tuneDriverId() { const id = S.tune.driver || (D(S.sel) ? S.sel : null) || UM.drivers[0]?.id || null; return id && D(id) ? id : null; }
function tuning() { const id = tuneDriverId(); return id ? tuneDriver(UM.R, id, {targetValue: S.tune.targetValue, priority: S.tune.priority}) : null; }

function render() {
  if (!root) return;
  if (!UM) { root.querySelector('.cm-html').innerHTML = '<p class="cm-empty">The quality model could not be prepared for this project.</p>'; return; }
  root.classList.remove('cm-lens-structure', 'cm-lens-flow', 'cm-lens-reasoning');
  root.classList.add('cm-lens-' + S.lens);
  root.classList.toggle('um-tuning', tuneView());
  root.classList.toggle('um-walking', S.walk >= 0);
  root.querySelector('.cm-body').classList.toggle('no-panel', !S.panel);
  root.classList.toggle('nt-active', diagramView());
  if (diagramView()) {
    // The standard diagram: the notation module draws; the chapter keeps its chrome, companion and camera.
    L = NT.render({sel: S.sel, viewW: stage.box().w});
    root.querySelector('.cm-heads-in').innerHTML = ''; root.querySelector('.cm-rail-in').innerHTML = '';
    chromeDiagram(); panel(); walkBar();
    stage.use(L, 'diagram|' + (NT.scene()?.id || '') + '|' + NT.arrangement());
    if (fitPending) { fitPending = false; NT.fit(); } else stage.clamp();
    stage.apply(); return;
  }
  root.querySelector('[data-um="panel"]').setAttribute('aria-pressed', String(S.panel));
  const world = root.querySelector('.cm-world'), svg = root.querySelector('.cm-svg');
  // Geometry depends on the records, the scope, the depth, an unsaved proposal and the tuning — never the lens.
  if (tuneView()) { T = tuning(); L = T ? tuneLayout(T) : {kind: 'tune', W: 600, H: 300, top: tuneHead(), rail: 0, cards: [], bands: [], edges: []}; F = null; }
  else { T = null; F = foldUtility(UM, scope(), depth(), {ghost: ghost()}); L = utilityLayout(F); }
  world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
  svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
  svg.style.width = L.W + 'px'; svg.style.height = L.H + 'px';
  const hl = highlight();
  if (tuneView()) {
    if (!T) { svg.innerHTML = ''; root.querySelector('.cm-html').innerHTML = `<div class="um-empty" style="left:30px;top:${tuneHead() + 24}px"><b>No quality driver yet</b><p>Add a driver to see what its target asks of the design.</p><button type="button" class="cm-btn primary" data-um="add">${icon('plus')}Add driver</button></div>`; root.querySelector('.cm-heads-in').innerHTML = ''; }
    else { svg.innerHTML = tuneSVG(hl); root.querySelector('.cm-html').innerHTML = tuneHTML(hl); tuneHeads(); tuneRail(); }
  } else if (!UM.drivers.length && !ghost()) { svg.innerHTML = defs() + treeSVG(hl); root.querySelector('.cm-html').innerHTML = treeHTML(hl) + emptyHTML(); treeHeads(); }
  else { svg.innerHTML = defs() + treeSVG(hl); root.querySelector('.cm-html').innerHTML = treeHTML(hl); treeHeads(); }
  if (!tuneView() || !T) root.querySelector('.cm-rail-in').innerHTML = '';
  chrome(); panel(); walkBar();
  stage.use(L, JSON.stringify([S.view, S.scope?.kind || 'system', S.scope?.id || '', depth(), tuneView() ? tuneDriverId() : '']));
  if (fitPending) { fitPending = false; stage.fit(); } else stage.clamp();
  stage.apply();
}
function emptyHTML() {
  return `<div class="um-empty" style="left:${UT.COL.root + 60}px;top:${utilityHead() + 24}px"><b>No quality driver yet</b><p>A driver makes a quality measurable: what happens, how the system must respond, and the target that says it did. The dashed attributes are the ones the SA Playbook treats as core.</p><div><button type="button" class="cm-btn primary" data-um="add">${icon('plus')}Add driver</button></div></div>`;
}

// What an object concerns, in the terms of the drawn tree.
function concerns(id) {
  const out = {ids: new Set([id])};
  if (!id) return out;
  const add = x => out.ids.add(x);
  if (D(id)) { const d = D(id); add('A:' + d.category); add('F:' + attribute(d.category)?.family); add(ROOT); }
  else if (id.startsWith('A:')) { const a = UM.attrs.get(id.slice(2)); if (a) { a.drivers.forEach(add); add('F:' + a.family); add(ROOT); } }
  else if (id.startsWith('F:')) { const f = UM.families.find(x => 'F:' + x.id === id); f?.attributes.forEach(a => { add('A:' + a); UM.attrs.get(a).drivers.forEach(add); }); add(ROOT); }
  else if (id === PROPOSED) { const g = newGhost(); if (g) { add('A:' + g.record.category); add('F:' + attribute(g.record.category)?.family); add(ROOT); } }
  return out;
}
function highlight() {
  const out = {on: false, ids: new Set(), now: null};
  if (tuneView()) { if (S.sel && S.sel.startsWith('E:')) { out.on = true; out.ids = new Set([S.sel.slice(2)]); } return out; }
  if (S.walk >= 0) { const id = utilityWalk(UM)[S.walk]; if (id) { out.on = true; out.now = id; out.ids = concerns(id).ids; } }
  else if (S.sel) { out.on = true; out.ids = concerns(S.sel).ids; }
  return out;
}
const lit = (hl, id) => (hl.on ? (hl.ids.has(id) ? ' lit' : ' dim') : '');

// ---------------------------------------------------------------- utility tree

function defs() {
  const m = (id, fill) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1 9 5 1 9z" style="fill:${fill};stroke:none"/></marker>`;
  return `<defs>${m('um-a', '#9aa596')}${m('um-a-h', '#a8741f')}${m('um-a-b', '#a8412f')}${m('um-a-r', '#a0701f')}${m('um-a-g', '#2f6b4f')}</defs>`;
}
function roundPath(pts, r = 8) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i], [px, py] = pts[i - 1], n = pts[i + 1];
    if (!n) { d += `L${x} ${y}`; break; }
    const inLen = Math.hypot(x - px, y - py), outLen = Math.hypot(n[0] - x, n[1] - y), rr = Math.min(r, inLen / 2, outLen / 2);
    if (rr < 1) { d += `L${x} ${y}`; continue; }
    const ax = x - Math.sign(x - px) * rr, ay = y - Math.sign(y - py) * rr, bx = x + Math.sign(n[0] - x) * rr, by = y + Math.sign(n[1] - y) * rr;
    d += `L${ax} ${ay}Q${x} ${y} ${bx} ${by}`;
  }
  return d;
}
function treeSVG(hl) {
  const out = [];
  L.bands.forEach((b, i) => out.push(`<rect class="um-band${i % 2 ? ' odd' : ''}" x="${L.cols[1].x - 10}" y="${b.y}" width="${L.W - L.cols[1].x}" height="${b.h}" rx="12"/>`));
  const ord = L.edges.map(e => ({e, on: hl.on && hl.ids.has(e.from) && hl.ids.has(e.to)})).sort((a, b) => a.on - b.on);
  for (const {e, on} of ord) {
    const kind = L.cards.find(c => c.id === e.to)?.node.kind;
    out.push(`<path class="um-edge${kind === 'hole' ? ' hole' : kind === 'proposed' ? ' proposed' : ''}${on ? ' lit' : hl.on ? ' dim' : ''}" d="${roundPath(e.pts)}"/>`);
  }
  return out.join('');
}
const prioChip = p => `<i class="um-prio ${esc(String(p).toLowerCase())}">${esc(p)}</i>`;
const compChip = c => `<i class="um-x k-comp" title="${esc('Chapter 5 · ' + c.ref + ' ' + c.title)}">${esc(c.ref)} ${esc(c.title)}</i>`;
function tacticChips(id, max = 4) {
  const ts = UM.tactics.get(id) || [], shown = ts.filter(t => t.state !== 'open');
  return shown.slice(0, max).map(t => `<i class="um-tac ${t.state}" title="${esc(t.tactic.name + ' — ' + (t.state === 'named' ? 'named in the design' : 'only in a considered alternative') + ': ' + t.evidence.map(e => e.ref + ' ' + e.field).join(', '))}">${t.state === 'named' ? '✓ ' : '◌ '}${esc(t.tactic.name)}</i>`).join('') + (shown.length > max ? `<i class="um-more">+${shown.length - max}</i>` : '');
}
function decisionChips(id) {
  const ch = UM.chains.get(id);
  return (ch?.decisions || []).map(x => { const sel = x.selected, eff = sel ? x.alternatives.find(a => a.alt.id === sel.id)?.effect : null, tense = x.alternatives.filter(a => a.effect === 'tension').length; return `<i class="um-x k-adr${eff ? ' ' + eff : ''}" title="${esc(x.record.id + ' ' + x.record.question + (sel ? ' — chosen: ' + sel.title : ' — no alternative chosen') + (tense ? '; ' + tense + ' alternative' + (tense === 1 ? ' is' : 's are') + ' in tension with ' + id : ''))}">${esc(x.record.id)}${sel ? ' ' + EFFECT[eff || 'unknown'][0] : tense ? ' ⚠' : ''}</i>`; }).join('');
}
function driverCard(c, hl) {
  const d = D(c.id), st = stateOf(d), g = ghost(), edited = g && g.mode === 'edit' && g.target === d.id ? g.record : null, ch = UM.chains.get(d.id), n = tacticCounts(UM, d.id);
  const pos = `style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"`;
  const plans = ch?.plans.length || 0, prods = (ch?.realisations || []).map(r => r.product?.product).filter(Boolean);
  const stl = `<span class="um-l1">${(ch?.components || []).map(compChip).join('') || '<em class="miss">carried by no component</em>'}</span><span class="um-l2">${prods.length ? `<i class="um-x k-prod" title="${esc('Chapter 7 products: ' + prods.join(', '))}">${esc(prods.slice(0, 3).join(' · '))}${prods.length > 3 ? ` <b>+${prods.length - 3}</b>` : ''}</i>` : '<em>no product named</em>'}<em>${plans} runtime plan${plans === 1 ? '' : 's'}</em></span>`;
  const fl = `<span class="um-sc" title="${esc(d.stimulus + ' → ' + d.response)}"><b>${esc(d.stimulus || 'No stimulus')}</b> → ${esc(d.response || 'no response recorded')}</span>`;
  const rs = `<span class="um-l1">${tacticChips(d.id) || (n.total ? '<em class="miss">names none of the playbook\'s tactics</em>' : '<em>the playbook has no tactics for this</em>')}</span><span class="um-l2">${decisionChips(d.id) || '<em>no decision weighs it</em>'}</span>`;
  const meter = n.total ? `<span class="um-meter" title="${esc(n.named + ' of ' + n.total + ' playbook tactics named in the design')}"><i style="width:${Math.round(100 * n.named / n.total)}%"></i></span><em>${n.named} of ${n.total} tactics named</em>` : '<em>no playbook tactics</em>';
  return `<div class="um-card drv ${esc(d.priority.toLowerCase())}${edited ? ' ghosted' : ''}${c.node.subject ? ' subject' : ''}${S.sel === d.id ? ' sel' : ''}${hl.now === d.id ? ' now' : ''}${lit(hl, d.id)}" data-card="${esc(d.id)}" ${pos} tabindex="0" role="button" aria-label="${esc('Quality driver ' + d.id + ' ' + d.title)}"><small><b class="um-ref">${esc(d.id)}</b>${prioChip(d.priority)}<i class="um-st ${st}">${STATE[st]}</i></small><b class="um-t">${esc(edited ? edited.title : d.title)}</b><span class="um-target">${target(d, edited ? edited.targetValue : d.targetValue)}<em>${esc(d.window || '')}</em></span><div class="um-lens"><div class="st">${stl}</div><div class="fl">${fl}</div><div class="rs">${rs}</div></div><div class="um-strip">${meter}<button type="button" class="cm-mini" data-um="tune" data-id="${esc(d.id)}">What if…</button></div></div>`;
}
function treeHTML(hl) {
  const out = [];
  for (const c of L.cards) {
    const n = c.node, pos = `style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"`;
    if (n.kind === 'driver') { out.push(driverCard(c, hl)); continue; }
    if (n.kind === 'root') {
      const ds = UM.drivers, by = p => ds.filter(d => d.priority === p).length;
      out.push(`<div class="um-card root${S.sel === ROOT ? ' sel' : ''}${lit(hl, ROOT)}" data-card="${ROOT}" ${pos} tabindex="0" role="button"><small>Utility</small><b class="um-t">${esc(UM.name || 'This design')}</b><span>${ds.length} driver${ds.length === 1 ? '' : 's'}</span><span class="um-pc">${PRIORITIES.filter(by).map(p => `${prioChip(p)}<em>${by(p)}</em>`).join('')}</span></div>`);
      continue;
    }
    if (n.kind === 'family') {
      const f = family(n.family) || {name: 'Other', question: 'Drivers under a concern the playbook does not name.'};
      out.push(`<div class="um-card fam${S.sel === n.id ? ' sel' : ''}${lit(hl, n.id)}" data-card="${esc(n.id)}" ${pos} tabindex="0" role="button"><small>Quality</small><b class="um-t">${esc(f.name)}</b><span>${esc(f.question)}</span></div>`);
      continue;
    }
    if (n.kind === 'hole') {
      const a = UM.attrs.get(n.attr), g = a.knowledge.guide;
      out.push(`<div class="um-card hole${S.sel === n.id ? ' sel' : ''}${lit(hl, n.id)}" data-card="${esc(n.id)}" ${pos} tabindex="0" role="button" aria-label="${esc(a.name + ': no driver yet')}"><small>No driver yet</small><b class="um-t">${esc(a.name)}</b><span class="um-def">Measured by ${esc(g.metrics.slice(0, 3).join(' · ').toLowerCase())}</span><div class="um-strip"><button type="button" class="cm-mini gold" data-um="propose" data-attr="${esc(a.id)}">Explore a ${esc(a.name.toLowerCase())} driver</button></div></div>`);
      continue;
    }
    if (n.kind === 'proposed') {
      const g = newGhost(), r = g?.record || {};
      out.push(`<div class="um-card drv proposed${S.sel === PROPOSED ? ' sel' : ''}${lit(hl, PROPOSED)}" data-card="${PROPOSED}" ${pos} tabindex="0" role="button" aria-label="${esc('Proposal, not saved: ' + n.title)}"><small><b class="um-ref">Proposal · not saved</b>${r.priority ? prioChip(r.priority) : ''}</small><b class="um-t">${esc(n.title)}</b><span class="um-target">${r.targetValue ? target(r) : '<em>target to set</em>'}<em>${esc(r.window || '')}</em></span><div class="um-lens"><div class="st"><span class="um-l1"><em>${esc(r.response || '')}</em></span></div><div class="fl"><span class="um-sc"><b>${esc(r.stimulus || '')}</b> → ${esc(r.response || '')}</span></div><div class="rs"><span class="um-l1"><em>${esc(r.tactic || '')}</em></span></div></div><div class="um-strip"><button type="button" class="cm-mini gold" data-q-action="edit-ghost">Review &amp; edit</button></div></div>`);
      continue;
    }
    // Attribute (possibly folded).
    const a = UM.attrs.get(n.attr), k = a?.knowledge, ds = (a?.drivers || []).map(D);
    const sub = n.folded ? `<span class="um-pc">${PRIORITIES.map(p => [p, ds.filter(d => d.priority === p).length]).filter(x => x[1]).map(([p, m]) => `${prioChip(p)}<em>${m}</em>`).join('')}</span>` : `<span class="um-def">${esc(k?.guide ? k.guide.definition : k?.note || '')}</span>`;
    out.push(`<div class="um-card attr${n.folded ? ' folded' : ''}${S.sel === n.id ? ' sel' : ''}${lit(hl, n.id)}" data-card="${esc(n.id)}" style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;--c:${esc(a?.color || '#8a948a')}" tabindex="0" role="button"><small>${n.count} driver${n.count === 1 ? '' : 's'}${k?.guide ? ' · in the playbook' : ''}</small><b class="um-t">${esc(a ? a.name : 'Other')}</b>${sub}</div>`);
  }
  return out.join('');
}
function treeHeads() {
  const box = root.querySelector('.cm-heads-in'), T = {root: ['Utility', 'what good means here'], family: ['Quality', 'the families of quality'], attribute: ['Attribute', 'as the SA Playbook names them'], driver: ['Driver', 'a measurable scenario, by priority']};
  box.innerHTML = L.cols.map(c => `<div class="um-ch" style="left:${c.x}px;width:${c.w}px;top:8px;height:${UT.HEAD_H - 8}px"><b>${esc(T[c.id][0])}</b><span>${esc(T[c.id][1])}</span></div>`).join('');
  box.style.width = L.W + 'px';
}

// ---------------------------------------------------------------- What if

const STATE_CLS = {breaks: 'breaks', holdsNow: 'holdsnow', revisit: 'revisit', unknown: 'unknown', eases: 'eases', holds: 'holds'};
function tuneSVG() {
  return L.bands.map((b, i) => `<rect class="um-tband${i % 2 ? ' odd' : ''}" x="${L.rail}" y="${b.y}" width="${L.W - L.rail - 4}" height="${b.h}" rx="10"/>`).join('');
}
function tuneHTML(hl) {
  const out = [];
  for (const c of L.cards) {
    const r = c.card, pos = `style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"`, ch = RIPPLE_COLS.find(k => k.id === r.kind);
    const members = r.aggregate ? `<span class="um-mem">${r.members.map(m => `<i class="um-x" data-open="${esc(m.kind + '|' + m.id)}" title="${esc(m.title)}">${esc(m.ref)}</i>`).join('')}</span>` : '';
    const was = r.kind !== 'decision' && r.was && r.was !== r.state && r.state !== 'holdsNow' ? `<em class="um-was">was ${esc(STATES[r.was].toLowerCase())}</em>` : '';
    out.push(`<div class="um-rc ${STATE_CLS[r.state]}${S.sel === 'E:' + r.id ? ' sel' : ''}${lit(hl, r.id)}" data-card="${esc('E:' + r.id)}" ${pos} tabindex="0" role="button"><small><b>${esc(r.aggregate ? ch.chapter : r.ref)}</b><i class="um-state ${STATE_CLS[r.state]}">${esc(STATES[r.state])}</i>${was}</small><b class="um-t">${esc(r.aggregate ? r.title : r.title.replace(/^[A-Z]+-\d+\s/, ''))}</b><p>${esc(r.why)}</p>${members}</div>`);
  }
  if (!L.cards.length) out.push(`<div class="um-empty" style="left:${L.rail + 12}px;top:${tuneHead() + 12}px"><b>Nothing recorded carries it yet</b><p>Link the driver to the responsibilities that answer for it; its components, platform, products and runtime plans then appear here.</p></div>`);
  return out.join('');
}
const SEVERITYLIST = ['breaks', 'holdsNow', 'revisit', 'unknown', 'eases', 'holds'];
function tuneHeads() {
  const box = root.querySelector('.cm-heads-in'), d = T.driver, h = L.head, moved = T.before.targetValue !== T.after.targetValue;
  box.innerHTML = `<div class="um-tdrv ${esc(T.after.priority.toLowerCase())}" style="left:${h.x}px;top:8px;width:${h.w}px;height:${h.h}px"><small><b class="um-ref">${esc(d.id)}</b>${prioChip(T.after.priority)}${T.priorityChanged ? `<em class="um-was">was ${esc(T.before.priority)}</em>` : ''}<span class="um-tc">${SEVERITYLIST.filter(k => T.counts[k]).map(k => `<i class="um-state ${STATE_CLS[k]}">${T.counts[k]} ${esc(STATES[k].toLowerCase())}</i>`).join('')}</span></small><b class="um-t">${esc(d.title)}</b><span class="um-tt">${moved ? `<s>${target(d, T.before.targetValue)}</s> → ${target(d, T.after.targetValue)}` : target(d)} <em>${esc(d.window || '')}</em></span><p>${esc(T.budget.text || 'Move the target or the priority to see what it reaches.')}</p></div>`;
  box.style.width = L.W + 'px';
}
function tuneRail() {
  const box = root.querySelector('.cm-rail-in');
  box.innerHTML = L.bands.map(b => `<div class="um-bt" style="top:${b.y + 4}px;height:${b.h - 8}px"><b>${esc(b.title)}</b><small>${esc(b.chapter)} · ${b.count}</small><span>${SEVERITYLIST.filter(k => b.counts[k]).map(k => `<i class="um-state ${STATE_CLS[k]}">${b.counts[k]}</i>`).join('')}</span></div>`).join('');
  box.style.height = L.H + 'px'; box.style.width = L.rail + 'px';
}
function tuneControls() {
  const id = tuneDriverId(), d = id ? D(id) : null;
  if (!d) return '';
  const v = S.tune.targetValue ?? d.targetValue, pr = S.tune.priority || d.priority, steps = targetSteps(d);
  const pick = UM.drivers.map(x => `<option value="${esc(x.id)}" ${x.id === id ? 'selected' : ''}>${esc(x.id + ' · ' + x.title)}</option>`).join('');
  return `<label class="um-pick"><span>Driver</span><select data-um="tune-driver" aria-label="Driver to tune">${pick}</select></label><div class="um-steps" role="group" aria-label="Target"><span>Target ${esc(OP[d.operator] || d.operator)}</span>${steps.map(s => `<button type="button" class="cm-dep" data-um="tune-target" data-v="${esc(s)}" aria-pressed="${String(s) === String(v)}">${esc(s)}</button>`).join('')}<input type="number" step="any" min="0" data-um="tune-input" value="${esc(v)}" aria-label="Target value"><em>${esc(d.unit)}</em></div><div class="um-steps" role="group" aria-label="Priority"><span>Priority</span>${PRIORITIES.map(p => `<button type="button" class="cm-dep" data-um="tune-priority" data-v="${p}" aria-pressed="${p === pr}">${p}</button>`).join('')}</div>${S.tune.targetValue != null || S.tune.priority ? '<button type="button" class="cm-btn" data-um="tune-reset">Reset</button>' : ''}`;
}

// ---------------------------------------------------------------- chrome

function crumbs() {
  if (tuneView()) { const id = tuneDriverId(); return `<button type="button" data-um="view" data-id="tree">Utility tree</button><span>›</span><button type="button" class="here" data-um="noop">What if · ${esc(id || '')}</button>`; }
  const sc = scope(), parts = [`<button type="button" data-um="scope" data-kind="system" class="${sc.kind === 'system' ? 'here' : ''}">All quality</button>`];
  if (sc.kind === 'driver') { const d = D(sc.id), a = UM.attrs.get(d.category); parts.push('<span>›</span>', `<button type="button" data-um="dissect" data-id="A:${esc(d.category)}">${esc(a?.name || d.category)}</button>`, '<span>›</span>', `<button type="button" class="here" data-um="noop">${esc(d.id)}</button>`); }
  else if (sc.kind !== 'system') parts.push('<span>›</span>', `<button type="button" class="here" data-um="noop">${esc(sc.kind === 'attribute' ? UM.attrs.get(sc.id).name : family(sc.id)?.name || sc.id)}</button>`);
  return parts.join('');
}
// The Diagram view's chrome: the view toggles, the arrange, layers and export controls, the status and the key.
function chromeDiagram() {
  root.querySelectorAll('.cm-view').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === 'diagram')));
  root.querySelector('.cm-lenses').innerHTML = NT.barHTML(); const dp = root.querySelector('.cm-depth'); if (dp) dp.innerHTML = '';
  const st = root.querySelector('.cm-state'); if (st && st.textContent !== NT.status()) st.textContent = NT.status();
  const lg = root.querySelector('.cm-legend'); if (lg) lg.innerHTML = NT.legendHTML();
  const bn = root.querySelector('.cm-banner'); if (bn && typeof pending === 'function') { const i = pending(); bn.innerHTML = i && i.banner ? i.banner() : ''; }
}
function chrome() {
  const sc = scope();
  root.querySelector('.cm-crumbs').innerHTML = crumbs();
  root.querySelectorAll('.cm-view').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === S.view)));
  root.querySelector('.cm-lenses').innerHTML = tuneView() ? '' : LENSES.map(l => `<button type="button" class="cm-lens" data-um="lens" data-id="${l.id}" aria-pressed="${S.lens === l.id}" title="${esc(l.q + ' Like the ' + l.like + '.')}">${icon(l.id)}<span>${l.label}</span></button>`).join('');
  const dp = depth();
  root.querySelector('.cm-depth').innerHTML = !tuneView() && sc.kind === 'system' ? `<span>Elements</span>${[['attributes', 'Attributes'], ['drivers', 'Drivers']].map(([id, t]) => `<button type="button" class="cm-dep" data-um="depth" data-id="${id}" aria-pressed="${dp === id}">${t}</button>`).join('')}` : '';
  root.querySelector('.um-controls').innerHTML = tuneView() ? tuneControls() : '';
  const ds = UM.drivers, holes = [...UM.attrs.values()].filter(a => a.hole).length, named = ds.reduce((n, d) => n + tacticCounts(UM, d.id).named, 0);
  root.querySelector('.cm-state').textContent = tuneView() ? (T ? describeTuning(T) : '') : `${ds.length} driver${ds.length === 1 ? '' : 's'} · ${ds.filter(d => d.priority === 'Critical').length} Critical · ${holes} playbook attribute${holes === 1 ? '' : 's'} with no driver · ${named} tactic${named === 1 ? '' : 's'} named`;
  const g = ghost();
  root.querySelector('.cm-banner').innerHTML = g ? `<section class="dp-banner"><span class="ip-kicker">Quality ${g.mode === 'new' ? 'driver' : 'change'} proposal · not saved</span><b>${esc(g.record.title)}</b><small>${esc(g.reason || g.label || '')}</small><button type="button" class="cm-btn gold" data-q-action="edit-ghost">Review &amp; edit</button><button type="button" class="cm-btn" data-q-action="dismiss-ghost">Dismiss</button></section>` : '';
  root.querySelector('.cm-legend').innerHTML = tuneView()
    ? SEVERITYLIST.map(s => `<p><i class="um-state ${STATE_CLS[s]}">${esc(STATES[s])}</i>${esc({breaks: 'the recorded design no longer meets it', holdsNow: 'meets it now, and did not before', revisit: 'judged against the old target or weighting', unknown: 'the fact needed is not recorded', eases: 'a trade-off becomes easier to accept', holds: 'still meets it'}[s])}</p>`).join('')
    : `<p><span class="k-drv"></span>Driver: a measurable scenario</p><p><span class="k-hole"></span>A core playbook attribute with no driver</p><p><i class="um-tac named k">✓ tactic</i>named in the design</p><p><i class="um-tac considered k">◌ tactic</i>only in a considered alternative</p><p><span class="um-meter k"><i style="width:40%"></i></span>share of the playbook's tactics named</p>`;
}

// ---------------------------------------------------------------- companion

const act = (k, attrs, label, cls = '') => `<button type="button" class="cm-btn ${cls}" data-um="${k}" ${attrs}>${label}</button>`;
const link = id => `<button type="button" class="cm-link" data-sel="${esc(id)}">${esc(refTitle(id))}</button>`;
// Sol's assessment sits in the companion's own Sol section (chapter-sol.js); "More with Sol" opens Sol's panel.
const brain = () => '';
const chapterLink = (ch, obj, label) => `<a class="cm-link" href="${esc(projectURL(`/?chapter=${ch}&tab=model&object=${encodeURIComponent(obj)}`))}">${esc(label)} <small>Chapter ${ch}</small></a>`;
const src = s => `<small class="um-src" title="${esc(s)}">${icon('book')}${esc(locator(s))}</small>`;

function tacticsHTML(id) {
  const ts = UM.tactics.get(id) || [];
  if (!ts.length) { const a = attribute(D(id).category); return `<section><h4>Tactics · the SA Playbook</h4><p class="cm-muted">${esc(a?.note || 'The playbook has no tactics for this attribute.')}</p></section>`; }
  const groups = [...new Set(ts.map(t => t.tactic.group))];
  const row = t => `<div class="um-trow ${t.state}"><b>${t.state === 'named' ? '✓' : t.state === 'considered' ? '◌' : '○'} ${esc(t.tactic.name)}</b>${t.evidence.slice(0, 2).map(e => `<p class="um-ev"><span>Ch ${e.chapter} · ${esc(e.ref)} ${esc(e.field)}${e.kind === 'alternative:considered' ? ' (considered)' : ''}</span>“${esc(e.excerpt)}”</p>`).join('')}<details><summary>What the playbook says</summary><p>${esc(t.tactic.concept)}</p>${t.tactic.example ? `<p><i>Example:</i> ${esc(t.tactic.example)}</p>` : ''}${src(t.tactic.src)}</details></div>`;
  const named = ts.filter(t => t.state !== 'open'), open = ts.filter(t => t.state === 'open');
  return `<section class="um-tactics"><h4>Tactics · the SA Playbook<span>${named.filter(t => t.state === 'named').length} of ${ts.length}</span></h4>${named.length ? named.map(row).join('') : '<p class="cm-muted">The design names none of them yet.</p>'}${open.length ? `<details class="um-open"><summary>${open.length} more the playbook offers</summary>${groups.map(g => { const xs = open.filter(t => t.tactic.group === g); return xs.length ? `<p class="um-group">${esc(g)}</p>${xs.map(row).join('')}` : ''; }).join('')}</details>` : ''}</section>`;
}
function chainHTML(id) {
  const ch = UM.chains.get(id);
  if (!ch) return '';
  const prods = ch.realisations.filter(r => r.product?.product);
  const plans = ch.plans, placed = plans.filter(f => f.placements.length), multi = plans.filter(f => f.active >= 2);
  return `<section><h4>Carried by</h4><dl class="cm-dl"><div class="${ch.responsibilities.length ? '' : 'miss'}"><dt>Responsibilities</dt><dd>${ch.responsibilities.map(r => chapterLink(4, r.id, r.ref + ' ' + r.title)).join('') || 'None'}</dd></div><div class="${ch.components.length ? '' : 'miss'}"><dt>Components</dt><dd>${ch.components.map(c => chapterLink(5, c.id, c.ref + ' ' + c.title)).join('') || 'None'}</dd></div><div><dt>Platform</dt><dd>${ch.capabilities.length} capabilit${ch.capabilities.length === 1 ? 'y' : 'ies'}${ch.capabilities.filter(c => c.essential).length ? ` (${ch.capabilities.filter(c => c.essential).length} essential)` : ''}</dd></div><div class="${prods.length ? '' : 'miss'}"><dt>Products</dt><dd>${prods.map(r => chapterLink(7, r.record.id, productLabel(r.product) + (r.product.selected ? '' : ' · candidate'))).join('') || 'None named in Chapter 7'}</dd></div><div class="${placed.length ? '' : 'miss'}"><dt>Runtime</dt><dd>${plans.length} plan${plans.length === 1 ? '' : 's'} · ${placed.length} placed · ${multi.length} with more than one replica${plans.length ? '<br>' + placed.slice(0, 3).map(f => chapterLink(10, f.plan.id, f.plan.ref + ' ' + f.plan.title + ' · ' + f.active + ' active' + (f.standby ? ', ' + f.standby + ' standby' : ''))).join('') : ''}</dd></div></dl></section>`;
}
function decisionsHTML(id) {
  const ch = UM.chains.get(id);
  if (!ch?.decisions.length) return '';
  return `<section><h4>Decisions that weigh it<span>${ch.decisions.length}</span></h4>${ch.decisions.map(x => `<div class="um-adr"><a class="cm-link" href="${esc(projectURL('/?chapter=3&tab=model&decision=' + encodeURIComponent(x.record.id)))}"><b>${esc(x.record.id)}</b> ${esc(x.record.question)}</a>${x.alternatives.map(a => `<p class="um-alt ${a.effect}${x.selected?.id === a.alt.id ? ' chosen' : ''}"><i>${EFFECT[a.effect][0]}</i>${esc(a.alt.title)}<em>${esc(EFFECT[a.effect][1])}${x.selected?.id === a.alt.id ? ' · chosen' : ''}</em></p>`).join('')}</div>`).join('')}</section>`;
}
function tradeoffsHTML(d) {
  const ts = driverTradeoffs(UM.R, d);
  if (!ts.length) return '';
  const a = attribute(d.category);
  return `<section><h4>Pulls against · the playbook</h4>${ts.map(t => `<div class="um-to"><b>${esc(a.name)} vs ${esc(t.with.toLowerCase())}</b><p>${esc(t.text)}</p>${t.drivers.length ? `<p class="um-to-d">In this design: ${t.drivers.map(x => link(x.id)).join('')}</p>` : ''}</div>`).join('')}${src(a.tradeoffSrc)}</section>`;
}
function specimenDriver(id) {
  const d = D(id), st = stateOf(d), sens = sensitivity(UM, id);
  return `<section class="cm-spec"><h4>Quality driver · ${esc(d.id)}<span class="${st === 'confirmed' ? 'guarded' : ''}">${STATE[st]}</span></h4><p class="cm-spec-t"><b>${esc(d.title)}</b></p><dl class="cm-dl"><div><dt>Attribute</dt><dd>${link('A:' + d.category)}</dd></div><div><dt>Priority</dt><dd>${esc(d.priority)}${sens.length ? `<br><em>A sensitivity point of ${esc([...new Set(sens.map(s => s.decision.id))].join(', '))}</em>` : ''}</dd></div><div><dt>When</dt><dd>${esc(d.stimulus || '—')}${d.conditions ? `<small class="um-srcl">${esc(d.conditions)}</small>` : ''}</dd></div><div><dt>The system</dt><dd>${esc(d.response || '—')}</dd></div><div class="${d.targetValue === '' ? 'miss' : ''}"><dt>Measured</dt><dd>${esc(d.metric || '—')}<br>${target(d)} ${esc(d.window || '')}${d.targetConfirmed ? '' : '<br><em>Target not confirmed</em>'}</dd></div>${d.rationale ? `<div><dt>Why</dt><dd>${esc(d.rationale)}</dd></div>` : ''}</dl>
  <div class="cm-acts">${act('tune', `data-id="${esc(id)}"`, icon('tune') + 'What if…', 'primary')}${act('edit', `data-id="${esc(id)}"`, icon('edit') + 'Edit driver')}<button type="button" class="cm-btn" data-um="dissect" data-id="${esc(id)}">${icon('dissect')}Focus on it</button>${brain()}<button type="button" class="cm-btn" data-brain-launch="mind">${icon('mind')}Mind Factory</button></div></section>${tacticsHTML(id)}${decisionsHTML(id)}${chainHTML(id)}${tradeoffsHTML(d)}`;
}
function specimenAttribute(aid) {
  const a = UM.attrs.get(aid);
  if (!a) return '';
  const k = a.knowledge, g = k.guide;
  const listing = xs => `<ul class="um-ul">${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const tech = g ? `<div class="um-tech">${g.technologies.map(t => `<p><b>${esc(t.kind)}</b>${t.names.map(n => `<i class="um-x k-prod">${esc(n)}</i>`).join('')}</p>`).join('')}</div>` : '';
  return `<section class="cm-spec"><h4>Attribute · ${esc(family(a.family)?.name || '')}${a.hole ? '<span class="exposed">No driver</span>' : `<span>${a.drivers.length} driver${a.drivers.length === 1 ? '' : 's'}</span>`}</h4><p class="cm-spec-t"><b>${esc(a.name)}</b></p>${g ? `<p>${esc(g.definition)}</p><p class="cm-muted">${esc(g.importance)}</p>` : `<p class="cm-muted">${esc(k.note)}</p>`}<dl class="cm-dl">${a.drivers.length ? `<div><dt>Drivers</dt><dd>${a.drivers.map(link).join('')}</dd></div>` : ''}${g ? `<div><dt>Measured by</dt><dd>${listing(g.metrics)}</dd></div><div><dt>Example targets</dt><dd>${listing(g.targets)}</dd></div>` : k.metrics ? `<div><dt>Measured by</dt><dd>${listing(k.metrics)}</dd></div>` : ''}</dl><div class="cm-acts">${a.hole ? act('propose', `data-attr="${esc(aid)}"`, `Explore a ${esc(a.name.toLowerCase())} driver`, 'gold') : ''}${act('add', `data-attr="${esc(aid)}"`, icon('plus') + 'Add a driver for it', a.hole ? '' : 'primary')}${!a.hole ? `<button type="button" class="cm-btn" data-um="dissect" data-id="A:${esc(aid)}">${icon('dissect')}Focus on it</button>` : ''}</div></section>${g ? `<section><h4>Design decisions · the playbook</h4>${listing(g.decisions)}${src(g.src)}</section><section><h4>Technologies the playbook names</h4>${tech}<p class="cm-muted">Examples from the playbook, not choices for this design. Chapter 7 records what realises it.</p></section><section><h4>Verified by</h4>${listing(g.testing)}</section>` : ''}${k.tradeoffs.length ? `<section><h4>Trade-offs · the playbook</h4>${k.tradeoffs.map(t => `<div class="um-to"><b>${esc(a.name)} vs ${esc(t.with.toLowerCase())}</b><p>${esc(t.text)}</p></div>`).join('')}${src(k.tradeoffSrc)}</section>` : ''}`;
}
function specimenOther(id) {
  if (id === ROOT) { const ds = UM.drivers; return `<section class="cm-spec"><h4>Utility</h4><p class="cm-spec-t"><b>${esc(UM.name || 'This design')}</b></p><p>What good means for this design, as measurable drivers under the SA Playbook's qualities. Read it left to right: each quality refines into attributes, each attribute into drivers you can test.</p><dl class="cm-dl">${PRIORITIES.map(p => `<div><dt>${p}</dt><dd>${ds.filter(d => d.priority === p).map(d => link(d.id)).join('') || '—'}</dd></div>`).join('')}</dl></section>`; }
  if (id.startsWith('F:')) { const f = family(id.slice(2)), fm = UM.families.find(x => x.id === id.slice(2)); return `<section class="cm-spec"><h4>Quality</h4><p class="cm-spec-t"><b>${esc(f?.name || id)}</b></p><p>${esc(f?.question || '')}</p><dl class="cm-dl"><div><dt>Attributes</dt><dd>${(fm?.attributes || []).map(a => link('A:' + a)).join('')}</dd></div></dl><div class="cm-acts"><button type="button" class="cm-btn" data-um="dissect" data-id="${esc(id)}">${icon('dissect')}Focus on it</button></div></section>`; }
  return '';
}
function specimenProposal() {
  const g = newGhost(); if (!g) return '';
  const r = g.record;
  return `<section class="cm-spec"><h4>Proposal · not saved</h4><p class="cm-spec-t"><b>${esc(r.title)}</b></p><p>${esc(g.reason || '')}</p><dl class="cm-dl"><div><dt>Attribute</dt><dd>${esc(UM.attrs.get(r.category)?.name || r.category)}</dd></div><div><dt>When</dt><dd>${esc(r.stimulus || '—')}</dd></div><div><dt>The system</dt><dd>${esc(r.response || '—')}</dd></div><div><dt>Measured</dt><dd>${esc(r.metric || '—')}<br>${r.targetValue ? target(r) : '<em>no target yet</em>'} ${esc(r.window || '')}</dd></div><div><dt>Tactic</dt><dd>${esc(r.tactic || '—')}</dd></div></dl><div class="cm-acts"><button type="button" class="cm-btn gold" data-q-action="edit-ghost">${icon('edit')}Review &amp; edit</button><button type="button" class="cm-btn" data-q-action="dismiss-ghost">Dismiss</button></div></section>`;
}
function reading() {
  if (diagramView()) return NT.readingHTML();
  if (tuneView()) return `<section><h4>Reading this view</h4><p>Move the <b>target</b> or the <b>priority</b> above. The driver stays on the left; everything it reaches stands to its right, by chapter: the <b>decisions</b> that weigh it, the <b>runtime</b> plans, <b>platform</b> and <b>products</b> that carry it.</p><p>Each card says whether the recorded design still meets it, and why — arithmetic on recorded facts, never a guess. Nothing is saved until you open the editor.</p></section>`;
  return `<section><h4>Reading this view</h4><p>A <b>utility tree</b>: from what good means, through the SA Playbook's qualities and attributes, to the <b>drivers</b> — scenarios you can measure, in priority order.</p><p>A dashed attribute is one the playbook treats as core that no driver covers. The meter on each driver shows how many of the playbook's tactics the design already names.</p></section>`;
}
function insightsHTML() {
  const list = utilityInsights(UM, scope()).slice(0, 8);
  if (!list.length) return '';
  const g = ghost();
  return `<section><h4>What the model shows<span>${list.length}</span></h4>${list.map(x => `<div class="um-insw"><button type="button" class="cm-ins ${x.kind}" data-sel="${esc(x.id || '')}"><span>${esc(x.text)}</span>${x.ask ? `<small>Ask: ${esc(x.ask)}</small>` : ''}</button>${x.proposal === 'missing' && x.attr && !g ? `<button type="button" class="cm-mini gold" data-um="propose" data-attr="${esc(x.attr)}">Explore a ${esc(UM.attrs.get(x.attr).name.toLowerCase())} driver</button>` : ''}</div>`).join('')}<p class="cm-muted">Drawn from recorded drivers, decisions, runtime plans and products, read against the SA Playbook. Prompts for review, not verdicts.</p></section>`;
}
function findingsHTML() {
  const fs = UM.findings.filter(f => f.code !== 'confirmation' && f.level);
  if (!fs.length) return '';
  const groups = new Map();
  for (const f of fs) { if (!groups.has(f.title)) groups.set(f.title, []); groups.get(f.title).push(f); }
  return `<section><h4>Chapter 2 checks<span>${fs.length}</span></h4>${[...groups].slice(0, 6).map(([k, g]) => `<button type="button" class="cm-fg ${g.some(f => f.level === 'error') ? 'error' : ''}" data-sel="${esc(known(g[0].driverId || g[0].objectId) ? (g[0].driverId || g[0].objectId) : '')}"><b>${esc(k)}</b><small>${g.length}</small></button>`).join('')}<a class="cm-muted" href="${esc(projectURL('/?chapter=2&tab=validate&validate=readiness'))}">All checks on Validate →</a></section>`;
}
function tunePanel() {
  if (!T) return '';
  const d = T.driver, sel = S.sel?.startsWith('E:') ? L.cards.find(c => 'E:' + c.id === S.sel)?.card : null;
  const selHTML = sel ? `<section class="cm-spec"><h4>${esc(RIPPLE_COLS.find(c => c.id === sel.kind)?.chapter || '')} · ${esc(STATES[sel.state])}</h4><p class="cm-spec-t"><b>${esc(sel.title)}</b></p><p>${esc(sel.why)}</p>${sel.members.map(m => m.facts ? `<p class="um-ev"><span>${esc(m.ref)} · ${m.facts.active} active${m.facts.standby ? ', ' + m.facts.standby + ' standby' : ''} · ${m.facts.zonesAll.length} zone${m.facts.zonesAll.length === 1 ? '' : 's'} · ${esc(m.facts.stateMode)} · recovery ${m.facts.recoveryMinutes == null ? 'not recorded' : m.facts.recoveryMinutes + ' min'}</span></p>` : '').join('')}<div class="cm-acts">${sel.members.slice(0, 4).map(m => { const ch = {decision: 3, plan: 10, capability: 6, product: 7, path: 8}[m.kind]; return ch && m.kind !== 'path' ? `<a class="cm-btn" href="${esc(projectURL(`/?chapter=${ch}&tab=model&${m.kind === 'decision' ? 'decision' : 'object'}=${encodeURIComponent(m.id)}`))}">Open ${esc(m.ref)}</a>` : ''; }).join('')}</div></section>` : '';
  const sugg = T.suggested.length ? `<section class="um-tactics"><h4>The playbook suggests<span>${T.suggested.length}</span></h4><p class="cm-muted">${esc(attribute(d.category)?.name || '')} tactics the design does not name yet${T.direction > 0 ? ', for a stricter target' : ''}:</p>${T.suggested.map(t => `<div class="um-trow open"><b>○ ${esc(t.tactic.name)}</b><p>${esc(t.tactic.concept)}</p>${src(t.tactic.src)}</div>`).join('')}</section>` : '';
  const tos = T.tradeoffs.filter(t => t.drivers.length || T.direction > 0);
  const pulls = tos.length ? `<section><h4>Raising it pulls against · the playbook</h4>${tos.map(t => `<div class="um-to"><b>vs ${esc(t.with.toLowerCase())}</b><p>${esc(t.text)}</p>${t.drivers.length ? `<p class="um-to-d">${t.drivers.map(x => link(x.id)).join('')}</p>` : ''}</div>`).join('')}${src(tos[0].src)}</section>` : '';
  const changed = T.before.targetValue !== T.after.targetValue || T.priorityChanged;
  const apply = `<section><h4>Keep it?</h4><p class="cm-muted">${changed ? 'Nothing is saved yet. Open Chapter 2\'s editor with these values to review and save them; everything downstream will then ask to be reviewed.' : 'Move the target or the priority to see what it reaches.'}</p><div class="cm-acts">${changed ? act('tune-apply', `data-id="${esc(d.id)}"`, icon('edit') + 'Open in the editor with these values', 'primary') + act('tune-reset', '', 'Reset') : ''}${act('view', 'data-id="tree"', icon('back') + 'Back to the utility tree')}</div></section>`;
  return selHTML + `<section><h4>The arithmetic</h4><p>${esc(T.budget.text || 'This target has no arithmetic of its own; the decisions and tactics below carry it.')}</p></section>` + apply + sugg + pulls;
}
function panel() {
  const box = root.querySelector('.cm-panel');
  solMark(root, project(), 2);
  if (!S.panel) { box.innerHTML = ''; return; }
  if (tuneView()) { box.innerHTML = solInto(tunePanel(), solSection(project(), 2, tuneDriverId(), {whatIf: S.tune})) + reading(); return; }
  const s = S.sel;
  const spec = s === PROPOSED ? specimenProposal() : D(s) ? specimenDriver(s) : s?.startsWith('A:') ? specimenAttribute(s.slice(2)) : s ? specimenOther(s) : '';
  if (!spec && s && drawn(s)) spec = NT.specimenHTML(s);
  box.innerHTML = solInto(spec, solSection(project(), 2, s)) + reading() + insightsHTML() + findingsHTML();
}

// ---------------------------------------------------------------- walking the priorities

function walkBar() {
  if (diagramView()) { root.querySelector('.cm-walk').innerHTML = ''; return; }
  const bar = root.querySelector('.cm-walk');
  if (tuneView()) { bar.innerHTML = `<button type="button" class="cm-btn" data-um="view" data-id="tree">${icon('back')}<span>Utility tree</span></button><p class="cm-walk-text">${esc(T ? describeTuning(T) : '')}</p>`; return; }
  const ids = utilityWalk(UM), n = ids.length;
  if (!n) { bar.innerHTML = '<p class="cm-walk-text">Add a quality driver to walk the priorities.</p>'; return; }
  const cur = S.walk >= 0 ? ids[S.walk] : null;
  bar.innerHTML = `<button type="button" class="cm-btn" data-um="walk-prev" aria-label="Previous driver" ${S.walk <= 0 ? 'disabled' : ''}>‹</button><button type="button" class="cm-btn" data-um="walk-next">${S.walk < 0 ? icon('play') + '<span>Walk the priorities</span>' : S.walk >= n - 1 ? 'Done' : 'Next ›'}</button><p class="cm-walk-text">${cur ? `<b>${S.walk + 1} / ${n}</b> ${esc(describeDriver(UM, cur))}` : `${n} driver${n === 1 ? '' : 's'}, Critical first. At each one: what it asks, what carries it, and which tactics the design names.`}</p>${S.walk >= 0 ? '<button type="button" class="cm-btn icon" data-um="walk-stop" aria-label="Stop the walk">×</button>' : ''}`;
}
function walkTo(i) {
  const ids = utilityWalk(UM);
  if (!ids.length) return;
  if (scope().kind !== 'system') { S.scope = {kind: 'system'}; fitPending = true; }
  if (depth() !== 'drivers') { S.depth = 'drivers'; fitPending = true; }
  S.walk = Math.max(-1, Math.min(ids.length - 1, i));
  if (S.walk >= 0) seen.add(ids[S.walk]);
  render();
  const c = L.cards.find(x => x.id === ids[S.walk]); if (c) stage.reveal(c.x - 20, c.y - 20, c.w + 40, c.h + 40);
}

// ---------------------------------------------------------------- interaction

function revealSelection() {
  if (diagramView()) { const b = NT.layout()?.nodes.find(n => n.id === S.sel); if (b) stage.reveal(b.x, b.y, b.w, b.h); return; }
  if (!S.sel || !L || !root) return;
  const c = (L.cards || []).find(x => x.id === S.sel || 'E:' + x.id === S.sel);
  if (c) stage.reveal(c.x, c.y, c.w, c.h);
}
function select(id, {reveal = false} = {}) {
  S.sel = id || null; S.walk = -1;
  const p = project(), target = S.sel && D(S.sel) ? S.sel : null;
  if (target) page()?.focus(target);
  if (p) { try { mountBrainContext(p, {id: target || solOwner(p, S.sel) || 'project', chapter: 2}, 'model'); } catch { /* assistance is optional */ } }
  if (window.history && !tuneView()) { const url = new URL(location.href); if (target) url.searchParams.set('driver', target); else url.searchParams.delete('driver'); window.history.replaceState(window.history.state, '', url.pathname + url.search); }
  if (S.sel && !S.panel) S.panel = true;
  save(); render();
  // A new selection reads from the top of the companion.
  const box = root.querySelector('.cm-panel'); if (box) box.scrollTop = 0;
  if (reveal) revealSelection();
}
function setScope(sc) { const r = utilityScope(UM, sc); S.scope = r.kind === 'system' ? {kind: 'system'} : {kind: r.kind, id: r.id}; S.walk = -1; fitPending = true; save(); render(); }
function openTune(id) { S.view = 'tune'; S.tune = {driver: id || tuneDriverId(), targetValue: null, priority: null}; S.sel = null; S.walk = -1; fitPending = true; save(); render(); }
function onAct(k, a) {
  const pg = page();
  if (!pg) return;
  if (k === 'edit') { pg.edit(a.dataset.id); return; }
  if (k === 'add') { pg.add(a.dataset.attr || null); return; }
  if (k === 'propose') { if (!pg.propose(a.dataset.attr)) pg.add(a.dataset.attr); return; }
  if (k === 'tune-apply') { const pr = {}; if (S.tune.targetValue != null) pr.targetValue = S.tune.targetValue; if (S.tune.priority) pr.priority = S.tune.priority; pg.tune(a.dataset.id, pr); }
}

function bind() {
  solChapterBind(root, 2, {refresh: solRefresh, whatIf: () => (tuneView() ? S.tune : null)});
  root.addEventListener('click', e => {
    if (root.dataset.suppress) return;
    if (NT.handle(e)) return;
    if (e.target.closest('[data-brain-launch],[data-q-action],a')) return;
    const a = e.target.closest('[data-um]');
    if (a && !a.disabled && !a.matches('select,input')) {
      const k = a.dataset.um;
      if (k === 'view' && a.dataset.id === 'tune' && !tuneView()) { const pick = D(S.sel) ? S.sel : D(S.tune.driver) ? S.tune.driver : null; if (pick !== S.tune.driver || !pick) { openTune(pick); return; } }
      if (k === 'view') { S.view = a.dataset.id; S.walk = -1; if (S.view === 'tree') S.sel = D(S.tune.driver) ? S.tune.driver : S.sel?.startsWith('E:') ? null : S.sel; fitPending = true; save(); render(); revealSelection(); return; }
      if (k === 'lens') { S.lens = a.dataset.id; save(); render(); return; }
      if (k === 'depth') { S.depth = a.dataset.id; fitPending = true; save(); render(); return; }
      if (k === 'scope') { setScope({kind: 'system'}); return; }
      if (k === 'dissect') { setScope({kind: 'x', id: a.dataset.id.startsWith('A:') ? a.dataset.id.slice(2) : a.dataset.id.startsWith('F:') ? a.dataset.id.slice(2) : a.dataset.id}); return; }
      if (k === 'tune') { e.stopPropagation(); openTune(a.dataset.id); return; }
      if (k === 'tune-target') { S.tune.targetValue = a.dataset.v === String(D(tuneDriverId()).targetValue) ? null : a.dataset.v; S.sel = null; render(); return; }
      if (k === 'tune-priority') { S.tune.priority = a.dataset.v === D(tuneDriverId()).priority ? null : a.dataset.v; S.sel = null; render(); return; }
      if (k === 'tune-reset') { S.tune.targetValue = null; S.tune.priority = null; S.sel = null; render(); return; }
      if (k === 'explore') { cbs.explore?.(2); return; }
      if (k === 'expand') { const on = !document.body.classList.contains('cm-expanded'); document.body.classList.toggle('cm-expanded', on); a.setAttribute('aria-pressed', String(on)); sizeModel(root, 'cm-expanded'); fitPending = true; setTimeout(render, 30); return; }
      if (k === 'panel') { S.panel = !S.panel; save(); fitPending = true; render(); setTimeout(() => { fitPending = true; render(); }, 30); return; }
      if (k === 'key') { const key = root.querySelector('.cm-key'); key.classList.toggle('cm-min'); a.setAttribute('aria-expanded', String(!key.classList.contains('cm-min'))); return; }
      if (k === 'fit') { stage.fitAll(); return; }
      if (k === 'zin' || k === 'zout') { const {w, h} = stage.box(); stage.zoomAt(stage.cam.z * (k === 'zin' ? 1.15 : 1 / 1.15), w / 2, h / 2); return; }
      if (k === 'walk-next') { if (S.walk >= utilityWalk(UM).length - 1) { S.walk = -1; render(); } else walkTo(S.walk + 1); return; }
      if (k === 'walk-prev') { walkTo(Math.max(0, S.walk - 1)); return; }
      if (k === 'walk-stop') { S.walk = -1; render(); return; }
      if (['edit', 'add', 'propose', 'tune-apply'].includes(k)) { e.stopPropagation(); onAct(k, a); return; }
      if (k === 'noop') return;
    }
    const o = e.target.closest('[data-open]');
    if (o) { const [kind, id] = o.dataset.open.split('|'); const ch = {decision: 3, plan: 10, capability: 6, product: 7}[kind]; if (ch) location.href = projectURL(`/?chapter=${ch}&tab=model&${kind === 'decision' ? 'decision' : 'object'}=${encodeURIComponent(id)}`); return; }
    const card = e.target.closest('[data-card]');
    if (card && !e.target.closest('[data-sel]')) {
      const id = card.dataset.card, now = Date.now(), twice = lastClick.id === id && now - lastClick.t < 420;
      lastClick = {id, t: now};
      if (twice && !tuneView()) { lastClick = {id: null, t: 0}; if (id !== ROOT && id !== PROPOSED && !(id.startsWith('A:') && UM.attrs.get(id.slice(2))?.hole)) setScope({kind: 'x', id: id.replace(/^[AF]:/, '')}); return; }
      if (twice && tuneView() && id.startsWith('E:')) { const c = L.cards.find(x => 'E:' + x.id === id)?.card; const m = c?.members[0]; const ch = m && {decision: 3, plan: 10, capability: 6, product: 7}[m.kind]; if (ch) location.href = projectURL(`/?chapter=${ch}&tab=model&${m.kind === 'decision' ? 'decision' : 'object'}=${encodeURIComponent(m.id)}`); return; }
      select(S.sel === id ? null : id); return;
    }
    const s = e.target.closest('[data-sel]');
    if (s && s.dataset.sel) { e.stopPropagation(); if (tuneView() && D(s.dataset.sel)) { openTune(s.dataset.sel); return; } if (tuneView()) { S.view = 'tree'; fitPending = true; } select(s.dataset.sel, {reveal: true}); return; }
    if (e.target.closest('.cm-stage') && !e.target.closest('.cm-heads,.cm-rail,.cm-zoom,.cm-key') && (S.sel || S.walk >= 0)) { S.walk = -1; select(null); }
  });
  root.addEventListener('change', e => { if (NT.change(e)) return;
    const t = e.target;
    if (t.matches('[data-um="tune-driver"]')) { S.tune = {driver: t.value, targetValue: null, priority: null}; S.sel = null; fitPending = true; render(); }
    if (t.matches('[data-um="tune-input"]')) { const v = t.value.trim(); S.tune.targetValue = v === '' || v === String(D(tuneDriverId()).targetValue) ? null : v; S.sel = null; render(); }
  });
  root.addEventListener('keydown', e => { if (NT.keydown(e)) return;
    if (e.key === 'Enter' && e.target.matches('[data-um="tune-input"]')) { e.preventDefault(); e.target.dispatchEvent(new Event('change', {bubbles: true})); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-card]')) { e.preventDefault(); select(e.target.dataset.card); }
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !root?.isConnected || document.querySelector('dialog[open]')) return;
    const a = document.activeElement;
    if (a && a !== document.body && !root.contains(a)) return;
    if (a?.closest?.('select,details[open],input,textarea')) return;
    if (S.walk >= 0) { S.walk = -1; render(); }
    else if (S.sel) select(null);
    else if (tuneView()) { S.view = 'tree'; fitPending = true; save(); render(); }
    else if (scope().kind !== 'system') setScope({kind: 'system'});
    else if (document.body.classList.contains('cm-expanded')) root.querySelector('[data-um="expand"]').click();
    else return;
    e.preventDefault();
  });
  root.addEventListener('pointerleave', () => { root.querySelector('.cm-tip').hidden = true; });
  window.addEventListener('resize', () => { if (!root?.isConnected) return; clearTimeout(bind._r); bind._r = setTimeout(() => { sizeModel(root, 'cm-expanded'); render(); }, 120); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!root?.isConnected || !L) return; clearTimeout(bind._ro); bind._ro = setTimeout(() => { const w = stage.box().w; if (Math.abs(w - (bind._w || 0)) > 24) { bind._w = w; fitPending = true; render(); } }, 90); }).observe(root.querySelector('.cm-stage'));
}
function tip(e) {
  const box = root.querySelector('.cm-tip'), t = e.target.closest?.('.um-card,.um-rc,.nt-node');
  if (t?.dataset?.ntNode && root.contains(t)) { box.innerHTML = NT.tipHTML(t.dataset.ntNode); box.hidden = !box.innerHTML; if (!box.hidden) placeTip(box, e); return; }
  if (!t || !root.contains(t)) { box.hidden = true; return; }
  const id = t.dataset.card;
  let html = '';
  if (D(id)) html = `<b>${esc(refTitle(id))}</b>${esc(describeDriver(UM, id))}<small class="h">Double-click to focus on it</small>`;
  else if (id?.startsWith('A:')) { const a = UM.attrs.get(id.slice(2)); html = a ? `<b>${esc(a.name)}</b>${esc(a.knowledge.guide?.definition || a.knowledge.note || '')}${a.hole ? '<small class="h">No driver yet</small>' : '<small class="h">Double-click to focus on it</small>'}` : ''; }
  else if (id?.startsWith('F:')) { const f = family(id.slice(2)); html = f ? `<b>${esc(f.name)}</b>${esc(f.question)}` : ''; }
  else if (id?.startsWith('E:')) { const c = L.cards.find(x => 'E:' + x.id === id)?.card; html = c ? `<b>${esc(c.title)}</b>${esc(c.why)}<small class="h">Double-click to open it in its chapter</small>` : ''; }
  if (!html) { box.hidden = true; return; }
  box.innerHTML = html; box.hidden = false; placeTip(box, e);
}

export function utilityDebug() { return {S: {...S, tune: {...S.tune}}, UM, F, L, T}; }
export {planFacts, FAMILIES};
