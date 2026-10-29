// Chapter 11 Model — the review desk. (mountDesk, the desk under Validate, stays for the transition; Validate no
// longer reaches it: the desk is reached from Chapter 11's checks.)
//
// Table first (round 3, C): each view opens as a table that reads in words — Vitals as a sortable table of part,
// vital, recorded value, target and state; What it takes as a two-column specification sheet, the objective and then
// each part with what it takes; Trace as one row per requirement with its path as chips and the first broken link
// named.
// One switcher, as on every chapter model (round 3, D): Diagram (Chapter 11's design-rationale picture in the standard
// notation) · Vitals · What it takes · Trace · Running board · Layers · Table · Matrix (requirement × running part) ·
// Whole design. The shared views are drawn by notation-view.js on the desk's stage and companion; the desk opens on
// Vitals and remembers the view last read.
// The Running board (round 4, C) is one more picture of the one model, in place of the old board graphic: the running
// parts drawn by the shared notation renderer (desk-layout.js builds the diagram; notation-layout.js arranges it and
// notation-svg.js draws it), inside the containers of where Chapter 10 places them, each with its state in words
// (to fix, to confirm, passing — read by rule from its vitals), joined to the components they run and the requirements
// those fulfil. Selecting an element selects the same record on the desk; the sidebar's layers filter it; Fit, the
// zoom, the overview and the Key are the kit's.
//
// Three views of the same reading of the design (desk-model.js):
// - Vitals: every running part as a patient on a monitor — availability, recovery, data loss,
//   latency, capacity, integrity, protection and observability, each a recorded value against a
//   recorded target. Plug a probe into a part to pin its chart to the desk; select a vital to read
//   the arithmetic, the playbook tactics that would move it and the chapter that changes it.
// - What it takes: an objective (the playbook's 100,000 concurrent users until the project records
//   its own) turned into a performance specification for every part, compared with Chapters 7 and 10.
// - Trace: each requirement followed to where it runs; a break in the thread is a gap.
// A probe on a decision reads its alternatives, patterns and tactics against the drivers, and what
// it reaches both ways; "Ask for review" records a change event that earlier and later chapters
// review in their own terms. Nothing here edits a chapter directly: a critical or silent vital comes
// with a drafted fix (desk-fixes.js) — the owning chapter's own commands, built from the desk's numbers
// — which can be previewed on the desk and is applied only through that chapter's change review.
// Round 25: the probe shows the decision reading in its own words (the lead and how firmly it holds, what a hard
// constraint rules out, what another alternative dominates), with the totals and the reading's note; it never chooses.
import {deskModel, TRACE_COLS, ANTI_FIX, describeTrace, decisionProbe, partReviewItems, capacityReviewItems, VITALS, VSTATE, fmtN} from './desk-model.js';
import {readingStanding} from './tradeoff-model.js';
import {READING_NOTE} from './decision-reading.js';
import {LOAD_BANDS, runningBoard, boardLayout, boardOpenKey, partStatus} from './desk-layout.js';
import {SCREEN_BUDGET, familyWord} from './figure-budget.js';
import {describeRow, vitalTactics, worstOf} from './desk-vitals.js';
import {ASSUMPTIONS, scaleReadings, EXAMPLE_LABEL, PLAYBOOK_EXAMPLE} from './desk-capacity.js';
import {specPanelHTML, antiPatternHTML} from './spec-panel.js';
import {catalogueRecord} from './design-reasoning.js';
import {specFor, reasoningFor} from './design-spec.js';
import {choiceSummaryHTML, choiceTableHTML, recordSuggestions} from './choice-ui.js';
import {suggestionCommands} from './product-choice.js';
import {modelChrome,modelStage, sizeModel, placeTip, drawerDialog, toolsHTML, nextFrame, companionHost, companionOf, isDocked, listen, releaseCompanion, announceObject} from './model-stage.js';
import {createNotation, liftParts, edgeLinesHTML, nodeLinesHTML} from './notation-view.js';
import {modelHeaderHTML, ownViews} from './instrument-tray.js';
import {stripToLayers, describeNode, describeEdge, styleOf} from './notation-model.js';
import {svgParts, legendData, diagramText, SVG_STYLE} from './notation-svg.js';
import {NL} from './notation-layout.js';
import {iconSVG, markerRef} from './notation-palette.js';
import {layerSummary, hiddenNoteHTML} from './layers-view.js';
import {mountBrainContext} from './brain-context-ui.js';
import {projectPreferenceKey, projectURL, currentProject as project, reportFailure, onProjectSwitch, scopedProject} from './project-context.js';
import {fixDrafts, compose, simulate, deskDiff, describeCommands, describeEffect, valuesOf, MAX_COMMANDS, CHAPTER_NAMES} from './desk-fixes.js';
import {SOL, solLoad, solConnected, solEntry, solPrepare, solCancel, solSend, solRecord, solBadge, solOutcomes, pendingHTML, assessmentHTML, askHTML, solStatusLine, updateSolPromptControls} from './brain-reasoning-ui.js';
import {VERDICTS, MAX_DECISIONS} from './brain-reasoning.js';
import {playbookAvailable} from './model-knowledge.js';
import {projectHasRecords, CHECK_WORDS, CHECK_GLYPHS} from './readiness-model.js';
import {lensCompanion} from './domain-lens.js';
import {esc,safeUrl} from './html-escape.js';
import {requirementGroups, groupsOf} from './requirement-groups.js';
import {list, num, readStoredObject} from './util.js';
// Round 24 (D-24-08): the desk reads the shell's module scope (project-context.js scopedProject: the saved document without one).

