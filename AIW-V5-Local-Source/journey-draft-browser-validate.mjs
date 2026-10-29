// The journey draft, rendered (round 4, Contract 3; public/journey-draft-ui.js): a blank project made from a brief,
// its readiness board linking an empty chapter to "Draft this chapter from the journey", Chapter 1 drafted from the
// brief and accepted through the chapter guide (requirements with provenance.journey, context records with their
// passages as field provenance), the Validate empty state of the next chapter, then "Draft the whole journey" through
// Chapter 11, accepting each chapter in turn. It asserts that every chapter gains records, that nothing is confirmed,
// that the readiness board counts the drafted records as to confirm, that Sol is said not to be consulted without a
// key, that no document navigation happens on the way, and that the SDD Markdown carries the chapter registers.
// Round 12: a project of 1,400 imported requirements is offered the architecture draft on every surface (never the
// journey draft), with the reason; its draft runs as a job whose receipt survives a reload, previews its proposals per
// chapter and every cap, and is applied as one reviewed step.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally
// AIW_BROWSER_EXECUTABLE. Starts an isolated local server on a free port with no LLM key.
// Run: node journey-draft-browser-validate.mjs
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';
import {syntheticWorkbook} from './scripts/synthetic-workbook.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/journey-draft-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } });
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [], failed = [], pass = n => { checks.push(n); process.stderr.write('passed: ' + n.slice(0, 90) + '\n'); };
const BRIEF = [
  'Northfield Library wants members to book study rooms online so that no room is booked twice.',
  'Members must be able to book a study room for a date and a time slot.',
  'The system must prevent two bookings of the same room in the same time slot.',
  'Librarians should see the bookings of each room for the day.',
  'Members must receive a confirmation of each booking by email.',
  'Booking records must be kept for no longer than 12 months.',
  'We assume members already have a library card number.',
  'Out of scope: equipment loans.',
  'Steps:',
  '1. A member books a study room.',
  '2. The system confirms the booking to the member.',
  '3. A librarian checks the bookings of the day.'].join('\n');
const RECORDS = {1: p => p.artefacts, 2: p => p.quality.drivers, 3: p => p.decisions.records, 4: p => p.logical.responsibilities, 5: p => p.realisation.components, 6: p => p.technology.capabilities, 7: p => p.technologyRealisation.records, 8: p => [...p.interfaces.contracts, ...p.interfaces.data], 9: p => [...p.security.threats, ...p.security.controls], 10: p => p.runtime.plans, 11: p => [p.finalReview.narrative].filter(n => n.summary)};
const everyRecord = p => [...p.artefacts, ...p.quality.drivers, ...p.decisions.records, ...p.logical.responsibilities, ...p.realisation.components, ...p.technology.capabilities, ...p.technologyRealisation.records, ...p.interfaces.contracts, ...p.interfaces.data, ...p.interfaces.parties, ...p.security.threats, ...p.security.controls, ...p.runtime.environments, ...p.runtime.plans, ...p.runtime.placements, p.finalReview.narrative];
// A second server whose provider is a loopback double: it drafts one value for the first field of the first record
// (citing the first upstream record of the packet) and its check finds no defect.
const SOL_VALUE = 'Book a study room without a double booking';
async function solServer() {
  const calls = [], http = await import('node:http');
  const llm = http.createServer((req, res) => { let body = ''; req.on('data', c => { body += c; }); req.on('end', () => {
    const r = JSON.parse(body || '{}'), name = r.text?.format?.name, input = JSON.parse(r.input?.[0]?.content || '{}'); calls.push(name);
    let out = {supported: true, defects: [], notes: ['Checked against the cited record.']};
    if (name === 'aiw_journey_draft') { const rec = input.records[0], f = rec.fields.find(x => x.key === 'title'); out = {answers: [{record: rec.key, field: f.key, value: SOL_VALUE, passages: [], sourceRefs: [input.upstream[0].ref]}]}; }
    res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify({id: 'r-' + calls.length, status: 'completed', model: 'mock-sol', output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify(out)}]}], usage: {input_tokens: 10, output_tokens: 5}}));
  }); });
  await new Promise(r => llm.listen(0, '127.0.0.1', r));
  const p2 = await new Promise(r => { const t = net.createServer().listen(0, '127.0.0.1', () => { const v = t.address().port; t.close(() => r(v)); }); });
  const db2 = '.aiw-local/journey-draft-sol-' + p2 + '.sqlite';
  const s2 = spawn(process.execPath, ['server.js', '--port', String(p2)], {env: {...process.env, AIW_LOCAL_DB: db2, OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'mock-sol', AIW_LLM_BASE_URL: `http://127.0.0.1:${llm.address().port}/v1`}, stdio: ['ignore', 'pipe', 'inherit']});
  await new Promise((resolve, reject) => { s2.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); s2.on('exit', c => reject(Error('server exited ' + c))); });
  return {base: 'http://127.0.0.1:' + p2, calls, close: async () => { s2.kill(); llm.close(); for (const f of [db2, db2 + '-shm', db2 + '-wal']) try { rmSync(f, {force: true}); } catch { /* temporary */ } }};
}
// rc39/rc40 Work (rc41 W4): Chapter 1's draft actions are in its Brief stage, folded under "Draft records from this brief
// or model"; a viewer chooses the stage and opens the fold before drafting, and so does the suite (a pointer click on the
// summary, exactly one such fold).
const draftActions = async page => {
  if (!await page.$('li.work-stage[data-work-stage="brief"] button[aria-pressed="true"], li.work-stage[data-work-stage="brief"] button[aria-current]:not([aria-current="false"])')) { await page.click('li.work-stage[data-work-stage="brief"] button'); await page.waitForTimeout(300); }
  const fold = page.locator('.r-brief details.work-support > summary').filter({hasText: /^\s*Draft records from this brief or model\s*$/});
  if ((await fold.count()) !== 1) throw Error('the Brief stage folds its draft actions under "Draft records from this brief or model" (found ' + await fold.count() + ')');
  if (!await fold.evaluate(x => x.parentElement.open)) { await fold.click(); await page.waitForTimeout(200); }
  await page.waitForSelector('.r-brief .r-journey-actions [data-journey-draft="1"]', {state: 'visible', timeout: 5000});
};
const settle = async (page, ms = 500) => { await page.waitForLoadState('networkidle'); await page.waitForTimeout(ms); };
// A chapter's draft has loaded (its heading names the chapter and it is no longer drafting).
const drafted = (page, ch) => page.waitForFunction(c => { const h = document.querySelector('.jd h2'); return !!h && h.textContent.includes('Chapter ' + c + ' ·') && !!document.querySelector('.jd .jd-actions') && !document.querySelector('.jd [data-jd-act="accept"][disabled]'); }, ch, {timeout: 60000});

