// Actual saved relationships, currentness and exports behind the native dossier.
// Synthetic records exercise decisions; they are not product recommendations.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {referenceProject} from './notation-fixtures.mjs';
import {specificationReading, specReviewItems} from './public/specification-reading.js';
import {componentSheetHTML} from './public/component-spec-view.js';
import {componentSpecDocument} from './public/component-spec-document.js';
import {applyInterfacesCommand} from './public/interfaces-domain.js';
import {optionAssessmentBasis} from './public/technology-realisation-domain.js';
import {architectureObligationsFor} from './public/architecture-obligations.js';
import {acceptedObligationFixture, reviewCommand, linkedAction, verificationPayload} from './architecture-obligation-fixtures.mjs';

const window = new Window(), clone = structuredClone, checks = [];
const pass = text => checks.push(text);
const inspect = (p, id = 'api-pod', options) => {
  const before = JSON.stringify(p), root = window.document.createElement('main');
  root.innerHTML = componentSheetHTML(p, id, options);
  assert.equal(JSON.stringify(p), before, 'Reading and presenting a dossier cannot alter any canonical model record.');
  return root;
};
const row = (root, key, id) => {
  const found = root.querySelector(`[data-spec-${key}="${id}"]`);
  assert.ok(found, `${key} ${id} is present`);return found;
};
const ic = (p, type, payload) => applyInterfacesCommand(p, {type: 'interfaces.' + type, payload}).document;
const p = referenceProject(), original = JSON.stringify(p);

