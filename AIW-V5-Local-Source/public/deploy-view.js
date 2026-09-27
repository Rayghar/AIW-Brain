// Chapter 10 Model — Deployment & runtime.
//
// Two architecture models of one environment, drawn from recorded plans, placements and zones:
// - Deployment: each deployable part is a row, each zone a column; zones that share a failure
//   domain stand together. A dot is a running copy. Dependencies run in their own gutter.
// - What fails together: the same grid with a zone or failure domain removed, using the
//   chapter's own failure simulation: what stops, what it takes with it, what could recover.
// Sliced like the anatomy (whole system → module → part), read through the Operation, Flow and
// Protection lenses, and edited only through the Chapter 10 editors and runtime proposals.
import {deploySource, foldDeploy, deployScope, deployInsights, describePlan, failureOf, defaultDepth, STATE_LABEL, STATE_RANK} from './deploy-model.js';
import {deployLayout, deployHead, DEP} from './deploy-layout.js';
import {modelStage, sizeModel, placeTip} from './model-stage.js';
import {projectPreferenceKey, projectURL} from './project-context.js';
import {mountBrainContext} from './brain-context-ui.js';
import {specPanelHTML, runsOnLabel, productLabels} from './spec-panel.js';
import {solChapterMount, solChapterBind, solSection, solInto, solMark, solOwner} from './chapter-sol.js';
import {createNotation} from './notation-view.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const project = () => window.aiwProjectStore?.value?.document || window.aiwCurrentProject;
// Sol's advice changes the project only through a store command; the view then reads the new document.
const solRefresh = () => { if (root?.isConnected) mountChapterModel({id: pageSel}, cbs); };
const studio = () => window.aiwLogicalStudio;
const PATHS = {diagram: 'M4 4h6v5H4zM14 4h6v5h-6zM9 15h6v5H9zM7 9v3h10V9M12 12v3', operation: 'M3 12h4l2-5 4 10 2-5h6', flow: 'M3 12h13m-4-5 5 5-5 5M3 5h6M3 19h6', protection: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z', deploy: 'M3 4h18v6H3zM3 14h8v6H3zM13 14h8v6h-8z', fail: 'M12 3 2 21h20L12 3zm0 7v4m0 3h.01', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', panel: 'M3 4h18v16H3zM15 4v16', explore: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', plus: 'M12 5v14M5 12h14', spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z', mind: 'm3 7 9-4 9 4-9 4-9-4m0 5 9 4 9-4m-18 5 9 4 9-4', edit: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4', dissect: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14M21 21l-5-5M8 11h6', play: 'M7 4v16l13-8z'};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[n] || PATHS.deploy}"/></svg>`;
const LENSES = [
  {id: 'operation', label: 'Operation', like: 'vital signs', q: 'How many copies run where, and how each part recovers.'},
  {id: 'flow', label: 'Flow', like: 'muscles', q: 'What each part needs in order to run: platform services, other parts and external systems.'},
  {id: 'protection', label: 'Protection', like: 'immune system', q: 'Which trust boundary each zone sits in, and which controls each part enforces.'}
];
const STAGES = [['zones', 'The zones fail'], ['direct', 'Parts that lose their copies'], ['carried', 'Parts stopped by what they need'], ['recovery', 'What could recover']];

