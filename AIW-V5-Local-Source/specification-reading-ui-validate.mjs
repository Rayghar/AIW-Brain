// Native Specification reading: actual chapter handlers with a canonical saved
// project. DOM interaction evidence; rendered-browser acceptance is separate.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {referenceProject} from './notation-fixtures.mjs';
const window = new Window({url: 'http://fixture.local/?chapter=5&tab=model&model=specification&object=api-pod'});
Object.assign(globalThis, {window, document: window.document, location: window.location, history: window.history,
  localStorage: window.localStorage, CSS: window.CSS, CustomEvent: window.CustomEvent, MouseEvent: window.MouseEvent,
  AbortController: window.AbortController, ResizeObserver: window.ResizeObserver, MutationObserver: window.MutationObserver,
  requestAnimationFrame: cb => window.requestAnimationFrame(cb), cancelAnimationFrame: id => window.cancelAnimationFrame(id)});
globalThis.fetch = async (url, options = {}) => {
  assert.equal(options.method || 'GET', 'GET');
  assert.match(String(url), /^\/api\/intelligence\/(status\?mode=reasoning|reasonings)/);
  return new Response(JSON.stringify(String(url).includes('status') ? {configured: false} : {runs: []}));
};
let p = referenceProject();const original = JSON.stringify(p); let writes = 0;
window.aiwProjectStore = {value: {document: p}, command() { writes++; throw Error('Specification reading cannot write design records.'); }};
document.body.innerHTML = '<div class="studio"><div class="stage tab-content"></div></div>';
const {mountChapterModel, leaveChapterModel, realiseDebug} = await import('./public/realise-view.js');
const {adoptProject, setShellScopeId, shellScopeId, scopedProject} = await import('./public/project-context.js');
const {componentSheetHTML, componentSheet, SHEET_SECTIONS} = await import('./public/component-spec-view.js');
const {specReviewItems} = await import('./public/specification-reading.js');
const {componentSpec, reasoningFor} = await import('./public/design-spec.js');
const results = [], pass = x => results.push(x);
mountChapterModel({id: 'api-pod'});
const root = document.querySelector('.cm.rz'), sheet = () => root.querySelector('.rz-spec-sheet');
// rc40 W3: the sheet is the template's ten sections, all on the page, with a table of contents marking the current one.
const sectionIds = () => [...sheet().querySelectorAll('[data-spec-section]')].map(x => x.dataset.specSection);
const current = () => sheet().querySelector('.rz-spec-toc [data-rz="spec-section"][aria-current="true"]')?.dataset.id;
assert.ok(root.classList.contains('rz-specv'));
assert.equal(sheet().querySelector('.rz-spec').dataset.specOf, 'api-pod');
assert.equal(sheet().closest('.cm-world'), null);
assert.equal(root.querySelector('.cm-world .rz-spec'), null);
assert.equal(realiseDebug().L.kind, 'specification');
assert.equal(root.querySelector('.cm-world').style.transform, '', 'reading a specification never fits or scales prose through the canvas camera');
assert.deepEqual(sectionIds(), SHEET_SECTIONS.map(s => s.id), 'the ten sections of the template, in order, every one on the page');
assert.equal(sheet().querySelector('details[data-spec-section]'), null, 'no section is folded away');
assert.equal(current(), 'header');
assert.equal(root.querySelectorAll('.cm-lenses .cm-lens').length, 0, 'the lenses give way to the table of contents');
assert.deepEqual([...sheet().querySelectorAll('.rz-spec-toc [data-rz="spec-section"]')].map(b => b.dataset.id), SHEET_SECTIONS.map(s => s.id));
assert.match(sheet().querySelector('[data-spec-field="realises"]').textContent, /LR-001[\s\S]*role not stated/);
assert.ok(sheet().querySelector('[data-spec-driver] [data-spec-path]'));
assert.equal(sheet().querySelector('.rz-spec-chain, .rz-spec-position, .rz-spec-lens-note'), null, 'the sheet reads the template, without a generic chain, a position card or a lens note');
// The completeness ring and the omissions agree with the model's fields, and every omission links to where it is recorded.
const model = componentSheet(p, 'api-pod');
assert.equal(model.completeness.recorded + model.completeness.inferred + model.completeness.open, model.completeness.total);
assert.equal(sheet().querySelector('.rz-spec').dataset.specComplete, String(model.completeness.percent));
assert.equal(sheet().querySelector('[data-spec-omissions]').dataset.specOmissions, String(model.omissions.length));
assert.equal(sheet().querySelectorAll('[data-spec-omission]').length, model.omissions.length);
assert.deepEqual(model.omissions.map(o => o.id), model.fields.filter(f => f.counted && f.state === 'open').map(f => f.id), 'the omissions are exactly the open fields of the template');
for (const li of sheet().querySelectorAll('[data-spec-omission]')) { const a = li.querySelector('a[href*="chapter="]'); assert.ok(a && /Chapter \d+ · \S/.test(a.textContent), 'an omission names its chapter and section as a link: ' + li.textContent); }
for (const f of sheet().querySelectorAll('[data-spec-field]')) { const m = model.fields.find(x => x.id === f.dataset.specField); assert.ok(m, 'a rendered field is a field of the model: ' + f.dataset.specField); assert.equal(f.dataset.specState, m.state, 'the rendered state is the model’s: ' + m.id); }
for (const s of SHEET_SECTIONS.slice(1)) assert.ok(sheet().querySelector(`[data-spec-section="${s.id}"] [data-spec-field] :is(.rz-sl, .rz-spec-value, .rz-spec-empty-note, .rz-spec-table, .rz-spec-card)`), 'every section renders a linked value or a precise empty state: ' + s.id);
assert.equal(sheet().querySelectorAll('[data-spec-component] option').length, p.realisation.components.length);
assert.equal(sheet().querySelectorAll('.rz-spec-download a').length, 3);
pass('A normal-size reading sheet renders the template’s ten sections with the completeness ring, the omissions as links, the chooser and the document exports.');

