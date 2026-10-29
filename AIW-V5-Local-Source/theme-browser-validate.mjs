// The theme in the browser (round 9, audit/round9/DESIGN.md §2 D, E and G): the setting on the Projects page and in
// the chapters' top bar, kept per viewer and applied before the first paint; System following the operating system;
// print light; on representative screens in each theme, no text under 4.5:1 (3:1 for large text) and, in the dark
// theme, no large light surface; IBM Plex loaded from the app and Georgia only in the document rules; the model's
// canvas dark in the dark theme with the notation's own fills kept; an exported picture byte-identical in both; and
// (round 10) a selected, lit, traced or compared line keeping its state colour at night, shared trunks, their join dots
// and the lift re-coloured with the lines, and the picture in the system colours under forced colours.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally
// AIW_BROWSER_EXECUTABLE. Starts an isolated local server on a free port. Run: npm run test:theme
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: '.aiw-local/theme-browser-' + port + '.sqlite', OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } });
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const checks = [], errors = [];
const pass = n => { checks.push(n); console.log('PASS', n); };
const created = await fetch(base + '/api/projects', {method: 'POST', headers: {'Content-Type': 'application/json', Origin: base}, body: JSON.stringify({name: 'Bank Payment Journey', template: 'bank-payment'})});
const pid = (await created.json()).document?.id; assert.ok(pid, 'the bank project is created');
const SCREENS = [['projects', '/?view=projects'], ['Chapter 1 Work', `/?project=${pid}&chapter=1&tab=work`], ['Chapter 4 Model', `/?project=${pid}&chapter=4&tab=model`], ['Chapter 5 Validate', `/?project=${pid}&chapter=5&tab=validate`], ['Chapter 8 Output', `/?project=${pid}&chapter=8&tab=output`], ['Chapter 11 Model (the review desk)', `/?project=${pid}&chapter=11&tab=model`]];
const DOC_FONT = '.rv-document-cover h3, .rv-doc-title, .an-narr, .p-principle p';

// Reads what a viewer sees in the viewport: each element's colour over its effective ground, large light surfaces,
// the fonts in use. SVG content is the notation's own drawing and is left to contract E's checks.
const scan = (page, docFont) => page.evaluate(docFont => {
  const parse = c => { const m = c.match(/rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?/); if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
    const n = c.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?/); return n ? [n[1] * 255, n[2] * 255, n[3] * 255, n[4] === undefined ? 1 : +n[4]] : null; };
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const name = e => e.tagName.toLowerCase() + [...e.classList].slice(0, 2).map(c => '.' + c).join('');
  const ground = new Map([[document.body, parse(getComputedStyle(document.body).backgroundColor)]]);
  const low = [], light = [], georgia = []; let texts = 0;
  for (const e of document.querySelectorAll('body *')) {
    if (e.namespaceURI === 'http://www.w3.org/2000/svg') continue;
    const cs = getComputedStyle(e), c = parse(cs.backgroundColor), own = c && c[3] > 0.5 && cs.backgroundImage === 'none' ? c : null;
    ground.set(e, own || ground.get(e.parentElement) || ground.get(document.body));
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const b = e.getBoundingClientRect(); if (!b.width || b.bottom < 0 || b.top > innerHeight) continue;
    if (own && lum(own) > 0.45 && b.width * b.height > 3000) light.push(`${name(e)} ${Math.round(b.width)}×${Math.round(b.height)} ${cs.backgroundColor}`);
    if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || +cs.opacity <= 0.5) continue;
    texts++;
    if (/Georgia/.test(cs.fontFamily) && !e.closest(docFont)) georgia.push(name(e) + ' “' + e.textContent.trim().slice(0, 30) + '”');
    const fg = parse(cs.color), under = ground.get(e);
    if (!fg || !under || fg[3] <= 0.5) continue;
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700), r = ratio(fg, under);
    if (r < (big ? 3 : 4.5)) low.push(`${name(e)} “${e.textContent.trim().slice(0, 30)}” ${r.toFixed(2)}:1`);
  }
  return {low, light, georgia, texts, ground: lum(parse(getComputedStyle(document.body).backgroundColor))};
}, docFont);

