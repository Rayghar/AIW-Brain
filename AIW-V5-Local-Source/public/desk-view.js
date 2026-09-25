// Chapter 11 Model — the review desk. Also Validate's third mode, on every chapter.
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
import {deskModel, TRACE_COLS, ANTI_FIX, describeTrace, decisionProbe, partReviewItems, capacityReviewItems, VITALS, VSTATE, fmtN} from './desk-model.js';
import {vitalsLayout, VX, loadLayout, LX, LOAD_BANDS, traceLayout, TX} from './desk-layout.js';
import {describeRow, vitalTactics, worstOf} from './desk-vitals.js';
import {ASSUMPTIONS} from './desk-capacity.js';
import {specPanelHTML, antiPatternHTML} from './spec-panel.js';
import {catalogueRecord} from './design-reasoning.js';
import {specFor, reasoningFor} from './design-spec.js';
import {choiceSummaryHTML, choiceTableHTML, recordSuggestions} from './choice-ui.js';
import {suggestionCommands} from './product-choice.js';
import {modelStage, sizeModel, placeTip} from './model-stage.js';
import {projectPreferenceKey, projectURL} from './project-context.js';
import {fixDrafts, compose, simulate, deskDiff, describeCommands, describeEffect, valuesOf, MAX_COMMANDS, CHAPTER_NAMES} from './desk-fixes.js';
import {SOL, solLoad, solConnected, solEntry, solPrepare, solCancel, solSend, solRecord, solBadge, solOutcomes, pendingHTML, assessmentHTML, askHTML} from './brain-reasoning-ui.js';
import {VERDICTS, MAX_DECISIONS} from './brain-reasoning.js';
import {playbookAvailable} from './model-knowledge.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const project = () => window.aiwProjectStore?.value?.document || window.aiwCurrentProject;
const PATHS = {vitals: 'M3 12h4l2-6 4 12 2-6h6', load: 'M4 20V10M10 20V4M16 20v-7M22 20H2', trace: 'M4 6h4v4H4zM10 14h4v4h-4zM16 6h4v4h-4zM8 8h8M12 10v4', probe: 'M9 3v6l-4 8a3 3 0 0 0 3 4h8a3 3 0 0 0 3-4l-4-8V3M8 3h8', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', panel: 'M3 4h18v16H3zM15 4v16', explore: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', play: 'M7 4v16l13-8z', review: 'M4 4h16v12H8l-4 4zM8 9h8M8 12h5', save: 'M5 3h11l3 3v15H5zM8 3v6h7V3M8 21v-7h8v7', reset: 'M4 4v6h6M4 10a8 8 0 1 1 2 6'};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[n] || PATHS.vitals}"/></svg>`;
const VIEWS = [['vitals', 'Vitals', 'Every running part on the monitor'], ['load', 'What it takes', 'An objective, turned into a specification'], ['trace', 'Trace', 'Each requirement, to where it runs']];
const VERDICT = {ok: 'Meets', warn: 'Check', bad: 'Short', none: 'Not recorded'};
const KIND = {service: 'Service', worker: 'Worker', adapter: 'Adapter', gateway: 'Gateway', identity: 'Identity', store: 'Store', queue: 'Queue', cache: 'Cache', telemetry: 'Telemetry', backup: 'Backup', recovery: 'Recovery', cluster: 'Cluster', external: 'Outside'};
const MAX_PROBES = 4;

