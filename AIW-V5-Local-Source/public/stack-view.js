// Chapter 7 Model — Technology realization.
//
// Two architecture models of the product layer beneath the platform, drawn from recorded facts:
// - Stack: every realisation in Chapter 6's order — the capability it realises, the option
//   chosen for it (hatched where no choice is made yet), who depends on it and what stops if it
//   fails, the implementation obligations written for it, and how far its selection has gone.
// - Options: one realisation's options against the criteria that should decide between them.
// Sliced by family or opened option by option, read through the Structure, Operation and
// Reasoning lenses, and edited only through the Chapter 7 editors and proposals.
import {choiceForDesign, suggestionCommands} from './product-choice.js';
import {choiceSummaryHTML, recordSuggestions} from './choice-ui.js';
import {selectionPreparation} from './technology-realisation-domain.js';
import {stackSource, foldStack, stackScope, optionsFor, stackInsights, describeRealisation, capTitle, optionOf, OBLIGATIONS, STATE_LABEL, PROPOSED} from './stack-model.js';
import {stackLayout, stackHead, optionsLayout, optionsHead, SX, OX} from './stack-layout.js';
import {FAMILIES} from './platform-model.js';
import {categoryName} from './technology-domain.js';
import {modelChrome,modelStage, sizeModel, placeTip, edgesHTML, toolsHTML, defaultPanel, panelToggle, setState, emptyCard, showFailure, announceObject, focusKey, refocus, anatomyOrder, nextFrame, companionHost, listen, companionOpen, releaseCompanion, inCompanion, insightsSection} from './model-stage.js';
import {projectPreferenceKey, projectURL, currentProject as project, onProjectSwitch, scopedProject} from './project-context.js';
import {mountBrainContext} from './brain-context-ui.js';
import {specPanelHTML} from './spec-panel.js';
import {solChapterMount, solChapterBind, solSection, solInto, solMark, solOwner} from './chapter-sol.js';
import {createNotation} from './notation-view.js';
import {modelHeaderHTML, draftActionHTML} from './instrument-tray.js';
import {chapterLenses} from './lens-vocabulary.js';
import {esc,safeUrl} from './html-escape.js';
import {readStoredObject} from './util.js';
// Round 24 (D-24-08): the model and its pictures read the shell's module scope (project-context.js scopedProject: the saved
// document without one); Sol, proposals and editors keep the saved document.

// Sol's advice changes the project only through a store command; the view then reads the new document.
const solRefresh = () => { if (root?.isConnected) mountChapterModel({id: pageSel}, cbs); };
const studio = () => window.aiwLogicalStudio;
// Chapter 7 edits that reach other chapters are staged as a reviewable model proposal; while one
// is open, the model shows the proposed design and marks what it changes.
const pending = () => { const i = window.aiwInterfaceImpact; return i?.pending && i.previewInChapter?.(7) ? i : null; };
const PATHS = {diagram: 'M4 4h6v5H4zM14 4h6v5h-6zM9 15h6v5H9zM7 9v3h10V9M12 12v3', structure: 'M6 3v18M18 3v18M6 8h12M6 16h12', operation: 'M3 12h4l3-7 4 14 3-7h4', reasoning: 'M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9M9 7h6M9 17h6', stack: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5M3 18l9 5 9-5', options: 'M4 4h16v16H4zM4 10h16M10 4v16M16 4v16', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', panel: 'M3 4h18v16H3zM15 4v16', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', plus: 'M12 5v14M5 12h14', spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z', mind: 'm3 7 9-4 9 4-9 4-9-4m0 5 9 4 9-4m-18 5 9 4 9-4', edit: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4', dissect: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14M21 21l-5-5M8 11h6'};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[n] || PATHS.stack}"/></svg>`;
// The chapter's lenses, its subset of the one vocabulary (lens-vocabulary.js), each with the chapter's own question.
const LENSES = chapterLenses({
  structure: 'What each realisation provides, the product chosen for it, and who depends on it.',
  operation: 'The implementation obligations, sizing and cost behind each choice.',
  reasoning: 'How far each selection has gone, and the criteria and evidence behind it.'
});
const EFFECT = {supports: ['✓', 'Supports'], tension: ['!', 'Trade-off'], unknown: ['?', 'Needs evidence']};

let marked = new Set(), lastProposal = '', lastClick = {id: null, t: 0};
let root = null, S = null, lastDoc = null, cbs = {}, F = null, G = null, L = null, fitPending = true, stage = null, pageSel, CH = null;
let NT = null;
const freshView = () => ({view: 'stack', lens: 'structure', scope: {kind: 'system'}, depth: 'realisations', sel: null, rec: null, panel: true});
let V = freshView();
// The standard diagram (notation-view.js) and the elements only it draws (the application itself, an external system, a placement).
// The standard diagram and the shared views (Layers, Table, Matrix, Whole design) are drawn by notation-view.js.
const diagramView = () => !!NT && NT.owns(V.view);
const drawn = id => diagramView() && !!NT?.diagram()?.nodes.some(n => n.id === id);
const pref = () => projectPreferenceKey('aiw-stack-model-v1');
function save() { try { localStorage.setItem(pref(), JSON.stringify({view: V.view, lens: V.lens, scope: V.scope, depth: V.depth, sel: V.sel, rec: V.rec, panel: V.panel})); } catch { /* preferences are optional */ } }
// This browser's preferences for the chapter's model in the project on screen (read when the model is first drawn,
// and again when another project opens in place).
function restorePreferences() {
  const v = readStoredObject(pref());
  for (const k of ['view', 'lens', 'depth', 'sel', 'rec']) if (typeof v[k] === 'string') V[k] = v[k];
  if (v.scope && typeof v.scope === 'object') V.scope = v.scope;
  V.panel = defaultPanel(v.panel);
  V.view = NT.settle(V.view);
  if (!LENSES.some(l => l.id === V.lens)) V.lens = 'structure';
  if (!['realisations', 'options'].includes(V.depth)) V.depth = 'realisations';
}
// Another project opened in place (round 4, A): the model leaves and forgets the last project's view — its view, lens,
// scope, depth, panel, selection and walk — then reads the new project's preferences for this chapter; the next mount
// rebuilds from the new project's document. The picture's own choices are reset by its notation (notation-view.js).
onProjectSwitch(() => { leaveChapterModel(); V = freshView(); S = null; lastDoc = null; pageSel = undefined; fitPending = true; marked.clear(); lastProposal = ''; announced = undefined; if (NT) restorePreferences(); });

// ---------------------------------------------------------------- mount / leave

