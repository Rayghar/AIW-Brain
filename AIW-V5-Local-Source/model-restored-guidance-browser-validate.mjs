// Focused actual-browser regression: contextual Questions, prerequisite gates,
// native reading guidance, and reopening Details without leaving expanded Model.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import {createRequire} from 'node:module';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
process.chdir(projectRoot);
const {chromium} = createRequire(import.meta.url)(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'aiw-restored-guidance-'));
const evidence = path.resolve(process.env.AIW_MODEL_GUIDANCE_EVIDENCE || 'test-results/model-restored-guidance');
await fs.mkdir(evidence, {recursive: true});
process.env.PORT = String(await new Promise((resolve, reject) => {
  const socket = net.createServer(); socket.on('error', reject);
  socket.listen(0, '127.0.0.1', () => { const port = socket.address().port; socket.close(() => resolve(port)); });
}));
process.env.AIW_LOCAL_DB = path.join(temporary, 'project.sqlite');
process.env.AIW_CLIENT_DIR = path.resolve(process.env.AIW_MODEL_GUIDANCE_CLIENT || 'public');
process.env.OPENAI_API_KEY = ''; process.env.ANTHROPIC_API_KEY = '';
const {server} = await import('./server.js');
if (!server.listening) await once(server, 'listening');
const base = `http://127.0.0.1:${process.env.PORT}`;
const result = {suite: 'Restored Model guidance', client: process.env.AIW_CLIENT_DIR, checks: [], errors: [], requests: [], clicks: []};
const native = {1:'map', 2:'tree', 3:'map', 4:'map', 5:'components', 6:'platform', 7:'stack', 8:'data', 9:'model', 10:'deploy', 11:'vitals'};
let browser, page, failure;

async function openModel(chapter, project, view = native[chapter], object) {
  const query = new URLSearchParams({chapter: String(chapter), tab: 'model', model: view});
  if (project) query.set('project', project);
  if (object) query.set('object', object);
  if (page.url().startsWith(base) && await page.evaluate(() => typeof window.aiwRoute === 'function')) await page.evaluate(url => window.aiwRoute(url), '/?' + query);
  else await page.goto(`${base}/?${query}`, {waitUntil: 'domcontentloaded'});
  await page.locator('.cm-top[data-model-slot]').waitFor();
  await page.waitForFunction(({chapter, view}) => {
    const raw = document.querySelector('.cm')?.dataset.modelContext;
    return !!window.aiwProjectStore?.value?.document && raw && Number(JSON.parse(raw).chapter) === chapter && JSON.parse(raw).view === view;
  }, {chapter, view});
}
async function click(selector) {
  const control = page.locator(selector).filter({visible: true}).first();
  const record = await control.evaluate(el => ({label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 150), tag: el.tagName, attributes: Object.fromEntries([...el.attributes].filter(a => a.name.startsWith('data-')).map(a => [a.name, a.value]))}));
  await control.click(); result.clicks.push({selector, ...record});
}
async function question(view) {
  if (!await page.locator('.cm-qpick').evaluate(el => el.open)) await click('.cm-qpick > summary');
  await click(`.cm-qentry[data-cm-question="${view}"]`);
  await page.waitForFunction(id => document.querySelector(`.cm-view[data-id="${id}"]`)?.getAttribute('aria-pressed') === 'true' && JSON.parse(document.querySelector('.cm').dataset.modelContext).view === id, view);
}
const context = () => page.evaluate(() => ({url: location.href, selected: new URLSearchParams(location.search).get('object'), model: JSON.parse(document.querySelector('.cm').dataset.modelContext), zoom: document.querySelector('.cm-zoom-value')?.textContent.trim(), transform: document.querySelector('.cm-world')?.style.transform, panel: document.body.dataset.panel}));

