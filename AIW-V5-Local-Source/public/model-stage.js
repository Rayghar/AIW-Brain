// Shared canvas behaviour for the chapter Model views: the world pans and zooms under sticky
// column heads (top) and a sticky label rail (left). Expects the .cm shell markup:
// .cm-stage > .cm-world, .cm-heads > .cm-heads-in, .cm-rail > .cm-rail-in, .cm-corner.
export function modelStage(root, {headHeight, railWidth, floor = () => (window.innerWidth < 700 ? 0.6 : 0.7), onHover = null, noPan = '.cm-frame'} = {}) {
  const cam = {z: 1, px: 0, py: 0}, cams = new Map();
  let L = null, key = '';
  const q = s => root.querySelector(s);
  const box = () => { const st = q('.cm-stage'); return {w: st.clientWidth || 900, h: st.clientHeight || 520}; };
  const api = {
    cam, box,
    use(layout, k) { L = layout; key = k; },
    apply() {
      if (!L) return;
      const {z, px, py} = cam, headH = headHeight() * z, rw = railWidth(L) * z;
      q('.cm-world').style.transform = `translate(${px}px,${py}px) scale(${z})`;
      q('.cm-heads-in').style.transform = `translate(${px}px,0) scale(${z})`;
      q('.cm-heads').style.height = Math.round(headH) + 'px';
      q('.cm-rail-in').style.transform = `translate(0,${py}px) scale(${z})`;
      q('.cm-rail').style.width = Math.round(rw) + 'px';
      const corner = q('.cm-corner'); corner.style.width = Math.round(rw) + 'px'; corner.style.height = Math.round(headH) + 'px';
      // Below the phone's first fit (0.6) the lens lines would vanish as soon as the model opened.
      root.classList.toggle('cm-far', z < 0.58);
      // Where the world runs past the stage, its edge says so and can be nudged.
      const {w, h} = box(), stage = q('.cm-stage');
      stage.classList.toggle('cm-more-r', L.W * z + px > w + 6);
      stage.classList.toggle('cm-more-l', px < -6);
      stage.classList.toggle('cm-more-b', L.H * z + py > h + 6);
      stage.classList.toggle('cm-more-t', py < -6);
      cams.set(key, {...cam, sw: box().w});
    },
    // Nudge the camera by most of a screen in one direction.
    nudge(dir) {
      const {w, h} = box();
      if (dir === 'r') cam.px -= w * 0.8; if (dir === 'l') cam.px += w * 0.8; if (dir === 'b') cam.py -= h * 0.8; if (dir === 't') cam.py += h * 0.8;
      api.clamp(); const world = q('.cm-world'); world.classList.add('cm-glide'); api.apply(); setTimeout(() => world.classList.remove('cm-glide'), 420);
    },
    clamp() {
      if (!L) return;
      const {w, h} = box(), ww = L.W * cam.z, wh = L.H * cam.z;
      cam.px = ww <= w ? 0 : Math.max(w - ww - 8, Math.min(0, cam.px));
      cam.py = wh <= h ? 0 : Math.max(h - wh - 8, Math.min(0, cam.py));
    },
    fit() {
      const saved = cams.get(key), {w} = box();
      if (saved && Math.abs((saved.sw || 0) - w) < 4) { Object.assign(cam, {z: saved.z, px: saved.px, py: saved.py}); api.clamp(); return; }
      cam.z = Math.max(floor(), Math.min(1.05, (w - 4) / L.W)); cam.px = 0; cam.py = 0; api.clamp();
    },
    fitAll() { const {w, h} = box(); cam.z = Math.max(0.3, Math.min(1.05, (w - 4) / L.W, (h - 4) / L.H)); cam.px = 0; cam.py = 0; api.clamp(); api.apply(); },
    zoomAt(z, mx, my) { const z0 = cam.z; z = Math.max(0.3, Math.min(1.8, z)); cam.px = mx - (mx - cam.px) * z / z0; cam.py = my - (my - cam.py) * z / z0; cam.z = z; api.clamp(); api.apply(); },
    // Bring a world box into view below the heads and right of the rail, gliding there.
    reveal(x, y, w, h) {
      const {w: sw, h: sh} = box(), z = cam.z, left = railWidth(L) * z + 8, top = headHeight() * z + 8, sx = x * z + cam.px, sy = y * z + cam.py;
      if (sx >= left && sx + w * z <= sw && sy >= top && sy + h * z <= sh - 10) return;
      cam.px += Math.min(0, sw - 20 - (sx + w * z)) + Math.max(0, left - sx);
      cam.py += (top + (sh - top) * 0.4) - (sy + h * z / 2);
      api.clamp();
      const world = q('.cm-world'); world.classList.add('cm-glide'); api.apply(); setTimeout(() => world.classList.remove('cm-glide'), 420);
    },
    bind() {
      const stage = q('.cm-stage');
      let drag = null, moved = false;
      stage.addEventListener('pointerdown', e => { if (e.button !== 0 || e.target.closest('button,a,select,input,.cm-zoom,.cm-key,' + noPan)) return; drag = {x: e.clientX, y: e.clientY, px: cam.px, py: cam.py}; moved = false; });
      window.addEventListener('pointermove', e => {
        if (!root.isConnected) return;
        if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) { moved = true; stage.classList.add('panning'); } if (moved) { cam.px = drag.px + dx; cam.py = drag.py + dy; api.clamp(); api.apply(); } return; }
        onHover?.(e);
      });
      window.addEventListener('pointerup', () => { if (!drag) return; drag = null; stage.classList.remove('panning'); if (moved) { root.dataset.suppress = '1'; setTimeout(() => { delete root.dataset.suppress; }, 50); } });
      // Focusing a card can scroll the clipped stage itself; the camera alone moves the world.
      stage.addEventListener('scroll', () => { if (stage.scrollTop || stage.scrollLeft) { stage.scrollTop = 0; stage.scrollLeft = 0; } });
      // Keyboard focus moves the camera to the card, so tabbing through a model never loses sight of it.
      stage.addEventListener('focusin', e => {
        const el = e.target.closest?.('.cm-html > [style]');
        if (!el || !L || drag) return;
        const n = k => parseFloat(el.style[k]) || 0;
        if (el.style.left && el.style.top) api.reveal(n('left'), n('top'), n('width') || el.offsetWidth, n('height') || el.offsetHeight);
      });
      stage.addEventListener('wheel', e => {
        e.preventDefault();
        const r = stage.getBoundingClientRect();
        if (e.ctrlKey || e.metaKey) api.zoomAt(cam.z * Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top);
        else { cam.px -= e.shiftKey ? e.deltaY : e.deltaX; cam.py -= e.shiftKey ? 0 : e.deltaY; api.clamp(); api.apply(); }
      }, {passive: false});
      // The edges nudge the camera; the arrow keys pan it when the canvas itself has focus.
      stage.addEventListener('click', e => { const ed = e.target.closest('.cm-edge'); if (ed) { e.stopPropagation(); api.nudge(ed.dataset.edge); } });
      stage.addEventListener('keydown', e => {
        if (e.target !== stage || !L) return;
        const step = e.shiftKey ? 240 : 60, k = e.key;
        if (k === 'ArrowLeft') cam.px += step; else if (k === 'ArrowRight') cam.px -= step; else if (k === 'ArrowUp') cam.py += step; else if (k === 'ArrowDown') cam.py -= step; else return;
        e.preventDefault(); api.clamp(); api.apply();
      });
    }
  };
  return api;
}

