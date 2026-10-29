// Proportion (round 8, audit/round8/DESIGN.md): the round-6 header, shorter — the breadcrumb, the title and the
// subtitle, the readiness meter at the right, the tabs row with the milestones and the next action, "You are here", the
// studio's assistance bar in its own row — so a chapter model's canvas begins within the target and the whole frame
// stays in view; the panel at the right collapses to a rail, the frame takes the width it frees and the choice is kept;
// the companion's sections are classified and collapsible with Sol closed until it has something to say.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally
// AIW_BROWSER_EXECUTABLE. Starts an isolated local server on a free port. Run: npm run test:ui-proportion
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/ui-proportion-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } });
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const checks = [], errors = [];
const pass = n => { checks.push(n); console.log('PASS', n); };
const created = await fetch(base + '/api/projects', {method: 'POST', headers: {'Content-Type': 'application/json', Origin: base}, body: JSON.stringify({name: 'Bank Payment Journey', template: 'bank-payment'})});
const pid = (await created.json()).document?.id; assert.ok(pid, 'the bank project is created');
// The targets: where the canvas may begin (px from the top of the viewport) and the viewports measured.
const VIEWPORTS = [[1894, 960, 380], [1440, 900, 390], [1280, 720, 410]];
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
try {
  const settle = (page, ms = 900) => page.waitForTimeout(ms);
  const open = async (page, chapter, tab) => { await page.goto(base + '/?project=' + pid + '&chapter=' + chapter + '&tab=' + tab); await page.waitForSelector('.studio'); await settle(page); await page.click('[data-coach="close"]').catch(() => {}); await settle(page, 300); };
  const geometry = page => page.evaluate(() => {
    const r = s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return null; const b = e.getBoundingClientRect(); return {top: Math.round(b.top), bottom: Math.round(b.bottom), height: Math.round(b.height), width: Math.round(b.width)}; };
    const stage = document.querySelector('.studio > .stage'), cm = document.querySelector('.cm'), studio = document.querySelector('.studio');
    const visibleText = re => [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && re.test(e.textContent) && e.checkVisibility({visibilityProperty: true}) && e.getBoundingClientRect().width > 2).length;
    return {canvas: r('.cm-stage') || r('.cm-body'), frame: r('.cm'), studio: r('.studio'), footer: r('.footer'), innerHeight, pageScroll: document.scrollingElement.scrollHeight - innerHeight,
      columnScroll: stage ? stage.scrollHeight - stage.clientHeight : 0, studioScroll: studio ? studio.scrollHeight - studio.clientHeight : 0, frameOver: cm && studio ? Math.round(cm.getBoundingClientRect().bottom - studio.getBoundingClientRect().bottom) : 0,
      milestones: visibleText(/\bmilestones\b/), yah: (() => { const e = document.querySelector('.you-are-here'); const b = e?.getBoundingClientRect(); return b ? Math.round(b.width) : -1; })(),
      // rc38 shell (rc41 W4): the breadcrumb is "<project> › Chapter N · <title> · <tab> · <stage>"; the readiness meter stays in
      // the heading; the next task is the footer's (one, on every tab); the chapter's assistance bar is in the toolbar's
      // Chapter tools menu (no row of its own); the Details column is toggled from the toolbar.
      breadcrumb: document.querySelector('.heading-row .breadcrumb #yah-text')?.textContent || '', h1: parseFloat(getComputedStyle(document.querySelector('.heading-row h1')).fontSize), heading: r('.heading-row'), tabsRow: r('.workspace-bar'), assistRow: r('.main > .r-assistant-bar, .main > .l-assistance, .main > .brain-assistance'),
      readinessInHeading: !!document.querySelector('.heading-row .progress-disclosure .progress-track'), nextInFooter: [...document.querySelectorAll('.footer [data-action="next"]')].filter(e => e.checkVisibility({visibilityProperty: true}) && /^Next task\s+\S/.test(e.innerText)).length, statusInTabsRow: !!document.querySelector('.workspace-bar > .journey-status'), inspectorWidth: Math.round(document.querySelector('#inspector')?.getBoundingClientRect().width || 0), panel: document.body.dataset.panel, toggle: document.querySelector('.workspace-tools [data-panel-toggle]')?.getAttribute('aria-expanded') || null,
      barHasAssistance: !!document.querySelector('.workspace-bar > .r-assistant-bar, .workspace-bar > .l-assistance, .workspace-bar > .brain-assistance'), assistInTools: !!document.querySelector('.workspace-bar details.chapter-tools :is(.r-assistant-bar, .l-assistance, .brain-assistance)'),
      explain: (() => { const b = document.querySelector('.chapter-tools [data-action="cursor"], .chapter-tools [data-r-action="cursor"]'); return b ? {label: b.querySelector('.ux-toggle-label')?.textContent, state: b.querySelector('.ux-toggle-state')?.textContent, pressed: b.getAttribute('aria-pressed'), name: b.getAttribute('aria-label')} : null; })(),
      nextActions: [...document.querySelectorAll('[data-action="next"], [data-action="next-context"], .next-strip')].filter(e => e.checkVisibility({visibilityProperty: true})).length,
      companion: [...document.querySelectorAll('#inspector .cm-companion > *')].map(e => e.matches('details.cp') ? {cp: e.dataset.cp, open: e.open, summary: e.querySelector(':scope > summary')?.textContent.replace(/\s+/g, ' ').trim()} : {loose: e.className.split(' ')[0] || e.tagName.toLowerCase()}),
      titleRows: (() => { const top = document.querySelector('.cm-top'), views = document.querySelector('.cm-top > .cm-views'); if (!top || !views) return null; return {top: Math.round(top.getBoundingClientRect().height), sameRow: Math.abs(views.getBoundingClientRect().top - top.getBoundingClientRect().top) < 12}; })(),
      // rc41 close: the one state line (chapter-strip.js chapterStateHTML) — where it stands, what it says, its dot's colour
      // against the state's token, whether it shows whole, and whether the shell footer keeps one row.
      stateLine: (() => {
        const all = [...document.querySelectorAll('.chapter-state')], e = all[0], footer = document.querySelector('#workspace > footer.footer'); if (!e) return {count: 0};
        const kids = [...footer.children].filter(c => c.getClientRects().length).map(c => c.getBoundingClientRect()), out = {count: all.length, inFooter: e.parentElement === footer, besideNext: !!e.previousElementSibling?.matches('.workspace-next'), inModel: !!document.querySelector('.cm .chapter-state'), text: e.textContent, state: e.dataset.chapterState, accent: e.dataset.chapterAccent, shown: e.checkVisibility({visibilityProperty: true}) && e.getBoundingClientRect().width > 0, whole: e.scrollWidth <= e.clientWidth, dot: getComputedStyle(e, '::before').backgroundColor, footerOneRow: kids.length > 0 && Math.max(...kids.map(r => r.bottom)) - Math.min(...kids.map(r => r.top)) <= Math.max(...kids.map(r => r.height)) + 1};
        if (out.inFooter) { const probe = document.createElement('i'); probe.hidden = true; probe.dataset.chapterAccent = out.accent; probe.style.backgroundColor = {fix: 'var(--state-fix-solid)', confirm: 'var(--state-confirm-solid)', empty: 'transparent'}[out.state] || 'var(--chapter-accent)'; footer.append(probe); out.dotWant = getComputedStyle(probe).backgroundColor; probe.remove(); }
        return out;
      })()};
  });
  const measured = [];
  for (const [w, h, canvasTop] of VIEWPORTS) {
    const ctx = await browser.newContext({viewport: {width: w, height: h}}), page = await ctx.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', e => errors.push(e.message));
    for (const chapter of [1, 4, 8, 11]) {
      await open(page, chapter, 'model');
      const g = await geometry(page);
      assert.ok(g.canvas, `${w}×${h} Chapter ${chapter}: a picture is on screen`);
      // Chapter 11's Model is the review desk: its first view is the vitals board, whose tiles stand above the table.
      if (chapter !== 11) assert.ok(g.canvas.top <= canvasTop, `${w}×${h} Chapter ${chapter}: the canvas begins at ${g.canvas.top} px, within ${canvasTop}`);
      assert.ok(g.pageScroll <= 2 && g.studioScroll <= 2 && g.frameOver <= 2, `${w}×${h} Chapter ${chapter}: nothing scrolls to show the frame (page ${g.pageScroll}, studio ${g.studioScroll}, frame over the column by ${g.frameOver})`);
      assert.ok(g.frame.bottom <= g.innerHeight - 10, `${w}×${h} Chapter ${chapter}: the frame's bottom (${g.frame.bottom}) is inside the viewport (${g.innerHeight})`);
      assert.ok(g.yah > 1, `${w}×${h} Chapter ${chapter}: "You are here" is on screen, as in round 6`);
      assert.match(g.breadcrumb, new RegExp(`^Chapter ${chapter} · [^·]+ · Model( · [^·]+)?$`), `${w}×${h} Chapter ${chapter}: the breadcrumb names the chapter, its title and the tab (${g.breadcrumb})`);
      assert.ok(g.readinessInHeading && g.nextInFooter === 1 && !g.statusInTabsRow, `${w}×${h} Chapter ${chapter}: the readiness meter in the heading, the next task once, in the footer (rc38)`);
      assert.ok(!g.barHasAssistance && !g.assistRow && g.assistInTools, `${w}×${h} Chapter ${chapter}: the assistance bar is in the toolbar's Chapter tools menu, with no row of its own (rc38)`);
      assert.ok(g.heading.height <= 80 && g.h1 <= 24.5, `${w}×${h} Chapter ${chapter}: the heading is shorter than round 6's (${g.heading.height} px, title ${g.h1} px)`);
      assert.equal(g.nextActions, 1, `${w}×${h} Chapter ${chapter}: one next action on Model (the footer's)`);
      // rc41 close: the Model's one state line stands in the shell footer beside its Next task (in the Model's own footer it
      // pushed the tools to a second row): one on the page, the chapter's records state, shown whole, the footer one row.
      const want = await page.evaluate(async ch => { const {chapterRecordsState} = await import('/work-frame.js'); const st = chapterRecordsState(window.aiwProjectStore.value.document, ch); return [st.line, st.state, String(ch)]; }, chapter), sl = g.stateLine;
      assert.ok(sl.count === 1 && sl.inFooter && sl.besideNext && !sl.inModel, `${w}×${h} Chapter ${chapter}: one state line on the page, in the shell footer beside the Next task (${JSON.stringify(sl)})`);
      assert.deepEqual([sl.text, sl.state, sl.accent], want, `${w}×${h} Chapter ${chapter}: the state line is the chapter's records state`);
      assert.ok(sl.shown && sl.whole && sl.dot === sl.dotWant && sl.footerOneRow, `${w}×${h} Chapter ${chapter}: shown whole, its dot in the state's colour, the shell footer one row (${JSON.stringify(sl)})`);
      if (g.frame.width >= 1040 && chapter !== 11) assert.ok(g.titleRows?.sameRow, `${w}×${h} Chapter ${chapter}: a frame ${g.frame.width} px wide holds the views in its first row (${JSON.stringify(g.titleRows)})`);
      const cps = g.companion.filter(x => x.cp).map(x => x.cp), tail = cps.filter(k => ['shows', 'checks', 'reading', 'sol'].includes(k));
      assert.deepEqual(tail, ['shows', 'checks', 'reading', 'sol'].filter(k => tail.includes(k)), `${w}×${h} Chapter ${chapter}: the companion's sections are in order (${cps.join(' · ')})`);
      const sol = g.companion.find(x => x.cp === 'sol');
      if (chapter !== 11) { assert.ok(sol, `${w}×${h} Chapter ${chapter}: Sol has its section`); assert.match(sol.summary, /^Sol · review of Chapter \d+/, `${w}×${h} Chapter ${chapter}: Sol's summary is the review's heading (${sol.summary})`); }
      measured.push(`${w}×${h} ch${chapter}: canvas ${g.canvas.top}, frame ${g.frame.top}–${g.frame.bottom} of ${g.innerHeight}`);
    }
    await ctx.close();
  }
  pass('the header, shorter than round 6: the canvas begins within the target and the frame stays in view at every viewport; the breadcrumb names chapter, title and tab; one next task, in the footer, with the chapter\'s one state line beside it on one row; the assistance bar in Chapter tools; the companion is classified and in order (' + measured.join('; ') + ')');

  {
    const ctx = await browser.newContext({viewport: {width: 1440, height: 900}}), page = await ctx.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', e => errors.push(e.message));
    const widths = [];
    // rc38 shell (rc41 W4): the Details column is toggled from the toolbar ([data-panel-toggle]); folded it leaves the
    // page (no rail), the frame takes the width it frees, the choice is remembered per chapter and tab under
    // aiw-details-v1:<project>, and a second click brings it back. Its first state is the shell's rule (W2 is setting it),
    // so the suite opens it first if needed.
    const pref = (tab) => page.evaluate(([pid, tab]) => { try { return JSON.parse(localStorage.getItem('aiw-details-v1:' + pid) || '{}')['4:' + tab]; } catch { return undefined; } }, [pid, tab]);
    for (const tab of ['model', 'work']) {
      await open(page, 4, tab);
      if ((await geometry(page)).panel !== 'open') { await page.click('.workspace-tools [data-panel-toggle]'); await settle(page, 600); }
      const before = await geometry(page);
      assert.ok(before.toggle === 'true' && before.panel === 'open' && before.inspectorWidth >= 280, `Chapter 4 ${tab}: the toolbar's Details control is expanded with the column open (${before.inspectorWidth} px)`);
      await page.click('.workspace-tools [data-panel-toggle]'); await settle(page, 600);
      const after = await geometry(page);
      assert.ok(after.panel === 'collapsed' && after.toggle === 'false' && after.inspectorWidth <= 40, `Chapter 4 ${tab}: a click folds the column away (${after.inspectorWidth} px)`);
      if (tab === 'model') {
        assert.ok(after.frame.width >= before.frame.width + 200, `Chapter 4 Model: the frame takes the width (${before.frame.width} → ${after.frame.width} px)`);
        assert.ok(after.frame.bottom <= after.innerHeight - 10 && after.pageScroll <= 2, 'and still fits the viewport');
        widths.push(`${before.frame.width} → ${after.frame.width} px`);
      }
      assert.equal(await pref(tab), true, `Chapter 4 ${tab}: the choice is remembered under aiw-details-v1`);
      await page.reload(); await page.waitForSelector('.studio'); await settle(page);
      assert.equal((await geometry(page)).panel, 'collapsed', `Chapter 4 ${tab}: the choice survives a reload`);
      await page.click('.workspace-tools [data-panel-toggle]'); await settle(page, 600);
      const back = await geometry(page);
      assert.ok(back.panel === 'open' && back.inspectorWidth >= 280, `Chapter 4 ${tab}: a second click brings the column back (${back.inspectorWidth} px)`);
      assert.equal(await pref(tab), false, `Chapter 4 ${tab}: and that is remembered too`);
    }
    await page.evaluate(pid => localStorage.removeItem('aiw-details-v1:' + pid), pid);
    pass('the Details column folds away from the toolbar on Model and Work, the frame takes the width it frees (' + widths.join(', ') + '), the choice is remembered per chapter and tab and survives a reload, and a second click brings the column back');
    await ctx.close();
  }

  {
    const ctx = await browser.newContext({viewport: {width: 1440, height: 900}}), page = await ctx.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', e => errors.push(e.message));
    await open(page, 4, 'model');
    if ((await geometry(page)).panel !== 'open') { await page.click('.workspace-tools [data-panel-toggle]'); await settle(page, 600); }
    const solOpen = () => page.$eval('#inspector .cm-companion > details.cp-sol', d => d.open);
    assert.equal(await solOpen(), false, 'Sol is closed by default when it has nothing to say');
    assert.match(await page.$eval('#inspector .cm-companion > details.cp-sol .sr', e => e.textContent), /Sol reads the chapter’s records, their checks and the connected model; you see the packet first and decide\./, 'closed or open, the section says in one line what Sol would do');
    assert.match(await page.$eval('#inspector .cm-companion > details.cp-sol .sr h4 .sr-state', e => e.textContent), /not run/, 'the state chip says the review has not run');
    await page.click('#inspector .cm-companion > details.cp-sol > summary'); await settle(page, 300);
    assert.equal(await solOpen(), true, 'a click opens it');
    assert.ok(await page.$('#inspector .cm-companion > details.cp-sol [data-sol-review="prepare"]'), 'and "Review this chapter" is there');
    await page.reload(); await page.waitForSelector('#inspector .cm-companion > details.cp-sol', {state: 'attached'}); await settle(page);
    if ((await geometry(page)).panel !== 'open') { await page.click('.workspace-tools [data-panel-toggle]'); await settle(page, 600); }
    assert.equal(await solOpen(), true, 'the choice is remembered across a reload');
    assert.equal(await page.evaluate(() => localStorage.getItem('aiw.companion.sol')), '1', 'under aiw.companion.sol');
    await page.click('#inspector .cm-companion > details.cp-sol > summary'); await settle(page, 300);
    assert.equal(await page.evaluate(() => localStorage.getItem('aiw.companion.sol')), '0', 'closing it is remembered too');
    // The owner's rc38 snapshot folds "What the model shows", the checks and "Reading this view" closed by default, as Sol
    // (model-stage.js CP_TAIL); the state a viewer gives a section is kept across views.
    const reading = await page.$eval('#inspector .cm-companion > details.cp-reading', d => ({open: d.open, summary: d.querySelector('summary').textContent.trim()}));
    assert.ok(!reading.open && /^Reading this/.test(reading.summary), 'Reading this view is closed by default under its own summary');
    await page.click('#inspector .cm-companion > details.cp-reading > summary'); await settle(page, 300);
    assert.equal(await page.$eval('#inspector .cm-companion > details.cp-reading', d => d.open), true, 'a click opens it');
    await page.click('.cm .cm-views .cm-view[aria-pressed="false"]'); await settle(page, 800);
    assert.equal(await page.$eval('#inspector .cm-companion > details.cp-reading', d => d.open), true, 'an opened section stays open when the view changes');
    await page.evaluate(() => { localStorage.removeItem('aiw.companion.reading'); localStorage.removeItem('aiw.companion.sol'); });
    pass('Sol’s section is closed until it has something to say, says what Sol would do in one line with the state in a chip, opens on a click and the choice survives a reload; every companion section folds under the same summary (closed by default, rc38) and keeps its state across views');

    await open(page, 1, 'work');
    const g = await geometry(page);
    // The annotation toggle formerly read "Explain"; the Co-design round renamed it "Hover help" and kept its
    // hover/focus/pin and On/Off behaviour (audit/co-design-2026-10-13.json). Its name announces the state too.
    const reads = x => ({label: x?.label, state: x?.state, name: x?.name});
    const readsState = x => ({label: 'Hover help', state: x?.pressed === 'true' ? 'On' : 'Off', name: 'Hover help, ' + (x?.pressed === 'true' ? 'on' : 'off')});
    assert.deepEqual(reads(g.explain), readsState(g.explain), 'the annotation toggle reads "Hover help" with its state');
    assert.equal(g.nextActions, 1, 'one next action on Work: the footer\'s next task');
    assert.ok(g.stateLine.count === 1 && !g.stateLine.inFooter && g.stateLine.shown, 'one state line on Work, in the tab\'s head, none in the footer (rc41 close): ' + JSON.stringify(g.stateLine));
    assert.ok(!g.barHasAssistance && !g.assistRow && g.assistInTools && /^Chapter 1 · [^·]+ · Work( · [^·]+)?$/.test(g.breadcrumb), 'the assistance bar is in Chapter tools and the breadcrumb names Chapter 1 and the tab: ' + g.breadcrumb);
    if (!await page.$('details.chapter-tools[open]')) { await page.click('details.chapter-tools > summary'); await settle(page, 200); }
    await page.click('.chapter-tools [data-action="cursor"], .chapter-tools [data-r-action="cursor"]'); await settle(page, 300);
    const after = await geometry(page);
    assert.notEqual(after.explain.pressed, g.explain.pressed, 'the toggle still toggles');
    assert.deepEqual(reads(after.explain), readsState(after.explain), 'and still reads "Hover help" with its new state');
    pass('the Work tab: the assistance bar in Chapter tools, the Hover help toggle with its state, one next action, one state line (the head\'s)');
    await ctx.close();
  }

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`\n${checks.length} checks passed.`);
} catch (e) {
  console.error('FAIL', e.message); if (errors.length) console.error('page errors:', errors); process.exitCode = 1;
} finally {
  await browser.close(); server.kill('SIGKILL');
  try { rmSync(db, {force: true}); rmSync(db + '-wal', {force: true}); rmSync(db + '-shm', {force: true}); } catch { /* left for the next run to overwrite */ }
}
