// Perspectives (round 5, R5-C: one picture world). A perspective is one concern of the connected model — Structure,
// Process, Realization, Behaviour, Data, Protection, Deployment or Rationale — over a scope (the whole system or one of
// its modules), drawn as that concern's standard picture by the notation kit (notation-model.js builds it, notation-
// layout.js arranges it, notation-svg.js draws it) on the model stage (model-stage.js), with its companion in the
// shell's column. Every chapter's Model switcher carries a Perspectives group after the chapter's own views and the
// shared ones: the project's saved perspectives and "New perspective…". A perspective chosen there is the chapter's
// current view, in the same frame as any other: the sidebar's layers and the marks apply; Fit, zoom, the overview and
// the Key are the kit's. The shell keeps a saved one in the address (modelView=), so a reload lands on it.
// Presentation only: saving a perspective is the existing workspace.view command. The Process perspective's companion
// carries the process's own authoring (process-editing.js), each change reviewed before it applies.
import {architectureModel, architectureScope, explorationContext, CONCERNS, CHAPTER_STAGES} from './architecture-model.js';
import {notationDiagram, stripToLayers, describeNode, describeEdge, arrangementsFor, architectureArrangement, ALL_ARRANGEMENTS, SCENES, CHAPTER_SCENES, LAYERS, LAYER_NAMES, styleOf} from './notation-model.js';
import {notationLayout, NL} from './notation-layout.js';
import * as NS from './notation-svg.js';
import {iconSVG, markerRef} from './notation-palette.js';
import {chapterLayers, layerSummary, layerCounts, hiddenNoteHTML} from './layers-view.js';
import {modelStage, edgesHTML, toolsHTML, companionHost, listen, releaseCompanion, sizeModel, nextFrame, openInWorkHTML, placeTip, focusKey, refocus, setState, announceObject, refreshModelReading, placeChapterState} from './model-stage.js';
import {solChapterMount, solChapterBind, solSection, solInto, solOwner} from './chapter-sol.js';
import {homeChapter} from './chapter-reasoning.js';
import {processGuideHTML, processDetailsHTML, processAction, paintScenario} from './process-editing.js';
import {liftParts, edgeLinesHTML, nodeLinesHTML, edgeHoverHTML, bundleHoverHTML, hoverReadInto, drawnLines} from './notation-view.js';
import {mountBrainContext} from './brain-context-ui.js';
import {projectPreferenceKey, projectURL, currentProject as project, onProjectSwitch, scopedProject} from './project-context.js';
import {baselinePartNow} from './project-store.js';
import {esc} from './html-escape.js';
import {chapterHasRecords, watchViewRail, currentModelPurpose, modelHeaderHTML, trayButtonsHTML, sharedButtonsHTML, ownViews, questionPickerHTML} from './instrument-tray.js';
import {modelDossierHTML} from './model-dossier.js';
import {solStatus, solStatusLine} from './brain-reasoning-ui.js';

// The process's authoring travels with this view (one chunk, loaded with every chapter model): Chapter 1's Model and
// Chapter 11's settlement trace reach it through this module.
export {processGuideHTML, processDetailsHTML, processAction, paintScenario, takeTrace, traceProcess} from './process-editing.js';

const PREFIX = 'pv';
// The pictures that carry each concern, the first one a chapter holds being the one drawn (CHAPTER_SCENES): a
// realization saved in Chapter 6 reads as the solution architecture, the same concern elsewhere as the application.
const SCENES_OF = {structure: ['logical'], process: ['process'], realization: ['application', 'solution', 'stack', 'usage'], behaviour: ['cooperation', 'integration'], data: ['data', 'lineage'], security: ['security'], deployment: ['deployment', 'usage'], rationale: ['rationale', 'decisions', 'drivers', 'motivation']};
// The concern a new perspective starts on: the chapter's own (CHAPTER_STAGES), and for Chapters 1–3 what they record.
const START = {1: 'process', 2: 'rationale', 3: 'rationale'};
export const concernOf = chapter => CHAPTER_STAGES[chapter]?.concern || START[chapter] || 'structure';
export function sceneOf(concern, chapter) {
  const wanted = SCENES_OF[concern] || SCENES_OF.structure, held = CHAPTER_SCENES[Number(chapter)] || [];
  return wanted.find(s => held.includes(s)) || wanted[0];
}
// The project's saved perspectives: its saved views that carry a concern and a scope.
export const perspectivesOf = p => (p?.workbench?.views || []).filter(v => v && v.id && v.exploration);
export const perspectiveKnown = id => id === 'new' || perspectivesOf(project()).some(v => v.id === id);
const concernTitle = id => (CONCERNS.find(([c]) => c === id) || CONCERNS[0])[1];
const scopeTitle = (M, id) => (!id || id === M.root || !M.objects.has(id) ? 'Whole system' : M.objects.get(id).title);
// A frozen baseline's design source is read when a perspective on it is drawn (round 12, GR-PERF-13: project-store.js
// baselinePartNow); the picture is drawn again when it arrives.
const baselineOf = id => (id ? (project()?.finalReview?.baselines || []).find(b => b.id === id && (b.source || b.frozen)) || null : null);

