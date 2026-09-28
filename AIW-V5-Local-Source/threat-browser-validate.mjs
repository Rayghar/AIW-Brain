// Rendered checks for the Chapter 9 Model views (threat model and threats × controls).
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
const db = '.aiw-local/threat-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => checks.push(n);
// The chapters' analytical views, which these checks read; the Diagram is the default since v20.6.
const modelOf = ch => ({4: 'map', 5: 'components', 6: 'platform', 7: 'stack', 8: 'sequence', 9: 'model', 10: 'deploy'}[ch] ? '&model=' + {4: 'map', 5: 'components', 6: 'platform', 7: 'stack', 8: 'sequence', 9: 'model', 10: 'deploy'}[ch] : '');
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const open = async (ch = 9) => { await page.goto(base + '/?chapter=' + ch + '&tab=model' + modelOf(ch), {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-head, .cm .dp-row, .cm .tm-card', {timeout: 8000}); await page.waitForTimeout(400); };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(250); };
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' '));
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.tm-card, .tm-x, .tm-label, .tm-lh')].map(e => { const r = e.getBoundingClientRect(); return [e.className.split(' ')[0], e.dataset.card || e.dataset.link || e.dataset.entry || e.dataset.lane || '', Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join('|'); }));
  const count = async sel => (await page.$$(sel)).length;

  // 1. Chapter 9 Model opens on the threat model across trust boundaries.
  await open();
  assert.ok(await page.$('.cm.tm .cm-view[data-id="model"][aria-pressed="true"]'));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.am-explorer, .canvas-card')].some(e => getComputedStyle(e).display !== 'none')), false, 'the explorer is not shown');
  assert.equal(await count('.tm-lh'), 5, 'outside, three boundaries, outside');
  assert.equal(await count('.tm-card'), 12, 'six parts, three stores and services in other boundaries, three parties');
  assert.equal(await count('.tm-x'), 7); assert.equal(await count('.tm-x.exposed'), 1); assert.equal(await count('.tm-x.guarded'), 2); assert.equal(await count('.tm-x.entry'), 4);
  assert.equal(await count('.tm-label'), 7, 'every contract is labelled');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /7 boundary crossings · 1 exposed · 2 guarded · 4 not examined/);
  const fits = await page.evaluate(() => { const s = document.querySelector('.cm-stage').getBoundingClientRect(), w = document.querySelector('.cm-world').getBoundingClientRect(); return w.width <= s.width + 2; });
  assert.ok(fits, 'the whole design fits the width');
  pass('Chapter 9 Model opens on the threat model: five trust regions, twelve elements, seven crossings marked guarded, exposed or not examined, and every contract labelled');

  // 2. The lens changes what is read, never where anything is.
  const before = await rects();
  for (const lens of ['information', 'flow', 'protection']) {
    await click(`[data-tm="lens"][data-id="${lens}"]`);
    assert.deepEqual(await rects(), before, lens + ' moved objects');
    const shown = await page.$eval('.tm-label', e => [...e.querySelectorAll('.tm-l2')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.className));
    assert.deepEqual(shown, ['tm-l2 ' + {information: 'in', flow: 'fl', protection: 'pr'}[lens]]);
  }
  pass('Protection, Information and Flow each show their own reading on every flow and leave every card, marker and label where it was');

  // 3. A crossing reads what protects it; an entry reads the store it enters.
  await click('.tm-x.exposed');
  assert.match(await page.$eval('.cm-panel .cm-spec', e => e.innerText), /IF-002 Ledger posting[\s\S]*THR-002/);
  assert.ok(await count('.tm-route.lit') >= 1 && await count('.tm-card.dim') > 5);
  await click('.tm-x.entry[data-entry="postgres"]');
  const spec = await page.$eval('.cm-panel .cm-spec', e => e.innerText);
  assert.match(spec, /Transactional persistence[\s\S]*Reached by[\s\S]*Payment service · from Payment services/);
  assert.match(spec, /Not examined/);
  pass('selecting the exposed crossing reads IF-002 and its uncovered threat; selecting an entry reads the store, who reaches it and from where');

  // 4. Record a threat here opens the Chapter 9 editor with the object preselected.
  await click('.tm-label[data-link="L:ext-channel>api-pod"] .tm-l1');
  await click('.cm-panel [data-tm="new-threat"]'); await page.waitForTimeout(500);
  assert.ok(await page.$('dialog[open] form#sec-editor'));
  assert.ok(await page.$eval('dialog[open] form#sec-editor', f => [...f.querySelectorAll('input[name="targetIds"]')].some(i => i.value === 'rest' && i.checked)), 'IF-001 is preselected');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  if (await page.$('dialog[open]')) { await page.evaluate(() => document.querySelector('dialog[open]').close()); await page.waitForTimeout(200); }
  pass('Record a threat here opens the Chapter 9 threat editor with the selected contract already chosen');

  // 5. Dissect, fold and walk.
  await open();
  await page.dblclick('.tm-card[data-card="api-pod"]'); await page.waitForTimeout(500);
  assert.match(await crumbs(), /Payment services › Payment service/);
  assert.ok(await page.$('.tm-card.subject[data-card="api-pod"]') && await count('.tm-card.ctx') >= 5);
  assert.ok(await page.$('.tm-card.region[data-card="REG:tb-002"]'), 'the rest of its boundary folds');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  if (/Payment service$/.test(await crumbs())) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  assert.match(await crumbs(), /Whole system › Payment services$/, 'Escape steps back to the boundary first');
  for (let i = 0; i < 3 && /›/.test(await crumbs()); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  assert.doesNotMatch(await crumbs(), /›/);
  await click('[data-tm="depth"][data-id="boundaries"]');
  assert.equal(await count('.tm-card.region'), 3); assert.equal(await count('.tm-card.party'), 3, 'parties outside stay themselves');
  await click('[data-tm="depth"][data-id="parts"]');
  await click('[data-tm="walk-next"]');
  assert.match(await page.$eval('.cm-walk-text', e => e.innerText), /1 \/ 7 Initiating channel → Payment service \(IF-001 Payment initiation\) crosses from outside into Payment services/);
  for (let i = 0; i < 3; i++) await click('[data-tm="walk-next"]');
  assert.match(await page.$eval('.cm-walk-text', e => e.innerText), /4 \/ 7 .*IF-002.*Not covered: THR-002/);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  pass('a part can be dissected with its neighbours beside it, Escape steps back, boundaries fold while parties stay, and the journey walk reads each crossing in order');

  // 6. Threats × controls, and a control proposal drawn as its own column.
  await click('[data-tm="view"][data-id="coverage"]');
  assert.equal(await count('.tm-trow'), 4); assert.equal(await count('.tm-ch'), 3); assert.equal(await count('.tm-cell'), 4);
  assert.equal(await count('.tm-cover.open'), 3); assert.equal(await count('.tm-ch.idle'), 1, 'SEC-003 is not linked to a threat');
  await click('.tm-trow[data-sel="thr-001"]');
  assert.match(await page.$eval('.cm-panel .cm-spec', e => e.innerText), /THR-001 · Payment without valid authority[\s\S]*DAT-001 Payment instruction · not covered/);
  await click('.tm-cover.open [data-tm="propose"][data-id="thr-001"]'); await page.waitForTimeout(700);
  assert.ok(await page.$('.tm-ch.proposed') && await count('.tm-cell.proposed') >= 1, 'the proposal is its own column');
  assert.match(await page.$eval('.cm-banner', e => e.innerText), /Control proposal · not saved[\s\S]*Instruction authority at the boundary for THR-001/i);
  assert.match(await page.$eval('.cm-state', e => e.textContent), /the proposal would close 1/);
  await click('[data-tm="view"][data-id="model"]');
  assert.ok(await count('.tm-route.proposed') >= 1, 'what it would protect is marked on the threat model');
  await click('.cm-banner [data-sec-action="dismiss"]'); await page.waitForTimeout(500);
  assert.ok(!(await page.$('.cm-banner .dp-banner')) && !(await page.$('.tm-route.proposed')));
  pass('Threats & controls shows the coverage rule per threat; Propose a control previews an unsaved column that would close THR-001, marks what it protects on the threat model, and dismissing leaves the design unchanged');

  // 7. The explorer is one click away; other chapters keep their models.
  await click('[data-tm="explore"]'); await page.waitForTimeout(400);
  assert.ok(await page.$('.am-explorer [data-am="chapter-model"]') && !(await page.$('.cm')));
  await click('.am-explorer [data-am="chapter-model"]'); await page.waitForTimeout(500);
  assert.ok(await page.$('.cm.tm .tm-card'));
  await open(8); assert.ok(await page.$('.cm .cm-msg') && !(await page.$('.cm.tm')), 'Chapter 8 keeps its sequence');
  await open(10); assert.ok(await page.$('.cm.dp .dp-row') && !(await page.$('.cm.tm')), 'Chapter 10 keeps its deployment grid');
  assert.equal(await count('.cm'), 1, 'only one chapter model is on the page');
  await open(9);
  await page.click('.workspace-bar [data-tab="validate"]'); await page.waitForTimeout(900);
  assert.ok(await page.$('.vx-ready') && !(await page.$('.cm')), 'Validate opens on SDD readiness');
  pass('Explore all perspectives and back, Chapters 8 and 10 keep their own models, only one chapter model is ever on the page, and Validate is unchanged');

  // 8. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=9&tab=model&model=model', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .tm-card'); await p2.waitForTimeout(400);
  const m = await p2.evaluate(() => ({h: document.querySelector('.cm-stage').getBoundingClientRect().height, over: document.documentElement.scrollWidth > innerWidth}));
  assert.ok(m.h >= 360 && !m.over, 'phone ' + JSON.stringify(m));
  await phone.close();
  pass('on a 390 px phone the threat model has a usable canvas and no horizontal page scroll');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 9 model (rendered)', passed: checks.length, checks}, null, 2));
