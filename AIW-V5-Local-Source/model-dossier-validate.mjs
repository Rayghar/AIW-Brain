import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {modelDossierHTML} from './public/model-dossier.js';
import {applyAssuranceCommand} from './public/assurance-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyTechnologyRealisationCommand, optionAssessmentCurrent} from './public/technology-realisation-domain.js';
import {questionRows, questionPickerHTML, switcherLabels} from './public/instrument-tray.js';

const p = withFinalReview(seedProject()), before = JSON.stringify(p);
const component = p.realisation.components[0], technology = p.technologyRealisation.records[0], decision = p.decisions.records[0];
const dossier = modelDossierHTML(p, component.id, {chapter: 5, open: true});
assert.match(dossier, /Connected dossier/);
assert.match(dossier, /Why and design drivers[\s\S]*Requirements[\s\S]*Architectural drivers[\s\S]*Decisions · direct links/);
assert.match(dossier, /Full component specification/);
assert.match(dossier, /chapter=5&amp;tab=model&amp;model=specification&amp;object=api-pod/);
assert.match(dossier, /APP-001/);
assert.match(dossier, /Illustrative component carried from the Chapter 4 allocation/);
assert.match(dossier, /Chapter 4|chapter=4&amp;tab=model/);
assert.match(dossier, /Observed evidence[\s\S]*No delivery observation explicitly linked to this object/);
assert.ok(!/Product \/ service<\/dt>/.test(dossier), 'a component does not claim that an unchosen candidate is its product');
assert.match(dossier, /Candidate option|No product named/, 'any downstream product is labelled as a candidate or still unnamed');

const candidate = modelDossierHTML(p, technology.id, {chapter: 7});
assert.match(candidate, /No option preferred/);
assert.match(candidate, /Candidate products[\s\S]*Kubernetes/, 'the open comparison still names its candidate products');
assert.ok(!candidate.includes('Product / service</dt>'), 'an unselected reference product remains a candidate');
const q = structuredClone(p), selection = q.technologyRealisation.records[0];
selection.selectedOptionId = selection.options[0].id;
const selected = modelDossierHTML(q, selection.id, {chapter: 7});
assert.match(selected, /Draft preference/);
assert.match(selected, /Kubernetes/);
assert.match(selected, /Product release/);
assert.match(selected, /Service tier \/ edition/);
assert.match(selected, /Configuration status[\s\S]*Illustrative reference option/);
assert.match(selected, /Option evidence as recorded/);
assert.match(selected, /Option source address/);
const compared = structuredClone(p), handoff = compared.technologyRealisation.records.find(r => r.id === 'tr-003');
handoff.selectedOptionId = handoff.options[0].id;
handoff.rationale = 'Prefer owned redelivery with explicit consumer deduplication.';
handoff.options[0].assessments['QD-004'] = {effect: 'supports', reason: 'Redelivery can be inspected after an uncertain response.', evidence: 'Pilot replay protocol, still to execute.'};
handoff.options[1].assessments['QD-004'] = {effect: 'tension', reason: 'An event log changes consumer replay obligations.', evidence: ''};
const fit = modelDossierHTML(compared, handoff.id, {chapter: 7, open: true});
assert.match(fit, /Technology choice and driver fit[\s\S]*RabbitMQ[\s\S]*Draft preference/);
assert.match(fit, /Prefer owned redelivery with explicit consumer deduplication/);
assert.match(fit, /QD-004 · Resolve uncertainty[\s\S]*At most 15 minutes[\s\S]*Supports[\s\S]*Pilot replay protocol, still to execute/);
assert.match(fit, /Read 1 alternative assessment[\s\S]*Apache Kafka[\s\S]*Creates a trade-off/);
assert.match(fit, /Show 1 remaining architectural drivers[\s\S]*QD-006/);
assert.match(fit, /chapter=7&amp;tab=work&amp;object=tr-003&amp;stage=compare/);
assert.match(fit, /recorded comparisons, not measured proof/);
handoff.recorded = {revision: handoff.revision, optionId: handoff.selectedOptionId, sourceSnapshot: 'older inputs'};
assert.match(modelDossierHTML(compared, handoff.id), /Selection needs review[\s\S]*recorded selection needs review after changes/);
const configured=structuredClone(q);
Object.assign(configured.technologyRealisation.records[0].options[0],{serviceTier:'Team supported tier',topology:'Primary and standby across two sites',replicaCount:'2',failureDomains:'Separate test sites',workloadProfile:'Synthetic peak of 100 messages/s',specEvidence:'Synthetic verification procedure'});
const configuredView=modelDossierHTML(configured, selection.id, {chapter:7});
for(const line of ['Team supported tier','Primary and standby across two sites','Planned instances</dt><dd>2','Separate test sites','Synthetic peak of 100 messages/s','Synthetic verification procedure'])assert(configuredView.includes(line),line);
selection.options[0].sourceUrl = 'javascript:alert(1)';
assert.ok(!modelDossierHTML(q, selection.id).includes('javascript:alert'), 'an unsafe source address is never linked');

