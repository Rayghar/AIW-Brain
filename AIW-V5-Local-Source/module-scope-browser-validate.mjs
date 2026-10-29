// One module scope across the journey (round 24, D-24-08), in a real browser. The synthetic 1,400-requirement register
// imported through the API with its module structure proposed and a design in Chapters 2 to 10 tied to three business
// modules and a platform module (module-scope-fixture.mjs), restored on a local workbench through /api/recovery:
//   A. the rail lists the modules (business, then platform, each with its requirements) and the structure's state; the
//      workspace bar reads "Scope: All modules"; Chapter 1's Requirements tab leads with the structure screen, whose tree
//      and the facets table beside it list every group the project keeps;
//   B. a module chosen in the rail scopes Chapter 1's register to its requirements; moving through Chapters 2 to 11 keeps
//      scope= in the address and the breadcrumb, and each chapter's Work register and Model pictures hold only what the
//      scope shows, read against module-scope.js on the saved document (the scope's records and the shared ones; never a
//      requirement outside it, nor a record only another business module holds); the scope's own records are listed;
//      Validate reads the chapter's checks for the scope; no chapter change loads a document;
//   C. the module map opens a module; a sub-module scope narrows further; Back returns the previous scope; Clear restores
//      the whole design;
//   D. the structure screen refuses to accept while a requirement is in no module (the finding filters the register), and
//      accepts a person's reviewed acceptance once the partition is clean, recorded on every module;
//   E. each chapter's Model opens within 5 s under the scope; no page error; no sideways scroll at 1440 and 390 px, and
//      the structure screen and the register it leads fit the window at both widths.
// Screenshots of the rail, the breadcrumb, the module map and the structure screen, light and dark, at 1440 and 390 px,
// are written to test-results/module-scope/.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally AIW_BROWSER_EXECUTABLE.
// Starts an isolated local server on a free port. Run: npm run test:module-scope-browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync, mkdirSync} from 'node:fs';
import net from 'node:net';
import {buildModuleScopeProject} from './module-scope-fixture.mjs';
import {restoreScaleProject} from './scripts/build-scale-fixture.mjs';
import {moduleScope, recordModules} from './public/module-scope.js';
import {moduleTree} from './public/module-model.js';
import {architectureModel} from './public/architecture-model.js';
import {requirementGroups} from './public/requirement-groups.js';
import {scopeLens} from './public/module-lens.js';
import {scopedChecks} from './public/readiness-model.js';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = 'test-results/module-scope/';
mkdirSync(SHOTS, {recursive: true});
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/module-scope-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: '', ANTHROPIC_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } for (const f of [db, db + '-wal', db + '-shm']) rmSync(f, {force: true}); });
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port, checks = [], errors = [], measures = {};
const pass = n => { checks.push(n); console.log('PASS', n); };
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});

// What a scope may show, read from module-scope.js on the saved document (independently of the screens' lens): its own
// records, requirements and served records; a record in no module or only in platform modules (under a sub-module, also
// its module's records no sub-module holds); never a requirement outside it, nor a record another business module holds.
function scopeReading(doc, scopeId) {
  const S = moduleScope(doc, scopeId), R = recordModules(doc), T = moduleTree(doc), M = architectureModel(doc);
  const platform = m => T.byId.get(m)?.role === 'platform', own = new Set([...S.records, ...S.requirements, ...S.served]);
  const allowed = id => {
    if (own.has(id)) return true;
    const o = M.objects.get(id); if (!o) return true;
    if (o.type === 'requirement') return false;
    const e = R.get(id); if (!e) return true;
    if (S.sub) return !e.subs.length && e.modules.every(m => m === S.module.id || platform(m));
    return e.modules.every(platform);
  };
  return {S, own, allowed, record: id => M.objects.has(id), type: id => M.objects.get(id)?.type};
}

