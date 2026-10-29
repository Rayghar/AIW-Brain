// The field spark (round 2, I2-12; audit/round2/04_BRAIN.md §4, 06_ARCHIVE_ADOPTION.md §6.1): a small click-only
// button beside each free-text field of the editors of the Chapter 1–3 page apps and the Chapter 4–11 studios. It
// opens a popover with three bands, always in this order: "Stated" (a value copied from a record the project holds,
// with that record), "Inferred" (a value the chapter guide or the journey implies, asked as a question) and "Sol draft"
// (a server-recorded model draft with its run id, packet stamp and prompt pin; only when a provider is configured, and
// only when the person asks). The words are the one provenance vocabulary (provenance-words.js, round 11): stated,
// inferred, Sol draft, edited; a reopened editor shows the provenance its record already carries, and a dismissal is
// kept with the project (coauthor.disposition, with its one-line reason), so a dismissed offer is not offered again.
//
// A spark is an invitation on a field, never a writer. Accepting fills the input in the open form and records the
// suggestion in the form's pending `solSuggestions`; nothing reaches the project until the person submits the form
// through the chapter's ordinary command, which carries that provenance to the server (worker.js validates it and
// keeps it on the record as provenance.suggestions[]). A dismissed offer records nothing. Numeric, typed and linked
// fields get no spark; owners, identifiers, evidence and the basis of a number get no Sol draft. "Fill empty fields
// from your project" fills only empty fields, only from the first band, lists what it filled and offers one Undo.
//
// Each studio, and each Chapter 1–3 page app, makes one call, sparkStudio(), when it is created: it names its dialog,
// how to read the record being edited and how to open an editor for a record, so Proposals (coauthor-ui.js) can open
// the editor with a field prefilled. Mounting follows the studio's dialogs as they open.
//
// Bundle note (F2-19): this module, the rules and record-fields.js are imported by the eight studios and the three
// Chapter 1–3 page apps, so they sit in one chunk those routes share (one script file; about 69 KB of code on each
// Chapter 1–3 route, within its budget, measured on 2026-10-01). Sol's panel lives in another chunk; the two meet
// through window.aiwFieldSpark (set here: the editors, the fill action and the rules) and window.aiwSolBridge (set by
// coauthor-ui.js: Sol's connection status, its exact wording and the reading of a pending run's step), instead of
// importing each other.
import {FORM_IDS, fieldOf} from './record-fields.js';
import {esc} from './html-escape.js';
import {projectURL} from './project-context.js';
import {RECORD_COLLECTIONS, LINK_FIELDS, commandForForm, supported, sparkFields, draftable, fieldOffers, openSuggestions, dismissedIds, recordOf, chapterOf, maxLengthOf} from './field-suggestions.js';
import {provenanceWord} from './provenance-words.js';

// The rules this module and Sol's panel read (a plain object, not a module namespace: see the bundle note above).
const rules = {RECORD_COLLECTIONS, commandForForm, supported, sparkFields, draftable, fieldOffers, openSuggestions, dismissedIds, recordOf, chapterOf, maxLengthOf, fieldOf};

// Sol's connection as the panel reads it (brain-reasoning-ui.js through coauthor-ui.js); until the panel's module has
// loaded, the band says it is checking.
const sol = () => (typeof window !== 'undefined' && window.aiwSolBridge) || null;
const solStatus = () => sol()?.status() || {checked: false, connected: false};
const solStatusLine = () => sol()?.line() || 'Checking Sol’s connection…';
const pinText = pin => sol()?.pinText(pin) || (pin ? `prompt ${pin.promptVersion} · ${String(pin.sha256 || '').slice(0, 12)}` : '');
const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6Z"/></svg>';
// A suggestion's provenance, said in the one vocabulary: "Stated · REQ-001", "Inferred · GRP-001", "Sol draft · run 0f2a6c1e".
const provenanceText = ({source, ref, refLabel, runId}) => `${provenanceWord(source)} · ${source === 'sol' ? 'run ' + String(runId || '').slice(0, 8) : refLabel || ref || ''}`;
// A dismissal recorded with the project (coauthor.disposition in field-suggestions.js) or made in this session.
const dismissed = (st, id) => st.dismissed.has(id) || dismissedIds(projectOf(st.studio)).has(id);
const storeOf = st => st.studio?.store || (typeof window !== 'undefined' ? window.aiwProjectStore : null);
const READ_ONLY = new Set(['viewer', 'reviewer']);
const studios = new Set(), editors = new Map(), states = new WeakMap(), watched = new WeakSet();
let observer = null, counter = 0;
const nextId = prefix => `${prefix}-${++counter}`;
const projectOf = studio => studio?.store?.value?.document || (typeof window !== 'undefined' ? window.aiwProjectStore?.value?.document || null : null);
const readOnly = studio => READ_ONLY.has(studio?.store?.role);
const uuid = () => { const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; const h = [...b].map(x => x.toString(16).padStart(2, '0')).join(''); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; };
const button = (act, label, cls = '', attrs = '') => `<button type="button" class="btn ${cls}" data-spark-act="${act}" ${attrs}>${label}</button>`;
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

// ---------------------------------------------------------------- the one call each studio makes

