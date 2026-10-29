// A route into another project resolves its object in that project (rc41 close, governance C18/C24). Opening another
// project in place (round 4, A: an in-app link, aiwRoute, Back or Forward across an import or restore) reads the
// address's `object=` against the project the address names, never against the project still on screen: a reference
// (APP-001 …) lands on the target project's own record, and an id the target project wrote into its own history entry
// (lr-001) is kept even where the project on screen reads that name as one of its references (the reference project's
// LR-001 is `api`). Every step is checked to stay in one document (no load), so the in-place path is the one proved.
// Each step is run and reported on its own, so a run shows every step that fails; the suite fails if any does.
// Nothing here writes a project document: the second project is created through the projects API, as the Projects page
// does, and every route only selects. Needs Playwright and Chromium (AIW_BROWSER_EXECUTABLE).
// Run: npm run test:reference-route-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/reference-route-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } });
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [], failures = [];
const pass = n => { checks.push(n); console.log('PASS', n); };
const step = async (name, fn) => { try { await fn(); pass(name); } catch (e) { failures.push(name + ': ' + e.message.split('\n')[0]); console.log('FAIL', name, '::', e.message.split('\n')[0]); } };

try {
  const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
  page.on('pageerror', e => errors.push(e.message));
  const settle = async (ms = 700) => { await page.waitForLoadState('networkidle'); await page.waitForTimeout(ms); };
  await page.goto(base + '/?chapter=5&tab=work'); await settle(900);
  const coach = await page.$('#ux-coach [data-coach="close"]'); if (coach) await coach.click();
  // The second project: the service-permits reference journey, created as the Projects page creates it.
  const other = await page.evaluate(async () => (await (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Reference route', template: 'service-permits', brief: ''})})).json()).document.id);
  assert.ok(other && other !== 'bank-payment', 'a second project exists');
  assert.equal(await page.evaluate(() => window.aiwProjectStore.value.document.id), 'bank-payment', 'the reference project is on screen');
  const mark = await page.evaluate(() => { window.__aiwRouteDocument = 'one'; return performance.timeOrigin; });
  // Where the shell stands: the project the store holds, the address's object, the record the details column holds, and
  // whether this is still the first document.
  const here = () => page.evaluate(() => ({project: window.aiwProjectStore?.value?.document?.id, object: new URLSearchParams(location.search).get('object'), held: [...document.querySelectorAll('#inspector [data-record-card]')].map(e => e.getAttribute('data-record-card')), marker: window.__aiwRouteDocument, origin: performance.timeOrigin}));
  const arrive = async project => { await page.waitForFunction(id => window.aiwProjectStore?.value?.document?.id === id && !document.body.hasAttribute('aria-busy'), project, {timeout: 20000}); await settle(900); };
  const holds = async (project, id, what) => {
    const at = await here();
    assert.deepEqual({marker: at.marker, origin: at.origin}, {marker: 'one', origin: mark}, 'the project opened in place (no document load), so the in-place route is the one exercised');
    assert.equal(at.project, project, 'the project the address names is on screen');
    assert.equal(at.object, id, what + ` (the address names ${JSON.stringify(at.object)})`);
    assert.ok(at.held.includes(id), `the details column holds ${id} (it holds ${JSON.stringify(at.held)})`);
  };

  // 1. aiwRoute (the path a link from Sol's answer, a record card or the sheet takes) into the other project by reference.
  //    The project on screen reads APP-001 as api-pod; the other project's APP-001 is obj-001 and it holds no api-pod.
  await step('aiwRoute into another project by reference: APP-001 lands on that project’s obj-001 and is held (not on api-pod, the project on screen’s APP-001)', async () => {
    await page.evaluate(id => window.aiwRoute('/?project=' + id + '&chapter=5&tab=work&object=APP-001'), other);
    await arrive(other);
    await holds(other, 'obj-001', 'APP-001 in an address of the other project resolves to that project’s APP-001 and the address carries its id');
  });

  // 2. Back and Forward across in-place switches with an id: the other project's own history entry names lr-001 (its
  //    LR-001, routed within that project). The reference project reads lr-001 as its LR-001 (`api`), which the other
  //    project does not hold; Back must restore lr-001 and keep it in the history entry.
  await step('Back across an in-place project switch restores the record the history entry names (lr-001), twice; the id is never read through the project on screen', async () => {
    await page.evaluate(id => window.aiwRoute('/?project=' + id + '&chapter=4&tab=work&object=lr-001'), other);
    await settle(900);
    await holds(other, 'lr-001', 'a route within the other project holds its lr-001');
    await page.evaluate(() => window.aiwRoute('/?project=bank-payment&chapter=4&tab=work'));
    await arrive('bank-payment');
    await page.goBack();
    await arrive(other);
    await holds(other, 'lr-001', 'Back to the other project restores its own lr-001 (not api, and not nothing)');
    await page.goForward();
    await arrive('bank-payment');
    await page.goBack();
    await arrive(other);
    await holds(other, 'lr-001', 'a second Back restores it again: the history entry kept the record');
  });

  // 3. A link click (the shell's click handler) back into the reference project by reference: its APP-001 is api-pod;
  //    the project on screen reads APP-001 as obj-001, which the reference project does not hold.
  await step('a link click into another project by reference: APP-001 lands on that project’s api-pod (not on obj-001, the project on screen’s APP-001)', async () => {
    if ((await here()).project !== other) { await page.evaluate(id => window.aiwRoute('/?project=' + id + '&chapter=5&tab=work'), other); await arrive(other); }
    await page.evaluate(() => { const a = document.createElement('a'); a.id = 'route-across'; a.href = '/?project=bank-payment&chapter=5&tab=work&object=APP-001'; a.textContent = 'Open the reference component'; document.querySelector('.heading-row').prepend(a); });
    await page.click('#route-across');
    await arrive('bank-payment');
    await holds('bank-payment', 'api-pod', 'APP-001 in a link to the reference project resolves to its own api-pod');
  });

  // 4. A route that stays in the project still resolves by reference, as before.
  await step('a route that stays in the project resolves its reference against that project, as before (APP-002 → risk-engine)', async () => {
    await page.evaluate(() => window.aiwRoute('/?chapter=5&tab=work&object=APP-002'));
    await settle(900);
    await holds('bank-payment', 'risk-engine', 'APP-002 within the reference project resolves to risk-engine');
  });

  await step('no page errors', async () => assert.deepEqual(errors, []));
} finally {
  await browser.close();
  server.kill('SIGKILL');
  for (const suffix of ['', '-wal', '-shm']) try { rmSync(db + suffix); } catch { /* not created */ }
}
console.log(JSON.stringify({suite: 'reference route browser', passed: checks.length, failed: failures}, null, 2));
assert.deepEqual(failures, [], 'every step of the reference route suite passes');
