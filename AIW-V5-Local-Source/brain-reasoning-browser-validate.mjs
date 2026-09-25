// Rendered checks for Sol at the review desk, against a loopback test double of the provider
// (mock-llm-provider.mjs): asking, what is sent, assessments on the desk, refinements into a draft and
// through the change review, proposed threats, disagreement, currency and persistence.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally
// AIW_BROWSER_EXECUTABLE. Run: npm run test:brain-reasoning-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';
import {startMockLLM} from './mock-llm-provider.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const llm = await startMockLLM();
const db = '.aiw-local/sol-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'mock-sol', AIW_LLM_BASE_URL: llm.url}, stdio: ['ignore', 'pipe', 'inherit']});
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => { checks.push(n); if (process.env.DK_DEBUG) console.error('PASS', checks.length, n.slice(0, 60)); };
try {
  const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
  page.on('pageerror', e => errors.push(e.message));
  const open = async () => { await page.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.dk .dk-cell', {timeout: 8000}); if (!(await page.$('.cm.dk .cm-view[data-id="vitals"][aria-pressed="true"]'))) await page.click('.cm.dk .cm-view[data-id="vitals"]'); await page.waitForFunction(() => /mock-sol/.test(document.querySelector('.dk-solchip')?.innerText || ''), null, {timeout: 8000}); await page.waitForTimeout(300); };
  const act = async sel => { await page.$eval(sel, e => e.click()); await page.waitForTimeout(300); };
  const doc = () => page.evaluate(() => window.aiwProjectStore.value.document);
  // Sent means answered: the prepared packet is gone and the desk announces the assessment (a flash from an
  // earlier request may still be showing, so it is not enough to see one).
  const send = async () => { await page.waitForSelector('.dk-solpend [data-dk="sol-send"]:not([disabled])', {timeout: 8000}); await act('.dk-solpend [data-dk="sol-send"]'); await page.waitForFunction(() => !document.querySelector('.dk-solpend') && /Sol assessed/.test(document.querySelector('.dk-flash')?.innerText || ''), null, {timeout: 10000}); await page.waitForTimeout(300); };
  // A click on a cell lands once the desk has finished redrawing after the last change.
  const pick = async (card, crumb) => { for (let i = 0; i < 4; i++) { if (i && process.env.DK_DEBUG) console.error("RETRY", card); await act(`[data-card="${card}"]`); if (await page.waitForFunction(c => new RegExp(c).test(document.querySelector('.cm-crumbs')?.innerText || ''), crumb, {timeout: 2500}).then(() => true, () => false)) return; } throw Error('The desk did not select ' + card); };
  const sol = () => page.$$eval('.cm-panel .dk-sol', xs => xs.map(e => e.innerText).join('\n'));

  // 1. Asking: prepared and shown first, then sent.
  await open();
  assert.match(await page.$eval('.dk-solchip', e => e.innerText), /Sol\s*mock-sol/);
  await act('[data-card="C:run-001:capacity"]');
  await act('.cm-panel .dk-solagain [data-dk="sol-ask"]');
  await page.waitForSelector('.dk-solpend');
  const pending = await page.$eval('.dk-solpend', e => e.innerText);
  assert.match(pending, /Let RUN-001 grow to 24 replicas[\s\S]*Sol will read \d+ sources: 1 desk reading, 1 objective & assumptions[\s\S]*product mechanism/i);
  assert.equal(llm.calls.length, 0, 'preparing sends nothing to the provider');
  await page.click('.dk-solpend .dk-solsee > summary'); await page.click('.dk-solpend .dk-solsrc li:first-child summary');
  assert.match(await page.$eval('.dk-solpend .dk-solsee', e => e.innerText), /S1[\s\S]*needs 24 replicas/);
  await send();
  assert.deepEqual(llm.calls, ['aiw_desk_assessment', 'aiw_desk_assessment_check'], 'one assessment and one source check');
  assert.match(await page.$eval('.dk-flash', e => e.innerText), /Sol assessed 1 decision: 1 refine/);
  assert.match(await sol(), /Sol’s assessment[\s\S]*Refine[\s\S]*Keep the draft, with 26 replicas rather than 24[\s\S]*Grow to[\s\S]*24 → 26[\s\S]*source-checked/i);
  assert.ok(await page.$('[data-card="C:run-001:capacity"] .dk-solb.refine'), 'the cell carries Sol’s verdict');
  pass('asking Sol: the desk prepares what Sol will read — the decision\'s reading, the objective, the product mechanisms, the drivers — and shows every excerpt before anything is sent; sent, one assessment and one source check come back, and the cell carries Sol\'s verdict');

  // 2. Using the refinement: the draft takes Sol's number, the desk reads it, the change review applies it.
  await act('.cm-panel .dk-sol [data-dk="sol-use"]');
  await page.waitForSelector('.dk-preview');
  assert.equal(await page.$eval('.dk-fix [data-dk-in="fix"][data-key="maxReplicas"]', e => e.value), '26');
  assert.ok(await page.$('.dk-fix .dk-soltag'), 'the knob says Sol set it');
  assert.ok(await page.$('.dk-cell.ok.chg[data-card="C:run-001:capacity"]'), 'the instruments re-read the design with Sol\'s number');
  await act('.cm-panel .dk-fix [data-dk="fix-apply"]');
  await page.waitForSelector('dialog[open]');
  assert.match(await page.$eval('dialog[open]', e => e.innerText), /maxReplicas[\s\S]*26/);
  await page.check('dialog[open] [data-reviewed]'); await page.click('dialog[open] [data-wb-action="apply-preview"]');
  await page.waitForFunction(() => /with Sol’s refinements/.test(document.querySelector('.dk-flash')?.innerText || ''), null, {timeout: 8000});
  let d = await doc();
  assert.equal(d.runtime.plans.find(r => r.id === 'run-001').maxReplicas, 26);
  assert.deepEqual(d.coauthoring.assessments.map(a => [a.itemId, a.outcome, a.verdict]), [['F:capacity:run-001', 'used', 'refine'], ['F:capacity:run-001', 'applied', 'refine']]);
  pass('using Sol\'s refinement: the draft takes Sol\'s 26 replicas, the desk re-reads the design with them, the change review shows and applies them, and the use and the application are recorded with the model and sources');

  // 3. A whole step, and the verdicts on the cells.
  await act('.cm-crumbs [data-dk="clear"]');
  // The desk redraws its steps after the change review has been applied; wait for them under load.
  await page.waitForFunction(() => [...document.querySelectorAll('.cm-panel .dk-step')].some(x => /Record how the failure of 12 parts would be seen/.test(x.innerText)), null, {timeout: 15000});
  const step = await page.$$eval('.cm-panel .dk-step', xs => xs.findIndex(x => /Record how the failure of 12 parts would be seen/.test(x.innerText)));
  await page.$$eval('.cm-panel .dk-step', (xs, i) => xs[i].querySelector('[data-dk="sol-ask"]').click(), step);
  await page.waitForSelector('.dk-solpend');
  assert.match(await page.$eval('.dk-solpend', e => e.innerText), /8 decisions/);
  await send();
  assert.match(await page.$eval('.dk-flash', e => e.innerText), /Sol assessed 8 decisions/);
  assert.equal(await page.$$eval('.dk-cell .dk-solb', xs => xs.filter(x => x.closest('[data-card$=":observability"]')).length), 8);
  assert.match(await page.$$eval('.cm-panel .dk-step', (xs, i) => xs[i].innerText, step), /Sol[\s\S]*of 8/);
  pass('a whole step at once: eight decisions in one request, each cell carrying Sol\'s verdict, and the step summarising them');

  // 4. A judgement: Sol proposes a threat; recorded through Chapter 9's review, the desk reads it.
  await pick('C:run-002:security', 'RUN-002 · Protection');
  await act('.cm-panel .dk-solagain [data-dk="sol-ask"]');
  await send();
  assert.match(await sol(), /Your call[\s\S]*Sol proposes 1 threat[\s\S]*Unauthorised use of the risk decision/i);
  await act('.cm-panel .dk-sol [data-dk="sol-threats"]');
  await page.waitForSelector('dialog[open]');
  await page.check('dialog[open] [data-reviewed]'); await page.click('dialog[open] [data-wb-action="apply-preview"]');
  await page.waitForFunction(() => /Recorded in Chapter 9: 1 threat Sol proposed/.test(document.querySelector('.dk-flash')?.innerText || ''), null, {timeout: 8000});
  d = await doc();
  const t = d.security.threats.at(-1);
  assert.equal(t.title, 'Unauthorised use of the risk decision'); assert.equal(t.origin, 'suggestion'); assert.deepEqual(t.targetIds, ['risk-engine']);
  assert.ok(await page.$('[data-card="C:run-002:security"].bad'), 'the threat is now on the desk, uncovered');
  pass('a judgement the desk will not make: Sol proposes a threat on the listed targets only; recorded through Chapter 9\'s change review, it is on the desk, uncovered, ready for a drafted control');

  // 5. Disagreeing, and advice that has gone out of date.
  await pick('C:run-001:capacity', 'RUN-001 · Capacity');
  await page.waitForFunction(() => /The reading has changed since Sol assessed it/.test([...document.querySelectorAll('.cm-panel .dk-sol')].map(e => e.innerText).join('\n')), null, {timeout: 15000}).catch(() => {});
  assert.match(await sol(), /The reading has changed since Sol assessed it/, 'applied, the advice is history');
  assert.ok(await page.$('[data-card="C:run-001:capacity"] .dk-solb.stale') || !(await page.$('[data-card="C:run-001:capacity"] .dk-solb')));
  await pick('C:run-003:observability', 'RUN-003 · Observability');
  await act('.cm-panel .dk-sol [data-dk="sol-dismiss"]');
  await page.fill('.cm-panel .dk-soldis textarea', 'The core connector is monitored by the core banking team already.');
  await page.click('.cm-panel .dk-soldis button[type=submit]'); await page.waitForTimeout(800);
  d = await doc();
  assert.deepEqual(d.coauthoring.assessments.at(-1).outcome, 'dismissed'); assert.match(d.coauthoring.assessments.at(-1).reason, /core banking team/);
  pass('disagreeing records why, with the sources the advice rested on; advice whose reading has changed is shown as history, not advice');

  // 6. Persistence: the assessments come back with the desk.
  await open();
  assert.ok(await page.$$eval('.dk-cell .dk-solb', xs => xs.length) >= 8, 'Sol\'s verdicts return with the desk');
  assert.match(await page.$eval('.dk-solchip', e => e.innerText), /assessed/);
  pass('Sol\'s assessments are kept with the project\'s other Sol responses and come back with the desk');

  assert.deepEqual(errors, []);
  pass('no page errors');
} finally {
  await browser.close(); server.kill(); await llm.close();
  try { rmSync(db, {force: true}); rmSync(db + '-wal', {force: true}); rmSync(db + '-shm', {force: true}); } catch { /* best effort */ }
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
