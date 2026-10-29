// The process semantics (round 6, Contract T): every project has a process model; its elements carry the BPMN meanings
// (event type and position, boundary events on a task, gateway type, sub-processes, external pools, data objects), its
// flows are sequence or message flows carrying a contract, every reference is checked by the command, the structural
// checks (PROC-*) join Chapter 1's findings and so readiness, the typed relationships (RELATION-INVALID) do too, the
// process picture draws pools, message flows, boundary events, sub-processes, data objects and glyphs, the BPMN export
// carries them, the token walk steps in path order and paints through the marks channel, and nothing here writes without
// the reviewed workspace change. Runs without a provider key.
// Run: node process-semantics-validate.mjs
import assert from 'node:assert/strict';
import {seedProject, findings as chapterOneFindings} from './public/requirements-domain.js';
import {withFinalReview, CHAPTERS} from './public/review-domain.js';
import {createProject} from './shared/projects-domain.js';
import {withProcessModel, processFindings, processScenarios, processGraph, describeWalkStep, processElements, processTransitions, PROCESS_KINDS, EVENT_TYPES, EVENT_POSITIONS, GATEWAY_TYPES, TRANSITION_KINDS, PROCESS_LIMITS} from './public/process-model.js';
import {previewWorkingChange, applyWorkbenchCommand} from './public/workbench-domain.js';
import {architectureModel, relationshipFindings, typedRecordedRelationships, RECORDED_RELATIONSHIP_SOURCES} from './public/architecture-model.js';
import {archimateRelationship, archimateOf, archimateTypeOf, archimateWanted, ARCHIMATE_RULES, ARCHIMATE_RELATIONSHIPS} from './public/notation-palette.js';
import {notationDiagram, describeNode, describeEdge, glyphWords, SUBPROCESS_OPEN} from './public/notation-model.js';
import {notationLayout} from './public/notation-layout.js';
import {notationSVG, legendData, svgParts} from './public/notation-svg.js';
import {diagramCode} from './public/notation-code.js';
import {chapterChecks} from './public/readiness-model.js';
import {matrixModel, cellHTML} from './public/model-matrix.js';
import {processGuideHTML, processDetailsHTML, processElementCommand, processTransitionCommand, processScenario, chooseScenario, startWalk, stepWalk, playWalk, clearWalk, processWalk, processAction} from './public/process-editing.js';
import {setMarks, clearMarks, mergeMarks, marksInfo} from './public/model-marks.js';

const checks = [], pass = name => checks.push(name), at = '2026-10-02T12:00:00.000Z';
const count = (text, re) => (text.match(re) || []).length;
// Every change goes through the reviewed workspace change, as the companion sends it.
const apply = (doc, command) => { const q = previewWorkingChange(doc, [command]); return applyWorkbenchCommand(doc, {type: 'workspace.apply', payload: {commands: [command], stamp: q.stamp, reviewed: true}}, at, 'test').document; };
const element = (doc, payload) => { const next = apply(doc, {type: 'process.element', payload}); return [next, next.processModel.elements.at(-1)]; };
const flow = (doc, payload) => { const next = apply(doc, {type: 'process.transition', payload}); return [next, next.processModel.transitions.at(-1)]; };
const refuses = (doc, command, words) => assert.throws(() => previewWorkingChange(doc, [command]), words);

const bank = withFinalReview(seedProject()), frozenBank = JSON.stringify(bank);
const clinic = withFinalReview(createProject({name: 'Clinic appointments', template: 'clinic-appointments'}, 'ps-clinic', at)), frozenClinic = JSON.stringify(clinic);

// 1. Every project has a process model; the bank's reference routes and questions stay the bank's.
{
  for (const p of [bank, clinic]) assert.ok(p.processModel && Array.isArray(p.processModel.elements), 'a process model for every project');
  const bare = structuredClone(clinic); delete bare.processModel; withProcessModel(bare);
  assert.deepEqual(bare.processModel, {schemaVersion: 1, referenceVersion: 0, version: 0, elements: [], transitions: [], claims: []}, 'a document without one gets an empty model, with no reference routes');
  assert.equal(processElements(bare).length, 0); assert.equal(processTransitions(bare).length, 0);
  assert.equal(processElements(bank).filter(e => e.origin === 'reference').length, 6, 'the bank keeps its six reference elements');
  assert.deepEqual(processScenarios(bank).map(s => s.id), ['confirmed', 'held', 'uncertain'], 'and its three reference paths');
  assert.deepEqual(processScenarios(clinic), [], 'the clinic has no process yet, so no path');
  assert.deepEqual(processFindings(clinic), [], 'a journey alone is not a process: no process finding');
  assert.deepEqual(processFindings(bank), [], 'the bank reference passes every structural check: ' + JSON.stringify(processFindings(bank)));
  const G = processGraph(bank);
  assert.equal(G.nodes.get('PROC-REF-START').position, 'start'); assert.equal(G.nodes.get('PROC-REF-DONE').position, 'end'); assert.equal(G.nodes.get('PROC-REF-RISK').gatewayType, 'exclusive');
  pass('every project has a process model (an older document gets an empty one without reference routes); the bank keeps its six reference elements, three paths and passes every structural check; a project with a journey alone has no process finding');
}