const PATHS = {vitals: 'M3 12h4l2-6 4 12 2-6h6', load: 'M4 20V10M10 20V4M16 20v-7M22 20H2', trace: 'M4 6h4v4H4zM10 14h4v4h-4zM16 6h4v4h-4zM8 8h8M12 10v4', probe: 'M9 3v6l-4 8a3 3 0 0 0 3 4h8a3 3 0 0 0 3-4l-4-8V3M8 3h8', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', panel: 'M3 4h18v16H3zM15 4v16', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', play: 'M7 4v16l13-8z', review: 'M4 4h16v12H8l-4 4zM8 9h8M8 12h5', save: 'M5 3h11l3 3v15H5zM8 3v6h7V3M8 21v-7h8v7', reset: 'M4 4v6h6M4 10a8 8 0 1 1 2 6', board: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z', diagram: 'M3 4h7v6H3zM14 14h7v6h-7zM6.5 10v4h11v-4M17.5 14V10'};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[n] || PATHS.vitals}"/></svg>`;
// The desk's own views are the instrument tray's (instrument-tray.js, round 11): id, label and question.
const VIEWS = ownViews(11).map(v => [v.id, v.label, v.q]);
const VERDICT = {ok: 'Meets', warn: 'Check', bad: 'Short', none: 'Not recorded'};
const VERDICT_GLYPH = {ok: '✓', warn: '▲', bad: '✕', none: '⋯'};
// The columns each table can be sorted by.
const SORTS = {vitals: ['part', 'vital', 'recorded', 'target', 'state'], trace: ['req', 'break']};
const SEVERITY = {bad: 4, none: 3, warn: 2, ok: 1, na: 0};
const KIND = {service: 'Service', worker: 'Worker', adapter: 'Adapter', gateway: 'Gateway', identity: 'Identity', store: 'Store', queue: 'Queue', cache: 'Cache', telemetry: 'Telemetry', backup: 'Backup', recovery: 'Recovery', cluster: 'Cluster', external: 'Outside'};
const MAX_PROBES = 4;

// The notation (notation-view.js) draws Diagram and the shared views, as on every chapter model.
let NT = null;
const NT_VIEWS = ['diagram', 'layers', 'table', 'cross', 'whole'];
let root = null, DM = null, lastKey = '', L = null, stage = null, fitPending = true, lastClick = {id: null, t: 0}, mode = 'model', busy = false, flash = '';
const freshView = () => ({view: 'vitals', env: null, sel: null, probes: [], panel: true, focus: null, walk: -1, filter: 'all', explore: null, preview: null, values: {}, pulse: null, solUsed: {}, sortV: {key: 'state', dir: 'desc'}, sortT: {key: 'req', dir: 'asc'}, showNa: false});
let S = freshView();
// The desk as recorded (BASE), its drafted fixes (FX), and — while a draft is previewed — the desk as
// it would read with it (PREV); DM is whichever the desk is showing.
let BASE = null, FX = null, PREV = null;
const effects = new Map();
const pref = () => projectPreferenceKey('aiw-review-desk-v1');
function save() { try { localStorage.setItem(pref(), JSON.stringify({view: S.view, env: S.env, probes: S.probes, panel: S.panel, filter: S.filter, explore: S.explore, sortV: S.sortV, sortT: S.sortT})); } catch { /* preferences are optional */ } }
// This browser's preferences for the desk in the project on screen (read when the desk is first drawn, and again when
// another project opens in place).
function restorePreferences() {
  const v = readStoredObject(pref());
  if (allViews().includes(v.view)) S.view = v.view;
  if (typeof v.env === 'string') S.env = v.env;
  if (Array.isArray(v.probes)) S.probes = v.probes.filter(x => typeof x === 'string').slice(0, MAX_PROBES);
  if (typeof v.panel === 'boolean') S.panel = v.panel;
  if (['all', 'critical', 'probed'].includes(v.filter)) S.filter = v.filter;
  if (v.explore && typeof v.explore === 'object') S.explore = v.explore;
  if (v.sortV && SORTS.vitals.includes(v.sortV.key) && ['asc', 'desc'].includes(v.sortV.dir)) S.sortV = {key: v.sortV.key, dir: v.sortV.dir};
  if (v.sortT && SORTS.trace.includes(v.sortT.key) && ['asc', 'desc'].includes(v.sortT.dir)) S.sortT = {key: v.sortT.key, dir: v.sortT.dir};
}
// Another project opened in place (round 4, A): the desk leaves and forgets the last project's view, probes, filter,
// explored objective, sorting and selection, its model, drafted fixes and their simulated effects, then reads the new
// project's preferences; the next mount rebuilds from the new project's document. The picture's own choices are reset
// by its notation (notation-view.js).
onProjectSwitch(() => { leaveChapterModel(); leaveDesk(); S = freshView(); DM = null; BASE = null; FX = null; PREV = null; lastKey = ''; effects.clear(); fitPending = true; flash = ''; if (root) restorePreferences(); });

// ---------------------------------------------------------------- mount / leave

function hostOf() { return document.querySelector('.studio > .stage.tab-content'); }
// On Chapter 11's Model the companion is the frame's own column beside the stage, as for every chapter model; under
// Validate (mountDesk, kept for the transition) it stays the desk's own panel.
const companion = () => (mode === 'model' ? companionHost(root) : null) || root.querySelector('.cm-panel');
const companionNow = () => (root ? companionOf(root) : null) || root?.querySelector('.cm-panel') || null;
const docked = () => !!root && isDocked(root);
const on = (type, fn, opts) => listen(root, type, fn, opts);
const release = () => { if (root) releaseCompanion(root); };
// The views the notation draws on the desk's stage (Diagram and the shared views), the views drawn on the stage at all
// (those and the Running board), and every view the switcher offers.
const diagramView = () => NT_VIEWS.includes(S.view);
const stageView = () => diagramView() || S.view === 'board';
const ownView = v => VIEWS.some(([id]) => id === v);
const allViews = () => [...VIEWS.map(([id]) => id), ...NT_VIEWS];
function ensureRoot() {
  if (root) return;
  root = document.createElement('section'); root.className = 'cm dk'; root.setAttribute('aria-label', 'Review desk');
  root.innerHTML = shell();
  // The stage carries only pictures (Diagram, the shared views, the Running board): no sticky heads, no rail.
  stage = modelStage(root, {headHeight: () => 0, railWidth: () => 0, onHover: tip, floor: () => (window.innerWidth < 700 ? 0.86 : 1)});
  stage.bind();
  // Diagram and the shared views share the desk's stage, companion and selection (round 3, D).
  // The Running board is the desk's own picture in the same stage: the notation's reading under the pointer reads it.
  NT = createNotation({chapter: 11, root, stage, project: scopedProject, onSelect: id => select(id), ownPicture: () => (S.view === 'board' && RB ? {D: RB.D, L: RB.L, full: RB.full, sel: boardSel(), selEdge: boardEdge(), own: true} : null)});
  NT.addViews('dk');
  NT.onChange = full => { if (full) fitPending = true; render(); };
  NT.bindDrag();
  bind();
  restorePreferences();
}
function place(host) { if (host.firstElementChild !== root) host.prepend(root); }
export function mountChapterModel(selection) {
  const p = project(), host = document.querySelector('.studio > .stage.tab-content');
  if (!p || !host) return;
  mode = 'model'; ensureRoot();
  { const mv = window.aiwChapterModels?.takeView?.(11); S.view = mv ? NT.settle(mv, 'link') : NT.settle(S.view); }
  place(host);
  document.body.classList.remove('dk-validate');
  document.body.classList.add('cm-active');
  open(scopedProject(), selection, 11);
}
export function leaveChapterModel() { if (mode !== 'model') return; document.body.classList.remove('cm-active', 'cm-expanded'); release(); root?.remove(); }
// Validate's third mode: the same desk beneath the Validate switch, on any chapter.
export function mountDesk(selection) {
  const p = project(), host = hostOf();
  if (!p || !host) return;
  if (mode === 'model') release();
  mode = 'validate'; ensureRoot();
  place(host);
  document.body.classList.add('dk-validate');
  open(scopedProject(), selection, Number(selection?.chapter) || Number(new URLSearchParams(location.search).get('chapter')) || 11);
}
export function leaveDesk() { if (mode !== 'validate') return; document.body.classList.remove('dk-validate', 'cm-expanded'); release(); root?.remove(); }
function open(p, selection, chapter) {
  root.classList.toggle('dk-in-validate', mode === 'validate');
  root.querySelector('.cm-title small').textContent = mode === 'validate' ? `Chapter ${chapter} · Validate` : 'Chapter 11 · Model';
  const first = !DM;
  rebuild(p);
  solLoad(p.id, () => { if (root?.isConnected) render(); });
  if (first) { S.sel = null; const want = mode === 'model' && window.aiwChapterModels ? window.aiwChapterModels.takeLink(11) : null; if (want && known(want)) { S.sel = want; nextFrame(() => revealSelection()); } }
  render();
  sizeModel(root, 'cm-expanded');
}
const NO_FIXES = {drafts: [], judgements: [], byId: new Map(), forCell: () => [], judgementFor: () => null};
function rebuild(p = scopedProject()) {
  const key = JSON.stringify([S.explore || null, S.env]);
  if (!(BASE && BASE.p === p && key === lastKey)) {
    try { BASE = deskModel(p, {objective: S.explore, envId: S.env}); S.env = BASE.env; lastKey = JSON.stringify([S.explore || null, S.env]); } catch (e) { console.error('Review desk', e); BASE = null; }
    FX = null; PREV = null; effects.clear();
    // A real change to the design ends a preview: the drafts are read again from what is recorded.
    if (S.preview && S.preview.base !== p) S.preview = null;
  }
  // Drafted treatments are read only when a person opens a treatment or previews one. The board and other
  // read-only pictures can open from the same desk model without constructing every candidate fix first.
  if (BASE && S.preview) fixes();
  DM = BASE;
  if (BASE && S.preview) {
    const ids = S.preview.ids.filter(id => FX.byId.has(id)), pk = JSON.stringify([ids, ids.map(id => S.values[id] || null)]);
    if (!ids.length) S.preview = null;
    else {
      if (!PREV || PREV.key !== pk) { try { PREV = {key: pk, sim: simulate(BASE.p, ids.map(id => FX.byId.get(id)), S.values, {before: BASE, read: doc => deskModel(doc, {objective: S.explore, envId: S.env})})}; } catch (e) { console.error('Review desk preview', e); PREV = null; S.preview = null; } }
      if (PREV) DM = PREV.sim.after;
    }
  }
  if (DM) { S.probes = S.probes.filter(known); if (S.sel && !known(S.sel)) S.sel = null; }
}
const fixes = () => {
  if (!FX && BASE) { try { FX = fixDrafts(BASE); } catch (e) { console.error('Review desk fixes', e); FX = NO_FIXES; } }
  return FX || NO_FIXES;
};
// What one draft (with its knob values) does on the desk, kept until the design changes.
function effectOf(d) {
  const k = d.id + JSON.stringify(S.values[d.id] || null);
  if (!effects.has(k)) { try { effects.set(k, simulate(BASE.p, [d], S.values, {before: BASE})); } catch (e) { effects.set(k, {commands: [], changed: [], moved: [], revealed: [], errors: [{id: d.id, message: e.message}], system: []}); } }
  return effects.get(k);
}
const Row = id => DM?.rows.find(r => r.id === id) || null;
const Cap = id => DM?.cap.rows.find(r => r.id === id) || null;
const Dec = id => (project()?.decisions?.records || []).find(d => d.id === id) || null;
const Req = id => DM?.trace.find(t => t.id === id) || null;
function known(id) {
  if (!id || !DM) return false;
  if (id.startsWith('C:')) return !!Row(id.split(':')[1]);
  if (id.startsWith('F:')) return !!fixes().byId.get(id.slice(2));
  return !!(Row(id) || Cap(id) || Dec(id) || Req(id) || DM.rows.some(r => r.assetId === id) || RB?.D.nodes.some(n => n.id === id));
}

// ---------------------------------------------------------------- shell

function shell() {
  return `${modelHeaderHTML(11, 'dk', `<label class="dk-environment" hidden><span>Environment</span><select data-dk-env aria-label="Review environment"></select></label><button type="button" class="cm-btn" data-dk="ask" title="Ask the records behind what you are reading to review it">${icon('review')}<span>Ask for review</span></button>
    <button type="button" class="cm-btn icon" data-dk="expand" aria-pressed="false" aria-label="Expand the desk" title="Expand">${icon('expand')}</button>
    <button type="button" class="cm-btn icon" data-dk="panel" aria-pressed="true" aria-label="Show the companion panel" title="Companion">${icon('panel')}</button>`, 'Review desk')}
  <div class="cm-bar" data-model-slot="commands"><nav class="cm-crumbs" aria-label="Model scope"></nav><div class="dk-controls" role="group" aria-label="Desk controls"></div><button type="button" class="cm-state-more" data-dk="state-more" aria-expanded="false" hidden>More</button></div>
  <div class="cm-banner" data-model-slot="notice"></div>
  <div class="cm-body" data-model-slot="content"><div class="dk-content"><div class="dk-monitor" role="group" aria-label="System vitals"></div><p class="dk-reading-key"><b>Design readings, not live measurements.</b> Critical: a target or rule is missed · Watch: a risk to examine · Normal: recorded facts fit the rule · No signal: facts or evidence are missing · Not carried: does not apply.</p><section class="dk-objective" aria-label="Review objective"></section><div class="dk-sheet" aria-live="off"></div></div><div class="cm-stage" tabindex="0" aria-label="Review desk picture. Drag or scroll to move; Ctrl or Command and scroll to zoom.">
    <div class="cm-world"><svg class="cm-svg" aria-hidden="true"></svg><div class="cm-html"></div></div>
    <div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div>
    
    
  </div><aside class="cm-panel" aria-label="Companion"></aside></div>
  <footer class="cm-walk" data-model-slot="status" aria-label="Step through what to look at"><div class="cm-walk-in"></div><p class="cm-state" role="status" aria-live="polite"></p>${toolsHTML('dk')}</footer><div class="cm-tip" role="tooltip" hidden></div>`;
}

// ---------------------------------------------------------------- render

const chapterURL = (ch, id) => projectURL(`/?chapter=${ch}&tab=model${id ? '&' + (ch === 1 ? 'artefact' : ch === 2 ? 'driver' : ch === 3 ? 'decision' : 'object') + '=' + encodeURIComponent(id) : ''}`);
const visibleRows = () => !DM ? [] : S.filter === 'critical' ? DM.rows.filter(r => r.vitals.some(v => v.state === 'bad')) : S.filter === 'probed' ? DM.rows.filter(r => S.probes.includes(r.id)) : DM.rows;

function render() {
  if (!root) return;
  if (!DM) { root.querySelector('.cm-html').innerHTML = '<p class="cm-empty">The review desk could not read this project.</p>'; return; }
  const envField = root.querySelector('.dk-environment');
  // Shared notation views have their own project-wide scope; the desk selector applies to its
  // own Vitals, What it takes, Trace and Running board projections.
  envField.hidden = DM.envs.length < 2 || diagramView();
  if (!envField.hidden) envField.querySelector('select').innerHTML = DM.envs.map(e => `<option value="${esc(e.id)}"${e.id === DM.env ? ' selected' : ''}>${esc(e.title)}</option>`).join('');
  const nt = diagramView(), board = S.view === 'board';
  root.classList.remove('dk-v-vitals', 'dk-v-load', 'dk-v-trace', 'dk-v-board'); if (!nt) root.classList.add('dk-v-' + S.view);
  root.classList.toggle('dk-walking', S.walk >= 0 && !nt);
  root.classList.toggle('dk-table', !board && !nt);
  root.classList.toggle('nt-active', nt);
  companion();
  root.querySelector('.cm-body').classList.toggle('no-panel', !S.panel);
  root.querySelector('[data-dk="panel"]').setAttribute('aria-pressed', String(S.panel)); drawerDialog(root, '[data-dk="panel"]', S.panel);
  // Diagram and the shared views: the notation draws on the desk's stage; the desk keeps its chrome and companion.
  if (nt) {
    L = NT.render({sel: S.sel, view: S.view, viewW: stage.box().w});
    for (const k of ['.cm-heads-in', '.cm-rail-in', '.cm-corner']) root.querySelector(k).innerHTML = '';
    chromeDiagram(); panel(); walkBar(); modelChrome(root);
    stage.use(L, 'diagram|' + S.view + '|' + (NT.scene()?.id || '') + '|' + NT.arrangement());
    if (fitPending) { fitPending = false; NT.fit(); } else stage.clamp();
    stage.apply(); return;
  }
  if (board) { runningBoardView(); return; }
  // Table first: the desk's own views read as tables in words.
  sheet(highlight()); monitor(); chrome(); panel(); walkBar(); NT?.ownView(); modelChrome(root); fitPending = true;
}

// What the selection or the walk concerns.
function highlight() {
  const out = {on: false, rows: new Set(), cells: new Set(), vital: S.focus, ids: new Set()};
  if (S.walk >= 0) { const w = rounds()[S.walk]; if (w) { out.on = true; w.rows.forEach(id => out.rows.add(id)); out.vital = w.vital || null; w.ids?.forEach(id => out.ids.add(id)); } return out; }
  const s = S.sel;
  if (!s) return out;
  out.on = true;
  if (s.startsWith('C:')) { const [, id, v] = s.split(':'); out.rows.add(id); out.cells.add(id + ':' + v); out.vital = v; }
  else if (s.startsWith('F:')) { const d = fixes().byId.get(s.slice(2)); d?.rows.forEach(id => out.rows.add(id)); d?.aims.forEach(a => out.cells.add(a)); if (d && d.vital !== 'choice') out.vital = d.vital; }
  else if (Row(s)) out.rows.add(s);
  else if (Cap(s)) { out.ids.add(s); const r = DM.rows.find(r => r.assetId === s); if (r) out.rows.add(r.id); }
  else if (Req(s)) out.ids.add(s);
  else if (Dec(s)) { out.ids.add(s); const imp = decisionProbe(DM, s)?.implications; for (const x of [...(imp?.upstream || []), ...(imp?.downstream || [])]) out.ids.add(x.id); for (const r of DM.rows) if (out.ids.has(r.id) || out.ids.has(r.assetId)) out.rows.add(r.id); }
  else { out.ids.add(s); for (const r of DM.rows) if (r.assetId === s) out.rows.add(r.id); }
  return out;
}

// ---------------------------------------------------------------- the monitor

// A heartbeat line: one beat for each running part, its height and colour the state of that vital.
function ecg(states, w = 132, h = 30) {
  const n = Math.max(1, states.length), step = w / n, mid = h / 2, amp = {bad: 12, warn: 8, ok: 5, none: 0, na: 0};
  const segs = states.map((s, i) => { const x = i * step, a = amp[s] ?? 0; const d = a ? `M${x.toFixed(1)} ${mid}L${(x + step * 0.3).toFixed(1)} ${mid}L${(x + step * 0.45).toFixed(1)} ${(mid - a).toFixed(1)}L${(x + step * 0.6).toFixed(1)} ${(mid + a * 0.45).toFixed(1)}L${(x + step * 0.72).toFixed(1)} ${mid}L${(x + step).toFixed(1)} ${mid}` : `M${x.toFixed(1)} ${mid}L${(x + step).toFixed(1)} ${mid}`; return `<path class="${s}" d="${d}"/>`; });
  return `<svg class="dk-ecg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${segs.join('')}</svg>`;
}
function monitor() {
  const box = root.querySelector('.dk-monitor');
  if (S.view === 'load') {
    const C = DM.cap, O = C.objective, src = O.source;
    // Round 12 (G, GR-RUN-04): no load stated, no reading; the example only when the reader explores it, and labelled.
    if (C.noLoad) { box.innerHTML = `<div class="dk-tile none"><small>Objective</small><b>No load stated</b><em>no capacity reading until a person states the load</em></div><div class="dk-tile none"><small>Arrival rate</small><b>—</b><em>not computed</em></div>`; return; }
    const tiles = [
      ['Objective', C.objText, src.kind === 'playbook' ? 'the SA Playbook\'s example' : src.kind === 'driver' ? src.text : src.kind === 'review' ? 'saved for this review' : 'explored, not saved', src.kind === 'explore' || src.kind === 'playbook' ? 'warn' : 'ok'],
      ['Arrival rate', fmtN(C.lambda) + ' req/s', (O.kind === 'users' ? `${fmtN(O.assume.thinkSeconds)} s between requests` : 'at the entry') + (C.example ? ' · ' + EXAMPLE_LABEL : ''), 'ok'],
      ['Pods', fmtN(C.totals.pods), 'services and workers' + (C.example ? ' · ' + EXAMPLE_LABEL : ''), 'ok'],
      ['CPU · memory', `${fmtN(C.totals.vcpu, 1)} vCPU · ${fmtN(C.totals.mem, 1)} GiB`, 'requested', 'ok'],
      ['Cluster', `${fmtN(C.totals.nodes)} nodes`, `${fmtN(O.assume.nodeVcpu)} vCPU · ${fmtN(O.assume.nodeMemGiB)} GiB each` + (C.example ? ' · ' + EXAMPLE_LABEL : ''), 'ok'],
      ['Short', String(C.counts.bad + C.counts.warn), C.counts.bad + C.counts.warn ? 'parts the design cannot yet carry' : 'nothing short', C.counts.bad ? 'bad' : C.counts.warn ? 'warn' : 'ok'],
      ['No signal', String(C.counts.none), 'parts with nothing recorded to compare', C.counts.none ? 'none' : 'ok'],
      ['Product choices', `${[...DM.choices.values()].filter(x => x.revisit).length} to revisit`, `of ${DM.choices.size} with alternatives`, [...DM.choices.values()].some(x => x.revisit) ? 'warn' : 'ok']
    ];
    box.innerHTML = tiles.map(([k, v, s, st]) => `<div class="dk-tile ${st}"><small>${esc(k)}</small><b>${esc(v)}</b><em>${esc(s)}</em></div>`).join('');
    return;
  }
  const was = S.preview && PREV ? PREV.sim.system : null, pulsed = new Set([...(S.pulse || [])].map(k => k.split(':')[1]));
  // The capacity tile says "no load stated" whenever no load is stated, records or none (round 12, G, GR-RUN-04; U2-05).
  box.innerHTML = VITALS.map((v, i) => { const s = DM.system[i], w = was?.[i], moved = w && (w.from !== w.to || w.before?.text !== w.after?.text); return `<button type="button" class="dk-tile ${esc(s.state)}${S.focus === v.id ? ' on' : ''}${moved ? ' chg' : ''}${pulsed.has(v.id) ? ' pulse' : ''}" data-dk="focus" data-id="${esc(v.id)}" aria-pressed="${S.focus === v.id}" title="${esc('Design reading, not live telemetry. ' + v.q + ' ' + s.text + (moved ? ' — was ' + w.before.text : ''))}"><small>${esc(v.label)} · design</small><b>${esc(s.head)}</b>${ecg(DM.rows.map(r => r.vitals[i].state))}<em>${esc(s.text)}</em>${moved ? `<i class="dk-was-t ${esc(w.from)}">was ${esc(w.before.text)}</i>` : ''}</button>`; }).join('');
}

// Readings a preview changes (with the state they had), and readings an applied fix just changed.
function marks() {
  const chg = new Map(S.preview && PREV ? PREV.sim.changed.map(c => [c.row + ':' + c.vital, c.from]) : []);
  const drafted = new Set(fixes().drafts.flatMap(d => d.aims));
  return {chg, pulse: S.pulse || new Set(), drafted};
}
// One line on a part: the product in the design, and which way the drivers lean.
function choiceLine(C) {
  const name = id => C.options.find(o => o.option.id === id)?.option.product || id, cur = C.reading ? name(C.reading) : 'no product';
  const lean = C.leanRecorded || C.leanAll, how = C.leanRecorded ? 'recorded' : 'suggested';
  const text = !lean ? `${cur} · the drivers do not lean` : lean === C.reading ? `${cur} · the drivers lean to it (${how})` : `★ The drivers lean to ${name(lean)} (${how})`;
  return `<p class="dk-choice-l${C.revisit ? ' revisit' : ''}" title="${esc(text)}">${esc(text)}</p>`;
}
// ---------------------------------------------------------------- the running board (round 4, C)

// The picture, rebuilt only when the design the desk reads (a preview included) or the layers change — never for a
// selection, a hover or the camera. The layers are the connected model's (notation-view.js keys them so while the desk
// draws one of its own views), as for Layers, Table and Matrix.
let RB = null;
function board() {
  const layers = NT.layers(), open = S.boardWhole ? null : boardOpenKey(RB?.fold, boardSel()), key = layers.join() + '|' + (open || '') + (S.boardWhole ? '|whole' : '');
  if (RB && RB.dm === DM && RB.key === key) return RB;
  const full = runningBoard(DM), strip = stripToLayers(full, layers), {D, L: BL, fold} = boardLayout(strip, {project: DM.p, open, whole: !!S.boardWhole});
  const drawn = new Set(D.nodes.map(n => n.id));
  // The kit's vitals overlay: a ring in the state's colour and, beside it, how many vitals stand behind the word.
  const vitals = new Map(DM.rows.filter(r => drawn.has(r.id)).map(r => { const st = partStatus(r); return [r.id, {state: st.ring, count: st.behind || '', text: `${st.label}: ${st.text}`}]; }));
  RB = {dm: DM, key, layers, full, D, L: BL, vitals, fold, hidden: full.nodes.length - strip.nodes.length};
  return RB;
}
// What the board shows as selected: a vital reads as its part, a drafted fix as nothing.
const boardSel = () => { const s = S.sel; return !s || s.startsWith('F:') ? null : s.startsWith('C:') ? s.split(':')[1] : s; };
const boardEdge = () => { const id = NT?.state.selEdge; return id && RB?.D.edges.some(e => e.id === id) ? id : null; };
// A note on the stage, over the picture, while the layers hide part of it (the note the shared views carry).
function stageNote(html) { const st = root.querySelector('.cm-stage'); let el = st.querySelector(':scope > .nt-layer-note'); if (!html) { el?.remove(); return; } const t = document.createElement('template'); t.innerHTML = html; const fresh = t.content.firstElementChild; if (el) el.replaceWith(fresh); else st.append(fresh); }
function runningBoardView() {
  // The notation leaves any shared view it drew (a sheet, the anatomy) and keys the layers to the connected model.
  NT.ownView();
  const B = board(), {D, L: BL} = B, p = project(), sel = boardSel(), shown = sel && D.nodes.some(n => n.id === sel) ? sel : null;
  const svg = root.querySelector('.cm-svg'), world = root.querySelector('.cm-world'), html = root.querySelector('.cm-html');
  L = BL;
  for (const k of ['.cm-heads-in', '.cm-rail-in', '.cm-corner']) root.querySelector(k).innerHTML = '';
  world.style.width = BL.W + 'px'; world.style.height = BL.H + 'px';
  svg.setAttribute('width', BL.W); svg.setAttribute('height', BL.H); svg.setAttribute('viewBox', `0 0 ${BL.W} ${BL.H}`);
  svg.style.width = BL.W + 'px'; svg.style.height = BL.H + 'px'; svg.style.maxWidth = 'none';
  const parts = D.nodes.filter(n => n.type === 'runtime').length;
  svg.removeAttribute('aria-hidden'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `Running board: ${parts} running part${parts === 1 ? '' : 's'}, ${D.nodes.length - parts} other element${D.nodes.length - parts === 1 ? '' : 's'}, ${D.edges.length} relationship${D.edges.length === 1 ? '' : 's'}`);
  const P = svgParts(D, BL, {prefix: 'dkb', sel: shown, selEdge: boardEdge(), interactive: true, vitals: B.vitals}), lift = liftParts(P.lift);
  // Round 10 (N6): the lift (the whole route of the selected and lit relationships) over the lines and under the elements,
  // its end rings over the elements.
  svg.innerHTML = `<style>${SVG_STYLE}</style>${P.defs}${P.descs}${P.bands}${P.groups}${P.edges}${lift.under}${P.nodes}${lift.over}${P.hits}`;
  const H = D.header, env = (p?.runtime?.environments || []).find(e => e.id === D.environmentId);
  const cell = (k, v) => (v ? `<span><small>${esc(k)}</small>${esc(v)}</span>` : '');
  html.innerHTML = `<div class="nt-header dk-bhead" style="left:${BL.header.x}px;top:${BL.header.y}px;width:${BL.header.w}px;height:${BL.header.h}px"><b>Running board</b>${cell('Model', H.model)}${cell('Environment', env?.title)}${cell('Version', H.version)}</div>`
    + (D.notes.length ? `<div class="nt-notes dk-bnotes" style="left:${NL.LEFT}px;top:${BL.notesY ?? BL.H - 30}px">${D.notes.map(t => `<p>${esc(t)}</p>`).join('')}</div>` : '')
    + (!D.nodes.length && B.full.nodes.length ? `<div class="cm-empty-card" style="left:${NL.LEFT + 20}px;top:${NL.TOP + 20}px"><b>Every layer of this picture is hidden</b><p>${B.full.nodes.length} element${B.full.nodes.length === 1 ? '' : 's'} stand in layers switched off in the sidebar.</p><button type="button" class="cm-btn" data-nt="layers-all">Show every layer</button></div>` : '')
    + (!B.full.nodes.length ? `<div class="cm-empty-card" style="left:${NL.LEFT + 20}px;top:${NL.TOP + 20}px"><b>Nothing runs yet</b><p>Chapter 10 records each running part and where it is placed; the board draws them here.</p><a class="btn" href="${esc(projectURL('/?chapter=10&tab=work'))}">Open Chapter 10 Work →</a></div>` : '');
  stageNote(hiddenNoteHTML(B.hidden)); boardNote(B);
  stage.overview?.({W: BL.W, H: BL.H, groups: BL.groups, boxes: BL.nodes.map(b => ({x: b.x, y: b.y, w: b.w, h: b.h, cls: b.id === shown ? 'sel' : ''}))});
  try { window.aiwSetModelLayers?.(B.layers, {...layerSummary({chapter: 11, view: 'board', picture: 'Running board', full: B.full, D, layers: B.layers}), model: 'board'}); } catch { /* the sidebar is optional */ }
  chrome(); panel(); walkBar(); modelChrome(root);
  stage.use(BL, 'board|' + B.key);
  if (fitPending) { fitPending = false; NT.fit(); } else stage.clamp();
  stage.apply();
}
// Each part's state, in the words Validate and Output use, with their glyphs.
const stateWord = (st, n = null, words = null) => `<span class="rv-word ${esc(st)}"><i aria-hidden="true">${CHECK_GLYPHS[st]}</i> ${n == null ? '' : esc(n) + ' '}${esc(words || CHECK_WORDS[st])}</span>`;
function boardCounts() { const n = {fix: 0, confirm: 0, pass: 0}; for (const r of DM.rows) n[partStatus(r).status]++; return n; }
// The Key of the picture: the states in words, then the element kinds, containers, relationships and marks drawn
// (the kit's legend data, in the shared Key's form).
function boardLegendHTML() {
  const D = board().D, K = legendData(D, board().L);
  const line = st => `<svg width="44" height="12" aria-hidden="true"><path d="M3 6H36" fill="none" stroke="${st.stroke}" stroke-width="1.4"${st.dash ? ` stroke-dasharray="${st.dash}"` : ''}${st.head !== 'none' ? ` marker-end="${markerRef('dkb', st.head, st.stroke)}"` : ''}${st.tail !== 'none' ? ` marker-start="${markerRef('dkb', st.tail, st.stroke)}"` : ''}/></svg>`;
  const se = boardEdge() && D.edges.find(e => e.id === boardEdge());
  return (se ? `<h5 aria-level="4">Selected relationship</h5><p class="nt-selrel">${line(styleOf(se.kind))}${esc(describeEdge(D, se.id))}</p>` : '')
    + `<h5 aria-level="4">State of a running part</h5><p>${stateWord('fix')} a vital reads critical</p><p>${stateWord('confirm')} a vital is to watch or gives no signal</p><p>${stateWord('pass')} every vital carried is within its target</p><p class="cm-muted">The ring says the same; the number is how many vitals stand behind the word.</p>`
    + `<h5 aria-level="4">Elements</h5>${K.elements.map(el => `<p><i class="nt-k nt-${el.family}">${iconSVG(el.family)}</i>${esc(el.kind === 'placement' ? 'Running part (placement)' : el.kicker)}${el.count > 1 ? ` <small>×${el.count}</small>` : ''}</p>`).join('') || '<p>Nothing drawn.</p>'}${K.groups.length ? `<p><i class="nt-k group"></i>${esc(K.groups.map(g => g.label).join(', '))}</p>` : ''}`
    + (K.relationships.length ? `<h5 aria-level="4">Relationships</h5>${K.relationships.map(r => `<p>${line(r.style)}${esc(r.kinds.map(k => k.label).join(', '))}<small> · ${esc(r.title.split(' · ')[1] || r.title)}</small></p>`).join('')}` : '')
    + (K.marks.length ? `<h5 aria-level="4">Marks</h5>${K.marks.map(m => `<p><i class="nt-k nt-m-${m.id}"></i>${esc(m.text)}</p>`).join('')}` : '')
    + '<p class="cm-muted">Every element is a saved record; where it stands is the arrangement’s, never a fact.</p>';
}
// The companion with nothing selected: the parts by state, then where they run.
function boardOverview() {
  const n = boardCounts(), B = board(), by = st => DM.rows.filter(r => partStatus(r).status === st);
  const link = st => r => `<button type="button" class="cm-link${st === 'fix' ? ' warn' : ''}" data-sel="${esc(r.id)}">${esc(r.ref)} ${esc(r.title)} · ${esc(partStatus(r).text)}</button>`;
  const listOf = st => { const rs = by(st); return rs.length ? `<h5 aria-level="4">${esc(CHECK_WORDS[st][0].toUpperCase() + CHECK_WORDS[st].slice(1))} · ${rs.length}</h5><div class="dk-links">${rs.slice(0, 3).map(link(st)).join('')}${more('board:' + st, rs.slice(3).map(link(st)).join(''), `More · ${rs.length - 3}`)}</div>` : ''; };
  const places = B.full.groups.filter(g => g.kind !== 'environment').map(g => { const k = B.full.nodes.filter(x => x.group === g.id).length; return `<li><b>${esc(g.title)}</b> · ${k} running part${k === 1 ? '' : 's'}${g.sub ? ` <small>${esc(g.sub)}</small>` : ''}</li>`; }).join('');
  return `<section class="cm-spec"><h4 aria-level="3">Running board<span>${DM.rows.length} part${DM.rows.length === 1 ? '' : 's'}</span></h4><p class="dk-bsum">${stateWord('fix', n.fix)}${stateWord('confirm', n.confirm)}${stateWord('pass', n.pass)}</p><p class="cm-muted">Read by rule from each part's vitals; nothing here approves or changes the design.</p>${listOf('fix')}${listOf('confirm')}${listOf('pass')}${places ? `<h5 aria-level="4">Where they run</h5><ul class="dk-places">${places}</ul>` : ''}</section>`;
}
// A part selected on the board: its state in words above its reading.
function boardPartHTML(row) { const st = partStatus(row); return `<section class="dk-bstate"><p>${stateWord(st.status, null, st.label)} <b>${esc(row.ref)} ${esc(row.title)}</b></p><p class="cm-muted">${esc(st.text[0].toUpperCase() + st.text.slice(1))}. ${esc(describeNode(board().full, row.id))}</p></section>`; }
// A relationship selected on the board.
// Round 12 (G, GR-FIG-11): a line between groups on the board stands for the relationships between their members; the
// companion lists them (at most 40, each a button that opens the group its source stands in), as the chapter pictures do.
function boardMembersHTML(e) {
  const full = board().full, ids = new Set(e.fold.members || []), items = full.edges.filter(x => ids.has(x.id));
  return `<h5 aria-level="4">It stands for ${items.length} relationship${items.length === 1 ? '' : 's'}</h5><div class="dk-links nt-fold-members">${items.slice(0, 40).map(x => `<button type="button" class="cm-link" data-dk="board-member" data-id="${esc(x.id)}">${esc(describeEdge(full, x.id))}</button>`).join('')}${items.length > 40 ? `<p class="cm-muted">and ${items.length - 40} more; open either group to see them.</p>` : ''}</div>`;
}
// The board's note on the stage while it is larger than the screen's budget: grouped (with Show every element) or whole
// (with Group them again). It stands over the stage's top edge (data-cm-inset), as a chapter picture's note does.
function boardNote(B) {
  const st = root.querySelector('.cm-stage'); if (!st) return;
  let el = st.querySelector(':scope > .nt-fold-note');
  const big = B.full.nodes.length > SCREEN_BUDGET.nodes, plural = (n, w) => `${n.toLocaleString('en-GB')} ${w}${n === 1 ? '' : 's'}`;
  if (S.view !== 'board' || !big || (!B.fold && !S.boardWhole)) { el?.remove(); return; }
  const parts = B.D.nodes.filter(n => n.type === 'runtime').length, groups = B.fold ? B.fold.groups.filter(g => g.count > 1).length : 0;
  const html = S.boardWhole ? `<b>Every element drawn</b> ${plural(B.D.nodes.length, 'element')}, ${plural(B.D.edges.length, 'relationship')}<button type="button" data-dk="board-group">Group them again</button>`
    : `<b>Grouped by ${esc(B.fold.by.filter(f => f !== 'zone').map(f => familyWord(f, true)).join(', ') || 'kind')}</b> ${plural(parts, 'running part')} kept, ${plural(B.fold.total?.nodes ?? B.full.nodes.length, 'element')} in all · ${plural(groups, 'group')} · select a group to open it<button type="button" data-dk="board-all">Show every element</button>`;
  if (!el) { el = document.createElement('div'); el.className = 'nt-fold-note dk-board-note'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Grouped picture'); el.dataset.cmInset = ''; st.append(el); }
  if (el.innerHTML !== html) el.innerHTML = html;
  const ln = st.querySelector(':scope > .nt-layer-note'), at = ln ? ln.offsetTop + ln.offsetHeight + 6 + 'px' : '';
  if (el.style.top !== at) el.style.top = at;
}
function boardEdgeHTML() {
  const id = boardEdge(); if (!id) return '';
  const D = board().D, e = D.edges.find(x => x.id === id), st = styleOf(e.kind), name = x => { const n = D.nodes.find(y => y.id === x); return n ? (n.ref && !n.fullTitle.startsWith(n.ref) ? n.ref + ' ' : '') + n.fullTitle : x; };
  return `<section class="cm-spec nt-relspec" aria-live="polite"><h4 aria-level="3">Selected relationship · ${esc(st.family[0].toUpperCase() + st.family.slice(1))}</h4><p>${esc(describeEdge(D, id))}</p><dl class="cm-dl"><div><dt>From</dt><dd>${esc(name(e.from))}</dd></div><div><dt>To</dt><dd>${esc(name(e.to))}</dd></div><div><dt>Word</dt><dd>${esc(e.fullLabel || e.label)}</dd></div><div><dt>ArchiMate</dt><dd>${esc(st.archimate)}</dd></div></dl>${e.fold ? boardMembersHTML(e) : `<p class="cm-muted">${e.kind === 'serves' ? 'Read from the records: the component needs a capability the platform part realizes.' : e.kind === 'fulfils' ? 'Read from the records: the component realizes a responsibility that fulfils the requirement.' : 'Read from the records: the runtime plan operates the component.'}</p>`}${edgeLinesHTML(D, board().L, id)}<p class="nt-actions"><button type="button" class="cm-btn" data-dk="edge-clear">Clear the relationship</button></p></section>`;
}
// Round 10 (N6): the lines a selected element of the board shares (its serves fan, say), each relationship a button.
function boardLinesHTML() { const s = boardSel(), B = board(); return s && B.D.nodes.some(n => n.id === s) ? nodeLinesHTML(B.D, B.L, s) : ''; }
function boardTip(id) {
  const D = board().full, n = D.nodes.find(x => x.id === id); if (!n) return '';
  const row = Row(id), st = row ? partStatus(row) : null;
  return `<b>${esc(n.fullTitle || n.title)}${st ? ` · ${esc(st.label)}` : ''}</b>${esc(describeNode(D, id))}${st ? ` ${esc(st.text[0].toUpperCase() + st.text.slice(1))}.` : ''}<small class="h">Click or Enter to read it in the companion</small>`;
}
// The keyboard on the board: Enter or Space reads an element or a relationship; the arrow keys move to the nearest
// element in that direction (the board keeps no pins: where an element stands is the arrangement's).
function boardKey(e) {
  if (S.view !== 'board') return false;
  const hit = e.target.closest?.('.nt-hit');
  if (hit && root.contains(hit) && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleBoardEdge(hit.dataset.ntEdge); nextFrame(() => root.querySelector(`.nt-hit[data-nt-edge="${CSS.escape(hit.dataset.ntEdge)}"]`)?.focus()); return true; }
  const n = e.target.closest?.('.cm-svg .nt-node'); if (!n || !root.contains(n)) return false;
  const id = n.dataset.ntNode;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(id); nextFrame(() => root.querySelector(`.cm-svg [data-nt-node="${CSS.escape(id)}"]`)?.focus({preventScroll: true})); return true; }
  const dir = {ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1]}[e.key];
  if (dir) {
    e.preventDefault();
    const bs = board().L.nodes, a = bs.find(b => b.id === id); if (!a) return true;
    const c = b => [b.x + b.w / 2, b.y + b.h / 2], [ax, ay] = c(a);
    const next = bs.filter(b => b.id !== id).map(b => { const [bx, by] = c(b), along = (bx - ax) * dir[0] + (by - ay) * dir[1], across = Math.abs((bx - ax) * dir[1]) + Math.abs((by - ay) * dir[0]); return {b, along, score: along + 2 * across}; }).filter(x => x.along > 4).sort((x, y) => x.score - y.score)[0];
    if (next) { const el = root.querySelector(`.cm-svg [data-nt-node="${CSS.escape(next.b.id)}"]`); el?.focus({preventScroll: true}); stage.reveal(next.b.x, next.b.y, next.b.w, next.b.h); }
    return true;
  }
  return e.key === 'Delete' || e.key === 'Backspace';
}
function toggleBoardEdge(id) {
  const next = NT.state.selEdge === id ? null : id;
  NT.state.selEdge = next;
  if (next && S.sel) select(null); else render();
}

