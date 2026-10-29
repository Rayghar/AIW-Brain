// The large-project search and keyboard reading behind test:screens-at-size, without a browser or localhost server.
// Run: npm run test:screens-at-size-model
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {buildFiguresProject} from './figures-at-size-fixture.mjs';
import {tableModel, tableRows, tableHTML, TABLE_PAGE} from './public/model-table.js';
import {chapterRecordSet} from './public/chapter-records.js';
import {matrixModel, matrixView, matrixHTML, MATRIX_CAP} from './public/model-matrix.js';

const {document: p} = await buildFiguresProject({name: 'Synthetic platform'});
for (const a of p.artefacts) if (a.type === 'requirement') {
  a.externalId = 'SRC-' + String(/(\d+)/.exec(a.id)?.[1] || '').padStart(5, '0');
  a.domain = (/ in ([a-z ]+)$/.exec(a.title)?.[1] || 'general').replace(/^\w/, c => c.toUpperCase());
}
const r = p.artefacts.find(a => a.type === 'requirement'), group = p.requirementGroups.records.find(g => g.memberIds.includes(r.id));
assert.ok(r?.externalId && r.domain && group, 'the synthetic workbook fields and group are present');

const T = tableModel(p, 1), X = matrixModel(p, {rows: 'requirement', cols: 'quality'});
assert.equal(T.rows.filter(r => r.type === 'requirement').length, 1400);
assert.equal(T.rows.length, chapterRecordSet(p, 1).total, 'the complete requirements chapter inventory remains available beside the 1,400 requirements');
assert.equal(X.rows.length, 1400);
for (const field of ['External ID', 'Domain', 'Group', 'Delivery']) assert.ok(T.columns.some(c => c.label === field), `Table exposes ${field}`);
for (const [label, query] of [['workbook id', r.externalId], ['domain', r.domain], ['group', group.title]]) {
  const rows = tableRows(T, {filter: query}).shown, axis = matrixView(X, {filter: {rows: query}});
  assert.ok(rows.some(row => row.id === r.id), `Table finds the requirement by ${label}`);
  assert.ok(axis.rows.some(row => row.id === r.id), `Matrix finds the requirement by ${label}`);
  assert.ok((tableHTML(T, {filter: query, chapter: 1}).match(/data-nt-row=/g) || []).length <= TABLE_PAGE, 'Table shows at most one page');
  assert.ok(axis.shownRows.length <= MATRIX_CAP.rows, 'Matrix shows at most one cap');
}
assert.deepEqual(tableRows(T, {filter: r.externalId}).shown.map(x => x.id), [r.id]);
assert.deepEqual(matrixView(X, {filter: {rows: r.externalId}}).shownRows.map(x => x.id), [r.id]);
assert.match(matrixHTML(X, {filter: {rows: r.domain}, chapter: 2}), /Filter the rows by reference or title, external id, domain or group/);

// A redraw of the companion after opening a long observation preserves the keyboard's reading position.
const w = new Window({url: 'https://aiw.test/?chapter=4&tab=model'});
for (const key of ['window', 'document', 'localStorage', 'MutationObserver']) globalThis[key] = key === 'window' ? w : w[key];
document.body.innerHTML = '<div class="studio"><div class="stage"><div class="cm" aria-label="Model"></div></div><aside id="inspector"></aside></div>';
const {companionHost, insightsSection} = await import('./public/model-stage.js');
const host = companionHost(document.querySelector('.cm'));
const items = [{kind: 'gap', id: 'finding', text: 'Review these requirements', records: Array.from({length: 70}, (_, i) => [`REQ-${i + 1}`, `Requirement ${i + 1}`])}];
const render = () => insightsSection(items, {key: 'screen-size-focus', item: x => `<button class="cm-ins ${x.kind}" type="button">${x.text}</button>`});
host.innerHTML = render();
host.querySelector('[data-ins="filter"]').click();
const first = host.querySelector('[data-ins-focus="records"]');
assert.equal(document.activeElement, first, 'opening the list focuses its status');
host.innerHTML = render();
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(document.activeElement, host.querySelector('[data-ins-focus="records"]'), 'a docked companion redraw restores the same reading position');
assert.notEqual(document.activeElement, first, 'the focused node was replaced');
console.log(JSON.stringify({suite: 'screens at size model and focus', passed: 4, checks: ['Table workbook fields and cap', 'Table and Matrix workbook id, domain and group lookup', 'Matrix cap', 'companion reading focus through redraw']}, null, 2));
