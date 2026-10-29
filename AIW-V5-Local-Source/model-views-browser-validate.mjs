// Rendered checks for the Chapter 4–8 model views (v20.5): the room the canvas has, the footer's tools
// and status, the companion's names, the keys, the keyboard, the phone, a blank project's empty states,
// the loading placeholder, and the server's revalidation and preloading.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and
// optionally AIW_BROWSER_EXECUTABLE. Starts an isolated local server on a free port.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import {referenceProject} from './notation-fixtures.mjs';
import {checkMarks} from './public/notation-view.js';
import {traceFrom, matrixModel} from './public/model-matrix.js';
import {CHECK_GLYPHS} from './public/readiness-model.js';
import {switcherLabels, trayLines} from './public/instrument-tray.js';
import {recordBelongsTo} from './public/chapter-records.js';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/model-views-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* the server may already have exited */ } }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => { checks.push(n); console.log('PASS', n.slice(0, 100)); };
// The chapters' analytical views, which these checks read; the Diagram is the default since v20.6. Chapter 8's own view
// is the Data flow since round 11 (its Sequence view is retired into the Diagram's Sequence picture).
const modelOf = ch => ({4: 'map', 5: 'components', 6: 'platform', 7: 'stack', 8: 'data', 9: 'model', 10: 'deploy'}[ch] ? '&model=' + {4: 'map', 5: 'components', 6: 'platform', 7: 'stack', 8: 'data', 9: 'model', 10: 'deploy'}[ch] : '');
const wait = ms => new Promise(r => setTimeout(r, ms));
try {
  // 1. The server revalidates instead of re-sending, lists a module's closure, and preloads the page's own.
  const first = await fetch(base + '/model-stage.js'), etag = first.headers.get('etag');
  assert.equal(first.status, 200); assert.ok(etag && /^"/.test(etag), 'a static file carries an ETag');
  assert.equal(first.headers.get('cache-control'), 'no-cache', 'and asks to be revalidated, not re-sent');
  const again = await fetch(base + '/model-stage.js', {headers: {'If-None-Match': etag}});
  assert.equal(again.status, 304, 'an unchanged file is not sent again');
  assert.equal((await fetch(base + '/')).headers.get('cache-control'), 'no-cache', 'the page itself too');
  assert.equal((await fetch(base + '/../server.js')).status, 404, 'nothing outside public/');
  pass('static files are revalidated with an ETag and no-cache: an unchanged file answers 304 and is not sent again');

  // 2. While a chapter model loads, its frame says so.
  const slow = await browser.newContext({viewport: {width: 1440, height: 900}});
  const ps = await slow.newPage(); ps.on('pageerror', e => errors.push(e.message));
  await ps.route('**/realise-view.js', async route => { await wait(1500); await route.continue(); });
  await ps.goto(base + '/?chapter=5&tab=model&model=components', {waitUntil: 'commit'});
  await ps.waitForSelector('.cm-loading', {timeout: 15000});
  assert.match(await ps.$eval('.cm-loading', e => e.textContent), /Preparing the Chapter 5 model/);
  assert.equal(await ps.$eval('.cm-loading', e => e.getAttribute('aria-busy')), 'true');
  await ps.waitForSelector('.cm.rz .rz-card', {timeout: 15000}); await wait(300);
  assert.equal(await ps.$('.cm-loading'), null, 'the placeholder leaves when the model mounts');
  await slow.close();
  pass('while a chapter model’s modules load, the stage shows “Preparing the Chapter 5 model…” in the model’s frame, and it leaves when the model mounts');

  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  let page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  // A fresh tab in the same context (same storage, same projects). Each full load of the unbundled client fetches about
  // 270 modules and styles; after a few dozen loads in one tab Chromium can refuse new loads for a moment
  // (net::ERR_INSUFFICIENT_RESOURCES) while earlier documents' loads are still being released, which no reader of
  // the production bundle meets. A walk that reloads every chapter starts from a fresh tab; its checks are unchanged.
  const freshTab = async () => { const old = page; page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message)); await old.close(); };
  const open = async (ch, extra = '') => { await page.goto(base + '/?chapter=' + ch + '&tab=model' + modelOf(ch) + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-stage', {timeout: 10000}); await page.waitForTimeout(400); };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(250); };
  const count = async sel => (await page.$$(sel)).length;
  const objectParam = () => page.evaluate(() => new URL(location.href).searchParams.get('object'));
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' '));
  const rect = sel => page.$eval(sel, e => { const r = e.getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right}; });

  // 2b. One frame on every tab (round 3, B): sidebar, heading, assistance bar, stage column and companion column are
  // the same on Work and on Model, for Chapters 4, 8 and 11, and the page itself does not scroll on Model.
  const frame = async (ch, tab) => {
    await page.goto(base + '/?chapter=' + ch + '&tab=' + tab, {waitUntil: 'networkidle'});
    if (tab === 'model') await page.waitForSelector('.cm .cm-top', {timeout: 15000});
    if (await page.$('#ux-coach [data-coach="close"]')) await page.click('#ux-coach [data-coach="close"]');
    // The shell's Details column opens on request since rc38 (workspace-ux.js, remembered per chapter and tab): the frame
    // is measured with it open on both tabs, as a reader who has opened it sees it.
    await page.evaluate(() => { if (document.body.dataset.panel !== 'open') document.querySelector('[data-panel-toggle]')?.click(); });
    await page.waitForTimeout(500);
    return page.evaluate(() => {
      const r = s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return null; const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
      const h1 = document.querySelector('.heading-row h1'), items = [...document.querySelectorAll('.sidebar .chapter-item')].map(e => Math.round(e.getBoundingClientRect().height));
      return {sidebar: r('.sidebar')?.[2], heading: r('.heading-row')?.[3], subtitle: !!r('.heading-row .subtitle'), readiness: !!r('.progress-disclosure'), bar: r('.l-assistance, .r-assistant-bar')?.slice(1), stage: r('.studio > .stage')?.filter((_, i) => i !== 3).concat(), companion: r('.studio > #inspector')?.filter((_, i) => i !== 3), scroll: document.documentElement.scrollHeight - innerHeight, look: {h1: h1 && getComputedStyle(h1).fontSize, status: !!r('.journey-status'), items: items.join(',')}};
    });
  };
  const measured = [];
  for (const ch of [4, 8, 11]) {
    const work = await frame(ch, 'work'), model = await frame(ch, 'model');
    measured.push(`Ch ${ch}: sidebar ${work.sidebar}, heading ${work.heading}, stage x ${work.stage[0]} w ${work.stage[2]}, companion x ${work.companion[0]} w ${work.companion[2]}`);
    // The shell's rail and inspector are its rc38 tokens (studio-system.css --studio-rail 220 px, --studio-inspector 320 px).
    assert.equal(model.sidebar, 220, 'Chapter ' + ch + ': the sidebar stays 220 px on Model');
    assert.equal(model.subtitle && model.readiness, true, 'Chapter ' + ch + ': the heading keeps its subtitle and readiness');
    for (const k of ['sidebar', 'heading', 'bar', 'stage', 'companion', 'look']) assert.deepEqual(model[k], work[k], `Chapter ${ch}: the ${k} is the same on Work and Model (${JSON.stringify(work[k])} / ${JSON.stringify(model[k])})`);
    assert.equal(model.companion[2], 320, 'Chapter ' + ch + ': the companion column is 320 px');
    assert.ok(model.scroll <= 0, 'Chapter ' + ch + ': the page does not scroll while the picture is open');
  }
  {
    const ph = await browser.newContext({viewport: {width: 390, height: 844}}), pg = await ph.newPage(); pg.on('pageerror', e => errors.push(e.message));
    // The heading's subtitle is the chapter's question on Model and its description on Work (the shell's wording per tab),
    // so the heading's height is not compared; its place and width, its parts, and where the stage starts below it are.
    const top = async tab => { await pg.goto(base + '/?chapter=4&tab=' + tab, {waitUntil: 'networkidle'}); if (await pg.$('#ux-coach [data-coach="close"]')) await pg.click('#ux-coach [data-coach="close"]'); await pg.waitForTimeout(600); return pg.evaluate(() => { const r = s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return null; const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; }; const h = r('.heading-row'), st = r('.studio > .stage'); return {heading: h?.slice(0, 3), parts: !!r('.heading-row h1') && !!r('.heading-row .subtitle') && !!r('.progress-disclosure'), status: r('.journey-status'), bar: r('.l-assistance'), stage: st && h ? [st[0], st[1] - (h[1] + h[3]), st[2]] : null}; }); };
    assert.deepEqual(await top('model'), await top('work'), 'on a phone too, the heading (its place, width and parts), the status line, the assistance bar and where the stage starts below the heading are the same on Work and Model');
    await ph.close();
  }
  pass('one frame on every tab: on Chapters 4, 8 and 11 the sidebar (220 px), the heading with subtitle and readiness, the assistance bar, the stage column and the 320 px companion column are the same on Work and Model, and the page does not scroll (' + measured.join('; ') + ')');

  // 2c. One switcher in one order: Diagram · the chapter's own views · Layers · Table · Matrix · Whole design. Round 11 (A):
  //     the entries are the instrument tray's for this project (instrument-tray.js), so the renamed views carry their new
  //     names (Boundary; If a capability fails; If a zone fails) and the retired ones (Allocation, Sequence) are gone.
  const switchers = {};
  for (const ch of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
    // Each inventory is independent; keep project storage but release the previous raw-module document.
    await freshTab();
    await page.goto(base + '/?chapter=' + ch + '&tab=model', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-views .nt-shared-view', {timeout: 15000});
    const views = await page.$$eval('.cm-views .cm-view:not([hidden])', bs => bs.map(b => b.textContent.trim()));
    // Since rc38 the switcher opens with the chapter's own default view and the Diagram second (instrument-tray.js, pinned by tray-validate).
    assert.equal(views[0], switcherLabels(referenceProject(), ch)[0], 'Chapter ' + ch + ' starts with the tray’s first entry, the chapter’s default view');
    assert.equal(views[1], 'Diagram', 'Chapter ' + ch + ' offers the Diagram second');
    assert.deepEqual(views.slice(-4), ['Layers', 'Table', 'Matrix', 'Whole design'], 'Chapter ' + ch + ' ends with the shared views: ' + views.join(' · '));
    assert.deepEqual(views, switcherLabels(referenceProject(), ch), 'Chapter ' + ch + ' offers exactly the tray’s entries: ' + views.join(' · '));
    switchers[ch] = views;
  }
  assert.ok(switchers[1].includes('Boundary') && switchers[6].includes('If a capability fails') && switchers[10].includes('If a zone fails'), 'the renamed views carry their new names');
  assert.ok(!switchers[5].includes('Allocation') && !switchers[8].includes('Sequence') && !switchers[1].includes('Context'), 'the retired views and the old names are gone');
  pass('every chapter model offers one switcher in one order, drawn from the instrument tray: its default view · Diagram · its other views · Layers · Table · Matrix · Whole design; Boundary, If a capability fails and If a zone fails carry their new names, and Allocation and Sequence are gone');

  // 2d. Table, Matrix and Whole design: a row selects into the companion with Open in Work; the layer filter applies;
  // the matrix marks its gaps and swaps its axes; the anatomy is a Model view with its companion in the column.
  await page.goto(base + '/?chapter=4&tab=model&model=table', {waitUntil: 'networkidle'}); await page.waitForSelector('.nt-table tbody tr', {timeout: 15000});
  assert.deepEqual((await page.$$eval('.nt-table tbody tr[data-nt-row]', rows => rows.map(r => r.dataset.ntRow))).sort(), ['api', 'risk', 'ledger', 'hub', 'notify', 'GRP-001', 'GRP-002', 'GRP-003'].sort(), 'the table lists all five responsibilities and their three recorded groups');
  // The table's columns since rc38 (model-table.js): the record type and the key fields each as a column of its own.
  assert.deepEqual(await page.$$eval('.nt-table thead th', ths => ths.map(t => t.textContent.replace(/[▲▼]/g, '').trim())), ['Reference', 'Title', 'Record type', 'Accountable owner', 'Responsibility group', 'Source requirements', 'Open checks', 'Linked']);
  await click('.nt-table thead [data-nt="sort"][data-id="title"]');
  const titles = await page.$$eval('.nt-table tbody tr td:first-of-type', tds => tds.map(t => t.textContent));
  assert.deepEqual(titles, [...titles].sort((a, b) => a.localeCompare(b)), 'a heading sorts');
  await page.fill('[data-nt-field="tfilter"]', 'LR-003'); await page.waitForTimeout(400);
  assert.equal(await count('.nt-table tbody tr[data-nt-row]'), 1, 'the filter narrows the rows'); assert.equal(await page.evaluate(() => document.activeElement?.dataset.ntField), 'tfilter', 'and keeps the keyboard');
  await page.fill('[data-nt-field="tfilter"]', ''); await page.waitForTimeout(400);
  // The one layer model since rc38: the sidebar names the picture and opens the view's Layers menu, where each layer is a checkbox.
  await page.click('.journey-explorer [data-action="model-layer-filter"]'); await page.waitForTimeout(500);
  await click('.nt-pop [data-nt="layer"][data-id="logical"]'); await page.waitForTimeout(500);
  assert.equal(await count('.nt-table tbody tr[data-nt-row]'), 0, 'the layers menu, opened from the sidebar, filters the table'); assert.match(await page.$eval('.nt-sheet-status', e => e.textContent), /8 hidden by layers/);
  await click('.nt-pop [data-nt="layers-all"]'); await page.waitForTimeout(700);
  await page.focus('.nt-table tbody tr'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  assert.ok(await page.$('#inspector .cm-companion .cm-spec') && await page.$('#inspector .cm-companion [data-cm-open-work]'), 'Enter on a row selects it into the companion, with Open in Work');
  const picked = await objectParam();
  await click('#inspector .cm-companion [data-cm-open-work]'); await page.waitForTimeout(900);
  assert.match(page.url(), /tab=work/, 'Open in Work opens the Work tab'); assert.equal(await objectParam(), picked, 'on the same record');
  await page.goto(base + '/?chapter=9&tab=model&model=cross', {waitUntil: 'networkidle'}); await page.waitForSelector('.nt-x', {timeout: 15000});
  // Round 11 (A): Chapter 9 opens on controls against components (what each control protects); threats against controls is a choice away.
  assert.match(await page.$eval('.nt-x-corner', e => e.textContent), /Controls ↓ · Components →/, 'Chapter 9’s matrix: controls against components');
  await page.selectOption('[data-nt-field="xrows"]', 'threat'); await page.waitForTimeout(400); await page.selectOption('[data-nt-field="xcols"]', 'control'); await page.waitForTimeout(400);
  assert.match(await page.$eval('.nt-x-corner', e => e.textContent), /Threats ↓ · Controls →/, 'threats against controls, chosen');
  assert.ok(await count('.nt-x tr.gap') >= 1, 'a threat no control covers is marked as a gap');
  await click('.nt-x td.hit button');
  assert.match(await page.$eval('#inspector .cm-companion', e => e.textContent), /Selected cell/, 'a cell reads its relationship in the companion');
  await click('[data-nt="swap"]');
  assert.match(await page.$eval('.nt-x-corner', e => e.textContent), /Controls ↓ · Threats →/, 'the axes swap');
  await click('.cm-views [data-id="whole"]'); await page.waitForSelector('.cm-sheet .an.an-embedded .an-n', {timeout: 15000}); await page.waitForTimeout(500);
  assert.ok(await page.$('#inspector .cm-companion .an-companion section') && !(await page.$('body.an-active')), 'Whole design is the anatomy inside the model, its companion in the column, the frame unchanged');
  pass('Table sorts, filters (keeping the keyboard), follows the sidebar’s layers and selects a row into the companion with Open in Work; Matrix opens Chapter 9 on controls against components, sets threats against controls, marks the gaps, reads a cell and swaps its axes; Whole design is the anatomy as a Model view');

  // 2e. Round 4 (R4-B), the Matrix: any two record types the project holds, read from the data with the chapter's own
  // first; a cell is the recorded relationship or, where there is none, the path through one other record, marked as
  // such; a click reads it; the gaps are marked; the pair is remembered per chapter and the axes still swap.
  {
    const corner = () => page.$eval('.nt-x-corner', e => e.textContent.trim());
    await page.goto(base + '/?chapter=8&tab=model&model=cross', {waitUntil: 'networkidle'}); await page.waitForSelector('.nt-x', {timeout: 15000});
    assert.match(await corner(), /^Components ↓ · Contracts →$/, 'Chapter 8 opens on its default pair');
    // Since rc38 the sets stand under their chapters, in chapter order (model-matrix.js): each record type with the chapter that records it.
    const groups = await page.$$eval('[data-nt-field="xrows"] optgroup', gs => gs.map(g => ({label: g.label, options: [...g.querySelectorAll('option')].map(o => o.value)})));
    const chapters = groups.map(g => Number((g.label.match(/^Chapter (\d+)$/) || [])[1])).filter(Number.isFinite);
    assert.ok(chapters.length >= 5 && chapters.every((c, i) => !i || c > chapters[i - 1]), 'the sets stand under their chapters, in chapter order: ' + groups.map(g => g.label).join(' | '));
    const under = ch => groups.find(g => g.label === 'Chapter ' + ch)?.options || [];
    assert.ok(under(8).includes('contract') && under(8).includes('data') && under(5).includes('component'), 'each record type under the chapter that records it: ' + groups.map(g => g.label + ': ' + g.options.join(',')).join(' | '));
    const offered = groups.flatMap(g => g.options);
    for (const t of ['requirement', 'quality', 'decision', 'journey', 'responsibility', 'component', 'capability', 'technology', 'contract', 'threat', 'control', 'instance', 'runtime']) assert.ok(offered.includes(t), 'the sets include every record type the project holds: ' + t);
    assert.ok(!offered.includes('risk'), 'and none it holds no record of');
    assert.deepEqual(await page.$$eval('[data-nt-field="xcols"] option', os => os.map(o => o.value)), offered, 'Rows and Columns offer the same sets');
    const via = await page.$('.nt-x td.hit.via button');
    assert.ok(via && /^○via [A-Z]+-\d+/.test((await via.textContent()).trim()) && /no recorded relationship; related via/.test(await via.getAttribute('aria-label')), 'a pair with no recorded relationship shows the path through one other record, marked as such');
    await via.click(); await page.waitForTimeout(400);
    assert.match(await page.$eval('#inspector .cm-companion', e => e.textContent), /Selected cell · through one record[\s\S]*No relationship is recorded between the two/, 'and a click reads the path in the companion');
    assert.equal(await page.$eval('.nt-x td.on button', e => e.getAttribute('aria-pressed')), 'true', 'the cell is marked selected in place');
    await page.selectOption('[data-nt-field="xrows"]', 'data'); await page.waitForTimeout(400);
    await page.selectOption('[data-nt-field="xcols"]', 'component'); await page.waitForTimeout(400);
    assert.match(await corner(), /^Data definitions ↓ · Components →$/, 'any two record types: data definitions against components');
    const direct = await page.$$eval('.nt-x td.hit.direct button', bs => bs.map(b => b.textContent.trim()));
    assert.ok(direct.length >= 1 && direct.every(t => /^●\S/.test(t)), 'a recorded relationship shows its word: ' + direct.slice(0, 3).join(' | '));
    const gaps = await page.$$eval('.nt-x tbody tr.gap, .nt-x thead th.gap', e => e.length), status = await page.$eval('.nt-sheet-status', e => e.textContent);
    // The status since rc38 (model-matrix.js): the rows and columns with no link at this scope, or that every shown record has one.
    assert.ok(gaps > 0 ? /\d+ [a-z ]+ and \d+ [a-z ]+ with no link at this scope/.test(status) : /every shown record has a link; this does not verify coverage/.test(status), 'the status counts the gaps (' + gaps + ' marked): ' + status);
    await page.reload({waitUntil: 'networkidle'}); await page.waitForSelector('.nt-x', {timeout: 15000});
    assert.match(await corner(), /^Data definitions ↓ · Components →$/, 'the pair is remembered on reload');
    await page.goto(base + '/?chapter=5&tab=model&model=cross', {waitUntil: 'networkidle'}); await page.waitForSelector('.nt-x', {timeout: 15000});
    assert.match(await corner(), /^Responsibilities ↓ · Components →$/, 'per chapter: Chapter 5 keeps its own default');
    await page.goto(base + '/?chapter=8&tab=model&model=cross', {waitUntil: 'networkidle'}); await page.waitForSelector('.nt-x', {timeout: 15000});
    assert.match(await corner(), /^Data definitions ↓ · Components →$/, 'and Chapter 8 its chosen pair');
    await click('[data-nt="swap"]');
    assert.match(await corner(), /^Components ↓ · Data definitions →$/, 'the axes still swap');
    await page.reload({waitUntil: 'networkidle'}); await page.waitForSelector('.nt-x', {timeout: 15000});
    assert.match(await corner(), /^Components ↓ · Data definitions →$/, 'and the swapped pair is the one remembered');
    await page.selectOption('[data-nt-field="xcols"]', 'contract'); await page.waitForTimeout(400);
    assert.match(await corner(), /^Components ↓ · Contracts →$/);
    pass(`Matrix: the Rows and Columns selects offer every record type the project holds (${offered.length}, the chapter’s connected model first) and none it does not; a cell shows the recorded relationship by its word, or the path through one other record marked “via”, and a click reads it in the companion; the gaps are counted (${gaps} marked on data definitions × components); the pair is remembered per chapter across a reload and the axes still swap`);
  }

  // 2f. The Layers view (rc39, W2, over round 4's one layer model): one lane per concern band the chapter's connected
  // model holds, in the bands' order, each headed with its count; the band's records as list boxes by type (a group of
  // one as the record), the relationships between the groups as counted lines between the lanes, and the band-to-band
  // index in the companion, each entry opening its exact records; a band whose every record the layers hide collapses
  // to a strip that says so and opens its layers again; the companion's reading lists the bands held as drawn or hidden.
  {
    const bands = ['motivation', 'business', 'application', 'information', 'technology', 'security', 'deployment'];
    const lanes = () => page.$$eval('.cm-svg .nt-band[data-nt-lane]', gs => gs.map(g => ({layer: g.dataset.ntLane, text: g.querySelector('text').textContent, none: g.classList.contains('nt-band-none'), collapsed: g.classList.contains('nt-band-collapsed')})));
    const reading = () => page.$$eval('#inspector .cm-companion .nt-lanes-read > div', ds => ds.map(d => [d.dataset.lane, d.className.replace('nt-read-', ''), d.querySelector('dd').textContent]));
    await page.goto(base + '/?chapter=4&tab=model&model=layers', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm-svg .nt-lane', {timeout: 15000}); await page.waitForTimeout(300);
    let L = await lanes();
    const held = L.map(l => l.layer);
    assert.ok(held.length >= 3 && held.every(l => bands.includes(l)) && held.join() === bands.filter(b => held.includes(b)).join(), 'one lane per concern band the chapter holds, in the bands’ order: ' + L.map(l => l.text).join(' | '));
    assert.ok(L.every(l => /^[A-Z][A-Za-z &]+ · \d+$/.test(l.text) && !l.collapsed && !l.none), 'every lane names its band and its count, and no empty strip is drawn');
    assert.match(await page.$eval('.nt-fold-note', e => e.textContent), /Architecture concerns.*42 records.*108 relationships/, 'the grouped overview names the source model instead of treating its records as hidden');
    const drawn = await page.evaluate(() => ({groups: document.querySelectorAll('.cm-svg .nt-node[data-nt-node^="fold:"] .nt-li').length, boxes: document.querySelectorAll('.cm-svg .nt-node[data-nt-node^="fold:"]').length, lines: document.querySelectorAll('.cm-svg .nt-edge[data-nt-edge^="fold:"]').length, counted: [...document.querySelectorAll('.cm-svg .nt-hit[data-nt-edge^="fold:"]')].filter(h => /×\d+|\d+ relationships/.test(h.getAttribute('aria-label'))).length, index: document.querySelectorAll('#inspector [data-nt="pair"]').length, cards: document.querySelectorAll('.cm-svg .nt-rel-row, .cm-svg .nt-lane-card').length}));
    assert.ok(drawn.boxes >= 4 && drawn.groups >= drawn.boxes && drawn.lines >= 1 && drawn.counted >= 1 && drawn.index >= 1 && drawn.cards === 0, 'type groups are list boxes with their members, the relationships between them counted lines, the band-to-band index in the companion, and no index card or row is drawn: ' + JSON.stringify(drawn));
    await click('#inspector [data-nt="pair"]');
    assert.ok(await count('#inspector .nt-pair-spec [data-nt="fold-edge"]') >= 1, 'an index entry opens its named exact relationships');
    await click('#inspector .nt-pair-spec [data-nt="fold-edge"]');
    assert.ok(await count('.cm-svg .nt-edge') >= 1 && /Exact relationship/.test(await page.$eval('.nt-fold-note', e => e.textContent)), 'an exact record reveals its endpoint line');
    await click('.nt-fold-note [data-nt="fold-group"]');
    await click('.nt-fold-note [data-nt="fold-all"]');
    assert.ok(await count('.cm-svg .nt-node') > 30 && await count('.cm-svg .nt-edge') > 10, 'Show every element restores the source elements and relationships');
    let R = await reading();
    assert.deepEqual(R.map(r => r[0]), held, 'the reading lists the bands held');
    assert.ok(R.every(r => r[1] === 'drawn'), 'each drawn: ' + R.map(r => r[2]).join(' | '));
    await click('[data-nt="menu"][data-id="layers"]'); await click('.nt-pop [data-nt="layer"][data-id="security"]'); await page.keyboard.press('Escape'); await page.waitForTimeout(900);
    L = await lanes();
    const sec = L.find(l => l.layer === 'security');
    assert.deepEqual(L.map(l => l.layer), held, 'still one lane per band with a layer hidden');
    assert.ok(sec.collapsed && sec.text === 'Security concerns · 1 hidden by layers', 'the band whose every record is hidden collapses in place and says what it holds: ' + sec.text);
    R = await reading();
    assert.deepEqual(R.find(r => r[0] === 'security'), ['security', 'hidden', 'hidden · 1 in its collapsed lane'], 'and the reading says hidden');
    // The strips may stand below the camera's view: the click is dispatched where the reader would make it.
    const tap = async sel => { await page.$eval(sel, e => e.dispatchEvent(new MouseEvent('click', {bubbles: true}))); await page.waitForTimeout(400); };
    await tap('.cm-svg .nt-band-collapsed[data-nt-lane="security"]');
    assert.ok(!(await lanes()).find(l => l.layer === 'security').collapsed, 'a click on the collapsed band shows its layers again');
    assert.equal((await lanes()).length, held.length, 'and the lanes are the bands held, nothing more');
    pass('Layers: Chapter 4 draws one lane per concern band it holds (' + held.join(', ') + '), each with its count, its type groups as list boxes and the relationships between them as counted lines; the band-to-band index in the companion opens exact records; hiding Security collapses its band to “Security concerns · 1 hidden by layers”, a click shows it again; the reading lists the bands as drawn or hidden');
  }

  // 2g. Round 4 (R4-B), phones: below 480 px Table and Matrix scroll inside their card, the first column and the
  // heading row stay in view, the scroll affordance shows, the Matrix's axes stack, every word is at least 12 px and
  // none is cut, and the page itself never scrolls sideways — measured at 390 × 844 and 360 × 780.
  {
    const phoneSizes = [];
    for (const [w, h] of [[390, 844], [360, 780]]) {
      const ph = await browser.newContext({viewport: {width: w, height: h}}), pg = await ph.newPage(); pg.on('pageerror', e => errors.push(e.message));
      for (const view of ['table', 'cross']) {
        await pg.goto(base + '/?chapter=8&tab=model&model=' + view, {waitUntil: 'networkidle'}); await pg.waitForSelector('.nt-table-wrap', {timeout: 15000}); await pg.waitForTimeout(500);
        const m = await pg.evaluate(async () => {
          const frame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
          const sheet = document.querySelector('.cm-sheet'), wrap = sheet.querySelector('.nt-table-wrap'), card = wrap.parentElement;
          const texts = [...sheet.querySelectorAll('*')].filter(e => e.getClientRects().length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && !e.closest('.cm-sr, select'));
          const clipped = texts.filter(e => { const cs = getComputedStyle(e); return (['hidden', 'clip'].includes(cs.overflowX) || cs.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 1; }).map(e => e.textContent.trim().slice(0, 24));
          const ctx = document.createElement('canvas').getContext('2d');
          const selects = [...sheet.querySelectorAll('select')].map(s => { const cs = getComputedStyle(s), r = s.getBoundingClientRect(); ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; return {top: Math.round(r.top), left: Math.round(r.left), fits: ctx.measureText(s.options[s.selectedIndex].text).width <= s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 18}; });
          const firstIn = () => { const c = wrap.querySelector('tbody tr th').getBoundingClientRect(), r = wrap.getBoundingClientRect(); return c.left >= r.left - 1 && c.right <= r.right + 1 && c.width > 40; };
          const affordance = card.classList.contains('nt-ovf-r') && getComputedStyle(card.querySelector('.nt-scroll-hint')).display !== 'none';
          wrap.scrollLeft = wrap.scrollWidth; await frame();
          const scrolledX = wrap.scrollLeft, firstAfter = firstIn();
          wrap.scrollTop = wrap.scrollHeight; await frame();
          const scrolledY = wrap.scrollTop, headTop = wrap.querySelector('thead th:last-child').getBoundingClientRect().top - wrap.getBoundingClientRect().top;
          wrap.scrollTop = 0; wrap.scrollLeft = 0; await frame();
          return {pageW: document.documentElement.scrollWidth, minFont: Math.min(...texts.map(e => parseFloat(getComputedStyle(e).fontSize))), clipped, selects, scrolledX, scrolledY, firstAfter, headTop: Math.round(headTop), affordance, wrap: [wrap.clientWidth, wrap.scrollWidth, wrap.clientHeight, wrap.scrollHeight]};
        });
        const tag = `${w}×${h} ${view === 'cross' ? 'Matrix' : 'Table'}`;
        assert.equal(m.pageW, w, tag + ': the page is as wide as the window (no sideways page scroll)');
        assert.ok(m.minFont >= 12, tag + ': every word at least 12 px: ' + m.minFont);
        assert.deepEqual(m.clipped, [], tag + ': no word is cut');
        assert.ok(m.scrolledX > 0 && m.firstAfter, tag + ': it scrolls sideways inside its card and the first column stays in view: ' + JSON.stringify(m.wrap));
        assert.ok(m.scrolledY > 0 && Math.abs(m.headTop) <= 1, tag + ': it scrolls down inside its card under the heading row: ' + m.headTop);
        assert.ok(m.affordance, tag + ': the edge is shaded and the card says it scrolls sideways');
        if (view === 'cross') { assert.equal(m.selects.length, 2); assert.ok(m.selects[1].top > m.selects[0].top + 20 && Math.abs(m.selects[1].left - m.selects[0].left) <= 1 && m.selects.every(x => x.fits), tag + ': the Rows and Columns selects stack, each showing its set whole: ' + JSON.stringify(m.selects)); }
        phoneSizes.push(`${tag}: min ${m.minFont} px, card ${m.wrap[0]}×${m.wrap[2]} of ${m.wrap[1]}×${m.wrap[3]}`);
      }
      await ph.close();
    }
    pass('phones: at 390 × 844 and 360 × 780 the Table and the Matrix scroll inside their card both ways with the first column and the heading row in view and a shaded edge that says so, the Matrix’s selects stack, every word is at least 12 px and none is cut, and the page never scrolls sideways (' + phoneSizes.join('; ') + ')');
  }

  // 2h. Round 4 (R4-B), scale: a long table draws a page of 50 rows with “Show more”, a selection beyond the page
  // brings its page in, and a matrix wider than 40 columns draws the first 40 and says so until a filter narrows it.
  // The project is built through /api/commands, one data definition per command, as the workbench saves them.
  {
    const origin = base, call = async (path, body) => { const r = await fetch(origin + path, {method: body ? 'POST' : 'GET', headers: body ? {'Content-Type': 'application/json', Origin: origin} : {Origin: origin}, body: body ? JSON.stringify(body) : undefined}); const d = await r.json(); if (!r.ok) throw Error(path + ' → ' + (d.error || r.status)); return d; };
    const made = await call('/api/projects', {name: 'Model views at scale', template: 'bank-payment', brief: 'Fifty-two data definitions saved through the command path.'});
    const pid = made.document.id; let revision = made.revision;
    for (let i = 1; i <= 52; i++) revision = (await call('/api/commands?project=' + encodeURIComponent(pid) + '&response=sections', {revision, command: {type: 'interfaces.data', payload: {title: 'Scale data ' + String(i).padStart(3, '0'), purpose: 'Payload ' + i + '.', classification: 'Internal'}}})).revision;
    const at = '&project=' + encodeURIComponent(pid), rows = () => count('.nt-records tbody tr[data-nt-row]');
    await page.goto(base + '/?chapter=8&tab=model&model=table' + at, {waitUntil: 'networkidle'}); await page.waitForSelector('.nt-records tbody tr', {timeout: 15000});
    assert.equal(await rows(), 50, 'a 66-record table (14 chapter records plus 52 saved data definitions) draws its first 50 rows');
    assert.match(await page.$eval('.nt-sheet-status', e => e.textContent), /^66 of 66 records · first 50 shown$/);
    assert.match(await page.$eval('.nt-tmore', e => e.textContent), /Show more\s*50 of 66 shown · 16 more/);
    await click('[data-nt="tmore"]');
    assert.equal(await rows(), 66, 'Show more draws the rest'); assert.equal(await page.$('[data-nt="tmore"]'), null, 'and leaves when nothing is left');
    assert.equal(await page.evaluate(() => document.activeElement?.closest('tr')?.rowIndex), 51, 'the keyboard lands on the first new row');
    await page.fill('[data-nt-field="tfilter"]', 'scale data'); await page.waitForTimeout(400);
    assert.equal(await rows(), 50, 'a new filter starts again at one page'); assert.match(await page.$eval('.nt-sheet-status', e => e.textContent), /^52 of 66 records · first 50 shown · filtered$/);
    await page.goto(base + '/?chapter=8&tab=model&model=table&object=dat-056' + at, {waitUntil: 'networkidle'}); await page.waitForSelector('.nt-records tbody tr', {timeout: 15000}); await page.waitForTimeout(300);
    assert.ok(await page.$('.nt-records tbody tr.sel[data-nt-row="dat-056"][aria-selected="true"]'), 'a selected record beyond the first page brings its page in, marked');
    await page.goto(base + '/?chapter=8&tab=model&model=cross' + at, {waitUntil: 'networkidle'}); await page.waitForSelector('.nt-x', {timeout: 15000});
    await page.selectOption('[data-nt-field="xcols"]', 'data'); await page.waitForTimeout(500);
    assert.equal(await count('.nt-x thead th') - 1, 40, 'components × 56 data definitions draws the first 40 columns');
    assert.equal(await page.$eval('.nt-x-cap', e => e.textContent), 'showing the first 5 rows × 40 columns · filter to narrow', 'and says so');
    await page.fill('[data-nt-field="xcfilter"]', 'data 00'); await page.waitForTimeout(500);
    assert.equal(await count('.nt-x thead th') - 1, 9, 'the columns’ filter narrows it'); assert.equal(await page.$('.nt-x-cap'), null, 'and the note leaves');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.ntField), 'xcfilter', 'keeping the keyboard in the filter');
    await page.selectOption('[data-nt-field="xcols"]', 'contract'); await page.waitForTimeout(300);
    pass('scale: a 66-record Chapter 8 table (52 data definitions saved through /api/commands) draws 50 rows with “Show more”, which draws the rest and moves the keyboard to the first new row; a new filter starts at one page; a selection beyond the page brings it in; components × 56 data definitions draws 40 columns with “showing the first 5 rows × 40 columns · filter to narrow” until the columns’ filter narrows it');
  }

  // 3. Chapter 5: the tools and the status live in the footer, off the canvas; the companion says what it does.
  await open(5);
  assert.ok(await page.$('.cm-walk .cm-tools .cm-key') && await page.$('.cm-walk .cm-tools .cm-zoom'), 'key and zoom sit in the footer');
  assert.equal(await count('.cm-stage .cm-key, .cm-stage .cm-zoom'), 0, 'and nothing of them over the canvas');
  const st = await page.$eval('.cm-walk .cm-state', e => ({text: e.textContent, clipped: e.scrollHeight > e.clientHeight + 2}));
  assert.match(st.text, /5 components in 3 modules/); assert.equal(st.clipped, false, 'the status is not truncated');
  // The model fills the space the current chapter header leaves; its toolbar is the
  // title row and the views' row; its companion is the frame's own column, so there is no toggle to show or hide it.
  const stage = await rect('.cm-stage'), topBar = await rect('.cm-top'), model = await rect('.cm'), column = await rect('.studio > .stage');
  // Untouched round26 is 556 px within a 558 px column at this viewport; the old 560 px floor predates that header.
  assert.ok(model.h >= column.h - 4 && model.h <= column.h + 1, 'the model fills the available stage column within its borders: ' + Math.round(model.h) + ' / ' + Math.round(column.h));
  assert.ok(stage.h >= 360, 'the canvas has room: ' + Math.round(stage.h)); assert.ok(topBar.h <= 92, 'the title row and the views’ row: ' + Math.round(topBar.h));
  assert.ok((await rect('.cm-title')).h <= 30, 'the title is one line');
  assert.equal(await page.$eval('[data-rz="panel"]', e => e.hidden), true, 'in the frame the companion is a column, not a panel to toggle');
  assert.ok(await page.$('#inspector > .cm-companion.rz section') && !(await page.$eval('.cm.rz .cm-panel', e => e.childElementCount)), 'the companion renders in the frame’s companion column, not inside the model');
  pass('Chapter 5: the key and zoom are in the footer, never over the canvas; the status line is whole; the model fills the available stage column and the canvas keeps at least 360 px; the companion is the frame’s own column');

  // 4. The key opens above the footer, complete, and closes.
  await click('[data-rz="key"]');
  const legend = await page.$eval('.cm-legend', e => ({text: e.innerText, r: e.getBoundingClientRect()}));
  assert.ok(legend.r.height > 100 && legend.r.bottom <= (await rect('.cm-walk')).y + 2 && legend.r.top >= 0, 'the key opens above the footer, inside the window');
  for (const k of ['Data dependency', 'Proposed component, not saved', 'candidates still open', 'Contract with the outside', 'Interaction without a failure policy']) assert.ok(legend.text.includes(k), 'the key explains: ' + k);
  await click('[data-rz="key"]');
  assert.equal(await page.$eval('.cm-legend', e => getComputedStyle(e).display), 'none');
  pass('the key opens above the footer, explains every mark the Chapter 5 model draws, and closes');

  // 5. Everything selectable is reachable with the keyboard, and every selection reaches the address.
  assert.ok(await count('button.cm-chip.rz-r') >= 5 && await count('button.cm-chip.cm-d') >= 1 && await count('button.cm-chip.rz-n') >= 5, 'chips are buttons');
  await page.focus('.rz-card[data-card="risk-engine"] button.cm-chip.rz-r'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  assert.match(await page.$eval(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) .cm-spec', e => e.textContent), /Responsibility · Chapter 4[\s\S]*Risk screening/);
  assert.equal(await objectParam(), 'risk', 'the chip’s selection is in the address');
  await page.focus('.rz-card[data-card="risk-engine"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  assert.equal(await objectParam(), 'risk-engine', 'Enter on a card selects it');
  assert.equal(await page.$eval('.rz-card[data-card="risk-engine"]', e => e.getAttribute('role')), 'group');
  assert.match(await page.$eval('.rz-card[data-card="risk-engine"]', e => e.getAttribute('aria-label')), /Selected; press Enter to focus on it/);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.card), 'risk-engine', 'the redraw keeps the keyboard on the card');
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  assert.match(await crumbs(), /› Risk engine$/, 'Enter on the selected card focuses on it');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // A selection made by the page, not by a click, reaches the address too.
  await open(5, '&object=core-adapter');
  assert.equal(await objectParam(), 'core-adapter'); assert.ok(await page.$('.rz-card.sel[data-card="core-adapter"]'));
  // A click on the canvas background (not on a card, a chip, an edge nudge, the heads or the rail) deselects.
  const bg = await page.evaluate(() => { const s = document.querySelector('.cm-stage').getBoundingClientRect(); for (let y = 40; y < s.height - 40; y += 24) for (let x = 40; x < s.width - 40; x += 24) { const el = document.elementFromPoint(s.x + x, s.y + y); if (el && el.closest('.cm-stage') && !el.closest('[data-card],[data-sel],[data-link],.cm-edge,.cm-heads,.cm-rail,.cm-minimap,.nt-seltools,button,a,.nt-node')) return {x, y}; } return null; });
  assert.ok(bg, 'the canvas has a background spot to click');
  await page.click('.cm-stage', {position: bg}); await page.waitForTimeout(450);
  assert.equal(await objectParam(), null, 'deselecting clears it');
  pass('chips are buttons: Enter on a responsibility chip selects it, Enter on a card selects then focuses on it, cards are groups that say what Enter does, and every selection is in the address');

  // 6. Sol, not connected, stands last in the companion and says so; a selection has Sol's own section.
  // Round 7: in the shell's companion Sol's parts sit under one folded section (details.cp-sol), itself last.
  const sol = await page.$eval(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion)', p => { const lite = p.querySelector(':scope > .cs-round.lite[data-sol-unconnected], :scope > details.cp-sol .cs-round.lite[data-sol-unconnected]'), tops = [...p.children].map(c => c.getBoundingClientRect().top); const holder = lite && [...p.children].find(c => c.contains(lite)); return lite ? {text: lite.textContent, last: holder.getBoundingClientRect().top >= Math.max(...tops), ins: !!p.querySelector('.cm-ins')} : null; });
  assert.ok(sol, 'Sol’s round is present while nothing is selected'); assert.match(sol.text, /Sol is not connected in this workspace/); assert.equal(sol.last, true, 'and it stands last'); assert.equal(sol.ins, true, 'after what the model shows');
  await click('.rz-card[data-card="risk-engine"] .rz-t');
  assert.ok(await page.$(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) [data-sol-explain], :is(.cm:not(.cm-docked) .cm-panel,.cm-companion) [data-sol-drawn], :is(.cm:not(.cm-docked) .cm-panel,.cm-companion) .dk-solask, :is(.cm:not(.cm-docked) .cm-panel,.cm-companion) .dk-solagain'), 'with a selection, Sol’s section is about the selection');
  assert.equal(await page.$(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) .cs-round'), null, 'and the round steps aside');
  pass('with no AI key, Sol’s round says it is not connected and stands last in the companion, after what the model shows; a selection has Sol’s own section instead');

  // 7. The edges say where more of the model is, and move there.
  for (let i = 0; i < 5; i++) await click('[data-rz="zin"]');
  const more = await page.$eval('.cm-stage', e => [...e.classList].filter(c => c.startsWith('cm-more-')));
  assert.ok(more.length >= 1, 'zoomed in, an edge says there is more: ' + more.join(','));
  const edge = more[0].replace('cm-more-', '');
  assert.notEqual(await page.$eval('.cm-edge-' + edge, e => getComputedStyle(e).display), 'none');
  const before = await page.$eval('.cm-world', e => e.style.transform);
  await click('.cm-edge-' + edge);
  assert.notEqual(await page.$eval('.cm-world', e => e.style.transform), before, 'the edge moves the camera');
  await click('[data-rz="fit"]');
  pass('zoomed in, the stage’s edges show where more of the model lies, and one click moves there');

  // 8. Chapter 4: chips, groups, the key, and flows on one label.
  await open(4);
  assert.equal(await count('.lr-card.resp button.cm-chip.lr-c'), 5, 'the components a responsibility is realised by are buttons');
  assert.ok(await count('.lr-card.resp[role="group"]') >= 5);
  await page.focus('button.cm-chip.lr-c'); const want = await page.$eval('button.cm-chip.lr-c', e => e.dataset.sel); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  assert.equal(await objectParam(), want, 'a component chip selects the component');
  assert.ok(await page.$(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) .cm-spec'));
  await click('[data-lr="key"]');
  const lk = await page.$eval('.cm-legend', e => e.innerText);
  for (const k of ['Steps nobody owns', 'Proposed, not saved', 'Changed by the open proposal', 'Realises it (Chapter 5)', 'Requirement and decision behind it']) assert.ok(lk.includes(k), 'the Chapter 4 key explains: ' + k);
  await click('[data-lr="key"]');
  assert.match(await page.$eval('.cm-walk .cm-state', e => e.textContent), /5 responsibilities in 3 groups/);
  pass('Chapter 4: component chips are buttons that select with Enter, cards are groups, the key explains unowned steps, proposals and changes, and the status line stands in the footer');

  // 9. Chapter 7: a family opens on its heading, and the options share the width.
  await open(7);
  const fam = await page.$eval('button.sk-mg[data-sk="family"]', e => e.textContent.trim());
  await click('button.sk-mg[data-sk="family"]');
  const here = await page.$eval('.cm-crumbs .here', e => e.textContent.trim());
  assert.ok(here && here !== 'Whole stack' && fam.startsWith(here), 'the family heading opens the family: ' + here + ' / ' + fam);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await click('.cm-rail .sk-rec[data-sel]');
  await click('[data-sk="view"][data-id="options"]');
  const oh = await rect('.sk-oh');
  assert.ok(oh.w > 196, 'the option columns widen to the stage: ' + Math.round(oh.w));
  assert.equal(await count('.cm-stage .cm-key'), 0);
  pass('Chapter 7: a family opens from its heading, and the options matrix widens its columns to the stage it has');

  // 10. Chapter 6: the key follows the lens and the failure explored.
  await open(6);
  await click('[data-pf="key"]');
  let pk = await page.$eval('.cm-legend', e => e.innerText);
  assert.ok(pk.includes('Nothing recorded supports these needs') && pk.includes('tinted by its family'), 'the platform key');
  await click('[data-pf="lens"][data-id="operation"]');
  pk = await page.$eval('.cm-legend', e => e.innerText);
  assert.ok(pk.includes('Single path') && pk.includes('Redundant'), 'the Operation lens explains its plates');
  await click('.pf-fail[data-id="gateway"]'); await page.waitForTimeout(300);
  const priorChapter6Selection = await objectParam();
  assert.equal(priorChapter6Selection, 'gateway', 'the failure lab selects recorded capability TC-005');
  pk = await page.$eval('.cm-legend', e => e.innerText);
  assert.ok(pk.includes('Lost: the failure reaches it') && pk.includes('Stops: an essential need is lost'), 'what fails together is in the key');
  pass('Chapter 6: the key explains the plates of the lens in use and, while a failure is explored, what lost, degraded and stopped look like');

  // 11. Chapter 8: the Data flow's key is complete, short labels carry the reference, data rows are buttons; the retired
  //     Sequence view's deep link opens the Diagram's Sequence picture and says so, and a selected message reads what its
  //     contract promises (round 11, A).
  await open(8);
  await click('[data-ex="key"]');
  const ek = await page.$eval('.cm-legend', e => e.innerText);
  assert.ok(ek.includes('Authority') && ek.includes('Travels on a contract with gaps') && ek.includes('Sent by a part no recorded contract brings it to'), 'the data flow key: ' + ek.slice(0, 120));
  await click('[data-ex="key"]');
  // The rule reads the movement's span (the label's max-width), not the rendered width of a short name: under 110 px the
  // label is the reference alone; from 110 px it carries the contract's name too. (Until round 11 this check ran on the
  // Sequence view, where no movement is drawn, and so measured nothing.)
  const spans = await page.$$eval('.cm-mvl', ls => ls.map(l => [parseFloat(l.style.maxWidth), l.querySelector('.cm-op').textContent]).filter(([w]) => w >= 36));
  const short = spans.filter(([w]) => w < 110).map(([, t]) => t), long = spans.filter(([w]) => w >= 110).map(([, t]) => t);
  assert.ok(short.length && short.every(t => /^[A-Z]+-\d+$/.test(t)), 'a short movement carries the reference only: ' + JSON.stringify(short.slice(0, 4)));
  assert.ok(long.length && long.every(t => /^[A-Z]+-\d+ \S/.test(t)), 'a longer one carries the name too: ' + JSON.stringify(long.slice(0, 4)));
  assert.ok(await count('button.cm-drow') >= 1, 'data rows are buttons');
  await page.goto(base + '/?chapter=8&tab=model&model=sequence', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm-svg .nt-lifeline', {state: 'attached', timeout: 15000}); await page.waitForTimeout(400);
  assert.equal(await page.$eval('.cm-view[aria-pressed="true"]', e => e.dataset.id), 'diagram', 'model=sequence opens the Diagram');
  assert.equal(await page.$eval('[data-nt-field="scene"]', e => e.value), 'sequence', 'on its Sequence picture');
  assert.match(await page.$eval('#yah-text', e => e.textContent), /Sequence · The Sequence view is retired: the Diagram’s Sequence picture draws the messages/, 'and "You are here" says so');
  await page.$eval('.cm-svg .nt-hit', e => e.dispatchEvent(new MouseEvent('click', {bubbles: true}))); await page.waitForTimeout(500);
  const promises = await page.$eval('#inspector .cm-companion .cm-promises', e => e.innerText);
  assert.match(promises, /What the contract promises[\s\S]*IF-\d+[\s\S]*Retry[\s\S]*Failure[\s\S]*Correlation/i, 'the selected message reads its contract’s policies: ' + promises.slice(0, 80));
  assert.ok(await page.$('#inspector .cm-companion .cm-promises [data-i-action="edit-contract"]'), 'with its editor one click away');
  await click('.cm-view[data-id="data"]');
  assert.doesNotMatch(await page.$eval('#yah-text', e => e.textContent), /retired/, 'a view chosen by hand ends the note');
  pass('Chapter 8: the Data flow key explains authority, gaps and unsourced data, short movements show the contract’s reference, data rows are buttons; model=sequence opens the Diagram on its Sequence picture and "You are here" says the view is retired; a selected message reads what its contract promises, with Edit contract');

  // 12. On a narrower window the frame stacks as on the other tabs: the companion column follows the stage, and
  // the views and actions keep their words (round 3, B and D).
  const mid = await browser.newContext({viewport: {width: 1100, height: 800}});
  const pm = await mid.newPage(); pm.on('pageerror', e => errors.push(e.message));
  await pm.goto(base + '/?chapter=5&tab=model&model=components', {waitUntil: 'networkidle'}); await pm.waitForSelector('.cm .rz-card'); await pm.waitForTimeout(400);
  // Since rc38 the shell's Details column is a panel over the stage's right edge on a window under 1180 px (studio-system.css),
  // opened by a selection or the Details control, the same on Work and Model; the stage keeps its width under it.
  assert.ok(await pm.$eval('.cm-view span', e => e.offsetWidth > 1), 'the view labels stay readable at 1100 px');
  assert.ok(await pm.$$eval('.cm-actions .cm-btn:not([hidden]) span', es => es.every(e => e.offsetWidth > 1)), 'and the actions keep their words');
  await pm.click('.rz-card[data-card="risk-engine"] .rz-t'); await pm.waitForTimeout(400);
  // rc41 close (strip C4): one rule opens the column by itself, the default's and a selection's alike — only where it is a
  // column (≥ 1180 px); at 1100 px it would be a sheet over the picture just touched, so the selection leaves it closed
  // and the Details control opens it, as a viewer does.
  assert.deepEqual(await pm.evaluate(() => [document.body.dataset.panel, document.querySelector('.studio > #inspector')?.getAttribute('aria-hidden')]), ['collapsed', 'true'], 'at 1100 px a selection does not lay the Details sheet over the picture');
  await pm.click('.workspace-tools [data-panel-toggle]'); await pm.waitForTimeout(400);
  const stack = await pm.evaluate(() => { const s = document.querySelector('.studio > .stage').getBoundingClientRect(), c = document.querySelector('.studio > #inspector').getBoundingClientRect(); return {open: document.body.dataset.panel === 'open', fixed: getComputedStyle(document.querySelector('.studio > #inspector')).position, width: Math.round(c.width), inside: c.right <= innerWidth && c.left >= 0 && c.top >= 0 && c.bottom <= innerHeight, overStage: c.left < s.right && c.left > s.left, stage: Math.round(s.width)}; });
  assert.ok(stack.open && stack.fixed === 'fixed' && stack.width > 0 && stack.width <= 360 && stack.inside && stack.overStage && stack.stage >= 700, 'at 1100 px the Details control opens the panel over the stage’s right edge, at most 360 px wide, inside the window, the stage keeping its width: ' + JSON.stringify(stack));
  assert.match(await pm.$eval('#inspector .cm-companion .cm-spec', e => e.textContent), /Risk engine/, 'a selection reads in the companion panel');
  await pm.keyboard.press('Escape'); await pm.waitForTimeout(300);
  assert.notEqual(await pm.evaluate(() => document.body.dataset.panel), 'open', 'Escape closes the panel');
  await mid.close();
  pass('on a 1100 px window the views and actions keep their words, a selection leaves the Details sheet closed, the Details control opens it over the stage’s right edge (inside the window, the stage keeping its width) where the selection reads, and Escape closes it');

  // 13. On a phone the fit keeps the cards legible, the view rail scrolls in one row, and the canvas starts sooner.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const pp = await phone.newPage(); pp.on('pageerror', e => errors.push(e.message));
  await pp.goto(base + '/?chapter=5&tab=model&model=components', {waitUntil: 'networkidle'}); await pp.waitForSelector('.cm .rz-card'); await pp.waitForTimeout(400);
  if (await pp.$('#ux-coach [data-coach="close"]')) await pp.click('#ux-coach [data-coach="close"]');
  assert.equal(await pp.$('.cm.rz.cm-far'), null, 'the phone fit does not hide the lens lines');
  assert.equal(await pp.$eval('.rz-card.component .rz-lens', e => getComputedStyle(e).visibility), 'visible');
  assert.ok(await pp.$('.cm-walk .cm-tools .cm-zoom'), 'the tools are in the footer on a phone too');
  assert.equal(await pp.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal page scroll');
  const sw = await pp.evaluate(() => { const v = document.querySelector('.cm-views'), bs = [...v.querySelectorAll('.cm-view:not([hidden])')]; return {scrollable: v.scrollWidth > v.clientWidth, rows: new Set(bs.map(b => Math.round(b.getBoundingClientRect().top))).size, words: bs.every(b => b.querySelector('span')?.offsetWidth > 1), canvasTop: Math.round(document.querySelector('.cm-stage').getBoundingClientRect().top), viewportHeight: innerHeight}; });
  // Untouched round26 and this refinement both place the phone canvas at 672 px, leaving 172 px visible.
  // Assert useful visible canvas rather than the pre-round26 670 px header-coordinate ceiling.
  assert.ok(sw.scrollable && sw.rows === 1 && sw.words && sw.viewportHeight - sw.canvasTop >= 170, 'the switcher scrolls on one row, keeps every word, and leaves canvas in the first screen: ' + JSON.stringify(sw));
  // The phone frame (rc39, W2 step 1), measured: the canvas keeps at least 320 px on the chapter's own view, the Diagram
  // and the Layers view (it was 0–14 px); the footer is one row of at most 52 px (it was 219 px) with the key, zoom,
  // labels and export behind one Tools control; the Diagram's command bar holds its five menus on one row; opening the
  // tools grows the footer below the canvas, which keeps its height; the page never scrolls sideways.
  const phoneFrame = () => pp.evaluate(() => {
    const r = s => document.querySelector(s)?.getBoundingClientRect(), stage = r('.cm-stage'), foot = r('.cm-walk'), tools = document.querySelector('.cm-walk .cm-tools'), toggle = document.querySelector('.cm-walk [data-cm-tools-toggle]');
    // One row: every visible part of the footer stands within one control's height (its parts are centred, so their tops differ).
    const rows = el => { const rs = [...el.querySelectorAll(':scope > *')].filter(e => e.getClientRects().length).map(e => e.getBoundingClientRect()); return rs.length ? (Math.max(...rs.map(r => r.bottom)) - Math.min(...rs.map(r => r.top)) <= 44 ? 1 : 2) : 0; };
    const menus = [...document.querySelectorAll('.cm-bar .nt-menu > .cm-btn')];
    return {stage: Math.round(stage?.height || 0), foot: Math.round(foot?.height || 0), footRows: rows(document.querySelector('.cm-walk')), toolsShown: !!tools && tools.getClientRects().length > 0, toggle: !!toggle && toggle.getClientRects().length > 0, menuRows: menus.length ? new Set(menus.map(b => Math.round(b.getBoundingClientRect().top))).size : 0, menus: menus.length, sideways: document.documentElement.scrollWidth > innerWidth, frame: Math.round(r('.cm')?.height || 0)};
  });
  const phoneMeasured = [];
  for (const view of ['components', 'diagram', 'layers']) {
    await pp.locator(`.cm-view[data-id="${view}"]`).click(); await pp.waitForTimeout(view === 'components' ? 300 : 900);
    const m = await phoneFrame(); phoneMeasured.push(`${view}: canvas ${m.stage} px, footer ${m.foot} px${m.menus ? ', ' + m.menus + ' menus on ' + m.menuRows + ' row' : ''}`);
    assert.ok(m.stage >= 320, `${view}: the phone canvas keeps at least 320 px: ${m.stage}`);
    assert.ok(m.foot <= 52 && m.footRows === 1, `${view}: the footer folds to one row: ${m.foot} px, ${m.footRows} rows`);
    assert.equal(m.toolsShown, false, `${view}: the key and zoom stand behind the Tools control`); assert.ok(m.toggle, `${view}: the Tools control is in the footer`);
    assert.equal(m.sideways, false, `${view}: no horizontal page scroll`);
    if (view !== 'components') assert.ok(m.menus >= 5 && m.menuRows === 1, `${view}: the command bar's menus stand on one row: ${m.menus} on ${m.menuRows}`);
  }
  // rc41 close: the Model's state line stands in the shell footer beside the Next task; on a phone that footer already
  // takes two rows (the Next task across the width, then the guidance line), so the line is hidden there, attached once,
  // and the same line (the chapter's records state) stands in Validate's head (checked below).
  const phoneState = () => pp.evaluate(() => { const all = [...document.querySelectorAll('.chapter-state')], e = all[0]; return {count: all.length, inFooter: !!e && e.parentElement === document.querySelector('#workspace > footer.footer'), shown: !!e && e.checkVisibility({visibilityProperty: true}), text: e?.textContent || ''}; });
  const modelState = await phoneState();
  assert.ok(modelState.count === 1 && modelState.inFooter && !modelState.shown && modelState.text, 'on a phone the Model\'s state line is in the shell footer, once, hidden: ' + JSON.stringify(modelState));
  await pp.locator('.cm-walk [data-cm-tools-toggle]').click(); await pp.waitForTimeout(250);
  {
    const m = await phoneFrame(), key = await pp.evaluate(() => { const k = document.querySelector('.cm-walk .cm-tools .cm-kt'), z = document.querySelector('.cm-walk .cm-tools .cm-zoom-value'); return !!k?.getClientRects().length && !!z?.getClientRects().length; });
    assert.ok(m.toolsShown && key, 'Tools opens the key and the zoom readout in the footer');
    assert.ok(m.stage >= 320 && !m.sideways, 'and the canvas keeps its 320 px: ' + m.stage);
    assert.equal(await pp.$eval('.cm-walk [data-cm-tools-toggle]', b => b.getAttribute('aria-expanded') + ' ' + b.textContent.trim()), 'true Hide tools', 'the control says it is open');
  }
  await pp.locator('.cm-walk [data-cm-tools-toggle]').click(); await pp.waitForTimeout(250);
  assert.equal((await phoneFrame()).toolsShown, false, 'and closes the tools again');
  await pp.locator('.cm-view[data-id="whole"]').click();
  assert.ok(await pp.evaluate(() => { const v = document.querySelector('.cm-views'), b = v.querySelector('.cm-view[aria-pressed="true"]'); const r = b.getBoundingClientRect(), f = v.getBoundingClientRect(); return r.left >= f.left && r.right <= f.right - 20; }), 'a later view is visible when selected');
  await pp.locator('.cm-view[data-id="components"]').click();
  assert.ok(await pp.$eval('[data-rz="expand"]', e => getComputedStyle(e, '::after').content.includes('Expand')), 'Expand says so on a phone, not by an icon alone');
  // rc38's shell: on a phone the companion is the Details sheet, the same on the Model tab as on Work — hidden until a
  // selection or the control asks for it, then fixed over the page inside the window, after the stage in reading
  // order; measured on both tabs and compared.
  const sheet = () => pp.evaluate(() => { const st = document.querySelector('.studio > .stage'), c = document.querySelector('.studio > #inspector'), r = c.getBoundingClientRect(), cs = getComputedStyle(c); return {panel: document.body.dataset.panel, shown: cs.display !== 'none' && r.height > 0, position: cs.position, top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), afterStage: !!(st.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING)}; });
  const openSheet = async () => { await pp.evaluate(() => { if (document.body.dataset.panel !== 'open') document.querySelector('[data-panel-toggle]')?.click(); }); await pp.waitForTimeout(400); return sheet(); };
  const modelClosed = await sheet(); assert.ok(modelClosed.panel !== 'open' && !modelClosed.shown && modelClosed.afterStage, 'on the Model tab the companion waits, hidden, after the stage until it is asked for: ' + JSON.stringify(modelClosed));
  const modelOpen = await openSheet(); assert.ok(modelOpen.panel === 'open' && modelOpen.shown && modelOpen.position === 'fixed' && modelOpen.top >= 0 && modelOpen.bottom <= 844 && modelOpen.width <= 390 && modelOpen.afterStage, 'asked for, it is a sheet inside the window: ' + JSON.stringify(modelOpen));
  await pp.goto(base + '/?chapter=5&tab=work', {waitUntil: 'networkidle'}); await pp.waitForTimeout(600);
  const workClosed = await sheet(); assert.ok(workClosed.panel !== 'open' && !workClosed.shown && workClosed.afterStage, 'the object details on Work wait the same way: ' + JSON.stringify(workClosed));
  const workOpen = await openSheet(); assert.deepEqual({shown: workOpen.shown, position: workOpen.position, top: workOpen.top, bottom: workOpen.bottom, width: workOpen.width, afterStage: workOpen.afterStage}, {shown: modelOpen.shown, position: modelOpen.position, top: modelOpen.top, bottom: modelOpen.bottom, width: modelOpen.width, afterStage: modelOpen.afterStage}, 'and open to the same sheet as the model’s companion');
  await pp.goto(base + '/?chapter=5&tab=validate', {waitUntil: 'networkidle'}); await pp.waitForSelector('.validation-header .chapter-state'); await pp.waitForTimeout(300);
  const validateState = await pp.evaluate(() => { const all = [...document.querySelectorAll('.chapter-state')], e = document.querySelector('.validation-header .chapter-state'); return {count: all.length, shown: !!e?.checkVisibility({visibilityProperty: true}), text: e?.textContent || '', footer: document.querySelectorAll('#workspace > footer.footer .chapter-state').length, sideways: document.documentElement.scrollWidth > innerWidth}; });
  assert.deepEqual(validateState, {count: 1, shown: true, text: modelState.text, footer: 0, sideways: false}, 'on a phone the same state line stands in Validate\'s head, once, none in the footer');
  await phone.close();
  pass('on a 390 px phone the cards keep their lens lines, the tools are in the footer behind one Tools control, the canvas keeps at least 320 px and the footer one row on Components, the Diagram and Layers (' + phoneMeasured.join('; ') + '), the page does not scroll sideways, the view rail scrolls on one row and reveals the selected view, the canvas starts in the first screen, Expand says its name, the companion is the shell’s Details sheet, hidden until asked for and then the same sheet inside the window as the object details on Work, and the chapter’s state line is hidden in the two-row shell footer and read in Validate’s head');

  // 15. Round 5 (R5-B): the trace path, the checks on the Table and the Matrix, the readings in two lines, an alternative
  // drawn over the saved design, and the record picture on Work.
  {
    const ref = referenceProject(), rc = await browser.newContext({viewport: {width: 1440, height: 900}}), rp = await rc.newPage();
    rp.on('pageerror', e => errors.push(e.message));
    const go = async (url, sel) => { await rp.goto(base + url, {waitUntil: 'networkidle'}); await rp.waitForSelector(sel, {timeout: 15000}); await rp.waitForTimeout(400); };
    const traced = () => rp.evaluate(() => ({traced: [...document.querySelectorAll('.cm-svg .nt-node.nt-mk-traced')].map(n => n.dataset.ntNode).sort(), dimmed: document.querySelectorAll('.cm-svg .nt-node.nt-mk-dimmed').length, nodes: document.querySelectorAll('.cm-svg .nt-node').length, lit: document.querySelectorAll('.cm-svg .nt-edge.nt-mk-lit').length, reading: (() => { const e = document.querySelector('.cm-companion .nt-trace-read'); return e ? (e.closest('details.cp') || e).innerText : ''; })()}));
    // The trace from REQ-001, from the toolbar, in the Layers view: its chain lights, the rest dims, the companion reads it.
    await go('/?chapter=4&tab=model&model=layers', '.cm .cm-svg .nt-node');
    const groupedNodes = await rp.$$eval('.cm-svg .nt-node', ns => ns.length);
    // rc38 names the grouped overview "Architecture concerns" and counts its records and relationships.
    assert.match(await rp.$eval('.nt-fold-note', e => e.innerText), /^Architecture concerns\n\d+ records, \d+ relationships · open a type group or reveal more connections/, 'dense Layers begins as a named grouped overview with its counts');
    await rp.click('[data-nt="menu"][data-id="trace"]'); await rp.waitForTimeout(250);
    await rp.selectOption('.nt-pop [data-nt-field="trace"]', 'REQ-001'); await rp.waitForTimeout(600);
    const T = traceFrom(ref, 'REQ-001'), drawn = await rp.$$eval('.cm-svg .nt-node', ns => ns.map(n => n.dataset.ntNode));
    assert.ok(drawn.length > groupedNodes && drawn.every(id => !id.startsWith('fold:')), 'the trace opens every source element instead of losing marks on aggregates');
    assert.match(await rp.$eval('.nt-fold-note', e => e.innerText), /Trace · exact records drawn[\s\S]*Clear trace · return to overview/i, 'the stage explains why every record is shown and how to return');
    let t = await traced();
    assert.deepEqual(t.traced, drawn.filter(id => T.ids.has(id)).sort(), 'the Layers view lights exactly the chain’s records it draws');
    assert.equal(t.dimmed, t.nodes - t.traced.length, 'and dims every other element'); assert.ok(t.lit >= t.traced.length - 1, 'the relationships along the chain are lit: ' + t.lit);
    // rc41 close (C6): and drawn — a lit relationship is never one the level's budget keeps back: shown, a Tab stop, counted
    // in the caption (was: lit in its classes but display:none, its hit tabindex −1).
    const drawnLit = await rp.evaluate(() => { const lit = [...document.querySelectorAll('.cm-svg .nt-edge.nt-mk-lit')], hitOf = id => [...document.querySelectorAll('.cm-svg .nt-hit')].find(h => h.dataset.ntEdge === id); return {lit: lit.length, shown: lit.filter(e => getComputedStyle(e).display !== 'none').length, stops: lit.filter(e => hitOf(e.dataset.ntEdge)?.getAttribute('tabindex') === '0').length, drawn: [...document.querySelectorAll('.cm-svg .nt-edge[data-nt-edge]')].filter(e => getComputedStyle(e).display !== 'none').length, caption: document.querySelector('.nt-connection-caption')?.textContent || ''}; });
    assert.ok(drawnLit.lit === t.lit && drawnLit.shown === drawnLit.lit && drawnLit.stops === drawnLit.lit && drawnLit.caption.startsWith(drawnLit.drawn + ' of '), 'every lit relationship of the chain is drawn and a Tab stop, the caption counting what is drawn: ' + JSON.stringify(drawnLit));
    // Round 10 (N6): a line drawn for several relationships is traced when any relationship on it is, and dimmed only when
    // every one is; the lift draws exactly the traced relationships whole. (The count above reads g.nt-edge only.)
    const runs = await rp.evaluate(() => {
      const lit = new Set([...document.querySelectorAll('.cm-svg .nt-edge.nt-mk-lit')].map(e => e.dataset.ntEdge)), dim = new Set([...document.querySelectorAll('.cm-svg .nt-edge.nt-mk-dim')].map(e => e.dataset.ntEdge));
      return {runs: [...document.querySelectorAll('.cm-svg .nt-trunk')].map(t => { const m = JSON.parse(t.dataset.ntMembers); return {lit: t.classList.contains('nt-mk-lit'), dim: t.classList.contains('nt-mk-dim'), anyLit: m.some(id => lit.has(id)), allDim: m.every(id => dim.has(id))}; }), lifted: [...document.querySelectorAll('.cm-svg .nt-lift path.nt-mk-lit')].map(p => p.dataset.ntLift).sort(), litEdges: [...lit].sort()};
    });
    assert.ok(runs.runs.length > 0 && runs.runs.some(x => x.lit), 'the trace travels lines drawn together in the Layers view: ' + runs.runs.filter(x => x.lit).length + ' of ' + runs.runs.length + ' runs');
    assert.ok(runs.runs.every(x => x.lit === x.anyLit && x.dim === (!x.anyLit && x.allDim)), 'a run is traced when a relationship on it is, dimmed only when every one is');
    assert.deepEqual(runs.lifted, runs.litEdges, 'the lift draws every traced relationship whole, and only those');
    assert.match(t.reading, /Trace · from REQ-001/i, 'the companion names the trace');
    assert.ok(t.reading.includes(T.chain), 'and reads its chain: ' + T.chain);
    assert.match(await rp.$eval('.cm-legend', e => e.innerText), /On the trace from REQ-001\s*×\d+[\s\S]*Off the trace, dimmed\s*×\d+/, 'the Key explains the trace');
    assert.match(await rp.$eval('[data-nt="menu"][data-id="trace"]', e => e.textContent), /Trace · REQ-001/, 'the toolbar says what is traced');
    // rc41 close (C6 fix-up): the build-up along the trace keeps the chain drawn at every one of its steps, to the last; it
    // lights the chain a step at a time over the same lines (was: from its first step the level's budget took back all but
    // 5 of the 28).
    await rp.click('[data-nt="menu"][data-id="build"]'); await rp.waitForTimeout(250);
    await rp.click('.nt-pop [data-nt="build"][data-id="trace"]'); await rp.waitForTimeout(500);
    const along = [];
    for (let i = 0; i < 40; i++) {
      along.push(await rp.evaluate(ids => { const es = [...document.querySelectorAll('.cm-svg .nt-edge[data-nt-edge]')].filter(e => ids.includes(e.dataset.ntFrom) && ids.includes(e.dataset.ntTo)); return {chain: es.length, shown: es.filter(e => getComputedStyle(e).display !== 'none').length, line: document.querySelector('.nt-build-line .nt-build-text')?.textContent || ''}; }, [...T.ids]));
      if (await rp.$eval('.nt-build-ctl [data-nt="build-next"]', b => b.disabled)) break;
      await rp.click('.nt-build-ctl [data-nt="build-next"]'); await rp.waitForTimeout(300);
    }
    assert.ok(along.length >= 4 && along.every(c => c.chain === t.lit && c.shown === c.chain) && along.at(-1).line.includes(`Step ${along.length} of ${along.length}`), 'the build-up along the trace keeps every relationship of the chain drawn at each of its steps: ' + JSON.stringify({steps: along.map(c => c.shown + '/' + c.chain), last: along.at(-1)?.line}));
    await rp.click('.nt-build-ctl [data-nt="build-stop"]'); await rp.waitForTimeout(400);
    const layersTrace = t.traced.length;
    await rp.click('.nt-fold-note [data-nt="trace-clear"]'); await rp.waitForTimeout(500);
    assert.equal(await rp.$$eval('.cm-svg .nt-node', ns => ns.length), groupedNodes, 'clearing an automatically expanded trace restores the grouped Layers overview');
    await rp.click('[data-nt="menu"][data-id="trace"]'); await rp.selectOption('.nt-pop [data-nt-field="trace"]', 'REQ-001'); await rp.waitForTimeout(600);
    // The Diagram keeps it; Escape clears it and keeps the selection.
    await rp.click('.cm-view[data-id="diagram"]'); await rp.waitForTimeout(500);
    t = await traced(); assert.deepEqual(t.traced, ['api'], 'the Diagram lights LR-001, REQ-001’s responsibility'); assert.equal(t.dimmed, t.nodes - 1);
    await rp.click('.cm-svg .nt-node[data-nt-node="risk"]'); await rp.waitForTimeout(400);
    await rp.focus('.cm-stage'); await rp.keyboard.press('Escape'); await rp.waitForTimeout(400);
    t = await traced(); assert.equal(t.traced.length + t.dimmed, 0, 'Escape clears the trace'); assert.equal(t.reading, '');
    assert.equal(await rp.evaluate(() => new URL(location.href).searchParams.get('object')), 'risk', 'and only the trace: the selection stays');
    // Trace on the selected element.
    await rp.click('.cm-companion .nt-trace-act [data-nt="trace"]'); await rp.waitForTimeout(500);
    t = await traced(); assert.deepEqual(t.traced, ['risk']); assert.match(t.reading, /from LR-002[\s\S]*REQ-002 → [\s\S]*\[no control\][\s\S]*Gaps: no control/i, 'a selected element traces too, its gaps named');
    await rp.keyboard.press('Escape'); await rp.waitForTimeout(300);
    // From a Matrix cell "through the design": the trace takes the cell's own chain, and the two agree.
    await go('/?chapter=4&tab=model&model=cross', '.nt-x');
    await rp.selectOption('[data-nt-field="xrows"]', 'requirement'); await rp.waitForTimeout(300);
    await rp.selectOption('[data-nt-field="xcols"]', 'runtime'); await rp.waitForTimeout(500);
    const X = matrixModel(ref, {rows: 'requirement', cols: 'runtime'}), cell = X.cells.get('REQ-001|run-001');
    assert.equal(cell.kind, 'chain', 'REQ-001 and RUN-001 meet through the design');
    await rp.click('[data-nt-cell="REQ-001|run-001"]'); await rp.waitForTimeout(400);
    await rp.click('.nt-cellspec [data-nt="trace"]'); await rp.waitForTimeout(800);
    assert.equal(await rp.$eval('.cm', e => e.dataset.ntView), 'layers', 'the cell’s trace opens the Layers view');
    const info = await rp.evaluate(() => window.aiwModelMarks.info('trace'));
    assert.equal(info.cell, 'REQ-001|run-001'); assert.equal(info.chain, T.chain, 'the same chain as the toolbar’s trace');
    const lit = new Set((await rp.evaluate(() => window.aiwModelMarks.all().filter(m => m.state === 'traced').map(m => m.id))));
    assert.ok(['REQ-001', 'run-001', ...cell.items[0].via].every(id => lit.has(id)), 'every record of the Matrix’s chain is on the trace: they agree');
    await rp.keyboard.press('Escape'); await rp.waitForTimeout(300);
    // The Table and the Matrix carry the same check glyphs as the pictures.
    await go('/?chapter=8&tab=model&model=table', '.nt-table tbody tr');
    const want8 = Object.fromEntries(checkMarks(ref, 8).map(m => [m.id, CHECK_GLYPHS[m.state]]));
    const rows = await rp.$$eval('.nt-records tr[data-nt-row]', trs => Object.fromEntries(trs.map(tr => [tr.dataset.ntRow, tr.querySelector('.nt-mk-g')?.textContent || ''])));
    assert.deepEqual(rows, Object.fromEntries(Object.keys(rows).map(id => [id, want8[id] || ''])), 'each Table row carries its record’s check glyph');
    assert.equal(Object.values(rows).filter(Boolean).length, 11);
    await go('/?chapter=8&tab=model&model=cross', '.nt-x');
    const heads = await rp.$$eval('.nt-x th [data-nt-row]', bs => Object.fromEntries(bs.map(b => [b.dataset.ntRow, b.querySelector('.nt-mk-g')?.textContent || ''])));
    assert.deepEqual(heads, Object.fromEntries(Object.keys(heads).map(id => [id, want8[id] || ''])), 'the Matrix’s headings carry them too');
    // The readings: two lines, the rest under More (Contract G).
    for (const view of ['diagram', 'layers', 'table', 'cross']) {
      await go('/?chapter=4&tab=model&model=' + view, view === 'table' ? '.nt-table' : view === 'cross' ? '.nt-x' : '.cm .cm-svg .nt-node');
      const r = await rp.evaluate(() => { const sec = [...document.querySelectorAll('.cm-companion .nt-reading')].at(-1); const lead = sec?.querySelector('.nt-lead'); return sec && {lines: lead.children.length, height: Math.round(lead.getBoundingClientRect().height), lh: parseFloat(getComputedStyle(lead).lineHeight) || 20, more: !!sec.querySelector(':scope > details.nt-more:not([open]) > summary'), text: lead.innerText}; });
      assert.ok(r && r.lines === 2 && r.height <= r.lh * 2 + 2 && r.more, view + ': the reading is two lines with More: ' + JSON.stringify(r));
      if (view !== 'cross') assert.match(r.text, new RegExp(CHECK_GLYPHS.confirm + ' \\d+ to confirm'), view + ': its second line says what the checks say');
    }
    // An alternative previewed in the chapter: the Diagram draws it over the saved design and rings what it changes.
    await go('/?chapter=4&tab=model&model=diagram', '.cm .cm-svg .nt-node');
    await rp.evaluate(() => window.aiwEditModelProposal({type: 'logical.responsibility', payload: {id: 'api'}}));
    await rp.waitForSelector('#l-responsibility-form', {timeout: 8000});
    await rp.evaluate(() => { const f = document.querySelector('#l-responsibility-form'), t = f.querySelector('[name="title"]'); t.value = 'Payment API gateway'; t.dispatchEvent(new Event('input', {bubbles: true})); f.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true})); });
    await rp.waitForFunction(() => window.aiwInterfaceImpact?.pending && document.querySelector('.cm-svg .nt-node.nt-mk-changed'), null, {timeout: 10000}); await rp.waitForTimeout(400);
    const alt = await rp.evaluate(() => ({ringed: [...document.querySelectorAll('.cm-svg .nt-node.nt-mk-changed')].map(n => n.dataset.ntNode).sort(), rings: document.querySelectorAll('.cm-svg .nt-mk-ring.changed').length, title: document.querySelector('.cm-svg .nt-node[data-nt-node="api"] .nt-title')?.textContent, key: document.querySelector('.cm-legend').innerText}));
    assert.ok(alt.ringed.includes('api') && alt.rings === alt.ringed.length, 'the changed elements are ringed: ' + alt.ringed.join(', '));
    assert.equal(alt.title, 'Payment API gateway', 'the picture draws the alternative’s document');
    assert.match(alt.key, /Changed by this alternative\s*×\d/, 'and the Key says “changed by this alternative”');
    await rp.evaluate(() => window.aiwInterfaceImpact.dismiss()); await rp.waitForTimeout(300);
    await rp.evaluate(() => document.querySelector('[data-ip-action="discard"], [data-ip-action="confirm-discard"]')?.click()); await rp.waitForTimeout(800);
    if (!(await rp.evaluate(() => window.aiwInterfaceImpact.pending))) assert.equal(await rp.$$eval('.cm-svg .nt-node.nt-mk-changed', x => x.length), 0, 'the rings leave with the preview');
    // The record picture: on Chapter 4 Work a selected responsibility shows its neighbourhood in the record card's
    // "Connections & picture" section (rc38: the picture is drawn when that section is opened, above the related records).
    await go('/?chapter=4&tab=work', '.studio');
    await rp.click('.studio [data-select="risk"]'); await rp.waitForSelector('#inspector details[data-card-section="connections"]', {timeout: 8000});
    assert.equal(await rp.$$eval('#inspector .rp', x => x.length), 0, 'the picture waits for its section to be opened');
    assert.match(await rp.$eval('#inspector details[data-card-section="connections"] > summary', e => e.textContent), /^Connections & picture · \d+$/, 'the section names the picture and counts the related records');
    await rp.$eval('#inspector details[data-card-section="connections"]', d => { d.open = true; }); await rp.waitForSelector('#inspector [data-record-picture-slot] > .rp[data-rp="risk"]', {timeout: 8000});
    const pic = await rp.evaluate(() => { const f = document.querySelector('#inspector [data-record-picture-slot] > .rp'), vis = e => { for (let x = e; x && x.nodeType === 1; x = x.parentNode) if (getComputedStyle(x).display === 'none') return false; return true; }; return {first: f === f.parentElement.firstElementChild && f.checkVisibility(), nodes: f.querySelectorAll('.nt-node').length, sel: f.querySelector('.nt-node.sel')?.dataset.ntNode, marks: f.querySelectorAll('.nt-node.nt-mk-confirm').length, toolbar: !!f.querySelector('button, [data-nt="menu"]'), caption: f.querySelector('figcaption').innerText, small: [...f.querySelectorAll('svg text')].filter(vis).map(t => parseFloat(getComputedStyle(t).fontSize) * Math.hypot(t.getScreenCTM().a, t.getScreenCTM().b)).filter(px => px < 9)}; });
    assert.ok(pic.first && pic.sel === 'risk' && pic.nodes >= 3 && pic.nodes <= 12, 'the record picture stands first in its section, shown, with the record marked: ' + JSON.stringify(pic));
    assert.ok(pic.marks >= 1 && !pic.toolbar, 'its checks painted, no toolbar'); assert.match(pic.caption, /LR-002 · Risk screening[\s\S]*neighbourhood/); assert.deepEqual(pic.small, [], 'no word under 9 px');
    await rp.click('#inspector [data-record-picture-slot] > .rp'); await rp.waitForSelector('.cm .cm-svg .nt-node.sel', {timeout: 15000}); await rp.waitForTimeout(400);
    assert.match(rp.url(), /tab=model/); assert.equal(await rp.$eval('.cm-svg .nt-node.sel', e => e.dataset.ntNode), 'risk', 'a click opens the Model tab with the record selected');
    await go('/?chapter=1&tab=work', '.studio'); await rp.waitForTimeout(500);
    await rp.evaluate(() => { for (const d of document.querySelectorAll('#inspector details[data-card-section="connections"]')) d.open = true; }); await rp.waitForTimeout(400);
    assert.equal(await rp.$('#inspector .rp'), null, 'a selection that is not the chapter’s record draws no picture, even with its connections section open');
    await rc.close();
    pass(`round 5: Trace from REQ-001 (toolbar) lights its chain in the Layers view (${layersTrace} elements, the rest dimmed, the path lit, drawn, and kept drawn at every step of the build-up along it) and the Diagram, the companion reads “${T.chain}”, Escape clears it and keeps the selection; a selected element and a Matrix cell trace too, the cell’s chain through the design on the trace (they agree); the Table and Matrix carry the same check glyphs; the readings are two lines with More; an alternative is drawn over the saved design with its changes ringed and “Changed by this alternative” in the Key; on Chapter 4 Work a selected responsibility has its neighbourhood picture above the details, and a click opens it selected on Model`);
  }

  // 14. A blank project: the model says what is missing and what to do, in place.
  await page.goto(base + '/?view=projects', {waitUntil: 'networkidle'}); await page.waitForTimeout(600);
  await page.evaluate(() => { [...document.querySelectorAll('a, button')].find(b => /Create a project/.test(b.textContent))?.click(); }); await page.waitForTimeout(800);
  await page.fill('input[name=name]', 'Blank model views');
  await page.evaluate(() => { const r = [...document.querySelectorAll('input[name=template]')].find(r => /blank/i.test((r.closest('label') || r.parentElement)?.innerText || r.value)) || document.querySelector('input[name=template]'); if (r) { r.checked = true; r.dispatchEvent(new Event('change', {bubbles: true})); r.click(); } });
  await page.waitForTimeout(200);
  await page.evaluate(() => (document.querySelector('#create-submit') || document.querySelector('form button[type=submit]'))?.click());
  await page.waitForURL(u => !/view=projects/.test(String(u)), {timeout: 15000}); await page.waitForTimeout(1200);
  const pid = new URL(page.url()).searchParams.get('project');
  assert.ok(pid, 'a blank project was created');
  const empties = {5: ['No component yet', 'New component'], 6: ['No platform yet', 'New capability'], 7: ['No realisation yet', 'Define capabilities in Chapter 6']};
  for (const [ch, [title, action]] of Object.entries(empties)) {
    await page.goto(base + '/?chapter=' + ch + '&tab=model' + modelOf(Number(ch)) + '&project=' + encodeURIComponent(pid), {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-empty-card', {timeout: 10000}); await page.waitForTimeout(300);
    const card = await page.$eval('.cm-empty-card', e => ({title: e.querySelector('b').textContent, acts: [...e.querySelectorAll('.cm-acts .cm-btn')].map(a => a.textContent.trim())}));
    assert.equal(card.title, title, 'Chapter ' + ch); assert.ok(card.acts.some(a => a.includes(action)), 'Chapter ' + ch + ' offers ' + action + ': ' + card.acts.join(' | '));
    assert.equal(await page.$(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) .cm-ins'), null, 'no observation is invented for an empty project');
  }
  await page.goto(base + '/?chapter=4&tab=model&model=map&project=' + encodeURIComponent(pid), {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-stage'); await page.waitForTimeout(400);
  assert.match(await page.$eval('.cm-walk .cm-state', e => e.textContent), /No responsibility recorded yet/);
  pass('a blank project’s Chapters 5, 6 and 7 say in place that nothing is recorded, offer the next action, invent no observation, and Chapter 4’s status says so too');

  // 15. Round 11 (A), the tray: a fresh project offers only the views that can draw. Chapter 1 offers Journey map, Boundary
  //     and the process and motivation pictures, and nothing else; the picker's last entry names what later chapters add;
  //     a deep link to a hidden view falls back to the chapter's default and "You are here" says so; New perspective… waits
  //     for a record; the help map lists exactly what each chapter's switcher shows, on all eleven chapters.
  {
    await freshTab();
    const at = '&project=' + encodeURIComponent(pid);
    const shown = () => page.$$eval('.cm-views .cm-view:not([hidden])', bs => bs.map(b => b.textContent.trim()));
    await page.goto(base + '/?chapter=1&tab=model' + at, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-views .nt-shared-view', {timeout: 15000}); await page.waitForTimeout(300);
    assert.deepEqual(await shown(), ['Journey map', 'Diagram', 'Boundary', 'Layers', 'Table', 'Matrix', 'Whole design'], 'a fresh Chapter 1 (rc38: the chapter’s own view first, the Diagram second, as the tray orders them)');
    await click('.cm-view[data-id="diagram"]'); await page.waitForSelector('[data-nt-field="scene"]', {timeout: 8000});
    const opts = await page.$$eval('[data-nt-field="scene"] option', os => os.map(o => ({v: o.value, t: o.textContent.trim(), d: o.disabled})));
    assert.deepEqual(opts.map(o => o.v), ['process', 'motivation', ''], 'the process and motivation pictures, then the last entry');
    assert.ok(opts[2].d && opts[2].t === 'Later: Context from Chapter 5 · Sequence from Chapter 8 · Module map once a requirement is recorded', 'which is not selectable and names what later chapters add (round 24: and the module map, once a requirement is recorded): ' + opts[2].t);
    await page.goto(base + '/?chapter=4&tab=model&model=coverage' + at, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-views .nt-shared-view', {timeout: 15000}); await page.waitForTimeout(300);
    assert.equal(await page.$eval('.cm-view[aria-pressed="true"]', e => e.dataset.id), 'map', 'a deep link to the hidden Coverage opens Responsibilities');
    assert.ok(await page.$('.cm-view[data-id="coverage"][disabled]'), 'Coverage remains labelled but waits for its records');
    assert.match(await page.$eval('#yah-text', e => e.textContent), /Responsibilities · Coverage once a responsibility is recorded; opened Responsibilities instead/, '"You are here" says so');
    assert.ok(await page.$('.pv-pick [data-pv="new"][disabled]'), 'New perspective… waits for a record');
    const mapOf = async ch => { await page.click('.help-btn'); await page.waitForSelector('.help-dialog', {timeout: 8000}); const r = await page.$$eval('.help-map tbody tr', (trs, n) => { const tr = trs[n - 1], cell = tr.querySelectorAll('td')[1]; return {lines: [...cell.querySelectorAll('.help-tray li b')].map(b => b.textContent.trim()), later: cell.querySelector('.help-tray-later')?.textContent.trim() || ''}; }, ch); await page.keyboard.press('Escape'); await page.waitForTimeout(150); return r; };
    const agreed = [];
    for (const ch of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      await freshTab(); // Independent help-map inventories retain the same project storage.
      await page.goto(base + '/?chapter=' + ch + '&tab=model' + at, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-views .nt-shared-view', {timeout: 15000}); await page.waitForTimeout(250);
      const views = await shown(), help = await mapOf(ch);
      assert.deepEqual(help.lines, [...views, 'Perspectives'], 'Chapter ' + ch + ': the help map lists the switcher’s entries: ' + help.lines.join(' · '));
      assert.equal(help.later.length > 0, trayLines(await page.evaluate(() => window.aiwProjectStore.value.document), ch).later.length > 0, 'Chapter ' + ch + ' names what is to come');
      agreed.push(ch + ':' + views.length);
    }
    pass('round 11, the tray: a fresh project’s Chapter 1 offers Journey map, Boundary and the process and motivation pictures and nothing else, the picker’s last entry names Context from Chapter 5 and Sequence from Chapter 8; a deep link to the hidden Coverage opens Responsibilities and "You are here" says so; New perspective… waits for a record; on all eleven chapters the help map lists exactly the switcher’s entries (' + agreed.join(', ') + ')');
  }

  // 16. The subject strip never carries a foreign record into another chapter. A native view may restore
  // its own previously selected record: untouched round26 restores Chapter6's gateway (TC-005) after
  // Chapter5's Risk engine. Preserve this useful view memory, owner validity, URL identity and keyboard release.
  {
    await open(5);
    // The chapter model remembers its last selection in this browser and holds it again; let it go first.
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    assert.equal(await page.$eval('#subject-strip', e => e.hidden), true, 'nothing is held while nothing is selected');
    await click('.rz-card[data-card="risk-engine"] .rz-t'); await page.waitForTimeout(300);
    const strip = () => page.$eval('#subject-strip', e => ({text: e.innerText.replace(/\s+/g, ' ').trim(), live: e.getAttribute('aria-live'), role: e.getAttribute('role'), button: !!e.querySelector('button[data-action="release-subject"]')}));
    let st = await strip();
    assert.deepEqual(st, {text: 'Holding Risk engine APP-002 Release', live: 'polite', role: 'status', button: true}, 'the strip names what is held, with its reference and a Release button: ' + st.text);
    // rc38 (journey-context-ui.js): while a record is held on Model, the sidebar's chapter entries are journey links —
    // one saved connection follows it, several ask which to follow, none says so — and the chapter itself opens from
    // the dialog's "Open Chapter N without choosing a linked record"; the chapter is not changed behind the dialog.
    const entry = ch => page.$eval(`.chapter-item[data-chapter="${ch}"]`, a => ({choice: a.dataset.journeyChoice || null, target: a.dataset.journeyTarget || null, missing: a.dataset.journeyMissing || null, title: a.getAttribute('title')}));
    const journeyDialog = () => page.evaluate(() => { const d = document.querySelector('dialog[open], .dialog'); return d && {heading: d.querySelector('h2, h3')?.textContent.trim(), text: d.innerText.replace(/\s+/g, ' ').trim(), backlinks: d.querySelectorAll('.object-backlink[data-journey-target]').length}; });
    const openChapterFromDialog = async ch => { const ok = await page.evaluate(n => { const a = [...document.querySelectorAll('dialog[open] a, .dialog a')].find(a => a.textContent.trim() === `Open Chapter ${n} without choosing a linked record`); if (!a) return false; a.click(); return true; }, ch); assert.ok(ok, `the dialog offers to open Chapter ${ch} without choosing a linked record`); await page.waitForTimeout(1200); };
    assert.deepEqual(await entry(6), {choice: '6', target: null, missing: null, title: 'Choose among 6 saved connections from APP-002'}, 'with Risk engine held, the Chapter 6 entry asks which of its six saved connections to follow');
    await page.click('.chapter-item[data-chapter="6"]'); await page.waitForTimeout(700);
    const jd = await journeyDialog();
    assert.ok(jd && jd.heading === 'Follow APP-002 · Chapter 6' && /Risk engine · APP-002 6 saved connections reach /.test(jd.text) && jd.backlinks === 6, 'its dialog names the held record and lists the six records it reaches in Chapter 6: ' + JSON.stringify(jd));
    assert.equal(await objectParam(), 'risk-engine', 'the chapter is not changed behind the dialog');
    await openChapterFromDialog(6); await page.waitForSelector('.cm.pf, .cm .pf-card, .cm .cm-stage', {timeout: 15000}); await page.waitForTimeout(300);
    st = await strip();
    assert.equal(st.text, '← Chapter 5 · Application realization Holding Service connectivity TC-005 Release', 'Chapter 6 restores its own previously selected capability, not the foreign component, with the way back to Chapter 5');
    const restoredChapter6Selection = await objectParam();
    assert.equal(restoredChapter6Selection, priorChapter6Selection, 'the URL names the same recorded Chapter 6 selection');
    assert.notEqual(restoredChapter6Selection, 'risk-engine', 'the Chapter 5 component does not leak into the next chapter URL');
    assert.ok(recordBelongsTo(await page.evaluate(() => window.aiwProjectStore.value.document), 6, restoredChapter6Selection), 'the restored record belongs to Chapter 6');
    assert.deepEqual(await entry(2), {choice: '2', target: null, missing: null, title: 'Choose among 6 saved connections from TC-005'}, 'the held capability makes the Chapter 2 entry a journey choice too');
    await page.click('.chapter-item[data-chapter="2"]'); await page.waitForTimeout(700);
    assert.match((await journeyDialog())?.heading || '', /^Follow TC-005 · Chapter 2$/, 'its dialog follows TC-005');
    await openChapterFromDialog(2); await page.waitForSelector('.cm.um, .cm .cm-stage', {timeout: 15000}); await page.waitForTimeout(300);
    st = await strip();
    assert.equal(st.text, '← Chapter 6 · Logical technology Released Service connectivity is not drawn in this chapter', 'Chapter 2 releases the capability that belongs to Chapter 6, with the way back');
    assert.equal(await objectParam(), null, 'Chapter 2 has no foreign record in its URL');
    await open(5);
    await click('.rz-card[data-card="risk-engine"] .rz-t'); await page.waitForTimeout(300);
    await page.focus('#subject-strip button[data-action="release-subject"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    st = await strip();
    assert.equal(st.text, 'Released Risk engine', 'Release, from the keyboard, lets it go');
    assert.equal(await page.$$eval('#inspector .cm-companion .cm-spec', es => es.length), 0, 'and the chapter model lets go of its selection');
    pass('the subject strip: a selected record is held above the picture ("Holding Risk engine APP-002", a status line with a Release button); while it is held the sidebar’s chapter entries are journey links (Chapter 6 asks which of six saved connections to follow, the chapter is not changed behind the dialog); opened without choosing, Chapter 6 restores its own previously selected record with the right URL and the way back, Chapter 2 releases a record it does not draw, and Release works from the keyboard');
  }

  // Round 12 (G, GR-UX-06): Table and Matrix find a requirement by its workbook id or its domain, as the register's own
  // search does, and Chapter 1's Table has external id, domain, group and delivery columns. The reference project is
  // restored with what a workbook import leaves on its requirements (an external id, a domain, a delivery state), one
  // requirement group, and enough requirements for the Matrix to offer its row filter.
  {
    await freshTab();
    const {restoreScaleProject} = await import('./scripts/build-scale-fixture.mjs');
    const doc = referenceProject(), reqs = doc.artefacts.filter(a => a.type === 'requirement');
    for (let i = 1; i <= 14; i++) doc.artefacts.push({...structuredClone(reqs[0]), id: 'REQ-1' + String(i).padStart(2, '0'), title: 'Imported requirement ' + i, description: 'An imported requirement for the search.'});
    const all = doc.artefacts.filter(a => a.type === 'requirement');
    all.forEach((a, i) => { a.externalId = 'WB-' + String(i + 1).padStart(4, '0'); a.domain = i % 2 ? 'Back office' : 'Channel services'; a.assessment = {...(a.assessment || {}), delivery: i % 3 ? 'Delivered' : 'Not started'}; });
    doc.requirementGroups = {version: 1, counter: 1, records: [{id: 'RG-001', title: 'Imported flows', kind: 'functional-area', description: 'The requirements of one imported flow.', owner: '', memberIds: all.slice(0, 4).map(a => a.id), rule: []}]};
    const R = await restoreScaleProject({base, document: doc, name: 'Model views with imported ids'}), at = '&project=' + encodeURIComponent(R.id);
    const target = all[6], domainCount = all.filter(a => a.domain === 'Back office').length;
    await page.goto(base + '/?chapter=1&tab=model&model=table' + at, {waitUntil: 'networkidle'}); await page.waitForSelector('.nt-records tbody tr', {timeout: 15000});
    const heads = await page.$$eval('.nt-records thead th', xs => xs.map(x => x.textContent.trim()));
    for (const h of ['External ID', 'Domain', 'Group', 'Delivery']) assert.ok(heads.includes(h), `Chapter 1's Table has a ${h} column: ${heads.join(' | ')}`);
    const rowsOf = () => page.$$eval('.nt-records tbody tr[data-nt-row]', rs => rs.map(r => r.dataset.ntRow));
    await page.fill('[data-nt-field="tfilter"]', target.externalId); await page.waitForTimeout(400);
    assert.deepEqual(await rowsOf(), [target.id], `filtering the Table by ${target.externalId} finds ${target.id}`);
    assert.match(await page.$eval(`.nt-records tbody tr[data-nt-row="${target.id}"]`, r => r.innerText), new RegExp(`${target.externalId}[\\s\\S]*${target.domain}[\\s\\S]*${target.assessment.delivery}`), 'its row shows its external id, domain and delivery');
    await page.fill('[data-nt-field="tfilter"]', 'back office'); await page.waitForTimeout(400);
    assert.equal((await rowsOf()).length, domainCount, `filtering the Table by a domain finds its ${domainCount} requirements`);
    await page.fill('[data-nt-field="tfilter"]', 'imported flows'); await page.waitForTimeout(400);
    assert.equal((await rowsOf()).length, 4, 'and by a requirement group, its members');
    await page.goto(base + '/?chapter=2&tab=model&model=cross' + at, {waitUntil: 'networkidle'}); await page.waitForSelector('.nt-x', {timeout: 15000});
    if (await page.$eval('[data-nt-field="xrows"]', s => s.value) !== 'requirement') { await page.selectOption('[data-nt-field="xrows"]', 'requirement'); await page.waitForTimeout(500); }
    const xrows = () => page.$$eval('.nt-x tbody th[scope="row"] [data-nt-row]', xs => xs.map(x => x.dataset.ntRow));
    await page.fill('[data-nt-field="xrfilter"]', target.externalId); await page.waitForTimeout(500);
    assert.deepEqual([...new Set(await xrows())], [target.id], `filtering the Matrix's rows by ${target.externalId} finds ${target.id}`);
    await page.fill('[data-nt-field="xrfilter"]', 'back office'); await page.waitForTimeout(500);
    assert.equal(new Set(await xrows()).size, domainCount, `and by a domain, its ${domainCount} requirements`);
    pass(`GR-UX-06: Table and Matrix find a requirement by its workbook id (${target.externalId}) and by its domain (${domainCount} in Back office), the Table by its group too, and Chapter 1's Table shows External ID, Domain, Group and Delivery`);
  }

  await ctx.close();
  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 4–8 model views (rendered)', passed: checks.length, checks}, null, 2));
