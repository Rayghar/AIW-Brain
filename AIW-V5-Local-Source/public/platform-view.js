// Chapter 6 Model — Logical technology.
//
// Two architecture models of the platform the application stands on, drawn from recorded facts:
// - Platform: the stack. Capabilities are rows grouped by family, the components that stand on
//   them are columns, and each need is a cell where the two meet; shared support joins into
//   plates. Dependencies between capabilities run beside the rail; each row says what stops if it
//   fails.
// - What fails together: the same stack with one capability, or its whole failure domain, removed,
//   using Chapter 6's own simulation.
// Sliced like every chapter model (whole system → one module → one capability), read through the
// Structure, Operation and Protection lenses, and edited only through the Chapter 6 editors and
// capability proposals.
import {platformSource, foldPlatform, platformScope, platformInsights, failureOf, describeCapability, describeNeed, defaultDepth, boundaryTitle, FAMILIES, PROPOSED} from './platform-model.js';
import {platformLayout, platformHead, PX} from './platform-layout.js';
import {categoryName} from './technology-domain.js';
import {modelStage, sizeModel, placeTip, edgesHTML, toolsHTML, defaultPanel, panelToggle, setState, emptyCard, showFailure, announceObject, focusKey, refocus} from './model-stage.js';
import {projectPreferenceKey, projectURL} from './project-context.js';
import {mountBrainContext} from './brain-context-ui.js';
import {specPanelHTML} from './spec-panel.js';
import {solChapterMount, solChapterBind, solSection, solInto, solMark, solOwner} from './chapter-sol.js';
import {createNotation} from './notation-view.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const project = () => window.aiwProjectStore?.value?.document || window.aiwCurrentProject;
// Sol's advice changes the project only through a store command; the view then reads the new document.
const solRefresh = () => { if (root?.isConnected) mountChapterModel({id: pageSel}, cbs); };
const studio = () => window.aiwLogicalStudio;
// Chapter 6 edits that reach other chapters are staged as a reviewable model proposal; while one
// is open, the model shows the proposed design and marks what it changes.
const pending = () => { const i = window.aiwInterfaceImpact; return i?.pending && i.previewInChapter?.(6) ? i : null; };
const PATHS = {diagram: 'M4 4h6v5H4zM14 4h6v5h-6zM9 15h6v5H9zM7 9v3h10V9M12 12v3', structure: 'M6 3v18M18 3v18M6 8h12M6 16h12', operation: 'M3 12h4l3-7 4 14 3-7h4', protection: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z', platform: 'M3 5h18v4H3zM3 11h18v4H3zM3 17h18v3H3z', failure: 'M12 3 2 20h20zM12 10v4M12 17h.01', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', panel: 'M3 4h18v16H3zM15 4v16', explore: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', plus: 'M12 5v14M5 12h14', spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z', mind: 'm3 7 9-4 9 4-9 4-9-4m0 5 9 4 9-4m-18 5 9 4 9-4', edit: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4', dissect: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14M21 21l-5-5M8 11h6', play: 'M7 4v16l13-8z', link: 'M9 15 15 9M8 12l-2 2a3 3 0 0 0 4 4l2-2m4-4 2-2a3 3 0 0 0-4-4l-2 2'};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[n] || PATHS.platform}"/></svg>`;
const LENSES = [
  {id: 'structure', label: 'Structure', like: 'skeleton', q: 'Which capability supports which component, how essential each need is, and what each capability depends on.'},
  {id: 'operation', label: 'Operation', like: 'vital signs', q: 'Each capability’s continuity, failure domain and recovery, and what stops if it fails.'},
  {id: 'protection', label: 'Protection', like: 'immune system', q: 'The trust boundary of each capability and component, and which needs cross one.'}
];
const DEP = {dependency: 'Requires', trust: 'Trust enforcement', data: 'Data movement', resilience: 'Recovery'};
const CONT = {single: 'Single path', redundant: 'Redundant', bypass: 'Safe bypass'};
const STAGES = [['fail', 'It fails'], ['spread', 'What depends on it'], ['stop', 'Components that stop'], ['continue', 'What could continue']];

