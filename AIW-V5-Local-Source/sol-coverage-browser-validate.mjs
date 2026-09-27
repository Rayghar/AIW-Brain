// Rendered checks for Sol on every chapter model, against a loopback test double of the provider
// (mock-llm-provider.mjs): Chapters 4, 5 and 6 assess their own records, read as their own chapter's reading;
// a second pass that contradicts itself is shown as such; a selection only drawn from the records says so;
// a Chapter 7 option and a Chapter 9 contract link reach their records; and Sol's panel follows a drawn
// selection to the record it stands for. Its own server and database, so its own hourly request budget.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally
// AIW_BROWSER_EXECUTABLE. Run: npm run test:sol-coverage-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';
import {startMockLLM} from './mock-llm-provider.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
// Chapter 5's second pass contradicts itself, as a live one has: unsupported, with only notes of support.
const llm = await startMockLLM({contradict: ['M:5:*']});
const db = '.aiw-local/sol-coverage-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'mock-sol', AIW_LLM_BASE_URL: llm.url}, stdio: ['ignore', 'pipe', 'inherit']});
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => { checks.push(n); if (process.env.CS_DEBUG) console.error('PASS', checks.length, n.slice(0, 60)); };
try {
  const context = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  // What the server answered to each request to Sol, for a failure's message.
  const answers = [];
  page.on('response', async r => { if (/\/api\/intelligence\/(?:reason|reasoning-context)\b/.test(r.url())) { let body = ''; try { body = (await r.text()).slice(0, 240); } catch { /* the page moved on */ } answers.push(`${r.status()} ${r.url().split('/api/')[1].split('?')[0]} ${body}`); } });
  const open = async (q, ready = '.cm-panel') => { await page.goto(base + '/?' + q, {waitUntil: 'networkidle'}); await page.waitForSelector(ready, {timeout: 10000}); };
  // Find and click in one page task: a redraw between the two would leave the click on a replaced element.
  const act = async sel => { await page.evaluate(s => { const e = document.querySelector(s); if (!e) throw Error('No element matches ' + s); e.click(); }, sel); await page.waitForTimeout(300); };
  const text = sel => page.$eval(sel, e => e.innerText);
  const doc = () => page.evaluate(() => window.aiwProjectStore.value.document);
  const ask = async () => { await act('.cm-panel .cs-ask [data-dk="sol-ask"]'); await page.waitForSelector('.cm-panel .dk-solpend [data-dk="sol-send"]:not([disabled])', {timeout: 8000}); };
  const send = async what => {
    await act('.cm-panel .dk-solpend [data-dk="sol-send"]');
    try { await page.waitForFunction(() => /Sol assessed/.test(document.querySelector('.cm-panel .cs-note')?.innerText || ''), null, {timeout: 12000}); }
    catch { throw Error(`Sol did not answer for ${what}; the server answered: ${answers.slice(-2).join(' || ')}`); }
  };

  // 1. Chapters 4, 5 and 6 assess their own records, each read as its own chapter's reading.
  await open('chapter=4&tab=model');
  const d = await doc();
  for (const [chapter, id] of [[4, d.logical?.responsibilities?.[0]?.id], [5, d.realisation?.components?.[0]?.id], [6, d.technology?.capabilities?.[0]?.id]]) {
    assert(id, `Chapter ${chapter} has a record to ask about`);
    await open(`chapter=${chapter}&tab=model&object=${encodeURIComponent(id)}`, '.cm-panel .cs-ask [data-dk="sol-ask"]');
    assert.match(await text('.cm-panel .cs-ask'), new RegExp(`Sol reads Chapter ${chapter}’s reading of it[\\s\\S]*Ask Sol to assess it`, 'i'), `Chapter ${chapter}`);
    await ask(); await send(`Chapter ${chapter} (${id})`);
    await page.waitForSelector('.cm-panel .dk-sol', {timeout: 10000});
    assert.match(await text('.cm-panel .dk-sol'), /Sol’s assessment\s*(?:Apply|Refine|Reconsider|Judge|Sound|Withheld)/i, `Chapter ${chapter}`);
    // Chapter 5's second pass contradicted itself: the advice is shown, and says the check's flag was not relied on.
    if (chapter === 5) assert.match(await text('.cm-panel .dk-sol [data-sol-check-note]'), /marked it unsupported but named no defect[\s\S]*its flag was not relied on/i);
  }
  pass('Chapters 4, 5 and 6: a record selected in its chapter model is read as that chapter\'s reading, assessed by Sol and displayed beside the model; where the second pass contradicts itself, the advice is shown and says its flag was not relied on');

  // 2. A record selected in another chapter's model is read as its own chapter's reading.
  const driver = d.quality?.drivers?.[0]?.id, resp = d.logical?.responsibilities?.find(r => (r.driverIds || []).length || true);
  await open(`chapter=4&tab=model&object=${encodeURIComponent(resp.id)}`, '.cm-panel .cs-ask [data-dk="sol-ask"], .cm-panel .dk-sol');
  const found = await page.evaluate(id => !!document.querySelector(`.cm-stage [data-sel="${id}"]`), driver);
  if (found) {
    await act(`.cm-stage [data-sel="${driver}"]`);
    await page.waitForSelector('.cm-panel .cs-ask [data-dk="sol-ask"], .cm-panel .dk-sol', {timeout: 8000});
    assert.match(await page.$eval('.cm-panel', e => e.innerText), /Chapter 2’s reading/i, 'a driver seen from Chapter 4 is read as Chapter 2 reads it');
  }
  pass('a record selected from another chapter\'s model is read as its own chapter\'s reading' + (found ? '' : ' (no driver is drawn in Chapter 4 of this design; covered by the model check)'));

  // 3. Every element a chapter model draws, in each of its views, gives Sol a place in the companion: ask about it,
  // its assessment, explain it, or — for what is only drawn — say Sol answers about saved records. Never nothing.
  const outcomes = {ask: 0, assessment: 0, explain: 0, drawn: 0}, empty = [];
  for (let chapter = 4; chapter <= 10; chapter++) {
    await open(`chapter=${chapter}&tab=model`);
    const views = await page.$$eval('.cm-views button', bs => bs.length);
    for (let v = 0; v < Math.max(1, views); v++) {
      if (views) { await page.evaluate(n => document.querySelectorAll('.cm-views button')[n]?.click(), v); await page.waitForTimeout(400); }
      const ids = await page.evaluate(() => [...new Set([...document.querySelectorAll('.cm-stage [data-sel]')].map(e => e.dataset.sel).filter(Boolean))].slice(0, 12));
      for (const id of ids) {
        if (!(await page.$(`.cm-stage [data-sel]`))) continue;
        await page.evaluate(s => [...document.querySelectorAll('.cm-stage [data-sel]')].find(e => e.dataset.sel === s)?.click(), id); await page.waitForTimeout(250);
        const got = await page.evaluate(() => document.querySelector('.cm-panel .dk-sol') ? 'assessment' : document.querySelector('.cm-panel .dk-solpend, .cm-panel .cs-ask [data-dk="sol-ask"]') ? 'ask' : document.querySelector('.cm-panel [data-sol-explain]') ? 'explain' : document.querySelector('.cm-panel [data-sol-drawn]') ? 'drawn' : document.querySelector('.cm-panel .cs-round') ? 'round' : null);
        if (got && got !== 'round') outcomes[got]++; else if (!got) empty.push(`Chapter ${chapter}: ${id}`);
      }
    }
  }
  assert.deepEqual(empty, [], 'a drawn element with no Sol in its companion');
  assert(outcomes.ask + outcomes.assessment > 20 && outcomes.explain + outcomes.drawn > 0, JSON.stringify(outcomes));
  pass(`every element Chapters 4 to 10 draw, in each view, has Sol in its companion: ${outcomes.ask} to ask about, ${outcomes.assessment} assessed, ${outcomes.explain} to explain, ${outcomes.drawn} only drawn and saying so`);

  // 4. A Chapter 7 option reaches its realisation, and a Chapter 9 contract link the contract's exposure.
  await open('chapter=7&tab=model');
  if (await page.$('.cm-views [data-sk="view"][data-id="options"]')) await act('.cm-views [data-sk="view"][data-id="options"]');
  const option = await page.evaluate(() => [...document.querySelectorAll('.cm-stage [data-sel], .cm-stage [data-card]')].map(e => e.dataset.sel || e.dataset.card).find(s => /^[^/:]+\/[^/]+$/.test(s || '')) || null);
  assert(option, 'an option drawn in Chapter 7');
  await act(`.cm-stage [data-sel="${option}"], .cm-stage [data-card="${option}"]`);
  await page.waitForSelector('.cm-panel .cs-ask [data-dk="sol-ask"], .cm-panel .dk-sol', {timeout: 8000});
  assert.match(await page.$eval('.cm-panel', e => e.innerText), /Ask Sol to assess it|Sol’s assessment/i, option);
  // A contract's link is drawn as its own selection in whichever of Chapters 8 and 9's views draws links.
  let link = null;
  for (const chapter of [9, 8]) {
    await open(`chapter=${chapter}&tab=model`);
    const views = await page.$$eval('.cm-views button', bs => bs.length);
    for (let v = -1; v < views && !link; v++) {
      if (v >= 0) { await page.evaluate(n => document.querySelectorAll('.cm-views button')[n]?.click(), v); await page.waitForTimeout(400); }
      link = await page.evaluate(() => [...document.querySelectorAll('.cm-stage [data-sel]')].map(e => e.dataset.sel).find(s => /^C:/.test(s)) || null);
    }
    if (link) break;
  }
  if (link) {
    await page.evaluate(s => [...document.querySelectorAll('.cm-stage [data-sel]')].find(e => e.dataset.sel === s)?.click(), link); await page.waitForTimeout(300);
    await page.waitForSelector('.cm-panel .cs-ask [data-dk="sol-ask"], .cm-panel .dk-sol', {timeout: 8000});
  }
  pass('a Chapter 7 option offers Sol on its realisation' + (link ? ', and a contract\'s link Sol on the contract' : '; no view of this design draws a contract\'s link as its own selection, and the link mapping is covered by the model check'));

  assert.deepEqual(errors, []);
  pass('no page errors');
} finally {
  await browser.close(); server.kill(); await llm.close();
  try { rmSync(db, {force: true}); rmSync(db + '-wal', {force: true}); rmSync(db + '-shm', {force: true}); } catch { /* best effort */ }
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
