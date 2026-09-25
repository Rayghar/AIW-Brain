// Rendered checks for the Chapter 2 Model views (the utility tree and What if).
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
const db = '.aiw-local/utility-browser-' + port + '.sqlite';
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
  const open = async (extra = '') => { await page.goto(base + '/?chapter=2&tab=model' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.um .um-card', {timeout: 8000}); await page.waitForTimeout(400); };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(250); };
  const count = async sel => (await page.$$(sel)).length;
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' ').trim());
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.um-card, .um-ch')].map(e => { const r = e.getBoundingClientRect(); return [e.className.split(' ')[0], e.dataset.card || '', Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join('|'); }));
  const panel = () => page.$eval('.cm-panel', e => e.innerText);
  const shown = sel => page.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }, sel);
  const closeDialog = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(300); if (await page.$('dialog[open]')) { await page.evaluate(() => document.querySelector('dialog[open]').close()); await page.waitForTimeout(200); } };

  // 1. Chapter 2 Model opens on the utility tree, in place of the chapter's own map.
  await open();
  assert.ok(await page.$('.cm.um .cm-view[data-id="tree"][aria-pressed="true"]'));
  assert.ok(!(await shown('.q-map-card')) && !(await shown('#q-inspector')), 'the chapter\'s own map and inspector step aside');
  assert.equal(await count('.um-card.drv'), 6); assert.equal(await count('.um-card.hole'), 4); assert.equal(await count('.um-card.fam'), 5); assert.equal(await count('.um-card.root'), 1);
  assert.equal(await count('.cm-panel .cm-spec'), 0, 'nothing is selected on arrival');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /6 drivers · 3 Critical · 4 playbook attributes with no driver · 8 tactics named/);
  assert.equal(await page.evaluate(() => document.querySelector('.um .cm-svg').getBoundingClientRect().width > 300), true);
  pass('Chapter 2 Model opens on the utility tree in place of the chapter\'s own map: utility, five qualities, the attributes the SA Playbook names and six drivers, with the four core attributes no driver covers as holes');

  // 2. The lens changes what is read, never where anything is.
  const before = await rects();
  for (const lens of ['structure', 'flow', 'reasoning']) {
    await click(`[data-um="lens"][data-id="${lens}"]`);
    assert.deepEqual(await rects(), before, lens + ' moved objects');
    const on = await page.$eval('.um-card[data-card="QD-002"]', e => [...e.querySelectorAll('.um-lens>div')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.className));
    assert.deepEqual(on, [{flow: 'fl', reasoning: 'rs', structure: 'st'}[lens]]);
  }
  assert.match(await page.$eval('.um-card[data-card="QD-002"] .rs', e => e.innerText), /✓ Heartbeat[\s\S]*✓ Redundancy/);
  await click('[data-um="lens"][data-id="structure"]');
  assert.match(await page.$eval('.um-card[data-card="QD-002"] .st', e => e.innerText), /APP-001 Payment service[\s\S]*Kubernetes · PostgreSQL · RabbitMQ/);
  await click('[data-um="lens"][data-id="reasoning"]');
  pass('Structure shows what carries each driver down to its products, Flow its scenario, Reasoning the playbook tactics it names and the decisions weighing it — and none of them moves anything');

  // 3. Selecting a driver reads it against the playbook; Chapter 2's editor is one click away.
  await click('.um-card[data-card="QD-002"] .um-t');
  const pq = await panel();
  assert.match(pq, /Quality driver · QD-002[\s\S]*Keep instruction intake available[\s\S]*Tactics · the SA Playbook\s*4 of 15[\s\S]*Heartbeat[\s\S]*Health checks[\s\S]*Decisions that weigh it[\s\S]*ADR-001[\s\S]*Carried by[\s\S]*Kubernetes[\s\S]*Pulls against/i);
  assert.ok(await count('.um-card.dim') >= 10, 'what it does not concern steps back');
  await click('.cm-panel [data-um="edit"]'); await page.waitForTimeout(400);
  assert.match(await page.$eval('dialog[open] #q-dialog-title', e => e.textContent), /Edit QD-002/);
  await closeDialog();
  pass('selecting a driver reads its scenario, the playbook tactics the design names with the quoted evidence and those it does not, the decisions that weigh it, what carries it and what it pulls against; Edit driver opens Chapter 2\'s own editor');

  // 4. A hole reads the playbook's attribute; a proposed driver fills it until dismissed.
  await click('.um-card.hole[data-card="A:scalability"] .um-t');
  const ps = await panel();
  assert.match(ps, /No driver[\s\S]*Scalability[\s\S]*Measured by[\s\S]*Cost of scaling[\s\S]*Technologies the playbook names[\s\S]*Kafka[\s\S]*Redis/i);
  await click('.cm-panel [data-um="propose"][data-attr="scalability"]'); await page.waitForTimeout(900);
  assert.match(await page.$eval('.cm-banner', e => e.innerText), /Quality driver proposal · not saved[\s\S]*Absorb a payment surge without losing instructions/i);
  assert.ok(await page.$('.um-card.proposed') && !(await page.$('.um-card.hole[data-card="A:scalability"]')), 'the proposal fills the hole');
  await click('.cm-banner [data-q-action="dismiss-ghost"]'); await page.waitForTimeout(600);
  assert.equal(await count('.um-card.proposed'), 0); assert.equal(await count('.um-card.hole'), 4);
  pass('a hole reads what the playbook says of the attribute — its definition, measures, example targets, design decisions and the technologies it names — and Explore draws a proposed driver in its place until it is dismissed');

  // 5. What if: move the target and the priority, read what stops holding, open the editor.
  await page.focus('.um-card[data-card="QD-002"]'); await page.waitForTimeout(500);
  await click('.um-card[data-card="QD-002"] [data-um="tune"]'); await page.waitForTimeout(500);
  assert.ok(await page.$('.cm-view[data-id="tune"][aria-pressed="true"]'));
  await click('[data-um="tune-target"][data-v="99.99"]'); await page.waitForTimeout(300);
  assert.match(await page.$eval('.um-tdrv', e => e.innerText), /≥ 99\.9 %[\s\S]*≥ 99\.99 %[\s\S]*4\.3 minutes of unavailability; 99\.9 % allowed 43\.2/);
  assert.match(await page.$eval('.um-rc[data-card="E:decision:ADR-001"]', e => e.innerText), /Revisit[\s\S]*in tension with QD-002/);
  assert.ok(await count('.um-bt') >= 2, 'what it reaches is read by chapter');
  assert.match(await panel(), /The arithmetic[\s\S]*The playbook suggests[\s\S]*Raising it pulls against/i);
  await click('.cm-panel [data-um="tune-apply"]'); await page.waitForTimeout(400);
  assert.match(await page.$eval('dialog[open] #q-dialog-title', e => e.textContent), /Edit QD-002/);
  assert.equal(await page.$eval('dialog[open] [name="targetValue"]', e => e.value), '99.99', 'the editor opens with the tuned target');
  await closeDialog();
  await page.selectOption('[data-um="tune-driver"]', 'QD-003'); await page.waitForTimeout(300);
  await click('[data-um="tune-priority"][data-v="Critical"]'); await page.waitForTimeout(300);
  assert.match(await page.$eval('.um-rc[data-card="E:decision:ADR-002"]', e => e.innerText), /Revisit[\s\S]*sensitivity point/);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  assert.ok(await page.$('.cm-view[data-id="tree"][aria-pressed="true"]'), 'Escape steps back to the tree');
  pass('What if moves a target or a priority without saving: 99.99 % reads as 4.3 minutes a month, ADR-001 must be revisited, the playbook suggests tactics and names what it pulls against; raising QD-003 to Critical shows ADR-002 turns on it; the editor opens with the tuned values');

  // 6. Walking the priorities; dissecting and folding.
  await click('[data-um="walk-next"]');
  assert.match(await page.$eval('.cm-walk-text', e => e.innerText), /1 \/ 6 QD-001 Preserve one financial effect — Critical/);
  assert.equal(await count('.um-card.now'), 1);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.click('.um-card[data-card="A:availability"] .um-t'); await page.waitForTimeout(120); await page.click('.um-card[data-card="A:availability"] .um-t'); await page.waitForTimeout(500);
  assert.match(await crumbs(), /All quality › Availability/); assert.equal(await count('.um-card.drv'), 1);
  for (let i = 0; i < 3 && /›/.test(await crumbs()); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  assert.doesNotMatch(await crumbs(), /›/);
  await click('[data-um="depth"][data-id="attributes"]');
  assert.equal(await count('.um-card.drv'), 0); assert.ok(await count('.um-card.attr.folded') >= 6);
  await click('[data-um="depth"][data-id="drivers"]');
  pass('the drivers are walked Critical first, an attribute opens on double-click, Escape steps back to the whole tree, and the tree folds to its attributes');

  // 7. All perspectives and back; deep link; Validate.
  await click('[data-um="explore"]'); await page.waitForTimeout(500);
  assert.ok(!(await page.$('.cm.um')) && await shown('.q-map-card'), 'the chapter\'s own quality map');
  await click('.q-map-card [data-cm-open="2"]'); await page.waitForTimeout(600);
  assert.ok(await page.$('.cm.um .um-card') && !(await shown('.q-map-card')));
  await open('&driver=QD-004');
  assert.match(await panel(), /Quality driver · QD-004/i, 'a deep link opens on its driver');
  await page.click('[data-q-tab="validate"]'); await page.waitForTimeout(900);
  assert.ok(await page.$('.vx-ready') && !(await page.$('.cm')), 'Validate opens on SDD readiness');
  await page.waitForSelector('.vx-obs:not([hidden])', {timeout: 8000});
  assert.match(await page.$eval('.vx-obs', e => e.innerText), /Chapter 2 models also show[\s\S]*no driver/i);
  pass('All perspectives returns to the chapter\'s own quality map and its Chapter 2 models button comes back; a deep link opens on its driver; Validate keeps SDD readiness first and shows what the Chapter 2 models find');

  // 8. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=2&tab=model', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .um-card'); await p2.waitForTimeout(400);
  const m = await p2.evaluate(() => ({h: document.querySelector('.cm-stage').getBoundingClientRect().height, over: document.documentElement.scrollWidth > innerWidth}));
  assert.ok(m.h >= 360 && !m.over, 'phone ' + JSON.stringify(m));
  await phone.close();
  pass('on a 390 px phone the utility tree has a usable canvas and no horizontal page scroll');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 2 model (rendered)', passed: checks.length, checks}, null, 2));
