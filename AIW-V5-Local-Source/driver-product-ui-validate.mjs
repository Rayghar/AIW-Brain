// Chapter 7 presentation reads canonical driver scope and assessment currentness.
// Pure DOM plus in-memory commands; no browser, server or live provider.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyQualityCommand,isQualityDriver,driverPriority} from './public/quality-domain.js';
import {applyTechnologyRealisationCommand,realizationSources,optionAssessmentCurrent} from './public/technology-realisation-domain.js';

const w=new Window({url:'https://aiw.test/?chapter=7&tab=work&stage=compare&object=tr-002&project=bank-payment'});
for(const key of ['window','document','location','history','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','navigator','AbortController'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
document.body.innerHTML='<main id="app"></main>';
let project=withFinalReview(seedProject());
const driverResult=applyQualityCommand(project,{type:'quality.driver',payload:{kind:'operational',title:'Retain the database operating team',description:'The existing team owns incidents and upgrades.',impact:'Retain established database incident ownership.',componentIds:['api-pod'],priority:'High',confirmed:true}},'2026-10-20T12:00:00.000Z');
project=driverResult.document;
const operational=project.quality.drivers.find(d=>d.id===driverResult.selected);
project.quality.drivers=[operational,...project.quality.drivers.filter(d=>d.id!==operational.id)];
project.coauthoring.designTasks||=[];
project.coauthoring.designTasks.push({id:'DES-PRODUCT',kind:'architecture',status:'applied',applied:{alternativeId:'ALT-PRODUCT',reasoningGraph:{solution:{id:'solution:DES-PRODUCT',mechanism:{pattern:'Local transaction'},placement:[{componentId:'api-pod',role:'processor'}],specifications:[{componentId:'api-pod',obligationIds:['DES-PRODUCT:recovery']}],obligations:[{id:'DES-PRODUCT:recovery',kind:'verification',action:'Exercise the declared recovery boundary.',evidence:'Measure the restored result against the driver target.',targetIds:['api-pod'],declared:true,verification:'pending'}]}}}});
const realizationId='tr-002',record=()=>project.technologyRealisation.records.find(r=>r.id===realizationId),optionId=record().options[0].id;
const qualityDriver=realizationSources(project,realizationId).drivers.find(isQualityDriver);
for(const driver of [operational,qualityDriver])project=applyTechnologyRealisationCommand(project,{type:'techrealisation.assessment',payload:{id:realizationId,optionId,criterionId:driver.id,effect:'supports',reason:'Reviewed against the original configuration.',evidence:'Synthetic configuration review record.'}},'2026-10-20T12:00:00.000Z').document;
let writes=0;
const store={value:{document:project,revision:1},async command(){writes++;throw Error('This inspection must remain read-only.');}};
const {createTechnologyRealisationStudio}=await import('./public/technology-realisation-ui.js');
const studio=createTechnologyRealisationStudio(store);
const bridge={state:{chapter:7,tab:'work',selected:realizationId},getNode:id=>studio.graph().nodes.find(n=>n.id===id),persist(){},toast(){},render(){document.querySelector('#app').innerHTML=studio.work();}};
studio.bind(bridge);studio.openSection('compare');bridge.render();
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const criterion=id=>q('[data-tr-criterion-row="'+id+'"]');
assert.match(q('.tr-brief-targets').textContent,/Inherited architectural drivers/);
assert.match(q('.tr-brief-targets').textContent,/Operational · Retain established database incident ownership/);
const sensitivityIds=qa('[name="sensitivityDriver"] option').map(o=>o.value);
assert(sensitivityIds.includes(qualityDriver.id));assert(!sensitivityIds.includes(operational.id),'Numeric target scenarios exclude non-quality drivers');
assert.match(criterion(qualityDriver.id).querySelector('summary').textContent,/1 \/ 2 current evidence entries/);
assert.match(criterion(qualityDriver.id).querySelector('[data-tr-assessment-option="'+optionId+'"] .chip').textContent,/Supports the criterion/);
// rc39: the profile names the documentation family the mechanism was read from and, where the recorded version differs, says so beside the mechanism.
assert.match(q('.tr-product-profile').textContent,/Documentation scope: PostgreSQL 18\.x documentation family; other versions require a separate reviewed interpretation/);
assert.match(q('.tr-product-profile').textContent,/Inspected documentation major version conflicts with the recorded value \(17\)\./);
const obligation=qa('[data-tr-criterion-row]').find(x=>x.dataset.trCriterionRow.startsWith('obligation:'));
assert(obligation);assert.match(obligation.textContent,/Verification pending/);
assert.equal(obligation.querySelector('[data-tr-action="assess"]'),null,'An implementation obligation is not presented as an option suitability judgement');
assert(obligation.querySelector('[data-tr-action="edit-option"]'),'The obligation reuses the native configuration editor');

// A changed configuration invalidates both the top matrix and the detailed
// assessment. Its earlier reasoning remains readable, but is no longer current.
project=applyTechnologyRealisationCommand(project,{type:'techrealisation.option',payload:{id:realizationId,option:{id:optionId,topology:'A revised primary and standby arrangement requiring review.'}}},'2026-10-20T12:01:00.000Z').document;
store.value={document:project,revision:2};bridge.render();
const option=record().options.find(o=>o.id===optionId);
assert.equal(optionAssessmentCurrent(project,record(),option,option.assessments[qualityDriver.id]),false);
const detail=criterion(qualityDriver.id),assessment=detail.querySelector('[data-tr-assessment-option="'+optionId+'"]');
assert.equal(assessment.querySelector('.chip').textContent,'Review required');
assert.match(detail.querySelector('summary').textContent,/0 \/ 2 current evidence entries/);
assert.match(assessment.textContent,/Earlier judgement: Supports the criterion/);
assert.match(assessment.textContent,/Earlier evidence: Synthetic configuration review record/);
const matrixRow=qa('.tr-driver-matrix tbody tr').find(row=>row.querySelector('th').textContent.includes(qualityDriver.id));
assert.equal(matrixRow.querySelector('.tr-effect').textContent,'Review required');
const before=JSON.stringify(project);
q('[name="sensitivityPriority"]').value=driverPriority(qualityDriver)==='Low'?'High':'Low';
q('[data-tr-action="sensitivity"]').click();
for(let i=0;i<100&&!q('.tr-scenario-options');i++)await new Promise(resolve=>setTimeout(resolve,0));
assert(q('.tr-scenario-options'),'The read-only target scenario produces its review map');
const scenario=q('.tr-scenario-options article');
assert.match(scenario.textContent,/Earlier judgement · review required/);
assert.match(scenario.textContent,/Review the earlier judgement against the current configuration and sources/);
assert.equal(JSON.stringify(project),before);assert.equal(writes,0);
studio.dispose();await w.happyDOM.close();
console.log('PASS product comparison DOM: architecture driver kinds, quality-only target scenarios, canonical stale state in matrix/details/scenario, current evidence counts, preserved earlier reasoning, pending obligations, visible documentation scope and read-only exploration. No rendered-layout claim.');
