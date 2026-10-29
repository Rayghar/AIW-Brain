// The instrument tray (round 11, A): one table serves every chapter's switcher and the help map, each instrument is
// gated by the records present (never the chapter number), a hidden or retired view falls back to the chapter's
// default and says so, the renamed views carry their new names, the retired views are gone and their questions kept,
// the Matrix defaults are the design's, and the seven lens names are one vocabulary. Run: npm run test:tray
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {referenceProject} from './notation-fixtures.mjs';
import {TRAY, CHAPTERS, DIAGRAM, SHARED_VIEWS, PERSPECTIVES, KINDS, ownViews, defaultView, viewsOffered, scenesOffered, resolveView, switcherLabels, trayLines, trayHTML, trayButtonsHTML, sharedButtonsHTML, chapterHasRecords, recordCounts, needChapter, laterWord, sceneKind, draftActionHTML, sharedOffered, questionRows} from './public/instrument-tray.js';
import {SCENES, CHAPTER_SCENES} from './public/notation-model.js';
import {MATRIX_DEFAULTS, SET_LABELS} from './public/model-matrix.js';
import {OBJECT_TYPES} from './public/architecture-model.js';
import {LENS_VOCABULARY, LENS_IDS, chapterLenses, lensWord} from './public/lens-vocabulary.js';
import {LENSES as ANATOMY_LENSES} from './public/anatomy-model.js';
import {helpMapHTML, HELP_MAP} from './public/shell-ux.js';
import {chapterSurfacePurpose} from './public/chapter-surfaces.js';

