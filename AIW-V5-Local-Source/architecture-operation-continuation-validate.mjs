// Native operation continuation; synthetic project and receipts, no provider or browser.
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {intelligencePacket,adoptIntelligence} from './public/intelligence-context.js';
import {ARCHITECTURE_OPERATION_KINDS,validateArchitectureOperations,operationContext} from './public/architecture-operations.js';
import {operationDefaults} from './public/design-planner.js';
import {applyDesignCommand} from './public/design-task-domain.js';
import {designBasisCurrent,designBasisStamp,designBasis,designTaskMarkdown} from './public/design-task-state.js';
import {previewAlternative,applyAlternativeCommand} from './public/model-alternatives.js';
import {previewReversal} from './public/model-reversal.js';
import {applyInterfacesCommand} from './public/interfaces-domain.js';
import {applyLogicalCommand} from './public/logical-domain.js';
const base=()=>createProject({name:'Operation continuation',template:'bank-payment'},'operation-continuation');
const at='2026-10-20T00:00:00.000Z';
function fixture(p,kind,optionId='O2',id='OP2'){
 const requirementId=p.artefacts.find(r=>r.type==='requirement').id,packet=intelligencePacket(p,{chapter:1,objectId:requirementId,mode:'mind',architectureOperations:true,prompt:'Compare changes and preserve unresolved verification.'}),driver=packet.architectureOperations.qualityScenarioIds[0],refs=[...new Set(['S1',...packet.architectureOperations.requirementRefs.map(r=>r.ref),...(driver?[packet.sources.find(s=>s.kind==='model'&&s.objectId===driver).ref]:[])])];
 const operation={id,optionId,optionTitle:'Explicit second alternative',kind,title:'Proposed '+kind+' continuation',intent:'Preserve one authorised outcome per accepted instruction.',mechanism:'Resolve the authoritative outcome before repeating a possibly completed effect.',requirementIds:[requirementId],affectedObjectIds:[requirementId],proposedObjects:['Outcome coordinator','Outcome lookup responsibility'],qualityEffects:driver?[{scenarioId:driver,effect:'unknown',basis:'Measured evidence remains required.'}]:[],conditions:['A stable request identity is available.'],tradeoffs:['Retaining durable outcomes adds operating cost.'],obligations:['Define and exercise changed-intent rejection.'],verification:{steps:['Lose an acknowledgement after a committed effect.'],passCriteria:['One effect and one discoverable authoritative outcome.']},reconsiderWhen:['The durability or identity boundary changes.'],sourceRefs:refs,assumptions:['No test has run.'],selectedSourceRef:'S1'};
 const operations=validateArchitectureOperations([operation],packet);
 return {id:'run-'+kind,status:'completed',provider:'Synthetic fixture',model:'no-live-model',updatedAt:at,packet,result:{title:'Synthetic operations',summary:'Unselected',passage:'Review before adoption.',sourceRefs:refs,assumptions:['Unverified'],questions:['Who verifies this?'],options:[],architectureOperations:operations},groundingReview:{accepted:true,issues:[]}};
}
const adopt=(p,run)=>adoptIntelligence(p,{kind:'architecture-operation',runId:run.id,operationId:'OP2',optionId:'O2'},run,at).document;
function answers(p,t,target='new'){
 const kind=t.operation.kind,v={...operationDefaults(p,t,target),owner:'Architecture team',scopeNote:'The chosen native record realizes the outcome boundary. The separate lookup responsibility remains an explicit follow-up; no other proposed object is silently created.',rationale:'This preserves the stated invariant with unresolved capacity and recovery evidence.',...({
 responsibility:{boundary:'Own outcome recording and exclude retrying unknown effects.'},
 interaction:{from:'api-pod',to:'risk-engine',kind:'request',operation:'Obtain the authoritative instruction outcome.',failurePolicy:'Leave outcome unresolved and query the authority.',duplicatePolicy:'Return the recorded outcome for an identical request.',timeoutPolicy:'An absent acknowledgement leaves an unresolved outcome.',retryPolicy:'Only repeat after resolving the outcome.'},
 'information-consistency':{dataIds:['instruction'],contractIds:['rest'],kind:'uniqueness',condition:'One committed instruction outcome per stable request identity.',check:'Check identity uniqueness at the authority and exercise concurrent requests.'},
 security:{category:'Transaction integrity',targetIds:['rest'],threatIds:[],enforcement:'Authoritative instruction write boundary',mechanism:'Reject an identity reused with different intent.',failureMode:'Deny or contain',failureResponse:'Reject and retain an audit event.',verificationPlan:'Send the same identity with altered intent and observe rejection.'},
 technology:{capabilityId:'postgres',optionTargetId:'new',optionTitle:'Reviewed candidate '+kind,product:'Candidate relational service',operatingModel:'Self managed',topology:'Topology remains an explicit design assumption.'},
 recovery:{environmentId:'env-001',assetId:'api-pod',stateMode:'Stateless process',recoveryStrategy:'Restart',recoveryPlan:'Discover the recorded outcome before resuming processing.',runbook:'On-call owner follows the recorded outcome and escalates unresolved operations.'},
 deployment:{environmentId:'env-001',assetId:'api-pod',stateMode:'Stateless process',rollout:'Drain active operations before replacing a worker.',rollback:'Rollback if outcome discovery is unavailable.',readiness:'Serve only when the outcome authority is reachable.',runbook:'On-call operator observes and stops unsafe repetitions.',placementId:'new',zoneId:'zone-b',role:'standby',replicas:'2',capacityBasis:'Two copies are an unmeasured planning assumption.'}
 }[kind])};return v;
}
function save(p,v){const t=p.coauthoring.designTasks.at(-1);return applyDesignCommand(p,{type:'design.answers',payload:{id:t.id,taskRevision:t.revision,answers:v,contextStamp:designBasisStamp(operationContext(p,t.operation.kind,v))}},at).document;}
function prepare(p){const t=p.coauthoring.designTasks.at(-1);return applyDesignCommand(p,{type:'design.prepare',payload:{id:t.id,taskRevision:t.revision}},at).document;}
function accept(p){const a=p.modelAlternatives.records.at(-1),q=previewAlternative(p,a);return applyAlternativeCommand(p,{type:'alternative.apply',payload:{id:a.id,alternativeRevision:a.revision,previewStamp:q.stamp,reviewed:true,reviewer:'Continuation QA',reason:'Reviewed the selected native definition, its exact target and retained open scope.'}},at).document;}
for(const kind of Object.keys(ARCHITECTURE_OPERATION_KINDS)){
 let p=base(),initialProject=p,run=fixture(p,kind),original=structuredClone(p),started=adopt(p,run),t=started.coauthoring.designTasks.at(-1);
 assert.deepEqual(t.operation,run.result.architectureOperations[0]);assert.deepEqual(t.generation.sources,run.packet.sources);assert.equal(t.answers.targetId,'');assert(designBasisCurrent(started,t),'Starting a task must not invalidate its own sources');
 assert.equal(adopt(started,run).coauthoring.designTasks.length,1,'The exact run and operation reopen the existing task');
 for(const domain of ['logical','realisation','technology','technologyRealisation','interfaces','security','runtime'])assert.deepEqual(started[domain],original[domain],'Opening a task cannot change '+domain);
 assert.throws(()=>adoptIntelligence(p,{kind:'architecture-operation',operationId:'OP2',optionId:'O1'},run),/exact saved operation/);
 assert.throws(()=>adoptIntelligence(p,{kind:'architecture-operation',operationId:'OP2',optionId:'O2'},{...run,groundingReview:{accepted:false}}),/source-checked/);
 const target=['recovery','deployment'].includes(kind)?'run-001':'new',v=answers(started,t,target);p=save(started,v);const prepared=prepare(p),a=prepared.modelAlternatives.records.at(-1),q=previewAlternative(prepared,a);
 assert.equal(q.designTaskId,t.id);assert.equal(a.design.family,'operation');assert(q.hasChanges);assert.equal(q.source.chapter,ARCHITECTURE_OPERATION_KINDS[kind].chapter);assert.deepEqual(prepared.coauthoring.designTasks.at(-1).operation,t.operation);assert.deepEqual(prepared.interfaces,original.interfaces,'Preview is separate from the saved model');
 const noReview={id:a.id,alternativeRevision:a.revision,previewStamp:q.stamp,reviewed:false,reviewer:'QA',reason:'Should fail'};assert.throws(()=>applyAlternativeCommand(prepared,{type:'alternative.apply',payload:noReview}),/Review every/);
 const applied=accept(prepared),task=applied.coauthoring.designTasks.at(-1);assert.equal(task.status,'applied');assert.equal(task.operation.optionId,'O2');assert.equal(task.operation.id,'OP2');assert.equal(task.applied.reviewAuthority.governanceApproval,false);assert(designBasisCurrent(applied,task),'Accepted '+kind+' stays current against its own reviewed application');assert.match(designTaskMarkdown(applied),/Outcome lookup responsibility/);assert.match(designTaskMarkdown(applied),/One effect and one discoverable authoritative outcome/);
 if(kind==='technology'){const plan=applied.technologyRealisation.records.find(r=>r.id===q.selected);assert.equal(plan.selectedOptionId,null);assert.equal(plan.options.at(-1).product,v.product);assert.deepEqual(plan.options.at(-1).assessments,{});}
 if(kind==='security')assert.equal(applied.security.evidence.length,original.security.evidence.length);
 if(['deployment','recovery'].includes(kind))assert.equal(applied.runtime.evidence.length,original.runtime.evidence.length);
 if(kind==='information-consistency')assert.deepEqual(applied.interfaces.invariants.at(-1).dataIds,['instruction']);
 const accepted=applied.modelAlternatives.records.at(-1),undo=previewReversal(applied,accepted);assert(undo.allowed,kind+': '+undo.reason);assert(undo.domains.includes(kind==='security'?'security':['deployment','recovery'].includes(kind)?'runtime':kind==='technology'?'technologyRealisation':kind==='responsibility'?'logical':'interfaces'));
 const reverted=applyAlternativeCommand(applied,{type:'alternative.rollback',payload:{id:accepted.id,alternativeRevision:accepted.revision,previewStamp:undo.stamp,reviewed:true,reviewer:'Continuation QA',reason:'Undo the synthetic accepted proposal.'}},at).document;
 assert.equal(reverted.modelAlternatives.records.at(-1).status,'reverted');for(const domain of undo.domains){const clean=d=>{const out=structuredClone(d);delete out.version;delete out.counter;delete out.counters;return out;};assert.deepEqual(clean(reverted[domain]),clean(prepared[domain]),'Undo restores native '+domain+' content');}
 assert.deepEqual(initialProject,original,'The original fixture is untouched');
 console.log('PASS native continuation '+kind+': exact selected operation, editable typed proposal, explicit review, source retention, acceptance and reversal.');
}
// Explicit edits preserve unrelated nested definitions; concurrent changes do not silently rebase a typed draft.
let p=base();p.interfaces.contracts[0].execution={schemaVersion:1,delivery:'required',identity:'stable',timeout:'unresolved'};
let run=fixture(p,'interaction'),started=adopt(p,run),t=started.coauthoring.designTasks.at(-1),v=answers(started,t,'rest');
const changed=applyInterfacesCommand(started,{type:'interfaces.contract',payload:{id:'rest',purpose:'Concurrent contract purpose'}}).document;
assert.throws(()=>applyDesignCommand(changed,{type:'design.answers',payload:{id:t.id,taskRevision:t.revision,answers:v,contextStamp:designBasisStamp(operationContext(started,'interaction',v))}}),/changed/);
const prepared=prepare(save(started,v)),q=previewAlternative(prepared,prepared.modelAlternatives.records.at(-1));assert.deepEqual(q.document.interfaces.contracts.find(c=>c.id==='rest').execution,p.interfaces.contracts[0].execution);
assert.equal(q.document.interfaces.contracts.find(c=>c.id==='rest').id,'rest');
const duplicate=answers(started,t,'new');duplicate.title=p.interfaces.contracts[0].title;assert.throws(()=>prepare(save(started,duplicate)),/Explicitly choose/);
const fabricated={...v,targetId:'not-a-saved-contract'};assert.throws(()=>prepare(save(started,fabricated)),/target was removed/);
const stale=structuredClone(prepared);stale.artefacts.find(r=>r.id===t.requirementId).description+=' Changed obligation.';assert.throws(()=>previewAlternative(stale,stale.modelAlternatives.records.at(-1)),/sources.*changed/);
// Source review keeps the original operation and invalidates the old prepared alternative.
const staleTask=stale.coauthoring.designTasks.at(-1),basis=designBasis(stale,staleTask.requirementId,undefined,undefined,undefined,staleTask.basis.contextIds),reviewed=applyDesignCommand(stale,{type:'design.source-review',payload:{id:staleTask.id,taskRevision:staleTask.revision,basisStamp:designBasisStamp(basis),reviewed:true,reviewer:'Source QA',reason:'Review the revised requirement and retain this operation as a draft.'}},at).document;
assert.deepEqual(reviewed.coauthoring.designTasks.at(-1).operation,t.operation);assert.equal(reviewed.modelAlternatives.records.at(-1).status,'archived');assert(designBasisCurrent(reviewed,reviewed.coauthoring.designTasks.at(-1)));
console.log('PASS continuation guards: rejected option mismatch, unapproved source check, target/source revisions, duplicate names, fabricated target IDs, source review and exact nested execution preservation.');
// A known ID of the wrong type, or a child of another target, cannot pass the saved command boundary.
for(const [kind,target,patch] of [['interaction','rest',{from:'REQ-001'}],['information-consistency','new',{dataIds:['api-pod']}],['technology','tr-001',{optionTargetId:'TO-003'}],['deployment','run-001',{placementId:'PL-002'}]]){
 const original=base(),r=fixture(original,kind),draft=adopt(original,r),task=draft.coauthoring.designTasks.at(-1),v={...answers(draft,task,target),...patch};
 assert.throws(()=>save(draft,v),/Choose current records/,kind+' rejects a wrong-kind or foreign-parent reference');
}
const sourceChanged=structuredClone(p);sourceChanged.artefacts.find(r=>r.id===t.requirementId).description+=' Revised before continuation.';
assert.throws(()=>adopt(sourceChanged,run),/changed/);
// Merely reopening a confirmed responsibility must not deconfirm it. A changed definition does, and its review shows that consequence.
let confirmed=base();const existing=confirmed.logical.responsibilities.find(r=>r.id==='api');
confirmed=applyLogicalCommand(confirmed,{type:'logical.responsibility',payload:{id:existing.id,owner:existing.owner||'Architecture team',purpose:existing.purpose||'Receive an instruction.',boundary:existing.boundary||'Own instruction intake.',source:existing.source||'Reviewed requirement.',confirmed:true}},at).document;
const confirmedRun=fixture(confirmed,'responsibility'),confirmedDraft=adopt(confirmed,confirmedRun),confirmedTask=confirmedDraft.coauthoring.designTasks.at(-1),same={...operationDefaults(confirmedDraft,confirmedTask,'api'),scopeNote:'The existing responsibility already expresses the reviewed scope.',rationale:'Keep the existing definition and confirmation unchanged.'};
assert.throws(()=>prepare(save(confirmedDraft,same)),/no definition changes/);
assert.equal(confirmedDraft.logical.responsibilities.find(r=>r.id==='api').confirmed,true);
const revised=prepare(save(confirmedDraft,{...same,boundary:same.boundary+' Retain the authoritative outcome until reconciliation.'})),revisedPreview=previewAlternative(revised,revised.modelAlternatives.records.at(-1));
assert.equal(revisedPreview.document.logical.responsibilities.find(r=>r.id==='api').confirmed,false);assert(revisedPreview.fields.some(f=>f.key==='confirmed'&&f.before===true&&f.after===false));
assert.equal(revisedPreview.document.logical.responsibilities.find(r=>r.id==='api').source,confirmed.logical.responsibilities.find(r=>r.id==='api').source);
console.log('PASS typed-reference and confirmation guards: wrong-kind/foreign-parent IDs refused, changed saved-run sources refused, unchanged confirmation retained and changed definition explicitly deconfirmed.');
// Actual Worker command route, authenticated owner scope, private storage and optimistic concurrency.
const {default:worker}=await import('./worker.js'),{localDatabase}=await import('./local-db.js');
const files=new Map(),env={DB:localDatabase(':memory:'),FILES:{async put(k,v){files.set(k,v)},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}},ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body,owner='operation-owner')=>worker.fetch(new Request('https://aiw.test'+path,{method,headers:{'oai-authenticated-user-id':owner,Origin:'https://aiw.test','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);
try{
 let state=await(await api('/api/project')).json(),run=fixture(state.document,'security');run={...run,id:crypto.randomUUID(),projectId:state.document.id};const key='intelligence/operation-owner/'+run.projectId+'/'+run.id+'.json';files.set(key,JSON.stringify(run));
 await env.DB.prepare("INSERT INTO intelligence_runs(owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens,used_tokens) VALUES(?,?,?,?,? ,?,'completed',?,?,?,?,?,?,0,0)").bind('operation-owner',run.id,run.projectId,run.packet.context.id,'mind',run.packet.stamp,run.provider,run.model,key,at,at,'operation-owner').run();
 const raw={type:'intelligence.adopt',payload:{kind:'architecture-operation',runId:run.id,operationId:'OP2',optionId:'O2'}};
 await api('/api/project','GET',undefined,'another-owner');let response=await api('/api/commands','POST',{revision:1,command:raw},'another-owner');assert.equal(response.status,400);assert.match((await response.json()).error,/saved response/);
 response=await api('/api/commands','POST',{revision:state.revision,command:{...raw,payload:{...raw.payload,optionId:'O1'}}});assert.equal(response.status,400);
 const beforeRevision=state.revision;response=await api('/api/commands','POST',{revision:state.revision,command:raw});assert.equal(response.status,200,await response.clone().text());state=await response.json();const savedId=state.selected;assert.equal(state.document.coauthoring.designTasks.at(-1).kind,'operation');
 response=await api('/api/commands','POST',{revision:state.revision,command:raw});assert.equal(response.status,200,await response.clone().text());state=await response.json();assert.equal(state.selected,savedId);assert.equal(state.document.coauthoring.designTasks.length,1);
 response=await api('/api/commands','POST',{revision:beforeRevision,command:raw});assert.equal(response.status,409);
 const reloaded=await(await api('/api/project')).json();assert.deepEqual(reloaded.document.coauthoring.designTasks[0].operation,run.result.architectureOperations[0]);assert.deepEqual(reloaded.document.coauthoring.designTasks[0].generation.sources,run.packet.sources);
 const {adoptSavedIntelligence}=await import('./intelligence-service.js');await assert.rejects(()=>adoptSavedIntelligence(env,'operation-owner','different-project',state.document,raw.payload,at),/saved response/);
 console.log('PASS saved-run Worker continuation: owner/project isolation, exact selected operation, private task/source round trip, idempotent resume and stale revision rejection.');
}finally{env.DB.close();}
