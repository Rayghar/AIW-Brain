// Rendered Chapter 3 branch interaction. Run with AIW_BROWSER_EXECUTABLE if Chromium is elsewhere.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(resolve => { const socket = net.createServer().listen(0, '127.0.0.1', () => { const value = socket.address().port; socket.close(() => resolve(value)); }); });
const db = '.aiw-local/whatif-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* The server may already have exited. */ } });
await new Promise((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('ready')) resolve(); }); server.on('exit', code => reject(Error('Server exited ' + code))); });
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:' + port + '/?chapter=3&tab=model', {waitUntil: 'networkidle'});
  await page.waitForSelector('.cm.dx .dx-card');
  const before = await page.evaluate(() => JSON.stringify(window.aiwProjectStore.value.document));
  await page.click('.cm.dx [data-dx="whatif-open"]');
  assert.equal(await page.locator('.dx-whatif').evaluate(e => e.open), true);
  await page.selectOption('[data-wh-driver] [data-wh-id]', 'QD-002');
  await page.selectOption('[data-wh-driver] [data-wh-priority]', 'Low');
  await page.click('[data-dx="whatif-add-driver"]');
  await page.selectOption('[data-wh-driver]:nth-child(2) [data-wh-id]', 'QD-003');
  await page.selectOption('[data-wh-driver]:nth-child(2) [data-wh-priority]', 'Low');
  await page.click('[data-dx="whatif-compare"]');
  // Round 25 (D-25-05, D-25-07): the lead before and after in the reading's words; a tie names the tied.
  assert.match(await page.locator('[data-wh-result]').innerText(), /ADR-001[\s\S]*Leads on the drivers: Acknowledge a durable asynchronous handoff → a tie of Keep the customer request synchronous and Acknowledge a durable asynchronous handoff\./);
  assert.match(await page.locator('[data-wh-result]').innerText(), /working choice[\s\S]*unchanged/i);
  assert.doesNotMatch(await page.locator('[data-wh-result]').innerText(), /Weighted lean|No unique lean|favou?r|scored|winner/i);
  assert.match(await page.locator('[data-wh-result] header').innerText(), /Arithmetic on the recorded effects, not a measurement; it does not choose\./, 'the reading\'s note beside the totals');
  checks.push('combined priorities reveal a tie, named in the reading\'s words, without changing the working choice');
  await page.locator('[data-wh-chapter="7"] summary').click();
  // A chapter's records load when its disclosure opens, on the details toggle event, which the browser fires after the
  // click has returned: wait for them to be drawn, then require every record the summary counts (up to a page of 40).
  await page.locator('[data-wh-chapter="7"] .dx-wh-record').first().waitFor();
  const listed = Number(await page.locator('[data-wh-chapter="7"] summary span').innerText());
  assert.ok(listed > 0);
  assert.equal(await page.locator('[data-wh-chapter="7"] .dx-wh-record').count(), Math.min(listed, 40));
  assert.match(await page.locator('[data-wh-chapter="7"]').innerText(), /suitability requires review/);
  checks.push('linked technology realization records are available by chapter with recorded product caveat');
  await page.locator('[data-wh-driver] [data-dx="whatif-remove"]').first().click();
  await page.locator('[data-wh-driver] [data-dx="whatif-remove"]').first().click();
  await page.click('[data-dx="whatif-add-constraint"]');
  await page.selectOption('[data-wh-constraint] [data-wh-id]', 'CON-001');
  await page.fill('[data-wh-constraint] [data-wh-description]', 'Posting must preserve one financial effect across retries.');
  await page.click('[data-dx="whatif-compare"]');
  assert.match(await page.locator('[data-wh-result]').innerText(), /CON-001[\s\S]*hypothetical wording/i);
  await page.locator('.dx-wh-method summary').click();
  assert.match(await page.locator('.dx-wh-method').innerText(), /Constraint propagation follows direct requirement links/);
  checks.push('constraint branch is visibly hypothetical with source trace');
  assert.equal(await page.evaluate(() => JSON.stringify(window.aiwProjectStore.value.document)), before);
  assert.deepEqual(errors, []);
  checks.push('no project mutation or browser errors');
  await page.click('[data-dx="whatif-close"]');
  assert.equal(await page.locator('.dx-whatif').evaluate(e => e.open), false);
  // Round 25 (D-25-03, D-25-05), in light and in dark: how firmly the lead holds with the branch, in the reading's own
  // sentence, and an alternative a hard constraint rules out, marked and not ranked. The constraint is set through the
  // project's own commands, each change reviewed by a person (an ordinary change waits for that review).
  const command = async (type, payload) => {
    await page.evaluate(([type, payload]) => { window.__aiwCmd = null; window.aiwProjectStore.command({type, payload}).then(() => { window.__aiwCmd = 'ok'; }, e => { window.__aiwCmd = 'error: ' + e.message; }); }, [type, payload]);
    const seen = await (await page.waitForFunction(() => window.__aiwCmd || (document.querySelector('dialog.wb-dialog[open]') ? 'review' : null), null, {timeout: 15000})).jsonValue();
    if (seen === 'review') { await page.check('dialog.wb-dialog [data-reviewed]'); await page.fill('dialog.wb-dialog [name=reason]', 'Synthetic facts for the decision reading, reviewed.'); await page.click('dialog.wb-dialog [data-wb-action="apply-preview"]'); await page.waitForFunction(() => window.__aiwCmd, null, {timeout: 15000}); }
    assert.equal(await page.evaluate(() => window.__aiwCmd), 'ok', type);
  };
  const doc = () => page.evaluate(() => window.aiwProjectStore.value.document);
  await command('quality.driver', {kind: 'constraint', title: 'Post through the existing core ledger', description: 'Every posting goes through the existing core ledger.', impact: 'Rules out a second store of postings.', constraintIds: ['CON-001'], priority: 'High'});
  let d = await doc();
  const C = d.quality.drivers.at(-1).id, d2 = () => d.decisions.records.find(x => x.id === 'ADR-002');
  await command('decision.save', {id: 'ADR-002', driverIds: [...d2().driverIds, C]});
  d = await doc();
  await command('decision.alternative', {id: 'ADR-002', alternativeId: 'ALT-004', assessments: {...d2().alternatives.find(a => a.id === 'ALT-004').assessments, [C]: {effect: 'violates', reason: 'The cache keeps its own record of postings.', evidence: 'Synthetic design review notes.'}}});
  const unchanged = JSON.stringify(await doc());
  for (const theme of ['light', 'dark']) {
    await page.click(`.top-actions [data-theme-choice="${theme}"]`); await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
    await page.click('.cm.dx [data-dx="whatif-open"]');
    await page.selectOption('[data-wh-driver] [data-wh-id]', 'QD-006');
    await page.selectOption('[data-wh-driver] [data-wh-priority]', 'Low');
    await page.click('[data-dx="whatif-add-driver"]');
    await page.selectOption('[data-wh-driver]:nth-child(2) [data-wh-id]', 'QD-003');
    await page.selectOption('[data-wh-driver]:nth-child(2) [data-wh-priority]', 'Low');
    await page.click('[data-dx="whatif-compare"]');
    const result = await page.locator('[data-wh-result]').innerText();
    assert.match(result, /ADR-001[\s\S]*Leads on the drivers: Acknowledge a durable asynchronous handoff → Acknowledge a durable asynchronous handoff\. Working choice: None selected \(unchanged\)\.[\s\S]*With the branch: The lead holds for any weights that keep each High driver at least as heavy as each Medium one, and each Medium at least as heavy as each Low one\./, theme + ': how firmly the lead holds with the branch');
    assert.match(result, /ADR-002[\s\S]*Ruled out, not ranked: Suppress repeats in the application cache breaks QD-007, a hard constraint\./, theme + ': the ruled-out alternative, marked and not ranked');
    const ratio = await page.$eval('.dx-wh-out', e => { const parse = c => c.match(/[\d.]+/g).slice(0, 3).map(Number), lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }; let g = e; while (g && getComputedStyle(g).backgroundColor.replace(/\s/g, '').endsWith(',0)')) g = g.parentElement; const a = lum(parse(getComputedStyle(e).color)), b = lum(parse(getComputedStyle(g || document.body).backgroundColor)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); });
    assert.ok(ratio >= 4.5, theme + ': the ruled-out line reads at 4.5:1 or better (' + ratio.toFixed(2) + ')');
    await page.click('[data-dx="whatif-close"]');
    checks.push(`${theme}: the branch says how firmly the lead holds after it, in the reading's sentence, and marks an alternative a hard constraint rules out, not ranked; the working choice is unchanged`);
  }
  assert.equal(JSON.stringify(await doc()), unchanged, 'the branches changed nothing');
  await page.click('.top-actions [data-theme-choice="light"]');
  assert.deepEqual(errors, [], 'no browser errors in either theme');
  const mobile = await browser.newPage({viewport: {width: 390, height: 844}});
  await mobile.goto('http://127.0.0.1:' + port + '/?chapter=3&tab=model', {waitUntil: 'networkidle'});
  await mobile.waitForSelector('.cm.dx .dx-card');
  await mobile.click('.cm.dx [data-dx="whatif-open"]');
  await mobile.waitForSelector('.dx-whatif[open]');
  const viewport = await mobile.evaluate(() => { const x = document.querySelector('.dx-whatif').getBoundingClientRect(); return {width: x.width, right: x.right, innerWidth}; });
  assert.ok(viewport.width > 320 && viewport.right <= viewport.innerWidth + 1, JSON.stringify(viewport));
  checks.push('comparison opens within a 390 px phone viewport');
} finally {
  await browser.close(); server.kill();
  try { rmSync(db, {force: true}); } catch { /* A failed scratch cleanup cannot change the test result. */ }
}
console.log(JSON.stringify({suite:'architecture what-if rendered',passed:checks.length,checks},null,2));
