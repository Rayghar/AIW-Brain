// A model in (round 6, Contract I; audit/round6/DESIGN.md): shared/model-interpreter.js over the AIW-authored fixtures
// in evaluation/model-fixtures (one per format and a MADR record), the bounds and hostile input, the compressed draw.io
// path, the model file reader, and the round trip: every standard diagram of the bank and clinic references exported in
// every diagram-as-code format (public/notation-code.js) and read back, with the names and relationship counts asserted
// against what the export's own report says the format could carry. Measured: counts per fixture (elements by kind,
// relationships, stated and inferred), recovery per format, and the time to read a 1 MB Structurizr DSL.
// Run: node model-interpreter-validate.mjs
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {deflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {interpretModel, detectFormat, modelCounts, inflateModelText, unescapeXML, MODEL_LIMIT, MODEL_KIND_LIMIT, MODEL_FORMATS, ELEMENT_KINDS, RELATIONSHIP_KINDS} from './shared/model-interpreter.js';
import * as browserRules from './public/model-interpreter.js';
import {readModelFile, MODEL_FILE_KINDS, MODEL_TEXT_LIMIT} from './public/brief-reader.js';
import {createProject} from './shared/projects-domain.js';
import {notationDiagram, CHAPTER_SCENES, SCENES} from './public/notation-model.js';
import {notationLayout} from './public/notation-layout.js';
import {diagramCode, CODE_FORMATS} from './public/notation-code.js';
import {targetId} from './public/model-exchange.js';

const checks = [], pass = name => { checks.push(name); console.log('PASS', name.slice(0, 160)); };
const sha = t => createHash('sha256').update(t).digest('hex');
const plain = s => String(s).replace(/\s+/g, ' ').trim().toLowerCase();
const DIR = 'evaluation/model-fixtures/';
const fixture = f => readFileSync(DIR + f, 'utf8');
const KIND_OF = {dsl: 'structurizr', xml: 'archimate', archimate: 'archimate', bpmn: 'bpmn', drawio: 'drawio', mmd: 'mermaid-c4', puml: 'plantuml-c4', md: 'madr'};
const measured = {fixtures: {}, roundTrip: {}, timing: {}};

// What every interpretation must satisfy, whatever the text.
function invariants(text, r, label) {
  assert.deepEqual(Object.keys(r), ['format', 'name', 'hash', 'passages', 'elements', 'relationships', 'views', 'questions', 'report'], label + ': the contract shape, in order');
  assert.ok([...MODEL_FORMATS, 'unknown'].includes(r.format), label + ': a known format or unknown');
  assert.equal(r.hash, sha(text), label + ': the hash is the SHA-256 of the text');
  const ids = new Set(); let last = -1;
  for (const p of r.passages) {
    assert.match(p.id, /^P-\d{3,5}$/); assert.equal(text.slice(p.start, p.end), p.text, `${label}: ${p.id} round-trips its offsets`);
    assert.ok(p.start >= last, `${label}: ${p.id} follows the passage before it`); assert.ok(p.text.trim() === p.text && p.text, `${label}: ${p.id} is trimmed and not empty`);
    last = r.format === 'madr' ? p.start : p.start; ids.add(p.id);
  }
  const byId = new Map(r.passages.map(p => [p.id, p])), els = new Map();
  for (const e of r.elements) {
    assert.deepEqual(Object.keys(e), ['id', 'kind', 'name', 'description', 'technology', 'tags', 'parent', 'external', 'passages', 'confidence', 'attrs'], `${label}: ${e.id} has the element shape`);
    assert.ok(ELEMENT_KINDS.includes(e.kind), `${label}: ${e.id} kind ${e.kind} is normalised`);
    assert.ok(e.name && e.name.length <= 200 && e.description.length <= 2000 && e.technology.length <= 200 && e.tags.length <= 20, `${label}: ${e.id} is bounded`);
    assert.ok(!els.has(e.id), `${label}: ${e.id} is unique`); els.set(e.id, e);
    assert.ok(e.passages.every(id => ids.has(id)), `${label}: ${e.id} cites passages that exist`);
    assert.ok(['stated', 'inferred'].includes(e.confidence));
    if (r.format !== 'madr') { const said = plain(e.passages.map(id => byId.get(id).text).join(' ')); assert.equal(e.confidence === 'stated', !!e.passages.length && said.includes(plain(e.name)), `${label}: ${e.id} "${e.name}" is stated exactly when its name is in the lines it cites`); }
    assert.equal(typeof e.external, 'boolean'); assert.ok(e.parent === null || els.has(e.parent) || r.elements.some(x => x.id === e.parent), `${label}: ${e.id} names a parent that exists`);
    assert.ok(e.attrs && typeof e.attrs === 'object' && !Array.isArray(e.attrs));
  }
  for (const x of r.relationships) {
    assert.deepEqual(Object.keys(x), ['id', 'from', 'to', 'label', 'technology', 'kind', 'passages', 'confidence', 'attrs'], `${label}: ${x.id} has the relationship shape`);
    assert.ok(els.has(x.from) && els.has(x.to) && x.from !== x.to, `${label}: ${x.id} joins two kept elements`);
    assert.ok(RELATIONSHIP_KINDS.includes(x.kind), `${label}: ${x.id} kind ${x.kind} is normalised`);
    assert.ok(x.passages.every(id => ids.has(id)), `${label}: ${x.id} cites passages that exist`);
  }
  for (const v of r.views) { assert.deepEqual(Object.keys(v).filter(k => k !== 'ref'), ['id', 'title', 'kind', 'elementIds']); assert.ok(v.elementIds.every(id => els.has(id)), `${label}: ${v.id} names kept elements`); }
  for (const q of r.questions) assert.deepEqual(Object.keys(q), ['key', 'question', 'forType']);
  assert.ok(r.questions.length <= 20);
  const c = r.report.counts;
  assert.deepEqual([c.passages, c.elements, c.relationships, c.views, c.questions, c.omitted], [r.passages.length, r.elements.length, r.relationships.length, r.views.length, r.questions.length, r.report.omitted.length], label + ': the counts count');
  assert.equal(c.stated + c.inferred, r.elements.length); assert.equal(Object.values(c.kinds).reduce((n, v) => n + v, 0), r.elements.length, label + ': kinds sum to the elements');
  for (const o of r.report.omitted) assert.ok(typeof o.reason === 'string' && o.reason, label + ': every omission says why');
  assert.deepEqual(modelCounts(r), {format: r.format, passages: r.passages.length, elements: r.elements.length, relationships: r.relationships.length, views: r.views.length, questions: r.questions.length, stated: c.stated, inferred: c.inferred, omitted: r.report.omitted.length, kinds: c.kinds});
  for (const k of Object.keys(ELEMENT_KINDS)) assert.ok(k);
}
const byName = (r, name) => r.elements.find(e => e.name === name) || assert.fail('no element named ' + name);
const rel = (r, from, to) => r.relationships.find(x => x.from === byName(r, from).id && x.to === byName(r, to).id) || assert.fail(`no relationship ${from} → ${to}`);

// ---------------------------------------------------------------- 1. the fixtures, one per format
const FIXTURES = readdirSync(DIR).filter(f => f !== 'bike-share-brief.txt').sort();
assert.deepEqual(FIXTURES, ['bike-share-decision.md', 'bike-share.archimate', 'bike-share.archimate.xml', 'bike-share.bpmn', 'bike-share.drawio', 'bike-share.dsl', 'bike-share.mmd', 'bike-share.puml'], 'one fixture per format, and a MADR record');
assert.match(fixture('bike-share-brief.txt'), /^Neighbourhood bike share — project brief \(AIW authored teaching example/, 'the brief the fixtures pair with sits beside them');
const R = {};
for (const f of FIXTURES) {
  const text = fixture(f), ext = f.split('.').pop(), hinted = interpretModel(text, {name: f, format: ext}), detected = interpretModel(text, {name: f});
  assert.match(text.slice(0, 600), /AIW authored teaching example/, f + ' says what it is');
  invariants(text, hinted, f); invariants(text, detected, f + ' (detected)');
  assert.equal(hinted.format, KIND_OF[ext], f + ' is read as ' + KIND_OF[ext]);
  assert.equal(detected.format, hinted.format, f + ': the format is detected from the text alone');
  assert.equal(JSON.stringify({...detected, name: ''}), JSON.stringify({...hinted, name: ''}), f + ': hinted and detected read the same');
  assert.equal(JSON.stringify(browserRules.interpretModel(text, {name: f})), JSON.stringify(detected), f + ': shared/ re-exports the one reader in public/');
  R[f] = hinted;
  measured.fixtures[f] = {format: hinted.format, ...hinted.report.counts};
}
pass('eight fixtures read with and without a format hint, the same either way, every one meeting the contract: shape and order, passages that round-trip their offsets, elements and relationships that cite kept passages, normalised kinds, stated exactly when the name is in the cited lines, counts that count, every omission with a reason; shared/ is the public/ reader');

// Structurizr DSL: people, systems, containers with technology and tags, a deployment environment with nodes and
// instances, relationships by identifier and by hierarchical path, implicit sources, external tags, three views.
{
  const r = R['bike-share.dsl'], c = r.report.counts;
  assert.deepEqual(c.kinds, {container: 7, environment: 1, instance: 6, node: 5, person: 3, system: 4});
  assert.equal(r.relationships.length, 13); assert.equal(r.views.length, 3); assert.deepEqual(r.report.omitted, []);
  assert.deepEqual([byName(r, 'Rebalancing contractor').external, byName(r, 'Dock hardware').external, byName(r, 'Resident').external, byName(r, 'Bike share platform').external], [true, true, false, false], 'the External tag marks externals');
  const store = byName(r, 'Trip store');
  assert.deepEqual([store.kind, store.technology, store.tags, store.parent, store.description], ['container', 'Relational database', ['Database'], byName(r, 'Bike share platform').id, 'Keeps trips, members and dock status.']);
  assert.deepEqual(byName(r, 'Trip events').tags, ['Queue']);
  assert.deepEqual([byName(r, 'Dock gateway').technology, byName(r, 'Dock gateway').tags], ['Protocol adapter', ['Adapter']]);
  const uses = rel(r, 'Mobile app', 'Trip service'); assert.deepEqual([uses.kind, uses.label, uses.technology, uses.confidence], ['uses', 'Asks for docks and unlocks a bike', 'HTTPS', 'stated']);
  assert.equal(rel(r, 'Dock gateway', 'Trip service').kind, 'flow', 'a Message technology reads as a flow');
  assert.equal(rel(r, 'Trip service', 'Trip events').kind, 'flow'); assert.equal(rel(r, 'Pricing and payment service', 'Trip events').kind, 'flow');
  assert.equal(rel(r, 'Resident', 'Mobile app').label, 'Finds a dock, unlocks a bike and sees receipts', 'a hierarchical reference (bikeshare.app) resolves');
  assert.equal(rel(r, 'Dock gateway', 'Dock hardware').technology, 'Vendor protocol');
  const live = byName(r, 'Live'), region = byName(r, 'Council cloud region'), cluster = byName(r, 'Application cluster');
  assert.deepEqual([live.kind, region.kind, region.parent, cluster.parent, cluster.attrs.instances, byName(r, 'Dock sites').attrs.instances, region.technology], ['environment', 'node', live.id, region.id, '2', '40', 'Cloud region']);
  const inst = byName(r, 'Trip service instance');
  assert.deepEqual([inst.kind, inst.parent, inst.attrs.of, inst.attrs.environment, inst.confidence], ['instance', cluster.id, byName(r, 'Trip service').id, live.id, 'inferred'], 'an instance names the container it runs and the environment');
  assert.deepEqual(r.views.map(v => v.kind), ['systemContext', 'container', 'deployment']);
  assert.ok(r.passages.every(p => !/^\/\//.test(p.text)), 'comment lines are not passages');
  assert.equal(r.elements.filter(e => e.confidence === 'stated').length, 20, 'every named element is stated; the six instances (named by the reader) are inferred');
  pass('Structurizr DSL: people, four systems (three external), seven containers with technology and tags under the system, an environment with five nodes and six instances (instance counts kept), thirteen relationships by identifier and hierarchical path (a Message technology reads as a flow), three views, no omission');
}
// ArchiMate exchange: every element type the reader maps, every relationship kind, nesting from composition and
// aggregation, documentation as description, one view; Archi's native file read too.
{
  const r = R['bike-share.archimate.xml'];
  const TYPE = {Resident: 'person', Member: 'person', 'Unlock a bike': 'process', 'Bike hire': 'service', 'Trip service': 'container', 'Trip recording': 'service', 'Dock API': 'interface', 'Trip record': 'data', 'Application cluster': 'node', Dock: 'node', 'Relational database': 'technology', 'Container hosting': 'service', 'Trip table': 'data', 'Transport team': 'stakeholder', 'Fast unlock at the dock': 'driver', 'Fewer car journeys in the neighbourhood': 'outcome', 'Two thousand trips a day in the first year': 'outcome', 'Record once, charge once': 'constraint', 'Unlock a bike within three seconds': 'requirement', 'Trip locations kept no longer than ninety days': 'constraint', 'Fleet rebalancing': 'capability', 'Bike fleet': 'capability', 'First neighbourhood go-live': 'task', 'Summer launch': 'boundary', 'No rebalancing list yet': 'requirement', 'Bike share platform': 'boundary'};
  for (const [name, kind] of Object.entries(TYPE)) assert.equal(byName(r, name).kind, kind, `${name} reads as ${kind}`);
  assert.deepEqual([byName(r, 'First neighbourhood go-live').attrs.layer, byName(r, 'Summer launch').attrs.layer, byName(r, 'No rebalancing list yet').attrs.layer, byName(r, 'Unlock a bike').attrs.layer], ['implementation', 'implementation', 'implementation', undefined], 'the implementation-and-migration layer is marked: a work package is not a journey step');
  assert.equal(r.elements.length, 28); assert.equal(r.relationships.length, 20); assert.deepEqual(r.report.omitted, []);
  assert.equal(byName(r, 'Trip service').attrs.xsiType, 'ApplicationComponent'); assert.equal(byName(r, 'Trip service').description, 'Records each trip exactly once, from unlock to return.');
  const KINDS = {'Resident>Member': 'assigned', 'Unlock a bike>Return the bike': 'triggers', 'Unlock a bike>Bike hire': 'realizes', 'Trip recording>Unlock a bike': 'serves', 'Trip service>Dock API': 'composes', 'Trip service>Trip record': 'accesses', 'Trip service>Pricing and payment service': 'flow', 'Fast unlock at the dock>Unlock a bike within three seconds': 'association', 'Member>Resident': 'association', 'Bike share platform>Trip service': 'composes'};
  for (const [pair, kind] of Object.entries(KINDS)) { const [a, b] = pair.split('>'); assert.equal(rel(r, a, b).kind, kind, `${pair} is ${kind}`); }
  assert.deepEqual([rel(r, 'Trip service', 'Trip record').attrs.accessType, rel(r, 'Trip service', 'Pricing and payment service').label, rel(r, 'Unlock a bike', 'Return the bike').label], ['Write', 'Trip completed', 'then']);
  assert.deepEqual([byName(r, 'Dock API').parent, byName(r, 'Trip service').parent, byName(r, 'Pricing and payment service').parent], [byName(r, 'Trip service').id, byName(r, 'Bike share platform').id, byName(r, 'Bike share platform').id], 'composition and aggregation nest');
  assert.deepEqual(r.views.map(v => [v.title, v.kind, v.elementIds.length]), [['Application view', 'Diagram', 4]]);
  const a = R['bike-share.archimate'];
  assert.equal(a.format, 'archimate'); assert.deepEqual(a.report.counts.kinds, {container: 2, data: 1, node: 1, person: 1, process: 1}); assert.equal(a.relationships.length, 5);
  assert.deepEqual([rel(a, 'Trip service', 'Pricing and payment service').kind, rel(a, 'Trip service', 'Trip record').kind, rel(a, 'Application cluster', 'Trip service').kind, rel(a, 'Resident', 'Unlock a bike').kind], ['flow', 'accesses', 'realizes', 'assigned']);
  assert.deepEqual(a.views.map(v => [v.title, v.elementIds.length]), [['Application view', 2]]); assert.equal(byName(a, 'Resident').description, 'Signs up, unlocks a bike, rides and pays the fee.');
  pass('ArchiMate: an exchange file with 28 elements of every mapped type (motivation, strategy, business, application, technology, implementation and migration, grouping), 20 relationships of every kind with access type and names, nesting from composition and aggregation, one view; Archi\'s native .archimate read the same way');
}
// BPMN: pools, lanes, every task type, events with their definitions and positions, a boundary event attached to its
// task, gateways by type, a sub-process with its own start and end, flows with conditions and defaults, message flows,
// data objects and stores with their associations.
{
  const r = R['bike-share.bpmn'], c = r.report.counts;
  assert.deepEqual(c.kinds, {data: 3, event: 7, gateway: 3, lane: 2, pool: 3, task: 8});
  assert.deepEqual(r.elements.filter(e => e.kind === 'pool').map(e => e.name), ['Resident', 'Bike share platform', 'Payment provider']);
  const platform = byName(r, 'Bike share platform'), dockLane = byName(r, 'Dock gateway'), tripLane = byName(r, 'Trip service');
  assert.deepEqual([dockLane.kind, dockLane.parent, tripLane.parent], ['lane', platform.id, platform.id]);
  const TASK = {'Present card or app at the dock': 'userTask', 'Validate the member': 'serviceTask', 'Release the lock': 'task', 'Record the trip': 'subProcess', 'Store the trip segment': 'scriptTask', 'Charge the fee': 'serviceTask', 'Ask the member to update the card': 'sendTask', 'Send the receipt': 'sendTask'};
  for (const [name, t] of Object.entries(TASK)) { const e = byName(r, name); assert.deepEqual([e.kind, e.attrs.taskType], ['task', t], name); }
  assert.deepEqual([byName(r, 'Record the trip').attrs.subprocess, byName(r, 'Store the trip segment').parent, byName(r, 'Present card or app at the dock').parent, byName(r, 'Charge the fee').parent], [true, byName(r, 'Record the trip').id, dockLane.id, tripLane.id], 'a sub-process holds its tasks; lanes hold their nodes');
  const start = byName(r, 'Unlock requested'), wait = byName(r, 'Bike returned'), refused = byName(r, 'Unlock refused'), failed = byName(r, 'Charge failed');
  assert.deepEqual([start.attrs.position, start.attrs.eventType, wait.attrs.position, wait.attrs.eventType, refused.attrs.position, refused.attrs.eventType, failed.attrs.position, failed.attrs.eventType, failed.attrs.attachedTo], ['start', 'message', 'intermediate', 'timer', 'end', 'none', 'boundary', 'error', byName(r, 'Charge the fee').id]);
  const inner = r.elements.filter(e => e.kind === 'event' && e.parent === byName(r, 'Record the trip').id);
  assert.deepEqual(inner.map(e => [e.name, e.attrs.position, e.confidence]), [['start event', 'start', 'inferred'], ['end event', 'end', 'inferred']], 'unnamed events are named by the reader and marked inferred');
  assert.deepEqual([byName(r, 'Member valid?').attrs.gatewayType, byName(r, 'Charge and notify').attrs.gatewayType, byName(r, 'Both done').attrs.gatewayType], ['exclusive', 'parallel', 'parallel']);
  const seq = r.relationships.filter(x => x.kind === 'sequence'), msg = r.relationships.filter(x => x.kind === 'message'), acc = r.relationships.filter(x => x.kind === 'accesses');
  assert.deepEqual([seq.length, msg.length, acc.length], [17, 2, 2]);
  const valid = rel(r, 'Member valid?', 'Release the lock'), notValid = rel(r, 'Member valid?', 'Unlock refused');
  assert.deepEqual([valid.label, valid.attrs.condition, notValid.label, notValid.attrs.isDefault], ['Valid', 'member.valid == true', 'Not valid', true]);
  assert.deepEqual([rel(r, 'Resident', 'Unlock requested').label, rel(r, 'Charge the fee', 'Payment provider').label], ['Unlock request', 'Charge instruction'], 'message flows between a pool and a node');
  assert.equal(rel(r, 'Charge failed', 'Ask the member to update the card').kind, 'sequence', 'a flow leaves the boundary event');
  const stores = r.elements.filter(e => e.kind === 'data');
  assert.deepEqual(stores.map(e => [e.name, e.attrs.dataType]), [['Trip record', 'dataObjectReference'], ['Trip record', 'dataObject'], ['Trip store', 'dataStoreReference']]);
  assert.equal(stores[0].attrs.standsFor, stores[1].id, 'a reference stands for its object');
  const writes = acc.find(x => x.label === 'writes'), reads = acc.find(x => x.label === 'reads');
  assert.deepEqual([writes.from, writes.to, reads.from, reads.to], [byName(r, 'Store the trip segment').id, stores[1].id, byName(r, 'Trip store').id, byName(r, 'Charge the fee').id], 'a task writes the data object and reads the store');
  assert.deepEqual(r.report.omitted.map(o => o.kind), ['textAnnotation']); assert.deepEqual(r.views.map(v => [v.kind, v.elementIds.length]), [['BPMNDiagram', 3]]);
  pass('BPMN 2.0: three pools and two lanes, every task type (a sub-process with its own start and end), events by position and definition (message start, timer, error boundary attached to its task, unnamed inner events named by the reader), gateways by type, seventeen sequence flows with a condition and a default, two message flows, data object and store with their reads and writes, the annotation reported');
}
// draw.io: C4 object cells (name, type, technology, description, external by colour), a boundary as parent, C4 edges
// with technology, a plain edge with a label, one ArchiMate shape, a plain cell reported.
{
  const r = R['bike-share.drawio'];
  assert.deepEqual(r.report.counts.kinds, {boundary: 1, container: 4, data: 1, person: 1, system: 1});
  const platform = byName(r, 'Bike share platform'), app = byName(r, 'Mobile app');
  assert.deepEqual([platform.kind, app.parent, app.technology, app.description, byName(r, 'Trip store').tags, byName(r, 'Payment provider').external, byName(r, 'Resident').external], ['boundary', platform.id, 'Mobile app', 'Shows docks with available bikes and unlocks a bike.', ['Database'], true, false]);
  assert.deepEqual([byName(r, 'Trip record').kind, byName(r, 'Trip record').attrs.archimateType], ['data', 'passive']);
  const e1 = rel(r, 'Mobile app', 'Trip service'), e3 = rel(r, 'Trip service', 'Pricing and payment service'), plainEdge = rel(r, 'Resident', 'Mobile app');
  assert.deepEqual([e1.label, e1.technology, e1.kind, e3.kind, plainEdge.label, plainEdge.kind], ['Asks for docks and unlocks a bike', 'HTTPS', 'uses', 'flow', 'Finds a dock, unlocks a bike and sees receipts', 'association']);
  assert.equal(r.relationships.length, 5); assert.deepEqual(r.report.omitted.map(o => o.id), ['note']); assert.deepEqual(r.views.map(v => [v.title, v.elementIds.length]), [['Containers', 8]]);
  pass('draw.io: C4 object cells with name, type, technology and description, external by its colour, the boundary as parent, C4 connectors with technology (an Event technology reads as a flow), a plain connector by its label, one ArchiMate shape, the plain note reported');
}
// Mermaid C4 and C4-PlantUML: the same macros, with their variants.
{
  const m = R['bike-share.mmd'];
  assert.deepEqual(m.report.counts.kinds, {boundary: 1, container: 6, person: 2, system: 2}); assert.equal(m.relationships.length, 10); assert.deepEqual(m.report.omitted, []);
  assert.deepEqual([byName(m, 'Rebalancing contractor').external, byName(m, 'Payment provider').external, byName(m, 'Resident').external, byName(m, 'Trip store').tags, byName(m, 'Trip events').tags, byName(m, 'Mobile app').parent], [true, true, false, ['Database'], ['Queue'], byName(m, 'Bike share platform').id]);
  assert.deepEqual([rel(m, 'Dock gateway', 'Trip service').kind, rel(m, 'Pricing and payment service', 'Trip store').attrs.bidirectional, rel(m, 'Mobile app', 'Trip service').technology], ['flow', true, 'HTTPS']);
  assert.deepEqual(m.views.map(v => [v.title, v.kind, v.elementIds.length]), [['Neighbourhood bike share · containers', 'C4Container', 11]]);
  const u = R['bike-share.puml'];
  assert.deepEqual(u.report.counts.kinds, {boundary: 1, container: 6, node: 2, person: 2, system: 2}); assert.equal(u.relationships.length, 9);
  assert.equal(rel(u, 'Trip events', 'Pricing and payment service').label, 'Subscribes to trip completed', 'Rel_Back names its ends the other way round');
  assert.equal(rel(u, 'Pricing and payment service', 'Payment provider').technology, 'HTTPS', 'a $tags argument is dropped');
  assert.deepEqual([byName(u, 'Worker node').parent, byName(u, 'Worker node').technology], [byName(u, 'Application cluster').id, 'Virtual machine']);
  assert.deepEqual(u.report.omitted.map(o => o.reason.split(' was')[0]), ['!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml', '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Deployment.puml'], 'includes are reported, not followed');
  assert.deepEqual(u.views.map(v => [v.title, v.elementIds.length]), [['Neighbourhood bike share · containers', 13]]);
  pass('Mermaid C4 and C4-PlantUML: Person, System, Container and their _Ext, Db and Queue variants, boundaries as parents, Rel with label and technology, Rel_D, Rel_Back and BiRel, style and layout macros ignored, $tags dropped, Deployment_Node nested, !include reported');
}
// MADR through public/madr.js: a decision with its alternatives, the chosen one marked.
{
  const r = R['bike-share-decision.md'];
  assert.equal(r.format, 'madr'); assert.deepEqual(r.report.counts.kinds, {alternative: 3, decision: 1});
  const d = r.elements.find(e => e.kind === 'decision'), alts = r.elements.filter(e => e.kind === 'alternative');
  assert.equal(d.name, 'Record each trip once in the trip service, not at the dock'); assert.match(d.description, /^A trip must be recorded exactly once/);
  assert.deepEqual([d.attrs.status, d.attrs.drivers.length, d.attrs.chosen], ['proposed', 3, 'Trip service owns the trip record']);
  assert.deepEqual(alts.map(a => [a.name, a.attrs.chosen, a.parent]), [['Trip service owns the trip record', true, d.id], ['Dock gateway owns the trip record', false, d.id], ['Both keep a copy and reconcile nightly', false, d.id]]);
  assert.deepEqual(alts[0].attrs.good, ['one owner and one idempotency key.']); assert.deepEqual(alts[0].attrs.bad, ['the dock needs an outbox.']);
  assert.deepEqual(r.relationships.map(x => x.label), ['chooses', 'considers', 'considers']);
  assert.ok(d.passages.length >= 5 && alts.every(a => a.passages.length));
  pass('MADR through public/madr.js: one decision with status, drivers and context, three alternatives (the chosen one first and marked) with their good and bad lines, chooses and considers relationships, every element citing its lines');
}

// ---------------------------------------------------------------- 2. detection and the small readers
{
  assert.equal(detectFormat('workspace "x" {\n model {\n a = person "A"\n }\n}'), 'structurizr');
  assert.equal(detectFormat('a = softwareSystem "A"\nb = person "B"\na -> b "x"'), 'structurizr', 'a model without a workspace block');
  assert.equal(detectFormat('<?xml version="1.0"?><definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"/>'), 'bpmn');
  assert.equal(detectFormat('<mxfile><diagram/></mxfile>'), 'drawio'); assert.equal(detectFormat('<mxGraphModel><root/></mxGraphModel>'), 'drawio');
  assert.equal(detectFormat('<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/"><elements/></model>'), 'archimate');
  assert.equal(detectFormat('@startuml\nPerson(a, "A")\n@enduml'), 'plantuml-c4'); assert.equal(detectFormat('%% c\nC4Context\n  Person(a, "A")'), 'mermaid-c4'); assert.equal(detectFormat('flowchart LR\n a --> b'), 'mermaid-c4');
  assert.equal(detectFormat('# A decision\n\n## Context and Problem Statement\n\nx'), 'madr'); assert.equal(detectFormat('---\nstatus: accepted\n---\n# A decision'), 'madr');
  assert.equal(detectFormat('Just some prose about bikes.'), 'unknown'); assert.equal(detectFormat('<html><body>x</body></html>'), 'unknown');
  assert.equal(detectFormat('anything', 'dsl'), 'structurizr'); assert.equal(detectFormat('anything', '.puml'), 'plantuml-c4'); assert.equal(detectFormat('<mxfile/>', 'xml'), 'drawio', 'xml is not a format: the text decides');
  const none = interpretModel('Just some prose about bikes.', {name: 'notes.txt'});
  assert.deepEqual([none.format, none.elements.length, none.report.omitted.length], ['unknown', 0, 1]); assert.match(none.report.omitted[0].reason, /not recognised/);
  const empty = interpretModel('', {name: 'empty'}); assert.deepEqual([empty.format, empty.elements.length, empty.hash], ['unknown', 0, sha('')]);
  assert.throws(() => interpretModel(null), /text/);
  assert.equal(unescapeXML('&lt;a&gt; &amp; &quot;b&quot; &apos;c&apos; &#65;&#x42; &lol; &#xD800;'), '<a> & "b" \'c\' AB &lol; &#xD800;', 'the five entities and character references; an unknown entity and a surrogate stay as written');
  // A flowchart: nodes by shape, a subgraph, labels between dashes, chains.
  const fc = interpretModel('flowchart LR\n  subgraph g1 ["Platform"]\n    a["Mobile app"] --> b[("Trip store")]\n    a -- asks --> c(("Done"))\n  end\n  d>"Resident"] -.->|"uses"| a\n  e{"Valid?"} ==> a', {name: 'f.mmd'});
  assert.deepEqual(fc.elements.map(e => [e.kind, e.name, e.parent ? 'in' : '']), [['boundary', 'Platform', ''], ['container', 'Mobile app', 'in'], ['data', 'Trip store', 'in'], ['event', 'Done', 'in'], ['person', 'Resident', ''], ['gateway', 'Valid?', '']]);
  assert.deepEqual(fc.relationships.map(x => [x.kind, x.label]), [['uses', ''], ['uses', 'asks'], ['flow', 'uses'], ['sequence', '']]);
  pass('detection from the text alone for every format (and unknown for prose or HTML), a hint by extension, xml decided by the text; prose reads nothing and says so; the XML entities; a Mermaid flowchart by shapes, subgraphs and arrows');
}

// ---------------------------------------------------------------- 3. bounds
{
  const small = 'workspace {\n model {\n a = person "Alice"\n b = softwareSystem "Bank"\n a -> b "Uses"\n }\n}\n';
  const over = small + '// ' + 'x'.repeat(MODEL_LIMIT - small.length - 2);
  assert.equal(over.length, MODEL_LIMIT + 1);
  const r = interpretModel(over, {name: 'big.dsl'});
  assert.deepEqual([r.format, r.elements.length, r.relationships.length, r.hash], ['structurizr', 0, 0, sha(over)], 'above the limit nothing is read; the hash is still the text\'s');
  assert.match(r.report.omitted[0].reason, /2,000,001 characters.*2,000,000.*Nothing was read/s);
  const at = small + '// ' + 'x'.repeat(MODEL_LIMIT - small.length - 3);
  assert.equal(at.length, MODEL_LIMIT); assert.equal(interpretModel(at, {name: 'at.dsl'}).elements.length, 2, 'at the limit the model is read');
  // 500 per kind, 500 relationships; the rest counted.
  const many = 'workspace {\n model {\n' + Array.from({length: 520}, (_, i) => ` p${i} = person "Person ${i}"`).join('\n') + '\n s = softwareSystem "S"\n' + Array.from({length: 520}, (_, i) => ` p${i % 500} -> s "uses ${i}"`).join('\n') + '\n }\n}\n';
  const m = interpretModel(many, {name: 'many.dsl'});
  assert.deepEqual([m.report.counts.kinds.person, m.report.counts.kinds.system, m.relationships.length], [MODEL_KIND_LIMIT, 1, MODEL_KIND_LIMIT]);
  assert.ok(m.report.omitted.some(o => /20 more persons beyond the 500/.test(o.reason)), 'the report counts the persons beyond the limit');
  assert.ok(m.report.omitted.some(o => /20 more relationships beyond the 500/.test(o.reason)), 'and the relationships');
  assert.ok(m.questions.length <= 20, 'questions stay bounded');
  pass(`bounds: a text of ${(MODEL_LIMIT + 1).toLocaleString('en-GB')} characters is refused with its hash and a report line, one of ${MODEL_LIMIT.toLocaleString('en-GB')} is read; 500 elements per kind and 500 relationships are kept and the rest counted in the report; at most 20 questions`);
}

// ---------------------------------------------------------------- 4. hostile input
{
  // Deep nesting: a BPMN sub-process 160 levels deep; the levels beyond 100 are not read and the report says so.
  const deep = '<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"><process id="p" name="P">' + Array.from({length: 160}, (_, i) => `<subProcess id="s${i}" name="Level ${i}">`).join('') + '<task id="t" name="Deepest"/>' + '</subProcess>'.repeat(160) + '</process></definitions>';
  const t0 = performance.now(), d = interpretModel(deep, {name: 'deep.bpmn'});
  assert.ok(performance.now() - t0 < 2000, 'deep nesting is read quickly');
  assert.ok(d.elements.length >= 90 && d.elements.length <= 100, 'the levels beyond the depth are not read: ' + d.elements.length);
  assert.ok(!d.elements.some(e => e.name === 'Deepest'), 'the deepest task is beyond the bound');
  assert.ok(d.report.omitted.some(o => /deeper than 100 levels/.test(o.reason)));
  // An entity bomb: the DOCTYPE is skipped whole and no entity is expanded; the text stays small and literal.
  const bomb = '<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol1 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;"><!ENTITY lol2 "&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;"><!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">]><model xmlns="http://www.opengroup.org/xsd/archimate/3.0/"><elements><element identifier="a" xsi:type="BusinessActor"><name>Actor &lol3; &lol3;</name></element></elements></model>';
  const b = interpretModel(bomb, {name: 'bomb.xml'});
  assert.equal(b.elements[0].name, 'Actor &lol3; &lol3;', 'a declared entity is never expanded: it stays as written');
  assert.ok(b.report.omitted.some(o => /DOCTYPE was skipped/.test(o.reason)));
  assert.equal(b.format, 'archimate');
  // Markup in names stays text in every format; a reader of HTML labels strips its own markup.
  const hostile = '<script>alert(1)</script><img src=x onerror=alert(2)>';
  const dsl = interpretModel(`workspace {\n model {\n a = person "${hostile.replace(/"/g, '\\"')}" "d"\n }\n}`, {name: 'x.dsl'});
  assert.equal(dsl.elements[0].name, hostile, 'Structurizr: the name is the text the file holds');
  const arch = interpretModel(`<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/"><elements><element identifier="a" xsi:type="BusinessActor"><name>${hostile.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</name></element></elements></model>`, {name: 'x.xml'});
  assert.equal(arch.elements[0].name, hostile, 'ArchiMate: the escaped name comes back as the text it encodes');
  const bp = interpretModel(`<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"><process id="p"><task id="t" name="${hostile.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}"/></process></definitions>`, {name: 'x.bpmn'});
  assert.equal(bp.elements[0].name, hostile);
  const dio = interpretModel(`<mxfile><diagram name="d"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><object c4Name="${hostile.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}" c4Type="Person" id="x"><mxCell vertex="1" parent="1"/></object></root></mxGraphModel></diagram></mxfile>`, {name: 'x.drawio'});
  assert.equal(dio.elements[0].name, hostile, 'draw.io: a C4 name attribute is text');
  const mm = interpretModel(`flowchart LR\n a["<b>Bold</b> <script>x</script>name<br/>sub"]`, {name: 'x.mmd'});
  assert.deepEqual([mm.elements[0].name, mm.elements[0].description], ['Bold xname', 'sub'], 'Mermaid: an HTML label is read as its text');
  const madr = interpretModel(`# ${hostile}\n\n## Context and Problem Statement\n\nx\n\n## Considered Options\n\n* A\n* B\n\n## Decision Outcome\n\nChosen option: "A", because y.`, {name: 'x.md'});
  assert.equal(madr.elements[0].name, hostile, 'MADR: the title is text');
  for (const r of [dsl, arch, bp, dio, madr]) assert.ok(JSON.stringify(r).includes('alert(1)'), 'nothing was executed, nothing was dropped: the text is data');
  // Unclosed tags, a comment that never ends, CDATA, binary.
  const broken = interpretModel('<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"><process id="p"><task id="t" name="Open"><documentation><![CDATA[<b>raw</b>]]></documentation><task id="u" name="Nested"', {name: 'b.bpmn'});
  assert.deepEqual([broken.format, broken.elements[0].name, broken.elements[0].description], ['bpmn', 'Open', '<b>raw</b>'], 'a truncated file is read as far as it goes; CDATA is text');
  const comment = interpretModel('workspace {\n model {\n a = person "A"\n /* never closed\n b = person "B"\n }\n}', {name: 'c.dsl'});
  assert.deepEqual(comment.elements.map(e => e.name), ['A']); assert.ok(comment.report.omitted.some(o => /comment block is not closed/.test(o.reason)));
  const bin = interpretModel(String.fromCharCode(...Array.from({length: 3000}, (_, i) => (i * 7919) % 256)), {name: 'bin'});
  assert.equal(bin.format, 'unknown');
  // A 1 MB Structurizr DSL (the shape AIW exports), timed; the bounds hold and the cited lines still round-trip.
  const lines = ['workspace "Big" "A million characters" {', '  !identifiers hierarchical', '  model {'];
  let n = 0; while (lines.join('\n').length < 1024 * 1024 - 200) { lines.push(`    s${n} = softwareSystem "System ${n}" "Does the ${n}th thing in the design, described at some length so that the file grows." { tags "Tag${n % 7}" properties { "aiw.id" "sys-${n}" "aiw.kind" "physicalApp" "aiw.x" "${n * 3}" "aiw.y" "${n * 5}" } }`); if (n > 0) lines.push(`    s${n - 1} -> s${n} "Calls system ${n} for the ${n}th step" "HTTPS" { properties { "aiw.id" "rel-${n}" } }`); n++; }
  lines.push('  }', '}');
  const mb = lines.join('\n'), t1 = performance.now(), big = interpretModel(mb, {name: 'mb.dsl'}), ms = Math.round(performance.now() - t1);
  measured.timing.oneMegabyteStructurizrMs = ms; measured.timing.oneMegabyteStructurizrChars = mb.length; measured.timing.oneMegabyteStructurizrLines = lines.length;
  assert.ok(mb.length >= 1024 * 1024 - 200 && mb.length <= MODEL_LIMIT);
  assert.deepEqual([big.report.counts.kinds.system, big.relationships.length], [MODEL_KIND_LIMIT, MODEL_KIND_LIMIT - 1], "500 systems are kept, with the 499 relationships of the chain between them; a relationship to a system beyond the bound is reported");
  assert.ok(ms < 10000, `a 1 MB DSL reads in under ten seconds (${ms} ms)`);
  for (const p of big.passages.slice(0, 50)) assert.equal(mb.slice(p.start, p.end), p.text);
  pass(`hostile input: 160 nested sub-processes stop at the depth bound and say so; an entity bomb is never expanded (the DOCTYPE is skipped, the entity stays literal); markup in names stays inert text in every format (HTML labels read as text); unclosed tags, CDATA, an unclosed comment and binary are read or refused without a throw; a 1 MB Structurizr DSL of ${lines.length} lines reads in ${ms} ms with the bounds holding`);
}

// ---------------------------------------------------------------- 5. compressed draw.io, and the model file reader
{
  const text = fixture('bike-share.drawio'), inner = /<mxGraphModel[\s\S]*<\/mxGraphModel>/.exec(text)[0];
  const packed = text.replace(inner, Buffer.from(deflateRawSync(Buffer.from(encodeURIComponent(inner)))).toString('base64'));
  assert.ok(!packed.includes('<mxGraphModel'));
  const asIs = interpretModel(packed, {name: 'packed.drawio'});
  assert.deepEqual([asIs.format, asIs.elements.length], ['drawio', 0]); assert.ok(asIs.report.omitted.some(o => /compressed/.test(o.reason)), 'a compressed diagram is reported, not guessed');
  const inflated = await inflateModelText(packed);
  assert.deepEqual([inflated.inflated, inflated.note], [1, '']);
  const r = interpretModel(inflated.text, {name: 'packed.drawio'});
  assert.deepEqual(r.elements.map(e => e.name), R['bike-share.drawio'].elements.map(e => e.name), 'the inflated diagram reads as the uncompressed one');
  assert.deepEqual(await inflateModelText('plain text'), {text: 'plain text', inflated: 0, note: ''});
  const bad = await inflateModelText('<mxfile><diagram id="x" name="y">' + 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=' + '</diagram></mxfile>');
  assert.deepEqual([bad.inflated, /could not be decoded/.test(bad.note)], [0, true]);
  // readModelFile: kinds by extension, the 2 MB cap, hashing the bytes, decompression for .drawio and .xml.
  assert.deepEqual(Object.keys(MODEL_FILE_KINDS).sort(), ['archimate', 'bpmn', 'drawio', 'dsl', 'markdown', 'md', 'mermaid', 'mmd', 'plantuml', 'puml', 'txt', 'xml']);
  assert.equal(MODEL_TEXT_LIMIT, 2 * 1024 * 1024);
  const dsl = fixture('bike-share.dsl'), f = await readModelFile(new File([dsl], 'bike-share.dsl', {type: 'text/plain'}));
  assert.deepEqual(f, {text: dsl, hash: sha(dsl), kind: 'dsl', bytes: Buffer.byteLength(dsl), inflated: 0, note: ''});
  const bom = await readModelFile(new File(['﻿' + dsl], 'b.dsl')); assert.equal(bom.text, dsl, 'a byte order mark is dropped');
  const crlf = await readModelFile(new File([dsl.replace(/\n/g, '\r\n')], 'c.dsl')); assert.equal(crlf.text, dsl, 'CRLF reads as LF');
  const packedFile = await readModelFile(new File([packed], 'bike-share.drawio')); assert.deepEqual([packedFile.kind, packedFile.inflated, packedFile.text.includes('<mxGraphModel')], ['drawio', 1, true]);
  const asXml = await readModelFile(new File([packed], 'diagram.xml')); assert.deepEqual([asXml.kind, asXml.inflated], ['xml', 1], 'an .xml that is an mxfile is inflated too');
  for (const [file, message] of [[new File(['x'], 'brief.pdf'), /\.dsl, \.xml/], [new File([''], 'empty.dsl'), /empty/], [new File([new Uint8Array([0xff, 0xfe, 0x00, 0x41])], 'bad.dsl'), /UTF-8/], [{name: 'x.dsl', size: MODEL_TEXT_LIMIT + 1, arrayBuffer: async () => new ArrayBuffer(0)}, /up to 2 MB/], [null, /Choose a model file/]]) await assert.rejects(readModelFile(file), message);
  pass('a compressed draw.io file is reported as it is, decoded by inflateModelText (DecompressionStream) and then read as the uncompressed one; readModelFile reads the model kinds by extension up to 2 MB, hashes the bytes, drops a byte order mark, folds CRLF, inflates .drawio and mxfile .xml, and refuses PDF, empty, non-UTF-8 and oversized files');
}

// ---------------------------------------------------------------- 6. the round trip: bank and clinic references
{
  const EXT = {structurizr: 'dsl', plantuml: 'puml', mermaid: 'mmd', drawio: 'drawio', archimate: 'xml', bpmn: 'bpmn'}, FORMAT = {structurizr: 'structurizr', plantuml: 'plantuml-c4', mermaid: 'mermaid-c4', drawio: 'drawio', archimate: 'archimate', bpmn: 'bpmn'};
  const KIND_FIX = {control: true, threat: true, evidence: true};
  const pairKey = (a, b) => [a, b].sort().join(' ⇄ ');
  for (const [template, name] of [['bank-payment', 'Bank payment'], ['clinic-appointments', 'Clinic appointments']]) {
    const p = createProject({name, template}, 'rt-' + template, '2026-10-01T09:00:00Z'), totals = measured.roundTrip[template] = {};
    for (const [ch, scenes] of Object.entries(CHAPTER_SCENES)) for (const sc of scenes) {
      const D = notationDiagram(p, sc, {chapter: Number(ch)}), L = notationLayout(D, {arrangement: SCENES.find(s => s.id === sc).arrangement});
      for (const f of CODE_FORMATS) {
        if (f.scenes && !f.scenes.includes(sc)) continue;
        // The sequence and lifecycle pictures (round 6, Contract T) draw behaviour, not model elements: lifelines, messages and states have no record kind to come back as, so the round trip reads the model pictures only.
        if (['sequence', 'lifecycle'].includes(sc)) continue;
        const label = `${template} chapter ${ch} ${sc} ${f.id}`, out = diagramCode(f.id, D, L, {project: p, chapter: Number(ch)}), r = interpretModel(out.document, {name: 'x.' + EXT[f.id], format: EXT[f.id]});
        invariants(out.document, r, label);
        assert.equal(r.format, FORMAT[f.id], label + ': read as its own format');
        const names = new Set(r.elements.map(e => e.name)), exportOmitted = new Set(out.report.omitted.map(o => o.id)), readerOmitted = new Set(r.report.omitted.map(o => o.id));
        const idOf = n => (f.id === 'drawio' ? n.id : targetId(n.id)), kept = n => !exportOmitted.has(n.id) && !readerOmitted.has(idOf(n)) && !(f.id === 'bpmn' && !['task', 'event', 'gateway'].includes(n.kind));
        // Every node the format carried comes back with its title equal; a node that does not is one the export's own
        // report omitted (the format cannot carry it) or one the reader reports (no AIW element kind: a control, a threat).
        for (const n of D.nodes) {
          if (names.has(n.title)) continue;
          assert.ok(exportOmitted.has(n.id) || readerOmitted.has(idOf(n)), `${label}: "${n.title}" (${n.kind}) neither returned nor reported`);
          if (!exportOmitted.has(n.id)) assert.ok(KIND_FIX[n.kind], `${label}: the reader omits only controls, threats and evidence, not ${n.kind}`);
        }
        for (const n of D.nodes.filter(kept)) assert.ok(names.has(n.title), `${label}: "${n.title}" returns with its title equal`);
        // Relationships: every edge between two kept nodes returns (as an unordered pair of the names); the count is exact
        // for the formats that carry edges alone, and the document's own relationship count for ArchiMate (nesting too).
        const keptIds = new Set(D.nodes.filter(kept).map(n => n.id)), byId = new Map(D.nodes.map(n => [n.id, n]));
        const expected = D.edges.filter(e => keptIds.has(e.from) && keptIds.has(e.to) && e.from !== e.to && (f.id !== 'bpmn' || e.kind === 'sequence' || e.kind === 'message'));
        const got = r.relationships.map(x => pairKey(r.elements.find(e => e.id === x.from).name, r.elements.find(e => e.id === x.to).name));
        for (const e of expected) { const key = pairKey(byId.get(e.from).title, byId.get(e.to).title), i = got.indexOf(key); assert.ok(i >= 0, `${label}: the relationship ${key} returns`); got.splice(i, 1); }
        if (f.id === 'archimate') assert.equal(r.relationships.length, (out.document.match(/<relationship /g) || []).length, label + ': every relationship of the exchange file (nesting included) is read');
        else assert.equal(r.relationships.length, expected.length, label + ': exactly the carried relationships return');
        const t = totals[f.id] ||= {scenes: 0, nodes: 0, carried: 0, returned: 0, relationshipsCarried: 0, relationshipsReturned: 0, reportedByReader: 0};
        t.scenes++; t.nodes += D.nodes.length; t.carried += D.nodes.filter(n => !exportOmitted.has(n.id)).length; t.returned += D.nodes.filter(n => names.has(n.title)).length; t.relationshipsCarried += expected.length; t.relationshipsReturned += f.id === 'archimate' ? expected.length : r.relationships.length; t.reportedByReader += D.nodes.filter(n => !exportOmitted.has(n.id) && readerOmitted.has(idOf(n))).length;
      }
    }
  }
  pass('the round trip: every standard diagram of the bank and clinic references, exported in Structurizr DSL, C4-PlantUML, Mermaid, draw.io, ArchiMate exchange and (process) BPMN and read back: every carried name returns with its title equal, every uncarried one is in the export\'s own report or reported by the reader (controls, threats and evidence have no element kind), every relationship between returned elements returns and the counts are exact');
}

console.log(JSON.stringify({suite: 'Model interpreter', passed: checks.length, checks, measured, limits: ['A model read is proposals in waiting: nothing here creates a record; the journey drafter proposes and a person accepts through the guide commands. Structurizr !include, extends and !docs, BPMN choreography and conversation, draw.io cells without C4, ArchiMate or AIW metadata, and controls, threats and evidence as elements are not read, and the report says so.']}, null, 1));
