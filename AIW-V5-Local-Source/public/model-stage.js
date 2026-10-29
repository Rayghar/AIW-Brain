import {hoverTipHTML} from './cursor-tip.js';
// Shared canvas behaviour for the chapter Model views: the world pans and zooms under sticky
// column heads (top) and a sticky label rail (left). Expects the .cm shell markup:
// .cm-stage > .cm-world, .cm-heads > .cm-heads-in, .cm-rail > .cm-rail-in, .cm-corner.
import {projectPreferenceKey,projectURL,currentProject} from './project-context.js';
import {esc} from './html-escape.js';
// rc41 (W2): the one state line of the chapter's records (work-frame.js chapterRecordsState, the vocabulary of Work's
// head, Validate's summary and Output's hero) stands in the Model footer beside the view's own status.
import {chapterRecordsState} from './work-frame.js';
import {chapterStateHTML} from './chapter-strip.js';
// The marks every picture paints (round 5, Contract M) are ready with the stage, so a source (the trace, an
// alternative's impact, Sol's review) can mark elements before any picture is drawn.
import './model-marks.js';
// Runs fn in the next animation frame (audit F2-14): after the current task's DOM and class changes, with layout
// read fresh when fn measures. It replaces the fixed 30–80 ms waits the chapter models used before a second render,
// a reveal or a hand-off to a studio, whose outcome depended on machine speed. Debounces (resize, click suppression
// after a drag) keep their timers.
export function nextFrame(fn) { return typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => fn()) : setTimeout(fn, 0); }
export const CULL_FROM = 150;
// The keyboard map of every canvas view (the Fit menu's help says it; model-stage.js and notation-view.js answer it).
export const KEYBOARD_MAP = 'F fits the whole drawing, Shift+F the selection, Home the readable view, 0 is 100 %, + and − zoom, the arrow keys pan (Shift: further), Escape clears the selection.';
// "Fit on open" (rc39, W2 step 4): on by default, a view opens at its arrival fit; switched off for a view, the view opens
// where the reader left it — its camera is kept with the choice, per project and view, in this browser (a convenience).
const CAMERA_STORE = 'aiw-camera-v1';
function cameraPrefs() { try { const v = JSON.parse(localStorage.getItem(projectPreferenceKey(CAMERA_STORE)) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
function writeCameraPrefs(v) { try { localStorage.setItem(projectPreferenceKey(CAMERA_STORE), JSON.stringify(v)); } catch { /* a convenience */ } }
export function fitOnOpen(key) { const v = cameraPrefs()[key]; return !(v && v.keep); }
export function keptCamera(key) { const v = cameraPrefs()[key]; return v && v.keep && Number.isFinite(v.z) && Number.isFinite(v.px) && Number.isFinite(v.py) ? {z: v.z, px: v.px, py: v.py} : null; }
export function setFitOnOpen(key, on, cam = null) { const v = cameraPrefs(); if (on) delete v[key]; else v[key] = {keep: true, ...(cam ? {z: cam.z, px: cam.px, py: cam.py} : {})}; writeCameraPrefs(v); }
function refreshFitOnOpen(root, key) { for (const box of root.querySelectorAll('.cm-fit-options [data-cm-fit-on-open]')) { const on = fitOnOpen(key); if (box.checked !== on) box.checked = on; } }
const cameraReaders = new WeakMap();
function closeCameraMenu(button) {
  const menu = button.closest('.cm-fit-options'); if (!menu) return;
  const focused = menu.contains(document.activeElement); menu.open = false;
  if (focused) menu.querySelector('summary')?.focus({preventScroll: true});
}
const activeSheet = root => root.classList.contains('nt-sheet-on') ? root.querySelector('.cm-sheet') : root.classList.contains('dk-table') ? root.querySelector('.dk-sheet') : null;
function visibleZoom(root, fallback = Number(root.dataset.modelCameraZoom) || 1) {
  const sheet = activeSheet(root); if (!sheet) return fallback;
  const whole = sheet.matches('[data-anatomy]') && sheet.querySelector('.an-world');
  if (whole) return Number(whole.style.transform.match(/scale\(([\d.e+-]+)\)/)?.[1]) || fallback;
  return Number(sheet.style.zoom) || 1;
}
function refreshZoomReadout(root, fallback) {
  const zoom = visibleZoom(root, fallback) * 100, percent = zoom < 1 ? Number(zoom.toPrecision(2)) : Math.round(zoom), label = `Zoom ${percent}%; reset to 100%`;
  for (const button of root.querySelectorAll('.cm-zoom-value[data-cm-camera="actual"]')) {
    if (button.textContent !== percent + '%') button.textContent = percent + '%';
    if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
    if (button.title !== label) button.title = label;
  }
}
function refreshCameraAvailability(root) {
  const sheet = activeSheet(root), table = sheet && !sheet.matches('[data-anatomy]');
  const available = !sheet && [...root.querySelectorAll('.cm-world .arrange-selected, .cm-world .sel, .cm-world [aria-selected="true"]')].some(el => !el.closest('[hidden], .nt-layer-off'));
  const title = available ? 'Frame the selected elements · Shift+F or 2' : table ? 'Scroll to the selected row or cell; selection framing is available in model canvases.' : sheet ? 'Selection framing is unavailable in Whole design.' : 'Select an element in the drawing first';
  for (const button of root.querySelectorAll('[data-cm-camera="selection"]')) { if (button.disabled === available) button.disabled = !available; if (button.title !== title) button.title = title; }
  const fit = root.querySelector('.cm-fit-menu > button'), wording = table ? 'Fit content width' : 'Fit the whole picture';
  if (fit) { if (fit.getAttribute('aria-label') !== wording) fit.setAttribute('aria-label', wording); const hint = wording + (sheet ? '' : ' · F or 1'); if (fit.title !== hint) fit.title = hint; }
  for (const [action, html] of [['whole', table ? 'Fit width' : 'Fit whole drawing' + (sheet ? '' : ' <small>F</small>')], ['actual', '100%' + (sheet ? '' : ' <small>0</small>')]]) { const b = root.querySelector(`.cm-fit-options [data-cm-camera="${action}"]`); if (b && b.innerHTML !== html) b.innerHTML = html; }
  const readable = root.querySelector('.cm-fit-options [data-cm-camera="readable"]'); if (readable && readable.hidden !== !!table) readable.hidden = !!table;
  const help = root.querySelector('.cm-fit-options p'), text = table ? 'Scroll horizontally or vertically to read this view. Fit width shows all columns; 100% restores normal size. Ctrl/⌘ + wheel zooms at the pointer.' : sheet ? 'Use the drawing’s navigation controls or drag its background. These zoom controls follow the Whole design view.' : 'Drag the background or use the middle mouse button to pan. Ctrl/⌘ + wheel zooms at the pointer. While the drawing has focus: ' + KEYBOARD_MAP;
  if (help && help.textContent !== text) help.textContent = text;
  // "Fit on open" (rc39): per view; a sheet has no camera to keep.
  const keep = root.querySelector('.cm-fit-options [data-cm-fit-on-open]'); if (keep) { const row = keep.closest('label'); if (row && row.hidden !== !!(table || sheet)) row.hidden = !!(table || sheet); }
}
function watchSheetCamera(root) {
  const sheet = activeSheet(root), previous = cameraReaders.get(root);
  if (previous?.sheet !== sheet) {
    previous?.observer.disconnect(); cameraReaders.delete(root);
    const Observer = root.ownerDocument?.defaultView?.MutationObserver;
    if (sheet && Observer) { const observer = new Observer(() => refreshZoomReadout(root)); observer.observe(sheet, {subtree: true, childList: true, attributes: true, attributeFilter: ['style']}); cameraReaders.set(root, {sheet, observer}); }
  }
  refreshZoomReadout(root);
}
// The content of a layout (round 12, P): the box around the elements, containers, lanes and routes it draws (from the top of
// its header strip), and the element boxes, once per layout; null for a layout that names no element (a chapter's own map,
// whose world is its content).
const contents = new WeakMap();
export function contentOf(L) {
  if (!L || typeof L !== 'object' || !Array.isArray(L.nodes) || !L.nodes.length) return null;
  if (contents.has(L)) return contents.get(L);
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  const add = (x, y, w = 0, h = 0) => { if (!Number.isFinite(x) || !Number.isFinite(y)) return; x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x + (w || 0)); y2 = Math.max(y2, y + (h || 0)); };
  const boxes = L.nodes.filter(b => Number.isFinite(b.x) && Number.isFinite(b.y));
  for (const b of boxes) add(b.x, b.y, b.w, b.h);
  // Round 12 (G, GR-FIG-12): the box around the element boxes alone, the box a reader counts as "the picture": a picture
  // whose elements fit the stage opens with every one of them in view even where its routes, header and margins do not fit.
  const elements = Number.isFinite(x1) ? {x1, y1, x2, y2} : null;
  for (const g of L.groups || []) add(g.x, g.y, g.w, g.h);
  // A lane or a level band is content with its title at its left end (the Layers view reads its lanes).
  for (const b of L.bands || []) add(b.x, b.y, b.w, b.h);
  for (const e of L.edges || []) { for (const p of e.pts || []) add(p[0], p[1]); if (e.labelBox && !e.labelHidden) add(e.labelBox.x, e.labelBox.y, e.labelBox.w, e.labelBox.h); }
  // The picture's header strip stands above its content: a frame starts at its top (never at its width).
  if (Number.isFinite(x1) && Number.isFinite(L.header?.y)) y1 = Math.min(y1, L.header.y);
  const c = Number.isFinite(x1) ? {x1, y1, x2, y2, boxes, elements: elements || {x1, y1, x2, y2}} : null;
  contents.set(L, c); return c;
}
// Where a picture larger than the stage opens: the window of vw × vh world px at the content's top-left corner, where a
// page is read from, while it shows at least half as many element boxes as the fullest window anchored on an element's
// top-left corner (the first in reading order on a tie); else that fullest window. Never a window without an element.
const seen = (boxes, a, vw, vh) => { let n = 0; for (const b of boxes) if (b.x < a.x + vw && b.x + b.w > a.x && b.y < a.y + vh && b.y + b.h > a.y) n++; return n; };
export function densest(boxes, vw, vh, corner = null) {
  const step = Math.max(1, Math.ceil(boxes.length / 600)); let best = null, most = -1;
  for (let i = 0; i < boxes.length; i += step) {
    const a = boxes[i], n = seen(boxes, a, vw, vh);
    if (n > most || (n === most && (a.y < best.y || (a.y === best.y && a.x < best.x)))) { most = n; best = a; }
  }
  if (corner && seen(boxes, corner, vw, vh) * 2 >= most && seen(boxes, corner, vw, vh) > 0) return corner;
  return best || {x: 0, y: 0};
}
// The semantic zoom levels: tiny below 0.5, far below 0.8, mid below 1.2, near from 1.2.
export const zoomLevel = z => (z < 0.5 ? 'tiny' : z < 0.8 ? 'far' : z < 1.2 ? 'mid' : 'near');
export function modelStage(root, {headHeight, railWidth, floor = () => 1, onHover = null, noPan = '.cm-frame', cullFrom = CULL_FROM} = {}) {
  const CULL_FROM = cullFrom, boxes = new WeakMap(); let culled = null;
  const cam = {z: 1, px: 0, py: 0}, cams = new Map(), chosenCameras = new Set();
  let L = null, key = '', listeners = null, boxCache = null, cullFrame = 0, mini = null, miniOwn = false;
  // Round 12 (G, GR-FIG-10): what reads the camera after it moves (a grouped picture's "N of M in view"), told once a frame.
  const watchers = new Set();
  const q = s => root.querySelector(s);
  const MINI_W = 168, MINI_H = 112;
  const miniScale = () => (mini ? Math.min(MINI_W / mini.W, MINI_H / mini.H) : 1);
  function drawMini() {
    const st = q('.cm-stage'); if (!st) return;
    let el = st.querySelector(':scope > .cm-minimap');
    if (!mini) { if (el) el.hidden = true; return; }
    if (!el) { el = document.createElement('div'); el.className = 'cm-minimap'; el.setAttribute('role', 'button'); el.tabIndex = 0; el.addEventListener('click', e => e.stopPropagation()); el.addEventListener('keydown', e => { const d = {ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 't', ArrowDown: 'b'}[e.key]; if (d || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (d) api.nudge(d); else { api.fitAll(); st.focus(); } } }); st.append(el); }
    const k = miniScale(), W = Math.round(mini.W * k), H = Math.round(mini.H * k), n = v => Math.round(v * k * 10) / 10;
    el.style.width = W + 'px'; el.style.height = H + 'px';
    el.setAttribute('aria-label', 'Overview of the whole picture. Click or drag to navigate; arrow keys pan; Enter fits the whole drawing. The frame is the visible area.');
    el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${(mini.groups || []).map(b => `<rect class="mg" x="${n(b.x)}" y="${n(b.y)}" width="${n(b.w)}" height="${n(b.h)}"/>`).join('')}${(mini.boxes || []).map(b => `<rect class="mb${b.cls ? ' ' + b.cls : ''}" x="${n(b.x)}" y="${n(b.y)}" width="${Math.max(1.5, n(b.w))}" height="${Math.max(1.5, n(b.h))}"/>`).join('')}<rect class="mv" x="0" y="0" width="0" height="0"/></svg>`;
    miniView();
  }
  function miniView() {
    const el = q('.cm-stage > .cm-minimap'); if (!el || !mini || !L) return;
    // Round 12 (G): shown while an element stands out of view, never over a picture whose every element is in view (the
    // world's empty margins running past the stage do not call for it).
    const {w, h, top} = box(), z = cam.z, k = miniScale(), e = contentOf(L)?.elements;
    const over = e ? e.x1 * z + cam.px < -2 || e.x2 * z + cam.px > w + 2 || e.y1 * z + cam.py < top - 2 || e.y2 * z + cam.py > h + 2 : L.W * z > w + 6 || L.H * z > h + 6;
    el.hidden = !over;
    if (!over) return;
    const v = el.querySelector('.mv'); if (!v) return;
    v.setAttribute('x', Math.max(0, -cam.px / z * k)); v.setAttribute('y', Math.max(0, -cam.py / z * k));
    v.setAttribute('width', Math.min(mini.W * k, w / z * k)); v.setAttribute('height', Math.min(mini.H * k, h / z * k));
  }
  function miniMove(e) {
    const el = q('.cm-stage > .cm-minimap'); if (!el || !mini) return;
    const r = el.getBoundingClientRect(), k = miniScale(), wx = (e.clientX - r.left) / k, wy = (e.clientY - r.top) / k, {w, h} = box();
    chosenCameras.add(key); cam.px = w / 2 - wx * cam.z; cam.py = h / 2 - wy * cam.z; api.clamp(); api.apply();
  }
  // The stage is measured once per task (audit F2-04: `box` was a forced layout on every call, 27–40 ms of a
  // Work→Model switch); the cache is dropped before the next task and whenever the layout changes.
  // Round 12 (P): a note laid over the stage's top edge (an element with data-cm-inset, such as a grouped picture's note)
  // reserves its height as `top`: the frame and the camera's bounds keep the picture's top below it, so a note never
  // covers the first row of what it describes.
  const box = () => {
    if (boxCache) return boxCache;
    const st = q('.cm-stage'); let top = 0;
    for (const el of st.querySelectorAll(':scope > [data-cm-inset]')) if (!el.hidden) top = Math.max(top, el.offsetTop + el.offsetHeight + 6);
    boxCache = {w: st.clientWidth || 900, h: st.clientHeight || 520, top};
    Promise.resolve().then(() => { boxCache = null; });
    return boxCache;
  };
  const api = {
    cam, box,
    use(layout, k) {
      L = layout; key = projectPreferenceKey(k); boxCache = null; culled = null; refreshFitOnOpen(root, key);
      // A view that draws its own picture (a chapter's own view) feeds the overview from its layout's boxes (rc39): the
      // minimap stands on every canvas view that can scroll. A view that sets the overview itself (the notation) keeps it.
      if (!miniOwn && L && Number.isFinite(L.W) && Number.isFinite(L.H)) { const boxes = (L.nodes || L.cards || L.boxes || []).filter(b => Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.w) && Number.isFinite(b.h)); mini = boxes.length ? {W: L.W, H: L.H, groups: (L.groups || L.lanes || []).filter(g => Number.isFinite(g.x) && Number.isFinite(g.y) && Number.isFinite(g.w) && Number.isFinite(g.h)), boxes: boxes.map(b => ({x: b.x, y: b.y, w: b.w, h: b.h, cls: ''}))} : null; drawMini(); }
    },
    apply() {
      if (!L) return;
      const {w, h} = box(), stage = q('.cm-stage');
      const {z, px, py} = cam, headH = headHeight() * z, rw = railWidth(L) * z;
      q('.cm-world').style.transform = `translate(${px}px,${py}px) scale(${z})`;
      q('.cm-heads-in').style.transform = `translate(${px}px,0) scale(${z})`;
      q('.cm-heads').style.height = Math.round(headH) + 'px';
      q('.cm-rail-in').style.transform = `translate(0,${py}px) scale(${z})`;
      q('.cm-rail').style.width = Math.round(rw) + 'px';
      const corner = q('.cm-corner'); corner.style.width = Math.round(rw) + 'px'; corner.style.height = Math.round(headH) + 'px';
      // Below the phone's first fit (0.6) the lens lines would vanish as soon as the model opened.
      root.classList.toggle('cm-far', z < 0.58);
      // Semantic zoom (round 5): the picture says how near the reader is, and notation.css shows what reads at that
      // distance — far out the names (drawn large) and the glyphs; from 0.8 the element types, the second lines and the
      // relationship words; from 1.2 the fields — and never a word under 9 px on screen.
      const level = zoomLevel(z); if (root.dataset.cmZ !== level) root.dataset.cmZ = level;
      q('.cm-world').style.setProperty('--cm-z', String(Math.round(z * 1000) / 1000));
      // Every canvas uses the same readable zoom state and the same actual-size action.
      // Keep it in sync after wheel, keyboard, Fit and restored-camera changes alike.
      root.dataset.modelCameraZoom = String(z); refreshZoomReadout(root, z);
      refreshCameraAvailability(root);
      // Where the world runs past the stage, its edge says so and can be nudged.
      stage.classList.toggle('cm-more-r', L.W * z + px > w + 6);
      stage.classList.toggle('cm-more-l', px < -6);
      stage.classList.toggle('cm-more-b', L.H * z + py > h + 6);
      stage.classList.toggle('cm-more-t', py < box().top - 6);
      cams.set(key, {...cam, sw: w, sh: h - box().top});
      if (!fitOnOpen(key)) setFitOnOpen(key, false, cam);
      if (cullFrame === 0) cullFrame = requestAnimationFrame(() => { cullFrame = 0; api.cull(); for (const fn of watchers) { try { fn(); } catch (e) { console.warn('A camera reading could not be updated.', e?.message); } } });
      miniView();
    },
    // The overview (round 3, D): the whole picture small in the stage's corner, the window onto it as a
    // frame; a click or a drag there moves the camera. Shown only while the picture runs past the stage.
    overview(data) { mini = data && data.W && data.H ? data : null; miniOwn = !!mini; drawMini(); },
    // Off-screen SVG nodes are not drawn (audit F2-03). A large model's routes, labels and markers outside the
    // stage, plus a margin, are hidden with visibility (they stay in the DOM and keep their size), and shown
    // again as the camera moves. HTML cards are never culled: they take keyboard focus, and focus reveals them.
    // Below CULL_FROM top-level SVG children (routes, labels, groups) nothing is culled, so the reference project
    // and its tests are untouched; the 305-responsibility Chapter 4 model (307 children) hides about 250 of them.
    cull() {
      const svg = q('.cm-svg'); if (!svg || !L) return;
      const nodes = [...svg.children];
      if (nodes.length < CULL_FROM) { if (culled) { for (const el of culled) el.style.visibility = ''; culled = null; } return; }
      const {w, h} = box(), margin = 240, left = (-cam.px - margin) / cam.z, top = (-cam.py - margin) / cam.z, right = (w - cam.px + margin) / cam.z, bottom = (h - cam.py + margin) / cam.z;
      if (!culled) culled = new Set();
      for (const el of nodes) {
        // The relationships' hits (one group, every relationship's Tab stop) and any part that takes the keyboard (an
        // element drawn in the picture, tabindex) are never culled (round 10): a hidden part could not take it. A line
        // drawn for several relationships (g.nt-bundle) is culled as one unit.
        if (el.tagName === 'defs' || el.tagName === 'style' || el.classList?.contains('nt-hits') || el.hasAttribute?.('tabindex')) continue;
        let b = boxes.get(el);
        // getBBox measures in the part's own space, before its transform (an element's group is translated to its place):
        // the box is carried through that transform, so a part is hidden by where it stands, not where its space starts.
        if (!b) { try { const r = el.getBBox(), m = el.transform?.baseVal?.consolidate?.()?.matrix || null, xs = [], ys = []; for (const [x, y] of [[r.x, r.y], [r.x + r.width, r.y], [r.x, r.y + r.height], [r.x + r.width, r.y + r.height]]) { xs.push(m ? m.a * x + m.c * y + m.e : x); ys.push(m ? m.b * x + m.d * y + m.f : y); } b = {x: Math.min(...xs), y: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys)}; } catch { b = null; } if (!b || (b.r - b.x === 0 && b.b - b.y === 0)) continue; boxes.set(el, b); }
        const out = b.r < left || b.x > right || b.b < top || b.y > bottom;
        if (out) { if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden'; culled.add(el); }
        else if (culled.has(el)) { el.style.visibility = ''; culled.delete(el); }
      }
    },
    // Nudge the camera by most of a screen in one direction.
    nudge(dir) {
      chosenCameras.add(key);
      const {w, h} = box();
      if (dir === 'r') cam.px -= w * 0.8; if (dir === 'l') cam.px += w * 0.8; if (dir === 'b') cam.py -= h * 0.8; if (dir === 't') cam.py += h * 0.8;
      api.clamp(); const world = q('.cm-world'); world.classList.add('cm-glide'); api.apply(); setTimeout(() => world.classList.remove('cm-glide'), 420);
    },
    clamp() {
      if (!L) return;
      const {w, h, top} = box(), ww = L.W * cam.z, wh = L.H * cam.z;
      cam.px = ww <= w ? 0 : Math.max(w - ww - 8, Math.min(0, cam.px));
      cam.py = wh + top <= h ? top : Math.max(h - wh - 8, Math.min(top, cam.py));
    },
    // Open native drawings at a readable scale. Explicit zoom/pan/Fit choices
    // survive frame resizing; untouched views refit to their newly available width.
    fit({minimum = floor(), maximum = 1.05} = {}) {
      const kept = keptCamera(key); if (kept) { Object.assign(cam, kept); api.clamp(); return; }
      // An untouched view refits when the stage it had has changed: its width, or (rc41 lead) the height left below the
      // stage's notes — a camera kept from a render before the fold note was drawn framed one picture at two zooms.
      const saved = cams.get(key), {w, h, top} = box();
      if (saved && (chosenCameras.has(key) || (Math.abs((saved.sw || 0) - w) < 4 && Math.abs((saved.sh ?? h - top) - (h - top)) < 4))) { Object.assign(cam, {z: saved.z, px: saved.px, py: saved.py}); api.clamp(); return; }
      if (contentOf(L)) { api.frame(minimum, maximum); return; }
      cam.z = Math.max(minimum, Math.min(maximum, (w - 4) / L.W)); cam.px = 0; cam.py = 0; api.clamp();
    },
    fitAll() { if (!L) return; chosenCameras.add(key); if (contentOf(L)) { api.frame(0, 1, {whole: true}); api.apply(); return; } const {w, h, top} = box(); cam.z = Math.min(1, Math.max(1, w - 16) / Math.max(1, L.W), Math.max(1, h - top - 16) / Math.max(1, L.H)); cam.px = 0; cam.py = top; api.clamp(); api.apply(); },
    fitSelection() {
      if (!L) return false;
      const bounds = [], view = q('.cm-stage').getBoundingClientRect();
      for (const el of root.querySelectorAll('.cm-world .arrange-selected, .cm-world .sel, .cm-world [aria-selected="true"]')) {
        if (el.closest('[hidden], .nt-layer-off')) continue;
        const id = el.dataset.ntNode || el.dataset.card || el.dataset.sel;
        const n = L.nodes?.find(n => n.id === id);
        if (n) bounds.push(n);
        else { const r = el.getBoundingClientRect(); if (r.width && r.height) bounds.push({x: (r.left - view.left - cam.px) / cam.z, y: (r.top - view.top - cam.py) / cam.z, w: r.width / cam.z, h: r.height / cam.z}); }
      }
      if (!bounds.length) return false;
      api.fitTo(bounds); return true;
    },
    // Frame the given world boxes (a group on double-click, rc39; the selection), at most 1.5, gliding there.
    fitTo(bounds) {
      if (!L || !bounds?.length) return false;
      const x = Math.min(...bounds.map(b => b.x)), y = Math.min(...bounds.map(b => b.y)), right = Math.max(...bounds.map(b => b.x + b.w)), bottom = Math.max(...bounds.map(b => b.y + b.h)), {w, h, top} = box();
      chosenCameras.add(key); cam.z = Math.min(1.5, Math.max(1, w - 64) / Math.max(1, right - x), Math.max(1, h - top - 64) / Math.max(1, bottom - y));
      cam.px = (w - (x + right) * cam.z) / 2; cam.py = top + (h - top - (y + bottom) * cam.z) / 2; api.clamp();
      const world = q('.cm-world'); world.classList.add('cm-glide'); api.apply(); setTimeout(() => world.classList.remove('cm-glide'), 420); return true;
    },
    zoomStep(direction) { const steps = [.01, .02, .05, .1, .15, .2, .25, .33, .5, .67, .75, 1, 1.25, 1.5, 1.8], target = direction > 0 ? steps.find(z => z > cam.z + .005) || 1.8 : [...steps].reverse().find(z => z < cam.z - .005) || .01, {w, h} = box(); api.zoomAt(target, w / 2, h / 2); },
    // Opening and Readable view retain useful text size. Explicit Fit whole frames every
    // element, container, route, label and relationship index below the stage's inset.
    // The Readable view (the Fit menu, Home): the picture's reading frame. A notation picture supplies its own
    // (readingFrame: the frame it opens at — whole where its names keep 10 px, else the furthest zoom that keeps them, on
    // the densest part; rc41 lead, GR-FIG-10 "Fit returns to the reading size"); any other view, 100 % or its floor.
    readable() { chosenCameras.add(key); if (typeof api.readingFrame === 'function') api.readingFrame(); else api.frame(Math.max(.5, Math.min(1, floor()))); api.apply(); },
    frame(min = 0.3, max = 1.05, {whole = false} = {}) {
      if (!L) return;
      if (whole) min = 0;
      let c = contentOf(L); const {w, h: sh, top} = box(), h = Math.max(1, sh - top);
      // The complete drawing also includes its header, notes and outer frame.
      if (whole && c) c = {...c, x1: Math.min(0, c.x1), y1: Math.min(0, c.y1), x2: Math.max(L.W, c.x2), y2: Math.max(L.H, c.y2)};
      if (!c) { cam.z = Math.max(min, Math.min(max, (w - 4) / L.W, (h - 4) / L.H)); cam.px = 0; cam.py = top; api.clamp(); return; }
      const pad = 24, cw = c.x2 - c.x1 + 2 * pad, ch = c.y2 - c.y1 + 2 * pad, e = c.elements, ew = e.x2 - e.x1, eh = e.y2 - e.y1;
      cam.z = Math.max(min, Math.min(max, w / cw, h / ch));
      const z = cam.z;
      if (cw * z <= w + 1 && ch * z <= h + 1) { cam.px = (w - (c.x1 + c.x2) * z) / 2; cam.py = top + (h - (c.y1 + c.y2) * z) / 2; }
      else if (ew * z <= w + 1 && eh * z <= h + 1) {
        const mx = Math.min(8, Math.max(0, (w - ew * z) / 2)), my = Math.min(8, Math.max(0, (h - eh * z) / 2));
        cam.px = (w - (e.x1 + e.x2) * z) / 2;
        cam.py = Math.max(top + my - e.y1 * z, Math.min(top + (pad - c.y1) * z, sh - my - e.y2 * z));
        cam.px = Math.max(mx - e.x1 * z, Math.min(cam.px, w - mx - e.x2 * z));
      }
      else { const a = densest(c.boxes, w / z - 2 * pad, h / z - 2 * pad, {x: c.x1, y: c.y1}); cam.px = -(a.x - pad) * z; cam.py = top - (a.y - pad) * z; }
      api.clamp();
    },
    // How many of the picture's element boxes the camera shows below the stage's note (round 12, G, GR-FIG-10): the
    // reading a grouped picture prints as "N of M in view" when it is larger than the stage.
    inView() {
      const c = contentOf(L); if (!c) return null;
      const {w, h, top} = box(), z = cam.z, ax = -cam.px / z, ay = (top - cam.py) / z;
      return {seen: seen(c.boxes, {x: ax, y: ay}, w / z, (h - top) / z), total: c.boxes.length};
    },
    zoomAt(z, mx, my) { if (!Number.isFinite(z) || !L) return; chosenCameras.add(key); const z0 = cam.z; z = Math.max(0.01, Math.min(1.8, z)); cam.px = mx - (mx - cam.px) * z / z0; cam.py = my - (my - cam.py) * z / z0; cam.z = z; api.clamp(); api.apply(); },
    // Bring a world box into view below the heads and right of the rail, gliding there.
    reveal(x, y, w, h) {
      const {w: sw, h: sh, top: inset} = box(), z = cam.z, left = railWidth(L) * z + 8, top = Math.max(headHeight() * z, inset) + 8, sx = x * z + cam.px, sy = y * z + cam.py;
      if (sx >= left && sx + w * z <= sw && sy >= top && sy + h * z <= sh - 10) return;
      cam.px += Math.min(0, sw - 20 - (sx + w * z)) + Math.max(0, left - sx);
      cam.py += (top + (sh - top) * 0.4) - (sy + h * z / 2);
      api.clamp();
      const world = q('.cm-world'); world.classList.add('cm-glide'); api.apply(); setTimeout(() => world.classList.remove('cm-glide'), 420);
    },
    dispose() { listeners?.abort(); listeners = null; if (cullFrame) { cancelAnimationFrame(cullFrame); cullFrame = 0; } },
    // A reading of the camera (round 12, G): `fn` runs once a frame after the camera moved; the returned function stops it.
    watch(fn) { watchers.add(fn); return () => watchers.delete(fn); },
    bind() {
      const stage = q('.cm-stage');
      listeners?.abort(); listeners = new AbortController(); const signal = listeners.signal;
      document.addEventListener('click', e => { for (const menu of root.querySelectorAll('.cm-fit-options[open], .nt-arrange-options[open]')) if (!menu.contains(e.target)) menu.open = false; }, {signal, capture: true});
      root.addEventListener('click', e => {
        const button = e.target.closest?.('.cm-tools button'); if (!button || button.disabled || activeSheet(root)) return;
        const action = button.dataset.cmCamera || Object.values(button.dataset).find(v => ['zin', 'zout', 'fit'].includes(v)); if (!action) return;
        e.preventDefault(); e.stopImmediatePropagation(); closeCameraMenu(button);
        if (action === 'fit' || action === 'whole') api.fitAll();
        else if (action === 'selection') api.fitSelection();
        else if (action === 'readable') api.readable();
        else if (action === 'zin' || action === 'zout') api.zoomStep(action === 'zin' ? 1 : -1);
        else if (action === 'actual') { const {w, h} = box(); api.zoomAt(1, w / 2, h / 2); }
      }, {signal, capture: true});
      root.addEventListener('keydown', e => { const menu = e.target.closest?.('.cm-fit-options, .nt-arrange-options'); if (menu && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); menu.open = false; menu.querySelector('summary')?.focus(); } }, {signal, capture: true});
      root.addEventListener('change', e => { const box = e.target.closest?.('[data-cm-fit-on-open]'); if (!box || !L) return; setFitOnOpen(key, box.checked, cam); refreshFitOnOpen(root, key); }, {signal});
      let drag = null, moved = false;
      let miniDrag = false;
      stage.addEventListener('pointerdown', e => { if (e.button === 1 && !e.target.closest('input,textarea,select')) { e.preventDefault(); e.stopPropagation(); drag = {x: e.clientX, y: e.clientY, px: cam.px, py: cam.py}; moved = false; } }, {signal, capture: true});
      stage.addEventListener('pointerdown', e => {
        if (e.button === 0 && e.target.closest('.cm-minimap')) { e.preventDefault(); e.stopPropagation(); miniDrag = true; miniMove(e); return; }
        if (e.button !== 0 || e.target.closest('button,a,select,input,.cm-zoom,.cm-key,.cm-minimap,.nt-layer-note,[data-cm-inset],[data-cm-scroll],' + noPan)) return; drag = {x: e.clientX, y: e.clientY, px: cam.px, py: cam.py}; moved = false; }, {signal});
      window.addEventListener('pointermove', e => {
        // Chapter roots are retained while another tab is open, then mounted again.
        // Ignore the detached view without permanently disabling its next drag.
        if (!root.isConnected) { drag = null; miniDrag = false; moved = false; stage.classList.remove('panning'); return; }
        if (miniDrag) { miniMove(e); return; }
        if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) { moved = true; stage.classList.add('panning'); } if (moved) { chosenCameras.add(key); cam.px = drag.px + dx; cam.py = drag.py + dy; api.clamp(); api.apply(); } return; }
        onHover?.(e);
      }, {signal});
      const endPan = () => { miniDrag = false; if (!drag) return; drag = null; stage.classList.remove('panning'); if (moved) { root.dataset.suppress = '1'; setTimeout(() => { delete root.dataset.suppress; }, 50); } moved = false; };
      for (const event of ['pointerup', 'pointercancel', 'blur']) window.addEventListener(event, endPan, {signal});
      // Focusing a card can scroll the clipped stage itself; the camera alone moves the world.
      stage.addEventListener('scroll', () => { if (stage.scrollTop || stage.scrollLeft) { stage.scrollTop = 0; stage.scrollLeft = 0; } }, {signal});
      // Keyboard focus moves the camera to the card, so tabbing through a model never loses sight of it.
      // Round 10 (N6): the same for a relationship's hit or an element drawn in the picture's SVG, when the keyboard put
      // focus there (:focus-visible), so focus is never left off the stage (WCAG 2.4.11); focus by the pointer, which lands
      // on what is already in view, never moves the camera.
      stage.addEventListener('focusin', e => {
        if (!L || drag) return;
        const el = e.target.closest?.('.cm-html > [style]');
        if (el) {
          const n = k => parseFloat(el.style[k]) || 0;
          if (el.style.left && el.style.top) api.reveal(n('left'), n('top'), n('width') || el.offsetWidth, n('height') || el.offsetHeight);
          return;
        }
        const s = e.target.closest?.('.cm-svg .nt-hit, .cm-svg .nt-node');
        let keyboard = false; try { keyboard = !!s && s.matches(':focus-visible'); } catch { keyboard = false; }
        if (!keyboard) return;
        try {
          const b = s.getBBox(), m = s.getCTM(); if (!m) return;
          const xs = [], ys = [];
          for (const [x, y] of [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]) { xs.push(m.a * x + m.c * y + m.e); ys.push(m.b * x + m.d * y + m.f); }
          const x0 = Math.min(...xs), y0 = Math.min(...ys);
          api.reveal(x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0);
        } catch { /* a part that cannot be measured stays where it is */ }
      }, {signal});
      stage.addEventListener('wheel', e => {
        // A menu laid over the stage that scrolls (data-cm-scroll: the canvas's target list, rc41 close) keeps the wheel;
        // Ctrl/⌘ + wheel still zooms the picture.
        if (!(e.ctrlKey || e.metaKey) && e.target.closest?.('[data-cm-scroll]')) return;
        e.preventDefault();
        const r = stage.getBoundingClientRect();
        if (e.ctrlKey || e.metaKey) api.zoomAt(cam.z * Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top);
        else { chosenCameras.add(key); cam.px -= e.shiftKey ? e.deltaY : e.deltaX; cam.py -= e.shiftKey ? 0 : e.deltaY; api.clamp(); api.apply(); }
      }, {passive: false, signal});
      // A sheet (Table, Matrix) zooms at the pointer too (rc39): Ctrl/⌘ + wheel scales it and keeps the point under the pointer.
      root.addEventListener('wheel', e => {
        if (!(e.ctrlKey || e.metaKey)) return; const sheet = e.target.closest?.('.cm-sheet'); if (!sheet || !activeSheet(root) || sheet.matches('[data-anatomy]')) return;
        e.preventDefault(); const scroller = sheet.querySelector('.nt-table-wrap') || sheet, r = scroller.getBoundingClientRect(), z0 = Number(sheet.style.zoom) || 1, z = Math.max(.1, Math.min(1.8, z0 * Math.exp(-e.deltaY * 0.0022)));
        const fx = (scroller.scrollLeft + e.clientX - r.left) / z0, fy = (scroller.scrollTop + e.clientY - r.top) / z0;
        sheet.style.zoom = String(z); scroller.scrollLeft = fx * z - (e.clientX - r.left); scroller.scrollTop = fy * z - (e.clientY - r.top); refreshZoomReadout(root);
      }, {passive: false, signal});
      // The edges nudge the camera; the arrow keys pan it when the canvas itself has focus.
      stage.addEventListener('click', e => { const ed = e.target.closest('.cm-edge'); if (ed) { e.stopPropagation(); api.nudge(ed.dataset.edge); } }, {signal});
      stage.addEventListener('keydown', e => {
        if (!L || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,textarea,select,[contenteditable="true"]')) return;
        if (e.target === stage || e.target.closest('.nt-node,[data-card]')) {
          if (['+', '=', '-', '_', '0', '1', '2', 'f', 'F', 'Home'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); if (['+', '=', '-', '_'].includes(e.key)) api.zoomStep(e.key === '+' || e.key === '=' ? 1 : -1); else if (e.key === '0') { const {w, h} = box(); api.zoomAt(1, w / 2, h / 2); } else if (e.key === '2' || (e.key.toLowerCase() === 'f' && e.shiftKey)) api.fitSelection(); else if (e.key === 'Home') api.readable(); else api.fitAll(); return; }
        }
        if (e.target !== stage) return;
        const step = e.shiftKey ? 240 : 60, k = e.key;
        if (k === 'ArrowLeft') cam.px += step; else if (k === 'ArrowRight') cam.px -= step; else if (k === 'ArrowUp') cam.py += step; else if (k === 'ArrowDown') cam.py -= step; else return;
        chosenCameras.add(key); e.preventDefault(); api.clamp(); api.apply();
      }, {signal});
    }
  };
  return api;
}

// The stage's four edges, drawn only where the world runs past them.
export const edgesHTML = () => ['l', 'r', 't', 'b'].map(d => `<button type="button" class="cm-edge cm-edge-${d}" data-edge="${d}" tabindex="-1" aria-label="${{l: 'More to the left', r: 'More to the right', t: 'More above', b: 'More below'}[d]}">${{l: '‹', r: '›', t: '˄', b: '˅'}[d]}</button>`).join('');
// The key and the zoom controls, in the footer beside the walk: never over the canvas.
export const zoomReadoutHTML = () => '<button type="button" class="cm-btn cm-zoom-value" data-cm-camera="actual" aria-label="Zoom 100%; reset to 100%" title="Zoom 100%; reset to 100%">100%</button>';
// On a phone the tools stand behind one control (model-round27.css folds the footer to one row); the control is hidden on a
// wider window, where the tools stand in the footer as before.
export const toolsHTML = (k, keyLabel = 'Key') => `<button type="button" class="cm-btn cm-tools-toggle" data-cm-tools-toggle aria-expanded="false" title="Key, zoom, labels and export">Tools</button><div class="cm-tools"><div class="cm-key cm-min"><button type="button" class="cm-kt" data-${k}="key" aria-expanded="false">${keyLabel}</button><div class="cm-legend" role="region" aria-label="Key"></div></div><div class="cm-zoom" role="group" aria-label="Canvas zoom"><button type="button" data-${k}="zout" aria-label="Zoom out" title="Zoom out · −">−</button>${zoomReadoutHTML()}<button type="button" data-${k}="zin" aria-label="Zoom in" title="Zoom in · +">+</button><div class="cm-fit-menu"><button type="button" data-${k}="fit" aria-label="Fit the whole picture" title="Fit the whole picture · F or 1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg><span>Fit</span></button><details class="cm-fit-options"><summary aria-label="Fit and navigation options" title="Fit and navigation options">▾</summary><div><button type="button" data-cm-camera="whole">Fit whole drawing <small>F</small></button><button type="button" data-cm-camera="selection" disabled>Fit selection <small>Shift+F</small></button><button type="button" data-cm-camera="readable">Readable view <small>Home</small></button><button type="button" data-cm-camera="actual">100% <small>0</small></button><label class="cm-fit-keep"><input type="checkbox" data-cm-fit-on-open checked> Fit on open <small>off: this view opens where you left it</small></label><p>Drag the background or use the middle mouse button to pan. Ctrl/⌘ + wheel zooms at the pointer. While the drawing has focus: ${KEYBOARD_MAP}</p></div></details></div></div><button type="button" class="cm-btn" data-model-labels>Read labels</button><details class="cm-export"><summary>Export view</summary><div><p>Visible scope and filters only. Diagram also exports the full standard model.</p>${['svg','png','html'].map(format => `<button type="button" class="cm-btn" data-model-export="${format}">${format === 'html' ? 'View HTML' : format.toUpperCase()}</button>`).join('')}<div class="cm-export-standard"></div></div></details><span class="cm-export-status" role="status"></span></div>`;
if (typeof document !== 'undefined') document.addEventListener('click', e => {
  const button = e.target.closest?.('[data-cm-tools-toggle]'), footer = button?.closest('.cm-walk'); if (!footer) return;
  e.preventDefault(); const open = footer.classList.toggle('cm-tools-open');
  button.setAttribute('aria-expanded', String(open)); button.textContent = open ? 'Hide tools' : 'Tools';
});
if (typeof document !== 'undefined') document.addEventListener('click', async e => {
  const button = e.target.closest?.('[data-model-export]'); if (!button) return;
  const root = button.closest('.cm'); if (!root) return;
  e.preventDefault(); const status = root.querySelector('.cm-export-status'); button.disabled = true;
  try { if (status) status.textContent = 'Preparing export…'; const {exportVisibleModel} = await import('./model-export.js'); await exportVisibleModel(root, button.dataset.modelExport); if (status) status.textContent = 'Export ready.'; }
  catch (error) { if (status) status.textContent = error.message || 'Export failed. Try SVG or View HTML.'; }
  finally { button.disabled = false; }
});

// The companion opens as a column on a wide window and as a drawer on a narrow one, unless the
// reader has chosen for this project.
export function defaultPanel(saved) { return typeof saved === 'boolean' ? saved : window.innerWidth > 1200; }
// The companion toggle says what it does in each state, and how many observations wait behind it.
export function panelToggle(root, selector, open, count = 0) {
  const b = root.querySelector(selector); if (!b) return;
  // In the shell the companion is the frame's own column (round 3, B): there is nothing to show or hide.
  b.hidden = isDocked(root);
  if (b.hidden) { b.setAttribute('aria-pressed', 'true'); b.querySelector('.cm-badge')?.remove(); return; }
  b.setAttribute('aria-pressed', String(open));
  b.setAttribute('aria-label', open ? 'Hide the companion panel' : `Show the companion panel${count ? ` · ${count} observation${count === 1 ? '' : 's'}` : ''}`);
  b.title = open ? 'Hide the companion' : 'Show the companion';
  drawerDialog(root, selector, open);
  let badge = b.querySelector('.cm-badge');
  if (!open && count) { if (!badge) { badge = document.createElement('i'); badge.className = 'cm-badge'; b.append(badge); } badge.textContent = String(count); }
  else badge?.remove();
}
// Below 1200 px the companion covers part of the model. While it is open there it is announced as a dialog,
// takes focus when opened, closes on Escape and gives focus back to its toggle (audit F-18).
const drawers = new WeakSet();
export function drawerDialog(root, selector, open) {
  const toggle = root.querySelector(selector); if (toggle) toggle.hidden = isDocked(root);
  const panel = root.querySelector('.cm-panel'); if (!panel) return;
  if (open && window.innerWidth <= 1200) { panel.setAttribute('role', 'dialog'); if (!panel.hasAttribute('aria-label')) panel.setAttribute('aria-label', 'Companion'); panel.tabIndex = -1; }
  else panel.removeAttribute('role');
  if (drawers.has(root)) return;
  drawers.add(root);
  root.addEventListener('click', e => { if (window.innerWidth > 1200 || !e.target.closest?.(selector)) return; nextFrame(() => { if (root.querySelector(selector)?.getAttribute('aria-pressed') === 'true') root.querySelector('.cm-panel')?.focus({preventScroll: true}); }); });
  root.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || window.innerWidth > 1200 || !e.target.closest?.('.cm-panel')) return;
    const toggle = root.querySelector(selector); if (toggle?.getAttribute('aria-pressed') !== 'true') return;
    e.preventDefault(); e.stopPropagation(); toggle.click(); nextFrame(() => root.querySelector(selector)?.focus({preventScroll: true}));
  });
}
// A live status is announced only when it changes, not on every redraw.
export function setState(root, text) { const el = root.querySelector('.cm-state'); if (el && el.textContent !== text) el.textContent = text; }
// Labels are read from the drawn scope, including off-screen elements. CSS cropping
// does not shorten these accessible labels. No project-wide records are added here.
export function modelLabelEntries(root) {
  const rows = [], seen = new Set();
  for (const node of root.querySelectorAll('.cm-stage [data-card], .cm-stage [data-nt-node], .cm-stage [data-nt-edge][aria-label], .cm-sheet[data-anatomy] .an-n[data-id]')) {
    if (node.closest('[hidden], .nt-layer-off')) continue;
    const id = node.dataset.ntNode || node.dataset.ntEdge || node.dataset.card || node.dataset.id;
    const text = (node.getAttribute('aria-label') || node.querySelector('title')?.textContent || node.textContent || '').replace(/\s+/g, ' ').trim();
    const key = (node.dataset.ntEdge ? 'edge:' : 'node:') + id;
    if (!text || seen.has(key)) continue; seen.add(key); rows.push({id, text, node});
  }
  return rows;
}
if (typeof document !== 'undefined') document.addEventListener('click', e => {
  const button = e.target.closest?.('[data-model-labels]'); if (!button) return;
  const root = button.closest('.cm'); if (!root) return;
  const rows = modelLabelEntries(root), dialog = document.createElement('dialog'); dialog.className = 'cm-label-reader';
  dialog.setAttribute('aria-label', 'Read picture labels');
  dialog.innerHTML = '<h2>Read picture labels</h2><p>Fit shows the whole picture at overview scale. Zoom in to read the drawing, or find a full label here and return to that element. This list follows the drawn scope and filters.</p><label>Find a label <input type="search" aria-label="Find a full picture label"></label><p class="cm-label-count" role="status"></p><div class="cm-label-list"></div><form method="dialog"><button class="cm-btn">Close</button></form>';
  const draw = () => { const query = dialog.querySelector('input').value.trim().toLowerCase(), matches = rows.map((r, i) => ({...r, i})).filter(r => r.text.toLowerCase().includes(query) || r.id.toLowerCase().includes(query)); dialog.querySelector('.cm-label-count').textContent = `${matches.length} labels${matches.length > 100 ? ' · first 100 shown; narrow the search' : ''}`; dialog.querySelector('.cm-label-list').innerHTML = matches.slice(0, 100).map(r => `<button type="button" data-label-index="${r.i}">${esc(r.text)}</button>`).join('') || '<p>No drawn labels match.</p>'; };
  dialog.addEventListener('input', draw);
  dialog.addEventListener('click', ev => { const b = ev.target.closest('[data-label-index]'); if (!b) return; const row = rows[Number(b.dataset.labelIndex)]; if (!row?.node.isConnected) return; dialog.close(); row.node.focus({preventScroll: false}); row.node.dispatchEvent(new MouseEvent('click', {bubbles: true})); });
  dialog.addEventListener('close', () => { dialog.remove(); if (document.activeElement === document.body) button.focus(); }, {once: true});
  document.body.append(dialog); draw(); dialog.showModal(); dialog.querySelector('input').focus();
});
// Read the actual controls after each redraw; this is a caption, never another
// preference store. Whole design owns its controls inside the shared sheet.
const readingWatches = new WeakSet();
export function refreshModelReading(root) {
  const caption = root?.querySelector('.cm-reading-caption'); if (!caption) return;
  const text = el => el?.textContent.replace(/\s+/g, ' ').trim() || '';
  const whole = root.classList.contains('nt-sheet-on') && root.querySelector('.cm-sheet[data-anatomy]');
  const lens = text(root.querySelector(whole ? '.an-lens[aria-pressed="true"]' : '.cm-lenses .cm-lens[aria-pressed="true"]'));
  const depth = text(root.querySelector(whole ? '.an-depth .an-dep[aria-pressed="true"]' : '.cm-depth .cm-dep[aria-pressed="true"]'));
  const heading = whole ? 'Depth' : text(root.querySelector('.cm-depth > span')) || 'Detail';
  const value = [lens ? 'Lens: ' + lens : '', depth ? heading + ': ' + depth : ''].filter(Boolean).join(' · ');
  if (caption.textContent !== value) caption.textContent = value;
  caption.hidden = !value;
  if (!readingWatches.has(root) && typeof MutationObserver !== 'undefined') {
    readingWatches.add(root);
    new MutationObserver(() => { if (root.isConnected) { refreshModelReading(root); revealPressedView(root); } }).observe(root, {subtree: true, childList: true, attributes: true, attributeFilter: ['aria-pressed']});
    revealPressedView(root); if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => revealPressedView(root));
  }
}
// The view rail stands on one row and scrolls sideways when it is narrower than its views (a phone): a pressed view
// that is cut off, or within 24 px of the rail's end, is brought to the rail's start — a snap position of the rail
// (scroll-snap-align: start), so proximity snapping keeps it there — sideways only; the page is never scrolled for it.
export function revealPressedView(root) {
  const box = root.querySelector('.cm-views'), b = box?.querySelector('.cm-view[aria-pressed="true"]');
  if (!box || !b || !root.isConnected || box.scrollWidth <= box.clientWidth + 1) return;
  const r = b.getBoundingClientRect(), f = box.getBoundingClientRect(), margin = 24;
  if (r.left < f.left || r.right > f.right - margin) box.scrollLeft += r.left - f.left;
}
// Native chapter drawings keep their own semantic routes, failure colours and
// selection. Their connection visibility uses the same control as Diagram and
// Layers; it never filters architectural records or changes a layout.
const nativeConnectionStates = new WeakMap();
const nativeInk = '.sm-route,.sm-head,.sm-join,.sm-label,.um-edge,.um-join,.dx-route,.dx-head,.dx-join,.lr-route,.lr-label,.rz-route,.rz-label,.pf-arc,.pf-arc-dot,.tm-route,.tm-head,.tm-join,.tm-label,.dp-rail,.dp-arc,.dp-head,.dp-mark,.dp-tick,.cm-mv,.cm-mvl';
const connectionModes = [['overview', 'Overview'], ['selected', 'Selected'], ['all', 'All'], ['none', 'None']];
const CONNECTION_STEP = 6;
const connectionIds = (el, key = 'cmLinks') => {
  try { const ids = JSON.parse(el?.dataset[key] || '[]'); return Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : []; }
  catch { return []; }
};
export function refreshNativeConnections(root, chosen) {
  const bar = root.querySelector('.cm-bar'), world = root.querySelector('.cm-world');
  if (!bar || !world) return;
  const ink = [...world.querySelectorAll(nativeInk)];
  const available = ink.length > 0 && !root.matches('.nt-active,.nt-sheet-on,.rz-specv,.dk-table');
  let control = bar.querySelector('[data-native-connections]');
  if (!available) { control?.remove(); return; }
  const chapter = root.dataset.chapter || new URL(location.href).searchParams.get('chapter') || '';
  const active = root.querySelector('.cm-views .cm-view[aria-pressed="true"]');
  const key = projectPreferenceKey('aiw-native-connections-v1-' + chapter + '-' + (active?.dataset.id || active?.textContent.trim() || 'model'));
  const entries = ink.map(el => ({el, ids: connectionIds(el), highlighted: el.matches('.lit,.carries')}));
  const known = new Set(entries.flatMap(x => x.ids));
  // Tree and decision layouts already put inputs before their consequences.
  // Their paint order is different, so retain the renderer's reading order.
  const order = connectionIds(world.querySelector('.cm-svg'), 'cmConnectionOrder');
  const ids = [...new Set([...order.filter(id => known.has(id)), ...[...known].sort()])];
  const selectedIds = new Set(entries.filter(x => x.highlighted && x.ids.length === 1).flatMap(x => x.ids));
  // Count relationships in the view, never SVG strokes. A bundled path or a
  // deployment rail is revealed with its heads, joins, branches and labels.
  const complete = entries.every(x => x.ids.length), total = ids.length;
  let state = nativeConnectionStates.get(root);
  if (state?.key !== key) {
    let mode = 'overview', limit = CONNECTION_STEP;
    try {
      const saved = localStorage.getItem(key), count = Number(localStorage.getItem(key + '-reveal'));
      if (connectionModes.some(([id]) => id === saved)) mode = saved;
      if (Number.isSafeInteger(count) && count >= CONNECTION_STEP && count <= 100000) limit = count;
    } catch { /* local picture preferences are optional */ }
    state = {key, mode, limit}; nativeConnectionStates.set(root, state);
  }
  if (connectionModes.some(([id]) => id === chosen)) {
    state.mode = chosen;
    if (chosen === 'overview') state.limit = CONNECTION_STEP;
  } else if (chosen === 'more' && complete && state.mode === 'overview') {
    let added = 0;
    while (state.limit < total && added < CONNECTION_STEP) {
      if (!selectedIds.has(ids[state.limit])) added++;
      state.limit++;
    }
    if (new Set([...ids.slice(0, state.limit), ...selectedIds]).size >= total) state.mode = 'all';
  }
  if (chosen) try {
    localStorage.setItem(key, state.mode); localStorage.setItem(key + '-reveal', String(state.limit));
  } catch { /* the control still works without storage */ }
  if (!control) {
    control = document.createElement('div'); control.className = 'nt-connections'; control.dataset.nativeConnections = '';
    control.innerHTML = '<span class="nt-connections-label">Connections</span><div class="nt-connection-modes" role="group" aria-label="Connection visibility">' + connectionModes.map(([id, label]) => `<button type="button" data-cm-connections="${id}" aria-pressed="false">${label}</button>`).join('') + '</div><small class="nt-connection-caption" aria-live="polite"></small><button type="button" class="nt-reveal-next" data-cm-reveal></button>';
    bar.append(control);
  }
  control.hidden = false;
  // Individual selected routes carry the exact identities. Shared heads/joins
  // must not pull unrelated branches into the overview selection context.
  const selected = entries.some(x => x.highlighted);
  const shown = new Set([...ids.slice(0, state.limit), ...selectedIds]);
  for (const {el, ids: members, highlighted} of entries) {
    const visible = state.mode === 'all' || state.mode === 'selected' && highlighted || state.mode === 'overview' && (!complete || members.some(id => shown.has(id)));
    el.classList.add('cm-native-link');
    el.classList.toggle('cm-native-link-off', !visible);
    el.classList.toggle('cm-native-link-all', state.mode === 'all');
  }
  for (const button of control.querySelectorAll('[data-cm-connections]')) {
    const mode = button.dataset.cmConnections;
    button.setAttribute('aria-pressed', String(mode === state.mode));
    button.disabled = mode === 'selected' && !selected;
    button.title = mode === 'overview' ? 'Start with up to six grouped paths and the selected-object context; reveal more without moving objects' : mode === 'selected' ? selected ? 'Show the highlighted connections of the selected object or current walkthrough' : 'Select an object with connections first' : mode === 'all' ? 'Show every connection drawn in the current scope, including those dimmed by selection' : 'Hide connector lines and their labels; keep objects and structural guides';
  }
  const caption = control.querySelector('.nt-connection-caption'), count = Math.min(total, shown.size);
  const text = {overview: complete ? `${count} of ${total} connection groups` : 'View and selection emphasis', selected: selected ? 'Selected connections only' : 'Select an object to explore its connections', all: complete ? `All ${total} connection groups` : 'All connections in this view', none: 'Connections hidden'}[state.mode];
  if (caption.textContent !== text) caption.textContent = text;
  caption.title = complete ? 'A group keeps the complete path, arrowheads, branches and labels together. Some paths summarise several saved relationships.' : '';
  const more = control.querySelector('[data-cm-reveal]');
  more.hidden = state.mode !== 'overview' || !complete || count >= total;
  more.textContent = `Reveal next ${Math.min(CONNECTION_STEP, total - count)}`;
  more.title = 'Add the next connection groups; objects and saved positions stay in place';
  if (chosen === 'more' && more.hidden) control.querySelector('[data-cm-connections="all"]')?.focus({preventScroll: true});
}
if (typeof document !== 'undefined') document.addEventListener('click', e => {
  const button = e.target.closest?.('[data-cm-connections],[data-cm-reveal]'), root = button?.closest('.cm');
  if (!root || button.disabled) return;
  e.preventDefault(); refreshNativeConnections(root, button.hasAttribute('data-cm-reveal') ? 'more' : button.dataset.cmConnections);
});
// The chapter's state line, read from the saved records on every draw of the Model tab's view, stands in the shell
// footer beside its Next task (rc41 close: in the Model's own footer it pushed the tools to a second row). Only the view
// on the stage while the Model tab is open writes it; a tab change redraws the footer without it (app.js render).
export function placeChapterState(root) {
  const footer = document.querySelector('#workspace > .footer'); if (!footer || document.body.dataset.workspaceTab !== 'model' || !root?.parentElement?.matches?.('.studio > .stage.tab-content')) return;
  const chapter = Number(root.dataset.chapter || new URL(location.href).searchParams.get('chapter')), p = currentProject();
  let st = null; try { st = p && chapter >= 1 && chapter <= 11 ? chapterRecordsState(p, chapter) : null; } catch { st = null; }
  const [old, ...extra] = footer.querySelectorAll(':scope > .chapter-state'); extra.forEach(e => e.remove());
  if (!st) { old?.remove(); return; }
  // Below about 1,180 px the footer's row can cut the line with an ellipsis; its title carries the whole line.
  const t = document.createElement('template'); t.innerHTML = chapterStateHTML(st, {chapter, attrs: 'title="' + esc(st.line) + '"'}); const el = t.content.firstElementChild;
  if (old) { if (old.outerHTML !== el.outerHTML) old.replaceWith(el); return; }
  const next = footer.querySelector(':scope > .workspace-next'); if (next) next.after(el); else footer.prepend(el);
}
// Every instrument keeps status, Key and camera controls in the same footer.
export function modelChrome(root) {
  watchSheetCamera(root);
  refreshCameraAvailability(root);
  refreshModelReading(root);
  refreshNativeConnections(root);
  placeChapterState(root);
  const whole = root.querySelector('.cm-sheet[data-anatomy]'), legend = whole?.querySelector('.an-legend');
  if (legend && root.querySelector('.cm-legend')) root.querySelector('.cm-legend').innerHTML = legend.innerHTML;
  // The footer describes the visible canvas. Detailed reading guidance belongs in
  // the companion; capacity/vital explanations belong with their view's content.
  const walk = root.querySelector('.cm-walk-in');
  for (const b of walk?.querySelectorAll('button') || []) {
    const action = Object.values(b.dataset).find(v => /^walk-(start|next|prev|stop|record)$/.test(v));
    if (!action) continue;
    const label = b.textContent.trim(); b.dataset.walk = action.slice(5);
    if ((action === 'walk-next' && /^(Walk |Step through)/.test(label)) || action === 'walk-start') { b.title ||= label; b.innerHTML = '<span>Start</span>'; b.dataset.walk = 'start'; }
    else if (action === 'walk-next' && label === 'Done') b.textContent = 'Finish';
  }
  const chapter = Number(root.dataset.chapter || new URL(location.href).searchParams.get('chapter'));
  const first = root.querySelector('.cm-views .cm-view:not(.nt-shared-view):not([data-id="diagram"])');
  if (walk && [1,2,3,4,5,6,9,10,11].includes(chapter) && !walk.querySelector('[data-walk], [data-model-walk]') && first && !first.disabled && first.getAttribute('aria-pressed') !== 'true') walk.insertAdjacentHTML('afterbegin', '<button type="button" class="cm-btn" data-model-walk="open" data-walk="start">Start walkthrough</button>');
}
if (typeof document !== 'undefined') document.addEventListener('click', e => {
  const b = e.target.closest?.('[data-model-walk="open"]'); if (!b) return;
  const root = b.closest('.cm'), first = root?.querySelector('.cm-views .cm-view:not(.nt-shared-view):not([data-id="diagram"])');
  if (!first || first.disabled) return; first.click();
  nextFrame(() => root.querySelector('.cm-walk-in [data-walk="start"]:not([data-model-walk])')?.click());
});
if (typeof document !== 'undefined') document.addEventListener('click', e => {
  const b = e.target.closest?.('.cm-tools button'); if (!b) return;
  const camera = b.dataset.cmCamera, action = camera === 'whole' ? 'fit' : camera === 'readable' ? 'actual' : camera || Object.values(b.dataset).find(v => ['zin','zout','fit'].includes(v)), root = b.closest('.cm');
  if (!action || !root || b.disabled) return;
  if (activeSheet(root)) closeCameraMenu(b);
  const whole = root.querySelector('.cm-sheet[data-anatomy]');
  if (whole && root.classList.contains('nt-sheet-on')) {
    if (action === 'actual') {
      const stage = whole.querySelector('.an-stage'), Wheel = root.ownerDocument.defaultView.WheelEvent;
      if (stage && Wheel) { e.preventDefault(); e.stopImmediatePropagation(); const box = stage.getBoundingClientRect(); stage.dispatchEvent(new Wheel('wheel', {bubbles: true, cancelable: true, ctrlKey: true, clientX: box.left + box.width / 2, clientY: box.top + box.height / 2, deltaY: Math.log(visibleZoom(root)) / .0022})); }
    } else { const control = whole.querySelector(`[data-an="${action}"]`); if (control) { e.preventDefault(); e.stopImmediatePropagation(); control.click(); } }
    refreshZoomReadout(root); return;
  }
  const sheet = activeSheet(root);
  if (!sheet) return;
  e.preventDefault(); e.stopImmediatePropagation(); const current = Number(sheet.style.zoom) || 1, available = sheet.getBoundingClientRect().width || sheet.parentElement.clientWidth || sheet.clientWidth, width = Math.max(sheet.scrollWidth, sheet.clientWidth, ...[...sheet.querySelectorAll('table, .nt-table-wrap')].map(el => el.scrollWidth)), zoom = action === 'fit' ? Math.min(1, available && width ? available / width : 1) : action === 'actual' ? 1 : Math.max(.1, Math.min(1.8, current * (action === 'zin' ? 1.15 : 1 / 1.15))); sheet.style.zoom = String(zoom); refreshZoomReadout(root);
}, true);
// The page hears what the model selected through the URL's object=, whichever path selected it.
export function announceObject(target) {
  // The shell's subject strip hears it too (round 11, A).
  try { if (typeof CustomEvent === 'function') window.dispatchEvent(new CustomEvent('aiw:subject', {detail: {id: target || null}})); } catch { /* the strip is optional */ }
  if (!window.history) return;
  const url = new URL(location.href);
  if (target) url.searchParams.set('object', target); else url.searchParams.delete('object');
  window.history.replaceState(window.history.state, '', url.pathname + url.search);
}
// A redraw replaces the canvas's elements. The keyboard's place is kept by what it pointed at: the
// element with the same data attributes is focused again, without scrolling.
export function focusKey(root) {
  const a = document.activeElement; if (!a || a === document.body) return null;
  const companion = !root.contains(a) && !!companionOf(root)?.contains(a);
  if (!root.contains(a) && !companion) return null;
  const ds = Object.entries(a.dataset); return ds.length ? {el: a, tag: a.tagName, ds, companion} : null;
}
export function refocus(root, key) {
  if (!key || key.el.isConnected) return;
  const attr = k => 'data-' + k.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
  const host = key.companion ? companionOf(root) : root;
  const el = [...(host?.querySelectorAll(`${key.tag}[${attr(key.ds[0][0])}]`) || [])].find(e => key.ds.every(([k, v]) => e.dataset[k] === v));
  if (el) { try { el.focus({preventScroll: true}); } catch { /* not focusable */ } }
}
// What a model says when the project records nothing it can draw: the next action, in place.
export function emptyCard({title, text, actions = '', x = 40, y = 40}) {
  return `<div class="cm-empty-card" style="left:${x}px;top:${y}px"><b>${title}</b><p>${text}</p><div class="cm-acts">${actions}</div></div>`;
}
// A model that cannot be built leaves nothing of the last one on screen.
export function showFailure(root, text) {
  for (const s of ['.cm-svg', '.cm-heads-in', '.cm-rail-in', '.cm-walk-in', '.cm-panel', '.cm-legend']) { const el = root.querySelector(s); if (el) el.innerHTML = ''; }
  root.querySelector('.cm-html').innerHTML = `<p class="cm-empty" role="alert">${text}</p>`;
  setState(root, '');
}

