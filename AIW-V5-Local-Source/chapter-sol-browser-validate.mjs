// Rendered checks for Sol in the chapter models' companions, against a loopback test double of the
// provider (mock-llm-provider.mjs): a round of a chapter, a record's refinements through the change
// review, a What if move, a Chapter 3 decision, threats proposed from Chapter 9, a realisation's
// preferred option, agreement and disagreement, verdicts on the canvas, persistence, and the
// unconnected state. Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright')
// and optionally AIW_BROWSER_EXECUTABLE. Run: npm run test:chapter-sol-browser
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
const db = '.aiw-local/chapter-sol-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'mock-sol', AIW_LLM_BASE_URL: llm.url}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => { checks.push(n); if (process.env.CS_DEBUG) console.error('PASS', checks.length, n.slice(0, 60)); };
try {
  const context = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await context.newPage();
  // Round 7: Sol's part of the companion is a folded section, closed until Sol has something to say; this suite reads and
  // clicks Sol's controls there, so it views the section as a viewer who opened it (the remembered choice).
  await page.addInitScript(() => { try { localStorage.setItem('aiw.companion.sol', '1'); } catch { /* storage is a convenience */ } });
  page.on('pageerror', e => errors.push(e.message));
  // rc38 shell (rc41 W4): the Model companion lives in the Details column (#inspector .cm-companion), which the shell
  // leaves closed when nothing is selected on arrival; the suite opens it with the toolbar's toggle, as a viewer does,
  // and asserts only on what the open column shows.
  const showCompanion = async () => { await page.waitForSelector('body[data-panel]', {state: 'attached', timeout: 10000}); if (await page.evaluate(() => document.body.dataset.panel !== 'open')) { await page.click('.workspace-tools [data-panel-toggle]'); await page.waitForSelector('#inspector[aria-hidden="false"]', {timeout: 5000}); await page.waitForTimeout(400); } };
  const open = async (q, ready = '#inspector .cm-companion .cs-ask, #inspector .cm-companion .cs-round, #inspector .cm-companion .dk-sol') => { await page.goto(base + '/?' + q, {waitUntil: 'networkidle'}); await showCompanion(); await page.waitForSelector(ready, {timeout: 10000}); await page.waitForFunction(() => /Sol considers/.test(document.querySelector('#inspector .cm-companion .dk-solask small')?.innerText || ''), null, {timeout: 8000}); await page.waitForTimeout(300); };
  // Find and click in one page task: a redraw between the two would leave the click on a replaced element.
  const act = async sel => { await page.evaluate(s => { const e = document.querySelector(s); if (!e) throw Error('No element matches ' + s); e.click(); }, sel); await page.waitForTimeout(300); };
  const doc = () => page.evaluate(() => window.aiwProjectStore.value.document);
  const text = sel => page.$eval(sel, e => e.innerText);
  // The Ask control is disabled while Sol is busy (rc38: the saved runs load when the companion mounts); a viewer waits for it
  // to come alive, and so does the suite, with a bound: it never clicks a disabled control.
  // Preparing either shows the packet (Send to Sol) or says why it could not (the companion's alert); an alert fails the
  // check in Sol's own words rather than as a timeout.
  const ask = async (sel = '#inspector .cm-companion [data-dk="sol-ask"]') => { await page.waitForSelector(sel + ':not([disabled])', {timeout: 10000}); await act(sel); await page.waitForSelector('#inspector .cm-companion .dk-solpend [data-dk="sol-send"]:not([disabled]), #inspector .cm-companion .dk-verdict.bad[role="alert"]', {timeout: 8000}); const alert = await page.$('#inspector .cm-companion .dk-verdict.bad[role="alert"]'); if (alert && !await page.$('#inspector .cm-companion .dk-solpend')) throw Error('Sol could not prepare ' + sel + ': ' + await alert.innerText()); };
  const send = async () => { const n = llm.calls.length; await act('#inspector .cm-companion .dk-solpend [data-dk="sol-send"]'); await page.waitForFunction(() => /Sol assessed/.test(document.querySelector('#inspector .cm-companion .cs-note')?.innerText || ''), null, {timeout: 10000}); await page.waitForTimeout(300); return llm.calls.slice(n); };
  const review = async () => { await page.waitForSelector('dialog[open]'); const t = await text('dialog[open]'); await page.check('dialog[open] [data-reviewed]'); await page.click('dialog[open] [data-wb-action="apply-preview"]'); return t; };
  const sol = () => text('#inspector .cm-companion .dk-sol');

  // 1. Sol's round of a chapter: the records with the most open checks, shown before sending.
  await open('chapter=10&tab=model', '#inspector .cm-companion .cs-round');
  assert.match(await text('#inspector .cm-companion .cs-round'), /Records with open checks · Chapter 10[\s\S]*rule-based ranking[\s\S]*The 6 records with the most open checks:\s*RUN-001/i, 'until Sol has assessed something the list is named for the rule that made it');
  await ask('#inspector .cm-companion .cs-round [data-dk="sol-ask"]');
  assert.match(await text('.dk-solpend'), /Ask Sol\s*6 records[\s\S]*Sol will read your question, 6 selected records, their recorded values and options, the objective and policy context, and \d+ sources: 6 chapter readings/i);
  assert.equal(llm.calls.length, 0, 'preparing sends nothing');
  await page.click('.dk-solpend .dk-solsee > summary'); await page.click('.dk-solpend .dk-solsrc li:first-child summary');
  assert.match(await text('.dk-solpend .dk-solsee'), /S1[\s\S]*Chapter reading[\s\S]*RUN-001 Payment service[\s\S]*"recorded":\{/i);
  assert.deepEqual(await send(), ['aiw_desk_assessment', 'aiw_desk_assessment_check']);
  assert.match(await text('#inspector .cm-companion .cs-note'), /Sol assessed 6 records: 6 refine/);
  assert.match(await text('#inspector .cm-companion .cs-round'), /Sol’s round · Chapter 10[\s\S]*Sol has assessed 6 of them as they stand: 6 refine/i, 'assessed, the list is Sol’s round');
  assert.ok(await page.$$eval('.cm-stage .dk-solb.cs', xs => xs.length) >= 6, 'the verdicts are on the canvas');
  pass('Sol\'s round of a chapter: with nothing selected, the companion offers the chapter\'s records with the most open checks; every chapter reading is shown before anything is sent; sent, one assessment and one source check come back, and the verdicts are marked on the canvas');

  // 2. A record's refinements: re-read by the instruments, then the chapter's change review.
  await act('#inspector .cm-companion .cs-round [data-sel="run-001"]');
  await page.waitForSelector('#inspector .cm-companion .dk-sol');
  assert.match(await sol(), /Sol’s assessment\s*Refine[\s\S]*Grow to\s*1\s*→\s*2[\s\S]*read the same with them: the new numbers do not change what the instruments find[\s\S]*Review Sol’s refinements…/i);
  await act('#inspector .cm-companion .dk-sol [data-dk="sol-use"]');
  const dialog = await review();
  assert.match(dialog, /Review Sol’s refinements[\s\S]*Refined by Sol \(mock-sol\)[\s\S]*maxReplicas\s*1\s*2/);
  await page.waitForFunction(() => /Applied through the change review with Sol’s refinements: Grow to/.test(document.querySelector('#inspector .cm-companion .cs-note')?.innerText || ''), null, {timeout: 8000});
  let d = await doc();
  assert.equal(d.runtime.plans.find(r => r.id === 'run-001').maxReplicas, 2);
  assert.deepEqual(d.coauthoring.assessments.map(a => [a.itemId, a.outcome, a.chapter]), [['M:10:run-001', 'used', 10], ['M:10:run-001', 'applied', 10]]);
  await page.waitForFunction(() => /has changed since Sol assessed it/.test(document.querySelector('#inspector .cm-companion .dk-sol')?.innerText || ''), null, {timeout: 8000});
  assert.match(await sol(), /Applied through the change review \(SA-002\)/);
  pass('a record\'s refinements: the assessment carries the instruments\' re-reading; "Review Sol’s refinements" opens the chapter\'s change review with every changed field; applied, the use and the application are recorded with the chapter, and the advice is kept as history with what was done');

  // 3. A What if move: the move travels with the question; another move is another question.
  await open('chapter=2&tab=model&driver=QD-002');
  await act('.cm-views [data-id="tune"]');
  await act('[data-um="tune-target"][data-v="99.99"]');
  assert.match(await text('#inspector .cm-companion .cs-ask'), /Sol considers the affected decisions, plans, platform and products, plus relevant knowledge, to advise on this move/);
  await ask('#inspector .cm-companion .cs-ask [data-dk="sol-ask"]');
  assert.match(await text('.dk-solpend'), /1 move[\s\S]*QD-002 · What if At least 99\.99 %/i);
  await page.click('.dk-solpend .dk-solsee > summary'); await page.click('.dk-solpend .dk-solsrc li:first-child summary');
  assert.match(await text('.dk-solpend .dk-solsee'), /"whatIf":\{"target":"At least 99\.9 → 99\.99 %"/);
  await send();
  assert.match(await sol(), /Your call[\s\S]*The move is the business’s to weigh/);
  await act('[data-um="tune-target"][data-v="99.95"]');
  assert.match(await sol(), /The move has changed since Sol assessed it/);
  await act('[data-um="tune-target"][data-v="99.99"]');
  assert.doesNotMatch(await sol(), /has changed/);
  await act('#inspector .cm-companion .dk-sol [data-dk="sol-agree"]');
  await page.waitForFunction(() => /You took this advice/.test(document.querySelector('#inspector .cm-companion .dk-sol')?.innerText || ''), null, {timeout: 8000});
  d = await doc();
  assert.deepEqual(d.coauthoring.assessments.at(-1).itemId, 'M:2:QD-002|whatif'); assert.equal(d.coauthoring.assessments.at(-1).outcome, 'used');
  pass('a What if move: the target being explored travels with the question and is shown in what Sol reads; Sol weighs it without proposing a target; another move makes the advice history until the move returns; agreeing is recorded');

  // 4. A Chapter 3 decision, and a realisation's preferred option in Chapter 7.
  await open('chapter=3&tab=model&decision=ADR-001');
  assert.match(await text('#inspector .cm-companion .cs-ask'), /Sol considers the decision’s alternatives, quality drivers and links across chapters, plus relevant knowledge, to advise on this decision/);
  await ask('#inspector .cm-companion .cs-ask [data-dk="sol-ask"]');
  assert.match(await text('.dk-solpend'), /1 decision[\s\S]*ADR-001 · When should the customer receive a payment acknowledgement\?[\s\S]*1 desk reading/i);
  await send();
  assert.match(await sol(), /Sol would lean to ALT-002 Acknowledge a durable asynchronous handoff[\s\S]*the choice stays yours in Chapter 3/);
  await open('chapter=7&tab=model&object=tr-001');
  await ask('#inspector .cm-companion .cs-ask [data-dk="sol-ask"]');
  await send();
  assert.match(await sol(), /Sol would lean to TO-002 Managed Kubernetes[\s\S]*the choice stays yours in Chapter 7/);
  pass('a Chapter 3 decision is asked about as the desk reads it, and Sol may lean to an alternative; a Chapter 7 realisation\'s options may be leaned to the same way — advice, with the choice left in its chapter');

  // 5. Chapter 9: what could go wrong with a part; proposed threats through Chapter 9's review.
  await open('chapter=9&tab=model&object=api-pod');
  assert.match(await text('#inspector .cm-companion .cs-ask'), /Sol considers Chapter 9’s recorded facts, open checks and estimated vitals of connected parts, plus relevant knowledge, to advise on what could go wrong here/);
  await ask('#inspector .cm-companion .cs-ask [data-dk="sol-ask"]');
  assert.match(await text('.dk-solpend'), /APP-001 Payment service · what could go wrong/);
  await send();
  assert.match(await sol(), /Your call[\s\S]*Sol proposes 1 threat[\s\S]*Unauthorised use of the risk decision[\s\S]*on APP-001 Payment service/i);
  await act('#inspector .cm-companion .dk-sol [data-dk="sol-threats"]');
  assert.match(await review(), /Review the threats Sol proposed[\s\S]*Proposed by Sol/i);
  await page.waitForFunction(() => /Recorded in Chapter 9: 1 threat Sol proposed/.test(document.querySelector('#inspector .cm-companion .cs-note')?.innerText || ''), null, {timeout: 8000});
  d = await doc();
  const t = d.security.threats.at(-1);
  assert.equal(t.title, 'Unauthorised use of the risk decision'); assert.deepEqual(t.targetIds, ['api-pod']); assert.equal(t.origin, 'suggestion'); assert.match(t.assumptions, /Chapter 9’s reading/);
  pass('Chapter 9: for a part, Sol is asked what could go wrong, proposes threats on the listed targets only, and they are recorded through Chapter 9\'s own change review as suggestions to confirm');

  // 6. Disagreeing, with a reason, in Chapter 8.
  await open('chapter=8&tab=model&object=rest');
  await ask('#inspector .cm-companion .cs-ask [data-dk="sol-ask"]');
  await send();
  assert.match(await sol(), /Record 50 ms where nothing is recorded yet[\s\S]*Timeout\s*not recorded\s*→\s*50/i);
  await act('#inspector .cm-companion .dk-sol [data-dk="sol-dismiss"]');
  await page.fill('#inspector .cm-companion .dk-soldis textarea', 'The channel gateway already enforces a 2-second budget on this call.');
  await page.click('#inspector .cm-companion .dk-soldis button[type=submit]');
  await page.waitForFunction(() => /You disagreed/.test(document.querySelector('#inspector .cm-companion .dk-sol')?.innerText || ''), null, {timeout: 8000});
  d = await doc();
  assert.equal(d.coauthoring.assessments.at(-1).outcome, 'dismissed'); assert.match(d.coauthoring.assessments.at(-1).reason, /2-second budget/);
  assert.match(await sol(), /You disagreed \(SA-\d+\): The channel gateway/);
  pass('disagreeing records why, with the sources the advice rested on, and the advice shows what you did with it');

  // 7. One Sol: one control in the companion. Beside a chapter model Sol's own panel shows the same saved assessment as
  // the companion, never a second answer of its own (audit/co-design-2026-10-13.json: the same assessment is shown in
  // Model and the companion; until Sol has assessed the record its entry waits folded below the question). On the Work
  // tab, where no companion shows it, the panel is where the assessment is asked for and read.
  await open('chapter=10&tab=model&object=run-002');
  assert.equal(await page.$$eval('#inspector .cm-companion [data-dk="sol-ask"]', xs => xs.length), 1, 'one Ask Sol in the companion');
  assert.equal(await page.$$eval('#inspector .cm-companion .cm-acts [data-brain-launch="design"]', xs => xs.length), 0, 'no second Ask Sol button in the action row');
  await act('#inspector .cm-companion .cs-more [data-brain-launch="design"]');
  await page.waitForSelector('#brain-panel:not([hidden])');
  assert.match(await text('#brain-panel .brain-modes'), /^Ask Sol\s*Explain & challenge\s*Co-design\s*Learn & develop$/);
  assert.match(await text('#brain-panel .intel-compose summary'), /Think it through with Sol/);
  assert.equal(await page.$$eval('#brain-panel .dk-sol, #brain-panel .dk-solpend', xs => xs.length), 0, 'beside a model the panel holds no answer or prepared request of its own');
  assert.ok(await page.$('#brain-panel details.brain-sol[data-sol-unused-entry]:not([open])'), 'not yet assessed, the record’s entry waits folded below the question');
  assert.equal(await text('#brain-panel [data-sol-unused-entry] > summary'), 'Assess the saved record');
  assert.match(await page.$eval('#brain-panel [data-sol-unused-entry]', e => e.textContent), /to advise on this record[\s\S]*Ask Sol to assess it[\s\S]*Open this record’s model companion/);
  await act('#brain-panel .brain-sol [data-dk="sol-beside"]');
  assert.ok(await page.$('#brain-panel[hidden]'), 'the panel steps aside');
  await ask('#inspector .cm-companion .cs-ask [data-dk="sol-ask"]');
  await send();
  const asked = llm.calls.length;
  await act('#inspector .cm-companion .cs-more [data-brain-launch="design"]');
  await page.waitForSelector('#brain-panel:not([hidden]) [data-sol-panel-assessment] .dk-sol');
  assert.match(await text('#brain-panel [data-sol-panel-assessment]'), /Sol’s assessment\s*Refine[\s\S]*Open this record’s model companion/i, 'the panel shows the verdict the companion holds');
  const shown = await page.evaluate(() => [document.querySelector('#brain-panel [data-sol-panel-assessment] .dk-sol'), document.querySelector('#inspector .cm-companion .dk-sol')].map(e => [e?.dataset.solItem, e?.querySelector('[data-prior-run]')?.dataset.priorRun, e?.querySelector('.dk-sol-h')?.textContent]));
  assert.ok(shown[0][1], 'the panel names the run it shows');
  assert.deepEqual(shown[0], shown[1], 'the same saved assessment — the same record, run and headline — not a second answer');
  assert.equal(llm.calls.length, asked, 'opening the panel asks Sol nothing');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.goto(base + '/?chapter=10&tab=work&object=run-004', {waitUntil: 'networkidle'});
  await page.waitForSelector('.brain-assistance [data-brain-launch="design"]', {timeout: 10000});
  await page.click('.brain-assistance [data-brain-launch="design"]');
  await page.click('#brain-panel details.brain-sol[data-sol-unused-entry]:not([open]) > summary', {timeout: 10000});
  await page.waitForSelector('#brain-panel .brain-sol [data-dk="sol-ask"]', {timeout: 10000});
  assert.match(await text('#brain-panel .brain-sol'), /Sol · the attending architect[\s\S]*Ask Sol to assess it/i, 'on the Work tab the panel is the assessment');
  await act('#brain-panel .brain-sol [data-dk="sol-ask"]');
  await page.waitForSelector('#brain-panel .brain-sol .dk-solpend [data-dk="sol-send"]:not([disabled])', {timeout: 8000});
  await act('#brain-panel .brain-sol .dk-solpend [data-dk="sol-send"]');
  await page.waitForFunction(() => /Sol assessed/.test(document.querySelector('#brain-panel .brain-sol')?.innerText || ''), null, {timeout: 10000});
  assert.match(await text('#brain-panel .brain-sol .dk-sol'), /Refine|Sound/i); assert.equal(await page.$$eval('#brain-panel .cs-more', xs => xs.length), 0, 'no "More with Sol" inside Sol\'s own panel');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  pass('one Sol: a chapter model\'s companion carries Sol\'s one control; beside the model Sol\'s own panel (Ask Sol) shows that same saved assessment — the same run — and asks nothing of its own, its entry folded until there is an assessment; on the Work tab the panel is the assessment itself');

  // 8. Persistence: the assessments come back with the chapter models.
  await open('chapter=10&tab=model');
  await page.waitForFunction(() => document.querySelectorAll('.cm-stage .dk-solb.cs').length >= 5, null, {timeout: 8000});
  assert.ok(await page.$('.cm-stage .dk-solb.cs.stale'), 'the applied record\'s advice is marked as history');
  pass('Sol\'s assessments are kept with the project and come back with every chapter model, the history marked as such');

  // 9. Not connected: what Sol would read can still be seen; nothing can be sent.
  const off = await context.newPage();
  off.on('pageerror', e => errors.push(e.message));
  await off.route('**/api/intelligence/status**', r => r.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({configured: false})}));
  await off.route('**/api/intelligence/reasoning-context**', async r => { const res = await r.fetch(); const body = await res.json(); body.configuration = {configured: false}; await r.fulfill({response: res, json: body}); });
  await off.goto(base + '/?chapter=4&tab=model&object=api', {waitUntil: 'networkidle'});
  await off.waitForFunction(() => /not connected/.test(document.querySelector('#inspector .cm-companion .dk-solask small')?.innerText || ''), null, {timeout: 8000});
  await off.$eval('#inspector .cm-companion .cs-ask [data-dk="sol-ask"]', e => e.click());
  await off.waitForSelector('#inspector .cm-companion .dk-solpend');
  assert.ok(await off.$('#inspector .cm-companion .dk-solpend [data-dk="sol-send"][disabled]'));
  assert.match(await off.$eval('#inspector .cm-companion .dk-solpend', e => e.innerText), /Sol is not connected/);
  await off.close();
  pass('not connected: the companion says so, still shows what Sol would read, and cannot send');

  assert.deepEqual(errors, []);
  pass('no page errors');
} finally {
  await browser.close(); server.kill(); await llm.close();
  try { rmSync(db, {force: true}); rmSync(db + '-wal', {force: true}); rmSync(db + '-shm', {force: true}); } catch { /* best effort */ }
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
