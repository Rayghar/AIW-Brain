// Two simultaneous views of one Sol request must respect the controls the user actually activated.
// Fetch is a synthetic application transport; no provider or network request occurs.
import assert from 'node:assert/strict';
import {SOL, solSend} from './public/brain-reasoning-ui.js';
const {Window} = await import(process.env.AIW_DOM_MODULE || 'happy-dom');
const w = new Window({url: 'https://aiw.test/?project=synthetic'}), doc = w.document;
doc.body.innerHTML = '<section class="dk-solpend" id="other"><textarea data-dk-in="sol-prompt">Wrong panel question</textarea><input type="checkbox" data-sol-semantic></section><section class="dk-solpend" id="clicked"><textarea data-dk-in="sol-prompt">Clicked panel question</textarea><input type="checkbox" data-sol-semantic checked><button data-dk="sol-send">Send to Sol</button></section>';
const packet = {stamp: 'synthetic-packet', items: [{id: 'M:1:REQ-001', title: 'Test record', kind: 'decision'}], sources: [], omissions: []};
const original = {document: globalThis.document, fetch: globalThis.fetch};
globalThis.document = doc;
const calls = [];
const draftCalls = [];
globalThis.fetch = async (url, options) => {
  if (String(url).includes('/api/knowledge/corpus')) return Response.json({results: []});
  const body = options?.body ? JSON.parse(options.body) : null;
  if (String(url).includes('/api/intelligence/draft')) { draftCalls.push({url:String(url),body}); return Response.json({revision:null,actorKey:'synthetic-actor',draft:null}); }
  calls.push({url: String(url), body});
  if (String(url).includes('reasoning-context')) return Response.json({packet});
  if (String(url).includes('/reason')) return Response.json({id: 'synthetic-run', status: 'completed', packet, result: {assessments: [{id: packet.items[0].id, verdict: 'judge'}]}});
  throw Error('Unexpected request: ' + url);
};
const prepare = (semantic = false, prompt = 'Original question') => Object.assign(SOL, {projectId: 'synthetic', epoch: 1, sequence: 0, config: {configured: true}, busy: false, runs: [], pending: {request: {ids: ['M:1:REQ-001'], prompt, semantic}, prompt, packet, title: 'Test record'}});
try {
  prepare();
  const clicked = doc.querySelector('#clicked');
  assert.equal(await solSend({panel: clicked}), null, 'changed disclosure first prepares a new preview');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.semantic, true);
  assert.equal(calls[0].body.prompt, 'Clicked panel question');
  assert.ok(calls[0].url.includes('reasoning-context'));
  assert.equal((await solSend({panel: clicked})).status, 'completed');
  assert.equal(calls[1].body.semantic, true, 'the request sends the exact reviewed disclosure');
  assert.equal(calls[1].body.prompt, 'Clicked panel question');

  prepare(true); calls.length = 0;
  doc.querySelector('#other [data-sol-semantic]').checked = true;
  clicked.querySelector('[data-sol-semantic]').checked = false;
  assert.equal(await solSend({panel: clicked}), null);
  assert.equal(calls[0].body.semantic, false, 'turning off semantic disclosure cannot be overridden by another panel');
  assert.equal(calls[0].body.prompt, 'Clicked panel question');

  prepare(); calls.length = 0;
  clicked.querySelector('[data-sol-semantic]').checked = true;
  await solSend({panel: clicked, prompt: 'Explicit caller question', semantic: false});
  assert.equal(calls[0].body.prompt, 'Explicit caller question');
  assert.equal(calls[0].body.semantic, false, 'explicit parameters stay supported');

  prepare(); calls.length = 0;
  assert.equal((await solSend()).status, 'completed');
  assert.equal(calls[0].body.semantic, false, 'a caller without a panel uses its prepared request, never arbitrary document controls');
  assert.equal(calls[0].body.prompt, 'Original question');
} finally {
  SOL.pending?.draft?.controller.dispose();
  globalThis.fetch = original.fetch;
  if (original.document === undefined) delete globalThis.document; else globalThis.document = original.document;
  await w.happyDOM.close();
}
console.log('PASS: two concurrent Sol panels use the clicked question and semantic disclosure, require a new preview when either changes, and retain explicit/programmatic caller compatibility. Synthetic transport only.');