// Size a chapter model to the space left in the window below it. Inside the shell's stage column (round 3, B)
// the model fills the column's visible height, never less than 560 px, so the page itself does not scroll while a
// picture is open; what the stage holds below the model (a trace, a failure lab) is reached by scrolling the column.
export function sizeModel(root, expandedClass) {
  if (!root) return;
  const expanded = document.body.classList.contains(expandedClass);
  const column = root.closest('.studio > .stage'), wide = window.innerWidth > 1100;
  let h;
  if (expanded) h = window.innerHeight - 16;
  // Round 7 (proportion, audit/round7/DESIGN.md B): the frame fits the space it has, its status line included, so
  // nothing scrolls to show a picture: the stage column's height in the shell (the column is sized to the viewport),
  // else the space from the frame's top to the footer; never under 440 px (560 on a phone, where the page scrolls).
  // Round 8: in a window 800 px high or less the column's own height stands, down to 340 px, so the frame's status
  // line stays in view under the round-6 header.
  else if (column && wide && column.clientHeight > 0) h = Math.max(window.innerHeight <= 800 ? 340 : 440, column.clientHeight - 2);
  else { const top = root.getBoundingClientRect().top, footer = document.querySelector('.footer, .r-footer')?.offsetHeight || 0; h = Math.max(window.innerWidth < 700 ? 560 : 440, window.innerHeight - Math.max(0, top) - footer - 16); }
  root.style.setProperty('--cm-h', Math.round(h) + 'px');
}