// sparkStudio({store, dialog, recordId, editors, links, signal}): `dialog` is the studio's dialog selector
// ('.sec-dialog'); `recordId(command)` names the saved record its open editor of that record type edits (null for a
// new one); `editors` maps a record command to a function that opens that record's editor ({'security.threat': id =>
// editThreat(id)}); `links(command)`, optional, names what the open editor implies but holds in no control (the
// decision an alternative is nested in, the artefacts a new record will be linked to), as {decisionId} or {linkedIds}
// (LINK_FIELDS in field-suggestions.js). Returns a disposer.
export function sparkStudio({store = null, dialog = '', recordId = () => null, editors: open = {}, links = null, signal = null} = {}) {
  // A studio may be created where there is no page to mount on (a unit suite's stub document): nothing to do there.
  if (!dialog || typeof document === 'undefined' || typeof document?.querySelectorAll !== 'function' || !document.body) return () => {};
  const studio = {store, selector: dialog, recordId, links, commands: Object.keys(open)};
  studios.add(studio);
  for (const [command, fn] of Object.entries(open)) if (typeof fn === 'function') editors.set(command, {open: fn, studio});
  // Dialogs are watched for wherever they are added: the studios append theirs to <body>, the Chapter 1–3 page apps
  // write theirs into a host element. Only added nodes are looked at, and only a <dialog> is acted on.
  if (!observer && typeof MutationObserver === 'function') {
    observer = new MutationObserver(records => { for (const r of records) for (const node of r.addedNodes) if (node.nodeName === 'DIALOG') attach(node); });
    observer.observe(document.body, {childList: true, subtree: true});
  }
  for (const d of document.querySelectorAll('dialog')) attach(d);
  const dispose = () => { studios.delete(studio); for (const c of studio.commands) if (editors.get(c)?.studio === studio) editors.delete(c); if (!studios.size) { observer?.disconnect(); observer = null; } };
  signal?.addEventListener?.('abort', dispose, {once: true});
  return dispose;
}
const studioFor = dialog => [...studios].find(s => { try { return dialog.matches(s.selector); } catch { return false; } }) || null;
function attach(dialog) {
  const studio = studioFor(dialog);
  if (!studio) return;
  mountSpark(dialog, studio);
  if (watched.has(dialog) || typeof MutationObserver !== 'function') return;
  watched.add(dialog);
  // A studio may redraw the form inside an open editor (a wizard step, a reloaded record): mount again.
  let queued = false;
  new MutationObserver(records => {
    if (queued || !records.some(r => [...r.addedNodes].some(n => n.nodeType === 1 && !String(n.className || '').startsWith('spark') && (n.tagName === 'FORM' || n.tagName === 'LABEL' || n.querySelector?.('form,label'))))) return;
    queued = true; queueMicrotask(() => { queued = false; if (dialog.isConnected) mountSpark(dialog, studio); });
  }).observe(dialog, {childList: true, subtree: true});
}

// ---------------------------------------------------------------- mounting on a form

// Mounts the sparks on every record form in an open dialog (idempotent).
export function mountSpark(dialog, studio = studioFor(dialog)) {
  if (!dialog?.isConnected || readOnly(studio)) return;
  const R = rules;
  for (const form of dialog.querySelectorAll('form[id]')) {
    const command = R.commandForForm(form.id);
    if (!command || !R.supported(command)) continue;
    let st = states.get(form);
    if (!st) {
      st = {form, command, studio, recordId: safe(() => studio?.recordId?.(command)) || null, entries: new Map(), dismissed: new Set(), dismissing: null, sol: {}, popover: null, fill: null};
      states.set(form, st);
      form.addEventListener('input', e => onInput(st, e));
      form.addEventListener('change', e => { if (e.target?.matches?.('input[type=checkbox],select')) refreshLive(st); });
      form.addEventListener('click', e => onClick(st, e));
      dialog.addEventListener('pointerdown', e => { if (st.popover && !st.popover.contains(e.target) && !e.target.closest?.('[data-spark]')) closePopover(st, false); });
    }
    for (const d of R.sparkFields(command)) {
      const control = form.querySelector(`[name="${d.name}"]`);
      if (!control || control.dataset.sparkField || !(control.tagName === 'TEXTAREA' || (control.tagName === 'INPUT' && ['text', ''].includes((control.getAttribute('type') || 'text').toLowerCase())))) continue;
      const label = control.closest('label');
      if (!label) continue;
      control.dataset.sparkField = d.name;
      const caption = label.querySelector(':scope > span');
      // The control keeps its own name: the spark sits inside the label, so the control is named by its caption alone.
      if (caption && !control.hasAttribute('aria-labelledby')) { caption.id ||= nextId('spark-caption'); control.setAttribute('aria-labelledby', caption.id); }
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'spark'; b.dataset.spark = `${form.id}:${d.name}`; b.dataset.sparkFor = d.name;
      b.setAttribute('aria-label', `Suggestions for ${(caption?.textContent || d.label).trim()}`); b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false');
      b.innerHTML = ICON;
      if (caption) caption.after(b); else label.prepend(b);
    }
    refreshLive(st);
    savedMarks(st);
    prime(st);
  }
}
const safe = fn => { try { return fn(); } catch { return null; } };
// A reopened editor shows the provenance its record already carries (provenance.suggestions, read again on open):
// under each field, what its value came from and when it was accepted. A field with a new pending suggestion shows
// that instead.
function savedMarks(st) {
  for (const old of st.form.querySelectorAll('[data-spark-provenance]')) old.remove();
  const record = st.recordId ? rules.recordOf(projectOf(st.studio), st.command, st.recordId) : null;
  for (const s of (record?.provenance?.suggestions || []).filter(x => x && !x.superseded)) {
    const control = controlOf(st, s.field), label = control?.closest('label');
    if (!label || st.entries.has(s.field)) continue;
    const mark = document.createElement('small');
    mark.className = 'spark-saved'; mark.dataset.sparkProvenance = s.field;
    mark.textContent = `${provenanceText(s)} · accepted ${String(s.acceptedAt || '').slice(0, 10)}${s.edited ? ' · edited' : ''}`;
    control.before(mark);
  }
}