let root = null, DM = null, lastKey = '', cbs = {}, L = null, stage = null, fitPending = true, lastClick = {id: null, t: 0}, mode = 'model', busy = false, flash = '';
let S = {view: 'vitals', sel: null, probes: [], panel: true, focus: null, walk: -1, filter: 'all', explore: null, preview: null, values: {}, pulse: null, solUsed: {}};
// The desk as recorded (BASE), its drafted fixes (FX), and — while a draft is previewed — the desk as
// it would read with it (PREV); DM is whichever the desk is showing.
let BASE = null, FX = null, PREV = null;
const effects = new Map();
const pref = () => projectPreferenceKey('aiw-review-desk-v1');
function load() { try { const v = JSON.parse(localStorage.getItem(pref()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
function save() { try { localStorage.setItem(pref(), JSON.stringify({view: S.view, probes: S.probes, panel: S.panel, filter: S.filter, explore: S.explore})); } catch { /* preferences are optional */ } }

// ---------------------------------------------------------------- mount / leave

function hostOf() { return document.querySelector('.studio > .stage.tab-content') || document.querySelector('.r-studio > .r-surface'); }
function ensureRoot() {
  if (root) return;
  root = document.createElement('section'); root.className = 'cm dk'; root.setAttribute('aria-label', 'Review desk');
  root.innerHTML = shell();
  stage = modelStage(root, {headHeight: () => (L?.top ?? VX.HEAD_H), railWidth: l => l.rail || 0, onHover: tip});
  stage.bind(); bind();
  const v = load();
  if (VIEWS.some(([id]) => id === v.view)) S.view = v.view;
  if (Array.isArray(v.probes)) S.probes = v.probes.filter(x => typeof x === 'string').slice(0, MAX_PROBES);
  if (typeof v.panel === 'boolean') S.panel = v.panel;
  if (['all', 'critical', 'probed'].includes(v.filter)) S.filter = v.filter;
  if (v.explore && typeof v.explore === 'object') S.explore = v.explore;
}
function place(host, after = null) {
  if (after) { if (after.nextElementSibling !== root) after.after(root); }
  else if (host.firstElementChild !== root) host.prepend(root);
}
export function mountChapterModel(selection, callbacks = {}) {
  const p = project(), host = document.querySelector('.studio > .stage.tab-content');
  if (!p || !host) return;
  cbs = callbacks; mode = 'model'; ensureRoot();
  place(host);
  document.body.classList.remove('dk-validate');
  document.body.classList.add('cm-active', 'am-active');
  open(p, selection, 11);
}
export function leaveChapterModel() { if (mode !== 'model') return; document.body.classList.remove('cm-active', 'cm-expanded'); root?.remove(); }
// Validate's third mode: the same desk beneath the Validate switch, on any chapter.
export function mountDesk(selection) {
  const p = project(), host = hostOf();
  if (!p || !host) return;
  cbs = {}; mode = 'validate'; ensureRoot();
  place(host, host.querySelector(':scope > .vx-bar'));
  document.body.classList.add('dk-validate');
  open(p, selection, Number(selection?.chapter) || Number(new URLSearchParams(location.search).get('chapter')) || 11);
}
export function leaveDesk() { if (mode !== 'validate') return; document.body.classList.remove('dk-validate', 'cm-expanded'); root?.remove(); }
function open(p, selection, chapter) {
  root.classList.toggle('dk-in-validate', mode === 'validate');
  root.querySelector('.cm-title small').textContent = mode === 'validate' ? `Chapter ${chapter} · Validate` : 'Chapter 11 · Model';
  root.querySelector('[data-dk="explore"]').hidden = mode === 'validate';
  const first = !DM;
  rebuild(p);
  solLoad(p.id, () => { if (root?.isConnected) render(); });
  if (first) { S.sel = null; const want = mode === 'model' && window.aiwChapterModels ? window.aiwChapterModels.takeLink(11) : null; if (want && known(want)) { S.sel = want; setTimeout(revealSelection, 60); } }
  render();
  sizeModel(root, 'cm-expanded');
}
const NO_FIXES = {drafts: [], judgements: [], byId: new Map(), forCell: () => [], judgementFor: () => null};
function rebuild(p = project()) {
  const key = JSON.stringify(S.explore || null);
  if (!(BASE && BASE.p === p && key === lastKey)) {
    try { BASE = deskModel(p, {objective: S.explore}); lastKey = key; } catch (e) { console.error('Review desk', e); BASE = null; }
    FX = null; PREV = null; effects.clear();
    // A real change to the design ends a preview: the drafts are read again from what is recorded.
    if (S.preview && S.preview.base !== p) S.preview = null;
  }
  if (BASE && !FX) { try { FX = fixDrafts(BASE); } catch (e) { console.error('Review desk fixes', e); FX = NO_FIXES; } }
  DM = BASE;
  if (BASE && S.preview) {
    const ids = S.preview.ids.filter(id => FX.byId.has(id)), pk = JSON.stringify([ids, ids.map(id => S.values[id] || null)]);
    if (!ids.length) S.preview = null;
    else {
      if (!PREV || PREV.key !== pk) { try { PREV = {key: pk, sim: simulate(BASE.p, ids.map(id => FX.byId.get(id)), S.values, {before: BASE, read: doc => deskModel(doc, {objective: S.explore})})}; } catch (e) { console.error('Review desk preview', e); PREV = null; S.preview = null; } }
      if (PREV) DM = PREV.sim.after;
    }
  }
  if (DM) { S.probes = S.probes.filter(known); if (S.sel && !known(S.sel)) S.sel = null; }
}
const fixes = () => FX || NO_FIXES;
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
  return !!(Row(id) || Cap(id) || Dec(id) || Req(id) || DM.rows.some(r => r.assetId === id));
}

// ---------------------------------------------------------------- shell

function shell() {
  return `<header class="cm-top"><div class="cm-title"><small>Chapter 11 · Model</small><strong>Review desk</strong></div>
   <nav class="cm-crumbs" aria-label="Where you are"></nav>
   <div class="cm-views" role="group" aria-label="Desk">${VIEWS.map(([id, t, q]) => `<button type="button" class="cm-view" data-dk="view" data-id="${id}" title="${esc(q)}">${icon(id)}<span>${t}</span></button>`).join('')}</div>
   <div class="cm-actions"><button type="button" class="cm-btn" data-dk="ask" title="Ask the records behind what you are reading to review it">${icon('review')}<span>Ask for review</span></button>
    <button type="button" class="cm-btn" data-dk="explore" title="The connected explorer, with every perspective">${icon('explore')}<span>All perspectives</span></button>
    <button type="button" class="cm-btn icon" data-dk="expand" aria-pressed="false" aria-label="Expand the desk" title="Expand">${icon('expand')}</button>
    <button type="button" class="cm-btn icon" data-dk="panel" aria-pressed="true" aria-label="Show the companion panel" title="Companion">${icon('panel')}</button></div></header>
  <div class="dk-monitor" role="group" aria-label="System vitals"></div>
  <div class="cm-bar"><div class="dk-controls" role="group" aria-label="Desk controls"></div><p class="cm-state" role="status" aria-live="polite"></p></div>
  <div class="cm-banner"></div>
  <div class="cm-body"><div class="cm-stage" tabindex="0" aria-label="Review desk. Drag or scroll to move; Ctrl or Command and scroll to zoom.">
    <div class="cm-world"><svg class="cm-svg" aria-hidden="true"></svg><div class="cm-html"></div></div>
    <div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div>
    <div class="cm-key cm-min"><button type="button" class="cm-kt" data-dk="key" aria-expanded="false">Key</button><div class="cm-legend"></div></div>
    <div class="cm-zoom"><button type="button" data-dk="zout" aria-label="Zoom out">−</button><button type="button" data-dk="zin" aria-label="Zoom in">+</button><button type="button" data-dk="fit" aria-label="Fit the width">${icon('fit')}</button></div>
  </div><aside class="cm-panel" aria-label="Companion"></aside></div>
  <footer class="cm-walk" aria-label="Walk the rounds"></footer><div class="cm-tip" role="tooltip" hidden></div>`;
}

// ---------------------------------------------------------------- render

const chapterURL = (ch, id) => projectURL(`/?chapter=${ch}&tab=model${id ? '&' + (ch === 1 ? 'artefact' : ch === 2 ? 'driver' : ch === 3 ? 'decision' : 'object') + '=' + encodeURIComponent(id) : ''}`);
const visibleRows = () => !DM ? [] : S.filter === 'critical' ? DM.rows.filter(r => r.vitals.some(v => v.state === 'bad')) : S.filter === 'probed' ? DM.rows.filter(r => S.probes.includes(r.id)) : DM.rows;

function render() {
  if (!root) return;
  if (!DM) { root.querySelector('.cm-html').innerHTML = '<p class="cm-empty">The review desk could not read this project.</p>'; return; }
  root.classList.remove('dk-v-vitals', 'dk-v-load', 'dk-v-trace'); root.classList.add('dk-v-' + S.view);
  root.classList.toggle('dk-walking', S.walk >= 0);
  root.querySelector('.cm-body').classList.toggle('no-panel', !S.panel);
  root.querySelector('[data-dk="panel"]').setAttribute('aria-pressed', String(S.panel));
  const world = root.querySelector('.cm-world'), svg = root.querySelector('.cm-svg');
  // Geometry depends on the records, the view, the filter and the objective — never on the selection or the probes.
  L = S.view === 'load' ? loadLayout(DM.cap.rows) : S.view === 'trace' ? traceLayout(DM.trace, TRACE_COLS) : vitalsLayout(visibleRows(), VITALS);
  world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
  svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`); svg.style.width = L.W + 'px'; svg.style.height = L.H + 'px';
  const hl = highlight();
  if (S.view === 'load') { svg.innerHTML = loadSVG(); root.querySelector('.cm-html').innerHTML = loadHTML(hl); loadRail(); root.querySelector('.cm-heads-in').innerHTML = ''; }
  else if (S.view === 'trace') { svg.innerHTML = traceSVG(hl); root.querySelector('.cm-html').innerHTML = traceHTML(hl); traceHeads(); traceRail(hl); }
  else { svg.innerHTML = vitalsSVG(hl); root.querySelector('.cm-html').innerHTML = vitalsHTML(hl); vitalsHeads(hl); vitalsRail(hl); }
  monitor(); chrome(); panel(); walkBar();
  stage.use(L, JSON.stringify([S.view, S.filter, S.view === 'vitals' ? visibleRows().length : 0]));
  if (fitPending) { fitPending = false; stage.fit(); } else stage.clamp();
  stage.apply();
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
    const tiles = [
      ['Objective', C.objText, src.kind === 'playbook' ? 'the SA Playbook\'s example' : src.kind === 'driver' ? src.text : src.kind === 'review' ? 'saved for this review' : 'explored, not saved', src.kind === 'explore' ? 'warn' : 'ok'],
      ['Arrival rate', fmtN(C.lambda) + ' req/s', O.kind === 'users' ? `${fmtN(O.assume.thinkSeconds)} s between requests` : 'at the entry', 'ok'],
      ['Pods', fmtN(C.totals.pods), 'services and workers', 'ok'],
      ['CPU · memory', `${fmtN(C.totals.vcpu, 1)} vCPU · ${fmtN(C.totals.mem, 1)} GiB`, 'requested', 'ok'],
      ['Cluster', `${fmtN(C.totals.nodes)} nodes`, `${fmtN(O.assume.nodeVcpu)} vCPU · ${fmtN(O.assume.nodeMemGiB)} GiB each`, 'ok'],
      ['Short', String(C.counts.bad + C.counts.warn), C.counts.bad + C.counts.warn ? 'parts the design cannot yet carry' : 'nothing short', C.counts.bad ? 'bad' : C.counts.warn ? 'warn' : 'ok'],
      ['No signal', String(C.counts.none), 'parts with nothing recorded to compare', C.counts.none ? 'none' : 'ok'],
      ['Product choices', `${[...DM.choices.values()].filter(x => x.revisit).length} to revisit`, `of ${DM.choices.size} with alternatives`, [...DM.choices.values()].some(x => x.revisit) ? 'warn' : 'ok']
    ];
    box.innerHTML = tiles.map(([k, v, s, st]) => `<div class="dk-tile ${st}"><small>${esc(k)}</small><b>${esc(v)}</b><em>${esc(s)}</em></div>`).join('');
    return;
  }
  const was = S.preview && PREV ? PREV.sim.system : null, pulsed = new Set([...(S.pulse || [])].map(k => k.split(':')[1]));
  box.innerHTML = VITALS.map((v, i) => { const s = DM.system[i], w = was?.[i], moved = w && (w.from !== w.to || w.before?.text !== w.after?.text); return `<button type="button" class="dk-tile ${s.state}${S.focus === v.id ? ' on' : ''}${moved ? ' chg' : ''}${pulsed.has(v.id) ? ' pulse' : ''}" data-dk="focus" data-id="${v.id}" aria-pressed="${S.focus === v.id}" title="${esc(v.q + ' ' + s.text + (moved ? ' — was ' + w.before.text : ''))}"><small>${esc(v.label)}</small><b>${esc(s.head)}</b>${ecg(DM.rows.map(r => r.vitals[i].state))}<em>${esc(s.text)}</em>${moved ? `<i class="dk-was-t ${w.from}">was ${esc(w.before.text)}</i>` : ''}</button>`; }).join('');
}

// ---------------------------------------------------------------- vitals

function vitalsSVG(hl) {
  const out = [];
  for (const b of L.bands) out.push(`<rect class="dk-band" x="${L.rail}" y="${b.y}" width="${L.W - L.rail}" height="${b.h - 4}" rx="6"/>`);
  L.rows.forEach((r, i) => out.push(`<rect class="dk-row${i % 2 ? ' odd' : ''}${S.probes.includes(r.id) ? ' probed' : ''}${hl.rows.has(r.id) ? ' lit' : ''}" x="${L.rail}" y="${r.y}" width="${L.W - L.rail}" height="${r.h}"/>`));
  if (hl.vital) { const c = L.cols.find(c => c.id === hl.vital); if (c) out.push(`<rect class="dk-colhl" x="${c.x}" y="${L.top}" width="${c.w}" height="${L.H - L.top - 8}" rx="8"/>`); }
  return out.join('');
}
// Cells a preview changes (with the state they had), and cells an applied fix just changed.
function marks() {
  const chg = new Map(S.preview && PREV ? PREV.sim.changed.map(c => [c.row + ':' + c.vital, c.from]) : []);
  const drafted = new Set(fixes().drafts.flatMap(d => d.aims));
  return {chg, pulse: S.pulse || new Set(), drafted};
}
function vitalsHTML(hl) {
  const out = [], M = marks();
  for (const r of L.rows) {
    const row = Row(r.id);
    VITALS.forEach((v, i) => {
      const x = row.vitals[i], c = L.cols[i], id = `C:${row.id}:${v.id}`, key = row.id + ':' + v.id, was = M.chg.get(key);
      const dim = hl.on && !hl.rows.has(row.id) && !(hl.vital === v.id && !hl.rows.size) ? ' dim' : '';
      const fixable = !S.preview && M.drafted.has(key) && ['bad', 'none', 'warn'].includes(x.state), sol = S.preview ? '' : solBadge(solFor(row.id, v.id));
      out.push(`<div class="dk-cell ${x.state}${S.sel === id ? ' sel' : ''}${hl.cells.has(key) || (hl.rows.has(row.id) && hl.vital === v.id) ? ' lit' : ''}${dim}${was ? ' chg' : ''}${M.pulse.has(key) ? ' pulse' : ''}" data-card="${esc(id)}" role="button" tabindex="0" style="left:${c.x + 3}px;top:${r.y + 4}px;width:${c.w - 6}px;height:${r.h - 8}px" aria-label="${esc(`${row.ref} ${v.label}: ${VSTATE[x.state].label}, ${x.value}${was ? `; was ${VSTATE[was].label}` : ''}${fixable ? '; a fix is drafted' : ''}`)}"><b>${VSTATE[x.state].glyph}</b><span>${esc(x.value)}</span><small>${esc(x.target)}</small>${was ? `<i class="dk-was ${was}" title="Was ${esc(VSTATE[was].label)}">${VSTATE[was].glyph}</i>` : fixable ? '<i class="dk-rx" title="A fix is drafted">℞</i>' : ''}${sol}</div>`);
    });
  }
  if (!L.rows.length) out.push(`<div class="dk-empty" style="left:${L.rail + 20}px;top:${L.top + 20}px"><b>${S.filter === 'probed' ? 'No probe plugged in' : 'Nothing critical'}</b><p>${S.filter === 'probed' ? 'Plug a probe into a running part — the ⏚ beside its name — to keep it on this view.' : 'No running part reads critical on any vital.'}</p><button type="button" class="cm-btn" data-dk="filter" data-id="all">Show every part</button></div>`);
  return out.join('');
}
function vitalsHeads(hl) {
  const box = root.querySelector('.cm-heads-in');
  box.innerHTML = VITALS.map((v, i) => { const c = L.cols[i], s = DM.system[i]; return `<button type="button" class="dk-ch ${s.state}${hl.vital === v.id ? ' on' : ''}" data-dk="focus" data-id="${v.id}" style="left:${c.x + 2}px;width:${c.w - 4}px;top:6px;height:${VX.HEAD_H - 12}px" title="${esc(v.q)}"><b>${esc(v.label)}</b><em>${esc(s.head)}</em><small>${esc(s.text)}</small></button>`; }).join('');
  box.style.width = L.W + 'px';
  root.querySelector('.cm-corner').innerHTML = `<div class="dk-corner"><small>Running part</small><b>${visibleRows().length} of ${DM.rows.length}</b></div>`;
}
function vitalsRail(hl) {
  const box = root.querySelector('.cm-rail-in');
  const bandName = {parts: 'Services and workers', platform: 'Platform services'};
  box.innerHTML = L.bands.map(b => `<div class="dk-rb" style="top:${b.y}px;height:${b.h - 4}px"><b>${bandName[b.id]}</b></div>`).join('') + L.rows.map(r => {
    const row = Row(r.id), probed = S.probes.includes(row.id);
    return `<div class="dk-rh ${row.state}${S.sel === row.id ? ' sel' : ''}${hl.rows.has(row.id) ? ' lit' : ''}${probed ? ' probed' : ''}" data-card="${esc(row.id)}" role="button" tabindex="0" style="top:${r.y + 3}px;height:${r.h - 6}px"><button type="button" class="dk-probe" data-dk="probe" data-id="${esc(row.id)}" aria-pressed="${probed}" aria-label="${probed ? 'Unplug the probe from' : 'Plug a probe into'} ${esc(row.ref)}" title="${probed ? 'Unplug the probe' : 'Plug in a probe: pin its chart to the desk'}">${icon('probe')}</button><small>${esc(row.ref)} · ${esc(row.assetRef)}${row.alarms.length ? ` <i class="dk-alarm" title="${esc(row.alarms.map(a => a.name).join(', '))}">${row.alarms.length}</i>` : ''}</small><b>${esc(row.title)}</b><em>${esc(row.product || row.kind)}</em></div>`;
  }).join('');
  box.style.height = L.H + 'px'; box.style.width = L.rail + 'px';
}

// ---------------------------------------------------------------- what it takes

function loadSVG() { return L.bands.map((b, i) => `<rect class="dk-lband${i % 2 ? ' odd' : ''}" x="${L.rail}" y="${b.y}" width="${L.W - L.rail}" height="${b.h}" rx="12"/>`).join(''); }
function loadHTML(hl) {
  return L.cards.map(c => {
    const r = Cap(c.id), st = r.verdict.state, dim = S.walk >= 0 && hl.on && !hl.ids.has(r.id) ? ' dim' : '';
    const C = DM.choices?.get(r.id), line = C ? choiceLine(C) : '';
    return `<div class="dk-card ${st} k-${esc(r.kind)}${S.sel === r.id ? ' sel' : ''}${dim}" data-card="${esc(r.id)}" role="button" tabindex="0" style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"><header><small>${esc(r.ref)} · ${esc(KIND[r.kind] || r.kind)}</small><i class="dk-v ${st}">${VERDICT[st]}</i></header><b class="dk-t">${esc(r.title)}</b><em class="dk-p">${esc(r.product || '')}</em><div class="dk-demand"><strong>${esc(r.demand.value == null ? r.demand.text : fmtN(r.demand.value, r.demand.value < 10 ? 1 : 0))}</strong><span>${esc(r.demand.value == null ? '' : r.demand.unit)}</span></div><dl>${r.spec.slice(0, line ? 2 : 3).map(s => `<div><dt>${esc(s.k)}</dt><dd title="${esc(s.d || '')}">${esc(s.v)}</dd></div>`).join('')}</dl>${line}<p class="dk-why">${esc(r.verdict.why)}</p></div>`;
  }).join('');
}
// One line on a card: the product in the design, and which way the drivers lean.
function choiceLine(C) {
  const name = id => C.options.find(o => o.option.id === id)?.option.product || id, cur = C.reading ? name(C.reading) : 'no product';
  const lean = C.leanRecorded || C.leanAll, how = C.leanRecorded ? 'recorded' : 'suggested';
  const text = !lean ? `${cur} · the drivers do not lean` : lean === C.reading ? `${cur} · the drivers lean to it (${how})` : `★ The drivers lean to ${name(lean)} (${how})`;
  return `<p class="dk-choice-l${C.revisit ? ' revisit' : ''}" title="${esc(text)}">${esc(text)}</p>`;
}
function loadRail() {
  const box = root.querySelector('.cm-rail-in');
  box.innerHTML = L.bands.map(b => `<div class="dk-lb" style="top:${b.y}px;height:${b.h}px"><b>${esc(b.label)}</b><small>${esc(b.note)}</small><em>${b.count} part${b.count === 1 ? '' : 's'}</em></div>`).join('');
  box.style.height = L.H + 'px'; box.style.width = L.rail + 'px';
  root.querySelector('.cm-corner').innerHTML = '';
}

// ---------------------------------------------------------------- trace

function traceSVG(hl) { return L.rows.map((r, i) => `<rect class="dk-row${i % 2 ? ' odd' : ''}${hl.ids.has(r.id) ? ' lit' : ''}" x="${L.rail}" y="${r.y}" width="${L.W - L.rail}" height="${r.h}"/>`).join(''); }
function traceHTML(hl) {
  const out = [];
  for (const r of L.rows) {
    const t = Req(r.id);
    TRACE_COLS.forEach((col, i) => {
      const c = L.cols[i], xs = t.cells[col.id], pos = `left:${c.x + 3}px;top:${r.y + 4}px;width:${c.w - 6}px;height:${r.h - 8}px`;
      if (!xs.length) { out.push(`<div class="dk-gap ${col.spine ? 'break' : 'soft'}" style="${pos}"><small>${col.spine ? 'Thread breaks' : 'None recorded'}</small><a href="${esc(chapterURL(col.ch))}">no ${esc(col.label.toLowerCase())}</a></div>`); return; }
      const shown = xs.slice(0, TX.MAX_CHIPS), more = xs.length - shown.length;
      out.push(`<div class="dk-tc" style="${pos}">${shown.map(x => `<button type="button" class="dk-chip k-${x.chapter}${x.state ? ' ' + x.state : ''}${x.chosen ? ' chosen' : ''}${S.sel === x.id ? ' sel' : ''}${hl.on && hl.ids.has(x.id) ? ' lit' : ''}" data-sel="${esc(x.id.startsWith('V:') ? t.id : x.id)}" title="${esc(x.ref + ' · ' + x.label)}"><b>${esc(x.ref)}</b><span>${esc(x.label)}</span></button>`).join('')}${more ? `<button type="button" class="dk-chip more" data-sel="${esc(t.id)}">+${more} more</button>` : ''}</div>`);
    });
  }
  return out.join('');
}
function traceHeads() {
  const box = root.querySelector('.cm-heads-in');
  box.innerHTML = TRACE_COLS.map((col, i) => { const c = L.cols[i], gaps = DM.trace.filter(t => !t.cells[col.id].length).length; return `<div class="dk-th${col.spine ? ' spine' : ''}${gaps ? ' gaps' : ''}" style="left:${c.x + 2}px;width:${c.w - 4}px;top:6px;height:${TX.HEAD_H - 12}px"><small>Ch ${col.ch}</small><b>${esc(col.label)}</b><em>${gaps ? gaps + ' without' : 'every requirement'}</em></div>`; }).join('');
  box.style.width = L.W + 'px';
  root.querySelector('.cm-corner').innerHTML = `<div class="dk-corner"><small>Requirement</small><b>${DM.trace.length}</b></div>`;
}
function traceRail(hl) {
  const box = root.querySelector('.cm-rail-in');
  box.innerHTML = L.rows.map(r => { const t = Req(r.id); return `<div class="dk-tr ${t.firstBreak ? 'broken' : 'whole'}${S.sel === t.id ? ' sel' : ''}${hl.ids.has(t.id) ? ' lit' : ''}" data-card="${esc(t.id)}" role="button" tabindex="0" style="top:${r.y + 3}px;height:${r.h - 6}px"><small>${esc(t.id)}${t.reviewed ? ' · <i class="dk-ok">trail reviewed</i>' : ''}</small><b>${esc(t.req.title)}</b><em>${t.firstBreak ? 'breaks at ' + esc(t.firstBreak.label.toLowerCase()) : 'unbroken to where it runs'}</em></div>`; }).join('');
  box.style.height = L.H + 'px'; box.style.width = L.rail + 'px';
}

// ---------------------------------------------------------------- chrome

function crumbs() {
  const v = VIEWS.find(([id]) => id === S.view);
  const sel = S.sel ? selLabel(S.sel) : '';
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
const num = v => { const n = Number(v); return v === '' || v == null || !Number.isFinite(n) ? null : n; };
function solChip() {
  const c = SOL.config, n = SOL.byItem.size;
  return `<span class="dk-solchip ${c?.configured ? 'on' : 'off'}" title="${esc(c?.configured ? `Sol reasons with ${c.provider} · ${c.model}, over the desk’s readings and the governed knowledge; you decide.` : 'Sol is not connected: set OPENAI_API_KEY and AIW_LLM_MODEL on the server. The desk’s readings and drafts stand on their own meanwhile.')}"><b>Sol</b>${c ? (c.configured ? esc(c.model || 'connected') : 'not connected') : '…'}${n ? ` · ${n} assessed` : ''}</span>`;
}
function controls() {
  if (S.view === 'vitals') {
    const crit = DM.rows.filter(r => r.vitals.some(v => v.state === 'bad')).length;
    return solChip() + `<span class="dk-lab">Show</span>${[['all', `All ${DM.rows.length}`], ['critical', `Critical ${crit}`], ['probed', `Probed ${S.probes.filter(id => Row(id)).length}`]].map(([id, t]) => `<button type="button" class="cm-dep" data-dk="filter" data-id="${id}" aria-pressed="${S.filter === id}">${t}</button>`).join('')}`;
  }
  if (S.view === 'load') {
    const O = DM.cap.objective, A = O.assume;
    return `<label class="dk-in wide"><span>Objective</span><input type="number" min="1" step="1000" data-dk-in="value" value="${esc(O.value)}" aria-label="Objective"></label>
      <label class="dk-in"><select data-dk-in="kind" aria-label="Objective unit"><option value="users"${O.kind === 'users' ? ' selected' : ''}>concurrent users</option><option value="rate"${O.kind === 'rate' ? ' selected' : ''}>requests a second</option></select></label>
      ${O.kind === 'users' ? `<label class="dk-in"><span>every</span><input type="number" min="1" step="1" data-dk-in="assume" data-key="thinkSeconds" value="${esc(A.thinkSeconds)}" aria-label="Seconds between one user's requests"><span>s</span></label>` : ''}
      <label class="dk-in"><span>survive</span><select data-dk-in="assume" data-key="survive" aria-label="Keep serving after losing">${ASSUMPTIONS.find(a => a.key === 'survive').options.map(([v, t]) => `<option value="${v}"${A.survive === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="dk-in"><span>at</span><input type="number" min="10" max="100" step="5" data-dk-in="assume" data-key="utilisation" value="${esc(A.utilisation)}" aria-label="Utilisation"><span>%</span></label>
      ${O.surge ? `<label class="dk-chk"><input type="checkbox" data-dk-in="surge"${O.surge.on ? ' checked' : ''}> ${esc(O.surge.driverId)} surge × ${esc(O.surge.factor)}</label>` : ''}
      ${O.source.kind === 'review' && !S.explore ? `<span class="dk-saved" title="${esc(O.source.text)}">✓ Saved for this review</span>` : `<button type="button" class="cm-btn primary" data-dk="save-objective">${icon('save')}<span>Save as the review objective</span></button>`}${S.explore ? `<button type="button" class="cm-btn" data-dk="reset-objective">${icon('reset')}<span>Reset</span></button>` : ''}`;
  }
  return `<a class="cm-btn" href="${esc(projectURL('/?chapter=11&tab=work'))}">Record a trail review in Chapter 11</a>`;
}
function chrome() {
  root.querySelector('.cm-crumbs').innerHTML = crumbs();
  root.querySelectorAll('.cm-view').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === S.view)));
  keepFocus(root.querySelector('.dk-controls'), controls);
  const st = root.querySelector('.cm-state');
  if (S.view === 'load') st.textContent = DM.cap.lambdaMath + '.';
  else if (S.view === 'trace') { const b = DM.trace.filter(t => t.firstBreak).length; st.textContent = `${DM.trace.length} requirement${DM.trace.length === 1 ? '' : 's'} · ${b ? b + ' with a broken thread' : 'every thread unbroken to where it runs'} · ${DM.trace.filter(t => t.reviewed).length} trail${DM.trace.filter(t => t.reviewed).length === 1 ? '' : 's'} reviewed`; }
  else { const c = s => DM.rows.filter(r => r.vitals.some(v => v.state === s)).length; st.textContent = `${DM.rows.length} running parts · ${c('bad')} critical · ${c('none')} with no signal · ${DM.anti.length} anti-pattern${DM.anti.length === 1 ? '' : 's'}`; }
  const banner = [];
  if (flash) banner.push(`<section class="dk-flash" role="status"><b>${esc(flash.text)}</b>${flash.eventId ? `<button type="button" class="cm-btn gold" data-dk="open-change" data-id="${esc(flash.eventId)}">Review impact →</button>` : ''}${flash.stewards ? '<button type="button" class="cm-btn" data-dk="sol-stewards">Open the stewards’ queue</button>' : ''}<button type="button" class="cm-btn icon" data-dk="flash-off" aria-label="Dismiss">×</button></section>`);
  if (S.preview && PREV) { const ids = S.preview.ids, one = ids.length === 1 ? fixes().byId.get(ids[0]) : null, n = PREV.sim.commands.length;
    banner.push(`<section class="dk-preview" role="status"><span class="ip-kicker">Preview · nothing is applied</span><b>${esc(one ? one.title : `${ids.length} drafted fixes`)}</b><p>${esc(describeEffect(PREV.sim, {brief: true}))}${n > MAX_COMMANDS ? ` ${n} changes, reviewed ${MAX_COMMANDS} at a time.` : ''}</p><button type="button" class="cm-btn primary" data-dk="fix-apply-preview">${icon('review')}<span>Review and apply…</span></button><button type="button" class="cm-btn" data-dk="fix-stop">Stop preview</button></section>`); }
  if (S.explore && S.view !== 'load') banner.push(`<section class="dk-explore"><span class="ip-kicker">Objective explored, not saved</span><b>${esc(DM.cap.objText)}</b><button type="button" class="cm-btn" data-dk="view" data-id="load">See what it takes</button><button type="button" class="cm-btn" data-dk="reset-objective">Reset</button></section>`);
  root.querySelector('.cm-banner').innerHTML = banner.join('');
  root.querySelector('.cm-legend').innerHTML = S.view === 'trace'
    ? `<p><span class="dk-k chip"></span>A record the thread passes through · the chapter's colour</p><p><span class="dk-k break"></span>The thread breaks: nothing recorded where it must pass</p><p><span class="dk-k soft"></span>None recorded where the thread may pass</p><p>Runtime chips carry the state of their vitals.</p>`
    : S.view === 'load' ? `<p><i class="dk-v ok">Meets</i>What the design records can carry it</p><p><i class="dk-v bad">Short</i>It cannot, as recorded</p><p><i class="dk-v warn">Check</i>It can, with a product rule to meet</p><p><i class="dk-v none">Not recorded</i>Nothing recorded to compare</p><p>Numbers not in the design are planning assumptions: change them in the companion.</p>`
    : `<p>${['ok', 'warn', 'bad', 'none', 'na'].map(s => `<i class="dk-g ${s}">${VSTATE[s].glyph}</i>${VSTATE[s].label}`).join(' ')}</p><p>Each cell: the recorded value, and beneath it the target it is read against.</p><p><span class="dk-k probe"></span>A probe pins a part's chart to the desk.</p><p><i class="dk-alarm">2</i> Anti-patterns it is part of.</p>`;
}

// ---------------------------------------------------------------- companion

const act = (k, attrs, label, cls = '') => `<button type="button" class="cm-btn ${cls}" data-dk="${k}" ${attrs}>${label}</button>`;
const chLink = (ch, id, label, cls = 'cm-btn') => `<a class="${cls}" href="${esc(chapterURL(ch, id))}">${esc(label)}</a>`;
const placed = f => !f.placements.length ? 'not placed' : `${f.active} active${f.standby ? ' + ' + f.standby + ' standby' : ''} in ${f.zonesAll.length} zone${f.zonesAll.length === 1 ? '' : 's'}`;

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
  return xs.length ? `<ul class="dk-chg">${xs.map(x => `<li><b>Ch ${x.chapter} · ${esc(x.head)}</b>${x.fields.map(f => `<div><span>${esc(f.label)}</span>${f.before ? `<del>${esc(clip(f.before))}</del>` : ''}<ins>${esc(clip(f.after))}</ins></div>`).join('')}</li>`).join('')}</ul>` : '<p class="cm-muted">Nothing left to change: the design already records it.</p>';
}
function cellPills(xs) {
  if (!xs.length) return '';
  return `<div class="dk-moves">${xs.slice(0, 12).map(c => `<button type="button" class="dk-mv" data-sel="C:${esc(c.row)}:${esc(c.vital)}"><b>${esc(c.ref)}</b> ${esc(VITALS.find(v => v.id === c.vital)?.label || c.vital)} <i class="dk-g ${c.from}">${VSTATE[c.from].glyph}</i>→<i class="dk-g ${c.to}">${VSTATE[c.to].glyph}</i></button>`).join('')}${xs.length > 12 ? `<small>+${xs.length - 12} more</small>` : ''}</div>`;
}
function fixHTML(d) {
  const E = effectOf(d), previewing = S.preview?.ids.length === 1 && S.preview.ids[0] === d.id, err = E.errors?.[0];
  return `<section class="dk-fix${d.switchPoint ? ' switch' : ''}" data-fix="${esc(d.id)}"><h4>${d.switchPoint ? 'Drafted decision' : 'Drafted fix'}<span title="${esc(chName(d.chapter))}">Chapter ${d.chapter}</span></h4><p class="dk-fix-t"><b>${esc(d.title)}</b></p><p>${esc(d.why)}</p>${d.also ? `<p class="dk-also">Still to watch: ${esc(d.also)}</p>` : ''}</section>
   ${solBlock('F:' + d.id, d.title, knobsNow(d))}
   <section class="dk-fix cont${d.switchPoint ? ' switch' : ''}">${knobHTML(d)}
   ${err ? `<p class="dk-verdict bad">${esc(err.message)}</p>` : `<h5>What changes · ${E.commands.length}</h5>${changesHTML(E.commands)}`}
   ${d.switchPoint ? '<p class="cm-muted">A decision to frame, not a fix: the vitals move when Chapter 7 records the product the decision chooses.</p>' : `<h5>On the desk</h5><p class="dk-effect">${esc(describeEffect(E))}</p>${cellPills(E.changed)}`}
   ${d.math?.length ? `<details class="dk-mathd"><summary>The arithmetic</summary><ol class="dk-math">${d.math.map(m => `<li>${esc(m)}</li>`).join('')}</ol></details>` : ''}
   <div class="cm-acts">${d.switchPoint ? `<button type="button" class="cm-btn" data-dk="noop" data-k-action="product-compare" data-id="${esc(d.target.id)}">Compare in Mind Factory</button>` : act('fix-preview', `data-id="${esc(d.id)}" aria-pressed="${previewing}"`, icon('vitals') + (previewing ? 'Stop the preview' : 'Preview on the desk'), previewing ? 'on' : '')}${act('fix-apply', `data-id="${esc(d.id)}"`, icon('review') + 'Review and apply…', 'primary')}${chLink(d.target.chapter, d.target.id, `Edit in Chapter ${d.target.chapter} instead`)}</div>
   <p class="cm-muted">Applied only through Chapter ${d.chapter}'s change review, where every changed field is shown and you confirm it. Drafted values stay unconfirmed until evidence confirms them.</p></section>`;
}
function judgementHTML(j) {
  return `<section class="dk-fix judge"><h4>Needs your judgement${j.fix ? `<span title="${esc(chName(j.fix.chapter))}">Chapter ${j.fix.chapter}</span>` : ''}</h4><p>${esc(j.text)}</p>${j.fix ? `<div class="cm-acts">${chLink(j.fix.chapter, j.fix.id, j.fix.label, 'cm-btn')}</div>` : ''}<p class="cm-muted">The desk drafts only what follows from recorded numbers; Sol can reason about the rest with you.</p></section>${solBlock('J:' + j.id, `${j.ref} · needs your judgement`)}`;
}
function fixFor(row, vid) {
  const ds = fixes().forCell(row.id, vid);
  if (ds.length) return ds.map(fixHTML).join('');
  const j = fixes().judgementFor(row.id, vid), st = BASE?.rows.find(r => r.id === row.id)?.vitals.find(v => v.vital === vid)?.state;
  return j && ['bad', 'none', 'warn'].includes(st) ? judgementHTML(j) : solHistory(row, vid);
}
// Advice Sol gave on a decision that has since been acted on: kept as history beside the cell.
function solHistory(row, vid) {
  const ref = BASE?.rows.find(r => r.id === row.id)?.ref;
  const e = [...SOL.byItem.values()].find(x => x.item?.vital === vid && list(x.item.rows).includes(ref));
  return e ? assessmentHTML({...e, current: false}, {id: e.a.id}) : '';
}
const list = v => Array.isArray(v) ? v : [];
// The drafts for the parts of one plan step (one vital, one state), read from the desk as recorded.
function stepDrafts(g) { const keys = new Set(g.rows.map(r => r.id + ':' + g.vital)); return fixes().drafts.filter(d => d.vital === g.vital && d.aims.some(a => keys.has(a))); }
function stepJudgements(g) { return fixes().judgements.filter(j => j.vital === g.vital && g.rows.some(r => r.id === j.row)); }
function probeCard(id) {
  const row = Row(id);
  if (row) return `<div class="dk-pc ${row.state}" data-sel="${esc(row.id)}" role="button" tabindex="0"><header><b>${esc(row.ref)} ${esc(row.title)}</b><button type="button" class="dk-x" data-dk="probe" data-id="${esc(row.id)}" aria-label="Unplug the probe from ${esc(row.ref)}">×</button></header><div class="dk-pills">${row.vitals.map((v, i) => `<i class="${v.state}" title="${esc(VITALS[i].label + ': ' + VSTATE[v.state].label + ' · ' + v.value)}">${esc(VITALS[i].short)}</i>`).join('')}</div>${row.alarms.length ? `<small class="dk-alarms">${esc(row.alarms.map(a => a.name).join(' · '))}</small>` : ''}</div>`;
  const q = Dec(id) && decisionProbe(DM, id);
  if (q) { const lean = q.alts.find(a => a.alt.id === q.lean); return `<div class="dk-pc dec" data-sel="${esc(id)}" role="button" tabindex="0"><header><b>${esc(id)} ${esc(q.decision.question)}</b><button type="button" class="dk-x" data-dk="probe" data-id="${esc(id)}" aria-label="Unplug the probe from ${esc(id)}">×</button></header><small>${q.decision.selectedAlternativeId ? '● ' : '★ '}${esc(lean?.alt.title || 'no lean')}</small><div class="dk-pills">${(lean?.effects || []).map(e => `<i class="${e.effect === 'supports' ? 'ok' : e.effect === 'tension' ? 'bad' : 'none'}" title="${esc(e.id + ': ' + e.effect + (e.reason ? ' — ' + e.reason : ''))}">${esc(e.id)}</i>`).join('')}</div><small class="dk-alarms">${q.implications.upstream.length} earlier · ${q.implications.downstream.length} later records</small></div>`; }
  return '';
}
function probesHTML() {
  const ps = S.probes.filter(known);
  if (!ps.length) return '';
  return `<section class="dk-probes"><h4>Probes<span>${ps.length} of ${MAX_PROBES}</span></h4>${ps.map(probeCard).join('')}</section>`;
}
function rowChart(row, compact = false) {
  const probed = S.probes.includes(row.id), p = project();
  let decisions = [];
  try { decisions = specFor(reasoningFor(p), row.id)?.decisions || []; } catch { decisions = []; }
  return `<section class="cm-spec dk-chart"><h4>Running part · ${esc(row.ref)}<span class="dk-s ${row.state}">${VSTATE[row.state].label}</span></h4><p class="cm-spec-t"><b>${esc(row.title)}</b></p><p class="cm-muted">${esc([row.assetRef, row.product, placed(row.f)].filter(Boolean).join(' · '))}</p>
   <div class="cm-acts">${act('probe', `data-id="${esc(row.id)}" aria-pressed="${probed}"`, icon('probe') + (probed ? 'Unplug the probe' : 'Plug in a probe'), probed ? '' : 'gold')}${act('ask-part', `data-id="${esc(row.id)}"`, icon('review') + 'Ask for review')}${chLink(10, row.id, 'Open in Chapter 10')}</div>
   ${compact ? '' : `<ul class="dk-vl">${row.vitals.map((v, i) => `<li class="${v.state}"><button type="button" data-sel="C:${esc(row.id)}:${VITALS[i].id}"><b>${VSTATE[v.state].glyph} ${esc(VITALS[i].label)}</b><span>${esc(v.value)}</span><small>${esc(v.target)}</small></button></li>`).join('')}</ul>`}
   <p class="cm-muted">${esc(describeRow(DM, row))}</p></section>
   ${decisions.length ? `<section><h4>Decisions behind it<span>${decisions.length}</span></h4><div class="dk-links">${decisions.map(d => `<button type="button" class="cm-link" data-sel="${esc(d.id)}">${esc(d.id)} · ${esc(d.question)}${d.selectedAlternativeId ? ' · chosen' : ' · open'}</button>`).join('')}</div><p class="cm-muted">Select one to probe its alternatives, patterns and what it reaches.</p></section>` : ''}
   ${specPanelHTML(p, row.id)}`;
}
function vitalDetail(row, vid) {
  const playbook = playbookAvailable(project()), v = row.vitals.find(x => x.vital === vid), def = VITALS.find(x => x.id === vid), tactics = playbook ? vitalTactics(def) : [];
  const pats = playbook ? (def.patterns || []).map(catalogueRecord).filter(Boolean) : [], drafted = fixes().forCell(row.id, vid).length;
  return `<section class="cm-spec dk-vd ${v.state}"><h4>${esc(def.label)} · ${esc(row.ref)}<span class="dk-s ${v.state}">${VSTATE[v.state].label}</span></h4><p class="cm-muted">${esc(def.q)}</p>
   <div class="dk-read"><div><small>Recorded</small><b>${esc(v.value)}</b></div><div><small>Against</small><b>${esc(v.target)}</b></div></div><p>${esc(v.why)}</p>
   ${(v.drivers || []).length ? `<p class="dk-links">${v.drivers.map(d => /^QD-/.test(d) ? chLink(2, d, d, 'cm-link') : `<span class="cm-link">${esc(d)}</span>`).join('')}</p>` : ''}</section>
   ${fixFor(row, vid)}
   <section>${!playbook ? '<p class="cm-muted">The SA Playbook is withdrawn in this project, so its tactics are not offered here.</p>' : ''}${tactics.length || pats.length ? `<h5>What would move it</h5><ul class="dk-tac">${tactics.map(t => `<li title="${esc(t.src || '')}"><b>${esc(t.name)}</b> · ${esc(t.group)}<small>${esc(t.concept)}</small></li>`).join('')}${pats.map(r => `<li><b>${esc(r.name)}</b> · pattern catalogue</li>`).join('')}</ul><p class="cm-muted">From the SA Playbook's tactics${pats.length ? ' and the pattern catalogue' : ''}; none is applied until a chapter records it.</p>` : ''}
   <div class="cm-acts">${v.fix ? chLink(v.fix.chapter, v.fix.id, v.fix.label, drafted ? 'cm-btn' : 'cm-btn primary') : ''}${vid === 'capacity' && v.capacity ? act('to-load', `data-id="${esc(v.capacity.id)}"`, 'See what it takes') : ''}</div></section>${rowChart(row, true)}`;
}
function decisionHTML(id) {
  const q = decisionProbe(DM, id);
  if (!q) return '';
  const d = q.decision, lean = q.alts.find(a => a.alt.id === q.lean), I = q.implications, probed = S.probes.includes(id);
  const eff = e => `<i class="dk-eff ${esc(e.effect)}" title="${esc(e.id + ': ' + e.effect + (e.reason ? ' — ' + e.reason : ''))}">${esc(e.id)} ${e.effect === 'supports' ? '✓' : e.effect === 'tension' ? '⚠' : e.effect === 'neutral' ? '·' : '?'}</i>`;
  const names = xs => xs.map(r => `<i class="dk-cat${r.type === 'anti-pattern' ? ' anti' : ''}" title="Pattern catalogue">${esc(r.name)}</i>`).join('');
  const item = x => `<li><a href="${esc(chapterURL(x.chapter, x.id))}"><b>Ch ${x.chapter} · ${esc(x.ref)}</b> ${esc(x.title)}</a><small>${esc(x.why)}</small></li>`;
  return `<section class="cm-spec dk-dec"><h4>Decision · ${esc(id)}<span>${esc(d.status || 'draft')}</span></h4><p class="cm-spec-t"><b>${esc(d.question)}</b></p>
   <p>${d.selectedAlternativeId ? `Working choice: <b>${esc(lean?.alt.title)}</b>.` : lean ? `No working choice yet. As their priorities weigh them, the drivers lean to <b>${esc(lean.alt.title)}</b>.` : 'No working choice, and the drivers do not lean either way.'}</p>
   <div class="dk-alts">${q.alts.map(a => `<div class="dk-alt${a.chosen ? ' chosen' : ''}${a.favoured ? ' fav' : ''}"><b>${a.chosen ? '● ' : a.favoured ? '★ ' : ''}${esc(a.alt.id)} ${esc(a.alt.title)}</b><small>${esc(a.alt.pattern || 'no pattern recorded')}${a.alt.antiPattern ? ' · avoid: ' + esc(a.alt.antiPattern) : ''}</small><span>${names(a.patterns.records)}${names(a.anti.records)}</span><span>${a.effects.map(eff).join('')}</span></div>`).join('')}</div>
   <div class="cm-acts">${act('probe', `data-id="${esc(id)}" aria-pressed="${probed}"`, icon('probe') + (probed ? 'Unplug the probe' : 'Keep a probe on it'), probed ? '' : 'gold')}${chLink(3, id, 'Open in Chapter 3')}</div></section>
   <section class="dk-imp"><h4>What ${esc(d.selectedAlternativeId ? 'the choice' : lean ? 'choosing it' : 'it')} reaches<span>${I.upstream.length + I.downstream.length}</span></h4>
   <h5>Earlier chapters · asked whether they still hold</h5><ul>${I.upstream.map(item).join('') || '<li class="cm-muted">Nothing recorded upstream.</li>'}</ul>
   <h5>Later chapters · what carries it</h5><ul>${I.downstream.map(item).join('') || '<li class="cm-muted">Nothing recorded downstream.</li>'}</ul>
   ${act('ask-decision', `data-id="${esc(id)}"`, icon('review') + `Ask these ${I.upstream.length + I.downstream.length} records to review`, 'primary')}<p class="cm-muted">Recorded as an architecture change: each record is reviewed in its own chapter, with a reviewer and a reason. Choosing or recording the decision in Chapter 3 asks the same of them.</p></section>${solBlock('D:' + id, `${id} · ${d.question}`, [], Object.fromEntries(q.alts.map(a => [a.alt.id, a.alt.title])))}`;
}
function capHTML(id) {
  const r = Cap(id), st = r.verdict.state, per = ['service', 'worker', 'adapter', 'gateway', 'identity'].includes(r.kind);
  const perV = S.explore?.perReplica?.[r.id] ?? DM.cap.objective.perReplica?.[r.id] ?? '';
  return `<section class="cm-spec dk-cap ${st}"><h4>${esc(KIND[r.kind] || r.kind)} · ${esc(r.ref)}<span class="dk-v ${st}">${VERDICT[st]}</span></h4><p class="cm-spec-t"><b>${esc(r.title)}</b></p><p class="cm-muted">${esc(r.product || '')}</p>
   <div class="dk-read"><div><small>Demand</small><b>${esc(r.demand.text)}</b></div><div><small>For</small><b>${esc(DM.cap.objText)}</b></div></div>
   <dl class="cm-dl">${r.spec.map(s => `<div><dt>${esc(s.k)}</dt><dd><b>${esc(s.v)}</b>${s.d ? `<small>${esc(s.d)}</small>` : ''}</dd></div>`).join('')}${r.recorded ? `<div><dt>Chapter 7 records</dt><dd>${esc(r.recorded)}</dd></div>` : ''}${r.plan ? `<div><dt>Chapter 10 records</dt><dd>${esc(r.plan.plan.ref)} · ${r.plan.minReady ?? '?'} to ${r.plan.maxReplicas ?? '?'} replicas · ${esc(placed(r.plan))}</dd></div>` : ''}</dl>
   ${r.math.length ? `<h5>The arithmetic</h5><ol class="dk-math">${r.math.map(m => `<li>${esc(m)}</li>`).join('')}</ol>` : ''}
   ${(r.facts || []).length ? `<h5>Product rules</h5><ul class="dk-facts">${r.facts.map(f => `<li>${esc(f.text)} <small>${esc(f.advice)}</small><a href="${esc(f.src)}" target="_blank" rel="noopener noreferrer">Where it is documented</a></li>`).join('')}</ul>` : ''}
   <p class="dk-verdict ${st}">${esc(r.verdict.why)}</p>
   ${per ? `<label class="dk-in col"><span>Each replica handles</span><span><input type="number" min="1" step="10" data-dk-in="perReplica" data-id="${esc(r.id)}" value="${esc(perV)}" placeholder="${esc(r.spec.find(s => s.k === 'Each replica')?.v || '')}"> ${esc(r.demand.unit)}</span><small>Set it from a load test; it is kept with the objective.</small></label>` : ''}
   <div class="cm-acts">${r.fix ? chLink(r.fix.chapter, r.fix.id, r.fix.label, r.plan && fixes().forCell(r.plan.plan.id, 'capacity').length ? 'cm-btn' : 'cm-btn primary') : ''}${r.plan ? act('to-vitals', `data-id="${esc(r.plan.plan.id)}"`, 'See its vitals') : ''}</div></section>${r.plan ? fixFor({id: r.plan.plan.id}, 'capacity') : ''}${choiceHTML(r.id)}`;
}
function choiceHTML(id) {
  const C = DM.choices?.get(id);
  if (!C) return '';
  const n = suggestionCommands(C).length;
  const sw = fixes().byId.get('switch:' + id);
  return `<section class="dk-choice"><h4>The product choice<span>${C.options.length} options</span></h4>${choiceSummaryHTML(C)}${choiceTableHTML(C)}<div class="cm-acts">${n ? act('record-suggestions', `data-id="${esc(id)}"`, `Record ${n} suggested judgement${n === 1 ? '' : 's'} in Chapter 7`, 'gold') : ''}${chLink(7, id, 'Compare the options in Chapter 7')}<button type="button" class="cm-btn" data-dk="noop" data-k-action="product-compare" data-id="${esc(id)}">Compare in Mind Factory</button></div></section>${sw ? fixHTML(sw) : ''}`;
}
function loadOverview() {
  const C = DM.cap, O = C.objective, short = C.rows.filter(r => r.verdict.state === 'bad' || r.verdict.state === 'warn');
  return `<section class="cm-spec"><h4>What it takes<span>${esc(O.source.kind === 'explore' ? 'explored' : O.source.kind)}</span></h4><p class="cm-spec-t"><b>${esc(C.objText)}</b></p><p>${esc(O.source.text)}${O.source.src ? ` <small class="cm-muted">(${esc(O.source.src)})</small>` : ''}.</p><p>${esc(C.lambdaMath)}.</p>${C.notes.map(n => `<p class="cm-muted">${esc(n)}</p>`).join('')}
   ${short.length ? `<h5>Short or to check · ${short.length}</h5><div class="dk-links">${short.map(r => `<button type="button" class="cm-link" data-sel="${esc(r.id)}">${esc(r.ref)} ${esc(r.title)} · ${esc(r.spec[0]?.k.toLowerCase() || '')} ${esc(r.spec[0]?.v || '')}</button>`).join('')}</div>` : '<p>Every part the design records can carry it.</p>'}
   <div class="cm-acts">${O.source.kind === 'review' && !S.explore ? act('clear-objective', '', 'Clear the saved objective') : act('save-objective', '', icon('save') + 'Save as the review objective', 'primary')}${act('ask-load', '', icon('review') + 'Ask Chapters 2, 7 and 10 to review')}</div>
   <p class="cm-muted">Saved, the objective and its assumptions go into the SDD with this specification.</p></section>`;
}
function assumptionsHTML() {
  const A = DM.cap.objective.assume, groups = [...new Set(ASSUMPTIONS.map(a => a.group))];
  return `<section class="dk-assume"><h4>Planning assumptions<span>${ASSUMPTIONS.length}</span></h4><p class="cm-muted">Numbers the design does not record. Each is a starting point to replace with evidence.</p>${groups.map(g => `<fieldset><legend>${esc(g)}</legend>${ASSUMPTIONS.filter(a => a.group === g).map(a => a.options ? `<label class="dk-in col"><span>${esc(a.label)}</span><select data-dk-in="assume" data-key="${a.key}">${a.options.map(([v, t]) => `<option value="${v}"${A[a.key] === v ? ' selected' : ''}>${t}</option>`).join('')}</select><small>${esc(a.why)}</small></label>` : `<label class="dk-in col"><span>${esc(a.label)}</span><span><input type="number" step="any" min="0" data-dk-in="assume" data-key="${a.key}" value="${esc(A[a.key])}"> ${esc(a.unit)}</span><small>${esc(a.why)}</small></label>`).join('')}</fieldset>`).join('')}</section>`;
}
// The decisions of one plan step, as Sol reads them: its drafts, then its judgements.
function stepIds(g) { return [...stepDrafts(g).map(d => 'F:' + d.id), ...stepJudgements(g).map(j => 'J:' + j.id)].slice(0, MAX_DECISIONS); }
// Sol's rounds: the first decision of each step, the most critical first.
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
  return `<section class="dk-prev"><h4>Previewing<span>${ids.length} draft${ids.length === 1 ? '' : 's'} · nothing applied</span></h4><p class="cm-spec-t"><b>${esc(one ? one.title : `${ids.length} drafted fixes together`)}</b></p><p class="dk-effect">${esc(describeEffect(E))}</p>${cellPills(E.changed)}
   ${E.errors.length ? `<p class="dk-verdict warn">${E.errors.length} draft${E.errors.length === 1 ? '' : 's'} could not be built on top of the others: ${esc(E.errors[0].message)}</p>` : ''}
   <div class="cm-acts">${act('fix-apply-preview', '', icon('review') + (E.commands.length > MAX_COMMANDS ? `Review the first ${MAX_COMMANDS} changes…` : `Review and apply ${E.commands.length} change${E.commands.length === 1 ? '' : 's'}…`), 'primary')}${act('fix-stop', '', 'Stop the preview')}</div>
   <p class="cm-muted">The monitor and every cell show the desk as it would read. A ring marks each cell that changes, with the state it had.</p></section>`;
}
function vitalsOverview() {
  const B = BASE, plan = B.plan.slice(0, 8), fs = B.findings, F = fixes();
  const steps = plan.map((x, i) => {
    const ds = stepDrafts(x), js = stepJudgements(x), ids = stepIds(x), sol = solSummary(ids);
    return `<div class="dk-step ${x.state}"><button type="button" class="dk-step-b" data-dk="round" data-i="${i}"><b>${esc(x.text)}</b><small>${esc(VITALS.find(v => v.id === x.vital).label)} · Chapter ${x.chapter} · ${esc(x.rows.map(r => r.ref).slice(0, 5).join(', '))}${x.rows.length > 5 ? '…' : ''}</small></button>
     <div class="dk-step-a">${ds.length ? `<span class="dk-rxn" title="Drafted from the desk's own numbers">℞ ${ds.length} drafted</span>${act('fix-preview-step', `data-i="${i}"`, 'Preview')}${act('fix-apply-step', `data-i="${i}"`, ds.length === 1 ? 'Review…' : `Review all ${ds.length}…`, 'primary')}` : `<span class="dk-rxn none">${js.length ? 'Needs your judgement' : 'Open it in its chapter'}</span>`}${ids.length ? act('sol-ask', `data-ids="${esc(ids.join(','))}" data-title="${esc(x.text)}"`, sol ? 'Ask Sol again' : 'Ask Sol', 'sol') : ''}</div>${sol ? `<p class="dk-solsum">${sol}</p>` : ''}</div>`;
  }).join('');
  const fixesN = F.drafts.filter(d => !d.switchPoint), switches = F.drafts.filter(d => d.switchPoint), cells = new Set(fixesN.flatMap(d => d.aims)).size;
  return `${previewHTML()}<section class="cm-spec"><h4>Where to start<span>${B.plan.length}</span></h4><p class="cm-muted">The vitals that read critical or give no signal, grouped by what would fix them — the most first. ℞ marks a fix the desk has drafted.</p><div class="dk-steps">${steps}</div>${act('walk-next', '', icon('play') + 'Walk the rounds')}</section>
   ${F.drafts.length ? `<section class="dk-tray"><h4>Drafted fixes<span>${fixesN.length}</span></h4><p>${fixesN.length} change${fixesN.length === 1 ? '' : 's'} drafted from the desk's own numbers, for ${cells} of the readings above${F.judgements.length ? `; ${F.judgements.length} need${F.judgements.length === 1 ? 's' : ''} a judgement the desk will not make for you` : ''}.</p>
    <div class="cm-acts">${fixesN.length ? act('fix-preview-all', '', icon('vitals') + 'Preview them all on the desk', 'gold') : ''}${roundIds().length ? act('sol-ask', `data-ids="${esc(roundIds().join(','))}" data-title="Sol’s rounds: the first decision in each step"`, 'Sol’s rounds', 'sol') : ''}</div>
    <p class="cm-muted">A preview shows the monitor as it would read. Nothing is applied until you review it in the owning chapter's change review — one step at a time, so you can watch the monitor turn.</p>
    ${switches.length ? `<h5>Product choices at a switch point · ${switches.length}</h5><div class="dk-links">${switches.map(d => `<button type="button" class="cm-link warn" data-sel="F:${esc(d.id)}">${esc(d.title)}</button>`).join('')}</div>` : ''}
    ${F.judgements.length ? `<details class="dk-judge"><summary>Needs your judgement · ${F.judgements.length}</summary><ul>${F.judgements.map(j => `<li><button type="button" class="cm-link" data-sel="${esc(j.row ? `C:${j.row}:${j.vital}` : '')}">${esc(j.ref)} · ${esc(VITALS.find(v => v.id === j.vital)?.label || j.vital)}</button><small>${esc(j.text)}</small></li>`).join('')}</ul></details>` : ''}</section>` : ''}
   ${fs.length ? `<section class="dk-find"><h4>Anti-patterns · Chapter 11 findings<span>${fs.length}</span></h4>${fs.map(f => { const ds = antiDrafts(f); return `<div class="dk-f"><b>${esc(f.anti.name)}</b><i class="dk-tr-s">${esc(f.treatment)}</i><p>${esc(f.anti.text)}</p>${f.anti.playbook ? `<small class="sp-pb" title="${esc(f.anti.playbook.src)}">SA Playbook: “${esc(f.anti.playbook.text)}”</small>` : ''}<div class="cm-acts">${ds.length ? act('fix-preview-ids', `data-ids="${esc(ds.map(d => d.id).join(','))}"`, `℞ Preview ${ds.length} drafted fix${ds.length === 1 ? '' : 'es'}`, 'gold') : ''}${f.fix ? chLink(f.fix.chapter, f.anti.objects[0]?.id, f.fix.verb, 'cm-btn') : ''}${f.finding ? act('treat', `data-id="${esc(f.finding.id)}"`, 'Treat it in Chapter 11') : ''}</div></div>`; }).join('')}<p class="cm-muted">Each can be fixed in the chapter that owns it, or treated here: fixed before review, carried as an action, or accepted as a limitation with reasons.</p></section>` : ''}`;
}
function traceOverview() {
  return `<section class="cm-spec"><h4>The thread<span>${DM.trace.length}</span></h4><p class="cm-muted">Each requirement followed through the chapters, as Chapter 11's trail follows it.</p><div class="dk-links">${DM.trace.map(t => `<button type="button" class="cm-link${t.firstBreak ? ' warn' : ''}" data-sel="${esc(t.id)}">${esc(describeTrace(t))}</button>`).join('')}</div></section>`;
}
function reqHTML(id) {
  const t = Req(id), runs = t.cells.runtime.map(x => Row(x.id)).filter(Boolean);
  return `<section class="cm-spec"><h4>Requirement · ${esc(t.id)}<span>${t.reviewed ? 'trail reviewed' : 'not reviewed'}</span></h4><p class="cm-spec-t"><b>${esc(t.req.title)}</b></p><p>${esc(describeTrace(t))}</p><p class="cm-muted">Acceptance: ${esc(t.req.acceptance || 'not recorded')}</p>
   <dl class="cm-dl">${TRACE_COLS.filter(c => c.id !== 'vitals').map(c => `<div class="${t.cells[c.id].length ? '' : 'miss'}"><dt>${esc(c.label)}<small>Ch ${c.ch}</small></dt><dd>${t.cells[c.id].map(x => `<button type="button" class="cm-link" data-sel="${esc(x.id)}">${esc(x.ref)} ${esc(x.label)}</button>`).join('') || 'None recorded'}</dd></div>`).join('')}</dl>
   <div class="cm-acts">${runs.length ? act('probe-many', `data-ids="${esc(runs.slice(0, MAX_PROBES).map(r => r.id).join(','))}"`, icon('probe') + `Probe the parts it runs on`, 'gold') : ''}${chLink(1, t.id, 'Open in Chapter 1')}<a class="cm-btn" href="${esc(projectURL('/?chapter=11&tab=work'))}">Review the trail in Chapter 11</a></div></section>`;
}
function objectHTML(id) {
  const x = chipOf(id), p = project();
  const spec = specPanelHTML(p, id);
  return `<section class="cm-spec"><h4>Chapter ${x?.chapter || ''} · ${esc(x?.ref || id)}</h4><p class="cm-spec-t"><b>${esc(x?.label || id)}</b></p><div class="cm-acts">${x ? chLink(x.chapter, id, 'Open in Chapter ' + x.chapter) : ''}</div></section>${spec}`;
}
function reading() {
  const t = S.view === 'load' ? '<p>Set an objective above. Each card is a part and what the objective asks of it — the demand, the replicas or nodes, and what follows — against what Chapters 7 and 10 record. Select a card for the arithmetic, the product rules it rests on and where to change it.</p>'
    : S.view === 'trace' ? '<p>Each row follows one requirement through the chapters. A red gap is a break in the thread: something the requirement must pass through is not recorded. Select any record to read it; a decision opens its probe.</p>'
    : '<p>Each row is a running part; each column a vital sign. A cell is what the design records, read against the target its drivers and platform set. <b>No signal</b> means the value or the target is not recorded; <b>not carried</b> means no driver asks it of this part.</p><p>Plug a probe into the parts you are watching; select a cell for the arithmetic and what would move it.</p>';
  return `<section><h4>Reading this view</h4>${t}</section>`;
}
function panel() {
  const box = root.querySelector('.cm-panel');
  if (!S.panel) { box.innerHTML = ''; return; }
  const s = S.sel;
  let body = '';
  if (s?.startsWith('C:')) { const [, id, v] = s.split(':'); body = vitalDetail(Row(id), v); }
  else if (s?.startsWith('F:')) { const d = fixes().byId.get(s.slice(2)); body = d ? fixHTML(d) : ''; }
  else if (s && Row(s)) body = rowChart(Row(s));
  else if (s && Cap(s)) body = capHTML(s);
  else if (s && Dec(s)) body = decisionHTML(s);
  else if (s && Req(s)) body = reqHTML(s);
  else if (s) { const r = DM.rows.find(r => r.assetId === s); body = r ? rowChart(r) : objectHTML(s); }
  else body = S.view === 'load' ? loadOverview() : S.view === 'trace' ? traceOverview() : vitalsOverview();
  const scroll = box.scrollTop;
  keepFocus(box, () => pendingHTML() + probesHTML() + body + (S.view === 'load' ? assumptionsHTML() : '') + reading());
  box.scrollTop = scroll;
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
function walkBar() {
  const bar = root.querySelector('.cm-walk'), R = rounds(), n = R.length;
  if (S.view !== 'vitals' || !n) { bar.innerHTML = `<p class="cm-walk-text">${S.view === 'load' ? 'Change the objective or an assumption: every part is read again.' : S.view === 'trace' ? 'Select a requirement to follow its thread.' : 'Nothing reads critical: no rounds to walk.'}</p>`; return; }
  const cur = S.walk >= 0 ? R[S.walk] : null;
  const rx = cur?.drafts?.length ? `<button type="button" class="cm-btn gold" data-dk="fix-preview-ids" data-ids="${esc(cur.drafts.join(','))}">℞ Preview ${cur.drafts.length} drafted fix${cur.drafts.length === 1 ? '' : 'es'}</button><button type="button" class="cm-btn primary" data-dk="fix-apply-ids" data-ids="${esc(cur.drafts.join(','))}">Review…</button>` : '';
  bar.innerHTML = `<button type="button" class="cm-btn" data-dk="walk-prev" aria-label="Previous" ${S.walk <= 0 ? 'disabled' : ''}>‹</button><button type="button" class="cm-btn" data-dk="walk-next">${S.walk < 0 ? icon('play') + '<span>Walk the rounds</span>' : S.walk >= n - 1 ? 'Done' : 'Next ›'}</button><p class="cm-walk-text">${cur ? `<b>${S.walk + 1} / ${n}</b> ${esc(cur.text)}${cur.fix ? ` <a href="${esc(chapterURL(cur.fix.chapter, cur.fix.id))}">${esc(cur.fix.label || 'Open Chapter ' + cur.fix.chapter)} →</a>` : ''}` : `${n} things to look at, the most critical first: each vital that reads critical or silent, then each anti-pattern.`}</p>${rx}${S.walk >= 0 ? '<button type="button" class="cm-btn icon" data-dk="walk-stop" aria-label="Stop the rounds">×</button>' : ''}`;
}
function walkTo(i) {
  const R = rounds();
  if (!R.length) return;
  if (S.view !== 'vitals' || S.filter !== 'all') { S.view = 'vitals'; S.filter = 'all'; fitPending = true; }
  S.walk = Math.max(-1, Math.min(R.length - 1, i)); S.sel = null;
  render();
  const w = R[S.walk]; if (!w) return;
  const rs = L.rows.filter(r => w.rows.includes(r.id));
  if (rs.length) { const y0 = Math.min(...rs.map(r => r.y)), y1 = Math.max(...rs.map(r => r.y + r.h)); const c = w.vital ? L.cols.find(c => c.id === w.vital) : null; stage.reveal(c ? c.x : L.rail, y0, c ? c.w : 300, Math.min(y1 - y0, 400)); }
}

// ---------------------------------------------------------------- asking for review, saving the objective

const reviewerKey = () => projectPreferenceKey('aiw-reviewer-name');
function reviewer() { try { return localStorage.getItem(reviewerKey()) || ''; } catch { return ''; } }
function rememberReviewer(v) { try { localStorage.setItem(reviewerKey(), v); } catch { /* optional */ } }
const CH_NAME = {1: 'Requirements', 2: 'Quality drivers', 3: 'Decisions', 4: 'Logical application', 5: 'Application realisation', 6: 'Logical technology', 7: 'Technology realisation', 8: 'Interfaces & data', 9: 'Security', 10: 'Deployment & runtime'};
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
function askReview(source, items, reason) {
  const p = project();
  if (!items.length) return;
  const body = `<form class="dk-form"><p>${esc(items.length)} record${items.length === 1 ? '' : 's'} will be asked to review. Each is reviewed in its own chapter, where the reviewer records whether it still holds, was revised, or needs a follow-up.</p>
   <fieldset class="dk-items">${items.map((x, i) => `<label class="l-checkbox"><input type="checkbox" name="item" value="${i}" checked><span><b>Ch ${x.chapter} · ${esc(titleOf(p, x.chapter, x.id))}</b><small>${esc(x.why)}</small></span></label>`).join('')}</fieldset>
   <label class="l-field"><span>Why the review is needed</span><textarea name="reason" rows="3" required maxlength="2000">${esc(reason)}</textarea></label>
   <label class="l-field"><span>Asked by</span><input name="by" required maxlength="180" value="${esc(reviewer())}"></label>
   <label class="l-checkbox"><input type="checkbox" name="reviewed" required> I have read what the desk shows and want these records reviewed.</label>
   <div class="l-dialog-actions"><button type="button" class="btn" data-dk-close>Cancel</button><button type="submit" class="btn primary">Ask for review</button></div></form>`;
  const d = dialog('Ask for review', body);
  d.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, fd = new FormData(f), chosen = fd.getAll('item').map(Number).map(i => items[i]).filter(Boolean);
    if (!chosen.length) return fail(d, 'Choose at least one record to review.');
    rememberReviewer(String(fd.get('by') || '').trim());
    await send(d, {type: 'change.request', payload: {source, items: chosen, reason: fd.get('reason'), requestedBy: fd.get('by'), reviewed: fd.has('reviewed')}}, doc => { const ev = doc.changes?.events?.at(-1); return {text: `${ev?.id || 'The request'} recorded: ${chosen.length} record${chosen.length === 1 ? '' : 's'} asked to review.`, eventId: ev?.id}; });
  });
}
function saveObjective() {
  if (S.preview) { S.preview = null; rebuild(); render(); }
  const O = DM.cap.objective;
  const body = `<form class="dk-form"><p>Save <b>${esc(DM.cap.objText)}</b> as the objective this review plans for, with its ${ASSUMPTIONS.length} planning assumptions${Object.keys(O.perReplica || {}).length ? ' and the throughput set for ' + Object.keys(O.perReplica).length + ' part' + (Object.keys(O.perReplica).length === 1 ? '' : 's') : ''}. The SDD then carries the performance specification it asks for.</p>
   <p class="cm-muted">${esc(DM.cap.lambdaMath)}.</p>
   <label class="l-field"><span>Why this objective</span><textarea name="rationale" rows="3" maxlength="2000">${esc(O.source.kind === 'playbook' ? 'The SA Playbook\'s example target, until the business states its own.' : '')}</textarea></label>
   <label class="l-field"><span>Set by</span><input name="reviewer" required maxlength="180" value="${esc(reviewer())}"></label>
   <label class="l-checkbox"><input type="checkbox" name="reviewed" required> I have reviewed the objective and its assumptions.</label>
   <div class="l-dialog-actions"><button type="button" class="btn" data-dk-close>Cancel</button><button type="submit" class="btn primary">Save the objective</button></div></form>`;
  const d = dialog('Save the review objective', body);
  d.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    rememberReviewer(String(fd.get('reviewer') || '').trim());
    const ok = await send(d, {type: 'review.objective', payload: {kind: O.kind, value: O.value, assumptions: O.assume, perReplica: O.perReplica, surge: O.surge ? O.surge.on : true, reviewer: fd.get('reviewer'), rationale: fd.get('rationale'), reviewed: fd.has('reviewed')}}, () => ({text: `Saved: this review plans for ${DM.cap.objText}. The SDD carries its performance specification.`}));
    if (ok) { S.explore = null; save(); rebuild(); render(); }
  });
}
function clearObjective() {
  const d = dialog('Clear the review objective', `<form class="dk-form"><p>The desk goes back to ${esc(DM.R.drivers.some(x => x.category === 'scalability') ? 'the Chapter 2 scalability driver' : 'the SA Playbook\'s example target')}, and the SDD no longer carries this performance specification.</p><div class="l-dialog-actions"><button type="button" class="btn" data-dk-close>Cancel</button><button type="submit" class="btn primary">Clear it</button></div></form>`);
  d.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); await send(d, {type: 'review.objective-clear', payload: {}}, () => ({text: 'The review objective is cleared.'})); });
}
function fail(d, message) { const e = d.querySelector('.dk-err'); e.hidden = false; e.textContent = message; e.scrollIntoView({block: 'nearest'}); return false; }
async function send(d, command, done) {
  const store = window.aiwProjectStore;
  if (!store?.command) return fail(d, 'Open the project to save changes.');
  if (busy) return false;
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
  const box = root.querySelector('.cm-panel'); if (box && S.preview && !S.sel) box.scrollTop = 0;
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
async function solAsk(ids, title) {
  ids = ids.filter(Boolean).slice(0, MAX_DECISIONS);
  if (!ids.length) return;
  const values = Object.fromEntries(ids.filter(id => id.startsWith('F:')).map(id => id.slice(2)).filter(id => S.values[id]).map(id => [id, S.values[id]]));
  await solPrepare({ids, scope: ids.length === 1 ? ids[0] : 'desk:' + (title || 'decisions').slice(0, 80), objective: S.explore || null, values}, {title, onChange: solRender});
  const box = root?.querySelector('.cm-panel'); if (box && SOL.pending) box.scrollTop = 0;
}
async function solSendNow() {
  const prompt = root?.querySelector('[data-dk-in="sol-prompt"]')?.value ?? null;
  const run = await solSend({prompt, onChange: solRender});
  if (run) { flash = {text: SOL.note}; SOL.stamps = new Map(); render(); }
}
async function solNoted(fn) {
  try { await fn(); document.dispatchEvent(new CustomEvent('aiw:external-project')); rebuild(window.aiwProjectStore?.value?.document || project()); return true; }
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
  if (!S.sel || !L || !root) return;
  if (S.view === 'vitals') { const id = S.sel.startsWith('C:') ? S.sel.split(':')[1] : S.sel, r = L.rows.find(r => r.id === id); if (r) { const c = S.sel.startsWith('C:') ? L.cols.find(c => c.id === S.sel.split(':')[2]) : null; stage.reveal(c ? c.x : L.rail, r.y, c ? c.w : 200, r.h); } return; }
  if (S.view === 'load') { const c = L.cards.find(c => c.id === S.sel); if (c) stage.reveal(c.x, c.y, c.w, c.h); return; }
  const r = L.rows.find(r => r.id === S.sel); if (r) stage.reveal(L.rail, r.y, 300, r.h);
}
function select(id, {reveal = false} = {}) {
  S.sel = id || null; S.walk = -1;
  if (S.sel && !S.panel) S.panel = true;
  if (mode === 'model' && window.history) { const url = new URL(location.href); const obj = S.sel && !S.sel.startsWith('C:') ? S.sel : null; if (obj) url.searchParams.set('object', obj); else url.searchParams.delete('object'); window.history.replaceState(window.history.state, '', url.pathname + url.search); }
  save(); render();
  const box = root.querySelector('.cm-panel'); if (box) box.scrollTop = 0;
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
  const r = Cap(sel) ? DM.rows.find(r => r.assetId === sel) : null;
  return r ? r.id : known(sel) ? sel : null;
}
function setView(v) { if (!VIEWS.some(([id]) => id === v)) return; S.sel = carry(S.sel, v); S.view = v; S.walk = -1; fitPending = true; save(); render(); revealSelection(); }
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
  if (k === 'value') { const v = num(el.value); if (v == null || v <= 0) return; next.value = v; }
  else if (k === 'kind') next.kind = el.value === 'rate' ? 'rate' : 'users';
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
  root.addEventListener('click', e => {
    if (e.target.closest('a[href]')) return;
    const a = e.target.closest('[data-dk]');
    if (a && !a.disabled) {
      const k = a.dataset.dk;
      if (k === 'view') { setView(a.dataset.id); return; }
      if (k === 'focus') { S.focus = S.focus === a.dataset.id ? null : a.dataset.id; S.walk = -1; if (S.focus && S.sel?.startsWith('C:')) S.sel = `C:${S.sel.split(':')[1]}:${S.focus}`; if (S.view !== 'vitals') { S.view = 'vitals'; fitPending = true; } render(); const c = L.cols?.find(c => c.id === S.focus); if (c) stage.reveal(c.x, L.top, c.w, 100); return; }
      if (k === 'filter') { S.filter = a.dataset.id; fitPending = true; save(); render(); return; }
      if (k === 'probe') { e.stopPropagation(); toggleProbe(a.dataset.id); return; }
      if (k === 'probe-many') { const ids = a.dataset.ids.split(',').filter(Boolean); S.probes = [...new Set([...S.probes, ...ids])].slice(-MAX_PROBES); save(); setView('vitals'); return; }
      if (k === 'clear') { select(null); return; }
      if (k === 'explore') { cbs.explore?.(11); return; }
      if (k === 'expand') { const on = !document.body.classList.contains('cm-expanded'); document.body.classList.toggle('cm-expanded', on); a.setAttribute('aria-pressed', String(on)); sizeModel(root, 'cm-expanded'); fitPending = true; setTimeout(render, 30); return; }
      if (k === 'panel') { S.panel = !S.panel; save(); fitPending = true; render(); setTimeout(() => { fitPending = true; render(); }, 30); return; }
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
      if (k === 'record-suggestions') { const C = DM.choices?.get(a.dataset.id); if (C) recordSuggestions(C, {onDone: n => { flash = {text: `${n} judgement${n === 1 ? '' : 's'} recorded in Chapter 7 for ${C.record.ref}.`}; rebuild(window.aiwProjectStore?.value?.document || project()); render(); }}); return; }
      if (k === 'reset-objective') { S.explore = null; save(); rebuild(); render(); return; }
      if (k === 'treat') { const id = a.dataset.id; if (window.aiwReviewPage?.treat) window.aiwReviewPage.treat(id); else location.href = projectURL('/?chapter=11&tab=validate'); return; }
      if (k === 'open-change') { import('./changes-ui.js').then(m => m.openChangeReview({eventId: a.dataset.id, chapter: 'all'})).catch(() => {}); return; }
      if (k === 'flash-off') { flash = ''; render(); return; }
      if (k === 'sol-ask') { solAsk(a.dataset.ids.split(','), a.dataset.title || ''); return; }
      if (k === 'sol-send') { solSendNow(); return; }
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
  root.addEventListener('input', e => { const el = e.target.closest('[data-dk-in]'); if (el?.dataset.dkIn === 'sol-prompt') { if (SOL.pending) SOL.pending.prompt = el.value; return; } if (el && (el.type === 'number' || el.dataset.dkIn === 'fix')) onInput(el); });
  root.addEventListener('submit', e => { const f = e.target.closest('.dk-soldis'); if (!f) return; e.preventDefault(); const reason = f.querySelector('textarea')?.value.trim(); if (reason) solDismiss(f.dataset.solDismiss, reason); });
  root.addEventListener('change', e => { const el = e.target.closest('[data-dk-in]'); if (el && !['fix', 'sol-prompt'].includes(el.dataset.dkIn)) onInput(el); });
  root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-card],[data-sel][role=button]')) { e.preventDefault(); select(e.target.dataset.card || e.target.dataset.sel); } });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !root?.isConnected || document.querySelector('dialog[open]')) return;
    const a = document.activeElement;
    if (a && a !== document.body && !root.contains(a)) return;
    if (a?.closest?.('select,details[open],input,textarea')) return;
    if (S.walk >= 0) { S.walk = -1; render(); }
    else if (S.preview) stopPreview();
    else if (S.sel) select(null);
    else if (S.focus) { S.focus = null; render(); }
    else if (S.filter !== 'all' && S.view === 'vitals') { S.filter = 'all'; fitPending = true; save(); render(); }
    else if (document.body.classList.contains('cm-expanded')) root.querySelector('[data-dk="expand"]').click();
    else return;
    e.preventDefault();
  });
  root.addEventListener('pointerleave', () => { root.querySelector('.cm-tip').hidden = true; });
  window.addEventListener('resize', () => { if (!root?.isConnected) return; clearTimeout(bind._r); bind._r = setTimeout(() => { sizeModel(root, 'cm-expanded'); render(); }, 120); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!root?.isConnected || !L) return; clearTimeout(bind._ro); bind._ro = setTimeout(() => { const w = stage.box().w; if (Math.abs(w - (bind._w || 0)) > 24) { bind._w = w; fitPending = true; render(); } }, 90); }).observe(root.querySelector('.cm-stage'));
}
function tip(e) {
  const box = root.querySelector('.cm-tip'), t = e.target.closest?.('.dk-cell,.dk-rh,.dk-card,.dk-chip,.dk-ch,.dk-tr');
  if (!t || !root.contains(t)) { box.hidden = true; return; }
  let html = '';
  if (t.classList.contains('dk-cell')) { const [, id, v] = t.dataset.card.split(':'), row = Row(id), x = row?.vitals.find(y => y.vital === v); if (x) html = `<b>${esc(row.ref)} · ${esc(VITALS.find(y => y.id === v).label)} · ${esc(VSTATE[x.state].label)}</b>${esc(x.why)}`; }
  else if (t.classList.contains('dk-rh')) { const row = Row(t.dataset.card); if (row) html = `<b>${esc(row.ref)} ${esc(row.title)}</b>${esc(describeRow(DM, row))}<small class="h">Double-click to plug in a probe</small>`; }
  else if (t.classList.contains('dk-card')) { const r = Cap(t.dataset.card); if (r) html = `<b>${esc(r.ref)} ${esc(r.title)} · ${VERDICT[r.verdict.state]}</b>${esc(r.verdict.why)}`; }
  else if (t.classList.contains('dk-tr')) { const r = Req(t.dataset.card); if (r) html = `<b>${esc(r.id)} ${esc(r.req.title)}</b>${esc(describeTrace(r))}`; }
  else if (t.classList.contains('dk-ch')) { const v = VITALS.find(y => y.id === t.dataset.id); if (v) html = `<b>${esc(v.label)}</b>${esc(v.q)}<small class="h">Click to follow this vital down every part</small>`; }
  if (!html) { box.hidden = true; return; }
  box.innerHTML = html; box.hidden = false; placeTip(box, e);
}

export function deskDebug() { return {S: {...S}, DM, L}; }
