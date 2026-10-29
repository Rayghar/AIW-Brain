// Chapter 1 Model — Requirements.
//
// Two architecture models of the same requirements, drawn from recorded facts:
// - Journey map: a story map. The journey's steps run across as the backbone, the priority
//   slices (Must, Should, Could) run down, and each requirement stands under the step that needs
//   it, reading what it limits, how it will be accepted, why it matters and — along its foot —
//   the Chapter 4 responsibility that covers it.
// - Boundary (round 11; Context until then): the system and its boundary, the people who take part in its journey, the
//   outcomes it exists for and who owns them, and the limits on the design beneath.
// Sliced like every chapter model (whole journey → one step, one actor or one outcome), read
// through the Structure, Flow and Reasoning lenses, walked step by step, and edited only through
// Chapter 1's own editors and proposals. Its Diagram draws the journey as a process: there the companion carries the
// process's own authoring (process-editing.js: the scenario traced, process objects, conditions and source claims, each
// reviewed before it applies).
import {storySource, foldStory, foldContext, storyScope, storyWalk, storyInsights, describeStep, describeRequirement, defaultDepth, colInfo, PRIORITIES, OFF, PROPOSED} from './story-model.js';
import {proposals as requirementProposals} from './requirements-domain.js';
import {storyLayout, mapHead, contextLayout, contextHead, SX, CT} from './story-layout.js';
import {drawnOffsets} from './wire-merge.js';
import {modelChrome,modelStage, connectionAttrs, sizeModel, placeTip, drawerDialog, toolsHTML, roundPath, headPath, nextFrame, companionHost, companionOf, listen, companionOpen, releaseCompanion, inCompanion, insightsSection, announceObject} from './model-stage.js';
import {createNotation} from './notation-view.js';
import {modelHeaderHTML, draftActionHTML} from './instrument-tray.js';
import {chapterLenses} from './lens-vocabulary.js';
import {traceFrom} from './model-matrix.js';
import {traceStoryHTML} from './trace-narrative.js';
import {projectPreferenceKey, projectURL, currentProject as project, onProjectSwitch, scopedProject} from './project-context.js';
import {mountBrainContext} from './brain-context-ui.js';
import {solChapterMount, solChapterBind, solSection, solInto, solMark} from './chapter-sol.js';
import {esc} from './html-escape.js';
import {readStoredObject} from './util.js';
// Round 24 (D-24-08): the model and its pictures read the shell's module scope (project-context.js scopedProject: the saved
// document without one); Sol, proposals and editors keep the saved document.
// A model change previewed in this chapter shows its banner above the model (as in Chapters 4–8); without
// it the proposal had no visible entry point here, since the page leaves the banner to the chapter model.
const pending = () => { const i = window.aiwInterfaceImpact; return i?.pending && i.previewInChapter?.(1) ? i : null; };

// Sol's advice changes the project only through a store command; the view then reads the new document.
const solRefresh = () => { if (root?.isConnected) mountChapterModel({id: pageSel}, cbs); };
const page = () => window.aiwRequirementsPage;
const PATHS = {diagram: 'M4 4h6v5H4zM14 4h6v5h-6zM9 15h6v5H9zM7 9v3h10V9M12 12v3', structure: 'M6 3v18M18 3v18M6 8h12M6 16h12', flow: 'M3 12h13m-4-5 5 5-5 5M3 5h6M3 19h6', reasoning: 'M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9M9 7h6M9 17h6', map: 'M3 5h4v4H3zM10 5h4v4h-4zM17 5h4v4h-4zM3 12h4v7H3zM10 12h4v4h-4zM17 12h4v2h-4z', context: 'M7 4h10v16H7zM2 9h3M2 15h3M19 9h3M19 15h3', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', panel: 'M3 4h18v16H3zM15 4v16', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', plus: 'M12 5v14M5 12h14', spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z', mind: 'm3 7 9-4 9 4-9 4-9-4m0 5 9 4 9-4m-18 5 9 4 9-4', edit: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4', dissect: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14M21 21l-5-5M8 11h6', play: 'M7 4v16l13-8z', link: 'M9 15 15 9M8 12l-2 2a3 3 0 0 0 4 4l2-2m4-4 2-2a3 3 0 0 0-4-4l-2 2', layers: 'm12 3 9 5-9 5-9-5 9-5m-9 9 9 5 9-5', person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', story: 'M12 6c-2-1.5-4.5-2-8-2v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2V4c-3.5 0-6 .5-8 2zm0 0v14'};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[n] || PATHS.map}"/></svg>`;
// The chapter's lenses, its subset of the one vocabulary (lens-vocabulary.js), each with the chapter's own question.
const LENSES = chapterLenses({
  structure: 'Who owns each requirement, its source, and the scope, constraints and assumptions that limit it.',
  flow: 'How each requirement will be accepted — the starting condition, the action and the observable result — and where the journey goes next.',
  reasoning: 'Why each requirement matters: the outcomes it delivers, who owns them, and the quality drivers that refine it.'
});
const STATE = {confirmed: 'Confirmed', reference: 'Reference', draft: 'Draft'};
const BAND = {Must: 'the journey cannot work without these', Should: 'important, but the journey still works', Could: 'worth having if time allows', 'Not stated': 'priority needs an explicit decision'};
const TYPE = {requirement: 'Requirement', journey: 'Journey step', actor: 'Actor', stakeholder: 'Stakeholder', outcome: 'Business outcome', scope: 'Scope boundary', constraint: 'Constraint', assumption: 'Assumption'};

let root = null, SM = null, lastDoc = null, cbs = {}, F = null, L = null, fitPending = true, stage = null, lastClick = {id: null, t: 0}, pageSel, lastGhost = '';
let NT = null;
const freshView = () => ({view: 'map', lens: 'structure', scope: {kind: 'system'}, journey: null, depth: 'auto', sel: null, panel: true, walk: -1, story: null});
let S = freshView();
// The standard diagram (notation-view.js) and the elements only it draws.
// The standard diagram and the shared views (Layers, Table, Matrix, Whole design) are drawn by notation-view.js.
const diagramView = () => !!NT && NT.owns(S.view);
const drawn = id => diagramView() && !!NT?.diagram()?.nodes.some(n => n.id === id);
// The Diagram's process picture (the scene Chapter 1 opens on), where the process is authored; a frozen baseline is read.
const processShown = () => diagramView() && NT.view() === 'diagram' && NT.scene()?.id === 'process';
const processContext = () => ({project, frozen: !!NT.state.baseline, select: id => select(id), refresh: () => render()});
// The process's authoring (process-editing.js) comes with the perspective view, which every chapter model loads with it.
let PE = null;
if (typeof window !== 'undefined' && window.document) import('./perspective-view.js').then(m => { PE = m; if (root?.isConnected) { render(); traced(); } }).catch(() => { /* the companion keeps its other parts */ });
const seen = new Set();
const pref = () => projectPreferenceKey('aiw-story-model-v1');
function save() { try { localStorage.setItem(pref(), JSON.stringify({view: S.view, lens: S.lens, scope: S.scope, journey: S.journey, depth: S.depth, panel: S.panel})); } catch { /* preferences are optional */ } }
// This browser's preferences for the chapter's model in the project on screen (read when the model is first drawn,
// and again when another project opens in place).
function restorePreferences() {
  const v = readStoredObject(pref());
  for (const k of ['view', 'lens', 'depth']) if (typeof v[k] === 'string') S[k] = v[k];
  if (v.scope && typeof v.scope === 'object') S.scope = v.scope;
  if (typeof v.journey === 'string') S.journey = v.journey;
  if (typeof v.panel === 'boolean') S.panel = v.panel;
  S.view = NT.settle(S.view);
  if (!LENSES.some(l => l.id === S.lens)) S.lens = 'structure';
}
// Another project opened in place (round 4, A): the model leaves and forgets the last project's view — its view, lens,
// scope, depth, panel, selection and walk — then reads the new project's preferences for this chapter; the next mount
// rebuilds from the new project's document. The picture's own choices are reset by its notation (notation-view.js).
onProjectSwitch(() => { leaveChapterModel(); S = freshView(); SM = null; lastDoc = null; pageSel = undefined; fitPending = true; seen.clear(); lastGhost = ''; if (NT) restorePreferences(); });

