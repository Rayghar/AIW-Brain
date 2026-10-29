// The studio editors' save flow in a real browser (audit F2-01, F2-02, F2-10, F2-12, F2-24). An ordinary
// change to a saved record is reviewed inside the editor that proposed it: one dialog, the top bar never
// says "Saving" while a person reads the preview, "Back to editing" returns the form with its status
// untouched, Escape does the same; applying saves and rebuilds the page, after which focus is back on the
// control that opened the editor; cancelling returns focus too; an invalid field is announced inline, not
// by a browser bubble; everything outside an open dialog is inert; two saves in a row are queued, not
// raced into a conflict; a tab that is behind refuses to save and offers the latest project.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally
// AIW_BROWSER_EXECUTABLE. Starts an isolated local server on a free port. Run: npm run test:studio-dialog-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/studio-dialog-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
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
  // The top bar's save status holds a full and a compact phone label, and its accessible name is the full status
  // (round 19, audit/round19/ROUND19-RELEASE.md). At this desktop width the full words are the ones shown (a save's
  // running seconds aside), and they must be the status announced.
  const saveState = async () => {
    const status = await page.$eval('.save-state', e => ({announced: e.getAttribute('aria-label'), shown: e.innerText.replace(/ [\d,]+ s$/, '').trim()}));
    assert.equal(status.shown, status.announced, 'the top bar shows the status it announces');
    return status.announced;
  };
  const openDialogs = () => page.$$eval('dialog[open]', es => es.map(e => e.className));
  const active = () => page.evaluate(() => { const a = document.activeElement; return {tag: a?.tagName, action: a?.dataset?.lAction || a?.dataset?.tAction || '', id: a?.dataset?.lId || a?.dataset?.tId || '', name: a?.getAttribute?.('name') || '', inDialog: !!a?.closest?.('dialog')}; });

  // The open editor's named controls against the descriptors of its record type (record-fields.js, F2-11).
  const vocabulary = () => page.evaluate(async () => { const {FORM_IDS, formFieldsMatch} = await import('/record-fields.js'); const form = document.querySelector('dialog[open] form'); const command = Object.entries(FORM_IDS).find(([, id]) => id === form.id)?.[0]; return {form: form.id, command, ...(command ? formFieldsMatch(command, [...form.elements].map(e => e.name).filter(Boolean)) : {})}; });
  const describedForms = [];
  const expectVocabulary = async (label) => { const v = await vocabulary(); assert.ok(v.command, label + ': form ' + v.form + ' has a record type in FORM_IDS'); assert.deepEqual({undescribed: v.undescribed, missing: v.missing}, {undescribed: [], missing: []}, label + ': ' + v.form + ' speaks the ' + v.command + ' vocabulary'); describedForms.push(v.form); };

  // Chapter 4: edit a group through the in-editor review.
  await page.goto(base + '/?chapter=4&tab=work', {waitUntil: 'networkidle'});
  await page.waitForSelector('.work-view .l-record');
  const opener = page.locator('[data-l-action="edit-group"]').first();
  const groupId = await opener.getAttribute('data-l-id');
  await opener.focus(); await opener.click();
  await page.waitForSelector('dialog.logical-dialog[open] #l-group-form');
  assert.equal(await page.$eval('#app', e => e.hasAttribute('inert')), true, 'the page behind the dialog is inert');
  assert.equal(await page.$eval('dialog[open] form', f => f.noValidate), true, 'the form validates programmatically');
  await expectVocabulary('chapter 4 group');
  const title = await page.inputValue('dialog[open] [name="title"]');
  await page.fill('dialog[open] [name="title"]', title + ' · reviewed');
  await page.click('dialog[open] #l-group-form button[type="submit"]');
  await page.waitForSelector('dialog[open] [data-dialog-review] [data-reviewed]');
  assert.deepEqual(await openDialogs(), ['dialog l-dialog logical-dialog'], 'one dialog: the review is inside the editor');
  assert.equal(await page.$eval('dialog[open]', d => d.dataset.busy), 'review');
  assert.equal(await page.$eval('dialog[open] [data-dialog-status]', e => e.textContent), 'Awaiting your review');
  assert.equal(await page.$eval('dialog[open] #l-group-form', f => f.hidden), true, 'the form steps aside for the preview');
  assert.notEqual(await saveState(), 'Saving…', 'the top bar never says Saving while a person reviews');
  assert.match(await page.$eval('dialog[open] [data-dialog-review]', e => e.innerText), /Review this design change[\s\S]*\nTitle\nBEFORE\n[^\n]+\nAFTER\n[^\n]+\n[\s\S]*I reviewed the changed definition/);
  pass('An ordinary edit opens its review inside the editor: one dialog, "Awaiting your review", no "Saving…"');

  // Back to editing restores the form, its values and its focus; the status is untouched. Escape does the same.
  await page.click('dialog[open] [data-wb-action="back-to-editing"]');
  await page.waitForSelector('dialog[open] #l-group-form:not([hidden])');
  assert.equal(await page.$$eval('dialog[open] [data-dialog-review]', es => es.length), 0);
  assert.equal(await page.inputValue('dialog[open] [name="title"]'), title + ' · reviewed', 'the edited value is kept');
  assert.equal(await page.$eval('dialog[open]', d => d.dataset.busy), '');
  assert.equal(await page.$eval('dialog[open] #l-group-form button[type="submit"]', b => b.disabled), false);
  assert.equal((await active()).tag, 'BUTTON'); assert.equal((await active()).inDialog, true);
  assert.equal(await saveState(), 'Saved to your private project', 'going back is not reported as a failed save');
  assert.equal(await page.$eval('dialog[open] #l-error', e => e.hidden), true, 'no error is shown for going back');
  await page.click('dialog[open] #l-group-form button[type="submit"]');
  await page.waitForSelector('dialog[open] [data-dialog-review] [data-reviewed]');
  await page.keyboard.press('Escape');
  await page.waitForSelector('dialog[open] #l-group-form:not([hidden])');
  assert.deepEqual(await openDialogs(), ['dialog l-dialog logical-dialog'], 'Escape during the review returns to editing, not out of the editor');
  // Escape with focus outside the preview (on the editor's close control) also means "back to editing".
  await page.click('dialog[open] #l-group-form button[type="submit"]');
  await page.waitForSelector('dialog[open] [data-dialog-review] [data-reviewed]');
  await page.focus('dialog[open] header [data-l-action="close"]');
  await page.keyboard.press('Escape');
  await page.waitForSelector('dialog[open] #l-group-form:not([hidden])');
  assert.equal(await page.$eval('dialog[open] .l-discard', e => e.hidden), true, 'no discard prompt: the review simply gave way to the form');
  assert.deepEqual(await openDialogs(), ['dialog l-dialog logical-dialog']);
  pass('"Back to editing" and Escape restore the form with its values, focus and an untouched status');

  // Applying without the acknowledgement is an inline message; applying with it saves, rebuilds the page and
  // returns focus to the "Edit group" button for that group (re-found after the render).
  await page.click('dialog[open] #l-group-form button[type="submit"]');
  await page.waitForSelector('dialog[open] [data-dialog-review] [data-reviewed]');
  await page.click('dialog[open] [data-wb-action="apply-preview"]');
  assert.equal(await page.$eval('dialog[open] [data-dialog-review] [data-error]', e => e.hidden ? '' : e.textContent), 'Review the changed definition before applying.');
  assert.deepEqual(await openDialogs(), ['dialog l-dialog logical-dialog']);
  await page.check('dialog[open] [data-reviewed]');
  await page.fill('dialog[open] [data-dialog-review] [name="reason"]', 'Browser check of the in-editor review');
  await page.click('dialog[open] [data-wb-action="apply-preview"]');
  await page.waitForFunction(() => !document.querySelector('dialog[open]') && document.querySelector('.save-state')?.textContent.includes('Saved'));
  const after = await active();
  assert.deepEqual(after, {tag: 'BUTTON', action: 'edit-group', id: groupId, name: '', inDialog: false}, 'focus returned to the opener after the re-render: ' + JSON.stringify(after));
  assert.equal(await page.evaluate(id => window.aiwProjectStore.value.document.logical.groups.find(g => g.id === id).title, groupId), title + ' · reviewed');
  assert.equal(await page.$eval('#app', e => e.hasAttribute('inert')), false, 'the page is live again');
  pass('Apply saves through the reviewed command, rebuilds the page and returns focus to the opener');

  // Cancelling an editor returns focus to its opener; a new record saves without a review and focus lands on its row.
  const newButton = page.locator('.work-view [data-l-action="new"]');
  await newButton.focus(); await newButton.click();
  await page.waitForSelector('dialog[open] #l-responsibility-form');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  assert.deepEqual(await active(), {tag: 'BUTTON', action: 'new', id: '', name: '', inDialog: false});
  pass('Cancelling an editor returns focus to the control that opened it');

  // A required field left empty is announced inline, next to the field, not by a browser bubble; the wizard
  // opens the step that holds it.
  await newButton.click();
  await page.waitForSelector('dialog[open] #l-responsibility-form');
  await expectVocabulary('chapter 4 responsibility');
  await page.click('dialog[open] [data-l-action="step"][data-l-step="2"]');
  assert.equal(await page.$eval('dialog[open] [data-l-panel="0"]', e => e.hidden), false, 'an empty required name keeps the first step open');
  assert.equal(await page.$eval('dialog[open] [name="title"]', e => e.getAttribute('aria-invalid')), 'true');
  assert.match(await page.$eval('dialog[open] [name="title"]', e => document.getElementById(e.getAttribute('aria-describedby')).textContent), /fill/i);
  assert.equal((await active()).name, 'title', 'the invalid field takes focus');
  await page.fill('dialog[open] [name="title"]', 'Queued enquiry ownership');
  await page.click('dialog[open] [data-l-action="step"][data-l-step="2"]');
  assert.equal(await page.$eval('dialog[open] [data-l-panel="2"]', e => e.hidden), false, 'a valid step lets the wizard move on');
  await page.click('dialog[open] [data-l-action="step"][data-l-step="0"]');
  await page.fill('dialog[open] [name="title"]', '');
  await page.click('dialog[open] #l-responsibility-form button[type="submit"]');
  assert.deepEqual(await openDialogs(), ['dialog l-dialog logical-dialog'], 'an invalid submit stays in the editor');
  assert.equal(await page.$eval('dialog[open] [name="title"]', e => e.getAttribute('aria-invalid')), 'true');
  await page.fill('dialog[open] [name="title"]', 'Queued enquiry ownership');
  await page.fill('dialog[open] [name="purpose"]', 'Owns enquiries about queued instructions.');
  await page.click('dialog[open] #l-responsibility-form button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('dialog[open]') && document.querySelector('.save-state')?.textContent.includes('Saved'));
  const created = await page.evaluate(() => window.aiwProjectStore.value.document.logical.responsibilities.at(-1));
  assert.equal(created.title, 'Queued enquiry ownership');
  assert.deepEqual(await active(), {tag: 'BUTTON', action: 'new', id: '', name: '', inDialog: false}, 'focus returned to "New responsibility", re-found after the render');
  assert.equal(await page.$$eval('.work-view .l-record', es => es.length), await page.evaluate(() => window.aiwProjectStore.value.document.logical.responsibilities.length), 'the new record is listed');
  pass('Invalid fields are announced inline and keep their step open; a new record saves without a review and focus returns to its opener');

  // Every chapter studio opens its editors through the same primitive: one dialog, the page behind inert, the
  // form validated programmatically, Escape (with no change made) closing it with focus back on its opener.
  const openers = [[5, '[data-a-action="edit"][data-a-id]', 'aId'], [6, '[data-t-action="needs"][data-t-id]', 'tId'], [7, '[data-tr-action="edit-plan"][data-tr-id]', 'trId'], [8, '[data-i-action="edit-contract"][data-i-id]', 'iId'], [9, '[data-sec-action="edit-threat"]', ''], [10, '[data-rt-action="placement"][data-rt-id]', 'rtId'],
    // Round 12 (D2): the runtime plan editor, with its targets, windows and the requirements it answers.
    [10, '[data-rt-action="edit-plan"]', ''], [11, '[data-rv-action="intake"]', '']];
  for (const [chapter, selector, idKey] of openers) {
    await page.goto(base + '/?chapter=' + chapter + '&tab=work', {waitUntil: 'networkidle'});
    const button = page.locator(selector).filter({visible: true}).first();
    await button.waitFor();
    const want = await button.evaluate((b, key) => ({tag: b.tagName, text: b.textContent.trim(), id: key ? b.dataset[key] : ''}), idKey);
    await button.focus(); await button.click();
    await page.waitForSelector('dialog[open] form');
    assert.equal((await openDialogs()).length, 1, 'chapter ' + chapter + ': one dialog');
    assert.equal(await page.$eval('#app', e => e.hasAttribute('inert')), true, 'chapter ' + chapter + ': the page behind is inert');
    assert.equal(await page.$eval('dialog[open] form', f => f.noValidate), true, 'chapter ' + chapter + ': programmatic validation');
    assert.equal(await page.evaluate(() => !!document.activeElement?.closest('dialog[open]')), true, 'chapter ' + chapter + ': focus moved into the dialog');
    if (chapter < 11) await expectVocabulary('chapter ' + chapter);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    const back = await page.evaluate(key => { const a = document.activeElement; return {tag: a?.tagName, text: a?.textContent.trim(), id: key ? a?.dataset?.[key] : ''}; }, idKey);
    assert.deepEqual(back, want, 'chapter ' + chapter + ': focus returned to the opener ' + JSON.stringify({back, want}));
  }
  pass('Chapters 5–11 open their editors through the shared dialog: one dialog, inert page, programmatic validation, focus returned on Escape; the forms ' + describedForms.join(', ') + ' match their record descriptors');

  // Chapters 1–3 (round 11): the same primitive, the same gate. The brief, the scenario and the design question.
  // Round 12: Chapter 1's requirement group editor too.
  for (const [chapter, before, selector] of [[1, null, '[data-r-action="edit-brief"]'], [1, '[data-r-section="requirement"]', '[data-r-action="new-group"]'], [2, '[data-q-section="scenarios"]', '[data-q-action="add"]'], [3, null, '[data-d-action="edit-question"]']]) {
    await page.goto(base + '/?chapter=' + chapter + '&tab=work', {waitUntil: 'networkidle'});
    if (before) await page.locator(before).first().click();
    const button = page.locator(selector).filter({visible: true}).first();
    await button.waitFor();
    const want = await button.evaluate(b => ({tag: b.tagName, text: b.textContent.trim()}));
    await button.focus(); await button.click();
    await page.waitForSelector('dialog[open] form');
    assert.equal((await openDialogs()).length, 1, 'chapter ' + chapter + ': one dialog');
    assert.equal(await page.$eval('#app', e => e.hasAttribute('inert')), true, 'chapter ' + chapter + ': the page behind is inert');
    assert.equal(await page.$eval('dialog[open] form', f => f.noValidate), true, 'chapter ' + chapter + ': programmatic validation');
    assert.match(await page.$eval('dialog[open]', d => d.className), /\bl-dialog\b/, 'chapter ' + chapter + ': the shared dialog family');
    assert.equal(await page.evaluate(() => !!document.activeElement?.closest('dialog[open]')), true, 'chapter ' + chapter + ': focus moved into the dialog');
    await expectVocabulary('chapter ' + chapter);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    const back = await page.evaluate(() => { const a = document.activeElement; return {tag: a?.tagName, text: a?.textContent.trim()}; });
    assert.deepEqual(back, want, 'chapter ' + chapter + ': focus returned to the opener ' + JSON.stringify({back, want}));
  }
  pass('Chapters 1–3 open their editors through the shared dialog too, with the page inert, programmatic validation and focus returned; the brief, scenario and design-question forms match their record descriptors');

  // Chapter 9 and Chapter 10 save an ordinary change through the in-editor review and return focus to the opener.
  for (const [chapter, selector, idKey, field] of [[9, '[data-sec-action="edit-threat"]', '', 'title'], [10, '[data-rt-action="placement"][data-rt-id]', 'rtId', 'basis']]) {
    await page.goto(base + '/?chapter=' + chapter + '&tab=work', {waitUntil: 'networkidle'});
    const button = page.locator(selector).filter({visible: true}).first();
    const want = await button.evaluate((b, key) => ({tag: b.tagName, text: b.textContent.trim(), id: key ? b.dataset[key] : ''}), idKey);
    await button.focus(); await button.click();
    await page.waitForSelector('dialog[open] form [name="' + field + '"]');
    const value = await page.inputValue('dialog[open] form [name="' + field + '"]');
    await page.fill('dialog[open] form [name="' + field + '"]', value + ' (reviewed)');
    await page.locator('dialog[open] form button[type="submit"]').filter({visible: true}).first().click();
    await page.waitForSelector('dialog[open] [data-dialog-review] [data-reviewed]');
    assert.equal((await openDialogs()).length, 1, 'chapter ' + chapter + ': the review is inside the editor');
    assert.equal(await page.$eval('dialog[open] [data-dialog-status]', e => e.textContent), 'Awaiting your review');
    assert.notEqual(await saveState(), 'Saving…');
    await page.check('dialog[open] [data-reviewed]');
    await page.click('dialog[open] [data-wb-action="apply-preview"]');
    await page.waitForFunction(() => !document.querySelector('dialog[open]') && document.querySelector('.save-state')?.textContent.includes('Saved'));
    const back = await page.evaluate(key => { const a = document.activeElement; return {tag: a?.tagName, text: a?.textContent.trim(), id: key ? a?.dataset?.[key] : ''}; }, idKey);
    assert.deepEqual(back, want, 'chapter ' + chapter + ': focus returned to the opener after the save ' + JSON.stringify({back, want}));
  }
  pass('Chapters 9 and 10 save an ordinary change through the in-editor review and return focus to the opener');

  // Two commands in a row are queued, not raced: both save, the second with the revision the first produced.
  await page.goto(base + '/?chapter=4&tab=work', {waitUntil: 'networkidle'});
  const queued = await page.evaluate(async () => {
    delete window.aiwReviewOrdinaryChange;
    const before = window.aiwProjectStore.value.revision;
    const make = i => window.aiwProjectStore.command({type: 'logical.group', payload: {title: 'Queued group ' + i, purpose: 'Queue check ' + i}});
    const results = await Promise.all([make(1), make(2)]);
    return {before, revisions: results.map(r => r.revision), titles: window.aiwProjectStore.value.document.logical.groups.slice(-2).map(g => g.title)};
  });
  assert.deepEqual(queued.revisions, [queued.before + 1, queued.before + 2], 'the second command carried the first save\'s revision: ' + JSON.stringify(queued));
  assert.deepEqual(queued.titles, ['Queued group 1', 'Queued group 2']);
  pass('Two commands in flight are queued and both save in order');

  // A tab that is told it is behind refuses to save, says so, and offers the latest project.
  const other = await ctx.newPage();
  other.on('pageerror', e => errors.push(e.message));
  await other.goto(base + '/?chapter=4&tab=work', {waitUntil: 'networkidle'});
  await other.evaluate(async () => { delete window.aiwReviewOrdinaryChange; await window.aiwProjectStore.command({type: 'logical.group', payload: {title: 'Group from another tab', purpose: 'Behind check'}}); });
  await page.locator('[data-load-latest]').waitFor();
  assert.equal(await page.evaluate(() => window.aiwProjectStore.status), 'behind');
  const refused = await page.evaluate(async () => { try { await window.aiwProjectStore.command({type: 'logical.group', payload: {title: 'Stale save', purpose: 'Must be refused'}}); return null; } catch (e) { return {message: e.message, conflict: e.conflict === true, revision: window.aiwProjectStore.value.revision}; } });
  assert.match(refused.message, /newer version .* another tab/);
  assert.equal(refused.conflict, true);
  await page.locator('[data-load-latest]').click();
  await page.locator('.save-state', {hasText: 'Saved to your private project'}).waitFor();
  assert(await page.evaluate(() => window.aiwProjectStore.value.revision) > refused.revision);
  assert.equal(await page.evaluate(() => window.aiwProjectStore.value.document.logical.groups.some(g => g.title === 'Stale save')), false, 'the refused change was not sent');
  await other.close();
  pass('A tab that is behind refuses to save with a clear message and loads the latest project on request');

  // Added by the hygiene workstream (round 2, R2-G: U2-16, U2-25, U2-32, U2-33). A dialog focuses its first field (or,
  // without one, its first control), never the "×"; Chapter 11's previews say they open a new tab, its downloads sit
  // under one menu, the project export is named as one, the empty baseline select is not shown, and the freeze dialog
  // lists what freezing needs, with Freeze disabled and its reason while the review checks are not current.
  {
    const p2 = await ctx.newPage(); p2.setDefaultTimeout(10000); p2.on('pageerror', e => errors.push(e.message));
    const act = (attr, action) => p2.evaluate(([attr, action]) => { const b = document.createElement('button'); b.type = 'button'; b.hidden = true; b.setAttribute(attr, action); document.body.append(b); b.click(); b.remove(); }, [attr, action]);
    const focus = () => p2.evaluate(() => { const a = document.activeElement; return {inDialog: !!a?.closest('dialog[open]'), close: a?.getAttribute('aria-label') === 'Close dialog', name: a?.getAttribute('name') || '', tag: a?.tagName}; });
    for (const [chapter, attr, action, field] of [[4, 'data-l-action', 'intake', ''], [8, 'data-i-action', 'party', 'title'], [10, 'data-rt-action', 'new-environment', 'title'], [11, 'data-rv-action', 'baseline', 'title']]) {
      await p2.goto(base + '/?chapter=' + chapter + '&tab=work', {waitUntil: 'networkidle'});
      await act(attr, action);
      await p2.waitForSelector('dialog[open]');
      await p2.waitForFunction(() => !!document.activeElement?.closest('dialog[open]'));
      const f = await focus();
      assert.equal(f.close, false, 'chapter ' + chapter + ' ' + action + ': focus is not on the close button');
      if (field) assert.equal(f.name, field, 'chapter ' + chapter + ' ' + action + ': the first field takes focus');
      if (chapter === 11) {
        const freeze = await p2.$eval('dialog[open]', d => ({items: [...d.querySelectorAll('.rv-preconditions li')].map(li => li.textContent.trim()), submit: d.querySelector('#rv-baseline-form button[type="submit"]')?.disabled, reason: d.querySelector('#' + d.querySelector('#rv-baseline-form button[type="submit"]')?.getAttribute('aria-describedby'))?.textContent || '', checks: !!d.querySelector('[data-rv-action="checks"]')}));
        assert.equal(freeze.items.length, 3, 'the preconditions are listed');
        assert.match(freeze.items[0], /review checks are not current/);
        assert.deepEqual([freeze.submit, freeze.checks], [true, true], 'Freeze is disabled until the checks are current; Run checks is offered');
        assert.match(freeze.reason, /available once the review checks are current/);
      }
      await p2.keyboard.press('Escape');
      await p2.waitForFunction(() => !document.querySelector('dialog[open]'));
    }
    await p2.goto(base + '/?chapter=11&tab=output', {waitUntil: 'networkidle'});
    // rc41 close: the owner's rc38 output workspace ([data-output-workspace="<project>:11"]) holds the working SDD's export
    // form (as sdd-documents-browser reads it); the preview is the document's own link beside the form, which says and
    // does open a new tab, and the form carries no second new-tab preview.
    const OUT = '[data-output-workspace$=":11"]';
    await p2.waitForSelector(OUT + ' form.rv-export-form');
    // The working SDD's export form (round 5, Contract E): the edition and the audience, then Preview, and one menu of downloads.
    const out = await p2.$eval(OUT, o => ({selects: [...o.querySelectorAll('form.rv-export-form select')].map(s => s.name + '=' + s.value), previews: [...o.querySelectorAll('[data-output-document-view] a[data-output-open]')].map(a => [a.textContent.trim(), a.getAttribute('target'), new URL(a.href).searchParams.get('view')]), formPreviews: o.querySelectorAll('form.rv-export-form [formtarget="_blank"]').length, menu: [...o.querySelectorAll('form.rv-export-form .rv-export-menu .rv-export-list button')].map(b => b.textContent.trim()), select: !!document.querySelector('[name="rvBaseline"]'), baselines: !!document.querySelector('.rv-baseline-card')}));
    // Round 12 (F): the architecture edition replaces the full edition (SDD-SPEC) and is the default.
    assert.deepEqual(out.selects, ['edition=architecture', 'audience=all'], 'the architecture edition for everyone by default');
    assert.deepEqual([out.previews, out.formPreviews], [[['Open preview in new tab', '_blank', '1']], 0], 'one preview, which says it opens a new tab and does');
    assert.deepEqual(out.menu, ['Markdown', 'Markdown with Mermaid figures', 'HTML', 'JSON', 'Word (.docx)', 'PDF'], 'the downloads sit under one menu');
    if (!out.baselines) assert.equal(out.select, false, 'no empty baseline select');
    await p2.close();
    pass('Dialogs focus their first field, not the close button (Chapters 4, 8, 10, 11); Chapter 11 offers the edition and the audience, its preview says it opens a new tab, downloads sit under one menu, and Freeze lists its preconditions and stays disabled with its reason until the checks are current');
  }

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`\n${checks.length} checks passed.`);
} catch (e) {
  console.error('FAIL', e.message); if (errors.length) console.error('page errors:', errors); process.exitCode = 1;
} finally {
  await browser.close(); server.kill('SIGKILL');
  try { rmSync(db, {force: true}); rmSync(db + '-wal', {force: true}); rmSync(db + '-shm', {force: true}); } catch { /* left for the next run to overwrite */ }
}
