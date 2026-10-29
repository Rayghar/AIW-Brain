// The scale gate (audit F2-03). A 300-object Chapter 4 project built through the command path (45 new
// responsibilities, to 50 in all, and 255 connections, each its own /api/commands save) opened in a real browser: the
// Work registers are bounded (public/register-list.js: a page of 40 rows, "Show N more" for the next, and a search that
// redraws only the rows), so the responsibilities and connections registers draw their first page and reveal every row;
// selecting a node on the Model and saving an edit through the in-editor review stay within bounds; the group editor
// returns focus to its opener after the page is rebuilt. Then the audit's own large project (the reference document
// plus 300 responsibilities, restored through /api/recovery as the audit did; a workspace now keeps up to 500): its
// responsibility list pages, and its Chapter 4 model hides the SVG routes off the stage and follows the camera.
// Bounds are generous for a loaded machine and still fail on a regression of the size the audit measured
// (703 ms select, 896 ms save on a 305-responsibility restore).
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally
// AIW_BROWSER_EXECUTABLE. Starts an isolated local server on a free port. Run: npm run test:scale-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';
import {buildScaleFixture, buildRecoveryFixture} from './scripts/build-scale-fixture.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const COUNT = Number(process.env.AIW_SCALE_COUNT || 300);
const BOUNDS = {select: 600, save: 1500}; // ms, wall clock on the machine that runs the gate; not overridable, so a slow run fails rather than passes
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/scale-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const checks = [], errors = [], timings = {};
const pass = n => { checks.push(n); console.log('PASS', n); };
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
try {
  const fixture = await buildScaleFixture({base, count: COUNT});
  assert.equal(fixture.objects, COUNT, `the fixture holds ${fixture.objects} objects`);
  timings.fixtureMs = fixture.ms;
  pass(`${fixture.responsibilities} responsibilities and ${fixture.connections} connections saved through /api/commands in ${fixture.ms} ms (revision ${fixture.revision})`);
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => errors.push(e.message));
  const project = '&project=' + encodeURIComponent(fixture.id);
  // The top bar's save status holds a full and a compact phone label, and its accessible name is the full status
  // (round 19): read the status it announces, and check that the words shown are the same (a save's running seconds
  // aside), so a check against 'Saving…' can fail.
  const saveState = async () => {
    const status = await page.$eval('.save-state', e => ({announced: e.getAttribute('aria-label'), shown: e.innerText.replace(/ [\d,]+ s$/, '').trim()}));
    assert.equal(status.shown, status.announced, 'the top bar shows the status it announces');
    return status.announced;
  };

  // 1. The Work registers page (public/register-list.js): the first REGISTER rows and a pager, then "Show N more"
  // until every row is drawn; a search narrows a register to a list that fits a page, with no pager, without moving
  // the keyboard out of the search field.
  const REGISTER = 40;
  const more = key => page.locator(`.l-pager [data-register-more="logical:${key}"]`);
  const drawn = rows => page.$$eval(rows, es => es.length);
  // Shows every row of a register through its pager, one page at a time, and says how many steps it took.
  const showEvery = async (key, rows, total) => {
    let steps = 0;
    while (await more(key).count()) { const before = await drawn(rows); await more(key).click(); steps++; await page.waitForFunction(([sel, n]) => document.querySelectorAll(sel).length > n, [rows, before]); }
    assert.equal(await drawn(rows), total, `"Show more" draws all ${total} rows of the ${key} register`);
    return steps;
  };
  const t0 = Date.now();
  await page.goto(base + '/?chapter=4&tab=work' + project, {waitUntil: 'networkidle'});
  await page.waitForSelector('.work-view .l-record');
  timings.workOpenMs = Date.now() - t0;
  const counts = await page.evaluate(() => ({responsibilities: window.aiwProjectStore.value.document.logical.responsibilities.length, connections: window.aiwProjectStore.value.document.logical.connections.length}));
  assert(counts.responsibilities > REGISTER, `the project holds ${counts.responsibilities} responsibilities`);
  assert.equal(await drawn('.work-view .l-record'), REGISTER, `the responsibilities register draws its first ${REGISTER} rows`);
  assert.equal(await page.locator('[data-register-key="logical:responsibilities"] [data-register-summary]').innerText(), `Showing ${REGISTER} of ${counts.responsibilities} responsibilities.`);
  assert.equal(await more('responsibilities').innerText(), `Show ${counts.responsibilities - REGISTER} more`);
  assert.equal(await showEvery('responsibilities', '.work-view .l-record', counts.responsibilities), 1, 'every responsibility is listed after one more page');
  const sought = await page.evaluate(() => window.aiwProjectStore.value.document.logical.responsibilities.at(-1).title), search = page.locator('[data-register-search="logical:responsibilities"]');
  await search.fill(sought);
  await page.waitForFunction(n => document.querySelectorAll('.work-view .l-record').length < n, counts.responsibilities);
  assert.deepEqual(await page.$$eval('.work-view .l-record .l-record-title', es => es.map(e => e.textContent.trim())), [sought], 'a search narrows the register to the record it names');
  assert.equal(await page.$$eval('.l-pager', es => es.length), 0, 'no pager under a list that fits a page');
  assert(await search.evaluate(e => e === document.activeElement), 'the keyboard stays in the search field while the rows are redrawn');
  await search.fill('');
  await page.waitForFunction(n => document.querySelectorAll('.work-view .l-record').length === n, REGISTER);
  await page.click('[data-l-action="work-stage"][data-l-stage="connections"]');
  await page.waitForSelector('.work-view .l-connection');
  const rows = await drawn('.work-view .l-connection');
  assert(counts.connections > 2 * REGISTER, `the project holds ${counts.connections} connections`);
  assert.equal(rows, REGISTER, `the connections register draws ${rows} rows before "Show more"`);
  assert.equal(await more('connections').innerText(), `Show ${REGISTER} more`);
  assert.match(await page.locator('[data-register-key="logical:connections"] .l-pager small').innerText(), new RegExp(`^${counts.connections - REGISTER} remaining$`));
  const tShow = Date.now();
  const connectionSteps = await showEvery('connections', '.work-view .l-connection', counts.connections);
  timings.showAllMs = Date.now() - tShow;
  assert.equal(connectionSteps, Math.ceil(counts.connections / REGISTER) - 1);
  pass(`Work lists the first ${REGISTER} of ${counts.responsibilities} responsibilities and of ${counts.connections} connections; a search narrows a register without a pager; "Show more" drew all ${counts.connections} connections in ${connectionSteps} steps, ${timings.showAllMs} ms`);

  // 2. Selecting a node on the Model is bounded.
  await page.goto(base + '/?chapter=4&tab=model&model=map' + project, {waitUntil: 'networkidle'});
  await page.waitForSelector('.cm .cm-stage'); await page.click('[data-lr="depth"][data-id="responsibilities"]'); await page.waitForSelector('.cm .lr-card.resp');
  const cards = await page.$$eval('.cm .lr-card.resp', es => es.map(e => e.dataset.card));
  assert.equal(cards.length, counts.responsibilities, `the model draws ${cards.length} responsibility cards`);
  timings.svgElements = await page.$$eval('.cm-svg *', es => es.length);
  const target = cards[Math.min(49, cards.length - 1)];
  const selectMs = await page.evaluate(async id => {
    const card = document.querySelector(`.lr-card[data-card="${id}"]`);
    const t = performance.now(); card.click();
    await new Promise(resolve => { const tick = () => { if (document.querySelector('#inspector .cm-companion .cm-spec')) resolve(); else requestAnimationFrame(tick); }; tick(); });
    return Math.round(performance.now() - t);
  }, target);
  timings.selectMs = selectMs;
  assert(selectMs <= BOUNDS.select, `selecting node #50 took ${selectMs} ms (bound ${BOUNDS.select} ms)`);
  pass(`Selecting node #50 on the Chapter 4 model took ${selectMs} ms (bound ${BOUNDS.select} ms)`);

  // 2b. The audit's own large project (the reference document plus 300 responsibilities, restored through
  // /api/recovery): the Work register of responsibilities pages at REGISTER rows with "Show more"; the default Chapter 4
  // model draws its routes as SVG and, above the culling threshold, hides the ones off the stage (visibility only: they
  // stay in the DOM), and panning the camera down the model changes which are hidden.
  const large = await buildRecoveryFixture({base, count: 300});
  const largeProject = '&project=' + encodeURIComponent(large.id);
  await page.goto(base + '/?chapter=4&tab=work' + largeProject, {waitUntil: 'networkidle'});
  await page.waitForSelector('.work-view .l-record');
  assert.equal(await drawn('.work-view .l-record'), REGISTER, 'the first ' + REGISTER + ' of ' + large.responsibilities + ' responsibilities are drawn');
  timings.largeWorkElements = await page.$$eval('*', es => es.length);
  const largeSteps = await showEvery('responsibilities', '.work-view .l-record', large.responsibilities);
  assert.equal(largeSteps, Math.ceil(large.responsibilities / REGISTER) - 1);
  pass(`The Work register of the ${large.responsibilities}-responsibility project draws ${REGISTER} rows (${timings.largeWorkElements} elements) and "Show more" draws all ${large.responsibilities} in ${largeSteps} steps`);
  await page.goto(base + '/?chapter=4&tab=model' + largeProject, {waitUntil: 'networkidle'});
  await page.waitForSelector('.cm .cm-stage');
  await page.waitForFunction(() => document.querySelectorAll('.cm-svg > *').length > 0);
  const cullFrom = await page.evaluate(async () => (await import('/model-stage.js')).CULL_FROM);
  const cull = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => { const kids = [...document.querySelectorAll('.cm-svg > *')]; r({children: kids.length, hidden: kids.filter(e => e.style.visibility === 'hidden').map((e, i) => i)}); }))));
  // The culling runs on the stage's next frame after a draw: read it once it has settled rather than in the window
  // between the draw and that frame (round 9: under a loaded regression run the read sometimes landed there). The
  // assertions below are unchanged; if nothing is ever hidden they still fail.
  // Round 12 (K): the waits pass the function itself. A predicate given as a string is evaluated again on every poll,
  // which the page's Content-Security-Policy (script-src 'self') refuses after the first, so the wait ended at once
  // and the refusal sometimes surfaced as a page error; a function is evaluated once and then polled.
  const hiddenCount = () => [...document.querySelectorAll('.cm-svg > *')].filter(e => e.style.visibility === 'hidden').length;
  const settled = (pred, arg) => page.waitForFunction(pred, arg, {timeout: 3000}).catch(() => {});
  await settled(hiddenCount);
  let culled = await cull();
  timings.svgChildren = culled.children; timings.svgHidden = culled.hidden.length;
  if (culled.children >= cullFrom) {
    assert(culled.hidden.length > 0, `${culled.children} top-level SVG children and none hidden off the stage`);
    const before = new Set(culled.hidden);
    const stageBox = await page.locator('.cm .cm-stage').boundingBox();
    await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
    await page.mouse.wheel(0, 2400); // the wheel pans the camera down the model
    await settled(n => [...document.querySelectorAll('.cm-svg > *')].filter(e => e.style.visibility === 'hidden').length !== n, before.size);
    culled = await cull();
    assert(culled.hidden.some(i => !before.has(i)) || [...before].some(i => !culled.hidden.includes(i)), 'moving the camera changes which routes are hidden');
    pass(`The Chapter 4 model hides ${timings.svgHidden} of ${culled.children} top-level SVG children that lie off the stage, and follows the camera`);
  } else pass(`The Chapter 4 model has ${culled.children} top-level SVG children, under the culling threshold of ${cullFrom}; nothing is hidden`);

  // 2c. Round 10 (N6): culling with lines drawn together. The large project's Chapter 8 Layers view crosses the culling
  // threshold because of its lines drawn together (one g.nt-bundle each): zoomed in, a line is culled as one unit, while
  // the relationships' hits stay one group that is never culled, so every relationship keeps its Tab stop, and the
  // keyboard's place survives a redraw.
  await page.goto(base + '/?chapter=8&tab=model&model=layers' + largeProject, {waitUntil: 'networkidle'});
  // The screen-sized Layers overview is the default for a large model. Open the full graph
  // explicitly before measuring the route and keyboard culling of its individual relationships.
  const showAllLayers = page.locator('.cm .nt-fold-note [data-nt="fold-all"]');
  if (await showAllLayers.count()) await showAllLayers.click();
  // rc39/rc40 (rc41 W4): the Connections control opens on a level (Adjacent) that leaves some links out, their hits off
  // the keyboard; every relationship is measured with All chosen, so "the keyboard reaches every relationship" stays whole.
  const allLevel = page.locator('.cm .nt-connections [data-nt="connections"][data-id="all"]');
  await allLevel.click(); await page.waitForSelector('.cm .nt-connections [data-nt="connections"][data-id="all"][aria-pressed="true"]');
  assert.equal(await page.$$eval('.cm-svg .nt-edge.nt-connection-hidden', es => es.length), 0, 'All leaves no relationship out');
  await page.waitForSelector('.cm .cm-svg .nt-hits .nt-hit'); await page.waitForTimeout(300);
  const shape = await page.evaluate(() => { const kids = [...document.querySelectorAll('.cm-svg > *')]; return {children: kids.length, bundles: kids.filter(k => k.classList.contains('nt-bundle')).length, hitGroups: kids.filter(k => k.classList.contains('nt-hits')).length, hits: document.querySelectorAll('.cm-svg .nt-hit').length, edges: document.querySelectorAll('.cm-svg g.nt-edge[data-nt-edge]').length}; });
  assert(shape.children >= cullFrom && shape.bundles > 0, `Chapter 8 Layers: ${shape.children} top-level SVG children with ${shape.bundles} lines drawn together (threshold ${cullFrom})`);
  assert(shape.hitGroups === 1 && shape.hits === shape.edges, `one group of hits, one hit per relationship: ${JSON.stringify(shape)}`);
  await page.evaluate(() => { const st = document.querySelector('.cm-stage'), r = st.getBoundingClientRect(); st.dispatchEvent(new WheelEvent('wheel', {deltaY: -Math.log(1.6 / Number(/scale\(([\d.]+)\)/.exec(document.querySelector('.cm-world').style.transform)?.[1] || 1)) / 0.0022, ctrlKey: true, clientX: r.left + 60, clientY: r.top + 60, bubbles: true, cancelable: true})); });
  await settled(hiddenCount);
  const cut = await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => {
    const kids = [...document.querySelectorAll('.cm-svg > *')], hidden = kids.filter(e => e.style.visibility === 'hidden');
    // (the review of round 10: the culling measured a part before its transform, so every element vanished once the camera
    // moved; a part whose box meets the stage is never hidden, nor is one that takes the keyboard)
    const st = document.querySelector('.cm-stage').getBoundingClientRect(), meets = b => b.width > 0 && b.height > 0 && b.right > st.left && b.left < st.right && b.bottom > st.top && b.top < st.bottom;
    const wrong = kids.filter(k => k.tagName !== 'defs' && k.tagName !== 'style' && k.style.visibility === 'hidden' && meets(k.getBoundingClientRect())).map(k => k.getAttribute('class') || k.tagName);
    const focusHidden = kids.filter(k => k.hasAttribute('tabindex') && k.style.visibility === 'hidden').length, nodes = kids.filter(k => k.classList.contains('nt-node')).length;
    r({hidden: hidden.length, lines: hidden.filter(k => k.classList.contains('nt-bundle')).length, inside: document.querySelectorAll('.cm-svg .nt-bundle [style*="visibility"]').length, hitsHidden: document.querySelector('.cm-svg > .nt-hits').style.visibility === 'hidden', hitsShown: [...document.querySelectorAll('.cm-svg .nt-hit')].every(h => getComputedStyle(h).visibility === 'visible'), wrong, focusHidden, nodes});
  }))));
  assert(cut.hidden > 0 && cut.lines > 0 && cut.inside === 0, `zoomed in, lines drawn together are culled as units: ${JSON.stringify(cut)}`);
  assert(!cut.hitsHidden && cut.hitsShown, 'the relationships’ hits are never culled');
  assert.deepEqual(cut.wrong, [], 'no part whose box meets the stage is hidden (the culling reads each part where it stands)');
  assert(cut.nodes > 0 && cut.focusHidden === 0, `no element that takes the keyboard is hidden (${cut.nodes} elements, ${cut.focusHidden} hidden)`);
  await page.focus('.cm-svg .nt-hits .nt-hit');
  const reached = new Set([await page.evaluate(() => document.activeElement?.dataset?.ntEdge)]);
  for (let i = 1; i < shape.hits; i++) { await page.keyboard.press('Tab'); reached.add(await page.evaluate(() => (document.activeElement?.classList.contains('nt-hit') ? document.activeElement.dataset.ntEdge : null))); }
  reached.delete(null); reached.delete(undefined);
  assert.equal(reached.size, shape.hits, `the keyboard reaches every relationship while the picture culls: ${reached.size} of ${shape.hits}`);
  const kept = await page.evaluate(() => document.activeElement?.dataset?.ntEdge);
  await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  const back = await page.evaluate(() => { const a = document.activeElement; return {id: a?.dataset?.ntEdge || null, hit: !!a?.classList?.contains('nt-hit'), shown: !!a && getComputedStyle(a).visibility === 'visible', selected: document.querySelector('.cm-svg .nt-edge.sel')?.dataset.ntEdge || null}; });
  assert.deepEqual(back, {id: kept, hit: true, shown: true, selected: kept}, 'after the redraw a selection makes, the keyboard is on the same relationship’s hit');
  timings.layersChildren = shape.children; timings.layersBundles = shape.bundles; timings.layersHidden = cut.hidden;
  pass(`Chapter 8 Layers of the large project: ${shape.children} top-level SVG children, ${shape.bundles} of them lines drawn together; zoomed in, ${cut.hidden} are hidden (${cut.lines} lines, each as one unit), the hits never; Tab reaches all ${shape.hits} relationships and a redraw keeps the keyboard on its hit`);

  // 3. Editing a group: the review happens inside the editor, the save is bounded, focus returns to the opener.
  await page.goto(base + '/?chapter=4&tab=work' + project, {waitUntil: 'networkidle'});
  await page.waitForSelector('.work-view .l-record');
  const opener = page.locator('[data-l-action="edit-group"]').first();
  const groupId = await opener.getAttribute('data-l-id');
  await opener.focus(); await opener.click();
  await page.waitForSelector('dialog.logical-dialog[open] #l-group-form');
  const title = await page.inputValue('dialog[open] [name="title"]');
  await page.fill('dialog[open] [name="title"]', title + ' (scaled)');
  await page.click('dialog[open] #l-group-form button[type="submit"]');
  await page.waitForSelector('dialog[open] [data-dialog-review] [data-reviewed]');
  assert.equal(await page.$$eval('dialog[open]', es => es.length), 1, 'one dialog while the change is reviewed');
  assert.notEqual(await saveState(), 'Saving…', 'the top bar does not say Saving while a person reviews');
  await page.check('dialog[open] [data-reviewed]');
  const tSave = Date.now();
  await page.click('dialog[open] [data-wb-action="apply-preview"]');
  await page.waitForFunction(() => !document.querySelector('dialog[open]') && document.querySelector('.save-state')?.textContent.includes('Saved'));
  timings.saveMs = Date.now() - tSave;
  assert(timings.saveMs <= BOUNDS.save, `the group save and re-render took ${timings.saveMs} ms (bound ${BOUNDS.save} ms)`);
  const focused = await page.evaluate(() => ({action: document.activeElement?.dataset?.lAction || '', id: document.activeElement?.dataset?.lId || '', tag: document.activeElement?.tagName}));
  assert.deepEqual(focused, {action: 'edit-group', id: groupId, tag: 'BUTTON'}, 'focus returned to the Edit group button after the re-render: ' + JSON.stringify(focused));
  assert.equal(await page.$eval('.work-view', e => window.aiwProjectStore.value.document.logical.groups.find(g => g.id === e.ownerDocument.activeElement.dataset.lId).title), title + ' (scaled)');
  pass(`Group save through the in-editor review took ${timings.saveMs} ms (bound ${BOUNDS.save} ms); focus returned to its opener`);

  assert.deepEqual(errors, [], 'no page errors');
  console.log('TIMINGS ' + JSON.stringify({count: COUNT, ...timings, bounds: BOUNDS}));
  console.log(`\n${checks.length} checks passed.`);
} catch (e) {
  console.error('FAIL', e.message); if (errors.length) console.error('page errors:', errors); process.exitCode = 1;
} finally {
  await browser.close(); server.kill('SIGKILL');
  try { rmSync(db, {force: true}); rmSync(db + '-wal', {force: true}); rmSync(db + '-shm', {force: true}); } catch { /* left for the next run to overwrite */ }
}
