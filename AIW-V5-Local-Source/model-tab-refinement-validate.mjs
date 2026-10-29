// Regression checks for the actual user failures: misleading mixed-record headings,
// missing chapter inventory, stale view intent, and inconsistent canvas zoom state.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {chapterRecordSet} from './public/chapter-records.js';
import {tableModel, tableRows, tableHTML, tableColumns, tableRecordHTML} from './public/model-table.js';
import {currentModelPurpose, questionPickerHTML, ownViews, viewsOffered} from './public/instrument-tray.js';
import {createProject} from './shared/projects-domain.js';
import {matrixModel, matrixView} from './public/model-matrix.js';

const p = withFinalReview(seedProject()), before = JSON.stringify(p);
for (let chapter = 1; chapter <= 11; chapter++) {
  const T = tableModel(p, chapter), ids = new Set(T.rows.map(r => r.id));
  for (const record of chapterRecordSet(p, chapter).records) assert.ok(ids.has(record.id), `Chapter ${chapter} table includes ${record.type} ${record.id}`);
  assert.equal(ids.size, T.rows.length, 'a canonical record is never duplicated by the assessable-record supplement');
  assert.equal(T.registerCount + T.additionalCount, T.rows.length);
  for (const row of T.rows) assert.ok(row.fields.every(([label]) => label), 'every field names its own meaning');
}
assert.ok(tableModel(p, 1).rows.some(r => r.type === 'actor'));
assert.ok(tableModel(p, 10).rows.some(r => r.type === 'instance'));
assert.ok(tableModel(p, 11).rows.some(r => r.id === 'SDD'), 'the useful SDD entry is retained outside the canonical graph register');
const logical = tableModel(p, 4), deployment = tableModel(p, 10);
assert.ok(logical.rows.filter(r => r.type === 'module').every(r => r.layer === 'logical'), 'canonical groups keep their logical layer');
assert.equal(tableRows(logical, {layers: []}).shown.length, 0, 'hiding every layer also hides supplemental groups');
const matrix = matrixModel(p, {rows: 'module', cols: 'responsibility'});
assert.ok(matrix.rows.every(r => r.layer === 'logical'));
assert.equal(matrixView(matrix, {layers: []}).shownRows.length, 0, 'Matrix uses the same group layer as Table');
assert.ok(deployment.rows.every(r => r.layer === 'deployment'), 'runtime containers, placements and paths share the deployment layer');
assert.match(tableRecordHTML(deployment, p.runtime.placements[0].id), /data-nt-record=.*Planned placement/, 'supporting records have a generic selected reading');