// ---------------------------------------------------------------- the companion column (round 3, B)
// A chapter model's companion — "Reading this picture", the selected element with Open in Work, the Sol section
// and the element's checks — renders into the shell's companion column (#inspector) beside the stage, so the
// frame is the same on Work and Model. Without the shell (a suite mounting a model alone) it stays the .cm-panel
// inside the model. The column is rebuilt with every page render, so the host is looked up on each use, and the
// model's listeners that the companion's controls need are re-attached to each new host: a view registers them
// with listen(root, …) instead of root.addEventListener.
const companions = new WeakMap(); // root → {listeners: [[type, fn, opts]], host, abort}
const regOf = root => { let r = companions.get(root); if (!r) { r = {listeners: [], host: null, abort: null}; companions.set(root, r); } return r; };
export function listen(root, type, fn, opts) {
  root.addEventListener(type, fn, opts);
  const r = regOf(root); r.listeners.push([type, fn, opts]);
  if (r.host && r.abort && !root.contains(r.host)) r.host.addEventListener(type, fn, {...(typeof opts === 'object' ? opts : {}), signal: r.abort.signal});
}
// The shell's companion column, when this model is mounted in the shell's stage.
function shellColumn(root) {
  if (!root?.isConnected || typeof document === 'undefined') return null;
  const studio = root.closest('.studio'), col = studio?.querySelector(':scope > #inspector');
  return col && !col.contains(root) ? col : null;
}
export function companionHost(root) {
  if (!root) return null;
  const r = regOf(root), col = shellColumn(root);
  if (!col) { root.classList.remove('cm-docked'); return root.querySelector('.cm-panel'); }
  let host = col.querySelector(':scope > .cm-companion');
  if (!host) { host = document.createElement('div'); host.className = 'cm-companion'; col.append(host); watchCompanion(host); }
  // The view's own class (lr, rz, pf …) scopes its companion styles as it did inside the model.
  const own = [...root.classList].find(c => c !== 'cm' && !c.includes('-')) || '';
  const cls = 'cm-companion' + (own ? ' ' + own : '');
  if (host.className !== cls) host.className = cls;
  if (r.host !== host || host.__cmRoot !== root) {
    r.abort?.abort(); r.abort = new AbortController(); r.host = host; host.__cmRoot = root;
    for (const [type, fn, opts] of r.listeners) host.addEventListener(type, fn, {...(typeof opts === 'object' ? opts : {}), signal: r.abort.signal});
  }
  col.setAttribute('aria-label', (root.getAttribute('aria-label') || 'Model') + ' · companion');
  root.classList.add('cm-docked');
  return host;
}
// ---------------------------------------------------------------- the companion's sections (round 7, Contract C)
// The docked companion folds what a view renders into classified, collapsible sections under one summary style:
// every top-level section that opens with an h4 becomes a <details class="cp"> whose summary is that heading (its
// count span the badge); Sol's parts (the selection's assessment, the chapter round, the review) gather under one
// <details class="cp cp-sol"> whose summary is the review's own heading. Order: the selection's own parts first
// (a specimen, a story, a trace — unfolded or folded in place), then "What the model shows", the checks, "Reading
// this …", Sol. Open by default, except Sol, which is closed until it is busy or has findings; a viewer's choice is
// remembered per section (localStorage, a convenience: without it the defaults stand). The fold runs after every
// render of the host and is idempotent, so no view changes its render.
const CP_STORE = 'aiw.companion.', CP_TAIL = ['shows', 'checks', 'reading', 'sol'];
const SOL_PARTS = '.cs-ask, .cs-round, .cs-note, .dk-sol, .dk-solpend, .dk-solagain, .sr, .brain-sol, [data-sol-scope]';
const cpKey = text => { const t = String(text || '').trim().toLowerCase(); if (/^what the model shows/.test(t)) return 'shows'; if (/^reading th/.test(t)) return 'reading'; if (/^(checks|findings|open checks)|^chapter \d+ checks|checks$/.test(t)) return 'checks'; return t.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'section'; };
const cpRead = key => { try { return localStorage.getItem(CP_STORE + key); } catch { return null; } };
const cpWrite = (key, open) => { try { localStorage.setItem(CP_STORE + key, open ? '1' : '0'); } catch { /* storage is a convenience */ } };
const headingText = h4 => { const c = h4.querySelector(':scope > span'); return (c ? h4.textContent.replace(c.textContent, '') : h4.textContent).trim(); };
function openDetails(d, open) { if (d.open === open) return; d.__cpProgrammatic = open; d.open = open; }
function foldSection(sec) {
  const h4 = sec.firstElementChild, key = cpKey(headingText(h4));
  const d = document.createElement('details'); d.className = 'cp cp-' + key; d.dataset.cp = key;
  // The summary shows the heading; the section keeps its own, off screen and silent, so its text still reads whole.
  const sum = document.createElement('summary'); sum.append(h4.cloneNode(true)); h4.classList.add('cp-folded-h4'); h4.setAttribute('aria-hidden', 'true');
  sec.replaceWith(d); d.append(sum, sec);
  const saved = cpRead(key); openDetails(d, saved == null ? !CP_TAIL.includes(key) : saved === '1');
  return d;
}
// Sol's summary reads the review's own heading and state, refreshed whenever the review repaints inside.
function solSummary(d) {
  const sum = d.querySelector(':scope > summary'); if (!sum) return;
  const h4 = d.querySelector('.sr > h4') || d.querySelector('.cs-ask > h4, .cs-round > h4');
  // The heading's words in one truncating span, its state chip or count beside them.
  const label = h4 ? [...h4.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim() : 'Sol';
  const chips = h4 ? [...h4.children].map(c => c.outerHTML).join('') : '';
  const html = '<span class="cp-label">' + label.replace(/[&<>]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[ch])) + '</span>' + chips;
  if (sum.firstElementChild?.innerHTML !== html) { sum.innerHTML = '<h4 aria-level="3">' + html + '</h4>'; }
}
const solAlive = d => !!d.querySelector('.sr-progress, .sr-findings, .dk-solpend, .dk-sol, .sr [role="alert"]');
export function foldCompanion(host) {
  if (!host?.isConnected) return false;
  let changed = false;
  const loose = [...host.children].filter(el => !el.matches('details.cp'));
  const sol = loose.filter(el => el.matches(SOL_PARTS));
  // The chapter-level sections fold: the last section with each tail heading (the selection's own parts, a specimen
  // with its "Needed at", "Delivers" and its own checks, stay as they are: a card at the top).
  const sections = loose.filter(el => !sol.includes(el) && el.matches('section') && el.firstElementChild?.matches('h4'));
  const byKey = new Map(); for (const sec of sections) { const key = cpKey(headingText(sec.firstElementChild)); if (CP_TAIL.includes(key)) byKey.set(key, sec); }
  for (const sec of byKey.values()) { foldSection(sec); changed = true; }
  let solBox = host.querySelector(':scope > details.cp-sol');
  if (sol.length) {
    if (!solBox) { solBox = document.createElement('details'); solBox.className = 'cp cp-sol'; solBox.dataset.cp = 'sol'; solBox.append(document.createElement('summary')); sol[0].before(solBox); }
    // The review first (the chapter's), then the selection's assessment and the round (a way in by record).
    for (const el of [...sol].sort((a, b) => (b.matches('.sr') || !!b.querySelector(':scope > .sr')) - (a.matches('.sr') || !!a.querySelector(':scope > .sr')))) solBox.append(el);
    changed = true;
  }
  if (solBox) {
    solSummary(solBox);
    if (changed) { const saved = cpRead('sol'); openDetails(solBox, saved === '1' || (saved == null && solAlive(solBox))); }
  }
  // The tail, in order; a key the selection's own sections also use (its checks) names the chapter's by position: the last.
  if (changed) for (const key of CP_TAIL) { const all = host.querySelectorAll(':scope > details.cp-' + key), d = all[all.length - 1]; if (d && d !== host.lastElementChild) host.append(d); }
  return changed;
}
function watchCompanion(host) {
  // A model may redraw its docked companion after an observation opens its record list. Keep the reading position
  // through that redraw; a deliberate move elsewhere clears it. The list's status is a programmatic focus target.
  let readingFocus = null;
  host.addEventListener('focusin', e => {
    const target = e.target?.closest?.('[data-ins-focus="records"]');
    readingFocus = target?.closest?.('[data-ins-key]')?.dataset.insKey || null;
  });
  host.addEventListener('focusout', e => { if (e.relatedTarget?.isConnected) readingFocus = null; });
  document.addEventListener('pointerdown', e => { if (!host.contains(e.target)) readingFocus = null; }, true);
  host.addEventListener('toggle', e => {
    const d = e.target; if (!d?.matches?.('details.cp') || !d.dataset.cp) return;
    if (d.__cpProgrammatic !== undefined) { const was = d.__cpProgrammatic; d.__cpProgrammatic = undefined; if (was === d.open) return; }
    cpWrite(d.dataset.cp, d.open);
  }, true);
  if (typeof MutationObserver !== 'function') return;
  const mo = new MutationObserver(() => {
    try { foldCompanion(host); } catch (e) { console.warn('The companion could not be folded.', e?.message); }
    if (readingFocus && (document.activeElement === document.body || !document.activeElement?.isConnected)) {
      const sec = [...host.querySelectorAll('[data-ins-key]')].find(s => s.dataset.insKey === readingFocus);
      const target = sec?.querySelector('[data-ins-focus="records"]');
      if (target) target.focus({preventScroll: true}); else readingFocus = null;
    }
  });
  mo.observe(host, {childList: true, subtree: true});
  host.__cmFold = mo;
}
// The companion element in use for a model, without creating one: the column's host or the model's own panel.
export function companionOf(root) { const r = root && companions.get(root); return r?.host?.isConnected && r.host.__cmRoot === root ? r.host : root?.querySelector?.('.cm-panel') || null; }
// True while the companion is the shell's column: it is part of the frame, always open, and never a drawer.
export function isDocked(root) { return !!shellColumn(root); }
export const companionOpen = (root, open) => !!open || isDocked(root);
// A model leaving the page leaves nothing of its companion behind.
export function releaseCompanion(root) {
  const r = root && companions.get(root); if (!r) return;
  r.abort?.abort(); r.abort = null;
  if (r.host?.__cmRoot === root) { r.host.innerHTML = ''; r.host.__cmRoot = null; }
  r.host = null; root.classList.remove('cm-docked');
}
// The element a companion control belongs to, inside the model or in the column beside it.
export const inCompanion = el => !!el?.closest?.('.cm-panel, .cm-companion');

