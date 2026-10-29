// A malformed/unknown requirement reference must remain an editable inline error,
// without a command request, document change, lost form value or uncaught page error.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync, writeFileSync, rmSync} from 'node:fs';
import net from 'node:net';
import {chromium} from 'playwright';
const port = await new Promise(resolve => {const s = net.createServer().listen(0, '127.0.0.1', () => {const p = s.address().port; s.close(() => resolve(p));});});
const db = '.aiw-local/ground-reference-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: '', ANTHROPIC_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => {try {server.kill('SIGKILL');} catch { /* already gone */ } for (const f of [db, db + '-wal', db + '-shm']) rmSync(f, {force: true});});
await new Promise((resolve, reject) => {server.stdout.on('data', d => {if (String(d).includes('ready')) resolve();}); server.on('exit', code => reject(Error('Server exited ' + code)));});
// rc38+ (rc41 W4): a record's requirement grounds are a picker (record-fields.js pickHTML): the value is a hidden input
// (data-pick-value) and a person can only add records the picker lists. setGrounds(): when the field is the picker, the
// typed path is checked first — the bad reference, searched in the picker's own Find box, offers nothing to add — and the
// stale value (a reference already in the draft that no longer resolves, as a retired or foreign requirement would) is set
// on the hidden field the way a restored draft carries it, with a change event; the form's validation is then pinned as
// before. A plain text field is filled as before.
const setGrounds = async (page, grounds, value, {probe = false} = {}) => {
  const picker = await grounds.evaluate(e => e.type === 'hidden' && e.hasAttribute('data-pick-value'));
  if (!picker) { await grounds.fill(value); return; }
  if (probe) {
    const box = grounds.locator('xpath=ancestor::*[@data-pick][1]'), find = box.locator('[data-pick-find]');
    await find.fill(value); await page.waitForTimeout(150);
    if (await box.locator('[data-pick-add]').count()) throw Error('the picker offers a record to add for ' + value);
    const none = (await box.locator('.l-pick-results').innerText()).trim();
    if (none !== 'Nothing else matches this search.') throw Error('the picker does not say nothing matches ' + value + ': ' + none);
    await find.fill('');
  }
  await grounds.evaluate((e, v) => { e.value = v; e.closest('[data-pick]').dispatchEvent(new Event('change', {bubbles: true})); }, value);
};
const browser = await chromium.launch({headless: true, executablePath: process.env.AIW_BROWSER_EXECUTABLE});
const results = [], errors = [], out = 'audit/refinement-validateoutput'; mkdirSync(out, {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  page.on('pageerror', e => errors.push(e.message));
  for (const c of [
    {chapter: 6, stage: '[data-t-action="work-stage"][data-t-stage="capabilities"]', edit: '[data-t-action="edit"]', dialog: '.t-dialog', step: '[data-t-step="1"]', form: '#t-capability-form'},
    {chapter: 7, edit: '[data-tr-action="edit-plan"]', dialog: '.tr-dialog', step: '[data-tr-step="2"]', disclosure: 'Capacity and cost assumptions', form: '#tr-plan-form'},
    {chapter: 8, edit: '[data-i-action="edit-contract"]', dialog: '.i-dialog', form: '#i-editor'},
    {chapter: 9, edit: '[data-sec-action="edit-threat"]', dialog: '.sec-dialog', step: '[data-sec-step="2"]', form: '#sec-editor'}
  ]) {
    await page.goto('http://127.0.0.1:' + port + '/?chapter=' + c.chapter + '&tab=work', {waitUntil: 'networkidle'});
    if (await page.locator('[data-coach="close"]').isVisible()) await page.locator('[data-coach="close"]').click();
    if (c.stage) await page.locator(c.stage).click();
    await page.locator(c.edit + ':visible').first().click();
    if (c.step) await page.locator(c.dialog + ' ' + c.step).first().click();
    if (c.disclosure) await page.locator(c.dialog).getByText(c.disclosure, {exact: true}).click();
    const form = page.locator(c.form), grounds = form.locator('[name="grounds"]'), bad = 'REQ-999999';
    const original = await grounds.inputValue(); await setGrounds(page, grounds, bad, {probe: true});
    const before = await form.evaluate(f => JSON.stringify([...new FormData(f)])), revision = await page.evaluate(() => window.aiwProjectStore.value.revision);
    let commands = 0; const request = req => {if (req.method() === 'POST' && req.url().includes('/api/commands')) commands++;}; page.on('request', request);
    await form.locator('button[type="submit"]').click();
    await page.locator(c.dialog + ' [role="alert"]:visible').first().waitFor();
    const message = await page.locator(c.dialog + ' [role="alert"]:visible').first().innerText();
    assert.match(message, /requirement|reference|REQ-999999/i, 'Specific inline reference error');
    assert.equal(await form.isVisible(), true, 'Original editor remains open');
    assert.equal(await form.evaluate(f => JSON.stringify([...new FormData(f)])), before, 'Every draft value is preserved');
    assert.equal(await page.evaluate(() => window.aiwProjectStore.value.revision), revision, 'No saved revision changes');
    assert.equal(commands, 0, 'No save request for an invalid preview'); page.off('request', request);
    await setGrounds(page, grounds, original); assert.equal(await grounds.inputValue(), original, 'Field can be corrected without reload');
    if (c.chapter === 9) {
      await page.locator('.sec-dialog [data-sec-step="0"]').first().click();
      const title = form.locator('[name="title"]'); await title.fill((await title.inputValue()) + ' · revised wording');
      await form.locator('button[type="submit"]').click(); await page.locator('.sec-dialog .wb-review-step').waitFor();
      assert.equal(await page.locator('.sec-dialog [data-wb-preview-error]').count(), 0, 'Correcting the reference clears the old preview error');
      assert.equal(await page.evaluate(() => window.aiwProjectStore.value.revision), revision, 'Valid retry opens review without silently saving');
      await page.locator('.sec-dialog [data-wb-action="back-to-editing"]').click(); assert.equal(await form.isVisible(), true);
    }
    results.push({chapter: c.chapter, message, saved: false, formPreserved: true, commandRequests: commands});
    console.log('PASS Chapter ' + c.chapter + ': inline error, no save, every input preserved, correction possible');
    await page.screenshot({path: out + '/ground-reference-chapter-' + c.chapter + '.png', fullPage: false});
  }
  assert.deepEqual(errors, []);
  writeFileSync(out + '/ground-reference-browser-results.json', JSON.stringify({passed: results.length, results, errors}, null, 2));
} catch (e) {writeFileSync(out + '/ground-reference-browser-results.json', JSON.stringify({passed: results.length, results, errors, failure: e.stack}, null, 2)); throw e;}
finally {await browser.close(); server.kill('SIGTERM');}
