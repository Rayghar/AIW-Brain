// Pictures at size on screen (round 12, workstream P; DESIGN D-11 and D-15). The synthetic large project of
// figures-at-size-fixture.mjs (1,400 requirements in 60 groups, 180 components, 400 interfaces, 100 running parts;
// generic names only), restored on a local workbench through /api/recovery, opened in Chromium:
//   1. every chapter's picture is drawn within 5 s of opening its page (D-11), opens on its content (elements in view,
//      never an empty region; the whole picture when it fits the stage) and, above the screen's budget, as an overview of
//      its groups with a note that says so;
//   2. Fit returns to the content's frame from wherever the reader moved the camera;
//   3. a group opens in place: a group selected reads in the companion with Open; opened, its elements are drawn and the
//      note offers the way back; a line between groups lists the relationships it stands for, each a button that opens
//      the group where it is drawn; "Show every element" draws the whole picture, which also opens on its content;
//   4. the Running board is drawn within 5 s, keeps its running parts and opens the group the reader selects;
//   5. a Chapter 5 picture of 183 elements and at least 444 relationships, as dense as the drafted design's (a second,
//      smaller synthetic project), opens on its content, grouped and whole, and Fit brings it back (round 12, G, GR-TST-06).
// Round 12 (G): a picture whose elements fit the stage at the reading zoom opens with all of them in view, frame() and
// this suite measuring the same element boxes (GR-FIG-12); a grouped overview larger than the stage says how many of its
// elements are in view and offers Fit to whole, which brings every one into view (GR-FIG-10).
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally AIW_BROWSER_EXECUTABLE.
// Starts an isolated local server on a free port. Run: npm run test:figures-at-size-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';
import {buildFiguresProject} from './figures-at-size-fixture.mjs';
import {restoreScaleProject} from './scripts/build-scale-fixture.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const FIRST_PICTURE_MS = 5000; // D-11: a chapter's first picture under 5 s in the browser (wall clock, not overridable)
// The smaller project: its Chapter 5 application picture draws 183 elements and 457 relationships, each component
// sharing five responsibilities (the dense Chapter 5 case of D-15 is 183 and 444).
const SMALL = {requirements: 120, groups: 8, journeys: 6, actors: 3, drivers: 8, decisions: 10, modules: 6, responsibilities: 10, components: 30, parties: 4, data: 10, contracts: 140, capabilities: 10, threats: 4, controls: 4, zones: 3, placements: 20, allocations: 5};
const DENSE_RELATIONSHIPS = 444; // GR-TST-06: the drafted Chapter 5 had 183 elements and 444 relationships
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/figures-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } for (const f of [db, db + '-wal', db + '-shm']) rmSync(f, {force: true}); });
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port, checks = [], errors = [], timings = {};
const pass = n => { checks.push(n); console.log('PASS', n); };
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
try {
  const big = await buildFiguresProject(), small = await buildFiguresProject({counts: SMALL, name: 'Synthetic payments platform'});
  const R = await restoreScaleProject({base, document: big.document, name: 'Synthetic bank platform'}), S = await restoreScaleProject({base, document: small.document, name: 'Synthetic payments platform'});
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', e => errors.push(e.message)); page.on('crash', () => errors.push('page crashed'));
  // The elements in view: drawn element boxes that meet the stage's visible rectangle; `fits` when the box around every
  // drawn element fits the unobscured stage below the overview note at the current reading zoom.
  const inView = () => page.evaluate(() => {
    const st = document.querySelector('.cm .cm-stage').getBoundingClientRect(), rs = [...document.querySelectorAll('.cm .cm-svg .nt-node')].map(n => n.getBoundingClientRect()).filter(r => r.width > 0);
    const w = Math.max(...rs.map(r => r.right)) - Math.min(...rs.map(r => r.left)), h = Math.max(...rs.map(r => r.bottom)) - Math.min(...rs.map(r => r.top));
    const note = document.querySelector('.cm .cm-stage > .nt-fold-note'), top = note && !note.hidden ? Math.max(st.top, note.getBoundingClientRect().bottom + 6) : st.top;
    return {drawn: rs.length, seen: rs.filter(r => r.right > st.left && r.left < st.right && r.bottom > top && r.top < st.bottom).length, fits: w <= st.width && h <= st.bottom - top};
  });
  const camera = () => page.$eval('.cm .cm-world', e => e.style.transform);
  const open = async (ch, project, view = 'diagram') => { const t = Date.now(); await page.goto(`${base}/?chapter=${ch}&tab=model&model=${view}&project=${encodeURIComponent(project)}`, {waitUntil: 'domcontentloaded'}); await page.waitForSelector('.cm .cm-svg .nt-node', {timeout: 60000}); const ms = Date.now() - t; await page.waitForTimeout(400); return ms; };
  const note = () => page.$eval('.cm .cm-stage > .nt-fold-note', e => e.innerText).catch(() => '');
  // The way back to the content's frame (rc41, lead): the Fit menu's Readable view, which returns a notation picture to
  // the frame it opens at (model-stage.js readable). Was a click on the zoom bar's Fit, [data-nt="zoom"][data-id="fit"],
  // retired with the rc39 Fit menu (its Fit now fits the whole drawing); the assertions after it are unchanged.
  const readable = async () => { await page.click('.cm .cm-fit-options > summary'); await page.click('.cm .cm-fit-options [data-cm-camera="readable"]'); await page.waitForTimeout(300); };

  // 1 and 2. Every chapter: drawn in time, on its content, grouped above the budget; Fit returns to the frame.
  let slowest = 0, grouped = 0; const fitWhole = [];
  for (let ch = 1; ch <= 11; ch++) {
    const ms = await open(ch, R.id), v = await inView(), frame = await camera();
    timings['chapter' + ch + 'Ms'] = ms; slowest = Math.max(slowest, ms);
    assert.ok(ms <= FIRST_PICTURE_MS, `Chapter ${ch}: the first picture is drawn ${ms} ms after the page opens (bound ${FIRST_PICTURE_MS} ms)`);
    assert.ok(v.seen >= Math.min(v.drawn, 4), `Chapter ${ch} opens on its content: ${v.seen} of ${v.drawn} elements in view`);
    assert.ok(!v.fits || v.seen === v.drawn, `Chapter ${ch}: a picture that fits the unobscured stage opens whole (${v.seen} of ${v.drawn} in view)`);
    // An overview larger than the stage at the reading zoom opens on its first groups, a screenful of them.
    const n = await note(); if (/^Grouped by/.test(n)) { grouped++; assert.ok(v.drawn <= 60 && v.seen >= Math.min(v.drawn, 12), `Chapter ${ch}: the overview of ${v.drawn} groups opens with ${v.seen} of them in view`); }
    // The reader moves away: zoomed in on a far corner, then Fit.
    const box = await page.$eval('.cm .cm-stage', e => { const r = e.getBoundingClientRect(); return {x: r.right - 12, y: r.bottom - 12}; });
    await page.mouse.move(box.x, box.y); for (let i = 0; i < 6; i++) { await page.keyboard.down('Control'); await page.mouse.wheel(0, -400); await page.keyboard.up('Control'); }
    for (let i = 0; i < 6; i++) await page.mouse.wheel(1200, 1200);
    await page.waitForTimeout(250);
    assert.notEqual(await camera(), frame, `Chapter ${ch}: the camera moved`);
    await readable();
    assert.equal(await camera(), frame, `Chapter ${ch}: Fit returns to the content's frame`);
    assert.ok((await inView()).seen >= 1, `Chapter ${ch}: after Fit the content is in view`);
    // GR-FIG-10: a grouped overview whose elements do not all show at the reading zoom says how many do, and Fit to whole
    // brings every one into view; Fit then returns to the reading frame.
    if (/^Grouped by/.test(n) && v.seen < v.drawn) {
      // (rc41, lead: a diagram overview draws groups of several and elements standing alone, and its count names neither —
      // notation-view.js foldView since rc40 — so "27 of 60 in view"; was "(groups|elements) in view", the exact form now)
      const said = /(\d[\d,]*) of (\d[\d,]*) in view/.exec(await note()), num = s => Number(String(s).replace(/,/g, ''));
      assert.ok(said && num(said[2]) === v.drawn && num(said[1]) < v.drawn, `Chapter ${ch}: the overview says how much of it is in view (${said?.[0] || 'nothing said'}; ${v.seen} of ${v.drawn} drawn in view)`);
      await page.click('.cm .cm-stage > .nt-fold-note [data-nt="fold-fit"]'); await page.waitForTimeout(400);
      const all = await inView();
      assert.equal(all.seen, all.drawn, `Chapter ${ch}: Fit to whole brings all ${all.drawn} into view (${all.seen} in view)`);
      assert.match(await note(), new RegExp(`All ${v.drawn.toLocaleString('en-GB')} in view`), `Chapter ${ch}: the note says all are in view`);
      fitWhole.push(`Chapter ${ch} (${said[0]})`);
      await readable();
      assert.equal(await camera(), frame, `Chapter ${ch}: after Fit to whole, Fit returns to the reading frame`);
    }
  }
  assert.ok(grouped >= 5, `${grouped} chapters open grouped`);
  assert.ok(fitWhole.length >= 1, 'at least one overview is larger than the stage and offers Fit to whole');
  pass(`every chapter's picture of the large project is drawn within ${slowest} ms of opening its page (bound ${FIRST_PICTURE_MS} ms), opens on its content (whole when it fits the stage; ${grouped} chapters as an overview of their groups) and Fit brings the camera back to the content's frame from a far corner; an overview larger than the stage says how much of it is in view and Fit to whole shows it all: ${fitWhole.join(", ")}`);

  // 3. A group opens in place, a line lists what it stands for, and the whole picture can be drawn.
  // (rc41, lead: the fold controls are clicked where they are visible — the companion is drawn in two places and the first
  // in the document can be the hidden one; the assertions after each click are unchanged)
  await open(5, R.id);
  assert.match(await note(), /^Grouped by modules/, 'Chapter 5 groups by module');
  // (rc41, lead: the first module group fully in view, clear of the stage's edge controls — was the first in the document,
  // which the arrival on the densest part can leave under the "More below" edge, where a reader would not click it)
  const agg = await page.evaluate(() => { const st = document.querySelector('.cm .cm-stage').getBoundingClientRect(); return [...document.querySelectorAll('.cm .cm-svg .nt-node[data-sel^="fold:module:"]')].find(n => { const r = n.querySelector('rect.nt-box').getBoundingClientRect(); return r.left >= st.left + 24 && r.right <= st.right - 24 && r.top >= st.top && r.bottom <= st.bottom - 24; })?.dataset.sel || null; });
  assert.ok(agg, 'Chapter 5 opens with a module group fully in view');
  await page.click(`.cm .cm-svg .nt-node[data-sel="${agg}"] rect.nt-box`); await page.waitForTimeout(400);
  assert.match(await page.$eval('.cm-companion .nt-fold-spec, .cm .cm-panel .nt-fold-spec', e => e.innerText), /MODULE[\s\S]*Open this group[\s\S]*In it/i, 'a group reads in the companion: what it holds, Open, its members');
  await page.click('[data-nt="fold-open"]:visible'); await page.waitForSelector('.cm .cm-stage > .nt-fold-note [data-nt="fold-up"]'); await page.waitForTimeout(300);
  const opened = await page.$$eval('.cm .cm-svg .nt-node', ns => ns.map(n => n.dataset.sel));
  assert.ok(opened.filter(id => !id.startsWith('fold:')).length >= 5 && opened.length <= 120, `the group opens in place: ${opened.filter(id => !id.startsWith('fold:')).length} of its elements drawn with its neighbours as groups`);
  assert.ok((await inView()).seen >= 1, 'the opened group is framed on its content');
  const line = await page.$eval('.cm .cm-svg .nt-hit[data-nt-edge^="fold:"]', e => e.dataset.ntEdge);
  await page.focus(`.cm .cm-svg .nt-hit[data-nt-edge="${line}"]`); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  const members = await page.$$eval('[data-nt="fold-edge"]', bs => bs.map(b => b.textContent));
  assert.ok(members.length >= 1, `a line between groups lists the ${members.length} relationships it stands for`);
  await page.click('[data-nt="fold-edge"]:visible'); await page.waitForTimeout(500);
  assert.match(await note(), /^← All groups/, 'a relationship named there opens the group where it is drawn');
  await page.click('[data-nt="fold-up"]:visible'); await page.waitForTimeout(500);
  assert.match(await note(), /^Grouped by/, 'All groups returns to the overview');
  await page.click('[data-nt="fold-all"]:visible'); await page.waitForTimeout(800);
  const whole = await inView();
  assert.match(await note(), /^Every element drawn/); assert.ok(whole.drawn > 120 && whole.seen >= 1, `Show every element draws the whole picture (${whole.drawn} elements), opened on its content (${whole.seen} in view)`);
  await page.click('[data-nt="fold-group"]:visible'); await page.waitForTimeout(500);
  assert.match(await note(), /^Grouped by/);
  pass(`a group selected reads in the companion with Open and its members; opened, it is drawn in place (${opened.length} elements, its neighbours as groups) with the way back; a line between groups lists the ${members.length} relationships it stands for, each opening the group where it is drawn; Show every element draws all ${whole.drawn}, framed on its content, and Group them again returns`);

  // 4. The Running board.
  const boardMs = await open(11, R.id, 'board'); timings.boardMs = boardMs;
  const B = await page.$$eval('.cm .cm-svg .nt-node', ns => ns.map(n => n.dataset.sel));
  assert.ok(boardMs <= FIRST_PICTURE_MS, `the Running board is drawn ${boardMs} ms after the page opens (bound ${FIRST_PICTURE_MS} ms)`);
  assert.ok(B.length <= 140 && B.some(id => id.startsWith('fold:rg:')) && B.filter(id => !id.startsWith('fold:')).length >= 100, `the board keeps its running parts and groups the rest (${B.length} elements)`);
  assert.ok((await inView()).seen >= 1, 'the board opens on its content');
  const rg = B.find(id => id.startsWith('fold:rg:'));
  await page.click(`.cm .cm-svg .nt-node[data-sel="${rg}"] rect.nt-box`); await page.waitForTimeout(800);
  const B2 = await page.$$eval('.cm .cm-svg .nt-node', ns => ns.map(n => n.dataset.sel));
  assert.ok(!B2.includes(rg) && B2.length > B.length, `selecting a group of requirements opens it on the board (${B2.length - B.length + 1} elements in its place)`);
  pass(`the Running board is drawn ${boardMs} ms after its page opens (bound ${FIRST_PICTURE_MS} ms), keeps its running parts with the rest grouped (${B.length} elements), and a group selected opens in place`);

  // 5. A Chapter 5 picture of 183 elements opens on its content, grouped and whole.
  await open(5, S.id); const g5 = await inView(), f5 = await camera();
  assert.ok(g5.seen >= 1 && /^Grouped by/.test(await note()), `the smaller project's Chapter 5 opens grouped on its content (${g5.seen} of ${g5.drawn})`);
  await page.click('[data-nt="fold-all"]:visible'); await page.waitForTimeout(800);
  const w5 = await inView(), wf = await camera();
  const r5 = await page.$$eval('.cm .cm-svg .nt-hit', hs => hs.length);
  assert.ok(r5 >= DENSE_RELATIONSHIPS, `the dense Chapter 5 picture draws ${r5} relationships (at least ${DENSE_RELATIONSHIPS}, as the drafted design had)`);
  assert.ok(w5.drawn >= 180 && w5.seen >= 1, `whole, its ${w5.drawn} elements (${r5} relationships drawn) open on their content (${w5.seen} in view)`);
  for (let i = 0; i < 6; i++) await page.mouse.wheel(1500, 1500);
  await readable();
  assert.equal(await camera(), wf, 'Fit returns the whole picture to its frame'); assert.notEqual(f5, wf);
  pass(`a Chapter 5 picture of ${w5.drawn} elements and ${r5} relationship hits opens on its content grouped and whole, and Fit returns to it`);

  assert.deepEqual(errors, [], 'no page error');
} finally { await browser.close(); server.kill('SIGKILL'); }
console.log(JSON.stringify({suite: 'figures at size (browser)', passed: checks.length, timings, checks}, null, 2));
