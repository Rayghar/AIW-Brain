// Rendered checks for the build-up (round 6, Contract F): on the bank reference, every chapter's Diagram carries a Build
// menu (data-nt-menu="build") with By layer, Along the trace (enabled only while a trace is lit) and any mode another
// module registers through window.aiwNotationSteps; a step paints the step's elements traced and what is not yet
// revealed dimmed through the marks channel (source `build`), the step's title stands under the toolbar in the
// "You are here" line, Next and Back step, Play steps every 900 ms and any click pauses it, Escape clears the build-up
// (then the trace), the state survives a redraw (another view, another arrangement), the exported SVG carries none of
// it, and a 390 px phone has no horizontal scroll. Needs Playwright and Chromium (AIW_PLAYWRIGHT_MODULE, optionally
// AIW_BROWSER_EXECUTABLE). Starts an isolated local server on a free port with no model key.
// Run: npm run test:notation-build-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync, readFileSync} from 'node:fs';
import net from 'node:net';
import {referenceProject} from './notation-fixtures.mjs';
import {notationDiagram, CHAPTER_SCENES, LAYERS, LAYER_NAMES, CONNECTED} from './public/notation-model.js';
import {traceFrom} from './public/model-matrix.js';
import {BUILD_MS} from './public/notation-view.js';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/notation-build-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: '', ANTHROPIC_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } });
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [], measures = {}, pass = n => { checks.push(n); process.stderr.write('passed: ' + n.slice(0, 100) + '\n'); };
const ref = referenceProject();
// The step counts the picture should have: one per layer present, in the layer order.
const layersIn = D => LAYERS.filter(l => D.nodes.some(n => n.layer === l));
const expected = {};
for (const ch of [4, 8, 10]) expected[ch] = layersIn(notationDiagram(ref, CHAPTER_SCENES[ch][0]));
const connected4 = notationDiagram(ref, CONNECTED.id, {chapter: 4}), connectedLayers = layersIn(connected4);
measures.steps = {4: expected[4].length, 8: expected[8].length, 10: expected[10].length, 'connected-4': connectedLayers.length};