// ---------------------------------------------------------------- the tables (table first)

// Re-render the sheet without taking the keyboard from the row or chip it was on.
function sheet(hl) {
  const box = root.querySelector('.dk-sheet'), a = document.activeElement, mine = a && box.contains(a) ? a : null;
  const key = mine ? (mine.dataset.card ? '[data-card="' + CSS.escape(mine.dataset.card) + '"]' : mine.dataset.sel ? '[data-sel="' + CSS.escape(mine.dataset.sel) + '"]' : mine.dataset.dk === 'sort' ? '[data-dk="sort"][data-id="' + CSS.escape(mine.dataset.id) + '"]' : mine.dataset.dk === 'na-toggle' ? '[data-dk="na-toggle"]' : null) : null;
  const top = box.scrollTop, left = box.scrollLeft;
  box.innerHTML = S.view === 'load' ? loadSheet(hl) : S.view === 'trace' ? traceTable(hl) : vitalsTable(hl);
  box.scrollTop = top; box.scrollLeft = left;
  const again = key ? box.querySelector(key) : null;
  rove(again?.matches('tr[data-card]') ? again : box.querySelector('tbody tr[data-card].sel:not([hidden])') || box.querySelector('tbody tr[data-card]:not([hidden])'));
  again?.focus({preventScroll: true});
}
// One tab stop for the rows of a table: the selected (or first) row; the arrow keys, Home and End move between rows.
function rove(row) { const box = root.querySelector('.dk-sheet'); box.querySelectorAll('tbody tr[data-card][tabindex="0"]').forEach(r => { r.tabIndex = -1; }); if (row) row.tabIndex = 0; }
function moveRow(from, key) {
  const rows = [...root.querySelectorAll('.dk-sheet tbody tr[data-card]:not([hidden])')], i = rows.indexOf(from);
  if (i < 0) return false;
  const to = rows[key === 'Home' ? 0 : key === 'End' ? rows.length - 1 : key === 'ArrowDown' ? Math.min(rows.length - 1, i + 1) : Math.max(0, i - 1)];
  rove(to); to.focus(); to.scrollIntoView({block: 'nearest'});
  return true;
}
const ariaSort = (sort, k) => sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
function sortHead(view, sort, k, label) {
  const on = sort.key === k;
  return `<th scope="col" aria-sort="${ariaSort(sort, k)}"><button type="button" class="dk-sort" data-dk="sort" data-view="${view}" data-id="${k}" title="Sort by ${esc(label.toLowerCase())}">${esc(label)}<i aria-hidden="true">${on ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}</i></button></th>`;
}
const word = (state, glyph, label) => `<span class="dk-word ${esc(state)}"><i aria-hidden="true">${glyph}</i> ${esc(label)}</span>`;
// Vitals: one row for each vital of each running part shown — the part, the vital, what the design records, the target
// it is read against and the state in words. The Show filter and a monitor tile (one vital) narrow it; every column sorts.
function vitalsRows() {
  const order = new Map(DM.rows.map((r, i) => [r.id, i])), out = [];
  for (const row of visibleRows()) VITALS.forEach((v, i) => { if (!S.focus || S.focus === v.id) out.push({row, v, i, x: row.vitals[i]}); });
  const {key, dir} = S.sortV, k = dir === 'asc' ? 1 : -1, text = (a, b) => String(a).localeCompare(String(b), undefined, {numeric: true});
  const cmp = {part: (a, b) => order.get(a.row.id) - order.get(b.row.id), vital: (a, b) => a.i - b.i, recorded: (a, b) => text(a.x.value, b.x.value), target: (a, b) => text(a.x.target, b.x.target), state: (a, b) => SEVERITY[a.x.state] - SEVERITY[b.x.state]}[key] || (() => 0);
  return out.sort((a, b) => k * cmp(a, b) || order.get(a.row.id) - order.get(b.row.id) || a.i - b.i);
}
// The rows carry no repeated words (round 5, Contract G): a part's name is written on the first of its consecutive rows
// (the others name its reference; the whole name stays in the button's label), its asset and product are in the
// button's title, a target's translation into minutes or milliseconds is in the cell's title, fix is explained once in
// the caption, and while more than 24 readings are shown those a part does not carry (Not carried) are folded behind
// one control at the end of the table. Every reading stays a row: the fold hides, it never removes, and a reading that
// is selected or lit is never folded.
const FOLD_OVER = 24;
const plainTarget = t => { const [head, ...rest] = String(t ?? '').split(' · '), keep = rest.filter(r => !/^[\d.,]+ (?:min|s|h) in \d+ days$|^≈ /.test(r)); return [head, ...keep].join(' · '); };
function vitalsTable(hl) {
  const M = marks(), rows = vitalsRows(), sort = S.sortV, focus = S.focus ? VITALS.find(v => v.id === S.focus) : null;
  const fold = rows.length > FOLD_OVER && !S.showNa, naCount = rows.filter(r => r.x.state === 'na').length;
  const tr = ({row, v, x}, i) => {
    const id = `C:${row.id}:${v.id}`, key = row.id + ':' + v.id, was = M.chg.get(key), fixable = !S.preview && M.drafted.has(key) && ['bad', 'none', 'warn'].includes(x.state);
    const lit = hl.cells.has(key) || (hl.rows.has(row.id) && (!hl.vital || hl.vital === v.id));
    const again = i > 0 && rows[i - 1].row.id === row.id, sub = [row.assetRef, row.product || KIND[row.kind] || row.kind].filter(Boolean).join(' · ');
    const folded = fold && x.state === 'na' && !lit && S.sel !== id, target = plainTarget(x.target);
    return `<tr class="dk-vr ${esc(x.state)}${S.sel === id ? ' sel' : ''}${lit ? ' lit' : ''}${was ? ' chg' : ''}${M.pulse.has(key) ? ' pulse' : ''}" data-card="${esc(id)}" tabindex="-1" aria-selected="${S.sel === id}"${folded ? ' hidden' : ''}>`
      + `<th scope="row"><button type="button" class="dk-part" data-sel="${esc(row.id)}" tabindex="-1" aria-label="${esc(row.ref + ' ' + row.title)}" title="Read ${esc(row.ref)} on every vital${sub ? ' · ' + esc(sub) : ''}"><b>${esc(row.ref)}</b>${again ? '' : ' ' + esc(row.title)}</button>${S.probes.includes(row.id) ? '<small>probe plugged in</small>' : ''}</th>`
      + `<td title="${esc(v.q)}">${esc(v.label)}</td><td>${esc(x.value)}</td><td${target !== String(x.target ?? '') ? ` title="${esc(x.target)}"` : ''}>${esc(target)}</td>`
      + `<td>${word(x.state, VSTATE[x.state].glyph, VSTATE[x.state].label)}${was ? `<small>was ${esc(VSTATE[was].label)}</small>` : ''}${fixable ? '<small class="dk-rx-w"><abbr title="A fix is drafted">fix</abbr></small>' : ''}${S.preview ? '' : solBadge(solFor(row.id, v.id), 'inline')}</td></tr>`;
  };
  const shown = visibleRows().length;
  const caption = `${rows.length} reading${rows.length === 1 ? '' : 's'}: ${shown} of ${DM.rows.length} running parts on ${focus ? focus.label + ' only' : 'every vital'}, sorted by ${sort.key === 'state' ? 'state, worst first' : sort.key}${sort.key !== 'state' && sort.dir === 'desc' ? ', descending' : ''}. fix: a fix is drafted.`;
  const foot = rows.length > FOLD_OVER && naCount ? `<tfoot><tr><td colspan="5"><button type="button" class="cm-link dk-na" data-dk="na-toggle" aria-expanded="${!fold}">${fold ? `Show the ${naCount} readings not carried` : `Fold the ${naCount} readings not carried`}</button><small>vitals a part carries no driver for</small></td></tr></tfoot>` : '';
  const empty = !rows.length ? `<div class="dk-empty-t"><b>${S.filter === 'probed' ? 'No probe plugged in' : 'Nothing critical'}</b><p>${S.filter === 'probed' ? 'Plug a probe into a running part from its reading in the companion to keep it on this view.' : 'No running part reads critical on any vital.'}</p><button type="button" class="cm-btn" data-dk="filter" data-id="all">Show every part</button></div>` : '';
  return `<table class="dk-table dk-vt" role="grid" aria-readonly="true"><caption>${esc(caption)}</caption><thead><tr>${sortHead('vitals', sort, 'part', 'Part')}${sortHead('vitals', sort, 'vital', 'Vital')}${sortHead('vitals', sort, 'recorded', 'Recorded')}${sortHead('vitals', sort, 'target', 'Target')}${sortHead('vitals', sort, 'state', 'State')}</tr></thead><tbody>${rows.map(tr).join('')}</tbody>${foot}</table>${empty}`;
}
// What it takes: a two-column specification sheet — the objective, then each part (by band, from the edge inwards)
// beside what the objective takes of it, against what Chapters 7 and 10 record.
function loadSheet(hl) {
  const C = DM.cap, O = C.objective, src = O.source, A = O.assume, out = [];
  const from = src.kind === 'playbook' ? 'the SA Playbook\'s example, ' + EXAMPLE_LABEL + ', until the project records its own' : src.kind === 'driver' ? src.text : src.kind === 'review' ? 'saved for this review' : 'explored, not saved';
  const choices = [...(DM.choices?.values() || [])];
  const head = (k, v) => `<tr class="dk-objr"><th scope="row">${esc(k)}</th><td>${v}</td></tr>`;
  if (C.noLoad) {
    out.push(`<tr class="dk-band-row"><th colspan="2" scope="colgroup">The objective <small>what every part below is read against</small></th></tr>`);
    out.push(head('Objective', `<b>No load stated</b><small>${esc(O.source.text)}.${C.workload ? ' ' + esc(C.workload.driverId) + ' records ' + esc(C.workload.text) + ' in its conditions, which is not an objective.' : ''}</small>`));
    out.push(head('What it takes', `<b>No capacity reading</b><small>The desk sizes nothing until a person states the load: a Chapter 2 scalability driver with a target, or the objective above, saved for this review.</small><span class="dk-noload"><button type="button" class="cm-btn" data-dk="explore-example">Explore the SA Playbook's example (${esc(fmtN(PLAYBOOK_EXAMPLE.value))} concurrent users), ${esc(EXAMPLE_LABEL)}</button></span>`));
    return `<table class="dk-table dk-st"><caption>What it takes · no load stated</caption><tbody>${out.join('')}</tbody></table>`;
  }
  out.push(`<tr class="dk-band-row"><th colspan="2" scope="colgroup">The objective <small>what every part below is read against</small></th></tr>`);
  out.push(head('Objective', `<b>${esc(C.objText)}</b><small>${esc(from)}${src.src ? ' (' + esc(src.src) + ')' : ''}</small>`));
  out.push(head('Arrival rate', `<b>${esc(fmtN(C.lambda))} req/s${C.example ? ', ' + esc(EXAMPLE_LABEL) : ''}</b><small>${esc(C.lambdaMath)}</small>`));
  out.push(head('Running it takes', `<b>${esc(fmtN(C.totals.pods))} pods · ${esc(fmtN(C.totals.vcpu, 1))} vCPU · ${esc(fmtN(C.totals.mem, 1))} GiB · ${esc(fmtN(C.totals.nodes))} nodes${C.example ? ', ' + esc(EXAMPLE_LABEL) : ''}</b><small>${esc(fmtN(A.nodeVcpu))} vCPU and ${esc(fmtN(A.nodeMemGiB))} GiB a node</small>`));
  out.push(head('Short or to check', `<b>${C.counts.bad} short · ${C.counts.warn} to check · ${C.counts.none} with nothing recorded to compare</b>`));
  if (choices.length) out.push(head('Product choices', `<b>${choices.filter(x => x.revisit).length} to revisit</b><small>of ${choices.length} with alternatives</small>`));
  out.push(head('Planning assumptions', `<ul class="dk-alist">${ASSUMPTIONS.map(a => `<li><span>${esc(a.label)}</span> <b>${esc(a.options ? (a.options.find(([v]) => v === A[a.key])?.[1] || A[a.key]) : fmtN(A[a.key], 2) + (a.unit ? ' ' + a.unit : ''))}</b></li>`).join('')}</ul><small>Numbers the design does not record: change them in the companion.</small>`));
  for (const b of LOAD_BANDS) {
    const rs = C.rows.filter(r => r.band === b.id);
    if (!rs.length) continue;
    out.push(`<tr class="dk-band-row"><th colspan="2" scope="colgroup">${esc(b.label)} <small>${esc(b.note)} · ${rs.length} part${rs.length === 1 ? '' : 's'}</small></th></tr>`);
    for (const r of rs) {
      const st = r.verdict.state, ch = DM.choices?.get(r.id), demand = r.demand.value == null ? r.demand.text : fmtN(r.demand.value, r.demand.value < 10 ? 1 : 0) + ' ' + (r.demand.unit || '');
      out.push(`<tr class="dk-sr ${esc(st)}${S.sel === r.id ? ' sel' : ''}${hl.ids.has(r.id) ? ' lit' : ''}" data-card="${esc(r.id)}" tabindex="-1" aria-selected="${S.sel === r.id}"><th scope="row"><b>${esc(r.ref)}</b> ${esc(r.title)}<small>${esc(KIND[r.kind] || r.kind)}${r.product ? ' · ' + esc(r.product) : ''}</small>${word(st, VERDICT_GLYPH[st], VERDICT[st])}</th>`
        + `<td><p class="dk-takes"><span>Demand</span> <b>${esc(demand)}${C.example ? ', ' + esc(EXAMPLE_LABEL) : ''}</b></p><dl class="dk-spec">${r.spec.map(x => `<div><dt>${esc(x.k)}</dt><dd>${esc(x.v)}${x.d ? `<small>${esc(x.d)}</small>` : ''}</dd></div>`).join('')}${r.recorded ? `<div><dt>Chapter 7 records</dt><dd>${esc(r.recorded)}</dd></div>` : ''}${r.plan ? `<div><dt>Chapter 10 records</dt><dd>${esc(r.plan.plan.ref)} · ${esc(r.plan.minReady ?? '?')} to ${esc(r.plan.maxReplicas ?? '?')} replicas · ${esc(placed(r.plan))}</dd></div>` : ''}</dl>${ch ? choiceLine(ch) : ''}<p class="dk-why-t">${esc(r.verdict.why)}</p></td></tr>`);
    }
  }
  return `<table class="dk-table dk-st" role="grid" aria-readonly="true"><caption>What ${esc(C.objText)} takes of each part the design records, beside what Chapters 7 and 10 record. Select a part for the arithmetic and the product rules it rests on.</caption><thead><tr><th scope="col">Part</th><th scope="col">What it takes</th></tr></thead><tbody>${out.join('')}</tbody></table>`;
}
// Trace: one row for each requirement, its path through the chapters as chips in order, and the first broken link named.
// Round 12 (G, GR-FIG-07): at the size of an import the rows stand by requirement group, one group open at a time, its
// rows TRACE_PAGE at a time ("Show the next …"); a project without groups pages its rows the same way. "Broken only" is
// the filter the companion's capped lists point to. A selected requirement opens its group with its row shown.
const TRACE_PAGE = 50, TRACE_CAP = 12;
let TG = null;
function traceGroups() {
  if (TG && TG.dm === DM) return TG;
  const p = DM.p, byId = new Map(requirementGroups(p).map(g => [g.id, g])), map = new Map();
  for (const t of DM.trace) { const gid = groupsOf(p, t.id)[0] || ''; let x = map.get(gid); if (!x) map.set(gid, x = {key: gid || '-', group: byId.get(gid) || null, rows: [], broken: 0, reviewed: 0}); x.rows.push(t); if (t.firstBreak) x.broken++; if (t.reviewed) x.reviewed++; }
  const byRef = (a, b) => (a.group ? 0 : 1) - (b.group ? 0 : 1) || String(a.group?.id || '').localeCompare(String(b.group?.id || ''), undefined, {numeric: true});
  const groups = [...map.values()].sort(byRef);
  TG = {dm: DM, groups, grouped: groups.some(x => x.group), of: new Map(groups.flatMap(x => x.rows.map(t => [t.id, x.key])))};
  return TG;
}
const groupLabel = x => x.group ? `${x.group.id} · ${x.group.title || 'Requirement group'}` : 'Not in a requirement group';
function traceTable(hl) {
  const sort = S.sortT, k = sort.dir === 'asc' ? 1 : -1, byId = (a, b) => a.id.localeCompare(b.id, undefined, {numeric: true});
  const order = sort.key === 'break' ? (a, b) => k * ((a.firstBreak ? 1 : 0) - (b.firstBreak ? 1 : 0)) || byId(a, b) : (a, b) => k * byId(a, b);
  const G = traceGroups(), shown = S.traceShown || (S.traceShown = {}), broken = DM.trace.filter(t => t.firstBreak).length;
  const sel = S.sel && G.of.has(S.sel) ? S.sel : null;
  // A newly selected requirement opens its group once; the reader may then open another (or close every group: '').
  if (sel && S.traceSelSeen !== sel) { S.traceOpen = G.of.get(sel); S.traceSelSeen = sel; }
  const open = !G.grouped ? G.groups[0]?.key : S.traceOpen === '' ? null : G.groups.some(x => x.key === S.traceOpen) ? S.traceOpen : (G.groups.find(x => x.broken) || G.groups[0])?.key;
  const chip = (t, x) => `<button type="button" class="dk-pchip k-${esc(x.chapter)}${x.state ? ' ' + esc(x.state) : ''}${x.chosen ? ' chosen' : ''}${S.sel === x.id ? ' sel' : ''}${hl.on && hl.ids.has(x.id) ? ' lit' : ''}" data-sel="${esc(x.id.startsWith('V:') ? t.id : x.id)}"><b>${esc(x.ref)}</b> <span>${esc(x.label)}</span>${x.state ? ` <i>${esc(VSTATE[x.state]?.label || x.state)}</i>` : ''}${x.chosen ? ' <i>chosen</i>' : ''}</button>`;
  // A cell names at most TRACE_CAP records and counts the rest (a requirement realised by many records stays one row).
  const cell = (t, xs) => xs.slice(0, TRACE_CAP).map(x => chip(t, x)).join('') + (xs.length > TRACE_CAP ? `<span class="dk-pmore">and ${xs.length - TRACE_CAP} more</span>` : '');
  const tr = t => `<tr class="dk-trr ${t.firstBreak ? 'broken' : 'whole'}${S.sel === t.id ? ' sel' : ''}${hl.ids.has(t.id) ? ' lit' : ''}" data-card="${esc(t.id)}" tabindex="-1" aria-selected="${S.sel === t.id}">`
    + `<th scope="row"><b>${esc(t.id)}</b> ${esc(t.req.title)}<small>${t.req.acceptance ? 'Acceptance recorded' : 'Acceptance not recorded'}</small></th>`
    + `<td><ol class="dk-path">${TRACE_COLS.map(col => { const xs = t.cells[col.id], first = t.firstBreak?.id === col.id; return `<li class="${xs.length ? 'has' : col.spine ? 'break' : 'soft'}${first ? ' first' : ''}"><small>Ch ${esc(col.ch)} · ${esc(col.label)}</small>${xs.length ? cell(t, xs) : `<span class="dk-pgap">${col.id === 'runtime' && t.runtimeElsewhere ? 'Recorded in another environment; none here' : first ? '✕ The thread breaks here: none recorded' : col.spine ? '✕ None recorded' : 'None recorded'}</span>`}</li>`; }).join('')}</ol></td>`
    + `<td>${t.firstBreak ? `${word('bad', '✕', t.runtimeElsewhere && t.firstBreak.id === 'runtime' ? 'Runtime only elsewhere' : 'Breaks at ' + t.firstBreak.label.toLowerCase())}<small>${t.runtimeElsewhere && t.firstBreak.id === 'runtime' ? 'No running part is planned in this environment. ' : `Chapter ${esc(t.firstBreak.ch)} records nothing this requirement passes through. `}<a href="${esc(chapterURL(t.firstBreak.ch))}">Open Chapter ${esc(t.firstBreak.ch)}</a></small>` : `${word('ok', '✓', 'Design linked')}<small>to a recorded running part · verification separate</small>`}</td>`
    + `<td>${t.reviewed ? word('ok', '✓', 'Trail reviewed') : word('none', '○', 'Not reviewed')}<small><a href="${esc(projectURL('/?chapter=11&tab=work&stage=overview&object=' + encodeURIComponent(t.id)))}">Review this requirement’s trail</a></small></td></tr>`;
  const body = x => {
    const rs = x.rows.filter(t => !S.traceBroken || t.firstBreak).sort(order);
    let n = Math.max(TRACE_PAGE, shown[x.key] || 0); const at = sel ? rs.findIndex(t => t.id === sel) : -1; if (at >= n) n = Math.ceil((at + 1) / TRACE_PAGE) * TRACE_PAGE;
    return rs.slice(0, n).map(tr).join('') + (rs.length > n ? `<tr class="dk-tmore"><td colspan="4"><button type="button" class="cm-link" data-dk="trace-more" data-id="${esc(x.key)}" data-n="${n}">Show the next ${Math.min(TRACE_PAGE, rs.length - n)} of ${rs.length - n} more</button><small>${n} of ${rs.length} shown</small></td></tr>` : '')
      + (!rs.length ? `<tr class="dk-tmore"><td colspan="4"><small>No broken thread in this group.</small></td></tr>` : '');
  };
  const head = x => `<tr class="dk-tg${x.key === open ? ' open' : ''}"><th colspan="4" scope="rowgroup"><button type="button" class="cm-link" data-dk="trace-group" data-id="${esc(x.key)}" aria-expanded="${x.key === open}">${x.key === open ? '▾' : '▸'} ${esc(groupLabel(x))}</button><small>${x.rows.length.toLocaleString('en-GB')} requirement${x.rows.length === 1 ? '' : 's'}${x.broken ? ' · ' + x.broken.toLocaleString('en-GB') + ' with a broken thread' : ''} · ${x.reviewed.toLocaleString('en-GB')} trail${x.reviewed === 1 ? '' : 's'} reviewed</small></th></tr>`;
  const rows = G.grouped ? G.groups.map(x => head(x) + (x.key === open ? body(x) : '')).join('') : G.groups.map(body).join('');
  const filter = `<button type="button" class="cm-link" data-dk="trace-broken" aria-pressed="${!!S.traceBroken}">${S.traceBroken ? 'Show every thread' : 'Show only the broken threads'}</button>`;
  return `<table class="dk-table dk-tt" role="grid" aria-readonly="true"><caption>${DM.trace.length.toLocaleString('en-GB')} requirement${DM.trace.length === 1 ? '' : 's'}${G.grouped ? ' in ' + G.groups.length + ' requirement group' + (G.groups.length === 1 ? '' : 's') + ', one open at a time,' : ''} each followed through the chapters as Chapter 11's trail follows it: ${broken ? broken.toLocaleString('en-GB') + ' with a broken thread' : 'all recorded design paths reach runtime here'}. ${broken ? filter : ''}</caption><thead><tr>${sortHead('trace', sort, 'req', 'Requirement')}<th scope="col">Path through the chapters</th>${sortHead('trace', sort, 'break', 'First broken link')}<th scope="col">Trail</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function setSort(view, k) {
  const cur = view === 'trace' ? S.sortT : S.sortV;
  const next = cur.key === k ? {key: k, dir: cur.dir === 'asc' ? 'desc' : 'asc'} : {key: k, dir: k === 'state' || k === 'break' ? 'desc' : 'asc'};
  if (view === 'trace') S.sortT = next; else S.sortV = next;
  save(); render();
}

// ---------------------------------------------------------------- chrome

function crumbs() {
  const v = VIEWS.find(([id]) => id === S.view);
  const sel = S.sel ? selLabel(S.sel) : '';
  // As in the other chapter models, the crumbs name a selection; the view's own name is in the switcher.
  if (!sel) return '';
  return `<button type="button" data-dk="clear" class="${sel ? '' : 'here'}">${esc(v[1])}</button>${sel ? `<span>›</span><button type="button" class="here" data-dk="noop">${esc(sel)}</button>` : ''}`;
}
function selLabel(s) {
  if (s.startsWith('C:')) { const [, id, v] = s.split(':'); return `${Row(id)?.ref} · ${VITALS.find(x => x.id === v)?.label}`; }
  if (s.startsWith('F:')) return fixes().byId.get(s.slice(2))?.title || 'Drafted fix';
  if (Row(s)) return `${Row(s).ref} ${Row(s).title}`;
  if (Cap(s)) return `${Cap(s).ref} ${Cap(s).title}`;
  if (Dec(s)) return `${s} ${Dec(s).question}`;
  if (Req(s)) return `${s} ${Req(s).req.title}`;
  const c = chipOf(s); return c ? `${c.ref} ${c.label}` : s;
}
function chipOf(id) { for (const t of DM?.trace || []) for (const xs of Object.values(t.cells)) { const x = xs.find(x => x.id === id); if (x) return x; } return null; }
function solChip() {
  const c = SOL.config, n = SOL.byItem.size;
  return `<span class="dk-solchip ${c?.configured ? 'on' : 'off'}" title="${esc(solStatusLine())}"><b>Sol</b>${c ? (c.configured ? esc(c.model || 'connected') : 'not connected') : '…'}${n ? ` · ${n} assessed` : ''}</span>`;
}
function controls() {
  if (S.view === 'vitals') {
    const crit = DM.rows.filter(r => r.vitals.some(v => v.state === 'bad')).length;
    const focus = S.focus ? VITALS.find(v => v.id === S.focus) : null;
    return solChip() + `<span class="dk-lab">Show</span>${[['all', `All ${DM.rows.length}`], ['critical', `Critical ${crit}`], ['probed', `Pinned ${S.probes.filter(id => Row(id)).length}`]].map(([id, t]) => `<button type="button" class="cm-dep" data-dk="filter" data-id="${esc(id)}" aria-pressed="${S.filter === id}">${t}</button>`).join('')}`
      + (focus ? `<span class="dk-lab">Vital</span><button type="button" class="cm-dep" data-dk="focus" data-id="${esc(focus.id)}" aria-pressed="true" title="Show every vital again">${esc(focus.label)} only ×</button>` : '');
  }
  // The Running board: how many parts stand in each state, and the kit's zoom and Fit (notation-view.js handles them).
  if (S.view === 'board') {
    const n = boardCounts();
    return solChip() + `<span class="dk-lab">Running parts</span>${stateWord('fix', n.fix)}${stateWord('confirm', n.confirm)}${stateWord('pass', n.pass)}`
      + '<div class="nt-zoom" role="group" aria-label="Zoom"><button type="button" class="cm-btn" data-nt="zoom" data-id="out" aria-label="Zoom out" title="Zoom out">−<span> Out</span></button><button type="button" class="cm-btn" data-nt="zoom" data-id="in" aria-label="Zoom in" title="Zoom in">+<span> In</span></button><button type="button" class="cm-btn" data-nt="zoom" data-id="fit" title="Fit the whole picture">Fit</button></div>';
  }
  if (S.view === 'load') {
    const O = DM.cap.objective, A = O.assume;
    return `<label class="dk-in wide"><span>Objective</span><input type="number" min="1" step="1000" data-dk-in="value" value="${esc(O.value ?? '')}" placeholder="no load stated" aria-label="Objective"></label>
      <label class="dk-in"><select data-dk-in="kind" aria-label="Objective unit"><option value="users"${O.kind === 'users' ? ' selected' : ''}>concurrent users</option><option value="rate"${O.kind === 'rate' ? ' selected' : ''}>requests a second</option></select></label>
      ${O.kind === 'users' ? `<label class="dk-in"><span>every</span><input type="number" min="1" step="1" data-dk-in="assume" data-key="thinkSeconds" value="${esc(A.thinkSeconds)}" aria-label="Seconds between one user's requests"><span>s</span></label>` : ''}
      <label class="dk-in"><span>survive</span><select data-dk-in="assume" data-key="survive" aria-label="Keep serving after losing">${ASSUMPTIONS.find(a => a.key === 'survive').options.map(([v, t]) => `<option value="${v}"${A.survive === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="dk-in"><span>at</span><input type="number" min="10" max="100" step="5" data-dk-in="assume" data-key="utilisation" value="${esc(A.utilisation)}" aria-label="Utilisation"><span>%</span></label>
      ${O.surge ? `<label class="dk-chk"><input type="checkbox" data-dk-in="surge"${O.surge.on ? ' checked' : ''}> ${esc(O.surge.driverId)} surge × ${esc(O.surge.factor)}</label>` : ''}
      ${O.source.kind === 'review' && !S.explore ? `<span class="dk-saved" title="${esc(O.source.text)}">✓ Saved for this review</span>` : O.value == null ? `<button type="button" class="cm-btn" data-dk="explore-example">Explore the playbook's example</button>` : `<button type="button" class="cm-btn primary" data-dk="save-objective">${icon('save')}<span>Save as the review objective</span></button>`}${S.explore ? `<button type="button" class="cm-btn" data-dk="reset-objective">${icon('reset')}<span>Reset</span></button>` : ''}`;
  }
  return `<a class="cm-btn" href="${esc(projectURL('/?chapter=11&tab=work'))}">Record a trail review in Chapter 11</a>`;
}
// The chrome of Diagram and the shared views: the notation's bar (scene, Arrange, Layers, Focus, Download, Find, zoom),
// its status and its Key; the crumbs name nothing here, since the view's name is in the switcher.
function chromeDiagram() {
  root.querySelector('.cm-crumbs').innerHTML = '';
  root.querySelectorAll('.cm-view').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === NT.view())));
  keepFocus(root.querySelector('.dk-controls'), () => NT.barHTML());
  const st = root.querySelector('.cm-state'); if (st.textContent !== NT.status()) st.textContent = NT.status();
  stateMore();
  root.querySelector('.cm-legend').innerHTML = NT.legendHTML();
  root.querySelector('.cm-banner').innerHTML = flash ? `<section class="dk-flash" role="status"><b>${esc(flash.text)}</b><button type="button" class="cm-btn icon" data-dk="flash-off" aria-label="Dismiss">×</button></section>` : '';
}
function chrome() {
  root.querySelector('.cm-crumbs').innerHTML = crumbs();
  root.querySelectorAll('.cm-view').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === S.view)));
  keepFocus(root.querySelector('.dk-controls'), () => S.view === 'load' ? '<span class="dk-objective-hint">Explore the capacity and recovery needed for a stated load.</span>' : controls());
  keepFocus(root.querySelector('.dk-objective'), () => S.view === 'load' ? '<h3>Review objective</h3><div class="dk-objective-fields">' + controls() + '</div><p>Explore changes here, then save an objective for this review. These are design estimates, not live measurements.</p>' : '');
  const st = root.querySelector('.cm-state');
  if (S.view === 'load') st.textContent = DM.cap.lambdaMath + '.';
  else if (S.view === 'trace') { const b = DM.trace.filter(t => t.firstBreak).length; st.textContent = `${DM.trace.length} requirement${DM.trace.length === 1 ? '' : 's'} · ${b ? b + ' with a broken thread' : 'all recorded design paths reach runtime here'} · ${DM.trace.filter(t => t.reviewed).length} trail${DM.trace.filter(t => t.reviewed).length === 1 ? '' : 's'} reviewed`; }
  else if (S.view === 'board') { const B = board(), n = boardCounts(), places = B.full.groups.filter(g => g.kind !== 'environment' && B.full.nodes.some(x => x.group === g.id)).length, hidden = B.hidden, text = `Running board · ${DM.rows.length} running part${DM.rows.length === 1 ? '' : 's'} in ${places} place${places === 1 ? '' : 's'} · ${n.fix} ${CHECK_WORDS.fix} · ${n.confirm} ${CHECK_WORDS.confirm} · ${n.pass} ${CHECK_WORDS.pass} · ${B.D.edges.length} relationship${B.D.edges.length === 1 ? '' : 's'}${hidden ? ` · ${hidden} hidden by the layers` : ''}${S.preview ? ' · as the preview would read' : ''}`; if (st.textContent !== text) st.textContent = text; }
  else { const c = s => DM.rows.filter(r => r.vitals.some(v => v.state === s)).length; st.textContent = `${DM.rows.length} running parts · ${c('bad')} critical · ${c('none')} with no signal · ${DM.anti.length} anti-pattern${DM.anti.length === 1 ? '' : 's'}`; }
  const banner = [];
  if (flash) banner.push(`<section class="dk-flash" role="status"><b>${esc(flash.text)}</b>${flash.eventId ? `<button type="button" class="cm-btn gold" data-dk="open-change" data-id="${esc(flash.eventId)}">Review impact →</button>` : ''}${flash.stewards ? '<button type="button" class="cm-btn" data-dk="sol-stewards">Open the stewards’ queue</button>' : ''}<button type="button" class="cm-btn icon" data-dk="flash-off" aria-label="Dismiss">×</button></section>`);
  if (S.preview && PREV) { const ids = S.preview.ids, one = ids.length === 1 ? fixes().byId.get(ids[0]) : null, n = PREV.sim.commands.length;
    banner.push(`<section class="dk-preview" role="status"><span class="ip-kicker">Preview · nothing is applied</span><b>${esc(one ? one.title : `${ids.length} drafted fixes`)}</b><p>${esc(describeEffect(PREV.sim, {brief: true}))}${n > MAX_COMMANDS ? ` ${n} changes, reviewed ${MAX_COMMANDS} at a time.` : ''}</p><button type="button" class="cm-btn primary" data-dk="fix-apply-preview">${icon('review')}<span>Review and apply…</span></button><button type="button" class="cm-btn" data-dk="fix-stop">Stop preview</button></section>`); }
  if (S.explore && S.view !== 'load') banner.push(`<section class="dk-explore"><span class="ip-kicker">Objective explored, not saved</span><b>${esc(DM.cap.objText)}</b><button type="button" class="cm-btn" data-dk="view" data-id="load">See what it takes</button><button type="button" class="cm-btn" data-dk="reset-objective">Reset</button></section>`);
  root.querySelector('.cm-banner').innerHTML = banner.join('');
  stateMore();
  // The Key belongs to the pictures (the tables read in words and carry none).
  root.querySelector('.cm-legend').innerHTML = S.view === 'board' ? boardLegendHTML() : '';
}

