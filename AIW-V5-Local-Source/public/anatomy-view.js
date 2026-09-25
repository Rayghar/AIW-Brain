// Design anatomy — the Validate surface.
//
// The whole design as one body that grows chapter by chapter. Modules are columns that keep
// their place; bands are realization layers; lenses reveal systems running through the body.
// Any part can be dissected: the whole system → a module → one component or capability,
// with the same layers and lenses at every level. Rule-based findings sit on the parts they
// concern, and structural gaps appear as empty sockets where the missing design belongs.
// Navigation and arrangement are view preferences only; nothing here changes the project.
import {anatomySource, anatomyModel, anatomyFindings, anatomyInsights, lineage, contractGaps, STRATA, LENSES, CHAPTERS, TYPE_CHAPTER, TYPE_LABEL} from './anatomy-model.js';
import {anatomyLayout, resolveScope, LABEL_W, moduleOrder} from './anatomy-layout.js';
import {projectPreferenceKey, projectURL} from './project-context.js';
import {journeyObjectURL} from './journey-context.js';
import {mountBrainContext} from './brain-context-ui.js';
import {cursorPreference} from './cursor-preference.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const project = () => window.aiwProjectStore?.value?.document || window.aiwCurrentProject;
const PATHS = {structure: 'M5 3h5v5H5zM14 16h5v5h-5zM7.5 8v5.5h9V16', flow: 'M3 12h13m-4-5 5 5-5 5M3 5h6M3 19h6', signals: 'M3 12h3l2-6 4 12 2-6h7', information: 'M12 3c3 4 6 7 6 10.5A6 6 0 0 1 6 13.5C6 10 9 7 12 3z', protection: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z', operation: 'M4 5h16v5H4zM4 14h16v5H4zM7 7.5h.01M7 16.5h.01', reasoning: 'M8 3c0 6 8 6 8 12s-8 6-8 6M16 3c0 6-8 6-8 12s8 6 8 6M9 7h6M9 17h6', play: 'M7 4v16l13-8z', pause: 'M7 4h4v16H7zM13 4h4v16h-4z', component: 'M6 4h14v16H6zM3 8h5v3H3zM3 13h5v3H3z', responsibility: 'M4 6h16v12H4zM8 10h8M8 14h5', capability: 'M3 15h18v4H3zM6 15V9h4v6M14 15V6h4v9', technology: 'M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01', runtime: 'M5 4h14v5H5zM5 10h14v5H5zM5 16h14v4H5z', party: 'M12 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6M6 20v-4a6 6 0 0 1 12 0v4', fit: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', panel: 'M4 4h16v16H4zM14 4v16', arrange: 'M3 4h7v7H3zM14 4h7v7h-7zM3 15h7v6H3zM14 15h7v6h-7z', dissect: 'M4 4l7 7M4 4h5M4 4v5M20 20l-7-7M20 20h-5M20 20v-5', up: 'M12 19V5m-6 6 6-6 6 6'};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[n] || PATHS.structure}"/></svg>`;
// What each chapter's Validate emphasises by default: its own layer opened, its own lens.
const CHAPTER_DEFAULT = {1: {lens: 'reasoning', peel: 'intent'}, 2: {lens: 'reasoning', peel: 'intent'}, 3: {lens: 'reasoning', peel: 'intent'}, 4: {lens: 'structure', peel: 'logical'}, 5: {lens: 'structure', peel: 'application'}, 6: {lens: 'structure', peel: 'capability'}, 7: {lens: 'structure', peel: 'technology'}, 8: {lens: 'signals', peel: null}, 9: {lens: 'protection', peel: null}, 10: {lens: 'operation', peel: 'runtime'}, 11: {lens: 'structure', peel: null}};
const SHORT = {intent: 'Intent', logical: 'Logical', application: 'Application', capability: 'Platform', technology: 'Product', runtime: 'Runtime'};