// ---------------------------------------------------------------- the companion's observations at any size
// Round 12 (G, GR-UX-04, GR-UX-08): "What the model shows" reads gaps and risks first, eight at a time, and its count
// says how many of how many ("8 of 23"); "Show all" lists every observation. An observation names at most five records
// and a count (fewNames, util.js) and carries the whole list as `records` ([id, label] pairs); its "Show all N" filters
// the section to that observation and lists every record it names, 50 at a time, each selecting its record through the
// view's own data-sel handling. The state is the page's, per view (`key`), and returns to the list when the observation
// is gone. The view draws each observation (`item`) and the closing note; nothing here writes.
export const INSIGHTS_SHOWN = 8;
const INSIGHT_PAGE = 50, insightViews = new Map(); // key → {all, item, note, state}
const insightRank = x => (x.kind === 'gap' ? 0 : x.kind === 'risk' ? 1 : 2);
export const orderInsights = list => list.map((x, i) => [x, i]).sort((a, b) => insightRank(a[0]) - insightRank(b[0]) || a[1] - b[1]).map(([x]) => x);
const insightKey = x => [x.kind, x.id || '', String(x.text || '').slice(0, 60)].join('|');
const fmtN = n => Number(n).toLocaleString('en-GB');
function insightsBody(v) {
  const {all, item, note, state} = v, n = all.length, focus = state.focus ? all.find(x => insightKey(x) === state.focus) : null;
  if (focus) {
    const rs = focus.records, upto = Math.min(rs.length, state.limit);
    return `<h4 aria-level="3">What the model shows<span>1 of ${fmtN(n)}</span></h4>${item(focus)}<p class="cm-ins-of" data-ins-focus="records" role="status" tabindex="-1">All ${fmtN(rs.length)} it names${upto < rs.length ? `, the first ${fmtN(upto)} shown` : ''}</p><ol class="cm-ins-all">${rs.slice(0, upto).map(([id, label]) => `<li>${id ? `<button type="button" data-sel="${esc(id)}">${esc(label)}</button>` : `<span>${esc(label)}</span>`}</li>`).join('')}</ol><p class="cm-ins-nav">${upto < rs.length ? `<button type="button" class="cm-mini" data-ins="more">Show the next ${fmtN(Math.min(INSIGHT_PAGE, rs.length - upto))} of ${fmtN(rs.length - upto)}</button>` : ''}<button type="button" class="cm-mini" data-ins="back">Every observation</button></p>${note}`;
  }
  const shown = state.all ? all : all.slice(0, INSIGHTS_SHOWN);
  const one = x => (x.records?.length > 5 ? `<div class="cm-insw">${item(x)}<button type="button" class="cm-mini" data-ins="filter" data-ins-k="${esc(insightKey(x))}" title="List every record this observation names">Show all ${fmtN(x.records.length)}</button></div>` : item(x));
  return `<h4 aria-level="3">What the model shows<span>${shown.length < n ? `${fmtN(shown.length)} of ${fmtN(n)}` : fmtN(n)}</span></h4>${shown.map(one).join('')}${n > INSIGHTS_SHOWN ? `<p class="cm-ins-nav"><button type="button" class="cm-mini" data-ins="${state.all ? 'fewer' : 'all'}" aria-expanded="${state.all}">${state.all ? `Show the first ${INSIGHTS_SHOWN}` : `Show all ${fmtN(n)}`}</button></p>` : ''}${note}`;
}
// The section: `list` the view's observations, `item(x)` its markup for one, `note` the closing line (markup).
export function insightsSection(list, {key, item, note = ''}) {
  if (!list?.length) { insightViews.delete(key); return ''; }
  const state = insightViews.get(key)?.state || {all: false, focus: null, limit: INSIGHT_PAGE};
  const v = {all: orderInsights(list), item, note, state};
  if (state.focus && !v.all.some(x => insightKey(x) === state.focus && x.records?.length)) { state.focus = null; state.limit = INSIGHT_PAGE; }
  insightViews.set(key, v);
  return `<section class="cm-insights" data-ins-key="${esc(key)}">${insightsBody(v)}</section>`;
}
// Folded in the docked companion, the section's heading is also its summary's: both follow a redraw in place.
function refoldInsights(sec) {
  const d = sec.parentElement, h4 = sec.firstElementChild, sum = d?.matches?.('details.cp') ? d.querySelector(':scope > summary') : null;
  if (!sum || !h4?.matches('h4')) return;
  sum.replaceChildren(h4.cloneNode(true)); h4.classList.add('cp-folded-h4'); h4.setAttribute('aria-hidden', 'true');
}
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') document.addEventListener('click', e => {
  const b = e.target?.closest?.('[data-ins]'), sec = b?.closest('[data-ins-key]'), v = sec && insightViews.get(sec.dataset.insKey);
  if (!v) return;
  const a = b.dataset.ins, s = v.state, k = b.dataset.insK || s.focus;
  if (a === 'all') s.all = true; else if (a === 'fewer') s.all = false;
  else if (a === 'filter') { s.focus = b.dataset.insK; s.limit = INSIGHT_PAGE; } else if (a === 'back') { s.focus = null; s.limit = INSIGHT_PAGE; } else if (a === 'more') s.limit += INSIGHT_PAGE;
  // An observation opened from beyond the first eight keeps the whole list when the reader comes back to it.
  if (a === 'back' && k && !v.all.slice(0, INSIGHTS_SHOWN).some(x => insightKey(x) === k)) s.all = true;
  const shown = sec.querySelectorAll('.cm-ins-all li').length;
  sec.innerHTML = insightsBody(v); refoldInsights(sec);
  const to = a === 'filter' ? sec.querySelector('.cm-ins-of') : a === 'back' ? [...sec.querySelectorAll('[data-ins="filter"]')].find(x => x.dataset.insK === k) : a === 'more' ? sec.querySelectorAll('.cm-ins-all li')[shown]?.firstElementChild : sec.querySelector('[data-ins="all"],[data-ins="fewer"]');
  to?.focus?.();
});

