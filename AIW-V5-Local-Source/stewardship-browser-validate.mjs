// Rendered checks for the knowledge stewards' queue, against a loopback test double of the provider:
// an architect disagrees with Sol in a chapter model; the disagreement reaches the stewards' queue in
// Mind Factory; Sol advises the stewards; the stewards capture it with Sol's wording and take it along
// the governed path — review, release, activation, a link to the record — and when Sol is asked again
// about that record, it reads what the project learned. Needs Playwright and Chromium:
// AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally AIW_BROWSER_EXECUTABLE.
// Run: npm run test:stewardship-browser
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
const db = '.aiw-local/steward-browser-' + port + '.sqlite';
// Two synthetic local accounts: the architect, and a second person who reviews (four eyes).
const ACCOUNTS = {'architect-a': 'architect-secret-0001', 'steward-b': 'steward-secret-000002'};
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, AIW_LOCAL_ACCOUNTS: JSON.stringify(ACCOUNTS), OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'mock-sol', AIW_LLM_BASE_URL: llm.url}, stdio: ['ignore', 'pipe', 'inherit']});
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => { checks.push(n); if (process.env.ST_DEBUG) console.error('PASS', checks.length, n.slice(0, 60)); };
try {
  const Q = '#brain-panel .kw-steward';
  // Each person works in their own browser, signed in with their own account.
  const signInAs = async (p, account) => {
    await p.goto(base + '/local/sign-in', {waitUntil: 'load'}); await p.fill('#account', account); await p.fill('#secret', ACCOUNTS[account]);
    await Promise.all([p.waitForURL(u => !u.pathname.startsWith('/local/'), {waitUntil: 'networkidle'}), p.click('button[type=submit]')]);
  };
  const helpers = p => {
    // Find and click in one page task: a redraw between the two would leave the click on a replaced element.
    const act = async sel => { await p.evaluate(s => { const e = document.querySelector(s); if (!e) throw Error('No element matches ' + s); e.click(); }, sel); await p.waitForTimeout(300); };
    const fill = async (key, value) => { await p.fill(`#brain-panel .kw-body [data-k-field="${key}"]`, value); };
    const tick = async key => { await p.check(`#brain-panel .kw-body [data-k-field="${key}"]`); };
    return {act, fill, tick,
      text: sel => p.$eval(sel, e => e.innerText),
      signed: async (reason = 'Checked against the architect’s record and the design.') => { await fill('reviewer', 'Knowledge steward'); if (reason) await fill('reason', reason); await tick('reviewed'); },
      submit: async until => {
        await act('#brain-panel .kw-body form [type=submit]');
        try { await p.waitForFunction(u => new RegExp(u, 'i').test(document.querySelector('#brain-panel .kw-steward')?.innerText || ''), until, {timeout: 8000}); }
        catch (e) { throw Error(`Expected "${until}" after saving; the workspace says: ${await p.evaluate(() => (document.querySelector('#brain-panel .kw-error:not([hidden])')?.innerText || '') + ' | ' + (document.querySelector('#brain-panel .kw-body')?.innerText || '').slice(0, 600))}`); }
        await p.waitForTimeout(300);
      }};
  };
  const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
  page.on('pageerror', e => errors.push(e.message));
  await signInAs(page, 'architect-a');
  const {act, text, fill, tick, signed, submit} = helpers(page);
  const doc = () => page.evaluate(() => window.aiwProjectStore.value.document);
  const queue = () => text('#brain-panel .kw-steward');
  const send = async within => { const n = llm.calls.length; await act(`${within} .dk-solpend [data-dk="sol-send"]`); await page.waitForFunction(w => /Sol assessed/.test(document.querySelector(w)?.innerText || ''), within, {timeout: 10000}); await page.waitForTimeout(300); return llm.calls.slice(n); };
  const openStewards = async p => { await p.waitForFunction(() => !!window.aiwKnowledge, null, {timeout: 20000}); await p.evaluate(() => window.aiwKnowledge.openView('stewardship')); await p.waitForSelector(Q, {timeout: 8000}); };

  // 1. A disagreement in a chapter model goes to the stewards.
  await page.goto(base + '/?chapter=8&tab=model&object=rest', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => /Sol reads/.test(document.querySelector('.cm-panel .dk-solask small')?.innerText || ''), null, {timeout: 10000});
  await act('.cm-panel .cs-ask [data-dk="sol-ask"]');
  await page.waitForSelector('.cm-panel .dk-solpend [data-dk="sol-send"]:not([disabled])');
  await send('.cm-panel');
  await act('.cm-panel .dk-sol [data-dk="sol-dismiss"]');
  await page.fill('.cm-panel .dk-soldis textarea', 'The channel gateway already enforces a 2-second budget on this call.');
  await page.click('.cm-panel .dk-soldis button[type=submit]');
  await page.waitForFunction(() => /goes to the knowledge stewards/.test(document.querySelector('.cm-panel .cs-note')?.innerText || ''), null, {timeout: 8000});
  await act('.cm-panel .cs-note [data-dk="sol-stewards"]');
  await page.waitForSelector(Q, {timeout: 8000});
  assert.match(await text('#brain-panel .kw-tabs [aria-pressed="true"]'), /Stewards · 1/);
  assert.match(await queue(), /To decide · 1[\s\S]*SA-001 · Chapter 8 · Disagreement[\s\S]*IF-001 Payment initiation[\s\S]*Sol advised · Refine[\s\S]*The channel gateway already enforces a 2-second budget on this call\.[\s\S]*What the advice rested on/i);
  pass('a disagreement in a chapter model goes to the knowledge stewards: the note opens Mind Factory on the stewards\' queue, with the advice, the architect\'s words and what the advice rested on');

  // 2. Sol advises the stewards, and its wording goes into the capture.
  await act(`${Q} [data-dk="sol-ask"]`);
  await page.waitForSelector(`${Q} .dk-solpend [data-dk="sol-send"]:not([disabled])`);
  assert.match(await text(`${Q} .dk-solpend`), /1 queue item[\s\S]*Sol will read \d+ sources: 1 stewardship reading/i);
  assert.deepEqual(await send(Q), ['aiw_desk_assessment', 'aiw_desk_assessment_check']);
  assert.match(await text(`${Q} .dk-sol`), /Capture, reworded[\s\S]*Capture it: the architect names a project fact[\s\S]*Within this project: The channel gateway/i);
  await act(`${Q} .dk-sol [data-dk="sol-use"]`);
  await page.waitForSelector('#brain-panel .kw-body form [data-k-field="statement"]');
  const form = await text('#brain-panel .kw-body form');
  assert.match(form, /The original record SA-001[\s\S]*The architect disagreed: The channel gateway already enforces a 2-second budget on this call\.[\s\S]*Worded by Sol/);
  assert.match(await page.$eval('#brain-panel .kw-body [data-k-field="statement"]', e => e.value), /^Within this project: The channel gateway/);
  await submit('On the governed path · 1');
  let d = await doc();
  assert.equal(d.knowledge.stewardship[0].decision, 'captured');
  assert.deepEqual(d.coauthoring.assessments.filter(a => a.itemId === 'K:SA-001').map(a => a.outcome), ['used', 'applied']);
  assert.match(await queue(), /On the governed path · 1[\s\S]*KC-\d+ · Within this project[\s\S]*Captured[\s\S]*Review the interpretation…/i);
  pass('Sol advises the stewards: it reads the disagreement and the record, and words what the project should learn; "Capture it with Sol’s wording" fills the capture, which shows the original record and saves a candidate claim, and Sol\'s advice is recorded as used and applied');

  // 3. The governed path, one next step at a time: review, release, activation, link. Four eyes: the
  // architect who captured the claim is told why they cannot verify it, and is refused if they try.
  await act(`${Q} [data-k-action="review-claim"]`);
  assert.match(await text('#brain-panel .kw-body form'), /Four eyes: only a signed-in person other than its author \(architect-a\) can verify this claim/);
  await tick('sourceChecked'); await tick('rightsChecked'); await tick('conditionsChecked'); await signed();
  await act('#brain-panel .kw-body form [type=submit]');
  await page.waitForFunction(() => /Another authenticated person must verify it/.test(document.querySelector('#brain-panel .kw-error:not([hidden])')?.innerText || ''), null, {timeout: 8000});
  // The owner adds a second person to the project team, who signs in with their own account and reviews.
  const projectId = (await doc()).id;
  assert.equal(await page.evaluate(async id => (await fetch('/api/access?project=' + encodeURIComponent(id), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({actorId: 'steward-b', role: 'editor'})})).status, projectId), 200);
  const steward = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
  steward.on('pageerror', e => errors.push(e.message));
  await signInAs(steward, 'steward-b');
  await steward.goto(base + '/?chapter=8&tab=model&object=rest&project=' + encodeURIComponent(projectId), {waitUntil: 'networkidle'});
  await openStewards(steward);
  const B = helpers(steward);
  await B.act(`${Q} [data-k-action="review-claim"]`);
  await B.tick('sourceChecked'); await B.tick('rightsChecked'); await B.tick('conditionsChecked'); await B.signed();
  await B.submit('Release it…');
  const reviewed = (await steward.evaluate(() => window.aiwProjectStore.value.document)).knowledge.claims.at(-1);
  assert.equal(reviewed.actor, 'architect-a'); assert.equal(reviewed.review.actor, 'steward-b');
  // The architect continues from the latest project.
  await page.goto(base + '/?chapter=8&tab=model&object=rest', {waitUntil: 'networkidle'});
  await openStewards(page);
  await act(`${Q} [data-kst="release"]`);
  assert.ok(await page.$eval('#brain-panel .kw-body form input[type=checkbox][data-k-field^="claim:"]', e => e.checked), 'the captured claim is selected for release');
  await signed();
  await submit('Activate it for this project…');
  await act(`${Q} [data-kst="activate"]`);
  await signed();
  await submit('Link it to IF-001…');
  await act(`${Q} [data-kst="link"]`);
  assert.match(await text('#brain-panel .kw-body form'), /IF-001 Payment initiation/);
  await signed('');
  await submit('Handled · 1');
  d = await doc();
  assert.equal(d.knowledge.links.at(-1).objectId, 'rest');
  assert.match(await text('#brain-panel .kw-tabs'), /Stewards(?! ·)/);
  await page.click(`${Q} .kw-stew-handled > summary`);
  assert.match(await queue(), /Sol now reads it whenever it reasons about IF-001 Payment initiation/);
  pass('the governed path, followed from the queue: the architect who captured the interpretation is refused when verifying it; a second person, signed in with their own account, reviews it; it is then released, activated and linked to IF-001 — each through the knowledge workspace\'s own reviewed forms — and the item is handled: Sol now reads it with that record');

  // 4. Sol reads what the project learned.
  await page.goto(base + '/?chapter=8&tab=model&object=rest', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => /Sol reads/.test(document.querySelector('.cm-panel .dk-solask small')?.innerText || ''), null, {timeout: 10000});
  await act('.cm-panel .dk-solagain [data-dk="sol-ask"]');
  await page.waitForSelector('.cm-panel .dk-solpend [data-dk="sol-send"]:not([disabled])');
  assert.match(await text('.cm-panel .dk-solpend'), /1 governed claim/i);
  await page.click('.cm-panel .dk-solpend .dk-solsee > summary');
  assert.match(await text('.cm-panel .dk-solpend .dk-solsee'), /IF-001 · learned by the project/);
  await send('.cm-panel');
  assert.match(await text('.cm-panel .dk-sol'), /Sound[\s\S]*Sound as recorded: the project has already learned why the earlier advice does not apply here/i);
  pass('asked again about IF-001, Sol reads the claim the project learned, shown before sending like every source, and does not repeat the advice the architect ruled out');

  assert.deepEqual(errors, []);
  pass('no page errors');
} finally {
  await browser.close(); server.kill(); await llm.close();
  try { rmSync(db, {force: true}); rmSync(db + '-wal', {force: true}); rmSync(db + '-shm', {force: true}); } catch { /* best effort */ }
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