// A product dossier must preserve the same typed drivers and currentness as Work.
// The fixture uses the native driver and assessment commands, including a changed
// source after a judgment, so stale positives cannot silently look current.
let typed = applyQualityCommand(p, {type: 'quality.driver', payload: {id: 'QD-001', kind: 'constraint',
  title: 'Retain the existing ledger boundary', description: 'All postings must use the existing ledger.',
  impact: 'The replacement platform cannot become the ledger authority.', constraintIds: ['CON-001'], confirmed: true}}, '2026-10-20').document;
typed = applyQualityCommand(typed, {type: 'quality.driver', payload: {id: 'QD-002', kind: 'business',
  title: 'Launch with the current operations team', description: 'Operate the service with the current support team.',
  impact: 'Reuse the current escalation and service ownership.', confirmed: true}}, '2026-10-20').document;
const typedId = technology.id, typedOptionId = technology.options[0].id;
for (const [criterionId, effect, reason] of [['QD-001', 'violates', 'The proposed deployment replaces the required ledger.'], ['QD-002', 'supports', 'The current team supports this operating model.']])
  typed = applyTechnologyRealisationCommand(typed, {type: 'techrealisation.assessment', payload: {id: typedId, optionId: typedOptionId, criterionId, effect, reason, evidence: 'Authored scenario evidence, pending implementation verification.'}}, '2026-10-20').document;
typed = applyTechnologyRealisationCommand(typed, {type: 'techrealisation.preference', payload: {id: typedId, optionId: typedOptionId}}, '2026-10-20').document;
const typedBefore = JSON.stringify(typed), typedRead = modelDossierHTML(typed, typedId, {chapter: 7});
assert.match(typedRead, /Hard constraint · All postings must use the existing ledger\.[\s\S]*Excluded · breaks a hard constraint/);
assert.match(typedRead, /Business · Operate the service with the current support team\.[\s\S]*Supports the criterion/);
assert.match(typedRead, /chapter=2&amp;tab=model&amp;object=QD-001/, 'the displayed constraint retains its exact source driver route');
assert.match(typedRead, new RegExp('chapter=7&amp;tab=work&amp;object=' + typedId + '&amp;stage=compare'));
const driverRead = modelDossierHTML(typed, 'QD-001', {chapter: 2});
assert.match(driverRead, /Driver kind<\/dt><dd>Constraint[\s\S]*Architectural impact<\/dt><dd>The replacement platform cannot become the ledger authority/);
assert.ok(!driverRead.includes('<dt>Target</dt>'), 'a non-quality driver does not inherit its former numeric scenario reading');
assert.equal(JSON.stringify(typed), typedBefore);
const changed = applyQualityCommand(typed, {type: 'quality.driver', payload: {id: 'QD-002', description: 'Operate with a smaller shared support team.'}}, '2026-10-21').document;
const changedPlan = changed.technologyRealisation.records.find(r => r.id === typedId), changedOption = changedPlan.options.find(o => o.id === typedOptionId);
assert.equal(optionAssessmentCurrent(changed, changedPlan, changedOption, changedOption.assessments['QD-002']), false);
const historical = modelDossierHTML(changed, typedId, {chapter: 7});
assert.match(historical, /Review required[\s\S]*Earlier judgement: Supports the criterion · The current team supports this operating model\./);
assert.match(historical, /Earlier judgement: Breaks the constraint · The proposed deployment replaces the required ledger\./);
assert.match(historical, /Earlier evidence: Authored scenario evidence/);
assert.ok(!historical.includes('nt-fit-effect supports'), 'historical positive assessments do not retain a current support badge');
assert.ok(!historical.includes('Excluded · breaks a hard constraint'), 'a changed constraint basis requires review before presenting its old exclusion as current');
assert.equal(JSON.stringify(typed), typedBefore, 'changing the current driver leaves the earlier assessment record untouched');

