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
  const open = async (ch = 9) => { await page.goto(base + '/?chapter=' + ch + '&tab=model' + modelOf(ch), {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-head, .cm .dp-row, .cm .tm-card', {timeout: 8000}); await showCompanion(); await page.waitForTimeout(400); };
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
  // Positions in the model's own world (round 3, B): in the page's one frame the stage is shorter, so focusing an element
  // near its foot may move the camera or scroll the stage column; neither is the layout these checks hold still.
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.tm-card, .tm-x, .tm-label, .tm-lh')].map(e => { const r = e.getBoundingClientRect(), o = (e.closest('.cm-world, .cm-heads-in, .cm-rail-in') || e.closest('.cm-stage') || e.closest('.cm'))?.getBoundingClientRect() || {x: 0, y: 0}; return [e.className.split(' ')[0], e.dataset.card || e.dataset.link || e.dataset.entry || e.dataset.lane || '', Math.round(r.x - o.x), Math.round(r.y - o.y), Math.round(r.width), Math.round(r.height)].join('|'); }));
  const count = async sel => (await page.$$(sel)).length;

  // 1. Chapter 9 Model opens on the threat model across trust boundaries.
  await open();
  assert.ok(await page.$('.cm.tm .cm-view[data-id="model"][aria-pressed="true"]'));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.am-explorer, .canvas-card')].some(e => getComputedStyle(e).display !== 'none')), false, 'the explorer is not shown');
  assert.equal(await count('.tm-lh'), 5, 'outside, three boundaries, outside');
  assert.equal(await count('.tm-card'), 12, 'six parts, three stores and services in other boundaries, three parties');
  assert.equal(await count('.tm-x'), 7); assert.equal(await count('.tm-x.exposed'), 1); assert.equal(await count('.tm-x.guarded'), 2); assert.equal(await count('.tm-x.entry'), 4);
  assert.equal(await count('.tm-label'), 7, 'every contract is labelled');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /7 boundary crossings · 1 open design gaps · 2 addressed in design · 4 not examined/);
  assert.match(await page.$eval('.cm-legend', e => e.innerText), /Design links do not prove implementation or successful enforcement/);
  assert.equal(await page.$eval('.tm-x.guarded', e => e.textContent), '◌', 'the marker conveys designed coverage without implying verified efficacy');
  // In the page's one frame (round 3, B) the stage column is narrower than the old full-width canvas: the design fits its
  // width, or it stands at the legible floor with the stage's edge saying more lies to the right.
  const fits = await page.evaluate(() => { const s = document.querySelector('.cm-stage'), r = s.getBoundingClientRect(), w = document.querySelector('.cm-world').getBoundingClientRect(); return w.width <= r.width + 2 || (s.classList.contains('cm-more-r') && w.width <= r.width * 1.6); });
  assert.ok(fits, 'the whole design fits the width, or the edge says where the rest is');
  pass('Chapter 9 Model opens on five trust regions and seven crossings: an open design gap, two addressed in design and four unexamined; marker and legend distinguish design from verified enforcement');

  // 1b. Round 10, V4: each entry's uses are one line from the entry, with dots where it divides and one token-filled head
  //     (11 heads for 4 entries and 7 contracts, where one per use drew 22 markers), in light and in dark.
  const lines = () => page.evaluate(() => { const s = document.querySelector('.cm.tm .cm-svg'), h = s.querySelector('.tm-head'), root = getComputedStyle(document.documentElement); return {heads: s.querySelectorAll('.tm-head').length, joins: s.querySelectorAll('.tm-join').length, markers: s.querySelectorAll('[marker-end], marker').length, routes: s.querySelectorAll('path.tm-route').length, phased: [...s.querySelectorAll('path.tm-route.uses')].filter(p => p.style.strokeDashoffset).length, fill: getComputedStyle(h).fill, token: root.getPropertyValue('--sage-10').trim(), theme: document.documentElement.getAttribute('data-theme')}; });
  const rgb = hex => { const n = parseInt(hex.replace('#', ''), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
  const w0 = await lines();
  assert.deepEqual([w0.heads, w0.joins, w0.markers], [11, 10, 0], 'one head per entry and per contract, a dot at each division, no marker');
  assert.ok(w0.routes === 32 && w0.phased > 0, 'the entries are drawn as their lines (32 paths), dashes phased from the entry');
  assert.equal(w0.fill, rgb(w0.token), 'a head takes the --sage-10 token');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await page.waitForTimeout(250);
  const w1 = await lines();
  assert.ok(w1.theme === 'dark' && w1.token !== w0.token && w1.fill === rgb(w1.token) && w1.fill !== 'rgb(77, 106, 92)', `in dark a head takes the token (${w1.fill}), not #4d6a5c`);
  await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), w0.theme); await page.waitForTimeout(150);
  pass(`each entry's uses are one line from the entry: ${w0.heads} token-filled heads (dark ${w1.fill}) for 4 entries and 7 contracts, ${w0.joins} dots where the lines divide, no marker`);

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
  assert.match(await page.$eval('#inspector .cm-companion .cm-spec', e => e.innerText), /IF-002 Ledger posting[\s\S]*THR-002/);
  assert.ok(await count('.tm-route.lit') >= 1 && await count('.tm-card.dim') > 5);
  await click('.tm-x.entry[data-entry="postgres"]');
  const spec = await page.$eval('#inspector .cm-companion .cm-spec', e => e.innerText);
  assert.match(spec, /Transactional persistence[\s\S]*Reached by[\s\S]*Payment service · from Payment services/);
  assert.match(spec, /Threats not examined/);
  pass('selecting the exposed crossing reads IF-002 and its uncovered threat; selecting an entry reads the store, who reaches it and from where');

  // 4. Record a threat here opens the Chapter 9 editor with the object preselected.
  // rc39/rc40: the Connections control opens on an overview of up to six grouped paths and hides the other labels
  // (`cm-native-link-off`); a viewer chooses "All" to see every crossing's label, and so does the suite, checking the
  // control's own caption and that no label stays hidden.
  await click('.cm [data-cm-connections="all"]'); await page.waitForFunction(() => document.querySelectorAll('.cm .tm-label.cm-native-link-off').length === 0, null, {timeout: 5000});
  const groups = Number((await page.$eval('.cm .nt-connection-caption', e => e.textContent)).match(/^All (\d+) connection groups$/)?.[1] || 0);
  assert.ok(groups >= 7, 'the control says every connection group is shown (the crossings’ seven among them): ' + groups);
  assert.equal(await page.$eval('.cm [data-cm-connections="all"]', b => b.getAttribute('aria-pressed')), 'true');
  assert.equal(await page.$$eval('.cm .tm-label.cm-native-link:not(.cm-native-link-off)', xs => xs.length), 7, 'every contract’s label is drawn');
  await click('.tm-label[data-link="L:ext-channel>api-pod"] .tm-l1');
  await click('#inspector .cm-companion [data-tm="new-threat"]'); await page.waitForTimeout(500);
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
  assert.match(await page.$eval('#inspector .cm-companion .cm-spec', e => e.innerText), /THR-001 · Payment without valid authority[\s\S]*IF-001 Payment initiation · designed coverage[\s\S]*DAT-001 Payment instruction · no linked control/);
  await click('.tm-cover.open [data-tm="propose"][data-id="thr-001"]'); await page.waitForTimeout(700);
  assert.ok(await page.$('.tm-ch.proposed') && await count('.tm-cell.proposed') >= 1, 'the proposal is its own column');
  assert.match(await page.$eval('.cm-banner', e => e.innerText), /Control proposal · not saved[\s\S]*Instruction authority at the boundary for THR-001/i);
  assert.match(await page.$eval('.cm-state', e => e.textContent), /the proposal would close 1/);
  await click('[data-tm="view"][data-id="model"]');
  assert.ok(await count('.tm-route.proposed') >= 1, 'what it would protect is marked on the threat model');
  await click('.cm-banner [data-sec-action="dismiss"]'); await page.waitForTimeout(500);
  assert.ok(!(await page.$('.cm-banner .dp-banner')) && !(await page.$('.tm-route.proposed')));
  pass('Threats & controls shows the coverage rule per threat; Propose a control previews an unsaved column that would close THR-001, marks what it protects on the threat model, and dismissing leaves the design unchanged');

  // 7. Perspectives are entries of the switcher (round 5, R5-C): one draws in the model's own frame in place of the
  //    chapter's view, and the view it came from brings the chapter model back; other chapters keep their models.
  const viewBefore = await page.$eval('.cm.tm .cm-view[aria-pressed="true"]', b => b.dataset.id);
  await click('.cm.tm .pv-pick > summary'); await click('.cm.tm .pv-pick [data-pv="new"]'); await page.waitForTimeout(400);
  assert.ok(await page.$('.cm.pv') && !(await page.$('.cm.tm')) && !(await page.$('.am-explorer')), 'a perspective is the chapter\'s view, in its frame');
  await click(`.cm.pv .cm-views > .cm-view[data-id="${viewBefore}"]`); await page.waitForTimeout(500);
  assert.ok(await page.$('.cm.tm .tm-card'));
  await open(8); assert.ok(await page.$('.cm .cm-drow') && !(await page.$('.cm.tm')), 'Chapter 8 keeps its own view (the Data flow since round 11)');
  await open(10); assert.ok(await page.$('.cm.dp .dp-row') && !(await page.$('.cm.tm')), 'Chapter 10 keeps its deployment grid');
  assert.equal(await count('.cm'), 1, 'only one chapter model is on the page');
  await open(9);
  await page.click('.workspace-bar [data-tab="validate"]'); await page.waitForTimeout(900);
  // Round 3 (C): Validate is the chapter's checks, with a status header and the chapter in the SDD; the model stays on Model.
  // rc38+ (rc41 W4): the frame is the validation workspace, bound to the project and chapter, whose readiness line carries
  // the counts (what to fix, what to confirm, the SDD passages passing); the chapter in the SDD sits in its support section.
  await page.waitForSelector('.validation-workspace[data-validation-workspace^="bank-payment:9"][data-bound="1"] .validation-readiness', {timeout: 8000});
  assert.match(await page.$eval('.validation-workspace .validation-readiness', e => e.innerText), /\d+ findings? to fix[\s\S]*\d+ items? to confirm[\s\S]*\d+\/\d+ SDD passages passing/, 'the readiness line counts what to fix, what to confirm and the SDD passages');
  assert.ok(await page.$('.validation-workspace .validation-support .vx-sdd') && await page.$('.validation-workspace .validation-main') && !(await page.$('.cm')), 'Validate opens on the chapter’s checks, without the model');
  pass('A perspective in the switcher and back to the chapter\'s view, Chapters 8 and 10 keep their own models, only one chapter model is ever on the page, and Validate is unchanged');

  // 8. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=9&tab=model&model=model', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .tm-card'); await p2.waitForTimeout(400);
  // rc39/rc40 (model-round27.css, the phone rule): the model section is `auto` high with its content row `minmax(320px,1fr)`
  // and the page scrolls; the views tray and the Arrange bar stand above the stage. The round-3 floor was 360 px for a
  // section without those bars; the pin is the stylesheet's own floor plus the rule that the stage takes every pixel the
  // section's other rows leave (nothing between them is wasted). Recorded in audit/rc41/w4/NOTE.md for the lead.
  const m = await p2.evaluate(() => { const cm = document.querySelector('.cm'), stage = document.querySelector('.cm-stage'); const rows = [...cm.children].filter(c => c !== stage && getComputedStyle(c).display !== 'none' && getComputedStyle(c).position !== 'absolute').reduce((a, c) => a + c.getBoundingClientRect().height, 0); return {h: stage.getBoundingClientRect().height, section: cm.getBoundingClientRect().height, rows, over: document.documentElement.scrollWidth > innerWidth}; });
  assert.ok(m.h >= 320 && m.h >= m.section - m.rows - 12 && !m.over, 'phone ' + JSON.stringify(m));
  await phone.close();
  pass('on a 390 px phone the threat model has a usable canvas and no horizontal page scroll');

  // Round 12 (D2): a threat whose priority and category are not stated reads so, never as Moderate.
  {
    const save = (type, payload) => page.evaluate(async ([type, payload]) => { const s = window.aiwProjectStore.value, r = await fetch('/api/commands?project=' + encodeURIComponent(s.document.id), {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({revision: s.revision, command: {type, payload}})}), out = await r.json(); if (!r.ok) throw Error(type + ': ' + out.error); return out.selected; }, [type, payload]);
    await save('security.threat', {id: 'thr-002', priority: '', category: ''});
    await open();
    await click('[data-tm="view"][data-id="coverage"]');
    await click('.tm-trow[data-sel="thr-002"]');
    const read = await page.$eval('#inspector .cm-companion .cm-spec', e => e.innerText);
    assert.match(read, /Threat scenario\s*Not stated/i, 'the priority (the heading is drawn in capitals)');
    assert.match(read, /Category\s*Not stated/);
    assert.doesNotMatch(read, /Moderate/);
    pass('round 12: a threat saved with its priority and category not stated reads Not stated for both in Threats & controls, never Moderate');
  }

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 9 model (rendered)', passed: checks.length, checks}, null, 2));
