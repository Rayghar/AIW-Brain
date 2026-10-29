// Original synthetic non-banking scenarios. Every design record is authored
// through native commands; there are no live calls or measured outcomes.
import {createProject} from './shared/projects-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyLogicalCommand} from './public/logical-domain.js';
import {applyRealisationCommand} from './public/realisation-domain.js';
import {applyInterfacesCommand} from './public/interfaces-domain.js';
import {applyRuntimeCommand} from './public/runtime-domain.js';
import {applyProcessCommand} from './public/process-model.js';
import {withFinalReview} from './public/review-domain.js';

export const JOURNEY_FIXTURE_AT='2026-10-21T00:00:00.000Z';
export function executionJourneyFixture({domain='museum',sharedResult=false}={}){
 const museum=domain==='museum',noun=museum?'collection loan':'permit inspection';
 let p=createProject({name:'Authored '+noun+' journey',template:'blank'},'journey-'+domain,JOURNEY_FIXTURE_AT);
 p.workspace.seeding={state:'off'};p=withFinalReview(p);
 const ids={contractIds:[],dataIds:[],pathIds:[],processIds:[]},run=(fn,type,payload)=>{const r=fn(p,{type,payload},JOURNEY_FIXTURE_AT);p=r.document;return r.selected;};
 ids.requirementId=run(applyCommand,'artefact',{type:'requirement',title:'Retain one '+noun+' per operation',description:'Separate requests wait for their declared downstream calls. Each effect has its own stable identity and authority. Lost responses retain uncertainty.',acceptance:'Exercise the nested request and retry limits without conflating the submitted request, allocation and register entry.',owner:'Synthetic owner',source:'Original acceptance fixture; no operational evidence.'});
 ids.driverId=run(applyQualityCommand,'quality.driver',{kind:'business',title:'Bounded calls and separately owned effects',description:'Account for each waiting boundary, its repeat protection and result authority.',impact:'Repeated upstream attempts can repeat downstream invocations; each identity remains scoped.',requirementIds:[ids.requirementId],owner:'Synthetic architect',source:'Authored fixture'});
 const roles=[];
 for(const title of [museum?'Borrower portal':'Applicant portal',museum?'Loan coordinator':'Inspection coordinator',museum?'Collection allocation service':'Inspector allocation service',museum?'Collection register':'Permit register']){
  const purpose='Own the explicitly allocated '+title.toLowerCase()+' responsibility.';
  const logicalId=run(applyLogicalCommand,'logical.responsibility',{title,purpose,boundary:purpose,owner:'Synthetic team',source:'Authored fixture',requirementIds:[ids.requirementId]});
  roles.push(run(applyRealisationCommand,'realisation.component',{title,kind:'service',purpose,boundary:purpose,owner:'Synthetic team',inputs:'A versioned request with its own operation identity.',outputs:'Acceptance or the authoritative state of that exact operation.',source:'Authored fixture',rationale:'Preserve separate effect ownership.',allocations:[{logicalId,scope:purpose}]}));
 }
 ids.roles=roles;
 for(const [i,title] of ['Submit '+noun,'Allocate '+noun,'Record '+noun].entries()){
  const key=['request_id','allocation_id','entry_id'][i];
  const dataId=run(applyInterfacesCommand,'interfaces.data',{title:title+' parameters',purpose:'Carry this boundary’s own identity and intent.',owner:'Synthetic team',authorityId:roles[i],classification:'Internal',fields:[{name:key,type:'string',description:'Stable identity for this operation; different from upstream and downstream operations.',required:true,key:true},{name:'item_reference',type:'string',description:'The collection item or inspection application.',required:true}]});ids.dataIds.push(dataId);
  ids.contractIds.push(run(applyInterfacesCommand,'interfaces.contract',{title,from:roles[i],to:roles[i+1],kind:'request',purpose:'Accept this exact operation while waiting for its declared nested call.',owner:'Synthetic team',contractVersion:'v1',operation:'perform-'+i,protocol:'HTTPS',correlationKey:key,idempotencyKey:key,duplicatePolicy:'Retain the identity and effect atomically; reject changed intent.',timeoutPolicy:'Preserve unresolved outcome.',retryPolicy:'One declared retry owner at this request boundary.',failurePolicy:'Classify eligible transient failures and preserve uncertainty.',exchanges:[{dataId,role:'request'}],requirementIds:[ids.requirementId]}));
 }
 ids.environmentId=run(applyRuntimeCommand,'runtime.environment',{title:'Synthetic '+noun+' environment',stage:'Pre-production design',purpose:'Verify the explicit waiting and result contracts.',owner:'Synthetic operator',basis:'Authored design, not deployed.',assetIds:roles});
 for(const contractId of ids.contractIds)ids.pathIds.push(run(applyRuntimeCommand,'runtime.path',{environmentId:ids.environmentId,contractId,owner:'Synthetic operator',route:'Exact request contract in the named environment.',mode:'required',failureResponse:'Retain uncertainty and honor cancellation.',requirementIds:[ids.requirementId]}));
 for(const [i,contractId] of ids.contractIds.entries()){
  const [maxAttempts,attemptTimeoutMs,backoffBudgetMs,callerBudgetMs]=[[3,2000,200,6200],[2,700,100,1500],[4,100,100,500]][i];
  run(applyInterfacesCommand,'interfaces.contract',{id:contractId,execution:{schemaVersion:1,environmentId:ids.environmentId,delivery:'best-effort',repetition:'possible',identity:'stable',protection:'atomic-deduplication',repeatOwnerId:roles[i+1],changedIntent:'reject',timeout:'unresolved',completion:'acceptance',callerRetries:'bounded',maxAttempts,attemptTimeoutMs,backoffBudgetMs,callerBudgetMs,retryFailures:'transient-only',retryLayers:'one-owner',circuitBreaker:'caller',openCircuit:'stop',...(i?{invocationParentId:ids.contractIds[i-1]}:{})}});
 }
 for(const title of ['Request received','Allocation requested','Register updated'])ids.processIds.push(run(applyProcessCommand,'process.element',{kind:'task',title,owner:'Synthetic operator',purpose:'Describe the business flow without inferring a nested invocation.',requirementIds:[ids.requirementId]}));
 ids.flowId=run(applyProcessCommand,'process.transition',{from:ids.processIds[0],to:ids.processIds[1],kind:'sequence',label:'Allocate the requested item',contractId:ids.contractIds[1],owner:'Synthetic operator'});
 if(sharedResult){
  ids.queryDataId=run(applyInterfacesCommand,'interfaces.data',{title:noun+' result query',authorityId:roles[0],owner:'Synthetic team',classification:'Internal',fields:[{name:'result_operation_id',type:'string',description:'The submitted operation identity, mapped explicitly.',required:true,key:true}]});
  ids.resultDataId=run(applyInterfacesCommand,'interfaces.data',{title:noun+' authoritative state',authorityId:roles[3],owner:'Synthetic team',classification:'Internal',fields:[{name:'result_operation_id',type:'string',description:'Original submitted operation identity.',required:true,key:true},{name:'business_state',type:'string',description:'Authoritative pending or terminal state.',required:true,enumeration:'PENDING\nCOMPLETED\nREJECTED'}]});
  ids.resultId=run(applyInterfacesCommand,'interfaces.contract',{title:'Read '+noun+' state',kind:'request',from:roles[0],to:roles[3],contractVersion:'result-v1',purpose:'Return the authoritative state for the named submission.',owner:'Synthetic register team',correlationKey:'result_operation_id',exchanges:[{dataId:ids.queryDataId,role:'request'},{dataId:ids.resultDataId,role:'response'}],requirementIds:[ids.requirementId]});
  ids.resultPathId=run(applyRuntimeCommand,'runtime.path',{environmentId:ids.environmentId,contractId:ids.resultId,owner:'Synthetic operator',route:'Requester to register status boundary.',mode:'required',failureResponse:'Keep an unavailable result unresolved.'});
  const root=p.interfaces.contracts.find(c=>c.id===ids.contractIds[0]);
  ids.siblingId=run(applyInterfacesCommand,'interfaces.contract',{title:'Revise '+noun+' request',kind:'request',from:root.from,to:root.to,contractVersion:'revise-v1',purpose:'Submit a distinct revision operation with its own result.',owner:'Synthetic team',correlationKey:root.correlationKey,idempotencyKey:root.idempotencyKey,exchanges:root.exchanges,execution:{...root.execution},requirementIds:[ids.requirementId]});
  ids.siblingPathId=run(applyRuntimeCommand,'runtime.path',{environmentId:ids.environmentId,contractId:ids.siblingId,owner:'Synthetic operator',route:'Exact revision request.',mode:'required',failureResponse:'Preserve unresolved state.'});
  for(const id of [root.id,ids.siblingId]){const c=p.interfaces.contracts.find(c=>c.id===id);run(applyInterfacesCommand,'interfaces.contract',{id,execution:{...c.execution,completion:'business-outcome',discovery:'authoritative-status',outcomeContractId:ids.resultId,outcomeAuthorityId:roles[3],outcomeMeaning:'business-outcome',outcomeCorrelation:'same-operation',outcomeResultKey:'business_state'}});}
 }
 return {document:withFinalReview(p),ids};
}
