// Round 12 (D-02, DM-01, DM-07, G-31): Chapter 2 is one driver register. A driver has a kind (business, functional,
// quality, constraint, operational, data, technology evolution, business continuity), a description and an impact, a
// stored code per kind (BD1, FD1, QD1, C1, OD1, DD1, TE1, BC1) that is never renumbered or reused, and a priority of
// High, Medium, Low or not stated with its basis. A driver recorded before round 12 reads as a quality driver with the
// code QD and its id's number, and its Critical, Important or Supporting as High, Medium or Low, without anything being
// written. The quality readers (the utility tree, the trade-off weights, the ARS) read quality drivers only; an open
// window or verification does not make a target measurable. Synthetic and reference-journey content only.
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {applyRecordCommand} from './public/canonical-command.js';
import {applyRequirementsCommand} from './public/requirement-commands.js';
import {withQuality, applyQualityCommand, DRIVER_KINDS, driverKind, driverPriority, driverCode, driverCodes, driversByKind, qualityDrivers, qualityFindings, targetIsMeasurable, exportQualityMarkdown, orderedDrivers} from './public/quality-domain.js';
import {arsDocument, arsMarkdown} from './public/ars-document.js';
import {reasoningSource} from './public/design-reasoning.js';
import {weightOf} from './public/decision-reading.js';
import {utilityModel} from './public/utility-model.js';
import {convert, sddPriority} from './public/priority-scale.js';

const pass = m => console.log('PASS ' + m);
const q = (p, type, payload) => applyQualityCommand(p, {type: 'quality.' + type, payload}, '2026-10-08T09:00:00.000Z').document;
const qr = (p, type, payload) => applyQualityCommand(p, {type: 'quality.' + type, payload}, '2026-10-08T09:00:00.000Z');
const refuses = (fn, re) => assert.throws(fn, e => re.test(e.message), 'refused with ' + re);
const last = p => p.quality.drivers.at(-1);
const sig = v => JSON.stringify(v);

let p = withQuality(seedProject());
const legacy = structuredClone(p.quality.drivers);
const req = p.artefacts.find(a => a.type === 'requirement').id, outcome = p.artefacts.find(a => a.type === 'outcome').id, constraint = p.artefacts.find(a => a.type === 'constraint').id;

// 1. A driver recorded before round 12 is a quality driver, QD and its id's number, with its old priority read on the new scale.
{
  assert.ok(legacy.every(d => !('kind' in d) && !('code' in d)), 'the reference drivers store no kind and no code');
  assert.deepEqual(legacy.map(d => driverKind(d)), legacy.map(() => 'quality'));
  assert.deepEqual(legacy.map(d => driverCode(p, d)), legacy.map(d => 'QD' + Number(d.id.slice(3))));
  for (const d of legacy) assert.equal(driverPriority(d), convert('driver-legacy', d.priority, 'driver') || d.priority, d.id + ' reads its priority on the High, Medium, Low scale');
  assert.ok(legacy.some(d => ['Critical', 'Important', 'Supporting'].includes(d.priority)), 'the reference holds the old words');
  const before = sig(p); driverCodes(p); exportQualityMarkdown(p); arsDocument(p); assert.equal(sig(p), before, 'reading writes nothing');
  // Saved again unchanged, a driver is left exactly as stored: no kind, code, priority word or empty field is written.
  const d = legacy[0], r = qr(p, 'driver', {...d});
  assert.equal(sig(r.document.quality.drivers[0]), sig(d), 'an unchanged save leaves the driver as it was stored');
  assert.equal(r.document.quality.version, p.quality.version, 'and the chapter keeps its version');
  // Changing its title keeps the old priority word (its level did not change) and writes no kind or code.
  const t = q(p, 'driver', {id: d.id, title: d.title + ' (reworded)'}).quality.drivers[0];
  assert.equal(t.priority, d.priority); assert.ok(!('kind' in t) && !('code' in t)); assert.equal(t.stimulus, d.stimulus, 'a field left out keeps its value');
  pass('a driver recorded before round 12 reads as a quality driver QDn with Critical, Important and Supporting as High, Medium and Low; reading writes nothing, and an unchanged save keeps it byte for byte');
}

