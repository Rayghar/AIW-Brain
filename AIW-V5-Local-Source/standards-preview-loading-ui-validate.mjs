// Controlled module arrival through the installed native workbench click handler.
// The real preview/validation engine opens in the existing dialogs after loading.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {referenceProject} from './notation-fixtures.mjs';
const w = new Window({url: 'http://fixture.local/?chapter=8&tab=work&object=rest'});
for (const key of ['window', 'document', 'history', 'location', 'localStorage', 'CustomEvent', 'Event', 'FormData', 'Node', 'Element', 'HTMLElement', 'MutationObserver', 'ResizeObserver', 'AbortController']) Object.defineProperty(globalThis, key, {value: key === 'window' ? w : w[key], configurable: true, writable: true});
for (const key of ['getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) globalThis[key] = w[key].bind(w);
const {workbenchHTML, installWorkbench, uninstallWorkbench} = await import('./public/workbench-ui.js');
const tools = await import('./public/standards-domain.js'), parser = await import('./public/contract-operation.js');
assert.equal(tools.httpOperation, parser.httpOperation); assert.equal(tools.contractOperation, parser.contractOperation);
assert.deepEqual(parser.httpOperation('POST /payments · proposed'), {method: 'post', path: '/payments', qualifier: 'proposed'});
assert.equal(parser.httpOperation('POST /payments needs review'), null);
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return {promise, resolve, reject}; };
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
let store, context, writes = 0;
function setup(loadStandards) {
  uninstallWorkbench();
  store = {value: {document: referenceProject(), revision: 1}, command: () => { writes++; throw Error('No save is authorized by opening a preview'); }};
  window.aiwProjectStore = store; context = {chapter: 8, tab: 'work', selected: {id: 'rest'}};
  document.body.innerHTML = '<main>' + workbenchHTML(store.value.document, context, 'design') + '</main>';
  installWorkbench({loadStandards});
}
const button = action => document.querySelector(`main [data-wb-action="${action}"]`);
const dialog = () => document.querySelector('.wb-dialog[open]');
const close = () => dialog()?.querySelector('[data-close]').click();
let gate = deferred(), loads = 0;
setup(() => { loads++; return gate.promise; });
assert.equal(loads, 0, 'opening an unrelated workspace never loads specification validation');
const open = button('schema'); open.click(); open.click();
assert.equal(open.disabled, true); assert.equal(open.getAttribute('aria-busy'), 'true'); assert.equal(dialog(), null);
await tick(); assert.equal(loads, 1, 'repeated clicks do not duplicate the import');
gate.resolve(tools); await tick();
assert.ok(dialog().querySelector('[name="schema"]')); assert.equal(open.disabled, false); assert.equal(open.getAttribute('aria-busy'), null);
const form = dialog().querySelector('form');
form.elements.schema.value = JSON.stringify({type: 'object', required: ['reference'], properties: {reference: {type: 'string'}}});
form.elements.sample.value = '{}'; form.dispatchEvent(new w.Event('submit', {bubbles: true, cancelable: true})); await tick();
assert.match(dialog().querySelector('[data-result]').textContent, /Payload needs revision/);
assert.match(dialog().querySelector('[data-result]').textContent, /reference: required/);
assert.equal(form.elements.sample.value, '{}', 'the existing schema editor retains the supplied payload');
close(); button('spec').click(); await tick();
assert.equal(loads, 1, 'a later specification import reuses the loaded engine');
assert.equal(dialog().querySelector('[type="submit"]').textContent, 'Preview operations'); close();

// A delayed arrival cannot open a dialog in a different project, selection,
// revision, URL context, replaced surface or workbench installation.
for (const change of ['project', 'selection', 'revision', 'route', 'surface', 'editor', 'disposed']) {
  gate = deferred(); setup(() => gate.promise); const source = button('spec'); source.click();
  if (change === 'project') store.value.document = {...store.value.document, id: 'another-project'};
  if (change === 'selection') { context = {...context, selected: {id: 'instruction'}}; workbenchHTML(store.value.document, context, 'design'); }
  if (change === 'revision') store.value.revision++;
  if (change === 'route') history.replaceState({}, '', '/?chapter=8&tab=work&object=instruction');
  if (change === 'surface') document.querySelector('main').replaceChildren();
  if (change === 'editor') { const newer = document.createElement('dialog'); newer.open = true; newer.innerHTML = '<input value="Unsaved newer input">'; document.body.append(newer); }
  if (change === 'disposed') uninstallWorkbench();
  gate.resolve(tools); await tick();
  assert.equal(dialog(), null, change + ' suppresses the late preview'); assert.equal(source.disabled, false);
  if (change === 'editor') assert.equal(document.querySelector('dialog input').value, 'Unsaved newer input');
  history.replaceState({}, '', '/?chapter=8&tab=work&object=rest');
}
// Two different optional actions share the import; only the latest chosen action opens.
gate = deferred(); loads = 0; setup(() => { loads++; return gate.promise; });
button('schema').click(); button('spec').click(); await tick(); assert.equal(loads, 1);
gate.resolve(tools); await tick(); assert.equal(document.querySelectorAll('.wb-dialog').length, 1);
assert.equal(dialog().querySelector('[type="submit"]').textContent, 'Preview operations'); close();
// Failure is shown only in the initiating context and can retry there without a reload.
loads = 0; setup(() => ++loads === 1 ? Promise.reject(Error('Synthetic offline module')) : Promise.resolve(tools));
button('schema').click(); await tick();
assert.match(dialog().querySelector('[role="alert"]').textContent, /Synthetic offline/);
dialog().querySelector('[data-wb-action="retry-standards"]').click(); await tick();
assert.equal(loads, 2); assert.ok(dialog().querySelector('[name="schema"]')); close();
gate = deferred(); setup(() => gate.promise); button('spec').click(); store.value.document = {...store.value.document, id: 'newer-project'};
gate.reject(Error('Stale offline response')); await tick(); assert.equal(dialog(), null, 'a stale failure cannot open an error over the new project');
assert.equal(writes, 0);
uninstallWorkbench(); await w.happyDOM.close();
console.log('Standards preview loading: zero eager load, deduplicated arrival, native schema validation and import dialogs, exact context guards, newer-input retention, failed-load retry, stale-failure suppression and synchronous operation parser passed.');
