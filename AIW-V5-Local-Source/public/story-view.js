// Chapter 1 Model — Requirements.
//
// Two architecture models of the same requirements, drawn from recorded facts:
// - Journey map: a story map. The journey's steps run across as the backbone, the priority
//   slices (Must, Should, Could) run down, and each requirement stands under the step that needs
//   it, reading what it limits, how it will be accepted, why it matters and — along its foot —
//   the Chapter 4 responsibility that covers it.
// - Context: the system and its boundary, the people who take part in its journey, the outcomes
//   it exists for and who owns them, and the limits on the design beneath.
// Sliced like every chapter model (whole journey → one step, one actor or one outcome), read
// through the Structure, Flow and Reasoning lenses, walked step by step, and edited only through
// Chapter 1's own editors and proposals.
import {storySource, foldStory, foldContext, storyScope, storyInsights, describeStep, describeRequirement, defaultDepth, colInfo, PRIORITIES, OFF, PROPOSED} from './story-model.js';
import {proposals as requirementProposals} from './requirements-domain.js';
import {storyLayout, mapHead, contextLayout, contextHead, SX, CT} from './story-layout.js';
import {modelStage, sizeModel, placeTip} from './model-stage.js';
import {createNotation} from './notation-view.js';
import {projectPreferenceKey, projectURL} from './project-context.js';
import {mountBrainContext} from './brain-context-ui.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const project = () => window.aiwProjectStore?.value?.document || window.aiwCurrentProject;
const page = () => window.aiwRequirementsPage;
const PATHS = {diagram: 'M4 4h6v5H4zM14 4h6v5h-6zM9 15h6v5H9zM7 9v3h10V9M12 12v3', structure: 'M6 3v18M18 3v18M6 8h12M6 16h12', flow: 'M3 12h13m-4-5 5 5-5 5M3 5h6M3 19h6', reasoning: 'M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9M9 7h6M9 17h6', map: 'M3 5h4v4H3zM10 5h4v4h-4zM17 5h4v4h-4zM3 12h4v7H3zM10 12h4v4h-4zM17 12h4v2h-4z', context: 'M7 4h10v16H7zM2 9h3M2 15h3M19 9h3M19 15h3', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', panel: 'M3 4h18v16H3zM15 4v16', explore: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', plus: 'M12 5v14M5 12h14', spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z', mind: 'm3 7 9-4 9 4-9 4-9-4m0 5 9 4 9-4m-18 5 9 4 9-4', edit: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4', dissect: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14M21 21l-5-5M8 11h6', play: 'M7 4v16l13-8z', link: 'M9 15 15 9M8 12l-2 2a3 3 0 0 0 4 4l2-2m4-4 2-2a3 3 0 0 0-4-4l-2 2', layers: 'm12 3 9 5-9 5-9-5 9-5m-9 9 9 5 9-5', person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0'};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[n] || PATHS.map}"/></svg>`;
const LENSES = [
  {id: 'structure', label: 'Structure', like: 'skeleton', q: 'Who owns each requirement, its source, and the scope, constraints and assumptions that limit it.'},
  {id: 'flow', label: 'Flow', like: 'muscles', q: 'How each requirement will be accepted — the starting condition, the action and the observable result — and where the journey goes next.'},
  {id: 'reasoning', label: 'Reasoning', like: 'DNA', q: 'Why each requirement matters: the outcomes it delivers, who owns them, and the quality drivers that refine it.'}
];
const STATE = {confirmed: 'Confirmed', reference: 'Reference', draft: 'Draft'};
const BAND = {Must: 'the journey cannot work without these', Should: 'important, but the journey still works', Could: 'worth having if time allows'};
const TYPE = {requirement: 'Requirement', journey: 'Journey step', actor: 'Actor', stakeholder: 'Stakeholder', outcome: 'Business outcome', scope: 'Scope boundary', constraint: 'Constraint', assumption: 'Assumption'};

