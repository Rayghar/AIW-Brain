// Rendered checks for the Chapter 6 Model views (the platform stack and what fails together).
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
const db = '.aiw-local/platform-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => checks.push(n);
// The chapters' analytical views, which these checks read; the Diagram is the default since v20.6.
const modelOf = ch => ({4: 'map', 5: 'components', 6: 'platform', 7: 'stack', 8: 'data', 9: 'model', 10: 'deploy'}[ch] ? '&model=' + {4: 'map', 5: 'components', 6: 'platform', 7: 'stack', 8: 'data', 9: 'model', 10: 'deploy'}[ch] : '');
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  // rc38 shell (rc41 W4): the Model companion lives in the Details column (#inspector .cm-companion), which the shell
  // leaves closed when nothing is selected on arrival; the suite opens it with the toolbar's toggle, as a viewer does,
  // and asserts only on what the open column shows.
  const showCompanion = async () => { await page.waitForSelector('body[data-panel]', {state: 'attached', timeout: 10000}); if (await page.evaluate(() => document.body.dataset.panel !== 'open')) { await page.click('.workspace-tools [data-panel-toggle]'); await page.waitForSelector('#inspector[aria-hidden="false"]', {timeout: 5000}); await page.waitForTimeout(400); } };
  const open = async (ch = 6) => { await page.goto(base + '/?chapter=' + ch + '&tab=model' + modelOf(ch), {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-head, .cm .dp-row, .cm .tm-card, .cm .rz-card, .cm .pf-cap', {timeout: 8000}); await showCompanion(); await page.waitForTimeout(400); };
  // A pointer click where the element can be hit. Focusing a card moves the camera to reveal it (model-stage.js, focusin),
  // so a card or a lane head can end up behind the sheet's sticky corner, its heads or the minimap; the helper samples the
  // element's own box (5 × 3) for a point the hit test lands on, and when every point is covered it fits the drawing with
  // the product's own "Fit whole drawing" control, as a viewer would, and asserts the element is then reachable.
  // The box is read once it holds still for two polls (a camera move or a reveal animates), then sampled.
  const settled = sel => page.waitForFunction(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), k = [r.x, r.y, r.width, r.height].map(Math.round).join(','); const same = e.__w4Box === k; e.__w4Box = k; return same; }, sel, {polling: 120, timeout: 5000});
  const freePoint = async sel => { await page.$eval(sel, e => e.scrollIntoView({block: 'nearest', inline: 'nearest'})); await settled(sel); return page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); for (const fy of [0.5, 0.25, 0.75]) for (const fx of [0.5, 0.2, 0.8, 0.35, 0.65]) { const x = r.x + r.width * fx, y = r.y + r.height * fy; const t = document.elementFromPoint(x, y); if (t && (e.contains(t) || t.contains(e))) return {x: r.width * fx, y: r.height * fy}; } return null; }, sel); };
  const click = async sel => {
    await page.waitForSelector(sel, {state: 'visible', timeout: 10000});
    let at = await freePoint(sel);
    if (!at) { await page.$eval('[data-cm-camera="whole"]', b => b.click()); await page.waitForTimeout(300); at = await freePoint(sel); assert.ok(at, sel + ' is reachable once the drawing is fitted'); }
    await page.click(sel, {position: at}); await page.waitForTimeout(250); };
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' '));
  const count = async sel => (await page.$$(sel)).length;
  // Positions in the model's own world (round 3, B): in the page's one frame the stage is shorter, so focusing an element
  // near its foot may move the camera or scroll the stage column; neither is the layout these checks hold still.
  // rc39/rc40 (rc41 W4): changing view re-fits the camera, so the rectangles are read in the world's own units — divided by
  // the container's scale on each axis (its drawn size over its layout size) — which is the layout, not the camera.
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.pf-cell, .pf-cap, .pf-ch, .pf-fail')].map(e => { const r = e.getBoundingClientRect(), c = e.closest('.cm-world, .cm-heads-in, .cm-rail-in') || e.closest('.cm-stage') || e.closest('.cm'), o = c?.getBoundingClientRect() || {x: 0, y: 0, width: 1, height: 1}; const sx = c?.offsetWidth ? o.width / c.offsetWidth : 1, sy = c?.offsetHeight ? o.height / c.offsetHeight : 1; return [e.className.split(' ')[0], e.dataset.sel || e.dataset.id || '', Math.round((r.x - o.x) / sx), Math.round((r.y - o.y) / sy), Math.round(r.width / sx), Math.round(r.height / sy)].join('|'); }));
  const spec = () => page.$eval('#inspector .cm-companion .cm-spec', e => e.innerText);
  const closeDialog = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(300); if (await page.$('dialog[open]')) { await page.evaluate(() => document.querySelector('dialog[open]').close()); await page.waitForTimeout(200); } };

  // 1. Chapter 6 Model opens on the platform stack.
  await open();
  assert.ok(await page.$('.cm.pf .cm-view[data-id="platform"][aria-pressed="true"]'));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.am-explorer, .canvas-card')].some(e => getComputedStyle(e).display !== 'none')), false, 'the explorer is not shown');
  assert.equal(await count('.pf-cap'), 9, 'nine capabilities'); assert.equal(await count('.pf-ch'), 5, 'five components');
  assert.equal(await count('.pf-cell'), 28, 'every need where a component meets a capability');
  assert.ok(await count('.pf-plate') >= 9, 'shared support joins into plates'); assert.equal(await count('.pf-arc'), 4, 'four dependencies');
  assert.equal(await page.$$eval('.pf-fail', els => els.filter(e => /Stops 5 of 5/.test(e.innerText)).length), 3, 'execution, connectivity and identity each stop everything');
  assert.equal(await count('#inspector .cm-companion .cm-spec'), 0, 'nothing is selected on arrival');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /9 capabilities support 5 components through 28 needs · 0 unsupported · 7 single paths · 1 failure domain/);
  pass('Chapter 6 Model opens on the platform stack: nine capabilities in their families, five components, every need where they meet, four dependencies, and what each capability\'s loss stops');

  // 2. The lens changes what is read, never where anything is.
  const before = await rects();
  for (const lens of ['operation', 'protection', 'structure']) {
    await click(`[data-pf="lens"][data-id="${lens}"]`);
    assert.deepEqual(await rects(), before, lens + ' moved objects');
    const shown = await page.$eval('.pf-cap[data-sel="postgres"]', e => [...e.querySelectorAll('.pf-l')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.className));
    assert.deepEqual(shown, ['pf-l ' + {operation: 'op', protection: 'pr', structure: 'st'}[lens]]);
  }
  await click('[data-pf="lens"][data-id="protection"]');
  assert.equal(await page.$$eval('.pf-cell.crossing .pf-x', els => els.filter(e => getComputedStyle(e).display !== 'none').length), 15, 'fifteen needs cross into another trust boundary');
  await click('[data-pf="lens"][data-id="structure"]');
  pass('Structure, Operation and Protection each give their own reading — Protection marks the fifteen needs that cross a trust boundary — and none of them moves anything');

  // 3. Selecting reads the capability; the chapter's editor and proposals are one click away.
  await click('.pf-cap[data-sel="postgres"]');
  assert.match(await spec(), /Transactional persistence[\s\S]*Supports[\s\S]*Payment service[\s\S]*Continuity[\s\S]*Single path[\s\S]*Recovery[\s\S]*No recovery plan/);
  assert.ok(await count('.pf-cell.lit') === 3 && await count('.pf-cell.dim') >= 20);
  await click('#inspector .cm-companion [data-t-action="edit"]'); await page.waitForTimeout(400);
  assert.match(await page.$eval('dialog[open] #t-dialog-title', e => e.textContent), /Edit TC-002 · Transactional persistence/);
  await closeDialog();
  await click('#inspector .cm-companion [data-t-action="preview"][data-t-key="restore"]'); await page.waitForTimeout(800);
  assert.match(await page.$eval('.cm-banner', e => e.innerText), /Capability proposal · not saved[\s\S]*recovery dependencies/i);
  assert.equal(await count('.pf-arc.proposed'), 2, 'the recovery path is drawn to backup and recovery');
  await click('.cm-banner [data-t-action="dismiss"]'); await page.waitForTimeout(500);
  assert.equal(await count('.pf-arc.proposed'), 0);
  pass('selecting a capability reads what it supports, depends on, and how it continues and recovers; Edit capability opens the Chapter 6 editor, and Propose a recovery path draws its two dependencies until dismissed');

  // 4. What fails together.
  await click('.pf-fail[data-id="gateway"]'); await page.waitForTimeout(300);
  assert.ok(await page.$('.cm-view[data-id="failure"][aria-pressed="true"]'));
  assert.equal(await count('.pf-ch.unavailable'), 5, 'every component stops');
  assert.equal(await count('.pf-cap.unavailable'), 2, 'connectivity takes execution with it');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /Service connectivity lost · 2 capabilities down · 5 of 5 components stop/);
  for (let i = 0; i < 2; i++) await click('[data-pf="walk-next"]');
  assert.match(await page.$eval('.cm-walk-text', e => e.innerText), /2 \/ 4 · What depends on it Critical dependencies carry it to Application execution/);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await click('[data-pf="mode"][data-id="domain"]');
  assert.equal(await count('.pf-cap.unavailable'), 8, 'the shared domain loses every capability but the safe bypass');
  assert.equal(await count('.pf-cap.degraded'), 1);
  await click('[data-pf="view"][data-id="platform"]');
  assert.deepEqual(await rects(), before, 'the failure view moved nothing');
  pass('What fails together removes Service connectivity with the chapter\'s own simulation — execution goes with it and all five components stop — walks it in four stages, loses the whole shared domain on request, and moves nothing');

  // 5. Dissect and fold; a component reads its needs.
  // The double click as a viewer makes it (two clicks inside the view's window); two page.click calls, each waiting for
  // actionability after the first click's redraw, could fall outside it (rc41 W4: a harness timing fix).
  await page.dblclick('.pf-cap[data-sel="tc-001"]'); await page.waitForTimeout(500);
  assert.match(await crumbs(), /Whole platform › Application execution and what it depends on/);
  assert.equal(await count('.pf-cap'), 3, 'execution, connectivity and evidence');
  for (let i = 0; i < 3 && /›/.test(await crumbs()); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  assert.doesNotMatch(await crumbs(), /›/);
  await click('[data-pf="depth"][data-id="modules"]');
  assert.equal(await count('.pf-ch.module'), 3);
  await click('[data-pf="depth"][data-id="components"]');
  await click('.pf-ch[data-sel="worker"]');
  assert.match(await spec(), /Settlement worker[\s\S]*Stands on[\s\S]*Messaging → Durable work handoff[\s\S]*Stops if lost/);
  await click('#inspector .cm-companion [data-t-action="needs"]'); await page.waitForTimeout(400);
  assert.match(await page.$eval('dialog[open] #t-dialog-title', e => e.textContent), /Technology needs · APP-004/);
  await closeDialog();
  pass('a capability opens with what it depends on and what depends on it, Escape steps back, modules fold, and a component reads what it stands on with its needs editor one click away');

  // 6. Perspectives are entries of the switcher (round 5, R5-C): one draws in the model's own frame in place of the
  //    chapter's view, and the view it came from brings the chapter model back; other chapters keep their models.
  const viewBefore = await page.$eval('.cm.pf .cm-view[aria-pressed="true"]', b => b.dataset.id);
  await click('.cm.pf .pv-pick > summary'); await click('.cm.pf .pv-pick [data-pv="new"]'); await page.waitForTimeout(400);
  assert.ok(await page.$('.cm.pv') && !(await page.$('.cm.pf')) && !(await page.$('.am-explorer')), 'a perspective is the chapter\'s view, in its frame');
  await click(`.cm.pv .cm-views > .cm-view[data-id="${viewBefore}"]`); await page.waitForTimeout(500);
  assert.ok(await page.$('.cm.pf .pf-cap'));
  await page.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'}); await page.waitForTimeout(900); assert.ok(await page.$('.cm.dk') && !(await page.$('.cm.rz, .cm.pf')), 'chapter 11 opens on the review desk');
  await open(5); assert.ok(await page.$('.cm.rz') && !(await page.$('.cm.pf')), 'Chapter 5 keeps its components');
  assert.equal(await count('.cm'), 1, 'only one chapter model is on the page');
  await open(6);
  await page.click('.workspace-bar [data-tab="validate"]'); await page.waitForTimeout(900);
  // Round 3 (C): Validate is the chapter's checks, with a status header and the chapter in the SDD; the model stays on Model.
  // rc38+ (rc41 W4): the frame is the validation workspace, bound to the project and chapter, whose readiness line carries
  // the counts (what to fix, what to confirm, the SDD passages passing); the chapter in the SDD sits in its support section.
  await page.waitForSelector('.validation-workspace[data-validation-workspace^="bank-payment:6"][data-bound="1"] .validation-readiness', {timeout: 8000});
  assert.match(await page.$eval('.validation-workspace .validation-readiness', e => e.innerText), /\d+ findings? to fix[\s\S]*\d+ items? to confirm[\s\S]*\d+\/\d+ SDD passages passing/, 'the readiness line counts what to fix, what to confirm and the SDD passages');
  assert.ok(await page.$('.validation-workspace .validation-support .vx-sdd') && await page.$('.validation-workspace .validation-main') && !(await page.$('.cm')), 'Validate opens on the chapter’s checks, without the model');
  pass('A perspective in the switcher and back to the chapter\'s view, Chapter 11 opens on the review desk, Chapter 5 keeps its own models, only one chapter model is ever on the page, and Validate is unchanged');

  // Round 12 (D2): in a person's project the needs AIW read from a component's words are proposals; Keep makes one the
  // person's, Dismiss asks why and keeps it as retired with the reason, Restore brings it back as it was.
  {
    const q = await ctx.newPage(); q.on('pageerror', e => errors.push(e.message));
    await q.goto(base + '/', {waitUntil: 'networkidle'});
    const id = await q.evaluate(async () => {
      const id = (await (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Needs proposals', template: 'blank', brief: ''})})).json()).document.id;
      const state = await (await fetch('/api/project?project=' + id, {credentials: 'same-origin'})).json();
      const r = await fetch('/api/commands?project=' + id, {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({revision: state.revision, command: {type: 'realisation.component', payload: {title: 'Intake service', kind: 'service', purpose: 'Takes applications.', technologyNeeds: 'Persist each application record and authenticate the caller.'}}})});
      if (!r.ok) throw Error((await r.json()).error);
      return id;
    });
    await q.goto(base + '/?chapter=6&tab=work&project=' + id, {waitUntil: 'networkidle'});
    await q.waitForSelector('.t-proposals');
    // rc38 (the owner's snapshot; rc41 W4): the proposals are a table per component — a Keep checkbox per need
    // (data-need-id, labelled "Keep TN-ddd"), its capability, statement and state — with "Keep selected proposed needs";
    // the needs are identified by their checkboxes, each row stating "Proposed · unreviewed".
    // rc41 close: each row has its own Dismiss again (round 12 D2), labelled "Dismiss TN-ddd", after its state.
    assert.match(await q.$eval('.t-proposals > h3', e => e.textContent), /^Proposed technology needs$/);
    const rows = await q.$$eval('.t-proposals [data-need-component] tbody tr', trs => trs.map(tr => [tr.querySelector('[data-need-id]')?.dataset.needId, tr.querySelector('[data-need-id]')?.getAttribute('aria-label'), tr.querySelector('td[data-need-state]')?.textContent, tr.lastElementChild.querySelector('[data-t-action="dismiss-seed"]')?.getAttribute('aria-label'), tr.lastElementChild.querySelector('[data-t-action="dismiss-seed"]')?.dataset.tId]));
    assert.deepEqual(rows.filter(r => ['TN-001', 'TN-002'].includes(r[0])), [['TN-001', 'Keep TN-001', 'Proposed · unreviewed', 'Dismiss TN-001', 'TN-001'], ['TN-002', 'Keep TN-002', 'Proposed · unreviewed', 'Dismiss TN-002', 'TN-002']], 'the two proposed needs, each to keep or dismiss, each unreviewed: ' + JSON.stringify(rows));
    // Keep TN-001 alone: TN-002 is unticked and the component's "Keep selected proposed needs" keeps the rest.
    await q.uncheck('.t-proposals [data-need-id="TN-002"]');
    await q.click('.t-proposals [data-need-component] [data-t-action="keep-component-needs"]');
    await q.waitForFunction(() => !document.querySelector('.t-proposals [data-need-id="TN-001"]') && !!document.querySelector('.t-proposals [data-need-id="TN-002"]'));
    // Round 12 (D2): a proposed need is dismissed with a reason, from its own row (rc41 close).
    await q.click('.t-proposals [data-need-component] tbody tr [data-t-action="dismiss-seed"][data-t-id="TN-002"]', {timeout: 5000});
    await q.waitForSelector('dialog[open] #record-retire-form');
    await q.fill('dialog[open] [name="reason"]', 'The caller is checked at the gateway.');
    await q.click('dialog[open] #record-retire-form button[type="submit"]');
    await q.waitForSelector('.t-proposals details');
    assert.match(await q.$eval('.t-proposals details', e => e.textContent), /TN-002[\s\S]*The caller is checked at the gateway\./);
    const doc = await q.evaluate(async id => (await (await fetch('/api/project?project=' + id, {credentials: 'same-origin'})).json()).document, id);
    assert.deepEqual([doc.technology.needs.find(n => n.id === 'TN-001').state, doc.technology.needs.some(n => n.id === 'TN-002'), doc.retired.records.find(x => x.id === 'TN-002').reason], [undefined, false, 'The caller is checked at the gateway.']);
    await q.click('.t-proposals details summary');
    await q.click('[data-t-action="restore-seed"][data-t-id="TN-002"]');
    await q.waitForFunction(() => document.querySelector('[data-t-action="keep-seed"][data-t-id="TN-002"]'));
    await q.close();
    pass('round 12: in a person\'s project the Chapter 6 work tab lists the needs AIW proposed and marks them on the component; Keep makes one the person\'s, Dismiss asks why and keeps it as retired with the reason, Restore brings it back as a proposal');
  }

  // 7. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=6&tab=model&model=platform', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .pf-cap'); await p2.waitForTimeout(400);
  // rc39/rc40 (model-round27.css, the phone rule): the model section is `auto` high with its content row `minmax(320px,1fr)`
  // and the page scrolls; the views tray and the Arrange bar stand above the stage. The round-3 floor was 360 px for a
  // section without those bars; the pin is the stylesheet's own floor plus the rule that the stage takes every pixel the
  // section's other rows leave (nothing between them is wasted). Recorded in audit/rc41/w4/NOTE.md for the lead.
  const m = await p2.evaluate(() => { const cm = document.querySelector('.cm'), stage = document.querySelector('.cm-stage'); const rows = [...cm.children].filter(c => c !== stage && getComputedStyle(c).display !== 'none' && getComputedStyle(c).position !== 'absolute').reduce((a, c) => a + c.getBoundingClientRect().height, 0); return {h: stage.getBoundingClientRect().height, section: cm.getBoundingClientRect().height, rows, over: document.documentElement.scrollWidth > innerWidth}; });
  assert.ok(m.h >= 320 && m.h >= m.section - m.rows - 12 && !m.over, 'phone ' + JSON.stringify(m));
  await phone.close();
  pass('on a 390 px phone the platform has a usable canvas and no horizontal page scroll');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 6 model (rendered)', passed: checks.length, checks}, null, 2));
