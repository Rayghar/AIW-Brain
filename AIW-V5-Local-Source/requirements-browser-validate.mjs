// Chapter 1 at the size of a real project, in a real browser (round 12, D-03, D-09, D-15). The synthetic 1,400-row
// workbook (scripts/synthetic-workbook.mjs: generated text, the shape of a real assessment workbook) is imported through
// the Requirements page's own dialog: the mapping step shows the priority each band value sets and the groups the import
// may create, the review step what else the import proposes. Then the page: the Requirements tab leads with the import
// summary and the groups; a group, the delivery gaps and a finding's cause filter the paged register; the details clip a
// long title and show every imported field; a page of requirements is confirmed in one reviewed step and a group's
// missing evidence is given a reason; a group is created; the checks read per cause; the companion names five records and
// offers the rest as a filtered list; the user groups and the brief the workbook proposed are accepted. Every editor
// opened is held to its record type's descriptors (record-fields.js). No page error, no sideways scroll.
// Round 12 (B2): a band may set no priority, and a row with none is not stated; the review step shows the outcomes and
// constraints the rows propose, the sentence held back for naming a person, the column of names flagged and unticked,
// and the quality of each mapped column; a proposed constraint is accepted with its constraint driver; a re-import is
// proposed its saved mapping; a further sheet enriches the requirements it names through the same dialog.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally AIW_BROWSER_EXECUTABLE.
// Starts an isolated local server on a free port. Run: npm run test:requirements-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';
import {syntheticWorkbook} from './scripts/synthetic-workbook.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/requirements-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const checks = [], errors = [];
const pass = n => { checks.push(n); console.log('PASS', n); };
const {bytes, manifest} = syntheticWorkbook();
const gapsOf = rows => rows.filter(r => r.status !== 'Delivered').length;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', e => errors.push(e.message));
  const dialog = 'dialog[open]';
  const saved = () => page.evaluate(async () => (await (await fetch('/api/project' + location.search.replace(/^\?.*?(project=[^&]+).*$/, '?$1'), {credentials: 'same-origin'})).json()).document);
  const described = async label => {
    const v = await page.evaluate(async () => { const {FORM_IDS, formFieldsMatch} = await import('/record-fields.js'); const form = document.querySelector('dialog[open] form'); const command = Object.entries(FORM_IDS).find(([, id]) => id === form.id)?.[0]; return {form: form.id, command, ...(command ? formFieldsMatch(command, [...form.elements].map(e => e.name).filter(Boolean)) : {})}; });
    assert.ok(v.command, `${label}: form ${v.form} has a record type`);
    assert.deepEqual({undescribed: v.undescribed, missing: v.missing}, {undescribed: [], missing: []}, `${label}: ${v.form} matches the ${v.command} descriptors`);
    return v.command;
  };
  // rc39/rc40 Work (rc41 W4): the import summary, the modules and the groups sit in the Requirements stage under the fold
  // "Import, grouping and delivery evidence" (details.work-support), closed unless a group, domain or cause is chosen.
  // inEvidence(sel) waits for the section to be drawn, opens that one fold with a pointer click if it is closed, as a
  // viewer does, and then waits for the section to be visible.
  const inEvidence = async (sel, timeout = 15000) => {
    await page.waitForSelector(sel, {state: 'attached', timeout});
    const fold = page.locator('details.work-support > summary').filter({hasText: /^\s*Import, grouping and delivery evidence\s*$/});
    if ((await fold.count()) !== 1) throw Error('one "Import, grouping and delivery evidence" fold, found ' + await fold.count());
    if (!await fold.evaluate(s => s.parentElement.open)) { await fold.click(); await page.waitForTimeout(250); }
    await page.waitForSelector(sel, {timeout: 8000});
  };
  const count = sel => page.$eval(sel, e => Number(e.textContent.replace(/[^\d]/g, '')));
  const filterCount = () => page.$eval('.r-filter-count', e => Number(e.textContent.split(' of ')[0].replace(/[^\d]/g, '')));
  const noSideways = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

  // ---------------------------------------------------------------- the import, through the page's own dialog
  await page.goto(base + '/', {waitUntil: 'networkidle'});
  const id = await page.evaluate(async () => (await (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Platform requirements', template: 'blank'})})).json()).document.id);
  await page.goto(base + '/?chapter=1&tab=work&project=' + id, {waitUntil: 'networkidle'});
  await page.click('[data-r-section="requirement"]');
  await page.click('[data-r-action="workbook"]');
  await page.setInputFiles(`${dialog} #intake-file`, {name: 'Synthetic-requirements.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(bytes)});
  await page.waitForSelector(`${dialog} [data-intake-next]:not([disabled])`);
  assert.equal(await page.$eval('#intake-header', e => e.value), '5');
  assert.equal(await page.$eval('[data-intake-map="capability"]', e => e.value), 'W', 'the capability is the capability-theme column');
  assert.equal(await page.$eval('[data-intake-map="module"]', e => e.value), 'C', 'the module or theme column has its own field');
  const bands = await page.$$eval(`${dialog} [data-intake-priority]`, xs => Object.fromEntries(xs.map(x => [x.dataset.intakePriority, x.value])));
  assert.deepEqual(bands, {Delivered: 'Could', Critical: 'Must', High: 'Should', Medium: 'Could', Watch: 'Could'}, 'each band value shows the priority it sets by default');
  await page.selectOption(`${dialog} [data-intake-priority="Watch"]`, 'Should');
  assert.deepEqual(await page.$$eval(`${dialog} [data-intake-priority="Critical"] option`, xs => xs.map(x => x.textContent)), ['Must', 'Should', 'Could', 'Not stated'], 'a band may also set no priority (round 12, GR-INT-19)');
  assert.deepEqual(await page.$$eval(`${dialog} [data-intake-group]:checked`, xs => xs.map(x => x.dataset.intakeGroup)), ['domain', 'capabilityTheme', 'modules'], 'groups from the domain and capability-theme columns are offered, and modules proposed from them (round 24)');
  pass('the mapping step maps all 27 columns, the capability from the theme column, and shows the priority each band sets, Not stated among them, which the person changes');
  await page.click(`${dialog} [data-intake-next]`);
  await page.waitForSelector(`${dialog} #intake-reviewed`);
  const proposals = await page.$eval(`${dialog} .intake-proposals`, e => e.innerText);
  // Round 12 (GR-INT-19): a row with no band is not stated, not Must.
  const pri = {Must: 0, Should: 0, Could: 0, notStated: 0}; for (const r of manifest.rows) if (!r.band) pri.notStated++; else pri[{Critical: 'Must', High: 'Should', Watch: 'Should'}[r.band] || 'Could']++;
  assert.ok(pri.notStated > 0, 'the synthetic workbook holds rows with no band');
  assert.match(proposals, new RegExp(`Must ${pri.Must.toLocaleString('en-GB')} · Should ${pri.Should.toLocaleString('en-GB')} · Could ${pri.Could.toLocaleString('en-GB')} · Not stated ${pri.notStated}`), proposals);
  assert.match(proposals, /18 new groups from Domain\. 19 new groups from Capability_Theme/);
  assert.match(proposals, /13 user groups from User_Group/); assert.match(proposals, /sentences from 00 Overview, 01 Read Me/); assert.match(proposals, /1 statement holds pasted markup \(D\d+\)/);
  pass('the review step shows the priorities (not stated among them), the groups, the stakeholders, the brief and the pasted markup the import proposes');
  // Round 12 (B2): the outcomes and constraints the rows propose, the sentence held back for naming a person, the person
  // column flagged and left unticked, and the quality of each mapped column.
  assert.match(proposals, /intended outcomes say more than the statements they belong to/, proposals);
  assert.match(proposals, /The statements name [^.]*Payments Directive 2019[^.]*\. Each is proposed, not created, as a Chapter 1 constraint/, proposals);
  assert.match(proposals, /1 sentence names a person of a column flagged below/, proposals);
  const flagged = await page.$$eval(`${dialog} [data-intake-personal]`, xs => xs.map(x => ({key: x.dataset.intakePersonal, checked: x.checked})));
  assert.deepEqual(flagged, [{key: manifest.cases.leads.sheet + '!' + manifest.cases.leads.column, checked: false}], 'the column of names is flagged and not imported by default');
  assert.ok(!(await page.$eval(dialog, e => e.innerText)).includes(manifest.cases.leads.names[0]), 'and no name it holds is shown');
  assert.match(await page.$eval(`${dialog} .intake-profile summary`, e => e.textContent), /^Column quality · 25 mapped columns/);
  pass('the review step proposes the distinct outcomes and the named regulations, holds back the sentence that names a person, flags the column of names unticked without showing a name, and profiles every mapped column');
  await page.check(`${dialog} #intake-reviewed`);
  const t0 = Date.now();
  await page.click(`${dialog} [data-intake-next]`);
  await inEvidence('.r-import', 60000);
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  const opened = Date.now() - t0;

  // ---------------------------------------------------------------- the Requirements tab at size
  const order = await page.evaluate(() => { const at = s => { const el = document.querySelector(s); return el ? [...document.querySelectorAll('*')].indexOf(el) : -1; }; return {summary: at('.r-import'), groups: at('.r-groups'), list: at('#r-record-list')}; });
  assert.ok(order.summary >= 0 && order.summary < order.groups && order.groups < order.list, 'the import summary and the groups lead the register');
  assert.equal(await count('.r-import .intake-assurance-summary span:first-child strong'), 1400);
  // Round 24 (D-24-02): the import made the 18 domain groups the modules, proposed their sub-modules and the platform
  // modules, and kept the 19 theme groups as facets; the table lists every group the project keeps.
  const kept = await page.evaluate(() => { const gs = window.aiwProjectStore.value.document.requirementGroups.records; const n = k => gs.filter(g => g.kind === k).length; return {all: gs.length, module: n('module'), sub: n('sub-module'), theme: n('theme'), proposed: gs.filter(g => g.state === 'proposed').length}; });
  assert.equal(kept.theme, 19, 'the theme groups stay'); assert.ok(kept.module >= 18 && kept.sub > 0, JSON.stringify(kept)); assert.equal(kept.proposed, kept.module + kept.sub, 'the structure is proposed, not accepted');
  assert.equal(await page.$$eval('.r-groups-table tbody tr', xs => xs.length), kept.all);
  // Round 24 (D-24-08): the structure screen lists the modules and sub-modules, the groups table the others.
  assert.equal(await page.$$eval('.r-modules-table tbody tr', xs => xs.length), kept.module + kept.sub, 'the structure lists every module and sub-module');
  assert.equal(await page.$$eval('.r-groups-table:not(.r-modules-table) tbody tr', xs => xs.length), kept.all - kept.module - kept.sub, 'the groups table lists the other groups');
  assert.match(await page.$eval('.intake-pager span', e => e.textContent), /Page 1 of 28 · 1400 records/);
  pass(`the Requirements tab leads with the import summary and its ${kept.all} groups (${kept.module} modules, ${kept.sub} sub-modules, ${kept.theme} themes); 1,400 records page at 50 (applied and drawn in ${opened} ms)`);
  const theme = manifest.rows.find(r => r.theme === 'Approval workflow and dual control').theme, themed = manifest.rows.filter(r => r.theme === theme);
  // Round 24 (D-24-08): the theme is a group of the groups table that follows the module structure (whose sub-modules
  // carry the themes' titles and, chosen, set the scope rather than filter by a group).
  await page.click(`.r-groups-table:not(.r-modules-table) button:text-is("${theme}") >> xpath=..`).catch(() => page.locator('.r-groups-table:not(.r-modules-table) button', {hasText: theme}).first().click());
  await page.waitForFunction(n => document.querySelector('.r-filter-count')?.textContent.startsWith(n.toLocaleString('en-GB') + ' of'), themed.length);
  assert.equal(await filterCount(), themed.length);
  await page.check('#r-gaps-filter');
  await page.waitForFunction(n => document.querySelector('.r-filter-count')?.textContent.startsWith(n + ' of'), gapsOf(themed));
  await page.uncheck('#r-gaps-filter');
  await page.waitForFunction(n => document.querySelector('.r-filter-count')?.textContent.startsWith(n.toLocaleString('en-GB') + ' of'), themed.length);
  if (themed.length > 50) { await page.click('[data-r-page="2"]'); await page.waitForFunction(() => /Page 2 of/.test(document.querySelector('.intake-pager span')?.textContent || '')); }
  pass(`a group (${themed.length} requirements) and its delivery gaps (${gapsOf(themed)}) filter the register, and paging stays`);

  // The details: a long title clipped, the statement whole, every imported field.
  const long = manifest.rows.find(r => r.statement.length > 200), longId = await page.evaluate(ext => window.aiwProjectStore.value.document.artefacts.find(a => a.externalId === ext).id, long.id);
  await page.goto(base + '/?chapter=1&tab=work&project=' + id + '&artefact=' + longId, {waitUntil: 'networkidle'});
  // rc38 (the owner's snapshot; rc41 W4): the details are the record card in the Details column
  // (#inspector .record-card[data-record-card]); its head shows the title whole, wrapped inside the column
  // (work-round27.css: no clamp, overflow-wrap:anywhere), and its main section keeps the chapter's own body — the statement
  // and the imported source facts. The round-26 three-line clamp is replaced by "whole and inside the column" (NOTE.md).
  const card = `#inspector .record-card[data-record-card="${longId}"]`;
  await page.waitForSelector(card + ' .record-card-head h2');
  const title = await page.evaluate(id => window.aiwProjectStore.value.document.artefacts.find(a => a.id === id).title, longId);
  const details = await page.evaluate(sel => { const c = document.querySelector(sel), h = c.querySelector('.record-card-head h2'), col = document.querySelector('#inspector').getBoundingClientRect(), r = h.getBoundingClientRect(); return {title: h.textContent, inside: r.left >= col.left - 1 && r.right <= col.right + 1 && h.scrollWidth <= h.clientWidth + 1, body: [...c.querySelectorAll('.record-card-main p')].map(p => p.textContent).join(' '), facts: [...c.querySelectorAll('.record-card-main .r-source-facts dt')].map(d => d.textContent)}; }, card);
  assert.equal(details.title, title, 'the card names the record by its whole title');
  assert.ok(details.inside, 'the title wraps inside the Details column');
  assert.ok(details.body.includes(long.statement), 'the details body holds the whole statement');
  for (const f of ['Domain', 'Capability theme', 'Module', 'User group', 'Delivery', 'Source priority band', 'Source authority', 'Source reference', 'Mapping method', 'Source basis']) assert.ok(details.facts.includes(f), f + ' is shown');
  pass('the record card names a long requirement by its whole title wrapped inside the Details column, keeps the statement whole in the body and shows every imported field');

  // ---------------------------------------------------------------- confirming at scale, a reason for missing evidence
  await page.goto(base + '/?chapter=1&tab=work&project=' + id + '&group=' + (await page.evaluate(t => window.aiwProjectStore.value.document.requirementGroups.records.find(g => g.title === t).id, theme)), {waitUntil: 'networkidle'});
  await page.waitForSelector('.r-selection-bar');
  await page.click('[data-r-action="pick-page"]');
  assert.match(await page.$eval('.r-selection-bar', e => e.innerText), /50 requirements selected/);
  await page.click('[data-r-action="confirm-picked"]');
  await page.waitForSelector(`${dialog} #r-confirm-form`);
  assert.equal(await described('bulk confirmation'), 'requirements.confirm');
  await page.click(`${dialog} button[type=submit]`);
  assert.equal(await page.$eval(`${dialog} [name=reviewed]`, e => e.getAttribute('aria-invalid')), 'true', 'the review is asked for, not assumed');
  await page.check(`${dialog} [name=reviewed]`); await page.click(`${dialog} button[type=submit]`);
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  let doc = await saved();
  assert.equal(doc.artefacts.filter(a => a.type === 'requirement' && a.confirmed).length, 50); assert.equal(doc.changes.events.filter(e => e.source?.id === 'requirements-confirm').length, 1, 'journalled once');
  await page.click('[data-r-action="confirm-shown"]');
  await page.waitForSelector(`${dialog} #r-confirm-form`);
  assert.match(await page.$eval(`${dialog} form p`, e => e.textContent), new RegExp(`${themed.length.toLocaleString('en-GB')} requirements, 50 confirmed already`));
  await page.check(`${dialog} [name=reviewed]`); await page.click(`${dialog} button[type=submit]`);
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  doc = await saved(); assert.equal(doc.artefacts.filter(a => a.type === 'requirement' && a.confirmed).length, themed.length);
  pass(`a page of 50 and then the rest of the group (${themed.length}) are confirmed in two reviewed steps, each journalled once`);
  const lacking = themed.filter(r => !r.evidence).length;
  await page.click('[data-r-action="evidence-reason"]');
  await page.waitForSelector(`${dialog} #r-evidence-form`);
  assert.equal(await described('reason for missing evidence'), 'requirements.evidence');
  await page.fill(`${dialog} [name=reason]`, 'The test cycles for this theme are being re-run; the workbook records no evidence yet.');
  await page.check(`${dialog} [name=reviewed]`); await page.click(`${dialog} button[type=submit]`);
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  doc = await saved(); assert.equal(doc.artefacts.filter(a => a.evidenceTreatment).length, lacking);
  pass(`a reviewed reason for missing evidence is recorded for the ${lacking} requirements of the group in one step`);

  // ---------------------------------------------------------------- a group of one's own
  await page.click('[data-r-action="new-group"]');
  await page.waitForSelector(`${dialog} #r-group-form`);
  assert.equal(await described('group editor'), 'requirements.group');
  await page.fill(`${dialog} [name=title]`, 'Lending approvals');
  await page.selectOption(`${dialog} [name=kind]`, 'functional-area');
  await page.selectOption(`${dialog} [name="rule-field-0"]`, 'domain'); await page.fill(`${dialog} [name="rule-value-0"]`, 'Lending');
  await page.selectOption(`${dialog} [name="rule-field-1"]`, 'capabilityTheme'); await page.fill(`${dialog} [name="rule-value-1"]`, theme);
  await page.click(`${dialog} button[type=submit]`);
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  doc = await saved(); const own = doc.requirementGroups.records.find(g => g.title === 'Lending approvals');
  assert.deepEqual(own.rule, [{field: 'domain', value: 'Lending'}, {field: 'capabilityTheme', value: theme}]);
  assert.ok(await page.locator('.r-groups-table button', {hasText: 'Lending approvals'}).count());
  pass('a group made of a rule on two imported attributes is saved from its editor and listed');

  // ---------------------------------------------------------------- the checks per cause, and the companion
  // rc38+ (rc41 W4): Validate is the validation workspace. Its category filters are [data-validation-filter]; "Findings by
  // cause" is a fold (details.validation-causes) whose rows (tr[data-validation-cause-row]) carry each cause's rule sentence
  // under "Why this check matters", its count and a pick ([data-validation-cause-pick]) that narrows the queue; the queue
  // lists findings 40 at a time ([data-validation-more]) under a heading that counts them all. Pinned by those data
  // attributes and words, not class chains, so W2's frame can keep them.
  await page.goto(base + '/?chapter=1&tab=validate&project=' + id, {waitUntil: 'networkidle'});
  await page.click('.validation-workspace [data-validation-filter="all"]');
  assert.equal(await page.$eval('.validation-workspace [data-validation-filter="all"]', b => b.getAttribute('aria-pressed')), 'true');
  if (!await page.$('details.validation-causes[open]')) await page.click('details.validation-causes > summary');
  await page.waitForSelector('details.validation-causes[open] tr[data-validation-cause-row]');
  const causes = await page.$$eval('details.validation-causes tr[data-validation-cause-row]', xs => xs.map(x => x.querySelector('th details p')?.textContent || ''));
  assert.match(await page.$eval('details.validation-causes > summary', e => e.textContent), new RegExp(`^Findings by cause · ${causes.length} causes$`));
  // Round 12 (B2) reads six more of the source's assertions, each as one cause (identical statements that disagree, an
  // unvalidated delivery, an undelivered item marked stable, blocked tests, a test objective, two sheets that disagree),
  // so the bound moves up by those six; the B2 causes the synthetic workbook raises are each listed once.
  assert.ok(causes.length > 8 && causes.length < 26, causes.length + ' causes');
  for (const said of ['requirements repeat a statement whose copies give different source statuses.', 'delivered requirements are not fully validated in the source.', 'undelivered requirements are marked stable in the source.', 'requirements have blocked historical tests.', 'statements read as a test objective, not as the requirement it tests.']) assert.equal(causes.filter(c => c.endsWith(said)).length, 1, said + ' | ' + causes.join(' | '));
  assert.ok(causes.includes('1,400 requirements are needed at no journey step.'), causes.join(' | '));
  // The queue is bounded from the start (it lists at most 40 findings one by one, the heading counting them all), where
  // round 12 listed none until a cause was opened; a cause narrows it and pages it 40 at a time.
  const total = await page.$eval('.validation-queue-heading', e => e.innerText.split('\n')[0]);
  assert.ok(await page.$$eval('.validation-queue .validation-item', xs => xs.length) <= 40, 'at most 40 findings drawn one by one: ' + total);
  await page.click('details.validation-causes [data-validation-cause-pick$="journey-link"]');
  await page.waitForFunction(() => /^1,?400 findings$/.test(document.querySelector('.validation-queue-heading')?.innerText.split('\n')[0] || ''), null, {timeout: 15000});
  assert.equal(await page.$eval('details.validation-causes [data-validation-cause-pick$="journey-link"]', b => b.getAttribute('aria-pressed')), 'true');
  assert.equal(await page.$$eval('.validation-queue .validation-item', xs => xs.length), 40, 'the cause opens its findings 40 at a time');
  await page.click('.validation-queue [data-validation-more]');
  await page.waitForFunction(() => document.querySelectorAll('.validation-queue .validation-item').length === 80, null, {timeout: 15000});
  await page.click('details.validation-causes [data-validation-cause-pick$="journey-link"]');
  await page.waitForFunction(t => document.querySelector('.validation-queue-heading')?.innerText.split('\n')[0] === t, total, {timeout: 15000});
  pass(`the checks read as ${causes.length} causes with their counts; a cause opens its 1,400 findings 40 at a time and lets go to all ${total}`);
  await page.goto(base + '/?chapter=1&tab=model&project=' + id, {waitUntil: 'networkidle'});
  // rc38/rc39 (rc41 W4): the companion is in the Details column, closed on arrival with nothing selected, and folds "What
  // the model shows" closed by default; a viewer opens both, and so does the suite.
  if (await page.evaluate(() => document.body.dataset.panel !== 'open')) { await page.click('.workspace-tools [data-panel-toggle]'); await page.waitForSelector('#inspector[aria-hidden="false"]'); }
  if (await page.$('#inspector details.cp-shows:not([open])')) await page.click('#inspector details.cp-shows > summary');
  const insight = page.locator('#inspector .sm-insw', {hasText: 'needed at no journey step'}).first();
  await insight.waitFor();
  const said = await insight.locator('.cm-ins > span').first().innerText();
  assert.ok((said.match(/\b[A-Z]{3}-[\d.]+/g) || []).length <= 5 && /and 1,395 more/.test(said), said.slice(0, 300));
  await insight.locator('[data-r-cause="journey-link"]').click();
  await page.waitForSelector('.r-cause-chip');
  assert.equal(await filterCount(), 1400);
  pass('the companion names five requirements, counts the other 1,395 and opens them as a filtered register');

  // ---------------------------------------------------------------- what the workbook proposed
  await page.click('[data-r-section="context"]');
  await page.click('[data-r-action="review-stakeholders"]');
  await page.waitForSelector(`${dialog} #r-stakeholders-form`);
  assert.equal(await described('stakeholder proposals'), 'requirements.stakeholders');
  assert.equal(await page.$$eval(`${dialog} [name=accept]:checked`, xs => xs.length), 13);
  await page.uncheck(`${dialog} [name=accept] >> nth=12`); await page.check(`${dialog} [name=dismissRest]`); await page.check(`${dialog} [name=reviewed]`);
  await page.click(`${dialog} button[type=submit]`);
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  doc = await saved();
  assert.equal(doc.artefacts.filter(a => a.type === 'stakeholder').length, 12); assert.equal(doc.intake.datasets[0].proposals.stakeholders.filter(s => s.status === 'dismissed').length, 1);
  pass('twelve user groups become stakeholders the person accepted; the thirteenth is dismissed, none silently created');
  await page.click('[data-r-section="brief"]');
  await page.click('[data-r-action="review-brief"]');
  await page.waitForSelector(`${dialog} #r-brief-proposal-form`);
  assert.equal(await described('brief proposal'), 'requirements.brief');
  const cells = await page.$$eval(`${dialog} [name=sentences] + span small`, xs => xs.map(x => x.textContent));
  assert.ok(cells.length >= 3 && cells.every(c => /^.+![A-Z]+\d+$/.test(c)), 'every sentence cites its sheet and cell: ' + cells);
  await page.uncheck(`${dialog} [name=sentences] >> nth=-1`);
  const problem = await page.$eval(`${dialog} [name=problem]`, e => e.value);
  await page.check(`${dialog} [name=reviewed]`); await page.click(`${dialog} button[type=submit]`);
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  doc = await saved(); assert.equal(doc.brief.problem, problem); assert.equal(doc.brief.confirmed, false); assert.ok(/01 Read Me!B\d/.test(doc.brief.source) || /00 Overview!A\d/.test(doc.brief.source));
  assert.equal(doc.intake.datasets[0].proposals.brief.status, 'accepted');
  pass('the brief is started from the workbook sentences the person kept, citing their cells, and stays unconfirmed');

  // ---------------------------------------------------------------- round 12 (B2): outcomes and constraints proposed
  await page.click('[data-r-section="requirement"]'); await inEvidence('.r-import');
  await page.click('[data-r-action="review-import-records"]');
  await page.waitForSelector(`${dialog} #intake-proposals-form`);
  const named = Object.keys(manifest.cases.regulations);
  assert.equal(await page.$$eval(`${dialog} [name=constraints]`, xs => xs.length), named.length, 'one constraint proposed per regulation or regulator named');
  assert.equal(await page.$$eval(`${dialog} [name=constraints]:checked, ${dialog} [name=outcomes]:checked`, xs => xs.length), 0, 'nothing is ticked for the person');
  await page.click(`${dialog} button[type=submit]`);
  assert.match(await page.$eval(`${dialog} [role=alert]`, e => e.textContent), /Review the proposals/, 'the review is asked for, not assumed');
  await page.check(`${dialog} [name=constraints] >> nth=0`); await page.check(`${dialog} [name=reviewed]`);
  await page.click(`${dialog} button[type=submit]`);
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  doc = await saved();
  const accepted = doc.intake.datasets[0].proposals.constraints.find(c => c.status === 'accepted'), made = doc.artefacts.find(a => a.id === accepted.recordId), driver = doc.quality.drivers.find(d => d.id === accepted.driverId);
  assert.equal(made.type, 'constraint'); assert.equal(made.confirmed, false);
  assert.equal(doc.relationships.filter(r => r.from === made.id && r.kind === 'constrains').length, accepted.count, 'the constraint constrains the rows that name it');
  assert.deepEqual([driver.kind, driver.constraintIds, driver.confirmed], ['constraint', [made.id], false], 'with its constraint driver, unconfirmed');
  assert.equal(doc.intake.datasets[0].proposals.constraints.filter(c => c.status === 'proposed').length, named.length - 1, 'the others wait');
  pass('the constraint the person ticked is made, with the rows it constrains and its constraint driver left unconfirmed; the others wait; nothing is accepted unreviewed');

  // ---------------------------------------------------------------- round 12 (B2): a re-import and an enrichment
  await page.click('[data-r-action="workbook"]');
  await page.setInputFiles(`${dialog} #intake-file`, {name: 'Synthetic-requirements.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(bytes)});
  await page.waitForSelector(`${dialog} [data-intake-next]:not([disabled])`);
  assert.equal(await page.$eval('#intake-dataset', e => e.value), doc.intake.datasets[0].id, 'the same file and sheet update their dataset');
  assert.match(await page.$eval(`${dialog} .intake-basis`, e => e.textContent), /Proposed with the mapping revision 1 was saved with; every saved column is where it was/);
  assert.equal(await page.$eval(`${dialog} [data-intake-priority="Watch"]`, e => e.value), 'Should', 'the band choice the person saved is proposed again (GR-INT-06)');
  await page.check(`${dialog} [data-intake-mode][value="enrich"]`);
  await page.waitForSelector(`${dialog} [data-intake-map="joinId"]`);
  await page.selectOption(`${dialog} #intake-sheet`, manifest.cases.enrich.sheet);
  await page.waitForFunction(h => document.querySelector('dialog[open] #intake-header')?.value === String(h) && !document.querySelector('dialog[open] [data-intake-next]')?.disabled, manifest.cases.enrich.headerRow);
  assert.equal(await page.$eval(`${dialog} [data-intake-map="joinId"]`, e => e.value), 'A', 'the join is the column that holds the requirement ids');
  assert.deepEqual(await page.$$eval(`${dialog} [data-intake-personal]`, xs => xs.map(x => [x.dataset.intakePersonal, x.checked])), [[manifest.cases.enrich.sheet + '!' + manifest.cases.enrich.personColumn, false]], 'the tester column is flagged and held back');
  await page.click(`${dialog} [data-intake-next]`);
  await page.waitForSelector(`${dialog} #intake-reviewed`);
  const enrichText = await page.$eval(dialog, e => e.innerText), e6 = manifest.cases.enrich;
  assert.match(enrichText, new RegExp(`${e6.rows} rows read: ${e6.rows - e6.duplicates} kept, ${e6.duplicates} repeated cell for cell and dropped`));
  assert.match(enrichText, new RegExp(`${Object.keys(e6.matched).length} requirements gain what this sheet says of them\\. No requirement is created`));
  assert.match(enrichText, /2 rows name an id no imported requirement holds: PLR-9998, PLR-9999/);
  assert.match(enrichText, /No row fills G · Delivery_Status, I · Notes/);
  assert.match(enrichText, /Column H \(Source_Row\) names the row 1 above the requirement's own/);
  await page.check(`${dialog} #intake-reviewed`); await page.click(`${dialog} [data-intake-next]`);
  await page.waitForFunction(() => !document.querySelector('dialog[open]'), null, {timeout: 60000});
  doc = await saved();
  assert.equal(doc.artefacts.filter(a => a.type === 'requirement').length, 1400, 'no requirement is created');
  assert.equal(doc.artefacts.filter(a => a.enrichment).length, Object.keys(e6.matched).length, 'the requirements it names hold what it says');
  const names = manifest.cases.leads.names.map(n => n.split(' ')), person = new RegExp(`\\b(?:${[...new Set(names.map(n => n[0]))].join('|')}) (?:${[...new Set(names.map(n => n[1]))].join('|')})\\b`);
  assert.ok(!person.test(JSON.stringify(doc)), 'no generated person name (a lead or a tester) is kept anywhere in the project');
  pass('a re-import is proposed its saved mapping and band choice; a further sheet enriches the requirements it names through the dialog, reporting its repeated rows, unknown ids, blank columns and shifted row references, holding back the tester column and creating no requirement');

  assert.ok(await noSideways(), 'no sideways scroll at 1440 px');
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(base + '/?chapter=1&tab=work&project=' + id, {waitUntil: 'networkidle'});
  await page.click('[data-r-section="requirement"]'); await inEvidence('.r-import');
  assert.ok(await noSideways(), 'no sideways scroll at 390 px');
  assert.deepEqual(errors, [], 'no page error');
  pass('no page error; no sideways scroll at 1440 or 390 px');
  console.log(`\n${checks.length} checks passed.`);
} finally {
  await browser.close();
  server.kill('SIGKILL');
  for (const s of ['', '-wal', '-shm']) rmSync(db + s, {force: true});
}
