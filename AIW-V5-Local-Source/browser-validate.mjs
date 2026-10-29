// The Chapter 4–11 shell in a real browser (audit F-02, F-11, F-12, F-13, F-14, F-22, UX-20).
// The Model tab is the chapter's own model with no hidden canvas beneath it; the Chapter 5 trace and the
// Chapter 6 failure lab sit visibly below the model and record their reviews; Back returns to the previous
// tab and chapter; choosing a chapter keeps the tab; another tab's save is announced; a project that cannot
// open names its cause; the footer states what produces guidance; no width scrolls sideways.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally
// AIW_BROWSER_EXECUTABLE. Run: npm run test:browser
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
// A free port and a private database, so this suite never touches the workbench you use.
process.env.PORT = String(await new Promise((resolve) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); }));
const privateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiw-browser-'));
process.env.AIW_LOCAL_DB = path.join(privateDir, 'project.sqlite');
process.env.OPENAI_API_KEY = '';
const base = 'http://127.0.0.1:' + process.env.PORT;
const {server} = await import('./server.js');
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = (name) => { checks.push(name); console.log('PASS', name); };
const route = (page) => page.evaluate(() => { const q = new URLSearchParams(location.search); return {chapter: q.get('chapter'), tab: q.get('tab')}; });
const activeTab = (page) => page.locator('.tab.active').getAttribute('data-tab');
const noSidewaysScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
try {
  const context = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', (e) => errors.push(e.message));

  // The Model tab is the chapter model alone; the retired canvas, its hidden details and ribbon are not built.
  // Its column beside the stage is the model companion (round 3, B): it holds the companion and no studio details.
  await page.goto(base + '/?chapter=4&tab=model', {waitUntil: 'networkidle'});
  await page.locator('.cm [data-nt-node], .cm [data-card]').first().waitFor();
  const model = await page.evaluate(() => ({graph: !!document.querySelector('#graph, [data-node]'), inspector: !!document.querySelector('#inspector:not(.model-companion), #inspector > :not(.cm-companion, .panel-toggle)'), ribbon: !!document.querySelector('#ux-selection'), nextStrip: !!document.querySelector('.next-strip'), elements: document.querySelectorAll('*').length}));
  assert.deepEqual({graph: model.graph, inspector: model.inspector, ribbon: model.ribbon, nextStrip: model.nextStrip}, {graph: false, inspector: false, ribbon: false, nextStrip: false});
  // Round26 baseline renders 1455 elements; refinement adds 12 contextual controls (1467).
  // Keep a bounded DOM budget alongside the assertions excluding a duplicated hidden canvas.
  assert(model.elements < 1500, `the Chapter 4 Model page has ${model.elements} elements`);
  pass(`Chapter 4 Model is the chapter model with no hidden canvas beneath it (${model.elements} elements)`);

  // Work, Validate and Output keep the studio surface, what comes next, and the object details.
  await page.locator('.tab[data-tab="work"]').click();
  await page.locator('#inspector').waitFor();
  assert(await page.locator('.next-strip').isVisible());
  pass('Work shows the studio surface, what comes next and the object details');

  // Tabs and chapters are history entries; choosing a chapter keeps the tab.
  await page.locator('.tab[data-tab="validate"]').click();
  await page.locator('.tab[data-tab="output"]').click();
  await page.goBack();
  assert.deepEqual(await route(page), {chapter: '4', tab: 'validate'}); assert.equal(await activeTab(page), 'validate');
  await page.goBack();
  assert.deepEqual(await route(page), {chapter: '4', tab: 'work'}); assert.equal(await activeTab(page), 'work');
  await page.locator('.tab[data-tab="validate"]').click();
  await page.locator('[data-chapter="6"]').click();
  assert.deepEqual(await route(page), {chapter: '6', tab: 'validate'}); assert.equal(await activeTab(page), 'validate');
  await page.goBack();
  assert.deepEqual(await route(page), {chapter: '4', tab: 'validate'}); assert.equal(await activeTab(page), 'validate');
  assert.match(await page.locator('.breadcrumb').innerText(), /Chapter 04/);
  pass('Back returns to the previous tab and chapter, and choosing a chapter keeps the tab');

  // Chapters 1–3 are in the same shell (round 3, A): their tabs are history entries too, and a chapter link keeps the tab.
  await page.goto(base + '/?chapter=1&tab=work', {waitUntil: 'networkidle'});
  await page.locator('.tab[data-tab="validate"]').click();
  await page.goBack();
  assert.equal((await route(page)).tab, 'work');
  await page.locator('.tab[data-tab="validate"]').click();
  await Promise.all([page.waitForURL(/chapter=4/), page.locator('a.chapter-item[data-chapter="4"]').click()]);
  await page.locator('.tab.active').waitFor();
  assert.equal(await activeTab(page), 'validate');
  pass('Chapter 1 tabs are history entries, and moving to Chapter 4 keeps the Validate tab');

  // Chapter 5: the outcome trace sits below the model and records an application scenario review.
  await page.goto(base + '/?chapter=5&tab=model', {waitUntil: 'networkidle'});
  const trace = page.locator('#flow-panel');
  await trace.locator('#scenario').waitFor();
  assert(await trace.isVisible());
  await trace.locator('#scenario').selectOption('hold');
  await trace.locator('[data-action="step-flow"]').click();
  await trace.locator('[data-action="step-flow"]').click();
  await trace.locator('.journey-copy', {hasText: 'No ledger posting'}).waitFor();
  const record = trace.locator('[data-a-action="review-scenario"]');
  assert(await record.isEnabled(), 'the review can be recorded once every step of the outcome is traced');
  await record.click();
  await trace.locator('.l-scenario-review', {hasText: 'Application simulation reviewed for this model'}).waitFor();
  pass('Chapter 5 trace is visible below the model and records the risk-hold review');

  // Chapter 6: the failure lab starts from the panel below the model.
  await page.goto(base + '/?chapter=6&tab=model', {waitUntil: 'networkidle'});
  await page.locator('#flow-panel [data-t-action="simulate"]').click();
  await page.locator('#flow-panel .t-failure-lab').waitFor();
  assert(await page.locator('#flow-panel .t-failure-lab').isVisible());
  pass('Chapter 6 failure lab opens visibly below the model');

  // The footer says what produces guidance, from the configuration; About describes the workbench as it is.
  await page.locator('#guidance-source', {hasText: 'No language model is connected'}).waitFor();
  await page.locator('[data-action="about"]').click();
  assert.equal(await page.locator('#dialog-title').innerText(), 'About this workbench');
  assert(!/canvas controls|Chapters 4–9/i.test(await page.locator('.dialog').innerText()));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.dialog').count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.action), 'about');
  pass('Footer guidance comes from the configuration; About opens, closes on Escape and returns focus');

  // A save in one tab is announced in another tab of the same project before it could conflict.
  const other = await context.newPage();
  other.on('pageerror', (e) => errors.push(e.message));
  await other.goto(base + '/?chapter=4&tab=work', {waitUntil: 'networkidle'});
  await page.goto(base + '/?chapter=4&tab=work', {waitUntil: 'networkidle'});
  await page.evaluate(async () => {
    delete window.aiwReviewOrdinaryChange;
    await window.aiwProjectStore.command({type: 'logical.responsibility', payload: {title: 'Enquiry ownership', purpose: 'Own settlement enquiries', boundary: 'Enquiries only', owner: 'Operations', source: 'Browser check', groupId: 'GRP-003', requirementIds: ['REQ-004'], decisionIds: []}});
  });
  await other.locator('[data-load-latest]').waitFor();
  const before = await other.evaluate(() => window.aiwProjectStore.value.revision);
  await other.locator('[data-load-latest]').click();
  await other.locator('.save-state', {hasText: 'Saved to your private project'}).waitFor();
  assert(await other.evaluate(() => window.aiwProjectStore.value.revision) > before);
  await other.close();
  pass('Another tab is told of a newer save and loads it');

  // A page error is reported in the page, once, not only in the console.
  await page.evaluate(() => setTimeout(() => { throw Error('deliberate check error'); }));
  await page.locator('#toast', {hasText: 'did not work as expected'}).waitFor();
  const deliberate = errors.indexOf('deliberate check error'); assert(deliberate >= 0); errors.splice(deliberate, 1);
  pass('An unexpected error is reported in the page');

  // No width scrolls sideways.
  for (const width of [1280, 1024, 768, 390]) {
    await page.setViewportSize({width, height: 900});
    for (const tab of ['model', 'work']) {
      await page.goto(`${base}/?chapter=4&tab=${tab}`, {waitUntil: 'networkidle'});
      assert(await noSidewaysScroll(page), `no sideways scroll at ${width}px on ${tab}`);
    }
  }
  pass('No sideways scrolling at 1280, 1024, 768 and 390 pixels');

  // A project that cannot open says so while it opens, then names the cause and offers a retry.
  const failing = await browser.newContext({viewport: {width: 1440, height: 900}});
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  await failing.route('**/api/project*', async (r) => {
    if (new URL(r.request().url()).pathname !== '/api/project') return r.continue();
    await held;
    await r.fulfill({status: 503, contentType: 'application/json', body: JSON.stringify({error: 'Project storage is unavailable right now.'})});
  });
  const broken = await failing.newPage();
  await broken.goto(base + '/?chapter=4&tab=model');
  await broken.locator('main.r-loading[aria-busy="true"]', {hasText: 'Opening your architecture workspace'}).waitFor();
  release();
  await broken.locator('main.r-loading h1', {hasText: 'could not be opened'}).waitFor();
  assert.equal(await broken.locator('main.r-loading p').innerText(), 'Project storage is unavailable right now.');
  assert.equal(await broken.evaluate(() => document.activeElement?.id), 'retry-project');
  await failing.close();
  pass('Opening shows a loading state, and a failure names its cause and focuses the retry');

  assert.deepEqual(errors, []);
  pass('No browser JavaScript errors');
  console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
} catch (error) {
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
  await fs.rm(privateDir, {recursive: true, force: true}).catch(() => {});
}