// A driver comes from an actual allocation / requirement / explicit scope. A
// decision mentioning a different carried driver does not justify every driver.
{
  const q = clone(p), component = q.realisation.components.find(c => c.id === 'api-pod');
  const decision = q.decisions.records.find(d => d.id === 'ADR-001'), selected = decision.alternatives[0];
  decision.selectedAlternativeId = selected.id;
  decision.rationale = 'Synthetic choice: bound the caller wait while retaining the authoritative result.';
  selected.assessments['QD-002'] = {effect: 'tension', reason: 'Synthetic bounded wait costs an explicit unresolved response.', evidence: 'fixture://assessment/<not-runtime-proof>'};
  selected.assessments['QD-unrelated'] = {effect: 'supports', reason: 'UNRELATED ASSESSMENT MUST NOT LEAK', evidence: 'fixture://unrelated'};
  q.quality.drivers.push({...clone(q.quality.drivers[0]), id: 'QD-unrelated', code: 'UNRELATED', title: 'Unrelated component driver', componentIds: ['risk-engine'], responsibilityIds: [], requirementIds: [], requirementGroupIds: []});
  component.properties = [{concern: 'QD-002', statement: 'Exact driver property', mechanism: 'Caller deadline boundary', source: 'fixture://explicit-driver'}, {concern: q.quality.drivers.find(d => d.id === 'QD-002').category, statement: 'Shared quality concern only', mechanism: 'Bounded admission', source: ''}];
  const reading = specificationReading(q, component.id), root = inspect(q);
  assert.ok(reading.drivers.find(d => d.record.id === 'QD-002').paths.some(path => path.kind === 'responsibility-mapping' && path.via === 'api'));
  assert.ok(!reading.drivers.some(d => d.record.id === 'QD-unrelated'));
  assert.ok(reading.effects.every(effect => effect.decision.record.driverIds.includes(effect.driver.id)));
  assert.equal(root.querySelector('[data-spec-driver="QD-unrelated"]'), null);
  assert.doesNotMatch(root.textContent, /UNRELATED ASSESSMENT MUST NOT LEAK/);
  // rc40 W3: the Design basis row carries the driver's path; the Qualities row its target, mechanisms and decision effects.
  const driver = row(root, 'driver', 'QD-002'), quality = row(root, 'quality', 'QD-002');
  assert.match(driver.textContent, /Allocated through.*LR-001/s);
  assert.ok(driver.querySelector('[data-spec-path] a[href*="chapter=4"][href*="object=api"]'), 'the path names the responsibility it reaches through, as a link');
  assert.match(quality.textContent, /Property explicitly names this driver/);
  assert.match(quality.textContent, /Property names the same quality concern/);
  assert.match(quality.textContent, /Exact driver property[\s\S]*Caller deadline boundary/);
  assert.ok(quality.contains(row(root, 'effect', 'QD-002')), 'the decision effect sits on the driver’s quality row');
  assert.match(row(root, 'effect', 'QD-002').textContent, /Creates tension · assessment/);
  assert.match(row(root, 'effect', 'QD-002').innerHTML, /&lt;not-runtime-proof&gt;/);
  assert.equal(specReviewItems(reading.C, reading)[0].id, 'tradeoff');
  assert.match(root.querySelector('[data-spec-question="tradeoff"]').textContent, /Review the selected tradeoff/, 'the first attention item is the tradeoff');
  assert.match(row(root, 'choice', decision.id).textContent, /Synthetic choice/);
  assert.match(root.querySelector('[data-spec-field="realises"]').textContent, /LR-001.*role not stated/s);
  assert.equal(root.querySelector('[data-spec-field="realises"] [data-value-state="open"]')?.textContent.includes('LR-001'), true, 'an allocation without a role is an open value');
  const otherDriver = reading.drivers.find(d => !decision.driverIds.includes(d.record.id));
  if (otherDriver) assert.equal(row(root, 'driver', otherDriver.record.id).querySelector('[href*="decision=ADR-001"]'), null);
  const changed = clone(q);changed.quality.drivers.find(d => d.id === 'QD-002').targetValue = '777';
  const later = specificationReading(changed, component.id);
  assert.equal(later.decisions.find(d => d.record.id === decision.id).sourceChanged, true);
  assert.match(row(inspect(changed), 'choice', decision.id).textContent, /Source changed/);
  assert.ok(specReviewItems(later.C, later).some(item => item.id === 'decision-source'));
  const hard = clone(q), constraint = {...clone(hard.quality.drivers[0]), id: 'AD-hard', kind: 'constraint', title: 'Synthetic residency constraint', componentIds: ['api-pod'], responsibilityIds: [], requirementIds: [], constraintIds: [], confirmed: true};
  hard.quality.drivers.push(constraint);
  const hardDecision = hard.decisions.records.find(d => d.id === decision.id);hardDecision.driverIds.push(constraint.id);
  hardDecision.alternatives.find(a => a.id === selected.id).assessments[constraint.id] = {effect: 'violates', reason: 'Synthetic option places the copy outside the permitted location.', evidence: 'fixture://residency'};
  const conflict = specificationReading(hard, component.id);
  assert.equal(conflict.effects.find(effect => effect.driver.id === constraint.id).hardViolation, true);
  assert.equal(specReviewItems(conflict.C, conflict)[0].title, 'Resolve the selected hard-constraint conflict');
  pass('Driver paths, exact decision assessments and mechanisms retain their separate meanings; unrelated drivers stay out and changed driver support is exposed.');
}