let root = null, V = null, lastDoc = null, lastEnv = null, cbs = {}, F = null, L = null, FA = null, fitPending = true, stage = null, lastRowClick = {id: null, t: 0}, pageSel;
let NT = null;
let S = {view: 'diagram', lens: 'operation', scope: {kind: 'system'}, depth: 'auto', scenario: null, sel: null, pl: null, panel: true, walk: -1};
// The standard diagram (notation-view.js) and the elements only it draws.
const diagramView = () => S.view === 'diagram';
const drawn = id => diagramView() && !!NT?.diagram()?.nodes.some(n => n.id === id);
const pref = () => projectPreferenceKey('aiw-deploy-model-v1');
function load() { try { const v = JSON.parse(localStorage.getItem(pref()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
function save() { try { localStorage.setItem(pref(), JSON.stringify({view: S.view, lens: S.lens, scope: S.scope, depth: S.depth, scenario: S.scenario, sel: S.sel, panel: S.panel})); } catch { /* preferences are optional */ } }
function anatomyOrder() { try { return JSON.parse(localStorage.getItem(projectPreferenceKey('aiw-anatomy-v1')) || '{}').order || {}; } catch { return {}; } }
const envId = () => document.querySelector('select[name="rtEnvironment"]')?.value || null;

// ---------------------------------------------------------------- mount / leave

export function mountChapterModel(selection, callbacks = {}) {
  const p = project(), host = document.querySelector('.studio > .stage.tab-content');
  if (!p || !host) return;
  cbs = callbacks;
  solChapterMount(p, 10, solRefresh);
  if (!root) {
    root = document.createElement('section'); root.className = 'cm dp'; root.setAttribute('aria-label', 'Chapter 10 model: deployment and runtime');
    root.innerHTML = shell();
    stage = modelStage(root, {headHeight: () => (S.view === 'diagram' ? 0 : deployHead()), railWidth: l => l.rail || 0, onHover: tip});
    stage.bind(); bind();
    // The standard diagram shares the stage, the companion and the selection with the chapter's own views.
    NT = createNotation({chapter: 10, root, stage, project, onSelect: id => select(id)});
    NT.onChange = full => { if (full) fitPending = true; render(); };
    NT.bindDrag();
    const v = load();
    for (const k of ['view', 'lens', 'depth', 'scenario', 'sel']) if (typeof v[k] === 'string') S[k] = v[k];
    if (v.scope && typeof v.scope === 'object') S.scope = v.scope;
    if (typeof v.panel === 'boolean') S.panel = v.panel;
    if (!['diagram', 'deploy', 'failure'].includes(S.view)) S.view = 'diagram';
    if (!LENSES.some(l => l.id === S.lens)) S.lens = 'operation';
  }
  const first = !V;
  if (host.firstElementChild !== root) host.prepend(root);
  document.body.classList.add('cm-active', 'am-active');
  const e = envId();
  if (p !== lastDoc || e !== lastEnv || !V) { lastDoc = p; lastEnv = e; rebuild(p, e); }
  // A link from another surface (the anatomy's "Open in Chapter 10 model") lands on its plan,
  // placement or zone, and so does a selection made elsewhere on the page.
  const placement = id => V.placements.find(l => l.id === id);
  const selectable = id => !!id && (V.plans.has(id) || V.planOfAsset.has(id) || V.zones.some(z => z.id === id) || !!placement(id));
  const adopt = id => { const l = placement(id); S.sel = l ? l.plan : V.planOfAsset.get(id) || id; S.pl = l ? l.id : null; setTimeout(revealSelection, 60); };
  if (first && V) { const want = window.aiwChapterModels ? window.aiwChapterModels.takeLink(10) : new URLSearchParams(location.search).get('object'); if (selectable(want)) adopt(want); }
  else if (V && pageSel !== undefined && selection?.id !== pageSel && selectable(selection?.id)) adopt(selection.id);
  pageSel = selection?.id ?? null;
  render();
  sizeModel(root, 'cm-expanded');
}
export function leaveChapterModel() {
  document.body.classList.remove('cm-active', 'cm-expanded');
  root?.remove();
}
function rebuild(p, e) {
  try { V = deploySource(p, {envId: e, order: anatomyOrder()}); } catch (err) { console.error('Deployment model', err); V = null; return; }
  if (S.sel && !V.plans.has(S.sel) && !V.zones.some(z => z.id === S.sel) && !V.M.byId.has(S.sel)) S.sel = null;
  if (!V.scenarios.some(s => s.id === S.scenario)) S.scenario = V.scenarios[0]?.id || null;
  if (S.scope?.id && deployScope(V, S.scope).kind === 'system') S.scope = {kind: 'system'};
}

// ---------------------------------------------------------------- shell

function shell() {
  return `<header class="cm-top"><div class="cm-title"><small>Chapter 10 · Model</small><strong>Deployment &amp; runtime</strong></div>
   <nav class="cm-crumbs" aria-label="Where you are"></nav>
   <div class="cm-views" role="group" aria-label="Model"><button type="button" class="cm-view" data-dp="view" data-id="diagram" title="The deployment in the standard notation">${icon('diagram')}<span>Diagram</span></button><button type="button" class="cm-view" data-dp="view" data-id="deploy">${icon('deploy')}<span>Deployment</span></button><button type="button" class="cm-view" data-dp="view" data-id="failure">${icon('fail')}<span>What fails together</span></button></div>
   <div class="cm-actions"><details class="cm-add"><summary class="cm-btn" aria-label="Add to the model">${icon('plus')}<span>Add</span></summary><div><button type="button" data-rt-action="zone">New zone</button><button type="button" data-rt-action="new-environment">New environment</button><p>Place a part from its row. Saved changes go through the Chapter 10 editors, each with its own review confirmation.</p></div></details>
    <button type="button" class="cm-btn" data-dp="explore" title="The connected explorer: every perspective of the whole model">${icon('explore')}<span>Explore all perspectives</span></button>
    <button type="button" class="cm-btn icon" data-dp="expand" aria-pressed="false" aria-label="Expand the model" title="Expand">${icon('expand')}</button>
    <button type="button" class="cm-btn icon" data-dp="panel" aria-pressed="true" aria-label="Show the companion panel" title="Companion">${icon('panel')}</button></div></header>
  <div class="cm-bar"><label class="cm-scn"><span>Failure</span><select data-dp-field="scenario" aria-label="What fails"></select></label><div class="cm-lenses" role="group" aria-label="Lens"></div><div class="cm-depth" role="group" aria-label="Rows"></div><p class="cm-state" role="status" aria-live="polite"></p></div>
  <div class="cm-banner"></div>
  <div class="cm-body"><div class="cm-stage" tabindex="0" aria-label="Deployment canvas. Drag or scroll to move; Ctrl or Command and scroll to zoom.">
    <div class="cm-world"><svg class="cm-svg" aria-hidden="true"></svg><div class="cm-html"></div></div>
    <div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div>
    <div class="cm-key cm-min"><button type="button" class="cm-kt" data-dp="key" aria-expanded="false">Key</button><div class="cm-legend"></div></div>
    <div class="cm-zoom"><button type="button" data-dp="zout" aria-label="Zoom out">−</button><button type="button" data-dp="zin" aria-label="Zoom in">+</button><button type="button" data-dp="fit" aria-label="Fit the width">${icon('fit')}</button></div>
  </div><aside class="cm-panel" aria-label="Companion"></aside></div>
  <footer class="cm-walk" aria-label="Walk through the failure"></footer><div class="cm-tip" role="tooltip" hidden></div>`;
}

// ---------------------------------------------------------------- render

const T = id => V?.M.byId.get(id)?.type;
const title = id => V?.plans.get(id)?.title || V?.zones.find(z => z.id === id)?.title || V?.M.byId.get(id)?.title || id;
function scope() { return deployScope(V, S.scope); }
function depth() { return S.depth === 'auto' ? defaultDepth(V) : S.depth; }
const ghost = () => { const g = studio()?.proposal; return g && (g.kind === 'placement' || g.kind === 'plan') && V?.plans.has(g.objectId) ? g : null; };
const failing = () => S.view === 'failure';

function render() {
  if (!root) return;
  if (!V) { root.querySelector('.cm-html').innerHTML = '<p class="cm-empty">The deployment model could not be prepared for this project.</p>'; return; }
  root.classList.remove('cm-lens-operation', 'cm-lens-flow', 'cm-lens-protection');
  root.classList.add('cm-lens-' + S.lens);
  root.classList.toggle('dp-failing', failing());
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
  root.querySelector('[data-dp="panel"]').setAttribute('aria-pressed', String(S.panel));
  // Geometry depends on the rows and the stage width — never on the lens or the failure explored.
  F = foldDeploy(V, scope(), depth());
  L = deployLayout(F, {viewW: Math.max(640, stage.box().w)});
  FA = failing() ? failureOf(V, S.scenario) : null;
  const world = root.querySelector('.cm-world'), svg = root.querySelector('.cm-svg');
  world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
  svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
  const hl = highlight();
  svg.innerHTML = defs() + worldSVG(hl);
  root.querySelector('.cm-html').innerHTML = worldHTML(hl);
  heads(); rail(hl); chrome(); panel(); walkBar();
  stage.use(L, JSON.stringify([S.view, S.scope?.kind || 'system', S.scope?.id || '', depth(), lastEnv]));
  if (fitPending) { fitPending = false; stage.fit(); } else stage.clamp();
  stage.apply();
}

// State of a row in the failure being explored: the worst of its plans.
function rowState(r, phase = 'initial') {
  if (!FA?.state) return null;
  const ids = r.kind === 'party' ? [] : r.members;
  let worst = null;
  for (const id of ids) { const s = FA.state.get(id)?.[phase]; if (s && (!worst || STATE_RANK[s.state] > STATE_RANK[worst.state])) worst = s; }
  return worst;
}
// What the walk-through stage lights.
function stageLit() {
  if (!FA?.state || S.walk < 0) return null;
  const st = STAGES[S.walk][0], rows = new Set();
  for (const r of F.rows) {
    if (st === 'direct' && r.members.some(id => FA.direct.has(id))) rows.add(r.id);
    if (st === 'carried' && r.members.some(id => !FA.direct.has(id) && ['unavailable', 'degraded'].includes(FA.state.get(id)?.initial.state))) rows.add(r.id);
    if (st === 'recovery' && r.members.some(id => FA.state.get(id)?.recovery.state === 'conditional')) rows.add(r.id);
  }
  return {stage: st, rows};
}
function highlight() {
  const out = {on: false, rows: new Set(), arcs: new Set(), zones: new Set()};
  const lit = stageLit();
  if (lit) { out.on = lit.stage !== 'zones'; for (const id of lit.rows) out.rows.add(id); if (lit.stage === 'carried') for (const a of L.arcs) if (a.link.deps.some(d => FA.carries.has(d))) out.arcs.add(a.id); if (lit.stage === 'zones') for (const z of FA.failed) out.zones.add(z); return out; }
  const s = S.sel; if (!s) return out;
  const rid = F.rowOf(s) || (F.rows.some(r => r.id === s) ? s : null);
  if (V.zones.some(z => z.id === s)) { out.on = true; out.zones.add(s); for (const r of F.rows) if (r.cells.has(s)) out.rows.add(r.id); return out; }
  if (!rid) return out;
  out.on = true; out.rows.add(rid);
  for (const a of L.arcs) if (a.from === rid || a.to === rid) { out.arcs.add(a.id); out.rows.add(a.from); out.rows.add(a.to); }
  return out;
}
const rowCls = (hl, id) => (hl.on ? (hl.rows.has(id) ? ' lit' : ' dim') : '');

function defs() {
  const m = (id, fill) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1 9 5 1 9z" fill="${fill}"/></marker>`;
  return `<defs>${m('dp-a-n', '#56705f')}${m('dp-a-h', '#a8741f')}${m('dp-a-w', '#b0493a')}${m('dp-a-m', '#c3cbbd')}<pattern id="dp-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v8" stroke="#e7b9ae" stroke-width="3"/></pattern><pattern id="dp-hatch-g" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v8" stroke="#e8dcc2" stroke-width="3"/></pattern></defs>`;
}
function worldSVG(hl) {
  const out = [], {top} = L;
  if (L.env) out.push(`<rect class="dp-env" x="${L.env.x}" y="${L.env.y}" width="${L.env.w}" height="${L.env.h}" rx="12"/>`);
  for (const z of L.zones) out.push(`<rect class="dp-zcol${hl.zones.has(z.id) ? ' lit' : ''}" x="${z.x}" y="${top - 4}" width="${z.w}" height="${L.H - top - 14}" rx="8"/>`);
  if (FA?.failed) for (const z of L.zones) if (FA.failed.has(z.id)) out.push(`<rect class="dp-zfail" x="${z.x}" y="${top - 4}" width="${z.w}" height="${L.H - top - 14}" rx="8" fill="url(#dp-hatch)"/>`);
  out.push(`<rect class="dp-tray" x="${L.trayX}" y="${top - 4}" width="${DEP.TRAY}" height="${L.H - top - 14}" rx="8"/>`);
  for (const g of L.groups) out.push(`<rect class="dp-group" x="${L.rail}" y="${g.y}" width="${L.W - L.rail - 6}" height="${g.h}"/>`);
  for (const r of L.rows) out.push(`<line class="dp-sep" x1="${L.rail}" x2="${L.W - 8}" y1="${r.y + r.h}" y2="${r.y + r.h}"/>`);
  // Plain dependencies first, then the lit and failure-carrying ones on top.
  const arcs = L.arcs.map(a => ({a, lit: hl.arcs.has(a.id), carries: !!FA && a.link.deps.some(d => FA.carries.has(d))})).sort((p, q) => (p.lit || p.carries) - (q.lit || q.carries));
  for (const {a, lit, carries} of arcs) {
    const l = a.link, tone = carries ? 'w' : lit ? 'h' : hl.on ? 'm' : 'n', st = `${lit ? ' lit' : hl.on ? ' dim' : ''}${carries ? ' carries' : ''}${l.dim ? ' out' : ''}${l.party ? ' party' : ''}`;
    const r = 4, dy = a.y2 > a.y1 ? 1 : -1;
    out.push(`<path class="dp-arc trunk${st}" d="M${a.xb} ${a.y1}H${a.x + r}Q${a.x} ${a.y1} ${a.x} ${a.y1 + dy * r}V${a.y2 - dy * r}"/><path class="dp-arc ${l.mode}${st}" d="M${a.x} ${a.y2 - dy * r}Q${a.x} ${a.y2} ${a.x + r} ${a.y2}H${a.xb}" marker-end="url(#dp-a-${tone})"/><circle class="dp-arc-dot${lit ? ' lit' : hl.on ? ' dim' : ''}" cx="${a.xb}" cy="${a.y1}" r="2.4"/>`);
  }
  return out.join('');
}
function pips(n, cls, max = 6) { return n <= max ? Array.from({length: n}, () => `<i class="pip ${cls}"></i>`).join('') : `<i class="pip ${cls}"></i><b>×${n}</b>`; }
function worldHTML(hl) {
  const out = [], g = ghost();
  for (const gr of L.groups) {
    const r = F.rows.find(x => x.id === gr.first), key = gr.key;
    const label = key === 'platform' ? 'Platform services' : key === 'outside' ? 'Outside the environment' : key === 'loose' ? 'Not in a module' : V.M.byId.get(key)?.title || key;
    const sub = key === 'platform' ? 'technology the parts stand on' : key === 'outside' ? 'reached through runtime paths' : 'module';
    out.push(`<div class="dp-gh" style="left:${L.x0 + 6}px;top:${gr.y + 6}px">${key !== 'platform' && key !== 'outside' && key !== 'loose' ? `<button type="button" data-dp="dissect" data-id="${esc(key)}">${esc(label)}</button>` : `<b>${esc(label)}</b>`}<small>${esc(sub)}</small></div>`);
    void r;
  }
  for (const c of L.cells) {
    const r = F.rows.find(x => x.id === c.row), short = r.short.length && r.members.length === 1, lost = FA?.failed?.has(c.zone);
    const plans = c.cell.plans, one = plans.length === 1 ? V.plans.get(plans[0]) : null;
    out.push(`<button type="button" class="dp-cell${c.cell.active ? ' active' : ''}${c.cell.standby ? ' standby' : ''}${short ? ' short' : ''}${lost ? ' lost' : ''}${rowCls(hl, c.row)}${S.pl && c.cell.placements.includes(S.pl) ? ' pick' : ''}" data-sel="${esc(one ? one.id : c.row)}" data-pl="${esc(c.cell.placements[0])}" style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px">
      <span class="dp-pips">${pips(c.cell.active, 'a')}${pips(c.cell.standby, 's')}</span><span class="dp-role">${c.cell.active ? c.cell.active + ' active' : ''}${c.cell.active && c.cell.standby ? ' · ' : ''}${c.cell.standby ? c.cell.standby + ' standby' : ''}${r.members.length > 1 ? ` · ${plans.length} of ${r.planned} parts` : ''}</span>${lost ? '<span class="dp-x">lost</span>' : ''}</button>`);
  }
  if (g?.kind === 'placement') {
    const rid = F.rowOf(g.objectId), row = L.rows.find(x => x.id === rid), z = L.zones.find(x => x.id === g.record.zoneId);
    if (row && z) out.push(`<button type="button" class="dp-cell ghost" data-rt-action="edit-ghost" style="left:${z.x + 8}px;top:${row.y + 7}px;width:${z.w - 16}px;height:${DEP.ROW_H - 14}px"><span class="dp-pips">${pips(Number(g.record.replicas) || 1, 's')}</span><span class="dp-role">Proposed ${esc(g.record.role)} · review</span></button>`);
  }
  for (const t of L.trays) {
    const r = F.rows.find(x => x.id === t.row);
    let body = '';
    if (r.kind === 'party') body = `<span class="dp-ok">Outside — reached, not operated here</span>`;
    else if (r.unplaced.length && r.members.length === 1) body = `<button type="button" class="dp-socket" data-dp="place" data-id="${esc(r.unplaced[0])}">Not placed · place it</button>`;
    else if (r.unplaced.length) body = `<span class="dp-socket soft">${r.unplaced.length} of ${r.planned} not placed</span>`;
    else if (r.short.length) body = `<span class="dp-short">Below its minimum · ${V.plans.get(r.short[0]).active} of ${V.plans.get(r.short[0]).minReady} ready</span>`;
    else body = `<span class="dp-ok">✓ ${r.members.length === 1 ? V.plans.get(r.members[0]).minReady + ' ready needed' : 'all placed'}</span>`;
    out.push(`<div class="dp-trayc${rowCls(hl, t.row)}" style="left:${t.x}px;top:${t.y}px;width:${t.w}px;height:${t.h}px">${body}</div>`);
  }
  for (const o of L.outs) {
    const r = F.rows.find(x => x.id === o.row), p = r.members.length === 1 ? V.plans.get(r.members[0]) : null;
    let op = '', fl = '', pr = '';
    if (r.kind === 'party') { const rs = V.routes.filter(x => x.to === r.id || x.from === r.id); op = rs.map(x => x.ref).join(', '); fl = rs.map(x => `${x.ref} · ${x.mode}${x.failure ? '' : ' · no failure response'}`).join('<br>'); pr = rs.map(x => `${x.ref} · ${x.access ? 'access recorded' : 'access not recorded'}`).join('<br>'); }
    else if (p) {
      op = `<b>${esc(p.recovery === 'Unspecified' ? 'No recovery chosen' : p.recovery)}</b><small>${esc(p.stateMode === 'Unspecified' ? 'State not recorded' : p.stateMode)}${p.rto ? ' · back in ' + esc(p.rto) + ' min' : ''}${p.rpo ? ' · loses ≤ ' + esc(p.rpo) + ' min' : ''}</small>`;
      const needs = V.deps.filter(d => d.from === p.id).length, by = V.deps.filter(d => d.to === p.id).length;
      fl = `<b>Needs ${needs}</b><small>needed by ${by}</small>`;
      const bound = p.controls.length;
      pr = `<b>${bound ? bound + ' control' + (bound === 1 ? '' : 's') + ' enforced' : 'No control bound'}</b><small>${esc(p.network ? 'Network policy recorded' : 'Network policy not recorded')}</small>`;
    } else { op = `<b>${r.planned} parts</b><small>${r.unplaced.length} not placed</small>`; fl = op; pr = op; }
    let fail = '';
    if (FA?.state) { const a = rowState(r, 'initial'), b = rowState(r, 'recovery'); fail = a ? `<span class="dp-state ${a.state}">${esc(STATE_LABEL[a.state])}</span>${b && b.state !== a.state ? `<span class="dp-then">→</span><span class="dp-state ${b.state}">${esc(STATE_LABEL[b.state])}</span>` : ''}` : r.kind === 'party' ? '<span class="dp-state na">Not exercised</span>' : ''; }
    out.push(`<div class="dp-outc${rowCls(hl, o.row)}${FA ? ' failing' : ''}" style="left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px">${FA ? `<span class="dp-fail">${fail}</span>` : `<span class="dp-o op">${op}</span><span class="dp-o fl">${fl}</span><span class="dp-o pr">${pr}</span>`}</div>`);
  }
  return out.join('');
}

function heads() {
  const box = root.querySelector('.cm-heads-in'), out = [], top = DEP.DOM_H + 4;
  if (L.env) out.push(`<div class="dp-envh" style="left:${L.env.x}px;width:${L.env.w}px">${esc(V.env?.title || 'Environment')}<small>${esc(V.env?.stage || '')}</small></div>`);
  for (const d of L.domains) { const slot = V.domains.find(x => x.title === (d.domain || 'Undeclared failure domain') || x.zones.includes(d.zones[0]))?.slot || 0; out.push(`<div class="dp-dom s${slot % 4}" style="left:${d.x1}px;width:${d.x2 - d.x1}px;top:${top}px" title="Zones under one bracket share a failure domain and fail together">${esc(d.domain || 'Failure domain not declared')}</div>`); }
  for (const z of L.zones) {
    const zz = z.zone, failed = FA?.failed?.has(z.id), b = V.M.byId.get(zz.boundary);
    out.push(`<button type="button" class="dp-zh${S.sel === z.id ? ' sel' : ''}${failed ? ' failed' : ''}" data-zone="${esc(z.id)}" style="left:${z.x + 3}px;width:${z.w - 6}px;top:${top + 22}px;height:${DEP.HEAD_H - 26}px"><b>${esc(zz.title)}</b><small class="dp-zb">${esc(b ? b.title : zz.boundary ? zz.boundary : 'No trust boundary')}</small><small class="dp-zo">${failed ? 'Failed in this scenario' : esc(F.rows.filter(r => r.cells.has(z.id)).length + ' placed' + (failing() ? ' · select to fail it' : ''))}</small></button>`);
  }
  out.push(`<div class="dp-th" style="left:${L.trayX}px;width:${DEP.TRAY}px;top:${top + 22}px"><b>Not placed</b><small>parts without a place to run</small></div>`);
  out.push(`<div class="dp-th out" style="left:${L.outX}px;width:${DEP.OUT}px;top:${top + 22}px"><b>${failing() ? esc(FA?.scenario?.title ? 'If ' + FA.scenario.title.replace(/ fails.*$/, '') + ' fails' : 'What fails') : '<span class="dp-o op">Recovery</span><span class="dp-o fl">Needs</span><span class="dp-o pr">Enforcement</span>'}</b><small>${failing() ? 'state → after declared recovery' : '<span class="dp-o op">strategy and state</span><span class="dp-o fl">dependencies</span><span class="dp-o pr">controls and network policy</span>'}</small></div>`);
  box.innerHTML = out.join('');
  box.style.width = L.W + 'px';
}
function rail(hl) {
  const box = root.querySelector('.cm-rail-in');
  root.querySelector('.cm-rail').style.setProperty('--cm-rail', L.rail + 'px');
  const g = ghost(), out = [];
  for (const r of L.rows) {
    const row = r.row, p = row.members.length === 1 ? V.plans.get(row.members[0]) : null, st = rowState(row);
    const on = p ? runsOnLabel(project(), p.asset) : '';
    const sub = row.kind === 'party' ? 'External system' : p ? `${esc(p.ref)}${on ? ` · <b class="sp-pn">${esc(on)}</b>` : ''} · ${p.minReady}–${p.maxReplicas} copies` : `${row.planned} parts`;
    const proposed = g && row.members.includes(g.objectId);
    out.push(`<button type="button" class="dp-row ${row.kind}${row.ctx ? ' ctx' : ''}${row.subject ? ' subject' : ''}${S.sel && F.rowOf(S.sel) === row.id ? ' sel' : ''}${rowCls(hl, row.id)}${proposed ? ' proposed' : ''}${st ? ' st-' + st.state : ''}" data-row="${esc(row.id)}" style="top:${r.y + 5}px;height:${r.h - 10}px"><b>${esc(row.title)}</b><small>${sub}</small></button>`);
  }
  box.innerHTML = out.join('');
  box.style.height = L.H + 'px'; box.style.width = L.rail + 'px';
}

function crumbs() {
  const sc = scope(), parts = [`<button type="button" data-dp="scope" data-kind="system" class="${sc.kind === 'system' ? 'here' : ''}">${esc(V.env?.title || 'Whole system')}</button>`];
  if (sc.kind !== 'system') {
    const m = sc.kind === 'module' ? sc.id : V.M.mod.get(V.plans.get(sc.id)?.asset);
    if (m) parts.push('<span>›</span>', `<button type="button" data-dp="scope" data-kind="module" data-id="${esc(m)}" class="${sc.kind === 'module' ? 'here' : ''}">${esc(V.M.byId.get(m)?.title || m)}</button>`);
    if (sc.kind === 'part') parts.push('<span>›</span>', `<button type="button" class="here" data-dp="noop">${esc(title(sc.id))}</button>`);
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
  const sel = root.querySelector('[data-dp-field="scenario"]');
  sel.innerHTML = V.scenarios.map(s => `<option value="${esc(s.id)}" ${s.id === S.scenario ? 'selected' : ''}>${esc(s.title)}</option>`).join('') || '<option>No zones yet</option>';
  sel.closest('.cm-scn').hidden = !failing();
  root.querySelector('.cm-lenses').innerHTML = LENSES.map(l => `<button type="button" class="cm-lens" data-dp="lens" data-id="${l.id}" aria-pressed="${S.lens === l.id}" title="${esc(l.q + ' Like the ' + l.like + '.')}">${icon(l.id)}<span>${l.label}</span></button>`).join('');
  const dp = depth();
  root.querySelector('.cm-depth').innerHTML = sc.kind === 'system' ? `<span>Rows</span>${[['modules', 'Modules'], ['parts', 'Parts'], ['all', 'Parts + platform']].map(([id, t]) => `<button type="button" class="cm-dep" data-dp="depth" data-id="${id}" aria-pressed="${dp === id}">${t}</button>`).join('')}` : '';
  const placed = F.rows.filter(r => r.cells.size).length, unplaced = F.rows.reduce((n, r) => n + r.unplaced.length, 0);
  let state = !V.env ? 'No environment yet' : `${V.zones.length} zone${V.zones.length === 1 ? '' : 's'} · ${placed} row${placed === 1 ? '' : 's'} placed · ${unplaced} not placed`;
  if (V.env && failing() && FA?.result) { const rows = FA.result.rows, stop = rows.filter(r => ['unavailable', 'degraded'].includes(r.initial.state)).length, unk = rows.filter(r => r.initial.state === 'unknown').length; state = `${FA.scenario.title} · ${stop} stop or degrade · ${unk} cannot be judged · ${rows.length - stop - unk} keep running`; }
  root.querySelector('.cm-state').textContent = state;
  const g = ghost();
  root.querySelector('.cm-banner').innerHTML = g ? `<section class="dp-banner"><span class="ip-kicker">Runtime proposal · not saved</span><b>${esc(g.kind === 'placement' ? 'Standby for ' + V.plans.get(g.objectId).title + ' in ' + title(g.record.zoneId) : 'Operating wording for ' + V.plans.get(g.objectId).title)}</b><small>${esc(g.reason)}</small><button type="button" class="cm-btn gold" data-rt-action="edit-ghost">Review &amp; edit</button><button type="button" class="cm-btn" data-rt-action="dismiss">Dismiss</button></section>` : '';
  root.querySelector('.cm-legend').innerHTML = `<p><i class="pip a"></i>A running copy (active)</p><p><i class="pip s"></i>A standby copy</p><p><i class="k-dom"></i>Zones under one bracket share a failure domain</p><p><svg width="40" height="12"><path d="M36 2H8V10H36" stroke="#56705f" stroke-width="1.6" fill="none"/></svg>Requires — cannot run without it</p><p><svg width="40" height="12"><path d="M36 2H8V10H36" stroke="#56705f" stroke-width="1.4" stroke-dasharray="4 3" fill="none"/></svg>Buffered — degrades without it</p><p><span class="k-socket"></span>Not placed yet</p>${failing() ? '<p><i class="k-fail"></i>Failed zone</p><p><svg width="40" height="12"><path d="M36 2H8V10H36" stroke="#b0493a" stroke-width="2" fill="none"/></svg>Carries the failure to a part that would otherwise survive</p>' : ''}`;
}

// ---------------------------------------------------------------- companion

function specimenPlan(id) {
  const p = V.plans.get(id), ls = V.byPlan.get(id) || [], needs = V.deps.filter(d => d.from === id), by = V.deps.filter(d => d.to === id), src = V.sources.get(id);
  const k = (label, v, miss = true) => `<div class="${v ? '' : miss ? 'miss' : 'none'}"><dt>${label}</dt><dd>${v || (miss ? 'Not recorded' : '—')}</dd></div>`;
  const dep = d => { const t = d.to ? title(d.to) : 'a missing prerequisite'; return `<button type="button" class="cm-link" data-sel="${esc(d.to || '')}">${esc(t)}<i>${d.mode === 'buffered' ? ' · buffered' : ''}${d.party ? ' · ' + esc(d.detail) : ''}</i></button>`; };
  const fstate = FA?.state?.get(id);
  const routes = V.routes.filter(r => V.planOfAsset.get(r.from) === id || V.planOfAsset.get(r.to) === id);
  return `<section class="cm-spec"><h4>${p.kind === 'component' ? 'Operating plan · application component' : 'Operating plan · platform service'}${p.illustrative ? '<span>Illustrative</span>' : ''}</h4><p class="cm-spec-t"><b>${esc(p.ref)} · ${esc(p.title)}</b></p><p>${esc(describePlan(V, id))}</p>
  ${fstate ? `<p class="dp-fnote"><span class="dp-state ${fstate.initial.state}">${esc(STATE_LABEL[fstate.initial.state])}</span> ${esc(fstate.initial.reason)}${fstate.recovery.state !== fstate.initial.state ? ` <br>After declared recovery: <span class="dp-state ${fstate.recovery.state}">${esc(STATE_LABEL[fstate.recovery.state])}</span>` : ''}</p>` : ''}
  <dl class="cm-dl">${k('Runs', ls.map(l => `${l.replicas} ${l.role} · ${esc(title(l.zone))} <button type="button" class="cm-link inline" data-rt-action="placement" data-rt-id="${esc(l.id)}">edit</button>`).join('<br>'))}${k('Copies', `${p.minReady} ready needed · ${p.maxReplicas} at most${p.capacityConfirmed ? '' : ' · capacity unconfirmed'}`)}${k('State', p.stateMode === 'Unspecified' ? '' : esc(p.stateMode))}${k('Recovery', p.recovery === 'Unspecified' ? '' : esc(p.recovery) + (p.rto ? ' · back in ' + esc(p.rto) + ' min' : '') + (p.rpo ? ' · loses ≤ ' + esc(p.rpo) + ' min' : ''))}${p.stateMode === 'Stateful service' ? k('Write authority', esc(p.fencing)) + k('Protected copy', esc(p.backupPlan) + (p.backupZone ? ' · ' + esc(title(p.backupZone)) : '')) : ''}${k('Monitoring', esc(p.monitoring))}${k('Runbook', esc(p.runbook))}${k('Requires', needs.map(dep).join(''), false)}${k('Required by', by.map(d => `<button type="button" class="cm-link" data-sel="${esc(d.from)}">${esc(title(d.from))}</button>`).join(''), false)}${routes.length ? k('Runtime paths', routes.map(r => `<button type="button" class="cm-link" data-rt-action="path" data-rt-id="${esc(r.id)}">${esc(r.ref)} ${esc(r.title)} · ${esc(r.mode)}${r.failure ? '' : ' · <i>no failure response</i>'}</button>`).join(''), false) : ''}${k('Controls', (src?.controls || []).map(c => esc(c.ref + ' ' + c.title)).join('<br>'), false)}</dl>
  <div class="cm-acts"><button type="button" class="cm-btn primary" data-rt-action="edit-plan" data-rt-id="${esc(id)}" data-rt-step="0">${icon('edit')}Edit operating plan</button>${!ls.length ? `<button type="button" class="cm-btn primary" data-dp="place" data-id="${esc(id)}">Place it</button>` : ''}<button type="button" class="cm-btn" data-rt-action="edit-plan" data-rt-id="${esc(id)}" data-rt-step="1">Recovery</button><button type="button" class="cm-btn" data-rt-action="edit-plan" data-rt-id="${esc(id)}" data-rt-step="2">Operate &amp; change</button>
   ${ls.length && V.zones.some(z => !p.domains.includes((z.domain || '').toLowerCase().trim())) ? `<button type="button" class="cm-btn gold" data-dp="propose" data-key="isolate" data-id="${esc(id)}">Propose a standby elsewhere</button>` : ''}${p.recovery === 'Unspecified' || !p.recoveryPlan ? `<button type="button" class="cm-btn gold" data-dp="propose" data-key="recover" data-id="${esc(id)}">Propose recovery wording</button>` : ''}${!p.monitoring || !p.runbook ? `<button type="button" class="cm-btn gold" data-dp="propose" data-key="operate" data-id="${esc(id)}">Propose operating basics</button>` : ''}
   <button type="button" class="cm-btn" data-brain-launch="mind">${icon('mind')}Mind Factory</button><a class="cm-btn" href="${esc(projectURL('/?chapter=10&tab=work&object=' + encodeURIComponent(id)))}">Open in Work</a></div></section>`;
}
function specimenZone(id) {
  const z = V.zones.find(x => x.id === id), placed = F.rows.filter(r => r.cells.has(id)), b = V.M.byId.get(z.boundary);
  const same = V.domains.find(d => d.zones.includes(id));
  return `<section class="cm-spec"><h4>Runtime zone</h4><p class="cm-spec-t"><b>${esc(z.ref)} · ${esc(z.title)}</b></p><dl class="cm-dl"><div class="${z.domain ? '' : 'miss'}"><dt>Failure domain</dt><dd>${esc(z.domain || 'Not declared')}${same && same.zones.length > 1 ? ' · shared with ' + esc(same.zones.filter(x => x !== id).map(title).join(', ')) : ''}</dd></div><div class="${z.isolation ? '' : 'miss'}"><dt>Isolation</dt><dd>${esc(z.isolation || 'Not recorded')}</dd></div><div><dt>Trust boundary</dt><dd>${esc(b ? b.title : 'Not assigned')}</dd></div><div><dt>Owner</dt><dd>${esc(z.owner || 'Not named')}</dd></div><div><dt>Runs here</dt><dd>${placed.map(r => `<button type="button" class="cm-link" data-sel="${esc(r.members[0] || r.id)}">${esc(r.title)}</button>`).join('') || '<em>Nothing yet</em>'}</dd></div></dl>
  <div class="cm-acts"><button type="button" class="cm-btn primary" data-rt-action="zone" data-rt-id="${esc(id)}">${icon('edit')}Edit zone</button><button type="button" class="cm-btn gold" data-dp="fail" data-id="${esc(id)}">${icon('fail')}What if it fails?</button></div></section>`;
}
function specimenParty(id) {
  const rs = V.routes.filter(r => r.to === id || r.from === id);
  return `<section class="cm-spec"><h4>External participant</h4><p class="cm-spec-t"><b>${esc(title(id))}</b></p><p>Outside the environment. Parts reach it through runtime paths; its own availability is the provider's.</p><dl class="cm-dl">${rs.map(r => `<div class="${r.failure ? '' : 'miss'}"><dt>${esc(r.ref)}</dt><dd>${esc(r.title)} · ${esc(r.mode)}<br>${esc(r.failure || 'No response recorded for when it is down')}<br><button type="button" class="cm-link" data-rt-action="path" data-rt-id="${esc(r.id)}">Edit runtime path ${esc(r.id)}</button> · <a class="cm-link inline" href="${esc(projectURL('/?chapter=8&tab=model&object=' + encodeURIComponent(r.contract)))}">contract in Chapter 8</a></dd></div>`).join('')}</dl></section>`;
}
function specimenGroup(r) {
  return `<section class="cm-spec"><h4>${r.kind === 'module' ? 'Module' : 'Platform services'}</h4><p class="cm-spec-t"><b>${esc(r.title)}</b></p><dl class="cm-dl"><div><dt>Parts</dt><dd>${r.members.map(id => `<button type="button" class="cm-link" data-sel="${esc(id)}">${esc(title(id))}${V.plans.get(id).placed ? '' : ' <i>· not placed</i>'}</button>`).join('')}</dd></div></dl><div class="cm-acts">${r.kind === 'module' ? `<button type="button" class="cm-btn primary" data-dp="dissect" data-id="${esc(r.module)}">${icon('dissect')}Open this module</button>` : `<button type="button" class="cm-btn primary" data-dp="depth" data-id="all">Show every platform service</button>`}</div></section>`;
}
function reading() {
  if (diagramView()) return NT.readingHTML();
  if (!V.env) return `<section><h4>Start here</h4><p>No environment is designed yet. Create one to say where the design runs.</p><div class="cm-acts"><button type="button" class="cm-btn primary" data-rt-action="new-environment">New environment</button></div></section>`;
  if (!failing()) return `<section><h4>Reading this view</h4><p>Each row is a part that must run; each column is a zone of <b>${esc(V.env.title)}</b>. Zones under one bracket share a failure domain and fail together. A filled dot is a running copy, a ring a standby.</p><p>Read a row across to see where a part runs — and where it does not. Switch to <b>Flow</b> to see what each part needs, or to <b>What fails together</b> to remove a zone.</p></section>`;
  if (!FA) return '';
  if (FA.error) return `<section><h4>What fails together</h4><p>${esc(FA.error)}</p></section>`;
  const r = FA.result, comps = r.rows.filter(x => V.plans.get(x.id)?.kind === 'component'), stop = comps.filter(x => ['unavailable', 'degraded'].includes(x.initial.state)), unk = comps.filter(x => x.initial.state === 'unknown'), rec = r.rows.filter(x => x.recovery.state === 'conditional');
  return `<section><h4>What fails together</h4><p><b>${esc(FA.scenario.title)}.</b> ${stop.length} of ${comps.length} components stop or degrade${unk.length ? `, and ${unk.length} cannot be judged because ${unk.length === 1 ? 'it is' : 'they are'} not placed with enough copies` : ''}. ${rec.length ? rec.length + ' part' + (rec.length === 1 ? ' has' : 's have') + ' a declared recovery candidate — unproven until exercised.' : 'No part has a declared recovery candidate.'}</p>${r.assessments?.length ? `<p class="cm-muted">Quality scenarios at stake: ${r.assessments.map(a => esc(a.title)).join('; ')}.</p>` : ''}${r.security?.some(s => s.state === 'operating path affected') ? `<p class="cm-muted">Controls whose enforcement path is affected: ${r.security.filter(s => s.state === 'operating path affected').map(s => esc(s.ref)).join(', ')}.</p>` : ''}${r.externalPaths?.length ? `<p class="cm-muted">External provider paths are not exercised by this scenario: ${esc(r.externalPaths.join(', '))}.</p>` : ''}<p class="cm-muted">The chapter's own simulation of declared copies and dependencies. It does not establish live failover.</p></section>`;
}
function insightsHTML() {
  const list = deployInsights(V, scope()).slice(0, 8);
  if (!list.length) return '';
  return `<section><h4>What the model shows<span>${list.length}</span></h4>${list.map(x => `<button type="button" class="cm-ins ${x.kind}" data-sel="${esc(x.id || '')}" ${x.scenario ? `data-scenario="${esc(x.scenario)}"` : ''}><span>${esc(x.text)}</span>${x.ask ? `<small>Ask: ${esc(x.ask)}</small>` : ''}</button>`).join('')}<p class="cm-muted">Drawn from recorded plans, placements, zones and paths. Prompts for review, not verdicts.</p></section>`;
}
function findingsHTML() {
  const sc = scope(), inS = id => sc.kind === 'system' || id === sc.id || (sc.kind === 'module' && V.M.mod.get(V.plans.get(id)?.asset) === sc.id);
  const fs = V.findings.filter(f => V.plans.has(f.objectId) ? inS(f.objectId) : sc.kind === 'system');
  if (!fs.length) return '';
  const groups = new Map();
  for (const f of fs) { const k = f.code.startsWith('unbound-') ? 'Place security enforcement' : f.title.replace(/RUN-\d+|ZON-\d+|ENV-\d+/g, '…'); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
  return `<section><h4>Chapter 10 checks<span>${fs.length}</span></h4>${[...groups].sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([k, g]) => `<button type="button" class="cm-fg ${g.some(f => f.level === 'error') ? 'error' : ''}" data-sel="${esc(g[0].objectId)}"><b>${esc(k)}</b><small>${g.length} · ${esc([...new Set(g.map(f => V.plans.get(f.objectId)?.title || V.zones.find(z => z.id === f.objectId)?.title || f.objectId))].slice(0, 3).join(', '))}${g.length > 3 ? '…' : ''}</small></button>`).join('')}<a class="cm-muted" href="${esc(projectURL('/?chapter=10&tab=validate&validate=readiness'))}">All checks on Validate →</a></section>`;
}
function panel() {
  const box = root.querySelector('.cm-panel');
  solMark(root, project(), 10);
  if (!S.panel) { box.innerHTML = ''; return; }
  const s = S.sel;
  let spec = '';
  if (s && V.plans.has(s)) spec = specimenPlan(s) + specPanelHTML(project(), s);
  else if (s && V.zones.some(z => z.id === s)) spec = specimenZone(s);
  else if (s && T(s) === 'party') spec = specimenParty(s);
  else if (s) { const r = F?.rows?.find(x => x.id === s); if (r && (r.kind === 'module' || r.kind === 'platform-group')) spec = specimenGroup(r); }
  if (!spec && s && drawn(s)) spec = NT.specimenHTML(s);
  box.innerHTML = solInto(spec, solSection(project(), 10, s)) + reading() + (V.env ? insightsHTML() + findingsHTML() : '');
}
function walkBar() {
  if (diagramView()) { root.querySelector('.cm-walk').innerHTML = ''; return; }
  const bar = root.querySelector('.cm-walk');
  if (!failing() || !FA?.result) { bar.innerHTML = `<p class="cm-walk-text">${V.env ? 'Select a part to see where it runs, what it needs and how it recovers; select a zone to ask what happens if it fails.' : ''}</p>`; return; }
  const cur = S.walk >= 0 ? STAGES[S.walk] : null, lit = stageLit();
  const n = lit ? (lit.stage === 'zones' ? FA.failed.size : lit.rows.size) : 0;
  bar.innerHTML = `<button type="button" class="cm-btn" data-dp="walk-prev" aria-label="Previous stage" ${S.walk <= 0 ? 'disabled' : ''}>‹</button><button type="button" class="cm-btn" data-dp="walk-next">${S.walk < 0 ? icon('play') + '<span>Walk the failure</span>' : S.walk >= STAGES.length - 1 ? 'Done' : 'Next ›'}</button><p class="cm-walk-text">${cur ? `<b>${S.walk + 1} / ${STAGES.length} · ${esc(cur[1])}</b> ${esc(stageText(cur[0], n))}` : 'Four stages: the zones fail, parts lose their copies, the failure spreads through what parts need, and what could recover.'}</p>${S.walk >= 0 ? '<button type="button" class="cm-btn icon" data-dp="walk-stop" aria-label="Stop the walk-through">×</button>' : ''}`;
}
function stageText(st, n) {
  if (st === 'zones') return `${[...FA.failed].map(title).join(' and ')} ${FA.failed.size === 1 ? 'is' : 'are'} removed${FA.scenario.mode === 'domain' ? ' — every zone in the shared failure domain' : ''}.`;
  if (st === 'direct') return n ? `${n} row${n === 1 ? '' : 's'} lose${n === 1 ? 's' : ''} active copies in the failed zone.` : 'No row loses its copies here.';
  if (st === 'carried') return n ? `${n} more row${n === 1 ? '' : 's'} stop${n === 1 ? 's' : ''} or degrade${n === 1 ? 's' : ''} because something ${n === 1 ? 'it requires' : 'they require'} has stopped or is not placed.` : 'Nothing else is stopped by a dependency.';
  return n ? `${n} row${n === 1 ? ' has' : 's have'} a declared recovery candidate: capacity, state authority and a written plan exist. Promotion and consistency are unproven.` : 'No part has a declared recovery candidate. The recovery editor says what is missing.';
}

// ---------------------------------------------------------------- interaction

function revealSelection() {
  if (diagramView()) { const b = NT.layout()?.nodes.find(n => n.id === S.sel); if (b) stage.reveal(b.x, b.y, b.w, b.h); return; }
  if (!S.sel || !L) return;
  const rid = F.rowOf(S.sel) || S.sel, r = L.rows.find(x => x.id === rid);
  if (r) stage.reveal(L.x0, r.y, Math.min(600, L.W - L.x0), r.h);
}
function select(id, {reveal = false, pl = null} = {}) {
  S.sel = id || null; S.pl = pl; S.walk = -1;
  const p = project(), target = S.sel && !S.sel.startsWith('MOD:') && S.sel !== 'PLATFORM' ? S.sel : null;
  if (p) { try { mountBrainContext(p, {id: target || solOwner(p, S.sel) || 'project', chapter: 10}, 'model'); } catch { /* assistance is optional */ } }
  if (window.history) { const url = new URL(location.href); if (target) url.searchParams.set('object', target); else url.searchParams.delete('object'); window.history.replaceState(window.history.state, '', url.pathname + url.search); }
  if (S.sel && !S.panel) S.panel = true;
  save(); render();
  if (reveal) revealSelection();
}
function setScope(sc) {
  const r = deployScope(V, sc);
  S.scope = r.kind === 'system' ? {kind: 'system'} : {kind: r.kind, id: r.id};
  S.walk = -1; fitPending = true; save(); render();
}
function up() { const sc = scope(); if (sc.kind === 'part') { const m = V.M.mod.get(V.plans.get(sc.id)?.asset); setScope(m ? {kind: 'module', id: m} : {kind: 'system'}); } else if (sc.kind === 'module') setScope({kind: 'system'}); }
function dissect(id) { if (!id) return; if (id.startsWith('MOD:')) id = id.slice(4); setScope(T(id) === 'module' ? {kind: 'module', id} : {kind: 'part', id}); }
// Chapter 10's own editors and proposals do every change.
function studioAction(action, data = {}) {
  const b = document.createElement('button'); b.type = 'button'; b.hidden = true; b.dataset.rtAction = action;
  for (const [k, v] of Object.entries(data)) b.dataset[k] = v;
  document.body.append(b); b.click(); b.remove();
}
function place(planId) { studioAction('inspect', {rtId: planId}); setTimeout(() => studioAction('placement'), 60); }
function propose(key, id) { try { studio()?.preview?.(key, id); } catch { /* the studio reports its own errors */ } }

function bind() {
  solChapterBind(root, 10, {refresh: solRefresh});
  root.addEventListener('keydown', e => { NT.keydown(e); });
  root.addEventListener('click', e => {
    if (root.dataset.suppress) return;
    if (NT.handle(e)) return;
    const add = root.querySelector('.cm-add');
    if (add?.open && !e.target.closest('.cm-add > summary')) add.open = false;
    if (e.target.closest('[data-brain-launch],[data-rt-action],a')) return;
    const a = e.target.closest('[data-dp]');
    if (a && !a.disabled) {
      const k = a.dataset.dp;
      if (k === 'view') { S.view = a.dataset.id; S.walk = -1; save(); render(); return; }
      if (k === 'lens') { S.lens = a.dataset.id; save(); render(); return; }
      if (k === 'depth') { S.depth = a.dataset.id; fitPending = true; save(); render(); return; }
      if (k === 'scope') { setScope(a.dataset.kind === 'module' ? {kind: 'module', id: a.dataset.id} : {kind: 'system'}); return; }
      if (k === 'dissect') { dissect(a.dataset.id); return; }
      if (k === 'explore') { cbs.explore?.(10); return; }
      if (k === 'expand') { const on = !document.body.classList.contains('cm-expanded'); document.body.classList.toggle('cm-expanded', on); a.setAttribute('aria-pressed', String(on)); sizeModel(root, 'cm-expanded'); fitPending = true; setTimeout(render, 30); return; }
      if (k === 'panel') { S.panel = !S.panel; save(); fitPending = true; render(); setTimeout(() => { fitPending = true; render(); }, 30); return; }
      if (k === 'key') { const key = root.querySelector('.cm-key'); key.classList.toggle('cm-min'); a.setAttribute('aria-expanded', String(!key.classList.contains('cm-min'))); return; }
      if (k === 'fit') { stage.fitAll(); return; }
      if (k === 'zin' || k === 'zout') { const {w, h} = stage.box(); stage.zoomAt(stage.cam.z * (k === 'zin' ? 1.15 : 1 / 1.15), w / 2, h / 2); return; }
      if (k === 'place') { place(a.dataset.id); return; }
      if (k === 'propose') { propose(a.dataset.key, a.dataset.id); return; }
      if (k === 'fail') { const s = V.scenarios.find(x => x.zone === a.dataset.id && x.mode === 'zone'); if (s) { S.scenario = s.id; S.view = 'failure'; S.walk = -1; save(); render(); } return; }
      if (k === 'walk-next') { if (S.walk >= STAGES.length - 1) { S.walk = -1; } else S.walk++; render(); return; }
      if (k === 'walk-prev') { S.walk = Math.max(0, S.walk - 1); render(); return; }
      if (k === 'walk-stop') { S.walk = -1; render(); return; }
      if (k === 'noop') return;
    }
    const ins = e.target.closest('[data-scenario]');
    if (ins) { S.scenario = ins.dataset.scenario; S.view = 'failure'; }
    const zh = e.target.closest('[data-zone]');
    if (zh) { const id = zh.dataset.zone; if (failing()) { const s = V.scenarios.find(x => x.zone === id && x.mode === 'zone'); if (s && s.id !== S.scenario) { S.scenario = s.id; S.walk = -1; save(); } } select(S.sel === id && !failing() ? null : id); return; }
    const row = e.target.closest('[data-row]');
    if (row) {
      const id = row.dataset.row, now = Date.now(), twice = lastRowClick.id === id && now - lastRowClick.t < 420;
      lastRowClick = {id, t: now};
      const r = F.rows.find(x => x.id === id);
      if (twice) { lastRowClick = {id: null, t: 0}; if (r?.kind === 'module') dissect(r.module); else if (r?.plan || r?.kind === 'party') dissect(r.plan || id); return; }
      select(r?.plan || id); return;
    }
    const s = e.target.closest('[data-sel]');
    if (s && s.dataset.sel) { e.stopPropagation(); select(s.dataset.sel, {reveal: !!s.closest('.cm-panel'), pl: s.dataset.pl || null}); return; }
    if (e.target.closest('.cm-stage') && !e.target.closest('.cm-heads,.cm-rail,.cm-zoom,.cm-key') && (S.sel || S.walk >= 0)) { S.walk = -1; select(null); }
  });
  root.addEventListener('change', e => { if (NT.change(e)) return; if (e.target.dataset.dpField === 'scenario') { S.scenario = e.target.value; S.walk = -1; save(); render(); } });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !root?.isConnected || document.querySelector('dialog[open]')) return;
    const a = document.activeElement;
    if (a && a !== document.body && !root.contains(a)) return;
    if (a?.closest?.('select,details[open],textarea')) return;
    if (S.walk >= 0) { S.walk = -1; render(); }
    else if (S.sel) select(null);
    else if (scope().kind !== 'system') up();
    else if (document.body.classList.contains('cm-expanded')) root.querySelector('[data-dp="expand"]').click();
    else return;
    e.preventDefault();
  });
  root.addEventListener('pointerleave', () => { root.querySelector('.cm-tip').hidden = true; });
  window.addEventListener('resize', () => { if (!root?.isConnected) return; clearTimeout(bind._r); bind._r = setTimeout(() => { sizeModel(root, 'cm-expanded'); render(); }, 120); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!root?.isConnected || !L) return; clearTimeout(bind._ro); bind._ro = setTimeout(() => { const w = stage.box().w; if (Math.abs(w - (bind._w || 0)) > 24) { bind._w = w; fitPending = true; render(); } }, 90); }).observe(root.querySelector('.cm-stage'));
}
function tip(e) {
  const box = root.querySelector('.cm-tip'), t = e.target.closest?.('.dp-cell,.dp-row,.dp-zh,.nt-node');
  if (t?.dataset?.ntNode && root.contains(t)) { box.innerHTML = NT.tipHTML(t.dataset.ntNode); box.hidden = !box.innerHTML; if (!box.hidden) placeTip(box, e); return; }
  if (!t || !root.contains(t)) { box.hidden = true; return; }
  let html = '';
  if (t.dataset.row) { const r = F.rows.find(x => x.id === t.dataset.row); html = `<b>${esc(r.title)}</b>${r.plan ? esc(describePlan(V, r.plan)) : r.kind === 'party' ? 'Outside the environment.' : esc(r.planned + ' parts')}<small class="h">Double-click to focus on it</small>`; }
  else if (t.dataset.zone) { const z = V.zones.find(x => x.id === t.dataset.zone); html = `<b>${esc(z.title)}</b>${esc(z.domain || 'Failure domain not declared')}<small class="h">${failing() ? 'Select to fail this zone' : 'Select to see what runs here'}</small>`; }
  else if (t.dataset.sel && V.plans.has(t.dataset.sel)) html = `<b>${esc(V.plans.get(t.dataset.sel).title)}</b>${esc(describePlan(V, t.dataset.sel))}`;
  if (!html) { box.hidden = true; return; }
  box.innerHTML = html; box.hidden = false; placeTip(box, e);
}

export function deployDebug() { return {S: {...S}, V, F, L, FA}; }
