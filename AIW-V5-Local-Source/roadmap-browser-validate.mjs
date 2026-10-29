// Rendered checks for Chapter 11 · Work · Plateaus (round 6, Contract S) on a scratch copy of the bank reference project:
// the empty state in AIW's words; three plateaus added through the dialog and the reviewed command; two records
// assigned; an action with its plateau; the readings (the table's readiness in words and glyphs, the Gap per plateau,
// the assignments) and the plan's checks on the stage and on Validate, each to confirm; and the stage at phone width
// (390 px) without the page widening and without text under 12 px. Needs Playwright and Chromium:
// AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally AIW_BROWSER_EXECUTABLE. Starts an isolated local
// server on a free port with its own database, which it removes. Run: npm run test:roadmap-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/roadmap-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: '', ANTHROPIC_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => { checks.push(n); if (process.env.RM_DEBUG) console.error('PASS', checks.length, n.slice(0, 70)); };
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const text = async sel => ((await page.$(sel)) ? page.$eval(sel, e => e.innerText) : '');
  // rc39/rc40 Work (rc41 W4): Chapter 11's stages are the Work frame's (li.work-stage[data-work-stage]), each with the
  // chapter's own stage button (data-rv-action="stage", data-rv-stage); the .rv-work container is gone.
  const openStage = async () => { await page.goto(base + '/?chapter=11&tab=work', {waitUntil: 'networkidle'}); await page.waitForSelector('li.work-stage[data-work-stage="plateaus"] button[data-rv-action="stage"][data-rv-stage="plateaus"]', {timeout: 10000}); await page.click('li.work-stage[data-work-stage="plateaus"] button[data-rv-action="stage"][data-rv-stage="plateaus"]'); await page.waitForSelector('.rv-plateaus-head', {timeout: 8000}); };
  // A dialog form: fill, submit, wait for the dialog to close and the stage to show what was saved.
  const submit = async (form, waitFor) => { await page.click(form + ' button[type=submit]'); await page.waitForSelector(form, {state: 'detached', timeout: 10000}); if (waitFor) await page.waitForSelector(waitFor, {timeout: 10000}); };
  const addPlateau = async ({title, kind, order, due = ''}, id) => {
    await page.click('[data-rv-action="plateau-add"]'); await page.waitForSelector('#rv-plateau-form', {timeout: 8000});
    await page.fill('#rv-plateau-form [name=title]', title); await page.selectOption('#rv-plateau-form [name=kind]', kind); await page.fill('#rv-plateau-form [name=order]', String(order)); if (due) await page.fill('#rv-plateau-form [name=due]', due);
    await submit('#rv-plateau-form', 'tr[data-plateau="' + id + '"]');
  };

  // 1. The empty state, in AIW's words.
  await openStage();
  assert.match(await text('.rv-plateaus-empty'), /No plateaus yet: the design is one state\./);
  assert.ok(await page.$('[data-rv-action="plateau-add"]'), 'Add a plateau is offered'); assert.equal(await page.$('[data-rv-action="plateau-assign"]'), null, 'nothing to assign to yet');
  pass('the stage opens on the bank reference with "No plateaus yet: the design is one state." and offers Add a plateau');

  // 2. Three plateaus through the dialog: the reviewed command review.plateau.
  await addPlateau({title: 'As is', kind: 'current', order: 1}, 'PLT-001');
  await addPlateau({title: 'Next', kind: 'transition', order: 2, due: '2026-12-31'}, 'PLT-002');
  await addPlateau({title: 'Target', kind: 'target', order: 3, due: '2027-06-30'}, 'PLT-003');
  const rows = await page.$$eval('.rv-pl-table tr[data-plateau]', xs => xs.map(x => [x.dataset.plateau, x.querySelector('th b').textContent, x.querySelector('th small').textContent, x.children[2].textContent]));
  assert.deepEqual(rows, [['PLT-001', 'As is', 'PLT-001 · Current state', '—'], ['PLT-002', 'Next', 'PLT-002 · Transition', '2026-12-31'], ['PLT-003', 'Target', 'PLT-003 · Target', '2027-06-30']], 'the table in order with kind and due');
  assert.match(await text('.rv-pl-findings'), /Plan the work towards Next[\s\S]*Plan the work towards Target/, 'a transition and a target with no action are to confirm');
  assert.ok((await text('.rv-pl-findings')).includes('to confirm'));
  // A second current state is refused by the server, and the refusal lands in the dialog.
  await page.click('[data-rv-action="plateau-add"]'); await page.waitForSelector('#rv-plateau-form');
  await page.fill('#rv-plateau-form [name=title]', 'Now too'); await page.selectOption('#rv-plateau-form [name=kind]', 'current'); await page.fill('#rv-plateau-form [name=order]', '9');
  await page.click('#rv-plateau-form button[type=submit]'); await page.waitForSelector('#rv-dialog-error:not([hidden])', {timeout: 8000});
  assert.match(await text('#rv-dialog-error'), /one current state/); await page.click('.rv-dialog [data-rv-action="close"]'); await page.click('.rv-dialog [data-rv-action="discard"]').catch(() => { /* the form was not dirty */ });
  await page.waitForSelector('#rv-plateau-form', {state: 'detached', timeout: 8000});
  assert.equal((await page.$$('.rv-pl-table tr[data-plateau]')).length, 3);
  pass('three plateaus added through the dialog and the reviewed command, in order with kind and due; a second current state is refused and the refusal lands in the dialog; the plan\'s checks name the transition and the target without an action');

  // 3. Two records assigned: the Assign dialog, review.plateau-assign; the readings follow.
  await page.click('.rv-actions [data-rv-action="plateau-assign"]'); await page.waitForSelector('#rv-plateau-assign-form', {timeout: 8000});
  await page.selectOption('#rv-plateau-assign-form [name=objectId]', 'api'); await page.selectOption('#rv-plateau-assign-form [name=introducedIn]', 'PLT-002');
  await submit('#rv-plateau-assign-form', 'tr[data-assignment="api"]');
  await page.click('.rv-actions [data-rv-action="plateau-assign"]'); await page.waitForSelector('#rv-plateau-assign-form');
  await page.selectOption('#rv-plateau-assign-form [name=objectId]', 'ext-core'); await page.selectOption('#rv-plateau-assign-form [name=introducedIn]', 'PLT-001'); await page.selectOption('#rv-plateau-assign-form [name=retiredIn]', 'PLT-002');
  await submit('#rv-plateau-assign-form', 'tr[data-assignment="ext-core"]');
  const assigned = await page.$$eval('tr[data-assignment]', xs => xs.map(x => [x.dataset.assignment, x.children[1].textContent, x.children[2].textContent]));
  assert.deepEqual(assigned, [['api', 'Next', '—'], ['ext-core', 'As is', 'Next']]);
  const ready = await page.$eval('tr[data-plateau="PLT-002"] .rv-pl-ready', e => e.innerText.replace(/\s+/g, ' ').trim());
  assert.match(ready, /○ 1 to confirm/, 'the readiness of what Next introduces, in words with the glyph'); assert.match(ready, /1 record introduced here · 1 record retired here/);
  assert.match(await page.$eval('tr[data-plateau="PLT-001"] .rv-pl-ready', e => e.innerText), /1 not checked/, 'a party the chapter checks never read is counted, not judged');
  await page.click('.rv-pl-gap[data-gap="PLT-002"] > summary'); await page.waitForSelector('.rv-pl-gap[data-gap="PLT-002"][open]', {timeout: 5000});
  const gap = await page.$eval('.rv-pl-gap[data-gap="PLT-002"]', e => e.innerText.replace(/\s+/g, ' '));
  assert.match(gap, /Gap · As is → Next/); assert.match(gap, /Introduced here LR-001 · Payment API/i); assert.match(gap, /Retired here EXT-002 · Core banking authority/i); assert.match(gap, /No action names this plateau yet/);
  assert.match(await text('.rv-pl-findings'), /Plan how LR-001 arrives/, 'a record introduced in a transition with no action naming it is to confirm');
  assert.equal(await page.evaluate(() => window.aiwReviewPage.assign('api')), true, 'the page offers the Assign dialog for one record (the desk\'s row calls it)'); await page.waitForSelector('#rv-plateau-assign-form', {timeout: 5000});
  assert.deepEqual(await page.$eval('#rv-plateau-assign-form', f => [f.elements.objectId.value, f.elements.introducedIn.value, f.elements.retiredIn.value]), ['api', 'PLT-002', ''], 'the record and its assignment are shown');
  assert.equal(await page.evaluate(() => window.aiwReviewPage.assign('REQ-001')), false, 'a Chapter 1 record is not offered');
  await page.click('.rv-dialog [data-rv-action="close"]'); await page.waitForSelector('#rv-plateau-assign-form', {state: 'detached', timeout: 5000});
  pass('two records assigned through the Assign dialog and the reviewed command; the table reads what Next introduces in the one vocabulary with its glyph, the Gap names what is introduced and retired, the plan\'s checks name the unplanned record, and the page offers the Assign dialog for one record to the desk');

  // 4. An action with its plateau, from the Gap: the action editor's Plateau select.
  assert.ok(await page.$('.rv-pl-gap[data-gap="PLT-002"][open]'), 'the Gap a person opened stays open');
  await page.click('.rv-pl-gap[data-gap="PLT-002"] [data-rv-action="action"]'); await page.waitForSelector('#rv-action-form [name=plateauId]', {timeout: 8000});
  await page.fill('#rv-action-form [name=title]', 'Build the payment API'); await page.fill('#rv-action-form [name=owner]', 'Payments team'); await page.fill('#rv-action-form [name=due]', '2026-11-30'); await page.fill('#rv-action-form [name=acceptance]', 'The API answers in the production design.');
  // rc38+ (rc41 W4): the action's objects are a picker (record-fields.js): found in its own Find box and added with its
  // button; the form's data then carries the object, as the ticked box did.
  { const box = page.locator('#rv-action-form [data-pick]').filter({has: page.locator('[name="objectIds"]')}); await box.locator('[data-pick-find]').fill('api'); await box.locator('[data-pick-add="api"]').click();
    assert.ok(await page.$eval('#rv-action-form', f => new FormData(f).getAll('objectIds').flatMap(v => String(v).split(/,\s*/)).includes('api')), 'the action names the Payment API'); }
  await page.selectOption('#rv-action-form [name=plateauId]', 'PLT-002');
  await page.click('#rv-action-form button[type=submit]'); await page.waitForSelector('#rv-action-form', {state: 'detached', timeout: 10000});
  await page.click('li.work-stage[data-work-stage="plateaus"] button[data-rv-action="stage"][data-rv-stage="plateaus"]'); await page.waitForSelector('.rv-pl-gap[data-gap="PLT-002"][open]', {timeout: 8000});
  assert.equal(await page.$eval('tr[data-plateau="PLT-002"] td:nth-child(5)', e => e.textContent.trim()), '1', 'Next counts its action');
  assert.match(await page.$eval('.rv-pl-gap[data-gap="PLT-002"]', e => e.innerText.replace(/\s+/g, ' ')), /RA-001 · Build the payment API Planned · Payments team · due 2026-11-30/);
  const findings = await text('.rv-pl-findings');
  assert.doesNotMatch(findings, /towards Next|LR-001 arrives/, 'the action settles the transition\'s and the record\'s checks'); assert.match(findings, /Plan the work towards Target/);
  pass('an action with its plateau from the Gap, through the action editor\'s Plateau select; Next counts it, the Gap lists it with its state, and the plan\'s checks for the transition and the record are settled');

  // 5. On Validate: the plan's checks among Chapter 11's final checks, to confirm, with Open leading back to the stage.
  // rc38+ (rc41 W4): Chapter 11's final checks are the validation workspace's queue ("Final review checks" set): an item
  // per check (data-validation-select="final:<id>"), its kind in words ("Review item" is to confirm, "Content gap" to
  // fix), its title; the selected check's detail carries the chapter's own Open remedy (data-rv-action="fix", data-rv-id).
  await page.goto(base + '/?chapter=11&tab=validate', {waitUntil: 'networkidle'}); await page.waitForSelector('.validation-workspace [data-validation-set="final"][aria-pressed="true"]', {timeout: 10000});
  const row = await page.$$eval('.validation-queue .validation-item[data-validation-select^="final:"]', xs => xs.map(x => [x.querySelector('.validation-item-meta span').textContent, x.querySelector('b').textContent, x.dataset.validationSelect]).filter(([, , id]) => id.includes('ROADMAP')));
  assert.deepEqual(row, [['Review item', 'Plan the work towards Target', 'final:ROADMAP-NO-ACTION:PLT-003']], 'one check left, to confirm');
  await page.click('.validation-queue .validation-item[data-validation-select="final:ROADMAP-NO-ACTION:PLT-003"]');
  await page.click('.validation-detail [data-rv-action="fix"][data-rv-id="ROADMAP-NO-ACTION:PLT-003"]'); await page.waitForSelector('.rv-plateaus-head', {timeout: 8000});
  assert.ok(await page.$('.rv-pl-table tr[data-plateau="PLT-003"]'), 'Open leads to the Plateaus stage');
  pass('Validate lists the plan\'s remaining check among the final checks as to confirm, and its Open leads back to the Plateaus stage');

  // 6. Phone width: the stage at 390 px, the page no wider than the viewport, no text under 12 px.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}), pp = await phone.newPage();
  pp.on('pageerror', e => errors.push(e.message));
  await pp.goto(base + '/?chapter=11&tab=work', {waitUntil: 'networkidle'}); await pp.waitForSelector('li.work-stage[data-work-stage="plateaus"] button[data-rv-action="stage"][data-rv-stage="plateaus"]', {timeout: 10000}); await pp.click('li.work-stage[data-work-stage="plateaus"] button[data-rv-action="stage"][data-rv-stage="plateaus"]'); await pp.waitForSelector('.rv-pl-table', {timeout: 8000});
  const m = await pp.evaluate(() => ({scroll: document.documentElement.scrollWidth, inner: window.innerWidth, small: [...document.querySelectorAll('.rv-plateaus *, .rv-pl-gap *, .rv-pl-findings *, .rv-plateaus-head *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).length, rows: document.querySelectorAll('.rv-pl-table tr[data-plateau]').length}));
  assert.ok(m.scroll <= m.inner, 'the page is no wider than the phone: ' + m.scroll + ' vs ' + m.inner); assert.equal(m.small, 0, 'no text under 12 px'); assert.equal(m.rows, 3);
  await pp.click('.rv-pl-gap[data-gap="PLT-002"] summary'); await pp.waitForTimeout(200);
  assert.ok((await pp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)), 'the Gap open keeps the page within the phone');
  await phone.close();
  pass('at 390 px the stage shows the three plateaus and the Gap without widening the page and without text under 12 px');

  assert.deepEqual(errors, [], 'no page errors');
  console.log(JSON.stringify({suite: 'Roadmap in the browser', passed: checks.length, checks, limits: ['A scratch copy of the bank reference on an isolated server; nothing here approves a plateau or establishes a transition.']}, null, 2));
} finally {
  await browser.close(); server.kill('SIGKILL');
  for (const f of [db, db + '-wal', db + '-shm']) try { rmSync(f, {force: true}); } catch { /* nothing to remove */ }
}
