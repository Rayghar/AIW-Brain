// Round 12 (G-32, DM-09) and the round's migrations on documents the previous release wrote.
//
// 1. Order independence: a responsibility or a component saved before a driver that names it is not "source changed"
//    by that driver's arrival, whichever order the two are saved in; re-saving a component, a responsibility, a decision
//    or a driver unchanged leaves it as stored, so the Chapter 4 to 7 records that read it stay current.
// 2. Migrations are pure readings: on the documents rc.10.73.16 wrote (evaluation/legacy-readings.json.br) every driver
//    reads as a quality driver QDn with its Critical, Important or Supporting read as High, Medium or Low; an imported
//    requirement's priority basis reads as its source band; a decision's category reads as not stated; a Chapter 4
//    connection REL-nnn reads as LC-nnn. Reading writes nothing, and saving any record unchanged leaves it byte for byte.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {seedProject, applyCommand, priorityBasisOf, journeysOf} from './public/requirements-domain.js';
import {applyQualityCommand, driverKind, driverCode, driverCodes, driverPriority, exportQualityMarkdown, sourceChanged} from './public/quality-domain.js';
import {applyDecisionCommand, decisionSourceChanged, decisionCategory, exportDecisionsMarkdown} from './public/decisions-domain.js';
import {applyLogicalCommand, logicalSourceChanged, connectionCode, exportLogicalMarkdown} from './public/logical-domain.js';
import {withRealisation, applyRealisationCommand, componentSourceChanged, components, exportRealisationMarkdown} from './public/realisation-domain.js';
import {withTechnology, technologyFindings} from './public/technology-domain.js';
import {withTechnologyRealisation, technologyRealisationFindings} from './public/technology-realisation-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {arsDocument} from './public/ars-document.js';
import {convert} from './public/priority-scale.js';
import {requirementGroups} from './public/requirement-groups.js';

const pass = m => console.log('PASS ' + m);
const at = '2026-10-08T09:00:00.000Z', sig = v => JSON.stringify(v);
const ch2 = (p, payload) => applyQualityCommand(p, {type: 'quality.driver', payload}, at);
const ch3 = (p, payload) => applyDecisionCommand(p, {type: 'decision.save', payload}, at);
const ch4 = (p, payload) => applyLogicalCommand(p, {type: 'logical.responsibility', payload}, at);
const ch5 = (p, payload) => applyRealisationCommand(p, {type: 'realisation.component', payload}, at);
const base = withTechnologyRealisation(withTechnology(withRealisation(seedProject())));
const req = base.artefacts.find(a => a.type === 'requirement').id;
const responsibility = {title: 'Reconcile the day', purpose: 'Matches the ledger to the bank.', boundary: 'Daily reconciliation.', owner: 'Operations', source: 'Brief', requirementIds: [req]};
const driver = rid => ({kind: 'quality', category: 'recoverability', title: 'Reconcile before the cut-off', responsibilityIds: [rid], stimulus: 'The day closes.', response: 'Reconciled.', metric: 'Minutes', operator: 'At most', targetValue: '30', unit: 'minutes', window: 'Each day', measurement: 'Timed by the job.'});

