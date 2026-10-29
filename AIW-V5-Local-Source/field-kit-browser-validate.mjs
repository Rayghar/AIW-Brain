// The field kit in a real browser (round 11, workstream E): the editors of Chapters 1, 2, 3, 5 and 9 draw every field
// from its descriptor (record-fields.js) through the shared dialog (dialog.js). Every control has an accessible name;
// a required control carries aria-required and the visible marker; a field's help describes it; an invalid field is
// announced beside itself (aria-invalid, aria-describedby to the message) and keeps its step open; the help is the
// description again once the field is valid; Escape returns focus to the opener; the owner field offers the
// stakeholders of Chapter 1 and keeps free text; a decision offers Chapter 1's assumption records; an alternative's
// pattern offers the catalogue once it has loaded; status words wear one chip across the chapters. Each editor is
// held to its record type's descriptors (formFieldsMatch).
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally
// AIW_BROWSER_EXECUTABLE. Starts an isolated local server on a free port. Run: npm run test:field-kit-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/field-kit-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } });
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
  const dialog = 'dialog[open]';
  // What the open editor's controls look like to assistive technology.
  const audit = () => page.evaluate(() => {
    const d = document.querySelector('dialog[open]'), form = d.querySelector('form');
    const controls = [...form.querySelectorAll('input:not([type=hidden]),select,textarea')];
    const nameOf = c => {
      if (c.getAttribute('aria-label')) return c.getAttribute('aria-label');
      const by = c.getAttribute('aria-labelledby'); if (by) return [...by.split(/\s+/)].map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
      const label = c.closest('label'); if (label) return (label.querySelector(':scope > span')?.textContent || label.textContent).trim();
      return '';
    };
    const marker = c => { const label = c.closest('label'); if (!label) return ''; const target = c.type === 'checkbox' ? label : label.querySelector(':scope > span'); return target ? getComputedStyle(target, '::after').content : ''; };
    return {
      form: form.id, dialog: d.className,
      classes: [...form.querySelectorAll('label')].map(l => l.className).filter(c => c && !c.startsWith('l-')),
      unnamed: controls.filter(c => !nameOf(c)).map(c => c.name),
      required: controls.filter(c => c.required).map(c => ({name: c.name, ariaRequired: c.getAttribute('aria-required'), marker: marker(c)})),
      described: controls.filter(c => c.getAttribute('aria-describedby')).map(c => ({name: c.name, text: (document.getElementById(c.getAttribute('aria-describedby'))?.textContent || '').trim(), help: !!document.getElementById(c.getAttribute('aria-describedby'))?.classList.contains('field-help')})),
      helps: form.querySelectorAll('.field-help').length,
      steps: !!form.querySelector('.l-steps'),
      legacy: d.querySelectorAll('.r-field,.r-checkbox,.d-choices,.q-choices,.brain-field,.r-badge,.d-status,.l-badge').length,
    };
  });
  const vocabulary = () => page.evaluate(async () => { const {FORM_IDS, formFieldsMatch} = await import('/record-fields.js'); const form = document.querySelector('dialog[open] form'); const command = Object.entries(FORM_IDS).find(([, id]) => id === form.id)?.[0]; return {form: form.id, command, ...(command ? formFieldsMatch(command, [...form.elements].map(e => e.name).filter(Boolean)) : {})}; });
  const invalid = name => page.$eval(`dialog[open] [name="${name}"]`, c => ({invalid: c.getAttribute('aria-invalid'), message: (document.getElementById(c.getAttribute('aria-describedby') || '')?.textContent || '').trim(), isMessage: !!document.getElementById(c.getAttribute('aria-describedby') || '')?.classList.contains('field-message'), inLabel: !!c.closest('label')?.querySelector(':scope > .field-message')}));
  const activeIs = async (selector) => page.evaluate(sel => document.activeElement === document.querySelector(sel) || document.activeElement?.matches?.(sel), selector);

  const editors = [
    {chapter: 1, before: '[data-r-section="requirement"]', open: '[data-r-action="add"]', form: 'r-artefact-form', command: 'artefact', step: null, title: 'title'},
    // Round 12: the requirement group editor, drawn by the same kit (a rule of up to four rows, each a per-item pair).
    {chapter: 1, before: '[data-r-section="requirement"]', open: '[data-r-action="new-group"]', form: 'r-group-form', command: 'requirements.group', step: null, title: 'title'},
    {chapter: 2, before: '[data-q-section="scenarios"]', open: '[data-q-action="add"]', form: 'q-driver-form', command: 'quality.driver', step: '[data-q-form-step="2"]', panel: 'data-q-panel', title: 'title'},
    {chapter: 3, before: null, open: '[data-d-action="edit-question"]', form: 'd-question-form', command: 'decision.save', step: '[data-d-step="2"]', panel: 'data-d-panel', title: 'question'},
    {chapter: 5, before: null, open: '[data-a-action="edit"][data-a-id]', form: 'a-component-form', command: 'realisation.component', step: '[data-a-step="2"]', panel: 'data-a-panel', title: 'title'},
    {chapter: 9, before: null, open: '[data-sec-action="edit-threat"]', form: 'sec-editor', command: 'security.threat', step: '[data-sec-step="2"]', panel: 'data-sec-panel', title: 'title'},
    // Round 12 (D2): the runtime plan editor, whose targets and windows are rows of per-item fields.
    {chapter: 10, before: null, open: '[data-rt-action="edit-plan"]', form: 'rt-editor', command: 'runtime.plan', step: '[data-rt-step="2"]', panel: 'data-rt-panel', title: 'title'},
  ];
  for (const e of editors) {
    await page.goto(base + '/?chapter=' + e.chapter + '&tab=work', {waitUntil: 'networkidle'});
    if (e.before) await page.locator(e.before).first().click();
    const opener = page.locator(e.open).filter({visible: true}).first();
    await opener.waitFor();
    await opener.focus(); await opener.click();
    await page.waitForSelector(`${dialog} #${e.form}`);
    const label = 'chapter ' + e.chapter + ' ' + e.form;
    assert.equal(await page.$$eval('dialog[open]', es => es.length), 1, label + ': one dialog');
    assert.equal(await page.$eval('#app', el => el.hasAttribute('inert')), true, label + ': the page behind is inert');
    assert.equal(await page.$eval('dialog[open] form', f => f.noValidate), true, label + ': programmatic validation');
    assert.match(await page.$eval('dialog[open]', d => d.className), /\bl-dialog\b/, label + ': the shared dialog family');
    const v = await vocabulary();
    assert.equal(v.command, e.command, label + ': the form has its record type');
    assert.deepEqual({undescribed: v.undescribed, missing: v.missing}, {undescribed: [], missing: []}, label + ': the form speaks the ' + e.command + ' vocabulary');
    const a = await audit();
    assert.deepEqual(a.unnamed, [], label + ': every control has an accessible name');
    assert.deepEqual(a.classes, [], label + ': every field wears the kit\'s classes');
    assert.equal(a.legacy, 0, label + ': no private field or badge family remains');
    assert.ok(a.required.length >= 1, label + ': the editor has a required field');
    for (const r of a.required) { assert.equal(r.ariaRequired, 'true', label + ': ' + r.name + ' carries aria-required'); assert.match(r.marker, /\*/, label + ': ' + r.name + ' shows the visible marker (' + r.marker + ')'); }
    assert.ok(a.helps >= 1, label + ': fields carry their help');
    assert.ok(a.described.length >= 1 && a.described.every(d => d.text && d.help), label + ': a field with help is described by it: ' + JSON.stringify(a.described.slice(0, 2)));
    if (e.step) assert.equal(a.steps, true, label + ': the step structure');
    // An empty required field: announced beside itself, its step kept open; valid again, described by its help.
    await page.fill(`${dialog} [name="${e.title}"]`, '');
    if (e.step) { await page.click(`${dialog} ${e.step}`); assert.equal(await page.$eval(`${dialog} [${e.panel}="0"]`, p => p.hidden), false, label + ': an empty required field keeps its step open'); }
    else await page.click(`${dialog} #${e.form} button[type="submit"]`);
    const bad = await invalid(e.title);
    assert.equal(bad.invalid, 'true', label + ': the empty field is aria-invalid');
    assert.ok(bad.isMessage && bad.inLabel && /fill/i.test(bad.message), label + ': the message sits beside the field and describes it: ' + bad.message);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('name')), e.title, label + ': the invalid field takes focus');
    await page.fill(`${dialog} [name="${e.title}"]`, 'Named for the kit check');
    if (e.step) { await page.click(`${dialog} ${e.step}`); assert.equal(await page.$eval(`${dialog} [${e.panel}="0"]`, p => p.hidden), true, label + ': a valid step lets the wizard move on'); await page.click(`${dialog} ${e.step.replace(/"2"/, '"0"')}`); }
    else {
      await page.evaluate(() => { const f = document.querySelector('dialog[open] form'); f.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true})); });
      // The save is answered before Escape is pressed: a saving editor keeps its dialog (a group the server refuses for
      // want of members stays open with its message), so Escape must not race the answer on a loaded machine.
      await page.waitForFunction(() => !document.querySelector('dialog[open] form button[type="submit"][disabled]'));
    }
    // A wizard keeps its dialog and the field is valid again; a one-step editor has saved (or kept its dialog with the server's message).
    if (e.step) { const good = await invalid(e.title); assert.equal(good.invalid, null, label + ': the field is valid again'); assert.ok(!good.isMessage && good.message, label + ': and described by its help again: ' + good.message); }
    // Escape: a changed form asks first; discarding closes it with focus back on the opener.
    await page.keyboard.press('Escape');
    const discard = page.locator('dialog[open] .l-discard:not([hidden]) button').first();
    if (await discard.count()) await page.locator('dialog[open] .l-discard:not([hidden]) [data-r-action="discard"],dialog[open] .l-discard:not([hidden]) [data-q-action="discard"],dialog[open] .l-discard:not([hidden]) [data-d-action="discard"],dialog[open] .l-discard:not([hidden]) [data-a-action="discard"],dialog[open] .l-discard:not([hidden]) [data-sec-action="discard"],dialog[open] .l-discard:not([hidden]) [data-rt-action="discard"]').first().click();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    assert.equal(await activeIs(e.open), true, label + ': focus returned to the opener');
    pass(label + ': one shared dialog, the ' + e.command + ' vocabulary, every control named, required marked, help described, the invalid field announced beside itself' + (e.step ? ' with its step kept open' : '') + ', focus returned');
  }

  // Round 12 (D2): a threat's category and priority, and a plan's targets, offer "Not stated" first; the requirements a
  // record answers are one field described by its help.
  await page.goto(base + '/?chapter=9&tab=work', {waitUntil: 'networkidle'});
  await page.locator('[data-sec-action="edit-threat"]').filter({visible: true}).first().click();
  await page.waitForSelector(`${dialog} #sec-editor`);
  // rc38+ (rc41 W4): the owner's rc38 snapshot draws the requirements a record answers as one picker (record-fields.js
  // recordField → pickHTML): one joined value, a legend, its own help, a Find box and the requirements and groups to add.
  // The help says what to choose; the control a person types in must be described by it.
  const notStated = await page.evaluate(() => { const f = document.querySelector('dialog[open] #sec-editor'), values = f.querySelectorAll('[name="grounds"]'), box = values[0]?.closest('[data-pick]'), find = box?.querySelector('[data-pick-find]');
    return {category: f.elements.category.options[0].textContent, priority: f.elements.priority.options[0].textContent, fields: values.length, joined: !!values[0]?.matches('input[type="hidden"][data-pick-value]'), legend: box?.querySelector(':scope > legend')?.textContent, help: box?.querySelector(':scope > .field-help')?.textContent || '', find: find?.getAttribute('aria-label'), groups: [...(box?.querySelectorAll('.l-pick-group') || [])].map(g => g.textContent), described: document.getElementById(find?.getAttribute('aria-describedby') || '')?.textContent || ''}; });
  assert.deepEqual([notStated.category, notStated.priority], ['Not stated', 'Not stated']);
  assert.deepEqual([notStated.fields, notStated.joined, notStated.legend, notStated.find], [1, true, 'Requirements and groups it answers', 'Find Requirements and groups it answers'], 'the requirements a record answers are one field, named: ' + JSON.stringify(notStated));
  assert.match(notStated.help, /^Choose the requirements and groups this record answers\./, 'with its help');
  assert.ok(notStated.groups.includes('Chapter 1 · Requirements'), 'offering the requirements: ' + notStated.groups.join(', '));
  const groundsDescribed = notStated.described;
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  pass('round 12: a threat\'s category and priority offer Not stated first, and the requirements a record answers are one field with its help (its description is asserted last)');

  // The pickers: the owner field offers the stakeholders of Chapter 1 and keeps free text; a decision offers the
  // assumption records; an alternative's pattern offers the catalogue once it has loaded.
  await page.goto(base + '/?chapter=1&tab=work', {waitUntil: 'networkidle'});
  await page.locator('[data-r-section="requirement"]').first().click();
  await page.locator('[data-r-action="add"]').filter({visible: true}).first().click();
  await page.waitForSelector(`${dialog} #r-artefact-form`);
  const owner = await page.$eval(`${dialog} [name="owner"]`, c => ({list: c.getAttribute('list'), options: [...(c.list?.options || [])].map(o => o.value), type: c.type}));
  const stakeholders = await page.evaluate(() => window.aiwProjectStore.value.document.artefacts.filter(a => a.type === 'stakeholder' || a.type === 'actor').map(a => a.title));
  assert.ok(owner.list && owner.type === 'text', 'the owner is a text field with a datalist');
  assert.deepEqual(owner.options, stakeholders, 'the datalist offers the stakeholders and actors recorded in Chapter 1');
  await page.fill(`${dialog} [name="owner"]`, 'Someone not recorded');
  assert.equal(await page.inputValue(`${dialog} [name="owner"]`), 'Someone not recorded', 'free text is kept for people not recorded');
  await page.keyboard.press('Escape'); await page.locator('dialog[open] .l-discard:not([hidden]) [data-r-action="discard"]').click();
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await page.goto(base + '/?chapter=3&tab=work', {waitUntil: 'networkidle'});
  await page.locator('[data-d-action="edit-question"]').filter({visible: true}).first().click();
  await page.waitForSelector(`${dialog} #d-question-form`);
  const assumptions = await page.evaluate(() => window.aiwProjectStore.value.document.artefacts.filter(a => a.type === 'assumption').map(a => a.id));
  assert.deepEqual(await page.$$eval(`${dialog} [name="assumptionIds"]`, xs => xs.map(x => x.value)), assumptions, 'a decision offers the assumption records of Chapter 1 as linked ids');
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  // rc39/rc40 Work (rc41 W4): "Add alternative" is the Compare stage's own task action.
  await page.locator('.work-stages [data-d-stage="compare"]').click(); await page.waitForSelector('.work-stages [data-d-stage="compare"][aria-pressed="true"]');
  assert.equal((await page.locator('.work-task-actions [data-d-action="new-alternative"]').textContent()).trim(), 'Add alternative');
  await page.locator('.work-task-actions [data-d-action="new-alternative"]').click();
  await page.waitForSelector(`${dialog} #d-alternative-form`);
  await page.waitForFunction(() => (document.querySelector('dialog[open] [name="pattern"]')?.list?.options.length || 0) > 0);
  const patterns = await page.$eval(`${dialog} [name="pattern"]`, c => ({type: c.type, n: c.list.options.length, first: c.list.options[0].value, picker: c.list.dataset.picker}));
  assert.ok(patterns.type === 'text' && patterns.n > 100 && patterns.picker === 'pattern', 'the pattern field offers the catalogue\'s styles and patterns once loaded: ' + JSON.stringify(patterns));
  assert.ok(await page.$eval(`${dialog} [name="antiPattern"]`, c => c.list?.dataset.picker === 'anti-pattern' && c.list.options.length > 10), 'the anti-pattern field offers the catalogue\'s anti-patterns');
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  pass('Pickers: the owner offers the recorded stakeholders and keeps free text; a decision links Chapter 1 assumption records; an alternative offers the catalogue\'s patterns and anti-patterns');

  // One chip language across the chapters: the words differ, the class family does not.
  const chips = {};
  for (const chapter of [1, 2, 3, 5, 9, 11]) {
    await page.goto(base + '/?chapter=' + chapter + '&tab=work', {waitUntil: 'networkidle'});
    chips[chapter] = await page.evaluate(() => ({chip: document.querySelectorAll('.chip').length, legacy: document.querySelectorAll('.r-badge,.d-status,.l-badge').length, words: [...new Set([...document.querySelectorAll('.chip')].map(c => c.textContent.trim()))].slice(0, 4)}));
    assert.equal(chips[chapter].legacy, 0, 'chapter ' + chapter + ': no earlier badge family');
  }
  assert.ok([1, 2, 3].every(c => chips[c].chip > 0), 'Chapters 1 to 3 show their status words as chips: ' + JSON.stringify(chips));
  pass('Status words wear one chip across the chapters, each chapter keeping its own words: ' + Object.entries(chips).map(([c, x]) => c + ': ' + x.words.join(' / ')).join('; '));

  assert.deepEqual(errors, [], 'no page errors');
  // Asserted last so that every other check is read (rc41 W4): the picker's Find box is described by the field's help.
  assert.equal(groundsDescribed, notStated.help, 'the requirements a record answers are described by their help (the Find box\'s aria-describedby): ' + JSON.stringify(groundsDescribed) + ' (' + checks.length + ' checks passed before it)');
  console.log(`\n${checks.length} checks passed.`);
  console.log(JSON.stringify({suite: 'field-kit-browser', checks: checks.length, errors: errors.length}));
} catch (e) {
  console.error('FAIL', e.message); if (errors.length) console.error('page errors:', errors); process.exitCode = 1;
} finally {
  await browser.close(); server.kill('SIGKILL');
  try { rmSync(db, {force: true}); rmSync(db + '-wal', {force: true}); rmSync(db + '-shm', {force: true}); } catch { /* left for the next run to overwrite */ }
}
