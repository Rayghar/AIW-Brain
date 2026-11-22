// AIW rc44, work package wp9a (audit/rc44/design/wp9a-deployment.md), in a browser: the design package
// p30-deployment as the client loads it. One section per slice; a later slice fills its own section (slice 6 brings
// the surface and most of the cases). The node cases are in rc44-wp9a-deployment-validate.mjs.
//
// Slice 1 has no surface. What it puts in front of every project is the package's route stub
// (public/design-package-routes.js), so that is what is held here, against the built client:
//   S1.b1  a project without the marker runtime.topology opens without the lazy entry that holds the package (the
//          Chapter 10 Model view), and with it, typed through the command route, the same project loads that entry
//          before it is drawn and opens without an error, on Chapter 1 and on Chapter 10.
// Needs Playwright and Chromium (AIW_PLAYWRIGHT_MODULE, default 'playwright'; AIW_BROWSER_EXECUTABLE) and the built
// client (node build.mjs). Starts an isolated local server on a free port from 4100. Run:
// npm run test:rc44-wp9a-deployment-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync, rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
assert.ok(existsSync('dist/client/index.html'), 'the built client is there (node build.mjs)');
const free = p => new Promise(r => { const s = net.createServer().once('error', () => r(false)).listen(p, '127.0.0.1', () => s.close(() => r(true))); });
let port = 4100; while (port < 5000 && !(await free(port))) port++;
assert.ok(port < 5000, 'a free port from 4100 to 4999');
const db = '.aiw-local/rc44-wp9a-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port), '--client', 'dist/client'], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already stopped */ } }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => { checks.push(n); console.log('PASS', n); };
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  // A page, with the scripts it asked for by file name.
  const open = async url => { const page = await ctx.newPage(), scripts = []; page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (/\.js(\?|$)/.test(r.url())) scripts.push(r.url().split('/').pop().split('?')[0]); }); await page.goto(base + url, {waitUntil: 'networkidle'}); return {page, scripts, text: await page.evaluate(() => document.body.innerText)}; };
  const lazy = scripts => scripts.filter(f => /^deploy-view\b/.test(f)), refused = text => /did not load|could not be opened/.test(text);

  // ================================================================ Slice 1: the route stub
  {
    const setup = await open('/');
    const id = await setup.page.evaluate(async () => (await (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Topology', template: 'bank-payment', brief: ''})})).json()).document.id);
    const send = (type, payload) => setup.page.evaluate(async ([id, type, payload]) => { const state = await (await fetch('/api/project?project=' + id, {credentials: 'same-origin'})).json(); const r = await fetch('/api/commands?project=' + id, {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({revision: state.revision, command: {type, payload}})}); return {status: r.status, body: await r.json()}; }, [id, type, payload]);
    // without the marker
    const plain = await open('/?project=' + id + '&chapter=1');
    assert.ok(plain.scripts.length > 20 && !refused(plain.text), 'the project opens: ' + plain.text.slice(0, 200));
    assert.deepEqual(lazy(plain.scripts), [], 'a project without the marker opens without the lazy entry of the Chapter 10 Model view');
    await plain.page.close();
    // typed through the command route (no surface offers the step before slice 6): the marker, a failure domain, a node, a located zone
    for (const [type, payload] of [['runtime.topology-start', {}], ['technology.domain', {title: 'Primary site', scope: 'site', cause: 'location'}], ['runtime.node', {title: 'Primary site', kind: 'site', jurisdiction: 'NO', domainId: 'fd-001'}], ['runtime.locate', {zoneId: 'zone-a', nodeId: 'dn-001', domainIds: ['fd-001']}]]) { const r = await send(type, payload); assert.equal(r.status, 200, type + ': ' + JSON.stringify(r.body).slice(0, 300)); }
    const typed = await open('/?project=' + id + '&chapter=1');
    assert.equal(lazy(typed.scripts).length, 1, 'a project that holds the marker loads the lazy entry that holds the package: ' + JSON.stringify(lazy(typed.scripts)));
    assert.ok(!refused(typed.text), 'and opens: ' + typed.text.slice(0, 200)); assert.deepEqual(errors, [], 'with no page error');
    await typed.page.close();
    const ten = await open('/?project=' + id + '&chapter=10');
    assert.ok(/Application zone/.test(ten.text) && !refused(ten.text), 'Chapter 10 draws the located zone\'s page: ' + ten.text.slice(0, 200)); assert.deepEqual(errors, [], 'with no page error');
    assert.equal(lazy(ten.scripts).length, 1, 'the entry is asked for once');
    pass('S1.b1: a project without the marker opens without the lazy entry of the Chapter 10 Model view (' + plain.scripts.length + ' scripts); typed through the command route it loads that entry before it is drawn and opens on Chapter 1 and Chapter 10 without an error');
  }

  // ================================================================ Slice 6: the surface
  // (design section g, Slice 6: browser cases 1 to 7. Slice 6 adds them here, as blocks named 'S6.bn …'.)
} finally {
  await browser.close(); server.kill('SIGTERM');
  for (const suffix of ['', '-shm', '-wal']) rmSync(db + suffix, {force: true});
}
console.log('\nrc44 wp9a deployment, browser: ' + checks.length + ' check passed (slice 1; slice 6 has no cases yet)');
