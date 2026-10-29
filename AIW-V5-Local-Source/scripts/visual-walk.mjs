// Visual walk (rc40): node scripts/visual-walk.mjs <outdir> <steps.json>  (from AIW-V5-Local-Source; AIW_BROWSER_EXECUTABLE names Chromium).
// Starts the server on a free port with a throwaway database and no provider key, walks the steps, writes <outdir>/out.json. Steps: {goto}, {click: selector|text:…}, {wait: ms}, {shot: name}, {dump: selector, as: name, max}, {eval: js, as}
import {spawn} from 'node:child_process'; import {createRequire} from 'node:module'; import net from 'node:net'; import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
const require = createRequire(process.cwd() + '/x.js'); const {chromium} = require('playwright');
const [OUT, STEPS] = process.argv.slice(2); mkdirSync(OUT, {recursive: true});
const steps = JSON.parse(readFileSync(STEPS, 'utf8'));
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: '.aiw-local/walk-' + port + '.sqlite', OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } });
await new Promise((res, rej) => { server.stdout.on('data', d => { if (String(d).includes('ready')) res(); }); server.on('exit', c => rej(Error('exit ' + c))); });
const base = 'http://127.0.0.1:' + port, browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const page = await (await browser.newContext({viewport: {width: steps.width || 1440, height: steps.height || 900}})).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
const out = {}; const log = [];
for (const st of steps.steps) {
  try {
    if (st.goto) { await page.goto(base + st.goto, {waitUntil: 'networkidle'}); await page.waitForTimeout(st.settle || 900); const c = await page.$('#ux-coach [data-coach="close"]'); if (c) await c.click(); }
    if (st.click) { const loc = st.click.startsWith('text:') ? page.getByText(st.click.slice(5), {exact: false}).first() : page.locator(st.click).first(); await loc.click({timeout: st.timeout || 8000}); await page.waitForTimeout(st.settle || 700); }
    if (st.dblclick) { await page.locator(st.dblclick).first().dblclick({timeout: st.timeout || 8000}); await page.waitForTimeout(st.settle || 700); }
    if (st.mouseDbl) { await page.mouse.dblclick(st.mouseDbl[0], st.mouseDbl[1]); await page.waitForTimeout(st.settle || 700); }
    if (st.drag) { const b = await page.$eval(st.drag, e => { const r = e.getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2}; }); await page.mouse.move(b.x, b.y); await page.mouse.down(); await page.mouse.move(b.x + (st.dx || 60), b.y + (st.dy || 90), {steps: 6}); await page.mouse.up(); await page.waitForTimeout(st.settle || 500); }
    if (st.fill) { await page.locator(st.fill).first().fill(st.value); }
    if (st.wait) await page.waitForTimeout(st.wait);
    if (st.shot) await page.screenshot({path: `${OUT}/${st.shot}.png`, fullPage: !!st.full});
    if (st.dump) { const t = await page.evaluate(sel => [...document.querySelectorAll(sel)].map(e => e.innerText.replace(/\s+\n/g, '\n')).join('\n----\n'), st.dump); out[st.as || st.dump] = t.slice(0, st.max || 3000); }
    if (st.eval) out[st.as] = await page.evaluate(st.eval);
    log.push('ok ' + JSON.stringify(st).slice(0, 80));
  } catch (e) { log.push('FAIL ' + JSON.stringify(st).slice(0, 80) + ' :: ' + e.message.split('\n')[0].slice(0, 160)); if (st.shot) await page.screenshot({path: `${OUT}/${st.shot}-fail.png`}).catch(() => {}); }
}
out._log = log; out._errors = errors;
writeFileSync(`${OUT}/out.json`, JSON.stringify(out, null, 1)); console.log(log.join('\n')); console.log('errors', errors.length);
await browser.close(); process.exit(0);
