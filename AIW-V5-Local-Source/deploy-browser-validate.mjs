// Rendered checks for the Chapter 10 Model views (deployment and what fails together).
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and
// optionally AIW_BROWSER_EXECUTABLE. Starts an isolated local server on a free port.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';
import {DEP} from './public/deploy-layout.js';
// Today's trunks before round 10, rebuilt from the layout's rows (the chapter-lines evidence's control): the text-fit
// check compares the zone columns with the ones today's narrower gutter left.
import {deployTrunks} from './scripts/chapter-lines-evidence.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/deploy-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} }); // the server never outlives this suite
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
  // Round 7: Sol's part of the companion is a folded section, closed until Sol has something to say; this suite reads and
  // clicks Sol's controls there, so it views the section as a viewer who opened it (the remembered choice).
  await page.addInitScript(() => { try { localStorage.setItem('aiw.companion.sol', '1'); } catch { /* storage is a convenience */ } });
  page.on('pageerror', e => errors.push(e.message));
  const open = async (ch = 10) => { await page.goto(base + '/?chapter=' + ch + '&tab=model' + modelOf(ch), {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-head, .cm .dp-row', {timeout: 8000}); await page.waitForTimeout(400); };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(250); };
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' '));
  // Positions in the model's own world (round 3, B): in the page's one frame the stage is shorter, so focusing an element
  // near its foot may move the camera or scroll the stage column; neither is the layout these checks hold still.
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.dp-row, .dp-cell, .dp-zh, .dp-trayc, .dp-outc')].map(e => { const r = e.getBoundingClientRect(), o = (e.closest('.cm-world, .cm-heads-in, .cm-rail-in') || e.closest('.cm-stage') || e.closest('.cm'))?.getBoundingClientRect() || {x: 0, y: 0}; return [e.className.split(' ')[0], e.dataset.row || e.dataset.sel || e.dataset.zone || '', Math.round(r.x - o.x), Math.round(r.y - o.y), Math.round(r.width), Math.round(r.height)].join('|'); }));

  // 1. Chapter 10 Model opens on the deployment grid of the current environment.
  await open();
  assert.ok(await page.$('.cm.dp .cm-view[data-id="deploy"][aria-pressed="true"]'));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.am-explorer, .canvas-card')].some(e => getComputedStyle(e).display !== 'none')), false, 'the explorer is not shown');
  assert.equal((await page.$$('.dp-row')).length, 17, '5 components, 9 platform services and 3 parties');
  assert.equal((await page.$$('.dp-zh')).length, 2);
  assert.equal((await page.$$('.dp-cell')).length, 3, 'three recorded placements');
  assert.ok((await page.$$('.dp-socket')).length >= 2, 'unplaced parts wait in Not placed');
  assert.ok(await page.$eval('.rt-environment-bar', e => e.getBoundingClientRect().height) < 48, 'the environment picker stays on one line');
  pass('Chapter 10 Model opens on the deployment grid: every part a row, every zone a column, three recorded placements and the unplaced parts waiting');

  // 1b. Dependencies on rails (round 10, V6): at rest one line and one arrow per needed part and one mark per dependency,
  //     drawn exactly where the layout puts them, no marker and no ring; the arrows and marks take tokens; hovering a
  //     mark reads its dependency.
  const rest = await page.evaluate(async () => {
    const {deployDebug} = await import('/deploy-view.js'), {L} = deployDebug(), svg = document.querySelector('.cm.dp .cm-svg');
    const rails = [...svg.querySelectorAll('path.dp-rail')], heads = [...svg.querySelectorAll('.dp-head')], marks = [...svg.querySelectorAll('.dp-mark')];
    return {rails: rails.map(r => r.dataset.rail).sort(), want: L.rails.map(r => r.id).sort(), heads: heads.length, marks: marks.map(m => m.dataset.arc).sort(), links: L.arcs.map(a => a.id).sort(), arcs: svg.querySelectorAll('.dp-arc').length,
      markers: svg.querySelectorAll('[marker-end], marker').length, rings: [...svg.querySelectorAll('circle')].filter(c => getComputedStyle(c).fill === 'none' || getComputedStyle(c).fillOpacity === '0').length,
      ticks: svg.querySelectorAll('.dp-tick').length, buffered: L.arcs.filter(a => a.link.mode === 'buffered').length, diamonds: svg.querySelectorAll('path.dp-mark.party').length, party: L.arcs.filter(a => a.link.party).length,
      opacity: getComputedStyle(rails[0]).opacity, headFill: getComputedStyle(heads[0]).fill, markFill: getComputedStyle(marks[0]).fill,
      floating: marks.filter(m => { const b = m.getBBox(), x = b.x + b.width / 2, y = b.y + b.height / 2, a = L.arcs.find(q => q.id === m.dataset.arc), r = L.rails.find(q => q.id === a?.rail); return !r || Math.abs(x - r.x) > 0.5 || y < r.y1 - 0.5 || y > r.y2 + 0.5; }).map(m => m.dataset.arc),
      ends: L.rails.every(r => { const d = svg.querySelector(`path.dp-rail[data-rail="${CSS.escape(r.id)}"]`).getAttribute('d'); return d.endsWith(`${r.xb} ${r.stubY}`); })};
  });
  assert.deepEqual(rest.rails, rest.want, 'one rail per needed part'); assert.equal(rest.heads, rest.want.length, 'one arrow per rail');
  assert.deepEqual(rest.marks, rest.links, 'one mark per dependency'); assert.equal(rest.want.length, 15); assert.equal(rest.links.length, 37);
  assert.ok(rest.ends, 'each rail ends at its arrow, at its stub');
  assert.deepEqual(rest.floating, [], 'no floating mark: each sits on its rail, within its span');
  assert.equal(rest.arcs, 0, 'no relationship is drawn whole at rest'); assert.equal(rest.markers, 0, 'no marker with a literal colour'); assert.equal(rest.rings, 0, 'no mark is a ring');
  assert.ok(rest.buffered > 0 && rest.ticks === rest.buffered && rest.party > 0 && rest.diamonds === rest.party, 'buffered marks carry a tick and runtime paths a diamond');
  assert.equal(rest.opacity, '0.7', 'rails stand at .7');
  assert.ok(/^rgb/.test(rest.headFill) && rest.headFill === rest.markFill, 'arrows and marks are filled from a token');
  {
    const at = await page.evaluate(() => { const m = document.querySelector('.cm.dp .cm-svg circle.dp-mark'), r = m.getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2, id: m.dataset.arc}; });
    await page.mouse.move(at.x, at.y); await page.waitForTimeout(150);
    const tipText = await page.$eval('.cm-tip', e => (e.hidden ? '' : e.innerText));
    assert.match(tipText, / needs /, 'hovering a mark reads its dependency (' + at.id + ')');
    await page.mouse.move(2, 2);
  }
  pass(`dependencies run on rails: ${rest.want.length} lines and arrows for ${rest.links.length} dependencies, one mark each (${rest.ticks} buffered with a tick, ${rest.diamonds} runtime paths as diamonds), no marker, no ring; hovering a mark reads it`);

  // 2. Neither the lens nor the failure explored moves anything.
  const before = await rects();
  for (const lens of ['flow', 'protection', 'operation']) { await click(`[data-dp="lens"][data-id="${lens}"]`); assert.deepEqual(await rects(), before, lens + ' moved objects'); }
  await click('[data-dp="view"][data-id="failure"]');
  assert.deepEqual(await rects(), before, 'the failure view keeps every position');
  pass('switching Operation, Flow and Protection, and exploring a failure, leave every row, cell and zone where it was');

  // 3. What fails together.
  assert.equal((await page.$$('.dp-cell.lost')).length, 3, 'the three copies in the Application zone are lost');
  assert.ok((await page.$$('.dp-outc .dp-state.unavailable')).length >= 3);
  for (let i = 0; i < 4; i++) await click('[data-dp="walk-next"]');
  assert.match(await page.$eval('.cm-walk-text', e => e.innerText), /4 \/ 4 · What could recover/);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await click('.dp-zh[data-zone="zone-b"]');
  assert.equal((await page.$$('.dp-cell.lost')).length, 0, 'nothing runs in the Recovery zone to lose');
  assert.match(await page.$eval(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion)', e => e.innerText), /Recovery zone fails/);
  await click('[data-dp="view"][data-id="deploy"]');
  pass('What fails together removes a zone with the chapter\'s own simulation, walks its four stages, and selecting another zone fails that one instead');

  // 4. Selecting a part reads it; Ask Sol acts on it.
  await click('.dp-row[data-row="run-004"]');
  assert.match(await page.$eval(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) .cm-spec', e => e.innerText), /RUN-004 · Settlement worker[\s\S]*Edit operating plan/);
  await click('[data-dp="lens"][data-id="flow"]');
  assert.ok((await page.$$('.dp-arc.lit')).length > 2, 'its dependencies light');
  // A selected row lights its own relationships whole (round 10, V6): exactly the arcs from or into it, each from the
  // row along its rail into the part, with its arrow and mark; every rail recedes beneath them.
  const sel = await page.evaluate(async () => {
    const {deployDebug} = await import('/deploy-view.js'), {L} = deployDebug(), svg = document.querySelector('.cm.dp .cm-svg');
    const want = L.arcs.filter(a => a.from === 'run-004' || a.to === 'run-004'), lit = [...svg.querySelectorAll('path.dp-arc.lit')];
    const whole = want.every(a => { const p = lit.find(e => e.dataset.arc === a.id); if (!p) return false; const d = p.getAttribute('d'); return d.startsWith(`M${a.xb} ${a.y1}`) && d.endsWith(`${a.xb} ${a.y2}`); });
    return {want: want.map(a => a.id).sort(), lit: lit.map(e => e.dataset.arc).sort(), whole, marks: svg.querySelectorAll('.dp-mark.lit').length, heads: svg.querySelectorAll('.dp-head.lit').length, rails: svg.querySelectorAll('path.dp-rail').length, dim: svg.querySelectorAll('path.dp-rail.dim').length};
  });
  assert.deepEqual(sel.lit, sel.want, 'exactly its own relationships light');
  assert.ok(sel.whole && sel.marks === sel.want.length && sel.heads === sel.want.length, 'each drawn whole, from its row along its rail, with its mark and arrow');
  assert.equal(sel.dim, sel.rails, 'the rails recede beneath');
  // A redraw keeps keyboard focus (round 23): a narrower stage (the companion opening beside it) redraws the view and
  // its companion, and the control a keyboard user was on is focused again, as in the other chapters' views, rather
  // than left on the page body.
  await page.focus(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) [data-brain-launch="mind"]');
  await page.evaluate(() => { const s = document.querySelector('.cm .cm-stage'); s.style.maxWidth = (s.getBoundingClientRect().width - 120) + 'px'; });
  await page.waitForTimeout(500);
  const kept = await page.evaluate(() => document.activeElement?.dataset?.brainLaunch || document.activeElement?.tagName);
  await page.evaluate(() => { document.querySelector('.cm .cm-stage').style.maxWidth = ''; }); await page.waitForTimeout(500);
  assert.equal(kept, 'mind', 'focus stays on the companion control through a redraw');
  await click(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) [data-brain-launch="design"]');
  assert.ok(await page.$('#brain-panel:not([hidden])'));
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  pass(`selecting a part shows where it runs, what it needs and how it recovers, lights exactly its ${sel.want.length} dependencies whole, and Ask Sol acts on it`);

  // 5. Dissect and fold.
  await open();
  await page.dblclick('.dp-row[data-row="run-004"]'); await page.waitForTimeout(500);
  assert.match(await crumbs(), /Settlement › Settlement worker/);
  assert.ok((await page.$$('.dp-row.ctx')).length > 3, 'what it needs stays beside it as context');
  for (let i = 0; i < 4 && /Settlement/.test(await crumbs()); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  assert.doesNotMatch(await crumbs(), /Settlement/);
  await click('[data-dp="depth"][data-id="modules"]');
  assert.equal((await page.$$('.dp-row.module')).length, 3);
  await click('[data-dp="depth"][data-id="all"]');
  pass('a part can be dissected with what it needs beside it, Escape steps back, and components fold into modules');

  // 6. Placing a part uses the Chapter 10 placement editor, preselected.
  await click('.dp-socket[data-id="run-003"]'); await page.waitForTimeout(500);
  assert.equal(await page.$eval('dialog[open] select[name=planId]', e => e.value), 'run-003');
  await page.selectOption('dialog[open] select[name=zoneId]', 'zone-b');
  await page.click('dialog[open] button[type=submit]'); await page.waitForTimeout(1200);
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('.dp-cell')].some(e => e.dataset.sel === 'run-003')), 'the new placement appears on the grid');
  pass('Not placed · place it opens the Chapter 10 placement editor for that part, and the saved placement appears in its zone');

  // 7. A standby proposal is previewed on the grid before review.
  await click('.dp-row[data-row="run-004"]');
  await click(':is(.cm:not(.cm-docked) .cm-panel,.cm-companion) [data-dp="propose"][data-key="isolate"]'); await page.waitForTimeout(700);
  assert.ok(await page.$('.dp-cell.ghost'), 'the proposed standby is drawn in place');
  assert.match(await page.$eval('.cm-banner', e => e.innerText), /Runtime proposal · not saved[\s\S]*Standby for Settlement worker/i);
  await click('.cm-banner [data-rt-action="dismiss"]'); await page.waitForTimeout(400);
  assert.ok(!(await page.$('.dp-cell.ghost')));
  pass('Propose a standby elsewhere previews the standby on the grid with a review banner; dismissing leaves the design unchanged');

  // 8. Perspectives are entries of the switcher, per chapter (round 5, R5-C): "New perspective…" draws in the model's own
  //    frame in place of the chapter's view; Chapter 8 keeps its own models; an address naming a view opens on it.
  await click('.cm.dp .pv-pick > summary'); await click('.cm.dp .pv-pick [data-pv="new"]'); await page.waitForTimeout(400);
  assert.ok(await page.$('.cm.pv') && !(await page.$('.cm.dp')) && !(await page.$('.am-explorer')), 'a perspective is the chapter\'s view, in its frame');
  await open(8);
  assert.ok(await page.$('.cm .cm-drow') && !(await page.$('.cm.dp')), 'Chapter 8 still opens on its own view (the Data flow since round 11)');
  await page.goto(base + '/?chapter=10&tab=model&model=deploy', {waitUntil: 'networkidle'}); await page.waitForTimeout(700);
  assert.ok(await page.$('.cm.dp .dp-row'));
  assert.equal((await page.$$('.cm')).length, 1, 'only one chapter model is on the page');
  await page.click('.workspace-bar [data-tab="validate"]'); await page.waitForTimeout(900);
  // Round 3 (C): Validate is the chapter's checks, with a status header and the chapter in the SDD; the model stays on Model.
  await page.waitForSelector('.vx-head .vx-counts', {timeout: 8000});
  assert.ok(await page.$('.vx-sdd') && !(await page.$('.cm')), 'Validate opens on the chapter’s checks, without the model');
  pass('A perspective is drawn in place of the chapter\'s view, Chapter 8 keeps its sequence, model=deploy opens the grid, only one chapter model is ever on the page, and Validate is unchanged');

  // 8b. Text fit at a 1,100 px viewport (round 10, V6): the rails' gutter is wider than today's trunks', so no zone
  //     column may be narrower than DEP.MIN_Z and no label in the zone columns, their heads or the part names more
  //     truncated than with today's gutter (rebuilt in this run from the same rows). Checked as the model opens and
  //     expanded, at 1,100 and 1,440 px. Where the companion shares the width the zone columns are already at their floor
  //     either way; expanded at 1,440 px they are not, and the wider gutter does narrow them.
  {
    const fits = [];
    const fitAt = async (pg, label) => {
      const m = await pg.evaluate(async () => {
        const {deployDebug} = await import('/deploy-view.js'), {L, F} = deployDebug(), vis = e => e.offsetParent !== null && getComputedStyle(e).display !== 'none';
        const labels = [...document.querySelectorAll('.cm.dp :is(.dp-zh b, .dp-zh small, .dp-cell .dp-role, .dp-th b, .dp-th small, .dp-row b, .dp-row small)')].filter(vis)
          .map(e => ({zone: !!e.closest('.dp-zh, .dp-cell'), text: e.innerText, need: e.scrollWidth, have: e.clientWidth}));
        return {viewW: Math.max(640, document.querySelector('.cm.dp .cm-stage').clientWidth), zones: L.zones.map(z => z.w), x0: L.x0, gaps: L.domains.length - 1, rows: L.rows.map(r => ({id: r.id, cy: r.cy})), links: F.links.map(l => ({from: l.from, to: l.to})), labels};
      });
      const today = deployTrunks({rows: m.rows}, {links: m.links}), nz = Math.max(1, m.zones.length);
      const zw = x0 => Math.max(DEP.MIN_Z, Math.min(DEP.MAX_Z, Math.floor((m.viewW - x0 - DEP.TRAY - DEP.OUT - 36 - m.gaps * DEP.DOMAIN_GAP) / nz)));
      assert.ok(m.zones.every(w => w >= DEP.MIN_Z && w === zw(m.x0)), label + ': zone columns ' + m.zones.join(', ') + ' px, none narrower than ' + DEP.MIN_Z);
      const more = zw(DEP.RAIL + today.arcW) - m.zones[0];
      const worse = m.labels.filter(l => Math.max(0, l.need - l.have) > Math.max(0, l.need - (l.have + (l.zone ? more : 0))) + 0.5);
      assert.deepEqual(worse.map(l => l.text), [], label + ': no label more truncated than with today\'s gutter');
      fits.push(`${label}: zones ${m.zones[0]} px (today ${m.zones[0] + more}), ${m.labels.length} labels`);
    };
    await open(10); await click('[data-dp="depth"][data-id="all"]');
    await fitAt(page, '1,440 px');
    await page.click('[data-dp="expand"]'); await page.waitForTimeout(900);
    await fitAt(page, '1,440 px expanded');
    await page.click('[data-dp="expand"]'); await page.waitForTimeout(600);
    const narrow = await browser.newContext({viewport: {width: 1100, height: 900}});
    const p3 = await narrow.newPage(); p3.on('pageerror', e => errors.push(e.message));
    await p3.goto(base + '/?chapter=10&tab=model&model=deploy', {waitUntil: 'networkidle'}); await p3.waitForSelector('.cm .dp-row'); await p3.waitForTimeout(500);
    await fitAt(p3, '1,100 px');
    await p3.click('[data-dp="expand"]'); await p3.waitForTimeout(900);
    await fitAt(p3, '1,100 px expanded');
    await narrow.close();
    pass('the rails\' gutter leaves every zone column at least ' + DEP.MIN_Z + ' px and truncates no label more than today\'s trunks did (' + fits.join('; ') + ')');
  }

  // 9. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=10&tab=model&model=deploy', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .dp-row'); await p2.waitForTimeout(400);
  const m = await p2.evaluate(() => ({h: document.querySelector('.cm-stage').getBoundingClientRect().height, over: document.documentElement.scrollWidth > innerWidth}));
  assert.ok(m.h >= 360 && !m.over, 'phone ' + JSON.stringify(m));
  await phone.close();
  pass('on a 390 px phone the grid has a usable canvas and no horizontal page scroll');

  // 10. Round 12 (D2): in a person's project AIW's plans, paths and contract are proposals the person keeps, dismisses
  // with a reason, or restores; the plan editor offers values that are not stated.
  {
    const q = await ctx.newPage(); q.on('pageerror', e => errors.push(e.message));
    await q.goto(base + '/', {waitUntil: 'networkidle'});
    const id = await q.evaluate(async () => (await (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Proposals', template: 'blank', brief: ''})})).json()).document.id);
    await q.evaluate(async id => {
      let state = await (await fetch('/api/project?project=' + id, {credentials: 'same-origin'})).json();
      const send = async (type, payload) => { const r = await fetch('/api/commands?project=' + id, {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({revision: state.revision, command: {type, payload}})}); state = await r.json(); if (!r.ok) throw Error(type + ': ' + state.error); return state.selected; };
      const a = await send('realisation.component', {title: 'Intake service', kind: 'service', purpose: 'Takes applications.'});
      const b = await send('realisation.component', {title: 'Notice worker', kind: 'worker', purpose: 'Sends notices.'});
      await send('realisation.interaction', {from: a, to: b, label: 'Hands over an application', interaction: 'sync'});
      await send('runtime.environment', {title: 'Production', assetIds: [a, b]});
    }, id);
    await q.goto(base + '/?chapter=10&tab=work&project=' + id, {waitUntil: 'networkidle'});
    await q.waitForSelector('.t-proposals');
    const listed = await q.$eval('.t-proposals', e => e.innerText);
    assert.match(listed, /Plans and paths AIW proposed[\s\S]*RUN-001[\s\S]*RUN-002[\s\S]*RP-001/);
    await q.click('[data-rt-action="keep-seed"][data-rt-id="run-001"]');
    await q.waitForFunction(() => !document.querySelector('[data-rt-action="keep-seed"][data-rt-id="run-001"]'));
    await q.click('[data-rt-action="dismiss-seed"][data-rt-id="RP-001"]');
    await q.waitForSelector('dialog[open] #record-retire-form');
    await q.fill('dialog[open] [name="reason"]', 'The worker reads the case store.');
    await q.click('dialog[open] #record-retire-form button[type="submit"]');
    await q.waitForSelector('.t-proposals details');
    assert.match(await q.$eval('.t-proposals details', e => e.textContent), /RP-001[\s\S]*The worker reads the case store\./);
    const doc = await q.evaluate(async id => (await (await fetch('/api/project?project=' + id, {credentials: 'same-origin'})).json()).document, id);
    assert.deepEqual([doc.runtime.plans.find(r => r.id === 'run-001').state, doc.retired.records.find(x => x.id === 'RP-001').reason], [undefined, 'The worker reads the case store.']);
    await q.click('[data-rt-action="new-plan"]');
    await q.waitForSelector('dialog[open] #rt-editor');
    const form = await q.$eval('dialog[open] #rt-editor', f => ({required: f.elements.minReady.required, targets: !!f.querySelector('[name="targetKind-0"]'), env: f.elements.environmentId.tagName}));
    assert.deepEqual(form, {required: false, targets: true, env: 'SELECT'});
    await q.keyboard.press('Escape');
    await q.goto(base + '/?chapter=8&tab=work&project=' + id, {waitUntil: 'networkidle'});
    await q.waitForSelector('.t-proposals');
    assert.match(await q.$eval('.t-proposals', e => e.innerText), /Contracts AIW proposed[\s\S]*IF-001/);
    await q.close();
    pass('round 12: in a person\'s project the Chapter 10 work tab lists the plans and paths AIW proposed; Keep makes one the person\'s, Dismiss asks why and lists it as retired with the reason; a new plan names its environment and part and leaves its copies optional; Chapter 8 lists the contract AIW proposed');
  }

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 10 model (rendered)', passed: checks.length, checks}, null, 2));
