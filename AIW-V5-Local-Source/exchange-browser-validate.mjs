// Rendered checks for the Chapter 8 Model views: the Data flow, and (round 11, A) the retired Sequence view's questions kept
// by the Diagram's Sequence picture, whose selected message reads what its contract promises.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and
// optionally AIW_BROWSER_EXECUTABLE. Starts an isolated local server on a free port.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/exchange-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => checks.push(n);
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  // Round 7: Sol's part of the companion is a folded section, closed until Sol has something to say; this suite reads and
  // clicks Sol's controls there, so it views the section as a viewer who opened it (the remembered choice).
  await page.addInitScript(() => { try { localStorage.setItem('aiw.companion.sol', '1'); } catch { /* storage is a convenience */ } });
  page.on('pageerror', e => errors.push(e.message));
  const open = async (extra = '') => { await page.goto(base + '/?chapter=8&tab=model&model=data' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-head', {timeout: 8000}); await page.waitForTimeout(400); };
  const yah = () => page.$eval('#yah-text', e => e.textContent);
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' '));
  const lanes = () => page.$$eval('.cm-head[data-lane]', els => els.map(e => e.dataset.lane));
  // Positions in the model's own world (round 3, B): in the page's one frame the stage is shorter, so focusing an element
  // near its foot may move the camera or scroll the stage column; neither is the layout these checks hold still.
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.cm-head, .cm-drow, .cm-auth, .cm-mv')].map(e => { const r = e.getBoundingClientRect(), o = (e.closest('.cm-world, .cm-heads-in, .cm-rail-in') || e.closest('.cm-stage') || e.closest('.cm'))?.getBoundingClientRect() || {x: 0, y: 0}; return [String(e.className.baseVal ?? e.className).split(' ')[0], Math.round(r.x - o.x), Math.round(r.y - o.y), Math.round(r.width), Math.round(r.height)].join('|'); }));
  const click = async sel => { await page.click(sel); await page.waitForTimeout(250); };
  const pickMove = id => page.evaluate(id => [...document.querySelectorAll('.cm-mvl[data-sel]')].find(e => e.dataset.sel === id).click(), id);

  // 1. Chapter 8's own view is the Data flow; the retired Sequence view's deep link opens the Diagram's Sequence picture
  //    and "You are here" says so (round 11, A).
  await page.goto(base + '/?chapter=8&tab=model&model=sequence', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm-svg .nt-lifeline', {state: 'attached', timeout: 8000}); await page.waitForTimeout(400);
  assert.ok(await page.$('.cm .cm-view[data-id="diagram"][aria-pressed="true"]') && !(await page.$('.cm-view[data-id="sequence"]')), 'model=sequence opens the Diagram; there is no Sequence entry');
  assert.equal(await page.$eval('[data-nt-field="scene"]', e => e.value), 'sequence', 'on the Sequence picture');
  assert.ok((await page.$$('.cm-svg .nt-lifeline')).length >= 6 && (await page.$$('.cm-svg .nt-edge.nt-e-message')).length >= 10, 'which draws the chapter’s contracts as messages on their lifelines');
  assert.match(await yah(), /The Sequence view is retired: the Diagram’s Sequence picture draws the messages, and a selected message reads what its contract promises/, '"You are here" says why');
  await open();
  assert.ok(await page.$('.cm .cm-view[data-id="data"][aria-pressed="true"]'));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.am-explorer, .canvas-card')].some(e => getComputedStyle(e).display !== 'none')), false, 'the explorer and the old canvas are not shown');
  assert.equal((await lanes())[0], 'ext-channel');
  assert.equal((await page.$$('.cm-drow')).length, 4, 'four data definitions');
  assert.ok(await page.$eval('.cm-stage', e => e.getBoundingClientRect().height) >= 360);
  pass('Chapter 8 Model opens on the Data flow (four definitions, reading from the initiating channel); model=sequence opens the Diagram on its Sequence picture, which draws the contracts as messages, and "You are here" says the view is retired');

  // 2. Lenses never move anything, and carry the one vocabulary's names.
  {
    const before = await rects();
    for (const lens of ['signals', 'information', 'flow']) { await click(`[data-ex="lens"][data-id="${lens}"]`); assert.deepEqual(await rects(), before, lens + ' moved objects'); }
    assert.deepEqual(await page.$$eval('.cm-lenses .cm-lens span', ss => ss.map(x => x.textContent)), ['Flow', 'Signals', 'Information'], 'the chapter’s subset of the seven lens names');
    await click('[data-ex="lens"][data-id="signals"]');
    assert.ok((await page.$$('.cm-lens-signals .cm-mvl.has-gaps')).length > 0, 'Signals shows which movements travel on an incomplete contract');
    await click('[data-ex="lens"][data-id="flow"]');
  }
  pass('switching Flow, Signals and Information leaves every column and data row where it was, and the lens bar carries the one vocabulary’s names');

  // 3. What a contract promises when an answer is late, lost or repeated (the retired view's frames) is read in the
  //    Sequence picture's companion for the selected message, and from a data definition's reading the picture is one click away.
  await click('.cm-drow[data-sel="instruction"]'); await page.waitForTimeout(300);
  await click(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) [data-ex="scene"][data-id="sequence"]'); await page.waitForSelector('.cm-svg .nt-lifeline', {state: 'attached', timeout: 8000}); await page.waitForTimeout(400);
  assert.equal(await page.$eval('[data-nt-field="scene"]', e => e.value), 'sequence', '“See it in the Sequence picture” opens the picture');
  await page.$eval('.cm-svg .nt-hit[data-nt-edge^="msg:network:"]', e => e.dispatchEvent(new MouseEvent('click', {bubbles: true}))); await page.waitForTimeout(500);
  const promises = await page.$eval(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) .cm-promises', e => e.innerText);
  assert.match(promises, /What the contract promises[\s\S]*IF-003[\s\S]*Timeout\s*Not recorded[\s\S]*Retry[\s\S]*Failure[\s\S]*Repeats[\s\S]*Correlation/i, 'the settlement contract’s missing timeout is said where the message is: ' + promises.slice(0, 120));
  assert.ok(await page.$(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) .cm-promises [data-ex="propose"][data-key="uncertainty"]'), 'with the recovery wording to propose');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await open();
  pass('a selected message of the Sequence picture reads what its contract promises when an answer is late, lost or repeated, the settlement contract’s missing timeout among them, with the recovery wording to propose; a data definition’s reading opens the picture');

  // 4. Selecting a movement selects its contract and opens it in the companion.
  await pickMove('if-004'); await page.waitForTimeout(300);
  assert.match(await page.$eval(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) .cm-spec', e => e.innerText), /IF-004 · Check[\s\S]*Timeout[\s\S]*Edit contract/);
  assert.ok((await page.$$('.cm-mvl.lit')).length >= 1 && (await page.$$('.cm-mvl.dim')).length > 0, 'its movements light and the rest dim');
  await click(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) [data-brain-launch="design"]');
  assert.ok(await page.$('#brain-panel:not([hidden])'), 'Sol opened on the contract');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  pass('selecting a movement opens its contract in the companion with its promises, lights what it carries, and Ask Sol acts on it');

  // 5. Dissect: a part and back.
  await open();
  await page.dblclick('.cm-head[data-lane="core-adapter"]'); await page.waitForTimeout(500);
  assert.match(await crumbs(), /Control & accounting › Core connector/);
  assert.ok((await lanes()).includes('GRP-001'), 'unrelated components fold into their module');
  assert.ok((await page.$$('.cm-mvl.out')).length > 0, 'movements that do not touch the part are dimmed');
  for (let i = 0; i < 4 && /Core connector|Control/.test(await crumbs()); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  assert.doesNotMatch(await crumbs(), /Core connector|Control/);
  await click('[data-ex="depth"][data-id="modules"]');
  assert.equal((await lanes()).length, 6, 'module columns');
  await click('[data-ex="depth"][data-id="components"]');
  pass('a component can be dissected with its partners while the rest folds into modules; Escape steps back; module columns fold the components');

  // 6. Data flow keeps the lifelines' one order (the Sequence picture reads the same model) and shows authority, copies
  //    and unexplained sends.
  const dataOrder = await lanes();
  assert.ok(dataOrder[0] === 'ext-channel' && dataOrder.slice(-2).join() === 'ext-core,ext-network', 'from where work enters to where it leaves: ' + dataOrder.join(' '));
  assert.equal((await page.$$('.cm-drow')).length, 4);
  assert.equal((await page.$$('.cm-auth')).length, 4);
  assert.equal((await page.$$('.cm-unsourced')).length, 2, 'two sends without a recorded source');
  await click('.cm-auth');
  assert.match(await page.$eval(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) .cm-spec', e => e.innerText), /Data definition[\s\S]*Authority/i);
  pass('Data flow keeps the one column order and shows each definition\'s authority, copies, and the two sends no contract explains');

  // 7. Editing a contract goes through the chapter's editor and the reviewable proposal.
  await open();
  await pickMove('network'); await page.waitForTimeout(300);
  await click(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) [data-i-action="edit-contract"]');
  assert.ok(await page.$('dialog.i-dialog[open]'), 'the chapter 8 contract editor opened');
  await click('dialog.i-dialog [data-i-step="2"]');
  await page.fill('dialog.i-dialog [name="timeoutPolicy"]', 'Keep the payment pending; enquire by payment reference before any resubmission.');
  await page.click('dialog.i-dialog button[type=submit]'); await page.waitForTimeout(1000);
  assert.match(await page.$eval('.cm-banner', e => e.innerText), /Unsaved proposal[\s\S]*IF-003/i);
  assert.ok((await page.$$('.cm .proposed')).length > 0, 'affected parts are marked');
  assert.match(await page.$eval(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) .cm-spec', e => e.innerText), /enquire by payment reference/);
  await page.reload({waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-head'); await page.waitForTimeout(300);
  assert.equal(await page.$eval('.cm-banner', e => e.innerText.trim()), '', 'nothing was saved without review');
  pass('Edit contract opens the Chapter 8 editor; the change appears as an unsaved proposal on the Data flow, and nothing is saved without review');

  // 8. Nothing of the retired view is left on the page: no scenario picker, no walk, no message rows of its own.
  assert.equal(await page.$$eval('[data-ex-field="scenario"], [data-ex="walk"], .cm-msg, .cm-stephead, .cm-frame', es => es.length), 0, 'the Sequence view’s controls and drawings are gone');
  assert.deepEqual(await page.$$eval('.cm-top .cm-view', bs => bs.map(b => b.dataset.id)), ['data', 'diagram', 'layers', 'table', 'cross', 'whole'], 'the switcher: Diagram · Data flow · the shared views');
  pass('the retired Sequence view leaves nothing behind: no scenario picker, walk or message rows; the switcher is Diagram · Data flow · Layers · Table · Matrix · Whole design');

  // 9. Perspectives are entries of the switcher (round 5, R5-C): one composed and saved here is Chapter 8's view, a reload
  //    lands on it (modelView= in the address), and the chapter's Data flow view brings its models back.
  await click('.cm:not(.pv) .pv-pick > summary'); await click('.cm:not(.pv) .pv-pick [data-pv="new"]'); await page.waitForSelector('#inspector [data-pv-form]', {timeout: 8000});
  assert.ok(await page.$('.cm.pv') && !(await page.$('.cm .cm-drow')) && !(await page.$('.am-explorer')), 'a perspective is the chapter\'s view, in its frame');
  await page.fill('#inspector [data-pv-field="title"]', 'Chapter 8 exchanges'); await click('#inspector [data-pv-form] [type="submit"]'); await page.waitForSelector('.cm.pv .pv-sum.pv-on', {timeout: 8000});
  await page.reload({waitUntil: 'networkidle'}); await page.waitForSelector('.cm.pv', {timeout: 8000}); await page.waitForTimeout(400);
  assert.ok(new URL(page.url()).searchParams.get('modelView') && !(await page.$('.cm .cm-drow')), 'the saved perspective is still the chapter\'s view after a reload');
  await click('.cm.pv .cm-views > .cm-view[data-id="data"]'); await page.waitForSelector('.cm .cm-drow', {timeout: 8000}); await page.waitForTimeout(200);
  assert.ok(await page.$('.cm .cm-drow') && !new URL(page.url()).searchParams.get('modelView'));
  pass('a perspective saved in Chapter 8\'s switcher is its view, a reload lands on it, and the Data flow view returns to the Chapter 8 models');

  // 10. Other tabs and chapters are unaffected.
  await page.click('.workspace-bar [data-tab="validate"]'); await page.waitForTimeout(900);
  // Round 3 (C): Validate is the chapter's checks, with a status header and the chapter in the SDD; the model stays on Model.
  await page.waitForSelector('.vx-head .vx-counts', {timeout: 8000});
  assert.ok(await page.$('.vx-sdd') && !(await page.$('.cm')), 'Validate opens on the chapter’s checks, without the model');
  await page.click('.workspace-bar [data-tab="work"]'); await page.waitForTimeout(500);
  assert.ok(!(await page.$('.cm')));
  await page.click('.workspace-bar [data-tab="model"]'); await page.waitForTimeout(700);
  assert.ok(await page.$('.cm .cm-drow'));
  await page.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'}); await page.waitForTimeout(900); assert.ok(await page.$('.cm.dk') && !(await page.$('.cm.ex')), 'chapter 11 opens on the review desk');
  await page.goto(base + '/?chapter=9&tab=model&model=model', {waitUntil: 'networkidle'}); await page.waitForTimeout(700);
  assert.ok(await page.$('.cm.tm') && !(await page.$('.cm-drow')), 'chapter 9 opens on its own models, not Chapter 8\'s');
  pass('Validate and Work are unchanged; Chapter 11 opens on the review desk, and Chapter 9 opens on its own');

  // 10b. Round 6 (Contract T): the Diagram's picture picker offers the sequence and the lifecycle, each read in words in the
  //      companion; the switcher keeps its six entries, so the header stays one row and the stage keeps its height.
  await page.goto(base + '/?chapter=8&tab=model&model=diagram', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-stage', {timeout: 8000}); await page.waitForTimeout(500);
  assert.equal((await page.$$('.cm-top .cm-view')).length, 6, 'the switcher keeps its six entries');
  const topH = await page.$eval('.cm-top', e => e.getBoundingClientRect().height); assert.ok(topH < 90, 'the header stays one row at 1440 × 900 (two rows measured 108 px): ' + topH);
  await page.selectOption('[data-nt-field="scene"]', 'sequence'); await page.waitForTimeout(700);
  assert.equal(await page.$eval('[data-ex="view"][data-id="diagram"]', e => e.getAttribute('aria-pressed')), 'true', 'the sequence is a picture of the Diagram');
  // The chapter's selected record narrows the sequence to its own messages (Contract T, wired at integration); with the
  // selection cleared the whole chapter's sequence is drawn.
  const narrowed = [(await page.$$('.cm-svg .nt-lifeline')).length, (await page.$$('.cm-svg .nt-edge.nt-e-message')).length];
  assert.ok(narrowed[0] >= 2 && narrowed[1] >= 2, 'the selected record\'s lifelines and messages are drawn: ' + narrowed.join('/'));
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);
  if ((await page.$$('.cm-svg .nt-lifeline')).length < 6) { await page.evaluate(() => window.aiwRoute(location.pathname + location.search)); await page.waitForTimeout(700); }
  assert.ok((await page.$$('.cm-svg .nt-lifeline')).length >= 6 && (await page.$$('.cm-svg .nt-edge.nt-e-message')).length >= 10, 'with nothing selected, every lifeline and message is drawn');
  assert.match(await page.$eval(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) .nt-scene-read', e => e.innerText), /Reading this sequence[\s\S]*\d+ contracts in process order[\s\S]*\d+ lifelines[\s\S]*1\. /i, 'the companion reads the sequence in words');
  await page.selectOption('[data-nt-field="scene"]', 'lifecycle'); await page.waitForTimeout(700);
  assert.equal((await page.$$('.cm-svg .nt-node[data-nt-node^="state:"]')).length, 6, 'the states of the two data definitions with a lifecycle');
  assert.match(await page.$eval(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) .nt-scene-read', e => e.innerText), /Reading these states[\s\S]*2 data definitions with a lifecycle[\s\S]*PENDING → SETTLED by IF-003/i);
  await page.selectOption('[data-nt-field="scene"]', 'integration'); await page.waitForTimeout(600);
  assert.equal((await page.$$('.cm-svg .nt-node[data-nt-node^="state:"]')).length, 0); assert.equal(await page.$eval(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion)', e => e.querySelectorAll('.nt-scene-read').length), 0, 'the chapter\'s own picture reads as before');
  pass('the Diagram\'s picture picker offers the sequence and the lifecycle, each read in words in the companion; the switcher keeps its six entries and the stage its height');

  // 11. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=8&tab=model&model=data', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .cm-head'); await p2.waitForTimeout(400);
  const m = await p2.evaluate(() => ({h: document.querySelector('.cm-stage').getBoundingClientRect().height, over: document.documentElement.scrollWidth > innerWidth}));
  assert.ok(m.h >= 360 && !m.over, 'phone ' + JSON.stringify(m));
  // The sequence picture (round 6) fits the phone too, with the companion's reading.
  await p2.goto(base + '/?chapter=8&tab=model&model=diagram', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .cm-stage', {timeout: 8000}); await p2.waitForTimeout(500);
  await p2.selectOption('[data-nt-field="scene"]', 'sequence'); await p2.waitForTimeout(700);
  const m2 = await p2.evaluate(() => ({over: document.documentElement.scrollWidth > innerWidth, lifelines: document.querySelectorAll('.cm-svg .nt-lifeline').length, read: document.querySelectorAll('.nt-scene-read').length}));
  assert.ok(!m2.over && m2.lifelines >= 6 && m2.read === 1, 'phone, sequence: ' + JSON.stringify(m2));
  await phone.close();
  pass('on a 390 px phone the sequence has a usable canvas and no horizontal page scroll');

  // Round 12 (D2): a data definition saved without a classification is not classified yet; its row says so and is drawn
  // as unclassified, never as public.
  {
    const save = (type, payload) => page.evaluate(async ([type, payload]) => { const s = window.aiwProjectStore.value, r = await fetch('/api/commands?project=' + encodeURIComponent(s.document.id), {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({revision: s.revision, command: {type, payload}})}), out = await r.json(); if (!r.ok) throw Error(type + ': ' + out.error); return out.selected; }, [type, payload]);
    const id = await save('interfaces.data', {title: 'Beneficiary notice', purpose: 'Who is told of a payment.', owner: 'Payments', authorityId: 'api-pod', protection: 'Masked in every view.'});
    await open();
    const row = await page.$eval(`.cm-drow[data-sel="${id}"]`, e => ({text: e.innerText, cls: e.className}));
    assert.match(row.text, /Not classified yet/);
    assert.ok(/\bunclassified\b/.test(row.cls) && !/\bpublic\b/.test(row.cls), 'drawn as unclassified: ' + row.cls);
    pass('round 12: a data definition saved without a classification is not classified yet in the Data flow, drawn as unclassified rather than public');
  }

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 8 model (rendered)', passed: checks.length, checks}, null, 2));
