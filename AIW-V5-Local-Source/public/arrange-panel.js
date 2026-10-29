// The Arrange panel (rc40, W2, audit/rc40/PLAN.md §4.2): the one surface for arranging a picture, docked at the right
// edge of the stage so the picture stays visible and live (a bottom sheet on a phone). It is what Visio and draw.io
// users know: Layout cards with a schematic preview, a name and a one-line use (the suggested one marked, the current
// one pressed; choosing re-lays out at once, undoable), Direction and Spacing, Keep pinned positions, the selection
// tools (Align, Distribute, Match, Pin), and a footer with Snap to grid, Undo, Redo, Reset positions and a status line.
// It is a dialog: focus is trapped inside it and returned to the Arrange control when it closes (its control, Escape
// or Close). It keeps the doctrine of the views: a position is never a fact (pins are this browser's presentation
// preferences), nothing here writes the canonical document, and the LLM proposes nothing.
//
// notation-view.js calls it through a small context (arrangeCtx there) and four entry points: arrangeControlHTML (the
// control in the lens row), mountArrangePanel (the docked panel, kept beside the stage), handleArrangeAction (a click
// on one of its controls) and handleArrangeKey (the keyboard inside it); rememberLayout keeps the undo history, and
// arrangeSpacing is the layout option the view passes to notationLayout.
import {arrangementsFor, architectureArrangement, ALL_ARRANGEMENTS} from './notation-model.js';
import {canSize} from './notation-layout.js';
import {esc} from './html-escape.js';
import {projectPreferenceKey} from './project-context.js';
import {nextFrame} from './model-stage.js';

// Spacing scales the layout's gap constants (notation-layout.js notationLayout `spacing`): the same picture, closer or
// more open; by-layer (rc41) moves its rows and lanes closer or apart, its corridor slots keeping their pitch.
export const SPACING = [['compact', 'Compact', 0.75], ['comfortable', 'Comfortable', 1], ['spacious', 'Spacious', 1.35]];
const HISTORY = 20;
const CARD_ORDER = ['layered', 'tree', 'orthogonal', 'radial', 'grouped', 'lanes', 'by-layer', 'sequence'];
const CARD_NAME = {tree: 'Hierarchy', orthogonal: 'Left to right', radial: 'Radial', layered: 'Layered', grouped: 'Grouped', lanes: 'Swimlanes', sequence: 'Sequence', 'by-layer': 'Concern bands'};
const CARD_USE = {tree: 'Parents over children', orthogonal: 'Ranks left to right', layered: 'Roles in bands, top to bottom', grouped: 'Inside recorded boundaries', lanes: 'Owners along the flow', sequence: 'Lifelines in columns, messages in order', 'by-layer': 'Motivation to technology'};

