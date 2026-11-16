// rc42 (integration): the dossier of a record another chapter owns loads when such a record is first inspected, not to
// open a chapter (public/app.js foreignDossierHTML; client-bundle.mjs, the chapters route). Rendered checks:
//   1. model-dossier.js is not in the code a chapter needs to open (the static closure of what entry.js imports for the
//      chapters route, as client-bundle.mjs measures it), and a chapter with no such record held draws no dossier. The
//      module may still arrive later with the Model views (record-picture.js loads notation-view.js, which reads it);
//   2. inspecting a record of another chapter on Work asks for it, and the inspector then shows the record's
//      card, the link to its own chapter and its dossier, with no loading line left;
//   3. when the module cannot load, the inspector says so in place (it does not stay "loading"), the record's card and
//      the link to its chapter stay usable, and the page reports the part that did not load;
//   4. the shell imports the dossier lazily only (no static import), and the glance asks for its engine in one request.
// AIW_BROWSER_EXECUTABLE points to an installed Chromium headless shell.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';

const app = await readFile('public/app.js', 'utf8'), glance = await readFile('public/work-glance.js', 'utf8');
assert.doesNotMatch(app, /^import[^\n]*model-dossier\.js/m, 'the shell does not import the dossier statically');
assert.equal((app.match(/import\('\.\/model-dossier\.js'\)/g) || []).length, 1, 'the shell asks for the dossier in one place');
assert.equal((glance.match(/import\(/g) || []).length, 1, 'the glance asks for its engine in one request');
assert.match(glance, /import\('\.\/glance-engine\.js'\)/, 'that request is the engine module');
// The code a chapter needs to open: every module reached by static imports from entry.js and from the modules entry.js
// imports for a chapter (all its dynamic imports but the Projects page), the definition client-bundle.mjs measures.
const sources = new Map(), source = async f => { if (!sources.has(f)) sources.set(f, await readFile(path.posix.join('public', f), 'utf8')); return sources.get(f); };
const targets = (text, from, re) => [...text.matchAll(re)].map(m => path.posix.normalize(path.posix.join(path.posix.dirname(from), m[1])));
const STATIC = /(?:^|[\n;])\s*(?:import|export)\s*(?:[\w*${},\s]+?\s*from\s*)?['"](\.{1,2}\/[^'"]+)['"]/g, DYNAMIC = /import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
const toOpen = new Set(), walk = async f => { if (toOpen.has(f)) return; toOpen.add(f); for (const t of targets(await source(f), f, STATIC)) await walk(t); };
await walk('entry.js');
for (const root of targets(await source('entry.js'), 'entry.js', DYNAMIC).filter(f => f !== 'projects.js')) await walk(root);
assert.equal(toOpen.has('app.js') && toOpen.has('review-domain.js') && toOpen.has('lenses/core-banking.js'), true, 'the walk reaches the shell, the chapter domains and nested folders');
assert.equal(toOpen.has('model-dossier.js'), false, 'the dossier is not in the code a chapter needs to open');
for (const f of ['notation-model.js', 'notation-layout.js', 'notation-svg.js', 'figure-budget.js', 'glance-engine.js']) assert.equal(toOpen.has(f), false, `the glance's engine (${f}) is not in the code a chapter needs to open`);
const engine = await import('./public/glance-engine.js');
for (const name of ['notationDiagram', 'notationScenes', 'notationLayout', 'notationSVG', 'foldDiagram']) assert.equal(typeof engine[name], 'function', `the engine module offers ${name}`);

const require = createRequire(import.meta.url), {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(resolve => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: `.aiw-local/rc42-lazy-dossier-${port}.sqlite`, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
const ready = new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', n => reject(Error('Local server exited ' + n))); });
let browser;
try {
  await ready;
  browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
  const base = `http://127.0.0.1:${port}`, errors = [], asked = [];
  const dossierRequest = url => /model-dossier(?:-[A-Z0-9]+)?\.js/.test(url);
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (dossierRequest(r.url())) asked.push(r.url()); });

  // 1. A chapter with no record of another chapter held draws no dossier and no loading line.
  await page.goto(`${base}/?chapter=6&tab=work`, {waitUntil: 'networkidle'});
  await page.waitForSelector('#inspector', {state: 'attached', timeout: 25000});
  assert.equal(await page.locator('#inspector [data-nt-dossier], #inspector [data-dossier-loading]').count(), 0, 'no dossier and no loading line while no record of another chapter is held');

  // 2. A record of another chapter (a Chapter 5 component, inspected from Chapter 6 Work).
  await page.goto(`${base}/?chapter=6&tab=work&object=api-pod`, {waitUntil: 'networkidle'});
  await page.waitForSelector('#inspector [data-nt-dossier="api-pod"]', {state: 'attached', timeout: 25000});
  assert.equal(asked.length >= 1, true, 'the dossier module was asked for');
  assert.equal(await page.locator('#inspector [data-dossier-loading]').count(), 0, 'no loading line is left once the dossier is drawn');
  assert.equal(await page.locator('#inspector [data-nt-dossier="api-pod"]').count(), 1, 'one dossier for the held record');
  assert.match(await page.locator('#inspector a.btn[href*="chapter=5"][href*="object=api-pod"]').first().innerText(), /Open definition in Chapter 5 Work/, 'the link to the owning chapter stands beside it');
  assert.equal(await page.locator('#inspector [data-nt-dossier="api-pod"] > details:first-of-type').getAttribute('open'), '', 'the dossier opens on why, as before');
  // 3. The module cannot load: the inspector says so; nothing stays "loading"; the page reports the part.
  const cut = await browser.newPage({viewport: {width: 1440, height: 900}}), notices = [];
  cut.on('pageerror', e => errors.push(e.message));
  await cut.route(url => dossierRequest(String(url)), route => route.abort());
  await cut.addInitScript(() => { window.__notices = []; addEventListener('aiw:notice', e => window.__notices.push(String(e.detail?.message || e.detail || ''))); });
  await cut.goto(`${base}/?chapter=6&tab=work&object=api-pod`, {waitUntil: 'networkidle'});
  await cut.waitForFunction(() => /did not load/.test(document.querySelector('#inspector [data-dossier-loading]')?.textContent || ''), null, {timeout: 25000});
  assert.match(await cut.locator('#inspector [data-dossier-loading]').innerText(), /This record’s place in the model did not load\. Its definition is in its own chapter\./);
  assert.equal(await cut.locator('#inspector a.btn[href*="chapter=5"][href*="object=api-pod"]').count() >= 1, true, 'the link to the owning chapter stays');
  await cut.waitForFunction(() => window.__notices.some(n => /did not load/.test(n)), null, {timeout: 5000});
  notices.push(...await cut.evaluate(() => window.__notices));
  assert.equal(notices.some(n => /the record’s place in the model/.test(n)), true, 'the page names the part that did not load');

  assert.deepEqual(errors, [], 'no browser errors');
  console.log('rc42 lazy dossier: chapter opens without it, loads on first cross-chapter inspection, failure said in place, one engine request — passed.');
} finally {
  await browser?.close(); server.kill('SIGKILL');
}
