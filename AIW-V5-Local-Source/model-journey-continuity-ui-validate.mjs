// Native DOM handlers and explicit viewport geometry, without a rendered browser.
// These checks follow one saved architectural subject through existing instruments.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {referenceProject} from './notation-fixtures.mjs';
import {applyWorkbenchCommand} from './public/workbench-domain.js';

const window = new Window({url: 'http://fixture.local/?chapter=4&tab=model&object=api'});
Object.assign(globalThis, {window, document: window.document, location: window.location, history: window.history,
  localStorage: window.localStorage, CSS: window.CSS, CustomEvent: window.CustomEvent, AbortController: window.AbortController,
  ResizeObserver: window.ResizeObserver, MutationObserver: window.MutationObserver,
  requestAnimationFrame: cb => window.requestAnimationFrame(cb), cancelAnimationFrame: id => window.cancelAnimationFrame(id)});
// Mounting a model reads provider status; it must never request generated advice here.
const reads = [];
globalThis.fetch = async (url, options = {}) => {
  assert.equal(options.method || 'GET', 'GET'); reads.push(String(url));
  assert.match(String(url), /^\/api\/intelligence\/(status\?mode=reasoning|reasonings)(?:&project=[\w-]+|\?project=[\w-]+)?$/);
  return new Response(JSON.stringify(String(url).includes('status') ? {configured: false} : {runs: []}), {status: 200});
};
let p = referenceProject();
for (const [chapter, concern, title, objectId] of [[4, 'structure', 'Responsibility view', 'api'], [5, 'realization', 'Application view', 'api-pod']]) {
  p = applyWorkbenchCommand(p, {type: 'workspace.view', payload: {title, chapter, tab: 'model', objectId,
    exploration: {concern, selectedId: objectId, mode: 'explore', context: 'functional'}}}, '2026-10-20T00:00:00Z', 'fixture').document;
}
const original = JSON.stringify(p); let writes = 0;
window.aiwProjectStore = {value: {document: p}, command: () => { writes++; throw Error('View navigation cannot write design records'); }};
const {modelStage, toolsHTML, modelChrome} = await import('./public/model-stage.js');
const {createNotation} = await import('./public/notation-view.js');
const {modelHeaderHTML} = await import('./public/instrument-tray.js');
const {adoptProject} = await import('./public/project-context.js');
const {LAYER_NAMES} = await import('./public/notation-model.js');
const {mountPerspective, leavePerspective, perspectivesOf} = await import('./public/perspective-view.js');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
// Happy DOM's HTML SVG parser drops content after an inline <style>. Parse SVG
// fragments as XML so the actual renderer's nodes and selection remain observable.
const parseSVG = svg => Object.defineProperty(svg, 'innerHTML', {
  get() { return [...this.childNodes].map(n => new window.XMLSerializer().serializeToString(n)).join(''); },
  set(markup) { const doc = new window.DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + markup + '</svg>', 'image/svg+xml'); this.replaceChildren(...[...doc.documentElement.childNodes].map(n => document.importNode(n, true))); }
});
document.body.innerHTML = '<div class="studio"><div class="stage tab-content"></div></div>';
const host = document.querySelector('.studio>.stage'), root = document.createElement('section'); root.className = 'cm';
root.innerHTML = `${modelHeaderHTML(4, 'test')}<div class="cm-bar"><div class="cm-lenses"></div></div><div class="cm-body"><div class="cm-stage" tabindex="0"><div class="cm-world"><svg class="cm-svg"></svg><div class="cm-html"></div></div><div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div></div><aside class="cm-panel"></aside></div><footer class="cm-walk"><p class="cm-state"></p>${toolsHTML('test')}</footer>`;
host.append(root); parseSVG(root.querySelector('.cm-svg'));
Object.defineProperty(root, 'clientWidth', {value: 800});
Object.defineProperties(root.querySelector('.cm-stage'), {clientWidth: {value: 800}, clientHeight: {value: 500}});
const stage = modelStage(root, {headHeight: () => 0, railWidth: () => 0}); stage.bind();
let primary = 'api';
const notation = createNotation({chapter: 4, root, stage, project: () => window.aiwProjectStore.value.document, onSelect: id => { primary = id; render(); }});
notation.state.scene = 'logical';
function render(view) {
  const layout = notation.render({sel: primary, view}); root.querySelector('.cm-lenses').innerHTML = notation.barHTML();
  stage.use(layout, notation.state.view); stage.apply(); modelChrome(root);
}
notation.onChange = () => render();
root.addEventListener('click', e => { if (notation.handle(e)) return; const b = e.target.closest('[data-test="view"]'); if (b) render(b.dataset.id); });
root.addEventListener('change', e => notation.change(e));
const choose = view => { const b = root.querySelector(`.cm-views>[data-id="${view}"]`); assert.ok(b); b.click(); assert.equal(notation.state.view, view); };
render('diagram');
assert.ok(root.querySelector('.nt-node.sel[data-nt-node="api"]'), 'Diagram starts on the held responsibility');
const reading = document.createElement('aside'); reading.innerHTML = notation.withSelected('<section><h4>Payment API</h4></section>', primary);
assert.equal(reading.querySelectorAll('[data-nt-dossier="api"]').length, 1, 'the shared saved-record dossier is immediately available for the held subject');
reading.innerHTML = notation.withSelected(reading.innerHTML, primary);
assert.equal(reading.querySelectorAll('[data-nt-dossier="api"]').length, 1, 'an existing dossier is reused without a duplicate reading');
choose('layers'); assert.ok(root.querySelector('.nt-node.sel[data-nt-node="api"]'), 'Layers follows the same architectural identity');
choose('table');
const sheet = root.querySelector('.cm-sheet');
Object.defineProperties(sheet, {clientWidth: {value: 800}, scrollWidth: {value: 800}});
let wrap = sheet.querySelector('.nt-table-wrap'); Object.defineProperty(wrap, 'scrollWidth', {value: 1600});
assert.equal(sheet.querySelector('tr[data-nt-row="api"]').getAttribute('aria-selected'), 'true', 'Table marks the same responsibility');
root.querySelector('[data-test="fit"]').click(); assert.equal(sheet.style.zoom, '0.5');
wrap.scrollTop = 240; wrap.scrollLeft = 160;
choose('cross');
assert.equal(sheet.style.zoom, '', 'Matrix begins at its own normal scale');
assert.equal(sheet.querySelector('.nt-table-wrap').scrollTop, 0, 'Matrix does not inherit the table reading position');
assert.ok(sheet.querySelector('.nt-x .sel [data-nt-row="api"]'), 'Matrix retains the held responsibility on its own axis');
root.querySelector('[data-test="zin"]').click(); assert.equal(sheet.style.zoom, '1.15', 'Matrix zoom starts from its displayed scale');
sheet.querySelector('.nt-table-wrap').scrollTop = 90;
choose('table');
assert.equal(sheet.style.zoom, '0.5'); assert.equal(sheet.querySelector('.nt-table-wrap').scrollTop, 240); assert.equal(sheet.querySelector('.nt-table-wrap').scrollLeft, 160);
choose('whole');
assert.equal(sheet.style.zoom, '', 'Whole design removes the table outer zoom before mounting its internal camera');
await import('./public/anatomy-view.js'); await tick();
assert.ok(sheet.querySelector('.an-world'), 'the existing Whole design mounted');
modelChrome(root);
const wholeZoom = Number(sheet.querySelector('.an-world').style.transform.match(/scale\(([\d.e+-]+)\)/)[1]);
assert.equal(root.querySelector('.cm-zoom-value').textContent, Math.round(wholeZoom * 100) + '%', 'the shared readout reports the actual Whole design scale');
choose('cross'); assert.equal(sheet.style.zoom, '1.15'); assert.equal(sheet.querySelector('.nt-table-wrap').scrollTop, 90);
choose('diagram'); assert.ok(root.querySelector('.nt-node.sel[data-nt-node="api"]'), 'the return to Diagram retains its primary subject');
adoptProject('journey-other'); window.aiwProjectStore.value.document = referenceProject();
document.dispatchEvent(new window.CustomEvent('aiw:project-switched')); primary = null; choose('table');
assert.equal(sheet.style.zoom, ''); assert.equal(sheet.querySelector('.nt-table-wrap').scrollTop, 0);
assert.equal(sheet.querySelector('[aria-selected="true"]'), null, 'a project change cannot reuse another project’s row selection');
stage.dispose(); root.remove();