// The 56 × 36 schematic previews, one per layout, drawn with the theme's tokens.
const box = (x, y, w = 10, h = 6, cls = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" class="nt-arr-pv-box${cls ? ' ' + cls : ''}"/>`;
const band = (y, h, cls = '') => `<rect x="1" y="${y}" width="54" height="${h}" rx="1.5" class="nt-arr-pv-band${cls ? ' ' + cls : ''}"/>`;
const line = d => `<path d="${d}" class="nt-arr-pv-line"/>`;
const PREVIEWS = {
  layered: band(1, 10) + band(13, 10) + band(25, 10) + box(5, 3) + box(23, 3) + box(41, 3) + box(10, 15) + box(32, 15) + box(5, 27) + box(23, 27) + box(41, 27) + line('M10 9v6M28 9l-13 6M28 9l9 6M15 21l-5 6M37 21l-9 6M37 21l9 6'),
  tree: box(23, 1) + box(3, 15) + box(23, 15) + box(43, 15) + box(3, 29) + box(13, 29, 8) + box(43, 29) + line('M28 7v3H8v5M28 10v5M28 10h20v5M8 21v3h9v5M8 24v5M48 21v8'),
  orthogonal: box(1, 15) + box(19, 3) + box(19, 27) + box(37, 15) + box(45, 3) + line('M11 18h4v-12h4M11 18h4v12h4M29 6h4v12h4M29 30h4v-12h4M29 6h16'),
  radial: box(23, 15) + box(3, 2) + box(43, 2) + box(3, 28) + box(43, 28) + box(23, 2, 10, 5) + box(23, 29, 10, 6) + line('M23 17L13 8M33 17l10-9M23 19L13 28M33 19l10 9M28 15V7M28 21v8'),
  grouped: `<rect x="1" y="1" width="25" height="34" rx="2" class="nt-arr-pv-group"/><rect x="30" y="1" width="25" height="34" rx="2" class="nt-arr-pv-group"/>` + box(4, 8, 9, 6) + box(15, 8, 9, 6) + box(9, 22, 9, 6) + box(33, 8, 9, 6) + box(44, 8, 9, 6) + box(38, 22, 9, 6) + line('M13 14l1 8M19 14l-5 8M42 14l1 8M48 14l-5 8M24 11h9'),
  lanes: band(1, 11) + band(12.5, 11) + band(24, 11) + box(4, 3.5) + box(20, 15) + box(36, 26.5) + box(44, 3.5) + line('M14 6.5h6v8.5M30 18h6v8.5M46 26.5v-17'),
  'by-layer': band(1, 8, 'nt-arr-pv-motivation') + band(10, 8, 'nt-arr-pv-business') + band(19, 8, 'nt-arr-pv-application') + band(28, 7, 'nt-arr-pv-technology') + box(6, 2, 10, 5) + box(20, 2, 10, 5) + box(13, 11.5, 10, 5) + box(36, 11.5, 10, 5) + box(6, 20.5, 10, 5) + box(27, 20.5, 10, 5) + box(41, 20.5, 10, 5) + box(20, 29, 10, 5) + line('M11 7v4.5M25 7l-6 4.5M18 16.5l-6 4M41 16.5l-8 4M11 25.5l14 3.5M46 25.5l-20 3.5'),
  sequence: box(2, 1, 12, 6) + box(22, 1, 12, 6) + box(42, 1, 12, 6) + `<path d="M8 7v28M28 7v28M48 7v28" class="nt-arr-pv-life"/>` + line('M8 14h18l-3-2M8 14l15 2M28 22h18l-3-2M28 22l15 2M48 30H10l3 2')
};
export const layoutPreviewSVG = id => `<svg class="nt-arr-pv" viewBox="0 0 56 36" width="56" height="36" aria-hidden="true">${PREVIEWS[id] || PREVIEWS.tree}</svg>`;

const ICONS = {
  arrange: 'M9 3h6v5H9zM3 16h6v5H3zM15 16h6v5h-6zM12 8v4M6 16v-4h12v4',
  left: 'M4 3v18M8 6h12v4H8zM8 14h8v4H8z', center: 'M12 3v18M4 6h16v4H4zM7 14h10v4H7z', right: 'M20 3v18M4 6h12v4H4zM8 14h8v4H8z',
  top: 'M3 4h18M6 8h4v12H6zM14 8h4v8h-4z', middle: 'M3 12h18M6 4h4v16H6zM14 7h4v10h-4z', bottom: 'M3 20h18M6 4h4v12H6zM14 8h4v8h-4z',
  'distribute-horizontal': 'M3 3v18M21 3v18M7 6h3v12H7zM14 6h3v12h-3z', 'distribute-vertical': 'M3 3h18M3 21h18M6 7h12v3H6zM6 14h12v3H6z',
  'same-width': 'M4 4h16v5H4zM4 14h16v6H4zM4 12h16', 'same-height': 'M4 4h5v16H4zM14 4h6v16h-6zM12 4v16', 'same-size': 'M3 3h7v7H3zM14 14h7v7h-7zM13 5h6v6M5 13v6h6',
  snap: 'M4 4h3v3H4zM10 4h3v3h-3zM16 4h3v3h-3zM4 10h3v3H4zM10 10h3v3h-3zM16 10h3v3h-3zM4 16h3v3H4zM10 16h3v3h-3zM16 16h3v3h-3z',
  pin: 'M12 3v10M8 13h8M9 8h6M12 13v8', arrowDown: 'M12 4v16M6 14l6 6 6-6', arrowRight: 'M4 12h16M14 6l6 6-6 6'
};
const icon = (id, width = 1.6) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[id] || ICONS.arrange}"/></svg>`;
export const arrangeIconSVG = () => icon('arrange', 1.8);