// ---------------------------------------------------------------- mount / leave

export function mountChapterModel(selection, callbacks = {}) {
  const p = project(), host = document.querySelector('.studio > .stage.tab-content');
  if (!p || !host) return;
  cbs = callbacks;
  solChapterMount(p, 1, solRefresh);
  if (!root) {
    root = document.createElement('section'); root.className = 'cm sm'; root.setAttribute('aria-label', 'Chapter 1 model: requirements');
    root.innerHTML = shell();
    stage = modelStage(root, {headHeight: () => (diagramView() ? 0 : S.view === 'boundary' ? contextHead() : mapHead()), railWidth: l => l.rail || 0, onHover: tip});
    stage.bind(); bind();
    // The standard diagram shares the stage, the companion and the selection with the chapter's own views.
    NT = createNotation({chapter: 1, root, stage, project: scopedProject, onSelect: id => select(id), objectId: () => (NT?.scene()?.id === 'sequence' && S.sel && SM && A(S.sel)?.type === 'journey' ? S.sel : null)});
    NT.addViews('sm');
    NT.onChange = full => { if (full) fitPending = true; render(); };
    NT.bindDrag();
    restorePreferences();
    // The address may open the model on a view (a deep link, and the rendered checks).
    { const mv = window.aiwChapterModels?.takeView?.(1) || new URLSearchParams(location.search).get('model'); S.view = mv ? NT.settle(mv, 'link') : NT.settle(S.view); }
  } else {
    // A route the shell follows in place may name the view too (round 4, A: workspace-ux.js routeModel).
    const mv = window.aiwChapterModels?.takeView?.(1); if (mv) S.view = NT.settle(mv, 'link');
  }
  const first = !SM;
  if (host.firstElementChild !== root) host.prepend(root);
  document.body.classList.add('cm-active');
  const q = scopedProject();
  if (q !== lastDoc || !SM) { lastDoc = q; rebuild(q); }
  if (first && SM) { S.sel = null; const want = window.aiwChapterModels ? (window.aiwChapterModels.takeLink(1) || selection?.subject || null) : null; if (known(want)) { S.sel = want; nextFrame(() => revealSelection()); } }
  else if (SM && pageSel !== undefined && selection?.id !== pageSel && known(selection?.id)) { S.sel = selection.id; nextFrame(() => revealSelection()); }
  if (SM.journeys.length > 1 && S.sel) { const sid = SM.steps.some(s => s.id === S.sel) ? S.sel : SM.R.get(S.sel)?.steps[0]; const j = SM.A.get(sid)?.journeyId; if (j != null) S.journey = j; }
  pageSel = selection?.id ?? null;
  followGhost();
  render();
  sizeModel(root, 'cm-expanded');
  traced();
}
// Another chapter asked to trace a process outcome here (Chapter 11's settlement investigation): the Diagram opens on the
// process with the scenario traced and its element selected.
function traced() {
  const t = SM && PE ? PE.takeTrace() : null; if (!t) return;
  if (S.view !== 'diagram' || NT.scene()?.id !== 'process') { S.view = 'diagram'; if (NT.scenes.some(x => x.id === 'process')) Object.assign(NT.state, {scene: 'process', hub: null, focus: null, selEdge: null}); fitPending = true; save(); render(); }
  if (t.selectedId && drawn(t.selectedId)) select(t.selectedId, {reveal: true}); else render();
}
export function leaveChapterModel() {
  document.body.classList.remove('cm-active', 'cm-expanded');
  releaseCompanion(root);
  root?.remove();
}
function rebuild(p) {
  try { SM = storySource(p); } catch (e) { console.error('Requirements model', e); SM = null; return; }
  if (S.sel && !known(S.sel)) S.sel = null;
  if (S.scope?.kind !== 'system' && storyScope(SM, S.scope).kind === 'system') S.scope = {kind: 'system'};
  if (SM.journeys.length && !SM.journeys.some(j => j.id === S.journey)) S.journey = SM.journeys[0].id;
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
    if (limitGhost() && S.view !== 'boundary') { S.view = 'boundary'; fitPending = true; }
    nextFrame(() => revealSelection());
  }
  if (!key && S.sel === PROPOSED) S.sel = null;
  lastGhost = key;
}

// ---------------------------------------------------------------- shell

function shell() {
  return `${modelHeaderHTML(1, 'sm', `<details class="cm-add"><summary class="cm-btn" aria-label="Add to the model">${icon('plus')}<span>Add</span></summary><div class="sm-addmenu"></div></details>
    <button type="button" class="cm-btn icon" data-sm="expand" aria-pressed="false" aria-label="Expand the model" title="Expand">${icon('expand')}</button>
    <button type="button" class="cm-btn icon" data-sm="panel" aria-pressed="true" aria-label="Show the companion panel" title="Companion">${icon('panel')}</button>`, 'Requirements')}
  <div class="cm-bar" data-model-slot="commands"><nav class="cm-crumbs" aria-label="Model scope"></nav><div class="cm-lenses" role="group" aria-label="Lens"></div><div class="cm-depth" role="group" aria-label="Elements"></div></div>
  <div class="cm-banner" data-model-slot="notice"></div>
  <div class="cm-body" data-model-slot="content"><div class="cm-stage" tabindex="0" aria-label="Requirements canvas. Drag or scroll to move; Ctrl or Command and scroll to zoom.">
    <div class="cm-world"><svg class="cm-svg" aria-hidden="true"></svg><div class="cm-html"></div></div>
    <div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div>
    
    
  </div><aside class="cm-panel" aria-label="Companion"></aside></div>
  <footer class="cm-walk" data-model-slot="status" aria-label="Walk the journey"><div class="cm-walk-in"></div><p class="cm-state" role="status" aria-live="polite"></p>${toolsHTML('sm')}</footer><div class="cm-tip" role="tooltip" hidden></div>`;
}

// ---------------------------------------------------------------- render

const A = id => SM.A.get(id);
const R = id => SM.R.get(id);
const stepOf = id => SM.steps.find(s => s.id === id);
const titleOf = id => A(id)?.title || (id === PROPOSED ? proposal()?.record.title : '') || id;
const refTitle = id => (A(id) ? id + ' ' + A(id).title : titleOf(id));
const stateOf = a => (a.confirmed ? 'confirmed' : a.origin === 'reference' ? 'reference' : 'draft');
const selectedJourney = () => SM.journeys.find(j => j.id === S.journey) || SM.journeys[0];
function scope() {
  const sc = storyScope(SM, S.scope);
  return sc.kind === 'system' && SM.journeys.length > 1 ? {kind: 'journey', id: selectedJourney().id} : sc;
}
const walkSteps = () => SM.journeys.length > 1 ? storyWalk(SM, selectedJourney().id) : storyWalk(SM);
function depth() { return S.depth === 'auto' ? defaultDepth(SM) : S.depth; }
// The Boundary view (round 11: renamed from Context, which the C4 Context picture of the Diagram keeps for itself).
const ctxView = () => S.view === 'boundary';
function measure(l) { return Math.max(90, 24 + 6.4 * String(l.label || '').length); }