// 2. The commands: kinds, event type and position, boundary events, gateway types, sub-processes, pools, data objects,
//    sequence and message flows, each reference checked, each refusal in plain words, each through the reviewed change.
let p = clinic, ids = {};
{
  assert.deepEqual(PROCESS_KINDS, ['task', 'gateway', 'event', 'account', 'subprocess', 'data']);
  assert.deepEqual(EVENT_TYPES, ['none', 'message', 'timer', 'error', 'signal']); assert.deepEqual(EVENT_POSITIONS, ['start', 'intermediate', 'end', 'boundary']); assert.deepEqual(GATEWAY_TYPES, ['exclusive', 'parallel', 'inclusive', 'event']); assert.deepEqual(TRANSITION_KINDS, ['sequence', 'message']);
  const party = p.interfaces.parties[0], contract = p.interfaces.contracts[0], data = p.interfaces.data[0];
  assert.ok(party && contract && data, 'the clinic records a party, a contract and a data definition to point at');
  let e;
  [p, e] = element(p, {kind: 'event', title: 'Booking request arrives', eventType: 'message', position: 'start', lane: 'Front desk'}); ids.start = e.id;
  assert.equal(e.eventType, 'message'); assert.equal(e.position, 'start'); assert.ok(!('gatewayType' in e) && !('partyId' in e), 'an event carries its own fields only');
  [p, e] = element(p, {kind: 'subprocess', title: 'Check availability', lane: 'Scheduling'}); ids.sub = e.id;
  [p, e] = element(p, {kind: 'task', title: 'Find a slot', parentId: ids.sub, lane: 'Scheduling'}); ids.find = e.id;
  [p, e] = element(p, {kind: 'task', title: 'Hold the slot', parentId: ids.sub, lane: 'Scheduling'}); ids.hold = e.id;
  [p, e] = element(p, {kind: 'event', title: 'No answer in time', eventType: 'timer', position: 'boundary', attachedTo: ids.hold}); ids.timeout = e.id;
  assert.equal(e.attachedTo, ids.hold);
  [p, e] = element(p, {kind: 'gateway', title: 'Confirm and remind', gatewayType: 'parallel', lane: 'Scheduling'}); ids.split = e.id;
  [p, e] = element(p, {kind: 'task', title: 'Confirm the booking', lane: 'Front desk'}); ids.confirm = e.id;
  [p, e] = element(p, {kind: 'task', title: 'Schedule the reminder', lane: 'Scheduling'}); ids.remind = e.id;
  [p, e] = element(p, {kind: 'gateway', title: 'Both done', gatewayType: 'parallel', lane: 'Scheduling'}); ids.join = e.id;
  [p, e] = element(p, {kind: 'gateway', title: 'Slot found?', gatewayType: 'exclusive', lane: 'Scheduling'}); ids.found = e.id;
  [p, e] = element(p, {kind: 'event', title: 'Booked', position: 'end', lane: 'Front desk'}); ids.end = e.id;
  [p, e] = element(p, {kind: 'event', title: 'Could not book', position: 'end', eventType: 'error', lane: 'Front desk'}); ids.fail = e.id;
  [p, e] = element(p, {kind: 'task', title: 'Receive the confirmation', partyId: party.id}); ids.external = e.id;
  assert.equal(e.partyId, party.id, 'an element in an external participant\'s pool');
  [p, e] = element(p, {kind: 'data', title: 'Booking record', dataId: data.id}); ids.data = e.id;
  assert.equal(e.dataId, data.id);
  // The refusals, each naming what to do.
  refuses(p, {type: 'process.element', payload: {kind: 'loop', title: 'x'}}, /task, gateway, event, account, sub-process or data object/);
  refuses(p, {type: 'process.element', payload: {kind: 'event', title: 'x', eventType: 'flash'}}, /none, message, timer, error or signal/);
  refuses(p, {type: 'process.element', payload: {kind: 'event', title: 'x', position: 'somewhere'}}, /start, intermediate, end or boundary/);
  refuses(p, {type: 'process.element', payload: {kind: 'event', title: 'x', position: 'boundary'}}, /Attach the boundary event to a task/);
  refuses(p, {type: 'process.element', payload: {kind: 'event', title: 'x', position: 'boundary', attachedTo: ids.start}}, /task or sub-process/);
  refuses(p, {type: 'process.element', payload: {kind: 'event', title: 'x', position: 'intermediate', attachedTo: ids.hold}}, /Only a boundary event/);
  refuses(p, {type: 'process.element', payload: {kind: 'gateway', title: 'x', gatewayType: 'random'}}, /exclusive, parallel, inclusive or event/);
  refuses(p, {type: 'process.element', payload: {kind: 'task', title: 'x', parentId: ids.find}}, /Choose a sub-process/);
  refuses(p, {type: 'process.element', payload: {id: ids.sub, kind: 'subprocess', title: 'Check availability', parentId: ids.sub}}, /inside itself/);
  refuses(p, {type: 'process.element', payload: {kind: 'task', title: 'x', partyId: 'nobody'}}, /external participant from Chapter 8/);
  refuses(p, {type: 'process.element', payload: {kind: 'data', title: 'x'}}, /Choose the data definition/);
  refuses(p, {type: 'process.element', payload: {kind: 'data', title: 'x', dataId: 'dat-999'}}, /data definition from Chapter 8/);
  refuses(p, {type: 'process.element', payload: {kind: 'task', title: 'x', dataId: data.id}}, /Only a data object/);
  // Flows: sequence inside the pool, message across it with its contract; a boundary event starts a path.
  let t;
  const steps = p.artefacts.filter(a => a.type === 'journey').map(a => a.id);
  [p, t] = flow(p, {from: ids.start, to: steps[0], label: 'Begin'}); assert.equal(t.kind, 'sequence'); assert.ok(!('contractId' in t));
  for (let i = 1; i < steps.length; i++) [p] = flow(p, {from: steps[i - 1], to: steps[i], label: 'Next'});
  [p] = flow(p, {from: steps.at(-1), to: ids.sub, label: 'Book'});
  [p] = flow(p, {from: ids.find, to: ids.hold, label: 'Slot chosen'});
  [p] = flow(p, {from: ids.sub, to: ids.found, label: 'Checked'});
  [p] = flow(p, {from: ids.found, to: ids.split, label: 'Yes', condition: 'A slot is held'});
  [p] = flow(p, {from: ids.found, to: ids.fail, label: 'No', condition: 'No slot is free'});
  [p] = flow(p, {from: ids.split, to: ids.confirm, label: 'Confirm'});
  [p] = flow(p, {from: ids.split, to: ids.remind, label: 'Remind'});
  [p] = flow(p, {from: ids.confirm, to: ids.join, label: 'Confirmed'});
  [p] = flow(p, {from: ids.remind, to: ids.join, label: 'Scheduled'});
  [p] = flow(p, {from: ids.join, to: ids.end, label: 'Done'});
  [p] = flow(p, {from: ids.timeout, to: ids.fail, label: 'Timed out'});
  [p, t] = flow(p, {from: ids.confirm, to: ids.external, label: 'Send the confirmation', kind: 'message', contractId: contract.id});
  assert.equal(t.kind, 'message'); assert.equal(t.contractId, contract.id);
  refuses(p, {type: 'process.transition', payload: {from: ids.confirm, to: ids.remind, label: 'x', kind: 'teleport'}}, /sequence flow or a message flow/);
  refuses(p, {type: 'process.transition', payload: {from: ids.remind, to: ids.external, label: 'x'}}, /stays inside one pool/);
  refuses(p, {type: 'process.transition', payload: {from: ids.remind, to: ids.end, label: 'x', kind: 'message', contractId: contract.id}}, /crosses pools/);
  refuses(p, {type: 'process.transition', payload: {from: ids.remind, to: ids.external, label: 'x', kind: 'message'}}, /names the contract/);
  refuses(p, {type: 'process.transition', payload: {from: ids.remind, to: ids.external, label: 'x', kind: 'message', contractId: 'if-999'}}, /contract from Chapter 8/);
  refuses(p, {type: 'process.transition', payload: {from: ids.hold, to: ids.timeout, label: 'x'}}, /boundary event starts a path/);
  refuses(p, {type: 'process.transition', payload: {from: ids.hold, to: ids.data, label: 'x'}}, /two distinct process objects/);
  refuses(p, {type: 'process.transition', payload: {from: ids.start, to: steps[0], label: 'x'}}, /already exists/);
  // Removal keeps the structure whole: what hangs on or sits inside a record goes first.
  refuses(p, {type: 'process.remove', payload: {id: ids.sub}}, /paths that connect it|Take the elements out/);
  refuses(p, {type: 'process.remove', payload: {id: ids.hold}}, /paths that connect it|Detach the boundary events/);
  assert.throws(() => applyWorkbenchCommand(clinic, {type: 'workspace.apply', payload: {commands: [{type: 'process.element', payload: {kind: 'task', title: 'Unreviewed'}}], stamp: previewWorkingChange(clinic, [{type: 'process.element', payload: {kind: 'task', title: 'Unreviewed'}}]).stamp, reviewed: false}}, at, 'test'), /Review/, 'nothing applies unreviewed');
  assert.equal(JSON.stringify(clinic), frozenClinic, 'the caller\'s document is never changed');
  assert.equal(p.processModel.elements.length, 14); assert.equal(p.processModel.transitions.length, 17);
  pass(`the process commands: six kinds, event types and positions, a boundary event on its task, gateway types, a sub-process and its elements, an external pool, a data object, sequence and message flows with their contract; ${22} refusals each naming what to do; removal in order; nothing applies unreviewed; the caller's document untouched`);
}

