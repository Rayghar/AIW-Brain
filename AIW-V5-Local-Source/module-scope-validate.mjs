// The shell's module scope (round 24, audit/round24/PLAN.md D-24-08), without a browser. On the module-scope project
// (module-scope-fixture.mjs: the synthetic 1,400-requirement register with its proposed structure and a design in
// Chapters 2 to 10 tied to three business modules and a platform module), the suite asserts:
//   1. the place (public/app.js run in a sandbox, as validate.mjs runs it): the scope is the address's first, then the
//      browser's saved one; an id that names no module or sub-module is dropped; the address names it on every chapter
//      and tab; an in-app link names a scope or keeps the one held, a history entry without one is the whole design; a
//      link that names only a scope is a place; a scope chosen is a new history entry, saved, announced (aiw:scope) and
//      held for the views (project-context.js shellScopeId); Clear returns the whole design;
//   2. the links the app builds carry the scope (project-context.js scopedHref and scopeProjectLinks): this project's
//      chapter links, not another project's, not the Projects page, not a link that names its own scope on purpose;
//   3. the register's filter (requirement-commands.js selectRequirements, filter.module): a module or sub-module selects
//      exactly the requirements its scope holds (module-scope.js moduleScope), in register order; another id none; a
//      bulk step under the scope (requirements.confirm) touches only those;
//   4. the lens (module-lens.js): no scope is the saved document itself; a scope's lens shows its own records and only
//      the shared context around them, never another business module's records or another scope's requirements (a
//      register holds a record by its id, a link row by its ends); the
//      Model tab's projection holds exactly what the lens shows, is made once, leaves the saved document untouched and
//      reads its checks from the saved document; a sub-module's chapter model follows the group that realises it;
//   5. readiness (readiness-model.js): no scope reads the chapter as today; a scope reads the passages of its records,
//      Chapter 11 and the board's SDD stay the whole design's; Chapter 1's next step asks a person to review and accept
//      a proposed structure, under a scope too.
// Run: npm run test:module-scope
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {browserSource} from './browser-source.mjs';
import * as projectContext from './public/project-context.js';
import * as projectScope from './public/model-scope.js';
import {nodes, edges} from './public/model.js';
import {buildModuleScopeProject} from './module-scope-fixture.mjs';
import {settleDocument} from './public/document-memo.js';
import {moduleTree} from './public/module-model.js';
import {moduleScope, recordModules} from './public/module-scope.js';
import {selectRequirements, FILTER_KEYS, applyRequirementsCommand} from './public/requirement-commands.js';
import {scopeLens, lensHolds, scopedDocument, baseOf, scopeFindings, realisingGroups} from './public/module-lens.js';
import {recordBelongsTo} from './public/chapter-records.js';
import {architectureModel} from './public/architecture-model.js';
import {chapterChecks, scopedChecks, scopedBoard, sddBoard} from './public/readiness-model.js';
import {pad2} from './public/util.js';
import {TAB_PURPOSE} from './public/shell-ux.js';

const checks = [], pass = name => checks.push(name);
const t0 = Date.now();
const built = await buildModuleScopeProject();
const p = settleDocument(built.document), {A, B, P} = built.modules, tree = moduleTree(p);
const subA = tree.modules.find(m => m.group.id === A).children[0].id, subB = tree.modules.find(m => m.group.id === B).children[0].id;
const facet = (p.requirementGroups?.records || []).find(g => g.kind !== 'module' && g.kind !== 'sub-module');
assert.ok(facet && subA && subB, 'the fixture has sub-modules under A and B and a group that is no module');
const buildMs = Date.now() - t0;