try {
  browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
  page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => result.errors.push(error.message));
  page.on('requestfailed', request => result.requests.push({url: new URL(request.url()).pathname, error: request.failure()?.errorText}));
  await openModel(1);
  const project = await page.evaluate(() => window.aiwProjectStore.value.document.id);
  const initialDocument = await page.evaluate(() => JSON.stringify(window.aiwProjectStore.value.document));

  for (let chapter = 1; chapter <= 11; chapter++) {
    await openModel(chapter, project);
    assert.equal(await page.locator('.cm-qpick').count(), 1, `Chapter ${chapter}: one Questions guide`);
    await click('.cm-qpick > summary');
    const rows = await page.locator('.cm-qentry').evaluateAll(nodes => nodes.map(n => ({text: n.textContent.trim(), view: n.dataset.cmQuestion, disabled: n.disabled})));
    assert.ok(rows.some(r => r.view === native[chapter] && !r.disabled), `Chapter ${chapter}: native question offered`);
    assert.ok(rows.some(r => r.view === 'table' && !r.disabled), `Chapter ${chapter}: shared question offered`);
    assert.ok(rows.every(r => r.text.length > 20), 'Questions retain explanatory words');
    await question('table');
    await page.locator('.nt-table').waitFor();
    assert.equal(new URL(page.url()).searchParams.get('chapter'), String(chapter));
    assert.equal(await page.evaluate(() => window.aiwProjectStore.value.document.id), project);
    await question(native[chapter]);
    const caption = page.locator('.cm-reading-caption');
    const activeReadings = await page.locator('.cm-lenses [aria-pressed="true"], .cm-depth [aria-pressed="true"]').allTextContents();
    if (activeReadings.some(s => s.trim())) {
      await caption.waitFor({state: 'visible'});
      const text = await caption.innerText();
      for (const reading of activeReadings.map(s => s.trim()).filter(Boolean)) assert.ok(text.includes(reading), `Chapter ${chapter}: caption describes ${reading}`);
    }
    const checks = page.locator('.cm-model-utility [data-model-checks]');
    assert.equal(await checks.count(), 1, 'one current chapter check link');
    const checkURL = new URL(await checks.getAttribute('href'), page.url());
    assert.equal(checkURL.searchParams.get('chapter'), String(chapter));
    assert.equal(checkURL.searchParams.get('tab'), 'validate');
    await click('.cm-model-utility .cm-connection > summary');
    assert.match(await page.locator('.cm-connection').innerText(), /not connected|no (?:language )?model|rule.based/i, 'local guidance does not imply a connected provider');
    await click('.cm-model-utility .cm-connection > summary');
    result.checks.push({chapter, questions: rows.length, native: native[chapter], shared: 'table', caption: await caption.textContent().catch(() => null), checks: checkURL.search});
  }

  await openModel(4, project);
  await question('coverage');
  await page.goto(`${base}/?project=${encodeURIComponent(project)}&chapter=4&tab=model`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.querySelector('.cm-view[data-id="coverage"]')?.getAttribute('aria-pressed') === 'true');
  result.checks.push({rememberedNativeView: 'coverage', restoredWithoutModelQuery: true});
  await page.setViewportSize({width: 390, height: 844});
  await click('.cm-qpick > summary');
  const questionBounds = await page.locator('.cm-qpick > div').boundingBox();
  assert.ok(questionBounds.x >= 0 && questionBounds.x + questionBounds.width <= 391, 'phone Questions menu stays inside the viewport');
  await page.screenshot({path: path.join(evidence, 'phone-questions.png')});
  await question('table');
  await page.locator('.nt-table').waitFor();
  await page.setViewportSize({width: 1440, height: 1000});
  result.checks.push({phoneQuestionNavigation: 'table', bounds: questionBounds});

  // A chosen camera and real selection survive view guidance and repeated Details toggles.
  const selected = await page.evaluate(() => window.aiwProjectStore.value.document.logical.responsibilities[0].id);
  await openModel(4, project, 'map', selected);
  await question('table'); await question('map');
  assert.equal(new URL(page.url()).searchParams.get('object'), selected, 'Questions preserve the selected record');
  await click('.cm-zoom-value');
  for (let n = 0; n < 3; n++) await click('.cm-zoom [aria-label="Zoom in"]');
  await click('[data-lr="expand"]');
  await page.waitForFunction(() => document.body.classList.contains('cm-expanded'));
  const toggle = page.locator('.cm-expanded-details[data-panel-toggle]');
  await toggle.waitFor({state: 'visible'});
  if (await toggle.getAttribute('aria-expanded') !== 'true') await click('.cm-expanded-details[data-panel-toggle]');
  await page.waitForTimeout(200);
  const before = await context();
  for (const expanded of [false, true, false, true]) {
    await click('.cm-expanded-details[data-panel-toggle]');
    await page.waitForFunction(open => document.body.dataset.panel === (open ? 'open' : 'collapsed'), expanded);
    await page.waitForTimeout(200);
    assert.equal(await toggle.getAttribute('aria-expanded'), String(expanded));
    assert.equal(await toggle.isVisible(), true, 'expanded Details remains reachable when closed');
    const after = await context();
    assert.equal(after.selected, before.selected); assert.equal(after.model.view, before.model.view); assert.equal(after.zoom, before.zoom, 'chosen zoom survives Details resizing');
  }
  const after = await context();
  assert.equal(after.transform, before.transform, 'reopening Details restores the same native camera');
  await click('.cm-zoom [aria-label="Zoom out"]');
  assert.notEqual((await context()).zoom, before.zoom, 'canvas camera remains interactive');
  await page.screenshot({path: path.join(evidence, 'expanded-details.png')});
  await click('[data-lr="expand"]');
  await click('.cm-model-utility [data-model-checks]');
  await page.waitForFunction(() => new URLSearchParams(location.search).get('tab') === 'validate');
  assert.equal(new URL(page.url()).searchParams.get('object'), selected, 'checks link retains the selected object');
  assert.equal(await page.evaluate(() => JSON.stringify(window.aiwProjectStore.value.document)), initialDocument, 'guidance and frame controls do not alter the saved design');
  result.checks.push({expandedDetails: 'close/reopen twice', before, after, savedDocumentUnchanged: true});

  // A real blank project makes prerequisite gates observable without inventing records.
  await page.goto(`${base}/?view=projects`, {waitUntil: 'domcontentloaded'});
  await click('#new-project');
  await page.locator('#create-form [name=name]').fill('Synthetic guidance prerequisite check');
  await page.locator('#create-form [name=template][value=blank]').check();
  await click('#create-submit');
  await page.waitForURL(/chapter=1/);
  const blank = new URL(page.url()).searchParams.get('project');
  assert.ok(blank && blank !== project);
  for (const [chapter, gatedView] of [[2, 'tune'], [4, 'coverage'], [10, 'failure'], [11, 'load']]) {
    await openModel(chapter, blank);
    await click('.cm-qpick > summary');
    const gated = page.locator(`[data-cm-question="${gatedView}"]`);
    assert.equal(await gated.isDisabled(), true, `${gatedView} waits for real prerequisite records`);
    const explanation = await gated.innerText();
    assert.match(explanation, /record|first|needs|requires|add|later|chapter/i);
    await question('table');
    assert.equal(await page.evaluate(() => window.aiwProjectStore.value.document.id), blank, 'blank-project guide keeps project context');
    result.checks.push({blankChapter: chapter, disabled: gatedView, explanation});
  }
  assert.deepEqual(result.errors, [], 'no browser exceptions');
  result.status = 'passed';
} catch (error) {
  failure = error; result.status = 'failed'; result.failure = error.stack || String(error);
  await page?.screenshot({path: path.join(evidence, 'failure.png')}).catch(() => {});
} finally {
  await fs.writeFile(path.join(evidence, 'results.json'), JSON.stringify(result, null, 2) + '\n');
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  await fs.rm(temporary, {recursive: true, force: true});
}
console.log(JSON.stringify({suite: result.suite, status: result.status, checks: result.checks.length, clicks: result.clicks.length, errors: result.errors, evidence}, null, 2));
if (failure) throw failure;
