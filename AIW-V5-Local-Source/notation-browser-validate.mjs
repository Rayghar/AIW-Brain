// Rendered checks for the standard diagrams (round 2): every chapter's Diagram view draws its scene in
// the notation through the shared SVG renderer (relationship families with their own line and ends,
// the Key built from what is drawn), every offered arrangement (Swimlanes included) rearranges without
// losing or overlapping anything, the layers strip from the menu and from the sidebar alike, a dragged
// or arrow-moved element stays pinned and is released one by one, a relationship can be hovered,
// focused and selected into the companion, the menus answer the keyboard, export gives the same
// picture (with its Key, title and description) as SVG, PNG, diagram code and a SHA-256 manifest, the
// picture does not depend on the window width, a deep link opens a named view, and a blank project
// says it has nothing to draw. Needs Playwright and Chromium (AIW_PLAYWRIGHT_MODULE).
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {rmSync, readFileSync} from 'node:fs';
import {referenceProject} from './notation-fixtures.mjs';
import {checkMarks} from './public/notation-view.js';
import {CHECK_GLYPHS, CHECK_WORDS} from './public/readiness-model.js';
import {notationDiagram, describeEdge, notationScenes, architectureArrangement, ALL_ARRANGEMENTS} from './public/notation-model.js';
import {driverReach, designQuestions} from './public/design-questions.js';
import {notationLayout, SCREEN_STAGE} from './public/notation-layout.js';
import {viewpointProjection} from './public/layers-view.js';
import {STYLES} from './public/notation-palette.js';
import {drawnMetrics} from './notation-metrics.mjs';
import {openingPaths} from './notation-reveal-order.mjs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/notation-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* the server may already have exited */ } }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => checks.push(n);
const sha = t => createHash('sha256').update(t).digest('hex');
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}, acceptDownloads: true});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const open = async (ch, extra = '') => {
    // A chapter opens on its own view (a sheet keeps the canvas hidden): the Diagram is chosen first, then its stage awaited.
    await page.goto(base + '/?chapter=' + ch + '&tab=model' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-views .cm-view[data-id="diagram"]', {timeout: 10000}); await page.waitForTimeout(400);
    if (!(await page.$('.cm-view[data-id="diagram"][aria-pressed="true"]'))) { await page.click('.cm-view[data-id="diagram"]'); await page.waitForTimeout(500); }
    await page.waitForSelector('.cm .cm-stage', {state: 'visible', timeout: 10000});
  };
  // The Model companion stands in the shell's Details column, open on request since rc38.
  const showCompanion = async () => { if (await page.evaluate(() => document.body.dataset.panel !== 'open')) { await page.evaluate(() => document.querySelector('[data-panel-toggle]')?.click()); await page.waitForTimeout(400); } };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(300); };
  const count = async sel => (await page.$$(sel)).length;
  const status = () => page.$eval('.cm-state', e => e.textContent);
  const objectParam = () => page.evaluate(() => new URL(location.href).searchParams.get('object'));
  // The one layer model since rc38: the sidebar names the picture and opens the view's Layers menu (the Visibility menu
  // from rc39), where each layer is a checkbox; `layer` toggles one there, `menuRows` reads them, `closeMenu` closes it.
  const menuOpen = () => page.$('.nt-pop [data-nt="layer"]');
  const layer = async id => { if (!(await menuOpen())) await click('[data-nt="menu"][data-id="layers"]'); await click(`.nt-pop [data-nt="layer"][data-id="${id}"]`); await page.waitForTimeout(600); };
  // The menu's layer rows (the relationship-kind rows below them share the row's class and role, and are read apart).
  const menuRows = async () => { if (!(await menuOpen())) await click('[data-nt="menu"][data-id="layers"]'); return page.$$eval('.nt-pop label.nt-layer[role="menuitemcheckbox"]', ls => ls.filter(l => l.querySelector('input[data-nt="layer"]')).map(l => { const i = l.querySelector('input'); return {id: i.dataset.id, name: [...l.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(), count: l.querySelector('small')?.textContent || '', disabled: i.disabled, checked: i.checked}; })); };
  const closeMenu = async () => { if (await menuOpen()) { await page.keyboard.press('Escape'); await page.waitForTimeout(200); } };
  const nodeAt = sel => page.$eval(sel, e => { const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(e.getAttribute('transform') || ''); return [Number(m?.[1]), Number(m?.[2]), e.classList.contains('pinned')]; });
  // rc38 folds the exports behind the footer's "Export view" menu (details.cm-export); a press opens it when closed.
  const exportClick = async id => { await page.evaluate(() => { const d = document.querySelector('details.cm-export'); if (d && !d.open) d.open = true; }); await page.click(`[data-nt="export"][data-id="${id}"]`); };
  const download = async action => { const [dl] = await Promise.all([page.waitForEvent('download', {timeout: 15000}), action()]); return {name: dl.suggestedFilename(), text: readFileSync(await dl.path(), 'utf8')}; };

  // 1. Every chapter draws its own scene through the shared renderer: kickers, words, families, the Key, the header.
  // The arrangement a chapter opens on is the one its picture recommends (architectureArrangement, as the view chooses it on a fresh open).
  const recommended = ch => { const D = notationDiagram(referenceProject(), notationScenes(ch)[0].id); return ALL_ARRANGEMENTS.find(a => a.id === architectureArrangement(D).id)?.title; };
  const expect = {1: [recommended(1), /Initiate payment/], 2: [recommended(2), /QUALITY SCENARIO/i], 3: [recommended(3), /DECISION/i], 4: [recommended(4), /LOGICAL APPLICATION COMPONENT/i], 5: [recommended(5), /PHYSICAL APPLICATION COMPONENT/i], 6: [recommended(6), /TECHNOLOGY SERVICE/i], 7: [recommended(7), /PHYSICAL TECHNOLOGY COMPONENT/i], 8: [recommended(8), /APPLICATION SERVICE/i], 9: [recommended(9), /SECURITY CONTROL/i], 10: [recommended(10), /Not placed/]};
  const drawn = {};
  for (const [ch, [arr, re]] of Object.entries(expect)) {
    await open(ch);
    const info = await page.evaluate(() => ({nodes: document.querySelectorAll('.cm-svg .nt-node').length, edges: document.querySelectorAll('.cm-svg .nt-edge').length, families: [...new Set([...document.querySelectorAll('.cm-svg .nt-edge')].map(e => [...e.classList].find(c => c.startsWith('nt-f-'))))], markers: [...new Set([...document.querySelectorAll('.cm-svg path.nt-line')].map(p => p.getAttribute('marker-end')).filter(Boolean))].length, labels: [...document.querySelectorAll('.cm-svg .nt-elabel')].filter(t => t.textContent.trim()).length, text: document.querySelector('.cm-svg').textContent + ' ' + document.querySelector('.cm-html').innerText, header: [...(document.querySelector('.nt-header')?.children || [])].map(e => e.textContent).join(' '), headerShown: document.querySelector('.nt-header b')?.checkVisibility() && ![...document.querySelectorAll('.nt-header span')].some(e => e.checkVisibility()), level: document.querySelector('.cm').dataset.cmZ, pressed: document.querySelector('.cm-view[aria-pressed="true"]')?.dataset.id, key: document.querySelector('.cm-legend')?.innerText || '', role: document.querySelector('.cm-svg').getAttribute('role'), label: document.querySelector('.cm-svg').getAttribute('aria-label'), kicker: getComputedStyle(document.querySelector('.cm-svg .nt-kicker') || document.querySelector('.cm-svg .nt-cap')).fontSize}));
    assert.equal(info.pressed, 'diagram', 'chapter ' + ch + ' shows its Diagram');
    assert.ok(info.nodes > 0 && info.edges > 0, 'chapter ' + ch + ' draws elements and relationships: ' + info.nodes + '/' + info.edges);
    assert.ok(info.labels > 0, 'chapter ' + ch + ' writes the words on its edges');
    assert.match(info.text, re, 'chapter ' + ch + ' draws its standard element');
    assert.match(info.header, /Model\s*Bank Payment Journey[\s\S]*Template\s*AIW notation/i, 'chapter ' + ch + ' carries the header strip');
    // Semantic zoom (round 5): at the first fit (far) the header keeps its title and the cells wait for a nearer zoom.
    if (info.level === 'far') assert.ok(info.headerShown, 'chapter ' + ch + ': far out, the header strip shows its title only');
    assert.match(await status(), new RegExp('· ' + arr + '$'), 'chapter ' + ch + ' opens on ' + arr);
    assert.ok(!/Nothing drawn/.test(info.key) && /Elements/.test(info.key), 'chapter ' + ch + ': the Key lists what is drawn');
    assert.equal(info.role, 'img'); assert.match(info.label, /\d+ elements(,| and) \d+ relationships/, 'the picture names its counts (a grouped picture, its source counts and what it draws)');
    assert.ok(parseFloat(info.kicker) >= 9.5, 'chapter ' + ch + ': the element type is legible (' + info.kicker + ')');
    drawn[ch] = info.nodes + '/' + info.families.length;
  }
  // The connections controls since rc38 (Overview · Selected · All · None, Reveal next): a dense Diagram opens with six
  // recorded paths shown, each with its Tab stop, the rest hidden from the keyboard until revealed, every element saying
  // how many of its paths wait ("+N"); All shows every path with every target.
  await open(7);
  const density = await page.evaluate(() => ({neighbours: (() => { const es = [...document.querySelectorAll('.cm-svg .nt-edge[data-nt-edge]')].map(e => ({a: e.dataset.ntFrom, b: e.dataset.ntTo, on: !e.classList.contains('nt-connection-hidden')})), ids = [...document.querySelectorAll('.cm-svg .nt-node[data-nt-node]')].map(n => n.dataset.ntNode); return ids.reduce((t, id) => { const mine = es.filter(e => e.a === id || e.b === id), o = e => (e.a === id ? e.b : e.a), seen = new Set(mine.filter(e => e.on).map(o)); return t + new Set(mine.filter(e => !e.on).map(o).filter(x => !seen.has(x))).size; }, 0); })(), total: document.querySelectorAll('.cm-svg .nt-edge[data-nt-edge]').length, hidden: document.querySelectorAll('.cm-svg .nt-edge.nt-connection-hidden').length, hits: document.querySelectorAll('.cm-svg .nt-hit[tabindex="0"]').length, parked: document.querySelectorAll('.cm-svg .nt-hit[tabindex="-1"][aria-hidden="true"]').length, pending: [...document.querySelectorAll('.cm-svg .nt-pending text')].map(t => Number(t.textContent.slice(1))).reduce((a, b) => a + b, 0), text: document.querySelector('.nt-connection-caption')?.textContent || ''}));
  // rc40 (W1): the control steps None · Structure · Adjacent · All · Selected. Chapter 7 spans three role levels and every
  // one of its 41 relationships joins neighbouring levels, so it opens at Adjacent (was: six paths);
  // Structure (composition and assignment inside a level) holds none of them, parks every path and counts each at both
  // ends; Reveal next adds six beyond the level; All restores every line and every keyboard target.
  // rc41 (W1): the level's own paths exceed the budget of 12, so Adjacent opens with exactly 12 of them (was: all 41),
  // the rest parked and counted on their elements, the caption saying how many more the level holds; Reveal next adds
  // six inside the level first. rc41 (W1, step 6): a "+N" badge counts the element's hidden neighbours (related by a hidden
  // path and by no shown one), so the badges sum to that count, measured here from the drawn edges (was: 2 × the hidden
  // paths, each counted at both ends).
  const pressed = () => page.$eval('[data-nt="connections"][aria-pressed="true"]', e => e.dataset.id);
  const kept = density.total - 12;
  assert.ok(density.total >= 24 && await pressed() === 'adjacent' && density.hits === 12 && density.hidden === kept && density.parked === kept && density.pending === density.neighbours && density.pending > 0 && density.pending <= 2 * kept && new RegExp(`^12 of ${density.total} links shown · Adjacent · ${kept} more at this level$`).test(density.text), 'dense Chapter 7 Diagram opens at Adjacent with the first 12 of its neighbouring-level paths, each with its Tab stop, the rest parked and counted at both ends, the caption counting the level: ' + JSON.stringify(density));
  await click('[data-nt="connections"][data-id="structure"]');
  const structure = await page.evaluate(() => ({neighbours: (() => { const es = [...document.querySelectorAll('.cm-svg .nt-edge[data-nt-edge]')].map(e => ({a: e.dataset.ntFrom, b: e.dataset.ntTo, on: !e.classList.contains('nt-connection-hidden')})), ids = [...document.querySelectorAll('.cm-svg .nt-node[data-nt-node]')].map(n => n.dataset.ntNode); return ids.reduce((t, id) => { const mine = es.filter(e => e.a === id || e.b === id), o = e => (e.a === id ? e.b : e.a), seen = new Set(mine.filter(e => e.on).map(o)); return t + new Set(mine.filter(e => !e.on).map(o).filter(x => !seen.has(x))).size; }, 0); })(), hidden: document.querySelectorAll('.cm-svg .nt-edge.nt-connection-hidden').length, hits: document.querySelectorAll('.cm-svg .nt-hit[tabindex="0"]').length, parked: document.querySelectorAll('.cm-svg .nt-hit[tabindex="-1"][aria-hidden="true"]').length, pending: [...document.querySelectorAll('.cm-svg .nt-pending text')].map(t => Number(t.textContent.slice(1))).reduce((a, b) => a + b, 0), text: document.querySelector('.nt-connection-caption')?.textContent || ''}));
  assert.ok(structure.hits === 0 && structure.hidden === density.total && structure.parked === density.total && structure.pending === structure.neighbours && structure.pending > 0 && structure.pending <= 2 * density.total && new RegExp(`^0 of ${density.total} links shown · Structure · ${density.total} beyond$`).test(structure.text), 'Structure holds none of Chapter 7’s paths: every path parked, each counted at both of its elements, the caption saying how many lie beyond: ' + JSON.stringify(structure));
  await click('[data-nt="connections-more"]');
  assert.equal(await count('.cm-svg .nt-hit[tabindex="0"]'), 6, 'Reveal next adds six paths beyond the Structure level');
  await click('[data-nt="connections"][data-id="all"]');
  assert.equal(await count('.cm-svg .nt-edge.nt-connection-hidden'), 0, 'All restores the full relationship ink');
  assert.equal(await count('.cm-svg .nt-hit[tabindex="0"]'), density.total, 'All gives every exact relationship its keyboard target');
  await click('[data-nt="connections"][data-id="adjacent"]');
  await click('[data-nt="connections-more"]');
  const inside = await page.evaluate(() => ({hits: document.querySelectorAll('.cm-svg .nt-hit[tabindex="0"]').length, text: document.querySelector('.nt-connection-caption')?.textContent || ''}));
  assert.ok(inside.hits === 18 && new RegExp(`^18 of ${density.total} links shown · Adjacent · ${kept - 6} more at this level$`).test(inside.text), 'Reveal next under Adjacent adds six of the level’s own paths before any beyond it: ' + JSON.stringify(inside));
  await click('[data-nt="connections"][data-id="adjacent"]');
  assert.equal(await count('.cm-svg .nt-hit[tabindex="0"]'), 12, 'choosing the level again opens it afresh with its first 12');
  // rc41 close (C6): the reader's focus is drawn whatever the budget keeps back. `worker`, none of whose relationships is
  // among the 12, selected on the picture: every one of them is drawn and a Tab stop beside the 12, the caption counting
  // them; a relationship picked from its "Lines drawn together" is drawn and the keyboard lands on its hit (was: none of
  // them drawn, the picked line display:none, its hit tabindex −1 and the keyboard lost to the page).
  {
    const wasOpen = await page.evaluate(() => document.body.dataset.panel === 'open');
    await page.click('.cm-svg .nt-node[data-nt-node="worker"]'); await page.waitForTimeout(600);
    const held = await page.evaluate(() => {
      const es = [...document.querySelectorAll('.cm-svg .nt-edge[data-nt-edge]')].filter(e => e.dataset.ntFrom === 'worker' || e.dataset.ntTo === 'worker'), hitOf = id => [...document.querySelectorAll('.cm-svg .nt-hit')].find(h => h.dataset.ntEdge === id);
      return {sel: document.querySelector('.cm-svg .nt-node.sel')?.dataset.ntNode || null, mine: es.length, drawn: es.filter(e => getComputedStyle(e).display !== 'none').length, stops: es.filter(e => hitOf(e.dataset.ntEdge)?.getAttribute('tabindex') === '0').length, hits: document.querySelectorAll('.cm-svg .nt-hit[tabindex="0"]').length, text: document.querySelector('.nt-connection-caption')?.textContent || ''};
    });
    assert.ok(held.sel === 'worker' && held.mine >= 2 && held.drawn === held.mine && held.stops === held.mine && held.hits === 12 + held.mine && held.text === `${12 + held.mine} of ${density.total} links shown · Adjacent · ${kept - held.mine} more at this level`, 'a selected element has every one of its relationships at the level drawn and a Tab stop beside the 12, the caption counting them: ' + JSON.stringify(held));
    await showCompanion();
    const comp = ':is(.cm:not(.cm-docked) .cm-panel,.cm-companion)', pick = await page.$eval(`${comp} .nt-lines-node [data-nt="edge-pick"]`, b => b.dataset.id);
    await page.click(`${comp} .nt-lines-node [data-nt="edge-pick"][data-id="${pick}"]`); await page.waitForTimeout(600);
    const picked = await page.evaluate(id => {
      const e = [...document.querySelectorAll('.cm-svg .nt-edge')].find(x => x.dataset.ntEdge === id), h = [...document.querySelectorAll('.cm-svg .nt-hit')].find(x => x.dataset.ntEdge === id);
      return {drawn: !!e && getComputedStyle(e).display !== 'none', sel: !!e?.classList.contains('sel'), stop: h?.getAttribute('tabindex') || null, focus: !!h && document.activeElement === h, hits: document.querySelectorAll('.cm-svg .nt-hit[tabindex="0"]').length, text: document.querySelector('.nt-connection-caption')?.textContent || ''};
    }, pick);
    assert.ok(picked.drawn && picked.sel && picked.stop === '0' && picked.focus && picked.hits === 13 && picked.text === `13 of ${density.total} links shown · Adjacent · ${kept - 1} more at this level`, 'the relationship picked from its lines drawn together is drawn, selected and a Tab stop, the keyboard on its hit: ' + JSON.stringify({pick, ...picked}));
    // (fix-up) Under None no line is drawn and no hit takes the keyboard: a relationship picked by name brings the lines
    // back at the picture's own level, the pick drawn, a Tab stop and the keyboard's (was: the hits' group display:none,
    // focus() on it failing and the keyboard lost to the page).
    await click('[data-nt="connections"][data-id="none"]');
    assert.ok(await pressed() === 'none' && await count('.cm-svg .nt-hit[tabindex="0"]') === 0, 'None draws no line');
    await page.click('.cm-svg .nt-node[data-nt-node="worker"]'); await page.waitForTimeout(600); await showCompanion();
    const pickNone = await page.$eval(`${comp} .nt-lines-node [data-nt="edge-pick"]`, b => b.dataset.id);
    await page.click(`${comp} .nt-lines-node [data-nt="edge-pick"][data-id="${pickNone}"]`); await page.waitForTimeout(600);
    const underNone = await page.evaluate(id => {
      const svg = document.querySelector('.cm-svg'), e = [...svg.querySelectorAll('.nt-edge')].find(x => x.dataset.ntEdge === id), h = [...svg.querySelectorAll('.nt-hit')].find(x => x.dataset.ntEdge === id);
      return {level: document.querySelector('[data-nt="connections"][aria-pressed="true"]')?.dataset.id || null, none: svg.classList.contains('nt-connections-none'), drawn: !!e && getComputedStyle(e).display !== 'none', hitShown: !!h && getComputedStyle(h).display !== 'none' && getComputedStyle(h.closest('.nt-hits') || h).display !== 'none', stop: h?.getAttribute('tabindex') || null, focus: !!h && document.activeElement === h, text: document.querySelector('.nt-connection-caption')?.textContent || ''};
    }, pickNone);
    assert.ok(underNone.level === 'adjacent' && !underNone.none && underNone.drawn && underNone.hitShown && underNone.stop === '0' && underNone.focus && underNone.text === `13 of ${density.total} links shown · Adjacent · ${kept - 1} more at this level`, 'under None, a relationship picked from the lines drawn together brings the lines back at Adjacent, drawn and a Tab stop, the keyboard on its hit: ' + JSON.stringify({pick: pickNone, ...underNone}));
    if (!wasOpen && await page.evaluate(() => document.body.dataset.panel === 'open')) { await page.evaluate(() => document.querySelector('[data-panel-toggle]')?.click()); await page.waitForTimeout(300); }
  }
  pass('Chapter 7 Diagram opens at Adjacent with the first 12 of its neighbouring-level paths and their Tab stops, the rest parked and counted; Structure parks every path; Reveal next adds six inside the level first; All restores every line and every keyboard target; a selected element’s paths and a relationship picked by name are drawn beside the 12 and counted, the keyboard on the picked one; under None a relationship picked by name brings the lines back at Adjacent, the keyboard on it');
  await open(6);
  // Round 10 (N5): a relationship drawn on one line with others keeps its family's dash on its own path, and its family's
  // head is on its own path or, drawn once for the line, on a run of its bundle that it travels (never both: no stacked
  // heads). Serving and dependency still read with different lines and ends.
  const ch6 = await page.$$eval('.cm-svg .nt-edge', es => es.map(e => {
    const p = e.querySelector(':scope > path.nt-line'), id = e.dataset.ntEdge, b = e.dataset.ntBundle || null;
    const runs = b ? [...document.querySelectorAll('.cm-svg .nt-bundle')].filter(g => g.dataset.ntBundle === b).flatMap(g => [...g.querySelectorAll(':scope > .nt-trunk')]).filter(t => JSON.parse(t.dataset.ntMembers).includes(id)).map(t => { const q = t.querySelector(':scope > path.nt-line'); return [q.getAttribute('marker-start'), q.getAttribute('marker-end'), q.getAttribute('stroke-dasharray')]; }) : [];
    return {id, kind: [...e.classList].find(c => c.startsWith('nt-e-')).slice(5), dash: p.getAttribute('stroke-dasharray'), end: p.getAttribute('marker-end'), bundle: b, runs};
  }));
  const headOf = k => '-' + STYLES[k].head + '-' + STYLES[k].stroke.slice(1) + ')', isHead = (v, k) => !!v && v.endsWith(headOf(k));
  for (const e of ch6) {
    assert.equal(e.dash, STYLES[e.kind].dash || null, 'Chapter 6: ' + e.id + ' keeps its family’s dash on its own path');
    const onRun = e.runs.some(([st, en]) => isHead(st, e.kind) || isHead(en, e.kind));
    assert.ok(isHead(e.end, e.kind) !== onRun, 'Chapter 6: ' + e.id + '’s head is drawn once, on its own path or on a run of its line: ' + JSON.stringify(e));
    assert.ok(e.runs.every(([, , d]) => d === (STYLES[e.kind].dash || null)), 'Chapter 6: the runs of ' + e.id + '’s line keep its dash');
  }
  const fam6 = [...new Set(ch6.map(e => headOf(e.kind) + '|' + (e.dash || '')))];
  assert.ok(fam6.length >= 2, 'Chapter 6 draws serving and dependency with different lines and ends: ' + fam6.join(', '));
  assert.ok(ch6.some(e => e.bundle) && ch6.some(e => e.runs.some(([st]) => isHead(st, e.kind))), 'Chapter 6 draws serves lines together, the head once on the root run');
  // Nothing lost: a g.nt-edge, a full-route hit and a Tab stop per relationship; the first hit is a relationship's; shared
  // ink never poses as a relationship; a fan's own hit takes the pointer only; the marks drawn are the drawn measure's.
  {
    // The screen lays an unpinned picture out on a page of the stage's proportions (notation-view.js SCREEN_PAGE 1320 × min 820) shaped for the screen frame (rc40: SCREEN_STAGE), as the layout here does.
    // (rc40: the picture is the viewpoint projection's, whose role bands title the levels, as the view draws it)
    const RD = viewpointProjection(notationDiagram(referenceProject(), 'solution')), RL = notationLayout(RD, {arrangement: 'layered', page: {width: 1320, min: 820}, stage: SCREEN_STAGE}), RM = drawnMetrics(RL, {scene: 'solution'});
    const pathD = pts => pts.map(([x, y], i) => (i ? 'L' : 'M') + (Math.round(x * 10) / 10) + ' ' + (Math.round(y * 10) / 10)).join('');
    const dom = await page.evaluate(() => { const s = document.querySelector('.cm-svg'); return {edges: s.querySelectorAll('g.nt-edge[data-nt-edge]').length, hits: [...s.querySelectorAll('.nt-hit')].map(h => [h.dataset.ntEdge, h.getAttribute('d'), h.getAttribute('tabindex'), h.getAttribute('role'), h.classList.contains('nt-connection-hidden')]), first: s.querySelector('.nt-hits > *')?.getAttribute('class'), posing: s.querySelectorAll(':is(.nt-trunk,.nt-bundle):is(.nt-edge,[data-nt-edge])').length, bhits: [...s.querySelectorAll('.nt-bhit')].map(h => [h.getAttribute('tabindex'), h.getAttribute('aria-hidden'), h.getAttribute('role'), h.dataset.ntSelect]), marks: s.querySelectorAll('path.nt-line[marker-start]').length + s.querySelectorAll('path.nt-line[marker-end]').length, trunks: s.querySelectorAll('.nt-trunk').length}; });
    assert.ok(dom.edges === RD.edges.length && dom.hits.length === RD.edges.length, 'Chapter 6: a g.nt-edge and a hit per relationship: ' + dom.edges + '/' + dom.hits.length + ' of ' + RD.edges.length);
    assert.deepEqual(dom.hits.map(h => h[0]), RL.edges.map(e => e.id), 'Chapter 6: the hits in model order');
    // A shown relationship's hit is a Tab stop and a parked one is not (rc38 connections); every hit keeps its whole route.
    // rc40 (W1): Chapter 6 opens at Adjacent, which holds every one of its paths (they all join neighbouring levels)
    // (was: six shown, the rest parked). rc41 (W1): the level's 32 paths exceed the budget of 12, so exactly 12 are Tab
    // stops and the other 20 are parked (tabindex −1, hidden from the keyboard) until Reveal next; every hit, shown or
    // parked, keeps its relationship's whole route.
    assert.ok(dom.hits.every((h, i) => h[1] === pathD(RL.edges[i].pts) && h[3] === 'button' && (h[4] ? h[2] === '-1' : h[2] === '0')) && dom.hits.length === RD.edges.length, 'Chapter 6: every hit follows its relationship’s whole route, a shown one a Tab stop and a parked one not');
    assert.ok(dom.hits.filter(h => !h[4]).length === Math.min(12, RD.edges.length) && dom.hits.filter(h => h[4]).length === RD.edges.length - Math.min(12, RD.edges.length), 'Chapter 6: at Adjacent the first 12 of its ' + RD.edges.length + ' paths are Tab stops and the rest are parked');
    // rc41 close (C33): "the first 12" is pinned by identity (was: a count only): the Tab stops are the level's first 12 paths in
    // the round-robin order over its relation roles (notation-reveal-order.mjs).
    assert.deepEqual(dom.hits.filter(h => !h[4]).map(h => h[0]).sort(), openingPaths(RD, {scene: 'solution', level: 'adjacent'}).sort(), 'Chapter 6: the Tab stops are the first 12 paths of the round-robin order over its relation roles');
    assert.equal(dom.first, 'nt-hit', 'Chapter 6: the first hit is a relationship’s'); assert.equal(dom.posing, 0, 'Chapter 6: shared ink never carries a relationship’s class or id');
    assert.ok(dom.bhits.length === RL.bundles.filter(b => b.end !== 'both').length && dom.bhits.every(([t, h, r, sel]) => t === null && h === 'true' && r === null && !!sel), 'Chapter 6: one pointer-only hit per fan, never a Tab stop: ' + JSON.stringify(dom.bhits));
    assert.equal(dom.marks, RM.markers, 'Chapter 6: the marks drawn are the drawn measure’s (' + RM.markers + ')');
    assert.equal(dom.trunks, RL.bundles.reduce((t, b) => t + b.runs.length, 0), 'Chapter 6: each run drawn once');
  }
  assert.match(await page.$eval('.cm-legend', e => e.innerText), /serves[\s\S]*depends on/);
  assert.deepEqual(errors, [], 'no page errors across the ten chapters');
  pass('Chapters 1 to 10 each open their own Diagram through the shared SVG renderer: kickers at a legible size, the words on the connectors, relationship families in their own line and ends (round 10: a line drawn together keeps its dash, its head drawn once on its own path or its root run), the Key built from what is drawn, the header strip, role img with a count, and the arrangement the scene calls for (elements/families: ' + Object.entries(drawn).map(([c, n]) => c + ':' + n).join(' ') + '); Chapter 6 keeps a g.nt-edge, a full-route hit and a Tab stop per relationship, pointer-only fan hits, and draws the marks the drawn measure counts');

  // 2. Every offered arrangement, Swimlanes included, rearranges everything and loses nothing.
  await open(5);
  const n0 = await count('.cm-svg .nt-node');
  // rc40 W2: the Arrange panel (arrange-panel.js) is docked beside the stage; every layout card carries a schematic preview, a name and a one-line use.
  const offered = await (async () => { await click('[data-nt="menu"][data-id="arrange"]'); const cards = await page.$$eval('.nt-arrange-panel [data-nt="arrange"]', bs => bs.map(b => [b.dataset.id, !!b.querySelector('svg.nt-arr-pv'), (b.querySelector('b')?.textContent || '').trim(), (b.querySelector('small')?.textContent || '').trim()])); assert.ok(cards.length >= 5 && cards.every(c => c[1] && c[2] && c[3]), 'every layout card has a schematic preview, a name and a one-line use: ' + JSON.stringify(cards)); await page.keyboard.press('Escape'); await page.waitForTimeout(200); return cards.map(c => c[0]); })();
  assert.ok(offered.includes('lanes'), 'Chapter 5’s picture has containers, so Swimlanes is offered');
  await click('[data-nt="menu"][data-id="arrange"]');
  for (const a of ['radial', 'orthogonal', 'layered', 'grouped', 'lanes', 'tree']) {
    // rc40 W2: choosing a card re-lays out at once and the panel stays docked, the chosen card pressed (the popover closed on each choice).
    await click(`.nt-arrange-panel [data-nt="arrange"][data-id="${a}"]`);
    assert.ok(await page.$('.nt-arrange-panel'), a + ': the Arrange panel stays docked after a layout is chosen');
    assert.equal(await page.$eval('.nt-arrange-panel [data-nt="arrange"][aria-pressed="true"]', b => b.dataset.id), a, a + ': the chosen card is pressed');
    assert.equal(await count('.cm-svg .nt-node'), n0, a + ' keeps every element');
    // The chosen arrangement is named in the status line and the panel's heading (the button says "Arrange" since rc38).
    assert.match(await status(), new RegExp('· ' + ALL_ARRANGEMENTS.find(x => x.id === a).title + '$'), a + ': the status names the arrangement');
    const boxes = await page.$$eval('.cm-svg .nt-node rect.nt-box', ns => ns.map(n => { const r = n.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const [ax, ay, aw, ah] = boxes[i], [bx, by, bw, bh] = boxes[j]; assert.ok(!(ax < bx + bw - 2 && bx < ax + aw - 2 && ay < by + bh - 2 && by < ay + ah - 2), a + ': two elements overlap'); }
    if (a === 'grouped' || a === 'lanes') assert.ok(await count('.cm-svg .nt-group') >= 3, a + ' draws the containers'); else assert.equal(await count('.cm-svg .nt-group'), 0, a + ' keeps the containers in the sub-line');
  }
  await open(2);
  await click('[data-nt="menu"][data-id="arrange"]');
  assert.ok(!(await page.$('[data-nt="arrange"][data-id="lanes"]')), 'a picture without containers does not offer Swimlanes');
  await page.keyboard.press('Escape');
  pass('every offered arrangement (Swimlanes included) rearranges Chapter 5 without losing or overlapping an element and names itself; a picture without containers does not offer Swimlanes');

  // 3. Layers strip from the diagram's menu and from the sidebar alike; both say the same.
  await open(5);
  await click('[data-nt="menu"][data-id="layers"]');
  await click('[data-nt="layer"][data-id="interface"]');
  const afterMenu = await count('.cm-svg .nt-node');
  assert.ok(afterMenu < n0 && (await status()).includes('hidden by the layers'), 'unticking Interface strips the application services');
  assert.match(await page.$eval('.journey-explorer .rail-view-hint', e => e.textContent), /^Application architecture · 7 hidden by layers$/, 'the sidebar names the picture and says the same');
  assert.equal((await menuRows()).find(r => r.id === 'interface').checked, false, 'and the menu shows Interface off');
  await closeMenu();
  // The sidebar's way in: its button opens the menu with the keyboard on it; ticking Interface there restores the services.
  await page.click('.journey-explorer [data-action="model-layer-filter"]'); await page.waitForTimeout(600);
  assert.ok(await menuOpen() && await page.evaluate(() => !!document.activeElement?.closest('.nt-pop')), 'the sidebar’s “Open picture layer filters” opens the menu and puts the keyboard in it');
  await layer('interface'); await page.waitForSelector('.cm-svg .nt-node', {timeout: 8000});
  assert.equal(await count('.cm-svg .nt-node'), n0, 'ticking it back restores them');
  await layer('logical'); await page.waitForSelector('.cm-svg .nt-node');
  assert.equal(await count('.cm-svg .nt-node'), n0 - 5, 'unticking Logical strips the five logical components');
  assert.ok((await status()).includes('5 hidden by the layers'));
  await layer('logical');
  assert.equal(await count('.cm-svg .nt-node'), n0, 'and ticking it back restores them');
  await closeMenu();
  pass('one layer model: the view’s menu holds the layers, the sidebar names the picture, says what is hidden and opens the menu; each change strips the diagram and the other says so');

  // 3b. One layer model (round 3, D): per layer the count in this picture, a layer with none disabled, the picture's
  // name, a note that says what is hidden with the way back, the state kept per chapter and picture, Only this
  // chapter's layers, the edge-kind filter, the Key's counts per layer, and Layers' collapsed lanes.
  await open(4);
  const rows4 = await menuRows();
  assert.deepEqual(rows4.find(x => x.id === 'logical'), {id: 'logical', name: 'Logical application', count: '5', disabled: false, checked: true}, 'the menu counts the picture’s elements per layer');
  assert.deepEqual(rows4.find(x => x.id === 'process'), {id: 'process', name: 'Process', count: 'none in this picture', disabled: true, checked: false}, 'a layer the picture does not hold says so and cannot be switched');
  await closeMenu();
  assert.match(await page.$eval('.journey-explorer .rail-view-hint', e => e.textContent), /^Logical application · every layer shown$/);
  await click('.cm-views [data-id="layers"]'); await page.waitForSelector('.cm-svg .nt-lane');
  // rc39 (W2): the Layers view draws one lane per concern band the chapter holds, its type groups as list boxes and the
  // relationships between them as counted lines; the band-to-band index stands in the companion.
  const lanes = await page.$$eval('.cm-svg .nt-lane text', ts => ts.map(t => t.textContent));
  assert.ok(lanes.length >= 3 && lanes[0].startsWith('Motivation') && lanes.some(t => /^Application · \d+/.test(t)), 'Layers draws one lane per concern band of the connected model, in the bands’ order: ' + lanes.join(' | '));
  const indexed = await page.evaluate(() => ({routes: document.querySelectorAll('.cm-svg .nt-edge[data-nt-edge^="fold:"]').length, rows: [...document.querySelectorAll('#inspector [data-nt="pair"]')].map(e => e.textContent.trim())}));
  assert.ok(indexed.routes > 0 && indexed.rows.length > 0 && /\d+ records, \d+ relationships/.test(await page.$eval('.nt-fold-note', e => e.textContent)), 'the overview draws counted lines between its type groups and indexes the directional relationship counts in the companion: ' + JSON.stringify(indexed));
  // rc38's shell opens the Details column on request: the index stands in it, and is pressed once the column is open.
  assert.equal(await page.$$eval('#inspector [data-nt="pair"]', es => es.filter(e => e.checkVisibility()).length), 0, 'the companion’s index waits behind the shell’s Details control until it is asked for');
  await page.evaluate(() => { if (document.body.dataset.panel !== 'open') document.querySelector('[data-panel-toggle]')?.click(); }); await page.waitForTimeout(400);
  assert.equal(await page.$$eval('#inspector [data-nt="pair"]', es => es.filter(e => e.checkVisibility()).length), indexed.rows.length, 'Details shows every entry of the index');
  await click('#inspector [data-nt="pair"]');
  assert.ok(await count('#inspector .nt-pair-spec [data-nt="fold-edge"]') > 0, 'a directional summary opens exact relationship records in the reading');
  await click('#inspector .nt-pair-spec [data-nt="fold-edge"]');
  assert.ok(await count('.cm-svg .nt-edge') > 0 && /Exact relationship/.test(await page.$eval('.nt-fold-note', e => e.textContent)), 'an exact record opens its endpoint line');
  await click('.nt-fold-note [data-nt="fold-group"]');
  await layer('process'); await closeMenu(); await page.waitForTimeout(300);
  const hiddenNote = await page.$eval('.nt-layer-note', e => e.textContent);
  assert.match(hiddenNote, /^\d+ hidden by layers · show$/, 'hiding a layer says how many it hides, over the picture');
  // The Process layer holds the business steps and the motivation records (requirements, outcomes, decisions carry the
  // process layer): both bands' every record is hidden, so both collapse to a strip, in the bands' order, and the
  // strips' counts add up to the note's.
  const strips = await page.$$eval('.cm-svg .nt-band-collapsed text', ts => ts.map(t => t.textContent));
  assert.ok(strips.length === 2 && /^Motivation · \d+ hidden by layers$/.test(strips[0]) && /^Business · \d+ hidden by layers$/.test(strips[1]), 'every band whose every record it hides collapses to a strip that says what it holds, Motivation then Business, no other: ' + strips.join(' | '));
  assert.equal(strips.reduce((n, t) => n + Number(t.match(/\d+/)[0]), 0), Number(hiddenNote.match(/\d+/)[0]), 'the strips account for every record the note counts');
  assert.ok(!(await page.$('.cm-svg .nt-node[data-sel^="STEP"], .cm-svg .nt-node.nt-process')), 'and its elements are gone');
  await click('.cm-views [data-id="diagram"]');
  assert.ok(!(await page.$('.nt-layer-note')), 'the Diagram keeps its own layers: nothing hidden there');
  await click('.cm-views [data-id="layers"]');
  assert.ok(await page.$('.cm-svg .nt-band-collapsed'), 'the Layers view kept its own (per chapter and picture)');
  await click('.nt-layer-note button');
  assert.ok(!(await page.$('.cm-svg .nt-band-collapsed')) && !(await page.$('.nt-layer-note')), '“show” brings every layer back');
  await click('[data-nt="menu"][data-id="layers"]');
  const kinds = await page.$$eval('.nt-pop [data-nt="edgekind"]', xs => xs.map(x => x.dataset.id));
  assert.ok(kinds.length >= 2, 'the Layers menu lists the relationship kinds drawn: ' + kinds.join(', '));
  const rows0 = await count('#inspector [data-nt="pair"]');
  // rc38's connections model: a relationship kind switched off changes ink, not the source graph — its every drawn line
  // is hidden, the Overview's six paths are filled from the other kinds, the status (elements, relationships, groups)
  // and the companion's index keep the recorded model, and the note names the hidden kind with the way back.
  const linesByFamily = () => page.evaluate(() => { const by = {}; for (const e of document.querySelectorAll('.cm-svg .nt-edge[data-nt-edge]')) { const f = (e.getAttribute('class').match(/nt-f-([\w-]+)/) || [])[1]; by[f] ??= {shown: 0, hidden: 0}; by[f][e.classList.contains('nt-connection-hidden') ? 'hidden' : 'shown']++; } return by; });
  const status0 = await status(), lines0 = await linesByFamily();
  assert.ok(lines0[kinds[0]] && lines0[kinds[0]].shown > 0, 'the first kind listed has lines shown before it is switched off: ' + JSON.stringify(lines0));
  await click(`.nt-pop [data-nt="edgekind"][data-id="${kinds[0]}"]`);
  const lines1 = await linesByFamily();
  assert.ok(lines1[kinds[0]] && lines1[kinds[0]].shown === 0 && lines1[kinds[0]].hidden === lines0[kinds[0]].shown + lines0[kinds[0]].hidden, 'a relationship kind switched off hides its every drawn line: ' + JSON.stringify(lines1));
  assert.ok(Object.entries(lines1).some(([f, n]) => f !== kinds[0] && n.shown > 0), 'and the overview shows the other kinds’ lines in their place');
  assert.equal(await status(), status0, 'the source graph is kept: the same elements, relationships and groups (ink changed, nothing regrouped)');
  assert.equal(await count('#inspector [data-nt="pair"]'), rows0, 'and the companion’s index keeps every recorded pair');
  assert.match(await page.$eval('.nt-layer-note', e => e.textContent), /^1 relationship kind hidden · show$/, 'the note names the hidden kind with the way back');
  await click('.nt-layer-note button');
  assert.deepEqual(await linesByFamily(), lines0, '“show” draws the lines as before');
  assert.equal(await count('#inspector [data-nt="pair"]'), rows0);
  await click('[data-nt="menu"][data-id="layers"]'); await click('.nt-pop [data-nt="layers-chapter"]');
  const only = (await menuRows()).filter(r => r.checked).map(r => r.id);
  assert.deepEqual(only.sort(), ['logical', 'process'], 'Only this chapter’s layers keeps the chapter’s own: ' + only.join(', '));
  assert.ok(await page.$$eval('.nt-pop [data-nt="edgekind"]', xs => xs.length >= 2 && xs.every(x => x.checked)), 'and leaves every relationship kind shown');
  await click('.nt-pop [data-nt="layers-all"]'); await page.waitForTimeout(800);
  assert.ok(!(await page.$('.nt-layer-note')), 'Show every layer shows every layer');
  await page.click('[data-lr="key"]').catch(() => {}); await page.waitForTimeout(200);
  // rc38's Key heads the per-layer counts "Repository scope": every layer the picture holds, drawn of held.
  assert.match(await page.$eval('.cm-legend', e => e.textContent), /Repository scope[\s\S]*Process\s*\d+ of \d+[\s\S]*Logical application\s*5 of 5/, 'the Key counts each layer under Repository scope');
  await click('[data-lr="key"]');
  pass('one layer model: the sidebar counts each layer of the picture (a layer with none is disabled) and names it; Layers draws a lane per layer and collapses a hidden one; a note says what is hidden with “show”; the state is per picture; Only this chapter’s layers, the edge-kind filter and the Key’s counts per layer work');

  // 3c. Fit and zoom are always in the toolbar; the overview shows where the stage is and moves it; Find marks matches.
  await page.fill('.nt-bar-find input', 'ledger'); await page.waitForTimeout(300);
  const found = await page.$$eval('.cm-svg .nt-node.found', ns => ns.length);
  assert.ok(found >= 1 && /\d+ records? found/.test(await page.$eval('.nt-found-count', e => e.textContent)), 'Find marks the grouped area and counts the matching source records as one types');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset?.ntField), 'find', 'and the field keeps the keyboard');
  await page.fill('.nt-bar-find input', ''); await page.waitForTimeout(200);
  const z0 = await page.$eval('.cm-world', e => e.style.transform);
  await click('.cm-walk .cm-zoom [aria-label="Zoom in"]'); await click('.cm-walk .cm-zoom [aria-label="Zoom in"]');
  assert.notEqual(await page.$eval('.cm-world', e => e.style.transform), z0, 'Zoom in changes the camera');
  assert.ok(await page.$eval('.cm-minimap', e => !e.hidden), 'zoomed in, the overview appears');
  const mm = await page.$eval('.cm-minimap', e => { const r = e.getBoundingClientRect(); return {x: r.x + r.width - 8, y: r.y + r.height - 8}; });
  const t0 = await page.$eval('.cm-world', e => e.style.transform);
  await page.mouse.click(mm.x, mm.y); await page.waitForTimeout(200);
  assert.notEqual(await page.$eval('.cm-world', e => e.style.transform), t0, 'a click on the overview moves the camera there');
  await click('.cm-walk .cm-zoom [aria-label="Fit the whole picture"]');
  pass('fit and zoom stay in the toolbar; the overview appears when the picture runs past the stage and moves the camera; Find marks every match as one types and keeps the keyboard');

  // 3d. Arrival (rc39, W2 step 3), measured at 1440 × 900: a Diagram opens at the furthest zoom that keeps its names at
  // 10 px (53 % at the far level, 84 % nearer; the densest part of the picture in view; rc41 lead, was the Readable view
  // at 100 %) when fitting the whole drawing would put its names under 10 px on screen, else at the whole fit with its
  // names at 10 px or more; a group of one element is drawn and counted as the element; the
  // "+N" badge keeps a legible size at every zoom and stands in the Key with the same words as the check marks.
  {
    // Measured with the shell's Details column closed (the default shell; §3b leaves it open) and the frame settled.
    // Each chapter is read twice: as it arrives, then at "Fit the whole picture" — the rule is pinned against the whole
    // fit's own names (whole when they keep 10 px, else the legible floor), not against one frame's numbers.
    const measure = () => page.evaluate(() => { const root = document.querySelector('.cm'), stage = root.querySelector('.cm-stage').getBoundingClientRect(), px = t => { const m = t.getScreenCTM(); return parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b); }; const names = [...document.querySelectorAll('.cm-svg .nt-node .nt-title, .cm-svg .nt-node .nt-ftitle')].filter(t => t.checkVisibility()).map(px), pills = [...document.querySelectorAll('.cm-svg .nt-pending text')].map(px), boxes = [...document.querySelectorAll('.cm-svg .nt-node')].map(n => n.getBoundingClientRect()); return {zoom: Math.round(Number(root.dataset.modelCameraZoom) * 100), name: names.length ? Math.round(Math.min(...names) * 10) / 10 : null, pill: pills.length ? Math.round(Math.min(...pills) * 10) / 10 : null, nodes: boxes.length, inView: boxes.filter(b => b.left >= stage.left - 1 && b.right <= stage.right + 1 && b.top >= stage.top - 1 && b.bottom <= stage.bottom + 1).length, groups: document.querySelectorAll('.cm-svg .nt-node[data-nt-node^="fold:"]').length, note: document.querySelector('.nt-fold-note')?.textContent.replace(/\s+/g, ' ').trim() || '', stage: [Math.round(stage.width), Math.round(stage.height)]}; });
    const arrival = async ch => {
      // (rc40: a true arrival — the chapter's saved notation preference, which §2 left on a hand-chosen arrangement, is
      // dropped first, so the picture opens in the arrangement it recommends, as a fresh session does)
      await page.evaluate(ch => { const re = new RegExp('aiw-notation-v2-ch' + ch + '(?!\\d)'); for (const k of Object.keys(localStorage)) if (re.test(k)) localStorage.removeItem(k); }, ch);
      await open(ch);
      if (await page.evaluate(() => document.body.dataset.panel === 'open')) { await page.evaluate(() => document.querySelector('[data-panel-toggle]')?.click()); await page.waitForTimeout(300); await open(ch); }
      await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await page.waitForTimeout(500);
      const at = await measure();
      await page.click('.cm-walk .cm-zoom [aria-label="Fit the whole picture"]'); await page.waitForTimeout(500);
      return {...at, whole: await measure()};
    };
    const a = {};
    for (const ch of [4, 5, 8, 9]) a[ch] = await arrival(ch);
    for (const ch of [4, 5, 8, 9]) {
      // rc41 (lead) old → new: a picture that does not arrive whole arrived at 100 % (the Readable view) → it arrives at
      // the legible floor (53 % or 84 %, exactly), its names at 10 px or more, with at least four elements (or all) in view.
      const r = a[ch], floor = r.inView !== r.nodes; // the legible floor: the densest part, not the whole
      assert.ok(r.name >= 10 && r.stage[0] >= 1100, `Chapter ${ch} arrives with its names at 10 px or more on the full-width stage: ` + JSON.stringify(r));
      assert.ok(floor ? ((r.whole.name === null || r.whole.name < 10.5) && [53, 84].includes(r.zoom) && r.inView >= Math.min(r.nodes, 4)) : (r.inView === r.nodes && r.name >= 10 && r.zoom >= r.whole.zoom && r.zoom <= 100), `Chapter ${ch} arrives at the whole fit (every element in view, names at 10 px or more, at least as close as the footer’s Fit whole, never past 100 %) unless that fit would put its names under 10 px (the footer’s padded fit reads under 10.5 px), when it arrives at the legible floor (53 % or 84 %) with at least four elements in view: ` + JSON.stringify(r));
    }
    // rc40 (W1): Chapters 5 and 9 arrive whole (was: at the Readable view, 100 %, with the lower band out of view): the
    // layered picture is shaped for the screen, the grouped overview packed, every element in view with its names at 10 px.
    assert.ok(a[5].inView === a[5].nodes && a[5].nodes === 19 && a[5].zoom >= 50 && a[5].zoom < 100 && a[5].name >= 10, 'Chapter 5 (19 elements, five role bands) arrives whole at 50 % or more, every element in view, its names at 10 px or more: ' + JSON.stringify(a[5]));
    assert.ok(a[9].inView === a[9].nodes && a[9].zoom >= 60 && a[9].zoom < 100 && a[9].name >= 10, 'Chapter 9’s grouped overview arrives whole at 60 % or more with its names at 10 px or more: ' + JSON.stringify(a[9]));
    assert.ok(a[8].whole.zoom < 80 && a[8].whole.name >= 9.5, 'Chapter 8’s whole fit is far out with its names at the 10 px edge (the rule above decides its arrival): ' + JSON.stringify(a[8]));
    assert.ok(a[4].zoom >= 90 && a[4].inView === a[4].nodes && a[4].name >= 11, 'Chapter 4 fits whole at 90 % or more (99 % measured at 1440 × 900 with the lens row in the command bar), every element in view, its names over 11 px: ' + JSON.stringify(a[4]));
    assert.ok(a[9].groups === 3 && a[9].nodes === 17 && /27 elements · 3 groups drawn as one element each, 14 elements standing alone · select a group to open it/.test(a[9].note), 'Chapter 9 draws its three groups of several as groups and its fourteen groups of one as the elements, and says so: ' + a[9].note);
    assert.match(a[9].note, /\d+ of 17 in view|All 17 in view/, 'and counts what is in view without calling an element a group');
    // Zoomed out to the far level, the badge keeps 10 px while the names fall to the far size; the Key names the badge and the marks.
    await click('.cm-walk .cm-zoom [aria-label="Fit the whole picture"]');
    const far = await arrival(9).catch(() => null) || await page.evaluate(() => null);
    // (rc40: Chapter 9 opens at All, which draws no "+N" badge; the stepped Adjacent level keeps back the threats on its
    // data and badges their elements)
    await click('[data-nt="connections"][data-id="adjacent"]');
    assert.ok(await count('.cm-svg .nt-pending') > 0, 'at Adjacent, Chapter 9 keeps paths back and badges their elements');
    await click('.cm-zoom button[aria-label="Zoom out"]'); await click('.cm-zoom button[aria-label="Zoom out"]');
    const out = await page.evaluate(() => { const px = t => { const m = t.getScreenCTM(); return parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b); }; return {zoom: Math.round(Number(document.querySelector('.cm').dataset.modelCameraZoom) * 100), pill: Math.round(Math.min(...[...document.querySelectorAll('.cm-svg .nt-pending text')].map(px)) * 10) / 10, mark: Math.round(Math.min(...[...document.querySelectorAll('.cm-svg .nt-mk-far .nt-mk-glyph')].filter(t => t.checkVisibility()).map(px)) * 10) / 10}; });
    assert.ok(out.zoom < 80 && out.pill >= 10 && out.mark >= 10, 'zoomed out, the “+N” pill and the check glyphs keep 10 px or more: ' + JSON.stringify(out));
    await click('.cm-walk .cm-kt');
    const key = await page.$eval('.cm-legend', e => ({text: e.textContent.replace(/\s+/g, ' '), pending: !!e.querySelector('[data-nt-mark="pending"] .nt-pending-k'), fix: !!e.querySelector('[data-nt-mark="fix"]')}));
    assert.ok(key.pending && /\+N\s*Connections not yet shown: Reveal next or All adds them ×\d+/.test(key.text), 'the Key explains the “+N” badge in the same words as the picture’s title: ' + key.text.slice(0, 200));
    assert.ok(key.fix && /✕\s*to fix ×\d+/.test(key.text), 'and the check marks drawn (✕ to fix) with the shared words');
    await click('.cm-walk .cm-kt');
    void far;
    pass('arrival: Chapters 5 and 9 arrive whole (every element in view, names at 10 px or more), Chapter 8 fits whole far out with names at 10 px or more, Chapter 4 fits at 100 %; Chapter 9 draws 3 groups and 14 lone elements and says so; at Adjacent the “+N” badge keeps 10 px zoomed out and is in the Key with its words (' + [4, 5, 8, 9].map(ch => `Ch ${ch}: ${a[ch].zoom} %, names ${a[ch].name} px`).join('; ') + ')');
  }

  // 3e. Arrange, navigation and names (rc39, W2 step 4): the in-canvas selection toolbar (the Arrange panel's own
  // commands) while two or more elements are selected; Escape clears the selection; the keyboard map in the Fit
  // menu's help; "Fit on open" remembered with the camera per view; double-click fits a group; the minimap on a
  // chapter's own canvas view; zoom at the pointer on a sheet; the show/hide-layers menu is called Visibility.
  {
    await open(5);
    assert.match(await page.$eval('[data-nt="menu"][data-id="layers"] span', e => e.textContent), /^Visibility/, 'the show/hide-layers menu is called Visibility');
    assert.ok(await page.$('.nt-menu[data-nt-menu="layers"] [data-nt="menu"][data-id="layers"]'), 'and keeps its attributes');
    assert.equal(await page.$eval('.cm-views .cm-view[data-id="layers"]', e => e.textContent.trim()), 'Layers', 'the Layers view keeps its name');
    await click('.cm-fit-options summary');
    const help = await page.$eval('.cm-fit-options', e => ({text: e.querySelector('p').textContent, keep: e.querySelector('[data-cm-fit-on-open]')?.checked}));
    assert.ok(/F fits the whole drawing, Shift\+F the selection, Home the readable view, 0 is 100 %, \+ and − zoom, the arrow keys pan \(Shift: further\), Escape clears the selection\./.test(help.text) && help.keep === true, 'the Fit menu’s help names the whole keyboard map and Fit on open is on: ' + help.text);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    // Two elements selected: the toolbar stands over them; Align left moves them to one x and pins them; Escape clears.
    await click('.cm-zoom button[aria-label^="Fit"]');
    // (two record elements in view: the context's system node, `system:…`, is a drawn stand-in, not a record, so Enter
    // on it names no object in the address; rc40's whole-fit arrival puts it in view)
    // (in two different rows: two elements of one row cannot be left-aligned without colliding, which arrangeSelection rejects)
    const ids = await page.evaluate(() => { const s = document.querySelector('.cm-stage').getBoundingClientRect(); const seen = [...document.querySelectorAll('.cm-svg .nt-node[data-nt-node]:not([data-nt-node^="fold:"]):not([data-nt-node^="system:"])')].map(n => ({id: n.dataset.ntNode, r: n.getBoundingClientRect()})).filter(({r}) => r.left > s.left + 4 && r.right < s.right - 4 && r.top > s.top + 60 && r.bottom < s.bottom - 4); const first = seen[0], second = seen.find(x => x !== first && Math.abs(x.r.top - first.r.top) > 20); return [first, second].filter(Boolean).map(x => x.id); });
    assert.equal(ids.length, 2, 'two elements stand in view after Fit');
    await page.click(`.cm-svg .nt-node[data-nt-node="${ids[0]}"]`); await page.waitForTimeout(400);
    await page.click(`.cm-svg .nt-node[data-nt-node="${ids[1]}"]`, {modifiers: ['Shift']}); await page.waitForTimeout(500);
    const tools = await page.evaluate(() => { const t = document.querySelector('.cm-stage > .nt-seltools'); if (!t) return null; const r = t.getBoundingClientRect(), s = document.querySelector('.cm-stage').getBoundingClientRect(); return {n: t.querySelector('.nt-seltools-n')?.textContent, buttons: [...t.querySelectorAll('button')].map(b => b.dataset.id || b.dataset.nt), inside: r.left >= s.left && r.right <= s.right && r.top >= s.top && r.bottom <= s.bottom, h: Math.round(r.height)}; });
    assert.ok(tools && tools.n === '2 selected' && tools.inside, 'two elements selected: the selection toolbar stands inside the canvas: ' + JSON.stringify(tools));
    assert.deepEqual(tools.buttons, ['left', 'center', 'right', 'top', 'middle', 'bottom', 'distribute-horizontal', 'distribute-vertical', 'same-width', 'same-height', 'pin-selection', 'selection-clear'], 'with align, distribute, size, pin and clear');
    const before2 = [await nodeAt(`.cm-svg .nt-node[data-nt-node="${ids[0]}"]`), await nodeAt(`.cm-svg .nt-node[data-nt-node="${ids[1]}"]`)];
    await page.click('.cm-stage > .nt-seltools [data-id="left"]'); await page.waitForTimeout(600);
    const after2 = [await nodeAt(`.cm-svg .nt-node[data-nt-node="${ids[0]}"]`), await nodeAt(`.cm-svg .nt-node[data-nt-node="${ids[1]}"]`)];
    assert.ok(after2[0][0] === after2[1][0] && after2[0][0] === Math.min(before2[0][0], before2[1][0]) && after2.every(n => n[2]), 'Align left puts both at the leftmost x and pins them: ' + JSON.stringify({before: before2, after: after2}));
    assert.ok(await page.$('.cm-stage > .nt-seltools'), 'the toolbar stays while the selection stands');
    await page.focus(`.cm-svg .nt-node[data-nt-node="${ids[0]}"]`); await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    assert.ok(!(await page.$('.cm-stage > .nt-seltools')) && await count('.cm-svg .nt-node.arrange-selected') === 0, 'Escape clears the multi-selection and the toolbar');
    await page.focus(`.cm-svg .nt-node[data-nt-node="${ids[0]}"]`); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    assert.equal(await objectParam(), ids[0], 'Enter selects one element');
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    assert.equal(await objectParam(), null, 'and Escape clears that selection too');
    await click('[data-nt="menu"][data-id="arrange"]'); await click('.nt-arrange-panel [data-nt="reset"]'); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    // Fit on open, per view, with the camera: switched off, the view opens where it was left; on again, at its arrival.
    const zoomNow = () => page.$eval('.cm', e => Math.round(Number(e.dataset.modelCameraZoom) * 100));
    // (rc40: Chapter 5 arrives whole, under 100 %, in its recommended Layered arrangement — §3a's arrival dropped the hand-chosen one)
    await open(5); const arrivalZoom = await zoomNow(); assert.ok(arrivalZoom >= 50 && arrivalZoom < 100, 'Chapter 5 arrives whole at its arrival fit, 50 % or more and under 100 % (the reference for Fit on open): ' + arrivalZoom);
    await click('.cm-zoom button[aria-label="Zoom in"]'); await click('.cm-zoom button[aria-label="Zoom in"]');
    const chosen = await zoomNow(); assert.ok(chosen > arrivalZoom, 'zoomed in: ' + chosen);
    await click('.cm-fit-options summary'); await page.click('.cm-fit-options [data-cm-fit-on-open]'); await page.waitForTimeout(200); await page.keyboard.press('Escape');
    await open(5);
    assert.equal(await zoomNow(), chosen, 'Fit on open off: the Diagram opens at the camera it was left at');
    await click('.cm-fit-options summary'); assert.equal(await page.$eval('.cm-fit-options [data-cm-fit-on-open]', e => e.checked), false, 'and the menu says so');
    await page.click('.cm-fit-options [data-cm-fit-on-open]'); await page.waitForTimeout(200); await page.keyboard.press('Escape');
    await open(5);
    assert.equal(await zoomNow(), arrivalZoom, 'Fit on open on again: the Diagram opens at its arrival fit');
    // Double-click on a group fits the camera to it (Chapter 9's grouped picture). The pointer reaches a group only
    // when the group is on the stage (rc40: Chapter 9 arrives whole at about 70 %; the whole picture is still fitted
    // first and the group asserted in view, so the step does not depend on the arrival); the double-click is the browser's own, two clicks
    // and the event, as a person's (the first click selects the group and redraws it).
    await open(9);
    await click('.cm-walk .cm-zoom [aria-label="Fit the whole picture"]'); await page.waitForTimeout(500);
    const group = await page.$('.cm-svg .nt-node[data-nt-node^="fold:"]'); assert.ok(group, 'Chapter 9 draws a group');
    const inView = await page.evaluate(() => { const g = document.querySelector('.cm-svg .nt-node[data-nt-node^="fold:"]'), r = g.getBoundingClientRect(), s = document.querySelector('.cm-stage').getBoundingClientRect(); return {zoom: Math.round(Number(document.querySelector('.cm').dataset.modelCameraZoom) * 100), inside: r.left >= s.left && r.right <= s.right && r.top >= s.top && r.bottom <= s.bottom, share: Math.round(100 * Math.max(r.width / s.width, r.height / s.height))}; });
    assert.ok(inView.inside && inView.zoom < 100 && inView.share < 40, 'after Fit whole the group is on the stage, small, under 100 %: ' + JSON.stringify(inView));
    await group.dblclick(); await page.waitForTimeout(700);
    assert.equal(await objectParam(), (await page.$eval('.cm-svg .nt-node[data-nt-node^="fold:"]', e => e.dataset.ntNode)), 'the double-click\'s first click selected the group');
    const fitted = await page.evaluate(() => { const g = document.querySelector('.cm-svg .nt-node[data-nt-node^="fold:"]'), r = g.getBoundingClientRect(), s = document.querySelector('.cm-stage').getBoundingClientRect(); return {zoom: Math.round(Number(document.querySelector('.cm').dataset.modelCameraZoom) * 100), inside: r.left >= s.left && r.right <= s.right && r.top >= s.top && r.bottom <= s.bottom, share: Math.round(100 * Math.max(r.width / s.width, r.height / s.height))}; });
    assert.ok(fitted.inside && fitted.share >= 40 && fitted.zoom > 100, 'double-click fits the group: it fills the stage, wholly in view: ' + JSON.stringify(fitted));
    // The minimap on a chapter's own canvas view once it runs past the stage; zoom at the pointer on the Table.
    await page.click('.cm-views .cm-view[data-id="model"]'); await page.waitForTimeout(700);
    for (let i = 0; i < 4; i++) await click('.cm-zoom button[aria-label="Zoom in"]');
    assert.ok(await page.$eval('.cm-stage > .cm-minimap', e => !e.hidden && e.querySelectorAll('rect.mb').length > 0), 'zoomed in, the Threat model (the chapter’s own view) shows the minimap with its boxes');
    await page.click('.cm-views .cm-view[data-id="table"]'); await page.waitForSelector('.nt-table tbody tr', {timeout: 15000}); await page.waitForTimeout(300);
    const cell = await page.$eval('.nt-table tbody tr td', e => { const r = e.getBoundingClientRect(); return {x: r.x + 10, y: r.y + 6}; });
    await page.mouse.move(cell.x, cell.y); await page.keyboard.down('Control'); await page.mouse.wheel(0, -300); await page.keyboard.up('Control'); await page.waitForTimeout(300);
    const sheetZoom = await page.$eval('.cm-sheet', e => Number(e.style.zoom) || 1);
    assert.ok(sheetZoom > 1 && /^\d+%$/.test(await page.$eval('.cm-zoom-value', e => e.textContent)) && Number((await page.$eval('.cm-zoom-value', e => e.textContent)).slice(0, -1)) > 100, 'Ctrl + wheel over the Table zooms it at the pointer and the readout says so: ' + sheetZoom);
    pass('arrange, navigation and names: the selection toolbar stands over two selected elements with align, distribute, size, pin and clear, Align left aligns and pins, Escape clears any selection, the Fit menu’s help names the keyboard map, Fit on open is remembered with the camera per view, double-click fits a group, the chapter’s own view shows the minimap, the Table zooms at the pointer, and the show/hide menu is called Visibility');
  }

  // 3f. The Drivers lens (rc39, W2 step 5, PLAN §4.3.5): in the lens row of the Diagram and the Layers view, a driver
  // picker (data-lens="drivers", data-driver on the row and its options); the elements the driver reaches are lit with
  // the state of the questions it opens on them (three fills, in the Key), the rest dimmed; a lit element's companion
  // reads its basis with one Decide action; the overlay is paint only: no element moves, the camera stays, nothing is
  // written. The reach is read from design-questions.js, the same projection the picture paints.
  {
    const p = referenceProject(), reach = driverReach(p, 'QD-003');
    assert.ok(reach.size >= 2 && [...reach.values()].every(s => ['open', 'draft', 'decided', 'none'].includes(s)), 'QD-003 reaches elements with a state: ' + JSON.stringify([...reach]));
    await open(5);
    const row = await page.$eval('.cm-lenses [data-lens="drivers"]', e => ({driver: e.dataset.driver || null, options: [...e.querySelectorAll('option[data-driver]')].map(o => o.dataset.driver), words: e.querySelector('span')?.textContent}));
    assert.ok(row.driver === null && row.options.includes('QD-003') && row.options.length === p.quality.drivers.length && row.words === 'Drivers', 'the lens row offers every driver of the project, none lit: ' + JSON.stringify(row));
    const scene = () => page.evaluate(() => ({nodes: [...document.querySelectorAll('.cm-svg .nt-node[data-nt-node]')].map(n => n.dataset.ntNode + '@' + n.getAttribute('transform')).join('|'), cam: document.querySelector('.cm-world').style.transform, zoom: document.querySelector('.cm').dataset.modelCameraZoom}));
    const before5 = await scene(), saved = JSON.stringify(await page.evaluate(() => window.aiwProjectStore?.value?.document?.realisation?.components?.length ?? null));
    await page.selectOption('.cm-lenses [data-lens="drivers"] select', 'QD-003'); await page.waitForTimeout(900);
    const lit = await page.evaluate(() => ({driver: document.querySelector('[data-lens="drivers"]')?.dataset.driver, on: document.querySelector('.cm').classList.contains('nt-lens-drivers'), lit: [...document.querySelectorAll('.cm-svg .nt-node[data-nt-node]')].filter(n => /nt-dr-(open|draft|decided)/.test(n.className.baseVal || n.getAttribute('class'))).map(n => [n.dataset.ntNode, (n.getAttribute('class').match(/nt-dr-(open|draft|decided)/) || [])[1]]), dim: document.querySelectorAll('.cm-svg .nt-node.nt-dr-dim').length, total: document.querySelectorAll('.cm-svg .nt-node[data-nt-node]').length, key: document.querySelector('.cm-legend')?.textContent.replace(/\s+/g, ' ') || '', swatches: document.querySelectorAll('.cm-legend [data-nt-mark^="driver-"] .nt-dr-k').length, dimOpacity: getComputedStyle(document.querySelector('.cm-svg .nt-node.nt-dr-dim') || document.body).opacity}));
    assert.ok(lit.driver === 'QD-003' && lit.on, 'the row says which driver is lit');
    const drawn = await page.$$eval('.cm-svg .nt-node[data-nt-node]', ns => ns.map(n => n.dataset.ntNode));
    const expected = drawn.filter(id => reach.has(id) && reach.get(id) !== 'none').map(id => [id, reach.get(id)]).sort();
    assert.deepEqual(lit.lit.sort(), expected, 'the elements the driver reaches are lit with their state, as the projection reads them');
    assert.ok(expected.length >= 1 && lit.dim === lit.total - expected.length && lit.dimOpacity === '0.22', 'the rest are dimmed at the marks’ dim opacity (0.22): ' + lit.dim + ' of ' + lit.total);
    assert.ok(lit.swatches === 4 && /Drivers lens · QD-003/.test(lit.key) && /reached · decided ×\d+/.test(lit.key) && /reached · answered in draft ×\d+/.test(lit.key) && /reached · a design question open ×\d+/.test(lit.key) && /not reached by this driver \(dimmed\) ×\d+/.test(lit.key), 'the Key carries the three fills and the dimmed rest with their counts: ' + lit.key.slice(0, 240));
    const after5 = await scene();
    assert.equal(after5.nodes, before5.nodes, 'no element moved: the lens is paint only'); assert.equal(after5.cam, before5.cam, 'and the camera stayed');
    assert.equal(JSON.stringify(await page.evaluate(() => window.aiwProjectStore?.value?.document?.realisation?.components?.length ?? null)), saved, 'and nothing was written');
    // A lit element's companion reads its basis for this driver, with one Decide action per open question (the shell's contract).
    const litId = expected.find(([, s]) => s === 'open')?.[0] || expected[0][0];
    await page.$eval(`.cm-svg .nt-node[data-nt-node="${litId}"]`, e => e.dispatchEvent(new MouseEvent('click', {bubbles: true}))); await page.waitForTimeout(700);
    const basis = await page.evaluate(() => { const b = document.querySelector('#inspector .cm-companion .nt-basis'); if (!b) return null; return {head: b.querySelector('h4')?.textContent.replace(/\s+/g, ' '), rows: b.querySelectorAll('.nt-basis-q').length, states: [...b.querySelectorAll('.nt-basis-q')].map(q => (q.className.match(/nt-dr-(open|draft|decided)/) || [])[1]), decide: [...b.querySelectorAll('[data-action="design-decide"]')].map(x => ({q: x.dataset.question, r: x.dataset.record, text: x.textContent.trim()}))}; });
    const basisOf = designQuestions(p, litId), mine = basisOf.questions.filter(q => q.because.includes('QD-003'));
    assert.ok(basis && /^Design basis · QD-003/.test(basis.head) && basis.rows === mine.length && basis.rows >= 1, 'the companion reads the lit element’s basis for the driver: ' + JSON.stringify(basis));
    assert.deepEqual(basis.states, mine.map(q => q.state), 'each question with its state, as the projection reads it');
    assert.deepEqual(basis.decide, mine.filter(q => q.state === 'open').map(q => ({q: q.id, r: litId, text: 'Decide → Co-design'})), 'one Decide action per open question, in the shell’s contract (data-action="design-decide", data-question, data-record)');
    // The Layers view carries the same lens. With the lit element still selected it opens focused on that element's
    // neighbourhood (elements, no type groups): the reached elements are lit with their state as the projection reads
    // them, the rest dimmed. In its clean state (a fresh session) the overview draws the type groups: a group is lit by
    // its members, with the worst of their states, the rest dimmed.
    const layersLit = () => page.evaluate(() => { const nodes = [...document.querySelectorAll('.cm-svg .nt-node[data-nt-node]')], st = n => (n.getAttribute('class').match(/nt-dr-(open|draft|decided)/) || [])[1] || null; return {driver: document.querySelector('.cm-lenses [data-lens="drivers"]')?.dataset.driver, groups: nodes.filter(n => n.dataset.ntNode.startsWith('fold:')).length, lit: nodes.filter(st).map(n => [n.dataset.ntNode, st(n)]).sort(), dim: nodes.filter(n => n.classList.contains('nt-dr-dim')).length, total: nodes.length, drawn: nodes.map(n => n.dataset.ntNode)}; });
    await click('.cm-views [data-id="layers"]'); await page.waitForSelector('.cm-svg .nt-lane'); await page.waitForTimeout(500);
    const focused = await layersLit(), expectedFocused = focused.drawn.filter(id => reach.has(id) && reach.get(id) !== 'none').map(id => [id, reach.get(id)]).sort();
    assert.ok(focused.driver === 'QD-003' && focused.groups === 0 && expectedFocused.length >= 1 && await objectParam() === litId, 'with the element selected the Layers view opens focused on it, elements without type groups: ' + JSON.stringify({driver: focused.driver, groups: focused.groups, total: focused.total}));
    assert.deepEqual(focused.lit, expectedFocused, 'the reached elements are lit with their state, as the projection reads them');
    assert.equal(focused.dim, focused.total - expectedFocused.length, 'and the rest dimmed');
    // The grouped overview is the view's clean state (no selection, focus or reveal kept): a fresh session opens it
    // grouped, and choosing the driver there lights the type groups by their members.
    const ctx2 = await browser.newContext({viewport: {width: 1440, height: 900}}), page2 = await ctx2.newPage();
    await page2.goto(base + '/?chapter=5&tab=model&model=layers', {waitUntil: 'networkidle'}); await page2.waitForSelector('.cm-svg .nt-lane'); await page2.waitForTimeout(700);
    await page2.selectOption('.cm-lenses [data-lens="drivers"] select', 'QD-003'); await page2.waitForTimeout(900);
    const grouped = await page2.evaluate(() => { const nodes = [...document.querySelectorAll('.cm-svg .nt-node[data-nt-node]')], st = n => (n.getAttribute('class').match(/nt-dr-(open|draft|decided)/) || [])[1] || null; return {driver: document.querySelector('.cm-lenses [data-lens="drivers"]')?.dataset.driver, object: new URL(location.href).searchParams.get('object'), groups: nodes.filter(n => n.dataset.ntNode.startsWith('fold:')).length, lit: nodes.filter(st).map(n => [n.dataset.ntNode, st(n)]).sort(), dim: nodes.filter(n => n.classList.contains('nt-dr-dim')).length, total: nodes.length}; });
    await ctx2.close();
    const componentIds = (p.realisation?.components || []).map(c => c.id), worstOf = ids => ['open', 'draft', 'decided'].find(s => ids.some(id => reach.get(id) === s)) || null;
    assert.ok(grouped.driver === 'QD-003' && grouped.object === null && grouped.groups >= 2, 'a fresh session opens the Layers overview grouped, and the driver chosen there keeps the lens: ' + JSON.stringify({driver: grouped.driver, object: grouped.object, groups: grouped.groups}));
    assert.equal(grouped.lit.find(([id]) => id === 'fold:view:application:component')?.[1], worstOf(componentIds), 'the components group is lit with the worst state among its members (' + worstOf(componentIds) + ')');
    assert.ok(grouped.lit.length >= 1 && grouped.lit.every(([id]) => id.startsWith('fold:')) && grouped.dim >= 1 && grouped.lit.length + grouped.dim === grouped.total, 'every drawn group is lit or dimmed, at least one of each: ' + JSON.stringify({lit: grouped.lit, dim: grouped.dim, total: grouped.total}));
    await page.selectOption('.cm-lenses [data-lens="drivers"] select', ''); await page.waitForTimeout(500);
    assert.equal(await count('.cm-svg .nt-node[class*="nt-dr-"]'), 0, 'no driver: nothing lit, nothing dimmed');
    await click('.cm-views [data-id="diagram"]');
    pass('the Drivers lens: the lens row of the Diagram and the Layers view offers every driver; QD-003 lights the elements it reaches with the state of the questions it opens (three fills in the Key), dims the rest at 0.22, moves nothing and writes nothing; a lit element’s companion reads its basis with one Decide action per open question; the Layers view lights the type groups holding reached records');
  }

  // 4. A drag pins; the keyboard moves and pins; one pin is released at a time; click and Enter select.
  // From the shell's clean frame (the sections above leave the Details column open, an arrangement chosen by hand and
  // a selection), with the element on the stage: a pointer reaches an element only where the stage shows it.
  await open(5);
  if (await page.evaluate(() => document.body.dataset.panel === 'open')) { await page.evaluate(() => document.querySelector('[data-panel-toggle]')?.click()); await page.waitForTimeout(300); await open(5); }
  await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await page.waitForTimeout(500);
  await click('[data-nt="menu"][data-id="arrange"]'); await click('.nt-arrange-panel [data-nt="arrange"][data-id="layered"]'); await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  if (await objectParam()) { await page.focus('.cm-svg .nt-node[data-sel="api-pod"]'); await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
  // With the whole picture fitted every element is on the stage; a pin keeps to its level in the Layered arrangement
  // (applyPins: within its band's row; rc40's bands hold one row each, 24 px above it and 16 below), so the pointer
  // moves along the level (30 px on screen, more in drawing units at the fitted scale) and its neighbours move aside.
  await click('.cm-walk .cm-zoom [aria-label="Fit the whole picture"]'); await page.waitForTimeout(500);
  const sel = '.cm-svg .nt-node[data-sel="risk-engine"]';
  const before = await nodeAt(sel);
  const box = await page.$eval(sel + ' rect.nt-box', e => { const r = e.getBoundingClientRect(), s = document.querySelector('.cm-stage').getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2, onStage: r.x >= s.x && r.right <= s.right && r.y >= s.y && r.bottom <= s.bottom, zoom: Number(document.querySelector('.cm').dataset.modelCameraZoom)}; });
  assert.ok(!before[2] && await objectParam() === null && box.onStage && box.zoom > 0 && box.zoom <= 1, 'before the drag: unpinned, nothing selected, the element on the stage at the whole fit: ' + JSON.stringify({pinned: before[2], box}));
  await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x + 30, box.y, {steps: 6}); await page.mouse.up(); await page.waitForTimeout(500);
  const after = await nodeAt(sel);
  assert.ok(after[2] && (Math.abs(after[0] - before[0]) > 20 || Math.abs(after[1] - before[1]) > 20), 'the dragged element moved and is pinned');
  assert.equal(await objectParam(), null, 'a drag is not a selection');
  // The keyboard moves by the grid when Snap to grid is on (the Arrange panel's default, 16 px; Shift four steps), by
  // 8 px (Shift 32) when it is off; each move pins.
  await click('[data-nt="menu"][data-id="arrange"]');
  assert.equal(await page.$eval('.nt-arrange-panel [data-nt="snap-moves"]', e => e.checked), true, 'Snap to grid is on by default'); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.focus('.cm-svg .nt-node[data-sel="api-pod"]');
  const k0 = await nodeAt('.cm-svg .nt-node[data-sel="api-pod"]');
  // (rc40: the moves run along the level — a Layered band holds one row, and a pin that leaves its row is released)
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400); await page.keyboard.press('Shift+ArrowRight'); await page.waitForTimeout(400);
  const k1 = await nodeAt('.cm-svg .nt-node[data-sel="api-pod"]');
  assert.ok(k1[2] && k1[0] === k0[0] + 16 + 64 && k1[1] === k0[1], 'arrow keys move the focused element by the grid (Shift four steps) along its level and pin it: ' + k0 + ' → ' + k1);
  await click('[data-nt="menu"][data-id="arrange"]'); await page.click('.nt-arrange-panel [data-nt="snap-moves"]'); await page.waitForTimeout(300); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.focus('.cm-svg .nt-node[data-sel="api-pod"]');
  // (back along the level, where the row has room: a move onto a neighbour is refused, not pinned)
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(400); await page.keyboard.press('Shift+ArrowLeft'); await page.waitForTimeout(400);
  const k2 = await nodeAt('.cm-svg .nt-node[data-sel="api-pod"]');
  assert.ok(k2[2] && k2[0] === k1[0] - 8 - 32 && k2[1] === k1[1], 'with Snap to grid off the keyboard moves 8 px (Shift 32) along the level and pins: ' + k1 + ' → ' + k2);
  await page.focus('.cm-svg .nt-node[data-sel="api-pod"]');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset?.ntNode), 'api-pod', 'focus stays on the moved element');
  assert.match(await page.$eval('.nt-live', e => e.textContent), /moved to[\s\S]*pinned/, 'the move is announced');
  // The control reads "Reset positions", enabled only while pins exist, counting them on its face (rc40 W2) and in its title (rc38).
  await click('[data-nt="menu"][data-id="arrange"]'); assert.deepEqual(await page.$eval('[data-nt="reset"]', e => [e.textContent.trim(), e.disabled, e.title]), ['Reset positions · 2 pinned', false, 'Release all 2 pinned positions in this picture'], 'the Arrange panel offers to release the two pins');
  assert.match(await page.$eval('.nt-arrange-panel .nt-arr-status', e => e.textContent), /^Layered · 2 pinned/, 'the panel\'s status line names the layout and the pins');
  await page.click('.nt-arrange-panel [data-nt="snap-moves"]'); await page.waitForTimeout(300); assert.equal(await page.$eval('.nt-arrange-panel [data-nt="snap-moves"]', e => e.checked), true, 'Snap to grid on again'); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.focus('.cm-svg .nt-node[data-sel="api-pod"]'); await page.keyboard.press('Delete'); await page.waitForTimeout(400);
  assert.equal(await count('.cm-svg .nt-node.pinned'), 1, 'Delete releases only the focused element’s pin');
  await click('[data-nt="menu"][data-id="arrange"]'); await click('[data-nt="undo"]');
  assert.equal(await count('.cm-svg .nt-node.pinned'), 2, 'Undo brings the last pin back');
  // The Arrange panel stays docked after Undo (rc39 W2, rc40 W2) and Redo brings the change back; pressing its control again would close it.
  assert.ok(await page.$('.nt-arrange-panel [data-nt="reset"]'), 'the Arrange panel stays docked after Undo');
  await click('.nt-arrange-panel [data-nt="redo"]'); assert.equal(await count('.cm-svg .nt-node.pinned'), 1, 'Redo releases that pin again');
  await click('.nt-arrange-panel [data-nt="undo"]'); assert.equal(await count('.cm-svg .nt-node.pinned'), 2, 'and Undo brings it back once more');
  await click('.nt-arrange-panel [data-nt="reset"]');
  assert.equal(await count('.cm-svg .nt-node.pinned'), 0, 'Release lets go of every pin');
  // The panel stays docked (Escape on the picture clears selections, not the panel) and the stage is beside it, never under it: its control closes it.
  assert.ok(await page.$eval('.nt-arrange-panel', (p) => { const s = document.querySelector('.cm-stage').getBoundingClientRect(), r = p.getBoundingClientRect(); return r.left >= s.right - 1 && r.width >= 280; }), 'the panel is docked at the right edge of the stage, not over the picture');
  if (await page.$('.nt-arrange-panel [data-nt="reset"]')) await click('[data-nt="menu"][data-id="arrange"]');
  assert.equal(await page.$('.nt-arrange-panel'), null, 'the Arrange control closes its panel');
  assert.equal(await page.$eval('[data-nt="menu"][data-id="arrange"]', e => e.getAttribute('aria-expanded')), 'false', 'and says so');
  await click(sel + ' rect.nt-box');
  assert.equal(await objectParam(), 'risk-engine', 'a click selects, into the address');
  assert.match(await page.$eval(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion)', e => e.innerText), /Risk engine/, 'and into the companion');
  await page.focus('.cm-svg .nt-node[data-sel="api-pod"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  assert.equal(await objectParam(), 'api-pod', 'Enter selects from the keyboard');
  const sys = await page.$eval('.cm-svg .nt-node[data-nt-node^="system:"]', e => e.dataset.ntNode);
  await page.focus(`.cm-svg .nt-node[data-sel="${sys}"]`); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  assert.match(await page.$eval(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) .cm-spec', e => e.innerText), /PHYSICAL APPLICATION COMPONENT[\s\S]*The application as a whole/i, 'an element only the diagram draws reads in the companion');
  pass('dragging pins an element, the arrow keys move and pin the focused one (announced), Delete releases one pin, Undo restores it, Release lets go of all; a click or Enter selects into the companion and the address');

  // 5. A relationship can be hovered, focused and selected; it reads in the companion.
  await open(5);
  // (a shown relationship's hit: rc40's Adjacent level parks the paths beyond it, whose hits are not Tab stops)
  const hit = await page.$('.cm-svg .nt-hit[tabindex="0"]');
  assert.ok(hit && await count('.cm-svg .nt-hit') === await count('.cm-svg .nt-edge[data-nt-edge]'), 'each relationship has a hit area');
  assert.match(await hit.evaluate(e => e.getAttribute('aria-label') + ' ' + e.querySelector('title')?.textContent), /relationship/i, 'with a spoken and hovered reading');
  await hit.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  assert.match(await page.$eval(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion)', e => e.innerText), /Selected relationship[\s\S]*(From|To)/i, 'Enter on a relationship reads it in the companion');
  assert.ok(await page.$('.cm-svg .nt-edge.sel'), 'and marks it on the picture');
  await showCompanion();   // §4 left the Details column closed
  assert.ok(await page.$eval('[data-nt="edge-clear"]', e => e.getClientRects().length > 0 && e.textContent.trim() === 'Clear the relationship'), 'the companion, shown, offers to clear the relationship');
  await click('[data-nt="edge-clear"]'); assert.equal(await page.$('.cm-svg .nt-edge.sel'), null, 'and it can be cleared');
  pass('a relationship has a hit area with a spoken and hovered reading; Enter selects it into the companion and marks it; it can be cleared');

  // 6. Menus answer the keyboard: arrows move, Escape closes and gives focus back.
  await page.focus('[data-nt="menu"][data-id="arrange"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  // rc40 W2: the panel is a dialog that opens with the keyboard on the current layout's card (Layered, chosen in §4);
  // ArrowDown moves to the next card; Tab and Shift+Tab stay inside; Escape closes it and gives focus back.
  const focused = () => page.evaluate(() => { const e = document.activeElement; return e ? (e.dataset.nt || '') + '/' + (e.dataset.id || '') : null; });
  const first = await focused();
  await page.keyboard.press('ArrowDown'); const second = await focused();
  const cardOrder = await page.$$eval('.nt-arrange-panel [data-nt="arrange"]', bs => bs.map(b => b.dataset.id));
  assert.deepEqual([first, second], ['arrange/layered', 'arrange/' + cardOrder[cardOrder.indexOf('layered') + 1]], 'Enter opens the Arrange panel on the current layout card and ArrowDown moves to the next card');
  assert.equal(await page.$eval('.nt-arrange-panel', e => e.getAttribute('role')), 'dialog', 'the panel is a dialog');
  await page.evaluate(() => document.querySelector('.nt-arrange-panel [data-nt="arrange-close"]').focus()); await page.keyboard.press('Shift+Tab');
  assert.ok(await page.evaluate(() => { const items = [...document.querySelectorAll('.nt-arrange-panel button:not(:disabled), .nt-arrange-panel input:not(:disabled)')]; return document.activeElement === items[items.length - 1]; }), 'Shift+Tab from the first control wraps to the last: focus stays inside the dialog');
  await page.keyboard.press('Tab');
  assert.equal(await focused(), 'arrange-close/', 'Tab from the last control wraps to the first');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  assert.equal(await page.$('.nt-arrange-panel'), null, 'Escape closes the panel');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset?.id), 'arrange', 'and gives focus back to its button');
  pass('the Arrange panel is a dialog: it answers the arrow keys, keeps Tab inside, and Escape closes it and gives focus back');

  // 7. Export: the same picture as SVG (with Key, title, description), PNG, diagram code and a SHA-256 manifest.
  const svg = await download(() => exportClick('svg'));
  assert.match(svg.name, /^AIW-Bank-Payment-Journey-ch5-application-layered(-v\d+)?\.svg$/, 'the file is named for the project, chapter, picture and its arrangement (Layered, the chapter\'s own, chosen in §4)');
  assert.ok(svg.text.startsWith('<svg') && /role="img"/.test(svg.text) && /<title id="nx-title">/.test(svg.text) && /<desc id="nx-desc">/.test(svg.text), 'titled and described');
  assert.ok(/PHYSICAL APPLICATION COMPONENT/.test(svg.text) && /composes/.test(svg.text) && /realizes/.test(svg.text) && svg.text.includes('Bank Payment Journey') && /class="nt-ref"/.test(svg.text) && /class="nt-kicker"/.test(svg.text) && /<g transform="translate\([^)]*\) scale/.test(svg.text), 'the elements with icons and references, the words and the header');
  assert.ok(/class="nt-keygroup"/.test(svg.text) && />Elements</.test(svg.text) && />Relationships</.test(svg.text), 'the Key travels with the picture');
  assert.ok(!/font:[^;"]*\b(serif|sans-serif)\b[^;"]*;?[^"]*nt-kicker/.test(svg.text) && /\.nt-kicker\{font:600 9\.5px/.test(svg.text), 'kickers at 9.5 px, not 6.5');
  // Chromium lets a page start two downloads before it asks; each export starts from a fresh page. The diagram code
  // exports stand in the Export view menu with the picture's (rc38: no Code menu of their own).
  await open(5);
  const dsl = await download(() => exportClick('structurizr'));
  assert.match(dsl.name, /\.dsl$/); assert.match(dsl.text, /\nworkspace [\s\S]*softwareSystem[\s\S]*views/);
  await open(5);
  const man = await download(() => exportClick('manifest'));
  const M = JSON.parse(man.text);
  assert.equal(M.schema, 'aiw.diagram-manifest/1'); assert.ok(M.figures.length >= 5, 'the manifest lists the picture and its code files');
  const svgRow = M.figures.find(f => f.mediaType === 'image/svg+xml'), dslRow = M.figures.find(f => f.path.endsWith('.dsl'));
  assert.equal(svgRow.sha256, sha(svg.text), 'the manifest’s SHA-256 is the downloaded SVG’s');
  assert.equal(svgRow.bytes, Buffer.byteLength(svg.text));
  assert.equal(dslRow.sha256, sha(dsl.text), 'and the downloaded DSL’s');
  assert.match(dsl.text, /^\/\*[\s\S]*Limit:[\s\S]*\*\/\nworkspace /, 'the code file says what it could not carry');
  // The PNG last: a download that starts after the image loads is not a click of its own.
  await open(5); const png = await download(() => exportClick('png'));
  assert.match(png.name, /\.png$/);
  pass('Export writes the same picture as SVG (titled, described, with icons, references and the Key; kickers at 9.5 px), PNG, Structurizr DSL and the other code formats, and a manifest whose SHA-256 matches the downloaded SVG');

  // 8. The picture does not depend on the window width.
  await page.setViewportSize({width: 1000, height: 900}); await open(9);
  const narrow = await download(() => exportClick('svg'));
  await page.setViewportSize({width: 1440, height: 900}); await open(9);
  const wide = await download(() => exportClick('svg'));
  assert.equal(sha(narrow.text), sha(wide.text), 'Chapter 9’s grouped picture is the same at 1000 and 1440 px');
  pass('the grouped Chapter 9 picture exported at a 1000 px and a 1440 px window is byte-identical');

  // 9. A deep link opens a named view; Chapter 8 offers its scenes; Chapter 10 draws zones, placements and numbered paths.
  await page.goto(base + '/?chapter=5&tab=model&model=components', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .rz-card'); await page.waitForTimeout(300);
  assert.equal(await page.$eval('.cm-view[aria-pressed="true"]', e => e.dataset.id), 'components', 'model=components opens the components view');
  await click('.cm-view[data-id="diagram"]'); assert.ok(await page.$('.cm-svg .nt-node'), 'and the Diagram is one click away');
  await open(8);
  const scenes8 = await page.$$eval('[data-nt-field="scene"] option', os => os.map(o => o.value));
  assert.deepEqual(scenes8, ['integration', 'data', 'lineage', 'cooperation', 'sequence', 'lifecycle'], 'Chapter 8 offers its six pictures (the sequence and the lifecycle since round 6)');
  await page.selectOption('[data-nt-field="scene"]', 'data'); await page.waitForTimeout(500);
  assert.match(await status(), /^Data & authority/); assert.ok(await page.$('.cm-svg .nt-node.nt-data-logical'), 'the data scene draws logical data components');
  await open(10);
  assert.ok(await page.$('.cm-svg .nt-group.nt-g-zone') && await page.$('.cm-svg .nt-group.nt-g-unplaced') && await page.$('.cm-svg .nt-group.nt-g-boundary'), 'the deployment draws the trust boundary, zones and the parts not placed');
  assert.ok(await page.$$eval('.cm-svg .nt-elabel .nt-step', s => s.length >= 1), 'runtime paths are numbered');
  // The reading is two lines with More (round 5, Contract G); the picture as text is under More.
  assert.match(await page.$eval(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion)', e => e.querySelector('.nt-more')?.textContent || ''), /Read this picture as text/i, 'the companion offers the picture as text, under More');
  // Overlays: the vitals of each running part, then the chapter findings as numbered callouts.
  await click('[data-nt="menu"][data-id="focus"]'); await click('[data-nt="vitals"]'); await page.waitForTimeout(1200);
  assert.ok(await count('.cm-svg .nt-node[class*="nt-v-"]') >= 1 && await count('.cm-svg .nt-vbadge-g') >= 1, 'the vitals overlay rings each running part by its worst vital and badges the count');
  if (!(await page.$('.nt-pop [data-nt="overlay"]'))) await click('[data-nt="menu"][data-id="focus"]');
  await click('[data-nt="overlay"][data-id="findings"]'); await page.waitForTimeout(1500);
  assert.ok(await count('.cm-svg .nt-callout') >= 1, 'the chapter findings stand on the picture as numbered callouts');
  const withCallouts = await download(() => exportClick('svg'));
  assert.ok(/class="nt-callout/.test(withCallouts.text), 'and travel with the exported picture');
  pass('a deep link opens a chapter model on a named view, Chapter 8 offers Integration, Data & authority, Data lineage and Application cooperation, Chapter 10 draws the trust boundary, zones, placements and numbered paths, the companion reads the picture as text, and the vitals and findings overlays stand on the picture and in its export');

  // 11. Round 5 (R5-B, Contract M): the chapter checks painted on the elements, the Checks switch, the Key, semantic zoom.
  {
    const ref = referenceProject();
    // Every word drawn in the picture's world with its size on screen (SVG by its screen transform, HTML by the zoom).
    const drawnText = () => page.evaluate(() => {
      // checkVisibility() does not see an SVG ancestor's display:none, so every ancestor is read.
      const out = [], z = Number(/scale\(([\d.]+)\)/.exec(document.querySelector('.cm-world').style.transform)?.[1] || 1), vis = e => { if (getComputedStyle(e).visibility !== 'visible') return false; for (let x = e; x && x.nodeType === 1; x = x.parentNode) if (getComputedStyle(x).display === 'none') return false; return true; };
      for (const t of document.querySelectorAll('.cm-world svg text')) { if (!t.textContent.trim() || !vis(t) || !t.getBoundingClientRect().width) continue; const m = t.getScreenCTM(); out.push({px: parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b), cls: t.getAttribute('class') || '', text: t.textContent.trim().slice(0, 24)}); }
      for (const e of document.querySelectorAll('.cm-world .cm-html *')) if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && vis(e) && e.getClientRects().length) out.push({px: parseFloat(getComputedStyle(e).fontSize) * z, cls: 'html ' + e.className, text: e.textContent.trim().slice(0, 24)});
      return {z, level: document.querySelector('.cm').dataset.cmZ, texts: out};
    });
    const painted = () => page.$$eval('.cm-svg .nt-node', ns => Object.fromEntries(ns.filter(n => n.querySelector(':scope > .nt-mk-badge')).map(n => [n.dataset.ntNode, [...n.classList].find(c => /^nt-mk-(pass|fix|confirm)$/.test(c))?.slice(6) + '|' + n.querySelector(':scope > .nt-mk-near .nt-mk-glyph').textContent + '|' + n.querySelector(':scope > .nt-mk-near .nt-mk-word').textContent])));
    const measured = [];
    for (const [ch, view] of [[4, 'diagram'], [4, 'layers'], [8, 'diagram'], [8, 'layers']]) {
      await page.goto(base + '/?chapter=' + ch + '&tab=model&model=' + view, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-svg .nt-node', {timeout: 15000}); await page.waitForTimeout(500);
      const drawn = await page.$$eval('.cm-svg .nt-node', ns => ns.map(n => n.dataset.ntNode)), want = checkMarks(ref, ch).filter(m => drawn.includes(m.id));
      assert.deepEqual(await painted(), Object.fromEntries(want.map(m => [m.id, `${m.state}|${CHECK_GLYPHS[m.state]}|${CHECK_WORDS[m.state]}`])), `Chapter ${ch} ${view}: the marks painted are the chapter’s checks, one for one, in the shared glyphs and words`);
      const key = await page.$eval('.cm-legend', e => e.innerText);
      for (const st of new Set(want.map(m => m.state))) assert.match(key, new RegExp(`On the picture[\\s\\S]*${CHECK_WORDS[st]}\\s*×${want.filter(m => m.state === st).length}`), `Chapter ${ch} ${view}: the Key lists the state drawn`);
      const T = await drawnText(), small = T.texts.filter(t => t.px < 9);
      assert.equal(T.level, T.z < 0.8 ? 'far' : T.level, 'the stage names its zoom level');
      assert.deepEqual(small, [], `Chapter ${ch} ${view} at the first fit (zoom ${T.z}): no drawn word under 9 px`);
      measured.push(`Ch ${ch} ${view}: ${want.length} marks (${[...new Set(want.map(m => m.state))].join(', ')}), first fit ${T.z}, ${T.texts.length} words drawn, smallest ${Math.min(...T.texts.map(t => t.px)).toFixed(1)} px`);
    }
    // Chapter 4 Diagram: far out only the names and glyphs; from 0.8 the element types; from 1.2 the references.
    // Chapter 4 arrives near its whole fit at 90 % or more (§3d, rc39), so the far level is reached by zooming to it.
    await open(4);
    const zoomTo = z => page.evaluate(z => { const st = document.querySelector('.cm-stage'); const r = st.getBoundingClientRect(); st.dispatchEvent(new WheelEvent('wheel', {deltaY: -Math.log(z / Number(/scale\(([\d.]+)\)/.exec(document.querySelector('.cm-world').style.transform)[1])) / 0.0022, ctrlKey: true, clientX: r.left + 200, clientY: r.top + 200, bubbles: true, cancelable: true})); }, z);
    await zoomTo(0.6); await page.waitForTimeout(300);
    assert.equal((await drawnText()).level, 'far', 'zoomed to 0.6: the far level');
    const far = await page.evaluate(() => { const vis = e => { for (let x = e; x && x.nodeType === 1; x = x.parentNode) if (getComputedStyle(x).display === 'none') return false; return true; }, n = s => [...document.querySelectorAll('.cm-svg ' + s)].filter(vis).length; return {ftitle: n('.nt-ftitle'), kicker: n('.nt-kicker'), glyphs: n('.nt-mk-far'), words: n('.nt-mk-word')}; });
    assert.ok(far.ftitle >= 5 && far.kicker === 0 && far.glyphs === 5 && far.words === 0, 'far out: the names (drawn large) and the glyphs alone: ' + JSON.stringify(far));
    await zoomTo(0.9); await page.waitForTimeout(300);
    let T = await drawnText(); const midZ = T.z;
    assert.equal(T.level, 'mid'); assert.ok(T.texts.some(t => t.cls === 'nt-kicker') && T.texts.some(t => t.cls === 'nt-mk-word') && !T.texts.some(t => t.cls === 'nt-ref'), 'from 0.8: the element types and the check words; the references wait');
    assert.deepEqual(T.texts.filter(t => t.px < 9), [], 'at ' + T.z + ': no drawn word under 9 px');
    await zoomTo(1.4); await page.waitForTimeout(300);
    T = await drawnText();
    assert.equal(T.level, 'near'); assert.ok(T.texts.some(t => t.cls === 'nt-ref'), 'from 1.2: the references');
    assert.deepEqual(T.texts.filter(t => t.px < 9), [], 'at ' + T.z + ': no drawn word under 9 px');
    measured.push(`element types drawn at zoom ${midZ}, references at ${T.z}, each word at 9 px or more`);
    // The companion reads the element the pointer rests on.
    await click('.cm-walk .cm-zoom [aria-label="Fit the whole picture"]');
    const at = await page.$eval('.cm-svg .nt-node[data-nt-node="ledger"]', e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await page.mouse.move(at[0], at[1]); await page.waitForTimeout(900);
    assert.match(await page.$eval('.cm-companion .nt-hover-read', e => e.innerText), /Under the pointer[\s\S]*Core ledger[\s\S]*LR-003[\s\S]*Check\s*○\s*to confirm/i, 'the companion reads the element under the pointer in full, with its check');
    await page.mouse.move(5, 5); await page.waitForTimeout(600);
    assert.equal(await count('.cm-companion .nt-hover-read'), 0, 'and lets it go when the pointer leaves');
    // The Checks switch in the Layers menu: off and on, per picture, remembered like the layers.
    await click('[data-nt="menu"][data-id="layers"]');
    assert.ok(await page.$('.nt-pop .nt-checks-switch input[data-nt="checks"]:checked'), 'Checks is on by default');
    await click('.nt-pop [data-nt="checks"]');
    assert.equal(await count('.cm-svg .nt-mk-badge'), 0, 'switched off, no check is painted'); assert.doesNotMatch(await page.$eval('.cm-legend', e => e.innerText), /On the picture/);
    await page.reload({waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-svg .nt-node', {timeout: 15000}); await page.waitForTimeout(400);
    assert.equal(await count('.cm-svg .nt-mk-badge'), 0, 'and it stays off for this picture after a reload');
    await page.click('.cm-view[data-id="layers"]'); await page.waitForTimeout(500);
    await click('[data-nt="menu"][data-id="layers"]');
    assert.ok(await page.$('.nt-pop .nt-checks-switch input[data-nt="checks"]:checked'), 'the Layers view keeps its own Checks switch on');
    await page.keyboard.press('Escape');
    if (await page.$('[data-nt="fold-all"]')) { await click('[data-nt="fold-all"]'); await page.waitForTimeout(500); }
    assert.ok(await count('.cm-svg .nt-mk-badge') >= 5, 'its individual source checks return when the grouped overview opens every element');
    await page.click('.cm-view[data-id="diagram"]'); await page.waitForTimeout(500);
    await click('[data-nt="menu"][data-id="layers"]'); await click('.nt-pop [data-nt="checks"]');
    assert.equal(await page.$$eval('.cm-svg .nt-mk-badge.nt-mk-far', b => b.length), 5, 'switched on again, the five checks return');
    // The export carries the same marks and Key (the Visibility menu closed first: open, it stands over the footer).
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const marked = await download(() => exportClick('svg'));
    assert.ok(marked.text.includes('nt-mk-badge') && marked.text.includes('On the picture') && marked.text.includes(CHECK_WORDS.confirm), 'the exported picture carries the marks and their Key');
    pass('marks on the picture (round 5): the chapter’s checks are painted on its elements one for one in the shared glyphs and words — Chapters 4 and 8, Diagram and Layers — and listed in the Key and the export; the Checks switch turns them off and on per picture and is remembered; semantic zoom draws only names and glyphs at the first fit, element types from 0.8 and references from 1.2, never a word under 9 px; the companion reads the element the pointer rests on (' + measured.join('; ') + ')');
  }

  // 12. Round 6 (Contract T): the sequence and lifecycle pictures render through the shared renderer; the process picture
  //     draws its event rings and offers the token walk, which paints through the marks channel and clears on Escape; the
  //     new pictures fit a 390 px phone without horizontal page scroll.
  {
    await open(8);
    await page.selectOption('[data-nt-field="scene"]', 'sequence'); await page.waitForTimeout(700);
    assert.match(await status(), /^Sequence · \d+ elements · \d+ relationships[\s\S]*· Sequence$/, 'the sequence picture opens on its own arrangement');
    const seq = await page.evaluate(() => ({lifelines: document.querySelectorAll('.cm-svg .nt-lifeline line').length, heads: document.querySelectorAll('.cm-svg .nt-node').length, messages: document.querySelectorAll('.cm-svg .nt-edge.nt-e-message').length, replies: document.querySelectorAll('.cm-svg .nt-edge.nt-e-message.reply').length, steps: [...document.querySelectorAll('.cm-svg .nt-elabel .nt-step')].map(t => Number(t.textContent)), key: document.querySelector('.cm-legend')?.innerText || ''}));
    // rc38's sequence draws one contract's exchange (IF-001: the initiating channel and the payment service, request 1
    // and response 3; the provider's own step is not a message) — measured the same on the rc.10.73.38 baseline; the
    // rc3x picture of every contract (six lifelines, ten messages) is not what rc38 draws.
    assert.ok(seq.lifelines >= 2 && seq.lifelines === seq.heads, 'a dashed lifeline under every head: ' + JSON.stringify(seq));
    assert.ok(seq.messages >= 2 && seq.replies >= 1 && seq.steps.length === seq.messages && seq.steps.every((s, i) => i === 0 ? s === 1 : s > seq.steps[i - 1]), 'messages numbered in call order from 1, responses dashed: ' + JSON.stringify(seq));
    assert.ok((await page.$$eval('.cm-svg .nt-edge.nt-e-message .nt-elabel', ts => ts.map(t => t.textContent))).every(t => /IF-00\d/.test(t)), 'every message names its contract');
    assert.match(seq.key, /Lifeline/, 'the Key names the lifelines');
    await click('[data-nt="menu"][data-id="arrange"]');
    assert.deepEqual(await page.$$eval('.nt-arrange-panel [data-nt="arrange"]', bs => bs.map(b => b.dataset.id)), ['sequence'], 'the sequence picture offers one arrangement');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    await page.selectOption('[data-nt-field="scene"]', 'lifecycle'); await page.waitForTimeout(700);
    assert.match(await status(), /^Data lifecycle/);
    const lc = await page.evaluate(() => ({states: document.querySelectorAll('.cm-svg .nt-node[data-nt-node^="state:"]').length, moves: document.querySelectorAll('.cm-svg .nt-edge.nt-e-transition').length, groups: document.querySelectorAll('.cm-svg .nt-group').length, words: [...document.querySelectorAll('.cm-svg .nt-elabel')].map(t => t.textContent.trim())}));
    // Two transitions out of one state share a contract: a word that would sit on another is hidden, so fewer words than moves.
    assert.ok(lc.states === 6 && lc.moves === 4 && lc.groups === 2 && lc.words.length >= 2 && lc.words.every(w => /^IF-00\d$/.test(w)), 'six states in two data definitions, four transitions labelled by their contract: ' + JSON.stringify(lc));
    await page.selectOption('[data-nt-field="scene"]', 'integration'); await page.waitForTimeout(300);
    // Chapter 1: the event rings, the Key's glyphs, and the walk.
    await open(1);
    assert.deepEqual(await page.$$eval('[data-nt-field="scene"] option', os => os.map(o => o.value)), ['process', 'context', 'motivation', 'sequence', 'module-map'], 'Chapter 1 offers the sequence of its journey (and, round 24, the module map)');
    const gl = await page.evaluate(() => ({start: document.querySelectorAll('.cm-svg .nt-ev-start').length, end: document.querySelectorAll('.cm-svg .nt-ev-end').length}));
    assert.ok(gl.start === 1 && gl.end === 3, 'the process draws its start ring and its three end rings: ' + JSON.stringify(gl));
    // The exported picture's Key lists the glyphs drawn (the screen's Key is the notation view's, which lists them once wired).
    const svg1 = await download(() => exportClick('svg'));
    assert.ok(/>Glyphs</.test(svg1.text) && /Start event/.test(svg1.text) && /End event/.test(svg1.text) && /nt-ev-start/.test(svg1.text), 'the exported Key has a Glyphs section naming the start and end events');
    await open(1);
    const companion = ':is(.cm:not(.cm-docked) .cm-panel,.cm-companion)';
    await showCompanion();
    await page.waitForSelector(companion + ' [data-pe="walk"]', {timeout: 8000});
    await click(companion + ' [data-pe="walk"]'); await page.waitForTimeout(400);
    const painted = () => page.evaluate(() => ({traced: [...document.querySelectorAll('.cm-svg .nt-node.nt-mk-traced')].map(n => n.dataset.ntNode), dimmed: document.querySelectorAll('.cm-svg .nt-node.nt-mk-dimmed').length, text: document.querySelector('.pe-walk-text')?.textContent || ''}));
    let w = await painted();
    assert.deepEqual(w.traced, ['PROC-REF-START'], 'the token starts on the start event'); assert.ok(w.dimmed >= 5, 'the rest of the process is dimmed: ' + w.dimmed); assert.match(w.text, /^1 of \d+ · Payment instruction received: the start event\./);
    await click(companion + ' [data-pe="walk-next"]'); w = await painted();
    assert.deepEqual(w.traced, ['JRN-001'], 'Next moves the token'); assert.match(w.text, /^2 of \d+ · [\s\S]*; reached by “Begin”\./);
    await click(companion + ' [data-pe="walk-back"]'); w = await painted(); assert.deepEqual(w.traced, ['PROC-REF-START'], 'Back moves it back');
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    w = await painted(); assert.deepEqual(w.traced, []); assert.equal(w.dimmed, 0); assert.ok(await page.$(companion + ' [data-pe="walk"]'), 'Escape clears the walk and offers it again');
    // 390 px.
    const phone = await browser.newContext({viewport: {width: 390, height: 844}});
    const p3 = await phone.newPage(); p3.on('pageerror', e => errors.push(e.message));
    await p3.goto(base + '/?chapter=8&tab=model&model=diagram', {waitUntil: 'networkidle'}); await p3.waitForSelector('.cm .cm-stage', {timeout: 10000}); await p3.waitForTimeout(500);
    await p3.selectOption('[data-nt-field="scene"]', 'sequence'); await p3.waitForTimeout(700);
    const m8 = await p3.evaluate(() => ({over: document.documentElement.scrollWidth > innerWidth, lifelines: document.querySelectorAll('.cm-svg .nt-lifeline').length}));
    assert.ok(!m8.over && m8.lifelines >= 2, 'phone, Chapter 8 sequence (the one contract rc38 draws, as §11): ' + JSON.stringify(m8));
    await p3.goto(base + '/?chapter=1&tab=model&model=diagram', {waitUntil: 'networkidle'}); await p3.waitForSelector('.cm .cm-stage', {timeout: 10000}); await p3.waitForTimeout(500);
    const m1 = await p3.evaluate(() => ({over: document.documentElement.scrollWidth > innerWidth, rings: document.querySelectorAll('.cm-svg .nt-ev').length}));
    assert.ok(!m1.over && m1.rings >= 4, 'phone, Chapter 1 process: ' + JSON.stringify(m1));
    await phone.close();
    pass(`round 6: the sequence picture renders ${seq.lifelines} lifelines and ${seq.messages} messages numbered in order with ${seq.replies} responses dashed and one arrangement; the lifecycle renders ${lc.states} states in ${lc.groups} data definitions with ${lc.moves} transitions by contract; Chapter 1 offers the sequence, draws its start and end rings with a Glyphs key, and walks the scenario: the token traced and the rest dimmed through the marks channel, Next and Back moving it, Escape clearing it; both pictures fit a 390 px phone`);
  }

  // 13. Round 10 (N6): lines drawn together, on the screen. Chapter 6's Solution picture draws its serves fans as lines: one
  //     Tab stop per relationship in the layout's order and none for a line; a click on a line selects the element its
  //     relationships share, whose reading lists them as buttons; a button selects that relationship, which lights exactly
  //     the runs it travels (every other run dims), is lifted whole over the lines and ringed at both ends, never in the
  //     export; a trace repaints the runs from the relationships on them without a redraw; a comparison colours a line by
  //     its relationships' change; the reading under the pointer says what a relationship or a line carries; keyboard
  //     focus keeps a relationship on the stage and pointer focus leaves the camera; lines, dots and hit bands keep their
  //     weight at the first fit.
  {
    await open(6);
    // The screen lays the picture out on its page (notation-view.js SCREEN_PAGE 1320 × min 820); the reference layout
    // here matches it. rc38 opens on the Overview connection mode (a few lines): All draws every relationship.
    const RD = viewpointProjection(notationDiagram(referenceProject(), 'solution')), RL = notationLayout(RD, {arrangement: 'layered', page: {width: 1320, min: 820}, stage: SCREEN_STAGE});
    await click('[data-nt="connections"][data-id="all"]'); await page.waitForTimeout(500);
    assert.equal(await count('.cm-svg .nt-hits .nt-hit'), RL.edges.length, 'with All chosen every relationship has its hit area');
    const pathD = pts => pts.map(([x, y], i) => (i ? 'L' : 'M') + (Math.round(x * 10) / 10) + ' ' + (Math.round(y * 10) / 10)).join('');
    const companion = ':is(.cm:not(.cm-docked) .cm-panel,.cm-companion)', camera = () => page.$eval('.cm-world', e => e.style.transform);
    const zoomOf = () => page.$eval('.cm-world', e => Number(/scale\(([\d.]+)\)/.exec(e.style.transform)?.[1] || 1));
    const fans = RL.bundles.filter(b => b.end !== 'both'), fan = fans.find(b => b.members.length >= 4);
    assert.ok(fan && fans.length >= 3, 'Chapter 6 draws its serves fans as lines: ' + fans.length);
    // The keyboard: one stop per relationship, in the layout's order; a line drawn for several takes none.
    await page.focus('.cm-svg .nt-hits .nt-hit');
    const order = [];
    for (let i = 0; i < RL.edges.length; i++) { if (i) await page.keyboard.press('Tab'); order.push(await page.evaluate(() => (document.activeElement?.classList.contains('nt-hit') ? document.activeElement.dataset.ntEdge : 'not a hit: ' + document.activeElement?.getAttribute('class')))); }
    assert.deepEqual(order, RL.edges.map(e => e.id), 'Chapter 6: one Tab stop per relationship, in the layout’s order (' + RL.edges.length + ')');
    await page.keyboard.press('Tab');
    assert.ok(!(await page.evaluate(() => document.activeElement?.classList?.contains('nt-bhit'))), 'Tab passes no line drawn for several relationships');
    assert.equal(await page.$$eval('.cm-svg .nt-bhit', bs => bs.filter(b => { b.focus(); return document.activeElement === b; }).length), 0, 'no line drawn for several relationships takes focus');
    await page.evaluate(() => document.activeElement?.blur());
    // At the first fit (zoom 0.5) a plain line keeps 1 screen px, a join dot 1.5 and a hit band 10; plain < lit < selected <
    // traced at every zoom, on a relationship's line and on a shared run alike.
    await click('.cm-walk .cm-zoom [aria-label="Fit the whole picture"]');
    // The first fit of a wide picture is zoom 0.5 (NT.fit's floor); set it exactly, whatever the stage's width.
    await page.evaluate(z => { const st = document.querySelector('.cm-stage'), r = st.getBoundingClientRect(), now = Number(/scale\(([\d.]+)\)/.exec(document.querySelector('.cm-world').style.transform)?.[1] || 1); if (Math.abs(now - z) > 1e-3) st.dispatchEvent(new WheelEvent('wheel', {deltaY: -Math.log(z / now) / 0.0022, ctrlKey: true, clientX: r.left + 40, clientY: r.top + 40, bubbles: true, cancelable: true})); }, 0.5);
    await page.waitForTimeout(300);
    const z0 = await zoomOf();
    const weight = await page.evaluate(() => { const cs = s => getComputedStyle(document.querySelector(s)); return {line: parseFloat(cs('.cm-svg .nt-edge:not(.lit):not(.sel) path.nt-line').strokeWidth), trunk: parseFloat(cs('.cm-svg .nt-trunk:not(.lit):not(.sel) path.nt-line').strokeWidth), join: parseFloat(cs('.cm-svg .nt-join').r), hit: parseFloat(cs('.cm-svg .nt-hit').strokeWidth), bhit: parseFloat(cs('.cm-svg .nt-bhit').strokeWidth)}; });
    assert.ok(Math.abs(z0 - 0.5) < 0.005, 'the picture is at zoom 0.5 (' + z0 + ')');
    assert.ok(weight.line * z0 >= 0.999 && weight.trunk * z0 >= 0.999, 'a plain line and a shared run keep 1 screen px: ' + JSON.stringify(weight));
    assert.ok(weight.join * z0 >= 1.499, 'a join dot keeps a 1.5 px radius on screen: ' + weight.join * z0);
    assert.ok(weight.hit * z0 >= 9.999 && weight.bhit * z0 >= 9.999, 'a hit band keeps 10 screen px: ' + JSON.stringify(weight));
    const ladder = () => page.evaluate(() => Object.fromEntries(['.cm-svg .nt-edge', '.cm-svg .nt-trunk'].map(s => {
      const g = document.querySelector(s), keep = g.getAttribute('class'), base = keep.replace(/\s(sel|lit|dim|nt-mk-lit|nt-mk-dim)(?=\s|$)/g, ''), p = g.querySelector(':scope > path.nt-line');
      const w = c => { g.setAttribute('class', base + c); return parseFloat(getComputedStyle(p).strokeWidth); };
      const out = [w(''), w(' lit'), w(' sel'), w(' nt-mk-lit'), w(' sel nt-mk-lit'), w(' lit nt-mk-lit')]; g.setAttribute('class', keep); return [s, out];
    })));
    const rising = L => L[0] < L[1] && L[1] < L[2] && L[2] < L[3] && L[4] === L[3] && L[5] === L[3];
    const far = await ladder();
    assert.ok(Object.values(far).every(rising), 'at zoom ' + z0 + ': plain < lit < selected < traced: ' + JSON.stringify(far));
    const restSVG = await download(() => exportClick('svg'));
    // A click on a line selects the element its relationships share; its reading lists them, each a button.
    const lineAt = id => page.evaluate(id => {
      const bh = [...document.querySelectorAll('.cm-svg .nt-bhit')].find(b => b.dataset.ntBundle === id), t = [...document.querySelectorAll('.cm-svg .nt-bundle')].find(g => g.dataset.ntBundle === id)?.querySelector('.nt-trunk path.nt-line');
      if (!bh || !t) return null; const m = t.getScreenCTM(), L = t.getTotalLength();
      for (let s = 2; s < L; s += 2) { const p = t.getPointAtLength(s), x = m.a * p.x + m.c * p.y + m.e, y = m.b * p.x + m.d * p.y + m.f; if (document.elementFromPoint(x, y) === bh) return {x, y}; }
      return null;
    }, id);
    const at = await lineAt(fan.id);
    assert.ok(at, 'the line of ' + fan.id + ' takes the pointer');
    await page.mouse.click(at.x, at.y); await page.waitForTimeout(500);
    assert.equal(await objectParam(), fan.node, 'a click on a line drawn for several relationships selects the element they share');
    assert.equal(await page.$eval('.cm-svg .nt-node.sel', e => e.dataset.ntNode), fan.node);
    const nodeTitle = RD.nodes.find(n => n.id === fan.node).title;
    const lines = await page.$eval(companion, e => ({text: e.textContent, picks: [...e.querySelectorAll('.nt-lines-node [data-nt="edge-pick"]')].map(b => b.dataset.id)}));
    assert.ok(lines.text.includes(nodeTitle) && /Lines drawn together/.test(lines.text), 'the companion reads ' + nodeTitle + ' and its lines drawn together');
    assert.deepEqual([...lines.picks].sort(), [...fan.members].sort(), 'each relationship on the line is a button in that reading');
    // A button selects its relationship: it lights exactly the runs it travels, every other run dims; it is lifted whole
    // over the lines and ringed at both ends; the keyboard goes to its hit.
    const pick = fan.members[1];
    await page.click(`${companion} .nt-lines-node [data-nt="edge-pick"][data-id="${pick}"]`); await page.waitForTimeout(500);
    const S = await page.evaluate(id => {
      const kids = [...document.querySelector('.cm-svg').children], idx = f => kids.findIndex(f), last = f => kids.length - 1 - [...kids].reverse().findIndex(f);
      const trunks = [...document.querySelectorAll('.cm-svg .nt-trunk')].map(t => ({on: JSON.parse(t.dataset.ntMembers).includes(id), sel: t.classList.contains('sel'), dim: t.classList.contains('dim')}));
      const under = kids.find(k => k.classList?.contains('nt-lift') && !k.classList.contains('nt-lift-ends')), ends = kids.find(k => k.classList?.contains('nt-lift-ends'));
      return {sel: [...document.querySelectorAll('.cm-svg .nt-edge.sel')].map(e => e.dataset.ntEdge), focus: document.activeElement?.dataset?.ntEdge || null, onSel: trunks.filter(t => t.on).map(t => t.sel), offDim: trunks.filter(t => !t.on).map(t => t.dim),
        lift: [...document.querySelectorAll('.cm-svg .nt-lift path')].map(p => [p.dataset.ntLift, p.getAttribute('class'), p.getAttribute('d')]), rings: document.querySelectorAll('.cm-svg .nt-lift-ends .nt-end').length,
        placed: !!under && !!ends && kids.indexOf(under) > last(k => k.classList?.contains('nt-edge')) && kids.indexOf(under) < idx(k => k.classList?.contains('nt-node')) && kids.indexOf(ends) > last(k => k.classList?.contains('nt-node')) && kids.indexOf(ends) < idx(k => k.classList?.contains('nt-hits')),
        inert: getComputedStyle(under).pointerEvents === 'none' && under.getAttribute('aria-hidden') === 'true' && getComputedStyle(ends).pointerEvents === 'none',
        reading: document.querySelector('.cm-companion .nt-relspec')?.textContent || '', others: [...document.querySelectorAll('.cm-companion .nt-relspec [data-nt="edge-pick"]')].map(b => b.dataset.id)};
    }, pick);
    assert.deepEqual(S.sel, [pick], 'the button selects that relationship'); assert.equal(S.focus, pick, 'and the keyboard is on its hit');
    assert.ok(S.onSel.length >= 1 && S.onSel.every(Boolean), 'every run it travels is lit as selected: ' + S.onSel.length);
    assert.ok(S.offDim.length >= 1 && S.offDim.every(Boolean), 'every run it does not travel dims: ' + S.offDim.length);
    assert.deepEqual(S.lift, [[pick, 'sel', pathD(RL.edges.find(e => e.id === pick).pts)]], 'the lift draws its whole route, trunk included');
    assert.ok(S.rings === 2 && S.placed && S.inert, 'ringed at both ends; the lift over the lines and under the elements, its rings over the elements, neither taking the pointer or speaking: ' + JSON.stringify({rings: S.rings, placed: S.placed, inert: S.inert}));
    assert.ok(S.reading.includes(`Drawn on one line with ${fan.members.length - 1} other serves relationships to ${nodeTitle}`), 'its reading names the line: ' + S.reading.slice(0, 200));
    assert.deepEqual([...S.others].sort(), fan.members.filter(m => m !== pick).sort(), 'and every other relationship on it, each a button');
    // The export never carries the lift or the screen's controls, at any zoom or selection.
    for (let i = 0; i < 7; i++) await click('.cm-walk .cm-zoom [aria-label="Zoom in"]');
    const near = await ladder(), z1 = await zoomOf();
    assert.ok(z1 > 1.5 && Object.values(near).every(rising), 'at zoom ' + z1 + ': plain < lit < selected < traced: ' + JSON.stringify(near));
    const selSVG = await download(() => exportClick('svg'));
    assert.equal(sha(selSVG.text), sha(restSVG.text), 'the exported picture is byte-identical at the first fit at rest and zoomed in with a relationship selected');
    assert.ok(!/nt-lift|nt-end|nt-bhit|nt-pick/.test(selSVG.text.replace(/<style>[\s\S]*?<\/style>/, '')), 'and carries no lift, ring, line hit or button');
    // Keyboard focus keeps a relationship on the stage; pointer focus leaves the camera where it is.
    const k = await page.evaluate(() => { const st = document.querySelector('.cm-stage').getBoundingClientRect(); return [...document.querySelectorAll('.cm-svg .nt-hits .nt-hit')].findIndex((h, i) => { const r = h.getBoundingClientRect(); return i > 0 && r.width < st.width * 0.5 && r.height < st.height * 0.5; }); });
    assert.ok(k > 0, 'a relationship that fits the stage zoomed in');
    await page.evaluate(k => document.querySelectorAll('.cm-svg .nt-hits .nt-hit')[k - 1].focus(), k); await page.waitForTimeout(500);
    const box = await page.evaluate(k => { const b = document.querySelectorAll('.cm-svg .nt-hits .nt-hit')[k].getBBox(), v = document.querySelector('.cm-svg').viewBox.baseVal; return {right: b.x + b.width / 2 > v.width / 2, down: b.y + b.height / 2 > v.height / 2}; }, k);
    const stage = await page.locator('.cm .cm-stage').boundingBox();
    await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2);
    await page.mouse.wheel(box.right ? -100000 : 100000, 0); await page.waitForTimeout(150); await page.mouse.wheel(0, box.down ? -100000 : 100000); await page.waitForTimeout(400);
    const inStage = () => page.evaluate(k => { const st = document.querySelector('.cm-stage').getBoundingClientRect(), r = document.querySelectorAll('.cm-svg .nt-hits .nt-hit')[k].getBoundingClientRect(); return r.left >= st.left - 1 && r.right <= st.right + 1 && r.top >= st.top - 1 && r.bottom <= st.bottom + 1; }, k);
    assert.equal(await inStage(), false, 'the relationship lies off the stage before the keyboard reaches it');
    await page.keyboard.press('Tab'); await page.waitForTimeout(700);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset?.ntEdge), RL.edges[k].id, 'Tab reaches the next relationship');
    assert.equal(await inStage(), true, 'and the camera brings its hit onto the stage');
    const pp = await page.evaluate(selected => { const st = document.querySelector('.cm-stage').getBoundingClientRect(); for (const h of document.querySelectorAll('.cm-svg .nt-hits .nt-hit')) { if (h.dataset.ntEdge === selected) continue; const r = h.getBoundingClientRect(); if (r.left >= st.left && r.right <= st.right && r.top >= st.top && r.bottom <= st.bottom) continue; const m = h.getScreenCTM(), L = h.getTotalLength(); for (let s = 3; s < L; s += 3) { const p = h.getPointAtLength(s), x = m.a * p.x + m.c * p.y + m.e, y = m.b * p.x + m.d * p.y + m.f; if (x > st.left + 20 && x < st.right - 20 && y > st.top + 20 && y < st.bottom - 20 && document.elementFromPoint(x, y) === h) return {id: h.dataset.ntEdge, x, y}; } } return null; }, pick);
    assert.ok(pp, 'a relationship that runs past the stage can be pointed at');
    const c0 = await camera(); await page.mouse.click(pp.x, pp.y); await page.waitForTimeout(700);
    assert.equal(await page.$eval('.cm-svg .nt-edge.sel', e => e.dataset.ntEdge), pp.id, 'the click selects it');
    assert.equal(await camera(), c0, 'and the camera stays: focus by the pointer never moves it');
    // A trace repaints the runs from the relationships that travel them, without a redraw (paintMarks), and lifts them.
    await click('.cm-walk .cm-zoom [aria-label="Fit the whole picture"]'); await click(`${companion} [data-nt="edge-clear"]`);
    const member = RD.edges.find(e => e.id === fan.members[0]);
    const tr = await page.evaluate(async ([a, b, id]) => {
      const first = document.querySelector('.cm-svg').firstElementChild;
      window.aiwModelMarks.set('n6-check', [{id: a, state: 'traced'}, {id: b, state: 'traced'}]); await new Promise(r => setTimeout(r, 300));
      const out = {redrawn: document.querySelector('.cm-svg').firstElementChild !== first, edges: [...document.querySelectorAll('.cm-svg .nt-edge.nt-mk-lit')].map(e => e.dataset.ntEdge), runs: [...document.querySelectorAll('.cm-svg .nt-trunk')].map(t => [JSON.parse(t.dataset.ntMembers).includes(id), t.classList.contains('nt-mk-lit')]), lift: [...document.querySelectorAll('.cm-svg .nt-lift path.nt-mk-lit')].map(p => p.dataset.ntLift)};
      window.aiwModelMarks.clear('n6-check'); await new Promise(r => setTimeout(r, 300));
      out.cleared = document.querySelectorAll('.cm-svg .nt-trunk.nt-mk-lit, .cm-svg .nt-edge.nt-mk-lit, .cm-svg .nt-lift').length; return out;
    }, [member.from, member.to, member.id]);
    assert.equal(tr.redrawn, false, 'a trace repaints in place');
    assert.ok(tr.edges.includes(member.id) && tr.runs.every(([on, lit]) => on === lit), 'the runs the traced relationship travels are traced, and only those: ' + JSON.stringify(tr.runs));
    assert.ok(tr.lift.includes(member.id) && tr.cleared === 0, 'it is lifted whole, and all of it goes when the trace does');
    // The reading under the pointer: a relationship (its words and its line), then a line (each of its relationships).
    const own = await page.evaluate(ids => { for (const id of ids) { const h = [...document.querySelectorAll('.cm-svg .nt-hit')].find(x => x.dataset.ntEdge === id), m = h.getScreenCTM(), L = h.getTotalLength(); for (let s = L - 4; s > 4; s -= 3) { const p = h.getPointAtLength(s), x = m.a * p.x + m.c * p.y + m.e, y = m.b * p.x + m.d * p.y + m.f; if (document.elementFromPoint(x, y) === h) return {id, x, y}; } } return null; }, fan.members);
    assert.ok(own, 'a relationship of the line can be pointed at on its own branch');
    await page.mouse.move(own.x, own.y); await page.waitForTimeout(800);
    const hr = await page.$eval('.cm-companion .nt-hover-read', e => e.textContent);
    assert.ok(hr.includes('Under the pointer · Relationship') && hr.includes(describeEdge(RD, own.id)) && hr.includes(`Drawn on one line with ${fan.members.length - 1} other serves relationships`), 'the companion reads the relationship under the pointer and its line: ' + hr);
    const at2 = await lineAt(fan.id); await page.mouse.move(at2.x, at2.y); await page.waitForTimeout(800);
    const hl = await page.$eval('.cm-companion .nt-hover-read', e => e.textContent);
    assert.ok(hl.includes(`Under the pointer · One line, ${fan.members.length} relationships`) && fan.members.every(id => hl.includes(describeEdge(RD, id))), 'and over a line, every relationship it carries: ' + hl.slice(0, 160));
    await page.mouse.move(5, 5); await page.waitForTimeout(500);
    // A comparison colours a line by its relationships' change: the core connector's needs added since a baseline draw
    // their fan as one added line. (The baseline is put in this page's copy of the document only; nothing is saved.)
    const injected = await page.evaluate(() => { const doc = window.aiwProjectStore?.value?.document; if (!doc?.technology?.mappings) return false; const src = structuredClone(doc), needs = new Map((src.technology.needs || []).map(n => [n.id, n])); src.technology.mappings = src.technology.mappings.filter(m => needs.get(m.needId)?.applicationId !== 'core-adapter'); doc.finalReview = doc.finalReview || {}; doc.finalReview.baselines = [...(doc.finalReview.baselines || []), {id: 'BL-N6', title: 'Before the core connector’s needs', source: src}]; return true; });
    assert.ok(injected, 'a baseline without the core connector’s needs');
    await page.$eval('.cm-svg .nt-node[data-nt-node="core-adapter"]', e => e.dispatchEvent(new MouseEvent('click', {bubbles: true}))); await page.waitForTimeout(400);
    // The Compare picker lives in the View options menu, which opens on its control and stays open while a baseline is chosen.
    assert.equal(await count('[data-nt-field="baseline"]'), 0, 'the Compare picker is not in the bar until the View options menu is opened');
    await click('[data-nt="menu"][data-id="options"]'); await page.waitForTimeout(300);
    assert.equal(await count('.nt-pop [data-nt-field="baseline"]'), 1, 'the View options menu holds the Compare picker');
    await page.selectOption('[data-nt-field="baseline"]', 'BL-N6'); await page.waitForTimeout(700);
    const diff = await page.evaluate(() => { const ch = g => ['added', 'removed', 'changed'].filter(c => g.classList.contains(c)).join(','); const E = new Map([...document.querySelectorAll('.cm-svg .nt-edge')].map(g => [g.dataset.ntEdge, ch(g)])); return [...document.querySelectorAll('.cm-svg .nt-trunk')].map(t => ({t: ch(t), m: [...new Set(JSON.parse(t.dataset.ntMembers).map(id => E.get(id)))], stroke: getComputedStyle(t.querySelector('path.nt-line')).stroke})); });
    assert.ok(diff.every(x => x.m.length === 1 && x.m[0] === x.t), 'every line carries its relationships’ change, which they share: ' + JSON.stringify(diff.filter(x => x.t)));
    assert.ok(diff.some(x => x.t === 'added') && diff.filter(x => x.t === 'added').every(x => x.stroke === 'rgb(47, 107, 79)'), 'the added fan is drawn as one added line, in the added colour');
    assert.equal(await page.$eval('[data-nt-field="baseline"]', e => e.value), 'BL-N6', 'the picker stays open with the chosen baseline');
    await page.selectOption('[data-nt-field="baseline"]', ''); await page.waitForTimeout(400);
    await click('[data-nt="menu"][data-id="options"]'); await page.waitForTimeout(200);
    assert.equal(await count('[data-nt-field="baseline"]'), 0, 'the View options menu closes on its control');
    pass(`round 10 on the screen (Chapter 6 Solution, ${fans.length} lines drawn together): one Tab stop per relationship in the layout’s order (${RL.edges.length}) and none for a line; a click on a line selects ${nodeTitle}, whose reading lists its ${fan.members.length} relationships as buttons; a button selects one, lighting the ${S.onSel.length} runs it travels and dimming the other ${S.offDim.length}, lifting its whole route over the lines with both ends ringed; a trace repaints the runs in place; a comparison draws an added fan as one added line; the reading under the pointer names a relationship and its line, or every relationship a line carries; Tab brings an off-stage relationship onto the stage and a click leaves the camera; at zoom ${z0} a line keeps ${(weight.line * z0).toFixed(2)} px, a dot ${(weight.join * z0).toFixed(2)} px and a hit ${(weight.hit * z0).toFixed(1)} px on screen with plain < lit < selected < traced there and at ${z1.toFixed(2)}; the export is byte-identical at rest and zoomed in with a selection, with no lift`);
  }

  // 10. A blank project draws nothing and says so.
  await page.goto(base + '/?view=projects', {waitUntil: 'networkidle'}); await page.waitForTimeout(600);
  await page.evaluate(() => { [...document.querySelectorAll('a, button')].find(b => /Create a project/.test(b.textContent))?.click(); }); await page.waitForTimeout(800);
  await page.fill('input[name=name]', 'Blank notation');
  await page.evaluate(() => { const r = [...document.querySelectorAll('input[name=template]')].find(r => /blank/i.test((r.closest('label') || r.parentElement)?.innerText || r.value)) || document.querySelector('input[name=template]'); if (r) { r.checked = true; r.dispatchEvent(new Event('change', {bubbles: true})); r.click(); } });
  await page.waitForTimeout(200);
  await page.evaluate(() => (document.querySelector('#create-submit') || document.querySelector('form button[type=submit]'))?.click());
  await page.waitForURL(u => !/view=projects/.test(String(u)), {timeout: 15000}); await page.waitForTimeout(1000);
  const pid = new URL(page.url()).searchParams.get('project'); assert.ok(pid);
  await open(5, '&project=' + encodeURIComponent(pid));
  assert.equal(await count('.cm-svg .nt-node'), 0); assert.match(await page.$eval('.cm-empty-card', e => e.innerText), /Nothing to draw yet[\s\S]*No application component is recorded yet/);
  // Round 11 (A): the picker offers the pictures the project can draw; its last entry, not selectable, names the rest.
  const blankPick = await page.$$eval('[data-nt-field="scene"] option', os => os.map(o => [o.value, o.disabled, o.textContent.trim()]));
  assert.deepEqual(blankPick, [['application', false, 'Application architecture'], ['', true, 'Later: Context once a component is recorded · Containers once a component is recorded']], 'Chapter 5 on a blank project: ' + JSON.stringify(blankPick));
  await open(1, '&project=' + encodeURIComponent(pid));
  assert.deepEqual(await page.$$eval('[data-nt-field="scene"] option', os => os.map(o => o.value)), ['process', 'motivation', ''], 'Chapter 1 on a blank project offers its process and motivation pictures');
  assert.equal(await page.$eval('[data-nt-field="scene"] option:disabled', o => o.textContent.trim()), 'Later: Context from Chapter 5 · Sequence from Chapter 8 · Module map once a requirement is recorded');
  await open(5);
  assert.deepEqual(await page.$$eval('[data-nt-field="scene"] option', os => os.map(o => o.value)), ['application', 'context', 'container'], 'the reference project’s Chapter 5 offers its three pictures; the cooperation picture is Chapter 8’s');
  pass('a blank project’s Diagram draws nothing and says why; its picker offers the pictures the project can draw and its last entry, not selectable, names what later records add (Chapter 1: Context from Chapter 5, Sequence from Chapter 8); Chapter 5 no longer offers the cooperation picture');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'standard diagrams (rendered)', passed: checks.length, checks}, null, 2));
