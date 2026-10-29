// Native exports use the real generators. PNG callback timing is controlled;
// these DOM checks do not claim browser rendering or raster fidelity.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Window} from 'happy-dom';
import {referenceProject} from './notation-fixtures.mjs';

const w = new Window({url: 'http://fixture.local/?chapter=4&tab=model'});
for (const key of ['window', 'document', 'history', 'location', 'localStorage', 'CSS', 'CustomEvent', 'AbortController']) Object.defineProperty(globalThis, key, {value: key === 'window' ? w : w[key], configurable: true, writable: true});
for (const key of ['requestAnimationFrame', 'cancelAnimationFrame']) globalThis[key] = w[key].bind(w);
const {modelStage, toolsHTML} = await import('./public/model-stage.js');
const {adoptProject} = await import('./public/project-context.js');
const {createNotation} = await import('./public/notation-view.js');
const {codeFile, CODE_FORMATS} = await import('./public/notation-code.js');

let downloads = [], urls = new Map(), images = [], canvases = [], nextURL = 0, writes = 0;
const realCreateURL = URL.createObjectURL, realRevokeURL = URL.revokeObjectURL;
URL.createObjectURL = blob => { const url = 'blob:fixture-' + ++nextURL; urls.set(url, blob); return url; };
URL.revokeObjectURL = url => urls.delete(url);
w.HTMLAnchorElement.prototype.click = function () { downloads.push({name: this.download, blob: urls.get(this.href)}); };
globalThis.Image = class { set src(value) { images.push(this); this.source = value; } };
w.HTMLCanvasElement.prototype.getContext = () => ({scale() {}, fillRect() {}, drawImage() {}});
w.HTMLCanvasElement.prototype.toBlob = function (ready, type) { canvases.push({width: this.width, height: this.height, ready, type}); };

const shell = () => `<div class="cm-top"><div class="cm-views"></div></div><div class="cm-bar"><div class="cm-lenses"></div></div><div class="cm-stage" tabindex="0"><div class="cm-world"><svg class="cm-svg"></svg><div class="cm-html"></div></div><div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div></div><div class="cm-walk"><p class="cm-state"></p>${toolsHTML('test')}</div>`;
let root, stage, notation, store, primary, render;
function setup() {
  stage?.dispose(); root?.remove(); localStorage.clear(); adoptProject('bank-payment');
  history.replaceState({}, '', '/?chapter=4&tab=model'); downloads = []; urls.clear(); images = []; canvases = [];
  store = {value: {document: referenceProject(), revision: 1}, command() { writes++; }};
  window.aiwProjectStore = store; primary = null;
  root = document.createElement('section'); root.className = 'cm'; root.innerHTML = shell(); document.body.append(root);
  // Happy DOM's HTML parser drops SVG content after an inline style. Preserve the
  // renderer's SVG namespace through its XML parser for these DOM assertions.
  const svg = root.querySelector('.cm-svg');
  Object.defineProperty(svg, 'innerHTML', {get() { return [...this.childNodes].map(n => new w.XMLSerializer().serializeToString(n)).join(''); }, set(markup) { const parsed = new w.DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + markup + '</svg>', 'image/svg+xml'); this.replaceChildren(...[...parsed.documentElement.childNodes].map(n => document.importNode(n, true))); }});
  stage = modelStage(root, {headHeight: () => 0, railWidth: () => 0}); stage.bind();
  notation = createNotation({chapter: 4, root, stage, project: () => store.value.document, onSelect: id => { primary = id; render(); }});
  notation.state.scene = 'logical'; notation.state.arrangement = 'tree';
  render = view => { const layout = notation.render({sel: primary, view}); root.querySelector('.cm-lenses').innerHTML = notation.barHTML(); stage.use(layout, notation.state.view + '|' + notation.arrangement()); stage.apply(); };
  notation.onChange = () => render();
  root.addEventListener('click', event => { if (notation.handle(event)) return; const node = event.target.closest('.nt-node'); if (node) { primary = node.dataset.ntNode; render(); } });
  root.addEventListener('change', event => notation.change(event)); render();
}
const button = id => root.querySelector(`[data-nt="export"][data-id="${id}"]`);
const status = () => root.querySelector('.cm-export-status').textContent;
const expected = format => codeFile(format, notation.diagram(), notation.layout(), {project: store.value.document, chapter: 4}).text;

