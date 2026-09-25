// Rendered checks for the Chapter 7 Model views (the product stack and the options matrix).
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
const db = '.aiw-local/stack-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => checks.push(n);
try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const open = async (ch = 7) => { await page.goto(base + '/?chapter=' + ch + '&tab=model', {waitUntil: 'networkidle'}); await page.waitForSelector('.cm .cm-head, .cm .dp-row, .cm .tm-card, .cm .rz-card, .cm .pf-cap, .cm .sk-rec', {timeout: 8000}); await page.waitForTimeout(400); };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(250); };
  const count = async sel => (await page.$$(sel)).length;
  const rects = () => page.evaluate(() => [...document.querySelectorAll('.sk-c, .sk-rec')].map(e => { const r = e.getBoundingClientRect(); return [e.className.split(' ')[0], e.dataset.sel || '', Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join('|'); }));
  const spec = () => page.$eval('.cm-panel .cm-spec', e => e.innerText);
  const closeDialog = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(300); if (await page.$('dialog[open]')) { await page.evaluate(() => document.querySelector('dialog[open]').close()); await page.waitForTimeout(200); } };

  // 1. Chapter 7 Model opens on the product stack.
  await open();
  assert.ok(await page.$('.cm.sk .cm-view[data-id="stack"][aria-pressed="true"]'));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.am-explorer, .canvas-card')].some(e => getComputedStyle(e).display !== 'none')), false, 'the explorer is not shown');
  assert.equal(await count('.sk-rec'), 9, 'nine realisations');
  assert.equal(await count('.sk-prod.none'), 9, 'every choice is still to be made');
  assert.equal(await count('.sk-ob.open'), 54, 'no obligation is written');
  assert.equal(await count('.sk-serves.wide'), 3, 'three realisations carry capabilities whose loss stops everything');
  assert.equal(await count('.cm-panel .cm-spec'), 0, 'nothing is selected on arrival');
  assert.match(await page.$eval('.cm-state', e => e.textContent), /9 realisations · 0 chosen · 0 recorded · 0 of 54 obligations written/);
  pass('Chapter 7 Model opens on the product stack: nine realisations in Chapter 6\'s order, every choice hatched as not yet made, 54 obligations open, and three realisations whose failure stops everything');

  // 2. The lens changes emphasis, never position.
  const before = await rects();
  for (const lens of ['operation', 'reasoning', 'structure']) {
    await click(`[data-sk="lens"][data-id="${lens}"]`);
    assert.deepEqual(await rects(), before, lens + ' moved objects');
    const shown = await page.$eval('.sk-rec[data-sel="tr-002"]', e => [...e.querySelectorAll('.sk-l')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.className));
    assert.deepEqual(shown, ['sk-l ' + {operation: 'op', reasoning: 'rs', structure: 'st'}[lens]]);
  }
  pass('Structure, Operation and Reasoning each give their own reading of every realisation and leave everything where it was');

  // 3. Selecting reads the realisation; the chapter's editors and proposals are one click away.
  await click('.sk-rec[data-sel="tr-002"]');
  assert.match(await spec(), /TR-002[\s\S]*Transactional persistence realization[\s\S]*if it fails, 3 of 5 stop[\s\S]*Choice[\s\S]*Not made[\s\S]*Recovery and isolation[\s\S]*Not written/i);
  await click('.cm-panel [data-tr-action="edit-plan"][data-tr-panel="0"]'); await page.waitForTimeout(400);
  assert.match(await page.$eval('dialog[open] #tr-dialog-title', e => e.textContent), /Edit TR-002 realization/);
  await closeDialog();
  await click('.cm-panel [data-sk="act"][data-act="ghost"][data-key="recover"]'); await page.waitForTimeout(900);
  assert.match(await page.$eval('.cm-banner', e => e.innerText), /Implementation proposal · not saved/i);
  assert.equal(await count('.sk-ob.proposed'), 3, 'data, recovery and interface obligations proposed');
  await click('.cm-banner [data-tr-action="dismiss"]'); await page.waitForTimeout(500);
  assert.equal(await count('.sk-ob.proposed'), 0);
  pass('selecting a realisation reads its capability, dependants, choice and obligations; Edit realisation opens the Chapter 7 editor, and the recovery proposal marks the three obligations it would write until dismissed');

  // 4. An option is previewed, then preferred.
  await click('.sk-rec[data-sel="tr-002"]');
  const opt = await page.$eval('.cm-panel .cm-link[data-sel^="tr-002/"]', e => e.dataset.sel);
  await click(`.cm-panel .cm-link[data-sel="${opt}"]`);
  assert.match(await spec(), /Option · TO-\d+ for TR-002[\s\S]*PostgreSQL/i);
  await click('.cm-panel [data-sk="act"][data-act="preview-option"]'); await page.waitForTimeout(900);
  assert.ok(await page.$('.sk-prod.preview'), 'the preview stands in the choice column');
  assert.match(await page.$eval('.cm-banner', e => e.innerText), /Option preview · not saved[\s\S]*PostgreSQL database service for TR-002/i);
  await click('.cm-banner [data-sk="prefer"]'); await page.waitForTimeout(1400);
  assert.ok(!(await page.$('.sk-prod.preview')));
  assert.match(await page.$eval('.sk-c.sk-prod[data-sel="tr-002"]', e => e.innerText), /Preferred[\s\S]*PostgreSQL/i);
  assert.match(await page.$eval('.cm-state', e => e.textContent), /1 chosen/);
  pass('an option can be previewed in the stack, then preferred through the Chapter 7 editor: the choice column shows it and the selection moves to a draft preference');

  // 5. Options: the comparison for one realisation.
  await page.click('.sk-rec[data-sel="tr-002"]'); await page.waitForTimeout(120); await page.click('.sk-rec[data-sel="tr-002"]'); await page.waitForTimeout(600);
  assert.ok(await page.$('.cm-view[data-id="options"][aria-pressed="true"]'));
  assert.equal(await count('.sk-oh'), 2); assert.equal(await count('.sk-crit:not(.note)'), 10); assert.equal(await count('.sk-as'), 20);
  assert.ok(await page.$('.sk-oh.chosen'), 'the preferred option is marked');
  assert.equal(await count('.sk-weigh'), 2, 'the options are weighed against the drivers'); assert.ok(await count('.sk-as.sug') > 0, 'with judgements suggested from what each product is documented to do');
  assert.equal(await page.$eval('.cm-scn select', e => e.value), 'tr-002');
  await click('.sk-as[data-criterion="operations"]'); await page.waitForTimeout(500);
  assert.ok(await page.$('dialog[open] #tr-assessment-form'), 'a judgement opens the Chapter 7 assessment editor');
  await closeDialog();
  await page.selectOption('.cm-scn select', 'tr-004'); await page.waitForTimeout(400);
  assert.equal(await count('.sk-crit:not(.note)'), 4, 'nothing depends on read acceleration, so only the general criteria apply');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  assert.ok(await page.$('.cm-view[data-id="stack"][aria-pressed="true"]'), 'Escape returns to the stack');
  await click('[data-sk="depth"][data-id="options"]');
  assert.equal(await count('.sk-rec'), 27, 'realisations with every option in place');
  await click('[data-sk="depth"][data-id="realisations"]');
  pass('Options compares one realisation\'s alternatives against its criteria, opens the assessment editor from a judgement, switches realisation from the bar, and Escape returns to the stack; With options lists every alternative in place');

  // 6. The explorer is one click away; other chapters keep their models.
  await click('[data-sk="explore"]'); await page.waitForTimeout(400);
  assert.ok(await page.$('.am-explorer [data-am="chapter-model"]') && !(await page.$('.cm')));
  await click('.am-explorer [data-am="chapter-model"]'); await page.waitForTimeout(500);
  assert.ok(await page.$('.cm.sk .sk-rec'));
  await page.goto(base + '/?chapter=11&tab=model', {waitUntil: 'networkidle'}); await page.waitForTimeout(900);
  assert.ok(await page.$('.cm.dk .dk-cell'), 'chapter 11 opens on the review desk');
  await open(6); assert.ok(await page.$('.cm.pf') && !(await page.$('.cm.sk')), 'Chapter 6 keeps its platform');
  assert.equal(await count('.cm'), 1, 'only one chapter model is on the page');
  await open(7);
  await page.click('.workspace-bar [data-tab="validate"]'); await page.waitForTimeout(900);
  assert.ok(await page.$('.vx-ready') && !(await page.$('.cm')), 'Validate opens on SDD readiness');
  pass('Explore all perspectives and back, Chapter 11 opens on the review desk, Chapter 6 keeps its own models, only one chapter model is ever on the page, and Validate is unchanged');

  // 7. Phone.
  const phone = await browser.newContext({viewport: {width: 390, height: 844}});
  const p2 = await phone.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(base + '/?chapter=7&tab=model', {waitUntil: 'networkidle'}); await p2.waitForSelector('.cm .sk-rec'); await p2.waitForTimeout(400);
  const m = await p2.evaluate(() => ({h: document.querySelector('.cm-stage').getBoundingClientRect().height, over: document.documentElement.scrollWidth > innerWidth}));
  assert.ok(m.h >= 360 && !m.over, 'phone ' + JSON.stringify(m));
  await phone.close();
  pass('on a 390 px phone the stack has a usable canvas and no horizontal page scroll');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'chapter 7 model (rendered)', passed: checks.length, checks}, null, 2));
