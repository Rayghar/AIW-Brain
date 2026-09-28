// Rendered checks for the standard diagrams (v20.6): every chapter's Diagram view draws its scene in
// the notation, the arrangements rearrange without losing anything, the layers strip from the menu
// and from the sidebar alike, a dragged element stays pinned, a selection reaches the companion and the
// address, the keyboard works, export gives a file, a deep link opens a named view, and a blank project
// says it has nothing to draw. Needs Playwright and Chromium (AIW_PLAYWRIGHT_MODULE).
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/notation-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => checks.push(n);
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}, acceptDownloads: true});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const open = async (ch, extra = '') => {
    await page.goto(base + '/?chapter=' + ch + '&tab=model' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-stage', {timeout: 10000}); await page.waitForTimeout(400);
    if (!(await page.$('.cm-view[data-id="diagram"][aria-pressed="true"]'))) { await page.click('.cm-view[data-id="diagram"]'); await page.waitForTimeout(500); }
  };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(300); };
  const count = async sel => (await page.$$(sel)).length;
  const status = () => page.$eval('.cm-state', e => e.textContent);
  const objectParam = () => page.evaluate(() => new URL(location.href).searchParams.get('object'));

  // 1. Every chapter draws its scene in the notation, with kickers, words on the edges, and the header strip.
  const expect = {1: ['Swimlanes', /Initiate payment/], 2: ['Tree', /QUALITY SCENARIO/i], 3: ['Tree', /DECISION/i], 4: ['Grouped', /LOGICAL APPLICATION COMPONENT/i], 5: ['Tree', /PHYSICAL APPLICATION COMPONENT/i], 6: ['Layered', /TECHNOLOGY SERVICE/i], 7: ['Tree', /PHYSICAL TECHNOLOGY COMPONENT/i], 8: ['Orthogonal', /APPLICATION SERVICE/i], 9: ['Grouped', /SECURITY CONTROL/i], 10: ['Grouped', /Not placed/]};
  const drawn = {};
  for (const [ch, [arr, re]] of Object.entries(expect)) {
    await open(ch);
    const info = await page.evaluate(() => ({nodes: document.querySelectorAll('.nt-node').length, edges: document.querySelectorAll('.nt-edge').length, labels: [...document.querySelectorAll('.nt-elabel')].filter(t => t.textContent.trim()).length, text: document.querySelector('.cm-html').innerText, header: document.querySelector('.nt-header')?.innerText || '', pressed: document.querySelector('.cm-view[aria-pressed="true"]')?.dataset.id}));
    assert.equal(info.pressed, 'diagram', 'chapter ' + ch + ' shows its Diagram');
    assert.ok(info.nodes > 0 && info.edges > 0, 'chapter ' + ch + ' draws elements and relationships: ' + info.nodes + '/' + info.edges);
    assert.ok(info.labels > 0 || ch === '1', 'chapter ' + ch + ' writes the words on its edges');
    assert.match(info.text, re, 'chapter ' + ch + ' draws its standard element');
    assert.match(info.header, /MODEL\s+Bank Payment Journey[\s\S]*TEMPLATE\s+AIW notation/, 'chapter ' + ch + ' carries the header strip');
    assert.match(await status(), new RegExp('· ' + arr + '$'), 'chapter ' + ch + ' opens on ' + arr);
    drawn[ch] = info.nodes;
  }
  assert.deepEqual(errors, [], 'no page errors across the ten chapters');
  pass('Chapters 1 to 10 each open their Diagram: the standard elements with their kickers, the words on the connectors, the header strip, and the arrangement the scene calls for (' + Object.entries(drawn).map(([c, n]) => c + ':' + n).join(' ') + ')');

  // 2. Arrangements rearrange everything and lose nothing; the menu says which is in use.
  await open(5);
  const n0 = await count('.nt-node');
  for (const a of ['radial', 'orthogonal', 'layered', 'grouped', 'tree']) {
    await click('[data-nt="menu"][data-id="arrange"]');
    assert.ok(await page.$('.nt-pop [role="menuitemradio"]'), 'the Arrange menu opens');
    await click(`[data-nt="arrange"][data-id="${a}"]`);
    assert.equal(await count('.nt-node'), n0, a + ' keeps every element');
    assert.match(await status(), new RegExp('· ' + a[0].toUpperCase() + a.slice(1) + '$'));
    assert.match(await page.$eval('[data-nt="menu"][data-id="arrange"]', e => e.textContent), new RegExp(a, 'i'));
    const boxes = await page.$$eval('.nt-node', ns => ns.map(n => { const r = n.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const [ax, ay, aw, ah] = boxes[i], [bx, by, bw, bh] = boxes[j]; assert.ok(!(ax < bx + bw - 2 && bx < ax + aw - 2 && ay < by + bh - 2 && by < ay + ah - 2), a + ': two elements overlap'); }
    if (a === 'grouped') assert.ok(await count('.nt-group') >= 3, 'grouped draws the modules and external systems'); else assert.equal(await count('.nt-group'), 0, a + ' keeps the groups in the sub-line');
  }
  pass('the five arrangements each rearrange Chapter 5 without losing or overlapping an element, and the menu names the one in use');

  // 3. Layers strip from the diagram's menu and from the sidebar alike; both say the same.
  await click('[data-nt="menu"][data-id="layers"]');
  await click('[data-nt="layer"][data-id="interface"]');
  const afterMenu = await count('.nt-node');
  assert.ok(afterMenu < n0 && (await status()).includes('hidden by the layers'), 'unticking Interface strips the application services');
  assert.match(await page.$eval('.journey-explorer .rail-view-hint', e => e.textContent), /^7 of 8 visible/, 'the sidebar says the same');
  assert.equal(await page.$eval('.journey-explorer .rail-layer[data-layer="interface"]', e => e.getAttribute('aria-pressed')), 'false');
  await page.click('.journey-explorer .rail-layer[data-layer="interface"]'); await page.waitForTimeout(900);
  await page.waitForSelector('.nt-node', {timeout: 8000});
  assert.equal(await count('.nt-node'), n0, 'ticking it back in the sidebar restores them');
  // The logical layer is drawn in this scene (the five logical application components); Data is not.
  await page.click('.journey-explorer .rail-layer[data-layer="logical"]'); await page.waitForTimeout(900); await page.waitForSelector('.nt-node');
  assert.equal(await count('.nt-node'), n0 - 5, 'unticking Logical in the sidebar strips the five logical components');
  assert.ok((await status()).includes('5 hidden by the layers'), 'and the status says so');
  assert.match(await page.$eval('.journey-explorer .rail-view-hint', e => e.textContent), /^7 of 8 visible/);
  await page.click('.journey-explorer .rail-layer[data-layer="logical"]'); await page.waitForTimeout(900);
  assert.equal(await count('.nt-node'), n0, 'and ticking it back restores them');
  pass('the Layers menu and the sidebar’s Model layers are one setting: each strips the diagram and the other says so');

  // 4. A drag pins; Release lets go. A click selects into the companion and the address; Enter selects too.
  await open(5);
  const before = await page.$eval('.nt-node[data-sel="risk-engine"]', e => [parseFloat(e.style.left), parseFloat(e.style.top)]);
  const box = await page.$eval('.nt-node[data-sel="risk-engine"]', e => { const r = e.getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2}; });
  await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x + 60, box.y + 90, {steps: 6}); await page.mouse.up(); await page.waitForTimeout(500);
  const after = await page.$eval('.nt-node[data-sel="risk-engine"]', e => [parseFloat(e.style.left), parseFloat(e.style.top), e.classList.contains('pinned')]);
  assert.ok(after[2] && (Math.abs(after[0] - before[0]) > 20 || Math.abs(after[1] - before[1]) > 20), 'the dragged element moved and is pinned');
  assert.equal(await objectParam(), null, 'a drag is not a selection');
  await click('[data-nt="menu"][data-id="arrange"]'); assert.match(await page.$eval('[data-nt="reset"]', e => e.textContent), /Release pinned elements \(1\)/); await click('[data-nt="reset"]');
  assert.equal(await page.$('.nt-node.pinned'), null, 'released');
  await click('.nt-node[data-sel="risk-engine"]');
  assert.equal(await objectParam(), 'risk-engine', 'a click selects, into the address');
  assert.match(await page.$eval('.cm-panel .cm-spec', e => e.innerText), /Risk engine/, 'and into the companion');
  await page.focus('.nt-node[data-sel="api-pod"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  assert.equal(await objectParam(), 'api-pod', 'Enter selects from the keyboard');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.ntNode), 'api-pod', 'and focus stays on the element');
  await click('.nt-node[data-sel="system:bank-payment"]');
  assert.match(await page.$eval('.cm-panel .cm-spec', e => e.innerText), /PHYSICAL APPLICATION COMPONENT[\s\S]*The application as a whole/i, 'an element only the diagram draws reads in the companion');
  assert.equal(await objectParam(), null, 'and is not a record in the address');
  pass('dragging pins an element (and Release lets go), a click or Enter selects into the companion and the address, and the application itself reads without pretending to be a record');

  // 5. Export gives the picture as a file, SVG and PNG.
  const [svgDl] = await Promise.all([page.waitForEvent('download', {timeout: 10000}), page.click('[data-nt="export"][data-id="svg"]')]);
  assert.match(svgDl.suggestedFilename(), /^AIW-Bank-Payment-Journey-ch5-application\.svg$/);
  const svgPath = await svgDl.path(); const svgText = (await import('node:fs')).readFileSync(svgPath, 'utf8');
  assert.ok(svgText.startsWith('<svg') && /PHYSICAL APPLICATION COMPONENT/.test(svgText) && /realizes/.test(svgText) && svgText.includes('Bank Payment Journey'), 'the SVG holds the elements, the words and the header');
  const [pngDl] = await Promise.all([page.waitForEvent('download', {timeout: 15000}), page.click('[data-nt="export"][data-id="png"]')]);
  assert.match(pngDl.suggestedFilename(), /\.png$/);
  pass('Export SVG writes the diagram as vectors with its kickers, words and header; Export PNG writes a bitmap');

  // 6. A deep link opens a named view; the chapter's own views stay one click away; Chapter 8 has two scenes; Chapter 10 an environment.
  await page.goto(base + '/?chapter=5&tab=model&model=components', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .rz-card'); await page.waitForTimeout(300);
  assert.equal(await page.$eval('.cm-view[aria-pressed="true"]', e => e.dataset.id), 'components', 'model=components opens the components view');
  await click('.cm-view[data-id="diagram"]'); assert.ok(await page.$('.nt-node'), 'and the Diagram is one click away');
  await open(8);
  assert.ok(await page.$('[data-nt-field="scene"]'), 'Chapter 8 offers its two scenes');
  await page.selectOption('[data-nt-field="scene"]', 'data'); await page.waitForTimeout(500);
  assert.match(await status(), /^Data & authority/); assert.ok(await page.$('.nt-node.nt-data-logical'), 'the data scene draws logical data components');
  await open(10);
  assert.ok(await page.$('.nt-group.nt-g-zone') && await page.$('.nt-group.nt-g-unplaced'), 'the deployment draws zones and the parts not placed');
  assert.ok(await page.$$eval('.nt-elabel .nt-step', s => s.length >= 1), 'runtime paths are numbered');
  pass('a deep link opens a chapter model on a named view, Chapter 8 switches between Integration and Data & authority, and Chapter 10 draws zones, placements and numbered paths');

  // 7. A blank project draws nothing and says so.
  await page.goto(base + '/?view=projects', {waitUntil: 'networkidle'}); await page.waitForTimeout(600);
  await page.evaluate(() => { [...document.querySelectorAll('a, button')].find(b => /Create a project/.test(b.textContent))?.click(); }); await page.waitForTimeout(800);
  await page.fill('input[name=name]', 'Blank notation');
  await page.evaluate(() => { const r = [...document.querySelectorAll('input[name=template]')].find(r => /blank/i.test((r.closest('label') || r.parentElement)?.innerText || r.value)) || document.querySelector('input[name=template]'); if (r) { r.checked = true; r.dispatchEvent(new Event('change', {bubbles: true})); r.click(); } });
  await page.waitForTimeout(200);
  await page.evaluate(() => (document.querySelector('#create-submit') || document.querySelector('form button[type=submit]'))?.click());
  await page.waitForURL(u => !/view=projects/.test(String(u)), {timeout: 15000}); await page.waitForTimeout(1000);
  const pid = new URL(page.url()).searchParams.get('project'); assert.ok(pid);
  await open(5, '&project=' + encodeURIComponent(pid));
  assert.equal(await count('.nt-node'), 0); assert.match(await page.$eval('.cm-empty-card', e => e.innerText), /Nothing to draw yet[\s\S]*No application component is recorded yet/);
  pass('a blank project’s Diagram draws nothing and says why');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'standard diagrams (rendered)', passed: checks.length, checks}, null, 2));