let root = null, M = null, F = null, L = null, sig = null, lastDoc = null, pageChapter = 1, pageSelection = null;
let S = {chapter: 11, lens: 'structure', peel: null, scope: {kind: 'system'}, sel: null, order: {}, panel: true, markers: true, byChapter: {}, scenario: null, step: -1};
let view = {z: 1, px: 0, py: 0}, cams = new Map(), nodes = new Map(), hover = null, storyTimer = null, replaying = false, fitPending = true, groupCursor = new Map();
const pref = () => projectPreferenceKey('aiw-anatomy-v1');
function load() { try { const v = JSON.parse(localStorage.getItem(pref()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
function save() { try { localStorage.setItem(pref(), JSON.stringify({order: S.order, panel: S.panel, markers: S.markers, byChapter: S.byChapter, scope: S.scope, sel: S.sel})); } catch { /* preferences are optional */ } }

// ---------------------------------------------------------------- mount / leave

export function mountAnatomy(selection) {
  const p = project();
  const host = document.querySelector('.studio > .stage.tab-content') || document.querySelector('.r-studio > .r-surface');
  if (!p || !host) return;
  const firstMount = !root;
  if (!root) { root = document.createElement('section'); root.className = 'an'; root.setAttribute('aria-label', 'Design anatomy'); root.innerHTML = shell(); bind(); Object.assign(S, pickStored(load())); }
  // Below the Validate switch when there is one.
  const bar = host.querySelector(':scope > .vx-bar');
  if (bar ? bar.nextElementSibling !== root : host.firstElementChild !== root) { if (bar) bar.after(root); else host.prepend(root); }
  document.body.classList.add('an-active');
  const chapter = Number(selection?.chapter) || Number(new URLSearchParams(location.search).get('chapter')) || 1;
  pageSelection = selection?.id || null;
  if (chapter !== pageChapter || firstMount) { pageChapter = chapter; applyChapter(chapter); fitPending = true; }
  // The store replaces the document object after every saved change.
  if (p !== lastDoc || !M) { lastDoc = p; sig = p.id + ':' + (window.aiwProjectStore?.value?.revision ?? Date.now()); rebuild(p); }
  render();
  sizeToViewport();
}
export function leaveAnatomy() {
  stopReplay();
  document.body.classList.remove('an-active', 'an-expanded');
  root?.remove();
}
function pickStored(v) {
  const out = {};
  if (v.order && typeof v.order === 'object') out.order = v.order;
  if (typeof v.panel === 'boolean') out.panel = v.panel;
  if (typeof v.markers === 'boolean') out.markers = v.markers;
  if (v.byChapter && typeof v.byChapter === 'object') out.byChapter = v.byChapter;
  if (v.scope && typeof v.scope === 'object') out.scope = v.scope;
  if (typeof v.sel === 'string') out.sel = v.sel;
  return out;
}
function applyChapter(chapter) {
  const d = S.byChapter[chapter] || CHAPTER_DEFAULT[chapter] || CHAPTER_DEFAULT[11];
  S.chapter = chapter; S.lens = d.lens; S.peel = d.peel ?? null; S.scenario = null; S.step = -1;
  if (!lensOk(LENSES.find(l => l.id === S.lens))) S.lens = 'structure';
}
function rememberChapterChoice() { if (S.chapter === pageChapter && !replaying) { S.byChapter[pageChapter] = {lens: S.lens, peel: S.peel}; save(); } }
function rebuild(p) {
  try { M = anatomyModel(anatomySource(p)); } catch (e) { console.error('Anatomy model', e); M = null; return; }
  if (S.sel && !M.byId.has(S.sel)) S.sel = null;
  if (S.scope?.id && !M.byId.has(S.scope.id)) S.scope = {kind: 'system'};
  refreshFindings(p);
}
function refreshFindings(p = project()) {
  try { F = anatomyFindings(p, M, S.chapter); } catch (e) { console.error('Anatomy findings', e); F = {all: [], byHost: new Map(), system: []}; }
}
const lensOk = l => !!l && S.chapter >= l.ch;
const shown = t => S.chapter >= (TYPE_CHAPTER[t] || 1);
const T = id => M?.byId.get(id)?.type;
const title = id => M?.byId.get(id)?.title || id;
const ref = id => M?.byId.get(id)?.ref || id;

// ---------------------------------------------------------------- shell

function shell() {
  return `<header class="an-top"><nav class="an-crumbs" aria-label="Where you are in the design"></nav><p class="an-state" role="status" aria-live="polite"></p><div class="an-actions">
   <button type="button" class="an-btn" data-an="replay" title="Watch the design build up to this chapter">${icon('play')}<span>Replay the build-up</span></button>
   <button type="button" class="an-btn" data-an="smart" title="Reset to the smart arrangement for this view">${icon('arrange')}<span>Smart arrange</span></button>
   <button type="button" class="an-btn icon" data-an="expand" aria-pressed="false" aria-label="Expand the anatomy" title="Expand">${icon('expand')}</button>
   <button type="button" class="an-btn icon" data-an="panel" aria-pressed="true" aria-label="Show the companion panel" title="Companion">${icon('panel')}</button></div></header>
  <div class="an-bar"><div class="an-lenses" role="group" aria-label="Lens"></div><div class="an-depth" role="group" aria-label="Open a layer"></div></div>
  <div class="an-body"><div class="an-stage" tabindex="0" aria-label="Design anatomy canvas. Drag or scroll to move; Ctrl or Command and scroll to zoom.">
    <div class="an-world"><div class="an-bg"></div><svg class="an-edges an-under" aria-hidden="true"></svg><div class="an-rings" aria-hidden="true"></div><div class="an-nodes"></div><svg class="an-edges an-over" aria-hidden="true"></svg><div class="an-pills"></div></div>
    <div class="an-heads"></div><div class="an-labels"></div><div class="an-corner"></div>
    <div class="an-scenario" hidden></div>
    <div class="an-key an-min"><button type="button" class="an-kt" data-an="key" aria-expanded="false">Key</button><div class="an-legend"></div></div>
    <div class="an-zoom"><button type="button" data-an="zout" aria-label="Zoom out">−</button><button type="button" data-an="zin" aria-label="Zoom in">+</button><button type="button" data-an="fit" aria-label="Fit the width">${icon('fit')}</button></div>
  </div><aside class="an-panel" aria-label="Anatomy companion"></aside></div>
  <footer class="an-story" aria-label="The design journey"><div class="an-steps"></div><p class="an-note"></p></footer><div class="an-tip" role="tooltip" hidden></div>`;
}

// ---------------------------------------------------------------- render

function stageBox() { const st = root.querySelector('.an-stage'); return {w: st.clientWidth || 900, h: st.clientHeight || 520}; }
function render({animate = true} = {}) {
  if (!root || !M) return;
  const box = stageBox();
  // Layout depends on the model, scope, depth and stage width — never on the lens or zoom.
  L = anatomyLayout(M, {chapter: S.chapter, scope: S.scope, peel: S.peel, order: S.order, viewW: Math.max(760, box.w)});
  const hl = highlight();
  const world = root.querySelector('.an-world');
  world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
  root.classList.toggle('an-moving', animate);
  const keep = new Set();
  const layerOf = it => (['colbg'].includes(it.kind) ? '.an-bg' : '.an-nodes');
  for (const it of L.items) {
    if (it.kind === 'head') continue;
    const key = it.id; keep.add(key);
    let el = nodes.get(key); const fresh = !el;
    if (fresh) { el = document.createElement('div'); nodes.set(key, el); root.querySelector(layerOf(it)).appendChild(el); el.classList.add('an-enter'); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('an-enter'))); }
    const html = itemHTML(it); if (el._h !== html) { el.innerHTML = html; el._h = html; }
    el.className = 'an-n ' + itemClass(it, hl) + (fresh ? ' an-enter' : '');
    if (it.obj || it.gapFor) el.dataset.id = it.obj || it.gapFor; else delete el.dataset.id;
    el.dataset.kind = it.kind;
    if (it.kind === 'count') el.dataset.band = 'intent'; else delete el.dataset.band;
    el.style.left = it.x + 'px'; el.style.top = it.y + 'px'; el.style.width = it.w + 'px'; el.style.height = it.h + 'px';
    if (!['colbg'].includes(it.kind)) { el.tabIndex = it.obj || it.gapFor ? 0 : -1; el.setAttribute('role', it.obj || it.gapFor ? 'button' : 'presentation'); if (it.obj || it.gapFor) el.setAttribute('aria-label', ariaFor(it)); }
  }
  for (const [k, el] of nodes) if (!keep.has(k)) { nodes.delete(k); el.classList.add('an-enter'); setTimeout(() => el.remove(), 320); }
  drawEdges(hl); drawHeads(); drawLabels(); chrome(); panel(hl);
  if (fitPending) { fitPending = false; const restored = fitWidth(); if (!restored) revealBand(S.peel); } else clampView();
  applyView();
  clearTimeout(render._t); render._t = setTimeout(() => root?.classList.remove('an-moving'), animate ? 420 : 0);
}
function highlight() {
  if (S.scenario && S.step >= 0) { const sc = scenarios().find(s => s.id === S.scenario); if (sc) { const set = new Set(); sc.steps.slice(0, S.step + 1).forEach(f => { for (const x of [f.from, f.to]) { set.add(x); (M.realizes.get(x) || []).forEach(r => set.add(r)); } set.add(f.id); }); return set; } }
  if (S.sel) return lineage(M, S.sel, {lens: S.lens});
  if (hover) return lineage(M, hover, {lens: S.lens});
  return null;
}
function findingsOn(id) { return (S.markers && F?.byHost.get(id)) || []; }
function marker(id) {
  const fs = findingsOn(id); if (!fs.length) return '';
  const err = fs.filter(f => f.level === 'error').length, cur = fs.some(f => f.chapter === pageChapter);
  return `<span class="an-mark ${err ? 'err' : 'warn'} ${cur ? 'cur' : ''}" title="${fs.length} finding${fs.length === 1 ? '' : 's'}${err ? ' · ' + err + ' content gap' + (err === 1 ? '' : 's') : ''}">${fs.length}</span>`;
}
function ariaFor(it) {
  const id = it.obj || it.gapFor, o = M.byId.get(id);
  if (it.kind === 'socket') return 'Gap: ' + it.label;
  const fs = findingsOn(id);
  return (TYPE_LABEL[o?.type] || 'Object') + ' ' + (o?.ref && o.ref !== o.id ? o.ref + ' ' : '') + (o?.title || id) + (fs.length ? ', ' + fs.length + ' findings' : '');
}
function itemClass(it, hl) {
  const o = it.obj, id = o || it.gapFor;
  const dim = hl && id && !hl.has(id) ? ' an-dim' : '', sel = o && S.sel === o ? ' an-sel' : '', lit = o && hl && hl.has(o) && S.sel !== o ? ' an-lit' : '';
  const lvl = ' an-' + (it.detail || 'normal');
  switch (it.kind) {
    case 'colbg': return 'an-col' + (['ext', 'ctx'].includes(it.colKind) ? ' ext' : '') + (it.colKind === 'subject' ? ' subject' : '');
    case 'intent': return 'an-card an-intent ' + T(o) + lvl + sel + lit + dim;
    case 'count': return 'an-card an-count';
    case 'resp': return 'an-card an-resp' + lvl + (it.focus ? ' an-focusobj' : '') + sel + lit + dim;
    case 'comp': return 'an-card an-comp' + lvl + (it.ctx ? ' an-ctx' : '') + sel + lit + dim;
    case 'party': return 'an-card an-party' + lvl + (it.w < 150 ? ' an-slim' : '') + (it.ctx ? ' an-ctx' : '') + sel + lit + dim;
    case 'lane': return 'an-card an-lane' + lvl + (it.orphan ? ' an-orphan' : '') + sel + lit + dim;
    case 'plate': return 'an-card an-plate' + lvl + (M.byId.get(o)?.product ? '' : ' an-unchosen') + sel + lit + dim;
    case 'run': return 'an-card an-run' + lvl + (it.platform ? ' an-platform' : '') + ((M.placements.get(o) || []).length ? '' : ' an-unplaced') + (S.lens === 'operation' ? ' an-op' : '') + sel + lit + dim;
    case 'socket': return 'an-card an-socket' + (it.next ? ' an-next' : '') + (it.w < 170 ? ' an-narrow' : '') + (hl && it.gapFor && !hl.has(it.gapFor) ? ' an-dim' : '') + (it.gapFor && S.sel === it.gapFor ? ' an-sel' : '');
  }
  return '';
}
function badges(o) {
  const b = [];
  if (S.lens === 'protection' && shown('control')) {
    const direct = M.protects.get(o.id) || [], viaContracts = [...(M.provides.get(o.id) || []), ...(M.owned.get(o.id) || [])].flatMap(x => M.protects.get(x) || []);
    const ctl = new Set([...direct, ...viaContracts]).size;
    const th = [...(M.threatsOn.get(o.id) || []), ...[...(M.provides.get(o.id) || []), ...(M.owned.get(o.id) || [])].flatMap(x => M.threatsOn.get(x) || [])];
    const open = new Set(th.filter(t => !(M.mitig.get(t) || []).length)).size;
    if (ctl) b.push(`<span class="an-b ctl" title="${ctl} control(s) on this part, its contracts or data">⛨${ctl}</span>`);
    if (th.length) b.push(`<span class="an-b thr ${open ? 'open' : ''}" title="${new Set(th).size} threat(s)${open ? ', ' + open + ' without a control' : ''}">!${new Set(th).size}</span>`);
  }
  if (S.lens === 'reasoning' && o.type === 'responsibility') { const w = M.why(o.id); if (w.reqs.length + w.qds.length + w.adrs.length) b.push(`<span class="an-b why" title="${w.reqs.length} requirement(s), ${w.qds.length} quality scenario(s), ${w.adrs.length} decision(s)">${w.reqs.length}R ${w.qds.length}Q ${w.adrs.length}D</span>`); }
  if (S.lens === 'information' && o.type === 'component') { const n = (M.owned.get(o.id) || []).length; if (n) b.push(`<span class="an-b data" title="Authoritative owner of ${n} data definition(s)">● ${n}</span>`); }
  return b.length ? `<span class="an-badges">${b.join('')}</span>` : '';
}
function chips(labels, cls = '', ids = []) { return labels.length ? `<span class="an-chips">${labels.map((l, i) => `<span class="an-chip ${cls}" ${ids[i] ? `data-sel="${esc(ids[i])}"` : ''} title="${esc(l)}">${esc(l)}</span>`).join('')}</span>` : ''; }
function itemHTML(it) {
  const o = it.obj ? M.byId.get(it.obj) : null;
  switch (it.kind) {
    case 'colbg': return '';
    case 'count': { const n = S.markers && F ? it.members.reduce((a, id) => a + (F.byHost.get(id) || []).length, 0) : 0; return `${n ? `<span class="an-mark warn" title="${n} findings on these reasons">${n}</span>` : ''}<span title="Open the Intent layer to see these reasons in place">${esc(it.label)}</span>`; }
    case 'socket': return `${it.gapFor ? marker(it.gapFor) : ''}<span class="an-sock">${it.next ? '◌' : '○'}</span><b>${esc(it.label)}</b>`;
    case 'intent': { const tag = {requirement: 'REQ', quality: 'QD', decision: 'ADR'}[o.type]; return `${marker(o.id)}<b class="an-tag">${tag}</b><span class="an-t" title="${esc(o.title)}">${esc(o.title)}</span>`; }
    case 'resp': return `${marker(o.id)}${badges(o)}<span class="an-k">${icon('responsibility')}${esc(o.ref)}</span><span class="an-t">${esc(o.title)}</span>${it.detail === 'full' && o.description ? `<span class="an-d">${esc(o.description)}</span>` : ''}`;
    case 'party': return `${marker(o.id)}<span class="an-k">${icon('party')}External</span><span class="an-t">${esc(o.title)}</span>`;
    case 'comp': {
      if (it.ctx) return `<span class="an-k">${icon('component')}${esc(M.byId.get(M.mod.get(o.id))?.title || '')}</span><span class="an-t">${esc(o.title)}</span>`;
      const realizes = M.realizes.get(o.id) || [], data = S.chapter >= 8 ? M.owned.get(o.id) || [] : [];
      const full = it.detail === 'full';
      const section = (label, html) => (html ? `<span class="an-sec"><small>${label}</small>${html}</span>` : '');
      return `${marker(o.id)}${badges(o)}<span class="an-k">${icon('component')}${esc(o.ref)}${o.owner && it.detail !== 'compact' ? ' · ' + esc(o.owner) : ''}</span><span class="an-t">${esc(o.title)}</span>${full && o.description ? `<span class="an-d">${esc(o.description)}</span>` : ''}${it.detail === 'compact' ? '' : full ? section('Realizes', chips(realizes.map(title), 'resp', realizes)) + section('Provides', chips((M.provides.get(o.id) || []).map(c => ref(c) + ' ' + title(c)), 'contract', M.provides.get(o.id) || [])) + section('Uses', chips((M.usesC.get(o.id) || []).map(c => ref(c) + ' ' + title(c)), 'contract', M.usesC.get(o.id) || [])) + section('Owns data', chips(data.map(title), 'drop', data)) : chips(realizes.map(title), 'resp', realizes) + chips(data.map(title), 'drop', data)}`;
    }
    case 'lane': { const u = it.users.length, mods = new Set(it.users.map(x => M.mod.get(x))).size; return `${marker(o.id)}${badges(o)}<span class="an-k">${icon('capability')}${it.w >= 260 ? esc(o.ref) : ''}</span><span class="an-t">${esc(o.title)}</span>${it.detail === 'open' && o.description ? `<span class="an-ld">${esc(o.description)}</span>` : ''}<span class="an-u">${it.orphan ? 'no component uses it' : u + ' component' + (u === 1 ? '' : 's') + (mods > 1 ? ' · ' + mods + ' modules' : '') + (it.elsewhere ? ' · ' + it.elsewhere + ' outside this view' : '')}</span>`; }
    case 'plate': { const opts = M.options.get(o.id) || []; return `${marker(o.id)}<span class="an-k">${icon('technology')}${it.w >= 260 ? esc(o.ref) : ''}</span><span class="an-t">${o.product ? esc(o.product) : 'Choice not recorded' + (opts.length ? ' · ' + opts.length + ' options' : '')}</span><span class="an-u">${esc(o.title.replace(/ realization$/, ''))}</span>`; }
    case 'run': {
      const pls = M.placements.get(o.id) || [];
      const pips = pls.map(pl => { const c = M.zoneColor.get(pl.zoneId) || '#557', n = Math.min(8, Number(pl.replicas) || 1); return `<span class="an-pip" style="color:${c}" title="${esc(title(pl.zoneId))} · ${n} ${pl.role === 'standby' ? 'standby' : 'active'}">${Array.from({length: n}, () => `<i class="${pl.role === 'standby' ? 'sb' : ''}"></i>`).join('')}${it.detail === 'compact' ? '' : '<em>' + esc(String(title(pl.zoneId)).replace(/^Primary site · /, '')) + '</em>'}</span>`; }).join('');
      const label = it.platform ? String(title(o.asset)).replace(/ realization$/, '') : o.title;
      return `${marker(o.id)}${it.detail === 'compact' ? '' : `<span class="an-k">${icon('runtime')}${esc(o.ref)}</span>`}<span class="an-t">${esc(label)}${it.extra?.length ? ' +' + it.extra.length : ''}</span><span class="an-pips">${pips || '<span class="an-none">not placed</span>'}</span>`;
    }
  }
  return '';
}

// ---------------------------------------------------------------- headers, labels, edges

function drawHeads() {
  const heads = L.items.filter(i => i.kind === 'head');
  const colFindings = id => { if (!S.markers || !F) return 0; let n = 0; for (const it of L.items) if (it.col === id && (it.obj || it.gapFor) && it.kind !== 'head') n += (F.byHost.get(it.obj || it.gapFor) || []).length; return n; };
  root.querySelector('.an-heads').innerHTML = `<div class="an-heads-in">${heads.map(h => {
    const canDissect = (L.scope.kind === 'system' && h.colKind === 'module') || (L.scope.kind !== 'part' && ['component', 'resp'].includes(h.colKind) && h.compId) || (L.scope.kind === 'part' && h.colKind === 'component' && h.compId);
    const target = h.colKind === 'module' ? h.moduleId : h.compId;
    const n = colFindings(h.col), narrow = h.w < 175;
    const sub = h.colKind === 'module' ? moduleSub(h.moduleId, h.w < 240) : h.sub || '';
    return `<div class="an-head ${h.colKind} ${narrow ? 'narrow' : ''}" data-col="${h.col}" data-target="${esc(target || '')}" style="left:${h.x}px;width:${h.w}px;height:${h.h}px" ${canDissect ? `draggable="false"` : ''}>
      <b title="${esc(h.title)}">${esc(h.title)}</b><span class="an-hrow"><small title="${esc(sub)}">${esc(sub)}</small>${n ? `<span class="an-hm" title="${n} findings in this column">${n}</span>` : ''}${canDissect ? `<button type="button" class="an-dis" data-an="dissect" data-id="${esc(target)}" aria-label="Dissect ${esc(h.title)}" title="Dissect ${esc(h.title)}">${narrow ? '↘' : 'Dissect ↘'}</button>` : ''}</span></div>`;
  }).join('')}</div>`;
}
function moduleSub(id, short = false) { const nr = M.resp.filter(r => M.mod.get(r.id) === id).length, nc = M.comp.filter(c => M.mod.get(c.id) === id).length; return short ? nr + ' resp' + (S.chapter >= 5 ? ' · ' + nc + ' comp' : '') : nr + ' responsibilit' + (nr === 1 ? 'y' : 'ies') + (S.chapter >= 5 ? ' · ' + nc + ' component' + (nc === 1 ? '' : 's') : ''); }
function bandFindings(id) {
  if (!S.markers || !F) return 0;
  const kinds = {intent: ['intent', 'count'], logical: ['resp'], application: ['comp', 'party'], capability: ['lane'], technology: ['plate'], runtime: ['run']}[id] || [];
  let n = 0; for (const it of L.items) if (kinds.includes(it.kind) || (it.kind === 'socket' && it.band === id)) n += (F.byHost.get(it.obj || it.gapFor) || []).length;
  return n;
}
function drawLabels() {
  root.querySelector('.an-labels').innerHTML = `<div class="an-labels-in" style="height:${L.H}px">${L.bands.map(b => {
    const s = b.stratum, n = b.corridor ? 0 : bandFindings(s.id), open = S.peel === s.id;
    const state = b.corridor ? '' : b.mode === 'future' ? 'Designed in Chapter ' + s.ch : b.mode === 'next' ? 'Next · Chapter ' + s.ch : open ? 'Opened · click to close' : 'Chapter ' + (s.id === 'intent' ? '1–3' : s.ch) + ' · click to open';
    return `<button type="button" class="an-label ${b.mode} ${b.corridor ? 'corridor' : ''} ${open ? 'open' : ''}" ${b.corridor || ['future', 'next'].includes(b.mode) ? 'disabled' : `data-an="peel" data-band="${s.id}"`} style="top:${b.y}px;height:${b.h}px" aria-pressed="${open}"><b><i style="background:${s.color}"></i>${esc(s.label)}</b>${b.h > 44 ? `<small>${esc(s.sub)}</small>` : ''}${state && b.h > 30 ? `<em>${esc(state)}</em>` : ''}${n ? `<span class="an-lm">${n}</span>` : ''}</button>`;
  }).join('')}</div>`;
  const sc = L.scope;
  root.querySelector('.an-corner').innerHTML = `<b>${esc(sc.kind === 'system' ? 'Whole system' : sc.kind === 'module' ? 'Module' : sc.partType === 'capability' ? 'Platform part' : 'Part')}</b><small>${esc(sc.kind === 'system' ? M.title : title(sc.id))}</small>`;
}
// Pills sit on corridor tracks where there is room; in narrow gutters they shrink to a dot.
// Placement avoids cards and earlier pills so labels never cover the design.
function placePills(pills) {
  const cards = L.items.filter(i => ['comp', 'party', 'resp', 'lane', 'plate', 'run', 'socket', 'intent', 'count'].includes(i.kind));
  const placed = [], out = [];
  const hit = (r, list) => list.some(o => r.x < o.x + o.w && o.x < r.x + r.w && r.y < o.y + o.h && o.y < r.y + r.h);
  for (const p of pills) {
    const text = String(p.html).replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, 'x');
    const w = Math.min(220, 16 + text.length * 5.6), h = 18, route = p.route;
    const seg = route ? longestHorizontal(route.points) : null;
    const tries = seg ? [0.5, 0.35, 0.65, 0.2, 0.8, 0.1, 0.9].map(t => [seg[0] + (seg[1] - seg[0]) * t, seg[2]]) : [[p.x, p.y]];
    let spot = null;
    for (const [x, y] of tries) { const r = {x: x - w / 2, y: y - h / 2, w, h}; if (!hit(r, cards) && !hit(r, placed)) { spot = [x, y, r]; break; } }
    if (spot) { placed.push(spot[2]); out.push({...p, x: spot[0], y: spot[1]}); continue; }
    const dotHtml = p.cls === 'ok' ? '✓' : p.cls === 'warn' ? '?' : p.cls === 'none' ? '!' : p.cls === 'thr' ? '!' : '•';
    const [x, y] = [p.x, p.y], r = {x: x - 8, y: y - 8, w: 16, h: 16};
    placed.push(r); out.push({...p, dot: true, dotHtml});
  }
  return out;
}
function longestHorizontal(pts) {
  let best = null;
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; if (Math.abs(y0 - y1) < 1) { const len = Math.abs(x1 - x0); if (!best || len > best.len) best = {len, a: Math.min(x0, x1), b: Math.max(x0, x1), y: y0}; } }
  return best ? [best.a + 10, best.b - 10, best.y] : null;
}
function roundPath(pts, r = 6) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const d1 = Math.hypot(x1 - x0, y1 - y0), d2 = Math.hypot(x2 - x1, y2 - y1), k = Math.min(r, d1 / 2, d2 / 2);
    const ax = x1 - (x1 - x0) / (d1 || 1) * k, ay = y1 - (y1 - y0) / (d1 || 1) * k, bx = x1 + (x2 - x1) / (d2 || 1) * k, by = y1 + (y2 - y1) / (d2 || 1) * k;
    d += `L${ax} ${ay}Q${x1} ${y1} ${bx} ${by}`;
  }
  const [xe, ye] = pts[pts.length - 1];
  return d + `L${xe} ${ye}`;
}
function drawEdges(hl) {
  const under = [], over = [], pills = [], rings = [];
  const playing = S.scenario && S.step >= 0 ? scenarios().find(s => s.id === S.scenario)?.steps[S.step] : null;
  // Realization threads, pillars and runtime links run beneath the cards.
  for (const t of L.threads) {
    const on = hl && hl.has(t.from) && hl.has(t.to);
    const quiet = ['flow', 'signals', 'information'].includes(S.lens) && !on;
    if (t.kind === 'operate' && !on && S.lens !== 'operation') continue;
    const cls = 'an-th ' + t.kind + (on ? ' on' : hl ? ' off' : '') + (quiet ? ' quiet' : '');
    const [a, b] = t.points;
    const d = t.kind === 'realize' ? `M${a[0]} ${a[1]}C${a[0]} ${(a[1] + b[1]) / 2} ${b[0]} ${(a[1] + b[1]) / 2} ${b[0]} ${b[1]}` : `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`;
    under.push(`<path class="${cls}" d="${d}"/>`);
    if (t.kind === 'pillar' && (!hl || on)) under.push(`<circle class="an-foot ${on ? 'on' : ''}" cx="${b[0]}" cy="${b[1]}" r="${on ? 3.4 : 2.4}"/>`);
  }
  // Reasoning: dotted threads from the reasons to the responsibility they shaped.
  if (S.lens === 'reasoning' && S.sel) {
    const targets = T(S.sel) === 'component' ? M.realizes.get(S.sel) || [] : T(S.sel) === 'responsibility' ? [S.sel] : [];
    for (const r of targets) {
      const R = L.byObj.get(r); if (!R) continue;
      const w = M.why(r), reasons = new Set([...w.reqs, ...w.qds, ...w.adrs]);
      for (const it of L.items) if (it.kind === 'intent' && reasons.has(it.obj) && it.col === R.col) {
        const a = [it.x + it.w / 2, it.y + it.h], b = [R.x + R.w / 2, R.y];
        over.push(`<path class="an-why" d="M${a[0]} ${a[1]}C${a[0]} ${(a[1] + b[1]) / 2} ${b[0]} ${(a[1] + b[1]) / 2} ${b[0]} ${b[1]}"/>`);
      }
    }
  }
  // Interactions through the corridor.
  const lensFlows = ['flow', 'signals', 'information'].includes(S.lens);
  for (const r of L.routes) {
    const on = hl && hl.has(r.from) && hl.has(r.to) && (!S.scenario || S.step < 0 || hl.has(r.id));
    const play = playing && playing.from === r.from && playing.to === r.to;
    let cls = 'an-fl' + (r.async ? ' async' : '') + (r.logical ? ' logical' : '');
    if (S.lens === 'information') cls += ' data';
    if (S.lens === 'signals') { const c = r.contract && M.byId.get(r.contract); cls += !c ? ' nocontract' : contractGaps(c).length ? ' weak' : ' sound'; }
    if (play) cls += ' play'; else if (hl) cls += on ? ' on' : ' off';
    if (!lensFlows && !on && !play) cls += ' quiet';
    (on || play ? over : under).push(`<path class="${cls}" d="${roundPath(r.points)}" marker-end="url(#an-arrow${S.lens === 'information' ? '-d' : ''})"/>`);
    const [mx, my] = r.mid, dim = hl && !on && !play;
    if (S.lens === 'signals' && S.chapter >= 8) {
      const c = r.contract && M.byId.get(r.contract), gaps = c ? contractGaps(c) : null;
      pills.push({route: r, x: mx, y: my, cls: !c ? 'none' : gaps.length ? 'warn' : 'ok', html: !c ? 'no contract' : (r.async ? '⚡ ' : '⇄ ') + esc(c.ref) + (gaps.length ? ' · ?' + gaps.length : ' ✓'), sel: c ? c.id : r.from, dim, title: c ? c.ref + ' ' + c.title + (gaps.length ? ' — missing ' + gaps.join(', ') : ' — timeout, failure and duplicate handling recorded') : 'This interaction has no interface contract'});
    } else if (S.lens === 'information' && r.contract && S.chapter >= 8) {
      const ds = M.exch.get(r.contract) || [];
      if (ds.length && (on || play || !hl)) pills.push({route: r, x: mx, y: my, cls: 'data', html: '● ' + ds.map(d => esc(title(d))).join(', '), sel: ds[0], dim, title: 'Carries ' + ds.map(title).join(', ')});
    } else if (S.lens === 'protection' && r.contract && S.chapter >= 9) {
      const th = M.threatsOn.get(r.contract) || [], ct = M.protects.get(r.contract) || [], open = th.filter(t => !(M.mitig.get(t) || []).length);
      if (th.length || ct.length) pills.push({route: r, x: mx, y: my, cls: open.length ? 'thr' : 'ok', html: (ct.length ? '⛨' + ct.length + ' ' : '') + (th.length ? '!' + th.length + (open.length ? ' open' : '') : ''), sel: r.contract, dim, title: ct.length + ' control(s), ' + th.length + ' threat(s) on ' + ref(r.contract)});
    } else if (play || (S.lens === 'flow' && on)) pills.push({route: r, x: mx, y: my, cls: '', html: esc(r.label || ''), sel: r.contract || r.to, dim: false, title: r.label});
  }
  // Protection rings: one ring per trust boundary around the parts inside it.
  if (S.lens === 'protection' && shown('boundary')) for (const it of L.items) {
    if (!it.obj || !['comp', 'lane'].includes(it.kind) || it.ctx) continue;
    (M.inBound.get(it.obj) || []).forEach((b, i) => rings.push(`<div class="an-ring" style="left:${it.x - 4 - i * 4}px;top:${it.y - 4 - i * 4}px;width:${it.w + 8 + i * 8}px;height:${it.h + 8 + i * 8}px;border-color:${M.boundColor.get(b)}" title="${esc(title(b))}"></div>`));
  }
  const defs = '<defs><marker id="an-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker><marker id="an-arrow-d" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#6f5a93"/></marker></defs>';
  for (const sel of ['.an-under', '.an-over']) { const svg = root.querySelector(sel); svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`); }
  root.querySelector('.an-under').innerHTML = defs + under.join('');
  root.querySelector('.an-over').innerHTML = defs + over.join('');
  root.querySelector('.an-rings').innerHTML = rings.join('');
  root.querySelector('.an-pills').innerHTML = placePills(pills).map(p => `<button type="button" class="an-pill ${p.cls} ${p.dot ? 'dot' : ''}" data-sel="${esc(p.sel || '')}" style="left:${p.x}px;top:${p.y}px;${p.dim ? 'opacity:.18' : ''}" title="${esc(p.title || '')}" aria-label="${esc(p.title || '')}">${p.dot ? p.dotHtml : p.html}</button>`).join('');
}

// ---------------------------------------------------------------- chrome and companion

function crumbs() {
  const sc = L.scope, parts = [`<button type="button" data-an="scope" data-kind="system" class="${sc.kind === 'system' ? 'here' : ''}">${esc(M.title)}</button>`];
  if (sc.kind !== 'system') {
    const mid = sc.kind === 'module' ? sc.id : sc.partType === 'component' ? M.mod.get(sc.id) : null;
    if (mid) parts.push(`<span aria-hidden="true">›</span><button type="button" data-an="scope" data-kind="module" data-id="${esc(mid)}" class="${sc.kind === 'module' ? 'here' : ''}">${esc(title(mid))}</button>`);
    if (sc.kind === 'part') parts.push(`<span aria-hidden="true">›</span><button type="button" class="here" data-an="noop">${esc(ref(sc.id) !== sc.id ? ref(sc.id) + ' · ' : '')}${esc(title(sc.id))}</button>`);
  }
  if (S.sel && S.sel !== sc.id) parts.push(`<span aria-hidden="true">·</span><span class="an-crumb-sel">${esc(title(S.sel))}</span>`);
  return parts.join('');
}
function chrome() {
  root.querySelector('.an-crumbs').innerHTML = crumbs();
  const total = F?.all.length || 0, err = F?.all.filter(f => f.level === 'error').length || 0;
  root.querySelector('.an-state').textContent = (S.chapter !== pageChapter ? 'Viewing the design as of Chapter ' + S.chapter + ' · ' : 'Chapter ' + pageChapter + ' · the design so far · ') + total + ' finding' + (total === 1 ? '' : 's') + (err ? ' (' + err + ' content gaps)' : '');
  root.querySelector('.an-lenses').innerHTML = LENSES.map(l => `<button type="button" class="an-lens" data-an="lens" data-id="${l.id}" aria-pressed="${S.lens === l.id}" ${lensOk(l) ? '' : 'disabled'} title="${esc(l.q + ' — like the ' + l.like + (lensOk(l) ? '' : '. Available from Chapter ' + l.ch))}">${icon(l.id)}${l.label}</button>`).join('');
  root.querySelector('.an-depth').innerHTML = '<span>Open layer</span>' + `<button type="button" class="an-dep" data-an="peel" data-band="" aria-pressed="${!S.peel}" title="See every layer at once"><i style="background:linear-gradient(${STRATA.map(s => s.color).join(',')})"></i>All</button>` + STRATA.map(s => `<button type="button" class="an-dep" data-an="peel" data-band="${s.id}" aria-pressed="${S.peel === s.id}" ${S.chapter >= s.ch ? '' : 'disabled'} title="${esc(s.label + ' — ' + s.sub)}"><i style="background:${s.color}"></i>${SHORT[s.id]}</button>`).join('');
  root.querySelector('.an-steps').innerHTML = CHAPTERS.map(([n, t]) => `<button type="button" class="an-step ${n < S.chapter ? 'done' : ''} ${n === S.chapter ? 'cur' : ''} ${n === pageChapter ? 'page' : ''} ${n > pageChapter ? 'ahead' : ''}" data-an="chapter" data-ch="${n}" title="${esc(t)}${n === pageChapter ? ' · you are here' : n > pageChapter ? ' · preview ahead of your chapter' : ''}"><small>${n}${n === pageChapter ? ' · here' : ''}</small><span>${esc(t)}</span></button>`).join('');
  root.querySelector('.an-note').textContent = CHAPTERS[S.chapter - 1][2];
  root.querySelector('[data-an="replay"]').innerHTML = icon(replaying ? 'pause' : 'play') + `<span>${replaying ? 'Stop' : 'Replay the build-up'}</span>`;
  root.querySelector('[data-an="panel"]').setAttribute('aria-pressed', String(S.panel));
  root.querySelector('.an-body').classList.toggle('no-panel', !S.panel);
  root.querySelector('.an-legend').innerHTML = legend();
  scenarioBox();
}
function legend() {
  const rows = [['#286954', 'Responsibility', 4], ['#2f6177', 'Component', 5], ['#66733a', 'Capability', 6], ['#7a5f33', 'Product', 7], ['#3f6d86', 'Runtime', 10]].filter(r => S.chapter >= r[2]).map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`);
  rows.push('<span><i class="l" style="border-color:#9bb3a3"></i>realized by / stands on</span>');
  if (S.chapter >= 5) rows.push('<span><i class="l" style="border-color:#2d6450"></i>call</span><span><i class="l dash" style="border-color:#2d6450"></i>event</span>');
  rows.push('<span><i class="gap"></i>gap · next design question</span><span><b class="an-mark warn">3</b>findings</span>');
  if (S.lens === 'protection') for (const b of M.bounds) rows.push(`<span><i style="border:2px solid ${M.boundColor.get(b.id)};background:none"></i>${esc(b.title)}</span>`);
  if (S.lens === 'operation') for (const z of M.zones) rows.push(`<span><i style="background:${M.zoneColor.get(z.id)};border-radius:50%;width:10px"></i>${esc(z.title)}</span>`);
  return rows.join('');
}
function lensCaption() {
  return {
    structure: 'Columns are the parts. Each band is one layer deeper: what a part must do, the software that does it, the platform beneath, the products, and where it runs. Threads show what realizes what.',
    flow: 'Arrows are recorded interactions, routed between the columns. Follow the work from where it enters to watch it move step by step.',
    signals: 'Every interaction should carry a contract. ✓ means timeout, failure and duplicate handling are recorded; ?n counts what is still undefined.',
    information: 'Each component shows the data it owns. Labels on the interactions show which data travels where.',
    protection: 'Coloured rings are trust boundaries. ⛨ counts controls; ! marks threats — solid red when no control covers them.',
    operation: 'Dots are running copies in each zone (hollow = standby). Dashed plans are not placed anywhere yet.',
    reasoning: 'Badges show how many requirements (R), qualities (Q) and decisions (D) shaped each responsibility. Open the Intent layer to see them in place.'
  }[S.lens];
}
function scopeSet() { if (L.scope.kind === 'system') return null; return new Set(L.items.map(i => i.obj || i.gapFor).filter(Boolean)); }
function narrative() {
  if (S.sel) return sentence(M.byId.get(S.sel));
  const ch = S.chapter, sc = L.scope, set = scopeSet(), inS = id => !set || set.has(id);
  if (ch < 4) return `<b>${esc(M.title)}</b> is still a brief: ${M.reqs.length} requirements${ch >= 2 ? ', ' + M.qds.length + ' quality scenarios' : ''}${ch >= 3 ? ' and ' + M.adrs.length + ' decisions' : ''}. The structure begins in Chapter 4.`;
  const resp = M.resp.filter(r => inS(r.id)), comp = M.comp.filter(c => inS(c.id) && !L.items.find(i => i.obj === c.id)?.ctx), caps = L.lanes.map(l => l.cap), techs = caps.map(c => M.techOf.get(c)).filter(Boolean), chosen = techs.filter(t => M.byId.get(t).product);
  const runs = comp.flatMap(c => M.runsOf.get(c.id) || []), placed = runs.filter(r => (M.placements.get(r) || []).length);
  const name = sc.kind === 'system' ? M.title : title(sc.id);
  const parts = [`<b>${esc(name)}</b>: ${resp.length} responsibilit${resp.length === 1 ? 'y' : 'ies'}${sc.kind === 'system' ? ' in ' + M.modules.length + ' modules' : ''}`];
  if (ch >= 5) parts.push(`realized by ${comp.length} component${comp.length === 1 ? '' : 's'}`);
  if (ch >= 6) { const shared = L.lanes.filter(l => new Set(l.users.map(u => M.mod.get(u))).size > 1).length; parts.push(`standing on ${caps.length} platform capabilit${caps.length === 1 ? 'y' : 'ies'}${shared ? ' (' + shared + ' shared across modules)' : ''}`); }
  if (ch >= 7) parts.push(`${chosen.length} of ${techs.length} with a chosen product`);
  if (ch >= 10) parts.push(`${placed.length} of ${runs.length} operating plans placed`);
  let out = parts.join(', ') + '.';
  if (S.lens === 'operation' && ch >= 10) {
    const zones = new Map();
    for (const r of runs) for (const pl of M.placements.get(r) || []) { const z = zones.get(pl.zoneId) || {plans: 0, copies: 0, standby: 0}; z.plans++; z.copies += Number(pl.replicas) || 1; if (pl.role === 'standby') z.standby++; zones.set(pl.zoneId, z); }
    if (zones.size) out += ' ' + [...zones].map(([z, v]) => '<b>' + esc(title(z)) + '</b>: ' + v.plans + ' plan' + (v.plans === 1 ? '' : 's') + ', ' + v.copies + ' cop' + (v.copies === 1 ? 'y' : 'ies') + (v.standby ? ' (' + v.standby + ' standby)' : '')).join('; ') + '.' + (zones.size === 1 ? ' Everything placed shares one failure domain.' : '');
  }
  return out;
}
function sentence(o) {
  if (!o) return '';
  const t = o.type, list = ids => ids.map(i => '<b>' + esc(title(i)) + '</b>').join(', ');
  if (t === 'responsibility') { const cs = M.realizedBy.get(o.id) || []; if (!cs.length || S.chapter < 5) return `<b>${esc(o.title)}</b> is a responsibility${S.chapter >= 5 ? ' no component realizes yet — a hole in the application layer' : ' of ' + esc(title(M.mod.get(o.id)))}.`; const caps = [...new Set(cs.flatMap(c => M.needs.get(c) || []))]; return `<b>${esc(o.title)}</b> is realized by ${list(cs)}${S.chapter >= 6 && caps.length ? ', which stands on ' + caps.length + ' platform capabilities' : ''}. Follow the gold thread down to see how it is built and where it runs.`; }
  if (t === 'component') { const r = M.realizes.get(o.id) || [], caps = M.needs.get(o.id) || [], pls = (M.runsOf.get(o.id) || []).flatMap(x => M.placements.get(x) || []); return `<b>${esc(o.title)}</b> realizes ${r.length ? list(r) : 'no recorded responsibility'}.${S.chapter >= 6 ? ' It needs ' + caps.length + ' capabilit' + (caps.length === 1 ? 'y' : 'ies') + '.' : ''}${S.chapter >= 10 ? (pls.length ? ' It runs as ' + pls.reduce((a, p) => a + (Number(p.replicas) || 1), 0) + ' copies across ' + new Set(pls.map(p => p.zoneId)).size + ' zone(s).' : ' It is not placed anywhere yet.') : ''}`; }
  if (t === 'capability') { const u = M.capUsers.get(o.id) || [], mods = new Set(u.map(x => M.mod.get(x))), tr = M.techOf.get(o.id), tech = tr && M.byId.get(tr); return `<b>${esc(o.title)}</b> supports ${u.length} component${u.length === 1 ? '' : 's'} across ${mods.size} module${mods.size === 1 ? '' : 's'}${mods.size > 2 ? ' — a shared part of the skeleton; its failure is felt everywhere above it' : ''}.${S.chapter >= 7 ? (tech ? (tech.product ? ' It is provided by <b>' + esc(tech.product) + '</b>.' : ' No product has been chosen yet.') : ' No technology realization exists yet.') : ''}`; }
  if (t === 'technology') { const opts = M.options.get(o.id) || []; return `<b>${esc(o.title)}</b> ${o.product ? 'uses <b>' + esc(o.product) + '</b>' : 'has no chosen product'}${opts.length ? ' · options considered: ' + opts.map(x => esc(x.title)).join(', ') : ''}.`; }
  if (t === 'runtime') { const pl = M.placements.get(o.id) || []; return `<b>${esc(o.title)}</b> ${pl.length ? 'runs in ' + pl.map(p => esc(title(p.zoneId)) + ' ×' + (p.replicas || 1) + (p.role === 'standby' ? ' (standby)' : '')).join(', ') : 'has no placement yet'}${o.minReady ? ' · needs ' + o.minReady + ' ready' : ''}.`; }
  if (['requirement', 'quality', 'decision'].includes(t)) { const d = M.shapes(o.id); return `<b>${esc(o.title)}</b> shapes ${d.length ? list(d) : 'no modelled part yet'}. Select one of them to follow it down through the layers.`; }
  if (t === 'party') return `<b>${esc(o.title)}</b> is outside the system. ${M.flows.filter(f => f.from === o.id || f.to === o.id).length} recorded interactions cross the boundary here.`;
  if (t === 'data') return `<b>${esc(o.title)}</b> is owned by <b>${esc(title(M.owner.get(o.id)))}</b>${o.classification ? ' · ' + esc(o.classification) : ''}.`;
  if (t === 'contract') return `<b>${esc(o.ref)} · ${esc(o.title)}</b> (${esc(o.style || 'request')}). Timeout: ${esc(o.timeout || 'not recorded')}. On failure: ${esc(o.failure || o.retry || 'not recorded')}. Duplicates: ${esc(o.idempotency || 'not recorded')}.`;
  return `<b>${esc(o.title)}</b>`;
}
function specimen(o) {
  const li = (label, ids, color) => (ids.length ? `<li style="--dot:${color}"><small>${label}</small>${ids.map(i => `<button type="button" data-sel="${esc(i)}">${esc(ref(i) !== i ? ref(i) + ' · ' : '')}${esc(title(i))}</button>`).join('')}</li>` : '');
  const gap = (label, text, ch) => `<li class="gap" style="--dot:#e2c07f"><small>${label}</small>${esc(text)}${ch ? ` <a href="${esc(projectURL('/?chapter=' + ch + '&tab=work'))}">Chapter ${ch} →</a>` : ''}</li>`;
  const t = o.type, rows = [];
  if (t === 'responsibility') { const w = M.why(o.id); rows.push(li('Why · requirements', w.reqs, '#587448'), li('Why · quality', w.qds, '#987431'), li('Why · decisions', w.adrs, '#805d83')); const cs = M.realizedBy.get(o.id) || []; if (S.chapter >= 5) rows.push(cs.length ? li('Realized by', cs, '#2f6177') : gap('Realized by', 'No component yet', 5)); rows.push(li('Stands on', [...new Set(cs.flatMap(c => M.needs.get(c) || []))].filter(() => S.chapter >= 6), '#66733a')); }
  if (t === 'component') { rows.push(li('Realizes', M.realizes.get(o.id) || [], '#286954'), li('Needs', S.chapter >= 6 ? M.needs.get(o.id) || [] : [], '#66733a')); const runs = M.runsOf.get(o.id) || []; if (S.chapter >= 10) rows.push(runs.length ? li('Runs as', runs, '#3f6d86') : gap('Runs as', 'Not operated yet', 10)); if (S.chapter >= 8) rows.push(li('Owns data', M.owned.get(o.id) || [], '#6f5a93'), li('Provides', M.provides.get(o.id) || [], '#9b6643'), li('Uses', M.usesC.get(o.id) || [], '#9b6643')); rows.push(li('Calls', M.flows.filter(f => f.from === o.id).map(f => f.to), '#2d6450'), li('Called by', M.flows.filter(f => f.to === o.id).map(f => f.from), '#2d6450')); if (S.chapter >= 9) rows.push(li('Inside boundary', M.inBound.get(o.id) || [], '#936180')); }
  if (t === 'capability') { rows.push(li('Supports', M.capUsers.get(o.id) || [], '#2f6177')); const tr = M.techOf.get(o.id); if (S.chapter >= 7) rows.push(tr ? li('Provided by', [tr], '#7a5f33') : gap('Provided by', 'No technology realization', 7)); }
  if (t === 'technology') rows.push(li('Realizes', [M.capOf.get(o.id)].filter(Boolean), '#66733a'), li('Options considered', (M.options.get(o.id) || []).map(x => x.id), '#b18d42'), li('Runs as', S.chapter >= 10 ? M.runsOf.get(o.id) || [] : [], '#3f6d86'));
  if (t === 'runtime') { rows.push(li('Operates', [o.asset].filter(Boolean), '#2f6177')); rows.push(`<li style="--dot:#3f6d86"><small>Placements</small>${(M.placements.get(o.id) || []).map(p => esc(title(p.zoneId)) + ' · ' + (p.replicas || 1) + ' ' + (p.role || 'active')).join('<br>') || 'None yet'}</li>`); }
  if (['requirement', 'quality', 'decision'].includes(t)) rows.push(li('Shapes', M.shapes(o.id), '#286954'));
  if (t === 'party') rows.push(li('Interacts with', [...new Set(M.flows.filter(f => f.from === o.id || f.to === o.id).map(f => (f.from === o.id ? f.to : f.from)))], '#2d6450'));
  if (t === 'data') rows.push(li('Owned by', [M.owner.get(o.id)].filter(Boolean), '#6f5a93'), li('Protected by', M.protects.get(o.id) || [], '#8f5a76'), li('Threatened by', M.threatsOn.get(o.id) || [], '#b0493a'));
  if (t === 'contract') rows.push(li('Provider', M.I('provides', o.id), '#2f6177'), li('Consumer', M.I('uses', o.id), '#2f6177'), li('Carries', M.exch.get(o.id) || [], '#6f5a93'), li('Protected by', M.protects.get(o.id) || [], '#8f5a76'), li('Threatened by', M.threatsOn.get(o.id) || [], '#b0493a'));
  const fs = F?.byHost.get(o.id) || [];
  const canDissect = ['component', 'capability', 'responsibility', 'technology', 'runtime', 'data', 'contract', 'module'].includes(t) && resolveScope(M, {kind: 'part', id: o.id}).kind !== 'system' && !(L.scope.kind === 'part' && L.scope.id === resolveScope(M, {kind: 'part', id: o.id}).id);
  const ch = TYPE_CHAPTER[t] || S.chapter, url = projectURL(journeyObjectURL({id: o.id, chapter: ch}, 'model'));
  return `<div class="an-spec"><div class="an-ref">${esc(TYPE_LABEL[t] || t)}${o.ref && o.ref !== o.id ? ' · ' + esc(o.ref) : ''}${o.owner ? ' · ' + esc(o.owner) : ''}</div><h5>${esc(o.title)}</h5>${o.description ? `<p>${esc(o.description)}</p>` : ''}<ul class="an-lin">${rows.join('')}</ul>
   ${fs.length ? `<div class="an-sfind"><small>${fs.length} finding${fs.length === 1 ? '' : 's'} on this part</small>${fs.slice(0, 6).map(f => `<p class="${f.level}"><b>${esc(f.title)}</b> ${esc(f.detail)} <em>Chapter ${f.chapter}</em></p>`).join('')}${fs.length > 6 ? `<p class="more">+${fs.length - 6} more in the chapter checks below</p>` : ''}</div>` : ''}
   <div class="an-acts">${canDissect ? `<button type="button" class="an-btn primary" data-an="dissect" data-id="${esc(o.id)}">${icon('dissect')}Dissect this part</button>` : ''}<a class="an-btn" href="${esc(url)}">Open in Chapter ${ch} model</a><button type="button" class="an-btn" data-brain-launch="design">Ask Sol</button><button type="button" class="an-btn" data-brain-launch="mind">Mind Factory</button></div></div>`;
}
function findingGroups() {
  if (!F) return [];
  const set = scopeSet(), groups = new Map();
  for (const f of F.all) {
    if (set && f.host && !set.has(f.host)) continue;
    if (set && !f.host) continue;
    const key = f.chapter + '|' + f.rule + '|' + f.level;
    if (!groups.has(key)) groups.set(key, {key, chapter: f.chapter, rule: f.rule, level: f.level, title: f.title, detail: f.detail, items: []});
    groups.get(key).items.push(f);
  }
  return [...groups.values()].sort((a, b) => (b.chapter === pageChapter) - (a.chapter === pageChapter) || (a.level === 'error' ? 0 : 1) - (b.level === 'error' ? 0 : 1) || b.items.length - a.items.length || a.chapter - b.chapter);
}
function panel(hl) {
  const o = S.sel && M.byId.get(S.sel), l = LENSES.find(x => x.id === S.lens), sc = L.scope;
  const groups = findingGroups(), ins = anatomyInsights(M, S.chapter, scopeSet());
  const depth = S.peel ? STRATA.find(s => s.id === S.peel)?.label + ' opened' : 'all layers';
  const where = sc.kind === 'system' ? 'Whole system' : sc.kind === 'module' ? 'Module · ' + title(sc.id) : (sc.partType === 'capability' ? 'Platform part · ' : 'Part · ') + title(sc.id);
  root.querySelector('.an-panel').innerHTML = `<section><h4>Where you are</h4><p class="an-where"><b>${esc(where)}</b> · ${esc(depth)} · <b>${esc(l.label)}</b> lens · as of Chapter ${S.chapter}</p><p class="an-cap">${esc(lensCaption())}</p></section>
  <section><h4>What you are looking at</h4><p class="an-narr">${narrative()}</p></section>
  ${o ? `<section><h4>Selected</h4>${specimen(o)}</section>` : ''}
  <section><h4>Findings in this view <span>${groups.reduce((n, g) => n + g.items.length, 0)}</span></h4>${groups.length ? `<div class="an-groups">${groups.slice(0, 14).map(g => `<button type="button" class="an-group ${g.level} ${g.chapter === pageChapter ? 'cur' : ''}" data-an="group" data-key="${esc(g.key)}"><i></i><span><b>${esc(g.items.length > 1 ? g.title.replace(/\b(for|of) [A-Z]{2,4}-\d+\b/, '').replace(/ [A-Z]{2,4}-\d+\b/, '') : g.title)}</b>${g.items.length > 1 ? ' <em>×' + g.items.length + '</em>' : ''}<small>Chapter ${g.chapter} · ${g.level === 'error' ? 'content gap' : 'review item'}${g.items.length > 1 ? ' · click to step through' : ''}</small></span></button>`).join('')}${groups.length > 14 ? `<p class="an-more">${groups.length - 14} more rule groups in the chapter checks below.</p>` : ''}</div>` : '<p class="an-empty">No rule-based findings on the parts in this view.</p>'}
   ${F?.system.length && sc.kind === 'system' ? `<p class="an-sys"><b>About the whole design:</b> ${F.system.slice(0, 3).map(f => esc(f.title)).join(' · ')}${F.system.length > 3 ? ' · +' + (F.system.length - 3) : ''}</p>` : ''}</section>
  <section><h4>Worth noticing</h4>${ins.length ? `<div class="an-ins">${ins.slice(0, 6).map(i => `<button type="button" class="an-insight ${i.kind}" data-sel="${esc(i.id || '')}"><i></i><span>${esc(i.text)}${i.chapter ? ' <small>Chapter ' + i.chapter + '</small>' : ''}</span></button>`).join('')}</div>` : '<p class="an-empty">No structural gaps stand out at this stage.</p>'}</section>
  <section class="an-about"><p>Derived from the saved project by rules — no AI is involved and nothing here changes the design. Findings are the same checks listed below.</p></section>`;
}

