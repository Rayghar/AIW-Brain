// Synthetic DOM only; the action reveals existing model context and sends no provider request.
import assert from 'node:assert/strict';
import {revealSolCompanion} from './public/chapter-sol.js';
const {Window} = await import(process.env.AIW_DOM_MODULE || 'happy-dom');
const w = new Window({url: 'https://aiw.test/?chapter=1&tab=model&object=REQ-001'});
const original = {document: globalThis.document, window: globalThis.window};
Object.assign(globalThis, {document: w.document, window: w});
try {
  document.body.innerHTML = '<div id="brain-panel"><button data-brain-action="close">Close</button></div><div class="studio"><section class="cm cm-docked"><aside class="cm-panel" hidden><section class="cs-ask" id="hidden-copy"><button>Hidden Ask Sol</button></section></aside></section><aside id="inspector" class="model-companion"><button class="panel-toggle" aria-expanded="false">Show panel</button><div class="cm-companion"><details class="cp cp-sol"><summary>Sol</summary><section class="sr">Chapter review</section><section class="cs-ask" id="live-ask"><button data-dk="sol-ask">Ask Sol to assess it</button></section></details></div></aside></div>';
  let closed = false, expanded = false, scrolled = false;
  document.querySelector('[data-brain-action="close"]').onclick = () => { closed = true; };
  document.querySelector('.panel-toggle').onclick = e => { expanded = true; e.currentTarget.setAttribute('aria-expanded', 'true'); };
  document.querySelector('#hidden-copy').scrollIntoView = () => { throw Error('Never target the hidden internal companion'); };
  document.querySelector('#live-ask').scrollIntoView = () => { scrolled = true; };
  assert.equal(revealSolCompanion(), true);
  assert.ok(closed && expanded && scrolled);
  assert.equal(document.querySelector('.cp-sol').open, true, 'the Sol disclosure is opened, not only scrolled toward');
  assert.equal(document.activeElement, document.querySelector('#live-ask button'), 'keyboard focus reaches the visible action for the same selected record');

  document.body.innerHTML = '<section class="cm"><button aria-pressed="false" aria-label="Show the companion panel">Companion</button><aside class="cm-panel" hidden><section class="dk-solpend"><textarea>Existing question</textarea></section></aside></section>';
  const toggle = document.querySelector('button'), pending = document.querySelector('.dk-solpend');
  toggle.onclick = () => { toggle.setAttribute('aria-pressed', 'true'); document.querySelector('.cm-panel').hidden = false; };
  pending.scrollIntoView = () => {};
  assert.equal(revealSolCompanion(), true);
  assert.equal(document.querySelector('.cm-panel').hidden, false, 'standalone model uses its existing companion toggle');
  assert.equal(document.activeElement, pending.querySelector('textarea'), 'an existing source preview retains its question');
  document.body.innerHTML = '<p>No chapter model mounted</p>';
  assert.equal(revealSolCompanion(), false, 'absence of a companion does not throw or fabricate one');
} finally {
  for (const [key, value] of Object.entries(original)) if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
  await w.happyDOM.close();
}
console.log('PASS: Ask beside the model expands the existing docked or standalone companion, opens Sol, skips hidden copies and focuses the actual action or preview. Synthetic DOM only.');