// ---------------------------------------------------------------- 1. the place, in the shell
const PAGE_LOAD = '\npersist();render();focusRouteHash(location.hash);\n';
const shellSource = fs.readFileSync('public/app.js', 'utf8');
assert.ok(shellSource.includes(PAGE_LOAD), 'public/app.js still ends by drawing the page as the sandbox expects; update PAGE_LOAD with the shell');
// chapter-layers.js re-exports chapter-names.js, which the loader inlines there (rc39, as validate.mjs); including it again declared its table twice.
const app = (browserSource('public/html-escape.js') + browserSource('public/chapter-layers.js') + shellSource).replace(/^import .*?;\n/gm, '').replace(PAGE_LOAD, '\n');
const model = fs.readFileSync('public/model.js', 'utf8').replaceAll('export const ', 'const ');
const ux = browserSource('public/workspace-ux.js');
const ORIGIN = 'http://aiw.test';
// A shell opened at an address, with a saved preference and a project; render and the surfaces are not drawn.
function openShell({search = '', saved = null, doc = p} = {}) {
  const el = {clientWidth: 1200, textContent: '', style: {}, dataset: {}, innerHTML: '', classList: {add() {}, remove() {}, toggle() {}}, focus() {}, click() {}, setAttribute() {}, scrollIntoView() {}, replaceWith() {}};
  // The footer's next task (rc41) is built in a <template> and swapped in for .workspace-next, as validate.mjs models it: a
  // template's content holds the element its markup makes, and the footer is replaced by it.
  let footer = null;
  const element = outerHTML => ({outerHTML, replaceWith(node) { if (footer === this) footer = node; }});
  const template = () => { let html = ''; const content = {firstElementChild: null, querySelectorAll: () => []}; return {content, get innerHTML() { return html; }, set innerHTML(v) { html = String(v); content.firstElementChild = html.trim() ? element(html.trim()) : null; }}; };
  footer = element('<button type="button" class="workspace-next" data-action="next"></button>');
  const studio = {graph: () => ({nodes, edges}), bind() {}, enter() {}, pause() {}, milestones: () => [], scenarioAction: () => ''};
  const location = {search, pathname: '/', hash: '', href: ORIGIN + '/' + search, origin: ORIGIN}, pushed = [], replaced = [], events = [], stored = {};
  const go = url => { const u = new URL(url, ORIGIN + '/'); location.search = u.search; location.hash = u.hash; location.href = u.href; };
  const ctx = {console, Set, Map, URL, URLSearchParams, location, Blob, setTimeout: () => 0, clearTimeout() {}, busyClock: () => () => {},
    history: {state: null, replaceState(st, t, url) { replaced.push(url); go(url); }, pushState(st, t, url) { pushed.push(url); go(url); }},
    localStorage: {getItem: k => (k.startsWith('aiw-v5-explorer-v1') && saved ? JSON.stringify(saved) : stored[k] ?? null), setItem(k, v) { stored[k] = v; }},
    document: {body: el, querySelector: sel => (sel === '.workspace-next' ? footer : el), querySelectorAll: () => [], addEventListener() {}, createElement: tag => (tag === 'template' ? template() : el)},
    window: {aiwLogicalStudio: studio, aiwProjectStore: doc ? {value: {document: doc}} : undefined, addEventListener() {}, dispatchEvent(e) { events.push(e); }, matchMedia: () => ({matches: false})},
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } }, moduleTree, scopeLens, recordBelongsTo};
  // app.js takes pad2 from util.js (rc39), TAB_PURPOSE from shell-ux.js and the footer's next task from readiness-model.js chapterChecks (rc41).
  Object.assign(ctx, projectContext, projectScope, {pad2, TAB_PURPOSE, chapterChecks}); vm.createContext(ctx);
  vm.runInContext(model + '\n' + ux + '\n' + app + '\nrender=()=>{};refreshInspector=()=>{};renderFlow=()=>{};closeModal=()=>{};toast=()=>{};globalThis.test={s,routeURL,inAppRoute,applyRoute,writeRoute,adoptScope,setScope,mark};', ctx);
  const t = ctx.test;
  t.adoptScope(t.s.scope); // as render does first
  return {t, pushed, replaced, events, stored, location, footer: () => footer.outerHTML, savedView: () => JSON.parse(Object.entries(stored).find(([k]) => k.startsWith('aiw-v5-explorer-v1'))?.[1] || '{}')};
}
const scopeIn = url => new URL(url, ORIGIN + '/').searchParams.get('scope');
{
  // The address first, then the saved preference; an unknown id dropped, from either.
  let S = openShell({search: `?chapter=4&tab=model&scope=${B}`, saved: {chapter: 4, tab: 'model', scope: A}});
  assert.equal(S.t.s.scope, B, 'the address names the scope first'); assert.equal(projectContext.shellScopeId(), B, 'the views read the shell\'s scope');
  S = openShell({search: '?chapter=4&tab=model', saved: {chapter: 4, tab: 'model', scope: A}});
  assert.equal(S.t.s.scope, A, 'an address that names no scope opens in the scope this browser saved for the project');
  S = openShell({search: '?chapter=4&tab=model&scope=', saved: {chapter: 4, tab: 'model', scope: A}});
  assert.equal(S.t.s.scope, '', 'an address that names an empty scope is the whole design, whatever was saved');
  S = openShell({search: '?chapter=4&tab=model&scope=RG-999', saved: {scope: A}});
  assert.equal(S.t.s.scope, '', 'an id that names no module or sub-module is dropped'); assert.equal(projectContext.shellScopeId(), '');
  S = openShell({search: `?chapter=4&tab=model&scope=${facet.id}`});
  assert.equal(S.t.s.scope, '', 'a group that is no module is no scope');
  S = openShell({search: '?chapter=4&tab=model', saved: {scope: 'RG-999'}});
  assert.equal(S.t.s.scope, '', 'a saved scope the project no longer holds is dropped');
  S = openShell({search: `?chapter=4&tab=model&scope=${A}`, doc: {id: 'blank', artefacts: []}});
  assert.equal(S.t.s.scope, '', 'a project without modules has no scope');

  // The address names the scope on every chapter and tab, and nothing without one.
  S = openShell({search: `?chapter=1&tab=work&scope=${subA}`});
  for (let chapter = 1; chapter <= 11; chapter++) for (const tab of ['work', 'model', 'validate', 'output']) {
    S.t.s.chapter = chapter; S.t.s.tab = tab;
    assert.equal(scopeIn(S.t.routeURL()), subA, `Chapter ${chapter} ${tab}: the address names the scope`);
  }
  S.t.s.scope = ''; assert.equal(scopeIn(S.t.routeURL()), null, 'the whole design names no scope');
  pass('the scope is the address\'s first, then the saved one; an id that names no module is dropped; the address names it on every chapter and tab');

  // Links and history entries.
  S = openShell({search: `?chapter=1&tab=work&scope=${A}`});
  const link = href => S.t.inAppRoute(href, true), entry = href => S.t.inAppRoute(href);
  assert.equal(link(`/?chapter=3&tab=work&scope=${B}`).scope, B, 'a link names its scope');
  assert.equal(link('/?chapter=3&tab=work').scope, undefined, 'a link that names none keeps the scope held');
  assert.equal(entry('/?chapter=3&tab=work').scope, '', 'a history entry without a scope is the whole design');
  const only = link(`/?scope=${B}`);
  assert.ok(only && only.chapter === 1 && only.scope === B, 'a link that names only a scope is a place in the chapter on screen');
  assert.equal(link('/?scope=').scope, '', 'a link that names an empty scope clears it');
  assert.equal(link(`/?view=projects&scope=${B}`), null, 'the Projects page is no place in the workspace');

  // A scope chosen: held, announced, saved, a history entry; a link without one keeps it; Back to an entry without one clears it.
  S.location.search = new URL(S.t.routeURL(), ORIGIN + '/').search;
  S.t.setScope(B); S.t.writeRoute(true);
  assert.equal(S.t.s.scope, B); assert.equal(projectContext.shellScopeId(), B);
  assert.deepEqual(S.events.filter(e => e.type === 'aiw:scope').map(e => e.detail.scope), [B], 'the change is announced once (aiw:scope)');
  assert.equal(S.savedView().scope, B, 'the scope is saved with the view');
  assert.equal(S.pushed.length, 1, 'a scope chosen is a new history entry'); assert.equal(scopeIn(S.pushed[0]), B);
  S.t.writeRoute(true); assert.equal(S.pushed.length, 1, 'the same place again replaces the entry');
  S.t.applyRoute(link('/?chapter=5&tab=model'), 'model', {link: true});
  assert.equal(S.t.s.chapter, 5); assert.equal(S.t.s.scope, B, 'a chapter link keeps the scope');
  S.t.applyRoute(entry(`/?chapter=2&tab=work&scope=${subB}`), 'work');
  assert.equal(S.t.s.scope, subB, 'Back to an entry with a sub-module holds it'); assert.equal(projectContext.shellScopeId(), subB);
  S.t.applyRoute(entry('/?chapter=2&tab=work'), 'work');
  assert.equal(S.t.s.scope, '', 'Back to an entry without a scope is the whole design'); assert.equal(projectContext.shellScopeId(), '');
  S.t.setScope(A); S.t.setScope('');
  assert.equal(S.t.s.scope, '', 'Clear returns the whole design'); assert.equal(S.savedView().scope, '');
  assert.deepEqual(S.events.filter(e => e.type === 'aiw:scope').map(e => e.detail.scope), [B, subB, '', A, ''], 'each change is announced');
  pass('a link names a scope or keeps the one held; a history entry without one is the whole design; a scope-only link is a place; a scope chosen is saved, announced and a new history entry; Clear returns the whole design');
}