const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
try {
  const context = async (theme, opts = {}) => {
    const ctx = await browser.newContext({viewport: {width: 1440, height: 900}, acceptDownloads: true, ...opts});
    // When the theme lands: before the body is parsed means before the first paint.
    await ctx.addInitScript(() => { new MutationObserver((_, o) => { if (document.documentElement.dataset.theme) { window.__themeAt = document.body ? 'after the body' : 'before the body'; o.disconnect(); } }).observe(document, {attributes: true, subtree: true, attributeFilter: ['data-theme']}); });
    if (theme) await ctx.addInitScript(t => { if (!sessionStorage.getItem('aiw.theme.seeded')) { localStorage.setItem('aiw.theme', t); sessionStorage.setItem('aiw.theme.seeded', '1'); } }, theme);
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message)); return {ctx, page};
  };
  const settle = (page, ms = 900) => page.waitForTimeout(ms);
  const go = async (page, url) => { await page.goto(base + url); await page.waitForSelector('.theme-switch'); await settle(page); await page.click('[data-coach="close"]', {timeout: 400}).catch(() => {}); await settle(page, 200); };
  const state = page => page.evaluate(() => ({theme: document.documentElement.dataset.theme, kept: (() => { try { return localStorage.getItem('aiw.theme'); } catch { return 'no storage'; } })(), pressed: [...document.querySelectorAll('[data-theme-choice][aria-pressed="true"]')].map(b => b.dataset.themeChoice), scheme: getComputedStyle(document.documentElement).colorScheme,
    ground: (() => { const m = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); })()}));

  // 1. The setting: on the Projects page and in the chapters, light by default, kept per viewer, applied at once and
  // before the first paint on the next page.
  {
    const {ctx, page} = await context(null);
    await go(page, '/?view=projects');
    let s = await state(page);
    assert.equal(s.theme, 'light', 'light is the default'); assert.deepEqual(s.pressed, ['light'], 'and the control says so'); assert.ok(s.ground > 0.8, 'on a light ground');
    const group = await page.$eval('.p-top .theme-switch', e => ({role: e.getAttribute('role'), label: e.getAttribute('aria-label'), buttons: [...e.querySelectorAll('button')].map(b => b.textContent)}));
    assert.deepEqual(group, {role: 'group', label: 'Theme', buttons: ['Light', 'Dark', 'System']}, 'the Projects page offers Light, Dark and System as a labelled group of buttons');
    await page.click('.p-top [data-theme-choice="dark"]'); await settle(page, 300);
    s = await state(page);
    assert.equal(s.theme, 'dark'); assert.equal(s.kept, 'dark', 'the choice is kept in this browser'); assert.deepEqual(s.pressed, ['dark']); assert.equal(s.scheme, 'dark', 'the browser draws its own controls dark'); assert.ok(s.ground < 0.05, 'the ground turns dark at once');
    await go(page, `/?project=${pid}&chapter=4&tab=model`);
    s = await state(page);
    assert.equal(s.theme, 'dark', 'a chapter opens dark'); assert.deepEqual(s.pressed, ['dark'], 'its control says so');
    assert.ok(await page.$('.top-actions .theme-switch'), 'the chapters\' top bar has the control');
    assert.equal(await page.evaluate(() => window.__themeAt), 'before the body', 'the theme is applied before the body is parsed, so the first paint is already dark');
    await page.focus('.top-actions [data-theme-choice="light"]'); await page.keyboard.press('Enter'); await settle(page, 300);
    s = await state(page);
    assert.equal(s.theme, 'light', 'the control answers the keyboard'); assert.equal(s.kept, 'light'); assert.ok(s.ground > 0.8);
    await page.reload(); await page.waitForSelector('.theme-switch'); s = await state(page);
    assert.equal(s.theme, 'light', 'and the choice survives a reload');
    await ctx.close();
    pass('Light by default; Light, Dark and System on the Projects page and in the chapters\' top bar as a labelled group; the choice applies at once, is kept per viewer, opens the next page in the same theme and answers the keyboard');
  }

  // 1b. On a phone the control is three glyphs that keep their words for assistive technology, inside the top bar.
  {
    const {ctx, page} = await context('dark', {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
    for (const url of ['/?view=projects', `/?project=${pid}&chapter=1&tab=work`]) {
      await go(page, url);
      const m = await page.evaluate(() => { const s = document.querySelector('.theme-switch'), b = s.getBoundingClientRect(), bar = s.closest('header').getBoundingClientRect();
        return {inside: b.top >= bar.top && b.bottom <= bar.bottom && b.left >= 0 && b.right <= innerWidth, overflow: document.scrollingElement.scrollWidth - innerWidth,
          glyphs: [...s.querySelectorAll('button svg')].filter(g => g.getBoundingClientRect().width > 0).length, names: [...s.querySelectorAll('button')].map(x => x.textContent.trim()),
          targets: [...s.querySelectorAll('button')].map(x => Math.round(x.getBoundingClientRect().height))}; });
      assert.ok(m.inside, url + ': the control sits inside the top bar on a phone'); assert.equal(m.overflow, 0, url + ': nothing scrolls sideways');
      assert.equal(m.glyphs, 3, url + ': three glyphs are shown'); assert.deepEqual(m.names, ['Light', 'Dark', 'System'], url + ': the buttons keep their names');
      assert.ok(m.targets.every(h => h >= 24), url + ': each target is at least 24 px (WCAG 2.2 target size): ' + m.targets);
    }
    await page.click('[data-theme-choice="light"]'); await settle(page, 300);
    assert.equal((await state(page)).theme, 'light', 'a tap on the sun chooses Light');
    await ctx.close();
    pass('on a 390 px phone the control is three glyphs inside the top bar of both pages, with the buttons keeping their names, targets of 24 px or more, nothing scrolling sideways, and a tap choosing the theme');
  }

  // 2. System follows the operating system; printing is light; without storage the page is light and works.
  {
    for (const [scheme, dark] of [['dark', true], ['light', false]]) {
      const {ctx, page} = await context('system', {colorScheme: scheme});
      await go(page, `/?project=${pid}&chapter=4&tab=model`);
      const s = await state(page);
      assert.equal(s.theme, 'system'); assert.deepEqual(s.pressed, ['system']);
      assert.ok(dark ? s.ground < 0.05 : s.ground > 0.8, `System on a ${scheme} operating system draws ${scheme} (${s.ground.toFixed(3)})`);
      if (dark) {
        const furniture = await page.evaluate(() => { const r = document.querySelector('.cm svg .nt-group rect, .cm svg .nt-hd'); return r ? getComputedStyle(r).fill : null; });
        if (furniture) assert.doesNotMatch(furniture, /rgb\(2[0-5]\d, 2[0-5]\d, 2[0-5]\d\)/, 'the picture\'s furniture follows the dark theme under System too: ' + furniture);
      }
      await ctx.close();
    }
    const {ctx, page} = await context('dark');
    await go(page, `/?project=${pid}&chapter=5&tab=validate`);
    await page.emulateMedia({media: 'print'});
    const printed = await state(page);
    assert.ok(printed.ground > 0.8, 'printing is light even in the dark theme');
    assert.equal(await page.$eval('.theme-switch', e => getComputedStyle(e).display), 'none', 'and the control is not printed');
    await ctx.close();
    const blocked = await browser.newContext({viewport: {width: 1440, height: 900}});
    await blocked.addInitScript(() => { Object.defineProperty(window, 'localStorage', {get() { throw new Error('storage blocked'); }}); });
    const bp = await blocked.newPage(); const bErrors = []; bp.on('pageerror', e => bErrors.push(e.message));
    await bp.goto(base + '/?view=projects'); await bp.waitForSelector('.theme-switch'); await bp.waitForTimeout(600);
    assert.equal(await bp.evaluate(() => document.documentElement.dataset.theme), 'light', 'without storage the page is light');
    await bp.click('.p-top [data-theme-choice="dark"]'); await bp.waitForTimeout(300);
    assert.equal(await bp.evaluate(() => document.documentElement.dataset.theme), 'dark', 'and the setting still works for the page');
    assert.deepEqual(bErrors.filter(m => !/storage blocked/.test(m)), [], 'with no error');
    await blocked.close();
    pass('System follows a dark and a light operating system, the picture\'s furniture included; printing is light without the control; with storage blocked the page is light and the setting still works');
  }

  // 3. Representative screens in each theme: contrast, surfaces, fonts.
  const fontsSeen = new Set();
  for (const theme of ['light', 'dark']) {
    const {ctx, page} = await context(theme);
    page.on('response', r => { if (r.url().endsWith('.woff2')) fontsSeen.add(r.url().replace(base, '')); });
    let texts = 0;
    for (const [label, url] of SCREENS) {
      await go(page, url);
      const r = await scan(page, DOC_FONT);
      texts += r.texts;
      assert.ok(theme === 'dark' ? r.ground < 0.05 : r.ground > 0.8, `${label}: the ${theme} ground`);
      assert.deepEqual(r.low, [], `${label} (${theme}): every text reaches 4.5:1, or 3:1 when large`);
      if (theme === 'dark') assert.deepEqual(r.light, [], `${label} (dark): no large light surface`);
      assert.deepEqual(r.georgia, [], `${label} (${theme}): Georgia only in the document rules`);
      if (label === 'Chapter 4 Model') {
        const ui = await page.evaluate(async () => { await document.fonts.ready; return {h1: getComputedStyle(document.querySelector('h1')).fontFamily, body: getComputedStyle(document.body).fontFamily, loaded: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '') + ' ' + f.weight)}; });
        assert.match(ui.h1, /^"?IBM Plex Sans"?/, 'headings are set in IBM Plex Sans'); assert.match(ui.body, /^"?IBM Plex Sans"?/, 'and the interface');
        assert.ok(ui.loaded.some(f => /^IBM Plex Sans 600$/.test(f)) && ui.loaded.some(f => /^IBM Plex Sans 400$/.test(f)), 'Plex Sans 400 and 600 are loaded: ' + ui.loaded.join(', '));
        const canvas = await page.evaluate(() => { const parse = c => c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; const lum = c => { const [r, g, b] = parse(c); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
          const stage = document.querySelector('.cm-stage, .cm-body'); const node = [...document.querySelectorAll('.cm svg .nt-node rect, .cm svg .nt-node path')].find(e => getComputedStyle(e).fill.startsWith('rgb'));
          let g = stage; while (g && getComputedStyle(g).backgroundColor === 'rgba(0, 0, 0, 0)') g = g.parentElement;
          return {stage: g ? lum(getComputedStyle(g).backgroundColor) : null, node: node ? lum(getComputedStyle(node).fill) : null}; });
        assert.ok(canvas.stage !== null && (theme === 'dark' ? canvas.stage < 0.06 : canvas.stage > 0.75), `the canvas ground follows the ${theme} theme (${canvas.stage?.toFixed(3)})`);
        assert.ok(canvas.node !== null && canvas.node > 0.3, `a notation fill keeps its own light colour in the ${theme} theme (${canvas.node?.toFixed(3)})`);
      }
    }
    await ctx.close();
    pass(`${theme}: ${SCREENS.length} screens (${texts} texts) with every text at 4.5:1 or better (3:1 when large)${theme === 'dark' ? ', no large light surface' : ''}, Georgia only in documents, IBM Plex Sans loaded for the interface; the canvas ground follows the theme and the notation keeps its fills`);
  }
  assert.ok([...fontsSeen].length >= 2 && [...fontsSeen].every(u => u.startsWith('/fonts/ibm-plex-')), 'the fonts come from the app itself: ' + [...fontsSeen].join(', '));
  for (const u of fontsSeen) { const r = await fetch(base + u); assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'font/woff2', u + ' is served as font/woff2'); }
  pass(`IBM Plex is fetched from the app (${fontsSeen.size} files) and served as font/woff2`);

  // 4. An exported picture is the same in both themes: the page re-colours the canvas, never the export.
  {
    const exportSvg = async theme => {
      const {ctx, page} = await context(theme);
      await go(page, `/?project=${pid}&chapter=5&tab=model`);
      const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-nt="export"][data-id="svg"]')]);
      const text = readFileSync(await download.path(), 'utf8'); await ctx.close(); return text;
    };
    const light = await exportSvg('light'), dark = await exportSvg('dark');
    assert.ok(light.startsWith('<svg') && light.length > 2000, 'the export is a picture');
    assert.equal(dark, light, 'the SVG exported in the dark theme is byte-identical to the one exported in light');
    assert.doesNotMatch(light, /var\(--/, 'and carries its own colours, no theme token');
    pass(`the Chapter 5 picture exported as SVG in the dark theme is byte-identical to the light export (${light.length} bytes) and carries its own colours`);
  }

  // 5. State colours at night (round 10 T1, audit/round10/DESIGN.md principle 8). The dark theme's stroke-attribute
  // rules beat the embedded state rules, so a selected, lit, traced or compared line drew in the plain line's colour and
  // only its width changed. On the Chapter 6 Diagram, in Light, Dark and System on a dark and on a light operating
  // system: each state set on a relationship's line and on a shared trunk computes to its colour, in the embedded
  // style's order; the lift, as liftSVG draws it, follows; a keyboard selection lights the relationship and every trunk
  // it travels, and an element's selection lights its lines. At night every state reaches 3:1 on the canvas (WCAG
  // 1.4.11) and a plain line keeps the night line colour; in light every colour is the exported one. Round 10 T2: a
  // trunk's join dot follows its line in every state and for every palette colour (night: the line's token), the joins
  // of a selected relationship's and a selected element's trunks take the state colour, and the lift drawn by a real
  // selection does too, and the captions a process's events and gateways carry on the ground read at night. Under
  // forced colours (5b) the picture's grounds are Canvas and its lines, heads, joins and words
  // CanvasText, a selected, lit or traced line, its joins, the lift, a selected element and keyboard focus Highlight,
  // and a removed line GrayText, each reaching 3:1 on the Canvas, whatever the app's theme.
  {
    const hex = c => '#' + String(c).match(/[\d.]+/g).slice(0, 3).map(v => Math.round(+v).toString(16).padStart(2, '0')).join('');
    const lum = h => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; const n = parseInt(h.slice(1), 16); return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255); };
    const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    // Single states, then pairs that test the order: diff after selection, traced after everything.
    const LINE = {
      light: {plain: '#3c4a44', sel: '#b18d42', lit: '#b18d42', 'nt-mk-lit': '#7a4fb0', added: '#2f6b4f', removed: '#6a786d', changed: '#bb8628', 'added sel': '#2f6b4f', 'removed lit': '#6a786d', 'changed sel': '#bb8628', 'sel nt-mk-lit': '#7a4fb0', 'changed nt-mk-lit': '#7a4fb0', weak: '#3c4a44', 'removed weak': '#6a786d'},
      night: {plain: '#82948b', sel: '#f0c674', lit: '#f0c674', 'nt-mk-lit': '#d6b4ef', added: '#7fd3a5', removed: '#667970', changed: '#996c00', 'added sel': '#7fd3a5', 'removed lit': '#667970', 'changed sel': '#996c00', 'sel nt-mk-lit': '#d6b4ef', 'changed nt-mk-lit': '#d6b4ef', weak: '#82948b', 'removed weak': '#667970'}};
    const LIFT = {light: {sel: '#b18d42', lit: '#b18d42', 'nt-mk-lit': '#7a4fb0', 'sel nt-mk-lit': '#7a4fb0', 'nt-end': '#b18d42'}, night: {sel: '#f0c674', lit: '#f0c674', 'nt-mk-lit': '#d6b4ef', 'sel nt-mk-lit': '#d6b4ef', 'nt-end': '#f0c674'}};
    const STATES = ['sel', 'lit', 'nt-mk-lit', 'added', 'removed', 'changed'];
    // Each palette stroke a line or trunk is drawn with (notation-palette.js STYLES), and its night token.
    const PALETTE = {'#3c4a44': '#82948b', '#778478': '#82948b', '#2f6b4f': '#7fd3a5', '#587448': '#7fd3a5', '#6f5a93': '#d6b4ef', '#805d83': '#d6b4ef', '#8a7f90': '#d6b4ef', '#b0493a': '#ff9b8c'};
    const {liftSVG} = await import('./public/notation-svg.js');
    const LD = {nodes: [{id: 'a'}, {id: 'b'}], edges: [{id: 'x', from: 'a', to: 'b', kind: 'serves'}, {id: 'y', from: 'a', to: 'b', kind: 'serves'}]}, LL = {edges: LD.edges.map((e, i) => ({...e, pts: [[0, i * 10], [40, i * 10]]}))};
    const liftMarkup = liftSVG(LD, LL, ['x', 'y'], {selEdge: 'x'}) + liftSVG(LD, LL, ['x'], {sel: 'a'}) + liftSVG(LD, LL, ['x', 'y'], {selEdge: 'x', marks: new Map([['a', {state: 'traced'}], ['b', {state: 'traced'}]])});
    const seen = [];
    for (const [theme, scheme] of [['light', 'light'], ['dark', 'light'], ['system', 'dark'], ['system', 'light']]) {
      const night = theme === 'dark' || (theme === 'system' && scheme === 'dark'), want = LINE[night ? 'night' : 'light'], label = theme + (theme === 'system' ? ` on a ${scheme} operating system` : '');
      const {ctx, page} = await context(theme, {colorScheme: scheme});
      await go(page, `/?project=${pid}&chapter=6&tab=model&model=diagram`);
      await page.waitForSelector('.cm .cm-svg g.nt-trunk path.nt-line', {state: 'attached'});
      const r = await page.evaluate(({states, liftMarkup, palette}) => {
        const svg = document.querySelector('.cm .cm-svg'), line = g => g.querySelector(':scope > path.nt-line');
        const plainInk = g => line(g)?.getAttribute('stroke') === '#3c4a44' && !!line(g).getAttribute('d');
        const out = {};
        for (const [k, g] of [['line', [...svg.querySelectorAll('g.nt-edge')].find(plainInk)], ['trunk', [...svg.querySelectorAll('g.nt-trunk')].find(plainInk)]]) {
          if (!g) { out[k] = null; continue; }
          const keep = g.getAttribute('class'); out[k] = {};
          for (const s of states) { g.setAttribute('class', s === 'plain' ? keep : keep + ' ' + s); const cs = getComputedStyle(line(g)); out[k][s] = {stroke: cs.stroke, dash: cs.strokeDasharray, opacity: +cs.opacity}; }
          g.setAttribute('class', keep);
        }
        // A shared trunk with a join dot, in each state: the dot and its line.
        const jt = [...svg.querySelectorAll('g.nt-trunk')].find(g => plainInk(g) && g.querySelector(':scope > circle.nt-join[fill="#3c4a44"]'));
        if (jt) {
          const keep = jt.getAttribute('class'), dot = jt.querySelector(':scope > circle.nt-join'); out.join = {};
          for (const s of states) { jt.setAttribute('class', s === 'plain' ? keep : keep + ' ' + s); out.join[s] = {stroke: getComputedStyle(line(jt)).stroke, fill: getComputedStyle(dot).fill}; }
          jt.setAttribute('class', keep);
        } else out.join = null;
        // Every palette stroke on a relationship's line, a trunk and its join, plain and selected, in the real page.
        const box = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        box.innerHTML = palette.map(h => `<g class="nt-edge"><path class="nt-line" d="M0 0H9" stroke="${h}"/></g><g class="nt-trunk"><path class="nt-line" d="M0 0H9" stroke="${h}"/><circle class="nt-join" cx="4" cy="0" r="2.4" fill="${h}"/></g>`).join('');
        svg.append(box);
        out.palette = palette.map((h, i) => {
          const e = box.children[2 * i], t = box.children[2 * i + 1], dot = t.querySelector('circle'), r = {edge: getComputedStyle(line(e)).stroke, trunk: getComputedStyle(line(t)).stroke, join: getComputedStyle(dot).fill};
          t.setAttribute('class', 'nt-trunk sel'); r.selTrunk = getComputedStyle(line(t)).stroke; r.selJoin = getComputedStyle(dot).fill;
          return [h, r];
        });
        box.remove();
        const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'g'); tmp.innerHTML = liftMarkup; svg.append(tmp);
        out.lift = [...tmp.querySelectorAll('.nt-lift > *')].map(e => [e.getAttribute('class'), getComputedStyle(e).stroke]); tmp.remove();
        let g = svg.closest('.cm-stage') || document.querySelector('.cm-stage'); while (g && getComputedStyle(g).backgroundColor === 'rgba(0, 0, 0, 0)') g = g.parentElement;
        out.ground = g ? getComputedStyle(g).backgroundColor : null;
        return out;
      }, {states: Object.keys(want), liftMarkup, palette: Object.keys(PALETTE)});
      assert.ok(r.line && r.trunk, `${label}: the Chapter 6 Diagram draws a relationship's line and a shared trunk in the plain line colour`);
      for (const k of ['line', 'trunk']) for (const [s, c] of Object.entries(want)) {
        assert.equal(hex(r[k][s].stroke), c, `${label}: a ${k === 'line' ? 'relationship\'s line' : 'shared trunk'} that is ${s} computes to ${c}`);
        assert.equal(r[k][s].dash, s.startsWith('removed') ? '3px, 3px' : r[k].plain.dash, `${label}: a ${s} ${k} keeps ${s.startsWith('removed') ? 'the removed dash' : 'its own dash'}`);
      }
      assert.ok(r.join, `${label}: the Chapter 6 Diagram draws a shared trunk with a join dot`);
      for (const [s, c] of Object.entries(want)) {
        assert.equal(hex(r.join[s].fill), c, `${label}: the join dot of a shared trunk that is ${s} computes to ${c}`);
        assert.equal(r.join[s].fill, r.join[s].stroke, `${label}: a ${s} join dot is drawn in its line's colour`);
      }
      for (const [h, p] of r.palette) {
        const c = night ? PALETTE[h] : h;
        assert.equal(hex(p.edge), c, `${label}: a relationship's line drawn ${h} computes to ${c}`);
        assert.equal(hex(p.trunk), c, `${label}: a trunk drawn ${h} computes to ${c}`);
        assert.equal(hex(p.join), c, `${label}: the join dot of a trunk drawn ${h} follows it (${c})`);
        assert.equal(hex(p.selTrunk), want.sel, `${label}: a selected trunk drawn ${h} computes to ${want.sel}`);
        assert.equal(hex(p.selJoin), want.sel, `${label}: and its join dot too`);
      }
      assert.deepEqual(new Set(r.lift.map(([c]) => c)), new Set(Object.keys(LIFT.light)), `${label}: liftSVG draws selected, lit and traced routes and the end rings`);
      for (const [c, stroke] of r.lift) assert.equal(hex(stroke), LIFT[night ? 'night' : 'light'][c], `${label}: the lift's ${c} computes to ${LIFT[night ? 'night' : 'light'][c]}`);
      // The contrast of each state as the eye sees it: the line's colour composited over the canvas at the opacity the
      // line is drawn with (an attenuated line, and a removed one, which the model marks weak too).
      const over = (h, g, a) => '#' + [0, 1, 2].map(i => Math.round(parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16) * a + parseInt(g.slice(1 + 2 * i, 3 + 2 * i), 16) * (1 - a)).toString(16).padStart(2, '0')).join('');
      const ground = hex(r.ground), ratios = [...STATES, 'weak', 'removed weak'].map(s => [s, contrast(over(want[s], ground, r.line[s].opacity), ground), r.line[s].opacity]);
      for (const [s, q, a] of ratios) assert.ok(q >= 3, `${label}: a ${s} line reaches 3:1 on the canvas ${ground} as drawn (opacity ${a}: ${q.toFixed(2)}:1)`);
      assert.ok(r.line.weak.opacity < 1 && r.line['removed weak'].opacity === 1, `${label}: an attenuated line is drawn lighter (opacity ${r.line.weak.opacity}), a removed one at full opacity in its own grey`);
      // A real selection with the keyboard: a relationship drawn partly on a shared trunk, then an element with a fan.
      const member = await page.evaluate(() => [...document.querySelectorAll('.cm .cm-svg g.nt-edge[data-nt-bundle]')].find(g => g.querySelector(':scope > path.nt-line')?.getAttribute('stroke') === '#3c4a44')?.dataset.ntEdge);
      assert.ok(member, `${label}: a relationship drawn on a shared trunk in the plain line colour`);
      await page.evaluate(id => [...document.querySelectorAll('.cm .cm-svg .nt-hit')].find(h => h.dataset.ntEdge === id).focus(), member);
      await page.keyboard.press('Enter'); await page.waitForSelector('.cm .cm-svg g.nt-edge.sel', {state: 'attached', timeout: 5000});
      const sel = await page.evaluate(() => ({id: document.querySelector('.cm .cm-svg g.nt-edge.sel').dataset.ntEdge, edge: [...document.querySelectorAll('.cm .cm-svg g.nt-edge.sel > path.nt-line')].map(p => getComputedStyle(p).stroke), trunks: [...document.querySelectorAll('.cm .cm-svg g.nt-trunk.sel > path.nt-line')].map(p => getComputedStyle(p).stroke),
        joins: [...document.querySelectorAll('.cm .cm-svg g.nt-trunk.sel > circle.nt-join')].map(c => getComputedStyle(c).fill), lift: [...document.querySelectorAll('.cm .cm-svg g.nt-lift :is(path.sel,.nt-end)')].map(e => [e.tagName, getComputedStyle(e).stroke])}));
      assert.equal(sel.id, member, `${label}: Enter selects the relationship`);
      assert.ok(sel.trunks.length >= 1, `${label}: the trunk it travels is selected with it`);
      assert.deepEqual([...new Set([...sel.edge, ...sel.trunks].map(hex))], [want.sel], `${label}: the selected relationship and its trunk draw ${want.sel}`);
      assert.ok(sel.joins.length >= 1, `${label}: the selected trunk carries a join dot`);
      assert.deepEqual([...new Set(sel.joins.map(hex))], [want.sel], `${label}: the selected trunk's join dots draw ${want.sel}`);
      assert.deepEqual(sel.lift.map(([t]) => t).sort(), ['circle', 'circle', 'path'], `${label}: the selection lifts the relationship's whole route with both ends ringed`);
      assert.deepEqual([...new Set(sel.lift.map(([, s]) => hex(s)))], [want.sel], `${label}: the lifted route and its rings draw ${want.sel}`);
      await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.cm .cm-svg g.nt-edge.sel'), null, {timeout: 5000});
      const hub = await page.evaluate(() => document.querySelector('.cm .cm-svg .nt-bhit')?.dataset.ntSelect);
      assert.ok(hub, `${label}: a fan's shared element`);
      await page.evaluate(id => document.querySelector(`.cm .cm-svg .nt-node[data-sel="${CSS.escape(id)}"]`).focus(), hub);
      await page.keyboard.press('Enter'); await page.waitForSelector('.cm .cm-svg g.nt-trunk.lit', {state: 'attached', timeout: 5000});
      const lit = await page.evaluate(() => ({edges: [...document.querySelectorAll('.cm .cm-svg g.nt-edge.lit > path.nt-line')].map(p => getComputedStyle(p).stroke), trunks: [...document.querySelectorAll('.cm .cm-svg g.nt-trunk.lit > path.nt-line')].map(p => getComputedStyle(p).stroke),
        joins: [...document.querySelectorAll('.cm .cm-svg g.nt-trunk.lit > circle.nt-join')].map(c => getComputedStyle(c).fill), rest: [...document.querySelectorAll('.cm .cm-svg g.nt-trunk:not(.lit):not(.sel) > circle.nt-join')].map(c => [getComputedStyle(c).fill, getComputedStyle(c.parentElement.querySelector(':scope > path.nt-line')).stroke])}));
      assert.ok(lit.edges.length >= 2 && lit.trunks.length >= 1, `${label}: selecting the element lights its relationships and their trunk (${lit.edges.length} lines, ${lit.trunks.length} trunk runs)`);
      assert.deepEqual([...new Set([...lit.edges, ...lit.trunks].map(hex))], [want.lit], `${label}: its lit lines draw ${want.lit}`);
      assert.ok(lit.joins.length >= 1, `${label}: its lit trunks carry join dots`);
      assert.deepEqual([...new Set(lit.joins.map(hex))], [want.lit], `${label}: the lit trunks' join dots draw ${want.lit}`);
      assert.ok(lit.rest.length >= 1 && lit.rest.every(([f, s]) => f === s), `${label}: every other join dot keeps its own line's colour (${lit.rest.length})`);
      // The captions the Chapter 1 process's events and gateways carry below them on the ground: the exported colours in
      // light; at night the title step, at 4.5:1 on the lane (they were drawn dark on the dark lane before round 10).
      await go(page, `/?project=${pid}&chapter=1&tab=model&model=diagram`);
      await page.waitForSelector('.cm .cm-svg .nt-bpmn-event', {state: 'attached'});
      const caps = await page.evaluate(() => { const svg = document.querySelector('.cm .cm-svg'); return {caps: [...svg.querySelectorAll(':is(.nt-bpmn-event,.nt-bpmn-gateway) :is(.nt-cap,.nt-ftitle)')].map(t => [t.getAttribute('class'), getComputedStyle(t).fill]), lane: getComputedStyle(svg.querySelector('.nt-g-lane > rect')).fill}; });
      const CAP = night ? {'nt-cap': '#e3ebe6', 'nt-ftitle': '#e3ebe6'} : {'nt-cap': '#2b3a33', 'nt-ftitle': '#1e2b26'};
      assert.ok(caps.caps.length >= 8, `${label}: the Chapter 1 process draws its events' and gateways' captions (${caps.caps.length})`);
      for (const [c, fill] of caps.caps) assert.equal(hex(fill), CAP[c], `${label}: an event's or gateway's ${c} computes to ${CAP[c]}`);
      if (night) assert.ok(contrast(CAP['nt-cap'], hex(caps.lane)) >= 4.5, `${label}: the captions reach 4.5:1 on the lane ${hex(caps.lane)} (${contrast(CAP['nt-cap'], hex(caps.lane)).toFixed(2)}:1)`);
      await ctx.close();
      seen.push(`${label}: ${night ? ratios.map(([s, q]) => `${s} ${want[s]} ${q.toFixed(2)}:1`).join(', ') + `, plain ${want.plain} on ${ground}` : 'the exported colours'}`);
    }
    pass(`state colours at night: on the Chapter 6 Diagram a selected, lit, traced, added, removed and changed line and shared trunk, its join dot, and the lift keep their colours in every theme, and every palette colour's trunk and join follow its line; a keyboard selection and an element's selection light their lines, trunks and join dots and lift the route; the Chapter 1 process's event and gateway captions read on their lane (${seen.join('; ')})`);

    // 5b. Forced colours (round 10 T2): the browser keeps an svg's own colours but paints the stage in the system Canvas,
    // so the picture's grounds, lines, heads, joins and words take the system colours, whatever the app's theme. Checked
    // on a dark and a light forced palette, with the light, dark and System themes.
    const FORCED = {plain: 'CanvasText', sel: 'Highlight', lit: 'Highlight', 'nt-mk-lit': 'Highlight', added: 'CanvasText', removed: 'GrayText', changed: 'CanvasText', 'added sel': 'Highlight', 'removed lit': 'GrayText', 'changed sel': 'Highlight', 'sel nt-mk-lit': 'Highlight', 'changed nt-mk-lit': 'Highlight'};
    const rgba = c => { const m = String(c).match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3] ?? 1]; };
    // A colour as drawn on the Canvas: a system colour may carry alpha (Chromium's Highlight is 80%).
    const onCanvas = (c, canvas) => { const [r, g, b, a] = rgba(c), [R, G, B] = rgba(canvas); return '#' + [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''); };
    const forcedSeen = [];
    for (const [theme, scheme] of [['light', 'dark'], ['dark', 'light'], ['system', 'dark'], ['light', 'light']]) {
      const label = `forced colours (${scheme} palette, ${theme} theme)`;
      const {ctx, page} = await context(theme, {colorScheme: scheme, forcedColors: 'active'});
      await go(page, `/?project=${pid}&chapter=6&tab=model&model=diagram`);
      await page.waitForSelector('.cm .cm-svg g.nt-trunk circle.nt-join', {state: 'attached'});
      const f = await page.evaluate(({states, liftMarkup}) => {
        const svg = document.querySelector('.cm .cm-svg'), line = g => g.querySelector(':scope > path.nt-line'), probe = document.createElement('i'); document.body.append(probe);
        const sys = Object.fromEntries(['Canvas', 'CanvasText', 'Highlight', 'GrayText'].map(k => { probe.style.color = k; return [k, getComputedStyle(probe).color]; })); probe.remove();
        const plainInk = g => line(g)?.getAttribute('stroke') === '#3c4a44' && !!line(g).getAttribute('d'), set = l => [...new Set(l)];
        const out = {sys, forced: matchMedia('(forced-colors: active)').matches, theme: document.documentElement.dataset.theme};
        for (const [k, g] of [['line', [...svg.querySelectorAll('g.nt-edge')].find(plainInk)], ['trunk', [...svg.querySelectorAll('g.nt-trunk')].find(g => plainInk(g) && g.querySelector(':scope > circle.nt-join'))]]) {
          if (!g) { out[k] = null; continue; }
          const keep = g.getAttribute('class'), dot = g.querySelector(':scope > circle.nt-join'); out[k] = {};
          for (const s of states) { g.setAttribute('class', s === 'plain' ? keep : keep + ' ' + s); out[k][s] = {stroke: getComputedStyle(line(g)).stroke, dash: getComputedStyle(line(g)).strokeDasharray, fill: dot ? getComputedStyle(dot).fill : null}; }
          g.setAttribute('class', keep);
        }
        out.grounds = set([...svg.querySelectorAll(':is(.nt-band,.nt-band-collapsed,.nt-group) > rect')].map(r => getComputedStyle(r).fill));
        out.frames = set([...svg.querySelectorAll(':is(.nt-band,.nt-band-collapsed,.nt-group) > rect')].map(r => getComputedStyle(r).stroke));
        out.frameText = set([...svg.querySelectorAll(':is(.nt-band,.nt-band-collapsed) > text, .nt-gtitle, .nt-gsub')].map(t => getComputedStyle(t).fill));
        out.words = set([...svg.querySelectorAll('.nt-elabel, .nt-qual, .nt-card')].map(t => getComputedStyle(t).fill + ' on ' + getComputedStyle(t).stroke));
        out.lines = set([...svg.querySelectorAll(':is(g.nt-edge,g.nt-trunk) > path.nt-line')].map(p => getComputedStyle(p).stroke));
        out.joins = set([...svg.querySelectorAll('g.nt-trunk > circle.nt-join')].map(c => getComputedStyle(c).fill));
        out.heads = set([...svg.querySelectorAll('marker [stroke]')].map(e => getComputedStyle(e).stroke).concat([...svg.querySelectorAll('marker [fill]:not([fill="none"],[fill="#fff"],[fill="#ffffff"])')].map(e => getComputedStyle(e).fill)));
        out.hollow = set([...svg.querySelectorAll('marker :is([fill="#fff"],[fill="#ffffff"])')].map(e => getComputedStyle(e).fill));
        out.counts = {grounds: svg.querySelectorAll(':is(.nt-band,.nt-band-collapsed,.nt-group) > rect').length, words: svg.querySelectorAll('.nt-elabel').length, heads: svg.querySelectorAll('marker [stroke], marker [fill]:not([fill="none"])').length, joins: svg.querySelectorAll('g.nt-trunk > circle.nt-join').length};
        const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'g'); tmp.innerHTML = liftMarkup; svg.append(tmp);
        out.lift = set([...tmp.querySelectorAll('.nt-lift > *')].map(e => getComputedStyle(e).stroke)); tmp.remove();
        let g = svg.closest('.cm-stage') || document.querySelector('.cm-stage'); while (g && getComputedStyle(g).backgroundColor === 'rgba(0, 0, 0, 0)') g = g.parentElement;
        out.ground = g ? getComputedStyle(g).backgroundColor : null;
        return out;
      }, {states: Object.keys(FORCED), liftMarkup});
      const S = f.sys, canvas = hex(S.Canvas);
      assert.ok(f.forced, `${label}: forced colours are active`);
      assert.equal(hex(f.ground), canvas, `${label}: the stage is the system Canvas`);
      assert.ok(f.line && f.trunk, `${label}: the Chapter 6 Diagram draws a relationship's line and a shared trunk with a join`);
      for (const k of ['line', 'trunk']) for (const [s, c] of Object.entries(FORCED)) {
        assert.equal(f[k][s].stroke, S[c], `${label}: a ${k === 'line' ? 'relationship\'s line' : 'shared trunk'} that is ${s} draws ${c}`);
        if (k === 'trunk') assert.equal(f[k][s].fill, S[c], `${label}: the join dot of a ${s} trunk draws ${c}, with its line`);
        if (s.startsWith('removed')) assert.equal(f[k][s].dash, '3px, 3px', `${label}: a removed ${k} keeps its dash`);
      }
      assert.deepEqual(f.grounds, [S.Canvas], `${label}: every band and frame the picture draws (${f.counts.grounds}) is the Canvas, so lines and joins sit on it`);
      assert.deepEqual(f.frames, [S.CanvasText], `${label}: their edges are CanvasText`);
      assert.deepEqual(f.frameText, [S.CanvasText], `${label}: and their titles`);
      assert.deepEqual(f.words, [`${S.CanvasText} on ${S.Canvas}`], `${label}: the words on lines (${f.counts.words}) are CanvasText on a Canvas halo`);
      assert.deepEqual(f.lines, [S.CanvasText], `${label}: every line and trunk at rest is CanvasText`);
      assert.deepEqual(f.joins, [S.CanvasText], `${label}: every join dot at rest (${f.counts.joins}) is CanvasText`);
      assert.deepEqual(f.heads, [S.CanvasText], `${label}: every head (${f.counts.heads}) is CanvasText`);
      for (const c of f.hollow) assert.equal(c, S.Canvas, `${label}: a hollow head stays hollow (Canvas)`);
      assert.deepEqual(f.lift, [S.Highlight], `${label}: the lift and its end rings are Highlight`);
      const q = {Highlight: contrast(onCanvas(S.Highlight, S.Canvas), canvas), CanvasText: contrast(hex(S.CanvasText), canvas), GrayText: contrast(onCanvas(S.GrayText, S.Canvas), canvas)};
      for (const [c, v] of Object.entries(q)) assert.ok(v >= 3, `${label}: ${c} reaches 3:1 on the Canvas ${canvas} (${v.toFixed(2)}:1)`);
      // A real selection: keyboard focus on a relationship on a shared trunk, Enter, then an element.
      const member = await page.evaluate(() => [...document.querySelectorAll('.cm .cm-svg g.nt-edge[data-nt-bundle]')].find(g => g.querySelector(':scope > path.nt-line')?.getAttribute('stroke') === '#3c4a44')?.dataset.ntEdge);
      await page.keyboard.press('Tab'); // the keyboard is in use, so the focus that follows is shown
      const focus = await page.evaluate(id => { const h =[...document.querySelectorAll('.cm .cm-svg .nt-hit')].find(x => x.dataset.ntEdge === id); h.focus(); return {visible: h.matches(':focus-visible'), stroke: getComputedStyle(h).stroke, opacity: getComputedStyle(h).strokeOpacity}; }, member);
      assert.ok(focus.visible, `${label}: the relationship's hit takes keyboard focus`);
      assert.equal(focus.stroke, S.Highlight, `${label}: keyboard focus on a relationship shows in Highlight`);
      await page.keyboard.press('Enter'); await page.waitForSelector('.cm .cm-svg g.nt-edge.sel', {state: 'attached', timeout: 5000});
      const sel = await page.evaluate(() => ({lines: [...new Set([...document.querySelectorAll('.cm .cm-svg :is(g.nt-edge,g.nt-trunk).sel > path.nt-line')].map(p => getComputedStyle(p).stroke))], trunks: document.querySelectorAll('.cm .cm-svg g.nt-trunk.sel').length,
        joins: [...document.querySelectorAll('.cm .cm-svg g.nt-trunk.sel > circle.nt-join')].map(c => getComputedStyle(c).fill), lift: [...document.querySelectorAll('.cm .cm-svg g.nt-lift :is(path,.nt-end)')].map(e => getComputedStyle(e).stroke)}));
      assert.ok(sel.trunks >= 1 && sel.joins.length >= 1 && sel.lift.length >= 3, `${label}: the selection lights a trunk with a join and lifts the route with its rings`);
      assert.deepEqual([...new Set([...sel.lines, ...sel.joins, ...sel.lift])], [S.Highlight], `${label}: the selected relationship, its trunk and joins, and the lift draw Highlight`);
      await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.cm .cm-svg g.nt-edge.sel'), null, {timeout: 5000});
      const hub = await page.evaluate(() => document.querySelector('.cm .cm-svg .nt-bhit')?.dataset.ntSelect);
      await page.evaluate(id => document.querySelector(`.cm .cm-svg .nt-node[data-sel="${CSS.escape(id)}"]`).focus(), hub);
      await page.keyboard.press('Enter'); await page.waitForSelector('.cm .cm-svg g.nt-trunk.lit', {state: 'attached', timeout: 5000});
      const lit = await page.evaluate(id => ({box: getComputedStyle(document.querySelector(`.cm .cm-svg .nt-node[data-sel="${CSS.escape(id)}"] rect.nt-box`)).stroke, lines: [...new Set([...document.querySelectorAll('.cm .cm-svg :is(g.nt-edge,g.nt-trunk).lit > path.nt-line')].map(p => getComputedStyle(p).stroke))], joins: [...new Set([...document.querySelectorAll('.cm .cm-svg g.nt-trunk.lit > circle.nt-join')].map(c => getComputedStyle(c).fill))]}), hub);
      assert.equal(lit.box, S.Highlight, `${label}: the selected element is ringed in Highlight`);
      assert.deepEqual([...new Set([...lit.lines, ...lit.joins])], [S.Highlight], `${label}: its lit lines and their joins draw Highlight`);
      if (theme === 'light' && scheme === 'dark') {
        // The Chapter 1 process, on a black Canvas: the pool and lanes, the captions events and gateways carry below them
        // on the ground (light lanes kept them readable before), and the perspective's traced path.
        await go(page, `/?project=${pid}&chapter=1&tab=model&model=diagram`);
        await page.waitForSelector('.cm .cm-svg .nt-bpmn-event', {state: 'attached'});
        const p = await page.evaluate(() => { const svg = document.querySelector('.cm .cm-svg'), set = l => [...new Set(l)];
          return {frames: set([...svg.querySelectorAll('.nt-group > rect')].map(r => getComputedStyle(r).fill)), caps: [...svg.querySelectorAll(':is(.nt-bpmn-event,.nt-bpmn-gateway) :is(.nt-cap,.nt-ftitle)')].map(t => getComputedStyle(t).fill),
            traced: [...svg.querySelectorAll('g.nt-edge.pe-on > path.nt-line')].map(l => getComputedStyle(l).stroke), lines: set([...svg.querySelectorAll('g.nt-edge:not(.pe-on) > path.nt-line')].map(l => getComputedStyle(l).stroke))}; });
        assert.deepEqual(p.frames, [S.Canvas], `${label}: the Chapter 1 pool and lanes are the Canvas`);
        assert.ok(p.caps.length >= 4 && p.caps.every(c => c === S.CanvasText), `${label}: every event and gateway caption on the ground is CanvasText (${p.caps.length})`);
        assert.ok(p.traced.length >= 1 && p.traced.every(c => c === S.Highlight), `${label}: the process perspective's traced path is Highlight (${p.traced.length})`);
        assert.deepEqual(p.lines, [S.CanvasText], `${label}: and its other flows CanvasText`);
      }
      await ctx.close();
      forcedSeen.push(`${scheme} palette, ${theme} theme: Highlight ${onCanvas(S.Highlight, S.Canvas)} ${q.Highlight.toFixed(2)}:1, CanvasText ${hex(S.CanvasText)} ${q.CanvasText.toFixed(2)}:1, GrayText ${q.GrayText.toFixed(2)}:1 on ${canvas}`);
    }
    pass(`forced colours: on the Chapter 6 Diagram every band and frame is the Canvas, every line, trunk, head, join and word CanvasText, a selected, lit or traced line and trunk with its joins, the lift, a selected element and keyboard focus Highlight, a removed line GrayText with its dash, each at 3:1 or better on the Canvas (${forcedSeen.join('; ')})`);
  }

  // 6. Round 25: the decision reading's states on the Chapter 3 model (an alternative ruled out by a hard constraint, a
  // dominated one, the lead, a suggested effect) are drawn with the theme's tokens: each reads at 4.5:1 on its own ground
  // in light and in dark, the dark theme re-colours each, and under forced colours their words are CanvasText with the
  // dashed edges that mark a ruled-out alternative and a suggestion kept. The facts are set through the project's own
  // commands, each ordinary change reviewed by a person.
  {
    const command = async (page, type, payload) => {
      await page.evaluate(([type, payload]) => { window.__aiwCmd = null; window.aiwProjectStore.command({type, payload}).then(() => { window.__aiwCmd = 'ok'; }, e => { window.__aiwCmd = 'error: ' + e.message; }); }, [type, payload]);
      const seen = await (await page.waitForFunction(() => window.__aiwCmd || (document.querySelector('dialog.wb-dialog[open]') ? 'review' : null), null, {timeout: 15000})).jsonValue();
      if (seen === 'review') { await page.check('dialog.wb-dialog [data-reviewed]'); await page.fill('dialog.wb-dialog [name=reason]', 'Synthetic facts for the decision reading, reviewed.'); await page.click('dialog.wb-dialog [data-wb-action="apply-preview"]'); await page.waitForFunction(() => window.__aiwCmd, null, {timeout: 15000}); }
      assert.equal(await page.evaluate(() => window.__aiwCmd), 'ok', type);
    };
    {
      const {ctx, page} = await context('light');
      await go(page, `/?project=${pid}&chapter=3&tab=model`); await page.waitForSelector('.cm.dx .dx-card');
      const doc = () => page.evaluate(() => window.aiwProjectStore.value.document), said = (effect, reason) => ({effect, reason, evidence: 'Synthetic design review notes.'});
      await command(page, 'quality.driver', {kind: 'constraint', title: 'Post through the existing core ledger', description: 'Every posting goes through the existing core ledger.', impact: 'Rules out a second store of postings.', constraintIds: ['CON-001'], priority: 'High'});
      let d = await doc();
      const C = d.quality.drivers.at(-1).id, d2 = () => d.decisions.records.find(x => x.id === 'ADR-002');
      await command(page, 'decision.save', {id: 'ADR-002', driverIds: [...d2().driverIds, C]});
      d = await doc();
      await command(page, 'decision.alternative', {id: 'ADR-002', alternativeId: 'ALT-004', assessments: {...d2().alternatives.find(a => a.id === 'ALT-004').assessments, [C]: said('violates', 'The cache keeps its own record of postings.')}});
      await command(page, 'decision.alternative', {id: 'ADR-002', title: 'Guard the posting boundary', pattern: 'Protected System', summary: 'A protected boundary in front of posting.', benefits: 'One place to check every instruction.', costs: 'Another boundary to run.', consequences: 'Posting accepts only checked instructions.', assessments: {'QD-001': said('neutral', 'Leaves the posting record as it is.'), 'QD-003': said('neutral', 'One more check on the path.'), [C]: said('supports', 'Posts through the core ledger.')}});
      await ctx.close();
    }
    const MAP = {'ruled out': '.dx-card[data-card="ALT-004"] .dx-stand.out', dominated: '.dx-card[data-card="ALT-006"] .dx-stand.dominated', 'lead badge': '.dx-card[data-card="ALT-002"] .dx-lead', 'lead line': '.dx-card[data-card="ALT-002"] .dx-stand.lead'};
    const MATRIX = {'ruled-out foot': '.dx-foot.out small', 'lead foot': '.dx-foot.lead small', suggestion: '.dx-cell.unknown .dx-sug'};
    const measure = (page, sels) => page.evaluate(sels => {
      const parse = c => { const m = c.match(/rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?/); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
      const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const ground = e => { for (let x = e; x; x = x.parentElement) { const c = parse(getComputedStyle(x).backgroundColor); if (c && c[3] > 0.5) return c; } return parse(getComputedStyle(document.body).backgroundColor); };
      return Object.fromEntries(Object.entries(sels).map(([k, s]) => { const e = document.querySelector(s); if (!e) return [k, null]; const cs = getComputedStyle(e), a = lum(parse(cs.color)), b = lum(ground(e)); return [k, {ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), color: cs.color, border: cs.borderLeftStyle + ' ' + cs.borderTopStyle}]; }));
    }, sels);
    const colours = {}, ratios = [];
    for (const theme of ['light', 'dark']) {
      const {ctx, page} = await context(theme);
      await go(page, `/?project=${pid}&chapter=3&tab=model&model=map`); await page.waitForSelector('.cm.dx .dx-card[data-card="ALT-004"] .dx-stand.out');
      const map = await measure(page, MAP);
      await page.click('[data-dx="view"][data-id="matrix"]'); await page.waitForSelector('.dx-foot.out'); await page.waitForTimeout(300);
      const matrix = await measure(page, MATRIX);
      for (const [k, x] of Object.entries({...map, ...matrix})) { assert.ok(x, `${theme}: the ${k} is drawn`); assert.ok(x.ratio >= 4.5, `${theme}: the ${k} reads at 4.5:1 or better (${x.ratio.toFixed(2)}:1)`); (colours[k] ??= []).push(x.color); ratios.push(`${theme} ${k} ${x.ratio.toFixed(1)}`); }
      await ctx.close();
    }
    for (const [k, [light, dark]] of Object.entries(colours)) assert.notEqual(light, dark, `the ${k} is re-coloured by the dark theme`);
    {
      const {ctx, page} = await context('dark', {colorScheme: 'dark', forcedColors: 'active'});
      await go(page, `/?project=${pid}&chapter=3&tab=model&model=map`); await page.waitForSelector('.cm.dx .dx-card[data-card="ALT-004"] .dx-stand.out');
      const sys = await page.evaluate(() => { const probe = document.createElement('i'); document.body.append(probe); probe.style.color = 'CanvasText'; const c = getComputedStyle(probe).color; probe.remove(); return c; });
      const map = await measure(page, {...MAP, card: '.dx-card[data-card="ALT-004"]'});
      for (const k of Object.keys(MAP)) assert.equal(map[k].color, sys, `forced colours: the ${k} is CanvasText`);
      assert.match(map.card.border, /^dashed/, 'forced colours: a ruled-out alternative keeps its dashed edge');
      await page.click('[data-dx="view"][data-id="matrix"]'); await page.waitForSelector('.dx-foot.out'); await page.waitForTimeout(300);
      const matrix = await measure(page, {...MATRIX, foot: '.dx-foot.out'});
      for (const k of Object.keys(MATRIX)) assert.equal(matrix[k].color, sys, `forced colours: the ${k} is CanvasText`);
      assert.match(matrix.foot.border, /dashed/, 'forced colours: the ruled-out foot keeps its dashed edge'); assert.match(matrix.suggestion.border, /dashed/, 'and the suggestion its dashed edge');
      await ctx.close();
    }
    pass(`the decision reading's states on the Chapter 3 model (ruled out, dominated, the lead, a suggestion) read at 4.5:1 or better in light and in dark (${ratios.join('; ')}), the dark theme re-colours each from the tokens, and under forced colours their words are CanvasText with the dashed edges of a ruled-out alternative and a suggestion kept`);
  }
  assert.deepEqual(errors, [], 'no page error');
} finally {
  await browser.close();
}
console.log(`\n${checks.length} checks passed.`);
process.exit(0);
