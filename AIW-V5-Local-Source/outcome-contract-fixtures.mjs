// Original synthetic two-contract scenarios. No real service or measured result.
import {executionCompositionFixture,EXECUTION_FIXTURE_AT as at} from './execution-composition-fixtures.mjs';
import {applyCommand} from './public/requirements-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyLogicalCommand} from './public/logical-domain.js';
import {applyRealisationCommand} from './public/realisation-domain.js';
import {applyInterfacesCommand} from './public/interfaces-domain.js';
import {applyRuntimeCommand} from './public/runtime-domain.js';
import {withFinalReview} from './public/review-domain.js';
export {at as OUTCOME_FIXTURE_AT};

export function outcomeContractFixture({domain='payment',kind='request'}={}){
 const base=executionCompositionFixture(),ids={...base.ids};let p=base.document;
 const run=(fn,type,payload)=>{const r=fn(p,{type,payload},at);p=r.document;return r.selected;};
 const noun=domain==='fulfilment'?'order fulfilment':'payment settlement';
 p.name='Authored '+noun+' outcome discovery';
 for(const [id,title,purpose] of [[ids.producer,domain==='fulfilment'?'Order service':'Payment instruction service','Own the submitted operation and retained delivery intent.'],[ids.consumer,domain==='fulfilment'?'Order reservation service':'Payment instruction processor','Own the accepted submission effect; final business state belongs to a separate authority.']]){
  const logical=p.logical.mappings.find(m=>m.physicalId===id).logicalId;
  run(applyLogicalCommand,'logical.responsibility',{id:logical,title,purpose,boundary:purpose});
  run(applyRealisationCommand,'realisation.component',{id,title,purpose,boundary:purpose,inputs:'Versioned request with the original operation identity.',outputs:'Retained submission or accepted effect; final result is discovered separately.',allocations:[{logicalId:logical,scope:purpose}]});
 }
 const fulfilment=domain==='fulfilment';
 run(applyInterfacesCommand,'interfaces.contract',{id:ids.contractId,title:fulfilment?'Reserve the requested order':'Accept the retained payment instruction',purpose:'Carry retained intent to the submission effect owner.',operation:fulfilment?'reserve-order':'accept-instruction',contractVersion:fulfilment?'order-request-v1':'payment-instruction-v1',duplicatePolicy:'Atomically record the original identity and accepted effect; reject changed parameters.',failurePolicy:'Retain uncertainty and consult the separately named result authority.'});
 run(applyInterfacesCommand,'interfaces.data',{id:ids.dataId,title:fulfilment?'Order request payload':'Payment instruction payload',purpose:'Carry the original operation identity and business parameters.'});
 if(fulfilment){const amount=p.interfaces.data.find(d=>d.id===ids.dataId).fields.find(f=>f.name==='amount_minor');run(applyInterfacesCommand,'interfaces.field',{id:ids.dataId,field:{id:amount.id,name:'quantity',description:'Requested item quantity; a changed quantity is changed intent.'}});}
 run(applyRuntimeCommand,'runtime.environment',{id:ids.environmentId,title:fulfilment?'Fulfilment test environment':'Payment test environment'});
 run(applyRuntimeCommand,'runtime.path',{id:ids.pathId,route:'Retained submission intent through the declared channel to its effect owner.'});
 run(applyCommand,'artefact',{id:ids.requirementId,type:'requirement',title:'Discover the authoritative '+noun+' outcome',description:'The submission provider owns its accepted business effect. A separate result authority owns the final operation state. Missing responses preserve an unresolved outcome; acceptance is not completion.',acceptance:'Correlate the original operation with pending and final states from the separate result authority.',owner:'Synthetic owner',source:'Original synthetic '+domain+' acceptance scenario.'});
 run(applyQualityCommand,'quality.driver',{id:ids.driverId,kind:'business',title:'Discover one authoritative '+noun+' result',description:'Keep submission acceptance, permitted effects and authoritative completion distinct.',requirementIds:[ids.requirementId]});
 const logicalId=run(applyLogicalCommand,'logical.responsibility',{title:'Authoritative '+noun+' result',purpose:'Own the authoritative result after submission is accepted.',boundary:'Result authority is separate from the submission provider.',owner:'Synthetic result team',source:'Authored scenario',requirementIds:[ids.requirementId]});
 ids.authority=run(applyRealisationCommand,'realisation.component',{title:noun+' result authority',kind:'service',purpose:'Retain the authoritative operation state.',boundary:'Own the status and its result contract.',owner:'Synthetic result team',inputs:'Original operation identity.',outputs:'Authoritative pending or final business state.',source:'Authored scenario',rationale:'Separate acceptance from authoritative completion.',allocations:[{logicalId,scope:'Authoritative outcome.'}]});
 ids.resultDataId=run(applyInterfacesCommand,'interfaces.data',{title:noun+' business result',purpose:'Return the original operation identity and the authoritative business state.',authorityId:ids.authority,owner:'Synthetic result team',classification:'Internal',fields:[{name:'result_operation_id',type:'string',description:'The original submission identity, explicitly mapped despite its different field name.',required:true,key:true},{name:'business_state',type:'string',description:'Authoritative state; acceptance does not mean success.',required:true,enumeration:'PENDING\nCOMPLETED\nREJECTED'}]});
 ids.queryDataId=run(applyInterfacesCommand,'interfaces.data',{title:noun+' result query',purpose:'Carry the original operation identity to the result authority.',authorityId:ids.producer,owner:'Synthetic caller team',classification:'Internal',fields:[{name:'result_operation_id',type:'string',description:'The original operation identity.',required:true,key:true}]});
 const event=kind==='event';
 ids.outcomeContractId=run(applyInterfacesCommand,'interfaces.contract',{title:'Discover '+noun+' business state',from:event?ids.authority:ids.producer,to:event?ids.producer:ids.authority,kind,contractVersion:'result-v1',purpose:'Carry authoritative business state under the original operation identity.',owner:'Synthetic result team',operation:'discover-result',protocol:event?'Versioned result event':'Versioned status request',correlationKey:'result_operation_id',idempotencyKey:'result_operation_id',duplicatePolicy:'Retain original identity and handle repeated reads or events without inventing a new operation.',failurePolicy:'Retain unresolved state if discovery is unavailable.',timeoutPolicy:'A missing response leaves the business outcome unresolved.',retryPolicy:'Use the existing operation identity and an independently reviewed retry policy.',authorization:'The caller is authorized to inspect only its own operations.',transport:'Authenticated protected channel; implementation unverified.',exchanges:event?[{dataId:ids.resultDataId,role:'request'}]:[{dataId:ids.queryDataId,role:'request'},{dataId:ids.resultDataId,role:'response'}],requirementIds:[ids.requirementId]});
 const env=p.runtime.environments.find(e=>e.id===ids.environmentId);
 run(applyRuntimeCommand,'runtime.environment',{id:env.id,assetIds:[...env.assetIds,ids.authority]});
 ids.outcomePathId=run(applyRuntimeCommand,'runtime.path',{environmentId:ids.environmentId,contractId:ids.outcomeContractId,owner:'Synthetic operator',route:'Original caller and explicit result authority in the declared environment.',mode:event?'buffered':'required',failureResponse:'Retain unresolved outcome; do not infer rejection from an unavailable result.',requirementIds:[ids.requirementId]});
 const c=p.interfaces.contracts.find(x=>x.id===ids.contractId);
 run(applyInterfacesCommand,'interfaces.contract',{id:c.id,execution:{...c.execution,discovery:event?'correlated-event':'authoritative-status',outcomeAuthorityId:ids.authority,outcomeContractId:ids.outcomeContractId,outcomeCorrelation:'same-operation',outcomeMeaning:'business-outcome',outcomeResultKey:'business_state'}});
 return {document:withFinalReview(p),ids};
}