// ---------------------------------------------------------------- 2. the links the app builds
{
  const {scopedHref, setShellScopeId, scopeProjectLinks} = projectContext;
  setShellScopeId(A);
  assert.equal(scopedHref('/?chapter=2&tab=work'), `/?chapter=2&tab=work&scope=${A}`, 'a chapter link carries the scope');
  assert.equal(scopedHref('/?chapter=2&tab=work#ac-readiness'), `/?chapter=2&tab=work&scope=${A}#ac-readiness`, 'its anchor is kept');
  assert.equal(scopedHref('/?project=another&chapter=2'), '/?project=another&chapter=2', 'another project\'s link is not scoped');
  assert.equal(scopedHref('/?view=projects'), '/?view=projects', 'the Projects page is not scoped');
  assert.equal(scopedHref('https://example.org/?chapter=2'), 'https://example.org/?chapter=2', 'a link out of the app is not touched');
  assert.equal(scopedHref(`/?chapter=2&scope=${A}`), `/?chapter=2&scope=${A}`, 'a link that already carries the scope is kept');
  setShellScopeId('');
  assert.equal(scopedHref(`/?chapter=2&scope=${A}`), '/?chapter=2', 'without a scope, a link drops the one it carried');
  setShellScopeId(B);
  const anchor = (href, own = false) => ({href, attrs: {href, ...(own ? {'data-scope-link': ''} : {})}, getAttribute(k) { return this.attrs[k] ?? null; }, hasAttribute(k) { return k in this.attrs; }, setAttribute(k, v) { this.attrs[k] = v; }});
  const plain = anchor('/?chapter=4&tab=model'), own = anchor(`/?chapter=4&tab=model&scope=${A}`, true);
  globalThis.location = {search: '?chapter=4&tab=model', origin: ORIGIN}; // the page the links are on
  try { scopeProjectLinks({querySelectorAll: () => [plain, own]}); } finally { delete globalThis.location; }
  assert.equal(plain.getAttribute('href'), `/?chapter=4&tab=model&scope=${B}`, 'the page\'s project links carry the scope');
  assert.equal(own.getAttribute('href'), `/?chapter=4&tab=model&scope=${A}`, 'a link that names its own scope (data-scope-link) keeps it');
  setShellScopeId('');
  pass('the links the app builds carry the scope: this project\'s chapter links, not another project\'s, the Projects page, a link out or one that names its own scope');
}

