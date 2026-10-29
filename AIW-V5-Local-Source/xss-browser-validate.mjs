// Stored markup never becomes markup (audit F-01). A project whose identifiers, references, enumerated
// values and free text all carry a probe element is written straight into storage, bypassing every
// validator, and every chapter and tab is rendered: no probe element may appear. A restore that carries
// such values is refused before anything is saved, while ordinary free text still restores.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally
// AIW_BROWSER_EXECUTABLE. Run: npm run test:xss-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync, readdirSync, readFileSync} from 'node:fs';
import net from 'node:net';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {readStoredProject, saveStoredProject} from './project-storage.js';
import {esc, safeUrl} from './public/html-escape.js';
import {documentSafetyProblems} from './shared/document-safety.js';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const checks = [], pass = (name) => { checks.push(name); };
const PROBE = '"><b data-xss-probe></b>';

// 1. The shared helpers.
assert.equal(esc(`<a href="x" title='y'>&</a>`), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
assert.equal(esc(null), ''); assert.equal(esc(0), '0');
for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,<b>', 'vbscript:x', '//evil.example/x', '/\\evil.example', '\\\\evil']) assert.equal(safeUrl(bad), '#', bad);
for (const good of ['https://example.com/a?b=1#c', 'http://example.com', 'mailto:team@example.com', '/?chapter=4', '?tab=model', '#part', 'docs/page.md']) assert.equal(safeUrl(good), good, good);
const ownEscapers = readdirSync('public').filter((f) => f.endsWith('.js') && f !== 'html-escape.js' && /^(?:const|let|var|function)\s+esc(?:ape)?\b|[,;]\s*esc\s*=\s*\(?\w+\)?\s*=>\s*String\(/m.test(readFileSync('public/' + f, 'utf8')));
assert.deepEqual(ownEscapers, [], 'modules import esc from public/html-escape.js rather than defining their own');
pass('one escaper for every value, and stored links keep only http(s), mailto and same-site references');

// 2. A project carrying markup everywhere, written directly into storage.
const ID_KEY = /^(?:id|ref|from|to)$|(?:Id|Ids|Ref|Refs)$/;
const ENUM_KEYS = new Set(['status', 'kind', 'type', 'priority', 'category', 'role', 'effect', 'severity', 'criticality', 'classification', 'mode', 'layer', 'origin', 'polarity', 'claimType', 'state', 'likelihood', 'verdict']);
const TEXT_KEYS = new Set(['name', 'title', 'description', 'statement', 'purpose', 'rationale', 'detail', 'summary', 'label', 'notes', 'owner', 'reason', 'consequence', 'context', 'problem', 'outcome']);
function poison(value, key = '') {
  if (typeof value === 'string') return value && (ID_KEY.test(key) || ENUM_KEYS.has(key) || TEXT_KEYS.has(key)) ? value + PROBE : value;
  if (Array.isArray(value)) return value.map((item) => poison(item, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, poison(v, k)]));
  return value;
}
const port = await new Promise((resolve) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const dbFile = '.aiw-local/xss-browser-' + port + '.sqlite';
const env = {DB: localDatabase(dbFile), FILES: localFiles()};
const origin = 'http://127.0.0.1:' + port, owner = 'local-architect';
const api = async (path, {method = 'GET', body} = {}) => {
  const response = await worker.fetch(new Request(origin + path, {method, headers: {'oai-authenticated-user-id': owner, ...(method !== 'GET' ? {Origin: origin, 'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env);
  return {status: response.status, data: await response.json()};
};
const created = await api('/api/projects', {method: 'POST', body: {name: 'Probe project', template: 'bank-payment'}});
assert.equal(created.status, 201);
const projectId = created.data.document.id;
const row = await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner, projectId).first();
const stored = await readStoredProject(env, owner, row.document);
const hostile = poison(stored.document);
hostile.id = projectId;
const saved = await saveStoredProject(env, owner, projectId, hostile, row.revision, new Date().toISOString(), stored.keys);
assert(saved.meta?.changes, 'the probe project is stored');

// 3. The restore boundary refuses it, and still accepts ordinary free text.
const {data: exported} = await api('/api/project?project=' + projectId);
assert(documentSafetyProblems(exported.document).length > 0);
const refused = await api('/api/recovery?action=preview&project=' + projectId, {method: 'POST', body: {package: exported.document}});
assert.equal(refused.status, 400); assert.match(refused.data.error, /markup or a script link where plain values belong/);
const clean = (await api('/api/project')).data.document;
const withLink = structuredClone(clean);
const option = withLink.technologyRealisation.records.find((r) => r.options?.length).options[0];
option.sourceUrl = 'javascript:alert(1)';
const scriptLink = await api('/api/recovery?action=preview', {method: 'POST', body: {package: withLink}});
assert.equal(scriptLink.status, 400, 'a script link is refused'); assert.match(scriptLink.data.error, /sourceUrl is a link with a script-bearing scheme/);
const plain = structuredClone(clean);
plain.name = 'Payments "north" <review> & rollout';
plain.artefacts[0] = {...plain.artefacts[0], description: 'Contains <b>markup</b> in text, which is escaped when shown.'};
const accepted = await api('/api/recovery?action=preview', {method: 'POST', body: {package: plain}});
assert.equal(accepted.status, 200, JSON.stringify(accepted.data).slice(0, 300));
pass('restore refuses markup in identifiers, references and enumerated values and script links, naming where they are; free text with markup characters still restores');
env.DB.close();

// 4. Every chapter and tab renders the stored probe as text.
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: dbFile, AIW_LOCAL_ACCOUNTS: '', OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', (d) => { if (String(d).includes('ready')) resolve(); }); server.on('exit', (c) => reject(Error('server exited ' + c))); });
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const found = [], pageErrors = new Set();
try {
  const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
  page.on('pageerror', (e) => pageErrors.add(e.message.slice(0, 120)));
  const probes = async (where) => { const n = await page.locator('[data-xss-probe]').count(); if (n) found.push(`${where}: ${n}`); };
  for (let chapter = 1; chapter <= 11; chapter += 1) {
    for (const tab of ['work', 'model', 'validate', 'output']) {
      await page.goto(`${origin}/?chapter=${chapter}&project=${projectId}&tab=${tab}`, {waitUntil: 'networkidle'});
      await probes(`chapter ${chapter} ${tab}`);
    }
  }
  await page.goto(`${origin}/?view=projects`, {waitUntil: 'networkidle'});
  await probes('projects');
  assert.deepEqual(found, [], 'probe elements were created from stored values');
  assert.deepEqual([...pageErrors], [], 'unexpected stored values must not break a view');
  pass('a project carrying markup in every identifier, reference, enumerated value and text field renders it as text, without a page error, in all 11 chapters × 4 tabs and on the projects page');
} finally {
  await browser.close();
  server.kill();
  for (const suffix of ['', '-wal', '-shm']) try { rmSync(dbFile + suffix, {force: true}); } catch { /* best effort */ }
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
