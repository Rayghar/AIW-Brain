// Rendered checks for the Chapter 6 Model views (the platform stack and what fails together).
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
const db = '.aiw-local/platform-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => checks.push(n);
// The chapters' analytical views, which these checks read; the Diagram is the default since v20.6.
const modelOf = ch => ({4: 'map', 5: 'components', 6: 'platform', 7: 'stack', 8: 'sequence', 9: 'model', 10: 'deploy'}[ch] ? '&model=' + {4: 'map', 5: 'components', 6: 'platform', 7: 'stack', 8: 'sequence', 9: 'model', 10: 'deploy'}[ch] : '');
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const open = async (ch = 6) => { await page.goto(base + '/?chapter=' + ch + '&tab=model' + modelOf(ch), {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-head, .cm .dp-row, .cm .tm-card, .cm .rz-card, .cm .pf-cap', {timeout: 8000}); await page.waitForTimeout(400); };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(250); };
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' '));
  const count = async sel => (await page.$$(sel)).length;
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.pf-cell, .pf-cap, .pf-ch, .pf-fail')].map(e => { const r = e.getBoundingClientRect(); return [e.className.split(' ')[0], e.dataset.sel || e.dataset.id || '', Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join('|'); }));
  const spec = () => page.$eval('.cm-panel .cm-spec', e => e.innerText);
  const closeDialog = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(300); if (await page.$('dialog[open]')) { await page.evaluate(() => document.querySelector('dialog[open]').close()); await page.waitForTimeout(200); } };

  // 1. Chapter 6 Model opens on the platform stack.
  await open();
  assert.ok(await page.$('.cm.pf .cm-view[data-id="platform"][aria-pressed="true"]'));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.am-explorer, .canvas-card')].some(e => getComputedStyle(e).display !== 'none')), false, 'the explorer is not shown');
  assert.equal(await count('.pf-cap'), 9, 'nine capabilities'); assert.equal(await count('.pf-ch'), 5, 'five components');
  assert.equal(await count('.pf-cell'), 28, 'every need where a component meets a capability');
  assert.ok(await count('.pf-plate') >= 9, 'shared support joins into plates'); assert.equal(await count('.pf-arc'), 4, 'four dependencies');
  assert.equal(await page.$$eval('.pf-fail', els => els.filter(e => /Stops 5 of 5/.test(e.innerText)).length), 3, 'execution, connectivity and identity each stop everything');
  assert.equal(await count('.cm-panel .cm-spec'), 0, 'nothing is selected on arrival');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /9 capabilities support 5 components through 28 needs · 0 unsupported · 7 single paths · 1 failure domain/);
  pass('Chapter 6 Model opens on the platform stack: nine capabilities in their families, five components, every need where they meet, four dependencies, and what each capability\'s loss stops');

  // 2. The lens changes what is read, never where anything is.
  const before = await rects();
  for (const lens of ['operation', 'protection', 'structure']) {
    await click(`[data-pf="lens"][data-id="${lens}"]`);
    assert.deepEqual(await rects(), before, lens + ' moved objects');
    const shown = await page.$eval('.pf-cap[data-sel="postgres"]', e => [...e.querySelectorAll('.pf-l')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.className));
    assert.deepEqual(shown, ['pf-l ' + {operation: 'op', protection: 'pr', structure: 'st'}[lens]]);
  }
  await click('[data-pf="lens"][data-id="protection"]');
  assert.equal(await page.$$eval('.pf-cell.crossing .pf-x', els => els.filter(e => getComputedStyle(e).display !== 'none').length), 15, 'fifteen needs cross into another trust boundary');
  await click('[data-pf="lens"][data-id="structure"]');
  pass('Structure, Operation and Protection each give their own reading — Protection marks the fifteen needs that cross a trust boundary — and none of them moves anything');

  // 3. Selecting reads the capability; the chapter's editor and proposals are one click away.
  await click('.pf-cap[data-sel="postgres"]');
  assert.match(await spec(), /Transactional persistence[\s\S]*Supports[\s\S]*Payment service[\s\S]*Continuity[\s\S]*Single path[\s\S]*Recovery[\s\S]*No recovery plan/);
  assert.ok(await count('.pf-cell.lit') === 3 && await count('.pf-cell.dim') >= 20);
  await click('.cm-panel [data-t-action="edit"]'); await page.waitForTimeout(400);
  assert.match(await page.$eval('dialog[open] #t-dialog-title', e => e.textContent), /Edit TC-002 · Transactional persistence/);
  await closeDialog();
  await click('.cm-panel [data-t-action="preview"][data-t-key="restore"]'); await page.waitForTimeout(800);
  assert.match(await page.$eval('.cm-banner', e => e.innerText), /Capability proposal · not saved[\s\S]*recovery dependencies/i);
  assert.equal(await count('.pf-arc.proposed'), 2, 'the recovery path is drawn to backup and recovery');
  await click('.cm-banner [data-t-action="dismiss"]'); await page.waitForTimeout(500);
  assert.equal(await count('.pf-arc.proposed'), 0);
  pass('selecting a capability reads what it supports, depends on, and how it continues and recovers; Edit capability opens the Chapter 6 editor, and Propose a recovery path draws its two dependencies until dismissed');

  // 4. What fails together.
  await click('.pf-fail[data-id="gateway"]'); await page.waitForTimeout(300);
  assert.ok(await page.$('.cm-view[data-id="failure"][aria-pressed="true"]'));
  assert.equal(await count('.pf-ch.unavailable'), 5, 'every component stops');
  assert.equal(await count('.pf-cap.unavailable'), 2, 'connectivity takes execution with it');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /Service connectivity lost · 2 capabilities down · 5 of 5 components stop/);
  for (let i = 0; i < 2; i++) await click('[data-pf="walk-next"]');
  assert.match(await page.$eval('.cm-walk-text', e => e.innerText), /2 \/ 4 · What depends on it Critical dependencies carry it to Application execution/);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await click('[data-pf="mode"][data-id="domain"]');
  assert.equal(await count('.pf-cap.unavailable'), 8, 'the shared domain loses every capability but the safe bypass');
  assert.equal(await count('.pf-cap.degraded'), 1);
  await click('[data-pf="view"][data-id="platform"]');
  assert.deepEqual(await rects(), before, 'the failure view moved nothing');
  pass('What fails together removes Service connectivity with the chapter\'s own simulation — execution goes with it and all five components stop — walks it in four stages, loses the whole shared domain on request, and moves nothing');

  // 5. Dissect and fold; a component reads its needs.
  await page.click('.pf-cap[data-sel="tc-001"]'); await page.waitForTimeout(120); await page.click('.pf-cap[data-sel="tc-001"]'); await page.waitForTimeout(500);
  assert.match(await crumbs(), /Whole platform › Application execution and what it depends on/);
  assert.equal(await count('.pf-cap'), 3, 'execution, connectivity and evidence');
  for (let i = 0; i < 3 && /›/.test(await crumbs()); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  assert.doesNotMatch(await crumbs(), /›/);
  await click('[data-pf="depth"][data-id="modules"]');
  assert.equal(await count('.pf-ch.module'), 3);
  await click('[data-pf="depth"][data-id="components"]');
  await click('.pf-ch[data-sel="worker"]');
  assert.match(await spec(), /Settlement worker[\s\S]*Stands on[\s\S]*Messaging → Durable work handoff[\s\S]*Stops if lost/);
  await click('.cm-panel [data-t-action="needs"]'); await page.waitForTimeout(400);
  assert.match(await page.$eval('dialog[open] #t-dialog-title', e => e.textContent), /Technology needs · APP-004/);
  await closeDialog();
  pass('a capability opens with what it depends on and what depends on it, Escape steps back, modules fold, and a component reads what it stands on with its needs editor one click away');

  // 6. The explorer is one click away; other chapters keep their models.
  await click('[data-pf="explore"]'); await page.waitForTimeout(400);
  assert.ok(await page.$('.am-explorer [data-am="chapter-model"]') && !(await page.$('.cm')));
  await click('.am-explorer [data-am="chapter-model"]'); await page.waitForTimeout(500);
  assert.ok(await page.$('.cm.pf .pf-cap'));
  await page.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'}); await page.waitForTimeout(900); assert.ok(await page.$('.cm.dk .dk-cell') && !(await page.$('.cm.rz, .cm.pf')), 'chapter 11 opens on the review desk');
  await open(5); assert.ok(await page.$('.cm.rz') && !(await page.$('.cm.pf')), 'Chapter 5 keeps its components');
  assert.equal(await count('.cm'), 1, 'only one chapter model is on the page');
  await open(6);
  await page.click('.workspace-bar [data-tab="validate"]'); await page.waitForTimeout(900);
  assert.ok(await page.$('.vx-ready') && !(await page.$('.cm')), 'Validate opens on SDD readiness');
  pass('Explore all perspectives and back, Chapter 11 opens on the review desk, Chapter 5 keeps its own models, only one chapter model is ever on the page, and Validate is unchanged');

  // 7. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=6&tab=model&model=platform', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .pf-cap'); await p2.waitForTimeout(400);
  const m = await p2.evaluate(() => ({h: document.querySelector('.cm-stage').getBoundingClientRect().height, over: document.documentElement.scrollWidth > innerWidth}));
  assert.ok(m.h >= 360 && !m.over, 'phone ' + JSON.stringify(m));
  await phone.close();
  pass('on a 390 px phone the platform has a usable canvas and no horizontal page scroll');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 6 model (rendered)', passed: checks.length, checks}, null, 2));
