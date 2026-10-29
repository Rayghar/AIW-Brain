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
  // rc38 shell (rc41 W4): the Model companion lives in the Details column (#inspector .cm-companion), which the shell
  // leaves closed when nothing is selected on arrival; the suite opens it with the toolbar's toggle, as a viewer does,
  // and asserts only on what the open column shows.
  const showCompanion = async () => { await page.waitForSelector('body[data-panel]', {state: 'attached', timeout: 10000}); if (await page.evaluate(() => document.body.dataset.panel !== 'open')) { await page.click('.workspace-tools [data-panel-toggle]'); await page.waitForSelector('#inspector[aria-hidden="false"]', {timeout: 5000}); await page.waitForTimeout(400); } };
  const open = async (extra = '') => { await page.goto(base + '/?chapter=2&tab=model' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.um .um-card', {timeout: 8000}); await showCompanion(); await page.waitForTimeout(400); };
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
  const count = async sel => (await page.$$(sel)).length;
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' ').trim());
  // Positions in the model's own world (round 3, B): in the page's one frame the stage is shorter, so focusing an element
  // near its foot may move the camera or scroll the stage column; neither is the layout these checks hold still.
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.um-card, .um-ch')].map(e => { const r = e.getBoundingClientRect(), o = (e.closest('.cm-world, .cm-heads-in, .cm-rail-in') || e.closest('.cm-stage') || e.closest('.cm'))?.getBoundingClientRect() || {x: 0, y: 0}; return [e.className.split(' ')[0], e.dataset.card || '', Math.round(r.x - o.x), Math.round(r.y - o.y), Math.round(r.width), Math.round(r.height)].join('|'); }));
  const panel = () => page.$eval('#inspector .cm-companion', e => e.innerText);
  const shown = sel => page.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }, sel);
  const closeDialog = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(300); if (await page.$('dialog[open]')) { await page.evaluate(() => document.querySelector('dialog[open]').close()); await page.waitForTimeout(200); } };

  // 1. Chapter 2 Model opens on the utility tree, in place of the chapter's own map.
  await open();
  assert.ok(await page.$('.cm.um .cm-view[data-id="tree"][aria-pressed="true"]'));
  assert.ok(!(await shown('.q-map-card')) && !(await shown('#q-inspector')), 'the chapter\'s own map and inspector step aside');
  assert.equal(await count('.um-card.drv'), 6); assert.equal(await count('.um-card.hole'), 4); assert.equal(await count('.um-card.fam'), 5); assert.equal(await count('.um-card.root'), 1);
  assert.equal(await count('#inspector .cm-companion .cm-spec'), 0, 'nothing is selected on arrival');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /6 drivers · 3 High · 4 playbook attributes with no driver · 8 tactics named/);
  assert.equal(await page.evaluate(() => document.querySelector('.um .cm-svg').getBoundingClientRect().width > 300), true);
  pass('Chapter 2 Model opens on the utility tree in place of the chapter\'s own map: utility, five qualities, the attributes the SA Playbook names and six drivers, with the four core attributes no driver covers as holes');

  // 1b. Round 10, V4: one comb per parent, each run drawn once (29 paths for the 21 edges); the holes' own teeth dashed,
  //     their dashes starting where they leave the solid stub; a selected driver lights exactly its own three edges.
  const comb = () => page.evaluate(() => { const ps = [...document.querySelectorAll('.um .cm-svg path.um-edge')]; return {forks: document.querySelectorAll('.um .cm-svg circle.um-join').length, paths: ps.length, holes: ps.filter(p => p.classList.contains('hole')).length, lit: ps.filter(p => p.classList.contains('lit')).length, dim: ps.filter(p => p.classList.contains('dim')).length, restarted: ps.filter(p => p.classList.contains('hole') && !p.style.strokeDashoffset).length}; });
  const c0 = await comb();
  assert.deepEqual([c0.paths, c0.holes, c0.lit, c0.dim], [29, 5, 0, 0], 'twelve combs drawn as 29 runs, five of them a hole\'s own');
  assert.ok(c0.forks >= 1 && c0.forks <= 12, `a fork cue where a child runs straight on through a spine (${c0.forks}), never more than one per comb`);
  assert.equal(c0.restarted, 3, 'dashes start afresh where a hole leaves the solid stub (Scalability) and where a comb of holes begins (Change, Use); the Change comb\'s two teeth run on from its stub');
  await page.focus('.um-card[data-card="QD-002"]'); await click('.um-card[data-card="QD-002"] .um-t');
  const c1 = await comb();
  assert.equal(c1.lit, 3, 'utility → Reliability → Availability → QD-002, and nothing else, is lit'); assert.ok(c1.dim > 15);
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  pass(`the tree is one comb per parent: ${c0.paths} runs for 21 edges, the holes' teeth dashed from where they leave the stub; selecting QD-002 lights exactly its ${c1.lit} edges`);

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
  await click('#inspector .cm-companion [data-um="edit"]'); await page.waitForTimeout(400);
  assert.match(await page.$eval('dialog[open] #q-dialog-title', e => e.textContent), /Edit QD2/);
  await closeDialog();
  pass('selecting a driver reads its scenario, the playbook tactics the design names with the quoted evidence and those it does not, the decisions that weigh it, what carries it and what it pulls against; Edit driver opens Chapter 2\'s own editor');

  // 4. A hole reads the playbook's attribute; a proposed driver fills it until dismissed.
  await click('.um-card.hole[data-card="A:scalability"] .um-t');
  // The selection reaches the companion on its next render: wait for it rather than for a fixed time (round 9: under
  // a loaded regression run the 250 ms pause raced the dialog that had just closed). The assertion is unchanged.
  await page.waitForFunction(() => /No driver/i.test(document.querySelector('#inspector .cm-companion')?.innerText || ''), null, {timeout: 5000}).catch(() => {});
  const ps = await panel();
  assert.match(ps, /No driver[\s\S]*Scalability[\s\S]*Measured by[\s\S]*Cost of scaling[\s\S]*Technologies the playbook names[\s\S]*Kafka[\s\S]*Redis/i);
  await click('#inspector .cm-companion [data-um="propose"][data-attr="scalability"]'); await page.waitForTimeout(900);
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
  await click('#inspector .cm-companion [data-um="tune-apply"]'); await page.waitForTimeout(400);
  assert.match(await page.$eval('dialog[open] #q-dialog-title', e => e.textContent), /Edit QD2/);
  assert.equal(await page.$eval('dialog[open] [name="targetValue"]', e => e.value), '99.99', 'the editor opens with the tuned target');
  await closeDialog();
  await page.selectOption('[data-um="tune-driver"]', 'QD-003'); await page.waitForTimeout(300);
  await click('[data-um="tune-priority"][data-v="High"]'); await page.waitForTimeout(300);
  assert.match(await page.$eval('.um-rc[data-card="E:decision:ADR-002"]', e => e.innerText), /Revisit[\s\S]*sensitivity point/);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  assert.ok(await page.$('.cm-view[data-id="tree"][aria-pressed="true"]'), 'Escape steps back to the tree');
  pass('What if moves a target or a priority without saving: 99.99 % reads as 4.3 minutes a month, ADR-001 must be revisited, the playbook suggests tactics and names what it pulls against; raising QD-003 to High shows ADR-002 turns on it; the editor opens with the tuned values');

  // 6. Walking the priorities; dissecting and folding.
  await click('[data-um="walk-next"]');
  assert.match(await page.$eval('.cm-walk-text', e => e.innerText), /1 \/ 6 QD-001 Preserve one financial effect — High/);
  assert.equal(await count('.um-card.now'), 1);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  // The double click as a viewer makes it (two clicks inside the view's 420 ms window); two page.click calls, each waiting
  // for actionability after the first click's redraw, could fall outside it (rc41 W4: a harness timing fix).
  await page.dblclick('.um-card[data-card="A:availability"] .um-t'); await page.waitForTimeout(500);
  assert.match(await crumbs(), /All quality › Availability/); assert.equal(await count('.um-card.drv'), 1);
  for (let i = 0; i < 3 && /›/.test(await crumbs()); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  assert.doesNotMatch(await crumbs(), /›/);
  await click('[data-um="depth"][data-id="attributes"]');
  assert.equal(await count('.um-card.drv'), 0); assert.ok(await count('.um-card.attr.folded') >= 6);
  await click('[data-um="depth"][data-id="drivers"]');
  pass('the drivers are walked High first, an attribute opens on double-click, Escape steps back to the whole tree, and the tree folds to its attributes');

  // 7. The switcher's Whole design (round 5: "All perspectives" is retired) and back; deep link; Validate.
  // In the one shell (round 3, A) the chapter has no page map of its own: every perspective is the Whole design view,
  // the anatomy inside the chapter model, with its companion in the companion column.
  await click('.cm.um .cm-view[data-id="whole"]'); await page.waitForSelector('.cm.um .cm-sheet .an.an-embedded .an-n', {timeout: 15000}); await page.waitForTimeout(400);
  assert.ok(await page.$('.cm-view[data-id="whole"][aria-pressed="true"]') && await page.$('#inspector .cm-companion .an-companion section'), 'the switcher\'s Whole design opens the Whole design view');
  // rc39: the tray gained Diagram and Layers, so the chapter's own view is named, not counted.
  await click('.cm-views .cm-view[data-id="tree"]'); await page.waitForTimeout(500);
  assert.ok(await page.$('.cm-view[data-id="tree"][aria-pressed="true"]') && await page.$('.cm.um .um-card') && !(await page.$('.cm.um .an')), 'and the chapter’s own view comes back');
  await open('&driver=QD-004');
  assert.match(await panel(), /Quality driver · QD-004/i, 'a deep link opens on its driver');
  await page.click('.workspace-bar [data-tab="validate"]'); await page.waitForTimeout(900);
  // Round 3 (C): Validate is the chapter's checks, with a status header and the chapter in the SDD; the model stays on Model.
  // rc38+ (rc41 W4): the frame is the validation workspace, bound to the project and chapter, whose readiness line carries
  // the counts (what to fix, what to confirm, the SDD passages passing); the chapter in the SDD sits in its support section.
  await page.waitForSelector('.validation-workspace[data-validation-workspace^="bank-payment:2"][data-bound="1"] .validation-readiness', {timeout: 8000});
  assert.match(await page.$eval('.validation-workspace .validation-readiness', e => e.innerText), /\d+ findings? to fix[\s\S]*\d+ items? to confirm[\s\S]*\d+\/\d+ SDD passages passing/, 'the readiness line counts what to fix, what to confirm and the SDD passages');
  assert.ok(await page.$('.validation-workspace .validation-support .vx-sdd') && await page.$('.validation-workspace .validation-main') && !(await page.$('.cm')), 'Validate opens on the chapter’s checks, without the model');
  await page.waitForSelector('.vx-obs:not([hidden])', {timeout: 8000});
  // rc39/rc40: the observations fold under a counted summary; opened as a viewer opens it.
  assert.match(await page.$eval('.vx-obs > summary', e => e.innerText), /^Model observations · [1-9]\d*$/);
  if (!await page.$('.vx-obs[open]')) { await page.click('.vx-obs > summary'); await page.waitForTimeout(250); }
  assert.match(await page.$eval('.vx-obs .vx-obs-in', e => e.innerText), /^The Chapter 2 models also show · \d+ of \d+[\s\S]*no driver/i);
  pass('The switcher\'s Whole design opens the Whole design view of the Chapter 2 model (there is no page map behind it) and its own view comes back; a deep link opens on its driver; Validate opens on its checks and shows what the Chapter 2 models find');

  // 8. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=2&tab=model', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .um-card'); await p2.waitForTimeout(400);
  // rc39/rc40 (model-round27.css, the phone rule): the model section is `auto` high with its content row `minmax(320px,1fr)`
  // and the page scrolls; the views tray and the Arrange bar stand above the stage. The round-3 floor was 360 px for a
  // section without those bars; the pin is the stylesheet's own floor plus the rule that the stage takes every pixel the
  // section's other rows leave (nothing between them is wasted). Recorded in audit/rc41/w4/NOTE.md for the lead.
  const m = await p2.evaluate(() => { const cm = document.querySelector('.cm'), stage = document.querySelector('.cm-stage'); const rows = [...cm.children].filter(c => c !== stage && getComputedStyle(c).display !== 'none' && getComputedStyle(c).position !== 'absolute').reduce((a, c) => a + c.getBoundingClientRect().height, 0); return {h: stage.getBoundingClientRect().height, section: cm.getBoundingClientRect().height, rows, over: document.documentElement.scrollWidth > innerWidth}; });
  assert.ok(m.h >= 320 && m.h >= m.section - m.rows - 12 && !m.over, 'phone ' + JSON.stringify(m));
  await phone.close();
  pass('on a 390 px phone the utility tree has a usable canvas and no horizontal page scroll');

  // 9. Round 25 (D-25-03): "Breaks it" harms a driver as tension does. Recorded against a constraint driver and kept when a
  // person makes that driver a quality driver (the domain keeps a recorded effect; the reading counts it as tension), it
  // shows on the utility tree's decision chip and in the companion, counted with the alternatives in tension.
  {
    const command = async (type, payload) => {
      await page.evaluate(([type, payload]) => { window.__aiwCmd = null; window.aiwProjectStore.command({type, payload}).then(() => { window.__aiwCmd = 'ok'; }, e => { window.__aiwCmd = 'error: ' + e.message; }); }, [type, payload]);
      const seen = await (await page.waitForFunction(() => window.__aiwCmd || (document.querySelector('dialog.wb-dialog[open]') ? 'review' : null), null, {timeout: 15000})).jsonValue();
      if (seen === 'review') { await page.check('dialog.wb-dialog [data-reviewed]'); await page.fill('dialog.wb-dialog [name=reason]', 'Synthetic facts for the decision reading, reviewed.'); await page.click('dialog.wb-dialog [data-wb-action="apply-preview"]'); await page.waitForFunction(() => window.__aiwCmd, null, {timeout: 15000}); }
      assert.equal(await page.evaluate(() => window.__aiwCmd), 'ok', type);
    };
    const docNow = () => page.evaluate(() => window.aiwProjectStore.value.document);
    await open();
    await command('quality.driver', {kind: 'constraint', title: 'Post through the existing core ledger', description: 'Every posting goes through the existing core ledger.', impact: 'Rules out a second store of postings.', constraintIds: ['CON-001'], priority: 'High'});
    let d = await docNow();
    const C = d.quality.drivers.at(-1).id, d2 = () => d.decisions.records.find(x => x.id === 'ADR-002');
    await command('decision.save', {id: 'ADR-002', driverIds: [...d2().driverIds, C]});
    d = await docNow();
    await command('decision.alternative', {id: 'ADR-002', alternativeId: 'ALT-004', assessments: {...d2().alternatives.find(a => a.id === 'ALT-004').assessments, [C]: {effect: 'violates', reason: 'The cache keeps its own record of postings.', evidence: 'Synthetic design review notes.'}}});
    await command('quality.driver', {id: C, kind: 'quality', category: 'integrity', title: 'Post each instruction once', stimulus: 'An instruction is retried.', response: 'One posting results.', metric: 'Postings per instruction', operator: 'At most', targetValue: '1', unit: 'postings', priority: 'High'});
    d = await docNow();
    assert.equal(d.quality.drivers.find(x => x.id === C).kind, 'quality'); assert.equal(d2().alternatives.find(a => a.id === 'ALT-004').assessments[C].effect, 'violates', 'the recorded effect is kept');
    await open();
    await click('[data-um="lens"][data-id="reasoning"]');
    const chip = await page.$eval(`.um-card[data-card="${C}"] .um-x.k-adr`, e => ({text: e.textContent, title: e.title}));
    assert.match(chip.text, /^ADR-002 ⚠$/); assert.match(chip.title, new RegExp(`ADR-002 [\\s\\S]*no alternative chosen; 1 alternative is in tension with ${C} \\(1 breaking it\\)`), 'counted with the alternatives in tension: ' + chip.title);
    await page.focus(`.um-card[data-card="${C}"]`); await page.waitForTimeout(150); await click(`.um-card[data-card="${C}"] .um-t`);
    assert.match(await panel(), /Decisions that weigh it[\s\S]*ADR-002[\s\S]*✕\s*Suppress repeats in the application cache\s*breaks it/i, 'the companion names it');
    pass('"Breaks it", kept on a driver a person made a quality driver, harms it as tension does: the utility tree\'s decision chip counts it with the alternatives in tension and says it breaks the driver, and the companion names it');
  }

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 2 model (rendered)', passed: checks.length, checks}, null, 2));
