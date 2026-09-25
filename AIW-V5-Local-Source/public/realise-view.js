// Chapter 5 Model — Application realisation.
//
// Two architecture models of the same realisation, drawn from recorded facts:
// - Components: the application components in their modules, each carrying the
//   responsibilities it realises (the logical design embedded in the physical one) and standing
//   on the platform capabilities it needs; the interactions between them, and the parties outside.
// - Allocation: which component realises which responsibility, with what scope, and why.
// Sliced like every chapter model (whole system → one module → one component), read through the
// Structure, Flow and Reasoning lenses, and edited only through the Chapter 5 editors and
// component proposals.
import {realiseSource, foldRealise, realiseScope, allocation, realiseInsights, describeFlow, describeComponent, describeLogical, realiseWalk, defaultDepth, laneInfo, KIND_LABEL, PROPOSED, OUT_L, OUT_R, NONE} from './realise-model.js';
import {realiseLayout, realiseHead, allocationLayout, allocationHead, realLines, RL, AX} from './realise-layout.js';
import {modelStage, sizeModel, placeTip} from './model-stage.js';
import {projectPreferenceKey, projectURL} from './project-context.js';
import {mountBrainContext} from './brain-context-ui.js';
import {specPanelHTML, runsOnLabel, productLabels} from './spec-panel.js';
import {solChapterMount, solChapterBind, solSection, solInto, solMark} from './chapter-sol.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const project = () => window.aiwProjectStore?.value?.document || window.aiwCurrentProject;
// Sol's advice changes the project only through a store command; the view then reads the new document.
const solRefresh = () => { if (root?.isConnected) mountChapterModel({id: pageSel}, cbs); };
const studio = () => window.aiwLogicalStudio;
// Chapter 5 edits that reach other chapters are staged as a reviewable model proposal; while one
// is open, the model shows the proposed design and marks what it changes.
const pending = () => { const i = window.aiwInterfaceImpact; return i?.pending && i.previewInChapter?.(5) ? i : null; };
const PATHS = {structure: 'M6 3v18M18 3v18M6 8h12M6 16h12', flow: 'M3 12h13m-4-5 5 5-5 5M3 5h6M3 19h6', reasoning: 'M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9M9 7h6M9 17h6', model: 'M3 4h8v7H3zM13 13h8v7h-8zM11 7h4v6', matrix: 'M4 4h16v16H4zM4 10h16M4 16h16M10 4v16M16 4v16', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', panel: 'M3 4h18v16H3zM15 4v16', explore: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', plus: 'M12 5v14M5 12h14', spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z', mind: 'm3 7 9-4 9 4-9 4-9-4m0 5 9 4 9-4m-18 5 9 4 9-4', edit: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4', dissect: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14M21 21l-5-5M8 11h6', play: 'M7 4v16l13-8z', link: 'M9 15 15 9M8 12l-2 2a3 3 0 0 0 4 4l2-2m4-4 2-2a3 3 0 0 0-4-4l-2 2'};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[n] || PATHS.model}"/></svg>`;
const LENSES = [
  {id: 'structure', label: 'Structure', like: 'skeleton', q: 'What each component realises and owns, and which contract formalises each interaction.'},
  {id: 'flow', label: 'Flow', like: 'muscles', q: 'What each component takes in and gives out, how each interaction behaves, and what happens when it fails.'},
  {id: 'reasoning', label: 'Reasoning', like: 'DNA', q: 'The requirements, quality drivers and decisions behind each component, and the logical flow each interaction carries.'}
];
const KIND = {component: 'Application component', party: 'External participant', module: 'Module', hole: 'Not realised', proposed: 'Proposal · not saved'};
const IKIND = {sync: 'Request and answer', event: 'Event / work handoff', data: 'Data dependency'};
const clsOf = c => (/restricted|secret/i.test(c) ? 'restricted' : /confidential|personal|sensitive/i.test(c) ? 'confidential' : /internal/i.test(c) ? 'internal' : c ? 'public' : 'unclassified');

let marked = new Set(), lastProposal = '';
let root = null, V = null, lastDoc = null, cbs = {}, F = null, L = null, G = null, fitPending = true, stage = null, lastClick = {id: null, t: 0}, pageSel;
let S = {view: 'components', lens: 'structure', scope: {kind: 'system'}, depth: 'auto', sel: null, panel: true, walk: -1};
const pref = () => projectPreferenceKey('aiw-realise-model-v1');
function load() { try { const v = JSON.parse(localStorage.getItem(pref()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
function save() { try { localStorage.setItem(pref(), JSON.stringify({view: S.view, lens: S.lens, scope: S.scope, depth: S.depth, sel: S.sel, panel: S.panel})); } catch { /* preferences are optional */ } }
function anatomyOrder() { try { return JSON.parse(localStorage.getItem(projectPreferenceKey('aiw-anatomy-v1')) || '{}').order || {}; } catch { return {}; } }

// ---------------------------------------------------------------- mount / leave

export function mountChapterModel(selection, callbacks = {}) {
  const p = project(), host = document.querySelector('.studio > .stage.tab-content');
  if (!p || !host) return;
  cbs = callbacks;
  solChapterMount(p, 5, solRefresh);
  if (!root) {
    root = document.createElement('section'); root.className = 'cm rz'; root.setAttribute('aria-label', 'Chapter 5 model: application realisation');
    root.innerHTML = shell();
    stage = modelStage(root, {headHeight: () => (S.view === 'allocation' ? allocationHead() : realiseHead()), railWidth: l => (l.kind === 'allocation' ? l.rail : 0), onHover: tip});
    stage.bind(); bind();
    const v = load();
    for (const k of ['view', 'lens', 'depth', 'sel']) if (typeof v[k] === 'string') S[k] = v[k];
    if (v.scope && typeof v.scope === 'object') S.scope = v.scope;
    if (typeof v.panel === 'boolean') S.panel = v.panel;
    if (!['components', 'allocation'].includes(S.view)) S.view = 'components';
    if (!LENSES.some(l => l.id === S.lens)) S.lens = 'structure';
  }
  const first = !V;
  if (host.firstElementChild !== root) host.prepend(root);
  document.body.classList.add('cm-active', 'am-active');
  const d = pending()?.document || p;
  if (d !== lastDoc || !V) { lastDoc = d; rebuild(d); }
  const selectable = id => !!id && known(id);
  if (first && V) { const want = window.aiwChapterModels ? window.aiwChapterModels.takeLink(5) : new URLSearchParams(location.search).get('object'); if (selectable(want)) { S.sel = want; setTimeout(revealSelection, 60); } }
  else if (V && pageSel !== undefined && selection?.id !== pageSel && selectable(selection?.id)) { S.sel = selection.id; setTimeout(revealSelection, 60); }
  pageSel = selection?.id ?? null;
  render();
  sizeModel(root, 'cm-expanded');
}
export function leaveChapterModel() {
  document.body.classList.remove('cm-active', 'cm-expanded');
  root?.remove();
}
function rebuild(p) {
  try { V = realiseSource(p, {order: anatomyOrder()}); } catch (e) { console.error('Realisation model', e); V = null; return; }
  if (S.sel && !known(S.sel)) S.sel = null;
  if (S.scope?.id && realiseScope(V, S.scope).kind === 'system') S.scope = {kind: 'system'};
  marked = new Set();
  const i = pending(), roots = [];
  if (i) { try { const g = i.decorate({nodes: [...V.elements.keys(), ...V.R.keys(), ...V.flows.map(f => f.id)].map(id => ({id, attrs: {}})), edges: []}); for (const n of g.nodes) { if (n.ghost || n.changeImpact) marked.add(n.id); if (n.ghost) roots.push(n.id); } } catch { /* the preview decorates what it can */ } }
  const key = i ? roots.join(',') : '';
  if (key && key !== lastProposal && roots[0] && known(roots[0])) { S.sel = roots[0]; setTimeout(revealSelection, 60); }
  lastProposal = key;
}
const isData = id => V.M.T(id) === 'data';
const known = id => V.elements.has(id) || V.R.has(id) || V.modules.has(id) || V.flows.some(f => f.id === id) || V.lflows.some(l => l.id === id) || isData(id) || V.M.T(id) === 'capability' || id === OUT_L || id === OUT_R;

// ---------------------------------------------------------------- shell

function shell() {
  return `<header class="cm-top"><div class="cm-title"><small>Chapter 5 · Model</small><strong>Application realisation</strong></div>
   <nav class="cm-crumbs" aria-label="Where you are"></nav>
   <div class="cm-views" role="group" aria-label="Model"><button type="button" class="cm-view" data-rz="view" data-id="components">${icon('model')}<span>Components</span></button><button type="button" class="cm-view" data-rz="view" data-id="allocation">${icon('matrix')}<span>Allocation</span></button></div>
   <div class="cm-actions"><details class="cm-add"><summary class="cm-btn" aria-label="Add to the model">${icon('plus')}<span>Add</span></summary><div><button type="button" data-a-action="new">New component</button><button type="button" data-a-action="connect">Connect components</button><p>To realise a particular responsibility, select it first and use “Create a component for it”.</p></div></details>
    <button type="button" class="cm-btn" data-rz="explore" title="The connected explorer: every perspective of the whole model">${icon('explore')}<span>Explore all perspectives</span></button>
    <button type="button" class="cm-btn icon" data-rz="expand" aria-pressed="false" aria-label="Expand the model" title="Expand">${icon('expand')}</button>
    <button type="button" class="cm-btn icon" data-rz="panel" aria-pressed="true" aria-label="Show the companion panel" title="Companion">${icon('panel')}</button></div></header>
  <div class="cm-bar"><div class="cm-lenses" role="group" aria-label="Lens"></div><div class="cm-depth" role="group" aria-label="Elements"></div><p class="cm-state" role="status" aria-live="polite"></p></div>
  <div class="cm-banner"></div>
  <div class="cm-body"><div class="cm-stage" tabindex="0" aria-label="Realisation canvas. Drag or scroll to move; Ctrl or Command and scroll to zoom.">
    <div class="cm-world"><svg class="cm-svg" aria-hidden="true"></svg><div class="cm-html"></div></div>
    <div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div>
    <div class="cm-key cm-min"><button type="button" class="cm-kt" data-rz="key" aria-expanded="false">Key</button><div class="cm-legend"></div></div>
    <div class="cm-zoom"><button type="button" data-rz="zout" aria-label="Zoom out">−</button><button type="button" data-rz="zin" aria-label="Zoom in">+</button><button type="button" data-rz="fit" aria-label="Fit the width">${icon('fit')}</button></div>
  </div><aside class="cm-panel" aria-label="Companion"></aside></div>
  <footer class="cm-walk" aria-label="Walk the logical flows through the components"></footer><div class="cm-tip" role="tooltip" hidden></div>`;
}

// ---------------------------------------------------------------- render

const titleOf = id => V.elements.get(id)?.title || V.R.get(id)?.title || V.modules.get(id)?.title || V.M.byId.get(id)?.title || (id === OUT_L || id === OUT_R ? 'Outside' : id);
const refOf = id => V.elements.get(id)?.ref || V.R.get(id)?.ref || V.M.byId.get(id)?.ref || '';
const refTitle = id => { const r = refOf(id); return (r && r !== id ? r + ' ' : '') + titleOf(id); };
function scope() { return realiseScope(V, S.scope); }
function depth() { return S.depth === 'auto' ? defaultDepth(V) : S.depth; }
const ghost = () => { const g = studio()?.proposal; return g && g.title && !g.existingId && Array.isArray(g.allocations) ? g : null; };
const allocView = () => S.view === 'allocation';
// Wide enough for the reference and name; the lens line below truncates within it.
function measure(l) { return Math.max(96, 24 + 6.6 * (String(l.label || '').length + (l.ref ? l.ref.length + 1 : 0))); }

function render() {
  if (!root) return;
  if (!V) { root.querySelector('.cm-html').innerHTML = '<p class="cm-empty">The realisation model could not be prepared for this project.</p>'; return; }
  root.classList.remove('cm-lens-structure', 'cm-lens-flow', 'cm-lens-reasoning');
  root.classList.add('cm-lens-' + S.lens);
  root.classList.toggle('rz-matrix', allocView());
  root.querySelector('.cm-body').classList.toggle('no-panel', !S.panel);
  root.querySelector('[data-rz="panel"]').setAttribute('aria-pressed', String(S.panel));
  // Geometry depends on the elements, the scope, the depth and a pending proposal — never the lens.
  F = foldRealise(V, scope(), depth(), {proposal: ghost()});
  if (allocView()) { G = allocation(V, scope(), {proposal: ghost()}); L = allocationLayout(G); } else L = realiseLayout(F, {measure});
  const world = root.querySelector('.cm-world'), svg = root.querySelector('.cm-svg');
  world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
  svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
  const hl = highlight();
  if (allocView()) { svg.innerHTML = matrixSVG(hl); root.querySelector('.cm-html').innerHTML = matrixHTML(hl); matrixHeads(hl); matrixRail(hl); }
  else { svg.innerHTML = defs() + modelSVG(hl); root.querySelector('.cm-html').innerHTML = modelHTML(hl); modelHeads(hl); root.querySelector('.cm-rail-in').innerHTML = ''; }
  chrome(); panel(); walkBar();
  stage.use(L, JSON.stringify([S.view, S.scope?.kind || 'system', S.scope?.id || '', depth()]));
  if (fitPending) { fitPending = false; stage.fit(); } else stage.clamp();
  stage.apply();
}

// What an object concerns, in the terms of the drawn model.
function concerns(id) {
  const out = {elements: new Set(), flows: new Set(), resp: new Set(), lanes: new Set(), data: new Set()};
  const comp = c => { out.elements.add(c); };
  if (V.R.has(id)) { const r = V.R.get(id); out.resp.add(id); r.realisedBy.forEach(comp); if (!r.realisedBy.length) out.elements.add('HOLE:' + id); }
  else if (V.lflows.some(l => l.id === id)) { const l = V.lflows.find(x => x.id === id); out.resp.add(l.from); out.resp.add(l.to); V.R.get(l.from).realisedBy.forEach(comp); V.R.get(l.to).realisedBy.forEach(comp); l.carriedBy.forEach(f => out.flows.add(f)); }
  else if (V.flows.some(f => f.id === id)) { const f = V.flows.find(x => x.id === id); out.flows.add(id); comp(f.from); comp(f.to); f.logical.forEach(l => { const x = V.lflows.find(y => y.id === l); out.resp.add(x.from); out.resp.add(x.to); }); }
  else if (V.modules.has(id)) { out.lanes.add(id); for (const e of V.elements.values()) if (e.module === id && e.kind !== 'party') out.elements.add(e.id); for (const f of V.flows) if (out.elements.has(f.from) || out.elements.has(f.to)) out.flows.add(f.id); }
  else if (id === OUT_L || id === OUT_R) { out.lanes.add(id); for (const e of V.elements.values()) if (e.region === id) out.elements.add(e.id); }
  else if (isData(id)) { out.data.add(id); for (const e of V.elements.values()) if ((e.data || []).includes(id)) out.elements.add(e.id); }
  else if (V.M.T(id) === 'capability') { for (const e of V.elements.values()) if ((e.needs || []).includes(id)) out.elements.add(e.id); }
  else if (V.elements.has(id)) { const e = V.elements.get(id); out.elements.add(id); (e.realises || []).forEach(r => out.resp.add(r)); for (const f of V.flows) if (f.from === id || f.to === id) { out.flows.add(f.id); out.elements.add(f.from); out.elements.add(f.to); } }
  else if (id?.startsWith?.('MOD:')) return concerns(id.slice(4));
  return out;
}
function highlight() {
  const out = {on: false, cards: new Set(), links: new Set(), resp: new Set(), comps: new Set(), lanes: new Set(), data: new Set()};
  let id = S.sel;
  if (S.walk >= 0 && !allocView()) { const l = realiseWalk(V)[S.walk]; id = l ? l.id : null; }
  if (!id || id === PROPOSED) return out;
  const c = concerns(id);
  out.on = true; out.resp = c.resp; out.lanes = c.lanes; out.data = c.data; out.comps = c.elements;
  for (const e of c.elements) { const r = F.rowOf(e); if (r) out.cards.add(r); }
  if (id.startsWith('MOD:')) out.cards.add(id);
  for (const l of F.links) if (l.flows.some(f => c.flows.has(f))) { out.links.add(l.id); out.cards.add(l.from); out.cards.add(l.to); }
  return out;
}
const cardCls = (hl, id) => (hl.on ? (hl.cards.has(id) ? ' lit' : ' dim') : '');

function defs() {
  const m = (id, fill, open) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">${open ? `<path d="M1 1 9 5 1 9" fill="none" stroke="${fill}" stroke-width="1.6"/>` : `<path d="M1 1 9 5 1 9z" fill="${fill}"/>`}</marker>`;
  return `<defs>${m('rz-a-n', '#3d5f52')}${m('rz-a-e', '#3f6d86', true)}${m('rz-a-h', '#a8741f')}${m('rz-a-m', '#c3cbbd')}${m('rz-a-p', '#b88830')}</defs>`;
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
function modelSVG(hl) {
  const out = [];
  for (const ln of L.lanes) out.push(`<rect class="rz-lane ${ln.kind}${hl.lanes.has(ln.id) ? ' lit' : ''}" x="${ln.x}" y="${L.top - 6}" width="${ln.w}" height="${L.H - L.top}" rx="12"/>`);
  const order = L.routes.map(r => ({r, lit: hl.links.has(r.id)})).sort((a, b) => a.lit - b.lit);
  for (const {r, lit} of order) {
    const l = r.link, tone = l.proposed ? 'p' : lit ? 'h' : hl.on ? 'm' : l.kind === 'event' ? 'e' : 'n';
    out.push(`<path class="rz-route ${l.kind}${l.party ? ' party' : ''}${l.gaps ? ' gap' : ''}${l.proposed ? ' proposed' : ''}${lit ? ' lit' : hl.on ? ' dim' : ''}${l.dim ? ' out' : ''}" d="${roundPath(r.pts)}" marker-end="url(#rz-a-${tone})"/>`);
  }
  return out.join('');
}
function chipR(id, hl, extra = '') {
  const r = V.R.get(id); if (!r) return '';
  return `<i class="rz-r${hl.resp.has(id) ? ' lit' : ''}${extra}" data-sel="${esc(id)}" title="${esc(r.ref + ' · ' + r.title + (r.purpose ? ' — ' + r.purpose : ''))}"><b>${esc(r.ref)}</b>${esc(r.title)}</i>`;
}
function realises(row, hl) {
  const ids = row.realises || [], max = row.kind === 'module' ? RL.MAX_MOD : RL.MAX_REAL;
  if (!ids.length) return `<div class="rz-real none" style="height:${RL.LINE}px"><em>realises no responsibility</em></div>`;
  const shown = ids.length > max ? ids.slice(0, max - 1) : ids;
  const outside = id => row.module && V.R.get(id)?.module !== row.module && V.R.get(id)?.module !== NONE;
  return `<div class="rz-real" style="height:${realLines(row) * RL.LINE}px">${shown.map(id => chipR(id, hl, outside(id) ? ' outside' : '')).join('')}${ids.length > shown.length ? `<i class="rz-more">+ ${ids.length - shown.length} more</i>` : ''}</div>`;
}
function lensLine(row) {
  const es = row.members.map(id => V.elements.get(id)).filter(e => e?.kind === 'component');
  const data = row.data.map(d => `<i class="cm-d ${clsOf(V.M.byId.get(d)?.classification)}" data-sel="${esc(d)}" title="${esc('Owns ' + titleOf(d))}">${esc(titleOf(d))}</i>`).join('') || '<em>owns no data</em>';
  let flow = '<em>—</em>', why = '<em>—</em>';
  if (row.kind === 'component') {
    const e = es[0];
    flow = e.inputs || e.outputs ? `<span class="rz-io" title="${esc('In: ' + (e.inputs || '—') + ' → Out: ' + (e.outputs || '—'))}">${esc(e.inputs || '—')} <b>→</b> ${esc(e.outputs || '—')}</span>` : '<em class="miss">inputs and outputs not recorded</em>';
    why = `${e.why.reqs.length ? `<i class="rz-w">${esc(e.why.reqs.join(', '))}</i>` : ''}${e.why.qds.length ? `<i class="rz-w q">${e.why.qds.length} driver${e.why.qds.length === 1 ? '' : 's'}</i>` : ''}${e.why.adrs.length ? `<i class="rz-w d">${esc(e.why.adrs.join(', '))}</i>` : '<i class="rz-w miss">no decision</i>'}`;
  } else if (row.kind === 'module') {
    const fl = V.flows.filter(f => row.members.includes(f.from) !== row.members.includes(f.to) && (row.members.includes(f.from) || row.members.includes(f.to))).length;
    flow = `<em>${fl} interaction${fl === 1 ? '' : 's'} across its edge</em>`;
    const adrs = [...new Set(es.flatMap(e => e.why.adrs))];
    why = adrs.length ? `<i class="rz-w d">${esc(adrs.join(', '))}</i>` : '<i class="rz-w miss">no decision</i>';
  } else if (row.kind === 'hole') {
    const r = V.R.get(row.realises[0]);
    why = `${r.why.reqs.length ? `<i class="rz-w">${esc(r.why.reqs.join(', '))}</i>` : ''}${r.why.adrs.length ? `<i class="rz-w d">${esc(r.why.adrs.join(', '))}</i>` : ''}` || '<em>—</em>';
  }
  return `<div class="rz-lens"><span class="st">${data}</span><span class="fl">${flow}</span><span class="rs">${why}</span></div>`;
}
const STRIP_ORDER = ['transactional', 'messaging', 'caching', 'connectivity', 'identity', 'observability', 'backup', 'recovery', 'compute'];
function strip(row, hl) {
  if (!row.needs.length) return `<div class="rz-strip"><small>stands on</small><em>no platform need recorded</em></div>`;
  const prods = row.kind === 'component' ? productLabels(project(), row.members[0]) : new Map();
  // What fits on one line: named products first, the ones that say most about the component (its
  // data, messaging and caching) before the compute every component shares; the rest behind "+N".
  const caps = new Map((project()?.technology?.capabilities || []).map(c => [c.id, c.category]));
  const rank = n => (prods.has(n) ? 0 : 20) + (STRIP_ORDER.includes(caps.get(n)) ? STRIP_ORDER.indexOf(caps.get(n)) : 10);
  const items = row.needs.map((n, i) => ({n, i, text: prods.get(n) || titleOf(n)})).sort((a, b) => rank(a.n) - rank(b.n) || a.i - b.i);
  const avail = RL.CARD_W - 2 * RL.PAD - 58, chipW = t => Math.min(86, t.length * 5.6 + 14) + 3;
  let used = 0, fit = 0;
  for (const it of items) { const w = chipW(it.text), more = items.length - fit - 1; if (fit && used + w + (more ? 28 : 0) > avail) break; used += w; fit++; }
  const shown = items.slice(0, fit), rest = items.slice(fit);
  const chip = it => prods.get(it.n) ? `<i class="rz-n prod" data-sel="${esc(it.n)}" title="${esc(titleOf(it.n) + ' — ' + prods.get(it.n) + ' (Chapter 7)')}">${esc(prods.get(it.n))}</i>` : `<i class="rz-n" data-sel="${esc(it.n)}">${esc(titleOf(it.n))}</i>`;
  return `<div class="rz-strip" title="${esc('Stands on: ' + row.needs.map(n => titleOf(n) + (prods.get(n) ? ' (' + prods.get(n) + ')' : '')).join(', '))}"><small>stands on</small>${shown.map(chip).join('')}${rest.length ? `<i class="rz-n more" data-sel="${esc(row.members[0] || row.id)}" title="${esc('Also: ' + rest.map(it => it.text).join(', '))}">+${rest.length}</i>` : ''}</div>`;
}
function modelHTML(hl) {
  const out = [];
  for (const c of L.cards) {
    const r = c.row, pos = `style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"`;
    if (r.kind === 'party' || (r.kind === 'module' && !r.module)) {
      out.push(`<div class="rz-card party${r.ctx ? ' ctx' : ''}${S.sel === r.id ? ' sel' : ''}${cardCls(hl, r.id)}" data-card="${esc(r.id)}" ${pos} tabindex="0" role="button" aria-label="${esc((r.kind === 'party' ? 'External participant ' : 'Outside ') + r.title)}"><small>${r.kind === 'party' ? 'External participant' : r.members.length + ' participant' + (r.members.length === 1 ? '' : 's')}</small><b>${esc(r.title)}</b></div>`);
      continue;
    }
    if (r.kind === 'hole') {
      const res = V.R.get(r.realises[0]);
      out.push(`<div class="rz-card hole${marked.has(res.id) || marked.has(r.id) ? ' changed' : ''}${cardCls(hl, r.id)}${S.sel === res.id ? ' sel' : ''}" data-card="${esc(r.id)}" ${pos} tabindex="0" role="button" aria-label="${esc('Not realised: ' + res.ref + ' ' + res.title)}"><small>Not realised yet</small><b>${esc(res.ref)} · ${esc(res.title)}</b><div class="rz-real" style="height:${RL.LINE}px"><button type="button" class="cm-mini gold" data-a-action="new-for-logical" data-a-logical="${esc(res.id)}">Create a component for it</button></div>${lensLine(r)}</div>`);
      continue;
    }
    if (r.kind === 'proposed') {
      out.push(`<div class="rz-card proposed" data-card="${PROPOSED}" ${pos}><small>Proposal · not saved · ${esc(KIND_LABEL[r.ckind] || r.ckind)}</small><b>${esc(r.title)}</b>${realises(r, hl)}<div class="rz-lens"><span class="st"><button type="button" class="cm-mini gold" data-a-action="edit-ghost">Review &amp; edit</button></span><span class="fl"><button type="button" class="cm-mini gold" data-a-action="edit-ghost">Review &amp; edit</button></span><span class="rs"><button type="button" class="cm-mini gold" data-a-action="edit-ghost">Review &amp; edit</button></span></div><div class="rz-strip"><small>stands on</small><em>to be described on review</em></div></div>`);
      continue;
    }
    const e = r.kind === 'component' ? V.elements.get(r.element) : null;
    const head = r.kind === 'module' ? `<small>Module · ${r.components} component${r.components === 1 ? '' : 's'}${r.holes ? ` · <i class="rz-hole">${r.holes} not realised</i>` : ''}</small>` : `<small><span class="rz-k">${esc(KIND_LABEL[e.ckind] || e.ckind)}</span> ${esc(e.ref)}<i class="rz-st ${esc(e.status)}">${esc(e.status)}</i>${e.defined ? '' : '<i class="rz-st gap" title="Purpose, boundary, owner, inputs or outputs missing">incomplete</i>'}</small>`;
    const changed = r.members.some(id => marked.has(id)) || (r.realises || []).some(id => marked.has(id));
    out.push(`<div class="rz-card ${r.kind}${e ? ' k-' + esc(e.ckind) : ''}${changed ? ' changed' : ''}${r.ctx ? ' ctx' : ''}${r.subject ? ' subject' : ''}${S.sel === r.id || S.sel === r.element ? ' sel' : ''}${cardCls(hl, r.id)}" data-card="${esc(r.id)}" ${pos} tabindex="0" role="button" aria-label="${esc((r.kind === 'module' ? 'Module ' : 'Component ') + r.title)}">${head}<b class="rz-t">${esc(r.title)}</b>${realises(r, hl)}${lensLine(r)}${strip(r, hl)}</div>`);
  }
  for (const lb of L.labels) {
    const l = lb.link, lit = hl.links.has(l.id), cls = `rz-label${l.proposed ? ' proposed' : ''}${lit ? ' lit' : hl.on ? ' dim' : ''}${l.dim ? ' out' : ''}`;
    if (lb.compact) { out.push(`<button type="button" class="${cls} compact" data-link="${esc(l.id)}" style="left:${lb.x}px;top:${lb.y}px;width:${lb.w}px;height:${lb.h}px" aria-label="${esc(l.label)}"><span class="rz-l1"><b>${esc(l.ref)}</b></span></button>`); continue; }
    if (l.proposed) { out.push(`<button type="button" class="${cls}" data-a-action="edit-ghost" style="left:${lb.x}px;top:${lb.y}px;width:${lb.w}px;height:${lb.h}px"><span class="rz-l1">${esc(l.label)}</span><span class="rz-l2 st fl rs"><em>proposed · not saved</em></span></button>`); continue; }
    const fs = l.flows.map(id => V.flows.find(f => f.id === id));
    const st = l.contracts.length ? l.contracts.map(c => `<i class="rz-c">${esc(c)}</i>`).join('') : '<em class="miss">no contract in Chapter 8</em>';
    const fl = `<em>${esc(fs.length > 1 ? fs.length + ' interactions' : {sync: 'request', event: 'event', data: 'data'}[l.kind] || l.kind)}</em>${l.gaps ? `<i class="rz-g">no failure policy</i>` : `<i class="rz-ok">on failure</i>`}`;
    const rs = l.logical.length ? l.logical.map(id => { const x = V.lflows.find(y => y.id === id); return `<i class="rz-lf" title="${esc(V.R.get(x.from).ref + ' → ' + V.R.get(x.to).ref + ' ' + x.label)}">${esc(x.label)} · ${esc(V.R.get(x.from).ref)}→${esc(V.R.get(x.to).ref)}</i>`; }).join('') : `<em${l.party ? '' : ' class="miss"'}>${l.party ? 'at the system edge' : 'no logical flow'}</em>`;
    out.push(`<button type="button" class="${cls}" data-link="${esc(l.id)}" style="left:${lb.x}px;top:${lb.y}px;width:${lb.w}px;height:${lb.h}px"><span class="rz-l1">${l.ref ? `<b>${esc(l.ref)}</b>` : ''}${esc(l.label)}</span><span class="rz-l2 st">${st}</span><span class="rz-l2 fl">${fl}</span><span class="rz-l2 rs">${rs}</span></button>`);
  }
  return out.join('');
}
function modelHeads(hl) {
  const box = root.querySelector('.cm-heads-in'), out = [];
  for (const ln of L.lanes) out.push(`<button type="button" class="rz-lh ${ln.kind}${S.sel === ln.id ? ' sel' : hl.lanes.has(ln.id) ? ' lit' : ''}" data-lane="${esc(ln.id)}" style="left:${ln.x + 4}px;width:${ln.w - 8}px;top:8px;height:${RL.HEAD_H - 8}px"><small>${ln.kind === 'module' ? 'Module · ' + esc(ln.ref) : ln.kind === 'outside' ? 'Not ours' : ln.kind === 'stage' ? 'Flow stage' : 'Unplaced'}</small><b>${esc(ln.title)}</b><span>${esc(ln.sub)}</span></button>`);
  box.innerHTML = out.join('');
  box.style.width = L.W + 'px';
}

// ---------------------------------------------------------------- allocation

function matrixSVG(hl) {
  const out = [];
  for (const g of L.groups) out.push(`<rect class="rz-mgroup" x="${L.rail}" y="${g.y}" width="${L.W - L.rail - 8}" height="${g.h}"/>`);
  L.rows.forEach((r, i) => out.push(`<rect class="rz-mrow${i % 2 ? ' odd' : ''}${hl.resp.has(r.id) ? ' lit' : ''}" x="${L.rail}" y="${r.y}" width="${L.W - L.rail - 8}" height="${r.h}"/>`));
  for (const c of L.cols) if (c.col.proposed) out.push(`<rect class="rz-mghost" x="${c.x + 2}" y="${L.top}" width="${c.w - 4}" height="${L.H - L.top - 16}" rx="8"/>`);
  for (const c of L.cols) out.push(`<line class="rz-mcol${hl.comps.has(c.id) ? ' lit' : ''}" x1="${c.x + c.w}" x2="${c.x + c.w}" y1="${L.top}" y2="${L.H - 16}"/>`);
  return out.join('');
}
function matrixHTML(hl) {
  const out = [], g = ghost();
  for (const gr of L.groups) out.push(`<div class="rz-mg" style="left:${L.rail + 10}px;top:${gr.y + 6}px">${esc(gr.title)}</div>`);
  for (const c of L.cells) {
    const r = V.R.get(c.resp), comp = c.proposed ? {title: g?.title || 'The proposal', ref: 'Proposed'} : V.elements.get(c.comp), lit = hl.resp.has(c.resp) || hl.comps.has(c.comp);
    const tip = `${comp.title} ${c.proposed ? 'would realise' : 'realises'} ${r.ref} ${r.title}${c.scope ? ': ' + c.scope : ''}${c.kind === 'unscoped' ? (c.current ? ' — no allocation scope recorded' : ' — the responsibility changed since this allocation was made') : c.kind === 'shared' ? ' — another component has the same scope' : ''}${c.outside ? ' — it sits in another module' : ''}`;
    out.push(`<button type="button" class="rz-cell ${c.kind}${c.outside ? ' outside' : ''}${c.proposed ? ' proposed' : ''}${hl.on ? (lit ? ' lit' : ' dim') : ''}" ${c.proposed ? 'data-a-action="edit-ghost"' : `data-sel="${esc(c.comp)}"`} style="left:${c.x - 13}px;top:${c.y - 13}px" title="${esc(tip)}" aria-label="${esc(tip)}"></button>`);
  }
  for (const row of L.rows) {
    const r = row.resp, lit = hl.resp.has(r.id), pos = `top:${row.y + 6}px;height:${row.h - 12}px`;
    const prop = V.proposals.find(q => q.logicalId === r.id && !q.existingId), isGhost = g && g.allocations.some(a => a.logicalId === r.id);
    const act = isGhost ? '<button type="button" class="cm-mini gold" data-a-action="edit-ghost">Review proposal</button>' : !r.realisedBy.length ? `<button type="button" class="cm-mini gold" data-a-action="new-for-logical" data-a-logical="${esc(r.id)}">Create a component</button>` : '';
    out.push(`<div class="rz-realc${r.realisedBy.length ? ' ok' : isGhost ? ' closes' : ' open'}${hl.on ? (lit ? ' lit' : ' dim') : ''}" style="left:${L.realX}px;width:${AX.REAL_W}px;${pos}"><div class="rz-c1"><b>${r.realisedBy.length ? 'Realised' : 'Not realised'}</b>${act}</div><small>${r.realisedBy.length ? esc(r.realisedBy.map(titleOf).join(', ')) + (r.shared.length ? ' · same scope twice' : '') : isGhost ? 'realised once the proposal is accepted' : prop ? 'or propose: ' + esc(prop.title) : 'no component yet'}</small></div>`);
    const why = `${r.why.reqs.length ? `<i class="rz-w">${esc(r.why.reqs.join(', '))}</i>` : ''}${r.why.qds.length ? `<i class="rz-w q">${r.why.qds.length} driver${r.why.qds.length === 1 ? '' : 's'}</i>` : ''}${r.why.adrs.length ? `<i class="rz-w d">${esc(r.why.adrs.join(', '))}</i>` : '<i class="rz-w miss">no decision</i>'}`;
    out.push(`<div class="rz-why${hl.on ? (lit ? ' lit' : ' dim') : ''}" style="left:${L.whyX}px;width:${AX.WHY_W}px;${pos}">${why}</div>`);
  }
  return out.join('');
}
function matrixHeads(hl) {
  const box = root.querySelector('.cm-heads-in'), out = [];
  for (const b of L.colGroups) out.push(`<div class="rz-band" style="left:${b.x + 3}px;width:${b.w - 6}px;top:6px;height:${AX.BAND - 4}px" title="${esc(laneInfo(V, b.module).title)}">${esc(laneInfo(V, b.module).title)}</div>`);
  for (const c of L.cols) {
    const k = c.col, pos = `style="left:${c.x + 3}px;width:${c.w - 6}px;top:${AX.BAND + 6}px;height:${AX.HEAD_H - AX.BAND - 6}px"`;
    if (k.proposed) { out.push(`<button type="button" class="rz-ch proposed" data-a-action="edit-ghost" ${pos} title="${esc(k.title + ' — not saved. Review and edit before accepting.')}"><small>Proposal · not saved</small><b>${esc(k.title)}</b><span>Review &amp; edit</span></button>`); continue; }
    out.push(`<button type="button" class="rz-ch${S.sel === k.id ? ' sel' : hl.comps.has(k.id) ? ' lit' : hl.on ? ' dim' : ''}${k.orphan ? ' idle' : ''}" data-sel="${esc(k.id)}" ${pos} title="${esc(k.ref + ' · ' + k.title + ' · ' + (KIND_LABEL[k.ckind] || k.ckind) + ' · ' + k.status)}"><small>${esc(KIND_LABEL[k.ckind] || k.ckind)} · ${esc(k.ref)}</small><b>${esc(k.title)}</b><span>${k.orphan ? 'Realises nothing' : esc(k.status)}</span></button>`);
  }
  out.push(`<div class="rz-th" style="left:${L.realX}px;width:${AX.REAL_W}px;top:${AX.BAND + 6}px"><b>Realisation</b><small>every responsibility needs a component that owns it</small></div>`);
  out.push(`<div class="rz-th" style="left:${L.whyX}px;width:${AX.WHY_W}px;top:${AX.BAND + 6}px"><b>Why</b><small>requirements, quality drivers and decisions it carries</small></div>`);
  box.innerHTML = out.join('');
  box.style.width = L.W + 'px';
}
function matrixRail(hl) {
  const box = root.querySelector('.cm-rail-in');
  box.innerHTML = L.rows.map(row => { const r = row.resp, lit = hl.resp.has(r.id); return `<button type="button" title="${esc(r.ref + ' · ' + r.title + (r.purpose ? ' — ' + r.purpose : ''))}" class="rz-trow${r.realisedBy.length ? '' : ' open'}${S.sel === r.id ? ' sel' : hl.on ? (lit ? ' lit' : ' dim') : ''}" data-sel="${esc(r.id)}" style="top:${row.y + 4}px;height:${row.h - 8}px"><b>${esc(r.ref)} · ${esc(r.title)}</b><small>${esc(r.boundary || r.purpose || '')}</small></button>`; }).join('');
  box.style.height = L.H + 'px'; box.style.width = L.rail + 'px';
}

// ---------------------------------------------------------------- chrome

function crumbs() {
  const sc = scope(), parts = [`<button type="button" data-rz="scope" data-kind="system" class="${sc.kind === 'system' ? 'here' : ''}">Whole system</button>`];
  if (sc.kind !== 'system') {
    const mod = sc.kind === 'module' ? sc.id : V.elements.get(sc.id)?.module;
    if (mod && mod !== NONE) parts.push('<span>›</span>', `<button type="button" data-rz="scope" data-kind="module" data-id="${esc(mod)}" class="${sc.kind === 'module' ? 'here' : ''}">${esc(laneInfo(V, mod).title)}</button>`);
    if (sc.kind === 'part') parts.push('<span>›</span>', `<button type="button" class="here" data-rz="noop">${esc(titleOf(sc.id))}</button>`);
  }
  return parts.join('');
}
function chrome() {
  const sc = scope();
  root.querySelector('.cm-crumbs').innerHTML = crumbs();
  root.querySelectorAll('.cm-view').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === S.view)));
  root.querySelector('.cm-lenses').innerHTML = LENSES.map(l => `<button type="button" class="cm-lens" data-rz="lens" data-id="${l.id}" aria-pressed="${S.lens === l.id}" title="${esc(l.q + ' Like the ' + l.like + '.')}">${icon(l.id)}<span>${l.label}</span></button>`).join('');
  const dp = depth();
  root.querySelector('.cm-depth').innerHTML = !allocView() && sc.kind === 'system' ? `<span>Elements</span>${[['modules', 'Modules'], ['components', 'Components']].map(([id, t]) => `<button type="button" class="cm-dep" data-rz="depth" data-id="${id}" aria-pressed="${dp === id}">${t}</button>`).join('')}` : '';
  const comps = [...V.elements.values()].filter(e => e.kind === 'component'), holes = [...V.R.values()].filter(r => !r.realisedBy.length).length, gaps = V.flows.filter(f => f.gap).length;
  root.querySelector('.cm-state').textContent = allocView()
    ? `${G.rows.length} responsibilit${G.rows.length === 1 ? 'y' : 'ies'} · ${G.unrealised.length} not realised · ${G.cols.filter(c => !c.proposed).length} components${G.cols.some(c => c.orphan) ? ' · ' + G.cols.filter(c => c.orphan).length + ' realise nothing' : ''}`
    : `${comps.length} components in ${V.modules.size} modules · ${holes} responsibilit${holes === 1 ? 'y' : 'ies'} not realised · ${V.lflows.filter(l => l.carried).length} of ${V.lflows.length} logical flows carried · ${gaps} without a failure policy`;
  const g = ghost(), imp = pending();
  root.querySelector('.cm-banner').innerHTML = imp ? imp.banner() : g ? `<section class="dp-banner"><span class="ip-kicker">Component proposal · not saved</span><b>${esc(g.title)}</b><small>${esc(g.effect || '')}</small><button type="button" class="cm-btn gold" data-a-action="edit-ghost">Review &amp; edit</button><button type="button" class="cm-btn" data-a-action="dismiss">Dismiss</button></section>` : '';
  root.querySelector('.cm-legend').innerHTML = allocView()
    ? `<p><i class="k-cell allocated"></i>Realises it, with a recorded scope</p><p><i class="k-cell unscoped"></i>Realises it, but the scope is missing or out of date</p><p><i class="k-cell shared"></i>Shares the same scope with another component</p><p><i class="k-cell outside"></i>Realised from another module</p>${g ? '<p><i class="k-cell proposed"></i>The unsaved proposal</p>' : ''}`
    : `<p><span class="k-card"></span>Component, carrying what it realises</p><p><i class="rz-r k"><b>LR</b>Responsibility</i> realised inside it</p><p><i class="rz-n k">capability</i> platform it stands on</p><p><svg width="40" height="10"><line x1="2" y1="5" x2="32" y2="5" stroke="#3d5f52" stroke-width="1.7" marker-end="url(#rz-a-n)"/></svg>Request and answer</p><p><svg width="40" height="10"><line x1="2" y1="5" x2="32" y2="5" stroke="#3f6d86" stroke-width="1.6" stroke-dasharray="6 4" marker-end="url(#rz-a-e)"/></svg>Event or work handoff</p><p><span class="k-hole"></span>Responsibility not yet realised</p>`;
}

// ---------------------------------------------------------------- companion

const act = (a, attrs, label, cls = '') => `<button type="button" class="cm-btn ${cls}" data-a-action="${a}" ${attrs}>${label}</button>`;
const link = id => `<button type="button" class="cm-link" data-sel="${esc(id)}">${esc(refTitle(id))}</button>`;
function proposalFor(ids) { return V.proposals.filter(q => !q.existingId && ids.includes(q.logicalId)); }
function proposeButtons(ids) { const g = ghost(); return proposalFor(ids).map(q => g?.key === q.key ? '' : `<button type="button" class="cm-btn gold" data-a-action="preview" data-a-key="${esc(q.key)}">Propose ${esc(q.title.toLowerCase())}</button>`).join(''); }
function specimenComponent(id) {
  const e = V.elements.get(id), flows = V.flows.filter(f => f.from === id || f.to === id);
  const alloc = e.realises.map(r => { const a = V.R.get(r).allocations.find(x => x.component === id); return `<button type="button" class="cm-link" data-sel="${esc(r)}">${esc(refTitle(r))}${a?.scope ? `<small>${esc(a.scope)}</small>` : '<i> · no scope</i>'}</button>`; }).join('') || '<em>Nothing yet</em>';
  return `<section class="cm-spec"><h4>${esc(KIND_LABEL[e.ckind] || 'Component')} · ${esc(e.ref)}<span class="${esc(e.status)}">${esc(e.status)}</span></h4><p class="cm-spec-t"><b>${esc(e.title)}</b></p>${e.purpose ? `<p>${esc(e.purpose)}</p>` : ''}<dl class="cm-dl"><div><dt>Module</dt><dd>${esc(laneInfo(V, e.module).title)}</dd></div><div class="${e.realises.length ? '' : 'miss'}"><dt>Realises</dt><dd>${alloc}</dd></div><div class="${e.boundary ? '' : 'miss'}"><dt>Owns</dt><dd>${esc(e.boundary || 'Boundary not recorded')}${e.data.length ? '<br>' + e.data.map(link).join('') : ''}</dd></div><div class="${e.inputs ? '' : 'miss'}"><dt>Takes in</dt><dd>${esc(e.inputs || 'Not recorded')}</dd></div><div class="${e.outputs ? '' : 'miss'}"><dt>Gives out</dt><dd>${esc(e.outputs || 'Not recorded')}</dd></div><div><dt>Talks to</dt><dd>${flows.map(f => `<button type="button" class="cm-link" data-sel="${esc(f.id)}">${f.from === id ? '→ ' : '← '}${esc(titleOf(f.from === id ? f.to : f.from))}${f.ref ? ' · ' + esc(f.ref) : ''}${f.gap ? '<i> · no failure policy</i>' : ''}</button>`).join('') || '<em>No interaction</em>'}</dd></div><div><dt>Stands on</dt><dd>${e.needs.map(link).join('') || '<em>No platform need</em>'}${e.technologyNeeds ? `<small class="rz-need">${esc(e.technologyNeeds)}</small>` : ''}</dd></div><div class="${e.why.adrs.length ? '' : 'miss'}"><dt>Why</dt><dd>${esc([...e.why.reqs, ...e.why.adrs].join(', ') || 'Nothing linked')}${e.why.qds.length ? ` · ${e.why.qds.length} quality driver${e.why.qds.length === 1 ? '' : 's'}` : ''}${e.why.adrs.length ? '' : ' · no decision behind it'}</dd></div><div><dt>Owner</dt><dd>${esc(e.owner || 'Not named')}</dd></div></dl>
  ${marked.has(id) && pending() ? `<div class="cm-note gold">${pending().objectContext({id, ref: e.ref, title: e.title})}</div>` : ''}
  <div class="cm-acts">${act('edit', `data-a-id="${esc(id)}"`, icon('edit') + 'Edit component', 'primary')}${act('connect', `data-a-id="${esc(id)}"`, icon('link') + 'Connect')}${act('edit-needs', `data-a-id="${esc(id)}"`, 'Technology needs')}${proposeButtons(e.realises)}<button type="button" class="cm-btn" data-rz="dissect" data-id="${esc(id)}">${icon('dissect')}Focus on this component</button><button type="button" class="cm-btn" data-brain-launch="mind">${icon('mind')}Mind Factory</button><a class="cm-btn" href="${esc(projectURL('/?chapter=5&tab=work&object=' + encodeURIComponent(id)))}">Open in Work</a></div></section>`;
}
function specimenResponsibility(id) {
  const r = V.R.get(id), inn = V.lflows.filter(l => l.to === id), out = V.lflows.filter(l => l.from === id);
  const by = r.allocations.map(a => `<button type="button" class="cm-link" data-sel="${esc(a.component)}">${esc(refTitle(a.component))}${a.scope ? `<small>${esc(a.scope)}</small>` : '<i> · no scope</i>'}${a.current ? '' : '<i> · responsibility changed since</i>'}</button>`).join('') || '<em>No component yet</em>';
  const flows = [...inn.map(l => `← ${refTitle(l.from)} (${l.label})`), ...out.map(l => `→ ${refTitle(l.to)} (${l.label})`)];
  return `<section class="cm-spec"><h4>Responsibility · Chapter 4<span class="${r.realisedBy.length ? 'guarded' : 'exposed'}">${r.realisedBy.length ? 'Realised' : 'Not realised'}</span></h4><p class="cm-spec-t"><b>${esc(r.ref)} · ${esc(r.title)}</b></p>${r.purpose ? `<p>${esc(r.purpose)}</p>` : ''}<dl class="cm-dl"><div><dt>Module</dt><dd>${esc(laneInfo(V, r.module).title)}</dd></div><div class="${r.realisedBy.length ? '' : 'miss'}"><dt>Realised by</dt><dd>${by}</dd></div><div><dt>Logical flows</dt><dd>${flows.map(esc).join('<br>') || '<em>None</em>'}</dd></div><div class="${r.why.adrs.length ? '' : 'miss'}"><dt>Why</dt><dd>${esc([...r.why.reqs, ...r.why.adrs].join(', ') || 'Nothing linked')}${r.why.qds.length ? ` · ${r.why.qds.length} quality driver${r.why.qds.length === 1 ? '' : 's'}` : ''}${r.why.adrs.length ? '' : ' · no decision linked'}</dd></div></dl>
  <div class="cm-acts">${!r.realisedBy.length ? act('new-for-logical', `data-a-logical="${esc(id)}"`, 'Create a component for it', 'primary') : act('edit', `data-a-id="${esc(r.realisedBy[0])}"`, icon('edit') + 'Edit its component', 'primary')}${proposeButtons([id])}<a class="cm-btn" href="${esc(projectURL('/?chapter=4&tab=work&object=' + encodeURIComponent(id)))}">Responsibility in Chapter 4</a></div></section>`;
}
function specimenFlow(id) {
  const f = V.flows.find(x => x.id === id);
  return `<section class="cm-spec"><h4>${esc(f.recorded ? 'Interaction · ' + f.ref : 'Contract with the outside')}<span class="${f.gap ? 'exposed' : 'guarded'}">${f.gap ? 'No failure policy' : ['sync', 'event'].includes(f.kind) ? 'Failure policy' : IKIND[f.kind]}</span></h4><p class="cm-spec-t"><b>${esc(titleOf(f.from))} → ${esc(titleOf(f.to))}</b></p><p>${esc(describeFlow(V, id))}</p><dl class="cm-dl"><div><dt>Kind</dt><dd>${esc(IKIND[f.kind] || f.kind)}</dd></div><div class="${f.contractRef ? '' : 'miss'}"><dt>Contract</dt><dd>${esc(f.contractRef ? f.contractRef + ' · ' + (V.X.C.get(f.contract)?.title || '') : 'None in Chapter 8')}</dd></div><div class="${f.gap ? 'miss' : ''}"><dt>If it fails</dt><dd>${esc(f.failure || 'Not recorded')}</dd></div></dl>
  <div class="cm-acts">${f.recorded ? act('edit-interaction', `data-a-id="${esc(f.id)}"`, icon('edit') + 'Edit interaction', 'primary') : ''}${f.contract ? `<a class="cm-btn" href="${esc(projectURL('/?chapter=8&tab=model&object=' + encodeURIComponent(f.contract)))}">Contract in Chapter 8</a>` : ''}</div></section>`;
}
function specimenLane(id) {
  const ln = laneInfo(V, id), inside = [...V.elements.values()].filter(e => (id === OUT_L || id === OUT_R ? e.region === id : e.module === id) && e.kind !== 'hole'), resp = [...V.R.values()].filter(r => r.module === id);
  return `<section class="cm-spec"><h4>${ln.kind === 'module' ? 'Module · Chapter 4' : 'Outside the system'}</h4><p class="cm-spec-t"><b>${esc(ln.ref && ln.ref !== id ? ln.ref + ' · ' : '')}${esc(ln.title)}</b></p>${ln.sub ? `<p>${esc(ln.sub)}</p>` : ''}<dl class="cm-dl"><div><dt>${ln.kind === 'module' ? 'Components' : 'Participants'}</dt><dd>${inside.map(e => link(e.id)).join('') || '<em>None yet</em>'}</dd></div>${ln.kind === 'module' ? `<div><dt>Responsibilities</dt><dd>${resp.map(r => `<button type="button" class="cm-link" data-sel="${esc(r.id)}">${esc(r.ref + ' ' + r.title)}${r.realisedBy.length ? '' : '<i> · not realised</i>'}</button>`).join('')}</dd></div>` : ''}</dl><div class="cm-acts">${ln.kind === 'module' ? `<button type="button" class="cm-btn primary" data-rz="scope-module" data-id="${esc(id)}">${icon('dissect')}Open this module</button><a class="cm-btn" href="${esc(projectURL('/?chapter=4&tab=work'))}">Modules are defined in Chapter 4</a>` : ''}</div></section>`;
}
function specimenOther(id) {
  const o = V.M.byId.get(id), e = V.elements.get(id);
  if (e?.kind === 'party') { const fs = V.flows.filter(f => f.from === id || f.to === id); return `<section class="cm-spec"><h4>External participant</h4><p class="cm-spec-t"><b>${esc(e.title)}</b></p><dl class="cm-dl"><div><dt>Talks to</dt><dd>${fs.map(f => `<button type="button" class="cm-link" data-sel="${esc(f.id)}">${esc(titleOf(f.from === id ? f.to : f.from))}${f.ref ? ' · ' + esc(f.ref) : ''}</button>`).join('')}</dd></div></dl><div class="cm-acts"></div></section>`; }
  const users = [...V.elements.values()].filter(x => (x.needs || []).includes(id) || (x.data || []).includes(id));
  const kind = V.M.T(id) === 'data' ? 'Data definition · Chapter 8' : 'Platform capability · Chapter 6';
  return `<section class="cm-spec"><h4>${kind}</h4><p class="cm-spec-t"><b>${esc(refTitle(id))}</b></p>${o?.description ? `<p>${esc(o.description)}</p>` : ''}<dl class="cm-dl"><div><dt>${V.M.T(id) === 'data' ? 'Owned by' : 'Needed by'}</dt><dd>${users.map(x => link(x.id)).join('') || '<em>No component</em>'}</dd></div></dl><div class="cm-acts"><a class="cm-btn" href="${esc(projectURL('/?chapter=' + (V.M.T(id) === 'data' ? 8 : 6) + '&tab=work&object=' + encodeURIComponent(id)))}">Open in Chapter ${V.M.T(id) === 'data' ? 8 : 6}</a></div></section>`;
}
function reading() {
  if (allocView()) return `<section><h4>Reading this view</h4><p>Each row is a Chapter 4 responsibility; each column a Chapter 5 component. A dot means the component realises the responsibility; hover it for the allocation scope. The rule: every responsibility needs a component that owns it, and every component needs a responsibility that justifies it.</p><p>An amber ring is an allocation without a current scope; a ring outlined in amber is realised from another module.</p></section>`;
  const walk = realiseWalk(V).length;
  return `<section><h4>Reading this view</h4><p>Columns are the Chapter 4 <b>modules</b>. Each card is a component carrying the <b>responsibilities it realises</b> — the logical design embedded in the software — and, along its foot, the <b>platform it stands on</b> for Chapter 6.</p><p>Solid arrows ask and wait for an answer; dashed arrows hand work on. A dashed card is a responsibility nothing realises yet.</p>${walk ? `<p><b>Walk the logical flows</b> to see, flow by flow, which interaction carries each step of the Chapter 4 design.</p>` : ''}</section>`;
}
function insightsHTML() {
  const list = realiseInsights(V, scope()).slice(0, 8);
  if (!list.length) return '';
  return `<section><h4>What the model shows<span>${list.length}</span></h4>${list.map(x => `<button type="button" class="cm-ins ${x.kind}" data-sel="${esc(x.id || '')}"><span>${esc(x.text)}</span>${x.ask ? `<small>Ask: ${esc(x.ask)}</small>` : ''}</button>`).join('')}<p class="cm-muted">Drawn from recorded components, allocations, interactions and the Chapter 4 design. Prompts for review, not verdicts.</p></section>`;
}
function findingsHTML() {
  const sc = scope(), fs = V.findings.filter(f => sc.kind === 'system' || concerns(sc.id).elements.has(f.objectId) || f.objectId === sc.id);
  if (!fs.length) return '';
  const groups = new Map();
  for (const f of fs) { const k = f.title.replace(/(APP|LR|INT|MAP|OBJ)-\d+/g, '…'); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
  return `<section><h4>Chapter 5 checks<span>${fs.length}</span></h4>${[...groups].sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([k, g]) => `<button type="button" class="cm-fg ${g.some(f => f.level === 'error') ? 'error' : ''}" data-sel="${esc(g[0].objectId)}"><b>${esc(k)}</b><small>${g.length} · ${esc([...new Set(g.map(f => refOf(f.objectId) || f.objectId))].slice(0, 4).join(', '))}${g.length > 4 ? '…' : ''}</small></button>`).join('')}<a class="cm-muted" href="${esc(projectURL('/?chapter=5&tab=validate&validate=readiness'))}">All checks on Validate →</a></section>`;
}
function panel() {
  const box = root.querySelector('.cm-panel');
  solMark(root, project(), 5);
  if (!S.panel) { box.innerHTML = ''; return; }
  const s = S.sel;
  let spec = '';
  if (s && V.elements.get(s)?.kind === 'component') spec = specimenComponent(s) + specPanelHTML(project(), s);
  else if (s && V.R.has(s)) spec = specimenResponsibility(s);
  else if (s && V.flows.some(f => f.id === s)) spec = specimenFlow(s);
  else if (s && (V.modules.has(s) || s === OUT_L || s === OUT_R)) spec = specimenLane(s);
  else if (s?.startsWith?.('MOD:')) spec = specimenLane(s.slice(4));
  else if (s && known(s)) spec = specimenOther(s);
  box.innerHTML = solInto(spec, solSection(project(), 5, s)) + reading() + insightsHTML() + findingsHTML();
}

// ---------------------------------------------------------------- walk the logical flows

function walkBar() {
  const bar = root.querySelector('.cm-walk'), ls = realiseWalk(V);
  if (allocView() || !ls.length) { bar.innerHTML = `<p class="cm-walk-text">${allocView() ? 'Select a responsibility to see what realises it; select a component to see what it realises.' : 'Select a component to read what it realises, owns and needs.'}</p>`; return; }
  const cur = S.walk >= 0 ? ls[S.walk] : null;
  bar.innerHTML = `<button type="button" class="cm-btn" data-rz="walk-prev" aria-label="Previous flow" ${S.walk <= 0 ? 'disabled' : ''}>‹</button><button type="button" class="cm-btn" data-rz="walk-next">${S.walk < 0 ? icon('play') + '<span>Walk the logical flows</span>' : S.walk >= ls.length - 1 ? 'Done' : 'Next ›'}</button><p class="cm-walk-text">${cur ? `<b>${S.walk + 1} / ${ls.length}</b> ${esc(describeLogical(V, cur.id))}` : `${ls.length} logical flows from Chapter 4. At each one: which components realise its ends, and which interaction carries it.`}</p>${S.walk >= 0 ? '<button type="button" class="cm-btn icon" data-rz="walk-stop" aria-label="Stop the walk">×</button>' : ''}`;
}
function revealWalk() {
  const h = highlight(), cs = L.cards.filter(c => h.cards.has(c.id)); if (!cs.length) return;
  const x1 = Math.min(...cs.map(c => c.x)), y1 = Math.min(...cs.map(c => c.y)), x2 = Math.max(...cs.map(c => c.x + c.w)), y2 = Math.max(...cs.map(c => c.y + c.h));
  stage.reveal(x1 - 20, y1 - 20, x2 - x1 + 40, y2 - y1 + 40);
}

// ---------------------------------------------------------------- interaction

function revealSelection() {
  if (!S.sel || !L) return;
  if (allocView()) { const r = L.rows.find(x => x.id === S.sel), c = L.cols.find(x => x.id === S.sel); if (r) stage.reveal(L.rail, r.y, 300, r.h); else if (c) stage.reveal(c.x, L.top, c.w, 100); return; }
  const h = highlight(), card = L.cards.find(c => h.cards.has(c.id));
  if (card) stage.reveal(card.x, card.y, card.w, card.h);
}
function select(id, {reveal = false} = {}) {
  S.sel = id || null; S.walk = -1;
  const p = project(), target = S.sel && !S.sel.startsWith('MOD:') && !S.sel.startsWith('L:') && !S.sel.startsWith('F:') ? S.sel : null;
  if (p && target) { try { mountBrainContext(p, {id: target, chapter: 5}, 'model'); } catch { /* assistance is optional */ } }
  if (window.history) { const url = new URL(location.href); if (target) url.searchParams.set('object', target); else url.searchParams.delete('object'); window.history.replaceState(window.history.state, '', url.pathname + url.search); }
  if (S.sel && !S.panel) S.panel = true;
  save(); render();
  if (reveal) revealSelection();
}
function setScope(sc) { const r = realiseScope(V, sc); S.scope = r.kind === 'system' ? {kind: 'system'} : {kind: r.kind, id: r.id}; S.walk = -1; fitPending = true; save(); render(); }
function up() { const sc = scope(); if (sc.kind === 'part') { const m = V.elements.get(sc.id)?.module; setScope(m && m !== NONE ? {kind: 'module', id: m} : {kind: 'system'}); } else if (sc.kind === 'module') setScope({kind: 'system'}); }
const linkFlow = id => { const l = F.links.find(x => x.id === id); if (!l || l.proposed) return null; return l.flows.length === 1 ? l.flows[0] : l.from; };

function bind() {
  solChapterBind(root, 5, {refresh: solRefresh});
  root.addEventListener('click', e => {
    if (root.dataset.suppress) return;
    const add = root.querySelector('.cm-add');
    if (add?.open && !e.target.closest('.cm-add > summary')) add.open = false;
    if (e.target.closest('[data-brain-launch],[data-a-action],a')) return;
    const a = e.target.closest('[data-rz]');
    if (a && !a.disabled) {
      const k = a.dataset.rz;
      if (k === 'view') { S.view = a.dataset.id; S.walk = -1; fitPending = true; save(); render(); revealSelection(); return; }
      if (k === 'lens') { S.lens = a.dataset.id; save(); render(); return; }
      if (k === 'depth') { S.depth = a.dataset.id; fitPending = true; save(); render(); return; }
      if (k === 'scope') { setScope(a.dataset.kind === 'module' ? {kind: 'module', id: a.dataset.id} : {kind: 'system'}); return; }
      if (k === 'scope-module') { setScope({kind: 'module', id: a.dataset.id}); return; }
      if (k === 'dissect') { setScope({kind: 'part', id: a.dataset.id}); return; }
      if (k === 'explore') { cbs.explore?.(5); return; }
      if (k === 'expand') { const on = !document.body.classList.contains('cm-expanded'); document.body.classList.toggle('cm-expanded', on); a.setAttribute('aria-pressed', String(on)); sizeModel(root, 'cm-expanded'); fitPending = true; setTimeout(render, 30); return; }
      if (k === 'panel') { S.panel = !S.panel; save(); fitPending = true; render(); setTimeout(() => { fitPending = true; render(); }, 30); return; }
      if (k === 'key') { const key = root.querySelector('.cm-key'); key.classList.toggle('cm-min'); a.setAttribute('aria-expanded', String(!key.classList.contains('cm-min'))); return; }
      if (k === 'fit') { stage.fitAll(); return; }
      if (k === 'zin' || k === 'zout') { const {w, h} = stage.box(); stage.zoomAt(stage.cam.z * (k === 'zin' ? 1.15 : 1 / 1.15), w / 2, h / 2); return; }
      if (k === 'walk-next') { const n = realiseWalk(V).length; S.walk = S.walk >= n - 1 ? -1 : S.walk + 1; render(); revealWalk(); return; }
      if (k === 'walk-prev') { S.walk = Math.max(0, S.walk - 1); render(); revealWalk(); return; }
      if (k === 'walk-stop') { S.walk = -1; render(); return; }
      if (k === 'noop') return;
    }
    const lane = e.target.closest('[data-lane]');
    if (lane) { select(S.sel === lane.dataset.lane ? null : lane.dataset.lane); return; }
    const lk = e.target.closest('[data-link]');
    if (lk && !e.target.closest('[data-sel]')) { select(linkFlow(lk.dataset.link)); return; }
    const card = e.target.closest('[data-card]');
    if (card && !e.target.closest('[data-sel]')) {
      const id = card.dataset.card, now = Date.now(), twice = lastClick.id === id && now - lastClick.t < 420;
      lastClick = {id, t: now};
      if (id === PROPOSED) return;
      if (twice) { lastClick = {id: null, t: 0}; if (id.startsWith('MOD:')) { const m = id.slice(4); if (V.modules.has(m)) setScope({kind: 'module', id: m}); } else if (V.elements.get(id)?.kind === 'component') setScope({kind: 'part', id}); return; }
      select(id.startsWith('HOLE:') ? id.slice(5) : id); return;
    }
    const s = e.target.closest('[data-sel]');
    if (s && s.dataset.sel) { e.stopPropagation(); select(s.dataset.sel, {reveal: !!s.closest('.cm-panel')}); return; }
    if (e.target.closest('.cm-stage') && !e.target.closest('.cm-heads,.cm-rail,.cm-zoom,.cm-key') && (S.sel || S.walk >= 0)) { S.walk = -1; select(null); }
  });
  root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-card]')) { e.preventDefault(); const id = e.target.dataset.card; if (id !== PROPOSED) select(id.startsWith('HOLE:') ? id.slice(5) : id); } });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !root?.isConnected || document.querySelector('dialog[open]')) return;
    const a = document.activeElement;
    if (a && a !== document.body && !root.contains(a)) return;
    if (a?.closest?.('select,details[open],textarea')) return;
    if (S.walk >= 0) { S.walk = -1; render(); }
    else if (S.sel) select(null);
    else if (scope().kind !== 'system') up();
    else if (document.body.classList.contains('cm-expanded')) root.querySelector('[data-rz="expand"]').click();
    else return;
    e.preventDefault();
  });
  root.addEventListener('pointerleave', () => { root.querySelector('.cm-tip').hidden = true; });
  window.addEventListener('resize', () => { if (!root?.isConnected) return; clearTimeout(bind._r); bind._r = setTimeout(() => { sizeModel(root, 'cm-expanded'); render(); }, 120); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!root?.isConnected || !L) return; clearTimeout(bind._ro); bind._ro = setTimeout(() => { const w = stage.box().w; if (Math.abs(w - (bind._w || 0)) > 24) { bind._w = w; fitPending = true; render(); } }, 90); }).observe(root.querySelector('.cm-stage'));
}
function tip(e) {
  const box = root.querySelector('.cm-tip'), t = e.target.closest?.('.rz-card,.rz-label,.rz-lh');
  if (!t || !root.contains(t)) { box.hidden = true; return; }
  let html = '';
  if (t.dataset.link) { const id = linkFlow(t.dataset.link), f = V.flows.find(x => x.id === id); html = f ? `<b>${esc(f.ref ? f.ref + ' · ' + f.label : f.label)}</b>${esc(describeFlow(V, f.id))}` : ''; }
  else if (t.dataset.card) { const id = t.dataset.card; html = V.elements.get(id)?.kind === 'component' ? `<b>${esc(refTitle(id))}</b>${esc(describeComponent(V, id))}<small class="h">Double-click to focus on it</small>` : id.startsWith('MOD:') && V.modules.has(id.slice(4)) ? `<b>${esc(titleOf(id.slice(4)))}</b>${esc(laneInfo(V, id.slice(4)).sub)}<small class="h">Double-click to open the module</small>` : id.startsWith('HOLE:') ? `<b>${esc(refTitle(id.slice(5)))}</b>No component realises this responsibility yet.` : ''; }
  else if (t.dataset.lane) { const ln = laneInfo(V, t.dataset.lane); html = `<b>${esc(ln.title)}</b>${esc(ln.sub || '')}`; }
  if (!html) { box.hidden = true; return; }
  box.innerHTML = html; box.hidden = false; placeTip(box, e);
}

export function realiseDebug() { return {S: {...S}, V, F, L, G}; }
