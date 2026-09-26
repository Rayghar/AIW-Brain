// Loops brain-reasoning-browser-validate.mjs steps 1-3 (fresh server and database each time) with the
// suite's own waits, and prints the desk's state whenever the "12 parts" step fails to reappear within
// 15 s of clearing the selection. Run with cwd = the source directory: node diag-sol-browser.mjs [runs]
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import net from 'node:net';
const src = process.cwd(), require = createRequire(path.join(src, 'x.js'));
const {startMockLLM} = await import(pathToFileURL(path.join(src, 'mock-llm-provider.mjs')).href);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true}), runs = Number(process.argv[2]) || 5;
for (let n = 1; n <= runs; n++) {
  const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
  const llm = await startMockLLM(), server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: '.aiw-local/diag-' + port + '.sqlite', OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'mock-sol', AIW_LLM_BASE_URL: llm.url}, stdio: ['ignore', 'pipe', 'inherit']});
  await new Promise((res, rej) => { server.stdout.on('data', d => { if (String(d).includes('ready')) res(); }); server.on('exit', c => rej(Error('server exited ' + c))); });
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}}), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    const act = async sel => { await page.$eval(sel, e => e.click()); await page.waitForTimeout(300); };
    await page.goto('http://127.0.0.1:' + port + '/?chapter=11&tab=model', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.dk .dk-cell', {timeout: 8000});
    if (!(await page.$('.cm.dk .cm-view[data-id="vitals"][aria-pressed="true"]'))) await page.click('.cm.dk .cm-view[data-id="vitals"]');
    await page.waitForFunction(() => /mock-sol/.test(document.querySelector('.dk-solchip')?.innerText || ''), null, {timeout: 8000}); await page.waitForTimeout(300);
    await act('[data-card="C:run-001:capacity"]'); await act('.cm-panel .dk-solagain [data-dk="sol-ask"]'); await page.waitForSelector('.dk-solpend');
    // As the suite does: real mouse clicks, which leave the pointer over the page.
    await page.click('.dk-solpend .dk-solsee > summary'); await page.click('.dk-solpend .dk-solsrc li:first-child summary');
    await page.waitForSelector('.dk-solpend [data-dk="sol-send"]:not([disabled])'); await act('.dk-solpend [data-dk="sol-send"]');
    await page.waitForFunction(() => !document.querySelector('.dk-solpend') && /Sol assessed/.test(document.querySelector('.dk-flash')?.innerText || ''), null, {timeout: 10000}); await page.waitForTimeout(300);
    await act('.cm-panel .dk-sol [data-dk="sol-use"]'); await page.waitForSelector('.dk-preview');
    await act('.cm-panel .dk-fix [data-dk="fix-apply"]'); await page.waitForSelector('dialog[open]');
    await page.check('dialog[open] [data-reviewed]'); await page.click('dialog[open] [data-wb-action="apply-preview"]');
    await page.waitForFunction(() => /with Sol’s refinements/.test(document.querySelector('.dk-flash')?.innerText || ''), null, {timeout: 8000});
    await page.evaluate(() => window.aiwProjectStore.value.document);
    const crumbsBefore = await page.$eval('.cm-crumbs', e => e.innerText).catch(() => '(none)');
    // Record every select() (it writes the URL) and every click from here on, with where it came from.
    const consoleLog = []; page.on('console', m => { if (m.text().startsWith('DIAG ')) consoleLog.push(m.text()); });
    const before = await page.evaluate(() => { window.__token = Math.random().toString(36).slice(2); return {token: window.__token, crumbBars: document.querySelectorAll('.cm-crumbs').length, clearButtons: document.querySelectorAll('.cm-crumbs [data-dk="clear"]').length, desks: document.querySelectorAll('.cm.dk').length, dialogs: [...document.querySelectorAll('dialog')].map(d => d.open), inert: !!document.querySelector('[inert]'), active: document.activeElement?.tagName}; });
    await page.evaluate(() => document.addEventListener('click', e => console.log('DIAG click ' + (e.target.dataset?.dk || e.target.tagName)), true));
    await page.evaluate(() => { window.__log = []; const t0 = performance.now(), orig = history.replaceState.bind(history);
      history.replaceState = (s, u, url) => { window.__log.push(`${Math.round(performance.now() - t0)}ms replaceState ${url} ← ${(new Error().stack || '').split('\n').slice(2, 6).map(x => x.trim().replace(/\(?https?:\/\/[^/]+\//, '').replace(/\)$/, '')).join(' ← ')}`); return orig(s, u, url); };
      document.addEventListener('click', e => { window.__log.push(`${Math.round(performance.now() - t0)}ms click on ${e.target.tagName.toLowerCase()}${e.target.dataset?.dk ? '[data-dk=' + e.target.dataset.dk + ']' : ''}${e.target.closest('[data-card]') ? ' in card ' + e.target.closest('[data-card]').dataset.card : ''} (trusted: ${e.isTrusted})`); }, true); });
    const clicked = await page.$eval('.cm-crumbs [data-dk="clear"]', e => { const info = {connected: e.isConnected, disabled: e.disabled, inDesk: !!e.closest('.cm.dk'), visible: !!(e.offsetWidth || e.offsetHeight)}; e.click(); return info; }); await page.waitForTimeout(300);
    const t = Date.now(), ok = await page.waitForFunction(() => [...document.querySelectorAll('.cm-panel .dk-step')].some(x => /Record how the failure of 12 parts would be seen/.test(x.innerText)), null, {timeout: 15000}).then(() => true, () => false);
    if (ok) console.log(`run ${n}: steps back after ${Date.now() - t} ms`);
    else {
      const state = await page.evaluate(() => ({hovered: [...document.querySelectorAll(':hover')].map(e => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '') + (e.dataset?.card ? `[${e.dataset.card}]` : '')).slice(-3), crumbs: document.querySelector('.cm-crumbs')?.innerText, clearButton: !!document.querySelector('.cm-crumbs [data-dk="clear"]'), steps: [...document.querySelectorAll('.cm-panel .dk-step')].map(x => x.innerText.split('\n')[0]), panel: (document.querySelector('.cm-panel')?.innerText || '').slice(0, 300), dialog: !!document.querySelector('dialog[open]')}));
      console.log(`run ${n}: FAILED — crumbs before clear: ${JSON.stringify(crumbsBefore)}; state: ${JSON.stringify(state)}; page errors: ${JSON.stringify(errors)}`);
      console.log(`run ${n}: log since the clear click:\n  ` + ((await page.evaluate(() => window.__log)) || ['(no log: the window was replaced)']).join('\n  '));
      console.log(`run ${n}: before the click ${JSON.stringify(before)}; the button clicked ${JSON.stringify(clicked)}; window now ${JSON.stringify(await page.evaluate(() => ({token: window.__token || null, crumbBars: document.querySelectorAll('.cm-crumbs').length, desks: document.querySelectorAll('.cm.dk').length})))}; console: ${JSON.stringify(consoleLog)}`);
      // Does a second click on the clear crumb bring the steps back?
      if (state.clearButton) { await act('.cm-crumbs [data-dk="clear"]'); const again = await page.waitForFunction(() => [...document.querySelectorAll('.cm-panel .dk-step')].some(x => /Record how the failure of 12 parts would be seen/.test(x.innerText)), null, {timeout: 5000}).then(() => true, () => false); console.log(`run ${n}: a second clear ${again ? 'brings the steps back' : 'does not help'}`); }
    }
  } catch (e) { console.log(`run ${n}: error before the check — ${e.message.split('\n')[0]}`); }
  finally { await ctx.close(); server.kill(); await llm.close(); }
}
await browser.close();