// The status line reads in two lines; when it runs longer, More shows the rest (round 5, Contract G).
function stateMore() {
  const st = root.querySelector('.cm-state'), b = root.querySelector('.cm-state-more'); if (!st || !b) return;
  if (st.dataset.text !== st.textContent) { st.dataset.text = st.textContent; st.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); b.textContent = 'More'; }
  b.hidden = !st.classList.contains('open') && st.scrollHeight <= st.clientHeight + 1;
}

// ---------------------------------------------------------------- companion

// Readings in the companion are two lines with "More" (round 5, Contract G): the line that says what a reading is in
// sight, the rest behind More. What is open stays open while the desk redraws.
const moreOpen = new Set();
const more = (id, html, label = 'More') => html ? `<details class="dk-more" data-more="${esc(id)}"${moreOpen.has(id) ? ' open' : ''}><summary>${esc(label)}</summary>${html}</details>` : '';
if (typeof document !== 'undefined') document.addEventListener('toggle', e => { const d = e.target; if (!d?.matches?.('details.dk-more[data-more]')) return; if (d.open) moreOpen.add(d.dataset.more); else moreOpen.delete(d.dataset.more); }, true);

const act = (k, attrs, label, cls = '') => `<button type="button" class="cm-btn ${cls}" data-dk="${k}" ${attrs}>${label}</button>`;
const chLink = (ch, id, label, cls = 'cm-btn') => `<a class="${cls}" href="${esc(chapterURL(ch, id))}">${esc(label)}</a>`;
const placed = f => !f.placements.length ? 'not placed' : `${f.active} active${f.standby ? ' + ' + f.standby + ' standby' : ''}${f.open ? ' + ' + f.open + ' without a stated role or count' : ''} in ${f.zonesAll.length} zone${f.zonesAll.length === 1 ? '' : 's'}`;

// ---------------------------------------------------------------- drafted fixes

