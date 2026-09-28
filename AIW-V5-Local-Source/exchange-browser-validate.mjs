// Rendered checks for the Chapter 8 Model views (sequence and data flow).
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
const db = '.aiw-local/exchange-browser-' + port + '.sqlite';
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
  const open = async (extra = '') => { await page.goto(base + '/?chapter=8&tab=model&model=sequence' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-head', {timeout: 8000}); await page.waitForTimeout(400); };
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' '));
  const lanes = () => page.$$eval('.cm-head[data-lane]', els => els.map(e => e.dataset.lane));
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.cm-head, .cm-msg, .cm-stephead, .cm-act, .cm-drow, .cm-auth, .cm-mv')].map(e => { const r = e.getBoundingClientRect(); return [String(e.className.baseVal ?? e.className).split(' ')[0], Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join('|'); }));
  const click = async sel => { await page.click(sel); await page.waitForTimeout(250); };
  const pickMessage = id => page.evaluate(id => [...document.querySelectorAll('.cm-msg[data-sel]')].find(e => e.dataset.sel === id).click(), id);
  const scenario = async id => { await page.selectOption('[data-cm-field="scenario"]', id); await page.waitForTimeout(300); };

  // 1. Chapter 8 Model opens on the sequence of the first business journey, in place of the explorer.
  await open();
  assert.ok(await page.$('.cm .cm-view[data-id="sequence"][aria-pressed="true"]'));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.am-explorer, .canvas-card')].some(e => getComputedStyle(e).display !== 'none')), false, 'the explorer and the old canvas are not shown');
  assert.equal((await lanes())[0], 'ext-channel');
  assert.ok((await page.$$('.cm-msg.call, .cm-msg.async')).length === 7, 'seven messages in the confirmed journey');
  assert.equal((await page.$$('.cm-stephead')).length, 5, 'five journey steps');
  assert.ok(await page.$eval('.cm-stage', e => e.getBoundingClientRect().height) >= 360);
  pass('Chapter 8 Model opens on the sequence of the confirmed payment journey: seven messages across five journey steps, reading from the initiating channel');

  // 2. Lenses never move anything, in either view.
  for (const view of ['sequence', 'data']) {
    await click(`[data-cm="view"][data-id="${view}"]`);
    const before = await rects();
    for (const lens of ['signals', 'information', 'flow']) { await click(`[data-cm="lens"][data-id="${lens}"]`); assert.deepEqual(await rects(), before, view + ': ' + lens + ' moved objects'); }
  }
  await click('[data-cm="view"][data-id="sequence"]');
  await click('[data-cm="lens"][data-id="signals"]');
  assert.ok((await page.$$('.cm-lens-signals .cm-sig i.miss')).length > 0, 'Signals shows what the contracts do not yet say');
  await click('[data-cm="lens"][data-id="flow"]');
  pass('switching Flow, Signals and Information leaves every lifeline, message and data row where it was, in both views');

  // 3. The uncertain journey loses the settlement answer and shows what the contract says next.
  await scenario('journey:uncertain');
  assert.ok(await page.$('.cm-msg.lost'), 'the lost answer is drawn');
  assert.match(await page.$eval('.cm-frame', e => e.innerText), /If the answer never arrives[\s\S]*Not recorded/);
  assert.match(await page.$eval('.cm-state', e => e.innerText), /1 lost answer/);
  await scenario('journey:held');
  assert.match(await page.$eval('.cm-end', e => e.className), /stopped/);
  await scenario('journey:confirmed');
  pass('the uncertain journey loses the settlement answer and shows the missing recovery policy in place; the held journey stops at screening');

  // 4. Selecting a message selects its contract and opens it in the companion.
  await pickMessage('if-004'); await page.waitForTimeout(300);
  assert.match(await page.$eval('.cm-panel .cm-spec', e => e.innerText), /IF-004 · Check[\s\S]*Edit contract/);
  assert.ok((await page.$$('.cm-msg.lit')).length >= 2 && (await page.$$('.cm-msg.dim')).length > 0, 'its messages light and the rest dim');
  await click('.cm-panel [data-brain-launch="design"]');
  assert.ok(await page.$('#brain-panel:not([hidden])'), 'Sol opened on the contract');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  pass('selecting a message opens its contract in the companion, lights every message it carries, and Ask Sol acts on it');

  // 5. Dissect: a part and back, with the same scenario.
  await open();
  await page.dblclick('.cm-head[data-lane="core-adapter"]'); await page.waitForTimeout(500);
  assert.match(await crumbs(), /Control & accounting › Core connector/);
  assert.ok((await lanes()).includes('GRP-001'), 'unrelated components fold into their module');
  assert.ok((await page.$$('.cm-msg.out')).length > 0, 'messages that do not touch the part are dimmed');
  for (let i = 0; i < 4 && /Core connector|Control/.test(await crumbs()); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  assert.doesNotMatch(await crumbs(), /Core connector|Control/);
  await click('[data-cm="depth"][data-id="modules"]');
  assert.ok((await lanes()).length === 6 && await page.$('.cm-msg.self'), 'module lifelines, with internal steps folded');
  await click('[data-cm="depth"][data-id="components"]');
  pass('a component can be dissected with its partners while the rest folds into modules; Escape steps back; module lifelines fold internal steps');

  // 6. Data flow keeps the same lifeline order and shows authority, copies and unexplained sends.
  const seqOrder = await lanes();
  await click('[data-cm="view"][data-id="data"]');
  const dataOrder = await lanes();
  assert.deepEqual(dataOrder.filter(id => seqOrder.includes(id)), seqOrder.filter(id => dataOrder.includes(id)), 'same order in both views');
  assert.equal((await page.$$('.cm-drow')).length, 4);
  assert.equal((await page.$$('.cm-auth')).length, 4);
  assert.equal((await page.$$('.cm-unsourced')).length, 2, 'two sends without a recorded source');
  await click('.cm-auth');
  assert.match(await page.$eval('.cm-panel .cm-spec', e => e.innerText), /Data definition[\s\S]*Authority/i);
  await click('[data-cm="view"][data-id="sequence"]');
  pass('Data flow keeps the sequence\'s column order and shows each definition\'s authority, copies, and the two sends no contract explains');

  // 7. Editing a contract goes through the chapter's editor and the reviewable proposal.
  await open();
  await pickMessage('network'); await page.waitForTimeout(300);
  await click('.cm-panel [data-i-action="edit-contract"]');
  assert.ok(await page.$('dialog.i-dialog[open]'), 'the chapter 8 contract editor opened');
  await click('dialog.i-dialog [data-i-step="2"]');
  await page.fill('dialog.i-dialog [name="timeoutPolicy"]', 'Keep the payment pending; enquire by payment reference before any resubmission.');
  await page.click('dialog.i-dialog button[type=submit]'); await page.waitForTimeout(1000);
  assert.match(await page.$eval('.cm-banner', e => e.innerText), /Unsaved proposal[\s\S]*IF-003/i);
  assert.ok((await page.$$('.cm .proposed')).length > 0, 'affected parts are marked');
  assert.match(await page.$eval('.cm-panel .cm-spec', e => e.innerText), /enquire by payment reference/);
  await page.reload({waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-head'); await page.waitForTimeout(300);
  assert.equal(await page.$eval('.cm-banner', e => e.innerText.trim()), '', 'nothing was saved without review');
  pass('Edit contract opens the Chapter 8 editor; the change appears as an unsaved proposal on the sequence, and nothing is saved without review');

  // 8. Walk through.
  await click('[data-cm="next"]'); await click('[data-cm="next"]');
  assert.match(await page.$eval('.cm-walk-text', e => e.innerText), /^2 \/ \d+/);
  assert.ok(await page.$('.cm-msg.now, .cm-guard.now'));
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  assert.ok(!(await page.$('.cm-msg.now')));
  pass('the scenario can be walked one message at a time with a plain reading of each step');

  // 9. The connected explorer is one click away and remembers the choice.
  await click('[data-cm="explore"]'); await page.waitForTimeout(400);
  assert.ok(await page.$('.am-explorer') && !(await page.$('.cm')));
  await page.reload({waitUntil: 'networkidle'}); await page.waitForTimeout(800);
  assert.ok(await page.$('.am-explorer [data-am="chapter-model"]') && !(await page.$('.cm')), 'the explorer choice persists');
  await click('.am-explorer [data-am="chapter-model"]'); await page.waitForSelector('.cm .cm-msg', {timeout: 8000}); await page.waitForTimeout(200);
  assert.ok(await page.$('.cm .cm-msg'));
  pass('Explore all perspectives switches to the connected explorer, the choice persists, and the explorer returns to the Chapter 8 models');

  // 10. Other tabs and chapters are unaffected.
  await page.click('.workspace-bar [data-tab="validate"]'); await page.waitForTimeout(900);
  assert.ok(await page.$('.vx-ready') && !(await page.$('.cm')), 'Validate opens on SDD readiness');
  await page.click('.workspace-bar [data-tab="work"]'); await page.waitForTimeout(500);
  assert.ok(!(await page.$('.cm')));
  await page.click('.workspace-bar [data-tab="model"]'); await page.waitForTimeout(700);
  assert.ok(await page.$('.cm .cm-msg'));
  await page.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'}); await page.waitForTimeout(900); assert.ok(await page.$('.cm.dk .dk-cell') && !(await page.$('.cm.ex')), 'chapter 11 opens on the review desk');
  await page.goto(base + '/?chapter=9&tab=model&model=model', {waitUntil: 'networkidle'}); await page.waitForTimeout(700);
  assert.ok(await page.$('.cm.tm') && !(await page.$('.cm-msg')), 'chapter 9 opens on its own models, not Chapter 8\'s');
  pass('Validate and Work are unchanged; Chapter 11 opens on the review desk, and Chapter 9 opens on its own');

  // 11. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=8&tab=model&model=sequence', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .cm-head'); await p2.waitForTimeout(400);
  const m = await p2.evaluate(() => ({h: document.querySelector('.cm-stage').getBoundingClientRect().height, over: document.documentElement.scrollWidth > innerWidth}));
  assert.ok(m.h >= 360 && !m.over, 'phone ' + JSON.stringify(m));
  await phone.close();
  pass('on a 390 px phone the sequence has a usable canvas and no horizontal page scroll');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 8 model (rendered)', passed: checks.length, checks}, null, 2));
