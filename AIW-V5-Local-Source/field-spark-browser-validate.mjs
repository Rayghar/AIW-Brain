// The field spark and Co-design's suggestions (formerly Proposals, the list that was the Co-author panel) in a real browser (round 2, I2-12; round 5), against an isolated local server and a
// loopback double of the provider. Chapter 4: a new responsibility's editor shows sparks on its free-text fields; the
// purpose spark's popover offers the requirement ticked in the traceability step, cited, in the first of three bands;
// accepting fills the form and nothing is saved; Sol drafts the boundary only when asked, packet first, with its run id
// and prompt pin; saving the record through the chapter's own command stores both suggestions as provenance, read back
// from the server, with the Sol run the server checked. Chapter 9: Co-design's suggestions list the chapter's field offers as rule
// rows; Accept opens the control's editor with the field filled, the in-editor review
// applies it, and the server keeps the cited driver; a dismissal needs a one-line reason and is kept under the
// workspace. Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally
// AIW_BROWSER_EXECUTABLE. Run: npm run test:field-spark-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import http from 'node:http';
import net from 'node:net';
import {answer, envelope} from './mock-llm-provider.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
// The provider double: Sol's field draft and its source check; anything else as mock-llm-provider.mjs answers it.
// fieldMode (rc41, the screen-reader check at the end): 'withheld', the check names a defect; 'empty', nothing to draft.
const calls = [];
let fieldMode = 'good';
const llm = http.createServer((q, s) => { let d = ''; q.on('data', c => { d += c; }); q.on('end', () => {
  const body = JSON.parse(d || '{}'), name = body.text?.format?.name, input = JSON.parse(body.input?.[0]?.content || '{}');
  calls.push(name);
  const odd = fieldMode === 'empty' && name === 'aiw_field_draft' ? envelope({field: input.target.field, value: '', basis: 'The packet records nothing this field could say.', sourceRefs: []}) : fieldMode === 'withheld' && name === 'aiw_field_draft_check' ? envelope({supported: false, defects: ['The value names a mechanism the packet does not record.'], notes: []}) : null;
  if (odd) { s.writeHead(200, {'Content-Type': 'application/json'}); s.end(JSON.stringify(odd)); return; }
  const out = name === 'aiw_field_draft' ? envelope({field: input.target.field, value: 'Uncertain settlement outcomes are kept pending here; posting and notification stay with their own responsibilities.', basis: `It follows from the record (S1) and the requirement it serves (${input.sources.at(-1).ref}).`, sourceRefs: [...new Set(['S1', input.sources.at(-1).ref])]})
    : name === 'aiw_field_draft_check' ? envelope({supported: true, defects: [], notes: ['Checked against S1 and S2.']}) : answer(body);
  s.writeHead(200, {'Content-Type': 'application/json'}); s.end(JSON.stringify(out));
}); });
await new Promise(r => llm.listen(0, '127.0.0.1', r));
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/field-spark-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'mock-sol', AIW_LLM_BASE_URL: `http://127.0.0.1:${llm.address().port}/v1`}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const checks = [], errors = [];
const pass = n => { checks.push(n); console.log('PASS', n); };
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', e => errors.push(e.message));
  // rc38 shell (rc41 W4): Ask Sol is the workspace toolbar's own control, one per page, wired to the panel.
  const SOL = '.workspace-tools [data-workspace-sol][data-brain-launch="design"][aria-controls="brain-panel"]';
  const open = async q => { await page.goto(base + '/?' + q, {waitUntil: 'load'}); await page.waitForSelector(SOL); assert.equal(await page.$$eval('[data-workspace-sol]', xs => xs.length), 1, 'one Ask Sol in the toolbar'); };
  // The chapter's assistance bar (Co-design among it) folds into the toolbar's Chapter tools menu; opened as a viewer opens it.
  const coDesign = async () => { if (!await page.$('details.chapter-tools[open]')) { await page.click('details.chapter-tools > summary'); await page.waitForSelector('details.chapter-tools[open] .chapter-tools-menu .brain-assistance', {timeout: 5000}); } await page.click('details.chapter-tools[open] .brain-assistance [data-brain-launch="mind"]'); };
  const text = sel => page.$eval(sel, e => e.innerText);
  // What the server holds, read the way the workbench reads it.
  const saved = () => page.evaluate(async () => (await (await fetch('/api/project', {credentials: 'same-origin'})).json()).document);
  const dialog = 'dialog[open]';
  // Co-design (formerly Proposals; audit/co-design-2026-10-13.json) keeps the chapter's list folded under "Drafts and
  // suggestions", scoped first to the selected record, with its filters under "Search and filter suggestions". This suite
  // reads the whole chapter's list, as Proposals showed it.
  const suggestions = async () => {
    if (await page.$('#brain-panel details[data-brain-suggestions]:not([open])')) await page.click('#brain-panel details[data-brain-suggestions] > summary');
    await page.waitForSelector('#brain-panel:not([hidden]) [data-proposals-summary]');
    if (await page.$('#brain-panel [data-proposal-act="scope"][data-scope="all"][aria-pressed="false"]')) await page.click('#brain-panel [data-proposal-act="scope"][data-scope="all"]');
  };
  const bySource = async source => {
    if (await page.$('#brain-panel details.pp-advanced:not([open])')) await page.click('#brain-panel details.pp-advanced > summary');
    if (await page.$('#brain-panel details.pp-source-filter:not([open])')) await page.click('#brain-panel details.pp-source-filter > summary');
    await page.click(`#brain-panel [data-proposal-act="filter"][data-source="${source}"]`);
  };

  // 1. Chapter 4: a new responsibility, a cited offer and a Sol draft, saved with their provenance.
  await open('chapter=4&tab=work');
  await page.click('.l-work [data-l-action="new"], [data-l-action="new"]');
  await page.waitForSelector(`${dialog} #l-responsibility-form [data-spark]`);
  assert.deepEqual(await page.$$eval(`${dialog} [data-spark]`, xs => xs.map(x => x.dataset.sparkFor)), ['title', 'purpose', 'boundary', 'owner', 'source'], 'sparks on the free-text fields only');
  const title = 'Hold uncertain settlement outcomes';
  await page.fill(`${dialog} [name="title"]`, title);
  await page.click(`${dialog} nav [data-l-step="1"]`);
  await page.check(`${dialog} input[name="requirementIds"][value="REQ-004"]`);
  await page.click(`${dialog} nav [data-l-step="0"]`);
  await page.waitForFunction(() => document.querySelector('dialog[open] [data-spark-for="purpose"]')?.classList.contains('live'));
  await page.click(`${dialog} [data-spark-for="purpose"]`);
  await page.waitForSelector(`${dialog} .spark-pop`);
  assert.deepEqual(await page.$$eval(`${dialog} .spark-pop [data-spark-band]`, xs => xs.map(x => x.dataset.sparkBand)), ['project', 'confirm', 'sol'], 'three bands, always in this order');
  assert.match(await text(`${dialog} .spark-pop [data-spark-band="project"]`), /^Stated[\s\S]*The service shall keep an uncertain response pending until an enquiry resolves it\.[\s\S]*REQ-004\s+The description of REQ-004/i);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.sparkAct), 'accept', 'focus moves into the popover');
  await page.click(`${dialog} .spark-pop [data-spark-band="project"] [data-spark-act="accept"]`);
  assert.equal(await page.inputValue(`${dialog} [name="purpose"]`), 'The service shall keep an uncertain response pending until an enquiry resolves it.');
  assert.equal(await text(`${dialog} [data-spark-mark="purpose"]`), 'Stated · REQ-004');
  pass('Chapter 4: a new responsibility’s purpose spark offers the requirement ticked in the traceability step, cited, in the first of three bands; Accept fills the form and marks the field');

  // Sol drafts the boundary only when asked. The boundary is one of the record's primary fields, so its packet was
  // prepared when the editor opened and prepared again for the changed form (round 11): the spark shows what Sol will
  // read at once, and the first click sends. Nothing reached the provider.
  await page.click(`${dialog} [data-spark-for="boundary"]`);
  await page.waitForSelector(`${dialog} .spark-pop [data-spark-packet]`);
  assert.equal(await page.$(`${dialog} .spark-pop [data-spark-act="prepare"]`), null, 'the packet is already prepared: the first click sends');
  assert.match(await text(`${dialog} .spark-pop [data-spark-packet]`), /Sol will read (?:[2-9]|10) sources for this field, and nothing else:[\s\S]*S1[\s\S]*A new responsibility record[\s\S]*S2[\s\S]*REQ-004[\s\S]*prompt sol-field-4/);
  assert.equal(calls.length, 0, 'preparing the packet sends nothing to the provider');
  await page.click(`${dialog} .spark-pop [data-spark-act="send"]`);
  await page.waitForSelector(`${dialog} .spark-pop [data-spark-receipt]`);
  assert.deepEqual(calls, ['aiw_field_draft', 'aiw_field_draft_check']);
  const receipt = await text(`${dialog} .spark-pop [data-spark-receipt]`);
  assert.match(receipt, /^Run [a-f0-9-]{36} · packet [a-f0-9]{12} · prompt sol-field-4 · [a-f0-9]{12} · source-checked · draft, not saved$/);
  const runId = receipt.match(/^Run ([a-f0-9-]{36})/)[1];
  await page.click(`${dialog} .spark-pop [data-spark-band="sol"] [data-spark-act="accept"]`);
  assert.match(await page.inputValue(`${dialog} [name="boundary"]`), /^Uncertain settlement outcomes are kept pending here/);
  assert.equal(await text(`${dialog} [data-spark-mark="boundary"]`), `Sol draft · not saved · run ${runId.slice(0, 8)}`);
  assert.match(await text(`${dialog} [data-spark-pending]`), /2 fields carry suggestions\. They are saved only when you save this record\./);
  assert.ok(!(await saved()).logical.responsibilities.some(r => r.title === title), 'nothing reached the project before the form was saved');
  pass('Chapter 4: Sol drafts a field only when asked — the packet shown first, the draft source-checked and shown with its run id, packet stamp and prompt pin — and accepting it saves nothing');

  await page.click(`${dialog} button[type="submit"]`);
  await page.waitForSelector(dialog, {state: 'detached'});
  const lr = (await saved()).logical.responsibilities.find(r => r.title === title);
  assert.ok(lr, 'saved through the chapter’s own command');
  assert.deepEqual(lr.provenance.suggestions.map(s => [s.field, s.source, s.ref || s.runId, s.edited, s.command]), [['purpose', 'project', 'REQ-004', false, 'logical.responsibility'], ['boundary', 'sol', runId, false, 'logical.responsibility']]);
  assert.ok(lr.provenance.suggestions.every(s => s.acceptedBy && s.acceptedBy !== '' && /^\d{4}-\d{2}-\d{2}T/.test(s.acceptedAt)), 'accepted by the signed-in actor, at the server’s time');
  assert.deepEqual(lr.provenance.history.map(h => [h.event, h.fields.join()]), [['Accepted suggestions', 'purpose,boundary']]);
  pass('Chapter 4: saving the editor stores both suggestions on the new record as provenance read back from the server — the cited requirement and the Sol run the server checked — with the actor and the time');
  // Reopened, the editor shows the provenance the record carries, read again from the project (round 11).
  assert.equal(await page.evaluate(id => window.aiwFieldSpark.openRecordEditor('logical.responsibility', id, {field: 'source', value: 'REQ-004: Illustrative Bank Payment Journey brief', suggestion: {source: 'project', ref: 'REQ-004', refLabel: 'REQ-004', suggestionId: 'sg-reopen'}}), lr.id), true);
  const today = new Date().toISOString().slice(0, 10);
  assert.deepEqual(await page.$$eval(`${dialog} [data-spark-provenance]`, xs => xs.map(x => [x.dataset.sparkProvenance, x.textContent])), [['purpose', `Stated · REQ-004 · accepted ${today}`], ['boundary', `Sol draft · run ${runId.slice(0, 8)} · accepted ${today}`]], 'the accepted provenance under each field, in the one vocabulary');
  assert.equal(await text(`${dialog} [data-spark-mark="source"]`), 'Stated · REQ-004', 'a new pending suggestion is marked the same way');
  await page.keyboard.press('Escape');
  await page.click(`${dialog} [data-l-action="discard"]`);
  await page.waitForSelector(dialog, {state: 'detached'});
  pass('Chapter 4: a reopened editor shows the provenance its record carries under each field (stated · Sol draft), read again from the project');

  // 1b. Chapter 5 (round 11): a component editor opened for a selected responsibility says, without a click, what the
  // project offers for its empty fields; Fill copies the proposed values in (the owner’s rc.10.73.38 wording); nothing is saved and nothing reaches a model.
  await open('chapter=5&tab=work&object=api');
  const sent = calls.length;
  await page.click('[data-a-action="new"]');
  await page.waitForSelector(`${dialog} #a-component-form [data-spark-fillbar]`);
  const line = await text(`${dialog} #a-component-form [data-spark-fillbar]`);
  assert.match(line, /^4 suggestions from your project · 4 empty fields\s+Fill\s+Fill copies the proposed values into 3 empty fields\. Use the suggestion button beside a field to review its question\. Nothing is saved until you save this record\.$/, 'the offers for the empty fields, said in one line on open');
  await page.waitForFunction(() => ['purpose', 'boundary', 'source', 'owner'].every(f => document.querySelector(`dialog[open] [data-spark-for="${f}"]`)?.classList.contains('live')));
  assert.equal(await page.$eval(`${dialog} [data-spark-for="title"]`, b => b.classList.contains('live')), false, 'no offer for the title: its spark is quiet');
  assert.equal(calls.length, sent, 'nothing reached the provider');
  // A dismissal in the spark asks why and is kept with the project: after a reload the offer is not made again.
  await page.click(`${dialog} [data-spark-for="boundary"]`);
  await page.click(`${dialog} .spark-pop [data-spark-band="project"] [data-spark-act="dismiss"]`);
  await page.waitForSelector(`${dialog} .spark-pop [data-spark-reason]`);
  await page.fill(`${dialog} .spark-pop [data-spark-reason]`, 'The component owns more than the responsibility’s boundary says.');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => /Nothing your project records offers/.test(document.querySelector('dialog[open] .spark-pop [data-spark-band="project"]')?.textContent || ''));
  const kept = (await saved()).workspace.coauthor.dispositions.at(-1);
  assert.deepEqual([kept.command, kept.recordId, kept.field, kept.source, kept.ref, kept.outcome], ['realisation.component', null, 'boundary', 'project', 'api', 'dismissed'], 'the dismissal is kept under the workspace with the offer it names');
  await open('chapter=5&tab=work&object=api');
  await page.click('[data-a-action="new"]');
  await page.waitForSelector(`${dialog} #a-component-form [data-spark-fillbar]`);
  assert.match(await text(`${dialog} #a-component-form [data-spark-fillbar]`), /^3 suggestions from your project · 3 empty fields/, 'after a reload, the dismissed offer is not counted again');
  await page.waitForFunction(() => document.querySelector('dialog[open] [data-spark-for="purpose"]')?.classList.contains('live'));
  assert.equal(await page.$eval(`${dialog} [data-spark-for="boundary"]`, b => b.classList.contains('live')), false, 'and its spark is quiet');
  await page.click(`${dialog} #a-component-form [data-spark-act="fill"]`);
  await page.waitForSelector(`${dialog} [data-spark-fill-report]`);
  assert.match(await text(`${dialog} [data-spark-fill-report]`), /Filled 2 empty fields from your project: Purpose \/ what does it do\? \(LR-001\), Source \/ supporting project evidence \(LR-001\)\. Nothing is saved until you save\./);
  const api = (await saved()).logical.responsibilities.find(r => r.id === 'api');
  assert.equal(await page.inputValue(`${dialog} [name="purpose"]`), api.purpose, 'the responsibility’s purpose, copied');
  assert.equal(await page.inputValue(`${dialog} [name="owner"]`), '', 'a question to confirm is not filled');
  assert.equal(await text(`${dialog} [data-spark-mark="purpose"]`), 'Stated · LR-001');
  assert.equal((await saved()).realisation.components.length, 5, 'nothing was saved');
  pass('Chapter 5: a new component editor opened for the selected responsibility says in one line what the project offers for its empty fields, without a click; a dismissal is kept with the project and survives a reload; Fill copies the responsibility’s purpose and source with their provenance, leaves the question to confirm alone, and saves nothing');

  // 2. Chapter 9: Co-design's suggestions; a field offer's Accept opens the control's editor with the field filled; the review applies it.
  await open('chapter=9&tab=work');
  await coDesign();
  await suggestions();
  await bySource('rule');
  const offers = '#brain-panel [data-proposal-source="rule"]:has([data-proposal-act="accept"])';
  assert.match(await text('#brain-panel .brain-band-proposals'), /Ready to explore[\s\S]*Every item names its source and destination[\s\S]*SEC-001 · Failure response[\s\S]*Stated · QD-005[\s\S]*SEC-001 · Verification plan/i);
  assert.equal((await page.$$(offers)).length, 2, 'two field offers for Chapter 9’s records');
  const response = (await saved()).quality.drivers.find(d => d.id === 'QD-005').response;
  await page.click(`${offers} [data-proposal-act="accept"]`);
  await page.waitForSelector(`${dialog} #sec-control-form [data-spark-prefill]`);
  assert.equal(await page.inputValue(`${dialog} [name="failureResponse"]`), response);
  assert.match(await text(`${dialog} [data-spark-prefill]`), /A proposal is in “.*” \(Stated · QD-005\)\. Review it; nothing is saved until you save this record\./);
  assert.equal(await text(`${dialog} [data-spark-mark="failureResponse"]`), 'Stated · QD-005');
  assert.equal((await saved()).security.controls.find(c => c.id === 'oauth').failureResponse, '', 'the panel wrote nothing');
  await page.click(`${dialog} button[type="submit"]`);
  await page.waitForSelector(`${dialog} [data-dialog-review] [data-reviewed]`);
  await page.check(`${dialog} [data-dialog-review] [data-reviewed]`);
  await page.click(`${dialog} [data-dialog-review] [data-wb-action="apply-preview"]`);
  await page.waitForSelector(dialog, {state: 'detached'});
  const control = (await saved()).security.controls.find(c => c.id === 'oauth');
  assert.equal(control.failureResponse, response);
  assert.deepEqual(control.provenance.suggestions.map(s => [s.field, s.source, s.ref, s.command]), [['failureResponse', 'project', 'QD-005', 'security.control']]);
  pass('Chapter 9: Co-design lists the chapter’s field offers under its suggestions; Accept opens the control’s editor with the field filled and nothing written; the in-editor review applies it and the server keeps the driver it was copied from');

  // A dismissal needs a one-line reason, and is kept under the workspace.
  if (await page.$('#brain-panel:not([hidden])') === null) await coDesign();
  await suggestions();
  await page.waitForFunction(() => document.querySelectorAll('#brain-panel [data-proposal-source="rule"] [data-proposal-act="dismiss"]').length === 1);
  await page.click('#brain-panel [data-proposal-source="rule"] [data-proposal-act="dismiss"]');
  await page.fill('#brain-panel [data-proposal-reason]', 'short');
  await page.click('#brain-panel [data-proposal-act="record-dismissal"]');
  assert.match(await text('#brain-panel .pp-dismiss [role="alert"]'), /at least 8 characters/);
  await page.fill('#brain-panel [data-proposal-reason]', 'Verification is planned with the bank’s test team.');
  await page.click('#brain-panel [data-proposal-act="record-dismissal"]');
  await page.waitForFunction(() => !document.querySelector('#brain-panel [data-proposal-source="rule"] [data-proposal-act="dismiss"]'));
  const after = await saved();
  assert.deepEqual(after.workspace.coauthor.dispositions.slice(-1).map(d => [d.field, d.source, d.ref, d.outcome, d.reason]), [['verificationPlan', 'project', 'QD-005', 'dismissed', 'Verification is planned with the bank’s test team.']]);
  assert.equal(after.workspace.coauthor.dispositions.length, 2, 'the spark’s dismissal and this one');
  assert.equal(after.security.controls.find(c => c.id === 'oauth').verificationPlan, '', 'a dismissal changes no record');
  pass('Chapter 9: declining a field offer in Co-design’s suggestions is refused without a one-line reason, then kept under the workspace with it; the record is unchanged and the suggestion leaves the list');

  // 3. rc41: a screen reader hears what Sol returned. Focus moves to the result's first control (Accept, Ask again; Close
  // when there is nothing to draft), whose accessible description is the draft with its basis and receipt, or why it
  // was withheld, or why there is nothing to draft; the last two are also said as a status.
  await open('chapter=4&tab=work');
  await page.click('.l-work [data-l-action="new"], [data-l-action="new"]');
  await page.waitForSelector(`${dialog} #l-responsibility-form [data-spark]`);
  const pop = page.locator(`${dialog} .spark-pop`), focused = loc => loc.evaluate(el => el === document.activeElement);
  const receiptRe = checked => `Run [a-f0-9-]{36} · packet [a-f0-9]{12} · prompt sol-field-\\d+ · [a-f0-9]{12} · ${checked} · draft, not saved$`;
  const ask = async mode => { await page.waitForSelector(`${dialog} .spark-pop [data-spark-packet]`); fieldMode = mode; await page.click(`${dialog} .spark-pop [data-spark-act="send"]`); await page.waitForSelector(`${dialog} .spark-pop [data-spark-receipt]`); fieldMode = 'good'; };
  await page.click(`${dialog} [data-spark-for="boundary"]`);
  await ask('withheld');
  const again = pop.getByRole('button', {name: 'Ask again', exact: true, description: new RegExp('^Sol’s draft was withheld: The value names a mechanism the packet does not record\\. Nothing to accept\\. ' + receiptRe('source check raised issues'))});
  assert.equal(await again.count(), 1, 'Ask again is described by why the draft was withheld and by its receipt');
  assert.equal(await focused(again), true, 'and takes focus when the result arrives');
  assert.equal(await pop.getByRole('status').filter({hasText: 'Sol’s draft was withheld'}).count(), 1, 'the reason is also said as a status');
  await again.click();
  await ask('empty');
  const close = pop.getByRole('button', {name: 'Close suggestions', exact: true, description: new RegExp('^Sol found nothing it could responsibly draft here: The packet records nothing this field could say\\. ' + receiptRe('source-checked'))});
  assert.equal(await close.count(), 1, 'with nothing to draft, Close is described by why');
  assert.equal(await focused(close), true, 'and takes focus');
  assert.equal(await pop.getByRole('status').filter({hasText: 'Sol found nothing it could responsibly draft here'}).count(), 1, 'the reason is also said as a status');
  await page.keyboard.press('Escape');
  await page.click(`${dialog} [data-spark-for="purpose"]`);
  await ask('good');
  const accept = pop.locator('[data-spark-band="sol"]').getByRole('button', {name: 'Accept', exact: true, description: new RegExp('^Uncertain settlement outcomes are kept pending here; posting and notification stay with their own responsibilities\\. It follows from the record \\(S1\\) and the requirement it serves \\(S\\d+\\)\\. Cites S1(?:, S\\d+)?\\. ' + receiptRe('source-checked'))});
  assert.equal(await accept.count(), 1, 'Accept is described by the draft, its basis and its receipt');
  assert.equal(await focused(accept), true, 'and takes focus when the draft arrives');
  await page.keyboard.press('Escape');
  await page.click(`${dialog} [data-l-action="close"]`);
  if (await page.isVisible(`${dialog} [data-l-action="discard"]`)) await page.click(`${dialog} [data-l-action="discard"]`);
  await page.waitForSelector(dialog, {state: 'detached'});
  pass('a screen reader hears what Sol returned: focus moves to Accept, Ask again or Close, described by the draft with its basis and receipt, by why it was withheld, or by why there is nothing to draft; the last two are also said as a status');
  assert.deepEqual(errors, [], 'no page errors');
} finally {
  await browser.close();
  server.kill('SIGKILL');
  llm.close();
}
console.log(`\n${checks.length} checks passed.`);
process.exit(0);
