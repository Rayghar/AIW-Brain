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
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => { checks.push(n); if (process.env.TX_DEBUG) console.error('PASS', checks.length, n.slice(0, 70)); };
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  // rc39/rc40: the companion folds "What the model shows" (the insights and their proposals), the checks and "Reading this
  // view" closed by default; the suite reads them as a viewer who opened the folds (the remembered choice, model-stage.js
  // CP_STORE), as it already does for Sol's part.
  await page.addInitScript(() => { try { for (const k of ['shows', 'checks', 'reading']) localStorage.setItem('aiw.companion.' + k, '1'); } catch { /* storage is a convenience */ } });
  page.on('pageerror', e => errors.push(e.message));
  // rc38 shell (rc41 W4): the Model companion lives in the Details column (#inspector .cm-companion), which the shell
  // leaves closed when nothing is selected on arrival; the suite opens it with the toolbar's toggle, as a viewer does,
  // and asserts only on what the open column shows.
  const showCompanion = async () => { await page.waitForSelector('body[data-panel]', {state: 'attached', timeout: 10000}); if (await page.evaluate(() => document.body.dataset.panel !== 'open')) { await page.click('.workspace-tools [data-panel-toggle]'); await page.waitForSelector('#inspector[aria-hidden="false"]', {timeout: 5000}); await page.waitForTimeout(400); } };
  const open = async (extra = '') => { await page.goto(base + '/?chapter=3&tab=model' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.dx .dx-card', {timeout: 8000}); await showCompanion(); await page.waitForTimeout(400); };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(250); };
  const count = async sel => (await page.$$(sel)).length;
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' ').trim());
  // Positions in the model's own world (round 3, B): in the page's one frame the stage is shorter, so focusing an element
  // near its foot may move the camera or scroll the stage column; neither is the layout these checks hold still.
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.dx-card, .um-ch')].map(e => { const r = e.getBoundingClientRect(), o = (e.closest('.cm-world, .cm-heads-in, .cm-rail-in') || e.closest('.cm-stage') || e.closest('.cm'))?.getBoundingClientRect() || {x: 0, y: 0}; return [e.className.split(' ')[0], e.dataset.card || '', Math.round(r.x - o.x), Math.round(r.y - o.y), Math.round(r.width), Math.round(r.height)].join('|'); }));
  const panel = () => page.$eval('#inspector .cm-companion', e => e.innerText);
  const shown = sel => page.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }, sel);
  const closeDialog = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(300); if (await page.$('dialog[open]')) { await page.evaluate(() => document.querySelector('dialog[open]').close()); await page.waitForTimeout(200); } };

  // A change proposed from Chapter 3's own editor is reviewed inside that editor (audit round 2, U2-04: no second
  // dialog stacked on it); a change proposed from outside an editor opens its own review dialog.
  const reviewAndApply = async reason => {
    await page.waitForSelector('dialog.wb-dialog[open], dialog[open] [data-dialog-review]', {timeout: 5000});
    assert.equal(await page.$$eval('dialog[open]', d => d.length), 1, 'one dialog holds the review, none stacked');
    const scope = (await page.$('dialog[open] [data-dialog-review]')) ? 'dialog[open] [data-dialog-review]' : 'dialog.wb-dialog';
    await page.check(scope + ' [data-reviewed]'); await page.fill(scope + ' [name=reason]', reason); await page.click(scope + ' [data-wb-action="apply-preview"]'); await page.waitForTimeout(1500); };

  // 1. Chapter 3 Model opens on the decision map, in place of the chapter's own map.
  await open();
  assert.ok(await page.$('.cm.dx .cm-view[data-id="map"][aria-pressed="true"]'));
  assert.ok(!(await shown('.d-map-card')) && !(await shown('#d-inspector')), 'the chapter\'s own map and inspector step aside');
  assert.equal(await count('.dx-card.drv'), 6); assert.equal(await count('.dx-card.dec:not(.style-proposal)'), 3); assert.equal(await count('.dx-card.alt'), 6); assert.equal(await count('.dx-card.style-proposal'), 1);
  assert.equal(await count('#inspector .cm-companion .cm-spec'), 0, 'nothing is selected on arrival');
  // Round 25: the alternatives' totals are on the map, so the reading's note is beside them: in the companion's reading
  // of the view and in the key.
  assert.match(await panel(), /Reading this view[\s\S]*the figure in its top-right corner is its total on the drivers, priority weight × effect\.[\s\S]*Arithmetic on the recorded effects, not a measurement; it does not choose\./i, 'the map\'s reading of the view carries the reading\'s note');
  assert.match(await page.$eval('.cm.dx .cm-legend', e => e.textContent), /\+2\s*An alternative's total on the drivers: priority weight × effect[\s\S]*Arithmetic on the recorded effects, not a measurement; it does not choose\./, 'the map\'s key carries the reading\'s note');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /3 decisions · 6 alternatives · 0 with a working choice · 2 sensitivity points · style not recorded/);
  assert.match(await page.$eval('.dx-card[data-card="ALT-003"]', e => e.innerText), /Idempotent Consumer[\s\S]*Avoid[\s\S]*Missing Idempotency/i);
  pass('Chapter 3 Model opens on the decision map in place of the chapter\'s own map: the drivers by priority, three decisions, six alternatives with their patterns, failure boundaries and links to the pattern catalogue, and the architecture style as a decision not yet recorded');

  // 1b. Round 10 (V3): each line's ink drawn once, every relationship keeping its own head, heads and joins from tokens,
  // and a selection lighting exactly its own lines.
  const lines = () => page.evaluate(() => {
    const svg = document.querySelector('.cm.dx .cm-stage svg'), px = el => parseFloat(el.style.left), py = el => parseFloat(el.style.top);
    const decs = [...document.querySelectorAll('.dx-card.dec')].map(c => ({id: c.dataset.card, x: px(c), y: py(c), h: parseFloat(c.style.height), drivers: +((c.querySelector('.dx-dfoot')?.textContent.match(/(\d+) drivers?/) || [0, 0])[1])}));
    const tip = h => h.getAttribute('d').match(/^M([\d.-]+) ([\d.-]+)/).slice(1).map(Number);
    const probe = document.createElement('i'); probe.style.color = 'var(--sage-9)'; svg.closest('.cm').appendChild(probe); const token = getComputedStyle(probe).color; probe.remove();
    const heads = [...svg.querySelectorAll('.dx-head')].map(h => ({tip: tip(h), lit: h.classList.contains('lit'), dim: h.classList.contains('dim'), fill: getComputedStyle(h).fill}));
    return {decs, heads, token, markers: svg.querySelectorAll('marker, [marker-end]').length, joins: svg.querySelectorAll('.dx-join').length, onDecision: heads.map(h => decs.find(d => d.x === h.tip[0] && h.tip[1] > d.y && h.tip[1] < d.y + d.h)?.id || null)};
  });
  let ln = await lines();
  assert.equal(ln.heads.length, ln.decs.reduce((n, d) => n + d.drivers, 0), 'a head per relationship a decision weighs');
  assert.equal(ln.markers, 0, 'heads are drawn, not markers with a fill of their own');
  assert.ok(ln.onDecision.every(Boolean), 'every head sits on the left side of its decision');
  assert.ok(ln.heads.every(h => h.fill === ln.token), 'heads take the line token: ' + ln.heads[0]?.fill + ' vs ' + ln.token);
  assert.ok(ln.joins >= 1, 'a dot where a driver\'s track divides');
  await page.focus('.dx-card[data-card="QD-001"]'); await page.waitForTimeout(150);
  await click('.dx-card[data-card="QD-001"] .dx-t');
  ln = await lines();
  assert.deepEqual(ln.heads.filter(h => h.lit).map(h => ln.onDecision[ln.heads.indexOf(h)]).sort(), ['ADR-002', 'ADR-003'], 'selecting a driver lights the heads of its own relationships only');
  assert.equal(ln.heads.filter(h => h.dim).length, ln.heads.length - 2, 'and dims the others');
  for (let i = 0; i < 2 && (await count('#inspector .cm-companion .cm-spec')); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
  pass(`the decision map draws each line's ink once: ${ln.heads.length} relationships, each with its own head on its decision, filled from the line token (no marker of its own colour), and ${ln.joins} dots where a driver's track divides; selecting QD-001 lights exactly the heads of its two relationships`);

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
  // Round 25 (D-25-07): the lead in the reading's words, with its total and how firmly it holds; never "favoured".
  assert.match(await panel(), /Alternative · ALT-003 of ADR-002[\s\S]*Leads on the drivers[\s\S]*Enforce the reference at the posting boundary[\s\S]*As weighted[\s\S]*QD-001 \+×3 QD-003 −×2 QD-005 0 = \+1[\s\S]*\+1 · ★ Leads on the drivers · holds for any weights the priorities allow[\s\S]*Effect on each driver[\s\S]*Pattern knowledge[\s\S]*Idempotent Consumer[\s\S]*Missing Idempotency · anti-pattern/i);
  assert.doesNotMatch(await panel(), /favou?r|scored|winner|recommends|AIW chooses/i, 'the companion speaks the reading\'s words');
  await click('#inspector .cm-companion [data-dx="choose"]'); await page.waitForTimeout(1500);
  assert.ok(await page.$('.dx-card.alt.chosen[data-card="ALT-003"]'), 'the working choice is made');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /1 with a working choice/);
  assert.match(await panel(), /Alternative · ALT-003 of ADR-002[\s\S]*Working choice/i, 'it stays selected, now the working choice');
  await click('#inspector .cm-companion [data-dx="edit-alt"]'); await page.waitForTimeout(400);
  assert.match(await page.$eval('dialog[open] #d-dialog-title', e => e.textContent), /Revise ALT-003/);
  await closeDialog();
  pass('selecting an alternative reads its reasoning — the weighting in plain arithmetic, its effect on every driver with the reasons, and what the playbook and the catalogue know of its pattern and failure boundary; Make it the working choice uses Chapter 3\'s own command, and Edit opens its editor');

  // 4. Trade-offs.
  await click('[data-dx="view"][data-id="matrix"]'); await page.waitForTimeout(500);
  assert.equal(await count('.dx-rh:not(.foot)'), 6); assert.equal(await count('.dx-ch:not(.style)'), 6); assert.equal(await count('.dx-ch.style'), 5);
  assert.equal(await count('.dx-cell.supports'), 8); assert.equal(await count('.dx-cell.tension'), 8);
  assert.match(await page.$eval('.dx-foot[data-card="ALT-005"]', e => e.innerText), /\+8[\s\S]*★ leads · 3\/3 judged/);
  assert.doesNotMatch(await page.$eval('.cm.dx', e => e.innerText), /favou?r|scored|winner/i, 'the matrix speaks the reading\'s words');
  assert.equal(await count('.dx-rh .dx-sens'), 2, 'the sensitivity points are marked on their drivers');
  assert.equal(await count('.dx-cell.style.cx'), 1, 'the playbook\'s style table speaks once, conditionally');
  pass('Trade-offs set every alternative against every driver it is weighed on, with the weighted reading beneath, the sensitivity points on their drivers and the SA Playbook\'s five styles read against the same drivers');

  // 5. Architecture style, recorded as a decision and compared from the playbook.
  await click('#inspector .cm-companion [data-dx="style-decision"]'); await page.waitForTimeout(400);
  assert.equal(await page.$eval('dialog[open] [name="topic"]', e => e.value), 'style');
  await page.$eval('#d-question-form', f => f.requestSubmit()); await page.waitForTimeout(1500);
  await click('[data-dx="view"][data-id="map"]'); await page.waitForTimeout(400);
  assert.equal(await count('.dx-card.suggested'), 5, 'the playbook\'s styles are offered as its alternatives');
  assert.equal(await page.$eval('.dx-card.suggested', e => e.getAttribute('role')), 'group', 'a style card with an Add button is a named group');
  await page.focus('.dx-card.suggested[data-card="SUG:S-MODMONO"]'); await page.waitForTimeout(300);
  // The proposal opens in a dialog: wait for it rather than for a fixed time (under load it opened later than 400 ms).
  await click('.dx-card.suggested[data-card="SUG:S-MODMONO"] [data-dx="add-style"]'); await page.waitForSelector('dialog[open] #d-dialog-title', {timeout: 15000});
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
  await page.dblclick('.dx-card[data-card="QD-004"] .dx-t', {delay: 70}); await page.waitForTimeout(500);
  assert.match(await crumbs(), /All decisions › QD-004/); assert.equal(await count('.dx-card.dec'), 2, 'only the decisions that weigh it');
  for (let i = 0; i < 3 && /›/.test(await crumbs()); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  assert.doesNotMatch(await crumbs(), /›/);
  pass('the decisions are walked in order, a driver opens on the decisions that weigh it, and Escape steps back to all decisions');

  // 7. The switcher's Whole design (round 5: "All perspectives" is retired) and back; deep link; Validate.
  // In the one shell (round 3, A) the chapter has no page map of its own: every perspective is the Whole design view,
  // the anatomy inside the chapter model, with its companion in the companion column.
  await click('.cm.dx .cm-view[data-id="whole"]'); await page.waitForSelector('.cm.dx .cm-sheet .an.an-embedded .an-n', {timeout: 15000}); await page.waitForTimeout(400);
  assert.ok(await page.$('.cm-view[data-id="whole"][aria-pressed="true"]') && await page.$('#inspector .cm-companion .an-companion section'), 'the switcher\'s Whole design opens the Whole design view');
  // rc39: the tray gained Diagram and Layers, so the chapter's own view is named, not counted.
  await click('.cm-views .cm-view[data-id="map"]'); await page.waitForTimeout(500);
  assert.ok(await page.$('.cm-view[data-id="map"][aria-pressed="true"]') && await page.$('.cm.dx .dx-card') && !(await page.$('.cm.dx .an')), 'and the chapter’s own view comes back');
  await open('&decision=ADR-003');
  assert.match(await panel(), /Decision · ADR-003/i, 'a deep link opens on its decision');
  await page.click('.workspace-bar [data-tab="validate"]'); await page.waitForTimeout(900);
  // Round 3 (C): Validate is the chapter's checks, with a status header and the chapter in the SDD; the model stays on Model.
  // rc38+ (rc41 W4): the frame is the validation workspace, bound to the project and chapter, whose readiness line carries
  // the counts (what to fix, what to confirm, the SDD passages passing); the chapter in the SDD and the model observations
  // sit in its support section, the observations folded under a counted summary.
  await page.waitForSelector('.validation-workspace[data-validation-workspace^="bank-payment:3"][data-bound="1"] .validation-readiness', {timeout: 8000});
  assert.match(await page.$eval('.validation-workspace .validation-readiness', e => e.innerText), /\d+ findings? to fix[\s\S]*\d+ items? to confirm[\s\S]*\d+\/\d+ SDD passages passing/, 'the readiness line counts what to fix, what to confirm and the SDD passages');
  assert.ok(await page.$('.validation-workspace .validation-support .vx-sdd') && await page.$('.validation-workspace .validation-main') && !(await page.$('.cm')), 'Validate opens on the chapter’s checks, without the model');
  await page.waitForSelector('.vx-obs:not([hidden])', {timeout: 8000});
  assert.match(await page.$eval('.vx-obs > summary', e => e.innerText), /^Model observations · [1-9]\d*$/);
  if (!await page.$('.vx-obs[open]')) { await page.click('.vx-obs > summary'); await page.waitForTimeout(250); }
  assert.match(await page.$eval('.vx-obs .vx-obs-in', e => e.innerText), /^The Chapter 3 models also show · \d+ of \d+\n[\s\S]*ADR-00\d/i);
  pass('The switcher\'s Whole design opens the Whole design view of the Chapter 3 model (there is no page map behind it) and its own view comes back; a deep link opens on its decision; Validate opens on its checks and shows what the Chapter 3 models find');

  // 9. Round 25 (D-25-03 to D-25-08): the decision reading on screen, in light and in dark. The facts are set through the
  // project's own commands: a constraint driver on CON-001 (a Must) that ADR-002 weighs, an ADR-002 alternative following
  // the SA Playbook's Protected System pattern with no effect stated on QD-005, an ADR-001 alternative following its Standby
  // pattern with no effect stated on QD-002, and QD-004's priority withdrawn. A person records "Breaks it" and each
  // suggested effect through Chapter 3's own comparison editor and change review; AIW chooses nothing.
  // A command through the page's store: an ordinary change waits for a person's review (workbench-ui.js), given here.
  const command = async (type, payload) => {
    await page.evaluate(([type, payload]) => { window.__aiwCmd = null; window.aiwProjectStore.command({type, payload}).then(() => { window.__aiwCmd = 'ok'; }, e => { window.__aiwCmd = 'error: ' + e.message; }); }, [type, payload]);
    const seen = await (await page.waitForFunction(() => window.__aiwCmd || (document.querySelector('dialog.wb-dialog[open]') ? 'review' : null), null, {timeout: 15000})).jsonValue();
    if (seen === 'review') { await reviewAndApply('Synthetic facts for the decision reading, reviewed.'); await page.waitForFunction(() => window.__aiwCmd, null, {timeout: 15000}); }
    assert.equal(await page.evaluate(() => window.__aiwCmd), 'ok', type);
  };
  const docNow = () => page.evaluate(() => window.aiwProjectStore.value.document);
  let doc = await docNow();
  const adr = id => doc.decisions.records.find(d => d.id === id), assess = (effect, reason) => ({effect, reason, evidence: 'Synthetic design review notes.'});
  await command('quality.driver', {kind: 'constraint', title: 'Post through the existing core ledger', description: 'Every posting goes through the existing core ledger.', impact: 'Rules out a second store of postings.', constraintIds: ['CON-001'], priority: 'High'});
  doc = await docNow();
  const C = doc.quality.drivers.at(-1).id;
  assert.equal(doc.quality.drivers.at(-1).kind, 'constraint');
  await command('decision.save', {id: 'ADR-002', driverIds: [...adr('ADR-002').driverIds, C]});
  doc = await docNow();
  await command('decision.alternative', {id: 'ADR-002', alternativeId: 'ALT-003', assessments: {...adr('ADR-002').alternatives.find(a => a.id === 'ALT-003').assessments, [C]: assess('supports', 'Posts through the core ledger.')}});
  await command('decision.alternative', {id: 'ADR-002', title: 'Guard the posting boundary', pattern: 'Protected System', summary: 'A protected boundary in front of posting.', benefits: 'One place to check every instruction.', costs: 'Another boundary to run.', consequences: 'Posting accepts only checked instructions.', assessments: {'QD-001': assess('neutral', 'Leaves the posting record as it is.'), 'QD-003': assess('neutral', 'One more check on the path.'), [C]: assess('supports', 'Posts through the core ledger.')}});
  await command('decision.alternative', {id: 'ADR-001', title: 'Keep a warm standby for intake', pattern: 'Standby', summary: 'A standby takes instruction intake over.', benefits: 'Intake survives one failure.', costs: 'A second intake to keep in step.', consequences: 'Intake fails over to the standby.', assessments: {'QD-003': assess('neutral', 'The acknowledgement path is unchanged.'), 'QD-006': assess('neutral', 'The trail is unchanged.')}});
  await command('quality.driver', {id: 'QD-004', priority: ''});
  doc = await docNow();
  const guard = adr('ADR-002').alternatives.at(-1).id, standby = adr('ADR-001').alternatives.at(-1).id;
  assert.equal(doc.quality.drivers.find(d => d.id === 'QD-004').priority, '', 'QD-004 has no stated priority');
  // "Breaks it" in the comparison editor: offered only for the constraint driver.
  await open('&decision=ADR-002');
  await page.focus('.dx-card[data-card="ALT-004"]'); await page.waitForTimeout(200);
  await click('.dx-card[data-card="ALT-004"] .dx-t');
  await click('#inspector .cm-companion [data-dx="edit-alt"]'); await page.waitForTimeout(300);
  assert.match(await page.$eval('dialog[open] #d-dialog-title', e => e.textContent), /Revise ALT-004/);
  await click('dialog[open] [data-d-step="1"]');
  const offered = id => page.$$eval(`dialog[open] [name="effect:${id}"] option`, os => os.map(o => o.value + ':' + o.textContent));
  assert.ok((await offered(C)).includes('violates:Breaks it'), '"Breaks it" is offered for the constraint driver: ' + await offered(C));
  for (const id of ['QD-001', 'QD-003', 'QD-005']) assert.deepEqual((await offered(id)).filter(o => /violates|Breaks/.test(o)), [], id + ' is not a constraint: "Breaks it" is not offered');
  await page.selectOption(`dialog[open] [name="effect:${C}"]`, 'violates');
  await page.fill(`dialog[open] [name="reason:${C}"]`, 'The cache keeps its own record of postings, outside the core ledger.');
  await page.fill(`dialog[open] [name="evidence:${C}"]`, 'Synthetic design review notes.');
  await page.$eval('#d-alternative-form', f => f.requestSubmit()); await page.waitForTimeout(800);
  await reviewAndApply('Record that the application cache breaks the core-ledger constraint.');
  doc = await docNow();
  assert.equal(adr('ADR-002').alternatives.find(a => a.id === 'ALT-004').assessments[C].effect, 'violates', 'recorded by a person through the editor');
  pass('"Breaks it" is offered in the comparison editor only for a driver of kind constraint (not for QD-001, QD-003 or QD-005), and a person records it through decision.alternative and the change review');

  // What every screen shows of the reading, in either theme.
  const card = id => page.$eval(`.dx-card[data-card="${id}"]`, e => e.innerText.replace(/\s+/g, ' '));
  const foot = id => page.$eval(`.dx-foot[data-card="${id}"]`, e => e.innerText.replace(/\s+/g, ' '));
  const panelOf = async id => { await page.focus(`.dx-card[data-card="${id}"]`); await page.waitForTimeout(150); await click(`.dx-card[data-card="${id}"] .dx-t`); return (await panel()).replace(/\s+/g, ' '); };
  const readingShown = async () => {
    await open(); if (await page.$('.cm-view[data-id="map"][aria-pressed="false"]')) await click('[data-dx="view"][data-id="map"]');
    assert.match(await card('ALT-004'), /Ruled out · breaks QD-007/, 'a ruled-out alternative is marked on the map, with the constraint it breaks');
    assert.match(await card('ALT-006'), /Dominated by ALT-005/, 'a dominated alternative is marked');
    assert.match(await card('ALT-002'), /★ Leads on the drivers[\s\S]*holds if same-priority drivers count alike · unstated effects could change it/, 'the lead, how firmly it holds and that the unstated effects matter');
    assert.match(await card('QD-004'), /×0 · weighs nothing/, 'the driver left out of the weights');
    assert.doesNotMatch(await page.$eval('.cm.dx', e => e.innerText), /favou?r|scored|winner|recommends|AIW chooses/i);
    let p = await panelOf('ADR-001');
    assert.match(p, /The reading[\s\S]*Acknowledge a durable asynchronous handoff leads on the drivers: \+2 against 0 for Keep a warm standby for intake[\s\S]*The lead holds if drivers of the same priority count alike, not for every weighting the priorities allow\. If only QD-006 \(Medium\) counted, Keep a warm standby for intake would come ahead of Acknowledge a durable asynchronous handoff\.[\s\S]*One weighed effect is not stated; stating it could change the lead: Keep a warm standby for intake’s on QD-002/, 'how firmly the lead holds, and the unstated effect that could change it');
    assert.match(p, /Arithmetic on the recorded effects, not a measurement; it does not choose\./, 'the reading\'s note beside the totals');
    p = await panelOf('ADR-003');
    assert.match(p, /Retry immediately after a timeout is dominated by Enquire and reconcile before replay: Enquire and reconcile before replay is at least as good on every driver and better on QD-001, QD-004 and QD-006\.[\s\S]*QD-004 weighs nothing: no priority is stated\./, 'the dominated alternative and the driver left out, in the reading\'s sentences');
    p = await panelOf('ALT-004');
    assert.match(p, /Alternative · ALT-004 of ADR-002 ?Ruled out[\s\S]*As weighted[\s\S]*Ruled out · breaks QD-007[\s\S]*Suppress repeats in the application cache is ruled out: it breaks QD-007, a hard constraint\./i, 'the alternative panel says it is ruled out and why');
    for (let i = 0; i < 2 && (await page.$('#inspector .cm-companion .cm-spec')); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
  };
  // A suggestion recorded by a person: shown labelled and with its source in the matrix, filled into the comparison
  // editor by "Use this suggestion", and recorded only when the person saves; what they save carries no drafted mark.
  const recordSuggestion = async (theme, decisionId, altId, driverId, before, after, source) => {
    await click('[data-dx="view"][data-id="matrix"]'); await page.waitForTimeout(400);
    assert.match(await foot(altId), before, altId + ' before');
    assert.match(await foot('ALT-004'), /ruled out · breaks QD-007/, 'the matrix row of a ruled-out alternative says so, and ranks it nowhere');
    assert.ok(await page.$(`.dx-cell.unknown[data-card="${altId}"][data-driver="${driverId}"] .dx-sug`), 'the unstated cell says a suggestion waits, not counted');
    await page.focus(`.dx-cell[data-card="${altId}"][data-driver="${driverId}"]`); await page.waitForTimeout(150);
    await click(`.dx-cell[data-card="${altId}"][data-driver="${driverId}"]`);
    const p = (await panel()).replace(/\s+/g, ' ');
    assert.match(p, new RegExp(`Selected matrix cell[\\s\\S]*${driverId}[\\s\\S]*Suggestion · not counted[\\s\\S]*Suggests Supports: The SA Playbook marks the ${source} pattern as strong support[\\s\\S]*Source SA Playbook, [\\s\\S]*Use this suggestion`, 'i'), 'the suggestion, its source, labelled as not counted');
    // The matrix's new states read at 4.5:1 or better in this theme.
    const feet = await contrast(['.dx-foot.out small', '.dx-foot.lead small', `.dx-cell.unknown[data-card="${altId}"] .dx-sug`, '#inspector .cm-companion .dx-sugg > small']);
    for (const [s, x] of Object.entries(feet)) assert.ok(x && x.ratio >= 4.5, `${theme}: ${s} reaches 4.5:1 (${x?.ratio})`);
    const was = JSON.stringify(await docNow());
    await click('#inspector .cm-companion [data-dx="use-suggestion"]'); await page.waitForTimeout(400);
    assert.match(await page.$eval('dialog[open] #d-dialog-title', e => e.textContent), new RegExp('Revise ' + altId));
    assert.equal(await page.$eval(`dialog[open] [name="effect:${driverId}"]`, e => e.value), 'supports', 'the editor is filled with the suggested effect');
    assert.match(await page.$eval(`dialog[open] [name="reason:${driverId}"]`, e => e.value), new RegExp('The SA Playbook marks the ' + source + ' pattern'));
    assert.match(await page.$eval(`dialog[open] [name="evidence:${driverId}"]`, e => e.value), /^SA Playbook, /);
    assert.match(await page.$eval('dialog[open] .d-suggested', e => e.innerText), /Filled from a suggestion[\s\S]*Nothing is recorded until you save; what you save is your own judgement\./i);
    assert.equal(JSON.stringify(await docNow()), was, 'nothing is recorded before the person saves');
    assert.match(await foot(altId), before, 'and the reading has not moved');
    await page.$eval('#d-alternative-form', f => f.requestSubmit()); await page.waitForTimeout(800);
    await reviewAndApply('Recorded from the SA Playbook\'s mark, reviewed against this design.');
    doc = await docNow();
    const saved = adr(decisionId).alternatives.find(a => a.id === altId).assessments[driverId];
    assert.equal(saved.effect, 'supports'); assert.ok(!Object.hasOwn(saved, 'by'), 'what the person saved is theirs: no drafted mark');
    await page.waitForTimeout(400);
    assert.match(await foot(altId), after, altId + ' after: the reading moves only now');
  };
  const contrast = sels => page.evaluate(sels => {
    const parse = c => { const m = c.match(/rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?/); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ground = e => { for (let x = e; x; x = x.parentElement) { const c = parse(getComputedStyle(x).backgroundColor); if (c && c[3] > 0.5) return c; } return parse(getComputedStyle(document.body).backgroundColor); };
    return Object.fromEntries(sels.map(s => { const e = document.querySelector(s); if (!e) return [s, null]; const a = lum(parse(getComputedStyle(e).color)), b = lum(ground(e)); return [s, {ratio: +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2), color: getComputedStyle(e).color}]; }));
  }, sels);
  const MAP_STATES = ['.dx-card[data-card="ALT-004"] .dx-stand.out', '.dx-card[data-card="ALT-006"] .dx-stand.dominated', '.dx-card[data-card="ALT-002"] .dx-lead', '.dx-card[data-card="ALT-002"] .dx-stand.lead'];
  const colours = {};
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') { await page.click('.top-actions [data-theme-choice="dark"]'); await page.waitForTimeout(400); }
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
    await readingShown();
    const states = await contrast(MAP_STATES);
    for (const [s, x] of Object.entries(states)) { assert.ok(x && x.ratio >= 4.5, `${theme}: ${s} reaches 4.5:1 (${x?.ratio})`); (colours[s] ??= []).push(x.color); }
    if (theme === 'light') await recordSuggestion(theme, 'ADR-002', guard, 'QD-005', /\+3 between 0 and \+6 ranks 2 of 2/, /\+6 ★ leads/, 'Protected System');
    else await recordSuggestion(theme, 'ADR-001', standby, 'QD-002', /0 between −2 and \+2 ranks 2 of 3/, /\+2 tied/, 'Standby');
    await click('[data-dx="view"][data-id="map"]');
    pass(`${theme}: the map marks the alternative that leads on the drivers with how firmly it holds and that unstated effects could change it, a ruled-out alternative with the constraint it breaks, a dominated alternative and the driver left out of the weights (×0); the companion gives the reading's sentences with its note; the matrix shows a suggested effect labelled and with its source, "Use this suggestion" fills the comparison editor, nothing is recorded before the person saves, the saved assessment carries no drafted mark, and only then does the reading move; the new state colours reach 4.5:1`);
  }
  for (const [s, [light, dark]] of Object.entries(colours)) assert.notEqual(light, dark, s + ' is re-coloured by the dark theme\'s tokens');
  await page.click('.top-actions [data-theme-choice="light"]'); await page.waitForTimeout(300);
  doc = await docNow();
  assert.ok(doc.decisions.records.every(d => !Object.hasOwn(d, 'reading') && !Object.hasOwn(d, 'lead')), 'nothing the reading computes is saved');
  pass('the reading is computed when read and never saved; the dark theme re-colours its states from the theme tokens');

  // 8. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=3&tab=model', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .dx-card'); await p2.waitForTimeout(400);
  // rc39/rc40 (model-round27.css, the phone rule): the model section is `auto` high with its content row `minmax(320px,1fr)`
  // and the page scrolls; the views tray and the Arrange bar stand above the stage. The round-3 floor was 360 px for a
  // section without those bars; the pin is the stylesheet's own floor plus the rule that the stage takes every pixel the
  // section's other rows leave (nothing between them is wasted). Recorded in audit/rc41/w4/NOTE.md for the lead.
  const m = await p2.evaluate(() => { const cm = document.querySelector('.cm'), stage = document.querySelector('.cm-stage'); const rows = [...cm.children].filter(c => c !== stage && getComputedStyle(c).display !== 'none' && getComputedStyle(c).position !== 'absolute').reduce((a, c) => a + c.getBoundingClientRect().height, 0); return {h: stage.getBoundingClientRect().height, section: cm.getBoundingClientRect().height, rows, over: document.documentElement.scrollWidth > innerWidth}; });
  assert.ok(m.h >= 320 && m.h >= m.section - m.rows - 12 && !m.over, 'phone ' + JSON.stringify(m));
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