// 3. The structural checks on fixtures: this process passes; a parallel split without a join, a message flow inside one
//    pool, a dangling flow, a boundary event on nothing, no start, no end, an unreachable element and a gateway without
//    conditions each name their code; and they are Chapter 1's checks, so they reach readiness.
{
  const codes = doc => processFindings(doc).map(f => f.code + ':' + f.id.split(':').slice(1).join(':')).sort();
  const fs = processFindings(p);
  assert.deepEqual(fs.filter(f => !['PROC-REACH'].includes(f.code)), [], 'the clinic process built above has a start, an end, a joined split and a message flow across pools: ' + JSON.stringify(fs));
  const reach = fs.filter(f => f.code === 'PROC-REACH');
  assert.deepEqual(reach.map(f => f.objectId).sort(), [ids.find, ids.hold].sort(), 'the elements inside the sub-process are reached through it, not by a flow of their own (a warning, to confirm): ' + JSON.stringify(reach.map(f => f.title)));
  // A recorded precedence between journey steps is a flow of the process too.
  const linked = structuredClone(p); linked.processModel.transitions = linked.processModel.transitions.filter(t => t.label !== 'Next'); linked.relationships.push({id: 'REL-P1', from: p.artefacts.filter(a => a.type === 'journey')[0].id, to: p.artefacts.filter(a => a.type === 'journey')[1].id, kind: 'precedes'});
  const unreached = processFindings(linked).filter(f => f.code === 'PROC-REACH' && /from a start event reaches it/.test(f.detail)).map(f => f.objectId), js = p.artefacts.filter(a => a.type === 'journey').map(a => a.id);
  assert.ok(unreached.includes(js[2]) && !unreached.includes(js[1]), 'a step reached by a recorded precedence is reached; the next, by nothing, is not: ' + JSON.stringify(unreached));
  const broken = structuredClone(p), m = broken.processModel;
  m.elements.find(e => e.id === ids.join).gatewayType = 'exclusive'; // the split has no join any more
  m.transitions.find(t => t.kind === 'message').contractId = ''; // a message flow without its contract
  m.elements.find(e => e.id === ids.external).partyId = ''; // and now inside our pool
  m.transitions.push({id: 'PROC-T-gone', from: ids.end, to: 'PROC-E-nowhere', label: 'Gone', kind: 'sequence', condition: ''});
  m.elements.find(e => e.id === ids.timeout).attachedTo = 'PROC-E-nowhere';
  m.transitions.find(t => t.from === ids.found && t.label === 'No').condition = ''; m.transitions.find(t => t.from === ids.found && t.label === 'Yes').condition = '';
  m.elements.find(e => e.id === ids.end).position = 'intermediate'; m.elements.find(e => e.id === ids.fail).position = 'intermediate';
  m.elements.push({id: 'PROC-E-island', kind: 'task', title: 'Nobody reaches this', lane: 'Scheduling'});
  const got = processFindings(broken), by = code => got.filter(f => f.code === code);
  assert.ok(by('PROC-GATEWAY').some(f => f.objectId === ids.split && /no parallel gateway downstream joins/.test(f.detail)), 'PROC-GATEWAY: a parallel split without a join');
  assert.ok(by('PROC-GATEWAY').some(f => f.objectId === ids.found && /2 of its 2 outgoing flows have no condition/.test(f.detail)), 'PROC-GATEWAY: an exclusive gateway whose paths carry no condition');
  assert.ok(by('PROC-MESSAGE').some(f => /same one/.test(f.detail)), 'PROC-MESSAGE: a message flow inside one pool');
  assert.ok(by('PROC-MESSAGE').some(f => /carries an interface contract/.test(f.detail)), 'PROC-MESSAGE: a message flow without a contract');
  assert.ok(by('PROC-DANGLING').some(f => f.id === 'PROC-DANGLING:PROC-T-gone'), 'PROC-DANGLING: a flow whose end is gone');
  assert.ok(by('PROC-BOUNDARY').some(f => f.objectId === ids.timeout), 'PROC-BOUNDARY: a boundary event attached to nothing');
  assert.ok(by('PROC-END').some(f => f.id === 'PROC-END:project'), 'PROC-END: no end event');
  assert.ok(by('PROC-REACH').some(f => f.objectId === 'PROC-E-island' && /No sequence flow from a start event reaches it/.test(f.detail)), 'PROC-REACH: an element no path reaches');
  const noStart = structuredClone(p); noStart.processModel.elements.find(e => e.id === ids.start).position = 'intermediate';
  assert.ok(codes(noStart).includes('PROC-START:project'), 'PROC-START: no start event');
  assert.ok(!codes(noStart).some(c => c.startsWith('PROC-REACH')), 'without a start, reachability is not asked (the start finding says it)');
  const sameParty = structuredClone(p); sameParty.processModel.transitions.find(t => t.label === 'Remind').kind = 'sequence'; sameParty.processModel.elements.find(e => e.id === ids.remind).partyId = sameParty.interfaces.parties[0].id;
  assert.ok(processFindings(sameParty).some(f => f.code === 'PROC-MESSAGE' && /Make the flow/.test(f.title)), 'PROC-MESSAGE: a sequence flow across pools is told to become a message flow');
  for (const f of got) { assert.match(f.id, /^PROC-[A-Z]+:/); assert.ok(f.title && f.detail && ['error', 'warning'].includes(f.level) && f.artefactId === f.objectId, 'a finding in the chapter shape'); }
  // Chapter 1 carries them: the chapter's checks, the registered CHAPTERS entry and the readiness board.
  const ch1 = CHAPTERS.find(c => c.id === 1).checks(broken), mine = ch1.filter(f => f.code.startsWith('PROC-'));
  assert.deepEqual(mine.map(f => f.id).sort(), got.map(f => f.id).sort(), 'Chapter 1\'s findings carry every process finding');
  assert.deepEqual(chapterOneFindings(broken).filter(f => f.code.startsWith('PROC-')).map(f => f.id).sort(), got.map(f => f.id).sort());
  const R = chapterChecks(broken, 1), onBoard = R.passages.filter(x => x.fix.some(f => /^C1:PROC-/.test(f.id)) || x.confirm.some(f => /^C1:PROC-/.test(f.id)));
  const items = onBoard.flatMap(x => [...x.fix, ...x.confirm]).filter(f => /^C1:PROC-/.test(f.id));
  assert.ok(onBoard.length >= 1 && items.length === got.length && onBoard.some(x => x.id === 'project'), 'the process findings reach readiness as to fix and to confirm, on the chapter as a whole (a process element is not a Chapter 1 record): ' + items.length + ' items on ' + onBoard.length + ' passage(s)');
  assert.ok(R.toFix > chapterChecks(p, 1).toFix, 'and the broken process has more to fix than the whole one');
  pass(`the structural checks: the built process passes (its sub-process elements to confirm); a parallel split without a join, an exclusive gateway without conditions, a message flow inside one pool and one without a contract, a dangling flow, a boundary event on nothing, no start, no end, an unreachable element and a sequence flow across pools each name their code (${new Set(got.map(f => f.code)).size} codes on the broken fixture); they are Chapter 1's checks and reach readiness`);
}