// ---------------------------------------------------------------- on open: offers said, the packet prepared (round 11)

// The record type's primary fields: the first two draftable long-text fields (else its first draftable text field).
// When an editor opens, Sol's packet for each is prepared on the server (field-context: what Sol would read, nothing
// sent to a model), so the first click in the spark sends. The packet is prepared once per open form and again, on the
// spark's opening, when the form has changed since; a model is never called without the person's "Send to Sol".
const primaryFields = command => { const ds = rules.sparkFields(command).filter(d => rules.draftable(command, d.name)); const long = ds.filter(d => d.kind === 'textarea').slice(0, 2); return (long.length ? long : ds.slice(0, 1)).map(d => d.name); };
export const primaryFieldsOf = primaryFields;
function prime(st) {
  if (st.primed) return;
  st.primed = true;
  const fields = primaryFields(st.command).filter(f => controlOf(st, f));
  if (!fields.length) return;
  whenSolKnown(() => { if (st.form.isConnected && solStatus().connected) for (const field of fields) prepare(st, field, {quiet: true}); });
}
// Runs fn once Sol's connection status is known (read once per project by brain-reasoning-ui.js); gives up quietly.
function whenSolKnown(fn, tries = 12) {
  if (solStatus().checked) { fn(); return; }
  Promise.resolve(sol()?.load()).catch(() => null).then(() => { if (solStatus().checked) fn(); else if (tries > 0) setTimeout(() => whenSolKnown(fn, tries - 1), 400); });
}
// What the form says for a field's packet, as one string: a prepared packet whose stamp differs is stale.
const requestStamp = (st, field) => JSON.stringify(fieldRequestOf(st, field));
const stale = (st, field) => { const x = st.sol[field]; return !!x && (x.phase === 'prepared' || x.phase === 'busy') && x.stamp !== undefined && x.stamp !== requestStamp(st, field); };
// Prepares the packet for one field: the server says what Sol would read (nothing is sent to a model). Shown in the
// open spark as it arrives; quiet when prepared ahead (a failure then leaves the spark's own button to ask again).
async function prepare(st, field, {quiet = false} = {}) {
  const req = fieldRequestOf(st, field), stamp = JSON.stringify(req), shown = () => st.popover?.dataset.sparkPop === field;
  st.sol[field] = {phase: 'busy', note: 'Preparing what Sol would read…', stamp, quiet};
  if (shown()) { st.popover.dataset.keepFocus = '1'; renderPopover(st); }
  let d;
  try { d = await request('field-context', req); }
  catch (e) {
    if (st.sol[field]?.stamp !== stamp) return;
    st.sol[field] = quiet ? {phase: 'idle'} : {phase: 'error', error: e.message || 'Sol could not prepare this field.'};
    if (shown()) renderPopover(st);
    return;
  }
  if (st.sol[field]?.stamp !== stamp) return; // the form changed meanwhile: a newer preparation is on its way
  st.sol[field] = {phase: 'prepared', packet: d.packet, request: req, stamp};
  if (shown()) { st.popover.dataset.keepFocus = '1'; renderPopover(st); }
}

// What the open form says: free-text values, and the linked ids and choices the rules follow (a requirement ticked
// in the traceability step counts before it is saved).
export function formValues(form, command) {
  const values = {}, links = {};
  if (!form) return {values, links};
  const fd = new FormData(form);
  for (const el of form.elements) {
    const name = el.name;
    if (!name || name === 'solSuggestions' || name in values || name in links) continue;
    const d = fieldOf(command, name), kind = d?.kind || (LINK_FIELDS.has(name) ? (el.type === 'checkbox' ? 'ids' : 'select') : null);
    if (kind === 'text' || kind === 'textarea') values[name] = String(fd.get(name) ?? '');
    else if (kind === 'ids') links[name] = fd.getAll(name).map(String);
    else if (kind === 'select') links[name] = String(fd.get(name) ?? '');
  }
  return {values, links};
}
// What the page app says the open editor implies beyond its controls (sparkStudio's `links`), link fields only.
const implied = st => Object.fromEntries(Object.entries(safe(() => st.studio?.links?.(st.command)) || {}).filter(([k]) => LINK_FIELDS.has(k)));
function context(st) { const {values, links} = formValues(st.form, st.command); return {recordId: st.recordId, values: {...implied(st), ...links, ...values}}; }
function offersFor(st, R) { return R.fieldOffers(projectOf(st.studio), st.command, context(st)); }
const controlOf = (st, field) => st.form.querySelector(`[data-spark-field="${field}"]`);

// The spark is "live" only where the rules have something to offer; never a pulse for nothing.
function refreshLive(st) {
  clearTimeout(st.liveTimer);
  st.liveTimer = setTimeout(() => {
    if (!st.form.isConnected) return;
    const offers = offersFor(st, rules);
    for (const b of st.form.querySelectorAll('[data-spark]')) {
      const live = (offers[b.dataset.sparkFor] || []).some(o => !dismissed(st, o.id));
      b.classList.toggle('live', live);
    }
    fillBar(st, offers);
  }, 0);
}

