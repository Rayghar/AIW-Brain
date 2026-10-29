// One coherent journey: drivers -> proposed policy placement -> reviewed model ->
// component specifications -> product criteria -> changed-source reassessment.
import assert from 'node:assert/strict';
import {readyComposition,arc} from './composition-fixtures.mjs';
import {applyQualityCommand} from './public/quality-domain.js';
import {architectureSourceStamp} from './public/architecture-design.js';
import {architectureReassessment,designBasisCurrent,designTaskMarkdown} from './public/design-task-state.js';
import {previewAlternative,applyAlternativeCommand} from './public/model-alternatives.js';
import {proposalEdgeChanged} from './public/architecture-proposal.js';
import {componentSpecDocument} from './public/component-spec-document.js';
import {realizationCriteria} from './public/technology-realisation-domain.js';
import {choiceForDesign} from './public/product-choice.js';
import {exportSDD} from './public/review-domain.js';

const at='2026-10-20T12:30:00.000Z',task=p=>p.coauthoring.designTasks.at(-1);
let p=readyComposition('resilience');
p=applyQualityCommand(p,{type:'quality.driver',payload:{kind:'operational',title:'Operate within the application team',description:'Keep dependency protection with the caller’s existing owner.',impact:'Place breaker and isolation policies at the caller; a new control service needs separate justification.',requirementIds:['REQ-001'],priority:'High',owner:'Service owner',confirmed:true}},at).document;
assert(!designBasisCurrent(p,task(p)),'A new applicable driver requires review');
let reassessment=architectureReassessment(p,task(p));assert(reassessment.changed);assert(reassessment.changes.some(x=>x.includes('now applies')));
p=arc(p,'architecture.refresh',{stamp:architectureSourceStamp(p,task(p)),reviewed:true,reviewer:'Synthetic architect',reason:'Review the newly recorded operating driver.'}).document;
const driverIds=task(p).basis.drivers.map(d=>d.id);assert.equal(driverIds.length,2);
const before=JSON.stringify(p.realisation),prepared=arc(p,'architecture.prepare',{optionId:'protected-call'});p=prepared.document;
const alt=p.modelAlternatives.records.find(a=>a.id===prepared.selected),q=previewAlternative(p,alt,at),solution=q.solution;
assert.equal(JSON.stringify(p.realisation),before,'Preparation and preview do not apply a model change');
assert.deepEqual(solution.driverIds,driverIds);assert.equal(solution.state,'proposed');assert.equal(solution.verification,'pending');
assert.equal(q.document.realisation.components.length,2,'Circuit breaking is a caller policy, not a third service');
const caller=solution.placement.find(x=>x.role==='caller').componentId;
assert(solution.obligations.length>0);assert(solution.obligations.every(o=>o.verification==='pending'&&o.targetIds.length&&o.targetIds.every(id=>q.document.realisation.components.some(c=>c.id===id))));
assert(solution.specifications.some(s=>s.componentId===caller&&s.obligationIds.length));
assert.equal(solution.alternatives.length,2,'Both approaches remain available in the recorded comparison');
for(const alternative of q.document.decisions.records.find(d=>d.id===q.decisionId).alternatives){assert.deepEqual(Object.keys(alternative.assessments),driverIds);assert.equal(alternative.assessments[driverIds[1]].effect,'unknown');}
const added=q.relationships.added.find(e=>e.from&&e.to);assert(added);assert(proposalEdgeChanged(added,q.relationships));
assert(!proposalEdgeChanged({...added,id:'unrelated-existing-edge',label:'An unrelated retained route'},q.relationships),'Two changed endpoints do not highlight an unrelated edge');
p=applyAlternativeCommand(p,{type:'alternative.apply',payload:{id:alt.id,alternativeRevision:alt.revision,previewStamp:q.stamp,reviewed:true,reviewer:'Synthetic architect',reason:'Retain a bounded caller policy with explicit fallback and isolation responsibilities.'}},at).document;
const accepted=task(p).applied.reasoningGraph.solution;
assert.equal(accepted.state,'adopted');assert.equal(accepted.verification,'pending');assert(designBasisCurrent(p,task(p)));
const document=componentSpecDocument(p,caller);assert(document.json.architectureDrivers.some(d=>d.kind==='operational'));assert(document.json.architectureObligations.length);assert.match(document.markdown,/Implementation and verification obligations/);assert.match(document.markdown,/Design: adopted; verification is recorded with the obligations below\./);assert.match(document.markdown,/Current evidence state: Open obligation\./);
const plan=p.technologyRealisation.records.at(-1),criteria=realizationCriteria(p,plan.id);
assert(driverIds.every(id=>criteria.some(c=>c.id===id)));assert(criteria.some(c=>c.kind==='architecture-obligation'));
const reading=choiceForDesign(p,plan.id);assert(reading.criteria.filter(c=>c.kind==='obligation').every(c=>c.weight===0),'An outstanding implementation duty is not a preference bonus');
assert.match(designTaskMarkdown(p),/Driver-to-design trace/);assert.match(exportSDD(p),/Implementation and verification obligations/);
const measuredBefore=JSON.stringify(task(p).measurements||[]);
p=applyQualityCommand(p,{type:'quality.driver',payload:{...p.quality.drivers.find(d=>d.id===driverIds[0]),targetValue:'15'}},at).document;
reassessment=architectureReassessment(p,task(p));assert(reassessment.changed);assert(reassessment.changes.some(x=>x.includes('target')));assert.equal(reassessment.choices.length,2);assert(reassessment.obligations.length);assert.equal(JSON.stringify(task(p).measurements||[]),measuredBefore,'Reassessment does not invent evidence');
assert.equal(task(p).applied.reasoningGraph.solution.state,'adopted','Reassessment retains the historical adoption and asks for review');
console.log('PASS driver solution journey: all-kind driver scope, concrete caller policy placement, full alternative trace, exact changed edges, reviewed adoption, specification and product obligations, SDD, changed-target reassessment and no invented measurement.');
