// Chapter 9 Model — Security.
//
// Two architecture models of the same protection design, drawn from recorded facts:
// - Threat model: the parts, the parties outside and the stores they reach, the flows between
//   them and the trust boundaries those flows cross. Every crossing says whether it is guarded,
//   exposed (a threat is not covered there) or not yet examined.
// - Threats & controls: which control covers which threat, on which affected objects, and what
//   evidence exists — the chapter's coverage rule, made visible.
// Sliced like every chapter model (whole system → one boundary → one part), read through the
// Protection, Information and Flow lenses, and edited only through the Chapter 9 editors and
// control proposals.
import {threatSource, foldThreat, threatScope, coverage, crossingsOf, threatInsights, describeFlow, defaultDepth, laneInfo, PROPOSAL_FOR, PROPOSED, OUT_L, OUT_R} from './threat-model.js';
import {threatLayout, threatHead, matrixLayout, matrixHead, TM, MX} from './threat-layout.js';
import {modelStage, sizeModel, placeTip} from './model-stage.js';
import {projectPreferenceKey, projectURL} from './project-context.js';
import {mountBrainContext} from './brain-context-ui.js';
import {solChapterMount, solChapterBind, solSection, solInto, solMark} from './chapter-sol.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const project = () => window.aiwProjectStore?.value?.document || window.aiwCurrentProject;
// Sol's advice changes the project only through a store command; the view then reads the new document.
const solRefresh = () => { if (root?.isConnected) mountChapterModel({id: pageSel}, cbs); };
const studio = () => window.aiwLogicalStudio;
const PATHS = {protection: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z', information: 'M12 3c3 4 6 7 6 10.5A6 6 0 0 1 6 13.5C6 10 9 7 12 3z', flow: 'M3 12h13m-4-5 5 5-5 5M3 5h6M3 19h6', model: 'M3 5h6v5H3zM15 14h6v5h-6zM9 7h3v10h3M6 3v18', matrix: 'M4 4h16v16H4zM4 10h16M4 16h16M10 4v16M16 4v16', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', panel: 'M3 4h18v16H3zM15 4v16', explore: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', plus: 'M12 5v14M5 12h14', spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z', mind: 'm3 7 9-4 9 4-9 4-9-4m0 5 9 4 9-4m-18 5 9 4 9-4', edit: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4', dissect: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14M21 21l-5-5M8 11h6', play: 'M7 4v16l13-8z'};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[n] || PATHS.model}"/></svg>`;
const LENSES = [
  {id: 'protection', label: 'Protection', like: 'immune system', q: 'Where each flow crosses a trust boundary, and whether it is guarded, exposed or not yet examined.'},
  {id: 'information', label: 'Information', like: 'circulation', q: 'Which data crosses each boundary, and how sensitive it is.'},
  {id: 'flow', label: 'Flow', like: 'muscles', q: 'Who talks to whom, and what they reach.'}
];
const KIND = {component: 'Application component', party: 'External participant', platform: 'Platform or store', region: 'Trust region'};
const STATE = {exposed: 'Exposed — a threat is not covered here', guarded: 'Guarded — a control covers it', unexamined: 'Not examined — no threat or control recorded'};
const clsOf = c => (/restricted|secret/i.test(c) ? 'restricted' : /confidential|personal|sensitive/i.test(c) ? 'confidential' : /internal/i.test(c) ? 'internal' : c ? 'public' : 'unclassified');

