// Rendered end-to-end Sol architecture draft on a fresh imported project, using a loopback provider double.
// AIW_BROWSER_EXECUTABLE may point to an official Chrome for Testing binary.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import {syntheticWorkbook} from './scripts/synthetic-workbook.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const freePort = () => new Promise(resolve => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const sourceTitle = statement => {
  const topic = /\b(?:standing instruction|fee waiver|cash withdrawal|tax deduction|customer profile|account balance|ledger entry|loan repayment|statement of account)\b/i.exec(statement)?.[0] || 'business process';
  return topic[0].toUpperCase() + topic.slice(1) + ' handling';
};
const provider = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    const request = JSON.parse(body), name = request.text?.format?.name;
    let output;
    if (name === 'aiw_architecture_draft_check') { checks++; output = {proposals: [{id: 'A1', supported: true, defects: [], notes: []}]}; }
    else {
      assert.equal(name, 'aiw_architecture_draft'); drafts++;
      const packet = JSON.parse(request.input[0].content);
      output = packet.task === 'architecture-cross' ? {proposals: [], keep: [], merges: []} : {
        proposals: [{kind: 'responsibility', title: sourceTitle(packet.requirements[0].statement), statement: 'Sol proposes a bounded responsibility for this source.', requirementRefs: [packet.requirements[0].ref], passages: [], basis: packet.requirements[0].statement, interpretation: 'Sol proposes a responsibility for the cited process.'}],
        keep: packet.skeleton.map(s => s.key)
      };
    }
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({id: 'mock-' + (drafts + checks), model: 'mock-architect', status: 'completed', output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify(output)}]}], usage: {input_tokens: 40, output_tokens: 20}}));
  });
});
let drafts = 0, checks = 0;
await new Promise(resolve => provider.listen(0, '127.0.0.1', resolve));
const port = await freePort(), db = '.aiw-local/architecture-model-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: 'test-key', AIW_LLM_ROUTE_ARCHITECTURE: 'default:mock-architect', AIW_LLM_BASE_URL: `http://127.0.0.1:${provider.address().port}/v1`}, stdio: ['ignore', 'pipe', 'inherit']});
const base = 'http://127.0.0.1:' + port;
let browser;
try {
  await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', code => reject(Error('server exited ' + code))); });
  browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
  const context = await browser.newContext({viewport: {width: 1440, height: 900}}), page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/?view=projects');
  const {bytes, manifest} = syntheticWorkbook({rows: 4});
  const id = await page.evaluate(async ({b64, sheet}) => {
    const made = await (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Architecture model browser pilot', template: 'blank'})})).json();
    const id = made.document.id, bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const call = async (route, body) => (await fetch(route + '&project=' + id, {method: 'POST', credentials: 'same-origin', headers: body instanceof Uint8Array ? {} : {'Content-Type': 'application/json'}, body: body instanceof Uint8Array ? body : JSON.stringify(body)})).json();
    const up = await call('/api/intake?action=upload&filename=Synthetic.xlsx', bin), ins = await call('/api/intake?action=inspect', {uploadId: up.id, sheet});
    const input = {uploadId: up.id, sheet: ins.sheet, headerRow: ins.headerRow, mapping: ins.mapping, priorityMap: ins.bands.map, groups: {domain: true, capabilityTheme: true}};
    const preview = await call('/api/intake?action=preview', input);
    const done = await call('/api/intake?action=apply', {...input, revision: preview.projectRevision, previewStamp: preview.stamp, reviewed: true});
    return done.document ? id : null;
  }, {b64: Buffer.from(bytes).toString('base64'), sheet: manifest.sheet});
  assert.ok(id, 'fresh requirement project imported');
  // The provider view (round 23, M-09): each configured provider with its key state (never the key), its models, the
  // model that answers each task and this project's use. Opened from Operations; no provider is called to show it.
  await page.goto(base + '/?chapter=1&tab=work&project=' + id);
  await page.evaluate(async () => (await import('/operations-ui.js')).operations());
  await page.locator('[data-op="providers"]').click();
  const providerView = page.locator('.ops-providers');
  await providerView.locator('table').first().waitFor();
  const providerText = await providerView.innerText();
  assert.match(providerText, /Keys stay on the server/);
  assert.match(providerText, /Which model answers each task/);
  assert.match(providerText, /architecture/i);
  assert.match(providerText, /mock-architect/);
  assert.ok(!providerText.includes('test-key'), 'the provider view never shows a key');
  assert.equal(drafts + checks, 0, 'showing the providers calls no provider');
  await page.goto(base + '/?chapter=1&tab=work&journey=draft&draft=architecture&project=' + id);
  // Sol's plan is read before the draft starts (round 23, BR-06): themes, runs, estimated tokens and the drafting budget.
  const planNote = page.locator('.jd [data-jd-plan]');
  await planNote.waitFor();
  const planText = await planNote.innerText();
  assert.match(planText, /Draft with Sol sends \d+ themes? and one cross-cutting pass: \d+ model runs?, each a draft call and a check call, using about [\d,]+ tokens/);
  assert.match(planText, /no cost estimated as the routes have no prices configured/);
  assert.match(planText, /drafting budget is 120 runs and 6,000,000 tokens in any 24 hours, of which 0 runs and 0 tokens are used\. This draft fits the budget\./);
  assert.equal(await planNote.getAttribute('data-jd-fits'), 'yes');
  assert.equal(drafts + checks, 0, 'reading the plan calls no provider');
  await page.locator('.jd [data-jd-act="g-start"][data-jd-mode="model"]').click();
  try { await page.waitForSelector('.jd-preview table[data-jd-counts]', {timeout: 45000}); }
  catch (e) {
    const state = await page.evaluate(async id => ({screen: document.querySelector('.jd')?.innerText.slice(0, 2000), latest: await (await fetch('/api/drafting?action=latest&project=' + id)).json()}), id);
    throw new Error(`Model preview did not appear: ${JSON.stringify({drafts, checks, state}).slice(0, 3500)}`, {cause: e});
  }
  assert.ok(drafts > 0 && checks > 0, 'model draft and checks called');
  assert.match(await page.locator('.jd-preview .jd-note').first().innerText(), /Sol drafted .* themes with the model/);
  await page.locator('.jd-preview tr[data-jd-chapter="4"] [data-jd-act="g-records"]').click();
  await page.waitForSelector('.jd-record-detail .jd-review-card');
  const review = await page.locator('.jd-record-detail').innerText();
  assert.match(review, / handling/);
  assert.match(review, /Sol model/);
  assert.match(review, /Source basis/);
  assert.match(review, /Sol’s interpretation/);
  const citation = await page.locator('.jd-review-sources a[href*="artefact="]').first().getAttribute('href');
  assert.match(citation, /chapter=1.*artefact=/, 'proposal citations open the actual source requirement');
  assert.ok(!review.includes('["REQ-002"]') && !/Confirmed\s+false/.test(review), 'review shows readable references and omits machine confirmation flags');
  assert.ok(await page.locator('.jd [data-jd-act="g-apply"]').evaluate(b => b.disabled), 'apply requires human review');
  if (process.env.AIW_CAPTURE_BROWSER) {
    await page.locator('.jd-review-card').filter({hasText: ' handling'}).first().scrollIntoViewIfNeeded();
    await page.screenshot({path: '/tmp/aiw-architecture-review-desktop.png'});
  }
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(base + '/?chapter=1&tab=work&journey=draft&draft=architecture&project=' + id);
  await page.waitForSelector('.jd-preview table[data-jd-counts]');
  await page.locator('.jd-preview tr[data-jd-chapter="4"] [data-jd-act="g-records"]').click();
  await page.waitForSelector('.jd-record-detail .jd-review-card');
  const mobile = await page.evaluate(() => ({overflow: document.documentElement.scrollWidth - innerWidth, cards: document.querySelectorAll('.jd-review-card').length}));
  assert.ok(mobile.overflow <= 1 && mobile.cards > 0, `the proposal review fits a phone: ${JSON.stringify(mobile)}`);
  if (process.env.AIW_CAPTURE_BROWSER) {
    await page.locator('.jd-review-card').filter({hasText: ' handling'}).first().scrollIntoViewIfNeeded();
    await page.screenshot({path: '/tmp/aiw-architecture-review-phone.png'});
  }
  const chapters = await page.locator('.jd-preview tr[data-jd-chapter]').evaluateAll(rows => rows.map(row => ({chapter: row.dataset.jdChapter, records: Number(row.querySelector('td')?.textContent.replace(/,/g, '') || 0)})));
  let pages = 0;
  for (const c of chapters) for (let offset = 0; offset < c.records; offset += 20) {
    if (offset === 0) await page.locator(`.jd-preview tr[data-jd-chapter="${c.chapter}"] [data-jd-act="g-records"]`).click();
    else {
      await page.locator(`.jd-record-detail [data-jd-act="g-records"][data-jd-offset="${offset}"]`).click();
      await page.waitForFunction(n => document.querySelector('.jd-record-detail>header p')?.textContent.includes('showing ' + n), offset + 1);
    }
    await page.locator('.jd-record-detail [data-jd-act="g-mark-page"]').click();
    await page.locator('.jd-record-detail [data-jd-act="g-mark-page"]').filter({hasText: 'Page reviewed'}).waitFor();
    await page.waitForFunction(expected => Number(document.querySelector('.jd-review-progress b')?.textContent.match(/\d+/)?.[0]) === expected, pages + 1);
    pages++;
  }
  assert.match(await page.locator('.jd-review-progress').innerText(), new RegExp(`${pages} of ${pages}`), 'every rendered proposal page was marked');
  await page.locator('.jd [data-jd-act="g-reviewed"]').check();
  await page.locator('.jd [data-jd-act="g-apply"]').click();
  await page.waitForSelector('[data-jd-applied]', {timeout: 120000});
  const doc = await page.evaluate(async id => (await (await fetch('/api/project?project=' + id)).json()).document, id);
  assert.ok(doc.logical.responsibilities.some(r => / handling$/.test(r.title) && r.provenance?.draft?.engine === 'model'));
  assert.deepEqual(errors, [], 'no page errors');
  await context.close();
  console.log(`PASS rendered model architecture: provider view, the plan before the draft, fresh import, ${drafts} drafts, ${checks} checks, ${pages} reviewed pages, cited review and human apply`);
} finally {
  await browser?.close(); server.kill(); provider.close();
  for (const f of [db, db + '-shm', db + '-wal']) rmSync(f, {force: true});
}
