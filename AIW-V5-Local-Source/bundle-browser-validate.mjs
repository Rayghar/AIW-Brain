// The production client (client-bundle.mjs) works like the source it is built from: every chapter and tab
// renders under the Content-Security-Policy with no page error, console error or policy violation, and a
// page loads a few bundled files instead of ~160 modules and 40 stylesheets.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally
// AIW_BROWSER_EXECUTABLE. Run: npm run test:bundle-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {bundleClient} from './client-bundle.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const checks = [], pass = (name) => checks.push(name);
const scratch = mkdtempSync(path.join(tmpdir(), 'aiw-bundle-'));
const client = path.join(scratch, 'client'), dbFile = path.join(scratch, 'project.sqlite');
const built = await bundleClient(client);
assert.match(built.entry, /^\/assets\/app-[A-Z0-9]+\.js$/); assert.match(built.css, /^\/assets\/app-[a-f0-9]{12}\.css$/);
pass(`the bundle builds: ${built.scripts} script files and one stylesheet from ${built.stylesheets}`);

const port = await new Promise((resolve) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const server = spawn(process.execPath, ['server.js', '--port', String(port), '--client', client], {env: {...process.env, AIW_LOCAL_DB: dbFile, AIW_LOCAL_ACCOUNTS: '', OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', (d) => { if (String(d).includes('ready')) resolve(); }); server.on('exit', (c) => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
try {
  const context = await browser.newContext({viewport: {width: 1440, height: 900}});
  await context.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`)); });
  const page = await context.newPage();
  const problems = [], files = new Set();
  page.on('pageerror', (e) => problems.push('page error: ' + e.message.slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text().slice(0, 160)); });
  page.on('request', (r) => { if (/\.(js|css)$/.test(new URL(r.url()).pathname)) files.add(new URL(r.url()).pathname); });
  let most = 0;
  for (let chapter = 1; chapter <= 11; chapter += 1) {
    for (const tab of ['work', 'model', 'validate', 'output']) {
      files.clear();
      await page.goto(`${base}/?chapter=${chapter}&project=bank-payment&tab=${tab}`, {waitUntil: 'networkidle'});
      const state = await page.evaluate(() => ({csp: window.__csp, main: !!document.querySelector('main, #workspace, .studio, .r-shell'), text: document.body.innerText.length}));
      if (state.csp.length) problems.push(`policy violation on chapter ${chapter} ${tab}: ${state.csp.join(' | ')}`);
      if (!state.main || state.text < 200) problems.push(`chapter ${chapter} ${tab} did not render`);
      assert(![...files].some((f) => !f.startsWith('/assets/')), 'only bundled files are loaded');
      most = Math.max(most, files.size);
    }
  }
  // The 1.5 MB pattern catalogue is fetched only when Sol's panel or the knowledge view opens (round 2, I2-20): the
  // Projects page and Chapter 1 open without it, and opening Sol on Chapter 4 fetches it (added by R2-G).
  {
    const meta = JSON.parse((await import('node:fs')).readFileSync(built.metafile, 'utf8'));
    const [catalogueFile] = Object.entries(meta.outputs).find(([, o]) => Object.keys(o.inputs || {}).some((i) => i.endsWith('public/brain-catalogue.js')));
    const chunk = '/' + path.relative(client, catalogueFile).split(path.sep).join('/');
    const fresh = await browser.newContext({viewport: {width: 1440, height: 900}}), p2 = await fresh.newPage(), asked = [];
    p2.on('request', (r) => { if (new URL(r.url()).pathname === chunk) asked.push(r.url()); });
    for (const url of ['/?view=projects', '/?chapter=1&project=bank-payment&tab=work', '/?chapter=2&project=bank-payment&tab=work']) { await p2.goto(base + url, {waitUntil: 'networkidle'}); assert.deepEqual(asked, [], url + ' opens without the pattern catalogue'); }
    await p2.goto(base + '/?chapter=4&project=bank-payment&tab=work', {waitUntil: 'networkidle'});
    assert.deepEqual(asked, [], 'Chapter 4 opens without it while Sol is closed');
    await p2.click('[data-brain-launch="design"]');
    await p2.waitForFunction(() => !!document.querySelector('#brain-panel:not([hidden])'), null, {timeout: 15000});
    for (let i = 0; i < 150 && !asked.length; i++) await p2.waitForTimeout(100);
    assert.equal(asked.length, 1, 'opening Sol fetches the catalogue once');
    await fresh.close();
    pass('the pattern catalogue loads only when Sol opens: not for the Projects page, Chapters 1–2 or a closed Sol panel');
  }
  assert.deepEqual(problems, []);
  assert(most < 90, `a page loads at most ${most} bundled files`);
  pass(`all 11 chapters × 4 tabs render from the bundle with no page error, console error or policy violation; a page loads at most ${most} bundled files`);
} finally {
  await browser.close();
  server.kill();
  rmSync(scratch, {recursive: true, force: true});
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
