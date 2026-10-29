// A model in, rendered (round 6, Contract I; public/projects.js, public/brief-reader.js, public/journey-draft-ui.js):
// a project created on the Projects page from the Structurizr fixture (read and counted in the browser, the text kept
// with the project) with the bike-share brief beside it; Chapter 1 drafted from the model at phone width without
// overflow; the chapters drafted from the model and accepted through the journey draft surface, Chapters 4, 5, 8 and
// 10 read from the model; the saved records carrying provenance.journey.mode 'model' with the source, asserted through
// the API; the switch between the brief and the model; a model without a brief; markup in a model name kept inert.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally
// AIW_BROWSER_EXECUTABLE. Starts an isolated local server on a free port with no LLM key.
// Run: node model-import-browser-validate.mjs
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync, rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/model-import-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } });
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [], failed = [], pass = n => { checks.push(n); process.stderr.write('passed: ' + n.slice(0, 90) + '\n'); };
const FIXTURE = resolve('evaluation/model-fixtures/bike-share.dsl'), DSL = readFileSync(FIXTURE, 'utf8'), BRIEF = readFileSync('evaluation/model-fixtures/bike-share-brief.txt', 'utf8').replace(/\n$/, '');
const sha = t => createHash('sha256').update(t).digest('hex');
const settle = async (page, ms = 500) => { await page.waitForLoadState('networkidle'); await page.waitForTimeout(ms); };
// A wait that ends without the drafted surface says what the page held then (round 23: the suite once timed out in the
// full regression and passed 25 runs since, alone and under load), so a recurrence names its cause.
const unloaded = [];
const surfaceState = page => page.evaluate(() => ({url: location.pathname + location.search, heading: document.querySelector('.jd h2')?.textContent || null, actions: !!document.querySelector('.jd .jd-actions'), acceptDisabled: !!document.querySelector('.jd [data-jd-act="accept"][disabled]'), status: document.querySelector('.jd [role="status"]')?.textContent || null, error: document.querySelector('.jd-error')?.textContent || null, shell: !!document.querySelector('.studio > .stage.tab-content'), project: !!window.aiwProjectStore?.value?.document})).catch(e => ({unreadable: e.message}));
const said = async (page, e) => { const at = '\nWhen the wait ended: ' + JSON.stringify({surface: await surfaceState(page), pageErrors: errors, failedApi: failed, failedRequests: unloaded.slice(-20)}); e.message += at; e.stack = (e.stack || '') + at; throw e; };
const drafted = (page, ch) => page.waitForFunction(c => { const h = document.querySelector('.jd h2'); return !!h && h.textContent.includes('Chapter ' + c + ' ·') && !!document.querySelector('.jd .jd-actions') && !document.querySelector('.jd [data-jd-act="accept"][disabled]'); }, ch, {timeout: 60000}).catch(e => said(page, e));
const accepted = (page, ch) => page.waitForFunction(c => new RegExp('Chapter ' + c + ' accepted').test(document.querySelector('.jd-message')?.textContent || '') || !!document.querySelector('.jd-error'), ch, {timeout: 180000});
const noOverflow = async (page, width) => { const w = await page.evaluate(() => ({doc: document.documentElement.scrollWidth, body: document.body.scrollWidth})); assert.ok(w.doc <= width && w.body <= width, `no horizontal overflow at ${width} px: ${JSON.stringify(w)}`); };
const watch = page => { page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() >= 400 && r.url().includes('/api/')) failed.push(r.status() + ' ' + r.url().replace(base, '')); }); page.on('requestfailed', r => unloaded.push(r.url().replace(base, '') + ' ' + (r.failure()?.errorText || ''))); };
const measured = {};