// 1a. A responsibility saved before the driver that names it, then the other order: neither is a changed source.
{
  let p = ch4(base, responsibility).document; const rid = p.logical.responsibilities.at(-1).id;
  p = ch2(p, driver(rid)).document; const did = p.quality.drivers.at(-1).id;
  const r = p.logical.responsibilities.find(x => x.id === rid);
  assert.equal(logicalSourceChanged(p, r), false, 'responsibility first, then the driver: not a changed source');
  // A responsibility kept from before round 12 (no driver ids kept) is judged as it was: the new driver reads as a change.
  const before12 = {...r}; delete before12.sourceDriverIds; assert.equal(logicalSourceChanged(p, before12), true, 'a reading taken before round 12 is judged as it was');
  // The other order: the driver first (naming a responsibility that the save then creates is not possible), so a
  // driver that names an existing responsibility is saved, then that responsibility is saved: also not changed.
  let o = ch4(base, responsibility).document; const rid2 = o.logical.responsibilities.at(-1).id;
  o = ch2(o, driver(rid2)).document; o = ch4(o, {id: rid2, purpose: 'Matches the ledger to the bank, daily.'}).document;
  assert.equal(logicalSourceChanged(o, o.logical.responsibilities.find(x => x.id === rid2)), false, 'driver first, then the responsibility: not a changed source');
  // Once the driver bears on the saved responsibility, a change to it is a changed source.
  o = ch2(o, {id: o.quality.drivers.at(-1).id, targetValue: '20'}).document;
  assert.equal(logicalSourceChanged(o, o.logical.responsibilities.find(x => x.id === rid2)), true, 'a change to a driver it was saved with is a changed source');
  // A component realising the responsibility: the same, whichever order.
  let c = ch5(p, {title: 'Reconciler', kind: 'worker', purpose: 'Runs the match.', boundary: 'Matching.', owner: 'Ops', inputs: 'Files', outputs: 'Breaks', rationale: 'Needed.', source: 'Brief', technologyNeeds: 'Batch compute.', allocations: [{logicalId: rid, scope: 'All of it.', role: 'realises'}]}).document;
  const cid = components(c).at(-1).id;
  c = ch2(c, {...driver(rid), title: 'A second driver on it'}).document;
  assert.equal(componentSourceChanged(c, components(c).find(x => x.id === cid)), false, 'a component saved before a driver that names its responsibility is not changed by it');
  assert.ok(did);
  pass('a responsibility or a component saved before the driver that names it is not a changed source, in either order; a driver it was saved with that then changes is one; a reading kept from before round 12 is judged as before');
}

// 1b. Unchanged saves leave records as stored: Chapters 4 to 7 stay current.
{
  const p = base, comp = components(p)[0];
  const t6 = sig(technologyFindings(p)), t7 = sig(technologyRealisationFindings(p));
  // As the Specification and the canvas send it: the stored fields, the allocations as {logicalId, scope}.
  const payload = {...comp, allocations: p.logical.mappings.filter(m => m.physicalId === comp.id).map(m => ({logicalId: m.logicalId, scope: m.scope}))};
  for (const sent of [payload, {id: comp.id}, {id: comp.id, title: comp.title}]) {
    const r = applyRealisationCommand(p, {type: 'realisation.component', payload: sent}, at).document;
    assert.equal(sig(components(r).find(x => x.id === comp.id)), sig(comp), 'the component is left as stored');
    assert.equal(r.realisation.version, p.realisation.version, 'its chapter keeps its version');
    assert.equal(sig(r.logical.mappings), sig(p.logical.mappings), 'its allocations are left as stored');
    assert.equal(sig(technologyFindings(r)), t6, 'Chapter 6 reads nothing changed'); assert.equal(sig(technologyRealisationFindings(r)), t7, 'Chapter 7 reads nothing changed');
  }
  const lr = p.logical.responsibilities[0], d = p.decisions.records[0], q = p.quality.drivers[0];
  assert.equal(sig(ch4(p, {id: lr.id}).document.logical), sig(p.logical), 'a responsibility saved unchanged is left as stored');
  if (!decisionSourceChanged(p, d)) assert.equal(sig(ch3(p, {id: d.id}).document.decisions), sig(p.decisions), 'a decision saved unchanged is left as stored');
  assert.equal(sig(ch2(p, {id: q.id}).document.quality), sig(p.quality), 'a driver saved unchanged is left as stored');
  pass('re-saving a component unchanged (whole, by its id alone, or with its title) leaves it, its allocations and its chapter as stored, and Chapters 6 and 7 read nothing changed; a responsibility, a decision and a driver saved unchanged are left as stored');
}

