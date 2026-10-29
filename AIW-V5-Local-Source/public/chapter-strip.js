// The chapter strip (rc41, W2): one component at the top of every tab of a chapter — the Work stages, the Validate
// readings, the Output documents, the Model views — so the four tabs read as one layout. An item is a button (the
// chapter's own handler reads its data-* attributes) with its name as its accessible name, and, beside it, a meta the
// screen reader hears as its description: the purpose, a meter and the counts. The meter is the same everywhere
// (the track is what is recorded, the left fill what a person confirmed, the right fill what the checks hold open),
// read from the saved records through work-records.js kindsState, never from a visit. The current item carries the
// chapter's accent (theme.css --layer-*) and aria-current; ← → Home End move along the strip; on a phone the strip
// scrolls sideways and the page never does. The Model's view rail keeps its own flat form (its buttons are the
// items: instrument-tray.js) and shares the classes, the keyboard model and the accent. Presentation only: nothing
// here writes a record.
import {esc} from './html-escape.js';

const share = (n, total) => (total ? Math.round(100 * Math.min(n, total) / total) : 0);
// The meter and counts of a kindsState reading, for an item that has records: what is recorded, confirmed, to fix
// and to confirm, or the caller's word for nothing ("start here", "records needed").
// A reading of one record says its words without the number ("recorded · to confirm"); a count above one keeps its
// number (Chapter 11's final checks on one record). With nothing recorded, the chapter's open checks (where they are not
// kept per record) still say what is open, and the meter's open fill is whole.
export function stripReading(st, empty = 'nothing recorded yet') {
  if (!st) return {};
  const n = k => (st.recorded === 1 && Number(st[k] || 0) <= 1 ? '' : Number(st[k] || 0).toLocaleString('en-GB') + ' '), open = [st.fix ? n('fix') + 'to fix' : '', st.confirm ? n('confirm') + 'to confirm' : ''];
  const counts = (st.recorded ? [n('recorded') + 'recorded', st.confirmed ? n('confirmed') + 'confirmed' : '', ...open] : [empty, ...open]).filter(Boolean).join(' · ');
  return {state: st.state, ok: share(st.confirmed, st.recorded), open: st.recorded ? share(st.open, st.recorded) : st.open ? 100 : 0, counts};
}
// One item: {id, title, purpose, state, ok, open, counts, current, step, attrs, tail, cls, hidden, disabled, href}.
// `attrs` is the button's own attribute string (the chapter's handler contract, escaped by the caller), written before
// the ARIA attributes; `tail` after them (the order the chapters' suites pin byte for byte).
function itemHTML(item, i, {currentValue, tab}) {
  const current = !!item.current, hasMeter = item.state != null;
  const description = [item.purpose, item.counts].filter(Boolean).join(' · ');
  const tag = item.href ? 'a' : 'button', type = item.href ? ' href="' + esc(item.href) + '"' : ' type="button"';
  const button = '<' + tag + type + (item.attrs ? ' ' + item.attrs : '') + ' aria-pressed="' + current + '"' + (current ? ' aria-current="' + esc(currentValue) + '"' : '') + ' aria-label="' + esc(item.title) + '"' + (description ? ' aria-description="' + esc(description) + '"' : '') + (item.tail ? ' ' + item.tail : '') + ' data-chapter-strip-step="' + (i + 1) + '"' + (item.purpose ? ' data-chapter-strip-purpose="' + esc(item.purpose) + '"' : '') + (item.disabled ? ' disabled' : '') + '>' + esc(item.title) + '</' + tag + '>';
  const meter = hasMeter ? '<span class="chapter-strip-meter" data-chapter-strip-meter="' + esc(item.state) + '" style="--strip-ok:' + (item.ok || 0) + '%;--strip-open:' + (item.open || 0) + '%"><i class="chapter-strip-ok"></i><i class="chapter-strip-open"></i></span>' : '';
  const meta = '<span class="chapter-strip-meta" aria-hidden="true">' + (item.purpose ? '<small class="chapter-strip-purpose">' + esc(item.purpose) + '</small>' : '') + meter + (item.counts ? '<small class="chapter-strip-count' + (item.countCls ? ' ' + esc(item.countCls) : '') + '">' + esc(item.counts) + '</small>' : '') + '</span>';
  return '<li class="chapter-strip-item' + (item.cls ? ' ' + esc(item.cls) : '') + '" data-chapter-strip-item="' + esc(item.id) + '"' + (hasMeter ? ' data-chapter-strip-state="' + esc(item.state) + '"' : '') + (current ? ' data-chapter-strip-current="true"' : '') + (item.hidden ? ' hidden' : '') + (item.itemAttrs ? ' ' + item.itemAttrs : '') + ' data-chapter-strip-tab="' + esc(tab) + '">' + button + meta + '</li>';
}
// The strip: a nav of items. `cls` and `listCls` carry the tab's own classes (the suites' selectors); `after` is
// markup that follows the list inside the nav (Validate's help and its "Create focused case").
export function chapterStripHTML({tab, chapter, label, items, cls = '', listCls = '', attrs = '', currentValue = 'true', after = ''}) {
  scheduleReveal();
  return '<nav class="chapter-strip' + (cls ? ' ' + esc(cls) : '') + '" data-chapter-strip="' + esc(tab) + '" data-chapter-accent="' + esc(String(chapter)) + '" aria-label="' + esc(label) + '"' + (attrs ? ' ' + attrs : '') + '><ol class="chapter-strip-list' + (listCls ? ' ' + esc(listCls) : '') + '">' + items.map((item, i) => itemHTML(item, i, {currentValue, tab})).join('') + '</ol>' + after + '</nav>';
}
// The one state line: "N records · N confirmed · N to fix · N to confirm" (work-records.js kindsState), with a dot in
// the state's colour, used by Work's head, Validate's summary, Output's hero and the Model footer.
export function chapterStateHTML(st, {chapter, cls = '', attrs = '', tag = 'p'} = {}) {
  if (!st) return '';
  return '<' + tag + ' class="chapter-state' + (cls ? ' ' + esc(cls) : '') + '" data-chapter-state="' + esc(st.state) + '" data-chapter-accent="' + esc(String(chapter)) + '"' + (attrs ? ' ' + attrs : '') + '>' + esc(st.line) + '</' + tag + '>';
}
// Update one item's counts (and state) after a reading that arrives later than the strip (Validate's Model integrity).
export function setStripCount(strip, id, counts, state = null) {
  const item = strip?.querySelector?.('[data-chapter-strip-item="' + CSS.escape(id) + '"]'); if (!item) return;
  let count = item.querySelector('.chapter-strip-count');
  if (!count) { const meta = item.querySelector('.chapter-strip-meta'); if (!meta) return; count = document.createElement('small'); count.className = 'chapter-strip-count'; meta.append(count); }
  count.textContent = counts;
  if (state) item.setAttribute('data-chapter-strip-state', state); else item.removeAttribute('data-chapter-strip-state');
  const button = item.querySelector('button, a'), purpose = button?.dataset.chapterStripPurpose;
  if (button) button.setAttribute('aria-description', [purpose, counts].filter(Boolean).join(' · '));
}
// The items a strip moves between: its own buttons and links that can take focus.
const ITEMS = '.chapter-strip-item > button, .chapter-strip-item > a[href], button.chapter-strip-item';
const itemsOf = strip => [...strip.querySelectorAll(ITEMS)].filter(b => !b.disabled && !b.hidden && !b.closest('[hidden]'));
// Bring the current item into the strip's view without moving the page (a phone's strip scrolls sideways).
export function revealStripCurrent(root = document) {
  for (const strip of root.querySelectorAll?.('.chapter-strip') || []) {
    const box = strip.matches('.chapter-strip-flat') ? strip : strip.querySelector('.chapter-strip-list') || strip;
    const current = strip.querySelector('[data-chapter-strip-current] > :is(button, a), [aria-pressed="true"]');
    if (!current || box.scrollWidth <= box.clientWidth + 1) continue;
    const r = current.getBoundingClientRect(), f = box.getBoundingClientRect();
    if (r.left < f.left + 2) box.scrollLeft += r.left - f.left - 2; else if (r.right > f.right - 22) box.scrollLeft += r.right - f.right + 22;
  }
}
let revealPending = false;
function scheduleReveal() {
  if (typeof requestAnimationFrame !== 'function' || revealPending) return;
  revealPending = true; requestAnimationFrame(() => { revealPending = false; revealStripCurrent(); });
}
function onKey(e) {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  const t = e.target; if (!(t instanceof Element)) return;
  const strip = t.closest('.chapter-strip'); if (!strip || t.closest('input, textarea, select, [contenteditable]')) return;
  const items = itemsOf(strip), i = items.indexOf(t.closest(ITEMS)); if (i < 0) return;
  const j = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : Math.min(items.length - 1, Math.max(0, i + (e.key === 'ArrowRight' ? 1 : -1)));
  e.preventDefault(); items[j]?.focus();
}
if (typeof document !== 'undefined' && !globalThis.__aiwChapterStrip) { globalThis.__aiwChapterStrip = true; document.addEventListener('keydown', onKey); }
