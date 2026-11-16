// AIW v0.10.0-rc.10.73.42, group G7 in the browser (review round 2): the two controls the group added, driven as a person
// uses them. D19: in a blank project, the Co-design 'recovery' proposal's review form offers "Interaction from" with None
// and every component, and the interaction is saved from the source the person chooses. D20: on a request contract a
// person kept, "Declare it read-only" opens a form that asks for the reviewer, why a repeat is safe and the review
// confirmation; the declaration is stored with them and answers the duplicate check without recording any key.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally AIW_BROWSER_EXECUTABLE.
// Starts an isolated local server on a free port. Run: npm run test:rc42-g7-data-contracts-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/rc42-g7-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already stopped */ } }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => { checks.push(n); console.log('PASS', n); };
// A project made through the API, as a person's workspace makes it, and its commands sent under the revision check.
const makeProject = (page, template, commands) => page.evaluate(async ({template, commands}) => {
  const created = await (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'G7 ' + template, template, brief: template === 'blank' ? 'Reserve shared equipment.' : ''})})).json();
  const id = created.document.id; let state = await (await fetch('/api/project?project=' + id, {credentials: 'same-origin'})).json();
  const selected = [];
  for (const [type, payload] of commands) { const r = await fetch('/api/commands?project=' + id, {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({revision: state.revision, command: {type, payload}})}); const body = await r.json(); if (!r.ok) throw Error(type + ': ' + body.error); state = body; selected.push(body.selected); }
  return {id, selected};
}, {template, commands});
const stored = (page, id) => page.evaluate(async id => (await (await fetch('/api/project?project=' + id, {credentials: 'same-origin'})).json()).document, id);
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/', {waitUntil: 'networkidle'});

  // D19: a blank project with two components; the recovery proposal names no source for the person.
  const draft = {kind: 'service', owner: 'Facilities', inputs: 'Request', outputs: 'Outcome', rationale: 'Fixture.', source: 'Workshop', status: 'draft', allocations: []};
  const blank = await makeProject(page, 'blank', [
    ['artefact', {type: 'requirement', title: 'Reserve equipment', description: 'Accept a reservation request and report its outcome.', acceptance: 'The original reference identifies one reservation.', owner: 'Facilities', source: 'Workshop', confirmed: true}],
    ['logical.responsibility', {title: 'Reservation intake', purpose: 'Accept reservation requests.', boundary: 'Own the request boundary.', owner: 'Facilities', source: 'Workshop', groupId: '', requirementIds: ['REQ-001'], decisionIds: []}],
    ['logical.responsibility', {title: 'Reservation outcome', purpose: 'Settle reservation outcomes.', boundary: 'Own the outcome.', owner: 'Facilities', source: 'Workshop', groupId: '', requirementIds: ['REQ-001'], decisionIds: []}],
    ['realisation.component', {...draft, title: 'Reservation API', purpose: 'Reservation API work.', boundary: 'Reservation API boundary.'}],
    ['realisation.component', {...draft, title: 'Reservation ledger', kind: 'store', purpose: 'Reservation ledger work.', boundary: 'Reservation ledger boundary.'}]
  ]);
  const [apiId, ledgerId] = blank.selected.slice(3);
  await page.goto(base + '/?chapter=5&tab=work&object=' + encodeURIComponent(apiId) + '&project=' + blank.id, {waitUntil: 'networkidle'});
  // The selected component's details offer "A useful next thought": in a blank project, the recovery proposal.
  const recovery = '[data-a-action="preview"][data-a-key="recovery"]';
  await page.waitForSelector(recovery, {state: 'attached', timeout: 15000}).catch(async () => { throw Error('no recovery proposal on the page: ' + (await page.$$eval('[data-a-action]', xs => xs.map(b => b.dataset.aAction + ':' + (b.dataset.aKey || '')).join(',')))); });
  await page.$eval(recovery, b => { b.scrollIntoView({block: 'center'}); b.click(); });
  // "Review & edit proposal" on the unsaved proposal's banner; asked again if a refresh redrew the banner under the click.
  const reviewForm = 'dialog[open] #a-component-form select[name="sourceId"]';
  for (let i = 0; i < 3 && !await page.$(reviewForm); i++) {
    await page.waitForSelector('.cm-banner .dp-banner [data-a-action="edit-ghost"]', {timeout: 15000});
    await page.$eval('.cm-banner .dp-banner [data-a-action="edit-ghost"]', b => b.click());
    await page.waitForSelector(reviewForm, {state: 'attached', timeout: 10000}).catch(() => null);
  }
  await page.waitForSelector(reviewForm, {state: 'attached', timeout: 5000});
  const options = await page.$$eval('dialog[open] #a-component-form select[name="sourceId"] option', xs => xs.map(o => [o.value, o.textContent, o.selected]));
  assert.deepEqual(options.map(o => o[0]), ['', apiId, ledgerId], 'None and every component are offered: ' + JSON.stringify(options));
  assert.equal(options.find(o => o[2])?.[0] ?? '', '', 'no component is chosen for the person');
  assert.equal(await page.$eval('dialog[open] #a-component-form select[name="sourceId"]', e => e.closest('label').querySelector('span').textContent), 'Interaction from');
  await page.$eval('dialog[open] #a-component-form select[name="sourceId"]', (e, v) => { e.value = v; e.dispatchEvent(new Event('change', {bubbles: true})); }, ledgerId);
  await page.$eval('dialog[open] #a-component-form [name="reviewed"]', e => { e.checked = true; e.dispatchEvent(new Event('change', {bubbles: true})); });
  const before = (await stored(page, blank.id)).realisation.components.length;
  await page.$eval('dialog[open] #a-component-form', f => f.requestSubmit());
  await page.waitForFunction(async ({id, n}) => (await (await fetch('/api/project?project=' + id, {credentials: 'same-origin'})).json()).document.realisation.components.length === n + 1, {id: blank.id, n: before}, {timeout: 10000, polling: 300});
  const afterBlank = await stored(page, blank.id), made = afterBlank.realisation.components.at(-1);
  assert.deepEqual(afterBlank.realisation.connections.map(e => [e.from, e.to]), [[ledgerId, made.id]], 'the interaction runs from the source the person chose');
  pass('D19: in a blank project the recovery proposal\'s review form offers "Interaction from" with None and every component, chooses none for the person, and saves the interaction from the chosen source');

  // D20: a request contract a person kept, in a reference project; it reads and changes nothing, and declares no key.
  const status = {title: 'Query payment status', kind: 'request', from: 'ext-channel', to: 'api-pod', purpose: 'Answer the current status of an instruction.', owner: 'Payments API owner', operation: 'GET /payments/{reference}', protocol: 'HTTPS / JSON', contractVersion: 'v1', correlationKey: 'paymentReference', idempotencyKey: '', duplicatePolicy: 'A status read changes nothing: a repeat returns the current status.', authorization: 'Authenticated channel', transport: 'TLS', failurePolicy: 'Return an explicit error.', retryPolicy: 'Retry reads within the caller deadline.', timeoutPolicy: 'Report unknown status.', exchanges: [{dataId: 'instruction', role: 'request'}]};
  const ref = await makeProject(page, 'bank-payment', [['interfaces.contract', status]]), contractId = ref.selected[0];
  await page.goto(base + '/?chapter=8&tab=work&object=' + encodeURIComponent(contractId) + '&project=' + ref.id, {waitUntil: 'networkidle'});
  // The contract's card in Work offers it beside "Record design review", where a person reviews the contract. (The
  // chapter assistant's action bar, where it was first placed, is not drawn while the model companion is active.)
  const declare = '.i-actions [data-i-action="read-only"][data-i-id="' + contractId + '"]';
  await page.waitForSelector(declare, {timeout: 15000}).catch(async () => { throw Error('no visible "Declare it read-only" on the contract: ' + (await page.$$eval('[data-i-action]', xs => xs.map(b => b.dataset.iAction + (b.offsetParent ? '' : '(hidden)')).join(',')))); });
  assert.equal((await page.$eval(declare, e => e.textContent)).trim(), 'Declare it read-only');
  assert.ok(await page.$('.i-actions [data-i-action="review"][data-i-id="' + contractId + '"]'), 'beside the contract\'s design review');
  await page.click(declare);
  await page.waitForSelector('dialog[open] #i-read-only-form', {timeout: 15000});
  assert.match(await page.$eval('dialog[open]', e => e.textContent), /read-only, safe to repeat[\s\S]*Why a repeat is safe[\s\S]*I reviewed it: it changes nothing\./);
  assert.deepEqual(await page.$$eval('dialog[open] #i-read-only-form [required]', xs => xs.map(x => x.name).sort()), ['basis', 'reviewed', 'reviewer'], 'the reviewer, why and the confirmation are required');
  await page.fill('dialog[open] #i-read-only-form [name="reviewer"]', 'Integration lead');
  await page.fill('dialog[open] #i-read-only-form [name="basis"]', 'It reads the instruction and changes nothing.');
  await page.check('dialog[open] #i-read-only-form [name="reviewed"]');
  await page.$eval('dialog[open] #i-read-only-form', f => f.requestSubmit());
  await page.waitForFunction(async ({id, c}) => !!(await (await fetch('/api/project?project=' + id, {credentials: 'same-origin'})).json()).document.interfaces.contracts.find(x => x.id === c)?.readOnlyDeclaration, {id: ref.id, c: contractId}, {timeout: 10000, polling: 300});
  const declared = (await stored(page, ref.id)).interfaces.contracts.find(x => x.id === contractId);
  assert.deepEqual([declared.readOnlyDeclaration.reviewer, declared.readOnlyDeclaration.basis], ['Integration lead', 'It reads the instruction and changes nothing.']);
  assert.deepEqual([declared.idempotencyKey, declared.open?.idempotencyKey], ['', undefined], 'no key and no open key is recorded');
  const duplicate = await page.evaluate(async c => { const {interfaceFindings} = await import('/interfaces-domain.js'); return interfaceFindings(window.aiwProjectStore.value.document).filter(f => f.code === 'duplicate' && f.objectId === c).length; }, contractId);
  assert.equal(duplicate, 0, 'the declaration answers the duplicate check on the page');
  pass('D20: "Declare it read-only" on a kept request contract asks for the reviewer, why a repeat is safe and the review confirmation, stores the declaration with them, records no key, and the duplicate check is answered');
  assert.deepEqual(errors, [], 'no page error: ' + errors.join(' | '));
} finally {
  await browser.close();
  server.kill('SIGKILL');
}
console.log(JSON.stringify({suite: 'rc42-g7-data-contracts-browser', passed: checks.length, checks}, null, 1));