// ---------------------------------------------------------------- 3. the register's filter
{
  assert.ok(FILTER_KEYS.includes('module'), 'a bulk step carries the module filter');
  const order = new Map(p.artefacts.filter(a => a.type === 'requirement').map((a, i) => [a.id, i]));
  let scopes = 0;
  for (const m of tree.modules) for (const g of [m.group, ...m.children]) {
    const got = selectRequirements(p, {filter: {module: g.id}}).map(a => a.id), want = moduleScope(p, g.id).requirements;
    assert.equal(got.length, want.size, `${g.id}: ${got.length} selected, ${want.size} in its scope`);
    assert.ok(got.every(id => want.has(id)), `${g.id}: only its scope's requirements`);
    assert.ok(got.every((id, i) => !i || order.get(got[i - 1]) < order.get(id)), `${g.id}: in register order`);
    scopes++;
  }
  assert.equal(selectRequirements(p, {filter: {module: 'RG-999'}}).length, 0, 'an id that names no module selects none');
  assert.equal(selectRequirements(p, {filter: {module: facet.id}}).length, 0, 'a group that is no module selects none through the module filter');
  const unconfirmed = selectRequirements(p, {filter: {module: subA, unconfirmed: true}});
  assert.ok(unconfirmed.length > 0 && unconfirmed.every(a => moduleScope(p, subA).requirements.has(a.id) && !a.confirmed), 'the module filter narrows with the others');
  const before = new Set(p.artefacts.filter(a => a.type === 'requirement' && a.confirmed).map(a => a.id));
  const r = applyRequirementsCommand(p, {type: 'requirements.confirm', payload: {reviewed: true, filter: {module: subA}, count: unconfirmed.length}}, '2026-10-14T10:00:00.000Z', 'architect-modules');
  const confirmed = r.document.artefacts.filter(a => a.type === 'requirement' && a.confirmed && !before.has(a.id)).map(a => a.id);
  assert.deepEqual(new Set(confirmed), new Set(unconfirmed.map(a => a.id)), 'a bulk step under the scope confirms the scope\'s requirements and no other');
  pass(`the register's module filter selects exactly each scope's requirements (${scopes} modules and sub-modules), in register order; another id none; a bulk step under the scope touches only them`);
}