// ---- the panel's own preferences (this browser, this project, this chapter): spacing and Keep pinned positions.
const prefKey = chapter => projectPreferenceKey('aiw-arrange-ch' + chapter);
export function arrangePrefs(state, chapter) {
  if (state.arrange) return state.arrange;
  let v = {}; try { v = JSON.parse(localStorage.getItem(prefKey(chapter)) || '{}') || {}; } catch { v = {}; }
  // (rc41: `direction` — a Layered picture's bands as rows, 'down', or as columns, 'right')
  state.arrange = {spacing: SPACING.some(s => s[0] === v.spacing) ? v.spacing : 'comfortable', keep: v.keep !== false, direction: v.direction === 'right' ? 'right' : 'down'};
  return state.arrange;
}
const savePrefs = (state, chapter) => { try { localStorage.setItem(prefKey(chapter), JSON.stringify(arrangePrefs(state, chapter))); } catch { /* preferences are optional */ } };
export const arrangeSpacing = (state, chapter) => SPACING.find(s => s[0] === arrangePrefs(state, chapter).spacing)?.[2] ?? 1;
// The layout's direction for the arrangement in hand (rc41): 'across' for a Layered picture read left to right, else null.
export const arrangeDirection = (state, chapter, arrangement) => (arrangement === 'layered' && arrangePrefs(state, chapter).direction === 'right' ? 'across' : null);

// ---- the history: a snapshot of every presentation preference a layout change touches; Undo and Redo walk it.
const snapshot = (state, chapter) => JSON.stringify({pins: state.pins, sizes: state.sizes, arrangement: state.arrangement, hub: state.hub, spacing: arrangePrefs(state, chapter).spacing, direction: arrangePrefs(state, chapter).direction, view: state.view});
export function rememberLayout(state, chapter = null) {
  state.history.push(snapshot(state, chapter)); if (state.history.length > HISTORY) state.history.shift();
  state.redo = [];
}
function restore(state, chapter, h) {
  const v = JSON.parse(h); state.pins = v.pins || {}; state.sizes = v.sizes || {}; state.arrangement = v.arrangement ?? null; state.hub = v.hub || null;
  if (v.spacing && SPACING.some(s => s[0] === v.spacing)) { arrangePrefs(state, chapter).spacing = v.spacing; savePrefs(state, chapter); }
  if (v.direction === 'down' || v.direction === 'right') { arrangePrefs(state, chapter).direction = v.direction; savePrefs(state, chapter); }
}
const sameView = (state, h) => { try { const v = JSON.parse(h); return !v.view || v.view === state.view; } catch { return false; } };

// ---- what the panel reads from the picture.
function facts(ctx) {
  const {state, D, L, full, sel} = ctx, layers = state.view === 'layers';
  const offered = layers ? ALL_ARRANGEMENTS.filter(x => x.id === 'by-layer') : (full ? arrangementsFor(full) : []);
  const cards = CARD_ORDER.filter(id => offered.some(x => x.id === id)).map(id => offered.find(x => x.id === id));
  const current = ctx.arrangement(), recommended = architectureArrangement(D, {selectedId: sel}), suggested = layers ? 'by-layer' : recommended.id;
  const ids = ctx.selectedIds(), selectable = (D?.nodes || []).filter(n => !n.fold), nodes = D?.nodes?.length || 0;
  const sequence = L?.arrangement === 'sequence', overview = selectable.length === 0 && nodes > 0;
  const manual = !sequence && selectable.length > 0, matching = ids.length > 1 && ids.every(id => canSize(D.nodes.find(n => n.id === id)));
  const pinCount = Object.keys(ctx.pins()).length, prefs = arrangePrefs(state, ctx.chapter);
  const undo = state.history.filter(h => sameView(state, h)).length, redo = (state.redo || []).filter(h => sameView(state, h)).length;
  const hubName = (() => { if (!D?.nodes?.length) return ''; const by = new Map(D.nodes.map(n => [n.id, n])); if (state.hub && by.has(state.hub)) return by.get(state.hub).title; const degree = new Map(); for (const e of D.edges || []) { if (e.from !== e.to) { degree.set(e.from, (degree.get(e.from) || 0) + 1); degree.set(e.to, (degree.get(e.to) || 0) + 1); } } const top = [...D.nodes].sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0) || String(a.id).localeCompare(String(b.id)))[0]; return top?.title || ''; })();
  return {layers, cards, current, recommended, suggested, ids, selectable, nodes, sequence, overview, manual, matching, pinCount, prefs, undo, redo, hubName};
}
const titleOf = id => ALL_ARRANGEMENTS.find(x => x.id === id)?.title || id;
const whyNot = (f, min) => (f.sequence ? 'Sequence positions carry their own meaning' : f.overview ? 'Open the individual elements first' : min === 1 ? 'Select an element (Shift-click)' : `Select at least ${min} elements (Shift-click)`);