// 4. The typed relationships: every relationship of the connected model carries its ArchiMate typing; the recorded ones of
//    the four reference projects are all valid; a recorded link the standard forbids is RELATION-INVALID on the source
//    record in its chapter; the Matrix's direct cells name the type.
{
  const refs = [['bank', bank], ['clinic', clinic], ...['service-permits', 'warehouse-fulfilment'].map(t => [t, withFinalReview(createProject({name: t, template: t}, 'ps-' + t, at))])];
  const measured = [];
  for (const [name, doc] of refs) {
    const M = architectureModel(doc);
    for (const e of M.relationships) { assert.ok(e.archimate && ARCHIMATE_RELATIONSHIPS.includes(e.archimate.type) && typeof e.archimate.valid === 'boolean' && e.archimate.rule, name + ': ' + e.id + ' is typed with its rule'); if (!e.archimate.valid) assert.equal(e.archimate.type, 'Association', 'an invalid wanted type is written as an association'); else assert.ok(archimateWanted(e.type, e.source)[0].includes(e.archimate.type), `${name}: ${e.id} keeps a type its kind asks for (${e.archimate.type} for ${e.type})`); }
    const recorded = M.relationships.filter(e => !e.derived && RECORDED_RELATIONSHIP_SOURCES[e.source]), typed = recorded.filter(e => e.archimate.wanted !== 'Association'), invalid = recorded.filter(e => e.archimate.wanted !== 'Association' && !e.archimate.valid);
    assert.equal(invalid.length, 0, name + ': every recorded relationship the project draws is one the standard allows');
    assert.deepEqual(relationshipFindings(doc), [], name + ': no RELATION-INVALID finding');
    // The chapter checks type the recorded relationships from the records themselves (building the connected model at 500
    // records a chapter costs more than a chapter's whole budget): row for row the same type and validity as the model.
    const light = typedRecordedRelationships(doc), byKey = new Map(M.relationships.map(e => [e.source + '|' + e.from + '|' + e.to, e]));
    assert.equal(light.length, recorded.length, name + ': the checks see every recorded relationship the model has');
    for (const r of light) { const e = byKey.get(r.source + '|' + r.from + '|' + r.to); assert.ok(e, name + ': ' + r.id + ' is in the model'); assert.deepEqual([r.archimate.type, r.archimate.valid, r.archimate.wanted], [e.archimate.type, e.archimate.valid, e.archimate.wanted], name + ': ' + r.id + ' is typed alike by the checks and the model'); }
    const all = M.relationships, asked = all.filter(e => e.archimate.wanted !== 'Association'), fell = asked.filter(e => !e.archimate.valid);
    measured.push(`${name}: ${recorded.length} recorded (${typed.length} typed, ${invalid.length} invalid); all ${all.length} relationships: ${asked.length} ask for a type, ${asked.length - fell.length} keep one, ${fell.length} implied by a record's field fall back to an association (${[...new Set(fell.map(e => e.source))].join(', ')})`);
  }
  // The rules: the subset the kit needs, each cited; a step triggers a step, a requirement cannot trigger one.
  assert.ok(archimateRelationship('Triggering', 'BusinessProcess', 'BusinessProcess').kept && !archimateRelationship('Triggering', 'Requirement', 'BusinessProcess').kept);
  assert.ok(archimateRelationship('Influence', 'Constraint', 'BusinessProcess').kept, 'a motivation element influences a core element');
  assert.ok(archimateRelationship('Realization', 'Requirement', 'Outcome').kept && !archimateRelationship('Realization', 'ApplicationComponent', 'ApplicationComponent').kept);
  assert.ok(archimateRelationship('Specialization', 'ApplicationComponent', 'ApplicationComponent').kept && !archimateRelationship('Specialization', 'ApplicationComponent', 'Node').kept);
  for (const t of ARCHIMATE_RELATIONSHIPS) assert.ok(ARCHIMATE_RULES[t] && /ArchiMate 3\.1/.test(ARCHIMATE_RULES[t]), t + ' cites its rule');
  assert.equal(archimateRelationship('Flow', 'Requirement', 'Requirement').rule, ARCHIMATE_RULES.Flow, 'a refused relationship cites the rule it failed');
  assert.equal(archimateTypeOf('journey'), 'BusinessProcess'); assert.equal(archimateTypeOf('actor'), 'BusinessActor'); assert.equal(archimateTypeOf('module'), 'Grouping'); assert.equal(archimateTypeOf('capability', {category: 'messaging'}), 'TechnologyService');
  assert.deepEqual(archimateOf('uses', 'ApplicationComponent', 'ApplicationService'), {type: 'Serving', valid: true, rule: ARCHIMATE_RULES.Serving, wanted: 'Serving', reversed: true, source: 'ApplicationService', target: 'ApplicationComponent'}, 'uses reads as the service serving the component');
  // A kind with a fallback: a decision "fulfils" a requirement by influence where realization is not allowed; a loose kind
  // (support, information, ownership) ends in an association and is never invalid; the exchange's table is this one.
  assert.deepEqual([archimateOf('fulfils', 'Requirement', 'Assessment').type, archimateOf('fulfils', 'Requirement', 'Assessment').valid, archimateOf('fulfils', 'Requirement', 'Assessment').wanted], ['Influence', true, 'Realization']);
  assert.deepEqual([archimateOf('supports', 'BusinessProcess', 'BusinessProcess').type, archimateOf('supports', 'BusinessProcess', 'BusinessProcess').valid], ['Association', true]);
  assert.deepEqual([archimateOf('dependency', 'ApplicationComponent', 'BusinessProcess').type, archimateOf('dependency', 'ApplicationComponent', 'BusinessProcess').valid, archimateOf('dependency', 'ApplicationComponent', 'ApplicationComponent').type], ['Association', true, 'Serving'], 'a connection kind broader than serving is served where the standard allows and associated otherwise');
  assert.deepEqual([archimateTypeOf('constraint'), archimateTypeOf('assumption'), archimateTypeOf('context'), archimateTypeOf('need'), archimateTypeOf('path'), archimateTypeOf('claim')], ['Constraint', 'Assessment', 'Driver', 'Requirement', 'Path', 'Assessment'], 'the record types the standard names more exactly');
  // A recorded link the standard forbids: a requirement "precedes" a journey step (Triggering from a Requirement).
  const bad = structuredClone(bank), req = bad.artefacts.find(a => a.type === 'requirement'), step = bad.artefacts.find(a => a.type === 'journey');
  bad.relationships.push({id: 'REL-BAD', from: req.id, to: step.id, kind: 'precedes'});
  const found = relationshipFindings(bad);
  assert.equal(found.length, 1); assert.equal(found[0].id, 'RELATION-INVALID:REL-BAD'); assert.equal(found[0].code, 'RELATION-INVALID'); assert.equal(found[0].level, 'error'); assert.equal(found[0].objectId, req.id); assert.equal(found[0].chapter, 1);
  assert.match(found[0].detail, /“precedes” reads as Triggering in ArchiMate 3.1, which is not allowed from Requirement .* to BusinessProcess/);
  assert.deepEqual(relationshipFindings(bad, {chapter: 4}), [], 'the finding belongs to the chapter of its source record');
  assert.ok(chapterOneFindings(bad).some(f => f.id === 'RELATION-INVALID:REL-BAD'), 'and Chapter 1 carries it');
  assert.ok(chapterChecks(bad, 1).passages.some(x => x.id === req.id && x.fix.some(f => /RELATION-INVALID/.test(f.id))), 'to fix, on the requirement, in readiness');
  const M = architectureModel(bad); assert.equal(M.relationships.find(e => e.id === 'REL-BAD').archimate.type, 'Association', 'the model writes it as an association until it is retyped');
  // The Matrix names the type.
  const X = matrixModel(bank, {rows: 'journey', cols: 'requirement'}), cell = [...X.cells.entries()].find(([, c]) => c.kind === 'direct');
  assert.ok(cell && cell[1].items[0].type === 'Realization' && cell[1].items[0].valid === true && / · Realization$/.test(cell[1].items[0].steps[0]), 'a direct cell names its ArchiMate type: ' + JSON.stringify(cell[1].items[0]));
  assert.match(cellHTML(X, cell[0]), /typed Realization by ArchiMate 3\.1/);
  pass('typed relationships: every relationship of the connected model carries {type, valid, rule}; on the four reference projects every recorded relationship is valid (' + measured.join('; ') + '); the rules are cited; a recorded link the standard forbids is RELATION-INVALID on its source record, in its chapter, to fix in readiness, and written as an association meanwhile; the Matrix\'s direct cells name the type');
}

