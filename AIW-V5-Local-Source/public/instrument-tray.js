// The instrument tray (round 11, A): one table of every instrument each chapter's Model tab offers, read by the chapter
// models' switchers and by the help map alike, so the two cannot disagree. An instrument is named in the surgeon's words
// (MODELLING-DIRECTION.md §3): overview, isolation, cross-section, behaviour, intervention; the Table is a listing.
//
// Nothing is offered that has nothing to show. A view or a Diagram picture declares the records it cannot draw without
// (`needs`, record types of the one model); while the project holds none, it is not drawn in the switcher or the picker,
// and the chapter that creates them is named instead. The gate is the records present, never the chapter number: a
// project imported with later-chapter records sees their views at once. Each chapter's first view is its default and is
// always offered: it carries the chapter's empty card and its draft action. A deep link to a hidden or retired view falls
// back to that default, and the fallback is said in the "You are here" line (notation-view.js carries the note).
// Presentation only: nothing here writes to the project.
import {architectureModel, OBJECT_TYPES} from './architecture-model.js';
import {SCENES, CHAPTER_SCENES} from './notation-model.js';
import {MATRIX_DEFAULTS, setLabel} from './model-matrix.js';
import {draftOffer} from './readiness-model.js';
import {perDocument} from './document-memo.js';
import {hasModules} from './module-model.js';
import {esc} from './html-escape.js';

