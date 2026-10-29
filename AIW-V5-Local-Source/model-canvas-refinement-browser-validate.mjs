// Round 19: the connected Layers overview is a quiet index; expanding it foregrounds a useful
// relationship reading without discarding exact records, exports or keyboard targets. Requires Chromium.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';
import {bandDistance} from './public/layers-view.js';

const {chromium} = createRequire(import.meta.url)(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise((resolve, reject) => { const socket = net.createServer(); socket.on('error', reject); socket.listen(0, '127.0.0.1', () => { const p = socket.address().port; socket.close(() => resolve(p)); }); });
const db = `.aiw-local/model-canvas-refinement-${port}.sqlite`;
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* stopped */ } for (const suffix of ['', '-wal', '-shm']) rmSync(db + suffix, {force: true}); });
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', code => reject(new Error(`server exited ${code}`))); });
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const page = await browser.newPage({viewport: {width: 1440, height: 900}, acceptDownloads: true});
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  // rc39/rc40 Layers (rc41 W4): round 19's quiet index (relationship rows, no lines) and its emphasis select are replaced by
  // the Connections control (data-nt="connections": None · Structure · Adjacent · All · Selected, a caption and "Reveal
  // next"). The intents are pinned on it: the overview draws a subset first and says how many of how many; every drawn path
  // is a keyboard target and a hidden one is not; "Every element drawn" (fold-all) keeps every exact link reachable; All is
  // an explicit choice that changes only what is shown, never the number of links; one family (Structure) can be read on
  // its own; a selected element's direct links (Selected); the reading and the selection survive a view switch.
  const reading = () => page.evaluate(() => { const e = [...document.querySelectorAll('.cm-svg .nt-edge[data-nt-edge]')], hits = [...document.querySelectorAll('.cm-svg .nt-hit[data-nt-edge]')]; return {caption: document.querySelector('.nt-connection-caption')?.textContent || '', level: document.querySelector('.nt-connections [data-nt="connections"][aria-pressed="true"]')?.dataset.id || '', edges: e.length, hidden: e.filter(x => x.classList.contains('nt-connection-hidden')).length, focus: hits.filter(h => h.getAttribute('tabindex') === '0' && !h.classList.contains('nt-connection-hidden')).length}; });
  const level = async id => { await page.locator(`.nt-connections [data-nt="connections"][data-id="${id}"]`).click(); await page.waitForSelector(`.nt-connections [data-nt="connections"][data-id="${id}"][aria-pressed="true"]`); await page.waitForTimeout(200); };
  // rc41 close (lead): each drawn path with the lanes its two ends stand in (the lane boxes that hold the end's centre), and
  // Reveal next as the picture says it, so the caption's numbers are measured on the picture itself.
  const lanesRead = () => page.evaluate(() => { const lanes = [...document.querySelectorAll('.cm-svg .nt-lane[data-nt-lane]')].map(g => ({id: g.dataset.ntLane, r: g.querySelector(':scope > rect').getBoundingClientRect()})); const laneOf = id => { const b = document.querySelector(`.cm-svg .nt-node[data-nt-node="${CSS.escape(id)}"]`)?.getBoundingClientRect(), x = b && b.x + b.width / 2, y = b && b.y + b.height / 2; return b ? lanes.filter(({r}) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom).map(l => l.id) : []; }; const btn = document.querySelector('.nt-connections [data-nt="connections-more"]'); return {paths: [...document.querySelectorAll('.cm-svg .nt-edge[data-nt-edge]')].map(e => ({id: e.dataset.ntEdge, ends: [laneOf(e.dataset.ntFrom), laneOf(e.dataset.ntTo)], shown: !e.classList.contains('nt-connection-hidden')})), reveal: btn ? {text: btn.textContent, title: btn.title} : null}; });
  for (let chapter = 4; chapter <= 10; chapter++) {
    await page.goto(`http://127.0.0.1:${port}/?chapter=${chapter}&tab=model&model=layers`, {waitUntil: 'networkidle'});
    await page.waitForSelector('.nt-layers-overview .nt-connections [data-nt="connections"][aria-pressed="true"]');
    // rc41 (W1's level budget, w1/NOTE.md §1; close "notation"): Layers opens at Adjacent with min(12, the level's own paths),
    // all of them its own; the caption then says "· N more at this level" while the level keeps paths back, and "· N beyond"
    // once it is complete (notation-view.js levelWords). Was: the regex `^N of M paths · K recorded links( · level)?( · R
    // beyond)?$`, with any level but All and R, K unchecked. Now the whole caption is exact, each count measured on the
    // picture: a path is the level's when its two ends stand in one lane or two neighbouring lanes (layers-view.js
    // bandDistance, the Adjacent rule), and K is the links drawn once every element is (asserted below).
    const o = await reading(), drawn = await lanesRead();
    assert.ok(drawn.paths.length === o.edges && drawn.paths.every(p => p.ends.every(l => l.length === 1)), `Chapter ${chapter}: each end of every drawn path stands in one lane: ${JSON.stringify(drawn.paths.filter(p => !p.ends.every(l => l.length === 1)))}`);
    const own = drawn.paths.filter(p => bandDistance(p.ends[0][0], p.ends[1][0]) <= 1), shown = drawn.paths.filter(p => p.shown), more = own.length - shown.length, beyond = o.edges - own.length, next = Math.min(6, o.edges - shown.length);
    const links = /^\d+ of \d+ paths · ([\d,]+) recorded links/.exec(o.caption)?.[1];
    assert.notEqual(o.level, 'all', `Chapter ${chapter}: the overview opens on a chosen subset, not All`);
    assert.equal(o.level, 'adjacent', `Chapter ${chapter}: the overview opens at Adjacent`);
    assert.ok(shown.every(p => own.includes(p)) && shown.length === Math.min(12, own.length), `Chapter ${chapter}: the overview opens with min(12, the Adjacent level's ${own.length} paths), all its own: ${JSON.stringify({shown: shown.length, outside: shown.filter(p => !own.includes(p)).map(p => p.id)})}`);
    assert.equal(o.caption, `${shown.length} of ${o.edges} paths · ${links} recorded links · Adjacent${more ? ` · ${more} more at this level` : beyond ? ` · ${beyond} beyond` : ''}`, `Chapter ${chapter}: the overview says how many paths of how many it shows, and how many more the level holds or lie beyond it (${own.length} of the ${o.edges} paths at the level)`);
    assert.ok(o.edges - o.hidden === shown.length && o.focus === shown.length, `Chapter ${chapter}: every grouped path is drawn, the caption counts the shown ones, and only those are keyboard targets: ${JSON.stringify(o)}`);
    // Reveal next says what it adds: the level's own paths first, then those beyond it (w1/NOTE.md §1).
    assert.deepEqual(drawn.reveal, next ? {text: `Reveal next ${next}`, title: more ? `Reveal ${Math.min(next, more)} more of the Adjacent level's ${own.length} paths (${more} not yet shown)${next > more ? ` and ${next - more} beyond it` : ''} without moving or expanding elements` : `Reveal ${next} more recorded path${next === 1 ? '' : 's'} beyond the Adjacent level without moving or expanding elements`} : null, `Chapter ${chapter}: Reveal next says what it adds to the picture`);
    await page.locator('.nt-fold-note [data-nt="fold-all"]').click();
    await page.waitForFunction(() => /^Every element drawn/.test(document.querySelector('.nt-fold-note')?.innerText || ''));
    await level('all');
    const x = await reading();
    assert.ok(x.edges > 0 && x.hidden === 0 && x.focus === x.edges && /^(\d+) of \1 links shown$/.test(x.caption), `Chapter ${chapter}: with every element drawn and All chosen, every exact link is drawn and reachable from the keyboard: ${JSON.stringify(x)}`);
    assert.equal(x.edges, Number(String(links).replace(/,/g, '')), `Chapter ${chapter}: the overview's recorded links are the links drawn with every element`);
  }
  await page.goto(`http://127.0.0.1:${port}/?chapter=11&tab=model&model=layers`, {waitUntil: 'networkidle'});
  await page.waitForSelector('.nt-layers-overview .nt-connections [data-nt="connections"][aria-pressed="true"]');
  await page.locator('.nt-fold-note [data-nt="fold-all"]').click();
  await page.waitForFunction(() => /^Every element drawn/.test(document.querySelector('.nt-fold-note')?.innerText || ''));
  const source = await reading();
  assert.notEqual(source.level, 'all', 'All connections is an explicit choice');
  assert.ok(source.edges > 100 && source.hidden > 0 && source.focus === source.edges - source.hidden, `expanded Layers shows a subset first with every shown link a keyboard target: ${JSON.stringify(source)}`);
  const recede = await page.evaluate(() => { const h = document.querySelector('.cm-svg .nt-edge.nt-connection-hidden'), cs = h && getComputedStyle(h); return cs ? {display: cs.display, visibility: cs.visibility, opacity: cs.opacity} : null; });
  assert.ok(recede && (recede.display === 'none' || recede.visibility === 'hidden' || Number(recede.opacity) < .02), `a link outside the chosen level recedes entirely: ${JSON.stringify(recede)}`);
  await page.emulateMedia({forcedColors: 'active'});
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('.cm-svg .nt-edge[data-nt-edge]:not(.nt-connection-hidden)')].slice(0, 50).every(e => getComputedStyle(e).opacity === '1')), 'forced-colors readers see every shown connector at full ink');
  await page.emulateMedia({forcedColors: 'none'});
  if (process.env.AIW_CANVAS_SCREENSHOT_DIR) await page.screenshot({path: `${process.env.AIW_CANVAS_SCREENSHOT_DIR}/layers-expanded-desktop.png`});
  await level('all');
  const all = await reading();
  assert.ok(all.hidden === 0 && all.edges === source.edges, 'All connections restores every route and changes only what is shown');
  await level('structure');
  const family = await reading();
  assert.ok(family.hidden > 0 && family.edges === source.edges, 'one family (Structure) can be read on its own');
  const selected = await page.locator('.cm-svg .nt-node[data-nt-node]').first().getAttribute('data-nt-node');
  await page.locator(`.cm-svg .nt-node[data-nt-node="${selected}"]`).focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('.nt-connections [data-nt="connections"][data-id="neighbourhood"]:not([disabled])');
  await level('neighbourhood');
  const direct = await page.evaluate(id => { const shown = [...document.querySelectorAll('.cm-svg .nt-edge[data-nt-edge]:not(.nt-connection-hidden)')]; const node = document.querySelector(`.cm-svg .nt-node[data-nt-node="${CSS.escape(id)}"]`); return {selected: !!node?.classList.contains('sel'), shown: shown.length}; }, selected);
  assert.ok(direct.selected && direct.shown > 0 && direct.shown < source.edges, `the selected element's direct links stand out: ${JSON.stringify(direct)}`);
  await page.locator('.cm-view[data-id="table"]').click();
  await page.locator('.cm-view[data-id="layers"]').click();
  await page.waitForSelector('.nt-connections [data-nt="connections"][aria-pressed="true"]');
  assert.equal((await reading()).level, 'neighbourhood', 'view switch restores the connection reading');
  assert.ok(await page.locator(`.cm-svg .nt-node[data-nt-node="${selected}"].sel`).count(), 'selected object stays held across Table and Layers');
  await page.setViewportSize({width: 390, height: 844});
  // On a phone the Details column the selection opened lies over the page; a viewer closes it ("Close details ×") first.
  if (await page.evaluate(() => document.body.dataset.panel === 'open')) { await page.click('#inspector .panel-dismiss'); await page.waitForSelector('#inspector[aria-hidden="true"]', {state: 'attached'}); }
  if (process.env.AIW_CANVAS_SCREENSHOT_DIR) await page.screenshot({path: `${process.env.AIW_CANVAS_SCREENSHOT_DIR}/layers-expanded-mobile.png`});
  const mobile = await page.locator('.nt-connections [data-nt="connections"]').evaluateAll(bs => bs.filter(b => b.checkVisibility()).map(b => ({height: Math.round(b.getBoundingClientRect().height), width: Math.round(b.getBoundingClientRect().width)})));
  assert.ok(mobile.length >= 4 && mobile.every(b => b.height >= 43.5 && b.width >= 43.5), `phone connection levels each a clear touch target: ${JSON.stringify(mobile)}`);
  // Reached from the keyboard (Tab from the level before it), as a keyboard user reaches it.
  await page.locator('.nt-connections [data-nt="connections"][data-id="structure"]').focus(); await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.id), 'adjacent', 'Tab moves to the next connection level');
  assert.notEqual(await page.locator('.nt-connections [data-nt="connections"][data-id="adjacent"]').evaluate(e => getComputedStyle(e).outlineStyle), 'none', 'keyboard focus is visible');
  // rc39/rc40 (rc41 W4): on a phone the picture's menus stand on the bar itself (no separate tools button); the layers
  // menu is labelled "Visibility".
  assert.ok(await page.locator('[data-nt="menu"][data-id="layers"]').isVisible(), 'the layers menu is on the phone bar');
  assert.match((await page.locator('[data-nt="menu"][data-id="layers"]').innerText()).trim(), /^Visibility( · [\d,]+ hidden)?$/, 'labelled Visibility, with the count it hides');
  await page.locator('[data-nt="menu"][data-id="layers"]').click();
  // The menu focuses its first control on the next frame (notation-view.js nextFrame); under load that frame can come after
  // a fixed 50 ms, so wait for it, up to one second, then read exactly as before.
  await page.waitForFunction(() => document.activeElement?.closest?.('.nt-pop'), null, {timeout: 1000}).catch(() => {});
  const firstLayer = await page.evaluate(() => ({active: document.activeElement?.dataset.nt, id: document.activeElement?.dataset.id, first: document.querySelector('.nt-pop [data-nt="layer"]:not(:disabled)')?.dataset.id}));
  assert.equal(firstLayer.active, 'layer', `Layers menu gives focus to its first enabled checkbox: ${JSON.stringify(firstLayer)}`);
  assert.equal(firstLayer.id, firstLayer.first, 'the first enabled layer is focused');
  await page.keyboard.press('ArrowDown');
  const nextLayer = await page.evaluate(() => ({active: document.activeElement?.dataset.nt, id: document.activeElement?.dataset.id}));
  assert.equal(nextLayer.active, 'layer', `ArrowDown moves to the next enabled checkbox: ${JSON.stringify(nextLayer)}`);
  assert.notEqual(nextLayer.id, firstLayer.id, 'ArrowDown advances exactly one checkbox');
  const beforeToggle = await page.evaluate(() => document.activeElement.checked);
  await page.keyboard.press('Space');
  assert.equal(await page.locator(`.nt-pop [data-nt="layer"][data-id="${nextLayer.id}"]`).isChecked(), !beforeToggle, 'Space changes the focused layer');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.id), nextLayer.id, 'keyboard focus stays on the layer after redraw');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.nt + ':' + document.activeElement?.dataset.id), 'menu:layers', 'Escape restores keyboard focus to the Layers trigger');
  assert.deepEqual(errors, [], 'no browser errors');
  console.log(JSON.stringify({suite: 'model canvas refinement', passed: 10, chapters: '4–11', source, selected, direct, mobile}, null, 2));
} finally { await browser.close(); server.kill('SIGTERM'); }