// 2. Eight kinds, each with its own codes, stored at creation, never renumbered or reused.
{
  const group = applyRequirementsCommand(p, {type: 'requirements.group', payload: {title: 'Payments', kind: 'theme', memberIds: [req]}}, '2026-10-08', 'tester').document;
  let r = group; const gid = r.requirementGroups.records.at(-1).id;
  const make = (kind, extra = {}) => { r = q(r, 'driver', {kind, title: 'A ' + kind + ' driver', description: 'What it says.', impact: 'What it changes in the design.', ...extra}); return last(r); };
  const bd1 = make('business', {outcomeIds: [outcome]}), bd2 = make('business', {outcomeIds: [outcome]});
  const fd1 = make('functional', {requirementGroupIds: [gid]}), c1 = make('constraint', {constraintIds: [constraint]});
  const od1 = make('operational'), dd1 = make('data'), te1 = make('technology-evolution'), bc1 = make('business-continuity');
  const qd = make('quality', {category: 'performance', stimulus: 'Load arrives.', response: 'It answers.', metric: 'Latency', operator: 'At most', targetValue: '2', unit: 'seconds', window: 'Peak hour', measurement: 'Measure at the gateway.'});
  assert.deepEqual([bd1, bd2, fd1, c1, od1, dd1, te1, bc1, qd].map(d => d.code), ['BD1', 'BD2', 'FD1', 'C1', 'OD1', 'DD1', 'TE1', 'BC1', 'QD' + Number(qd.id.slice(3))]);
  assert.deepEqual(DRIVER_KINDS.map(k => k.prefix), ['BD', 'FD', 'QD', 'C', 'OD', 'DD', 'TE', 'BC']);
  assert.ok([bd1, fd1, c1].every(d => d.priority === ''), 'a new driver states no priority until someone does');
  assert.equal(fd1.requirementGroupIds[0], gid); assert.equal(c1.constraintIds[0], constraint); assert.equal(bd1.outcomeIds[0], outcome);
  // A retired driver's code is never given again; the others keep theirs. (Round 12, GR-GOV-24: a driver leaves the
  // design through the one retire path, restorable with its code; deleting it outright is refused.)
  assert.throws(() => q(r, 'delete', {id: bd1.id}), /leaves the design through Retire/);
  r = applyRecordCommand(r, {type: 'record.retire', payload: {ids: [bd1.id], chapter: 2, reason: 'Replaced by a later business driver.'}}, '2026-10-08T09:00:00.000Z', 'tester').document; const bd3 = make('business', {outcomeIds: [outcome]});
  assert.equal(bd3.code, 'BD3'); assert.equal(r.quality.drivers.find(d => d.id === bd2.id).code, 'BD2');
  // A driver that changes kind takes the next code of its new kind.
  r = q(r, 'driver', {id: od1.id, kind: 'data'}); assert.equal(r.quality.drivers.find(d => d.id === od1.id).code, 'DD2');
  // The register is read by kind; every surface names a driver by its code.
  assert.deepEqual(driversByKind(r).map(x => x.kind.id), ['business', 'functional', 'quality', 'constraint', 'data', 'technology-evolution', 'business-continuity']);
  const md = exportQualityMarkdown(r);
  assert.match(md, /## Chapter 2 — Architectural drivers/); assert.match(md, /### BD2 · A business driver/); assert.match(md, /### FD1 · A functional driver[\s\S]*Kind: Functional/);
  assert.ok(qualityDrivers(r).every(d => driverKind(d) === 'quality') && qualityDrivers(r).length === legacy.length + 1);
  // Kinds ask for what they stand for: a business driver for its outcomes, a functional one for what it covers, a constraint for its constraint.
  let w = q(r, 'driver', {kind: 'functional', title: 'Covers nothing yet'}); const lone = last(w), fs = qualityFindings(w).filter(f => f.driverId === lone.id || f.objectId === lone.id || f.id?.endsWith(lone.id));
  assert.ok(fs.some(f => f.code === 'requirements'), 'a functional driver with no requirement or group is a finding');
  assert.ok(!qualityFindings(r).some(f => f.code === 'scenario' && [bd2.id, fd1.id, c1.id].includes(f.driverId)), 'a driver of another kind needs no quality scenario');
  pass('eight kinds with their codes BD1, FD1, C1, OD1, DD1, TE1, BC1 and QDn, stored at creation; a deleted code is not given again, a change of kind takes the next code of the new kind; the register reads by kind and prints each driver by its code; each kind asks for what it stands for');
}

// 3. Priority: High, Medium, Low or not stated, with its basis; an old word sent by an older caller reads as its level.
{
  let r = q(p, 'driver', {kind: 'quality', category: 'availability', title: 'Stays up', priority: 'Important'});
  assert.equal(last(r).priority, 'Medium', 'Important is stored as Medium');
  r = q(r, 'driver', {id: last(r).id, priority: 'High', priorityBasis: 'person'}); assert.deepEqual([last(r).priority, last(r).priorityBasis], ['High', 'person']);
  r = q(r, 'driver', {id: last(r).id, priority: null}); assert.equal(last(r).priority, '', 'null clears the priority to not stated');
  refuses(() => q(r, 'driver', {id: last(r).id, priority: 'Urgent'}), /High, Medium, Low or not stated/);
  r = q(r, 'driver', {id: last(r).id, priority: 'Must'}); assert.equal(last(r).priority, 'High', 'a requirement-scale word is stored at its level');
  r = q(r, 'driver', {id: last(r).id, priority: 'Could'}); assert.equal(last(r).priority, 'Low');
  assert.equal(weightOf(''), 0, 'a driver nobody gave a priority weighs nothing');
  assert.deepEqual(['Critical', 'High', 'Medium', 'Supporting', ''].map(v => sddPriority('driver-legacy', v) === 'not stated' ? sddPriority('driver', v) : sddPriority('driver-legacy', v)), ['High', 'High', 'Medium', 'Low', 'not stated']);
  pass('a priority is High, Medium, Low or not stated (null clears it), with its basis; Important sent by an older caller is stored as Medium and Must / Could as High / Low (one scale); an unknown word is refused; a driver with no stated priority weighs nothing in the trade-offs');
}

// 4. A save patches the driver; links are checked by name and refused past their bound, never cut.
{
  const d = legacy[0];
  let r = q(p, 'driver', {id: d.id, requirementIds: {add: [p.artefacts.filter(a => a.type === 'requirement')[1].id]}});
  assert.equal(r.quality.drivers[0].requirementIds.length, d.requirementIds.length + 1, '{add} adds a link');
  r = q(r, 'driver', {id: d.id, requirementIds: {remove: [d.requirementIds[0]]}}); assert.ok(!r.quality.drivers[0].requirementIds.includes(d.requirementIds[0]), '{remove} removes one');
  r = q(r, 'driver', {id: d.id, stimulus: null}); assert.equal(r.quality.drivers[0].stimulus, '', 'null clears a field');
  refuses(() => q(p, 'driver', {id: d.id, requirementIds: ['REQ-999']}), /Choose existing Chapter 1 requirements: REQ-999 is not in this project/);
  refuses(() => q(p, 'driver', {id: d.id, title: 'x'.repeat(161)}), /holds at most 160 characters; this one has 161/);
  pass('a save that leaves a field out keeps it, null clears it, {add} and {remove} patch a link; an unknown id is refused by name and a title past 160 characters is refused, not cut');
}

// 5. The quality readers read quality drivers only; the ARS names the others in its scope; an open target is not measurable.
{
  let r = q(p, 'driver', {kind: 'business', title: 'Lower the cost of a payment', outcomeIds: [outcome], priority: 'High'});
  const biz = last(r), R = reasoningSource(r), U = utilityModel(R);
  assert.ok(!U.D.has(biz.id) && [...U.D.keys()].length === qualityDrivers(r).length, 'the utility tree holds the quality drivers only');
  const A = arsDocument(r);
  assert.ok(!A.requirements.some(x => x.id === biz.id) && A.requirements.length === qualityDrivers(r).length, 'the ARS lists the quality drivers only');
  assert.match(arsMarkdown(r), /The driver register also holds business driver BD1\./);
  // G-31: an open question in the window or the verification leaves the target not measurable.
  const full = {kind: 'quality', category: 'performance', title: 'Answers fast', stimulus: 'A request arrives.', response: 'It answers.', metric: 'Latency', operator: 'At most', targetValue: '2', unit: 'seconds', window: 'Peak hour', measurement: 'Measure at the gateway.'};
  r = q(p, 'driver', full); assert.ok(targetIsMeasurable(last(r)), 'a stated target is measurable');
  r = q(p, 'driver', {...full, window: 'Open question: which hour is the peak?'}); assert.ok(!targetIsMeasurable(last(r)), 'an open question as the window is not measurable');
  r = q(p, 'driver', {...full, measurement: '', open: {measurement: {state: 'open-question', question: 'Who measures it?'}}});
  assert.ok(!targetIsMeasurable(last(r)), 'an open verification is not measurable');
  assert.ok(qualityFindings(r).some(f => f.code === 'open-question' && f.detail.includes('Who measures it?')), 'the open question is a finding of its own');
  pass('the utility tree and the ARS read quality drivers only and the ARS names the others in its scope; a window or verification that is an open question leaves the target not measurable (G-31) and is a finding');
}

// 6. Ordering reads priority through the one scale: High before Medium before Low before not stated.
{
  let r = p; for (const priority of ['', 'Low', 'High', 'Medium']) r = q(r, 'driver', {kind: 'operational', title: 'Run ' + (priority || 'unstated'), priority});
  const ops = orderedDrivers(r).filter(d => driverKind(d) === 'operational').map(d => d.priority);
  assert.deepEqual(ops, ['High', 'Medium', 'Low', '']);
  pass('drivers are ordered High, Medium, Low, then not stated');
}
