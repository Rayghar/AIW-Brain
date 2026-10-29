// Chapter 8 Model — Interfaces & data.
//
// The chapter's own model of the exchanges, drawn from recorded contracts and data only:
// - Data flow: one row per data definition — its authority and every place it travels.
// It is sliced the same way as the design anatomy (whole system → module → one component), keeps
// every lifeline in the same place across views and lenses, and reads through the chapter's lenses
// (Flow, Signals, Information). Every change opens the chapter's own editors and goes through the
// existing reviewable proposal. Navigation is a view preference only.
// Retired (round 11, A): the chapter's own Sequence view. The Diagram's Sequence picture (UML, exported, in
// the SDD) draws the same messages; what a contract promises when an answer is late, lost or repeated is
// read in the companion for the selected message (promisesHTML), and in each contract's own reading.
import {exchangeSource, foldData, exchangeScope, exchangeInsights, defaultDepth} from './exchange-model.js';
import {dataLayout, SEQ} from './exchange-layout.js';
import {modelChrome,modelStage, connectionAttrs, sizeModel, placeTip, edgesHTML, toolsHTML, defaultPanel, panelToggle, setState, showFailure, announceObject, focusKey, refocus, anatomyOrder, classificationClass as clsOf, nextFrame, companionHost, listen, companionOpen, releaseCompanion, inCompanion, insightsSection} from './model-stage.js';
import {anatomyFindings} from './anatomy-model.js';
import {projectPreferenceKey, projectURL, currentProject as project, onProjectSwitch, scopedProject, followShell, ownScope} from './project-context.js';
import {mountBrainContext} from './brain-context-ui.js';
import {specPanelHTML} from './spec-panel.js';
import {solChapterMount, solChapterBind, solSection, solInto, solMark, solOwner} from './chapter-sol.js';
import {createNotation} from './notation-view.js';
import {modelHeaderHTML} from './instrument-tray.js';
import {chapterLenses} from './lens-vocabulary.js';
import {esc} from './html-escape.js';
import {readStoredObject} from './util.js';
// Round 24 (D-24-08): the model and its pictures read the shell's module scope (project-context.js scopedProject: the saved
// document without one); Sol, proposals and editors keep the saved document.

