// Rendered checks for the Chapter 1 Model views (the journey map and the context).
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
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => checks.push(n);
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const open = async (extra = '') => { await page.goto(base + '/?chapter=1&tab=model' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.sm .sm-card', {timeout: 8000}); await page.waitForTimeout(400); };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(250); };
  const count = async sel => (await page.$$(sel)).length;
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' ').trim());
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.sm-card, .sm-sh, .sm-bt, .sm-note, .sm-label')].map(e => { const r = e.getBoundingClientRect(); return [e.className.split(' ')[0], e.dataset.card || e.dataset.lane || e.dataset.link || '', Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join('|'); }));
  const spec = () => page.$eval('.cm-panel .cm-spec', e => e.innerText);
  const shown = sel => page.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }, sel);
  const closeDialog = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(300); if (await page.$('dialog[open]')) { await page.evaluate(() => document.querySelector('dialog[open]').close()); await page.waitForTimeout(200); } };

  // 1. Chapter 1 Model opens on the journey map, in place of the chapter's own map.
  await open();
  assert.ok(await page.$('.cm.sm .cm-view[data-id="map"][aria-pressed="true"]'));
  assert.ok(!(await shown('.r-map-card')) && !(await shown('.r-inspector')), 'the chapter\'s own map and inspector step aside');
  assert.equal(await count('.sm-sh.step'), 5, 'the journey\'s five steps as the backbone'); assert.equal(await count('.sm-card.req'), 5); assert.equal(await count('.sm-bt'), 1, 'one slice: everything is Must');
  assert.equal(await count('.sm-next:not(.broken):not(.k)'), 4, 'the recorded order between steps'); assert.equal(await count('.sm-card.req .sm-lr'), 5, 'each carries the Chapter 4 responsibility covering it');
  assert.equal(await page.evaluate(() => document.querySelector('.sm .cm-svg').getBoundingClientRect().width > 300), true, 'the drawing keeps its size on the chapter\'s own page');
  assert.equal(await count('.cm-panel .cm-spec'), 0, 'nothing is selected on arrival');
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
  await click('.cm-panel [data-sm="edit"]'); await page.waitForTimeout(400);
  assert.match(await page.$eval('dialog[open] #r-dialog-title', e => e.textContent), /Edit REQ-004/);
  await closeDialog();
  pass('selecting a requirement reads where it is needed, what it delivers, what limits it and what covers it, and Edit requirement opens Chapter 1\'s own editor');

  // 4. Proposals from Chapter 1: an enquiry for uncertain outcomes stands in a Should slice.
  await click('.sm-sh[data-lane="JRN-004"] b');
  assert.match(await spec(), /Journey step · 04[\s\S]*Settle the payment[\s\S]*Taking part[\s\S]*Operations analyst/i);
  await click('.cm-panel [data-r-proposal="pending"]'); await page.waitForTimeout(900);
  assert.match(await page.$eval('.cm-banner', e => e.innerText), /Requirement proposal · not saved[\s\S]*Enquire about a pending payment/i);
  assert.equal(await count('.sm-bt'), 2, 'a Should slice appears'); assert.ok(await page.$('.sm-card.proposed'));
  assert.equal(await page.$eval('.sm-card.proposed', e => Math.round(e.getBoundingClientRect().x)), await page.$eval('.sm-card[data-card="REQ-004"]', e => Math.round(e.getBoundingClientRect().x)), 'under Settle the payment');
  await click('.cm-banner [data-r-action="dismiss-ghost"]'); await page.waitForTimeout(600);
  assert.equal(await count('.sm-card.proposed'), 0); assert.equal(await count('.sm-bt'), 1);
  await click('.cm-panel .sm-insw [data-r-proposal="acceptance"]'); await page.waitForTimeout(900);
  assert.ok(await page.$('.sm-card.ghosted[data-card="REQ-005"]'), 'the acceptance proposal marks REQ-005 with what it would change');
  await click('.cm-banner [data-r-action="dismiss-ghost"]'); await page.waitForTimeout(600);
  await click('.cm-panel .sm-insw [data-r-proposal="assumption"]'); await page.waitForTimeout(900);
  assert.ok(await page.$('.cm-view[data-id="context"][aria-pressed="true"]'), 'a proposed limit is shown where limits stand, in the context');
  assert.match(await page.$eval('.sm-note.proposed', e => e.innerText), /Proposal · not saved · Assumption[\s\S]*Confirm the external enquiry contract/i);
  assert.match(await spec(), /Proposal · not saved[\s\S]*Confirm the external enquiry contract[\s\S]*Assumption · not confirmed/i);
  await click('.cm-banner [data-r-action="dismiss-ghost"]'); await page.waitForTimeout(600);
  assert.equal(await count('.sm-note.proposed'), 0); assert.equal(await count('.cm-panel .cm-spec'), 0, 'dismissed, nothing stays selected');
  await click('[data-sm="view"][data-id="map"]');
  pass('the chapter\'s proposals are drawn in place: an enquiry about a pending payment stands under Settle in a Should slice of its own, observable acceptance marks REQ-005, and an unverified dependency stands among the limits in the context — each until dismissed');

  // 5. Adding a requirement for a step connects it there.
  await click('.sm-sh[data-lane="JRN-002"] b');
  await click('.cm-panel [data-sm="add-for-step"]'); await page.waitForTimeout(400);
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
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.click('.sm-sh[data-lane="JRN-002"] b'); await page.waitForTimeout(120); await page.click('.sm-sh[data-lane="JRN-002"] b'); await page.waitForTimeout(500);
  assert.match(await crumbs(), /Whole journey › Step 02 Screen the instruction/);
  assert.equal(await count('.sm-card.req'), 2);
  for (let i = 0; i < 2 && /›/.test(await crumbs()); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  assert.doesNotMatch(await crumbs(), /›/);
  await click('[data-sm="depth"][data-id="steps"]');
  assert.ok(await count('.sm-card.cell') >= 5, 'each slice of each step folds to one card');
  await click('[data-sm="depth"][data-id="requirements"]');
  pass('the journey is walked step by step, a step opens with what it needs, Escape steps back to the whole journey, and each slice of each step folds to one card');

  // 7. Context: the system's boundary, the people around it, the outcomes and their owners.
  await click('[data-sm="view"][data-id="context"]'); await page.waitForTimeout(400);
  assert.equal(await count('.sm-lh'), 4); assert.equal(await count('.sm-card.ctx'), 11); assert.equal(await count('.sm-note'), 4);
  assert.ok(await count('.sm-route') >= 11, 'who takes part, what delivers each outcome, and who owns it');
  assert.match(await page.$eval('.sm-lh.system', e => e.innerText), /Bank Payment Journey[\s\S]*in scope: Domestic account-to-account payment/);
  assert.ok(await page.$('.sm-note.n-out'), 'what is out of scope stands outside, beneath');
  const cr = await rects();
  await click('[data-sm="lens"][data-id="reasoning"]'); assert.deepEqual(await rects(), cr, 'the lens moves nothing in the context either'); await click('[data-sm="lens"][data-id="structure"]');
  await click('.sm-card[data-card="OUT-002"] .sm-t');
  assert.ok(await page.$('.sm-route.lit'), 'selecting an outcome lights the paths to it');
  assert.match(await spec(), /Business outcome · OUT-002[\s\S]*Delivered by[\s\S]*REQ-003[\s\S]*Owned by[\s\S]*STK-002/i);
  await click('[data-sm="view"][data-id="map"]');
  pass('the context draws the system as its boundary with its steps in order, the people who take part, the outcomes it exists for and their owners, with the limits on the design beneath; selecting an outcome lights the paths that deliver it');

  // 8. All perspectives returns to the chapter's own map, and back; Validate is unchanged.
  await click('[data-sm="explore"]'); await page.waitForTimeout(500);
  assert.ok(!(await page.$('.cm')) && await shown('.r-map-card'), 'the chapter\'s own requirements map');
  await click('.r-map-card [data-cm-open="1"]'); await page.waitForTimeout(600);
  assert.ok(await page.$('.cm.sm .sm-card') && !(await shown('.r-map-card')));
  await open('&artefact=REQ-003');
  assert.match(await spec(), /Requirement · REQ-003/i, 'a deep link opens on its record');
  await page.click('.r-tabs [data-r-tab="validate"], [data-r-tab="validate"]'); await page.waitForTimeout(900);
  assert.ok(await page.$('.vx-ready') && !(await page.$('.cm')), 'Validate opens on SDD readiness');
  assert.ok(await page.$('.vx-tile.cur[href*="chapter=1"]'), 'Chapter 1 is marked on the readiness line');
  await page.waitForSelector('.vx-obs:not([hidden])', {timeout: 8000});
  assert.match(await page.$eval('.vx-obs', e => e.innerText), /Chapter 1 models also show[\s\S]*cannot be tested yet: REQ-005/i);
  const obs = await page.$eval('.vx-obs li a[href*="object=REQ-005"]', a => a.getAttribute('href'));
  assert.match(obs, /chapter=1&tab=model/);
  await page.goto(base + obs, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.sm .cm-panel .cm-spec', {timeout: 8000});
  assert.match(await spec(), /Requirement · REQ-005/i, 'an observation opens the model on what it concerns');
  pass('All perspectives returns to the chapter\'s own requirements map and its Chapter 1 models button comes back; a deep link opens on its record; Validate keeps SDD readiness first and shows what the Chapter 1 models find, each opening the model on its record');

  // 9. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=1&tab=model', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .sm-card'); await p2.waitForTimeout(400);
  const m = await p2.evaluate(() => ({h: document.querySelector('.cm-stage').getBoundingClientRect().height, over: document.documentElement.scrollWidth > innerWidth}));
  assert.ok(m.h >= 360 && !m.over, 'phone ' + JSON.stringify(m));
  await phone.close();
  pass('on a 390 px phone the journey map has a usable canvas and no horizontal page scroll');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 1 model (rendered)', passed: checks.length, checks}, null, 2));