// ---------------------------------------------------------------- 4. the lens and the Model tab's projection
{
  assert.equal(scopeLens(p, ''), null); assert.equal(scopedDocument(p, ''), p, 'no scope: the saved document itself');
  assert.equal(scopeLens(p, 'RG-999'), null); assert.equal(scopedDocument(p, 'RG-999'), p, 'an id that names no module: the saved document itself');
  const saved = JSON.stringify(p), M = architectureModel(p), R = recordModules(p), SKIP = new Set(['system', 'view', 'baseline']);
  const business = id => tree.byId.get(id)?.role !== 'platform';
  const sizes = {};
  for (const id of [A, B, subA, P]) {
    const L = scopeLens(p, id), S = moduleScope(p, id), q = scopedDocument(p, id);
    assert.ok(L && L.id === id && L.title === S.title, `${id}: a lens of the scope`);
    for (const x of [...S.requirements, ...S.records, ...S.served]) assert.ok(L.core.has(x) && L.shows.has(x), `${id}: its own ${x} is shown`);
    for (const x of L.shows) {
      const o = M.objects.get(x); assert.ok(o, `${id}: ${x} is a record of the design`);
      if (o.type === 'requirement') assert.ok(S.requirements.has(x) || S.served.has(x), `${id}: requirement ${x} outside the scope is not shown`);
      if (L.core.has(x)) continue;
      const e = R.get(x);
      if (e) assert.ok(!e.modules.some(m => business(m) && m !== L.module.id) && !(L.sub && e.subs.some(s => s !== L.sub.id)), `${id}: ${x} (${o.type}) another business module or sub-module holds is not shown as context`);
      if (o.type === 'contract') assert.ok([o.record?.from, o.record?.to].every(end => !end || !M.objects.has(end) || L.shows.has(end)), `${id}: context contract ${x} has both ends shown`);
    }
    // Context is within two links of the scope's own records through what the lens shows (a shared container not crossed).
    const near = new Set(L.core); let edge = [...L.core];
    for (let d = 0; d < 2; d++) { const next = []; for (const x of edge) for (const e of [...(M.outgoing.get(x) || []), ...(M.incoming.get(x) || [])]) { const y = e.from === x ? e.to : e.from; if (!near.has(y) && L.shows.has(y)) { near.add(y); if (!['environment', 'boundary', 'module'].includes(M.objects.get(y).type)) next.push(y); } } edge = next; }
    assert.deepEqual([...L.shows].filter(x => !near.has(x)), [], `${id}: every record shown is within two links of the scope's own`);
    // The projection: what the lens shows, made once, the saved document untouched, its checks the saved document's.
    assert.ok(q !== p && baseOf(q) === p && scopedDocument(p, id) === q, `${id}: one projection per document and scope`);
    const Q = architectureModel(q);
    // A part of a record (a decision's alternative, an option, a contract's exchange, a data field) comes with its record.
    const whole = x => x.replace(/\/(alternative|option|exchange|field)\/.*$/, '');
    for (const [x, o] of Q.objects) if (!SKIP.has(o.type)) assert.ok(L.shows.has(x) || L.shows.has(whole(x)), `${id}: the projection holds ${x} (${o.type}) only if the lens shows it`);
    for (const x of L.core) if (M.objects.has(x)) assert.ok(Q.objects.has(x), `${id}: the projection holds its own ${x}`);
    const fs = [{objectId: [...L.core].find(x => M.objects.get(x)?.type !== 'requirement'), code: 'own'}, {objectId: [...M.objects.keys()].find(x => !L.shows.has(x) && !SKIP.has(M.objects.get(x).type)), code: 'outside'}, {code: 'chapter'}];
    assert.deepEqual(scopeFindings(q, fs).map(f => f.code), ['own', 'chapter'], `${id}: a finding on a record outside the scope leaves the projection's checks`);
    sizes[id] = {core: L.core.size, shows: L.shows.size, objects: Q.objects.size};
  }
  assert.equal(JSON.stringify(p), saved, 'no lens or projection changes the saved document');
  // The registers' reading (lensHolds): a record by its id, a link row by its ends; without a scope, everything.
  const LA = scopeLens(p, A), [a1, a2] = built.made.A.components, b1 = built.made.B.components[0];
  assert.ok(lensHolds(LA, a1) && lensHolds(LA, {id: a1}) && !lensHolds(LA, b1) && !lensHolds(LA, {id: b1}), 'a record is held by its id');
  assert.ok(lensHolds(LA, {from: a1, to: a2}) && !lensHolds(LA, {from: a1, to: b1}), 'a link row is held when the scope shows both its ends');
  assert.ok(lensHolds(null, {id: b1}) && lensHolds(null, b1), 'without a scope every record is held');
  // A's projection holds none of B's own records; the contract between them is A's (it is A's data on the wire) and
  // shows B's component as its end.
  const qa = architectureModel(scopedDocument(p, A)).objects, mb = built.made.B;
  for (const x of [...mb.responsibilities, mb.data, mb.contract, mb.decision, ...mb.drivers]) assert.ok(!qa.has(x), `A's picture does not hold B's ${x}`);
  for (const x of [...built.made.A.components, built.made.A.data, built.made.A.contract, built.made.threat, built.made.control]) assert.ok(qa.has(x), `A's picture holds A's ${x}`);
  // The contract from A to B shows an end B does not show, so B's picture holds neither it nor A's data it carries.
  const lb = scopeLens(p, B);
  assert.ok(!lb.shows.has(built.made.shared.contract) && !lb.shows.has(built.made.A.data), 'B does not show A\'s data through the contract it does not show');
  // A sub-module's chapter model follows the group that realises it, else its module's.
  assert.deepEqual(realisingGroups(p, A), [built.made.A.group], 'A is realised by its own responsibility group');
  assert.deepEqual(realisingGroups(p, subA), [built.made.A.group], 'a sub-module no group realises follows its module\'s');
  assert.deepEqual(realisingGroups(p, 'RG-999'), []);
  pass(`the lens shows a scope's own records and only shared context (A ${sizes[A].shows}, its sub-module ${sizes[subA].shows}, B ${sizes[B].shows}, platform ${sizes[P].shows} records), never another module's; the projection holds what the lens shows, once, the saved document untouched, its checks the saved document's`);
}