export function mountChapterModel(selection, callbacks = {}) {
  const p = project(), host = document.querySelector('.studio > .stage.tab-content');
  if (!p || !host) return;
  cbs = callbacks;
  solChapterMount(p, 7, solRefresh);
  if (!root) {
    root = document.createElement('section'); root.className = 'cm sk'; root.setAttribute('aria-label', 'Chapter 7 model: technology realization');
    root.innerHTML = shell();
    stage = modelStage(root, {headHeight: () => (diagramView() ? 0 : V.view === 'options' ? optionsHead() : stackHead()), railWidth: l => l.rail || 0, onHover: tip});
    stage.bind(); bind();
    // The standard diagram shares the stage, the companion and the selection with the chapter's own views.
    NT = createNotation({chapter: 7, root, stage, project: scopedProject, onSelect: id => select(id)});
    NT.addViews('sk');
    NT.onChange = full => { if (full) fitPending = true; render(); };
    NT.bindDrag();
    restorePreferences();
    // The address may open the model on a view (a deep link, and the rendered checks).
    { const mv = window.aiwChapterModels?.takeView?.(7) || new URLSearchParams(location.search).get('model'); V.view = mv ? NT.settle(mv, 'link') : NT.settle(V.view); }
  } else {
    // A route the shell follows in place may name the view too (round 4, A: workspace-ux.js routeModel).
    const mv = window.aiwChapterModels?.takeView?.(7); if (mv) V.view = NT.settle(mv, 'link');
  }
  const first = !S;
  if (host.firstElementChild !== root) host.prepend(root);
  document.body.classList.add('cm-active');
  const d = pending()?.document || scopedProject();
  if (d !== lastDoc || !S) { lastDoc = d; rebuild(d); }
  const selectable = id => !!id && known(id);
  if (first && S) { const want = window.aiwChapterModels ? (window.aiwChapterModels.takeLink(7) || selection?.subject || null) : new URLSearchParams(location.search).get('object'); if (selectable(want)) { adopt(want); nextFrame(() => revealSelection()); } }
  else if (S && pageSel !== undefined && selection?.id !== pageSel && selectable(selection?.id)) { adopt(selection.id); nextFrame(() => revealSelection()); }
  pageSel = selection?.id ?? null;
  render();
  sizeModel(root, 'cm-expanded');
}
export function leaveChapterModel() {
  document.body.classList.remove('cm-active', 'cm-expanded');
  releaseCompanion(root);
  root?.remove();
}
function adopt(id) { V.sel = id; const r = recOf(id); if (r) V.rec = r.id; }
function rebuild(d) {
  try { S = stackSource(d, {order: anatomyOrder()}); } catch (e) { console.error('Stack model', e); S = null; return; }
  if (V.sel && !known(V.sel)) V.sel = null;
  if (!S.R.has(V.rec)) V.rec = [...S.R.keys()][0] || null;
  marked = new Set();
  const i = pending(), roots = [];
  if (i) { try { const g = i.decorate({nodes: [...S.R.keys(), ...S.Pf.capabilities.keys()].map(id => ({id, attrs: {}})), edges: []}); for (const n of g.nodes) { if (n.ghost || n.changeImpact) marked.add(n.id); if (n.ghost) roots.push(n.id); } } catch { /* the preview decorates what it can */ } }
  const key = i ? roots.join(',') : '';
  if (key && key !== lastProposal && roots[0] && known(roots[0])) { adopt(roots[0]); nextFrame(() => revealSelection()); }
  lastProposal = key;
}
const knownBase = id => S.R.has(id) || S.Pf.capabilities.has(id) || !!recOf(id) || id?.startsWith?.('CRIT:');
const known = id => drawn(id) || knownBase(id);
// A selection can be a realisation, one of its options ("tr-001/TO-001"), or a criterion.
function recOf(id) { if (!id) return null; if (S.R.has(id)) return S.R.get(id); const [r, o] = String(id).split('/'); return S.R.has(r) && optionOf(S.R.get(r), o) ? S.R.get(r) : null; }

// ---------------------------------------------------------------- shell

function shell() {
  return `${modelHeaderHTML(7, 'sk', `<details class="cm-add"><summary class="cm-btn" aria-label="Add to the model">${icon('plus')}<span>Add</span></summary><div><button type="button" data-tr-action="new">New realisation</button><p>To add an option to a realisation, select it first and use “Add an option”.</p></div></details>
    <button type="button" class="cm-btn icon" data-sk="expand" aria-pressed="false" aria-label="Expand the model" title="Expand">${icon('expand')}</button>
    <button type="button" class="cm-btn icon" data-sk="panel" aria-pressed="true" aria-label="Hide the companion panel" title="Companion">${icon('panel')}</button>`, 'Technology realization')}
  <div class="cm-bar" data-model-slot="commands"><nav class="cm-crumbs" aria-label="Model scope"></nav><div class="cm-lenses" role="group" aria-label="Lens"></div><label class="cm-scn" hidden><span>Realisation</span><select data-sk-field="rec"></select></label><div class="cm-depth" role="group" aria-label="Rows"></div></div>
  <div class="cm-banner" data-model-slot="notice"></div>
  <div class="cm-body" data-model-slot="content"><div class="cm-stage" tabindex="0" aria-label="Technology canvas. Drag or scroll to move; arrow keys pan; Ctrl or Command and scroll to zoom.">
    <div class="cm-world"><svg class="cm-svg" aria-hidden="true"></svg><div class="cm-html"></div></div>
    <div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div>${edgesHTML()}
  </div><aside class="cm-panel" aria-label="Companion"></aside></div>
  <footer class="cm-walk" data-model-slot="status" aria-label="Status and tools"><div class="cm-walk-in"></div><p class="cm-state" role="status" aria-live="polite"></p>${toolsHTML('sk')}</footer><div class="cm-tip" role="tooltip" hidden></div>`;
}

// ---------------------------------------------------------------- render

const optView = () => V.view === 'options';
const proposal = () => { const g = studio()?.proposal; return g && ((g.record && g.key) || (g.recordId && g.optionId)) ? g : null; };
const ghost = () => { const g = proposal(); return g?.record ? g : null; };
const previewing = () => { const g = proposal(); return g?.recordId ? g : null; };
const capChip = id => { const c = S.Pf.capabilities.get(id); return c ? `<i class="sk-cap f-${c.family}" data-sel="${esc(id)}" title="${esc(c.ref + ' · ' + c.title + ' · ' + categoryName(c.category))}"><b>${esc(c.ref)}</b>${esc(c.title)}</i>` : ''; };

function render() {
  if (!root) return;
  V.view = NT.settle(V.view);
  if (!S) { showFailure(root, 'The technology model could not be prepared for this project.'); return; }
  const fk = focusKey(root);
  if (V.sel !== announced) announce();
  root.classList.remove('cm-lens-structure', 'cm-lens-operation', 'cm-lens-reasoning');
  root.classList.add('cm-lens-' + V.lens);
  root.classList.toggle('sk-opts', optView());
  root.querySelector('.cm-body').classList.toggle('no-panel', !V.panel);
  root.classList.toggle('nt-active', diagramView());
  if (diagramView()) {
    // The standard diagram: the notation module draws; the chapter keeps its chrome, companion and camera.
    L = NT.render({sel: V.sel, view: V.view, viewW: stage.box().w});
    root.querySelector('.cm-heads-in').innerHTML = ''; root.querySelector('.cm-rail-in').innerHTML = '';
    chromeDiagram(); panel(); modelChrome(root);
    stage.use(L, 'diagram|' + (NT.scene()?.id || '') + '|' + NT.arrangement());
    if (fitPending) { fitPending = false; NT.fit(); } else stage.clamp();
    stage.apply(); refocus(root, fk); return;
  }
  // Geometry follows the recorded realisations, the scope, the rows shown and a pending proposal —
  // never the lens. The options share the stage's width.
  if (optView()) { G = optionsFor(S, V.rec, {proposal: previewing()}); L = G ? optionsLayout(G, {viewW: stage.box().w}) : null; CH = G ? choiceForDesign(project(), V.rec) : null; }
  else { F = foldStack(S, stackScope(S, V.scope), V.depth, {proposal: proposal()}); L = stackLayout(F); }
  const world = root.querySelector('.cm-world'), svg = root.querySelector('.cm-svg');
  const empty = !L || (!optView() && !F.rows.length);
  if (empty) {
    for (const s of ['.cm-svg', '.cm-heads-in', '.cm-rail-in']) root.querySelector(s).innerHTML = '';
    root.querySelector('.cm-rail').style.width = '0px'; root.querySelector('.cm-html').innerHTML = emptyHTML();
    world.style.width = '900px'; world.style.height = '420px';
    chrome(); panel(); modelChrome(root); stage.use({W: 900, H: 420, rail: 0}, 'empty'); stage.fit(); stage.apply(); return;
  }
  world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
  svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
  const hl = highlight();
  if (optView()) { svg.innerHTML = optionsSVG(hl); root.querySelector('.cm-html').innerHTML = optionsHTML(hl); optionsHeads(hl); optionsRail(hl); }
  else { svg.innerHTML = stackSVG(hl); root.querySelector('.cm-html').innerHTML = stackHTML(hl); stackHeads(hl); stackRail(hl); }
  chrome(); panel(); NT.ownView(); modelChrome(root);
  stage.use(L, JSON.stringify([V.view, V.scope?.id || '', V.depth, V.rec]));
  if (fitPending) { fitPending = false; stage.fit(); } else stage.clamp();
  stage.apply();
  refocus(root, fk);
}

// Nothing to draw: no realisation and no capability to realise. The next action stands in place.
function emptyHTML() {
  const caps = S.Pf.capabilities.size;
  if (optView()) return emptyCard({title: 'No realisation to compare', text: 'Options belong to a realisation: the product layer chosen for one Chapter 6 capability. Record a realisation first, then its options.', x: 40, y: optionsHead() + 30, actions: `<button type="button" class="cm-btn" data-sk="scope">Back to the stack</button>`});
  return emptyCard({title: 'No realisation yet', text: 'A realisation chooses the product that provides one Chapter 6 capability, with its options, obligations, sizing and cost.' + (caps ? '' : ' There is no capability to realise yet: the platform in Chapter 6 comes first.'), x: 40, y: stackHead() + 30,
    actions: `${caps ? tact('new', '', icon('plus') + 'New realisation', 'primary') : ''}<a class="cm-btn${caps ? '' : ' primary'}" href="${esc(projectURL('/?chapter=6&tab=' + (caps ? 'model' : 'work')))}">${caps ? 'The capabilities in Chapter 6' : 'Define capabilities in Chapter 6'}</a>${draftActionHTML(project(), 7)}`});
}