// ---------------------------------------------------------------- scenarios (Flow lens)

function scenarios() {
  if (!M) return [];
  if (scenarios._sig === sig && scenarios._ch === S.chapter) return scenarios._v;
  const out = [], starts = M.parties.filter(p => M.flows.some(f => f.from === p.id) && !M.flows.some(f => f.to === p.id)).map(p => p.id);
  if (!starts.length) { const c = M.comp.find(c => M.flows.some(f => f.from === c.id) && !M.flows.some(f => f.to === c.id)); if (c) starts.push(c.id); }
  for (const s of starts) {
    const steps = [], seen = new Set(), queue = [s];
    while (queue.length && steps.length < 24) { const x = queue.shift(); for (const f of M.flows.filter(f => f.from === x)) { if (seen.has(f.id)) continue; seen.add(f.id); steps.push(f); queue.push(f.to); } }
    if (steps.length) out.push({id: 'from:' + s, title: 'From ' + title(s), steps});
  }
  scenarios._sig = sig; scenarios._ch = S.chapter; scenarios._v = out;
  return out;
}
function scenarioBox() {
  const box = root.querySelector('.an-scenario'), list = S.lens === 'flow' && S.chapter >= 5 ? scenarios() : [];
  box.hidden = !list.length;
  if (!list.length) return;
  const sc = list.find(s => s.id === S.scenario), st = sc && S.step >= 0 ? sc.steps[S.step] : null, c = st?.contract && M.byId.get(st.contract);
  box.innerHTML = `<div class="an-row"><select data-an-field="scenario" aria-label="Follow the work"><option value="">Follow the work…</option>${list.map(s => `<option value="${esc(s.id)}" ${S.scenario === s.id ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select>${sc ? `<button type="button" class="an-btn" data-an="step-prev" aria-label="Previous step">‹</button><button type="button" class="an-btn primary" data-an="step-next">${S.step < 0 ? 'Start' : S.step >= sc.steps.length - 1 ? 'Restart' : 'Next ›'}</button>` : ''}</div>${st ? `<p><b>Step ${S.step + 1} of ${sc.steps.length}.</b> ${esc(title(st.from))} → ${esc(title(st.to))}: ${esc(st.label || '')}${c && S.chapter >= 8 ? ` <span>(${esc(c.style || 'request')}${c.timeout ? ', timeout ' + esc(c.timeout) : ''}${c.failure ? '; on failure: ' + esc(c.failure) : ''})</span>` : ''}</p>` : sc ? '<p>Start to walk the recorded interactions one at a time, in the order work reaches them.</p>' : ''}`;
}

// ---------------------------------------------------------------- camera

function applyView() {
  const {z, px, py} = view;
  root.querySelector('.an-world').style.transform = `translate(${px}px,${py}px) scale(${z})`;
  root.querySelector('.an-heads-in')?.style.setProperty('transform', `translate(${px}px,0) scale(${z})`);
  root.querySelector('.an-labels-in')?.style.setProperty('transform', `translate(0,${py}px) scale(${z})`);
  const heads = root.querySelector('.an-heads'); if (heads && L) heads.style.height = Math.round((L.items.find(i => i.kind === 'head')?.h || 58) * z + 12 * z) + 'px';
  const labels = root.querySelector('.an-labels'); if (labels) labels.style.width = Math.round(LABEL_W * z) + 'px';
  const corner = root.querySelector('.an-corner'); if (corner) { corner.style.width = Math.round(LABEL_W * z) + 'px'; corner.style.height = heads?.style.height; corner.classList.toggle('tiny', z < 0.7); }
  root.classList.toggle('an-far', z < 0.6); root.classList.toggle('an-mid', z >= 0.6 && z < 0.82);
  cams.set(camKey(), {...view, sw: stageBox().w});
}
const camKey = () => JSON.stringify([L?.scope?.kind, L?.scope?.id || '', S.peel || '', S.chapter]);
function clampView() {
  if (!L) return;
  const {w, h} = stageBox(), z = view.z, ww = L.W * z, wh = L.H * z;
  view.px = ww <= w ? Math.min(0, (w - ww) / 2) : Math.max(w - ww - 8, Math.min(0, view.px));
  view.py = wh <= h ? 0 : Math.max(h - wh - 8, Math.min(0, view.py));
}
function fitWidth() {
  const saved = cams.get(camKey()), {w} = stageBox();
  if (saved && Math.abs((saved.sw || 0) - w) < 4) { view = {z: saved.z, px: saved.px, py: saved.py}; clampView(); return true; }
  // On a phone keep text readable and let the body be panned sideways.
  view.z = Math.max(window.innerWidth < 700 ? 0.62 : 0.35, Math.min(1.1, (w - 4) / L.W)); view.px = 0; view.py = 0; clampView();
  return false;
}
// Land on the layer this chapter works on, keeping the layers above it in sight.
function revealBand(id) {
  if (!id || !L) return;
  const b = L.bands.find(x => x.id === id); if (!b) return;
  const {h} = stageBox(), z = view.z, head = ((L.items.find(i => i.kind === 'head')?.h || 58) + 18) * z;
  if ((b.y + Math.min(b.h, h / z * 0.6)) * z + view.py <= h - 20) return;
  view.py = -(b.y * z) + head + Math.max(40, (h - head) * 0.22); clampView();
}
function fitAll() { const {w, h} = stageBox(); view.z = Math.max(0.25, Math.min(1.1, (w - 4) / L.W, (h - 4) / L.H)); view.px = 0; view.py = 0; clampView(); applyView(); }
function zoomAt(z, mx, my) { const z0 = view.z; z = Math.max(0.25, Math.min(1.8, z)); view.px = mx - (mx - view.px) * z / z0; view.py = my - (my - view.py) * z / z0; view.z = z; clampView(); applyView(); }
function reveal(id) {
  const it = L.byObj.get(id) || L.items.find(i => i.gapFor === id); if (!it) return;
  const {w, h} = stageBox(), z = view.z, x = it.x * z + view.px, y = it.y * z + view.py, top = (L.items.find(i => i.kind === 'head')?.h || 58) * z + 16, left = LABEL_W * z + 8;
  if (x < left || x + it.w * z > w || y < top || y + it.h * z > h) { view.px = view.px + (w / 2 - (x + it.w * z / 2)); view.py = view.py + (h / 2 - (y + it.h * z / 2)); clampView(); root.querySelector('.an-world').classList.add('an-glide'); applyView(); setTimeout(() => root?.querySelector('.an-world')?.classList.remove('an-glide'), 460); }
}
function sizeToViewport() {
  if (!root) return;
  const expanded = document.body.classList.contains('an-expanded');
  const top = root.getBoundingClientRect().top + (expanded ? 0 : window.scrollY), footer = document.querySelector('.footer,.r-footer')?.offsetHeight || 0;
  const h = expanded ? window.innerHeight - 16 : Math.max(window.innerWidth < 700 ? 640 : 560, window.innerHeight - Math.max(0, top - window.scrollY) - footer - 16);
  root.style.setProperty('--an-h', Math.round(h) + 'px');
}

// ---------------------------------------------------------------- interaction

function select(id, {toggle = true, reveal: rv = false} = {}) {
  const next = id && M.byId.has(id) ? (toggle && S.sel === id ? null : id) : null;
  S.sel = next; hover = null;
  const p = project();
  if (p && next) { try { mountBrainContext(p, {id: next, chapter: pageChapter}, 'validate'); } catch { /* assistance is optional */ } }
  save(); render({animate: false});
  if (rv && next) reveal(next);
}
function setScope(scope, {keepSel = true} = {}) {
  const sc = resolveScope(M, scope);
  S.scope = sc.kind === 'system' ? {kind: 'system'} : {kind: sc.kind, id: sc.id};
  if (!keepSel) S.sel = null;
  if (sc.focus && !S.sel) S.sel = sc.focus;
  fitPending = true; save(); render();
}
function up() { const sc = L.scope; if (sc.kind === 'part') { const m = sc.partType === 'component' ? M.mod.get(sc.id) : null; setScope(m ? {kind: 'module', id: m} : {kind: 'system'}); } else if (sc.kind === 'module') setScope({kind: 'system'}); }
function stepChapter(n) { stopReplay(); S.chapter = Math.max(1, Math.min(11, n)); const d = S.byChapter[S.chapter] || CHAPTER_DEFAULT[S.chapter]; S.lens = lensOk(LENSES.find(l => l.id === d.lens)) ? d.lens : 'structure'; S.peel = d.peel ?? null; refreshFindings(); fitPending = true; render(); }
function replay() {
  if (replaying) { stopReplay(); applyChapter(pageChapter); refreshFindings(); render(); return; }
  replaying = true; S.sel = null; let n = 1;
  const step = () => { S.chapter = n; const d = CHAPTER_DEFAULT[n]; S.lens = d.lens; S.peel = d.peel; refreshFindings(); fitPending = true; render(); if (n >= pageChapter) { replaying = false; storyTimer = null; applyChapter(pageChapter); chrome(); return; } n++; storyTimer = setTimeout(step, 2300); };
  step();
}
function stopReplay() { if (storyTimer) clearTimeout(storyTimer); storyTimer = null; replaying = false; }
function bind() {
  const stage = root.querySelector('.an-stage');
  let drag = null, moved = false, colDrag = null;
  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('.an-zoom,.an-scenario,.an-key,.an-pill,button,select,a')) {
      const head = e.target.closest('.an-head');
      if (head && !e.target.closest('button')) colDrag = {el: head, x: e.clientX, col: Number(head.dataset.col), moved: false};
      return;
    }
    const head = e.target.closest('.an-head');
    if (head) { colDrag = {el: head, x: e.clientX, col: Number(head.dataset.col), moved: false}; return; }
    drag = {x: e.clientX, y: e.clientY, px: view.px, py: view.py}; moved = false;
  });
  window.addEventListener('pointermove', e => {
    if (!root?.isConnected) return;
    if (colDrag) { const dx = e.clientX - colDrag.x; if (Math.abs(dx) > 6) { colDrag.moved = true; colDrag.el.style.transform = `translateX(${dx / view.z}px)`; colDrag.el.classList.add('dragging'); } return; }
    if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) { moved = true; stage.classList.add('panning'); } if (moved) { view.px = drag.px + dx; view.py = drag.py + dy; clampView(); applyView(); } return; }
    tip(e);
  });
  window.addEventListener('pointerup', e => {
    if (colDrag) { const d = colDrag; colDrag = null; if (d.moved) { reorderColumn(d.col, e.clientX); root.dataset.suppressClick = '1'; setTimeout(() => { if (root) delete root.dataset.suppressClick; }, 50); } else d.el.style.transform = ''; }
    if (drag) { drag = null; stage.classList.remove('panning'); if (moved) { root.dataset.suppressClick = '1'; setTimeout(() => { if (root) delete root.dataset.suppressClick; }, 50); } }
  });
  stage.addEventListener('wheel', e => {
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) zoomAt(view.z * Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top);
    else { view.px -= e.shiftKey ? e.deltaY : e.deltaX; view.py -= e.shiftKey ? 0 : e.deltaY; clampView(); applyView(); }
  }, {passive: false});
  root.addEventListener('click', e => {
    if (root.dataset.suppressClick) return;
    const a = e.target.closest('[data-an]');
    if (a && !a.disabled) {
      const k = a.dataset.an;
      if (k === 'lens') { S.lens = a.dataset.id; if (S.lens !== 'flow') { S.scenario = null; S.step = -1; } rememberChapterChoice(); render({animate: false}); return; }
      if (k === 'peel') { const b = a.dataset.band || null; S.peel = S.peel === b ? null : b; rememberChapterChoice(); fitPending = true; render(); return; }
      if (k === 'chapter') { stepChapter(Number(a.dataset.ch)); return; }
      if (k === 'scope') { setScope(a.dataset.kind === 'module' ? {kind: 'module', id: a.dataset.id} : {kind: 'system'}); return; }
      if (k === 'dissect') { const id = a.dataset.id; if (!id) return; const tt = T(id); setScope(tt === 'module' ? {kind: 'module', id} : {kind: 'part', id}); return; }
      if (k === 'group') { stepGroup(a.dataset.key); return; }
      if (k === 'replay') { replay(); return; }
      if (k === 'smart') { const key = orderKey(); if (key) { delete S.order[key]; save(); } render(); return; }
      if (k === 'expand') { const on = !document.body.classList.contains('an-expanded'); document.body.classList.toggle('an-expanded', on); a.setAttribute('aria-pressed', String(on)); sizeToViewport(); fitPending = true; setTimeout(() => render(), 30); return; }
      if (k === 'panel') { S.panel = !S.panel; save(); render({animate: false}); fitPending = true; setTimeout(() => render({animate: false}), 30); return; }
      if (k === 'key') { const key = root.querySelector('.an-key'); key.classList.toggle('an-min'); a.setAttribute('aria-expanded', String(!key.classList.contains('an-min'))); return; }
      if (k === 'fit') { fitAll(); return; }
      if (k === 'zin' || k === 'zout') { const {w, h} = stageBox(); zoomAt(view.z * (k === 'zin' ? 1.15 : 1 / 1.15), w / 2, h / 2); return; }
      if (k === 'step-next' || k === 'step-prev') { const sc = scenarios().find(s => s.id === S.scenario); if (!sc) return; S.step = k === 'step-next' ? (S.step >= sc.steps.length - 1 ? 0 : S.step + 1) : Math.max(0, S.step - 1); S.sel = null; render({animate: false}); const st = sc.steps[S.step]; if (st) reveal(st.to); return; }
      if (k === 'noop') return;
    }
    if (e.target.closest('[data-brain-launch],a')) return;
    const s = e.target.closest('[data-sel]');
    if (s) { e.stopPropagation(); if (s.dataset.sel) select(s.dataset.sel, {toggle: false, reveal: true}); return; }
    const band = e.target.closest('.an-count');
    if (band) { S.peel = 'intent'; rememberChapterChoice(); fitPending = true; render(); return; }
    const node = e.target.closest('.an-world [data-id]');
    if (node) { select(node.dataset.id); return; }
    if (e.target.closest('.an-stage') && !e.target.closest('.an-heads,.an-labels,.an-zoom,.an-scenario,.an-key') && S.sel) select(null);
  });
  root.addEventListener('dblclick', e => {
    const head = e.target.closest('.an-head');
    if (head?.dataset.target) { const id = head.dataset.target; setScope(T(id) === 'module' ? {kind: 'module', id} : {kind: 'part', id}); return; }
    const node = e.target.closest('.an-world [data-id]');
    if (node) { const id = node.dataset.id, sc = resolveScope(M, {kind: 'part', id}); if (sc.kind !== 'system' && !(L.scope.kind === 'part' && L.scope.id === sc.id)) setScope({kind: 'part', id}); }
  });
  root.addEventListener('change', e => { if (e.target.dataset.anField === 'scenario') { S.scenario = e.target.value || null; S.step = -1; render({animate: false}); } });
  root.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (S.sel) select(null); else if (S.peel && S.peel !== (CHAPTER_DEFAULT[S.chapter]?.peel ?? null)) { S.peel = null; render(); } else if (L.scope.kind !== 'system') up(); else if (document.body.classList.contains('an-expanded')) root.querySelector('[data-an="expand"]').click(); e.preventDefault(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.an-world [data-id]')) { e.preventDefault(); if (e.shiftKey || e.key === 'Enter' && e.altKey) { const id = e.target.dataset.id; setScope({kind: 'part', id}); } else select(e.target.dataset.id); }
  });
  root.addEventListener('pointerleave', () => { root.querySelector('.an-tip').hidden = true; if (hover && !S.sel) { hover = null; softHighlight(); } });
  window.addEventListener('resize', () => { if (!root?.isConnected) return; clearTimeout(bind._r); bind._r = setTimeout(() => { sizeToViewport(); render({animate: false}); }, 120); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!root?.isConnected || !L) return; clearTimeout(bind._ro); bind._ro = setTimeout(() => { const w = stageBox().w; if (Math.abs(w - (bind._w || 0)) > 24) { bind._w = w; fitPending = true; render({animate: false}); } }, 90); }).observe(root.querySelector('.an-stage'));
}
function orderKey() { const sc = L.scope; if (sc.kind === 'system') return 'system'; if (sc.kind === 'module') return 'comp:' + sc.id; return null; }
function reorderColumn(fromIdx, clientX) {
  const key = orderKey(); if (!key) { render(); return; }
  const r = root.querySelector('.an-stage').getBoundingClientRect(), wx = (clientX - r.left - view.px) / view.z;
  const movable = L.cols.filter(c => (key === 'system' ? c.kind === 'module' : c.kind === 'component'));
  const ids = movable.map(c => (key === 'system' ? c.moduleId : c.compId)), from = L.cols[fromIdx], fromId = key === 'system' ? from.moduleId : from.compId;
  if (!fromId) { render(); return; }
  const rest = ids.filter(x => x !== fromId), centers = movable.filter(c => (key === 'system' ? c.moduleId : c.compId) !== fromId).map(c => c.x + c.w / 2);
  let at = centers.findIndex(cx => wx < cx); if (at < 0) at = rest.length;
  S.order[key] = [...rest.slice(0, at), fromId, ...rest.slice(at)]; save(); render();
}
function stepGroup(key) {
  const g = findingGroups().find(x => x.key === key); if (!g) return;
  const hosts = [...new Set(g.items.map(f => f.host).filter(Boolean))];
  if (!hosts.length) return;
  const i = ((groupCursor.get(key) ?? -1) + 1) % hosts.length; groupCursor.set(key, i);
  const id = hosts[i];
  if (!L.byObj.get(id) && !L.items.some(it => it.gapFor === id)) S.scope = {kind: 'system'};
  select(id, {toggle: false, reveal: true});
}
function tip(e) {
  const t = root.querySelector('.an-tip');
  const el = e.target.closest?.('.an-world [data-id]');
  if (!el || !cursorPreference()) { t.hidden = true; if (hover && !S.sel) { hover = null; softHighlight(); } return; }
  const id = el.dataset.id, o = M.byId.get(id); if (!o) { t.hidden = true; return; }
  const fs = F?.byHost.get(id) || [];
  t.innerHTML = `<b>${esc(o.title)}</b>${esc(TYPE_LABEL[o.type] || o.type)}${o.ref && o.ref !== o.id ? ' · ' + esc(o.ref) : ''}<small>${sentence(o).replace(/<[^>]+>/g, '')}</small>${fs.length ? `<small class="f">${fs.length} finding${fs.length === 1 ? '' : 's'} · select to see them</small>` : ''}<small class="h">Click to follow its thread · double-click to dissect</small>`;
  t.hidden = false; t.style.left = Math.min(innerWidth - 300, e.clientX + 14) + 'px'; t.style.top = Math.min(innerHeight - 160, e.clientY + 14) + 'px';
  if (!S.sel && hover !== id) { hover = id; softHighlight(); }
}
function softHighlight() {
  const hl = hover ? lineage(M, hover, {lens: S.lens}) : null;
  for (const [, el] of nodes) { const id = el.dataset.id; if (!id || el.dataset.kind === 'colbg') continue; el.classList.toggle('an-dim', !!hl && !hl.has(id)); el.classList.toggle('an-lit', !!hl && hl.has(id) && hover !== id); }
  drawEdges(hl);
}

// Render a prepared anatomy source (for example a large illustrative model) into any host,
// without a saved project. Used by layout reviews and the concept pages; read-only.
export function previewAnatomy(host, source, {chapter = 11} = {}) {
  if (!host) return;
  if (!root) { root = document.createElement('section'); root.className = 'an'; root.setAttribute('aria-label', 'Design anatomy'); root.innerHTML = shell(); bind(); }
  host.prepend(root);
  M = anatomyModel(source); F = {all: [], byHost: new Map(), system: []}; sig = 'preview:' + source.id; lastDoc = source;
  pageChapter = chapter; applyChapter(chapter); fitPending = true;
  render(); sizeToViewport();
}

// Exposed for browser verification only.
export const anatomyDebug = () => ({state: {...S}, layout: L, view: {...view}});
