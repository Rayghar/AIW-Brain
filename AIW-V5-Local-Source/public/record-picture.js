// The selected record’s neighbourhood is available on demand inside its Connections disclosure.
// The Model route and shared notation remain unchanged; opening it never writes a record.
import {recordPicture, recordPictureHTML, RECORD_PICTURE} from './notation-view.js';
import {currentProject, projectURL} from './project-context.js';
// The picture is drawn inside the shell, which preloads Sol's panel (brain-context-ui.js, and with it model-stage.js,
// the marks and the record fields) before its first render: naming it here tells the bundler so, and keeps those
// chunks whole — the record picture adds one script of its own instead of splitting the shell's (client-bundle.mjs).
import './brain-context-ui.js';

// The record on the Model tab, through the shell's route: the address names the view and the object, which the chapter
// model takes as its selection.
export function openRecordOnModel(chapter, id, view = 'diagram') {
  const href = projectURL(`/?chapter=${encodeURIComponent(chapter)}&tab=model&model=${encodeURIComponent(view)}&object=${encodeURIComponent(id)}`);
  if (!window.aiwRoute?.(href)) location.href = href;
}

// The shell mounts it on the Work tab's companion with one line (app.js render): `get` names the chapter and the
// selected record; the picture follows each later rewrite of the companion (a new selection) by itself.
let watched = null, observer = null, getState = null;
const togglePicture = event => { if (event.target?.matches?.('[data-card-section="connections"]')) draw(); };
export function mountRecordPicture(host, get) {
  getState = typeof get === 'function' ? get : null;
  if (!host || typeof MutationObserver !== 'function') return;
  if (watched !== host) {
    observer?.disconnect(); watched?.removeEventListener('toggle', togglePicture, true); watched = host;
    host.addEventListener('toggle', togglePicture, true);
    observer = new MutationObserver(() => draw()); observer.observe(host, {childList: true, subtree: true});
  }
  draw();
}
function draw() {
  const host = watched; if (!host?.isConnected || !getState || host.classList.contains('model-companion')) return;
  const slot = host.querySelector('[data-record-picture-slot]');
  if (!slot || !slot.closest('details')?.open) return;
  const {chapter, id} = getState() || {}, p = currentProject(), fig = slot.querySelector('.rp');
  const width = Math.max(200, Math.min(RECORD_PICTURE.W, (host.clientWidth || RECORD_PICTURE.W + 32) - 32)), key = [p?.id, p?.contentVersion, p?.updatedAt, chapter, id, width].join('|');
  if (fig && fig.dataset.rpKey === key) return;
  let R = null; try { R = recordPicture(p, Number(chapter), id, {width}); } catch (e) { console.warn('The record picture could not be drawn.', e?.message); }
  fig?.remove(); if (!R) return;
  slot.insertAdjacentHTML('afterbegin', recordPictureHTML(R));
  const el = slot.querySelector('.rp'); if (!el) return;
  el.dataset.rpKey = key;
  const open = e => { e.preventDefault(); openRecordOnModel(R.chapter, R.id, R.view); };
  el.addEventListener('click', open);
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(e); });
}