// ---- the control in the lens row (the only entry point; aria-expanded says whether the panel is docked).
export function arrangeControlHTML(ctx) {
  const open = !!ctx.state.arrangeOpen && ctx.picture;
  return `<div class="nt-menu" data-nt-menu="arrange"><button type="button" class="cm-btn" data-nt="menu" data-id="arrange" aria-expanded="${open}" aria-haspopup="dialog" title="${open ? 'Close the Arrange panel' : 'Arrange the picture: layout, direction, spacing, align, distribute, size'}">${arrangeIconSVG()}<span>Arrange</span></button></div>`;
}

// ---- the panel's HTML, in sections the mount diffs one by one (so the keyboard keeps its place in an unchanged one).
export function arrangePanelHTML(ctx) {
  const f = facts(ctx), {state, L} = ctx, reason = f.layers ? 'Separate intent, behavior and realization. Type groups retain every record; pinned positions are retained.' : f.recommended.reason;
  const card = x => { const sug = x.id === f.suggested, cur = x.id === f.current, use = x.id === 'radial' ? (f.hubName ? `Around ${f.hubName}` : 'Around a hub') : CARD_USE[x.id] || x.sub; return `<button type="button" class="nt-arr-card" data-nt="arrange" data-id="${esc(x.id)}" aria-pressed="${cur}" title="${esc(x.title + ' · ' + x.sub + (sug ? ' · Suggested: ' + reason : ''))}">${layoutPreviewSVG(x.id)}<b>${esc(CARD_NAME[x.id] || x.title)}</b><small>${esc(use)}</small>${sug ? '<i class="nt-arr-badge">Suggested</i>' : ''}</button>`; };
  const layout = `<section class="nt-arr-sec" data-arr-section="layout"><div class="nt-arr-sec-head"><h5>Layout</h5><button type="button" class="nt-arr-suggest" data-nt="smart-arrange"${f.nodes ? '' : ' disabled'} title="${esc(f.nodes ? 'Apply the suggested layout: ' + reason : 'Add records to this view before arranging them')}">Suggested · ${esc(titleOf(f.suggested))}${f.suggested === f.current ? ' · in use' : ''}</button></div><div class="nt-arr-cards" role="group" aria-label="Layout">${f.cards.map(card).join('')}</div><p class="nt-arr-why">${esc(reason)}</p></section>`;
  // (rc41: a Layered picture reads top to bottom, its bands as rows, or left to right, its bands as columns)
  const hier = ['tree', 'orthogonal'].includes(f.current), layered = f.current === 'layered', across = layered && f.prefs.direction === 'right', dirWhy = f.layers ? 'Concern bands run top to bottom' : f.sequence ? 'A sequence reads top to bottom' : 'Direction applies to the Hierarchy, Layered and Left to right layouts';
  const dirBtn = (id, label, pressed, enabled) => `<button type="button" data-nt="arrange-direction" data-id="${id}" aria-pressed="${pressed}"${enabled ? '' : ' disabled'} title="${esc(enabled ? label : label + ' · ' + dirWhy)}">${icon(id === 'down' ? 'arrowDown' : 'arrowRight')}<span>${label}</span></button>`;
  const spaceOn = f.nodes > 0 && !f.sequence, spaceWhy = f.sequence ? 'A sequence keeps its own spacing' : 'Nothing to space';
  const options = `<section class="nt-arr-sec" data-arr-section="options"><div class="nt-arr-row"><span class="nt-arr-k">Direction</span><div class="nt-arr-seg" role="group" aria-label="Direction">${dirBtn('down', 'Top to bottom', f.current !== 'orthogonal' && !across, hier || layered)}${dirBtn('right', 'Left to right', f.current === 'orthogonal' || across, hier || layered)}</div></div><div class="nt-arr-row"><span class="nt-arr-k">Spacing</span><div class="nt-arr-seg" role="group" aria-label="Spacing">${SPACING.map(([id, label]) => `<button type="button" data-nt="arrange-spacing" data-id="${id}" aria-pressed="${f.prefs.spacing === id}"${spaceOn ? '' : ' disabled'} title="${esc(spaceOn ? label + (f.layers ? ' spacing between the concern bands and their rows' : ' spacing between elements') : label + ' · ' + spaceWhy)}">${label}</button>`).join('')}</div></div><label class="nt-arr-switch"><input type="checkbox" role="switch" data-nt="arrange-keep"${f.prefs.keep ? ' checked' : ''}> <span>Keep pinned positions</span><small>${f.prefs.keep ? 'keeps compatible pins' : 'lays everything afresh'}</small></label></section>`;
  const tool = (id, label, enabled, why) => `<button type="button" data-nt="manual" data-id="${id}" aria-label="${esc(label)}"${enabled ? '' : ' disabled'} title="${esc(enabled ? label : label + ' · ' + why)}">${icon(id)}</button>`;
  const n = f.ids.length, alignOn = f.manual && n > 1, distOn = f.manual && n > 2;
  const selection = `<section class="nt-arr-sec" data-arr-section="selection"><div class="nt-arr-sec-head"><h5>Selection</h5><span class="nt-arr-n">${n} selected</span><button type="button" data-nt="select-visible"${f.manual && f.selectable.length <= 200 ? '' : ' disabled'} title="${esc(f.manual && f.selectable.length <= 200 ? `Select the ${f.selectable.length} elements shown` : f.overview || f.sequence ? whyNot(f, 1) : 'This picture shows more than 200 elements; Shift-click to select up to 200')}">Select shown</button><button type="button" data-nt="selection-clear"${n ? '' : ' disabled'} title="${n ? 'Clear the selection · Escape on the picture' : 'Nothing is selected'}">Clear</button></div><p class="nt-arr-help">${f.manual ? 'Shift-click elements on the picture to build a selection.' : f.sequence ? 'A sequence keeps its lifelines in order; choose another viewpoint to arrange elements by hand.' : 'Open a group to arrange its individual elements.'}</p><div class="nt-arr-tools"><span class="nt-arr-k">Align</span><div class="nt-arr-icons" role="group" aria-label="Align the selection">${[['left', 'Align left'], ['center', 'Align centres'], ['right', 'Align right'], ['top', 'Align top'], ['middle', 'Align middles'], ['bottom', 'Align bottom']].map(([id, label]) => tool(id, label, alignOn, whyNot(f, 2))).join('')}</div></div><div class="nt-arr-tools"><span class="nt-arr-k">Distribute</span><div class="nt-arr-icons" role="group" aria-label="Distribute the selection">${tool('distribute-horizontal', 'Equal horizontal spacing', distOn, whyNot(f, 3))}${tool('distribute-vertical', 'Equal vertical spacing', distOn, whyNot(f, 3))}${tool('snap', 'Snap the selection to the 16 px grid', f.manual && n > 0, whyNot(f, 1))}</div></div><div class="nt-arr-tools"><span class="nt-arr-k">Match</span><div class="nt-arr-icons" role="group" aria-label="Match sizes">${tool('same-width', 'Same width', f.matching, n > 1 ? 'Choose ordinary record boxes; symbols and summary cards keep their proportions' : whyNot(f, 2))}${tool('same-height', 'Same height', f.matching, n > 1 ? 'Choose ordinary record boxes; symbols and summary cards keep their proportions' : whyNot(f, 2))}${tool('same-size', 'Same size', f.matching, n > 1 ? 'Choose ordinary record boxes; symbols and summary cards keep their proportions' : whyNot(f, 2))}</div></div><div class="nt-arr-tools nt-arr-positions"><span class="nt-arr-k">Positions</span><div class="nt-arr-text" role="group" aria-label="Selected positions"><button type="button" data-nt="pin-selection"${f.manual && n ? '' : ' disabled'} title="${esc(f.manual && n ? 'Keep the selected elements where they stand' : 'Pin · ' + whyNot(f, 1))}">${icon('pin')}<span>Pin</span></button><button type="button" data-nt="release-selection"${f.ids.some(id => ctx.pins()[id]) ? '' : ' disabled'} title="${f.ids.some(id => ctx.pins()[id]) ? 'Let the layout place the selected elements again' : 'Release · select a pinned element'}">Release</button><button type="button" data-nt="size-reset"${f.ids.some(id => ctx.sizes()[id]) ? '' : ' disabled'} title="${f.ids.some(id => ctx.sizes()[id]) ? 'Restore the selected elements to their natural size' : 'Reset sizes · select a resized element'}">Reset sizes</button></div></div></section>`;
  const dropped = L?.droppedPins?.length || 0, message = ctx.message();
  const footer = `<footer class="nt-arr-foot" data-arr-section="footer"><div class="nt-arr-foot-row"><label class="nt-arr-switch"><input type="checkbox" role="switch" data-nt="snap-moves"${state.snap ? ' checked' : ''}> <span>Snap to grid</span><small>16 px</small></label><div class="nt-arr-history" role="group" aria-label="History"><button type="button" data-nt="undo"${f.undo ? '' : ' disabled'} title="${f.undo ? 'Undo the last layout change' : 'Nothing to undo'}">Undo</button><button type="button" data-nt="redo"${f.redo ? '' : ' disabled'} title="${f.redo ? 'Redo the layout change undone' : 'Nothing to redo'}">Redo</button></div></div><button type="button" class="nt-arr-reset" data-nt="reset"${f.pinCount ? '' : ' disabled'} title="${f.pinCount ? `Release all ${f.pinCount} pinned positions in this picture` : 'No pinned positions in this picture'}">Reset positions${f.pinCount ? ` · ${f.pinCount} pinned` : ''}</button><p class="nt-arr-status" role="status">${esc(titleOf(f.current))} · ${f.pinCount ? `${f.pinCount} pinned` : 'nothing pinned'}${f.prefs.spacing !== 'comfortable' && spaceOn ? ` · ${esc(SPACING.find(s => s[0] === f.prefs.spacing)[1])}` : ''}${n ? ` · ${n} selected` : ''}</p>${dropped ? `<p class="nt-arr-message nt-warn">${dropped} saved position${dropped === 1 ? '' : 's'} conflicts with a lane, boundary or another element. Release those positions or undo.</p>` : ''}${message ? `<p class="nt-arr-message">${esc(message)}</p>` : ''}</footer>`;
  const head = `<header class="nt-arr-head" data-arr-section="head"><h4>Arrange</h4><span class="nt-arr-current">${esc(titleOf(f.current))}</span><button type="button" class="nt-arr-close" data-nt="arrange-close" aria-label="Close the Arrange panel" title="Close · Escape">×</button></header>`;
  return head + `<div class="nt-arr-body">${layout}${options}${selection}</div>` + footer;
}