const svgIcon = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON = {lens: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', panel: 'M3 4h18v16H3zM15 4v16', plus: 'M12 5v14M5 12h14'};

// A selected relationship read from the records behind it: what it means, its source, and what still needs checking (a
// contract's owner, timeout, repeat handling and caller authority; a shared dependency's capacity; a control's evidence).
// For the payment network contract it names the requirement, scenario and decision the settlement investigation follows.
export function relationshipReading(project,model,edge){
 const from=model.objects.get(edge.from),to=model.objects.get(edge.to),underlying=(edge.via||[]).map(id=>model.relationships.find(e=>e.id===id)||model.objects.get(id)).filter(Boolean);
 const contractId=edge.attributes?.contractId||[from,to,...underlying].find(o=>o?.type==='contract')?.id;
 const contract=project.interfaces?.contracts?.find(c=>c.id===contractId);
 const illustrative=[from,to].some(o=>o?.status==='Illustrative')||contract?.origin==='reference';
 const checks=[];
 if(edge.derived)checks.push('This line is a projection of the recorded links; inspect its underlying identities.');
 if(contract){
  if(!contract.owner||contract.owner==='To confirm with the provider')checks.push('Confirm the provider and accountable contract owner.');
  if(!contract.timeoutPolicy)checks.push('Define what a missing acknowledgement means.');
  if(!contract.retryPolicy||!contract.duplicatePolicy)checks.push('Agree retry and repeat handling before replay.');
  if(!contract.authorization)checks.push('Confirm caller authority at this boundary.');
 }
 if(edge.type==='requires')checks.push('Confirm capacity, failure behaviour and operating ownership of the shared dependency.');
 if(edge.type==='protects'&&from?.record?.review==null)checks.push('The intended control needs an enforcement test and reviewed evidence.');
 const linked=contractId==='network'&&(!project.workspace?.template||project.workspace.template==='bank-payment')?[project.artefacts?.find(r=>r.id==='REQ-004'),project.quality?.drivers?.find(d=>d.id==='QD-004'),project.decisions?.records?.find(d=>d.id==='ADR-003')].filter(Boolean):[];
 return {from,to,underlying,contract,illustrative,checks,linked,source:edge.source||'model projection',meaning:edge.attributes?.purpose||contract?.purpose||edge.attributes?.scope||edge.label,
  authority:contract?.evidence||from?.record?.source||to?.record?.source||''};
}

// ---------------------------------------------------------------- the switcher's Perspectives group

// The Perspectives group every chapter's Model toolbar ends with: a disclosure that lists the saved perspectives (name, concern, scope,
// chapter) and "New perspective…". `current` is the perspective the chapter shows, if it shows one. While a perspective
// is the view on screen (`onScreen`), its entry is the switcher's pressed view (.cm-view), as any other view's is; beside
// a chapter model the chapter's own views stay the only .cm-view entries.
function groupHTML(p, chapter, current, onScreen = false) {
  const list = perspectivesOf(p), on = list.find(v => v.id === current), M = p ? architectureModel(p) : null;
  // "New perspective…" is offered once the chapter holds a record (round 11, A: nothing is offered that has nothing to show).
  const canCompose = current === 'new' || (!!p && chapterHasRecords(p, chapter));
  const say = v => `${concernTitle(v.exploration.concern)} · ${M ? scopeTitle(M, v.exploration.scopeId) : 'Whole system'} · Chapter ${v.chapter}${v.exploration.baselineId ? ' · frozen baseline' : ''}`;
  const cls = onScreen ? 'pv-entry cm-view' : 'pv-entry';
  const entry = v => `<button type="button" class="${cls}" data-pv="open" data-id="${esc(v.id)}" aria-pressed="${v.id === current}" title="${esc(v.title + ' · ' + say(v))}"><span class="pv-name">${esc(v.title)}</span><small>${esc(say(v))}</small></button>`;
  const label = current === 'new' ? 'New perspective' : on ? on.title : 'Perspectives';
  const named = `${current ? 'Perspective: ' : ''}${label}${list.length ? ` · ${list.length} saved` : ''}`;
  return `<details class="pv-pick" data-pv-chapter="${esc(chapter)}"><summary class="pv-sum${current ? ' pv-on' : ''}" aria-label="${esc(named)}" title="Perspectives of the whole model: the saved ones, and a new one">${svgIcon(ICON.lens)}<span>${esc(label)}</span>${list.length ? `<span class="pv-count" aria-hidden="true">${list.length}</span>` : ''}</summary><div class="pv-list" role="group" aria-label="Perspectives">${list.map(entry).join('') || '<p class="pv-none">No perspective saved yet.</p>'}<button type="button" class="${cls} pv-new" data-pv="new" aria-pressed="${current === 'new'}"${canCompose ? '' : ' disabled title="Offered once this chapter holds a record"'}>${svgIcon(ICON.plus)}<span class="pv-name">New perspective…</span><small>${canCompose ? 'a concern of the whole model, over a scope' : 'once this chapter holds a record'}</small></button></div></details>`;
}
// The chapter's own entries (Diagram · its views · Layers · Table · Matrix · Whole design), as its model draws them,
// so a perspective keeps the switcher it was chosen from.
const switcherFor = chapter => ({html: trayButtonsHTML(chapter, 'pv') + sharedButtonsHTML('pv', project()), label: 'Model views'});
export const hasSwitcher = chapter => ownViews(chapter).length > 0;
// The group stands at the end of the model's title row, after its actions: the views keep their one row, the stage its
// height and the toolbar its order (title, where you are, views, actions), as on every chapter model.
function placeGroup(box, html) {
  const top = box.parentElement, row = top.querySelector(':scope > .cm-actions') || top, at = row.querySelector(':scope > .pv-pick');
  if (at && drawn.get(at) === html) return;
  const open = at?.open; if (at) at.remove();
  row.insertAdjacentHTML('beforeend', html);
  const fresh = row.lastElementChild; drawn.set(fresh, html); if (open) fresh.open = true;
}
function placeQuestions(box, chapter, current) {
  const row = box.parentElement.querySelector(':scope > .cm-actions') || box.parentElement;
  const html = questionPickerHTML(project(), chapter, current), at = row.querySelector(':scope > .cm-qpick');
  if (at && drawn.get(at) === html) return;
  const open = !!at?.open, focused = at?.contains(document.activeElement) ? document.activeElement.dataset.cmQuestion || 'summary' : null;
  at?.remove();
  const perspective = row.querySelector('.pv-pick');
  if (perspective) perspective.insertAdjacentHTML('beforebegin', html); else row.insertAdjacentHTML('beforeend', html);
  const fresh = row.querySelector('.cm-qpick'); drawn.set(fresh, html); fresh.open = open;
  if (focused) fresh.querySelector(focused === 'summary' ? 'summary' : `[data-cm-question="${CSS.escape(focused)}"]`)?.focus({preventScroll: true});
}
// A compact footer reading keeps rule-based checks separate from the connection
// status. The global Ask Sol remains the single request launcher in the shell.
function placeModelUtility(frame, chapter) {
  const footer = frame.querySelector('.cm-walk'); if (!footer) return;
  frame.querySelector('.cm-expanded-details')?.setAttribute('aria-expanded', String(document.body.dataset.panel === 'open'));
  let utility = footer.querySelector('.cm-model-utility');
  if (!utility) {
    utility = document.createElement('div'); utility.className = 'cm-model-utility';
    utility.innerHTML = '<span class="cm-reading-caption" hidden></span><a class="cm-link" data-model-checks>Chapter checks</a><details class="cm-connection"><summary></summary><div><p data-model-connection-detail></p><p>Chapter checks and recorded model relationships use saved project facts. A configured provider is only marked verified after a successful connection probe or request.</p></div></details>';
    footer.insertBefore(utility, footer.querySelector('.cm-tools'));
  }
  const link = utility.querySelector('[data-model-checks]'), href = projectURL('/?chapter=' + chapter + '&tab=validate');
  if (link.getAttribute('href') !== href) link.setAttribute('href', href);
  link.setAttribute('aria-label', 'Open Chapter ' + chapter + ' checks on Validate');
  const status = solStatus(), label = !status.checked ? 'Sol: checking connection' : !status.connected ? 'Sol: not connected' : status.verified ? 'Sol: verified' : 'Sol: configured, unverified';
  const summary = utility.querySelector('.cm-connection > summary'), detail = utility.querySelector('[data-model-connection-detail]'), line = solStatusLine();
  if (summary.textContent !== label) summary.textContent = label;
  if (detail.textContent !== line) detail.textContent = line;
  refreshModelReading(frame);
}
// The workspace owns the one purpose line. Views publish context rather than
// injecting another toolbar or rewriting shell markup.
function placeModelContext(box, chapter, current, perspective = null) {
  const frame = box.closest('.cm'); if (!frame) return;
  placeQuestions(box, chapter, perspective?.id || current);
  placeModelUtility(frame, chapter);
  const sceneId = frame.querySelector('[data-nt-field="scene"]')?.value || '';
  const reading = perspective ? {label: perspective.id ? perspective.title : 'New perspective', text: perspective.purpose || SCENES.find(s => s.id === sceneFor(perspective))?.purpose || ''} : currentModelPurpose(project(), chapter, current, sceneId);
  if (!reading) return;
  const detail = {chapter: Number(chapter), view: perspective?.id || current, ...reading};
  const key = JSON.stringify(detail);
  frame.dataset.modelContext = key;
  window.dispatchEvent(new CustomEvent('aiw:model-context', {detail}));
}
const watchedQuestions = new WeakMap();
function watchQuestions(box, chapter) {
  let watched = watchedQuestions.get(box);
  if (watched) { watched.chapter = chapter; watched.refresh(); return; }
  watched = {chapter, refresh() {
    if (!box.isConnected) return;
    const current = box.querySelector('.cm-view[aria-pressed="true"]:not([hidden])')?.dataset.id || '';
    placeModelContext(box, watched.chapter, current);
  }};
  watchedQuestions.set(box, watched);
  if (typeof MutationObserver === 'function') new MutationObserver(() => watched.refresh()).observe(box, {subtree: true, childList: true, attributes: true, attributeFilter: ['aria-pressed', 'hidden']});
  box.closest('.cm')?.addEventListener('change', () => queueMicrotask(() => watched.refresh()));
  watched.refresh();
}
// Called once a chapter model is on the page: its switcher gains the Perspectives group (refreshed on every mount, as
// the project's perspectives change) and is remembered for the perspectives this chapter shows.
export function attachPerspectives(chapter, h) {
  handles = h || handles; chapter = Number(chapter);
  const box = document.querySelector('.studio > .stage.tab-content > .cm:not(.pv):not(.cm-loading) > .cm-top > .cm-views'); if (!box) return;
  placeGroup(box, groupHTML(project(), chapter, null));
  watchQuestions(box, chapter);
}

// ---------------------------------------------------------------- the perspective on screen

let root = null, stage = null, here = null, viewId = null, handles = null, shown = false;
let full = null, D = null, L = null, built = {doc: null, key: ''}, sel = null, selEdge = null, fitPending = true, pendingFocus = null, pageSel;
let dossierRead = {doc: null, id: null, chapter: null, html: ''};
const drafts = new Map(); // chapter → the perspective being composed: {concern, scopeId, baselineId, title, purpose}
const drawn = new WeakMap(); // element → what it was last drawn from: a part is drawn again only when that changes
const freshDraft = chapter => ({concern: concernOf(chapter), scopeId: null, baselineId: null, title: '', purpose: ''});
// This browser's choices per picture, for the project on screen: the layers shown and the arrangement.
const prefKey = () => projectPreferenceKey('aiw-perspectives-v1');
let prefs = null; const arrangementHistory = new Map();
const arrangementKey = scene => `${viewId || 'new'}|${scene}`;
function readPrefs() {
  if (prefs?.key === prefKey()) return prefs;
  let v = {}; try { v = JSON.parse(localStorage.getItem(prefKey()) || '{}') || {}; } catch { v = {}; }
  const layers = {}, arrangement = {}, hubs = {};
  for (const [k, l] of Object.entries(v.layers || {})) if (Array.isArray(l)) layers[k] = l.filter(x => LAYERS.includes(x));
  for (const [k, a] of Object.entries(v.arrangement || {})) if (ALL_ARRANGEMENTS.some(x => x.id === a)) arrangement[k] = a;
  for (const [k, id] of Object.entries(v.hubs || {})) if (typeof id === 'string') hubs[k] = id;
  return (prefs = {key: prefKey(), layers, arrangement, hubs});
}
function savePrefs() { try { localStorage.setItem(prefKey(), JSON.stringify({layers: prefs.layers, arrangement: prefs.arrangement, hubs: prefs.hubs})); } catch { /* a preference: the picture works without it */ } }

// What is drawn: the saved perspective, or the one being composed in this chapter.
function subject() {
  if (viewId === 'new') { if (!drafts.has(here)) drafts.set(here, freshDraft(here)); return {...drafts.get(here), id: null, chapter: here}; }
  const v = perspectivesOf(project()).find(x => x.id === viewId); if (!v) return null;
  const x = v.exploration;
  return {id: v.id, title: v.title, purpose: v.purpose || '', chapter: Number(v.chapter) || here, concern: x.concern, scopeId: x.scopeId || null, baselineId: x.baselineId || null, selectedId: x.selectedId || v.objectId || null};
}
// The design state a perspective reads: the working design, or the frozen baseline it was saved on.
// Round 24 (D-24-08): a perspective of the working design reads the shell's module scope (project-context.js scopedProject).
const sourceOf = s => (s.baselineId ? baselinePartNow(project(), baselineOf(s.baselineId)) : scopedProject());
const sceneFor = s => sceneOf(s.concern, s.chapter);
const layersOf = scene => readPrefs().layers[scene] || [...LAYERS];
function arrangementOf(scene) {
  const offered = full ? arrangementsFor(full).map(a => a.id) : [], mine = readPrefs().arrangement[arrangementKey(scene)] || readPrefs().arrangement[scene];
  return [mine, SCENES.find(x => x.id === scene)?.arrangement, 'tree'].find(a => a && offered.includes(a)) || 'tree';
}
// The concern's picture, narrowed to the scope: the elements the scope reaches in the connected model (architecture-
// model.js architectureScope: a module's own records and what they connect to), with the containers that hold them.
// The process is drawn whole: its steps belong to the journey, not to one module.
function scoped(F, doc, scopeId, concern) {
  if (!F || concern === 'process') return F;
  const M = architectureModel(doc);
  if (!scopeId || scopeId === M.root || !M.objects.has(scopeId)) return F;
  // A realization reads the scope's own chain (what implements it), as the connected model's realization view does.
  const sc = architectureScope(M, scopeId), within = concern === 'realization' ? sc.core : sc.ids, reached = id => within.has(id) || (String(id).startsWith('party:') && within.has(String(id).slice(6)));
  const nodes = F.nodes.filter(n => reached(n.id)), ids = new Set(nodes.map(n => n.id)), used = new Set();
  for (const n of nodes) { let g = F.groups.find(x => x.id === n.group); while (g && !used.has(g.id)) { used.add(g.id); g = F.groups.find(x => x.id === g.parent); } }
  const out = {...F, nodes, groups: F.groups.filter(g => used.has(g.id)), edges: F.edges.filter(e => ids.has(e.from) && ids.has(e.to)), scopedFrom: F.nodes.length};
  out.counts = {nodes: out.nodes.length, groups: out.groups.length, edges: out.edges.length};
  return out;
}
// The picture a perspective draws from a design state: its concern's picture, narrowed to its scope, stripped to the
// layers shown. Pure: the view and the suite read the same thing.
export function perspectivePicture(doc, {concern, scopeId = null, chapter = 4, layers = LAYERS} = {}) {
  const scene = sceneOf(concern, chapter), full = doc ? scoped(notationDiagram(doc, scene), doc, scopeId, concern) : null;
  return {scene, full, D: full ? stripToLayers(full, layers) : null};
}
function build(s) {
  const doc = sourceOf(s), scene = sceneFor(s), layers = layersOf(scene);
  const key = [scene, s.concern, s.scopeId || '', s.baselineId || '', layers.join(), arrangementOf(scene), readPrefs().hubs[arrangementKey(scene)] || ''].join('|');
  if (doc === built.doc && key === built.key && L) return;
  ({full, D} = perspectivePicture(doc, {concern: s.concern, scopeId: s.scopeId, chapter: s.chapter, layers}));
  L = D ? notationLayout(D, {arrangement: arrangementOf(scene), hub: readPrefs().hubs[arrangementKey(scene)]}) : null;
  if (sel && !full?.nodes.some(n => n.id === sel)) sel = null;
  if (selEdge && !D?.edges.some(e => e.id === selEdge)) selEdge = null;
  built = {doc, key};
}

function shell() {
  return `${modelHeaderHTML(here, PREFIX, `<button type="button" class="cm-btn icon" data-pv="expand" aria-pressed="false" aria-label="Expand the model" title="Expand">${svgIcon(ICON.expand)}</button>`, 'Perspective')}
  <div class="cm-bar" data-model-slot="commands"><nav class="cm-crumbs" aria-label="Model scope"></nav><div class="cm-lenses" role="group" aria-label="Picture"></div></div>
  <div class="cm-banner" data-model-slot="notice"></div>
  <div class="cm-body" data-model-slot="content"><div class="cm-stage" tabindex="0" aria-label="Perspective canvas. Drag or scroll to move; arrow keys pan; Ctrl or Command and scroll to zoom.">
    <div class="cm-world"><svg class="cm-svg" aria-hidden="true"></svg><div class="cm-html"></div></div>
    <div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div>${edgesHTML()}
  </div><aside class="cm-panel" aria-label="Companion"></aside></div>
  <footer class="cm-walk" data-model-slot="status" aria-label="Perspective"><div class="cm-walk-in"></div><p class="cm-state" role="status" aria-live="polite"></p>${toolsHTML(PREFIX)}</footer><div class="cm-tip" role="tooltip" hidden></div>`;
}

// Draws `id` (a saved perspective's id, or 'new') as the current view of `chapter`'s Model tab. False while the
// chapter's switcher is not known yet (its model has not been on the page): the shell draws the chapter model first.
export function mountPerspective(chapter, id, selection, h) {
  handles = h || handles; chapter = Number(chapter);
  const host = document.querySelector('.studio > .stage.tab-content');
  if (!host || !hasSwitcher(chapter) || !perspectiveKnown(id)) return false;
  if (here !== chapter || viewId !== id) { sel = null; selEdge = null; fitPending = true; built = {doc: null, key: ''}; pageSel = undefined; }
  here = chapter; viewId = id;
  if (!root) {
    root = document.createElement('section'); root.className = 'cm pv';
    root.innerHTML = shell();
    stage = modelStage(root, {headHeight: () => 0, railWidth: () => 0, onHover: tip});
    stage.bind(); bind(); fitPending = true;
  } else if (!root.isConnected) {
    // Back on the page (after another view, tab or a page render): the camera keeps its place, and the stage's
    // listeners are bound afresh, since the stage lets go of its window listeners while it is off the page.
    const st = root.querySelector('.cm-stage'), fresh = st.cloneNode(true); fresh.querySelector(':scope > .cm-minimap')?.remove(); st.replaceWith(fresh); stage.bind();
  }
  root.dataset.chapter = chapter;
  root.setAttribute('aria-label', `Chapter ${chapter} model: perspective`);
  root.querySelector('.cm-title small').textContent = `Chapter ${chapter} · Model`;
  solChapterMount(project(), chapter, () => render());
  // The page's selection is adopted when it changes (or first), as the chapter models do; the reader's own stays.
  if (selection?.id !== pageSel) { const s = subject(); if (s) { build(s); const requested = selection?.id && selection.id !== 'project' ? selection.id : s.selectedId; sel = full?.nodes.some(n => n.id === requested) ? requested : null; } pageSel = selection?.id; }
  if (host.firstElementChild !== root) host.prepend(root);
  document.body.classList.add('cm-active'); shown = true;
  render();
  // A saved perspective can carry its own starting object. When the shell only had its
  // generic fallback selection, adopt that object into the shared subject and URL too.
  if (sel && sel !== selection?.id && !subject()?.baselineId) announceObject(sel);
  sizeModel(root, 'cm-expanded');
  if (pendingFocus) { const f = pendingFocus; pendingFocus = null; nextFrame(() => focusAfterChoice(f)); }
  return true;
}
// The perspective leaves the page (another view, another chapter or tab), unless it is `keep`'s.
export function leavePerspective(keep = null) {
  if (!root || !shown || (keep != null && Number(keep) === here)) return;
  shown = false;
  releaseCompanion(root); root.remove(); hideTip();
  document.body.classList.remove('cm-expanded');
  window.aiwExplorationContext = null;
}

function render() {
  if (!root?.isConnected) return;
  const s = subject(); if (!s) { handles?.choose(here, null); return; }
  const fk = focusKey(root);
  build(s);
  chrome(s); panel(s); picture();
  stage.use(L || {W: 640, H: 320}, 'pv|' + viewId + '|' + built.key);
  if (fitPending && L) { fitPending = false; fit(); } else stage.clamp();
  stage.apply(); overview();
  tellSidebar(s); context(s); placeChapterState(root);
  refocus(root, fk);
}
function marks() { try { const all = window.aiwModelMarks?.all?.() || []; return all.length ? new Map(all.map(m => [m.id, m])) : null; } catch { return null; } }
function picture() {
  const svg = root.querySelector('.cm-svg'), html = root.querySelector('.cm-html'), world = root.querySelector('.cm-world');
  layerNote(full && D ? hiddenNoteHTML(full.nodes.length - D.nodes.length) : '');
  if (!L || !D.nodes.length) {
    svg.innerHTML = ''; world.style.width = '640px'; world.style.height = '320px';
    const hidden = full?.nodes.length && !D?.nodes.length;
    html.innerHTML = `<div class="cm-empty-card" style="left:40px;top:40px"><b>${hidden ? 'Every layer of this picture is hidden' : 'Nothing to draw yet'}</b><p>${hidden ? `${full.nodes.length} element${full.nodes.length === 1 ? '' : 's'} stand in layers switched off in the sidebar.` : esc(full?.notes?.[0] || 'The project records nothing this concern draws over this scope yet.')}</p>${hidden ? '<button type="button" class="cm-btn" data-nt="layers-all">Show every layer</button>' : ''}</div>`;
    return;
  }
  world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
  svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `${pictureTitle()}: ${D.counts.nodes} elements, ${D.counts.edges} relationships`);
  svg.style.width = L.W + 'px'; svg.style.height = L.H + 'px'; svg.style.maxWidth = 'none';
  const parts = NS.svgParts(D, L, {prefix: PREFIX, sel, selEdge, interactive: true, marks: marks()}), lift = liftParts(parts.lift);
  // Round 10 (N6): the lift (the whole route of what is selected, lit or traced) over the lines and under the elements,
  // its end rings over the elements, the hits on top.
  svg.innerHTML = `<style>${NS.SVG_STYLE}</style>${parts.defs}${parts.descs}${parts.bands}${parts.groups}${parts.edges}${lift.under}${parts.nodes}${parts.ghosts || ''}${lift.over}${parts.hits}${parts.callouts}`;
  // The process traces the scenario chosen in its companion.
  const s = subject(); paintScenario(svg, s?.concern === 'process' ? D : null, s ? sourceOf(s) : null);
  const H = D.header || {}, h = L.header, cell = (k, v) => (v ? `<span><small>${k}</small>${esc(v)}</span>` : '');
  html.innerHTML = (h ? `<div class="nt-header" style="left:${h.x}px;top:${h.y}px;width:${h.w}px;height:${h.h}px"><b>${esc(pictureTitle())}</b>${cell('Model', H.model)}${cell('Template', H.template)}${cell('Version', H.version)}${cell('Baseline', subject()?.baselineId || '')}</div>` : '')
    + (D.notes.length ? `<div class="nt-notes" style="left:${NL.LEFT}px;top:${L.notesY ?? L.H - 30 - 18 * D.notes.length}px">${D.notes.map(t => `<p>${esc(t)}</p>`).join('')}</div>` : '');
}
const pictureTitle = () => { const s = subject(); return s ? (s.id ? s.title : 'New perspective') + ' · ' + (SCENES.find(x => x.id === sceneFor(s))?.title || '') : ''; };
// What the stage carries over the picture: the note that says what the layers hide.
function layerNote(markup) {
  const st = root.querySelector('.cm-stage'), el = st.querySelector(':scope > .nt-layer-note');
  if (!markup) { el?.remove(); return; }
  const t = document.createElement('template'); t.innerHTML = markup; const fresh = t.content.firstElementChild;
  if (el) el.replaceWith(fresh); else st.append(fresh);
}
// Open at reading size, and restore any camera the reader explicitly chose for this perspective.
function fit() { stage.fit({minimum: .5}); stage.apply(); }
function overview() { stage.overview?.(L && D?.nodes.length ? {W: L.W, H: L.H, groups: L.groups, boxes: L.nodes.map(b => ({x: b.x, y: b.y, w: b.w, h: b.h, cls: b.id === sel ? 'sel' : ''}))} : null); }