// 2. The migrations, proven on the documents rc.10.73.16 wrote.
{
  const fixture = JSON.parse(brotliDecompressSync(readFileSync('evaluation/legacy-readings.json.br')).toString('utf8'));
  assert.equal(fixture.schema, 'aiw.legacy-readings-fixture.v1');
  let drivers = 0, saved = 0;
  for (const state of fixture.states.filter(s => s.document)) {
    const doc = withFinalReview(structuredClone(state.document)), before = sig(doc);
    // Every driver: a quality driver, QD and its id's number, its old word read on the new scale; nothing is stored for it.
    for (const d of doc.quality.drivers) {
      drivers++;
      assert.ok(!('kind' in d) && !('code' in d), state.name + ': ' + d.id + ' stores no kind or code');
      assert.equal(driverKind(d), 'quality'); assert.equal(driverCode(doc, d), 'QD' + Number(d.id.slice(3)));
      assert.equal(driverPriority(d), ['High', 'Medium', 'Low', ''].includes(d.priority) ? d.priority : convert('driver-legacy', d.priority, 'driver'));
    }
    assert.equal(new Set([...driverCodes(doc).values()]).size, doc.quality.drivers.length, state.name + ': every driver has a code of its own');
    for (const a of doc.artefacts.filter(a => a.type === 'requirement')) assert.equal(priorityBasisOf(a), a.priority && a.provenance ? 'source band' : '');
    for (const x of doc.decisions.records) assert.equal(decisionCategory(x), '', state.name + ': a decision recorded before reads its category as not stated');
    for (const e of doc.logical.connections) assert.equal(connectionCode(e), e.id.startsWith('REL-') ? 'LC-' + e.id.slice(4) : e.id);
    requirementGroups(doc); journeysOf(doc); exportQualityMarkdown(doc); exportDecisionsMarkdown(doc); exportLogicalMarkdown(doc); exportRealisationMarkdown(doc); arsDocument(doc);
    assert.equal(sig(doc), before, state.name + ': reading writes nothing');
    // Saving any record unchanged leaves it byte for byte, and its chapter keeps its version.
    // A record whose sources changed is saved to read them again: that is a change, so those are left out here.
    for (const d of doc.quality.drivers.filter(d => !sourceChanged(doc, d))) { const r = ch2(doc, {id: d.id}).document; assert.equal(sig(r.quality), sig(doc.quality), state.name + ': ' + d.id + ' saved unchanged'); saved++; }
    for (const x of doc.decisions.records.filter(x => !decisionSourceChanged(doc, x))) { const r = ch3(doc, {id: x.id}).document; assert.equal(sig(r.decisions), sig(doc.decisions), state.name + ': ' + x.id + ' saved unchanged'); saved++; }
    for (const x of doc.logical.responsibilities.filter(x => !logicalSourceChanged(doc, x))) { const r = ch4(doc, {id: x.id}).document; assert.equal(sig(r.logical), sig(doc.logical), state.name + ': ' + x.id + ' saved unchanged'); saved++; }
    for (const x of components(doc).filter(x => !componentSourceChanged(doc, x))) { const r = ch5(doc, {id: x.id}).document; assert.equal(sig(r.realisation), sig(doc.realisation), state.name + ': ' + x.id + ' saved unchanged'); saved++; }
    for (const a of doc.artefacts) { const r = applyCommand(doc, {type: 'artefact', payload: {id: a.id}}, at).document; assert.equal(r.contentVersion, doc.contentVersion, state.name + ': ' + a.id + ' saved unchanged'); assert.equal(sig(r.artefacts), sig(doc.artefacts)); saved++; }
  }
  pass(`on the documents rc.10.73.16 wrote (${fixture.states.filter(s => s.document).length} states, ${drivers} drivers): every driver reads as quality, QDn, with its old priority word read as High, Medium or Low; imported requirements read their basis as the source band; decisions read their category as not stated; REL connections read as LC; reading writes nothing; ${saved} records saved unchanged are left byte for byte`);
}
