// Rendered checks for the design anatomy, the Whole design view of every chapter model (round 3, D; it was on Validate).
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
const db = '.aiw-local/anatomy-browser-' + port + '.sqlite';
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
  const open = async (ch, extra = '') => { await page.goto(base + '/?chapter=' + ch + '&tab=model&model=whole' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm-sheet .an .an-n', {timeout: 15000}); await page.waitForTimeout(500); };
  // Chapter 11's Model is the review desk; the whole design as of Chapter 10 is the last chapter model that offers the view.
  const LAST = 10;
  const rects = () => page.$$eval('.an-world .an-n[data-id]', els => els.map(e => [e.dataset.kind + ':' + e.dataset.id, e.offsetLeft, e.offsetTop, e.offsetWidth, e.offsetHeight].join('|')).sort());
  const kinds = () => page.$$eval('.an-world .an-n[data-kind]', els => [...new Set(els.map(e => e.dataset.kind))]);

  // 1. Every chapter model's Whole design shows the anatomy grown to that chapter, inside the page's one frame.
  for (let ch = 1; ch <= LAST; ch++) {
    await open(ch);
    const k = await kinds();
    assert.equal(k.includes('comp'), ch >= 5, 'components at chapter ' + ch);
    assert.equal(k.includes('lane'), ch >= 6, 'capability lanes at chapter ' + ch);
    assert.equal(k.includes('run'), ch >= 10, 'runtime at chapter ' + ch);
    const box = await page.$eval('.an-stage', e => e.getBoundingClientRect().height);
    // Inside the page's one frame (round 3, B) the anatomy shares the stage column with the chapter model's toolbar.
    assert.ok(box >= 300, 'stage height at chapter ' + ch + ': ' + box);
    assert.ok(await page.$('.cm-view[data-id="whole"][aria-pressed="true"]') && await page.$('#inspector .cm-companion .an-companion section'), 'it is a view of the chapter model, its companion in the companion column');
    // The shell's rail is its rc38 token (studio-system.css:6 --studio-rail:220px; model-views-browser pins the same 220).
    assert.ok(!(await page.$('body.an-active')) && await page.$eval('.sidebar', e => Math.round(e.getBoundingClientRect().width)) === 220, 'and the frame is unchanged');
  }
  pass('the Whole design view of Chapters 1–10 shows the anatomy grown to that chapter, inside the chapter model, its companion in the frame’s companion column');

  // 2. Lenses never move an object.
  await open(LAST);
  const before = await rects();
  for (const lens of ['flow', 'signals', 'information', 'protection', 'operation', 'reasoning', 'structure']) {
    await page.click(`.an [data-an="lens"][data-id="${lens}"]`); await page.waitForTimeout(150);
    assert.deepEqual(await rects(), before, lens + ' lens moved objects');
  }
  pass('switching between all seven lenses leaves every object where it was');

  // 3. Selecting a part lights its lineage and opens its specimen.
  // The stage column is narrower than the old full-width surface: fit the whole design before reaching for a part.
  await page.click('.an [data-an="fit"]'); await page.waitForTimeout(300);
  await page.click('.an-world .an-n[data-kind="comp"][data-id="core-adapter"]'); await page.waitForTimeout(300);
  assert.ok(await page.$('.an-world .an-sel[data-id="core-adapter"]'));
  assert.ok((await page.$$('.an-world .an-dim')).length > 0, 'unrelated parts dim');
  assert.ok((await page.$$('.an-world .an-lit')).length >= 3, 'lineage lit');
  assert.match(await page.$eval('#inspector .an-companion', e => e.innerText), /Selected[\s\S]*Core connector[\s\S]*Realizes/i);
  pass('selecting a component lights its lineage and shows what it realizes, needs, calls and runs as');

  // 4. Sol and Proposals act on the selected part.
  await page.click('#inspector .an-companion [data-brain-launch="design"]'); await page.waitForTimeout(400);
  assert.ok(await page.$('#brain-panel:not([hidden])'), 'Sol opened');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  pass('Ask Sol opens from the selected part');

  // 4b. Spines (round 10, V7): one per component, a foot on each capability it stands on, and a selection lights exactly
  // its own needs, each whole along its spine.
  await open(6);
  await page.click('.an [data-an="fit"]'); await page.waitForTimeout(300);
  // The selection made above is remembered with the view; start from rest.
  if (await page.$('.an-world .an-sel')) { await page.focus('.an-stage'); await page.keyboard.press('Escape'); }
  await page.mouse.move(2, 2); await page.waitForTimeout(300);
  assert.ok(!(await page.$('.an-world .an-sel, .an-world .an-dim')), 'nothing selected or lit');
  const plan = () => page.evaluate(async () => {
    const {anatomyDebug} = await import('/anatomy-view.js'); const L = anatomyDebug().layout;
    return {spines: L.threads.filter(t => t.kind === 'spine').map(t => ({from: t.from, feet: t.feet.map(f => f.to)})), pillars: L.pillars.map(p => p.from + '>' + p.to)};
  });
  const drawn = () => page.evaluate(() => {
    const u = document.querySelector('.an-under'), o = document.querySelector('.an-over');
    const sp = u.querySelector('.an-th.spine'), ft = o.querySelector('.an-foot');
    return {spines: [...u.querySelectorAll('.an-th.spine')].map(e => e.dataset.spine), feet: [...o.querySelectorAll('.an-foot')].map(e => e.dataset.comp + '>' + e.dataset.cap), litFeet: [...o.querySelectorAll('.an-foot.on')].map(e => e.dataset.comp + '>' + e.dataset.cap),
      pillars: [...u.querySelectorAll('.an-th.pillar')].map(e => e.dataset.comp + '>' + e.dataset.cap + (e.classList.contains('on') ? '' : ' at rest')),
      spineStroke: sp && getComputedStyle(sp).stroke, spineOpacity: sp && Number(getComputedStyle(sp).opacity), footFill: ft && getComputedStyle(ft).fill, footR: ft && Number(ft.getAttribute('r')),
      token: (() => { const p = document.createElement('i'); p.style.color = 'var(--sage-10)'; document.querySelector('.an').appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; })()};
  });
  const P = await plan(), rest = await drawn(), sorted = a => a.slice().sort();
  assert.ok(P.spines.length >= 3 && P.pillars.length > P.spines.length, 'the reference project has spines with several feet: ' + JSON.stringify(P.spines.length));
  assert.deepEqual(sorted(rest.spines), sorted(P.spines.map(s => s.from)), 'one spine path per component that needs a lane');
  assert.equal(new Set(rest.spines).size, rest.spines.length, 'never two spines for one component');
  assert.deepEqual(sorted(rest.feet), sorted(P.spines.flatMap(s => s.feet.map(f => s.from + '>' + f))), 'a foot on each capability each component needs, above the lanes');
  assert.deepEqual(rest.pillars, [], 'no per-need pillar is drawn at rest');
  assert.ok(rest.spineStroke === rest.token && rest.footFill === rest.token && rest.footR === 2.6 && rest.spineOpacity >= 0.8, 'spines and feet take the --sage-10 token (' + JSON.stringify([rest.spineStroke, rest.footFill, rest.token, rest.spineOpacity]) + ')');
  for (const [kind, id, of] of [['comp', 'api-pod', p => p.startsWith('api-pod>')], ['lane', 'tc-001', p => p.endsWith('>tc-001')]]) {
    await page.click(`.an-world .an-n[data-kind="${kind}"][data-id="${id}"]`); await page.mouse.move(2, 2); await page.waitForTimeout(400);
    const sel = await drawn(), want = sorted(P.pillars.filter(of));
    assert.ok(want.length >= 1, id + ' has needs to light');
    assert.deepEqual(sorted(sel.pillars), want, 'selecting ' + id + ' lights exactly its needs, each whole along its spine');
    assert.deepEqual(sorted(sel.litFeet), want, 'and only their feet');
    assert.ok(sel.spineOpacity <= 0.2, 'every spine recedes under a selection (' + sel.spineOpacity + ')');
  }
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.click('.an [data-an="key"]'); await page.waitForTimeout(200);
  assert.match(await page.$eval('.an-legend', e => e.innerText), /one spine per component[\s\S]*not an ArchiMate junction/);
  await page.click('.an [data-an="key"]');
  pass(`Whole design draws ${P.spines.length} spines with ${P.pillars.length} feet in token colours and no pillar at rest; selecting a component or a capability lights exactly its own needs along the spines, the rest recede, and the Key names a foot a drawing mark, not an ArchiMate junction`);

  // 5. Dissect: system → module → part, and back.
  await open(LAST);
  // Chapter 10 opens its runtime layer; close it so the part is read at its full size, as Chapter 11 did.
  { const opened = await page.$('.an-label.open'); if (opened) { await opened.click(); await page.waitForTimeout(500); } }
  await page.click('.an-head [data-an="dissect"][data-id="GRP-002"]'); await page.waitForTimeout(600);
  assert.match(await page.$eval('.an-crumbs', e => e.innerText), /Control & accounting/);
  const heads = await page.$$eval('.an-head', els => els.map(e => e.className));
  assert.ok(heads.some(c => c.includes('component')) && heads.some(c => c.includes('ctx')), 'module columns are its components with context');
  await page.click('.an [data-an="fit"]'); await page.waitForTimeout(300);
  await page.dblclick('.an-world .an-n[data-kind="comp"][data-id="core-adapter"]'); await page.waitForTimeout(600);
  assert.match(await page.$eval('.an-crumbs', e => e.innerText), /Core connector/);
  assert.ok(await page.$('.an-world .an-n.an-full[data-id="core-adapter"]'), 'the part is shown in full');
  // Escape steps back one thing at a time: the selection, then the part, then the module.
  await page.focus('.an-stage');
  for (let i = 0; i < 4 && /Core connector|Control & accounting/.test(await page.$eval('.an-crumbs', e => e.innerText)); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(450); }
  assert.doesNotMatch(await page.$eval('.an-crumbs', e => e.innerText), /Core connector|Control & accounting/);
  pass('a module and then a single component can be dissected with the same layers, and Escape steps back to the whole system');

  // 6. Opening a layer enlarges it and compacts the others.
  await page.click('.an-label[data-band="capability"]'); await page.waitForTimeout(500);
  assert.ok(await page.$('.an-label.open[data-band="capability"]'));
  assert.ok(await page.$('.an-world .an-lane.an-open'), 'capability lanes opened');
  assert.ok(await page.$('.an-world .an-resp.an-compact'), 'other layers compact');
  pass('opening a layer enlarges it while every other layer stays visible and compact');

  // 7. Findings: a rule group steps through the parts it concerns.
  await open(8);
  const group = await page.$('#inspector .an-companion [data-an="group"]');
  assert.ok(group, 'findings are grouped');
  await group.click(); await page.waitForTimeout(500);
  const sel = await page.$eval('.an-world .an-sel, .an-world .an-socket.an-sel', e => e.dataset.id).catch(() => null);
  assert.ok(sel, 'a finding selects its part');
  const vis = await page.$eval('.an-world .an-sel', e => { const r = e.getBoundingClientRect(), s = document.querySelector('.an-stage').getBoundingClientRect(); return r.bottom > s.top && r.top < s.bottom && r.right > s.left && r.left < s.right; });
  assert.ok(vis, 'the part is brought into view');
  pass('rule-based findings are grouped, and each group steps through the parts it concerns');

  // 8. Smart arrangement: drag a module column, then restore the smart order.
  await open(LAST);
  const order = () => page.$$eval('.an-head.module', els => els.map(e => e.dataset.target));
  const smart = await order();
  const h = await page.$('.an-head.module');
  const b = await h.boundingBox();
  await page.mouse.move(b.x + 20, b.y + 10); await page.mouse.down(); await page.mouse.move(b.x + b.width * 2.4, b.y + 10, {steps: 8}); await page.mouse.up(); await page.waitForTimeout(600);
  const moved = await order();
  assert.notDeepEqual(moved, smart, 'column moved');
  await open(LAST); // a fresh page on the same view
  assert.deepEqual(await order(), moved, 'manual arrangement persists');
  await page.click('.an [data-an="smart"]'); await page.waitForTimeout(500);
  assert.deepEqual(await order(), smart, 'smart arrangement restored');
  pass('a module column can be dragged into a new place, the arrangement persists, and Smart arrange restores it');

  // 9. Replay the build-up.
  await page.click('.an [data-an="replay"]'); await page.waitForTimeout(700);
  assert.match(await page.$eval('.an-state', e => e.innerText), /as of Chapter [1-3]/);
  assert.equal((await kinds()).includes('comp'), false, 'replay starts before components exist');
  await page.click('.an [data-an="replay"]'); await page.waitForTimeout(500);
  assert.match(await page.$eval('.an-state', e => e.innerText), /Chapter 10 · the design so far/);
  pass('Replay the build-up rebuilds the design from Chapter 1 and can be stopped to return to this chapter');

  // 10. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=6&tab=model&model=whole', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm-sheet .an .an-n'); await p2.waitForTimeout(400);
  const m = await p2.evaluate(() => ({h: document.querySelector('.an-stage').getBoundingClientRect().height, over: document.documentElement.scrollWidth > innerWidth}));
  assert.ok(m.h >= 360 && !m.over, 'phone stage ' + JSON.stringify(m));
  await phone.close();
  pass('on a 390 px phone the anatomy has a usable canvas and no horizontal page scroll');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'design anatomy (rendered)', passed: checks.length, checks}, null, 2));