// The frame: the title, where you are, the switcher, the picture's bar, the status and the Key.
function chrome(s) {
  const M = architectureModel(sourceOf(s) || project()), scene = SCENES.find(x => x.id === sceneFor(s));
  root.querySelector('.pv-title').textContent = s.id ? s.title : 'New perspective';
  const crumbs = `<span>${esc(concernTitle(s.concern))}</span><span aria-hidden="true">·</span><span>${esc(s.concern === 'process' ? 'The whole journey' : scopeTitle(M, s.scopeId))}</span>${s.baselineId ? `<span aria-hidden="true">·</span><span>Frozen baseline ${esc(s.baselineId)}</span>` : ''}`;
  const cr = root.querySelector('.cm-crumbs'); if (cr.innerHTML !== crumbs) cr.innerHTML = crumbs;
  const box = root.querySelector('.cm-views'), sw = switcherFor(here);
  if (drawn.get(box) !== sw.html) { box.innerHTML = sw.html; drawn.set(box, sw.html); box.setAttribute('aria-label', sw.label); }
  placeGroup(box, groupHTML(project(), here, viewId, true));
  placeModelContext(box, here, '', s);
  watchViewRail(box);
  const arrangements = full ? arrangementsFor(full) : [], a = arrangementOf(scene?.id), recommended = architectureArrangement(D, {selectedId: sel});
  const history = arrangementHistory.get(prefKey() + '|' + arrangementKey(scene?.id)) || [];
  const bar = `<span class="pv-picture" title="${esc(scene?.standard || '')}">${esc(scene?.title || '')}<small>${esc(scene?.standard || '')}</small></span>${arrangements.length > 1 ? `<details class="nt-menu nt-arrange-options"><summary class="cm-btn"><span>Arrange · ${esc(arrangements.find(x => x.id === a)?.title || a)}</span></summary><div class="nt-pop" role="group" aria-label="Arrange perspective"><button type="button" data-pv="smart-arrange"><b>Smart arrange</b><small>${esc(recommended.reason)}</small></button><label class="nt-find"><span>Layout</span><select data-pv-field="arrange" aria-label="Arrange the picture">${arrangements.map(x => `<option value="${esc(x.id)}"${x.id === a ? ' selected' : ''}>${esc(x.title)}</option>`).join('')}</select></label><button type="button" data-pv="undo-arrange"${history.length ? '' : ' disabled'}>Undo layout change (${history.length})</button><p class="nt-hint">Uses this perspective’s visible records, connections and boundaries. The layout choice is remembered for this perspective.</p></div></details>` : ''}`;
  const lenses = root.querySelector('.cm-lenses'); if (lenses.innerHTML !== bar) { const open = lenses.querySelector('.nt-arrange-options')?.open; lenses.innerHTML = bar; if (open) lenses.querySelector('.nt-arrange-options')?.setAttribute('open', ''); }
  setState(root, statusText(s));
  const legend = root.querySelector('.cm-legend'), key = legendHTML(); if (legend.innerHTML !== key) legend.innerHTML = key;
  root.querySelector('[data-pv="expand"]').setAttribute('aria-pressed', String(document.body.classList.contains('cm-expanded')));
}
function statusText(s) {
  if (!D) return '';
  const hidden = full.nodes.length - D.nodes.length, M = architectureModel(sourceOf(s) || project());
  return `${pictureTitle()} · ${D.counts.nodes} element${D.counts.nodes === 1 ? '' : 's'} · ${D.counts.edges} relationship${D.counts.edges === 1 ? '' : 's'}${full.scopedFrom ? ` · ${scopeTitle(M, s.scopeId)}: ${full.nodes.length} of ${full.scopedFrom}` : ''}${hidden ? ` · ${hidden} hidden by the layers` : ''}`;
}
// The Key, from what is drawn: the layers, the element kinds, the relationship styles, the containers and the marks.
function legendHTML() {
  if (!D?.nodes.length) return '<p class="cm-muted">Nothing drawn.</p>';
  const K = NS.legendData(D, L), line = st => `<svg width="44" height="12" aria-hidden="true"><path d="M3 6H36" fill="none" stroke="${st.stroke}" stroke-width="1.4"${st.dash ? ` stroke-dasharray="${st.dash}"` : ''}${st.head !== 'none' ? ` marker-end="${markerRef(PREFIX, st.head, st.stroke)}"` : ''}${st.tail !== 'none' ? ` marker-start="${markerRef(PREFIX, st.tail, st.stroke)}"` : ''}/></svg>`;
  const counts = layerCounts(full), shownBy = layerCounts(D), mk = NS.marksLegend?.(marks(), D) || [];
  // Round 10 (N6): the lines drawn together, in the Key only when this picture draws them.
  const lines = K.marks.filter(m => ['bundle', 'tree', 'duplicate'].includes(m.id));
  const layers = LAYERS.filter(l => counts[l]).map(l => `<p><i class="nt-k nt-lk nt-lk-${l}"></i>${esc(LAYER_NAMES[l])} <small>${shownBy[l]} of ${counts[l]}</small></p>`).join('');
  return `${layers ? `<h5 aria-level="4">Layers</h5>${layers}` : ''}<h5 aria-level="4">Elements</h5>${K.elements.map(el => `<p><i class="nt-k nt-${el.family}${el.bpmn ? ' ' + el.family : ''}">${el.bpmn ? '' : iconSVG(el.family)}</i>${esc(el.kicker)}${el.count > 1 ? ` <small>×${el.count}</small>` : ''}</p>`).join('')}${K.groups.length ? `<p><i class="nt-k group"></i>${esc(K.groups.map(g => g.label).join(', '))}</p>` : ''}${K.relationships.length ? `<h5 aria-level="4">Relationships</h5>${K.relationships.map(r => `<p>${line(r.style)}${esc(r.kinds.map(k => k.label).join(', '))}</p>`).join('')}` : ''}${mk.length ? `<h5 aria-level="4">Marks</h5>${mk.map(m => `<p><i class="nt-k nt-mk-k ${esc(m.state)}">${esc(m.glyph)}</i>${esc(m.text)} <small>×${m.count}</small></p>`).join('')}` : ''}${lines.length ? `<h5 aria-level="4">Lines drawn together</h5>${lines.map(m => `<p><i class="nt-k nt-m-${esc(m.id)}"></i>${esc(m.text)}</p>`).join('')}` : ''}<p class="cm-muted">Every element is a saved record; a perspective is a way of looking, never a fact.</p>`;
}
// The sidebar's layers are this picture's (one layer model): it lists what each layer holds, and its switches strip them.
function tellSidebar(s) {
  try { window.aiwSetModelLayers?.(layersOf(sceneFor(s)), layerSummary({chapter: here, view: 'perspective', picture: pictureTitle(), full, D, layers: layersOf(sceneFor(s))})); } catch { /* the sidebar is optional */ }
}
// What Sol reads of the perspective on screen (intelligence-context.js rebuilds it on the server from the saved model).
function context(s) {
  try {
    const M = architectureModel(sourceOf(s) || project());
    window.aiwExplorationContext = explorationContext(M, {concern: s.concern, scopeId: s.scopeId || M.root, selectedId: M.objects.has(sel) ? sel : null, chapter: here, mode: 'explore', context: 'functional', baselineId: s.baselineId});
  } catch { window.aiwExplorationContext = null; }
}

