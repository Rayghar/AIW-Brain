// An empty logical chapter must explain the iterative path, without relaxing acceptance.
import assert from 'node:assert/strict';
const {Window} = await import(process.env.AIW_DOM_MODULE || 'happy-dom');
const w = new Window({url: 'https://aiw.test/?project=decision-loop&chapter=3&tab=work&section=record'});
for (const key of ['window', 'document', 'history', 'location', 'localStorage', 'CustomEvent', 'Event', 'FormData', 'Node', 'Element', 'HTMLElement', 'MutationObserver', 'navigator']) Object.defineProperty(globalThis, key, {value: key === 'window' ? w : w[key], configurable: true, writable: true});
for (const key of ['matchMedia', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) globalThis[key] = w[key].bind(w);
const {createProject} = await import('./shared/projects-domain.js');
const {createDecisionsStudio} = await import('./public/decisions.js');
const {decisionFindings, applyDecisionCommand} = await import('./public/decisions-domain.js');
const p = createProject({name: 'Decision loop fixture', template: 'bank-payment'}, 'decision-loop');
const responsibilities = p.logical.responsibilities;
p.logical.responsibilities = [];
const d = p.decisions.records[0]; d.status = 'recorded'; d.selectedAlternativeId = d.alternatives[0].id;
const store = {value: {document: p}, command() {throw Error('Orientation must not submit a command');}};
window.aiwProjectStore = store;
const studio = createDecisionsStudio(store);
const bridge = {state: {chapter: 3, tab: 'work', selected: d.id, cursor: false}, persist() {}, route() {}, toast() {}, render() {document.body.innerHTML = '<main>' + studio.work() + '</main><div id="dialog-host"></div>';}};
try {
  studio.bind(bridge);
  const before = JSON.stringify(p), findings = JSON.stringify(decisionFindings(p));
  for (const section of ['compare', 'record']) {
    studio.openSection(section); bridge.render();
    const hint = document.querySelector('[data-decision-prerequisite]'); assert(hint, section + ' explains the prerequisite');
    assert.match(hint.textContent, /each alternative needs/);
    assert.match(hint.textContent, /use Back to return/);
    assert.match(hint.textContent, /visit Chapter 4 before that handoff/);
    const url = new URL(hint.querySelector('a').href);
    assert.equal(url.searchParams.get('project'), p.id);
    assert.equal(url.searchParams.get('chapter'), '4');
    assert.equal(url.searchParams.get('tab'), 'work');
    assert.equal(url.searchParams.get('section'), 'responsibilities');
  }
  document.querySelector('[data-d-action="accept"]').click();
  assert(document.querySelector('#d-accept-form [data-decision-prerequisite]'), 'The blocked acceptance explains how to proceed');
  assert.equal(document.querySelector('#d-accept-form button[type="submit"]'), null, 'Content gaps still prevent acceptance');
  assert.throws(() => applyDecisionCommand(p, {type: 'decision.accept', payload: {id: d.id, acknowledge: true}}), 'Domain acceptance remains guarded');
  assert.equal(JSON.stringify(p), before, 'The guidance changes no saved records');
  assert.equal(JSON.stringify(decisionFindings(p)), findings, 'The guidance changes no findings');
  document.querySelector('[data-d-action="close"]').click();
  store.value.document = {...p, logical: {...p.logical, responsibilities}};
  studio.openSection('record'); bridge.render();
  assert.equal(document.querySelector('[data-decision-prerequisite]'), null, 'The empty-chapter guidance clears when responsibilities exist');
  console.log('PASS: Chapter 3 explains the provisional Chapter 4 return loop; exact project link; Compare/Record/acceptance context; unchanged checks and model; guidance clears when inputs exist.');
} finally {
  studio.dispose();
  await w.happyDOM.close();
}
