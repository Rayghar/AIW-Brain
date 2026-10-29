// workspace.diagram-arrangement (round 2, diagrams workstream request): a pinned layout of one chapter picture is
// a workspace preference. It is checked against the picture itself (every pinned node exists in
// notationDiagram(p, scene).nodes), bounded (at most 200 pins, finite coordinates from 0 to 20000, only x, y,
// group, dx, dy), saved compare-and-swap on its own revision, refused without the diagram model, and it never
// enters the change review or the working basis. Run: npm run test:diagram-arrangement
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {applyWorkbenchCommand, workingBasis, DIAGRAM_SCENES, DIAGRAM_ARRANGEMENTS, DIAGRAM_PIN_LIMIT, diagramArrangementKey} from './public/workbench-domain.js';
import {SCENES, ARRANGEMENTS, notationDiagram} from './public/notation-model.js';
import {STAGED_COMMANDS} from './public/canonical-command.js';

const checks = [], pass = (n) => { checks.push(n); console.log('PASS', n); };
const at = '2026-10-01T12:00:00.000Z';
const p = JSON.parse(JSON.stringify(createProject({name: 'Arrangement check', template: 'bank-payment'}, 'arrangement-check')));
const diagramNodes = (doc, scene) => notationDiagram(doc, scene)?.nodes;
const run = (doc, payload, options = {diagramNodes}) => applyWorkbenchCommand(doc, {type: 'workspace.diagram-arrangement', payload}, at, 'architect', options);
const scene = 'logical', nodes = notationDiagram(p, scene).nodes;
assert.ok(nodes.length >= 3, 'the logical picture has nodes');
const [a, b] = nodes;

// The two id lists are the diagram model's own.
assert.deepEqual(DIAGRAM_SCENES, SCENES.map((s) => s.id));
assert.deepEqual(DIAGRAM_ARRANGEMENTS, ARRANGEMENTS.map((x) => x.id));
pass('scene and arrangement ids are those of notation-model.js');

// A valid arrangement is stored under its key with revision 1; the design itself is untouched.
let r = run(p, {chapter: 4, scene, arrangement: 'grouped', pins: {[a.id]: {x: 120, y: 40.5}, [b.id]: {x: 0, y: 20000, group: 'GRP-001', dx: 4, dy: 0}}, revision: 0});
const key = diagramArrangementKey(4, scene, 'grouped');
assert.equal(key, '4|logical|grouped');
const saved = r.document.workspace.diagramArrangements[key];
assert.deepEqual(saved.pins, {[a.id]: {x: 120, y: 40.5}, [b.id]: {x: 0, y: 20000, group: 'GRP-001', dx: 4, dy: 0}});
assert.equal(saved.revision, 1); assert.equal(saved.actor, 'architect'); assert.equal(saved.at, at);
assert.equal(workingBasis(r.document), workingBasis(p), 'the working basis (the design) is unchanged');
assert.equal(p.workspace?.diagramArrangements, undefined, 'the input document is not mutated');
assert.equal(STAGED_COMMANDS.has('workspace.diagram-arrangement'), false, 'not a staged design change: no change review');
pass('a valid arrangement is stored as a workspace preference with revision 1; the design and the input are untouched');

// Compare-and-swap: the next save names revision 1; a stale revision is refused.
r = run(r.document, {chapter: 4, scene, arrangement: 'grouped', pins: {[a.id]: {x: 10, y: 10}}, revision: 1});
assert.equal(r.document.workspace.diagramArrangements[key].revision, 2);
assert.deepEqual(r.document.workspace.diagramArrangements[key].pins, {[a.id]: {x: 10, y: 10}});
assert.throws(() => run(r.document, {chapter: 4, scene, arrangement: 'grouped', pins: {}, revision: 1}), /changed elsewhere/);
assert.throws(() => run(r.document, {chapter: 4, scene, arrangement: 'grouped', pins: {}}), /changed elsewhere/, 'a missing revision is a new arrangement, refused when one exists');
assert.equal(run(r.document, {chapter: 4, scene, arrangement: 'tree', pins: {}, revision: 0}).document.workspace.diagramArrangements['4|logical|tree'].revision, 1, 'another arrangement has its own revision');
pass('arrangements are saved compare-and-swap on their own revision');

// Limits.
const ok = {chapter: 4, scene, arrangement: 'grouped', revision: 0};
const many = Object.fromEntries(Array.from({length: DIAGRAM_PIN_LIMIT + 1}, (_, i) => ['n' + i, {x: 1, y: 1}]));
assert.equal(DIAGRAM_PIN_LIMIT, 200);
assert.throws(() => run(p, {...ok, pins: many}), /at most 200/);
for (const bad of [-1, 20000.5, NaN, Infinity, -Infinity, '5', null]) assert.throws(() => run(p, {...ok, pins: {[a.id]: {x: bad, y: 1}}}), /finite numbers from 0 to 20000/, 'x = ' + bad);
assert.throws(() => run(p, {...ok, pins: {[a.id]: {x: 1, y: 1, dx: -3}}}), /finite numbers/);
assert.throws(() => run(p, {...ok, pins: {[a.id]: {x: 1, y: 1, colour: 'red'}}}), /holds x and y/);
assert.throws(() => run(p, {...ok, pins: {[a.id]: [1, 2]}}), /holds x and y/);
assert.throws(() => run(p, {...ok, pins: {[a.id]: {x: 1, y: 1, group: ''}}}), /group/);
assert.throws(() => run(p, {...ok, pins: {'not-a-node': {x: 1, y: 1}}}), /only nodes of this picture/);
assert.throws(() => run(p, {...ok, pins: []}), /object keyed by node/);
assert.throws(() => run(p, {...ok, chapter: 12, pins: {}}), /chapter from 1 to 11/);
assert.throws(() => run(p, {...ok, chapter: 0, pins: {}}), /chapter from 1 to 11/);
assert.throws(() => run(p, {...ok, scene: 'mystery', pins: {}}), /picture this workbench draws/);
assert.throws(() => run(p, {...ok, arrangement: 'spiral', pins: {}}), /arrangement this workbench offers/);
assert.throws(() => run(p, {...ok, pins: {[a.id]: {x: 1, y: 1}}}, {}), /need the diagram model/, 'refused without the diagram model: no unchecked pin is stored');
pass('limits: 200 pins, coordinates 0–20000 and finite, only x/y/group/dx/dy, existing nodes, chapters 1–11, known scenes and arrangements, and the diagram model required');

console.log(`\n${checks.length} checks passed.`);