// ---------------------------------------------------------------- the companion

// The companion keeps its parts: the perspective (its form while it is new), the selection (with Sol), the process's
// own authoring (for the Process perspective), the reading and the model's exchange. A part is redrawn only when it
// changes, so a field being filled in keeps its place.
function panel(s) {
  const box = companionHost(root); if (!box) return;
  if (!box.querySelector(':scope > [data-pv-part]')) box.innerHTML = ['perspective', 'selection', 'dossier', 'process', 'reading', 'exchange'].map(k => `<div data-pv-part="${k}"></div>`).join('');
  const part = (k, html) => { const el = box.querySelector(`:scope > [data-pv-part="${k}"]`); if (el && drawn.get(el) !== html) { el.innerHTML = html; drawn.set(el, html); } };
  const M = architectureModel(sourceOf(s) || project()), spec = selectedHTML(s, M), proc = s.concern === 'process' ? {doc: sourceOf(s) || project(), frozen: !!s.baselineId} : null;
  const details = proc ? processDetailsHTML(proc.doc, {id: sel, edgeId: selEdge, frozen: proc.frozen}) : '';
  part('selection', spec ? solInto(spec + details, solSection(project(), here, sel)) : details);
  // The selected object has the same connected reading in a saved perspective as in Diagram,
  // Layers, Table and Matrix. A frozen perspective reads the frozen design, with its state named.
  part('dossier', selectedDossier(s, M));
  part('process', proc ? processGuideHTML(proc.doc, {selectedId: sel, frozen: proc.frozen}) : '');
  // The form stays as the person fills it in; it is drawn again for another perspective or another document.
  const formKey = (s.id || 'new:' + here) + '|' + (project()?.contentVersion ?? '') + '|' + (project()?.updatedAt ?? '');
  const el = box.querySelector(':scope > [data-pv-part="perspective"]');
  if (drawn.get(el) !== formKey || !el.firstElementChild) { el.innerHTML = s.id ? aboutHTML(s, M) : formHTML(s, M); drawn.set(el, formKey); }
  part('reading', readingHTML(s, M));
  part('exchange', `<section class="pv-exchange"><h4 aria-level="3">The connected model</h4><p>Export it with its perspectives and baselines, or bring a model package in as a new project.</p><p class="cm-acts"><button type="button" class="cm-btn" data-pv="export">Export…</button><button type="button" class="cm-btn" data-pv="import">Import a model package…</button></p></section>`);
}
function selectedDossier(s, M) {
  if (!sel || !M.objects.has(sel)) return '';
  const source = sourceOf(s);
  if (s.baselineId && !source) return `<p class="pv-frozen-note">Loading frozen design · ${esc(s.baselineId)}…</p>`;
  const reading = source || project();
  if (dossierRead.doc !== reading || dossierRead.id !== sel || dossierRead.chapter !== here) dossierRead = {doc: reading, id: sel, chapter: here, html: modelDossierHTML(reading, sel, {chapter: here, open: true})};
  return (s.baselineId ? `<p class="pv-frozen-note">Frozen design · ${esc(s.baselineId)}. The dossier below reads this baseline.</p>` : '') + dossierRead.html;
}
function selectedHTML(s, M) {
  if (selEdge) {
    const e = D?.edges.find(x => x.id === selEdge); if (!e) return '';
    const r = M.relationships.find(x => (x.from === e.from && x.to === e.to) || (x.from === e.to && x.to === e.from));
    const reading = r ? relationshipReading(sourceOf(s) || project(), M, r) : null;
    return `<section class="cm-spec"><h4 aria-level="3">Relationship · ${esc(styleOf(e.kind).family)}</h4><p>${esc(describeEdge(D, e.id))}</p>${reading ? `<p>${esc(reading.meaning)}</p>${reading.checks.length ? `<ul class="pv-checks">${reading.checks.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}<p class="cm-muted">${esc(reading.source)}${reading.illustrative ? ' · illustrative' : ''}</p>` : ''}${edgeLinesHTML(D, L, e.id, {attr: 'pv'})}<p class="cm-acts"><button type="button" class="cm-btn" data-pv="edge-clear">Clear the relationship</button></p></section>`;
  }
  const n = sel && full?.nodes.find(x => x.id === sel);
  if (!n) {
    const held = pageSel && M.objects.get(pageSel);
    return held && held.type !== 'system' ? `<section class="cm-spec"><h4 aria-level="3">Outside this perspective</h4><p>The held object, <b>${esc(held.title)}</b>, is not drawn by this concern, scope or visible layers. Its identity remains in the project.</p><p class="cm-acts"><a class="cm-btn" href="${esc(projectURL(`/?chapter=${here}&tab=model&model=whole&object=${encodeURIComponent(held.id)}`))}">Find it in Whole design</a></p></section>` : '';
  }
  const g = full.groups.find(x => x.id === n.group), p = project();
  const rows = [['Type', n.kicker], ['Reference', n.ref], ['In', g?.title], ['Detail', n.sub]].filter(([, v]) => v);
  const editable = !s.baselineId && M.objects.has(sel);
  const visible = D?.nodes.some(x => x.id === sel);
  return `<section class="cm-spec"><h4 aria-level="3">${esc(n.kicker || 'Element')}</h4><p class="cm-spec-t"><b>${esc(n.fullTitle || n.title)}</b></p>${!visible ? `<p class="cm-muted">This subject is in the hidden ${esc(LAYER_NAMES[n.layer] || n.layer)} layer.</p><button type="button" class="cm-btn" data-pv="show-subject">Show its layer</button>` : ''}<p>${esc(describeNode(full, sel))}</p><dl class="cm-dl">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${editable ? openInWorkHTML(sel, {chapter: here, home: homeChapter(p, sel), title: n.title}) : ''}</section>${visible ? nodeLinesHTML(D, L, sel, {attr: 'pv'}) : ''}`;
}
const defaultName = (s, M) => `${s.concern === 'process' ? 'Whole journey' : scopeTitle(M, s.scopeId)} · ${concernTitle(s.concern)}`;
function formHTML(s, M) {
  const bl = (project()?.finalReview?.baselines || []).filter(b => b.source || b.frozen), opt = (v, t, on) => `<option value="${esc(v)}"${on ? ' selected' : ''}>${esc(t)}</option>`;
  return `<section class="pv-form"><h4 aria-level="3">New perspective</h4><form data-pv-form>
   <label class="pv-field"><span>Concern</span><select name="concern" data-pv-field="concern">${CONCERNS.map(([id, t]) => opt(id, t, id === s.concern)).join('')}</select></label>
   <p class="pv-hint" data-pv-hint>${esc((CONCERNS.find(([id]) => id === s.concern) || CONCERNS[0])[2])}.</p>
   <label class="pv-field"><span>Scope</span><select name="scopeId" data-pv-field="scope">${opt('', 'Whole system', !s.scopeId)}${M.modules.map(o => opt(o.id, o.title, o.id === s.scopeId)).join('')}</select></label>
   ${bl.length ? `<label class="pv-field"><span>Design state</span><select name="baselineId" data-pv-field="baseline">${opt('', 'Working design', !s.baselineId)}${bl.map(b => opt(b.id, b.title + ' · ' + b.id, b.id === s.baselineId)).join('')}</select></label>` : ''}
   <label class="pv-field"><span>Name</span><input name="title" maxlength="100" value="${esc(s.title)}" placeholder="${esc(defaultName(s, M))}" data-pv-field="title"></label>
   <label class="pv-field"><span>What it explains <small>optional</small></span><textarea name="purpose" rows="2" maxlength="1600" data-pv-field="purpose">${esc(s.purpose)}</textarea></label>
   <p class="cm-acts"><button type="submit" class="cm-btn primary">Save perspective</button></p><p class="pv-error" role="alert" hidden></p></form></section>`;
}
function aboutHTML(s, M) {
  const rows = [['Concern', concernTitle(s.concern)], ['Scope', s.concern === 'process' ? 'The whole journey' : scopeTitle(M, s.scopeId)], ['Design state', s.baselineId ? 'Frozen baseline ' + s.baselineId : 'Working design'], ['Saved in', 'Chapter ' + s.chapter]];
  return `<section class="pv-about"><h4 aria-level="3">Perspective</h4>${s.purpose ? `<p>${esc(s.purpose)}</p>` : ''}<dl class="cm-dl">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="cm-acts"><button type="button" class="cm-btn" data-pv="vary">Vary it as a new perspective…</button></p></section>`;
}
function readingHTML(s, M) {
  const scene = SCENES.find(x => x.id === sceneFor(s)), concern = CONCERNS.find(([id]) => id === s.concern) || CONCERNS[0];
  const text = D && L && D.nodes.length ? NS.diagramText(D, L) : '';
  return `<section class="pv-reading"><h4 aria-level="3">Reading this perspective</h4><p>${esc(concern[2])}, as the ${esc(scene?.title || '')} picture of ${esc(s.concern === 'process' ? 'the whole journey' : scopeTitle(M, s.scopeId).replace(/^Whole system$/, 'the whole system'))} · ${esc(scene?.standard || '')}.</p><details><summary>More</summary><p>Every box is a saved record and every line a recorded relationship. The sidebar's layers strip what you do not want to see; Arrange changes only where things stand. Saving a perspective records how to look — its concern, scope and design state — never a fact of the design.</p>${text ? `<details class="nt-read"><summary>Read this picture as text</summary><pre>${esc(text)}</pre></details>` : ''}</details></section>`;
}

// ---------------------------------------------------------------- interaction

function select(id) {
  sel = id || null; selEdge = null;
  const p = project(), s = subject(), M = s ? architectureModel(sourceOf(s) || p) : null, target = sel && M?.objects.has(sel) ? sel : null;
  if (p && !s?.baselineId) { try { mountBrainContext(p, {id: target || solOwner(p, sel) || 'project', chapter: here}, 'model'); } catch { /* assistance is optional */ } }
  announceObject(target);
  render();
}
function bind() {
  solChapterBind(root, () => here, {refresh: () => render()});
  listen(root, 'click', click);
  listen(root, 'change', change);
  listen(root, 'input', input);
  listen(root, 'submit', submit);
  listen(root, 'keydown', keydown);
}
// The process's authoring changes the working design only, through its reviewed dialogs; a frozen state is read.
const processContext = () => ({project: () => project(), frozen: !!subject()?.baselineId, select: id => select(id), refresh: () => render()});
function click(e) {
  if (root.dataset.suppress) return;
  const pe = e.target.closest('[data-pe]');
  if (pe) { if (!pe.disabled) processAction(pe, processContext()); return; }
  const own = e.target.closest('.cm-views .cm-view[data-id]:not(.pv-entry)');
  if (own && root.contains(own)) { e.preventDefault(); pendingFocus = null; handles?.chapterView(here, own.dataset.id); return; }
  const b = e.target.closest('[data-pv],[data-nt="layers-all"]');
  if (b) {
    const k = b.dataset.pv || 'layers-all';
    if (b.disabled) return;
    if (k === 'smart-arrange') { const r = architectureArrangement(D, {selectedId: sel}); chooseArrangement(r.id, r.hub); return; }
    if (k === 'show-subject') { const n = full?.nodes.find(x => x.id === sel), scene = sceneFor(subject()); if (n) { readPrefs().layers[scene] = [...new Set([...layersOf(scene), n.layer])]; savePrefs(); render(); stage.fitSelection(); root.querySelector('.cm-stage')?.focus({preventScroll: true}); } return; }
    if (k === 'undo-arrange') { const scene = sceneFor(subject()), key = arrangementKey(scene), h = arrangementHistory.get(prefKey() + '|' + key)?.pop(); if (h) { const p = readPrefs(); if (h.arrangement) p.arrangement[key] = h.arrangement; else delete p.arrangement[key]; if (h.hub) p.hubs[key] = h.hub; else delete p.hubs[key]; savePrefs(); fitPending = true; render(); } return; }
    if (k === 'layers-all') { readPrefs().layers[sceneFor(subject())] = [...LAYERS]; savePrefs(); render(); return; }
    if (k === 'expand') { const on = !document.body.classList.contains('cm-expanded'); document.body.classList.toggle('cm-expanded', on); sizeModel(root, 'cm-expanded'); fitPending = true; nextFrame(() => render()); return; }
    if (k === 'key') { const key = root.querySelector('.cm-key'); key.classList.toggle('cm-min'); b.setAttribute('aria-expanded', String(!key.classList.contains('cm-min'))); return; }
    if (k === 'fit') { stage.fitAll(); overview(); return; }
    if (k === 'zin' || k === 'zout') { const {w, h} = stage.box(); stage.zoomAt(stage.cam.z * (k === 'zin' ? 1.15 : 1 / 1.15), w / 2, h / 2); return; }
    if (k === 'edge-clear') { selEdge = null; render(); return; }
    // Round 10 (N6): a relationship named in a reading (the others on its line, an element's lines) is selected, and the
    // keyboard goes to its own hit on the picture.
    if (k === 'edge-pick') { const id = b.dataset.id; if (!D?.edges.some(x => x.id === id)) return; selEdge = id; sel = null; render(); nextFrame(() => root.querySelector(`.nt-hit[data-nt-edge="${CSS.escape(id)}"]`)?.focus({preventScroll: true})); return; }
    if (k === 'vary') { const s = subject(); drafts.set(here, {concern: s.concern, scopeId: s.scopeId, baselineId: s.baselineId, title: '', purpose: s.purpose}); pendingFocus = 'form'; handles?.choose(here, 'new'); return; }
    if (k === 'export' || k === 'import') { const s = subject(); import('./model-exchange-ui.js').then(m => (k === 'import' ? m.importModelPackage() : m.openModelExchange(project(), {concern: s?.concern, scopeId: s?.scopeId, selectedId: sel}, architectureModel(project())))).catch(err => setState(root, err.message)); return; }
    return;
  }
  // Round 10 (N6): a line drawn for several relationships selects the element they share, whose reading lists them.
  const bh = e.target.closest('.cm-svg .nt-bhit[data-nt-select]');
  if (bh) { select(bh.dataset.ntSelect); return; }
  const hit = e.target.closest('.nt-hit[data-nt-edge]');
  if (hit) { selEdge = selEdge === hit.dataset.ntEdge ? null : hit.dataset.ntEdge; sel = null; render(); return; }
  const node = e.target.closest('.cm-svg [data-nt-node]');
  if (node) { select(sel === node.dataset.ntNode ? null : node.dataset.ntNode); return; }
  if (e.target.closest('.cm-stage') && !e.target.closest('.cm-edge,.cm-minimap,.nt-layer-note') && (sel || selEdge)) { selEdge = null; select(null); }
}
function chooseArrangement(id, hub = null) {
  if (!arrangementsFor(full).some(a => a.id === id)) return;
  const key = arrangementKey(sceneFor(subject())), p = readPrefs(), historyKey = prefKey() + '|' + key, h = arrangementHistory.get(historyKey) || [];
  h.push({arrangement: p.arrangement[key], hub: p.hubs[key]}); if (h.length > 20) h.shift(); arrangementHistory.set(historyKey, h);
  p.arrangement[key] = id; if (hub) p.hubs[key] = hub; else delete p.hubs[key]; savePrefs(); fitPending = true; render();
}
function change(e) {
  const f = e.target.closest('[data-pv-field]'); if (!f) return;
  const s = subject(); if (!s) return;
  if (f.dataset.pvField === 'arrange') { chooseArrangement(f.value); return; }
  if (s.id || !['concern', 'scope', 'baseline'].includes(f.dataset.pvField)) return;
  const d = drafts.get(here);
  if (f.dataset.pvField === 'concern') d.concern = f.value;
  if (f.dataset.pvField === 'scope') d.scopeId = f.value || null;
  if (f.dataset.pvField === 'baseline') d.baselineId = f.value || null;
  const form = f.closest('form'), M = architectureModel(sourceOf(subject()) || project());
  if (form) { form.querySelector('[data-pv-hint]').textContent = (CONCERNS.find(([id]) => id === d.concern) || CONCERNS[0])[2] + '.'; form.elements.title.placeholder = defaultName(d, M); }
  sel = null; selEdge = null; fitPending = true; render();
}
function input(e) {
  const f = e.target.closest('[data-pv-field="title"],[data-pv-field="purpose"]'); if (!f || viewId !== 'new') return;
  drafts.get(here)[f.dataset.pvField] = f.value;
}
async function submit(e) {
  const form = e.target.closest('[data-pv-form]'); if (!form) return;
  e.preventDefault();
  const s = subject(), button = form.querySelector('[type=submit]'), error = form.querySelector('.pv-error'); if (!s || s.id) return;
  const M = architectureModel(sourceOf(s) || project()), objectId = sel && M.objects.has(sel) ? sel : '';
  const raw = Object.fromEntries(new FormData(form)), title = String(raw.title || '').trim() || defaultName(s, M);
  const payload = {title, purpose: String(raw.purpose || '').trim(), chapter: here, tab: 'model', objectId, exploration: {concern: s.concern, scopeId: s.scopeId || M.root, baselineId: s.baselineId, selectedId: objectId || null, chapter: here, mode: 'explore', context: 'functional'}};
  button.disabled = true; error.hidden = true;
  try {
    const before = new Set(perspectivesOf(project()).map(v => v.id));
    await window.aiwProjectStore.command({type: 'workspace.view', payload});
    const added = perspectivesOf(project()).find(v => !before.has(v.id));
    drafts.delete(here); pendingFocus = 'switcher';
    handles?.choose(here, added?.id || null);
  } catch (err) { error.textContent = err.message; error.hidden = false; button.disabled = false; }
}
function keydown(e) {
  const node = e.target.closest?.('.cm-svg [data-nt-node]'), hit = e.target.closest?.('.nt-hit[data-nt-edge]');
  if ((e.key === 'Enter' || e.key === ' ') && hit) { e.preventDefault(); selEdge = hit.dataset.ntEdge; sel = null; render(); nextFrame(() => root.querySelector(`.nt-hit[data-nt-edge="${CSS.escape(selEdge)}"]`)?.focus()); return; }
  if ((e.key === 'Enter' || e.key === ' ') && node) { e.preventDefault(); const id = node.dataset.ntNode; select(id); nextFrame(() => root.querySelector(`.cm-svg [data-nt-node="${CSS.escape(id)}"]`)?.focus()); return; }
  if (e.key === 'Escape' && (sel || selEdge) && root.contains(e.target) && !e.target.closest('input,textarea,select,[contenteditable="true"],details[open]')) { selEdge = null; select(null); }
}
// Round 10 (N6): the companion reads the relationship, or the line drawn for several, that the pointer rests on.
let restKey = null, restTimer = 0;
function hoverLine(e) {
  const t = e.target.closest?.('.cm-svg .nt-hit[data-nt-edge], .cm-svg .nt-bhit[data-nt-bundle]');
  const key = t && root?.contains(t) ? (t.classList.contains('nt-bhit') ? 'b:' + t.dataset.ntBundle : 'e:' + t.dataset.ntEdge) : null;
  if (key === restKey) return;
  restKey = key; clearTimeout(restTimer);
  restTimer = setTimeout(() => {
    if (!root?.isConnected) return;
    // What the selection already reads (the selected relationship, a line whose shared element is selected) is not read again.
    const id = key ? key.slice(2) : '', html = !key || !D || !L ? '' : key[0] === 'b' ? (drawnLines(L).byId.get(id)?.node !== sel ? bundleHoverHTML(D, L, id) : '') : id !== selEdge ? edgeHoverHTML(D, L, id) : '';
    hoverReadInto(companionHost(root), html);
  }, key ? 420 : 260);
}
function tip(e) {
  hoverLine(e);
  const box = root?.querySelector('.cm-tip'); if (!box) return;
  const t = e.target.closest?.('.cm-svg [data-nt-node]'), n = t && full?.nodes.find(x => x.id === t.dataset.ntNode);
  if (!n) { box.hidden = true; return; }
  box.innerHTML = `<b>${esc(n.fullTitle || n.title)}</b>${esc(describeNode(full, n.id))}<small class="h">Select it to read it in the companion</small>`; box.hidden = false; placeTip(box, e);
}
function hideTip() { const box = root?.querySelector('.cm-tip'); if (box) box.hidden = true; }
// After a choice in the switcher the keyboard stays with it: on the new perspective's switcher, or in its form.
// The form ("New perspective…", "Vary…") is one the person asked for, so a closed Details column it is written into
// opens (a sheet below 1180 px) even where the viewer closed it: an explicit inspection (workspace-ux.js
// aiw:inspect-details without unlessClosed), not the by-itself rule (rc41 close). Closing it returns to the switcher.
function focusAfterChoice(where) {
  if (!root?.isConnected) return;
  if (where === 'form') { const f = companionHost(root)?.querySelector('[data-pv-field="concern"]'); if (f) { if (f.closest('#inspector') && document.body.dataset.panel === 'collapsed') { root.querySelector('.pv-sum')?.focus({preventScroll: true}); window.dispatchEvent(new CustomEvent('aiw:inspect-details')); } f.focus({preventScroll: false}); return; } }
  root.querySelector('.pv-sum')?.focus({preventScroll: true});
}

// Choosing in any chapter's switcher (the chapter model's or this view's): a perspective of this chapter becomes its
// current view; one saved in another chapter opens there, in place (the shell's route); "New perspective…" composes one.
function choose(b) {
  const chapter = Number(b.closest('.pv-pick')?.dataset.pvChapter) || here, id = b.dataset.pv === 'new' ? 'new' : b.dataset.id;
  b.closest('.pv-pick')?.removeAttribute('open');
  if (id === 'new') { if (viewId !== 'new' || here !== chapter) drafts.set(chapter, freshDraft(chapter)); pendingFocus = 'form'; handles?.choose(chapter, 'new'); return; }
  const v = perspectivesOf(project()).find(x => x.id === id); if (!v) return;
  if (Number(v.chapter) && Number(v.chapter) !== chapter) { const held = new URLSearchParams(location.search).get('object'), href = projectURL(`/?chapter=${v.chapter}&tab=model&modelView=${encodeURIComponent(v.id)}${held ? '&object=' + encodeURIComponent(held) : ''}`); pendingFocus = 'switcher'; if (!window.aiwRoute?.(href)) location.href = href; return; }
  pendingFocus = 'switcher'; handles?.choose(chapter, id);
}
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('aiw:sol-changed', () => {
    const box = document.querySelector('.studio > .stage.tab-content > .cm:not(.pv) > .cm-top > .cm-views');
    watchedQuestions.get(box)?.refresh();
    if (root?.isConnected) placeModelUtility(root, here);
  });
  document.addEventListener('click', e => {
    const saved = e.target?.closest?.('.cm-qpick [data-cm-perspective]');
    if (saved) {
      e.preventDefault(); e.stopPropagation();
      const top = saved.closest('.cm-top'), target = top?.querySelector(`.pv-pick [data-pv="open"][data-id="${CSS.escape(saved.dataset.cmPerspective)}"]`);
      saved.closest('.cm-qpick')?.removeAttribute('open'); target?.click(); return;
    }
    const q = e.target?.closest?.('.cm-qpick [data-cm-question]');
    if (q) {
      e.preventDefault(); e.stopPropagation();
      if (q.disabled) return;
      const pick = q.closest('.cm-qpick'), top = pick?.closest('.cm-top'), target = top?.querySelector(`.cm-views > .cm-view[data-id="${CSS.escape(q.dataset.cmQuestion)}"]`);
      pick?.removeAttribute('open');
      if (target && !target.hidden && !target.disabled) { target.click(); nextFrame(() => document.querySelector(`.studio > .stage.tab-content > .cm > .cm-top > .cm-views > .cm-view[data-id="${CSS.escape(q.dataset.cmQuestion)}"]`)?.focus({preventScroll: true})); }
      return;
    }
    const b = e.target?.closest?.('.pv-pick [data-pv="open"], .pv-pick [data-pv="new"]');
    if (b) { e.preventDefault(); e.stopPropagation(); choose(b); return; }
    for (const d of document.querySelectorAll('.pv-pick[open],.cm-qpick[open]')) if (!d.contains(e.target)) d.removeAttribute('open');
  }, true);
  // The list reads like the switcher it opens from: arrows move between its entries, Escape closes it.
  document.addEventListener('keydown', e => {
    const questions = e.target?.closest?.('.cm-qpick');
    if (questions) {
      if (e.key === 'Escape' && questions.open) { e.preventDefault(); e.stopPropagation(); questions.removeAttribute('open'); questions.querySelector('summary')?.focus(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const items = [...questions.querySelectorAll('.cm-qentry:not([disabled])')]; if (!items.length) return;
      e.preventDefault(); if (!questions.open) questions.open = true;
      const at = items.indexOf(document.activeElement), next = at < 0 ? (e.key === 'ArrowDown' ? 0 : items.length - 1) : (at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next].focus(); return;
    }
    const pick = e.target?.closest?.('.pv-pick'); if (!pick) return;
    if (e.key === 'Escape' && pick.open) { e.preventDefault(); e.stopPropagation(); pick.removeAttribute('open'); pick.querySelector('summary')?.focus(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...pick.querySelectorAll('.pv-list button')]; if (!items.length) return;
    e.preventDefault(); if (!pick.open) pick.open = true;
    const at = items.indexOf(document.activeElement), next = at < 0 ? (e.key === 'ArrowDown' ? 0 : items.length - 1) : (at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next].focus();
  }, true);
}
// The sidebar's layer switches and the marks redraw the picture on screen; nothing else changes.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('aiw:model-layers', e => {
    if (!root?.isConnected || !(Array.isArray(e.detail) || e.detail === 'chapter')) return;
    const s = subject(); if (!s) return;
    const next = e.detail === 'chapter' ? chapterLayers(here) : LAYERS.filter(l => e.detail.includes(l)), scene = sceneFor(s);
    if (next.join() === layersOf(scene).join()) return;
    readPrefs().layers[scene] = next; savePrefs(); render();
  });
  window.addEventListener('aiw:model-marks', () => { if (root?.isConnected) render(); });
  window.addEventListener('aiw:subject-release', () => { if (root?.isConnected) { sel = selEdge = null; pageSel = null; render(); } });
  document.addEventListener('aiw:baseline-part', () => { if (root?.isConnected && subject()?.baselineId) render(); });
  window.addEventListener('resize', () => { if (!root?.isConnected) return; sizeModel(root, 'cm-expanded'); stage.clamp(); stage.apply(); });
}
// Another project opened in place (round 4, A): what this module kept for the last project goes with it.
onProjectSwitch(() => { leavePerspective(); shown = false; root = null; stage = null; here = null; viewId = null; drafts.clear();  full = D = L = null; built = {doc: null, key: ''}; dossierRead = {doc: null, id: null, chapter: null, html: ''}; sel = selEdge = null; pageSel = undefined; prefs = null; });