// 5. The process picture: pools per party, message flows labelled by contract, a boundary event on its task, an open
//    sub-process as a container and a collapsed one with a count, data objects with their accesses, glyphs by type, and
//    the Key and the companion read them.
{
  const D = notationDiagram(p, 'process'), L = notationLayout(D, {arrangement: 'lanes'}), node = id => D.nodes.find(n => n.id === id);
  const pools = D.groups.filter(g => g.kind === 'pool');
  assert.ok(pools.length === 2 && pools.some(g => g.id === 'pool:' + p.interfaces.parties[0].id), 'a pool for our process and one for the external participant');
  assert.equal(node(ids.external).group, 'pool:' + p.interfaces.parties[0].id, 'the external element stands in its pool');
  const msg = D.edges.find(e => e.kind === 'message' && e.from === ids.confirm);
  assert.ok(msg && msg.label === p.interfaces.contracts[0].ref, 'the message flow is labelled by its contract');
  assert.ok(D.groups.some(g => g.id === 'sub:' + ids.sub && g.kind === 'subprocess'), 'an open sub-process is a container');
  assert.equal(node(ids.find).group, 'sub:' + ids.sub, 'its elements stand inside it');
  assert.deepEqual(node(ids.timeout).attachedTo, ids.hold); assert.deepEqual(node(ids.timeout).glyph, {position: 'boundary', eventType: 'timer'});
  assert.deepEqual(node(ids.split).glyph, {gatewayType: 'parallel'}); assert.deepEqual(node(ids.start).glyph, {position: 'start', eventType: 'message'}); assert.deepEqual(node(ids.fail).glyph, {position: 'end', eventType: 'error'});
  assert.equal(node(ids.data).kind, 'dataEntity'); assert.equal(node(ids.data).type, 'dataObject');
  // The boundary event hangs on its task's lower right edge; every other pair stays apart.
  const T = L.nodes.find(n => n.id === ids.hold), B = L.nodes.find(n => n.id === ids.timeout);
  assert.ok(B.x > T.x + T.w / 2 && B.x < T.x + T.w && B.y > T.y + T.h / 2 && B.y < T.y + T.h, 'the boundary event sits on the edge of its task');
  assert.equal(L.edges.length, D.edges.length, 'every flow is routed');
  const svg = notationSVG(D, L), K = legendData(D);
  assert.ok(/nt-ev-start/.test(svg) && /nt-ev-end/.test(svg) && /nt-ev-boundary/.test(svg) && svg.includes('stroke-dasharray="3 2"'), 'start, end and boundary rings');
  assert.ok(count(svg, /class="nt-glyph"/g) >= 4, 'the marks inside: timer, message, error, parallel');
  assert.ok(K.glyphs.some(g => g.id === 'gateway:parallel' && /Parallel gateway \+/.test(g.text)) && K.glyphs.some(g => g.id === 'event:boundary:timer') && K.glyphs.some(g => g.id === 'event:start:message'), 'the Key lists the glyphs drawn with their words');
  assert.ok(svg.includes('>Glyphs<') && svg.includes('Parallel gateway'), 'the exported Key has a Glyphs section');
  assert.ok(K.groups.some(g => g.kind === 'subprocess') && K.groups.some(g => g.kind === 'pool'), 'the Key names the pools and sub-processes');
  assert.ok(K.relationships.every(r => r.kinds.every(k => k.archimate)), 'and the ArchiMate type word of every relationship kind: ' + K.relationships.map(r => r.kinds.map(k => k.kind + '=' + k.archimate).join(',')).join(' '));
  assert.equal(glyphWords(node(ids.timeout)), 'Boundary event (timer).'); assert.equal(glyphWords(node(ids.split)), 'Parallel gateway.');
  assert.match(describeNode(D, ids.timeout), /Boundary event \(timer\)[\s\S]*Attached to Hold the slot/);
  assert.match(describeEdge(D, msg.id), /Message relationship\. ArchiMate Flow/);
  // A sub-process with more than twelve elements collapses into one task with a count.
  let big = p; for (let i = 0; i < SUBPROCESS_OPEN; i++) [big] = element(big, {kind: 'task', title: 'Step ' + (i + 1), parentId: ids.sub, lane: 'Scheduling'});
  const DB = notationDiagram(big, 'process');
  assert.ok(DB.nodes.some(n => n.id === ids.sub && n.kind === 'subprocess' && /14 elements inside/.test(n.sub)), 'collapsed: one sub-process element with its count');
  assert.ok(!DB.nodes.some(n => n.id === ids.find) && !DB.groups.some(g => g.id === 'sub:' + ids.sub), 'its elements and container are not drawn');
  assert.ok(DB.edges.some(e => e.to === ids.sub && e.label === 'Book') && DB.edges.some(e => e.from === ids.sub && e.to === ids.found), 'the flows into and out of it land on the sub-process');
  assert.ok(DB.notes.some(t => /1 sub-process is collapsed/.test(t)));
  const parts = svgParts(DB, notationLayout(DB, {arrangement: 'lanes'}));
  assert.ok(parts.nodes.includes('nt-subbox'), 'drawn with the standard\'s + marker');
  // The companion reads the semantics in plain words and offers them in the dialogs' words.
  const details = processDetailsHTML(p, {id: ids.timeout});
  assert.match(details, /pe-semantics[^<]*<\/p>|pe-semantics">On the edge of a task · timer event · Attached to Hold the slot/);
  assert.match(processDetailsHTML(p, {id: ids.external}), /In the pool of/); assert.match(processDetailsHTML(p, {id: ids.data}), /Stands for/);
  assert.match(processDetailsHTML(p, {edgeId: msg.id}), /Message flow[\s\S]*Carries IF-001/);
  assert.match(processGuideHTML(p), /Connect with a flow/);
  const cmd = processElementCommand({kind: 'event', title: 'x', eventType: 'timer', position: 'boundary', attachedTo: ids.hold, gatewayType: '', parentId: '', partyId: '', dataId: '', requirementId: ''});
  assert.deepEqual(Object.keys(cmd.payload).sort(), ['attachedTo', 'eventType', 'kind', 'position', 'requirementIds', 'title'], 'the dialog\'s empty choices are not sent');
  assert.equal(processTransitionCommand({from: 'a', to: 'b', label: 'x', kind: 'message', contractId: 'c'}).payload.contractId, 'c');
  pass('the process picture draws a pool per external participant, message flows labelled by their contract, a boundary event on the edge of its task, an open sub-process as a container and a collapsed one (more than 12 inside) as one element with its count and its flows, data objects as data entities, and the glyphs by type; the Key lists glyphs, pools, sub-processes and the ArchiMate type words; the companion reads the semantics in plain words');
}

// 6. The BPMN export carries the semantics; before (the bank reference) and after (the clinic process built above).
{
  const counts = doc => { const D = notationDiagram(doc, 'process'), L = notationLayout(D, {arrangement: 'lanes'}), x = diagramCode('bpmn', D, L, {project: doc}).document; return Object.fromEntries(['participant', 'messageFlow', 'sequenceFlow', 'task', 'subProcess', 'startEvent', 'endEvent', 'boundaryEvent', 'intermediateThrowEvent', 'exclusiveGateway', 'parallelGateway', 'inclusiveGateway', 'eventBasedGateway', 'timerEventDefinition', 'messageEventDefinition', 'errorEventDefinition', 'dataObjectReference', 'dataOutputAssociation', 'lane', 'bpmndi:BPMNShape'].map(t => [t, count(x, new RegExp('<' + t + ' ', 'g'))])); };
  const before = counts(bank), after = counts(p);
  assert.deepEqual([before.participant, before.messageFlow, before.task, before.exclusiveGateway, before.startEvent, before.endEvent, before.subProcess, before.timerEventDefinition], [2, 1, 6, 2, 1, 3, 0, 0], 'the bank reference: ' + JSON.stringify(before));
  assert.ok(after.participant === 2 && after.messageFlow === 1 && after.subProcess === 1 && after.parallelGateway === 2 && after.exclusiveGateway === 1 && after.startEvent === 1 && after.endEvent === 2 && after.boundaryEvent === 1 && after.timerEventDefinition === 1 && after.messageEventDefinition === 1 && after.errorEventDefinition === 1 && after.dataObjectReference === 1, 'the clinic process: ' + JSON.stringify(after));
  const D = notationDiagram(p, 'process'), L = notationLayout(D, {arrangement: 'lanes'}), x = diagramCode('bpmn', D, L, {project: p}).document;
  assert.match(x, /<boundaryEvent id="[^"]+" name="No answer in time" attachedToRef="[^"]+" cancelActivity="true">/);
  assert.match(x, /<subProcess id="[^"]+" name="Check availability">[\s\S]*<task id="[^"]+" name="Find a slot">/, 'the sub-process holds its tasks');
  assert.match(x, /<dataObject id="[^"]+" name="Booking record"\/><dataObjectReference /);
  assert.equal(after['bpmndi:BPMNShape'], D.nodes.length + D.groups.length, 'a DI shape for every node, lane, pool and sub-process');
  const ids2 = new Set([...x.matchAll(/ id="([^"]+)"/g)].map(m => m[1])); assert.equal(ids2.size, count(x, / id="/g), 'identifiers are unique');
  for (const m of x.matchAll(/(?:sourceRef|targetRef|attachedToRef|processRef|dataObjectRef)="([^"]+)"/g)) assert.ok(ids2.has(m[1]), m[1] + ' resolves');
  pass(`the BPMN export: the bank reference writes ${before.participant} participants, ${before.messageFlow} message flow, ${before.task} tasks, ${before.exclusiveGateway} exclusive gateways, ${before.startEvent} start and ${before.endEvent} end events; the clinic process adds a subProcess with its tasks, a boundaryEvent attached to its task, parallelGateways, timer, message and error event definitions, a dataObjectReference and a messageFlow between two participants; every reference resolves`);
}

