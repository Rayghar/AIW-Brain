// The specification reading of one component (round 11, rc40 W3): the source-aware facts behind the Chapter 5
// Specification sheet (component-spec-view.js) and its export (component-spec-document.js). A reading of the saved
// model, never another design store: driver paths, choices, contracts, products and verification keep their native
// identities and currentness, and a named relationship or assessment never becomes a claim of target attainment.
// Pure, read once per component and render through the document memo; nothing here writes the document or draws.
import {reasoningFor, componentSpec} from './design-spec.js';
import {driverScope} from './driver-scope.js';
import {driverKind, isQualityDriver} from './quality-domain.js';
import {decisionSourceChanged, governanceCurrent} from './decisions-domain.js';
import {constraintForce} from './decision-reading.js';
import {componentSourceChanged} from './realisation-domain.js';
import {contractReviewCurrent, interfaceSourceChanged, interfaceFindings} from './interfaces-domain.js';
import {realizationSourceChanged, selectionCurrent, realizationSources, optionAssessmentCurrent} from './technology-realisation-domain.js';
import {memoPass} from './document-memo.js';
import {list, str} from './util.js';

const refOf = r => str(r?.ref) || str(r?.code) || str(r?.id);
const named = r => `${refOf(r)} ${str(r?.title || r?.question)}`.trim();
const priority = d => ({High: 0, Medium: 1, Low: 2}[d.priority] ?? 3);

// All source-sensitive readers are evaluated once for this component/render.
// The selection list is deliberately separate from these canonical project facts.
export function specificationReading(p, id) {
  return memoPass(p, () => specificationReadingOf(p, id));
}
function specificationReadingOf(p, id) {
  const R = reasoningFor(p), C = componentSpec(R, id);
  if (!C) return null;
  const decisions = C.decisions.map(record => ({record, selected: list(record.alternatives).find(a => a.id === record.selectedAlternativeId) || null,
    sourceChanged: !!record.sourceSnapshot && decisionSourceChanged(p, record), approved: !!record.governance && governanceCurrent(record, p) && record.governance.status === 'approved'}));
  const drivers = C.drivers.map(record => ({record, paths: driverScope(p, record, R.scopes).paths.filter(path => path.to === C.id),
    decisions: decisions.filter(d => list(d.record.driverIds).includes(record.id)),
    properties: C.properties.filter(property => property.concern === record.id || isQualityDriver(record) && !!record.category && property.concern === record.category),
    solutions: list(C.architectureSolutions).filter(solution => list(solution.driverIds).includes(record.id) && list(solution.placement).some(place => place.componentId === C.id))})).sort((a, b) => priority(a.record) - priority(b.record));
  const effects = decisions.flatMap(decision => decision.selected ? C.drivers.filter(driver => list(decision.record.driverIds).includes(driver.id)).map(driver => {
    const assessment = decision.selected.assessments?.[driver.id] || {};
    return {decision, driver, assessment, hardViolation: assessment.effect === 'violates' && driverKind(driver) === 'constraint' && constraintForce(p, driver).hard};
  }) : []);
  const findings = p?.interfaces ? interfaceFindings(p) : [];
  const contracts = [...C.provides.map(face => ({face, role: 'provides'})), ...C.uses.map(face => ({face, role: 'uses'}))].map(({face, role}) => {
    const record = face.contract;
    const other = role === 'provides' ? face.consumer : face.provider, reviewed = !!record.review && contractReviewCurrent(p, record);
    const review = record.review || list(record.history).findLast(entry => entry.review)?.review || null;
    return {face, role, record, other, sourceChanged: !!record.sourceSnapshot && interfaceSourceChanged(p, record), reviewed, review, reviewChanged: !!review && !reviewed, findings: findings.filter(f => f.objectId === record.id)};
  });
  const products = C.products.map(product => {
    const record = product.realisation, options = list(record.options), selected = options.find(option => option.id === record.selectedOptionId) || null;
    const carried = realizationSources(p, record.id).drivers.filter(driver => C.drivers.some(d => d.id === driver.id));
    const comparisons = options.flatMap(option => carried.filter(driver => option.assessments?.[driver.id]).map(driver => ({option, driver, assessment: option.assessments[driver.id], current: optionAssessmentCurrent(p, record, option, option.assessments[driver.id])})));
    return {...product, record, options, selected, comparisons, sourceChanged: !!record.sourceSnapshot && realizationSourceChanged(p, record), selectionCurrent: !!selected && selectionCurrent(p, record)};
  });
  return {p, R, C, decisions, drivers, effects, contracts, products, sourceChanged: !!C.component.sourceSnapshot && componentSourceChanged(p, C.component),
    obligations: list(C.architectureObligations), requirements: new Map(list(p.artefacts).map(r => [r.id, r]))};
}

