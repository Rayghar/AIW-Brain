// Rendered checks for the Chapter 5 Model views (components and allocation).
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and
// optionally AIW_BROWSER_EXECUTABLE. Starts an isolated local server on a free port.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/realise-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => checks.push(n);
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const open = async (ch = 5) => { await page.goto(base + '/?chapter=' + ch + '&tab=model', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-head, .cm .dp-row, .cm .tm-card, .cm .rz-card', {timeout: 8000}); await page.waitForTimeout(400); };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(250); };
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' '));
  const count = async sel => (await page.$$(sel)).length;
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.rz-card, .rz-label, .rz-lh')].map(e => { const r = e.getBoundingClientRect(); return [e.className.split(' ')[0], e.dataset.card || e.dataset.link || e.dataset.lane || '', Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join('|'); }));
  const spec = () => page.$eval('.cm-panel .cm-spec', e => e.innerText);

  // 1. Chapter 5 Model opens on the components, each carrying what it realises.
  await open();
  assert.ok(await page.$('.cm.rz .cm-view[data-id="components"][aria-pressed="true"]'));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.am-explorer, .canvas-card')].some(e => getComputedStyle(e).display !== 'none')), false, 'the explorer is not shown');
  assert.equal(await count('.rz-lh.module'), 3, 'three modules as lanes');
  assert.equal(await count('.rz-card.component'), 5); assert.equal(await count('.rz-card.party'), 3);
  assert.equal(await count('.rz-card.component .rz-r'), 5, 'each component carries the responsibility it realises');
  const stands = await page.$$eval('.rz-card.component .rz-strip', ss => ss.map(s => ({prods: s.querySelectorAll('.rz-n.prod').length, open: s.querySelectorAll('button.rz-n.open').length, shown: s.querySelectorAll('.rz-n:not(.more)').length, more: +(s.querySelector('.rz-n.more')?.textContent.slice(1) || 0), fits: s.scrollWidth <= s.clientWidth + 1, tip: s.querySelector('.rz-n.open')?.title || ''})));
  assert.equal(stands.length, 5); assert.ok(stands.reduce((n, s) => n + s.shown + s.more, 0) >= 20, 'and the platform it stands on');
  assert.ok(stands.every(s => s.prods === 0 && s.open >= 1 && s.fits), 'no product is named while Chapter 7 has chosen none: the capabilities with open candidates are dashed, the rest behind +N, on one line ' + JSON.stringify(stands));
  assert.match(stands[0].tip, /\d candidate products? in Chapter 7, none chosen/, 'and each says the choice is still open');
  assert.equal(await count('.rz-label'), 7, 'every interaction is labelled');
  assert.equal(await count('.cm-panel .cm-spec'), 0, 'nothing is selected on arrival');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /5 components in 3 modules · 0 responsibilities not realised · 4 of 4 logical flows carried/);
  pass('Chapter 5 Model opens on five components in their three modules, each carrying the responsibility it realises and the platform it stands on, with every interaction labelled');

  // 2. The lens changes what is read, never where anything is.
  const before = await rects();
  for (const lens of ['flow', 'reasoning', 'structure']) {
    await click(`[data-rz="lens"][data-id="${lens}"]`);
    assert.deepEqual(await rects(), before, lens + ' moved objects');
    const shown = await page.$eval('.rz-card.component .rz-lens', e => [...e.children].filter(x => getComputedStyle(x).display !== 'none').map(x => x.className));
    assert.deepEqual(shown, [{flow: 'fl', reasoning: 'rs', structure: 'st'}[lens]]);
  }
  pass('Structure, Flow and Reasoning each show their own reading on every card and label, and leave everything where it was');

  // 3. Selecting reads the component; its editor is one click away.
  await click('.rz-card[data-card="risk-engine"] .rz-t');
  const s1 = await spec();
  assert.match(s1, /Service · APP-002[\s\S]*Risk engine[\s\S]*Realises[\s\S]*LR-002 Risk screening[\s\S]*Stands on[\s\S]*Why[\s\S]*no decision behind it/i);
  assert.ok(await count('.rz-route.lit') >= 2 && await count('.rz-card.dim') >= 4);
  const sp = await page.$eval('.cm-panel .sp', e => e.innerText);
  assert.match(sp, /Specification\s*APP-002[\s\S]*Logical[\s\S]*LR-002[\s\S]*Platform[\s\S]*TC-001[\s\S]*Products[\s\S]*Kubernetes 1\.31[\s\S]*CNCF[\s\S]*candidate[\s\S]*PostgreSQL 17[\s\S]*Runtime[\s\S]*RUN-002[\s\S]*active[\s\S]*Must meet[\s\S]*QD-/i, 'the specification reads from responsibility to product and runtime');
  assert.ok(await page.$('.cm-panel .sp a.sp-a[href*="chapter=7"]'), 'each product links to Chapter 7');
  const ap = await page.$eval('.cm-panel .sp-ap', e => e.innerText);
  assert.ok(/Anti-patterns it is part of/i.test(ap) && /Single Point of Failure/.test(ap) && /Synchronous Chain/.test(ap) && /Observability as Afterthought/.test(ap), 'the component, and where it runs, are part of three anti-patterns');
  await click('.cm-panel [data-a-action="edit"]'); await page.waitForTimeout(400);
  assert.equal(await page.$eval('dialog[open] #a-dialog-title', e => e.textContent), 'Edit APP-002 · Risk engine');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  if (await page.$('dialog[open]')) { await page.evaluate(() => document.querySelector('dialog[open]').close()); await page.waitForTimeout(200); }
  pass('selecting a component reads what it realises, owns, takes in, gives out and stands on, and why; its specification runs from responsibility to products with version and vendor and where it runs, with the anti-patterns it is part of; Edit component opens the Chapter 5 editor on it');

  // 4. Removing an allocation is staged as a model proposal: the model shows the proposed design,
  //    with a hole where the responsibility is no longer realised, until the proposal is discarded.
  await click('.rz-card[data-card="worker"] .rz-t');
  await click('.cm-panel [data-a-action="edit"]'); await page.waitForTimeout(400);
  await page.evaluate(() => { const f = document.querySelector('#a-component-form'), x = f.querySelector('input[name="logicalIds"][value="hub"]'); x.checked = false; x.dispatchEvent(new Event('change', {bubbles: true})); f.requestSubmit(); });
  await page.waitForTimeout(1400);
  assert.ok(!(await page.$('dialog[open]')), 'the edit is staged');
  assert.match(await page.$eval('.cm-banner .ip-banner', e => e.innerText), /Unsaved proposal[\s\S]*Model proposal/i, 'the model proposal banner');
  assert.ok(await page.$('.rz-card.hole[data-card="HOLE:hub"]'), 'LR-004 stands as a hole in Settlement in the proposed model');
  assert.match(await page.$eval('.rz-card[data-card="worker"]', e => e.innerText), /realises no responsibility/);
  assert.ok(await count('.rz-card.changed') >= 1, 'what the proposal changes is marked');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /1 responsibility not realised · 2 of 4 logical flows carried/);
  await click('.rz-card.hole [data-a-action="new-for-logical"]'); await page.waitForTimeout(400);
  assert.ok(await page.$eval('#a-component-form', f => f.querySelector('input[name="logicalIds"][value="hub"]').checked), 'Create a component opens the editor already allocated to LR-004');
  await page.evaluate(() => document.querySelector('dialog[open]').close()); await page.waitForTimeout(300);
  await click('.cm-banner [data-ip-action="dismiss"]'); await page.waitForTimeout(400);
  await click('[data-ip-action="discard-confirm"]'); await page.waitForTimeout(700);
  assert.ok(!(await page.$('.rz-card.hole')) && !(await page.$('.cm-banner .ip-banner')), 'discarding restores the saved design');
  pass('removing an allocation in the Chapter 5 editor is staged as a model proposal: the model shows LR-004 as a hole and the worker realising nothing, the hole\'s Create a component opens the editor allocated to it, and discarding restores the saved design');

  // 5. Dissect, fold and walk.
  await open();
  await page.dblclick('.rz-card[data-card="core-adapter"] .rz-t'); await page.waitForTimeout(500);
  assert.match(await crumbs(), /Control & accounting › Core connector/);
  assert.ok(await page.$('.rz-card.subject[data-card="core-adapter"]') && await count('.rz-card.ctx') >= 3);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  if (/Core connector$/.test(await crumbs())) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  assert.match(await crumbs(), /Whole system › Control & accounting$/, 'Escape steps back to the module first');
  for (let i = 0; i < 3 && /›/.test(await crumbs()); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  await click('[data-rz="depth"][data-id="modules"]');
  assert.ok(await count('.rz-card.module') >= 3);
  await click('[data-rz="depth"][data-id="components"]');
  await click('[data-rz="walk-next"]');
  assert.match(await page.$eval('.cm-walk-text', e => e.innerText), /1 \/ 4 LR-001 Payment API → LR-002 Risk screening \(Screen\)\. Realised by Payment service → Risk engine\. Carried by INT-001/);
  assert.ok(await count('.rz-route.lit') === 1);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  pass('a component can be dissected with its neighbours beside it, Escape steps back through the module, modules fold, and the walk reads which interaction carries each Chapter 4 flow');

  // 6. Allocation, and a component proposal drawn in place.
  await click('[data-rz="view"][data-id="allocation"]');
  assert.equal(await count('.rz-trow'), 5); assert.equal(await count('.rz-cell'), 5, 'one allocation per responsibility');
  assert.equal(await count('.rz-trow.open'), 0); assert.equal(await count('.rz-ch.idle'), 0);
  assert.equal(await count('.rz-band'), 3, 'components grouped by module');
  await click('.rz-trow[data-sel="risk"]');
  await click('.cm-panel [data-a-action="preview"][data-a-key="review"]'); await page.waitForTimeout(800);
  assert.match(await page.$eval('.cm-banner', e => e.innerText), /Component proposal · not saved[\s\S]*Held payment review queue/i);
  assert.ok(await page.$('.rz-ch.proposed') && await page.$('.rz-cell.proposed'), 'the proposal is its own column');
  await click('[data-rz="view"][data-id="components"]');
  assert.ok(await page.$('.rz-card.proposed') && await count('.rz-route.proposed') === 1, 'and its own card, linked to the risk engine');
  await click('.cm-banner [data-a-action="dismiss"]'); await page.waitForTimeout(500);
  assert.ok(!(await page.$('.rz-card.proposed')) && !(await page.$('.cm-banner .dp-banner')));
  pass('Allocation shows each responsibility against the component realising it, grouped by module; Propose a held payment review queue previews an unsaved column and card beside the risk engine, and dismissing leaves the design unchanged');

  // 7. The explorer is one click away; other chapters keep their models.
  await click('[data-rz="explore"]'); await page.waitForTimeout(400);
  assert.ok(await page.$('.am-explorer [data-am="chapter-model"]') && !(await page.$('.cm')));
  await click('.am-explorer [data-am="chapter-model"]'); await page.waitForTimeout(500);
  assert.ok(await page.$('.cm.rz .rz-card'));
  await page.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'}); await page.waitForTimeout(900); assert.ok(await page.$('.cm.dk .dk-cell') && !(await page.$('.cm.rz, .cm.pf')), 'chapter 11 opens on the review desk');
  await open(9); assert.ok(await page.$('.cm.tm') && !(await page.$('.cm.rz')), 'Chapter 9 keeps its threat model');
  assert.equal(await count('.cm'), 1, 'only one chapter model is on the page');
  await open(5);
  await page.click('.workspace-bar [data-tab="validate"]'); await page.waitForTimeout(900);
  assert.ok(await page.$('.vx-ready') && !(await page.$('.cm')), 'Validate opens on SDD readiness');
  pass('Explore all perspectives and back, Chapter 11 opens on the review desk, Chapter 9 keeps its own models, only one chapter model is ever on the page, and Validate is unchanged');

  // 8. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=5&tab=model', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .rz-card'); await p2.waitForTimeout(400);
  const m = await p2.evaluate(() => ({h: document.querySelector('.cm-stage').getBoundingClientRect().height, over: document.documentElement.scrollWidth > innerWidth}));
  assert.ok(m.h >= 360 && !m.over, 'phone ' + JSON.stringify(m));
  await phone.close();
  pass('on a 390 px phone the realisation has a usable canvas and no horizontal page scroll');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 5 model (rendered)', passed: checks.length, checks}, null, 2));
