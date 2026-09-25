// Rendered checks for the review desk: Chapter 11's Model and Validate's third mode.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and
// optionally AIW_BROWSER_EXECUTABLE. Starts an isolated local server on a free port.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/desk-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => { checks.push(n); if (process.env.DK_DEBUG) console.error('PASS', checks.length, n.slice(0, 60)); };
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const open = async (extra = '') => { await page.goto(base + '/?chapter=11&tab=model' + extra, {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.dk .cm-view', {timeout: 8000}); if (!(await page.$('.cm.dk .cm-view[data-id="vitals"][aria-pressed="true"]'))) await page.click('.cm.dk .cm-view[data-id="vitals"]'); await page.waitForSelector('.cm.dk .dk-cell', {timeout: 8000}); await page.waitForTimeout(400); };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(250); };
  const act = async sel => { await page.$eval(sel, e => e.click()); await page.waitForTimeout(300); };
  const count = async sel => (await page.$$(sel)).length;
  const panel = () => page.$eval('.cm-panel', e => e.innerText);
  const shown = sel => page.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }, sel);
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.dk-cell,.dk-rh')].map(e => [e.dataset.card, e.style.left, e.style.top, e.style.width, e.style.height].join('|')));

  // 1. Chapter 11 opens on the review desk.
  await open();
  assert.ok(await page.$('.cm.dk .cm-view[data-id="vitals"][aria-pressed="true"]'));
  assert.ok(!(await shown('.am-explorer')), 'the explorer steps aside');
  assert.equal(await count('.dk-monitor .dk-tile'), 8); assert.equal(await count('.dk-monitor .dk-ecg'), 8);
  assert.match(await page.$eval('.dk-monitor', e => e.innerText), /AVAILABILITY[\s\S]*99\.9 % · 43\.2 min \/ 30 d[\s\S]*CAPACITY[\s\S]*3,125 req\/s[\s\S]*OBSERVABILITY[\s\S]*0 of 14 monitored/i);
  assert.equal(await count('.dk-rh'), 14); assert.equal(await count('.dk-cell'), 14 * 8);
  assert.equal(await count('.dk-cell.bad'), await page.evaluate(() => document.querySelectorAll('.dk-cell.bad').length));
  assert.equal(await count('.cm-panel .dk-chart, .cm-panel .dk-vd'), 0, 'nothing is selected on arrival');
  assert.match(await panel(), /Where to start[\s\S]*Record how the failure of 12 parts would be seen[\s\S]*Anti-patterns · Chapter 11 findings[\s\S]*Single Point of Failure/i);
  pass('Chapter 11 opens on the review desk: a monitor of 8 system vitals with a heartbeat for every running part, 14 parts on 8 vitals, and where to start with the anti-patterns as findings');

  // 2. A vital reads its arithmetic, the tactics that would move it and where to change it.
  const before = await rects();
  await act('.dk-cell[data-card="C:run-001:capacity"]');
  let p = await panel();
  assert.match(p, /Capacity · RUN-001[\s\S]*Critical[\s\S]*needs 24 replicas[\s\S]*can grow to 1[\s\S]*short by 23[\s\S]*What would move it[\s\S]*Horizontal Scaling[\s\S]*Stateless Design/i);
  assert.ok(await page.$('.cm-panel a[href*="chapter=10"][href*="object=run-001"]'), 'the fix opens Chapter 10 on the plan');
  assert.deepEqual(await rects(), before, 'selecting moves nothing');
  await act('.dk-monitor .dk-tile[data-id="integrity"]');
  assert.ok(await page.$('.dk-ch[data-id="integrity"].on') && await page.$('.dk-monitor .dk-tile[data-id="integrity"][aria-pressed="true"]'), 'a monitor tile follows its vital down every part');
  assert.deepEqual(await rects(), before);
  pass('a vital reads what is recorded against its target, the playbook tactics that would move it and the chapter that changes it; a monitor tile follows one vital down every part; nothing moves');

  // 3. Probes pin a part's chart to the desk and stay there.
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await act('.dk-rh[data-card="run-001"] .dk-probe');
  assert.ok(await page.$('.dk-rh[data-card="run-001"].probed .dk-probe[aria-pressed="true"]'));
  assert.match(await page.$eval('.dk-probes', e => e.innerText), /Probes[\s\S]*1 of 4[\s\S]*RUN-001 Payment service[\s\S]*Capacity/i);
  await act('[data-dk="filter"][data-id="probed"]');
  assert.equal(await count('.dk-rh'), 1);
  await page.reload({waitUntil: 'networkidle'}); await page.waitForSelector('.cm.dk'); await page.waitForTimeout(500);
  assert.equal(await count('.dk-rh'), 1, 'the probes and the filter are kept'); assert.ok(await page.$('.dk-probes'));
  await act('[data-dk="filter"][data-id="all"]');
  await act('.dk-rh[data-card="run-004"]'); await page.waitForTimeout(100);
  p = await panel();
  assert.match(p, /Running part · RUN-004[\s\S]*Settlement worker[\s\S]*Availability[\s\S]*Recovery[\s\S]*Decisions behind it[\s\S]*ADR-001[\s\S]*Specification/i);
  pass('a probe pins a part\'s chart to the desk, the probed parts can be shown alone, and the probes stay across reloads; a part reads its vitals, the decisions behind it and its specification');

  // 4. What it takes: an objective turned into a specification, explored before it is saved.
  await act('[data-dk="view"][data-id="load"]');
  assert.equal(await count('.dk-card'), 16);
  assert.match(await page.$eval('.dk-card[data-card="api-pod"]', e => e.innerText), /APP-001[\s\S]*Short[\s\S]*Payment service[\s\S]*Kubernetes 1\.31[\s\S]*3,125[\s\S]*req\/s[\s\S]*Replicas\s*24/i);
  assert.match(await page.$eval('.dk-card[data-card="tr-002"]', e => e.innerText), /PostgreSQL 17[\s\S]*One primary\s*past it above ≈75,000 users/i);
  assert.match(await page.$eval('.dk-monitor', e => e.innerText), /100,000 concurrent users[\s\S]*the SA Playbook's example[\s\S]*3,125 req\/s[\s\S]*163[\s\S]*16 nodes/i);
  await page.fill('[data-dk-in="value"]', '250000'); await page.waitForTimeout(700);
  assert.match(await page.$eval('.cm.dk .cm-state', e => e.textContent), /250,000 users ÷ \(30 s between requests \+ 2 s response \(QD-003\)\) = 7,813 req\/s/);
  assert.ok(await page.$('[data-dk="reset-objective"]'), 'an explored objective can be reset');
  await act('.dk-card[data-card="api-pod"]');
  p = await panel();
  assert.match(p, /Service · APP-001[\s\S]*7,813 req\/s[\s\S]*The arithmetic[\s\S]*7,813 ÷ \(200 × 70 %\)[\s\S]*Each replica handles/i);
  await page.fill('.cm-panel [data-dk-in="perReplica"]', '1000'); await page.waitForTimeout(700);
  assert.match(await page.$eval('.dk-card[data-card="api-pod"]', e => e.innerText), /Replicas\s*13/, 'a load-tested throughput replaces the assumption');
  await act('.dk-card[data-card="tr-003"]');
  assert.match(await panel(), /RabbitMQ[\s\S]*Backlog to hold[\s\S]*Product rules[\s\S]*quorum queues[\s\S]*Where it is documented/i);
  await act('[data-dk="save-objective"]');
  await page.waitForSelector('dialog.dk-dialog[open]');
  await page.fill('dialog.dk-dialog [name=reviewer]', 'Neme'); await page.check('dialog.dk-dialog [name=reviewed]');
  await page.click('dialog.dk-dialog button[type=submit]'); await page.waitForTimeout(1200);
  assert.ok(!(await page.$('dialog.dk-dialog[open]')));
  assert.match(await page.$eval('.dk-flash', e => e.innerText), /Saved: this review plans for 250,000 concurrent users/);
  assert.ok(await page.$('.dk-saved'), 'the objective reads as saved');
  assert.match(await page.$eval('.dk-monitor', e => e.innerText), /250,000 concurrent users[\s\S]*saved for this review/i);
  pass('what it takes: 100,000 concurrent users become a specification for every part — 24 replicas of APP-001, 940 PostgreSQL connections — explored at 250,000 and with a load-tested throughput before anything is saved, the arithmetic and product rules shown with their sources, then saved as the review objective through its own confirmation');

  // 4b. The product choice: weighed against the drivers, with the objective's switch point.
  assert.match(await page.$eval('.dk-monitor', e => e.innerText), /PRODUCT CHOICES[\s\S]*3 to revisit[\s\S]*of 9 with alternatives/i);
  assert.match(await page.$eval('.dk-card[data-card="tr-003"]', e => e.innerText), /The drivers lean to Apache Kafka \(suggested\)/);
  if (!(await page.$('.dk-card[data-card="tr-003"].sel'))) await act('.dk-card[data-card="tr-003"]');
  p = await panel();
  assert.match(p, /The product choice[\s\S]*RabbitMQ[\s\S]*one queue[\s\S]*lean to Apache Kafka[\s\S]*One queue's leader takes every message on it[\s\S]*As the drivers weigh them[\s\S]*Record 12 suggested judgements in Chapter 7/i);
  assert.ok(await page.$('.cm-panel .ch-table td.suggested') && await page.$('.cm-panel .ch-table thead th.lean'));
  await act('.cm-panel [data-dk="record-suggestions"]');
  await page.waitForSelector('dialog.ch-dialog[open]');
  assert.equal(await count('dialog.ch-dialog [name=s]'), 12); assert.equal(await count('dialog.ch-dialog [name=s]:checked'), 10, 'a product the playbook merely names is left unticked');
  await page.check('dialog.ch-dialog [name=reviewed]'); await page.click('dialog.ch-dialog button[type=submit]'); await page.waitForTimeout(2500);
  assert.match(await page.$eval('.dk-flash', e => e.innerText), /10 judgements recorded in Chapter 7 for TR-003/);
  await page.goto(base + '/?chapter=7&tab=model', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.sk'); await page.waitForTimeout(500);
  await page.$eval('.sk-rec[data-sel="tr-003"]', e => e.click()); await page.waitForTimeout(400);
  await page.$eval('.cm-panel [data-sk="compare"]', e => e.click()); await page.waitForTimeout(800);
  assert.equal(await count('.sk-weigh'), 2); assert.ok(await page.$('.sk-weigh.lean') && await page.$('.sk-lean'));
  assert.equal(await count('.sk-as.supports:not(.sug)'), 7, 'the recorded judgements stand in Chapter 7');
  assert.match(await panel(), /The choice · TR-003[\s\S]*10 recorded[\s\S]*recorded judgements lean to Apache Kafka/i);
  await open();
  pass('each product choice is weighed against the drivers it carries: suggestions from what each product is documented to do, the lean, and where the objective passes one queue; recorded through Chapter 7\'s own judgements, they stand in Chapter 7\'s options with the weighing');

  // 5. Trace, a decision probe, and asking both ways to review.
  await act('[data-dk="view"][data-id="trace"]');
  assert.equal(await count('.dk-tr'), 5); assert.equal(await count('.dk-th'), 9);
  assert.equal(await count('.dk-gap.break'), 0, 'every thread reaches where it runs');
  await act('.dk-chip[data-sel="ADR-001"]');
  p = await panel();
  assert.match(p, /Decision · ADR-001[\s\S]*the drivers lean to[\s\S]*Acknowledge a durable asynchronous handoff[\s\S]*Request-Reply[\s\S]*Message Broker[\s\S]*What choosing it reaches[\s\S]*Earlier chapters[\s\S]*REQ-001[\s\S]*QD-006[\s\S]*Later chapters[\s\S]*RUN-004[\s\S]*Ask these 16 records to review/i);
  await act('.cm-panel [data-dk="ask-decision"]');
  await page.waitForSelector('dialog.dk-dialog[open]');
  assert.equal(await count('dialog.dk-dialog [name=item]:checked'), 16);
  await page.check('dialog.dk-dialog [name=reviewed]');
  await page.click('dialog.dk-dialog button[type=submit]'); await page.waitForTimeout(1200);
  assert.match(await page.$eval('.dk-flash', e => e.innerText), /CHG-\d{3} recorded: 16 records asked to review/);
  assert.ok(await page.$('.dk-flash [data-dk="open-change"]'));
  pass('the trace follows each requirement through the chapters; a decision under a probe reads its alternatives, their patterns and effects, and what it reaches both ways — and asks those 16 records to review, remembering who asks');

  // 6. Choosing a decision asks earlier and later chapters to review.
  const events = () => page.evaluate(() => window.aiwProjectStore.value.document.changes.events.length);
  const n0 = await events();
  await page.evaluate(() => window.aiwProjectStore.command({type: 'decision.choose', payload: {id: 'ADR-002', alternativeId: 'ALT-003'}}));
  const doc = await page.evaluate(() => window.aiwProjectStore.value.document);
  assert.equal(doc.changes.events.length, n0 + 1);
  const ev = doc.changes.events.at(-1);
  assert.equal(ev.source.id, 'ADR-002'); assert.ok(ev.items.some(i => i.chapter === 1) && ev.items.some(i => i.chapter === 2) && ev.items.some(i => i.chapter >= 4));
  await page.goto(base + '/?chapter=2&tab=work', {waitUntil: 'networkidle'}); await page.waitForTimeout(900);
  assert.match(await page.evaluate(() => document.body.innerText), /ADR-002 changed[\s\S]*affected records need review/, 'an earlier chapter is told');
  pass('choosing a working choice in Chapter 3 records a change that asks Chapters 1 and 2 as well as the later chapters to review, and an earlier chapter shows it');

  // 7. The rounds.
  await open();
  await act('[data-dk="walk-next"]');
  assert.match(await page.$eval('.cm-walk', e => e.innerText), /1 \/ \d+\s+Record how the failure of 12 parts would be seen/);
  assert.equal(await count('.dk-rh.lit'), 12);
  await act('[data-dk="walk-next"]');
  assert.match(await page.$eval('.cm-walk', e => e.innerText), /2 \/ \d+\s+Size 9 parts for the objective|2 \/ \d+/);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  assert.equal(await count('.dk-rh.lit'), 0);
  pass('the rounds walk the vitals that read critical or silent, the most first, then each anti-pattern; Escape stops');

  // 8. Validate's third mode, on any chapter.
  await page.goto(base + '/?chapter=5&tab=validate', {waitUntil: 'networkidle'}); await page.waitForSelector('.vx-switch'); await page.waitForTimeout(500);
  assert.equal(await count('.vx-switch button'), 3);
  await click('.vx-switch [data-id="desk"]'); await page.waitForSelector('.cm.dk .dk-monitor .dk-tile'); await page.waitForTimeout(400);
  assert.equal(await page.$eval('.cm.dk .cm-title small', e => e.textContent), 'Chapter 5 · Validate');
  assert.ok(!(await shown('.cm.dk [data-dk="explore"]')) && !(await shown('.vx-ready')), 'the desk has the surface to itself');
  assert.equal(await count('.cm'), 1, 'only one model on the page');
  await click('.vx-switch [data-id="readiness"]'); await page.waitForTimeout(500);
  assert.ok(await page.$('.vx-ready') && !(await page.$('.cm.dk')));
  await page.goto(base + '/?chapter=5&tab=model', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm.rz'); await page.waitForTimeout(300);
  assert.ok(!(await page.$('.cm.dk')) && !(await page.evaluate(() => document.body.classList.contains('dk-validate'))));
  pass('Validate offers the review desk beside SDD readiness and the model views, on every chapter; it takes the surface on its own and leaves when the switch or the tab changes');

  // 9. Treating an anti-pattern in Chapter 11.
  await open();
  await act('.cm-panel [data-dk="treat"]');
  await page.waitForSelector('dialog[open]', {timeout: 5000});
  assert.match(await page.$eval('dialog[open]', e => e.innerText), /Assess this source finding[\s\S]*Single Point of Failure/i);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  if (await page.$('dialog[open]')) await page.evaluate(() => document.querySelector('dialog[open]').close());
  pass('an anti-pattern on the desk is treated with Chapter 11\'s own assessment');

  // 10. Drafted fixes: preview on the desk, change the number, apply through the change review.
  await open();
  assert.match(await page.$eval('.cm-panel .dk-tray', e => e.innerText), /Drafted fixes[\s\S]*drafted from the desk's own numbers[\s\S]*Needs your judgement/i);
  assert.ok(await count('.dk-cell .dk-rx') > 20, 'the cells with a drafted fix carry ℞');
  assert.ok(await count('.cm-panel .dk-step .dk-rxn') >= 5 && await count('.cm-panel [data-dk="fix-apply-step"]') >= 5, 'each step of where to start offers its drafts');
  await act('[data-card="C:run-001:capacity"]');
  const fx = await page.$$eval('.cm-panel .dk-fix', xs => xs.map(e => e.innerText).join('\n'));
  const need = Number((fx.match(/Let RUN-001 grow to ([\d,]+) replicas/) || [])[1]?.replace(/,/g, ''));
  assert.ok(need > 1, 'the draft names the replicas the objective needs'); assert.match(fx, /What changes · 1[\s\S]*Maximum replicas[\s\S]*On the desk[\s\S]*1 vital change: 1 to normal/i);
  assert.equal(await page.$eval('.dk-fix [data-dk-in="fix"][data-key="maxReplicas"]', e => e.value), String(need));
  await act('.dk-fix [data-dk="fix-preview"]');
  assert.ok(await page.$('.dk-preview')); assert.match(await page.$eval('.dk-preview', e => e.innerText), /Preview · nothing is applied[\s\S]*1 vital change: 1 to normal/i);
  assert.ok(await page.$('.dk-cell.ok.chg[data-card="C:run-001:capacity"] .dk-was.bad'), 'the cell reads as it would, ringed, with the state it had');
  assert.ok(await page.$('.dk-monitor .dk-tile.chg'), 'the monitor shows what would change');
  await page.fill('.dk-fix [data-dk-in="fix"][data-key="maxReplicas"]', '2'); await page.waitForTimeout(700);
  assert.ok(await page.$('.dk-cell.bad[data-card="C:run-001:capacity"]'), 'two replicas are still short: the desk reads the architect\'s number');
  await page.fill('.dk-fix [data-dk-in="fix"][data-key="maxReplicas"]', String(need)); await page.waitForTimeout(700);
  assert.ok(await page.$('.dk-cell.ok.chg[data-card="C:run-001:capacity"]'));
  await page.$eval('.dk-fix [data-dk-in="fix"]', e => e.blur()); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  assert.ok(!(await page.$('.dk-preview')), 'Escape stops the preview');
  await act('.cm-panel .dk-fix [data-dk="fix-apply"]');
  await page.waitForSelector('dialog[open]', {timeout: 5000});
  assert.match(await page.$eval('dialog[open]', e => e.innerText), /Review this design change[\s\S]*Drafted on the review desk[\s\S]*maxReplicas[\s\S]*I reviewed the changed definition/);
  await page.click('dialog[open] [data-wb-action="apply-preview"]'); await page.waitForTimeout(250);
  assert.match(await page.$eval('dialog[open] [data-error]', e => e.textContent), /Review the changed definition/, 'nothing is applied unreviewed');
  await page.check('dialog[open] [data-reviewed]'); await page.click('dialog[open] [data-wb-action="apply-preview"]');
  await page.waitForSelector('.dk-flash', {timeout: 8000}); await page.waitForTimeout(300);
  assert.match(await page.$eval('.dk-flash', e => e.innerText), /Applied through Chapter 10's change review: Let RUN-001 grow to [\d,]+ replicas\. 1 vital change: 1 to normal/);
  assert.ok(await page.$('.dk-cell.ok.pulse[data-card="C:run-001:capacity"]'), 'the cell turns, and pulses');
  assert.equal(await page.evaluate(() => window.aiwProjectStore.value.document.runtime.plans.find(r => r.id === 'run-001').maxReplicas), need);
  pass('a drafted fix: preview it and the cell reads as it would, ringed with the state it had; change its number and the desk reads it again; unreviewed it is refused; applied through Chapter 10\'s change review the cell turns normal and pulses');

  // A whole step at once, and keeping a draft as an alternative instead.
  await act('.cm-crumbs [data-dk="clear"]');
  const step = await page.$$eval('.cm-panel .dk-step', xs => xs.findIndex(x => /Record how the failure of 12 parts would be seen/.test(x.innerText)));
  assert.ok(step >= 0);
  await act(`.cm-panel [data-dk="fix-apply-step"][data-i="${step}"]`);
  await page.waitForSelector('dialog[open]', {timeout: 5000});
  assert.match(await page.$eval('dialog[open]', e => e.innerText), /12 changes[\s\S]*12 to normal/);
  await page.check('dialog[open] [data-reviewed]'); await page.click('dialog[open] [data-wb-action="apply-preview"]');
  await page.waitForSelector('.dk-flash', {timeout: 8000}); await page.waitForTimeout(300);
  assert.match(await page.$eval('.dk-flash', e => e.innerText), /Applied through Chapter 10's change review: 12 drafted fixes\. 12 vitals change: 12 to normal/);
  assert.match(await page.$eval('.dk-monitor', e => e.innerText), /12 of 14 monitored/);
  await act('[data-card="C:run-001:integrity"]');
  await act('.cm-panel .dk-fix [data-dk="fix-apply"]');
  await page.waitForSelector('dialog[open]', {timeout: 5000});
  await page.click('dialog[open] [data-wb-action="retain-preview"]'); await page.fill('dialog[open] [name="title"]', 'Idempotency keys from the desk'); await page.click('dialog[open] [data-wb-action="retain-preview"]');
  await page.waitForSelector('.dk-flash', {timeout: 8000}); await page.waitForTimeout(300);
  assert.match(await page.$eval('.dk-flash', e => e.innerText), /Kept as a design alternative, “Idempotency keys from the desk”: nothing changed in the working design/);
  assert.ok(await page.$('.dk-cell.bad[data-card="C:run-001:integrity"]'), 'kept, not applied');
  pass('a whole step at once: monitoring for 12 parts in one Chapter 10 review turns 12 readings normal; a draft kept as a design alternative leaves the working design as it was');

  // Sol without a provider: what it would read is still shown, and nothing can be sent.
  assert.match(await page.$eval('.dk-solchip', e => e.innerText), /Sol\s*not connected/);
  await act('[data-card="C:run-001:integrity"]');
  await act('.cm-panel [data-dk="sol-ask"]'); await page.waitForSelector('.dk-solpend', {timeout: 5000});
  assert.match(await page.$eval('.dk-solpend', e => e.innerText), /Sol will read \d+ sources[\s\S]*desk reading[\s\S]*Sol is not connected/i);
  assert.ok(await page.$('.dk-solpend [data-dk="sol-send"][disabled]'), 'nothing can be sent without a provider');
  await act('.dk-solpend [data-dk="sol-cancel"]');
  assert.ok(!(await page.$('.dk-solpend')));
  pass('without a provider Sol says so; what it would read is still prepared and shown, and nothing can be sent');

  // Preview them all.
  await act('.cm-crumbs [data-dk="clear"]');
  await act('.cm-panel [data-dk="fix-preview-all"]');
  assert.match(await page.$eval('.dk-preview', e => e.innerText), /drafted fixes[\s\S]*to normal/i);
  assert.ok(await count('.dk-cell.chg') > 20);
  assert.match(await panel(), /Previewing[\s\S]*nothing applied[\s\S]*Review the first 20 changes/i);
  await act('.dk-preview [data-dk="fix-stop"]');
  assert.equal(await count('.dk-cell.chg'), 0);
  pass('every drafted fix previewed together shows the monitor as it would read, to be reviewed 20 changes at a time');

  // 11. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const m = await phone.newPage(); m.on('pageerror', e => errors.push(e.message));
  await m.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'}); await m.waitForSelector('.cm.dk'); await m.waitForTimeout(500);
  const box = await m.$eval('.cm-stage', e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
  assert.ok(box[0] > 300 && box[1] > 300, 'a usable canvas');
  assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal page scroll');
  await phone.close();
  pass('on a 390 px phone the desk has a usable canvas and no horizontal page scroll');

  assert.deepEqual(errors, []);
  pass('no page errors');
} finally {
  await browser.close(); server.kill();
  try { rmSync(db, {force: true}); rmSync(db + '-wal', {force: true}); rmSync(db + '-shm', {force: true}); } catch { /* best effort */ }
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