adoptProject('bank-payment'); window.aiwProjectStore.value.document = p;
document.dispatchEvent(new window.CustomEvent('aiw:project-switched'));
const [logical, application] = perspectivesOf(p).slice(-2), handled = [];
const handles = {choose: (...args) => handled.push(args), chapterView: (...args) => handled.push(args)};
let visibleLayers = [];
window.aiwSetModelLayers = layers => { visibleLayers = [...layers]; };
assert.equal(mountPerspective(4, logical.id, {id: 'api'}, handles), true); await tick();
let perspective = host.querySelector('.pv'); parseSVG(perspective.querySelector('.cm-svg'));
Object.defineProperties(perspective.querySelector('.cm-stage'), {clientWidth: {value: 800}, clientHeight: {value: 500}});
const selection = () => perspective.querySelector('[data-pv-part="selection"]');
window.dispatchEvent(new window.CustomEvent('aiw:model-layers', {detail: ['physical']}));
assert.ok(selection().querySelector('.cm-spec').textContent.includes('hidden ' + LAYER_NAMES.logical + ' layer'));
assert.equal(selection().querySelector('.cm-spec-t b').textContent, p.logical.responsibilities.find(r => r.id === 'api').title);
assert.equal(window.aiwExplorationContext.selectedId, 'api', 'hiding a layer retains the held subject in the model context');
assert.equal(perspective.querySelector('.nt-node[data-nt-node="api"]'), null);
selection().querySelector('[data-pv="show-subject"]').click();
assert.deepEqual(new Set(visibleLayers), new Set(['physical', 'logical']), 'Show its layer reveals only the needed layer');
assert.ok(perspective.querySelector('.nt-node.sel[data-nt-node="api"]'), 'the subject returns selected in the drawing');
assert.equal(document.activeElement, perspective.querySelector('.cm-stage'), 'returning the subject puts keyboard navigation on the drawing');
assert.equal(selection().querySelector('[data-pv="show-subject"]'), null);