try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && r.url().includes('/api/')) failed.push(r.status() + ' ' + r.url().replace(base, '')); });
  await page.goto(base + '/?view=projects'); await settle(page);
  const id = await page.evaluate(async brief => (await (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Northfield study rooms', template: 'blank', brief})})).json()).document.id, BRIEF);
  const project = () => page.evaluate(async id => (await (await fetch('/api/project?project=' + id, {credentials: 'same-origin'})).json()).document, id);
  assert.ok(id, 'a blank project with a brief');

  // 1. The readiness board names the next action of an empty chapter and links to the draft in this frame.
  // rc38+ (rc41 W4): the Output tab keeps the readiness board (and the SDD prose report) in its "Sources and readiness"
  // panel, a <details> the toolbar's "Inspect sources" control opens; the suite opens it as a viewer does and asserts the
  // control and the panel agree, then reads the board inside it.
  const sources = async p => {
    if (!await p.$('.output-source-panel[open]')) { await p.click('.output-header [data-output-panel="sources"], [data-output-panel="sources"]'); await p.waitForSelector('.output-source-panel[open] .rv-board', {timeout: 8000}); }
    assert.equal(await p.$eval('[data-output-panel="sources"]', b => b.getAttribute('aria-expanded')), 'true', 'the Inspect sources control says the panel is open');
    assert.match(await p.$eval('.output-source-panel > summary', e => e.innerText), /Sources and readiness/);
  };
  await page.goto(base + '/?chapter=11&tab=output&project=' + id); await settle(page);
  const origin = await page.evaluate(() => { window.__aiwJourney = 'one-document'; return performance.timeOrigin; });
  let loads = 0; page.on('load', () => loads++);
  await sources(page);
  const tile = await page.$eval('.output-source-panel .rv-board .rv-tile', t => { const a = t.querySelector('.rv-tile-next a'); return {text: a.textContent, href: a.getAttribute('href')}; });
  assert.equal(tile.text, 'Draft this chapter from the journey', 'Chapter 1 with a brief and no record: the next action is the journey draft');
  assert.match(tile.href, /chapter=1&tab=work&journey=draft/);
  await page.click('.output-source-panel .rv-board .rv-tile .rv-tile-next a');
  await drafted(page, 1);
  assert.equal(await page.evaluate(() => new URLSearchParams(location.search).get('chapter')), '1', 'the link opened Chapter 1 in place');
  pass('the readiness board: an empty chapter with something to draft from has "Draft this chapter from the journey" as its next action, and the link opens the draft in the same frame');

  // 2. Chapter 1 drafted from the brief: cards, value bases, passages quoted in the companion, Sol not consulted.
  const cards = await page.$$eval('.jd-card', cs => cs.length);
  assert.ok(cards >= 6, 'Chapter 1 proposes its records: ' + cards);
  assert.ok(await page.$$eval('.jd-tag.stated', t => t.length) > 0, 'values stated in the brief are marked so');
  assert.ok(await page.$$eval('.jd-tag.gap', t => t.length) > 0, 'what the brief does not say is an open question');
  assert.ok(await page.$$eval('#inspector .jd-passages li', t => t.length) > 0, 'the passages are quoted beside the records');
  assert.match(await page.$eval('.jd-sol', e => e.textContent), /Sol was not consulted/, 'without a key Sol is said not to be consulted');
  assert.equal(await page.$('[data-jd-act="sol"]'), null, 'and no Ask Sol button is offered');
  // Skip the last record and edit one value before accepting.
  const last = await page.$$eval('.jd-card', cs => cs.at(-1).dataset.jdCard), lastTitle = await page.$eval(`.jd-card[data-jd-card="${last}"] h3`, e => e.textContent);
  await page.click(`.jd-card[data-jd-card="${last}"] [data-jd-act="skip"]`);
  assert.match(await page.$eval(`.jd-card[data-jd-card="${last}"]`, e => e.textContent), /Skipped/);
  const gapBox = await page.$('.jd-card textarea[data-jd-field="owner"]');
  if (gapBox) await gapBox.fill('Head of library services');
  await page.click('[data-jd-act="close"]');
  await page.evaluate(async () => (await import('/journey-draft-ui.js')).openJourneyDraft({chapter: 1}));
  await drafted(page, 1);
  assert.match(await page.$eval(`.jd-card[data-jd-card="${last}"]`, e => e.textContent), /Skipped/, 'the skipped record survived leaving and reopening the draft');
  if (gapBox) assert.equal(await page.$eval('.jd-card textarea[data-jd-field="owner"]', e => e.value), 'Head of library services', 'an unfinished answer survived leaving and reopening');
  await page.click('[data-jd-act="accept"]');
  await page.waitForFunction(() => /Chapter 1 accepted/.test(document.querySelector('.jd-message')?.textContent || '') || !!document.querySelector('.jd-error'), null, {timeout: 120000});
  assert.equal(await page.$('.jd-error'), null, await page.$eval('.jd-error', e => e.textContent).catch(() => ''));
  let p = await project();
  const reqs = p.artefacts.filter(a => a.type === 'requirement'), context = p.artefacts.filter(a => a.type !== 'requirement');
  assert.ok(reqs.length >= 3, 'the requirements were saved');
  assert.ok(reqs.every(r => r.provenance?.journey?.mode === 'deterministic' && r.provenance.journey.passages.length), 'each requirement carries provenance.journey with its passages');
  assert.ok(context.length >= 3 && context.every(a => a.provenance?.journey?.mode === 'deterministic' && a.provenance.journey.passages.length), 'each context record, of every type, carries provenance.journey with its passages');
  assert.ok(p.guidance.sessions.find(s => s.chapter === 1).history.filter(h => h.event === 'Applied reviewed chapter draft').length === p.artefacts.length, 'every Chapter 1 record was committed through the chapter guide');
  assert.ok(p.relationships.length >= 3, 'the drafted links followed the records');
  assert.ok(p.artefacts.every(a => a.confirmed === false), 'nothing is confirmed');
  assert.equal(p.artefacts.length, cards - 1, 'the skipped record was not saved');
  if (gapBox) assert.ok(p.artefacts.some(r => r.owner === 'Head of library services'), 'an answered open question is saved as answered');
  assert.ok(p.guidance.sessions.find(s => s.chapter === 1).history.some(h => h.provenance?.mode === 'deterministic'), 'the guide session history keeps the provenance');
  pass('Chapter 1 drafted from the brief and accepted through the chapter guide, every record of every type: cards with stated, inferred and open values, passages quoted in the companion, a skipped record left out, an answered question saved; every artefact carries provenance.journey, the links follow; nothing confirmed');

  // A saved record opens in its own editor through the field spark, with the value prefilled and its source named.
  const artefactsBefore = JSON.stringify((await project()).artefacts);
  await page.click('.jd-card.saved [data-jd-act="editor"]', {timeout: 10000});
  await page.waitForSelector('dialog[open] .spark-prefill', {timeout: 15000});
  assert.match(await page.$eval('dialog[open] .spark-prefill', e => e.textContent), /nothing is saved until you save this record/);
  // The pending suggestion makes the form changed: leaving asks first, and Discard closes it with nothing saved.
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.click('dialog[open] [data-r-action="discard"]', {timeout: 10000});
  await page.waitForFunction(() => !document.querySelector('dialog[open]'), null, {timeout: 10000});
  assert.equal(JSON.stringify((await project()).artefacts), artefactsBefore, 'opening and leaving the editor saved nothing');
  pass('"Open in its editor" opens a saved record\'s own editor through the field spark, prefilled, saving nothing by itself');

  // 3. The Validate empty state of the next chapter offers the draft.
  await page.click('[data-jd-act="close"]'); await settle(page, 300);
  await page.click('a.chapter-item[data-chapter="2"]'); await settle(page, 400);
  await page.click('.tabs [data-tab="validate"]'); await settle(page, 600);
  // rc38+ (rc41 W4): the offer is the validation workspace's own workflow action, a button naming its chapter
  // (data-journey-draft) and, for a journey (not a grouped) draft, no data-journey-grouped; one such offer on the page.
  const offer = '.validation-workspace .validation-workflow-actions button[data-journey-draft="2"]:not([data-journey-grouped])';
  await page.waitForSelector(offer, {timeout: 8000});
  assert.equal(await page.$eval(offer, b => b.textContent), 'Draft this chapter from the journey', 'Chapter 2 Validate, empty: the draft is offered');
  assert.equal(await page.$$eval('[data-journey-draft]', xs => xs.filter(x => x.checkVisibility()).length), 1, 'offered once');
  await page.click(offer);
  await drafted(page, 2);
  assert.deepEqual(await page.evaluate(() => { const q = new URLSearchParams(location.search); return [q.get('chapter'), q.get('tab')]; }), ['2', 'work'], 'the draft opens on the chapter\'s Work tab');
  assert.ok(await page.$$eval('.jd-card', cs => cs.length) >= 3, 'Chapter 2 proposes a quality scenario per requirement');
  await page.click('[data-jd-act="close"]'); await settle(page, 300);
  // The same address opened in a new tab (a bookmark, or a modified click on the readiness link) opens the draft on load.
  const tab = await ctx.newPage();
  tab.on('pageerror', e => errors.push(e.message));
  await tab.goto(base + '/?chapter=2&tab=work&journey=draft&project=' + id); await drafted(tab, 2);
  assert.ok(await tab.$$eval('.jd-card', cs => cs.length) >= 3, 'the address opens Chapter 2\'s draft');
  await tab.close();
  pass('the Validate tab of an empty chapter offers "Draft this chapter from the journey", which opens the draft in place; the draft\'s address opened in a new tab opens it on load');

  // 4. The whole journey from Chapter 1: each chapter drafted, accepted, and the next drafted, through Chapter 11.
  await page.click('a.chapter-item[data-chapter="1"]'); await settle(page, 300);
  await page.click('.tabs [data-tab="work"]'); await settle(page, 300);
  await draftActions(page);
  assert.equal(await page.$eval('.r-journey-actions [data-journey-draft="1"][data-journey-whole="true"]', b => b.textContent.trim()), 'Draft the whole journey');
  await page.click('[data-journey-draft="1"][data-journey-whole="true"]');
  await drafted(page, 1);
  assert.deepEqual(await page.$$eval('.jd-card h3', hs => hs.map(h => h.textContent)), [lastTitle], 'Chapter 1 proposes again only the record skipped before');
  await page.click('.jd-card [data-jd-act="skip"]');
  await page.click('[data-jd-act="next"]');
  const gained = {};
  for (let ch = 2; ch <= 11; ch++) {
    await drafted(page, ch);
    const before = RECORDS[ch](await project()).length, n = await page.$$eval('.jd-card', cs => cs.length);
    assert.ok(n >= 1, `Chapter ${ch} proposes records`);
    await page.click('[data-jd-act="accept"]');
    if (ch < 11) await page.waitForFunction(c => (document.querySelector('.jd h2')?.textContent || '').includes('Chapter ' + c + ' ·') || !!document.querySelector('.jd-error'), ch + 1, {timeout: 180000});
    else await page.waitForFunction(() => /Chapter 11 accepted/.test(document.querySelector('.jd-message')?.textContent || '') || !!document.querySelector('.jd-error'), null, {timeout: 180000});
    assert.equal(await page.$('.jd-error'), null, await page.$eval('.jd-error', e => e.textContent).catch(() => ''));
    gained[ch] = RECORDS[ch](await project()).length - before;
    assert.ok(gained[ch] >= 1, `Chapter ${ch} gained records`);
  }
  p = await project();
  assert.deepEqual(everyRecord(p).filter(r => r?.confirmed === true || r?.targetConfirmed === true).map(r => r.id), [], 'nothing is confirmed');
  assert.ok(p.interfaces.data.every(d => d.fields.length >= 2 && d.fields.some(f => f.key) && d.fields.some(f => f.name === 'status')), 'each data definition was made with its key and status fields');
  assert.equal(p.finalReview.narrative.title, 'Northfield study rooms — Solution Design', 'the SDD is titled with the project\'s name, as every SDD is');
  assert.ok(p.realisation.components.every(c => c.provenance?.journey?.chapter === 5), 'each component keeps the provenance of Chapter 5, which drafted it');
  assert.ok(p.finalReview.narrative.provenance?.journey && p.quality.drivers.every(d => d.provenance?.journey) && p.realisation.components.every(c => c.provenance?.journey), 'drafted records carry provenance.journey');
  pass('"Draft the whole journey" walks Chapters 2 → 11, stopping at each for Accept: every chapter gains records (' + Object.entries(gained).map(([c, n]) => c + ':' + n).join(' ') + '), nothing is confirmed, data is keyed, the SDD is titled with the project\'s name');

  // 5. The readiness board counts the drafted records as to confirm.
  await page.click('[data-jd-act="close"]'); await settle(page, 300);
  await page.click('.tabs [data-tab="output"]'); await settle(page, 800);
  await sources(page);
  const tiles = await page.$$eval('.output-source-panel .rv-board .rv-tile', ts => ts.map(t => Number(t.querySelector('.rv-tile-c .confirm b')?.textContent || 0)));
  assert.equal(tiles.length, 11);
  assert.ok(tiles.slice(0, 10).every(n => n >= 1), 'every drafted chapter has records to confirm: ' + tiles.join(','));
  pass('the readiness board counts every drafted chapter\'s records as to confirm (' + tiles.join(', ') + ')');

  // Accepting the drafted journey is no change to review: every record was made with what it holds (a requirement's
  // links, a data definition's fields, the SDD's title), so no change event, no "Changes" count and no impact notice.
  p = await project();
  assert.deepEqual((p.changes?.events || []).map(e => e.id + ' ' + e.title), [], 'no change event was recorded');
  const changes = await page.$eval('.cr-entry', e => ({text: e.textContent.trim(), count: e.querySelector('span')?.textContent || null})).catch(() => null);
  assert.ok(changes, 'the project card offers Reviews');
  assert.deepEqual(changes, {text: 'Reviews', count: null}, 'the Reviews entry shows no count (round 12, G, GR-UX-01: the counter counts reviews and says so)');
  assert.equal(await page.$('.cr-notice'), null, 'no "affected records need review" notice');
  pass('accepting the whole drafted journey records no change to review: no change event, no Changes count, no impact notice');

  // 6. One document all the way; the SDD Markdown carries the chapter registers.
  const at = await page.evaluate(() => ({marker: window.__aiwJourney, origin: performance.timeOrigin, navigations: performance.getEntriesByType('navigation').length}));
  assert.deepEqual(at, {marker: 'one-document', origin, navigations: 1}, 'no document navigation happened');
  assert.equal(loads, 0);
  // Round 12 (F, D-01): the export route's SDD is the architecture edition, titled on its cover with the project's name;
  // the chapter registers are its annex (Appendix D), whole in their own export.
  const [sdd, registers] = await page.evaluate(async id => Promise.all(['/api/export?chapter=11&format=md&project=' + id, '/api/export?chapter=11&annex=registers&format=md&project=' + id].map(async u => (await fetch(u, {credentials: 'same-origin'})).text())), id);
  assert.match(sdd, /^<!-- aiw:cover -->\n# NORTHFIELD STUDY ROOMS\n\nSolution Design Document\n/);
  for (const ref of [reqs[0].id, p.decisions.records[0].id, p.logical.responsibilities[0].ref]) assert.ok(sdd.includes(ref), 'the SDD names ' + ref);
  assert.match(registers, /^# Northfield study rooms — Solution Design/);
  assert.match(registers, /Detailed chapter registers/);
  for (const ref of [reqs[0].id, p.quality.drivers[0].id, p.decisions.records[0].id, p.logical.responsibilities[0].ref, p.interfaces.data[0].ref]) assert.ok(registers.includes(ref), 'the registers annex names ' + ref);
  pass('one document from the readiness board to Chapter 11; the SDD is the architecture edition titled with the project, and its registers annex carries the chapter registers');

  await page.goto(base + '/?chapter=11&tab=output&project=' + id); await settle(page);
  await sources(page);
  await page.locator('.output-source-panel [data-rv-action="content-report"]').click();
  await page.locator('.rv-content-report .rv-content-section').first().waitFor();
  assert.match(await page.locator('.rv-content-report').innerText(), /Content readiness|design records|prose standard/i);
  assert.equal(await page.locator('.rv-content-section').count(), 3, 'the report reads drivers, decisions and components');
  assert.ok(await page.locator('.rv-content-section a[href*="tab=work"]').count() > 0, 'the prose findings link to their source chapters');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'rv-dialog-title', 'the content report opens with its result heading focused');
  const findingsBeforeSearch = await page.locator('.rv-content-section li').count();
  const firstFindingRef = (await page.locator('.rv-content-section li strong').first().innerText()).split(' · ')[0];
  await page.locator('.rv-content-query').fill('a-reference-that-is-not-in-this-project');
  assert.match(await page.locator('.rv-content-match').innerText(), /^0 matching findings$/, 'search announces no matches');
  assert.equal(await page.locator('.rv-content-section li').count(), 0, 'search hides unrelated findings while retaining the section summaries');
  await page.locator('.rv-content-query').fill(firstFindingRef);
  assert.ok(await page.locator('.rv-content-section li strong').filter({hasText: firstFindingRef}).count() > 0, 'a source reference finds its record');
  await page.locator('.rv-content-query').fill('');
  assert.equal(await page.locator('.rv-content-section li').count(), findingsBeforeSearch, 'clearing search restores the visible findings');
  const exactSource = page.locator('.rv-content-section a[href*="tab=work"][href*="&"]').first();
  assert.match(await exactSource.getAttribute('href'), /(?:driver|decision|object|artefact)=/, 'a content finding targets its source record');
  const sourceField = await exactSource.getAttribute('data-rv-sdd-field');
  await exactSource.click();
  await page.waitForFunction(() => !document.querySelector('.rv-dialog') && new URLSearchParams(location.search).get('tab') === 'work');
  assert.ok(await page.locator('.heading-row h1').count(), 'the source chapter opens after the report closes');
  await page.locator('.q-dialog,.d-dialog,.a-dialog,.i-dialog').first().waitFor();
  assert.equal(await page.locator('.q-dialog [name="'+sourceField+'"],.d-dialog [name="'+sourceField+'"],.a-dialog [name="'+sourceField+'"],.i-dialog [name="'+sourceField+'"]').count(), 1, 'the source editor opens at the named field');
  pass('Output exposes the SDD content reading with searchable, source-field authoring tasks');

  await ctx.close();

  // 7. With Sol configured (a loopback provider double): "Ask Sol to draft" sends one request for the chapter, the
  //    accepted values are marked Sol beside the deterministic ones, and the commit carries mode 'sol' and the run.
  const sol = await solServer();
  try {
    const c2 = await browser.newContext({viewport: {width: 1440, height: 900}}), q = await c2.newPage();
    q.on('pageerror', e => errors.push(e.message));
    await q.goto(sol.base + '/?view=projects'); await settle(q);
    const pid = await q.evaluate(async brief => (await (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Northfield with Sol', template: 'blank', brief})})).json()).document.id, BRIEF);
    await q.goto(sol.base + '/?chapter=1&tab=work&project=' + pid); await settle(q);
    await draftActions(q);
    await q.click('[data-journey-draft="1"]:not([data-journey-whole])'); await drafted(q, 1);
    assert.ok(await q.$('[data-jd-act="sol"]'), 'with Sol configured, Ask Sol to draft is offered');
    await q.click('[data-jd-act="accept"]');
    await q.waitForFunction(() => /Chapter 1 accepted/.test(document.querySelector('.jd-message')?.textContent || ''), null, {timeout: 120000});
    await q.click('[data-jd-act="close"]'); await settle(q, 300);
    await q.click('a.chapter-item[data-chapter="2"]'); await settle(q, 300);
    await q.click('.tabs [data-tab="validate"]'); await settle(q, 500);
    await q.click('.validation-workspace .validation-workflow-actions button[data-journey-draft="2"]:not([data-journey-grouped])'); await drafted(q, 2);
    await q.click('[data-jd-act="sol"]');
    await q.waitForSelector('.jd-sol.accepted, .jd-sol.withheld', {timeout: 60000});
    assert.match(await q.$eval('.jd-sol', e => e.textContent), /Sol drafted 1 value/);
    assert.equal(await q.$$eval('.jd-tag.sol', t => t.length), 1, 'the value Sol drafted is marked Sol');
    await q.click('[data-jd-act="accept"]');
    await q.waitForFunction(() => /Chapter 2 accepted/.test(document.querySelector('.jd-message')?.textContent || '') || !!document.querySelector('.jd-error'), null, {timeout: 120000});
    assert.equal(await q.$('.jd-error'), null, await q.$eval('.jd-error', e => e.textContent).catch(() => ''));
    const doc = await q.evaluate(async id => (await (await fetch('/api/project?project=' + id, {credentials: 'same-origin'})).json()).document, pid);
    const solDriven = doc.quality.drivers.filter(d => d.provenance?.journey?.mode === 'sol');
    assert.equal(solDriven.length, 1, 'one scenario was committed with Sol\'s value');
    assert.match(solDriven[0].provenance.journey.runId, /^[a-f0-9-]{36}$/);
    assert.equal(solDriven[0].title, SOL_VALUE, 'the committed record holds Sol\'s value');
    assert.ok(doc.quality.drivers.filter(d => d !== solDriven[0]).every(d => d.provenance?.journey?.mode === 'deterministic'), 'the others keep the deterministic draft');
    assert.deepEqual(sol.calls, ['aiw_journey_draft', 'aiw_journey_draft_check'], 'one draft call and one check call');
    await c2.close();
    // Round 12 (GR-DRF-18): with Sol configured, the architecture draft's preview offers to word one chapter with the
    // model, group by group; the wording comes back as a new draft whose preview says what Sol reworded.
    const c4 = await browser.newContext({viewport: {width: 1440, height: 900}}), w = await c4.newPage();
    w.setDefaultTimeout(30000);
    w.on('pageerror', e => errors.push(e.message));
    await w.goto(sol.base + '/?view=projects'); await settle(w);
    const small = syntheticWorkbook({rows: 120});
    const wid = await w.evaluate(async ({b64, sheet}) => {
      const made = await (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Synthetic wording', template: 'blank'})})).json(), id = made.document.id;
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const call = async (route, body) => (await fetch(route + '&project=' + id, {method: 'POST', credentials: 'same-origin', headers: body instanceof Uint8Array ? {} : {'Content-Type': 'application/json'}, body: body instanceof Uint8Array ? body : JSON.stringify(body)})).json();
      const up = await call('/api/intake?action=upload&filename=Synthetic.xlsx', bin), ins = await call('/api/intake?action=inspect', {uploadId: up.id, sheet});
      const input = {uploadId: up.id, sheet: ins.sheet, headerRow: ins.headerRow, mapping: ins.mapping, priorityMap: ins.bands.map, groups: {domain: true, capabilityTheme: false}};
      const pre = await call('/api/intake?action=preview', input);
      const done = await call('/api/intake?action=apply', {...input, revision: pre.projectRevision, previewStamp: pre.stamp, reviewed: true});
      return done.document ? id : null;
    }, {b64: Buffer.from(small.bytes).toString('base64'), sheet: small.manifest.sheet});
    assert.ok(wid);
    await w.goto(sol.base + '/?chapter=1&tab=work&journey=draft&draft=architecture&project=' + wid);
    await w.waitForSelector('.jd [data-jd-act="g-start"]');
    await w.click('.jd [data-jd-act="g-start"]');
    await w.waitForSelector('.jd-preview table[data-jd-counts]', {timeout: 120000});
    const first = await w.$eval('.jd-preview', e => e.dataset.jdReceipt), before = sol.calls.length;
    assert.ok(await w.$('.jd-wording select[data-jd-word-chapter]'), 'with Sol configured the preview offers to word a chapter');
    await w.selectOption('.jd-wording select[data-jd-word-chapter]', '4');
    await w.click('.jd [data-jd-act="g-word"]');
    await w.waitForFunction(r => { const p = document.querySelector('.jd-preview'); return !!p && p.dataset.jdReceipt && p.dataset.jdReceipt !== r; }, first, {timeout: 180000});
    const groupsAsked = (sol.calls.length - before) / 2, worded = await w.$eval('.jd-preview .jd-asks', e => e.textContent);
    assert.ok(groupsAsked >= 2 && Number.isInteger(groupsAsked), 'one draft call and one check call per group: ' + (sol.calls.length - before));
    assert.match(worded, /\d+ values? of Chapter 4 reworded by Sol with the model, each marked on its record; nothing else changed\./, 'the new draft says what Sol reworded');
    await w.click('.jd-preview tr[data-jd-chapter="4"] [data-jd-act="g-records"]');
    await w.waitForSelector('.jd-record-detail .jd-review-card', {timeout: 15000});
    assert.ok((await w.$eval('.jd-record-detail', e => e.textContent)).includes(SOL_VALUE), 'the chapter review shows the wording Sol gave');
    assert.match(await w.$eval('.jd-record-detail', e => e.textContent), /Sol wording.*Sol reworded title/s, 'the record identifies its Sol rewording');
    await c4.close();
    pass('with Sol configured, the architecture draft\'s preview offers to word a chapter: Sol is asked once per requirement group (a draft call and a check call each) and the wording comes back as a new draft, whose preview says what was reworded');
  } finally { await sol.close(); }
  pass('with Sol configured: Ask Sol to draft sends one checked request for the chapter, its value is marked Sol, and the commit records mode sol with the run');

  // 8. Round 12 (GR-DRF-17, GR-DRF-02, GR-DRF-20): a project of 1,400 imported requirements, in a fresh tab. One
  //    predicate on every surface: the architecture draft is offered, the page says why the brief is not drafted chapter
  //    by chapter, and the journey draft is offered nowhere. The draft started at this size shows its progress, survives
  //    a reload through its receipt, previews its proposals per chapter and every cap, and is applied as one reviewed step.
  {
    const c3 = await browser.newContext({viewport: {width: 1440, height: 900}}), g = await c3.newPage();
    g.setDefaultTimeout(30000);
    g.on('pageerror', e => errors.push(e.message));
    g.on('response', r => { if (r.status() >= 400 && r.url().includes('/api/')) failed.push(r.status() + ' ' + r.url().replace(base, '')); });
    await g.goto(base + '/?view=projects'); await settle(g);
    const {bytes, manifest} = syntheticWorkbook({rows: 1400});
    const gid = await g.evaluate(async ({b64, sheet}) => {
      const made = await (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Synthetic platform', template: 'blank'})})).json(), id = made.document.id;
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const call = async (route, body) => (await fetch(route + '&project=' + id, {method: 'POST', credentials: 'same-origin', headers: body instanceof Uint8Array ? {} : {'Content-Type': 'application/json'}, body: body instanceof Uint8Array ? body : JSON.stringify(body)})).json();
      const up = await call('/api/intake?action=upload&filename=Synthetic.xlsx', bin), ins = await call('/api/intake?action=inspect', {uploadId: up.id, sheet});
      const input = {uploadId: up.id, sheet: ins.sheet, headerRow: ins.headerRow, mapping: ins.mapping, priorityMap: ins.bands.map, groups: {domain: true, capabilityTheme: true}};
      const pre = await call('/api/intake?action=preview', input);
      const done = await call('/api/intake?action=apply', {...input, revision: pre.projectRevision, previewStamp: pre.stamp, reviewed: true});
      return done.document ? id : null;
    }, {b64: Buffer.from(bytes).toString('base64'), sheet: manifest.sheet});
    assert.ok(gid, 'a project of 1,400 imported requirements');
    const doc = () => g.evaluate(async id => (await (await fetch('/api/project?project=' + id, {credentials: 'same-origin'})).json()).document, gid);
    const GROUPED = 'Draft the architecture from the requirement groups', REASON = /This project's 1,400 requirements were imported in \d+ requirement groups: Sol drafts its architecture from the groups as one draft you preview and apply, not chapter by chapter from the brief\./;

    // The one predicate: the brief page, the Validate tab of an empty chapter and the readiness board say the same.
    await g.goto(base + '/?chapter=1&tab=work&project=' + gid); await settle(g, 800);
    await draftActions(g);
    assert.deepEqual(await g.$$eval('.r-journey-actions [data-journey-draft]', bs => bs.map(b => [b.textContent.trim(), b.dataset.journeyGrouped])), [[GROUPED, 'true']], 'the brief page offers the architecture draft, and only it');
    assert.match(await g.$eval('[data-draft-reason]', e => e.textContent), REASON, 'and says why the brief is not drafted chapter by chapter');
    // rc38+ (rc41 W4): the Validate offer is the validation workspace's workflow action (button[data-journey-draft]); the
    // reason is read anywhere in the workspace, so the pin keeps "with the same reason" whatever line W2 gives it.
    const validateOffer = () => g.$eval('.validation-workspace', w => { const b = [...w.querySelectorAll('.validation-workflow-actions button[data-journey-draft]')]; return [b.length === 1 ? b[0].textContent.trim() : 'offers: ' + b.length, b[0]?.dataset.journeyGrouped, w.innerText]; }).then(([t, k, text]) => [t, k, REASON.test(text)]);
    await g.click('.tabs [data-tab="validate"]'); await settle(g, 600);
    assert.deepEqual(await validateOffer(), [GROUPED, 'true', true], 'Chapter 1\'s Validate tab offers the same, with the same reason');
    await g.click('a.chapter-item[data-chapter="2"]'); await settle(g, 400);
    await g.click('.tabs [data-tab="validate"]'); await settle(g, 600);
    assert.deepEqual(await validateOffer(), [GROUPED, 'true', true], 'and so does the Validate tab of an empty chapter');
    await g.goto(base + '/?chapter=11&tab=output&project=' + gid); await settle(g, 800);
    await sources(g);
    const next = await g.$$eval('.output-source-panel .rv-board .rv-tile', ts => ts.map(t => { const a = t.querySelector('.rv-tile-next a'); return a ? [a.textContent.trim(), a.getAttribute('href')] : null; }));
    for (let ch = 2; ch <= 10; ch++) { assert.equal(next[ch - 1]?.[0], GROUPED, `Chapter ${ch}'s next action is the architecture draft`); assert.match(next[ch - 1][1], /journey=draft&draft=architecture/); }
    assert.ok(!(await g.content()).includes('Draft this chapter from the journey'), 'the journey draft is offered nowhere');
    pass('GR-DRF-17: one predicate on every surface for 1,400 imported requirements: Chapter 1\'s brief page and Validate tab, an empty chapter\'s Validate tab and the readiness board of Chapters 2-10 offer the architecture draft (never the journey draft), and the page says why the brief is not drafted chapter by chapter');

    // The draft as a job: started from the readiness link, its progress and receipt; a reload finds it again.
    await g.locator('.output-source-panel .rv-board .rv-tile').nth(1).locator('.rv-tile-next a').click();
    await g.waitForFunction(() => document.querySelector('.jd h2')?.textContent === 'Draft the architecture' && !!document.querySelector('.jd [data-jd-act="g-start"]'));
    assert.match(await g.$eval('.jd-head', e => e.textContent), REASON);
    // No architecture model is configured on this server (BR-09): the plan says Sol cannot draft, and Draft with Sol is
    // disabled; the rules skeleton stays offered.
    await g.waitForSelector('.jd [data-jd-plan]');
    assert.match(await g.$eval('.jd [data-jd-plan]', e => e.textContent), /The architecture model is not configured, so Sol cannot draft\./);
    assert.deepEqual(await g.$$eval('.jd [data-jd-act="g-start"]', bs => bs.map(b => [b.dataset.jdMode, b.disabled])), [['model', true], ['rules', false]], 'Draft with Sol is not offered without a model');
    await g.click('.jd [data-jd-act="g-start"][data-jd-mode="rules"]');
    await g.waitForSelector('.jd-job[data-jd-receipt]');
    const receipt = await g.$eval('.jd-job', e => e.dataset.jdReceipt);
    assert.match(receipt, /^[a-f0-9-]{36}$/, 'the receipt comes back at once');
    assert.match(await g.$eval('.jd-job', e => e.textContent), /Receipt [a-f0-9-]{36}/);
    assert.match(await g.$eval('.jd-job .jd-progress', e => e.textContent), /^Rules draft: \d+ chapters? of 12 drafted, \d+ proposals? so far$/, 'its progress shows while it runs');
    assert.equal(await g.evaluate(id => JSON.parse(sessionStorage.getItem('aiw-architecture-draft:' + id) || '{}').draft, gid), receipt, 'the tab keeps the receipt');
    await g.goto(base + '/?chapter=1&tab=work&journey=draft&draft=architecture&project=' + gid);
    await g.waitForSelector('.jd-preview[data-jd-receipt], .jd-job[data-jd-receipt]', {timeout: 120000});
    assert.equal(await g.$eval('.jd-preview[data-jd-receipt], .jd-job[data-jd-receipt]', e => e.dataset.jdReceipt), receipt, 'after a reload the page finds the same job by its receipt');
    await g.waitForSelector('.jd-preview table[data-jd-counts]', {timeout: 120000});
    const job = await g.evaluate(async ({id, r}) => (await (await fetch('/api/drafting?action=status&id=' + r + '&project=' + id, {credentials: 'same-origin'})).json()).job, {id: gid, r: receipt});
    assert.equal(job.status, 'completed'); assert.equal(job.progress.chapters.length, 12, 'its progress was kept per chapter');
    const counts = await g.$$eval('.jd-preview table[data-jd-counts] tbody tr', rs => rs.map(r => [r.dataset.jdChapter, Number(r.querySelector('td').textContent.replace(/[^\d]/g, ''))]));
    assert.equal(counts.length, 12, 'the preview counts the proposals of every chapter');
    assert.deepEqual(counts.map(([c, n]) => [c, n]), job.progress.chapters.map(c => [String(c.chapter), c.records]), 'the counts are the job\'s');
    assert.ok(counts.filter(([c]) => c !== '11').every(([, n]) => n > 0), 'every chapter has proposals: ' + JSON.stringify(counts));
    const caps = await g.$$eval('.jd-preview table[data-jd-caps] tbody tr', rs => rs.map(r => [...r.querySelectorAll('td')].map(td => Number(td.textContent.replace(/[^\d-]/g, '')))));
    assert.ok(caps.length >= 10 && caps.every(([, drafted, bound, headroom]) => drafted > 0 && headroom >= 0 && headroom < bound), 'every cap the draft meets, with its headroom');
    assert.ok(await g.$eval('.jd [data-jd-act="g-apply"]', b => b.disabled), 'the apply waits for the review');
    pass('GR-DRF-02, GR-DRF-20: the draft of 1,400 requirements runs as a job: its receipt shows at once and the tab keeps it; after a reload the page finds the same job by its receipt; the preview counts the proposals of all twelve parts (as the job\'s progress per chapter kept them) and shows every cap with its headroom; the apply waits for the review');

    // Applied as one reviewed step: one save, every record Sol's proposal, applied by the person, reviewed by no one.
    const before = await doc();
    let reviewedPages = 0;
    for (const [chapter, records] of counts) for (let offset = 0; offset < records; offset += 20) {
      if (!offset) await g.click(`.jd-preview tr[data-jd-chapter="${chapter}"] [data-jd-act="g-records"]`);
      else {
        await g.click(`.jd-record-detail [data-jd-act="g-records"][data-jd-offset="${offset}"]`);
        await g.waitForFunction(n => document.querySelector('.jd-record-detail>header p')?.textContent.includes('showing ' + n.toLocaleString('en-GB')), offset + 1);
      }
      await g.waitForSelector('.jd-record-detail .jd-review-card');
      assert.ok(await g.$$eval('.jd-record-detail .jd-review-card', cards => cards.length > 0 && cards.length <= 20), 'only one review page is rendered');
      await g.click('.jd-record-detail [data-jd-act="g-mark-page"]');
      await g.waitForFunction(() => document.querySelector('.jd-record-detail [data-jd-act="g-mark-page"]')?.textContent.includes('Page reviewed'));
      await g.waitForFunction(expected => Number(document.querySelector('.jd-review-progress b')?.textContent.match(/\d+/)?.[0]) === expected, reviewedPages + 1);
      reviewedPages++;
    }
    assert.ok(reviewedPages > 20, 'bulk review traverses many bounded pages');
    assert.match(await g.$eval('.jd-review-progress', e => e.textContent), new RegExp(reviewedPages + ' of ' + reviewedPages));
    await g.check('.jd [data-jd-act="g-reviewed"]');
    await g.click('.jd [data-jd-act="g-apply"]');
    await g.waitForSelector('[data-jd-applied]', {timeout: 180000});
    const after = await doc(), drafted2 = [...after.quality.drivers, ...after.logical.responsibilities, ...after.realisation.components];
    assert.ok(drafted2.length > 0 && drafted2.every(x => x.state === 'proposed' && x.origin === 'sol-draft' && x.provenance?.draft?.reviewed === false), 'every applied record is Sol\'s proposal, reviewed by no one');
    assert.equal((after.changes?.events || []).filter(e => e.source?.kind === 'draft-apply').length, 12, 'one journal event per chapter');
    assert.equal(after.artefacts.filter(a => a.type === 'requirement').length, before.artefacts.filter(a => a.type === 'requirement').length, 'no requirement added');
    assert.match(await g.$eval('[data-jd-applied]', e => e.textContent), /drafted by Sol and not reviewed by a person/);
    await g.goto(base + '/?chapter=11&tab=output&project=' + gid, {waitUntil: 'networkidle'});
    await sources(g);
    await g.locator('.output-source-panel [data-rv-action="content-report"]').click();
    const moreFindings = g.locator('.rv-content-section [data-rv-action="content-more"]').first();
    await moreFindings.waitFor({timeout: 120000});
    const section = moreFindings.locator('xpath=..'), visibleBefore = await section.locator('li').count();
    assert.equal(visibleBefore, 18, 'a large SDD section initially renders one bounded finding page');
    await moreFindings.click();
    const visibleAfter = await section.locator('li').count();
    assert.ok(visibleAfter > visibleBefore && visibleAfter <= visibleBefore + 18, 'Show next reveals only one further page');
    assert.equal(await g.evaluate(() => document.activeElement?.matches('.rv-content-section li')), true, 'focus moves to the first newly revealed finding');
    await c3.close();
    pass('GR-DRF-12: the reviewed preview applies in one step with proposal provenance; the large SDD report reveals only the next 18 findings and focuses the new page');
  }

  assert.deepEqual(errors, [], 'no page errors');
  assert.deepEqual(failed, [], 'no failed API request');
  pass('no page errors and no failed API request');
} finally {
  await browser.close();
  server.kill();
  for (const f of [db, db + '-shm', db + '-wal']) try { rmSync(f, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'Journey draft (rendered)', passed: checks.length, checks}, null, 2));