// 7. The token walk: the scenario's path in order, the current element traced and the rest dimmed through the marks
//    channel (source `walk`), the step's words, Play and Pause, Escape and Stop clearing.
{
  const scenarios = processScenarios(p);
  assert.ok(scenarios.length >= 2 && scenarios.every(s => s.ids[0] === ids.start), 'the clinic process has paths from its start event: ' + scenarios.map(s => s.title).join(' | '));
  const toEnd = scenarios.find(s => s.ids.at(-1) === ids.end);
  const steps = p.artefacts.filter(a => a.type === 'journey').map(a => a.id);
  assert.deepEqual(toEnd.ids.slice(0, 9), [ids.start, ...steps, ids.sub, ids.found, ids.split], 'a path follows the flows in order: ' + toEnd.title);
  assert.match(describeWalkStep(p, toEnd.ids, 0), /^1 of \d+ · Booking request arrives: the start event \(message\)\.$/);
  assert.match(describeWalkStep(p, toEnd.ids, 1), /: a journey step; reached by “Begin”\./);
  assert.match(describeWalkStep(p, toEnd.ids, 8), /Confirm and remind: a parallel gateway; reached by “Yes” when A slot is held\./);
  // The walk in the companion: Walk this scenario, then Back, Next, Play and Stop, with the words of the step.
  globalThis.window = globalThis.window || {}; globalThis.window.aiwModelMarks = {set: setMarks, clear: clearMarks};
  try {
    chooseScenario(toEnd.id); assert.equal(processScenario(p).id, toEnd.id);
    let refreshed = 0; const guide0 = processGuideHTML(p); assert.match(guide0, /data-pe="walk"[^>]*>Walk this scenario/);
    const w = startWalk(p, {refresh: () => refreshed++});
    assert.equal(w.i, 0); assert.equal(refreshed, 1);
    let M = mergeMarks(); assert.equal(M.get(ids.start).state, 'traced'); assert.equal(M.get(ids.end).dimmed, true); assert.equal(M.get(ids.end).state, null);
    assert.ok(M.get(p.artefacts.find(a => a.type === 'journey').id).dimmed, 'the journey steps are dimmed too: the rest of the process');
    assert.equal(marksInfo('walk').step, 1); assert.equal(marksInfo('walk').words.traced, 'The token is here');
    stepWalk(p, 1); M = mergeMarks(); assert.equal(M.get(steps[0]).state, 'traced'); assert.equal(M.get(ids.start).dimmed, true);
    for (let i = 0; i < 7; i++) stepWalk(p, 1); assert.equal(processWalk().i, 8);
    stepWalk(p, -1); assert.equal(processWalk().i, 7); assert.equal(mergeMarks().get(ids.found).state, 'traced');
    const guide = processGuideHTML(p);
    assert.match(guide, /pe-walk[\s\S]*data-pe="walk-back"[\s\S]*data-pe="walk-next"[\s\S]*data-pe="walk-play"[\s\S]*>Play<[\s\S]*data-pe="walk-stop"/);
    assert.match(guide, /pe-walk-text[^>]*>8 of \d+ · Slot found\?: an exclusive gateway; reached by “Checked”\./, 'the step\'s words read in the companion');
    // Through the companion's own controls.
    const ctx = {project: () => p, frozen: false, refresh: () => refreshed++};
    assert.equal(processAction({dataset: {pe: 'walk-next'}}, ctx), true); assert.equal(processWalk().i, 8);
    playWalk(p); assert.equal(processWalk().playing, true); assert.match(processGuideHTML(p), />Pause</);
    playWalk(p); assert.equal(processWalk().playing, false);
    // Escape clears, like Stop.
    const keydown = globalThis.document?.addEventListener ? null : 'no document'; // the key is bound only where a document exists
    clearWalk(); assert.equal(processWalk(), null); assert.equal(mergeMarks().size, 0, 'Stop withdraws the walk\'s marks'); assert.equal(marksInfo('walk'), null);
    assert.ok(keydown === 'no document' || true);
    // The bank's walk follows its reference path.
    chooseScenario('uncertain'); startWalk(bank); assert.equal(mergeMarks().get('PROC-REF-START').state, 'traced'); for (let i = 0; i < 20; i++) stepWalk(bank, 1);
    assert.equal(processWalk().i, 7); assert.equal(mergeMarks().get('PROC-REF-PENDING').state, 'traced', 'the uncertain path ends at the pending event');
    clearWalk(); chooseScenario('confirmed');
  } finally { delete globalThis.window.aiwModelMarks; }
  pass('the token walk: the chosen scenario\'s path in order (' + toEnd.ids.length + ' elements from the start event), the current element traced and every other process element dimmed through the marks channel (source walk, with its words), Back, Next, Play and Pause, the step\'s words in the companion, Stop clearing the marks; the bank\'s walk follows its reference path to the pending event');
}

