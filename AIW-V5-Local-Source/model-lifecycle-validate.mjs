import assert from 'node:assert/strict';
import {Window} from 'happy-dom';

const window = new Window({url: 'http://fixture.local/?chapter=1&tab=model'});
Object.assign(globalThis, {
  window, document: window.document, location: window.location,
  AbortController: window.AbortController,
  requestAnimationFrame: cb => window.requestAnimationFrame(cb),
  cancelAnimationFrame: id => window.cancelAnimationFrame(id)
});
const {modelStage, modelChrome} = await import('./public/model-stage.js');
const root = document.createElement('section'); root.className = 'cm';
root.innerHTML = '<div class="cm-bar"><div class="cm-depth"><label class="sm-journey-picker">Journey<select><option>Retained journey</option></select></label></div></div><div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div><div class="cm-stage" tabindex="0"><div class="cm-world"><svg class="cm-svg"></svg><div class="cm-html"></div></div></div>';
document.body.append(root);
const control = root.querySelector('select'), originalHost = control.parentElement.parentElement;
modelChrome(root); root.remove();
assert.equal(control.parentElement.parentElement, originalHost, 'detaching the retained Model does not discard a moved Picture selector');
assert.equal(root.querySelectorAll('.cm-picture').length, 0);
modelChrome(root); document.body.append(root);
assert.equal(root.querySelectorAll('.cm-depth select').length, 1, 'a detached redraw preserves exactly one actionable selector');
originalHost.innerHTML = '<label class="sm-journey-picker">Journey<select><option>Fresh journey</option></select></label>';
modelChrome(root); assert.equal(root.querySelectorAll('select').length, 1); assert.match(root.querySelector('.cm-depth').textContent, /Fresh journey/);

const canvas = root.querySelector('.cm-stage');
Object.defineProperty(canvas, 'clientWidth', {value: 600});
Object.defineProperty(canvas, 'clientHeight', {value: 400});
const camera = modelStage(root, {headHeight: () => 0, railWidth: () => 0});
camera.use({W: 2400, H: 1600}, 'lifecycle'); camera.bind();
const pointer = (target, type, x, y) => target.dispatchEvent(new window.MouseEvent(type, {bubbles: true, button: 0, clientX: x, clientY: y}));
const drag = () => {
  pointer(canvas, 'pointerdown', 300, 150);
  pointer(window, 'pointermove', 240, 150);
  pointer(window, 'pointerup', 240, 150);
};
drag(); assert.equal(camera.cam.px, -60, 'initial model drag pans once');
root.remove(); pointer(window, 'pointermove', 200, 150); assert.equal(camera.cam.px, -60, 'an inactive model ignores pointer movement');
document.body.append(root); drag(); assert.equal(camera.cam.px, -120, 'returning from another tab keeps the same Model camera draggable');

camera.bind(); camera.bind();
const wheel = () => canvas.dispatchEvent(new window.WheelEvent('wheel', {bubbles: true, cancelable: true, deltaY: 40}));
wheel(); assert.equal(camera.cam.py, -40, 'rebinding replaces canvas listeners instead of multiplying scroll');
canvas.dispatchEvent(new window.KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'ArrowRight'}));
assert.equal(camera.cam.px, -180, 'keyboard panning also runs once after rebinding');
camera.dispose(); const stopped = {...camera.cam};
wheel(); drag(); canvas.dispatchEvent(new window.KeyboardEvent('keydown', {bubbles: true, key: 'ArrowRight'}));
assert.deepEqual(camera.cam, stopped, 'dispose stops pointer, wheel and keyboard camera actions');
camera.bind(); drag(); assert.equal(camera.cam.px, stopped.px - 60, 'an explicitly rebound stage works after disposal');
camera.dispose(); await window.happyDOM.close();
console.log('Model lifecycle: stable detached command hosts, redraw replacement, camera detach/remount, single rebind and complete disposal passed.');