function highlight() {
  const out = {on: false, rows: new Set(), caps: new Set()};
  const id = V.sel; if (!id) return out;
  // In Options, only a criterion lights a row; the realisation itself is the whole view.
  if (optView()) { if (id.startsWith('CRIT:')) { out.on = true; out.rows.add(id.slice(5)); } return out; }
  out.on = true;
  const r = recOf(id);
  if (r) { out.rows.add(r.id); if (id !== r.id) out.rows.add(id); r.caps.forEach(c => out.caps.add(c)); }
  else if (S.Pf.capabilities.has(id)) { out.caps.add(id); for (const x of S.R.values()) if (x.caps.includes(id)) out.rows.add(x.id); out.rows.add('HOLE:' + id); }
  else if (id.startsWith('CRIT:')) out.rows.add(id.slice(5));
  return out;
}
const dimCls = (hl, id) => (hl.on ? (hl.rows.has(id) ? ' lit' : ' dim') : '');

// ---------------------------------------------------------------- the stack

function stackSVG(hl) {
  const out = [], right = L.W - 16;
  for (const g of L.groups) out.push(`<rect class="sk-group" x="${L.rail}" y="${g.y}" width="${right - L.rail}" height="${g.h}"/>`);
  L.rows.forEach((r, i) => out.push(`<rect class="sk-row${r.row.kind === 'option' ? ' opt' : i % 2 ? ' odd' : ''}${hl.rows.has(r.id) ? ' lit' : ''}" x="${L.rail}" y="${r.y}" width="${right - L.rail}" height="${r.h}"/>`));
  for (const c of L.cols) out.push(`<line class="sk-col g-${c.group}" x1="${c.x + c.w}" x2="${c.x + c.w}" y1="${L.top}" y2="${L.H - 16}"/>`);
  return out.join('');
}
function cellHTML(row, col, box, hl) {
  const r = row.rec, pos = `style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px"`, cls = `sk-c g-${col.group}${dimCls(hl, row.id)}`;
  if (row.kind === 'hole' || row.kind === 'proposed') {
    // The proposal names the capability this row stands for, so it never lands on another one.
    if (col.id === 'choice') return row.kind === 'proposed' ? `<button type="button" class="${cls} sk-prod proposed" data-tr-action="edit-ghost" ${pos}><small>Proposed realisation · not saved</small><b>${esc(row.title)}</b></button>` : `<div class="${cls} sk-prod none" ${pos}><small>No realisation</small><button type="button" class="cm-mini gold" data-tr-action="ghost" data-tr-key="missing" data-tr-id="${esc(row.capability)}">Propose a realisation</button></div>`;
    return '';
  }
  if (row.kind === 'option') {
    const o = row.option, n = k => r.criteria.filter(c => (o.assessments[c.id]?.effect || 'unknown') === k).length;
    if (col.id === 'choice') return `<button type="button" class="${cls} sk-prod opt${row.chosen ? ' chosen' : ''}${row.preview ? ' preview' : ''}" data-sel="${esc(row.id)}" ${pos}><small>Option · ${esc(o.id)}</small><b>${esc(o.product || o.title)}</b><span>${esc([o.version, o.vendor].filter(Boolean).join(' · ') || o.title)}</span><i class="sk-om">${esc(o.operatingModel || 'No operating model')}</i></button>`;
    if (col.id === 'serves') return `<div class="${cls} sk-ass" ${pos} title="${esc(`${n('supports')} support · ${n('tension')} trade-offs · ${n('unknown')} need evidence`)}"><i class="sup">✓ ${n('supports')}</i><i class="ten">! ${n('tension')}</i><i class="unk">? ${n('unknown')}</i></div>`;
    if (col.id === 'selection') return row.chosen ? `<div class="${cls} sk-sel" ${pos}><span class="sk-st preferred">Preferred</span></div>` : `<div class="${cls} sk-sel" ${pos}><button type="button" class="cm-mini" data-sk="prefer" data-id="${esc(r.id)}" data-option="${esc(o.id)}">Prefer this option</button></div>`;
    return '';
  }
  // A realisation.
  if (col.id === 'choice') {
    const pv = row.preview ? optionOf(r, row.preview) : null, o = pv || optionOf(r, r.chosen);
    if (!o) return `<button type="button" class="${cls} sk-prod none" data-sel="${esc(r.id)}" ${pos}><small>Choice not made</small><b>${r.options.length} option${r.options.length === 1 ? '' : 's'}</b><span>${esc(r.options.map(x => x.product || x.title).join(' · '))}</span></button>`;
    return `<button type="button" class="${cls} sk-prod${pv ? ' preview' : ''}" data-sel="${esc(r.id)}" ${pos}><small>${pv ? 'Preview · not saved' : 'Preferred'}</small><b>${esc(o.product || o.title)}</b><span>${esc([o.version, o.vendor].filter(Boolean).join(' · ') || (o.product ? o.title : 'no product named'))}</span><i class="sk-om">${esc(o.operatingModel || 'No operating model')}</i></button>`;
  }
  if (col.id === 'serves') { const all = S.Pf.components.size; return `<div class="${cls} sk-serves${r.stops.length === all ? ' wide' : r.stops.length ? ' some' : ''}" ${pos}><b>${r.serves.length} component${r.serves.length === 1 ? '' : 's'}</b><small>${r.stops.length ? `stop ${r.stops.length} of ${all} if it fails` : 'none stop if it fails'}</small></div>`; }
  if (col.obligation) { const done = !!r.plans[col.id], prop = row.proposedPlans.includes(col.id); return `<button type="button" class="${cls} sk-ob${done ? ' done' : prop ? ' proposed' : ' open'}" data-sel="${esc(r.id)}" ${pos} title="${esc(OBLIGATIONS.find(o => o.id === col.id).long + ': ' + (done ? r.plans[col.id] : prop ? 'proposed, not saved' : 'not written'))}" aria-label="${esc(OBLIGATIONS.find(o => o.id === col.id).long + (done ? ' written' : prop ? ' proposed' : ' not written'))}">${done ? '✓' : prop ? '+' : ''}</button>`; }
  if (col.id === 'sizing') return `<div class="${cls} sk-num${r.sized ? ' done' : ''}" ${pos} title="${esc(r.sized ? r.sizing.value + ' ' + r.sizing.unit + ' — ' + r.sizing.basis : 'No sizing basis')}">${r.sized ? esc(r.sizing.value + ' ' + r.sizing.unit) : '—'}</div>`;
  if (col.id === 'cost') return `<div class="${cls} sk-num${r.costed ? ' done' : ''}" ${pos} title="${esc(r.costed ? r.cost.annual + ' ' + r.cost.currency + ' a year — ' + r.cost.basis : 'No cost estimate')}">${r.costed ? esc(r.cost.annual + ' ' + r.cost.currency) : '—'}</div>`;
  if (col.id === 'selection') {
    const step = {none: 0, preferred: 1, recorded: 2, stale: 2, approved: 3}[r.state];
    return `<div class="${cls} sk-sel ${esc(r.state)}" ${pos}><span class="sk-steps">${[1, 2, 3].map(i => `<i class="${i <= step ? 'on' : ''}${r.state === 'stale' && i === 2 ? ' stale' : ''}"></i>`).join('')}</span><span class="sk-st ${esc(r.state)}">${esc(STATE_LABEL[r.state])}</span></div>`;
  }
  return '';
}
function stackHTML(hl) {
  const out = [], C = new Map(L.cols.map(c => [c.id, c])), R = new Map(L.rows.map(r => [r.id, r]));
  // A family heading opens that family; the crumb leads back.
  for (const gr of L.groups) { const f = FAMILIES.find(x => x.id === gr.family); out.push(`<button type="button" class="sk-mg" data-sk="family" data-id="${esc(gr.family)}" style="left:${L.x0 + 4}px;top:${gr.y + 3}px" title="Open the ${esc(gr.title.toLowerCase())} family">${esc(gr.title)}<small>${esc(f?.sub || '')}</small></button>`); }
  for (const b of L.cells) { const html = cellHTML(R.get(b.row).row, C.get(b.col), b, hl); if (html) out.push(html); }
  return out.join('');
}
function stackHeads(hl) {
  const box = root.querySelector('.cm-heads-in'), out = [];
  for (const b of L.colGroups) out.push(`<div class="sk-band g-${b.group}" style="left:${b.x + 3}px;width:${b.w - 6}px;top:6px;height:${SX.BAND - 4}px">${esc(b.title)}</div>`);
  for (const c of L.cols) out.push(`<div class="sk-ch g-${c.group}${c.obligation ? ' ob' : ''}" style="left:${c.x + 2}px;width:${c.w - 4}px;top:${SX.BAND + 6}px;height:${SX.HEAD_H - SX.BAND - 6}px"><b>${esc(c.title)}</b>${c.sub ? `<small>${esc(c.sub)}</small>` : ''}</div>`);
  box.innerHTML = out.join('');
  box.style.width = L.W + 'px';
}
function stackRail(hl) {
  const box = root.querySelector('.cm-rail-in');
  box.innerHTML = L.rows.map(row => {
    const x = row.row, pos = `style="top:${row.y + 4}px;height:${row.h - 8}px"`, lit = dimCls(hl, row.id);
    if (x.kind === 'hole' || x.kind === 'proposed') return `<button type="button" class="sk-rec ${esc(x.kind)}${V.sel === x.capability ? ' sel' : ''}${lit}" data-sel="${esc(x.capability || '')}" ${pos}><small>${x.kind === 'proposed' ? 'Proposal · not saved' : 'Not realised'}${x.capability && S.Pf.capabilities.get(x.capability) ? ' · realises ' + esc(S.Pf.capabilities.get(x.capability).ref) : ''}</small><b>${esc(x.kind === 'proposed' ? x.title : capTitle(S, x.capability))}</b></button>`;
    const r = x.rec;
    if (x.kind === 'option') return `<button type="button" class="sk-rec opt${x.chosen ? ' chosen' : ''}${V.sel === x.id ? ' sel' : ''}${lit}" data-sel="${esc(x.id)}" ${pos}><b>${esc(x.option.title)}</b><small>${esc(x.option.operatingModel || '')}${x.chosen ? ' · preferred' : ''}</small></button>`;
    // The rail says what the realisation realises; the columns start at the choice.
    const n = OBLIGATIONS.filter(o => r.plans[o.id]).length, caps = r.caps.map(c => S.Pf.capabilities.get(c)).filter(Boolean);
    return `<button type="button" class="sk-rec f-${r.family}${V.sel === r.id ? ' sel' : ''}${marked.has(r.id) ? ' changed' : ''}${r.state === 'none' ? ' open' : ''}${lit}" data-sel="${esc(r.id)}" ${pos} title="${esc(r.ref + ' · realises ' + (caps.map(c => c.ref + ' ' + c.title).join(', ') || 'no capability') + ' · owner ' + (r.owner || 'not named'))}"><small>${esc(r.ref)} · realises ${esc(caps.map(c => c.ref).join(', ') || 'nothing')}</small><b>${esc(r.title)}</b><span class="sk-l st">${esc(caps.map(c => c.title).join(', ') || 'no capability')} · ${r.options.length} option${r.options.length === 1 ? '' : 's'}</span><span class="sk-l op">${n} of ${OBLIGATIONS.length} obligations · ${r.sized ? 'sized' : 'no sizing'} · ${r.costed ? 'costed' : 'no cost'} · ${esc(r.owner || 'no owner')}</span><span class="sk-l rs">${esc(STATE_LABEL[r.state])}${r.chosen ? ` · ${r.assessed} of ${r.criteria.length} criteria assessed` : ''}</span></button>`;
  }).join('');
  box.style.height = L.H + 'px'; box.style.width = L.rail + 'px';
}

