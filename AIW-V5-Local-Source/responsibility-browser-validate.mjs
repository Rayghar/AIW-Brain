// Rendered checks for the Chapter 4 Model views (responsibilities over the journey, and coverage).
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
const db = '.aiw-local/responsibility-browser-' + port + '.sqlite';
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
  const open = async (ch = 4) => { await page.goto(base + '/?chapter=' + ch + '&tab=model', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-head, .cm .dp-row, .cm .tm-card, .cm .rz-card, .cm .pf-cap, .cm .sk-rec, .cm .lr-card', {timeout: 8000}); await page.waitForTimeout(400); };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(250); };
  const count = async sel => (await page.$$(sel)).length;
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' ').trim());
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.lr-card, .lr-label, .lr-sh, .lr-bt, .lr-cell, .lr-ch, .lr-trow')].map(e => { const r = e.getBoundingClientRect(); return [e.className.split(' ')[0], e.dataset.card || e.dataset.link || e.dataset.lane || e.dataset.band || e.dataset.sel || '', Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join('|'); }));
  const spec = () => page.$eval('.cm-panel .cm-spec', e => e.innerText);
  const closeDialog = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(300); if (await page.$('dialog[open]')) { await page.evaluate(() => document.querySelector('dialog[open]').close()); await page.waitForTimeout(200); } };
  const twice = async sel => { await page.click(sel); await page.waitForTimeout(120); await page.click(sel); await page.waitForTimeout(500); };

  // 1. Chapter 4 Model opens on the responsibilities laid over the journey.
  await open();
  assert.ok(await page.$('.cm.lr .cm-view[data-id="map"][aria-pressed="true"]'));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.am-explorer, .canvas-card')].some(e => getComputedStyle(e).display !== 'none')), false, 'the explorer is not shown');
  assert.equal(await count('.lr-card.resp'), 5, 'five responsibilities'); assert.equal(await count('.lr-sh.step'), 5, 'five journey steps'); assert.equal(await count('.lr-bt.group'), 3, 'three groups');
  assert.equal(await count('.lr-label'), 4, 'every logical flow is labelled'); assert.equal(await count('.lr-route'), 4);
  assert.equal(await count('.lr-card.resp .lr-c'), 5, 'each carries the component that realises it');
  assert.equal(await count('.cm-panel .cm-spec'), 0, 'nothing is selected on arrival');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /5 responsibilities in 3 groups · 5 journey steps · 0 unowned · 4 logical flows · 0 not carried/);
  pass('Chapter 4 Model opens on the responsibilities laid over the journey: five steps across, three groups down, each responsibility at the step it serves carrying the component that realises it, and the four logical flows between them');

  // 2. The lens changes what is read, never where anything is.
  const before = await rects();
  for (const lens of ['flow', 'reasoning', 'structure']) {
    await click(`[data-lr="lens"][data-id="${lens}"]`);
    assert.deepEqual(await rects(), before, lens + ' moved objects');
    const shown = await page.$eval('.lr-card[data-card="risk"]', e => [...e.querySelectorAll('.lr-lens>div')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.className));
    assert.deepEqual(shown, [{flow: 'fl', reasoning: 'rs', structure: 'st'}[lens]]);
  }
  await click('[data-lr="lens"][data-id="flow"]');
  assert.match(await page.$eval('.lr-card[data-card="risk"] .fl', e => e.innerText), /← LR-001 Screen[\s\S]*→ LR-003 Allow ◇/);
  await click('[data-lr="lens"][data-id="reasoning"]');
  assert.match(await page.$eval('.lr-card[data-card="risk"] .rs', e => e.innerText), /REQ-002[\s\S]*no decision/);
  assert.match(await page.$eval('.lr-label[data-link="L:risk>ledger"]', e => e.innerText), /only if[\s\S]*Only an explicit allow decision/);
  await click('[data-lr="lens"][data-id="structure"]');
  pass('Structure, Flow and Reasoning each give their own reading — what a responsibility owns, where its work comes from and goes, why it exists — and the condition on a flow; none of them moves anything');

  // 3. Selecting reads the responsibility; the chapter's editor and proposals are one click away.
  await click('.lr-card[data-card="risk"] .lr-t');
  assert.match(await spec(), /Responsibility · LR-002[\s\S]*Risk screening[\s\S]*Serves[\s\S]*Screen for risk[\s\S]*Decided by[\s\S]*No decision linked[\s\S]*Realised by[\s\S]*APP-002 Risk engine/i);
  assert.equal(await count('.lr-card.lit'), 3, 'what hands it work and what it hands work to'); assert.equal(await count('.lr-card.dim'), 2);
  await click('.cm-panel [data-l-action="edit"]'); await page.waitForTimeout(400);
  assert.match(await page.$eval('dialog[open] #l-dialog-title', e => e.textContent), /Edit LR-002 · Risk screening/);
  await closeDialog();
  await click('.cm-panel [data-l-action="preview"][data-l-key="review"]'); await page.waitForTimeout(800);
  assert.match(await page.$eval('.cm-banner', e => e.innerText), /Responsibility proposal · not saved[\s\S]*Manual review queue/i);
  assert.equal(await count('.lr-card.proposed'), 1, 'the proposed responsibility stands in its group'); assert.equal(await count('.lr-route.proposed'), 1);
  assert.match(await spec(), /Proposal · not saved[\s\S]*Manual review queue[\s\S]*Works with[\s\S]*LR-002 Risk screening/i);
  await click('.cm-banner [data-l-action="dismiss-ghost"]'); await page.waitForTimeout(600);
  assert.equal(await count('.lr-card.proposed'), 0);
  pass('selecting a responsibility reads its group, step, boundary, flows, reasons and realisation; Edit opens the Chapter 4 editor, and Propose manual review queue stands the proposal in its group beside Risk screening until dismissed');

  // 4. Editing a saved responsibility is staged as a model proposal.
  await click('.lr-card[data-card="notify"] .lr-t');
  await click('.cm-panel [data-l-action="edit"]'); await page.waitForTimeout(400);
  await page.evaluate(() => { const f = document.querySelector('#l-responsibility-form'); f.elements.groupId.value = 'GRP-003'; f.elements.groupId.dispatchEvent(new Event('change', {bubbles: true})); f.requestSubmit(); });
  await page.waitForTimeout(1400);
  assert.ok(!(await page.$('dialog[open]')), 'the edit is staged');
  assert.match(await page.$eval('.cm-banner .ip-banner', e => e.innerText), /Unsaved proposal[\s\S]*Model proposal/i);
  assert.match(await page.$eval('.lr-bt[data-band="GRP-003"]', e => e.innerText), /2 responsibilities/i, 'in the proposed model LR-005 has moved into Settlement');
  const band = await page.$eval('.lr-bt[data-band="GRP-003"]', e => { const r = e.getBoundingClientRect(); return [r.top, r.bottom]; }), card = await page.$eval('.lr-card[data-card="notify"]', e => { const r = e.getBoundingClientRect(); return [r.top, r.bottom]; });
  assert.ok(card[0] >= band[0] - 8 && card[1] <= band[1] + 8, 'and its card stands in the Settlement band');
  assert.ok(await count('.lr-card.changed') >= 1, 'what the proposal changes is marked');
  await click('.cm-banner [data-ip-action="dismiss"]'); await page.waitForTimeout(400);
  await click('[data-ip-action="discard-confirm"]'); await page.waitForTimeout(700);
  assert.ok(!(await page.$('.cm-banner .ip-banner')) && /2 responsibilities/i.test(await page.$eval('.lr-bt[data-band="GRP-001"]', e => e.innerText)), 'discarding restores the saved design');
  pass('moving LR-005 to another group in the Chapter 4 editor is staged as a model proposal: the model shows it in the Settlement band and marks what changes, and discarding restores the saved design');

  // 5. Walking a journey, and recording the walk.
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.selectOption('.cm-scn select', 'hold'); await page.waitForTimeout(250);
  for (let i = 0; i < 2; i++) await click('[data-lr="walk-next"]');
  assert.match(await page.$eval('.cm-walk-text', e => e.innerText), /2 \/ 2 02 Screen for risk\. Served by LR-002 Risk screening[\s\S]*The Risk hold journey ends here — the onward flow carries a condition/);
  assert.equal(await count('.lr-sh.out'), 3, 'steps the journey never reaches fade'); assert.equal(await count('.lr-sh.now'), 1); assert.equal(await count('.lr-sh.done'), 1);
  assert.equal(await count('.lr-route.stop'), 1, 'the conditional flow the hold does not take is marked');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.selectOption('.cm-scn select', 'success'); await page.waitForTimeout(250);
  assert.ok(!(await page.$('[data-lr="record"]')), 'a walk is recorded only once it has been walked');
  for (let i = 0; i < 5; i++) await click('[data-lr="walk-next"]');
  await click('[data-lr="record"]'); await page.waitForTimeout(1200);
  assert.ok(await page.$('.lr-rec.ok'));
  assert.deepEqual(await page.evaluate(() => window.aiwProjectStore.value.document.logical.scenarios.success.visited), [0, 1, 2, 3, 4]);
  assert.match(await page.$eval('.cm-scn select', e => e.selectedOptions[0].textContent), /Successful payment ✓/);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  pass('walking the risk hold lights each step and what serves it, fades the steps it never reaches, marks the flow it does not take and says where it stops; walking the successful payment to its end records the Chapter 4 scenario review');

  // 6. Dissect and fold.
  await twice('.lr-card[data-card="ledger"] .lr-t');
  assert.match(await crumbs(), /Whole journey › Control & accounting › Core ledger/);
  assert.equal(await count('.lr-card'), 3, 'the ledger with what hands it work and what it hands work to');
  for (let i = 0; i < 2; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  assert.match(await crumbs(), /Control & accounting$/); assert.equal(await count('.lr-card'), 4, 'the group with its neighbours');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  assert.doesNotMatch(await crumbs(), /›/);
  await click('[data-lr="depth"][data-id="groups"]');
  assert.equal(await count('.lr-card.cell'), 3, 'one card per group'); assert.equal(await count('.lr-sh.step'), 3, 'at the first step each acts on');
  await click('[data-lr="depth"][data-id="responsibilities"]');
  pass('a responsibility opens with its neighbours, Escape steps back through its group to the whole journey, and groups fold to one card each at the first step they act on');

  // 7. Coverage: the reasons against the responsibilities.
  await click('[data-lr="view"][data-id="coverage"]'); await page.waitForTimeout(300);
  assert.equal(await count('.lr-trow'), 14); assert.equal(await count('.lr-ch'), 5); assert.equal(await count('.lr-cell'), 35);
  assert.match(await page.$eval('.cm-state', e => e.textContent), /5 requirements · 0 not covered · 6 quality drivers · 3 decisions \(3 drafts\)/);
  const cov = await rects();
  await click('[data-lr="lens"][data-id="reasoning"]'); assert.deepEqual(await rects(), cov, 'the lens moves nothing in coverage either'); await click('[data-lr="lens"][data-id="structure"]');
  await click('.lr-ch[data-sel="risk"]');
  assert.equal(await count('.lr-plus'), 7, 'the requirements and decisions LR-002 could carry');
  await click('.lr-plus[data-row="REQ-001"][data-col="risk"]'); await page.waitForTimeout(400);
  assert.ok(await page.$eval('#l-responsibility-form', f => f.querySelector('input[name="requirementIds"][value="REQ-001"]').checked), 'a missing requirement link opens the Chapter 4 editor with it ticked');
  await closeDialog();
  await click('.lr-plus[data-row="ADR-002"][data-col="risk"]'); await page.waitForTimeout(500);
  assert.ok(await page.$eval('#l-responsibility-form', f => f.querySelector('input[name="decisionIds"][value="ADR-002"]').checked), 'and so does a missing decision link');
  await closeDialog();
  await click('[data-lr="view"][data-id="map"]');
  pass('Coverage lays five requirements, six quality drivers and three draft decisions against the five responsibilities; selecting a responsibility offers the links it lacks, each opening the Chapter 4 editor with the link ticked, and the lens moves nothing');

  // 8. The explorer is one click away; other chapters keep their models.
  await click('[data-lr="explore"]'); await page.waitForTimeout(400);
  assert.ok(await page.$('.am-explorer [data-am="chapter-model"]') && !(await page.$('.cm')));
  await click('.am-explorer [data-am="chapter-model"]'); await page.waitForTimeout(500);
  assert.ok(await page.$('.cm.lr .lr-card'));
  await page.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'}); await page.waitForTimeout(900);
  assert.ok(await page.$('.cm.dk .dk-cell'), 'chapter 11 opens on the review desk');
  await open(5); assert.ok(await page.$('.cm.rz') && !(await page.$('.cm.lr')), 'Chapter 5 keeps its own models');
  assert.equal(await count('.cm'), 1, 'only one chapter model is on the page');
  await page.goto(base + '/?chapter=4&tab=model&object=ledger', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .lr-card'); await page.waitForTimeout(500);
  assert.match(await spec(), /Responsibility · LR-003[\s\S]*Core ledger/i, 'a deep link opens on its object');
  await page.click('.workspace-bar [data-tab="validate"]'); await page.waitForTimeout(900);
  assert.ok(await page.$('.vx-ready') && !(await page.$('.cm')), 'Validate opens on SDD readiness');
  pass('Explore all perspectives and back, Chapter 11 opens on the review desk, Chapter 5 keeps its own models, only one chapter model is ever on the page, a deep link opens on its object, and Validate is unchanged');

  // 9. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=4&tab=model', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .lr-card'); await p2.waitForTimeout(400);
  const m = await p2.evaluate(() => ({h: document.querySelector('.cm-stage').getBoundingClientRect().height, over: document.documentElement.scrollWidth > innerWidth}));
  assert.ok(m.h >= 360 && !m.over, 'phone ' + JSON.stringify(m));
  await phone.close();
  pass('on a 390 px phone the journey has a usable canvas and no horizontal page scroll');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 4 model (rendered)', passed: checks.length, checks}, null, 2));