const chName = ch => `Chapter ${ch}${CHAPTER_NAMES[ch] ? ' · ' + CHAPTER_NAMES[ch] : ''}`;
const clip = t => { const x = String(t ?? ''); return x.length > 220 ? x.slice(0, 217) + '…' : x; };
function knobHTML(d) {
  const v = S.values[d.id] || {}, fromSol = new Set(S.solUsed[d.id]?.keys || []);
  if (!d.knobs.length) return '';
  const one = k => { const val = v[k.key] ?? k.value, attrs = `data-dk-in="fix" data-id="${esc(d.id)}" data-key="${esc(k.key)}"`;
    const input = k.type === 'textarea' ? `<textarea rows="5" maxlength="2400" ${attrs}>${esc(val)}</textarea>` : `<span><input type="${k.type === 'number' ? 'number' : 'text'}" ${k.type === 'number' ? `min="${k.min ?? 0}"${k.max != null ? ` max="${k.max}"` : ''} step="${k.step || 1}"` : 'maxlength="120"'} ${attrs} value="${esc(val)}">${k.unit ? ' ' + esc(k.unit) : ''}</span>`;
    return `<label class="dk-in col"><span>${esc(k.label)}${fromSol.has(k.key) ? ' <i class="dk-soltag" title="Set from Sol’s refinement">Sol</i>' : ''}</span>${input}${k.hint ? `<small>${esc(k.hint)}</small>` : ''}</label>`; };
  const numbers = d.knobs.filter(k => !k.wording), wording = d.knobs.filter(k => k.wording);
  return `<div class="dk-knobs">${numbers.map(one).join('')}${wording.length ? `<details class="dk-words"${wording.some(k => fromSol.has(k.key)) || !numbers.length ? ' open' : ''}><summary>Wording · ${wording.length}</summary>${wording.map(one).join('')}</details>` : ''}</div>`;
}
// Sol's assessment of a decision, where the decision is shown: the latest, and a way to ask.
function solFor(rowId, vital) {
  if (!BASE || !FX) return null;
  for (const d of FX.forCell(rowId, vital)) { const e = solEntry(BASE.p, BASE, FX, 'F:' + d.id); if (e) return e; }
  const j = FX.judgementFor(rowId, vital);
  return j ? solEntry(BASE.p, BASE, FX, 'J:' + j.id) : null;
}
function solBlock(id, title, knobs = [], names = {}) {
  const e = BASE && FX ? solEntry(BASE.p, BASE, FX, id) : null;
  return e ? assessmentHTML(e, {knobs, id, names, outcomes: solOutcomes(project(), e.run.id, id)}) + `<section class="dk-solagain">${askHTML([id], {title, label: 'Ask Sol again'})}</section>` : `<section class="dk-solagain">${askHTML([id], {title})}</section>`;
}
const knobsNow = d => { const v = valuesOf(d, S.values[d.id]); return d.knobs.map(k => ({...k, value: v[k.key]})); };
function changesHTML(cmds) {
  const xs = describeCommands(BASE.p, cmds);
  return xs.length ? `<ul class="dk-chg">${xs.map(x => `<li><b>Ch ${esc(x.chapter)} · ${esc(x.head)}</b>${x.fields.map(f => `<div><span>${esc(f.label)}</span>${f.before ? `<del>${esc(clip(f.before))}</del>` : ''}<ins>${esc(clip(f.after))}</ins></div>`).join('')}</li>`).join('')}</ul>` : '<p class="cm-muted">Nothing left to change: the design already records it.</p>';
}
function cellPills(xs) {
  if (!xs.length) return '';
  return `<div class="dk-moves">${xs.slice(0, 12).map(c => `<button type="button" class="dk-mv" data-sel="C:${esc(c.row)}:${esc(c.vital)}"><b>${esc(c.ref)}</b> ${esc(VITALS.find(v => v.id === c.vital)?.label || c.vital)} <i class="dk-g ${esc(c.from)}">${VSTATE[c.from].glyph}</i>→<i class="dk-g ${esc(c.to)}">${VSTATE[c.to].glyph}</i></button>`).join('')}${xs.length > 12 ? `<small>+${xs.length - 12} more</small>` : ''}</div>`;
}
function fixHTML(d) {
  const E = effectOf(d), previewing = S.preview?.ids.length === 1 && S.preview.ids[0] === d.id, err = E.errors?.[0];
  return `<section class="dk-fix${d.switchPoint ? ' switch' : ''}" data-fix="${esc(d.id)}"><h4 aria-level="3">${d.switchPoint ? 'Drafted decision' : 'Drafted fix'}<span title="${esc(chName(d.chapter))}">Chapter ${esc(d.chapter)}</span></h4><p class="dk-fix-t"><b>${esc(d.title)}</b></p><p>${esc(d.why)}</p>${d.also ? `<p class="dk-also">Still to watch: ${esc(d.also)}</p>` : ''}</section>
   ${solBlock('F:' + d.id, d.title, knobsNow(d))}
   <section class="dk-fix cont${d.switchPoint ? ' switch' : ''}">${knobHTML(d)}
   ${err ? `<p class="dk-verdict bad">${esc(err.message)}</p>` : `<h5 aria-level="4">What changes · ${E.commands.length}</h5>${changesHTML(E.commands)}`}
   ${d.switchPoint ? '<p class="cm-muted">A decision to frame, not a fix: the vitals move when Chapter 7 records the product the decision chooses.</p>' : `<h5 aria-level="4">On the desk</h5><p class="dk-effect">${esc(describeEffect(E))}</p>${cellPills(E.changed)}`}
   ${d.math?.length ? `<details class="dk-mathd"><summary>The arithmetic</summary><ol class="dk-math">${d.math.map(m => `<li>${esc(m)}</li>`).join('')}</ol></details>` : ''}
   <div class="cm-acts">${d.switchPoint ? `<button type="button" class="cm-btn" data-dk="noop" data-k-action="product-compare" data-id="${esc(d.target.id)}">Compare in Co-design</button>` : act('fix-preview', `data-id="${esc(d.id)}" aria-pressed="${previewing}"`, icon('vitals') + (previewing ? 'Stop the preview' : 'Preview on the desk'), previewing ? 'on' : '')}${act('fix-apply', `data-id="${esc(d.id)}"`, icon('review') + 'Review and apply…', 'primary')}${chLink(d.target.chapter, d.target.id, `Edit in Chapter ${d.target.chapter} instead`)}</div>
   <p class="cm-muted">Applied only through Chapter ${esc(d.chapter)}'s change review, where every changed field is shown and you confirm it. Drafted values stay unconfirmed until evidence confirms them.</p></section>`;
}
function judgementHTML(j) {
  return `<section class="dk-fix judge"><h4 aria-level="3">Needs your judgement${j.fix ? `<span title="${esc(chName(j.fix.chapter))}">Chapter ${esc(j.fix.chapter)}</span>` : ''}</h4><p>${esc(j.text)}</p>${j.fix ? `<div class="cm-acts">${chLink(j.fix.chapter, j.fix.id, j.fix.label, 'cm-btn')}</div>` : ''}<p class="cm-muted">The desk drafts only what follows from recorded numbers; Sol can reason about the rest with you.</p></section>${solBlock('J:' + j.id, `${j.ref} · needs your judgement`)}`;
}
function fixFor(row, vid) {
  const ds = fixes().forCell(row.id, vid);
  if (ds.length) return ds.map(fixHTML).join('');
  const j = fixes().judgementFor(row.id, vid), st = BASE?.rows.find(r => r.id === row.id)?.vitals.find(v => v.vital === vid)?.state;
  return j && ['bad', 'none', 'warn'].includes(st) ? judgementHTML(j) : solHistory(row, vid);
}
// Advice Sol gave on a decision that has since been acted on: kept as history beside the reading.
function solHistory(row, vid) {
  const ref = BASE?.rows.find(r => r.id === row.id)?.ref;
  const e = [...SOL.byItem.values()].find(x => x.item?.vital === vid && list(x.item.rows).includes(ref));
  return e ? assessmentHTML({...e, current: false}, {id: e.a.id}) : '';
}
// The drafts for the parts of one plan step (one vital, one state), read from the desk as recorded.
function stepDrafts(g) { const keys = new Set(g.rows.map(r => r.id + ':' + g.vital)); return fixes().drafts.filter(d => d.vital === g.vital && d.aims.some(a => keys.has(a))); }
function stepJudgements(g) { return fixes().judgements.filter(j => j.vital === g.vital && g.rows.some(r => r.id === j.row)); }
function probeCard(id) {
  const row = Row(id);
  if (row) return `<div class="dk-pc ${esc(row.state)}" data-sel="${esc(row.id)}" role="button" tabindex="0"><header><b>${esc(row.ref)} ${esc(row.title)}</b><button type="button" class="dk-x" data-dk="probe" data-id="${esc(row.id)}" aria-label="Unplug the probe from ${esc(row.ref)}">×</button></header><div class="dk-pills">${row.vitals.map((v, i) => `<i class="${esc(v.state)}" title="${esc(VITALS[i].label + ': ' + VSTATE[v.state].label + ' · ' + v.value)}">${esc(VITALS[i].short)}</i>`).join('')}</div>${row.alarms.length ? `<small class="dk-alarms">${esc(row.alarms.map(a => a.name).join(' · '))}</small>` : ''}</div>`;
  const q = Dec(id) && decisionProbe(DM, id);
  if (q) { const lean = q.alts.find(a => a.alt.id === q.lean); return `<div class="dk-pc dec" data-sel="${esc(id)}" role="button" tabindex="0"><header><b>${esc(id)} ${esc(q.decision.question)}</b><button type="button" class="dk-x" data-dk="probe" data-id="${esc(id)}" aria-label="Unplug the probe from ${esc(id)}">×</button></header><small>${q.decision.selectedAlternativeId ? '● ' : lean ? '★ ' : ''}${esc(lean?.alt.title || 'no lead on the drivers')}</small><div class="dk-pills">${(lean?.effects || []).map(e => `<i class="${e.effect === 'supports' ? 'ok' : e.effect === 'tension' || e.effect === 'violates' ? 'bad' : 'none'}" title="${esc(e.id + ': ' + e.effect + (e.reason ? ' — ' + e.reason : ''))}">${esc(e.id)}</i>`).join('')}</div><small class="dk-alarms">${q.implications.upstream.length} earlier · ${q.implications.downstream.length} later records</small></div>`; }
  return '';
}
function probesHTML() {
  const ps = S.probes.filter(known);
  if (!ps.length) return '';
  return `<section class="dk-probes"><h4 aria-level="3">Probes<span>${ps.length} of ${MAX_PROBES}</span></h4>${ps.map(probeCard).join('')}</section>`;
}
function rowChart(row, compact = false) {
  const probed = S.probes.includes(row.id), p = project();
  let decisions = [];
  try { decisions = specFor(reasoningFor(p), row.id)?.decisions || []; } catch { decisions = []; }
  return `<section class="cm-spec dk-chart"><h4 aria-level="3">Running part · ${esc(row.ref)}<span class="dk-s ${esc(row.state)}">${VSTATE[row.state].label}</span></h4><p class="cm-spec-t"><b>${esc(row.title)}</b></p><p class="cm-muted">${esc([row.assetRef, row.product, placed(row.f)].filter(Boolean).join(' · '))}</p>${compact ? '' : scaleLine(row)}
   <div class="cm-acts">${act('probe', `data-id="${esc(row.id)}" aria-pressed="${probed}"`, icon('probe') + (probed ? 'Unplug the probe' : 'Plug in a probe'), probed ? '' : 'gold')}${act('ask-part', `data-id="${esc(row.id)}"`, icon('review') + 'Ask for review')}${chLink(10, row.id, 'Open in Chapter 10')}</div>
   ${compact ? '' : `<ul class="dk-vl">${row.vitals.map((v, i) => `<li class="${esc(v.state)}"><button type="button" data-sel="C:${esc(row.id)}:${VITALS[i].id}"><b>${VSTATE[v.state].glyph} ${esc(VITALS[i].label)}</b><span>${esc(v.value)}</span><small>${esc(v.target)}</small></button></li>`).join('')}</ul>`}
   <p class="cm-muted">${esc(describeRow(DM, row))}</p></section>
   ${decisions.length ? `<section><h4 aria-level="3">Decisions behind it<span>${decisions.length}</span></h4><div class="dk-links">${decisions.map(d => `<button type="button" class="cm-link" data-sel="${esc(d.id)}">${esc(d.id)} · ${esc(d.question)}${d.selectedAlternativeId ? ' · chosen' : ' · open'}</button>`).join('')}</div><p class="cm-muted">Select one to probe its alternatives, patterns and what it reaches.</p></section>` : ''}
   ${specPanelHTML(p, row.id)}`;
}
function vitalDetail(row, vid) {
  const playbook = playbookAvailable(project()), v = row.vitals.find(x => x.vital === vid), def = VITALS.find(x => x.id === vid), tactics = playbook ? vitalTactics(def) : [];
  const pats = playbook ? (def.patterns || []).map(catalogueRecord).filter(Boolean) : [], drafted = fixes().forCell(row.id, vid).length;
  return `<section class="cm-spec dk-vd ${esc(v.state)}"><h4 aria-level="3">${esc(def.label)} · ${esc(row.ref)}<span class="dk-s ${esc(v.state)}">${VSTATE[v.state].label}</span></h4><p class="cm-muted">${esc(def.q)}</p>
   <div class="dk-read"><div><small>Recorded</small><b>${esc(v.value)}</b></div><div><small>Against</small><b>${esc(v.target)}</b></div></div><p>${esc(v.why)}</p>
   ${(v.drivers || []).length ? `<p class="dk-links">${v.drivers.map(d => /^QD-/.test(d) ? chLink(2, d, d, 'cm-link') : `<span class="cm-link">${esc(d)}</span>`).join('')}</p>` : ''}</section>
   ${fixFor(row, vid)}
   <section>${!playbook ? '<p class="cm-muted">The SA Playbook is withdrawn in this project, so its tactics are not offered here.</p>' : ''}${tactics.length || pats.length ? `<h5 aria-level="4">What would move it</h5><ul class="dk-tac">${tactics.map(t => `<li title="${esc(t.src || '')}"><b>${esc(t.name)}</b> · ${esc(t.group)}<small>${esc(t.concept)}</small></li>`).join('')}${pats.map(r => `<li><b>${esc(r.name)}</b> · pattern catalogue</li>`).join('')}</ul><p class="cm-muted">From the SA Playbook's tactics${pats.length ? ' and the pattern catalogue' : ''}; none is applied until a chapter records it.</p>` : ''}
   <div class="cm-acts">${v.fix ? chLink(v.fix.chapter, v.fix.id, v.fix.label, drafted ? 'cm-btn' : 'cm-btn primary') : ''}${vid === 'capacity' && v.capacity ? act('to-load', `data-id="${esc(v.capacity.id)}"`, 'See what it takes') : ''}</div></section>${rowChart(row, true)}`;
}
function decisionHTML(id) {
  const q = decisionProbe(DM, id);
  if (!q) return '';
  const d = q.decision, lean = q.alts.find(a => a.alt.id === q.lean), I = q.implications, probed = S.probes.includes(id);
  const eff = e => `<i class="dk-eff ${esc(e.effect)}" title="${esc(e.id + ': ' + e.effect + (e.reason ? ' — ' + e.reason : ''))}">${esc(e.id)} ${e.effect === 'supports' ? '✓' : e.effect === 'tension' ? '⚠' : e.effect === 'violates' ? '✕' : e.effect === 'neutral' ? '·' : '?'}</i>`;
  const names = xs => xs.map(r => `<i class="dk-cat${r.type === 'anti-pattern' ? ' anti' : ''}" title="Pattern catalogue">${esc(r.name)}</i>`).join('');
  const item = x => `<li><a href="${esc(chapterURL(x.chapter, x.id))}"><b>Ch ${esc(x.chapter)} · ${esc(x.ref)}</b> ${esc(x.title)}</a><small>${esc(x.why)}</small></li>`;
  // The reading (round 25): the lead and how firmly it holds, what a hard constraint rules out, what is dominated, the
  // unstated effects that matter, the drivers left out, and where the working choice stands, in the reading's sentences.
  const said = q.lines.filter(l => ['lead', 'firmness', 'ruled-out', 'dominated', 'unknowns', 'left-out', 'choice'].includes(l.kind));
  const stand = a => readingStanding(q.reading, a.alt.id);
  return `<section class="cm-spec dk-dec"><h4 aria-level="3">Decision · ${esc(id)}<span>${esc(d.status || 'draft')}</span></h4><p class="cm-spec-t"><b>${esc(d.question)}</b></p>
   <p>${d.selectedAlternativeId ? `Working choice: <b>${esc(lean?.alt.title)}</b>.` : lean ? `No working choice yet. As their priorities weigh them, the drivers lean to <b>${esc(lean.alt.title)}</b>.` : 'No working choice, and the drivers do not lean either way.'}</p>
   ${said.length ? `<ul class="dk-said">${said.map(l => `<li class="${esc(l.kind)}">${esc(l.text)}</li>`).join('')}</ul>` : ''}
   <div class="dk-alts">${q.alts.map(a => { const s = stand(a); return `<div class="dk-alt${a.chosen ? ' chosen' : ''}${a.leads ? ' lead' : ''}${s?.kind === 'out' ? ' out' : ''}"><b>${a.chosen ? '● ' : a.leads ? '★ ' : ''}${esc(a.alt.id)} ${esc(a.alt.title)} <em>${esc(s?.total || '')}</em></b>${s?.line ? `<small class="dk-stand ${esc(s.kind)}">${esc(s.line)}</small>` : ''}<small>${esc(a.alt.pattern || 'no pattern recorded')}${a.alt.antiPattern ? ' · avoid: ' + esc(a.alt.antiPattern) : ''}</small><span>${names(a.patterns.records)}${names(a.anti.records)}</span><span>${a.effects.map(eff).join('')}</span></div>`; }).join('')}</div>
   <p class="cm-muted">${esc(READING_NOTE)}</p>
   <div class="cm-acts">${act('probe', `data-id="${esc(id)}" aria-pressed="${probed}"`, icon('probe') + (probed ? 'Unplug the probe' : 'Keep a probe on it'), probed ? '' : 'gold')}${chLink(3, id, 'Open in Chapter 3')}</div></section>
   <section class="dk-imp"><h4 aria-level="3">What ${esc(d.selectedAlternativeId ? 'the choice' : lean ? 'choosing it' : 'it')} reaches<span>${I.upstream.length + I.downstream.length}</span></h4>
   <h5 aria-level="4">Earlier chapters · asked whether they still hold</h5><ul>${I.upstream.map(item).join('') || '<li class="cm-muted">Nothing recorded upstream.</li>'}</ul>
   <h5 aria-level="4">Later chapters · what carries it</h5><ul>${I.downstream.map(item).join('') || '<li class="cm-muted">Nothing recorded downstream.</li>'}</ul>
   ${act('ask-decision', `data-id="${esc(id)}"`, icon('review') + `Ask these ${I.upstream.length + I.downstream.length} records to review`, 'primary')}<p class="cm-muted">Recorded as an architecture change: each record is reviewed in its own chapter, with a reviewer and a reason. Choosing or recording the decision in Chapter 3 asks the same of them.</p></section>${solBlock('D:' + id, `${id} · ${d.question}`, [], Object.fromEntries(q.alts.map(a => [a.alt.id, a.alt.title])))}`;
}
function capHTML(id) {
  const r = Cap(id), st = r.verdict.state, per = ['service', 'worker', 'adapter', 'gateway', 'identity'].includes(r.kind);
  const perV = S.explore?.perReplica?.[r.id] ?? DM.cap.objective.perReplica?.[r.id] ?? '';
  return `<section class="cm-spec dk-cap ${st}"><h4 aria-level="3">${esc(KIND[r.kind] || r.kind)} · ${esc(r.ref)}<span class="dk-v ${st}">${VERDICT[st]}</span></h4><p class="cm-spec-t"><b>${esc(r.title)}</b></p><p class="cm-muted">${esc(r.product || '')}</p>
   <div class="dk-read"><div><small>Demand</small><b>${esc(r.demand.text)}</b></div><div><small>For</small><b>${esc(DM.cap.objText)}</b></div></div>
   <dl class="cm-dl">${r.spec.map(s => `<div><dt>${esc(s.k)}</dt><dd><b>${esc(s.v)}</b>${s.d ? `<small>${esc(s.d)}</small>` : ''}</dd></div>`).join('')}${r.recorded ? `<div><dt>Chapter 7 records</dt><dd>${esc(r.recorded)}</dd></div>` : ''}${r.plan ? `<div><dt>Chapter 10 records</dt><dd>${esc(r.plan.plan.ref)} · ${r.plan.minReady ?? '?'} to ${r.plan.maxReplicas ?? '?'} replicas · ${esc(placed(r.plan))}</dd></div>` : ''}</dl>
   ${r.math.length ? `<h5 aria-level="4">The arithmetic</h5><ol class="dk-math">${r.math.map(m => `<li>${esc(m)}</li>`).join('')}</ol>` : ''}
   ${(r.facts || []).length ? `<h5 aria-level="4">Product rules</h5><ul class="dk-facts">${r.facts.map(f => `<li>${esc(f.text)} <small>${esc(f.advice)}</small><a href="${esc(safeUrl(f.src))}" target="_blank" rel="noopener noreferrer">Where it is documented</a></li>`).join('')}</ul>` : ''}
   <p class="dk-verdict ${st}">${esc(r.verdict.why)}</p>
   ${per ? `<label class="dk-in col"><span>Each replica handles</span><span><input type="number" min="1" step="10" data-dk-in="perReplica" data-id="${esc(r.id)}" value="${esc(perV)}" placeholder="${esc(r.spec.find(s => s.k === 'Each replica')?.v || '')}"> ${esc(r.demand.unit)}</span><small>Set it from a load test; it is kept with the objective.</small></label>` : ''}
   <div class="cm-acts">${r.fix ? chLink(r.fix.chapter, r.fix.id, r.fix.label, r.plan && fixes().forCell(r.plan.plan.id, 'capacity').length ? 'cm-btn' : 'cm-btn primary') : ''}${r.plan ? act('to-vitals', `data-id="${esc(r.plan.plan.id)}"`, 'See its vitals') : ''}</div></section>${r.plan ? fixFor({id: r.plan.plan.id}, 'capacity') : ''}${choiceHTML(r.id)}`;
}
function choiceHTML(id) {
  const C = DM.choices?.get(id);
  if (!C) return '';
  const n = suggestionCommands(C).length;
  const sw = fixes().byId.get('switch:' + id);
  return `<section class="dk-choice"><h4 aria-level="3">The product choice<span>${C.options.length} options</span></h4>${choiceSummaryHTML(C)}${choiceTableHTML(C)}<div class="cm-acts">${n ? act('record-suggestions', `data-id="${esc(id)}"`, `Record ${n} suggested judgement${n === 1 ? '' : 's'} in Chapter 7`, 'gold') : ''}${chLink(7, id, 'Compare the options in Chapter 7')}<button type="button" class="cm-btn" data-dk="noop" data-k-action="product-compare" data-id="${esc(id)}">Compare in Co-design</button></div></section>${sw ? fixHTML(sw) : ''}`;
}
function loadOverview() {
  const C = DM.cap, O = C.objective, short = C.rows.filter(r => r.verdict.state === 'bad' || r.verdict.state === 'warn');
  if (C.noLoad) return `<section class="cm-spec"><h4 aria-level="3">What it takes<span>no load stated</span></h4><p class="cm-spec-t"><b>No load stated</b></p><p>${esc(O.source.text)}. The desk computes no capacity reading until a person states the load: type the objective above (concurrent users or requests a second) and save it for this review, or record a scalability driver with its target in Chapter 2.</p><div class="cm-acts"><button type="button" class="cm-btn" data-dk="explore-example">Explore the SA Playbook's example, ${esc(EXAMPLE_LABEL)}</button>${chLink(2, '', 'Record a scalability driver in Chapter 2')}</div></section>`;
  return `<section class="cm-spec"><h4 aria-level="3">What it takes<span>${esc(O.source.kind === 'explore' ? 'explored' : O.source.kind)}</span></h4><p class="cm-spec-t"><b>${esc(C.objText)}</b></p><p>${esc(O.source.text)}${O.source.src ? ` <small class="cm-muted">(${esc(O.source.src)})</small>` : ''}.</p><p>${esc(C.lambdaMath)}.</p>${C.notes.map(n => `<p class="cm-muted">${esc(n)}</p>`).join('')}
   ${short.length ? `<h5 aria-level="4">Short or to check · ${short.length}</h5><div class="dk-links">${short.map(r => `<button type="button" class="cm-link" data-sel="${esc(r.id)}">${esc(r.ref)} ${esc(r.title)} · ${esc(r.spec[0]?.k.toLowerCase() || '')} ${esc(r.spec[0]?.v || '')}</button>`).join('')}</div>` : '<p>Every part the design records can carry it.</p>'}
   <div class="cm-acts">${O.source.kind === 'review' && !S.explore ? act('clear-objective', '', 'Clear the saved objective') : act('save-objective', '', icon('save') + 'Save as the review objective', 'primary')}${act('ask-load', '', icon('review') + 'Ask Chapters 2, 7 and 10 to review')}</div>
   <p class="cm-muted">Saved, the objective and its assumptions go into the SDD with this specification.</p></section>`;
}
function assumptionsHTML() {
  const A = DM.cap.objective.assume, groups = [...new Set(ASSUMPTIONS.map(a => a.group))];
  return `<section class="dk-assume"><h4 aria-level="3">Planning assumptions<span>${ASSUMPTIONS.length}</span></h4><p class="cm-muted">Numbers the design does not record. Each is a starting point to replace with evidence.</p>${groups.map(g => `<fieldset><legend>${esc(g)}</legend>${ASSUMPTIONS.filter(a => a.group === g).map(a => a.options ? `<label class="dk-in col"><span>${esc(a.label)}</span><select data-dk-in="assume" data-key="${a.key}">${a.options.map(([v, t]) => `<option value="${v}"${A[a.key] === v ? ' selected' : ''}>${t}</option>`).join('')}</select><small>${esc(a.why)}</small></label>` : `<label class="dk-in col"><span>${esc(a.label)}</span><span><input type="number" step="any" min="0" data-dk-in="assume" data-key="${a.key}" value="${esc(A[a.key])}"> ${esc(a.unit)}</span><small>${esc(a.why)}</small></label>`).join('')}</fieldset>`).join('')}</section>`;
}
// The decisions of one plan step, as Sol reads them: its drafts, then its judgements.
function stepIds(g) { return [...stepDrafts(g).map(d => 'F:' + d.id), ...stepJudgements(g).map(j => 'J:' + j.id)].slice(0, MAX_DECISIONS); }
// Sol's review notes: the first decision of each step, the most critical first.
function roundIds() { return !BASE ? [] : BASE.plan.map(g => stepIds(g)[0]).filter(Boolean).slice(0, MAX_DECISIONS); }
function solSummary(ids) {
  if (!BASE || !FX) return '';
  const es = ids.map(id => solEntry(BASE.p, BASE, FX, id)).filter(Boolean);
  if (!es.length) return '';
  const n = k => es.filter(e => !e.a.withheld && e.a.verdict === k).length, stale = es.filter(e => !e.current).length, held = es.filter(e => e.a.withheld).length;
  return `<b>Sol</b> ${Object.keys(VERDICTS).filter(n).map(k => `${n(k)} ${esc(VERDICTS[k].short.toLowerCase())}`).join(' · ')}${held ? ` · ${held} withheld` : ''}${stale ? ` · ${stale} out of date` : ''} <small>of ${ids.length}</small>`;
}
const ANTI_VITAL = {spof: 'availability', idempotency: 'integrity', queue: 'capacity', observability: 'observability', retry: 'latency'};
function antiDrafts(f) { const v = ANTI_VITAL[f.anti.id], rows = BASE.rows.filter(r => f.anti.objects.some(o => o.id === r.id || o.id === r.assetId)).map(r => r.id); return v ? fixes().drafts.filter(d => d.vital === v && d.rows.some(id => rows.includes(id))) : []; }
function previewHTML() {
  if (!S.preview || !PREV) return '';
  const E = PREV.sim, ids = S.preview.ids, one = ids.length === 1 ? fixes().byId.get(ids[0]) : null;
  return `<section class="dk-prev"><h4 aria-level="3">Previewing<span>${ids.length} draft${ids.length === 1 ? '' : 's'} · nothing applied</span></h4><p class="cm-spec-t"><b>${esc(one ? one.title : `${ids.length} drafted fixes together`)}</b></p><p class="dk-effect">${esc(describeEffect(E))}</p>${cellPills(E.changed)}
   ${E.errors.length ? `<p class="dk-verdict warn">${E.errors.length} draft${E.errors.length === 1 ? '' : 's'} could not be built on top of the others: ${esc(E.errors[0].message)}</p>` : ''}
   <div class="cm-acts">${act('fix-apply-preview', '', icon('review') + (E.commands.length > MAX_COMMANDS ? `Review the first ${MAX_COMMANDS} changes…` : `Review and apply ${E.commands.length} change${E.commands.length === 1 ? '' : 's'}…`), 'primary')}${act('fix-stop', '', 'Stop the preview')}</div>
   <p class="cm-muted">The monitor, every reading and the Running board show the desk as it would read. A reading that changes is marked, with the state it had.</p></section>`;
}
// The Scale reading (round 6, Contract K): what the recorded targets imply for each component, derived from the Chapter 2
// numbers and the Chapter 8 data and compared with the Chapter 10 placements and the reference latency figures. Two
// lines with More, as the other readings; worked out once per saved document; nothing here changes the project.
let SCALE = null, scaleDoc = null, scaleEnv = null;
function scale() { const p = project(), env = DM?.env || null; if (scaleDoc !== p || scaleEnv !== env) { scaleDoc = p; scaleEnv = env; try { SCALE = scaleReadings(p, {envId: env}); } catch (e) { console.error('Scale reading', e); SCALE = null; } } return SCALE; }
const scaleRow = x => `<li><b>${esc(x.ref)} ${esc(x.title)}</b>: ${x.qps > 0 ? `${esc(fmtN(x.qps))} req/s at peak → ${esc(fmtN(x.replicas.needed))} replica${x.replicas.needed === 1 ? '' : 's'} at ${esc(fmtN(x.replicas.perReplica))} req/s each at ${esc(fmtN(x.replicas.utilisation * 100))} %; ${x.replicas.placed == null ? 'not planned in Chapter 10' : esc(fmtN(x.replicas.placed)) + ' active placed' + (x.replicas.max != null ? ', at most ' + esc(fmtN(x.replicas.max)) : '')}` : 'no request reaches it from the entry'}${x.storageGB != null ? ` · ${esc(fmtN(x.storageGB, 1))} GB` : ''}${x.bandwidthMBs ? ` · ${esc(fmtN(x.bandwidthMBs, 2))} MB/s` : ''}<small>${esc(x.basis)}</small></li>`;
function scaleHTML() {
  const s = scale(); if (!s) return '';
  const rows = s.derived.filter(x => x.qps > 0 || x.storageGB != null);
  const rest = `${rows.length ? `<ul class="dk-scale-rows">${rows.map(scaleRow).join('')}</ul>` : ''}${s.budget ? `<p>${esc(s.budget.words)}</p>` : ''}${s.findings.length ? `<ul class="dk-scale-f">${s.findings.map(f => `<li><b>${esc(f.title)}</b> <small>${esc(CHECK_WORDS.confirm)}</small><br>${esc(f.detail)}</li>`).join('')}</ul>` : ''}${s.inputs.length ? `<p class="cm-muted">From: ${s.inputs.map(i => esc(i.words)).join('; ')}.</p>` : ''}${s.figures.length ? `<p class="cm-muted">Reference figures for estimation, not measurements: ${esc(s.figures.join(', '))} of the trade-off pack.</p>` : ''}<p class="cm-muted">Derived from the recorded targets; every number names what it rests on. Chapter 10's Validate carries each finding as to confirm.</p>`;
  return `<section class="cm-spec dk-scale"><h4 aria-level="3">Scale<span>${rows.length}</span></h4><p>${esc(s.summary)}</p>${more('scale', rest)}</section>`;
}
// One part's derived numbers in words, beside its reading.
function scaleLine(row) { const x = scale()?.derived.find(d => d.componentId === row.assetId); return x && (x.qps > 0 || x.storageGB != null) ? `<p class="cm-muted dk-scale-line">Scale: ${x.qps > 0 ? `${esc(fmtN(x.qps))} req/s at peak, ${esc(fmtN(x.replicas.needed))} replica${x.replicas.needed === 1 ? '' : 's'} derived, ${x.replicas.placed == null ? 'none planned' : esc(fmtN(x.replicas.placed)) + ' placed'}` : 'no request reaches it'}${x.storageGB != null ? `; ${esc(fmtN(x.storageGB, 1))} GB` : ''}${x.bandwidthMBs ? `; ${esc(fmtN(x.bandwidthMBs, 2))} MB/s` : ''}.</p>` : ''; }
function vitalsOverview() {
  const B = BASE, plan = B.plan.slice(0, 8), fs = B.findings, F = fixes();
  const steps = plan.map((x, i) => {
    const ds = stepDrafts(x), js = stepJudgements(x), ids = stepIds(x), sol = solSummary(ids);
    return `<div class="dk-step ${esc(x.state)}"><button type="button" class="dk-step-b" data-dk="round" data-i="${i}"><b>${esc(x.text)}</b><small>${esc(VITALS.find(v => v.id === x.vital).label)} · Chapter ${esc(x.chapter)} · ${esc(x.rows.map(r => r.ref).slice(0, 3).join(', '))}${x.rows.length > 3 ? '…' : ''}</small></button>
     <div class="dk-step-a">${ds.length ? `<span class="dk-rxn" title="Drafted from the desk's own numbers">fix ${ds.length}</span>${act('fix-preview-step', `data-i="${i}"`, 'Preview')}${act('fix-apply-step', `data-i="${i}"`, ds.length === 1 ? 'Review…' : `Review all ${ds.length}…`, 'primary')}` : `<span class="dk-rxn none">${js.length ? 'Needs your judgement' : 'Open it in its chapter'}</span>`}${ids.length ? act('sol-ask', `data-ids="${esc(ids.join(','))}" data-title="${esc(x.text)}"`, sol ? 'Ask Sol again' : 'Ask Sol', 'sol') : ''}</div>${sol ? `<p class="dk-solsum">${sol}</p>` : ''}</div>`;
  });
  const fixesN = F.drafts.filter(d => !d.switchPoint), switches = F.drafts.filter(d => d.switchPoint), cells = new Set(fixesN.flatMap(d => d.aims)).size;
  const trayMore = `<p class="cm-muted">A preview shows the monitor as it would read. Nothing is applied until you review it in the owning chapter's change review — one step at a time, so you can watch the monitor turn.</p>`
    + (switches.length ? `<h5 aria-level="4">Product choices at a switch point · ${switches.length}</h5><div class="dk-links">${switches.map(d => `<button type="button" class="cm-link warn" data-sel="F:${esc(d.id)}">${esc(d.title)}</button>`).join('')}</div>` : '')
    + (F.judgements.length ? `<details class="dk-judge"><summary>Needs your judgement · ${F.judgements.length}</summary><ul>${F.judgements.map(j => `<li><button type="button" class="cm-link" data-sel="${esc(j.row ? `C:${j.row}:${j.vital}` : '')}">${esc(j.ref)} · ${esc(VITALS.find(v => v.id === j.vital)?.label || j.vital)}</button><small>${esc(j.text)}</small></li>`).join('')}</ul></details>` : '');
  return `${previewHTML()}<section class="cm-spec"><h4 aria-level="3">Where to start<span>${B.plan.length}</span></h4><p class="cm-muted">The critical and silent vitals, grouped by what would fix them; fix counts the fixes drafted.</p><div class="dk-steps">${steps.slice(0, 3).join('')}${more('steps', steps.slice(3).join(''), `More · ${steps.length - 3} step${steps.length - 3 === 1 ? '' : 's'}`)}</div>${act('walk-next', '', icon('play') + 'Step through what to look at')}</section>
   ${scaleHTML()}
   ${F.drafts.length ? `<section class="dk-tray"><h4 aria-level="3">Drafted fixes<span>${fixesN.length}</span></h4><p>${fixesN.length} drafted from the desk's own numbers for ${cells} readings${F.judgements.length ? `; ${F.judgements.length} need${F.judgements.length === 1 ? 's' : ''} your judgement` : ''}.</p>
    <div class="cm-acts">${fixesN.length ? act('fix-preview-all', '', icon('vitals') + 'Preview them all', 'gold') : ''}${roundIds().length ? act('sol-ask', `data-ids="${esc(roundIds().join(','))}" data-title="Sol’s review notes: the first decision in each step"`, 'Sol’s review notes', 'sol') : ''}</div>
    ${more('tray', trayMore)}</section>` : ''}
   ${fs.length ? `<section class="dk-find"><h4 aria-level="3">Anti-patterns · Chapter 11 findings<span>${fs.length}</span></h4>${fs.map(f => { const ds = antiDrafts(f); return `<div class="dk-f"><b>${esc(f.anti.name)}</b><i class="dk-tr-s">${esc(f.treatment)}</i>${more('anti:' + f.anti.id, `<p>${esc(f.anti.text)}</p>${f.anti.playbook ? `<small class="sp-pb" title="${esc(f.anti.playbook.src)}">SA Playbook: “${esc(f.anti.playbook.text)}”</small>` : ''}<div class="cm-acts">${ds.length ? act('fix-preview-ids', `data-ids="${esc(ds.map(d => d.id).join(','))}"`, `fix Preview ${ds.length} drafted fix${ds.length === 1 ? '' : 'es'}`, 'gold') : ''}${f.fix ? chLink(f.fix.chapter, f.anti.objects[0]?.id, f.fix.verb, 'cm-btn') : ''}${f.finding ? act('treat', `data-id="${esc(f.finding.id)}"`, 'Treat it in Chapter 11') : ''}</div>`)}</div>`; }).join('')}<p class="cm-muted">Fix each in the chapter that owns it, or treat it here.</p></section>` : ''}`;
}
function traceOverview() {
  // Round 12 (G, GR-FIG-07): the companion names at most TRACE_CAP threads and groups and counts the rest, with the
  // filters that show them in the table.
  const G = traceGroups(), broken = DM.trace.filter(t => t.firstBreak), reviewed = DM.trace.filter(t => t.reviewed).length;
  const thread = t => `<button type="button" class="cm-link${t.firstBreak ? ' warn' : ''}" data-sel="${esc(t.id)}">${esc(describeTrace(t))}</button>`;
  const lead = broken.length ? broken : DM.trace, cap = lead.length > TRACE_CAP ? 5 : TRACE_CAP;
  const threads = `<h5 aria-level="4">${broken.length ? 'Broken threads' : 'Threads'} · ${Math.min(cap, lead.length)} of ${lead.length.toLocaleString('en-GB')}</h5><div class="dk-links">${lead.slice(0, cap).map(thread).join('')}</div>${lead.length > cap ? `<p class="cm-muted">and ${(lead.length - cap).toLocaleString('en-GB')} more${broken.length ? ` · <button type="button" class="cm-link" data-dk="trace-broken" aria-pressed="${!!S.traceBroken}">${S.traceBroken ? 'Show every thread' : 'Show only the broken threads'}</button>` : ' in the table, by group'}</p>` : ''}`;
  const groups = G.grouped ? `<h5 aria-level="4">Requirement groups · ${Math.min(TRACE_CAP, G.groups.length)} of ${G.groups.length}</h5><div class="dk-links">${G.groups.slice().sort((a, b) => b.broken - a.broken || b.rows.length - a.rows.length).slice(0, TRACE_CAP).map(x => `<button type="button" class="cm-link${x.broken ? ' warn' : ''}" data-dk="trace-group" data-id="${esc(x.key)}">${esc(groupLabel(x))} · ${x.rows.length.toLocaleString('en-GB')} requirement${x.rows.length === 1 ? '' : 's'}${x.broken ? ' · ' + x.broken + ' broken' : ''}</button>`).join('')}</div>${G.groups.length > TRACE_CAP ? `<p class="cm-muted">and ${G.groups.length - TRACE_CAP} more groups in the table</p>` : ''}` : '';
  return `<section class="cm-spec"><h4 aria-level="3">The thread<span>${DM.trace.length.toLocaleString('en-GB')}</span></h4><p class="cm-muted">Recorded design links in this environment. A complete trail requires separate implementation and test evidence.</p><p>${broken.length ? broken.length.toLocaleString('en-GB') + ' with a broken thread' : 'All recorded design paths reach runtime here'} · ${reviewed.toLocaleString('en-GB')} trail${reviewed === 1 ? '' : 's'} reviewed${G.grouped ? ` · in ${G.groups.length} requirement group${G.groups.length === 1 ? '' : 's'}` : ''}</p>${threads}${groups}</section>`;
}
function reqHTML(id) {
  const t = Req(id), runs = t.cells.runtime.map(x => Row(x.id)).filter(Boolean);
  return `<section class="cm-spec"><h4 aria-level="3">Requirement · ${esc(t.id)}<span>${t.reviewed ? 'trail reviewed' : 'not reviewed'}</span></h4><p class="cm-spec-t"><b>${esc(t.req.title)}</b></p><p>${esc(describeTrace(t))}</p><p class="cm-muted">Acceptance: ${esc(t.req.acceptance || 'not recorded')}</p>
   <dl class="cm-dl">${TRACE_COLS.filter(c => c.id !== 'vitals').map(c => `<div class="${t.cells[c.id].length ? '' : 'miss'}"><dt>${esc(c.label)}<small>Ch ${c.ch}</small></dt><dd>${t.cells[c.id].slice(0, TRACE_CAP).map(x => `<button type="button" class="cm-link" data-sel="${esc(x.id)}">${esc(x.ref)} ${esc(x.label)}</button>`).join('') || 'None recorded'}${t.cells[c.id].length > TRACE_CAP ? `<small>and ${t.cells[c.id].length - TRACE_CAP} more</small>` : ''}</dd></div>`).join('')}</dl>
   <div class="cm-acts">${runs.length ? act('probe-many', `data-ids="${esc(runs.slice(0, MAX_PROBES).map(r => r.id).join(','))}"`, icon('probe') + `Probe the parts it runs on`, 'gold') : ''}${chLink(1, t.id, 'Open in Chapter 1')}<a class="cm-btn" href="${esc(projectURL('/?chapter=11&tab=work'))}">Review the trail in Chapter 11</a></div></section>`;
}
function objectHTML(id) {
  const x = chipOf(id), p = project();
  const spec = specPanelHTML(p, id);
  return `<section class="cm-spec"><h4 aria-level="3">Chapter ${esc(x?.chapter || '')} · ${esc(x?.ref || id)}</h4><p class="cm-spec-t"><b>${esc(x?.label || id)}</b></p><div class="cm-acts">${x ? chLink(x.chapter, id, 'Open in Chapter ' + x.chapter) : ''}</div></section>${spec}`;
}
function reading() {
  if (S.view === 'board') {
    const B = board(), text = diagramText(B.D, B.L);
    return `<section><h4 aria-level="3">Reading this picture</h4><p>Every running part, inside where Chapter 10 places it, with its state in words read by rule from its eight vitals.</p>${more('read:board', `<p>Drawn in the standard notation by the same renderer as Diagram, inside the container of where Chapter 10 places it — its zone, the zones it spans, or <b>Not placed</b>, hatched — within its environment. These are design-derived states, not live telemetry. Each part carries its state in words: <b>to fix</b> while one vital reads critical, <b>to confirm</b> while one is to watch or gives no signal, <b>passing</b> otherwise; its ring and the number beside it say the same.</p><p>Above the parts stand what they run: a part <b>realizes</b> its component, a platform part <b>serves</b> the components whose recorded needs the capability it realizes meets (drawn lighter until one end is selected), and a component <b>fulfils</b> a requirement through the responsibilities it realizes.</p><p class="cm-muted">Select an element to read it here: the same record is selected on Vitals and the other views. The sidebar's layers filter the picture; Fit, the zoom and the overview move it. Nothing here changes the design.</p>`)}${text ? `<details class="nt-read"><summary>Read this picture as text</summary><pre>${esc(text)}</pre></details>` : ''}</section>`;
  }
  const [lead, rest] = S.view === 'load' ? ['The objective first, then each part beside what the objective takes of it.', 'In bands from the edge inwards: the demand, the replicas or nodes, and what follows — against what Chapters 7 and 10 record. Its verdict is in words. Select a part for the arithmetic, the product rules it rests on and where to change it.']
    : S.view === 'trace' ? ['Each row follows one requirement through the chapters, its records as chips.', 'Where nothing is recorded on the spine the thread breaks, and the first broken link is named. Select a chip to read that record; a decision opens its probe.']
    : ['Each row is one vital of one running part, read against its target.', 'Design-derived readings from recorded values against targets, not live telemetry: Critical, Watch, Normal, No signal or Not carried. Sort by any column; a monitor tile above shows one vital only. Select a row for the arithmetic and what would move it.'];
  return `<section><h4 aria-level="3">Reading this table</h4><p>${esc(lead)}</p>${more('read:' + S.view, `<p>${esc(rest)}</p><p class="cm-muted">The Running board draws every running part where it is placed, with its state in words.</p>`)}</section>`;
}
function panel() {
  const box = companion();
  if (!S.panel && !docked()) { box.innerHTML = ''; return; }
  const s = S.sel;
  let body = '';
  // Diagram and the shared views: the selected element as the notation reads it (with Open in Work and its checks),
  // then how to read the view; a selection the desk itself reads keeps the desk's own companion.
  if (diagramView()) {
    const own = s && (s.startsWith('C:') || s.startsWith('F:') || Row(s) || Cap(s) || Dec(s) || Req(s));
    const spec = s ? NT.specimenHTML(s) : '';
    const scroll = box.scrollTop;
    keepFocus(box, () => pendingHTML() + solRefusedHTML() + (spec || (own ? deskReading(s) : '')) + NT.readingHTML());
    box.scrollTop = scroll; return;
  }
  if (s?.startsWith('C:')) { const [, id, v] = s.split(':'); body = vitalDetail(Row(id), v); }
  else if (s?.startsWith('F:')) { const d = fixes().byId.get(s.slice(2)); body = d ? fixHTML(d) : ''; }
  else if (s && Row(s)) body = rowChart(Row(s));
  else if (s && Cap(s)) body = capHTML(s);
  else if (s && Dec(s)) body = decisionHTML(s);
  else if (s && Req(s)) body = reqHTML(s);
  else if (s) { const r = DM.rows.find(r => r.assetId === s); body = r ? rowChart(r) : objectHTML(s); }
  else body = S.view === 'load' ? loadOverview() : S.view === 'trace' ? traceOverview() : S.view === 'board' ? boardOverview() : vitalsOverview();
  // On the Running board a selected relationship reads first, and a selected part says its state in words.
  const onBoard = S.view === 'board' ? boardEdgeHTML() + (s && Row(boardSel()) && !s.startsWith('F:') ? boardPartHTML(Row(boardSel())) : '') + boardLinesHTML() : '';
  const scroll = box.scrollTop;
  keepFocus(box, () => pendingHTML() + solRefusedHTML() + onBoard + probesHTML() + body + (s ? '' : lensHTML()) + (S.view === 'load' ? assumptionsHTML() : '') + reading());
  box.scrollTop = scroll;
}
// Round 12 (D-14): with nothing selected, the domain lens the person chose for the project: how many of its concerns
// the design addresses and the first questions to ask, with the way to the lens on Chapter 11's Validate. Nothing
// without a lens (domain-lens.js lensCompanion).
function lensHTML() {
  let L = null; try { L = lensCompanion(project()); } catch { L = null; }
  if (!L) return '';
  const n = L.counts;
  return `<section class="cm-spec dk-lens"><h4 aria-level="3">${esc(L.ref)}<span>${n.total} concerns</span></h4><p class="dk-bsum">${n.addressed} addressed · ${n.partly} partly · ${n['not-addressed']} not addressed${n['not-applicable'] ? ' · ' + n['not-applicable'] + ' not applicable' : ''}</p>`
    + (L.asks.length ? `<h5 aria-level="4">Ask next</h5><ul class="dk-lens-asks">${L.asks.map(a => `<li><b>${esc(a.concern)}</b> ${esc(a.question)}</li>`).join('')}</ul>` : '')
    + `<p class="cm-muted">Read by rule from the records; it approves nothing and blocks nothing.</p><p><a class="cm-link" href="${esc(projectURL('/?chapter=11&tab=validate#domain-lens'))}">Open the lens</a></p></section>`;
}
// Re-render a box without taking the caret from the field being typed in.
function keepFocus(box, html) {
  const f = document.activeElement, mine = f && box.contains(f) && f.matches('input,select,textarea') ? f : null;
  const key = mine ? [mine.dataset.dkIn, mine.dataset.key || '', mine.dataset.id || ''].join('|') : null;
  let caret = null; try { caret = mine && mine.type !== 'number' ? mine.selectionStart : null; } catch { caret = null; }
  box.innerHTML = html();
  if (!key) return;
  const next = [...box.querySelectorAll('[data-dk-in]')].find(e => [e.dataset.dkIn, e.dataset.key || '', e.dataset.id || ''].join('|') === key);
  if (!next) return;
  if (next.matches('input,textarea') && next.value !== mine.value) next.value = mine.value;
  next.focus({preventScroll: true});
  try { if (caret != null) next.setSelectionRange(caret, caret); } catch { /* number inputs keep their own caret */ }
}