// What needs attention first: changed support and unresolved choices, from the saved facts. Review prompts, not a
// readiness score or a recommendation. Each carries a typed action the sheet renders as a link: {kind: 'work', chapter,
// id, label} opens the chapter's Work tab on the record; {kind: 'edit', action, label} opens a Chapter 5 editor.
export function specReviewItems(C, reading = null) {
  const c = C.component, out = [], ids = new Set();
  const work = (chapter, label, id = null) => ({kind: 'work', chapter, id, label});
  const edit = (label, action = 'edit') => ({kind: 'edit', action, id: C.id, label});
  const add = (id, title, detail, action, rank = 10) => { if (!ids.has(id)) { ids.add(id); out.push({id, title, detail, action, rank}); } };
  if (reading) {
    const stale = reading.obligations.find(o => o.verificationState === 'review-required');
    if (stale) add('verification', 'Review changed verification support', list(stale.verificationReasons)[0] || stale.action || 'The evidence no longer matches the current obligation.', work(11, 'Review verification', list(stale.verificationActions)[0]?.id), 0);
    const conflict = reading.effects.find(effect => effect.hardViolation) || reading.effects.find(effect => ['violates', 'tension'].includes(effect.assessment.effect));
    if (conflict) add('tradeoff', conflict.hardViolation ? 'Resolve the selected hard-constraint conflict' : 'Review the selected tradeoff', `${conflict.decision.selected.title} records ${conflict.assessment.effect} against ${named(conflict.driver)}. ${str(conflict.assessment.reason) || 'No reason is recorded.'}`, work(3, 'Review the assessment', conflict.decision.record.id), 1);
    const decision = reading.decisions.find(d => d.sourceChanged);
    if (decision) add('decision-source', 'Revisit a decision whose source changed', named(decision.record) + ' needs review against its current linked drivers and requirements.', work(3, 'Review changed decision', decision.record.id), 2);
    if (reading.sourceChanged) add('component-source', 'Review the component’s changed basis', 'An allocated responsibility, requirement, driver, decision or mapping changed since the component basis was recorded.', edit('Review component basis'), 3);
    const contract = reading.contracts.find(item => item.sourceChanged || item.reviewChanged) || reading.contracts.find(item => item.findings.some(f => ['execution', 'failure', 'duplicate', 'source-boundary'].includes(f.code)));
    if (contract) { const finding = contract.findings.find(f => ['execution', 'failure', 'duplicate', 'source-boundary'].includes(f.code)), changed = contract.sourceChanged || contract.reviewChanged; add('contract-agreement', changed ? 'Review a changed boundary agreement' : finding.title, changed ? named(contract.record) + (contract.sourceChanged ? ' has changed inherited inputs.' : ' no longer matches its recorded review.') : finding.detail, work(8, 'Review ' + refOf(contract.record), contract.record.id), changed ? 2 : 5); }
    const unconfirmed = reading.drivers.filter(({record}) => !record.confirmed || isQualityDriver(record) && !record.targetConfirmed);
    if (unconfirmed.length) add('driver-basis', 'Confirm the driver before relying on its target', `${named(unconfirmed[0].record)} is ${isQualityDriver(unconfirmed[0].record) ? 'not confirmed with its target' : 'not confirmed'}${unconfirmed.length > 1 ? `; ${unconfirmed.length - 1} other carried drivers also need confirmation` : ''}.`, work(2, 'Review driver basis', unconfirmed[0].record.id), 4);
    const unselected = reading.products.find(product => !product.selected);
    if (unselected) add('product-choice', 'Resolve the platform choice', `${named(unselected.record)} has ${unselected.options.length} recorded options and no selected product.`, work(7, 'Compare platform options', unselected.record.id), 7);
    const changedProduct = reading.products.find(product => product.sourceChanged || product.selected && !product.selectionCurrent);
    if (changedProduct) add('product-basis', changedProduct.sourceChanged ? 'Review changed product support' : 'Record the working product selection', `${named(changedProduct.record)} ${changedProduct.sourceChanged ? 'has a changed capability or decision basis' : 'has a preference without a current selection record'}.`, work(7, 'Review selection basis', changedProduct.record.id), changedProduct.sourceChanged ? 3 : 8);
    const unsupported = reading.effects.find(effect => !str(effect.assessment.evidence));
    if (unsupported) add('assessment-evidence', 'Substantiate the recorded driver assessment', `${refOf(unsupported.decision.record)} assesses ${named(unsupported.driver)} without an evidence reference.`, work(3, 'Add assessment evidence', unsupported.decision.record.id), 8);
  }
  const missing = [['purpose', C.purpose], ['boundary', C.boundary], ['owner', C.owner]].filter(([, value]) => !value).map(([label]) => label);
  if (missing.length) add('definition', 'Clarify the component', 'Record its ' + missing.join(', ') + '.', edit('Complete definition'));
  if (!C.responsibilities.length) add('responsibilities', 'Connect its responsibility', 'No logical responsibility is allocated to this component.', edit('Review allocation'));
  if (!C.drivers.length) add('drivers', 'Establish the driver basis', 'No architectural driver reaches this component through the recorded design.', work(2, 'Review driver scope'), 4);
  const open = C.decisions.filter(decision => !list(decision.alternatives).some(a => a.id === decision.selectedAlternativeId));
  if (open.length || !C.decisions.length) add('decisions', 'Explain the chosen approach', open.length ? `${named(open[0])} has no selected alternative${open.length > 1 ? `; ${open.length - 1} other linked choices are also open` : ''}.` : 'No architecture decision is linked to this component.', work(3, 'Review decisions', open[0]?.id), 6);
  if (str(c.assumptions) && !c.assumptionsResolved) add('assumptions', 'Resolve the component assumption', str(c.assumptions), edit('Review assumptions'));
  if (C.needs.some(n => !n.capability) || !C.needs.length) add('platform', 'Define the platform support', C.needs.length ? 'A technology need has no supporting capability.' : 'No technology need is linked to this component.', edit('Review technology needs', 'edit-needs'), 6);
  if (!C.provides.length && !C.uses.length) add('contracts', 'Describe the boundary contracts', 'No interface contract names this component as provider or consumer.', work(8, 'Define interfaces'));
  if (!C.plans.length) add('runtime', 'Place it in a runtime plan', 'No runtime plan places this component.', work(10, 'Review deployment'));
  if (C.threats.length && !C.controls.length) add('protection', 'Address its recorded exposure', `${C.threats.length} recorded threats target this component without a linked control.`, work(9, 'Review protection', C.threats[0]?.id), 7);
  return out.sort((a, b) => a.rank - b.rank);
}