try {
  const t0 = Date.now(), built = await buildModuleScopeProject();
  const R = await restoreScaleProject({base, document: built.document, name: 'Modules at size'}), P = encodeURIComponent(R.id);
  measures.fixture = {ms: Date.now() - t0, bytes: JSON.stringify(built.document).length, modules: built.modules};
  const {A, B} = built.modules;
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}}), page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', e => errors.push(e.message)); page.on('crash', () => errors.push('page crashed'));
  const settle = (ms = 400) => page.waitForTimeout(ms);
  const saved = () => page.evaluate(async () => (await (await fetch('/api/project' + location.search.replace(/^\?.*?(project=[^&]+).*$/, '?$1'), {credentials: 'same-origin'})).json()).document);
  const scopeOf = () => page.evaluate(() => new URLSearchParams(location.search).get('scope') || '');
  const crumb = () => page.$eval('.scope-bar', e => e.textContent.replace(/\s+/g, ' ').trim());
  const oneDocument = () => page.evaluate(() => ({marker: window.__aiwOneDocument, navigations: performance.getEntriesByType('navigation').length}));
  const noSideways = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const drawn = () => page.evaluate(() => { const els = document.querySelectorAll('.cm [data-sel], .cm [data-card], .cm [data-nt-node], .cm [data-lane], .cm tr[data-nt-row]'); return [...new Set([...els].flatMap(e => [e.dataset.sel, e.dataset.card, e.dataset.ntNode, e.dataset.lane, e.dataset.ntRow]).filter(Boolean).map(v => v.replace(/^MOD:/, '')))]; });
  const chapterLink = async ch => { await page.click(`a.chapter-item[data-chapter="${ch}"]`); await page.waitForFunction(c => Number(new URLSearchParams(location.search).get('chapter')) === c && !document.querySelector('.shell-building-note') && document.querySelector('#studio-surface'), ch); await settle(600); };
  // A chapter model is ready when its stage, the desk or a sheet it keeps open (a Table chosen before) is drawn.
  const modelReady = () => page.waitForSelector('.cm:not(.dk) .cm-stage, .cm.dk .cm-view, .cm .cm-sheet > *', {timeout: 60000});
  // rc39/rc40 Work (rc41 W4): the import summary, the modules and the groups sit in the Requirements stage under the fold
  // "Import, grouping and delivery evidence" (details.work-support), closed unless a group, domain or cause is chosen.
  // inEvidence(sel) waits for the section to be drawn, opens that one fold with a pointer click if it is closed, as a
  // viewer does, and then waits for the section to be visible.
  const inEvidence = async (sel, timeout = 15000) => {
    await page.waitForSelector(sel, {state: 'attached', timeout});
    const fold = page.locator('details.work-support > summary').filter({hasText: /^\s*Import, grouping and delivery evidence\s*$/});
    if ((await fold.count()) !== 1) throw Error('one "Import, grouping and delivery evidence" fold, found ' + await fold.count());
    if (!await fold.evaluate(s => s.parentElement.open)) { await fold.click(); await page.waitForTimeout(250); }
    await page.waitForSelector(sel, {timeout: 8000});
  };
  // Brought into view inside its own scrolling frame (the stage, the studio or the rail), never by scrolling the page.
  const reveal = sel => page.$eval(sel, e => { let s = e.parentElement; while (s && s !== document.body && !(['auto', 'scroll'].includes(getComputedStyle(s).overflowY) && s.scrollHeight > s.clientHeight)) s = s.parentElement; if (s && s !== document.body) s.scrollTop += e.getBoundingClientRect().top - s.getBoundingClientRect().top - 8; });

  // ---------------------------------------------------------------- A. the rail, the bar and the structure screen
  await page.goto(`${base}/?chapter=1&tab=work&project=${P}`, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('#studio-surface'); await page.evaluate(() => { window.__aiwOneDocument = 'module-scope'; });
  await page.click('[data-r-section="requirement"]'); await inEvidence('.r-modules'); await page.waitForSelector('.rail-modules [data-scope-to]');
  let doc = await saved();
  const tree = moduleTree(doc), business = tree.modules.filter(m => m.group.role !== 'platform'), platform = tree.modules.filter(m => m.group.role === 'platform');
  const rail = await page.evaluate(() => ({kinds: [...document.querySelectorAll('.rail-modules .rm-kind')].map(h => h.textContent.trim()), items: [...document.querySelectorAll('.rail-modules [data-scope-to]')].map(b => ({id: b.dataset.scopeTo, label: b.innerText.replace(/\s+/g, ' ').trim(), current: b.getAttribute('aria-current')})), state: document.querySelector('.rail-modules .rm-state')?.textContent || ''}));
  assert.deepEqual(rail.kinds, ['Business · ' + business.length, 'Platform · ' + platform.length], 'the rail lists the business modules, then the platform modules: ' + rail.kinds);
  assert.deepEqual(rail.items.map(x => x.id), ['', ...business.map(m => m.group.id), ...platform.map(m => m.group.id)], 'every module once, in the tree\'s order, after All modules');
  for (const m of tree.modules) { const x = rail.items.find(i => i.id === m.group.id), n = moduleScope(doc, m.group.id).requirements.size; assert.ok(x.label.startsWith(m.group.title) && x.label.includes(n.toLocaleString('en-GB') + ' requirement'), `${m.group.title} reads its ${n} requirements: ${x.label}`); }
  assert.equal(rail.items[0].current, 'true', 'All modules is the scope held');
  assert.match(rail.state, /^Proposed by AIW, not yet accepted/, 'the rail says the structure is proposed');
  assert.equal(await crumb(), 'Scope All modules', 'the workspace bar reads the scope');
  const order = await page.evaluate(() => { const at = s => { const el = document.querySelector(s); return el ? [...document.querySelectorAll('*')].indexOf(el) : -1; }; return {summary: at('.r-import'), modules: at('.r-modules'), facets: at('.r-groups'), list: at('#r-record-list')}; });
  assert.ok(order.summary < order.modules && order.modules < order.facets && order.facets < order.list, 'the structure leads the facets and the register: ' + JSON.stringify(order));
  const listed = await page.evaluate(() => ({tree: [...document.querySelectorAll('.r-modules-table tbody th [data-scope-to]')].map(b => b.dataset.scopeTo), facets: [...document.querySelectorAll('.r-groups-table:not(.r-modules-table) tbody th [data-r-group]')].map(b => b.dataset.rGroup), rows: Math.max(...[...document.querySelectorAll('#workspace tbody')].map(t => t.children.length))}));
  const kept = requirementGroups(doc);
  assert.deepEqual([...listed.tree, ...listed.facets].sort(), kept.map(g => g.id).sort(), 'the structure\'s tree and the facets table together list every group the project keeps');
  assert.deepEqual(listed.facets.sort(), kept.filter(g => g.kind !== 'module' && g.kind !== 'sub-module').map(g => g.id).sort(), 'the facets table keeps the themes and the other groups');
  assert.ok(listed.rows <= 100, 'no table body draws more than 100 rows: ' + listed.rows);
  pass(`A: the rail lists ${business.length} business and ${platform.length} platform modules with their requirements and the proposed state; the bar reads "Scope All modules"; the structure (${listed.tree.length} modules and sub-modules) leads the ${listed.facets.length} facets and the register`);

  // ---------------------------------------------------------------- B. a module across the journey
  const a = scopeReading(doc, A);
  await page.click(`.rail-modules [data-scope-to="${A}"]`);
  await page.waitForFunction(id => new URLSearchParams(location.search).get('scope') === id, A); await settle(600);
  assert.equal(await crumb(), `Scope All modules › ${a.S.title} · Clear`, 'the breadcrumb names the module');
  assert.match(await page.$eval('#yah-text', e => e.textContent), new RegExp(`· Scope: ${a.S.title}$`), '"You are here" names it too');
  assert.equal(await page.$eval(`.rail-modules [data-scope-to="${A}"]`, b => b.getAttribute('aria-current')), 'true', 'the rail marks the module held');
  assert.ok(await page.evaluate(() => document.activeElement?.dataset?.scopeTo), 'the keyboard stays on the rail item chosen');
  const count = await page.$eval('.r-filter-count', e => e.textContent);
  assert.equal(count, `${a.S.requirements.size.toLocaleString('en-GB')} of ${a.S.requirements.size.toLocaleString('en-GB')} requirements in ${a.S.title}`, 'Chapter 1\'s register holds the module\'s requirements: ' + count);
  // rc39/rc40 (rc41 W4): a register row carries data-r-select on its main button and on its Details button; a row is read
  // by its main button (.r-record-main), one per record.
  const rows1 = await page.$$eval('#r-record-list .r-record-main[data-r-select]', bs => bs.map(b => b.dataset.rSelect));
  assert.ok(rows1.length === Math.min(50, a.S.requirements.size) && rows1.every(id => a.S.requirements.has(id)), 'each requirement listed is the module\'s: ' + JSON.stringify({listed: rows1.length, module: a.S.requirements.size, outside: rows1.filter(id => !a.S.requirements.has(id)).slice(0, 5)}));
  const registers = {1: rows1.length};
  // Each chapter's Work register and its Model pictures, under the scope.
  const WORK = {
    2: async () => { await page.click('[data-q-section="scenarios"]'); await page.waitForSelector('#q-driver-list'); return page.$$eval('#q-driver-list [data-q-select]', bs => [...new Set(bs.map(b => b.dataset.qSelect))]); },
    3: async () => page.$$eval('#d-question-select option', os => os.map(o => o.value)),
    4: async () => page.$$eval('#studio-surface [data-register-rows] [data-select]', bs => [...new Set(bs.map(b => b.dataset.select))]),
    5: async () => page.$$eval('#studio-surface [data-register-rows] [data-select]', bs => [...new Set(bs.map(b => b.dataset.select))]),
    6: async () => page.$$eval('#studio-surface [data-register-rows] [data-select]', bs => [...new Set(bs.map(b => b.dataset.select))]),
    7: async () => page.$$eval('select[name="activeRecord"] option', os => os.map(o => o.value)),
    8: async () => page.$$eval('select[name="iContract"] option', os => os.map(o => o.value)),
    9: async () => page.$$eval('select[name="secThreat"] option, select[name="secControl"] option', os => os.map(o => o.value)),
    10: async () => page.$$eval('select[name="rtPlan"] option', os => os.map(o => o.value)),
    11: async () => []
  };
  const own = {2: 'quality', 3: 'decision', 4: 'responsibility', 5: 'component', 10: 'runtime'};
  for (const ch of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
    await chapterLink(ch);
    assert.equal(await scopeOf(), A, `Chapter ${ch}: the address keeps the scope`);
    assert.equal(await crumb(), `Scope All modules › ${a.S.title} · Clear`, `Chapter ${ch}: and the breadcrumb`);
    const ids = await WORK[ch]();
    assert.ok(ids.every(a.allowed), `Chapter ${ch}: the Work register holds only what the scope shows: ${ids.filter(x => !a.allowed(x)).join(', ')}`);
    if (own[ch]) {
      const mine = [...a.own].filter(id => a.type(id) === own[ch]);
      assert.ok(mine.length >= 1 && mine.every(id => ids.includes(id)), `Chapter ${ch}: the scope's own ${own[ch]} records are listed (${mine.join(', ')} in ${ids.join(', ')})`);
      registers[ch] = ids.length;
    }
    // A contract belongs to no module (module-scope.js): the module's own contract and the party's call into it are shown
    // as the context of its components, the contract to another business module's component is not.
    if (ch === 8) {
      assert.ok(ids.includes(built.made.A.contract) && ids.includes(built.made.shared.partyContract), `Chapter 8: the module's contracts are listed (${ids.join(', ')})`);
      assert.ok(!ids.includes(built.made.shared.contract) && !ids.includes(built.made.B.contract), 'Chapter 8: a contract with another business module\'s component at an end is not');
      registers[ch] = ids.length;
    }
  }
  assert.deepEqual(await oneDocument(), {marker: 'module-scope', navigations: 1}, 'no chapter change loaded a document');
  // Validate reads the chapter's checks for the scope: the passages of the records it shows, as readiness-model.js
  // scopedChecks counts them on the saved document.
  // rc38+ (rc41 W4): the Validate frame is the validation workspace, bound to the project and chapter; its readiness line
  // ("Readiness summary") carries the same counts and names the scope it reads for. Each count is pinned in its words.
  await chapterLink(4); await page.click('.tabs [data-tab="validate"]'); await page.waitForSelector('.validation-workspace[data-bound="1"] .validation-readiness[aria-label="Readiness summary"]', {timeout: 60000}); await settle(600);
  const vx = await page.$eval('.validation-workspace .validation-readiness', e => [...e.children].filter(c => c.tagName !== 'DETAILS').map(c => c.textContent.trim())), C4 = scopedChecks(doc, 4, scopeLens(doc, A));
  const num = v => v.toLocaleString('en-GB'), many = (n, one, more) => `${num(n)} ${n === 1 ? one : more}`;
  assert.ok(vx.includes(many(C4.toFix, 'finding to fix', 'findings to fix')) && vx.includes(many(C4.toConfirm, 'item to confirm', 'items to confirm')) && vx.includes(`${num(C4.passing)}/${num(C4.total)} SDD passages passing`) && vx.includes(`Scope: ${a.S.title}`), `Chapter 4 Validate reads for the scope (${C4.toFix} to fix, ${C4.toConfirm} to confirm, ${C4.passing} of ${C4.total} passages): ${JSON.stringify(vx)}`);
  // The pictures: each chapter's Model opens on its own view; then its Diagram and its Table.
  await page.click('.tabs [data-tab="model"]'); await modelReady(); await settle(800);
  const pictures = {};
  for (const ch of [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]) {
    await chapterLink(ch);
    await modelReady(); await settle(800);
    assert.equal(await scopeOf(), A, `Chapter ${ch} Model: the scope holds`);
    let seen = (await drawn()).filter(a.record);
    assert.ok(seen.every(a.allowed), `Chapter ${ch}: its own view draws only what the scope shows: ${seen.filter(x => !a.allowed(x)).slice(0, 8).join(', ')}`);
    pictures[ch] = {own: seen.length};
    if (await page.$('.cm-view[data-id="diagram"]:not([hidden])')) {
      await page.click('.cm-view[data-id="diagram"]'); await settle(1200);
      seen = (await drawn()).filter(a.record);
      assert.ok(seen.every(a.allowed), `Chapter ${ch}: the Diagram draws only what the scope shows: ${seen.filter(x => !a.allowed(x)).slice(0, 8).join(', ')}`);
      pictures[ch].diagram = seen.length;
    }
    if (ch === 4 || ch === 1) {
      await page.click('.cm-view[data-id="table"]'); await page.waitForSelector('.nt-table'); await settle(400);
      const rows = await page.$$eval('.nt-table tbody tr[data-nt-row]', rs => rs.map(r => r.dataset.ntRow));
      assert.ok(rows.length && rows.every(a.allowed), `Chapter ${ch}: the Table lists only what the scope shows`);
      pictures[ch].table = rows.length;
    }
  }
  assert.deepEqual(await oneDocument(), {marker: 'module-scope', navigations: 1}, 'and no Model change did either');
  measures.registers = registers; measures.pictures = pictures;
  pass(`B: ${a.S.title} scopes Chapter 1's register (${a.S.requirements.size} requirements) and holds through Chapters 2 to 11 in the address and the breadcrumb; every Work register and every picture holds only what the scope shows, the scope's own records listed; Validate reads the chapter's checks for it (Chapter 4: ${C4.passing} of ${C4.total} passages); no document load`);

  // ---------------------------------------------------------------- C. the module map, a sub-module, Back and Clear
  const b = scopeReading(doc, B);
  await chapterLink(4); await page.click('.cm-view[data-id="modules"]'); await page.waitForSelector('.mm .mm-card');
  const map = await page.evaluate(() => ({cards: document.querySelectorAll('.mm .mm-card').length, headings: [...document.querySelectorAll('.mm h5')].length, buttons: [...document.querySelectorAll('.mm [data-scope-to]')].every(x => x.tagName === 'BUTTON'), held: document.querySelector('.mm .mm-card.on h5')?.textContent || ''}));
  assert.equal(map.cards, tree.modules.length, 'the module map draws one card per module'); assert.equal(map.headings, tree.modules.length, 'each with its heading'); assert.ok(map.buttons, 'every choice is a button');
  assert.equal(map.held, a.S.title, 'the module held is marked');
  await page.click(`.mm .mm-open[data-scope-to="${B}"]`);
  await page.waitForFunction(id => new URLSearchParams(location.search).get('scope') === id, B); await page.waitForSelector('.mm .mm-card.on'); await settle(600);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset?.scopeTo), B, 'the keyboard stays on the card chosen');
  assert.equal(await crumb(), `Scope All modules › ${b.S.title} · Clear`);
  await page.click('.cm-view[data-id="map"]'); await settle(1200);
  let seen = (await drawn()).filter(b.record);
  assert.ok(seen.length && seen.every(b.allowed), `the module map opened ${b.S.title}: Chapter 4's picture holds its records: ${seen.filter(x => !b.allowed(x)).join(', ')}`);
  // A sub-module of A narrows further.
  const sub = tree.modules.find(m => m.group.id === A).children[0], s = scopeReading(doc, sub.id);
  await page.click('.cm-view[data-id="modules"]'); await page.waitForSelector('.mm .mm-card');
  await page.click(`.mm .mm-sub[data-scope-to="${sub.id}"]`);
  await page.waitForFunction(id => new URLSearchParams(location.search).get('scope') === id, sub.id); await settle(600);
  assert.equal(await crumb(), `Scope All modules › ${a.S.title} › ${sub.title} · Clear`, 'a sub-module reads Module › Sub-module');
  await page.click('.cm-view[data-id="map"]'); await settle(1200);
  seen = (await drawn()).filter(s.record);
  assert.ok(seen.every(s.allowed), `the sub-module's picture holds only what it shows: ${seen.filter(x => !s.allowed(x)).join(', ')}`);
  await chapterLink(1); await page.click('.tabs [data-tab="work"]'); await page.waitForSelector('.r-filter-count');
  assert.equal(await page.$eval('.r-filter-count', e => e.textContent), `${s.S.requirements.size.toLocaleString('en-GB')} of ${s.S.requirements.size.toLocaleString('en-GB')} requirements in ${s.S.title}`, 'Chapter 1\'s register narrows to the sub-module');
  assert.ok(s.S.requirements.size < a.S.requirements.size);
  // Back: the tab, then the chapter, then the previous scope, each a history entry of its own.
  for (const want of [{chapter: 1, tab: 'model', scope: sub.id}, {chapter: 4, tab: 'model', scope: sub.id}, {chapter: 4, tab: 'model', scope: B}]) {
    await page.goBack();
    await page.waitForFunction(w => { const q = new URLSearchParams(location.search); return Number(q.get('chapter')) === w.chapter && q.get('tab') === w.tab && (q.get('scope') || '') === w.scope; }, want);
    await settle(500);
  }
  assert.equal(await crumb(), `Scope All modules › ${b.S.title} · Clear`, 'Back returns the previous scope');
  // Clear restores the whole design.
  await page.click('.scope-bar [data-action="clear-scope"]'); await page.waitForFunction(() => !new URLSearchParams(location.search).has('scope')); await settle(600);
  assert.equal(await crumb(), 'Scope All modules', 'Clear restores the whole design');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-current')), 'location', 'the keyboard moves to the scope now held');
  await page.click('.cm-view[data-id="map"]').catch(() => {}); await settle(1200);
  const whole = (await drawn()).filter(b.record);
  assert.ok(whole.some(x => !b.allowed(x)), 'and the picture draws beyond the module again');
  assert.deepEqual(await oneDocument(), {marker: 'module-scope', navigations: 1}, 'no document load on any scope change, Back or Clear');
  pass(`C: the module map (${map.cards} cards with headings, buttons) opens ${b.S.title}; ${sub.title} narrows ${a.S.title}'s ${a.S.requirements.size} requirements to ${s.S.requirements.size}; Back returns ${b.S.title}; Clear restores the whole design`);

  // ---------------------------------------------------------------- D. the structure screen
  await page.goto(`${base}/?chapter=1&tab=work&project=${P}`, {waitUntil: 'domcontentloaded'}); await page.waitForSelector('#studio-surface');
  await page.click('[data-r-section="requirement"]'); await inEvidence('.r-modules-accept');
  const stray = await page.evaluate(async () => { const r = await window.aiwProjectStore.command({type: 'artefact', payload: {type: 'requirement', title: 'A requirement no module holds yet', description: 'Added without a domain, to be placed in a module.', priority: 'Should', owner: 'Owner', source: 'Synthetic review', confirmed: false}}); document.dispatchEvent(new Event('aiw:redraw')); return r.selected; });
  await inEvidence('.r-modules-findings [data-r-cause="module-none"]');
  const refused = await page.evaluate(() => ({finding: document.querySelector('.r-modules-findings').innerText, disabled: document.querySelector('.r-modules-accept button[type=submit]').disabled, box: document.querySelector('.r-modules-accept [name=reviewed]').disabled, why: document.querySelector('#r-modules-why')?.textContent || ''}));
  assert.equal(refused.finding, '1 requirement in no module');
  assert.ok(refused.disabled && refused.box, 'acceptance is refused while a requirement is outside the partition');
  assert.match(refused.why, /^1 requirement is in no module: place each in one module, then accept\.$/, 'with the reason');
  await reveal('.r-modules-findings'); await settle(200);
  await page.screenshot({path: SHOTS + 'structure-refused-1440-light.png'});
  await page.click('.r-modules-findings [data-r-cause="module-none"]'); await page.waitForSelector('.r-cause-chip');
  assert.deepEqual(await page.$$eval('#r-record-list .r-record-main[data-r-select]', bs => bs.map(b => b.dataset.rSelect)), [stray], 'the finding filters the register to that requirement');
  // The person places it in a module through the group editor (a module's members by id), then accepts, reviewed.
  await page.click('[data-r-action="clear-cause"]'); await inEvidence('.r-modules');
  await page.click(`[data-r-edit-group="${A}"]`); await page.waitForSelector('dialog[open] #r-group-form');
  const form = await page.evaluate(() => ({kind: document.querySelector('dialog[open] [name=kind]').value, role: document.querySelector('dialog[open] [name=role]').value, roleShown: !document.querySelector('dialog[open] [data-r-kinds="module"]').hidden, parentShown: !document.querySelector('dialog[open] [data-r-kinds="sub-module"]').hidden}));
  assert.deepEqual(form, {kind: 'module', role: 'business', roleShown: true, parentShown: false}, 'the group editor edits a module with its role');
  await page.fill('dialog[open] [name=memberIds]', stray);
  await page.click('dialog[open] button[type=submit]');
  // Either the change review opens (a dialog, visible) or the save lands at once; the modules section is drawn either way,
  // inside the evidence fold the save's redraw may close (inEvidence below opens it).
  const review = await page.waitForSelector('dialog[open] [data-reviewed], .r-modules-clean', {state: 'attached', timeout: 30000});
  if (await review.evaluate(e => e.matches('[data-reviewed]'))) { await page.check('dialog[open] [data-reviewed]'); await page.fill('dialog[open] [name="reason"]', 'Place the new requirement in its module.').catch(() => {}); await page.click('dialog[open] [data-wb-action="apply-preview"]'); }
  await inEvidence('.r-modules-clean'); await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  doc = await saved(); assert.equal(moduleTree(doc).home.get(stray)?.moduleId, A, 'the requirement is in the module now');
  await inEvidence('.r-modules-accept button[type=submit]');
  assert.ok(!(await page.$eval('.r-modules-accept button[type=submit]', e => e.disabled)), 'acceptance is offered once the partition is clean');
  await page.click('.r-modules-accept button[type=submit]');
  assert.match(await page.$eval('.r-modules-error', e => e.textContent), /Review the module structure/, 'the review is asked for, not assumed');
  await page.check('.r-modules-accept [name=reviewed]'); await page.click('.r-modules-accept button[type=submit]');
  await inEvidence('.r-modules-accepted');
  doc = await saved();
  const groups = requirementGroups(doc).filter(g => g.kind === 'module' || g.kind === 'sub-module');
  assert.ok(groups.length && groups.every(g => g.state === 'accepted' && g.acceptedBy && g.acceptedAt), 'every module and sub-module is accepted by the person, with when');
  assert.match(await page.$eval('.rail-modules .rm-state', e => e.textContent), /^Accepted/, 'the rail says so');
  pass(`D: the structure screen refuses acceptance while a requirement is in no module (its finding filters the register to it), the group editor places it in ${a.S.title}, and a person's reviewed acceptance is recorded on all ${groups.length} modules and sub-modules`);

  // ---------------------------------------------------------------- E. each chapter's Model under the scope, within 5 s
  const timings = {};
  for (let ch = 1; ch <= 11; ch++) {
    const t = Date.now();
    await page.goto(`${base}/?chapter=${ch}&tab=model&scope=${A}&project=${P}`, {waitUntil: 'domcontentloaded'});
    await modelReady(); timings[ch] = Date.now() - t;
    assert.ok(timings[ch] <= 5000, `Chapter ${ch} Model under the scope: drawn ${timings[ch]} ms after the page opens (bound 5000 ms)`);
    assert.equal(await scopeOf(), A, `Chapter ${ch}: an address that names the scope opens in it`);
    const sizes = await page.evaluate(() => ({nodes: document.getElementsByTagName('*').length, rows: Math.max(0, ...[...document.querySelectorAll('#workspace tbody, #workspace ul, #workspace ol')].map(l => [...l.children].filter(c => !c.hidden).length))}));
    assert.ok(sizes.nodes < 20000 && sizes.rows <= 100, `Chapter ${ch}: ${sizes.nodes} elements, ${sizes.rows} rows in a list`);
  }
  measures.modelMs = timings;
  // An unknown scope is dropped without a word.
  await page.goto(`${base}/?chapter=4&tab=work&scope=RG-999&project=${P}`, {waitUntil: 'domcontentloaded'}); await page.waitForSelector('#studio-surface'); await settle(400);
  assert.equal(await scopeOf(), '', 'an id that names no module is dropped from the address'); assert.equal(await crumb(), 'Scope All modules');
  pass(`E: every chapter's Model opens under the scope within 5 s (slowest ${Math.max(...Object.values(timings))} ms), under 20,000 elements and 100 rows a list; an unknown scope is dropped quietly`);

  // ---------------------------------------------------------------- screenshots, both themes, both widths; no sideways scroll
  for (const theme of ['light', 'dark']) for (const width of [1440, 390]) {
    await page.setViewportSize({width, height: width > 700 ? 900 : 844});
    await page.evaluate(t => { localStorage.setItem('aiw.theme', t); document.documentElement.dataset.theme = t; }, theme);
    await page.goto(`${base}/?chapter=1&tab=work&scope=${A}&project=${P}`, {waitUntil: 'domcontentloaded'}); await page.waitForSelector('#studio-surface');
    await page.click('[data-r-section="requirement"]'); await inEvidence('.r-modules'); await settle(400);
    assert.ok(await noSideways(), `no sideways scroll at ${width} px (${theme}): Chapter 1 Work`);
    await page.screenshot({path: `${SHOTS}breadcrumb-${width}-${theme}.png`});
    await reveal('.r-modules'); await settle(200);
    // The structure and the register it leads stay within the window (nothing clipped at the card's edge).
    // rc38+ (rc41 W4): the register has no card of its own (the Work frame holds it); the register is #r-record-list.
    const edges = await page.evaluate(() => ['.r-modules', '.r-modules-wrap', '#r-record-list'].map(s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().right) : s + ' missing'; }));
    assert.ok(edges.every(r => r <= width), `the structure screen and the register fit ${width} px (${theme}): right edges ${edges}`);
    await page.screenshot({path: `${SHOTS}structure-${width}-${theme}.png`});
    if (width < 700) { await page.click('.workspace-bar .mobile-layers'); await page.waitForSelector('.sidebar.open'); }
    await reveal('.rail-modules'); await settle(200);
    await page.screenshot({path: `${SHOTS}rail-${width}-${theme}.png`});
    await page.goto(`${base}/?chapter=5&tab=model&model=modules&scope=${A}&project=${P}`, {waitUntil: 'domcontentloaded'}); await page.waitForSelector('.mm .mm-card'); await settle(400);
    assert.ok(await noSideways(), `no sideways scroll at ${width} px (${theme}): the module map`);
    await page.screenshot({path: `${SHOTS}module-map-${width}-${theme}.png`});
  }
  await page.evaluate(() => localStorage.setItem('aiw.theme', 'light'));
  assert.deepEqual(errors, [], 'no page error');
  pass('no page error; no sideways scroll at 1440 or 390 px, light and dark; screenshots of the rail, the breadcrumb, the module map and the structure screen written to ' + SHOTS);
  await ctx.close();
} finally { await browser.close(); server.kill('SIGKILL'); }
console.log(JSON.stringify({suite: 'module scope (browser)', passed: checks.length, measures, checks}, null, 2));