// ---------------------------------------------------------------- options

function optionsSVG(hl) {
  const out = [], right = L.W - 16;
  for (const g of L.groups) out.push(`<rect class="sk-group" x="${L.rail}" y="${g.y}" width="${right - L.rail}" height="${g.h}"/>`);
  L.rows.forEach((r, i) => out.push(`<rect class="sk-row${i % 2 ? ' odd' : ''}${hl.rows.has(r.id) ? ' lit' : ''}" x="${L.rail}" y="${r.y}" width="${right - L.rail}" height="${r.h}"/>`));
  for (const n of L.notes) out.push(`<rect class="sk-row note" x="${L.rail}" y="${n.y}" width="${right - L.rail}" height="${n.h}"/>`);
  if (L.weigh) out.push(`<rect class="sk-row weigh" x="${L.rail}" y="${L.weigh.y}" width="${right - L.rail}" height="${L.weigh.h}"/>`);
  for (const c of L.cols) if (c.col.chosen || c.col.preview) out.push(`<rect class="sk-pick${c.col.preview ? ' preview' : ''}" x="${c.x + 2}" y="${L.top}" width="${c.w - 4}" height="${L.H - L.top - 16}" rx="8"/>`);
  for (const c of L.cols) out.push(`<line class="sk-col" x1="${c.x + c.w}" x2="${c.x + c.w}" y1="${L.top}" y2="${L.H - 16}"/>`);
  return out.join('');
}
function suggestionOf(optionId, critId) {
  const o = CH?.options.find(x => x.option.id === optionId), i = CH?.criteria.findIndex(c => c.id === critId);
  const x = o && i >= 0 ? o.cells[i] : null;
  return x && x.source === 'suggested' ? x.suggested : null;
}
function optionsHTML(hl) {
  const out = [], r = G.record;
  for (const gr of L.groups) out.push(`<div class="sk-mg" style="left:${L.rail + 14}px;top:${gr.y + 5}px">${esc(gr.title)}</div>`);
  for (const c of L.cells) {
    const [sym, label] = EFFECT[c.effect] || EFFECT.unknown, o = optionOf(r, c.col), crit = r.criteria.find(x => x.id === c.row);
    const sug = c.effect === 'unknown' ? suggestionOf(c.col, c.row) : null, [ssym, slabel] = sug ? EFFECT[sug.effect] || EFFECT.unknown : [];
    const tip = sug ? `${o.title} · ${crit.title}: suggested — ${slabel}: ${sug.reasons.map(x => x.text + ' (' + x.src + ')').join(' ')} Record it to make it a judgement.` : `${o.title} · ${crit.title}: ${label}${c.reason ? ' — ' + c.reason : ''}${c.evidence ? ' (evidence: ' + c.evidence + ')' : c.effect !== 'unknown' ? ' (no evidence yet)' : ''}`;
    out.push(`<button type="button" class="sk-as ${esc(c.effect)}${sug ? ' sug sug-' + sug.effect + (sug.weak ? ' weak' : '') : ''}${c.complete || c.effect === 'unknown' ? '' : ' thin'}${hl.on ? (hl.rows.has(c.row) ? ' lit' : ' dim') : ''}" data-sk="assess" data-option="${esc(c.col)}" data-criterion="${esc(c.row)}" style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px" title="${esc(tip)}" aria-label="${esc(tip)}"><b>${sug ? ssym : sym}</b><span>${sug ? '<i>' + (sug.weak ? 'Named · not weighed' : 'Suggested') + '</i> ' + esc(sug.reasons[0].text) : esc(c.reason || label)}</span></button>`);
  }
  for (const w of L.weighCells || []) { const x = CH?.options.find(o => o.option.id === w.col); if (!x) continue; const lean = CH.leanAll === w.col, sg = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n); out.push(`<div class="sk-weigh${lean ? ' lean' : ''}" style="left:${w.x}px;top:${w.y}px;width:${w.w}px;height:${w.h}px" title="${esc('Σ priority × effect: recorded judgements ' + sg(x.recordedScore) + '; with the suggestions ' + sg(x.score))}"><b>${sg(x.score)}${lean ? ' ★' : ''}</b><small>with suggestions · recorded ${sg(x.recordedScore)}</small></div>`); }
  for (const n of L.noteCells) { const o = optionOf(r, n.col), v = n.note === 'benefits' ? o.benefits : o.drawbacks; out.push(`<div class="sk-note ${n.note}${v ? '' : ' empty'}" style="left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px">${esc(v || (n.note === 'benefits' ? 'Benefits not written' : 'Limits not written'))}</div>`); }
  return out.join('');
}
function optionsHeads(hl) {
  const box = root.querySelector('.cm-heads-in'), out = [], r = G.record;
  for (const c of L.cols) {
    const o = c.col.option, st = c.col.preview ? 'Preview · not saved' : c.col.chosen ? 'Preferred' : '';
    const cfg = o.configuration || {}, summary = `${cfg.serviceTier || 'tier unknown'} · ${cfg.replicaCount ?? 'instances unknown'} · ${cfg.failureDomains || 'domains unknown'}`;
    out.push(`<button type="button" class="sk-oh${c.col.chosen ? ' chosen' : ''}${c.col.preview ? ' preview' : ''}${V.sel === r.id + '/' + o.id ? ' sel' : ''}" data-sel="${esc(r.id + '/' + o.id)}" style="left:${c.x + 4}px;width:${c.w - 8}px;top:8px;height:${OX.HEAD_H - 8}px" title="${esc(`${summary} · ${cfg.topology || 'topology unknown'} · ${cfg.workloadProfile || 'workload unknown'}. Select to inspect evidence and rationale.`)}"><small>${esc(o.id)}${st ? ` · <i>${st}</i>` : ''}${CH?.leanAll === o.id ? ' · <i class="sk-lean">★ the drivers lean to it</i>' : ''}</small><b>${esc(o.product || o.title)}</b><span>${esc(o.product ? o.title : 'no product named')}</span><span>${esc([o.version, o.vendor].filter(Boolean).join(' · ') || 'version and vendor not named')}</span><span class="sk-configuration-summary">${esc(summary)}</span><i class="sk-om">${esc(o.operatingModel || 'No operating model')}</i></button>`);
  }
  box.innerHTML = out.join('');
  box.style.width = L.W + 'px';
}
function optionsRail(hl) {
  const box = root.querySelector('.cm-rail-in'), r = G.record;
  box.innerHTML = L.rows.map(row => { const c = row.row.criterion; return `<button type="button" class="sk-crit ${esc(c.kind)}${V.sel === 'CRIT:' + c.id ? ' sel' : ''}${hl.on ? (hl.rows.has(c.id) ? ' lit' : ' dim') : ''}" data-sel="CRIT:${esc(c.id)}" style="top:${row.y + 4}px;height:${row.h - 8}px" title="${esc(c.title + ' — ' + c.detail)}"><b>${esc(c.kind === 'driver' ? c.id + ' · ' + c.title : c.title)}</b><small>${esc(c.detail)}</small></button>`; }).join('') + (L.weigh ? `<div class="sk-crit note weigh" style="top:${L.weigh.y + 4}px;height:${L.weigh.h - 8}px"><b>Σ priority × effect</b><small>drivers by priority (Critical 3, Important 2, Supporting 1), the rest ×1; suggestions fill the gaps</small></div>` : '') + L.notes.map(n => `<div class="sk-crit note" style="top:${n.y + 4}px;height:${n.h - 8}px"><b>${esc(n.title)}</b><small>${n.id === 'benefits' ? 'what the option brings' : 'known drawbacks and constraints'}</small></div>`).join('');
  box.style.height = L.H + 'px'; box.style.width = L.rail + 'px';
}