const checks = [], pass = name => checks.push(name);
const blank = createProject({name: 'Blank', template: 'blank'}, 'p-blank'), ref = referenceProject();
const before = JSON.stringify(blank) + JSON.stringify(ref);
const strip = html => html.replace(/<\/(li|p)>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

// 1. One table: eleven chapters, each with a default view that is never gated, every view and picture in the surgeon's words.
assert.deepEqual(CHAPTERS, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
for (const ch of CHAPTERS) {
  const views = ownViews(ch); assert.ok(views.length >= 1, 'Chapter ' + ch + ' has an own view');
  assert.ok(!views[0].needs, 'Chapter ' + ch + ': the default view ' + views[0].label + ' declares no need');
  for (const v of views) { assert.ok(KINDS.includes(v.kind), v.label + ' has a kind'); assert.ok(v.q && v.icon && v.label, v.id + ' has a question, an icon and a label'); for (const n of v.needs || []) assert.ok(needChapter(n), v.label + ' needs a known record type: ' + n); }
  assert.equal(new Set(views.map(v => v.id)).size, views.length, 'Chapter ' + ch + ': ids are distinct');
  assert.equal(defaultView(ch), views[0].id);
  assert.ok(TRAY[ch].diagram, 'Chapter ' + ch + ' names what its Diagram draws');
}
for (const v of SHARED_VIEWS) assert.ok(KINDS.includes(v.kind) && v.q && v.title && v.icon, v.id);
assert.deepEqual(SHARED_VIEWS.map(v => v.id), ['layers', 'table', 'cross', 'whole', 'modules'], 'the shared views, in switcher order (round 24: the module map last)');
assert.deepEqual(sharedOffered(blank).map(v => v.id), ['layers', 'table', 'cross', 'whole'], 'a project without a module structure is offered the four shared views it always had');
assert.deepEqual(sharedOffered(ref).map(v => v.id), ['layers', 'table', 'cross', 'whole'], 'and so is the reference project');
assert.ok(KINDS.includes(DIAGRAM.kind) && KINDS.includes(PERSPECTIVES.kind));
for (const s of SCENES) for (const n of s.needs || []) assert.ok(needChapter(n), s.id + ' needs a known record type: ' + n);
assert.ok(!CHAPTER_SCENES[5].includes('cooperation') && CHAPTER_SCENES[8].includes('cooperation'), 'the cooperation picture reads Chapter 8 contracts and is offered there alone');
assert.deepEqual(SCENES.find(s => s.id === 'cooperation').chapters, [8]);
assert.equal(sceneKind('process'), 'behaviour'); assert.equal(sceneKind('sequence'), 'behaviour'); assert.equal(sceneKind('context'), 'overview');
pass('one table of instruments: eleven chapters, each with a default view that declares no need, every view and picture with a kind of the surgeon’s vocabulary, a question and an icon; every need is a record type of the one model; the cooperation picture belongs to Chapter 8');

// 2. Renames and retirements.
assert.deepEqual(ownViews(1).map(v => v.label), ['Journey map', 'Boundary'], 'Chapter 1: Context (the scope card) is Boundary');
assert.equal(TRAY[1].aliases.context, 'boundary', 'the old id still lands on it');
assert.deepEqual(ownViews(6).map(v => v.label), ['Platform', 'If a capability fails']);
assert.deepEqual(ownViews(10).map(v => v.label), ['Deployment', 'If a zone fails']);
assert.deepEqual(ownViews(5).map(v => v.id), ['components', 'specification'], 'Chapter 5: Allocation is retired; the Specification view (the isolation instrument) stands beside Components');
assert.deepEqual(viewsOffered(blank, 5).later.map(l => l.view.id), ['specification'], 'the Specification view waits for a component');
assert.ok(viewsOffered(ref, 5).offered.some(v => v.id === 'specification') && ownViews(5)[1].kind === 'isolation', 'and is offered, as isolation, once one is recorded');
assert.deepEqual(ownViews(8).map(v => v.id), ['data'], 'Chapter 8: the own Sequence view is retired');
assert.equal(TRAY[5].retired.allocation.view, 'cross', 'Allocation lives on in the Matrix');
assert.deepEqual(MATRIX_DEFAULTS[5], ['responsibility', 'component']);
assert.deepEqual(TRAY[8].retired.sequence, {view: 'diagram', scene: 'sequence', note: TRAY[8].retired.sequence.note}, 'Sequence lives on in the Diagram’s Sequence picture');
assert.ok(SCENES.some(s => s.id === 'sequence' && s.chapters.includes(8)));
const labels = CHAPTERS.flatMap(ch => ownViews(ch).map(v => v.label));
assert.ok(!labels.includes('What fails together') && !labels.includes('Allocation') && !labels.includes('Sequence') && !labels.includes('Context'), 'no retired or old name remains: ' + labels.join(' · '));
assert.deepEqual(labels.filter((l, i) => labels.indexOf(l) !== i), [], 'no label is used twice with two meanings');
pass('Context is Boundary (its old id an alias), What fails together is If a capability fails and If a zone fails, Allocation is retired into the Matrix (responsibility × component) and the own Sequence view into the Diagram’s Sequence picture, and no label means two things');

// 3. Gating by records: a fresh project offers only what can draw; the reference project offers everything.
assert.deepEqual(switcherLabels(blank, 1), ['Journey map', 'Diagram', 'Boundary', 'Layers', 'Table', 'Matrix', 'Whole design'], 'a fresh project’s Chapter 1');
assert.deepEqual(scenesOffered(blank, 1).offered.map(s => s.id), ['process', 'motivation'], 'and its process and motivation pictures');
assert.deepEqual(scenesOffered(blank, 1).later.map(l => l.word), ['Context from Chapter 5', 'Sequence from Chapter 8', 'Module map once a requirement is recorded'], 'the picker’s last entry names what later chapters add (and, round 24, the module map waits for a requirement)');
for (const ch of CHAPTERS) {
  const V = viewsOffered(blank, ch), S = scenesOffered(blank, ch);
  assert.deepEqual(V.offered.map(v => v.id), ownViews(ch).filter((v, i) => !i || !v.needs?.length).map(v => v.id), 'fresh Chapter ' + ch + ' offers its default view and the views that need no record (Chapter 1’s Boundary)');
  assert.deepEqual(S.offered.map(s => s.id), CHAPTER_SCENES[ch].filter((id, i) => !i || !SCENES.find(s => s.id === id).needs?.length), 'and the pictures that need no record of a later chapter (Chapter 1: process and motivation)');
  for (const l of [...V.later, ...S.later]) assert.match(l.word, /^.+ (from Chapter \d+|once an? .+ is recorded)$/, l.word);
  assert.deepEqual(viewsOffered(ref, ch).later, [], 'the reference project offers every view of Chapter ' + ch);
  assert.deepEqual(scenesOffered(ref, ch).later, [], 'and every picture');
  assert.deepEqual(switcherLabels(ref, ch), [ownViews(ch)[0].label, 'Diagram', ...ownViews(ch).slice(1).map(v => v.label), 'Layers', 'Table', 'Matrix', 'Whole design']);
  assert.equal(chapterHasRecords(blank, ch), false); assert.equal(chapterHasRecords(ref, ch), true);
}
assert.deepEqual(scenesOffered(blank, 7).later.map(l => l.word), ['Containers once a component is recorded', 'Technology usage from Chapter 10'], 'a same-chapter record is named by the record, a later chapter by its number');
assert.deepEqual(viewsOffered(blank, 11).later.map(l => l.word), ['What it takes once an operating plan is recorded', 'Trace once a requirement is recorded', 'Running board once an operating plan is recorded']);
// By records, not by chapter number: a project that holds only a later chapter's records sees that chapter's views.
const later = structuredClone(blank); later.runtime.plans = ref.runtime.plans.slice(0, 1); later.runtime.environments = ref.runtime.environments.slice();
const counts = recordCounts(later); assert.ok(counts.runtime >= 1, 'the imported plan is a record: ' + JSON.stringify(counts));
assert.deepEqual(viewsOffered(later, 11).offered.map(v => v.id), ['vitals', 'load', 'board'], 'Chapter 11 sees the views the imported plan can draw, with no requirement yet');
assert.equal(laterWord(1, 'component', 'Context'), 'Context from Chapter 5'); assert.equal(laterWord(5, 'component', 'Context'), 'Context once a component is recorded');
pass('gating is by the records present: a fresh project offers each chapter’s default view and first picture alone (Chapter 1: Journey map, Boundary, process and motivation), the last entry names what later chapters add or the first record the chapter needs, the reference project offers everything, and a project holding only an imported later-chapter record sees that chapter’s views');

// 4. Where a requested view lands.
assert.deepEqual(resolveView(blank, 1, 'context'), {view: 'boundary'}, 'an old id lands on the renamed view');
assert.deepEqual(resolveView(blank, 4, 'coverage'), {view: 'map', note: 'Coverage once a responsibility is recorded; opened Responsibilities instead'}, 'a hidden view falls back to the default and says so');
assert.deepEqual(resolveView(ref, 4, 'coverage'), {view: 'coverage'}, 'an offered view opens');
assert.deepEqual(resolveView(ref, 5, 'allocation'), {view: 'cross', scene: null, note: TRAY[5].retired.allocation.note});
assert.deepEqual(resolveView(ref, 8, 'sequence'), {view: 'diagram', scene: 'sequence', note: TRAY[8].retired.sequence.note});
for (const id of ['diagram', 'layers', 'table', 'cross', 'whole']) assert.deepEqual(resolveView(blank, 9, id), {view: id}, id + ' is always offered');
assert.deepEqual(resolveView(blank, 9, 'nothing-of-the-kind'), {view: 'model'}, 'an unknown view opens the default');
assert.deepEqual(resolveView(blank, 2, null), {view: 'tree'});
// Round 24 (D-24-08): the module map is offered once the requirements have a module structure, in the switcher, the help
// map and the question picker alike; asked for without one, it lands on the chapter's default view.
const moduled = structuredClone(blank); moduled.requirementGroups = {...(moduled.requirementGroups || {}), records: [{id: 'RG-001', title: 'Lending', kind: 'module', role: 'business', memberIds: [], rule: [], state: 'proposed'}], counter: 1, version: 1};
assert.deepEqual(resolveView(blank, 9, 'modules'), {view: 'model', note: 'Module map once the requirements have modules (Chapter 1); opened Threat model instead'}, 'the module map without a module structure opens the default and says so in the "You are here" line (rc41, W2)');
assert.deepEqual(resolveView(moduled, 9, 'modules'), {view: 'modules'}, 'with one it opens itself');
for (const ch of CHAPTERS) {
  assert.deepEqual(switcherLabels(moduled, ch), [...switcherLabels(blank, ch), 'Module map'], 'Chapter ' + ch + ': the module map ends the switcher of a project with modules');
  assert.deepEqual(trayLines(moduled, ch).lines.map(l => l.label).slice(0, -1), switcherLabels(moduled, ch), 'and the help map lists it');
  assert.equal(questionRows(moduled, ch).at(-1).id, 'modules'); assert.equal(questionRows(moduled, ch).at(-1).waiting, '');
  assert.match(questionRows(blank, ch).find(r => r.id === 'modules').waiting, /Create requirement modules in Chapter 1/, 'the question guide explains the gated module map without offering navigation');
}
pass('the module map is navigable only while the requirements have modules; the question guide names its prerequisite; a direct link without modules opens the chapter default');
pass('a requested view lands where the tray says: an old id on its renamed view, a retired view on the instrument that keeps its question (the Matrix, or the Diagram’s Sequence picture), a hidden view on the chapter’s default with the words that say so, the Diagram and the shared views on themselves');

// 5. The help map and the switchers agree, on every chapter, for any project.
for (const p of [blank, ref]) for (const ch of CHAPTERS) {
  const {lines, later} = trayLines(p, ch), names = lines.map(l => l.label);
  assert.deepEqual(names.slice(0, -1), switcherLabels(p, ch), 'Chapter ' + ch + ': the help map lists what the switcher shows');
  assert.equal(names.at(-1), 'Perspectives'); assert.equal(lines.at(-1).offered, chapterHasRecords(p, ch), 'New perspective… is offered once the chapter holds a record');
  for (const l of lines) assert.ok(KINDS.includes(l.kind) && l.text, l.label);
  assert.deepEqual(later, [...scenesOffered(p, ch).later, ...viewsOffered(p, ch).later].map(l => l.word));
  const html = trayHTML(p, ch), text = strip(html);
  for (const l of lines) assert.ok(text.includes(l.label + ' · ' + l.kind + ': '), l.label + ' is a line of the tray');
  assert.equal(/Later ·/.test(text), later.length > 0);
  const map = helpMapHTML({chapter: ch, tab: 'model', project: p, tray: trayHTML}), rows = map.match(/<tr[^>]*>/g).length - 1;
  assert.equal(rows, 11, 'eleven rows'); assert.ok(map.includes(html), 'the help map carries the chapter’s tray');
  assert.ok(/surgeon’s words/.test(map) && !/Every Model also offers/.test(map));
}
const matrixLine = trayLines(ref, 3).lines.find(l => l.label === 'Matrix');
assert.match(matrixLine.text, /Opens on decisions against requirements\.$/, 'the Matrix line names the chapter’s default pair');
const plain = helpMapHTML({chapter: 8, tab: 'validate'});
assert.ok(strip(plain).includes(chapterSurfacePurpose(8, 'model')) && /Every Model also offers/.test(plain), 'without a project the contextual purpose and shared model capabilities remain');
assert.ok(HELP_MAP.every(r => !/allocation|what fails together|context/i.test(r[3]) || /boundary/.test(r[3])), 'the phrases name no retired view');
const html = trayHTML({...blank, name: '<b>x</b>'}, 1); assert.ok(!html.includes('<b>x</b>'), 'nothing of the project is written unescaped');
pass('for a blank and for the reference project, on all eleven chapters, the help map’s Model column lists exactly the switcher’s entries in order, then Perspectives (offered once the chapter holds a record) and what later chapters add; the Matrix line names the chapter’s default pair; without a project the phrases stand');

// 6. The switcher's markup comes from the same table.
for (const ch of CHAPTERS) {
  const html = trayButtonsHTML(ch, 'xx'), ids = [...html.matchAll(/data-id="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(ids, [ownViews(ch)[0].id, 'diagram', ...ownViews(ch).slice(1).map(v => v.id)], 'Chapter ' + ch + ' buttons');
  assert.ok(html.includes('data-xx="view"') && html.includes('<span>Diagram</span>') && html.includes('title="' + TRAY[ch].diagram.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') + '"'), 'the Diagram button says what it draws');
  for (const v of ownViews(ch)) assert.ok(html.includes('<span>' + v.label.replace(/&/g, '&amp;') + '</span>'), v.label + ' is a button');
}
const shared = sharedButtonsHTML('xx'); assert.deepEqual([...shared.matchAll(/data-id="([^"]+)"/g)].map(m => m[1]), ['layers', 'table', 'cross', 'whole']); assert.ok(shared.includes('nt-shared-view'));
// Round 24: the module map's button is drawn for a project with a module structure only (applyTray draws it when one
// appears and takes it away when it goes).
const sharedIds = p => [...sharedButtonsHTML('xx', p).matchAll(/data-id="([^"]+)"/g)].map(m => m[1]);
assert.deepEqual(sharedIds(blank), ['layers', 'table', 'cross', 'whole']); assert.deepEqual(sharedIds(moduled), ['layers', 'table', 'cross', 'whole', 'modules']);
pass('every chapter’s switcher buttons (Diagram, its own views) and the shared buttons are drawn from the table');

// 7. The Matrix defaults of the design; every pair is two record types the model knows, with words for the sets.
assert.deepEqual(MATRIX_DEFAULTS, {1: ['journey', 'requirement'], 2: ['requirement', 'quality'], 3: ['decision', 'requirement'], 4: ['responsibility', 'component'], 5: ['responsibility', 'component'], 6: ['component', 'capability'], 7: ['capability', 'technology'], 8: ['component', 'contract'], 9: ['control', 'component'], 10: ['runtime', 'quality'], 11: ['requirement', 'control']});
for (const [ch, pair] of Object.entries(MATRIX_DEFAULTS)) { assert.notEqual(pair[0], pair[1], ch); for (const t of pair) assert.ok(OBJECT_TYPES[t] && SET_LABELS[t], ch + ': ' + t); }
pass('the Matrix opens on decision × requirement (3), responsibility × component (4), capability × technology (6), control × component (9), operating plan × quality driver (10) and requirement × control (11); the other chapters keep their pair');

// 8. One lens vocabulary.
assert.deepEqual(LENS_IDS, ['structure', 'flow', 'signals', 'information', 'protection', 'operation', 'reasoning']);
assert.deepEqual(LENS_VOCABULARY.map(l => l.label), ['Structure', 'Flow', 'Signals', 'Information', 'Protection', 'Operation', 'Reasoning']);
assert.deepEqual(ANATOMY_LENSES.map(l => [l.id, l.label, l.like]), LENS_VOCABULARY.map(l => [l.id, l.label, l.like]), 'Whole design’s lenses are the vocabulary');
assert.ok(ANATOMY_LENSES.every(l => Number.isInteger(l.ch)));
const subset = chapterLenses({structure: 'A?', flow: 'B?', reasoning: 'C?'});
assert.deepEqual(subset.map(l => [l.id, l.label, l.like, l.q]), [['structure', 'Structure', 'skeleton', 'A?'], ['flow', 'Flow', 'muscles', 'B?'], ['reasoning', 'Reasoning', 'DNA', 'C?']], 'a chapter’s subset carries the one name and likeness with its own question');
assert.throws(() => chapterLenses({resilience: 'no'}), /Not a lens of the vocabulary/, 'no chapter can coin a lens');
assert.equal(lensWord('signals'), 'Signals');
pass('the seven lens names are one vocabulary: Whole design reads them from it, each chapter’s bar is a subset under those names, and a lens outside it is refused');

// 9. The draft action and the records: a reading, never a write.
assert.equal(draftActionHTML(blank, 5), '', 'a blank project with no brief has nothing to draft from');
const briefed = createProject({name: 'Briefed', template: 'blank', brief: 'A payments journey for a bank, with screening and settlement.'}, 'p-brief');
assert.match(draftActionHTML(briefed, 1), /class="cm-btn gold" href="[^"]*journey=draft"[^>]*>Draft this chapter from the journey</, 'a briefed project’s Chapter 1 offers its draft');
assert.equal(JSON.stringify(blank) + JSON.stringify(ref), before, 'nothing here writes');
pass('the draft action is offered where the chapter can be drafted from the journey, and the tray reads the project without writing to it');

// 10. rc41 close (C8, C21): on the Model's view rail aria-current follows the pressed view after every switch — into a
// view the notation draws (Diagram, Layers, Table), and back into the chapter's own — on the real Chapter 5 model
// (realise-view.js), whose chrome presses the view after the notation has drawn it. happy-dom; nothing is written.
{
  const {Window} = await import(process.env.AIW_DOM_MODULE || 'happy-dom');
  const window = new Window({url: 'http://fixture.local/?chapter=5&tab=model&model=components'});
  Object.assign(globalThis, {window, document: window.document, location: window.location, history: window.history,
    localStorage: window.localStorage, CSS: window.CSS, CustomEvent: window.CustomEvent, MouseEvent: window.MouseEvent, Event: window.Event,
    AbortController: window.AbortController, ResizeObserver: window.ResizeObserver, MutationObserver: window.MutationObserver,
    requestAnimationFrame: cb => window.requestAnimationFrame(cb), cancelAnimationFrame: id => window.cancelAnimationFrame(id)});
  globalThis.fetch = async (url, options = {}) => { assert.equal(options.method || 'GET', 'GET', 'the Model only reads'); return new Response(JSON.stringify({configured: false, runs: []})); };
  const model = referenceProject(), was = JSON.stringify(model); let writes = 0;
  window.aiwProjectStore = {value: {document: model}, command() { writes++; throw Error('The view rail never writes.'); }};
  document.body.innerHTML = '<div class="studio"><div class="stage tab-content"></div></div>';
  const {mountChapterModel} = await import('./public/realise-view.js');
  mountChapterModel({});
  const settle = () => new Promise(r => setTimeout(r, 30));
  const rail = () => [...document.querySelectorAll('.cm-views .cm-view[data-id]')];
  const state = () => ({pressed: rail().filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.id), current: rail().filter(b => b.hasAttribute('aria-current')).map(b => b.dataset.id + '=' + b.getAttribute('aria-current'))});
  await settle();
  assert.deepEqual(state(), {pressed: ['components'], current: ['components=true']}, 'on arrival the chapter’s own view is pressed and current');
  for (const id of ['diagram', 'layers', 'components', 'table', 'diagram', 'components']) {
    document.querySelector(`.cm-views .cm-view[data-id="${id}"]`).click(); await settle();
    assert.deepEqual(state(), {pressed: [id], current: [id + '=true']}, 'after switching to ' + id + ' the pressed view is the one current view');
  }
  assert.equal(writes, 0); assert.equal(JSON.stringify(model), was, 'switching views writes nothing');
  await window.happyDOM?.abort?.(); window.close?.();
  pass('the Model rail’s aria-current follows the pressed view after every switch, into a notation-drawn view and back');
}

console.log(JSON.stringify({suite: 'instrument tray (round 11, A)', passed: checks.length, checks}, null, 2));
