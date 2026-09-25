// Rendered checks for the Chapter 3 Model views (the decision map and the trade-offs).
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
const db = '.aiw-local/tradeoff-browser-' + port + '.sqlite';
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
  const open = async (extra = '') => { await page.goto(base + '/?chapter=3&tab=model' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.dx .dx-card', {timeout: 8000}); await page.waitForTimeout(400); };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(250); };
  const count = async sel => (await page.$$(sel)).length;
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' ').trim());
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.dx-card, .um-ch')].map(e => { const r = e.getBoundingClientRect(); return [e.className.split(' ')[0], e.dataset.card || '', Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join('|'); }));
  const panel = () => page.$eval('.cm-panel', e => e.innerText);
  const shown = sel => page.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }, sel);
  const closeDialog = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(300); if (await page.$('dialog[open]')) { await page.evaluate(() => document.querySelector('dialog[open]').close()); await page.waitForTimeout(200); } };

  const reviewAndApply = async reason => { await page.waitForSelector('dialog.wb-dialog[open]', {timeout: 5000}); await page.check('dialog.wb-dialog [data-reviewed]'); await page.fill('dialog.wb-dialog [name=reason]', reason); await page.click('dialog.wb-dialog [data-wb-action="apply-preview"]'); await page.waitForTimeout(1500); };

  // 1. Chapter 3 Model opens on the decision map, in place of the chapter's own map.
  await open();
  assert.ok(await page.$('.cm.dx .cm-view[data-id="map"][aria-pressed="true"]'));
  assert.ok(!(await shown('.d-map-card')) && !(await shown('#d-inspector')), 'the chapter\'s own map and inspector step aside');
  assert.equal(await count('.dx-card.drv'), 6); assert.equal(await count('.dx-card.dec:not(.style-proposal)'), 3); assert.equal(await count('.dx-card.alt'), 6); assert.equal(await count('.dx-card.style-proposal'), 1);
  assert.equal(await count('.cm-panel .cm-spec'), 0, 'nothing is selected on arrival');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /3 decisions · 6 alternatives · 0 with a working choice · 2 sensitivity points · style not recorded/);
  assert.match(await page.$eval('.dx-card[data-card="ALT-003"]', e => e.innerText), /Idempotent Consumer[\s\S]*Avoid[\s\S]*Missing Idempotency/i);
  pass('Chapter 3 Model opens on the decision map in place of the chapter\'s own map: the drivers by priority, three decisions, six alternatives with their patterns, failure boundaries and links to the pattern catalogue, and the architecture style as a decision not yet recorded');

  // 2. The lens changes what is read, never where anything is.
  const before = await rects();
  for (const lens of ['structure', 'flow', 'reasoning']) {
    await click(`[data-dx="lens"][data-id="${lens}"]`);
    assert.deepEqual(await rects(), before, lens + ' moved objects');
    const on = await page.$eval('.dx-card[data-card="ALT-003"]', e => [...e.querySelectorAll('.dx-lens>div')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.className));
    assert.deepEqual(on, [{flow: 'fl', reasoning: 'rs', structure: 'st'}[lens]]);
  }
  assert.match(await page.$eval('.dx-card[data-card="ALT-003"] .rs', e => e.innerText), /QD-001 ✓[\s\S]*QD-003 ⚠/);
  pass('Structure shows what an alternative would change, Flow what follows from it, Reasoning its pattern and its effect on each driver — and none of them moves anything');

  // 3. Selecting an alternative reads it; the working choice is made through Chapter 3's command.
  await page.focus('.dx-card[data-card="ALT-003"]'); await page.waitForTimeout(300);
  await click('.dx-card[data-card="ALT-003"] .dx-t');
  assert.match(await panel(), /Alternative · ALT-003 of ADR-002[\s\S]*Favoured[\s\S]*Enforce the reference at the posting boundary[\s\S]*As weighted[\s\S]*QD-001 \+×3 QD-003 −×2 QD-005 0 = \+1[\s\S]*Effect on each driver[\s\S]*Pattern knowledge[\s\S]*Idempotent Consumer[\s\S]*Missing Idempotency · anti-pattern/i);
  await click('.cm-panel [data-dx="choose"]'); await page.waitForTimeout(1500);
  assert.ok(await page.$('.dx-card.alt.chosen[data-card="ALT-003"]'), 'the working choice is made');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /1 with a working choice/);
  assert.match(await panel(), /Alternative · ALT-003 of ADR-002[\s\S]*Working choice/i, 'it stays selected, now the working choice');
  await click('.cm-panel [data-dx="edit-alt"]'); await page.waitForTimeout(400);
  assert.match(await page.$eval('dialog[open] #d-dialog-title', e => e.textContent), /Revise ALT-003/);
  await closeDialog();
  pass('selecting an alternative reads its reasoning — the weighting in plain arithmetic, its effect on every driver with the reasons, and what the playbook and the catalogue know of its pattern and failure boundary; Make it the working choice uses Chapter 3\'s own command, and Edit opens its editor');

  // 4. Trade-offs.
  await click('[data-dx="view"][data-id="matrix"]'); await page.waitForTimeout(500);
  assert.equal(await count('.dx-rh:not(.foot)'), 6); assert.equal(await count('.dx-ch:not(.style)'), 6); assert.equal(await count('.dx-ch.style'), 5);
  assert.equal(await count('.dx-cell.supports'), 8); assert.equal(await count('.dx-cell.tension'), 8);
  assert.match(await page.$eval('.dx-foot[data-card="ALT-005"]', e => e.innerText), /\+8[\s\S]*favoured/);
  assert.equal(await count('.dx-rh .dx-sens'), 2, 'the sensitivity points are marked on their drivers');
  assert.equal(await count('.dx-cell.style.cx'), 1, 'the playbook\'s style table speaks once, conditionally');
  pass('Trade-offs set every alternative against every driver it is weighed on, with the weighted reading beneath, the sensitivity points on their drivers and the SA Playbook\'s five styles read against the same drivers');

  // 5. Architecture style, recorded as a decision and compared from the playbook.
  await click('.cm-panel [data-dx="style-decision"]'); await page.waitForTimeout(400);
  assert.equal(await page.$eval('dialog[open] [name="topic"]', e => e.value), 'style');
  await page.$eval('#d-question-form', f => f.requestSubmit()); await page.waitForTimeout(1500);
  await click('[data-dx="view"][data-id="map"]'); await page.waitForTimeout(400);
  assert.equal(await count('.dx-card.suggested'), 5, 'the playbook\'s styles are offered as its alternatives');
  await page.focus('.dx-card.suggested[data-card="SUG:S-MODMONO"]'); await page.waitForTimeout(300);
  await click('.dx-card.suggested[data-card="SUG:S-MODMONO"] [data-dx="add-style"]'); await page.waitForTimeout(400);
  assert.match(await page.$eval('dialog[open] #d-dialog-title', e => e.textContent), /Review & edit the alternative proposal/);
  assert.equal(await page.$eval('dialog[open] [name="title"]', e => e.value), 'Adopt the Modular Monolith style');
  await page.$eval('#d-alternative-form', f => f.requestSubmit()); await page.waitForTimeout(800);
  await reviewAndApply('Compare the modular monolith as the structure for this design.');
  assert.equal(await count('.dx-card.suggested'), 4); assert.ok(await page.$('.dx-card.alt[data-card="ALT-007"]'));
  assert.doesNotMatch(await page.$eval('.cm-state', e => e.textContent), /style not recorded/);
  pass('architecture style is recorded as a Chapter 3 decision: the playbook\'s styles are offered as its alternatives, and one added through Chapter 3\'s own editor and change review arrives with the playbook\'s marks as its reasons');

  // 6. Walking the decisions; dissecting a driver.
  await click('[data-dx="walk-next"]');
  assert.match(await page.$eval('.cm-walk-text', e => e.innerText), /1 \/ 4 ADR-001 When should the customer receive a payment acknowledgement\?/);
  assert.equal(await count('.dx-card.now'), 1);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.focus('.dx-card[data-card="QD-004"]'); await page.waitForTimeout(200);
  await page.click('.dx-card[data-card="QD-004"] .dx-t'); await page.waitForTimeout(120); await page.click('.dx-card[data-card="QD-004"] .dx-t'); await page.waitForTimeout(500);
  assert.match(await crumbs(), /All decisions › QD-004/); assert.equal(await count('.dx-card.dec'), 2, 'only the decisions that weigh it');
  for (let i = 0; i < 3 && /›/.test(await crumbs()); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  assert.doesNotMatch(await crumbs(), /›/);
  pass('the decisions are walked in order, a driver opens on the decisions that weigh it, and Escape steps back to all decisions');

  // 7. All perspectives and back; deep link; Validate.
  await click('[data-dx="explore"]'); await page.waitForTimeout(500);
  assert.ok(!(await page.$('.cm.dx')) && await shown('.d-map-card'), 'the chapter\'s own decision-impact map');
  await click('.d-map-card [data-cm-open="3"]'); await page.waitForTimeout(600);
  assert.ok(await page.$('.cm.dx .dx-card') && !(await shown('.d-map-card')));
  await open('&decision=ADR-003');
  assert.match(await panel(), /Decision · ADR-003/i, 'a deep link opens on its decision');
  await page.click('[data-d-tab="validate"]'); await page.waitForTimeout(900);
  assert.ok(await page.$('.vx-ready') && !(await page.$('.cm')), 'Validate opens on SDD readiness');
  await page.waitForSelector('.vx-obs:not([hidden])', {timeout: 8000});
  assert.match(await page.$eval('.vx-obs', e => e.innerText), /Chapter 3 models also show/i);
  pass('All perspectives returns to the chapter\'s own decision-impact map and its Chapter 3 models button comes back; a deep link opens on its decision; Validate keeps SDD readiness first and shows what the Chapter 3 models find');

  // 8. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=3&tab=model', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .dx-card'); await p2.waitForTimeout(400);
  const m = await p2.evaluate(() => ({h: document.querySelector('.cm-stage').getBoundingClientRect().height, over: document.documentElement.scrollWidth > innerWidth}));
  assert.ok(m.h >= 360 && !m.over, 'phone ' + JSON.stringify(m));
  await phone.close();
  pass('on a 390 px phone the decision map has a usable canvas and no horizontal page scroll');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 3 model (rendered)', passed: checks.length, checks}, null, 2));