// Product comparisons never promote productOf's first-candidate fallback to a
// selection. Only assessment IDs carried by this component and capability join.
{
  const root = inspect(p), reading = specificationReading(p, 'api-pod');
  assert.ok(reading.products.length && reading.products.every(product => !product.selected));
  for (const product of reading.products) assert.match(row(root, 'product', product.record.id).querySelector('header').textContent, /Product choice is open.*No product selected/s);
  const q = clone(p), r = q.technologyRealisation.records.find(r => r.id === reading.products[0].record.id), option = r.options[0];
  r.selectedOptionId = option.id;r.rationale = 'Synthetic choice with owned operating constraints.';
  option.replicaCount = 2;
  option.assessments['QD-002'] = {effect: 'tension', reason: 'Two synthetic copies retain an operating cost.', evidence: 'fixture://capacity-check'};
  option.assessments['not-a-driver'] = {effect: 'supports', reason: 'UNRELATED PRODUCT ASSESSMENT', evidence: 'fixture://unrelated'};
  option.assessments['QD-002'].basis = optionAssessmentBasis(q, r, option);
  const chosen = specificationReading(q, 'api-pod').products.find(product => product.record.id === r.id);
  assert.equal(chosen.selected.id, option.id);assert.equal(chosen.selectionCurrent, false);
  assert.equal(chosen.comparisons.length, 1);assert.equal(chosen.comparisons[0].current, true);
  const product = row(inspect(q), 'product', r.id);
  assert.match(product.textContent, /Working selection/);assert.match(product.textContent, /Synthetic choice with owned operating constraints/);
  assert.match(product.textContent, /Two synthetic copies retain an operating cost/);
  assert.doesNotMatch(product.textContent, /UNRELATED PRODUCT ASSESSMENT/);
  assert.ok(product.textContent.includes(option.benefits) && product.textContent.includes(option.drawbacks));
  const changed = clone(q);changed.technologyRealisation.records.find(x => x.id === r.id).options[0].replicaCount = 3;
  assert.equal(specificationReading(changed, 'api-pod').products.find(product => product.record.id === r.id).comparisons[0].current, false);
  assert.match(row(inspect(changed), 'product', r.id).textContent, /Assessment basis changed/);
  pass('An open product choice remains open; recorded preferences, benefits, costs and exact driver comparisons appear with configuration currentness.');
}

// Providers and consumers mean the same thing in the native view and exports.
// Events reverse the request-oriented from/to interpretation, not their records.
{
  const event = p.interfaces.contracts.find(c => c.kind === 'event' && c.from === 'worker' && c.to === 'notify-worker');assert.ok(event);
  const publisher = p.realisation.components.find(c => c.id === event.from), consumer = p.realisation.components.find(c => c.id === event.to);
  const pub = specificationReading(p, publisher.id).contracts.find(c => c.record.id === event.id), sub = specificationReading(p, consumer.id).contracts.find(c => c.record.id === event.id);
  assert.equal(pub.role, 'provides');assert.equal(sub.role, 'uses');
  assert.equal(pub.face.provider.record.id, publisher.id);assert.equal(pub.face.consumer.record.id, consumer.id);
  assert.equal(pub.other.record.id, consumer.id);assert.equal(sub.other.record.id, publisher.id);
  assert.match(row(inspect(p, publisher.id), 'contract', event.id).textContent, new RegExp('Publishes to.*' + consumer.ref));
  assert.match(row(inspect(p, consumer.id), 'contract', event.id).textContent, new RegExp('Receives from.*' + publisher.ref));
  const pubDoc = componentSpecDocument(p, publisher.id), subDoc = componentSpecDocument(p, consumer.id);
  const exportedPub = pubDoc.json.provides.find(c => c.id === event.id), exportedSub = subDoc.json.uses.find(c => c.id === event.id);
  assert.ok(exportedPub.provider.includes(publisher.ref) && exportedPub.consumer.includes(consumer.ref));
  assert.deepEqual(exportedSub, exportedPub);
  const pubLine = pubDoc.markdown.split('\n').find(line => line.startsWith('- ' + event.ref + ' '));
  const subLine = subDoc.markdown.split('\n').find(line => line.startsWith('- ' + event.ref + ' '));
  assert.ok(pubLine.includes('for ' + consumer.ref));assert.ok(subLine.includes('from ' + publisher.ref));
  const call = specificationReading(p, 'api-pod').contracts.find(c => c.record.id === 'if-004');
  assert.equal(call.role, 'uses');assert.equal(call.face.provider.record.id, 'risk-engine');assert.equal(call.other.record.id, 'risk-engine');
  let q = ic(p, 'record-review', {id: event.id, reviewed: true, reviewer: 'Fixture reviewer', evidence: 'fixture://event-review/<signed>'});
  assert.equal(specificationReading(q, consumer.id).contracts.find(c => c.record.id === event.id).reviewed, true);
  assert.match(row(inspect(q, consumer.id), 'contract', event.id).innerHTML, /event-review\/&lt;signed&gt;/);
  q = ic(q, 'contract', {...q.interfaces.contracts.find(c => c.id === event.id), purpose: 'Changed event agreement for review.'});
  const later = specificationReading(q, consumer.id).contracts.find(c => c.record.id === event.id);
  assert.equal(later.reviewed, false);assert.equal(later.reviewChanged, true);
  assert.match(row(inspect(q, consumer.id), 'contract', event.id).textContent, /Review needs updating/);
  assert.match(row(inspect(q, consumer.id), 'contract', event.id).textContent, /fixture:\/\/event-review/);
  pass('Event publisher/consumer roles agree in the canonical reader, dossier, JSON and Markdown; request semantics stay intact and changed reviews retain their references.');
}

