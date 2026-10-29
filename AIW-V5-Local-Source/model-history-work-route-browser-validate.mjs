// History rows open their real review context; they never offer a fictitious editor.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import {controlStamp, threatStamp} from './public/security-domain.js';
import {runtimePlanStamp} from './public/runtime-domain.js';
import {chapterOfRecord} from './public/chapter-records.js';
import {historyWorkDestination} from './public/model-work-destination.js';

process.env.PORT = String(await new Promise(resolve => { const s = net.createServer().listen(0, '127.0.0.1', () => { const port = s.address().port; s.close(() => resolve(port)); }); }));
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiw-history-route-'));
process.env.AIW_LOCAL_DB = path.join(dir, 'project.sqlite');
process.env.OPENAI_API_KEY = ''; process.env.ANTHROPIC_API_KEY = '';
const {server} = await import('./server.js');
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const results = [], errors = [], base = 'http://127.0.0.1:' + process.env.PORT;
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  page.setDefaultTimeout(15000); page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/?chapter=11&tab=model&model=table', {waitUntil: 'networkidle'});
  const document = () => page.evaluate(() => window.aiwProjectStore.value.document);
  const command = payload => page.evaluate(command => window.aiwProjectStore.command(command), payload);
  let p = await document();
  const control = p.security.controls[0], plan = p.runtime.plans[0], threat = p.security.threats[0];
  const recorded = {reviewed: true, reviewer: 'Synthetic route test', reference: 'LOCAL-ROUTE-TEST', observations: 'Synthetic diagnostic record; no external verification.'};
  await command({type: 'security.evidence', payload: {...recorded, id: control.id, stamp: controlStamp(p, control), kind: 'design', result: 'partial'}});
  p = await document();
  await command({type: 'runtime.evidence', payload: {...recorded, id: plan.id, stamp: runtimePlanStamp(p, p.runtime.plans.find(r => r.id === plan.id)), kind: 'design', result: 'partial'}});
  p = await document();
  await command({type: 'security.risk', payload: {...recorded, id: threat.id, stamp: threatStamp(p, p.security.threats.find(r => r.id === threat.id)), treatment: 'mitigate', owner: 'Synthetic owner', residual: 'Synthetic residual exposure', nextReview: '2027-01-01'}});
  p = await document();
  const cases = [
    {record: p.security.evidence.at(-1), inventory: 11, chapter: 9, parent: control.id, section: 'assurance', label: 'Review evidence in Chapter 9 Work'},
    {record: p.runtime.evidence.at(-1), inventory: 11, chapter: 10, parent: plan.id, section: 'operate', label: 'Review evidence in Chapter 10 Work'},
    {record: p.security.risks.at(-1), inventory: 9, chapter: 9, parent: threat.id, section: 'assurance', label: 'Review risk treatment in Chapter 9 Work'}
  ];
  const before = JSON.stringify(p), revision = await page.evaluate(() => window.aiwProjectStore.value.revision);
  for (const c of cases) {
    assert.equal(chapterOfRecord(p, c.record.id), c.inventory, 'canonical inventory ownership stays intact');
    assert.deepEqual(historyWorkDestination(p, c.record.id), {id: c.parent, home: c.chapter, section: c.section, label: c.label});
    await page.evaluate(href => window.aiwRoute(href), `/?chapter=${c.inventory}&tab=model&model=table`);
    await page.locator(`[data-nt-row="${c.record.id}"]`).click();
    const button = page.locator('#inspector [data-cm-open-work]').first();
    assert.match(await button.innerText(), new RegExp(c.label));
    assert.equal(await button.getAttribute('data-cm-open-work'), c.parent);
    await button.click();
    await page.waitForFunction(c => { const q = new URLSearchParams(location.search); return q.get('tab') === 'work' && q.get('chapter') === String(c.chapter) && q.get('object') === c.parent && q.get('section') === c.section; }, c);
    // History stays in its real Work section, alongside the selected parent.
    const historyText = await page.locator('#studio-surface').textContent();
    assert.ok(historyText.includes(c.record.residual || c.record.id), `${c.record.id}: the destination contains the selected history record`);
    assert.equal(await page.locator('.work-stages [aria-pressed="true"],.l-work-stages [aria-pressed="true"]').first().innerText(), c.section === 'operate' ? 'Operate & release' : 'Evidence & risk');
    results.push(`${c.record.id}: Chapter ${c.inventory} Table → Chapter ${c.chapter} Work / ${c.section} / ${c.parent}; actual history present`);
  }
  assert.equal(JSON.stringify(await document()), before, 'review navigation never changes history or working facts');
  assert.equal(await page.evaluate(() => window.aiwProjectStore.value.revision), revision);
  assert.deepEqual(errors, []);
  await fs.mkdir('audit/round27/model', {recursive: true});
  await fs.writeFile('audit/round27/model/history-work-routes.json', JSON.stringify({results, errors, immutable: true}, null, 2) + '\n');
  console.log(results.join('\n')); console.log('Model history Work routes: PASS');
} finally {
  await browser.close(); await new Promise(resolve => server.close(resolve)); await fs.rm(dir, {recursive: true, force: true});
}
