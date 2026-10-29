// rc41 (lead, from W2's open items): the bar's Details toggle never offers to hide a column the focused case has
// hidden. happy-dom; the helper reads the shell's own markers (body[data-panel], .studio.vx-case-reading).
// rc41 close: the unavailable toggle stays reachable and says why in text (C31); the column opens by itself by one rule,
// shared by the default and a Model selection: only where the viewport gives it a column (C4).
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {Window} = await import(process.env.AIW_DOM_MODULE || 'happy-dom');
const w = new Window({url: 'https://aiw.test/?chapter=11&tab=validate'});
for (const key of ['window', 'document', 'location', 'history', 'localStorage', 'CustomEvent', 'Event', 'Element', 'HTMLElement', 'Node', 'MutationObserver', 'navigator', 'CSS']) Object.defineProperty(globalThis, key, {value: key === 'window' ? w : w[key], configurable: true, writable: true});
for (const key of ['getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) globalThis[key] = w[key].bind(w);
// The viewport the rule reads: a width, and min-/max-width queries answered against it.
let width = 1440;
globalThis.matchMedia = q => ({matches: [...String(q).matchAll(/(min|max)-width:\s*(\d+)px/g)].every(([, k, n]) => (k === 'min' ? width >= +n : width <= +n)), media: q, addEventListener() {}, removeEventListener() {}});
const {syncDetailsToggle, detailsOpensByItself, detailsColumnFits, DETAILS_COLUMN_QUERY} = await import('./public/studio-kit.js');

const checks = [], pass = s => checks.push(s);
document.body.innerHTML = '<div class="workspace-tools"><button type="button" data-panel-toggle aria-controls="inspector">Details</button></div><div class="studio"><main class="stage"></main><aside id="inspector"><button type="button" class="panel-dismiss" data-panel-toggle>Close details ×</button></aside></div>';
const bar = document.querySelector('.workspace-tools [data-panel-toggle]'), dismiss = document.querySelector('#inspector [data-panel-toggle]'), studio = document.querySelector('.studio');
const read = b => [b.disabled, b.getAttribute('aria-expanded'), b.title];
const reason = b => { const id = b.getAttribute('aria-describedby'); return id ? document.getElementById(id) : null; };

document.body.dataset.panel = 'open'; syncDetailsToggle();
assert.deepEqual(read(bar), [false, 'true', 'Hide details']);
document.body.dataset.panel = 'collapsed'; syncDetailsToggle();
assert.deepEqual(read(bar), [false, 'false', 'Show details']);
assert.equal(bar.getAttribute('aria-disabled'), null); assert.equal(bar.getAttribute('aria-describedby'), null); assert.equal(document.querySelectorAll('.details-toggle-reason').length, 0);
pass('Outside the focused case the toggle names what it does');

// rc41 close (C31): unavailable, not natively disabled — it stays in the Tab order and a tap reaches it — and the reason
// is text beside it, the toggle's aria-describedby, not a title alone.
studio.classList.add('vx-case-reading');
for (const panel of ['open', 'collapsed']) {
  document.body.dataset.panel = panel; syncDetailsToggle();
  assert.deepEqual(read(bar), [false, 'false', 'Details stay closed while the focused case is open'], panel);
  assert.equal(bar.getAttribute('aria-disabled'), 'true', 'the toggle says it is unavailable');
  assert.equal(bar.tabIndex, 0, 'and stays focusable');
  const r = reason(bar);
  assert(r, 'its aria-describedby names an element');
  assert.equal(r.textContent, 'Details stay closed while the focused case is open', 'the reason is text, not only a title');
  assert.equal(r.previousElementSibling, bar, 'the reason stands beside the toggle');
  assert.equal(document.querySelectorAll('.details-toggle-reason').length, 1, 'one reason, however often the toggle is synced');
  assert.equal(dismiss.disabled, false, 'the column’s own close button is not the bar’s toggle');
  assert.equal(dismiss.getAttribute('aria-disabled'), null);
}
pass('On the focused case the bar’s toggle is unavailable but focusable, not expanded, and says why in text beside it — whatever the remembered choice');

// The shell's handler ignores the unavailable toggle: a click changes nothing.
const {openWorkspaceDetails} = await import('./public/workspace-ux.js');
document.body.dataset.panel = 'collapsed'; syncDetailsToggle();
bar.click();
assert.equal(document.body.dataset.panel, 'collapsed', 'a click on the unavailable toggle does not open the column');
assert.equal(bar.getAttribute('aria-expanded'), 'false');
pass('The unavailable toggle does nothing when pressed');

studio.classList.remove('vx-case-reading'); document.body.dataset.panel = 'open'; syncDetailsToggle();
assert.deepEqual(read(bar), [false, 'true', 'Hide details']);
assert.equal(bar.getAttribute('aria-disabled'), null); assert.equal(bar.getAttribute('aria-describedby'), null); assert.equal(document.querySelectorAll('.details-toggle-reason').length, 0, 'the reason leaves with the focused case');
pass('Leaving the focused case restores the toggle to the remembered choice');

// rc41 close (C31): the canvas's "Add … here" entries that wait for a picture say why in visible text beside them (their
// aria-describedby), not in a title alone; on a picture they carry no such note.
{
  const {addHereHTML} = await import('./public/canvas-draft.js');
  const host = document.createElement('div');
  host.innerHTML = addHereHTML(4, {view: 'table'});
  const waiting = [...host.querySelectorAll('[data-nt="add-here"]')], note = host.querySelector('.nt-add-here-note');
  assert(waiting.length > 0 && waiting.every(b => b.disabled), 'on a sheet the entries wait for a picture');
  assert(note, 'and a note says why');
  assert.equal(note.textContent, 'Open the Diagram or Layers view to place it on the picture.');
  assert(waiting.every(b => b.getAttribute('aria-describedby') === note.id && note.id), 'each entry is described by the note');
  host.innerHTML = addHereHTML(4, {view: 'diagram'});
  assert(![...host.querySelectorAll('[data-nt="add-here"]')].some(b => b.disabled || b.hasAttribute('aria-describedby')) && !host.querySelector('.nt-add-here-note'), 'on a picture the entries are offered, with no note');
  host.innerHTML = addHereHTML(4, {view: 'diagram', role: 'menuitem'});
  assert.equal(host.querySelector('p'), null, 'a menu holds menu items only');
}
pass('The canvas’s waiting "Add … here" entries say why in text beside them');

// rc41 close (C4): the column opens by itself only where it is a column (from 1180 px; below, studio-system.css makes it
// a sheet over the task) and only when it holds the glance or a held record.
assert.equal(DETAILS_COLUMN_QUERY, '(min-width:1180px)');
const sheetRule = (await readFile(new URL('./public/studio-system.css', import.meta.url), 'utf8')).match(/@media\(max-width:(\d+)px\)\{[^@]*?\[data-panel=open\]:not\(\[data-lens-position=bottom\]\) \.studio>#inspector\{position:fixed/);
assert(sheetRule && Number(sheetRule[1]) + 1 === 1180, 'the rule’s width is where the stylesheet stops laying the column over the task');
for (const [px, column] of [[390, false], [701, false], [1024, false], [1179, false], [1180, true], [1440, true]]) {
  width = px;
  assert.equal(detailsColumnFits(), column, px + ' px');
  assert.equal(detailsOpensByItself({held: true}), column, px + ' px, a held record');
  assert.equal(detailsOpensByItself({glance: true}), column, px + ' px, the glance');
  assert.equal(detailsOpensByItself({}), false, px + ' px, nothing to read');
}
pass('The column opens by itself from 1180 px with the glance or a held record, never as a sheet (390, 701, 1024, 1179 px) and never empty');

// A selection on a Model picture asks by the same rule (notation-view.js revealReading dispatches aiw:inspect-details).
document.body.innerHTML = '<div class="workspace-tools"><button type="button" data-panel-toggle aria-controls="inspector">Details</button></div><div class="studio"><main class="stage"></main><aside id="inspector"></aside></div>';
const select = (px, chapter) => { width = px; history.replaceState({}, '', '/?chapter=' + chapter + '&tab=model&object=api-pod'); document.body.dataset.workspaceTab = 'model'; document.body.dataset.panel = 'collapsed'; window.dispatchEvent(new CustomEvent('aiw:inspect-details', {detail: {unlessClosed: true}})); return document.body.dataset.panel; };
assert.equal(select(1024, 5), 'collapsed', 'at 1024 px the selection leaves the sheet closed');
assert.equal(select(701, 6), 'collapsed', 'at 701 px too');
assert.equal(select(1440, 7), 'open', 'at 1440 px the selection opens the column');
localStorage.setItem('aiw-details-v1:bank-payment', JSON.stringify({'8:model': true}));
assert.equal(select(1440, 8), 'collapsed', 'a column the viewer closed stays closed');
// A selection's other path (model-stage.js announceObject → app.js aiw:subject) opens it by the same rule.
const subject = (px, chapter) => { width = px; history.replaceState({}, '', '/?chapter=' + chapter + '&tab=model&object=api-pod'); document.body.dataset.workspaceTab = 'model'; document.body.dataset.panel = 'collapsed'; openWorkspaceDetails({byItself: true}); return document.body.dataset.panel; };
assert.equal(subject(1024, 7), 'collapsed', 'at 1024 px the announced selection leaves the sheet closed');
assert.equal(subject(390, 7), 'collapsed', 'on a phone too');
assert.equal(subject(1440, 7), 'open', 'at 1440 px it opens the column');
assert.equal(subject(1440, 8), 'collapsed', 'unless the viewer closed it for this chapter and tab');
// An explicit inspection (no unlessClosed) opens it at any width: the person asked.
width = 390; openWorkspaceDetails(); assert.equal(document.body.dataset.panel, 'open');
pass('A Model selection opens the column by the same rule on both of its paths: never at 390, 701 or 1024 px, at 1440 px unless the viewer closed it; an explicit inspection opens it at any width');

// One rule, one place: the default and the selection both ask detailsOpensByItself; no other width decides it.
const ux = await readFile(new URL('./public/workspace-ux.js', import.meta.url), 'utf8'), app = await readFile(new URL('./public/app.js', import.meta.url), 'utf8');
const toggleBody = ux.slice(ux.indexOf('function refinePanelToggle('), ux.indexOf('function toggleDetails('));
const ruleBody = ux.slice(ux.indexOf('export function selectionOpensDetails('), ux.indexOf("addEventListener('aiw:inspect-details'"));
const selectionBody = ux.slice(ux.indexOf("addEventListener('aiw:inspect-details'"), ux.indexOf('export function showBuilding('));
assert.match(toggleBody, /collapsed:preferred\?\?!detailsOpensByItself\(\{held:!!id,glance:/, 'the default asks the rule');
assert.match(ruleBody, /&&detailsOpensByItself\(\{held:true\}\)/, 'a selection asks the rule');
assert.match(ruleBody, /export function openWorkspaceDetails\(\{byItself=false\}=\{\}\)\{if\(byItself&&!selectionOpensDetails\(\)\)return;/, 'an opening by itself asks it');
assert.match(selectionBody, /if\(e\?\.detail\?\.unlessClosed&&!selectionOpensDetails\(\)\)return;/, 'revealReading’s path asks it');
assert.match(app, /window\.addEventListener\('aiw:subject',[^\n]*holdSubject\(id\);openWorkspaceDetails\(\{byItself:true\}\)/, 'announceObject’s path asks it');
assert.doesNotMatch(ux, /min-width:\s*701px/, 'no second width decides when the column opens');
pass('The default and both of a Model selection’s paths share the one predicate; no other width decides');

console.log(JSON.stringify({suite: 'details-toggle', checks: checks.length, passed: checks}, null, 1));
await w.happyDOM?.abort?.(); w.close?.();
