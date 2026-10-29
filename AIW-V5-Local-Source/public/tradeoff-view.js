// Chapter 3 Model — Decisions.
//
// Two architecture models of the same decisions, drawn from recorded facts and the SA Playbook:
// - Decision map: the drivers each decision weighs, the decision, and its alternatives — each with
//   its pattern and the failure boundary to avoid (linked to the playbook and the pattern
//   catalogue), its effect on every driver, and what it would change in Chapter 4.
// - Trade-offs: drivers down, alternatives across, every judged effect with its reason, the
//   weighted reading of each decision as the drivers' priorities make it, and the sensitivity
//   points. Architecture style joins as a decision: recorded, or offered from the playbook's table.
// Round 25 (D-25-03 to D-25-08): both show the decision reading (decision-reading.js) in its own words: the alternative
// that leads on the drivers and how firmly, those a hard constraint rules out or another dominates, what the unstated
// effects could do, and the suggested effects, labelled and never counted until a person records one through the
// comparison editor. AIW never chooses: the working choice changes only by a person's command.
// Sliced like every chapter model, read through Structure, Flow and Reasoning, walked decision by
// decision, and edited only through Chapter 3's own editors and commands.
import {tradeoffSource, foldMap, foldMatrix, tradeoffScope, tradeoffInsights, describeDecision, describeAlternative, mapWalk, tallyText, alternativeCoverage, styleSuggestions, styleDecisionPreset, defaultDepth, readingStanding, readingWords, STYLE_PROPOSAL, PROPOSED_ALT, PRIORITIES} from './tradeoff-model.js';
// A driver's weight is the reading's (round 25): one with no stated priority weighs nothing, and shows ×0.
import {weightOf, READING_NOTE} from './decision-reading.js';
import {suggestionHypothesis} from './decision-suggestions.js';
import {mapLayout, mapHead, matrixLayout, matrixHead, mapWireRoutes, DM, MX} from './tradeoff-layout.js';
import {STYLES, STYLE_KEY, attribute, locator, PATTERN_KEY} from './playbook-knowledge.js';
import {targetText} from './quality-domain.js';
import {modelChrome,modelStage, connectionAttrs, sizeModel, placeTip, drawerDialog, toolsHTML, roundPath, headPath, idHighlight as lit, priorityChip as prioChip, nextFrame, companionHost, companionOf, listen, companionOpen, releaseCompanion, insightsSection, announceObject} from './model-stage.js';
import {mergeWires} from './wire-merge.js';
import {projectPreferenceKey, projectURL, currentProject as project, onProjectSwitch, scopedProject} from './project-context.js';
import {mountBrainContext} from './brain-context-ui.js';
import {solChapterMount, solChapterBind, solSection, solInto, solMark, solOwner} from './chapter-sol.js';
import {createNotation} from './notation-view.js';
import {modelHeaderHTML, draftActionHTML} from './instrument-tray.js';
import {chapterLenses} from './lens-vocabulary.js';
import {esc} from './html-escape.js';
import {readStoredObject} from './util.js';
// Round 24 (D-24-08): the model and its pictures read the shell's module scope (project-context.js scopedProject: the saved
// document without one); Sol, proposals and editors keep the saved document.
// A model change previewed in this chapter shows its banner above the model (as in Chapters 4–8); without
// it the proposal had no visible entry point here, since the page leaves the banner to the chapter model.
const pending = () => { const i = window.aiwInterfaceImpact; return i?.pending && i.previewInChapter?.(3) ? i : null; };

