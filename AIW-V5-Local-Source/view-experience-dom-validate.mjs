// DOM interaction contract for the chapter's question chooser. The picker uses
// the existing view button, so its selection and keyboard behavior cannot fork.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';

const window = new Window({url: 'http://aiw.local/?chapter=5&tab=model'});
Object.assign(globalThis, {window, document: window.document, location: window.location, history: window.history,
  localStorage: window.localStorage, MutationObserver: window.MutationObserver, CustomEvent: window.CustomEvent,
  CSS: window.CSS, requestAnimationFrame: cb => cb()});
window.aiwProjectStore = {value: {document: withFinalReview(seedProject())}};
const {attachPerspectives} = await import('./public/perspective-view.js');
const {modelHeaderHTML} = await import('./public/instrument-tray.js');
document.body.innerHTML = `<div class="studio"><div class="stage tab-content"><section class="cm rz">${modelHeaderHTML(5,'rz')}</section></div></div>`;
document.querySelector('.cm-view[data-id="components"]').setAttribute('aria-pressed', 'true');
let clicked = 0;
document.querySelector('.cm-view[data-id="specification"]').addEventListener('click', () => clicked++);
attachPerspectives(5, {});
assert.equal(document.querySelectorAll('.cm-qpick').length, 1);
const pick = document.querySelector('.cm-qpick');
assert.ok(document.querySelector('.cm-actions>.pv-pick'), 'the saved perspectives remain next to the question chooser');
pick.open = true;
const questions = [...pick.querySelectorAll('[data-cm-question]')];
assert.ok(questions.length > 0, 'Questions offers the existing model instruments');
for (const question of questions) {
  if (question.disabled) assert.ok(question.querySelector('small').textContent.trim(), 'An unavailable question explains the missing prerequisite');
  else assert.ok(document.querySelector(`.cm-views>.cm-view[data-id="${question.dataset.cmQuestion}"]`), 'Each available question opens an existing instrument');
}
assert.ok(pick.querySelector('[data-cm-question="components"][aria-current="true"]'), 'the current instrument is identified');
assert.match(pick.textContent, /What do we know about one component/);
assert.equal(clicked, 0, 'reading Questions never changes the view');
pick.querySelector('summary').focus();
pick.querySelector('summary').dispatchEvent(new window.KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
assert.equal(pick.open, true, 'the down arrow opens questions');
assert.ok(pick.contains(document.activeElement), 'the keyboard enters the question list');
document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
assert.equal(pick.open, false, 'Escape closes questions');
pick.open = true;
pick.querySelector('[data-cm-question="specification"]').click();
assert.equal(clicked, 1, 'choosing a question invokes the existing view action exactly once');
assert.equal(pick.open, false, 'choosing a question closes the menu');
assert.equal(document.activeElement, document.querySelector('.cm-view[data-id="specification"]'), 'focus follows the chosen instrument');
attachPerspectives(5, {});
assert.equal(document.querySelectorAll('.cm-qpick').length, 1, 'remounting a chapter does not duplicate controls');
console.log('Model Questions DOM: exact native instrument targets, current question, deliberate navigation, keyboard focus and no duplicate toolbar controls passed.');
await window.happyDOM.close();