// The stage's four edges, drawn only where the world runs past them.
export const edgesHTML = () => ['l', 'r', 't', 'b'].map(d => `<button type="button" class="cm-edge cm-edge-${d}" data-edge="${d}" tabindex="-1" aria-label="${{l: 'More to the left', r: 'More to the right', t: 'More above', b: 'More below'}[d]}">${{l: '‹', r: '›', t: '˄', b: '˅'}[d]}</button>`).join('');
// The key and the zoom controls, in the footer beside the walk: never over the canvas.
export const toolsHTML = (k, keyLabel = 'Key') => `<div class="cm-tools"><div class="cm-key cm-min"><button type="button" class="cm-kt" data-${k}="key" aria-expanded="false">${keyLabel}</button><div class="cm-legend" role="region" aria-label="Key"></div></div><div class="cm-zoom"><button type="button" data-${k}="zout" aria-label="Zoom out">−</button><button type="button" data-${k}="zin" aria-label="Zoom in">+</button><button type="button" data-${k}="fit" aria-label="Fit the width" title="Fit the width"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button></div></div>`;

// The companion opens as a column on a wide window and as a drawer on a narrow one, unless the
// reader has chosen for this project.
export function defaultPanel(saved) { return typeof saved === 'boolean' ? saved : window.innerWidth > 1200; }
// The companion toggle says what it does in each state, and how many observations wait behind it.
export function panelToggle(root, selector, open, count = 0) {
  const b = root.querySelector(selector); if (!b) return;
  b.setAttribute('aria-pressed', String(open));
  b.setAttribute('aria-label', open ? 'Hide the companion panel' : `Show the companion panel${count ? ` · ${count} observation${count === 1 ? '' : 's'}` : ''}`);
  b.title = open ? 'Hide the companion' : 'Show the companion';
  let badge = b.querySelector('.cm-badge');
  if (!open && count) { if (!badge) { badge = document.createElement('i'); badge.className = 'cm-badge'; b.append(badge); } badge.textContent = String(count); }
  else badge?.remove();
}
// A live status is announced only when it changes, not on every redraw.
export function setState(root, text) { const el = root.querySelector('.cm-state'); if (el && el.textContent !== text) el.textContent = text; }
// The page hears what the model selected through the URL's object=, whichever path selected it.
export function announceObject(target) {
  if (!window.history) return;
  const url = new URL(location.href);
  if (target) url.searchParams.set('object', target); else url.searchParams.delete('object');
  window.history.replaceState(window.history.state, '', url.pathname + url.search);
}
// A redraw replaces the canvas's elements. The keyboard's place is kept by what it pointed at: the
// element with the same data attributes is focused again, without scrolling.
export function focusKey(root) {
  const a = document.activeElement; if (!a || a === document.body || !root.contains(a)) return null;
  const ds = Object.entries(a.dataset); return ds.length ? {el: a, tag: a.tagName, ds} : null;
}
export function refocus(root, key) {
  if (!key || key.el.isConnected) return;
  const attr = k => 'data-' + k.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
  const el = [...root.querySelectorAll(`${key.tag}[${attr(key.ds[0][0])}]`)].find(e => key.ds.every(([k, v]) => e.dataset[k] === v));
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

// Size a chapter model to the space left in the window below it.
export function sizeModel(root, expandedClass) {
  if (!root) return;
  const expanded = document.body.classList.contains(expandedClass);
  const top = root.getBoundingClientRect().top, footer = document.querySelector('.footer, .r-footer')?.offsetHeight || 0;
  const h = expanded ? window.innerHeight - 16 : Math.max(window.innerWidth < 700 ? 640 : 560, window.innerHeight - Math.max(0, top) - footer - 16);
  root.style.setProperty('--cm-h', Math.round(h) + 'px');
}

// Place a floating tip near the pointer, inside the window.
export function placeTip(box, e) {
  const r = box.getBoundingClientRect();
  box.style.left = Math.min(window.innerWidth - r.width - 10, e.clientX + 14) + 'px';
  box.style.top = Math.min(window.innerHeight - r.height - 10, e.clientY + 16) + 'px';
}
