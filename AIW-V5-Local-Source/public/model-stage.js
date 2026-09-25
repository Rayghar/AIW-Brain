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
      root.classList.toggle('cm-far', z < 0.62);
      cams.set(key, {...cam, sw: box().w});
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
    }
  };
  return api;
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
