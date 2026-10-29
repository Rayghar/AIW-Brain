import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync, writeFileSync, rmSync} from 'node:fs';
import net from 'node:net';
import {chromium} from 'playwright';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {createProject} from './shared/projects-domain.js';
import {restoreScaleProject} from './scripts/build-scale-fixture.mjs';
import {buildModuleScopeProject} from './module-scope-fixture.mjs';
import {scopeLens} from './public/module-lens.js';
import {validationModel} from './public/validation-models.js';

const out = 'audit/refinement-validateoutput'; mkdirSync(out, {recursive: true});
const port = await new Promise(resolve => {const server = net.createServer().listen(0, '127.0.0.1', () => {const n = server.address().port; server.close(() => resolve(n));});});
const db = '.aiw-local/refinement-validateoutput-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: '', ANTHROPIC_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => {try {server.kill('SIGKILL');} catch { /* already gone */ } for (const f of [db, db + '-wal', db + '-shm']) rmSync(f, {force: true});});
await new Promise((resolve, reject) => {server.stdout.on('data', d => {if (String(d).includes('ready')) resolve();}); server.on('exit', code => reject(Error('Server exited ' + code)));});
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({headless: true, executablePath: process.env.AIW_BROWSER_EXECUTABLE});
const checks = [], errors = [];
const pass = text => {checks.push(text); console.log('PASS', text);};
try {
  const full = withFinalReview(seedProject()), blank = withFinalReview(createProject({name: 'Blank output review', template: 'blank'}, 'blank-output-review'));
  const minimal = structuredClone(blank); minimal.runtime.environments = [{...full.runtime.environments[0], title: 'One operating environment', assetIds: []}];
  // rc41 W4: the module-scope fixture is built before the first restore. Built between restores, its ~7 s of synchronous
  // work kept this process from reading the server's close of the idle keep-alive connection (5 s), and the next restore
  // was written into that closed socket (EPIPE) before a byte reached the server.
  const built = await buildModuleScopeProject();
  const B = await restoreScaleProject({base, document: blank}), M = await restoreScaleProject({base, document: minimal, name: 'Late chapter only'});
  const scoped = await restoreScaleProject({base, document: built.document, name: 'Scoped integrity review'});
  for (const width of [1440, 390]) {
    const context = await browser.newContext({viewport: {width, height: 900}, acceptDownloads: true}), page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    const open = async (chapter, tab, extra = '') => {await page.goto(base + '/?chapter=' + chapter + '&tab=' + tab + extra, {waitUntil: 'networkidle'}); await page.locator(tab === 'validate' ? '.vx-switch' : '.out-stage').waitFor(); const coach = page.locator('[data-coach="close"]'); if (await coach.isVisible()) await coach.click();};
    // A document is chosen as a viewer at this width does: its item on the chapter strip, which a phone scrolls sideways
    // (rc41 close, lead: W2 retired the phone's "Document" picker, audit/rc41/w2/NOTE.md §2 Output row; no fallback to it).
    const choose = async id => { await page.locator('.output-artifacts button[data-output-document="' + id + '"]').click(); await page.waitForFunction(id => document.querySelector('button[data-output-document="' + id + '"]')?.getAttribute('aria-pressed') === 'true', id); };
    const fits = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No document overflow at ' + width);
    // rc41 close (lead): W2 retired Validate's own "Recommended next" (audit/rc41/w2/NOTE.md §1 item 6, §2 Validate row): the
    // chapter's next task is said once, as the shell footer's Next task, which the bound workspace publishes on its root
    // (data-validation-next, -text). The footer's link is the one next step on the page, says exactly what the Chapter 8
    // workspace published, stands in the same frame as that workspace, and opens that place in Chapter 8's Work.
    await open(8, 'validate'); const root = page.locator('[data-validation-workspace$=":8:"][data-bound="1"]'); await root.waitFor();
    await page.waitForFunction(() => document.querySelector('[data-validation-workspace$=":8:"][data-bound="1"]')?.dataset.validationNextText);
    const published = await root.evaluate(r => ({url: r.dataset.validationNext, text: r.dataset.validationNextText}));
    assert.ok(published.text && published.url, 'Chapter 8 publishes a next task with a place to go');
    const next = page.locator('main#workspace footer.footer a.workspace-next[data-action="next"]');
    await page.waitForFunction(text => document.querySelector('main#workspace footer.footer a.workspace-next #next-text')?.textContent === text, published.text);
    assert.equal(await page.locator('.workspace-next').count(), 1, 'one next step on the page');
    assert.equal(await page.locator('[data-validation-workspace] [data-validation-next], [data-validation-guidance], .validation-recommendation, [data-validation-related]').count(), 0, 'no second next step inside the workspace');
    assert.equal(await next.isVisible(), true); assert.equal(await page.evaluate(() => document.body.dataset.workspaceTab), 'validate');
    assert.equal(await next.evaluate(a => a.closest('main#workspace').contains(document.querySelector('[data-validation-workspace$=":8:"][data-bound="1"]'))), true, 'the footer is the Chapter 8 Validate frame\'s');
    assert.equal((await next.locator('span').first().innerText()).trim(), 'Next task');
    assert.equal((await next.locator('#next-text').innerText()).trim(), published.text); assert.equal(await next.getAttribute('aria-label'), 'Open next task: ' + published.text);
    const href = await next.getAttribute('href'); assert.equal(href, published.url);
    const target = new URL(href, base); assert.equal(target.searchParams.get('chapter'), '8'); assert.equal(target.searchParams.get('tab'), 'work');
    await fits(); await page.screenshot({path: out + '/validateoutput-validate-' + width + '.png', fullPage: false});
    await next.click(); await page.waitForURL(url => url.searchParams.get('tab') === 'work');
    assert.equal(new URL(page.url()).searchParams.get('chapter'), '8'); assert.equal(new URL(page.url()).searchParams.get('object'), target.searchParams.get('object'));
    pass(width + ': recommended finding opens the correct chapter source in Work');
    // rc38+ (rc41 W4): the owner's output workspace shows the chosen document; the MADR pack's mapping is a reading of
    // its own under "Review the derived pack" beside the download, no longer a closed disclosure.
    await open(3, 'output');
    await choose('madr'); await page.waitForSelector('[data-output-document-view] [data-vx-madr="zip"]');
    assert.equal(await page.locator('[data-output-document-view] [data-vx-madr]').isVisible(), true, 'MADR download remains visible');
    const packNote = page.locator('[data-output-document-view] h4:text-is("Review the derived pack")').locator('xpath=..');
    assert.equal(await packNote.isVisible(), true, 'the mapping is reachable beside the download');
    assert.match(await packNote.innerText(), /3 files in a zip[\s\S]*quality drivers as decision drivers[\s\S]*evidence and assumptions as confirmation[\s\S]*the record stays the authority/);
    pass(width + ': MADR mapping is reachable beside the download, which stays visible');
    const related = page.locator('details.output-secondary');
    assert.equal(await related.getAttribute('open'), null);
    await related.locator('summary').click();
    assert.match(await related.innerText(), /Available now/);
    const targetChapter = new URL(await related.locator('[data-output-related] a').first().getAttribute('href'), base).searchParams.get('chapter');
    await related.locator('[data-output-related] a').first().click(); await page.waitForURL(url => url.searchParams.get('chapter') === targetChapter && url.searchParams.get('tab') === 'output');
    pass(width + ': downstream document status and link reach Chapter ' + targetChapter + ' Output');
    await open(3, 'output');
    // The register is chosen first and previewed inline (rc38 retired the preview dialog).
    assert.equal(await page.locator('button[data-output-document="decisions"]').getAttribute('aria-pressed'), 'true');
    await page.waitForFunction(() => /chapter=3&format=html&view=1/.test(document.querySelector('[data-output-document-view] iframe')?.src || '') && document.querySelector('[data-output-document-view] iframe')?.contentDocument?.querySelector('h1'));
    assert.match(await page.locator('[data-output-document-view] header').innerText(), /Decision register/);
    const download = page.waitForEvent('download'); await page.locator('[data-output-document-view] a[data-out-download]').first().click();
    assert.match((await download).suggestedFilename(), /\.md$/);
    await page.locator('details.output-secondary > summary').click();
    const jsonDownload = page.waitForEvent('download'); await page.locator('details.output-secondary a[data-out-download="Project data (JSON)"]').click(); assert.match((await jsonDownload).suggestedFilename(), /\.json$/);
    await fits(); await page.screenshot({path: out + '/validateoutput-output-' + width + '.png', fullPage: false});
    pass(width + ': register preview, Markdown download and disclosed JSON backup work');
    // A document with records is offered with its preview; one without says "Records needed" beside its button.
    // rc41 close (lead): W2's chapter strip (audit/rc41/w2/NOTE.md §1 item 1, §3) holds the document's name in its button and
    // says what it is in the item's own purpose (the words the button's <small> carried), read exactly here and carried as
    // the button's aria-description (the meta is aria-hidden). It is shown beside the button wherever the strip shows its
    // purposes (wider than 760 px, chapter-strip.css); on a phone neither the rc40 picker nor the strip shows it.
    const purposeOf = async id => {const item = page.locator('.output-artifacts .chapter-strip-item[data-chapter-strip-item="' + id + '"]'), said = item.locator('.chapter-strip-meta > .chapter-strip-purpose');
      assert.equal(await item.count(), 1); assert.equal(await said.count(), 1); if (width > 760) assert.equal(await said.isVisible(), true, id + ' says what it is'); const words = (await said.textContent()).trim();
      assert.equal((await item.locator('button[data-output-document="' + id + '"]').getAttribute('aria-description') || '').split(' · ')[0], words, id + ' carries its purpose for a screen reader'); return words;};
    await open(10, 'output', '&project=' + M.id);
    assert.equal(await page.locator('button[data-output-document="runtime"][aria-pressed="true"]').count(), 1);
    assert.equal(await purposeOf('runtime'), 'Chapter register');
    assert.match(await page.locator('[data-output-document-view] iframe').getAttribute('src'), /chapter=10&format=html&view=1/);
    assert.match(await page.locator('.out-records').textContent(), /One operating environment/);
    await fits(); await page.screenshot({path: out + '/validateoutput-partial-' + width + '.png', fullPage: false});
    await open(11, 'output', '&project=' + M.id); assert.equal(await purposeOf('sdd'), 'Working document');
    assert.doesNotMatch(await page.locator('.output-artifacts .chapter-strip-item[data-chapter-strip-item="sdd"]').innerText(), /Records needed/i);
    assert.match(await page.getByRole('region', {name: 'Chapter 11 output'}).innerText(), /final checks? to fix/);
    await open(10, 'output', '&project=' + B.id); assert.equal(await purposeOf('runtime'), 'Records needed');
    // At every width the missing records are said in view (rc40's phone said them in its picker's option).
    const neededCount = page.locator('.output-artifacts .chapter-strip-item[data-chapter-strip-item="runtime"] .chapter-strip-count');
    assert.equal(await neededCount.isVisible(), true, 'the missing records are said in view'); assert.equal((await neededCount.innerText()).trim(), 'records needed'); await fits();
    pass(width + ': blank explains missing records; environment-only project exports its register and SDD');
    const scope = built.modules.A, lens = scopeLens(built.document, scope), expected = validationModel(built.document, 4);
    await open(4, 'validate', '&project=' + scoped.id + '&scope=' + encodeURIComponent(scope) + '&validate=integrity');
    await page.locator('.vx-model-summaries').waitFor();
    assert.match(await page.locator('.vx-model-scope').innerText(), /Module scope:/);
    const count = await page.locator('.vx-model-panel > header p').innerText();
    const expectedObjects = [...expected.model.objects.values()].filter(o => o.chapter === 4 && lens.shows.has(o.id)).length;
    assert.ok(count.startsWith(expectedObjects + ' chapter objects'), count);
    await fits(); await page.screenshot({path: out + '/validateoutput-integrity-' + width + '.png', fullPage: false});
    pass(width + ': model-integrity chapter objects match selected module scope');
    await context.close();
  }
  assert.deepEqual(errors, []);
  writeFileSync(out + '/validateoutput-browser-results.json', JSON.stringify({passed: checks.length, checks, errors}, null, 2));
} catch (e) {writeFileSync(out + '/validateoutput-browser-results.json', JSON.stringify({passed: checks.length, checks, errors, failure: e.stack}, null, 2)); throw e;}
finally {await browser.close(); server.kill('SIGTERM');}