// Sol's advice changes the project only through a store command; the view then reads the new document.
const solRefresh = () => { if (root?.isConnected) mountExchangeModel({id: pageSel}, cbs); };
const pending = () => { const i = window.aiwInterfaceImpact; return i?.pending && i.previewInChapter?.(8) ? i : null; };
const PATHS = {diagram: 'M4 4h6v5H4zM14 4h6v5h-6zM9 15h6v5H9zM7 9v3h10V9M12 12v3', flow: 'M3 12h13m-4-5 5 5-5 5M3 5h6M3 19h6', signals: 'M3 12h3l2-6 4 12 2-6h7', information: 'M12 3c3 4 6 7 6 10.5A6 6 0 0 1 6 13.5C6 10 9 7 12 3z', sequence: 'M6 3v18M18 3v18M6 8h12m-3-3 3 3-3 3M18 15H6m3-3-3 3 3 3', data: 'M4 6c0-3 16-3 16 0s-16 3-16 0v12c0 3 16 3 16 0V6M4 12c0 3 16 3 16 0', play: 'M7 4v16l13-8z', pause: 'M7 4h4v16H7zM14 4h4v16h-4z', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', panel: 'M3 4h18v16H3zM15 4v16', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', plus: 'M12 5v14M5 12h14', spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z', mind: 'm3 7 9-4 9 4-9 4-9-4m0 5 9 4 9-4m-18 5 9 4 9-4', edit: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4', dissect: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14M21 21l-5-5M8 11h6'};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[n] || PATHS.flow}"/></svg>`;
// The chapter's lenses, its subset of the one vocabulary (lens-vocabulary.js), each with the chapter's own question.
const LENSES = chapterLenses({
  flow: 'Who asks whom, in what order, and what happens on each step.',
  signals: 'What each contract promises when an answer is late, lost or repeated.',
  information: 'Which data each message carries, and who is its authority.'
});
const KIND = {component: 'Application component', party: 'External participant', module: 'Module', contract: 'Interface contract', data: 'Data definition', responsibility: 'Responsibility'};

let root = null, X = null, lastDoc = null, cbs = {}, G = null, L = null, fitPending = true, findings = null, marked = new Set(), stageW = 0;
let NT = null;
const freshView = () => ({view: 'data', lens: 'flow', scope: {kind: 'system'}, depth: 'auto', sel: null, panel: true});
let S = freshView();
// The standard diagram (notation-view.js) and the elements only it draws (the application itself, an external system, a placement).
// The standard diagram and the shared views (Layers, Table, Matrix, Whole design) are drawn by notation-view.js.
const diagramView = () => !!NT && NT.owns(S.view);
const drawn = id => diagramView() && !!NT?.diagram()?.nodes.some(n => n.id === id);
let stage = null, lastLaneClick = {id: null, t: 0}, lastProposal = '', pageSel;
const pref = () => projectPreferenceKey('aiw-exchange-model-v1');
function save() { try { localStorage.setItem(pref(), JSON.stringify({view: S.view, lens: S.lens, scope: ownScope(S.scope), depth: S.depth, sel: S.sel, panel: S.panel})); } catch { /* preferences are optional */ } }
// This browser's preferences for the chapter's model in the project on screen (read when the model is first drawn,
// and again when another project opens in place).
function restorePreferences() {
  const v = readStoredObject(pref());
  for (const k of ['view', 'lens', 'depth', 'sel']) if (typeof v[k] === 'string') S[k] = v[k];
  if (v.scope && typeof v.scope === 'object') S.scope = v.scope;
  S.panel = defaultPanel(v.panel);
  S.view = NT.settle(S.view);
  if (!LENSES.some(l => l.id === S.lens)) S.lens = 'flow';
}
// Another project opened in place (round 4, A): the model leaves and forgets the last project's view — its view, lens,
// scope, depth, panel, selection and walk — then reads the new project's preferences for this chapter; the next mount
// rebuilds from the new project's document. The picture's own choices are reset by its notation (notation-view.js).
onProjectSwitch(() => { leaveExchangeModel(); S = freshView(); X = null; lastDoc = null; pageSel = undefined; fitPending = true; findings = null; marked.clear(); lastProposal = ''; announced = undefined; if (NT) restorePreferences(); });

// ---------------------------------------------------------------- mount / leave

export function mountExchangeModel(selection, callbacks = {}) {
  const p = project(), host = document.querySelector('.studio > .stage.tab-content');
  if (!p || !host) return;
  cbs = callbacks;
  solChapterMount(p, 8, solRefresh);
  if (!root) {
    root = document.createElement('section'); root.className = 'cm'; root.setAttribute('aria-label', 'Chapter 8 model: interfaces and data');
    root.innerHTML = shell();
    stage = modelStage(root, {headHeight: () => (diagramView() ? 0 : SEQ.MOD_H + SEQ.HEAD_H + 10), railWidth: l => l.gutter || 0, onHover: tip});
    stage.bind(); bind();
    // The standard diagram shares the stage, the companion and the selection with the chapter's own views.
    // The sequence and lifecycle pictures (round 6, Contract T) follow the selected contract, journey step or data
    // definition: the chapter hands the record to the picture as `objectId`, read when the notation builds it.
    NT = createNotation({chapter: 8, root, stage, project: scopedProject, onSelect: id => select(id), objectId: () => (['sequence', 'lifecycle'].includes(NT?.scene()?.id) && S.sel && X?.M.byId.has(S.sel) ? S.sel : null)});
    NT.addViews('ex');
    NT.onChange = full => { if (full) fitPending = true; render(); };
    NT.bindDrag();
    restorePreferences();
    // The address may open the model on a view (a deep link, and the rendered checks).
    { const mv = window.aiwChapterModels?.takeView?.(8) || new URLSearchParams(location.search).get('model'); S.view = mv ? NT.settle(mv, 'link') : NT.settle(S.view); }
  } else {
    // A route the shell follows in place may name the view too (round 4, A: workspace-ux.js routeModel).
    const mv = window.aiwChapterModels?.takeView?.(8); if (mv) S.view = NT.settle(mv, 'link');
  }
  const first = !X;
  if (host.firstElementChild !== root) host.prepend(root);
  document.body.classList.add('cm-active');
  const d = pending()?.document || scopedProject();
  followShell(S);
  if (d !== lastDoc || !X) { lastDoc = d; rebuild(d); }
  // A link from another surface (for example the anatomy's "Open in Chapter 8 model") lands on its
  // object, and so does a selection made elsewhere on the page after this view first opened.
  const selectable = id => !!id && (X.C.has(id) || X.D.has(id) || X.order.includes(id));
  if (first && X) { const want = window.aiwChapterModels ? (window.aiwChapterModels.takeLink(8) || selection?.subject || null) : new URLSearchParams(location.search).get('object'); if (selectable(want)) { S.sel = want; nextFrame(() => revealSelection()); } }
  else if (X && pageSel !== undefined && selection?.id !== pageSel && selectable(selection?.id)) { S.sel = selection.id; nextFrame(() => revealSelection()); }
  pageSel = selection?.id ?? null;
  render();
  sizeModel(root, 'cm-expanded');
}
export function leaveExchangeModel() {
  document.body.classList.remove('cm-active', 'cm-expanded');
  releaseCompanion(root);
  root?.remove();
}
function rebuild(d) {
  // Lifelines keep the arrangement the architect chose on Validate: one body, same places.
  try { X = exchangeSource(d, {order: anatomyOrder()}); } catch (e) { console.error('Exchange model', e); X = null; return; }
  try { findings = anatomyFindings(d, X.M, 8); } catch { findings = null; }
  if (S.sel && !X.M.byId.has(S.sel) && !X.links.some(l => l.id === S.sel) && !drawn(S.sel)) S.sel = null;
  if (S.scope?.id && !X.M.byId.has(S.scope.id)) S.scope = {kind: 'system'};
  marked = new Set();
  const i = pending(), roots = [];
  if (i) { try { const g = i.decorate({nodes: [...X.C.keys(), ...X.D.keys(), ...X.M.comp.map(c => c.id), ...X.M.parties.map(p => p.id)].map(id => ({id, attrs: {}})), edges: []}); for (const n of g.nodes) { if (n.ghost || n.changeImpact) marked.add(n.id); if (n.ghost) roots.push(n.id); } } catch { /* the preview decorates what it can */ } }
  // When a proposal first appears, bring the proposed record into view.
  const key = i ? roots.join(',') : '';
  if (key && key !== lastProposal && roots[0]) { S.sel = roots[0]; nextFrame(() => revealSelection()); }
  lastProposal = key;
}

// ---------------------------------------------------------------- shell

function shell() {
  return `${modelHeaderHTML(8, 'ex', `<details class="cm-add"><summary class="cm-btn" aria-label="Add to the model">${icon('plus')}<span>Add</span></summary><div><button type="button" data-i-action="new-contract">New interface contract</button><button type="button" data-i-action="new-data">New data definition</button><button type="button" data-i-action="party">New external participant</button><p>New records are saved to your private project. Edits to existing ones are previewed as a reviewable proposal.</p></div></details>
    <button type="button" class="cm-btn icon" data-ex="expand" aria-pressed="false" aria-label="Expand the model" title="Expand">${icon('expand')}</button>
    <button type="button" class="cm-btn icon" data-ex="panel" aria-pressed="true" aria-label="Hide the companion panel" title="Companion">${icon('panel')}</button>`, 'Interfaces & data')}
  <div class="cm-bar" data-model-slot="commands"><nav class="cm-crumbs" aria-label="Model scope"></nav><div class="cm-lenses" role="group" aria-label="Lens"></div><div class="cm-depth" role="group" aria-label="Columns"></div></div>
  <div class="cm-banner" data-model-slot="notice"></div>
  <div class="cm-body" data-model-slot="content"><div class="cm-stage" tabindex="0" aria-label="Model canvas. Drag or scroll to move; arrow keys pan; Ctrl or Command and scroll to zoom.">
    <div class="cm-world"><svg class="cm-svg" aria-hidden="true"></svg><div class="cm-html"></div></div>
    <div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div>${edgesHTML()}
  </div><aside class="cm-panel" aria-label="Companion"></aside></div>
  <footer class="cm-walk" data-model-slot="status" aria-label="Status and tools"><p class="cm-state" role="status" aria-live="polite"></p>${toolsHTML('ex')}</footer><div class="cm-tip" role="tooltip" hidden></div>`;
}

// ---------------------------------------------------------------- render

const T = id => X?.M.byId.get(id)?.type;
const title = id => X?.M.byId.get(id)?.title || id;
const ref = id => X?.M.byId.get(id)?.ref || id;
function scope() { return exchangeScope(X, S.scope); }
function depth() { return S.depth === 'auto' ? defaultDepth(X) : S.depth; }

function render() {
  if (!root) return;
  S.view = NT.settle(S.view);
  if (!X) { showFailure(root, 'The interfaces model could not be prepared for this project.'); return; }
  const fk = focusKey(root);
  if (S.sel !== announced) announce();
  const sc = scope(), dp = depth(), box = stage.box();
  root.classList.remove('cm-lens-flow', 'cm-lens-signals', 'cm-lens-information');
  root.classList.add('cm-lens-' + S.lens);
  root.classList.toggle('cm-data', S.view === 'data');
  root.querySelector('.cm-body').classList.toggle('no-panel', !S.panel);
  root.classList.toggle('nt-active', diagramView());
  if (diagramView()) {
    // The standard diagram: the notation module draws; the chapter keeps its chrome, companion and camera.
    L = NT.render({sel: S.sel, view: S.view, viewW: stage.box().w});
    root.querySelector('.cm-heads-in').innerHTML = ''; root.querySelector('.cm-rail-in').innerHTML = '';
    chromeDiagram(); panel(); modelChrome(root);
    stage.use(L, 'diagram|' + (NT.scene()?.id || '') + '|' + NT.arrangement());
    if (fitPending) { fitPending = false; NT.fit(); } else stage.clamp();
    stage.apply(); refocus(root, fk); return;
  }
  // Geometry depends on the scope and the stage width only — never on the lens.
  G = foldData(X, sc, dp); L = dataLayout(G, {viewW: Math.max(640, box.w)});
  const world = root.querySelector('.cm-world');
  world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
  const svg = root.querySelector('.cm-svg');
  svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
  const hl = highlight();
  svg.innerHTML = defs() + dataSVG(hl); root.querySelector('.cm-html').innerHTML = dataHTML(hl);
  heads(hl); rail(hl); chrome(); panel(); NT.ownView(); modelChrome(root);
  stage.use(L, JSON.stringify([S.view, S.scope?.kind || 'system', S.scope?.id || '', depth()]));
  if (fitPending) { fitPending = false; stage.fit(); } else stage.clamp();
  stage.apply();
  refocus(root, fk);
}

// What is lit: the selection and everything it touches in this view.
function highlight() {
  const s = S.sel, out = {on: !!s, lanes: new Set(), data: new Set(), contracts: new Set()};
  if (!s) return out;
  const t = T(s);
  if (t === 'contract' || s.startsWith?.('F:')) {
    out.contracts.add(s);
    const c = X.C.get(s); if (c) for (const d of [...c.req, ...c.res]) out.data.add(d);
  } else if (t === 'data') {
    out.data.add(s);
    for (const m of X.moves.filter(m => m.data === s)) out.contracts.add(m.contract);
  } else {
    out.lanes.add(s);
    for (const c of X.C.values()) if (c.from === s || c.to === s) out.contracts.add(c.id);
    for (const d of X.D.values()) if (d.authority === s) out.data.add(d.id);
  }
  return out;
}

function defs() {
  const m = (id, d, fill, stroke) => `<marker id="${esc(id)}" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="1.4" stroke-linejoin="round"/></marker>`;
  const set = [['n', '#2c5446'], ['h', '#a8741f'], ['w', '#b0493a'], ['m', '#b9c2b3']];
  return '<defs>' + set.map(([k, c]) => m('cm-c-' + k, 'M1 1 11 6 1 11z', c, c) + m('cm-o-' + k, 'M1 1 11 6 1 11', 'none', c)).join('') + '<pattern id="cm-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v8" stroke="#e2c9a0" stroke-width="3"/></pattern></defs>';
}




function dataSVG(hl) {
  const out = [];
  L.rows.forEach((r, i) => out.push(`<rect class="cm-band${i % 2 ? ' odd' : ''} ${clsOf(r.row.data.classification)}${hl.data.has(r.id) ? ' lit' : ''}" x="${L.gutter}" y="${r.y}" width="${L.W - L.gutter - 6}" height="${r.h}"/>`));
  for (const l of L.lanes) out.push(`<line class="cm-life ${esc(l.kind)}${hl.on ? (hl.lanes.has(l.id) || !hl.lanes.size ? ' lit' : ' dim') : ''}" x1="${l.x}" x2="${l.x}" y1="${L.top - 10}" y2="${L.H - 12}"/>`);
  for (const m of L.moves) {
    const c = X.C.get(m.contract), on = hl.on ? (hl.data.has(m.data) || hl.contracts.has(m.contract) ? 'h' : 'm') : 'n', warn = S.lens === 'signals' && c?.gaps.length;
    out.push(`<line ${connectionAttrs([m.contract, m.data, m.role].join('|'))} class="cm-mv ${esc(m.role)}${warn ? ' warn' : ''}${m.dim ? ' out' : ''}${on === 'm' ? ' dim' : on === 'h' ? ' lit' : ''}${marked.has(m.contract) || marked.has(m.data) ? ' proposed' : ''}" x1="${m.x1}" y1="${m.y}" x2="${m.x2}" y2="${m.y}" marker-end="url(#cm-${m.role === 'response' ? 'o' : 'c'}-${warn ? 'w' : on})"/>`);
  }
  return out.join('');
}
function dataHTML(hl) {
  const out = [];
  for (const m of L.moves) {
    const c = X.C.get(m.contract), on = hl.on ? (hl.data.has(m.data) || hl.contracts.has(m.contract) ? ' lit' : ' dim') : '';
    if (m.lw < 36) continue;
    // A short movement carries the contract's reference only; the whole name is in its title and companion.
    const short = m.lw < 110, name = c ? (short ? c.ref : c.ref + ' ' + c.title) : m.contract;
    out.push(`<button type="button" ${connectionAttrs([m.contract, m.data, m.role].join('|'))} class="cm-mvl${on}${m.dim ? ' out' : ''}${c?.gaps.length ? ' has-gaps' : ''}" data-sel="${esc(m.contract)}" style="left:${m.lx}px;top:${m.y - 19}px;max-width:${m.lw}px" title="${esc((c ? c.ref + ' ' + c.title : m.contract) + ' · ' + m.role)}"><span class="cm-op">${esc(name)}</span><span class="cm-sig">${esc(c ? c.ref : '')} ${c ? (c.gaps.length ? '· no ' + c.gaps.join(', ') : '· complete') : ''}</span><span class="cm-inf">${esc(c ? c.ref : '')} · ${esc(m.role)}</span></button>`);
  }
  for (const k of L.marks) {
    const d = X.D.get(k.data), on = hl.on ? (hl.data.has(k.data) ? ' lit' : ' dim') : '';
    if (k.kind === 'authority') out.push(`<button type="button" class="cm-auth ${clsOf(d.classification)}${on}" data-sel="${esc(k.data)}" style="left:${k.x - 11}px;top:${k.y - 11}px" title="${esc(title(k.lane) + ' is the authority for ' + d.title)}" aria-label="${esc(title(k.lane) + ' is the authority for ' + d.title)}">★</button>`);
    else if (k.kind === 'copy') out.push(`<span class="cm-copy${on}" style="left:${k.x - 6}px;top:${k.y - 6}px" title="${esc(title(k.lane) + ' receives ' + d.title)}"></span>`);
    else if (k.kind === 'unsourced') out.push(`<span class="cm-unsourced${on}" style="left:${k.x - 9}px;top:${k.y - 9}px" title="${esc(title(k.lane) + ' sends ' + d.title + ', but no recorded contract brings it there')}">?</span>`);
    else if (k.kind === 'orphan') out.push(`<button type="button" class="cm-orphan" data-i-action="edit-data" data-i-id="${esc(k.data)}" style="left:${k.x}px;top:${k.y - 12}px">No authoritative system — assign one</button>`);
  }
  return out.join('');
}

function heads(hl) {
  const box = root.querySelector('.cm-heads-in'), sc = scope(), out = [];
  for (const b of L.mods) out.push(`<button type="button" class="cm-mod${b.id ? '' : ' outside'}" ${b.id ? `data-ex="dissect" data-id="${esc(b.id)}"` : 'data-ex="noop"'} style="left:${b.x1}px;width:${b.x2 - b.x1}px" title="${b.id ? 'Open ' + esc(title(b.id)) : 'Outside the system'}">${esc(b.id ? title(b.id) : b.to > b.from ? 'Outside the system' : 'Outside')}</button>`);
  for (const l of L.lanes) {
    const own = [...X.D.values()].filter(d => d.authority === l.id || (l.kind === 'module' && X.M.mod.get(d.authority) === l.id)).length;
    const subject = sc.kind !== 'system' && sc.id === l.id;
    out.push(`<button type="button" class="cm-head ${esc(l.kind)}${l.ctx ? ' ctx' : ''}${subject ? ' subject' : ''}${S.sel === l.id ? ' sel' : hl.on ? (hl.lanes.has(l.id) ? ' lit' : ' dim') : ''}${marked.has(l.id) ? ' proposed' : ''}" data-lane="${esc(l.id)}" style="left:${l.x - l.w / 2 + 5}px;width:${l.w - 10}px;top:${SEQ.MOD_H + 4}px;height:${SEQ.HEAD_H - 6}px" aria-label="${esc(KIND[l.kind] + ' ' + l.title)}">${l.kind === 'module' ? `<small>Module · ${esc(l.sub)}</small>` : ''}<b>${esc(l.title)}</b>${own ? `<em class="cm-own" title="Authority for ${own} data definition${own === 1 ? '' : 's'}">★ ${own}</em>` : ''}</button>`);
  }
  box.innerHTML = out.join('');
  box.style.width = L.W + 'px';
}
function rail(hl) {
  const box = root.querySelector('.cm-rail-in');
  root.querySelector('.cm-rail').style.setProperty('--cm-rail', L.gutter + 'px');
    box.innerHTML = L.rows.map(r => { const d = r.row.data, on = hl.on ? (hl.data.has(d.id) ? ' lit' : ' dim') : ''; return `<button type="button" class="cm-drow ${clsOf(d.classification)}${on}${S.sel === d.id ? ' sel' : ''}${marked.has(d.id) ? ' proposed' : ''}" data-sel="${esc(d.id)}" style="top:${r.y + 4}px;height:${r.h - 8}px"><b>${esc(d.title)}</b><small>${esc(d.ref)} · <span class="cls">${esc(d.classification || 'Unclassified')}</span>${d.fields ? ' · ' + d.fields + ' fields' : ''}</small><small class="auth">${d.authority ? '★ ' + esc(title(d.authority)) : 'No authority'}</small></button>`; }).join('');
  box.style.height = L.H + 'px'; box.style.width = L.gutter + 'px';
}

// ---------------------------------------------------------------- chrome

function crumbs() {
  const sc = scope(), parts = [`<button type="button" data-ex="scope" data-kind="system" class="${sc.kind === 'system' ? 'here' : ''}">Whole system</button>`];
  if (sc.kind !== 'system') {
    const m = sc.kind === 'module' ? sc.id : X.M.mod.get(sc.id);
    if (m) parts.push('<span>›</span>', `<button type="button" data-ex="scope" data-kind="module" data-id="${esc(m)}" class="${sc.kind === 'module' ? 'here' : ''}">${esc(title(m))}</button>`);
    if (sc.kind === 'part') parts.push('<span>›</span>', `<button type="button" class="here" data-ex="noop">${esc(title(sc.id))}</button>`);
  }
  return parts.join('');
}
// The Diagram view's chrome: the view toggles, the arrange, layers and export controls, the status and the key.
function chromeDiagram() {
  root.querySelectorAll('.cm-view').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === NT.view())));
  root.querySelector('.cm-lenses').innerHTML = NT.barHTML(); const dp = root.querySelector('.cm-depth'); if (dp) dp.innerHTML = '';
  const st = root.querySelector('.cm-state'); if (st && st.textContent !== NT.status()) st.textContent = NT.status();
  const lg = root.querySelector('.cm-legend'); if (lg) lg.innerHTML = NT.legendHTML();
  const bn = root.querySelector('.cm-banner'); if (bn && typeof pending === 'function') { const i = pending(); bn.innerHTML = i && i.banner ? i.banner() : ''; }
}
function chrome() {
  const sc = scope();
  root.querySelector('.cm-crumbs').innerHTML = crumbs();
  root.querySelectorAll('.cm-view').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === S.view)));
  root.querySelector('.cm-lenses').innerHTML = LENSES.map(l => `<button type="button" class="cm-lens" data-ex="lens" data-id="${esc(l.id)}" aria-pressed="${S.lens === l.id}" title="${esc(l.q + ' Like the ' + l.like + '.')}">${icon(l.id)}<span>${l.label}</span></button>`).join('');
  const dp = depth();
  root.querySelector('.cm-depth').innerHTML = sc.kind === 'system' && X.M.modules.length > 1 ? `<span>Columns</span><button type="button" class="cm-dep" data-ex="depth" data-id="modules" aria-pressed="${dp === 'modules'}">Modules</button><button type="button" class="cm-dep" data-ex="depth" data-id="components" aria-pressed="${dp === 'components'}">Components</button>` : '';
  setState(root, (G?.rows?.length ? `${G.rows.length} data definition${G.rows.length === 1 ? '' : 's'} · ${G.rows.reduce((n, r) => n + r.moves.length, 0)} movements` : 'No data definition recorded yet'));
  const i = pending();
  root.querySelector('.cm-banner').innerHTML = i ? i.banner() : '';
  const line = (dash, marker, colour = '#2c5446') => `<svg width="40" height="10"><line x1="2" y1="5" x2="32" y2="5" stroke="${colour}" stroke-width="1.6"${dash ? ` stroke-dasharray="${dash}"` : ''} marker-end="url(#cm-${marker})"/></svg>`;
  root.querySelector('.cm-legend').innerHTML = `<p><span class="k-auth">★</span>Authority — the system of record</p><p><span class="k-copy"></span>Holds a copy it received</p><p>${line('', 'c-n')}Sent with a request</p><p>${line('4 3', 'o-n')}Returned in an answer</p><p>${line('', 'c-w', '#b0493a')}Travels on a contract with gaps (Signals lens)</p><p><span class="k-unsourced">?</span>Sent by a part no recorded contract brings it to</p><p><span class="k-orphan">No authoritative system</span>A definition with no system of record; assign one</p><p>${line('2 3', 'c-n', '#b88830')}Proposed change, not saved</p>`;
}

