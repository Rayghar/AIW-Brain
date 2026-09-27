// Chapter 4 Model — Logical application.
//
// Two architecture models of the same logical design, drawn from recorded facts:
// - Responsibilities: a blueprint of the design over the business journey. The journey's steps
//   run across, the responsibility groups run down; each responsibility stands at the step it
//   serves, hands work on through logical flows, and shows along its foot the component that
//   realises it (Chapter 5) — the logical design seen inside the physical one.
// - Coverage: the reasons (requirements, quality drivers, decisions) against the
//   responsibilities, with what covers each reason and what nothing covers.
// Sliced like every chapter model (whole journey → one group → one responsibility), read
// through the Structure, Flow and Reasoning lenses, walked journey by journey, and edited only
// through the Chapter 4 editors and responsibility proposals.
import {responsibilitySource, foldResponsibilities, responsibilityScope, coverage, journeyWalk, describeWalk, describeResponsibility, describeFlow, responsibilityInsights, defaultDepth, laneInfo, bandInfo, PROPOSED, UNGROUPED, UNOWNED, ACROSS} from './responsibility-model.js';
import {responsibilityLayout, mapHead, coverageLayout, coverageHead, RX, CX} from './responsibility-layout.js';
import {modelStage, sizeModel, placeTip, edgesHTML, toolsHTML, defaultPanel, panelToggle, setState, showFailure, announceObject, focusKey, refocus} from './model-stage.js';
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
// Chapter 4 edits to a saved responsibility are staged as a reviewable model proposal; while one
// is open, the model shows the proposed design and marks what it changes.
const pending = () => { const i = window.aiwInterfaceImpact; return i?.pending && i.previewInChapter?.(4) ? i : null; };
const PATHS = {diagram: 'M4 4h6v5H4zM14 4h6v5h-6zM9 15h6v5H9zM7 9v3h10V9M12 12v3', structure: 'M6 3v18M18 3v18M6 8h12M6 16h12', flow: 'M3 12h13m-4-5 5 5-5 5M3 5h6M3 19h6', reasoning: 'M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9M9 7h6M9 17h6', model: 'M3 5h5v5H3zM10 14h5v5h-5zM16 5h5v5h-5zM8 7.5h8M12.5 10v4', matrix: 'M4 4h16v16H4zM4 10h16M4 16h16M10 4v16M16 4v16', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', panel: 'M3 4h18v16H3zM15 4v16', explore: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', plus: 'M12 5v14M5 12h14', spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z', mind: 'm3 7 9-4 9 4-9 4-9-4m0 5 9 4 9-4m-18 5 9 4 9-4', edit: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4', dissect: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14M21 21l-5-5M8 11h6', play: 'M7 4v16l13-8z', link: 'M9 15 15 9M8 12l-2 2a3 3 0 0 0 4 4l2-2m4-4 2-2a3 3 0 0 0-4-4l-2 2', layers: 'm12 3 9 5-9 5-9-5 9-5m-9 9 9 5 9-5'};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[n] || PATHS.model}"/></svg>`;
const LENSES = [
  {id: 'structure', label: 'Structure', like: 'skeleton', q: 'What each responsibility owns, exposes and is protected by, its boundary, and which Chapter 5 interaction carries each flow.'},
  {id: 'flow', label: 'Flow', like: 'muscles', q: 'Where work comes from and where it goes, and which journeys pass along each flow.'},
  {id: 'reasoning', label: 'Reasoning', like: 'DNA', q: 'The requirements, quality drivers and decisions behind each responsibility, and the condition on each flow.'}
];
const STATE = {reviewed: 'Reviewed', changed: 'Inputs changed', incomplete: 'Incomplete', reference: 'Reference', draft: 'Draft'};
const LAYER = {data: 'Data · Chapter 8', interface: 'Interface · Chapter 8', security: 'Security · Chapter 9', technology: 'Platform · Chapter 6', physical: 'Component · Chapter 5', deployment: 'Runtime · Chapter 10', process: 'Journey step · Chapter 1'};
const CH = {data: 8, interface: 8, security: 9, technology: 6, physical: 5, deployment: 10, process: 1};

let marked = new Set(), lastProposal = '', lastGhost = '', visited = new Map();
let root = null, LM = null, lastDoc = null, cbs = {}, F = null, L = null, G = null, fitPending = true, stage = null, lastClick = {id: null, t: 0}, pageSel;
let NT = null;
let S = {view: 'diagram', lens: 'structure', scope: {kind: 'system'}, depth: 'auto', sel: null, panel: true, walk: -1, scn: null};
// The standard diagram (notation-view.js) and the elements only it draws (the application itself, an external system, a placement).
const diagramView = () => S.view === 'diagram';
const drawn = id => diagramView() && !!NT?.diagram()?.nodes.some(n => n.id === id);
const pref = () => projectPreferenceKey('aiw-responsibility-model-v1');
function load() { try { const v = JSON.parse(localStorage.getItem(pref()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
function save() { try { localStorage.setItem(pref(), JSON.stringify({view: S.view, lens: S.lens, scope: S.scope, depth: S.depth, sel: S.sel, panel: S.panel, scn: S.scn})); } catch { /* preferences are optional */ } }

// ---------------------------------------------------------------- mount / leave

export function mountChapterModel(selection, callbacks = {}) {
  const p = project(), host = document.querySelector('.studio > .stage.tab-content');
  if (!p || !host) return;
  cbs = callbacks;
  solChapterMount(p, 4, solRefresh);
  if (!root) {
    root = document.createElement('section'); root.className = 'cm lr'; root.setAttribute('aria-label', 'Chapter 4 model: logical application');
    root.innerHTML = shell();
    stage = modelStage(root, {headHeight: () => (S.view === 'diagram' ? 0 : S.view === 'coverage' ? coverageHead() : mapHead()), railWidth: l => l.rail || 0, onHover: tip});
    stage.bind(); bind();
    // The standard diagram shares the stage, the companion and the selection with the chapter's own views.
    NT = createNotation({chapter: 4, root, stage, project, onSelect: id => select(id)});
    NT.onChange = full => { if (full) fitPending = true; render(); };
    NT.bindDrag();
    const v = load();
    for (const k of ['view', 'lens', 'depth', 'sel', 'scn']) if (typeof v[k] === 'string') S[k] = v[k];
    if (v.scope && typeof v.scope === 'object') S.scope = v.scope;
    S.panel = defaultPanel(v.panel);
    if (!['diagram', 'map', 'coverage'].includes(S.view)) S.view = 'diagram';
    if (!LENSES.some(l => l.id === S.lens)) S.lens = 'structure';
  }
  const first = !LM;
  if (host.firstElementChild !== root) host.prepend(root);
  document.body.classList.add('cm-active', 'am-active');
  const d = pending()?.document || p;
  if (d !== lastDoc || !LM) { lastDoc = d; rebuild(d); }
  if (first && LM) { S.sel = null; const want = window.aiwChapterModels ? window.aiwChapterModels.takeLink(4) : new URLSearchParams(location.search).get('object'); if (known(want)) { S.sel = want; setTimeout(revealSelection, 60); } }
  else if (LM && pageSel !== undefined && selection?.id !== pageSel && known(selection?.id)) { S.sel = selection.id; setTimeout(revealSelection, 60); }
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
  try { LM = responsibilitySource(p); } catch (e) { console.error('Logical model', e); LM = null; return; }
  if (S.sel && !known(S.sel)) S.sel = null;
  if (S.scope?.id && responsibilityScope(LM, S.scope).kind === 'system') S.scope = {kind: 'system'};
  if (!LM.scenarios.some(s => s.id === S.scn)) S.scn = LM.scenarios[0]?.id || null;
  marked = new Set();
  const i = pending(), roots = [];
  if (i) { try { const g = i.decorate({nodes: [...LM.R.keys(), ...LM.flows.map(f => f.id)].map(id => ({id, attrs: {}})), edges: []}); for (const n of g.nodes) { if (n.ghost || n.changeImpact) marked.add(n.id); if (n.ghost) roots.push(n.id); } } catch { /* the preview decorates what it can */ } }
  const key = i ? roots.join(',') : '';
  if (key && key !== lastProposal && roots[0] && known(roots[0])) { S.sel = roots[0]; setTimeout(revealSelection, 60); }
  lastProposal = key;
}
function known(id) {
  if (drawn(id)) return true;
  if (!id || !LM) return false;
  return LM.R.has(id) || LM.flows.some(f => f.id === id) || LM.steps.some(s => s.id === id) || LM.groups.has(id) || (id === UNGROUPED && LM.bands.includes(UNGROUPED)) || LM.Q.has(id) || LM.D.has(id) || LM.A.has(id) || LM.C.has(id) || LM.O.has(id) || (id === PROPOSED && !!ghost()) || (String(id).startsWith('LINK:') && !!F?.links.some(l => l.id === id.slice(5)));
}
// A label that bundles several flows selects the bundle: the companion lists each flow.
const bundled = id => (String(id).startsWith('LINK:') ? F?.links.find(l => l.id === id.slice(5)) : null);
// A proposal previewed from the companion or an insight: select what it would add.
function followGhost() {
  const g = ghost(), key = g ? g.key : '';
  if (key && key !== lastGhost) { S.sel = g.layer === 'logical' ? PROPOSED : g.source && known(g.source) ? g.source : S.sel; S.walk = -1; setTimeout(revealSelection, 80); }
  lastGhost = key;
}

// ---------------------------------------------------------------- shell

function shell() {
  return `<header class="cm-top"><div class="cm-title"><small>Chapter 4 · Model</small><strong>Logical application</strong></div>
   <nav class="cm-crumbs" aria-label="Where you are"></nav>
   <div class="cm-views" role="group" aria-label="Model"><button type="button" class="cm-view" data-lr="view" data-id="diagram" title="The logical application in the standard notation">${icon('diagram')}<span>Diagram</span></button><button type="button" class="cm-view" data-lr="view" data-id="map">${icon('model')}<span>Responsibilities</span></button><button type="button" class="cm-view" data-lr="view" data-id="coverage">${icon('matrix')}<span>Coverage</span></button></div>
   <div class="cm-actions"><details class="cm-add"><summary class="cm-btn" aria-label="Add to the model">${icon('plus')}<span>Add</span></summary><div class="lr-addmenu"></div></details>
    <button type="button" class="cm-btn" data-lr="explore" title="The connected explorer: every perspective of the whole model">${icon('explore')}<span>Explore all perspectives</span></button>
    <button type="button" class="cm-btn icon" data-lr="expand" aria-pressed="false" aria-label="Expand the model" title="Expand">${icon('expand')}</button>
    <button type="button" class="cm-btn icon" data-lr="panel" aria-pressed="true" aria-label="Hide the companion panel" title="Companion">${icon('panel')}</button></div></header>
  <div class="cm-bar"><div class="cm-lenses" role="group" aria-label="Lens"></div><div class="cm-depth" role="group" aria-label="Elements"></div><label class="cm-scn"><span>Journey</span><select data-lr-field="scn" aria-label="Journey to walk"></select></label></div>
  <div class="cm-banner"></div>
  <div class="cm-body"><div class="cm-stage" tabindex="0" aria-label="Logical application canvas. Drag or scroll to move; arrow keys pan; Ctrl or Command and scroll to zoom.">
    <div class="cm-world"><svg class="cm-svg" aria-hidden="true"></svg><div class="cm-html"></div></div>
    <div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div>${edgesHTML()}
  </div><aside class="cm-panel" aria-label="Companion"></aside></div>
  <footer class="cm-walk" aria-label="Walk a journey through the responsibilities"><div class="cm-walk-in"></div><p class="cm-state" role="status" aria-live="polite"></p>${toolsHTML('lr')}</footer><div class="cm-tip" role="tooltip" hidden></div>`;
}

// ---------------------------------------------------------------- render

const R = id => LM.R.get(id);
const stepOf = id => LM.steps.find(s => s.id === id);
const flowOf = id => LM.flows.find(f => f.id === id);
function titleOf(id) { return R(id)?.title || stepOf(id)?.title || LM.groups.get(id)?.title || (id === UNGROUPED ? 'Ungrouped' : '') || LM.Q.get(id)?.title || LM.D.get(id)?.title || LM.A.get(id)?.question || LM.C.get(id)?.title || LM.O.get(id)?.title || (id === PROPOSED ? ghost()?.title : '') || flowOf(id)?.label || id; }
function refOf(id) { return R(id)?.ref || (stepOf(id) ? 'Step ' + stepOf(id).num : '') || (LM.Q.has(id) || LM.D.has(id) || LM.A.has(id) ? id : '') || LM.C.get(id)?.ref || LM.O.get(id)?.ref || (flowOf(id) ? id : ''); }
const refTitle = id => { const r = refOf(id); return (r && r !== titleOf(id) ? r + ' ' : '') + titleOf(id); };
function scope() { return responsibilityScope(LM, S.scope); }
function depth() { return S.depth === 'auto' ? defaultDepth(LM) : S.depth; }
const ghost = () => { const g = studio()?.proposal; return g && g.title && !g.existingId && g.layer ? g : null; };
const logicalGhost = () => { const g = ghost(); return g && g.layer === 'logical' ? g : null; };
const covView = () => S.view === 'coverage';
const scenario = () => LM.scenarios.find(s => s.id === S.scn) || LM.scenarios[0] || null;
const walkSteps = () => (scenario() ? journeyWalk(LM, scenario().id) : []);
// Wide enough for the reference and name, and for the shortest lens line below them.
function measure(l) { return Math.max(112, 24 + 6.6 * (String(l.label || '').length + (l.ref ? l.ref.length + 1 : 0))); }
function rState(r) { return r.changed ? 'changed' : !r.defined || !r.reqs.length ? 'incomplete' : r.confirmed ? 'reviewed' : r.origin === 'reference' ? 'reference' : 'draft'; }

function render() {
  if (!root) return;
  if (!LM) { showFailure(root, 'The logical model could not be prepared for this project.'); return; }
  const fk = focusKey(root);
  if (S.sel !== announced) announce();
  root.classList.remove('cm-lens-structure', 'cm-lens-flow', 'cm-lens-reasoning');
  root.classList.add('cm-lens-' + S.lens);
  root.classList.toggle('lr-matrix', covView());
  root.classList.toggle('lr-walking', S.walk >= 0 && !covView());
  root.classList.toggle('cm-walking', S.walk >= 0 && !covView());
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
  // Geometry depends on the records, the scope, the depth and a pending proposal — never the lens.
  F = foldResponsibilities(LM, scope(), depth(), {proposal: logicalGhost()});
  if (covView()) { G = coverage(LM, scope(), {proposal: logicalGhost()}); L = coverageLayout(G); } else L = responsibilityLayout(F, {measure});
  const world = root.querySelector('.cm-world'), svg = root.querySelector('.cm-svg');
  world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
  svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
  const hl = covView() ? covHL() : highlight();
  if (covView()) { svg.innerHTML = matrixSVG(hl); root.querySelector('.cm-html').innerHTML = matrixHTML(); matrixHeads(); matrixRail(); }
  else if (!F.rows.length) { svg.innerHTML = ''; root.querySelector('.cm-html').innerHTML = emptyHTML(); root.querySelector('.cm-heads-in').innerHTML = ''; root.querySelector('.cm-rail-in').innerHTML = ''; }
  else { svg.innerHTML = defs() + mapSVG(hl); root.querySelector('.cm-html').innerHTML = mapHTML(hl); mapHeads(hl); mapRail(hl); }
  chrome(); panel(); walkBar();
  stage.use(L, JSON.stringify([S.view, S.scope?.kind || 'system', S.scope?.id || '', depth()]));
  if (fitPending) { fitPending = false; stage.fit(); } else stage.clamp();
  stage.apply();
  refocus(root, fk);
}
function emptyHTML() {
  return `<div class="lr-empty" style="left:${RX.RAIL + 30}px;top:${mapHead() + 30}px"><b>No responsibility yet</b><p>A responsibility names a behaviour the design owns, the journey step it serves and the requirement that justifies it.</p><button type="button" class="cm-btn primary" data-l-action="new">${icon('plus')}New responsibility</button>${LM.proposals.filter(q => !q.existingId).map(q => `<button type="button" class="cm-btn gold" data-l-action="preview" data-l-key="${esc(q.key)}">Propose: ${esc(q.title)}</button>`).join('')}</div>`;
}

// What an object concerns, in the terms of the drawn model.
function concerns(id) {
  const out = {resp: new Set(), flows: new Set(), steps: new Set(), bands: new Set(), rows: new Set()};
  const addR = x => out.resp.add(x);
  if (R(id)) { const r = R(id); addR(id); r.steps.forEach(s => out.steps.add(s)); for (const f of [...r.in, ...r.out]) { out.flows.add(f); addR(flowOf(f).from); addR(flowOf(f).to); } }
  else if (flowOf(id)) { const f = flowOf(id); out.flows.add(id); addR(f.from); addR(f.to); }
  else if (stepOf(id)) { const s = stepOf(id); out.steps.add(id); s.served.forEach(addR); if (s.hole) out.rows.add('HOLE:' + id); }
  else if (LM.groups.has(id) || id === UNGROUPED) { out.bands.add(id); for (const r of LM.R.values()) if (r.group === id) addR(r.id); out.rows.add('EMPTY:' + id); }
  else if (LM.Q.has(id)) LM.Q.get(id).covers.forEach(addR);
  else if (LM.D.has(id)) { const d = LM.D.get(id); [...d.direct, ...d.via].forEach(addR); }
  else if (LM.A.has(id)) { const d = LM.A.get(id); d.linked.forEach(addR); }
  else if (LM.C.has(id)) { for (const r of LM.R.values()) if (r.realisedBy.includes(id)) addR(r.id); }
  else if (LM.O.has(id)) { for (const r of LM.R.values()) if (r.context.some(c => c.object === id)) addR(r.id); }
  else if (id === PROPOSED) { out.rows.add(PROPOSED); const g = logicalGhost(); if (g?.source && R(g.source)) addR(g.source); }
  else if (bundled(id)) { for (const f of bundled(id).flows) { out.flows.add(f); addR(flowOf(f).from); addR(flowOf(f).to); } }
  return out;
}
function highlight() {
  const out = {on: false, cards: new Set(), links: new Set(), resp: new Set(), steps: new Set(), bands: new Set(), now: null, stops: new Set()};
  if (S.walk >= 0 && !covView()) {
    const w = walkSteps()[S.walk];
    if (w) { out.on = true; out.now = w.step; out.steps.add(w.step); w.served.forEach(id => out.resp.add(id)); for (const id of out.resp) { const r = F.rowOf(id); if (r) out.cards.add(r); } if (!w.served.length) out.cards.add('HOLE:' + w.step); for (const l of F.links) if (l.flows.some(f => w.from.includes(f))) { out.links.add(l.id); out.cards.add(l.from); }
      // Where a journey stops early, the flow it does not take is marked.
      for (const l of F.links) if (l.flows.some(f => w.onward.includes(f))) out.stops.add(l.id); }
    return out;
  }
  const id = S.sel;
  if (!id) return out;
  const c = concerns(id);
  out.on = true; out.resp = c.resp; out.steps = c.steps; out.bands = c.bands;
  for (const r of c.resp) { const row = F.rowOf(r); if (row) out.cards.add(row); }
  for (const r of c.rows) out.cards.add(r);
  for (const l of F.links) if (l.flows.some(f => c.flows.has(f)) || (l.proposed && id === PROPOSED)) { out.links.add(l.id); out.cards.add(l.from); out.cards.add(l.to); }
  return out;
}
const cardCls = (hl, id) => (hl.on ? (hl.cards.has(id) ? ' lit' : ' dim') : '');

function defs() {
  const m = (id, fill) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1 9 5 1 9z" fill="${fill}"/></marker>`;
  return `<defs>${m('lr-a-n', '#286954')}${m('lr-a-t', '#7d8b78')}${m('lr-a-h', '#a8741f')}${m('lr-a-m', '#c3cbbd')}${m('lr-a-p', '#b88830')}${m('lr-a-w', '#b5832f')}</defs>`;
}
function roundPath(pts, r = 6) {
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
function mapSVG(hl) {
  const out = [], x0 = L.rail, x1 = L.W - 6;
  L.bands.forEach((b, i) => { const info = bandInfo(LM, b.id); out.push(`<rect class="lr-band ${info.kind}${i % 2 ? ' odd' : ''}${hl.bands.has(b.id) ? ' lit' : ''}" x="${x0}" y="${b.y}" width="${x1 - x0}" height="${b.h}"/>`); });
  for (const ln of L.lanes) out.push(`<rect class="lr-lane${ln.kind === 'across' ? ' across' : ''}${hl.steps.has(ln.step) ? ' lit' : ''}" x="${ln.x}" y="${L.top - 4}" width="${ln.w}" height="${L.H - L.top - 2}" rx="10"/>`);
  const order = L.routes.map(r => ({r, lit: hl.links.has(r.id)})).sort((a, b) => a.lit - b.lit);
  for (const {r, lit} of order) {
    const l = r.link, stop = hl.stops.has(r.id), tone = l.proposed ? 'p' : lit ? 'h' : stop ? 'w' : hl.on ? 'm' : l.kind === 'trace' ? 't' : 'n';
    out.push(`<path class="lr-route ${l.kind}${l.conditional ? ' cond' : ''}${l.realised && !l.carried ? ' uncarried' : ''}${l.proposed ? ' proposed' : ''}${lit ? ' lit' : stop ? ' stop' : hl.on ? ' dim' : ''}${l.dim ? ' out' : ''}" d="${roundPath(r.pts)}" marker-end="url(#lr-a-${tone})"/>`);
  }
  return out.join('');
}
// Chips are buttons: what can be selected can be reached with the keyboard.
const chipD = c => `<button type="button" class="cm-chip cm-d lr-o ${c.layer}" data-sel="${esc(c.object)}" title="${esc((c.outward ? c.label + ' ' : c.label + ' ← ') + c.title)}">${esc(c.title)}</button>`;
function structureLines(r) {
  const own = r.context.filter(c => c.layer === 'data'), faces = r.context.filter(c => c.layer === 'interface'), guard = r.context.filter(c => c.layer === 'security'), other = r.context.filter(c => !['data', 'interface', 'security'].includes(c.layer));
  const g = ghost(), pro = g && g.layer === 'data' && g.source === r.id ? `<button type="button" class="cm-chip cm-d lr-o proposed" data-l-action="edit-ghost" title="${esc('Proposed · not saved: ' + g.title)}">+ ${esc(g.title)}</button>` : '';
  const l1 = pro + [...own.map(chipD), ...faces.map(c => `<button type="button" class="cm-chip lr-f" data-sel="${esc(c.object)}" title="${esc(c.label + ' ' + c.title)}">${esc(c.label === 'uses' ? 'uses ' : '')}${esc(c.title)}</button>`), ...guard.map(c => `<button type="button" class="cm-chip lr-g" data-sel="${esc(c.object)}" title="${esc('Protected by ' + c.title)}">${esc(c.title)}</button>`), ...other.map(chipD)].join('') || '<em>owns nothing recorded</em>';
  return `<span class="lr-l1">${l1}</span><span class="lr-l2">${r.boundary ? `<span class="lr-bd" title="${esc('Owns: ' + r.boundary)}">${esc(r.boundary)}</span>` : '<em class="miss">boundary not recorded</em>'}</span>`;
}
function flowLines(r) {
  const ins = r.in.map(flowOf), outs = r.out.map(flowOf);
  const chip = (f, dir) => { const o = R(dir === 'in' ? f.from : f.to); return `<button type="button" class="cm-chip lr-x${f.condition ? ' cond' : ''}" data-sel="${esc(f.id)}" title="${esc(describeFlow(LM, f.id))}">${dir === 'in' ? '←' : '→'} <b>${esc(o.ref)}</b> ${esc(f.label)}${f.condition ? ' ◇' : ''}</button>`; };
  const first = r.stage === 0 && !r.offJourney;
  return `<span class="lr-l1">${ins.map(f => chip(f, 'in')).join('') || `<em>${first ? 'the journey starts here' : 'nothing hands it work'}</em>`}</span><span class="lr-l2">${outs.map(f => chip(f, 'out')).join('') || '<em>hands nothing on</em>'}</span>`;
}
function reasonLines(r) {
  const reqs = r.reqs.map(id => `<button type="button" class="cm-chip lr-w" data-sel="${esc(id)}" title="${esc(id + ' · ' + LM.Q.get(id).title)}">${esc(id)}</button>`).join('');
  const qd = r.qds.length ? `<i class="lr-w q" title="${esc(r.qds.map(d => d.id + (d.direct ? '' : ' (inherited)')).join(', '))}">${r.qds.length} driver${r.qds.length === 1 ? '' : 's'}</i>` : '';
  const adrs = r.adrs.map(id => { const d = LM.A.get(id); return `<button type="button" class="cm-chip lr-w d${d.current ? '' : ' draft'}" data-sel="${esc(id)}" title="${esc(id + ' · ' + d.question + ' · ' + (d.current ? 'accepted' : d.status))}">${esc(id)}</button>`; }).join('');
  return `<span class="lr-l1">${reqs || '<i class="lr-w miss">no requirement</i>'}${qd}</span><span class="lr-l2">${adrs || '<i class="lr-w miss">no decision</i>'}</span>`;
}
function strip(r) {
  const g = ghost(), pro = g && g.layer === 'physical' && g.source === r.id ? `<button type="button" class="cm-chip lr-c proposed" data-l-action="edit-ghost" title="${esc('Proposed · not saved: ' + g.title)}">+ ${esc(g.title)}</button>` : '';
  const cs = r.allocations.filter(a => a.known).map(a => { const c = LM.C.get(a.component); return `<button type="button" class="cm-chip lr-c${a.status === 'reviewed' ? ' reviewed' : ''}${a.current ? '' : ' stale'}" data-sel="${esc(c.id)}" title="${esc(c.ref + ' · ' + c.title + (a.scope ? ' — ' + a.scope : '') + (a.current ? '' : ' · the responsibility changed since this mapping'))}"><b>${esc(c.ref)}</b>${esc(c.title)}</button>`; }).join('');
  return `<div class="lr-strip"><small>realised by</small>${pro}${cs || (pro ? '' : '<em class="miss">no component yet</em>')}</div>`;
}
function stepsTag(r) {
  if (r.offJourney) return '<i class="lr-tag off">off the journey</i>';
  if (r.steps.length > 1) return `<i class="lr-tag" title="${esc('Serves ' + r.steps.map(s => stepOf(s).num + ' ' + stepOf(s).title).join(', '))}">steps ${esc(r.steps.map(s => stepOf(s).num).join(' · '))}</i>`;
  if (!r.steps.length) return `<i class="lr-tag via" title="Serves no step itself; placed with the responsibilities it works with">via flows</i>`;
  return '';
}
function mapHTML(hl) {
  const out = [];
  for (const c of L.cards) {
    const row = c.row, pos = `style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"`;
    // A card is a group of what it carries; its chips are the buttons inside it. Enter or Space on
    // the card selects it, and Enter on the selected card opens it.
    if (row.kind === 'hole') {
      const s = stepOf(row.step);
      out.push(`<div class="lr-card hole${cardCls(hl, row.id)}${S.sel === s.id ? ' sel' : ''}" data-card="${esc(row.id)}" ${pos} tabindex="0" role="group" aria-label="${esc('Nobody owns step ' + s.num + ' ' + s.title)}"><small>Step ${esc(s.num)} · nobody owns it</small><b class="lr-t">${esc(s.title)}</b><div class="lr-lens"><p>${esc(s.description || 'No responsibility serves this journey step.')}</p></div><div class="lr-strip"><button type="button" class="cm-mini gold" data-l-action="new">Add a responsibility</button></div></div>`);
      continue;
    }
    if (row.kind === 'empty') {
      const g = LM.groups.get(row.group);
      out.push(`<div class="lr-card empty${cardCls(hl, row.id)}" data-card="${esc(row.id)}" ${pos} tabindex="0" role="group" aria-label="${esc('Empty group ' + g.title)}"><small>Group · no responsibility yet</small><b class="lr-t">${esc(g.title)}</b><div class="lr-lens"><p>${esc(g.purpose || 'Place a responsibility in this group, or remove it.')}</p></div><div class="lr-strip"><button type="button" class="cm-mini gold" data-l-action="new">Add a responsibility</button></div></div>`);
      continue;
    }
    if (row.kind === 'proposed') {
      const g = logicalGhost(), reqs = row.requirementIds.map(id => `<i class="lr-w">${esc(id)}</i>`).join('');
      out.push(`<div class="lr-card proposed${S.sel === PROPOSED ? ' sel' : ''}${cardCls(hl, row.id)}" data-card="${PROPOSED}" ${pos} tabindex="0" role="group" aria-label="${esc('Proposal, not saved: ' + row.title)}"><small>Proposal · not saved</small><b class="lr-t">${esc(row.title)}</b><div class="lr-lens"><div class="st"><span class="lr-l1"><span class="lr-bd">${esc(g?.boundary || g?.purpose || '')}</span></span><span class="lr-l2"><button type="button" class="cm-mini gold" data-l-action="edit-ghost">Review &amp; edit</button></span></div><div class="fl"><span class="lr-l1">${row.source ? `<i class="lr-x">← <b>${esc(R(row.source)?.ref || '')}</b> ${esc(row.relationship)}</i>` : '<em>linked on review</em>'}</span><span class="lr-l2"><button type="button" class="cm-mini gold" data-l-action="edit-ghost">Review &amp; edit</button></span></div><div class="rs"><span class="lr-l1">${reqs || '<em>requirements on review</em>'}</span><span class="lr-l2"><button type="button" class="cm-mini gold" data-l-action="edit-ghost">Review &amp; edit</button></span></div></div><div class="lr-strip"><small>realised by</small><em>planned in Chapter 5</em></div></div>`);
      continue;
    }
    if (row.kind === 'cell') {
      const rs = row.members.map(R), band = bandInfo(LM, row.band), realised = new Set(rs.flatMap(r => r.realisedBy)), open = rs.filter(r => !r.realisedBy.length).length;
      const ins = LM.flows.filter(f => row.members.includes(f.to) && !row.members.includes(f.from)).length, outs = LM.flows.filter(f => row.members.includes(f.from) && !row.members.includes(f.to)).length;
      const reqs = new Set(rs.flatMap(r => r.reqs)), adrs = new Set(rs.flatMap(r => r.adrs));
      const spans = [...new Set(rs.flatMap(r => r.steps.map(s => stepOf(s).num)))].sort();
      out.push(`<div class="lr-card cell${rs.some(r => marked.has(r.id)) ? ' changed' : ''}${S.sel === row.band ? ' sel' : ''}${cardCls(hl, row.id)}" data-card="${esc(row.id)}" ${pos} tabindex="0" role="group" aria-label="${esc(band.title + ', ' + rs.length + ' responsibilities')}"><small><span class="lr-own">Group · ${rs.length} responsibilit${rs.length === 1 ? 'y' : 'ies'}</span>${spans.length ? `<i class="lr-tag">step${spans.length === 1 ? '' : 's'} ${esc(spans.join(' · '))}</i>` : '<i class="lr-tag off">off the journey</i>'}</small><b class="lr-t">${esc(band.title)}</b><div class="lr-lens"><div class="st"><span class="lr-l1">${rs.map(r => `<button type="button" class="cm-chip lr-rr" data-sel="${esc(r.id)}" title="${esc(r.ref + ' · ' + r.title)}">${esc(r.ref)}</button>`).join('')}</span><span class="lr-l2"><em>${esc(rs.map(r => r.title).join(', '))}</em></span></div><div class="fl"><span class="lr-l1"><em>${ins} flow${ins === 1 ? '' : 's'} in</em></span><span class="lr-l2"><em>${outs} flow${outs === 1 ? '' : 's'} out</em></span></div><div class="rs"><span class="lr-l1"><i class="lr-w">${reqs.size} requirement${reqs.size === 1 ? '' : 's'}</i></span><span class="lr-l2">${adrs.size ? `<i class="lr-w d">${adrs.size} decision${adrs.size === 1 ? '' : 's'}</i>` : '<i class="lr-w miss">no decision</i>'}</span></div></div><div class="lr-strip"><small>realised by</small><em${open ? ' class="miss"' : ''}>${realised.size} component${realised.size === 1 ? '' : 's'}${open ? ` · ${open} not realised` : ''}</em></div></div>`);
      continue;
    }
    const r = R(row.id), st = rState(r);
    out.push(`<div class="lr-card resp${marked.has(r.id) ? ' changed' : ''}${row.ctx ? ' ctx' : ''}${row.subject ? ' subject' : ''}${S.sel === r.id ? ' sel' : ''}${cardCls(hl, row.id)}" data-card="${esc(r.id)}" ${pos} tabindex="0" role="group" aria-label="${esc('Responsibility ' + r.ref + ' ' + r.title + (S.sel === r.id ? '. Selected; press Enter to focus on it' : '. Press Enter to select it'))}"><small><b class="lr-ref">${esc(r.ref)}</b><span class="lr-own">${esc(r.owner || 'owner not named')}</span>${stepsTag(r)}<i class="lr-st ${st}">${STATE[st]}</i></small><b class="lr-t">${esc(r.title)}</b><div class="lr-lens"><div class="st">${structureLines(r)}</div><div class="fl">${flowLines(r)}</div><div class="rs">${reasonLines(r)}</div></div>${strip(r)}</div>`);
  }
  for (const lb of L.labels) {
    const l = lb.link, lit = hl.links.has(l.id), cls = `lr-label${l.proposed ? ' proposed' : ''}${lit ? ' lit' : hl.stops.has(l.id) ? ' stop' : hl.on ? ' dim' : ''}${l.dim ? ' out' : ''}`, pos = `style="left:${lb.x}px;top:${lb.y}px;width:${lb.w}px;height:${lb.h}px"`;
    if (lb.compact) { out.push(`<button type="button" class="${cls} compact" data-link="${esc(l.id)}" ${pos} aria-label="${esc(l.label)}"><span class="lr-l1"><b>${esc(l.ref)}</b></span></button>`); continue; }
    if (l.proposed) { out.push(`<button type="button" class="${cls}" data-l-action="edit-ghost" ${pos}><span class="lr-l1">${esc(l.label)}</span><span class="lr-l2 st fl rs"><em>proposed · not saved</em></span></button>`); continue; }
    const fs = l.flows.map(flowOf);
    const st = l.carriedBy.length ? l.carriedBy.map(i => `<i class="lr-ci">${esc(i)}</i>`).join('') : fs.every(f => f.inside) ? '<em>inside one component</em>' : l.realised ? '<em class="miss">no interaction carries it</em>' : '<em>ends not yet realised</em>';
    const fl = `${fs.every(f => f.kind === 'trace') ? '<em>relates</em>' : ''}${l.scenarios.length ? `<i class="lr-sc" title="${esc(l.scenarios.map(id => LM.scenarios.find(x => x.id === id)?.title).join(', '))}">${l.scenarios.length} journey${l.scenarios.length === 1 ? '' : 's'}</i>` : '<em>in no journey</em>'}`;
    const conds = fs.filter(f => f.condition);
    const rs = conds.length ? `<i class="lr-if" title="${esc(conds.map(f => f.condition).join(' · '))}">only if</i><em class="lr-cond">${esc(conds[0].condition)}</em>` : '<em>no condition recorded</em>';
    out.push(`<button type="button" class="${cls}" data-link="${esc(l.id)}" ${pos}><span class="lr-l1">${l.ref ? `<b>${esc(l.ref)}</b>` : ''}${esc(l.label)}${l.conditional ? '<i class="lr-dia" title="Carries a condition">◇</i>' : ''}</span><span class="lr-l2 st">${st}</span><span class="lr-l2 fl">${fl}</span><span class="lr-l2 rs">${rs}</span></button>`);
  }
  return out.join('');
}
function mapHeads(hl) {
  const box = root.querySelector('.cm-heads-in'), out = [], walk = S.walk >= 0 ? scenario() : null, ws = walk ? walkSteps() : [];
  const on = new Set(ws.map(w => w.step)), done = (walk && visited.get(visitKey(walk))) || new Set();
  for (const ln of L.lanes) {
    const s = ln.step ? stepOf(ln.step) : null;
    const w = walk ? (hl.now === ln.step ? ' now' : on.has(ln.step) ? (done.has(LM.steps.indexOf(s)) ? ' done' : ' on') : ' out') : '';
    const cls = `lr-sh ${ln.kind}${ln.hole ? ' hole' : ''}${w}${!walk && S.sel && S.sel === ln.step ? ' sel' : !walk && hl.steps.has(ln.step) ? ' lit' : ''}`;
    out.push(`<button type="button" class="${cls}" ${s ? `data-lane="${esc(s.id)}"` : 'data-lane="across"'} style="left:${ln.x + 4}px;width:${ln.w - 8}px;top:8px;height:${RX.HEAD_H - 8}px"><small>${ln.kind === 'across' ? 'Not on the journey' : 'Step ' + esc(ln.num)}${s?.ref ? ' · ' + esc(s.ref) : ''}</small><b>${esc(ln.title)}</b><span>${ln.kind === 'across' ? esc(ln.sub) : ln.hole ? 'nobody owns it' : esc(ln.sub)}</span></button>`);
  }
  box.innerHTML = out.join('');
  box.style.width = L.W + 'px';
}
function mapRail(hl) {
  const box = root.querySelector('.cm-rail-in');
  box.innerHTML = L.bands.map(b => {
    const info = bandInfo(LM, b.id), n = info.kind === 'unowned' ? LM.steps.filter(s => s.hole).length : [...LM.R.values()].filter(r => r.group === b.id).length;
    return `<button type="button" class="lr-bt ${info.kind}${S.sel === b.id ? ' sel' : hl.bands.has(b.id) ? ' lit' : ''}" data-band="${esc(b.id)}" style="top:${b.y + 3}px;height:${b.h - 6}px" title="${esc(info.title + (info.sub ? ' — ' + info.sub : ''))}"><small>${info.kind === 'unowned' ? n + ' step' + (n === 1 ? '' : 's') : info.kind === 'ungrouped' ? n + ' ungrouped' : 'Group · ' + n + ' responsibilit' + (n === 1 ? 'y' : 'ies')}</small><b>${esc(info.title)}</b><span>${esc(info.sub)}</span></button>`;
  }).join('');
  box.style.height = L.H + 'px'; box.style.width = L.rail + 'px';
}

// ---------------------------------------------------------------- coverage

const MARK = {linked: 'Covers it', proposed: 'Would cover it once the proposal is accepted', direct: 'Carries it by name', inherited: 'Inherits it through a requirement or decision', accepted: 'Linked · the decision is accepted', draft: 'Linked · the decision is still a draft', considered: 'An alternative of this decision names it, but the link is not recorded'};
function matrixSVG(hl) {
  const out = [];
  for (const g of L.groups) out.push(`<rect class="lr-mgroup" x="${L.rail}" y="${g.y}" width="${L.W - L.rail - 8}" height="${g.h}"/>`);
  L.rows.forEach((r, i) => out.push(`<rect class="lr-mrow${i % 2 ? ' odd' : ''}${hl.rows.has(r.id) ? ' lit' : ''}" x="${L.rail}" y="${r.y}" width="${L.W - L.rail - 8}" height="${r.h}"/>`));
  for (const c of L.cols) if (c.col.proposed) out.push(`<rect class="lr-mghost" x="${c.x + 2}" y="${L.top}" width="${c.w - 4}" height="${L.H - L.top - 16}" rx="8"/>`);
  for (const c of L.cols) out.push(`<line class="lr-mcol${hl.resp.has(c.id) ? ' lit' : ''}" x1="${c.x + c.w}" x2="${c.x + c.w}" y1="${L.top}" y2="${L.H - 16}"/>`);
  return out.join('');
}
function covHL() {
  // In the matrix a responsibility lights its column and the reasons it carries; a reason lights
  // its row and the responsibilities that carry it.
  const out = {on: !!S.sel, resp: new Set(), rows: new Set()};
  if (!S.sel) return out;
  if (R(S.sel) || S.sel === PROPOSED) { out.resp.add(S.sel); for (const c of G.cells) if (c.col === S.sel) out.rows.add(c.row); }
  else if (G.rows.some(r => r.id === S.sel)) { out.rows.add(S.sel); for (const c of G.cells) if (c.row === S.sel) out.resp.add(c.col); }
  else { const c = concerns(S.sel); c.resp.forEach(x => out.resp.add(x)); for (const x of G.cells) if (out.resp.has(x.col)) out.rows.add(x.row); }
  return out;
}
function matrixHTML() {
  const out = [], hl = covHL(), g = logicalGhost();
  for (const gr of L.groups) out.push(`<div class="lr-mg" style="left:${L.rail + 10}px;top:${gr.y + 6}px">${esc(gr.title)}</div>`);
  const has = new Set(G.cells.map(c => c.row + '|' + c.col));
  for (const c of L.cells) {
    const col = L.cols.find(k => k.id === c.col).col, row = G.rows.find(x => x.id === c.row), lit = hl.resp.has(c.col) || hl.rows.has(c.row);
    const tip = `${col.proposed ? 'The proposal' : col.ref + ' ' + col.title} · ${row.ref} ${row.title}: ${MARK[c.mark]}${c.chosen ? ' · named by the chosen alternative' : ''}`;
    out.push(`<button type="button" class="lr-cell ${c.mark}${c.chosen ? ' chosen' : ''}${hl.on ? (lit ? ' lit' : ' dim') : ''}" ${col.proposed ? 'data-l-action="edit-ghost"' : c.mark === 'considered' ? `data-lr="link" data-row="${esc(c.row)}" data-col="${esc(c.col)}"` : `data-sel="${esc(c.col)}"`} style="left:${c.x - 12}px;top:${c.y - 12}px" title="${esc(tip + (c.mark === 'considered' ? ' — click to record the link in the Chapter 4 editor' : ''))}" aria-label="${esc(tip)}"></button>`);
  }
  // Selecting a responsibility or a requirement or decision offers the missing links, each
  // through the Chapter 4 responsibility editor.
  const addable = r => r.kind === 'req' || r.kind === 'adr';
  const plus = (row, col) => { const k = L.cols.find(x => x.id === col), r = L.rows.find(x => x.id === row); return `<button type="button" class="lr-plus" data-lr="link" data-row="${esc(row)}" data-col="${esc(col)}" style="left:${k.x + k.w / 2 - 11}px;top:${r.y + r.h / 2 - 11}px" title="${esc('Link ' + row + ' to ' + (R(col)?.ref || col) + ' — opens the Chapter 4 editor')}" aria-label="${esc('Link ' + row + ' to ' + (R(col)?.ref || col))}">+</button>`; };
  if (S.sel && R(S.sel) && L.cols.some(k => k.id === S.sel)) for (const r of G.rows) if (addable(r) && !has.has(r.id + '|' + S.sel)) out.push(plus(r.id, S.sel));
  const selRow = G.rows.find(r => r.id === S.sel);
  if (selRow && addable(selRow)) for (const k of L.cols) if (!k.col.proposed && !has.has(selRow.id + '|' + k.id)) out.push(plus(selRow.id, k.id));
  for (const row of L.rows) {
    const r = row.row, lit = hl.rows.has(r.id), pos = `left:${L.sumX}px;width:${CX.SUM_W}px;top:${row.y + 5}px;height:${row.h - 10}px`;
    const covers = r.covers.map(id => R(id)).filter(Boolean);
    const ghostCovers = g && r.kind === 'req' && (g.requirementIds || []).includes(r.id);
    const head = r.kind === 'req' ? (covers.length ? 'Covered' : ghostCovers ? 'Covered once accepted' : 'Not covered') : r.kind === 'qd' ? (LM.D.get(r.id).direct.length ? 'Carried by name' : covers.length ? 'Only inherited' : 'Carried by nothing') : r.state === 'open' ? 'Affects nothing yet' : r.state === 'draft' ? 'Draft' : 'Accepted';
    const act = r.kind === 'req' && !covers.length && !ghostCovers ? `<button type="button" class="cm-mini gold" data-l-action="new-from-requirement" data-l-id="${esc(r.id)}">Create a responsibility</button>` : '';
    const st = covers.length ? covers.map(x => `${x.ref}${x.realisedBy.length ? ' → ' + x.realisedBy.map(c => LM.C.get(c)?.ref || c).join('/') : ' → no component'}`).join(' · ') : ghostCovers ? 'the proposal ' + (g.title || '') : 'nothing covers it';
    const steps = [...new Set(covers.flatMap(x => x.steps.map(s => stepOf(s).num)))], journeys = [...new Set(covers.flatMap(x => x.scenarios))];
    const fl = covers.length ? (steps.length ? 'at step ' + steps.join(', ') : 'off the journey') + (journeys.length ? ` · in ${journeys.length} journey${journeys.length === 1 ? '' : 's'}` : '') : '—';
    const d = r.kind === 'qd' ? LM.D.get(r.id) : r.kind === 'adr' ? LM.A.get(r.id) : LM.Q.get(r.id);
    const rs = r.kind === 'req' ? [d.priority, d.owner].filter(Boolean).join(' · ') : r.kind === 'qd' ? [d.priority, d.target].filter(Boolean).join(' · ') : [d.label, d.chosenTitle ? 'chose: ' + d.chosenTitle : 'no alternative chosen'].filter(Boolean).join(' · ');
    const state = r.kind === 'req' ? (covers.length ? 'ok' : ghostCovers ? 'closes' : 'open') : r.kind === 'qd' ? (LM.D.get(r.id).direct.length ? 'ok' : covers.length ? 'partial' : 'open') : r.state === 'covered' ? 'ok' : r.state === 'draft' ? 'partial' : 'open';
    out.push(`<div class="lr-sum ${state}${hl.on ? (lit ? ' lit' : ' dim') : ''}" style="${pos}"><div class="lr-s1"><b>${esc(head)}</b>${act}</div><small class="st">${esc(st)}</small><small class="fl">${esc(fl)}</small><small class="rs">${esc(rs || '—')}</small></div>`);
  }
  return out.join('');
}
function matrixHeads() {
  const box = root.querySelector('.cm-heads-in'), out = [], hl = covHL();
  for (const b of L.colGroups) { const info = bandInfo(LM, b.group); out.push(`<div class="lr-cband ${info.kind}" style="left:${b.x + 3}px;width:${b.w - 6}px;top:6px;height:${CX.BAND - 4}px" title="${esc(info.title)}">${esc(info.title)}</div>`); }
  for (const c of L.cols) {
    const k = c.col, pos = `style="left:${c.x + 3}px;width:${c.w - 6}px;top:${CX.BAND + 6}px;height:${CX.HEAD_H - CX.BAND - 6}px"`;
    if (k.proposed) { out.push(`<button type="button" class="lr-ch proposed" data-l-action="edit-ghost" ${pos} title="${esc(k.title + ' — not saved. Review and edit before accepting.')}"><small>Proposal</small><b>${esc(k.title)}</b><span>Review &amp; edit</span></button>`); continue; }
    const r = R(k.id);
    out.push(`<button type="button" class="lr-ch${marked.has(k.id) ? ' changed' : ''}${S.sel === k.id ? ' sel' : hl.resp.has(k.id) ? ' lit' : hl.on ? ' dim' : ''}${k.noReq ? ' open' : ''}" data-sel="${esc(k.id)}" ${pos} title="${esc(r.ref + ' · ' + r.title + (r.purpose ? ' — ' + r.purpose : ''))}"><small>${esc(r.ref)}</small><b>${esc(r.title)}</b><span class="${k.noReq ? 'miss' : k.noAdr ? 'warn' : ''}" title="${esc(k.counts[0] + ' requirements · ' + k.counts[1] + ' quality drivers · ' + k.counts[2] + ' decisions')}">${k.noReq ? 'no requirement' : k.noAdr ? 'no decision' : `<i class="c-r">${k.counts[0]}</i><i class="c-q">${k.counts[1]}</i><i class="c-d">${k.counts[2]}</i>`}</span></button>`);
  }
  out.push(`<div class="lr-th" style="left:${L.sumX}px;width:${CX.SUM_W}px;top:${CX.BAND + 6}px"><b>Covered by</b><small class="st">the responsibility, and what realises it</small><small class="fl">where in the journey it is exercised</small><small class="rs">the reason's own terms</small></div>`);
  box.innerHTML = out.join('');
  box.style.width = L.W + 'px';
}
function matrixRail() {
  const box = root.querySelector('.cm-rail-in'), hl = covHL();
  box.innerHTML = L.rows.map(row => { const r = row.row, lit = hl.rows.has(r.id); return `<button type="button" title="${esc(r.ref + ' · ' + r.title)}" class="lr-trow ${r.kind} ${r.state}${S.sel === r.id ? ' sel' : hl.on ? (lit ? ' lit' : ' dim') : ''}" data-sel="${esc(r.id)}" style="top:${row.y + 4}px;height:${row.h - 8}px"><b>${esc(r.ref)}</b><span>${esc(r.title)}</span></button>`; }).join('');
  box.style.height = L.H + 'px'; box.style.width = L.rail + 'px';
}

// ---------------------------------------------------------------- chrome

function crumbs() {
  const sc = scope(), parts = [`<button type="button" data-lr="scope" data-kind="system" class="${sc.kind === 'system' ? 'here' : ''}">Whole journey</button>`];
  if (sc.kind !== 'system') {
    const grp = sc.kind === 'group' ? sc.id : R(sc.id)?.group;
    if (grp) parts.push('<span>›</span>', `<button type="button" data-lr="scope" data-kind="group" data-id="${esc(grp)}" class="${sc.kind === 'group' ? 'here' : ''}">${esc(bandInfo(LM, grp).title)}</button>`);
    if (sc.kind === 'part') parts.push('<span>›</span>', `<button type="button" class="here" data-lr="noop">${esc(titleOf(sc.id))}</button>`);
  }
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
  root.querySelector('.cm-lenses').innerHTML = LENSES.map(l => `<button type="button" class="cm-lens" data-lr="lens" data-id="${l.id}" aria-pressed="${S.lens === l.id}" title="${esc(l.q + ' Like the ' + l.like + '.')}">${icon(l.id)}<span>${l.label}</span></button>`).join('');
  const dp = depth();
  // One group folds to nothing: the control appears once there is something to fold.
  root.querySelector('.cm-depth').innerHTML = !covView() && sc.kind === 'system' && LM.groups.size > 1 ? `<span>Elements</span>${[['groups', 'Groups'], ['responsibilities', 'Responsibilities']].map(([id, t]) => `<button type="button" class="cm-dep" data-lr="depth" data-id="${id}" aria-pressed="${dp === id}">${t}</button>`).join('')}` : '';
  const scn = root.querySelector('.cm-scn'), sel = scn.querySelector('select');
  scn.hidden = covView() || !LM.scenarios.length || !LM.steps.length;
  sel.innerHTML = LM.scenarios.map(s => `<option value="${esc(s.id)}"${s.id === scenario()?.id ? ' selected' : ''}>${esc(s.title)}${s.reviewed ? ' ✓' : ''}</option>`).join('');
  const rs = [...LM.R.values()], holes = LM.steps.filter(s => s.hole).length, uncarried = LM.flows.filter(f => f.realised && !f.carried).length;
  if (covView()) { const reqs = G.rows.filter(r => r.kind === 'req'), qd = G.rows.filter(r => r.kind === 'qd'), adr = G.rows.filter(r => r.kind === 'adr'); setState(root, `${reqs.length} requirement${reqs.length === 1 ? '' : 's'} · ${reqs.filter(r => r.state === 'open').length} not covered · ${qd.length} quality driver${qd.length === 1 ? '' : 's'} · ${adr.length} decision${adr.length === 1 ? '' : 's'} (${adr.filter(r => r.state === 'draft').length} draft${adr.filter(r => r.state === 'draft').length === 1 ? '' : 's'})`); }
  else if (!rs.length) setState(root, LM.steps.length ? `No responsibility recorded yet · ${LM.steps.length} journey step${LM.steps.length === 1 ? '' : 's'} waiting for an owner` : 'No responsibility recorded yet');
  else setState(root, `${rs.length} responsibilit${rs.length === 1 ? 'y' : 'ies'} in ${LM.groups.size} group${LM.groups.size === 1 ? '' : 's'} · ${LM.steps.length} journey step${LM.steps.length === 1 ? '' : 's'} · ${holes} unowned · ${LM.flows.length} logical flow${LM.flows.length === 1 ? '' : 's'} · ${uncarried} not carried`);
  const g = ghost(), imp = pending();
  root.querySelector('.cm-banner').innerHTML = imp ? imp.banner() : g ? `<section class="dp-banner"><span class="ip-kicker">${g.layer === 'logical' ? 'Responsibility' : g.layer === 'data' ? 'Data' : 'Component'} proposal · not saved</span><b>${esc(g.title)}</b><small>${esc(g.effect || '')}</small><button type="button" class="cm-btn gold" data-l-action="edit-ghost">Review &amp; edit</button><button type="button" class="cm-btn" data-l-action="dismiss-ghost">Dismiss</button></section>` : '';
  const sr = S.sel && R(S.sel) ? R(S.sel) : null;
  root.querySelector('.lr-addmenu').innerHTML = `<button type="button" data-l-action="new">New responsibility</button><button type="button" data-l-action="new-group">New responsibility group</button>${sr ? `<button type="button" data-l-action="connect" data-l-id="${esc(sr.id)}">Connect ${esc(sr.ref)} to…</button><button type="button" data-l-action="map" data-l-id="${esc(sr.id)}">Link ${esc(sr.ref)} to a component</button>` : '<p>Select a responsibility to connect it or link it to the component that realises it.</p>'}`;
  root.querySelector('.cm-legend').innerHTML = covView()
    ? `<p><i class="k-cell linked"></i>Covers the requirement</p><p><i class="k-cell direct"></i>Carries the quality driver by name</p><p><i class="k-cell inherited"></i>Inherits it through a requirement or decision</p><p><i class="k-cell accepted"></i>Decision linked and accepted</p><p><i class="k-cell draft"></i>Decision linked, still a draft</p><p><i class="k-cell considered"></i>An alternative names it; no link recorded</p><p><i class="k-cell chosen"></i>Named by the chosen alternative</p><p><i class="k-cell proposed"></i>Would cover it once the proposal is accepted</p><p><i class="k-plus">+</i>A link to record, from the selection</p>`
    : `<p><span class="k-card"></span>Responsibility, at the journey step it serves</p><p><span class="k-band"></span>Responsibility group</p><p><span class="k-band unowned"></span>Steps nobody owns</p><p><svg width="40" height="10"><line x1="2" y1="5" x2="32" y2="5" stroke="#286954" stroke-width="1.8" marker-end="url(#lr-a-n)"/></svg>Hands work on</p><p><svg width="40" height="10"><line x1="2" y1="5" x2="32" y2="5" stroke="#7d8b78" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#lr-a-t)"/></svg>Relates to</p><p><svg width="40" height="10"><line x1="2" y1="5" x2="32" y2="5" stroke="#b5832f" stroke-width="2.1" marker-end="url(#lr-a-w)"/></svg>Flow no Chapter 5 interaction carries (Structure lens)</p><p><i class="lr-dia">◇</i>Carries a condition</p><h5>On a card</h5><p><i class="cm-d lr-o k">data</i>Data it owns · <i class="lr-f k">interface</i>exposed · <i class="lr-g k">control</i>protected by (Structure)</p><p><i class="lr-x k">← LR</i>Where its work comes from and goes (Flow)</p><p><i class="lr-w k">REQ</i><i class="lr-w d k">ADR</i>Requirement and decision behind it; dashed, a draft (Reasoning)</p><p><i class="lr-c k"><b>APP</b>component</i>Realises it (Chapter 5)</p><h5>States</h5><p><span class="k-hole"></span>Journey step nobody owns</p><p><span class="k-card proposed"></span>Proposed, not saved</p><p><span class="k-card changed"></span>Changed by the open proposal</p>`;
}

// ---------------------------------------------------------------- companion

const act = (a, attrs, label, cls = '') => `<button type="button" class="cm-btn ${cls}" data-l-action="${a}" ${attrs}>${label}</button>`;
const link = id => `<button type="button" class="cm-link" data-sel="${esc(id)}">${esc(refTitle(id))}</button>`;
// Sol's assessment sits in the companion's own Sol section (chapter-sol.js); "More with Sol" opens Sol's panel.
const brain = () => '';
function proposeButtons(ids) { const g = ghost(); return LM.proposals.filter(q => !q.existingId && ids.includes(q.source)).map(q => g?.key === q.key ? '' : `<button type="button" class="cm-btn gold" data-l-action="preview" data-l-key="${esc(q.key)}">Propose ${esc(q.title.toLowerCase())}</button>`).join(''); }
function specimenResponsibility(id) {
  const r = R(id), st = rState(r), flow = fid => flowOf(fid);
  const own = r.context.filter(c => c.layer === 'data'), other = r.context.filter(c => c.layer !== 'data');
  const by = r.allocations.map(a => `<button type="button" class="cm-link" data-sel="${esc(a.component)}">${esc(a.known ? refTitle(a.component) : a.component)}${a.scope ? `<small>${esc(a.scope)}</small>` : '<i> · no scope</i>'}${a.current ? '' : '<i> · responsibility changed since</i>'}${a.status === 'reviewed' ? '' : ' · <em>candidate</em>'}</button>`).join('') || '<em>No component yet</em>';
  const dec = r.adrs.map(x => { const d = LM.A.get(x); return `<button type="button" class="cm-link" data-sel="${esc(x)}">${esc(x)} · ${esc(d.question)}${d.current ? '' : '<em> · ' + esc(d.status) + '</em>'}</button>`; }).join('');
  const stepsL = r.steps.map(s => link(s)).join('') || `<em>${r.offJourney ? 'None — off the journey' : 'None itself; works with step ' + esc(LM.steps[r.stage]?.num || '') + ' through its flows'}</em>`;
  const journeys = r.scenarios.map(s => LM.scenarios.find(x => x.id === s)?.title).filter(Boolean);
  return `<section class="cm-spec"><h4>Responsibility · ${esc(r.ref)}<span class="${st === 'reviewed' ? 'guarded' : st === 'changed' || st === 'incomplete' ? 'exposed' : ''}">${STATE[st]}</span></h4><p class="cm-spec-t"><b>${esc(r.title)}</b></p>${r.purpose ? `<p>${esc(r.purpose)}</p>` : ''}<dl class="cm-dl"><div><dt>Group</dt><dd>${link(r.group)}</dd></div><div class="${r.steps.length ? '' : 'miss'}"><dt>Serves</dt><dd>${stepsL}</dd></div><div class="${r.boundary ? '' : 'miss'}"><dt>Owns</dt><dd>${esc(r.boundary || 'Boundary not recorded')}${own.length ? '<br>' + own.map(c => link(c.object)).join('') : ''}</dd></div>${other.length ? `<div><dt>Touches</dt><dd>${other.map(c => `<button type="button" class="cm-link" data-sel="${esc(c.object)}">${esc(c.outward ? c.label + ' ' : '')}${esc(c.title)}${c.outward ? '' : ' <small>' + esc(c.label) + ' it</small>'}</button>`).join('')}</dd></div>` : ''}<div><dt>Takes over from</dt><dd>${r.in.map(f => `<button type="button" class="cm-link" data-sel="${esc(f)}">← ${esc(refTitle(flow(f).from))} · ${esc(flow(f).label)}</button>`).join('') || '<em>Nothing</em>'}</dd></div><div><dt>Hands on to</dt><dd>${r.out.map(f => `<button type="button" class="cm-link" data-sel="${esc(f)}">→ ${esc(refTitle(flow(f).to))} · ${esc(flow(f).label)}${flow(f).condition ? '<em> · on a condition</em>' : ''}</button>`).join('') || '<em>Nothing</em>'}</dd></div><div class="${r.reqs.length ? '' : 'miss'}"><dt>Covers</dt><dd>${r.reqs.map(link).join('') || 'No requirement'}</dd></div><div><dt>Quality</dt><dd>${r.qds.map(d => `<button type="button" class="cm-link" data-sel="${esc(d.id)}">${esc(d.id)} · ${esc(LM.D.get(d.id).title)}${d.direct ? '' : '<small>inherited</small>'}</button>`).join('') || '<em>No quality driver</em>'}</dd></div><div class="${r.adrs.length ? '' : 'miss'}"><dt>Decided by</dt><dd>${dec || 'No decision linked'}</dd></div><div class="${r.realisedBy.length ? '' : 'miss'}"><dt>Realised by</dt><dd>${by}</dd></div>${journeys.length ? `<div><dt>Journeys</dt><dd>${esc(journeys.join(', '))}</dd></div>` : ''}<div><dt>Owner</dt><dd>${esc(r.owner || 'Not named')}</dd></div></dl>
  ${marked.has(id) && pending() ? `<div class="cm-note gold">${pending().objectContext({id, ref: r.ref, title: r.title})}</div>` : ''}
  <div class="cm-acts">${act('edit', `data-l-id="${esc(id)}"`, icon('edit') + 'Edit responsibility', 'primary')}${act('connect', `data-l-id="${esc(id)}"`, icon('link') + 'Connect')}${r.allocations.length ? act('edit-mapping', `data-l-id="${esc(r.allocations[0].id)}"`, 'Implementation link') : act('map', `data-l-id="${esc(id)}"`, 'Link a component')}${proposeButtons([id])}<button type="button" class="cm-btn" data-lr="dissect" data-id="${esc(id)}">${icon('dissect')}Focus on it</button>${r.realisedBy.length ? `<a class="cm-btn" href="${esc(projectURL('/?chapter=5&tab=model&object=' + encodeURIComponent(r.realisedBy[0])))}">${icon('layers')}Inside its component</a>` : ''}${brain()}<button type="button" class="cm-btn" data-brain-launch="mind">${icon('mind')}Mind Factory</button><a class="cm-btn" href="${esc(projectURL('/?chapter=4&tab=work&object=' + encodeURIComponent(id)))}">Open in Work</a></div></section>`;
}
function specimenFlow(id) {
  const f = flowOf(id), js = f.scenarios.map(s => LM.scenarios.find(x => x.id === s)?.title).filter(Boolean);
  return `<section class="cm-spec"><h4>Logical flow · ${esc(f.id)}<span class="${f.realised && !f.carried ? 'exposed' : f.carried ? 'guarded' : ''}">${f.carried ? 'Carried' : f.realised ? 'Not carried' : 'Ends not realised'}</span></h4><p class="cm-spec-t"><b>${esc(R(f.from).title)} → ${esc(R(f.to).title)}</b></p><p>${esc(describeFlow(LM, id))}</p><dl class="cm-dl"><div><dt>Meaning</dt><dd>${esc(f.label || 'Not described')} · ${f.kind === 'flow' ? 'hands work on' : 'relates'}</dd></div><div class="${f.condition ? '' : 'none'}"><dt>Condition</dt><dd>${esc(f.condition || 'None recorded')}</dd></div><div><dt>Journeys</dt><dd>${esc(js.join(', ') || 'None passes along it')}</dd></div><div class="${f.realised && !f.carried ? 'miss' : ''}"><dt>Carried by</dt><dd>${f.carriedBy.map(i => `<a class="cm-link" href="${esc(projectURL('/?chapter=5&tab=model&object=' + encodeURIComponent(i)))}">${esc(i)} in Chapter 5</a>`).join('') || esc(f.inside ? 'Inside one component' : f.realised ? 'No interaction yet' : 'Its ends are not both realised')}</dd></div></dl>
  <div class="cm-acts">${act('edit-connection', `data-l-id="${esc(id)}"`, icon('edit') + 'Edit flow', 'primary')}${brain()}</div></section>`;
}
function specimenStep(id) {
  const s = stepOf(id), js = LM.scenarios.filter(x => x.steps.includes(s.index)).map(x => x.title);
  return `<section class="cm-spec"><h4>Journey step · ${esc(s.num)}${s.hole ? '<span class="exposed">Nobody owns it</span>' : ''}</h4><p class="cm-spec-t"><b>${esc(s.title)}</b></p>${s.description ? `<p>${esc(s.description)}</p>` : ''}<dl class="cm-dl"><div class="${s.hole ? 'miss' : ''}"><dt>Served by</dt><dd>${s.served.map(link).join('') || 'No responsibility'}</dd></div><div><dt>Journeys</dt><dd>${esc(js.join(', ') || 'None')}</dd></div></dl><div class="cm-acts">${s.hole ? act('new', '', icon('plus') + 'Add a responsibility', 'primary') : ''}<a class="cm-btn" href="${esc(projectURL('/?chapter=1&tab=work'))}">The journey is defined in Chapter 1</a>${brain()}</div></section>`;
}
function specimenGroup(id) {
  const info = bandInfo(LM, id), rs = [...LM.R.values()].filter(r => r.group === id), ids = new Set(rs.map(r => r.id));
  const edge = LM.flows.filter(f => ids.has(f.from) !== ids.has(f.to));
  const steps = [...new Set(rs.flatMap(r => r.steps))].map(s => stepOf(s));
  return `<section class="cm-spec"><h4>${info.kind === 'group' ? 'Responsibility group' : 'Not in a group'}</h4><p class="cm-spec-t"><b>${esc(info.title)}</b></p>${info.sub ? `<p>${esc(info.sub)}</p>` : ''}<dl class="cm-dl"><div><dt>Responsibilities</dt><dd>${rs.map(r => link(r.id)).join('') || '<em>None yet</em>'}</dd></div><div><dt>Steps</dt><dd>${esc(steps.map(s => s.num + ' ' + s.title).join(', ') || 'None')}</dd></div><div><dt>Across its edge</dt><dd>${edge.map(f => `<button type="button" class="cm-link" data-sel="${esc(f.id)}">${esc(R(f.from).ref)} → ${esc(R(f.to).ref)} · ${esc(f.label)}</button>`).join('') || '<em>No flow</em>'}</dd></div></dl><div class="cm-acts">${info.kind === 'group' ? act('edit-group', `data-l-id="${esc(id)}"`, icon('edit') + 'Edit group', 'primary') : ''}<button type="button" class="cm-btn" data-lr="scope-group" data-id="${esc(id)}">${icon('dissect')}Open this group</button>${brain()}</div></section>`;
}
function specimenReason(id) {
  if (LM.Q.has(id)) { const q = LM.Q.get(id); return `<section class="cm-spec"><h4>Requirement · Chapter 1${q.covers.length ? '' : '<span class="exposed">Not covered</span>'}</h4><p class="cm-spec-t"><b>${esc(q.id)} · ${esc(q.title)}</b></p>${q.description ? `<p>${esc(q.description)}</p>` : ''}<dl class="cm-dl"><div class="${q.covers.length ? '' : 'miss'}"><dt>Covered by</dt><dd>${q.covers.map(link).join('') || 'No responsibility'}</dd></div><div><dt>Priority</dt><dd>${esc(q.priority || '—')}</dd></div><div><dt>Owner</dt><dd>${esc(q.owner || '—')}</dd></div></dl><div class="cm-acts">${q.covers.length ? '' : act('new-from-requirement', `data-l-id="${esc(id)}"`, icon('plus') + 'Create a responsibility for it', 'primary')}<a class="cm-btn" href="${esc(projectURL('/?chapter=1&tab=work&artefact=' + encodeURIComponent(id)))}">Open in Chapter 1</a>${brain()}</div></section>`; }
  if (LM.D.has(id)) { const d = LM.D.get(id); return `<section class="cm-spec"><h4>Quality driver · Chapter 2</h4><p class="cm-spec-t"><b>${esc(d.id)} · ${esc(d.title)}</b></p>${d.response ? `<p>${esc(d.response)}</p>` : ''}<dl class="cm-dl"><div class="${d.direct.length ? '' : 'miss'}"><dt>By name</dt><dd>${d.direct.map(link).join('') || 'No responsibility'}</dd></div><div><dt>Inherited</dt><dd>${d.via.map(link).join('') || '<em>None</em>'}</dd></div><div><dt>Target</dt><dd>${esc(d.target || '—')}</dd></div><div><dt>Priority</dt><dd>${esc(d.priority || '—')}</dd></div></dl><div class="cm-acts"><a class="cm-btn" href="${esc(projectURL('/?chapter=2&tab=work&driver=' + encodeURIComponent(id)))}">Open in Chapter 2</a>${brain()}</div></section>`; }
  const d = LM.A.get(id), others = d.considered.filter(x => !d.linked.includes(x) && R(x));
  return `<section class="cm-spec"><h4>Decision · Chapter 3<span class="${d.current ? 'guarded' : ''}">${esc(d.current ? 'Accepted' : d.status)}</span></h4><p class="cm-spec-t"><b>${esc(d.id)} · ${esc(d.question)}</b></p><dl class="cm-dl"><div><dt>Linked to</dt><dd>${d.linked.map(link).join('') || '<em>No responsibility</em>'}</dd></div>${others.length ? `<div><dt>Also named by</dt><dd>${others.map(link).join('')}</dd></div>` : ''}<div class="${d.chosenTitle ? '' : 'none'}"><dt>Chosen</dt><dd>${esc(d.chosenTitle || 'No alternative chosen yet')}</dd></div><div><dt>Governance</dt><dd>${esc(d.label || '—')}</dd></div></dl><div class="cm-acts"><a class="cm-btn" href="${esc(projectURL('/?chapter=3&tab=work&decision=' + encodeURIComponent(id)))}">Open in Chapter 3</a>${brain()}</div></section>`;
}
function specimenOther(id) {
  const c = LM.C.get(id), o = LM.O.get(id), rs = [...LM.R.values()].filter(r => r.realisedBy.includes(id) || r.context.some(x => x.object === id));
  const layer = c ? 'physical' : o?.layer || 'other', ch = CH[layer];
  return `<section class="cm-spec"><h4>${esc(LAYER[layer] || 'Object')}</h4><p class="cm-spec-t"><b>${esc(refTitle(id))}</b></p><dl class="cm-dl"><div><dt>${c ? 'Realises' : 'Linked to'}</dt><dd>${rs.map(r => link(r.id)).join('') || '<em>No responsibility</em>'}</dd></div>${c ? `<div><dt>State</dt><dd>${esc(c.status || '—')}</dd></div>` : ''}</dl><div class="cm-acts">${ch ? `<a class="cm-btn" href="${esc(projectURL('/?chapter=' + ch + '&tab=' + (ch >= 5 ? 'model' : 'work') + '&object=' + encodeURIComponent(id)))}">Open in Chapter ${ch}</a>` : ''}${brain()}</div></section>`;
}
// Several flows on one label: the bundle reads as a list, each flow selectable.
function specimenBundle(id) {
  const l = bundled(id); if (!l) return '';
  return `<section class="cm-spec"><h4>Flows between the same two ends<span>${l.flows.length}</span></h4><p class="cm-spec-t"><b>${esc(l.label)}</b></p><p>One label stands for ${l.flows.length} logical flows drawn along the same route. Select one to read it.</p><dl class="cm-dl"><div><dt>Flows</dt><dd>${l.flows.map(f => `<button type="button" class="cm-link" data-sel="${esc(f)}">${esc(f)} · ${esc(flowOf(f)?.label || '')}${flowOf(f)?.condition ? '<em> · on a condition</em>' : ''}</button>`).join('')}</dd></div></dl></section>`;
}
function specimenProposal() {
  const g = logicalGhost(); if (!g) return '';
  return `<section class="cm-spec"><h4>Proposal · not saved</h4><p class="cm-spec-t"><b>${esc(g.title)}</b></p><p>${esc(g.reason || '')}</p><dl class="cm-dl"><div><dt>Would</dt><dd>${esc(g.effect || '')}</dd></div><div><dt>Owns</dt><dd>${esc(g.boundary || '—')}</dd></div>${g.source && R(g.source) ? `<div><dt>Works with</dt><dd>${link(g.source)}<small>${esc(g.relationship || '')}</small></dd></div>` : ''}</dl><div class="cm-acts">${act('edit-ghost', '', icon('edit') + 'Review &amp; edit', 'gold')}${act('dismiss-ghost', '', 'Dismiss')}</div></section>`;
}
function reading() {
  if (diagramView()) return NT.readingHTML();
  if (covView()) return `<section><h4>Reading this view</h4><p>Each row is a reason the design exists — a requirement, a quality driver or a decision. Each column is a responsibility. A dot means the responsibility carries the reason; a ring means it inherits it, or that the link is still a draft.</p><p>Select a responsibility or a requirement to offer the missing links; each opens the Chapter 4 editor.</p></section>`;
  return `<section><h4>Reading this view</h4><p>The <b>journey</b> runs across the top; <b>responsibility groups</b> run down the left. Each card stands at the step it serves and carries, along its foot, the <b>component that realises it</b> in Chapter 5 — the logical design seen inside the physical one.</p><p>Solid arrows hand work on; ◇ marks a flow that runs only on a condition.${LM.scenarios.length && LM.steps.length ? ' <b>Walk a journey</b> to follow one scenario step by step.' : ''}</p></section>`;
}
const insightsList = () => responsibilityInsights(LM, scope()).slice(0, 8);
function insightsHTML(list = insightsList()) {
  if (!list.length) return '';
  const g = ghost();
  return `<section><h4>What the model shows<span>${list.length}</span></h4>${list.map(x => `<div class="lr-insw"><button type="button" class="cm-ins ${x.kind}" ${x.walk ? `data-lr="walk-from" data-scn="${esc(x.walk)}"` : x.scenario ? `data-lr="walk-from" data-scn="${esc(x.scenario)}" data-end="1"` : `data-sel="${esc(x.id || '')}"`}><span>${esc(x.text)}</span>${x.ask ? `<small>Ask: ${esc(x.ask)}</small>` : ''}</button>${x.proposal && g?.key !== x.proposal ? `<button type="button" class="cm-mini gold lr-inp" data-l-action="preview" data-l-key="${esc(x.proposal)}">Propose ${esc((LM.proposals.find(q => q.key === x.proposal)?.title || '').toLowerCase())}</button>` : ''}</div>`).join('')}<p class="cm-muted">Drawn from recorded responsibilities, flows, journey steps, reasons and Chapter 5 links. Prompts for review, not verdicts.</p></section>`;
}
function findingsHTML() {
  const sc = scope(), fs = LM.findings.filter(f => sc.kind === 'system' || concerns(sc.id).resp.has(f.objectId) || f.objectId === sc.id);
  if (!fs.length) return '';
  const groups = new Map();
  // Group like findings: the same check on different records reads as one line.
  const named = f => { const t = known(f.objectId) && f.objectId !== 'project' ? titleOf(f.objectId) : ''; return t && f.title.includes(t) ? f.title.replace(t, '…') : f.title; };
  for (const f of fs) { const k = named(f).replace(/\b(LR|REQ|MAP|REL|OBJ)-\d+\b/g, '…'); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
  return `<section><h4>Chapter 4 checks<span>${fs.length}</span></h4>${[...groups].sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([k, g]) => `<button type="button" class="cm-fg ${g.some(f => f.level === 'error') ? 'error' : ''}" data-sel="${esc(known(g[0].objectId) ? g[0].objectId : '')}"><b>${esc(k)}</b><small>${g.length} · ${esc([...new Set(g.map(f => refOf(f.objectId) || f.objectId))].slice(0, 4).join(', '))}${g.length > 4 ? '…' : ''}</small></button>`).join('')}<a class="cm-muted" href="${esc(projectURL('/?chapter=4&tab=validate&validate=readiness'))}">All checks on Validate →</a></section>`;
}
function panel() {
  const box = root.querySelector('.cm-panel'), ins = insightsList();
  solMark(root, project(), 4);
  panelToggle(root, '[data-lr="panel"]', S.panel, ins.length);
  if (!S.panel) { box.innerHTML = ''; return; }
  const s = S.sel;
  let spec = '';
  if (s === PROPOSED) spec = specimenProposal();
  else if (bundled(s)) spec = specimenBundle(s);
  else if (s && R(s)) spec = specimenResponsibility(s) + specPanelHTML(project(), s);
  else if (s && flowOf(s)) spec = specimenFlow(s);
  else if (s && stepOf(s)) spec = specimenStep(s);
  else if (s && (LM.groups.has(s) || s === UNGROUPED)) spec = specimenGroup(s);
  else if (s && (LM.Q.has(s) || LM.D.has(s) || LM.A.has(s))) spec = specimenReason(s);
  else if (s && known(s)) spec = specimenOther(s);
  if (!spec && s && drawn(s)) spec = NT.specimenHTML(s);
  box.innerHTML = solInto(spec, solSection(project(), 4, s)) + reading() + insightsHTML(ins) + findingsHTML();
}

// ---------------------------------------------------------------- walking a journey

// The footer: the walk's controls and, while walking, its text; otherwise the status line beside them.
function walkBar() {
  if (diagramView()) { const w = root.querySelector('.cm-walk-in'); if (w) w.innerHTML = ''; return; }
  const bar = root.querySelector('.cm-walk-in'), sc = scenario(), ws = walkSteps();
  if (covView() || !sc || !ws.length) { bar.innerHTML = ''; return; }
  const cur = S.walk >= 0 ? ws[S.walk] : null, seen = visited.get(visitKey(sc)) || new Set(), complete = ws.every(w => seen.has(w.index));
  const record = sc.reviewed ? '<span class="lr-rec ok">✓ Walk recorded for this model</span>' : complete ? `<button type="button" class="cm-btn gold" data-lr="record">Record this walk</button>` : '';
  const walkTitle = `${sc.title} · ${ws.length} of ${LM.steps.length} steps. At each one: who serves it, and which flow brought the work there.`;
  bar.innerHTML = `${S.walk >= 0 ? `<button type="button" class="cm-btn" data-lr="walk-prev" aria-label="Previous step" ${S.walk <= 0 ? 'disabled' : ''}>‹</button>` : ''}<button type="button" class="cm-btn" data-lr="walk-next" title="${esc(walkTitle)}">${S.walk < 0 ? icon('play') + '<span>Walk the journey</span>' : S.walk >= ws.length - 1 ? 'Done' : 'Next ›'}</button>${cur ? `<p class="cm-walk-text"><b>${S.walk + 1} / ${ws.length}</b> ${esc(describeWalk(LM, cur))}</p>` : ''}${record}${S.walk >= 0 ? '<button type="button" class="cm-btn icon" data-lr="walk-stop" aria-label="Stop the walk">×</button>' : ''}`;
}
// Walk progress belongs to one project's scenario, never to the next project opened.
const visitKey = sc => `${project()?.id || ''}|${sc.id}`;
function walkTo(i) {
  const ws = walkSteps(); if (!ws.length) return;
  if (S.view !== 'map') { S.view = 'map'; fitPending = true; }
  if (scope().kind !== 'system') { S.scope = {kind: 'system'}; fitPending = true; }
  S.walk = Math.max(-1, Math.min(ws.length - 1, i));
  if (S.walk >= 0) { const k = visitKey(scenario()); if (!visited.has(k)) visited.set(k, new Set()); visited.get(k).add(ws[S.walk].index); }
  render(); revealWalk();
}
function revealWalk() {
  if (S.walk < 0) return;
  const h = highlight(), cs = L.cards.filter(c => h.cards.has(c.id)), ln = L.lanes.find(l => l.step === h.now);
  if (!cs.length && !ln) return;
  const xs = [...cs.map(c => [c.x, c.x + c.w]), ...(ln ? [[ln.x, ln.x + ln.w]] : [])].flat(), ys = cs.length ? cs.flatMap(c => [c.y, c.y + c.h]) : [L.top, L.top + 120];
  stage.reveal(Math.min(...xs) - 20, Math.min(...ys) - 20, Math.max(...xs) - Math.min(...xs) + 40, Math.max(...ys) - Math.min(...ys) + 40);
}
async function recordWalk() {
  const sc = scenario(), store = window.aiwProjectStore; if (!sc || !store) return;
  const b = root.querySelector('[data-lr="record"]'); if (b) b.disabled = true;
  try {
    await store.command({type: 'logical.scenario', payload: {scenario: sc.id, visited: sc.steps.slice()}});
    document.dispatchEvent(new CustomEvent('aiw:external-project'));
    lastDoc = pending()?.document || project(); rebuild(lastDoc); render();
  } catch (e) { if (b) b.disabled = false; const t = root.querySelector('.cm-walk-text'); if (t) t.textContent = e.message; }
}

// ---------------------------------------------------------------- interaction

function revealSelection() {
  if (diagramView()) { const b = NT.layout()?.nodes.find(n => n.id === S.sel); if (b) stage.reveal(b.x, b.y, b.w, b.h); return; }
  if (!S.sel || !L || !root) return;
  if (covView()) { const r = L.rows.find(x => x.id === S.sel), c = L.cols.find(x => x.id === S.sel); if (r) stage.reveal(L.rail, r.y, 300, r.h); else if (c) stage.reveal(c.x, L.top, c.w, 100); return; }
  if (stepOf(S.sel)) { const ln = L.lanes.find(l => l.step === S.sel); if (ln) stage.reveal(ln.x, L.top, ln.w, 140); return; }
  const h = highlight(), row = S.sel === PROPOSED ? PROPOSED : F.rowOf(S.sel), card = L.cards.find(c => c.id === row) || L.cards.find(c => h.cards.has(c.id));
  if (card) stage.reveal(card.x, card.y, card.w, card.h);
}
// Whichever path changed the selection, the page and Sol hear of it once, as the model renders.
let announced;
const selTargetBase = () => (S.sel && S.sel !== PROPOSED && !/^(G:|LINK:)/.test(String(S.sel)) ? S.sel : null);
const selTarget = () => { const t = selTargetBase(); return t && /^(system:|party:|unplaced:|lane:|family:)/.test(String(t)) ? null : t; };
function announce() {
  announced = S.sel;
  const p = project(), target = selTarget();
  if (p) { try { mountBrainContext(p, {id: target || solOwner(p, S.sel) || 'project', chapter: 4}, 'model'); } catch { /* assistance is optional */ } }
  announceObject(target);
}
function select(id, {reveal = false} = {}) {
  S.sel = id || null; S.walk = -1;
  if (S.sel && !S.panel) S.panel = true;
  save(); render();
  if (reveal) revealSelection();
}
function setScope(sc) { const r = responsibilityScope(LM, sc); S.scope = r.kind === 'system' ? {kind: 'system'} : {kind: r.kind, id: r.id}; S.walk = -1; fitPending = true; save(); render(); }
function up() { const sc = scope(); if (sc.kind === 'part') { const g = R(sc.id)?.group; setScope(g ? {kind: 'group', id: g} : {kind: 'system'}); } else if (sc.kind === 'group') setScope({kind: 'system'}); }
const linkFlow = id => { const l = F.links.find(x => x.id === id); if (!l || l.proposed) return null; return l.flows.length === 1 ? l.flows[0] : 'LINK:' + l.id; };
// Record a link from the coverage matrix through the Chapter 4 responsibility editor.
function studioClick(action, data) { const b = document.createElement('button'); b.type = 'button'; b.hidden = true; b.dataset.lAction = action; for (const [k, v] of Object.entries(data)) b.dataset[k] = v; document.body.appendChild(b); b.click(); b.remove(); }
function linkReason(row, col) {
  if (!R(col)) return;
  if (LM.Q.has(row)) { studioClick('assign-requirement', {lId: col, lRequirement: row}); return; }
  if (!LM.A.has(row)) return;
  studioClick('edit', {lId: col});
  setTimeout(() => { const d = document.querySelector('dialog[open].logical-dialog'); if (!d) return; d.querySelector('[data-l-action="step"][data-l-step="1"]')?.click(); const input = d.querySelector(`input[name="decisionIds"][value="${CSS.escape(row)}"]`); if (input && !input.checked) { input.checked = true; input.dispatchEvent(new Event('change', {bubbles: true})); } }, 80);
}

function bind() {
  solChapterBind(root, 4, {refresh: solRefresh});
  root.addEventListener('click', e => {
    if (root.dataset.suppress) return;
    if (NT.handle(e)) return;
    const add = root.querySelector('.cm-add');
    if (add?.open && !e.target.closest('.cm-add > summary')) add.open = false;
    if (e.target.closest('[data-brain-launch],[data-l-action],[data-ip-action],a')) return;
    const a = e.target.closest('[data-lr]');
    if (a && !a.disabled) {
      const k = a.dataset.lr;
      if (k === 'view') { S.view = a.dataset.id; S.walk = -1; fitPending = true; save(); render(); revealSelection(); return; }
      if (k === 'lens') { S.lens = a.dataset.id; save(); render(); return; }
      if (k === 'depth') { S.depth = a.dataset.id; fitPending = true; save(); render(); return; }
      if (k === 'scope') { setScope(a.dataset.kind === 'group' ? {kind: 'group', id: a.dataset.id} : {kind: 'system'}); return; }
      if (k === 'scope-group') { setScope({kind: 'group', id: a.dataset.id}); return; }
      if (k === 'dissect') { setScope({kind: 'part', id: a.dataset.id}); return; }
      if (k === 'explore') { cbs.explore?.(4); return; }
      if (k === 'expand') { const on = !document.body.classList.contains('cm-expanded'); document.body.classList.toggle('cm-expanded', on); a.setAttribute('aria-pressed', String(on)); sizeModel(root, 'cm-expanded'); fitPending = true; setTimeout(render, 30); return; }
      if (k === 'panel') { S.panel = !S.panel; save(); fitPending = true; render(); setTimeout(() => { fitPending = true; render(); }, 30); return; }
      if (k === 'key') { const key = root.querySelector('.cm-key'); key.classList.toggle('cm-min'); a.setAttribute('aria-expanded', String(!key.classList.contains('cm-min'))); return; }
      if (k === 'fit') { stage.fitAll(); return; }
      if (k === 'zin' || k === 'zout') { const {w, h} = stage.box(); stage.zoomAt(stage.cam.z * (k === 'zin' ? 1.15 : 1 / 1.15), w / 2, h / 2); return; }
      if (k === 'walk-next') { const n = walkSteps().length; if (S.walk >= n - 1) { S.walk = -1; render(); } else walkTo(S.walk + 1); return; }
      if (k === 'walk-prev') { walkTo(Math.max(0, S.walk - 1)); return; }
      if (k === 'walk-stop') { S.walk = -1; render(); return; }
      if (k === 'walk-from') { S.scn = a.dataset.scn; S.sel = null; save(); walkTo(a.dataset.end ? walkSteps().length - 1 : 0); return; }
      if (k === 'record') { recordWalk(); return; }
      if (k === 'link') { linkReason(a.dataset.row, a.dataset.col); return; }
      if (k === 'noop') return;
    }
    const lane = e.target.closest('[data-lane]');
    if (lane) { const id = lane.dataset.lane; if (id === 'across') return; if (S.walk >= 0) { const i = walkSteps().findIndex(w => w.step === id); if (i >= 0) { walkTo(i); return; } } select(S.sel === id ? null : id); return; }
    const band = e.target.closest('[data-band]');
    if (band) { const id = band.dataset.band, now = Date.now(), twice = lastClick.id === 'B:' + id && now - lastClick.t < 420; lastClick = {id: 'B:' + id, t: now}; if (twice && id !== UNOWNED) { lastClick = {id: null, t: 0}; setScope({kind: 'group', id}); return; } if (id !== UNOWNED) select(S.sel === id ? null : id); return; }
    const lk = e.target.closest('[data-link]');
    if (lk && !e.target.closest('[data-sel]')) { select(linkFlow(lk.dataset.link)); return; }
    const card = e.target.closest('[data-card]');
    if (card && !e.target.closest('[data-sel]')) {
      const id = card.dataset.card, now = Date.now(), twice = lastClick.id === id && now - lastClick.t < 420;
      lastClick = {id, t: now};
      if (twice) { lastClick = {id: null, t: 0}; if (id.startsWith('G:')) setScope({kind: 'group', id: id.slice(2)}); else if (R(id)) setScope({kind: 'part', id}); return; }
      select(id.startsWith('HOLE:') ? id.slice(5) : id.startsWith('EMPTY:') ? id.slice(6) : id.startsWith('G:') ? id.slice(2) : id); return;
    }
    const s = e.target.closest('[data-sel]');
    if (s && s.dataset.sel) { e.stopPropagation(); select(s.dataset.sel, {reveal: !!s.closest('.cm-panel')}); return; }
    if (e.target.closest('.cm-stage') && !e.target.closest('.cm-heads,.cm-rail,.cm-edge') && (S.sel || S.walk >= 0)) { S.walk = -1; select(null); }
  });
  root.addEventListener('change', e => { if (NT.change(e)) return; const f = e.target.closest('[data-lr-field="scn"]'); if (!f) return; S.scn = f.value; S.walk = -1; save(); render(); });
  // Enter or Space on a card selects it; Enter on the selected card opens it, as a double-click does.
  root.addEventListener('keydown', e => { if (NT.keydown(e)) return;
    if ((e.key !== 'Enter' && e.key !== ' ') || !e.target.matches('[data-card]')) return;
    e.preventDefault();
    const raw = e.target.dataset.card, id = raw.startsWith('HOLE:') ? raw.slice(5) : raw.startsWith('EMPTY:') ? raw.slice(6) : raw.startsWith('G:') ? raw.slice(2) : raw;
    if (e.key === 'Enter' && S.sel === id) { if (raw.startsWith('G:')) setScope({kind: 'group', id}); else if (R(id)) setScope({kind: 'part', id}); return; }
    select(id);
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !root?.isConnected || document.querySelector('dialog[open]')) return;
    const a = document.activeElement;
    if (a && a !== document.body && !root.contains(a)) return;
    if (a?.closest?.('select,details[open],textarea')) return;
    if (S.walk >= 0) { S.walk = -1; render(); }
    else if (S.sel) select(null);
    else if (scope().kind !== 'system') up();
    else if (document.body.classList.contains('cm-expanded')) root.querySelector('[data-lr="expand"]').click();
    else return;
    e.preventDefault();
  });
  root.addEventListener('pointerleave', () => { root.querySelector('.cm-tip').hidden = true; });
  window.addEventListener('resize', () => { if (!root?.isConnected) return; clearTimeout(bind._r); bind._r = setTimeout(() => { sizeModel(root, 'cm-expanded'); render(); }, 120); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!root?.isConnected || !L) return; clearTimeout(bind._ro); bind._ro = setTimeout(() => { const w = stage.box().w; if (Math.abs(w - (bind._w || 0)) > 24) { bind._w = w; fitPending = true; render(); } }, 90); }).observe(root.querySelector('.cm-stage'));
}
function tip(e) {
  const box = root.querySelector('.cm-tip'), t = e.target.closest?.('.lr-card,.lr-label,.lr-sh,.lr-bt,.nt-node');
  if (!t || !root.contains(t)) { box.hidden = true; return; }
  if (t.dataset.ntNode) { box.innerHTML = NT.tipHTML(t.dataset.ntNode); box.hidden = !box.innerHTML; if (!box.hidden) placeTip(box, e); return; }
  let html = '';
  if (t.dataset.link) { const id = linkFlow(t.dataset.link), b = bundled(id); html = flowOf(id) ? `<b>${esc(id + ' · ' + flowOf(id).label)}</b>${esc(describeFlow(LM, id))}` : b ? `<b>${esc(b.label)}</b>${b.flows.length} flows along one route: ${esc(b.flows.join(', '))}<small class="h">Select to read each</small>` : ''; }
  else if (t.dataset.card) { const id = t.dataset.card; html = R(id) ? `<b>${esc(refTitle(id))}</b>${esc(describeResponsibility(LM, id))}<small class="h">Double-click to focus on it</small>` : id.startsWith('G:') ? `<b>${esc(bandInfo(LM, id.slice(2)).title)}</b>${esc(bandInfo(LM, id.slice(2)).sub || '')}<small class="h">Double-click to open the group</small>` : id.startsWith('HOLE:') ? `<b>${esc(stepOf(id.slice(5)).title)}</b>No responsibility serves this journey step yet.` : ''; }
  else if (t.dataset.lane) { const s = stepOf(t.dataset.lane); html = s ? `<b>${esc('Step ' + s.num + ' · ' + s.title)}</b>${esc(s.description || '')}` : ''; }
  else if (t.dataset.band) { const b = bandInfo(LM, t.dataset.band); html = `<b>${esc(b.title)}</b>${esc(b.sub || '')}${b.kind === 'group' ? '<small class="h">Double-click to open the group</small>' : ''}`; }
  if (!html) { box.hidden = true; return; }
  box.innerHTML = html; box.hidden = false; placeTip(box, e);
}

export function responsibilityDebug() { return {S: {...S}, LM, F, L, G}; }
