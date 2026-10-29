// Repeated page-budget attempts must preserve the exact figure and its identity.
// Reuse is confined to a read-only document pass, never across a design edit.
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {notationDiagram} from './public/notation-model.js';
import {diagramFigures} from './public/sdd-figures.js';
import {memoPass, unmemoised} from './public/document-memo.js';

const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const scene = notationDiagram(project, 'drivers');
const options = {chapter:2, first:1, stem:'figures/synthetic-drivers', where:'Synthetic fixture records.', details:0, fit:true};
const draw = (p, D, o = {}) => diagramFigures(p, D, {...options, ...o});
let original;
memoPass(project, () => {
  original = draw(project, scene);
  assert.deepEqual(draw(project, structuredClone(scene)), unmemoised(() => draw(project, structuredClone(scene))), 'a repeated picture retains exact SVG, labels, fit decisions, text and hashes');
  const renumbered = draw(project, structuredClone(scene), {first:7});
  assert.deepEqual(renumbered, unmemoised(() => draw(project, structuredClone(scene), {first:7})), 'new figure numbers render their own SVG identity and caption from reused geometry');
  assert.match(renumbered.figures[0].svg, /id="f7-title"/);
  assert.doesNotMatch(renumbered.figures[0].svg, /id="f1-title"/);
  assert.deepEqual(draw(project, structuredClone(scene), {code:'mermaid'}), unmemoised(() => draw(project, structuredClone(scene), {code:'mermaid'})), 'diagram-as-code identities and source receipts match the same uncached picture');
  const changed = structuredClone(scene);
  changed.nodes[0].title = 'Changed quality target';
  changed.nodes[0].fullTitle = changed.nodes[0].title;
  const revised = draw(project, changed);
  assert.deepEqual(revised, unmemoised(() => draw(project, changed)), 'different diagram content cannot inherit an earlier layout result');
  assert.notEqual(revised.figures[0].sha256, original.figures[0].sha256);
});
console.log('PASS repeated and renumbered figures match uncached bytes, while changed diagram content is redrawn');
project.name = 'Synthetic revised project';
project.quality.drivers[0].title = 'A revised recorded quality driver';
const next = memoPass(project, () => draw(project, notationDiagram(project, 'drivers')));
assert.deepEqual(next, unmemoised(() => draw(project, notationDiagram(project, 'drivers'))), 'a new pass observes the edited project and quality target');
assert.notEqual(next.figures[0].sha256, original.figures[0].sha256);
project.name = JSON.parse(before).name;
project.quality.drivers[0].title = JSON.parse(before).quality.drivers[0].title;
assert.equal(JSON.stringify(project), before, 'drawing changed no project record');
console.log('PASS a new document pass observes changed quality targets and project identity without mutating records');
console.log(JSON.stringify({passed:2, providerCalls:false, humanApproval:false}));
