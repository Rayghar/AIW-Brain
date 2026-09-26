// Rendered checks for the knowledge repository in the workbench: search the corpus in Mind Factory →
// Sources, read a verified passage, retrieve its exact original and interpret it; open a desk switch
// point in Mind Factory; and see repository leads beside what Sol will read. Runs the real server with
// the synthetic fixture corpus service and the provider test double on loopback.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally
// AIW_BROWSER_EXECUTABLE. Run: npm run test:knowledge-repository-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync,mkdirSync} from 'node:fs';
import {rm} from 'node:fs/promises';
import {generateKeyPairSync,createHash} from 'node:crypto';
import net from 'node:net';
import {startMockLLM} from './mock-llm-provider.mjs';
import {createFixture} from './repository-service/fixture.mjs';
import {buildStore} from './repository-service/build.js';
import {startService} from './repository-service/server.js';
import {keyInfo} from './repository-service/sync.js';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const {root, config} = await createFixture('aiw-krbrowser-');
await buildStore(config);
const token = createHash('sha256').update('browser-fixture').digest('hex'), pair = generateKeyPairSync('ed25519'), key = {...keyInfo(pair.privateKey), privateKey: pair.privateKey};
const service = await startService(config, {token, key, port: 0});
const llm = await startMockLLM();
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/kr-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'mock-sol', AIW_LLM_BASE_URL: llm.url, AIW_KNOWLEDGE_REPOSITORY_URL: service.url, AIW_KNOWLEDGE_REPOSITORY_TOKEN: token, AIW_REPOSITORY_NOTICE_KEYS: JSON.stringify({[key.keyId]: key.publicKey}), AIW_REPOSITORY_SYNC_INTERVAL_MS: '0'}, stdio: ['ignore', 'pipe', 'inherit']});
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port, shots = 'test-results';
mkdirSync(shots, {recursive: true});
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => { checks.push(n); if (process.env.KR_DEBUG) console.error('PASS', checks.length, n.slice(0, 70)); };
try {
  const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
  page.on('pageerror', e => errors.push(e.message));
  const act = async sel => { await page.$eval(sel, e => e.click()); await page.waitForTimeout(250); };
  const body = () => page.$eval('#brain-panel .kw-body', e => e.innerText);
  // Mind Factory opens through its public entry point, as the desk and the chapter companions open it.
  const openSources = async (p = page) => {
    await p.goto(base + '/?chapter=4&tab=work&object=api', {waitUntil: 'networkidle'});
    await p.waitForFunction(() => !!window.aiwKnowledge, null, {timeout: 20000}); await p.evaluate(() => window.aiwKnowledge.openView('sources'));
    await p.waitForSelector('#brain-panel .kw-tabs [data-view="sources"][aria-pressed="true"]', {timeout: 15000});
    await p.waitForSelector('#brain-panel .kw-corpus:not(.is-offline) [data-k-corpus-query]', {timeout: 15000});
  };

  // 1. Search, read and retrieve: discovery material becomes a project source only by explicit retrieval.
  await openSources();
  assert.match(await body(), /Knowledge repository · discovery only[\s\S]*2 repositories · 9 documents/i);
  assert.ok(await page.$('#brain-panel details.kw-offline'), 'the bundled locators fold away while the repository is connected');
  await page.fill('#brain-panel [data-k-corpus-query]', 'circuit breaker');
  await page.$eval('#brain-panel [data-k-corpus-search]', f => f.requestSubmit());
  await page.waitForSelector('#brain-panel .kw-corpus-hit', {timeout: 15000});
  assert.match(await page.$eval('#brain-panel .kw-corpus-hit', e => e.innerText), /unreviewed passage[\s\S]*Guarding a work queue[\s\S]*docs\/patterns\/queue-guard\.md[\s\S]*detected, not cleared[\s\S]*contains embedded script/i);
  await act('#brain-panel .kw-corpus-hit [data-k-action="corpus-read"]');
  await page.waitForSelector('#brain-panel .kw-corpus-reader pre');
  assert.match(await page.$eval('#brain-panel .kw-corpus-reader', e => e.innerText), /not evidence until interpreted and reviewed[\s\S]*Circuit Breaker[\s\S]*Source identity/i);
  await page.screenshot({path: shots + '/knowledge-repository-reader.png'});
  await act('#brain-panel .kw-corpus-reader [data-k-action="corpus-fetch"]');
  await page.waitForSelector('#brain-panel .kw-corpus-reader [data-k-action="corpus-interpret"]', {timeout: 15000});
  let doc = await page.evaluate(() => window.aiwProjectStore.value.document);
  const src = doc.knowledge.sources.find(s => s.path === 'docs/patterns/queue-guard.md');
  assert.equal(src.origin, 'repository-fetch'); assert.equal(src.acquisition.transport, 'akr-corpus'); assert.equal(doc.knowledge.claims.length, 0, 'retrieval approves nothing');
  pass('Sources: the connected repository is searched, a passage is read from its verified original, and only an explicit retrieval saves the exact original — with no claim made');

  // 2. Interpret the same passage: the claim form carries its exact line range.
  await act('#brain-panel .kw-corpus-reader [data-k-action="corpus-interpret"]');
  await page.waitForSelector('#brain-panel form[data-k-save] [data-k-field="lineStart"]');
  const range = await page.$$eval('#brain-panel form[data-k-save] [data-k-field="lineStart"], #brain-panel form[data-k-save] [data-k-field="lineEnd"]', xs => xs.map(x => x.value));
  assert.ok(Number(range[0]) >= 1 && Number(range[1]) >= Number(range[0]));
  if (!(await page.$eval('#brain-panel [data-k-field="subjectId"]', e => e.value))) await page.fill('#brain-panel [data-k-field="subjectId"]', 'PAT-CIRCUIT-BREAKER');
  await page.fill('#brain-panel [data-k-field="predicate"]', 'pairs-with');
  await page.fill('#brain-panel [data-k-field="statement"]', 'Pair a circuit breaker with bounded retries so persistent faults stop quickly.');
  await page.fill('#brain-panel [data-k-field="conditions"]', 'Transient and persistent faults can be told apart');
  await page.fill('#brain-panel [data-k-field="limitations"]', 'Does not add capacity');
  await page.$eval('#brain-panel form[data-k-save]', f => f.requestSubmit());
  try { await page.waitForFunction(() => (window.aiwProjectStore.value.document.knowledge?.claims || []).length === 1, null, {timeout: 15000}); }
  catch { throw Error('The claim was not saved: ' + await page.evaluate(() => document.querySelector('#brain-panel .kw-error:not([hidden])')?.innerText || 'no error shown')); }
  doc = await page.evaluate(() => window.aiwProjectStore.value.document);
  const claim = doc.knowledge.claims[0];
  assert.equal(claim.sourceId, src.id); assert.equal(String(claim.lineStart), range[0]); assert.equal(claim.review, undefined, 'a candidate claim awaits review');
  pass('interpreting the passage opens the claim form on its exact lines; the saved claim is a candidate awaiting review');

  // 3. The desk's switch point opens the product comparison in Mind Factory.
  await page.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.dk .dk-cell', {timeout: 15000});
  await act('.cm.dk .cm-view[data-id="load"]'); await page.waitForSelector('.dk-card[data-card="tr-003"]', {timeout: 15000});
  if (!(await page.$('.dk-card[data-card="tr-003"].sel'))) await act('.dk-card[data-card="tr-003"]');
  await page.waitForSelector('.cm-panel [data-k-action="product-compare"]', {timeout: 15000});
  await act('.cm-panel [data-k-action="product-compare"]');
  await page.waitForSelector('#brain-panel .kw-products', {timeout: 15000});
  assert.match(await page.$eval('#brain-panel .kw-products', e => e.innerText), /Product choice · TR-003[\s\S]*A lean is not a decision[\s\S]*RabbitMQ[\s\S]*Documented mechanisms[\s\S]*Apache Kafka[\s\S]*No active, reviewed claim in this project names/i);
  await page.screenshot({path: shots + '/knowledge-repository-product-comparison.png'});
  pass('a desk switch point opens Mind Factory on the product comparison: the weighing, each product\'s documented mechanisms and the reviewed claims about it');

  // 4. Leads beside what Sol will read: never sent, and they open in Sources. The desk remembers the
  // "What it takes" view chosen above, so return to the vitals first.
  await page.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.dk .cm-view', {timeout: 15000});
  if (!(await page.$('.cm.dk .cm-view[data-id="vitals"][aria-pressed="true"]'))) await act('.cm.dk .cm-view[data-id="vitals"]');
  await page.waitForSelector('.cm.dk .dk-cell', {timeout: 15000});
  await act('[data-card="C:run-001:capacity"]');
  await page.waitForSelector('.cm-panel [data-dk="sol-ask"]'); await act('.cm-panel [data-dk="sol-ask"]');
  await page.waitForSelector('.dk-solpend .dk-sollead', {timeout: 15000});
  const leads = await page.$eval('.dk-solpend .dk-sollead', e => e.innerText);
  assert.match(leads, /Leads from the knowledge repository · \d+ · not sent to Sol/i);
  assert.equal(llm.calls.length, 0, 'preparing sends nothing to the provider');
  await page.click('.dk-solpend .dk-sollead > summary');
  await act('.dk-solpend .dk-sollead [data-k-action="corpus-lead"]');
  await page.waitForSelector('#brain-panel .kw-corpus-reader', {timeout: 15000});
  pass('beside what Sol will read, repository leads are shown and marked not sent to Sol; a lead opens its passage in Mind Factory sources');

  // 5. Phone width: the repository section keeps a usable column and no horizontal page scroll.
  const phone = await (await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true})).newPage();
  phone.on('pageerror', e => errors.push(e.message));
  await openSources(phone);
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal page scroll');
  await phone.screenshot({path: shots + '/knowledge-repository-phone.png'});
  await phone.close();
  pass('on a 390 px phone the repository search keeps a usable column and no horizontal page scroll');

  assert.deepEqual(errors, []);
  pass('no page errors');
} finally {
  await browser.close(); server.kill(); await llm.close(); await service.close();
  try { rmSync(db, {force: true}); rmSync(db + '-wal', {force: true}); rmSync(db + '-shm', {force: true}); } catch { /* best effort */ }
  await rm(root, {recursive: true, force: true});
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