// "Open in Work": the selected record opens on this chapter's Work tab through the shell's own selection;
// a record of another chapter opens on that chapter's Work tab.
export function openInWorkHTML(id, {chapter = null, home = null, title = '', section = '', label = ''} = {}) {
  if (!id || /^(G:|LINK:|HOLE:|EMPTY:|system:|party:|unplaced:|lane:|family:|pool:)/.test(String(id))) return '';
  const other = home && chapter && Number(home) !== Number(chapter);
  return `<p class="cm-open-work"><button type="button" class="cm-btn" data-cm-open-work="${esc(id)}"${other ? ` data-cm-chapter="${esc(home)}"` : ''}${section ? ` data-cm-section="${esc(section)}"` : ''} title="${esc((title ? title + ' · ' : '') + (label || (other ? 'its Chapter ' + home + ' editor' : 'its editor on this chapter’s Work tab')))}">${esc(label || (other ? 'Open in Chapter ' + home + ' Work' : 'Open in Work'))} <span aria-hidden="true">→</span></button></p>`;
}
export function openInWork(id, chapter = null, section = '') {
  const here = Number(new URLSearchParams(location.search).get('chapter')) || null, target = Number(chapter) || here;
  const href = projectURL(`/?chapter=${target || 4}&tab=work&object=${encodeURIComponent(id)}${section ? '&section=' + encodeURIComponent(section) : ''}`);
  if (!window.aiwRoute?.(href)) location.href = href;
}
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') document.addEventListener('click', e => {
  const b = e.target?.closest?.('[data-cm-open-work]'); if (!b) return;
  e.preventDefault(); e.stopPropagation(); openInWork(b.dataset.cmOpenWork, b.dataset.cmChapter || null, b.dataset.cmSection || '');
}, true);

