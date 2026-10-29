// Rendered checks for the Chapter 1 Model views (the journey map and the boundary, called Context until round 11).
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
const db = '.aiw-local/story-browser-' + port + '.sqlite';
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
  // rc39/rc40: the companion folds "What the model shows" (the insights and their proposals) closed by default; the suite
  // reads them as a viewer who opened the fold (the remembered choice, model-stage.js CP_STORE).
  await page.addInitScript(() => { try { localStorage.setItem('aiw.companion.shows', '1'); } catch { /* storage is a convenience */ } });
  page.on('pageerror', e => errors.push(e.message));
  // rc38 shell (rc41 W4): the Model companion lives in the Details column (#inspector .cm-companion), which the shell
  // leaves closed when nothing is selected on arrival; the suite opens it with the toolbar's toggle, as a viewer does,
  // and asserts only on what the open column shows.
  const showCompanion = async () => { await page.waitForSelector('body[data-panel]', {state: 'attached', timeout: 10000}); if (await page.evaluate(() => document.body.dataset.panel !== 'open')) { await page.click('.workspace-tools [data-panel-toggle]'); await page.waitForSelector('#inspector[aria-hidden="false"]', {timeout: 5000}); await page.waitForTimeout(400); } };
  const open = async (extra = '') => { await page.goto(base + '/?chapter=1&tab=model' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.sm .sm-card', {timeout: 8000}); await showCompanion(); await page.waitForTimeout(400); };
  // A pointer click. Focusing a card moves the camera to reveal it (model-stage.js, focusin), so a lane head can end up
  // behind the sheet's sticky corner; a viewer would fit the drawing again before clicking it, and so does this helper,
  // with the product's own "Fit whole drawing" control, only when the hit test finds the corner or the heads in the way.
  // Where the element can be hit: the first point of its own box (a 5 × 3 sample) where the hit test lands on it rather than
  // on an overlay (the minimap, the corner, the heads); null when every point is covered.
  // The box is read once it holds still for two polls (a camera move or a reveal animates), then sampled.
  const settled = sel => page.waitForFunction(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), k = [r.x, r.y, r.width, r.height].map(Math.round).join(','); const same = e.__w4Box === k; e.__w4Box = k; return same; }, sel, {polling: 120, timeout: 5000});
  const freePoint = async sel => { await page.$eval(sel, e => e.scrollIntoView({block: 'nearest', inline: 'nearest'})); await settled(sel); return page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); for (const fy of [0.5, 0.25, 0.75]) for (const fx of [0.5, 0.2, 0.8, 0.35, 0.65]) { const x = r.x + r.width * fx, y = r.y + r.height * fy; const t = document.elementFromPoint(x, y); if (t && (e.contains(t) || t.contains(e))) return {x: r.width * fx, y: r.height * fy}; } return null; }, sel); };
  const click = async sel => {
    await page.waitForSelector(sel, {state: 'visible', timeout: 10000});
    let at = await freePoint(sel);
    if (!at) { await page.$eval('[data-cm-camera="whole"]', b => b.click()); await page.waitForTimeout(300); at = await freePoint(sel); assert.ok(at, sel + ' is reachable once the drawing is fitted'); }
    await page.click(sel, {position: at}); await page.waitForTimeout(250); };
  const count = async sel => (await page.$$(sel)).length;
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' ').trim());
  // Positions in the model's own world (round 3, B): in the page's one frame the stage is shorter, so focusing an element
  // near its foot may move the camera or scroll the stage column; neither is the layout these checks hold still.
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.sm-card, .sm-sh, .sm-bt, .sm-note, .sm-label')].map(e => { const r = e.getBoundingClientRect(), o = (e.closest('.cm-world, .cm-heads-in, .cm-rail-in') || e.closest('.cm-stage') || e.closest('.cm'))?.getBoundingClientRect() || {x: 0, y: 0}; return [e.className.split(' ')[0], e.dataset.card || e.dataset.lane || e.dataset.link || '', Math.round(r.x - o.x), Math.round(r.y - o.y), Math.round(r.width), Math.round(r.height)].join('|'); }));
  const spec = () => page.$eval('#inspector .cm-companion .cm-spec', e => e.innerText);
  const shown = sel => page.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }, sel);
  const closeDialog = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(300); if (await page.$('dialog[open]')) { await page.evaluate(() => document.querySelector('dialog[open]').close()); await page.waitForTimeout(200); } };

  // 1. Chapter 1 Model opens on the journey map, in place of the chapter's own map.
  await open();
  assert.ok(await page.$('.cm.sm .cm-view[data-id="map"][aria-pressed="true"]'));
  assert.ok(!(await shown('.r-map-card')) && !(await shown('.r-inspector')), 'the chapter\'s own map and inspector step aside');
  assert.equal(await count('.sm-sh.step'), 5, 'the journey\'s five steps as the backbone'); assert.equal(await count('.sm-card.req'), 5); assert.equal(await count('.sm-bt'), 1, 'one slice: everything is Must');
  assert.equal(await count('.sm-next:not(.broken):not(.k)'), 4, 'the recorded order between steps'); assert.equal(await count('.sm-card.req .sm-lr'), 5, 'each carries the Chapter 4 responsibility covering it');
  assert.equal(await page.evaluate(() => document.querySelector('.sm .cm-svg').getBoundingClientRect().width > 300), true, 'the drawing keeps its size on the chapter\'s own page');
  assert.equal(await count('#inspector .cm-companion .cm-spec'), 0, 'nothing is selected on arrival');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /5 requirements over 5 steps · 0 steps without one · 1 not testable · Must/);
  pass('Chapter 1 Model opens on the journey map in place of the chapter\'s own map: five steps as the backbone with who takes part and their recorded order, one Must slice, and each requirement carrying the Chapter 4 responsibility that covers it');

  // 2. The lens changes what is read, never where anything is.
  const before = await rects();
  for (const lens of ['flow', 'reasoning', 'structure']) {
    await click(`[data-sm="lens"][data-id="${lens}"]`);
    assert.deepEqual(await rects(), before, lens + ' moved objects');
    const on = await page.$eval('.sm-card[data-card="REQ-004"]', e => [...e.querySelectorAll('.sm-lens>div')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.className));
    assert.deepEqual(on, [{flow: 'fl', reasoning: 'rs', structure: 'st'}[lens]]);
  }
  await click('[data-sm="lens"][data-id="flow"]');
  assert.match(await page.$eval('.sm-card[data-card="REQ-005"] .fl', e => e.innerText), /cannot be tested yet/);
  await click('[data-sm="lens"][data-id="structure"]');
  assert.match(await page.$eval('.sm-card[data-card="REQ-004"] .st', e => e.innerText), /ASM-001/);
  pass('Structure, Flow and Reasoning each give their own reading — what limits a requirement, how it will be accepted, why it matters — and none of them moves anything');

  // 3. Selecting reads the requirement; Chapter 1's own editor is one click away.
  await click('.sm-card[data-card="REQ-004"] .sm-t');
  assert.match(await spec(), /Requirement · REQ-004[\s\S]*Retain an uncertain settlement outcome[\s\S]*Needed at[\s\S]*JRN-004[\s\S]*Delivers[\s\S]*OUT-001[\s\S]*Limited by[\s\S]*ASM-001[\s\S]*not confirmed[\s\S]*Covered by[\s\S]*LR-004/i);
  assert.ok(await count('.sm-card.dim') >= 4);
  await click('#inspector .cm-companion [data-sm="edit"]'); await page.waitForTimeout(400);
  assert.match(await page.$eval('dialog[open] #r-dialog-title', e => e.textContent), /Edit REQ-004/);
  await closeDialog();
  pass('selecting a requirement reads where it is needed, what it delivers, what limits it and what covers it, and Edit requirement opens Chapter 1\'s own editor');

  // 4. Proposals from Chapter 1: an enquiry for uncertain outcomes stands in a Should slice.
  await click('.sm-sh[data-lane="JRN-004"] b');
  assert.match(await spec(), /Journey step · 04[\s\S]*Settle the payment[\s\S]*Taking part[\s\S]*Operations analyst/i);
  await click('#inspector .cm-companion [data-r-proposal="pending"]'); await page.waitForTimeout(900);
  assert.match(await page.$eval('.cm-banner', e => e.innerText), /Requirement proposal · not saved[\s\S]*Enquire about a pending payment/i);
  assert.equal(await count('.sm-bt'), 2, 'a Should slice appears'); assert.ok(await page.$('.sm-card.proposed'));
  assert.equal(await page.$eval('.sm-card.proposed', e => e.getAttribute('role')), 'group', 'a proposal with its own Review button is a named group, not a nested button');
  assert.equal(await page.$eval('.sm-card.proposed', e => Math.round(e.getBoundingClientRect().x)), await page.$eval('.sm-card[data-card="REQ-004"]', e => Math.round(e.getBoundingClientRect().x)), 'under Settle the payment');
  await click('.cm-banner [data-r-action="dismiss-ghost"]'); await page.waitForTimeout(600);
  assert.equal(await count('.sm-card.proposed'), 0); assert.equal(await count('.sm-bt'), 1);
  await click('#inspector .cm-companion .sm-insw [data-r-proposal="acceptance"]'); await page.waitForTimeout(900);
  assert.ok(await page.$('.sm-card.ghosted[data-card="REQ-005"]'), 'the acceptance proposal marks REQ-005 with what it would change');
  await click('.cm-banner [data-r-action="dismiss-ghost"]'); await page.waitForTimeout(600);
  await click('#inspector .cm-companion .sm-insw [data-r-proposal="assumption"]'); await page.waitForTimeout(900);
  assert.ok(await page.$('.cm-view[data-id="boundary"][aria-pressed="true"]'), 'a proposed limit is shown where limits stand, in the boundary');
  assert.match(await page.$eval('.sm-note.proposed', e => e.innerText), /Proposal · not saved · Assumption[\s\S]*Confirm the external enquiry contract/i);
  assert.equal(await page.$eval('.sm-note.proposed', e => e.getAttribute('role')), 'group', 'a proposed limit with its own Review button is a group');
  assert.match(await spec(), /Proposal · not saved[\s\S]*Confirm the external enquiry contract[\s\S]*Assumption · not confirmed/i);
  await click('.cm-banner [data-r-action="dismiss-ghost"]'); await page.waitForTimeout(600);
  assert.equal(await count('.sm-note.proposed'), 0); assert.equal(await count('#inspector .cm-companion .cm-spec'), 0, 'dismissed, nothing stays selected');
  await click('[data-sm="view"][data-id="map"]');
  pass('the chapter\'s proposals are drawn in place: an enquiry about a pending payment stands under Settle in a Should slice of its own, observable acceptance marks REQ-005, and an unverified dependency stands among the limits in the context — each until dismissed');

  // 5. Adding a requirement for a step connects it there.
  await click('.sm-sh[data-lane="JRN-002"] b');
  await click('#inspector .cm-companion [data-sm="add-for-step"]'); await page.waitForTimeout(400);
  assert.match(await page.$eval('dialog[open]', e => e.innerText), /connected: JRN-002 requires this record/);
  await page.evaluate(() => { const f = document.querySelector('#r-artefact-form'); f.elements.title.value = 'Explain a held instruction'; f.elements.description.value = 'The service shall tell the customer that an instruction is held for review and what happens next.'; f.elements.priority.value = 'Should'; f.elements.acceptance.value = 'Given a held instruction, when the customer views it, then the held status and the next permitted action are shown.'; f.requestSubmit(); });
  await page.waitForTimeout(1500);
  assert.equal(await count('.sm-card.req'), 6); assert.equal(await count('.sm-bt'), 2);
  assert.equal(await page.$eval('.sm-card[data-card="REQ-006"]', e => Math.round(e.getBoundingClientRect().x)), await page.$eval('.sm-card[data-card="REQ-002"]', e => Math.round(e.getBoundingClientRect().x)), 'the new requirement stands under Screen the instruction');
  pass('adding a requirement for a step opens Chapter 1\'s editor already connected to it; saved, it stands under that step in its own Should slice');

  // 6. Walking the journey; dissecting and folding.
  for (let i = 0; i < 3; i++) await click('[data-sm="walk-next"]');
  assert.match(await page.$eval('.cm-walk-text', e => e.innerText), /3 \/ 5 03 Record the posting\. No person takes part — the system acts alone\./);
  assert.equal(await count('.sm-sh.now'), 1); assert.equal(await count('.sm-sh.done'), 2);
  // Round 6 (R6-G): the walk reads the current step as a story in the companion — its title, one paragraph per layer
  // with each record a link, and the gaps in the checks' words.
  const storyIn = () => page.$eval('#inspector .cm-companion .tn-story', e => ({title: e.querySelector('h4').textContent, steps: e.querySelectorAll('.tn-step').length, gaps: e.querySelectorAll('.tn-step.gap').length, links: [...e.querySelectorAll('.cm-link[data-cm-open]')].map(a => a.dataset.cmOpen), text: e.innerText}));
  let st = await storyIn();
  assert.equal(st.title, 'What happens when: Record the posting'); assert.ok(st.steps === 11 && st.links.includes('JRN-003') && st.links.includes('REQ-003'), 'the story walks the layers from the step with each record linked: ' + JSON.stringify(st));
  assert.match(st.text, /It needs REQ-003 Prevent duplicate financial effects \(Must\)[\s\S]*Records on this trace: \d+\./);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  assert.equal(await count('.tn-story'), 0, 'stopping the walk closes the story');
  await page.dblclick('.sm-sh[data-lane="JRN-002"] b', {delay: 70}); await page.waitForTimeout(500);
  assert.match(await crumbs(), /Whole journey › Step 02 Screen the instruction/);
  assert.equal(await count('.sm-card.req'), 2);
  for (let i = 0; i < 2 && /›/.test(await crumbs()); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  assert.doesNotMatch(await crumbs(), /›/);
  await click('[data-sm="depth"][data-id="steps"]');
  assert.ok(await count('.sm-card.cell') >= 5, 'each slice of each step folds to one card');
  await click('[data-sm="depth"][data-id="requirements"]');
  pass('the journey is walked step by step, a step opens with what it needs, Escape steps back to the whole journey, and each slice of each step folds to one card');

  // 6b. Round 6 (R6-G): "Read as a story" on a selected step tells it beneath its specimen; a Chapter 1 reference selects
  // in place, another chapter's record links to its model; Escape closes the story before the selection.
  await click('.sm-sh[data-lane="JRN-004"] b');
  assert.equal(await count('.tn-story'), 0, 'no story until asked');
  await click('#inspector .cm-companion [data-sm="story"]');
  st = await storyIn();
  assert.equal(st.title, 'What happens when: Settle the payment'); assert.ok(st.steps === 11 && st.gaps === 1 && /to confirm · No control is recorded for this step yet\./.test(st.text), 'the gap is named in the checks’ words: ' + st.text);
  assert.ok(await page.$('#inspector .cm-companion .cm-spec + .tn-story, #inspector .cm-companion .cm-spec ~ .tn-story'), 'told beneath the specimen');
  const href = await page.$eval('#inspector .cm-companion .tn-story .cm-link[data-cm-chapter="8"]', a => a.getAttribute('href'));
  assert.match(href, /chapter=8&tab=model&object=/, 'a Chapter 8 record links to its model: ' + href);
  await click('#inspector .cm-companion .tn-story .cm-link[data-cm-open="REQ-004"]');
  assert.match(await spec(), /Requirement · REQ-004/i, 'a Chapter 1 reference selects its record here'); assert.equal(await count('.tn-story'), 0, 'and the step’s story closes');
  await click('.sm-sh[data-lane="JRN-004"] b'); await click('#inspector .cm-companion [data-sm="story"]'); assert.equal(await count('.tn-story'), 1);
  await page.focus('.cm.sm .cm-stage'); await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  assert.equal(await count('.tn-story'), 0, 'Escape closes the story first'); assert.match(await spec(), /Journey step · 04/i, 'and keeps the selection');
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  pass('Read as a story tells a selected step from the records on its trace beneath its specimen — each reference a link, a Chapter 1 record selecting in place and another chapter’s opening its model, a gap in the checks’ words — and Escape closes it before the selection');

  // 7. Boundary (round 11: renamed from Context, which the Diagram's C4 picture keeps): the system's boundary, the people
  //    around it, the outcomes and their owners. The old id still lands on it.
  assert.equal(await page.$eval('[data-sm="view"][data-id="boundary"] span', e => e.textContent), 'Boundary', 'the view is called Boundary');
  assert.equal(await page.$$eval('[data-sm="view"][data-id="context"]', es => es.length), 0, 'and nothing is called Context beside the Context picture');
  await click('[data-sm="view"][data-id="boundary"]'); await page.waitForTimeout(400);
  assert.equal(await count('.sm-lh'), 4); assert.equal(await count('.sm-card.ctx'), 11); assert.equal(await count('.sm-note'), 4);
  // Round 10 (V5): every relationship is drawn, though a person's or an owner's lines are one line that divides at dots:
  // the relationships the drawn lines name (data-links) are exactly the context's eleven, each with its own head, a
  // dot where each person's line divides, and no marker left with a colour of its own.
  const drawnLinks = await page.$$eval('.cm.sm .cm-svg path.sm-route', ps => ps.map(p => (p.dataset.links || '').split(' ').filter(Boolean)));
  assert.ok(drawnLinks.every(ids => ids.length), 'every drawn line names the relationships it carries');
  const linkSet = [...new Set(drawnLinks.flat())].sort();
  assert.equal(linkSet.length, 11, 'who takes part, what delivers each outcome, and who owns it: ' + linkSet.join(' '));
  assert.deepEqual(['P:', 'D:', 'O:'].map(k => linkSet.filter(id => id.startsWith(k)).length), [4, 5, 2], 'four parts taken, five deliveries, two ownerships');
  assert.ok(drawnLinks.filter(ids => ids.length > 1).every(ids => ids.every(id => id.startsWith('P:'))), 'only the people\'s lines are shared in bank');
  assert.deepEqual([await count('.cm.sm .cm-svg .sm-head'), await count('.cm.sm .cm-svg .sm-join'), await count('.cm.sm .cm-svg [marker-end]')], [11, 2, 0], 'a head per relationship, a dot where each person\'s line divides, no colour-literal markers');
  assert.match(await page.$eval('.cm.sm .cm-legend', e => e.innerText), /A line divides at a dot, one branch per step or outcome\. Each branch is one recorded relationship; the dot is a drawing join, not an ArchiMate junction/, 'the key says what a dot is');
  assert.match(await page.$eval('.sm-lh.system', e => e.innerText), /Bank Payment Journey[\s\S]*in scope: Domestic account-to-account payment/);
  assert.ok(await page.$('.sm-note.n-out'), 'what is out of scope stands outside, beneath');
  const cr = await rects();
  await click('[data-sm="lens"][data-id="reasoning"]'); assert.deepEqual(await rects(), cr, 'the lens moves nothing in the context either'); await click('[data-sm="lens"][data-id="structure"]');
  await click('.sm-card[data-card="OUT-002"] .sm-t');
  assert.ok(await page.$('.sm-route.lit'), 'selecting an outcome lights the paths to it');
  // Selecting a person lights exactly their two relationships, drawn whole on top, and the line beneath them is left out.
  await click('.sm-card[data-card="ACT-001"] .sm-t');
  assert.deepEqual(await page.$$eval('.cm.sm .cm-svg path.sm-route.lit', ps => ps.map(p => p.dataset.links).sort()), ['P:ACT-001>JRN-001', 'P:ACT-001>JRN-005'], 'a person lights their own relationships, each whole');
  assert.ok(!(await page.$$eval('.cm.sm .cm-svg path.sm-route:not(.lit)', ps => ps.some(p => p.dataset.links.split(' ').includes('P:ACT-001>JRN-005')))), 'and the line they share is not drawn beneath them');
  assert.ok(await page.$('.cm.sm .cm-svg .sm-join.lit') && await page.$$eval('.cm.sm .cm-svg path.sm-route.dim', ps => ps.length > 0), 'the dot on their line lights; every other line dims');
  await click('.sm-card[data-card="OUT-002"] .sm-t');
  assert.match(await spec(), /Business outcome · OUT-002[\s\S]*Delivered by[\s\S]*REQ-003[\s\S]*Owned by[\s\S]*STK-002/i);
  await click('[data-sm="view"][data-id="map"]');
  pass('the context draws the system as its boundary with its steps in order, the people who take part, the outcomes it exists for and their owners, with the limits on the design beneath; every relationship is drawn, each person’s part in the journey one line that divides at a dot with a head per step, and the key says what the dot is; selecting an outcome lights the paths that deliver it, and selecting a person lights exactly their own relationships, whole');

  // 8. The Whole design (the switcher's, round 5: "All perspectives" is retired) and back to the chapter's own map; Validate is unchanged.
  // In the one shell (round 3, A) the chapter has no page map of its own: every perspective is the Whole design view,
  // the anatomy inside the chapter model, with its companion in the companion column.
  await click('.cm.sm .cm-view[data-id="whole"]'); await page.waitForSelector('.cm.sm .cm-sheet .an.an-embedded .an-n', {timeout: 15000}); await page.waitForTimeout(400);
  assert.ok(await page.$('.cm-view[data-id="whole"][aria-pressed="true"]') && await page.$('#inspector .cm-companion .an-companion section'), 'the switcher\'s Whole design opens the Whole design view');
  // rc39: the tray gained Diagram and Layers, so the chapter's own view is named, not counted.
  await click('.cm-views .cm-view[data-id="map"]'); await page.waitForTimeout(500);
  assert.ok(await page.$('.cm-view[data-id="map"][aria-pressed="true"]') && await page.$('.cm.sm .sm-card') && !(await page.$('.cm.sm .an')), 'and the chapter’s own view comes back');
  await open('&artefact=REQ-003');
  assert.match(await spec(), /Requirement · REQ-003/i, 'a deep link opens on its record');
  await page.click('.workspace-bar [data-tab="validate"]'); await page.waitForTimeout(900);
  // Round 3 (C): Validate is the chapter's checks, with a status header and the chapter in the SDD; the model stays on Model.
  // rc38+ (rc41 W4): the frame is the validation workspace, bound to the project and chapter, whose readiness line carries
  // the counts (what to fix, what to confirm, the SDD passages passing); the chapter in the SDD and the model observations
  // sit in its support section.
  await page.waitForSelector('.validation-workspace[data-validation-workspace^="bank-payment:1"][data-bound="1"] .validation-readiness', {timeout: 8000});
  assert.match(await page.$eval('.validation-workspace .validation-readiness', e => e.innerText), /\d+ findings? to fix[\s\S]*\d+ items? to confirm[\s\S]*\d+\/\d+ SDD passages passing/, 'the readiness line counts what to fix, what to confirm and the SDD passages');
  assert.ok(await page.$('.validation-workspace .validation-support .vx-sdd') && await page.$('.validation-workspace .validation-main') && !(await page.$('.cm')), 'Validate opens on the chapter’s checks, without the model');
  await page.waitForSelector('.vx-obs:not([hidden])', {timeout: 8000});
  // rc39/rc40: the observations fold under a counted summary; opened as a viewer opens it, the list names what the
  // Chapter 1 models show, REQ-005's untestable acceptance among them.
  assert.match(await page.$eval('.vx-obs > summary', e => e.innerText), /^Model observations · [1-9]\d*$/);
  if (!await page.$('.vx-obs[open]')) await click('.vx-obs > summary');
  assert.match(await page.$eval('.vx-obs .vx-obs-in', e => e.innerText), /^The Chapter 1 models also show · \d+ of \d+[\s\S]*cannot be tested yet: REQ-005/i);
  const obs = await page.$eval('.vx-obs li a[href*="object=REQ-005"]', a => a.getAttribute('href'));
  assert.match(obs, /chapter=1&tab=model/);
  await page.goto(base + obs, {waitUntil: 'networkidle'}); await page.waitForSelector('#inspector .cm-companion.sm .cm-spec', {timeout: 8000});
  assert.match(await spec(), /Requirement · REQ-005/i, 'an observation opens the model on what it concerns');
  pass('The switcher\'s Whole design opens the Whole design view of the Chapter 1 model (there is no page map behind it) and its own view comes back; a deep link opens on its record; Validate opens on its checks and shows what the Chapter 1 models find, each opening the model on its record');

  // 9. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=1&tab=model', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .sm-card'); await p2.waitForTimeout(400);
  // rc39/rc40 (model-round27.css, the phone rule): the model section is `auto` high with its content row `minmax(320px,1fr)`
  // and the page scrolls; the views tray and the Arrange bar stand above the stage. The round-3 floor was 360 px for a
  // section without those bars; the pin is the stylesheet's own floor plus the rule that the stage takes every pixel the
  // section's other rows leave (nothing between them is wasted). Recorded in audit/rc41/w4/NOTE.md for the lead.
  const m = await p2.evaluate(() => { const cm = document.querySelector('.cm'), stage = document.querySelector('.cm-stage'); const rows = [...cm.children].filter(c => c !== stage && getComputedStyle(c).display !== 'none' && getComputedStyle(c).position !== 'absolute').reduce((a, c) => a + c.getBoundingClientRect().height, 0); return {h: stage.getBoundingClientRect().height, section: cm.getBoundingClientRect().height, rows, floor: parseFloat(getComputedStyle(cm).gridTemplateRows.split(' ')[3]) || 0, over: document.documentElement.scrollWidth > innerWidth}; });
  assert.ok(m.h >= 320 && m.h >= m.section - m.rows - 12 && !m.over, 'phone ' + JSON.stringify(m));
  // Round 6 (R6-G): a step's story opens on the phone too, and nothing in it runs past the screen's edge.
  await p2.goto(base + '/?chapter=1&tab=model&artefact=JRN-002', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .sm-card'); await p2.waitForTimeout(400);
  await p2.$eval('#inspector .cm-companion [data-sm="story"]', b => b.click()); await p2.waitForTimeout(500);
  const m2 = await p2.evaluate(() => { const s = document.querySelector('.tn-story'); return {story: !!s, links: s ? s.querySelectorAll('.cm-link[data-cm-open]').length : 0, over: document.documentElement.scrollWidth > innerWidth, edge: s ? Math.max(...[...s.querySelectorAll('*')].map(e => e.getBoundingClientRect().right)) <= innerWidth : false}; });
  assert.ok(m2.story && m2.links > 5 && !m2.over && m2.edge, 'phone story ' + JSON.stringify(m2));
  await phone.close();
  pass('on a 390 px phone the journey map has a usable canvas and no horizontal page scroll, and a step’s story opens within the screen’s width');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 1 model (rendered)', passed: checks.length, checks}, null, 2));
