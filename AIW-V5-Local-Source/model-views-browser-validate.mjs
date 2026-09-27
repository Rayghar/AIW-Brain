// Rendered checks for the Chapter 4–8 model views (v20.5): the room the canvas has, the footer's tools
// and status, the companion's names, the keys, the keyboard, the phone, a blank project's empty states,
// the loading placeholder, and the server's revalidation and preloading.
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
const db = '.aiw-local/model-views-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => checks.push(n);
const wait = ms => new Promise(r => setTimeout(r, ms));
try {
  // 1. The server revalidates instead of re-sending, lists a module's closure, and preloads the page's own.
  const first = await fetch(base + '/model-stage.js'), etag = first.headers.get('etag');
  assert.equal(first.status, 200); assert.ok(etag && /^"/.test(etag), 'a static file carries an ETag');
  assert.equal(first.headers.get('cache-control'), 'no-cache', 'and asks to be revalidated, not re-sent');
  const again = await fetch(base + '/model-stage.js', {headers: {'If-None-Match': etag}});
  assert.equal(again.status, 304, 'an unchanged file is not sent again');
  const graph = await (await fetch(base + '/local/module-graph?entry=realise-view.js')).json();
  assert.ok(Array.isArray(graph) && graph.includes('realise-view.js') && graph.includes('model-stage.js') && graph.includes('realise-model.js') && graph.length > 20, 'the closure of a chapter view lists its whole import chain');
  assert.equal((await fetch(base + '/local/module-graph?entry=../server.js')).status, 404, 'only a module name under public/');
  const html = await (await fetch(base + '/')).text();
  const preloads = html.match(/<link rel="modulepreload" href="\/[a-z0-9-]+\.js">/g) || [];
  assert.ok(preloads.length >= 40 && preloads.some(l => l.includes('/entry.js')), 'the page preloads its own closure: ' + preloads.length);
  pass('static files are revalidated with an ETag and no-cache (304 when unchanged), a chapter view’s import closure is listed, and the page preloads its own');

  // 2. While a chapter model loads, its frame says so.
  const slow = await browser.newContext({viewport: {width: 1440, height: 900}});
  const ps = await slow.newPage(); ps.on('pageerror', e => errors.push(e.message));
  await ps.route('**/realise-view.js', async route => { await wait(1500); await route.continue(); });
  await ps.goto(base + '/?chapter=5&tab=model', {waitUntil: 'commit'});
  await ps.waitForSelector('.cm-loading', {timeout: 15000});
  assert.match(await ps.$eval('.cm-loading', e => e.textContent), /Preparing the Chapter 5 model/);
  assert.equal(await ps.$eval('.cm-loading', e => e.getAttribute('aria-busy')), 'true');
  await ps.waitForSelector('.cm.rz .rz-card', {timeout: 15000}); await wait(300);
  assert.equal(await ps.$('.cm-loading'), null, 'the placeholder leaves when the model mounts');
  await slow.close();
  pass('while a chapter model’s modules load, the stage shows “Preparing the Chapter 5 model…” in the model’s frame, and it leaves when the model mounts');

  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const open = async (ch, extra = '') => { await page.goto(base + '/?chapter=' + ch + '&tab=model' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-stage', {timeout: 10000}); await page.waitForTimeout(400); };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(250); };
  const count = async sel => (await page.$$(sel)).length;
  const objectParam = () => page.evaluate(() => new URL(location.href).searchParams.get('object'));
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' '));
  const rect = sel => page.$eval(sel, e => { const r = e.getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right}; });

  // 3. Chapter 5: the tools and the status live in the footer, off the canvas; the companion says what it does.
  await open(5);
  assert.ok(await page.$('.cm-walk .cm-tools .cm-key') && await page.$('.cm-walk .cm-tools .cm-zoom'), 'key and zoom sit in the footer');
  assert.equal(await count('.cm-stage .cm-key, .cm-stage .cm-zoom'), 0, 'and nothing of them over the canvas');
  const st = await page.$eval('.cm-walk .cm-state', e => ({text: e.textContent, clipped: e.scrollHeight > e.clientHeight + 2}));
  assert.match(st.text, /5 components in 3 modules/); assert.equal(st.clipped, false, 'the status is not truncated');
  const stage = await rect('.cm-stage'), topBar = await rect('.cm-top');
  assert.ok(stage.h >= 520, 'the canvas has room: ' + Math.round(stage.h)); assert.ok(topBar.h <= 56, 'the title row is one line: ' + Math.round(topBar.h));
  assert.equal(await page.$eval('[data-rz="panel"]', e => e.getAttribute('aria-label')), 'Hide the companion panel');
  await click('[data-rz="panel"]');
  assert.match(await page.$eval('[data-rz="panel"]', e => e.getAttribute('aria-label')), /^Show the companion panel · \d+ observations?$/, 'closed, it says what waits behind it');
  assert.ok(await page.$('[data-rz="panel"] .cm-badge'));
  await click('[data-rz="panel"]');
  assert.equal(await page.$eval('[data-rz="panel"]', e => e.getAttribute('aria-label')), 'Hide the companion panel');
  pass('Chapter 5: the key and zoom are in the footer, never over the canvas; the status line is whole; the canvas keeps its room; the companion toggle says Hide or Show with how many observations wait');

  // 4. The key opens above the footer, complete, and closes.
  await click('[data-rz="key"]');
  const legend = await page.$eval('.cm-legend', e => ({text: e.innerText, r: e.getBoundingClientRect()}));
  assert.ok(legend.r.height > 100 && legend.r.bottom <= (await rect('.cm-walk')).y + 2 && legend.r.top >= 0, 'the key opens above the footer, inside the window');
  for (const k of ['Data dependency', 'Proposed component, not saved', 'candidates still open', 'Contract with the outside', 'Interaction without a failure policy']) assert.ok(legend.text.includes(k), 'the key explains: ' + k);
  await click('[data-rz="key"]');
  assert.equal(await page.$eval('.cm-legend', e => getComputedStyle(e).display), 'none');
  pass('the key opens above the footer, explains every mark the Chapter 5 model draws, and closes');

  // 5. Everything selectable is reachable with the keyboard, and every selection reaches the address.
  assert.ok(await count('button.cm-chip.rz-r') >= 5 && await count('button.cm-chip.cm-d') >= 1 && await count('button.cm-chip.rz-n') >= 5, 'chips are buttons');
  await page.focus('.rz-card[data-card="risk-engine"] button.cm-chip.rz-r'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  assert.match(await page.$eval('.cm-panel .cm-spec', e => e.textContent), /Responsibility · Chapter 4[\s\S]*Risk screening/);
  assert.equal(await objectParam(), 'risk', 'the chip’s selection is in the address');
  await page.focus('.rz-card[data-card="risk-engine"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  assert.equal(await objectParam(), 'risk-engine', 'Enter on a card selects it');
  assert.equal(await page.$eval('.rz-card[data-card="risk-engine"]', e => e.getAttribute('role')), 'group');
  assert.match(await page.$eval('.rz-card[data-card="risk-engine"]', e => e.getAttribute('aria-label')), /Selected; press Enter to focus on it/);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.card), 'risk-engine', 'the redraw keeps the keyboard on the card');
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  assert.match(await crumbs(), /› Risk engine$/, 'Enter on the selected card focuses on it');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // A selection made by the page, not by a click, reaches the address too.
  await open(5, '&object=core-adapter');
  assert.equal(await objectParam(), 'core-adapter'); assert.ok(await page.$('.rz-card.sel[data-card="core-adapter"]'));
  await click('.cm-stage'); await page.waitForTimeout(200);
  assert.equal(await objectParam(), null, 'deselecting clears it');
  pass('chips are buttons: Enter on a responsibility chip selects it, Enter on a card selects then focuses on it, cards are groups that say what Enter does, and every selection is in the address');

  // 6. Sol, not connected, stands last in the companion and says so; a selection has Sol's own section.
  const sol = await page.$eval('.cm-panel', p => { const lite = p.querySelector(':scope > .cs-round.lite[data-sol-unconnected]'), tops = [...p.children].map(c => c.getBoundingClientRect().top); return lite ? {text: lite.innerText, last: lite.getBoundingClientRect().top >= Math.max(...tops), ins: !!p.querySelector('.cm-ins')} : null; });
  assert.ok(sol, 'Sol’s round is present while nothing is selected'); assert.match(sol.text, /Sol is not connected in this workspace/); assert.equal(sol.last, true, 'and it stands last'); assert.equal(sol.ins, true, 'after what the model shows');
  await click('.rz-card[data-card="risk-engine"] .rz-t');
  assert.ok(await page.$('.cm-panel [data-sol-explain], .cm-panel [data-sol-drawn], .cm-panel .dk-solask, .cm-panel .dk-solagain'), 'with a selection, Sol’s section is about the selection');
  assert.equal(await page.$('.cm-panel .cs-round'), null, 'and the round steps aside');
  pass('with no AI key, Sol’s round says it is not connected and stands last in the companion, after what the model shows; a selection has Sol’s own section instead');

  // 7. The edges say where more of the model is, and move there.
  for (let i = 0; i < 5; i++) await click('[data-rz="zin"]');
  const more = await page.$eval('.cm-stage', e => [...e.classList].filter(c => c.startsWith('cm-more-')));
  assert.ok(more.length >= 1, 'zoomed in, an edge says there is more: ' + more.join(','));
  const edge = more[0].replace('cm-more-', '');
  assert.notEqual(await page.$eval('.cm-edge-' + edge, e => getComputedStyle(e).display), 'none');
  const before = await page.$eval('.cm-world', e => e.style.transform);
  await click('.cm-edge-' + edge);
  assert.notEqual(await page.$eval('.cm-world', e => e.style.transform), before, 'the edge moves the camera');
  await click('[data-rz="fit"]');
  pass('zoomed in, the stage’s edges show where more of the model lies, and one click moves there');

  // 8. Chapter 4: chips, groups, the key, and flows on one label.
  await open(4);
  assert.equal(await count('.lr-card.resp button.cm-chip.lr-c'), 5, 'the components a responsibility is realised by are buttons');
  assert.ok(await count('.lr-card.resp[role="group"]') >= 5);
  await page.focus('button.cm-chip.lr-c'); const want = await page.$eval('button.cm-chip.lr-c', e => e.dataset.sel); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  assert.equal(await objectParam(), want, 'a component chip selects the component');
  assert.ok(await page.$('.cm-panel .cm-spec'));
  await click('[data-lr="key"]');
  const lk = await page.$eval('.cm-legend', e => e.innerText);
  for (const k of ['Steps nobody owns', 'Proposed, not saved', 'Changed by the open proposal', 'Realises it (Chapter 5)', 'Requirement and decision behind it']) assert.ok(lk.includes(k), 'the Chapter 4 key explains: ' + k);
  await click('[data-lr="key"]');
  assert.match(await page.$eval('.cm-walk .cm-state', e => e.textContent), /5 responsibilities in 3 groups/);
  pass('Chapter 4: component chips are buttons that select with Enter, cards are groups, the key explains unowned steps, proposals and changes, and the status line stands in the footer');

  // 9. Chapter 7: a family opens on its heading, and the options share the width.
  await open(7);
  const fam = await page.$eval('button.sk-mg[data-sk="family"]', e => e.textContent.trim());
  await click('button.sk-mg[data-sk="family"]');
  const here = await page.$eval('.cm-crumbs .here', e => e.textContent.trim());
  assert.ok(here && here !== 'Whole stack' && fam.startsWith(here), 'the family heading opens the family: ' + here + ' / ' + fam);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await click('.cm-rail .sk-rec[data-sel]');
  await click('[data-sk="view"][data-id="options"]');
  const oh = await rect('.sk-oh');
  assert.ok(oh.w > 196, 'the option columns widen to the stage: ' + Math.round(oh.w));
  assert.equal(await count('.cm-stage .cm-key'), 0);
  pass('Chapter 7: a family opens from its heading, and the options matrix widens its columns to the stage it has');

  // 10. Chapter 6: the key follows the lens and the failure explored.
  await open(6);
  await click('[data-pf="key"]');
  let pk = await page.$eval('.cm-legend', e => e.innerText);
  assert.ok(pk.includes('Nothing recorded supports these needs') && pk.includes('tinted by its family'), 'the platform key');
  await click('[data-pf="lens"][data-id="operation"]');
  pk = await page.$eval('.cm-legend', e => e.innerText);
  assert.ok(pk.includes('Single path') && pk.includes('Redundant'), 'the Operation lens explains its plates');
  await click('.pf-fail[data-id="gateway"]'); await page.waitForTimeout(300);
  pk = await page.$eval('.cm-legend', e => e.innerText);
  assert.ok(pk.includes('Lost: the failure reaches it') && pk.includes('Stops: an essential need is lost'), 'what fails together is in the key');
  pass('Chapter 6: the key explains the plates of the lens in use and, while a failure is explored, what lost, degraded and stopped look like');

  // 11. Chapter 8: the key is complete, data chips are buttons, and short labels carry the reference.
  await open(8);
  await click('[data-cm="key"]');
  const ek = await page.$eval('.cm-legend', e => e.innerText);
  assert.ok(ek.includes('Answer that never arrives') && ek.includes('a contract is missing') && ek.includes('Data sent without a recorded source'), 'the sequence key');
  await click('[data-cm="key"]');
  const short = await page.$$eval('.cm-mvl', ls => ls.filter(l => l.getBoundingClientRect().width < 110 && l.getBoundingClientRect().width >= 36).map(l => l.querySelector('.cm-op').textContent));
  assert.ok(short.every(t => /^[A-Z]+-\d+$/.test(t)), 'a short movement carries the reference only: ' + JSON.stringify(short.slice(0, 4)));
  await click('[data-cm="view"][data-id="data"]');
  assert.ok(await count('button.cm-drow') >= 1, 'data rows are buttons');
  pass('Chapter 8: the key explains lost answers, missing contracts and unsourced data; short movements show the contract’s reference; data rows are buttons');

  // 12. On a narrower window the companion starts closed, and the toolbar folds to its icons.
  const mid = await browser.newContext({viewport: {width: 1100, height: 800}});
  const pm = await mid.newPage(); pm.on('pageerror', e => errors.push(e.message));
  await pm.goto(base + '/?chapter=5&tab=model', {waitUntil: 'networkidle'}); await pm.waitForSelector('.cm .rz-card'); await pm.waitForTimeout(400);
  assert.ok(await pm.$('.cm-body.no-panel'), 'the companion starts closed on a 1100 px window');
  assert.match(await pm.$eval('[data-rz="panel"]', e => e.getAttribute('aria-label')), /^Show the companion panel/);
  assert.ok(await pm.$eval('.cm-view span', e => e.offsetWidth <= 1), 'the view labels fold to icons');
  await pm.click('.rz-card[data-card="risk-engine"] .rz-t'); await pm.waitForTimeout(300);
  assert.ok(!(await pm.$('.cm-body.no-panel')) && (await pm.$eval('.cm-panel', e => getComputedStyle(e).position)) === 'absolute', 'selecting opens the companion as a drawer over the canvas');
  await mid.close();
  pass('on a 1100 px window the companion starts closed and opens as a drawer on selection, and the toolbar folds to icons');

  // 13. On a phone the fit keeps the cards legible: the lens lines stay.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const pp = await phone.newPage(); pp.on('pageerror', e => errors.push(e.message));
  await pp.goto(base + '/?chapter=5&tab=model', {waitUntil: 'networkidle'}); await pp.waitForSelector('.cm .rz-card'); await pp.waitForTimeout(400);
  assert.equal(await pp.$('.cm.rz.cm-far'), null, 'the phone fit does not hide the lens lines');
  assert.equal(await pp.$eval('.rz-card.component .rz-lens', e => getComputedStyle(e).visibility), 'visible');
  assert.ok(await pp.$('.cm-walk .cm-tools .cm-zoom'), 'the tools are in the footer on a phone too');
  assert.equal(await pp.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal page scroll');
  await phone.close();
  pass('on a 390 px phone the cards keep their lens lines, the tools are in the footer and the page does not scroll sideways');

  // 14. A blank project: the model says what is missing and what to do, in place.
  await page.goto(base + '/?view=projects', {waitUntil: 'networkidle'}); await page.waitForTimeout(600);
  await page.evaluate(() => { [...document.querySelectorAll('a, button')].find(b => /Create a project/.test(b.textContent))?.click(); }); await page.waitForTimeout(800);
  await page.fill('input[name=name]', 'Blank model views');
  await page.evaluate(() => { const r = [...document.querySelectorAll('input[name=template]')].find(r => /blank/i.test((r.closest('label') || r.parentElement)?.innerText || r.value)) || document.querySelector('input[name=template]'); if (r) { r.checked = true; r.dispatchEvent(new Event('change', {bubbles: true})); r.click(); } });
  await page.waitForTimeout(200);
  await page.evaluate(() => (document.querySelector('#create-submit') || document.querySelector('form button[type=submit]'))?.click());
  await page.waitForURL(u => !/view=projects/.test(String(u)), {timeout: 15000}); await page.waitForTimeout(1200);
  const pid = new URL(page.url()).searchParams.get('project');
  assert.ok(pid, 'a blank project was created');
  const empties = {5: ['No component yet', 'New component'], 6: ['No platform yet', 'New capability'], 7: ['No realisation yet', 'Define capabilities in Chapter 6']};
  for (const [ch, [title, action]] of Object.entries(empties)) {
    await page.goto(base + '/?chapter=' + ch + '&tab=model&project=' + encodeURIComponent(pid), {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-empty-card', {timeout: 10000}); await page.waitForTimeout(300);
    const card = await page.$eval('.cm-empty-card', e => ({title: e.querySelector('b').textContent, acts: [...e.querySelectorAll('.cm-acts .cm-btn')].map(a => a.textContent.trim())}));
    assert.equal(card.title, title, 'Chapter ' + ch); assert.ok(card.acts.some(a => a.includes(action)), 'Chapter ' + ch + ' offers ' + action + ': ' + card.acts.join(' | '));
    assert.equal(await page.$('.cm-panel .cm-ins'), null, 'no observation is invented for an empty project');
  }
  await page.goto(base + '/?chapter=4&tab=model&project=' + encodeURIComponent(pid), {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-stage'); await page.waitForTimeout(400);
  assert.match(await page.$eval('.cm-walk .cm-state', e => e.textContent), /No responsibility recorded yet/);
  pass('a blank project’s Chapters 5, 6 and 7 say in place that nothing is recorded, offer the next action, invent no observation, and Chapter 4’s status says so too');

  await ctx.close();
  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 4–8 model views (rendered)', passed: checks.length, checks}, null, 2));