try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}, acceptDownloads: true});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const open = async (ch, extra = '') => {
    await page.goto(base + '/?chapter=' + ch + '&tab=model' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-stage', {timeout: 10000}); await page.waitForTimeout(400);
    if (!(await page.$('.cm-view[data-id="diagram"][aria-pressed="true"]'))) { await page.click('.cm-view[data-id="diagram"]'); await page.waitForTimeout(500); }
  };
  const click = async (sel, ms = 300) => { await page.click(sel); await page.waitForTimeout(ms); };
  const marks = () => page.evaluate(() => ({traced: [...document.querySelectorAll('.cm-svg .nt-node.nt-mk-traced')].map(n => n.dataset.ntNode).sort(), dimmed: [...document.querySelectorAll('.cm-svg .nt-node.nt-mk-dimmed')].map(n => n.dataset.ntNode).sort(), nodes: document.querySelectorAll('.cm-svg .nt-node').length, line: document.querySelector('.cm-lenses .nt-build-line')?.innerText.replace(/\s+/g, ' ').trim() || '', label: document.querySelector('[data-nt="menu"][data-id="build"] > span')?.textContent || '', playing: document.querySelector('.nt-build-ctl [data-nt="build-play"]')?.getAttribute('aria-pressed') || null, key: document.querySelector('.cm-legend')?.innerText || ''}));
  const drawnIds = () => page.$$eval('.cm-svg .nt-node', ns => ns.map(n => n.dataset.ntNode));
  // At the screen budget, Layers draws one aggregate per lane. The build-up must reveal those
  // visible lane objects just as it reveals individual records after a lane is opened.
  const layerOf = new Map([...connected4.nodes, ...notationDiagram(ref, 'logical').nodes].map(n => [n.id, n.layer]));
  for (const layer of LAYERS) layerOf.set('fold:lane:' + layer, layer);
  // rc39/rc40 Layers (rc41 W4): the overview folds each lane's records into a box per type, `fold:view:<layer>:<kind>`;
  // the lane in the id is the drawing's (Motivation, Business …); the box belongs to the model layer of its records' kind.
  const kindLayer = new Map(connected4.nodes.map(n => [n.type, n.layer]));
  const layerGet = layerOf.get.bind(layerOf);
  layerOf.get = id => layerGet(id) ?? kindLayer.get(/^fold:view:[a-z-]+:([a-z-]+)$/.exec(String(id))?.[1]);

  // 1. Chapter 4's Diagram: the Build menu, its modes, and By layer on a one-layer picture.
  await open(4);
  assert.ok(await page.$('.cm-lenses .nt-menu[data-nt-menu="build"] [data-nt="menu"][data-id="build"]'), 'the Build menu is in the kit\'s toolbar');
  assert.equal((await marks()).label.trim(), 'Build');
  await click('[data-nt="menu"][data-id="build"]');
  const modes = await page.$$eval('.nt-pop [data-nt="build"]', bs => bs.map(b => [b.dataset.id, b.querySelector('b').textContent, b.disabled, b.getAttribute('role'), b.getAttribute('aria-checked')]));
  assert.deepEqual(modes, [['layer', 'By layer', false, 'menuitemradio', 'false'], ['trace', 'Along the trace', true, 'menuitemradio', 'false']], 'By layer offered; Along the trace waits for a lit trace: ' + JSON.stringify(modes));
  assert.deepEqual(await page.$$eval('.nt-pop [data-nt^="build-"]', bs => bs.map(b => [b.dataset.nt, b.disabled])), [['build-back', true], ['build-next', true], ['build-play', true], ['build-stop', true]], 'the transport waits for a mode');
  assert.equal(await page.evaluate(() => document.activeElement?.closest('.nt-pop') ? document.activeElement.dataset.nt : null), 'build', 'the menu opens with the keyboard on its first item');
  await click('.nt-pop [data-nt="build"][data-id="layer"]', 500);
  let m = await marks(), drawn = await drawnIds();
  assert.equal(expected[4].length, 1, 'Chapter 4\'s picture holds one layer');
  assert.equal(m.line, 'Build By layer · Step 1 of 1 · ' + LAYER_NAMES[expected[4][0]], 'the step line under the toolbar: ' + m.line);
  assert.deepEqual(m.traced, drawn.slice().sort(), 'every element of the one layer is revealed'); assert.deepEqual(m.dimmed, []);
  assert.match(m.label, /^Build · By layer 1\/1$/); assert.match(m.key, /Revealed in this step\s*×\d+/, 'the Key explains the step');
  assert.deepEqual(await page.$$eval('.nt-build-ctl [data-nt^="build-"]', bs => bs.map(b => [b.dataset.nt, b.disabled])), [['build-back', true], ['build-next', true], ['build-play', false], ['build-stop', false]], 'one step: nothing to step to');
  assert.ok(!(await page.$('.nt-pop')), 'choosing a mode closes the menu');
  pass('Chapter 4: the Build menu lists By layer and Along the trace (disabled until a trace is lit); By layer on the one-layer Diagram reveals every element in step 1 of 1, the step line reads under the toolbar, the Key explains it');

  // 2. The state survives a redraw: the Layers view (six layers) continues the build-up with its own steps.
  await click('.cm-view[data-id="layers"]', 700);
  m = await marks(); drawn = await drawnIds();
  assert.equal(connectedLayers.length, 6); assert.equal(m.line, 'Build By layer · Step 1 of 6 · ' + LAYER_NAMES[connectedLayers[0]], 'the Layers view: ' + m.line);
  const of = l => drawn.filter(id => layerOf.get(id) === l).sort();
  assert.deepEqual(m.traced, of(connectedLayers[0]), 'step 1 reveals the first layer'); assert.deepEqual(m.dimmed, drawn.filter(id => layerOf.get(id) !== connectedLayers[0]).sort(), 'the rest is dimmed');
  await click('.nt-build-ctl [data-nt="build-next"]', 400);
  m = await marks();
  assert.equal(m.line, 'Build By layer · Step 2 of 6 · ' + LAYER_NAMES[connectedLayers[1]]);
  assert.deepEqual(m.traced, of(connectedLayers[1]), 'step 2 reveals the second layer'); assert.deepEqual(m.dimmed, drawn.filter(id => ![connectedLayers[0], connectedLayers[1]].includes(layerOf.get(id))).sort(), 'the first stays revealed, the rest is dimmed');
  assert.match(m.label, /^Build · By layer 2\/6$/);
  await click('.nt-build-ctl [data-nt="build-back"]', 400);
  m = await marks(); assert.equal(m.line, 'Build By layer · Step 1 of 6 · ' + LAYER_NAMES[connectedLayers[0]], 'Back');
  // Next with the keyboard, from the menu.
  // The menu's items that can be pressed: By layer, then Next, Play and Clear (Back and Along the trace are disabled here).
  await click('[data-nt="menu"][data-id="build"]'); await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.nt), 'build-next', 'the arrow keys reach Next'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  m = await marks(); assert.equal(m.line, 'Build By layer · Step 2 of 6 · ' + LAYER_NAMES[connectedLayers[1]], 'Enter steps');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200); assert.ok(!(await page.$('.nt-pop')), 'Escape in the menu closes the menu only'); assert.equal((await marks()).line, m.line);
  pass('the build-up survives a redraw: the Layers view continues it with one step per layer present (6), Next and Back move it, the keyboard reaches the transport in the menu, each step reveals its layer and dims what is not yet revealed');

  // 3. Play steps every 900 ms; any click pauses it.
  await click('.nt-build-ctl [data-nt="build-play"]', 100);
  m = await marks(); assert.equal(m.playing, 'true', 'playing'); assert.match(m.line, /· playing$/);
  await page.waitForTimeout(BUILD_MS * 2 + 300);
  m = await marks(); const stepAt = Number(/Step (\d+) of 6/.exec(m.line)?.[1]); assert.ok(stepAt >= 4, 'two steps later it is at step ' + stepAt);
  await page.click('.cm-state'); await page.waitForTimeout(150);
  m = await marks(); assert.equal(m.playing, 'false', 'a click pauses'); assert.ok(!/playing$/.test(m.line));
  const paused = m.line; await page.waitForTimeout(BUILD_MS + 300); assert.equal((await marks()).line, paused, 'and it stays paused');
  await click('.nt-build-ctl [data-nt="build-play"]', BUILD_MS * 3 + 400);
  m = await marks(); assert.equal(m.playing, 'false', 'Play stops by itself at the last step'); assert.match(m.line, /Step 6 of 6/);
  assert.deepEqual((await marks()).dimmed, [], 'at the last step nothing is left dimmed');
  pass('Play advances a step every ' + BUILD_MS + ' ms, a click anywhere pauses it, and it stops at the last step');

  // 4. The exported SVG carries none of it.
  // rc39/rc40 (rc41 W4): the picture's exports sit in the footer's "Export view" fold (details.cm-export); opened first.
  if (!await page.$('details.cm-export[open]')) await click('details.cm-export > summary', 200);
  const [dl] = await Promise.all([page.waitForEvent('download', {timeout: 15000}), page.click('details.cm-export [data-nt="export"][data-id="svg"]')]);
  const svg = readFileSync(await dl.path(), 'utf8');
  // The stylesheet names the mark classes; no element carries one, and the Key says nothing of the build-up.
  assert.ok(svg.includes('<svg') && svg.includes('class="nt-node'), 'an SVG with elements');
  assert.ok(!/class="nt-node[^"]*nt-mk-(?:dimmed|traced)/.test(svg) && !/nt-mk-dim\b|nt-mk-lit\b/.test(svg.replace(/<style>[\s\S]*?<\/style>/, '')) && !/Revealed in this step|Not yet revealed/.test(svg), 'the exported SVG is unaffected by the build-up');
  pass('the exported SVG carries no build-up mark');

  // 5. Escape clears the build-up and removes its source; the Key no longer explains it.
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  m = await marks(); assert.equal(m.line, '', 'the step line is gone'); assert.deepEqual([m.traced, m.dimmed], [[], []], 'no mark is left'); assert.equal(m.label.trim(), 'Build'); assert.ok(!/Revealed in this step/.test(m.key));
  assert.equal(await page.evaluate(() => window.aiwModelMarks.sources().includes('build')), false, 'the build source is withdrawn');
  pass('Escape clears the build-up: the line, the marks and the source go');

  // 6. Along the trace: enabled only while a trace is lit; one step per chain step the picture draws; Escape clears the build first, then the trace.
  await click('[data-nt="menu"][data-id="trace"]'); await page.selectOption('.nt-pop [data-nt-field="trace"]', 'REQ-001'); await page.waitForTimeout(600);
  const T = traceFrom(ref, 'REQ-001'), drawnNow = new Set(await drawnIds()), chain = T.steps.filter(st => !st.gap && st.records.some(r => drawnNow.has(r.id)));
  await click('[data-nt="menu"][data-id="build"]');
  assert.equal(await page.$eval('.nt-pop [data-nt="build"][data-id="trace"]', b => b.disabled), false, 'Along the trace is enabled while the trace is lit');
  await click('.nt-pop [data-nt="build"][data-id="trace"]', 500);
  m = await marks();
  assert.equal(m.line, 'Build Along the trace · Step 1 of ' + chain.length + ' · ' + chain[0].word + ': ' + chain[0].records.map(r => r.ref).join(', '), m.line);
  assert.deepEqual(m.traced, chain[0].records.map(r => r.id).filter(id => drawnNow.has(id)).sort(), 'the first chain step is revealed'); assert.equal(m.dimmed.length, m.nodes - m.traced.length, 'everything else waits');
  await click('.nt-build-ctl [data-nt="build-next"]', 400);
  m = await marks(); assert.match(m.line, new RegExp('Step 2 of ' + chain.length + ' · ' + chain[1].word)); assert.deepEqual(m.traced, chain[1].records.map(r => r.id).filter(id => drawnNow.has(id)).sort());
  assert.ok(await page.$('.cm-companion .nt-trace-read'), 'the trace reading stays');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  m = await marks(); assert.equal(m.line, ''); assert.ok(await page.$('.cm-companion .nt-trace-read'), 'the first Escape clears the build-up and keeps the trace');
  assert.deepEqual(m.traced, [...T.ids].filter(id => drawnNow.has(id)).sort(), 'the trace\'s own marks are back');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  assert.ok(!(await page.$('.cm-companion .nt-trace-read')) && (await marks()).traced.length === 0, 'the second clears the trace');
  measures.traceSteps = chain.length;
  pass('Along the trace steps through the lit trace\'s chain (' + chain.length + ' steps drawn here); Escape clears the build-up first, then the trace');

  // 7. Another module registers a mode through window.aiwNotationSteps; the menu lists it and it steps.
  await page.evaluate(() => window.aiwNotationSteps.register('pair', {title: 'Two halves', sub: 'the first element, then the rest', steps: D => [{title: 'First', marks: [{id: D.nodes[0].id, state: 'traced'}]}, {title: 'The rest', marks: D.nodes.slice(1).map(n => ({id: n.id, state: 'traced'}))}]}));
  assert.deepEqual(await page.evaluate(() => window.aiwNotationSteps.list().map(x => x.id)), ['layer', 'trace', 'pair']);
  await click('[data-nt="menu"][data-id="build"]');
  assert.deepEqual(await page.$$eval('.nt-pop [data-nt="build"]', bs => bs.map(b => b.dataset.id)), ['layer', 'trace', 'pair']);
  await click('.nt-pop [data-nt="build"][data-id="pair"]', 500);
  m = await marks(); assert.equal(m.line, 'Build Two halves · Step 1 of 2 · First'); assert.equal(m.traced.length, 1); assert.equal(m.dimmed.length, m.nodes - 1);
  await click('.nt-build-ctl [data-nt="build-next"]', 400); m = await marks(); assert.equal(m.line, 'Build Two halves · Step 2 of 2 · The rest'); assert.equal(m.traced.length, m.nodes - 1); assert.deepEqual(m.dimmed, []);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  pass('a mode registered through window.aiwNotationSteps is listed and steps like the kit\'s own');

  // 8. Every chapter's Diagram has the menu; Chapters 8 and 10 step by their layers; a redraw by arrangement keeps the step.
  for (const ch of [8, 10]) {
    await open(ch);
    assert.ok(await page.$('[data-nt="menu"][data-id="build"]'), 'Chapter ' + ch + ' has the Build menu');
    await click('[data-nt="menu"][data-id="build"]'); await click('.nt-pop [data-nt="build"][data-id="layer"]', 500);
    m = await marks(); assert.equal(m.line, 'Build By layer · Step 1 of ' + expected[ch].length + ' · ' + LAYER_NAMES[expected[ch][0]], 'Chapter ' + ch + ': ' + m.line);
    if (expected[ch].length > 1) { await click('.nt-build-ctl [data-nt="build-next"]', 400); m = await marks(); assert.match(m.line, /Step 2 of /); }
    await click('[data-nt="menu"][data-id="arrange"]'); const other = await page.$eval('.nt-arrange-panel [data-nt="arrange"][aria-pressed="false"]', b => b.dataset.id); await click(`.nt-arrange-panel [data-nt="arrange"][data-id="${other}"]`, 600);
    assert.equal((await marks()).line, m.line, 'Chapter ' + ch + ': the step survives a new arrangement');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  }
  for (const ch of [1, 2, 3, 5, 6, 7, 9]) { await open(ch); assert.ok(await page.$('[data-nt="menu"][data-id="build"]'), 'Chapter ' + ch + ' has the Build menu'); }
  pass('the Build menu is on every chapter\'s Diagram; Chapters 8 and 10 step by their ' + expected[8].length + ' and ' + expected[10].length + ' layers, and a new arrangement keeps the step');

  // 9. A 390 px phone: no horizontal page scroll with the build-up on.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}}), pp = await phone.newPage(); pp.on('pageerror', e => errors.push(e.message));
  await pp.goto(base + '/?chapter=4&tab=model', {waitUntil: 'networkidle'}); await pp.waitForSelector('.cm .cm-stage', {timeout: 10000}); await pp.waitForTimeout(500);
  if (!(await pp.$('.cm-view[data-id="diagram"][aria-pressed="true"]'))) { await pp.click('.cm-view[data-id="diagram"]'); await pp.waitForTimeout(500); }
  // rc39/rc40 (rc41 W4): on a phone the picture's menus stand on the bar itself (the Tools disclosure that held them is
  // gone); the Build menu must be visible there.
  assert.ok(await pp.locator('[data-nt="menu"][data-id="build"]').isVisible(), 'the Build menu is on the phone bar');
  await pp.click('[data-nt="menu"][data-id="build"]'); await pp.waitForTimeout(300); await pp.click('.nt-pop [data-nt="build"][data-id="layer"]'); await pp.waitForTimeout(600);
  const ph = await pp.evaluate(() => ({overflow: document.documentElement.scrollWidth > innerWidth, line: document.querySelector('.nt-build-line')?.checkVisibility() || false, text: document.querySelector('.nt-build-line')?.innerText.replace(/\s+/g, ' ').trim() || '', ctl: document.querySelector('.nt-build-ctl [data-nt="build-play"]')?.checkVisibility() || false}));
  assert.equal(ph.overflow, false, 'no horizontal page scroll'); assert.ok(ph.line && ph.ctl, 'the step line and the transport are visible'); assert.match(ph.text, /Step 1 of 1/);
  await phone.close();
  pass('on a 390 px phone the build-up shows its line and transport without a horizontal page scroll');

  assert.deepEqual(errors, [], 'no page error');
  console.log(JSON.stringify({suite: 'Build-up (browser)', passed: checks.length, checks, measures}, null, 1));
} catch (e) {
  console.error('FAIL', e.message); if (errors.length) console.error('page errors:', errors); process.exitCode = 1;
} finally {
  await browser.close();
  server.kill();
  for (const f of [db, db + '-shm', db + '-wal']) try { rmSync(f, {force: true}); } catch { /* temporary */ }
}
