// Rendered checks for the knowledge repository in the workbench: search the corpus in Proposals →
// Sources, read a verified passage, retrieve its exact original and interpret it; open a desk switch
// point in Proposals; and see repository leads beside what Sol will read. Runs the real server with
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
import {configuredProductFixture} from './product-configuration-fixtures.mjs';
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
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port, shots = 'test-results';
mkdirSync(shots, {recursive: true});
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => { checks.push(n); if (process.env.KR_DEBUG) console.error('PASS', checks.length, n.slice(0, 70)); };
try {
  const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
  // Round 7: Sol's part of the companion is a folded section, closed until Sol has something to say; this suite reads and
  // clicks Sol's controls there, so it views the section as a viewer who opened it (the remembered choice).
  await page.addInitScript(() => { try { localStorage.setItem('aiw.companion.sol', '1'); } catch { /* storage is a convenience */ } });
  page.on('pageerror', e => errors.push(e.message));
  // Find and click in one page task: a redraw between the two would leave the click on a replaced element.
  const act = async sel => { await page.evaluate(s => { const e = document.querySelector(s); if (!e) throw Error('No element matches ' + s); e.click(); }, sel); await page.waitForTimeout(250); };
  // rc38 shell (rc41 W4): the Model companion is in the Details column, closed when nothing is selected on arrival.
  const showCompanion = async () => { await page.waitForSelector('body[data-panel]', {state: 'attached', timeout: 10000}); if (await page.evaluate(() => document.body.dataset.panel !== 'open')) { await page.click('.workspace-tools [data-panel-toggle]'); await page.waitForSelector('#inspector[aria-hidden="false"]', {timeout: 5000}); await page.waitForTimeout(400); } };
  const body = () => page.$eval('#brain-panel .kw-body', e => e.innerText);
  // Proposals opens through its public entry point, as the desk and the chapter companions open it.
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

  // 3. The desk's switch point opens the product comparison in Proposals.
  // rc38+ (rc41 W4): the shipped reference leaves the messaging products' configuration unknown, so no option leans and
  // TR-003 reaches no switch point (rc39 W4). The synthetic, declared configuration other suites use
  // (product-configuration-fixtures.mjs: no deployment or measurement asserted) is applied to TR-003's options through the
  // product's own command, as a person would declare them.
  for (const o of await page.evaluate(() => window.aiwProjectStore.value.document.technologyRealisation.records.find(r => r.id === 'tr-003').options)) {
    const {id, replicaCount, topology, failureDomains, specEvidence, configurationFacts} = configuredProductFixture(o);
    await page.evaluate(async payload => { const store = window.aiwProjectStore, r = await fetch('/api/commands?project=' + encodeURIComponent(store.value.document.id), {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json', 'Idempotency-Key': 'kr-fixture-' + crypto.randomUUID()}, body: JSON.stringify({revision: store.value.revision, command: {type: 'techrealisation.option', payload}})}); if (!r.ok) throw Error((await r.json()).error); await store.load(); }, {id: 'tr-003', option: {id, replicaCount, topology, failureDomains, specEvidence, configurationFacts}});
  }
  assert.ok(await page.evaluate(() => window.aiwProjectStore.value.document.technologyRealisation.records.find(r => r.id === 'tr-003').options.every(o => o.specEvidence?.startsWith('Synthetic configuration declared'))), 'TR-003\'s options carry the declared synthetic configuration');
  await page.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.dk .cm-view', {timeout: 15000});
  // The model companion shares the column the Sol panel covers (one frame on every tab, round 3): close the panel step 2 left open.
  if (await page.$('#brain-panel:not([hidden])')) { await page.keyboard.press('Escape'); await page.waitForSelector('#brain-panel[hidden]', {timeout: 5000}).catch(() => {}); }
  // rc38+ (rc41 W4): the desk's companion is in the Details column (opened as a viewer does). With nothing selected on
  // the Vitals view it lists "Product choices at a switch point", each a link to its drafted decision
  // (data-sel="F:switch:<id>"); the decision's "Compare in Co-design" (data-k-action="product-compare") opens the
  // comparison. The "What it takes" view no longer draws a card per product choice.
  await showCompanion();
  if (!(await page.$('.cm.dk .cm-view[data-id="vitals"][aria-pressed="true"]'))) await act('.cm.dk .cm-view[data-id="vitals"]');
  const SW = '#inspector .cm-companion [data-sel="F:switch:tr-003"]';
  await page.waitForSelector(SW, {state: 'attached', timeout: 15000});
  assert.match(await page.$eval(SW, e => e.closest('.dk-links')?.previousElementSibling?.textContent || ''), /^Product choices at a switch point · \d+$/);
  for (let i = 0; i < 3 && !await page.$eval(SW, e => e.checkVisibility()); i++) { const fold = await page.evaluateHandle(sel => document.querySelector(sel).closest('details:not([open])')?.querySelector(':scope > summary'), SW); const el = fold.asElement(); if (!el) break; await el.click(); await page.waitForTimeout(250); }
  await page.click(SW);
  const CMP = '#inspector .cm-companion .dk-fix.switch [data-k-action="product-compare"][data-id="tr-003"]';
  await page.waitForSelector(CMP, {timeout: 15000});
  assert.match(await page.$eval('#inspector .cm-companion section.dk-fix.switch > h4', e => e.textContent), /^Drafted decision/);
  // rc41 close: this page was loaded fresh, so the knowledge workspace's code has not loaded yet; the first click must
  // still open Co-design (not Ask Sol) on the comparison, send nothing to the provider and write nothing.
  const before3 = {revision: await page.evaluate(() => window.aiwProjectStore.value.revision), calls: llm.calls.length};
  assert.equal(await page.evaluate(() => !!document.querySelector('#brain-panel .kw-workspace')), false, 'the knowledge workspace has not been drawn on this page before the click');
  await act(CMP);
  await page.waitForSelector('#brain-panel .kw-products', {timeout: 15000});
  assert.deepEqual(await page.$eval('#brain-panel', e => ({hidden: e.hidden, role: e.dataset.role, visible: e.checkVisibility()})), {hidden: false, role: 'mind', visible: true}, 'Compare in Co-design opens the Co-design panel');
  assert.equal(llm.calls.length, before3.calls, 'opening the comparison sends nothing to Sol');
  assert.equal(await page.evaluate(() => window.aiwProjectStore.value.revision), before3.revision, 'opening the comparison writes nothing');
  assert.match(await page.$eval('#brain-panel .kw-products', e => e.innerText), /Product choice · TR-003[\s\S]*A lean is not a decision[\s\S]*RabbitMQ[\s\S]*Documented mechanisms[\s\S]*Apache Kafka[\s\S]*No active, reviewed claim in this project names/i);
  await page.screenshot({path: shots + '/knowledge-repository-product-comparison.png'});
  pass('a desk switch point opens Proposals on the product comparison: the weighing, each product\'s documented mechanisms and the reviewed claims about it');

  // 4. Leads beside what Sol will read: never sent, and they open in Sources. The desk remembers the
  // "What it takes" view chosen above, so return to the vitals first.
  await page.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.dk .cm-view', {timeout: 15000});
  if (await page.$('#brain-panel:not([hidden])')) { await page.keyboard.press('Escape'); await page.waitForSelector('#brain-panel[hidden]', {timeout: 5000}).catch(() => {}); }
  // rc41 close: the shipped reference states no load, so the desk computes no capacity reading (RUN-001's capacity is
  // "Not carried", folded with the other such readings, and offers no Sol ask). A viewer explores the SA Playbook's
  // example from "What it takes", as the sheet offers; the exploration is the desk's own and writes nothing, and its
  // reading is an illustrative estimate, labelled, with no verdict (GR-RUN-04).
  await act('.cm.dk .cm-view[data-id="load"]');
  await page.waitForSelector('.cm.dk .dk-st .dk-noload [data-dk="explore-example"]', {timeout: 15000});
  assert.equal(await page.$eval('.cm.dk .dk-st caption', e => e.textContent), 'What it takes · no load stated');
  const before4 = await page.evaluate(() => window.aiwProjectStore.value.revision);
  await act('.cm.dk .dk-st .dk-noload [data-dk="explore-example"]');
  assert.equal(await page.evaluate(() => window.aiwProjectStore.value.revision), before4, 'exploring the playbook example writes nothing');
  await act('.cm.dk .cm-view[data-id="vitals"]');
  await page.waitForSelector('.cm.dk .dk-vt tr[data-card="C:run-001:capacity"]', {timeout: 15000});
  assert.match(await page.$eval('.cm.dk .dk-vt tr[data-card="C:run-001:capacity"]', e => e.innerText.replace(/\s+/g, ' ')), /needs \d+ replicas · assumed \(playbook example\) No target recorded for this exploration .*No signal/, 'the explored reading is labelled as the playbook\'s example and carries no verdict');
  // rc41 close (lead, governance): Sol's ask on the fix drafted from the exploration. The desk sends the exploration
  // ({example: true}) as the objective; Sol is not asked on the playbook's example (it outranks a recorded objective on the
  // desk, and its figures would reach adopted advice and the SDD unlabelled, GR-RUN-04). The server refuses it in plain
  // words, the desk shows them, the ask comes alive again, and nothing is written or sent to the provider.
  const EXAMPLE_REFUSAL = 'Sol reasons over this project\'s own load, not the SA Playbook\'s example. Reset the exploration, or save the review objective, and ask again.';
  await act('[data-card="C:run-001:capacity"]');
  await showCompanion();
  const ASK4 = '#inspector .cm-companion .dk-solagain [data-dk="sol-ask"][data-ids="F:capacity:run-001"]';
  await page.waitForSelector(ASK4 + ':not([disabled])');
  const askedX = page.waitForRequest(r => r.url().includes('/api/intelligence/reasoning-context'), {timeout: 15000});
  const preparedX = page.waitForResponse(r => r.url().includes('/api/intelligence/reasoning-context'), {timeout: 15000});
  await act(ASK4);
  const rqX = JSON.parse((await askedX).postData() || '{}'), rcX = await preparedX, bodyX = await rcX.json().catch(() => ({}));
  assert.deepEqual([rqX.ids, rqX.objective?.example], [['F:capacity:run-001'], true], 'the ask on the exploration carries the exploration, marked as the example');
  assert.deepEqual([rcX.status(), bodyX.error, bodyX.packet], [400, EXAMPLE_REFUSAL, undefined], 'Sol is not asked on the playbook example: the server refuses it in plain words and prepares no packet');
  await page.waitForSelector('#inspector .cm-companion .dk-verdict.bad[role="alert"]', {timeout: 15000});
  assert.equal(await page.$eval('#inspector .cm-companion .dk-verdict.bad[role="alert"]', e => e.textContent), EXAMPLE_REFUSAL, 'the desk shows the refusal in the server\'s words');
  assert.equal(await page.$('#inspector .cm-companion .dk-solpend'), null, 'and draws no packet');
  await page.waitForSelector(ASK4 + ':not([disabled])', {timeout: 5000});
  assert.equal(llm.calls.length, 0, 'asking on the exploration sends nothing to the provider');
  assert.equal(await page.evaluate(() => window.aiwProjectStore.value.revision), before4, 'asking on the exploration writes nothing');
  // This step's subject is the leads beside what Sol will read, on the reading the reference carried before the owner's
  // rc38 snapshot: a stated load. So, as brain-reasoning-browser does (rc41 W4), the viewer resets the exploration with
  // the desk's own Reset (nothing written), and the synthetic workload is saved through Chapter 11's own review.objective
  // command.
  await act('.cm.dk .dk-explore [data-dk="reset-objective"]');
  assert.equal(await page.evaluate(() => window.aiwProjectStore.value.revision), before4, 'resetting the exploration writes nothing');
  await page.evaluate(async () => { const store = window.aiwProjectStore, r = await fetch('/api/commands?project=' + encodeURIComponent(store.value.document.id), {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json', 'Idempotency-Key': 'kr-objective-' + crypto.randomUUID()}, body: JSON.stringify({revision: store.value.revision, command: {type: 'review.objective', payload: {kind: 'users', value: 100000, reviewed: true, reviewer: 'Synthetic workload fixture'}}})}); if (!r.ok) throw Error((await r.json()).error); await store.load(); });
  assert.deepEqual(await page.evaluate(() => { const c = window.aiwProjectStore.value.document.finalReview.capacity; return [c?.kind, c?.value, c?.reviewer]; }), ['users', 100000, 'Synthetic workload fixture'], 'the synthetic workload is the saved review objective');
  await page.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.dk .cm-view', {timeout: 15000});
  if (await page.$('#brain-panel:not([hidden])')) { await page.keyboard.press('Escape'); await page.waitForSelector('#brain-panel[hidden]', {timeout: 5000}).catch(() => {}); }
  if (!(await page.$('.cm.dk .cm-view[data-id="vitals"][aria-pressed="true"]'))) await act('.cm.dk .cm-view[data-id="vitals"]');
  await page.waitForSelector('.cm.dk .dk-vt tr[data-card="C:run-001:capacity"]', {timeout: 15000});
  const reading4 = await page.$eval('.cm.dk .dk-vt tr[data-card="C:run-001:capacity"]', e => e.innerText.replace(/\s+/g, ' '));
  assert.match(reading4, /needs 24 replicas can grow to 1 .*Critical/, 'the saved objective gives RUN-001 a capacity verdict: ' + reading4);
  assert.doesNotMatch(reading4, /playbook example|exploration/, 'the reading is the saved objective\'s, not the example\'s');
  await act('[data-card="C:run-001:capacity"]');
  await showCompanion();
  await page.waitForSelector('#inspector .cm-companion .dk-solagain [data-dk="sol-ask"][data-ids="F:capacity:run-001"]');
  // rc41 close: preparing reads the packet from the server (nothing is sent to the provider); a refusal there is named
  // here instead of surfacing as a missing section.
  const asked = page.waitForRequest(r => r.url().includes('/api/intelligence/reasoning-context'), {timeout: 15000});
  const prepared = page.waitForResponse(r => r.url().includes('/api/intelligence/reasoning-context'), {timeout: 15000});
  await act('#inspector .cm-companion .dk-solagain [data-dk="sol-ask"][data-ids="F:capacity:run-001"]');
  const rq = JSON.parse((await asked).postData() || '{}');
  assert.deepEqual([rq.ids, rq.objective], [['F:capacity:run-001'], null], 'the ask is for RUN-001\'s drafted capacity fix, with no exploration standing in for the saved objective');
  const rc = await prepared;
  assert.ok(rc.ok(), 'preparing Sol\'s reading of the capacity fix drafted for the saved review objective: ' + rc.status() + ' ' + (await rc.text()));
  await page.waitForSelector('.dk-solpend .dk-sollead', {timeout: 15000});
  const leads = await page.$eval('.dk-solpend .dk-sollead', e => e.innerText);
  assert.match(leads, /Leads from the knowledge repository · \d+ · not sent to Sol/i);
  assert.equal(llm.calls.length, 0, 'preparing sends nothing to the provider');
  await page.click('.dk-solpend .dk-sollead > summary');
  await act('.dk-solpend .dk-sollead [data-k-action="corpus-lead"]');
  await page.waitForSelector('#brain-panel .kw-corpus-reader', {timeout: 15000});
  pass('beside what Sol will read, repository leads are shown and marked not sent to Sol; a lead opens its passage in the knowledge sources (Proposals → Explore → Sources); Sol is not asked on the explored playbook example: the desk shows the server\'s plain refusal and writes and sends nothing');

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
