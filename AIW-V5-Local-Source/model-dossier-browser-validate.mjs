// Focused rendered checks for the selected-object dossier in two chapters and a narrow viewport.
// AIW_BROWSER_EXECUTABLE points to an installed Chromium headless shell.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import net from 'node:net';

const require = createRequire(import.meta.url), {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(resolve => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: `.aiw-local/model-dossier-browser-${port}.sqlite`, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
const ready = new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', n => reject(Error('Local server exited ' + n))); });
let browser;
try {
  await ready;
  browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
  const base = `http://127.0.0.1:${port}`, errors = [];
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/?chapter=5&tab=model&model=diagram&object=api-pod`, {waitUntil: 'networkidle'});
  await page.waitForSelector('[data-nt-dossier="api-pod"]', {timeout: 25000});
  assert.equal(await page.locator('[data-nt-dossier="api-pod"]').count(), 1, 'one dossier for a selected component');
  assert.equal(await page.locator('[data-nt-dossier="api-pod"] > details:first-of-type').getAttribute('open'), '', 'why opens with the selected diagram object');
  assert.match(await page.locator('[data-nt-dossier="api-pod"]').innerText(), /Saved design[\s\S]*Why and design drivers[\s\S]*Illustrative implementation mapping/);
  await page.locator('[data-nt-dossier="api-pod"] > details:nth-of-type(2) > summary').click();
  assert.match(await page.locator('[data-nt-dossier="api-pod"] > details:nth-of-type(2)').innerText(), /Boundary[\s\S]*Accept instructions/);
  const specification = page.locator('[data-nt-dossier="api-pod"] > header a');
  assert.match(await specification.getAttribute('href'), /model=specification/);
  await specification.click();
  await page.waitForSelector('[data-spec-of="api-pod"]', {timeout: 25000});

  const phone = await browser.newPage({viewport: {width: 390, height: 844}});
  phone.on('pageerror', e => errors.push(e.message));
  await phone.goto(`${base}/?chapter=7&tab=model&model=diagram&object=tr-001`, {waitUntil: 'networkidle'});
  // rc41 close (strip C4): a held record opens Details by itself only where Details is a column (>= 1180 px); on a phone
  // it is a sheet over the toolbar and the picture, so the link holds its object and draws its dossier in the closed
  // sheet, and the toolbar offers Details; the person opens it there, and the dossier is read as before.
  const phoneDossier = phone.locator('[data-nt-dossier="tr-001"]'), phoneDetails = phone.locator('.workspace-tools [data-panel-toggle][aria-controls="inspector"]');
  // The dossier the open model has settled on: drawn after `stale` (when given) and in place for a second from now.
  const settledDossier = async stale => { await phone.evaluate(() => { window.__dossierSettle = {}; }); await phone.waitForFunction(stale => { const el = document.querySelector('[data-nt-dossier="tr-001"]'), s = window.__dossierSettle, now = performance.now(); if (el !== s.el) Object.assign(s, {el, at: now}); return !!el && !stale?.isConnected && now - s.at >= 1000; }, stale, {polling: 50, timeout: 25000}); };
  await phone.waitForSelector('[data-nt-dossier="tr-001"]', {state: 'attached', timeout: 25000});
  assert.equal(await phoneDossier.count(), 1, 'one dossier for the linked realization');
  await phone.locator('#subject-strip .ss-ref').filter({hasText: 'TR-001'}).waitFor({timeout: 25000});
  assert.deepEqual(await phone.evaluate(() => ({panel: document.body.dataset.panel, hidden: document.querySelector('#inspector')?.getAttribute('aria-hidden')})), {panel: 'collapsed', hidden: 'true'}, 'the phone sheet waits for the person');
  assert.equal(await phoneDossier.isVisible(), false, 'the dossier stays hidden until Details is opened');
  assert.equal(await phoneDetails.isVisible(), true, 'the toolbar offers Details on a phone');
  assert.deepEqual([await phoneDetails.getAttribute('aria-expanded'), await phoneDetails.getAttribute('aria-disabled')], ['false', null], 'Details is offered closed and available');
  const arrived = await phoneDossier.elementHandle();
  await phoneDetails.click();
  assert.deepEqual([await phoneDetails.getAttribute('aria-expanded'), await phone.locator('#inspector').getAttribute('aria-hidden')], ['true', 'false'], 'the toolbar opens the sheet');
  // Opening Details dispatches resize (workspace-ux.js applyPanelState) and the open model redraws its companion after
  // its 120 ms debounce (stack-view.js), replacing the dossier: the folds are opened in the dossier that redraw leaves.
  await settledDossier(arrived);
  await phone.waitForSelector('[data-nt-dossier="tr-001"]', {timeout: 25000});
  await phone.locator('[data-nt-dossier="tr-001"] > details:nth-of-type(2) > summary').click();
  assert.match(await phone.locator('[data-nt-dossier="tr-001"] > details:nth-of-type(2)').innerText(), /No option preferred/);
  const fold = await phone.locator('[data-nt-dossier="tr-001"] > details:nth-of-type(2)').elementHandle();
  assert.equal(await phone.locator('[data-nt-dossier="tr-001"]').evaluate(el => el.scrollWidth <= el.clientWidth + 2), true, 'dossier content fits its narrow companion');
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'the open sheet adds no sideways page scroll');
  await settledDossier(null);
  assert.equal(await fold.evaluate(d => d.isConnected && d.open), true, 'the fold the person opened stays open once the sheet settles');
  assert.deepEqual(errors, [], 'selection and navigation raise no browser errors');
  console.log('Model dossier browser: selection, disclosure, specification navigation, phone Details on request, mobile sizing, and errors passed.');
} finally {
  await browser?.close(); server.kill('SIGKILL');
}