sheet().scrollTop = 180;
root.querySelector('[data-rz="spec-section"][data-id="interfaces"]').click();
assert.equal(current(), 'interfaces');
assert.equal(document.activeElement.dataset.specSection, 'interfaces', 'a jump moves the keyboard to the section');
root.querySelector('[data-rz="spec-section"][data-id="qualities"]').click();
assert.equal(current(), 'qualities');
assert.match(sheet().querySelector('[data-spec-section="qualities"]').textContent, /No selected decision assesses it/);
assert.equal(sheet().querySelectorAll('.rz-spec-toc [aria-current="true"]').length, 1, 'one current section');
assert.deepEqual(sectionIds(), SHEET_SECTIONS.map(s => s.id), 'a jump never reorders or hides a section');
assert.equal(sheet().scrollTop, 180, 'a jump in a DOM without layout keeps the reading position; the browser suite reads the scroll');
pass('The table of contents moves between the sections and marks the one read, without reordering or folding them.');

const jump = sheet().querySelector('.rz-spec-omissions [data-rz="spec-section"]');assert.ok(jump, 'an omission jumps to its section');
jump.click();assert.equal(current(), jump.dataset.id);
assert.equal(document.activeElement.dataset.specSection, jump.dataset.id);
const chooser = sheet().querySelector('[data-spec-component]');chooser.focus();chooser.value = 'risk-engine';chooser.dispatchEvent(new window.Event('change', {bubbles: true}));
assert.equal(sheet().querySelector('.rz-spec').dataset.specOf, 'risk-engine');
assert.equal(new URLSearchParams(location.search).get('object'), 'risk-engine');
assert.ok(document.activeElement.matches('[data-spec-component]'), 'keyboard stays on the chooser after its content changes');
const returnLink = sheet().querySelector('[data-sel="api-pod"]');assert.ok(returnLink);returnLink.click();
assert.equal(sheet().querySelector('.rz-spec').dataset.specOf, 'api-pod');
assert.ok(document.activeElement.matches('[data-spec-component]'));
assert.equal(sheet().scrollTop, 180);
pass('Component navigation preserves the actual architectural identity, focus and its previous reading position.');