// Place a floating tip near the pointer, inside the window.
// One hover reading everywhere (round-2 I2-11): when the hovered element names a saved record, the rule-based reading
// (worst open check, worst vital of the parts it touches, the knowledge rule that fired) is appended to the chapter's own
// tooltip once the Brain modules are available. They load on demand, so Chapters 1–3 keep their lighter start.
let hoverModule = null;
const hoverReadingFor = () => (hoverModule ||= Promise.resolve({hoverTipHTML}));
function appendHoverReading(box, e) {
  const t = e?.target?.closest?.('[data-nt-node],[data-card],[data-sel],[data-id]');
  const id = t?.dataset?.ntNode || t?.dataset?.card || t?.dataset?.sel || t?.dataset?.id || null;
  if (!id || /^G:/.test(id) || box.querySelector('.tip-brain')) return;
  const doc = currentProject(); if (!doc) return;
  const token = box.dataset.tipFor = id;
  hoverReadingFor().then(m => { if (box.hidden || box.dataset.tipFor !== token || box.querySelector('.tip-brain')) return; const extra = m.hoverTipHTML(doc, id); if (extra) box.insertAdjacentHTML('beforeend', extra); }).catch(() => { /* the reading is an extra; the tooltip stands without it */ });
}
export function placeTip(box, e) {
  appendHoverReading(box, e);
  const r = box.getBoundingClientRect();
  box.style.left = Math.min(window.innerWidth - r.width - 10, e.clientX + 14) + 'px';
  box.style.top = Math.min(window.innerHeight - r.height - 10, e.clientY + 16) + 'px';
}

