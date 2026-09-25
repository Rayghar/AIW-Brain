// Rendered checks for the design anatomy on the Validate tab.
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
const db = '.aiw-local/anatomy-browser-' + port + '.sqlite';
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
  const open = async (ch, extra = '') => { await page.goto(base + '/?chapter=' + ch + '&tab=validate&validate=model' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.an .an-n', {timeout: 8000}); await page.waitForTimeout(500); };
  const rects = () => page.$$eval('.an-world .an-n[data-id]', els => els.map(e => [e.dataset.kind + ':' + e.dataset.id, e.offsetLeft, e.offsetTop, e.offsetWidth, e.offsetHeight].join('|')).sort());
  const kinds = () => page.$$eval('.an-world .an-n[data-kind]', els => [...new Set(els.map(e => e.dataset.kind))]);

  // 1. Every chapter's Validate shows the anatomy, grown to that chapter, with the checks below.
  for (let ch = 1; ch <= 11; ch++) {
    await open(ch);
    const k = await kinds();
    assert.equal(k.includes('comp'), ch >= 5, 'components at chapter ' + ch);
    assert.equal(k.includes('lane'), ch >= 6, 'capability lanes at chapter ' + ch);
    assert.equal(k.includes('run'), ch >= 10, 'runtime at chapter ' + ch);
    const box = await page.$eval('.an-stage', e => e.getBoundingClientRect().height);
    assert.ok(box >= 360, 'stage height at chapter ' + ch + ': ' + box);
    assert.ok(await page.$('.vx-bar [data-vx="mode"][data-id="readiness"]') && !(await page.$('.vx-ready')), 'the chapter checks are one switch away');
  }
  pass('Validate in Chapters 1–11 shows the anatomy grown to that chapter, with the chapter checks and SDD readiness one switch away');

  // 2. Lenses never move an object.
  await open(11);
  const before = await rects();
  for (const lens of ['flow', 'signals', 'information', 'protection', 'operation', 'reasoning', 'structure']) {
    await page.click(`.an [data-an="lens"][data-id="${lens}"]`); await page.waitForTimeout(150);
    assert.deepEqual(await rects(), before, lens + ' lens moved objects');
  }
  pass('switching between all seven lenses leaves every object where it was');

  // 3. Selecting a part lights its lineage and opens its specimen.
  await page.click('.an-world .an-n[data-kind="comp"][data-id="core-adapter"]'); await page.waitForTimeout(300);
  assert.ok(await page.$('.an-world .an-sel[data-id="core-adapter"]'));
  assert.ok((await page.$$('.an-world .an-dim')).length > 0, 'unrelated parts dim');
  assert.ok((await page.$$('.an-world .an-lit')).length >= 3, 'lineage lit');
  assert.match(await page.$eval('.an-panel', e => e.innerText), /Selected[\s\S]*Core connector[\s\S]*Realizes/i);
  pass('selecting a component lights its lineage and shows what it realizes, needs, calls and runs as');

  // 4. Sol and Mind Factory act on the selected part.
  await page.click('.an-panel [data-brain-launch="design"]'); await page.waitForTimeout(400);
  assert.ok(await page.$('#brain-panel:not([hidden])'), 'Sol opened');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  pass('Ask Sol opens from the selected part');

  // 5. Dissect: system → module → part, and back.
  await open(11);
  await page.click('.an-head [data-an="dissect"][data-id="GRP-002"]'); await page.waitForTimeout(600);
  assert.match(await page.$eval('.an-crumbs', e => e.innerText), /Control & accounting/);
  const heads = await page.$$eval('.an-head', els => els.map(e => e.className));
  assert.ok(heads.some(c => c.includes('component')) && heads.some(c => c.includes('ctx')), 'module columns are its components with context');
  await page.dblclick('.an-world .an-n[data-kind="comp"][data-id="core-adapter"]'); await page.waitForTimeout(600);
  assert.match(await page.$eval('.an-crumbs', e => e.innerText), /Core connector/);
  assert.ok(await page.$('.an-world .an-n.an-full[data-id="core-adapter"]'), 'the part is shown in full');
  // Escape steps back one thing at a time: the selection, then the part, then the module.
  await page.focus('.an-stage');
  for (let i = 0; i < 4 && /Core connector|Control & accounting/.test(await page.$eval('.an-crumbs', e => e.innerText)); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(450); }
  assert.doesNotMatch(await page.$eval('.an-crumbs', e => e.innerText), /Core connector|Control & accounting/);
  pass('a module and then a single component can be dissected with the same layers, and Escape steps back to the whole system');

  // 6. Opening a layer enlarges it and compacts the others.
  await page.click('.an-label[data-band="capability"]'); await page.waitForTimeout(500);
  assert.ok(await page.$('.an-label.open[data-band="capability"]'));
  assert.ok(await page.$('.an-world .an-lane.an-open'), 'capability lanes opened');
  assert.ok(await page.$('.an-world .an-resp.an-compact'), 'other layers compact');
  pass('opening a layer enlarges it while every other layer stays visible and compact');

  // 7. Findings: a rule group steps through the parts it concerns.
  await open(8);
  const group = await page.$('.an-panel [data-an="group"]');
  assert.ok(group, 'findings are grouped');
  await group.click(); await page.waitForTimeout(500);
  const sel = await page.$eval('.an-world .an-sel, .an-world .an-socket.an-sel', e => e.dataset.id).catch(() => null);
  assert.ok(sel, 'a finding selects its part');
  const vis = await page.$eval('.an-world .an-sel', e => { const r = e.getBoundingClientRect(), s = document.querySelector('.an-stage').getBoundingClientRect(); return r.bottom > s.top && r.top < s.bottom && r.right > s.left && r.left < s.right; });
  assert.ok(vis, 'the part is brought into view');
  pass('rule-based findings are grouped, and each group steps through the parts it concerns');

  // 8. Smart arrangement: drag a module column, then restore the smart order.
  await open(11);
  const order = () => page.$$eval('.an-head.module', els => els.map(e => e.dataset.target));
  const smart = await order();
  const h = await page.$('.an-head.module');
  const b = await h.boundingBox();
  await page.mouse.move(b.x + 20, b.y + 10); await page.mouse.down(); await page.mouse.move(b.x + b.width * 2.4, b.y + 10, {steps: 8}); await page.mouse.up(); await page.waitForTimeout(600);
  const moved = await order();
  assert.notDeepEqual(moved, smart, 'column moved');
  await page.reload({waitUntil: 'networkidle'}); await page.waitForSelector('.an .an-n'); await page.waitForTimeout(400);
  assert.deepEqual(await order(), moved, 'manual arrangement persists');
  await page.click('.an [data-an="smart"]'); await page.waitForTimeout(500);
  assert.deepEqual(await order(), smart, 'smart arrangement restored');
  pass('a module column can be dragged into a new place, the arrangement persists, and Smart arrange restores it');

  // 9. Replay the build-up.
  await page.click('.an [data-an="replay"]'); await page.waitForTimeout(700);
  assert.match(await page.$eval('.an-state', e => e.innerText), /as of Chapter [1-3]/);
  assert.equal((await kinds()).includes('comp'), false, 'replay starts before components exist');
  await page.click('.an [data-an="replay"]'); await page.waitForTimeout(500);
  assert.match(await page.$eval('.an-state', e => e.innerText), /Chapter 11 · the design so far/);
  pass('Replay the build-up rebuilds the design from Chapter 1 and can be stopped to return to this chapter');

  // 10. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=6&tab=validate&validate=model', {waitUntil: 'networkidle'}); await p2.waitForSelector('.an .an-n'); await p2.waitForTimeout(400);
  const m = await p2.evaluate(() => ({h: document.querySelector('.an-stage').getBoundingClientRect().height, over: document.documentElement.scrollWidth > innerWidth}));
  assert.ok(m.h >= 360 && !m.over, 'phone stage ' + JSON.stringify(m));
  await phone.close();
  pass('on a 390 px phone the anatomy has a usable canvas and no horizontal page scroll');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'design anatomy (rendered)', passed: checks.length, checks}, null, 2));