const C = componentSpec(reasoningFor(p), 'api-pod');
const questions = specReviewItems(C);assert.ok(questions.some(x => x.id === 'decisions'));
assert.ok(sheet().querySelector('[data-spec-question="decisions"] a[href*="chapter=3"]'));
assert.equal(sheet().querySelector('[data-a-action="edit"]').dataset.aId, 'api-pod');
assert.ok(sheet().querySelector('a[href*="chapter=4"][href*="object=api"]'));
assert.ok(sheet().querySelector('a[href*="chapter=8"]'));
assert.ok(sheet().querySelector('a[href*="chapter=10"]'));
assert.equal(writes, 0);assert.equal(JSON.stringify(p), original);
pass('Design questions and linked records open existing native destinations without writing or approving a design.');

if (process.env.AIW_SPEC_VISUAL_DIR) {
  const directory = path.resolve(process.env.AIW_SPEC_VISUAL_DIR);await mkdir(directory, {recursive: true});
  const index = await readFile('public/index.html', 'utf8'), cssFiles = [...index.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\/([^"]+)"/g)].map(m => m[1]);
  const css = (await Promise.all(cssFiles.map(f => readFile(path.join('public', f), 'utf8')))).join('\n');
  const visualProject = structuredClone(p);
  Object.assign(visualProject.realisation.components.find(c => c.id === 'api-pod'), {architecturalSolution: 'Separate instruction acceptance from posting. Keep the ledger result authoritative while the caller can resolve an uncertain outcome.', rationale: 'Protect the customer from a second financial effect when the first response is lost.', properties: [{concern: 'reliability', statement: 'A repeated instruction retains its recorded financial result.', mechanism: 'Use the reviewed operation identity at the posting boundary.', source: 'Illustrative design assumption; verification is pending.'}]});
  const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AIW · Component specification</title><style>' + css + '</style><body><main style="max-width:1320px;margin:0 auto"><section class="cm rz rz-specv cm-docked" style="height:auto;border:0"><div class="rz-spec-sheet" style="display:block;overflow:visible">' + componentSheetHTML(visualProject, 'api-pod') + '</div></section></main></body></html>';
  await writeFile(path.join(directory, 'specification-sheet.html'), html);
  console.log('Static HTML inspection fixtures: ' + directory + ' (actual product CSS and canonical synthetic data; no rendered browser claim).');
}

root.querySelector('[data-rz="view"][data-id="components"]').click();
assert.equal(root.classList.contains('rz-specv'), false);
assert.ok(root.querySelector('.cm-world .rz-card'), 'the native component graph remains available');
root.querySelector('[data-rz="view"][data-id="specification"]').click();
assert.equal(root.classList.contains('rz-specv'), true);
assert.equal(sheet().querySelector('.rz-spec').dataset.specOf, 'api-pod');
pass('Returning between the reading and the component graph retains the component and its native instruments.');

p = referenceProject();p.realisation.components.find(c => c.id === 'api-pod').title = 'Another project component';
adoptProject('another-project');window.aiwProjectStore.value.document = p;
document.dispatchEvent(new CustomEvent('aiw:project-switched'));
mountChapterModel({id: 'api-pod'});
root.querySelector('[data-rz="view"][data-id="specification"]').click();
assert.equal(sheet().scrollTop, 0);
assert.equal(current(), 'header', 'another project opens the sheet at its identity');
assert.deepEqual(sectionIds(), SHEET_SECTIONS.map(s => s.id));
assert.match(sheet().querySelector('.rz-spec-c h2').textContent, /Another project/);
assert.ok([...sheet().querySelectorAll('a[href^="/?"]')].every(a => a.getAttribute('href').includes('project=another-project')));
assert.equal(writes, 0);
pass('Switching projects resets reading state and every native destination retains the correct project.');

// A scoped chooser must offer only records the native selection can keep. Its
// selected specification still reads the saved project, including cross-module
// facts that the diagram projection deliberately omits.
p = referenceProject();
const requirements = p.artefacts.filter(x => x.type === 'requirement');
p.requirementGroups = {records: [
  {id: 'MOD-A', kind: 'module', role: 'business', title: 'Module A', memberIds: [requirements[0].id], rule: [], state: 'accepted'},
  {id: 'MOD-B', kind: 'module', role: 'business', title: 'Module B', memberIds: requirements.slice(1).map(x => x.id), rule: [], state: 'accepted'},
  {id: 'MOD-EMPTY', kind: 'module', role: 'business', title: 'Empty module', memberIds: [], rule: [], state: 'accepted'}
]};
p.logical.groups.forEach((g, i) => { g.requirementGroupIds = [i === 0 ? 'MOD-A' : 'MOD-B']; });
p.realisation.components.push({...p.realisation.components.find(c => c.id === 'risk-engine'), id: 'outside-risk', ref: 'APP-099', title: 'Outside scope component'});
p.logical.mappings.push({...p.logical.mappings.find(m => m.physicalId === 'risk-engine'), id: 'MAP-099', physicalId: 'outside-risk'});
p.realisation.connections.push({id: 'CON-099', from: 'api-pod', to: 'outside-risk', interaction: 'sync', label: 'Cross-module review', failure: 'Record the unavailable result'});
const scopedOriginal = JSON.stringify(p);
window.aiwProjectStore.value.document = p;
const openScope = id => {
  setShellScopeId(id);
  const url = new URL(location.href);
  if (id) url.searchParams.set('scope', id); else url.searchParams.delete('scope');
  history.replaceState({}, '', url.pathname + url.search);
  mountChapterModel({id: 'api-pod'});
};
openScope('MOD-A');
const scopedIds = scopedProject().realisation.components.map(c => c.id);
assert.ok(scopedIds.length > 0 && !scopedIds.includes('outside-risk'));
assert.deepEqual([...sheet().querySelectorAll('[data-spec-component] option')].map(x => x.value), scopedIds);
for (const id of scopedIds) {
  const chooser = sheet().querySelector('[data-spec-component]');
  chooser.value = id;chooser.dispatchEvent(new window.Event('change', {bubbles: true}));
  assert.equal(sheet().querySelector('.rz-spec').dataset.specOf, id, 'every offered scoped component stays selected');
  assert.equal(realiseDebug().S.sel, id);
  assert.equal(sheet().querySelector('[data-a-action="edit"]').dataset.aId, id);
  assert.equal(shellScopeId(), 'MOD-A');
  assert.equal(new URLSearchParams(location.search).get('scope'), 'MOD-A');
}
const scopedChooser = sheet().querySelector('[data-spec-component]');
scopedChooser.value = 'api-pod';scopedChooser.dispatchEvent(new window.Event('change', {bubbles: true}));
assert.match(sheet().querySelector('[data-spec-section="interfaces"] [data-spec-interaction="CON-099"]').textContent, /Outside scope component[\s\S]*no contract records it/, 'a cross-module interaction without a contract is a row of the interfaces table, said as open');
const outsideLink = sheet().querySelector('[data-scope-link][href*="object=outside-risk"]');
assert.ok(outsideLink, 'An out-of-scope related component uses an explicit whole-design navigation, never an unselectable local chooser button.');
assert.equal(new URL(outsideLink.href).searchParams.get('scope'), null);
assert.equal(sheet().querySelector('[data-sel="outside-risk"]'), null);
assert.deepEqual(sectionIds(), SHEET_SECTIONS.map(s => s.id));
assert.ok([...sheet().querySelectorAll('a[href^="/?"]')].every(a => a.getAttribute('href').includes('project=another-project')));
pass('Scoped choices stay selected, while the complete specification retains canonical cross-module facts and native edit/project identities.');

openScope('MOD-EMPTY');
assert.deepEqual(scopedProject().realisation.components, []);
assert.ok(sheet().querySelector('.rz-spec.empty'));
assert.match(sheet().querySelector('.rz-spec-empty h2').textContent, /No application components in this scope/);
assert.match(sheet().querySelector('.rz-spec-empty p').textContent, /Empty module/);
assert.equal(sheet().querySelector('[data-spec-component], .rz-spec-choices, [data-spec-of]'), null);
assert.equal(realiseDebug().S.sel, null);
assert.equal(shellScopeId(), 'MOD-EMPTY');
assert.equal(new URLSearchParams(location.search).get('scope'), 'MOD-EMPTY');
assert.ok(sheet().querySelector('[data-a-action="new"]'));
assert.ok(sheet().querySelector('a[href*="chapter=4"][href*="project=another-project"]'));
assert.equal(writes, 0);assert.equal(JSON.stringify(p), scopedOriginal);
pass('An empty module has a named scoped empty state, clears stale selection, retains native creation, and never offers inaccessible components or changes scope.');
leaveChapterModel();await window.happyDOM.abort();window.close();
console.log(JSON.stringify({passed: results.length, checks: results}, null, 2));
