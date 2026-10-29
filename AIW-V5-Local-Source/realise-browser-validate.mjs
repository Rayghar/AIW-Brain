// Rendered checks for the Chapter 5 Model views (the components; the Allocation view is retired since round 11, its
// pair kept by the Matrix).
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
const db = '.aiw-local/realise-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* The fixture server may already have exited. */ } }); // the server never outlives this suite
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
  const open = async (ch = 5) => { await page.goto(base + '/?chapter=' + ch + '&tab=model' + modelOf(ch), {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-head, .cm .dp-row, .cm .tm-card, .cm .rz-card', {timeout: 8000}); await showCompanion(); await page.waitForTimeout(400); };
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
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.rz-card, .rz-label, .rz-lh')].map(e => { const r = e.getBoundingClientRect(), o = (e.closest('.cm-world, .cm-heads-in, .cm-rail-in') || e.closest('.cm-stage') || e.closest('.cm'))?.getBoundingClientRect() || {x: 0, y: 0}; return [e.className.split(' ')[0], e.dataset.card || e.dataset.link || e.dataset.lane || '', Math.round(r.x - o.x), Math.round(r.y - o.y), Math.round(r.width), Math.round(r.height)].join('|'); }));
  const spec = () => page.$eval('#inspector .cm-companion .cm-spec', e => e.innerText);

  // 1. Chapter 5 Model opens on the components, each carrying what it realises.
  await open();
  assert.ok(await page.$('.cm.rz .cm-view[data-id="components"][aria-pressed="true"]'));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.am-explorer, .canvas-card')].some(e => getComputedStyle(e).display !== 'none')), false, 'the explorer is not shown');
  assert.equal(await count('.rz-lh.module'), 3, 'three modules as lanes');
  assert.equal(await count('.rz-card.component'), 5); assert.equal(await count('.rz-card.party'), 3);
  assert.equal(await count('.rz-card.component .rz-r'), 5, 'each component carries the responsibility it realises');
  const stands = await page.$$eval('.rz-card.component .rz-strip', ss => ss.map(s => ({prods: s.querySelectorAll('.rz-n.prod').length, open: s.querySelectorAll('button.rz-n.open').length, shown: s.querySelectorAll('.rz-n:not(.more)').length, more: +(s.querySelector('.rz-n.more')?.textContent.slice(1) || 0), fits: s.scrollWidth <= s.clientWidth + 1, tip: s.querySelector('.rz-n.open')?.title || ''})));
  assert.equal(stands.length, 5); assert.ok(stands.reduce((n, s) => n + s.shown + s.more, 0) >= 20, 'and the platform it stands on');
  assert.ok(stands.every(s => s.prods === 0 && s.open >= 1 && s.fits), 'no product is named while Chapter 7 has chosen none: the capabilities with open candidates are dashed, the rest behind +N, on one line ' + JSON.stringify(stands));
  assert.match(stands[0].tip, /\d candidate products? in Chapter 7, none chosen/, 'and each says the choice is still open');
  assert.equal(await count('.rz-label'), 7, 'every interaction is labelled');
  assert.equal(await count('#inspector .cm-companion .cm-spec'), 0, 'nothing is selected on arrival');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /5 components in 3 modules · 0 responsibilities not realised · 4 of 4 logical flows carried/);
  pass('Chapter 5 Model opens on five components in their three modules, each carrying the responsibility it realises and the platform it stands on, with every interaction labelled');

  // 2. The lens changes what is read, never where anything is.
  const before = await rects();
  for (const lens of ['flow', 'reasoning', 'structure']) {
    await click(`[data-rz="lens"][data-id="${lens}"]`);
    assert.deepEqual(await rects(), before, lens + ' moved objects');
    const shown = await page.$eval('.rz-card.component .rz-lens', e => [...e.children].filter(x => getComputedStyle(x).display !== 'none').map(x => x.className));
    assert.deepEqual(shown, [{flow: 'fl', reasoning: 'rs', structure: 'st'}[lens]]);
  }
  pass('Structure, Flow and Reasoning each show their own reading on every card and label, and leave everything where it was');

  // 3. Selecting reads the component; its editor is one click away.
  await click('.rz-card[data-card="risk-engine"] .rz-t');
  const s1 = await spec();
  assert.match(s1, /Service · APP-002[\s\S]*Risk engine[\s\S]*Realises[\s\S]*LR-002 Risk screening[\s\S]*Stands on[\s\S]*Why[\s\S]*no decision behind it/i);
  assert.ok(await count('.rz-route.lit') >= 2 && await count('.rz-card.dim') >= 4);
  const sp = await page.$eval('#inspector .cm-companion .sp', e => e.innerText);
  assert.match(sp, /Specification\s*APP-002[\s\S]*Logical[\s\S]*LR-002[\s\S]*Platform[\s\S]*TC-001[\s\S]*Products[\s\S]*Kubernetes 1\.31[\s\S]*CNCF[\s\S]*candidate[\s\S]*PostgreSQL 17[\s\S]*Runtime[\s\S]*RUN-002[\s\S]*active[\s\S]*Must meet[\s\S]*QD-/i, 'the specification reads from responsibility to product and runtime');
  assert.ok(await page.$('#inspector .cm-companion .sp a.sp-a[href*="chapter=7"]'), 'each product links to Chapter 7');
  const ap = await page.$eval('#inspector .cm-companion .sp-ap', e => e.innerText);
  assert.ok(/Anti-patterns it is part of/i.test(ap) && /Single Point of Failure/.test(ap) && /Synchronous Chain/.test(ap) && /Observability as Afterthought/.test(ap), 'the component, and where it runs, are part of three anti-patterns');
  await click('#inspector .cm-companion [data-a-action="edit"]'); await page.waitForTimeout(400);
  assert.equal(await page.$eval('dialog[open] #a-dialog-title', e => e.textContent), 'Edit APP-002 · Risk engine');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  if (await page.$('dialog[open]')) { await page.evaluate(() => document.querySelector('dialog[open]').close()); await page.waitForTimeout(200); }
  pass('selecting a component reads what it realises, owns, takes in, gives out and stands on, and why; its specification runs from responsibility to products with version and vendor and where it runs, with the anti-patterns it is part of; Edit component opens the Chapter 5 editor on it');

  // 4. Removing an allocation is staged as a model proposal: the model shows the proposed design,
  //    with a hole where the responsibility is no longer realised, until the proposal is discarded.
  await click('.rz-card[data-card="worker"] .rz-t');
  await click('#inspector .cm-companion [data-a-action="edit"]'); await page.waitForTimeout(400);
  await page.evaluate(() => { const f = document.querySelector('#a-component-form'), x = f.querySelector('input[name="logicalIds"][value="hub"]'); x.checked = false; x.dispatchEvent(new Event('change', {bubbles: true})); f.requestSubmit(); });
  await page.waitForTimeout(1400);
  assert.ok(!(await page.$('dialog[open]')), 'the edit is staged');
  assert.match(await page.$eval('.cm-banner .ip-banner', e => e.innerText), /Unsaved proposal[\s\S]*Model proposal/i, 'the model proposal banner');
  assert.ok(await page.$('.rz-card.hole[data-card="HOLE:hub"]'), 'LR-004 stands as a hole in Settlement in the proposed model');
  assert.match(await page.$eval('.rz-card[data-card="worker"]', e => e.innerText), /realises no responsibility/);
  assert.ok(await count('.rz-card.changed') >= 1, 'what the proposal changes is marked');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /1 responsibility not realised · 2 of 4 logical flows carried/);
  await click('.rz-card.hole [data-a-action="new-for-logical"]'); await page.waitForTimeout(400);
  assert.ok(await page.$eval('#a-component-form', f => f.querySelector('input[name="logicalIds"][value="hub"]').checked), 'Create a component opens the editor already allocated to LR-004');
  await page.evaluate(() => document.querySelector('dialog[open]').close()); await page.waitForTimeout(300);
  await click('.cm-banner [data-ip-action="dismiss"]'); await page.waitForTimeout(400);
  await click('[data-ip-action="discard-confirm"]'); await page.waitForTimeout(700);
  assert.ok(!(await page.$('.rz-card.hole')) && !(await page.$('.cm-banner .ip-banner')), 'discarding restores the saved design');
  pass('removing an allocation in the Chapter 5 editor is staged as a model proposal: the model shows LR-004 as a hole and the worker realising nothing, the hole\'s Create a component opens the editor allocated to it, and discarding restores the saved design');

  // 5. Dissect, fold and walk.
  await open();
  await page.dblclick('.rz-card[data-card="core-adapter"] .rz-t'); await page.waitForTimeout(500);
  assert.match(await crumbs(), /Control & accounting › Core connector/);
  assert.ok(await page.$('.rz-card.subject[data-card="core-adapter"]') && await count('.rz-card.ctx') >= 3);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  if (/Core connector$/.test(await crumbs())) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  assert.match(await crumbs(), /Whole system › Control & accounting$/, 'Escape steps back to the module first');
  for (let i = 0; i < 3 && /›/.test(await crumbs()); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  await click('[data-rz="depth"][data-id="modules"]');
  assert.ok(await count('.rz-card.module') >= 3);
  await click('[data-rz="depth"][data-id="components"]');
  await click('[data-rz="walk-next"]');
  assert.match(await page.$eval('.cm-walk-text', e => e.innerText), /1 \/ 4 LR-001 Payment API → LR-002 Risk screening \(Screen\)\. Realised by Payment service → Risk engine\. Carried by INT-001/);
  assert.ok(await count('.rz-route.lit') === 1);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  pass('a component can be dissected with its neighbours beside it, Escape steps back through the module, modules fold, and the walk reads which interaction carries each Chapter 4 flow');

  // 6. Allocation is retired (round 11, A): the Matrix keeps responsibilities against components, the old deep link lands
  //    there and "You are here" says why, and a component proposal is drawn in place in the Components view.
  assert.equal(await page.$$eval('.cm-view[data-id="allocation"]', es => es.length), 0, 'no Allocation entry in the switcher');
  await page.goto(base + '/?chapter=5&tab=model&model=allocation', {waitUntil: 'networkidle'}); await page.waitForSelector('.nt-x', {timeout: 15000}); await page.waitForTimeout(300);
  assert.equal(await page.$eval('.cm-view[aria-pressed="true"]', e => e.dataset.id), 'cross', 'model=allocation opens the Matrix');
  assert.match(await page.$eval('.nt-x-corner', e => e.textContent), /^Responsibilities ↓ · Components →$/, 'on responsibilities against components');
  assert.equal(await count('.nt-x tbody tr'), 5); assert.equal(await count('.nt-x td.hit.direct'), 5, 'one recorded allocation per responsibility'); assert.equal(await count('.nt-x tbody tr.gap'), 0, 'and no hole');
  assert.match(await page.$eval('#yah-text', e => e.textContent), /Matrix · Allocation is retired: the Matrix keeps responsibilities against components/, '"You are here" says why');
  await click('.nt-x [data-nt-row="risk"]'); await page.waitForTimeout(300);
  await click('#inspector .cm-companion [data-a-action="preview"][data-a-key="review"]'); await page.waitForTimeout(800);
  await click('[data-rz="view"][data-id="components"]'); await page.waitForTimeout(300);
  assert.match(await page.$eval('.cm-banner', e => e.innerText), /Component proposal · not saved[\s\S]*Held payment review queue/i, 'the proposal previews in Components');
  assert.doesNotMatch(await page.$eval('#yah-text', e => e.textContent), /retired/, 'a view chosen by hand ends the note');
  assert.ok(await page.$('.rz-card.proposed') && await count('.rz-route.proposed') === 1, 'the proposal is its own card, linked to the risk engine');
  assert.match(await page.$eval('.rz-card[data-card="risk-engine"]', e => e.innerText), /LR-002/, 'each component carries its allocations');
  await click('.cm-banner [data-a-action="dismiss"]'); await page.waitForTimeout(500);
  assert.ok(!(await page.$('.rz-card.proposed')) && !(await page.$('.cm-banner .dp-banner')));
  // 6b. The Specification is a normal-size reading with meaningful lenses, outside the diagram camera.
  await click('[data-rz="view"][data-id="specification"]');
  assert.ok(await page.$('.cm.rz .cm-view[data-id="specification"][aria-pressed="true"]'), 'the view is on');
  assert.ok(await page.$('.rz-spec.empty') || await page.$('.rz-spec[data-spec-of]'), 'the view draws, held or empty');
  if (await page.$('.rz-spec.empty')) { await click('.rz-spec.empty [data-sel="api-pod"]'); }
  else if (!(await page.$('.rz-spec[data-spec-of="api-pod"]'))) { await page.selectOption('[data-spec-component]', 'api-pod'); }
  await page.waitForSelector('.rz-spec[data-spec-of="api-pod"]', {timeout: 4000});
  // rc40 W3: the sheet is the template's ten sections on one page, with a table of contents in place of the lenses.
  assert.equal(await count('.cm-lenses .cm-lens'), 0, 'the lenses give way to the sheet’s table of contents');
  assert.deepEqual(await page.$$eval('.rz-spec [data-spec-section]', es => es.map(e => e.dataset.specSection)), ['header', 'purpose', 'basis', 'interfaces', 'data', 'qualities', 'realization', 'security', 'decisions', 'provenance'], 'the ten sections of the template, in order, every one on the page');
  assert.equal(await page.$eval('.rz-spec-toc [aria-current="true"]', e => e.dataset.id), 'header');
  const reading = await page.$eval('.rz-spec-sheet', e => ({outsideCamera: !e.closest('.cm-world'), font: parseFloat(getComputedStyle(e.querySelector('.rz-spec-purpose')).fontSize), width: e.clientWidth, contentWidth: e.scrollWidth, tocSticky: getComputedStyle(e.querySelector('.rz-spec-toc')).position}));
  assert.ok(reading.outsideCamera && reading.font >= 13 && reading.contentWidth <= reading.width + 1 && reading.tocSticky === 'sticky', 'prose reads at normal size without canvas scaling or horizontal overflow, the table of contents stays in view');
  assert.equal(await page.$eval('.cm-stage', e => getComputedStyle(e).display), 'none');
  assert.equal(await page.$eval('.cm-tools', e => getComputedStyle(e).display), 'none', 'camera instruments are absent from a document reading');
  const completeness = await page.$eval('.rz-spec', e => ({percent: Number(e.dataset.specComplete), omissions: Number(e.querySelector('[data-spec-omissions]').dataset.specOmissions), listed: e.querySelectorAll('[data-spec-omission]').length, open: e.querySelectorAll('[data-spec-field][data-spec-state="open"]').length, ring: e.querySelector('.rz-spec-ring figcaption').innerText}));
  assert.ok(completeness.percent > 0 && completeness.percent < 100 && completeness.omissions === completeness.listed && completeness.listed <= completeness.open && new RegExp(completeness.percent + '\\s*%').test(completeness.ring), 'the completeness ring and the omissions list agree with the fields: ' + JSON.stringify(completeness));
  assert.equal(await page.$$eval('.rz-spec [data-spec-section]:not([data-spec-section="header"])', es => es.filter(e => !e.querySelector('[data-spec-field] :is(.rz-sl, .rz-spec-value, .rz-spec-empty-note, .rz-spec-table, .rz-spec-card)')).length), 0, 'every section renders a linked value or a precise empty state');
  assert.match(await page.$eval('.rz-spec [data-spec-field="container"]', e => e.innerText), /TR-001[\s\S]*inferred/, 'the container derived from the compute need is said as inferred');
  await click('.rz-spec-toc [data-rz="spec-section"][data-id="qualities"]');
  assert.equal(await page.$eval('.rz-spec-toc [aria-current="true"]', e => e.dataset.id), 'qualities');
  const jumped = await page.$eval('.rz-spec-sheet', e => ({top: e.scrollTop, section: e.querySelector('[data-spec-section="qualities"]').getBoundingClientRect().top - e.getBoundingClientRect().top, page: window.scrollY}));
  assert.ok(jumped.top > 0 && jumped.section >= 0 && jumped.section <= 80, 'a jump scrolls the sheet to the section: ' + JSON.stringify(jumped));
  assert.match(await page.$eval('.rz-spec [data-spec-field="mechanisms"]', e => e.innerText), /Quality properties[\s\S]*Record the quality property and mechanism/);
  assert.match(await page.$eval('.rz-spec [data-spec-field="drivers-table"]', e => e.innerText), /QD1[\s\S]*No selected decision assesses it/);
  assert.match(await page.$eval('.rz-spec-c', e => e.innerText), /APP-001[\s\S]*Payment service/);
  assert.match(await page.$eval('.cm-state', e => e.innerText), /Specification of APP-001/);
  assert.ok(await page.$('.rz-spec a.rz-sl[href*="chapter=4"]') && await page.$('.rz-spec a.rz-sl[href*="chapter=8"]') && await page.$('.rz-spec a.rz-sl[href*="chapter=10"]'), 'entries link to their chapters');
  await click('.rz-spec-toc [data-rz="spec-section"][data-id="interfaces"]');
  assert.equal(await page.$eval('.rz-spec-toc [aria-current="true"]', e => e.dataset.id), 'interfaces');
  await click('.rz-spec [data-spec-section="interfaces"] button.rz-sl[data-sel="risk-engine"]');
  await page.waitForSelector('.rz-spec[data-spec-of="risk-engine"]', {timeout: 4000});
  assert.match(await page.$eval('.rz-spec-c', e => e.innerText), /APP-002/, 'a Chapter 5 entry is held in place');
  assert.ok(await page.$('#inspector .cm-companion .sp'), 'the companion reads the held component');
  // The sheet walks nothing of its own; the footer keeps the frame's opener for the Components walk (model-stage.js, rc39).
  assert.equal(await count('.cm-walk-in [data-walk]:not([data-model-walk]), .cm-walk-in [data-rz^="walk-"]'), 0, 'no walk step on the specification');
  assert.equal(await count('.cm-walk-in > *'), await count('.cm-walk-in > [data-model-walk="open"]'), 'the footer holds nothing but the frame’s walk opener');
  await click('[data-rz="view"][data-id="components"]');
  assert.ok(await page.$('.rz-card[data-card="risk-engine"]'), 'the held component survives the change of view');
  pass('the Specification reads outside the camera at normal type size as the template’s ten sections with a completeness ring and omissions that agree with the fields, a sticky table of contents in place of the lenses, while native links, the component chooser, the companion and the subject survive view changes');
  pass('Allocation is retired: model=allocation opens the Matrix on responsibilities against components (five recorded allocations, no hole) and "You are here" says why; Propose a held payment review queue from a responsibility previews an unsaved card beside the risk engine in Components, each component carries its allocations, and dismissing leaves the design unchanged');

  // 7. Perspectives are entries of the switcher (round 5, R5-C): one draws in the model's own frame in place of the
  //    chapter's view, and the view it came from brings the chapter model back; other chapters keep their models.
  const viewBefore = await page.$eval('.cm.rz .cm-view[aria-pressed="true"]', b => b.dataset.id);
  await click('.cm.rz .pv-pick > summary'); await click('.cm.rz .pv-pick [data-pv="new"]'); await page.waitForTimeout(400);
  assert.ok(await page.$('.cm.pv') && !(await page.$('.cm.rz')) && !(await page.$('.am-explorer')), 'a perspective is the chapter\'s view, in its frame');
  await click(`.cm.pv .cm-views > .cm-view[data-id="${viewBefore}"]`); await page.waitForTimeout(500);
  assert.ok(await page.$('.cm.rz .rz-card'));
  await page.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.dk', {timeout: 8000}); await page.waitForTimeout(200); assert.ok(await page.$('.cm.dk') && !(await page.$('.cm.rz, .cm.pf')), 'chapter 11 opens on the review desk');
  await open(9); assert.ok(await page.$('.cm.tm') && !(await page.$('.cm.rz')), 'Chapter 9 keeps its threat model');
  assert.equal(await count('.cm'), 1, 'only one chapter model is on the page');
  await open(5);
  await page.click('.workspace-bar [data-tab="validate"]'); await page.waitForTimeout(900);
  // Round 3 (C): Validate is the chapter's checks, with a status header and the chapter in the SDD; the model stays on Model.
  // rc38+ (rc41 W4): the frame is the validation workspace, bound to the project and chapter, whose readiness line carries
  // the counts (what to fix, what to confirm, the SDD passages passing); the chapter in the SDD sits in its support section.
  await page.waitForSelector('.validation-workspace[data-validation-workspace^="bank-payment:5"][data-bound="1"] .validation-readiness', {timeout: 8000});
  assert.match(await page.$eval('.validation-workspace .validation-readiness', e => e.innerText), /\d+ findings? to fix[\s\S]*\d+ items? to confirm[\s\S]*\d+\/\d+ SDD passages passing/, 'the readiness line counts what to fix, what to confirm and the SDD passages');
  assert.ok(await page.$('.validation-workspace .validation-support .vx-sdd') && await page.$('.validation-workspace .validation-main') && !(await page.$('.cm')), 'Validate opens on the chapter’s checks, without the model');
  pass('A perspective in the switcher and back to the chapter\'s view, Chapter 11 opens on the review desk, Chapter 9 keeps its own models, only one chapter model is ever on the page, and Validate is unchanged');

  // 8. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=5&tab=model&model=components', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .rz-card'); await p2.waitForTimeout(400);
  // rc39/rc40 (model-round27.css, the phone rule): the model section is `auto` high with its content row `minmax(320px,1fr)`
  // and the page scrolls; the views tray and the Arrange bar stand above the stage. The round-3 floor was 360 px for a
  // section without those bars; the pin is the stylesheet's own floor plus the rule that the stage takes every pixel the
  // section's other rows leave (nothing between them is wasted). Recorded in audit/rc41/w4/NOTE.md for the lead.
  const m = await p2.evaluate(() => { const cm = document.querySelector('.cm'), stage = document.querySelector('.cm-stage'); const rows = [...cm.children].filter(c => c !== stage && getComputedStyle(c).display !== 'none' && getComputedStyle(c).position !== 'absolute').reduce((a, c) => a + c.getBoundingClientRect().height, 0); return {h: stage.getBoundingClientRect().height, section: cm.getBoundingClientRect().height, rows, over: document.documentElement.scrollWidth > innerWidth}; });
  assert.ok(m.h >= 320 && m.h >= m.section - m.rows - 12 && !m.over, 'phone ' + JSON.stringify(m));
  await phone.close();
  pass('on a 390 px phone the realisation has a usable canvas and no horizontal page scroll');

  // 9. The library (round 11, workstream F): from Chapter 5 Work, "From the library" lists the twenty archetypes;
  //    choosing one proposes an unsaved ghost on the model; its review form saves a candidate with origin archetype only
  //    with the review ticked; "Add to the library" files that component's snapshot as a draft entry.
  await page.goto(base + '/?chapter=5&tab=work', {waitUntil: 'networkidle'}); await page.waitForSelector('[data-a-action="from-library"]', {timeout: 8000});
  const countBefore = await page.evaluate(() => window.aiwProjectStore.value.document.realisation.components.length);
  await click('[data-a-action="from-library"]'); await page.waitForSelector('dialog[open] [data-cl-archetype]', {timeout: 8000});
  assert.equal(await count('dialog[open] [data-cl-archetype]'), 20, 'the twenty catalogue archetypes are listed');
  await page.waitForSelector('dialog[open] [data-cl-orgs] .brain-note, dialog[open] [data-cl-orgs] article', {timeout: 8000});
  await page.click('dialog[open] [data-cl-archetype="ARCH-CACHE-CAPABILITY"] [data-cl-action="propose"]');
  await page.waitForSelector('.cm-banner .dp-banner [data-a-action="edit-ghost"]', {timeout: 8000});
  assert.match(await page.$eval('.cm-banner .dp-banner', e => e.textContent), /Component proposal · not saved[\s\S]*Cache Capability/);
  assert.equal(await page.evaluate(() => window.aiwProjectStore.value.document.realisation.components.length), countBefore, 'proposing writes nothing');
  await click('.cm-banner .dp-banner [data-a-action="edit-ghost"]'); await page.waitForSelector('dialog[open] #a-component-form', {timeout: 8000});
  assert.match(await page.$eval('dialog[open]', e => e.textContent), /From the catalogue archetype Cache Capability[\s\S]*Proposed with the component[\s\S]*interface contracts for Chapter 8/);
  assert.equal(await page.$eval('dialog[open] [name="reviewed"]', e => e.checked), false);
  await page.click('dialog[open] [data-a-step="2"]'); await page.waitForTimeout(200);
  await page.click('dialog[open] #a-component-form button[type="submit"]'); await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => window.aiwProjectStore.value.document.realisation.components.length), countBefore, 'nothing is saved without the review');
  await page.check('dialog[open] [name="reviewed"]'); await page.click('dialog[open] #a-component-form button[type="submit"]');
  await page.waitForFunction(n => window.aiwProjectStore.value.document.realisation.components.length === n + 1, countBefore, {timeout: 8000});
  const made = await page.evaluate(() => { const c = window.aiwProjectStore.value.document.realisation.components.at(-1); return {origin: c.origin, status: c.status, archetype: c.library?.archetypeId, contracts: c.proposed?.contracts.length, kind: c.kind}; });
  assert.deepEqual(made, {origin: 'archetype', status: 'candidate', archetype: 'ARCH-CACHE-CAPABILITY', contracts: 2, kind: 'store'});
  assert.equal(await page.evaluate(() => window.aiwProjectStore.value.document.interfaces.contracts.length), 7, 'no Chapter 8 contract is written');
  await page.goto(base + '/?chapter=5&tab=work', {waitUntil: 'networkidle'}); await page.waitForSelector('[data-a-action="to-library"]', {timeout: 8000});
  assert.ok(await page.$('.a-record .chip'), 'the register shows the new component with its chip');
  // Round 12 (GR-GOV-06): one vocabulary for where a record came from: the person's record, written in a catalogue
  // archetype's words (a record a person makes in guidance's words is the person's, from guidance).
  // rc39/rc40 Work frame (rc41 W4): the register's container classes moved; the pin reads the new component's own row
  // (`data-work-record-row`), its status line, rather than any text in the register.
  const madeId = await page.evaluate(() => window.aiwProjectStore.value.document.realisation.components.at(-1).id);
  assert.match(await page.$eval(`.a-record[data-work-record-row="${madeId}"] .l-status-line`, e => e.innerText), /Written by \S+ \(from a catalogue archetype\)/);
  await page.click('[data-a-action="to-library"]'); await page.waitForSelector('dialog[open] #cl-add-form', {timeout: 8000});
  await page.fill('dialog[open] [name="owner"]', 'Platform team'); await page.click('dialog[open] #cl-add-form button[type="submit"]');
  await page.waitForFunction(() => (window.aiwProjectStore.value.document.workbench?.catalogue || []).some(e => e.kind === 'component'), null, {timeout: 8000});
  const entry = await page.evaluate(() => { const e = window.aiwProjectStore.value.document.workbench.catalogue.find(e => e.kind === 'component'); return {status: e.status, schema: JSON.parse(e.content).schema}; });
  assert.deepEqual(entry, {status: 'draft', schema: 'aiw.component-snapshot.v1'});
  pass('round 11: From the library lists the twenty archetypes, proposes an unsaved ghost, saves a candidate with origin archetype only once reviewed (its contracts stay proposals), and Add to the library files a draft component entry with the snapshot');

  // 10. The catalogue reading in the workbench: the archetypes with "Propose into this project", which takes the same
  //     proposal path (an unsaved ghost on the model; nothing written). The Co-design round made the former Proposals
  //     panel a chapter guide and kept pattern and library exploration under "Knowledge and chapter tools"
  //     (audit/co-design-2026-10-13.json), so the reading is opened there.
  const countAfter = await page.evaluate(() => window.aiwProjectStore.value.document.realisation.components.length);
  // rc38 shell (rc41 W4): the chapter's assistance bar (Co-design among it) folds into the toolbar's Chapter tools menu;
  // opened as a viewer opens it, then the menu's own Co-design.
  if (!await page.$('details.chapter-tools[open]')) { await page.click('details.chapter-tools > summary'); await page.waitForSelector('details.chapter-tools[open] .chapter-tools-menu .brain-assistance', {timeout: 5000}); }
  await click('details.chapter-tools[open] .brain-assistance [data-a-action="mind"][data-brain-launch="mind"]'); await page.waitForSelector('#brain-panel .brain-exploration > summary', {timeout: 8000});
  assert.match(await page.$eval('#brain-panel .brain-exploration > summary', e => e.textContent), /Knowledge and chapter tools/);
  if (!(await page.$eval('#brain-panel .brain-exploration', e => e.open))) await click('#brain-panel .brain-exploration > summary');
  await page.waitForSelector('#brain-panel [data-library-reading]', {timeout: 8000});
  await click('#brain-panel [data-library-reading] > summary'); await page.waitForSelector('#brain-panel [data-library-reading] [data-cl-archetype]', {timeout: 8000});
  assert.equal(await count('#brain-panel [data-library-reading] [data-cl-archetype]'), 20, 'the reading lists the twenty archetypes');
  await page.waitForSelector('#brain-panel [data-library-reading] [data-cl-orgs] .brain-note, #brain-panel [data-library-reading] [data-cl-orgs] article', {timeout: 8000});
  await page.click('#brain-panel [data-cl-archetype="ARCH-MESSAGE-BROKER-CAPABILITY"] [data-cl-action="propose-here"]');
  await page.waitForSelector('.cm-banner .dp-banner [data-a-action="edit-ghost"]', {timeout: 8000});
  assert.match(await page.$eval('.cm-banner .dp-banner', e => e.textContent), /Message Broker Capability/);
  assert.equal(await page.evaluate(() => window.aiwProjectStore.value.document.realisation.components.length), countAfter, 'proposing from the reading writes nothing');
  await click('.cm-banner .dp-banner [data-a-action="dismiss"]'); await page.waitForTimeout(300);
  assert.ok(!(await page.$('.cm-banner .dp-banner')), 'dismissing leaves the design as it was');
  pass('round 11: the component library reading, under the Co-design panel\'s Knowledge and chapter tools, lists the twenty archetypes with Propose into this project, which opens the same unsaved proposal on the model and writes nothing');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 5 model (rendered)', passed: checks.length, checks}, null, 2));