// ---------------------------------------------------------------- the rounds

// A ward round: the treatment plan, then the anti-patterns, one at a time.
function rounds() {
  const B = BASE;
  if (!B) return [];
  return [...B.plan.map(x => ({text: x.text, vital: x.vital, rows: x.rows.map(r => r.id), chapter: x.chapter, fix: x.first, ids: [], drafts: stepDrafts(x).map(d => d.id)})),
    ...B.findings.map(f => ({text: `${f.anti.name}: ${f.anti.text}`, vital: null, rows: B.rows.filter(r => f.anti.objects.some(o => o.id === r.id || o.id === r.assetId)).map(r => r.id), chapter: f.fix?.chapter, fix: f.fix ? {chapter: f.fix.chapter, id: f.anti.objects[0]?.id, label: f.fix.verb} : null, ids: f.anti.objects.map(o => o.id), drafts: antiDrafts(f).map(d => d.id)}))];
}
// What the desk reads of a selection, wherever it is selected.
function deskReading(s) {
  if (s.startsWith('C:')) { const [, id, v] = s.split(':'); return Row(id) ? vitalDetail(Row(id), v) : ''; }
  if (s.startsWith('F:')) { const d = fixes().byId.get(s.slice(2)); return d ? fixHTML(d) : ''; }
  return Row(s) ? rowChart(Row(s)) : Cap(s) ? capHTML(s) : Dec(s) ? decisionHTML(s) : Req(s) ? reqHTML(s) : '';
}
function walkBar() {
  // The picture and the other read-only views only need the count. Creating each round's draft commands waits until
  // the person opens Vitals, where the controls actually use them.
  const bar = root.querySelector('.cm-walk-in'), n = (BASE?.plan.length || 0) + (BASE?.findings.length || 0);
  if (diagramView()) { bar.innerHTML = `<p class="cm-walk-text">${n ? `${n} things to look at, the most critical first, are walked on the Vitals view.` : 'Select an element to read it in the companion.'}</p>`; return; }
  if (S.view !== 'vitals' || !n) { bar.innerHTML = `<p class="cm-walk-text">${S.view === 'load' ? 'Change the objective or an assumption: every part is read again.' : S.view === 'trace' ? 'Select a requirement to follow its thread.' : S.view === 'board' ? `Select a running part to read its vitals${n ? `; ${n} things to look at, the most critical first, are walked on the Vitals view` : ''}.` : 'Nothing reads critical: no rounds to walk.'}</p>`; return; }
  const R = rounds();
  const cur = S.walk >= 0 ? R[S.walk] : null;
  const rx = cur?.drafts?.length ? `<button type="button" class="cm-btn gold" data-dk="fix-preview-ids" data-ids="${esc(cur.drafts.join(','))}">fix Preview ${cur.drafts.length} drafted fix${cur.drafts.length === 1 ? '' : 'es'}</button><button type="button" class="cm-btn primary" data-dk="fix-apply-ids" data-ids="${esc(cur.drafts.join(','))}">Review…</button>` : '';
  bar.innerHTML = `<button type="button" class="cm-btn" data-dk="walk-prev" aria-label="Previous" ${S.walk <= 0 ? 'disabled' : ''}>‹</button><button type="button" class="cm-btn" data-dk="walk-next">${S.walk < 0 ? icon('play') + '<span>Step through what to look at</span>' : S.walk >= n - 1 ? 'Done' : 'Next ›'}</button><p class="cm-walk-text">${cur ? `<b>${S.walk + 1} / ${n}</b> ${esc(cur.text)}${cur.fix ? ` <a href="${esc(chapterURL(cur.fix.chapter, cur.fix.id))}">${esc(cur.fix.label || 'Open Chapter ' + cur.fix.chapter)} →</a>` : ''}` : `${n} things to look at, the most critical first.`}</p>${rx}${S.walk >= 0 ? '<button type="button" class="cm-btn icon" data-dk="walk-stop" aria-label="Stop the rounds">×</button>' : ''}`;
}
function walkTo(i) {
  const R = rounds();
  if (!R.length) return;
  if (S.view !== 'vitals' || S.filter !== 'all') { S.view = 'vitals'; S.filter = 'all'; fitPending = true; }
  S.walk = Math.max(-1, Math.min(R.length - 1, i)); S.sel = null;
  render();
  const w = R[S.walk]; if (!w) return;
  root.querySelector('.dk-sheet tr.lit')?.scrollIntoView({block: 'nearest'});
}

