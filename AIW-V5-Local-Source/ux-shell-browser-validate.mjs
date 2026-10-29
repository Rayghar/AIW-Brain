// Rendered checks for the one workspace shell (round 3, A: one document for all eleven chapters) and the round-2 UI/UX
// remediation it carries (audit/round2/05_UI_UX.md, U2-01…U2-39): moving Ch1 → Ch2 → Ch3 → Ch4 → Ch11 → Ch1 through
// the sidebar is never a document navigation and keeps the working tab and the project, another project opened in place
// (round 4, A: from the shell's import intake, a link and Back), Record decision and its
// checklist, honest readiness on a blank and an edited project, Validate's finding actions, the saved record and the
// toast, the change notice's scope, the layers as a Model-tab control beside Work's own record search, Back from a
// perspective, toolbars at 768 px, phone defaults and navigation, "Next", the tablist, reduced motion, offline saving,
// the editors' titles, the projects dialog, the desk's type floor, the glossary and footer, Sol making room in
// Chapters 1–3, and (round 5, Contract G)
// one guidance voice per screen, the "You are here" line, the help map and the first-run coach.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally
// AIW_BROWSER_EXECUTABLE. Starts an isolated local server on a free port. Run: node ux-shell-browser-validate.mjs
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/ux-shell-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [], failed = [];
const pass = n => checks.push(n);
// The page's requests, every frame's (rc41 close): settle() waits until none is in flight and none has started or ended for
// 500 ms — Playwright's own definition of network idle — counted from the request events. Its 'networkidle' lifecycle
// event cannot be waited on here: once the main frame has made a request after its first idle, a frame that commits later
// (Output's inline preview, /api/export … view=1) withdraws the event and the main frame does not re-arm its idle timer
// until it makes another request, so waitForLoadState('networkidle') ran out its 30 s with nothing in flight (after the
// glossary click of the tab-purpose block; one main-frame request restores it 500 ms later); while the event stood it
// returned at once with requests in flight.
const traffic = new WeakMap();
const context = async (options = {}) => {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}, ...options});
  const page = await ctx.newPage();
  const t = {open: new Set(), at: Date.now()}; traffic.set(page, t);
  page.on('request', r => { t.open.add(r); t.at = Date.now(); });
  for (const e of ['requestfinished', 'requestfailed']) page.on(e, r => { t.open.delete(r); t.at = Date.now(); });
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && r.url().includes('/api/')) failed.push(r.status() + ' ' + r.url().replace(base, '')); });
  return {ctx, page};
};
const settle = async (page, ms = 800) => {
  await page.waitForLoadState('load');
  const t = traffic.get(page), end = Date.now() + 30000;
  while (t.open.size || Date.now() - t.at < 500) { if (Date.now() > end) throw Error('settle: the network was never quiet for 500 ms in 30 s; in flight: ' + [...t.open].map(r => r.url().replace(base, '')).join(', ')); await page.waitForTimeout(50); }
  await page.waitForTimeout(ms);
};
const focused = page => page.evaluate(() => { const a = document.activeElement; return a ? a.tagName + (a.id ? '#' + a.id : '') + (a.className && typeof a.className === 'string' ? '.' + a.className.trim().split(/\s+/).join('.') : '') + '|' + (a.textContent || '').trim().slice(0, 60) : ''; });
const blankProject = async page => (await page.evaluate(async () => (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'UX blank', template: 'blank', brief: ''})})).json())).document.id;