// ---- the panel beside the stage: made when the control opens it, refreshed section by section, removed when closed.
export function mountArrangePanel(ctx) {
  const {root, state} = ctx, open = !!state.arrangeOpen && ctx.picture && !!ctx.D;
  let panel = root.querySelector('.nt-arrange-panel');
  root.classList.toggle('nt-arrange-open', open);
  if (!open) { panel?.remove(); return null; }
  if (!panel) {
    panel = document.createElement('aside'); panel.className = 'nt-arrange-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Arrange objects');
    const body = root.querySelector('.cm-body'), stage = root.querySelector('.cm-stage');
    if (body) body.append(panel); else if (stage) stage.after(panel); else root.append(panel);
    panel.innerHTML = arrangePanelHTML(ctx); return panel;
  }
  const next = document.createElement('div'); next.innerHTML = arrangePanelHTML(ctx);
  const sections = [...next.querySelectorAll('[data-arr-section]')];
  if (sections.some(s => !panel.querySelector(`[data-arr-section="${s.dataset.arrSection}"]`))) { panel.innerHTML = next.innerHTML; return panel; }
  for (const s of sections) { const old = panel.querySelector(`[data-arr-section="${s.dataset.arrSection}"]`); if (old.innerHTML !== s.innerHTML) old.innerHTML = s.innerHTML; }
  return panel;
}