// ---------------------------------------------------------------- asking for review, saving the objective

// Desk records are attributed to the signed-in account (audit F-19), not to a name the browser remembers;
// the server records the same account on every command whatever the form sends.
let signedIn = null;
async function signedInAccount() {
  if (signedIn !== null) return signedIn;
  try { const r = await fetch(projectURL('/api/access'), {credentials: 'same-origin'}); signedIn = r.ok ? String((await r.json()).actor || '') : ''; } catch { signedIn = ''; }
  return signedIn;
}
const accountField = (name, label, who) => who
  ? `<label class="l-field"><span>${esc(label)}</span><input name="${esc(name)}" readonly value="${esc(who)}" aria-describedby="dk-account-note"><small id="dk-account-note">The signed-in account. Another person signs in with their own account.</small></label>`
  : `<label class="l-field"><span>${esc(label)}</span><input name="${esc(name)}" required maxlength="180"></label>`;
function dialog(title, body) {
  document.querySelector('.dk-dialog')?.remove();
  const d = document.createElement('dialog'); d.className = 'l-dialog dk-dialog'; d.setAttribute('aria-labelledby', 'dk-dialog-title');
  d.innerHTML = `<header><div><span class="eyebrow">Review desk</span><h2 id="dk-dialog-title">${esc(title)}</h2></div><button type="button" class="btn" data-dk-close aria-label="Close">×</button></header><div class="l-error dk-err" role="alert" hidden></div>${body}`;
  document.body.append(d);
  d.addEventListener('click', e => { if (e.target.closest('[data-dk-close]')) { e.preventDefault(); d.close(); d.remove(); } });
  d.addEventListener('close', () => d.remove());
  d.showModal();
  d.querySelector('input:not([type=checkbox]),textarea')?.focus();
  return d;
}
function titleOf(p, ch, id) {
  const lists = {1: p.artefacts, 2: p.quality?.drivers, 3: p.decisions?.records, 4: p.logical?.responsibilities, 5: p.realisation?.components, 6: p.technology?.capabilities, 7: p.technologyRealisation?.records, 8: [...(p.interfaces?.contracts || []), ...(p.interfaces?.data || [])], 9: [...(p.security?.threats || []), ...(p.security?.controls || [])], 10: p.runtime?.plans};
  const r = (lists[ch] || []).find(x => x.id === id); return r ? `${r.ref || r.id} · ${r.title || r.question || ''}` : id;
}
// source: {chapter, id, kind}; items: [{chapter, id, why}]
async function askReview(source, items, reason) {
  const p = project();
  if (!items.length) return;
  const who = await signedInAccount();
  const body = `<form class="dk-form"><p>${esc(items.length)} record${items.length === 1 ? '' : 's'} will be asked to review. Each is reviewed in its own chapter, where the reviewer records whether it still holds, was revised, or needs a follow-up.</p>
   <fieldset class="dk-items">${items.map((x, i) => `<label class="l-checkbox"><input type="checkbox" name="item" value="${i}" checked><span><b>Ch ${esc(x.chapter)} · ${esc(titleOf(p, x.chapter, x.id))}</b><small>${esc(x.why)}</small></span></label>`).join('')}</fieldset>
   <label class="l-field"><span>Why the review is needed</span><textarea name="reason" rows="3" required maxlength="2000">${esc(reason)}</textarea></label>
   ${accountField('by', 'Asked by', who)}
   <label class="l-checkbox"><input type="checkbox" name="reviewed" required> I have read what the desk shows and want these records reviewed.</label>
   <div class="l-dialog-actions"><button type="button" class="btn" data-dk-close>Cancel</button><button type="submit" class="btn primary">Ask for review</button></div></form>`;
  const d = dialog('Ask for review', body);
  d.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, fd = new FormData(f), chosen = fd.getAll('item').map(Number).map(i => items[i]).filter(Boolean);
    if (!chosen.length) return fail(d, 'Choose at least one record to review.');
    await send(d, {type: 'change.request', payload: {source, items: chosen, reason: fd.get('reason'), requestedBy: fd.get('by'), reviewed: fd.has('reviewed')}}, doc => { const ev = doc.changes?.events?.at(-1); return {text: `${ev?.id || 'The request'} recorded: ${chosen.length} record${chosen.length === 1 ? '' : 's'} asked to review.`, eventId: ev?.id}; });
  });
}
async function saveObjective() {
  if (S.preview) { S.preview = null; rebuild(); render(); }
  const who = await signedInAccount();
  const O = DM.cap.objective;
  const body = `<form class="dk-form"><p>Save <b>${esc(DM.cap.objText)}</b> as the objective this review plans for, with its ${ASSUMPTIONS.length} planning assumptions${Object.keys(O.perReplica || {}).length ? ' and the throughput set for ' + Object.keys(O.perReplica).length + ' part' + (Object.keys(O.perReplica).length === 1 ? '' : 's') : ''}. The SDD then carries the performance specification it asks for.</p>
   <p class="cm-muted">${esc(DM.cap.lambdaMath)}.</p>
   <label class="l-field"><span>Why this objective</span><textarea name="rationale" rows="3" maxlength="2000">${esc(O.source.kind === 'playbook' ? 'Proposed from the SA Playbook example; explain why this workload is appropriate before recording it.' : '')}</textarea></label>
   ${accountField('reviewer', 'Set by', who)}
   <label class="l-checkbox"><input type="checkbox" name="reviewed" required> I have reviewed the objective and its assumptions.</label>
   <div class="l-dialog-actions"><button type="button" class="btn" data-dk-close>Cancel</button><button type="submit" class="btn primary">Save the objective</button></div></form>`;
  const d = dialog('Save the review objective', body);
  d.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const ok = await send(d, {type: 'review.objective', payload: {kind: O.kind, value: O.value, assumptions: O.assume, perReplica: O.perReplica, surge: O.surge ? O.surge.on : true, reviewer: fd.get('reviewer'), rationale: fd.get('rationale'), reviewed: fd.has('reviewed')}}, () => ({text: `Saved: this review plans for ${DM.cap.objText}. The SDD carries its performance specification.`}));
    if (ok) { S.explore = null; save(); rebuild(); render(); }
  });
}
function clearObjective() {
  const d = dialog('Clear the review objective', `<form class="dk-form"><p>The desk goes back to ${esc(DM.R.drivers.some(x => x.category === 'scalability') ? 'the Chapter 2 scalability driver' : 'no stated load')}, and the SDD no longer carries this performance specification.</p><div class="l-dialog-actions"><button type="button" class="btn" data-dk-close>Cancel</button><button type="submit" class="btn primary">Clear it</button></div></form>`);
  d.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); await send(d, {type: 'review.objective-clear', payload: {}}, () => ({text: 'The review objective is cleared.'})); });
}
function fail(d, message) { const e = d.querySelector('.dk-err'); e.hidden = false; e.textContent = message; e.scrollIntoView({block: 'nearest'}); return false; }
async function send(d, command, done) {
  const store = window.aiwProjectStore;
  if (!store?.command) return fail(d, 'Open the project to save changes.');
  if (busy) return false;
  // A staged design change is reviewed inside this dialog, not in a second one stacked on it (F2-01).
  try { const {reviewChangeInDialog} = await import('./workbench-ui.js'); command = await reviewChangeInDialog(d, store.value?.document, command); } catch (err) { return fail(d, err.message); }
  if (!command) return false;
  busy = true; d.querySelectorAll('button[type=submit]').forEach(b => { b.disabled = true; });
  try {
    await store.command(command);
    d.close(); d.remove();
    flash = done(store.value.document) || null;
    document.dispatchEvent(new CustomEvent('aiw:external-project'));
    rebuild(store.value.document); render();
    return true;
  } catch (e) { return fail(d, e?.message || 'The change could not be saved. Your input is still here.'); }
  finally { busy = false; d.querySelectorAll('button[type=submit]').forEach(b => { b.disabled = false; }); }
}
function askFor(k, id) {
  if (S.preview) { S.preview = null; rebuild(); render(); }
  if (k === 'ask-part') { const row = Row(id); if (row) askReview({chapter: 10, id: row.id, kind: 'runtime plan'}, partReviewItems(DM, row), `The review desk reads ${row.ref} ${row.title} as ${VSTATE[row.state].label.toLowerCase()}: ${describeRow(DM, row)}`); return; }
  if (k === 'ask-decision') { const q = decisionProbe(DM, id); if (!q) return; const I = q.implications, lean = q.alts.find(a => a.alt.id === q.lean); askReview({chapter: 3, id, kind: 'decision'}, [...I.upstream, ...I.downstream].map(x => ({chapter: x.chapter, id: x.id, why: x.why})), `${id} ${q.decision.selectedAlternativeId ? 'has a working choice' : 'leans'}: ${lean?.alt.title || 'no alternative yet'}. Review what it asks of each record.`); return; }
  if (k === 'ask-load') { const items = capacityReviewItems(DM); if (!items.length) { flash = {text: 'Nothing is short for this objective: no review to ask for.'}; render(); return; } const src = items.find(x => x.chapter === 10) || items[0]; askReview({chapter: src.chapter, id: src.id, kind: 'capacity'}, items, `The review desk plans for ${DM.cap.objText} (${DM.cap.lambdaMath}). ${DM.cap.counts.bad} part${DM.cap.counts.bad === 1 ? ' is' : 's are'} short as recorded.`); return; }
  // The header's "Ask for review": whatever is selected, else the worst running part.
  const s = S.sel;
  if (s && Dec(s)) return askFor('ask-decision', s);
  if (s && (Row(s) || s.startsWith('C:'))) return askFor('ask-part', Row(s) ? s : s.split(':')[1]);
  if (S.view === 'load') return askFor('ask-load');
  const worst = DM.rows.slice().sort((a, b) => b.vitals.filter(v => v.state === 'bad').length - a.vitals.filter(v => v.state === 'bad').length)[0];
  if (worst) askFor('ask-part', worst.id);
}

// ---------------------------------------------------------------- previewing and applying drafted fixes