const q = structuredClone(p), data = q.interfaces.data[0], contract = q.interfaces.contracts[0];
data.retentionDays = 45; contract.contractVersion = 'v2';
q.artefacts.find(r => r.type === 'actor').role = 'Regression investigator';
q.artefacts.find(r => r.type === 'actor').owner = '<img src=x onerror=alert(1)>';
const window = new Window({url: 'http://aiw.local/?chapter=5&tab=model'});
const document = window.document;
const blank = createProject({name: 'Question prerequisites', template: 'blank'}, 'question-prerequisites');
for (let chapter = 1; chapter <= 11; chapter++) {
  document.body.innerHTML = questionPickerHTML(blank, chapter, ownViews(chapter)[0].id);
  for (const view of ownViews(chapter)) {
    const button = document.querySelector(`[data-cm-question="${view.id}"]`), later = viewsOffered(blank, chapter).later.find(x => x.view.id === view.id);
    assert.ok(button, `Chapter ${chapter} explains ${view.label}, even before its prerequisite exists`);
    assert.equal(button.disabled, !!later);
    if (later) assert.ok(button.textContent.includes(later.word), 'a disabled question explains the missing record');
  }
  assert.equal(document.querySelector('[data-cm-question="modules"]').disabled, true);
  assert.equal(document.querySelectorAll('[aria-current="true"]').length, 1);
}
const savedQuestion = structuredClone(p);
savedQuestion.workbench ||= {};
savedQuestion.workbench.views = [{id: 'saved-question', chapter: 5, title: '<img src=x onerror=alert(1)>', purpose: 'How does <script> cross this boundary?', exploration: {concern: 'structure'}}];
document.body.innerHTML = questionPickerHTML(savedQuestion, 5, 'saved-question');
assert.equal(document.querySelectorAll('img,script').length, 0, 'saved perspective questions escape project text');
assert.equal(document.querySelector('[data-cm-perspective="saved-question"]').getAttribute('aria-current'), 'true');
const security = tableModel(q, 9), control = q.security.controls[0], threat = q.security.threats[0];
assert.equal(security.columns.find(c => c.key === 'field:category').label, 'Category', 'shared categories never borrow the first record type’s heading');
assert.equal(security.columns.find(c => c.key === 'field:owner').label, 'Owner');
document.body.innerHTML = tableHTML(security, {chapter: 9});
assert.equal(document.querySelector(`[data-nt-row="${control.id}"] td[title="Control category"]`).textContent, control.category);
assert.equal(document.querySelector(`[data-nt-row="${threat.id}"] td[title="Threat category"]`).textContent, threat.category);
assert.equal(document.querySelector(`[data-nt-row="${control.id}"] td[title="Control owner"]`).getAttribute('aria-label'), 'Control owner: ' + control.owner);
assert.ok(tableRows(security, {sort: 'field:category'}).shown.some(r => r.id === control.id), 'neutral headings retain existing sort keys');
document.body.innerHTML = tableHTML(tableModel(q, 8), {chapter: 8});
const dataRow = document.querySelector(`[data-nt-row="${data.id}"]`);
assert.ok(dataRow.textContent.includes('Retention duration (days)45'));
assert.ok(!dataRow.textContent.includes('Contract version'), 'data values are not described as contract fields');
assert.ok(document.querySelector(`[data-nt-row="${contract.id}"]`).textContent.includes('Contract versionv2'));
assert.ok(![...document.querySelectorAll('thead th')].some(h => h.textContent.includes('Contract version')), 'a mixed table uses honest common headings');
const integration = tableModel(q, 8), technology = tableModel(q, 7);
assert.ok(integration.columns.some(c => c.key === 'field:operation'), 'Round 27 named contract fields remain sortable columns');
assert.equal(integration.rows.find(r => r.type === 'data').values.operation, undefined, 'data fields cannot leak into a contract column');
assert.ok(integration.columns.some(c => c.key === 'kind' && c.label === 'Record type'));
assert.ok(technology.rows.filter(r => r.type === 'realisation').every(r => r.values.selectionState === 'No option preferred'), 'product preference and decision status retain Round 27 meaning');
assert.ok(tableColumns(technology).length < technology.columns.length, 'empty named obligation columns remain folded');
assert.equal(tableColumns(technology, true).length, technology.columns.length, 'every folded field remains available');
const actors = tableRows(tableModel(q, 1), {filter: 'Regression investigator'}).shown;
assert.equal(actors.length, 1); assert.equal(actors[0].type, 'actor', 'new inventory fields are searchable');
const safe = tableHTML(tableModel(q, 1), {chapter: 1});
assert.ok(safe.includes('&lt;img src=x onerror=alert(1)&gt;'));
assert.ok(tableRecordHTML(tableModel(q, 1), actors[0].id).includes('&lt;img src=x onerror=alert(1)&gt;'), 'selected readings escape recorded field values too');
document.body.innerHTML = safe; assert.equal(document.querySelectorAll('img').length, 0);
assert.equal(tableRows(tableModel(q, 8), {sort: 'removed-column'}).shown[0].ref, tableRows(tableModel(q, 8)).shown[0].ref, 'old sort preferences recover to the reference');
assert.equal(JSON.stringify(p), before, 'views never mutate architecture facts');

Object.assign(globalThis, {window, document, location: window.location, history: window.history, localStorage: window.localStorage,
  MutationObserver: window.MutationObserver, CustomEvent: window.CustomEvent, CSS: window.CSS, AbortController: window.AbortController,
  requestAnimationFrame: cb => window.setTimeout(cb, 0), cancelAnimationFrame: id => window.clearTimeout(id)});
window.aiwProjectStore = {value: {document: p}};
const {attachPerspectives} = await import('./public/perspective-view.js');
document.body.innerHTML = '<div class="studio"><div class="stage tab-content"><section class="cm rz"><header class="cm-top"><div class="cm-views"><button class="cm-view" data-id="diagram">Diagram</button><button class="cm-view" data-id="components" aria-pressed="true">Components</button><button class="cm-view" data-id="specification">Specification</button></div><div class="cm-actions"></div></header></section></div></div>';
const contexts = []; window.addEventListener('aiw:model-context', e => contexts.push(e.detail));
attachPerspectives(5, {});
assert.match(contexts.at(-1).text, /What components realise/);
assert.equal(document.querySelector('.cm-view-context'), null, 'the Model publishes context to the shell instead of adding a second purpose row');
assert.equal(document.querySelectorAll('.cm-qpick').length, 1, 'one question guide complements the existing view rail');
assert.equal(document.querySelector('[data-cm-question="components"]').getAttribute('aria-current'), 'true');
document.querySelector('[data-id="components"]').setAttribute('aria-pressed', 'false');
document.querySelector('[data-id="specification"]').setAttribute('aria-pressed', 'true');
await new Promise(resolve => setTimeout(resolve, 0));
assert.match(contexts.at(-1).text, /What do we know about one component/);
assert.equal(contexts.at(-1).view, 'specification');
assert.equal(document.querySelector('[data-cm-question="specification"]').getAttribute('aria-current'), 'true', 'the guide follows the actual active view');
document.body.insertAdjacentHTML('afterbegin', '<p id="tab-purpose" class="tab-purpose">Shell-owned purpose</p>');
attachPerspectives(5, {});
assert.equal(document.querySelector('#tab-purpose').textContent, 'Shell-owned purpose', 'a Model view never rewrites shell markup');
assert.equal(document.querySelectorAll('.cm-view-context').length, 0);
assert.match(currentModelPurpose(p, 8, 'diagram', 'lineage').text, /transformed into what/, 'standard picture purpose follows its actual scene');

