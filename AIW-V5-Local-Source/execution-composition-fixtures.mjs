// Original synthetic acceptance fixtures. Native commands author every design
// record; no customer deployment, benchmark or measured result is implied.
import {createProject} from './shared/projects-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyLogicalCommand} from './public/logical-domain.js';
import {applyRealisationCommand} from './public/realisation-domain.js';
import {applyInterfacesCommand} from './public/interfaces-domain.js';
import {applyRuntimeCommand} from './public/runtime-domain.js';
import {withFinalReview} from './public/review-domain.js';

export const EXECUTION_FIXTURE_AT='2026-10-20T00:00:00.000Z';
export function executionCompositionFixture(overrides={}){
 let p=createProject({name:'Authored payment composition',template:'blank'},'execution-composition-fixture',EXECUTION_FIXTURE_AT);
 p.workspace.seeding={state:'off'};p=withFinalReview(p);
 const run=(fn,type,payload)=>{const r=fn(p,{type,payload},EXECUTION_FIXTURE_AT);p=r.document;return r.selected;};
 const requirementId=run(applyCommand,'artefact',{type:'requirement',title:'Retain one authoritative payment outcome',description:'A committed payment instruction must remain deliverable. A repeated instruction must not post a second effect. An absent response retains an unresolved outcome until the business authority is consulted.',acceptance:'Exercise loss before publication, repeated delivery, changed intent under one identity, and a lost completion response.',owner:'Synthetic payment owner',source:'Original authored regression scenario; no production evidence.'});
 const driverId=run(applyQualityCommand,'quality.driver',{kind:'business',title:'One permitted posting and a discoverable result',description:'Retain the committed instruction, protect its business effect and discover its authoritative outcome.',impact:'The delivery channel, effect owner and status authority have distinct responsibilities.',requirementIds:[requirementId],owner:'Synthetic architect',source:'Authored scenario',confirmed:false});
 const roles={};
 for(const [role,title,purpose] of [['producer','Payment instruction service','Own the instruction and its retained publication intent.'],['consumer','Posting authority','Own the permitted posting, retained operation identity and authoritative result.']]){
  const logicalId=run(applyLogicalCommand,'logical.responsibility',{title,purpose,boundary:purpose,owner:'Synthetic team',source:'Authored scenario',requirementIds:[requirementId]});
  roles[role]=run(applyRealisationCommand,'realisation.component',{title,kind:'service',purpose,boundary:purpose,owner:'Synthetic team',inputs:'Versioned instruction and original operation identity.',outputs:'Retained instruction or authoritative business result.',source:'Authored scenario',rationale:'Keep the declared source and effect authority explicit.',allocations:[{logicalId,scope:purpose}]});
 }
 const dataId=run(applyInterfacesCommand,'interfaces.data',{title:'Payment instruction payload',purpose:'Carry one operation identity and its business parameters.',authorityId:roles.producer,owner:'Synthetic team',classification:'Internal',fields:[{name:'operation_id',type:'string',description:'Stable identity retained across retries of the same intent.',required:true,key:true},{name:'amount_minor',type:'integer',description:'Authored amount in minor units; a changed amount is changed intent.',required:true}]});
 const contractId=run(applyInterfacesCommand,'interfaces.contract',{title:'Post the committed payment instruction',from:roles.producer,to:roles.consumer,kind:'event',purpose:'Carry retained instruction intent to its effect-owning authority.',owner:'Synthetic team',contractVersion:'payment-instruction-v1',operation:'post-instruction',protocol:'Versioned asynchronous contract',correlationKey:'operation_id',idempotencyKey:'operation_id',duplicatePolicy:'Atomically record the operation identity and posting; reject changed parameters.',failurePolicy:'Retain uncertainty and reconcile against the posting authority.',timeoutPolicy:'Missing response leaves the business outcome unresolved.',retryPolicy:'Retry only with the original identity under the agreed finite budget.',exchanges:[{dataId,role:'request'}],requirementIds:[requirementId]});
 const environmentId=run(applyRuntimeCommand,'runtime.environment',{title:'Payment test environment',stage:'Pre-production design',owner:'Synthetic operator',purpose:'Exercise the declared composition under controlled interruption.',basis:'Authored fixture; not a deployed environment.',assetIds:Object.values(roles),confirmed:false});
 const pathId=run(applyRuntimeCommand,'runtime.path',{environmentId,contractId,owner:'Synthetic operator',route:'Retained source intent through the declared delivery channel to the posting authority.',mode:'buffered',failureResponse:'Retain pending work; correlate retries and authoritative status by operation identity.',requirementIds:[requirementId]});
 run(applyInterfacesCommand,'interfaces.contract',{id:contractId,execution:{schemaVersion:1,environmentId,delivery:'required',publication:'atomic-commit',repetition:'possible',identity:'stable',protection:'atomic-deduplication',repeatOwnerId:roles.consumer,changedIntent:'reject',timeout:'unresolved',completion:'business-outcome',discovery:'authoritative-status',outcomeAuthorityId:roles.consumer,...overrides}});
 return {document:withFinalReview(p),ids:{requirementId,driverId,dataId,contractId,environmentId,pathId,...roles}};
}