// ---- focus: inside the panel, on the control used, or the nearest enabled one when it became unavailable.
const controlsIn = panel => [...panel.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(el => !el.closest('[hidden]'));
const trigger = root => root.querySelector('[data-nt="menu"][data-id="arrange"]');
function refocus(ctx, kind, id = null) {
  nextFrame(() => {
    const panel = ctx.root.querySelector('.nt-arrange-panel');
    if (!panel) { trigger(ctx.root)?.focus({preventScroll: true}); return; }
    const control = panel.querySelector(`[data-nt="${CSS.escape(kind)}"]${id == null ? '' : `[data-id="${CSS.escape(id)}"]`}`);
    if (control && !control.disabled) { control.focus({preventScroll: true}); return; }
    const all = [...panel.querySelectorAll('button,input')], enabled = controlsIn(panel), at = control ? all.indexOf(control) : -1;
    const nearest = enabled.map(el => ({el, d: Math.abs(all.indexOf(el) - at), after: all.indexOf(el) > at})).sort((a, b) => a.d - b.d || (a.after ? -1 : 1))[0];
    (nearest?.el || panel.querySelector('[data-nt="arrange-close"]'))?.focus({preventScroll: true});
  });
}
const firstFocus = ctx => nextFrame(() => { const panel = ctx.root.querySelector('.nt-arrange-panel'); if (!panel) return; (panel.querySelector('[data-nt="arrange"][aria-pressed="true"]:not(:disabled)') || controlsIn(panel)[0])?.focus({preventScroll: true}); });
// The stage changes width when the panel docks or leaves: the picture is fitted again once the layout has settled.
const refit = ctx => nextFrame(() => nextFrame(() => { if (ctx.root.isConnected) ctx.api.fit?.(); }));

function setOpen(ctx, open) {
  const {state} = ctx; if (!!state.arrangeOpen === open) return;
  state.arrangeOpen = open; ctx.say(''); ctx.api.onChange?.();
  if (open) firstFocus(ctx); else nextFrame(() => trigger(ctx.root)?.focus({preventScroll: true}));
  refit(ctx);
}
export const closeArrangePanel = ctx => setOpen(ctx, false);

// ---- a click on one of the panel's controls (or on its control in the lens row). Returns false for anything else.
export function handleArrangeAction(ctx, b) {
  const k = b?.dataset?.nt, id = b?.dataset?.id, {state} = ctx;
  if (k === 'menu') { if (id !== 'arrange') return false; setOpen(ctx, !state.arrangeOpen); return true; }
  if (k === 'arrange-close') { setOpen(ctx, false); return true; }
  if (b.disabled) return true;
  const prefs = arrangePrefs(state, ctx.chapter), keep = prefs.keep;
  const applied = (id, hub, said) => { if (!ctx.chooseArrangement(id, hub, {keep})) return; ctx.api.announce(`${said} ${keep ? 'Compatible pinned positions are retained.' : 'Pinned positions released; every element laid out afresh.'}`); };
  if (k === 'arrange') { applied(id, null, `${titleOf(id)} layout applied.`); refocus(ctx, k, id); return true; }
  if (k === 'smart-arrange') { const r = architectureArrangement(ctx.D, {selectedId: ctx.sel}), target = state.view === 'layers' ? 'by-layer' : r.id; applied(target, r.hub, state.view === 'layers' ? 'Architecture layers arranged by recorded boundaries and connections.' : r.reason); refocus(ctx, k); return true; }
  if (k === 'arrange-direction') {
    const now = ctx.arrangement();
    // (rc41: a Layered picture keeps its layout and turns its bands: rows top to bottom, or columns left to right)
    if (now === 'layered') { const dir = id === 'right' ? 'right' : 'down'; if (prefs.direction !== dir) { ctx.remember(); prefs.direction = dir; savePrefs(state, ctx.chapter); ctx.say(''); ctx.api.onChange?.(true); refit(ctx); ctx.api.announce(`${dir === 'right' ? 'Left to right: the bands stand as columns' : 'Top to bottom: the bands stand as rows'}. Nothing is pinned or written.`); } refocus(ctx, k, id); return true; }
    const target = id === 'right' ? 'orthogonal' : 'tree'; if (target !== now) applied(target, null, `${id === 'right' ? 'Left to right' : 'Top to bottom'}: ${titleOf(target)} layout applied.`); refocus(ctx, k, id); return true;
  }
  if (k === 'arrange-spacing') { if (prefs.spacing !== id && SPACING.some(s => s[0] === id)) { ctx.remember(); prefs.spacing = id; savePrefs(state, ctx.chapter); ctx.say(''); ctx.api.onChange?.(true); ctx.api.announce(`${SPACING.find(s => s[0] === id)[1]} spacing applied.`); } refocus(ctx, k, id); return true; }
  if (k === 'arrange-keep') { prefs.keep = !prefs.keep; savePrefs(state, ctx.chapter); ctx.api.onChange?.(); refocus(ctx, k); return true; }
  if (k === 'select-visible') { ctx.setSelection((ctx.D?.nodes || []).filter(n => !n.fold).map(n => n.id)); refocus(ctx, k); return true; }
  if (k === 'selection-clear') { ctx.setSelection([]); refocus(ctx, k); return true; }
  if (k === 'manual') { ctx.arrangeSelected(id, id === 'snap' ? {grid: 16} : {}); refocus(ctx, k, id); return true; }
  if (k === 'pin-selection') { ctx.arrangeSelected('move', {dx: 0, dy: 0, grid: 0}); refocus(ctx, k); return true; }
  if (k === 'release-selection' || k === 'size-reset') { ctx.releaseSelection(k === 'size-reset'); refocus(ctx, k); return true; }
  if (k === 'snap-moves') { state.snap = !state.snap; ctx.save(); ctx.api.onChange?.(); refocus(ctx, k); return true; }
  if (k === 'reset') { ctx.remember(); delete state.pins[ctx.pinKey()]; ctx.say('All pinned positions in this picture released.'); ctx.save(); ctx.api.onChange?.(); ctx.api.announce(ctx.message()); refocus(ctx, k); return true; }
  if (k === 'undo' || k === 'redo') {
    const from = k === 'undo' ? state.history : (state.redo ||= []), to = k === 'undo' ? (state.redo ||= []) : state.history;
    let h = null; while (from.length && !h) { const x = from.pop(); if (sameView(state, x)) h = x; }
    if (h) { to.push(snapshot(state, ctx.chapter)); if (to.length > HISTORY) to.shift(); restore(state, ctx.chapter, h); ctx.save(); }
    ctx.say(k === 'undo' ? 'Layout change undone.' : 'Layout change redone.'); ctx.api.onChange?.(true); ctx.api.announce(ctx.message()); refocus(ctx, k); return true;
  }
  return false;
}

// ---- the keyboard inside the panel: Escape closes and gives focus back, Tab stays inside, the arrows move between controls.
export function handleArrangeKey(ctx, e) {
  const panel = e.target?.closest?.('.nt-arrange-panel'); if (!panel || !ctx.root.contains(panel)) return false;
  if (e.key === 'Escape') { e.preventDefault(); setOpen(ctx, false); return true; }
  const items = controlsIn(panel), i = items.indexOf(e.target);
  if (e.key === 'Tab') { if (!items.length) return false; if (!e.shiftKey && (i === items.length - 1 || i === -1)) { e.preventDefault(); items[0].focus(); return true; } if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); return true; } return false; }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!items.length) return false; e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus(); return true; }
  return false;
}