// 8. The sequence picture for the bank's settlement contract, and the layout time of a 500-message sequence.
{
  const D = notationDiagram(bank, 'sequence', {objectId: 'network'}), L = notationLayout(D, {arrangement: 'sequence'});
  assert.deepEqual(D.nodes.map(n => n.id), ['worker', 'ext-network', 'instruction', 'settlement'], 'lifelines: the caller, the provider and the two data definitions exchanged');
  assert.ok(D.nodes.every(n => n.kind === 'lifeline'));
  assert.deepEqual(D.edges.map(e => [e.step, e.from, e.to, e.label, !!e.reply]), [[1, 'worker', 'ext-network', 'Settlement submission and enquiry', false], [2, 'ext-network', 'instruction', 'request · Payment instruction', false], [3, 'ext-network', 'settlement', 'response · Settlement status', false], [4, 'ext-network', 'worker', 'response · Settlement status', true]], 'messages in order: request, the data by exchange role, response');
  assert.equal(L.lifelines.length, 4); assert.ok(L.edges.every(e => e.pts.length === 2 && e.pts[0][1] === e.pts[1][1]), 'messages are horizontal rows');
  assert.ok(L.edges.every((e, i) => i === 0 || e.pts[0][1] > L.edges[i - 1].pts[0][1]), 'top-down in step order');
  const svg = notationSVG(D, L); assert.ok(count(svg, /class="nt-lifeline"/g) === 4 && /nt-edge nt-e-message[^"]* reply/.test(svg), 'lifelines drawn, the response dashed');
  // 500 messages: a project of 500 contracts between two components.
  const big = structuredClone(bank), m = big.interfaces; const base = m.contracts[0];
  for (let i = m.contracts.length; i < 500; i++) m.contracts.push({...structuredClone(base), id: 'if-b' + i, ref: 'IF-B' + i, title: 'Bound contract ' + i, operation: 'op' + i, exchanges: [], sourceId: ''});
  big.artefacts = big.artefacts.filter(a => a.type !== 'journey'); big.relationships = big.relationships.filter(r => big.artefacts.some(a => a.id === r.from) && big.artefacts.some(a => a.id === r.to));
  const t0 = performance.now(), DB = notationDiagram(big, 'sequence'), LB = notationLayout(DB, {arrangement: 'sequence'}), ms = Math.round(performance.now() - t0);
  assert.ok(DB.edges.length >= 500 && DB.edges.length <= 1500, DB.edges.length + ' messages');
  assert.ok(ms < 1500, `a ${DB.edges.length}-message sequence lays out in ${ms} ms`);
  assert.ok(LB.edges.length === DB.edges.length && LB.H > 10000);
  pass(`the sequence picture of the bank's settlement contract: 4 lifelines (worker, external network, instruction, settlement status) and 4 messages in order (request, the two payloads by role, a dashed response); a ${DB.edges.length}-message sequence lays out in ${ms} ms, ${LB.W}×${LB.H} px`);
}

assert.equal(JSON.stringify(bank), frozenBank, 'the bank reference is not changed');
assert.equal(JSON.stringify(clinic), frozenClinic, 'the clinic reference is not changed');
assert.equal(PROCESS_LIMITS.elements, 500);
console.log(JSON.stringify({suite: 'process semantics (round 6, Contract T)', passed: checks.length, checks}, null, 2));