setup(); const before = JSON.stringify(store.value.document);
for (const id of ['svg', 'png', 'structurizr', 'plantuml', 'mermaid', 'drawio', 'archimate', 'manifest']) assert.ok(button(id), id + ' remains in the initial menu');
assert.equal(button('bpmn'), null, 'scene restrictions remain unchanged');
button('svg').click(); assert.equal(downloads.length, 1); assert.equal(await downloads[0].blob.text(), notation.svgString());
button('png').click(); assert.equal(images.length, 1, 'PNG starts decoding immediately');
images[0].onload(); assert.equal(canvases[0].width, notation.layout().W * 2); assert.equal(canvases[0].type, 'image/png');
canvases[0].ready(new Blob(['controlled raster'], {type: 'image/png'})); assert.match(downloads[1].name, /-ch4-logical-tree.*\.png$/);
for (const format of CODE_FORMATS.filter(f => !f.scenes)) {
  const count = downloads.length; button(format.id).click();
  assert.equal(downloads.length, count + 1, format.id + ' retains synchronous download behavior');
  assert.equal(await downloads.at(-1).blob.text(), expected(format.id), format.id + ' uses the exact current diagram and geometry');
}
const files = notation.files(); assert.ok(Array.isArray(files), 'files() preserves the synchronous file-set API');
assert.equal(files.length, 6, 'the file set preserves SVG and every format available for the scene');
assert.equal(files[0].text, notation.svgString());
for (const format of CODE_FORMATS.filter(f => !f.scenes)) assert.equal(files.find(f => f.path.endsWith('.' + format.ext)).text, expected(format.id));
button('manifest').click(); const manifest = JSON.parse(await downloads.at(-1).blob.text());
assert.equal(manifest.schema, 'aiw.diagram-manifest/1'); assert.equal(manifest.project, store.value.document.name); assert.equal(manifest.scene, 'logical'); assert.equal(manifest.arrangement, 'tree'); assert.equal(manifest.figures.length, files.length);
for (const file of files) {
  const entry = manifest.figures.find(f => f.path === file.path); assert.ok(entry);
  assert.equal(entry.sha256, createHash('sha256').update(file.text).digest('hex'));
  assert.equal(entry.bytes, Buffer.byteLength(file.text)); assert.equal(entry.mediaType, file.mediaType); assert.equal(entry.documentFingerprint, String(store.value.document.contentVersion ?? ''));
}
assert.equal(JSON.stringify(store.value.document), before, 'downloads and manifest generation preserve the saved document');

// Neither asynchronous PNG stage may use a new view's size, file name or data.
for (const change of ['project', 'document', 'revision', 'selection', 'edge', 'layout', 'view', 'own', 'route', 'surface', 'detached']) {
  setup(); button('png').click(); const image = images[0], oldURL = image.source;
  if (change === 'project') { adoptProject('another-project'); document.dispatchEvent(new w.CustomEvent('aiw:project-switched')); }
  if (change === 'document') store.value.document = {...store.value.document, name: 'A newer design'};
  if (change === 'revision') store.value.revision++;
  if (change === 'selection') root.querySelector('[data-nt-node="api"]').dispatchEvent(new w.MouseEvent('click', {bubbles: true}));
  if (change === 'edge') notation.state.selEdge = notation.diagram().edges[0].id;
  if (change === 'layout') { notation.state.arrangement = 'by-layer'; render(); }
  if (change === 'view') render('layers');
  if (change === 'own') notation.ownView();
  if (change === 'route') history.replaceState({}, '', '/?chapter=4&tab=work&object=api');
  if (change === 'surface') root.querySelector('.cm-world').replaceChildren();
  if (change === 'detached') root.remove();
  image.onload(); assert.equal(canvases.length, 0, change + ' cancels late image decoding');
  assert.equal(downloads.length, 0); assert.equal(urls.has(oldURL), false, change + ' releases the image URL'); assert.doesNotMatch(status(), /retry|Preparing/);
}
setup(); button('png').click(); images[0].onload();
assert.equal(canvases.length, 1); render('layers'); canvases[0].ready(new Blob(['late raster'], {type: 'image/png'})); assert.equal(downloads.length, 0, 'late PNG encoding cannot download under a new view');
setup(); button('png').click(); images[0].onerror(); assert.match(status(), /Choose PNG again to retry/); assert.equal(urls.has(images[0].source), false);
button('png').click(); assert.equal(status(), ''); images[1].onload(); canvases[0].ready(new Blob(['retried raster'], {type: 'image/png'})); assert.equal(downloads.length, 1, 'a failed PNG can retry without reloading');
setup(); button('png').click(); store.value.revision++; images[0].onerror(); assert.equal(status(), '', 'a stale image failure cannot replace the current context with an error');
assert.equal(writes, 0);
stage.dispose(); root.remove(); await w.happyDOM.close(); URL.createObjectURL = realCreateURL; URL.revokeObjectURL = realRevokeURL;
console.log('Notation export context: unchanged native formats and synchronous files API; exact diagram, geometry and SHA-256 Manifest; captured PNG decoding/encoding context; URL cleanup; retry; stale-failure suppression; no document writes passed.');
