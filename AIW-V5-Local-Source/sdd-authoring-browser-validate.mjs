// The Chapter 11 content reading becomes an authoring queue: a field in Chapters 2 and 3 opens in its real editor,
// with the saved source still blank. A person supplies client facts; the report never invents them.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(resolve => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const db = '.aiw-local/sdd-authoring-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
const ready = new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.once('exit', code => reject(Error('server exited ' + code))); });
let browser;
try {
  await ready;
  browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const base = 'http://127.0.0.1:' + port;
  await page.goto(base + '/?chapter=11&tab=output', {waitUntil: 'networkidle'});
  // rc38+ (rc41 W4): the SDD prose report lives in the Output tab's "Sources and readiness" panel, a <details> the
  // toolbar's "Inspect sources" control opens; opened as a viewer opens it, and the control must say so.
  const sources = async () => { if (!await page.$('.output-source-panel[open]')) { await page.click('[data-output-panel="sources"]'); await page.waitForSelector('.output-source-panel[open] [data-rv-action="content-report"]', {timeout: 8000}); } assert.equal(await page.$eval('[data-output-panel="sources"]', b => b.getAttribute('aria-expanded')), 'true'); };
  await sources();
  await page.locator('.output-source-panel [data-rv-action="content-report"]').click();
  await page.locator('.rv-content-report').waitFor();
  assert.match(await page.locator('.rv-content-intro').innerText(), /source edits.*missing answers or alternatives/);
  const driver = page.locator('.rv-content-section a[data-rv-sdd-chapter="2"][data-rv-sdd-field="description"]').first();
  await driver.waitFor();
  const expectedRef = await driver.getAttribute('data-rv-sdd-ref');
  await driver.click();
  await page.locator('.q-dialog #q-driver-form [name="description"]').waitFor();
  assert.equal(await page.locator('.q-dialog #q-driver-form [name="description"]').inputValue(), '', 'the missing source fact stays empty');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('name')), 'description', 'the exact source field receives keyboard focus');
  assert.equal(new URL(page.url()).searchParams.get('chapter'), '2');
  assert.match(await page.locator('.q-dialog h2').innerText(), new RegExp(expectedRef));
  await page.locator('.q-dialog [data-d-action="close"],.q-dialog [data-q-action="close"]').first().click();
  await page.goto(base + '/?chapter=11&tab=output', {waitUntil: 'networkidle'});
  await sources();
  await page.locator('.output-source-panel [data-rv-action="content-report"]').click();
  const decision = page.locator('.rv-content-section a[data-rv-sdd-chapter="3"][data-rv-sdd-field="rationale"]').first();
  await decision.waitFor();
  await decision.click();
  await page.locator('.d-dialog #d-question-form [name="rationale"]').waitFor();
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('name')), 'rationale');
  assert.equal(new URL(page.url()).searchParams.get('chapter'), '3');
  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS SDD source authoring: report → exact Chapter 2 driver and Chapter 3 decision field, without fabricated answers');
  await page.close();
} finally {
  await browser?.close().catch(() => {});
  server.kill('SIGTERM');
  try { rmSync(db, {force: true}); } catch { /* temporary local DB */ }
}