// ---------------------------------------------------------------- the pending provenance

// The suggestions the open form carries, as the command will carry them: the server overwrites acceptedBy and
// acceptedAt, and works out `edited` again for a Sol draft from the saved run.
export function pendingSuggestions(form) {
  const st = states.get(form);
  return st ? [...st.entries.values()].map(({field, source, runId, suggestionId, ref, acceptedAt, edited}) => ({field, source, ...(runId ? {runId} : {}), ...(suggestionId ? {suggestionId} : {}), ...(ref ? {ref} : {}), acceptedBy: '', acceptedAt, edited: !!edited})) : [];
}
function sync(st) {
  const {form} = st, list = pendingSuggestions(form);
  let hidden = form.querySelector('input[type=hidden][name="solSuggestions"]');
  if (list.length) { if (!hidden) { hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = 'solSuggestions'; form.append(hidden); } hidden.value = JSON.stringify(list); }
  else hidden?.remove();
  for (const control of form.querySelectorAll('[data-spark-field]')) {
    const entry = st.entries.get(control.dataset.sparkField), label = control.closest('label');
    let mark = label?.querySelector(':scope > .spark-mark');
    control.classList.toggle('spark-accepted', !!entry);
    if (!entry) { mark?.remove(); continue; }
    label.querySelector(':scope > [data-spark-provenance]')?.remove();
    if (!mark && label) { mark = document.createElement('small'); mark.className = 'spark-mark'; mark.dataset.sparkMark = entry.field; control.before(mark); }
    if (mark) mark.textContent = `${entry.source === 'sol' ? 'Sol draft · not saved · run ' + String(entry.runId).slice(0, 8) : provenanceText(entry)}${entry.edited ? ' · edited' : ''}`;
  }
  let line = form.querySelector('[data-spark-pending]');
  if (!list.length) { line?.remove(); return; }
  if (!line) {
    line = document.createElement('p'); line.className = 'spark-pending'; line.dataset.sparkPending = ''; line.setAttribute('role', 'status');
    const actions = [...form.querySelectorAll('button[type=submit]')].at(-1)?.parentElement;
    if (actions && actions !== form && form.contains(actions)) actions.before(line); else form.append(line);
  }
  line.textContent = `${plural(list.length, 'field carries a suggestion', 'fields carry suggestions')}. ${list.length === 1 ? 'It is' : 'They are'} saved only when you save this record.`;
}
function onInput(st, e) {
  const field = e.target?.dataset?.sparkField;
  if (!field) return;
  const entry = st.entries.get(field);
  if (entry) {
    const now = String(e.target.value || '').trim();
    if (!now) st.entries.delete(field); else entry.edited = now !== String(entry.value || '').trim();
    sync(st);
  }
}
// Writes a value into the open form, as typing would, and records where it came from.
function put(st, field, value, suggestion) {
  const control = controlOf(st, field);
  if (!control) return null;
  st.entries.set(field, {field, acceptedAt: new Date().toISOString(), edited: false, ...suggestion, value: String(value)});
  control.value = String(value);
  control.dispatchEvent(new Event('input', {bubbles: true}));
  sync(st);
  return control;
}

// ---------------------------------------------------------------- the popover

