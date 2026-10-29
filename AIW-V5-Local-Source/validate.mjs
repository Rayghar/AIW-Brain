// The reference model and the Chapter 4–11 shell's own state rules, without a browser.
// The shell (public/app.js) runs here against a studio that serves the reference graph, as entry.js
// serves the project's. The studio-less prototype, its canvas layout, search and hard-coded findings
// were retired (audit F-02, F-22); their checks went with them. Chapter surfaces are checked by the
// chapter suites and the browser suites.
import {browserSource} from './browser-source.mjs';
import * as projectContext from './public/project-context.js';
import * as projectScope from './public/model-scope.js';
import * as chapterRecords from './public/chapter-records.js';
import * as shellRecordSubject from './public/shell-record-subject.js';
import {pad2} from './public/util.js';
import {TAB_PURPOSE} from './public/shell-ux.js';
import {layers, nodes, edges, stages} from './public/model.js';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// The reference model: eight layers, unique objects, relationships that resolve, a five-step journey.
assert.equal(layers.length, 8);
assert.equal(new Set(nodes.map((n) => n.id)).size, nodes.length);
for (const e of edges) { assert(nodes.some((n) => n.id === e.from)); assert(nodes.some((n) => n.id === e.to)); }
for (const layer of layers) assert(nodes.some((n) => n.layer === layer.id));
assert.deepEqual(stages.map((s) => s.node), ['api', 'risk', 'ledger', 'hub', 'notify']);

const model = fs.readFileSync('public/model.js', 'utf8').replaceAll('export const ', 'const ');
// app.js ends by drawing the page: it saves the view, renders the surfaces (which need the browser and the imported
// helpers this sandbox strips) and focuses an anchor the address names. The sandbox loads the shell without that
// step and replaces render below; the step must be found as written, or this fixture no longer matches the shell.
const PAGE_LOAD = '\npersist();render();focusRouteHash(location.hash);\n';
const shell = fs.readFileSync('public/app.js', 'utf8');
assert.ok(shell.includes(PAGE_LOAD), 'public/app.js still ends by drawing the page as the sandbox expects; update PAGE_LOAD with the shell');
// chapter-layers.js re-exports chapter-names.js, which the loader inlines there; including it again declared its table twice.
const app = (browserSource('public/html-escape.js') + browserSource('public/chapter-layers.js') + shell).replace(/^import .*?;\n/gm, '').replace(PAGE_LOAD, '\n');
const el = {clientWidth: 1200, textContent: '', style: {}, innerHTML: '', classList: {add() {}, remove() {}, toggle() {}}, focus() {}, click() {}, setAttribute() {}, scrollIntoView() {}, replaceWith() {}};
const studio = {graph: () => ({nodes, edges}), bind() {}, enter() {}, pause() {}, milestones: () => [], scenarioAction: () => ''};
// The footer's next task (rc41) is built in a <template> and swapped in for .workspace-next (refreshFooterNext). As in a
// browser, a template's content holds the element its markup makes (the shell's markup here is one element), and the
// footer is replaced by it; the sandbox keeps the footer so the task it shows can be read back.
let footer;
const element = (outerHTML) => ({outerHTML, replaceWith(node) { if (footer === this) footer = node; }});
const template = () => { let html = ''; const content = {firstElementChild: null, querySelectorAll: () => []}; return {content, get innerHTML() { return html; }, set innerHTML(v) { html = String(v); content.firstElementChild = html.trim() ? element(html.trim()) : null; }}; };
footer = element('<button type="button" class="workspace-next" data-action="next"></button>');
const ctx = {console, Set, Map, URL, URLSearchParams, location: {search: '', pathname: '/'}, history: {state: null, replaceState() {}, pushState() {}}, Blob, setTimeout: () => 0, clearTimeout() {}, busyClock: () => () => {}, localStorage: {getItem: () => null, setItem() {}}, document: {body: el, querySelector: (sel) => (sel === '.workspace-next' ? footer : el), querySelectorAll: () => [], addEventListener() {}, createElement: (tag) => (tag === 'template' ? template() : el)}, window: {aiwLogicalStudio: studio, addEventListener() {}, dispatchEvent() {}, matchMedia: () => ({matches: false})}};
// app.js takes pad2 from util.js (rc39) and TAB_PURPOSE from shell-ux.js (rc41): the sandbox supplies them as it does the other imported helpers.
Object.assign(ctx, projectContext, projectScope, chapterRecords, shellRecordSubject, {pad2, TAB_PURPOSE}); vm.createContext(ctx);
const ux = browserSource('public/workspace-ux.js');
vm.runInContext(model + '\n' + ux + '\n' + app + `\nrender=()=>{};refreshInspector=()=>{};renderFlow=()=>{};closeModal=()=>{};toast=()=>{};globalThis.test={s,allNodes,toggleLayer,setChapter,setTab,selectNode,remove,advance,goStage,isTerminal,flowText,mark,unmark,CHAPTER};`, ctx);
const t = ctx.test, done = (id) => t.s.completed.includes(id);

