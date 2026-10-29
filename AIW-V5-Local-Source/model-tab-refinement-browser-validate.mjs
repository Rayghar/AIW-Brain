import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {chapterRecordSet} from './public/chapter-records.js';
const require = createRequire(import.meta.url), {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
process.env.PORT = String(await new Promise(resolve => { const s = net.createServer().listen(0, '127.0.0.1', () => { const port = s.address().port; s.close(() => resolve(port)); }); }));
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiw-model-refinement-'));
process.env.AIW_LOCAL_DB = path.join(dir, 'project.sqlite');
process.env.OPENAI_API_KEY = ''; process.env.ANTHROPIC_API_KEY = '';
const {server} = await import('./server.js');
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const base = 'http://127.0.0.1:' + process.env.PORT, errors = [], results = [], native = {1: 'map', 2: 'tree', 3: 'map', 4: 'map', 5: 'components', 6: 'platform', 7: 'stack', 8: 'data', 9: 'model', 10: 'deploy', 11: 'board'};
const evidence = process.env.AIW_MODEL_REFINEMENT_EVIDENCE || 'audit/round27/model'; await fs.mkdir(evidence, {recursive: true});
const escaped = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 900}}); page.setDefaultTimeout(15000); page.on('pageerror', e => errors.push(e.stack || e.message));
  for (let chapter = 1; chapter <= 11; chapter++) {
    await page.goto(`${base}/?chapter=${chapter}&tab=model&model=table`, {waitUntil: 'networkidle'});
    await page.locator('.nt-records tbody tr[data-nt-row]').first().waitFor();
    const p = await page.evaluate(() => window.aiwProjectStore.value.document), expected = chapterRecordSet(p, chapter).records;
    const ids = await page.locator('.nt-records tbody tr[data-nt-row]').evaluateAll(rows => rows.map(r => r.dataset.ntRow));
    for (const r of expected) assert.ok(ids.includes(r.id), `Chapter ${chapter}: ${r.type} ${r.id} is present`);
    for (const r of expected) {
      await page.locator(`[data-nt-row="${r.id}"]`).click();
      await page.locator('#inspector .cm-spec').filter({hasText: new RegExp([r.ref, r.id, r.title].filter(Boolean).map(escaped).join('|'))}).first().waitFor();
      assert.ok(await page.locator('#inspector [data-cm-open-work],#inspector a').filter({hasText: /Open.*Work/}).count(), `${r.type} ${r.id} has a route to its Work editor`);
    }
    if (chapter === 1) { await page.getByRole('searchbox', {name: 'Filter the records'}).fill('Actor'); assert.ok(await page.locator('.nt-records tbody tr[data-nt-row="ACT-001"]').isVisible()); await page.locator('.nt-records tbody tr[data-nt-row="ACT-001"]').click(); await page.locator('#inspector').getByText('Bank customer', {exact: true}).first().waitFor(); }
    if (chapter === 8) { const data = p.interfaces.data[0]; const row = page.locator(`[data-nt-row="${data.id}"]`); const empty = page.locator('[data-nt="empty-columns"]'); if(await empty.count())await empty.click(); assert.match(await page.locator('.nt-records thead [data-id="field:owner"]').innerText(), /Accountable data owner/); assert.match(await row.innerText(), /Retention duration \(days\)/); assert.ok(!(await row.innerText()).includes('Contract version')); }
    if (chapter === 9) { const control = p.security.controls[0]; assert.match(await page.locator('.nt-records thead [data-id="field:owner"]').innerText(), /owner/i); assert.equal((await page.locator('.nt-records thead [data-id="field:category"]').innerText()).trim(), 'Category'); assert.equal(await page.locator(`[data-nt-row="${control.id}"] td[title="Control category"]`).innerText(), control.category); assert.ok((await page.locator(`[data-nt-row="${control.id}"]`).innerText()).includes(control.category)); }
    if (chapter === 10) { const zone = p.runtime.zones[0]; await page.locator(`[data-nt-row="${zone.id}"]`).click(); await page.locator('#inspector .cm-spec-t').filter({hasText: zone.title}).waitFor(); }
    await page.screenshot({path: `${evidence}/chapter-${String(chapter).padStart(2, '0')}-table.png`, fullPage: false});
    results.push(`Chapter ${chapter}: complete canonical table, ${expected.length} chapter records`);
  }
  for (let chapter = 1; chapter <= 11; chapter++) {
    await page.goto(`${base}/?chapter=${chapter}&tab=model&model=${native[chapter]}`, {waitUntil: 'networkidle'});
    await page.locator('#tab-purpose').waitFor();
    assert.ok((await page.locator('#tab-purpose').innerText()).length > 20);
    if (chapter === 5) {
      const size = await page.locator('.cm-stage').boundingBox();
      if (size.height < 360) { await page.screenshot({path: `${evidence}/canvas-height-failure.png`}); console.log(await page.evaluate(() => Object.fromEntries(['.studio>.stage.tab-content', '.cm', '.cm-top', '#tab-purpose', '.cm-bar', '.cm-body'].map(s => { const n = document.querySelector(s), r = n.getBoundingClientRect(); return [s, {height: r.height, width: r.width, text: ['.cm-top', '#tab-purpose'].includes(s) ? n.innerText : ''}]; })))); }
      assert.ok(size.height >= 360, `Components retains a useful canvas at 1440×900 (${size.height}px)`);
    }
    const readout = page.locator('.cm-zoom-value:visible').first(); await readout.click(); assert.equal(await readout.innerText(), '100%');
    await page.locator('.cm-zoom [aria-label="Zoom in"]:visible').click(); assert.equal(await readout.innerText(), '115%');
    await readout.click(); assert.equal(await readout.innerText(), '100%');
    assert.equal(await page.locator('.cm').evaluate(e => JSON.parse(e.dataset.modelContext).view), native[chapter]);
    await page.locator('#guidance-source').filter({hasText: /No language model|not connected/i}).waitFor();
    assert.equal(await page.locator('.cm-view-context,.cm-model-assistance,.cm-qpick').count(), 0, 'one shell purpose and one Ask Sol action');
    assert.equal(await page.locator('.workspace-tools [data-workspace-sol]').count(), 1);
    await page.locator('.workspace-tools [data-workspace-sol]').click();
    await page.locator('#brain-panel').waitFor({state: 'visible'});
    assert.match(await page.locator('#brain-panel').innerText(), /not connected|No language model|provider|Connect Sol/i);
    await page.locator('#brain-panel [data-brain-action="close"]').click();
    assert.ok(await page.getByRole('tab', {name:'Validate', exact:true}).isVisible());
    const views = await page.locator('.cm-top .cm-view:visible').evaluateAll(buttons => buttons.filter(b => !b.classList.contains('nt-shared-view')).map(b => b.dataset.id));
    for (const id of views) {
      await page.locator(`.cm-top .cm-view[data-id="${id}"]:visible`).click();
      assert.equal(await page.locator(`.cm-top .cm-view[data-id="${id}"]:visible`).getAttribute('aria-pressed'), 'true', `Chapter ${chapter}: ${id} remains clickable after changing views`);
      assert.equal(await page.locator('.cm').evaluate(e => JSON.parse(e.dataset.modelContext).view), id);
      const bounds = await page.evaluate(() => { const frame = document.querySelector('.cm'), top = frame.querySelector('.cm-top').getBoundingClientRect(), purpose = document.querySelector('#tab-purpose').getBoundingClientRect(); return {topTop: top.top, topBottom: top.bottom, purposeTop: purpose.top, purposeBottom: purpose.bottom}; });
      assert.ok(bounds.topBottom <= bounds.purposeTop + 1 || bounds.purposeBottom <= bounds.topTop + 1, `Chapter ${chapter} header and purpose never overlap`);
    }
    results.push(`Chapter ${chapter}: native current purpose, zoom/reset, provider disclosure and Ask Sol`);
  }
  await page.goto(`${base}/?chapter=8&tab=model&model=diagram`, {waitUntil: 'networkidle'});
  await page.locator('[data-nt-field="scene"]').selectOption('lineage');
  await page.locator('#tab-purpose').filter({hasText: 'transformed into what'}).waitFor();
  await page.locator('.cm-zoom-value:visible').click(); assert.equal(await page.locator('.cm-zoom-value:visible').innerText(), '100%');
  await page.setViewportSize({width: 390, height: 844});
  await page.screenshot({path: `${evidence}/phone-model-purpose.png`, fullPage: false});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone page does not overflow sideways');
  assert.ok(await page.locator('.workspace-tools [data-workspace-sol]').isVisible());
  assert.deepEqual(errors, []);
  await fs.writeFile(`${evidence}/model-refinement-results.json`, JSON.stringify({results, errors}, null, 2));
  console.log(JSON.stringify({suite: 'model refinement browser', passed: results.length, results, errors}, null, 2));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); await fs.rm(dir, {recursive: true, force: true}); }
