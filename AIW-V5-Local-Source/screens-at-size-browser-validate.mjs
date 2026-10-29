// Screens at size (round 12, workstream G; DESIGN D-11 and D-15). The synthetic large project of
// figures-at-size-fixture.mjs (1,400 requirements in 60 groups, 180 components, 400 interfaces, 100 running parts;
// generic names only), restored on a local workbench through /api/recovery and opened in Chromium at 1440 × 900, each
// walk in a fresh tab:
//   A. GR-UX-04, GR-UX-08: every chapter's companion reads gaps and risks first, eight of how many ("8 of 23") with
//      "Show all"; no observation runs past about 300 characters or names more than five records without a count, and an
//      observation that names more offers "Show all N", a filter that lists every record it names, 50 at a time.
//   B. GR-UX-07, GR-UX-01: a reviewed save says "Saving…" and the seconds it has taken; the change it records is counted
//      in the notice as "N reviews open across M causes", which names the largest cause and opens the review plan, the
//      counter reading "Reviews", and dismissed the notice stays a chip in the rail; the working SDD's download says it is
//      building, with its seconds, then what it downloaded; a chapter switch marks the chapter and says it is building it
//      before the chapter and its counts are drawn. The save and the export are held 2.6 s on their way (a slow network,
//      simulated), so the seconds must show.
//   E. GR-UX-06: Table and Matrix search the same workbook id, domain and group as the register on the large project;
//      Table shows the imported columns and both views keep their row caps while the full match count remains visible.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally AIW_BROWSER_EXECUTABLE.
// Starts an isolated local server on a free port. Run: npm run test:screens-at-size
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';
import {buildFiguresProject} from './figures-at-size-fixture.mjs';
import {restoreScaleProject} from './scripts/build-scale-fixture.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
// Every section runs by default (and in the release checks); AIW_SCREENS_SECTIONS=B (for example) runs only those named.
const section = s => !process.env.AIW_SCREENS_SECTIONS || process.env.AIW_SCREENS_SECTIONS.includes(s);
const ABOUT_300 = 320; // "about 300 characters" (GR-UX-04): a sentence or two, never a paragraph of records
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/screens-at-size-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: '', ANTHROPIC_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } for (const f of [db, db + '-wal', db + '-shm']) rmSync(f, {force: true}); });
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port, checks = [], errors = [], measures = {};
const pass = n => { checks.push(n); console.log('PASS', n); };
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
// A fresh tab for each walk: a long walk in one tab slows on a loaded machine.
const context = async () => {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}}), page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', e => errors.push(e.message)); page.on('crash', () => errors.push('page crashed'));
  return {ctx, page};
};
const open = (page, path) => page.goto(base + path, {waitUntil: 'domcontentloaded'});
// rc38/rc39 (rc41 W4): the Model companion is in the Details column (#inspector), which the shell leaves closed with
// nothing selected, and "What the model shows" is a fold closed by default; a viewer opens both, and so does the suite.
const companion = async page => {
  await page.waitForSelector('#inspector [data-ins-key]', {state: 'attached', timeout: 90000});
  if (await page.evaluate(() => document.body.dataset.panel !== 'open')) { await page.click('.workspace-tools [data-panel-toggle]'); await page.waitForSelector('#inspector[aria-hidden="false"]'); }
  if (await page.$('#inspector details.cp-shows:not([open])')) await page.click('#inspector details.cp-shows > summary');
};
try {
  const big = await buildFiguresProject();
  // The register as a workbook import leaves it: each requirement carries a source id and a domain (here, the area its
  // synthetic title names), which the register, Table and Matrix search and the picker reads.
  for (const a of big.document.artefacts) if (a.type === 'requirement') { a.externalId = 'SRC-' + String(/(\d+)/.exec(a.id)?.[1] || '').padStart(5, '0'); a.domain = (/ in ([a-z ]+)$/.exec(a.title)?.[1] || 'general').replace(/^\w/, c => c.toUpperCase()); }
  const R = await restoreScaleProject({base, document: big.document, name: 'Synthetic bank platform'}), P = encodeURIComponent(R.id);

  // A. The companion at size (GR-UX-04, GR-UX-08).
  if (section('A')) {
    const ids = t => (t.replace(/\b[A-Z]{2,5}-\d{2,4} → [A-Z]{2,5}-\d{2,4}\b/g, 'PAIR-00').match(/\b[A-Z]{2,5}-\d{2,4}\b/g) || []).length;
    const read = page => page.evaluate(() => {
      const sec = document.querySelector('#inspector [data-ins-key]'); if (!sec) return null;
      const items = [...sec.querySelectorAll(':scope > .cm-ins, :scope > div > .cm-ins, :scope > .cm-insw > div > .cm-ins')].map(b => { const w = b.closest('.cm-insw'); return {kind: ['gap', 'risk'].find(k => b.classList.contains(k)) || 'info', text: b.querySelector('span')?.textContent || '', all: w?.querySelector('[data-ins="filter"]')?.textContent || ''}; });
      return {key: sec.dataset.insKey, count: sec.querySelector('h4 > span')?.textContent || '', items, more: sec.querySelector('[data-ins="all"]')?.textContent || ''};
    });
    let longest = 0, totalShown = 0; const filtered = [];
    for (let ch = 1; ch <= 10; ch++) {
      const {ctx, page} = await context();
      await open(page, `/?chapter=${ch}&tab=model&project=${P}`);
      await companion(page);
      await page.waitForSelector('#inspector [data-ins-key]', {timeout: 10000});
      const c = await read(page), n = Number((/(?:of )?([\d,]+)$/.exec(c.count) || [])[1]?.replace(/,/g, '') || 0);
      assert.ok(c.items.length >= 1 && c.items.length <= 8, `Chapter ${ch}: the companion shows at most eight observations (${c.items.length})`);
      if (n > 8) {
        assert.equal(c.count, `8 of ${n.toLocaleString('en-GB')}`, `Chapter ${ch}: the count says how many of how many`);
        assert.equal(c.more, `Show all ${n.toLocaleString('en-GB')}`, `Chapter ${ch}: the rest are one "Show all" away`);
      } else assert.equal(c.count, String(c.items.length), `Chapter ${ch}: all its observations are shown and counted`);
      const order = c.items.map(x => x.kind !== 'info');
      assert.ok(order.every((g, i) => g || !order.slice(i + 1).some(Boolean)), `Chapter ${ch}: gaps and risks come before information (${c.items.map(x => x.kind).join(', ')})`);
      for (const x of c.items) {
        longest = Math.max(longest, x.text.length);
        assert.ok(x.text.length <= ABOUT_300, `Chapter ${ch}: an observation runs to ${x.text.length} characters (about 300 at most): ${x.text.slice(0, 160)}…`);
        assert.ok(ids(x.text) <= 5, `Chapter ${ch}: an observation names at most five records: ${x.text}`);
        // One that holds more than five records counts them: its total, or the five it names "and N more".
        if (x.all) { const total = Number(x.all.replace(/\D/g, '')); assert.ok(total > 5 && (/ and [\d,]+ more\b/.test(x.text) || x.text.includes(total.toLocaleString('en-GB'))), `Chapter ${ch}: an observation holding ${total} records counts them and offers ${x.all}: ${x.text}`); }
      }
      totalShown += c.items.length;
      // "Show all" lists every observation, and returns to the first eight.
      if (n > 8) {
        await page.click('[data-ins="all"]');
        const all = await read(page);
        assert.equal(all.items.length, n, `Chapter ${ch}: Show all lists all ${n} observations`);
        assert.ok(all.items.every(x => x.text.length <= ABOUT_300), `Chapter ${ch}: every one of them stays about 300 characters at most`);
        await page.click('[data-ins="fewer"]');
        assert.equal((await read(page)).items.length, 8, `Chapter ${ch}: and the first eight again`);
      }
      // An observation's own "Show all N" filters the companion to it and lists every record it names, a page at a time.
      // The largest in each chapter that has one.
      const filters = await page.$$eval('[data-ins="filter"]', bs => bs.map(b => b.textContent || ''));
      if (filters.length) {
        const index = filters.reduce((best, label, i) => Number(label.replace(/\D/g, '')) > Number(filters[best].replace(/\D/g, '')) ? i : best, 0);
        const label = filters[index], total = Number(label.replace(/\D/g, ''));
        // The companion can redraw while a large model settles. A locator reacquires its button after that redraw.
        await page.locator('[data-ins="filter"]').nth(index).click();
        const rows = await page.$$eval('[data-ins-key] .cm-ins-all li', ls => ls.length), head = await page.$eval('[data-ins-key] h4 > span', e => e.textContent);
        assert.equal(rows, Math.min(50, total), `Chapter ${ch}: ${label} lists the first ${Math.min(50, total)} of the records it names`);
        assert.match(head, /^1 of [\d,]+$/, `Chapter ${ch}: the companion is filtered to that one observation`);
        assert.ok(await page.$eval('[data-ins-key] .cm-ins-of', e => document.activeElement === e), `Chapter ${ch}: focus moves to the list it opened`);
        if (total > 50) {
          await page.click('[data-ins="more"]');
          assert.equal(await page.$$eval('[data-ins-key] .cm-ins-all li', ls => ls.length), Math.min(100, total), `Chapter ${ch}: Show the next adds a page`);
        }
        assert.ok(await page.$$eval('[data-ins-key] .cm-ins-all li button[data-sel]', bs => bs.length >= 1), `Chapter ${ch}: each record it names can be selected`);
        await page.click('[data-ins="back"]');
        assert.ok(await page.evaluate(() => document.activeElement?.dataset?.ins === 'filter'), `Chapter ${ch}: Every observation returns to the list, focus on the observation's Show all`);
        filtered.push({chapter: ch, label, total});
      }
      await ctx.close();
    }
    assert.ok(filtered.some(x => x.total > 50), `an observation naming more than 50 records pages them (${filtered.map(x => 'Chapter ' + x.chapter + ': ' + x.total).join(', ')})`);
    measures.companion = {longestObservation: longest, observationsShown: totalShown, filtered};
    const most = filtered.slice().sort((a, b) => b.total - a.total)[0];
    pass(`GR-UX-04, GR-UX-08: Chapters 1–10 read gaps and risks first, eight of how many with Show all; the longest observation is ${longest} characters (about 300 at most), none names more than five records without a count, and Show all filters ${filtered.length} chapters' companions to one observation's records, 50 at a time (Chapter ${most.chapter}: ${most.total})`);
  }

  // B. Progress while waiting (GR-UX-07) and the change notice by cause (GR-UX-01). The save and the export are held
  //    back 2.6 s on their way (a slow network, simulated) so the elapsed time must show; the requirement edited goes
  //    through the reviewed save, and the change it records is the notice's cause.
  if (section('B')) {
    const {ctx, page} = await context();
    const HOLD = 2600, hold = async route => { await new Promise(r => setTimeout(r, HOLD)); await route.continue().catch(() => {}); };
    await open(page, `/?chapter=1&tab=work&project=${P}`); await page.waitForSelector('.save-state');
    await page.route('**/api/commands**', route => (route.request().method() === 'POST' ? hold(route) : route.continue()));
    // The header's words while the save is under way, read every 100 ms (the header may be redrawn meanwhile).
    await page.evaluate(() => { window.__said = new Set(); window.__sayer = setInterval(() => { const t = document.querySelector('.save-state')?.innerText?.trim(); if (t) window.__said.add(t); }, 100); });
    const edited = await page.evaluate(() => {
      const p = window.aiwProjectStore.value.document, r = p.artefacts.find(a => a.type === 'requirement');
      window.__saved = window.aiwProjectStore.command({type: 'artefact', payload: {...r, description: String(r.description || '') + ' Revised in review.'}}).then(() => 'saved', e => e.message);
      return r.id;
    });
    // The reviewed save: the change is shown, acknowledged and applied.
    await page.waitForSelector('dialog[open] [data-reviewed]'); await page.check('dialog[open] [data-reviewed]');
    await page.fill('dialog[open] [name="reason"]', 'Clarified wording for the synthetic review.');
    const t0 = Date.now(); await page.click('dialog[open] [data-wb-action="apply-preview"]');
    assert.equal(await page.evaluate(() => window.__saved), 'saved', 'the reviewed edit is saved');
    const saveMs = Date.now() - t0, said = await page.evaluate(() => { clearInterval(window.__sayer); return [...window.__said]; });
    assert.ok(said.includes('Saving…'), `the header says it is saving (${said.join(' | ')})`);
    assert.ok(said.some(t => /^Saving… [1-9]\d* s$/.test(t)), `and how long the save has taken (${said.join(' | ')})`);
    await page.waitForFunction(() => /^Saved to your private project$/.test(document.querySelector('.save-state')?.innerText?.trim() || ''));
    pass(`GR-UX-07: a reviewed save held ${HOLD} ms on its way reads "Saving…" then the seconds it has taken (${said.filter(t => /^Saving/.test(t)).join(', ')}), then saved, ${saveMs} ms from Apply`);

    // GR-UX-01: the requirement's change is one cause of many reviews; the notice counts them by cause and opens the plan.
    await page.waitForSelector('.cr-notice');
    const notice = await page.$eval('.cr-notice', e => e.innerText), entry = await page.$eval('.cr-entry', e => e.innerText);
    const m = /([\d,]+) reviews? open across ([\d,]+) causes?/.exec(notice);
    assert.ok(m, `the notice says how many reviews are open across how many causes: ${notice}`);
    assert.match(notice, new RegExp(`Largest: [\\s\\S]*${edited} changed · [\\d,]+`), `it names the largest cause: ${notice}`);
    assert.match(entry, /^Reviews\b/, `the rail's counter reads Reviews: ${entry}`);
    assert.equal(entry.replace(/\D/g, ''), m[1].replace(/\D/g, ''), 'and counts the same open reviews');
    await page.click('.cr-notice [data-cr-action="open"]');
    await page.waitForSelector('#cr-title'); assert.match(await page.$eval('#cr-title', e => e.textContent), /Keep the reasoning current/, 'Open the review plan opens the change review');
    await page.click('[aria-label="Close change review"]'); await page.waitForSelector('#cr-title', {state: 'detached'});
    await page.click('.cr-notice [data-cr-action="hide"]');
    await page.waitForSelector('.cr-chip');
    assert.equal(await page.$('.cr-notice'), null, 'dismissed, the notice leaves the chapter');
    assert.equal(await page.$eval('.cr-chip', e => e.innerText.trim()), m[0], 'and stays a chip in the rail with the same count');
    await page.reload({waitUntil: 'domcontentloaded'}); await page.waitForSelector('.cr-chip');
    assert.equal(await page.$('.cr-notice'), null, 'a reload keeps it a chip until a new cause appears');
    pass(`GR-UX-01: the notice reads "${m[0]}", names ${edited}'s change as the largest cause, opens the change review, and dismissed stays a rail chip; the counter reads "${entry.trim()}"`);

    // An SDD export says it is building, with the time taken, then what was downloaded.
    await open(page, `/?chapter=11&tab=output&project=${P}`); await page.waitForSelector('form.rv-export-form');
    await page.route('**/api/export**', route => hold(route));
    await page.evaluate(() => { window.__built = new Set(); window.__sayer = setInterval(() => { const t = document.querySelector('.rv-export-status')?.innerText?.trim(); if (t) window.__built.add(t); }, 100); });
    if (!await page.$eval('form.rv-export-form .rv-export-menu', d => d.open)) await page.click('form.rv-export-form .rv-export-menu > summary');
    const t1 = Date.now(), [download] = await Promise.all([page.waitForEvent('download', {timeout: 180000}), page.click('form.rv-export-form button[name="format"][value="md"]')]);
    const exportMs = Date.now() - t1;
    await page.waitForFunction(() => /^Downloaded /.test(document.querySelector('.rv-export-status')?.innerText || ''));
    const built = await page.evaluate(() => { clearInterval(window.__sayer); return [...window.__built, document.querySelector('.rv-export-status').innerText]; });
    assert.ok(built.some(t => /^Building the SDD \(Markdown\)…$/.test(t)) && built.some(t => /^Building the SDD \(Markdown\)… [1-9]\d* s$/.test(t)), `the form says it is building the SDD and for how long (${built.join(' | ')})`);
    assert.match(built.at(-1), new RegExp(`^Downloaded ${download.suggestedFilename().replace(/[.]/g, '\\.')} · built in \\d+ s\\.$`), 'then names the file it downloaded');
    assert.ok(/\.md$/.test(download.suggestedFilename()), 'a Markdown file');
    measures.progress = {saveMs, exportMs, held: HOLD};
    pass(`GR-UX-07: the working SDD's Markdown download reads "Building the SDD (Markdown)…" with its seconds, then "${built.at(-1)}" (${exportMs} ms, ${HOLD} ms of it held on the way)`);

    // A chapter switch: the shell marks the chapter and says it is building it before the chapter's counts are drawn.
    await page.unroute('**/api/export**');
    await page.evaluate(() => {
      window.__switch = []; const t0 = performance.now(), mo = new MutationObserver(() => {
        const note = document.querySelector('.shell-building-note');
        window.__switch.push({at: Math.round(performance.now() - t0), note: note?.innerText || '', current: document.querySelector('.chapter-item.current')?.dataset.chapter || '', h1: document.querySelector('.heading-row h1')?.innerText || ''});
      });
      mo.observe(document.body, {childList: true, subtree: true}); window.__mo = mo;
    });
    await page.click('a.chapter-item[data-chapter="4"]');
    await page.waitForFunction(() => new URLSearchParams(location.search).get('chapter') === '4' && !document.querySelector('.shell-building-note') && document.querySelector('.studio'));
    const steps = await page.evaluate(() => { window.__mo.disconnect(); return window.__switch; });
    const first = steps.findIndex(x => /^Building Chapter 4 · Logical application…/.test(x.note));
    assert.ok(first >= 0, `the shell says it is building Chapter 4 (${JSON.stringify(steps.slice(0, 3))})`);
    assert.equal(steps[first].current, '4', 'with Chapter 4 marked in the rail');
    const drawn = steps.findIndex((x, i) => i > first && !x.note);
    assert.ok(drawn > first, 'and the chapter, with its counts, is drawn after it');
    pass(`GR-UX-07: a chapter switch marks Chapter 4 in the rail and reads "${steps[first].note}" ${steps[first].at} ms after the click, before its counts are drawn (${steps[drawn].at} ms)`);
    await ctx.close();
  }

  // C. Every chapter's four tabs at size (GR-UX-02, GR-UX-03, GR-UX-05; DESIGN D-11): each tab drawn within 5 s of opening,
  //    under 20,000 elements, with no list drawing more than 100 rows; every count on Validate and Output names its unit
  //    and the counts agree with the SDD; Chapters 2 to 10 read their findings by cause across the whole chapter, whose
  //    counts add up to the header's, and "Show the N" lists one cause's findings a page at a time; Chapter 11's source
  //    findings read by cause too, and its final checks page.
  if (section('C')) {
    const DRAWN_MS = 5000, MAX_ROWS = 100, MAX_NODES = 20000;
    const ready = {work: '#studio-surface .stage', model: '.cm:not(.dk) .cm-stage, .cm.dk .cm-view', validate: '.validation-workspace[data-bound="1"] .validation-readiness', output: '#studio-surface .stage'};
    // rc38+ (rc41 W4): Validate is the validation workspace (its readiness line, the fold "Findings by cause" with a row and a
    // count per cause, picks that narrow a queue drawn 40 at a time, and on Chapter 11 the final and inherited sets); Output
    // keeps its board and passages in "Sources and readiness", opened here as a viewer opens it before its counts are read.
    // The longest list a tab draws: table bodies, lists and the record lists the studios draw as blocks.
    const sizes = page => page.evaluate(() => { const lists = [...document.querySelectorAll('#workspace tbody, #workspace ul, #workspace ol, #workspace .r-records, #workspace .q-source-list, #workspace .l-checks:not(.l-pick), #inspector ul, #inspector ol')].map(l => ({n: [...l.children].filter(c => !c.hidden).length, at: [l, l.parentElement, l.parentElement?.parentElement].map(e => e ? e.tagName + '.' + String(e.className).split(' ')[0] : '').join(' < ')})).sort((a, b) => b.n - a.n); return {nodes: document.getElementsByTagName('*').length, rows: lists[0]?.n || 0, longest: lists[0]?.at || ''}; });
    // A count with no unit: a number directly before "to fix", "to confirm" or "passing" (a tile's "passing" names its
    // passages after it: "of 1,501 SDD passages").
    const unitless = t => [...t.matchAll(/(?<![\d,.])(\d[\d,]*)\s+(to fix|to confirm|passing)\b/g)].filter(m => !(m[2] === 'passing' && /^\s+of\s+[\d,]+\s+(?:SDD )?passages?\b/.test(t.slice(m.index + m[0].length)))).map(m => t.slice(Math.max(0, m.index - 30), m.index + m[0].length + 20).replace(/\s+/g, ' '));
    const num = t => Number(String(t || '').replace(/[^\d]/g, '')) || 0;
    const timings = {}, worst = {nodes: 0, rows: 0};
    let board = null;
    for (let ch = 1; ch <= 11; ch++) {
      const {ctx, page} = await context();
      for (const tab of ['work', 'model', 'validate', 'output']) {
        const t0 = Date.now();
        await open(page, `/?chapter=${ch}&tab=${tab}&project=${P}`);
        await page.waitForSelector(ready[tab], {timeout: 90000});
        const ms = Date.now() - t0; timings[`ch${ch}${tab}Ms`] = ms;
        assert.ok(ms <= DRAWN_MS, `Chapter ${ch} ${tab}: drawn ${ms} ms after the page opens (bound ${DRAWN_MS} ms)`);
        await page.waitForTimeout(400);
        const s = await sizes(page);
        worst.nodes = Math.max(worst.nodes, s.nodes); worst.rows = Math.max(worst.rows, s.rows);
        assert.ok(s.nodes < MAX_NODES, `Chapter ${ch} ${tab}: ${s.nodes} elements (under ${MAX_NODES})`);
        assert.ok(s.rows <= MAX_ROWS, `Chapter ${ch} ${tab}: a list draws ${s.rows} rows (at most ${MAX_ROWS}; the rest page): ${s.longest}`);
        if (tab === 'output' && await page.$('[data-output-panel="sources"]') && !await page.$('.output-source-panel[open]')) { await page.click('[data-output-panel="sources"]'); await page.waitForSelector('.output-source-panel[open]'); }
        if (tab === 'validate' && !await page.$('details.validation-causes[open]') && await page.$('details.validation-causes')) await page.click('details.validation-causes > summary');
        if (tab === 'validate' || tab === 'output') {
          const said = await page.$$eval('.validation-readiness, .validation-causes, .validation-queue-heading, .vx-sdd, .sdd-part, .rv-board, .rv-source-line, .output-readiness', es => es.map(e => e.innerText).join('\n'));
          assert.deepEqual(unitless(said), [], `Chapter ${ch} ${tab}: every count names its unit`);
        }
        if (tab === 'validate' && ch >= 2 && ch <= 10) {
          const head = await page.$eval('.validation-readiness', e => { const t = e.innerText; return {fix: (/([\d,]+) findings? to fix/.exec(t) || [])[1] || '', confirm: (/([\d,]+) items? to confirm/.exec(t) || [])[1] || ''}; });
          const causes = await page.$$eval('details.validation-causes', cs => cs.map(c => ({sum: c.querySelector(':scope > summary').textContent, rows: c.querySelectorAll('tr[data-validation-cause-row]').length, counts: [...c.querySelectorAll('tr[data-validation-cause-row] [data-validation-cause-count]')].map(x => Number(x.textContent.replace(/[^\d]/g, '')) || 0)})));
          assert.equal(causes.length, 1, `Chapter ${ch}: the findings read by cause`);
          const m = /^Findings by cause · ([\d,]+) causes?$/.exec(causes[0].sum);
          assert.ok(m && num(m[1]) === causes[0].rows, `Chapter ${ch}: the summary counts the causes listed (${causes[0].sum} · ${causes[0].rows} rows)`);
          const sum = causes[0].counts.reduce((a, b) => a + b, 0);
          assert.ok(head.fix !== '' && head.confirm !== '' && sum === num(head.fix) + num(head.confirm), `Chapter ${ch}: the causes add up to the readiness line's counts (${sum} · ${JSON.stringify(head)})`);
          const pick = await page.$('details.validation-causes [data-validation-cause-pick]');
          if (pick) {
            const n = num(await pick.textContent()); await pick.click(); await page.waitForSelector('details.validation-causes [data-validation-cause-pick][aria-pressed="true"]');
            const listed = await page.$$eval('#workspace .validation-queue .validation-item', rs => rs.length);
            assert.equal(listed, Math.min(40, n), `Chapter ${ch}: Show the ${n} lists that cause's findings, a page of 40 at a time (${listed})`);
            timings[`ch${ch}CauseRows`] = listed;
          }
        }
        if (tab === 'validate' && ch === 11) {
          assert.equal(await page.$eval('[data-validation-set="final"]', b => b.getAttribute('aria-pressed')), 'true', 'Chapter 11 opens on its final checks');
          assert.ok(await page.$$eval('.validation-queue .validation-item', rs => rs.length) <= 40, 'Chapter 11: its final checks page, 40 at a time');
          await page.click('[data-validation-set="source"]'); await page.waitForSelector('[data-validation-set="source"][aria-pressed="true"]');
          if (!await page.$('details.validation-causes[open]')) await page.click('details.validation-causes > summary');
          assert.ok(await page.$$eval('details.validation-causes tr[data-validation-cause-row]', rs => rs.length) >= 1, 'Chapter 11: its source findings read by cause');
        }
        if (tab === 'output' && ch === 11) board = await page.$eval('.rv-board-sum', e => e.innerText);
      }
      await ctx.close();
    }
    // The Output board's counts are the SDD's: its "Findings to fix" and "Items to confirm".
    const md = await (await fetch(`${base}/api/export?chapter=11&format=md&edition=executive&project=${P}`)).text();
    const sddFix = num(/\| Findings to fix \| ([\d,]+) \|/.exec(md)?.[1]), sddConfirm = num(/\| Items to confirm \| ([\d,]+) \|/.exec(md)?.[1]);
    const bm = /([\d,]+)\s+findings? to fix[\s\S]*?([\d,]+)\s+items? to confirm/.exec(board || '');
    assert.ok(bm && num(bm[1]) === sddFix && num(bm[2]) === sddConfirm, `the Output board and the SDD count the same: ${board} · SDD ${sddFix} to fix, ${sddConfirm} to confirm`);
    measures.chapters = {timings, worst, board: board?.replace(/\s+/g, ' '), sdd: {toFix: sddFix, toConfirm: sddConfirm}};
    const slowest = Object.entries(timings).filter(([k]) => k.endsWith('Ms')).sort((a, b) => b[1] - a[1])[0];
    pass(`GR-UX-02, GR-UX-03, GR-UX-05: all eleven chapters' Work, Model, Validate and Output tabs drawn within ${DRAWN_MS} ms (slowest ${slowest[0]} ${slowest[1]} ms), at most ${worst.nodes} elements and ${worst.rows} rows in a list; every count names its unit and the board's ${sddFix.toLocaleString('en-GB')} findings to fix and ${sddConfirm.toLocaleString('en-GB')} items to confirm are the SDD's; Chapters 2 to 10 read by cause, adding up to their headers, one cause listed a page at a time; Chapter 11's source findings by cause and its final checks paged`);
  }

  // D. The requirement picker at size (GR-UX-05): an editor that links requirements searches them by id, external id,
  //    domain and group and shows the chosen ones as chips, never 1,400 checkboxes.
  if (section('D')) {
    const {ctx, page} = await context();
    await open(page, `/?chapter=4&tab=work&project=${P}`); await page.waitForSelector('#studio-surface .stage');
    const sample = await page.evaluate(() => { const p = window.aiwProjectStore.value.document, r = p.artefacts.find(a => a.type === 'requirement' && a.externalId && a.domain); return {id: r.id, externalId: r.externalId, domain: r.domain, total: p.artefacts.filter(a => a.type === 'requirement').length, group: (p.requirementGroups?.records || []).find(g => (g.memberIds || []).length)?.title || ''}; });
    await page.click('[data-l-action="new"]');
    await page.waitForSelector('dialog[open] #l-responsibility-form');
    await page.fill('dialog[open] #l-responsibility-form [name="title"]', 'Synthetic responsibility'); await page.click('dialog[open] [data-l-step="1"]');
    const box = 'dialog[open] fieldset.l-pick:has(input[name="requirementIds"])';
    await page.waitForSelector(box);
    const pick = () => page.$eval(box, f => ({nodes: f.getElementsByTagName('*').length, boxes: f.querySelectorAll('input[type="checkbox"]').length, results: [...f.querySelectorAll('.l-pick-results [data-pick-add]')].map(b => b.dataset.pickAdd), more: f.querySelector('.l-pick-more')?.textContent || '', chips: [...f.querySelectorAll('.l-pick-chip input[type="hidden"]')].map(i => i.value), count: f.querySelector('.l-pick-count')?.textContent || ''}));
    let s = await pick();
    assert.ok(s.boxes === 0 && s.nodes < 400, `the requirements to link are a search, not ${sample.total} checkboxes (${s.nodes} elements)`);
    assert.match(s.more, /and [\d,]+ more: narrow the search/, 'it lists the first matches and says how many more');
    const find = async q => { await page.fill(`${box} [data-pick-find]`, q); await page.waitForTimeout(150); return pick(); };
    s = await find(sample.externalId); assert.ok(s.results.includes(sample.id), `an external id (${sample.externalId}) finds its requirement`);
    s = await find(sample.domain); assert.ok(s.results.length >= 1 && s.results.length <= 20, `a domain (${sample.domain}) finds its requirements, the first 20 listed`);
    if (sample.group) { s = await find(sample.group); assert.ok(s.results.length >= 1, `a group (${sample.group}) finds its members`); }
    s = await find(sample.id); assert.ok(s.results.includes(sample.id), 'an id finds its requirement');
    await page.click(`${box} [data-pick-add="${sample.id}"]`); s = await pick();
    assert.deepEqual(s.chips, [sample.id], 'the chosen requirement stands as a chip, carried by the form');
    assert.match(s.count, new RegExp(`^1 of ${sample.total.toLocaleString('en-GB')} chosen$`));
    assert.ok(await page.$eval(`${box} [data-pick-find]`, e => document.activeElement === e), 'focus stays with the search');
    assert.deepEqual(await page.$eval('dialog[open] #l-responsibility-form', f => new FormData(f).getAll('requirementIds')), [sample.id], 'the form reads the chip as it read a ticked box');
    await page.click(`${box} [data-pick-remove="${sample.id}"]`); s = await pick();
    assert.deepEqual(s.chips, [], 'a chip removed leaves the choice');
    await ctx.close();
    pass(`GR-UX-05: the Chapter 4 editor's ${sample.total.toLocaleString('en-GB')} requirements are a search by id, external id, domain and group, the first 20 matches listed with how many more, the chosen ones chips the form carries`);
  }

  // E. Workbook lookup in the two shared model readings (GR-UX-06): one indexed search is used by the requirement
  // register, the Table and the Matrix. Test a unique external id and broader domain and group terms at scale.
  if (section('E')) {
    const {ctx, page} = await context();
    await open(page, `/?chapter=1&tab=model&model=table&project=${P}`);
    await page.waitForSelector('.nt-table tbody tr[data-nt-row]');
    const sample = await page.evaluate(() => {
      const p = window.aiwProjectStore.value.document, r = p.artefacts.find(a => a.type === 'requirement' && a.externalId && a.domain);
      const group = (p.requirementGroups?.records || []).find(g => g.memberIds?.includes(r.id));
      return {id: r.id, externalId: r.externalId, domain: r.domain, group: group?.title || ''};
    });
    const headings = await page.$$eval('.nt-table thead th', ths => ths.map(h => h.innerText.trim()));
    assert.ok(['External ID', 'Domain', 'Group', 'Delivery'].every(h => headings.includes(h)), `the Table names the workbook fields: ${headings.join(', ')}`);
    const table = async term => {
      await page.fill('[data-nt-field="tfilter"]', term);
      return page.evaluate(() => ({rows: document.querySelectorAll('.nt-table tbody tr[data-nt-row]').length,
        refs: [...document.querySelectorAll('.nt-table tbody tr[data-nt-row]')].map(r => r.dataset.ntRow),
        status: document.querySelector('.nt-sheet-status')?.textContent || ''}));
    };
    let t = await table(sample.externalId);
    assert.deepEqual(t.refs, [sample.id], `the workbook id ${sample.externalId} finds the requirement in Table`);
    t = await table(sample.domain); assert.ok(t.rows > 0 && t.rows <= 50 && /\d/.test(t.status), 'Table filters by domain, pages the rows and states the match count');
    if (sample.group) { t = await table(sample.group); assert.ok(t.rows > 0 && t.rows <= 50, 'Table filters by requirement group'); }

    await open(page, `/?chapter=2&tab=model&model=cross&project=${P}`);
    await page.waitForSelector('.nt-x tbody tr');
    assert.match(await page.$eval('.nt-x-corner', e => e.textContent), /Requirements ↓/, 'Chapter 2 opens with requirements on Matrix rows');
    const matrix = async term => {
      await page.fill('[data-nt-field="xrfilter"]', term);
      return page.evaluate(() => ({rows: document.querySelectorAll('.nt-x tbody tr').length,
        refs: [...document.querySelectorAll('.nt-x tbody tr')].map(r => r.querySelector('th b')?.textContent || ''),
        status: document.querySelector('.nt-sheet-status')?.textContent || ''}));
    };
    let x = await matrix(sample.externalId);
    assert.deepEqual(x.refs, [sample.id], `the workbook id ${sample.externalId} finds the requirement in Matrix`);
    x = await matrix(sample.domain); assert.ok(x.rows > 0 && x.rows <= 60 && /\d+ × \d+/.test(x.status), 'Matrix filters by domain, caps rows and states the full dimensions');
    if (sample.group) { x = await matrix(sample.group); assert.ok(x.rows > 0 && x.rows <= 60, 'Matrix filters by requirement group'); }
    await ctx.close();
    pass(`GR-UX-06: Table and Matrix find ${sample.externalId} by workbook id, ${sample.domain} by domain and ${sample.group} by group; Table exposes the four workbook columns and both views cap their rows`);
  }

  assert.deepEqual(errors, [], 'no page error');
} finally { await browser.close(); server.kill('SIGKILL'); }
console.log(JSON.stringify({suite: 'screens at size (browser)', passed: checks.length, measures, checks}, null, 2));