let marked = new Set(), lastProposal = '', lastClick = {id: null, t: 0};
let root = null, P = null, lastDoc = null, cbs = {}, F = null, L = null, FA = null, fitPending = true, stage = null, pageSel;
let NT = null;
let S = {view: 'diagram', lens: 'structure', scope: {kind: 'system'}, depth: 'auto', sel: null, panel: true, walk: -1, fail: null};
// The standard diagram (notation-view.js) and the elements only it draws (the application itself, an external system, a placement).
const diagramView = () => S.view === 'diagram';
const drawn = id => diagramView() && !!NT?.diagram()?.nodes.some(n => n.id === id);
const pref = () => projectPreferenceKey('aiw-platform-model-v1');
function load() { try { const v = JSON.parse(localStorage.getItem(pref()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
function save() { try { localStorage.setItem(pref(), JSON.stringify({view: S.view, lens: S.lens, scope: S.scope, depth: S.depth, sel: S.sel, panel: S.panel, fail: S.fail})); } catch { /* preferences are optional */ } }
function anatomyOrder() { try { return JSON.parse(localStorage.getItem(projectPreferenceKey('aiw-anatomy-v1')) || '{}').order || {}; } catch { return {}; } }

// ---------------------------------------------------------------- mount / leave

export function mountChapterModel(selection, callbacks = {}) {
  const p = project(), host = document.querySelector('.studio > .stage.tab-content');
  if (!p || !host) return;
  cbs = callbacks;
  solChapterMount(p, 6, solRefresh);
  if (!root) {
    root = document.createElement('section'); root.className = 'cm pf'; root.setAttribute('aria-label', 'Chapter 6 model: logical technology');
    root.innerHTML = shell();
    stage = modelStage(root, {headHeight: () => (S.view === 'diagram' ? 0 : platformHead()), railWidth: l => l.rail || 0, onHover: tip});
    stage.bind(); bind();
    // The standard diagram shares the stage, the companion and the selection with the chapter's own views.
    NT = createNotation({chapter: 6, root, stage, project, onSelect: id => select(id)});
    NT.onChange = full => { if (full) fitPending = true; render(); };
    NT.bindDrag();
    const v = load();
    for (const k of ['view', 'lens', 'depth', 'sel']) if (typeof v[k] === 'string') S[k] = v[k];
    if (v.scope && typeof v.scope === 'object') S.scope = v.scope;
    if (v.fail && typeof v.fail === 'object') S.fail = v.fail;
    S.panel = defaultPanel(v.panel);
    if (!['diagram', 'platform', 'failure'].includes(S.view)) S.view = 'diagram';
    if (!LENSES.some(l => l.id === S.lens)) S.lens = 'structure';
  }
  const first = !P;
  if (host.firstElementChild !== root) host.prepend(root);
  document.body.classList.add('cm-active', 'am-active');
  const d = pending()?.document || p;
  if (d !== lastDoc || !P) { lastDoc = d; rebuild(d); }
  const selectable = id => !!id && known(id);
  if (first && P) { const want = window.aiwChapterModels ? window.aiwChapterModels.takeLink(6) : new URLSearchParams(location.search).get('object'); if (selectable(want)) { S.sel = want; setTimeout(revealSelection, 60); } }
  else if (P && pageSel !== undefined && selection?.id !== pageSel && selectable(selection?.id)) { S.sel = selection.id; setTimeout(revealSelection, 60); }
  pageSel = selection?.id ?? null;
  render();
  sizeModel(root, 'cm-expanded');
}
export function leaveChapterModel() {
  document.body.classList.remove('cm-active', 'cm-expanded');
  root?.remove();
}
function rebuild(d) {
  try { P = platformSource(d, {order: anatomyOrder()}); } catch (e) { console.error('Platform model', e); P = null; return; }
  if (S.sel && !known(S.sel)) S.sel = null;
  if (S.scope?.id && platformScope(P, S.scope).kind === 'system') S.scope = {kind: 'system'};
  if (S.fail && !P.capabilities.has(S.fail.id)) S.fail = null;
  marked = new Set();
  const i = pending(), roots = [];
  if (i) { try { const g = i.decorate({nodes: [...P.capabilities.keys(), ...P.components.keys()].map(id => ({id, attrs: {}})), edges: []}); for (const n of g.nodes) { if (n.ghost || n.changeImpact) marked.add(n.id); if (n.ghost) roots.push(n.id); } } catch { /* the preview decorates what it can */ } }
  const key = i ? roots.join(',') : '';
  if (key && key !== lastProposal && roots[0] && known(roots[0])) { S.sel = roots[0]; setTimeout(revealSelection, 60); }
  lastProposal = key;
}
const knownBase = id => P.capabilities.has(id) || P.components.has(id) || P.needs.has(id) || P.modules.has(id) || P.deps.some(d => d.id === id) || P.boundaries.has(id) || (String(id).startsWith('MISSING:') && P.unsupported.some(n => 'MISSING:' + n.category === id));
const known = id => drawn(id) || knownBase(id);

// ---------------------------------------------------------------- shell

function shell() {
  return `<header class="cm-top"><div class="cm-title"><small>Chapter 6 · Model</small><strong>Logical technology</strong></div>
   <nav class="cm-crumbs" aria-label="Where you are"></nav>
   <div class="cm-views" role="group" aria-label="Model"><button type="button" class="cm-view" data-pf="view" data-id="diagram" title="The solution architecture in the standard notation">${icon('diagram')}<span>Diagram</span></button><button type="button" class="cm-view" data-pf="view" data-id="platform">${icon('platform')}<span>Platform</span></button><button type="button" class="cm-view" data-pf="view" data-id="failure">${icon('failure')}<span>What fails together</span></button></div>
   <div class="cm-actions"><details class="cm-add"><summary class="cm-btn" aria-label="Add to the model">${icon('plus')}<span>Add</span></summary><div><button type="button" data-t-action="new">New capability</button><p>To connect two capabilities, select the one that depends on the other and use “Add a dependency”. Application needs are edited from each component.</p></div></details>
    <button type="button" class="cm-btn" data-pf="explore" title="The connected explorer: every perspective of the whole model">${icon('explore')}<span>Explore all perspectives</span></button>
    <button type="button" class="cm-btn icon" data-pf="expand" aria-pressed="false" aria-label="Expand the model" title="Expand">${icon('expand')}</button>
    <button type="button" class="cm-btn icon" data-pf="panel" aria-pressed="true" aria-label="Hide the companion panel" title="Companion">${icon('panel')}</button></div></header>
  <div class="cm-bar"><div class="cm-lenses" role="group" aria-label="Lens"></div><div class="cm-depth" role="group" aria-label="Columns"></div></div>
  <div class="cm-banner"></div>
  <div class="cm-body"><div class="cm-stage" tabindex="0" aria-label="Platform canvas. Drag or scroll to move; arrow keys pan; Ctrl or Command and scroll to zoom.">
    <div class="cm-world"><svg class="cm-svg" aria-hidden="true"></svg><div class="cm-html"></div></div>
    <div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div>${edgesHTML()}
  </div><aside class="cm-panel" aria-label="Companion"></aside></div>
  <footer class="cm-walk" aria-label="Walk through the failure"><div class="cm-walk-in"></div><p class="cm-state" role="status" aria-live="polite"></p>${toolsHTML('pf')}</footer><div class="cm-tip" role="tooltip" hidden></div>`;
}

// ---------------------------------------------------------------- render

const titleOf = id => P.capabilities.get(id)?.title || P.components.get(id)?.title || P.modules.get(id)?.title || P.boundaries.get(id)?.title || P.M.byId.get(id)?.title || id;
const refOf = id => P.capabilities.get(id)?.ref || P.components.get(id)?.ref || P.boundaries.get(id)?.ref || '';
const refTitle = id => { const r = refOf(id); return (r && r !== id ? r + ' ' : '') + titleOf(id); };
function scope() { return platformScope(P, S.scope); }
function depth() { return S.depth === 'auto' ? defaultDepth(P) : S.depth; }
const ghost = () => { const g = studio()?.proposal; return g && g.record && Array.isArray(g.mappings) ? g : null; };
const failing = () => S.view === 'failure';
const BCOLORS = ['#3f7fa0', '#8f5a76', '#b07a2a', '#5d7f3e', '#7b6aa8'];
const bcolor = id => { const i = [...P.boundaries.keys()].indexOf(id); return i < 0 ? '#9aa296' : BCOLORS[i % BCOLORS.length]; };

function defaultFail() {
  const sel = P.capabilities.has(S.sel) ? S.sel : null;
  if (sel) return {id: sel, mode: S.fail?.mode || 'capability'};
  if (S.fail && P.capabilities.has(S.fail.id)) return S.fail;
  const wide = [...P.capabilities.values()].sort((a, b) => b.blast.stops.length - a.blast.stops.length || b.blast.caps.length - a.blast.caps.length)[0];
  return wide ? {id: wide.id, mode: 'capability'} : null;
}

function render() {
  if (!root) return;
  if (!P) { showFailure(root, 'The platform model could not be prepared for this project.'); return; }
  const fk = focusKey(root);
  if (S.sel !== announced) announce();
  root.classList.remove('cm-lens-structure', 'cm-lens-operation', 'cm-lens-protection');
  root.classList.add('cm-lens-' + S.lens);
  root.classList.toggle('pf-failing', failing());
  root.classList.toggle('cm-walking', S.walk >= 0 && failing());
  root.querySelector('.cm-body').classList.toggle('no-panel', !S.panel);
  root.classList.toggle('nt-active', diagramView());
  if (diagramView()) {
    // The standard diagram: the notation module draws; the chapter keeps its chrome, companion and camera.
    L = NT.render({sel: S.sel, viewW: stage.box().w});
    root.querySelector('.cm-heads-in').innerHTML = ''; root.querySelector('.cm-rail-in').innerHTML = '';
    chromeDiagram(); panel(); walkBar();
    stage.use(L, 'diagram|' + (NT.scene()?.id || '') + '|' + NT.arrangement());
    if (fitPending) { fitPending = false; NT.fit(); } else stage.clamp();
    stage.apply(); refocus(root, fk); return;
  }
  // Geometry depends on the recorded model, the scope, the depth and a pending proposal — never on
  // the lens or the failure explored.
  F = foldPlatform(P, scope(), depth(), {proposal: ghost()});
  L = platformLayout(F);
  if (failing()) { if (!S.fail || !P.capabilities.has(S.fail.id)) S.fail = defaultFail(); FA = failureOf(P, S.fail); } else FA = null;
  const world = root.querySelector('.cm-world'), svg = root.querySelector('.cm-svg');
  world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
  svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
  const hl = highlight();
  if (!P.capabilities.size && !P.needs.size) { svg.innerHTML = ''; root.querySelector('.cm-html').innerHTML = emptyHTML(); root.querySelector('.cm-heads-in').innerHTML = ''; root.querySelector('.cm-rail-in').innerHTML = ''; root.querySelector('.cm-rail').style.width = '0px'; }
  else { svg.innerHTML = defs() + stackSVG(hl); root.querySelector('.cm-html').innerHTML = stackHTML(hl); heads(hl); rail(hl); }
  chrome(); panel(); walkBar();
  stage.use(L, JSON.stringify([S.scope?.kind || 'system', S.scope?.id || '', depth()]));
  if (fitPending) { fitPending = false; stage.fit(); } else stage.clamp();
  stage.apply();
  refocus(root, fk);
}

// Nothing to draw: no capability and no need. The next action stands in place.
function emptyHTML() {
  const comps = P.components.size;
  return emptyCard({title: 'No platform yet', text: 'Capabilities are the vendor-neutral services the components stand on: where the software runs, how it keeps state, connects, trusts and is operated. Each component records its needs; a capability supports them.' + (comps ? '' : ' There is no component yet to stand on it: the realisation in Chapter 5 comes first.'), x: 40, y: platformHead() + 30,
    actions: `<button type="button" class="cm-btn primary" data-t-action="new">${icon('plus')}New capability</button><a class="cm-btn" href="${esc(projectURL('/?chapter=5&tab=' + (comps ? 'model' : 'work')))}">${comps ? 'The components in Chapter 5' : 'Define components in Chapter 5'}</a>`});
}

// Failure state of a row, a column, and what the walk stage lights.
const capState = id => FA?.caps.find(x => x.id === id)?.state || null;
const colState = c => { if (!FA) return null; const ms = c.col.members; return ms.some(m => FA.stops.includes(m)) ? 'unavailable' : ms.some(m => FA.degrades.includes(m)) ? 'degraded' : 'available'; };
function stageLit() {
  if (!FA || S.walk < 0) return null;
  const st = STAGES[S.walk][0], rows = new Set(), cols = new Set();
  if (st === 'fail') FA.first.forEach(id => rows.add(id));
  if (st === 'spread') FA.caps.forEach(x => rows.add(x.id));
  if (st === 'stop') { FA.caps.forEach(x => rows.add(x.id)); for (const c of L.cols) if (c.col.members.some(m => FA.stops.includes(m))) cols.add(c.id); }
  if (st === 'continue') { FA.caps.filter(x => x.state === 'degraded').forEach(x => rows.add(x.id)); for (const c of L.cols) if (c.col.members.some(m => FA.degrades.includes(m)) || !c.col.members.some(m => FA.stops.includes(m))) cols.add(c.id); }
  return {rows, cols};
}
function highlight() {
  const out = {on: false, rows: new Set(), cols: new Set(), deps: new Set(), cells: new Set()};
  const lit = stageLit();
  if (lit) { out.on = true; out.rows = lit.rows; out.cols = lit.cols; for (const c of L.cells) if (lit.rows.has(c.row) && (!lit.cols.size || lit.cols.has(c.col))) out.cells.add(c.row + '|' + c.col); for (const a of L.arcs) if (lit.rows.has(a.dep.from) && lit.rows.has(a.dep.to)) out.deps.add(a.id); return out; }
  const id = S.sel; if (!id) return out;
  out.on = true;
  if (P.capabilities.has(id)) { out.rows.add(id); for (const d of F.deps) if (d.from === id || d.to === id) { out.deps.add(d.id); out.rows.add(d.from); out.rows.add(d.to); } for (const c of L.cells) if (c.row === id) { out.cells.add(c.row + '|' + c.col); out.cols.add(c.col); } }
  // A row of needs waiting for support lights itself and the components that wait.
  else if (id.startsWith('MISSING:')) { out.rows.add(id); for (const c of L.cells) if (c.row === id) { out.cells.add(c.row + '|' + c.col); out.cols.add(c.col); } }
  else if (P.components.has(id) || id.startsWith('MOD:') || P.modules.has(id)) { const col = P.components.has(id) ? F.colOf(id) : id.startsWith('MOD:') ? id : 'MOD:' + id; const cs = L.cols.filter(c => c.id === col || (P.modules.has(id) && c.col.module === id)); for (const c of cs) out.cols.add(c.id); for (const c of L.cells) if (out.cols.has(c.col)) { out.cells.add(c.row + '|' + c.col); out.rows.add(c.row); } }
  else if (P.needs.has(id)) { const n = P.needs.get(id), col = F.colOf(n.component); out.cols.add(col); for (const c of L.cells) if (c.col === col && c.needs.includes(id)) { out.cells.add(c.row + '|' + c.col); out.rows.add(c.row); } }
  else if (P.deps.some(d => d.id === id)) { const d = P.deps.find(x => x.id === id); out.deps.add(id); out.rows.add(d.from); out.rows.add(d.to); }
  else if (P.boundaries.has(id)) { for (const c of P.capabilities.values()) if (c.boundaryId === id) out.rows.add(c.id); for (const k of P.components.values()) if (k.boundary === id) out.cols.add(F.colOf(k.id)); }
  return out;
}

function defs() {
  const m = (id, fill) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1 9 5 1 9z" fill="${fill}"/></marker>`;
  return `<defs>${m('pf-a-n', '#4d6a5c')}${m('pf-a-t', '#7a5f93')}${m('pf-a-h', '#a8741f')}${m('pf-a-w', '#b0493a')}${m('pf-a-p', '#b88830')}<pattern id="pf-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#fbe9e4"/><path d="M0 0v8" stroke="#e6b3a6" stroke-width="3"/></pattern></defs>`;
}
function stackSVG(hl) {
  const out = [], right = L.failX + PX.FAIL_W;
  for (const g of L.groups) out.push(`<rect class="pf-group" x="${L.rail}" y="${g.y}" width="${right - L.rail}" height="${g.h}"/>`);
  L.rows.forEach((r, i) => { const st = capState(r.id); out.push(`<rect class="pf-row${i % 2 ? ' odd' : ''}${hl.rows.has(r.id) ? ' lit' : ''}${st ? ' ' + st : ''}" x="${L.rail}" y="${r.y}" width="${right - L.rail}" height="${r.h}"/>`); });
  for (const c of L.cols) out.push(`<line class="pf-col${hl.cols.has(c.id) ? ' lit' : ''}" x1="${c.x + c.w}" x2="${c.x + c.w}" y1="${L.top}" y2="${L.H - 16}"/>`);
  for (const pl of L.plates) {
    const cap = P.capabilities.get(pl.row), st = capState(pl.row), row = F.rows.find(r => r.id === pl.row);
    const cls = `pf-plate f-${row.family}${cap ? ' c-' + cap.continuity : ''}${cap?.boundaryId ? ' b-' + esc(cap.boundaryId) : ''}${row.kind !== 'capability' ? ' ' + row.kind : ''}${st ? ' ' + st : ''}${hl.on ? (hl.rows.has(pl.row) ? ' lit' : ' dim') : ''}${marked.has(pl.row) ? ' changed' : ''}`;
    out.push(`<rect class="${cls}" style="--bc:${bcolor(cap?.boundaryId)}" x="${pl.x}" y="${pl.y}" width="${pl.w}" height="${pl.h}" rx="${pl.h / 2}"/>`);
  }
  const order = L.arcs.map(a => ({a, lit: hl.deps.has(a.id)})).sort((p, q) => p.lit - q.lit);
  for (const {a, lit} of order) {
    const d = a.dep, carries = FA && d.critical && ['dependency', 'trust'].includes(d.type) && capState(d.to) && capState(d.from);
    const tone = d.proposed ? 'p' : lit ? 'h' : carries ? 'w' : d.type === 'trust' ? 't' : 'n';
    out.push(`<path class="pf-arc ${d.type}${d.critical ? ' critical' : ''}${d.proposed ? ' proposed' : ''}${carries ? ' carries' : ''}${lit ? ' lit' : hl.on ? ' dim' : ''}" d="M${a.xa} ${a.ya}H${a.x}V${a.yb}H${a.xa + 4}" marker-end="url(#pf-a-${tone})"/><circle class="pf-arc-dot${lit ? ' lit' : ''}" cx="${a.xa + 1}" cy="${a.ya}" r="2.5"/>`);
  }
  return out.join('');
}
function stackHTML(hl) {
  const out = [], g = ghost();
  for (const gr of L.groups) { const f = FAMILIES.find(x => x.id === gr.family); out.push(`<div class="pf-mg" style="left:${L.x0 + 4}px;top:${gr.y + 5}px">${esc(gr.title)}<small>${esc(f?.sub || '')}</small></div>`); }
  for (const c of L.cells) {
    const key = c.row + '|' + c.col, lit = hl.cells.has(key), cap = P.capabilities.get(c.row), st = capState(c.row);
    const ns = c.needs.map(id => P.needs.get(id)), multi = c.needs.length > 1;
    const kind = c.unsupported && c.unsupported === c.needs.length ? 'unsupported' : c.essential ? 'essential' : 'degraded';
    const who = F.cols.find(x => x.id === c.col), tip = `${who.kind === 'module' ? who.title + ' (' + c.needs.length + ' needs)' : titleOf(who.id)} → ${cap ? cap.title : categoryName(F.rows.find(r => r.id === c.row).category)}: ${ns.map(n => n.criticality + (n.capabilities.length ? '' : ', not supported')).join('; ')}${c.crossing ? ' · crosses into ' + boundaryTitle(P, cap?.boundaryId) : ''}${c.proposed ? ' · proposed support, not saved' : ''}`;
    const sel = c.needs.length === 1 ? c.needs[0] : c.col.startsWith('MOD:') ? c.row : c.needs[0];
    out.push(`<button type="button" class="pf-cell ${kind}${c.degraded && c.essential ? ' mixed' : ''}${c.crossing ? ' crossing' : ''}${c.proposed ? ' proposed' : ''}${st && kind !== 'unsupported' ? ' ' + st : ''}${hl.on ? (lit ? ' lit' : ' dim') : ''}" data-sel="${esc(sel)}" style="left:${c.x - 13}px;top:${c.y - 13}px" title="${esc(tip)}" aria-label="${esc(tip)}">${multi ? `<b>${c.needs.length}</b>` : ''}<i class="pf-x" aria-hidden="true">⇄</i></button>`);
  }
  for (const r of L.rows) {
    const cap = P.capabilities.get(r.id), st = capState(r.id), lit = hl.on ? (hl.rows.has(r.id) ? ' lit' : ' dim') : '', pos = `style="left:${L.failX}px;top:${r.y + 7}px;width:${PX.FAIL_W}px;height:${r.h - 14}px"`;
    if (!cap) { out.push(`<div class="pf-fail none${lit}" ${pos}><small>${r.row.kind === 'proposed' ? 'Proposed · not saved' : 'No capability yet'}</small></div>`); continue; }
    const fc = FA && st ? FA.caps.find(x => x.id === r.id) : null;
    if (FA) out.push(`<div class="pf-fail ${st || 'ok'}${lit}" ${pos}><b>${st === 'unavailable' ? 'Unavailable' : st === 'degraded' ? 'Degraded' : 'Unaffected'}</b><small>${esc(fc?.reason || (st ? '' : 'Not in the failure'))}</small></div>`);
    else { const n = cap.blast.stops.length, all = P.components.size; out.push(`<button type="button" class="pf-fail ${n > 1 ? 'wide' : n ? 'one' : 'ok'}${lit}" data-pf="fail" data-id="${esc(r.id)}" ${pos} title="Show what fails together"><b>${n ? `Stops ${n} of ${all}` : 'Stops nothing'}</b><small>${cap.blast.caps.length > 1 ? 'with ' + esc(cap.blast.caps.filter(x => x.id !== r.id).map(x => titleOf(x.id)).join(', ')) : cap.blast.degrades.length ? cap.blast.degrades.length + ' degrade' : CONT[cap.continuity] + ' · ' + esc(cap.failureDomain || 'no domain')}</small></button>`); }
  }
  return out.join('');
}
function heads(hl) {
  const box = root.querySelector('.cm-heads-in'), out = [];
  if (F.depth !== 'modules') for (const b of L.colGroups) out.push(`<div class="pf-band" style="left:${b.x + 3}px;width:${b.w - 6}px;top:6px;height:${PX.BAND - 4}px" title="${esc(P.modules.get(b.module)?.title || b.module)}">${esc(P.modules.get(b.module)?.title || b.module)}</div>`);
  for (const c of L.cols) {
    const k = c.col, st = colState(c), pos = `style="left:${c.x + 3}px;width:${c.w - 6}px;top:${PX.BAND + 6}px;height:${PX.HEAD_H - PX.BAND - 6}px"`;
    const comp = k.kind === 'component' ? P.components.get(k.id) : null;
    const sub = st ? `<span class="pf-st ${st}">${st === 'unavailable' ? 'Stops' : st === 'degraded' ? 'Degraded' : 'Keeps running'}</span>` : comp ? `<span class="pf-kb"><i class="pf-bc" style="background:${bcolor(comp.boundary)}"></i>${esc(comp.boundary ? (P.boundaries.get(comp.boundary)?.ref || comp.boundary) : 'no boundary')}</span>` : `<span>${k.members.length} component${k.members.length === 1 ? '' : 's'}</span>`;
    out.push(`<button type="button" class="pf-ch${k.kind === 'module' ? ' module' : ''}${S.sel === k.id || S.sel === k.module && k.kind === 'module' ? ' sel' : hl.cols.has(c.id) ? ' lit' : hl.on ? ' dim' : ''}${marked.has(k.id) ? ' changed' : ''}${st ? ' ' + st : ''}" data-sel="${esc(k.kind === 'module' ? k.module : k.id)}" ${pos}><small>${esc(comp ? comp.ref : 'Module')}</small><b>${esc(k.title)}</b>${sub}</button>`);
  }
  out.push(`<div class="pf-th" style="left:${L.failX}px;width:${PX.FAIL_W}px;top:${PX.BAND + 6}px"><b>${FA ? 'In this failure' : 'If it fails'}</b><small>${FA ? 'from Chapter 6’s own simulation' : 'components that stop, by Chapter 6’s own simulation'}</small></div>`);
  if (L.levels) out.push(`<div class="pf-dh" style="left:${L.rail + 2}px;width:${L.x0 - L.rail - 6}px;top:${PX.HEAD_H - 34}px" title="Dependencies between capabilities">deps</div>`);
  box.innerHTML = out.join('');
  box.style.width = L.W + 'px';
}
function rail(hl) {
  const box = root.querySelector('.cm-rail-in'), g = ghost();
  box.innerHTML = L.rows.map(r => {
    const cap = P.capabilities.get(r.id), st = capState(r.id), lit = hl.on ? (hl.rows.has(r.id) ? ' lit' : ' dim') : '', pos = `style="top:${r.y + 4}px;height:${r.h - 8}px"`;
    if (!cap) return `<button type="button" class="pf-cap ${r.row.kind}${lit}" ${r.row.kind === 'proposed' ? 'data-t-action="edit-ghost"' : `data-sel="${esc(r.id)}"`} ${pos}><small>${esc(categoryName(r.row.category))}${r.row.kind === 'proposed' ? ' · proposal, not saved' : ' · no capability'}</small><b>${esc(r.row.title)}</b><span class="pf-l">${r.row.kind === 'proposed' ? 'Review &amp; edit' : 'Needs wait here without support'}</span></button>`;
    const isGhost = g && (g.objectId === cap.id || g.record?.id === cap.id), prop = isGhost ? g.record : null;
    const cont = prop && prop.continuity !== cap.continuity ? `<i class="pf-prop">proposed: ${esc(CONT[prop.continuity] || prop.continuity)}${prop.alternateDomain ? ' · ' + esc(prop.alternateDomain) : ''}</i>` : prop && prop.recoveryPlan && prop.recoveryPlan !== cap.recoveryPlan ? `<i class="pf-prop">proposed: a recovery plan and path</i>` : `${esc(CONT[cap.continuity] || cap.continuity)} · ${esc(cap.failureDomain || 'no failure domain')}${['transactional', 'messaging'].includes(cap.category) ? (cap.recoveryPlan && cap.recovers.length ? ' · recovery set' : ' · <i class="miss">no recovery</i>') : ''}`;
    const crossings = [...P.needs.values()].filter(n => n.capabilities.includes(cap.id) && P.components.get(n.component).boundary && cap.boundaryId && P.components.get(n.component).boundary !== cap.boundaryId).length;
    return `<button type="button" class="pf-cap f-${cap.family}${cap.single ? ' single' : ''}${cap.unused ? ' unused' : ''}${S.sel === r.id ? ' sel' : ''}${isGhost ? ' ghosted' : ''}${marked.has(r.id) ? ' changed' : ''}${st ? ' ' + st : ''}${lit}" data-sel="${esc(r.id)}" ${pos}><small>${esc(categoryName(cap.category))} · ${esc(cap.ref)}${cap.essential ? '<i class="pf-b ess">essential</i>' : ''}${cap.single ? '<i class="pf-b sp">single path</i>' : ''}${cap.unused ? '<i class="pf-b un">unused</i>' : ''}</small><b>${esc(cap.title)}</b><span class="pf-l st">${cap.users.length} component${cap.users.length === 1 ? '' : 's'} · ${cap.needs.filter(id => P.needs.get(id).criticality === 'essential').length} essential need${cap.needs.filter(id => P.needs.get(id).criticality === 'essential').length === 1 ? '' : 's'}</span><span class="pf-l op">${cont}</span><span class="pf-l pr"><i class="pf-bc" style="background:${bcolor(cap.boundaryId)}"></i>${esc(boundaryTitle(P, cap.boundaryId))}${crossings ? ` · ${crossings} crossing${crossings === 1 ? '' : 's'} in` : ''}</span></button>`;
  }).join('');
  box.style.height = L.H + 'px'; box.style.width = L.rail + 'px';
  root.querySelector('.cm-rail').style.setProperty('--cm-rail', L.rail + 'px');
}

// ---------------------------------------------------------------- chrome

function crumbs() {
  const sc = scope(), parts = [`<button type="button" data-pf="scope" data-kind="system" class="${sc.kind === 'system' ? 'here' : ''}">Whole platform</button>`];
  if (sc.kind === 'module') parts.push('<span>›</span>', `<button type="button" class="here" data-pf="noop">${esc(titleOf(sc.id))}</button>`);
  if (sc.kind === 'capability') parts.push('<span>›</span>', `<button type="button" class="here" data-pf="noop">${esc(titleOf(sc.id))} and what it depends on</button>`);
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
  root.querySelector('.cm-lenses').innerHTML = LENSES.map(l => `<button type="button" class="cm-lens" data-pf="lens" data-id="${l.id}" aria-pressed="${S.lens === l.id}" title="${esc(l.q + ' Like the ' + l.like + '.')}">${icon(l.id)}<span>${l.label}</span></button>`).join('');
  const dp = depth();
  let bar = sc.kind === 'system' && P.modules.size > 1 ? `<span>Columns</span>${[['modules', 'Modules'], ['components', 'Components']].map(([id, t]) => `<button type="button" class="cm-dep" data-pf="depth" data-id="${id}" aria-pressed="${dp === id}">${t}</button>`).join('')}` : '';
  if (failing() && S.fail) { const cap = P.capabilities.get(S.fail.id); bar += `<span>Lose</span><button type="button" class="cm-dep" data-pf="mode" data-id="capability" aria-pressed="${S.fail.mode !== 'domain'}">${esc(cap?.title || 'this capability')}</button><button type="button" class="cm-dep" data-pf="mode" data-id="domain" aria-pressed="${S.fail.mode === 'domain'}" ${cap?.failureDomain ? '' : 'disabled'}>Its failure domain</button>`; }
  root.querySelector('.cm-depth').innerHTML = bar;
  const unsup = P.unsupported.length, single = [...P.capabilities.values()].filter(c => c.single).length;
  setState(root, FA
    ? `${FA.mode === 'domain' ? FA.title + ' lost' : FA.title + ' lost'} · ${FA.caps.length} capabilit${FA.caps.length === 1 ? 'y' : 'ies'} down · ${FA.stops.length} of ${P.components.size} components stop${FA.degrades.length ? ' · ' + FA.degrades.length + ' degraded' : ''}`
    : !P.capabilities.size ? (P.needs.size ? `No capability recorded yet · ${P.needs.size} need${P.needs.size === 1 ? '' : 's'} waiting for support` : 'No capability recorded yet')
    : `${P.capabilities.size} capabilities support ${P.components.size} components through ${P.needs.size} needs · ${unsup} unsupported · ${single} single path${single === 1 ? '' : 's'} · ${P.domains.size} failure domain${P.domains.size === 1 ? '' : 's'}`);
  const g = ghost(), imp = pending();
  root.querySelector('.cm-banner').innerHTML = imp ? imp.banner() : g ? `<section class="dp-banner"><span class="ip-kicker">Capability proposal · not saved</span><b>${esc(g.record.title)}</b><small>${esc(g.effect || g.reason || '')}</small><button type="button" class="cm-btn gold" data-t-action="edit-ghost">Review &amp; edit</button><button type="button" class="cm-btn" data-t-action="dismiss">Dismiss</button></section>` : '';
  const plates = S.lens === 'operation'
    ? `<p><span class="k-plate single"></span>Single path: one instance carries it</p><p><span class="k-plate redundant"></span>Redundant: more than one instance</p><p><span class="k-plate bypass"></span>A bypass is recorded for it</p>`
    : S.lens === 'protection' ? `<p><span class="k-plate boundary"></span>Plate tinted by the trust boundary it sits in</p>`
    : `<p><span class="k-plate"></span>Plate: components standing on one capability, tinted by its family</p>`;
  root.querySelector('.cm-legend').innerHTML = `<h5>Needs</h5><p><i class="k-cell essential"></i>Essential need, supported</p><p><i class="k-cell degraded"></i>Need it can run degraded without</p><p><i class="k-cell unsupported"></i>Need no capability supports</p><p><i class="k-cell crossing"></i>Protection: the need crosses a trust boundary</p>${g ? '<p><i class="k-cell proposed"></i>Need the unsaved proposal would support</p>' : ''}<h5>Plates</h5>${plates}<p><span class="k-plate missing"></span>Nothing recorded supports these needs</p><p><span class="k-plate proposed"></span>Proposed capability, not saved</p><p><svg width="40" height="12"><path d="M34 2H8V10H34" fill="none" stroke="#4d6a5c" stroke-width="1.8" marker-end="url(#pf-a-n)"/></svg>Depends on (critical: thicker)</p>${failing() ? `<h5>While ${esc(S.fail?.mode === 'domain' ? 'the failure domain' : 'the capability')} is down</h5><p><span class="k-plate lost"></span>Lost: the failure reaches it</p><p><span class="k-plate degraded"></span>Runs degraded</p><p><i class="k-cell stopped"></i>Stops: an essential need is lost</p><p><i class="k-st unavailable">unavailable</i><i class="k-st degraded">degraded</i><i class="k-st available">available</i>A component’s state on its head</p>` : ''}`;
}

// ---------------------------------------------------------------- companion

const tact = (a, attrs, label, cls = '') => `<button type="button" class="cm-btn ${cls}" data-t-action="${a}" ${attrs}>${label}</button>`;
const link = id => `<button type="button" class="cm-link" data-sel="${esc(id)}">${esc(refTitle(id))}</button>`;
function proposeButtons(cap) {
  const g = ghost(), out = [];
  for (const q of P.proposals.filter(x => x.capability === cap.id && x.key !== 'missing')) {
    if (q.key === 'isolate' && !cap.single) continue;
    if (g && g.key === q.key && g.objectId === cap.id) continue;
    out.push(`<button type="button" class="cm-btn gold" data-t-action="preview" data-t-key="${q.key}" data-t-id="${esc(cap.id)}">${q.key === 'isolate' ? 'Propose independent continuity' : 'Propose a recovery path'}</button>`);
  }
  return out.join('');
}
function specimenCapability(id) {
  const c = P.capabilities.get(id), deps = P.deps.filter(d => d.from === id), by = P.deps.filter(d => d.to === id);
  const users = c.users.map(u => { const ns = c.needs.map(n => P.needs.get(n)).filter(n => n.component === u); return `<button type="button" class="cm-link" data-sel="${esc(ns[0]?.id || u)}">${esc(titleOf(u))}<i class="${ns.some(n => n.criticality === 'essential') ? 'ess' : 'deg'}"> · ${ns.some(n => n.criticality === 'essential') ? 'essential' : 'degraded'}</i></button>`; }).join('') || '<em>No component</em>';
  const d2 = d => `<button type="button" class="cm-link" data-sel="${esc(d.id)}">${esc(d.from === id ? '→ ' + titleOf(d.to) : '← ' + titleOf(d.from))} · ${esc(d.label || DEP[d.type])}${d.critical ? ' <i>· critical</i>' : ''}</button>`;
  return `<section class="cm-spec"><h4>${esc(categoryName(c.category))} · ${esc(c.ref)}<span class="${c.single ? 'exposed' : c.status}">${c.single ? 'Single path' : esc(c.status)}</span></h4><p class="cm-spec-t"><b>${esc(c.title)}</b></p><p>${esc(describeCapability(P, id))}</p><dl class="cm-dl"><div class="${c.boundary ? '' : 'miss'}"><dt>Owns</dt><dd>${esc(c.boundary || 'Boundary not recorded')}</dd></div><div><dt>Supports</dt><dd>${users}</dd></div><div><dt>Depends on</dt><dd>${deps.map(d2).join('') || '<em>Nothing recorded</em>'}</dd></div><div><dt>Needed by</dt><dd>${by.map(d2).join('') || '<em>No other capability</em>'}</dd></div><div><dt>Trust boundary</dt><dd>${c.boundaryId ? link(c.boundaryId) : '<em>None</em>'}</dd></div><div class="${c.single ? 'miss' : ''}"><dt>Continuity</dt><dd>${esc(CONT[c.continuity] || c.continuity)} · ${esc(c.failureDomain || 'no failure domain')}${c.alternateDomain ? ' → ' + esc(c.alternateDomain) : ''}${c.continuityPlan ? `<small class="pf-note">${esc(c.continuityPlan)}</small>` : ''}</dd></div>${['transactional', 'messaging'].includes(c.category) ? `<div class="${c.recoveryPlan && c.recovers.length ? '' : 'miss'}"><dt>Recovery</dt><dd>${esc(c.recoveryPlan || 'No recovery plan')}${c.recovers.length ? '<br>from ' + c.recovers.map(titleOf).map(esc).join(', ') : ' · no recovery dependency'}</dd></div>` : ''}<div class="${c.drivers.length || c.decisions.length ? '' : 'none'}"><dt>Why</dt><dd>${esc([...c.drivers, ...c.decisions].join(', ') || 'Inherited from the components it supports')}</dd></div><div><dt>Owner</dt><dd>${esc(c.owner || 'Not named')}</dd></div></dl>
  ${marked.has(id) && pending() ? `<div class="cm-note gold">${pending().objectContext({id, ref: c.ref, title: c.title})}</div>` : ''}
  <div class="cm-acts">${tact('edit', `data-t-id="${esc(id)}"`, icon('edit') + 'Edit capability', 'primary')}${tact('edit-continuity', `data-t-id="${esc(id)}"`, 'Continuity &amp; recovery')}<button type="button" class="cm-btn" data-pf="connect" data-id="${esc(id)}">${icon('link')}Add a dependency</button>${proposeButtons(c)}<button type="button" class="cm-btn" data-pf="fail" data-id="${esc(id)}">What if it fails?</button><button type="button" class="cm-btn" data-pf="dissect" data-id="${esc(id)}">${icon('dissect')}Focus on it</button><a class="cm-btn" href="${esc(projectURL('/?chapter=6&tab=work&object=' + encodeURIComponent(id)))}">Open in Work</a></div></section>`;
}
function specimenComponent(id) {
  const k = P.components.get(id), ns = k.needs.map(n => P.needs.get(n));
  const stops = [...P.capabilities.values()].filter(c => c.blast.stops.includes(id));
  return `<section class="cm-spec"><h4>Application component · ${esc(k.ref)}</h4><p class="cm-spec-t"><b>${esc(k.title)}</b></p><dl class="cm-dl"><div><dt>Module</dt><dd>${esc(P.modules.get(k.module)?.title || k.module)}</dd></div><div><dt>Trust boundary</dt><dd>${k.boundary ? link(k.boundary) : '<em>None</em>'}</dd></div><div><dt>Stands on</dt><dd>${ns.map(n => `<button type="button" class="cm-link" data-sel="${esc(n.id)}">${esc(categoryName(n.category))} → ${esc(n.capabilities.map(titleOf).join(', ') || 'nothing')}<i class="${n.capabilities.length ? (n.criticality === 'essential' ? 'ess' : 'deg') : ''}"> · ${n.capabilities.length ? n.criticality : 'not supported'}</i></button>`).join('') || '<em>No needs recorded</em>'}</dd></div><div class="${stops.length ? 'miss' : ''}"><dt>Stops if lost</dt><dd>${stops.map(c => link(c.id)).join('') || '<em>No single capability</em>'}</dd></div></dl>
  <div class="cm-acts">${tact('needs', `data-t-id="${esc(id)}"`, icon('edit') + 'Edit technology needs', 'primary')}<a class="cm-btn" href="${esc(projectURL('/?chapter=5&tab=model&object=' + encodeURIComponent(id)))}">Component in Chapter 5</a></div></section>`;
}
function specimenNeed(id) {
  const n = P.needs.get(id), q = P.proposals.find(x => x.key === 'missing' && x.need === id);
  return `<section class="cm-spec"><h4>Application need · ${esc(n.id)}<span class="${n.capabilities.length ? (n.criticality === 'essential' ? 'guarded' : 'candidate') : 'exposed'}">${n.capabilities.length ? n.criticality : 'Not supported'}</span></h4><p class="cm-spec-t"><b>${esc(titleOf(n.component))} · ${esc(categoryName(n.category))}</b></p><p>${esc(describeNeed(P, id))}</p><dl class="cm-dl"><div><dt>Supported by</dt><dd>${n.capabilities.map(link).join('') || '<em>Nothing yet</em>'}</dd></div><div class="${n.confirmed ? '' : 'none'}"><dt>Review</dt><dd>${n.confirmed ? 'Confirmed' : 'Not yet confirmed against the component'}</dd></div></dl>
  <div class="cm-acts">${tact('needs', `data-t-id="${esc(n.component)}"`, icon('edit') + 'Edit technology needs', 'primary')}${!n.capabilities.length && q ? tact('preview', `data-t-key="missing" data-t-id="${esc(n.component)}" data-t-need="${esc(n.id)}"`, 'Propose support', 'gold') : ''}${n.capabilities[0] ? `<button type="button" class="cm-btn" data-sel="${esc(n.capabilities[0])}">The capability</button>` : ''}</div></section>`;
}
function specimenDep(id) {
  const d = P.deps.find(x => x.id === id);
  return `<section class="cm-spec"><h4>${esc(DEP[d.type] || d.type)} · ${esc(d.id)}${d.critical ? '<span class="exposed">Critical</span>' : ''}</h4><p class="cm-spec-t"><b>${esc(titleOf(d.from))} → ${esc(titleOf(d.to))}</b></p><p>${esc(titleOf(d.from))} ${esc(d.label || 'depends on')} ${esc(titleOf(d.to))}.${d.critical ? ' If the second fails, the first stops too.' : ''}</p><dl class="cm-dl"><div class="${d.policy ? '' : 'miss'}"><dt>Policy</dt><dd>${esc(d.policy || 'Not recorded')}</dd></div></dl><div class="cm-acts">${tact('dependency', `data-t-id="${esc(id)}"`, icon('edit') + 'Edit dependency', 'primary')}</div></section>`;
}
function specimenBoundary(id) {
  const b = P.boundaries.get(id), caps = [...P.capabilities.values()].filter(c => c.boundaryId === id), comps = [...P.components.values()].filter(k => k.boundary === id);
  return `<section class="cm-spec"><h4>Trust boundary · ${esc(b.ref)}</h4><p class="cm-spec-t"><b>${esc(b.title)}</b></p>${b.policy ? `<p>${esc(b.policy)}</p>` : ''}<dl class="cm-dl"><div><dt>Owner</dt><dd>${esc(b.owner || 'Not named')}</dd></div><div><dt>Capabilities</dt><dd>${caps.map(c => link(c.id)).join('') || '<em>None</em>'}</dd></div><div><dt>Components</dt><dd>${comps.map(k => link(k.id)).join('') || '<em>None</em>'}</dd></div></dl><div class="cm-acts">${tact('boundary', `data-t-id="${esc(id)}"`, icon('edit') + 'Edit boundary', 'primary')}<a class="cm-btn" href="${esc(projectURL('/?chapter=9&tab=model&object=' + encodeURIComponent(id)))}">Threat model in Chapter 9</a></div></section>`;
}
function specimenModule(id) {
  const ks = [...P.components.values()].filter(k => k.module === id);
  return `<section class="cm-spec"><h4>Module · Chapter 4</h4><p class="cm-spec-t"><b>${esc(titleOf(id))}</b></p><dl class="cm-dl"><div><dt>Components</dt><dd>${ks.map(k => link(k.id)).join('')}</dd></div></dl><div class="cm-acts"><button type="button" class="cm-btn primary" data-pf="scope-module" data-id="${esc(id)}">${icon('dissect')}Open this module</button></div></section>`;
}
function failureHTML() {
  if (!FA) return '';
  const stops = FA.stops.map(id => link(id)).join('') || '<em>None</em>', deg = FA.degrades.map(id => link(id)).join('');
  return `<section class="cm-spec"><h4>What fails together<span class="exposed">${FA.stops.length} of ${P.components.size} stop</span></h4><p class="cm-spec-t"><b>${esc(FA.mode === 'domain' ? 'Lose ' + FA.title : 'Lose ' + FA.title)}</b></p><p>${FA.mode === 'domain' ? `Every capability in ${esc(FA.title)} is lost together` : `${esc(FA.title)} is lost`}; the chapter's simulation carries the loss along critical dependencies and to every component with an essential need on what is lost.</p><dl class="cm-dl"><div><dt>Capabilities</dt><dd>${FA.caps.map(x => `<button type="button" class="cm-link" data-sel="${esc(x.id)}">${esc(titleOf(x.id))}<i> · ${esc(x.state)}</i><small>${esc(x.reason)}</small></button>`).join('')}</dd></div><div class="miss"><dt>Stop</dt><dd>${stops}</dd></div>${deg ? `<div><dt>Degraded</dt><dd>${deg}</dd></div>` : ''}</dl><p class="cm-muted">A design simulation of declared support and dependencies, not a failover test. The Work tab's lab records a walkthrough with quality assumptions.</p></section>`;
}
function reading() {
  if (diagramView()) return NT.readingHTML();
  return `<section><h4>Reading this view</h4><p>Each row is a platform <b>capability</b>, grouped by what it does; each column a component that stands on the platform. A dot is a need where the two meet — filled when essential, half when the component can run degraded without it — and neighbouring needs join into a <b>plate</b>.</p><p>Brackets beside the capabilities are dependencies: a critical one carries a failure upward. The last column says what stops if the capability fails.</p></section>`;
}
const insightsList = () => platformInsights(P, scope()).slice(0, 8);
function insightsHTML(list = insightsList()) {
  if (!list.length) return '';
  return `<section><h4>What the model shows<span>${list.length}</span></h4>${list.map(x => `<button type="button" class="cm-ins ${x.kind}" data-sel="${esc(x.id || '')}"><span>${esc(x.text)}</span>${x.ask ? `<small>Ask: ${esc(x.ask)}</small>` : ''}</button>`).join('')}<p class="cm-muted">Drawn from recorded needs, capabilities, dependencies and Chapter 6's simulation. Prompts for review, not verdicts.</p></section>`;
}
function findingsHTML() {
  const fs = P.findings.filter(f => scope().kind === 'system' || f.objectId === scope().id || P.capabilities.get(scope().id)?.users.includes(f.objectId));
  if (!fs.length) return '';
  const groups = new Map();
  for (const f of fs) { const k = f.title.replace(/(TC|TN|TM|TD|APP|TB)-\d+/g, '…').replace(/ · .*$/, ''); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
  return `<section><h4>Chapter 6 checks<span>${fs.length}</span></h4>${[...groups].sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([k, g]) => `<button type="button" class="cm-fg ${g.some(f => f.level === 'error') ? 'error' : ''}" data-sel="${esc(g[0].objectId)}"><b>${esc(k)}</b><small>${g.length} · ${esc([...new Set(g.map(f => refOf(f.objectId) || f.objectId))].slice(0, 4).join(', '))}${g.length > 4 ? '…' : ''}</small></button>`).join('')}<a class="cm-muted" href="${esc(projectURL('/?chapter=6&tab=validate&validate=readiness'))}">All checks on Validate →</a></section>`;
}
// A category whose needs wait without support: the needs, and the ways to support them.
function specimenMissing(id) {
  const cat = id.slice(8), ns = [...P.needs.values()].filter(n => !n.capabilities.length && n.category === cat);
  return `<section class="cm-spec"><h4>Needs without support<span class="exposed">${ns.length}</span></h4><p class="cm-spec-t"><b>${esc(categoryName(cat))}</b></p><p>No capability supports these needs yet. Each component that needs ${esc(categoryName(cat).toLowerCase())} waits here until one does.</p><dl class="cm-dl"><div class="miss"><dt>Waiting</dt><dd>${ns.map(n => `<button type="button" class="cm-link" data-sel="${esc(n.id)}">${esc(titleOf(n.component))}<i> · ${esc(n.criticality)}</i></button>`).join('') || '<em>None</em>'}</dd></div></dl><div class="cm-acts">${tact('new', '', icon('plus') + 'New capability', 'primary')}${ns[0] && P.proposals.some(x => x.key === 'missing' && x.need === ns[0].id) ? tact('preview', `data-t-key="missing" data-t-id="${esc(ns[0].component)}" data-t-need="${esc(ns[0].id)}"`, 'Propose support', 'gold') : ''}</div></section>`;
}
function panel() {
  const box = root.querySelector('.cm-panel'), ins = insightsList();
  solMark(root, project(), 6);
  panelToggle(root, '[data-pf="panel"]', S.panel, ins.length);
  if (!S.panel) { box.innerHTML = ''; return; }
  const s = S.sel;
  let spec = '';
  if (s && P.capabilities.has(s)) spec = specimenCapability(s) + specPanelHTML(project(), s);
  else if (s && P.components.has(s)) spec = specimenComponent(s) + specPanelHTML(project(), s);
  else if (s && P.needs.has(s)) spec = specimenNeed(s);
  else if (s && P.deps.some(d => d.id === s)) spec = specimenDep(s);
  else if (s && P.boundaries.has(s)) spec = specimenBoundary(s);
  else if (s && P.modules.has(s)) spec = specimenModule(s);
  else if (s?.startsWith?.('MISSING:')) spec = specimenMissing(s);
  if (!spec && s && drawn(s)) spec = NT.specimenHTML(s);
  box.innerHTML = (failing() ? failureHTML() : '') + solInto(spec, solSection(project(), 6, s)) + reading() + insightsHTML(ins) + findingsHTML();
}

// ---------------------------------------------------------------- the failure walk

function stageText(st) {
  if (!FA) return '';
  const names = ids => ids.map(titleOf).join(', ') || 'nothing';
  if (st === 'fail') return FA.mode === 'domain' ? `${FA.title} is lost: ${names(FA.first)}.` : `${FA.title} is lost.`;
  if (st === 'spread') { const more = FA.caps.filter(x => !FA.first.includes(x.id)); return more.length ? `Critical dependencies carry it to ${names(more.map(x => x.id))}.` : 'No other capability depends on it critically.'; }
  if (st === 'stop') return FA.stops.length ? `${FA.stops.length} of ${P.components.size} components lose an essential need and stop: ${names(FA.stops)}.` : 'No component loses an essential need.';
  const deg = FA.caps.filter(x => x.state === 'degraded');
  return `${deg.length ? names(deg.map(x => x.id)) + ' continue degraded. ' : ''}${FA.degrades.length ? names(FA.degrades) + ' keep running degraded. ' : ''}${P.components.size - FA.stops.length - FA.degrades.length} component${P.components.size - FA.stops.length - FA.degrades.length === 1 ? '' : 's'} are unaffected.`;
}
// The footer: the failure walk's controls and, while walking, its text; otherwise the status line.
function walkBar() {
  if (diagramView()) { const w = root.querySelector('.cm-walk-in'); if (w) w.innerHTML = ''; return; }
  const bar = root.querySelector('.cm-walk-in');
  if (!FA) { bar.innerHTML = ''; return; }
  const cur = S.walk >= 0 ? STAGES[S.walk] : null;
  bar.innerHTML = `${S.walk >= 0 ? `<button type="button" class="cm-btn" data-pf="walk-prev" aria-label="Previous stage" ${S.walk <= 0 ? 'disabled' : ''}>‹</button>` : ''}<button type="button" class="cm-btn" data-pf="walk-next" title="Four stages: it fails, what depends on it, the components that stop, and what could continue.">${S.walk < 0 ? icon('play') + '<span>Walk the failure</span>' : S.walk >= STAGES.length - 1 ? 'Done' : 'Next ›'}</button>${cur ? `<p class="cm-walk-text"><b>${S.walk + 1} / ${STAGES.length} · ${esc(cur[1])}</b> ${esc(stageText(cur[0]))}</p>` : ''}${S.walk >= 0 ? '<button type="button" class="cm-btn icon" data-pf="walk-stop" aria-label="Stop the walk-through">×</button>' : ''}`;
}

// ---------------------------------------------------------------- interaction

function revealSelection() {
  if (diagramView()) { const b = NT.layout()?.nodes.find(n => n.id === S.sel); if (b) stage.reveal(b.x, b.y, b.w, b.h); return; }
  if (!S.sel || !L) return;
  const r = L.rows.find(x => x.id === S.sel), c = L.cols.find(x => x.id === S.sel || x.id === F.colOf(S.sel));
  if (r) stage.reveal(L.rail, r.y, 300, r.h); else if (c) stage.reveal(c.x, L.top, c.w, 120);
}
// Whichever path changed the selection, the page and Sol hear of it once, as the model renders.
let announced;
const selTargetBase = () => (S.sel && !/^(MOD:|MISSING:)/.test(S.sel) ? S.sel : null);
const selTarget = () => { const t = selTargetBase(); return t && /^(system:|party:|unplaced:|lane:|family:)/.test(String(t)) ? null : t; };
function announce() {
  announced = S.sel;
  const p = project(), target = selTarget();
  if (p) { try { mountBrainContext(p, {id: target || solOwner(p, S.sel) || 'project', chapter: 6}, 'model'); } catch { /* assistance is optional */ } }
  announceObject(target);
}
function select(id, {reveal = false} = {}) {
  S.sel = id || null; S.walk = -1;
  if (failing() && P.capabilities.has(S.sel) && S.fail?.id !== S.sel) S.fail = {id: S.sel, mode: S.fail?.mode || 'capability'};
  if (S.sel && !S.panel) S.panel = true;
  save(); render();
  if (reveal) revealSelection();
}
function setScope(sc) { const r = platformScope(P, sc); S.scope = r.kind === 'system' ? {kind: 'system'} : {kind: r.kind, id: r.id}; S.walk = -1; fitPending = true; save(); render(); }
function studioAction(action, data = {}) { const b = document.createElement('button'); b.type = 'button'; b.hidden = true; b.dataset.tAction = action; for (const [k, v] of Object.entries(data)) b.dataset[k] = v; document.body.append(b); b.click(); b.remove(); }

function bind() {
  solChapterBind(root, 6, {refresh: solRefresh});
  root.addEventListener('change', e => { NT.change(e); });
  root.addEventListener('keydown', e => { NT.keydown(e); });
  root.addEventListener('click', e => {
    if (root.dataset.suppress) return;
    if (NT.handle(e)) return;
    const add = root.querySelector('.cm-add');
    if (add?.open && !e.target.closest('.cm-add > summary')) add.open = false;
    if (e.target.closest('[data-brain-launch],[data-t-action],a')) return;
    const a = e.target.closest('[data-pf]');
    if (a && !a.disabled) {
      const k = a.dataset.pf;
      if (k === 'view') { S.view = a.dataset.id; S.walk = -1; save(); render(); return; }
      if (k === 'lens') { S.lens = a.dataset.id; save(); render(); return; }
      if (k === 'depth') { S.depth = a.dataset.id; fitPending = true; save(); render(); return; }
      if (k === 'mode') { S.fail = {id: S.fail?.id || defaultFail()?.id, mode: a.dataset.id}; S.walk = -1; save(); render(); return; }
      if (k === 'fail') { S.fail = {id: a.dataset.id, mode: 'capability'}; S.view = 'failure'; S.sel = a.dataset.id; S.walk = -1; save(); render(); return; }
      if (k === 'scope') { setScope({kind: 'system'}); return; }
      if (k === 'scope-module') { setScope({kind: 'module', id: a.dataset.id}); return; }
      if (k === 'dissect') { setScope({kind: 'capability', id: a.dataset.id}); return; }
      if (k === 'connect') { studioAction('inspect', {tId: a.dataset.id}); setTimeout(() => studioAction('connect'), 60); return; }
      if (k === 'explore') { cbs.explore?.(6); return; }
      if (k === 'expand') { const on = !document.body.classList.contains('cm-expanded'); document.body.classList.toggle('cm-expanded', on); a.setAttribute('aria-pressed', String(on)); sizeModel(root, 'cm-expanded'); fitPending = true; setTimeout(render, 30); return; }
      if (k === 'panel') { S.panel = !S.panel; save(); fitPending = true; render(); setTimeout(() => { fitPending = true; render(); }, 30); return; }
      if (k === 'key') { const key = root.querySelector('.cm-key'); key.classList.toggle('cm-min'); a.setAttribute('aria-expanded', String(!key.classList.contains('cm-min'))); return; }
      if (k === 'fit') { stage.fitAll(); return; }
      if (k === 'zin' || k === 'zout') { const {w, h} = stage.box(); stage.zoomAt(stage.cam.z * (k === 'zin' ? 1.15 : 1 / 1.15), w / 2, h / 2); return; }
      if (k === 'walk-next') { S.walk = S.walk >= STAGES.length - 1 ? -1 : S.walk + 1; render(); return; }
      if (k === 'walk-prev') { S.walk = Math.max(0, S.walk - 1); render(); return; }
      if (k === 'walk-stop') { S.walk = -1; render(); return; }
      if (k === 'noop') return;
    }
    const s = e.target.closest('[data-sel]');
    if (s && s.dataset.sel) {
      e.stopPropagation();
      const id = s.dataset.sel, now = Date.now(), twice = lastClick.id === id && now - lastClick.t < 420;
      lastClick = {id, t: now};
      if (twice && s.matches('.pf-cap') && P.capabilities.has(id)) { lastClick = {id: null, t: 0}; setScope({kind: 'capability', id}); return; }
      if (twice && s.matches('.pf-ch') && P.modules.has(id)) { lastClick = {id: null, t: 0}; setScope({kind: 'module', id}); return; }
      select(id, {reveal: !!s.closest('.cm-panel')}); return;
    }
    if (e.target.closest('.cm-stage') && !e.target.closest('.cm-heads,.cm-rail,.cm-zoom,.cm-key') && (S.sel || S.walk >= 0)) { S.walk = -1; select(null); }
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !root?.isConnected || document.querySelector('dialog[open]')) return;
    const a = document.activeElement;
    if (a && a !== document.body && !root.contains(a)) return;
    if (a?.closest?.('select,details[open],textarea')) return;
    if (S.walk >= 0) { S.walk = -1; render(); }
    else if (S.sel) select(null);
    else if (scope().kind !== 'system') setScope({kind: 'system'});
    else if (document.body.classList.contains('cm-expanded')) root.querySelector('[data-pf="expand"]').click();
    else return;
    e.preventDefault();
  });
  root.addEventListener('pointerleave', () => { root.querySelector('.cm-tip').hidden = true; });
  window.addEventListener('resize', () => { if (!root?.isConnected) return; clearTimeout(bind._r); bind._r = setTimeout(() => { sizeModel(root, 'cm-expanded'); render(); }, 120); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!root?.isConnected || !L) return; clearTimeout(bind._ro); bind._ro = setTimeout(() => { const w = stage.box().w; if (Math.abs(w - (bind._w || 0)) > 24) { bind._w = w; fitPending = true; render(); } }, 90); }).observe(root.querySelector('.cm-stage'));
}
function tip(e) {
  const box = root.querySelector('.cm-tip'), t = e.target.closest?.('.pf-cap,.pf-ch,.nt-node');
  if (!t || !root.contains(t)) { box.hidden = true; return; }
  if (t.dataset.ntNode) { box.innerHTML = NT.tipHTML(t.dataset.ntNode); box.hidden = !box.innerHTML; if (!box.hidden) placeTip(box, e); return; }
  const id = t.dataset.sel;
  const html = P.capabilities.has(id) ? `<b>${esc(refTitle(id))}</b>${esc(describeCapability(P, id))}<small class="h">Double-click to focus on it and its dependencies</small>` : P.components.has(id) ? `<b>${esc(refTitle(id))}</b>${esc(P.components.get(id).needs.length + ' needs · ' + boundaryTitle(P, P.components.get(id).boundary))}` : P.modules.has(id) ? `<b>${esc(titleOf(id))}</b>Double-click to open the module` : '';
  if (!html) { box.hidden = true; return; }
  box.innerHTML = html; box.hidden = false; placeTip(box, e);
}

export function platformDebug() { return {S: {...S}, P, F, L, FA}; }