function render() {
  if (!root) return;
  S.view = NT.settle(S.view);
  if (!SM) { root.querySelector('.cm-html').innerHTML = '<p class="cm-empty">The requirements model could not be prepared for this project.</p>'; return; }
  root.classList.remove('cm-lens-structure', 'cm-lens-flow', 'cm-lens-reasoning');
  root.classList.add('cm-lens-' + S.lens);
  root.classList.toggle('sm-context', ctxView());
  root.classList.toggle('sm-walking', S.walk >= 0);
  root.querySelector('.cm-body').classList.toggle('no-panel', !S.panel);
  root.classList.toggle('nt-active', diagramView());
  if (diagramView()) {
    // The standard diagram: the notation module draws; the chapter keeps its chrome, companion and camera.
    L = NT.render({sel: S.sel, view: S.view, viewW: stage.box().w});
    PE?.paintScenario(root.querySelector('.cm-svg'), processShown() ? NT.diagram() : null, project());
    root.querySelector('.cm-heads-in').innerHTML = ''; root.querySelector('.cm-rail-in').innerHTML = '';
    chromeDiagram(); panel(); walkBar(); modelChrome(root);
    stage.use(L, 'diagram|' + (NT.scene()?.id || '') + '|' + NT.arrangement());
    if (fitPending) { fitPending = false; NT.fit(); } else stage.clamp();
    stage.apply(); return;
  }
  root.querySelector('[data-sm="panel"]').setAttribute('aria-pressed', String(S.panel)); drawerDialog(root, '[data-sm="panel"]', S.panel);
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
  else if (ctxView()) { svg.innerHTML = contextSVG(hl); root.querySelector('.cm-html').innerHTML = contextHTML(hl); contextHeads(hl); root.querySelector('.cm-rail-in').innerHTML = ''; }
  else { svg.innerHTML = mapSVG(hl); root.querySelector('.cm-html').innerHTML = mapHTML(hl); mapHeads(hl); mapRail(hl); }
  chrome(); panel(); walkBar(); NT.ownView(); modelChrome(root);
  stage.use(L, JSON.stringify([S.view, S.scope?.kind || 'system', S.scope?.id || '', S.journey, depth()]));
  if (fitPending) { fitPending = false; stage.fit(); } else stage.clamp();
  stage.apply();
}
function emptyHTML() {
  return `<div class="sm-empty" style="left:${(L.rail || 0) + 30}px;top:${(ctxView() ? contextHead() : mapHead()) + 24}px"><b>No journey or requirement yet</b><p>The journey is the backbone of the requirements: add the steps people go through, then the requirements each step needs and the outcomes they deliver.</p><div><button type="button" class="cm-btn primary" data-sm="add" data-type="journey">${icon('plus')}New journey step</button><button type="button" class="cm-btn" data-sm="add" data-type="requirement">${icon('plus')}New requirement</button>${SM.proposals.filter(q => q.mode === 'new').map(q => `<button type="button" class="cm-btn gold" data-r-proposal="${esc(q.id)}">${esc(q.label)}</button>`).join('')}${draftActionHTML(project(), 1)}</div></div>`;
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
  L.bands.forEach((b, i) => out.push(`<rect class="sm-band ${esc(b.id.toLowerCase())}${i % 2 ? ' odd' : ''}" x="${L.rail}" y="${b.y}" width="${L.W - L.rail - 6}" height="${b.h}"/>`));
  for (const c of L.cols) out.push(`<rect class="sm-col${c.kind === 'off' ? ' off' : ''}${hl.steps.has(c.step) ? ' lit' : ''}" x="${c.x}" y="${L.top - 4}" width="${c.w}" height="${L.H - L.top - 8}" rx="10"/>`);
  return out.join('');
}
const chip = (id, cls = '') => { const a = A(id); return a ? `<i class="sm-x k-${esc(a.type)}${cls}${a.type === 'assumption' && !a.confirmed ? ' open' : ''}" data-sel="${esc(id)}" title="${esc(TYPE[a.type] + ' · ' + id + ' ' + a.title + (a.type === 'assumption' && !a.confirmed ? ' — not yet confirmed' : ''))}">${esc(a.type === 'outcome' || a.type === 'actor' ? a.title : id)}</i>` : ''; };
function reqCard(c, hl) {
  const q = R(c.id), st = stateOf(q), g = ghost(), edited = g && g.mode === 'edit' && g.target === q.id ? g.record : null, pos = `style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"`;
  const also = q.steps.length > 1 ? `<i class="sm-tag" title="${esc('Needed at ' + q.steps.map(s => stepOf(s).num + ' ' + stepOf(s).title).join(', '))}">steps ${esc(q.steps.map(s => stepOf(s).num).join(' · '))}</i>` : q.offJourney ? '<i class="sm-tag off">no step</i>' : '';
  const limits = [...q.scope, ...q.constraints, ...q.assumptions].map(x => chip(x)).join('');
  const st1 = `<span class="sm-l1"><span class="sm-who">${q.owner ? esc(q.owner) : '<em class="miss">no owner</em>'}</span><em class="sm-src" title="${esc(q.source)}">${esc(q.source || 'no source')}</em></span><span class="sm-l2">${limits || '<em>nothing limits it</em>'}</span>`;
  const acc = edited ? `<span class="sm-acc proposed" title="${esc('Proposed: ' + edited.acceptance)}"><i class="sm-pro">proposed</i>${esc(edited.acceptance)}</span>` : q.testable ? `<span class="sm-acc" title="${esc(q.acceptance)}">${esc(q.acceptance)}</span>` : `<span class="sm-acc miss" title="${esc(q.acceptance || 'No acceptance recorded')}"><b>cannot be tested yet</b> ${esc(q.acceptance)}</span>`;
  const owners = [...new Set(q.outcomes.flatMap(o => SM.outcomes.get(o)?.owners || []))];
  const rs = `<span class="sm-l1">${q.outcomes.map(o => chip(o)).join('') || '<em class="miss">delivers no outcome</em>'}</span><span class="sm-l2">${owners.map(o => chip(o)).join('')}${q.drivers.length ? `<i class="sm-q" title="${esc(q.drivers.join(', '))}">${q.drivers.length} quality driver${q.drivers.length === 1 ? '' : 's'}</i>` : '<em>no quality driver</em>'}</span>`;
  const strip = `<div class="sm-strip"><small>covered by</small>${q.covers.map(r => `<i class="sm-lr" title="${esc('Chapter 4 · ' + r.ref + ' ' + r.title)}"><b>${esc(r.ref)}</b>${esc(r.title)}</i>`).join('') || (SM.covered ? '<em class="miss">no Chapter 4 responsibility</em>' : '<em>Chapter 4, when it is drafted</em>')}</div>`;
  return `<div class="sm-card req${edited ? ' ghosted' : ''}${c.card.subject ? ' subject' : ''}${S.sel === q.id ? ' sel' : ''}${lit(hl, q.id)}" data-card="${esc(q.id)}" ${pos} tabindex="0" role="button" aria-label="${esc('Requirement ' + q.id + ' ' + q.title)}"><small><b class="sm-ref">${esc(q.id)}</b>${also}${q.ambiguous ? '<i class="sm-tag warn" title="Uses wording that cannot be observed">vague</i>' : ''}<i class="sm-st ${st}">${STATE[st]}</i></small><b class="sm-t">${esc(edited ? edited.title : q.title)}</b><div class="sm-lens"><div class="st">${st1}</div><div class="fl">${acc}</div><div class="rs">${rs}</div></div>${strip}</div>`;
}
function mapHTML(hl) {
  const out = [];
  for (const c of L.cards) {
    const k = c.card, pos = `style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"`;
    if (k.kind === 'req') { out.push(reqCard(c, hl)); continue; }
    if (k.kind === 'hole') {
      const s = stepOf(k.step);
      out.push(`<div class="sm-card hole${S.sel === s.id ? ' sel' : ''}${hl.on ? (hl.steps.has(s.id) ? ' lit' : ' dim') : ''}" data-card="${esc(k.id)}" ${pos} tabindex="0" role="group" aria-label="${esc('Step ' + s.num + ' ' + s.title + ' has no requirement. Press Enter to select the step')}"><small>Step ${esc(s.num)} · no requirement yet</small><b class="sm-t">${esc(s.title)}</b><div class="sm-lens"><p>${esc(s.description || 'What must the design do at this step?')}</p></div><div class="sm-strip"><button type="button" class="cm-mini gold" data-sm="add-for-step" data-step="${esc(s.id)}">Add a requirement for this step</button></div></div>`);
      continue;
    }
    if (k.kind === 'proposed') {
      const g = newGhost();
      out.push(`<div class="sm-card proposed${S.sel === PROPOSED ? ' sel' : ''}${lit(hl, PROPOSED)}" data-card="${PROPOSED}" ${pos} tabindex="0" role="group" aria-label="${esc('Proposal, not saved: ' + k.title + '. Press Enter to select the proposal')}"><small>Proposal · not saved · ${esc(g?.record.priority || '')}</small><b class="sm-t">${esc(k.title)}</b><div class="sm-lens"><div class="st"><span class="sm-l1"><span class="sm-who">${esc(g?.record.owner || '')}</span></span><span class="sm-l2"><button type="button" class="cm-mini gold" data-r-action="edit-ghost">Review &amp; edit</button></span></div><div class="fl"><span class="sm-acc">${esc(g?.record.acceptance || '')}</span></div><div class="rs"><span class="sm-l1">${k.outcomes.map(o => chip(o)).join('') || '<em>outcome on review</em>'}</span><span class="sm-l2"><button type="button" class="cm-mini gold" data-r-action="edit-ghost">Review &amp; edit</button></span></div></div><div class="sm-strip"><small>covered by</small><em>planned in Chapter 4</em></div></div>`);
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
  box.innerHTML = L.bands.map(b => { const n = F.cards.filter(c => c.band === b.id && c.kind !== 'hole').reduce((k, c) => k + (c.kind === 'cell' ? c.members.length : 1), 0); return `<div class="sm-bt ${esc(b.id.toLowerCase())}" style="top:${b.y + 4}px;height:${b.h - 8}px" title="${esc(b.id + ' — ' + BAND[b.id])}"><b>${esc(b.id)}</b><small>${n} requirement${n === 1 ? '' : 's'}</small><span>${esc(BAND[b.id])}</span></div>`; }).join('');
  box.style.height = L.H + 'px'; box.style.width = L.rail + 'px';
}

// ---------------------------------------------------------------- context

// The paths (round 10, V5). The lane engine's wires (story-layout.js): each person's part in the journey and each
// owner's outcomes leave their card through one port on one line that divides at a dot, one branch per step or outcome,
// each branch still one relationship with its own head; a delivers path, which carries its requirements, is its own
// line. Every line names the relationships it carries (data-links); lines, dots and heads take their kind's colour from
// tokens. A line is lit while any relationship on it is lit and dims only when all do; the lit relationships are drawn
// whole on top, from where they leave their card (where an owner's dashes start), and a line under a lit one is left to
// it (beneath, its dashes would show through out of phase).
let wired = null;
function wiresOf() {
  if (wired?.L !== L) wired = {L, off: drawnOffsets(L.wires, 6)};
  return wired;
}
const HEAD = {participates: 7, delivers: 8, owns: 7};
function contextSVG(hl) {
  const out = [], W = L.wires, {off} = wiresOf(), kind = new Map(L.routes.map(r => [r.id, r.link.kind]));
  for (const ln of L.lanes) out.push(`<rect class="sm-lane ${esc(ln.id)}" x="${ln.x}" y="${L.top - 6}" width="${ln.w}" height="${L.lanesH - L.top - 4}" rx="${ln.id === 'system' ? 16 : 12}"/>`);
  const lit = ids => ids.some(id => hl.links.has(id)), state = ids => (lit(ids) ? ' lit' : hl.on ? ' dim' : '');
  W.chains.forEach((c, i) => {
    if (lit(c.ids)) return;
    const k = kind.get(c.ids[0]);
    out.push(`<path class="sm-route ${esc(k)}${state(c.ids)}" data-links="${esc(c.ids.join(' '))}" ${connectionAttrs(c.ids)} d="${roundPath(c.pts)}"${k === 'owns' && off[i] ? ` style="stroke-dashoffset:${off[i]}"` : ''}/>`);
  });
  for (const r of L.routes) if (hl.links.has(r.id)) out.push(`<path class="sm-route ${esc(r.link.kind)} lit" data-links="${esc(r.id)}" ${connectionAttrs(r.id)} d="${roundPath(r.pts)}"/>`);
  for (const j of W.joins) out.push(`<circle ${connectionAttrs(j.ids)} class="sm-join ${esc(kind.get(j.ids[0]))}${state(j.ids)}" cx="${j.x}" cy="${j.y}" r="2.4"/>`);
  for (const h of W.heads) { const k = kind.get(h.ids[0]); out.push(headPath(h.x, h.y, h.dir, (HEAD[k] || 7) + (lit(h.ids) ? 2 : 0), `sm-head ${k}${state(h.ids)}`, h.ids)); }
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
    fl = s.next ? `next: ${esc(stepOf(s.next).num)} ${esc(stepOf(s.next).title)}${s.linkedNext ? '' : ' <em class="miss">order not recorded</em>'}` : '<em>this journey ends here</em>';
    rs = outs.map(o => chip(o)).join('') || '<em class="miss">delivers no outcome</em>';
  } else if (a.type === 'actor') {
    const x = SM.actors.get(a.id), shown = new Set(F.rows.filter(row => row.kind === 'step').map(row => row.id)), local = x.steps.filter(id => shown.has(id));
    head = 'Person · ' + a.id; st1 = local.length ? `takes part in ${local.length} ${SM.journeys.length > 1 ? 'shown ' : ''}step${local.length === 1 ? '' : 's'}` : `<em class="miss">takes part in no ${SM.journeys.length > 1 ? 'shown ' : ''}step</em>`;
    fl = local.map(s => `<i class="sm-x k-journey" data-sel="${esc(s)}">${esc(stepOf(s).num)}</i>`).join('') || '—'; rs = `<em>${esc(a.description)}</em>`;
  } else if (a.type === 'outcome') {
    const o = SM.outcomes.get(a.id), localLinks = F.links.filter(l => l.kind === 'delivers' && l.to === a.id), localReqs = [...new Set(localLinks.flatMap(l => l.refs))];
    head = 'Outcome · ' + a.id; st1 = o.owners.map(x => chip(x)).join('') || '<em class="miss">no owner</em>';
    fl = `<em>reached at ${localLinks.map(l => stepOf(l.from)?.num).filter(Boolean).join(', ') || (SM.journeys.length > 1 ? 'no shown step' : 'no step')}</em>`;
    rs = localReqs.length ? `${localReqs.length} ${SM.journeys.length > 1 ? 'shown ' : ''}requirement${localReqs.length === 1 ? '' : 's'} deliver it` : `<em class="miss">nothing ${SM.journeys.length > 1 ? 'shown ' : ''}delivers it</em>`;
  } else {
    const x = SM.stakeholders.get(a.id), shown = new Set(F.rows.filter(row => row.kind === 'outcome').map(row => row.id));
    head = 'Stakeholder · ' + a.id; st1 = x.outcomes.filter(id => shown.has(id)).map(o => chip(o)).join('') || `<em class="miss">owns no ${SM.journeys.length > 1 ? 'shown ' : ''}outcome</em>`; fl = '<em>—</em>'; rs = `<em>${esc(a.description)}</em>`;
  }
  return `<div class="sm-card ctx k-${esc(a.type)}${S.sel === a.id ? ' sel' : ''}${hl.on ? (hl.ids.has(a.id) ? ' lit' : ' dim') : ''}" data-card="${esc(a.id)}" ${pos} tabindex="0" role="button" aria-label="${esc(TYPE[a.type] + ' ' + a.id + ' ' + a.title)}"><small><span>${esc(head)}</span><i class="sm-st ${st}">${STATE[st]}</i></small><b class="sm-t">${a.type === 'actor' ? icon('person') : ''}${esc(a.title)}</b><div class="sm-lens one"><span class="st">${st1}</span><span class="fl">${fl}</span><span class="rs">${rs}</span></div></div>`;
}
function contextHTML(hl) {
  const out = L.cards.map(c => contextCard(c, hl));
  for (const lb of L.labels) {
    const l = lb.link, on = hl.links.has(l.id);
    out.push(`<button type="button" ${connectionAttrs(l.id)} class="sm-label${on ? ' lit' : hl.on ? ' dim' : ''}${lb.compact ? ' compact' : ''}" data-link="${esc(l.id)}" style="left:${lb.x}px;top:${lb.y}px;width:${lb.w}px;height:${lb.h}px" title="${esc(l.refs.map(q => q + ' ' + R(q).title).join(' · '))}">${l.refs.map(q => `<i class="sm-x k-requirement" data-sel="${esc(q)}">${esc(q)}</i>`).join('')}</button>`);
  }
  if (L.notesY != null) out.push(`<div class="sm-notes-h" style="left:12px;top:${L.notesY + 6}px">What limits the design</div>`);
  for (const n of L.notes) {
    if (n.note.proposed) {
      const g = limitGhost(), kind = n.note.kind, head = kind === 'out' ? 'Out of scope' : kind === 'in' ? 'In scope' : TYPE[g?.record.type] || 'Limit';
      const touches = n.note.touches.map(id => `<i class="sm-x k-${esc(A(id).type)}" data-sel="${esc(id)}">${esc(A(id).type === 'journey' ? stepOf(id).num + ' ' + A(id).title : id)}</i>`).join('');
      out.push(`<div class="sm-note n-${esc(kind)} proposed${S.sel === PROPOSED ? ' sel' : ''}${lit(hl, PROPOSED)}" data-card="${PROPOSED}" style="left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px" tabindex="0" role="group" aria-label="${esc('Proposal, not saved: ' + n.note.title + '. Press Enter to select the proposal')}"><small>Proposal · not saved · ${esc(head)}</small><b>${esc(n.note.title)}</b><span>${touches || '<em>touches nothing yet</em>'}<button type="button" class="cm-mini gold" data-r-action="edit-ghost">Review &amp; edit</button></span></div>`);
      continue;
    }
    const x = SM.limits.get(n.id), kind = n.note.kind, head = kind === 'out' ? 'Out of scope' : kind === 'in' ? 'In scope' : TYPE[x.type];
    const touches = [...x.reqs, ...x.steps].map(id => `<i class="sm-x k-${esc(A(id).type)}" data-sel="${esc(id)}">${esc(A(id).type === 'journey' ? stepOf(id).num + ' ' + A(id).title : id)}</i>`).join('');
    out.push(`<div class="sm-note n-${esc(kind)}${S.sel === x.id ? ' sel' : ''}${hl.on ? (hl.ids.has(x.id) ? ' lit' : ' dim') : ''}${x.type === 'assumption' && !x.confirmed ? ' open' : ''}" data-card="${esc(x.id)}" style="left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px" tabindex="0" role="button"><small>${esc(head)} · ${esc(x.id)}${x.type === 'assumption' ? (x.confirmed ? '' : ' · not confirmed') : ''}</small><b>${esc(x.title)}</b><span>${touches || (kind === 'out' ? '<em>nothing in the design touches it</em>' : '<em>touches no requirement</em>')}</span></div>`);
  }
  return out.join('');
}
function contextHeads() {
  const box = root.querySelector('.cm-heads-in'), inScope = [...SM.limits.values()].filter(x => x.type === 'scope' && x.scopeMode !== 'out');
  const T = {people: ['People', 'who takes part in the journey'], system: [SM.name || 'The system', inScope.length ? 'in scope: ' + inScope.map(x => x.title).join('; ') : 'the journey it runs'], why: ['Outcomes', 'why the system exists'], owners: ['Owners', 'who answers for each outcome']};
  box.innerHTML = L.lanes.map(ln => `<div class="sm-lh ${esc(ln.id)}" style="left:${ln.x + 4}px;width:${ln.w - 8}px;top:8px;height:${CT.HEAD_H - 8}px"><small>${ln.id === 'system' ? 'The system · its boundary' : esc(T[ln.id][0])}</small><b>${esc(ln.id === 'system' ? T.system[0] : T[ln.id][0])}</b><span>${esc(T[ln.id][1])}</span></div>`).join('');
  box.style.width = L.W + 'px';
}

// ---------------------------------------------------------------- chrome

function crumbs() {
  const sc = scope(), parts = [`<button type="button" data-sm="scope" data-kind="system" class="${['system', 'journey'].includes(sc.kind) ? 'here' : ''}">${esc(SM.journeys.length > 1 ? selectedJourney().title : 'Whole journey')}</button>`];
  if (!['system', 'journey'].includes(sc.kind)) parts.push('<span>›</span>', `<button type="button" class="here" data-sm="noop">${esc({step: 'Step ', actor: '', outcome: ''}[sc.kind] + (sc.kind === 'step' ? stepOf(sc.id).num + ' ' : '') + titleOf(sc.id))}</button>`);
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
const keyLine = k => `<svg class="k-line" width="40" height="10" aria-hidden="true"><path class="sm-route ${k}" d="M2 5H31"/>${headPath(38, 5, 'r', HEAD[k], 'sm-head ' + k)}</svg>`;
function chrome() {
  const sc = scope();
  root.querySelector('.cm-crumbs').innerHTML = crumbs();
  root.querySelectorAll('.cm-view').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === S.view)));
  root.querySelector('.cm-lenses').innerHTML = LENSES.map(l => `<button type="button" class="cm-lens" data-sm="lens" data-id="${esc(l.id)}" aria-pressed="${S.lens === l.id}" title="${esc(l.q + ' Like the ' + l.like + '.')}">${icon(l.id)}<span>${l.label}</span></button>`).join('');
  const dp = depth();
  const journeyPicker = SM.journeys.length > 1 ? `<label class="sm-journey-picker"><span>Journey</span><select aria-label="Choose journey" data-sm-journey>${SM.journeys.map(j => `<option value="${esc(j.id)}" ${selectedJourney().id === j.id ? 'selected' : ''}>${esc(j.title)} · ${j.steps.length} steps</option>`).join('')}</select></label>` : '';
  root.querySelector('.cm-depth').innerHTML = journeyPicker + (!ctxView() && ['system', 'journey'].includes(sc.kind) ? `<span>Elements</span>${[['steps', 'Steps'], ['requirements', 'Requirements']].map(([id, t]) => `<button type="button" class="cm-dep" data-sm="depth" data-id="${esc(id)}" aria-pressed="${dp === id}">${t}</button>`).join('')}` : '');
  const visible = sc.kind === 'journey' ? selectedJourney().steps : SM.steps.map(s => s.id), visibleSet = new Set(visible), qs = [...SM.R.values()].filter(q => sc.kind !== 'journey' || q.offJourney || q.steps.some(id => visibleSet.has(id))), holes = visible.filter(id => stepOf(id).hole).length, open = qs.filter(q => !q.testable).length, slices = PRIORITIES.filter(p => qs.some(q => q.priority === p));
  root.querySelector('.cm-state').textContent = ctxView()
    ? `${SM.actors.size} ${SM.actors.size === 1 ? 'person' : 'people'} · ${visible.length} journey steps · ${SM.outcomes.size} outcome${SM.outcomes.size === 1 ? '' : 's'} · ${SM.stakeholders.size} owner${SM.stakeholders.size === 1 ? '' : 's'} · ${SM.limits.size} limit${SM.limits.size === 1 ? '' : 's'} on the design`
    : `${qs.length} requirement${qs.length === 1 ? '' : 's'} over ${visible.length} step${visible.length === 1 ? '' : 's'} · ${holes} step${holes === 1 ? '' : 's'} without one · ${open} not testable · ${slices.join(' / ') || 'no slice'}`;
  const g = ghost();
  root.querySelector('.cm-banner').innerHTML = g ? `<section class="dp-banner"><span class="ip-kicker">${esc(TYPE[g.record.type] || 'Record')} proposal · not saved</span><b>${esc(g.record.title)}</b><small>${esc(g.reason || g.label || '')}</small><button type="button" class="cm-btn gold" data-r-action="edit-ghost">Review &amp; edit</button><button type="button" class="cm-btn" data-r-action="dismiss-ghost">Dismiss</button></section>` : '';
  const sel = S.sel && A(S.sel) ? A(S.sel) : null;
  root.querySelector('.sm-addmenu').innerHTML = `${['requirement', 'journey', 'outcome', 'actor', 'stakeholder', 'constraint', 'assumption', 'scope'].map(t => `<button type="button" data-sm="add" data-type="${t}">New ${esc(TYPE[t].toLowerCase())}</button>`).join('')}<button type="button" data-sm="link" data-from="${esc(sel?.id || '')}">${sel ? 'Connect ' + esc(sel.id) + ' to…' : 'Connect two records'}</button>`;
  root.querySelector('.cm-legend').innerHTML = ctxView()
    ? `<p><span class="k-boundary"></span>The system's boundary</p><p>${keyLine('participates')}<span>Takes part in</span></p><p>${keyLine('delivers')}<span>Delivers, through the requirements named</span></p><p>${keyLine('owns')}<span>Owns</span></p><p><svg class="k-join" width="40" height="19" aria-hidden="true"><path class="sm-route participates" d="M2 4H31M12 4V16H31"/><circle class="sm-join participates" cx="12" cy="4" r="2.4"/>${headPath(38, 4, 'r', 7, 'sm-head participates')}${headPath(38, 16, 'r', 7, 'sm-head participates')}</svg><span>A line divides at a dot, one branch per step or outcome. Each branch is one recorded relationship; the dot is a drawing join, not an ArchiMate junction</span></p><p><span class="k-note"></span>A limit on the design</p>`
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
  return `<section class="cm-spec"><h4 aria-level="3">Requirement · ${esc(q.id)}<span class="${st === 'confirmed' ? 'guarded' : ''}">${STATE[st]}</span></h4><p class="cm-spec-t"><b>${esc(q.title)}</b></p>${q.description ? `<p>${esc(q.description)}</p>` : ''}<dl class="cm-dl"><div><dt>Priority</dt><dd>${esc(q.priority)}</dd></div><div class="${q.steps.length ? '' : 'miss'}"><dt>Needed at</dt><dd>${q.steps.map(link).join('') || 'No journey step'}</dd></div><div class="${q.testable ? '' : 'miss'}"><dt>Accepted when</dt><dd>${esc(q.acceptance || 'Not recorded')}${q.testable ? '' : '<br><b>Cannot be tested yet</b>: name the starting condition, the action and the observable result.'}</dd></div><div class="${q.outcomes.length ? '' : 'miss'}"><dt>Delivers</dt><dd>${q.outcomes.map(link).join('') || 'No outcome'}</dd></div>${owners.length ? `<div><dt>Owned by</dt><dd>${owners.map(link).join('')}</dd></div>` : ''}${[...q.scope, ...q.constraints, ...q.assumptions].length ? `<div><dt>Limited by</dt><dd>${[...q.scope, ...q.constraints, ...q.assumptions].map(x => `<button type="button" class="cm-link" data-sel="${esc(x)}">${esc(refTitle(x))}${A(x).type === 'assumption' && !A(x).confirmed ? '<em> · not confirmed</em>' : ''}</button>`).join('')}</dd></div>` : ''}<div><dt>Quality</dt><dd>${esc(q.drivers.join(', ') || 'No quality driver refines it')}</dd></div><div class="${q.covers.length ? '' : 'miss'}"><dt>Covered by</dt><dd>${q.covers.map(r => `<a class="cm-link" href="${esc(projectURL('/?chapter=4&tab=model&object=' + encodeURIComponent(r.id)))}">${esc(r.ref + ' ' + r.title)} <small>Chapter 4</small></a>`).join('') || 'No Chapter 4 responsibility'}</dd></div><div class="${q.accountable ? '' : 'miss'}"><dt>Owner</dt><dd>${esc(q.owner || 'Not named')}${q.source ? `<small class="sm-srcl">${esc(q.source)}</small>` : ''}</dd></div></dl>
  <div class="cm-acts">${act('edit', `data-id="${esc(id)}"`, icon('edit') + 'Edit requirement', 'primary')}${act('link', `data-from="${esc(id)}" data-kind="delivers"`, icon('link') + 'Connect')}${proposeFor(id)}${q.steps.length ? `<button type="button" class="cm-btn" data-sm="dissect" data-id="${esc(q.steps[0])}">${icon('dissect')}Focus on its step</button>` : ''}${q.covers.length ? `<a class="cm-btn" href="${esc(projectURL('/?chapter=4&tab=model&object=' + encodeURIComponent(q.covers[0].id)))}">${icon('layers')}Its responsibility</a>` : ''}${brain()}<button type="button" class="cm-btn" data-brain-launch="mind">${icon('mind')}Co-design</button></div></section>`;
}
function specimenStep(id) {
  const s = stepOf(id), st = stateOf(s);
  return `<section class="cm-spec"><h4 aria-level="3">Journey step · ${esc(s.num)}${s.hole ? '<span class="exposed">No requirement</span>' : `<span>${STATE[st]}</span>`}</h4><p class="cm-spec-t"><b>${esc(s.title)}</b></p>${s.description ? `<p>${esc(s.description)}</p>` : ''}<dl class="cm-dl"><div><dt>Journey</dt><dd>${esc(s.journeyId || 'Main journey')}</dd></div><div><dt>Taking part</dt><dd>${s.actors.map(link).join('') || '<em>No person — the system acts alone</em>'}</dd></div><div class="${s.reqs.length ? '' : 'miss'}"><dt>Needs</dt><dd>${s.reqs.map(link).join('') || 'No requirement'}</dd></div><div><dt>Delivers</dt><dd>${[...new Set(s.reqs.flatMap(q => R(q).outcomes))].map(link).join('') || '<em>No outcome</em>'}</dd></div><div class="${!s.next || s.linkedNext ? '' : 'miss'}"><dt>Next</dt><dd>${s.next ? esc(stepOf(s.next).num + ' ' + stepOf(s.next).title) + (s.linkedNext ? '' : ' — order not recorded') : 'This journey ends here'}</dd></div></dl>
  <div class="cm-acts">${act('add-for-step', `data-step="${esc(id)}"`, icon('plus') + 'Add a requirement for it', 'primary')}${act('edit', `data-id="${esc(id)}"`, icon('edit') + 'Edit step')}${s.next && !s.linkedNext ? act('link', `data-from="${esc(id)}" data-kind="precedes" data-to="${esc(s.next)}"`, 'Record the order') : ''}${proposeFor(id)}<button type="button" class="cm-btn" data-sm="dissect" data-id="${esc(id)}">${icon('dissect')}Focus on this step</button>${act('story', `data-id="${esc(id)}" aria-pressed="${S.story === id}" title="What happens at this step, told from the records on its trace"`, icon('story') + 'Read as a story')}${brain()}</div></section>`;
}
function specimenOther(id) {
  const a = A(id), st = stateOf(a);
  let rows = '', focus = '';
  if (a.type === 'actor') { const x = SM.actors.get(id); rows = `<div class="${x.steps.length ? '' : 'miss'}"><dt>Takes part in</dt><dd>${x.steps.map(link).join('') || 'No step'}</dd></div>`; focus = x.steps.length ? `<button type="button" class="cm-btn" data-sm="dissect" data-id="${esc(id)}">${icon('dissect')}Only their journey</button>` : ''; }
  else if (a.type === 'outcome') { const o = SM.outcomes.get(id); rows = `<div class="${o.reqs.length ? '' : 'miss'}"><dt>Delivered by</dt><dd>${o.reqs.map(link).join('') || 'No requirement'}</dd></div><div class="${o.owners.length ? '' : 'miss'}"><dt>Owned by</dt><dd>${o.owners.map(link).join('') || 'No stakeholder'}</dd></div><div class="${o.measure ? '' : 'miss'}"><dt>Measure</dt><dd>${esc(o.measure || 'Not defined')}</dd></div><div><dt>Baseline → target</dt><dd>${esc(o.baseline || 'Not recorded')} → ${esc(o.target || 'Not recorded')}${o.by ? ` <small>by ${esc(o.by)}</small>` : ''}</dd></div>`; focus = o.reqs.length ? `<button type="button" class="cm-btn" data-sm="dissect" data-id="${esc(id)}">${icon('dissect')}Only what delivers it</button>` : ''; }
  else if (a.type === 'stakeholder') { const x = SM.stakeholders.get(id); rows = `<div class="${x.outcomes.length ? '' : 'miss'}"><dt>Owns</dt><dd>${x.outcomes.map(link).join('') || 'No outcome'}</dd></div>`; }
  else { const x = SM.limits.get(id); rows = `${a.type === 'scope' ? `<div><dt>Boundary</dt><dd>${a.scopeMode === 'out' ? 'Out of scope' : 'In scope'}</dd></div>` : ''}<div><dt>Touches</dt><dd>${[...x.reqs, ...x.steps, ...x.others].map(link).join('') || '<em>Nothing yet</em>'}</dd></div>`; }
  return `<section class="cm-spec"><h4 aria-level="3">${esc(TYPE[a.type] || 'Record')} · ${esc(a.id)}<span class="${st === 'confirmed' ? 'guarded' : ''}">${STATE[st]}</span></h4><p class="cm-spec-t"><b>${esc(a.title)}</b></p>${a.description ? `<p>${esc(a.description)}</p>` : ''}<dl class="cm-dl">${rows}<div><dt>Owner</dt><dd>${esc(a.owner || 'Not named')}</dd></div></dl><div class="cm-acts">${act('edit', `data-id="${esc(id)}"`, icon('edit') + 'Edit', 'primary')}${act('link', `data-from="${esc(id)}"`, icon('link') + 'Connect')}${proposeFor(id)}${focus}${brain()}</div></section>`;
}
function specimenProposal() {
  const g = proposal(); if (!g) return '';
  const terms = g.record.type === 'requirement' ? `<div><dt>Priority</dt><dd>${esc(g.record.priority)}</dd></div><div><dt>Accepted when</dt><dd>${esc(g.record.acceptance || '—')}</dd></div>` : `<div><dt>Kind</dt><dd>${esc(TYPE[g.record.type] || g.record.type)}${g.record.type === 'assumption' ? ' · not confirmed' : ''}</dd></div>${g.record.description ? `<div><dt>Says</dt><dd>${esc(g.record.description)}</dd></div>` : ''}`;
  return `<section class="cm-spec"><h4 aria-level="3">Proposal · not saved</h4><p class="cm-spec-t"><b>${esc(g.record.title)}</b></p><p>${esc(g.reason || '')}</p><dl class="cm-dl">${terms}<div><dt>Would connect</dt><dd>${(g.links || []).map(([f, k, t]) => esc((f === 'new' ? 'it' : refTitle(f)) + ' ' + k + ' ' + (t === 'new' ? 'it' : refTitle(t)))).join('<br>') || 'Nothing yet — connect it when you review it'}</dd></div></dl><div class="cm-acts"><button type="button" class="cm-btn gold" data-r-action="edit-ghost">${icon('edit')}Review &amp; edit</button><button type="button" class="cm-btn" data-r-action="dismiss-ghost">Dismiss</button></div></section>`;
}
function reading() {
  if (diagramView()) return NT.readingHTML();
  if (ctxView()) return `<section><h4 aria-level="3">Reading this view</h4><p>The <b>system</b> is the boxed column: its journey steps, in order. <b>People</b> who take part stand to its left; the <b>outcomes</b> it exists for, and the <b>owners</b> who answer for them, to its right. Each line to an outcome names the requirements that deliver it.</p><p>Beneath: what limits the design — what is in and out of scope, constraints and assumptions.</p></section>`;
  return `<section><h4 aria-level="3">Reading this view</h4><p>A <b>story map</b>. The journey's steps run across as the backbone; the <b>priority slices</b> run down — Must, then Should, then Could. <b>Not stated</b> holds requirements whose priority still needs a decision. Each requirement stands under the step that needs it and carries, along its foot, the <b>Chapter 4 responsibility</b> that covers it.</p><p>A dashed card is a step with no requirement; ⋯ between steps means their order is not recorded.${SM.steps.length ? ' <b>Walk the journey</b> to read it step by step.' : ''}</p></section>`;
}
// Gaps and risks first, eight of how many, and "Show all" (round 12, G, GR-UX-04, GR-UX-08: insightsSection).
function insightsHTML() {
  const list = storyInsights(SM, scope());
  const g = ghost();
  return insightsSection(list, {key: 'story', item: x => { const q = x.proposal ? SM.proposals.find(p => p.id === x.proposal) : null; return `<div class="sm-insw"><button type="button" class="cm-ins ${esc(x.kind)}" data-sel="${esc(x.id || '')}"><span>${esc(x.text)}</span>${x.ask ? `<small>Ask: ${esc(x.ask)}</small>` : ''}</button>${q && g?.id !== q.id ? `<button type="button" class="cm-mini gold sm-inp" data-r-proposal="${esc(q.id)}" data-focus="${esc(q.target || x.id || '')}">${esc(q.label)}</button>` : ''}${x.cause && x.count > 5 ? `<button type="button" class="cm-mini sm-inp" data-r-cause="${esc(x.cause)}">Show all ${esc(x.count.toLocaleString('en-GB'))}</button>` : ''}</div>`; }, note: `<p class="cm-muted">Drawn from recorded journey steps, requirements, outcomes and limits, and Chapter 4's responsibilities. Prompts for review, not verdicts.</p>`});
}
function findingsHTML() {
  const sc = scope(), fs = SM.findings.filter(f => f.code !== 'confirmation' && (sc.kind === 'system' || concerns(sc.id).ids.has(f.artefactId)));
  if (!fs.length) return '';
  const groups = new Map();
  for (const f of fs) { if (!groups.has(f.title)) groups.set(f.title, []); groups.get(f.title).push(f); }
  return `<section><h4 aria-level="3">Chapter 1 checks<span>${fs.length}</span></h4>${[...groups].sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([k, g]) => `<button type="button" class="cm-fg ${g.some(f => f.level === 'error') ? 'error' : ''}" data-sel="${esc(known(g[0].artefactId) ? g[0].artefactId : '')}"><b>${esc(k)}</b><small>${g.length} · ${esc([...new Set(g.map(f => f.artefactId))].slice(0, 4).join(', '))}${g.length > 4 ? '…' : ''}</small></button>`).join('')}<a class="cm-muted" href="${esc(projectURL('/?chapter=1&tab=validate&validate=readiness'))}">All checks on Validate →</a></section>`;
}
function panel() {
  const box = companionHost(root);
  solMark(root, project(), 1);
  if (!companionOpen(root, S.panel)) { box.innerHTML = ''; return; }
  const s = S.sel, a = s && A(s);
  let spec = s === PROPOSED ? specimenProposal() : !a ? '' : a.type === 'requirement' ? specimenRequirement(s) : a.type === 'journey' ? specimenStep(s) : specimenOther(s);
  if (!spec && s && drawn(s)) spec = NT.specimenHTML(s);
  spec = NT.withSelected(spec, s);
  const proc = PE && processShown() ? PE.processDetailsHTML(project(), {id: s, edgeId: NT.state.selEdge, frozen: !!NT.state.baseline}) + PE.processGuideHTML(project(), {selectedId: s, frozen: !!NT.state.baseline}) : '';
  // The walk reads the current step as a story first; "Read as a story" tells the selected step beneath its specimen.
  const walking = S.walk >= 0 ? SM.steps[S.walk]?.id || null : null, told = walking || (S.story && S.story === s ? s : null), story = told ? storyHTML(told) : '';
  box.innerHTML = (walking ? story : '') + solInto(spec, solSection(project(), 1, s)) + (walking ? '' : story) + proc + reading() + insightsHTML() + findingsHTML();
}
// "Read as a story" (round 6, R6-G): the step's trace through the layers — requirement, quality driver, decision,
// responsibility, component, capability, realization, contract or data, control, placement, running part — told from
// the records (trace-narrative.js). Each reference links to its record: a Chapter 1 record is selected here, another
// chapter's record opens on its own model.
function storyHTML(id) {
  const p = project(); if (!p || !id || !A(id)) return '';
  let T = null; try { T = traceFrom(p, id); } catch (e) { console.warn('The story could not be read.', e?.message); }
  return T ? traceStoryHTML(p, T, {href: (rid, ch) => projectURL(`/?chapter=${ch || 1}&tab=model&object=${encodeURIComponent(rid)}`)}) : '';
}