function onClick(st, e) {
  const spark = e.target.closest?.('[data-spark]');
  if (spark && st.form.contains(spark)) { e.preventDefault(); if (st.popover?.dataset.sparkPop === spark.dataset.sparkFor) closePopover(st); else openPopover(st, spark); return; }
  const act = e.target.closest?.('[data-spark-act]');
  if (!act || !st.form.contains(act)) return;
  e.preventDefault(); e.stopPropagation();
  perform(st, act).catch(err => { const field = st.popover?.dataset.sparkPop; if (field) { st.sol[field] = {phase: 'error', error: err.message || 'Sol could not complete this request.'}; renderPopover(st); } });
}
function openPopover(st, spark) {
  closePopover(st, false);
  const field = spark.dataset.sparkFor, label = spark.closest('label'), pop = document.createElement('div');
  pop.className = 'spark-pop'; pop.id = nextId('spark-pop'); pop.dataset.sparkPop = field;
  pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'false'); pop.setAttribute('aria-labelledby', pop.id + '-title');
  pop.addEventListener('keydown', e => onPopoverKey(st, e));
  (label || spark).after(pop);
  st.popover = pop; spark.setAttribute('aria-expanded', 'true'); spark.setAttribute('aria-controls', pop.id);
  // A packet prepared when the editor opened, for a form that has changed since, is prepared again now.
  if (stale(st, field) && solStatus().connected) prepare(st, field, {quiet: true});
  renderPopover(st);
  (pop.querySelector('[data-spark-act]:not([data-spark-act="close"])') || pop.querySelector('[data-spark-act]'))?.focus({preventScroll: true});
}
function closePopover(st, focus = true) {
  const pop = st.popover;
  if (!pop) return;
  const spark = st.form.querySelector(`[data-spark][data-spark-for="${pop.dataset.sparkPop}"]`);
  pop.remove(); st.popover = null;
  spark?.setAttribute('aria-expanded', 'false'); spark?.removeAttribute('aria-controls');
  if (focus) spark?.focus({preventScroll: true});
}
const FOCUSABLE = 'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[href],[tabindex]:not([tabindex="-1"])';
function onPopoverKey(st, e) {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePopover(st); return; }
  if (e.key === 'Enter' && e.target?.matches?.('[data-spark-reason]')) { e.preventDefault(); e.stopPropagation(); e.target.closest('[data-spark-dismiss]')?.querySelector('[data-spark-act="record-dismissal"]')?.click(); return; }
  if (e.key !== 'Tab') return;
  const items = [...st.popover.querySelectorAll(FOCUSABLE)];
  if (!items.length) return;
  const first = items[0], last = items.at(-1), active = document.activeElement;
  e.stopPropagation();
  if (e.shiftKey && (active === first || !st.popover.contains(active))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
}
const bandHTML = (key, label, note, body) => `<section class="spark-band spark-band-${key}" data-spark-band="${key}" aria-label="${esc(label)}"><p class="spark-band-label"><b>${esc(label)}</b><small>${esc(note)}</small></p>${body}</section>`;
// Dismissing an offer asks why, in one line, and records it with the project (a workspace record, no design change),
// so the offer is not made again after a reload; "No" on a question is an answer for this session only.
const dismissHTML = id => `<div class="spark-dismiss" data-spark-dismiss="${esc(id)}"><label class="spark-field"><span>Why set it aside? One line, kept with the project.</span><input type="text" data-spark-reason maxlength="300"></label><div class="spark-actions">${button('record-dismissal', 'Record it', 'primary', `data-offer="${esc(id)}"`)}${button('cancel-dismissal', 'Keep it', '', `data-offer="${esc(id)}"`)}</div><p class="spark-error" role="alert" hidden></p></div>`;
function offerHTML(o, {sol = false, dismissing = null} = {}) {
  const refLine = sol ? '' : `<p class="spark-why"><span class="spark-ref">${esc(o.refLabel || o.ref)}</span> ${esc(o.why)}</p>`;
  if (o.band === 'confirm') return `<li class="spark-offer" data-spark-offer="${esc(o.id)}"><p class="spark-question">${esc(o.question)}</p><p class="spark-value">${esc(o.value)}</p>${refLine}<div class="spark-actions">${button('yes', 'Yes, use this', 'primary', `data-offer="${esc(o.id)}"`)}${button('no', 'No', '', `data-offer="${esc(o.id)}"`)}</div></li>`;
  const actions = dismissing === o.id ? dismissHTML(o.id) : `<div class="spark-actions">${button('accept', 'Accept', 'primary', `data-offer="${esc(o.id)}"`)}${button('edit', 'Edit', '', `data-offer="${esc(o.id)}"`)}${button('dismiss', 'Dismiss', '', `data-offer="${esc(o.id)}"`)}</div>`;
  return `<li class="spark-offer" data-spark-offer="${esc(o.id)}"><p class="spark-value">${esc(o.value)}</p>${refLine}${actions}</li>`;
}
function renderPopover(st) {
  const pop = st.popover;
  if (!pop) return;
  const R = rules;
  const field = pop.dataset.sparkPop, d = fieldOf(st.command, field), offers = (offersFor(st, R)[field] || []).filter(o => !dismissed(st, o.id));
  const project = offers.filter(o => o.band === 'project'), confirm = offers.filter(o => o.band === 'confirm');
  st.offers = new Map(offers.map(o => [o.id, o]));
  const had = document.activeElement && pop.contains(document.activeElement), focusKey = had ? document.activeElement.dataset.sparkAct : null;
  pop.innerHTML = `<header class="spark-pop-head"><strong id="${pop.id}-title">Suggestions for ${esc(d?.label || field)}</strong>${button('close', '×', 'icon-only', 'aria-label="Close suggestions"')}</header>`
    + bandHTML('project', provenanceWord('project'), 'rule-based · copied from a record your project holds · no model consulted', project.length ? `<ul class="spark-offers">${project.map(o => offerHTML(o, {dismissing: st.dismissing})).join('')}</ul>` : '<p class="spark-empty">Nothing your project records offers a value for this field yet.</p>')
    + bandHTML('confirm', provenanceWord('confirm'), 'rule-based · implied by your project or the chapter guide · your answer decides', confirm.length ? `<ul class="spark-offers">${confirm.map(o => offerHTML(o)).join('')}</ul>` : '<p class="spark-empty">Nothing to confirm for this field.</p>')
    + bandHTML('sol', 'Sol draft', 'a model’s draft, recorded on the server · not saved until you save the record', solBandHTML(st, R, field))
    + '<p class="spark-foot">Accepting fills this field in the form only. Nothing is saved until you save this record.</p>';
  // Focus stays in the popover across redraws: on the same control, else on the Sol band's first control, else on close.
  const target = pop.querySelector('[data-spark-dismiss] [data-spark-reason]') || (focusKey && pop.querySelector(`[data-spark-act="${focusKey}"]`)) || (had || pop.dataset.keepFocus ? pop.querySelector('[data-spark-band="sol"] [data-spark-act]') || pop.querySelector('[data-spark-act="close"]') : null);
  delete pop.dataset.keepFocus;
  target?.focus({preventScroll: true});
}
function solBandHTML(st, R, field) {
  if (!R.draftable(st.command, field)) return '<p class="spark-empty" data-spark-sol-status>Sol does not draft owners, identifiers, evidence, sources or the basis of a number. A person records them.</p>';
  const s = solStatus();
  if (!s.checked) {
    // The connection is read once per project (brain-reasoning-ui.js); the band asks again until it is known.
    Promise.resolve(sol()?.load()).catch(e => console.warn('Sol’s connection status could not be read.', e?.message));
    clearTimeout(st.solTimer); st.solTimer = setTimeout(() => { if (st.popover?.dataset.sparkPop === field) renderPopover(st); }, 400);
    return `<p class="spark-empty" data-spark-sol-status>${esc(solStatusLine())}</p>`;
  }
  if (!s.connected) return `<p class="spark-empty" data-spark-sol-status>${esc(solStatusLine())}</p>`;
  const x = st.sol[field] || {phase: 'idle'};
  // While Sol drafts, the run's step (drafting, then checking) and the seconds it has taken (round 5).
  if (x.phase === 'busy') return `<p class="spark-empty spark-progress" role="status"><span data-spark-progress>${esc(x.note || 'Sol is drafting…')}</span> <small data-spark-progress-secs aria-hidden="true"></small></p>`;
  if (x.phase === 'error') return `<p class="spark-error" role="alert">${esc(x.error)}</p>${button('prepare', 'Draft with Sol')}`;
  if (x.phase === 'prepared') {
    const k = x.packet;
    return `<div class="spark-packet" data-spark-packet><p>Sol will read ${plural(k.sources.length, 'source')} for this field, and nothing else:</p><ol class="spark-sources">${k.sources.map(src => `<li><b>${esc(src.ref)}</b> ${esc(src.title)} <small>${esc(src.kind)}</small></li>`).join('')}</ol>${k.omissions?.length ? `<p class="spark-note">Left out: ${esc(k.omissions.map(o => `${o.title} (${o.reason})`).join('; '))}.</p>` : ''}<p class="spark-note">Packet ${esc(String(k.stamp).slice(0, 12))} · ${esc(pinText(k.brainReceipt?.instructions))}. Secrets are redacted before sending.</p></div>${button('send', 'Send to Sol', 'primary')}${button('not-now', 'Not now')}`;
  }
  if (x.phase === 'result') {
    const run = x.run, r = run.result || {}, receipt = `<p class="spark-receipt" data-spark-receipt>Run ${esc(run.id)} · packet ${esc(String(run.groundingReview?.packetStamp || run.packet?.stamp || '').slice(0, 12))} · ${esc(pinText(run.instructions))} · ${run.groundingReview?.accepted ? 'source-checked' : 'source check raised issues'} · draft, not saved</p>`;
    if (r.withheld) return `<p class="spark-error">Sol’s draft was withheld: ${esc((r.issues || []).join(' '))} Nothing to accept.</p>${receipt}${button('prepare', 'Ask again')}`;
    if (!r.value) return `<p class="spark-empty">Sol found nothing it could responsibly draft here: ${esc(r.basis || 'the packet does not support a value.')}</p>${receipt}`;
    if (dismissed(st, 'sol-' + run.id)) return `<p class="spark-empty">You dismissed Sol’s draft (${esc(run.id.slice(0, 8))}).</p>${button('prepare', 'Draft again')}`;
    const actions = st.dismissing === 'sol-' + run.id ? dismissHTML('sol-' + run.id) : `<div class="spark-actions">${button('accept', 'Accept', 'primary', `data-offer="sol-${esc(run.id)}"`)}${button('edit', 'Edit', '', `data-offer="sol-${esc(run.id)}"`)}${button('dismiss', 'Dismiss', '', `data-offer="sol-${esc(run.id)}"`)}</div>`;
    return `<ul class="spark-offers"><li class="spark-offer spark-sol" data-spark-offer="sol-${esc(run.id)}"><p class="spark-value">${esc(r.value)}</p><p class="spark-why">${esc(r.basis)} <small>Cites ${esc((r.sourceRefs || []).join(', '))}.</small></p>${receipt}${actions}</li></ul>`;
  }
  return `${button('prepare', 'Draft with Sol')}<p class="spark-note">Sol shows what it will read first; nothing is sent until you send it.</p>`;
}
async function request(path, body) {
  const r = await fetch(projectURL('/api/intelligence/' + path), {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  let d; try { d = await r.json(); } catch { throw Error('Sol’s answer could not be read. Nothing was changed.'); }
  if (!r.ok) throw Error((d.error || 'Sol could not complete this request.') + (d.detail ? ' ' + d.detail : ''));
  return d;
}
const fieldRequestOf = (st, field) => { const {values, links} = formValues(st.form, st.command); return {command: st.command, field, recordId: st.recordId, values, links: {...implied(st), ...links}}; };
async function perform(st, el) {
  const act = el.dataset.sparkAct, field = st.popover?.dataset.sparkPop, offer = st.offers?.get(el.dataset.offer);
  if (act === 'close') return closePopover(st);
  if (act === 'undo-fill') return undoFill(st);
  if (act === 'fill') return fillForm(st);
  if (!field) return;
  if (act === 'accept' || act === 'edit' || act === 'yes') {
    const sol = String(el.dataset.offer || '').startsWith('sol-') ? st.sol[field]?.run : null;
    const control = sol ? put(st, field, sol.result.value, {source: 'sol', runId: sol.id, suggestionId: 'sol-' + sol.id})
      : offer ? put(st, field, offer.value, {source: offer.band === 'confirm' ? 'confirm' : 'project', ref: offer.ref, refLabel: offer.refLabel, suggestionId: offer.id}) : null;
    closePopover(st, act !== 'edit');
    if (act === 'edit') control?.focus({preventScroll: false});
    return;
  }
  if (act === 'no') { st.dismissed.add(el.dataset.offer); refreshLive(st); return renderPopover(st); }
  if (act === 'dismiss') { st.dismissing = el.dataset.offer; return renderPopover(st); }
  if (act === 'cancel-dismissal') { st.dismissing = null; renderPopover(st); st.popover?.querySelector(`[data-spark-act="dismiss"][data-offer="${el.dataset.offer}"]`)?.focus({preventScroll: true}); return; }
  if (act === 'record-dismissal') return recordDismissal(st, field, el.dataset.offer);
  if (act === 'not-now') { st.sol[field] = {phase: 'idle'}; return renderPopover(st); }
  if (act === 'prepare') return prepare(st, field);
  if (act === 'send') {
    const x = st.sol[field];
    if (x?.phase !== 'prepared') return;
    st.sol[field] = {phase: 'busy', note: 'Sol · drafting a field · sending…'}; st.popover.dataset.keepFocus = '1'; await renderPopover(st);
    const requestId = uuid(), busy = st.sol[field];
    const stop = sol()?.watch?.(requestId, 'field', (line, step, secs) => {
      if (st.sol[field] !== busy) return;
      busy.note = line;
      const el = st.popover?.querySelector('[data-spark-progress]'), s = st.popover?.querySelector('[data-spark-progress-secs]');
      if (el && el.textContent !== line) el.textContent = line;
      if (s) s.textContent = secs + ' s';
    }) || (() => {});
    let run;
    try { run = await request('field', {...x.request, requestId, packetStamp: x.packet.stamp}); } finally { stop(); }
    if (run.status !== 'completed') throw Error(run.error || 'Sol’s draft was not completed. Nothing was changed.');
    st.sol[field] = {phase: 'result', run};
    if (st.popover) st.popover.dataset.keepFocus = '1';
    return renderPopover(st);
  }
}

// A dismissal is kept with the project: coauthor.disposition names the offer, the record, the field, where the offer
// came from and the one-line reason (field-suggestions.js applyCoauthorCommand refuses it without one). It changes
// no design record; the offer is not made again, here or in Proposals, after a reload.
async function recordDismissal(st, field, id) {
  const box = st.popover?.querySelector(`[data-spark-dismiss="${id}"]`), alert = box?.querySelector('[role=alert]'), input = box?.querySelector('[data-spark-reason]');
  if (!box) return;
  const reason = String(input.value || '').trim();
  if (reason.length < 8 || /[\r\n]/.test(reason)) { alert.hidden = false; alert.textContent = 'Say in one line (at least 8 characters) why this suggestion does not fit.'; input.focus(); return; }
  const sol = id.startsWith('sol-') ? st.sol[field]?.run : null, offer = st.offers?.get(id), store = storeOf(st);
  if ((!sol && !offer) || typeof store?.command !== 'function') { alert.hidden = false; alert.textContent = 'This suggestion cannot be set aside right now.'; return; }
  const payload = {suggestionId: id, command: st.command, recordId: st.recordId, field, reason, ...(sol ? {source: 'sol', runId: sol.id} : {source: offer.band, ref: offer.ref})};
  for (const b of box.querySelectorAll('button')) b.disabled = true;
  try { await store.command({type: 'coauthor.disposition', payload}); }
  catch (e) { for (const b of box.querySelectorAll('button')) b.disabled = false; alert.hidden = false; alert.textContent = e.message || 'The dismissal could not be recorded.'; return; }
  st.dismissed.add(id); st.dismissing = null;
  refreshLive(st);
  if (st.popover) { st.popover.dataset.keepFocus = '1'; renderPopover(st); }
}

// ---------------------------------------------------------------- "Fill empty fields from your project"

// When an editor opens (and as the form changes), the rules' offers for every empty field are computed from the
// project and said in one line: "4 suggestions from your project · 3 empty fields · Fill". Fill puts the copied
// values (the first band) in the empty fields; a question to confirm is answered in its own spark. Nothing is saved.
function fillBar(st, offers) {
  if (st.fill) return; // a fill report with its Undo stands until undone or the form is saved
  const open = Object.entries(offers).map(([field, xs]) => [field, xs.filter(o => !dismissed(st, o.id))]).filter(([field, xs]) => { const c = controlOf(st, field); return xs.length && c && !String(c.value || '').trim(); });
  const fillable = open.filter(([, xs]) => xs.some(o => o.band === 'project')).length, total = open.reduce((n, [, xs]) => n + xs.length, 0);
  let bar = st.form.querySelector(':scope > [data-spark-fillbar]');
  if (!open.length) { bar?.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.className = 'spark-fill'; bar.dataset.sparkFillbar = ''; bar.setAttribute('role', 'status'); const nav = st.form.querySelector(':scope > nav'); if (nav) nav.after(bar); else st.form.prepend(bar); }
  bar.innerHTML = `<p class="spark-fill-line"><b data-spark-offer-count="${total}">${plural(total, 'suggestion')} from your project</b> · ${plural(open.length, 'empty field')}</p>${fillable ? button('fill', 'Fill', 'primary', `aria-label="Fill ${plural(fillable, 'empty field')} from your project"`) : ''}<small>${fillable ? `Fill copies the proposed values into ${plural(fillable, 'empty field')}. Use the suggestion button beside a field to review its question.` : 'Use the suggestion button beside each field to review its question.'} Nothing is saved until you save this record.</small>`;
}
function fillForm(st) {
  const offers = offersFor(st, rules), items = [];
  for (const [field, xs] of Object.entries(offers)) {
    const o = xs.find(x => x.band === 'project' && !dismissed(st, x.id));
    if (o) items.push({key: field, label: fieldOf(st.command, field)?.label || field, value: o.value, refLabel: o.refLabel || o.ref, offer: o});
  }
  const bar = st.form.querySelector(':scope > [data-spark-fillbar]');
  st.fill = fillControls(items, {controlFor: k => controlOf(st, k), anchor: bar || st.form.firstElementChild, record: (item, control) => { if (control && item.offer) { st.entries.set(item.key, {field: item.key, source: 'project', ref: item.offer.ref, refLabel: item.offer.refLabel, suggestionId: item.offer.id, value: item.value, acceptedAt: new Date().toISOString(), edited: false}); sync(st); } }, onUndo: () => { st.fill = null; refreshLive(st); }});
  bar?.remove();
  if (!st.fill) refreshLive(st);
}
function undoFill(st) { st.fill?.undo(); }

// Fills only the empty controls among `items` ({key, label, value, refLabel}), as typing would, and shows what it
// filled with one Undo beside `anchor`. Never automatic: a person asks for it. Returns {filled, undo} or null when
// nothing was empty. Used by the record forms here and by the guided design task (design-task-ui.js).
export function fillControls(items, {controlFor, anchor = null, record = null, onUndo = null, what = 'from your project'} = {}) {
  const filled = [];
  for (const item of items) {
    const control = controlFor(item.key);
    if (!control || String(control.value || '').trim() || item.value == null || item.value === '') continue;
    if (control.tagName === 'SELECT' && ![...control.options].some(o => o.value === String(item.value))) continue;
    record?.(item, control);
    control.value = String(item.value);
    control.dispatchEvent(new Event('input', {bubbles: true}));
    filled.push({...item, control});
  }
  if (!filled.length) return null;
  const report = document.createElement('div');
  report.className = 'spark-fill-report'; report.dataset.sparkFillReport = ''; report.setAttribute('role', 'status');
  report.innerHTML = `<p>Filled ${plural(filled.length, 'empty field')} ${esc(what)}: ${filled.map(f => `<b>${esc(f.label)}</b>${f.refLabel ? ` (${esc(f.refLabel)})` : ''}`).join(', ')}. Nothing is saved until you save.</p><button type="button" class="btn" data-spark-act="undo-fill">Undo</button>`;
  if (anchor?.parentElement) anchor.after(report); else filled[0].control.closest('form,section,div')?.prepend(report);
  let undone = false;
  const undo = () => {
    if (undone) return; undone = true;
    for (const f of filled) if (f.control.isConnected && f.control.value === String(f.value)) { f.control.value = ''; f.control.dispatchEvent(new Event('input', {bubbles: true})); }
    report.remove(); onUndo?.();
  };
  // Outside a sparked form (the design task), the report's own Undo button works by itself.
  report.querySelector('button').addEventListener('click', e => { if (!e.target.closest('form')?.querySelector('[data-spark]')) { e.preventDefault(); e.stopPropagation(); undo(); } });
  return {filled, undo};
}

// ---------------------------------------------------------------- Proposals opens an editor

export const canEdit = command => editors.has(command);
// Opens the record's editor through its studio and puts `value` in `field`, with the suggestion pending as if the
// person had accepted it in the spark (source 'project', 'confirm' or 'sol'): how Proposals and the journey draft accept
// a field offer. Nothing is saved: the person saves the record in the editor. Resolves to true when the editor opened
// with the field filled.
export async function openRecordEditor(command, recordId, {field, value, suggestion = {}, focus = false} = {}) {
  const entry = editors.get(command);
  if (!entry || typeof document === 'undefined' || document.querySelector('dialog[open]') || readOnly(entry.studio)) return false;
  entry.open(recordId);
  const dialog = document.querySelector('dialog[open]');
  if (!dialog) return false;
  mountSpark(dialog, entry.studio);
  const form = dialog.querySelector('#' + FORM_IDS[command]), st = form && states.get(form);
  if (!st) return false;
  st.recordId ||= recordId;
  const control = put(st, field, value, suggestion);
  if (!control) return false;
  reveal(control);
  const note = document.createElement('p');
  note.className = 'spark-prefill'; note.dataset.sparkPrefill = field; note.setAttribute('role', 'status');
  note.textContent = `A proposal is in “${fieldOf(command, field)?.label || field}” (${provenanceText(suggestion)}). Review it; nothing is saved until you save this record.`;
  form.prepend(note);
  if (focus) control.focus({preventScroll: false});
  return true;
}
// Shows the wizard step that holds a control (the studio's own step control, so its own checks apply). A panel
// data-x-panel="n" is shown by data-x-step="n" (data-x-form-step="n" in the Chapter 2 driver editor).
function reveal(control) {
  const panel = [...control.parentElement ? ancestors(control) : []].find(el => [...el.attributes].some(a => /^data-[a-z]+-panel$/.test(a.name)));
  if (!panel || !panel.hidden) return;
  const attr = [...panel.attributes].find(a => /^data-[a-z]+-panel$/.test(a.name)), stem = attr.name.replace(/-panel$/, '');
  const step = panel.closest('form')?.querySelector(`[${stem}-step="${attr.value}"],[${stem}-form-step="${attr.value}"]`);
  step?.click();
}
function* ancestors(el) { for (let x = el.parentElement; x && x.tagName !== 'FORM'; x = x.parentElement) yield x; }
// The bridge Proposals and the guided design task use (see the bundle note at the top).
if (typeof window !== 'undefined' && window) window.aiwFieldSpark = {openRecordEditor, canEdit, fillControls, rules};