function preview(ids) {
  ids = ids.filter(id => fixes().byId.has(id) && !fixes().byId.get(id).switchPoint);
  if (!ids.length || !BASE) return;
  const same = S.preview && S.preview.ids.length === ids.length && ids.every(id => S.preview.ids.includes(id));
  S.preview = same ? null : {ids, base: BASE.p};
  S.walk = -1;
  if (S.preview && S.view === 'trace') { S.view = 'vitals'; fitPending = true; }
  rebuild(); render();
  const box = companionNow(); if (box && S.preview && !S.sel) box.scrollTop = 0;
}
function stopPreview() { if (!S.preview) return; S.preview = null; rebuild(); render(); }
const chapterWords = chs => chs.length === 1 ? `Chapter ${chs[0]}'s change review` : `the change review of Chapters ${chs.join(', ')}`;
// Build the drafts on the design as recorded, show them in the platform's own change review, and
// send what the architect confirms. Up to MAX_COMMANDS changes go in one review; the rest stay drafted.
async function applyDrafts(ids) {
  const store = window.aiwProjectStore, p = project();
  if (!store?.command || !p || !BASE) { flash = {text: 'Open the project to apply a drafted fix.'}; render(); return; }
  if (busy) return;
  const ds = ids.map(id => fixes().byId.get(id)).filter(Boolean);
  const C = compose(p, ds, S.values, {limit: MAX_COMMANDS});
  if (!C.commands.length) { flash = {text: C.errors[0] ? `The draft could not be built: ${C.errors[0].message}` : 'Nothing left to change: the design already records it.'}; render(); return; }
  const used = ds.filter(d => C.used.includes(d.id)), E = simulate(p, used, S.values, {before: BASE}), chs = [...new Set(used.map(d => d.chapter))].sort((a, b) => a - b);
  const intro = `<div class="dk-rv"><p><b>Drafted on the review desk</b> from its own numbers, as ${chs.length === 1 ? `Chapter ${chs[0]}'s` : 'each chapter\'s'} own ${C.commands.length === 1 ? 'change' : C.commands.length + ' changes'}. Every changed field is below; drafted values are marked unconfirmed.</p><p class="dk-rv-e">On the desk: ${esc(describeEffect(E))}</p>${used.length < ds.length ? `<p class="cm-muted">${used.length} of ${ds.length} drafts fit in one review of up to ${MAX_COMMANDS} changes; the others stay drafted for the next.</p>` : ''}</div>`;
  const reason = used.map(d => `${d.title}. ${d.why}`).join('\n').slice(0, 1900);
  let cmd = null;
  try { const {reviewDesignChanges} = await import('./workbench-ui.js'); cmd = await reviewDesignChanges(p, C.commands, {intro, reason}); }
  catch (e) { flash = {text: e?.message || 'The change review could not open.'}; render(); return; }
  if (!cmd) return;
  busy = true;
  try { await store.command(cmd); }
  catch (e) { flash = {text: e?.message || 'The change could not be saved.'}; render(); return; }
  finally { busy = false; }
  const before = BASE;
  S.preview = null;
  const withSol = used.filter(d => S.solUsed[d.id]).length;
  if (cmd.type === 'workspace.apply') for (const d of used) { const u = S.solUsed[d.id]; if (u) { try { await solRecord(u.runId, u.itemId, 'applied'); } catch { /* the change stands; its provenance can be recorded later */ } delete S.solUsed[d.id]; } }
  for (const d of used) delete S.values[d.id];
  document.dispatchEvent(new CustomEvent('aiw:external-project'));
  rebuild(store.value.document);
  if (cmd.type === 'workspace.apply') {
    const X = deskDiff(before, BASE);
    flash = {text: `Applied through ${chapterWords(chs)}: ${used.length === 1 ? used[0].title : used.length + ' drafted fixes'}${withSol ? ` — with Sol’s refinements${used.length > 1 ? ` on ${withSol}` : ''}` : ''}. ${describeEffect(X)}`};
    S.pulse = new Set([...X.changed, ...X.moved].map(c => c.row + ':' + c.vital));
    clearTimeout(applyDrafts._t); applyDrafts._t = setTimeout(() => { S.pulse = null; if (root?.isConnected) render(); }, 2600);
  } else flash = {text: `Kept as a design alternative, “${cmd.payload.title}”: nothing changed in the working design. Compare it in the workbench.`};
  render();
}

// ---------------------------------------------------------------- Sol at the desk

const solRender = () => { if (root?.isConnected) { render(); } };
// rc41 close: a preparation Sol refused says why where its packet would stand (pendingHTML draws SOL.error only inside a
// prepared packet), as Chapter 10's round does (chapter-sol.js); a failed ask is never silent.
function solRefusedHTML() { return SOL.error && !SOL.pending ? `<p class="dk-verdict bad" role="alert">${esc(SOL.error)}</p>` : ''; }
async function solAsk(ids, title, priorRunId = null) {
  ids = ids.filter(Boolean).slice(0, MAX_DECISIONS);
  if (!ids.length) return;
  const values = Object.fromEntries(ids.filter(id => id.startsWith('F:')).map(id => id.slice(2)).filter(id => S.values[id]).map(id => [id, S.values[id]]));
  await solPrepare({ids, scope: ids.length === 1 ? ids[0] : 'desk:' + (title || 'decisions').slice(0, 80), objective: S.explore || null, values, ...(priorRunId ? {priorRunId, prompt:'What should we refine or reconsider in this reasoning, given the current sources?'} : {})}, {title, onChange: solRender});
  const box = companionNow(); if (box && (SOL.pending || SOL.error)) box.scrollTop = 0;
}
async function solSendNow(panel) {
  const run = await solSend({panel, onChange: solRender});
  if (run) { flash = {text: SOL.note}; SOL.stamps = new Map(); render(); }
}
async function solNoted(fn) {
  try { await fn(); document.dispatchEvent(new CustomEvent('aiw:external-project')); rebuild(scopedProject()); return true; }
  catch (e) { flash = {text: e?.message || 'Sol’s advice could not be recorded.'}; render(); return false; }
}
async function solUse(runId, itemId) {
  const e = SOL.byItem.get(itemId), draftId = itemId.slice(2);
  if (!e || e.run.id !== runId || !fixes().byId.get(draftId) || !e.a.refinements.length) return;
  if (!(await solNoted(() => solRecord(runId, itemId, 'used')))) return;
  const next = {...(S.values[draftId] || {})};
  for (const r of e.a.refinements) next[r.key] = r.value;
  S.values = {...S.values, [draftId]: next}; S.solUsed = {...S.solUsed, [draftId]: {runId, itemId, keys: e.a.refinements.map(r => r.key)}};
  flash = {text: `Sol’s refinements are in the draft — ${e.a.refinements.map(r => r.label).join(', ')}. The desk shows the design with them; review and apply when you are satisfied.`};
  if (fixes().byId.get(draftId) && !fixes().byId.get(draftId).switchPoint) { S.preview = {ids: [draftId], base: BASE.p}; rebuild(); }
  render();
}
async function solThreats(runId, itemId, box) {
  const e = SOL.byItem.get(itemId), store = window.aiwProjectStore;
  if (!e || e.run.id !== runId || !store?.command) return;
  const chosen = [...(box?.querySelectorAll('[data-sol-threat]:checked') || [])].map(i => e.a.proposals[Number(i.dataset.solThreat)]).filter(Boolean);
  if (!chosen.length) { flash = {text: 'Choose at least one proposed threat to review.'}; render(); return; }
  if (!(await solNoted(() => solRecord(runId, itemId, 'used')))) return;
  const p = project(), commands = chosen.map(x => ({type: 'security.threat', payload: {id: null, title: x.title, category: x.category, priority: x.priority, targetIds: x.targetIds, actor: '', scenario: x.scenario, consequence: x.consequence, owner: '',
    priorityBasis: `Proposed by Sol (${e.run.model}); confirm the priority with the security owner.`, assumptions: 'Proposed by Sol from the review desk’s reading and the project’s records. Confirm the actor, scenario and priority before relying on it.', assumptionsResolved: false, origin: 'suggestion'}}));
  let cmd = null;
  try { const {reviewDesignChanges} = await import('./workbench-ui.js'); cmd = await reviewDesignChanges(p, commands, {intro: `<div class="dk-rv"><p><b>Proposed by Sol</b> at the review desk, as Chapter 9’s own threat records. Sol proposes; you decide what is a threat here.</p></div>`, reason: `Threats Sol proposed for ${e.item?.title || itemId}: ${chosen.map(x => x.title).join('; ')}.`}); }
  catch (err) { flash = {text: err.message}; render(); return; }
  if (!cmd) return;
  try { await store.command(cmd); } catch (err) { flash = {text: err.message}; render(); return; }
  if (cmd.type === 'workspace.apply') await solNoted(() => solRecord(runId, itemId, 'applied'));
  else { document.dispatchEvent(new CustomEvent('aiw:external-project')); rebuild(store.value.document); }
  flash = {text: cmd.type === 'workspace.apply' ? `Recorded in Chapter 9: ${chosen.length} threat${chosen.length === 1 ? '' : 's'} Sol proposed. The desk now reads their coverage.` : `Kept as a design alternative, “${cmd.payload.title}”.`};
  render();
}
async function solDismiss(itemId, reason) {
  const e = SOL.byItem.get(itemId);
  if (!e) return;
  if (await solNoted(() => solRecord(e.run.id, itemId, 'dismissed', reason))) { flash = {text: 'Recorded: you disagreed with Sol, and why. It goes to the knowledge stewards with the sources the advice rested on.', stewards: true}; render(); }
}

// ---------------------------------------------------------------- interaction

function revealSelection() {
  if (!S.sel || !root) return;
  if (diagramView()) { const b = NT.layout()?.nodes?.find(n => n.id === S.sel); if (b) stage.reveal(b.x, b.y, b.w, b.h); return; }
  if (S.view === 'board') { const id = boardSel(), b = id && RB?.L.nodes.find(n => n.id === id); if (b) stage.reveal(b.x, b.y, b.w, b.h); return; }
  const box = root.querySelector('.dk-sheet'), el = box?.querySelector(`[data-card="${CSS.escape(S.sel)}"]`) || box?.querySelector('tr.sel, .sel'); el?.scrollIntoView({block: 'nearest'});
}
// Sol's context follows what is selected on the desk, as it does on every chapter model: a vital or a part reads as
// its running part, a drafted fix as the project.
function announceSelection() {
  const p = project(), t = S.sel?.startsWith('C:') ? S.sel.split(':')[1] : S.sel?.startsWith('F:') ? null : S.sel;
  if (mode === 'model') announceObject(t);
  if (p && mode === 'model') { try { mountBrainContext(p, {id: t || 'project', chapter: 11}, 'model'); } catch { /* assistance is optional */ } }
}
function select(id, {reveal = false} = {}) {
  S.sel = id || null; S.walk = -1;
  // On the Running board an element and a relationship are not selected together.
  if (S.sel && NT?.state.selEdge) NT.state.selEdge = null;
  announceSelection();
  if (S.sel && !S.panel) S.panel = true;
  save(); render();
  const box = companionNow(); if (box) box.scrollTop = 0;
  if (reveal) revealSelection();
}
function toggleProbe(id) {
  if (!id) return;
  if (S.probes.includes(id)) S.probes = S.probes.filter(x => x !== id);
  else { S.probes = [...S.probes, id].slice(-MAX_PROBES); }
  save(); render();
}
// The same thing, seen from another view: a running part becomes what the objective asks of it,
// and back; a vital becomes its part.
function carry(sel, v) {
  if (!sel) return null;
  const part = sel.startsWith('C:') ? Row(sel.split(':')[1]) : Row(sel);
  if (v === 'load') return part ? (Cap(part.assetId) ? part.assetId : null) : Cap(sel) ? sel : null;
  if (v === 'vitals') { if (part) return sel; const r = DM.rows.find(r => r.assetId === sel); return r ? r.id : Dec(sel) ? sel : null; }
  if (part) return part.id;
  // The Running board draws the components and the requirements too: they stay selected; a platform product reads
  // as the part that runs it.
  if (v === 'board') { const r = DM.rows.find(x => x.assetId === sel && x.assetKind !== 'component'); return r ? r.id : known(sel) ? sel : null; }
  const r = Cap(sel) ? DM.rows.find(r => r.assetId === sel) : null;
  return r ? r.id : known(sel) ? sel : null;
}
function setView(v) {
  if (!allViews().includes(v)) return;
  v = NT.settle(v);
  // Into Diagram and the shared views a part or a vital is carried as its record; back, the desk reads what it knows.
  S.sel = ownView(v) ? carry(S.sel, v) : S.sel?.startsWith('C:') ? S.sel.split(':')[1] : S.sel?.startsWith('F:') ? null : S.sel;
  if (S.view === 'board' && v !== 'board' && NT) NT.state.selEdge = null;
  S.view = v; S.walk = -1; fitPending = true; save(); render(); revealSelection();
}
let inputTimer = null;
let fixTimer = null;
function onFixInput(el) {
  const id = el.dataset.id, key = el.dataset.key, d = fixes().byId.get(id), knob = d?.knobs.find(k => k.key === key);
  if (!knob) return;
  const v = knob.type === 'number' ? num(el.value) : el.value;
  if (knob.type === 'number' && (v == null || v < (knob.min ?? 0))) return;
  S.values = {...S.values, [id]: {...(S.values[id] || {}), [key]: v}};
  clearTimeout(fixTimer);
  fixTimer = setTimeout(() => { if (S.preview?.ids.includes(id)) { rebuild(); render(); } else panel(); }, knob.type === 'textarea' ? 450 : 260);
}
function onInput(el) {
  const k = el.dataset.dkIn, O = DM.cap.objective;
  if (k === 'fix') { onFixInput(el); return; }
  const next = structuredClone(S.explore || {kind: O.kind, value: O.value, assumptions: {}, perReplica: {}, surge: O.surge ? O.surge.on : true});
  next.assumptions ||= {}; next.perReplica ||= {};
  if (next.value == null) next.value = O.value;
  if (!next.kind) next.kind = O.kind;
  if (k === 'value') { const v = num(el.value); if (v == null || v <= 0) return; next.value = v; delete next.example; }
  else if (k === 'kind') { next.kind = el.value === 'rate' ? 'rate' : 'users'; delete next.example; }
  else if (k === 'surge') next.surge = el.checked;
  else if (k === 'assume') { const a = ASSUMPTIONS.find(x => x.key === el.dataset.key); if (!a) return; if (a.options) next.assumptions[a.key] = el.value; else { const v = num(el.value); if (v == null || v < 0) return; next.assumptions[a.key] = v; } }
  else if (k === 'perReplica') { const v = num(el.value); if (v == null || v <= 0) delete next.perReplica[el.dataset.id]; else next.perReplica[el.dataset.id] = v; }
  else return;
  // Keep whatever the saved objective or the driver already said, so only what was changed differs.
  const saved = project()?.finalReview?.capacity;
  if (saved) { next.assumptions = {...(saved.assumptions || {}), ...next.assumptions}; next.perReplica = {...(saved.perReplica || {}), ...next.perReplica}; }
  S.explore = next; save();
  clearTimeout(inputTimer);
  inputTimer = setTimeout(() => { rebuild(); const f = document.activeElement; render(); if (f && root.contains(f) === false) { /* focus moved */ } }, el.type === 'number' ? 260 : 0);
}
function bind() {
  on('click', e => {
    if (root.dataset.suppress) return;
    // A relationship on the Running board is the board's (its edges are not the notation's picture).
    // Round 10 (N6): a line drawn for several relationships (the serves fan into a component, say) selects the element
    // they share, whose reading lists them; a relationship named in a reading selects that relationship.
    const bh = S.view === 'board' && e.target.closest('.cm-svg .nt-bhit[data-nt-select]');
    if (bh && root.contains(bh)) { if (NT) NT.state.selEdge = null; select(bh.dataset.ntSelect); return; }
    const pick = S.view === 'board' && e.target.closest('[data-nt="edge-pick"]');
    if (pick && RB?.D.edges.some(x => x.id === pick.dataset.id)) { const id = pick.dataset.id; NT.state.selEdge = null; toggleBoardEdge(id); nextFrame(() => root.querySelector(`.cm-svg .nt-hit[data-nt-edge="${CSS.escape(id)}"]`)?.focus({preventScroll: true})); return; }
    const hit = S.view === 'board' && e.target.closest('.cm-svg .nt-hit');
    if (hit && root.contains(hit)) { toggleBoardEdge(hit.dataset.ntEdge); return; }
    if (NT?.handle(e)) return;
    if (e.target.closest('a[href]')) return;
    const a = e.target.closest('[data-dk]');
    if (a && !a.disabled) {
      const k = a.dataset.dk;
      if (k === 'view') { setView(a.dataset.id); return; }
      if (k === 'focus') { S.focus = S.focus === a.dataset.id ? null : a.dataset.id; S.walk = -1; if (S.focus && S.sel?.startsWith('C:')) S.sel = `C:${S.sel.split(':')[1]}:${S.focus}`; if (S.view !== 'vitals') { S.view = 'vitals'; fitPending = true; } render(); return; }
      if (k === 'sort') { setSort(a.dataset.view, a.dataset.id); return; }
      if (k === 'na-toggle') { S.showNa = !S.showNa; render(); return; }
      // Round 12 (G, GR-FIG-07): the trace by group, paged, and its broken-only filter.
      if (k === 'trace-group') { S.traceOpen = a.getAttribute('aria-expanded') === 'true' ? '' : a.dataset.id; if (S.view !== 'trace') setView('trace'); else render(); return; }
      if (k === 'trace-more') { (S.traceShown ||= {})[a.dataset.id] = Number(a.dataset.n || 0) + TRACE_PAGE; render(); return; }
      if (k === 'trace-broken') { S.traceBroken = !S.traceBroken; if (S.view !== 'trace') setView('trace'); else render(); return; }
      // Round 12 (G, GR-FIG-11): the Running board drawn whole, or grouped again.
      if (k === 'board-all' || k === 'board-group') { S.boardWhole = k === 'board-all'; RB = null; fitPending = true; render(); return; }
      if (k === 'board-member') { const x = RB?.full.edges.find(e => e.id === a.dataset.id); if (x) { if (NT) NT.state.selEdge = null; select(x.from); } return; }
      if (k === 'state-more') { const st = root.querySelector('.cm-state'), open = !st.classList.contains('open'); st.classList.toggle('open', open); a.setAttribute('aria-expanded', String(open)); a.textContent = open ? 'Less' : 'More'; return; }
      if (k === 'filter') { S.filter = a.dataset.id; fitPending = true; save(); render(); return; }
      if (k === 'probe') { e.stopPropagation(); toggleProbe(a.dataset.id); return; }
      if (k === 'probe-many') { const ids = a.dataset.ids.split(',').filter(Boolean); S.probes = [...new Set([...S.probes, ...ids])].slice(-MAX_PROBES); save(); setView('vitals'); return; }
      if (k === 'clear') { select(null); return; }
      if (k === 'expand') { const on = !document.body.classList.contains('cm-expanded'); document.body.classList.toggle('cm-expanded', on); a.setAttribute('aria-pressed', String(on)); sizeModel(root, 'cm-expanded'); fitPending = true; nextFrame(() => render()); return; }
      if (k === 'panel') { S.panel = !S.panel; save(); fitPending = true; render(); nextFrame(() => { fitPending = true; render(); }); return; }
      if (k === 'key') { const key = root.querySelector('.cm-key'); key.classList.toggle('cm-min'); a.setAttribute('aria-expanded', String(!key.classList.contains('cm-min'))); return; }
      if (k === 'fit') { stage.fitAll(); return; }
      if (k === 'zin' || k === 'zout') { const {w, h} = stage.box(); stage.zoomAt(stage.cam.z * (k === 'zin' ? 1.15 : 1 / 1.15), w / 2, h / 2); return; }
      if (k === 'walk-next') { if (S.walk >= rounds().length - 1) { S.walk = -1; render(); } else walkTo(S.walk + 1); return; }
      if (k === 'walk-prev') { walkTo(Math.max(0, S.walk - 1)); return; }
      if (k === 'walk-stop') { S.walk = -1; render(); return; }
      if (k === 'round') { walkTo(Number(a.dataset.i)); return; }
      if (k === 'to-load') { S.view = 'load'; fitPending = true; select(a.dataset.id, {reveal: true}); return; }
      if (k === 'to-vitals') { S.view = 'vitals'; S.filter = 'all'; fitPending = true; select(a.dataset.id, {reveal: true}); return; }
      if (k === 'save-objective') { saveObjective(); return; }
      if (k === 'clear-objective') { clearObjective(); return; }
      if (k === 'record-suggestions') { const C = DM.choices?.get(a.dataset.id); if (C) recordSuggestions(C, {onDone: n => { flash = {text: `${n} judgement${n === 1 ? '' : 's'} recorded in Chapter 7 for ${C.record.ref}.`}; rebuild(scopedProject()); render(); }}); return; }
      if (k === 'reset-objective') { S.explore = null; save(); rebuild(); render(); return; }
      // Round 12 (G, GR-RUN-04): the playbook's example is explored only on this click, every figure it feeds labelled.
      if (k === 'explore-example') { S.explore = {example: true, assumptions: {}, perReplica: {}}; save(); rebuild(); render(); return; }
      if (k === 'treat') { const id = a.dataset.id; if (window.aiwReviewPage?.treat) window.aiwReviewPage.treat(id); else { const href = projectURL('/?chapter=11&tab=validate'); if (!window.aiwRoute?.(href)) location.href = href; } return; }
      if (k === 'open-change') { import('./changes-ui.js').then(m => m.openChangeReview({eventId: a.dataset.id, chapter: 'all'})).catch(e => reportFailure('The change review could not open. Check your connection and try again.', e)); return; }
      if (k === 'flash-off') { flash = ''; render(); return; }
      if (k === 'edge-clear') { if (NT) NT.state.selEdge = null; render(); return; }
      if (k === 'sol-ask') { solAsk(a.dataset.ids.split(','), a.dataset.title || '', a.dataset.priorRun || null); return; }
      if (k === 'sol-send') { solSendNow(a.closest('.dk-solpend')); return; }
      if (k === 'sol-cancel') { solCancel(solRender); return; }
      if (k === 'sol-use') { solUse(a.dataset.run, a.dataset.item); return; }
      if (k === 'sol-threats') { solThreats(a.dataset.run, a.dataset.item, a.closest('.dk-sol')); return; }
      if (k === 'sol-stewards') { if (window.aiwKnowledge?.openView) window.aiwKnowledge.openView('stewardship'); else document.querySelector('[data-brain-launch="mind"]')?.click(); return; }
      if (k === 'sol-agree') { solNoted(() => solRecord(a.dataset.run, a.dataset.item, 'used')).then(ok => { if (ok) { flash = {text: 'Recorded: you took Sol’s advice. It stays with the sources it rested on.'}; render(); } }); return; }
      if (k === 'sol-dismiss') { const f = a.closest('.dk-sol')?.querySelector('.dk-soldis'); if (f) { f.hidden = !f.hidden; f.querySelector('textarea')?.focus(); } return; }
      if (k === 'fix-preview') { preview([a.dataset.id]); return; }
      if (k === 'fix-preview-ids') { preview(a.dataset.ids.split(',').filter(Boolean)); return; }
      if (k === 'fix-preview-step') { const g = BASE?.plan[Number(a.dataset.i)]; if (g) preview(stepDrafts(g).map(d => d.id)); return; }
      if (k === 'fix-preview-all') { preview(fixes().drafts.filter(d => !d.switchPoint).map(d => d.id)); return; }
      if (k === 'fix-stop') { stopPreview(); return; }
      if (k === 'fix-apply') { applyDrafts([a.dataset.id]); return; }
      if (k === 'fix-apply-ids') { applyDrafts(a.dataset.ids.split(',').filter(Boolean)); return; }
      if (k === 'fix-apply-step') { const g = BASE?.plan[Number(a.dataset.i)]; if (g) applyDrafts(stepDrafts(g).map(d => d.id)); return; }
      if (k === 'fix-apply-preview') { if (S.preview) applyDrafts(S.preview.ids); return; }
      if (['ask', 'ask-part', 'ask-decision', 'ask-load'].includes(k)) { askFor(k, a.dataset.id); return; }
      if (k === 'noop') return;
    }
    const s = e.target.closest('[data-sel]');
    if (s && s.dataset.sel && !e.target.closest('[data-dk]')) { e.stopPropagation(); select(s.dataset.sel, {reveal: !s.closest('.cm-panel') || true}); return; }
    const card = e.target.closest('[data-card]');
    if (card) {
      const id = card.dataset.card, now = Date.now(), twice = lastClick.id === id && now - lastClick.t < 420;
      lastClick = {id, t: now};
      if (twice) { lastClick = {id: null, t: 0}; const r = Row(id.startsWith('C:') ? id.split(':')[1] : id); if (r) toggleProbe(r.id); return; }
      select(S.sel === id ? null : id); return;
    }
    if (e.target.closest('.cm-stage') && !e.target.closest('.cm-heads,.cm-rail,.cm-zoom,.cm-key') && (S.sel || S.walk >= 0)) { S.walk = -1; select(null); }
  });
  on('input', e => { const el = e.target.closest('[data-dk-in]'); if (el?.dataset.dkIn === 'sol-prompt') { if (SOL.pending) {SOL.pending.prompt = el.value; updateSolPromptControls(el);} return; } if (el && (el.type === 'number' || el.dataset.dkIn === 'fix')) onInput(el); });
  on('submit', e => { const f = e.target.closest('.dk-soldis'); if (!f) return; e.preventDefault(); const reason = f.querySelector('textarea')?.value.trim(); if (reason) solDismiss(f.dataset.solDismiss, reason); });
  on('change', e => { if (e.target.matches('[data-dk-env]')) { S.env = e.target.value; S.preview = null; S.walk = -1; S.sel = null; S.probes = []; RB = null; fitPending = true; save(); rebuild(); render(); return; } if (NT?.change(e)) return; const el = e.target.closest('[data-dk-in]'); if (el && !['fix', 'sol-prompt'].includes(el.dataset.dkIn)) onInput(el); });
  on('keydown', e => { if (boardKey(e)) return; if (NT?.keydown(e)) return;
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) && e.target.matches?.('.dk-sheet tr[data-card]') && moveRow(e.target, e.key)) { e.preventDefault(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-card],[data-sel][role=button]')) { e.preventDefault(); select(e.target.dataset.card || e.target.dataset.sel); } });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !root?.isConnected || document.querySelector('dialog[open]')) return;
    const a = document.activeElement;
    if (a && a !== document.body && !root.contains(a) && !companionNow()?.contains(a)) return;
    if (a?.closest?.('select,details[open],input,textarea')) return;
    if (S.walk >= 0) { S.walk = -1; render(); }
    else if (S.preview) stopPreview();
    else if (S.sel) select(null);
    else if (S.view === 'board' && NT?.state.selEdge) { NT.state.selEdge = null; render(); }
    else if (S.focus) { S.focus = null; render(); }
    else if (S.filter !== 'all' && S.view === 'vitals') { S.filter = 'all'; fitPending = true; save(); render(); }
    else if (document.body.classList.contains('cm-expanded')) root.querySelector('[data-dk="expand"]').click();
    else return;
    e.preventDefault();
  });
  root.addEventListener('pointerleave', () => { root.querySelector('.cm-tip').hidden = true; });
  // An element of the Running board is not dragged: the board keeps no pins (where an element stands is the
  // arrangement's), so a press on one goes neither to the notation's pin drag nor to the stage's pan.
  root.addEventListener('pointerdown', e => { if (S.view === 'board' && e.button === 0 && e.target.closest?.('.cm-svg .nt-node')) e.stopPropagation(); }, true);
  window.addEventListener('resize', () => { if (!root?.isConnected) return; clearTimeout(bind._r); bind._r = setTimeout(() => { sizeModel(root, 'cm-expanded'); render(); }, 120); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!root?.isConnected || !L || !stageView()) return; clearTimeout(bind._ro); bind._ro = setTimeout(() => { const w = stage.box().w; if (Math.abs(w - (bind._w || 0)) > 24) { bind._w = w; fitPending = true; render(); } }, 90); }).observe(root.querySelector('.cm-stage'));
}
function tip(e) {
  const box = root.querySelector('.cm-tip'), t = e.target.closest?.('.nt-node');
  if (!t || !root.contains(t)) { box.hidden = true; return; }
  box.innerHTML = S.view === 'board' ? boardTip(t.dataset.ntNode) : NT.tipHTML(t.dataset.ntNode);
  box.hidden = !box.innerHTML; if (!box.hidden) placeTip(box, e);
}

export function deskDebug() { return {S: {...S}, DM, L, board: RB && {D: RB.D, L: RB.L, layers: RB.layers}}; }
