// Retire and restore on every chapter page (round 12, GR-GOV-23). One lifecycle family retires, dismisses and restores the
// records of every chapter (record.retire, record.restore, record.keep; public/record-lifecycle.js). Each of the pages of
// Chapters 1 to 10 offers it in the details of the record in view: "Retire this record" opens the one retire form
// (record-retire-form) that asks why, and the chapter's retired records are listed with Restore. Held here on a Bank
// Payment reference project: every chapter page offers both; a retirement and a restore made on the page of Chapter 1,
// of Chapter 4 and of Chapter 10 (the page apps, the logical studio and the Chapters 6–10 studios) go through the family,
// keep the reason, who and when, and bring the record back where it was.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally AIW_BROWSER_EXECUTABLE.
// Starts an isolated local server on a free port. Run: npm run test:lifecycle-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/lifecycle-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already stopped */ } }); // the server never outlives this suite
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => { checks.push(n); console.log('PASS', n); };
// Each chapter's action attribute, as its page draws its controls.
const ATTR = {1: 'data-r-action', 2: 'data-q-action', 3: 'data-d-action', 4: 'data-l-action', 5: 'data-a-action', 6: 'data-t-action', 7: 'data-tr-action', 8: 'data-i-action', 9: 'data-sec-action', 10: 'data-rt-action'};
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  // A Bank Payment reference project, with a record in Chapters 2, 3, 4, 5 and 8 that nothing names yet, and one record
  // of each chapter retired through the family, so each page has a record to retire and one to restore.
  const setup = await ctx.newPage(); setup.on('pageerror', e => errors.push(e.message));
  await setup.goto(base + '/', {waitUntil: 'networkidle'});
  const made = await setup.evaluate(async () => {
    const created = await (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Lifecycle', template: 'bank-payment', brief: ''})})).json();
    const id = created.document.id; let state = await (await fetch('/api/project?project=' + id, {credentials: 'same-origin'})).json();
    const send = async (type, payload) => { const r = await fetch('/api/commands?project=' + id, {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({revision: state.revision, command: {type, payload}})}); const body = await r.json(); if (!r.ok) throw Error(type + ': ' + body.error); state = body; return body.selected; };
    const driver = await send('quality.driver', {kind: 'business', title: 'Open a branch in a week', description: 'A new branch takes payments within a week.', impact: 'Branch set-up is configuration, not a release.'});
    const kept = await send('quality.driver', {kind: 'business', title: 'Halve the cost of a payment', description: 'A payment costs half of what it costs today.', impact: 'Shared services over dedicated ones.'});
    const decision = await send('decision.save', {question: 'Where are statements archived?', context: 'Statements are kept for years.'});
    const question = await send('decision.save', {question: 'Which channel sends payment notices?', context: 'Customers choose a channel.'});
    const responsibility = await send('logical.responsibility', {title: 'Archive old statements', purpose: 'Keeps statements for their retention period.', boundary: 'Statements only.', owner: 'Operations', source: 'Lifecycle suite', requirementIds: ['REQ-001']});
    const component = await send('realisation.component', {title: 'Statement archive', kind: 'store', purpose: 'Keeps statements.'});
    const party = await send('interfaces.party', {title: 'Statement printer', purpose: 'Prints paper statements.'});
    const printer = await send('interfaces.party', {title: 'Tax authority gateway', purpose: 'Receives tax reports.'});
    const retire = [[1, 'SCP-002'], [2, driver], [3, decision], [4, 'REL-002'], [5, 'INT-005'], [6, 'TN-001'], [7, 'RM-001'], [8, party], [9, 'thr-002'], [10, 'zone-b']];
    for (const [chapter, rid] of retire) await send('record.retire', {ids: [rid], chapter, reason: 'Retired by the lifecycle suite.'});
    return {id, retired: Object.fromEntries(retire), select: {1: 'REQ-001', 2: kept, 3: question, 4: responsibility, 5: component, 6: 'postgres', 7: 'tr-001', 8: printer, 9: 'oauth', 10: 'run-001'}};
    // rc38 (rc41 W4): Chapter 10's record in view is its own placement plan (RUN-001). The payment service (api-pod) that the
    // round-12 suite selected is a Chapter 5 component, which the rc38 Details column shows as a record from another chapter
    // (no Chapter 10 lifecycle on it, by design: its lifecycle is Chapter 5's).
  });
  await setup.close();
  // rc38+ (rc41 W4): the record in view is the record card in the Details column; its lifecycle (Retire, and Restore for
  // what the chapter retired) is the card's "Record lifecycle" fold (details[data-card-section="retire"]). A viewer opens
  // the fold, and so does the suite; the controls are then read as before.
  const lifecycle = async q => {
    await q.waitForSelector('#inspector .record-card details[data-card-section="retire"] .lifecycle', {state: 'attached', timeout: 15000}).catch(async e => { throw Error('no "Record lifecycle" in the record card on ' + new URL(q.url()).search + ' (lifecycle anywhere: ' + await q.$$eval('.lifecycle', xs => xs.length) + ', card sections: ' + JSON.stringify(await q.$$eval('#inspector [data-card-section] > summary', xs => xs.map(x => x.textContent))) + ')', {cause: e}); });
    assert.equal(await q.$eval('#inspector .record-card details[data-card-section="retire"] > summary', e => e.textContent), 'Record lifecycle');
    if (!await q.$('#inspector .record-card details[data-card-section="retire"][open]')) await q.click('#inspector .record-card details[data-card-section="retire"] > summary');
    await q.waitForSelector('#inspector .lifecycle', {timeout: 5000});
  };
  const open = async (chapter, object) => {
    const q = await ctx.newPage(); q.on('pageerror', e => errors.push(e.message));
    await q.goto(base + '/?chapter=' + chapter + '&tab=work&object=' + encodeURIComponent(object) + '&project=' + made.id, {waitUntil: 'networkidle'});
    await lifecycle(q);
    return q;
  };
  const stored = async q => q.evaluate(async id => (await (await fetch('/api/project?project=' + id, {credentials: 'same-origin'})).json()).document, made.id);

  // 1. Every chapter page offers both: Retire for the record in view, Restore for what the chapter retired.
  for (let ch = 1; ch <= 10; ch++) {
    const q = await open(ch, made.select[ch]), a = ATTR[ch];
    const offered = await q.evaluate(([a, retired]) => {
      const box = document.querySelector('#inspector .lifecycle');
      return {retire: !!box.querySelector(`[${a}="lifecycle-retire"]`), restore: !!box.querySelector(`[${a}="lifecycle-restore"][data-lifecycle-id="${retired}"]`), listed: box.querySelector('.lifecycle-retired')?.textContent || '', origin: document.querySelector('#inspector .record-card-head .record-card-state .chip:is(.pass, .draft)')?.textContent || ''};
    }, [a, made.retired[ch]]);
    // Round 12 (GR-GOV-25): the details of the record in view say who or what wrote it, through the one provenance reader.
    assert.match(offered.origin, /^(Written by|Seeded by AIW|Drafted by Sol|Imported|Proposed by guidance)/, `Chapter ${ch}: the record in view says where it came from`);
    assert.ok(offered.retire, `Chapter ${ch}: Retire is offered for ${made.select[ch]}`);
    assert.ok(offered.restore, `Chapter ${ch}: Restore is offered for ${made.retired[ch]}`);
    assert.match(offered.listed, /Retired by the lifecycle suite\./, `Chapter ${ch}: the retired record shows its reason`);
    await q.close();
  }
  pass('every chapter page, Chapters 1 to 10, offers Retire for the record in view and lists what the chapter retired with its reason and a Restore control');

  // 2. A restore and a retirement made on the page, through the one family: Chapter 1 (a page app), Chapter 4 (the
  // logical studio) and Chapter 10 (a Chapters 6–10 studio).
  for (const [ch, retireId, view] of [[1, 'SCP-002', 'SCP-002'], [4, made.select[4], made.select[4]], [10, 'zone-b', 'zone-b']]) {
    const q = await open(ch, made.select[ch]), a = ATTR[ch], restoreId = made.retired[ch];
    await q.click('#inspector .lifecycle-retired summary');
    await q.click(`#inspector [${a}="lifecycle-restore"][data-lifecycle-id="${restoreId}"]`);
    await q.waitForFunction(([a, id]) => !document.querySelector(`#inspector [${a}="lifecycle-restore"][data-lifecycle-id="${id}"]`), [a, restoreId], {timeout: 15000});
    let doc = await stored(q);
    assert.ok(!(doc.retired?.records || []).some(x => x.id === restoreId && x.chapter === ch), `Chapter ${ch}: ${restoreId} is restored`);
    // Retire the record in view (in Chapters 1 and 10 the record just restored) through the page's dialog.
    if (view) { await q.goto(base + '/?chapter=' + ch + '&tab=work&object=' + view + '&project=' + made.id, {waitUntil: 'networkidle'}); await lifecycle(q); }
    await q.click(`#inspector [${a}="lifecycle-retire"]`);
    await q.waitForSelector('dialog[open] #record-retire-form');
    await q.click('dialog[open] #record-retire-form button[type="submit"]');
    assert.ok(await q.$('dialog[open] #record-retire-form'), `Chapter ${ch}: a retirement without a reason is not sent`);
    await q.fill('dialog[open] #record-retire-form [name="reason"]', 'Retired on the page of Chapter ' + ch + '.');
    await q.click('dialog[open] #record-retire-form button[type="submit"]');
    await q.waitForFunction(() => !document.querySelector('dialog[open] #record-retire-form'), null, {timeout: 15000});
    doc = await stored(q);
    const entry = (doc.retired?.records || []).find(x => x.id === retireId && x.chapter === ch);
    assert.ok(entry, `Chapter ${ch}: ${retireId} is retired`);
    assert.equal(entry.reason, 'Retired on the page of Chapter ' + ch + '.');
    assert.ok(entry.actor && entry.at, `Chapter ${ch}: who and when are kept`);
    await q.close();
  }
  pass('on the pages of Chapters 1, 4 and 10 a retired record is restored with Restore, and the record in view is retired through the one retire form, which asks why and keeps the reason, who and when');
  assert.deepEqual(errors, [], 'no page error: ' + errors.join(' | '));
} finally {
  await browser.close();
  server.kill('SIGKILL');
}
console.log(JSON.stringify({suite: 'lifecycle-browser', passed: checks.length, checks}, null, 1));