// Editor Escape and an open menu must not release the architectural subject.
const editor = document.createElement('input'); perspective.querySelector('.cm-stage').append(editor);
editor.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
assert.equal(window.aiwExplorationContext.selectedId, 'api'); editor.remove();
const menu = perspective.querySelector('.cm-fit-options'); menu.open = true;
menu.querySelector('button').dispatchEvent(new window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
assert.equal(menu.open, false); assert.equal(window.aiwExplorationContext.selectedId, 'api');
let routed = '';
window.aiwRoute = href => { routed = href; return true; };
perspective.querySelector(`.pv-pick [data-id="${application.id}"]`).click();
const route = new URL(routed, location.origin);
assert.equal(route.searchParams.get('chapter'), '5'); assert.equal(route.searchParams.get('modelView'), application.id); assert.equal(route.searchParams.get('object'), 'api', 'logical-to-physical exploration carries the held logical subject');
history.replaceState({}, '', route);
mountPerspective(5, application.id, {id: route.searchParams.get('object')}, handles);
assert.equal(window.aiwExplorationContext.selectedId, 'api');
assert.ok(perspective.querySelector('.nt-node.sel[data-nt-node="api"]'), 'the application perspective shows the same logical subject beside its implementation');
mountPerspective(4, logical.id, {id: 'api-pod'}, handles);
assert.match(selection().textContent, /Outside this perspective/);
assert.match(selection().textContent, /not drawn/);
assert.equal(perspective.querySelector('.nt-node.sel'), null, 'a subject outside this concern does not leave the previous node highlighted');
assert.equal(new URL(selection().querySelector('a').href).searchParams.get('object'), 'api-pod', 'the existing Whole design handoff names the held outside subject');
window.dispatchEvent(new window.CustomEvent('aiw:subject-release'));
assert.equal(selection().textContent, '');
leavePerspective();
assert.equal(writes, 0); assert.equal(JSON.stringify(p), original, 'navigation and display choices preserve architectural records');
assert.ok(reads.length > 0); assert.deepEqual(handled, []);
await window.happyDOM.close();
console.log('Model journey continuity: Diagram/Layers/Table/Matrix subject, per-sheet zoom/scroll, Whole design camera, project isolation, hidden-layer recovery, scoped Escape, logical-to-physical handoff and outside-concern reading passed.');
