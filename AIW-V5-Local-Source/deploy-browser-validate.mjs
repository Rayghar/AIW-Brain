// Rendered checks for the Chapter 10 Model views (deployment and what fails together).
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
const db = '.aiw-local/deploy-browser-' + port + '.sqlite';
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
  const open = async (ch = 10) => { await page.goto(base + '/?chapter=' + ch + '&tab=model', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-head, .cm .dp-row', {timeout: 8000}); await page.waitForTimeout(400); };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(250); };
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' '));
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.dp-row, .dp-cell, .dp-zh, .dp-trayc, .dp-outc')].map(e => { const r = e.getBoundingClientRect(); return [e.className.split(' ')[0], e.dataset.row || e.dataset.sel || e.dataset.zone || '', Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join('|'); }));

  // 1. Chapter 10 Model opens on the deployment grid of the current environment.
  await open();
  assert.ok(await page.$('.cm.dp .cm-view[data-id="deploy"][aria-pressed="true"]'));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.am-explorer, .canvas-card')].some(e => getComputedStyle(e).display !== 'none')), false, 'the explorer is not shown');
  assert.equal((await page.$$('.dp-row')).length, 17, '5 components, 9 platform services and 3 parties');
  assert.equal((await page.$$('.dp-zh')).length, 2);
  assert.equal((await page.$$('.dp-cell')).length, 3, 'three recorded placements');
  assert.ok((await page.$$('.dp-socket')).length >= 2, 'unplaced parts wait in Not placed');
  assert.ok(await page.$eval('.rt-environment-bar', e => e.getBoundingClientRect().height) < 48, 'the environment picker stays on one line');
  pass('Chapter 10 Model opens on the deployment grid: every part a row, every zone a column, three recorded placements and the unplaced parts waiting');

  // 2. Neither the lens nor the failure explored moves anything.
  const before = await rects();
  for (const lens of ['flow', 'protection', 'operation']) { await click(`[data-dp="lens"][data-id="${lens}"]`); assert.deepEqual(await rects(), before, lens + ' moved objects'); }
  await click('[data-dp="view"][data-id="failure"]');
  assert.deepEqual(await rects(), before, 'the failure view keeps every position');
  pass('switching Operation, Flow and Protection, and exploring a failure, leave every row, cell and zone where it was');

  // 3. What fails together.
  assert.equal((await page.$$('.dp-cell.lost')).length, 3, 'the three copies in the Application zone are lost');
  assert.ok((await page.$$('.dp-outc .dp-state.unavailable')).length >= 3);
  for (let i = 0; i < 4; i++) await click('[data-dp="walk-next"]');
  assert.match(await page.$eval('.cm-walk-text', e => e.innerText), /4 \/ 4 · What could recover/);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await click('.dp-zh[data-zone="zone-b"]');
  assert.equal((await page.$$('.dp-cell.lost')).length, 0, 'nothing runs in the Recovery zone to lose');
  assert.match(await page.$eval('.cm-panel', e => e.innerText), /Recovery zone fails/);
  await click('[data-dp="view"][data-id="deploy"]');
  pass('What fails together removes a zone with the chapter\'s own simulation, walks its four stages, and selecting another zone fails that one instead');

  // 4. Selecting a part reads it; Ask Sol acts on it.
  await click('.dp-row[data-row="run-004"]');
  assert.match(await page.$eval('.cm-panel .cm-spec', e => e.innerText), /RUN-004 · Settlement worker[\s\S]*Edit operating plan/);
  await click('[data-dp="lens"][data-id="flow"]');
  assert.ok((await page.$$('.dp-arc.lit')).length > 2, 'its dependencies light');
  await click('.cm-panel [data-brain-launch="design"]');
  assert.ok(await page.$('#brain-panel:not([hidden])'));
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  pass('selecting a part shows where it runs, what it needs and how it recovers, lights its dependencies, and Ask Sol acts on it');

  // 5. Dissect and fold.
  await open();
  await page.dblclick('.dp-row[data-row="run-004"]'); await page.waitForTimeout(500);
  assert.match(await crumbs(), /Settlement › Settlement worker/);
  assert.ok((await page.$$('.dp-row.ctx')).length > 3, 'what it needs stays beside it as context');
  for (let i = 0; i < 4 && /Settlement/.test(await crumbs()); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  assert.doesNotMatch(await crumbs(), /Settlement/);
  await click('[data-dp="depth"][data-id="modules"]');
  assert.equal((await page.$$('.dp-row.module')).length, 3);
  await click('[data-dp="depth"][data-id="all"]');
  pass('a part can be dissected with what it needs beside it, Escape steps back, and components fold into modules');

  // 6. Placing a part uses the Chapter 10 placement editor, preselected.
  await click('.dp-socket[data-id="run-003"]'); await page.waitForTimeout(500);
  assert.equal(await page.$eval('dialog[open] select[name=planId]', e => e.value), 'run-003');
  await page.selectOption('dialog[open] select[name=zoneId]', 'zone-b');
  await page.click('dialog[open] button[type=submit]'); await page.waitForTimeout(1200);
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('.dp-cell')].some(e => e.dataset.sel === 'run-003')), 'the new placement appears on the grid');
  pass('Not placed · place it opens the Chapter 10 placement editor for that part, and the saved placement appears in its zone');

  // 7. A standby proposal is previewed on the grid before review.
  await click('.dp-row[data-row="run-004"]');
  await click('.cm-panel [data-dp="propose"][data-key="isolate"]'); await page.waitForTimeout(700);
  assert.ok(await page.$('.dp-cell.ghost'), 'the proposed standby is drawn in place');
  assert.match(await page.$eval('.cm-banner', e => e.innerText), /Runtime proposal · not saved[\s\S]*Standby for Settlement worker/i);
  await click('.cm-banner [data-rt-action="dismiss"]'); await page.waitForTimeout(400);
  assert.ok(!(await page.$('.dp-cell.ghost')));
  pass('Propose a standby elsewhere previews the standby on the grid with a review banner; dismissing leaves the design unchanged');

  // 8. The explorer is one click away, per chapter; Chapter 8 keeps its own models.
  await click('[data-dp="explore"]'); await page.waitForTimeout(400);
  assert.ok(await page.$('.am-explorer [data-am="chapter-model"]') && !(await page.$('.cm')));
  await open(8);
  assert.ok(await page.$('.cm .cm-msg') && !(await page.$('.cm.dp')), 'Chapter 8 still opens on its sequence');
  await page.goto(base + '/?chapter=10&tab=model', {waitUntil: 'networkidle'}); await page.waitForTimeout(700);
  await click('.am-explorer [data-am="chapter-model"]'); await page.waitForTimeout(400);
  assert.ok(await page.$('.cm.dp .dp-row'));
  assert.equal((await page.$$('.cm')).length, 1, 'only one chapter model is on the page');
  await page.click('.workspace-bar [data-tab="validate"]'); await page.waitForTimeout(900);
  assert.ok(await page.$('.vx-ready') && !(await page.$('.cm')), 'Validate opens on SDD readiness');
  pass('Explore all perspectives is remembered per chapter, Chapter 8 keeps its sequence, only one chapter model is ever on the page, and Validate is unchanged');

  // 9. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=10&tab=model', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .dp-row'); await p2.waitForTimeout(400);
  const m = await p2.evaluate(() => ({h: document.querySelector('.cm-stage').getBoundingClientRect().height, over: document.documentElement.scrollWidth > innerWidth}));
  assert.ok(m.h >= 360 && !m.over, 'phone ' + JSON.stringify(m));
  await phone.close();
  pass('on a 390 px phone the grid has a usable canvas and no horizontal page scroll');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 10 model (rendered)', passed: checks.length, checks}, null, 2));
