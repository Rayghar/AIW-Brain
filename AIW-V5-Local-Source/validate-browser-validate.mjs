// Rendered checks for the Validate tab: the chapter's checks (round 3, C — Validate checks), read since rc41 (W4) on
// rc38's validation workspace. A readiness summary (findings to fix, items to confirm, SDD passages passing, the check
// stamp and record) with the studio's own Run checks; the findings as one priority queue, or grouped by object or by
// kind with only the first group open (round 5, Contract G), each finding naming its status in words and its record,
// its Open remedy, Treat and Ask Sol on selection; the findings by cause; what the chapter's models show; and "This
// chapter in the SDD" as a compact table. Chapter 8's checks stay under 900 words on the stage. A switch also presents
// existing model integrity checks and prompts; the whole design and the review desk remain on Model. The Output
// checks read rc38's output workspace.
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
const db = '.aiw-local/validate-browser-' + port + '.sqlite';
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
  page.on('pageerror', e => errors.push(e.message));
  // rc38+ (rc41 W4): the chapter's checks are one validation workspace (validation-workspace.js), its SDD passages and the
  // models' observations in its support area (validate-view.js). W2 is reshaping the workspace's frame this round, so
  // its pins read the region name ("Chapter N validation"), roles and names, data-validation-* attributes, counts and
  // words, not its class chain. The SDD passage table, the observations, the lens switch and the domain lens are
  // validate-view.js's own and keep their pins.
  const open = async (ch, extra = '') => { await page.goto(base + '/?chapter=' + ch + '&tab=validate' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('[data-validation-workspace$=":' + ch + ':"][data-bound="1"]', {timeout: 8000}); await page.waitForSelector('#vx-sdd .sdd-table', {timeout: 8000, state: 'attached'}); await page.waitForTimeout(700); };
  const count = async sel => (await page.$$(sel)).length;
  // The lead's count: the visible words (whitespace-separated, as innerText renders them) on the stage.
  const stageWords = () => page.$eval('.stage', e => e.innerText.split(/\s+/).filter(Boolean).length);
  const text = sel => page.$eval(sel, e => e.innerText);
  const region = ch => page.getByRole('region', {name: 'Chapter ' + ch + ' validation'});
  const readiness = ch => region(ch).locator('[aria-label="Readiness summary"]');
  // The readiness summary's three counts, read from their words: findings to fix, items (Chapter 11: final checks) to
  // confirm, SDD passages passing of the chapter's passages.
  const counts = async ch => { const t = (await readiness(ch).innerText()).replace(/\s+/g, ' ').trim(); const m = t.match(/^(\d+) (?:findings?|final checks?) to fix (\d+) (?:items?|final checks?) to confirm (\d+)\/(\d+) SDD passages? passing\b/); assert.ok(m, 'the readiness summary names its three counts with their units: ' + t); return {pass: +m[3], of: +m[4], fix: +m[1], confirm: +m[2]}; };
  const queue = ch => region(ch).getByRole('region', {name: 'Finding queue'});
  const queued = async ch => Number((await queue(ch).locator('b').first().textContent()).match(/^(\d+) findings?$/)[1]);
  const items = ch => region(ch).locator('[data-validation-select]').evaluateAll(xs => xs.map(x => ({key: x.dataset.validationSelect, status: x.querySelector('span > span')?.textContent.trim(), ref: x.querySelector('span > span:nth-child(2)')?.textContent.trim(), refShown: !!x.querySelector('span > span:nth-child(2)')?.checkVisibility(), title: x.querySelector('b')?.textContent, pressed: x.getAttribute('aria-pressed')})));
  const detail = ch => region(ch).getByRole('region', {name: 'Selected finding'});
  // The selected finding's actions under "Resolve or review", by name and the attribute that carries each.
  const actions = ch => detail(ch).locator('h4:text-is("Resolve or review") + *').first().locator(':scope > button, :scope > a').evaluateAll(xs => xs.map(x => ({name: x.textContent.trim(), fix: [...x.attributes].some(a => /^data-(?!validation-)[a-z]+-(action|fix)$/.test(a.name)), studio: [...x.attributes].filter(a => /^data-(?!validation-)[a-z]+-(action|fix)$/.test(a.name)).map(a => a.name + '=' + a.value).join(' '), treat: x.matches('[data-action="treat-finding"]'), ask: x.hasAttribute('data-validation-ask')})));
  const select = async (ch, key) => { await region(ch).locator('[data-validation-select="' + key + '"]').click(); await page.waitForFunction(k => document.querySelector('[data-validation-select="' + CSS.escape(k) + '"]')?.getAttribute('aria-pressed') === 'true', key); };
  const view = async (ch, mode) => { await region(ch).locator('[data-validation-group]').selectOption(mode); await page.waitForTimeout(300); };
  const groups = ch => region(ch).locator('[data-validation-group-id]').evaluateAll(ds => ds.map(d => ({label: d.querySelector(':scope > summary > b')?.textContent, counts: [...d.querySelectorAll(':scope > summary > span > span')].map(s => s.textContent).join(' · '), open: d.open, items: d.querySelectorAll('[data-validation-select]').length})));
  const groupTools = async ch => (await region(ch).locator('[data-validation-groups="expand"]').locator('xpath=..').innerText()).replace(/\s+/g, ' ').trim();
  const causeRows = ch => region(ch).locator('[data-validation-cause-row]').evaluateAll(rs => rs.map(r => ({key: r.dataset.validationCauseRow, what: r.querySelector('th > b')?.textContent, n: Number(r.querySelector('[data-validation-cause-count]')?.textContent), treatments: !!r.querySelector('[data-validation-cause-treatments]')})));
  const openCauses = async ch => { const d = region(ch).locator('[data-validation-causes]'); if (!await d.evaluate(e => e.open)) await d.locator('summary').first().click(); assert.equal(await d.evaluate(e => e.open), true); };
  const pick = async (ch, key) => { await region(ch).locator('[data-validation-cause-pick="' + key + '"]').click(); await page.waitForTimeout(350); };
  const noModes = () => page.evaluate(() => ({sw: !!document.querySelector('.vx-switch, .vx-bar, .vx-ready'), body: [...document.body.classList].filter(c => c.startsWith('vx-')), an: !!document.querySelector('.an'), desk: !!document.querySelector('.cm.dk')}));
  // Chapter 8's visible-word budget, which W2's frame work this round may change, is measured where it occurs and
  // asserted last, so that every other check is read while it is over (rc41 W4).
  const deferred = [];

  // 0. rc39 (W3 step 4, PLAN §4.3.3), written first on the validation workspace (the checks below it were moved onto the
  //    workspace in rc41, W4): Chapter 5 reads "A driver asks a design question no decision answers", one item per open question per component,
  //    a review item, with the question and its drivers; one cause across the chapter; its Open remedy lands on the
  //    record card with its Design basis open and Decide at hand. The count is the design-questions projection's (six
  //    open on the reference's components), pinned in realisation-validate.mjs against projectQuestions.
  {
    await page.goto(base + '/?chapter=5&tab=validate', {waitUntil: 'networkidle'}); await page.waitForSelector('.validation-workspace .validation-item', {timeout: 15000}); await page.waitForTimeout(500);
    const RULE = 'A driver asks a design question no decision answers';
    const items = await page.$$eval('.validation-workspace .validation-item', (xs, rule) => xs.filter(b => b.querySelector('b')?.textContent === rule).map(b => ({ref: b.querySelector('.validation-item-meta span:nth-child(2)')?.textContent, status: b.querySelector('.validation-item-meta span:first-child')?.textContent, detail: b.querySelector('small')?.textContent, key: b.dataset.validationSelect})), RULE);
    assert.equal(items.length, 6, 'six open questions on the reference\'s components: ' + JSON.stringify(items));
    assert.ok(items.every(x => x.status === 'Review item'), 'each a review item (to confirm), never a content gap: ' + JSON.stringify(items.map(x => x.status)));
    const readPath = items.find(x => x.ref === 'APP-001' && /^Read from the authority or keep a bounded read copy\? · asked by QD-003 of APP-001\. Decide it on the record card \(Design basis\) or record the answer in Chapter 5\.$/.test(x.detail));
    assert.ok(readPath, 'the Payment service\'s read path, asked by QD-003, with where to decide it: ' + JSON.stringify(items.filter(x => x.ref === 'APP-001')));
    assert.ok(await page.evaluate(rule => [...document.querySelectorAll('.validation-causes tbody tr')].some(r => r.textContent.includes(rule) && /\b6\b/.test(r.children[1]?.textContent || '')), RULE), 'the rule is one cause with its six findings across the chapter');
    await page.$eval('.validation-item[data-validation-select="' + readPath.key + '"]', b => b.click()); await page.waitForTimeout(300);
    assert.equal(await page.$eval('.validation-detail h3', e => e.textContent), RULE, 'the detail names the rule');
    assert.ok(await page.$('.validation-detail-actions [data-a-action="fix"]'), 'with the chapter\'s own Open remedy');
    await page.$eval('.validation-detail-actions [data-a-action="fix"]', b => b.click());
    await page.waitForSelector('#inspector .record-card[data-record-card="api-pod"] [data-card-section="design-basis"][open]', {timeout: 8000});
    assert.equal(await page.$eval('#inspector .record-card [data-card-section="design-basis"] > summary', e => e.textContent), 'Design basis · 3 open · 6 draft', 'the card opens on its Design basis, counted from the projection');
    assert.ok(await page.$('#inspector .record-card [data-design-question="read-path"][data-design-state="open"] [data-action="design-decide"][data-topic="reads"]'), 'the open read-path question with its Decide, on the card');
    assert.deepEqual(errors, [], 'no page errors on the way');
    pass('Chapter 5: "A driver asks a design question no decision answers" is one review item per open question per component, with the question and its drivers, one cause across the chapter; Open remedy lands on the record card with its Design basis open and Decide at hand');
  }

  // 1. Chapter 4: one readiness summary with the studio's own Run checks, the findings queued with their actions (or by
  //    object, or by kind), and the chapter in the SDD.
  await open(4);
  assert.deepEqual(await noModes(), {sw: true, body: [], an: false, desk: false}, 'SDD/model reading switch, no vx-* body class, neither the anatomy nor the desk');
  assert.equal(await page.$eval('.vx-switch [data-vx-lens-view="sdd"]', e => e.getAttribute('aria-pressed')), 'true', 'SDD readiness is the default reading');
  await page.click('.vx-switch [data-vx-lens-view="model"]');
  await page.waitForSelector('.vx-model-panel .vx-model-summaries');
  assert.equal(await page.$eval('.vx-switch [data-vx-lens-view="model"]', e => e.getAttribute('aria-pressed')), 'true');
  assert.equal(await count('[data-validation-workspace$=":4:"]'), 1, 'the SDD reading stays mounted');
  assert.equal(await page.locator('[data-validation-workspace$=":4:"]').isVisible(), false, 'the SDD reading is hidden while model integrity is open');
  assert.equal(await region(4).count(), 0, 'and out of the accessibility tree');
  assert.match(await text('.vx-model-panel'), /projection issues across the project[\s\S]*invalid recorded relationship types in Chapter 4[\s\S]*chapter model prompts to investigate/);
  assert.match(await text('.vx-model-limit'), /does not verify architectural decisions, SDD readiness, or visual diagram layout/);
  assert.ok(await page.$('.vx-model-panel a[href*="chapter=4"][href*="tab=model"]'), 'model observations lead to the chapter model');
  await page.click('.vx-switch [data-vx-lens-view="sdd"]');
  assert.equal(await region(4).isVisible(), true, 'the SDD reading returns intact');
  pass('Validate switches between SDD readiness and the connected model structural reading without treating model prompts as checks');
  assert.deepEqual(await counts(4), {pass: 0, of: 6, fix: 0, confirm: 11}, 'passing, to fix and to confirm');
  // Every count names its unit since round 12 (G, GR-UX-02): findings to fix, items to confirm, SDD passages.
  assert.equal(await readiness(4).count(), 1, 'one readiness summary, labelled as such');
  assert.equal(await region(4).getByText('Checks not recorded', {exact: true}).count(), 1, 'the stamp says no check has been recorded');
  assert.match(await readiness(4).locator('details').evaluate(e => e.textContent), /^Check recordNo check has been recorded\. Run checks after reviewing the current definitions\.Counts update with the saved design\. A recorded check is not approval\.$/, 'the check record: not run yet, and a recorded check approves nothing');
  assert.equal(await region(4).locator('[data-l-action="run-checks"]').count(), 1, 'the studio\'s own Run checks sits in the workspace header');
  assert.equal((await region(4).locator('[data-l-action="run-checks"]').textContent()).trim(), 'Run checks');
  assert.equal(await count('[data-l-action="run-checks"]'), 1, 'one Run checks on the page');
  assert.ok(!/block/i.test(await region(4).locator('header').first().innerText() + ' ' + await readiness(4).innerText()), 'the words are to fix, to confirm and passing');
  assert.equal(await region(4).locator('[data-validation-group]').inputValue(), 'priority', 'the findings open as one priority queue');
  assert.equal(await queued(4), 11); assert.equal((await items(4)).length, 11, 'every finding is listed');
  assert.equal(await count('[data-validation-group-id]'), 0, 'no groups in the priority queue');
  const ch4 = await items(4);
  assert.ok(ch4.every(x => x.status === 'Review item' && /^(LR-\d{3}|project)$/.test(x.ref) && x.title), 'each finding names its status in words, the record it concerns and what it asks: ' + JSON.stringify(ch4.slice(0, 2)));
  for (const f of ch4) {
    await select(4, f.key);
    assert.equal(await detail(4).locator('h3').first().textContent(), f.title, 'the selected finding is named in full: ' + f.key);
    const acts = await actions(4);
    assert.deepEqual([acts[0]?.name, acts.at(-2)?.name, acts.at(-1)?.name], ['Open remedy', 'Treat finding…', 'Ask Sol'], 'Open remedy, Treat and Ask Sol for ' + f.key + ': ' + JSON.stringify(acts));
    assert.ok(acts[0].studio.includes('data-l-action=fix') && acts.at(-2).treat && acts.at(-1).ask, 'the studio\'s own editor, Chapter 11\'s treatment and Sol: ' + JSON.stringify(acts));
  }
  await view(4, 'object');
  assert.equal(await groupTools(4), '6 objects Expand all Collapse all');
  let g4 = await groups(4);
  assert.equal(g4.length, 6, 'one group per object');
  assert.deepEqual(g4.map(g => g.open), [true, false, false, false, false, false], 'the groups are closed except the first');
  assert.ok(g4.some(g => g.label === 'LR-001 · Payment API' && g.counts === '2 review items'), 'a group names its object as the SDD does, with what is to fix and to confirm in it: ' + JSON.stringify(g4));
  assert.equal(g4.filter(g => /^LR-\d{3} · \S/.test(g.label)).length, 5, 'the five responsibilities, and the chapter as a whole');
  // rc41 close: the sixth group holds the chapter's own findings and is named for that, never "project"; every count
  // agrees with its number ("1 review item").
  assert.equal(g4.filter(g => g.label === 'The chapter as a whole').length, 1, 'the chapter-level group is named as the chapter as a whole: ' + JSON.stringify(g4.map(g => g.label)));
  assert.ok(g4.every(g => { const m = g.counts.match(/^(\d+) review items?$/); return m && (m[1] === '1') === !/items$/.test(g.counts); }), 'every count agrees with its number: ' + JSON.stringify(g4.map(g => g.counts)));
  assert.equal(g4.reduce((t, g) => t + Number(g.counts.match(/^(\d+) review items?$/)?.[1] || 0), 0), 11, 'every finding sits in a group');
  await region(4).locator('[data-validation-groups="expand"]').click(); await page.waitForTimeout(250);
  assert.equal((await items(4)).length, 11, 'expanded, every group lists its findings');
  await region(4).locator('[data-validation-groups="collapse"]').click(); await page.waitForTimeout(250);
  assert.equal(await count('[data-validation-group-id][open]'), 0);
  await view(4, 'cause');
  assert.equal(await groupTools(4), '4 kinds Expand all Collapse all');
  const kinds = await groups(4);
  assert.ok(kinds.some(k => k.label === 'Decision rationale still needs acceptance' && k.counts === '4 review items'), 'repeated findings of one kind are one group, counted: ' + JSON.stringify(kinds));
  assert.ok(kinds.some(k => k.label === 'Review the responsibility' && k.counts === '5 review items'), 'findings that differ only in the object they name are one kind');
  await region(4).locator('[data-validation-groups="expand"]').click(); await page.waitForTimeout(250);
  assert.ok((await items(4)).every(x => x.ref && x.refShown), 'by kind, each finding names its object');
  assert.equal((await items(4)).length, 11);
  await region(4).locator('[data-validation-groups="collapse"]').click(); await view(4, 'priority');
  pass('Chapter 4 SDD reading: one readiness summary (0 findings to fix, 11 items to confirm, 0/6 SDD passages passing, no check recorded, a recorded check approves nothing) with the studio\'s own Run checks in the header; the 11 findings as one queue, each naming its status, record and question, its Open remedy, Treat and Ask Sol on selection; by object six groups (only the first open), by kind four');

  // 1b. Round 12 (G, GR-UX-03): Chapters 2 to 10 read their findings by cause across the whole chapter, above the findings;
  //     a cause's pick narrows the findings to that cause, and pressed again lists them all again.
  await openCauses(4);
  const causes = await causeRows(4);
  assert.ok(causes.length >= 2 && causes.reduce((t, c) => t + c.n, 0) === 11, 'the 11 items to confirm read as causes: ' + JSON.stringify(causes));
  assert.equal((await region(4).locator('[data-validation-causes] > summary').textContent()).trim(), 'Findings by cause · ' + causes.length + ' causes');
  const first = causes[0];
  await pick(4, first.key);
  assert.equal(await region(4).locator('[data-validation-cause-pick="' + first.key + '"]').getAttribute('aria-pressed'), 'true');
  assert.equal((await region(4).locator('[data-validation-cause-pick="' + first.key + '"]').textContent()).trim(), 'Show all causes');
  assert.equal(await queued(4), first.n, `the pick lists only that cause's ${first.n} findings`);
  assert.ok((await items(4)).every(x => x.key.startsWith('chapter' + first.key + ':')), 'and only them');
  await pick(4, first.key);
  assert.equal(await queued(4), 11, 'pressed again, every finding is listed again');
  assert.equal((await region(4).locator('[data-validation-cause-pick="' + first.key + '"]').textContent()).trim(), 'Show ' + first.n);
  pass(`Chapter 4's findings by cause: ${causes.length} causes across the whole chapter, each with its count and the records it reaches; a pick narrows the findings to that cause (${first.n}) and pressed again lists all 11`);

  // 2. This chapter in the SDD: each passage, its status in words, what is missing, and the Work record that fills it.
  await page.click('.vx-sdd > summary');
  assert.match(await text('.vx-sdd .sdd-part > header'), /This chapter in the SDD[\s\S]*Chapter 4 · Logical application[\s\S]*0\s*passages passing[\s\S]*0\s*passages to fix[\s\S]*6\s*passages to confirm[\s\S]*of 6 SDD passages/i, 'the SDD part counts passages and says so (round 12, G, GR-UX-02)');
  assert.equal(await count('.vx-sdd .sdd-row'), 6);
  assert.equal(await count('.vx-sdd .sdd-row.confirm .sdd-st.confirm'), 6, 'the status is a word with its glyph');
  assert.match(await page.$eval('.vx-sdd .sdd-row[data-sdd-passage="api"]', e => e.innerText), /LR-001\s*Payment API[\s\S]*To confirm[\s\S]*Confirm\s*Decision rationale still needs acceptance[\s\S]*Open in Work/);
  assert.match(await page.$eval('.vx-sdd .sdd-row[data-sdd-passage="api"] a.sdd-open', e => e.getAttribute('href')), /chapter=4&tab=work&object=api/);
  assert.match(await text('.vx-sdd .sdd-note'), /rule-based checks; it approves nothing/);
  // "To confirm" is the Review items category: the same count, and the queue holds those items only.
  await region(4).locator('[data-validation-filter="review"]').click(); await page.waitForTimeout(300);
  assert.equal(await region(4).locator('[data-validation-filter="review"]').getAttribute('aria-pressed'), 'true');
  assert.match((await region(4).locator('[data-validation-filter="review"]').innerText()).replace(/\s+/g, ' ').trim(), /^Review items 11$/, 'Review items counts the 11 to confirm');
  assert.equal(await queued(4), 11); assert.ok((await items(4)).every(x => x.status === 'Review item'));
  await region(4).locator('[data-validation-filter="all"]').click(); await page.waitForTimeout(300);
  // What the chapter's models show stays a prompt beside the checks, folded under its count.
  await page.waitForSelector('.vx-obs:not([hidden])', {timeout: 8000});
  assert.match(await page.$eval('.vx-obs > summary', e => e.textContent), /^Model observations · 7$/);
  await page.click('.vx-obs > summary');
  assert.match(await text('.vx-obs'), /Chapter 4 models also show · 7[\s\S]*not checks/i);
  assert.ok(await page.$('.vx-obs a[href*="chapter=4"][href*="tab=model"][href*="model=whole"]'), 'the whole design is on the Model tab');
  assert.ok(!(await page.$('.vx-obs [data-vx]')), 'the desk and the anatomy remain on Model');
  pass('"This chapter in the SDD" lists the 6 passages Chapter 4 fills, each with its status in words, what is missing or to confirm, and an Open in Work link to the record that fills it; Review items holds the 11 to confirm; the models\' observations stay prompts and send the whole design to the Model tab');

  // 3. Run checks records a run: the stamp says it is current, the record when it ran.
  await region(4).getByRole('button', {name: 'Run checks'}).click();
  await region(4).getByText('Checks current', {exact: true}).waitFor({timeout: 8000});
  assert.equal(await readiness(4).locator('details time').count(), 1, 'the check record names when it ran');
  assert.match(await readiness(4).locator('details').evaluate(e => e.textContent), /Matches the saved chapter\./);
  pass('Run checks, from the header, records the chapter\'s own checks through its existing command; the stamp then reads current and the record when the checks ran');

  // 4. Chapter 8: a long list stays a page; the passages name what is missing.
  await open(8);
  // 44 to confirm since the owner's rc38 snapshot: interfaces-domain.js asks to clarify the accountable owner of each of
  // the four data objects whose owner is named as an architecture object (data-accountable-owner).
  assert.deepEqual(await counts(8), {pass: 0, of: 12, fix: 38, confirm: 44});
  assert.equal(await count('.vx-sdd .sdd-row'), 12, 'the chapter as a whole, seven contracts and four data objects');
  await page.click('.vx-sdd > summary');
  assert.match(await page.$eval('.vx-sdd .sdd-row[data-sdd-passage="rest"]', e => e.innerText), /IF-001[\s\S]*To fix[\s\S]*Missing\s*Define IF-001 contract\s*\+\d+ more in the findings above[\s\S]*Open in Work/, 'a compact passage row: the first thing missing and how many more');
  await page.click('.vx-sdd > summary');
  assert.equal(await region(8).locator('[data-validation-causes]').evaluate(e => e.open), false, 'the dense causes stay folded');
  assert.equal(await count('[data-validation-group-id]'), 0, 'the priority queue has no groups');
  assert.equal(await queued(8), 82); assert.equal((await items(8)).length, 40, 'a long list draws its first 40');
  assert.match((await region(8).locator('[data-validation-more]').textContent()).trim(), /^Show 40 more · 40 of 82$/);
  const st8 = (await items(8)).map(x => x.status);
  assert.ok(st8.lastIndexOf('Content gap') < st8.indexOf('Review item') || !st8.includes('Review item'), 'content gaps first, then review items: ' + st8.join(','));
  const words8 = await stageWords();
  deferred.push(['Chapter 8\'s checks are under 900 words on the stage: ' + words8, () => assert.ok(words8 < 900, 'Chapter 8\'s checks are under 900 words on the stage: ' + words8)]);
  const if1 = (await items(8)).find(x => x.title === 'Define IF-001 contract');
  assert.ok(if1, 'IF-001\'s missing contract is among the first findings');
  await select(8, if1.key);
  assert.match(await detail(8).locator('header p').first().textContent(), /purpose, owner, operation, protocol, and contract version/, 'the finding says in full what is missing');
  assert.equal(if1.status, 'Content gap');
  assert.deepEqual((await actions(8)).map(a => a.name), ['Open remedy', 'Treat finding…', 'Ask Sol']);
  await view(8, 'object');
  const g8 = await groups(8);
  assert.ok(g8.length > 1 && g8.filter(g => g.open).length === 1 && g8[0].open, 'by object, only the top-ranked group is open');
  assert.match(g8[0].counts, /^\d+ gaps · \d+ review items$/, 'its counts say what is to fix and to confirm: ' + g8[0].counts);
  await view(8, 'cause');
  const k8 = await groups(8);
  assert.ok(k8.some(g => g.label === 'Define contract' && g.counts === '7 gaps'), 'by kind, repeated findings are one group named by what they share: ' + JSON.stringify(k8.slice(0, 3)));
  assert.ok(k8.filter(g => g.open).length === 1 && k8[0].open, 'by kind too, only the top-ranked group is open');
  await view(8, 'priority');
  assert.ok((await page.evaluate(() => document.querySelector('.studio').scrollHeight)) < 6000, 'Chapter 8\'s checks stay a page');
  pass('Chapter 8: 38 findings to fix and 44 items to confirm, 82 queued with the first 40 drawn, content gaps first; only the top-ranked group is open, by object or by kind; the SDD section is a compact table naming the first thing each of its 12 passages is missing and how many more, the finding saying it in full (IF-001\'s purpose, owner, operation, protocol and version)');

  // 5. Chapter 1: the same checks, with Chapter 1's own findings.
  await open(1);
  assert.equal(await region(1).count(), 1, 'Chapter 1\'s validation region');
  assert.deepEqual(await counts(1), {pass: 1, of: 22, fix: 1, confirm: 22});
  assert.ok(await region(1).locator('[data-validation-group]').count() && await queue(1).count(), 'Chapter 1\'s findings are queued and can be grouped');
  assert.match(await page.$eval('.vx-sdd .sdd-row[data-sdd-passage="REQ-005"]', e => e.textContent.replace(/\s+/g, ' ')), /REQ-005[\s\S]*To fix[\s\S]*Missing\s*Make acceptance testable/);
  assert.ok(await page.$('.vx-sdd .sdd-row[data-sdd-passage="brief"]'), 'the brief is a passage');
  assert.equal(await region(1).getByRole('button', {name: 'Run checks'}).count(), 1, 'Chapter 1\'s Run checks sits in the header');
  const ch1 = await items(1);
  assert.equal(ch1.length, await queued(1));
  for (const f of ch1) { await select(1, f.key); const acts = await actions(1); assert.deepEqual(acts.map(a => a.name), ['Open remedy', 'Treat finding…', 'Ask Sol'], 'each Chapter 1 finding opens its editor, can be treated and asked of Sol: ' + f.key); assert.ok(acts[0].fix && acts[1].treat && acts[2].ask); }
  pass('Chapter 1: the same readiness (1 finding to fix, 22 items to confirm, 1/22 SDD passages passing), its ' + ch1.length + ' findings each with Open remedy, Treat and Ask Sol, and its passages — the brief and each record — with REQ-005\'s missing testable acceptance named');

  // 6. Chapter 11: its own checks, the review desk one link away, nothing mounted from elsewhere.
  await open(11);
  assert.deepEqual(await counts(11), {pass: 0, of: 11, fix: 2, confirm: 8}, 'Chapter 11 names its own figures final checks (round 12, G, GR-UX-02)');
  await page.click('.vx-sdd > summary');
  const desk = page.getByRole('link', {name: 'Open the review desk'});
  assert.ok(await desk.count() && /chapter=11/.test(await desk.first().getAttribute('href')) && /tab=model/.test(await desk.first().getAttribute('href')) && await desk.first().isVisible(), 'the review desk is reached from Chapter 11\'s checks');
  assert.match(await text('.vx-sdd'), /Document ownership[\s\S]*Executive summary[\s\S]*Missing\s*Write the executive summary[\s\S]*Performance specification/);
  await page.click('.vx-sdd > summary');
  assert.deepEqual(await region(11).locator('[data-validation-set]').evaluateAll(xs => xs.map(x => [x.dataset.validationSet, x.getAttribute('aria-pressed'), x.innerText.replace(/\s+/g, ' ').trim()])), [['final', 'true', 'Final review checks 10'], ['source', 'false', 'Inherited findings 558']], 'the final review checks, then the inherited findings, each counted');
  const final = await items(11);
  assert.equal(final.length, 10, 'the final checks, one item per check');
  assert.deepEqual([final[0].status, final[0].title], ['Content gap', 'Frame the solution design document']);
  assert.ok(final.some(x => x.title === 'Assess 211 source findings to fix or treat'), 'the 211 source findings to fix or treat are one final check');
  assert.deepEqual([...new Set(final.map(x => x.status))].sort(), ['Content gap', 'Review item'], 'the status in words');
  assert.ok(!/block/i.test(await region(11).innerText()), 'never "blocking"');
  await region(11).locator('[data-validation-set="source"]').click(); await page.waitForTimeout(400);
  assert.equal(await queued(11), 558);
  const inherited = await items(11);
  assert.ok(inherited.every(x => /^source:C(10|[1-9]):\S+$/.test(x.key) && /^Ch (10|[1-9]) · \S/.test(x.ref)), 'each source finding names the chapter it comes from');
  assert.deepEqual((await actions(11)).map(a => a.name), ['Treat this finding', 'Open source', 'Ask Sol'], 'a source finding\'s actions are compact: Treat, Open its source, Ask Sol');
  await view(11, 'object');
  const g11 = await groups(11);
  assert.ok(g11.length > 1 && g11.filter(g => g.open).length === 1 && g11[0].open, 'Chapter 11\'s source findings: the groups are closed except the first');
  assert.ok(g11.every(g => /^Chapter (10|[1-9]) · \S/.test(g.label)), 'source findings are grouped by the chapter and object they come from: ' + g11.slice(0, 3).map(g => g.label).join(' | '));
  await view(11, 'priority');
  assert.deepEqual(await noModes(), {sw: true, body: [], an: false, desk: false});
  pass('Chapter 11: 2 final checks to fix and 8 to confirm of 10, each with its status in words; the 558 inherited findings a separate set, each naming its chapter, with Treat, Open source and Ask Sol, by object grouped by chapter and object with only the first open; its own passages (ownership, summary, …, performance specification); the review desk is a link to Chapter 11\'s Model');

  // 6b. Round 12 (G, GR-UX-03): Chapter 11's source findings by cause, across Chapters 1 to 10, with a filter to one cause.
  await openCauses(11);
  const src = await causeRows(11);
  assert.ok(src.length >= 2 && src.every(c => c.treatments), 'the source findings read by cause, each with its current treatments: ' + src.length);
  assert.equal(src.reduce((t, c) => t + c.n, 0), 558, 'the causes account for every inherited finding');
  assert.equal((await region(11).locator('[data-validation-causes] > summary').textContent()).trim(), 'Findings by cause · ' + src.length + ' causes');
  assert.ok((await region(11).locator('[data-validation-source] option').evaluateAll(os => os.map(o => o.value))).every(v => v === 'all' || (+v >= 1 && +v <= 10)), 'the source chapters are Chapters 1 to 10');
  await pick(11, src[0].key);
  assert.equal(await queued(11), src[0].n); assert.equal((await items(11)).length, Math.min(40, src[0].n), 'the pick lists that cause\'s findings only, a page at a time');
  await pick(11, src[0].key);
  assert.equal(await queued(11), 558, 'pressed again, every source finding is listed again');
  pass(`Chapter 11's source findings by cause: ${src.length} causes across Chapters 1 to 10 with their treatments; a pick lists one cause's findings and pressed again lists them all`);

  await page.click('.tabs [data-tab="output"]'); await page.waitForSelector('[data-output-workspace$=":11"][data-bound="1"]', {timeout: 8000}); await page.waitForTimeout(500);
  // rc38+ (rc41 W4): Output is the owner's output workspace (output-workspace.js): a readiness line, the documents to
  // choose from, the chosen document with its formats and a generated preview, and the sources, passages and handoff
  // in panels below. Chapter 11's working SDD is chosen first with its edition, audience and formats; the delivery
  // exchange is a document of its own; the project data once; the passages in the sources panel's disclosure.
  {
    const out = page.getByRole('region', {name: 'Chapter 11 output'});
    assert.equal(await count('.vx-stage'), 0, 'Chapter 11 has no frame box of the old kind');
    const outText = (await out.innerText()).replace(/\s+/g, ' ');
    assert.ok(outText.includes('2 final checks to fix · 8 final checks to confirm') && outText.includes('0/11 SDD passages passing'), 'Output keeps the SDD readiness');
    assert.deepEqual(await out.getByRole('navigation', {name: 'Choose a document'}).locator('button[data-output-document]').evaluateAll(xs => xs.map(x => [x.dataset.outputDocument, x.getAttribute('aria-pressed')])), [['sdd', 'true'], ['delivery', 'false'], ['frozen', 'false']], 'the working SDD first, the delivery exchange and the frozen baseline beside it; the SDD named once');
    const form = out.locator('form.rv-export-form');
    assert.equal(await form.count(), 1, 'the SDD keeps its working export form');
    assert.deepEqual([await form.locator('select[name="edition"]').count(), await form.locator('select[name="audience"]').count(), await form.locator('button[name="format"]').evaluateAll(xs => xs.map(x => x.value))], [1, 1, ['md', 'html', 'json']], 'its edition, audience and every format');
    await out.locator('button[data-output-document="delivery"]').click(); await page.waitForTimeout(300);
    assert.deepEqual(await out.locator('[data-output-document-view] a[href*="/api/export"]').evaluateAll(as => as.map(a => a.textContent.trim() + ' ' + a.getAttribute('href'))), ['JSON /api/export?chapter=11&format=delivery'], 'Delivery exchange (JSON) is offered where Chapter 11 says it is');
    await out.locator('button[data-output-document="sdd"]').click(); await page.waitForTimeout(300);
    assert.equal(await count('a[href="/api/export?format=json"]'), 1, 'the project data once');
    await out.locator('[data-output-panel="sources"]').click(); await page.waitForTimeout(300);
    assert.deepEqual(await page.$$eval('details.output-passages', ds => ds.map(d => d.open + ':' + d.querySelectorAll('.sdd-table').length + ':' + !!d.closest('#output-sources-11'))), ['false:1:true'], 'the passages disclosure closed with the table inside, in the sources panel');
    const order = await page.evaluate(() => { const all = [...document.querySelectorAll('*')], at = sel => all.indexOf(document.querySelector(sel)); return [at('form.rv-export-form'), at('details.output-passages'), at('#output-handoff-11')]; });
    assert.ok(order.every((x, i) => x >= 0 && (i === 0 || x > order[i - 1])), 'the export form, then the passages, then the handoff: ' + order.join(' < '));
  }
  pass('Chapter 11 Output keeps its SDD readiness and working document with its edition, audience and formats; the SDD named once, the delivery exchange and the project data offered, the passages in the sources panel\'s disclosure');

  // 7. Old links that asked Validate for the desk or the anatomy are told where they are now.
  await open(5, '&validate=desk');
  assert.equal(await region(5).getByText('The review desk is in Chapter 11 Model.').count(), 1, 'the old desk link is told where the desk is');
  assert.match(await region(5).getByRole('link', {name: 'Open Model'}).getAttribute('href'), /chapter=11&tab=model$/, 'with a link to Chapter 11\'s Model');
  await open(6, '&validate=model');
  assert.equal(await region(6).getByText('The whole design is a view on Model.').count(), 1);
  assert.match(await region(6).getByRole('link', {name: 'Open Model'}).getAttribute('href'), /chapter=6&tab=model&model=whole$/);
  assert.deepEqual(await noModes(), {sw: true, body: [], an: false, desk: false});
  pass('an old link that asks Validate for the desk or the whole design says where each now is, and mounts neither');

  // 8. A blank project: nothing is recorded, so nothing "blocks"; the findings are what there is to do (U2-05).
  await page.goto(base + '/?view=projects', {waitUntil: 'networkidle'});
  const blank = await page.evaluate(async () => (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Validate blank', template: 'blank', brief: ''})})).json());
  await open(4, '&project=' + blank.document.id);
  const blankCounts = await counts(4);
  assert.ok(blankCounts.fix + blankCounts.confirm === await queued(4) && await queued(4) > 0, 'the findings are what there is to do: ' + JSON.stringify(blankCounts));
  assert.ok(!/block/i.test(await region(4).innerText()) && !/block/i.test(await page.$eval('.vx-sdd', e => e.textContent)), 'no "blocking" wording before the first record');
  assert.ok(!/illustrative/i.test(await page.$eval('#progress-count', e => e.textContent)), 'no illustrative note on a project without illustrative records');
  pass('on a blank project the readiness counts what there is to fix and to confirm, as findings; nothing is called blocking or illustrative until records exist');

  // 8b. Round 6 (Contract F) and round 26 (D-26-13), on the rc38 output workspace: Chapter 3's Output offers its register
  // with its formats and a generated preview, the decision records as MADR files in a zip, its part of the SDD, its
  // records with Open in Work, and the later documents it feeds.
  await page.goto(base + '/?chapter=3&tab=output', {waitUntil: 'networkidle'}); await page.waitForSelector('[data-output-workspace$=":3"][data-bound="1"]', {timeout: 8000}); await page.waitForTimeout(700);
  {
    const out = page.getByRole('region', {name: 'Chapter 3 output'});
    // rc41 W2 (reconciled at the close): the documents are the chapter strip's items; a button holds the document's name
    // and its item's meta says what it is (the words the button carried before); the phone uses the same strip.
    const docs = await out.locator('button[data-output-document]').evaluateAll(xs => xs.map(x => [x.dataset.outputDocument, x.getAttribute('aria-pressed'), (x.innerText + ' ' + (x.closest('.chapter-strip-item')?.querySelector('.chapter-strip-purpose')?.textContent || '')).replace(/\s+/g, ' ').trim()]));
    assert.deepEqual(docs, [['decisions', 'true', 'Decision register Chapter register'], ['madr', 'false', 'Decision records (MADR) Working document'], ['sdd-contribution', 'false', 'This chapter in the SDD SDD review registers']], 'the register first, the MADR pack and this chapter\'s part of the SDD');
    assert.equal(await out.locator('[data-output-select]').count(), 0, 'no second document picker: on a phone the one strip scrolls sideways');
    assert.deepEqual(await out.locator('.chapter-strip[data-chapter-strip="output"] .chapter-strip-item').evaluateAll(xs => xs.map(x => x.dataset.chapterStripItem)), docs.map(d => d[0]), 'the strip offers the same documents, in order');
    const view = out.locator('[data-output-document-view]');
    assert.deepEqual(await view.locator('a[href*="/api/export"]').evaluateAll(as => as.map(a => a.textContent.trim() + ' ' + a.getAttribute('href') + (a.getAttribute('target') ? ' ' + a.getAttribute('target') : ''))), ['Open preview in new tab /api/export?chapter=3&format=html&view=1 _blank', 'Markdown /api/export?chapter=3&format=md', 'HTML /api/export?chapter=3&format=html'], 'each format is a link to the export route, once, with a new-tab preview');
    // The generated preview is read through its frame once its document has loaded.
    const framed = async pattern => { await page.waitForFunction(p => { const f = document.querySelector('[data-output-document-view] iframe'); return f && new RegExp(p).test(f.src) && f.contentDocument?.readyState === 'complete' && f.contentDocument.querySelector('h1'); }, pattern, {timeout: 15000}); return (await page.$('[data-output-document-view] iframe')).contentFrame(); };
    const frame = await framed('chapter=3&format=html&view=1');
    const previewed = await frame.evaluate(() => ({h1: document.querySelector('h1')?.textContent, first: document.querySelector('h1 + p')?.textContent || '', adr: document.body.innerText.includes('ADR-001')}));
    assert.ok(/^AIW V5 · Bank Payment Journey/.test(previewed.h1) && /^Project revision \d+ · \d{1,2} [A-Z][a-z]{2} \d{4} · a working snapshot/.test(previewed.first) && previewed.adr, 'the preview holds the decisions with the revision and the date first: ' + JSON.stringify(previewed));
    assert.equal(await out.locator('details.output-secondary').evaluate(d => d.open), false, 'the later documents are a secondary disclosure');
    await out.locator('details.output-secondary > summary').click();
    assert.deepEqual(await out.locator('details.output-secondary a').evaluateAll(as => as.map(a => a.textContent.trim() + ' ' + a.getAttribute('href'))), ['Component specification, one per component /?chapter=5&tab=output', 'Solution design document (full and executive editions) /?chapter=11&tab=output', 'Project data (JSON) /api/export?format=json'], 'the documents this chapter feeds, where each is offered, and the project data once');
    assert.equal(await count('[data-d-action="export-md"], [data-d-action="export-json"]'), 0, 'the studio offers no export button of its own on Output');
    await out.locator('button[data-output-document="sdd-contribution"]').click();
    assert.equal(await view.locator('iframe').getAttribute('data-output-find'), 'Chapter 3 —', 'this chapter\'s part of the SDD opens the review registers annex at this chapter');
    const annex = await framed('annex=registers'); await page.waitForTimeout(500);
    const landed = await annex.evaluate(() => { const h = [...document.querySelectorAll('h1,h2')].find(x => x.textContent.trim().startsWith('Chapter 3 —')); return h ? {text: h.textContent.trim(), top: Math.round(h.getBoundingClientRect().top)} : null; });
    assert.ok(landed && /^Chapter 3 — Decisions/.test(landed.text) && landed.top >= -2 && landed.top < 120, 'opened at this chapter\'s register: ' + JSON.stringify(landed));
    await out.locator('button[data-output-document="decisions"]').click();
    await out.locator('[data-output-panel="sources"]').click(); await page.waitForTimeout(300);
    const passages = await page.$$eval('details.output-passages', ds => ds.map(d => ({open: d.open, summary: d.querySelector(':scope > summary')?.innerText.replace(/\s+/g, ' ').trim(), parts: d.querySelectorAll('.sdd-part .sdd-table').length, panel: !!d.closest('#output-sources-3')})));
    assert.deepEqual(passages, [{open: false, summary: 'Inspect SDD passages', parts: 1, panel: true}], 'one SDD passages disclosure, closed, named, with the passage table inside, in the sources panel');
    // Round 26 (R26-O-03), with the owner's rc38 Inspect: each of the chapter's records is a read-only row with Inspect and
    // Open in Work, which opens the chapter's Work with the record selected.
    const records = await page.$$eval('#output-sources-3 .out-records', ([s]) => ({count: s.querySelector('.out-records-count')?.innerText, rows: [...s.querySelectorAll('.out-record')].map(r => ({id: r.dataset.record, type: r.dataset.type, controls: [...r.querySelectorAll('a, button')].map(c => c.tagName + ':' + c.textContent.trim())}))}));
    assert.ok(records.rows.length >= 3 && /^\d+ records?\b/.test(records.count) && Number(records.count.match(/^\d+/)[0]) === records.rows.length, 'every record of Chapter 3\'s set is a row: ' + records.count);
    assert.ok(records.rows.every(r => r.controls.join('|') === 'BUTTON:Inspect|A:Open in Work') && records.rows.filter(r => r.type === 'decision').map(r => r.id).join(',') === 'ADR-001,ADR-002,ADR-003', 'Inspect and Open in Work on each row, the decisions first: ' + JSON.stringify(records.rows.slice(0, 3)));
    await page.click('#output-sources-3 .out-record[data-record="ADR-002"] a[data-out-work]'); await page.waitForFunction(() => /tab=work/.test(location.search) && /decision=ADR-002|object=ADR-002/.test(location.search), null, {timeout: 8000}); await page.waitForTimeout(500);
    assert.ok(/^ADR-002/.test(await page.$eval('#inspector', e => e.innerText.replace(/\s+/g, ' ').replace(/^.*?(ADR-\d+)/, '$1'))), '"Open in Work" opens Chapter 3\'s Work with ADR-002 as the selected record');
    await page.goto(base + '/?chapter=2&tab=output', {waitUntil: 'networkidle'}); await page.waitForSelector('[data-output-workspace$=":2"][data-bound="1"]', {timeout: 8000}); await page.waitForTimeout(700);
    const out2 = page.getByRole('region', {name: 'Chapter 2 output'});
    assert.deepEqual(await out2.locator('button[data-output-document]').evaluateAll(xs => xs.map(x => x.dataset.outputDocument)), ['quality', 'ars', 'sdd-contribution'], 'Chapter 2 offers its register, the requirements specification and its part of the SDD, and no decision records');
    await out2.locator('button[data-output-document="ars"]').click(); await page.waitForTimeout(300);
    assert.ok(await out2.locator('[data-output-document-view] a.btn[href*="document=ars"][href*="format=json"]').count(), 'the requirements specification in JSON too');
    await out2.locator('details.output-secondary > summary').click();
    assert.ok(await out2.locator('details.output-secondary a[href="/?chapter=5&tab=output"]').filter({hasText: 'Component specification, one per component'}).count(), 'the component specification it feeds is offered in Chapter 5');
    pass('Chapters 1–10 Output open with their documents: the chapter register with its formats as links and a generated preview, the later documents with where each is offered, the chapter\'s part of the SDD at its register, the passages in the sources panel, and its records with Open in Work');
  }
  {
    const dlCtx = await browser.newContext({viewport: {width: 1440, height: 900}, acceptDownloads: true}), dlPage = await dlCtx.newPage(); dlPage.on('pageerror', e => errors.push(e.message));
    await dlPage.goto(base + '/?chapter=3&tab=output', {waitUntil: 'networkidle'}); await dlPage.waitForSelector('[data-output-workspace$=":3"][data-bound="1"]', {timeout: 8000});
    await dlPage.click('button[data-output-document="madr"]'); await dlPage.waitForSelector('[data-output-document-view] [data-vx-madr="zip"]', {timeout: 8000});
    assert.match(await dlPage.$eval('[data-output-document-view]', e => e.innerText), /Decision records \(MADR\)[\s\S]*3 files in a zip[\s\S]*the record stays the authority/);
    const [zip] = await Promise.all([dlPage.waitForEvent('download', {timeout: 15000}), dlPage.click('[data-output-document-view] [data-vx-madr="zip"]')]);
    assert.equal(zip.suggestedFilename(), 'AIW_Bank_Payment_Journey_Decision_Records_MADR.zip');
    await dlPage.waitForFunction(() => /^Downloaded AIW_Bank_Payment_Journey_Decision_Records_MADR\.zip · 3 decision records · \d+ (KB|bytes)\.$/.test(document.querySelector('[data-output-workspace] .out-status')?.innerText || ''), null, {timeout: 8000});
    const buf = (await import('node:fs')).readFileSync(await zip.path());
    let e = buf.length - 22; while (e > 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
    const n = buf.readUInt16LE(e + 10), names = []; let o = buf.readUInt32LE(e + 16);
    for (let i = 0; i < n; i++) { const len = buf.readUInt16LE(o + 28); names.push(buf.toString('utf8', o + 46, o + 46 + len)); o += 46 + len + buf.readUInt16LE(o + 30) + buf.readUInt16LE(o + 32); }
    assert.deepEqual(names.map(x => x.slice(0, 8)), ['ADR-001-', 'ADR-002-', 'ADR-003-'], 'one MADR file per decision: ' + names.join(', '));
    assert.ok(buf.toString('utf8').includes('# ADR-001 · When should the customer receive a payment acknowledgement?'), 'the files carry the decisions');
    await dlCtx.close();
    pass('Chapter 3\'s Output offers the decision records as MADR: a zip with one file per decision');
  }

  // 10. The domain lens (round 12, workstream C): on Chapter 11's Validate, chosen by the person with a reason, a concern
  // marked not applicable the same way; its passage in the SDD table; its reading in Chapter 11's companion.
  await open(11);
  await page.waitForSelector('#domain-lens', {timeout: 8000, state: 'attached'});
  // rc38+: the lens sits in the workspace's context, folded under "Domain coverage and review questions".
  assert.equal(await page.$eval('#domain-lens', e => e.tagName + ':' + e.open + ':' + e.querySelector(':scope > summary')?.textContent.trim()), 'DETAILS:false:Domain coverage and review questions');
  await page.click('#domain-lens > summary');
  assert.match(await text('#domain-lens'), /Domain lens\s*No lens chosen[\s\S]*A lens lists what a solution in a domain must address[\s\S]*Use the core-banking lens/i);
  assert.equal(await count('.vx-sdd [data-sdd-passage="lens"]'), 0, 'no passage before a lens is chosen');
  const lensDialog = 'dialog.vx-lens-dialog[open]';
  await page.click('#domain-lens [data-vx-lens="choose"]'); await page.waitForSelector(lensDialog + ' textarea[name="reason"]');
  await page.click(lensDialog + ' button[type="submit"]'); await page.waitForTimeout(250);
  assert.ok(await page.$(lensDialog), 'a choice without a reason is not sent');
  await page.fill(lensDialog + ' textarea[name="reason"]', 'This test reads the reference as a core-banking platform.');
  await page.click(lensDialog + ' button[type="submit"]');
  await page.waitForSelector('#domain-lens .vx-lens-table tbody tr', {timeout: 8000}); await page.waitForTimeout(500);
  assert.equal(await count('#domain-lens .vx-lens-table tbody tr'), 17, 'one row per concern');
  assert.match(await text('#domain-lens header'), /Domain lens\s*Core banking[\s\S]*addressed[\s\S]*partly[\s\S]*not addressed[\s\S]*of 17 concerns/i);
  assert.match(await text('#domain-lens .vx-lens-acts'), /Chosen by [^:]+ on \d{4}-\d{2}-\d{2}: This test reads the reference as a core-banking platform\./);
  await page.click('.vx-sdd > summary');
  assert.match(await page.$eval('.vx-sdd [data-sdd-passage="lens"]', e => e.innerText), /Domain lens · core banking[\s\S]*To confirm[\s\S]*Open the lens/);
  await page.click('.vx-sdd > summary');
  // The lens adds its own passage, to confirm; it blocks nothing: Chapter 11's findings to fix and to confirm are the same.
  assert.deepEqual(await counts(11), {pass: 0, of: 12, fix: 2, confirm: 8}, 'the lens blocks nothing: Chapter 11\'s counts are the same, its passage one more to confirm');
  await page.click('#domain-lens tr[data-lens-concern="fx"] [data-vx-lens="na"]'); await page.waitForSelector(lensDialog + ' textarea[name="reason"]');
  await page.fill(lensDialog + ' textarea[name="reason"]', 'The reference holds one currency.');
  await page.click(lensDialog + ' button[type="submit"]');
  await page.waitForSelector('#domain-lens tr[data-lens-concern="fx"] [data-vx-lens="applies"]', {timeout: 8000});
  assert.match(await page.$eval('#domain-lens tr[data-lens-concern="fx"]', e => e.innerText), /Not applicable[\s\S]*Marked not applicable: The reference holds one currency\.[\s\S]*Applies again/);
  assert.ok(!/—/.test(await text('#domain-lens')), 'the lens reads without an em-dash');
  await page.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'});
  // rc38: the Model companion is in the Details column, opened from the toolbar as a viewer does.
  if (!await page.locator('#inspector .cm-companion').isVisible()) { await page.locator('.workspace-tools [data-panel-toggle]').click(); await page.waitForSelector('body[data-panel="open"]'); }
  await page.waitForSelector('#inspector .cm-companion .dk-lens', {timeout: 10000});
  assert.match(await page.$eval('#inspector .cm-companion .dk-lens', e => e.innerText), /Domain lens · core banking[\s\S]*17 concerns[\s\S]*addressed[\s\S]*1 not applicable[\s\S]*Ask next[\s\S]*Open the lens/i);
  const lensPhone = await browser.newContext({viewport: {width: 390, height: 844}}), p3 = await lensPhone.newPage(); p3.on('pageerror', e => errors.push(e.message));
  await p3.goto(base + '/?chapter=11&tab=validate', {waitUntil: 'networkidle'}); await p3.waitForSelector('#domain-lens', {timeout: 8000, state: 'attached'}); await p3.click('#domain-lens > summary'); await p3.waitForSelector('#domain-lens .vx-lens-table', {timeout: 8000}); await p3.waitForTimeout(400);
  assert.equal(await p3.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'the lens fits a 390 px phone');
  await lensPhone.close();
  pass('the domain lens on Chapter 11: offered, folded, with no lens chosen; chosen only with a reason, through the dialog; then one row per concern with its state, records and questions, the choice and its reason kept, its passage in the SDD table, and Chapter 11\'s findings unchanged; a concern marked not applicable with a reason; the companion on Chapter 11\'s Model reads the counts and the questions; it fits a phone');

  // 9a. rc41 close (C30): the chapter strip's ring on Work's numbered strip tells a fully confirmed stage by its shape — "✓"
  // in place of the number — not by hue alone; a recorded stage keeps its number. The strip is the product's own
  // (work-frame.js workStagesHTML, imported by the page) under the page's own stylesheets; the probe is removed after.
  await page.goto(base + '/?chapter=1&tab=work', {waitUntil: 'networkidle'}); await page.waitForSelector('nav.work-stages');
  const ring = await page.evaluate(async () => {
    const {workStagesHTML} = await import('/work-frame.js'), host = document.createElement('div');
    host.innerHTML = workStagesHTML([['brief', 'Project brief'], ['context', 'People and boundaries'], ['journey', 'User journey']], 'context', 'data-r-section', null, 1, {brief: {goal: 'A goal', problem: 'A problem', confirmed: true}, artefacts: [{id: 'probe-step', type: 'journey', title: 'A step'}]});
    document.querySelector('.stage').prepend(host);
    const at = id => host.querySelector('[data-work-stage="' + id + '"]'), mark = id => getComputedStyle(at(id).querySelector(':scope > button'), '::before').content;
    const out = {states: ['brief', 'context', 'journey'].map(id => at(id).dataset.chapterStripState), marks: ['brief', 'context', 'journey'].map(mark)};
    host.remove(); return out;
  });
  assert.deepEqual(ring, {states: ['confirmed', 'empty', 'recorded'], marks: ['"✓"', '"2"', '"3"']}, 'a confirmed stage shows ✓; the current and a recorded stage show their numbers');
  pass('Work’s strip shows "✓" for a fully confirmed stage and the number for the current and a recorded stage');

  // 9. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=8&tab=validate', {waitUntil: 'networkidle'}); await p2.waitForSelector('#vx-sdd .sdd-table', {state: 'attached'}); await p2.waitForTimeout(400);
  assert.equal(await p2.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal page scroll');
  // rc41 close (C29): at 390 CSS px (a phone, or 400 % zoom) the readings' help and "Create focused case" stay on screen,
  // below the readings, which scroll sideways in their own row; the help opens and reads the current reading.
  {
    const shown = await p2.evaluate(() => [document.querySelector('.vx-switch .vx-reading-help > summary'), document.querySelector('.vx-switch [data-vx-case-create]')].map(e => { const r = e?.getBoundingClientRect(); return !!e && e.checkVisibility() && r.width > 0 && r.left >= 0 && r.right <= innerWidth; }));
    assert.deepEqual(shown, [true, true], '"About these readings" and "Create focused case" are on screen at 390 px');
    await p2.click('.vx-switch .vx-reading-help > summary');
    assert.match(await p2.$eval('.vx-switch .vx-lens-help', e => e.checkVisibility() ? e.innerText : ''), /^Start here: resolve missing content/, 'the help opens and reads the SDD reading');
    assert.equal(await p2.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'still no horizontal page scroll');
    await p2.click('.vx-switch .vx-reading-help > summary');
  }
  await p2.click('.vx-switch [data-vx-lens-view="model"]');
  try { await p2.waitForSelector('.vx-model-panel .vx-model-summaries', {timeout: 60000}); }
  catch (e) { throw Error('Phone Model integrity did not render: ' + await p2.$eval('.vx-model-panel', el => el.innerText).catch(() => 'panel missing'), {cause: e}); }
  assert.equal(await p2.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'model integrity also fits a 390 px phone');
  assert.ok(await p2.$('.vx-model-panel a[href*="chapter=8"][href*="tab=model"]'), 'phone model reading keeps the path to the picture');
  await phone.close();
  pass('on a 390 px phone both Validate readings fit without horizontal page scroll');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');

  const unmet = []; for (const [name, check] of deferred) { try { check(); pass(name); } catch (e) { unmet.push(e.message); } }
  assert.deepEqual(unmet, [], 'the readings measured on the way are met (' + checks.length + ' checks passed before them)');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); rmSync(db + '-wal', {force: true}); rmSync(db + '-shm', {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'Validate: the chapter\'s checks and its passages in the SDD (rendered)', passed: checks.length, checks}, null, 2));
