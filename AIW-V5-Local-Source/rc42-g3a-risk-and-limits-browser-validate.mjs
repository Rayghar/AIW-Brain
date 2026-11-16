// AIW v0.10.0-rc.10.73.42, group G3a, review r2: the in-place treatment dialog (app.js treatFinding, opened from a
// chapter's Validate tab) in a real browser. D13 (gap C11-01): a hard-constraint or invariant finding is offered no waiver
// (no accepted limitation, not applicable or source silent); for another finding an accepted limitation asks for a
// review-by date, required, whose earliest day is tomorrow (the server's rule, review-domain.js reviewByMin), and the
// date field is shown only for a limitation. The Chapter 11 dialog (review-ui.js) is driven in
// rc42-g3a-risk-and-limits-validate.mjs.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally AIW_BROWSER_EXECUTABLE.
// Starts an isolated local server on a free port from 4100-4999. Run: npm run test:rc42-g3a-risk-and-limits-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const free = p => new Promise(r => { const s = net.createServer().once('error', () => r(false)).listen(p, '127.0.0.1', () => s.close(() => r(true))); });
let port = 0;
for (let i = 0; !port && i < 50; i++) { const p = 4100 + Math.floor(Math.random() * 900); if (await free(p)) port = p; }
assert.ok(port >= 4100 && port <= 4999, 'a free port in 4100-4999');
const db = process.env.AIW_LOCAL_DB || '.aiw-local/rc42-g3a-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } });
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port, checks = [], errors = [], pass = n => checks.push(n);
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
try {
  const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
  page.on('pageerror', e => errors.push(e.message));
  const open = async () => { await page.goto(base + '/?chapter=9&tab=validate'); await page.waitForSelector('[data-validation-workspace$=":9:"][data-bound="1"]'); await page.waitForTimeout(400); };
  await open();
  // A dual control threat no dual control covers: C9 dual-control-uncovered, an authorisation invariant.
  await page.evaluate(async () => { await window.aiwProjectStore.command({type: 'security.threat', payload: {title: 'One officer enters and releases a payment', category: 'Dual control & segregation of duties', actor: 'An officer acting alone', scenario: 'The officer who enters a payment also releases it.', consequence: 'A fraudulent payment leaves the bank.', owner: 'Operations risk', priority: 'High', priorityBasis: 'Fraud loss.', targetIds: ['rest']}}); });
  await open();
  const region = page.getByRole('region', {name: 'Chapter 9 validation'}), detail = region.getByRole('region', {name: 'Selected finding'});
  const treat = async match => {
    const all = await region.locator('[data-validation-select]').evaluateAll(xs => xs.map(x => x.dataset.validationSelect));
    const key = all.find(match); assert.ok(key, 'the finding is listed: ' + all.join(', '));
    await region.locator('[data-validation-select="' + key + '"]').click();
    await page.waitForFunction(k => document.querySelector('[data-validation-select="' + CSS.escape(k) + '"]')?.getAttribute('aria-pressed') === 'true', key);
    await detail.locator('[data-action="treat-finding"]').click(); await page.waitForSelector('#treat-form');
    return page.$$eval('#treat-form [name="treatment"] option', o => o.map(x => x.value));
  };
  const close = async () => { await page.click('#treat-form [data-action="close-modal"]'); await page.waitForTimeout(200); };
  assert.deepEqual(await treat(k => k.includes('dual-control-uncovered')), ['Fix before review'], 'an invariant breach is offered no waiver here (Carry as action is defined in Chapter 11)');
  await close();
  pass('the in-place treatment dialog offers no accepted limitation, not applicable or source silent for C9 dual-control-uncovered');

  assert.deepEqual(await treat(k => !k.includes('dual-control') && /(^|:)uncovered:/.test(k)), ['Fix before review', 'Accepted design limitation', 'Not applicable', 'Source silent · raised with the owner'], 'a waivable finding is offered every treatment this dialog records');
  const field = () => page.evaluate(() => { const i = document.querySelector('#treat-form [name="reviewBy"]'), l = i?.closest('label'); return {type: i?.type, hidden: !!l?.hidden, required: !!i?.required, min: i?.min}; });
  assert.deepEqual(await field(), {type: 'date', hidden: true, required: false, min: await page.evaluate(() => new Date(Date.now() + 864e5).toISOString().slice(0, 10))}, 'fix before review asks for no date');
  await page.selectOption('#treat-form [name="treatment"]', 'Accepted design limitation');
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  assert.deepEqual(await field(), {type: 'date', hidden: false, required: true, min: tomorrow}, 'an accepted limitation asks for a review-by date, required, from tomorrow');
  await page.selectOption('#treat-form [name="treatment"]', 'Not applicable');
  assert.equal((await field()).hidden, true, 'not applicable asks for none');
  await close();
  pass('for a waivable finding the dialog shows the review-by date only for an accepted limitation, required, earliest day tomorrow');
  assert.deepEqual(errors, [], 'no page errors');
  console.log(`PASS rc42 G3a browser (D13 treatment dialog): ${checks.length} checks\n- ` + checks.join('\n- '));
} finally {
  await browser.close(); server.kill('SIGKILL');
  for (const f of [db, db + '-wal', db + '-shm']) try { rmSync(f, {force: true}); } catch { /* left for the next run */ }
}