export const KINDS = ['overview', 'isolation', 'cross-section', 'behaviour', 'intervention', 'listing'];
const D_ICON = 'M4 4h6v5H4zM14 4h6v5h-6zM9 15h6v5H9zM7 9v3h10V9M12 12v3', X_ICON = 'M4 4h16v16H4zM4 10h16M4 16h16M10 4v16M16 4v16';
// The Diagram every chapter opens its switcher with, and the shared views every switcher ends with (notation-view.js
// draws them): Layers · Table · Matrix · Whole design.
export const DIAGRAM = {id: 'diagram', label: 'Diagram', kind: 'overview', icon: D_ICON};
export const SHARED_VIEWS = [
  {id: 'layers', label: 'Layers', kind: 'cross-section', q: 'The chapter’s connected model, one lane per model layer.', title: 'The chapter’s connected model, one lane per model layer', icon: 'M3 5h18M3 12h18M3 19h18M6 3v4M12 10v4M17 17v4'},
  {id: 'table', label: 'Table', kind: 'listing', q: 'The chapter’s records as a sortable, filterable table.', title: 'The chapter’s records as a sortable, filterable table', icon: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14'},
  {id: 'cross', label: 'Matrix', kind: 'cross-section', q: 'Two record sets against each other: what relates, and the gaps.', title: 'Two record sets against each other: what relates, and the gaps', icon: X_ICON},
  {id: 'whole', label: 'Whole design', kind: 'overview', q: 'The design anatomy: the whole design as one body.', title: 'The design anatomy: the whole design as one body', icon: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M5 21c0-4 3-7 7-7s7 3 7 7'},
  // Round 24 (D-24-08): the module map, offered while the requirements have a module structure (`offered`); a project
  // without one sees the four shared views it always had.
  {id: 'modules', label: 'Module map', kind: 'overview', q: 'The requirements’ modules and sub-modules, with what this chapter holds of each: open one to work in it.', title: 'The module map: open a module or a sub-module to work in it in every chapter', icon: 'M3 4h8v7H3zM13 4h8v7h-8zM3 13h8v7H3zM13 13h8v3h-8zM13 18h8v2h-8z', offered: p => hasModules(p)}
];
// The shared views this project can draw: each one, unless it waits for what it shows.
export const sharedOffered = p => SHARED_VIEWS.filter(v => !v.offered || (!!p && v.offered(p)));
export const PERSPECTIVES = {label: 'Perspectives', kind: 'overview', q: 'A concern of the whole model over a scope, saved to come back to; offered once the chapter holds a record.'};

// Each chapter's own views, in switcher order: the first is the chapter's default. `needs` names the records a view
// cannot draw without; `aliases` carry a renamed view's old id; `retired` carry a retired view to the instrument that
// keeps its question, with the words the "You are here" line says. Workstream B registers Chapter 5's Specification
// view here (isolation, needs a component) beside Components.
export const TRAY = {
  1: {diagram: 'The journey as a process diagram in the standard notation', views: [
    {id: 'map', label: 'Journey map', kind: 'overview', q: 'What must happen, for whom, and how important it is.', icon: 'M3 5h4v4H3zM10 5h4v4h-4zM17 5h4v4h-4zM3 12h4v7H3zM10 12h4v4h-4zM17 12h4v2h-4z'},
    {id: 'boundary', label: 'Boundary', kind: 'isolation', q: 'The system’s edge: who takes part, the outcomes and their owners, and the limits on the design.', icon: 'M7 4h10v16H7zM2 9h3M2 15h3M19 9h3M19 15h3'}
  ], aliases: {context: 'boundary'}},
  2: {diagram: 'The quality drivers in the standard notation', views: [
    {id: 'tree', label: 'Utility tree', kind: 'overview', q: 'The quality scenarios under their qualities, each with its target.', icon: 'M4 12h4M8 5v14M8 5h4M8 12h4M8 19h4M12 5h8M12 12h8M12 19h8'},
    {id: 'tune', label: 'What if', kind: 'intervention', q: 'Move a target and see what stops holding.', needs: ['quality'], icon: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4'}
  ]},
  3: {diagram: 'The decisions in the standard notation', views: [
    {id: 'map', label: 'Decision map', kind: 'overview', q: 'Each decision, the alternatives it weighed and what it answers.', icon: 'M3 6h5v12H3zM10 4h5v6h-5zM10 14h5v6h-5zM17 4h4v4h-4zM17 10h4v4h-4zM17 16h4v4h-4z'},
    {id: 'matrix', label: 'Trade-offs', kind: 'cross-section', q: 'Every decision against the quality drivers it helps or hurts, weighted.', needs: ['decision'], icon: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18'}
  ]},
  4: {diagram: 'The logical application in the standard notation', views: [
    {id: 'map', label: 'Responsibilities', kind: 'overview', q: 'The responsibilities in their groups and the flows between them.', icon: 'M3 5h5v5H3zM10 14h5v5h-5zM16 5h5v5h-5zM8 7.5h8M12.5 10v4'},
    {id: 'coverage', label: 'Coverage', kind: 'cross-section', q: 'Requirements, responsibilities and components held together: what covers what.', needs: ['responsibility'], icon: X_ICON}
  ]},
  5: {diagram: 'The application architecture in the standard notation', views: [
    {id: 'components', label: 'Components', kind: 'overview', q: 'The components in their modules, carrying what they realise and what they stand on.', icon: 'M3 4h8v7H3zM13 13h8v7h-8zM11 7h4v6'},
    {id: 'specification', label: 'Specification', kind: 'isolation', q: 'One component with everything the design says about it, each entry a link to its record.', needs: ['component'], icon: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h6M9 16h6'}
  ], retired: {allocation: {view: 'cross', note: 'Allocation is retired: the Matrix keeps responsibilities against components, and each component carries its allocations'}}},
  6: {diagram: 'The solution architecture in the standard notation', views: [
    {id: 'platform', label: 'Platform', kind: 'overview', q: 'The capabilities by family, and the components each supports.', icon: 'M3 5h18v4H3zM3 11h18v4H3zM3 17h18v3H3z'},
    {id: 'failure', label: 'If a capability fails', kind: 'intervention', q: 'Remove a capability, or its failure domain, and see what stops.', needs: ['capability'], icon: 'M12 3 2 20h20zM12 10v4M12 17h.01'}
  ]},
  7: {diagram: 'The technology realization in the standard notation', views: [
    {id: 'stack', label: 'Stack', kind: 'overview', q: 'The products that realise each capability, chosen or still open.', icon: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5M3 18l9 5 9-5'},
    {id: 'options', label: 'Options', kind: 'cross-section', q: 'The candidate products for each capability, compared.', needs: ['capability'], icon: 'M4 4h16v16H4zM4 10h16M10 4v16M16 4v16'}
  ]},
  8: {diagram: 'Integration, data and authority in the standard notation', views: [
    {id: 'data', label: 'Data flow', kind: 'behaviour', q: 'Each data definition, its authority and every place it travels.', icon: 'M4 6c0-3 16-3 16 0s-16 3-16 0v12c0 3 16 3 16 0V6M4 12c0 3 16 3 16 0'}
  ], retired: {sequence: {view: 'diagram', scene: 'sequence', note: 'The Sequence view is retired: the Diagram’s Sequence picture draws the messages, and a selected message reads what its contract promises'}}},
  9: {diagram: 'Security and trust in the standard notation', views: [
    {id: 'model', label: 'Threat model', kind: 'overview', q: 'Threats, the controls meant for them, and what each protects.', icon: 'M3 5h6v5H3zM15 14h6v5h-6zM9 7h3v10h3M6 3v18'},
    {id: 'coverage', label: 'Threats & controls', kind: 'cross-section', q: 'Every threat against every control, with the evidence behind each.', needs: ['threat'], icon: X_ICON}
  ]},
  10: {diagram: 'The deployment in the standard notation', views: [
    {id: 'deploy', label: 'Deployment', kind: 'overview', q: 'Every part that must run, placed in the zones of an environment.', icon: 'M3 4h18v6H3zM3 14h8v6H3zM13 14h8v6h-8z'},
    {id: 'failure', label: 'If a zone fails', kind: 'intervention', q: 'Remove a zone, or its failure domain, and see what stops.', needs: ['zone'], icon: 'M12 3 2 21h20L12 3zm0 7v4m0 3h.01'}
  ]},
  11: {diagram: 'Chapter 11’s design rationale in the standard notation', views: [
    {id: 'vitals', label: 'Vitals', kind: 'overview', q: 'Every running part on the monitor: recorded values against targets.', icon: 'M3 12h4l2-6 4 12 2-6h6'},
    {id: 'load', label: 'What it takes', kind: 'intervention', q: 'An objective, turned into a specification for every part.', needs: ['runtime'], icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2'},
    {id: 'trace', label: 'Trace', kind: 'cross-section', q: 'Each requirement followed to where it runs.', needs: ['requirement'], icon: 'M4 6h4v4H4zM10 14h4v4h-4zM16 6h4v4h-4zM8 8h8M12 10v4'},
    {id: 'board', label: 'Running board', kind: 'overview', q: 'Every running part where it is placed, its state in words, and what it runs.', needs: ['runtime'], icon: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z'}
  ]}
};
export const CHAPTERS = Object.keys(TRAY).map(Number);
// The pictures of the standard that are behaviour (a process, messages in order, states); the rest are overviews.
const BEHAVIOUR_SCENES = new Set(['process', 'sequence', 'lifecycle', 'cooperation']);
export const sceneKind = id => (BEHAVIOUR_SCENES.has(id) ? 'behaviour' : 'overview');
// The words for a record a view or picture waits for, and the chapter that records it.
const NEED_WORDS = {component: 'a component', contract: 'a contract', instance: 'a placement', quality: 'a quality driver', decision: 'a decision', responsibility: 'a responsibility', capability: 'a capability', threat: 'a threat', zone: 'a zone', requirement: 'a requirement', runtime: 'an operating plan', 'data:lifecycle': 'a data definition with states'};
export const needChapter = need => (need === 'data:lifecycle' ? 8 : OBJECT_TYPES[need]?.chapter ?? null);
export const needWord = need => NEED_WORDS[need] || ('a ' + String(OBJECT_TYPES[need]?.label || need).toLowerCase());

// The records the project holds, by type, once per saved document: the only input of every gate.
export const recordCounts = perDocument(p => {
  const by = {};
  if (!p) return by;
  for (const o of architectureModel(p).objects.values()) {
    by[o.type] = (by[o.type] || 0) + 1;
    if (o.type === 'data' && Array.isArray(o.record?.lifecycle?.states) && o.record.lifecycle.states.length) by['data:lifecycle'] = (by['data:lifecycle'] || 0) + 1;
  }
  return by;
});
export const needMet = (p, need) => (recordCounts(p)[need] || 0) > 0;
export const unmetNeed = (p, needs) => (needs || []).find(n => !needMet(p, n)) || null;
// What a hidden instrument waits for: the chapter that adds it, or (in this chapter) the first record it needs.
export function laterWord(chapter, need, title) {
  const n = needChapter(need);
  return n && n > Number(chapter) ? `${title} from Chapter ${n}` : `${title} once ${needWord(need)} is recorded`;
}
// A chapter holds a record once the project records anything of a type the chapter owns (Chapter 11, which reads the
// whole, once the project records anything at all). The system record every project starts with is not counted.
export function chapterHasRecords(p, chapter) {
  chapter = Number(chapter); const by = recordCounts(p);
  return Object.entries(by).some(([type, n]) => n > 0 && type !== 'system' && type !== 'data:lifecycle' && (chapter === 11 || OBJECT_TYPES[type]?.chapter === chapter));
}

export const ownViews = chapter => TRAY[Number(chapter)]?.views || [];
export const defaultView = chapter => ownViews(chapter)[0]?.id || 'diagram';
export const viewOf = (chapter, id) => ownViews(chapter).find(v => v.id === id) || null;
export const isOwnView = (chapter, id) => !!viewOf(chapter, id);
// The chapter's own views the project can draw, and the ones that wait with the words for what they wait for. The
// first view is the chapter's default and is always offered.
export function viewsOffered(p, chapter) {
  const views = ownViews(chapter), offered = [], later = [];
  views.forEach((v, i) => { const need = i ? unmetNeed(p, v.needs) : null; if (need) later.push({view: v, need, word: laterWord(chapter, need, v.label)}); else offered.push(v); });
  return {offered, later};
}
// The chapter's Diagram pictures the project can draw, and the ones that wait. The chapter's first picture (the one
// its Diagram opens on) is always offered; the others are gated by the records they declare (notation-model.js SCENES).
export function scenesOffered(p, chapter) {
  const ids = CHAPTER_SCENES[Number(chapter)] || [], offered = [], later = [];
  ids.forEach((id, i) => { const s = SCENES.find(x => x.id === id); if (!s) return; const need = i ? unmetNeed(p, s.needs) : null; if (need) later.push({scene: s, need, word: laterWord(chapter, need, s.title)}); else offered.push(s); });
  return {offered, later};
}
// Where a requested view lands: a renamed view by its old id lands on its new one; a retired view on the instrument
// that keeps its question (with the picture to open, where that is a Diagram picture); a hidden view on the chapter's
// default, with the words that say so; the Diagram, a shared view and an offered view on themselves.
export function resolveView(p, chapter, id, {shared = SHARED_VIEWS.map(v => v.id)} = {}) {
  const T = TRAY[Number(chapter)] || {views: []}, def = defaultView(chapter);
  if (!id) return {view: def};
  // A shared view that waits for what it shows (the module map, for a module structure) lands on the chapter's default
  // and says so, as a hidden or retired view does (rc41, W2: the scale walk found `?model=modules` falling back silently).
  const waiting = SHARED_VIEWS.find(v => v.id === id && v.offered);
  if (waiting && !sharedOffered(p).some(v => v.id === id)) return {view: def, note: `${waiting.label} once the requirements have modules (Chapter 1); opened ${viewOf(chapter, def)?.label || 'the chapter’s view'} instead`};
  if (T.aliases?.[id]) id = T.aliases[id];
  if (T.retired?.[id]) { const r = T.retired[id]; return {view: r.view, scene: r.scene || null, note: r.note}; }
  if (id === 'diagram' || shared.includes(id)) return {view: id};
  const v = viewOf(chapter, id); if (!v) return {view: def};
  const {later} = viewsOffered(p, chapter), gone = later.find(l => l.view.id === id);
  return gone ? {view: def, note: `${gone.word}; opened ${viewOf(chapter, def).label} instead`} : {view: id};
}

// ---------------------------------------------------------------- the switcher
const icon = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
// rc41 (W2): a view button is an item of the chapter strip (chapter-strip.js), the one component the four tabs share.
export const viewButtonHTML = (v, attr, {cls = '', title = v.q} = {}) => `<button type="button" class="cm-view chapter-strip-item${cls ? ' ' + cls : ''}" data-${attr}="view" data-id="${esc(v.id)}" title="${esc(title || '')}">${icon(v.icon)}<span>${esc(v.label)}</span></button>`;
// The chapter's own entries, in order: Diagram, then its views (the shared views follow, notation-view.js addViews).
export function trayButtonsHTML(chapter, attr) {
  const T = TRAY[Number(chapter)] || {views: []};
  return T.views.slice(0, 1).map(v => viewButtonHTML(v, attr)).join('') + viewButtonHTML({...DIAGRAM, q: T.diagram}, attr) + T.views.slice(1).map(v => viewButtonHTML(v, attr)).join('');
}
// The shared views' buttons the project can draw (without a project, the ones that wait for nothing).
const sharedButtonHTML = (v, attr) => viewButtonHTML(v, attr, {cls: 'nt-shared-view', title: v.title});
export const sharedButtonsHTML = (attr, p) => sharedOffered(p).map(v => sharedButtonHTML(v, attr)).join('');
// The Model frame has one stable view rail. Chapter modules supply their actions;
// native, standard and saved views all use these same slots.
export function modelHeaderHTML(chapter, attr, actions = '', title = '') {
  const detailsOpen = typeof document !== 'undefined' && document.body?.dataset.panel === 'open';
  return `<header class="cm-top" data-model-slot="views"><div class="cm-title"><small>Chapter ${esc(chapter)} · Model</small><strong class="pv-title" role="heading" aria-level="2">${esc(title || 'Model views')}</strong></div><div class="cm-views chapter-strip chapter-strip-flat" data-chapter-strip="model" data-chapter-accent="${esc(String(chapter))}" role="group" aria-label="Model views">${trayButtonsHTML(chapter, attr)}${sharedButtonsHTML(attr)}</div><div class="cm-actions">${actions}<button type="button" class="cm-btn cm-expanded-details" data-panel-toggle aria-controls="inspector" aria-expanded="${detailsOpen}">Details</button></div></header>`;
}
// When a linked or keyboard-chosen view lies beyond a phone's visible view rail, reveal its pressed button without
// moving the page. The rail itself remains scrollable and never snaps back while someone is browsing other views.
const viewRailState = new WeakMap();
// Keep text labels; icons yield before a labelled overflow menu. Moving the original
// buttons preserves each chapter's delegated actions and keyboard semantics.
export function fitViewRow(box) {
  if (!box) return;
  // Stable DOM order is part of the navigation contract. Every view keeps its label
  // and its delegated action; a narrow rail scrolls instead of hiding core views.
  const overflow = box.querySelector('.cm-view-more');
  if (overflow) { for (const button of overflow.querySelectorAll('.cm-view')) box.insertBefore(button, overflow); overflow.remove(); }
  box.classList.remove('cm-compact-icons');
}
export function watchViewRail(box) {
  if (!box || typeof MutationObserver === 'undefined' || viewRailState.has(box)) return;
  const state = {id: null, pending: false}; viewRailState.set(box, state);
  const fit = () => { if (state.pending) return; state.pending = true; requestAnimationFrame(() => { state.pending = false; fitViewRow(box); }); };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(box);
  const reveal = () => {
    if (!box.isConnected || typeof matchMedia !== 'function' || !matchMedia('(max-width:700px)').matches) return;
    const active = box.querySelector('.cm-view[aria-pressed="true"]:not([hidden])');
    if (!active || state.id === active.dataset.id) return;
    state.id = active.dataset.id;
    const frame = box.getBoundingClientRect(), target = active.getBoundingClientRect();
    if (target.left < frame.left + 2) box.scrollLeft += target.left - frame.left - 2;
    else if (target.right > frame.right - 22) box.scrollLeft += target.right - frame.right + 22;
  };
  new MutationObserver(() => { syncCurrentView(box); reveal(); fit(); }).observe(box, {subtree: true, attributes: true, attributeFilter: ['aria-pressed']});
  queueMicrotask(fit);
}
// The strip's current item (chapter-strip.js's keyboard model and accent): aria-current follows the pressed view
// wherever aria-pressed is written — applyTray, and every chapter's chrome after the notation draws (rc41 close: it was
// copied once, before the chapter pressed the view it had just drawn, so it stayed one view behind).
function syncCurrentView(box) {
  const active = box.querySelector('.cm-view[data-id][aria-pressed="true"]');
  for (const b of box.querySelectorAll('.cm-view[data-id]')) { if (b === active) { if (b.getAttribute('aria-current') !== 'true') b.setAttribute('aria-current', 'true'); } else if (b.hasAttribute('aria-current')) b.removeAttribute('aria-current'); }
}
// Waiting own views remain named and disabled with their exact prerequisite. They become
// actionable when their records exist. Called by notation-view.js on every draw.
// Round 24 (D-24-08): a shared view that waits for what it shows (the module map, for a module structure) is not in the
// switcher at all until the project has it, so a project without one has the switcher it always had; it is drawn after
// the shared views before it as soon as the project can draw it, and goes when the project no longer can.
export function applyTray(root, p, chapter) {
  const box = root?.querySelector?.('.cm-views'); if (!box) return [];
  watchViewRail(box);
  const {offered, later} = viewsOffered(p, chapter), on = new Set(offered.map(v => v.id)), hidden = [];
  for (const b of box.querySelectorAll('.cm-view[data-id]')) { const own = isOwnView(chapter, b.dataset.id), waiting = own && !on.has(b.dataset.id); b.hidden = false; b.disabled = waiting; if (waiting) { b.title = 'Later: ' + (later.find(x => x.view.id === b.dataset.id)?.word || 'record the required information'); hidden.push(b.dataset.id); } else if (own) b.title = viewOf(chapter, b.dataset.id)?.q || ''; }
  const shared = new Set(sharedOffered(p).map(v => v.id)), drawn = [...box.querySelectorAll('.nt-shared-view[data-id]')];
  const attr = drawn[0]?.getAttributeNames().find(n => n.startsWith('data-') && n !== 'data-id' && drawn[0].getAttribute(n) === 'view')?.slice(5);
  for (const v of SHARED_VIEWS.filter(x => x.offered)) {
    const b = drawn.find(x => x.dataset.id === v.id);
    if (b && !shared.has(v.id)) b.remove();
    else if (!b && shared.has(v.id) && attr) { const before = drawn.filter(x => SHARED_VIEWS.findIndex(y => y.id === x.dataset.id) < SHARED_VIEWS.indexOf(v)).at(-1); if (before) before.insertAdjacentHTML('afterend', sharedButtonHTML(v, attr)); }
  }
  const active = box.querySelector('[aria-pressed="true"]'), remembered = root.dataset?.rememberedView;
  // The strip's current item: aria-current follows the pressed view, now and whenever the chapter presses another.
  syncCurrentView(box);
  let chip = root.querySelector('.cm-remembered');
  if (remembered && active?.dataset.id === remembered && remembered !== defaultView(chapter)) {
    if (!chip) { chip = document.createElement('p'); chip.className = 'cm-remembered'; box.after(chip); }
    const action = active.getAttributeNames().find(n => n.startsWith('data-') && active.getAttribute(n) === 'view');
    chip.title = 'This view was remembered for your project. Restore the chapter’s starting view.';
    chip.innerHTML = `<button type="button" class="cm-btn" ${action || 'data-nt'}="view" data-id="${esc(defaultView(chapter))}">Reset view</button>`;
  } else { chip?.remove(); if (remembered && active) delete root.dataset.rememberedView; }
  requestAnimationFrame(() => fitViewRow(box));
  return hidden;
}
// The entries a chapter's switcher shows for this project, in order: the help map lists exactly these.
export function switcherLabels(p, chapter) {
  const own = ownViews(chapter);
  return [...own.slice(0, 1).map(v => v.label), DIAGRAM.label, ...own.slice(1).map(v => v.label), ...sharedOffered(p).map(v => v.label)];
}

// The same instruments, approached by the question an architect is trying to answer. This is a
// second way into the existing switcher, never another model or a separate navigation state.
// Unavailable chapter views remain visible here with the exact record they wait for.
const QUESTIONS = {
  diagram: 'How is this chapter represented in the model?',
  layers: 'Which architecture layers carry this design?',
  table: 'What has been recorded here?',
  cross: 'Where are the links and gaps between record sets?',
  whole: 'How does this fit into the whole design?',
  modules: 'Which modules organise the requirements, and how far is each?',
  1: {map: 'What happens in the journey?', boundary: 'Who participates, and where is the boundary?'},
  2: {tree: 'Which qualities matter, and what are their targets?', tune: 'What changes if I move a target?'},
  3: {map: 'Why were these decisions made?', matrix: 'Which drivers do the choices help or hurt?'},
  4: {map: 'Who owns each responsibility?', coverage: 'Which needs have an owner and an implementation?'},
  5: {components: 'What components realise the responsibilities?', specification: 'What do we know about one component?'},
  6: {platform: 'What platform capabilities support the application?', failure: 'What depends on a capability if it fails?'},
  7: {stack: 'Which named products realise the capabilities?', options: 'What alternatives were considered?'},
  8: {data: 'Where does each piece of data come from and travel?'},
  9: {model: 'Which threats and controls surround the design?', coverage: 'Which threats have designed controls and evidence?'},
  10: {deploy: 'Where do the parts run?', failure: 'What depends on a zone if it fails?'},
  11: {vitals: 'How do running parts compare with targets?', load: 'What must each part carry?', trace: 'Where is each requirement realised?', board: 'What runs in each place?'}
};
export function questionRows(p, chapter) {
  chapter = Number(chapter);
  const {later} = viewsOffered(p, chapter), waiting = new Map(later.map(x => [x.view.id, x.word]));
  const row = v => ({id: v.id, label: v.label, kind: v.kind, question: QUESTIONS[chapter]?.[v.id] || QUESTIONS[v.id] || v.q, purpose: v.q || (TRAY[chapter]?.diagram || ''), waiting: waiting.get(v.id) || ''});
  return [row({...DIAGRAM, q: TRAY[chapter]?.diagram}), ...ownViews(chapter).map(row), ...SHARED_VIEWS.map(v => ({...row(v), waiting: v.offered && (!p || !v.offered(p)) ? 'Create requirement modules in Chapter 1 to use this view.' : ''}))];
}
// A visible, current reading goal. Native chapter views and standard diagrams keep their own
// purpose; the toolbar never describes a diagram that is no longer on the stage.
export function currentModelPurpose(p, chapter, current, sceneId = '') {
  if (current === 'diagram') {
    const offered = scenesOffered(p, chapter).offered;
    const scene = offered.find(s => s.id === sceneId) || offered[0];
    if (scene) return {label: scene.title, text: scene.purpose};
  }
  const view = questionRows(p, chapter).find(v => v.id === current);
  return view ? {label: view.label, text: view.question} : null;
}
export function questionPickerHTML(p, chapter, current = '') {
  const rows = questionRows(p, chapter);
  const saved = (p?.workbench?.views || []).filter(v => v?.id && v.exploration);
  const perspectives = saved.length ? '<p class="cm-qintro">Saved perspectives</p>' + saved.map(v => `<button type="button" class="cm-qentry" data-cm-perspective="${esc(v.id)}"${v.id === current ? ' aria-current="true"' : ''}><b>${esc(v.purpose || 'What does ' + v.title + ' explain?')}</b><span>${esc(v.title)} · Chapter ${esc(v.chapter)}</span><small>${esc(v.exploration.baselineId ? 'Frozen baseline ' + v.exploration.baselineId : 'Working design')} · ${esc(v.exploration.concern || 'Saved concern')}</small></button>`).join('') : '';
  return `<details class="cm-qpick"><summary class="cm-qsum" aria-label="Questions: choose what the model explains">Questions <span aria-hidden="true">▾</span></summary><div class="cm-qlist" role="group" aria-label="Choose a model question"><p class="cm-qintro">Choose a question to open its view.</p>${rows.map(x => `<button type="button" class="cm-qentry" data-cm-question="${esc(x.id)}"${x.id === current ? ' aria-current="true"' : ''}${x.waiting ? ' disabled' : ''}><b>${esc(x.question)}</b><span>${esc(x.label)} · ${esc(x.kind)}</span><small>${esc(x.waiting || x.purpose)}</small></button>`).join('')}${perspectives}</div></details>`;
}

// ---------------------------------------------------------------- the help map's tray
// Every instrument the chapter offers now, one line each, in the surgeon's words; then what later chapters add.
export function trayLines(p, chapter) {
  chapter = Number(chapter);
  const S = scenesOffered(p, chapter), V = viewsOffered(p, chapter), pair = MATRIX_DEFAULTS[chapter];
  const scenes = S.offered.map(s => s.title + (sceneKind(s.id) === 'behaviour' ? ' (behaviour)' : '')).join(', ');
  const own = ownViews(chapter), line = v => { const waiting = V.later.find(x => x.view.id === v.id); return {label: v.label, kind: v.kind, text: waiting ? 'Later: ' + waiting.word : v.q, offered: !waiting}; };
  const lines = [...own.slice(0, 1).map(line), {label: DIAGRAM.label, kind: DIAGRAM.kind, text: `${scenes || 'the chapter'} in the standard notation`}, ...own.slice(1).map(line)];
  for (const v of sharedOffered(p)) lines.push({label: v.label, kind: v.kind, text: v.id === 'cross' && pair ? `${v.q} Opens on ${setLabel(pair[0]).toLowerCase()} against ${setLabel(pair[1]).toLowerCase()}.` : v.q});
  lines.push({label: PERSPECTIVES.label, kind: PERSPECTIVES.kind, text: PERSPECTIVES.q, offered: chapterHasRecords(p, chapter)});
  const later = [...S.later.map(l => l.word), ...V.later.map(l => l.word)];
  return {lines, later};
}
export function trayHTML(p, chapter) {
  const {lines, later} = trayLines(p, chapter);
  return `<ul class="help-tray">${lines.map(l => `<li${l.offered === false ? ' class="help-tray-wait"' : ''}><b>${esc(l.label)}</b> · <i>${esc(l.kind)}</i>: ${esc(l.text)}</li>`).join('')}</ul>${later.length ? `<p class="help-tray-later"><b>Later</b> · ${esc(later.join(' · '))}</p>` : ''}`;
}
// The chapter's draft action, for an empty card: what the one predicate offers (readiness-model.js draftOffer): the
// journey draft where the chapter can be drafted from the journey, the architecture draft of a grouped project.
export function draftActionHTML(p, chapter) {
  try { const o = draftOffer(p, chapter); return o.kind ? `<a class="cm-btn gold" href="${esc(o.url)}"${o.reason ? ` title="${esc(o.reason)}"` : ''}>${esc(o.text)}</a>` : ''; } catch { return ''; }
}
