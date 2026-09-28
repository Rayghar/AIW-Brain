// Chapter 8 Model — Interfaces & data.
//
// Two architecture models of the same exchanges, drawn from recorded contracts and data only:
// - Sequence: one business scenario at a time, message by message, with what each message
//   carries and what the contract promises when an answer is late, lost or repeated.
// - Data flow: one row per data definition — its authority and every place it travels.
// Both are sliced the same way as the design anatomy (whole system → module → one component),
// keep every lifeline in the same place across scenarios, views and lenses, and read through
// the same lenses (Flow, Signals, Information). Every change opens the chapter's own editors
// and goes through the existing reviewable proposal. Navigation is a view preference only.
import {exchangeSource, foldScenario, foldData, exchangeScope, exchangeInsights, describeEvent, defaultDepth} from './exchange-model.js';
import {sequenceLayout, dataLayout, SEQ} from './exchange-layout.js';
import {modelStage, sizeModel, placeTip, edgesHTML, toolsHTML, defaultPanel, panelToggle, setState, showFailure, announceObject, focusKey, refocus} from './model-stage.js';
import {anatomyFindings} from './anatomy-model.js';
import {projectPreferenceKey, projectURL} from './project-context.js';
import {mountBrainContext} from './brain-context-ui.js';
import {specPanelHTML} from './spec-panel.js';
import {solChapterMount, solChapterBind, solSection, solInto, solMark, solOwner} from './chapter-sol.js';
import {createNotation} from './notation-view.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const project = () => window.aiwProjectStore?.value?.document || window.aiwCurrentProject;
// Sol's advice changes the project only through a store command; the view then reads the new document.
const solRefresh = () => { if (root?.isConnected) mountExchangeModel({id: pageSel}, cbs); };
const pending = () => { const i = window.aiwInterfaceImpact; return i?.pending && i.previewInChapter?.(8) ? i : null; };
const PATHS = {diagram: 'M4 4h6v5H4zM14 4h6v5h-6zM9 15h6v5H9zM7 9v3h10V9M12 12v3', flow: 'M3 12h13m-4-5 5 5-5 5M3 5h6M3 19h6', signals: 'M3 12h3l2-6 4 12 2-6h7', information: 'M12 3c3 4 6 7 6 10.5A6 6 0 0 1 6 13.5C6 10 9 7 12 3z', sequence: 'M6 3v18M18 3v18M6 8h12m-3-3 3 3-3 3M18 15H6m3-3-3 3 3 3', data: 'M4 6c0-3 16-3 16 0s-16 3-16 0v12c0 3 16 3 16 0V6M4 12c0 3 16 3 16 0', play: 'M7 4v16l13-8z', pause: 'M7 4h4v16H7zM14 4h4v16h-4z', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', panel: 'M3 4h18v16H3zM15 4v16', explore: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', plus: 'M12 5v14M5 12h14', spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z', mind: 'm3 7 9-4 9 4-9 4-9-4m0 5 9 4 9-4m-18 5 9 4 9-4', edit: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4', dissect: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14M21 21l-5-5M8 11h6'};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[n] || PATHS.flow}"/></svg>`;
const LENSES = [
  {id: 'flow', label: 'Flow', like: 'muscles', q: 'Who asks whom, in what order, and what happens on each step.'},
  {id: 'signals', label: 'Signals', like: 'nervous system', q: 'What each contract promises when an answer is late, lost or repeated.'},
  {id: 'information', label: 'Information', like: 'circulation', q: 'Which data each message carries, and who is its authority.'}
];
const KIND = {component: 'Application component', party: 'External participant', module: 'Module', contract: 'Interface contract', data: 'Data definition', responsibility: 'Responsibility'};
const clsOf = c => (/restricted|secret/i.test(c) ? 'restricted' : /confidential|personal|sensitive/i.test(c) ? 'confidential' : /internal/i.test(c) ? 'internal' : c ? 'public' : 'unclassified');

let root = null, X = null, lastDoc = null, cbs = {}, F = null, G = null, L = null, fitPending = true, timer = null, findings = null, marked = new Set(), stageW = 0;
let NT = null;
let S = {view: 'diagram', lens: 'flow', scope: {kind: 'system'}, depth: 'auto', scenario: null, sel: null, ev: null, panel: true, walk: -1};
// The standard diagram (notation-view.js) and the elements only it draws (the application itself, an external system, a placement).
const diagramView = () => S.view === 'diagram';
const drawn = id => diagramView() && !!NT?.diagram()?.nodes.some(n => n.id === id);
let stage = null, lastLaneClick = {id: null, t: 0}, lastProposal = '', pageSel;
const pref = () => projectPreferenceKey('aiw-exchange-model-v1');
function load() { try { const v = JSON.parse(localStorage.getItem(pref()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
function save() { try { localStorage.setItem(pref(), JSON.stringify({view: S.view, lens: S.lens, scope: S.scope, depth: S.depth, scenario: S.scenario, sel: S.sel, panel: S.panel})); } catch { /* preferences are optional */ } }
function anatomyOrder() { try { return JSON.parse(localStorage.getItem(projectPreferenceKey('aiw-anatomy-v1')) || '{}').order || {}; } catch { return {}; } }

// ---------------------------------------------------------------- mount / leave

export function mountExchangeModel(selection, callbacks = {}) {
  const p = project(), host = document.querySelector('.studio > .stage.tab-content');
  if (!p || !host) return;
  cbs = callbacks;
  solChapterMount(p, 8, solRefresh);
  if (!root) {
    root = document.createElement('section'); root.className = 'cm'; root.setAttribute('aria-label', 'Chapter 8 model: interfaces and data');
    root.innerHTML = shell();
    stage = modelStage(root, {headHeight: () => (S.view === 'diagram' ? 0 : SEQ.MOD_H + SEQ.HEAD_H + 10), railWidth: l => l.gutter || 0, onHover: tip});
    stage.bind(); bind();
    // The standard diagram shares the stage, the companion and the selection with the chapter's own views.
    NT = createNotation({chapter: 8, root, stage, project, onSelect: id => select(id)});
    NT.onChange = full => { if (full) fitPending = true; render(); };
    NT.bindDrag();
    const v = load();
    for (const k of ['view', 'lens', 'depth', 'scenario', 'sel']) if (typeof v[k] === 'string') S[k] = v[k];
    if (v.scope && typeof v.scope === 'object') S.scope = v.scope;
    S.panel = defaultPanel(v.panel);
    if (!['diagram', 'sequence', 'data'].includes(S.view)) S.view = 'diagram';
    // The address may open the model on a view (a deep link, and the rendered checks).
    { const mv = window.aiwChapterModels?.takeView?.(8) || new URLSearchParams(location.search).get('model'); if (mv && ['diagram', 'sequence', 'data'].includes(mv)) S.view = mv; }
    if (!LENSES.some(l => l.id === S.lens)) S.lens = 'flow';
  }
  const first = !X;
  if (host.firstElementChild !== root) host.prepend(root);
  document.body.classList.add('cm-active', 'am-active');
  const d = pending()?.document || p;
  if (d !== lastDoc || !X) { lastDoc = d; rebuild(d); }
  // A link from another surface (for example the anatomy's "Open in Chapter 8 model") lands on its
  // object, and so does a selection made elsewhere on the page after this view first opened.
  const selectable = id => !!id && (X.C.has(id) || X.D.has(id) || X.order.includes(id));
  if (first && X) { const want = window.aiwChapterModels ? window.aiwChapterModels.takeLink(8) : new URLSearchParams(location.search).get('object'); if (selectable(want)) { S.sel = want; setTimeout(revealSelection, 60); } }
  else if (X && pageSel !== undefined && selection?.id !== pageSel && selectable(selection?.id)) { S.sel = selection.id; setTimeout(revealSelection, 60); }
  pageSel = selection?.id ?? null;
  render();
  sizeModel(root, 'cm-expanded');
}
export function leaveExchangeModel() {
  stopWalk();
  document.body.classList.remove('cm-active', 'cm-expanded');
  root?.remove();
}
function rebuild(d) {
  // Lifelines keep the arrangement the architect chose on Validate: one body, same places.
  try { X = exchangeSource(d, {order: anatomyOrder()}); } catch (e) { console.error('Exchange model', e); X = null; return; }
  try { findings = anatomyFindings(d, X.M, 8); } catch { findings = null; }
  if (S.sel && !X.M.byId.has(S.sel) && !X.links.some(l => l.id === S.sel) && !drawn(S.sel)) S.sel = null;
  if (S.scope?.id && !X.M.byId.has(S.scope.id)) S.scope = {kind: 'system'};
  if (!X.scenarios.some(s => s.id === S.scenario)) S.scenario = X.scenarios[0]?.id || null;
  marked = new Set();
  const i = pending(), roots = [];
  if (i) { try { const g = i.decorate({nodes: [...X.C.keys(), ...X.D.keys(), ...X.M.comp.map(c => c.id), ...X.M.parties.map(p => p.id)].map(id => ({id, attrs: {}})), edges: []}); for (const n of g.nodes) { if (n.ghost || n.changeImpact) marked.add(n.id); if (n.ghost) roots.push(n.id); } } catch { /* the preview decorates what it can */ } }
  // When a proposal first appears, bring the proposed record into view.
  const key = i ? roots.join(',') : '';
  if (key && key !== lastProposal && roots[0]) { S.sel = roots[0]; setTimeout(revealSelection, 60); }
  lastProposal = key;
}

// ---------------------------------------------------------------- shell

function shell() {
  return `<header class="cm-top"><div class="cm-title"><small>Chapter 8 · Model</small><strong>Interfaces &amp; data</strong></div>
   <nav class="cm-crumbs" aria-label="Where you are"></nav>
   <div class="cm-views" role="group" aria-label="Model"><button type="button" class="cm-view" data-cm="view" data-id="diagram" title="Integration, data and authority in the standard notation">${icon('diagram')}<span>Diagram</span></button><button type="button" class="cm-view" data-cm="view" data-id="sequence">${icon('sequence')}<span>Sequence</span></button><button type="button" class="cm-view" data-cm="view" data-id="data">${icon('data')}<span>Data flow</span></button></div>
   <div class="cm-actions"><details class="cm-add"><summary class="cm-btn" aria-label="Add to the model">${icon('plus')}<span>Add</span></summary><div><button type="button" data-i-action="new-contract">New interface contract</button><button type="button" data-i-action="new-data">New data definition</button><button type="button" data-i-action="party">New external participant</button><p>New records are saved to your private project. Edits to existing ones are previewed as a reviewable proposal.</p></div></details>
    <button type="button" class="cm-btn" data-cm="explore" title="The connected explorer: every perspective of the whole model">${icon('explore')}<span>Explore all perspectives</span></button>
    <button type="button" class="cm-btn icon" data-cm="expand" aria-pressed="false" aria-label="Expand the model" title="Expand">${icon('expand')}</button>
    <button type="button" class="cm-btn icon" data-cm="panel" aria-pressed="true" aria-label="Hide the companion panel" title="Companion">${icon('panel')}</button></div></header>
  <div class="cm-bar"><label class="cm-scn"><span>Scenario</span><select data-cm-field="scenario" aria-label="Scenario"></select></label><div class="cm-lenses" role="group" aria-label="Lens"></div><div class="cm-depth" role="group" aria-label="Lifelines"></div></div>
  <div class="cm-banner"></div>
  <div class="cm-body"><div class="cm-stage" tabindex="0" aria-label="Model canvas. Drag or scroll to move; arrow keys pan; Ctrl or Command and scroll to zoom.">
    <div class="cm-world"><svg class="cm-svg" aria-hidden="true"></svg><div class="cm-html"></div></div>
    <div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div>${edgesHTML()}
  </div><aside class="cm-panel" aria-label="Companion"></aside></div>
  <footer class="cm-walk" aria-label="Walk through the scenario"><div class="cm-walk-in"></div><p class="cm-state" role="status" aria-live="polite"></p>${toolsHTML('cm')}</footer><div class="cm-tip" role="tooltip" hidden></div>`;
}

// ---------------------------------------------------------------- render

const T = id => X?.M.byId.get(id)?.type;
const title = id => X?.M.byId.get(id)?.title || id;
const ref = id => X?.M.byId.get(id)?.ref || id;
function scope() { return exchangeScope(X, S.scope); }
function depth() { return S.depth === 'auto' ? defaultDepth(X) : S.depth; }
function scenario() { return X.scenarios.find(s => s.id === S.scenario) || X.scenarios[0] || null; }

// The width a message label wants, from its text only (never from the lens).
function measure(e) {
  const c = e.contract ? X.C.get(e.contract) : null;
  if (e.t === 'return') return 20 + 6.6 * (e.data || []).map(id => X.D.get(id)?.title || id).join(', ').length;
  return 18 + 7.2 * String(c ? c.title : e.label || '').length + (c ? 50 : 0) + (e.async ? 46 : 0);
}
function render() {
  if (!root) return;
  if (!X) { showFailure(root, 'The interfaces model could not be prepared for this project.'); return; }
  const fk = focusKey(root);
  if (S.sel !== announced) announce();
  const sc = scope(), dp = depth(), box = stage.box();
  root.classList.remove('cm-lens-flow', 'cm-lens-signals', 'cm-lens-information');
  root.classList.add('cm-lens-' + S.lens);
  root.classList.toggle('cm-data', S.view === 'data');
  root.classList.toggle('cm-walking', S.walk >= 0 && S.view === 'sequence');
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
  // Geometry depends on the scope, the scenario and the stage width only — never on the lens.
  if (S.view === 'sequence') { F = foldScenario(X, scenario(), sc, dp); L = sequenceLayout(F, {viewW: Math.max(640, box.w), measure}); }
  else { G = foldData(X, sc, dp); L = dataLayout(G, {viewW: Math.max(640, box.w)}); }
  const world = root.querySelector('.cm-world');
  world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
  const svg = root.querySelector('.cm-svg');
  svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
  const hl = highlight();
  if (S.view === 'sequence') { svg.innerHTML = defs() + seqSVG(hl); root.querySelector('.cm-html').innerHTML = seqHTML(hl); }
  else { svg.innerHTML = defs() + dataSVG(hl); root.querySelector('.cm-html').innerHTML = dataHTML(hl); }
  heads(hl); rail(hl); chrome(); panel(); walkBar();
  stage.use(L, JSON.stringify([S.view, S.scope?.kind || 'system', S.scope?.id || '', S.view === 'sequence' ? S.scenario : '', depth()]));
  if (fitPending) { fitPending = false; stage.fit(); } else stage.clamp();
  stage.apply();
  refocus(root, fk);
}

// What is lit: the selection and everything it touches in this view.
function highlight() {
  const s = S.sel, out = {on: !!s, lanes: new Set(), evs: new Set(), data: new Set(), contracts: new Set()};
  if (S.walk >= 0) { const e = walkEvents()[S.walk]; if (e) { out.on = true; out.evs.add(e.id); if (e.a) { out.lanes.add(e.a); out.lanes.add(e.b); } if (e.lane) out.lanes.add(e.lane); } return out; }
  if (!s) return out;
  const t = T(s);
  const events = S.view === 'sequence' ? F.events : [];
  if (t === 'contract' || s.startsWith?.('F:')) {
    out.contracts.add(s);
    for (const e of events) if (e.contract === s || e.link === s || e.items?.some(i => i.contract === s)) { out.evs.add(e.id); if (e.a) { out.lanes.add(e.a); out.lanes.add(e.b); } }
    const c = X.C.get(s); if (c) for (const d of [...c.req, ...c.res]) out.data.add(d);
  } else if (t === 'data') {
    out.data.add(s);
    for (const e of events) if ((e.data || []).includes(s)) { out.evs.add(e.id); out.lanes.add(e.a); out.lanes.add(e.b); }
    for (const m of X.moves.filter(m => m.data === s)) out.contracts.add(m.contract);
  } else {
    out.lanes.add(s);
    for (const e of events) if (e.a === s || e.b === s || e.lane === s) { out.evs.add(e.id); if (e.a) { out.lanes.add(e.a); out.lanes.add(e.b); } }
    for (const c of X.C.values()) if (c.from === s || c.to === s) out.contracts.add(c.id);
    for (const d of X.D.values()) if (d.authority === s) out.data.add(d.id);
  }
  if (S.ev) out.evs.add(S.ev);
  return out;
}
const litEv = (hl, e) => (hl.on ? (hl.evs.has(e.id) ? ' lit' : ' dim') : '') + (e.dim ? ' out' : '') + (S.walk >= 0 && walkEvents()[S.walk]?.id === e.id ? ' now' : '') + (S.ev === e.id ? ' pick' : '');

function defs() {
  const m = (id, d, fill, stroke) => `<marker id="${id}" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="1.4" stroke-linejoin="round"/></marker>`;
  const set = [['n', '#2c5446'], ['h', '#a8741f'], ['w', '#b0493a'], ['m', '#b9c2b3']];
  return '<defs>' + set.map(([k, c]) => m('cm-c-' + k, 'M1 1 11 6 1 11z', c, c) + m('cm-o-' + k, 'M1 1 11 6 1 11', 'none', c)).join('') + '<pattern id="cm-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v8" stroke="#e2c9a0" stroke-width="3"/></pattern></defs>';
}
const tone = (hl, e, warn) => (warn ? 'w' : hl.on ? (hl.evs.has(e.id) ? 'h' : 'm') : 'n');

function seqSVG(hl) {
  const out = [];
  L.steps.forEach((s, i) => out.push(`<rect class="cm-band${i % 2 ? ' odd' : ''}${S.sel === s.id ? ' lit' : ''}" x="${L.gutter}" y="${s.y1}" width="${L.W - L.gutter - 6}" height="${s.y2 - s.y1}"/>`));
  for (const l of L.lanes) out.push(`<line class="cm-life ${l.kind}${hl.on ? (hl.lanes.has(l.id) ? ' lit' : ' dim') : ''}" x1="${l.x}" x2="${l.x}" y1="${L.top - 10}" y2="${L.H - 12}"/>`);
  for (const f of L.frames) out.push(`<rect class="cm-frame-r${X.C.get(f.ev.contract)?.gaps.length ? ' open' : ''}" x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="8"/>`);
  for (const b of L.bars) out.push(`<rect class="cm-act${b.async ? ' async' : ''}${hl.on && !hl.lanes.has(b.lane) ? ' dim' : ''}" x="${b.x}" y="${b.y1}" width="${SEQ.BAR}" height="${b.y2 - b.y1}" rx="2"/>`);
  for (const m of L.msgs) {
    const e = m.ev, c = e.contract ? X.C.get(e.contract) : null, cls = litEv(hl, e);
    if (m.kind === 'self') { out.push(`<path class="cm-m self${cls}" d="M${m.x1} ${m.y}h24v${m.y2 - m.y}h-22" marker-end="url(#cm-c-${tone(hl, e)})"/>`); continue; }
    const warn = m.kind === 'lost' || m.kind === 'gap' || (S.lens === 'signals' && m.kind === 'call' && (!c || c.gaps.length));
    const mk = m.kind === 'call' ? 'c' : 'o';
    out.push(`<line class="cm-m ${m.kind}${cls}${warn ? ' warn' : ''}${marked.has(e.contract) ? ' proposed' : ''}" x1="${m.x1}" y1="${m.y}" x2="${m.x2}" y2="${m.y}" marker-end="url(#cm-${mk}-${tone(hl, e, warn)})"/>`);
    if (m.kind === 'lost') out.push(`<path class="cm-lostx" d="M${m.x2 - 6} ${m.y - 6}l12 12m0-12-12 12"/>`);
  }
  return out.join('');
}

function badges(c, narrow) {
  if (!c) return '<i class="miss">no contract</i>';
  const it = (ok, word, glyph, detail, na = false) => na ? '' : `<i class="${ok ? 'ok' : 'miss'}" title="${esc(word + ': ' + (detail || 'not recorded'))}">${narrow ? glyph : word}</i>`;
  return it(!!c.timeout, 'timeout', '⏱', c.timeout, c.async) + it(!!(c.retry || c.failure), 'failure', '↻', c.failure || c.retry) + it(!!(c.idempotency || c.duplicate), 'repeats', '≡', c.idempotency || c.duplicate, c.async);
}
function chips(ids, cls = '', unsourced = []) { return ids.map(id => { const d = X.D.get(id), q = unsourced.includes(id); return d ? `<button type="button" class="cm-chip cm-d ${clsOf(d.classification)} ${cls}${q ? ' q' : ''}${S.sel === id ? ' lit' : ''}" data-sel="${esc(id)}" title="${esc(d.ref + ' · ' + d.title + (d.classification ? ' · ' + d.classification : '') + (q ? ' · sent without a recorded source' : ''))}">${q ? '? ' : ''}${esc(d.title)}</button>` : ''; }).join(''); }

function seqHTML(hl) {
  const out = [];
  for (const s of L.steps) out.push(`<button type="button" class="cm-stephead${S.sel === s.id ? ' lit' : ''}" data-step="${esc(s.id)}" style="left:${L.gutter + 8}px;top:${s.y1 + 7}px;max-width:${L.W - L.gutter - 24}px"><b>${s.n}</b><span>${esc(s.title)}</span><small>${esc(s.id)}${s.owner ? ' · ' + esc(s.owner) : ''}${s.lane ? '' : ' · no component realizes this step'}</small></button>`);
  for (const k of L.marks) {
    const e = F.events.find(x => x.id === k.ev);
    if (k.kind === 'start') out.push(`<div class="cm-start" style="left:${Math.max(L.gutter + 6, k.x - 12)}px;top:${k.y - 11}px">${icon('play')}<span>${esc(k.title)}</span></div>`);
    else if (k.kind === 'guard') out.push(`<div class="cm-guard${litEv(hl, e)}" style="left:${Math.max(L.gutter + 6, (k.x ?? L.gutter) - 8)}px;top:${k.y - 11}px"><i></i><span>${esc(k.title)}</span>${k.label ? `<b>${esc(k.label)}</b>` : ''}</div>`);
    else if (k.kind === 'end' || k.kind === 'note') out.push(`<div class="cm-end ${esc(k.outcome || 'note')}${litEv(hl, e)}" style="left:${k.x - 9}px;top:${k.y - 9}px" title="${esc(k.title)}"><i></i><span>${esc(k.title)}</span></div>`);
    else if (k.kind === 'enter') out.push(`<div class="cm-enterx" style="left:${k.x - 70}px;top:${k.y - 9}px">no recorded caller →</div>`);
    else if (k.kind === 'more') out.push(`<div class="cm-more" style="left:${k.x}px;top:${k.y - 10}px">… ${k.count} more interaction${k.count === 1 ? '' : 's'} — dissect a module or component to see them</div>`);
  }
  for (const m of L.msgs) {
    const e = m.ev, c = e.contract ? X.C.get(e.contract) : null, cls = litEv(hl, e), sel = e.contract || e.link || '', narrow = false;
    if (m.kind === 'self') {
      const lane = L.lanes.find(l => l.id === e.lane), names = e.items.map(i => i.label).join(', ');
      out.push(`<button type="button" class="cm-msg self${cls}" data-ev="${e.id}" style="left:${m.lx}px;top:${m.ly}px;width:${m.lw}px"><span class="cm-name">${e.count} step${e.count === 1 ? '' : 's'} inside: ${esc(names)}</span></button>${lane?.kind === 'module' ? `<button type="button" class="cm-mini" data-cm="dissect" data-id="${esc(e.lane)}" style="left:${m.lx}px;top:${m.ly + 20}px">Open ${esc(lane.title)}</button>` : ''}`);
      continue;
    }
    if (m.kind === 'gap') {
      out.push(`<button type="button" class="cm-msg gap${cls}" data-ev="${e.id}" style="left:${m.lx}px;top:${m.ly}px;width:${m.lw}px"><span class="cm-name">No recorded interaction for “${esc(e.label)}”</span></button><div class="cm-anno show" style="left:${m.lx}px;top:${m.ay}px;width:${m.lw}px"><button type="button" class="cm-mini" data-i-action="new-contract">Define a contract</button></div>`);
      continue;
    }
    if (m.kind === 'return' || m.kind === 'lost') {
      const data = e.data || [], names = data.map(id => X.D.get(id)?.title || id).join(', ');
      out.push(`<button type="button" class="cm-msg ret ${m.kind}${cls}" data-ev="${e.id}" data-sel="${esc(sel)}" style="left:${m.lx}px;top:${m.ly}px;width:${m.lw}px;text-align:${m.dir > 0 ? 'left' : 'right'}"><span class="cm-name">${m.kind === 'lost' ? 'No answer arrives' : names ? esc(names) : 'answer'}</span></button>`);
      continue;
    }
    const label = c ? c.title : e.label, op = c ? [c.operation, c.protocol].filter(Boolean).join(' · ') : '';
    out.push(`<button type="button" class="cm-msg ${m.kind}${cls}${marked.has(e.contract) ? ' proposed' : ''}" data-ev="${e.id}" data-sel="${esc(sel)}" style="left:${m.lx}px;top:${m.ly}px;width:${m.lw}px">${c ? `<span class="cm-ref">${esc(c.ref)}</span>` : ''}<span class="cm-name">${esc(label)}</span>${e.async ? '<span class="cm-async">event</span>' : ''}</button>`);
    const aw = Math.max(m.lw, 236), ax = Math.max(L.gutter + 4, Math.min(L.W - 8 - aw, m.lx + m.lw / 2 - aw / 2));
    out.push(`<div class="cm-anno${cls}" style="left:${ax}px;top:${m.ay}px;width:${aw}px"><span class="cm-op">${esc(op || (c ? '' : 'no contract yet'))}</span><span class="cm-sig">${badges(c, narrow)}</span><span class="cm-inf">${chips(e.data || [], '', X.moves.filter(x => x.contract === e.contract && x.role === 'request' && x.unsourced).map(x => x.data)) || '<em>no data recorded</em>'}</span></div>`);
  }
  for (const f of L.frames) {
    const c = X.C.get(f.ev.contract), rows = c ? [['Timeout', c.timeout], ['Retry', c.retry], ['Failure', c.failure], ['Repeats', c.idempotency || c.duplicate]] : [];
    const open = !c || c.gaps.length || !c.timeout;
    out.push(`<div class="cm-frame${open ? ' open' : ''}${hl.on && !hl.evs.has(f.ev.id) && !hl.contracts.has(f.ev.contract) ? ' dim' : ''}${S.walk >= 0 && walkEvents()[S.walk]?.id === f.ev.id ? ' now' : ''}" data-ev="${f.ev.id}" style="left:${f.x}px;top:${f.y}px;width:${f.w}px;height:${f.h}px"><header><b>alt</b><span>If the answer never arrives · ${esc(c ? c.ref + ' ' + c.title : 'no contract')}</span></header><dl>${rows.map(([k, v]) => `<div class="${v ? 'ok' : 'miss'}"><dt>${k}</dt><dd>${esc(v || 'Not recorded')}</dd></div>`).join('')}</dl>${open && c ? `<button type="button" class="cm-mini gold" data-cm="propose" data-key="uncertainty" data-id="${esc(c.id)}">Propose recovery wording</button>` : ''}</div>`);
  }
  return out.join('');
}

function dataSVG(hl) {
  const out = [];
  L.rows.forEach((r, i) => out.push(`<rect class="cm-band${i % 2 ? ' odd' : ''} ${clsOf(r.row.data.classification)}${hl.data.has(r.id) ? ' lit' : ''}" x="${L.gutter}" y="${r.y}" width="${L.W - L.gutter - 6}" height="${r.h}"/>`));
  for (const l of L.lanes) out.push(`<line class="cm-life ${l.kind}${hl.on ? (hl.lanes.has(l.id) || !hl.lanes.size ? ' lit' : ' dim') : ''}" x1="${l.x}" x2="${l.x}" y1="${L.top - 10}" y2="${L.H - 12}"/>`);
  for (const m of L.moves) {
    const c = X.C.get(m.contract), on = hl.on ? (hl.data.has(m.data) || hl.contracts.has(m.contract) ? 'h' : 'm') : 'n', warn = S.lens === 'signals' && c?.gaps.length;
    out.push(`<line class="cm-mv ${m.role}${warn ? ' warn' : ''}${m.dim ? ' out' : ''}${on === 'm' ? ' dim' : on === 'h' ? ' lit' : ''}${marked.has(m.contract) || marked.has(m.data) ? ' proposed' : ''}" x1="${m.x1}" y1="${m.y}" x2="${m.x2}" y2="${m.y}" marker-end="url(#cm-${m.role === 'response' ? 'o' : 'c'}-${warn ? 'w' : on})"/>`);
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
    out.push(`<button type="button" class="cm-mvl${on}${m.dim ? ' out' : ''}${c?.gaps.length ? ' has-gaps' : ''}" data-sel="${esc(m.contract)}" style="left:${m.lx}px;top:${m.y - 19}px;max-width:${m.lw}px" title="${esc((c ? c.ref + ' ' + c.title : m.contract) + ' · ' + m.role)}"><span class="cm-op">${esc(name)}</span><span class="cm-sig">${esc(c ? c.ref : '')} ${c ? (c.gaps.length ? '· no ' + c.gaps.join(', ') : '· complete') : ''}</span><span class="cm-inf">${esc(c ? c.ref : '')} · ${m.role}</span></button>`);
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
  for (const b of L.mods) out.push(`<button type="button" class="cm-mod${b.id ? '' : ' outside'}" ${b.id ? `data-cm="dissect" data-id="${esc(b.id)}"` : 'data-cm="noop"'} style="left:${b.x1}px;width:${b.x2 - b.x1}px" title="${b.id ? 'Open ' + esc(title(b.id)) : 'Outside the system'}">${esc(b.id ? title(b.id) : b.to > b.from ? 'Outside the system' : 'Outside')}</button>`);
  for (const l of L.lanes) {
    const own = [...X.D.values()].filter(d => d.authority === l.id || (l.kind === 'module' && X.M.mod.get(d.authority) === l.id)).length;
    const subject = sc.kind !== 'system' && sc.id === l.id;
    out.push(`<button type="button" class="cm-head ${l.kind}${l.ctx ? ' ctx' : ''}${subject ? ' subject' : ''}${S.sel === l.id ? ' sel' : hl.on ? (hl.lanes.has(l.id) ? ' lit' : ' dim') : ''}${marked.has(l.id) ? ' proposed' : ''}" data-lane="${esc(l.id)}" style="left:${l.x - l.w / 2 + 5}px;width:${l.w - 10}px;top:${SEQ.MOD_H + 4}px;height:${SEQ.HEAD_H - 6}px" aria-label="${esc(KIND[l.kind] + ' ' + l.title)}">${l.kind === 'module' ? `<small>Module · ${esc(l.sub)}</small>` : ''}<b>${esc(l.title)}</b>${own ? `<em class="cm-own" title="Authority for ${own} data definition${own === 1 ? '' : 's'}">★ ${own}</em>` : ''}</button>`);
  }
  box.innerHTML = out.join('');
  box.style.width = L.W + 'px';
}
function rail(hl) {
  const box = root.querySelector('.cm-rail-in');
  root.querySelector('.cm-rail').style.setProperty('--cm-rail', L.gutter + 'px');
  if (S.view === 'sequence') {
    box.innerHTML = L.steps.map(s => `<button type="button" class="cm-railstep${S.sel === s.id ? ' lit' : ''}" data-step="${esc(s.id)}" style="top:${s.y1}px;height:${s.y2 - s.y1}px" title="${esc(s.n + ' · ' + s.title)}"><b>${s.n}</b></button>`).join('');
  } else {
    box.innerHTML = L.rows.map(r => { const d = r.row.data, on = hl.on ? (hl.data.has(d.id) ? ' lit' : ' dim') : ''; return `<button type="button" class="cm-drow ${clsOf(d.classification)}${on}${S.sel === d.id ? ' sel' : ''}${marked.has(d.id) ? ' proposed' : ''}" data-sel="${esc(d.id)}" style="top:${r.y + 4}px;height:${r.h - 8}px"><b>${esc(d.title)}</b><small>${esc(d.ref)} · <span class="cls">${esc(d.classification || 'Unclassified')}</span>${d.fields ? ' · ' + d.fields + ' fields' : ''}</small><small class="auth">${d.authority ? '★ ' + esc(title(d.authority)) : 'No authority'}</small></button>`; }).join('');
  }
  box.style.height = L.H + 'px'; box.style.width = L.gutter + 'px';
}

// ---------------------------------------------------------------- chrome

function crumbs() {
  const sc = scope(), parts = [`<button type="button" data-cm="scope" data-kind="system" class="${sc.kind === 'system' ? 'here' : ''}">Whole system</button>`];
  if (sc.kind !== 'system') {
    const m = sc.kind === 'module' ? sc.id : X.M.mod.get(sc.id);
    if (m) parts.push('<span>›</span>', `<button type="button" data-cm="scope" data-kind="module" data-id="${esc(m)}" class="${sc.kind === 'module' ? 'here' : ''}">${esc(title(m))}</button>`);
    if (sc.kind === 'part') parts.push('<span>›</span>', `<button type="button" class="here" data-cm="noop">${esc(title(sc.id))}</button>`);
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
  const sc = scope(), s = scenario(), seq = S.view === 'sequence';
  root.querySelector('.cm-crumbs').innerHTML = crumbs();
  root.querySelectorAll('.cm-view').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === S.view)));
  const sel = root.querySelector('[data-cm-field="scenario"]');
  sel.innerHTML = X.scenarios.map(x => `<option value="${esc(x.id)}" ${x.id === s?.id ? 'selected' : ''}>${esc(x.title)}${x.kind === 'journey' ? ' · journey' : ''}</option>`).join('') || '<option>No interactions recorded yet</option>';
  sel.closest('.cm-scn').hidden = !seq;
  root.querySelector('.cm-lenses').innerHTML = LENSES.map(l => `<button type="button" class="cm-lens" data-cm="lens" data-id="${l.id}" aria-pressed="${S.lens === l.id}" title="${esc(l.q + ' Like the ' + l.like + '.')}">${icon(l.id)}<span>${l.label}</span></button>`).join('');
  const dp = depth();
  root.querySelector('.cm-depth').innerHTML = sc.kind === 'system' && X.M.modules.length > 1 ? `<span>${seq ? 'Lifelines' : 'Columns'}</span><button type="button" class="cm-dep" data-cm="depth" data-id="modules" aria-pressed="${dp === 'modules'}">Modules</button><button type="button" class="cm-dep" data-cm="depth" data-id="components" aria-pressed="${dp === 'components'}">Components</button>` : '';
  const st = seq ? s?.stats : null;
  setState(root, seq ? (s ? `${s.title} · ${st.messages} message${st.messages === 1 ? '' : 's'}${st.external ? ' · ' + st.external + ' external' : ''}${st.lost ? ' · 1 lost answer' : ''}${st.gaps ? ' · ' + st.gaps + ' missing interaction' + (st.gaps === 1 ? '' : 's') : ''}` : 'No interactions recorded yet') : (G?.rows?.length ? `${G.rows.length} data definition${G.rows.length === 1 ? '' : 's'} · ${G.rows.reduce((n, r) => n + r.moves.length, 0)} movements` : 'No data definition recorded yet'));
  const i = pending();
  root.querySelector('.cm-banner').innerHTML = i ? i.banner() : '';
  const line = (dash, marker, colour = '#2c5446') => `<svg width="40" height="10"><line x1="2" y1="5" x2="32" y2="5" stroke="${colour}" stroke-width="1.6"${dash ? ` stroke-dasharray="${dash}"` : ''} marker-end="url(#cm-${marker})"/></svg>`;
  root.querySelector('.cm-legend').innerHTML = seq
    ? `<p>${line('', 'c-n')}Request — the caller waits</p><p>${line('4 3', 'o-n')}Answer</p><p>${line('', 'o-n')}Event — the sender does not wait</p><p>${line('5 4', 'o-w', '#b0493a')}<i class="k-lost">✕</i>Answer that never arrives</p><p>${line('3 4', 'c-n', '#b5832f')}No recorded interaction for a step; a contract is missing</p><p>${line('2 3', 'c-n', '#b88830')}Proposed change, not saved</p><p><i class="k-bar"></i>Busy: handling a request or waiting for one</p><p><i class="k-end done"></i>Outcome reached</p><p><i class="k-end uncertain"></i>Outcome unknown — waiting on an enquiry</p><p><i class="k-end stopped"></i>Stopped</p><p><i class="k-frame"></i>What the contract says when the answer never arrives</p><p><i class="cm-d confidential k">?</i>Data sent without a recorded source</p>`
    : `<p><span class="k-auth">★</span>Authority — the system of record</p><p><span class="k-copy"></span>Holds a copy it received</p><p>${line('', 'c-n')}Sent with a request</p><p>${line('4 3', 'o-n')}Returned in an answer</p><p>${line('', 'c-w', '#b0493a')}Travels on a contract with gaps (Signals lens)</p><p><span class="k-unsourced">?</span>Sent by a part no recorded contract brings it to</p><p><span class="k-orphan">No authoritative system</span>A definition with no system of record; assign one</p><p>${line('2 3', 'c-n', '#b88830')}Proposed change, not saved</p>`;
}

// ---------------------------------------------------------------- companion panel

function specimenContract(c) {
  const k = (label, v, miss = true) => `<div class="${v ? '' : miss ? 'miss' : 'none'}"><dt>${label}</dt><dd>${esc(v || (miss ? 'Not recorded' : '—'))}</dd></div>`;
  const i = pending(), locked = !!i;
  return `<section class="cm-spec"><h4>${KIND.contract}${c.illustrative ? '<span>Illustrative</span>' : ''}</h4><p class="cm-spec-t"><b>${esc(c.ref)} · ${esc(c.title)}</b></p><p>${esc(title(c.from))} ${c.async ? 'publishes to' : 'calls'} ${esc(title(c.to))}. ${esc(c.purpose)}</p>
  <dl class="cm-dl">${k('Operation', c.operation)}${k('Protocol', c.protocol)}${k('Sends', c.req.map(id => X.D.get(id)?.title).join(', '))}${k('Answers with', c.res.map(id => X.D.get(id)?.title).join(', '), false)}${k('Correlation', c.correlation)}${c.async ? '' : k('Timeout', c.timeout)}${k('Retry', c.retry)}${k('Failure', c.failure)}${c.async ? '' : k('Repeats', c.idempotency || c.duplicate)}${k('Access', c.authorization)}</dl>
  ${marked.has(c.id) && i ? `<div class="cm-note gold">${i.objectContext({id: c.id, ref: c.ref, title: c.title})}</div>` : ''}
  <div class="cm-acts"><button type="button" class="cm-btn primary" data-i-action="edit-contract" data-i-id="${esc(c.id)}" ${locked ? 'disabled title="Review or close the current proposal first"' : ''}>${icon('edit')}Edit contract</button>${!locked && (c.gaps.includes('timeout') || c.gaps.includes('failure handling')) ? `<button type="button" class="cm-btn gold" data-cm="propose" data-key="uncertainty" data-id="${esc(c.id)}">Propose recovery wording</button>` : ''}${!locked && c.gaps.includes('duplicate handling') ? `<button type="button" class="cm-btn gold" data-cm="propose" data-key="reference" data-id="${esc(c.id)}">Propose repeat protection</button>` : ''}<button type="button" class="cm-btn" data-brain-launch="mind">${icon('mind')}Mind Factory</button><a class="cm-btn" href="${esc(projectURL('/?chapter=8&tab=work&object=' + encodeURIComponent(c.id)))}">Open in Work</a></div></section>`;
}
function specimenData(d) {
  const moves = X.moves.filter(m => m.data === d.id), holders = [...new Set(moves.map(m => m.to).filter(x => x !== d.authority))];
  const der = X.lineage.filter(l => l.from === d.id || l.to === d.id);
  return `<section class="cm-spec"><h4>${KIND.data}</h4><p class="cm-spec-t"><b>${esc(d.ref)} · ${esc(d.title)}</b></p><p>${esc(d.purpose)}</p><dl class="cm-dl"><div class="${d.authority ? '' : 'miss'}"><dt>Authority</dt><dd>${esc(d.authority ? title(d.authority) : 'Not assigned')}</dd></div><div class="${d.classification ? '' : 'miss'}"><dt>Classification</dt><dd>${esc(d.classification || 'Not recorded')}</dd></div><div><dt>Fields</dt><dd>${d.fields ? esc(d.fieldNames.join(', ')) + (d.fields > d.fieldNames.length ? '…' : '') : '—'}</dd></div><div class="${d.retentionConfirmed ? '' : 'miss'}"><dt>Retention</dt><dd>${esc(d.retention || 'Not recorded')}${d.retention && !d.retentionConfirmed ? ' · not confirmed' : ''}</dd></div><div><dt>Travels</dt><dd>${moves.length ? moves.map(m => esc((X.C.get(m.contract)?.ref || '') + ' ' + title(m.from) + ' → ' + title(m.to))).join('<br>') : 'Not carried by any contract'}</dd></div><div><dt>Copies held by</dt><dd>${holders.length ? esc(holders.map(title).join(', ')) : 'None'}</dd></div>${der.length ? `<div><dt>Derivations</dt><dd>${der.map(l => esc(l.title || (X.D.get(l.from)?.title + ' → ' + X.D.get(l.to)?.title))).join('<br>')}</dd></div>` : ''}</dl>
  <div class="cm-acts"><button type="button" class="cm-btn primary" data-i-action="edit-data" data-i-id="${esc(d.id)}" ${pending() ? 'disabled title="Review or close the current proposal first"' : ''}>${icon('edit')}Edit data definition</button>${S.view === 'sequence' ? '<button type="button" class="cm-btn" data-cm="view" data-id="data">Follow it in Data flow</button>' : '<button type="button" class="cm-btn" data-cm="view" data-id="sequence">See it in the sequence</button>'}<a class="cm-btn" href="${esc(projectURL('/?chapter=8&tab=work&object=' + encodeURIComponent(d.id)))}">Open in Work</a></div></section>`;
}
function specimenLane(id) {
  const t = T(id), provides = [...X.C.values()].filter(c => c.to === id), uses = [...X.C.values()].filter(c => c.from === id), owns = [...X.D.values()].filter(d => d.authority === id);
  const sc = scope(), canDissect = (t === 'module' && !(sc.kind === 'module' && sc.id === id)) || (['component', 'party'].includes(t) && !(sc.kind === 'part' && sc.id === id));
  const list = cs => cs.map(c => `<button type="button" class="cm-link" data-sel="${esc(c.id)}">${esc(c.ref)} ${esc(c.title)}${c.gaps.length ? ' <i>·' + c.gaps.length + '</i>' : ''}</button>`).join('') || '<em>None</em>';
  return `<section class="cm-spec"><h4>${KIND[t] || 'Part'}</h4><p class="cm-spec-t"><b>${esc(title(id))}</b></p>${t === 'module' ? `<p>${X.M.comp.filter(c => X.M.mod.get(c.id) === id).map(c => esc(c.title)).join(', ')}</p>` : ''}<dl class="cm-dl"><div><dt>Provides</dt><dd>${list(provides)}</dd></div><div><dt>Uses</dt><dd>${list(uses)}</dd></div><div><dt>Authority for</dt><dd>${owns.map(d => `<button type="button" class="cm-link" data-sel="${esc(d.id)}">${esc(d.ref)} ${esc(d.title)}</button>`).join('') || '<em>No data</em>'}</dd></div></dl>
  <div class="cm-acts">${canDissect ? `<button type="button" class="cm-btn primary" data-cm="dissect" data-id="${esc(id)}">${icon('dissect')}${t === 'module' ? 'Open this module' : 'Focus on this part'}</button>` : ''}${t === 'component' ? `<a class="cm-btn" href="${esc(projectURL('/?chapter=5&tab=model&object=' + encodeURIComponent(id)))}">Chapter 5 model</a>` : ''}</div></section>`;
}
function specimenStep(id) {
  const e = F?.events.find(x => x.t === 'step' && x.ref === id); if (!e) return '';
  return `<section class="cm-spec"><h4>Journey step</h4><p class="cm-spec-t"><b>${e.n} · ${esc(e.title)}</b></p><p>${esc(describeEvent(X, e, {gaps: S.lens === 'signals'}))}</p><dl class="cm-dl"><div><dt>Recorded as</dt><dd>${esc(id)}${e.owner ? ' · ' + esc(e.owner) : ''}</dd></div><div class="${e.resp ? '' : 'miss'}"><dt>Responsibility</dt><dd>${esc(e.resp ? title(e.resp) : 'Not linked')}</dd></div><div class="${e.actor ? '' : 'miss'}"><dt>Done by</dt><dd>${esc(e.actor ? title(e.actor) : 'No component')}</dd></div></dl><div class="cm-acts">${e.actor ? `<button type="button" class="cm-btn" data-sel="${esc(e.actor)}">Select ${esc(title(e.actor))}</button>` : ''}<a class="cm-btn" href="${esc(projectURL('/?chapter=4&tab=model&object=' + encodeURIComponent(e.resp || id)))}">Chapter 4 model</a></div></section>`;
}
function reading() {
  if (diagramView()) return NT.readingHTML();
  if (S.view !== 'sequence') {
    const rows = G.rows, auth = rows.filter(r => r.authority).length;
    return `<section><h4>Reading this view</h4><p>Each row is a data definition. <b>★</b> marks its authority — the one system of record. Arrows show where it travels, with the contract that carries it; a hollow ring is a copy held elsewhere.</p><p>${rows.length} definition${rows.length === 1 ? '' : 's'}, ${auth} with an authority. Switch to <b>Signals</b> to see which movements travel on an incomplete contract.</p></section>`;
  }
  const s = scenario();
  if (!s) return '<section><h4>Reading this view</h4><p>No interactions are recorded yet. Define a contract between two components to start the sequence.</p></section>';
  const lines = F.events.filter(e => ['call', 'return', 'self', 'gap', 'recover', 'end'].includes(e.t)).slice(0, 14);
  return `<section><h4>Reading this scenario</h4><p>${s.kind === 'journey' ? `The business journey <b>${esc(s.title)}</b>, step by step, as the recorded components and contracts carry it.` : s.kind === 'entry' ? `The calls that follow when work arrives from outside. No business journey is recorded, so this is the recorded call tree.` : 'Every recorded interaction once, grouped by caller.'} Requests nest: each caller stays busy until its answer returns.</p><ol class="cm-read">${lines.map(e => `<li><button type="button" data-ev="${e.id}" class="${S.ev === e.id || (S.walk >= 0 && walkEvents()[S.walk]?.id === e.id) ? 'lit' : ''}">${esc(describeEvent(X, e, {gaps: S.lens === 'signals'}))}</button></li>`).join('')}</ol>${F.events.length > 14 ? '<p class="cm-muted">Walk through to read every step.</p>' : ''}</section>`;
}
const insightsList = () => exchangeInsights(X, scope()).slice(0, 8);
function insightsHTML(list = insightsList()) {
  if (!list.length) return '';
  return `<section><h4>What the model shows<span>${list.length}</span></h4>${list.map(x => `<button type="button" class="cm-ins ${x.kind}" data-sel="${esc(x.id)}" ${x.scenario ? `data-scenario="${esc(x.scenario)}"` : ''}><span>${esc(x.text)}</span>${x.ask ? `<small>Ask: ${esc(x.ask)}</small>` : ''}</button>`).join('')}<p class="cm-muted">Drawn from recorded contracts, data and journeys. They are prompts for review, not verdicts.</p></section>`;
}
function findingsHTML() {
  if (!findings) return '';
  const sc = scope(), inS = f => sc.kind === 'system' || [f.subject, f.host].some(id => id && (id === sc.id || X.M.mod.get(id) === sc.id || X.C.get(id)?.from === sc.id || X.C.get(id)?.to === sc.id || X.D.get(id)?.authority === sc.id));
  const fs = findings.all.filter(f => f.chapter === 8 && inS(f));
  if (!fs.length) return '';
  const groups = new Map();
  for (const f of fs) { const k = f.title; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
  return `<section><h4>Chapter 8 checks<span>${fs.length}</span></h4>${[...groups].slice(0, 8).map(([k, g]) => `<button type="button" class="cm-fg ${g.some(f => f.level === 'error') ? 'error' : ''}" data-sel="${esc(g[0].subject || g[0].host || '')}"><b>${esc(k)}</b><small>${g.length} · ${esc([...new Set(g.map(f => ref(f.subject || f.objectId)))].slice(0, 4).join(', '))}${g.length > 4 ? '…' : ''}</small></button>`).join('')}<a class="cm-muted" href="${esc(projectURL('/?chapter=8&tab=validate&validate=readiness'))}">All checks on Validate →</a></section>`;
}
function panel() {
  const box = root.querySelector('.cm-panel'), ins = insightsList();
  solMark(root, project(), 8);
  panelToggle(root, '[data-cm="panel"]', S.panel, ins.length);
  if (!S.panel) { box.innerHTML = ''; return; }
  const s = S.sel, t = T(s);
  let spec = '';
  if (t === 'contract') spec = specimenContract(X.C.get(s));
  else if (t === 'data') spec = specimenData(X.D.get(s));
  else if (['component', 'party', 'module'].includes(t)) spec = specimenLane(s) + (t === 'component' ? specPanelHTML(project(), s) : '');
  else if (s && F?.events.some(e => e.t === 'step' && e.ref === s)) spec = specimenStep(s);
  else if (s && X.links.some(l => l.id === s)) { const l = X.links.find(x => x.id === s); spec = `<section class="cm-spec"><h4>Interaction without a contract</h4><p class="cm-spec-t"><b>${esc(title(l.from))} → ${esc(title(l.to))}</b></p><p>${esc(l.label)} is recorded as an interaction, but no contract says what it carries or how failures are handled.</p><div class="cm-acts"><button type="button" class="cm-btn primary" data-i-action="new-contract">Define a contract</button></div></section>`; }
  if (!spec && s && drawn(s)) spec = NT.specimenHTML(s);
  box.innerHTML = solInto(spec, solSection(project(), 8, s)) + reading() + insightsHTML(ins) + findingsHTML();
}

// ---------------------------------------------------------------- walk-through

const walkEvents = () => (S.view === 'sequence' && F ? F.events.filter(e => ['call', 'return', 'self', 'gap', 'recover', 'end', 'guard'].includes(e.t)) : []);
// The footer: the walk's controls and, while walking, its text; otherwise the status line beside them.
function walkBar() {
  if (diagramView()) { const w = root.querySelector('.cm-walk-in'); if (w) w.innerHTML = ''; return; }
  const bar = root.querySelector('.cm-walk-in'), evs = walkEvents();
  if (S.view !== 'sequence' || !evs.length) { bar.innerHTML = ''; return; }
  const cur = S.walk >= 0 ? evs[S.walk] : null;
  bar.innerHTML = `<button type="button" class="cm-btn${timer ? ' on' : ''}" data-cm="walk" aria-pressed="${!!timer}" title="${esc(evs.length + ' steps · Walk through the scenario one message at a time.')}">${icon(timer ? 'pause' : 'play')}<span>${timer ? 'Pause' : S.walk >= 0 ? 'Continue' : 'Walk through'}</span></button>${S.walk >= 0 ? `<button type="button" class="cm-btn icon" data-cm="prev" aria-label="Previous step" ${S.walk <= 0 ? 'disabled' : ''}>‹</button>` : ''}<button type="button" class="cm-btn icon" data-cm="next" aria-label="${S.walk >= 0 ? 'Next step' : 'First step'}" ${S.walk >= evs.length - 1 ? 'disabled' : ''}>›</button>${cur ? `<p class="cm-walk-text"><b>${S.walk + 1} / ${evs.length}</b> ${esc(describeEvent(X, cur, {gaps: S.lens === 'signals'}))}</p>` : ''}${S.walk >= 0 ? '<button type="button" class="cm-btn icon" data-cm="walk-stop" aria-label="Stop the walk-through">×</button>' : ''}`;
}
function walkTo(i) {
  const evs = walkEvents(); if (!evs.length) return;
  S.walk = Math.max(0, Math.min(evs.length - 1, i)); S.ev = null;
  render(); revealEvent(evs[S.walk].id);
}
function stopWalk() { if (timer) clearTimeout(timer); timer = null; }
function play() {
  if (timer) { stopWalk(); walkBar(); return; }
  const evs = walkEvents(); if (!evs.length) return;
  if (S.walk >= evs.length - 1) S.walk = -1;
  const tick = () => { if (!root?.isConnected) return stopWalk(); if (S.walk >= walkEvents().length - 1) { stopWalk(); walkBar(); return; } timer = setTimeout(tick, 2200); walkTo(S.walk + 1); };
  timer = setTimeout(tick, 0);
}

// ---------------------------------------------------------------- camera

function revealEvent(id) {
  const m = L.msgs?.find(x => x.id === id), f = L.frames?.find(x => x.id === id), r = L.rows?.find(x => x.id === id);
  if (m) stage.reveal(Math.min(m.x1, m.x2), m.y - 30, Math.abs(m.x2 - m.x1) + 20, 60);
  else if (f) stage.reveal(f.x, f.y, f.w, f.h);
  else if (r) stage.reveal(L.gutter, r.y, 200, r.h);
}
function revealSelection() {
  if (diagramView()) { const b = NT.layout()?.nodes.find(n => n.id === S.sel); if (b) stage.reveal(b.x, b.y, b.w, b.h); return; }
  if (!S.sel) return;
  if (S.view === 'data') { const r = L.rows.find(x => x.id === S.sel); if (r) stage.reveal(L.gutter, r.y, 200, r.h); return; }
  const m = L.msgs.find(x => x.ev.contract === S.sel || (x.ev.data || []).includes(S.sel) || x.ev.a === S.sel || x.ev.b === S.sel);
  if (m) revealEvent(m.id);
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
function select(id, {reveal = false, ev = null} = {}) {
  stopWalk(); S.walk = -1;
  S.sel = id || null; S.ev = ev;
  if (S.sel && !S.panel) S.panel = true;
  save(); render();
  if (reveal) revealSelection();
}
function setScope(sc) {
  const r = exchangeScope(X, sc);
  S.scope = r.kind === 'system' ? {kind: 'system'} : {kind: r.kind, id: r.id};
  if (r.focus) S.sel = r.focus;
  stopWalk(); S.walk = -1; fitPending = true; save(); render();
}
function up() { const sc = scope(); if (sc.kind === 'part') { const m = X.M.mod.get(sc.id); setScope(m ? {kind: 'module', id: m} : {kind: 'system'}); } else if (sc.kind === 'module') setScope({kind: 'system'}); }
function dissect(id) { if (!id) return; setScope({kind: T(id) === 'module' ? 'module' : 'part', id}); }
function propose(key, id) {
  const studio = window.aiwLogicalStudio;
  if (!studio?.preview || !studio?.accept) return;
  try { studio.preview(key, id); setTimeout(() => { try { studio.accept(); } catch { /* the editor reports its own errors */ } }, 30); } catch { /* the studio reports its own errors */ }
}

function bind() {
  solChapterBind(root, 8, {refresh: solRefresh});
  root.addEventListener('click', e => {
    if (root.dataset.suppress) return;
    if (NT.handle(e)) return;
    const add = root.querySelector('.cm-add');
    if (add?.open && !e.target.closest('.cm-add > summary')) add.open = false;
    if (e.target.closest('[data-brain-launch],[data-i-action],[data-ip-action],a')) return;
    const a = e.target.closest('[data-cm]');
    if (a && !a.disabled) {
      const k = a.dataset.cm;
      if (k === 'view') { S.view = a.dataset.id; stopWalk(); S.walk = -1; fitPending = true; save(); render(); revealSelection(); return; }
      if (k === 'lens') { S.lens = a.dataset.id; save(); render(); return; }
      if (k === 'depth') { S.depth = a.dataset.id; fitPending = true; save(); render(); return; }
      if (k === 'scope') { setScope(a.dataset.kind === 'module' ? {kind: 'module', id: a.dataset.id} : {kind: 'system'}); return; }
      if (k === 'dissect') { dissect(a.dataset.id); return; }
      if (k === 'explore') { cbs.explore?.(8); return; }
      if (k === 'expand') { const on = !document.body.classList.contains('cm-expanded'); document.body.classList.toggle('cm-expanded', on); a.setAttribute('aria-pressed', String(on)); sizeModel(root, 'cm-expanded'); fitPending = true; setTimeout(() => render(), 30); return; }
      if (k === 'panel') { S.panel = !S.panel; save(); fitPending = true; render(); setTimeout(() => { fitPending = true; render(); }, 30); return; }
      if (k === 'key') { const key = root.querySelector('.cm-key'); key.classList.toggle('cm-min'); a.setAttribute('aria-expanded', String(!key.classList.contains('cm-min'))); return; }
      if (k === 'fit') { stage.fitAll(); return; }
      if (k === 'zin' || k === 'zout') { const {w, h} = stage.box(); stage.zoomAt(stage.cam.z * (k === 'zin' ? 1.15 : 1 / 1.15), w / 2, h / 2); return; }
      if (k === 'walk') { play(); return; }
      if (k === 'next') { stopWalk(); walkTo(S.walk + 1); return; }
      if (k === 'prev') { stopWalk(); walkTo(S.walk - 1); return; }
      if (k === 'walk-stop') { stopWalk(); S.walk = -1; render(); return; }
      if (k === 'propose') { propose(a.dataset.key, a.dataset.id); return; }
      if (k === 'noop') return;
    }
    const step = e.target.closest('[data-step]');
    if (step) { select(S.sel === step.dataset.step ? null : step.dataset.step); return; }
    const ins = e.target.closest('[data-scenario]');
    if (ins && ins.dataset.scenario !== S.scenario && S.view === 'sequence') { S.scenario = ins.dataset.scenario; fitPending = true; }
    const lane = e.target.closest('[data-lane]');
    if (lane) {
      // Heads are redrawn on selection, so a double click is recognised here rather than by dblclick.
      const id = lane.dataset.lane, now = Date.now(), twice = lastLaneClick.id === id && now - lastLaneClick.t < 420;
      lastLaneClick = {id, t: now};
      if (twice) { lastLaneClick = {id: null, t: 0}; dissect(id); return; }
      select(id); return;
    }
    const s = e.target.closest('[data-sel]');
    if (s && s.dataset.sel) { e.stopPropagation(); const ev = s.closest('[data-ev]')?.dataset.ev || null; select(S.sel === s.dataset.sel && S.ev === ev && !s.closest('.cm-panel') ? null : s.dataset.sel, {reveal: !!s.closest('.cm-panel'), ev}); return; }
    const evb = e.target.closest('[data-ev]');
    if (evb) { const ev = (F?.events || []).find(x => x.id === evb.dataset.ev); if (ev) { const id = ev.contract || ev.link || (ev.t === 'self' ? ev.lane : ev.t === 'gap' ? ev.to : null); select(id, {ev: ev.id}); if (evb.closest('.cm-panel')) revealEvent(ev.id); } return; }
    if (e.target.closest('.cm-stage') && !e.target.closest('.cm-heads,.cm-rail,.cm-edge') && (S.sel || S.walk >= 0)) { S.walk = -1; stopWalk(); select(null); }
  });
  root.addEventListener('change', e => { if (NT.change(e)) return; if (e.target.dataset.cmField === 'scenario') { S.scenario = e.target.value; stopWalk(); S.walk = -1; S.ev = null; fitPending = true; save(); render(); } });
  // Escape steps back one thing at a time: the walk-through, the selection, the scope, the
  // expanded view. It also works after a redraw has moved focus back to the page.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !root?.isConnected || document.querySelector('dialog[open]')) return;
    const a = document.activeElement;
    if (a && a !== document.body && !root.contains(a)) return;
    if (a?.closest?.('select,details[open],textarea')) return;
    if (timer || S.walk >= 0) { stopWalk(); S.walk = -1; render(); }
    else if (S.sel) select(null);
    else if (scope().kind !== 'system') up();
    else if (document.body.classList.contains('cm-expanded')) root.querySelector('[data-cm="expand"]').click();
    else return;
    e.preventDefault();
  });
  root.addEventListener('keydown', e => { if (NT.keydown(e)) return;
    if (S.walk >= 0 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target.closest('.cm-stage,.cm-walk')) { stopWalk(); walkTo(S.walk + (e.key === 'ArrowRight' ? 1 : -1)); e.preventDefault(); }
  });
  root.addEventListener('pointerleave', () => { root.querySelector('.cm-tip').hidden = true; });
  window.addEventListener('resize', () => { if (!root?.isConnected) return; clearTimeout(bind._r); bind._r = setTimeout(() => { sizeModel(root, 'cm-expanded'); render(); }, 120); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!root?.isConnected || !L) return; clearTimeout(bind._ro); bind._ro = setTimeout(() => { const w = stage.box().w; if (Math.abs(w - stageW) > 24) { stageW = w; fitPending = true; render(); } }, 90); }).observe(root.querySelector('.cm-stage'));
}
function tip(e) {
  const box = root.querySelector('.cm-tip'), t = e.target.closest?.('.cm-msg,.cm-mvl,.cm-head,.cm-drow,.cm-auth,.nt-node');
  if (!t || !root.contains(t)) { box.hidden = true; return; }
  if (t.dataset.ntNode) { box.innerHTML = NT.tipHTML(t.dataset.ntNode); box.hidden = !box.innerHTML; if (!box.hidden) placeTip(box, e); return; }
  let html = '';
  const ev = t.dataset.ev && F?.events.find(x => x.id === t.dataset.ev);
  if (ev) html = `<b>${esc(ev.contract ? X.C.get(ev.contract).ref + ' · ' + X.C.get(ev.contract).title : ev.label || '')}</b>${esc(describeEvent(X, ev, {gaps: true}))}`;
  else if (t.dataset.lane) { const l = L.lanes.find(x => x.id === t.dataset.lane); html = `<b>${esc(l.title)}</b>${esc(KIND[l.kind])}${l.kind === 'module' ? ' · double-click to open it' : ' · double-click to focus on it'}`; }
  else if (t.dataset.sel) { const id = t.dataset.sel, c = X.C.get(id), d = X.D.get(id); html = c ? `<b>${esc(c.ref + ' · ' + c.title)}</b>${esc(title(c.from) + ' → ' + title(c.to))}${c.gaps.length ? '<small class="f">Not recorded: ' + esc(c.gaps.join(', ')) + '</small>' : ''}` : d ? `<b>${esc(d.ref + ' · ' + d.title)}</b>${esc((d.classification || 'Unclassified') + ' · authority ' + (d.authority ? title(d.authority) : 'not assigned'))}` : ''; }
  if (!html) { box.hidden = true; return; }
  box.innerHTML = html + '<small class="h">Select to follow it</small>'; box.hidden = false;
  placeTip(box, e);
}

export function exchangeDebug() { return {S: {...S}, X, L, F, G, cam: {...stage?.cam}}; }

// The common chapter-model interface used by workspace-ux.
export {mountExchangeModel as mountChapterModel, leaveExchangeModel as leaveChapterModel};