// ---------------------------------------------------------------- chrome

function crumbs() {
  const sc = stackScope(S, V.scope), parts = [`<button type="button" data-sk="scope" data-kind="system" class="${!optView() && sc.kind === 'system' ? 'here' : ''}">Whole stack</button>`];
  if (optView()) { const r = S.R.get(V.rec); if (r) parts.push('<span>›</span>', `<button type="button" class="here" data-sk="noop">${esc(r.ref + ' · ' + r.title)}</button>`); }
  else if (sc.kind === 'family') parts.push('<span>›</span>', `<button type="button" class="here" data-sk="noop">${esc(FAMILIES.find(f => f.id === sc.id)?.title || sc.id)}</button>`);
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
  root.querySelector('.cm-crumbs').innerHTML = crumbs();
  root.querySelectorAll('.cm-view').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === V.view)));
  root.querySelector('.cm-lenses').innerHTML = LENSES.map(l => `<button type="button" class="cm-lens" data-sk="lens" data-id="${esc(l.id)}" aria-pressed="${V.lens === l.id}" title="${esc(l.q + ' Like the ' + l.like + '.')}">${icon(l.id)}<span>${l.label}</span></button>`).join('');
  const scn = root.querySelector('.cm-scn');
  scn.hidden = !optView();
  if (optView()) scn.querySelector('select').innerHTML = [...S.R.values()].map(r => `<option value="${esc(r.id)}"${r.id === V.rec ? ' selected' : ''}>${esc(r.ref + ' · ' + r.title)}</option>`).join('');
  root.querySelector('.cm-depth').innerHTML = !optView() ? `<span>Rows</span>${[['realisations', 'Realisations'], ['options', 'With options']].map(([id, t]) => `<button type="button" class="cm-dep" data-sk="depth" data-id="${esc(id)}" aria-pressed="${V.depth === id}">${t}</button>`).join('')}` : '';
  const rs = [...S.R.values()];
  setState(root, optView() && G
    ? `${G.cols.length} option${G.cols.length === 1 ? '' : 's'} · ${G.rows.length} criteria · ${G.cells.filter(c => c.complete).length} of ${G.cells.length} judgements with evidence`
    : !rs.length ? (S.holes.length ? `No realisation recorded yet · ${S.holes.length} capabilit${S.holes.length === 1 ? 'y' : 'ies'} to realise` : 'No realisation recorded yet')
    : `${rs.length} realisations · ${rs.filter(r => r.chosen).length} chosen · ${rs.filter(r => ['recorded', 'approved'].includes(r.state)).length} recorded · ${rs.reduce((n, r) => n + r.planned, 0)} of ${rs.length * OBLIGATIONS.length} obligations written${S.holes.length ? ' · ' + S.holes.length + ' capabilities unrealised' : ''}`);
  const g = ghost(), pv = previewing(), imp = pending();
  root.querySelector('.cm-banner').innerHTML = imp ? imp.banner()
    : g ? `<section class="dp-banner"><span class="ip-kicker">Implementation proposal · not saved</span><b>${esc(g.record.title)}</b><small>${esc(g.reason || '')}</small><button type="button" class="cm-btn gold" data-tr-action="edit-ghost">Review &amp; edit</button><button type="button" class="cm-btn" data-tr-action="dismiss">Dismiss</button></section>`
    : pv ? `<section class="dp-banner"><span class="ip-kicker">Option preview · not saved</span><b>${esc((optionOf(S.R.get(pv.recordId), pv.optionId)?.title || '') + ' for ' + (S.R.get(pv.recordId)?.ref || ''))}</b><small>Shown in place of the current choice. Saving it records only a draft preference.</small><button type="button" class="cm-btn gold" data-sk="prefer" data-id="${esc(pv.recordId)}" data-option="${esc(pv.optionId)}">Prefer this option</button><button type="button" class="cm-btn" data-tr-action="dismiss">Dismiss</button></section>` : '';
  root.querySelector('.cm-legend').innerHTML = optView()
    ? `<p><i class="k-as supports">✓</i>Supports the criterion</p><p><i class="k-as tension">!</i>Creates a trade-off</p><p><i class="k-as unknown">?</i>Needs evidence</p><p><i class="k-as thin">✓</i>Judged, but reason or evidence missing</p><p><i class="k-as sug">✓</i>Suggested from what the product is documented to do; not recorded</p><p><i class="k-lean">★</i>The option the drivers lean to, with the suggestions counted; a lean, never a choice</p><p><span class="k-prod preview"></span>Previewed in place of the choice; not saved</p>`
    : `<p><span class="k-prod none"></span>Choice not made</p><p><span class="k-prod"></span>Preferred option</p><p><span class="k-prod preview"></span>Option previewed in place of the choice; not saved</p><p><i class="k-ob done">✓</i>Obligation written</p><p><i class="k-ob open"></i>Obligation not written</p><p><i class="k-ob proposed">+</i>Obligation a proposal would write; not saved</p><p><span class="k-steps"><i class="on"></i><i class="on"></i><i></i></span>Preferred · recorded · approved</p><p><span class="k-steps"><i class="on"></i><i class="stale"></i><i></i></span>Recorded on inputs that have since changed</p>`;
}

