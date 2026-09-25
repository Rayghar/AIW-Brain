// Rendered checks for the Validate tab: SDD readiness and the model views behind one switch.
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
const db = '.aiw-local/validate-browser-' + port + '.sqlite';
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
  const open = async (ch, extra = '') => { await page.goto(base + '/?chapter=' + ch + '&tab=validate' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.vx-bar', {timeout: 8000}); await page.waitForTimeout(700); };
  const count = async sel => (await page.$$(sel)).length;
  const shown = sel => page.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }, sel);
  const pressed = () => page.$eval('.vx-switch [aria-pressed="true"]', e => e.dataset.id);

  // 1. Validate opens on SDD readiness: the chapter's own checks, with the journey read above them.
  await open(4);
  assert.equal(await pressed(), 'readiness');
  assert.ok(!(await page.$('.an')), 'the anatomy waits behind the switch');
  assert.equal(await count('.vx-tile'), 11, 'every chapter, with Review & SDD');
  assert.match(await page.$eval('.vx-ready header', e => e.innerText), /211 blocking findings in 7 chapters stand between this design and a reviewable SDD/);
  assert.match(await page.$eval('.vx-tile.cur', e => e.innerText), /04[\s\S]*Logical[\s\S]*clear[\s\S]*11 to review/);
  assert.match(await page.$eval('.vx-tile[href*="chapter=7"]', e => e.innerText), /72 blocking/);
  assert.match(await page.$eval('.vx-state', e => e.textContent), /Chapter 4 · nothing blocks the SDD · 11 to review · 4 of 8 milestones/);
  assert.ok(await shown('.content-card') && /Find the gaps in the connected model[\s\S]*Run checks/.test(await page.$eval('.content-card', e => e.innerText)), 'the chapter\'s original checks follow');
  pass('Validate opens on SDD readiness: the chapter\'s own checks and milestones, with every chapter\'s blocking findings read as one line across the journey above them');

  // 2. What the chapter's own models show sits beside the checks.
  await page.waitForSelector('.vx-obs:not([hidden])', {timeout: 8000});
  assert.match(await page.$eval('.vx-obs', e => e.innerText), /Chapter 4 models also show · 7[\s\S]*Risk hold journey ends at LR-002 Risk screening/i);
  assert.ok(await page.$('.vx-obs a[href*="chapter=4"][href*="tab=model"][href*="object=risk"]'), 'each observation opens the model on what it concerns');
  pass('the Chapter 4 models\' own observations sit beside the checks, each opening the model on what it concerns, marked as prompts rather than blockers');

  // 3. The switch: the model views are the design anatomy; the choice is remembered.
  await page.click('.vx-switch [data-id="model"]'); await page.waitForSelector('.an .an-n', {timeout: 8000}); await page.waitForTimeout(400);
  assert.equal(await pressed(), 'model');
  assert.ok(!(await page.$('.vx-ready')) && !(await shown('.content-card')), 'the anatomy takes the surface on its own');
  assert.match(await page.$eval('.vx-state', e => e.textContent), /whole design as one body, as of Chapter 4/);
  await open(6); await page.waitForSelector('.an .an-n');
  assert.equal(await pressed(), 'model', 'remembered across chapters and reloads');
  await open(6, '&validate=readiness');
  assert.equal(await pressed(), 'readiness', 'a link can ask for readiness'); assert.ok(await page.$('.vx-ready') && !(await page.$('.an')));
  pass('the switch opens the model views — the design anatomy — on their own, remembers the choice across chapters and reloads, and a link can ask for SDD readiness');

  // 4. Chapters 1–3 and 11 keep their own checks under the same switch.
  await open(1);
  assert.equal(await pressed(), 'readiness');
  assert.match(await page.$eval('.vx-tile.cur', e => e.innerText), /01[\s\S]*Requirements[\s\S]*1 blocking/);
  assert.ok(/Make the requirements defensible/.test(await page.$eval('.r-surface', e => e.innerText)), 'Chapter 1\'s own checks');
  await page.click('.vx-switch [data-id="model"]'); await page.waitForSelector('.an .an-n', {timeout: 8000});
  assert.ok(!(await shown('.r-surface > .r-card')), 'Chapter 1\'s checks wait behind the switch');
  await page.click('.vx-switch [data-id="readiness"]'); await page.waitForTimeout(500);
  await open(11);
  assert.match(await page.$eval('.vx-tile.cur', e => e.innerText), /11[\s\S]*Review & SDD[\s\S]*2 blocking/);
  assert.ok(!(await page.$('.vx-link')), 'Chapter 11 needs no link to itself');
  assert.match(await page.$eval('.content-card', e => e.innerText), /Challenge the design[\s\S]*211[\s\S]*blockers need treatment/);
  await page.click('.vx-tile[href*="chapter=8"]'); await page.waitForSelector('.vx-bar'); await page.waitForTimeout(600);
  assert.match(page.url(), /chapter=8/); assert.match(await page.$eval('.vx-tile.cur', e => e.innerText), /Interfaces/);
  pass('Chapters 1–3, with their own page, and Chapter 11\'s final review keep their checks under the same switch, and each chapter on the line opens that chapter\'s checks');

  // 5. Model-tab links to the checks ask for readiness.
  await page.goto(base + '/?chapter=5&tab=model', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .rz-card'); await page.waitForTimeout(400);
  assert.match(await page.$eval('.cm-panel a[href*="tab=validate"]', e => e.getAttribute('href')), /validate=readiness/);
  pass('the chapter models\' "All checks on Validate" links open SDD readiness, whichever view was last chosen');

  // 6. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=8&tab=validate', {waitUntil: 'networkidle'}); await p2.waitForSelector('.vx-ready'); await p2.waitForTimeout(400);
  assert.equal(await p2.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal page scroll');
  await phone.close();
  pass('on a 390 px phone SDD readiness has no horizontal page scroll');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'Validate: SDD readiness and model views (rendered)', passed: checks.length, checks}, null, 2));