// ---------------------------------------------------------------- 5. readiness under a scope
{
  for (let ch = 1; ch <= 11; ch++) assert.equal(scopedChecks(p, ch, null), chapterChecks(p, ch), `Chapter ${ch}: no scope reads the chapter as today`);
  const L = scopeLens(p, A);
  for (let ch = 1; ch <= 10; ch++) {
    const C = chapterChecks(p, ch), X = scopedChecks(p, ch, L);
    assert.ok(X.passages.every(x => x.id !== 'project' && L.shows.has(x.id)), `Chapter ${ch}: the scope reads the passages of the records it shows`);
    assert.ok(X.total <= C.total && X.toFix <= C.toFix && X.toConfirm <= C.toConfirm, `Chapter ${ch}: the scope reads a part of the chapter`);
    assert.equal(X.scope, L.title);
  }
  assert.equal(scopedChecks(p, 11, L), chapterChecks(p, 11), 'Chapter 11 reads the whole design under a scope');
  const board = scopedBoard(p, L), whole = sddBoard(p);
  assert.equal(board.scope, L.title); assert.equal(board.chapters.length, 11);
  assert.equal(board.chapters[10], whole.chapters[10], 'the board\'s Chapter 11 stays the whole design\'s');
  assert.ok(board.total <= whole.total, 'the board reads a part of the design');
  // Chapter 1's next step: the proposed structure waits for a person's review and acceptance, under a scope too.
  assert.equal(tree.state, 'proposed');
  const next = chapterChecks(p, 1).next;
  assert.equal(next.text, 'Review and accept the proposed module structure'); assert.ok(next.url.endsWith('&tab=work#modules') || next.url.includes('tab=work') && next.url.endsWith('#modules'), next.url);
  assert.equal(scopedChecks(p, 1, L).next, next, 'under a scope too');
  // The shell's footer names that step once the progress changes (rc41): a link to it, whole design and under a scope.
  for (const search of ['?chapter=1&tab=work', `?chapter=1&tab=work&scope=${A}`]) {
    const S = openShell({search}); S.t.mark('inspect');
    const html = S.footer(), amp = v => String(v).replaceAll('&', '&amp;');
    assert.ok(html.startsWith(`<a class="workspace-next" data-action="next" data-next-kind="${amp(next.kind || '')}" href="${amp(next.url)}" aria-label="Open next task: ${next.text}">`), `${search}: the footer links the readiness model's next step: ${html}`);
    assert.ok(html.includes(`<strong id="next-text">${next.text}</strong>`), `${search}: the footer names it`);
  }
  pass('no scope reads each chapter as today; a scope reads the passages of its records, Chapter 11 and the board\'s whole-design chapter stay whole; Chapter 1 asks a person to review and accept the proposed structure, and the shell\'s footer links that step');
}

console.log(JSON.stringify({status: 'passed', fixture: {requirements: p.artefacts.filter(a => a.type === 'requirement').length, modules: tree.modules.length, subModules: tree.modules.reduce((k, m) => k + m.children.length, 0), builtMs: buildMs}, checks}, null, 2));
