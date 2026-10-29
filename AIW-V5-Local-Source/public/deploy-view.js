// Chapter 10 Model — Deployment / runtime.
//
// Two architecture models of one environment, drawn from recorded plans, placements and zones:
// - Deployment: each deployable part is a row, each zone a column; zones that share a failure
//   domain stand together. A dot is a running copy. Dependencies run in their own gutter, on rails: one line
//   and one arrow per part that something needs, with a mark at the row of each part that needs it.
// - If a zone fails (round 11; What fails together until then): the same grid with a zone or failure domain removed, using the
//   chapter's own failure simulation: what stops, what it takes with it, what could recover.
// Sliced like the anatomy (whole system → module → part), read through the Operation, Flow and
// Protection lenses, and edited only through the Chapter 10 editors and runtime proposals.
import {deploySource, foldDeploy, deployScope, deployInsights, describePlan, failureOf, defaultDepth, STATE_LABEL, STATE_RANK} from './deploy-model.js';
import {runtimeEnvironmentStamp} from './runtime-domain.js';
import {walkVisits, recordModelWalk} from './model-walk.js';
import {deployLayout, deployHead, DEP} from './deploy-layout.js';
import {modelChrome,modelStage, connectionAttrs, sizeModel, placeTip, drawerDialog, toolsHTML, anatomyOrder, roundPath, headPath, nextFrame, companionHost, listen, companionOpen, releaseCompanion, inCompanion, insightsSection, focusKey, refocus, announceObject} from './model-stage.js';
import {projectPreferenceKey, projectURL, currentProject as project, onProjectSwitch, scopedProject, followShell, ownScope} from './project-context.js';
import {mountBrainContext} from './brain-context-ui.js';
import {specPanelHTML, runsOnLabel, productLabels} from './spec-panel.js';
import {solChapterMount, solChapterBind, solSection, solInto, solMark, solOwner} from './chapter-sol.js';
import {createNotation} from './notation-view.js';
import {modelHeaderHTML} from './instrument-tray.js';
import {chapterLenses} from './lens-vocabulary.js';
import {esc} from './html-escape.js';
import {readStoredObject} from './util.js';
import {scaleReadings, fmtN} from './desk-capacity.js';
// Round 24 (D-24-08): the model and its pictures read the shell's module scope (project-context.js scopedProject: the saved
// document without one); Sol, proposals and editors keep the saved document.
// A model change previewed in this chapter shows its banner above the model (as in Chapters 4–8); without
// it the proposal had no visible entry point here, since the page leaves the banner to the chapter model.
const pending = () => { const i = window.aiwInterfaceImpact; return i?.pending && i.previewInChapter?.(10) ? i : null; };

// Sol's advice changes the project only through a store command; the view then reads the new document.
const solRefresh = () => { if (root?.isConnected) mountChapterModel({id: pageSel}, cbs); };
const studio = () => window.aiwLogicalStudio;
const PATHS = {diagram: 'M4 4h6v5H4zM14 4h6v5h-6zM9 15h6v5H9zM7 9v3h10V9M12 12v3', operation: 'M3 12h4l2-5 4 10 2-5h6', flow: 'M3 12h13m-4-5 5 5-5 5M3 5h6M3 19h6', protection: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z', deploy: 'M3 4h18v6H3zM3 14h8v6H3zM13 14h8v6h-8z', fail: 'M12 3 2 21h20L12 3zm0 7v4m0 3h.01', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', panel: 'M3 4h18v16H3zM15 4v16', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', plus: 'M12 5v14M5 12h14', spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z', mind: 'm3 7 9-4 9 4-9 4-9-4m0 5 9 4 9-4m-18 5 9 4 9-4', edit: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4', dissect: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14M21 21l-5-5M8 11h6', play: 'M7 4v16l13-8z'};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[n] || PATHS.deploy}"/></svg>`;
// The chapter's lenses, its subset of the one vocabulary (lens-vocabulary.js), each with the chapter's own question.
const LENSES = chapterLenses({
  operation: 'How many copies run where, and how each part recovers.',
  flow: 'What each part needs in order to run: platform services, other parts and external systems.',
  protection: 'Which trust boundary each zone sits in, and which controls each part enforces.'
});
const STAGES = [['zones', 'The zones fail'], ['direct', 'Parts that lose their copies'], ['carried', 'Parts stopped by what they need'], ['recovery', 'What could recover']];