// Layers, selection and chapters.
for (const layer of layers) if (!t.s.visible.includes(layer.id)) t.toggleLayer(layer.id);
assert.equal(t.s.visible.length, 8);
assert(done('physical'));
// The footer's next task follows the progress (rc41): with no project open and no milestone left it is the chapter's own
// next step, a button, its words escaped; the same task again leaves the footer as it is.
const footerShows = (chapter) => footer.outerHTML.startsWith('<button type="button" class="workspace-next" data-action="next" data-next-kind="milestone" aria-label="Open next task: ') && footer.outerHTML.includes(`<strong id="next-text">${t.CHAPTER[chapter].next.replaceAll('&', '&amp;')}</strong>`);
assert.ok(footerShows(t.s.chapter), 'a milestone reached refreshes the footer to the chapter\'s next step');
const shown = footer;
t.selectNode('risk'); assert.equal(t.s.selected, 'risk'); assert(done('inspect'));
assert.equal(footer, shown, 'the same next task again leaves the footer as it is');
t.setTab('validate'); t.setChapter(6, {keepTab: true});
assert.equal(t.s.chapter, 6); assert.equal(t.s.tab, 'validate', 'choosing a chapter keeps the tab');
t.setChapter(7); assert.equal(t.s.tab, 'model', 'a studio hand-over opens the next chapter on its Model tab');

// A candidate accepted before projects were saved on the server can be undone.
t.s.accepted.push('review'); assert(t.allNodes().some((n) => n.id === 'review' && n.legacy));
t.mark('validate'); assert.ok(footerShows(7), 'in another chapter the footer names that chapter\'s next step'); t.remove('review');
assert.equal(t.s.accepted.length, 0); assert(!t.allNodes().some((n) => n.id === 'review')); assert(!done('validate'));

// Chapter 5's outcome trace: each outcome stops where it must, and skipping steps earns nothing.
t.setChapter(5); t.s.scenario = 'success'; for (let i = 0; i < 5; i++) t.advance();
assert.equal(t.s.step, 4); assert(done('flow')); assert(t.isTerminal());
t.setChapter(5); t.s.scenario = 'hold'; for (let i = 0; i < 5; i++) t.advance();
assert.equal(t.s.step, 1); assert(t.flowText().includes('No ledger posting'));
t.setChapter(5); t.s.scenario = 'timeout'; for (let i = 0; i < 7; i++) t.advance();
assert.equal(t.s.step, 3); assert(t.flowText().includes('pending'));
t.setChapter(5); t.s.scenario = 'success'; t.unmark('flow'); t.goStage(3); t.advance();
assert(!done('flow'), 'Skipping steps must not award completion');
t.setChapter(5); t.s.scenario = 'hold'; t.goStage(4);
assert.equal(t.s.step, -1, 'Held payments cannot jump to confirmation');

console.log(JSON.stringify({status: 'passed', nodes: nodes.length, baseRelationships: edges.length, layers: 8, checks: ['unique objects and resolved endpoints', 'eight layer toggles', 'object selection', 'the footer names the chapter\'s next task and is replaced only when it changes', 'chapter changes keep the chosen tab', 'undo of a browser-only candidate', 'complete payment journey', 'risk hold stops before posting', 'timeout stops before confirmation', 'skipped steps earn nothing', 'held payments cannot jump ahead'], limitations: ['State-level tests; the surfaces are checked by the chapter and browser suites']}, null, 2));
