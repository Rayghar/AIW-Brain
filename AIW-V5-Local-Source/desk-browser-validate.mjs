// Rendered checks for the review desk, Chapter 11's Model: table first (round 3, C) — Vitals as a sortable table in
// words, What it takes as a two-column specification sheet, Trace as requirement rows with path chips and the first
// broken link named — and the Running board (round 4, C): the running parts drawn by the shared notation renderer,
// grouped by placement, each with its state in words. Validate no longer mounts the desk. Round 5 (Contract G): the
// readings in the companion are two lines with More, the status line two lines with More, and the Vitals table carries
// no repeated words (a part's name once in a run of its rows, a target's translation in its title, the readings a part
// does not carry folded behind one control) — under 1,200 words on the stage and 300 in the companion on arrival.
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
const db = '.aiw-local/desk-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => { checks.push(n); if (process.env.DK_DEBUG) console.error('PASS', checks.length, n.slice(0, 60)); };
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  // The tables, as the desk opens by default (one of the desk's own views, remembered like the others).
  const openTable = async (view = 'vitals', extra = '') => { await page.goto(base + '/?chapter=11&tab=model' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.dk .cm-view', {timeout: 8000}); if (!(await page.$(`.cm.dk .cm-view[data-id="${view}"][aria-pressed="true"]`))) await page.click(`.cm.dk .cm-view[data-id="${view}"]`); await page.waitForSelector('.cm.dk.dk-table .dk-sheet table', {timeout: 8000}); await page.waitForTimeout(300); };
  const open = (extra = '') => openTable('vitals', extra);
  // Text under 12 px, and text a box cuts short, in the desk and its companion (the picture's SVG is the kit's).
  const smallOrCut = () => page.evaluate(() => [...document.querySelectorAll('.cm.dk *, .cm-companion.dk *')].filter(e => !e.closest('svg') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length && e.getBoundingClientRect().width > 2).filter(e => { const cs = getComputedStyle(e); return parseFloat(cs.fontSize) < 12 || (cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1); }).map(e => e.className + ': ' + e.textContent.trim().slice(0, 40)));
  // Find and click in one page task: a redraw between the two would leave the click on a replaced element.
  const act = async sel => { await page.evaluate(s => { const e = document.querySelector(s); if (!e) throw Error('No element matches ' + s); e.click(); }, sel); await page.waitForTimeout(300); };
  const count = async sel => (await page.$$(sel)).length;
  // The desk's companion: the frame's companion column on Chapter 11's Model (round 3, B), or the desk's own panel.
  const panel = () => page.evaluate(() => [...document.querySelectorAll('.cm-companion, .cm .cm-panel')].find(e => e.innerText.trim())?.innerText || '');
  const shown = sel => page.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }, sel);
  // The order of the Vitals table's rows: a selection moves none of them.
  const rowOrder = () => page.$$eval('.dk-vt tbody tr[data-card]', xs => xs.map(x => x.dataset.card).join('|'));
  // A flash stays until the next one replaces it: after an action, wait for the flash that reports it,
  // not the one already showing, and note what shows with it (a cell's pulse lasts 2.6 s). A slower
  // workstation needs longer for a many-command change review.
  const flashNow = () => page.evaluate(() => document.querySelector('.dk-flash')?.innerText || '');
  const nextFlash = async (was, withSel = '') => { const h = await page.waitForFunction(([w, sel]) => { const f = document.querySelector('.dk-flash'); return !!f && f.innerText !== w && {text: f.innerText, with: sel ? !!document.querySelector(sel) : null}; }, [was, withSel], {timeout: 20000}); const seen = await h.jsonValue(); await page.waitForTimeout(300); return seen; };


  // 0. Table first: the desk opens on Vitals as a table in words; What it takes is a specification sheet; Trace is a
  //    row for each requirement with its path as chips and the first broken link named. The Running board is a view.
  await openTable('vitals');
  assert.match(await page.$eval('.dk-monitor', e => e.innerText), /no load stated/i, 'a reference project does not silently inherit the illustrative workload');
  // This isolated synthetic server explicitly records the objective used by the arithmetic tests below.
  // It is test data, not a payment target or a human review receipt.
  await page.evaluate(() => window.aiwProjectStore.command({type:'review.objective',payload:{kind:'users',value:100000,reviewer:'Synthetic browser fixture',reviewed:true,rationale:'Synthetic sizing regression only; not real payment evidence.'}}));
  await openTable('vitals');
  assert.equal(await page.$eval('.cm.dk .cm-view[aria-pressed="true"]', e => e.dataset.id), 'vitals', 'the desk opens on Vitals');
  assert.ok(!(await shown('.cm.dk .cm-stage')), 'a table needs no stage');
  assert.deepEqual(await page.$$eval('.cm.dk .cm-top > *', xs => xs.map(x => x.className.split(' ')[0])), ['cm-title', 'cm-views', 'cm-actions'], 'the toolbar is in the order of the other chapter models');
  assert.ok(await page.$('.cm.dk [data-model-slot=commands]>.cm-crumbs'), 'scope sits with contextual commands');
  assert.ok(await page.$('.cm.dk [data-model-slot=content]>.dk-content>.dk-monitor'), 'review monitor sits inside the view content');
  assert.deepEqual(await page.$$eval('.cm.dk .cm-views .cm-view', xs => xs.map(x => x.textContent.trim())), ['Vitals', 'Diagram', 'What it takes', 'Trace', 'Running board', 'Layers', 'Table', 'Matrix', 'Whole design'], 'one switcher, in the order of every chapter model, with the desk\'s own four views');
  assert.match(await page.$eval('.cm.dk .cm-actions', e => e.innerText), /^\s*Ask for review/, 'no Board toggle: the Running board is a view of the switcher');
  assert.ok(!(await page.$('.cm.dk [data-dk="explore"]')) && !(await page.evaluate(() => document.body.classList.contains('am-active'))), 'one picture world: no explorer button and no explorer mode; the perspectives are the switcher\'s group');
  assert.ok(await page.$('.cm.dk .cm-actions > .pv-pick > summary.pv-sum'), 'the Perspectives group ends the desk\'s toolbar, as on every chapter model');
  assert.ok(!(await page.$('.cm.dk [data-dk="board"], .cm.dk .dk-cell, .cm.dk .dk-rh, .cm.dk .dk-card')), 'the board graphic is retired');
  assert.deepEqual(await page.$$eval('.dk-vt thead th', xs => xs.map(x => x.textContent.replace(/[▲▼↕]/g, '').trim())), ['Part', 'Vital', 'Recorded', 'Target', 'State']);
  assert.equal(await count('.dk-vt tbody tr'), 14 * 8, 'a row for each vital of each running part');
  assert.equal(await page.$eval('.dk-vt thead th:nth-child(5)', e => e.getAttribute('aria-sort')), 'descending', 'worst first by default');
  const words = await page.$$eval('.dk-vt tbody tr td:nth-child(5) .dk-word', xs => [...new Set(xs.map(x => x.textContent.replace(/^\W+/, '').trim()))]);
  assert.ok(words.length >= 3 && words.every(w => ['Critical', 'Watch', 'Normal', 'No signal', 'Not carried'].includes(w)), 'the state is a word: ' + words);
  assert.equal(await count('.dk-vt tbody tr td:nth-child(5) .dk-word'), 112, 'every state in words, not colour alone');
  assert.match(await page.$eval('.dk-vt tbody tr', e => e.innerText), /RUN-001\s*Payment service[\s\S]*Capacity[\s\S]*needs 24 replicas[\s\S]*can grow to 1[\s\S]*Critical/);
  await act('.dk-vt thead [data-dk="sort"][data-id="part"]');
  assert.equal(await page.$eval('.dk-vt thead th:nth-child(1)', e => e.getAttribute('aria-sort')), 'ascending');
  assert.match(await page.$eval('.dk-vt tbody tr', e => e.innerText), /^RUN-001\s*Payment service[\s\S]*Availability/);
  await act('.dk-vt thead [data-dk="sort"][data-id="part"]');
  assert.equal(await page.$eval('.dk-vt thead th:nth-child(1)', e => e.getAttribute('aria-sort')), 'descending');
  await act('.dk-vt thead [data-dk="sort"][data-id="state"]');
  await act('.dk-monitor .dk-tile[data-id="capacity"]');
  assert.equal(await count('.dk-vt tbody tr'), 14, 'a monitor tile shows one vital');
  assert.match(await page.$eval('.dk-controls', e => e.innerText), /Capacity only/);
  await act('.dk-vt tbody tr[data-card="C:run-001:capacity"]');
  assert.match(await panel(), /Capacity · RUN-001[\s\S]*Critical[\s\S]*needs 24 replicas/i);
  assert.equal(await page.$eval('.dk-vt tbody tr[data-card="C:run-001:capacity"]', e => e.getAttribute('aria-selected')), 'true');
  await act('.dk-controls [data-dk="focus"]');
  assert.equal(await count('.dk-vt tbody tr'), 112);
  // The keyboard: one tab stop for the rows (the selected one), the arrow keys between rows, Enter to read one.
  assert.equal(await count('.dk-vt tbody tr[tabindex="0"]'), 1, 'one tab stop for 112 rows');
  await page.focus('.dk-vt tbody tr[tabindex="0"]'); const from = await page.evaluate(() => document.activeElement.dataset.card);
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(100);
  const to = await page.evaluate(() => document.activeElement.dataset.card);
  assert.equal(to, await page.$eval('.dk-vt tbody tr:nth-child(2)', e => e.dataset.card), 'Home, then ArrowDown, reaches the second row (from ' + from + ')');
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  assert.equal(await page.$eval(`.dk-vt tbody tr[data-card="${to}"]`, e => e.getAttribute('aria-selected')), 'true', 'Enter reads the row');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset?.card), to, 'the keyboard stays on the row');
  assert.deepEqual(await smallOrCut(), [], 'Vitals: no text under 12 px and none cut short');
  pass('table first: Chapter 11\'s Model opens on Vitals as a table — part, vital, recorded, target and state in words for 14 parts on 8 vitals — sorted worst first and by any column, narrowed to one vital from the monitor, one tab stop with the arrow keys between rows, a row reading in the companion; the toolbar keeps the order of the other chapter models with the desk\'s own four views; 12 px and full text');


  await act('.cm.dk .cm-view[data-id="load"]');
  assert.deepEqual(await page.$$eval('.dk-st thead th', xs => xs.map(x => x.textContent.trim())), ['Part', 'What it takes'], 'a two-column specification sheet');
  assert.match(await page.$eval('.dk-st tbody', e => e.innerText), /^The objective[\s\S]*Objective\s*100,000 concurrent users[\s\S]*Arrival rate\s*3,125 req\/s[\s\S]*Running it takes\s*163 pods[\s\S]*16 nodes[\s\S]*Planning assumptions/, 'the objective first');
  assert.equal(await count('.dk-st tbody tr.dk-sr'), 16, 'then each part');
  assert.match(await page.$eval('.dk-st tr[data-card="api-pod"]', e => e.innerText), /APP-001\s*Payment service[\s\S]*Short[\s\S]*Demand\s*3,125 req\/s[\s\S]*Replicas\s*24/i);
  assert.match(await page.$eval('.dk-st tr[data-card="tr-002"]', e => e.innerText), /PostgreSQL 17[\s\S]*past it above ≈75,000 users/i);
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('.dk-st .dk-band-row')].map(r => r.textContent).join('|').includes('Services and workers')), 'parts in bands from the edge inwards');
  assert.equal(await page.$eval('.dk-st tr[data-card="api-pod"]', e => e.getAttribute('aria-selected')), 'true', 'the part read on Vitals stays selected as what the objective takes of it');
  assert.match(await panel(), /Service · APP-001[\s\S]*The arithmetic/i);
  assert.deepEqual(await smallOrCut(), [], 'What it takes: no text under 12 px and none cut short');
  pass('What it takes is a two-column specification sheet: the objective (100,000 concurrent users, 3,125 req/s, 163 pods on 16 nodes, the planning assumptions), then each of the 16 parts by band beside what the objective takes of it, its verdict in words; the part read on Vitals stays selected and reads its arithmetic in the companion');

  await act('.cm.dk .cm-view[data-id="trace"]');
  assert.deepEqual(await page.$$eval('.dk-tt thead th', xs => xs.map(x => x.textContent.replace(/[▲▼↕]/g, '').trim())), ['Requirement', 'Path through the chapters', 'First broken link', 'Trail']);
  assert.equal(await count('.dk-tt tbody tr'), 5);
  assert.equal(await count('.dk-tt tbody tr:first-child .dk-path > li'), 10, 'the path includes Chapter 6 capabilities separately from Chapter 7 products');
  assert.match(await page.$eval('.dk-tt tbody tr', e => e.innerText), /REQ-001\s*Accept a traceable payment instruction[\s\S]*Ch 2 · Drivers[\s\S]*QD-002[\s\S]*Ch 3 · Decisions[\s\S]*ADR-001[\s\S]*Ch 4 · Responsibilities[\s\S]*LR-001[\s\S]*Design linked[\s\S]*verification separate[\s\S]*Not reviewed/);
  assert.equal(await count('.dk-tt tbody tr.broken'), 0, 'every thread reaches where it runs');
  await act('.dk-tt .dk-pchip[data-sel="ADR-001"]');
  assert.match(await panel(), /Decision · ADR-001/i);
  assert.deepEqual(await smallOrCut(), [], 'Trace: no text under 12 px and none cut short');
  pass('Trace is a row for each of the 5 requirements: its path through the chapters as chips, in order, the first broken link (none on the reference project), and whether its trail is reviewed; a chip opens its record in the companion');

  // The views every chapter model shares (round 3, D), on the desk's stage and companion: Diagram (Chapter 11's
  //     design rationale), Layers, Table, Matrix (requirement × running part) and Whole design; back to Vitals the
  //     desk reads as before.
  for (const [view, sel, text] of [
    ['diagram', '.cm.dk .nt-node', /Design rationale · 19 elements/],
    ['layers', '.cm.dk .nt-node', /Layers · \d+ elements in \d+ lanes/],
    ['table', '.cm.dk .cm-sheet tr[data-nt-row]', /Table · Chapter 11/],
    // Round 11 (A): Chapter 11's Matrix opens on requirements against controls (what protects what was asked for); Trace keeps requirement → running part.
    ['cross', '.cm.dk .cm-sheet table', /Matrix · Requirements × Controls · 5 × 3/],
    ['whole', '.cm.dk .cm-sheet .an', /Whole design/]]) {
    await act(`.cm.dk .cm-view[data-id="${view}"]`);
    await page.waitForSelector(sel, {timeout: 8000, state: 'attached'});
    assert.equal(await page.$eval('.cm.dk .cm-view[aria-pressed="true"]', e => e.dataset.id), view);
    assert.match(await page.$eval('.cm.dk .cm-state', e => e.textContent), text, view);
    assert.ok(!(await shown('.dk-monitor')), view + ': the monitor belongs to the desk\'s own tables');
    assert.ok((await panel()).trim().length > 0, view + ': the companion reads the view');
  }
  await act('.cm.dk .cm-view[data-id="diagram"]');
  await page.$eval('.cm.dk .nt-node[data-sel="REQ-001"]', e => e.dispatchEvent(new MouseEvent('click', {bubbles: true}))); await page.waitForTimeout(300);
  assert.match(await panel(), /Accept a traceable payment instruction[\s\S]*Open in Chapter 1 Work/i, 'an element of the picture reads in the companion with Open in Work');
  await act('.cm.dk .cm-view[data-id="vitals"]');
  await page.waitForSelector('.cm.dk.dk-table .dk-vt', {timeout: 8000});
  assert.ok(await shown('.dk-monitor') && !(await shown('.cm.dk .cm-sheet')), 'back on Vitals the desk reads as before');
  await page.goto(base + '/?chapter=11&tab=model&model=cross', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.dk .cm-sheet table', {timeout: 8000});
  assert.equal(await page.$eval('.cm.dk .cm-view[aria-pressed="true"]', e => e.dataset.id), 'cross', 'a link can open the desk on a shared view');
  await openTable('trace');
  pass('the desk\'s switcher holds the views every chapter model shares — Diagram (design rationale), Layers, Table, Matrix (requirements × running parts) and Whole design — drawn on its stage with its companion; a link can open one; Vitals reads as before');

  // The Running board (round 4, C): the running parts drawn by the shared notation renderer, one element each, in the
  //     container of where Chapter 10 places them, each with its state in the review's words; what they run above them.
  const tableWords = async () => { const rows = await page.$$eval('.dk-vt tbody tr[data-card]', xs => xs.map(x => [x.dataset.card.split(':')[1], x.querySelector('td:nth-child(5) .dk-word').textContent.replace(/^\W+/, '').trim()])); const W = {Critical: 'to fix', Watch: 'to confirm', 'No signal': 'to confirm', Normal: 'passing', 'Not carried': 'passing'}, O = ['to fix', 'to confirm', 'passing'], out = {}; for (const [id, w] of rows) if (!out[id] || O.indexOf(W[w]) < O.indexOf(out[id])) out[id] = W[w]; return out; };
  await openTable('vitals');
  const fromTable = await tableWords();
  assert.equal(Object.keys(fromTable).length, 14);
  await act('.cm.dk .cm-view[data-id="board"]');
  await page.waitForSelector('.cm.dk .cm-svg .nt-node', {timeout: 8000});
  assert.equal(await page.$eval('.cm.dk .cm-view[aria-pressed="true"]', e => e.dataset.id), 'board');
  assert.ok(await shown('.cm.dk .cm-stage') && !(await shown('.cm.dk .dk-sheet')) && !(await shown('.dk-monitor')), 'the picture takes the stage');
  const board = await page.$$eval('.cm.dk .cm-svg .nt-node', xs => xs.map(x => ({id: x.dataset.ntNode, sub: x.querySelector('.nt-sub')?.textContent || '', ring: [...x.classList].find(c => c.startsWith('nt-v-')) || '', label: x.getAttribute('aria-label'), font: x.querySelector('.nt-sub') ? getComputedStyle(x.querySelector('.nt-sub')) : null})).map(({font, ...n}) => n));
  const partsDrawn = board.filter(n => /^run-/.test(n.id));
  assert.equal(partsDrawn.length, 14, 'one element for each running part');
  assert.equal(board.length, 24, 'with the 5 components they run and the 5 requirements those fulfil');
  for (const n of partsDrawn) assert.equal(n.sub.replace(/^\W+/, '').trim().toLowerCase(), fromTable[n.id], n.id + ': the state word reads as its Vitals rows do');
  assert.ok(partsDrawn.every(n => /^[✕○✓] (To fix|To confirm|Passing)$/.test(n.sub)), 'the state in words with the shared glyphs');
  assert.deepEqual([...new Set(partsDrawn.map(n => n.ring))].sort(), ['nt-v-bad', 'nt-v-warn'], 'the kit\'s ring says the same');
  assert.match(partsDrawn.find(n => n.id === 'run-001').label, /^Running part RUN-001 Payment service/);
  assert.deepEqual(await page.$$eval('.cm.dk .cm-svg .nt-group .nt-gtitle', xs => xs.map(x => x.textContent)), ['Payment production design', 'Application zone', 'Recovery zone', 'Not placed'], 'grouped by placement: the environment, its zones (the empty recovery zone included) and the parts not placed');
  const placed = await page.evaluate(() => { const g = document.querySelector('.cm.dk .cm-svg .nt-group[data-nt-group="zone-a"] rect').getBBox(); return [...document.querySelectorAll('.cm.dk .cm-svg .nt-node')].filter(n => { const t = n.transform.baseVal.consolidate().matrix; return t.e >= g.x && t.f >= g.y && t.e <= g.x + g.width && t.f <= g.y + g.height; }).map(n => n.dataset.ntNode).sort(); });
  assert.deepEqual(placed, ['run-001', 'run-002', 'run-004'], 'the three placed parts stand in the application zone');
  assert.deepEqual(await page.$$eval('.cm.dk .cm-svg .nt-edge', xs => { const o = {}; for (const x of xs) { const k = [...x.classList].find(c => c.startsWith('nt-e-')); o[k] = (o[k] || 0) + 1; } return o; }), {'nt-e-realizes': 5, 'nt-e-serves': 28, 'nt-e-fulfils': 5}, 'part → component → requirement in the kit\'s relationship kinds');
  assert.match(await page.$eval('.cm.dk .cm-state', e => e.textContent), /^Running board · 14 running parts in 2 places · 13 to fix · 1 to confirm · 0 passing · 38 relationships$/);
  assert.deepEqual(await page.$eval('.cm.dk .cm-state', e => ({clamp: getComputedStyle(e).webkitLineClamp, more: !!e.parentElement.querySelector('.cm-state-more[data-dk="state-more"]')})), {clamp: '2', more: true}, 'the status line reads in two lines, with More when it runs longer');
  assert.match(await page.$eval('.cm.dk .dk-controls', e => e.innerText), /13 to fix[\s\S]*1 to confirm[\s\S]*0 passing[\s\S]*Out[\s\S]*In[\s\S]*Fit/);
  assert.match(await page.$eval('.cm.dk .cm-legend', e => e.textContent), /State of a running part[\s\S]*to fix[\s\S]*to confirm[\s\S]*passing[\s\S]*Running part \(placement\)\s*×14[\s\S]*Physical application component\s*×5[\s\S]*Requirement\s*×5[\s\S]*realizes, fulfils[\s\S]*serves[\s\S]*Not chosen, not placed/, 'the Key is the kit\'s, with the states in words');
  assert.match(await panel(), /Running board[\s\S]*13 to fix[\s\S]*1 to confirm[\s\S]*0 passing[\s\S]*RUN-001 Payment service · 4 critical, 2 with no signal of 8 vitals[\s\S]*Where they run[\s\S]*Application zone · 3 running parts[\s\S]*Recovery zone · 0 running parts[\s\S]*Not placed · 11 running parts[\s\S]*Reading this picture/i);
  assert.equal(await page.evaluate(() => document.querySelectorAll('.cm.dk .cm-svg .nt-node[class*="nt-v-"] .nt-sub').length), 14);
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('.cm.dk .cm-svg .nt-node[class*="nt-v-"] .nt-sub')].every(t => parseFloat(getComputedStyle(t).fontSize) >= 12 && getComputedStyle(t).visibility === 'visible')), 'each state word is 12 px and shown at the first fit');
  assert.ok(!(await page.evaluate(() => /blocking/i.test(document.querySelector('.cm.dk').innerText + document.querySelector('.cm-companion')?.innerText))), 'never "blocking"');
  assert.deepEqual(await smallOrCut(), [], 'Running board: no desk text under 12 px and none cut short');
  await page.reload({waitUntil: 'networkidle'}); await page.waitForSelector('.cm.dk .cm-svg .nt-node', {timeout: 8000}); await page.waitForTimeout(300);
  assert.equal(await page.$eval('.cm.dk .cm-view[aria-pressed="true"]', e => e.dataset.id), 'board', 'the view is remembered');
  pass('the Running board is one more picture of the one model, drawn by the shared renderer: the 14 running parts as elements in the containers of where they are placed (the application zone, the empty recovery zone, Not placed), each with its state in words — to fix or to confirm, as its Vitals rows read — and the kit\'s ring, below the components they realize or serve and the requirements those fulfil; the kit\'s Key, 12 px words, remembered like the other views');

  // Selecting on the board selects the same record on the desk, both ways; a relationship reads; the layers filter.
  await page.$eval('.cm.dk .cm-svg .nt-node[data-nt-node="run-001"]', e => e.dispatchEvent(new MouseEvent('click', {bubbles: true}))); await page.waitForTimeout(300);
  assert.equal(await page.$eval('.cm.dk .cm-svg .nt-node.sel', e => e.dataset.ntNode), 'run-001');
  assert.match(await panel(), /To fix RUN-001 Payment service[\s\S]*4 critical, 2 with no signal of 8 vitals[\s\S]*Running part · RUN-001[\s\S]*Plug in a probe/i);
  assert.match(page.url(), /object=run-001/);
  await act('.cm.dk .cm-view[data-id="vitals"]');
  await page.waitForSelector('.cm.dk.dk-table .dk-vt', {timeout: 8000});
  assert.deepEqual([...new Set(await page.$$eval('.dk-vt tbody tr.lit', xs => xs.map(x => x.dataset.card.split(':')[1])))], ['run-001'], 'on Vitals the same part is lit');
  assert.equal(await count('.dk-vt tbody tr.lit'), 8);
  await act('.dk-vt tbody tr[data-card="C:run-004:availability"]');
  await act('.cm.dk .cm-view[data-id="board"]');
  await page.waitForSelector('.cm.dk .cm-svg .nt-node.sel', {timeout: 8000});
  assert.equal(await page.$eval('.cm.dk .cm-svg .nt-node.sel', e => e.dataset.ntNode), 'run-004', 'a vital read on Vitals is its part on the board');
  await page.focus('.cm.dk .cm-svg .nt-node[data-nt-node="REQ-001"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  assert.equal(await page.$eval('.cm.dk .cm-svg .nt-node.sel', e => e.dataset.ntNode), 'REQ-001', 'Enter reads the focused element');
  assert.match(await panel(), /Requirement · REQ-001/i);
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset?.ntNode), 'api-pod', 'the arrow keys move to the nearest element below');
  assert.equal(await page.evaluate(() => { const k = Object.keys(localStorage).find(x => x.includes('aiw-notation-v2-ch11')); return k ? Object.keys(JSON.parse(localStorage.getItem(k)).pins || {}).length : 0; }), 0, 'nothing is pinned');
  await page.$eval('.cm.dk .cm-svg .nt-hit[data-nt-edge="rb:run-001>api-pod"]', e => e.dispatchEvent(new MouseEvent('click', {bubbles: true}))); await page.waitForTimeout(300);
  assert.equal(await page.$eval('.cm.dk .cm-svg .nt-edge.sel', e => e.dataset.ntEdge), 'rb:run-001>api-pod');
  assert.ok(!(await page.$('.cm.dk .cm-svg .nt-node.sel')), 'an element and a relationship are not selected together');
  assert.match(await panel(), /Selected relationship · Realization[\s\S]*RUN-001 Payment service realizes Payment service/i);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  assert.ok(!(await page.$('.cm.dk .cm-svg .nt-edge.sel')), 'Escape clears it');
  // Round 10 (N6): the serves relationships into a component are drawn as one line; a click on it selects the component,
  // whose reading lists each of them as a button; a button selects that relationship, lifted whole; Escape clears.
  {
    await page.click('.cm.dk [data-dk="fit"]'); await page.waitForTimeout(300);
    const line = await page.evaluate(() => {
      // (a line's id says nothing of its kind: the serves line is found by its trunk's class)
      const bh = [...document.querySelectorAll('.cm.dk .cm-svg .nt-bhit')].find(b => document.querySelector(`.cm.dk .cm-svg .nt-bundle[data-nt-bundle="${CSS.escape(b.dataset.ntBundle)}"] .nt-trunk.nt-e-serves`)); if (!bh) return null;
      const g0 = [...document.querySelectorAll('.cm.dk .cm-svg .nt-bundle')].find(g => g.dataset.ntBundle === bh.dataset.ntBundle), t = g0.querySelector('.nt-trunk path.nt-line'), m = t.getScreenCTM(), L = t.getTotalLength();
      const members = [...new Set([...g0.querySelectorAll('.nt-trunk')].flatMap(r => JSON.parse(r.dataset.ntMembers)))];
      for (let s = 2; s < L; s += 2) { const p = t.getPointAtLength(s), x = m.a * p.x + m.c * p.y + m.e, y = m.b * p.x + m.d * p.y + m.f; if (document.elementFromPoint(x, y) === bh) return {x, y, node: bh.dataset.ntSelect, members, focusable: bh.tabIndex >= 0 || bh.hasAttribute('tabindex')}; }
      return null;
    });
    assert.ok(line && line.members.length >= 3 && !line.focusable, 'the board draws a serves line that takes the pointer and no Tab stop: ' + JSON.stringify(line && {node: line.node, members: line.members.length}));
    await page.mouse.click(line.x, line.y); await page.waitForTimeout(400);
    assert.equal(await page.$eval('.cm.dk .cm-svg .nt-node.sel', e => e.dataset.ntNode), line.node, 'a click on the serves line selects the component it serves');
    assert.ok(!(await page.$('.cm.dk .cm-svg .nt-edge.sel')), 'and no relationship');
    const picks = await page.$$eval('.cm-companion .nt-lines-node [data-nt="edge-pick"]', bs => bs.map(b => b.dataset.id));
    assert.deepEqual([...picks].sort(), [...line.members].sort(), 'its reading lists the line’s relationships, each a button');
    await page.click(`.cm-companion .nt-lines-node [data-nt="edge-pick"][data-id="${line.members[0]}"]`); await page.waitForTimeout(400);
    assert.equal(await page.$eval('.cm.dk .cm-svg .nt-edge.sel', e => e.dataset.ntEdge), line.members[0], 'a button selects that relationship');
    assert.deepEqual(await page.$$eval('.cm.dk .cm-svg .nt-lift path', ps => ps.map(p => p.dataset.ntLift)), [line.members[0]], 'lifted whole over the board');
    assert.match(await panel(), new RegExp(`Drawn on one line with ${line.members.length - 1} other serves relationships`), 'its reading names the line');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    await page.mouse.click(line.x, line.y); await page.waitForTimeout(400);
    assert.equal(await page.$eval('.cm.dk .cm-svg .nt-node.sel', e => e.dataset.ntNode), line.node);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    assert.ok(!(await page.$('.cm.dk .cm-svg .nt-node.sel')) && !(await page.$('.cm.dk .cm-svg .nt-edge.sel')), 'Escape clears the selection the line made');
  }
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('aiw:model-layers', {detail: ['process', 'logical', 'physical', 'data', 'technology', 'interface', 'security']}))); await page.waitForTimeout(400);
  assert.equal(await count('.cm.dk .cm-svg .nt-node'), 10, 'the deployment layer hidden, the parts go');
  assert.match(await page.$eval('.cm.dk .nt-layer-note', e => e.textContent), /14 hidden by layers/);
  assert.match(await page.$eval('.cm.dk .cm-state', e => e.textContent), /14 hidden by the layers/);
  await page.click('.cm.dk .nt-layer-note [data-nt="layers-all"]'); await page.waitForTimeout(400);
  assert.equal(await count('.cm.dk .cm-svg .nt-node'), 24, 'show brings them back');
  const cam = () => page.$eval('.cm.dk .cm-world', e => e.style.transform);
  const fitted = await cam();
  await act('.cm.dk .dk-controls [data-nt="zoom"][data-id="in"]');
  assert.notEqual(await cam(), fitted, 'the kit\'s zoom');
  // Round 7: the frame fills the stage column, so a fitted picture no longer runs past it; zoomed in, it does.
  assert.ok(await page.$('.cm.dk .cm-stage > .cm-minimap:not([hidden])'), 'the kit\'s overview while the picture runs past the stage');
  await act('.cm.dk .dk-controls [data-nt="zoom"][data-id="fit"]');
  assert.equal(await cam(), fitted, 'and its Fit');
  pass('selecting an element of the Running board selects the same record on the desk — the part\'s rows on Vitals, its reading in the companion, the address — and a vital read on Vitals is its part on the board; Enter and the arrow keys read and move without pinning; a relationship reads in the companion; the sidebar\'s layers hide the parts and say so; the kit\'s zoom, Fit and overview');

  // 1. Chapter 11 opens on the review desk.
  await open();
  assert.ok(await page.$('.cm.dk .cm-view[data-id="vitals"][aria-pressed="true"]'));
  assert.ok(!(await page.$('.am-explorer')), 'there is no second world: the explorer is retired');
  assert.equal(await count('.dk-monitor .dk-tile'), 8); assert.equal(await count('.dk-monitor .dk-ecg'), 8);
  assert.match(await page.$eval('.dk-monitor', e => e.innerText), /AVAILABILITY[\s\S]*99\.9 % · 43\.2 min \/ 30 d[\s\S]*CAPACITY[\s\S]*3,125 req\/s[\s\S]*OBSERVABILITY[\s\S]*0 of 14 monitored/i);
  assert.equal(await count('.dk-vt tbody tr[data-card]'), 14 * 8);
  assert.equal(new Set(await page.$$eval('.dk-vt tbody tr[data-card]', xs => xs.map(x => x.dataset.card.split(':')[1]))).size, 14, '14 running parts on 8 vitals');
  assert.equal(await count(':is(.cm.dk .cm-panel, .cm-companion.dk) .dk-chart, :is(.cm.dk .cm-panel, .cm-companion.dk) .dk-vd'), 0, 'nothing is selected on arrival');
  assert.match(await panel(), /Where to start[\s\S]*Record how the failure of 12 parts would be seen[\s\S]*Anti-patterns · Chapter 11 findings[\s\S]*Single Point of Failure/i);
  const density = await page.evaluate(() => ({stage: document.querySelector('.stage').innerText.split(/\s+/).filter(Boolean).length, companion: document.querySelector('#inspector').innerText.split(/\s+/).filter(Boolean).length}));
  assert.ok(density.stage < 1200 && density.companion < 300, 'Chapter 11 Model reads in under 1,200 words on the stage and 300 in the companion with nothing selected: ' + JSON.stringify(density));
  assert.ok(await count(':is(.cm.dk .cm-panel, .cm-companion.dk) details.dk-more:not([open]) > summary') >= 3, 'the readings in the companion are two lines with More');
  // The Scale reading (round 6, Contract K): one line that says what the recorded targets imply, the rest behind More.
  assert.match(await panel(), /SCALE\s*0\s*No rate, concurrent-user or data-volume target is recorded; QD-003 allows 2,000 ms; the reference round trips along the longest required path take about 21\.5 ms/, 'the Scale reading in one line');
  assert.ok(await page.$(':is(.cm.dk .cm-panel, .cm-companion.dk) details.dk-more[data-more="scale"]:not([open])'), 'with the rest behind More');
  const fold = await page.evaluate(() => ({hidden: document.querySelectorAll('.dk-vt tbody tr[data-card][hidden]').length, na: document.querySelectorAll('.dk-vt tbody tr[data-card].na').length, toggle: document.querySelector('.dk-vt tfoot [data-dk="na-toggle"]')?.textContent}));
  assert.ok(fold.hidden > 0 && fold.hidden === fold.na && fold.toggle === `Show the ${fold.na} readings not carried`, 'the readings a part does not carry fold behind one control: ' + JSON.stringify(fold));
  await act('.dk-vt tfoot [data-dk="na-toggle"]');
  assert.equal(await count('.dk-vt tbody tr[data-card][hidden]'), 0, 'and come back with it, every reading still a row');
  await act('.dk-vt tfoot [data-dk="na-toggle"]');
  assert.ok(await page.evaluate(() => { const rows = [...document.querySelectorAll('.dk-vt tbody tr[data-card]')], part = r => r.dataset.card.split(':')[1]; return rows.some((r, i) => i > 0 && part(rows[i - 1]) === part(r)) && rows.every((r, i) => { const b = r.querySelector('th .dk-part'), again = i > 0 && part(rows[i - 1]) === part(r); return again ? b.textContent.trim() === b.querySelector('b').textContent.trim() && b.getAttribute('aria-label').startsWith(b.textContent.trim() + ' ') : b.textContent.trim() === b.getAttribute('aria-label'); }); }), 'a part\'s name is written on the first of its rows; the others name its reference, the whole name in the label');
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.dk-vt tbody td')].filter(td => /min in \d+ days/.test(td.textContent)).length), 0, 'a target\'s translation into minutes is in its title, not repeated in each cell');
  assert.ok(await count('.dk-vt tbody .dk-rx-w abbr[title="A fix is drafted"]') > 20 && /℞: a fix is drafted/.test(await page.$eval('.dk-vt caption', e => e.textContent)), '℞ is explained once, in the caption');
  pass('Chapter 11 opens on the review desk: a monitor of 8 system vitals with a heartbeat for every running part, 14 parts on 8 vitals, the Scale reading in one line, and where to start with the anti-patterns as findings — in ' + density.stage + ' words on the stage and ' + density.companion + ' in the companion, the readings two lines with More, the table without repeated words and the readings not carried folded');

  // 2. A vital reads its arithmetic, the tactics that would move it and where to change it.
  const before = await rowOrder();
  await act('.dk-vt tbody tr[data-card="C:run-001:capacity"]');
  let p = await panel();
  assert.match(p, /Capacity · RUN-001[\s\S]*Critical[\s\S]*needs 24 replicas[\s\S]*can grow to 1[\s\S]*short by 23[\s\S]*What would move it[\s\S]*Horizontal Scaling[\s\S]*Stateless Design/i);
  assert.ok(await page.$(':is(.cm.dk .cm-panel, .cm-companion.dk) a[href*="chapter=10"][href*="object=run-001"]'), 'the fix opens Chapter 10 on the plan');
  assert.equal(await rowOrder(), before, 'selecting moves nothing');
  await act('.dk-monitor .dk-tile[data-id="integrity"]');
  assert.ok(await page.$('.dk-monitor .dk-tile[data-id="integrity"][aria-pressed="true"]') && await count('.dk-vt tbody tr[data-card]') === 14, 'a monitor tile follows its vital down every part');
  assert.match(await page.$eval('.dk-controls', e => e.innerText), /Integrity only/);
  assert.equal(await page.$eval('.dk-vt tbody tr.sel', e => e.dataset.card), 'C:run-001:integrity', 'the selection follows the vital');
  pass('a vital reads what is recorded against its target, the playbook tactics that would move it and the chapter that changes it; a monitor tile follows one vital down every part; nothing moves');

  // 3. Probes pin a part's chart to the desk and stay there.
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await act('.dk-vt .dk-part[data-sel="run-001"]');
  await act(':is(.cm.dk .cm-panel, .cm-companion.dk) [data-dk="probe"][data-id="run-001"]');
  assert.ok(await page.$(':is(.cm.dk .cm-panel, .cm-companion.dk) [data-dk="probe"][data-id="run-001"][aria-pressed="true"]'));
  assert.match(await page.$eval('.dk-probes', e => e.innerText), /Probes[\s\S]*1 of 4[\s\S]*RUN-001 Payment service[\s\S]*Capacity/i);
  assert.match(await page.$eval('.dk-vt tr[data-card="C:run-001:capacity"] th', e => e.innerText), /probe plugged in/);
  await act('[data-dk="filter"][data-id="probed"]');
  assert.equal(await count('.dk-vt tbody tr[data-card]'), 8);
  await page.reload({waitUntil: 'networkidle'}); await page.waitForSelector('.cm.dk .dk-vt'); await page.waitForTimeout(500);
  assert.equal(await count('.dk-vt tbody tr[data-card]'), 8, 'the probes and the filter are kept'); assert.ok(await page.$('.dk-probes'));
  await act('[data-dk="filter"][data-id="all"]');
  await act('.dk-vt .dk-part[data-sel="run-004"]'); await page.waitForTimeout(100);
  p = await panel();
  assert.match(p, /Running part · RUN-004[\s\S]*Settlement worker[\s\S]*Availability[\s\S]*Recovery[\s\S]*Decisions behind it[\s\S]*ADR-001[\s\S]*Specification/i);
  pass('a probe pins a part\'s chart to the desk, the probed parts can be shown alone, and the probes stay across reloads; a part reads its vitals, the decisions behind it and its specification');

  // 4. What it takes: an objective turned into a specification, explored before it is saved.
  await act('[data-dk="view"][data-id="load"]');
  assert.equal(await count('.dk-st tbody tr.dk-sr'), 16);
  assert.match(await page.$eval('.dk-st tr[data-card="api-pod"]', e => e.innerText), /APP-001\s*Payment service[\s\S]*Kubernetes 1\.31[\s\S]*Short[\s\S]*3,125 req\/s[\s\S]*Replicas\s*24/i);
  assert.match(await page.$eval('.dk-st tr[data-card="tr-002"]', e => e.innerText), /PostgreSQL 17[\s\S]*One primary\s*past it above ≈75,000 users/i);
  assert.match(await page.$eval('.dk-monitor', e => e.innerText), /100,000 concurrent users[\s\S]*saved for this review[\s\S]*3,125 req\/s[\s\S]*163[\s\S]*16 nodes/i);
  await page.fill('[data-dk-in="value"]', '250000'); await page.waitForTimeout(700);
  assert.match(await page.$eval('.cm.dk .cm-state', e => e.textContent), /250,000 users ÷ \(30 s between requests \+ 2 s response \(QD-003\)\) = 7,813 req\/s/);
  assert.ok(await page.$('[data-dk="reset-objective"]'), 'an explored objective can be reset');
  await act('.dk-st tr[data-card="api-pod"]');
  p = await panel();
  assert.match(p, /Service · APP-001[\s\S]*7,813 req\/s[\s\S]*The arithmetic[\s\S]*7,813 ÷ \(200 × 70 %\)[\s\S]*Each replica handles/i);
  await page.fill(':is(.cm.dk .cm-panel, .cm-companion.dk) [data-dk-in="perReplica"]', '1000'); await page.waitForTimeout(700);
  assert.match(await page.$eval('.dk-st tr[data-card="api-pod"]', e => e.innerText), /Replicas\s*13/, 'a load-tested throughput replaces the assumption');
  await act('.dk-st tr[data-card="tr-003"]');
  assert.match(await panel(), /RabbitMQ[\s\S]*Backlog to hold[\s\S]*Product rules[\s\S]*quorum queues[\s\S]*Where it is documented/i);
  await act('[data-dk="save-objective"]');
  await page.waitForSelector('dialog.dk-dialog[open]');
  assert.deepEqual(await page.$eval('dialog.dk-dialog [name=reviewer]', e => [e.readOnly, e.value]), [true, 'local-architect'], 'the objective is set by the signed-in account, not a typed name');
  await page.check('dialog.dk-dialog [name=reviewed]');
  await page.click('dialog.dk-dialog button[type=submit]'); await page.waitForTimeout(1200);
  assert.ok(!(await page.$('dialog.dk-dialog[open]')));
  assert.match(await page.$eval('.dk-flash', e => e.innerText), /Saved: this review plans for 250,000 concurrent users/);
  assert.ok(await page.$('.dk-saved'), 'the objective reads as saved');
  assert.match(await page.$eval('.dk-monitor', e => e.innerText), /250,000 concurrent users[\s\S]*saved for this review/i);
  pass('what it takes: 100,000 concurrent users become a specification for every part — 24 replicas of APP-001, 940 PostgreSQL connections — explored at 250,000 and with a load-tested throughput before anything is saved, the arithmetic and product rules shown with their sources, then saved as the review objective through its own confirmation');

  // 4b. The product choice: weighed against the drivers, with the objective's switch point.
  assert.match(await page.$eval('.dk-monitor', e => e.innerText), /PRODUCT CHOICES[\s\S]*3 to revisit[\s\S]*of 9 with alternatives/i);
  assert.match(await page.$eval('.dk-st tr[data-card="tr-003"]', e => e.innerText), /The drivers lean to Apache Kafka \(suggested\)/);
  if (!(await page.$('.dk-st tr[data-card="tr-003"].sel'))) await act('.dk-st tr[data-card="tr-003"]');
  p = await panel();
  assert.match(p, /The product choice[\s\S]*RabbitMQ[\s\S]*one queue[\s\S]*lean to Apache Kafka[\s\S]*One queue's leader takes every message on it[\s\S]*As the drivers weigh them[\s\S]*Record 12 suggested judgements in Chapter 7/i);
  assert.ok(await page.$(':is(.cm.dk .cm-panel, .cm-companion.dk) .ch-table td.suggested') && await page.$(':is(.cm.dk .cm-panel, .cm-companion.dk) .ch-table thead th.lean'));
  // Round 25 (D-25-11): on the recorded judgements alone, the range each total could move to while criteria are unjudged.
  // The objective holds no recorded judgement and takes no part in that weighing (product-choice.js), so the range is
  // that of the criteria a person can judge.
  assert.match(p, /As the drivers weigh them[\s\S]*recorded 0, between −16 and \+16 once every criterion is judged[\s\S]*Arithmetic on the recorded effects, not a measurement; it does not choose\./i);
  await act(':is(.cm.dk .cm-panel, .cm-companion.dk) [data-dk="record-suggestions"]');
  await page.waitForSelector('dialog.ch-dialog[open]');
  assert.equal(await count('dialog.ch-dialog [name=s]'), 12); assert.equal(await count('dialog.ch-dialog [name=s]:checked'), 10, 'a product the playbook merely names is left unticked');
  await page.check('dialog.ch-dialog [name=reviewed]'); await page.click('dialog.ch-dialog button[type=submit]'); await page.waitForTimeout(2500);
  assert.match(await page.$eval('.dk-flash', e => e.innerText), /10 judgements recorded in Chapter 7 for TR-003/);
  await page.goto(base + '/?chapter=7&tab=model&model=stack', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.sk'); await page.waitForTimeout(500);
  await page.$eval('.sk-rec[data-sel="tr-003"]', e => e.click()); await page.waitForTimeout(400);
  await page.$eval(':is(.cm .cm-panel, .cm-companion) [data-sk="compare"]', e => e.click()); await page.waitForTimeout(800);
  assert.equal(await count('.sk-weigh'), 2); assert.ok(await page.$('.sk-weigh.lean') && await page.$('.sk-lean'));
  assert.equal(await count('.sk-as.supports:not(.sug)'), 7, 'the recorded judgements stand in Chapter 7');
  assert.match(await panel(), /The choice · TR-003[\s\S]*10 recorded[\s\S]*recorded judgements lean to Apache Kafka/i);
  await open();
  pass('each product choice is weighed against the drivers it carries: suggestions from what each product is documented to do, the lean, and where the objective passes one queue; recorded through Chapter 7\'s own judgements, they stand in Chapter 7\'s options with the weighing');

  // 5. Trace, a decision probe, and asking both ways to review.
  await act('[data-dk="view"][data-id="trace"]');
  assert.equal(await count('.dk-tt tbody tr'), 5); assert.equal(await count('.dk-tt tbody tr:first-child .dk-path > li'), 9);
  assert.equal(await count('.dk-tt tbody tr.broken'), 0, 'every thread reaches where it runs');
  await act('.dk-tt .dk-pchip[data-sel="ADR-001"]');
  p = await panel();
  assert.match(p, /Decision · ADR-001[\s\S]*the drivers lean to[\s\S]*Acknowledge a durable asynchronous handoff[\s\S]*Request-Reply[\s\S]*Message Broker[\s\S]*What choosing it reaches[\s\S]*Earlier chapters[\s\S]*REQ-001[\s\S]*QD-006[\s\S]*Later chapters[\s\S]*RUN-004[\s\S]*Ask these 16 records to review/i);
  await act(':is(.cm.dk .cm-panel, .cm-companion.dk) [data-dk="ask-decision"]');
  await page.waitForSelector('dialog.dk-dialog[open]');
  assert.equal(await count('dialog.dk-dialog [name=item]:checked'), 16);
  await page.check('dialog.dk-dialog [name=reviewed]');
  await page.click('dialog.dk-dialog button[type=submit]'); await page.waitForTimeout(1200);
  assert.match(await page.$eval('.dk-flash', e => e.innerText), /CHG-\d{3} recorded: 16 records asked to review/);
  assert.ok(await page.$('.dk-flash [data-dk="open-change"]'));
  pass('the trace follows each requirement through the chapters; a decision under a probe reads its alternatives, their patterns and effects, and what it reaches both ways — and asks those 16 records to review, remembering who asks');

  // 6. Choosing a decision asks earlier and later chapters to review.
  const events = () => page.evaluate(() => window.aiwProjectStore.value.document.changes.events.length);
  const n0 = await events();
  await page.evaluate(() => window.aiwProjectStore.command({type: 'decision.choose', payload: {id: 'ADR-002', alternativeId: 'ALT-003'}}));
  const doc = await page.evaluate(() => window.aiwProjectStore.value.document);
  assert.equal(doc.changes.events.length, n0 + 1);
  const ev = doc.changes.events.at(-1);
  assert.equal(ev.source.id, 'ADR-002'); assert.ok(ev.items.some(i => i.chapter === 1) && ev.items.some(i => i.chapter === 2) && ev.items.some(i => i.chapter >= 4));
  await page.goto(base + '/?chapter=2&tab=work', {waitUntil: 'networkidle'}); await page.waitForTimeout(900);
  // Counted by cause since round 12 (D-05, G, GR-UX-01): the notice counts the reviews open across their causes and names
  // the largest.
  assert.match(await page.evaluate(() => document.body.innerText), /[\d,]+ reviews? open across \d+ causes?[\s\S]*Largest: [\s\S]*ADR-002 changed · [\d,]+/, 'an earlier chapter is told');
  pass('choosing a working choice in Chapter 3 records a change that asks Chapters 1 and 2 as well as the later chapters to review, and an earlier chapter shows it');

  // 7. The rounds.
  await open();
  await act('[data-dk="walk-next"]');
  assert.match(await page.$eval('.cm-walk', e => e.innerText), /1 \/ \d+\s+Record how the failure of 12 parts would be seen/);
  assert.equal(await count('.dk-vt tbody tr.lit'), 12);
  await act('[data-dk="walk-next"]');
  assert.match(await page.$eval('.cm-walk', e => e.innerText), /2 \/ \d+\s+Size 9 parts for the objective|2 \/ \d+/);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  assert.equal(await count('.dk-vt tbody tr.lit'), 0);
  pass('the rounds walk the vitals that read critical or silent, the most first, then each anti-pattern; Escape stops');

  // 8. Validate offers its two readings without mounting the desk. Chapter 11's checks link to the desk.
  await page.goto(base + '/?chapter=5&tab=validate', {waitUntil: 'networkidle'}); await page.waitForSelector('.vx-head'); await page.waitForTimeout(500);
  assert.ok(await page.$('.vx-switch [data-vx-lens-view="sdd"][aria-pressed="true"]'), 'Validate opens on SDD readiness');
  assert.ok(!(await page.$('.cm.dk')), 'Validate does not mount the review desk');
  await page.click('.vx-switch [data-vx-lens-view="model"]');
  assert.ok(await page.$('.vx-switch [data-vx-lens-view="model"][aria-pressed="true"]'), 'Model integrity is selectable');
  await page.click('.vx-switch [data-vx-lens-view="sdd"]');
  await page.goto(base + '/?chapter=11&tab=validate', {waitUntil: 'networkidle'}); await page.waitForSelector('.vx-head'); await page.waitForTimeout(500);
  await page.click('.vx-desk-link a'); await page.waitForSelector('.cm.dk .cm-view'); await page.waitForTimeout(300);
  assert.match(page.url(), /chapter=11&tab=model/);
  await page.goto(base + '/?chapter=5&tab=validate', {waitUntil: 'networkidle'}); await page.waitForSelector('.vx-head'); await page.waitForTimeout(500);
  await page.evaluate(async () => { const m = await import('/desk-view.js'); m.mountDesk({chapter: 5}); });
  await page.waitForSelector('.cm.dk .dk-monitor .dk-tile'); await page.waitForTimeout(300);
  assert.equal(await page.$eval('.cm.dk .cm-title small', e => e.textContent), 'Chapter 5 · Validate', 'mountDesk still mounts the desk for the transition');
  await page.evaluate(async () => { const m = await import('/desk-view.js'); m.leaveDesk(); });
  assert.ok(!(await page.$('.cm.dk')) && !(await page.evaluate(() => document.body.classList.contains('dk-validate'))));
  pass('Validate switches between SDD readiness and Model integrity without mounting the review desk: Chapter 11\'s checks link to it on Chapter 11\'s Model; mountDesk and leaveDesk still work for the transition');

  // 9. Treating an anti-pattern in Chapter 11.
  await open();
  await act(':is(.cm.dk .cm-panel, .cm-companion.dk) [data-dk="treat"]');
  await page.waitForSelector('dialog[open]', {timeout: 5000});
  assert.match(await page.$eval('dialog[open]', e => e.innerText), /Treat this finding[\s\S]*Single Point of Failure/i);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  if (await page.$('dialog[open]')) await page.evaluate(() => document.querySelector('dialog[open]').close());
  pass('an anti-pattern on the desk is treated with Chapter 11\'s own assessment');

  // 10. Drafted fixes: preview on the desk, change the number, apply through the change review.
  await open();
  assert.match(await page.$eval(':is(.cm.dk .cm-panel, .cm-companion.dk) .dk-tray', e => e.innerText), /Drafted fixes[\s\S]*drafted from the desk's own numbers[\s\S]*needs? your judgement/i);
  assert.ok(await count('.dk-vt .dk-rx-w') > 20, 'the readings with a drafted fix carry ℞');
  assert.ok(await count(':is(.cm.dk .cm-panel, .cm-companion.dk) .dk-step .dk-rxn') >= 5 && await count(':is(.cm.dk .cm-panel, .cm-companion.dk) [data-dk="fix-apply-step"]') >= 5, 'each step of where to start offers its drafts');
  await act('[data-card="C:run-001:capacity"]');
  const fx = await page.$$eval(':is(.cm.dk .cm-panel, .cm-companion.dk) .dk-fix', xs => xs.map(e => e.innerText).join('\n'));
  const need = Number((fx.match(/Let RUN-001 grow to ([\d,]+) replicas/) || [])[1]?.replace(/,/g, ''));
  assert.ok(need > 1, 'the draft names the replicas the objective needs'); assert.match(fx, /What changes · 1[\s\S]*Maximum replicas[\s\S]*On the desk[\s\S]*1 vital change: 1 to normal/i);
  assert.equal(await page.$eval('.dk-fix [data-dk-in="fix"][data-key="maxReplicas"]', e => e.value), String(need));
  await act('.dk-fix [data-dk="fix-preview"]');
  assert.ok(await page.$('.dk-preview')); assert.match(await page.$eval('.dk-preview', e => e.innerText), /Preview · nothing is applied[\s\S]*1 vital change: 1 to normal/i);
  assert.match(await page.$eval('.dk-vt tr.ok.chg[data-card="C:run-001:capacity"]', e => e.innerText), /Normal[\s\S]*was Critical/, 'the reading reads as it would, marked, with the state it had');
  assert.ok(await page.$('.dk-monitor .dk-tile.chg'), 'the monitor shows what would change');
  await page.fill('.dk-fix [data-dk-in="fix"][data-key="maxReplicas"]', '2'); await page.waitForTimeout(700);
  assert.ok(await page.$('.dk-vt tr.bad[data-card="C:run-001:capacity"]'), 'two replicas are still short: the desk reads the architect\'s number');
  await page.fill('.dk-fix [data-dk-in="fix"][data-key="maxReplicas"]', String(need)); await page.waitForTimeout(700);
  assert.ok(await page.$('.dk-vt tr.ok.chg[data-card="C:run-001:capacity"]'));
  await page.$eval('.dk-fix [data-dk-in="fix"]', e => e.blur()); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  assert.ok(!(await page.$('.dk-preview')), 'Escape stops the preview');
  await act(':is(.cm.dk .cm-panel, .cm-companion.dk) .dk-fix [data-dk="fix-apply"]');
  await page.waitForSelector('dialog[open]', {timeout: 5000});
  assert.match(await page.$eval('dialog[open]', e => e.innerText), /Review this design change[\s\S]*Drafted on the review desk[\s\S]*maxReplicas[\s\S]*I reviewed the changed definition/);
  await page.click('dialog[open] [data-wb-action="apply-preview"]'); await page.waitForTimeout(250);
  assert.match(await page.$eval('dialog[open] [data-error]', e => e.textContent), /Review the changed definition/, 'nothing is applied unreviewed');
  let was = await flashNow();
  await page.check('dialog[open] [data-reviewed]'); await page.click('dialog[open] [data-wb-action="apply-preview"]');
  const applied = await nextFlash(was, '.dk-vt tr.ok.pulse[data-card="C:run-001:capacity"]');
  assert.match(await page.$eval('.dk-flash', e => e.innerText), /Applied through Chapter 10's change review: Let RUN-001 grow to [\d,]+ replicas\. 1 vital change: 1 to normal/);
  assert.ok(applied.with, 'the reading turns, and pulses');
  assert.equal(await page.evaluate(() => window.aiwProjectStore.value.document.runtime.plans.find(r => r.id === 'run-001').maxReplicas), need);
  pass('a drafted fix: preview it and the reading reads as it would, marked with the state it had; change its number and the desk reads it again; unreviewed it is refused; applied through Chapter 10\'s change review the reading turns normal and pulses');

  // A whole step at once, and keeping a draft as an alternative instead.
  await page.evaluate(() => document.querySelector('.cm-crumbs [data-dk="clear"]')?.click()); await page.waitForTimeout(300); // the crumbs name a selection; with none there is nothing to clear
  const step = await page.$$eval(':is(.cm.dk .cm-panel, .cm-companion.dk) .dk-step', xs => xs.findIndex(x => /Record how the failure of 12 parts would be seen/.test(x.innerText)));
  assert.ok(step >= 0);
  await act(`:is(.cm.dk .cm-panel, .cm-companion.dk) [data-dk="fix-apply-step"][data-i="${step}"]`);
  await page.waitForSelector('dialog[open]', {timeout: 5000});
  assert.match(await page.$eval('dialog[open]', e => e.innerText), /12 changes[\s\S]*12 to normal/);
  was = await flashNow();
  await page.check('dialog[open] [data-reviewed]'); await page.click('dialog[open] [data-wb-action="apply-preview"]');
  await nextFlash(was);
  assert.match(await page.$eval('.dk-flash', e => e.innerText), /Applied through Chapter 10's change review: 12 drafted fixes\. 12 vitals change: 12 to normal/);
  assert.match(await page.$eval('.dk-monitor', e => e.innerText), /12 of 14 monitored/);
  await act('[data-card="C:run-001:integrity"]');
  await act(':is(.cm.dk .cm-panel, .cm-companion.dk) .dk-fix [data-dk="fix-apply"]');
  await page.waitForSelector('dialog[open]', {timeout: 5000});
  was = await flashNow();
  await page.click('dialog[open] [data-wb-action="retain-preview"]'); await page.fill('dialog[open] [name="title"]', 'Idempotency keys from the desk'); await page.click('dialog[open] [data-wb-action="retain-preview"]');
  await nextFlash(was);
  assert.match(await page.$eval('.dk-flash', e => e.innerText), /Kept as a design alternative, “Idempotency keys from the desk”: nothing changed in the working design/);
  assert.ok(await page.$('.dk-vt tr.bad[data-card="C:run-001:integrity"]'), 'kept, not applied');
  pass('a whole step at once: monitoring for 12 parts in one Chapter 10 review turns 12 readings normal; a draft kept as a design alternative leaves the working design as it was');

  // Sol without a provider: what it would read is still shown, and nothing can be sent.
  assert.match(await page.$eval('.dk-solchip', e => e.innerText), /Sol\s*not connected/);
  await act('[data-card="C:run-001:integrity"]');
  await act(':is(.cm.dk .cm-panel, .cm-companion.dk) [data-dk="sol-ask"]'); await page.waitForSelector('.dk-solpend', {timeout: 5000});
  assert.match(await page.$eval('.dk-solpend', e => e.innerText), /Sol will read your question, \d+ selected decisions?, their recorded values and options, the objective and policy context, and \d+ sources: [\s\S]*desk reading[\s\S]*Sol is not connected/i);
  assert.ok(await page.$('.dk-solpend [data-dk="sol-send"][disabled]'), 'nothing can be sent without a provider');
  await act('.dk-solpend [data-dk="sol-cancel"]');
  assert.ok(!(await page.$('.dk-solpend')));
  pass('without a provider Sol says so; what it would read is still prepared and shown, and nothing can be sent');

  // Preview them all.
  await page.evaluate(() => document.querySelector('.cm-crumbs [data-dk="clear"]')?.click()); await page.waitForTimeout(300); // the crumbs name a selection; with none there is nothing to clear
  await act(':is(.cm.dk .cm-panel, .cm-companion.dk) [data-dk="fix-preview-all"]');
  assert.match(await page.$eval('.dk-preview', e => e.innerText), /drafted fixes[\s\S]*to normal/i);
  assert.ok(await count('.dk-vt tbody tr.chg') > 20);
  assert.match(await panel(), /Previewing[\s\S]*nothing applied[\s\S]*Review the first 20 changes/i);
  await act('.dk-preview [data-dk="fix-stop"]');
  assert.equal(await count('.dk-vt tbody tr.chg'), 0);
  pass('every drafted fix previewed together shows the monitor as it would read, to be reviewed 20 changes at a time');

  // 10b. A broken thread is named where it first breaks.
  const mapping = await page.evaluate(() => window.aiwProjectStore.value.document.logical.mappings.find(m => m.logicalId === 'api')?.id);
  await page.evaluate(id => window.aiwProjectStore.command({type: 'logical.remove-mapping', payload: {id}}), mapping);
  await openTable('trace');
  assert.equal(await count('.dk-tt tbody tr.broken'), 1);
  assert.match(await page.$eval('.dk-tt tr[data-card="REQ-001"]', e => e.innerText), /The thread breaks here: none recorded[\s\S]*Breaks at components[\s\S]*Chapter 5 records nothing this requirement passes through/);
  assert.equal(await page.$eval('.dk-tt tr[data-card="REQ-001"] .dk-path > li.first > small', e => e.textContent), 'Ch 5 · Components', 'the first broken link is marked in the path');
  await act('.dk-tt thead [data-dk="sort"][data-id="break"]');
  assert.equal(await page.$eval('.dk-tt tbody tr', e => e.dataset.card), 'REQ-001', 'broken threads sort first');
  pass('a broken thread: with REQ-001\'s responsibility mapped to no component, its row names the first broken link — components, in Chapter 5 — and marks it in the path; broken threads sort first');

  // 11. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const m = await phone.newPage(); m.on('pageerror', e => errors.push(e.message));
  await m.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'}); await m.waitForSelector('.cm.dk .dk-sheet table'); await m.waitForTimeout(500);
  const sheet = await m.$eval('.dk-sheet', e => { const r = e.getBoundingClientRect(); return [r.width, r.height, e.scrollHeight]; });
  assert.ok(sheet[0] > 300 && sheet[1] > 300, 'a usable table');
  assert.ok(sheet[2] > sheet[1] * 3 && await m.$eval('.cm.dk', e => e.getBoundingClientRect().height) < 2000, 'the 112 rows scroll inside the stage instead of making the model page-long: ' + JSON.stringify(sheet));
  await m.focus('.dk-vt tbody tr[tabindex="0"]'); await m.keyboard.press('End'); await m.waitForTimeout(150);
  assert.ok(await m.evaluate(() => { const a = document.activeElement, box = document.querySelector('.dk-sheet').getBoundingClientRect(), r = a.getBoundingClientRect(); return a === [...document.querySelectorAll('.dk-vt tbody tr[data-card]:not([hidden])')].at(-1) && r.top >= box.top - 1 && r.bottom <= box.bottom + 1; }), 'End reaches the last row shown and scrolls it into view');
  assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal page scroll');
  await m.$eval('.cm.dk .cm-view[data-id="board"]', e => e.click()); await m.waitForSelector('.cm.dk .cm-svg .nt-node'); await m.waitForTimeout(600);
  const box = await m.$eval('.cm.dk .cm-stage', e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
  assert.ok(box[0] > 300 && box[1] > 300, 'a usable stage: ' + box);
  assert.equal(await m.$$eval('.cm.dk .cm-svg .nt-node[class*="nt-v-"]', xs => xs.length), 14);
  const fit = await m.evaluate(() => { const st = document.querySelector('.cm.dk .cm-stage'); return {overflow: getComputedStyle(st).overflow, z: Number(/scale\(([\d.]+)\)/.exec(document.querySelector('.cm.dk .cm-world').style.transform)?.[1])}; });
  assert.ok(fit.overflow === 'hidden' && fit.z >= 0.5 && fit.z <= 1.05, 'the picture stays inside the stage at the kit\'s fit, never so far that the words vanish: ' + JSON.stringify(fit));
  assert.ok(await m.$('.cm.dk .cm-stage > .cm-minimap:not([hidden])'), 'with the overview to move around it');
  assert.ok(await m.evaluate(() => [...document.querySelectorAll('.cm.dk .cm-svg .nt-node[class*="nt-v-"] .nt-sub')].every(t => getComputedStyle(t).visibility === 'visible' && parseFloat(getComputedStyle(t).fontSize) >= 12)), 'each part keeps its state in words');
  assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal page scroll');
  await phone.close();
  pass('on a 390 px phone the desk\'s table scrolls inside the stage (keyboard included) and the Running board stays inside the stage at the kit\'s phone fit, with its overview and every state in words, with no horizontal page scroll');

  // 12. Round 25: a decision probe shows the decision reading, in light and in dark: the alternative that leads on the
  // drivers (★, never "favoured") and how firmly it holds, a dominated alternative, and one a hard constraint rules out.
  // The constraint is set through the project's own commands, each ordinary change reviewed by a person.
  {
    const command = async (type, payload) => {
      await page.evaluate(([type, payload]) => { window.__aiwCmd = null; window.aiwProjectStore.command({type, payload}).then(() => { window.__aiwCmd = 'ok'; }, e => { window.__aiwCmd = 'error: ' + e.message; }); }, [type, payload]);
      const seen = await (await page.waitForFunction(() => window.__aiwCmd || (document.querySelector('dialog.wb-dialog[open]') ? 'review' : null), null, {timeout: 15000})).jsonValue();
      if (seen === 'review') { await page.check('dialog.wb-dialog [data-reviewed]'); await page.fill('dialog.wb-dialog [name=reason]', 'Synthetic facts for the decision reading, reviewed.'); await page.click('dialog.wb-dialog [data-wb-action="apply-preview"]'); await page.waitForFunction(() => window.__aiwCmd, null, {timeout: 15000}); }
      assert.equal(await page.evaluate(() => window.__aiwCmd), 'ok', type);
    };
    const docNow = () => page.evaluate(() => window.aiwProjectStore.value.document);
    await command('quality.driver', {kind: 'constraint', title: 'Post through the existing core ledger', description: 'Every posting goes through the existing core ledger.', impact: 'Rules out a second store of postings.', constraintIds: ['CON-001'], priority: 'High'});
    let d = await docNow();
    const C = d.quality.drivers.at(-1).id, d2 = () => d.decisions.records.find(x => x.id === 'ADR-002');
    await command('decision.save', {id: 'ADR-002', driverIds: [...d2().driverIds, C]});
    d = await docNow();
    await command('decision.alternative', {id: 'ADR-002', alternativeId: 'ALT-004', assessments: {...d2().alternatives.find(a => a.id === 'ALT-004').assessments, [C]: {effect: 'violates', reason: 'The cache keeps its own record of postings.', evidence: 'Synthetic design review notes.'}}});
    const ratio = sel => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const parse = c => c.match(/[\d.]+/g).slice(0, 3).map(Number), lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }; let g = e; while (g && /rgba\(.*,\s*0\)$|transparent/.test(getComputedStyle(g).backgroundColor)) g = g.parentElement; const a = lum(parse(getComputedStyle(e).color)), b = lum(parse(getComputedStyle(g || document.body).backgroundColor)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }, sel);
    for (const theme of ['light', 'dark']) {
      await open();
      await page.click(`.top-actions [data-theme-choice="${theme}"]`); await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
      await act('[data-dk="view"][data-id="trace"]');
      await act('.dk-tt .dk-pchip[data-sel="ADR-001"]');
      p = await panel();
      assert.match(p, /Decision · ADR-001[\s\S]*the drivers lean to[\s\S]*Acknowledge a durable asynchronous handoff[\s\S]*The lead holds if drivers of the same priority count alike, not for every weighting the priorities allow\.[\s\S]*★ ALT-002 Acknowledge a durable asynchronous handoff \+2[\s\S]*★ Leads on the drivers · holds if same-priority drivers count alike[\s\S]*Arithmetic on the recorded effects, not a measurement; it does not choose\./i, theme + ': the lead and how firmly it holds');
      assert.ok((await ratio(':is(.cm.dk .cm-panel, .cm-companion.dk) .dk-alt .dk-stand.lead')) >= 4.5, theme + ': the lead\'s line reads at 4.5:1');
      await act('.dk-tt .dk-pchip[data-sel="ADR-003"]');
      assert.match(await panel(), /Decision · ADR-003[\s\S]*Retry immediately after a timeout is dominated by Enquire and reconcile before replay[\s\S]*ALT-006 Retry immediately after a timeout −8[\s\S]*Dominated by ALT-005/i, theme + ': a dominated alternative');
      await act('.dk-tt .dk-pchip[data-sel="ADR-002"]');
      p = await panel();
      assert.match(p, new RegExp(`Decision · ADR-002[\\s\\S]*Working choice: Enforce the reference at the posting boundary\\.[\\s\\S]*Suppress repeats in the application cache is ruled out: it breaks ${C}, a hard constraint\\.[\\s\\S]*Enforce the reference at the posting boundary is the only alternative a hard constraint does not rule out\\.[\\s\\S]*ALT-004 Suppress repeats in the application cache −4[\\s\\S]*Ruled out · breaks ${C}`, 'i'), theme + ': the ruled-out alternative, and the working choice\'s standing');
      assert.doesNotMatch(p, /favou?r|scored|winner|recommends|AIW chooses/i);
      assert.ok((await ratio(':is(.cm.dk .cm-panel, .cm-companion.dk) .dk-alt .dk-stand.out')) >= 4.5, theme + ': the ruled-out line reads at 4.5:1');
      pass(`${theme}: a decision probe shows the reading — the alternative that leads on the drivers and how firmly it holds, a dominated alternative, one a hard constraint rules out, the working choice's standing and the reading's note — its new state lines at 4.5:1`);
    }
    await page.click('.top-actions [data-theme-choice="light"]'); await page.waitForTimeout(200);
  }

  // Round 12 (G): the desk at the size of an import, on the synthetic large project of figures-at-size-fixture.mjs (1,400
  // requirements in 60 groups, 180 components, 100 running parts; generic names), restored as a project of its own, in a
  // fresh tab. GR-FIG-07: the trace pages its rows by requirement group (one group open, its rows a page at a time) and
  // caps its companion lists, under 20,000 DOM nodes. GR-FIG-11: a line between groups on the Running board lists the
  // relationships it stands for, and "Show every element" draws the whole board. GR-RUN-04: no load is stated, so the
  // capacity tile says so and What it takes computes nothing until the reader explores the example, which is labelled.
  {
    const {buildFiguresProject} = await import('./figures-at-size-fixture.mjs'), {restoreScaleProject} = await import('./scripts/build-scale-fixture.mjs');
    const big = await buildFiguresProject(), R = await restoreScaleProject({base, document: big.document, name: 'Synthetic bank platform'});
    const lctx = await browser.newContext({viewport: {width: 1440, height: 900}}), L = await lctx.newPage(); L.setDefaultTimeout(60000);
    L.on('pageerror', e => errors.push(e.message));
    const lview = async id => { await L.evaluate(v => document.querySelector(`.cm.dk .cm-view[data-id="${v}"]`).click(), id); await L.waitForTimeout(700); };
    const lpanel = () => L.evaluate(() => [...document.querySelectorAll('.cm-companion, .cm .cm-panel')].map(e => e.innerText).join('\n'));
    await L.goto(`${base}/?chapter=11&tab=model&project=${encodeURIComponent(R.id)}`, {waitUntil: 'domcontentloaded'}); await L.waitForSelector('.cm.dk .cm-view', {timeout: 60000});
    // GR-RUN-04 on screen.
    await lview('vitals');
    assert.match(await L.$eval('.dk-monitor', e => e.innerText), /CAPACITY · DESIGN\s*no load stated/i, 'the capacity tile says no load is stated and labels it as a design reading');
    await lview('load');
    assert.match(await L.$eval('.dk-st', e => e.innerText), /Objective\s*No load stated[\s\S]*No capacity reading/, 'What it takes computes nothing without a load');
    await L.evaluate(() => document.querySelector('.dk-st [data-dk="explore-example"]').click()); await L.waitForSelector('.dk-st tr.dk-sr', {timeout: 60000});
    const sheetText = await L.$eval('.dk-st', e => e.innerText);
    assert.match(sheetText, /100,000 concurrent users, assumed \(playbook example\)/, 'the example, once explored, says it is assumed');
    const labelled = await L.evaluate(() => ({heads: [...document.querySelectorAll('.dk-st tr.dk-objr')].filter(r => /^(Objective|Arrival rate|Running it takes)/.test(r.innerText)).map(r => r.querySelector('td b')?.textContent || ''), rows: [...document.querySelectorAll('.dk-st tr.dk-sr .dk-takes')].map(p => p.textContent)}));
    assert.ok(labelled.heads.length === 3 && labelled.rows.length > 10 && [...labelled.heads, ...labelled.rows].every(t => t.includes('assumed (playbook example)')), `the objective, the arrival rate, what running it takes and each of the ${labelled.rows.length} parts' demand say the figure is assumed (playbook example)`);
    await L.evaluate(() => document.querySelector('[data-dk="reset-objective"]').click()); await L.waitForTimeout(600);
    assert.match(await L.$eval('.dk-st', e => e.innerText), /No load stated/, 'Reset returns to no load stated');
    // GR-FIG-07: the trace by requirement group.
    await lview('trace'); await L.waitForSelector('.dk-tt tr.dk-tg');
    const tr = await L.evaluate(() => ({dom: document.querySelectorAll('*').length, groups: document.querySelectorAll('.dk-tt tr.dk-tg').length, open: document.querySelectorAll('.dk-tt tr.dk-tg.open').length, rows: document.querySelectorAll('.dk-tt tbody tr[data-card]').length, links: document.querySelectorAll('.cm-companion .dk-links button, .cm .cm-panel .dk-links button').length, caption: document.querySelector('.dk-tt caption').innerText}));
    assert.ok(tr.dom < 20000, `the trace of 1,400 requirements holds ${tr.dom} DOM nodes (bound 20,000)`);
    assert.ok(tr.groups === 60 && tr.open === 1 && tr.rows >= 1 && tr.rows <= 50, `rows by requirement group, one open at a time: ${JSON.stringify(tr)}`);
    assert.match(tr.caption, /1,400 requirements in 60 requirement groups/);
    assert.ok(tr.links <= 2 * 12 && /Broken threads · 5 of [\d,]+[\s\S]*and [\d,]+ more[\s\S]*Requirement groups · 12 of 60[\s\S]*and 48 more groups/i.test(await lpanel()), `the companion names at most twelve of each and counts the rest (${tr.links} links)`);
    // The largest group pages its rows.
    const largest = await L.$$eval('.dk-tt tr.dk-tg button', bs => bs.map(b => ({id: b.dataset.id, n: Number(/(\d[\d,]*) requirements?/.exec(b.closest('th').innerText)[1].replace(/,/g, ''))})).sort((a, b) => b.n - a.n)[0]);
    await L.evaluate(id => document.querySelector(`.dk-tt tr.dk-tg button[data-id="${id}"]`).click(), largest.id); await L.waitForTimeout(600);
    assert.equal(await L.$$eval('.dk-tt tbody tr[data-card]', xs => xs.length), Math.min(50, largest.n), 'an opened group shows its first page of rows');
    if (largest.n > 50) {
      assert.match(await L.$eval('.dk-tt tr.dk-tmore', e => e.innerText), /Show the next \d+ of [\d,]+ more/);
      await L.evaluate(() => document.querySelector('.dk-tt [data-dk="trace-more"]').click()); await L.waitForTimeout(600);
      assert.equal(await L.$$eval('.dk-tt tbody tr[data-card]', xs => xs.length), Math.min(100, largest.n), 'Show the next turns the page in place');
    }
    await L.evaluate(() => document.querySelector('.dk-tt caption [data-dk="trace-broken"]')?.click()); await L.waitForTimeout(600);
    assert.ok(await L.$$eval('.dk-tt tbody tr[data-card]', xs => xs.every(x => x.classList.contains('broken'))), 'the filter shows only the broken threads');
    assert.ok(await L.evaluate(() => document.querySelectorAll('*').length) < 20000, 'the trace stays under 20,000 DOM nodes as it pages');
    // GR-FIG-11: the Running board's lines between groups, and the whole board.
    await lview('board'); await L.waitForSelector('.cm .cm-svg .nt-node');
    const grouped = await L.$$eval('.cm .cm-svg .nt-node', xs => xs.length);
    assert.match(await L.$eval('.cm .cm-stage > .nt-fold-note', e => e.innerText), /^Grouped by[\s\S]*Show every element/, 'the grouped board says so and offers the whole');
    const line = await L.$eval('.cm .cm-svg .nt-hit[data-nt-edge^="fold:"]', e => e.dataset.ntEdge);
    await L.focus(`.cm .cm-svg .nt-hit[data-nt-edge="${line}"]`); await L.keyboard.press('Enter'); await L.waitForTimeout(700);
    const members = await L.$$eval('[data-dk="board-member"]', bs => bs.map(b => b.textContent));
    assert.ok(members.length >= 1 && /It stands for \d+ relationships?/i.test(await lpanel()), `a line between groups lists the ${members.length} relationships it stands for`);
    await L.evaluate(() => document.querySelector('.cm .cm-stage > .nt-fold-note [data-dk="board-all"]').click());
    await L.waitForFunction(n => document.querySelectorAll('.cm .cm-svg .nt-node').length > n, grouped, {timeout: 120000}); await L.waitForTimeout(600);
    const whole = await L.$$eval('.cm .cm-svg .nt-node', xs => xs.length);
    assert.ok(whole >= 1000 && /^Every element drawn/.test(await L.$eval('.cm .cm-stage > .nt-fold-note', e => e.innerText)), `Show every element draws the whole board (${whole} elements)`);
    await L.evaluate(() => document.querySelector('.cm .cm-stage > .nt-fold-note [data-dk="board-group"]').click()); await L.waitForTimeout(1500);
    assert.equal(await L.$$eval('.cm .cm-svg .nt-node', xs => xs.length), grouped, 'Group them again returns to the grouped board');
    await lctx.close();
    pass(`at the size of an import (1,400 requirements in 60 groups): the trace holds ${tr.dom} DOM nodes with its rows by requirement group, one open at a time and a page at a time, a broken-only filter and companion lists of at most twelve; the Running board's line between groups lists the ${members.length} relationship${members.length === 1 ? '' : 's'} it stands for and Show every element draws all ${whole} elements; with no load stated the capacity tile and What it takes say so, and the playbook's example, explored, is labelled on every rate it feeds`);
  }

  assert.deepEqual(errors, []);
  pass('no page errors');
} finally {
  await browser.close(); server.kill();
  try { rmSync(db, {force: true}); rmSync(db + '-wal', {force: true}); rmSync(db + '-shm', {force: true}); } catch { /* best effort */ }
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