let root = null, V = null, lastDoc = null, lastEnv = null, cbs = {}, F = null, L = null, FA = null, fitPending = true, stage = null, lastRowClick = {id: null, t: 0}, pageSel;
const visitedWalk = walkVisits();
const walkIdentity = () => JSON.stringify([project()?.id, V?.env?.id, V?.env?.id ? runtimeEnvironmentStamp(project(), V.env.id) : '', S.scenario]);
let NT = null;
const freshView = () => ({view: 'deploy', lens: 'operation', scope: {kind: 'system'}, depth: 'auto', scenario: null, sel: null, pl: null, panel: true, walk: -1});
let S = freshView();
// The standard diagram (notation-view.js) and the elements only it draws.
// The standard diagram and the shared views (Layers, Table, Matrix, Whole design) are drawn by notation-view.js.
const diagramView = () => !!NT && NT.owns(S.view);
const drawn = id => diagramView() && !!NT?.diagram()?.nodes.some(n => n.id === id);
const pref = () => projectPreferenceKey('aiw-deploy-model-v1');
function save() { try { localStorage.setItem(pref(), JSON.stringify({view: S.view, lens: S.lens, scope: ownScope(S.scope), depth: S.depth, scenario: S.scenario, sel: S.sel, panel: S.panel})); } catch { /* preferences are optional */ } }
// This browser's preferences for the chapter's model in the project on screen (read when the model is first drawn,
// and again when another project opens in place).
function restorePreferences() {
  const v = readStoredObject(pref());
  for (const k of ['view', 'lens', 'depth', 'scenario', 'sel']) if (typeof v[k] === 'string') S[k] = v[k];
  if (v.scope && typeof v.scope === 'object') S.scope = v.scope;
  if (typeof v.panel === 'boolean') S.panel = v.panel;
  S.view = NT.settle(S.view);
  if (!LENSES.some(l => l.id === S.lens)) S.lens = 'operation';
}
// Another project opened in place (round 4, A): the model leaves and forgets the last project's view — its view, lens,
// scope, depth, panel, selection and walk — then reads the new project's preferences for this chapter; the next mount
// rebuilds from the new project's document. The picture's own choices are reset by its notation (notation-view.js).
onProjectSwitch(() => { leaveChapterModel(); S = freshView(); V = null; lastDoc = null; pageSel = undefined; fitPending = true; lastEnv = null; if (NT) restorePreferences(); });

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
    stage = modelStage(root, {headHeight: () => (diagramView() ? 0 : deployHead()), railWidth: l => l.rail || 0, onHover: tip});
    stage.bind(); bind();
    // The standard diagram shares the stage, the companion and the selection with the chapter's own views.
    // The Diagram nests zones inside their trust boundary inside the environment this page has selected (D2-07).
    NT = createNotation({chapter: 10, root, stage, project: scopedProject, onSelect: id => select(id), environment: () => envId() || V?.env?.id || null});
    NT.addViews('dp');
    NT.onChange = full => { if (full) fitPending = true; render(); };
    NT.bindDrag();
    restorePreferences();
    // The address may open the model on a view (a deep link, and the rendered checks).
    { const mv = window.aiwChapterModels?.takeView?.(10) || new URLSearchParams(location.search).get('model'); S.view = mv ? NT.settle(mv, 'link') : NT.settle(S.view); }
  } else {
    // A route the shell follows in place may name the view too (round 4, A: workspace-ux.js routeModel).
    const mv = window.aiwChapterModels?.takeView?.(10); if (mv) S.view = NT.settle(mv, 'link');
  }
  const first = !V;
  if (host.firstElementChild !== root) host.prepend(root);
  document.body.classList.add('cm-active');
  const e = envId();
  const q = scopedProject(); followShell(S);
  if (q !== lastDoc || e !== lastEnv || !V) { lastDoc = q; lastEnv = e; rebuild(q, e); }
  // A link from another surface (the anatomy's "Open in Chapter 10 model") lands on its plan,
  // placement or zone, and so does a selection made elsewhere on the page.
  const placement = id => V.placements.find(l => l.id === id);
  const selectable = id => !!id && (V.plans.has(id) || V.planOfAsset.has(id) || V.zones.some(z => z.id === id) || !!placement(id));
  const adopt = id => { const l = placement(id); S.sel = l ? l.plan : V.planOfAsset.get(id) || id; S.pl = l ? l.id : null; nextFrame(() => revealSelection()); };
  if (first && V) { const want = window.aiwChapterModels ? (window.aiwChapterModels.takeLink(10) || selection?.subject || null) : new URLSearchParams(location.search).get('object'); if (selectable(want)) adopt(want); }
  else if (V && pageSel !== undefined && selection?.id !== pageSel && selectable(selection?.id)) adopt(selection.id);
  pageSel = selection?.id ?? null;
  render();
  sizeModel(root, 'cm-expanded');
}
export function leaveChapterModel() {
  document.body.classList.remove('cm-active', 'cm-expanded');
  releaseCompanion(root);
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
  return `${modelHeaderHTML(10, 'dp', `<details class="cm-add"><summary class="cm-btn" aria-label="Add to the model">${icon('plus')}<span>Add</span></summary><div><button type="button" data-rt-action="zone">New zone</button><button type="button" data-rt-action="new-environment">New environment</button><p>Place a part from its row. Saved changes go through the Chapter 10 editors, each with its own review confirmation.</p></div></details>
    <button type="button" class="cm-btn icon" data-dp="expand" aria-pressed="false" aria-label="Expand the model" title="Expand">${icon('expand')}</button>
    <button type="button" class="cm-btn icon" data-dp="panel" aria-pressed="true" aria-label="Show the companion panel" title="Companion">${icon('panel')}</button>`, 'Deployment & runtime')}
  <div class="cm-bar" data-model-slot="commands"><nav class="cm-crumbs" aria-label="Model scope"></nav><label class="cm-scn"><span>Design scenario</span><select data-dp-field="scenario" aria-label="Choose a declared failure scenario"></select></label><div class="cm-lenses" role="group" aria-label="Lens"></div><div class="cm-depth" role="group" aria-label="Rows"></div></div>
  <div class="cm-banner" data-model-slot="notice"></div>
  <div class="cm-body" data-model-slot="content"><div class="cm-stage" tabindex="0" aria-label="Deployment canvas. Drag or scroll to move; Ctrl or Command and scroll to zoom.">
    <div class="cm-world"><svg class="cm-svg" aria-hidden="true"></svg><div class="cm-html"></div></div>
    <div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div>
    
    
  </div><aside class="cm-panel" aria-label="Companion"></aside></div>
  <footer class="cm-walk" data-model-slot="status" aria-label="Walk through the failure"><div class="cm-walk-in"></div><p class="cm-state" role="status" aria-live="polite"></p>${toolsHTML('dp')}</footer><div class="cm-tip" role="tooltip" hidden></div>`;
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
  S.view = NT.settle(S.view);
  if (!V) { root.querySelector('.cm-html').innerHTML = '<p class="cm-empty">The deployment model could not be prepared for this project.</p>'; return; }
  // A redraw (a new stage width redraws the companion) keeps keyboard focus where it was, as the other chapters' views do.
  const fk = focusKey(root);
  root.classList.remove('cm-lens-operation', 'cm-lens-flow', 'cm-lens-protection');
  root.classList.add('cm-lens-' + S.lens);
  root.classList.toggle('dp-failing', failing());
  root.querySelector('.cm-body').classList.toggle('no-panel', !S.panel);
  root.classList.toggle('nt-active', diagramView());
  if (diagramView()) {
    // The standard diagram: the notation module draws; the chapter keeps its chrome, companion and camera.
    L = NT.render({sel: S.sel, view: S.view, viewW: stage.box().w});
    root.querySelector('.cm-heads-in').innerHTML = ''; root.querySelector('.cm-rail-in').innerHTML = '';
    chromeDiagram(); panel(); walkBar(); modelChrome(root);
    stage.use(L, 'diagram|' + (NT.scene()?.id || '') + '|' + NT.arrangement());
    if (fitPending) { fitPending = false; NT.fit(); } else stage.clamp();
    stage.apply(); refocus(root, fk); return;
  }
  root.querySelector('[data-dp="panel"]').setAttribute('aria-pressed', String(S.panel)); drawerDialog(root, '[data-dp="panel"]', S.panel);
  // Geometry depends on the rows and the stage width — never on the lens or the failure explored.
  F = foldDeploy(V, scope(), depth());
  L = deployLayout(F, {viewW: Math.max(640, stage.box().w), compactTray: !S.unplaced});
  FA = failing() ? failureOf(V, S.scenario) : null;
  const world = root.querySelector('.cm-world'), svg = root.querySelector('.cm-svg');
  world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
  svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
  const hl = highlight();
  svg.innerHTML = defs() + worldSVG(hl);
  root.querySelector('.cm-html').innerHTML = worldHTML(hl);
  heads(); rail(hl); chrome(); panel(); walkBar(); NT.ownView(); modelChrome(root);
  stage.use(L, JSON.stringify([S.view, S.scope?.kind || 'system', S.scope?.id || '', depth(), lastEnv]));
  if (fitPending) { fitPending = false; stage.fit(); } else stage.clamp();
  stage.apply();
  refocus(root, fk);
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
  return `<defs><pattern id="dp-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v8" stroke="#e7b9ae" stroke-width="3"/></pattern></defs>`;
}
function worldSVG(hl) {
  const out = [], {top} = L;
  if (L.env) out.push(`<rect class="dp-env" x="${L.env.x}" y="${L.env.y}" width="${L.env.w}" height="${L.env.h}" rx="12"/>`);
  for (const z of L.zones) out.push(`<rect class="dp-zcol${hl.zones.has(z.id) ? ' lit' : ''}" x="${z.x}" y="${top - 4}" width="${z.w}" height="${L.H - top - 14}" rx="8"/>`);
  if (FA?.failed) for (const z of L.zones) if (FA.failed.has(z.id)) out.push(`<rect class="dp-zfail" x="${z.x}" y="${top - 4}" width="${z.w}" height="${L.H - top - 14}" rx="8" fill="url(#dp-hatch)"/>`);
  out.push(`<rect class="dp-tray" x="${L.trayX}" y="${top - 4}" width="${L.trayWidth}" height="${L.H - top - 14}" rx="8"/>`);
  for (const g of L.groups) out.push(`<rect class="dp-group" x="${L.rail}" y="${g.y}" width="${L.W - L.rail - 6}" height="${g.h}"/>`);
  for (const r of L.rows) out.push(`<line class="dp-sep" x1="${L.rail}" x2="${L.W - 8}" y1="${r.y + r.h}" y2="${r.y + r.h}"/>`);
  out.push(railsSVG(hl));
  return out.join('');
}
// Dependencies on rails (round 10, V6). One line and one arrow per part that something needs; at the row of each part
// that needs it, one mark: a filled dot (requires), the dot with a dashed tick across the rail towards the row's centre
// (buffered: degrades without it), or a gold diamond (a runtime path to or from a system outside). No mark is a ring.
// While something is selected or walked, the rails and their arrows recede and every lit link is drawn whole, on its
// own and on top (its mark and arrow with it): a run of a rail is then lit exactly where a lit link travels it and dim
// wherever none does, so a selection lights its own routes and never another link's stretch of a shared rail.
// Failure-carrying links are drawn the same way, over the lit ones.
const MARK = {R: 2.3, TICK: 4, HEAD: 7};
function linkState(hl, a) {
  const lit = hl.arcs.has(a.id), carries = !!FA && a.link.deps.some(d => FA.carries.has(d));
  return {lit, carries, cls: `${lit ? ' lit' : hl.on && !carries ? ' dim' : ''}${carries ? ' carries' : ''}${a.link.dim ? ' out' : ''}`};
}
function markSVG(r, d, a, cls, big = 0) {
  const x = r.x, y = d.y, id = esc(a.id), k = (a.link.party ? ' party' : '') + cls, rr = MARK.R + big;
  const q = Math.round(rr * 1.25 * 100) / 100; // a diamond of about the dot's area, clear of the next rail
  const shape = a.link.party ? `<path class="dp-mark${k}" data-arc="${id}" ${connectionAttrs(r.id)} d="M${x} ${y - q}l${q} ${q}l${-q} ${q}l${-q} ${-q}z"/>` : `<circle class="dp-mark${k}" data-arc="${id}" ${connectionAttrs(r.id)} cx="${x}" cy="${y}" r="${rr}"/>`;
  return shape + (a.link.mode === 'buffered' ? `<path class="dp-tick${k}" data-arc="${id}" ${connectionAttrs(r.id)} d="M${x - MARK.TICK} ${y + MARK.R + 2}h${2 * MARK.TICK}"/>` : '');
}
function railsSVG(hl) {
  const out = [], top = [], arcOf = new Map(L.arcs.map(a => [a.id, a]));
  for (const r of L.rails) {
    const as = r.dots.map(d => arcOf.get(d.link)), st = as.map(a => linkState(hl, a));
    const cls = `${as.every(a => a.link.party) ? ' party' : ''}${hl.on ? ' dim' : ''}${as.every(a => a.link.dim) ? ' out' : ''}`;
    const end = r.stubY === r.y1 || r.stubY === r.y2, far = r.stubY === r.y1 ? r.y2 : r.y1;
    const d = end ? roundPath([[r.x, far], [r.x, r.stubY], [r.xb, r.stubY]], 4) : `M${r.x} ${r.y1}V${r.y2}M${r.x} ${r.stubY}L${r.xb} ${r.stubY}`;
    out.push(`<path class="dp-rail${cls}" data-rail="${esc(r.id)}" ${connectionAttrs(r.id)} d="${d}"/>${headPath(r.xb, r.stubY, 'r', MARK.HEAD, 'dp-head' + cls, r.id)}`);
    r.dots.forEach((dot, i) => {
      const a = as[i], s = st[i];
      if (!s.lit && !s.carries) { out.push(markSVG(r, dot, a, s.cls)); return; }
      const mode = a.link.mode === 'buffered' ? ' buffered' : '';
      top.push({carries: s.carries, svg: `<path class="dp-arc${mode}${s.cls}" data-arc="${esc(a.id)}" ${connectionAttrs(r.id)} d="${roundPath([[a.xb, a.y1], [a.x, a.y1], [a.x, a.y2], [a.xb, a.y2]], 4)}"/>${headPath(a.xb, a.y2, 'r', MARK.HEAD + 2, 'dp-head' + s.cls, r.id)}${markSVG(r, dot, a, s.cls, 0.6)}`});
    });
  }
  // Failure-carrying links over lit ones, as before.
  return out.join('') + top.sort((p, q) => p.carries - q.carries).map(t => t.svg).join('');
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
      <span class="dp-pips">${pips(c.cell.active, 'a')}${pips(c.cell.standby, 's')}</span><span class="dp-role">${c.cell.active ? c.cell.active + ' active' : ''}${c.cell.active && c.cell.standby ? ' · ' : ''}${c.cell.standby ? c.cell.standby + ' standby' : ''}${c.cell.open ? (c.cell.active || c.cell.standby ? ' · ' : '') + 'not stated' : ''}${r.members.length > 1 ? ` · ${plans.length} of ${r.planned} parts` : ''}</span>${lost ? '<span class="dp-x">lost</span>' : ''}</button>`);
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
    else body = `<span class="dp-ok">✓ ${r.members.length === 1 ? V.plans.get(r.members[0]).minReady == null ? 'placed · ready copies not stated' : V.plans.get(r.members[0]).minReady + ' ready needed' : 'all placed'}</span>`;
    if (L.compactTray) body = r.unplaced.length ? `<button type="button" class="cm-link" data-dp="unplaced" title="Expand placement details">${r.unplaced.length} unplaced</button>` : r.short.length ? '<span title="Below the recorded minimum ready copies">Below min</span>' : '<span title="No unplaced part in this row">—</span>';
    out.push(`<div class="dp-trayc${rowCls(hl, t.row)}" style="left:${t.x}px;top:${t.y}px;width:${t.w}px;height:${t.h}px">${body}</div>`);
  }
  for (const o of L.outs) {
    const r = F.rows.find(x => x.id === o.row), p = r.members.length === 1 ? V.plans.get(r.members[0]) : null;
    let op = '', fl = '', pr = '';
    if (r.kind === 'party') { const rs = V.routes.filter(x => x.to === r.id || x.from === r.id); op = rs.map(x => esc(x.ref)).join(', '); fl = rs.map(x => `${esc(x.ref)} · ${esc(x.mode)}${x.failure ? '' : ' · no failure response'}`).join('<br>'); pr = rs.map(x => `${esc(x.ref)} · ${x.access ? 'access recorded' : 'access not recorded'}`).join('<br>'); }
    else if (p) {
      op = `<b>${esc(p.recovery === 'Unspecified' ? 'No recovery chosen' : p.recovery)}</b><small>${esc(p.stateMode === 'Unspecified' ? 'State not recorded' : p.stateMode)}${p.rto ? ' · back in ' + esc(p.rto) + ' min' : ''}${p.rpo ? ' · loses ≤ ' + esc(p.rpo) + ' min' : ''}</small>`;
      const needs = V.deps.filter(d => d.from === p.id).length, by = V.deps.filter(d => d.to === p.id).length;
      fl = `<b>Needs ${needs}</b><small>needed by ${by}</small>`;
      const bound = p.controls.length;
      pr = `<b>${bound ? bound + ' control' + (bound === 1 ? '' : 's') + ' enforced' : 'No control bound'}</b><small>${esc(p.network ? 'Network policy recorded' : 'Network policy not recorded')}</small>`;
    } else { op = `<b>${r.planned} parts</b><small>${r.unplaced.length} not placed</small>`; fl = op; pr = op; }
    let fail = '';
    if (FA?.state) { const a = rowState(r, 'initial'), b = rowState(r, 'recovery'); fail = a ? `<span class="dp-state ${esc(a.state)}">${esc(STATE_LABEL[a.state])}</span>${b && b.state !== a.state ? `<span class="dp-then">→</span><span class="dp-state ${esc(b.state)}">${esc(STATE_LABEL[b.state])}</span>` : ''}` : r.kind === 'party' ? '<span class="dp-state na">Not exercised</span>' : ''; }
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
    out.push(`<button type="button" class="dp-zh${S.sel === z.id ? ' sel' : ''}${failed ? ' failed' : ''}" data-zone="${esc(z.id)}" style="left:${z.x + 3}px;width:${z.w - 6}px;top:${top + 22}px;height:${DEP.HEAD_H - 26}px"><b>${esc(zz.title)}</b><small class="dp-zb">${esc(b ? b.title : zz.boundary ? zz.boundary : 'No trust boundary')}</small><small class="dp-zo">${failed ? 'Removed in this design scenario' : esc(F.rows.filter(r => r.cells.has(z.id)).length + ' placed' + (failing() ? ' · choose this scenario' : ''))}</small></button>`);
  }
  out.push(`<div class="dp-th" style="left:${L.trayX}px;width:${L.trayWidth}px;top:${top + 22}px"><button type="button" class="cm-link" data-dp="unplaced" aria-expanded="${!L.compactTray}"><b>Not placed</b><small>${L.compactTray ? 'Expand' : 'Collapse'}</small></button></div>`);
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
    const sub = row.kind === 'party' ? 'External system' : p ? `${esc(p.ref)}${on ? ` · <b class="sp-pn">${esc(on)}</b>` : ''} · ${p.minReady == null && p.maxReplicas == null ? 'copies not stated' : (p.minReady ?? '?') + '–' + (p.maxReplicas ?? '?') + ' copies'}` : `${row.planned} parts`;
    const proposed = g && row.members.includes(g.objectId);
    out.push(`<button type="button" class="dp-row ${esc(row.kind)}${row.ctx ? ' ctx' : ''}${row.subject ? ' subject' : ''}${S.sel && F.rowOf(S.sel) === row.id ? ' sel' : ''}${rowCls(hl, row.id)}${proposed ? ' proposed' : ''}${st ? ' st-' + st.state : ''}" data-row="${esc(row.id)}" style="top:${r.y + 5}px;height:${r.h - 10}px"><b>${esc(row.title)}</b><small>${sub}</small></button>`);
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
  root.querySelectorAll('.cm-view').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === NT.view())));
  const scn = root.querySelector('.cm-scn'); if (scn) scn.hidden = true;
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
  root.querySelector('.cm-lenses').innerHTML = LENSES.map(l => `<button type="button" class="cm-lens" data-dp="lens" data-id="${esc(l.id)}" aria-pressed="${S.lens === l.id}" title="${esc(l.q + ' Like the ' + l.like + '.')}">${icon(l.id)}<span>${l.label}</span></button>`).join('');
  const dp = depth();
  root.querySelector('.cm-depth').innerHTML = sc.kind === 'system' ? `<span>Rows</span>${[['modules', 'Modules'], ['parts', 'Parts'], ['all', 'Parts + platform']].map(([id, t]) => `<button type="button" class="cm-dep" data-dp="depth" data-id="${esc(id)}" aria-pressed="${dp === id}">${t}</button>`).join('')}` : '';
  const placed = F.rows.filter(r => r.cells.size).length, unplaced = F.rows.reduce((n, r) => n + r.unplaced.length, 0);
  let state = !V.env ? 'No environment yet' : `${V.zones.length} zone${V.zones.length === 1 ? '' : 's'} · ${placed} row${placed === 1 ? '' : 's'} placed · ${unplaced} not placed`;
  if (V.env && failing() && FA?.result) { const rows = FA.result.rows, stop = rows.filter(r => ['unavailable', 'degraded'].includes(r.initial.state)).length, unk = rows.filter(r => r.initial.state === 'unknown').length; state = `Declared design exercise · ${FA.scenario.title} · ${stop} stop or degrade · ${unk} unknown · ${rows.length - stop - unk} predicted to keep running · not a failover test`; }
  root.querySelector('.cm-state').textContent = state;
  const g = ghost();
  root.querySelector('.cm-banner').innerHTML = g ? `<section class="dp-banner"><span class="ip-kicker">Runtime proposal · not saved</span><b>${esc(g.kind === 'placement' ? 'Standby for ' + V.plans.get(g.objectId).title + ' in ' + title(g.record.zoneId) : 'Operating wording for ' + V.plans.get(g.objectId).title)}</b><small>${esc(g.reason)}</small><button type="button" class="cm-btn gold" data-rt-action="edit-ghost">Review &amp; edit</button><button type="button" class="cm-btn" data-rt-action="dismiss">Dismiss</button></section>` : '';
  root.querySelector('.cm-legend').innerHTML = `<p><i class="pip a"></i>A running copy (active)</p><p><i class="pip s"></i>A standby copy</p><p><i class="k-dom"></i>Zones under one bracket share a failure domain</p>${keyRails()}<p><span class="k-socket"></span>Not placed yet</p>${failing() ? `<p><i class="k-fail"></i>Failed zone in the declared scenario</p><p>${keySample(`<path class="dp-arc carries" d="M38 3H10V13H38"/>${headPath(38, 13, 'r', 8, 'dp-head carries')}`)}<span>Recorded dependency carries the predicted failure</span></p><p class="cm-muted">Modelled from declared copies and dependencies. Live failover requires exercise evidence.</p>` : ''}`;
}

// The Key's rail grammar (round 10, V6), drawn with the view's own classes so it takes the theme's tokens.
const keySample = (inner, h = 16) => `<svg class="k-dep" width="44" height="${h}" aria-hidden="true">${inner}</svg>`;
const keyMark = (cls, buffered = false) => keySample(`<path class="dp-rail" d="M14 0V16"/>${cls === 'party' ? '<path class="dp-mark party" d="M14 3.12l2.88 2.88-2.88 2.88-2.88-2.88z"/>' : `<circle class="dp-mark" cx="14" cy="6" r="${MARK.R}"/>`}${buffered ? `<path class="dp-tick" d="M10 ${6 + MARK.R + 2}h8"/>` : ''}`);
function keyRails() {
  const rail = keySample(`<path class="dp-rail" d="${roundPath([[10, 3], [10, 25], [40, 25]], 4)}"/>${headPath(40, 25, 'r', MARK.HEAD, 'dp-head')}<circle class="dp-mark" cx="10" cy="5" r="${MARK.R}"/><circle class="dp-mark" cx="10" cy="15" r="${MARK.R}"/>`, 30);
  return `<p>${rail}<span>A rail runs into one part, with one arrow. Each mark on it is a part that needs that part, level with the needing part's row. Select a part to draw its dependencies whole</span></p><p>${keyMark('')}<span>Requires — cannot run without it</span></p><p>${keyMark('', true)}<span>Buffered — degrades without it</span></p><p>${keyMark('party')}<span>A runtime path to or from a system outside the environment</span></p><p class="dp-knote">Each mark is one recorded dependency: a drawing mark, not an ArchiMate junction.</p>`;
}