// ---------------------------------------------------------------- walking the journey

function walkBar() {
  if (diagramView()) { root.querySelector('.cm-walk-in').innerHTML = ''; return; }
  const bar = root.querySelector('.cm-walk-in'), steps = walkSteps(), n = steps.length, at = S.walk >= 0 ? steps.indexOf(SM.steps[S.walk]?.id) : -1;
  if (!n) { bar.innerHTML = '<p class="cm-walk-text">Add journey steps to walk the journey.</p>'; return; }
  const cur = at >= 0 ? stepOf(steps[at]) : null;
  bar.innerHTML = `<button type="button" class="cm-btn" data-sm="walk-prev" aria-label="Previous step" ${at <= 0 ? 'disabled' : ''}>‹</button><button type="button" class="cm-btn" data-sm="walk-next">${at < 0 ? icon('play') + '<span>Walk the journey</span>' : at >= n - 1 ? 'Done' : 'Next ›'}</button><p class="cm-walk-text">${cur ? `<b>${at + 1} / ${n}</b> ${esc(describeStep(SM, cur.id))}` : `${n} journey steps. At each one: who takes part, what it needs, and why.`}</p>${at >= 0 ? '<button type="button" class="cm-btn icon" data-sm="walk-stop" aria-label="Stop the walk">×</button>' : ''}`;
}
function walkTo(i) {
  const steps = walkSteps(); if (!steps.length) return;
  if (!['system', 'journey'].includes(scope().kind)) { S.scope = {kind: 'system'}; fitPending = true; }
  S.walk = SM.steps.findIndex(s => s.id === steps[Math.max(0, Math.min(steps.length - 1, i))]);
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
  if (!L || !root) return;
  // A dismissed proposal can leave the Boundary camera at its lower notes. On a
  // fresh visit with nothing selected, bring the first person back below the
  // fixed headings, where the journey can be read and clicked again.
  if (!S.sel && ctxView()) {
    const first = L.cards.find(c => SM.actors.has(c.id)) || L.cards[0];
    if (first) stage.reveal(first.x, first.y, first.w, first.h);
    return;
  }
  if (!S.sel) return;
  if (!ctxView()) { const col = L.cols.find(c => c.step === S.sel); if (col) { stage.reveal(col.x, L.top, col.w, 140); return; } }
  const c = (L.cards || []).find(x => x.id === S.sel) || (L.notes || []).find(x => x.id === S.sel);
  if (c) stage.reveal(c.x, c.y, c.w, c.h);
}
function select(id, {reveal = false} = {}) {
  S.sel = id || null; S.walk = -1;
  const step = stepOf(S.sel) || (R(S.sel)?.steps.length ? stepOf(R(S.sel).steps[0]) : null);
  if (step && SM.journeys.length > 1 && step.journeyId !== S.journey) { S.journey = step.journeyId; S.scope = {kind: 'system'}; fitPending = true; }
  if (S.story && S.story !== S.sel) S.story = null;
  const p = project(), target = S.sel && S.sel !== PROPOSED ? S.sel : null;
  if (target) page()?.focus(target);
  if (p && target) { try { mountBrainContext(p, {id: target, chapter: 1}, 'model'); } catch { /* assistance is optional */ } }
  announceObject(target);
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
  solChapterBind(root, 1, {refresh: solRefresh});
  listen(root, 'change', e => { if (e.target.matches('[data-sm-journey]')) { S.journey = e.target.value; S.scope = {kind: 'system'}; S.walk = -1; S.sel = null; S.story = null; fitPending = true; save(); render(); return; } NT.change(e); });
  listen(root, 'click', e => {
    if (root.dataset.suppress) return;
    const pe = e.target.closest('[data-pe]');
    if (pe) { if (!pe.disabled) PE?.processAction(pe, processContext()); return; }
    if (NT.handle(e)) return;
    const add = root.querySelector('.cm-add');
    if (add?.open && !e.target.closest('.cm-add > summary')) add.open = false;
    // The page's own editors and proposals handle these; point it at the record first.
    const pr = e.target.closest('[data-r-proposal]');
    if (pr) { page()?.focus(pr.dataset.focus || S.sel); return; }
    // A reference in a story: a Chapter 1 record is selected here; another chapter's record opens on its own model.
    const ref = e.target.closest('[data-cm-open]');
    if (ref && inCompanion(ref)) { if (knownBase(ref.dataset.cmOpen)) { e.preventDefault(); e.stopPropagation(); select(ref.dataset.cmOpen, {reveal: true}); } return; }
    if (e.target.closest('[data-brain-launch],[data-r-action],[data-r-edit],a')) return;
    const a = e.target.closest('[data-sm]');
    if (a && !a.disabled) {
      const k = a.dataset.sm;
      if (k === 'story') { S.story = S.story === a.dataset.id ? null : a.dataset.id; S.walk = -1; render(); if (S.story) nextFrame(() => companionOf(root)?.querySelector('.tn-story')?.scrollIntoView?.({block: 'nearest'})); return; }
      if (k === 'view') { S.view = a.dataset.id; S.walk = -1; fitPending = true; save(); render(); revealSelection(); return; }
      if (k === 'lens') { S.lens = a.dataset.id; save(); render(); return; }
      if (k === 'depth') { S.depth = a.dataset.id; fitPending = true; save(); render(); return; }
      if (k === 'scope') { setScope({kind: 'system'}); return; }
      if (k === 'dissect') { setScope({kind: 'x', id: a.dataset.id}); return; }
      if (k === 'expand') { const on = !document.body.classList.contains('cm-expanded'); document.body.classList.toggle('cm-expanded', on); a.setAttribute('aria-pressed', String(on)); sizeModel(root, 'cm-expanded'); fitPending = true; nextFrame(() => render()); return; }
      if (k === 'panel') { S.panel = !S.panel; save(); fitPending = true; render(); nextFrame(() => { fitPending = true; render(); }); return; }
      if (k === 'key') { const key = root.querySelector('.cm-key'); key.classList.toggle('cm-min'); a.setAttribute('aria-expanded', String(!key.classList.contains('cm-min'))); return; }
      if (k === 'fit') { stage.fitAll(); return; }
      if (k === 'zin' || k === 'zout') { const {w, h} = stage.box(); stage.zoomAt(stage.cam.z * (k === 'zin' ? 1.15 : 1 / 1.15), w / 2, h / 2); return; }
      if (k === 'walk-next') { const steps = walkSteps(), at = S.walk < 0 ? -1 : steps.indexOf(SM.steps[S.walk]?.id); if (at >= steps.length - 1) { S.walk = -1; render(); } else walkTo(at + 1); return; }
      if (k === 'walk-prev') { const at = walkSteps().indexOf(SM.steps[S.walk]?.id); walkTo(Math.max(0, at - 1)); return; }
      if (k === 'walk-stop') { S.walk = -1; render(); return; }
      if (['edit', 'add', 'add-for-step', 'link'].includes(k)) { if (add) add.open = false; onAct(k, a); return; }
      if (k === 'noop') return;
    }
    const lane = e.target.closest('[data-lane]');
    if (lane && !e.target.closest('[data-sel]')) {
      const id = lane.dataset.lane; if (id === 'off') return;
      const now = Date.now(), twice = lastClick.id === 'H:' + id && now - lastClick.t < 420; lastClick = {id: 'H:' + id, t: now};
      if (twice) { lastClick = {id: null, t: 0}; setScope({kind: 'step', id}); return; }
      if (S.walk >= 0) { walkTo(walkSteps().indexOf(id)); return; }
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
    if (s && s.dataset.sel) { e.stopPropagation(); select(s.dataset.sel, {reveal: !!inCompanion(s)}); return; }
    if (e.target.closest('.cm-stage') && !e.target.closest('.cm-heads,.cm-rail,.cm-zoom,.cm-key') && (S.sel || S.walk >= 0)) { S.walk = -1; select(null); }
  });
  listen(root, 'keydown', e => { if (NT.keydown(e)) return; if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-card]')) { e.preventDefault(); const id = e.target.dataset.card; if (!id.startsWith('C:')) select(id.startsWith('HOLE:') ? id.slice(5) : id); } });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !root?.isConnected || document.querySelector('dialog[open]')) return;
    const a = document.activeElement;
    if (a && a !== document.body && !root.contains(a)) return;
    if (a?.closest?.('select,details[open]')) return;
    if (S.walk >= 0) { S.walk = -1; render(); }
    else if (S.story) { S.story = null; render(); }
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