const {modelStage, toolsHTML, modelChrome} = await import('./public/model-stage.js');
const canvas = document.createElement('section'); canvas.className = 'cm';
canvas.innerHTML = '<div class="cm-stage"><div class="cm-world"><svg class="cm-svg"></svg></div><div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div></div>' + toolsHTML('test');
document.body.append(canvas);
const stage = modelStage(canvas, {headHeight: () => 0, railWidth: () => 0});
stage.use({W: 1200, H: 800}, 'test'); stage.bind(); stage.zoomAt(.65, 450, 260);
assert.equal(canvas.querySelector('[data-cm-camera="actual"]').textContent, '65%');
canvas.querySelector('[data-cm-camera="actual"]').click();
assert.equal(stage.cam.z, 1); assert.equal(canvas.querySelector('[data-cm-camera="actual"]').textContent, '100%');
assert.equal(canvas.querySelector('[data-test="fit"]').getAttribute('aria-label'), 'Fit the whole picture');
let cameraWidth = 600;
Object.defineProperty(canvas.querySelector('.cm-stage'), 'clientWidth', {get: () => cameraWidth});
stage.use({W: 2400, H: 800}, 'readable-opening'); stage.fit(); stage.apply();
assert.equal(stage.cam.z, 1, 'native drawings open at a readable actual-size floor');
stage.zoomAt(1.2, 300, 260); cameraWidth = 1000;
stage.use({W: 2400, H: 800}, 'readable-opening'); stage.fit();
assert.equal(stage.cam.z, 1.2, 'a chosen zoom survives the companion closing or another frame resize');
stage.fitAll(); assert.ok(stage.cam.z < 1, 'explicit whole-picture Fit still shows a large drawing at overview scale');
stage.zoomAt(1, 500, 260);
assert.ok(canvas.querySelector('[data-model-labels]'), 'Round 27 label reader is retained');
assert.equal(canvas.querySelectorAll('[data-model-export]').length, 3, 'Round 27 view export formats are retained');
canvas.classList.add('nt-sheet-on');
const sheet = document.createElement('div'); sheet.className = 'cm-sheet'; canvas.append(sheet); modelChrome(canvas);
canvas.querySelector('[data-test="zin"]').click();
assert.equal(sheet.style.zoom, '1.15');
assert.equal(canvas.querySelector('[data-cm-camera="actual"]').textContent, '115%', 'the footer reads the active Table/Matrix sheet camera');
canvas.querySelector('[data-cm-camera="actual"]').click();
assert.equal(sheet.style.zoom, '1');
assert.equal(canvas.querySelector('[data-cm-camera="actual"]').textContent, '100%');
sheet.dataset.anatomy = ''; sheet.innerHTML = '<div class="an-stage"><div class="an-world" style="transform:translate(0px,0px) scale(0.5)"></div></div><button data-an="zin"></button>';
// Happy DOM's WheelEvent omits MouseEvent modifier properties that browsers supply.
window.WheelEvent = class extends window.MouseEvent { constructor(type, options) { super(type, options); this.deltaY = options.deltaY; } };
const anatomyStage = sheet.querySelector('.an-stage'), anatomyWorld = sheet.querySelector('.an-world');
let anatomyZoom = .5, anatomyZoomClicks = 0;
anatomyStage.addEventListener('wheel', e => { assert.ok(e.ctrlKey); anatomyZoom *= Math.exp(-e.deltaY * .0022); anatomyWorld.style.transform = `translate(0px,0px) scale(${anatomyZoom})`; });
sheet.querySelector('[data-an="zin"]').addEventListener('click', () => { anatomyZoomClicks++; });
modelChrome(canvas);
assert.equal(canvas.querySelector('[data-cm-camera="actual"]').textContent, '50%');
canvas.querySelector('[data-test="zin"]').click(); assert.equal(anatomyZoomClicks, 1, 'the shared footer keeps forwarding native anatomy zoom');
canvas.querySelector('[data-cm-camera="actual"]').click();
assert.equal(anatomyZoom, 1, 'actual size resets through the existing anatomy camera handler');
assert.equal(canvas.querySelector('[data-cm-camera="actual"]').textContent, '100%');
anatomyWorld.style.transform = 'translate(0px,0px) scale(0.75)';
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(canvas.querySelector('[data-cm-camera="actual"]').textContent, '75%', 'readout follows subsequent anatomy camera changes');
canvas.classList.remove('nt-sheet-on'); modelChrome(canvas);
assert.equal(canvas.querySelector('[data-cm-camera="actual"]').textContent, '100%', 'returning to native view restores its own zoom reading');
stage.dispose(); window.happyDOM.abort();
console.log('Model refinement: all chapter inventories, honest typed fields, search, escaping, current purpose, assistance and actual-size zoom passed.');