// Invariants read canonical condition/check, not invented statement/evidence
// fields. Source text stays text, including markup-shaped record values.
{
  const q = ic(p, 'invariant', {title: 'Synthetic posting <balance>', kind: 'balance', condition: 'Debits < credits must never persist.', check: 'fixture://reconcile?before=<after>', dataIds: ['instruction'], contractIds: ['rest'], owner: 'Finance <owner>'});
  const invariant = q.interfaces.invariants.at(-1), root = row(inspect(q), 'invariant', invariant.id);
  assert.match(root.textContent, /Debits < credits must never persist/);
  assert.match(root.innerHTML, /Finance &lt;owner&gt;/);assert.match(root.innerHTML, /before=&lt;after&gt;/);
  assert.equal(root.querySelector('balance, owner, after'), null);
  assert.ok(root.querySelector('[href*="chapter=8"]'));
  pass('Data invariants expose the saved condition, owner and checking method, with escaped text and a native record destination.');
}

// Verification is the exact native obligation state. Verified evidence loses
// currency when its driver basis changes; earlier proof remains reviewable.
{
  let q = acceptedObligationFixture();
  const obligation = architectureObligationsFor(q)[0], componentId = obligation.targetIds.find(id => q.realisation.components.some(c => c.id === id));assert.ok(componentId);
  q = reviewCommand(q, 'action', linkedAction(q, obligation));
  const actionId = q.finalReview.actions.at(-1).id;
  q = reviewCommand(q, 'delivery', verificationPayload(q, actionId));
  const verified = row(inspect(q, componentId), 'obligation', obligation.id);
  assert.match(verified.textContent, /Current verification recorded/);
  assert.match(verified.textContent, /fixture:\/\/observations\/original-identity/);
  assert.doesNotMatch(verified.textContent, /Verification pending/);
  const document = componentSpecDocument(q, componentId);
  assert.match(document.markdown, /verification is recorded with the obligations below/);
  assert.doesNotMatch(document.markdown, /outcome verification: pending/);
  assert.match(document.markdown, /Current evidence state: Current verification recorded/);
  const changed = clone(q);changed.quality.drivers[0].targetValue = '15';
  const reading = specificationReading(changed, componentId), stale = row(inspect(changed, componentId), 'obligation', obligation.id);
  assert.equal(reading.obligations.find(o => o.id === obligation.id).verificationState, 'review-required');
  assert.match(stale.textContent, /Evidence needs review/);assert.match(stale.textContent, /Earlier verification reference/);
  assert.match(stale.textContent, /fixture:\/\/observations\/original-identity/);
  assert.equal(specReviewItems(reading.C, reading)[0].id, 'verification');
  pass('Verified obligations use current evidence states, changed support becomes the first review question, and earlier references stay visible without being current proof.');
}

assert.equal(JSON.stringify(p), original);
await window.happyDOM.close();
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