let root = null, SM = null, lastDoc = null, cbs = {}, F = null, L = null, fitPending = true, stage = null, lastClick = {id: null, t: 0}, pageSel, lastGhost = '';
let NT = null;
let S = {view: 'map', lens: 'structure', scope: {kind: 'system'}, depth: 'auto', sel: null, panel: true, walk: -1};
// The standard diagram (notation-view.js) and the elements only it draws.
const diagramView = () => S.view === 'diagram';
const drawn = id => diagramView() && !!NT?.diagram()?.nodes.some(n => n.id === id);
const seen = new Set();
const pref = () => projectPreferenceKey('aiw-story-model-v1');
function load() { try { const v = JSON.parse(localStorage.getItem(pref()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
function save() { try { localStorage.setItem(pref(), JSON.stringify({view: S.view, lens: S.lens, scope: S.scope, depth: S.depth, panel: S.panel})); } catch { /* preferences are optional */ } }

// ---------------------------------------------------------------- mount / leave

export function mountChapterModel(selection, callbacks = {}) {
  const p = project(), host = document.querySelector('.r-studio > .r-surface') || document.querySelector('.studio > .stage.tab-content');
  if (!p || !host) return;
  cbs = callbacks;
  if (!root) {
    root = document.createElement('section'); root.className = 'cm sm'; root.setAttribute('aria-label', 'Chapter 1 model: requirements');
    root.innerHTML = shell();
    stage = modelStage(root, {headHeight: () => (S.view === 'diagram' ? 0 : S.view === 'context' ? contextHead() : mapHead()), railWidth: l => l.rail || 0, onHover: tip});
    stage.bind(); bind();
    // The standard diagram shares the stage, the companion and the selection with the chapter's own views.
    NT = createNotation({chapter: 1, root, stage, project, onSelect: id => select(id)});
    NT.onChange = full => { if (full) fitPending = true; render(); };
    NT.bindDrag();
    const v = load();
    for (const k of ['view', 'lens', 'depth']) if (typeof v[k] === 'string') S[k] = v[k];
    if (v.scope && typeof v.scope === 'object') S.scope = v.scope;
    if (typeof v.panel === 'boolean') S.panel = v.panel;
    if (!['diagram', 'map', 'context'].includes(S.view)) S.view = 'map';
    if (!LENSES.some(l => l.id === S.lens)) S.lens = 'structure';
  }
  const first = !SM;
  if (host.firstElementChild !== root) host.prepend(root);
  document.body.classList.add('cm-active', 'am-active');
  if (p !== lastDoc || !SM) { lastDoc = p; rebuild(p); }
  if (first && SM) { S.sel = null; const want = window.aiwChapterModels ? window.aiwChapterModels.takeLink(1) : null; if (known(want)) { S.sel = want; setTimeout(revealSelection, 60); } }
  else if (SM && pageSel !== undefined && selection?.id !== pageSel && known(selection?.id)) { S.sel = selection.id; setTimeout(revealSelection, 60); }
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
  try { SM = storySource(p); } catch (e) { console.error('Requirements model', e); SM = null; return; }
  if (S.sel && !known(S.sel)) S.sel = null;
  if (S.scope?.id && storyScope(SM, S.scope).kind === 'system') S.scope = {kind: 'system'};
}
const knownBase = id => !!id && !!SM && (SM.A.has(id) || (id === PROPOSED && !!proposal()));
const known = id => drawn(id) || knownBase(id);
const ghost = () => { const g = page()?.ghost; return g && g.record ? g : null; };
const newGhost = () => { const g = ghost(); return g && g.mode === 'new' && g.record.type === 'requirement' ? g : null; };
// A proposed scope, constraint or assumption is drawn among the limits in the context.
const limitGhost = () => { const g = ghost(); return g && g.mode === 'new' && ['scope', 'constraint', 'assumption'].includes(g.record.type) ? g : null; };
const proposal = () => newGhost() || limitGhost();
function followGhost() {
  const g = ghost(), key = g ? g.id + ':' + (g.target || '') : '';
  if (key && key !== lastGhost) {
    S.sel = proposal() ? PROPOSED : g.target && known(g.target) ? g.target : S.sel; S.walk = -1;
    // A limit has no place on the journey map: show it where it would stand, in the context.
    if (limitGhost() && S.view !== 'context') { S.view = 'context'; fitPending = true; }
    setTimeout(revealSelection, 80);
  }
  if (!key && S.sel === PROPOSED) S.sel = null;
  lastGhost = key;
}

// ---------------------------------------------------------------- shell

function shell() {
  return `<header class="cm-top"><div class="cm-title"><small>Chapter 1 · Model</small><strong>Requirements</strong></div>
   <nav class="cm-crumbs" aria-label="Where you are"></nav>
   <div class="cm-views" role="group" aria-label="Model"><button type="button" class="cm-view" data-sm="view" data-id="diagram" title="The journey as a process diagram in the standard notation">${icon('diagram')}<span>Diagram</span></button><button type="button" class="cm-view" data-sm="view" data-id="map">${icon('map')}<span>Journey map</span></button><button type="button" class="cm-view" data-sm="view" data-id="context">${icon('context')}<span>Context</span></button></div>
   <div class="cm-actions"><details class="cm-add"><summary class="cm-btn" aria-label="Add to the model">${icon('plus')}<span>Add</span></summary><div class="sm-addmenu"></div></details>
    <button type="button" class="cm-btn" data-sm="explore" title="Chapter 1's own requirements map, with every perspective">${icon('explore')}<span>All perspectives</span></button>
    <button type="button" class="cm-btn icon" data-sm="expand" aria-pressed="false" aria-label="Expand the model" title="Expand">${icon('expand')}</button>
    <button type="button" class="cm-btn icon" data-sm="panel" aria-pressed="true" aria-label="Show the companion panel" title="Companion">${icon('panel')}</button></div></header>
  <div class="cm-bar"><div class="cm-lenses" role="group" aria-label="Lens"></div><div class="cm-depth" role="group" aria-label="Elements"></div><p class="cm-state" role="status" aria-live="polite"></p></div>
  <div class="cm-banner"></div>
  <div class="cm-body"><div class="cm-stage" tabindex="0" aria-label="Requirements canvas. Drag or scroll to move; Ctrl or Command and scroll to zoom.">
    <div class="cm-world"><svg class="cm-svg" aria-hidden="true"></svg><div class="cm-html"></div></div>
    <div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div>
    <div class="cm-key cm-min"><button type="button" class="cm-kt" data-sm="key" aria-expanded="false">Key</button><div class="cm-legend"></div></div>
    <div class="cm-zoom"><button type="button" data-sm="zout" aria-label="Zoom out">−</button><button type="button" data-sm="zin" aria-label="Zoom in">+</button><button type="button" data-sm="fit" aria-label="Fit the width">${icon('fit')}</button></div>
  </div><aside class="cm-panel" aria-label="Companion"></aside></div>
  <footer class="cm-walk" aria-label="Walk the journey"></footer><div class="cm-tip" role="tooltip" hidden></div>`;
}

// ---------------------------------------------------------------- render

const A = id => SM.A.get(id);
const R = id => SM.R.get(id);
const stepOf = id => SM.steps.find(s => s.id === id);
const titleOf = id => A(id)?.title || (id === PROPOSED ? proposal()?.record.title : '') || id;
const refTitle = id => (A(id) ? id + ' ' + A(id).title : titleOf(id));
const stateOf = a => (a.confirmed ? 'confirmed' : a.origin === 'reference' ? 'reference' : 'draft');
function scope() { return storyScope(SM, S.scope); }
function depth() { return S.depth === 'auto' ? defaultDepth(SM) : S.depth; }
const ctxView = () => S.view === 'context';
function measure(l) { return Math.max(90, 24 + 6.4 * String(l.label || '').length); }

function render() {
  if (!root) return;
  if (!SM) { root.querySelector('.cm-html').innerHTML = '<p class="cm-empty">The requirements model could not be prepared for this project.</p>'; return; }
  root.classList.remove('cm-lens-structure', 'cm-lens-flow', 'cm-lens-reasoning');
  root.classList.add('cm-lens-' + S.lens);
  root.classList.toggle('sm-context', ctxView());
  root.classList.toggle('sm-walking', S.walk >= 0);
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
  root.querySelector('[data-sm="panel"]').setAttribute('aria-pressed', String(S.panel));
  // Geometry depends on the records, the scope, the depth and an unsaved proposal — never the lens.
  if (ctxView()) { F = foldContext(SM, scope(), {ghost: ghost()}); L = contextLayout(F, {measure}); }
  else { F = foldStory(SM, scope(), depth(), {ghost: ghost()}); L = storyLayout(F); }
  const world = root.querySelector('.cm-world'), svg = root.querySelector('.cm-svg');
  world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
  svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
  svg.style.width = L.W + 'px'; svg.style.height = L.H + 'px';
  const hl = highlight();
  const empty = ctxView() ? !F.rows.length : !F.cards.length && !F.cols.length;
  if (empty) { svg.innerHTML = ''; root.querySelector('.cm-html').innerHTML = emptyHTML(); root.querySelector('.cm-heads-in').innerHTML = ''; root.querySelector('.cm-rail-in').innerHTML = ''; }
  else if (ctxView()) { svg.innerHTML = defs() + contextSVG(hl); root.querySelector('.cm-html').innerHTML = contextHTML(hl); contextHeads(hl); root.querySelector('.cm-rail-in').innerHTML = ''; }
  else { svg.innerHTML = mapSVG(hl); root.querySelector('.cm-html').innerHTML = mapHTML(hl); mapHeads(hl); mapRail(hl); }
  chrome(); panel(); walkBar();
  stage.use(L, JSON.stringify([S.view, S.scope?.kind || 'system', S.scope?.id || '', depth()]));
  if (fitPending) { fitPending = false; stage.fit(); } else stage.clamp();
  stage.apply();
}
function emptyHTML() {
  return `<div class="sm-empty" style="left:${(L.rail || 0) + 30}px;top:${(ctxView() ? contextHead() : mapHead()) + 24}px"><b>No journey or requirement yet</b><p>The journey is the backbone of the requirements: add the steps people go through, then the requirements each step needs and the outcomes they deliver.</p><div><button type="button" class="cm-btn primary" data-sm="add" data-type="journey">${icon('plus')}New journey step</button><button type="button" class="cm-btn" data-sm="add" data-type="requirement">${icon('plus')}New requirement</button>${SM.proposals.filter(q => q.mode === 'new').map(q => `<button type="button" class="cm-btn gold" data-r-proposal="${esc(q.id)}">${esc(q.label)}</button>`).join('')}</div></div>`;
}

// What an object concerns, in the terms of the drawn model.
function concerns(id) {
  const out = {reqs: new Set(), steps: new Set(), ids: new Set([id]), bands: new Set()};
  const a = A(id);
  if (!a) { if (id === PROPOSED) { out.ids.add(PROPOSED); const g = proposal(); for (const [f, , t] of g?.links || []) { out.ids.add(f); out.ids.add(t); } } return out; }
  if (a.type === 'requirement') { const q = R(id); out.reqs.add(id); q.steps.forEach(s => out.steps.add(s)); [...q.outcomes, ...q.constraints, ...q.assumptions, ...q.scope].forEach(x => out.ids.add(x)); q.steps.forEach(s => stepOf(s).actors.forEach(x => out.ids.add(x))); q.outcomes.forEach(o => SM.outcomes.get(o)?.owners.forEach(x => out.ids.add(x))); }
  else if (a.type === 'journey') { const s = stepOf(id); out.steps.add(id); s.reqs.forEach(q => out.reqs.add(q)); s.actors.forEach(x => out.ids.add(x)); s.reqs.forEach(q => R(q).outcomes.forEach(o => out.ids.add(o))); }
  else if (a.type === 'actor') { SM.actors.get(id).steps.forEach(s => { out.steps.add(s); out.ids.add(s); stepOf(s).reqs.forEach(q => out.reqs.add(q)); }); }
  else if (a.type === 'outcome') { const o = SM.outcomes.get(id); o.reqs.forEach(q => { out.reqs.add(q); R(q)?.steps.forEach(s => { out.steps.add(s); out.ids.add(s); }); }); o.owners.forEach(x => out.ids.add(x)); }
  else if (a.type === 'stakeholder') { SM.stakeholders.get(id).outcomes.forEach(o => { out.ids.add(o); SM.outcomes.get(o)?.reqs.forEach(q => out.reqs.add(q)); }); }
  else { const x = SM.limits.get(id); x?.reqs.forEach(q => out.reqs.add(q)); x?.steps.forEach(s => { out.steps.add(s); out.ids.add(s); }); }
  if (PRIORITIES.includes(id)) out.bands.add(id);
  for (const q of out.reqs) out.ids.add(q);
  return out;
}
function highlight() {
  const out = {on: false, ids: new Set(), reqs: new Set(), steps: new Set(), now: null, links: new Set()};
  if (S.walk >= 0) { const s = SM.steps[S.walk]; if (s) { out.on = true; out.now = s.id; const c = concerns(s.id); out.ids = c.ids; out.reqs = c.reqs; out.steps = c.steps; } }
  else if (S.sel) { const c = concerns(S.sel); out.on = true; out.ids = c.ids; out.reqs = c.reqs; out.steps = c.steps; }
  if (out.on && ctxView()) for (const r of L.routes || []) if (out.ids.has(r.link.from) && out.ids.has(r.link.to)) out.links.add(r.id);
  return out;
}
const lit = (hl, id) => (hl.on ? (hl.ids.has(id) || hl.reqs.has(id) ? ' lit' : ' dim') : '');

// ---------------------------------------------------------------- journey map

function mapSVG(hl) {
  const out = [];
  L.bands.forEach((b, i) => out.push(`<rect class="sm-band ${b.id.toLowerCase()}${i % 2 ? ' odd' : ''}" x="${L.rail}" y="${b.y}" width="${L.W - L.rail - 6}" height="${b.h}"/>`));
  for (const c of L.cols) out.push(`<rect class="sm-col${c.kind === 'off' ? ' off' : ''}${hl.steps.has(c.step) ? ' lit' : ''}" x="${c.x}" y="${L.top - 4}" width="${c.w}" height="${L.H - L.top - 8}" rx="10"/>`);
  return out.join('');
}
const chip = (id, cls = '') => { const a = A(id); return a ? `<i class="sm-x k-${a.type}${cls}${a.type === 'assumption' && !a.confirmed ? ' open' : ''}" data-sel="${esc(id)}" title="${esc(TYPE[a.type] + ' · ' + id + ' ' + a.title + (a.type === 'assumption' && !a.confirmed ? ' — not yet confirmed' : ''))}">${esc(a.type === 'outcome' || a.type === 'actor' ? a.title : id)}</i>` : ''; };
function reqCard(c, hl) {
  const q = R(c.id), st = stateOf(q), g = ghost(), edited = g && g.mode === 'edit' && g.target === q.id ? g.record : null, pos = `style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"`;
  const also = q.steps.length > 1 ? `<i class="sm-tag" title="${esc('Needed at ' + q.steps.map(s => stepOf(s).num + ' ' + stepOf(s).title).join(', '))}">steps ${esc(q.steps.map(s => stepOf(s).num).join(' · '))}</i>` : q.offJourney ? '<i class="sm-tag off">no step</i>' : '';
  const limits = [...q.scope, ...q.constraints, ...q.assumptions].map(x => chip(x)).join('');
  const st1 = `<span class="sm-l1"><span class="sm-who">${q.owner ? esc(q.owner) : '<em class="miss">no owner</em>'}</span><em class="sm-src" title="${esc(q.source)}">${esc(q.source || 'no source')}</em></span><span class="sm-l2">${limits || '<em>nothing limits it</em>'}</span>`;
  const acc = edited ? `<span class="sm-acc proposed" title="${esc('Proposed: ' + edited.acceptance)}"><i class="sm-pro">proposed</i>${esc(edited.acceptance)}</span>` : q.testable ? `<span class="sm-acc" title="${esc(q.acceptance)}">${esc(q.acceptance)}</span>` : `<span class="sm-acc miss" title="${esc(q.acceptance || 'No acceptance recorded')}"><b>cannot be tested yet</b> ${esc(q.acceptance)}</span>`;
  const owners = [...new Set(q.outcomes.flatMap(o => SM.outcomes.get(o)?.owners || []))];
  const rs = `<span class="sm-l1">${q.outcomes.map(o => chip(o)).join('') || '<em class="miss">delivers no outcome</em>'}</span><span class="sm-l2">${owners.map(o => chip(o)).join('')}${q.drivers.length ? `<i class="sm-q" title="${esc(q.drivers.join(', '))}">${q.drivers.length} quality driver${q.drivers.length === 1 ? '' : 's'}</i>` : '<em>no quality driver</em>'}</span>`;
  const strip = `<div class="sm-strip"><small>covered by</small>${q.covers.map(r => `<i class="sm-lr" title="${esc('Chapter 4 · ' + r.ref + ' ' + r.title)}"><b>${esc(r.ref)}</b>${esc(r.title)}</i>`).join('') || '<em class="miss">no Chapter 4 responsibility</em>'}</div>`;
  return `<div class="sm-card req${edited ? ' ghosted' : ''}${c.card.subject ? ' subject' : ''}${S.sel === q.id ? ' sel' : ''}${lit(hl, q.id)}" data-card="${esc(q.id)}" ${pos} tabindex="0" role="button" aria-label="${esc('Requirement ' + q.id + ' ' + q.title)}"><small><b class="sm-ref">${esc(q.id)}</b>${also}${q.ambiguous ? '<i class="sm-tag warn" title="Uses wording that cannot be observed">vague</i>' : ''}<i class="sm-st ${st}">${STATE[st]}</i></small><b class="sm-t">${esc(edited ? edited.title : q.title)}</b><div class="sm-lens"><div class="st">${st1}</div><div class="fl">${acc}</div><div class="rs">${rs}</div></div>${strip}</div>`;
}
function mapHTML(hl) {
  const out = [];
  for (const c of L.cards) {
    const k = c.card, pos = `style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"`;
    if (k.kind === 'req') { out.push(reqCard(c, hl)); continue; }
    if (k.kind === 'hole') {
      const s = stepOf(k.step);
      out.push(`<div class="sm-card hole${S.sel === s.id ? ' sel' : ''}${hl.on ? (hl.steps.has(s.id) ? ' lit' : ' dim') : ''}" data-card="${esc(k.id)}" ${pos} tabindex="0" role="button" aria-label="${esc('Step ' + s.num + ' ' + s.title + ' has no requirement')}"><small>Step ${esc(s.num)} · no requirement yet</small><b class="sm-t">${esc(s.title)}</b><div class="sm-lens"><p>${esc(s.description || 'What must the design do at this step?')}</p></div><div class="sm-strip"><button type="button" class="cm-mini gold" data-sm="add-for-step" data-step="${esc(s.id)}">Add a requirement for this step</button></div></div>`);
      continue;
    }
    if (k.kind === 'proposed') {
      const g = newGhost();
      out.push(`<div class="sm-card proposed${S.sel === PROPOSED ? ' sel' : ''}${lit(hl, PROPOSED)}" data-card="${PROPOSED}" ${pos} tabindex="0" role="button" aria-label="${esc('Proposal, not saved: ' + k.title)}"><small>Proposal · not saved · ${esc(g?.record.priority || '')}</small><b class="sm-t">${esc(k.title)}</b><div class="sm-lens"><div class="st"><span class="sm-l1"><span class="sm-who">${esc(g?.record.owner || '')}</span></span><span class="sm-l2"><button type="button" class="cm-mini gold" data-r-action="edit-ghost">Review &amp; edit</button></span></div><div class="fl"><span class="sm-acc">${esc(g?.record.acceptance || '')}</span></div><div class="rs"><span class="sm-l1">${k.outcomes.map(o => chip(o)).join('') || '<em>outcome on review</em>'}</span><span class="sm-l2"><button type="button" class="cm-mini gold" data-r-action="edit-ghost">Review &amp; edit</button></span></div></div><div class="sm-strip"><small>covered by</small><em>planned in Chapter 4</em></div></div>`);
      continue;
    }
    const qs = k.members.map(R), s = k.col === OFF ? null : SM.steps[Number(k.col.slice(2))], open = qs.filter(q => !q.testable).length, uncovered = qs.filter(q => !q.covers.length).length;
    out.push(`<div class="sm-card cell${hl.on ? (qs.some(q => hl.reqs.has(q.id)) ? ' lit' : ' dim') : ''}" data-card="${esc(k.id)}" ${pos} tabindex="0" role="button" aria-label="${esc(k.band + ' requirements at ' + (s ? s.title : 'no step'))}"><small><span>${esc(k.band)} · ${qs.length} requirement${qs.length === 1 ? '' : 's'}</span></small><b class="sm-t">${esc(s ? s.title : 'Not on the journey')}</b><div class="sm-lens"><div class="st"><span class="sm-l1">${qs.map(q => `<i class="sm-x k-requirement" data-sel="${esc(q.id)}" title="${esc(q.id + ' ' + q.title)}">${esc(q.id)}</i>`).join('')}</span><span class="sm-l2"><em>${esc(qs.map(q => q.title).join(', '))}</em></span></div><div class="fl"><span class="sm-l1">${open ? `<em class="miss">${open} cannot be tested yet</em>` : '<em>every acceptance can be tested</em>'}</span></div><div class="rs"><span class="sm-l1">${[...new Set(qs.flatMap(q => q.outcomes))].map(o => chip(o)).join('') || '<em class="miss">no outcome</em>'}</span></div></div><div class="sm-strip"><small>covered by</small><em${uncovered ? ' class="miss"' : ''}>${qs.length - uncovered} of ${qs.length} by Chapter 4</em></div></div>`);
  }
  return out.join('');
}
function mapHeads(hl) {
  const box = root.querySelector('.cm-heads-in'), out = [], walking = S.walk >= 0;
  L.cols.forEach((c, i) => {
    const s = c.step ? stepOf(c.step) : null, w = walking ? (hl.now === c.step ? ' now' : seen.has(c.step) ? ' done' : '') : '';
    const cls = `sm-sh ${c.kind}${c.hole ? ' hole' : ''}${w}${!walking && S.sel === c.step ? ' sel' : !walking && hl.steps.has(c.step) ? ' lit' : ''}`;
    const actors = s ? s.actors.map(a => `<i class="sm-actor" data-sel="${esc(a)}" title="${esc(A(a).title + ' takes part')}">${icon('person')}${esc(A(a).title)}</i>`).join('') || '<em>no person takes part</em>' : '';
    out.push(`<button type="button" class="${cls}" data-lane="${esc(s ? s.id : 'off')}" style="left:${c.x}px;width:${c.w}px;top:8px;height:${SX.HEAD_H - 8}px"><small>${s ? 'Step ' + esc(c.num) + ' · ' + esc(s.id) : 'Not on the journey'}</small><b>${esc(c.title)}</b><span class="sm-actors">${actors}</span></button>`);
    const n = L.cols[i + 1];
    if (s && n && n.step === s.next) out.push(`<span class="sm-next${s.linkedNext ? '' : ' broken'}" style="left:${c.x + c.w}px;top:${8 + (SX.HEAD_H - 8) / 2 - 9}px;width:${SX.GAP}px" title="${esc(s.linkedNext ? s.title + ' precedes ' + n.title : 'No “precedes” relationship records that ' + n.title + ' follows ' + s.title)}">${s.linkedNext ? '›' : '⋯'}</span>`);
  });
  box.innerHTML = out.join('');
  box.style.width = L.W + 'px';
}
function mapRail() {
  const box = root.querySelector('.cm-rail-in');
  box.innerHTML = L.bands.map(b => { const n = F.cards.filter(c => c.band === b.id && c.kind !== 'hole').reduce((k, c) => k + (c.kind === 'cell' ? c.members.length : 1), 0); return `<div class="sm-bt ${b.id.toLowerCase()}" style="top:${b.y + 4}px;height:${b.h - 8}px" title="${esc(b.id + ' — ' + BAND[b.id])}"><b>${esc(b.id)}</b><small>${n} requirement${n === 1 ? '' : 's'}</small><span>${esc(BAND[b.id])}</span></div>`; }).join('');
  box.style.height = L.H + 'px'; box.style.width = L.rail + 'px';
}

// ---------------------------------------------------------------- context

function defs() {
  const m = (id, fill) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1 9 5 1 9z" style="fill:${fill};stroke:none"/></marker>`;
  return `<defs>${m('sm-a-d', '#527343')}${m('sm-a-p', '#8a9486')}${m('sm-a-o', '#886a32')}${m('sm-a-h', '#a8741f')}${m('sm-a-m', '#c3cbbd')}</defs>`;
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
function contextSVG(hl) {
  const out = [];
  for (const ln of L.lanes) out.push(`<rect class="sm-lane ${ln.id}" x="${ln.x}" y="${L.top - 6}" width="${ln.w}" height="${L.lanesH - L.top - 4}" rx="${ln.id === 'system' ? 16 : 12}"/>`);
  const order = L.routes.map(r => ({r, on: hl.links.has(r.id)})).sort((a, b) => a.on - b.on);
  for (const {r, on} of order) out.push(`<path class="sm-route ${r.link.kind}${on ? ' lit' : hl.on ? ' dim' : ''}" d="${roundPath(r.pts)}" marker-end="url(#sm-a-${on ? 'h' : hl.on ? 'm' : r.link.kind === 'delivers' ? 'd' : r.link.kind === 'owns' ? 'o' : 'p'})"/>`);
  if (L.notesY != null) out.push(`<line class="sm-rule" x1="12" x2="${L.W - 12}" y1="${L.notesY}" y2="${L.notesY}"/>`);
  return out.join('');
}
function contextCard(c, hl) {
  const a = A(c.id), pos = `style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"`, st = stateOf(a);
  let head = '', st1 = '', fl = '', rs = '';
  if (a.type === 'journey') {
    const s = stepOf(a.id), outs = [...new Set(s.reqs.flatMap(q => R(q).outcomes))];
    head = `Step ${s.num} · ${s.id}`;
    st1 = s.reqs.length ? `${s.reqs.length} requirement${s.reqs.length === 1 ? '' : 's'} · ${s.actors.length ? s.actors.length + ' taking part' : 'no person'}` : '<em class="miss">no requirement</em>';
    fl = s.next ? `next: ${esc(SM.steps[s.index + 1].num)} ${esc(SM.steps[s.index + 1].title)}${s.linkedNext ? '' : ' <em class="miss">order not recorded</em>'}` : '<em>the journey ends here</em>';
    rs = outs.map(o => chip(o)).join('') || '<em class="miss">delivers no outcome</em>';
  } else if (a.type === 'actor') {
    const x = SM.actors.get(a.id);
    head = 'Person · ' + a.id; st1 = x.steps.length ? `takes part in ${x.steps.length} step${x.steps.length === 1 ? '' : 's'}` : '<em class="miss">takes part in no step</em>';
    fl = x.steps.map(s => `<i class="sm-x k-journey" data-sel="${esc(s)}">${esc(stepOf(s).num)}</i>`).join('') || '—'; rs = `<em>${esc(a.description)}</em>`;
  } else if (a.type === 'outcome') {
    const o = SM.outcomes.get(a.id);
    head = 'Outcome · ' + a.id; st1 = o.owners.map(x => chip(x)).join('') || '<em class="miss">no owner</em>';
    fl = `<em>reached at ${[...new Set(o.reqs.flatMap(q => R(q)?.steps || []))].map(s => stepOf(s).num).join(', ') || 'no step'}</em>`;
    rs = o.reqs.length ? `${o.reqs.length} requirement${o.reqs.length === 1 ? '' : 's'} deliver it` : '<em class="miss">nothing delivers it</em>';
  } else {
    const x = SM.stakeholders.get(a.id);
    head = 'Stakeholder · ' + a.id; st1 = x.outcomes.map(o => chip(o)).join('') || '<em class="miss">owns no outcome</em>'; fl = '<em>—</em>'; rs = `<em>${esc(a.description)}</em>`;
  }
  return `<div class="sm-card ctx k-${a.type}${S.sel === a.id ? ' sel' : ''}${hl.on ? (hl.ids.has(a.id) ? ' lit' : ' dim') : ''}" data-card="${esc(a.id)}" ${pos} tabindex="0" role="button" aria-label="${esc(TYPE[a.type] + ' ' + a.id + ' ' + a.title)}"><small><span>${esc(head)}</span><i class="sm-st ${st}">${STATE[st]}</i></small><b class="sm-t">${a.type === 'actor' ? icon('person') : ''}${esc(a.title)}</b><div class="sm-lens one"><span class="st">${st1}</span><span class="fl">${fl}</span><span class="rs">${rs}</span></div></div>`;
}
function contextHTML(hl) {
  const out = L.cards.map(c => contextCard(c, hl));
  for (const lb of L.labels) {
    const l = lb.link, on = hl.links.has(l.id);
    out.push(`<button type="button" class="sm-label${on ? ' lit' : hl.on ? ' dim' : ''}${lb.compact ? ' compact' : ''}" data-link="${esc(l.id)}" style="left:${lb.x}px;top:${lb.y}px;width:${lb.w}px;height:${lb.h}px" title="${esc(l.refs.map(q => q + ' ' + R(q).title).join(' · '))}">${l.refs.map(q => `<i class="sm-x k-requirement" data-sel="${esc(q)}">${esc(q)}</i>`).join('')}</button>`);
  }
  if (L.notesY != null) out.push(`<div class="sm-notes-h" style="left:12px;top:${L.notesY + 6}px">What limits the design</div>`);
  for (const n of L.notes) {
    if (n.note.proposed) {
      const g = limitGhost(), kind = n.note.kind, head = kind === 'out' ? 'Out of scope' : kind === 'in' ? 'In scope' : TYPE[g?.record.type] || 'Limit';
      const touches = n.note.touches.map(id => `<i class="sm-x k-${A(id).type}" data-sel="${esc(id)}">${esc(A(id).type === 'journey' ? stepOf(id).num + ' ' + A(id).title : id)}</i>`).join('');
      out.push(`<div class="sm-note n-${kind} proposed${S.sel === PROPOSED ? ' sel' : ''}${lit(hl, PROPOSED)}" data-card="${PROPOSED}" style="left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px" tabindex="0" role="button" aria-label="${esc('Proposal, not saved: ' + n.note.title)}"><small>Proposal · not saved · ${esc(head)}</small><b>${esc(n.note.title)}</b><span>${touches || '<em>touches nothing yet</em>'}<button type="button" class="cm-mini gold" data-r-action="edit-ghost">Review &amp; edit</button></span></div>`);
      continue;
    }
    const x = SM.limits.get(n.id), kind = n.note.kind, head = kind === 'out' ? 'Out of scope' : kind === 'in' ? 'In scope' : TYPE[x.type];
    const touches = [...x.reqs, ...x.steps].map(id => `<i class="sm-x k-${A(id).type}" data-sel="${esc(id)}">${esc(A(id).type === 'journey' ? stepOf(id).num + ' ' + A(id).title : id)}</i>`).join('');
    out.push(`<div class="sm-note n-${kind}${S.sel === x.id ? ' sel' : ''}${hl.on ? (hl.ids.has(x.id) ? ' lit' : ' dim') : ''}${x.type === 'assumption' && !x.confirmed ? ' open' : ''}" data-card="${esc(x.id)}" style="left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px" tabindex="0" role="button"><small>${esc(head)} · ${esc(x.id)}${x.type === 'assumption' ? (x.confirmed ? '' : ' · not confirmed') : ''}</small><b>${esc(x.title)}</b><span>${touches || (kind === 'out' ? '<em>nothing in the design touches it</em>' : '<em>touches no requirement</em>')}</span></div>`);
  }
  return out.join('');
}
function contextHeads() {
  const box = root.querySelector('.cm-heads-in'), inScope = [...SM.limits.values()].filter(x => x.type === 'scope' && x.scopeMode !== 'out');
  const T = {people: ['People', 'who takes part in the journey'], system: [SM.name || 'The system', inScope.length ? 'in scope: ' + inScope.map(x => x.title).join('; ') : 'the journey it runs'], why: ['Outcomes', 'why the system exists'], owners: ['Owners', 'who answers for each outcome']};
  box.innerHTML = L.lanes.map(ln => `<div class="sm-lh ${ln.id}" style="left:${ln.x + 4}px;width:${ln.w - 8}px;top:8px;height:${CT.HEAD_H - 8}px"><small>${ln.id === 'system' ? 'The system · its boundary' : esc(T[ln.id][0])}</small><b>${esc(ln.id === 'system' ? T.system[0] : T[ln.id][0])}</b><span>${esc(T[ln.id][1])}</span></div>`).join('');
  box.style.width = L.W + 'px';
}

// ---------------------------------------------------------------- chrome

function crumbs() {
  const sc = scope(), parts = [`<button type="button" data-sm="scope" data-kind="system" class="${sc.kind === 'system' ? 'here' : ''}">Whole journey</button>`];
  if (sc.kind !== 'system') parts.push('<span>›</span>', `<button type="button" class="here" data-sm="noop">${esc({step: 'Step ', actor: '', outcome: ''}[sc.kind] + (sc.kind === 'step' ? stepOf(sc.id).num + ' ' : '') + titleOf(sc.id))}</button>`);
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
  root.querySelector('.cm-lenses').innerHTML = LENSES.map(l => `<button type="button" class="cm-lens" data-sm="lens" data-id="${l.id}" aria-pressed="${S.lens === l.id}" title="${esc(l.q + ' Like the ' + l.like + '.')}">${icon(l.id)}<span>${l.label}</span></button>`).join('');
  const dp = depth();
  root.querySelector('.cm-depth').innerHTML = !ctxView() && sc.kind === 'system' ? `<span>Elements</span>${[['steps', 'Steps'], ['requirements', 'Requirements']].map(([id, t]) => `<button type="button" class="cm-dep" data-sm="depth" data-id="${id}" aria-pressed="${dp === id}">${t}</button>`).join('')}` : '';
  const qs = [...SM.R.values()], holes = SM.steps.filter(s => s.hole).length, open = qs.filter(q => !q.testable).length, slices = PRIORITIES.filter(p => qs.some(q => q.priority === p));
  root.querySelector('.cm-state').textContent = ctxView()
    ? `${SM.actors.size} ${SM.actors.size === 1 ? 'person' : 'people'} · ${SM.steps.length} journey steps · ${SM.outcomes.size} outcome${SM.outcomes.size === 1 ? '' : 's'} · ${SM.stakeholders.size} owner${SM.stakeholders.size === 1 ? '' : 's'} · ${SM.limits.size} limit${SM.limits.size === 1 ? '' : 's'} on the design`
    : `${qs.length} requirement${qs.length === 1 ? '' : 's'} over ${SM.steps.length} step${SM.steps.length === 1 ? '' : 's'} · ${holes} step${holes === 1 ? '' : 's'} without one · ${open} not testable · ${slices.join(' / ') || 'no slice'}`;
  const g = ghost();
  root.querySelector('.cm-banner').innerHTML = g ? `<section class="dp-banner"><span class="ip-kicker">${esc(TYPE[g.record.type] || 'Record')} proposal · not saved</span><b>${esc(g.record.title)}</b><small>${esc(g.reason || g.label || '')}</small><button type="button" class="cm-btn gold" data-r-action="edit-ghost">Review &amp; edit</button><button type="button" class="cm-btn" data-r-action="dismiss-ghost">Dismiss</button></section>` : '';
  const sel = S.sel && A(S.sel) ? A(S.sel) : null;
  root.querySelector('.sm-addmenu').innerHTML = `${['requirement', 'journey', 'outcome', 'actor', 'stakeholder', 'constraint', 'assumption', 'scope'].map(t => `<button type="button" data-sm="add" data-type="${t}">New ${esc(TYPE[t].toLowerCase())}</button>`).join('')}<button type="button" data-sm="link" data-from="${esc(sel?.id || '')}">${sel ? 'Connect ' + esc(sel.id) + ' to…' : 'Connect two records'}</button>`;
  root.querySelector('.cm-legend').innerHTML = ctxView()
    ? `<p><span class="k-boundary"></span>The system's boundary</p><p><svg width="40" height="10"><line x1="2" y1="5" x2="32" y2="5" stroke="#8a9486" stroke-width="1.4" marker-end="url(#sm-a-p)"/></svg>Takes part in</p><p><svg width="40" height="10"><line x1="2" y1="5" x2="32" y2="5" stroke="#527343" stroke-width="1.8" marker-end="url(#sm-a-d)"/></svg>Delivers, through the requirements named</p><p><svg width="40" height="10"><line x1="2" y1="5" x2="32" y2="5" stroke="#886a32" stroke-width="1.4" stroke-dasharray="5 3" marker-end="url(#sm-a-o)"/></svg>Owns</p><p><span class="k-note"></span>A limit on the design</p>`
    : `<p><span class="k-card"></span>Requirement, under the step that needs it</p><p><span class="k-band"></span>Priority slice</p><p><i class="sm-lr k"><b>LR</b>responsibility</i> covers it (Chapter 4)</p><p><span class="k-hole"></span>Journey step with no requirement</p><p><b class="sm-next k">⋯</b>Journey order not recorded</p>`;
}

// ---------------------------------------------------------------- companion

const act = (k, attrs, label, cls = '') => `<button type="button" class="cm-btn ${cls}" data-sm="${k}" ${attrs}>${label}</button>`;
const link = id => `<button type="button" class="cm-link" data-sel="${esc(id)}">${esc(refTitle(id))}</button>`;
const brain = () => `<button type="button" class="cm-btn" data-brain-launch="design">${icon('spark')}Ask Sol</button>`;
function proposeFor(id) {
  // The chapter's proposals for this record: those it targets or links to.
  let ps = [];
  try { ps = requirementProposals(project(), A(id), 'model'); } catch { ps = []; }
  const g = ghost();
  return ps.filter(q => q.target === id || (q.links || []).some(([f, , t]) => f === id || t === id) || q.id === 'context-evidence').filter(q => g?.id !== q.id).map(q => `<button type="button" class="cm-btn gold" data-r-proposal="${esc(q.id)}" data-focus="${esc(id)}">${esc(q.label)}</button>`).join('');
}
function specimenRequirement(id) {
  const q = R(id), st = stateOf(q), owners = [...new Set(q.outcomes.flatMap(o => SM.outcomes.get(o)?.owners || []))];
  return `<section class="cm-spec"><h4>Requirement · ${esc(q.id)}<span class="${st === 'confirmed' ? 'guarded' : ''}">${STATE[st]}</span></h4><p class="cm-spec-t"><b>${esc(q.title)}</b></p>${q.description ? `<p>${esc(q.description)}</p>` : ''}<dl class="cm-dl"><div><dt>Priority</dt><dd>${esc(q.priority)}</dd></div><div class="${q.steps.length ? '' : 'miss'}"><dt>Needed at</dt><dd>${q.steps.map(link).join('') || 'No journey step'}</dd></div><div class="${q.testable ? '' : 'miss'}"><dt>Accepted when</dt><dd>${esc(q.acceptance || 'Not recorded')}${q.testable ? '' : '<br><b>Cannot be tested yet</b>: name the starting condition, the action and the observable result.'}</dd></div><div class="${q.outcomes.length ? '' : 'miss'}"><dt>Delivers</dt><dd>${q.outcomes.map(link).join('') || 'No outcome'}</dd></div>${owners.length ? `<div><dt>Owned by</dt><dd>${owners.map(link).join('')}</dd></div>` : ''}${[...q.scope, ...q.constraints, ...q.assumptions].length ? `<div><dt>Limited by</dt><dd>${[...q.scope, ...q.constraints, ...q.assumptions].map(x => `<button type="button" class="cm-link" data-sel="${esc(x)}">${esc(refTitle(x))}${A(x).type === 'assumption' && !A(x).confirmed ? '<em> · not confirmed</em>' : ''}</button>`).join('')}</dd></div>` : ''}<div><dt>Quality</dt><dd>${esc(q.drivers.join(', ') || 'No quality driver refines it')}</dd></div><div class="${q.covers.length ? '' : 'miss'}"><dt>Covered by</dt><dd>${q.covers.map(r => `<a class="cm-link" href="${esc(projectURL('/?chapter=4&tab=model&object=' + encodeURIComponent(r.id)))}">${esc(r.ref + ' ' + r.title)} <small>Chapter 4</small></a>`).join('') || 'No Chapter 4 responsibility'}</dd></div><div class="${q.accountable ? '' : 'miss'}"><dt>Owner</dt><dd>${esc(q.owner || 'Not named')}${q.source ? `<small class="sm-srcl">${esc(q.source)}</small>` : ''}</dd></div></dl>
  <div class="cm-acts">${act('edit', `data-id="${esc(id)}"`, icon('edit') + 'Edit requirement', 'primary')}${act('link', `data-from="${esc(id)}" data-kind="delivers"`, icon('link') + 'Connect')}${proposeFor(id)}${q.steps.length ? `<button type="button" class="cm-btn" data-sm="dissect" data-id="${esc(q.steps[0])}">${icon('dissect')}Focus on its step</button>` : ''}${q.covers.length ? `<a class="cm-btn" href="${esc(projectURL('/?chapter=4&tab=model&object=' + encodeURIComponent(q.covers[0].id)))}">${icon('layers')}Its responsibility</a>` : ''}${brain()}<button type="button" class="cm-btn" data-brain-launch="mind">${icon('mind')}Mind Factory</button></div></section>`;
}
function specimenStep(id) {
  const s = stepOf(id), st = stateOf(s);
  return `<section class="cm-spec"><h4>Journey step · ${esc(s.num)}${s.hole ? '<span class="exposed">No requirement</span>' : `<span>${STATE[st]}</span>`}</h4><p class="cm-spec-t"><b>${esc(s.title)}</b></p>${s.description ? `<p>${esc(s.description)}</p>` : ''}<dl class="cm-dl"><div><dt>Taking part</dt><dd>${s.actors.map(link).join('') || '<em>No person — the system acts alone</em>'}</dd></div><div class="${s.reqs.length ? '' : 'miss'}"><dt>Needs</dt><dd>${s.reqs.map(link).join('') || 'No requirement'}</dd></div><div><dt>Delivers</dt><dd>${[...new Set(s.reqs.flatMap(q => R(q).outcomes))].map(link).join('') || '<em>No outcome</em>'}</dd></div><div class="${!s.next || s.linkedNext ? '' : 'miss'}"><dt>Next</dt><dd>${s.next ? esc(SM.steps[s.index + 1].num + ' ' + SM.steps[s.index + 1].title) + (s.linkedNext ? '' : ' — order not recorded') : 'The journey ends here'}</dd></div></dl>
  <div class="cm-acts">${act('add-for-step', `data-step="${esc(id)}"`, icon('plus') + 'Add a requirement for it', 'primary')}${act('edit', `data-id="${esc(id)}"`, icon('edit') + 'Edit step')}${s.next && !s.linkedNext ? act('link', `data-from="${esc(id)}" data-kind="precedes" data-to="${esc(s.next)}"`, 'Record the order') : ''}${proposeFor(id)}<button type="button" class="cm-btn" data-sm="dissect" data-id="${esc(id)}">${icon('dissect')}Focus on this step</button>${brain()}</div></section>`;
}
function specimenOther(id) {
  const a = A(id), st = stateOf(a);
  let rows = '', focus = '';
  if (a.type === 'actor') { const x = SM.actors.get(id); rows = `<div class="${x.steps.length ? '' : 'miss'}"><dt>Takes part in</dt><dd>${x.steps.map(link).join('') || 'No step'}</dd></div>`; focus = x.steps.length ? `<button type="button" class="cm-btn" data-sm="dissect" data-id="${esc(id)}">${icon('dissect')}Only their journey</button>` : ''; }
  else if (a.type === 'outcome') { const o = SM.outcomes.get(id); rows = `<div class="${o.reqs.length ? '' : 'miss'}"><dt>Delivered by</dt><dd>${o.reqs.map(link).join('') || 'No requirement'}</dd></div><div class="${o.owners.length ? '' : 'miss'}"><dt>Owned by</dt><dd>${o.owners.map(link).join('') || 'No stakeholder'}</dd></div>`; focus = o.reqs.length ? `<button type="button" class="cm-btn" data-sm="dissect" data-id="${esc(id)}">${icon('dissect')}Only what delivers it</button>` : ''; }
  else if (a.type === 'stakeholder') { const x = SM.stakeholders.get(id); rows = `<div class="${x.outcomes.length ? '' : 'miss'}"><dt>Owns</dt><dd>${x.outcomes.map(link).join('') || 'No outcome'}</dd></div>`; }
  else { const x = SM.limits.get(id); rows = `${a.type === 'scope' ? `<div><dt>Boundary</dt><dd>${a.scopeMode === 'out' ? 'Out of scope' : 'In scope'}</dd></div>` : ''}<div><dt>Touches</dt><dd>${[...x.reqs, ...x.steps, ...x.others].map(link).join('') || '<em>Nothing yet</em>'}</dd></div>`; }
  return `<section class="cm-spec"><h4>${esc(TYPE[a.type] || 'Record')} · ${esc(a.id)}<span class="${st === 'confirmed' ? 'guarded' : ''}">${STATE[st]}</span></h4><p class="cm-spec-t"><b>${esc(a.title)}</b></p>${a.description ? `<p>${esc(a.description)}</p>` : ''}<dl class="cm-dl">${rows}<div><dt>Owner</dt><dd>${esc(a.owner || 'Not named')}</dd></div></dl><div class="cm-acts">${act('edit', `data-id="${esc(id)}"`, icon('edit') + 'Edit', 'primary')}${act('link', `data-from="${esc(id)}"`, icon('link') + 'Connect')}${proposeFor(id)}${focus}${brain()}</div></section>`;
}
function specimenProposal() {
  const g = proposal(); if (!g) return '';
  const terms = g.record.type === 'requirement' ? `<div><dt>Priority</dt><dd>${esc(g.record.priority)}</dd></div><div><dt>Accepted when</dt><dd>${esc(g.record.acceptance || '—')}</dd></div>` : `<div><dt>Kind</dt><dd>${esc(TYPE[g.record.type] || g.record.type)}${g.record.type === 'assumption' ? ' · not confirmed' : ''}</dd></div>${g.record.description ? `<div><dt>Says</dt><dd>${esc(g.record.description)}</dd></div>` : ''}`;
  return `<section class="cm-spec"><h4>Proposal · not saved</h4><p class="cm-spec-t"><b>${esc(g.record.title)}</b></p><p>${esc(g.reason || '')}</p><dl class="cm-dl">${terms}<div><dt>Would connect</dt><dd>${(g.links || []).map(([f, k, t]) => esc((f === 'new' ? 'it' : refTitle(f)) + ' ' + k + ' ' + (t === 'new' ? 'it' : refTitle(t)))).join('<br>') || 'Nothing yet — connect it when you review it'}</dd></div></dl><div class="cm-acts"><button type="button" class="cm-btn gold" data-r-action="edit-ghost">${icon('edit')}Review &amp; edit</button><button type="button" class="cm-btn" data-r-action="dismiss-ghost">Dismiss</button></div></section>`;
}
function reading() {
  if (diagramView()) return NT.readingHTML();
  if (ctxView()) return `<section><h4>Reading this view</h4><p>The <b>system</b> is the boxed column: its journey steps, in order. <b>People</b> who take part stand to its left; the <b>outcomes</b> it exists for, and the <b>owners</b> who answer for them, to its right. Each line to an outcome names the requirements that deliver it.</p><p>Beneath: what limits the design — what is in and out of scope, constraints and assumptions.</p></section>`;
  return `<section><h4>Reading this view</h4><p>A <b>story map</b>. The journey's steps run across as the backbone; the <b>priority slices</b> run down — Must, then Should, then Could. Each requirement stands under the step that needs it and carries, along its foot, the <b>Chapter 4 responsibility</b> that covers it.</p><p>A dashed card is a step with no requirement; ⋯ between steps means their order is not recorded.${SM.steps.length ? ' <b>Walk the journey</b> to read it step by step.' : ''}</p></section>`;
}
function insightsHTML() {
  const list = storyInsights(SM, scope()).slice(0, 8);
  if (!list.length) return '';
  const g = ghost();
  return `<section><h4>What the model shows<span>${list.length}</span></h4>${list.map(x => { const q = x.proposal ? SM.proposals.find(p => p.id === x.proposal) : null; return `<div class="sm-insw"><button type="button" class="cm-ins ${x.kind}" data-sel="${esc(x.id || '')}"><span>${esc(x.text)}</span>${x.ask ? `<small>Ask: ${esc(x.ask)}</small>` : ''}</button>${q && g?.id !== q.id ? `<button type="button" class="cm-mini gold sm-inp" data-r-proposal="${esc(q.id)}" data-focus="${esc(q.target || x.id || '')}">${esc(q.label)}</button>` : ''}</div>`; }).join('')}<p class="cm-muted">Drawn from recorded journey steps, requirements, outcomes and limits, and Chapter 4's responsibilities. Prompts for review, not verdicts.</p></section>`;
}
function findingsHTML() {
  const sc = scope(), fs = SM.findings.filter(f => f.code !== 'confirmation' && (sc.kind === 'system' || concerns(sc.id).ids.has(f.artefactId)));
  if (!fs.length) return '';
  const groups = new Map();
  for (const f of fs) { if (!groups.has(f.title)) groups.set(f.title, []); groups.get(f.title).push(f); }
  return `<section><h4>Chapter 1 checks<span>${fs.length}</span></h4>${[...groups].sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([k, g]) => `<button type="button" class="cm-fg ${g.some(f => f.level === 'error') ? 'error' : ''}" data-sel="${esc(known(g[0].artefactId) ? g[0].artefactId : '')}"><b>${esc(k)}</b><small>${g.length} · ${esc([...new Set(g.map(f => f.artefactId))].slice(0, 4).join(', '))}${g.length > 4 ? '…' : ''}</small></button>`).join('')}<a class="cm-muted" href="${esc(projectURL('/?chapter=1&tab=validate&validate=readiness'))}">All checks on Validate →</a></section>`;
}
function panel() {
  const box = root.querySelector('.cm-panel');
  if (!S.panel) { box.innerHTML = ''; return; }
  const s = S.sel, a = s && A(s);
  const spec = s === PROPOSED ? specimenProposal() : !a ? '' : a.type === 'requirement' ? specimenRequirement(s) : a.type === 'journey' ? specimenStep(s) : specimenOther(s);
  if (!spec && s && drawn(s)) spec = NT.specimenHTML(s);
  box.innerHTML = spec + reading() + insightsHTML() + findingsHTML();
}

// ---------------------------------------------------------------- walking the journey

function walkBar() {
  if (diagramView()) { root.querySelector('.cm-walk').innerHTML = ''; return; }
  const bar = root.querySelector('.cm-walk'), n = SM.steps.length;
  if (!n) { bar.innerHTML = '<p class="cm-walk-text">Add journey steps to walk the journey.</p>'; return; }
  const cur = S.walk >= 0 ? SM.steps[S.walk] : null;
  bar.innerHTML = `<button type="button" class="cm-btn" data-sm="walk-prev" aria-label="Previous step" ${S.walk <= 0 ? 'disabled' : ''}>‹</button><button type="button" class="cm-btn" data-sm="walk-next">${S.walk < 0 ? icon('play') + '<span>Walk the journey</span>' : S.walk >= n - 1 ? 'Done' : 'Next ›'}</button><p class="cm-walk-text">${cur ? `<b>${S.walk + 1} / ${n}</b> ${esc(describeStep(SM, cur.id))}` : `${n} journey steps. At each one: who takes part, what it needs, and why.`}</p>${S.walk >= 0 ? '<button type="button" class="cm-btn icon" data-sm="walk-stop" aria-label="Stop the walk">×</button>' : ''}`;
}
function walkTo(i) {
  if (!SM.steps.length) return;
  if (scope().kind !== 'system') { S.scope = {kind: 'system'}; fitPending = true; }
  S.walk = Math.max(-1, Math.min(SM.steps.length - 1, i));
  if (S.walk >= 0) seen.add(SM.steps[S.walk].id);
  render(); revealWalk();
}
function revealWalk() {
  if (S.walk < 0) return;
  const s = SM.steps[S.walk];
  if (ctxView()) { const c = L.cards.find(x => x.id === s.id); if (c) stage.reveal(c.x - 20, c.y - 20, c.w + 40, c.h + 40); return; }
  const col = L.cols.find(c => c.step === s.id), cs = L.cards.filter(c => c.card.col === col?.id);
  if (!col) return;
  const ys = cs.length ? cs.flatMap(c => [c.y, c.y + c.h]) : [L.top, L.top + 140];
  stage.reveal(col.x - 20, Math.min(...ys) - 20, col.w + 40, Math.max(...ys) - Math.min(...ys) + 40);
}

// ---------------------------------------------------------------- interaction

function revealSelection() {
  if (diagramView()) { const b = NT.layout()?.nodes.find(n => n.id === S.sel); if (b) stage.reveal(b.x, b.y, b.w, b.h); return; }
  if (!S.sel || !L || !root) return;
  if (!ctxView()) { const col = L.cols.find(c => c.step === S.sel); if (col) { stage.reveal(col.x, L.top, col.w, 140); return; } }
  const c = (L.cards || []).find(x => x.id === S.sel) || (L.notes || []).find(x => x.id === S.sel);
  if (c) stage.reveal(c.x, c.y, c.w, c.h);
}
function select(id, {reveal = false} = {}) {
  S.sel = id || null; S.walk = -1;
  const p = project(), target = S.sel && S.sel !== PROPOSED ? S.sel : null;
  if (target) page()?.focus(target);
  if (p && target) { try { mountBrainContext(p, {id: target, chapter: 1}, 'model'); } catch { /* assistance is optional */ } }
  if (window.history) { const url = new URL(location.href); if (target) url.searchParams.set('artefact', target); else url.searchParams.delete('artefact'); window.history.replaceState(window.history.state, '', url.pathname + url.search); }
  if (S.sel && !S.panel) S.panel = true;
  save(); render();
  if (reveal) revealSelection();
}
function setScope(sc) { const r = storyScope(SM, sc); S.scope = r.kind === 'system' ? {kind: 'system'} : {kind: r.kind, id: r.id, ...(r.focus ? {focus: r.focus} : {})}; S.walk = -1; fitPending = true; save(); render(); }
function onAct(k, a) {
  const pg = page();
  if (!pg) return;
  if (k === 'edit') { pg.edit(a.dataset.id); return; }
  if (k === 'add') { pg.add(a.dataset.type); return; }
  if (k === 'add-for-step') { pg.add('requirement', [[a.dataset.step, 'requires', 'new']]); return; }
  if (k === 'link') { pg.link({from: a.dataset.from || undefined, kind: a.dataset.kind || undefined, to: a.dataset.to || undefined}); }
}

function bind() {
  root.addEventListener('change', e => { NT.change(e); });
  root.addEventListener('click', e => {
    if (root.dataset.suppress) return;
    if (NT.handle(e)) return;
    const add = root.querySelector('.cm-add');
    if (add?.open && !e.target.closest('.cm-add > summary')) add.open = false;
    // The page's own editors and proposals handle these; point it at the record first.
    const pr = e.target.closest('[data-r-proposal]');
    if (pr) { page()?.focus(pr.dataset.focus || S.sel); return; }
    if (e.target.closest('[data-brain-launch],[data-r-action],[data-r-edit],a')) return;
    const a = e.target.closest('[data-sm]');
    if (a && !a.disabled) {
      const k = a.dataset.sm;
      if (k === 'view') { S.view = a.dataset.id; S.walk = -1; fitPending = true; save(); render(); revealSelection(); return; }
      if (k === 'lens') { S.lens = a.dataset.id; save(); render(); return; }
      if (k === 'depth') { S.depth = a.dataset.id; fitPending = true; save(); render(); return; }
      if (k === 'scope') { setScope({kind: 'system'}); return; }
      if (k === 'dissect') { setScope({kind: 'x', id: a.dataset.id}); return; }
      if (k === 'explore') { cbs.explore?.(1); return; }
      if (k === 'expand') { const on = !document.body.classList.contains('cm-expanded'); document.body.classList.toggle('cm-expanded', on); a.setAttribute('aria-pressed', String(on)); sizeModel(root, 'cm-expanded'); fitPending = true; setTimeout(render, 30); return; }
      if (k === 'panel') { S.panel = !S.panel; save(); fitPending = true; render(); setTimeout(() => { fitPending = true; render(); }, 30); return; }
      if (k === 'key') { const key = root.querySelector('.cm-key'); key.classList.toggle('cm-min'); a.setAttribute('aria-expanded', String(!key.classList.contains('cm-min'))); return; }
      if (k === 'fit') { stage.fitAll(); return; }
      if (k === 'zin' || k === 'zout') { const {w, h} = stage.box(); stage.zoomAt(stage.cam.z * (k === 'zin' ? 1.15 : 1 / 1.15), w / 2, h / 2); return; }
      if (k === 'walk-next') { if (S.walk >= SM.steps.length - 1) { S.walk = -1; render(); } else walkTo(S.walk + 1); return; }
      if (k === 'walk-prev') { walkTo(Math.max(0, S.walk - 1)); return; }
      if (k === 'walk-stop') { S.walk = -1; render(); return; }
      if (['edit', 'add', 'add-for-step', 'link'].includes(k)) { if (add) add.open = false; onAct(k, a); return; }
      if (k === 'noop') return;
    }
    const lane = e.target.closest('[data-lane]');
    if (lane && !e.target.closest('[data-sel]')) {
      const id = lane.dataset.lane; if (id === 'off') return;
      const now = Date.now(), twice = lastClick.id === 'H:' + id && now - lastClick.t < 420; lastClick = {id: 'H:' + id, t: now};
      if (twice) { lastClick = {id: null, t: 0}; setScope({kind: 'step', id}); return; }
      if (S.walk >= 0) { walkTo(SM.steps.findIndex(s => s.id === id)); return; }
      select(S.sel === id ? null : id); return;
    }
    const lk = e.target.closest('[data-link]');
    if (lk && !e.target.closest('[data-sel]')) { const l = F.links?.find(x => x.id === lk.dataset.link); if (l) select(l.refs[0] || l.from); return; }
    const card = e.target.closest('[data-card]');
    if (card && !e.target.closest('[data-sel]')) {
      const id = card.dataset.card, now = Date.now(), twice = lastClick.id === id && now - lastClick.t < 420;
      lastClick = {id, t: now};
      if (twice) { lastClick = {id: null, t: 0}; if (id.startsWith('C:')) { const col = id.slice(id.indexOf('|') + 1); if (col !== OFF) setScope({kind: 'step', id: SM.steps[Number(col.slice(2))].id}); } else if (A(id) && ['requirement', 'journey', 'actor', 'outcome'].includes(A(id).type)) setScope({kind: 'x', id}); return; }
      if (id.startsWith('C:')) return;
      select(id.startsWith('HOLE:') ? id.slice(5) : id); return;
    }
    const s = e.target.closest('[data-sel]');
    if (s && s.dataset.sel) { e.stopPropagation(); select(s.dataset.sel, {reveal: !!s.closest('.cm-panel')}); return; }
    if (e.target.closest('.cm-stage') && !e.target.closest('.cm-heads,.cm-rail,.cm-zoom,.cm-key') && (S.sel || S.walk >= 0)) { S.walk = -1; select(null); }
  });
  root.addEventListener('keydown', e => { if (NT.keydown(e)) return; if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-card]')) { e.preventDefault(); const id = e.target.dataset.card; if (!id.startsWith('C:')) select(id.startsWith('HOLE:') ? id.slice(5) : id); } });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !root?.isConnected || document.querySelector('dialog[open]')) return;
    const a = document.activeElement;
    if (a && a !== document.body && !root.contains(a)) return;
    if (a?.closest?.('select,details[open]')) return;
    if (S.walk >= 0) { S.walk = -1; render(); }
    else if (S.sel) select(null);
    else if (scope().kind !== 'system') setScope({kind: 'system'});
    else if (document.body.classList.contains('cm-expanded')) root.querySelector('[data-sm="expand"]').click();
    else return;
    e.preventDefault();
  });
  root.addEventListener('pointerleave', () => { root.querySelector('.cm-tip').hidden = true; });
  window.addEventListener('resize', () => { if (!root?.isConnected) return; clearTimeout(bind._r); bind._r = setTimeout(() => { sizeModel(root, 'cm-expanded'); render(); }, 120); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!root?.isConnected || !L) return; clearTimeout(bind._ro); bind._ro = setTimeout(() => { const w = stage.box().w; if (Math.abs(w - (bind._w || 0)) > 24) { bind._w = w; fitPending = true; render(); } }, 90); }).observe(root.querySelector('.cm-stage'));
}
function tip(e) {
  const box = root.querySelector('.cm-tip'), t = e.target.closest?.('.sm-card,.sm-sh,.sm-note,.sm-label,.nt-node');
  if (t?.dataset?.ntNode && root.contains(t)) { box.innerHTML = NT.tipHTML(t.dataset.ntNode); box.hidden = !box.innerHTML; if (!box.hidden) placeTip(box, e); return; }
  if (!t || !root.contains(t)) { box.hidden = true; return; }
  let html = '';
  const id = t.dataset.card || t.dataset.lane;
  if (t.dataset.link) { const l = F.links?.find(x => x.id === t.dataset.link); html = l ? `<b>${esc(titleOf(l.from))} → ${esc(titleOf(l.to))}</b>${esc(l.refs.map(q => q + ' ' + R(q).title).join('; '))}` : ''; }
  else if (id && R(id)) html = `<b>${esc(refTitle(id))}</b>${esc(describeRequirement(SM, id))}<small class="h">Double-click to focus on its step</small>`;
  else if (id && stepOf(id)) html = `<b>${esc('Step ' + stepOf(id).num + ' · ' + stepOf(id).title)}</b>${esc(describeStep(SM, id))}<small class="h">Double-click to focus on this step</small>`;
  else if (id?.startsWith('HOLE:')) html = `<b>${esc(stepOf(id.slice(5)).title)}</b>No requirement says what the design must do at this step.`;
  else if (id && A(id)) html = `<b>${esc(refTitle(id))}</b>${esc(A(id).description || '')}`;
  if (!html) { box.hidden = true; return; }
  box.innerHTML = html; box.hidden = false; placeTip(box, e);
}

export function storyDebug() { return {S: {...S}, SM, F, L}; }