// ---------------------------------------------------------------- companion

// The scale reading (desk-capacity.js, round 6 Contract K) for the project on screen: what the Chapter 2 targets imply for
// each placed part, in words beside its plan; worked out once per saved document and never written.
let SCALE = {p: null, r: null};
function scaleOf() { const p = project(); if (SCALE.p !== p) { let r = null; try { r = scaleReadings(p); } catch { r = null; } SCALE = {p, r}; } return SCALE.r; }
function scaleWords(planId) {
  const x = scaleOf()?.derived.find(d => d.planId === planId);
  if (!x || !(x.qps > 0 || x.storageGB != null)) return '';
  return `${x.qps > 0 ? `${esc(fmtN(x.qps))} requests a second at peak → ${esc(fmtN(x.replicas.needed))} cop${x.replicas.needed === 1 ? 'y' : 'ies'} at ${esc(fmtN(x.replicas.perReplica))} a second each at ${esc(fmtN(x.replicas.utilisation * 100))} %; ${x.replicas.placed == null ? 'none placed' : esc(fmtN(x.replicas.placed)) + ' active placed'}` : 'no request reaches it from the entry'}${x.storageGB != null ? ` · ${esc(fmtN(x.storageGB, 1))} GB` : ''}${x.bandwidthMBs ? ` · ${esc(fmtN(x.bandwidthMBs, 2))} MB/s` : ''}<br><small>${esc(x.basis)}. Derived, not measured.</small>`;
}
function specimenPlan(id) {
  const p = V.plans.get(id), ls = V.byPlan.get(id) || [], needs = V.deps.filter(d => d.from === id), by = V.deps.filter(d => d.to === id), src = V.sources.get(id);
  const k = (label, v, miss = true) => `<div class="${v ? '' : miss ? 'miss' : 'none'}"><dt>${label}</dt><dd>${v || (miss ? 'Not recorded' : '—')}</dd></div>`;
  const dep = d => { const t = d.to ? title(d.to) : 'a missing prerequisite'; return `<button type="button" class="cm-link" data-sel="${esc(d.to || '')}">${esc(t)}<i>${d.mode === 'buffered' ? ' · buffered' : ''}${d.party ? ' · ' + esc(d.detail) : ''}</i></button>`; };
  const fstate = FA?.state?.get(id);
  const routes = V.routes.filter(r => V.planOfAsset.get(r.from) === id || V.planOfAsset.get(r.to) === id);
  return `<section class="cm-spec"><h4 aria-level="3">${p.kind === 'component' ? 'Operating plan · application component' : 'Operating plan · platform service'}${p.illustrative ? '<span>Illustrative</span>' : ''}</h4><p class="cm-spec-t"><b>${esc(p.ref)} · ${esc(p.title)}</b></p><p>${esc(describePlan(V, id))}</p>
  ${fstate ? `<p class="dp-fnote"><span class="dp-state ${esc(fstate.initial.state)}">${esc(STATE_LABEL[fstate.initial.state])}</span> ${esc(fstate.initial.reason)}${fstate.recovery.state !== fstate.initial.state ? ` <br>After declared recovery: <span class="dp-state ${esc(fstate.recovery.state)}">${esc(STATE_LABEL[fstate.recovery.state])}</span>` : ''}</p>` : ''}
  <dl class="cm-dl">${k('Runs', ls.map(l => `${l.open ? 'role or copies not stated' : l.replicas + ' ' + esc(l.role)} · ${esc(title(l.zone))} <button type="button" class="cm-link inline" data-rt-action="placement" data-rt-id="${esc(l.id)}">edit</button>`).join('<br>'))}${k('Copies', p.minReady == null && p.maxReplicas == null ? '' : `${p.minReady ?? 'not stated'} ready needed · ${p.maxReplicas ?? 'not stated'} at most${p.capacityConfirmed ? '' : ' · capacity unconfirmed'}`)}${k('Targets', (p.operation?.targets || []).map(t => esc(t.text + (t.link ? ' ' + t.link.why : ''))).join('<br>'))}${p.operation?.schedule.serviceHours ? k('Hours of service', esc(p.operation.schedule.serviceHours)) : ''}${k('Windows', [...(p.operation?.schedule.maintenanceWindows || []), ...(p.operation?.schedule.batchWindows || [])].map(w => esc(w.text + (w.link ? ' ' + w.link.why : ''))).join('<br>'))}${scaleWords(id) ? k('Scale', scaleWords(id)) : ''}${k('State', p.stateMode === 'Unspecified' ? '' : esc(p.stateMode))}${k('Recovery', p.recovery === 'Unspecified' ? '' : esc(p.recovery) + (p.rto ? ' · back in ' + esc(p.rto) + ' min' : '') + (p.rpo ? ' · loses ≤ ' + esc(p.rpo) + ' min' : ''))}${p.stateMode === 'Stateful service' ? k('Write authority', esc(p.fencing)) + k('Protected copy', esc(p.backupPlan) + (p.backupZone ? ' · ' + esc(title(p.backupZone)) : '')) : ''}${k('Monitoring', esc(p.monitoring))}${k('Runbook', esc(p.runbook))}${k('Requires', needs.map(dep).join(''), false)}${k('Required by', by.map(d => `<button type="button" class="cm-link" data-sel="${esc(d.from)}">${esc(title(d.from))}</button>`).join(''), false)}${routes.length ? k('Runtime paths', routes.map(r => `<button type="button" class="cm-link" data-rt-action="path" data-rt-id="${esc(r.id)}">${esc(r.ref)} ${esc(r.title)} · ${esc(r.mode)}${r.failure ? '' : ' · <i>no failure response</i>'}</button>`).join(''), false) : ''}${k('Controls', (src?.controls || []).map(c => esc(c.ref + ' ' + c.title)).join('<br>'), false)}</dl>
  <div class="cm-acts"><button type="button" class="cm-btn primary" data-rt-action="edit-plan" data-rt-id="${esc(id)}" data-rt-step="0">${icon('edit')}Edit operating plan</button>${!ls.length ? `<button type="button" class="cm-btn primary" data-dp="place" data-id="${esc(id)}">Place it</button>` : ''}<button type="button" class="cm-btn" data-rt-action="edit-plan" data-rt-id="${esc(id)}" data-rt-step="1">Recovery</button><button type="button" class="cm-btn" data-rt-action="edit-plan" data-rt-id="${esc(id)}" data-rt-step="2">Operate &amp; change</button>
   ${ls.length && V.zones.some(z => !p.domains.includes((z.domain || '').toLowerCase().trim())) ? `<button type="button" class="cm-btn gold" data-dp="propose" data-key="isolate" data-id="${esc(id)}">Propose a standby elsewhere</button>` : ''}${p.recovery === 'Unspecified' || !p.recoveryPlan ? `<button type="button" class="cm-btn gold" data-dp="propose" data-key="recover" data-id="${esc(id)}">Propose recovery wording</button>` : ''}${!p.monitoring || !p.runbook ? `<button type="button" class="cm-btn gold" data-dp="propose" data-key="operate" data-id="${esc(id)}">Propose operating basics</button>` : ''}
   <button type="button" class="cm-btn" data-brain-launch="mind">${icon('mind')}Co-design</button><a class="cm-btn" href="${esc(projectURL('/?chapter=10&tab=work&object=' + encodeURIComponent(id)))}">Open in Work</a></div></section>`;
}
function specimenZone(id) {
  // A zone can be selected directly in Table/Diagram before the native deployment geometry exists.
  const rows = F?.rows || foldDeploy(V, scope(), depth()).rows;
  const z = V.zones.find(x => x.id === id), placed = rows.filter(r => r.cells.has(id)), b = V.M.byId.get(z.boundary);
  const same = V.domains.find(d => d.zones.includes(id));
  return `<section class="cm-spec"><h4 aria-level="3">Runtime zone</h4><p class="cm-spec-t"><b>${esc(z.ref)} · ${esc(z.title)}</b></p><dl class="cm-dl"><div class="${z.domain ? '' : 'miss'}"><dt>Failure domain</dt><dd>${esc(z.domain || 'Not declared')}${same && same.zones.length > 1 ? ' · shared with ' + esc(same.zones.filter(x => x !== id).map(title).join(', ')) : ''}</dd></div><div class="${z.isolation ? '' : 'miss'}"><dt>Isolation</dt><dd>${esc(z.isolation || 'Not recorded')}</dd></div><div><dt>Trust boundary</dt><dd>${esc(b ? b.title : 'Not assigned')}</dd></div><div><dt>Owner</dt><dd>${esc(z.owner || 'Not named')}</dd></div><div><dt>Runs here</dt><dd>${placed.map(r => `<button type="button" class="cm-link" data-sel="${esc(r.members[0] || r.id)}">${esc(r.title)}</button>`).join('') || '<em>Nothing yet</em>'}</dd></div></dl>
  <div class="cm-acts"><button type="button" class="cm-btn primary" data-rt-action="zone" data-rt-id="${esc(id)}">${icon('edit')}Edit zone</button><button type="button" class="cm-btn gold" data-dp="fail" data-id="${esc(id)}">${icon('fail')}What if it fails?</button></div></section>`;
}
function specimenParty(id) {
  const rs = V.routes.filter(r => r.to === id || r.from === id);
  return `<section class="cm-spec"><h4 aria-level="3">External participant</h4><p class="cm-spec-t"><b>${esc(title(id))}</b></p><p>Outside the environment. Parts reach it through runtime paths; its own availability is the provider's.</p><dl class="cm-dl">${rs.map(r => `<div class="${r.failure ? '' : 'miss'}"><dt>${esc(r.ref)}</dt><dd>${esc(r.title)} · ${esc(r.mode)}<br>${esc(r.failure || 'No response recorded for when it is down')}<br><button type="button" class="cm-link" data-rt-action="path" data-rt-id="${esc(r.id)}">Edit runtime path ${esc(r.id)}</button> · <a class="cm-link inline" href="${esc(projectURL('/?chapter=8&tab=model&object=' + encodeURIComponent(r.contract)))}">contract in Chapter 8</a></dd></div>`).join('')}</dl></section>`;
}
function specimenGroup(r) {
  return `<section class="cm-spec"><h4 aria-level="3">${r.kind === 'module' ? 'Module' : 'Platform services'}</h4><p class="cm-spec-t"><b>${esc(r.title)}</b></p><dl class="cm-dl"><div><dt>Parts</dt><dd>${r.members.map(id => `<button type="button" class="cm-link" data-sel="${esc(id)}">${esc(title(id))}${V.plans.get(id).placed ? '' : ' <i>· not placed</i>'}</button>`).join('')}</dd></div></dl><div class="cm-acts">${r.kind === 'module' ? `<button type="button" class="cm-btn primary" data-dp="dissect" data-id="${esc(r.module)}">${icon('dissect')}Open this module</button>` : `<button type="button" class="cm-btn primary" data-dp="depth" data-id="all">Show every platform service</button>`}</div></section>`;
}
function reading() {
  if (diagramView()) return NT.readingHTML();
  if (!V.env) return `<section><h4 aria-level="3">Start here</h4><p>No environment is designed yet. Create one to say where the design runs.</p><div class="cm-acts"><button type="button" class="cm-btn primary" data-rt-action="new-environment">New environment</button></div></section>`;
  if (!failing()) return `<section><h4 aria-level="3">Reading this view</h4><p>Each row is a part that must run; each column is a zone of <b>${esc(V.env.title)}</b>. Zones under one bracket share a failure domain and fail together. A filled dot is a running copy, a ring a standby.</p><p>In the gutter beside the names, each line runs into one part, with one arrow; a mark on it, level with another row, means that row's part needs it.</p><p>Read a row across to see where a part runs — and where it does not. Switch to <b>Flow</b> to see what each part needs, or to <b>What fails together</b> to remove a zone.</p>${scaleOf() ? `<p class="cm-muted dp-scale">Scale: ${esc(scaleOf().summary)}</p>` : ''}</section>`;
  if (!FA) return '';
  if (FA.error) return `<section><h4 aria-level="3">If a zone fails</h4><p>${esc(FA.error)}</p></section>`;
  const r = FA.result, comps = r.rows.filter(x => V.plans.get(x.id)?.kind === 'component'), stop = comps.filter(x => ['unavailable', 'degraded'].includes(x.initial.state)), unk = comps.filter(x => x.initial.state === 'unknown'), rec = r.rows.filter(x => x.recovery.state === 'conditional');
  return `<section><h4 aria-level="3">If a zone fails</h4><p><b>${esc(FA.scenario.title)}.</b> ${stop.length} of ${comps.length} components stop or degrade${unk.length ? `, and ${unk.length} cannot be judged because ${unk.length === 1 ? 'it is' : 'they are'} not placed with enough copies` : ''}. ${rec.length ? rec.length + ' part' + (rec.length === 1 ? ' has' : 's have') + ' a declared recovery candidate — unproven until exercised.' : 'No part has a declared recovery candidate.'}</p>${r.assessments?.length ? `<p class="cm-muted">Quality scenarios at stake: ${r.assessments.map(a => esc(a.title)).join('; ')}.</p>` : ''}${r.security?.some(s => s.state === 'operating path affected') ? `<p class="cm-muted">Controls whose enforcement path is affected: ${r.security.filter(s => s.state === 'operating path affected').map(s => esc(s.ref)).join(', ')}.</p>` : ''}${r.externalPaths?.length ? `<p class="cm-muted">External provider paths are not exercised by this scenario: ${esc(r.externalPaths.join(', '))}.</p>` : ''}<p class="cm-muted">The chapter's own simulation of declared copies and dependencies. It does not establish live failover.</p></section>`;
}
// Gaps and risks first, eight of how many, and "Show all" (round 12, G, GR-UX-04, GR-UX-08: insightsSection).
function insightsHTML() {
  const list = deployInsights(V, scope());
  return insightsSection(list, {key: 'deploy', item: x => `<button type="button" class="cm-ins ${esc(x.kind)}" data-sel="${esc(x.id || '')}" ${x.scenario ? `data-scenario="${esc(x.scenario)}"` : ''}><span>${esc(x.text)}</span>${x.ask ? `<small>Ask: ${esc(x.ask)}</small>` : ''}</button>`, note: `<p class="cm-muted">Drawn from recorded plans, placements, zones and paths. Prompts for review, not verdicts.</p>`});
}
function findingsHTML() {
  const sc = scope(), inS = id => sc.kind === 'system' || id === sc.id || (sc.kind === 'module' && V.M.mod.get(V.plans.get(id)?.asset) === sc.id);
  const fs = V.findings.filter(f => V.plans.has(f.objectId) ? inS(f.objectId) : sc.kind === 'system');
  if (!fs.length) return '';
  const groups = new Map();
  for (const f of fs) { const k = f.code.startsWith('unbound-') ? 'Place security enforcement' : f.title.replace(/RUN-\d+|ZON-\d+|ENV-\d+/g, '…'); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
  return `<section><h4 aria-level="3">Chapter 10 checks<span>${fs.length}</span></h4>${[...groups].sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([k, g]) => `<button type="button" class="cm-fg ${g.some(f => f.level === 'error') ? 'error' : ''}" data-sel="${esc(g[0].objectId)}"><b>${esc(k)}</b><small>${g.length} · ${esc([...new Set(g.map(f => V.plans.get(f.objectId)?.title || V.zones.find(z => z.id === f.objectId)?.title || f.objectId))].slice(0, 3).join(', '))}${g.length > 3 ? '…' : ''}</small></button>`).join('')}<a class="cm-muted" href="${esc(projectURL('/?chapter=10&tab=validate&validate=readiness'))}">All checks on Validate →</a></section>`;
}
function panel() {
  const box = companionHost(root);
  solMark(root, project(), 10);
  if (!companionOpen(root, S.panel)) { box.innerHTML = ''; return; }
  const s = S.sel;
  let spec = '';
  if (s && V.plans.has(s)) spec = specimenPlan(s) + specPanelHTML(project(), s);
  else if (s && V.zones.some(z => z.id === s)) spec = specimenZone(s);
  else if (s && T(s) === 'party') spec = specimenParty(s);
  else if (s) { const r = F?.rows?.find(x => x.id === s); if (r && (r.kind === 'module' || r.kind === 'platform-group')) spec = specimenGroup(r); }
  if (!spec && s && drawn(s)) spec = NT.specimenHTML(s);
  spec = NT.withSelected(spec, s);
  box.innerHTML = solInto(spec, solSection(project(), 10, s)) + reading() + (V.env ? insightsHTML() + findingsHTML() : '');
}
function walkBar() {
  const bar = root.querySelector('.cm-walk-in');
  if (diagramView() || !failing()) { bar.innerHTML = `<button type="button" class="cm-btn" data-dp="walk-start" ${V?.scenarios.length ? '' : 'disabled'}>Start zone failure walkthrough</button>`; return; }
  if (!failing() || !FA?.result) { bar.innerHTML = `<p class="cm-walk-text">${V.env ? 'Select a part to see where it runs, what it needs and how it recovers; select a zone to ask what happens if it fails.' : ''}</p>`; return; }
  const cur = S.walk >= 0 ? STAGES[S.walk] : null, lit = stageLit();
  const n = lit ? (lit.stage === 'zones' ? FA.failed.size : lit.rows.size) : 0;
  bar.innerHTML = `<button type="button" class="cm-btn" data-dp="walk-prev" aria-label="Previous stage" ${S.walk <= 0 ? 'disabled' : ''}>‹</button><button type="button" class="cm-btn" data-dp="walk-next">${S.walk < 0 ? icon('play') + '<span>Walk the failure</span>' : S.walk >= STAGES.length - 1 ? 'Done' : 'Next ›'}</button><p class="cm-walk-text">${cur ? `<b>${S.walk + 1} / ${STAGES.length} · ${esc(cur[1])}</b> ${esc(stageText(cur[0], n))}` : 'Four stages: the zones fail, parts lose their copies, the failure spreads through what parts need, and what could recover.'}</p>${S.walk >= 0 ? '<button type="button" class="cm-btn icon" data-dp="walk-stop" aria-label="Stop the walk-through">×</button>' : ''}`;
  const visits = visitedWalk.see(walkIdentity(), S.walk);
  if (visits.length === 4 && S.walk >= 0) bar.insertAdjacentHTML('beforeend', '<button type="button" class="cm-btn" data-dp="walk-record">Record this walkthrough</button>');
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
  announceObject(target);
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
function place(planId) { studioAction('inspect', {rtId: planId}); nextFrame(() => studioAction('placement')); }
function propose(key, id) { try { studio()?.preview?.(key, id); } catch { /* the studio reports its own errors */ } }

function bind() {
  solChapterBind(root, 10, {refresh: solRefresh});
  listen(root, 'keydown', e => { NT.keydown(e); });
  listen(root, 'click', e => {
    if (root.dataset.suppress) return;
    if (NT.handle(e)) return;
    const add = root.querySelector('.cm-add');
    if (add?.open && !e.target.closest('.cm-add > summary')) add.open = false;
    if (e.target.closest('[data-brain-launch],[data-rt-action],a')) return;
    const a = e.target.closest('[data-dp]');
    if (a && !a.disabled) {
      const k = a.dataset.dp;
      if (k === 'walk-start') { visitedWalk.clear(); S.view = 'failure'; S.scenario ||= V.scenarios[0]?.id; S.walk = 0; save(); render(); return; }
      if (k === 'walk-record') { const identity = walkIdentity(), visited = visitedWalk.see(identity, S.walk); if (visited.length !== 4 || !FA?.result) return; recordModelWalk({title: 'Record runtime design walkthrough', observations: true, command: {type: 'runtime.simulation', payload: {environmentId: V.env.id, zoneId: FA.scenario.zone, mode: FA.scenario.mode, durationMinutes: FA.result.durationMinutes || 60, stamp: runtimeEnvironmentStamp(project(), V.env.id), visited}}, current: () => walkIdentity() === identity, onSaved: () => { visitedWalk.clear(); S.walk = -1; solRefresh(); }}); return; }
      if (k === 'view') { S.view = a.dataset.id; S.walk = -1; save(); render(); return; }
      if (k === 'lens') { S.lens = a.dataset.id; save(); render(); return; }
      if (k === 'unplaced') { S.unplaced = !S.unplaced; fitPending = true; render(); return; }
      if (k === 'depth') { S.depth = a.dataset.id; fitPending = true; save(); render(); return; }
      if (k === 'scope') { setScope(a.dataset.kind === 'module' ? {kind: 'module', id: a.dataset.id} : {kind: 'system'}); return; }
      if (k === 'dissect') { dissect(a.dataset.id); return; }
      if (k === 'expand') { const on = !document.body.classList.contains('cm-expanded'); document.body.classList.toggle('cm-expanded', on); a.setAttribute('aria-pressed', String(on)); sizeModel(root, 'cm-expanded'); fitPending = true; nextFrame(() => render()); return; }
      if (k === 'panel') { S.panel = !S.panel; save(); fitPending = true; render(); nextFrame(() => { fitPending = true; render(); }); return; }
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
    if (s && s.dataset.sel) { e.stopPropagation(); select(s.dataset.sel, {reveal: !!inCompanion(s), pl: s.dataset.pl || null}); return; }
    if (e.target.closest('.cm-stage') && !e.target.closest('.cm-heads,.cm-rail,.cm-zoom,.cm-key') && (S.sel || S.walk >= 0)) { S.walk = -1; select(null); }
  });
  listen(root, 'change', e => { if (NT.change(e)) return; if (e.target.dataset.dpField === 'scenario') { S.scenario = e.target.value; S.walk = -1; save(); render(); } });
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
  if (!t || !root.contains(t)) { const html = dependencyTip(e); box.hidden = !html; if (html) { box.innerHTML = html; placeTip(box, e); } return; }
  let html = '';
  if (t.dataset.row) { const r = F.rows.find(x => x.id === t.dataset.row); html = `<b>${esc(r.title)}</b>${r.plan ? esc(describePlan(V, r.plan)) : r.kind === 'party' ? 'Outside the environment.' : esc(r.planned + ' parts')}<small class="h">Double-click to focus on it</small>`; }
  else if (t.dataset.zone) { const z = V.zones.find(x => x.id === t.dataset.zone); html = `<b>${esc(z.title)}</b>${esc(z.domain || 'Failure domain not declared')}<small class="h">${failing() ? 'Select to explore this zone-failure scenario' : 'Select to see what runs here'}</small>`; }
  else if (t.dataset.sel && V.plans.has(t.dataset.sel)) html = `<b>${esc(V.plans.get(t.dataset.sel).title)}</b>${esc(describePlan(V, t.dataset.sel))}`;
  if (!html) { box.hidden = true; return; }
  box.innerHTML = html; box.hidden = false; placeTip(box, e);
}

// The gutter has no element of its own to hover, so the pointer is placed in the world: a mark (within 6 px) reads its
// dependency, a rail or its stub (within 4 px) the part it runs into and what needs it.
function dependencyTip(e) {
  if (diagramView() || !L?.rails || !e.target.closest?.('.cm-world')) return '';
  // Not under the sticky part names or zone heads, which cover the world when it is moved.
  const rail = root.querySelector('.cm-rail')?.getBoundingClientRect(), head = root.querySelector('.cm-heads')?.getBoundingClientRect();
  if ((rail && e.clientX < rail.right) || (head && e.clientY < head.bottom)) return '';
  const w = root.querySelector('.cm-world').getBoundingClientRect(), z = stage.cam.z || 1, x = (e.clientX - w.left) / z, y = (e.clientY - w.top) / z;
  if (x < L.rail || x > L.x0) return '';
  const name = id => F.rows.find(r => r.id === id)?.title || id, arcOf = new Map(L.arcs.map(a => [a.id, a]));
  let best = null;
  for (const r of L.rails) for (const d of r.dots) { const dd = Math.hypot(x - r.x, y - d.y); if (dd <= 6 && (!best || dd < best.dd)) best = {dd, a: arcOf.get(d.link)}; }
  if (best) {
    const l = best.a.link, dep = l.deps.map(id => V.deps.find(d => d.id === id)).filter(Boolean);
    const how = l.party ? 'A runtime path' + (l.mode === 'buffered' ? ', buffered' : '') + (dep[0]?.detail ? ': ' + dep.map(d => d.detail).join('; ') : '') : l.mode === 'buffered' ? 'Buffered — degrades without it' : 'Requires it — cannot run without it';
    return `<b>${esc(name(l.from))} ${l.party ? 'reaches' : 'needs'} ${esc(name(l.to))}</b>${esc(how)}${dep.length > 1 ? `<br>${dep.length} recorded dependencies folded into this row` : ''}<small class="h">Select its row to draw it whole</small>`;
  }
  const on = L.rails.find(r => (Math.abs(x - r.x) <= 4 && y >= r.y1 - 2 && y <= r.y2 + 2) || (Math.abs(y - r.stubY) <= 4 && x >= r.x - 2 && x <= r.xb + 2));
  if (!on) return '';
  const by = on.dots.map(d => name(d.from));
  return `<b>${esc(name(on.to))}</b>${esc('Needed by ' + by.length + ': ' + by.slice(0, 6).join(', ') + (by.length > 6 ? ' and ' + (by.length - 6) + ' more' : ''))}<small class="h">Each mark on this line is one part that needs it</small>`;
}

export function deployDebug() { return {S: {...S}, V, F, L, FA}; }
