// Rendered checks for Sol's subject on every chapter page (round 2, I2-01, I2-02, I2-03, I2-04, I2-08, I2-11,
// I2-16, I2-25), against a loopback test double of the provider (mock-llm-provider.mjs):
//   - on Work, Validate and Output of Chapters 5 to 11 Sol speaks about the chapter's own record, never about the
//     Chapter 4 record the studio carries across chapters (LR-001), and says what the studio has selected;
//   - the architect can pin the carried selection and return;
//   - every Model tab keeps an Ask Sol / Co-design entry (the companion beside Chapters 2 to 10, a bar above Chapter 1);
//   - the panel is three labelled bands (From your project · Sol · Chapter tools) and the brief names its rules;
//   - the brief is volunteered as one line in the assistance bar on Work, Validate and Output, before any click;
//   - a question in the architect's own words about a record goes through the reasoning path: prepared and
//     shown with the instruction pin, nothing sent until "Send to Sol", and the assessment carries the pin;
//   - a programmatic click on Ask Sol opens the panel as a pointer click does, on Chapters 1 and 8;
//   - the hover explanation is the one rule-based micro-reading (a check, a vital, a knowledge rule).
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally
// AIW_BROWSER_EXECUTABLE. Run: npm run test:brain-subject-browser
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
const db = '.aiw-local/brain-subject-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'mock-sol', AIW_LLM_BASE_URL: llm.url}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => { checks.push(n); if (process.env.CS_DEBUG) console.error('PASS', checks.length, n.slice(0, 70)); };
try {
  const context = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await context.newPage();
  // Round 7: Sol's part of the companion is a folded section, closed until Sol has something to say; this suite reads and
  // clicks Sol's controls there, so it views the section as a viewer who opened it (the remembered choice).
  await page.addInitScript(() => { try { localStorage.setItem('aiw.companion.sol', '1'); } catch { /* storage is a convenience */ } });
  page.on('pageerror', e => errors.push(e.message));
  const text = sel => page.$eval(sel, e => e.innerText);
  // rc38 shell (rc41 W4): Ask Sol is the workspace toolbar's own control (`[data-workspace-sol]`, one per page, wired to
  // the panel); the chapter's assistance bar (Co-design, Hover help, the brief chip) folds into the toolbar's "Chapter
  // tools" menu; the Model tab's companion lives in the Details column (#inspector), closed until something is selected
  // or the viewer opens it. The pins read those surfaces; nothing is asserted on a hidden element.
  const SOL = '.workspace-tools [data-workspace-sol][data-brain-launch="design"][aria-controls="brain-panel"]';
  const COMPANION = '#inspector .cm-companion';
  const open = async q => { await page.goto(base + '/?' + q, {waitUntil: 'networkidle'}); await page.waitForSelector(SOL, {timeout: 10000}); assert.equal(await page.$$eval('[data-workspace-sol]', xs => xs.length), 1, 'one Ask Sol in the toolbar'); };
  // The toolbar's Ask Sol with a real pointer click; the panel is open when it is visible.
  const openSol = async () => { await page.click(SOL); await page.waitForSelector('#brain-panel:not([hidden]) .brain-location strong', {timeout: 10000}); await page.waitForTimeout(250); };
  // The Chapter tools menu (a <details> in the toolbar) holds the chapter's assistance bar; opened as a viewer opens it.
  const tools = async () => { if (!await page.$('details.chapter-tools[open]')) { await page.click('details.chapter-tools > summary'); await page.waitForSelector('details.chapter-tools[open] .chapter-tools-menu .brain-assistance', {timeout: 5000}); } };
  // The Details column, opened with the toolbar's toggle when the shell left it closed (nothing selected on arrival).
  const showCompanion = async () => { if (await page.evaluate(() => document.body.dataset.panel !== 'open')) { await page.click('.workspace-tools [data-panel-toggle]'); await page.waitForSelector('#inspector[aria-hidden="false"]', {timeout: 5000}); await page.waitForTimeout(400); } };
  const closeSol = async () => { await page.keyboard.press('Escape'); await page.waitForSelector('#brain-panel[hidden]', {state: 'attached', timeout: 5000}); await page.waitForTimeout(150); };
  // Whether the record named in the panel's heading belongs to the chapter, read with the app's own module.
  const belongs = (chapter, ref) => page.evaluate(async ([chapter, ref]) => { const m = await import('/chapter-reasoning.js'); const p = window.aiwProjectStore.value.document; return Object.values(m.RECORD_TYPES).some(T => T.chapter === chapter && (T.coll(p) || []).some(r => String(r.ref || r.id) === ref)); }, [chapter, ref]);

  // 1. Work, Validate and Output of Chapters 5 to 11 with the studio's Chapter 4 selection carried (object=api,
  //    LR-001): Sol's subject is the chapter's own record, and the carried selection is named, never spoken about.
  const seen = [];
  for (const chapter of [5, 6, 7, 8, 9, 10, 11]) for (const tab of ['work', 'validate', 'output']) {
    await open(`chapter=${chapter}&tab=${tab}&object=api`);
    await openSol();
    // The heading names the subject as a reference chip and its title (audit/co-design-2026-10-13.json); the panel's
    // whole text, folded parts included, is searched for a Chapter 4 reading.
    const ref = await text('#brain-panel [data-brain-selected-context] > b'), head = ref + ' · ' + await text('#brain-panel [data-brain-selected-context] > strong'), panel = await page.$eval('#brain-panel', e => e.textContent);
    assert.doesNotMatch(head, /^LR-001/, `Chapter ${chapter} ${tab}: the panel speaks about ${head}`);
    assert.doesNotMatch(panel, /Chapter 4’s recorded facts/, `Chapter ${chapter} ${tab}: no Chapter 4 reading`);
    if (chapter === 11) assert.match(head, /^Project/, `Chapter ${chapter} ${tab}: the project with the round`);
    else assert.ok(await belongs(chapter, ref), `Chapter ${chapter} ${tab}: ${ref} is a Chapter ${chapter} record`);
    assert.match(await text('#brain-panel [data-brain-carried="api"]'), /Selected in the studio: LR-001[\s\S]*Chapter 4[\s\S]*Ask about LR-001 instead/i, `Chapter ${chapter} ${tab}: the carried selection is named`);
    assert.ok(await page.$('#brain-panel .brain-band-project') && await page.$('#brain-panel .brain-band-sol') && await page.$('#brain-panel .brain-band-tools'), `Chapter ${chapter} ${tab}: three bands`);
    seen.push(`${chapter}/${tab}: ${ref}`);
    await closeSol();
  }
  pass('Chapters 5 to 11, Work, Validate and Output: with LR-001 carried from Chapter 4, Sol speaks about the chapter’s own record (' + seen.join(', ') + '), names the studio’s selection, and never reads Chapter 4’s reading; the panel is three labelled bands');

  // 2. The carried selection can be pinned, and unpinned.
  await open('chapter=8&tab=work&object=api');
  await openSol();
  await page.click('#brain-panel [data-brain-action="pin"]');
  await page.waitForSelector('#brain-panel [data-brain-pinned="api"]', {timeout: 5000});
  assert.match(await text('#brain-panel [data-brain-selected-context] > b'), /^LR-001/);
  assert.match(await page.$eval('#brain-panel .brain-sol', e => e.textContent), /Chapter 4’s recorded facts/, 'pinned, the Chapter 4 record is read as Chapter 4 reads it');
  await page.click('#brain-panel [data-brain-action="unpin"]');
  await page.waitForSelector('#brain-panel [data-brain-carried="api"]', {timeout: 5000});
  assert.doesNotMatch(await text('#brain-panel [data-brain-selected-context] > b'), /^LR-001/);
  pass('the carried selection can be pinned (read as its own chapter reads it) and unpinned');

  // 3. The brief: rule-based, labelled, one way to ask; its links choose the panel's subject.
  await open('chapter=7&tab=validate&object=api');
  await openSol();
  assert.ok(await page.$$eval('#brain-panel .brain-brief[data-brain-brief="validate"] li[data-brief-finding]', xs => xs.length) >= 3, 'ranked findings');
  assert.match(await text('#brain-panel .brain-brief-rules'), /findings ranked · level, objects reached, desk vitals[\s\S]*No model was consulted/);
  assert.match(await text('#brain-panel .brain-brief .dk-solask'), /Ask Sol about the top \d/);
  await closeSol();
  await open('chapter=11&tab=output');
  await openSol();
  assert.ok(!!await page.$('#brain-panel .brain-brief li[data-brief-readiness]'), 'the SDD readiness row');
  assert.ok(!!await page.$('#brain-panel .brain-brief li[data-brief-narrative]'), 'the narrative’s missing fields');
  assert.match(await text('#brain-panel .brain-sol'), /Sol · the attending architect[\s\S]*SDD narrative/i, 'Chapter 11: the SDD narrative is a reasoning target');
  await closeSol();
  await open('chapter=8&tab=work&object=api');
  await openSol();
  const first = await page.$eval('#brain-panel .brain-brief li[data-brief-record] [data-brain-action="subject"]', e => e.dataset.id);
  await page.click('#brain-panel .brain-brief li[data-brief-record] [data-brain-action="subject"]');
  await page.waitForFunction(id => /Pinned|Selected in the studio/.test(document.querySelector('#brain-panel .brain-location')?.innerText || '') || true, first, {timeout: 3000});
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate(id => { const p = window.aiwProjectStore.value.document; const chip = document.querySelector('#brain-panel [data-brain-selected-context] > b')?.innerText || ''; const r = [...p.interfaces.contracts, ...p.interfaces.data].find(x => x.id === id); return !!r && chip === String(r.ref || r.id); }, first), 'the brief’s link makes that record the subject');
  await closeSol();
  pass('the brief names its rules and consults no model; Validate ranks findings, Output shows readiness and the narrative’s gaps, Chapter 11’s narrative can be asked about, and a brief link chooses the subject');

  // 3b. The brief is volunteered: one line in the assistance bar, before anyone asks, labelled and naming its rule.
  // Chapter 9: on Chapter 7 the chip's fact repeats the subtitle's word "options", so the one-voice rule hides it there
  // (round 5, Contract G); the chip is shown where it adds a fact.
  await open('chapter=9&tab=validate');
  await tools();
  await page.waitForSelector('details.chapter-tools[open] .brain-assistance .brain-brief-chip[data-brain-brief-chip="validate"]', {timeout: 8000});
  assert.equal(await page.$$eval('.brain-brief-chip', xs => xs.length), 1, 'one brief chip on the page, in the Chapter tools menu');
  // Booleans, not handles: an assertion message that inspects a Playwright handle walks the whole connection.
  assert.equal(!!await page.$('#brain-panel:not([hidden])'), false, 'nothing was clicked: the panel is closed');
  // rc38+: the brief's first item is the saved architecture knowledge for the subject when there is one (labelled as
  // knowledge, never as a rule-based finding), otherwise the finding that matters most; the chip is that first item,
  // word for word, labelled by its kind, with the count of the rest. Both readings are checked against the panel below.
  const readChip = async lead => { const chip = await page.$eval('.brain-brief-chip', e => ({label: e.querySelector('small').textContent, lead: e.querySelector('span > b').textContent, what: e.querySelector('span').textContent.replace(/^[A-Z][a-z]+( [a-z]+)*\s+/, ''), more: e.querySelector('i')?.textContent || '', title: e.title}));
    assert.equal(chip.lead, lead);
    assert.ok(['Project and architecture knowledge', 'From your project · rule-based'].includes(chip.label), 'the chip is labelled by its first item’s kind: ' + chip.label);
    assert.match(chip.title, /^(Saved project and architecture knowledge|From your project · rule-based) \((architecture knowledge · \w+|[^()]+)\)\. No model was consulted\. Ask Sol shows the whole brief\.$/);
    assert.match(chip.more, /^\+\d+ in Sol’s brief$/);
    return chip; };
  // The chip against the whole brief (the panel open): its first item (knowledge, record or finding), its label from that
  // item's kind, and "+N" the number of the brief's other items.
  const chipAgainstBrief = async (chip, tab) => { const brief = await page.$eval(`#brain-panel .brain-brief[data-brain-brief="${tab}"]`, e => { const items = [...e.querySelectorAll('li')].filter(li => !li.parentElement.closest('li') && !li.matches('[data-brief-next]')); const f = items[0]; return {count: items.length, kind: f.matches('[data-intelligence-id]') ? 'knowledge' : f.matches('[data-brief-finding]') ? 'finding' : f.matches('[data-brief-record]') ? 'record' : 'other', title: f.querySelector('b')?.textContent || '', findings: e.querySelectorAll('li[data-brief-finding]').length, records: e.querySelectorAll('li[data-brief-record]').length}; });
    assert.equal(chip.label, brief.kind === 'knowledge' ? 'Project and architecture knowledge' : 'From your project · rule-based', 'the chip’s label is its first item’s kind');
    assert.equal(chip.more, `+${brief.count - 1} in Sol’s brief`, 'the chip counts the brief’s other items');
    assert.ok(brief.title && chip.what.startsWith(brief.title.slice(0, 40)), `the chip is the brief’s first item: ${chip.what} / ${brief.title}`);
    return brief; };
  const chip = await readChip('Matters most');
  // The three companions: Ask Sol in the toolbar (one, the control the shell wires to the panel), Co-design and Hover help in
  // the Chapter tools menu; the chip is a paragraph, never a button, and the menu carries no second Ask Sol.
  assert.deepEqual(await page.$$eval('.brain-assistance button', xs => xs.map(b => b.getAttribute('aria-label') || b.textContent.trim())), ['Co-design', 'Hover help, on'], 'the line is text, not a third control in the menu: Co-design and Hover help');
  assert.equal(await page.$$eval('.brain-assistance [data-brain-launch="design"], .brain-assistance .brain-brief-chip button', xs => xs.length), 0, 'no second Ask Sol and no button in the chip');
  assert.equal(await page.$eval('.brain-brief-chip', e => e.tagName), 'P');
  await openSol();
  assert.ok(!!await page.$('#brain-panel .brain-brief[data-brain-brief="validate"]'), 'Ask Sol shows the whole brief');
  const brief = await chipAgainstBrief(chip, 'validate');
  assert.ok(brief.findings >= 3 && !!await page.$('#brain-panel .brain-brief li[data-brief-finding] [data-brain-action="subject"] b'), 'the ranked findings follow, each by its record’s reference');
  await closeSol();
  await open('chapter=1&tab=work');
  await tools();
  await page.waitForSelector('details.chapter-tools[open] .brain-assistance .brain-brief-chip[data-brain-brief-chip="work"]', {timeout: 8000});
  const workChip = await readChip('Look first');
  await openSol();
  const workBrief = await chipAgainstBrief(workChip, 'work');
  assert.ok(workBrief.records >= 1 && /REQ-\d{3}/.test(await text('#brain-panel .brain-brief li[data-brief-record] b')), 'Chapter 1’s brief names its records by reference (REQ-ddd)');
  await closeSol();
  await page.goto(base + '/?chapter=5&tab=model', {waitUntil: 'networkidle'});
  await page.waitForSelector(SOL, {timeout: 10000}); await showCompanion();
  await page.waitForSelector(COMPANION + ' [data-brain-launch="design"]', {timeout: 10000}); await page.waitForTimeout(800);
  assert.equal(await page.$$eval('.brain-brief-chip', xs => xs.length), 0, 'the Model tab carries no brief chip anywhere: it keeps its own “What the model shows”');
  assert.match(await text(COMPANION), /What the model shows/i);
  pass('the brief is volunteered without a click: a line in the Chapter tools menu names the brief’s first item (saved knowledge for the subject, else the finding that matters most), labelled by its kind, counting the rest and saying no model was consulted; Ask Sol is the toolbar’s one control and the menu keeps Co-design and Hover help');

  // 4. A question in the architect's own words goes through the reasoning path: prepared with the instruction pin,
  //    nothing sent until Send to Sol, the assessment carrying the pin.
  await open('chapter=8&tab=work&object=api');
  await openSol();
  const before = llm.calls.length;
  await page.$eval('#brain-panel .intel-reason > details', d => { d.open = true; });
  await page.fill('#brain-panel .intel-reason [data-intel-prompt]', 'Is the timeout right for this contract?');
  await page.click('#brain-panel [data-intel-action="ask-record"]');
  await page.waitForSelector('#brain-panel .brain-sol .dk-solpend [data-dk="sol-send"]:not([disabled])', {timeout: 10000});
  assert.equal(llm.calls.length, before, 'preparing sends nothing');
  assert.equal(await page.$eval('#brain-panel .brain-sol .dk-solpend [data-dk-in="sol-prompt"]', e => e.value), 'Is the timeout right for this contract?');
  assert.match(await text('#brain-panel .brain-sol .dk-solpend [data-sol-pin]'), /Instructions pinned: prompt sol-reasoning-4 · [0-9a-f]{12}/);
  assert.equal(await page.$$eval('#brain-panel [data-intel-action="generate"]', xs => xs.length), 0, 'no second, generate path for a record question');
  await page.$eval('#brain-panel .brain-sol .dk-solpend [data-dk="sol-send"]', e => e.click());
  await page.waitForSelector('#brain-panel .brain-sol .dk-sol', {timeout: 15000});
  assert.deepEqual(llm.calls.slice(before), ['aiw_desk_assessment', 'aiw_desk_assessment_check'], 'one assessment and one source check');
  assert.match(await text('#brain-panel .brain-sol .dk-solfoot'), /source-checked · prompt sol-reasoning-4 · [0-9a-f]{12}/);
  await closeSol();
  pass('a question in the architect’s own words about a record is prepared through the reasoning path with its instruction pin, sent only on Send to Sol (one assessment, one source check), and the assessment carries the pin');

  // 5. Every Model tab keeps a way to Sol and Co-design: in the companion beside the model for Chapters 2 to 10 (the
  //    canvas keeps its room), a bar above Chapter 1's story view, and Chapter 11's desk asks beside each part.
  for (const [chapter, object] of [[5, 'api-pod'], [8, 'rest'], [2, 'QD-001'], [3, 'ADR-001'], [6, null], [10, null]]) {
    await page.goto(base + `/?chapter=${chapter}&tab=model${object ? '&object=' + object : ''}`, {waitUntil: 'networkidle'});
    await page.waitForSelector(SOL, {timeout: 10000});
    // With an object in the address the Details column opens by itself; without one the viewer opens it.
    if (object) assert.equal(await page.evaluate(() => document.body.dataset.panel), 'open', `Chapter ${chapter}: the companion opens with the selected object`);
    else await showCompanion();
    await page.waitForSelector(COMPANION + ' [data-brain-launch="design"]', {timeout: 10000});
    assert.equal(!!await page.$('.brain-model-bar'), false, `Chapter ${chapter}: nothing is laid over the canvas`);
    await page.click(COMPANION + ' [data-brain-launch="design"]');
    await page.waitForSelector('#brain-panel:not([hidden]) .brain-location strong', {timeout: 10000});
    assert.match(await text('#brain-panel .brain-modes'), /Sol/);
    await closeSol();
  }
  await page.goto(base + '/?chapter=10&tab=model', {waitUntil: 'networkidle'});
  await page.waitForSelector(SOL, {timeout: 10000}); await showCompanion();
  await page.waitForSelector(COMPANION + ' .cs-round [data-brain-launch="mind"]', {timeout: 10000});
  await page.click(COMPANION + ' .cs-round [data-brain-launch="mind"]');
  await page.waitForSelector('#brain-panel:not([hidden])[data-role="mind"]', {timeout: 10000});
  await closeSol();
  // Chapter 1's story view carries Sol in its companion like every other chapter model; nothing is laid over the canvas.
  await page.goto(base + '/?chapter=1&tab=model&object=REQ-001', {waitUntil: 'networkidle'});
  await page.waitForSelector(COMPANION + ' [data-brain-launch="design"]', {timeout: 10000});
  assert.equal(!!await page.$('.brain-model-bar'), false, 'Chapter 1: nothing is laid over the canvas');
  await page.click(COMPANION + ' [data-brain-launch="design"]');
  await page.waitForSelector('#brain-panel:not([hidden]) .brain-location strong', {timeout: 10000});
  await closeSol();
  await page.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'});
  await page.waitForSelector(SOL, {timeout: 10000}); await showCompanion();
  await page.waitForSelector(COMPANION + ' [data-dk="sol-ask"]', {timeout: 15000});
  assert.ok(await page.$$eval(COMPANION + ' [data-dk="sol-ask"]', xs => xs.length) >= 7, 'Chapter 11’s desk asks beside each part');
  await page.goto(base + '/?chapter=5&tab=model&object=api', {waitUntil: 'networkidle'});
  await page.waitForSelector(COMPANION + ' [data-brain-launch="design"]', {timeout: 10000});
  await page.click(COMPANION + ' [data-brain-launch="design"]');
  await page.waitForSelector('#brain-panel:not([hidden]) .brain-sol.compact', {timeout: 10000});
  assert.match(await text('#brain-panel .brain-sol.compact'), /Nothing assessable is selected[\s\S]*records with open checks[\s\S]*Ask beside the model/i, 'a carried selection on the Model tab points beside the model');
  await closeSol();
  pass('every Model tab keeps a way to Sol and Co-design: the companion beside Chapters 2 to 10 (nothing laid over the canvas), a bar above Chapter 1’s story view, the desk’s asks in Chapter 11; a carried selection points to the companion beside the model');

  // 6. Honesty of labels: the chapter's menu is a Chapter tool, the round is "Records with open checks" until assessed,
  //    a template proposal says so, and the not-connected wording is one sentence from one place.
  await open('chapter=1&tab=work');
  await openSol();
  const p1 = await text('#brain-panel');
  assert.doesNotMatch(p1, /Sol · Act on this context/, 'the menu is not Sol’s');
  assert.match(await text('#brain-panel .brain-band-tools'), /Chapter tools/i, 'the band label (shown in capitals by CSS)');
  assert.match(await text('#brain-panel .brain-brief'), /Where to look first[\s\S]*No model was consulted/i);
  if (/suggested improvement|template proposal/i.test(p1)) assert.match(p1, /A template proposal · rule-based/);
  await closeSol();
  pass('Chapter 1: the chapter’s own menu is labelled a Chapter tool, the brief is labelled rule-based, and a template proposal is labelled as one');

  // 7. A programmatic click opens the panel as a pointer click does (Chapters 8 and 1), by click() and by a dispatched event.
  for (const q of ['chapter=8&tab=work&object=rest', 'chapter=1&tab=work']) {
    await open(q);
    await page.evaluate(sel => document.querySelector(sel).click(), SOL);
    await page.waitForSelector('#brain-panel:not([hidden]) .brain-location strong', {timeout: 8000});
    await closeSol();
    await page.evaluate(sel => document.querySelector(sel).dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true})), SOL);
    await page.waitForSelector('#brain-panel:not([hidden]) .brain-location strong', {timeout: 8000});
    await closeSol();
  }
  pass('a programmatic click() and a dispatched click event on Ask Sol open the panel, on Chapters 8 and 1');

  // 8. The hover explanation is the one rule-based micro-reading.
  await open('chapter=4&tab=work&object=api');
  await page.hover('[data-select]');
  await page.waitForSelector('#cursor-tip:not([hidden]) .tip-brain', {timeout: 5000});
  const tip = await text('#cursor-tip');
  assert.match(tip, /Check · |Checks · none open/); assert.match(tip, /Context · \d+ requirement/);
  pass('hovering an object shows the one rule-based micro-reading: its check, the vital of the parts it touches, the knowledge rule, the context');

  // 9. Co-design's relevant knowledge for the record (formerly Proposals; audit/co-design-2026-10-13.json keeps it under
  // "Knowledge and chapter tools"): retrieved concepts with matched terms, the rules that fired, the retrieval trace.
  await open('chapter=4&tab=work&object=api');
  await tools();
  await page.click('details.chapter-tools[open] .brain-assistance [data-brain-launch="mind"]');
  await page.click('#brain-panel:not([hidden]) details.brain-exploration:not([open]) > summary', {timeout: 10000});
  await page.waitForSelector('#brain-panel:not([hidden]) [data-brain-relevance]', {timeout: 10000});
  // rc38+: the band's label is the authority sentence (knowledge-ui.js): relevance is repository context, it carries no
  // authority of its own, and candidate or discovery knowledge is never in it; every retrieved consideration says that
  // applicability is not established.
  const relevance = await text('#brain-panel [data-brain-relevance]');
  assert.match(relevance, /^Relevant knowledge for LR-001\s*\n\s*Repository context · relevance and conditional checks carry separate authority · candidate and discovery knowledge is excluded\s*\n[\s\S]*Concepts retrieved · \d+ of \d+\n[\s\S]*Retrieved considerations · \d+\n[\s\S]*Retrieval trace/);
  assert.doesNotMatch(relevance, /Descriptive only|applicability is established/);
  assert.equal(await page.$$eval('#brain-panel [data-brain-relevance] .brain-relevance-list li', xs => xs.filter(li => !/matched: /.test(li.textContent)).length), 0, 'every retrieved concept names its matched terms');
  await closeSol();
  pass('Co-design shows, for the selected record, the concepts retrieved with their matched terms, the considerations with applicability not established and the retrieval trace, under the authority sentence (repository context; candidate and discovery knowledge excluded)');

  assert.deepEqual(errors, []);
  pass('no page errors');
} finally {
  await browser.close(); server.kill(); await llm.close();
  try { rmSync(db, {force: true}); rmSync(db + '-wal', {force: true}); rmSync(db + '-shm', {force: true}); } catch { /* best effort */ }
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