try {
  // 1. The Projects page: a model file chosen, read and counted in the browser; the brief typed beside it; created.
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}}), page = await ctx.newPage(); watch(page);
  await page.goto(base + '/?view=projects'); await settle(page);
  await page.click('#new-project'); await page.fill('input[name=name]', 'Town bike share');
  await page.setInputFiles('input[name=modelFile]', FIXTURE);
  await page.waitForFunction(() => /Read as Structurizr DSL/.test(document.querySelector('#model-reading')?.textContent || ''), null, {timeout: 20000});
  const reading = await page.$eval('#model-reading', e => e.textContent), source = await page.$eval('#model-source', e => e.textContent);
  assert.match(reading, /Read as Structurizr DSL: 26 elements \(7 containers, 1 environment, 6 instances, 5 nodes, 3 persons, 4 systems\), 13 relationships, 3 views; 20 names are stated in the file, 6 inferred; 0 questions the model leaves open\. Nothing is created yet/, reading);
  assert.ok(source.includes('bike-share.dsl') && source.includes(sha(DSL)), 'the model file is named with its SHA-256: ' + source);
  assert.equal(await page.$eval('#create-submit', b => b.textContent), 'Start from this model →');
  await page.fill('textarea[name=brief]', BRIEF); await page.waitForTimeout(400);
  assert.equal(await page.$eval('#create-submit', b => b.textContent), 'Start from this brief and model →');
  assert.equal(await page.$eval('#model-error', e => e.hidden), true);
  await Promise.all([page.waitForURL(/chapter=1&tab=work&project=/, {timeout: 30000}), page.click('#create-submit')]);
  const id = new URL(page.url()).searchParams.get('project');
  const project = () => page.evaluate(async id => (await (await fetch('/api/project?project=' + id, {credentials: 'same-origin'})).json()).document, id);
  let p = await project();
  assert.deepEqual(p.coauthoring.sources.map(s => [s.id, s.kind, s.name]), [['SRC-001', 'brief', 'Opening brief'], ['SRC-002', 'model', 'bike-share.dsl']]);
  assert.deepEqual([p.coauthoring.sources[1].hash, p.coauthoring.sources[1].text === DSL, p.coauthoring.sources[1].format, p.model.interpreted.elements, p.model.interpreted.sourceId, p.artefacts.length], [sha(DSL), true, 'structurizr', 26, 'SRC-002', 0], 'the model is kept whole with its hash and counts; nothing is drafted');
  pass('the Projects page reads a Structurizr file in the browser, counts what the model reader read (26 elements by kind, 13 relationships, 3 views, 20 stated), names the file with its SHA-256, takes a brief beside it, and creates the project with both kept as sources and nothing drafted');

  // A file that is no model is refused on the page, with the reason; the page stays usable.
  await page.goto(base + '/?view=projects'); await settle(page);
  await page.click('#new-project');
  await page.setInputFiles('input[name=modelFile]', {name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Just some notes about bikes.')});
  await page.waitForFunction(() => !document.querySelector('#model-error').hidden, null, {timeout: 10000});
  assert.match(await page.$eval('#model-error', e => e.textContent), /notes\.txt was not read as a model/);
  assert.equal(await page.$eval('#create-submit', b => b.textContent), 'Create & open Chapter 1 →');
  await page.click('#cancel-project');
  pass('a file the model reader does not recognise is refused on the page with the reader\'s reason, and nothing is sent');

  // 2. Phone width: the Projects dialog with a model chosen, and Chapter 1 drafted from the model, without overflow.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}), ph = await phone.newPage(); watch(ph);
  await ph.goto(base + '/?view=projects'); await settle(ph);
  await ph.click('#new-project'); await ph.setInputFiles('input[name=modelFile]', FIXTURE);
  await ph.waitForFunction(() => /Read as Structurizr DSL/.test(document.querySelector('#model-reading')?.textContent || ''), null, {timeout: 20000});
  await noOverflow(ph, 390);
  assert.ok((await ph.$eval('#project-dialog form', f => f.scrollWidth)) <= 390, 'the dialog fits the phone');
  await ph.click('#cancel-project');
  await ph.goto(base + '/?chapter=1&tab=work&journey=draft&mode=model&project=' + id); await drafted(ph, 1);
  await noOverflow(ph, 390);
  assert.ok((await ph.$eval('.jd', e => e.scrollWidth)) <= 390, 'the draft surface fits the phone');
  assert.match(await ph.$eval('.jd-kicker', e => e.textContent), /from the model/);
  assert.ok(await ph.$$eval('.jd-card', cs => cs.length) >= 40, 'the cards are drawn at phone width');
  await phone.close();
  pass('at 390 px the Projects dialog with a model chosen and Chapter 1 drafted from the model draw without horizontal overflow');

  // 3. Chapter 1 from the model: model cards and brief cards side by side, the model's lines quoted, Sol not consulted; accepted.
  await page.goto(base + '/?chapter=1&tab=work&journey=draft&mode=model&project=' + id); await drafted(page, 1);
  assert.match(await page.$eval('.jd-kicker', e => e.textContent), /Chapter 1 of 11 · from the model/);
  const heads = await page.$$eval('.jd-card > header > small', ss => ss.map(s => s.textContent));
  assert.equal(heads.filter(h => h.includes('Model draft · bike-share.dsl')).length, 3, 'three cards read from the model');
  assert.ok(heads.filter(h => h.includes('Deterministic draft')).length >= 30, 'the brief\'s cards beside them');
  assert.deepEqual(await page.$$eval('.jd-card', cs => cs.slice(0, 3).map(c => c.querySelector('h3').textContent)), ['Resident', 'Transport team', 'Rebalancing contractor']);
  assert.ok(await page.$$eval('.jd-card:nth-child(1) .jd-tag.stated', t => t.length) >= 2, 'a model card\'s title and description are stated');
  const lineRef = await page.$eval('.jd-card:nth-child(1) .jd-tag.stated a', a => ({href: a.getAttribute('href'), title: a.getAttribute('title')}));
  assert.match(lineRef.href, /^#jd-m-P-\d{3}$/); assert.match(lineRef.title, /^Model line P-/);
  const lines = await page.$$eval('#inspector .jd-model-lines li', li => li.map(l => ({id: l.id, text: l.textContent})));
  assert.ok(lines.length >= 3 && lines.every(l => /^jd-m-P-\d{3}$/.test(l.id)) && lines.some(l => /person "Resident"/.test(l.text)), 'the model\'s lines are quoted in the companion');
  assert.ok(await page.$$eval('#inspector .jd-passages:not(.jd-model-lines) li', li => li.length) >= 3, 'and the brief\'s passages beside them');
  assert.match(await page.$eval('.jd-sol', e => e.textContent), /Sol is not consulted for a model draft/);
  assert.equal(await page.$('[data-jd-act="sol"]'), null);
  assert.match(await page.$eval('.jd-switch', e => e.textContent), /Drafted from the model bike-share\.dsl · Structurizr DSL · 26 elements, 20 stated names/);
  assert.ok(await page.$('[data-jd-act="mode"][data-jd-mode="brief"]'), 'the switch to the brief is offered');
  await page.click('[data-jd-act="accept"]'); await accepted(page, 1);
  assert.equal(await page.$('.jd-error'), null, await page.$eval('.jd-error', e => e.textContent).catch(() => ''));
  p = await project();
  const actors = p.artefacts.filter(a => a.type === 'actor');
  assert.deepEqual(actors.map(a => [a.title, a.provenance.journey.mode, a.provenance.journey.sourceId]), [['Resident', 'model', 'SRC-002'], ['Transport team', 'model', 'SRC-002'], ['Rebalancing contractor', 'model', 'SRC-002']]);
  assert.ok(actors.every(a => a.provenance.journey.passages.length && a.confirmed === false));
  assert.ok(p.artefacts.filter(a => a.type === 'requirement').every(a => a.provenance.journey.mode === 'deterministic' && !a.provenance.journey.sourceId), 'the brief\'s records keep the deterministic provenance');
  assert.ok(p.guidance.sessions.find(s => s.chapter === 1).history.some(h => h.provenance?.mode === 'model' && h.provenance.sourceId === 'SRC-002'), 'the guide session history keeps the model provenance');
  pass('Chapter 1 drafted from the model: the model\'s three people as cards marked "Model draft" with stated values linking to the quoted model lines, the brief\'s records beside them, Sol not consulted; accepted through the chapter guide, the actors carry provenance.journey mode model with the source, the brief\'s records stay deterministic');

  // 4. Chapters 2 to 10 in turn, from the model: 4, 5, 8 and 10 read from the model, the rest from the brief rules.
  const gained = {};
  for (let ch = 2; ch <= 10; ch++) {
    await page.click('[data-jd-act="next"]'); await drafted(page, ch);
    assert.match(await page.$eval('.jd-kicker', e => e.textContent), /from the model/, `Chapter ${ch} keeps the model mode`);
    const smalls = await page.$$eval('.jd-card > header > small', ss => ss.map(s => s.textContent)), fromModel = smalls.filter(h => h.includes('Model draft')).length;
    if ([4, 5, 7, 8, 10].includes(ch)) assert.equal(fromModel, smalls.length, `Chapter ${ch} is read from the model (${fromModel} of ${smalls.length})`);
    else assert.equal(fromModel, 0, `Chapter ${ch} falls back to the brief rules`);
    if (ch === 4) assert.deepEqual(await page.$$eval('.jd-card h3', hs => hs.map(h => h.textContent)), ['Mobile app', 'Dock gateway', 'Trip service', 'Pricing and payment service', 'Fleet console', 'Trip store', 'Trip events']);
    if (ch === 8) { assert.equal(await page.$$eval('.jd-card', cs => cs.length), 10, 'ten contracts'); assert.ok((await page.$$eval('.jd-field .jd-value', vs => vs.map(v => v.textContent))).some(t => /event/i.test(t)), 'some of them events'); }
    gained[ch] = {cards: smalls.length, fromModel, stated: await page.$$eval('.jd-tag.stated', t => t.length)};
    await page.click('[data-jd-act="accept"]'); await accepted(page, ch);
    assert.equal(await page.$('.jd-error'), null, `Chapter ${ch}: ` + await page.$eval('.jd-error', e => e.textContent).catch(() => ''));
  }
  p = await project();
  const ofModel = xs => xs.length && xs.every(x => x.provenance?.journey?.mode === 'model' && x.provenance.journey.sourceId === 'SRC-002');
  assert.deepEqual([p.logical.responsibilities.length, p.realisation.components.length, p.interfaces.contracts.length, p.interfaces.parties.length, p.runtime.plans.length, p.technologyRealisation.records.length], [7, 7, 10, 3, 6, 7]);
  assert.ok(ofModel(p.logical.responsibilities) && ofModel(p.realisation.components) && ofModel(p.interfaces.contracts) && ofModel(p.interfaces.parties) && ofModel(p.runtime.plans) && ofModel(p.technologyRealisation.records), 'Chapters 4, 5, 7, 8 and 10 carry provenance.journey mode model with the source');
  assert.ok(p.quality.drivers.every(x => x.provenance.journey.mode === 'deterministic') && p.decisions.records.every(x => x.provenance.journey.mode === 'deterministic') && p.security.threats.every(x => x.provenance.journey.mode === 'deterministic'), 'Chapters 2, 3 and 9 stay deterministic');
  assert.deepEqual(p.realisation.components.map(c => [c.title, c.kind]).filter(([t]) => ['Trip store', 'Trip events', 'Dock gateway'].includes(t)), [['Dock gateway', 'adapter'], ['Trip store', 'store'], ['Trip events', 'queue']]);
  assert.deepEqual(p.interfaces.parties.map(x => x.title), ['Dock hardware', 'Payment provider', 'Email service']);
  assert.deepEqual(p.interfaces.contracts.filter(c => c.kind === 'event').map(c => c.title), ['Reports unlock and return events', 'Publishes trip completed', 'Subscribes to trip completed']);
  const placements = p.runtime.placements.map(x => [p.runtime.plans.find(r => r.id === x.planId)?.title.replace(/ live design$/, ''), x.replicas, x.confirmed]);
  assert.deepEqual(placements.filter(([t]) => ['Trip service', 'Trip store', 'Dock gateway'].includes(t)), [['Trip service', 2, false], ['Trip store', 1, false], ['Dock gateway', 40, false]], 'the instance counts the model states are the replicas, unconfirmed');
  const every = [...p.artefacts, ...p.quality.drivers, ...p.decisions.records, ...p.logical.responsibilities, ...p.realisation.components, ...p.technology.capabilities, ...p.interfaces.contracts, ...p.interfaces.data, ...p.interfaces.parties, ...p.security.threats, ...p.security.controls, ...p.runtime.environments, ...p.runtime.plans, ...p.runtime.placements];
  assert.deepEqual(every.filter(r => r.confirmed === true || r.targetConfirmed === true).map(r => r.id), [], 'nothing is confirmed');
  measured.chapters = gained;
  pass('Chapters 2 → 10 drafted from the model and accepted in turn: 4, 5, 7, 8 and 10 read from the model (' + Object.entries(gained).map(([c, g]) => `${c}:${g.fromModel}/${g.cards}`).join(' ') + '), the others from the brief rules; the saved responsibilities, components (with their roles), contracts (events where the model says so), parties, implementations and plans (with the stated replicas) carry provenance.journey mode model with the source; nothing confirmed');

  // 5. The switch: a brief draft says a model is kept and offers it; a model-only project has no brief to switch to.
  const second = await page.evaluate(async ([brief, dsl]) => (await (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Switch', template: 'blank', brief, model: {text: dsl, name: 'bike-share.dsl', kind: 'dsl'}})})).json()).document.id, [BRIEF, DSL]);
  await page.goto(base + '/?chapter=1&tab=work&journey=draft&project=' + second); await drafted(page, 1);
  assert.doesNotMatch(await page.$eval('.jd-kicker', e => e.textContent), /from the model/);
  assert.match(await page.$eval('.jd-switch', e => e.textContent), /Drafted from the brief\. This project also keeps a model, bike-share\.dsl · Structurizr DSL\./);
  assert.ok(await page.$('[data-jd-act="sol"]') === null && /Sol was not consulted/.test(await page.$eval('.jd-sol', e => e.textContent)), 'the brief draft stands as before');
  await page.click('[data-jd-act="mode"][data-jd-mode="model"]'); await drafted(page, 1);
  assert.match(await page.$eval('.jd-kicker', e => e.textContent), /from the model/);
  assert.equal(await page.$$eval('.jd-card > header > small', ss => ss.filter(s => s.textContent.includes('Model draft')).length), 3);
  await page.click('[data-jd-act="mode"][data-jd-mode="brief"]'); await drafted(page, 1);
  assert.doesNotMatch(await page.$eval('.jd-kicker', e => e.textContent), /from the model/);
  const alone = await page.evaluate(async dsl => (await (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Model alone', template: 'blank', model: {text: dsl, name: 'bike-share.dsl', kind: 'dsl'}})})).json()).document.id, DSL);
  await page.goto(base + '/?chapter=1&tab=work&journey=draft&mode=model&project=' + alone); await drafted(page, 1);
  assert.equal(await page.$$eval('.jd-card', cs => cs.length), 3, 'a model without a brief drafts the model\'s records alone');
  assert.equal(await page.$('[data-jd-act="mode"]'), null, 'no brief to switch to');
  pass('the surface switches between the brief and the model where the project keeps both; a project with a model alone drafts from it with no switch');

  // 6. Markup in a model name stays inert text on the surface and in the companion.
  const hostile = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>Resident';
  const bad = await page.evaluate(async dsl => (await (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Hostile model', template: 'blank', model: {text: dsl, name: 'hostile.dsl', kind: 'dsl'}})})).json()).document.id, `workspace {\n  model {\n    a = person "${hostile.replace(/"/g, '\\"')}" "Rides."\n    s = softwareSystem "Platform"\n    a -> s "Uses"\n  }\n}\n`);
  await page.goto(base + '/?chapter=1&tab=work&journey=draft&mode=model&project=' + bad); await drafted(page, 1);
  assert.equal(await page.$eval('.jd-card h3', h => h.textContent), hostile, 'the name is shown as the text it is');
  assert.equal(await page.evaluate(() => window.__xss), undefined, 'nothing ran');
  assert.equal(await page.$$eval('.jd img, .jd script, #inspector img, #inspector script', n => n.length), 0, 'no element was made from the name');
  assert.ok((await page.$eval('#inspector .jd-model-lines', e => e.textContent)).includes('onerror'), 'the line is quoted as text');
  pass('markup in a model name stays inert text on the surface and in the quoted lines');

  assert.deepEqual(errors, [], 'no page errors');
  assert.deepEqual(failed, [], 'no failed API request');
  pass('no page errors and no failed API request');
  await ctx.close();
} finally {
  await browser.close();
  server.kill();
  for (const f of [db, db + '-shm', db + '-wal']) try { rmSync(f, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'Model import (rendered)', passed: checks.length, checks, measured}, null, 2));
