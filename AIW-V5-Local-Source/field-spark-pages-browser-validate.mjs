// The field spark on the Chapter 1–3 page apps in a real browser (round 2, I2-12), against an isolated local server with
// no language model connected. Chapter 1: a requirement added for a journey step (the journey map's own path) shows
// sparks on its free-text fields only; the description spark offers the step's recorded description, cited, in the
// first of three bands, with the Sol band saying exactly that Sol is not connected; Accept fills the form and nothing
// is saved; saving through the chapter's own command stores the suggestion as provenance, read back from the server.
// REQ-005's acceptance is confirmed from its journey step, actor and outcome, saved through the in-editor review.
// Chapter 2: a scenario added for REQ-004 offers its stimulus from REQ-004's acceptance criteria, never a spark on the
// measured target; saved, the server keeps the requirement it came from. Chapter 3: a new alternative of ADR-003 takes
// its pattern from a driver's tactic and keeps it through the in-editor review on the alternative, not the decision.
// Co-design's suggestions on the Chapter 3 page (formerly Proposals, the list that was the Co-author band) opens ADR-001's editor with a rule-based
// rationale, kept through the review.
// Each editor opened, and the brief, conflict and design-question editors, is held to its record type's descriptors
// (record-fields.js), which the spark and the server key on.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally AIW_BROWSER_EXECUTABLE.
// Run: npm run test:field-spark-pages
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/field-spark-pages-browser-' + port + '.sqlite';
// No model: the key is empty, so Sol's band must say so and nothing can be drafted.
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
  const text = sel => page.$eval(sel, e => e.innerText);
  const saved = () => page.evaluate(async () => (await (await fetch('/api/project', {credentials: 'same-origin'})).json()).document);
  const dialog = 'dialog[open]';
  // Co-design (formerly Proposals; audit/co-design-2026-10-13.json) keeps the chapter's list folded under "Drafts and
  // suggestions", scoped first to the selected record and listing its items first, with its filters under "Search and
  // filter suggestions". This suite chooses the scope it reads: the chapter's items about other records, here.
  const suggestions = async scope => {
    if (await page.$('#brain-panel details[data-brain-suggestions]:not([open])')) await page.click('#brain-panel details[data-brain-suggestions] > summary');
    await page.waitForSelector('#brain-panel:not([hidden]) [data-proposals-summary]');
    if (await page.$(`#brain-panel [data-proposal-act="scope"][data-scope="${scope}"][aria-pressed="false"]`)) await page.click(`#brain-panel [data-proposal-act="scope"][data-scope="${scope}"]`);
  };
  const bySource = async source => {
    if (await page.$('#brain-panel details.pp-advanced:not([open])')) await page.click('#brain-panel details.pp-advanced > summary');
    if (await page.$('#brain-panel details.pp-source-filter:not([open])')) await page.click('#brain-panel details.pp-source-filter > summary');
    await page.click(`#brain-panel [data-proposal-act="filter"][data-source="${source}"]`);
  };
  // The sparks of the record's own fields: a Chapter 1 form also carries the hidden fields of the other types (round 12).
  const sparks = () => page.$$eval(`${dialog} form [data-spark]`, xs => xs.filter(x => !x.closest('[data-r-types][hidden]')).map(x => x.dataset.sparkFor));
  const bands = () => page.$$eval(`${dialog} .spark-pop [data-spark-band]`, xs => xs.map(x => x.dataset.sparkBand));
  // The open editor's named controls against the descriptors of its record type (record-fields.js): the spark and the
  // server key on these names, so an editor that drifts from them fails here.
  const described = async label => {
    const v = await page.evaluate(async () => { const {FORM_IDS, formFieldsMatch} = await import('/record-fields.js'); const form = document.querySelector('dialog[open] form'); const command = Object.entries(FORM_IDS).find(([, id]) => id === form.id)?.[0]; return {form: form.id, command, ...(command ? formFieldsMatch(command, [...form.elements].map(e => e.name).filter(Boolean)) : {})}; });
    assert.ok(v.command, `${label}: form ${v.form} has a record type`);
    assert.deepEqual({undescribed: v.undescribed, missing: v.missing}, {undescribed: [], missing: []}, `${label}: ${v.form} matches the ${v.command} descriptors`);
  };
  const live = field => page.waitForFunction(f => document.querySelector(`dialog[open] [data-spark-for="${f}"]`)?.classList.contains('live'), field);
  // Sol's band waits until the connection is known, then says exactly what the shared status line says.
  const solBand = async () => {
    await page.waitForFunction(() => { const s = document.querySelector('dialog[open] .spark-pop [data-spark-sol-status]'); return s && !/^Checking/.test(s.textContent); });
    return page.evaluate(() => ({band: document.querySelector('dialog[open] .spark-pop [data-spark-sol-status]').textContent, line: window.aiwSolBridge?.line()}));
  };
  const reviewAndApply = async () => {
    await page.waitForSelector(`${dialog} [data-dialog-review] [data-reviewed]`);
    await page.check(`${dialog} [data-dialog-review] [data-reviewed]`);
    await page.click(`${dialog} [data-dialog-review] [data-wb-action="apply-preview"]`);
    await page.waitForSelector(dialog, {state: 'detached'});
  };

  // 1. Chapter 1: a requirement added for a journey step, its description from that step.
  await page.goto(base + '/?chapter=1&tab=model', {waitUntil: 'networkidle'});
  await page.waitForSelector('.cm.sm .sm-card');
  await page.click('.sm-sh[data-lane="JRN-005"] b');
  // rc38 shell (rc41 W4): selecting the step opens the Details column, where the companion lives.
  await page.click('#inspector .cm-companion [data-sm="add-for-step"]');
  await page.waitForSelector(`${dialog} #r-artefact-form [data-spark]`);
  assert.match(await text(dialog), /connected: JRN-005 requires this record/);
  await described('a new requirement');
  assert.deepEqual(await sparks(), ['title', 'description', 'owner', 'source', 'acceptance'], 'sparks on the free-text fields only: none on the type, the priority, the order, the scope or the confirmation');
  const step = (await saved()).artefacts.find(a => a.id === 'JRN-005');
  await live('description');
  await page.click(`${dialog} [data-spark-for="description"]`);
  await page.waitForSelector(`${dialog} .spark-pop`);
  assert.deepEqual(await bands(), ['project', 'confirm', 'sol'], 'three bands, always in this order');
  const project = await text(`${dialog} .spark-pop [data-spark-band="project"]`);
  assert.ok(project.includes(step.description) && /JRN-005\s+The description of JRN-005 Communicate the outcome, the journey step this requirement serves\./.test(project), 'the step’s recorded description, with the step it was copied from');
  assert.match(project, /rule-based · copied from a record your project holds · no model consulted/);
  const sol = await solBand();
  assert.equal(sol.band, sol.line, 'the Sol band says exactly what Sol’s status line says');
  assert.match(sol.band, /^Sol is not connected in this workspace\. Ask your workspace administrator to connect a provider; rule-based guidance stands on its own meanwhile\.$/); assert.doesNotMatch(sol.band, /API_KEY|AIW_LLM_PROVIDER/, 'no variable name in the sentence a person reads (round 26, R26-W-29)');
  assert.equal(await page.$(`${dialog} .spark-pop [data-spark-act="prepare"]`), null, 'no way to ask a model that is not connected');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.sparkAct), 'accept', 'focus moves into the popover');
  await page.click(`${dialog} .spark-pop [data-spark-band="project"] [data-spark-act="accept"]`);
  assert.equal(await page.inputValue(`${dialog} [name="description"]`), step.description);
  assert.equal(await text(`${dialog} [data-spark-mark="description"]`), 'Stated · JRN-005');
  assert.equal(await text(`${dialog} [data-spark-pending]`), '1 field carries a suggestion. It is saved only when you save this record.');
  const title = 'Show the outcome and the next action';
  assert.ok(!(await saved()).artefacts.some(a => a.title === title || a.description === step.description && a.type === 'requirement'), 'nothing reached the project before the form was saved');
  pass('Chapter 1: a requirement added for JRN-005 from the journey map gets sparks on its free-text fields only; the description spark offers the step’s recorded description, cited, first of three bands, with Sol’s exact not-connected line; Accept fills the form and saves nothing');

  await page.fill(`${dialog} [name="title"]`, title);
  await page.click(`${dialog} button[type="submit"]`);
  await page.waitForSelector(dialog, {state: 'detached'});
  const added = (await saved()).artefacts.find(a => a.title === title);
  assert.ok(added && added.type === 'requirement', 'saved through Chapter 1’s own command');
  assert.equal(added.description, step.description);
  assert.deepEqual(added.provenance.suggestions.map(s => [s.field, s.source, s.ref, s.edited, s.command]), [['description', 'project', 'JRN-005', false, 'artefact']]);
  assert.ok(added.provenance.suggestions.every(s => s.acceptedBy && /^\d{4}-\d{2}-\d{2}T/.test(s.acceptedAt)), 'accepted by the signed-in actor, at the server’s time');
  assert.deepEqual(added.provenance.history.map(h => [h.event, h.fields.join()]), [['Accepted suggestions', 'description']]);
  assert.ok((await saved()).relationships.some(r => r.from === 'JRN-005' && r.kind === 'requires' && r.to === added.id), 'and connected to its step, as before');
  pass('Chapter 1: saving the editor stores the accepted description on the new requirement as provenance read back from the server, citing JRN-005, with the actor and the time');

  // REQ-005's acceptance: confirmed from its journey step, who takes part and the outcome it delivers; reviewed.
  await page.goto(base + '/?chapter=1&tab=work&artefact=REQ-005', {waitUntil: 'networkidle'});
  await page.click('[data-r-edit="REQ-005"]');
  await page.waitForSelector(`${dialog} #r-artefact-form [data-spark-for="acceptance"]`);
  await described('REQ-005');
  await live('acceptance');
  await page.click(`${dialog} [data-spark-for="acceptance"]`);
  await page.waitForSelector(`${dialog} .spark-pop [data-spark-band="confirm"] .spark-question`);
  assert.equal(await text(`${dialog} .spark-pop [data-spark-band="confirm"] .spark-question`), 'Does REQ-005 pass when OUT-001 A payment with a known outcome is observed at the end of JRN-005 Communicate the outcome?');
  const acceptance = 'Given Bank customer at “Communicate the outcome”, when the step completes, then customers can follow an instruction to a confirmed, held, or pending outcome.';
  assert.equal(await text(`${dialog} .spark-pop [data-spark-band="confirm"] .spark-value`), acceptance);
  await page.click(`${dialog} .spark-pop [data-spark-band="confirm"] [data-spark-act="yes"]`);
  assert.equal(await page.inputValue(`${dialog} [name="acceptance"]`), acceptance);
  assert.equal(await text(`${dialog} [data-spark-mark="acceptance"]`), 'Inferred · JRN-005');
  assert.equal(await page.isChecked(`${dialog} [name="confirmed"]`), false, 'an accepted suggestion is an edit: the record’s confirmation is reset');
  await page.click(`${dialog} button[type="submit"]`);
  await reviewAndApply();
  const req5 = (await saved()).artefacts.find(a => a.id === 'REQ-005');
  assert.equal(req5.acceptance, acceptance);
  assert.deepEqual(req5.provenance.suggestions.map(s => [s.field, s.source, s.ref, s.command]), [['acceptance', 'confirm', 'JRN-005', 'artefact']]);
  pass('Chapter 1: REQ-005’s acceptance is asked as a question naming its step and outcome, filled on Yes, and kept through the in-editor review as a confirmed suggestion citing JRN-005');

  // 2. Chapter 2: a scenario added for REQ-004, its stimulus from REQ-004's acceptance criteria.
  await page.goto(base + '/?chapter=2&tab=work', {waitUntil: 'networkidle'});
  await page.click('[data-q-section="intake"]');
  await page.click('details:has([data-q-from-requirement="REQ-004"]) > summary');
  await page.click('[data-q-from-requirement="REQ-004"]');
  await page.waitForSelector(`${dialog} #q-driver-form [data-spark]`);
  await described('a new scenario');
  assert.deepEqual(await sparks(), ['title', 'description', 'impact', 'stimulus', 'conditions', 'response', 'measurement', 'owner', 'rationale', 'source', 'tactic'], 'no spark on the metric, the target value, the unit or the window');
  await live('stimulus');
  await page.click(`${dialog} [data-spark-for="stimulus"]`);
  await page.waitForSelector(`${dialog} .spark-pop`);
  assert.deepEqual(await bands(), ['project', 'confirm', 'sol']);
  assert.match(await text(`${dialog} .spark-pop [data-spark-band="project"]`), /When the request times out[\s\S]*REQ-004\s+The “when” clause of REQ-004’s acceptance criteria\./);
  assert.match((await solBand()).band, /^Sol is not connected in this workspace/);
  await page.click(`${dialog} .spark-pop [data-spark-band="project"] [data-spark-act="accept"]`);
  assert.equal(await page.inputValue(`${dialog} [name="stimulus"]`), 'When the request times out');
  assert.equal(await text(`${dialog} [data-spark-mark="stimulus"]`), 'Stated · REQ-004');
  const scenario = 'Hold an uncertain settlement';
  await page.fill(`${dialog} [name="title"]`, scenario);
  assert.ok(!(await saved()).quality.drivers.some(d => d.title === scenario), 'nothing saved before the form is');
  await page.click(`${dialog} button[type="submit"]`);
  await page.waitForSelector(dialog, {state: 'detached'});
  const driver = (await saved()).quality.drivers.find(d => d.title === scenario);
  assert.ok(driver, 'saved through Chapter 2’s own command');
  assert.deepEqual(driver.requirementIds, ['REQ-004']);
  assert.equal(driver.stimulus, 'When the request times out');
  assert.deepEqual(driver.provenance.suggestions.map(s => [s.field, s.source, s.ref, s.edited, s.command]), [['stimulus', 'project', 'REQ-004', false, 'quality.driver']]);
  pass('Chapter 2: a scenario added for REQ-004 gets no spark on its measured target; its stimulus spark offers the “when” clause of REQ-004’s acceptance, cited; saved, the server keeps the requirement it came from');

  // 3. Chapter 3: a new alternative of ADR-003, its pattern from a driver's tactic, through the in-editor review.
  await page.goto(base + '/?chapter=3&tab=work&decision=ADR-003', {waitUntil: 'networkidle'});
  // rc39/rc40 Work (rc41 W4): "Add alternative" is the Compare stage's primary task action; the person chooses that stage.
  await page.click('.work-stages [data-d-stage="compare"]'); await page.waitForSelector('.work-stages [data-d-stage="compare"][aria-pressed="true"]');
  assert.match(await text('.work-task-actions [data-d-action="new-alternative"]'), /^\s*Add alternative\s*$/);
  await page.click('.work-task-actions [data-d-action="new-alternative"]');
  await page.waitForSelector(`${dialog} #d-alternative-form [data-spark]`);
  await described('a new alternative');
  assert.deepEqual(await sparks(), ['title', 'summary', 'benefits', 'costs', 'consequences', 'pattern', 'antiPattern', 'rejectionReason', 'source'], 'no spark on a per-driver effect, reason or evidence, or a proposed relationship');
  const tactic = (await saved()).quality.drivers.find(d => d.id === 'QD-001').tactic;
  await live('pattern');
  await page.click(`${dialog} [data-spark-for="pattern"]`);
  await page.waitForSelector(`${dialog} .spark-pop`);
  await page.click(`${dialog} .spark-pop [data-spark-band="project"] [data-spark-offer]:first-child [data-spark-act="accept"]`);
  assert.equal(await page.inputValue(`${dialog} [name="pattern"]`), tactic);
  assert.equal(await text(`${dialog} [data-spark-mark="pattern"]`), 'Stated · QD-001');
  await page.click(`${dialog} [data-spark-for="summary"]`);
  await page.waitForSelector(`${dialog} .spark-pop [data-spark-band="confirm"] .spark-question`);
  assert.match(await text(`${dialog} .spark-pop [data-spark-band="confirm"] .spark-question`), /^Is this the approach to answer ADR-003: “What should happen after an uncertain settlement response\?”\?$/, 'asked against the decision’s own question');
  await page.click(`${dialog} .spark-pop [data-spark-act="close"]`);
  await page.fill(`${dialog} [name="title"]`, 'Hold, enquire and reconcile');
  await page.click(`${dialog} button[type="submit"]`);
  await reviewAndApply();
  const decision = (await saved()).decisions.records.find(d => d.id === 'ADR-003'), alternative = decision.alternatives.find(a => a.title === 'Hold, enquire and reconcile');
  assert.ok(alternative, 'saved through Chapter 3’s own command');
  assert.deepEqual(alternative.provenance.suggestions.map(s => [s.field, s.source, s.ref, s.command]), [['pattern', 'project', 'QD-001', 'decision.alternative']]);
  // Round 12 (D-06): the decision carries only the server's stamp of who wrote it, none of the alternative's suggestions.
  assert.deepEqual(Object.keys(decision.provenance || {}), ['author'], 'the decision it is nested in carries none');
  pass('Chapter 3: a new alternative’s pattern comes from a tactic its decision’s driver names, its approach is asked against the decision’s question, and the reviewed save keeps the suggestion on the new alternative');

  // Co-design's suggestions list Chapter 3's field offers as rule rows; Accept opens the editor of the decision the offer
  // is for (ADR-001, though ADR-003 is selected: the row names its scope as the chapter), on the step that holds the
  // field, filled and unsaved.
  // rc38 shell (rc41 W4): the chapter's assistance bar (Co-design among it) is in the toolbar's Chapter tools menu.
  if (!await page.$('details.chapter-tools[open]')) { await page.click('details.chapter-tools > summary'); await page.waitForSelector('details.chapter-tools[open] .chapter-tools-menu .brain-assistance'); }
  await page.click('details.chapter-tools[open] .brain-assistance [data-brain-launch="mind"]');
  await suggestions('chapter');
  assert.equal(await page.$eval('#brain-panel [data-proposal-act="scope"][aria-pressed="true"]', e => e.dataset.scope), 'chapter', 'the chapter’s items about records other than the selected ADR-003');
  assert.match(await text('#brain-panel [data-proposals-summary]'), /^\d+ items in Chapter 3: \d+ design suggestions? · \d+ guided tasks? · \d+ questions?\.( \d+ directly tied to selected \S+; \d+ chapter-wide or about other records\.)?$/);
  await bySource('rule');
  assert.match(await text('#brain-panel [data-proposal-act="filter"][data-source="rule"][aria-pressed="true"]'), /^Rule\s*\d+$/, 'the chapter’s rule-based proposals are counted under their source');
  const offer = '#brain-panel [data-proposal-source="rule"]:has([data-proposal-act="accept"])';
  assert.match(await text(offer), /^Rule\s+Chapter\s+ADR-001 · Decision rationale — why this choice\?\s+Stated · QD-002/i);
  const why = (await saved()).quality.drivers.find(d => d.id === 'QD-002').rationale;
  await page.click(`${offer} [data-proposal-act="accept"]`);
  await page.waitForSelector(`${dialog} #d-question-form [data-spark-prefill]`);
  assert.equal(await text(`${dialog} h2`), 'Revise ADR-001');
  assert.equal(await page.inputValue(`${dialog} [name="rationale"]`), why);
  assert.ok(await page.isVisible(`${dialog} [name="rationale"]`), 'the editor shows the step that holds the field');
  assert.equal((await saved()).decisions.records.find(d => d.id === 'ADR-001').rationale, '', 'the panel wrote nothing');
  await page.click(`${dialog} button[type="submit"]`);
  await reviewAndApply();
  const adr1 = (await saved()).decisions.records.find(d => d.id === 'ADR-001');
  assert.equal(adr1.rationale, why);
  assert.deepEqual(adr1.provenance.suggestions.map(s => [s.field, s.source, s.ref, s.command]), [['rationale', 'project', 'QD-002', 'decision.save']]);
  pass('Chapter 3: Co-design’s suggestions list the chapter’s field offers as rule rows; Accept opens the editor of the decision it is for on the step that holds the field, filled and unsaved; the reviewed save keeps the driver it was copied from');

  // 4. The other three editors (the brief, a conflict, a design question) hold to their descriptors too, with sparks
  // on their free text only; a conflict's effect is asked about from its two drivers.
  const closeEditor = async () => { await page.keyboard.press('Escape'); await page.waitForSelector(dialog, {state: 'detached'}); };
  await page.goto(base + '/?chapter=1&tab=work', {waitUntil: 'networkidle'});
  await page.click('[data-r-action="edit-brief"]');
  await page.waitForSelector(`${dialog} #r-brief-form [data-spark]`);
  await described('the brief');
  assert.deepEqual(await sparks(), ['problem', 'goal', 'source']);
  await closeEditor();
  await page.goto(base + '/?chapter=2&tab=work', {waitUntil: 'networkidle'});
  await page.click('[data-q-section="conflicts"]');
  await page.click('[data-q-action="add-conflict"]');
  await page.waitForSelector(`${dialog} #q-conflict-form [data-spark]`);
  await described('a new conflict');
  assert.deepEqual(await sparks(), ['title', 'effect', 'resolution', 'owner'], 'none on the two driver choices or the status');
  const [first, second] = await page.$$eval(`${dialog} select[name^="driver"]`, xs => xs.map(x => x.value));
  await live('effect');
  await page.click(`${dialog} [data-spark-for="effect"]`);
  await page.waitForSelector(`${dialog} .spark-pop [data-spark-band="confirm"] .spark-question`);
  assert.equal(await text(`${dialog} .spark-pop [data-spark-band="confirm"] .spark-question`), `Do ${first} and ${second} ask competing things of the same part of the design?`);
  await page.click(`${dialog} .spark-pop [data-spark-act="close"]`);
  await closeEditor();
  await page.goto(base + '/?chapter=3&tab=work&decision=ADR-002', {waitUntil: 'networkidle'});
  await page.click('[data-d-action="edit-question"]');
  await page.waitForSelector(`${dialog} #d-question-form [data-spark]`);
  await described('ADR-002');
  assert.deepEqual(await sparks(), ['owner', 'question', 'context', 'source', 'stakeholderNote', 'dependencies', 'rationale', 'assumptions', 'assumptionEvidence', 'risks', 'mitigation', 'impact', 'licensing', 'skills', 'documentation'], 'none on the topic, the linked requirements and drivers or the confirmation');
  await closeEditor();
  pass('the brief, conflict and design-question editors match their record descriptors and carry sparks on their free text only; a conflict’s effect is asked about from its two drivers');

  // 5. Round 12: a requirement group is named by the person. Its editor holds to its descriptors and carries no spark,
  // because no record of the project states a group's name or meaning for a spark to offer.
  await page.goto(base + '/?chapter=1&tab=work', {waitUntil: 'networkidle'});
  await page.click('[data-r-section="requirement"]');
  await page.click('[data-r-action="new-group"]');
  await page.waitForSelector(`${dialog} #r-group-form`);
  await described('a new requirement group');
  assert.deepEqual(await sparks(), [], 'no spark on a group');
  await closeEditor();
  pass('the requirement group editor matches its record descriptors and carries no spark');

  assert.deepEqual(errors, [], 'no page errors');
} finally {
  await browser.close();
  server.kill('SIGKILL');
  for (const f of [db, db + '-wal', db + '-shm']) try { rmSync(f, {force: true}); } catch { /* temporary */ }
}
console.log(`\n${checks.length} checks passed.`);
process.exit(0);