let root = null, T = null, lastDoc = null, cbs = {}, F = null, L = null, G = null, fitPending = true, stage = null, lastClick = {id: null, t: 0}, pageSel;
let S = {view: 'model', lens: 'protection', scope: {kind: 'system'}, depth: 'auto', sel: null, panel: true, walk: -1};
const pref = () => projectPreferenceKey('aiw-threat-model-v1');
function load() { try { const v = JSON.parse(localStorage.getItem(pref()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
function save() { try { localStorage.setItem(pref(), JSON.stringify({view: S.view, lens: S.lens, scope: S.scope, depth: S.depth, sel: S.sel, panel: S.panel})); } catch { /* preferences are optional */ } }
function anatomyOrder() { try { return JSON.parse(localStorage.getItem(projectPreferenceKey('aiw-anatomy-v1')) || '{}').order || {}; } catch { return {}; } }

// ---------------------------------------------------------------- mount / leave

export function mountChapterModel(selection, callbacks = {}) {
  const p = project(), host = document.querySelector('.studio > .stage.tab-content');
  if (!p || !host) return;
  cbs = callbacks;
  solChapterMount(p, 9, solRefresh);
  if (!root) {
    root = document.createElement('section'); root.className = 'cm tm'; root.setAttribute('aria-label', 'Chapter 9 model: security');
    root.innerHTML = shell();
    stage = modelStage(root, {headHeight: () => (S.view === 'coverage' ? matrixHead() : threatHead()), railWidth: l => (l.kind === 'matrix' ? l.rail : 0), onHover: tip});
    stage.bind(); bind();
    const v = load();
    for (const k of ['view', 'lens', 'depth', 'sel']) if (typeof v[k] === 'string') S[k] = v[k];
    if (v.scope && typeof v.scope === 'object') S.scope = v.scope;
    if (typeof v.panel === 'boolean') S.panel = v.panel;
    if (!['model', 'coverage'].includes(S.view)) S.view = 'model';
    if (!LENSES.some(l => l.id === S.lens)) S.lens = 'protection';
  }
  const first = !T;
  if (host.firstElementChild !== root) host.prepend(root);
  document.body.classList.add('cm-active', 'am-active');
  if (p !== lastDoc || !T) { lastDoc = p; rebuild(p); }
  const selectable = id => !!id && known(id);
  if (first && T) { const want = window.aiwChapterModels ? window.aiwChapterModels.takeLink(9) : new URLSearchParams(location.search).get('object'); if (selectable(want)) { S.sel = want; setTimeout(revealSelection, 60); } }
  else if (T && pageSel !== undefined && selection?.id !== pageSel && selectable(selection?.id)) { S.sel = selection.id; setTimeout(revealSelection, 60); }
  pageSel = selection?.id ?? null;
  render();
  sizeModel(root, 'cm-expanded');
}
export function leaveChapterModel() {
  document.body.classList.remove('cm-active', 'cm-expanded');
  root?.remove();
}
function rebuild(p) {
  try { T = threatSource(p, {order: anatomyOrder()}); } catch (e) { console.error('Threat model', e); T = null; return; }
  if (S.sel && !known(S.sel)) S.sel = null;
  if (S.scope?.id && threatScope(T, S.scope).kind === 'system') S.scope = {kind: 'system'};
}
const known = id => T.elements.has(id) || T.threats.has(id) || T.controls.has(id) || T.X.C.has(id) || T.X.D.has(id) || T.boundaries.some(b => b.id === id) || T.flows.some(f => f.id === id);

// ---------------------------------------------------------------- shell

function shell() {
  return `<header class="cm-top"><div class="cm-title"><small>Chapter 9 · Model</small><strong>Security</strong></div>
   <nav class="cm-crumbs" aria-label="Where you are"></nav>
   <div class="cm-views" role="group" aria-label="Model"><button type="button" class="cm-view" data-tm="view" data-id="model">${icon('model')}<span>Threat model</span></button><button type="button" class="cm-view" data-tm="view" data-id="coverage">${icon('matrix')}<span>Threats &amp; controls</span></button></div>
   <div class="cm-actions"><details class="cm-add"><summary class="cm-btn" aria-label="Add to the model">${icon('plus')}<span>Add</span></summary><div><button type="button" data-sec-action="new-threat">New threat scenario</button><button type="button" data-sec-action="new-control">New control design</button><p>To record a threat on a particular part or flow, select it first and use “Record a threat here”.</p></div></details>
    <button type="button" class="cm-btn" data-tm="explore" title="The connected explorer: every perspective of the whole model">${icon('explore')}<span>Explore all perspectives</span></button>
    <button type="button" class="cm-btn icon" data-tm="expand" aria-pressed="false" aria-label="Expand the model" title="Expand">${icon('expand')}</button>
    <button type="button" class="cm-btn icon" data-tm="panel" aria-pressed="true" aria-label="Show the companion panel" title="Companion">${icon('panel')}</button></div></header>
  <div class="cm-bar"><div class="cm-lenses" role="group" aria-label="Lens"></div><div class="cm-depth" role="group" aria-label="Elements"></div><p class="cm-state" role="status" aria-live="polite"></p></div>
  <div class="cm-banner"></div>
  <div class="cm-body"><div class="cm-stage" tabindex="0" aria-label="Security canvas. Drag or scroll to move; Ctrl or Command and scroll to zoom.">
    <div class="cm-world"><svg class="cm-svg" aria-hidden="true"></svg><div class="cm-html"></div></div>
    <div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div>
    <div class="cm-key cm-min"><button type="button" class="cm-kt" data-tm="key" aria-expanded="false">Key</button><div class="cm-legend"></div></div>
    <div class="cm-zoom"><button type="button" data-tm="zout" aria-label="Zoom out">−</button><button type="button" data-tm="zin" aria-label="Zoom in">+</button><button type="button" data-tm="fit" aria-label="Fit the width">${icon('fit')}</button></div>
  </div><aside class="cm-panel" aria-label="Companion"></aside></div>
  <footer class="cm-walk" aria-label="Walk the journey across trust boundaries"></footer><div class="cm-tip" role="tooltip" hidden></div>`;
}

// ---------------------------------------------------------------- render

const titleOf = id => T.elements.get(id)?.title || T.threats.get(id)?.title || T.controls.get(id)?.title || T.X.C.get(id)?.title || T.X.D.get(id)?.title || T.boundaries.find(b => b.id === id)?.title || laneInfo(T, id)?.title || id;
const rowTarget = rid => (rid.startsWith('REG:') ? rid.slice(4) : rid);
const refOf = id => T.threats.get(id)?.ref || T.controls.get(id)?.ref || T.X.C.get(id)?.ref || T.X.D.get(id)?.ref || T.boundaries.find(b => b.id === id)?.ref || '';
function scope() { return threatScope(T, S.scope); }
function depth() { return S.depth === 'auto' ? defaultDepth(T) : S.depth; }
const ghost = () => { const g = studio()?.proposal; return g && g.kind === 'control' && T?.threats.has(g.objectId) ? g : null; };
const coverageView = () => S.view === 'coverage';
function measure(l) { return 26 + 7 * Math.max(String(l.label || '').length, l.data.map(d => T.X.D.get(d)?.title || '').join(', ').length * 0.9, (l.threats.length + l.controls.length) * 8); }

function render() {
  if (!root) return;
  if (!T) { root.querySelector('.cm-html').innerHTML = '<p class="cm-empty">The security model could not be prepared for this project.</p>'; return; }
  root.classList.remove('cm-lens-protection', 'cm-lens-information', 'cm-lens-flow');
  root.classList.add('cm-lens-' + S.lens);
  root.classList.toggle('tm-matrix', coverageView());
  root.querySelector('.cm-body').classList.toggle('no-panel', !S.panel);
  root.querySelector('[data-tm="panel"]').setAttribute('aria-pressed', String(S.panel));
  // Geometry depends on the elements, the scope and the depth — never on the lens.
  F = foldThreat(T, scope(), depth());
  if (coverageView()) { G = coverage(T, scope(), {proposal: ghost()}); L = matrixLayout(G); } else L = threatLayout(F, {measure});
  const world = root.querySelector('.cm-world'), svg = root.querySelector('.cm-svg');
  world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
  svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
  const hl = highlight();
  if (coverageView()) { svg.innerHTML = matrixSVG(hl); root.querySelector('.cm-html').innerHTML = matrixHTML(hl); matrixHeads(hl); matrixRail(hl); }
  else { svg.innerHTML = defs() + modelSVG(hl); root.querySelector('.cm-html').innerHTML = modelHTML(hl); modelHeads(hl); root.querySelector('.cm-rail-in').innerHTML = ''; }
  chrome(); panel(); walkBar();
  stage.use(L, JSON.stringify([S.view, S.scope?.kind || 'system', S.scope?.id || '', depth()]));
  if (fitPending) { fitPending = false; stage.fit(); } else stage.clamp();
  stage.apply();
}

// What an object concerns, in the terms of the drawn model.
function concerns(id) {
  const out = {elements: new Set(), flows: new Set(), data: new Set(), threats: new Set(), controls: new Set(), regions: new Set()};
  const addTarget = x => {
    if (T.elements.has(x)) out.elements.add(x);
    const fs = T.flows.filter(f => f.contract === x || f.id === x); for (const f of fs) { out.flows.add(f.id); out.elements.add(f.from); out.elements.add(f.to); }
    const d = T.X.D.get(x); if (d) { out.data.add(x); if (d.authority) out.elements.add(d.authority); for (const f of T.flows) if (f.data.includes(x)) out.flows.add(f.id); }
    if (T.boundaries.some(b => b.id === x)) out.regions.add(x);
  };
  if (T.threats.has(id)) { const t = T.threats.get(id); out.threats.add(id); t.targets.forEach(addTarget); t.controls.forEach(c => out.controls.add(c)); }
  else if (T.controls.has(id)) { const c = T.controls.get(id); out.controls.add(id); c.targets.forEach(addTarget); c.threats.forEach(t => out.threats.add(t)); }
  else if (T.elements.has(id)) { out.elements.add(id); for (const f of T.flows) if (f.from === id || f.to === id) { out.flows.add(f.id); out.elements.add(f.from); out.elements.add(f.to); } }
  else if (T.boundaries.some(b => b.id === id) || id === OUT_L || id === OUT_R) { out.regions.add(id); for (const f of T.flows) if (f.crosses && (f.fromRegion === id || f.toRegion === id)) out.flows.add(f.id); for (const e of T.elements.values()) if (e.region === id) out.elements.add(e.id); }
  else if (id?.startsWith?.('REG:')) return concerns(id.slice(4));
  else addTarget(id);
  return out;
}
function highlight() {
  const out = {on: false, cards: new Set(), links: new Set(), threats: new Set(), controls: new Set(), lanes: new Set(), data: new Set()};
  let id = S.sel;
  if (S.walk >= 0 && !coverageView()) { const f = walkFlows()[S.walk]; id = f ? f.id : null; }
  if (!id) return out;
  const c = concerns(id);
  out.on = true; out.threats = c.threats; out.controls = c.controls; out.lanes = c.regions; out.data = c.data;
  for (const e of c.elements) { const r = F.rowOf(e); if (r) out.cards.add(r); }
  if (id.startsWith('REG:')) out.cards.add(id);
  for (const l of F.links) if (l.flows.some(f => c.flows.has(f))) { out.links.add(l.id); out.cards.add(l.from); out.cards.add(l.to); }
  return out;
}
const cardCls = (hl, id) => (hl.on ? (hl.cards.has(id) ? ' lit' : ' dim') : '');

function defs() {
  const m = (id, fill) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1 9 5 1 9z" fill="${fill}"/></marker>`;
  return `<defs>${m('tm-a-n', '#4d6a5c')}${m('tm-a-h', '#a8741f')}${m('tm-a-w', '#b0493a')}${m('tm-a-g', '#2f6b4f')}${m('tm-a-m', '#c3cbbd')}<pattern id="tm-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v8" stroke="#ece6d6" stroke-width="3"/></pattern></defs>`;
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
  for (const ln of L.lanes) out.push(`<rect class="tm-lane ${ln.kind}${hl.lanes.has(ln.id) ? ' lit' : ''}" x="${ln.x}" y="${L.top - 6}" width="${ln.w}" height="${L.H - L.top}" rx="12"/>`);
  const g = ghost(), proposed = new Set(g ? g.record.targetIds || [] : []);
  const order = L.routes.map(r => ({r, lit: hl.links.has(r.id)})).sort((a, b) => a.lit - b.lit);
  for (const {r, lit} of order) {
    const l = r.link, tone = lit ? 'h' : hl.on ? 'm' : S.lens === 'protection' && l.crosses ? (l.state === 'exposed' ? 'w' : l.state === 'guarded' ? 'g' : 'n') : 'n';
    const sens = l.data.some(d => /restricted|confidential|secret|personal/i.test(T.X.D.get(d)?.classification || ''));
    const isProposed = l.flows.some(fid => { const f = T.flows.find(x => x.id === fid); return proposed.has(f?.contract) || proposed.has(f?.to); });
    out.push(`<path class="tm-route ${l.kind} ${l.crosses ? 'cross ' + l.state : 'inside'}${sens ? ' sensitive' : ''}${lit ? ' lit' : hl.on ? ' dim' : ''}${l.dim ? ' out' : ''}${isProposed ? ' proposed' : ''}" d="${roundPath(r.pts)}" marker-end="url(#tm-a-${tone})"/>`);
  }
  for (const j of L.joins || []) { const lit = j.links.some(id => hl.links.has(id)); out.push(`<circle class="tm-join${lit ? ' lit' : hl.on ? ' dim' : ''}" cx="${j.x}" cy="${j.y}" r="3"/>`); }
  return out.join('');
}
function badge(n, cls, label) { return n ? `<i class="tm-b ${cls}" title="${esc(label)}">${n}</i>` : ''; }
function modelHTML(hl) {
  const out = [], g = ghost(), proposed = new Set(g ? g.record.targetIds || [] : []);
  for (const c of L.cards) {
    const r = c.row, e = r.element ? T.elements.get(r.element) : null;
    const data = r.data.map(d => { const x = T.X.D.get(d), ts = T.threats.size ? [...T.threats.values()].filter(t => t.targets.includes(d)) : [], open = ts.filter(t => !t.coverage.get(d) && !['accept', 'avoid'].includes(t.treatment)); return `<i class="tm-d ${clsOf(x?.classification)}${open.length ? ' open' : ts.length ? ' guarded' : ''}${hl.data.has(d) ? ' lit' : ''}${proposed.has(d) ? ' proposed' : ''}" data-sel="${esc(d)}" title="${esc((x?.ref || '') + ' · ' + (x?.title || d) + ' · ' + (x?.classification || 'Unclassified') + (ts.length ? ' · threats: ' + ts.map(t => t.ref).join(', ') : ''))}">${open.length ? '! ' : ''}${esc(x?.title || d)}</i>`; }).join('');
    const n = r.members.length, kind = r.kind === 'region' ? (r.region === OUT_L || r.region === OUT_R ? `${n} participant${n === 1 ? '' : 's'}` : `${n} part${n === 1 ? '' : 's'}`) : KIND[r.kind];
    out.push(`<div class="tm-card ${r.kind}${r.ctx ? ' ctx' : ''}${r.subject ? ' subject' : ''}${S.sel === r.id || S.sel === r.element ? ' sel' : ''}${cardCls(hl, r.id)}${e && proposed.has(e.id) ? ' proposed' : ''}" data-card="${esc(r.id)}" style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px" tabindex="0" role="button" aria-label="${esc(kind + ' ' + r.title)}">
      <small>${esc(kind)}${badge(r.open.length, 'open', r.open.length + ' threat(s) not covered here')}${badge(r.threats.length - r.open.length, 'thr', 'covered threats')}${badge(r.controls.length, 'ctl', r.controls.length + ' control(s) on it')}</small><b>${esc(r.title)}</b>${data ? `<span class="tm-data">${data}</span>` : ''}</div>`);
  }
  for (const m of L.markers) {
    const ls = m.links.map(id => F.links.find(x => x.id === id)), lit = m.links.some(id => hl.links.has(id)), out2 = ls.every(l => l.dim);
    const what = m.entry ? `${m.count > 1 ? m.count + ' parts in ' : ''}${laneInfo(T, m.from).title} reach ${titleOf(rowTarget(m.to))}` : m.link.label;
    out.push(`<button type="button" class="tm-x ${m.state}${m.entry ? ' entry' : ''}${lit ? ' lit' : hl.on ? ' dim' : ''}${out2 ? ' out' : ''}" ${m.entry ? `data-entry="${esc(m.to)}"` : `data-link="${esc(m.id)}"`} style="left:${m.x - 10}px;top:${m.y - 10}px" aria-label="${esc(STATE[m.state] + ': ' + what)}">${m.state === 'exposed' ? '!' : m.state === 'guarded' ? '✓' : '?'}</button>`);
  }
  for (const lb of L.labels) {
    const l = lb.link, lit = hl.links.has(l.id);
    const prot = [...l.threats.map(t => `<i class="tm-r ${T.threats.get(t)?.coverage && [...T.threats.get(t).coverage].some(([, v]) => !v) ? 'open' : 'thr'}" data-sel="${esc(t)}">${esc(T.threats.get(t)?.ref || t)}</i>`), ...l.controls.map(c => `<i class="tm-r ctl" data-sel="${esc(c)}">${esc(T.controls.get(c)?.ref || c)}</i>`)].join('') || `<em>${l.crosses ? 'nothing recorded' : 'inside one boundary'}</em>`;
    const info = l.data.map(d => `<i class="cm-d ${clsOf(T.X.D.get(d)?.classification)}" data-sel="${esc(d)}">${esc(T.X.D.get(d)?.title || d)}</i>`).join('') || '<em>no data recorded</em>';
    const flow = l.kind === 'uses' ? '<em>uses</em>' : `<em>${l.flows.length > 1 ? l.flows.length + ' flows' : 'contract'}</em>`;
    if (lb.compact) { out.push(`<button type="button" class="tm-label compact${lit ? ' lit' : hl.on ? ' dim' : ''}${l.dim ? ' out' : ''}" data-link="${esc(l.id)}" style="left:${lb.x}px;top:${lb.y}px;width:${lb.w}px;height:${lb.h}px" aria-label="${esc(l.label)}"><span class="tm-l1"><b>${esc(l.ref)}</b></span></button>`); continue; }
    out.push(`<button type="button" class="tm-label${lit ? ' lit' : hl.on ? ' dim' : ''}${l.dim ? ' out' : ''}" data-link="${esc(l.id)}" style="left:${lb.x}px;top:${lb.y}px;width:${lb.w}px;height:${lb.h}px"><span class="tm-l1">${l.ref ? `<b>${esc(l.ref)}</b>` : ''}${esc(l.ref ? l.label.slice(l.ref.length + 1) : l.label)}</span><span class="tm-l2 pr">${prot}</span><span class="tm-l2 in">${info}</span><span class="tm-l2 fl">${flow}</span></button>`);
  }
  return out.join('');
}
function modelHeads(hl) {
  const box = root.querySelector('.cm-heads-in'), out = [];
  for (const ln of L.lanes) out.push(`<button type="button" class="tm-lh ${ln.kind}${S.sel === ln.id ? ' sel' : hl.lanes.has(ln.id) ? ' lit' : ''}" data-lane="${esc(ln.id)}" style="left:${ln.x + 4}px;width:${ln.w - 8}px;top:8px;height:${TM.HEAD_H - 8}px"><small>${ln.kind === 'boundary' ? 'Trust boundary · ' + esc(ln.ref) : ln.kind === 'outside' ? 'Not ours' : 'Unassigned'}</small><b>${esc(ln.title)}</b><span>${esc(ln.sub)}</span></button>`);
  box.innerHTML = out.join('');
  box.style.width = L.W + 'px';
}

// ---------------------------------------------------------------- threats & controls

function matrixSVG(hl) {
  const out = [];
  for (const g of L.groups) out.push(`<rect class="tm-mgroup" x="${L.rail}" y="${g.y}" width="${L.W - L.rail - 8}" height="${g.h}"/>`);
  L.rows.forEach((r, i) => out.push(`<rect class="tm-mrow${i % 2 ? ' odd' : ''}${hl.threats.has(r.id) ? ' lit' : ''}" x="${L.rail}" y="${r.y}" width="${L.W - L.rail - 8}" height="${r.h}"/>`));
  for (const c of L.cols) if (c.control.proposed) out.push(`<rect class="tm-mghost" x="${c.x + 2}" y="${L.top}" width="${c.w - 4}" height="${L.H - L.top - 16}" rx="8"/>`);
  for (const c of L.cols) out.push(`<line class="tm-mcol${hl.controls.has(c.id) ? ' lit' : ''}" x1="${c.x + c.w}" x2="${c.x + c.w}" y1="${L.top}" y2="${L.H - 16}"/>`);
  return out.join('');
}
function matrixHTML(hl) {
  const out = [], g = ghost();
  for (const gr of L.groups) out.push(`<div class="tm-mg" style="left:${L.rail + 10}px;top:${gr.y + 6}px">${esc(gr.title)} priority</div>`);
  const K = new Map(G.controls.map(k => [k.id, k]));
  for (const c of L.cells) {
    const t = T.threats.get(c.threat), k = K.get(c.control), lit = hl.threats.has(c.threat) || hl.controls.has(c.control);
    const on = k.targets.filter(x => t.targets.includes(x)).map(refOrTitle).join(', '), who = k.proposed ? 'The proposal' : k.ref;
    const tip = c.kind === 'covers' ? `${who} ${k.proposed ? 'would cover' : 'covers'} ${t.ref} on ${on}` : c.kind === 'claims' ? `${who} is linked to ${t.ref} but protects none of what it threatens` : `${who} protects ${on}, which ${t.ref} threatens, but they are not linked`;
    out.push(`<button type="button" class="tm-cell ${c.kind}${c.proposed ? ' proposed' : ''}${hl.on ? (lit ? ' lit' : ' dim') : ''}" ${c.proposed ? 'data-sec-action="edit-ghost"' : `data-sel="${esc(c.control)}"`} style="left:${c.x - 13}px;top:${c.y - 13}px" title="${esc(tip)}" aria-label="${esc(tip)}"></button>`);
  }
  for (const r of L.rows) {
    const t = r.threat, open = [...t.coverage].filter(([, v]) => !v).map(([id]) => id), lit = hl.threats.has(t.id);
    const key = PROPOSAL_FOR[t.category] || 'authority', isGhost = g?.objectId === t.id, closes = G.closes.has(t.id);
    const act = t.covered ? '' : closes ? '<button type="button" class="cm-mini gold" data-sec-action="edit-ghost">Review proposal</button>' : isGhost ? '<span class="tm-ghostnote">Proposal leaves a gap</span>' : `<button type="button" class="cm-mini gold" data-tm="propose" data-key="${key}" data-id="${esc(t.id)}">Propose a control</button>`;
    const note = t.covered ? (t.treatment ? 'Risk ' + esc(t.treatment) + 'ed' : 'every affected object has a control') : closes ? 'covered once the proposal is accepted' : esc(open.map(refOrTitle).join(', '));
    out.push(`<div class="tm-cover${t.covered ? ' ok' : closes ? ' closes' : ' open'}${hl.on ? (lit ? ' lit' : ' dim') : ''}" style="left:${L.coverX}px;top:${r.y + 6}px;width:${MX.COVER_W}px;height:${r.h - 12}px" title="${esc(t.covered ? 'Covered' : 'Not covered: ' + open.map(refOrTitle).join(', '))}"><div class="tm-c1"><b>${t.covered ? 'Covered' : 'Not covered'}</b>${act}</div><small>${note}</small></div>`);
    const ev = t.controls.map(id => T.controls.get(id)).map(c => `${c.ref}: ${c.assurance || 'no evidence'}`);
    out.push(`<div class="tm-evid${hl.on ? (lit ? ' lit' : ' dim') : ''}" style="left:${L.evidX}px;top:${r.y + 6}px;width:${MX.EVID_W}px;height:${r.h - 12}px">${ev.length ? ev.map(x => `<small>${esc(x)}</small>`).join('') : '<small class="none">No linked control</small>'}</div>`);
  }
  return out.join('');
}
const refOrTitle = id => (refOf(id) ? refOf(id) + ' ' : '') + titleOf(id);
function matrixHeads(hl) {
  const box = root.querySelector('.cm-heads-in'), out = [];
  for (const c of L.cols) {
    const k = c.control, pos = `style="left:${c.x + 3}px;width:${c.w - 6}px;top:8px;height:${MX.HEAD_H - 8}px"`;
    if (k.proposed) { out.push(`<button type="button" class="tm-ch proposed" data-sec-action="edit-ghost" ${pos} title="${esc(k.title + ' — not saved. Review and edit before accepting.')}"><small>Proposal · not saved</small><b>${esc(k.title)}</b><span>Review &amp; edit</span></button>`); continue; }
    const short = String(k.assurance || '').split(' · ')[0];
    out.push(`<button type="button" class="tm-ch${S.sel === k.id ? ' sel' : hl.controls.has(k.id) ? ' lit' : hl.on ? ' dim' : ''}${k.threats.length ? '' : ' idle'}" data-sel="${esc(k.id)}" ${pos} title="${esc(k.ref + ' · ' + k.title + ' · ' + k.category + (k.assurance ? ' · ' + k.assurance : ''))}"><small>${esc(k.ref)} · ${esc(k.category)}</small><b>${esc(k.title)}</b><span>${k.threats.length ? esc(short) : 'Not linked to a threat'}</span></button>`);
  }
  out.push(`<div class="tm-th" style="left:${L.coverX}px;width:${MX.COVER_W}px;top:8px"><b>Coverage</b><small>every affected object needs a control, or a treatment</small></div>`);
  out.push(`<div class="tm-th" style="left:${L.evidX}px;width:${MX.EVID_W}px;top:8px"><b>Evidence</b><small>for the linked controls</small></div>`);
  box.innerHTML = out.join('');
  box.style.width = L.W + 'px';
}
function matrixRail(hl) {
  const box = root.querySelector('.cm-rail-in');
  root.querySelector('.cm-rail').style.setProperty('--cm-rail', L.rail + 'px');
  box.innerHTML = L.rows.map(r => { const t = r.threat, lit = hl.threats.has(t.id); return `<button type="button" title="${esc(t.ref + ' · ' + t.title + ' — ' + t.category)}" class="tm-trow${t.covered ? '' : ' open'}${S.sel === t.id ? ' sel' : hl.on ? (lit ? ' lit' : ' dim') : ''}" data-sel="${esc(t.id)}" style="top:${r.y + 4}px;height:${r.h - 8}px"><b>${esc(t.ref)} · ${esc(t.title)}</b><small>${esc(t.category)}</small><span>${t.targets.map(id => `<i class="${t.coverage.get(id) ? 'ok' : 'open'}">${esc(refOrTitle(id))}</i>`).join('')}</span></button>`; }).join('');
  box.style.height = L.H + 'px'; box.style.width = L.rail + 'px';
}

// ---------------------------------------------------------------- chrome

function crumbs() {
  const sc = scope(), parts = [`<button type="button" data-tm="scope" data-kind="system" class="${sc.kind === 'system' ? 'here' : ''}">Whole system</button>`];
  if (sc.kind !== 'system') {
    const region = sc.kind === 'boundary' ? sc.id : T.elements.get(sc.id)?.region;
    if (region) parts.push('<span>›</span>', `<button type="button" data-tm="scope" data-kind="boundary" data-id="${esc(region)}" class="${sc.kind === 'boundary' ? 'here' : ''}">${esc(laneInfo(T, region).title)}</button>`);
    if (sc.kind === 'part') parts.push('<span>›</span>', `<button type="button" class="here" data-tm="noop">${esc(titleOf(sc.id))}</button>`);
  }
  return parts.join('');
}
function chrome() {
  const sc = scope();
  root.querySelector('.cm-crumbs').innerHTML = crumbs();
  root.querySelectorAll('.cm-view').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === S.view)));
  root.querySelector('.cm-lenses').innerHTML = LENSES.map(l => `<button type="button" class="cm-lens" data-tm="lens" data-id="${l.id}" aria-pressed="${S.lens === l.id}" title="${esc(l.q + ' Like the ' + l.like + '.')}">${icon(l.id)}<span>${l.label}</span></button>`).join('');
  const dp = depth();
  root.querySelector('.cm-depth').innerHTML = !coverageView() && sc.kind === 'system' ? `<span>Elements</span>${[['boundaries', 'Boundaries'], ['parts', 'Parts'], ['all', 'Parts + platform']].map(([id, t]) => `<button type="button" class="cm-dep" data-tm="depth" data-id="${id}" aria-pressed="${dp === id}">${t}</button>`).join('')}` : '';
  let state;
  if (coverageView()) { const open = G.threats.filter(t => !t.covered).length; const n = G.controls.filter(c => !c.proposed).length; state = `${G.threats.length} threat${G.threats.length === 1 ? '' : 's'} · ${open} not fully covered · ${n} control${n === 1 ? '' : 's'}${G.closes.size ? ` · the proposal would close ${G.closes.size}` : ''}`; }
  else { const c = s => L.markers.filter(m => m.state === s).length, n = L.markers.length; state = n ? `${n} boundary crossing${n === 1 ? '' : 's'} · ${c('exposed')} exposed · ${c('guarded')} guarded · ${c('unexamined')} not examined` : 'No flow crosses a trust boundary here'; }
  root.querySelector('.cm-state').textContent = state;
  const g = ghost();
  root.querySelector('.cm-banner').innerHTML = g ? `<section class="dp-banner"><span class="ip-kicker">Control proposal · not saved</span><b>${esc(g.record.title)} for ${esc(T.threats.get(g.objectId).ref)}</b><small>${esc(g.reason)}</small><button type="button" class="cm-btn gold" data-sec-action="edit-ghost">Review &amp; edit</button><button type="button" class="cm-btn" data-sec-action="dismiss">Dismiss</button></section>` : '';
  root.querySelector('.cm-legend').innerHTML = coverageView() ? `<p><i class="k-cell covers"></i>Covers: linked, and protects what the threat affects</p><p><i class="k-cell claims"></i>Linked, but protects none of it</p><p><i class="k-cell overlap"></i>Protects something it threatens, not linked</p>${ghost() ? '<p><i class="k-cell proposed"></i>The unsaved proposal</p>' : ''}` : `<p><span class="k-lane"></span>Trust boundary</p><p><i class="k-x exposed">!</i>Exposed: a threat is not covered at this crossing</p><p><i class="k-x guarded">✓</i>Guarded: a control covers it</p><p><i class="k-x unexamined">?</i>Not examined: nothing recorded</p><p><i class="k-x entry unexamined">?</i>Entry into a platform service or store</p><p><svg width="40" height="10"><line x1="2" y1="5" x2="32" y2="5" stroke="#4d6a5c" stroke-width="1.6" marker-end="url(#tm-a-n)"/></svg>Contract</p><p><svg width="40" height="10"><line x1="2" y1="5" x2="32" y2="5" stroke="#4d6a5c" stroke-width="1.2" stroke-dasharray="3 3"/></svg>Uses a platform service or store</p>`;
}

// ---------------------------------------------------------------- companion

const act = (a, id, label, cls = '') => `<button type="button" class="cm-btn ${cls}" data-sec-action="${a}" data-sec-id="${esc(id)}">${label}</button>`;
function listTC(ids, kind) { return ids.map(id => { const x = kind === 't' ? T.threats.get(id) : T.controls.get(id); return x ? `<button type="button" class="cm-link" data-sel="${esc(id)}">${esc(x.ref)} ${esc(x.title)}${kind === 't' && !x.covered ? ' <i>· not covered</i>' : ''}</button>` : ''; }).join('') || '<em>None recorded</em>'; }
function specimenThreat(id) {
  const t = T.threats.get(id), key = PROPOSAL_FOR[t.category] || 'authority';
  return `<section class="cm-spec"><h4>Threat scenario<span>${esc(t.priority)}</span></h4><p class="cm-spec-t"><b>${esc(t.ref)} · ${esc(t.title)}</b></p><p>${esc(t.actor)} — ${esc(t.scenario)}</p><dl class="cm-dl"><div><dt>Consequence</dt><dd>${esc(t.consequence || '—')}</dd></div><div><dt>Category</dt><dd>${esc(t.category)}</dd></div><div><dt>Affects</dt><dd>${t.targets.map(x => `<button type="button" class="cm-link" data-sel="${esc(x)}">${esc(refOrTitle(x))}<i>${t.coverage.get(x) ? ' · covered' : ' · not covered'}</i></button>`).join('')}</dd></div><div><dt>Controls</dt><dd>${listTC(t.controls, 'c')}</dd></div><div class="${t.treatment ? '' : 'none'}"><dt>Treatment</dt><dd>${esc(t.treatment || 'No residual-risk treatment recorded')}</dd></div><div><dt>Risk owner</dt><dd>${esc(t.owner || 'Not named')}</dd></div></dl>
  <div class="cm-acts">${act('edit-threat', id, icon('edit') + 'Edit threat', 'primary')}${!t.covered ? `<button type="button" class="cm-btn gold" data-tm="propose" data-key="${key}" data-id="${esc(id)}">Propose a control</button><button type="button" class="cm-btn" data-tm="new-control" data-id="${esc(id)}">Design a control for it</button>` : ''}<button type="button" class="cm-btn" data-brain-launch="mind">${icon('mind')}Mind Factory</button><a class="cm-btn" href="${esc(projectURL('/?chapter=9&tab=work&object=' + encodeURIComponent(id)))}">Open in Work</a></div></section>`;
}
function specimenControl(id) {
  const c = T.controls.get(id);
  return `<section class="cm-spec"><h4>Control design<span>${esc(c.assurance || '')}</span></h4><p class="cm-spec-t"><b>${esc(c.ref)} · ${esc(c.title)}</b></p><p>${esc(c.purpose)}</p><dl class="cm-dl"><div><dt>Category</dt><dd>${esc(c.category)}</dd></div><div class="${c.enforcement ? '' : 'miss'}"><dt>Enforced at</dt><dd>${esc(c.enforcement || 'Not recorded')}</dd></div><div class="${c.mechanism ? '' : 'miss'}"><dt>Mechanism</dt><dd>${esc(c.mechanism || 'Not recorded')}</dd></div><div class="${c.failureMode !== 'Unspecified' && c.failureResponse ? '' : 'miss'}"><dt>If it fails</dt><dd>${esc(c.failureMode === 'Unspecified' ? 'Not recorded' : c.failureMode + (c.failureResponse ? ' — ' + c.failureResponse : ''))}</dd></div><div><dt>Protects</dt><dd>${c.targets.map(x => `<button type="button" class="cm-link" data-sel="${esc(x)}">${esc(refOrTitle(x))}</button>`).join('')}</dd></div><div class="${c.threats.length ? '' : 'miss'}"><dt>Answers</dt><dd>${c.threats.length ? listTC(c.threats, 't') : 'No threat linked'}</dd></div><div><dt>Owner</dt><dd>${esc(c.owner || 'Not named')}</dd></div></dl>
  <div class="cm-acts">${act('edit-control', id, icon('edit') + 'Edit control', 'primary')}<a class="cm-btn" href="${esc(projectURL('/?chapter=9&tab=work&object=' + encodeURIComponent(id)))}">Open in Work</a></div></section>`;
}
function specimenObject(id) {
  const e = T.elements.get(id), fs = T.flows.filter(f => f.contract === id || f.id === id), d = T.X.D.get(id), f = fs[0];
  const st = e ? e.protection : f ? f.protection : T.status(id), target = f?.contract || id;
  const head = e ? KIND[e.kind] : f ? (f.kind === 'uses' ? 'Use of a platform service or store' : 'Interface contract') : d ? 'Data definition' : 'Object';
  const where = e ? laneInfo(T, e.region).title : f ? (f.crosses ? `${laneInfo(T, f.fromRegion).title} → ${laneInfo(T, f.toRegion).title}` : laneInfo(T, f.fromRegion).title) : d?.authority ? 'held by ' + titleOf(d.authority) : '';
  const read = f ? describeFlow(T, f.id) : d ? `${d.ref} ${d.title} · ${d.classification || 'Unclassified'}. Authority: ${d.authority ? titleOf(d.authority) : 'none'}.` : '';
  return `<section class="cm-spec"><h4>${esc(head)}<span class="${st.state}">${esc(st.state === 'unexamined' ? 'Not examined' : st.state === 'exposed' ? 'Exposed' : 'Guarded')}</span></h4><p class="cm-spec-t"><b>${esc(refOrTitle(f?.contract || id))}</b></p>${read ? `<p>${esc(read)}</p>` : ''}<dl class="cm-dl"><div><dt>Where</dt><dd>${esc(where)}</dd></div><div><dt>Threats</dt><dd>${listTC(st.threats, 't')}</dd></div><div><dt>Controls</dt><dd>${listTC(st.controls, 'c')}</dd></div>${e?.kind === 'platform' ? `<div><dt>Reached by</dt><dd>${e.users.map(u => `<button type="button" class="cm-link" data-sel="${esc(u)}">${esc(titleOf(u))}<i class="from">${T.elements.get(u).region !== e.region ? ' · from ' + esc(laneInfo(T, T.elements.get(u).region).title) : ''}</i></button>`).join('')}</dd></div>` : ''}${e?.data.length ? `<div><dt>Holds</dt><dd>${e.data.map(x => `<button type="button" class="cm-link" data-sel="${esc(x)}">${esc(refOrTitle(x))}</button>`).join('')}</dd></div>` : ''}</dl>
  <div class="cm-acts"><button type="button" class="cm-btn primary" data-tm="new-threat" data-id="${esc(target)}">Record a threat here</button>${e && e.kind !== 'region' ? `<button type="button" class="cm-btn" data-tm="dissect" data-id="${esc(id)}">${icon('dissect')}Focus on this part</button>` : ''}${f?.contract ? `<a class="cm-btn" href="${esc(projectURL('/?chapter=8&tab=model&object=' + encodeURIComponent(f.contract)))}">Contract in Chapter 8</a>` : ''}</div></section>`;
}
function specimenLane(id) {
  const ln = laneInfo(T, id), inside = [...T.elements.values()].filter(e => e.region === id), cross = crossingsOf(T, f => f.fromRegion === id || f.toRegion === id);
  const c = s => cross.filter(x => x.state === s).length, ents = cross.filter(x => x.kind === 'entry').length;
  return `<section class="cm-spec"><h4>${ln.kind === 'boundary' ? 'Trust boundary' : 'Outside the system'}</h4><p class="cm-spec-t"><b>${esc(ln.ref ? ln.ref + ' · ' : '')}${esc(ln.title)}</b></p>${ln.sub ? `<p>${esc(ln.sub)}</p>` : ''}<dl class="cm-dl">${ln.owner ? `<div><dt>Owner</dt><dd>${esc(ln.owner)}</dd></div>` : ''}<div><dt>Inside</dt><dd>${inside.map(e => `<button type="button" class="cm-link" data-sel="${esc(e.id)}">${esc(e.title)}</button>`).join('') || '<em>Nothing yet</em>'}</dd></div><div><dt>Crossings</dt><dd>${cross.length}${ents ? ` (${ents} into platform or stores)` : ''} · ${c('exposed')} exposed · ${c('guarded')} guarded · ${c('unexamined')} not examined</dd></div></dl><div class="cm-acts">${ln.kind === 'boundary' ? `<button type="button" class="cm-btn primary" data-tm="scope-boundary" data-id="${esc(id)}">${icon('dissect')}Open this boundary</button><a class="cm-btn" href="${esc(projectURL('/?chapter=6&tab=work'))}">Boundaries are defined in Chapter 6</a>` : ''}</div></section>`;
}
function reading() {
  if (coverageView()) return `<section><h4>Reading this view</h4><p>Each row is a threat; each column a control. A filled dot means the control is linked to the threat <b>and</b> protects something the threat affects. The chapter's rule: every affected object needs such a control, or a recorded treatment.</p><p>A dashed ring points to a control that already protects the same object but is not linked — often the quickest way to close a gap.</p></section>`;
  const n = L.markers.length, entries = L.markers.filter(m => m.entry).length;
  return `<section><h4>Reading this view</h4><p>Columns are trust regions: outside, each <b>trust boundary</b>, outside. Parts share a row only where no flow would pass through them, so each flow reads across to the region it enters. Where a contract crosses a boundary, the round marker says whether that crossing is <b>guarded</b> (✓), <b>exposed</b> (!) or <b>not yet examined</b> (?).</p>${entries ? `<p>Where parts reach a platform service or store in another boundary, their flows join one trunk; the square marker is that <b>entry</b>.</p>` : ''}<p>${n} crossing${n === 1 ? '' : 's'} in view.${walkFlows().length ? ' <b>Walk the journey</b> to follow the payment across each boundary it crosses.' : ''}</p></section>`;
}
function insightsHTML() {
  const list = threatInsights(T, scope()).slice(0, 8);
  if (!list.length) return '';
  return `<section><h4>What the model shows<span>${list.length}</span></h4>${list.map(x => `<button type="button" class="cm-ins ${x.kind}" data-sel="${esc(x.id || '')}"><span>${esc(x.text)}</span>${x.ask ? `<small>Ask: ${esc(x.ask)}</small>` : ''}</button>`).join('')}<p class="cm-muted">Drawn from recorded contracts, boundaries, threats and controls. Prompts for review, not verdicts.</p></section>`;
}
function findingsHTML() {
  const sc = scope(), fs = T.findings.filter(f => sc.kind === 'system' || concerns(sc.id).elements.has(f.objectId) || T.threats.get(f.objectId)?.targets.some(x => concerns(sc.id).flows.has('C:' + x) || concerns(sc.id).data.has(x)));
  if (!fs.length) return '';
  const groups = new Map();
  for (const f of fs) { const k = f.title.replace(/(SEC|THR|IF|DAT)-\d+/g, '…'); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
  return `<section><h4>Chapter 9 checks<span>${fs.length}</span></h4>${[...groups].sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([k, g]) => `<button type="button" class="cm-fg ${g.some(f => f.level === 'error') ? 'error' : ''}" data-sel="${esc(g[0].objectId)}"><b>${esc(k)}</b><small>${g.length} · ${esc([...new Set(g.map(f => refOf(f.objectId) || f.objectId))].slice(0, 4).join(', '))}${g.length > 4 ? '…' : ''}</small></button>`).join('')}<a class="cm-muted" href="${esc(projectURL('/?chapter=9&tab=validate&validate=readiness'))}">All checks on Validate →</a></section>`;
}
function panel() {
  const box = root.querySelector('.cm-panel');
  solMark(root, project(), 9);
  if (!S.panel) { box.innerHTML = ''; return; }
  const s = S.sel;
  let spec = '';
  if (s && T.threats.has(s)) spec = specimenThreat(s);
  else if (s && T.controls.has(s)) spec = specimenControl(s);
  else if (s && (T.boundaries.some(b => b.id === s) || s === OUT_L || s === OUT_R)) spec = specimenLane(s);
  else if (s?.startsWith?.('REG:')) spec = specimenLane(s.slice(4));
  else if (s && known(s)) spec = specimenObject(s);
  box.innerHTML = solInto(spec, solSection(project(), 9, s)) + reading() + insightsHTML() + findingsHTML();
}

// ---------------------------------------------------------------- walk the journey

const walkFlows = () => T.journey.map(id => T.flows.find(f => f.id === id)).filter(f => f && F.rowOf(f.from) && F.rowOf(f.to) && F.rowOf(f.from) !== F.rowOf(f.to));
function walkBar() {
  const bar = root.querySelector('.cm-walk'), fs = walkFlows();
  if (coverageView() || !fs.length) { bar.innerHTML = `<p class="cm-walk-text">${coverageView() ? 'Select a threat to see what it affects and what covers it; select a control to see what it protects.' : 'Select a crossing marker to read what protects it.'}</p>`; return; }
  const cur = S.walk >= 0 ? fs[S.walk] : null;
  bar.innerHTML = `<button type="button" class="cm-btn" data-tm="walk-prev" aria-label="Previous flow" ${S.walk <= 0 ? 'disabled' : ''}>‹</button><button type="button" class="cm-btn" data-tm="walk-next">${S.walk < 0 ? icon('play') + '<span>Walk the journey</span>' : S.walk >= fs.length - 1 ? 'Done' : 'Next ›'}</button><p class="cm-walk-text">${cur ? `<b>${S.walk + 1} / ${fs.length}</b> ${esc(describeFlow(T, cur.id))}` : `${fs.length} flows along the first recorded journey. At each one: which boundary it crosses, what could go wrong, and what protects it.`}</p>${S.walk >= 0 ? '<button type="button" class="cm-btn icon" data-tm="walk-stop" aria-label="Stop the walk">×</button>' : ''}`;
}
function revealWalk() {
  const f = walkFlows()[S.walk]; if (!f) return;
  const l = F.links.find(x => x.flows.includes(f.id)), r = L.routes?.find(x => x.id === l?.id);
  if (r) stage.reveal(Math.min(r.xa, r.xt) - 20, Math.min(r.ya, r.yb) - 30, Math.abs(r.xt - r.xa) + 60, Math.abs(r.yb - r.ya) + 60);
}

// ---------------------------------------------------------------- interaction

function revealSelection() {
  if (!S.sel || !L) return;
  if (coverageView()) { const r = L.rows.find(x => x.id === S.sel), c = L.cols.find(x => x.id === S.sel); if (r) stage.reveal(L.rail, r.y, 300, r.h); else if (c) stage.reveal(c.x, L.top, c.w, 100); return; }
  const h = highlight(), card = L.cards.find(c => h.cards.has(c.id));
  if (card) stage.reveal(card.x, card.y, card.w, card.h);
}
function select(id, {reveal = false} = {}) {
  S.sel = id || null; S.walk = -1;
  const p = project(), target = S.sel && !S.sel.startsWith('REG:') && !S.sel.startsWith('L:') ? (T.flows.find(f => f.id === S.sel)?.contract || S.sel) : null;
  if (p && target) { try { mountBrainContext(p, {id: target, chapter: 9}, 'model'); } catch { /* assistance is optional */ } }
  if (window.history) { const url = new URL(location.href); if (target) url.searchParams.set('object', target); else url.searchParams.delete('object'); window.history.replaceState(window.history.state, '', url.pathname + url.search); }
  if (S.sel && !S.panel) S.panel = true;
  save(); render();
  if (reveal) revealSelection();
}
function setScope(sc) { const r = threatScope(T, sc); S.scope = r.kind === 'system' ? {kind: 'system'} : {kind: r.kind, id: r.id}; S.walk = -1; fitPending = true; save(); render(); }
function up() { const sc = scope(); if (sc.kind === 'part') { const r = T.elements.get(sc.id)?.region; setScope(r && r !== 'NONE' ? {kind: 'boundary', id: r} : {kind: 'system'}); } else if (sc.kind === 'boundary') setScope({kind: 'system'}); }
function studioAction(action, data = {}) { const b = document.createElement('button'); b.type = 'button'; b.hidden = true; b.dataset.secAction = action; for (const [k, v] of Object.entries(data)) b.dataset[k] = v; document.body.append(b); b.click(); b.remove(); }
// Select the object in the chapter, then open the editor that uses the selection.
function withSelection(id, action) { studioAction('inspect', {secId: id}); setTimeout(() => studioAction(action), 60); }
function propose(key, id) { try { studio()?.preview?.(key, id); } catch { /* the studio reports its own errors */ } }
const linkFlow = id => { const l = F.links.find(x => x.id === id); if (!l) return null; const f = T.flows.find(x => x.id === l.flows[0]); return l.flows.length === 1 ? (f.contract || f.id) : l.from; };

function bind() {
  solChapterBind(root, 9, {refresh: solRefresh});
  root.addEventListener('click', e => {
    if (root.dataset.suppress) return;
    const add = root.querySelector('.cm-add');
    if (add?.open && !e.target.closest('.cm-add > summary')) add.open = false;
    if (e.target.closest('[data-brain-launch],[data-sec-action],a')) return;
    const a = e.target.closest('[data-tm]');
    if (a && !a.disabled) {
      const k = a.dataset.tm;
      if (k === 'view') { S.view = a.dataset.id; S.walk = -1; fitPending = true; save(); render(); revealSelection(); return; }
      if (k === 'lens') { S.lens = a.dataset.id; save(); render(); return; }
      if (k === 'depth') { S.depth = a.dataset.id; fitPending = true; save(); render(); return; }
      if (k === 'scope') { setScope(a.dataset.kind === 'boundary' ? {kind: 'boundary', id: a.dataset.id} : {kind: 'system'}); return; }
      if (k === 'scope-boundary') { setScope({kind: 'boundary', id: a.dataset.id}); return; }
      if (k === 'dissect') { setScope({kind: 'part', id: a.dataset.id}); return; }
      if (k === 'explore') { cbs.explore?.(9); return; }
      if (k === 'expand') { const on = !document.body.classList.contains('cm-expanded'); document.body.classList.toggle('cm-expanded', on); a.setAttribute('aria-pressed', String(on)); sizeModel(root, 'cm-expanded'); fitPending = true; setTimeout(render, 30); return; }
      if (k === 'panel') { S.panel = !S.panel; save(); fitPending = true; render(); setTimeout(() => { fitPending = true; render(); }, 30); return; }
      if (k === 'key') { const key = root.querySelector('.cm-key'); key.classList.toggle('cm-min'); a.setAttribute('aria-expanded', String(!key.classList.contains('cm-min'))); return; }
      if (k === 'fit') { stage.fitAll(); return; }
      if (k === 'zin' || k === 'zout') { const {w, h} = stage.box(); stage.zoomAt(stage.cam.z * (k === 'zin' ? 1.15 : 1 / 1.15), w / 2, h / 2); return; }
      if (k === 'propose') { propose(a.dataset.key, a.dataset.id); return; }
      if (k === 'new-threat') { withSelection(a.dataset.id, 'new-threat'); return; }
      if (k === 'new-control') { withSelection(a.dataset.id, 'new-control'); return; }
      if (k === 'walk-next') { const n = walkFlows().length; S.walk = S.walk >= n - 1 ? -1 : S.walk + 1; render(); revealWalk(); return; }
      if (k === 'walk-prev') { S.walk = Math.max(0, S.walk - 1); render(); revealWalk(); return; }
      if (k === 'walk-stop') { S.walk = -1; render(); return; }
      if (k === 'noop') return;
    }
    const lane = e.target.closest('[data-lane]');
    if (lane) { select(S.sel === lane.dataset.lane ? null : lane.dataset.lane); return; }
    const entry = e.target.closest('[data-entry]');
    if (entry) { select(rowTarget(entry.dataset.entry)); return; }
    const link = e.target.closest('[data-link]');
    if (link && !e.target.closest('[data-sel]')) { select(linkFlow(link.dataset.link)); return; }
    const card = e.target.closest('[data-card]');
    if (card && !e.target.closest('[data-sel]')) {
      const id = card.dataset.card, now = Date.now(), twice = lastClick.id === id && now - lastClick.t < 420;
      lastClick = {id, t: now};
      if (twice) { lastClick = {id: null, t: 0}; if (id.startsWith('REG:')) setScope({kind: 'boundary', id: id.slice(4)}); else setScope({kind: 'part', id}); return; }
      select(id); return;
    }
    const s = e.target.closest('[data-sel]');
    if (s && s.dataset.sel) { e.stopPropagation(); select(s.dataset.sel, {reveal: !!s.closest('.cm-panel')}); return; }
    if (e.target.closest('.cm-stage') && !e.target.closest('.cm-heads,.cm-rail,.cm-zoom,.cm-key') && (S.sel || S.walk >= 0)) { S.walk = -1; select(null); }
  });
  root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-card]')) { e.preventDefault(); select(e.target.dataset.card); } });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !root?.isConnected || document.querySelector('dialog[open]')) return;
    const a = document.activeElement;
    if (a && a !== document.body && !root.contains(a)) return;
    if (a?.closest?.('select,details[open],textarea')) return;
    if (S.walk >= 0) { S.walk = -1; render(); }
    else if (S.sel) select(null);
    else if (scope().kind !== 'system') up();
    else if (document.body.classList.contains('cm-expanded')) root.querySelector('[data-tm="expand"]').click();
    else return;
    e.preventDefault();
  });
  root.addEventListener('pointerleave', () => { root.querySelector('.cm-tip').hidden = true; });
  window.addEventListener('resize', () => { if (!root?.isConnected) return; clearTimeout(bind._r); bind._r = setTimeout(() => { sizeModel(root, 'cm-expanded'); render(); }, 120); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!root?.isConnected || !L) return; clearTimeout(bind._ro); bind._ro = setTimeout(() => { const w = stage.box().w; if (Math.abs(w - (bind._w || 0)) > 24) { bind._w = w; fitPending = true; render(); } }, 90); }).observe(root.querySelector('.cm-stage'));
}
function tip(e) {
  const box = root.querySelector('.cm-tip'), t = e.target.closest?.('.tm-card,.tm-x,.tm-label,.tm-lh');
  if (t?.dataset.entry) { const m = L.markers.find(x => x.entry && x.to === t.dataset.entry && t.style.left === (x.x - 10) + 'px'), id = rowTarget(t.dataset.entry), st = T.elements.get(id)?.protection; if (m && st) { box.innerHTML = `<b>Entry into ${esc(titleOf(id))}</b>${esc(`${m.count} part${m.count === 1 ? '' : 's'} in ${laneInfo(T, m.from).title} reach it across the boundary. ${st.state === 'unexamined' ? 'No threat or control is recorded for it.' : (st.threats.length ? 'Threats: ' + st.threats.map(x => T.threats.get(x)?.ref).join(', ') + '. ' : '') + (st.controls.length ? 'Controls: ' + st.controls.map(x => T.controls.get(x)?.ref).join(', ') + '.' : 'No control covers it.')}`)}<small class="h">Select to see what protects it</small>`; box.hidden = false; placeTip(box, e); return; } }
  if (!t || !root.contains(t)) { box.hidden = true; return; }
  let html = '';
  if (t.dataset.link) { const id = linkFlow(t.dataset.link), f = T.flows.find(x => x.contract === id || x.id === id); html = f ? `<b>${esc(f.ref ? f.ref + ' · ' + f.title : f.title)}</b>${esc(describeFlow(T, f.id))}` : ''; }
  else if (t.dataset.card) { const r = F.rows.find(x => x.id === t.dataset.card); html = `<b>${esc(r.title)}</b>${esc(r.kind === 'region' ? r.members.length + ' parts in ' + r.title : KIND[r.kind] + ' in ' + laneInfo(T, r.region).title)}<small class="h">Double-click to focus on it</small>`; }
  else if (t.dataset.lane) { const ln = laneInfo(T, t.dataset.lane); html = `<b>${esc(ln.title)}</b>${esc(ln.sub || '')}`; }
  if (!html) { box.hidden = true; return; }
  box.innerHTML = html; box.hidden = false; placeTip(box, e);
}

export function threatDebug() { return {S: {...S}, T, F, L, G}; }