// Drawing helpers the chapter models used to copy byte for byte (audit F2-09).
// The order of modules and parts a person arranged in the Chapter 4 anatomy, which the later chapter models follow.
export function anatomyOrder() { try { return JSON.parse(localStorage.getItem(projectPreferenceKey('aiw-anatomy-v1')) || '{}').order || {}; } catch { return {}; } }
// The one rounded-corner path (an SVG path through orthogonal [x, y] points, each corner rounded by up to `r`) and the
// classed arrowhead polygon (fill from CSS tokens) live in the pure wires module (round 10, V1); re-exported here.
export {roundPath, headPath} from './wire-merge.js';
export {connectionAttrs} from './wire-merge.js';
// An arrowhead <marker> filled with `fill` (an attribute).
export const arrowMarker = (id, fill) => `<marker id="${esc(id)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1 9 5 1 9z" fill="${fill}"/></marker>`;
// The CSS class for a data classification label.
// A definition not classified yet (round 12, DM-06) is drawn as unclassified, never as public.
export const classificationClass = c => (/restricted|secret/i.test(c) ? 'restricted' : /confidential|personal|sensitive/i.test(c) ? 'confidential' : /internal/i.test(c) ? 'internal' : c && !/^not classified/i.test(c) ? 'public' : 'unclassified');
// ' lit' / ' dim' / '' for a card while a highlight (hl.on, hl.cards) is active.
export const cardHighlight = (hl, id) => (hl.on ? (hl.cards.has(id) ? ' lit' : ' dim') : '');
// ' lit' / ' dim' / '' for an element while a highlight (hl.on, hl.ids) is active, and a priority chip.
export const idHighlight = (hl, id) => (hl.on ? (hl.ids.has(id) ? ' lit' : ' dim') : '');
export const priorityChip = p => `<i class="um-prio ${esc(String(p).toLowerCase())}">${esc(p)}</i>`;
