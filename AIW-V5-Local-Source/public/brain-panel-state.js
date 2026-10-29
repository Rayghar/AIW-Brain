// View preferences only. Draft text and architectural decisions keep their existing stores.
const quote = value => String(value).replace(/["\\]/g, '\\$&').replace(/[\n\r\f]/g, ch => '\\' + ch.charCodeAt(0).toString(16) + ' ');
const detailKey = el => el.querySelector(':scope > summary')?.textContent.trim();
export function capturePanelPlace(panel, key) {
  if (!panel || panel.dataset.placeKey !== key) return null;
  const active = panel.contains(document.activeElement) ? document.activeElement : null;
  const attributes = active ? [...active.attributes].filter(a => a.name === 'id' || a.name === 'name' || a.name.startsWith('data-')) : [];
  return {key, scroll: panel.querySelector('.brain-content')?.scrollTop || 0,
    details: new Map([...panel.querySelectorAll('details')].map(el => [detailKey(el), el.open])),
    proposalView: panel.querySelector('[data-proposals]')?.__view,
    focus: attributes.length ? active.tagName.toLowerCase() + attributes.map(a => `[${a.name}="${quote(a.value)}"]`).join('') : '',
    selection: active && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null};
}
export function restorePanelPlace(panel, key, place) {
  panel.dataset.placeKey = key;
  if (!place || place.key !== key) return;
  for (const el of panel.querySelectorAll('details')) if (place.details.has(detailKey(el))) el.open = place.details.get(detailKey(el));
  const slot = panel.querySelector('[data-proposals]');
  if (slot && place.proposalView) slot.__view = place.proposalView;
  const active = place.focus && panel.querySelector(place.focus);
  if (active) { active.focus({preventScroll:true}); if (place.selection && active.setSelectionRange) active.setSelectionRange(...place.selection); }
  const content = panel.querySelector('.brain-content');
  if (content) content.scrollTop = place.scroll;
}
export function mountPanelResize(panel, preferenceKey) {
  const handle = panel.querySelector('[data-brain-resize]');
  if (!handle) return;
  let width;
  try { width = Number(localStorage.getItem(preferenceKey)); } catch { /* optional preference */ }
  const maximum = () => Math.max(360, Math.min(760, window.innerWidth - 48));
  const set = (value, persist = false) => {
    width = Math.max(360, Math.min(maximum(), value || 480));
    document.documentElement.style.setProperty('--brain-pane-width', width + 'px');
    handle.setAttribute('aria-valuenow', String(Math.round(width)));
    handle.setAttribute('aria-valuemax', String(maximum()));
    if (persist) try { localStorage.setItem(preferenceKey, String(width)); } catch { /* optional preference */ }
  };
  set(width);
  handle.onkeydown = e => {
    const next = e.key === 'ArrowLeft' ? width + 32 : e.key === 'ArrowRight' ? width - 32 : e.key === 'Home' ? 360 : e.key === 'End' ? maximum() : null;
    if (next !== null) { e.preventDefault(); set(next, true); }
  };
  handle.onpointerdown = e => {
    if (e.button !== 0) return;
    e.preventDefault(); handle.focus({preventScroll:true}); handle.setPointerCapture?.(e.pointerId);
    const start = e.clientX, initial = width;
    handle.onpointermove = move => set(initial + start - move.clientX);
    const end = () => { set(width, true); handle.onpointermove = null; handle.onpointerup = null; handle.onpointercancel = null; };
    handle.onpointerup = end; handle.onpointercancel = end;
  };
}