// ---------------------------------------------------------------- companion

const tact = (a, attrs, label, cls = '') => `<button type="button" class="cm-btn ${cls}" data-tr-action="${a}" ${attrs}>${label}</button>`;
const withSel = (id, a, label, cls = '', extra = '') => `<button type="button" class="cm-btn ${cls}" data-sk="act" data-id="${esc(id)}" data-act="${a}" ${extra}>${label}</button>`;
// Read the same typed specification the connected dossier and Chapter 7 validation read.
// A described topology is a proposal; provenance and evidence are kept visible beside the values.
export function configurationHTML(o) {
  if (!o) return '<p class="cm-muted">Choose an option to inspect its proposed tier, topology and configuration basis.</p>';
  const s = o.configuration || {}, value = v => v == null || v === '' ? '<em>Not recorded</em>' : esc(String(v));
  const fields = [
    ['Service tier / edition', s.serviceTier], ['Proposed topology', s.topology],
    ['Planned instances', s.replicaCount], ['Failure domains', s.failureDomains],
    ['Workload assumptions', s.workloadProfile], ['Configuration basis', s.specEvidence]
  ];
  const missing = fields.filter(([, v]) => v == null || v === '').length;
  return `<section class="sk-config" data-sk-config="${esc(o.id)}" aria-label="Proposed configuration for ${esc(o.title)}"><header><h5>Proposed configuration</h5><small>${missing ? `${missing} field${missing === 1 ? '' : 's'} to establish` : 'All fields described · verification remains separate'}</small></header><dl>${fields.map(([name, v]) => `<div class="${v == null || v === '' ? 'open' : ''}"><dt>${esc(name)}</dt><dd>${value(v)}</dd></div>`).join('')}</dl><p class="sk-config-source">${esc(s.sourceStatus || 'Project design assumption')} · ${esc(s.evidenceStatus || 'Configuration evidence not cited')}. These fields do not certify a deployed service or measured performance.</p></section>`;
}
function specimenRealisation(id) {
  const r = S.R.get(id), o = optionOf(r, r.chosen), g = ghost();
  const preparation = selectionPreparation(project()?.technologyRealisation.records.find(x => x.id === id));
  const nextNote = {option: 'Add a technology option, then review its fit and save a draft preference.', preference: 'Compare the options and choose a draft preference.', definition: 'Complete the realization purpose and owner before recording.', rationale: 'Explain why the preferred option fits and which trade-offs you accept.'}[preparation] || '';
  const props = S.proposals.filter(q => q.record === id && !(g && g.objectId === id && g.key === q.key)).map(q => withSel(id, 'ghost', q.key === 'operate' ? 'Propose operating basics' : 'Propose recovery &amp; contract obligations', 'gold', `data-key="${q.key}"`)).join('');
  const opts = r.options.map(x => `<button type="button" class="cm-link" data-sel="${esc(id + '/' + x.id)}">${esc(x.title)}${x.product ? ' · ' + esc(x.product) : ''}<i> · ${esc(x.operatingModel)}${r.chosen === x.id ? ' · preferred' : ''}</i></button>`).join('');
  return `<section class="cm-spec"><h4 aria-level="3">Realisation · ${esc(r.ref)}<span class="${esc(r.state)}">${esc(STATE_LABEL[r.state])}</span></h4><p class="cm-spec-t"><b>${esc(r.title)}</b></p><p>${esc(describeRealisation(S, id))}</p><dl class="cm-dl"><div><dt>Realises</dt><dd>${r.caps.map(c => `<button type="button" class="cm-link" data-sel="${esc(c)}">${esc(S.Pf.capabilities.get(c).ref + ' ' + capTitle(S, c))}</button>`).join('') || '<em>Nothing</em>'}</dd></div><div class="${r.owner ? '' : 'miss'}"><dt>Owner</dt><dd>${esc(r.owner || 'Not named')}</dd></div><div class="${o ? '' : 'miss'}"><dt>Choice</dt><dd>${o ? esc(o.title + (o.product ? ' · ' + o.product : '') + (o.version ? ' ' + o.version : '')) : 'Not made'}</dd></div></dl>${configurationHTML(o)}<dl class="cm-dl"><div><dt>Options</dt><dd>${opts}</dd></div>${OBLIGATIONS.map(ob => `<div class="${r.plans[ob.id] ? '' : 'miss'}"><dt>${esc(ob.long)}</dt><dd>${esc(r.plans[ob.id] || 'Not written')}</dd></div>`).join('')}<div class="${r.sized ? '' : 'none'}"><dt>Sizing</dt><dd>${esc(r.sized ? r.sizing.value + ' ' + r.sizing.unit + ' — ' + r.sizing.basis : 'No sizing basis')}</dd></div><div class="${r.rationale ? '' : 'miss'}"><dt>Rationale</dt><dd>${esc(r.rationale || 'Not written')}</dd></div></dl>
  ${marked.has(id) && pending() ? `<div class="cm-note gold">${pending().objectContext({id, ref: r.ref, title: r.title})}</div>` : ''}
  ${nextNote ? `<p class="cm-muted" role="status">${esc(nextNote)}</p>` : ''}
  <div class="cm-acts">${tact('edit-plan', `data-tr-id="${esc(id)}" data-tr-panel="0"`, icon('edit') + (preparation === 'definition' ? 'Complete purpose &amp; owner' : 'Edit realisation'), preparation === 'definition' ? 'gold' : 'primary')}${tact('edit-plan', `data-tr-id="${esc(id)}" data-tr-panel="1"`, 'Write obligations')}${tact('edit-plan', `data-tr-id="${esc(id)}" data-tr-panel="2"`, preparation === 'rationale' ? 'Explain the selection' : 'Selection basis', preparation === 'rationale' ? 'gold' : '')}<button type="button" class="cm-btn" data-sk="compare" data-id="${esc(id)}">${icon('options')}Compare options</button>${withSel(id, 'add-option', preparation === 'option' ? 'Add an option to continue' : 'Add an option', preparation === 'option' ? 'gold' : '')}${props}${preparation === 'ready' && (r.state === 'preferred' || r.state === 'stale') ? withSel(id, 'record', 'Record the selection', 'gold') : ''}${['recorded','approved'].includes(r.state) ? withSel(id, 'approval', r.state === 'approved' ? 'Review approval evidence' : 'Record approval') : ''}<a class="cm-btn" href="${esc(projectURL('/?chapter=7&tab=work&object=' + encodeURIComponent(id)))}">Open in Work</a></div></section>`;
}
function specimenOption(id) {
  const r = recOf(id), o = optionOf(r, id.split('/')[1]), n = k => r.criteria.filter(c => (o.assessments[c.id]?.effect || 'unknown') === k).length;
  return `<section class="cm-spec"><h4 aria-level="3">Option · ${esc(o.id)} for ${esc(r.ref)}${r.chosen === o.id ? '<span class="preferred">Preferred</span>' : ''}</h4><p class="cm-spec-t"><b>${esc(o.title)}</b></p><dl class="cm-dl"><div class="${o.product ? '' : 'miss'}"><dt>Product</dt><dd>${esc(o.product || 'Not named')}${o.version ? ' ' + esc(o.version) : ''}</dd></div><div class="${o.vendor ? '' : 'miss'}"><dt>Vendor</dt><dd>${esc(o.vendor || 'Not named')}</dd></div><div><dt>Operated</dt><dd>${esc(o.operatingModel || 'Not stated')}</dd></div></dl>${configurationHTML(o)}<dl class="cm-dl"><div><dt>Judgements</dt><dd>${n('supports')} support · ${n('tension')} trade-off${n('tension') === 1 ? '' : 's'} · ${n('unknown')} need evidence</dd></div><div class="${o.benefits ? '' : 'none'}"><dt>Brings</dt><dd>${esc(o.benefits || 'Not written')}</dd></div><div class="${o.drawbacks ? '' : 'miss'}"><dt>Limits</dt><dd>${esc(o.drawbacks || 'Not written')}</dd></div><div><dt>Evidence</dt><dd>${esc(o.evidence || 'None')}${o.sourceUrl ? ` · <a href="${esc(safeUrl(o.sourceUrl))}" target="_blank" rel="noopener noreferrer">source</a>` : ''}</dd></div></dl>
  <div class="cm-acts">${withSel(r.id, 'edit-option', icon('edit') + 'Edit option', 'primary', `data-option="${esc(o.id)}"`)}${r.chosen === o.id ? '' : `<button type="button" class="cm-btn gold" data-sk="prefer" data-id="${esc(r.id)}" data-option="${esc(o.id)}">Prefer this option</button>`}${withSel(r.id, 'preview-option', 'Preview it in the stack', '', `data-option="${esc(o.id)}"`)}<button type="button" class="cm-btn" data-sk="compare" data-id="${esc(r.id)}">${icon('options')}Compare options</button></div></section>`;
}
function specimenCapability(id) {
  const c = S.Pf.capabilities.get(id), rs = [...S.R.values()].filter(r => r.caps.includes(id));
  return `<section class="cm-spec"><h4 aria-level="3">Capability · Chapter 6 · ${esc(c.ref)}</h4><p class="cm-spec-t"><b>${esc(c.title)}</b></p><p>${esc(c.purpose)}</p><dl class="cm-dl"><div><dt>Realised by</dt><dd>${rs.map(r => `<button type="button" class="cm-link" data-sel="${esc(r.id)}">${esc(r.ref + ' ' + r.title)}</button>`).join('') || '<em>Nothing yet</em>'}</dd></div><div><dt>Serves</dt><dd>${c.users.length} components · ${c.blast.stops.length} stop if it fails</dd></div><div><dt>Continuity</dt><dd>${esc(c.continuity)} · ${esc(c.failureDomain || 'no failure domain')}</dd></div></dl><div class="cm-acts">${rs.length ? '' : tact('ghost', `data-tr-key="missing" data-tr-id="${esc(id)}"`, 'Propose a realisation', 'gold')}<a class="cm-btn" href="${esc(projectURL('/?chapter=6&tab=model&object=' + encodeURIComponent(id)))}">Capability in Chapter 6</a></div></section>`;
}
function specimenCriterion(id) {
  const r = S.R.get(V.rec), c = r?.criteria.find(x => x.id === id.slice(5)); if (!c) return '';
  return `<section class="cm-spec"><h4 aria-level="3">Criterion${c.kind === 'driver' ? ' · quality driver' : ''}</h4><p class="cm-spec-t"><b>${esc(c.title)}</b></p><p>${esc(c.detail)}</p><dl class="cm-dl">${r.options.map(o => { const a = o.assessments[c.id]; return `<div class="${a && a.effect !== 'unknown' ? '' : 'none'}"><dt>${esc(o.product || o.title)}</dt><dd>${esc(a ? (EFFECT[a.effect] || EFFECT.unknown)[1] + (a.reason ? ' — ' + a.reason : '') : 'Needs evidence')}</dd></div>`; }).join('')}</dl><p class="cm-muted">The weighing beneath the criteria (Σ priority × effect) is a lean, never a choice: each judgement still needs a reason and evidence, and an unknown stays an open item.</p></section>`;
}
function reading() {
  if (diagramView()) return NT.readingHTML();
  if (optView()) return `<section><h4 aria-level="3">Reading this view</h4><p>Each column is an option for the realisation; each row a criterion it should be chosen by — first the quality drivers of the components that depend on it, then operation, recovery, exit and cost. A cell is a judgement: <b>✓</b> supports, <b>!</b> a trade-off, <b>?</b> needs evidence. Select a cell to record the judgement, its reason and its evidence.</p></section>`;
  return `<section><h4 aria-level="3">Reading this view</h4><p>Each row is a realisation — the product layer beneath one Chapter 6 capability — in the platform's order. Read across: what it realises, the option preferred (hatched where no choice is made yet), who depends on it and what stops if it fails, the six implementation obligations, sizing and cost, and how far the selection has gone.</p><p>Choose <b>With options</b> to see every alternative in place.</p></section>`;
}
// Gaps and risks first, eight of how many, and "Show all" (round 12, G, GR-UX-04, GR-UX-08: insightsSection).
const insightsList = () => (optView() ? [] : stackInsights(S, stackScope(S, V.scope)));
function insightsHTML(list = insightsList()) {
  return insightsSection(list, {key: 'stack', item: x => `<button type="button" class="cm-ins ${esc(x.kind)}" data-sel="${esc(x.id || '')}"><span>${esc(x.text)}</span>${x.ask ? `<small>Ask: ${esc(x.ask)}</small>` : ''}</button>`, note: `<p class="cm-muted">Drawn from recorded realisations, options and the Chapter 6 platform. Prompts for review, not verdicts.</p>`});
}
function findingsHTML() {
  const sel = recOf(V.sel)?.id, fs = S.findings.filter(f => !sel || f.objectId === sel);
  if (!fs.length) return '';
  const groups = new Map();
  for (const f of fs) { const k = f.title.replace(/ for (TR|TC)-\d+.*$/, '').replace(/(TR|TC|TO|RM)-\d+/g, '…'); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
  return `<section><h4 aria-level="3">Chapter 7 checks<span>${fs.length}</span></h4>${[...groups].sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([k, g]) => `<button type="button" class="cm-fg ${g.some(f => f.level === 'error') ? 'error' : ''}" data-sel="${esc(g[0].objectId)}"><b>${esc(k)}</b><small>${g.length} · ${esc([...new Set(g.map(f => S.R.get(f.objectId)?.ref || f.objectId))].slice(0, 4).join(', '))}${g.length > 4 ? '…' : ''}</small></button>`).join('')}<a class="cm-muted" href="${esc(projectURL('/?chapter=7&tab=validate&validate=readiness'))}">All checks on Validate →</a></section>`;
}
function choicePanel() {
  const n = suggestionCommands(CH).length;
  return `<section class="cm-spec sk-choice"><h4 aria-level="3">The choice · ${esc(CH.record.ref)}<span>${CH.counts.recorded ? CH.counts.recorded + ' recorded' : CH.counts.suggested + ' suggested'}</span></h4>${choiceSummaryHTML(CH)}<div class="cm-acts">${n ? `<button type="button" class="cm-btn gold" data-sk="record-suggestions">Record ${n} suggested judgement${n === 1 ? '' : 's'}</button>` : ''}<a class="cm-btn" href="${esc(projectURL('/?chapter=11&tab=model&object=' + encodeURIComponent(CH.record.id)))}">What the objective asks of it</a></div><p class="cm-muted">Suggestions come from what each product is documented to do, with the source on each cell. They count only in the "with suggestions" weighing until they are recorded.</p></section>`;
}
function panel() {
  const box = companionHost(root), ins = insightsList();
  solMark(root, project(), 7);
  panelToggle(root, '[data-sk="panel"]', V.panel, ins.length);
  if (!companionOpen(root, V.panel)) { box.innerHTML = ''; return; }
  const s = V.sel;
  let spec = '';
  if (s && S.R.has(s)) spec = specimenRealisation(s) + specPanelHTML(project(), s);
  else if (s && recOf(s)) spec = specimenOption(s);
  else if (s && S.Pf.capabilities.has(s)) spec = specimenCapability(s);
  else if (s?.startsWith?.('CRIT:')) spec = specimenCriterion(s);
  if (!spec && s && drawn(s)) spec = NT.specimenHTML(s);
  spec = NT.withSelected(spec, s);
  box.innerHTML = assessmentReading() + (optView() && CH ? choicePanel() : '') + solInto(spec, solSection(project(), 7, s)) + reading() + insightsHTML(ins) + findingsHTML();
}
function assessmentReading() {
  if (!optView() || !V.cell || !G?.record) return '';
  const r = G.record, option = optionOf(r, V.cell.option), criterion = r.criteria.find(c => c.id === V.cell.criterion);
  const cell = L.cells.find(c => c.col === V.cell.option && c.row === V.cell.criterion);
  if (!option || !criterion || !cell) return '';
  const suggestion = cell.effect === 'unknown' ? suggestionOf(option.id, criterion.id) : null;
  const status = cell.effect !== 'unknown' ? 'Recorded judgement' : suggestion ? 'Suggested from product documentation · not a judgement' : 'Not yet judged';
  return `<section class="cm-spec sk-cell-reading"><h4>Option against criterion</h4><p><b>${esc(option.title)}</b> · ${esc(criterion.title)}</p><p>${esc(status)}</p><p>${esc(cell.reason || (suggestion ? suggestion.reasons.map(x => x.text).join(' ') : 'An architect has not recorded a reason for this comparison.'))}</p>${cell.evidence ? `<p>Evidence: ${esc(cell.evidence)}</p>` : ''}${suggestion ? `<details><summary>Suggested basis and sources</summary>${suggestion.reasons.map(x => `<p>${esc(x.text)}<br><small>${esc(x.src || 'Source not recorded')}</small></p>`).join('')}</details>` : ''}<p class="cm-muted">AIW does not select a product. Inspect its version, conditions and obligations, then record your own judgement in Work.</p><a class="cm-btn" href="${esc(projectURL('/?chapter=7&tab=work&stage=compare&object=' + encodeURIComponent(r.id)))}">Compare and record in Work</a></section>`;
}

// ---------------------------------------------------------------- interaction

function revealSelection() {
  if (diagramView()) { const b = NT.layout()?.nodes.find(n => n.id === V.sel); if (b) stage.reveal(b.x, b.y, b.w, b.h); return; }
  if (!V.sel || !L) return;
  const r = L.rows.find(x => x.id === V.sel || x.id === recOf(V.sel)?.id || 'CRIT:' + x.id === V.sel);
  if (r) stage.reveal(L.rail, r.y, 300, r.h);
}
// Whichever path changed the selection, the page and Sol hear of it once, as the model renders.
let announced;
const selTargetBase = () => { const r = recOf(V.sel); return r ? r.id : S.Pf.capabilities.has(V.sel) ? V.sel : null; };
const selTarget = () => { const t = selTargetBase(); return t && /^(system:|party:|unplaced:|lane:|family:)/.test(String(t)) ? null : t; };
function announce() {
  announced = V.sel;
  const p = project(), target = selTarget();
  if (p) { try { mountBrainContext(p, {id: target || solOwner(p, V.sel) || 'project', chapter: 7}, 'model'); } catch { /* assistance is optional */ } }
  announceObject(target);
}
function select(id, {reveal = false} = {}) {
  V.sel = id || null;
  const r = recOf(V.sel); if (r) V.rec = r.id;
  if (V.sel && !V.panel) V.panel = true;
  save(); render();
  if (reveal) revealSelection();
}
function studioAction(action, data = {}) { const b = document.createElement('button'); b.type = 'button'; b.hidden = true; b.dataset.trAction = action; for (const [k, v] of Object.entries(data)) b.dataset[k] = v; document.body.append(b); b.click(); b.remove(); }
// Select the realisation in the chapter, then run the editor that works on the selection.
function withSelection(id, action, data = {}) { studioAction('inspect', {trId: id}); nextFrame(() => studioAction(action, data)); }

function bind() {
  solChapterBind(root, 7, {refresh: solRefresh});
  listen(root, 'keydown', e => { NT.keydown(e); });
  listen(root, 'click', e => {
    if (root.dataset.suppress) return;
    if (NT.handle(e)) return;
    const add = root.querySelector('.cm-add');
    if (add?.open && !e.target.closest('.cm-add > summary')) add.open = false;
    if (e.target.closest('[data-brain-launch],[data-tr-action],a')) return;
    const a = e.target.closest('[data-sk]');
    if (a && !a.disabled) {
      const k = a.dataset.sk;
      if (k === 'view') { V.view = a.dataset.id; fitPending = true; save(); render(); return; }
      if (k === 'lens') { V.lens = a.dataset.id; save(); render(); return; }
      if (k === 'depth') { V.depth = a.dataset.id; fitPending = true; save(); render(); return; }
      if (k === 'scope') { V.scope = {kind: 'system'}; if (optView()) V.view = 'stack'; fitPending = true; save(); render(); return; }
      if (k === 'family') { V.scope = {kind: 'family', id: a.dataset.id}; fitPending = true; save(); render(); return; }
      if (k === 'compare') { V.rec = a.dataset.id; V.view = 'options'; fitPending = true; save(); render(); return; }
      if (k === 'record-suggestions') { if (CH) recordSuggestions(CH, {onDone: () => { fitPending = false; }}); return; }
      if (k === 'assess') { V.cell = {option: a.dataset.option, criterion: a.dataset.criterion}; V.sel = V.rec + '/' + a.dataset.option; V.panel = true; render(); return; }
      if (k === 'prefer') { withSelection(a.dataset.id, 'preference', {trOption: a.dataset.option}); return; }
      if (k === 'act') { const data = {}; if (a.dataset.option) data.trOption = a.dataset.option; if (a.dataset.key) data.trKey = a.dataset.key; withSelection(a.dataset.id, a.dataset.act, data); return; }
      if (k === 'expand') { const on = !document.body.classList.contains('cm-expanded'); document.body.classList.toggle('cm-expanded', on); a.setAttribute('aria-pressed', String(on)); sizeModel(root, 'cm-expanded'); fitPending = true; nextFrame(() => render()); return; }
      if (k === 'panel') { V.panel = !V.panel; save(); fitPending = true; render(); nextFrame(() => { fitPending = true; render(); }); return; }
      if (k === 'key') { const key = root.querySelector('.cm-key'); key.classList.toggle('cm-min'); a.setAttribute('aria-expanded', String(!key.classList.contains('cm-min'))); return; }
      if (k === 'fit') { stage.fitAll(); return; }
      if (k === 'zin' || k === 'zout') { const {w, h} = stage.box(); stage.zoomAt(stage.cam.z * (k === 'zin' ? 1.15 : 1 / 1.15), w / 2, h / 2); return; }
      if (k === 'noop') return;
    }
    const s = e.target.closest('[data-sel]');
    if (s && s.dataset.sel) {
      e.stopPropagation();
      const id = s.dataset.sel, now = Date.now(), twice = lastClick.id === id && now - lastClick.t < 420;
      lastClick = {id, t: now};
      if (twice && S.R.has(id)) { lastClick = {id: null, t: 0}; V.rec = id; V.view = 'options'; fitPending = true; save(); render(); return; }
      select(id, {reveal: !!inCompanion(s)}); return;
    }
    if (e.target.closest('.cm-stage') && !e.target.closest('.cm-heads,.cm-rail,.cm-edge') && V.sel) select(null);
  });
  listen(root, 'change', e => { if (NT.change(e)) return; if (e.target.dataset.skField === 'rec') { V.rec = e.target.value; V.sel = e.target.value; fitPending = true; save(); render(); } });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !root?.isConnected || document.querySelector('dialog[open]')) return;
    const a = document.activeElement;
    if (a && a !== document.body && !root.contains(a)) return;
    if (a?.closest?.('select,details[open],textarea')) return;
    if (V.sel) select(null);
    else if (optView()) { V.view = 'stack'; fitPending = true; save(); render(); }
    else if (V.scope?.kind !== 'system') { V.scope = {kind: 'system'}; fitPending = true; save(); render(); }
    else if (document.body.classList.contains('cm-expanded')) root.querySelector('[data-sk="expand"]').click();
    else return;
    e.preventDefault();
  });
  root.addEventListener('pointerleave', () => { root.querySelector('.cm-tip').hidden = true; });
  window.addEventListener('resize', () => { if (!root?.isConnected) return; clearTimeout(bind._r); bind._r = setTimeout(() => { sizeModel(root, 'cm-expanded'); render(); }, 120); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!root?.isConnected || !L) return; clearTimeout(bind._ro); bind._ro = setTimeout(() => { const w = stage.box().w; if (Math.abs(w - (bind._w || 0)) > 24) { bind._w = w; fitPending = true; render(); } }, 90); }).observe(root.querySelector('.cm-stage'));
}
function tip(e) {
  const box = root.querySelector('.cm-tip'), t = e.target.closest?.('.sk-rec[data-sel],.nt-node');
  if (t?.dataset?.ntNode && root.contains(t)) { box.innerHTML = NT.tipHTML(t.dataset.ntNode); box.hidden = !box.innerHTML; if (!box.hidden) placeTip(box, e); return; }
  if (!t || !root.contains(t) || !S.R.has(t.dataset.sel)) { box.hidden = true; return; }
  box.innerHTML = `<b>${esc(S.R.get(t.dataset.sel).ref + ' · ' + S.R.get(t.dataset.sel).title)}</b>${esc(describeRealisation(S, t.dataset.sel))}<small class="h">Double-click to compare its options</small>`; box.hidden = false; placeTip(box, e);
}

export function stackDebug() { return {V: {...V}, S, F, G, L}; }