// Sol's advice changes the project only through a store command; the view then reads the new document.
const solRefresh = () => { if (root?.isConnected) mountChapterModel({id: pageSel}, cbs); };
const page = () => window.aiwDecisionsPage;
const PATHS = {diagram: 'M4 4h6v5H4zM14 4h6v5h-6zM9 15h6v5H9zM7 9v3h10V9M12 12v3', structure: 'M6 3v18M18 3v18M6 8h12M6 16h12', flow: 'M3 12h13m-4-5 5 5-5 5M3 5h6M3 19h6', reasoning: 'M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9M9 7h6M9 17h6', map: 'M3 6h5v12H3zM10 4h5v6h-5zM10 14h5v6h-5zM17 4h4v4h-4zM17 10h4v4h-4zM17 16h4v4h-4z', matrix: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', panel: 'M3 4h18v16H3zM15 4v16', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', plus: 'M12 5v14M5 12h14', spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z', mind: 'm3 7 9-4 9 4-9 4-9-4m0 5 9 4 9-4m-18 5 9 4 9-4', edit: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4', dissect: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14M21 21l-5-5M8 11h6', play: 'M7 4v16l13-8z', book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7', check: 'M4 12l5 5L20 6', tune: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4'};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[n] || PATHS.map}"/></svg>`;
// The chapter's lenses, its subset of the one vocabulary (lens-vocabulary.js), each with the chapter's own question.
const LENSES = chapterLenses({
  structure: 'What each alternative would change: the Chapter 4 responsibilities it touches and the relationships it adds.',
  flow: 'What follows from each alternative: its consequences, benefits and costs.',
  reasoning: 'Why: the pattern each alternative follows, the failure boundary to avoid, and its effect on every driver.'
});
// "Breaks it" (violates) is recorded only against a constraint driver (decisions-domain.js).
const EFFECT = {supports: ['✓', 'Supports'], tension: ['⚠', 'Creates tension'], violates: ['✕', 'Breaks it'], neutral: ['·', 'Little direct effect'], unknown: ['?', 'Needs evidence']};
const STATUS = {draft: 'Draft', recorded: 'Recorded', accepted: 'Accepted', superseded: 'Superseded'};
const OP = {'At least': '≥', 'At most': '≤', Exactly: '='};

let root = null, TM = null, lastDoc = null, cbs = {}, F = null, L = null, fitPending = true, stage = null, lastClick = {id: null, t: 0}, pageSel, lastProposal = '';
let NT = null;
const freshView = () => ({view: 'map', lens: 'reasoning', scope: {kind: 'system'}, depth: 'auto', sel: null, focusDriver: null, panel: true, walk: -1});
let S = freshView();
// The standard diagram (notation-view.js) and the elements only it draws.
// The standard diagram and the shared views (Layers, Table, Matrix, Whole design) are drawn by notation-view.js.
const diagramView = () => !!NT && NT.owns(S.view);
const drawn = id => diagramView() && !!NT?.diagram()?.nodes.some(n => n.id === id);
const seen = new Set();
const pref = () => projectPreferenceKey('aiw-tradeoff-model-v1');
function save() { try { localStorage.setItem(pref(), JSON.stringify({view: S.view, lens: S.lens, scope: S.scope, depth: S.depth, panel: S.panel})); } catch { /* preferences are optional */ } }
// This browser's preferences for the chapter's model in the project on screen (read when the model is first drawn,
// and again when another project opens in place).
function restorePreferences() {
  const v = readStoredObject(pref());
  for (const k of ['view', 'lens', 'depth']) if (typeof v[k] === 'string') S[k] = v[k];
  if (v.scope && typeof v.scope === 'object') S.scope = v.scope;
  if (typeof v.panel === 'boolean') S.panel = v.panel;
  S.view = NT.settle(S.view);
  if (!LENSES.some(l => l.id === S.lens)) S.lens = 'reasoning';
}
// Another project opened in place (round 4, A): the model leaves and forgets the last project's view — its view, lens,
// scope, depth, panel, selection and walk — then reads the new project's preferences for this chapter; the next mount
// rebuilds from the new project's document. The picture's own choices are reset by its notation (notation-view.js).
onProjectSwitch(() => { leaveChapterModel(); S = freshView(); TM = null; lastDoc = null; pageSel = undefined; fitPending = true; seen.clear(); lastProposal = ''; if (NT) restorePreferences(); });

// ---------------------------------------------------------------- mount / leave

export function mountChapterModel(selection, callbacks = {}) {
  const p = project(), host = document.querySelector('.studio > .stage.tab-content');
  if (!p || !host) return;
  cbs = callbacks;
  solChapterMount(p, 3, solRefresh);
  if (!root) {
    root = document.createElement('section'); root.className = 'cm dx'; root.setAttribute('aria-label', 'Chapter 3 model: decisions');
    root.innerHTML = shell();
    stage = modelStage(root, {headHeight: () => (diagramView() ? 0 : matrixView() ? matrixHead() : mapHead()), railWidth: l => l.rail || 0, onHover: tip});
    stage.bind(); bind();
    // The standard diagram shares the stage, the companion and the selection with the chapter's own views.
    NT = createNotation({chapter: 3, root, stage, project: scopedProject, onSelect: id => select(id)});
    NT.addViews('dx');
    NT.onChange = full => { if (full) fitPending = true; render(); };
    NT.bindDrag();
    restorePreferences();
    // The address may open the model on a view (a deep link, and the rendered checks).
    { const mv = window.aiwChapterModels?.takeView?.(3) || new URLSearchParams(location.search).get('model'); S.view = mv ? NT.settle(mv, 'link') : NT.settle(S.view); }
  } else {
    // A route the shell follows in place may name the view too (round 4, A: workspace-ux.js routeModel).
    const mv = window.aiwChapterModels?.takeView?.(3); if (mv) S.view = NT.settle(mv, 'link');
  }
  const first = !TM;
  if (host.firstElementChild !== root) host.prepend(root);
  document.body.classList.add('cm-active');
  const q = scopedProject();
  if (q !== lastDoc || !TM) { lastDoc = q; rebuild(q); }
  if (first && TM) { S.sel = null; const want = window.aiwChapterModels ? (window.aiwChapterModels.takeLink(3) || selection?.subject || null) : null; if (known(want)) { S.sel = want; nextFrame(() => revealSelection()); } }
  pageSel = selection?.id ?? null;
  followProposal();
  render();
  sizeModel(root, 'cm-expanded');
}
export function leaveChapterModel() {
  root?.querySelector('.dx-whatif[open]')?.close();
  document.body.classList.remove('cm-active', 'cm-expanded');
  releaseCompanion(root);
  root?.remove();
}
function rebuild(p) {
  root?.querySelector('.dx-whatif[open]')?.close();
  try { TM = tradeoffSource(p); } catch (e) { console.error('Decisions model', e); TM = null; return; }
  if (S.sel && !known(S.sel)) S.sel = null;
  if (S.scope?.id && tradeoffScope(TM, S.scope).kind === 'system') S.scope = {kind: 'system'};
}
const proposal = () => page()?.proposal || null;
const knownBase = id => !!id && !!TM && (TM.D.has(id) || TM.A.has(id) || TM.R.driver(id) || id === STYLE_PROPOSAL || (id.startsWith('SUG:') && styleSuggestions(TM).some(s => s.id === id)) || (id.startsWith('STY:') && STYLES.some(s => 'STY:' + s.id === id)) || (id === PROPOSED_ALT && !!proposal()));
const known = id => drawn(id) || knownBase(id);
function followProposal() {
  const g = proposal(), key = g ? (g.decisionId || '') + ':' + (g.existingId || 'new') + ':' + (g.record?.title || '') : '';
  if (key && key !== lastProposal) { S.sel = g.existingId || PROPOSED_ALT; S.walk = -1; if (matrixView()) { S.view = 'map'; fitPending = true; } nextFrame(() => revealSelection()); }
  if (!key && S.sel === PROPOSED_ALT) S.sel = null;
  lastProposal = key;
}

// ---------------------------------------------------------------- shell

function shell() {
  return `${modelHeaderHTML(3, 'dx', `<button type="button" class="cm-btn dx-explore" data-dx="whatif-open">${icon('tune')}<span>Explore changes</span></button><button type="button" class="cm-btn" data-dx="new-question">${icon('plus')}<span>New decision</span></button>
    <button type="button" class="cm-btn icon" data-dx="expand" aria-pressed="false" aria-label="Expand the model" title="Expand">${icon('expand')}</button>
    <button type="button" class="cm-btn icon" data-dx="panel" aria-pressed="true" aria-label="Show the companion panel" title="Companion">${icon('panel')}</button>`, 'Decisions')}
  <div class="cm-bar" data-model-slot="commands"><nav class="cm-crumbs" aria-label="Model scope"></nav><div class="cm-lenses" role="group" aria-label="Lens"></div><div class="cm-depth" role="group" aria-label="Elements"></div></div>
  <div class="cm-banner" data-model-slot="notice"></div>
  <div class="cm-body" data-model-slot="content"><div class="cm-stage" tabindex="0" aria-label="Decisions canvas. Drag or scroll to move; Ctrl or Command and scroll to zoom.">
    <div class="cm-world"><svg class="cm-svg" aria-hidden="true"></svg><div class="cm-html"></div></div>
    <div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div>
    
    
  </div><aside class="cm-panel" aria-label="Companion"></aside></div>
  <footer class="cm-walk" data-model-slot="status" aria-label="Walk the decisions"><div class="cm-walk-in"></div><p class="cm-state" role="status" aria-live="polite"></p>${toolsHTML('dx')}</footer><div class="cm-tip" role="tooltip" hidden></div><dialog class="dx-whatif" aria-labelledby="dx-whatif-title"></dialog>`;
}

// ---------------------------------------------------------------- render

const matrixView = () => S.view === 'matrix';
const X = id => TM.D.get(id);
const Alt = id => TM.A.get(id);
const Drv = id => TM.R.driver(id);
function scope() { return tradeoffScope(TM, S.scope); }
function depth() { return S.depth === 'auto' ? defaultDepth(TM) : S.depth; }
const refTitle = id => X(id) ? id + ' ' + X(id).question : Alt(id) ? id + ' ' + Alt(id).a.title : Drv(id) ? id + ' ' + Drv(id).title : id;
const target = d => d.targetValue === '' || d.targetValue == null ? '<em class="miss">no target</em>' : `<b>${esc(OP[d.operator] || d.operator)} ${esc(d.targetValue)} ${esc(d.unit)}</b>`;
const effChip = (id, e, title = '') => `<i class="dx-eff ${esc(e)}" title="${esc(title || EFFECT[e][1])}">${esc(id)} ${EFFECT[e][0]}</i>`;
// A driver's weight as the reading counts it: ×3, ×2, ×1, or ×0 for one with no stated priority (D-25-02, GR-DRV-02).
const weightHTML = d => { const w = weightOf(d.priority); return w ? `<em>×${w}</em>` : '<em title="No priority is stated, so the reading leaves it out of the weights">×0 · weighs nothing</em>'; };
// The suggested effects for an alternative's unstated effect on a driver (decision-suggestions.js, through the model), or
// null; an alternative named by its title.
const cellSuggestions = (decisionId, altId, driverId) => TM.suggestions(decisionId)?.cells.find(c => c.alternativeId === altId && c.driverId === driverId) || null;
const altName = id => Alt(id)?.a.title || id;

function render() {
  if (!root) return;
  S.view = NT.settle(S.view);
  if (!TM) { root.querySelector('.cm-html').innerHTML = '<p class="cm-empty">The decisions model could not be prepared for this project.</p>'; return; }
  root.classList.remove('cm-lens-structure', 'cm-lens-flow', 'cm-lens-reasoning');
  root.classList.add('cm-lens-' + S.lens);
  root.classList.toggle('dx-matrix', matrixView());
  root.classList.toggle('dx-walking', S.walk >= 0);
  root.querySelector('.cm-body').classList.toggle('no-panel', !S.panel);
  root.classList.toggle('nt-active', diagramView());
  if (diagramView()) {
    // The standard diagram: the notation module draws; the chapter keeps its chrome, companion and camera.
    L = NT.render({sel: S.sel, view: S.view, viewW: stage.box().w});
    root.querySelector('.cm-heads-in').innerHTML = ''; root.querySelector('.cm-rail-in').innerHTML = '';
    chromeDiagram(); panel(); walkBar(); modelChrome(root);
    stage.use(L, 'diagram|' + (NT.scene()?.id || '') + '|' + NT.arrangement());
    if (fitPending) { fitPending = false; NT.fit(); } else stage.clamp();
    stage.apply(); return;
  }
  root.querySelector('[data-dx="panel"]').setAttribute('aria-pressed', String(S.panel)); drawerDialog(root, '[data-dx="panel"]', S.panel);
  const g = proposal();
  // Geometry depends on the records, the scope, the depth and an unsaved proposal — never the lens.
  if (matrixView()) { F = foldMatrix(TM, scope()); L = matrixLayout(F); }
  else { F = foldMap(TM, scope(), depth(), {proposal: g, proposalFor: g?.decisionId}); L = mapLayout(F); }
  const world = root.querySelector('.cm-world'), svg = root.querySelector('.cm-svg');
  world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
  svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
  svg.style.width = L.W + 'px'; svg.style.height = L.H + 'px';
  const hl = highlight();
  if (matrixView()) { svg.innerHTML = matrixSVG(hl); root.querySelector('.cm-html').innerHTML = matrixHTML(hl); matrixHeads(hl); matrixRail(hl); }
  else { svg.innerHTML = mapSVG(hl); root.querySelector('.cm-html').innerHTML = mapHTML(hl) + (TM.decisions.length ? '' : emptyHTML()); mapHeads(); root.querySelector('.cm-rail-in').innerHTML = ''; }
  svg.dataset.cmConnectionOrder = JSON.stringify((L.routes || []).map(r => r.id));
  chrome(); panel(); walkBar(); NT.ownView(); modelChrome(root);
  stage.use(L, JSON.stringify([S.view, S.scope?.kind || 'system', S.scope?.id || '', depth()]));
  if (fitPending) { fitPending = false; stage.fit(); } else stage.clamp();
  stage.apply();
}
function emptyHTML() {
  return `<div class="dx-empty" style="left:${DM.DRV_W + 80}px;top:${mapHead() + 24}px"><b>No decision yet</b><p>A decision frames a design question, weighs its alternatives against the quality drivers, and records why one is chosen.</p><div><button type="button" class="cm-btn primary" data-dx="new-question">${icon('plus')}New decision</button><button type="button" class="cm-btn gold" data-dx="style-decision">Record the architecture style</button>${draftActionHTML(project(), 3)}</div></div>`;
}

// What an object concerns, in the terms of the drawn model.
function concerns(id) {
  const out = {ids: new Set([id]), drivers: new Set(), eff: null};
  if (!id) return out;
  if (X(id)) { const x = X(id); x.drivers.forEach(d => { out.ids.add(d); out.drivers.add(d); }); x.alts.forEach(a => out.ids.add(a.id)); styleSuggestions(TM).filter(s => s.decision === id).forEach(s => out.ids.add(s.id)); }
  else if (Alt(id)) { const a = Alt(id), x = X(a.decision); out.ids.add(x.id); x.drivers.forEach(d => { out.ids.add(d); out.drivers.add(d); }); }
  else if (Drv(id)) { out.drivers.add(id); out.eff = id; for (const x of TM.decisions.filter(x => x.drivers.includes(id))) { out.ids.add(x.id); x.alts.forEach(a => out.ids.add(a.id)); } }
  else if (id.startsWith('SUG:')) { const s = styleSuggestions(TM).find(s => s.id === id); if (s) { out.ids.add(s.decision); X(s.decision).drivers.forEach(d => out.ids.add(d)); } }
  return out;
}
function highlight() {
  const out = {on: false, ids: new Set(), drivers: new Set(), eff: null, now: null};
  if (S.walk >= 0) { const id = mapWalk(TM)[S.walk]; if (id) { out.on = true; out.now = id; Object.assign(out, concerns(id), {on: true, now: id}); } }
  else if (S.sel) { const c = concerns(S.sel); out.on = true; out.ids = c.ids; out.drivers = c.drivers; out.eff = c.eff; }
  return out;
}

// ---------------------------------------------------------------- decision map

// The map's lines, each ink run drawn once (round 10, V3). A driver's stub and track carry every route it weighs, with a
// dot where the track divides; a decision's alternatives hang from one comb per style (tradeoff-layout.js, which also
// declares how the lines share ink and which shares are drawn apart). Ink is shared only inside one driver's or one
// decision's lines drawn alike (wire-merge.js); every route keeps its own head. A run is lit while any route on it is
// selected or traced and dims only when every route on it does; the lit routes are then drawn again whole, on top,
// each with its own head, so a selection lights exactly its own lines.
let wired = null;
function wiresOf() {
  if (wired?.L !== L) { const D = mapWireRoutes(L); wired = {L, weighs: mergeWires(D.weighs), options: mergeWires(D.options)}; }
  return wired;
}
const DASHED = new Set(['proposed', 'suggested']);
function mapSVG(hl) {
  const on = new Set(L.routes.filter(r => hl.on && hl.ids.has(r.from) && hl.ids.has(r.to) && (!hl.eff || r.from === hl.eff || r.kind !== 'weighs')).map(r => r.id));
  const W = wiresOf(), any = ids => ids.some(id => on.has(id)), state = ids => (any(ids) ? ' lit' : hl.on ? ' dim' : '');
  const chain = (c, kind) => `<path ${connectionAttrs(c.ids)} class="dx-route ${esc(kind)}${state(c.ids)}" d="${roundPath(c.pts, 7)}"${DASHED.has(kind) && c.offset ? ` style="stroke-dashoffset:${c.offset}"` : ''}/>`;
  const head = (h, cls) => headPath(h.x, h.y, h.dir, cls === ' lit' ? 10 : 8, 'dx-head' + cls, h.ids);
  const out = [...W.options.chains.map(c => chain(c, c.style)), ...W.weighs.chains.map(c => chain(c, 'weighs'))];
  for (const j of W.weighs.joins) if (!any(j.ids)) out.push(`<circle ${connectionAttrs(j.ids)} class="dx-join${state(j.ids)}" cx="${j.x}" cy="${j.y}" r="2.4"/>`);
  for (const h of W.weighs.heads) if (!any(h.ids)) out.push(head(h, state(h.ids)));
  for (const r of L.routes) if (on.has(r.id)) out.push(`<path ${connectionAttrs(r.id)} class="dx-route ${esc(r.kind)} lit" d="${roundPath(r.pts, 7)}"/>`);
  for (const j of W.weighs.joins) if (any(j.ids)) out.push(`<circle ${connectionAttrs(j.ids)} class="dx-join lit" cx="${j.x}" cy="${j.y}" r="2.4"/>`);
  for (const h of W.weighs.heads) if (any(h.ids)) out.push(head(h, ' lit'));
  return out.join('');
}
function patternLine(a) {
  const cat = a.patterns.records.map(r => `<i class="dx-cat" title="${esc('Pattern catalogue · ' + r.name)}">${esc(r.name)}</i>`).join('') + a.patterns.playbook.map(p => `<i class="dx-cat pb" title="${esc('SA Playbook · ' + p.name)}">${esc(p.name)}</i>`).join('');
  return `<span class="dx-l1"><b class="dx-pat">${esc(a.a.pattern || 'No pattern named')}</b>${cat}</span>`;
}
function altCard(c, hl) {
  const a = Alt(c.id), x = X(a.decision), pos = `style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"`, g = proposal();
  const edited = g && g.existingId === a.id ? g.record : null, sd = readingStanding(x.reading, a.id), lead = sd?.kind === 'lead';
  const effs = x.drivers.map(d => { const e = a.effects[d]; return `<i class="dx-eff ${esc(e.effect)}${hl.eff === d ? ' focus' : ''}" title="${esc(d + ' · ' + EFFECT[e.effect][1] + (e.reason ? ': ' + e.reason : ''))}">${esc(d)} ${EFFECT[e.effect][0]}</i>`; }).join('');
  const anti = a.a.antiPattern ? `<span class="dx-anti" title="${esc(a.a.antiPattern)}"><b>Avoid</b>${esc(a.a.antiPattern)}${a.anti.records.map(r => `<i class="dx-cat anti">${esc(r.name)}</i>`).join('')}</span>` : '<span class="dx-anti none"><b>Avoid</b><em>no failure boundary recorded</em></span>';
  const st = `<span class="dx-l1">${a.responsibilities.map(r => `<i class="um-x k-comp" title="${esc('Chapter 4 · ' + r.ref + ' ' + r.title)}">${esc(r.ref)} ${esc(r.title)}</i>`).join('') || '<em>touches no responsibility yet</em>'}</span><span class="dx-l2"><em>${(a.a.relationships || []).length} relationship${(a.a.relationships || []).length === 1 ? '' : 's'} it would add</em></span>`;
  const fl = `<span class="dx-txt"><b>Then</b> ${esc(a.a.consequences || a.a.summary || 'No consequence recorded')}</span>`;
  const rs = `${patternLine(a)}<span class="dx-l2">${effs}</span>`;
  const coverage = alternativeCoverage(x, a.id);
  // The working choice, or the lead, in the head; beneath the lenses where it stands in the reading (D-25-03 to D-25-06):
  // ruled out, dominated, how firmly the lead holds, tied, or its rank. A working choice says its standing in full.
  const badge = a.chosen ? '<i class="dx-chosen">● Working choice</i>' : lead ? `<i class="dx-lead" title="${esc('The drivers lean to it as weighted: ' + coverage.judged + '/' + coverage.total + ' effects judged, ' + coverage.evidenced + ' evidence fields recorded. ' + READING_NOTE)}">${esc(sd.label)}</i>` : '';
  const stand = sd && (a.chosen || !lead ? sd.line : sd.detail);
  const card = `${a.chosen ? ' chosen' : ''}${lead ? ' lead' : sd?.kind === 'out' ? ' out' : sd?.kind === 'dominated' ? ' dom' : ''}`;
  return `<div class="dx-card alt${card}${edited ? ' ghosted' : ''}${S.sel === a.id ? ' sel' : ''}${lit(hl, a.id)}" data-card="${esc(a.id)}" ${pos} tabindex="0" role="button" aria-label="${esc('Alternative ' + a.id + ' ' + a.a.title + (sd?.line ? '. ' + sd.line : ''))}"><small><b class="dx-ref">${esc(a.id)}</b>${badge}<em class="dx-score" title="${esc('Weighed on the drivers: ' + tallyText(TM, x, a.id))}">${esc(sd?.total || '')}</em></small><b class="dx-t">${esc(edited ? edited.title : a.a.title)}</b><div class="dx-lens"><div class="st">${st}</div><div class="fl">${fl}</div><div class="rs">${rs}</div></div>${stand ? `<span class="dx-stand ${esc(sd.kind)}" title="${esc(sd.line)}">${esc(stand)}</span>` : ''}${anti}</div>`;
}
function decisionCard(c, hl) {
  const x = X(c.id), r = x.reading, pos = `style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"`;
  const lead = x.lead ? Alt(x.lead).a.title : x.tally.tied.length ? 'a tie' : r.state === 'out' ? 'none: each is ruled out' : '—';
  const st = `<span class="dx-l1">${(x.d.requirementIds || []).map(r => `<i class="um-x">${esc(r)}</i>`).join('') || '<em>no requirement</em>'}</span>`;
  const fl = `<span class="dx-txt">${esc(x.d.context || 'No context recorded')}</span>`;
  const rs = `<span class="dx-l1"><em>${r.only ? 'Only one meets the hard constraints' : 'Leads on the drivers'}</em><b class="dx-leadt">${esc(lead)}</b></span>`;
  return `<div class="dx-card dec ${esc(x.status)}${S.sel === x.id ? ' sel' : ''}${hl.now === x.id ? ' now' : ''}${lit(hl, x.id)}${x.style ? ' style' : ''}" data-card="${esc(x.id)}" ${pos} tabindex="0" role="button" aria-label="${esc('Decision ' + x.id + ' ' + x.question)}"><small><b class="dx-ref">${esc(x.id)}</b><i class="dx-status ${esc(x.status)}">${esc(STATUS[x.status] || 'Draft')}</i>${x.selected ? '<i class="dx-chosen">choice made</i>' : ''}</small><b class="dx-t q">${esc(x.question)}</b><div class="dx-lens"><div class="st">${st}</div><div class="fl">${fl}</div><div class="rs">${rs}</div></div><span class="dx-dfoot">${x.alts.length} alternative${x.alts.length === 1 ? '' : 's'} · ${x.drivers.length} driver${x.drivers.length === 1 ? '' : 's'}${r.ruledOut.length ? ` · ${r.ruledOut.length} ruled out` : ''}${c.block.folded ? ' · folded' : ''}</span></div>`;
}
function mapHTML(hl) {
  const out = [];
  for (const c of L.cards) {
    const pos = `style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"`;
    if (c.kind === 'driver') {
      const d = Drv(c.id), sens = TM.sens.get(d.id);
      out.push(`<div class="dx-card drv ${esc(d.priority.toLowerCase())}${S.sel === d.id ? ' sel' : ''}${lit(hl, d.id)}" data-card="${esc(d.id)}" ${pos} tabindex="0" role="button" aria-label="${esc('Quality driver ' + d.id + ' ' + d.title)}"><small><b class="dx-ref">${esc(d.id)}</b>${prioChip(d.priority)}${weightHTML(d)}</small><b class="dx-t">${esc(d.title)}</b><span class="dx-tg">${target(d)}${sens ? `<i class="dx-sens" title="${esc('A one-step priority change alters ' + [...new Set(sens.map(s => s.decision))].join(', '))}">sensitivity point</i>` : ''}</span></div>`);
      continue;
    }
    if (c.kind === 'decision') { out.push(decisionCard(c, hl)); continue; }
    if (c.kind === 'alt') { out.push(altCard(c, hl)); continue; }
    if (c.kind === 'proposed') {
      const g = proposal(), r = g?.record || {};
      out.push(`<div class="dx-card alt proposed${S.sel === PROPOSED_ALT ? ' sel' : ''}${lit(hl, PROPOSED_ALT)}" data-card="${PROPOSED_ALT}" ${pos} tabindex="0" role="group" aria-label="${esc('Proposed alternative ' + (r.title || '') + '. Press Enter to select the proposal')}"><small><b class="dx-ref">Proposal · not saved</b></small><b class="dx-t">${esc(r.title || '')}</b><div class="dx-lens"><div class="st"><span class="dx-txt">${esc(r.summary || '')}</span></div><div class="fl"><span class="dx-txt">${esc(r.consequences || '')}</span></div><div class="rs"><span class="dx-l1"><b class="dx-pat">${esc(r.pattern || '')}</b></span></div></div><span class="dx-anti"><button type="button" class="cm-mini gold" data-d-action="edit-proposal">Review &amp; edit</button></span></div>`);
      continue;
    }
    if (c.kind === 'suggested') {
      const s = styleSuggestions(TM).find(s => s.id === c.id), x = X(s.decision);
      const marks = x.drivers.map(id => { const d = Drv(id), m = d?.attr ? s.style.effects[d.attr] : null; return `<i class="dx-mark ${m ? (m === 'x' ? 'x' : 'cx') : 'none'}" title="${esc(id + ' · ' + (attribute(d?.attr)?.name || d?.category) + ': ' + (m === 'x' ? 'strong support' : m === '(x)' ? 'conditional support' : 'not covered by the playbook\'s table'))}">${esc(id)} ${m || '—'}</i>`; }).join('');
      out.push(`<div class="dx-card alt suggested${S.sel === c.id ? ' sel' : ''}${lit(hl, c.id)}" data-card="${esc(c.id)}" ${pos} tabindex="0" role="group" aria-label="${esc('Playbook style ' + s.style.name + '. Press Enter to select the style')}"><small><b class="dx-ref">From the SA Playbook</b><i class="dx-cat pb">style table</i></small><b class="dx-t">${esc(s.style.name)}</b><span class="dx-l2 marks">${marks}</span><span class="dx-anti"><button type="button" class="cm-mini gold" data-dx="add-style" data-id="${esc(s.style.id)}">Add as an alternative</button></span></div>`);
      continue;
    }
    if (c.kind === 'style-proposal') {
      out.push(`<div class="dx-card dec style-proposal${S.sel === STYLE_PROPOSAL ? ' sel' : ''}${lit(hl, STYLE_PROPOSAL)}" data-card="${STYLE_PROPOSAL}" ${pos} tabindex="0" role="group" aria-roledescription="card" aria-label="Architecture style not recorded"><small><b class="dx-ref">Not recorded</b><i class="dx-cat pb">SA Playbook</i></small><b class="dx-t q">Which architecture style should structure this design?</b><span class="dx-txt">No decision records the style. The playbook compares ${STYLES.length} styles on the qualities they support.</span><span class="dx-dfoot"><button type="button" class="cm-mini gold" data-dx="style-decision">Record the style decision</button></span></div>`);
    }
  }
  return out.join('');
}
function mapHeads() {
  const box = root.querySelector('.cm-heads-in'), T = {drivers: ['Drivers', 'Chapter 2 · by priority, with weight'], decisions: ['Decisions', 'Chapter 3 · the question and its state'], alternatives: ['Alternatives', 'pattern · effect on each driver · what to avoid']};
  box.innerHTML = L.cols.map(c => `<div class="um-ch" style="left:${c.x}px;width:${c.w}px;top:8px;height:${DM.HEAD_H - 8}px"><b>${esc(T[c.id][0])}</b><span>${esc(T[c.id][1])}</span></div>`).join('');
  box.style.width = L.W + 'px';
}

// ---------------------------------------------------------------- trade-off matrix

function matrixSVG(hl) {
  const out = [];
  L.rows.forEach((r, i) => out.push(`<rect class="dx-mrow${i % 2 ? ' odd' : ''}${hl.drivers.has(r.id) ? ' lit' : ''}" x="${L.rail}" y="${r.y}" width="${L.W - L.rail}" height="${r.h}"/>`));
  for (const g of L.groups) out.push(`<rect class="dx-mgroup${g.kind === 'styles' ? ' styles' : ''}${hl.ids.has(g.id) ? ' lit' : ''}" x="${g.x - 4}" y="${L.top - 2}" width="${g.w + 8}" height="${L.footY + L.footH - L.top + 2}" rx="10"/>`);
  return out.join('');
}
function matrixHTML(hl) {
  const out = [];
  for (const col of L.cols) {
    if (col.kind === 'styles') {
      const s = STYLES.find(x => 'STY:' + x.id === col.id);
      for (const r of L.rows) {
        const d = Drv(r.id), m = d?.attr ? s.effects[d.attr] : null;
        out.push(`<div class="dx-cell style ${m ? (m === 'x' ? 'x' : 'cx') : 'none'}" data-card="${esc(col.id)}" tabindex="0" role="button" aria-label="${esc(s.name + ' on ' + (d?.title || r.id) + ': ' + (m === 'x' ? 'strong playbook mark' : m === '(x)' ? 'conditional playbook mark' : 'not covered by the playbook style table'))}" style="left:${col.x + 3}px;top:${r.y + 3}px;width:${col.w - 6}px;height:${r.h - 6}px" title="${esc(s.name + ' · ' + (attribute(d?.attr)?.name || d?.category || '') + ': ' + (m === 'x' ? STYLE_KEY.x : m === '(x)' ? STYLE_KEY['(x)'] : 'Not covered by the playbook\'s style table.'))}"><b>${m || '—'}</b><small>${m === 'x' ? 'strong' : m === '(x)' ? 'conditional' : 'not covered'}</small></div>`);
      }
      const n = L.rows.filter(r => { const d = Drv(r.id); return d?.attr && s.effects[d.attr]; }).length;
      out.push(`<div class="dx-foot style" style="left:${col.x + 3}px;top:${L.footY}px;width:${col.w - 6}px;height:${L.footH - 6}px"><b>${n}</b><small>of ${L.rows.length} drivers marked</small></div>`);
      continue;
    }
    const a = Alt(col.id), x = X(a.decision);
    for (const r of L.rows) {
      const pos = `style="left:${col.x + 3}px;top:${r.y + 3}px;width:${col.w - 6}px;height:${r.h - 6}px"`;
      if (!x.drivers.includes(r.id)) { out.push(`<div class="dx-cell na" ${pos}></div>`); continue; }
      // "Breaks it" counts as tension; an unstated cell with suggested effects says so, labelled and not counted.
      const e = a.effects[r.id], w = weightOf(Drv(r.id).priority), sc = e.effect === 'supports' ? '+' + w : e.effect === 'tension' || e.effect === 'violates' ? '−' + w : '0';
      const sg = e.effect === 'unknown' ? cellSuggestions(x.id, a.id, r.id) : null;
      out.push(`<div class="dx-cell ${esc(e.effect)}${hl.on && hl.ids.has(a.id) && hl.drivers.has(r.id) ? ' lit' : ''}" data-card="${esc(a.id)}" data-driver="${esc(r.id)}" tabindex="0" role="button" aria-label="${esc(a.a.title + ' on ' + Drv(r.id).title + ': ' + EFFECT[e.effect][1] + (sg ? '; a suggestion, not counted' : '') + '. Open assessment details')}" ${pos} title="${esc(a.id + ' on ' + r.id + ' · ' + EFFECT[e.effect][1] + (e.reason ? ': ' + e.reason : '') + (e.evidence ? ' Evidence: ' + e.evidence : '') + (sg ? ' · Suggested, not counted: ' + sg.suggestions.map(s => s.ask ? 'a question' : EFFECT[s.effect][1]).join(', ') : ''))}"><b>${EFFECT[e.effect][0]}</b><small>${esc(EFFECT[e.effect][1])}</small>${sg ? '<i class="dx-sug">suggestion</i>' : ''}<em>${sc}</em></div>`);
    }
    // The reading's row (D-25-03 to D-25-06): the total, the range its unstated effects could move it to, and where it
    // stands: leads, tied, its rank, dominated, or ruled out by the hard constraint it breaks (and not ranked).
    const sd = readingStanding(x.reading, a.id), coverage = alternativeCoverage(x, a.id);
    out.push(`<div class="dx-foot ${esc(sd.kind)}${a.chosen ? ' chosen' : ''}" data-card="${esc(a.id)}" tabindex="0" role="button" aria-label="${esc(a.a.title + ': ' + sd.total + ' on the drivers' + (sd.bounds ? ', ' + sd.bounds + ' once the unstated effects are known' : '') + (sd.line ? '. ' + sd.line : '') + '. ' + coverage.judged + ' of ' + coverage.total + ' effects judged, ' + coverage.evidenced + ' evidence fields recorded. Open details')}" style="left:${col.x + 3}px;top:${L.footY}px;width:${col.w - 6}px;height:${L.footH - 6}px" title="${esc(tallyText(TM, x, a.id) + (sd.line ? ' · ' + sd.line : ''))}"><b>${esc(sd.total)}</b>${sd.bounds ? `<small>${esc(sd.bounds)}</small>` : ''}<small>${esc(sd.kind === 'out' ? 'ruled out · ' + sd.detail : (sd.foot ? sd.foot + ' · ' : '') + coverage.judged + '/' + coverage.total + ' judged')}</small>${a.chosen ? '<i class="dx-chosen">● choice</i>' : ''}</div>`);
  }
  for (const g of L.groups.filter(g => g.empty)) out.push(`<div class="dx-cell empty" style="left:${g.x + 3}px;top:${L.top + 3}px;width:${g.w - 6}px;height:${Math.max(60, L.rows.length * MX.ROW_H - 6)}px"><small>No alternative yet</small><button type="button" class="cm-mini" data-dx="add-alt" data-id="${esc(g.id)}">Add one</button></div>`);
  return out.join('');
}
function matrixHeads(hl) {
  const box = root.querySelector('.cm-heads-in'), out = [];
  for (const g of L.groups) {
    if (g.kind === 'styles') out.push(`<div class="dx-gh styles${S.sel === STYLE_PROPOSAL ? ' sel' : ''}" data-card="${STYLE_PROPOSAL}" style="left:${g.x}px;width:${g.w}px;top:6px;height:${MX.GROUP_H - 6}px"><small>Architecture style · SA Playbook</small><b>Not recorded as a decision</b><button type="button" class="cm-mini gold" data-dx="style-decision">Record it</button></div>`);
    else { const x = X(g.id); out.push(`<div class="dx-gh${S.sel === x.id ? ' sel' : ''}${hl.ids.has(x.id) ? ' lit' : ''}" data-card="${esc(x.id)}" style="left:${g.x}px;width:${g.w}px;top:6px;height:${MX.GROUP_H - 6}px" title="${esc(x.question)}"><small>${esc(x.id)} · ${esc(STATUS[x.status] || 'Draft')}</small><b>${esc(x.question)}</b></div>`); }
  }
  for (const col of L.cols) {
    const t = MX.GROUP_H + 4, h = MX.HEAD_H - t - 4;
    if (col.kind === 'styles') { const s = STYLES.find(x => 'STY:' + x.id === col.id); out.push(`<div class="dx-ch style" data-card="${esc(col.id)}" style="left:${col.x + 2}px;width:${col.w - 4}px;top:${t}px;height:${h}px"><small>style</small><b>${esc(s.name)}</b></div>`); continue; }
    const a = Alt(col.id), k = readingStanding(X(a.decision).reading, a.id)?.kind;
    out.push(`<div class="dx-ch${a.chosen ? ' chosen' : ''}${k === 'lead' ? ' lead' : k === 'out' ? ' out' : ''}${S.sel === a.id ? ' sel' : ''}" data-card="${esc(a.id)}" style="left:${col.x + 2}px;width:${col.w - 4}px;top:${t}px;height:${h}px" title="${esc(a.a.title)}"><small>${esc(a.id)}${a.chosen ? ' · ● choice' : k === 'lead' ? ' · ★ leads' : k === 'out' ? ' · ruled out' : ''}</small><b>${esc(a.a.title)}</b><em>${esc(a.a.pattern || '')}</em></div>`);
  }
  box.innerHTML = out.join('');
  box.style.width = L.W + 'px';
}
function matrixRail(hl) {
  const box = root.querySelector('.cm-rail-in');
  box.innerHTML = L.rows.map(r => { const d = Drv(r.id), sens = TM.sens.get(d.id); return `<div class="dx-rh ${esc(d.priority.toLowerCase())}${S.sel === d.id ? ' sel' : ''}${hl.drivers.has(d.id) ? ' lit' : ''}" data-card="${esc(d.id)}" style="top:${r.y + 3}px;height:${r.h - 6}px"><small><b>${esc(d.id)}</b>${prioChip(d.priority)}${weightHTML(d)}${sens ? '<i class="dx-sens">sensitivity</i>' : ''}</small><b>${esc(d.title)}</b></div>`; }).join('') + `<div class="dx-rh foot" style="top:${L.footY}px;height:${L.footH - 6}px"><small>As the drivers weigh it</small><b>Σ priority × effect</b></div>`;
  box.style.height = L.H + 'px'; box.style.width = L.rail + 'px';
}

// ---------------------------------------------------------------- chrome

function crumbs() {
  const sc = scope(), parts = [`<button type="button" data-dx="scope" data-kind="system" class="${sc.kind === 'system' ? 'here' : ''}">All decisions</button>`];
  if (sc.kind !== 'system') parts.push('<span>›</span>', `<button type="button" class="here" data-dx="noop">${esc(sc.kind === 'decision' ? sc.id + ' ' + X(sc.id).question : sc.id + ' ' + Drv(sc.id).title)}</button>`);
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
  root.querySelector('.cm-lenses').innerHTML = matrixView() ? '' : LENSES.map(l => `<button type="button" class="cm-lens" data-dx="lens" data-id="${esc(l.id)}" aria-pressed="${S.lens === l.id}" title="${esc(l.q + ' Like the ' + l.like + '.')}">${icon(l.id)}<span>${l.label}</span></button>`).join('');
  const dp = depth();
  root.querySelector('.cm-depth').innerHTML = !matrixView() && sc.kind === 'system' ? `<span>Elements</span>${[['decisions', 'Decisions'], ['alternatives', 'Alternatives']].map(([id, t]) => `<button type="button" class="cm-dep" data-dx="depth" data-id="${esc(id)}" aria-pressed="${dp === id}">${t}</button>`).join('')}` : '';
  const ds = TM.decisions, chosenN = ds.filter(x => x.selected).length, sens = TM.sens.size;
  root.querySelector('.cm-state').textContent = `${ds.length} decision${ds.length === 1 ? '' : 's'} · ${TM.A.size} alternatives · ${chosenN} with a working choice · ${sens} sensitivity point${sens === 1 ? '' : 's'}${TM.styleDecision ? '' : ' · style not recorded'}`;
  const g = proposal();
  root.querySelector('.cm-banner').innerHTML = g ? `<section class="dp-banner"><span class="ip-kicker">Alternative proposal · not saved</span><b>${esc(g.record?.title || '')}</b><small>${esc(g.decisionId || '')}</small><button type="button" class="cm-btn gold" data-d-action="edit-proposal">Review &amp; edit</button><button type="button" class="cm-btn" data-d-action="dismiss-proposal">Dismiss</button></section>` : '';
  root.querySelector('.cm-legend').innerHTML = matrixView()
    ? `<p><i class="dx-eff supports">✓</i>Supports the driver</p><p><i class="dx-eff tension">⚠</i>Creates tension</p><p><i class="dx-eff violates">✕</i>Breaks it: a constraint only; a hard one rules the alternative out</p><p><i class="dx-eff neutral">·</i>Little direct effect</p><p><i class="dx-eff unknown">?</i>Needs evidence</p><p><i class="dx-sug">suggestion</i>Suggested effect, not counted until a person records it</p><p><i class="dx-mark x">x</i><i class="dx-mark cx">(x)</i>The playbook's style marks: strong, conditional</p><p><b>+2</b>&nbsp;Weighed: priority weight (High 3, Medium 2, Low 1; none stated 0) × effect</p><p>${esc(READING_NOTE)}</p>`
    : `<p><span class="k-drv"></span>Driver, with its weight</p><p><span class="k-dec"></span>Decision</p><p><span class="k-alt"></span>Alternative · <i class="dx-chosen">●</i> working choice · <i class="dx-lead">★</i> leads on the drivers</p><p><i class="dx-stand out">Ruled out</i>Breaks a hard constraint · <i class="dx-stand dominated">Dominated</i>another is at least as good on every driver</p><p><i class="dx-cat">Name</i>In the pattern catalogue</p><p><i class="dx-cat anti">Name</i>Anti-pattern it risks</p><p><b>+2</b>&nbsp;An alternative's total on the drivers: priority weight × effect</p><p>${esc(READING_NOTE)}</p>`;
}

// ---------------------------------------------------------------- companion

const act = (k, attrs, label, cls = '') => `<button type="button" class="cm-btn ${cls}" data-dx="${k}" ${attrs}>${label}</button>`;
const link = id => `<button type="button" class="cm-link" data-sel="${esc(id)}">${esc(refTitle(id))}</button>`;
// Sol's assessment sits in the companion's own Sol section (chapter-sol.js); "More with Sol" opens Sol's panel.
const brain = () => '';
const src = s => `<small class="um-src" title="${esc(s)}">${icon('book')}${esc(locator(s))}</small>`;
// The decision reading in the companion (round 25, D-25-03 to D-25-08): each alternative's arithmetic and standing, the
// reading's own sentences (the lead and how firmly it holds, what is ruled out or dominated, the unstated effects that
// could change the lead, where the two at the top pull apart, the drivers left out of the weights, the sensitivity points
// and where the working choice stands), and what recording the suggested effects would change, as a labelled hypothesis.
function specimenDecision(id) {
  const x = X(id), d = x.d, r = x.reading, sg = TM.suggestions(id), n = sg?.cells.length || 0, hyp = suggestionHypothesis(sg, r, altName);
  const rows = r.rows.map(row => { const c = alternativeCoverage(x, row.id), sd = readingStanding(r, row.id, {alt: altName}); return `<p class="um-alt ${sd.kind === 'lead' ? 'supports' : sd.kind === 'out' ? 'violates' : ''}${row.id === x.selected ? ' chosen' : ''}"><i>${sd.kind === 'lead' ? '★' : sd.kind === 'out' ? '✕' : row.id === x.selected ? '●' : '·'}</i>${esc(row.alt.title)}<em>${esc(tallyText(TM, x, row.id))}</em><small>${esc([sd.line, sd.bounds && sd.bounds + ' once the unstated effects are known', `${c.judged}/${c.total} effects judged · ${c.evidenced} evidence fields`].filter(Boolean).join(' · '))}</small></p>`; }).join('');
  const said = `<ul class="dx-reading">${readingWords(TM, id).map(l => `<li class="${esc(l.kind)}">${esc(l.text)}</li>`).join('')}</ul>${n ? `<p class="dx-sugg"><b>${n} unstated effect${n === 1 ? ' has a suggestion' : 's have suggestions'}</b> from the SA Playbook or released knowledge: none is counted until a person records it in the comparison.</p>` : ''}${hyp ? `<p class="dx-sugg">${esc(hyp)}</p>` : ''}`;
  return `<section class="cm-spec"><h4 aria-level="3">Decision · ${esc(x.id)}<span class="${x.status === 'accepted' ? 'guarded' : ''}">${esc(x.statusLabel)}</span></h4><p class="cm-spec-t"><b>${esc(x.question)}</b></p>${d.context ? `<p>${esc(d.context)}</p>` : ''}<dl class="cm-dl"><div><dt>Weighs</dt><dd>${x.drivers.map(id => `${link(id)}<small class="um-srcl">${esc(Drv(id).priority || 'Priority not stated')} · ${esc(targetText(Drv(id)))}</small>`).join('')}</dd></div><div><dt>As weighted</dt><dd>${rows || '—'}</dd></div><div><dt>The reading</dt><dd>${said}</dd></div><div class="${x.selected ? '' : 'miss'}"><dt>Working choice</dt><dd>${x.selected ? link(x.selected) : 'None yet'}</dd></div>${d.rationale ? `<div><dt>Why</dt><dd>${esc(d.rationale)}</dd></div>` : ''}${d.assumptions ? `<div class="${d.assumptionsResolved ? '' : 'miss'}"><dt>Assumes</dt><dd>${esc(d.assumptions)}${d.assumptionsResolved ? '' : '<br><em>Not yet confirmed</em>'}</dd></div>` : ''}${d.risks ? `<div><dt>Risks</dt><dd>${esc(d.risks)}</dd></div>` : ''}</dl><p class="cm-muted">${esc(READING_NOTE)} The working choice is a person's, and the rationale says why.</p><div class="cm-acts">${act('edit-question', `data-id="${esc(id)}"`, icon('edit') + 'Edit decision', 'primary')}${act('add-alt', `data-id="${esc(id)}"`, icon('plus') + 'Add an alternative')}<button type="button" class="cm-btn" data-dx="dissect" data-id="${esc(id)}">${icon('dissect')}Focus on it</button>${brain()}<button type="button" class="cm-btn" data-brain-launch="mind">${icon('mind')}Co-design</button></div></section>`;
}
function knowledgeHTML(a) {
  const parts = [];
  for (const p of a.patterns.playbook) parts.push(`<div class="um-to"><b>${esc(p.name)} · SA Playbook</b><p>${esc(p.text)}</p><p class="um-to-d">${Object.entries(p.effects).map(([k, m]) => `<i class="dx-mark ${m === 'x' ? 'x' : 'cx'}">${esc(attribute(k)?.name || k)} ${m}</i>`).join('')}</p>${src(p.src)}</div>`);
  for (const r of a.patterns.records) parts.push(`<div class="um-to"><b>${esc(r.name)}</b><p class="cm-muted">In the pattern catalogue (${esc(r.type)})${r.conflicts.length ? ' · conflicts with ' + esc(r.conflicts.map(id => id.replace(/^[A-Z]+-/, '').toLowerCase().replace(/-/g, ' ')).join(', ')) : ''}.</p></div>`);
  for (const r of a.anti.records) parts.push(`<div class="um-to"><b>${esc(r.name)} · anti-pattern</b><p class="cm-muted">The pattern catalogue's name for this failure boundary.</p></div>`);
  return parts.length ? `<section><h4 aria-level="3">Pattern knowledge</h4>${parts.join('')}</section>` : '';
}
// A cell's suggested effects, each with its source, labelled as a suggestion and not counted (D-25-08). "Use this
// suggestion" opens the comparison editor filled with it, for the person to review and save (decision.alternative):
// nothing is recorded before they save, and what they save is theirs. A conditional mark asks; it suggests no effect.
function suggestionsHTML(decisionId, altId, driverId) {
  const cell = cellSuggestions(decisionId, altId, driverId);
  return cell ? cell.suggestions.map((s, i) => `<div class="dx-sugg"><small>Suggestion · not counted</small><p>${s.ask ? esc(s.reason) : `Suggests <b>${esc(EFFECT[s.effect][1])}</b>: ${esc(s.reason)}`}</p><p class="um-ev"><span>Source</span>${esc(s.evidence)}</p>${act('use-suggestion', `data-id="${esc(decisionId)}" data-alt="${esc(altId)}" data-driver="${esc(driverId)}" data-index="${i}"`, s.ask ? 'Answer it in the comparison' : 'Use this suggestion', s.ask ? '' : 'gold')}</div>`).join('') : '';
}
function specimenAlternative(id) {
  const a = Alt(id), x = X(a.decision), r = x.reading, sd = readingStanding(r, a.id, {alt: altName});
  const coverage = alternativeCoverage(x, id), focused = x.drivers.includes(S.focusDriver) ? S.focusDriver : null;
  const effs = [...x.drivers].sort((l, r) => (r === focused ? 1 : 0) - (l === focused ? 1 : 0)).map(d => { const e = a.effects[d]; return `<div class="um-adr${focused === d ? ' dx-assessment-focus' : ''}">${focused === d ? '<small>Selected matrix cell</small>' : ''}<p class="um-alt ${esc(e.effect)}"><i>${EFFECT[e.effect][0]}</i>${link(d)}<em>${esc(EFFECT[e.effect][1])} · ×${weightOf(Drv(d).priority)}</em></p><p class="um-ev"><span>Reason</span>${esc(e.reason || 'No reason recorded')}</p><p class="um-ev"><span>Evidence</span>${esc(e.evidence || 'No evidence recorded')}</p>${e.effect === 'unknown' ? suggestionsHTML(x.id, a.id, d) : ''}</div>`; }).join('');
  // The reading's sentences about this alternative: its lead, rule-out or dominance, the unstated effects that matter, and
  // where it and the other at the top pull apart.
  const mine = readingWords(TM, x.id).filter(l => l.id === a.id || l.by === a.id || l.ids?.includes(a.id) || (l.kind === 'unknowns' && r.unknowns.cells?.some(c => c.of === a.id)) || (l.kind === 'apart' && [r.apart?.first, r.apart?.second].includes(a.id)));
  const weighed = `${esc(tallyText(TM, x, a.id))}<br><b>${esc(sd.total)}</b>${sd.bounds ? esc(`, ${sd.bounds} once the unstated effects are known`) : ''}${sd.line ? ' · ' + esc(sd.line) : ''}${mine.length ? `<ul class="dx-reading">${mine.map(l => `<li class="${esc(l.kind)}">${esc(l.text)}</li>`).join('')}</ul>` : '<br>'}<small>${coverage.judged}/${coverage.total} effects judged · ${coverage.reasoned} reasons · ${coverage.evidenced} evidence fields. An unstated effect counts as nothing in the total; the range says what stating it could do. ${esc(READING_NOTE)}</small>`;
  return `<section class="cm-spec"><h4 aria-level="3">Alternative · ${esc(a.id)} of ${esc(x.id)}${a.chosen ? '<span class="guarded">Working choice</span>' : sd.kind === 'lead' ? '<span>Leads on the drivers</span>' : sd.kind === 'out' ? '<span class="exposed">Ruled out</span>' : sd.kind === 'dominated' ? '<span>Dominated</span>' : ''}</h4><p class="cm-spec-t"><b>${esc(a.a.title)}</b></p>${a.a.summary ? `<p>${esc(a.a.summary)}</p>` : ''}<dl class="cm-dl"><div><dt>Pattern</dt><dd>${esc(a.a.pattern || '—')}</dd></div><div class="${a.a.antiPattern ? '' : 'miss'}"><dt>Avoid</dt><dd>${esc(a.a.antiPattern || 'No failure boundary recorded')}</dd></div>${a.a.benefits ? `<div><dt>Gains</dt><dd>${esc(a.a.benefits)}</dd></div>` : ''}${a.a.costs ? `<div><dt>Costs</dt><dd>${esc(a.a.costs)}</dd></div>` : ''}${a.a.consequences ? `<div><dt>Then</dt><dd>${esc(a.a.consequences)}</dd></div>` : ''}<div><dt>Changes</dt><dd>${a.responsibilities.map(r => `<a class="cm-link" href="${esc(projectURL('/?chapter=4&tab=model&object=' + encodeURIComponent(r.id)))}">${esc(r.ref + ' ' + r.title)} <small>Chapter 4</small></a>`).join('') || '<em>No responsibility yet</em>'}</dd></div><div><dt>As weighted</dt><dd>${weighed}</dd></div></dl><div class="cm-acts">${a.chosen ? '' : act('choose', `data-id="${esc(x.id)}" data-alt="${esc(a.id)}"`, icon('check') + 'Make it the working choice', 'primary')}${act('edit-alt', `data-id="${esc(x.id)}" data-alt="${esc(a.id)}"`, icon('edit') + 'Edit alternative', a.chosen ? 'primary' : '')}${brain()}</div></section><section><h4 aria-level="3">Effect on each driver<span>${x.drivers.length}</span></h4>${effs}</section>${knowledgeHTML(a)}`;
}
function specimenDriver(id) {
  const d = Drv(id), sens = TM.sens.get(id) || [];
  const rows = TM.decisions.filter(x => x.drivers.includes(id)).map(x => `<div class="um-adr">${link(x.id)}${x.alts.map(a => `<p class="um-alt ${esc(a.effects[id].effect)}${a.chosen ? ' chosen' : ''}"><i>${EFFECT[a.effects[id].effect][0]}</i>${esc(a.a.title)}<em>${esc(EFFECT[a.effects[id].effect][1])}</em></p>`).join('')}</div>`).join('');
  return `<section class="cm-spec"><h4 aria-level="3">Quality driver · ${esc(d.id)}<span>${esc(d.priority || 'Priority not stated')} · ×${weightOf(d.priority)}</span></h4><p class="cm-spec-t"><b>${esc(d.title)}</b></p><dl class="cm-dl"><div><dt>Target</dt><dd>${target(d)} ${esc(d.window || '')}</dd></div>${sens.length ? `<div><dt>Sensitivity</dt><dd>${sens.map(s => `At ${esc(s.to)}, in ${esc(s.decision)} ${esc(s.after ? Alt(s.after).a.title + ' would lead' : 'no alternative would lead')}.`).join('<br>')}</dd></div>` : ''}${weightOf(d.priority) ? '' : '<div class="miss"><dt>Weight</dt><dd>No priority is stated, so every decision that weighs it leaves it out of the weights.</dd></div>'}</dl><div class="cm-acts"><a class="cm-btn primary" href="${esc(projectURL('/?chapter=2&tab=model&driver=' + encodeURIComponent(id)))}">${icon('tune')}What if… in Chapter 2</a><button type="button" class="cm-btn" data-dx="dissect" data-id="${esc(id)}">${icon('dissect')}Only its decisions</button></div></section><section><h4 aria-level="3">How each alternative treats it</h4>${rows}</section>`;
}
function specimenStyle(id) {
  const s = id.startsWith('SUG:') ? styleSuggestions(TM).find(x => x.id === id)?.style : STYLES.find(x => 'STY:' + x.id === id);
  if (!s) return '';
  const drivers = id.startsWith('SUG:') ? X(styleSuggestions(TM).find(x => x.id === id).decision).drivers.map(Drv) : TM.allDrivers;
  return `<section class="cm-spec"><h4 aria-level="3">Architecture style · SA Playbook<span>${id.startsWith('SUG:') ? 'Suggested' : 'Not recorded'}</span></h4><p class="cm-spec-t"><b>${esc(s.name)}</b></p><dl class="cm-dl"><div><dt>Marks on this design's drivers</dt><dd>${drivers.map(d => { const m = d.attr ? s.effects[d.attr] : null; return `<p class="um-alt ${m ? 'supports' : 'unknown'}"><i>${m || '—'}</i>${esc(d.id + ' ' + (attribute(d.attr)?.name || d.category))}<em>${m === 'x' ? 'strong' : m === '(x)' ? 'conditional' : 'not covered'}</em></p>`; }).join('')}</dd></div>${Object.keys(s.also || {}).length ? `<div><dt>Also supports</dt><dd>${Object.entries(s.also).map(([k, v]) => esc(k + (v === '(x)' ? ' (conditional)' : ''))).join(', ')}</dd></div>` : ''}</dl>${src(s.src)}<p class="cm-muted">${esc(STYLE_KEY.caveat)}</p><div class="cm-acts">${id.startsWith('SUG:') ? act('add-style', `data-id="${esc(s.id)}"`, icon('plus') + 'Add as an alternative', 'gold') : act('style-decision', '', 'Record the style decision', 'gold')}</div></section><section><h4 aria-level="3">Questions to ask · the playbook</h4><ul class="um-ul">${s.questions.map(q => `<li>${esc(q.text)}</li>`).join('')}</ul>${src(s.questions[0]?.src || '')}</section>`;
}
function specimenStyleProposal() {
  const covered = TM.styleRows.filter(r => r.marks.some(m => m.mark));
  return `<section class="cm-spec"><h4 aria-level="3">Architecture style<span class="exposed">Not recorded</span></h4><p class="cm-spec-t"><b>Which architecture style should structure this design?</b></p><p>No decision records it. The SA Playbook compares ${STYLES.length} styles on the qualities they support; on this design's drivers its table speaks for ${covered.length ? covered.map(r => r.style.name).join(', ') : 'none of them'}. Record the question, then add the styles you want to compare as its alternatives — each arrives with the playbook's marks as its reasons.</p><div class="cm-acts">${act('style-decision', '', 'Record the style decision', 'gold')}<button type="button" class="cm-btn" data-dx="view" data-id="matrix">${icon('matrix')}See the playbook's table</button></div></section>`;
}
function specimenProposal() {
  const g = proposal(); if (!g) return '';
  const r = g.record || {};
  return `<section class="cm-spec"><h4 aria-level="3">Proposal · not saved</h4><p class="cm-spec-t"><b>${esc(r.title || '')}</b></p><p>${esc(r.summary || '')}</p><dl class="cm-dl"><div><dt>Pattern</dt><dd>${esc(r.pattern || '—')}</dd></div><div><dt>Avoid</dt><dd>${esc(r.antiPattern || '—')}</dd></div></dl><div class="cm-acts"><button type="button" class="cm-btn gold" data-d-action="edit-proposal">${icon('edit')}Review &amp; edit</button><button type="button" class="cm-btn" data-d-action="dismiss-proposal">Dismiss</button></div></section>`;
}
function reading() {
  if (diagramView()) return NT.readingHTML();
  if (matrixView()) return `<section><h4 aria-level="3">Reading this view</h4><p>Drivers run down, highest priority first, each with its <b>weight</b> (×0 when no priority is stated: the reading leaves it out). Alternatives run across under their decision. Select a cell with a pointer or Enter to read its reason and evidence in this panel.</p><p>The bottom row adds priority × effect, says how many effects were judged and where each alternative stands: ★ leads, tied, its rank, dominated, or ruled out by a hard constraint it breaks. An unstated effect counts as nothing; where effects are unstated the row gives the range they could move the total to. A cell marked <i class="dx-sug">suggestion</i> has a suggested effect, not counted until a person records it.${TM.styleDecision ? '' : ' The last group is the SA Playbook\'s <b>style table</b> read against the same drivers.'}</p><p class="cm-muted">${esc(READING_NOTE)}</p></section>`;
  return `<section><h4 aria-level="3">Reading this view</h4><p>Each <b>decision</b> weighs the drivers on its left; its <b>alternatives</b> stand on its right, each with the <b>pattern</b> it follows, the <b>failure boundary</b> to avoid, and its effect on every driver.</p><p>★ marks the alternative that leads on the drivers as weighted, with how firmly it holds; ● the working choice, which only a person makes. Beneath each alternative is where it stands: ruled out by a hard constraint it breaks, dominated by another, or its rank; the figure in its top-right corner is its total on the drivers, priority weight × effect. Names in boxes link to the pattern catalogue and the SA Playbook.</p><p class="cm-muted">${esc(READING_NOTE)}</p></section>`;
}
// Gaps and risks first, eight of how many, and "Show all" (round 12, G, GR-UX-04, GR-UX-08: insightsSection).
function insightsHTML() {
  return insightsSection(tradeoffInsights(TM, scope()), {key: 'tradeoff', item: x => `<div class="um-insw"><button type="button" class="cm-ins ${esc(x.kind)}" data-sel="${esc(x.id || '')}"><span>${esc(x.text)}</span>${x.ask ? `<small>Ask: ${esc(x.ask)}</small>` : ''}</button>${x.proposal === 'style' ? '<button type="button" class="cm-mini gold" data-dx="style-decision">Record the style decision</button>' : ''}</div>`, note: '<p class="cm-muted">Drawn from recorded decisions, alternatives and drivers, read against the SA Playbook and the pattern catalogue. Prompts for review, not verdicts.</p>'});
}
function findingsHTML() {
  const fs = TM.findings.filter(f => f.level);
  if (!fs.length) return '';
  const groups = new Map();
  for (const f of fs) { if (!groups.has(f.title)) groups.set(f.title, []); groups.get(f.title).push(f); }
  return `<section><h4 aria-level="3">Chapter 3 checks<span>${fs.length}</span></h4>${[...groups].slice(0, 6).map(([k, g]) => `<button type="button" class="cm-fg ${g.some(f => f.level === 'error') ? 'error' : ''}" data-sel="${esc(known(g[0].decisionId) ? g[0].decisionId : '')}"><b>${esc(k)}</b><small>${g.length}</small></button>`).join('')}<a class="cm-muted" href="${esc(projectURL('/?chapter=3&tab=validate&validate=readiness'))}">All checks on Validate →</a></section>`;
}

function panel() {
  const box = companionHost(root);
  solMark(root, project(), 3);
  if (!companionOpen(root, S.panel)) { box.innerHTML = ''; return; }
  const s = S.sel;
  let spec = !s ? '' : s === PROPOSED_ALT ? specimenProposal() : X(s) ? specimenDecision(s) : Alt(s) ? specimenAlternative(s) : Drv(s) ? specimenDriver(s) : s === STYLE_PROPOSAL ? specimenStyleProposal() : s.startsWith('SUG:') || s.startsWith('STY:') ? specimenStyle(s) : '';
  if (!spec && s && drawn(s)) spec = NT.specimenHTML(s);
  spec = NT.withSelected(spec, s);
  box.innerHTML = solInto(spec, solSection(project(), 3, s)) + reading() + insightsHTML() + findingsHTML();
}

// ---------------------------------------------------------------- walking the decisions

function walkBar() {
  if (diagramView()) { root.querySelector('.cm-walk-in').innerHTML = ''; return; }
  const bar = root.querySelector('.cm-walk-in'), ids = mapWalk(TM), n = ids.length;
  if (!n) { bar.innerHTML = '<p class="cm-walk-text">Frame a design question to walk the decisions.</p>'; return; }
  const cur = S.walk >= 0 ? ids[S.walk] : null;
  bar.innerHTML = `<button type="button" class="cm-btn" data-dx="walk-prev" aria-label="Previous decision" ${S.walk <= 0 ? 'disabled' : ''}>‹</button><button type="button" class="cm-btn" data-dx="walk-next">${S.walk < 0 ? icon('play') + '<span>Walk the decisions</span>' : S.walk >= n - 1 ? 'Done' : 'Next ›'}</button><p class="cm-walk-text">${cur ? `<b>${S.walk + 1} / ${n}</b> ${esc(describeDecision(TM, cur))}` : `${n} decision${n === 1 ? '' : 's'}. At each one: what it weighs, where the drivers lean, and what a person has chosen.`}</p>${S.walk >= 0 ? '<button type="button" class="cm-btn icon" data-dx="walk-stop" aria-label="Stop the walk">×</button>' : ''}`;
}
function walkTo(i) {
  const ids = mapWalk(TM);
  if (!ids.length) return;
  if (matrixView()) { S.view = 'map'; fitPending = true; }
  if (scope().kind !== 'system') { S.scope = {kind: 'system'}; fitPending = true; }
  S.walk = Math.max(-1, Math.min(ids.length - 1, i));
  if (S.walk >= 0) seen.add(ids[S.walk]);
  render();
  const id = ids[S.walk], cs = L.cards.filter(c => c.id === id || c.decision === id);
  if (cs.length) { const y0 = Math.min(...cs.map(c => c.y)), y1 = Math.max(...cs.map(c => c.y + c.h)); stage.reveal(L.cols[1].x - 20, y0 - 20, L.W - L.cols[1].x, y1 - y0 + 40); }
}

// ---------------------------------------------------------------- interaction

function revealSelection() {
  if (diagramView()) { const b = NT.layout()?.nodes.find(n => n.id === S.sel); if (b) stage.reveal(b.x, b.y, b.w, b.h); return; }
  if (!S.sel || !L || !root) return;
  if (matrixView()) { const col = L.cols.find(c => c.id === S.sel), row = L.rows.find(r => r.id === S.sel); if (col) stage.reveal(col.x, L.top, col.w, 80); else if (row) stage.reveal(L.rail, row.y, 200, row.h); return; }
  const c = (L.cards || []).find(x => x.id === S.sel);
  if (c) stage.reveal(c.x, c.y, c.w, c.h);
}
function select(id, {reveal = false, driver = null} = {}) {
  S.sel = id || null; S.focusDriver = Alt(S.sel) && Alt(S.sel).effects[driver] ? driver : null; S.walk = -1;
  const p = project(), dec = S.sel && X(S.sel) ? S.sel : S.sel && Alt(S.sel) ? Alt(S.sel).decision : null;
  if (dec) page()?.focus(dec);
  if (p) { try { mountBrainContext(p, {id: dec || solOwner(p, S.sel) || 'project', chapter: 3}, 'model'); } catch { /* assistance is optional */ } }
  announceObject(dec);
  if (S.sel && !S.panel) S.panel = true;
  save(); render();
  const box = companionOf(root); if (box) { box.scrollTop = 0; if (S.focusDriver) nextFrame(() => box.querySelector('.dx-assessment-focus')?.scrollIntoView?.({block: 'nearest'})); }
  if (reveal) revealSelection();
}
function setScope(sc) { const r = tradeoffScope(TM, sc); S.scope = r.kind === 'system' ? {kind: 'system'} : {kind: r.kind, id: r.id}; S.walk = -1; fitPending = true; save(); render(); }
function onAct(k, a) {
  const pg = page();
  if (!pg) return;
  if (k === 'edit-question') { pg.editQuestion(a.dataset.id); return; }
  if (k === 'new-question') { pg.newQuestion(null); return; }
  if (k === 'style-decision') { pg.newQuestion(styleDecisionPreset(TM)); return; }
  if (k === 'add-alt') { pg.editAlternative(a.dataset.id, null); return; }
  if (k === 'edit-alt') { pg.editAlternative(a.dataset.id, a.dataset.alt); return; }
  if (k === 'choose') { pg.choose(a.dataset.id, a.dataset.alt); return; }
  if (k === 'add-style') { const s = styleSuggestions(TM).find(x => x.style.id === a.dataset.id); if (s) pg.proposeAlternative(s.decision, s.record); return; }
  // A suggested effect opens Chapter 3's comparison editor filled with it (decisions.js reads the suggestion again from the
  // saved project); nothing is recorded until the person saves it there.
  if (k === 'use-suggestion') pg.useSuggestion?.(a.dataset.id, a.dataset.alt, a.dataset.driver, Number(a.dataset.index));
}

function bind() {
  solChapterBind(root, 3, {refresh: solRefresh});
  listen(root, 'change', e => { NT.change(e); });
  listen(root, 'click', e => {
    if (root.dataset.suppress) return;
    if (NT.handle(e)) return;
    if (e.target.closest('[data-brain-launch],[data-d-action],a')) return;
    const a = e.target.closest('[data-dx]');
    if (a && !a.disabled) {
      const k = a.dataset.dx;
      if (k === 'whatif-open') { const source = project(); import('./architecture-whatif.js').then(({openArchitectureWhatif}) => { if (root?.isConnected && source === project()) openArchitectureWhatif({root, project, selectedDriver: Drv(S.sel) ? S.sel : '', drivers: TM.R.drivers, esc, projectURL}); }).catch(error => console.warn('Architecture comparison unavailable', error)); return; }
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
      if (k === 'walk-next') { if (S.walk >= mapWalk(TM).length - 1) { S.walk = -1; render(); } else walkTo(S.walk + 1); return; }
      if (k === 'walk-prev') { walkTo(Math.max(0, S.walk - 1)); return; }
      if (k === 'walk-stop') { S.walk = -1; render(); return; }
      if (['edit-question', 'new-question', 'style-decision', 'add-alt', 'edit-alt', 'choose', 'add-style', 'use-suggestion'].includes(k)) { e.stopPropagation(); onAct(k, a); return; }
      if (k === 'noop') return;
    }
    const card = e.target.closest('[data-card]');
    if (card && !e.target.closest('[data-sel]')) {
      const id = card.dataset.card, now = Date.now(), twice = lastClick.id === id && now - lastClick.t < 420;
      lastClick = {id, t: now};
      if (twice) { lastClick = {id: null, t: 0}; if (X(id) || Alt(id) || Drv(id)) setScope({kind: 'x', id}); return; }
      select(S.sel === id && !card.dataset.driver ? null : id, {driver: card.dataset.driver || null}); return;
    }
    const s = e.target.closest('[data-sel]');
    if (s && s.dataset.sel) { e.stopPropagation(); select(s.dataset.sel, {reveal: true}); return; }
    if (e.target.closest('.cm-stage') && !e.target.closest('.cm-heads,.cm-rail,.cm-zoom,.cm-key') && (S.sel || S.walk >= 0)) { S.walk = -1; select(null); }
  });
  listen(root, 'keydown', e => { if (NT.keydown(e)) return; if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-card]')) { e.preventDefault(); select(e.target.dataset.card, {driver: e.target.dataset.driver || null}); } });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !root?.isConnected || document.querySelector('dialog[open]')) return;
    const a = document.activeElement;
    if (a && a !== document.body && !root.contains(a)) return;
    if (a?.closest?.('select,details[open],input,textarea')) return;
    if (S.walk >= 0) { S.walk = -1; render(); }
    else if (S.sel) select(null);
    else if (scope().kind !== 'system') setScope({kind: 'system'});
    else if (document.body.classList.contains('cm-expanded')) root.querySelector('[data-dx="expand"]').click();
    else return;
    e.preventDefault();
  });
  root.addEventListener('pointerleave', () => { root.querySelector('.cm-tip').hidden = true; });
  window.addEventListener('resize', () => { if (!root?.isConnected) return; clearTimeout(bind._r); bind._r = setTimeout(() => { sizeModel(root, 'cm-expanded'); render(); }, 120); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!root?.isConnected || !L) return; clearTimeout(bind._ro); bind._ro = setTimeout(() => { const w = stage.box().w; if (Math.abs(w - (bind._w || 0)) > 24) { bind._w = w; fitPending = true; render(); } }, 90); }).observe(root.querySelector('.cm-stage'));
}
function tip(e) {
  const box = root.querySelector('.cm-tip'), t = e.target.closest?.('.dx-card,.dx-cell,.dx-ch,.dx-rh,.dx-foot,.nt-node');
  if (t?.dataset?.ntNode && root.contains(t)) { box.innerHTML = NT.tipHTML(t.dataset.ntNode); box.hidden = !box.innerHTML; if (!box.hidden) placeTip(box, e); return; }
  if (!t || !root.contains(t) || t.classList.contains('dx-cell') && !t.dataset.card) { box.hidden = true; return; }
  const id = t.dataset.card;
  let html = '';
  if (t.classList.contains('dx-cell') && t.dataset.driver && Alt(id)) { const e2 = Alt(id).effects[t.dataset.driver]; html = `<b>${esc(Alt(id).a.title)} · ${esc(t.dataset.driver)}</b>${esc(EFFECT[e2.effect][1] + (e2.reason ? ': ' + e2.reason : ''))}`; }
  else if (X(id)) html = `<b>${esc(refTitle(id))}</b>${esc(describeDecision(TM, id))}<small class="h">Double-click to focus on it</small>`;
  else if (Alt(id)) html = `<b>${esc(refTitle(id))}</b>${esc(describeAlternative(TM, id))}`;
  else if (Drv(id)) { const d = Drv(id); html = `<b>${esc(refTitle(id))}</b>${esc(d.priority + ', ' + targetText(d) + '. Weighed by ' + TM.decisions.filter(x => x.drivers.includes(id)).map(x => x.id).join(', ') + '.')}<small class="h">Double-click for only its decisions</small>`; }
  else if (id?.startsWith('STY:') || id?.startsWith('SUG:')) { const s = STYLES.find(x => id.endsWith(x.id)); html = s ? `<b>${esc(s.name)} · SA Playbook</b>${esc(STYLE_KEY.caveat)}` : ''; }
  if (!html) { box.hidden = true; return; }
  box.innerHTML = html; box.hidden = false; placeTip(box, e);
}

export function tradeoffDebug() { return {S: {...S}, TM, F, L}; }
export {PATTERN_KEY, PRIORITIES, MX};