try {
  const {page} = await context();

  // 1. Round 3 A, U2-01, U2-26: one document for the whole journey. Ch1 → Ch2 → Ch3 → Ch4 → Ch11 → Ch1 through the
  //    sidebar links never loads a document (a marker set on the first load survives, the navigation timing entry is
  //    still the first one, no load event fires); each crossing keeps the working tab and the project, swaps the
  //    chapter's studio and its bridge, and Back returns to the previous chapter in the same document. The journey runs on
  //    the reference project (as round 2's crossing did, so Chapter 4's milestone memory is read before step 2 changes
  //    its inputs); a blank project then shows the project staying in the address.
  await page.goto(base + '/?chapter=1&tab=validate'); await settle(page);
  const names = await page.$$eval('a.chapter-item', as => as.map(a => a.querySelector('b').textContent));
  assert.deepEqual(names, ['Requirements', 'Architectural drivers', 'Decisions', 'Logical application', 'Application realization', 'Logical technology', 'Technology realization', 'Interfaces & data', 'Security', 'Deployment / runtime', 'Review & realize'], 'the sidebar lists the eleven chapters, by one set of names');
  assert.equal(await page.$$eval('a.chapter-item[data-chapter]', as => as.length), 11, 'every chapter is a link the shell follows in place');
  const origin = await page.evaluate(() => { window.__aiwOneDocument = 'round-3'; return performance.timeOrigin; });
  let loads = 0; const onLoad = () => loads++; page.on('load', onLoad);
  const where = () => page.evaluate(() => { const q = new URLSearchParams(location.search); return {marker: window.__aiwOneDocument, origin: performance.timeOrigin, navigations: performance.getEntriesByType('navigation').length, chapter: Number(q.get('chapter')), tab: q.get('tab'), project: q.get('project'), current: Number(document.querySelector('a.chapter-item[aria-current="step"]')?.dataset.chapter), active: document.querySelector('.tab.active')?.dataset.tab, crumb: document.querySelector('.breadcrumb')?.textContent || '', pages: ['aiwRequirementsPage', 'aiwQualityPage', 'aiwDecisionsPage'].filter(k => window[k])}; });
  const bridges = {1: ['aiwRequirementsPage'], 2: ['aiwQualityPage'], 3: ['aiwDecisionsPage'], 4: [], 11: []};
  for (const chapter of [2, 3, 4, 11, 1]) {
    await page.click(`a.chapter-item[data-chapter="${chapter}"]`); await settle(page, 600);
    const at = await where();
    assert.deepEqual({marker: at.marker, origin: at.origin, navigations: at.navigations}, {marker: 'round-3', origin, navigations: 1}, `Chapter ${chapter} opens in the same document`);
    assert.deepEqual({chapter: at.chapter, current: at.current, tab: at.tab, active: at.active}, {chapter, current: chapter, tab: 'validate', active: 'validate'}, `Chapter ${chapter} keeps the working tab`);
    // The rc38 shell's breadcrumb (audit/rc41/w4/NOTE.md, ui-proportion): "<project> › Chapter N · <title> · <tab>( · <reading>)", was "Chapter 0N".
    assert.match(at.crumb, new RegExp('Chapter ' + chapter + ' · ' + names[chapter - 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' · Validate( · [^·]+)?$'), `Chapter ${chapter}: the breadcrumb names the chapter, its title and the tab (${at.crumb})`);
    assert.deepEqual(at.pages, bridges[chapter], `Chapter ${chapter}: only its own studio is bound`);
  }
  await page.goBack(); await settle(page, 600);
  const back = await where();
  assert.deepEqual({marker: back.marker, chapter: back.chapter, tab: back.tab, pages: back.pages}, {marker: 'round-3', chapter: 11, tab: 'validate', pages: []}, 'Back returns to Chapter 11 in the same document');
  // A link inside the page into another chapter (a readiness-board tile's next action on Chapter 11 Output) is the
  // same in-place change: it opens the chapter and the tab it names, selects its record, and Back returns.
  await page.click('.tabs [data-tab="output"]'); await settle(page, 600);
  const tile = await page.$eval('.stage a[href*="chapter="]:not([href*="chapter=11"])', a => { const q = new URL(a.href).searchParams; return {href: a.getAttribute('href'), chapter: Number(q.get('chapter')), tab: q.get('tab'), object: q.get('object') || q.get('artefact') || q.get('driver') || q.get('decision')}; });
  await page.click(`.stage a[href="${tile.href}"]`); await settle(page, 600);
  const via = await where(), viaObject = await page.evaluate(() => new URLSearchParams(location.search).get('object'));
  assert.deepEqual({marker: via.marker, origin: via.origin, navigations: via.navigations, chapter: via.chapter, current: via.current, tab: via.tab, object: viaObject}, {marker: 'round-3', origin, navigations: 1, chapter: tile.chapter, current: tile.chapter, tab: tile.tab, object: tile.object}, 'a link inside the page opens its chapter, tab and record in the same document');
  await page.goBack(); await settle(page, 600);
  const returned = await where();
  assert.deepEqual({marker: returned.marker, chapter: returned.chapter, tab: returned.tab}, {marker: 'round-3', chapter: 11, tab: 'output'}, 'Back from an in-page link returns to Chapter 11 Output in the same document');
  page.off('load', onLoad);
  assert.equal(loads, 0, 'no document loaded on the way');
  const blank = await blankProject(page);
  await page.goto(base + '/?chapter=2&tab=model&project=' + blank); await settle(page);
  const blankOrigin = await page.evaluate(() => { window.__aiwOneDocument = 'blank'; return performance.timeOrigin; });
  for (const chapter of [5, 3]) {
    await page.click(`a.chapter-item[data-chapter="${chapter}"]`); await settle(page, 600);
    const at = await where();
    assert.deepEqual({marker: at.marker, origin: at.origin, chapter: at.chapter, tab: at.tab, project: at.project}, {marker: 'blank', origin: blankOrigin, chapter, tab: 'model', project: blank}, `the blank project stays in the address on Chapter ${chapter}, in the same document`);
  }
  pass('round 3 A / U2-01 / U2-26: Ch1 → Ch2 → Ch3 → Ch4 → Ch11 → Ch1 and Back through the sidebar, and a readiness-board link into another chapter and Back, are zero document navigations (marker, navigation timing and load events); each crossing keeps the working tab and the project and binds only that chapter\'s studio; the eleven chapters are links with one set of names');

  // 1b. Round 4 A: another project opens in place. A project created through the shell's own intake (Chapter 4 Model →
  //     Perspectives → New perspective… → the companion's Import a model package…, restoring this project's recovery
  //     package as a new project), a link that names another project, and Back across the two are not document loads: the marker
  //     survives and the navigation timing entry is still the first; the sidebar, the store and every later request name
  //     the project on screen; a save lands in it and the project left behind is untouched. The Projects page stays its
  //     own route, so its link is a document load.
  {
    // Its own context: the perspective a chapter shows is a stored preference the later steps must not inherit.
    const {ctx, page} = await context();
    await page.goto(base + '/?chapter=4&tab=model'); await page.waitForSelector('.cm.lr .pv-pick'); await settle(page);
    const switchOrigin = await page.evaluate(() => { window.__aiwOneDocument = 'round-4'; return performance.timeOrigin; });
    let switchLoads = 0; const onSwitchLoad = () => switchLoads++; page.on('load', onSwitchLoad);
    const shown = () => page.evaluate(() => { const q = new URLSearchParams(location.search); return {marker: window.__aiwOneDocument, origin: performance.timeOrigin, navigations: performance.getEntriesByType('navigation').length, project: q.get('project'), chapter: Number(q.get('chapter')), tab: q.get('tab'), sidebar: document.querySelector('.project-switch strong')?.textContent, store: window.aiwProjectStore.value.document.id}; });
    const named = name => page.waitForFunction(n => document.querySelector('.project-switch strong')?.textContent === n && window.aiwProjectStore.value.document.name === n, name, {timeout: 20000});
    const pack = await page.evaluate(async () => (await fetch('/api/recovery?action=export', {credentials: 'same-origin'})).text());
    await page.click('.cm.lr .pv-pick > summary'); await page.click('.cm.lr .pv-pick [data-pv="new"]'); await page.waitForSelector('#inspector [data-pv="import"]');
    // The form the person asked for opens the Details column it is written into (closed here: nothing is held, so it does
    // not open by itself) and takes the keyboard (rc41 close: an explicit request, perspective-view.js focusAfterChoice).
    await page.waitForFunction(() => document.activeElement?.matches?.('#inspector [data-pv-field="concern"]'));
    assert.deepEqual(await page.evaluate(() => ({panel: document.body.dataset.panel, hidden: document.querySelector('#inspector').getAttribute('aria-hidden')})), {panel: 'open', hidden: 'false'}, '"New perspective…" opens the Details column with its form');
    await page.click('#inspector [data-pv="import"]');
    await page.setInputFiles('dialog[open] input[type=file]', {name: 'AIW_Recovery.json', mimeType: 'application/json', buffer: Buffer.from(pack)});
    await page.click('dialog[open] button[type=submit]'); await page.waitForSelector('dialog[open] [name=name]');
    await page.fill('dialog[open] [name=name]', 'Restored in place'); await page.check('dialog[open] [name=reviewed]');
    const requests = [], onRequest = r => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/') && !['/api/recovery', '/api/projects'].includes(u.pathname)) requests.push(u.pathname + ' ' + u.searchParams.get('project')); };
    page.on('request', onRequest);
    await page.click('dialog[open] button[type=submit]'); await named('Restored in place'); await settle(page);
    page.off('request', onRequest);
    const restored = await shown();
    assert.ok(restored.project && restored.project !== 'bank-payment', 'the address names the new project');
    assert.deepEqual({marker: restored.marker, origin: restored.origin, navigations: restored.navigations, chapter: restored.chapter, tab: restored.tab, sidebar: restored.sidebar, store: restored.store}, {marker: 'round-4', origin: switchOrigin, navigations: 1, chapter: 1, tab: 'work', sidebar: 'Restored in place', store: restored.project}, 'the project the import created opens on its Chapter 1 Work in the same document');
    assert.ok(requests.some(r => r.startsWith('/api/project ')) && requests.every(r => r.endsWith(' ' + restored.project)), 'the store reads the new project and every later request names it: ' + requests.join(', '));
    const reference = await page.evaluate(async () => (await (await fetch('/api/project')).json()).revision);
    await page.evaluate(async () => { await window.aiwProjectStore.command({type: 'logical.responsibility', payload: {title: 'Saved in place', purpose: '', boundary: '', owner: '', source: '', groupId: '', requirementIds: [], decisionIds: []}}); });
    assert.equal(await page.evaluate(async () => (await (await fetch('/api/project')).json()).revision), reference, 'the project left behind is untouched');
    assert.ok((await page.evaluate(async id => (await (await fetch('/api/project?project=' + id)).json()).document.logical.responsibilities.map(r => r.title), restored.project)).includes('Saved in place'), 'a save lands in the project on screen');
    await page.evaluate(id => { const a = document.createElement('a'); a.id = 'other-project'; a.href = '/?chapter=2&tab=work&project=' + id; a.textContent = 'Open the blank project'; document.querySelector('.heading-row').prepend(a); }, blank);
    await page.click('#other-project'); await named('UX blank'); await settle(page);
    const linked = await shown();
    assert.deepEqual({marker: linked.marker, navigations: linked.navigations, project: linked.project, store: linked.store, chapter: linked.chapter, tab: linked.tab}, {marker: 'round-4', navigations: 1, project: blank, store: blank, chapter: 2, tab: 'work'}, 'a link that names another project opens it in place, on the chapter and tab it names');
    assert.deepEqual(await page.evaluate(() => ['aiwRequirementsPage', 'aiwQualityPage', 'aiwDecisionsPage'].filter(k => window[k])), ['aiwQualityPage'], 'only the new project\'s Chapter 2 studio is bound');
    await page.goBack(); await named('Restored in place'); await settle(page);
    const back = await shown();
    assert.deepEqual({marker: back.marker, navigations: back.navigations, project: back.project, store: back.store, chapter: back.chapter, tab: back.tab}, {marker: 'round-4', navigations: 1, project: restored.project, store: restored.project, chapter: 1, tab: 'work'}, 'Back returns to the restored project in place');
    // View preferences stay with their project: a Matrix pair and a hidden layer chosen on Chapter 8 of the restored
    // project are not what another project opened in place shows, nothing of them is saved under its key, the restored
    // project's stored choices are unchanged, and they are there again on the way back.
    const prefsOf = id => page.evaluate(id => [localStorage.getItem('aiw-notation-v2-ch8:' + id), localStorage.getItem('aiw-exchange-model-v1:' + id)], id);
    // The sidebar's two forms since rc38 (audit/rc39/merge-notes/W2.md step 2: "the sidebar's per-layer buttons left in
    // rc38"; app.js layersRail, notation-view.js tellSidebar filterMenu): on the notation kit's views (the Matrix here) it
    // names the picture and what the layers hide, and "Open picture layer filters" opens the view's Visibility menu,
    // where each layer is a checkbox; a chapter's own view (Chapter 8's Data flow) keeps a button per layer. Each read
    // asserts the form its view has, and reads the hidden layers there (a layer the picture holds, unticked or unpressed,
    // as the sidebar's enabled unpressed buttons were) with the sidebar's line.
    const layersMenu = async () => { await page.click('.sidebar .model-layers [data-action="model-layer-filter"]'); await page.waitForSelector('.nt-pop input[data-nt="layer"]'); };
    const closeLayers = async () => { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.nt-pop input[data-nt="layer"]')); };
    const picture = async ({menu}) => {
      const form = await page.evaluate(() => ({buttons: document.querySelectorAll('.sidebar .model-layers .rail-layer').length > 0, filter: !!document.querySelector('.sidebar .model-layers [data-action="model-layer-filter"]')}));
      assert.deepEqual(form, {buttons: !menu, filter: menu}, menu ? 'the sidebar opens the picture\'s Visibility menu, with no per-layer buttons' : 'the sidebar has a button per layer for the chapter\'s own view');
      if (menu) await layersMenu();
      const v = await page.evaluate(m => ({view: document.querySelector('.cm-view[aria-pressed="true"]')?.dataset.id || null, address: new URLSearchParams(location.search).get('model'), rows: document.querySelector('[data-nt-field="xrows"]')?.value || null, cols: document.querySelector('[data-nt-field="xcols"]')?.value || null, hidden: m ? [...document.querySelectorAll('.nt-pop input[data-nt="layer"]:not(:disabled)')].filter(i => !i.checked).map(i => i.dataset.id) : [...document.querySelectorAll('.sidebar .model-layers .rail-layer:not([disabled])[aria-pressed="false"]')].map(b => b.dataset.layer), line: document.querySelector('.sidebar .model-layers .rail-view-hint')?.textContent || null}), menu);
      if (menu) await closeLayers();
      return v;
    };
    await page.click('a.chapter-item[data-chapter="8"]'); await settle(page, 400); await page.click('.tabs [data-tab="model"]');
    await page.waitForSelector('.cm .cm-view[data-id="cross"]'); await settle(page, 400);
    await page.click('.cm .cm-view[data-id="cross"]'); await page.waitForSelector('[data-nt-field="xrows"]'); await settle(page, 400);
    const pair = await picture({menu: true}), pick = await page.$eval('[data-nt-field="xrows"]', (el, cols) => [...el.options].map(o => o.value).find(v => v !== el.value && v !== cols), pair.cols);
    await page.selectOption('[data-nt-field="xrows"]', pick); await settle(page, 400);
    await layersMenu();
    const [off, held] = await page.$eval('.nt-pop label.nt-layer:has(input[data-nt="layer"]:not(:disabled):checked)', l => [l.querySelector('input').dataset.id, Number(l.querySelector('small')?.textContent)]);
    await page.click(`.nt-pop [data-nt="layer"][data-id="${off}"]`); await settle(page, 400); await closeLayers();
    const chosen = await picture({menu: true}), storedA = await prefsOf(restored.project);
    assert.ok(held > 0, `the layer switched off holds elements of this picture (${off} · ${held})`);
    assert.deepEqual({view: chosen.view, rows: chosen.rows, hidden: chosen.hidden, line: chosen.line}, {view: 'cross', rows: pick, hidden: [off], line: `Matrix · ${held} hidden by layers`}, 'the restored project shows the Matrix pair and the hidden layer chosen, and the sidebar says what it hides');
    const second = await page.evaluate(async () => (await (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Second reference', template: 'warehouse-fulfilment', brief: ''})})).json()).document.id);
    await page.evaluate(id => { const a = document.createElement('a'); a.id = 'second-project'; a.href = '/?chapter=8&tab=model&project=' + id; a.textContent = 'Open the second project'; document.querySelector('.heading-row').prepend(a); }, second);
    await page.click('#second-project'); await named('Second reference'); await page.waitForSelector('.cm .cm-view[aria-pressed="true"]'); await settle(page);
    // Its own default is the chapter's first own view (instrument-tray.js defaultView, round 11 workstream A: "its default
    // view · Diagram · its other views", model-views-browser §2c), Chapter 8's Data flow; the pin named the Diagram.
    const fresh = await picture({menu: false});
    assert.deepEqual({view: fresh.view, address: fresh.address, rows: fresh.rows, hidden: fresh.hidden, line: fresh.line}, {view: 'data', address: 'data', rows: null, hidden: [], line: 'Data flow · every layer shown'}, 'the other project opens on its own defaults, with no layer hidden and no Matrix of the last project left behind');
    assert.deepEqual(await prefsOf(second), [null, null], 'nothing of the last project is saved under the other project\'s key');
    await page.click('.cm .cm-view[data-id="cross"]'); await page.waitForSelector('[data-nt-field="xrows"]'); await settle(page, 400);
    assert.deepEqual(await picture({menu: true}).then(v => [v.rows, v.cols, v.hidden]), ['component', 'contract', []], 'its Matrix opens on the chapter\'s default pair, with no layer hidden');
    assert.deepEqual(await prefsOf(restored.project), storedA, 'the restored project\'s stored choices are unchanged');
    await page.goBack(); await named('Restored in place'); await page.waitForSelector('[data-nt-field="xrows"]'); await settle(page);
    const again = await picture({menu: true});
    assert.deepEqual({view: again.view, rows: again.rows, hidden: again.hidden, line: again.line}, {view: 'cross', rows: pick, hidden: [off], line: chosen.line}, 'back on the restored project its Matrix pair and hidden layer are there again, and the sidebar says the same');
    page.off('load', onSwitchLoad);
    assert.equal(switchLoads, 0, 'no document loaded on the way');
    await page.click('a.project-switch'); await page.waitForSelector('#project-list'); await settle(page, 300);
    assert.deepEqual(await page.evaluate(() => ({marker: window.__aiwOneDocument ?? null, view: new URLSearchParams(location.search).get('view')})), {marker: null, view: 'projects'}, 'the Projects page is still its own route');
    await ctx.close();
  }
  pass('round 4 A: a project created through the shell\'s import intake opens on its Chapter 1 Work in place, a link naming another project opens that project\'s chapter and tab in place, and Back returns across them — zero document loads (marker, navigation timing, load events); the sidebar, the store and every request after the switch name the project on screen, a save lands there and the project left behind is unchanged; a Matrix pair and a hidden layer stay with their project across the switch, neither shown in nor saved under the other; the Projects page stays its own route');

  // 2. U2-04: Record decision waits for its preconditions, says why, and the change review opens inside the editor.
  await page.goto(base + '/?chapter=3&tab=work'); await settle(page);
  await page.click('[data-d-stage="record"]'); await page.waitForTimeout(300);
  assert.equal(await page.$eval('[data-d-action="record"]', b => b.disabled), true, 'Record decision is disabled while a precondition is open');
  assert.match(await page.$eval('#d-record-reason', e => e.textContent), /^Record decision needs: choose a working alternative/);
  assert.equal(await page.$eval('[data-d-action="record"]', b => b.getAttribute('aria-describedby')), 'd-record-reason');
  assert.equal(await page.$$eval('.d-checklist li', l => l.length), 5, 'the server\'s preconditions, as a checklist');
  await page.click('.d-checklist [data-d-action="go-compare"]'); await page.waitForTimeout(300);
  await page.click('[data-d-choose]'); await page.waitForTimeout(900);
  await page.click('[data-d-stage="record"]'); await page.waitForTimeout(300);
  await page.click('.d-checklist [data-d-action="edit-rationale"]'); await page.waitForTimeout(400);
  assert.match(await focused(page), /^TEXTAREA/, 'the editor opens at the missing rationale');
  await page.fill('dialog[open] [name="rationale"]', 'It keeps the ledger authoritative and isolates settlement retries.');
  await page.click('dialog[open] button[type="submit"]'); await page.waitForSelector('dialog[open] [data-dialog-review]');
  assert.equal(await page.$$eval('dialog[open]', d => d.length), 1, 'the change review sits inside the editor, not stacked on it');
  await page.check('dialog[open] [data-reviewed]'); await page.fill('dialog[open] [data-dialog-review] [name="reason"]', 'Record the rationale.');
  await page.click('dialog[open] [data-wb-action="apply-preview"]'); await page.waitForTimeout(1200);
  await page.click('[data-d-stage="record"]').catch(() => {}); await page.waitForTimeout(300);
  assert.equal(await page.$eval('[data-d-action="record"]', b => b.disabled), false, 'enabled once every precondition holds');
  await page.click('[data-d-action="record"]'); await page.waitForTimeout(900);
  assert.match(await page.$eval('#toast', e => e.textContent), /Decision recorded/);
  assert.deepEqual(failed.filter(f => f.includes('/api/commands')), [], 'no save failed on the way');
  pass('U2-04: Record decision is disabled with a one-line reason and a checklist of the server\'s preconditions, each with the action that completes it; the change review opens inside the editor; recording then succeeds with no failed request');

  // 3. U2-05: a blank project is not called illustrative, blocked or sized.
  await page.goto(base + '/?chapter=4&tab=work&project=' + blank); await settle(page);
  assert.doesNotMatch(await page.$eval('#progress-count', e => e.textContent), /illustrative/);
  await page.goto(base + '/?chapter=1&tab=validate&project=' + blank); await page.waitForSelector('[data-validation-workspace$=":1:"][data-bound="1"]'); await settle(page);
  // The old head's `.vx-state` line is the rc38 validation workspace's readiness summary (audit/rc41/w4/NOTE.md,
  // validate-browser 8): one, counting what there is to fix and to confirm in its words, and no "block" in the region.
  const blankRegion = page.getByRole('region', {name: 'Chapter 1 validation'}), blankReadiness = blankRegion.locator('[aria-label="Readiness summary"]');
  assert.equal(await blankReadiness.count(), 1, 'one readiness summary');
  const blankSaid = (await blankReadiness.innerText()).replace(/\s+/g, ' ').trim();
  assert.match(blankSaid, /^\d+ findings? to fix \d+ items? to confirm \d+\/\d+ SDD passages? passing\b/, 'Chapter 1 counts what there is to do: ' + blankSaid);
  assert.doesNotMatch(await blankRegion.innerText(), /block/i, 'Chapter 1 says what there is to do');
  await page.goto(base + '/?chapter=11&tab=model&project=' + blank); await page.waitForSelector('.dk-tile'); await settle(page);
  assert.doesNotMatch(await page.$eval('.dk-tile[data-id="capacity"]', e => e.innerText), /req\/s/, 'no derived capacity without inputs');
  await page.goto(base + '/?chapter=4&tab=work'); await settle(page);
  assert.match(await page.$eval('#progress-count', e => e.textContent), /includes illustrative records/, 'the reference project still says it is illustrative');
  pass('U2-05: on a blank project the readiness carries no illustrative note, Validate counts what there is to do rather than what blocks, and the desk shows no capacity figure; the reference project keeps its note');

  // 4. U2-06: an ordinary edit does not collapse readiness to a bare percentage; what was met is "to re-check".
  // Step 2 changed Chapter 4's inputs (the decision it inherits), so its baseline is read, not assumed.
  const before = Number((await page.$eval('#progress-percent', e => e.textContent)).match(/^(\d) of 8$/)[1]);
  await page.evaluate(async () => { await window.aiwProjectStore.command({type: 'logical.responsibility', payload: {title: 'Fraud case review', purpose: '', boundary: '', owner: '', source: '', groupId: '', requirementIds: [], decisionIds: []}}); });
  await page.reload(); await settle(page);
  const [, met, recheck] = (await page.$eval('#progress-count', e => e.textContent)).match(/^(\d) of 8 milestones met, (\d) to re-check/) || [];
  assert.ok(met !== undefined && Number(met) < before && Number(met) + Number(recheck) >= before, 'the milestones lost to the edit are named as to re-check: ' + met + ' met, ' + recheck + ' to re-check, ' + before + ' before');
  assert.equal(await page.$eval('#progress-percent', e => e.textContent), met + ' of 8', 'the headline is the count the saved project meets, not a percentage');
  assert.ok(await page.$eval('#progress-recheck', e => parseFloat(e.style.width) > 0), 'the bar shows what is to re-check');
  assert.match(await page.$eval('.progress-track', e => e.getAttribute('aria-valuetext')), /3 to re-check/);
  pass('U2-06: after adding an incomplete responsibility Chapter 4 reads "n of 8 milestones met, k to re-check" with the re-check segment on the bar, instead of collapsing to a percentage; nothing counts as met that the saved project does not meet');

  // 5. U2-13: a finding's Review keeps the keyboard on the finding; Treat… records a Chapter 11 disposition. The rc38
  //    validation workspace (audit/rc41/w4/NOTE.md, validate-browser's old → new table) lists the findings as one priority
  //    queue; a queue item selects its finding, and the region "Selected finding" holds its actions under "Resolve or
  //    review": Open remedy (the studio's data-l-action="fix"), Treat finding… (data-action="treat-finding") and Ask Sol
  //    (data-validation-ask), where the old groups carried Review, Treat… and Ask Sol on each row.
  const region4 = page.getByRole('region', {name: 'Chapter 4 validation'}), finding4 = region4.getByRole('region', {name: 'Selected finding'}), acts4 = finding4.locator('.validation-detail-actions');
  const open4 = async () => { await page.goto(base + '/?chapter=4&tab=validate'); await page.waitForSelector('[data-validation-workspace$=":4:"][data-bound="1"]'); await settle(page); };
  const pick4 = async key => { await region4.locator(`[data-validation-select="${key}"]`).click(); await page.waitForFunction(k => document.querySelector(`[data-validation-select="${CSS.escape(k)}"]`)?.getAttribute('aria-pressed') === 'true', key); };
  await open4();
  assert.equal(await region4.locator('[data-validation-group]').inputValue(), 'priority', 'the findings open as one priority queue');
  const keys4 = await region4.locator('[data-validation-select]').evaluateAll(xs => xs.map(x => x.dataset.validationSelect));
  assert.deepEqual(await region4.locator('[data-validation-select][aria-pressed="true"]').evaluateAll(xs => xs.map(x => x.dataset.validationSelect)), keys4.slice(0, 1), 'the first finding is selected');
  assert.deepEqual(await acts4.locator(':scope > button, :scope > a').evaluateAll(xs => xs.map(x => x.textContent.trim())), ['Open remedy', 'Treat finding…', 'Ask Sol'], 'its actions: the studio\'s editor, Chapter 11\'s treatment and Sol');
  await acts4.locator('[data-l-action="fix"]').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  // Review opens the record's editor at the field the finding concerns (the studio), or keeps focus on the finding.
  const after = await page.evaluate(() => ({dialog: !!document.querySelector('dialog[open]'), inDialog: !!document.activeElement?.closest('dialog[open]'), body: document.activeElement === document.body}));
  assert.ok(!after.body && (after.dialog ? after.inDialog : true), 'focus never falls to the page body: ' + JSON.stringify(after));
  if (after.dialog) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); if (await page.$('dialog[open]')) { await page.evaluate(() => document.querySelector('dialog[open]')?.close()); } }
  await open4();
  await acts4.locator('[data-action="treat-finding"]').click(); await page.waitForTimeout(300);
  assert.match(await focused(page), /^SELECT/, 'the treatment dialog opens on its first field');
  assert.deepEqual(await page.$$eval('#treat-form [name="treatment"] option', o => o.map(x => x.textContent)), ['Fix before review', 'Accepted design limitation', 'Not applicable', 'Source silent · raised with the owner'], 'only treatments this dialog can record are offered (round 12, GR-SRC-07: a source silent on the question is raised with its owner, named in the reference)');
  await page.click('#treat-form [data-action="close-modal"]'); await page.waitForTimeout(200);
  assert.ok(await page.evaluate(() => !!document.activeElement?.matches('.validation-detail-actions [data-action="treat-finding"]')), 'Cancel returns focus to Treat…: ' + await focused(page));
  // The ranking (was `.vx-index[data-ranked="1"]`): the queue lists content gaps first, then each finding in the journey's
  // ranking (chapter-brief.js rankedFindings, the workspace's own order), read from each finding's record as selected.
  const queue4 = [];
  for (const key of keys4) { await pick4(key); queue4.push(await finding4.evaluate(d => ({title: d.querySelector('h3')?.textContent, gap: /^Content gap/.test(d.querySelector('.validation-detail-kicker')?.textContent || ''), objectId: d.querySelector('[data-validation-inspect]')?.dataset.validationInspect || 'project'}))); }
  const ranks4 = await page.evaluate(async q => { const {rankedFindings} = await import('/chapter-brief.js'); const r = rankedFindings(window.aiwProjectStore.value.document, 4, 500).map(f => f.title + '|' + f.objectId); return q.map(f => r.indexOf(f.title + '|' + f.objectId)); }, queue4);
  const order4 = queue4.map((f, i) => [f.gap ? 0 : 1, ranks4[i] < 0 ? Infinity : ranks4[i]]);
  assert.ok(ranks4.some(r => r >= 0) && order4.every((o, i) => !i || o[0] > order4[i - 1][0] || (o[0] === order4[i - 1][0] && o[1] > order4[i - 1][1]) || (o[1] === Infinity && order4[i - 1][1] === Infinity && o[0] === order4[i - 1][0])), 'the findings follow the journey\'s ranking of the findings: ' + JSON.stringify(queue4.map((f, i) => f.title + '|' + f.objectId + ' #' + ranks4[i])));
  // Ask Sol (was the row's `.vx-ask` with its question and Sol's target M:4:<id> in data attributes): the selected
  // finding's Ask Sol names its finding (data-validation-ask, the queue item's key); Sol gets the finding's title and
  // explanation (with the shared design question its record raises, if one does) as the drafted question, and the record.
  await pick4(keys4[0]);
  const ask = await finding4.evaluate(d => ({key: d.querySelector('[data-validation-ask]')?.dataset.validationAsk, title: d.querySelector('h3')?.textContent, detail: d.querySelector('header > p')?.textContent, id: d.querySelector('[data-validation-inspect]')?.dataset.validationInspect || 'project'}));
  assert.equal(ask.key, keys4[0], 'Ask Sol names the selected finding');
  // Sol's panel arrives through a lazily loaded module, which under CPU load can take longer than the focus itself: the
  // wait is first for the panel's prompt to exist (a longer bound), then for the focus on it, as before.
  await acts4.locator('[data-validation-ask]').click(); await page.waitForSelector('#brain-panel [data-intel-prompt]', {state: 'attached', timeout: 20000});
  await page.waitForFunction(() => document.activeElement?.matches?.('#brain-panel [data-intel-prompt]'), null, {timeout: 6000});
  const drafted = await page.$eval('#brain-panel [data-intel-prompt]', e => e.value), asked = ask.title + '. ' + ask.detail;
  assert.ok(drafted.startsWith(asked) && /^( Shared design question \S+: .+\. Inspect its current source conditions\.)?$/.test(drafted.slice(asked.length)), 'the finding is drafted as the question, not sent: ' + drafted);
  if (ask.id !== 'project') assert.match(page.url(), new RegExp('object=' + ask.id), 'the record the finding concerns is selected');
  await page.click('#brain-panel [data-brain-action="close"]'); await page.waitForTimeout(300);
  assert.ok(!(await page.$('#brain-panel:not([hidden])')), 'Sol closes');
  pass('U2-13: Review on a finding opens the record\'s editor (or keeps focus on the finding), never dropping focus to the page; Treat… opens a Chapter 11 disposition dialog with a reason, offers only the treatments it can record, and returns focus when cancelled; the findings follow the journey\'s ranking, and "Ask Sol about this finding" selects its record and drafts the question without sending it');

  // 6. U2-14, U2-15, U2-35: the Chapter 1 editor says what it adds; the saved record is revealed; the toast is short.
  await page.goto(base + '/?chapter=1&tab=work'); await settle(page);
  await page.click('[data-r-section="requirement"]'); await page.waitForTimeout(300);
  // rc38's Work frame holds the register: its add button sits in the task head (the snapshot's own
  // requirements-validate.mjs, f6fdb02: `.work-task-head [data-r-action="add"]`), where the old card head held it.
  await page.click('.work-task-head [data-r-action="add"]'); await page.waitForSelector('dialog[open]');
  assert.equal(await page.$eval('#r-dialog-title', e => e.textContent), 'Add a functional requirement');
  await page.selectOption('#r-record-type', 'assumption'); await page.waitForTimeout(100);
  assert.equal(await page.$eval('#r-dialog-title', e => e.textContent), 'Add an assumption', 'the title follows the type');
  await page.selectOption('#r-record-type', 'requirement');
  await page.fill('dialog[open] [name="title"]', 'Show the settlement status to the customer');
  await page.click('dialog[open] button[type="submit"]'); await page.waitForTimeout(700);
  const toast = await page.$eval('#toast', e => ({text: e.textContent, top: e.getBoundingClientRect().top, visible: e.classList.contains('visible')}));
  assert.match(toast.text, /^Functional requirement REQ-\d+ saved$/); assert.ok(toast.visible && toast.top < 200, 'the toast sits at the top, clear of the work');
  const saved = await page.$eval('.r-record.ux-just-saved', e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
  assert.equal(saved, true, 'the new record is in view and lit');
  await page.waitForTimeout(5600);
  assert.equal(await page.$eval('#toast', e => e.classList.contains('visible')), false, 'the toast leaves after about five seconds');
  pass('U2-14/U2-15/U2-35: "Add a functional requirement" (the title follows the type); the saved record is scrolled into view and lit; the toast names it, sits top right and leaves after five seconds');

  // 7. U2-17: the change notice is scoped to the chapters the change touches (unit-level, in the page).
  const scoped = await page.evaluate(async () => {
    const {scopeChangeNotice} = await import('/shell-ux.js');
    const notice = document.createElement('section'); notice.className = 'cr-notice'; document.body.append(notice);
    const p = {changes: {events: [{id: 'CH-1', source: {chapter: 3, id: 'ADR-001', ref: 'ADR-001'}, items: [{chapter: 4, id: 'api', status: 'open'}, {chapter: 5, id: 'c1', status: 'open'}]}]}};
    const out = {};
    for (const ch of [1, 3, 4, 8, 11]) { scopeChangeNotice(p, ch); out[ch] = notice.hidden; }
    notice.remove(); return out;
  });
  assert.equal(scoped[3], false); assert.equal(scoped[11], false); assert.equal(scoped[8], scoped[1]);
  pass('U2-17: the change notice is scoped (source chapter and Chapter 11 always; elsewhere only where affected records are)');

  // 8. U2-18 asked for one meaning per layer switch: "Make layers a Model-tab control or give Work a defined, visible
  //    effect" (audit/round2/05_UI_UX.md). Round 2 gave Work a layer filter; the current shell makes the layers a
  //    Model-tab control (public/app.js layersRail: "They belong to the Model picture ... Record lists and checks retain
  //    their own explicit filters"; the walkthrough in audit/end-to-end/browser/results.json reads "Model layers" on
  //    Model only). So Work offers no layer switch and narrows its records with the register's own search
  //    (public/register-list.js): the rows and a counted status change, the tab and the focus stay, and clearing brings
  //    every record back. On Model the switch hides that layer in the picture, keeps the tab and Show all restores it.
  await page.goto(base + '/?chapter=4&tab=work'); await settle(page);
  assert.equal(await page.$$eval('.journey-rail .rail-layer', bs => bs.length), 0, 'Work offers no layer switch: the layers belong to the Model picture');
  const register = '[data-register-key="logical:responsibilities"]', search = register + ' [data-register-search]';
  const listed = () => page.evaluate(sel => { const r = document.querySelector(sel), status = r.querySelector('[data-register-summary]'); return {summary: status.textContent, role: status.getAttribute('role'), refs: [...r.querySelectorAll('[data-register-rows] article.l-record .eyebrow')].map(e => e.textContent.split(' · ')[0]), focus: document.activeElement?.dataset?.registerSearch || null}; }, register);
  const listedAll = await listed(), count = listedAll.refs.length, one = listedAll.refs.at(-1);
  assert.ok(count > 1, 'the register lists the chapter\'s responsibilities');
  assert.deepEqual({summary: listedAll.summary, role: listedAll.role}, {summary: `Showing ${count} of ${count} responsibilities.`, role: 'status'}, 'the register counts what it shows, in a status');
  await page.fill(search, one); await page.waitForFunction(sel => document.querySelector(sel).textContent === 'Showing 1 of 1 responsibilities.', register + ' [data-register-summary]');
  assert.deepEqual(await listed(), {summary: 'Showing 1 of 1 responsibilities.', role: 'status', refs: [one], focus: 'logical:responsibilities'}, 'the search narrows the records on the surface, says so in its status and keeps the focus');
  assert.match(page.url(), /tab=work/, 'the tab is kept');
  await page.fill(search, ''); await page.waitForFunction(([sel, n]) => document.querySelectorAll(sel).length === n, [register + ' [data-register-rows] article.l-record', count]);
  assert.deepEqual(await listed(), {...listedAll, focus: 'logical:responsibilities'}, 'clearing the search shows every record again');
  // On Model: Chapter 4 arrives on its own first view (instrument-tray.js defaultView, round 11: "its default view ·
  // Diagram · its other views"), so the Diagram is chosen; there, since rc38 (audit/rc39/merge-notes/W2.md step 2: "the
  // sidebar's per-layer buttons left in rc38"), the rail names the picture and what the layers hide and opens the view's
  // Visibility menu, where the logical layer is a checkbox and "Show every layer" restores them all. The switch and
  // Show all are read there, the rail's line and the picture as before.
  const layerFilter = '.journey-rail .model-layers [data-action="model-layer-filter"]', layerBox = '.nt-pop input[data-nt="layer"][data-id="logical"]';
  const picture = async () => { if (!(await page.$(layerBox))) { await page.click(layerFilter); await page.waitForSelector(layerBox); } return page.evaluate(sel => ({pressed: String(document.querySelector(sel).checked), hint: document.querySelector('.journey-rail .rail-view-hint').textContent, nodes: document.querySelectorAll('.cm-svg [data-nt-node]').length, tab: new URLSearchParams(location.search).get('tab')}), layerBox); };
  await page.click('.tabs [data-tab="model"]'); await page.waitForSelector('.cm.lr .cm-view[data-id="diagram"]'); await page.click('.cm.lr .cm-view[data-id="diagram"]'); await page.waitForSelector(layerFilter); await page.waitForSelector('.cm-svg [data-nt-node]'); await settle(page, 400);
  assert.equal(await page.$$eval('.journey-rail .rail-layer', bs => bs.length), 0, 'the Diagram\'s layers are in its Visibility menu, not a button each on the rail');
  const shown = await picture();
  assert.deepEqual({...shown, nodes: shown.nodes > 0}, {pressed: 'true', hint: 'Logical application · every layer shown', nodes: true, tab: 'model'}, 'on Model the rail holds the picture\'s layers');
  await page.click(layerBox); await page.waitForFunction(() => /hidden by layers$/.test(document.querySelector('.journey-rail .rail-view-hint')?.textContent || '')); await settle(page, 400);
  const hidden = await picture();
  assert.deepEqual({pressed: hidden.pressed, tab: hidden.tab, fewer: hidden.nodes < shown.nodes}, {pressed: 'false', tab: 'model', fewer: true}, 'the switch hides the layer in the picture and keeps the Model tab');
  assert.match(hidden.hint, /^Logical application · \d+ hidden by layers$/, 'the rail says what the layers hide');
  await page.click('.nt-pop [data-nt="layers-all"]'); await page.waitForFunction(() => /every layer shown$/.test(document.querySelector('.journey-rail .rail-view-hint')?.textContent || '')); await settle(page, 400);
  assert.deepEqual(await picture(), shown, 'Show all restores the picture');
  await page.keyboard.press('Escape'); await page.waitForFunction(sel => !document.querySelector(sel), layerBox);
  pass('U2-18: the layer switches are a Model-tab control: Work offers none and its register search narrows the records with a counted status, keeps the tab and the focus and clears to the full list; on Model a switch hides its layer in the picture, keeps the tab, and Show all restores it');

  // 9. Round 5 (R5-C), replacing U2-19: a perspective is one of the chapter's views, not a world of its own. Chapter 4's
  //    switcher lists Perspectives after its own and the shared views; one chosen there draws in the chapter model's
  //    frame (the stage and the companion column where the Diagram has them), adds no history entry, no explore= and no
  //    explorer body class, and Back from it is Back from a view: to the Work tab the Model was opened from. An old
  //    address with explore=1 (the retired "Explore all perspectives") opens the chapter's Diagram.
  await page.goto(base + '/?chapter=4&tab=work'); await settle(page);
  await page.click('.tabs [data-tab="model"]'); await page.waitForSelector('.cm.lr .pv-pick'); await settle(page);
  assert.ok(!(await page.$('[data-lr="explore"], .am-explorer, .am-toolbar')), 'no "Explore all perspectives" and no explorer canvas');
  // The switcher's order since round 11's instrument tray (instrument-tray.js: the chapter's default view, then the Diagram,
  // its other views and the shared ones; model-views-browser §2c "offers the Diagram second"), where the pin had the Diagram first.
  assert.deepEqual(await page.$$eval('.cm.lr .cm-views > .cm-view', bs => bs.map(b => b.dataset.id)), ['map', 'diagram', 'coverage', 'layers', 'table', 'cross', 'whole'], 'the chapter\'s own and the shared views come first');
  await page.click('.cm.lr .cm-view[data-id="diagram"]'); await settle(page, 400);
  // The frames are compared with the Details column open on both: the perspective's form, asked for, opens it (rc41
  // close), and on the Diagram nothing held opens it by itself (rc41 close strip C4), so the toolbar opens it there.
  const frame = () => page.evaluate(() => { const r = s => { const b = document.querySelector(s)?.getBoundingClientRect(); return b ? [Math.round(b.x), Math.round(b.width)] : null; }; return {model: r('.studio > .stage > .cm'), stage: r('.studio .cm-stage'), companion: r('#inspector'), panel: document.body.dataset.panel}; });
  if (await page.evaluate(() => document.body.dataset.panel) !== 'open') { await page.locator('[data-panel-toggle]:not(.panel-dismiss):visible').first().click(); await page.waitForFunction(() => document.body.dataset.panel === 'open'); await settle(page, 400); }
  const diagramFrame = await frame(), entries = await page.evaluate(() => history.length);
  assert.ok(diagramFrame.panel === 'open' && diagramFrame.companion?.[1] > 0, 'the Diagram\'s companion column is open: ' + JSON.stringify(diagramFrame));
  await page.click('.cm.lr .pv-pick > summary'); await page.click('.cm.lr .pv-pick [data-pv="new"]'); await page.waitForSelector('.studio .cm.pv .cm-svg [data-nt-node]'); await settle(page, 400);
  assert.deepEqual(await frame(), diagramFrame, 'the perspective keeps the Diagram\'s frame: the model, its stage and the companion column');
  assert.ok(await page.$('#inspector .cm-companion [data-pv-form]'), 'its concern and scope are a form in the companion');
  assert.equal(await page.evaluate(() => history.length), entries, 'choosing a perspective adds no history entry');
  assert.doesNotMatch(page.url(), /explore=/);
  assert.equal(await page.evaluate(() => document.body.classList.contains('am-active')), false, 'no explorer body class');
  await page.goBack(); await page.waitForFunction(() => new URLSearchParams(location.search).get('tab') === 'work'); await settle(page, 400);
  assert.ok(!(await page.$('.studio .cm.pv')), 'Back leaves the perspective as it leaves any view');
  await page.goto(base + '/?chapter=6&tab=model&explore=1'); await page.waitForSelector('.cm.pf .cm-view[aria-pressed="true"]'); await settle(page);
  assert.deepEqual(await page.evaluate(() => ({view: document.querySelector('.cm.pf .cm-view[aria-pressed="true"]')?.dataset.id, explore: new URLSearchParams(location.search).get('explore'), perspective: !!document.querySelector('.studio .cm.pv')})), {view: 'diagram', explore: null, perspective: false}, 'an old explore=1 address opens the chapter\'s Diagram');
  pass('round 5 R5-C: Perspectives are entries of Chapter 4\'s switcher; a perspective keeps the Diagram\'s frame, adds no history entry, no explore= and no explorer body class; Back from it is Back from a view; explore=1 opens the Diagram'); 

  // 9b. Round 4 A, in the one picture world (round 5, R5-C): the Model tab's own parameters route in place. A perspective
  //     composed and saved in Chapter 10's switcher (New perspective…, another concern than the chapter's own), then
  //     chosen from Chapter 4's switcher, opens Chapter 10 on that perspective in the same document, with the address
  //     carrying modelView= so a reload lands on it; a chapter model's view named by a route (model=whole) is selected in
  //     place on a model already drawn, kept in the address, and dropped once the person picks another view.
  {
    const {ctx, page: p} = await context();
    const choose = async (root, which) => { await p.click(`${root} .pv-pick > summary`); await p.click(`${root} .pv-pick ${which}`); };
    await p.goto(base + '/?chapter=10&tab=model'); await p.waitForSelector('.cm.dp .pv-pick'); await settle(p);
    await choose('.cm.dp', '[data-pv="new"]'); await p.waitForSelector('#inspector [data-pv-form]'); await settle(p, 400);
    const usual = await p.$eval('#inspector [data-pv-field="concern"]', el => el.value), other = await p.$eval('#inspector [data-pv-field="concern"]', el => [...el.options].map(o => o.value).find(v => v !== el.value));
    await p.selectOption('#inspector [data-pv-field="concern"]', other); await settle(p, 400);
    await p.fill('#inspector [data-pv-field="title"]', 'Runtime perspective'); await p.click('#inspector [data-pv-form] button[type="submit"]');
    await p.waitForFunction(() => (window.aiwProjectStore.value.document.workbench?.views || []).some(v => v.title === 'Runtime perspective')); await settle(p, 400);
    const saved = await p.evaluate(() => { const v = window.aiwProjectStore.value.document.workbench.views.find(v => v.title === 'Runtime perspective'); return {id: v.id, concern: v.exploration?.concern}; });
    assert.notEqual(saved.concern, usual, 'the saved perspective is not Chapter 10\'s usual one');
    await p.click('a.chapter-item[data-chapter="4"]'); await p.waitForSelector('.cm.lr .pv-pick'); await settle(p);
    assert.ok(await p.$(`.cm.lr .pv-pick [data-pv="open"][data-id="${saved.id}"]`), 'Chapter 4\'s switcher lists the perspective saved in Chapter 10');
    const origin = await p.evaluate(() => { window.__aiwOneDocument = 'saved-view'; return performance.timeOrigin; });
    let viewLoads = 0; p.on('load', () => viewLoads++);
    await choose('.cm.lr', `[data-pv="open"][data-id="${saved.id}"]`);
    await p.waitForFunction(() => new URLSearchParams(location.search).get('chapter') === '10' && window.aiwExplorationContext?.chapter === 10, null, {timeout: 20000}); await settle(p);
    const shown = () => p.evaluate(() => { const q = new URLSearchParams(location.search); return {marker: window.__aiwOneDocument ?? null, origin: performance.timeOrigin, navigations: performance.getEntriesByType('navigation').length, chapter: q.get('chapter'), tab: q.get('tab'), modelView: q.get('modelView'), concern: window.aiwExplorationContext?.concern, perspective: !!document.querySelector('.studio .cm.pv') && !document.body.classList.contains('am-active')}; });
    assert.deepEqual(await shown(), {marker: 'saved-view', origin, navigations: 1, chapter: '10', tab: 'model', modelView: saved.id, concern: saved.concern, perspective: true}, 'the saved perspective opens Chapter 10 on it, in the same document, and the address carries it');
    assert.equal(viewLoads, 0, 'no document loaded');
    await p.reload(); await p.waitForFunction(() => window.aiwExplorationContext?.chapter === 10, null, {timeout: 20000}); await settle(p);
    const reloaded = await shown();
    assert.deepEqual({chapter: reloaded.chapter, modelView: reloaded.modelView, concern: reloaded.concern, perspective: reloaded.perspective}, {chapter: '10', modelView: saved.id, concern: saved.concern, perspective: true}, 'a reload lands on the same perspective');
    await p.goto(base + '/?chapter=5&tab=model'); await p.waitForSelector('.cm .cm-view[aria-pressed="true"]'); await settle(p);
    await p.click('.tabs [data-tab="work"]'); await settle(p, 400);
    await p.evaluate(() => { window.__aiwOneDocument = 'model-view'; window.aiwRoute('/?chapter=5&tab=model&model=whole'); });
    await p.waitForSelector('.cm .cm-view[data-id="whole"][aria-pressed="true"]', {timeout: 20000}); await settle(p);
    const picture = () => p.evaluate(() => ({marker: window.__aiwOneDocument ?? null, view: document.querySelector('.cm .cm-view[aria-pressed="true"]')?.dataset.id, model: new URLSearchParams(location.search).get('model')}));
    assert.deepEqual(await picture(), {marker: 'model-view', view: 'whole', model: 'whole'}, 'model=whole selects the Whole design in place and stays in the address');
    // Since the owner's rc38 shell the address follows the picture (app.js aiwSetModelLayers, imported in f6fdb02: "The
    // picture now shows another view than the address names: the address follows the picture"), where it used to drop
    // model=: another view names itself there, and a reload lands on it.
    await p.click('.cm .cm-view[data-id="layers"]'); await settle(p);
    assert.deepEqual(await picture(), {marker: 'model-view', view: 'layers', model: 'layers'}, 'another view takes model= in the address');
    await p.reload(); await p.waitForSelector('.cm .cm-view[data-id="layers"][aria-pressed="true"]', {timeout: 20000}); await settle(p);
    assert.deepEqual(await picture(), {marker: null, view: 'layers', model: 'layers'}, 'a reload lands on the view the address names');
    await ctx.close();
  }
  pass('round 4 A / round 5 R5-C: a perspective saved in Chapter 10 and chosen from Chapter 4\'s switcher opens in place on that perspective with modelView= in the address, and a reload lands on it; model=whole selects the Whole design in place on a model already drawn, and the address follows to another view chosen, where a reload lands');

  // 9c. Round 5 (R5-C): the process is authored where it is drawn. In a Process perspective (Chapter 4 → New perspective…
  //     → Concern: Process) the companion chooses the scenario the picture traces and, by keyboard, adds a process object
  //     through the shell's dialog, reviewed in the dialog before it applies; the new object is drawn and selected, and its
  //     companion removes it the same way. "You are here" names the perspective on screen. Chapter 11's architecture case
  //     carries the settlement investigation (the payment followed through Chapters 4–11, the approaches compared), and its
  //     "Trace the pending outcome" opens Chapter 1's Diagram in place, the journey drawn as a process with the uncertain
  //     scenario traced, the pending outcome selected and the same authoring in its companion.
  {
    const {ctx, page: p} = await context();
    await p.goto(base + '/?chapter=4&tab=model'); await p.waitForSelector('.cm.lr .pv-pick'); await settle(p);
    await p.click('.cm.lr .pv-pick > summary'); await p.click('.cm.lr .pv-pick [data-pv="new"]'); await p.waitForSelector('#inspector [data-pv-form]'); await settle(p, 400);
    await p.selectOption('#inspector [data-pv-field="concern"]', 'process'); await p.waitForSelector('#inspector .pe-guide'); await settle(p, 400);
    await p.click('#inspector .pe-scenarios [data-pe="scenario"][data-id="uncertain"]'); await settle(p, 300);
    const traced = () => p.evaluate(() => ({tracing: !!document.querySelector('.studio .cm-svg.pe-tracing'), flows: document.querySelectorAll('.studio .cm-svg g.nt-edge.pe-on').length, scenario: document.querySelector('#inspector .pe-scenarios [aria-pressed="true"]')?.dataset.id || null}));
    assert.deepEqual(await traced(), {tracing: true, flows: 7, scenario: 'uncertain'}, 'the chosen scenario is traced on the picture: its seven flows');
    await p.fill('#inspector [data-pv-field="title"]', 'Payment process'); await p.click('#inspector [data-pv-form] button[type="submit"]');
    await p.waitForFunction(() => document.querySelector('.studio .cm.pv .pv-title')?.textContent === 'Payment process'); await settle(p, 600);
    assert.match(await p.$eval('#yah-text', e => e.textContent), /Model · Payment process$/, '"You are here" names the perspective on screen');
    const drawn = () => p.$$eval('.studio .cm.pv .cm-svg g[data-nt-node]', g => g.length), before = await drawn();
    const review = async () => { await p.waitForSelector('dialog[open] [data-dialog-review] [data-reviewed]'); assert.equal(await p.evaluate(() => document.activeElement?.hasAttribute('data-reviewed')), true, 'the review in the dialog takes the keyboard to its acknowledgement'); await p.keyboard.press('Space'); await p.click('dialog[open] [data-wb-action="apply-preview"]'); };
    await p.focus('#inspector .pe-guide [data-pe="new"]'); await p.keyboard.press('Enter');
    await p.waitForSelector('dialog[open] select[name="kind"]'); await settle(p, 200);
    assert.equal(await p.evaluate(() => document.activeElement?.name), 'kind', 'the shell\'s dialog opens with the keyboard on its first field');
    await p.selectOption('dialog[open] select[name="kind"]', 'event'); await p.fill('dialog[open] input[name="title"]', 'Outcome confirmed by enquiry'); await p.fill('dialog[open] input[name="lane"]', 'Payments');
    await p.press('dialog[open] input[name="title"]', 'Enter'); await review();
    await p.waitForFunction(() => !document.querySelector('dialog[open]') && (window.aiwProjectStore.value.document.processModel?.elements || []).length === 1, null, {timeout: 20000}); await settle(p, 600);
    const added = await p.evaluate(() => window.aiwProjectStore.value.document.processModel.elements[0].id);
    assert.equal(await drawn(), before + 1, 'the new process object is drawn');
    assert.ok(await p.$(`.studio .cm.pv .cm-svg g[data-nt-node="${added}"].sel`), 'and selected, its companion reading it');
    await p.click(`#inspector .pe-details [data-pe="remove"][data-id="${added}"]`); await p.waitForSelector('dialog[open] form button[type="submit"]');
    // Round 12 (GR-GOV-24): a process object leaves the design through the one retire path, with why (restorable).
    await p.fill('dialog[open] form [name="reason"]', 'Added by the shell suite; not part of the design.');
    await p.click('dialog[open] form button[type="submit"]'); await review();
    await p.waitForFunction(() => !document.querySelector('dialog[open]') && !(window.aiwProjectStore.value.document.processModel?.elements || []).length, null, {timeout: 20000}); await settle(p, 600);
    assert.equal(await drawn(), before, 'removed through the same review');
    await p.goto(base + '/?chapter=11&tab=work'); await p.waitForSelector('[data-rv-action="stage"][data-rv-stage="case"]'); await settle(p);
    await p.click('[data-rv-action="stage"][data-rv-stage="case"]'); await p.waitForSelector('[data-rv-action="settle-start"]'); await p.click('[data-rv-action="settle-start"]');
    await p.waitForSelector('.ac-settle-stages'); await settle(p, 300);
    assert.equal(await p.$$eval('[data-rv-action="settle-stage"]', b => b.length), 8, 'the payment is followed through Chapters 4–11');
    await p.click('[data-rv-action="settle-stage"][data-rv-id="8"]'); await settle(p, 300);
    assert.match(await p.$eval('.ac-settle-here', e => e.textContent), /Chapter 8 · What does the external contract promise\?/);
    await p.click('[data-rv-action="settle-compare"]'); await p.click('[data-rv-action="settle-option"]:not(.ac-unsafe)'); await settle(p, 300);
    assert.ok(await p.$('[data-rv-action="settle-policy"]'), 'enquiry before replay offers the reviewable contract change');
    const origin = await p.evaluate(() => { window.__aiwOneDocument = 'trace'; return performance.timeOrigin; });
    await p.click('[data-rv-action="settle-trace"]');
    await p.waitForSelector('.studio .cm.sm .cm-svg g[data-nt-node="PROC-REF-PENDING"].sel', {timeout: 20000}); await settle(p, 600);
    assert.deepEqual(await p.evaluate(() => ({marker: window.__aiwOneDocument ?? null, origin: performance.timeOrigin, chapter: new URLSearchParams(location.search).get('chapter')})), {marker: 'trace', origin, chapter: '1'}, 'the trace opens Chapter 1 in the same document');
    assert.deepEqual(await traced(), {tracing: true, flows: 7, scenario: 'uncertain'}, 'Chapter 1\'s Diagram traces the uncertain settlement');
    assert.ok(await p.$('#inspector .pe-details [data-pe="claim"][data-subject="PROC-REF-PENDING"]') && await p.$('#inspector .pe-guide [data-pe="new"]'), 'and its companion carries the same authoring');
    await ctx.close();
  }
  pass('round 5 R5-C: the process is authored where it is drawn — in a Process perspective the scenario is traced on the picture, a process object is added by keyboard through the shell\'s dialog and reviewed in it before it applies, drawn and selected, then removed the same way; "You are here" names the perspective; Chapter 11\'s case follows the settlement investigation through Chapters 4–11 and traces the pending outcome on Chapter 1\'s process, in place');

  // 10. U2-30: the tab bar is a tablist with arrow keys on every chapter; Chapter 1's readiness is named.
  await page.goto(base + '/?chapter=4&tab=work'); await settle(page);
  // Since the owner's rc38 snapshot the Details column carries no head of its own (record-card.js recordDetailContent
  // removes `.inspector-top` and `.r-inspector-head`, f6fdb02): the word is said once, by the toolbar's toggle, and never
  // with the tab. Every visible element whose own text is "Details", or a tab's "… details", is read.
  const detailsNames = () => page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.checkVisibility() && [...e.childNodes].some(n => n.nodeType === 3 && /^\s*details\s*$|\b(work|model|validate|output) details\b/i.test(n.textContent))).map(e => (e.closest('#inspector') ? 'column ' : '') + (e.matches('.workspace-tools [data-panel-toggle]') ? 'toggle' : e.tagName) + ' ' + e.textContent.trim()));
  assert.deepEqual(await detailsNames(), ['toggle Details'], 'Chapter 4 Work: Details is said once, without the tab (round 7)');
  assert.equal(await page.$$eval('#inspector :is(.inspector-top, .r-inspector-head)', x => x.length), 0, 'Chapter 4 Work: no second Details head in the column');
  assert.equal(await page.$eval('.tabs', e => e.getAttribute('role')), 'tablist');
  await page.focus('.tabs [data-tab="work"]'); await page.keyboard.press('ArrowRight');
  assert.match(await focused(page), /BUTTON#tab-model/);
  assert.equal(await page.$eval('#tab-work', e => e.getAttribute('aria-selected')), 'true');
  await page.goto(base + '/?chapter=1&tab=work'); await settle(page);
  assert.deepEqual(await detailsNames(), ['toggle Details'], 'Chapter 1 Work: Details is said once, without the tab (round 7)');
  assert.equal(await page.$$eval('#inspector :is(.inspector-top, .r-inspector-head)', x => x.length), 0, 'Chapter 1 Work: no second Details head in the column');
  assert.equal(await page.$$eval('#inspector .r-kicker', ks => ks.filter(k => /^Chapter \d\d \//.test(k.textContent)).length), 0, 'no chapter-and-tab kicker above the guidance (round 7)');
  assert.equal(await page.$$eval('.r-reference-note', x => x.length), 1, 'the reference note shows once (round 7)');
  await page.click('.r-reference-note [data-r-action="dismiss-reference-note"]'); await settle(page, 300);
  assert.equal(await page.$$eval('.r-reference-note', x => x.length), 0, '"Got it" dismisses it');
  await page.reload(); await settle(page);
  assert.equal(await page.$$eval('.r-reference-note', x => x.length), 0, 'and it stays dismissed for this viewer and project');
  await page.focus('.tabs [data-tab="work"]'); await page.keyboard.press('End');
  assert.match(await focused(page), /BUTTON#tab-output/);
  assert.ok(await page.$('.progress-track[role="progressbar"][aria-label="Chapter 1 milestones met"]'), 'Chapter 1\'s readiness is a named progress bar');
  pass('U2-30: the tab bar is a tablist with one tab stop and arrow, Home and End keys on Chapter 4 and Chapter 1 alike; Chapter 1\'s readiness is a named progress bar');

  // 11. U2-25: "Next" always lands somewhere.
  const fresh = await blankProject(page);
  await page.goto(base + '/?chapter=1&tab=work&project=' + fresh); await settle(page);
  // The next step is the footer's "Next task" since the owner's rc38 shell (app.js footerNextHTML, `.workspace-next`
  // [data-action="next"], as shell-restoration-browser drives it), where the old strip above the stage held it.
  const nextTask = page.locator('.workspace-next[data-action="next"]');
  assert.equal(await nextTask.count(), 1, 'one next task');
  await nextTask.click(); await page.waitForSelector('dialog[open]');
  assert.match(await page.$eval('dialog[open] h2', e => e.textContent), /brief/i, '"Next: Confirm the project brief" opens the brief');
  assert.match(await focused(page), /^(INPUT|TEXTAREA|SELECT)/, 'with the keyboard on its first field');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  pass('U2-25: Chapter 1\'s "Next: Confirm the project brief" opens the brief editor with focus on its first field');

  // 12. U2-28, U2-29: the glossary is in the About dialog on every chapter, and the footer carries the honesty label.
  for (const chapter of [2, 6]) {
    await page.goto(base + `/?chapter=${chapter}&tab=work`); await settle(page);
    assert.match(await page.$eval('.footer', e => e.innerText.replace(/\s+/g, ' ')), /Rule-based guidance · No language model is connected/, `Chapter ${chapter}: the honesty label stays`);
    await page.click('.footer [data-action="about"]'); await page.waitForSelector('.dialog .about-glossary');
    assert.ok((await page.$$eval('.dialog .about-glossary dt', d => d.map(x => x.textContent))).includes('Linked from'), `Chapter ${chapter}'s About has the glossary`);
    await page.keyboard.press('Escape');
  }
  pass('U2-28/U2-29: the glossary (with plain names for lens, backlinks and ghost) is in the About dialog of Chapters 1–3 and 4–11 alike; the footer says what produces the guidance, with the rule-based label');

  // 12b. Round 5, Contract G: one guidance voice per screen. The heading and its subtitle carry the guidance; the
  //      breadcrumb is the heading's alone; the arrival toast names the chapter and nothing more; "What comes next" is
  //      one line with one action (the strip on Work, Validate and Output, the bar's Next on Model); the assistance chip
  //      shows only when its fact repeats no word of the heading or subtitle beyond the chapter's name; the footer
  //      carries the product, the project once and the connection state. "You are here" names chapter · tab · view and
  //      follows every change of chapter, tab or view without a document load. Text stays 12 px or larger.
  {
    const visible = sel => page.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.checkVisibility({visibilityProperty: true})).length, sel);
    const where = () => page.$eval('#yah-text', e => e.textContent);
    await page.goto(base + '/?chapter=4&tab=work'); await settle(page);
    await page.evaluate(() => { window.__aiwYah = 'one-document'; });
    assert.equal(await visible('.breadcrumb, .journey-status > span, .l-assistance > span:first-child, .r-assistant-bar .r-kicker'), 1, 'the breadcrumb appears once: the heading\'s');
    assert.equal(await visible('.next-strip [data-action="next"], .journey-status [data-action="next-context"]'), 1, 'one "next" action on Work: the strip');
    assert.deepEqual(await page.$eval('.next-strip', e => ({line: e.querySelector('.next-copy').getBoundingClientRect().height < 2 * parseFloat(getComputedStyle(e.querySelector('.next-copy')).lineHeight), actions: e.querySelectorAll('button, a').length})), {line: true, actions: 1}, '"What comes next" is one line with one action');
    const footer = await page.evaluate(() => ({text: document.querySelector('.footer').innerText.replace(/\s+/g, ' ').trim(), name: window.aiwProjectStore.value.document.name}));
    assert.equal(footer.text.split(footer.name).length - 1, 1, 'the footer names the project once: ' + footer.text);
    assert.match(footer.text, /^AIW V5 · .+ Rule-based guidance · No language model is connected · About this workbench$/, 'the footer: the product, the project and the connection state');
    assert.doesNotMatch(footer.text, /pending review/);
    assert.match(await where(), /^Chapter 4 · Logical application · Work\b/);
    await page.click('.tabs [data-tab="model"]'); await page.waitForSelector('.cm .cm-view[aria-pressed="true"]'); await settle(page, 600);
    assert.equal(await visible('[data-chapter-next]'), 1, 'on Model the compact header carries one grounded next focus');
    assert.ok(await page.$eval('[data-chapter-next]', a => a.matches('a[href]') && new URL(a.href).searchParams.has('chapter')), 'the next focus is a navigable canonical chapter route');
    const pressed = await page.$eval('.cm .cm-view[aria-pressed="true"] span', e => e.textContent.trim());
    assert.ok((await where()).startsWith('Chapter 4 · Logical application · Model · ' + pressed), 'the view is the switcher\'s active entry: ' + await where());
    const other = await page.$eval('.cm .cm-view[aria-pressed="false"][data-id="table"], .cm .cm-view[aria-pressed="false"]', e => ({id: e.dataset.id, name: e.querySelector('span')?.textContent.trim()}));
    await page.click(`.cm .cm-view[data-id="${other.id}"]`); await settle(page, 600);
    assert.ok((await where()).startsWith('Chapter 4 · Logical application · Model · ' + other.name), 'a view switch is followed: ' + await where());
    await page.click('.tabs [data-tab="validate"]'); await page.waitForSelector('.vx-index'); await settle(page, 500);
    assert.match(await where(), /^Chapter 4 · Logical application · Validate · .+ · by object$/);
    await page.click('.vx-index [data-vx-by="kind"]'); await settle(page, 300);
    assert.match(await where(), / · by kind$/, 'so is the grouping of the findings');
    await page.click('.vx-index [data-vx-by="object"]'); await settle(page, 300);
    await page.click('a.chapter-item[data-chapter="8"]'); await settle(page, 300);
    assert.equal(await page.$eval('#toast', e => e.textContent), 'Chapter 8 · Interfaces & data', 'the arrival toast names the chapter and nothing more');
    await settle(page, 600);
    assert.match(await where(), /^Chapter 8 · Interfaces & data · Validate\b/);
    assert.equal(await page.evaluate(() => window.__aiwYah), 'one-document', 'the line followed every change without a document load');
    const rule = await page.evaluate(async () => { const {chipAddsFact} = await import('/shell-ux.js'); const h = {heading: 'Define the promises between systems.', subtitle: 'Connect contracts, data definitions, and the owners behind each exchange.', chapter: 'Interfaces & data'}; return [chipAddsFact('IF-002 · Define IF-002 contract', h), chipAddsFact('IF-002 · No idempotency key recorded', h), chipAddsFact('Interfaces and data', h)]; });
    assert.deepEqual(rule, [false, true, false], 'the chip rule: a repeated word of the heading or subtitle, or only the chapter\'s name, adds nothing');
    for (const [ch, tab] of [[8, 'validate'], [4, 'work'], [1, 'work']]) {
      await page.goto(base + `/?chapter=${ch}&tab=${tab}`); await settle(page);
      await page.waitForSelector('.brain-brief-chip', {state: 'attached', timeout: 10000});
      const chip = await page.evaluate(async () => { const {chipAddsFact} = await import('/shell-ux.js'); const c = document.querySelector('.brain-brief-chip'), span = c.querySelector(':scope > span'), fact = span.textContent.replace(span.querySelector(':scope > b')?.textContent || '', '').trim(); return {hidden: c.hidden || !c.checkVisibility(), adds: chipAddsFact(fact, {heading: document.querySelector('.heading-row h1').textContent, subtitle: document.querySelector('.heading-row .subtitle').textContent, chapter: document.querySelector('a.chapter-item[aria-current="step"] b').textContent}), fact}; });
      assert.equal(chip.hidden, !chip.adds, `Chapter ${ch} ${tab}: the chip shows only when it adds a fact the heading does not (${chip.fact})`);
    }
    const tiny = await page.evaluate(() => [...document.querySelectorAll('.you-are-here, .you-are-here *, .next-strip *, .footer *, .help-btn')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.checkVisibility() && parseFloat(getComputedStyle(e).fontSize) < 12).length);
    assert.equal(tiny, 0, 'the chrome\'s text is 12 px or larger');
  }
  pass('round 5 Contract G: one guidance voice — the breadcrumb once (the heading\'s), one "next" action (the strip on Work, the bar\'s Next on Model) in one line, the arrival toast "Chapter 8 · Interfaces & data", the assistance chip shown only when its fact repeats no word of the heading or subtitle beyond the chapter\'s name, the footer with the product, the project once and the connection state; "You are here" names chapter · tab · view and follows a view switch, a tab, the grouping and a chapter without a document load');

  // 12c. Round 5, Contract G: the help map. A "?" in the tab bar, reached from the tabs with Tab, opens the chapter × tab
  //      grid (eleven rows, the four tabs, one phrase each, the place on screen marked), with the glossary and the first
  //      steps again; Escape closes it and the keyboard returns to the "?".
  {
    await page.goto(base + '/?chapter=8&tab=validate'); await page.waitForSelector('.vx-index'); await settle(page);
    await page.focus('.tabs .tab.active'); await page.keyboard.press('Tab');
    assert.match(await focused(page), /^BUTTON\.help-btn/, 'the "?" follows the tabs in the focus order');
    await page.keyboard.press('Enter'); await page.waitForSelector('.help-dialog');
    const map = await page.evaluate(() => ({rows: document.querySelectorAll('.help-map tbody tr').length, cells: [...document.querySelectorAll('.help-map tbody tr')].every(r => r.querySelectorAll('td').length === 4), cols: [...document.querySelectorAll('.help-map thead th')].map(t => t.textContent.trim()), here: document.querySelector('.help-map tbody tr.here th')?.textContent.trim(), cell: document.querySelector('.help-map td.here')?.textContent.trim(), inside: !!document.activeElement?.closest('.help-dialog'), modal: document.querySelector('.help-dialog')?.getAttribute('aria-modal'), tiny: [...document.querySelectorAll('.help-dialog *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).length}));
    assert.deepEqual(map, {rows: 11, cells: true, cols: ['Chapter', 'Work', 'Model', 'Validate', 'Output'], here: '08 Interfaces & data', cell: 'The promise at each boundary', inside: true, modal: 'true', tiny: 0});
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    assert.equal(await page.$('.help-dialog'), null, 'Escape closes the help map');
    assert.match(await focused(page), /^BUTTON\.help-btn/, 'and returns the keyboard to the "?"');
    await page.click('.help-btn'); await page.waitForSelector('.help-dialog');
    await page.click('.help-dialog [data-action="help-glossary"]'); await page.waitForSelector('.dialog .about-glossary');
    assert.match(await focused(page), /^H3/, 'the glossary opens at its words');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    assert.match(await focused(page), /^BUTTON\.help-btn/, 'closing the glossary returns to the "?" too');
  }
  pass('round 5 Contract G: the "?" after the tabs opens the help map — 11 chapters by Work, Model, Validate and Output, one phrase each, the place on screen marked — with the glossary; Escape closes it and the keyboard returns to the "?"');

  // 12d. Round 5, Contract G: the first-run coach. Three steps on a project's first open for this viewer — the chapters,
  //      the four tabs, readiness and the draft — each ringing what it names; it never takes the keyboard, lets clicks
  //      through except on its own buttons, goes at a click outside it or Escape, is not shown on a second open, comes
  //      back from the help map, and is shown again on another project's first open.
  {
    const {ctx, page: c} = await context();
    await c.goto(base + '/?chapter=4&tab=work'); await settle(c);
    const coach = () => c.evaluate(() => { const b = document.querySelector('#ux-coach'); return b ? {text: b.innerText.replace(/\s+/g, ' '), ring: [...document.querySelectorAll('.ux-coach-target')].map(e => e.matches('.chapter-nav') ? 'chapters' : e.matches('.tabs') ? 'tabs' : e.matches('[data-chapter-insights-toggle]') ? 'readiness' : e.matches('[data-tab="output"]') ? 'output' : e.className), focus: !!document.activeElement?.closest('#ux-coach'), through: getComputedStyle(b).pointerEvents, tiny: [...b.querySelectorAll('*')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).length} : null; });
    let now = await coach();
    assert.ok(now && /First steps · 1 of 3 .*The chapters/i.test(now.text), 'the first open shows the first step: ' + JSON.stringify(now));
    // Round 26 (R26-W-15, GR-UX-11): the coach sits over free canvas, never over the details column, and on a project whose
    // records await confirmation its first step says where review starts.
    assert.match(now.text, /This project has \d+ records? to confirm in Chapter \d+; review starts on its Work tab\./, 'the first step knows the project');
    const overlap = await c.evaluate(() => { const a = document.querySelector('#ux-coach')?.getBoundingClientRect(), b = document.querySelector('#inspector')?.getBoundingClientRect(); if (!a || !b) return null; return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom); });
    assert.equal(overlap, false, 'the coach does not cover the details column');
    assert.deepEqual({ring: now.ring, focus: now.focus, through: now.through, tiny: now.tiny}, {ring: ['chapters'], focus: false, through: 'none', tiny: 0}, 'it rings the chapters, leaves the keyboard where it was, lets clicks through and keeps 12 px');
    await c.click('#ux-coach [data-coach="next"]'); now = await coach();
    assert.ok(/2 of 3 .*The four tabs/i.test(now.text) && now.ring.join() === 'tabs', 'the four tabs');
    await c.click('#ux-coach [data-coach="next"]'); now = await coach();
    assert.ok(/3 of 3 .*Insights, progress and the draft/i.test(now.text) && now.ring.join() === 'readiness,output', 'visible insights and the draft: ' + now.ring.join());
    await c.click('#ux-coach [data-coach="done"]');
    assert.equal(await coach(), null, 'Done puts it away');
    assert.match(await focused(c), /^BUTTON\.help-btn/, 'and leaves the keyboard on the "?", where it comes back from');
    await c.reload(); await settle(c);
    assert.equal(await coach(), null, 'not on a second open');
    await c.click('.help-btn'); await c.waitForSelector('.help-dialog'); await c.click('.help-dialog [data-action="coach-again"]'); await c.waitForTimeout(200);
    now = await coach();
    assert.ok(now && /1 of 3/i.test(now.text) && now.focus, 'the help map shows it again, with the keyboard on it');
    await c.keyboard.press('Escape'); await c.waitForTimeout(200);
    assert.equal(await coach(), null, 'Escape puts it away');
    assert.match(await focused(c), /^BUTTON\.help-btn/);
    await c.click('.help-btn'); await c.waitForSelector('.help-dialog'); await c.click('.help-dialog [data-action="coach-again"]'); await c.waitForTimeout(200);
    await c.click('.heading-row h1'); await c.waitForTimeout(200);
    assert.equal(await coach(), null, 'a click outside it puts it away');
    await c.goto(base + '/?chapter=2&tab=work&project=' + blank); await settle(c);
    assert.ok(/1 of 3/i.test((await coach())?.text || ''), 'another project\'s first open shows it again');
    await ctx.close();
  }
  pass('round 5 Contract G: the first-run coach — on a project\'s first open, three steps (the chapters, the four tabs, readiness and the draft), each ringing what it names, never taking the keyboard and letting clicks through; Done, Escape and a click outside put it away; not on a second open; back from the help map; again on another project\'s first open');

  // 13. U2-07: Sol makes room in Chapters 1–3 as in 4–11.
  await page.goto(base + '/?chapter=1&tab=work'); await settle(page);
  await page.click('.r-assistant-bar button:has-text("Ask Sol")'); await page.waitForSelector('#brain-panel:not([hidden])'); await page.waitForTimeout(500);
  const room = await page.evaluate(() => ({panel: document.querySelector('#brain-panel').getBoundingClientRect().left, studio: document.querySelector('.studio').getBoundingClientRect().right}));
  assert.ok(room.studio <= room.panel, 'the Chapter 1 workspace ends where Sol begins ' + JSON.stringify(room));
  pass('U2-07: with Sol open, the Chapter 1–3 workspace makes room instead of sitting under the panel');

  // 14. U2-37: the projects dialog fits a 900 px window; no empty template choice.
  await page.goto(base + '/?view=projects'); await settle(page);
  await page.click('#new-project'); await page.waitForSelector('#project-dialog[open]');
  const submit = await page.$eval('#create-submit', e => e.getBoundingClientRect().bottom);
  assert.ok(submit <= 900, 'Create & open Chapter 1 is in view at 900 px: ' + submit);
  assert.equal(await page.$eval('#saved-template', e => e.hidden), true, 'no saved-template select without a saved template');
  pass('U2-37: the create dialog\'s action is in view in a 900 px window and the empty "saved template" choice is hidden');

  // 15. U2-21: no desk text under 12 px.
  await page.goto(base + '/?chapter=11&tab=model'); await page.waitForSelector('.dk-tile'); await settle(page);
  const tiny = await page.evaluate(() => [...document.querySelectorAll('.cm.dk *')].filter(e => !e.closest('svg') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 12).length);
  assert.equal(tiny, 0, 'desk text is at least 12 px');
  pass('U2-21: the review desk has no text under 12 px');

  // 16. U2-34: a save that cannot reach the server says Offline, offers Try again, and the page notices the return.
  await page.goto(base + '/?chapter=1&tab=work'); await settle(page);
  await page.click('[data-r-section="requirement"]'); await page.waitForTimeout(200);
  // rc38's Work frame holds the register: its add button sits in the task head (the snapshot's own
  // requirements-validate.mjs, f6fdb02: `.work-task-head [data-r-action="add"]`), where the old card head held it.
  await page.click('.work-task-head [data-r-action="add"]'); await page.waitForSelector('dialog[open]');
  await page.fill('dialog[open] [name="title"]', 'Keep the payment reference across retries');
  await page.route('**/api/commands**', r => r.abort('internetdisconnected'));
  await page.route('**/api/intelligence/status**', r => r.abort('internetdisconnected'));
  await page.click('dialog[open] button[type="submit"]'); await page.waitForSelector('dialog[open] [data-r-action="retry-submit"]', {timeout: 8000});
  assert.match(await page.$eval('.save-state', e => e.textContent), /^Offline/, 'the header says the workbench is offline');
  assert.equal(await page.$eval('dialog[open] [name="title"]', e => e.value), 'Keep the payment reference across retries', 'the input is kept');
  await page.unroute('**/api/commands**'); await page.unroute('**/api/intelligence/status**');
  await page.waitForFunction(() => /Connected again/.test(document.querySelector('.save-state')?.textContent || ''), null, {timeout: 9000});
  await page.click('dialog[open] [data-r-action="retry-submit"]'); await page.waitForTimeout(900);
  assert.equal(await page.$('dialog[open]'), null, 'Try again saves and closes the editor');
  assert.match(await page.$eval('#toast', e => e.textContent), /saved$/);
  pass('U2-34: a save that cannot reach the server keeps the input, shows Offline in the header and a Try again control; the page notices the server\'s return and Try again saves');

  // 17. U2-20, U2-22, U2-23, U2-24: 768 px toolbars, the phone model default, phone chrome and the phone drawer.
  {
    const {ctx, page: p} = await context({viewport: {width: 768, height: 900}});
    await p.goto(base + '/?chapter=4&tab=model'); await p.waitForSelector('.cm'); await settle(p);
    const bar = await p.evaluate(() => ({labels: [...document.querySelectorAll('.cm-top .cm-view span')].map(s => s.getBoundingClientRect().width > 20), overflow: [...document.querySelectorAll('.cm-top, .cm-bar')].some(e => e.scrollWidth > e.clientWidth + 1)}));
    assert.ok(bar.labels.length >= 3 && bar.labels.every(Boolean), 'the view switches keep their words at 768 px');
    assert.equal(bar.overflow, false, 'the toolbars wrap instead of running off the edge');
    await ctx.close();
  }
  {
    const {ctx, page: p} = await context({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
    await p.goto(base + '/?chapter=4&tab=model'); await p.waitForSelector('.cm'); await settle(p);
    assert.equal(await p.$eval('.cm-view[aria-pressed="true"]', e => e.dataset.id), 'map', 'a phone opens Chapter 4 on the Responsibilities view');
    await p.goto(base + '/?chapter=4&tab=work'); await settle(p);
    assert.ok(await p.$eval('.heading-row', e => e.getBoundingClientRect().height) < 160, 'the phone heading is compact');
    assert.equal(await p.$eval('.progress-disclosure', e => e.open), false, 'readiness folds to its count on a phone');
    await p.click('.mobile-layers'); await p.waitForTimeout(400);
    assert.equal(await p.$eval('.sidebar', e => e.getAttribute('role')), 'dialog', 'the chapter menu is a dialog');
    assert.match(await focused(p), /rail-close/, 'focus moves into it');
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    assert.match(await focused(p), /mobile-layers/, 'Escape returns focus to the Chapters button');
    await p.goto(base + '/?chapter=1&tab=work'); await settle(p);
    await p.click('.mobile-layers'); await p.waitForTimeout(400);
    assert.equal(await p.$eval('.sidebar', e => e.getAttribute('role')), 'dialog', 'Chapter 1 has the same chapter menu');
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    assert.match(await focused(p), /mobile-layers/, 'and returns focus the same way');
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal page scroll');
    await ctx.close();
  }
  pass('U2-20/U2-22/U2-23/U2-24: at 768 px the model toolbars keep their labels and wrap; a phone opens Chapter 4 on the Responsibilities view, folds readiness to its count, and the one chapter menu (Chapter 4 and Chapter 1) is a dialog that takes and returns focus');

  // 18. U2-31: reduced motion reaches the model chrome.
  {
    const {ctx, page: p} = await context({reducedMotion: 'reduce'});
    await p.goto(base + '/?chapter=4&tab=model'); await p.waitForSelector('.cm'); await settle(p);
    const moving = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => getComputedStyle(e).transitionDuration.split(',').some(d => parseFloat(d) > 0) || getComputedStyle(e).animationName !== 'none').length);
    assert.equal(moving, 0, 'nothing on the Chapter 4 model transitions or animates');
    await ctx.close();
  }
  pass('U2-31: with reduced motion requested, no element of the Chapter 4 model chrome transitions or animates');

  // 19. Round 12 (G, GR-UX-16): one chapter-name table (chapter-names.js) serves the shell, the review desk and its
  //     board, the SDD and the chapter reasoning, and Chapter 2 reads "Architectural drivers" everywhere. No other module
  //     keeps a table that names the chapters (a literal naming Chapter 2 by its name), and every reader the screens use
  //     reads the one table.
  {
    const {readdirSync, readFileSync} = await import('node:fs');
    const table = [/\b2\s*:\s*['"](?:Quality|Architectural) drivers['"]/, /\[\s*2\s*,\s*['"](?:Quality|Architectural) drivers['"]/, /['"]Requirements['"]\s*,\s*['"](?:Quality|Architectural) drivers['"]/];
    const copies = [];
    for (const dir of ['public', 'shared']) for (const f of readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'chapter-names.js' && !f.startsWith('vendor'))) { const s = readFileSync(dir + '/' + f, 'utf8'); if (table.some(re => re.test(s))) copies.push(dir + '/' + f); }
    assert.deepEqual(copies, [], 'no module keeps a chapter-name table of its own');
    const {ctx, page: p} = await context();
    await p.goto(base + '/?chapter=2&tab=model'); await settle(p);
    const read = await p.evaluate(async () => {
      const [names, review, reasoning, desk, readiness, journey, shell, anatomy] = await Promise.all(['/chapter-names.js', '/review-domain.js', '/chapter-reasoning.js', '/desk-fixes.js', '/readiness-model.js', '/journey-context.js', '/shell-ux.js', '/anatomy-model.js'].map(u => import(u)));
      return {table: names.CHAPTER_TITLES[2], sdd: review.CHAPTERS.find(c => c.id === 2).title, reasoning: reasoning.CHAPTER_NAMES[2], board: desk.CHAPTER_NAMES[2], readiness: readiness.SHORT[2], journey: journey.journeyChapters[2], help: shell.HELP_MAP.find(r => r[0] === 2)[1], anatomy: anatomy.CHAPTERS.find(r => r[0] === 2)[1],
        sameTable: [1, 3, 4, 5, 6, 7, 8, 9, 10].every(n => review.CHAPTERS.find(c => c.id === n).title === names.CHAPTER_TITLES[n] && journey.journeyChapters[n] === names.CHAPTER_TITLES[n] && desk.CHAPTER_NAMES[n] === names.CHAPTER_TITLES[n])};
    });
    assert.deepEqual(read, {table: 'Architectural drivers', sdd: 'Architectural drivers', reasoning: 'Architectural drivers', board: 'Architectural drivers', readiness: 'Architectural drivers', journey: 'Architectural drivers', help: 'Architectural drivers', anatomy: 'Architectural drivers', sameTable: true}, 'every reader names the chapters from the one table');
    const shellText = await p.evaluate(() => ({heading: document.querySelector('.you-are-here')?.textContent || '', nav: document.querySelector('a.chapter-item[data-chapter="2"]')?.textContent || '', body: document.body.innerText}));
    assert.match(shellText.heading, /Chapter 2 · Architectural drivers/, 'the shell says where you are by the chapter\'s name');
    assert.ok(!/Quality drivers ·|· Quality drivers\b|Chapter 2 · Quality drivers/.test(shellText.body), 'nothing on the Chapter 2 page names the chapter "Quality drivers"');
    await ctx.close();
    const {sddDocument} = await import('./public/sdd-document.js'), {createProject} = await import('./shared/projects-domain.js');
    const md = sddDocument(createProject({name: 'Names', template: 'bank-payment'}, 'ux-shell', '2026-10-08T09:00:00.000Z'), {figures: false}).markdown;
    assert.ok(md.includes('Architectural drivers') && !/Chapter 2 [—·-] Quality drivers|\| 2 · Quality drivers/.test(md), 'the SDD names Chapter 2 "Architectural drivers"');
  }
  pass('GR-UX-16: one chapter-name table serves the shell, the review desk and its board, the SDD, the chapter reasoning, the readiness board, the journey and the help map; no module keeps a copy, and Chapter 2 reads "Architectural drivers" on its page and in the SDD');

  // 20. Round 12 (G, GR-UX-14): no generic surface of a project that is not the payment sample mentions payments, and the
  //     readiness wording follows the one vocabulary (findings "to fix" and "to confirm", never "blocking"). A synthetic
  //     project with generic, payment-free names is walked through every chapter's four tabs (a fresh tab per chapter);
  //     the generic texts no walk opens (the trace review's dialog, the illustrative product options, the default SDD
  //     title, the readiness summary) are read from their modules.
  {
    const {buildFiguresProject} = await import('./figures-at-size-fixture.mjs'), {restoreScaleProject} = await import('./scripts/build-scale-fixture.mjs');
    const built = await buildFiguresProject({counts: {requirements: 60, groups: 6, journeys: 5, actors: 3, drivers: 6, decisions: 6, modules: 4, responsibilities: 8, components: 12, parties: 3, data: 8, contracts: 30, capabilities: 6, threats: 3, controls: 3, zones: 2, placements: 8}, name: 'Generic ledger platform'});
    const neutral = JSON.parse(JSON.stringify(built.document).replace(/Payments/g, 'Transfers').replace(/payments/g, 'transfers'));
    const R = await restoreScaleProject({base, document: neutral, name: 'Generic ledger platform'});
    const said = [];
    for (let ch = 1; ch <= 11; ch++) {
      const {ctx, page: p} = await context();
      for (const tab of ['work', 'model', 'validate', 'output']) {
        await p.goto(`${base}/?chapter=${ch}&tab=${tab}&project=${encodeURIComponent(R.id)}`); await settle(p, 500);
        const text = await p.evaluate(() => document.body.innerText + '\n' + [...document.querySelectorAll('[title],[aria-label]')].map(e => (e.getAttribute('title') || '') + ' ' + (e.getAttribute('aria-label') || '')).join('\n'));
        for (const m of text.matchAll(/[^\n]{0,60}\b(?:payments?|blocking findings?)\b[^\n]{0,60}/gi)) said.push(`Chapter ${ch} ${tab}: ${m[0].trim()}`);
      }
      await ctx.close();
    }
    assert.deepEqual(said, [], 'no surface of a project that is not the payment sample mentions payments or calls a finding blocking');
    const {readFileSync} = await import('node:fs'), {sddReadiness} = await import('./public/readiness-model.js'), {withFinalReview} = await import('./public/review-domain.js');
    const generic = ['public/review-ui.js', 'public/technology-realisation-domain.js', 'public/readiness-model.js', 'public/validate-view.js', 'public/chapter-brief.js', 'public/changes-ui.js', 'public/shell-ux.js'];
    // A word in a text, not the sample's template id ('bank-payment') or the file-name prefix projectFileName replaces.
    const leaks = generic.flatMap(f => readFileSync(f, 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).flatMap(l => [...l.matchAll(/['"`][^'"`]*['"`]/g)].filter(m => /(?<![-_])\bpayments?\b/i.test(m[0])).map(m => f + ': ' + m[0].slice(0, 120))));
    assert.deepEqual(leaks, [], 'the generic modules word their texts for any project');
    const summary = sddReadiness(neutral).summary, narrative = withFinalReview({...structuredClone(neutral), finalReview: undefined}).finalReview.narrative.title;
    assert.ok(!/blocking/i.test(summary) && /to fix|to do|left to fix/.test(summary), `the readiness summary reads in the one vocabulary: ${summary}`);
    assert.equal(narrative, 'Generic ledger platform — Solution Design', 'a design without a narrative is titled by its own name, not the sample\'s');
  }
  pass('GR-UX-14: a project that is not the payment sample, walked through all eleven chapters\' four tabs, never reads "payment" or "blocking findings"; the trace review, the illustrative product options and the default SDD title are worded for any project, and the readiness summary counts findings to fix');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  // Round 26 (D-26-01): each tab says what it is for, in the same words on every chapter, with the glossary a click away.
{
  const {ctx, page: p} = await context();
  await p.goto(base + '/?chapter=2&tab=validate'); await settle(p);
  const purposes = [];
  for (const chapter of [2, 3, 4, 11, 1]) { await p.click(`a.chapter-item[data-chapter="${chapter}"]`); await settle(p, 600); purposes.push(await p.$eval('#tab-purpose', e => e.textContent.replace(/\s+/g, ' ').trim())); }
  assert.equal(new Set(purposes).size, 1, 'the Validate purpose line reads the same on every chapter: ' + JSON.stringify(purposes));
  assert.match(purposes[0], /^Check what is recorded; nothing here approves\.Words used here$/);
  assert.equal(await p.$eval('.tabs', e => e.getAttribute('aria-describedby')), 'tab-purpose');
  assert.ok(await p.$('#tab-purpose [data-action="help-glossary"]'), 'the purpose line links the glossary');
  await p.click('.tabs [data-tab="work"]'); await settle(p, 400);
  assert.match(await p.$eval('#tab-purpose', e => e.textContent), /^Record and connect this chapter’s objects\./);
  await p.click('.tabs [data-tab="model"]'); await settle(p, 600);
  assert.match(await p.$eval('#tab-purpose', e => e.textContent), /^See what you have recorded, as pictures and tables\./);
  await p.click('.tabs [data-tab="output"]'); await settle(p, 400);
  assert.match(await p.$eval('#tab-purpose', e => e.textContent), /^Produce the chapter’s documents and hand it forward\./);
  await p.click('#tab-purpose [data-action="help-glossary"]'); await settle(p, 400);
  assert.ok(await p.$('.dialog .about-glossary'), 'Words used here opens the glossary');
  pass('tab purpose lines (round 26, D-26-01)');
  await ctx.close();
}

await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'One shell (round 3 A) and its UI/UX, round 2 (rendered)', passed: checks.length, checks}, null, 2));