const another = structuredClone(p);
another.realisation.components[0].rationale = '<script>attack()</script>';
assert.ok(modelDossierHTML(another, component.id).includes('&lt;script&gt;attack()&lt;/script&gt;'));
assert.ok(!modelDossierHTML(another, component.id).includes('<script>'), 'recorded prose is escaped');
const choice = modelDossierHTML(p, decision.id, {chapter: 3});
assert.match(choice, /When should the customer receive a payment acknowledgement/);
assert.match(choice, /No rationale is written on this object/);
assert.equal(modelDossierHTML(p, 'G:synthetic'), '', 'visual aggregates never pose as saved records');
const questions = questionRows(p, 5);
assert.deepEqual(questions.filter(q => !q.waiting).map(q => q.label).sort(), switcherLabels(p, 5).sort(), 'available questions name exactly the existing Model instruments');
assert.ok(questions.find(q => q.id === 'modules')?.waiting, 'an unavailable module-map question explains its prerequisite');
assert.match(questionPickerHTML(p, 5), /What do we know about one component\?/);
const noComponent = structuredClone(p); noComponent.workspace = {template: 'blank'}; noComponent.realisation.components = [];
assert.ok(questionRows(noComponent, 5).find(q => q.id === 'specification')?.waiting, 'a question names the missing record that makes a view useful');
const observed = applyAssuranceCommand(p, {type: 'assurance.record', payload: {kind: 'observation', title: 'UAT payment result', statement: '<img src=x onerror=alert(1)>', objectIds: [component.id], requirementIds: [p.artefacts.find(a => a.type === 'requirement').id], status: 'Reported pass', release: 'R17', environment: 'UAT', observedAt: '2026-10-11', cycle: 'Regression'}}, '2026-10-11', 'tester').document;
const observedDossier = modelDossierHTML(observed, component.id);
assert.match(observedDossier, /UAT payment result[\s\S]*Review or source needed[\s\S]*Status in source: Reported pass/);
assert.match(observedDossier, /&lt;img src=x onerror=alert\(1\)&gt;/);
assert.ok(!observedDossier.includes('<img src=x'), 'observed content is escaped as design content is');
const many = structuredClone(observed), modelRecord = many.realisation.components[0];
for (let i = 2; i <= 10; i++) many.assurance.records.push({...many.assurance.records[0], id: `ASR-${String(i).padStart(3, '0')}`, title: `Linked observation ${i}`});
for (let i = 1; i <= 9; i++) {
  const id = `ADR-X${i}`;
  many.decisions.records.push({...many.decisions.records[0], id, question: `Linked decision ${i}`});
  modelRecord.decisionIds.push(id);
}
const expanded = modelDossierHTML(many, modelRecord.id, {chapter: 5});
assert.match(expanded, /Show 3 remaining decisions[\s\S]*ADR-X9/);
assert.match(expanded, /Show 2 remaining linked observations[\s\S]*Linked observation 10/);
assert.equal(JSON.stringify(p), before, 'rendering changes no project facts');
console.log('Model dossier and question chooser: source, choice, navigation, readiness, observed evidence, escaping and read-only checks passed.');