// ---------------------------------------------------------------- companion panel

function specimenContract(c) {
  const k = (label, v, miss = true) => `<div class="${v ? '' : miss ? 'miss' : 'none'}"><dt>${label}</dt><dd>${esc(v || (miss ? 'Not recorded' : '—'))}</dd></div>`;
  const i = pending(), locked = !!i;
  return `<section class="cm-spec"><h4 aria-level="3">${KIND.contract}${c.illustrative ? '<span>Illustrative</span>' : ''}</h4><p class="cm-spec-t"><b>${esc(c.ref)} · ${esc(c.title)}</b></p><p>${esc(title(c.from))} ${c.async ? 'publishes to' : 'calls'} ${esc(title(c.to))}. ${esc(c.purpose)}</p>
  <dl class="cm-dl">${k('Operation', c.operation)}${k('Protocol', c.protocol)}${k('Contract version', c.version)}${k('Compatibility with consumers', c.compatibility)}${k('Provider/consumer evidence', c.evidence)}${k('Sends', c.req.map(id => X.D.get(id)?.title).join(', '))}${k('Answers with', c.res.map(id => X.D.get(id)?.title).join(', '), false)}${k('Correlation', c.correlation)}${c.async ? '' : k('Timeout', c.timeout)}${k('Retry', c.retry)}${k('Failure', c.failure)}${c.async ? '' : k('Repeats', c.idempotency || c.duplicate)}${k('Access', c.authorization)}</dl>
  ${marked.has(c.id) && i ? `<div class="cm-note gold">${i.objectContext({id: c.id, ref: c.ref, title: c.title})}</div>` : ''}
  <div class="cm-acts"><button type="button" class="cm-btn primary" data-i-action="edit-contract" data-i-id="${esc(c.id)}" ${locked ? 'disabled title="Review or close the current proposal first"' : ''}>${icon('edit')}Edit contract</button>${!locked && (c.gaps.includes('timeout') || c.gaps.includes('failure handling')) ? `<button type="button" class="cm-btn gold" data-ex="propose" data-key="uncertainty" data-id="${esc(c.id)}">Propose recovery wording</button>` : ''}${!locked && c.gaps.includes('duplicate handling') ? `<button type="button" class="cm-btn gold" data-ex="propose" data-key="reference" data-id="${esc(c.id)}">Propose repeat protection</button>` : ''}<button type="button" class="cm-btn" data-brain-launch="mind">${icon('mind')}Co-design</button><a class="cm-btn" href="${esc(projectURL('/?chapter=8&tab=work&object=' + encodeURIComponent(c.id)))}">Open in Work</a></div></section>`;
}
function specimenData(d) {
  const moves = X.moves.filter(m => m.data === d.id), holders = [...new Set(moves.map(m => m.to).filter(x => x !== d.authority))];
  const der = X.lineage.filter(l => l.from === d.id || l.to === d.id);
  return `<section class="cm-spec"><h4 aria-level="3">${KIND.data}</h4><p class="cm-spec-t"><b>${esc(d.ref)} · ${esc(d.title)}</b></p><p>${esc(d.purpose)}</p><dl class="cm-dl"><div class="${d.authority ? '' : 'miss'}"><dt>Authority</dt><dd>${esc(d.authority ? title(d.authority) : 'Not assigned')}</dd></div><div class="${d.classification ? '' : 'miss'}"><dt>Classification</dt><dd>${esc(d.classification || 'Not recorded')}</dd></div><div><dt>Fields</dt><dd>${d.fields ? esc(d.fieldNames.join(', ')) + (d.fields > d.fieldNames.length ? '…' : '') : '—'}</dd></div><div class="${d.retentionConfirmed ? '' : 'miss'}"><dt>Retention</dt><dd>${esc(d.retention || 'Not recorded')}${d.retention && !d.retentionConfirmed ? ' · not confirmed' : ''}</dd></div><div><dt>Travels</dt><dd>${moves.length ? moves.map(m => esc((X.C.get(m.contract)?.ref || '') + ' ' + title(m.from) + ' → ' + title(m.to))).join('<br>') : 'Not carried by any contract'}</dd></div><div><dt>Copies held by</dt><dd>${holders.length ? esc(holders.map(title).join(', ')) : 'None'}</dd></div>${der.length ? `<div><dt>Derivations</dt><dd>${der.map(l => esc(l.title || (X.D.get(l.from)?.title + ' → ' + X.D.get(l.to)?.title))).join('<br>')}</dd></div>` : ''}</dl>
  <div class="cm-acts"><button type="button" class="cm-btn primary" data-i-action="edit-data" data-i-id="${esc(d.id)}" ${pending() ? 'disabled title="Review or close the current proposal first"' : ''}>${icon('edit')}Edit data definition</button>${S.view === 'data' ? '<button type="button" class="cm-btn" data-ex="scene" data-id="sequence">See it in the Sequence picture</button>' : '<button type="button" class="cm-btn" data-ex="view" data-id="data">Follow it in Data flow</button>'}<a class="cm-btn" href="${esc(projectURL('/?chapter=8&tab=work&object=' + encodeURIComponent(d.id)))}">Open in Work</a></div></section>`;
}
function specimenLane(id) {
  const t = T(id), provides = [...X.C.values()].filter(c => c.to === id), uses = [...X.C.values()].filter(c => c.from === id), owns = [...X.D.values()].filter(d => d.authority === id);
  const sc = scope(), canDissect = (t === 'module' && !(sc.kind === 'module' && sc.id === id)) || (['component', 'party'].includes(t) && !(sc.kind === 'part' && sc.id === id));
  const list = cs => cs.map(c => `<button type="button" class="cm-link" data-sel="${esc(c.id)}">${esc(c.ref)} ${esc(c.title)}${c.gaps.length ? ' <i>·' + c.gaps.length + '</i>' : ''}</button>`).join('') || '<em>None</em>';
  return `<section class="cm-spec"><h4 aria-level="3">${KIND[t] || 'Part'}</h4><p class="cm-spec-t"><b>${esc(title(id))}</b></p>${t === 'module' ? `<p>${X.M.comp.filter(c => X.M.mod.get(c.id) === id).map(c => esc(c.title)).join(', ')}</p>` : ''}<dl class="cm-dl"><div><dt>Provides</dt><dd>${list(provides)}</dd></div><div><dt>Uses</dt><dd>${list(uses)}</dd></div><div><dt>Authority for</dt><dd>${owns.map(d => `<button type="button" class="cm-link" data-sel="${esc(d.id)}">${esc(d.ref)} ${esc(d.title)}</button>`).join('') || '<em>No data</em>'}</dd></div></dl>
  <div class="cm-acts">${canDissect ? `<button type="button" class="cm-btn primary" data-ex="dissect" data-id="${esc(id)}">${icon('dissect')}${t === 'module' ? 'Open this module' : 'Focus on this part'}</button>` : ''}${t === 'component' ? `<a class="cm-btn" href="${esc(projectURL('/?chapter=5&tab=model&object=' + encodeURIComponent(id)))}">Chapter 5 model</a>` : ''}</div></section>`;
}
// The sequence and lifecycle pictures read in words (round 6): what is drawn, read from the picture itself (one contract or
// step when the picture was narrowed to it, else every record it reads), and how to narrow it. The pictures are entries of
// the Diagram's picture picker, like every other standard picture of the chapter.
function sceneReadingHTML() {
  const sc = NT.scene()?.id, D = NT.diagram(); if (!D || !['sequence', 'lifecycle'].includes(sc)) return '';
  const name = id => D.nodes.find(n => n.id === id)?.title || id;
  if (sc === 'sequence') {
    const lifelines = D.nodes.filter(n => n.kind === 'lifeline'), msgs = D.edges.filter(e => e.kind === 'message').slice().sort((a, b) => (a.step || 0) - (b.step || 0));
    const contracts = [...new Map(msgs.filter(e => e.record?.id).map(e => [e.record.id, e.record])).values()], steps = [...new Set(msgs.map(e => /^(JRN-\d+) · /.exec(e.fullLabel || e.label)?.[1]).filter(Boolean))];
    const subject = contracts.length === 1 ? `The messages of <b>${esc(contracts[0].ref || contracts[0].id)} · ${esc(contracts[0].title)}</b>` : steps.length === 1 ? `The messages of journey step <b>${esc(steps[0])}</b>` : `${contracts.length} contract${contracts.length === 1 ? '' : 's'} in process order`;
    const first = msgs.slice(0, 12).map(e => `<li>${esc((e.step ? e.step + '. ' : '') + name(e.from) + (e.reply ? ' answers ' : ' sends ') + name(e.to) + ': ' + (e.fullLabel || e.label))}</li>`).join('');
    return `<section class="cm-spec nt-scene-read"><h4 aria-level="3">Reading this sequence</h4><p>${subject}: ${lifelines.length} lifeline${lifelines.length === 1 ? '' : 's'} (${esc(lifelines.map(n => n.title).join(', '))}) and ${msgs.length} message${msgs.length === 1 ? '' : 's'}, a request solid and its response dashed, each a recorded contract.</p>${first ? `<ol class="cm-read">${first}</ol>${msgs.length > 12 ? `<p class="cm-muted">${msgs.length - 12} more below.</p>` : ''}` : ''}<p class="cm-muted">Select a contract or a journey step to draw its messages alone; select nothing for the whole.</p></section>`;
  }
  const states = D.nodes.filter(n => n.kind === 'state'), moves = D.edges.filter(e => e.kind === 'transition'), defs = [...new Map(states.filter(n => n.record?.id).map(n => [n.record.id, n.record])).values()];
  const subject = defs.length === 1 ? `The lifecycle of <b>${esc(defs[0].ref || defs[0].id)} · ${esc(defs[0].title)}</b>` : `${defs.length} data definition${defs.length === 1 ? '' : 's'} with a lifecycle`;
  return `<section class="cm-spec nt-scene-read"><h4 aria-level="3">Reading these states</h4><p>${subject}: ${states.length} state${states.length === 1 ? '' : 's'} and ${moves.length} transition${moves.length === 1 ? '' : 's'}, each labelled by the contract that moves the record.</p>${moves.length ? `<ol class="cm-read">${moves.slice(0, 12).map(e => `<li>${esc(name(e.from) + ' → ' + name(e.to) + ' by ' + (e.fullLabel || e.label))}</li>`).join('')}</ol>` : ''}<p class="cm-muted">${states.length ? 'Select a data definition to draw its lifecycle alone. ' : ''}A lifecycle is recorded on the data definition (Chapter 8 Work: its field, states and the contracts that move them).</p></section>`;
}
// What the contract behind the selected message of the Sequence picture promises (round 11, A: the retired Sequence
// view's frames, read here): its timeout, retry, failure and repeat policies, each named or not yet recorded.
function promisesHTML() {
  const sc = NT.scene()?.id, D = NT.diagram(), id = NT.state.selEdge; if (sc !== 'sequence' || !D || !id) return '';
  const e = D.edges.find(x => x.id === id), c = e?.record?.id ? X.C.get(e.record.id) : null; if (!e || !c) return '';
  const rows = [['Timeout', c.async ? null : c.timeout, !c.async], ['Retry', c.retry, true], ['Failure', c.failure, true], ['Repeats', c.async ? null : c.idempotency || c.duplicate, !c.async], ['Correlation', c.correlation, true]].filter(([, , asked]) => asked);
  const open = rows.filter(([, v]) => !v).length, locked = !!pending();
  return `<section class="cm-spec cm-promises"><h4 aria-level="3">What the contract promises</h4><p class="cm-spec-t"><b>${esc(c.ref)} · ${esc(c.title)}</b></p><p>${esc(e.reply ? 'The answer to' : 'The request of')} this message. ${open ? `${open} polic${open === 1 ? 'y is' : 'ies are'} not recorded yet.` : 'Every policy asked for is recorded.'}</p><dl class="cm-dl">${rows.map(([k, v]) => `<div class="${v ? '' : 'miss'}"><dt>${k}</dt><dd>${esc(v || 'Not recorded')}</dd></div>`).join('')}</dl><div class="cm-acts"><button type="button" class="cm-btn primary" data-i-action="edit-contract" data-i-id="${esc(c.id)}" ${locked ? 'disabled title="Review or close the current proposal first"' : ''}>${icon('edit')}Edit contract</button>${!locked && (c.gaps.includes('timeout') || c.gaps.includes('failure handling')) ? `<button type="button" class="cm-btn gold" data-ex="propose" data-key="uncertainty" data-id="${esc(c.id)}">Propose recovery wording</button>` : ''}</div></section>`;
}
function reading() {
  if (diagramView()) return sceneReadingHTML() + promisesHTML() + NT.readingHTML();
  {
    const rows = G.rows, auth = rows.filter(r => r.authority).length;
    return `<section><h4 aria-level="3">Reading this view</h4><p>Each row is a data definition. <b>★</b> marks its authority — the one system of record. Arrows show where it travels, with the contract that carries it; a hollow ring is a copy held elsewhere.</p><p>${rows.length} definition${rows.length === 1 ? '' : 's'}, ${auth} with an authority. Switch to <b>Signals</b> to see which movements travel on an incomplete contract.</p></section>`;
  }
}
// Gaps and risks first, eight of how many, and "Show all" (round 12, G, GR-UX-04, GR-UX-08: insightsSection).
const insightsList = () => exchangeInsights(X, scope());
function insightsHTML(list = insightsList()) {
  return insightsSection(list, {key: 'exchange', item: x => `<button type="button" class="cm-ins ${esc(x.kind)}" data-sel="${esc(x.id)}" ${x.scenario ? `data-scenario="${esc(x.scenario)}"` : ''}><span>${esc(x.text)}</span>${x.ask ? `<small>Ask: ${esc(x.ask)}</small>` : ''}</button>`, note: `<p class="cm-muted">Drawn from recorded contracts, data and journeys. They are prompts for review, not verdicts.</p>`});
}
function findingsHTML() {
  if (!findings) return '';
  const sc = scope(), inS = f => sc.kind === 'system' || [f.subject, f.host].some(id => id && (id === sc.id || X.M.mod.get(id) === sc.id || X.C.get(id)?.from === sc.id || X.C.get(id)?.to === sc.id || X.D.get(id)?.authority === sc.id));
  const fs = findings.all.filter(f => f.chapter === 8 && inS(f));
  if (!fs.length) return '';
  const groups = new Map();
  for (const f of fs) { const k = f.title; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
  return `<section><h4 aria-level="3">Chapter 8 checks<span>${fs.length}</span></h4>${[...groups].slice(0, 8).map(([k, g]) => `<button type="button" class="cm-fg ${g.some(f => f.level === 'error') ? 'error' : ''}" data-sel="${esc(g[0].subject || g[0].host || '')}"><b>${esc(k)}</b><small>${g.length} · ${esc([...new Set(g.map(f => ref(f.subject || f.objectId)))].slice(0, 4).join(', '))}${g.length > 4 ? '…' : ''}</small></button>`).join('')}<a class="cm-muted" href="${esc(projectURL('/?chapter=8&tab=validate&validate=readiness'))}">All checks on Validate →</a></section>`;
}
function panel() {
  const box = companionHost(root), ins = insightsList();
  solMark(root, project(), 8);
  panelToggle(root, '[data-ex="panel"]', S.panel, ins.length);
  if (!companionOpen(root, S.panel)) { box.innerHTML = ''; return; }
  const studio = window.aiwLogicalStudio, proposal = studio?.proposal;
  const s = proposal?.record?.id || S.sel, t = T(s);
  // Native rule proposals are independent of the impact preview and of graph
  // geometry. Keep their review/edit/dismiss path visible for contract edges too.
  let spec = proposal ? studio.proposalInspector?.() || '' : '';
  if (!spec && t === 'contract') spec = specimenContract(X.C.get(s));
  else if (!spec && t === 'data') spec = specimenData(X.D.get(s));
  else if (!spec && ['component', 'party', 'module'].includes(t)) spec = specimenLane(s) + (t === 'component' ? specPanelHTML(project(), s) : '');
  else if (!spec && s && X.links.some(l => l.id === s)) { const l = X.links.find(x => x.id === s); spec = `<section class="cm-spec"><h4 aria-level="3">Interaction without a contract</h4><p class="cm-spec-t"><b>${esc(title(l.from))} → ${esc(title(l.to))}</b></p><p>${esc(l.label)} is recorded as an interaction, but no contract says what it carries or how failures are handled.</p><div class="cm-acts"><button type="button" class="cm-btn primary" data-i-action="new-contract">Define a contract</button></div></section>`; }
  if (!spec && s && drawn(s)) spec = NT.specimenHTML(s);
  spec = NT.withSelected(spec, s);
  box.innerHTML = solInto(spec, solSection(project(), 8, s)) + reading() + insightsHTML(ins) + findingsHTML();
}

// ---------------------------------------------------------------- camera

function revealSelection() {
  if (diagramView()) { const b = NT.layout()?.nodes.find(n => n.id === S.sel); if (b) stage.reveal(b.x, b.y, b.w, b.h); return; }
  if (!S.sel) return;
  const r = L.rows?.find(x => x.id === S.sel); if (r) stage.reveal(L.gutter, r.y, 200, r.h);
}
// ---------------------------------------------------------------- interaction

// Whichever path changed the selection, the page and Sol hear of it once, as the model renders.
let announced;
const selTargetBase = () => (S.sel && X.M.byId.has(S.sel) ? S.sel : null);
const selTarget = () => { const t = selTargetBase(); return t && /^(system:|party:|unplaced:|lane:|family:)/.test(String(t)) ? null : t; };
function announce() {
  announced = S.sel;
  const p = project(), target = selTarget();
  if (p) { try { mountBrainContext(p, {id: target || solOwner(p, S.sel) || 'project', chapter: 8}, 'model'); } catch { /* assistance is optional */ } }
  announceObject(target);
}
function select(id, {reveal = false} = {}) {
  S.sel = id || null;
  if (S.sel && !S.panel) S.panel = true;
  save(); render();
  if (reveal) revealSelection();
}
function setScope(sc) {
  const r = exchangeScope(X, sc);
  S.scope = r.kind === 'system' ? {kind: 'system'} : {kind: r.kind, id: r.id};
  if (r.focus) S.sel = r.focus;
  fitPending = true; save(); render();
}
function up() { const sc = scope(); if (sc.kind === 'part') { const m = X.M.mod.get(sc.id); setScope(m ? {kind: 'module', id: m} : {kind: 'system'}); } else if (sc.kind === 'module') setScope({kind: 'system'}); }
function dissect(id) { if (!id) return; setScope({kind: T(id) === 'module' ? 'module' : 'part', id}); }
function propose(key, id) {
  const studio = window.aiwLogicalStudio;
  if (!studio?.preview || !studio?.accept) return;
  try { studio.preview(key, id); nextFrame(() => { try { studio.accept(); } catch { /* the editor reports its own errors */ } }); } catch { /* the studio reports its own errors */ }
}

function bind() {
  solChapterBind(root, 8, {refresh: solRefresh});
  listen(root, 'click', e => {
    if (root.dataset.suppress) return;
    if (NT.handle(e)) return;
    const add = root.querySelector('.cm-add');
    if (add?.open && !e.target.closest('.cm-add > summary')) add.open = false;
    if (e.target.closest('[data-brain-launch],[data-i-action],[data-ip-action],a')) return;
    const a = e.target.closest('[data-ex]');
    if (a && !a.disabled) {
      const k = a.dataset.ex;
      if (k === 'view') { S.view = a.dataset.id; fitPending = true; save(); render(); revealSelection(); return; }
      // A picture of the Diagram, named from the companion (the Sequence picture from a data definition's reading).
      if (k === 'scene') { S.view = 'diagram'; if (NT.scenes.some(x => x.id === a.dataset.id)) Object.assign(NT.state, {scene: a.dataset.id, hub: null, focus: null, selEdge: null}); fitPending = true; save(); render(); return; }
      if (k === 'lens') { S.lens = a.dataset.id; save(); render(); return; }
      if (k === 'depth') { S.depth = a.dataset.id; fitPending = true; save(); render(); return; }
      if (k === 'scope') { setScope(a.dataset.kind === 'module' ? {kind: 'module', id: a.dataset.id} : {kind: 'system'}); return; }
      if (k === 'dissect') { dissect(a.dataset.id); return; }
      if (k === 'expand') { const on = !document.body.classList.contains('cm-expanded'); document.body.classList.toggle('cm-expanded', on); a.setAttribute('aria-pressed', String(on)); sizeModel(root, 'cm-expanded'); fitPending = true; nextFrame(() => render()); return; }
      if (k === 'panel') { S.panel = !S.panel; save(); fitPending = true; render(); nextFrame(() => { fitPending = true; render(); }); return; }
      if (k === 'key') { const key = root.querySelector('.cm-key'); key.classList.toggle('cm-min'); a.setAttribute('aria-expanded', String(!key.classList.contains('cm-min'))); return; }
      if (k === 'fit') { stage.fitAll(); return; }
      if (k === 'zin' || k === 'zout') { const {w, h} = stage.box(); stage.zoomAt(stage.cam.z * (k === 'zin' ? 1.15 : 1 / 1.15), w / 2, h / 2); return; }
      if (k === 'propose') { propose(a.dataset.key, a.dataset.id); return; }
      if (k === 'noop') return;
    }
    const lane = e.target.closest('[data-lane]');
    if (lane) {
      // Heads are redrawn on selection, so a double click is recognised here rather than by dblclick.
      const id = lane.dataset.lane, now = Date.now(), twice = lastLaneClick.id === id && now - lastLaneClick.t < 420;
      lastLaneClick = {id, t: now};
      if (twice) { lastLaneClick = {id: null, t: 0}; dissect(id); return; }
      select(id); return;
    }
    const s = e.target.closest('[data-sel]');
    if (s && s.dataset.sel) { e.stopPropagation(); select(S.sel === s.dataset.sel && !inCompanion(s) ? null : s.dataset.sel, {reveal: !!inCompanion(s)}); return; }
    if (e.target.closest('.cm-stage') && !e.target.closest('.cm-heads,.cm-rail,.cm-edge') && S.sel) select(null);
  });
  listen(root, 'change', e => { NT.change(e); });
  // Escape steps back one thing at a time: the selection, the scope, the expanded view. It also works after a redraw
  // has moved focus back to the page.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !root?.isConnected || document.querySelector('dialog[open]')) return;
    const a = document.activeElement;
    if (a && a !== document.body && !root.contains(a)) return;
    if (a?.closest?.('select,details[open],textarea')) return;
    if (S.sel) select(null);
    else if (scope().kind !== 'system') up();
    else if (document.body.classList.contains('cm-expanded')) root.querySelector('[data-ex="expand"]').click();
    else return;
    e.preventDefault();
  });
  listen(root, 'keydown', e => { NT.keydown(e); });
  root.addEventListener('pointerleave', () => { root.querySelector('.cm-tip').hidden = true; });
  window.addEventListener('resize', () => { if (!root?.isConnected) return; clearTimeout(bind._r); bind._r = setTimeout(() => { sizeModel(root, 'cm-expanded'); render(); }, 120); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!root?.isConnected || !L) return; clearTimeout(bind._ro); bind._ro = setTimeout(() => { const w = stage.box().w; if (Math.abs(w - stageW) > 24) { stageW = w; fitPending = true; render(); } }, 90); }).observe(root.querySelector('.cm-stage'));
}
function tip(e) {
  const box = root.querySelector('.cm-tip'), t = e.target.closest?.('.cm-mvl,.cm-head,.cm-drow,.cm-auth,.nt-node');
  if (!t || !root.contains(t)) { box.hidden = true; return; }
  if (t.dataset.ntNode) { box.innerHTML = NT.tipHTML(t.dataset.ntNode); box.hidden = !box.innerHTML; if (!box.hidden) placeTip(box, e); return; }
  let html = '';
  if (t.dataset.lane) { const l = L.lanes.find(x => x.id === t.dataset.lane); html = `<b>${esc(l.title)}</b>${esc(KIND[l.kind])}${l.kind === 'module' ? ' · double-click to open it' : ' · double-click to focus on it'}`; }
  else if (t.dataset.sel) { const id = t.dataset.sel, c = X.C.get(id), d = X.D.get(id); html = c ? `<b>${esc(c.ref + ' · ' + c.title)}</b>${esc(title(c.from) + ' → ' + title(c.to))}${c.gaps.length ? '<small class="f">Not recorded: ' + esc(c.gaps.join(', ')) + '</small>' : ''}` : d ? `<b>${esc(d.ref + ' · ' + d.title)}</b>${esc((d.classification || 'Unclassified') + ' · authority ' + (d.authority ? title(d.authority) : 'not assigned'))}` : ''; }
  if (!html) { box.hidden = true; return; }
  box.innerHTML = html + '<small class="h">Select to follow it</small>'; box.hidden = false;
  placeTip(box, e);
}

export function exchangeDebug() { return {S: {...S}, X, L, G, cam: {...stage?.cam}}; }

// The common chapter-model interface used by workspace-ux.
export {mountExchangeModel as mountChapterModel, leaveExchangeModel as leaveChapterModel};
