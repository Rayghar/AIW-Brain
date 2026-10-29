// Coordinated option continuation uses synthetic saved responses and the real
// native/Worker commands. This does not measure live model or browser quality.
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {intelligencePacket,adoptIntelligence} from './public/intelligence-context.js';
import {validateArchitectureOperations,operationContext,operationGroupMembers} from './public/architecture-operations.js';
import {operationDefaults} from './public/design-planner.js';
import {applyDesignCommand} from './public/design-task-domain.js';
import {designBasisCurrent,designBasisStamp,designBasis,designTaskMarkdown} from './public/design-task-state.js';
import {previewAlternative,applyAlternativeCommand} from './public/model-alternatives.js';
import {previewReversal} from './public/model-reversal.js';

const at='2026-10-20T18:00:00.000Z',base=()=>createProject({name:'Coordinated option QA',template:'bank-payment'},'coordinated-option');
export function groupRun(p,kinds=['responsibility','interaction','information-consistency','security','technology','deployment']){
 const packet=intelligencePacket(p,{chapter:1,objectId:'REQ-001',mode:'mind',architectureOperations:true,prompt:'Compare a coordinated response to the saved requirement.'});
 const refs=[...new Set(['S1',...packet.architectureOperations.requirementRefs.map(r=>r.ref)])];
 const operations=validateArchitectureOperations(kinds.map((kind,i)=>({id:'OP'+(i+1),optionId:'O2',optionTitle:'Coordinated native design',kind,title:'Proposed '+kind,intent:'Retain the stated outcome and its explicit ownership.',mechanism:'Use the reviewed native boundary and preserve unresolved evidence.',selectedSourceRef:'S1',requirementIds:['REQ-001'],affectedObjectIds:['REQ-001'],proposedObjects:['Proposed '+kind],qualityEffects:[],conditions:['The explicitly selected references must remain current.'],tradeoffs:['Additional operating ownership is required.'],obligations:['Exercise the recorded failure and recovery scenarios.'],verification:{steps:['Interrupt the operation after its authoritative effect.'],passCriteria:['The effect remains discoverable without an additional effect.']},reconsiderWhen:['The saved business or operating boundary changes.'],sourceRefs:refs,assumptions:['Implementation has not been verified.']})),packet);
 return {id:'run-coordinated-option',projectId:p.id,status:'completed',provider:'Synthetic fixture',model:'No live model',updatedAt:at,packet,groundingReview:{accepted:true,issues:[]},result:{title:'Coordinated proposal',summary:'An unselected option',passage:'Review all related changes.',sourceRefs:refs,assumptions:['Unverified'],questions:[],options:[],architectureOperations:operations}};
}
export function groupAnswers(p,t){
 const members=operationGroupMembers(p,t),draft=kind=>'draft:'+members.find(m=>m.operation.kind===kind).id,kind=t.operation.kind;
 return {...operationDefaults(p,t,'new'),title:'Coordinated '+kind,owner:'Architecture QA',scopeNote:'Realize the one native target explicitly named by this operation; its verification remains open.',rationale:'The reviewed requirement needs this boundary and the listed trade-offs remain visible.',...({
  responsibility:{purpose:'Own the instruction outcome.',boundary:'Own instruction integrity and outcome discovery.'},
  interaction:{purpose:'Send the instruction to its authority.',from:'api-pod',to:draft('technology'),kind:'request',operation:'Record and discover an instruction outcome.',duplicatePolicy:'Use the caller request identity.',timeoutPolicy:'Preserve unresolved status.',retryPolicy:'Resolve the outcome before repeating.'},
  'information-consistency':{dataIds:['instruction'],contractIds:[draft('interaction')],kind:'uniqueness',condition:'One authoritative outcome per request identity.',check:'Exercise concurrent duplicates at the receiver boundary.'},
  security:{category:'Transaction integrity',targetIds:[draft('interaction'),draft('technology')],threatIds:[],enforcement:'The authoritative write boundary',mechanism:'Reject reuse of an identity for changed intent.',failureMode:'Deny or contain',failureResponse:'Reject and record the reason.',verificationPlan:'Repeat an identity with changed intent and observe rejection.'},
  technology:{purpose:'Provide the declared durable boundary.',capabilityId:'postgres',optionTargetId:'new',optionTitle:'Explicit candidate service',product:'Unselected relational service',operatingModel:'Self managed',topology:'An explicit unmeasured topology proposal.'},
  deployment:{purpose:'Operate the declared outcome authority.',environmentId:'env-001',assetId:draft('technology'),stateMode:'Stateful service',rollout:'Drain work before replacement.',rollback:'Stop the rollout if outcome discovery fails.',readiness:'Check the authoritative outcome endpoint.',runbook:'The on-call owner resolves uncertain operations.'}
 }[kind])};
}
const start=(p,r)=>adoptIntelligence(p,{kind:'architecture-option',optionId:'O2'},r,at).document;
const save=(p,id,answers,dependencies=[])=>{const t=p.coauthoring.designTasks.find(x=>x.id===id);return applyDesignCommand(p,{type:'design.answers',payload:{id,taskRevision:t.revision,answers,dependencies,contextStamp:designBasisStamp(operationContext(p,t.operation.kind,answers,t))}},at).document;};
const prepare=(p,id=p.coauthoring.designTasks[0].id)=>{const t=p.coauthoring.designTasks.find(x=>x.id===id);return applyDesignCommand(p,{type:'design.prepare',payload:{id,taskRevision:t.revision}},at).document;};
const accept=p=>{const a=p.modelAlternatives.records.at(-1),q=previewAlternative(p,a);return applyAlternativeCommand(p,{type:'alternative.apply',payload:{id:a.id,alternativeRevision:a.revision,previewStamp:q.stamp,reviewed:true,reviewer:'Group QA',reason:'Reviewed all related operations, their exact targets and open obligations together.'}},at).document;};
const initial=base(),run=groupRun(initial),originalOperations=structuredClone(run.result.architectureOperations),originalProject=structuredClone(initial);
let p=start(initial,run),members=p.coauthoring.designTasks;
const originalGenerations=JSON.parse(JSON.stringify(members.map(t=>t.generation)));
assert.equal(members.length,6);assert.equal(start(p,run).coauthoring.designTasks.length,6);
assert.deepEqual(members.map(t=>t.operation),originalOperations);
for(const key of ['logical','realisation','technology','technologyRealisation','interfaces','security','runtime'])assert.deepEqual(p[key],initial[key]);
assert.throws(()=>adoptIntelligence(initial,{kind:'architecture-option',optionId:'O1'},run),/exact saved/);
assert.throws(()=>adoptIntelligence(initial,{kind:'architecture-option',optionId:'O2',operationId:'OP1'},run),/exact saved/);
const staleNew=structuredClone(initial);staleNew.artefacts.find(r=>r.id==='REQ-001').description+=' Changed requirement.';assert.throws(()=>start(staleNew,run),/source context changed/);
let independent=adoptIntelligence(initial,{kind:'architecture-operation',optionId:'O2',operationId:'OP2'},run,at).document;independent=save(independent,'DES-001',{...independent.coauthoring.designTasks[0].answers,owner:'Retained independent draft owner'});const joined=start(independent,run);assert.equal(joined.coauthoring.designTasks.length,6);assert.equal(joined.coauthoring.designTasks[0].id,'DES-001');assert.equal(joined.coauthoring.designTasks[0].answers.owner,'Retained independent draft owner');assert.deepEqual(operationGroupMembers(joined,joined.coauthoring.designTasks[0]).map(t=>t.operation.id),originalOperations.map(o=>o.id));
for(const t of members)p=save(p,t.id,groupAnswers(p,t));
assert(p.coauthoring.designTasks.every(t=>designBasisCurrent(p,t)));
const shaped=structuredClone(p),ready=prepare(p),alternative=ready.modelAlternatives.records.at(-1),q=previewAlternative(ready,alternative);
assert.equal(alternative.design.family,'operation-group');assert.equal(q.operationMembers.length,6);assert.deepEqual([...q.previewChapters].sort((a,b)=>a-b),[4,7,8,9,10]);
const byKind=kind=>q.operationMembers.find(m=>ready.coauthoring.designTasks.find(t=>t.id===m.taskId).operation.kind===kind),tech=byKind('technology'),contract=byKind('interaction'),invariant=byKind('information-consistency'),security=byKind('security'),runtime=byKind('deployment');
assert.equal(q.document.interfaces.contracts.find(c=>c.id===contract.selected).to,tech.selected);
assert.deepEqual(q.document.interfaces.invariants.find(c=>c.id===invariant.selected).contractIds,[contract.selected]);
assert.deepEqual(q.document.security.controls.find(c=>c.id===security.selected).targetIds,[contract.selected,tech.selected]);
assert.equal(q.document.runtime.plans.find(c=>c.id===runtime.selected).assetId,tech.selected);
assert(q.operationMembers.findIndex(m=>m.taskId===tech.taskId)<q.operationMembers.findIndex(m=>m.taskId===contract.taskId));
assert(!JSON.stringify(q.executed).includes('draft:'));
for(const key of ['logical','technologyRealisation','interfaces','security','runtime'])assert.deepEqual(ready[key],initial[key],'A joined preview cannot mutate '+key);
const applied=accept(ready);
assert(applied.coauthoring.designTasks.every(t=>t.status==='applied'&&t.applied.alternativeId===alternative.id&&designBasisCurrent(applied,t)));
assert.deepEqual(applied.coauthoring.designTasks.map(t=>t.operation),originalOperations);
assert.deepEqual(applied.coauthoring.designTasks.map(({generation:{reviewed,...original}})=>original),originalGenerations);
assert(applied.coauthoring.designTasks.every(t=>t.applied.records.every(r=>r.taskIds.includes(t.id))));
assert(applied.coauthoring.designTasks.every(t=>t.applied.reviewAuthority.governanceApproval===false));
assert.equal(applied.technologyRealisation.records.find(r=>r.id===tech.selected).selectedOptionId,null);
assert.equal(applied.security.evidence.length,initial.security.evidence.length);
assert.match(designTaskMarkdown(applied),/coordinated option/i);
const accepted=applied.modelAlternatives.records.at(-1),reversal=previewReversal(applied,accepted);assert(reversal.allowed);
const undone=applyAlternativeCommand(applied,{type:'alternative.rollback',payload:{id:accepted.id,alternativeRevision:accepted.revision,previewStamp:reversal.stamp,reviewed:true,reviewer:'Group QA',reason:'Restore the complete synthetic option as one reviewed reversal.'}},at).document;
assert(undone.coauthoring.designTasks.every(t=>t.status==='dismissed'&&t.reverted));
for(const domain of reversal.domains){const clean=d=>{const r=structuredClone(d);delete r.version;delete r.counter;delete r.counters;return r;};assert.deepEqual(clean(undone[domain]),clean(initial[domain]));}
console.log('PASS coordinated native option: exact group identity, idempotent resume, six editable operations, typed dependency resolution, joined preview, atomic acceptance, immutable original operations and whole-group reversal.');

// Missing, wrong-kind, foreign and cyclic dependencies fail before publication.
let invalid=structuredClone(shaped),t=invalid.coauthoring.designTasks.find(t=>t.operation.kind==='interaction');
assert.throws(()=>save(invalid,t.id,{...t.answers,to:'draft:DES-999'}),/Choose current records/);
assert.throws(()=>save(invalid,t.id,{...t.answers,to:'draft:'+invalid.coauthoring.designTasks[0].id}),/Choose current records/);
assert.throws(()=>save(invalid,t.id,t.answers,[t.id]),/prerequisites/);
const dep=invalid.coauthoring.designTasks.find(t=>t.operation.kind==='technology');invalid=save(invalid,dep.id,dep.answers,[t.id]);assert.throws(()=>prepare(invalid),/dependency cycle/);
const omitted=structuredClone(alternative);omitted.design.members.pop();assert.throws(()=>previewAlternative(ready,omitted),/every exact operation/);
assert.throws(()=>prepare(start(initial,run)),/Choose an existing/);
assert.throws(()=>previewAlternative(ready,{...alternative,design:{family:'operation',answers:ready.coauthoring.designTasks[0].answers}}),/every related operation together/);
let overlapping=start(initial,groupRun(initial,['recovery','deployment']));for(const member of overlapping.coauthoring.designTasks){const answers={...operationDefaults(overlapping,member,initial.runtime.plans[0].id),owner:'Runtime QA',scopeNote:'Review the exact runtime target.',rationale:'Preserve its declared operating obligations.',stateMode:'Stateful service',runbook:'Resolve the outcome before retry.',...(member.operation.kind==='recovery'?{recoveryStrategy:'Restart',recoveryPlan:'Recover the authoritative state.'}:{rollout:'Drain active operations.',rollback:'Stop on lost outcome discovery.',readiness:'Read the authoritative outcome.'})};overlapping=save(overlapping,member.id,answers);}assert.throws(()=>prepare(overlapping),/same native target/);assert.deepEqual(overlapping.runtime,initial.runtime);
invalid=structuredClone(ready);invalid.coauthoring.designTasks.find(t=>t.id===tech.taskId).answers.title+=' changed without current preview';assert.throws(()=>previewAlternative(invalid,alternative),/draft.*changed/);
invalid=structuredClone(ready);invalid.artefacts.find(r=>r.id==='REQ-001').description+=' Changed customer obligation.';assert.throws(()=>previewAlternative(invalid,alternative),/changed sources/);
assert.throws(()=>applyAlternativeCommand(ready,{type:'alternative.apply',payload:{id:alternative.id,alternativeRevision:alternative.revision,previewStamp:q.stamp,reviewed:false,reviewer:'QA',reason:'Must fail'}}),/Review every/);
const changedTask=shaped.coauthoring.designTasks[2],edited=save(ready,changedTask.id,{...changedTask.answers,check:'Revised proposed test at the authority.'});assert.equal(edited.modelAlternatives.records.at(-1).status,'archived');assert(edited.coauthoring.designTasks.every(t=>!t.alternativeIds.includes(alternative.id)));assert.throws(()=>applyAlternativeCommand(edited,{type:'alternative.apply',payload:{id:alternative.id,alternativeRevision:alternative.revision,previewStamp:q.stamp,reviewed:true,reviewer:'QA',reason:'Must fail'}}),/changed|archived/);
const reviewedTask=invalid.coauthoring.designTasks[0],basis=designBasis(invalid,reviewedTask.requirementId,undefined,undefined,undefined,reviewedTask.basis.contextIds),reviewed=applyDesignCommand(invalid,{type:'design.source-review',payload:{id:reviewedTask.id,taskRevision:reviewedTask.revision,basisStamp:designBasisStamp(basis),reviewed:true,reviewer:'QA',reason:'Review this changed source; other member reviews remain open.'}},at).document;
assert.deepEqual(reviewed.coauthoring.designTasks[0].operation,originalOperations[0]);assert.throws(()=>prepare(reviewed),/changed sources/);
assert.deepEqual(initial,originalProject);
console.log('PASS coordinated guards: missing or wrong-kind draft output, self/cyclic dependencies, partial option, changed draft, changed driver basis, explicit acceptance and sibling proposal invalidation.');

// Exercise adoption, all edits, combined preparation, acceptance, reload and
// reversal through the real in-memory private Worker command route.
const {default:worker}=await import('./worker.js'),{localDatabase}=await import('./local-db.js');
const files=new Map(),env={DB:localDatabase(':memory:'),FILES:{async put(k,v){files.set(k,v)},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}},ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body,owner='group-owner')=>worker.fetch(new Request('https://aiw.test'+path,{method,headers:{'oai-authenticated-user-id':owner,Origin:'https://aiw.test','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);
try{
 let state=await(await api('/api/project')).json(),r={...groupRun(state.document),id:crypto.randomUUID()},key='intelligence/group-owner/'+r.projectId+'/'+r.id+'.json';files.set(key,JSON.stringify(r));
 await env.DB.prepare("INSERT INTO intelligence_runs(owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens,used_tokens) VALUES(?,?,?,?,? ,?,'completed',?,?,?,?,?,?,0,0)").bind('group-owner',r.id,r.projectId,r.packet.context.id,'mind',r.packet.stamp,r.provider,r.model,key,at,at,'group-owner').run();
 const command=async c=>{const response=await api('/api/commands','POST',{revision:state.revision,command:c});assert.equal(response.status,200,await response.clone().text());state=await response.json();return state;},adopt={type:'intelligence.adopt',payload:{kind:'architecture-option',runId:r.id,optionId:'O2'}};
 await api('/api/project','GET',undefined,'other-owner');assert.equal((await api('/api/commands','POST',{revision:1,command:adopt},'other-owner')).status,400);
 const originalRevision=state.revision,race=await Promise.all([api('/api/commands','POST',{revision:originalRevision,command:adopt}),api('/api/commands','POST',{revision:originalRevision,command:adopt})]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);state=await race.find(r=>r.status===200).json();const ids=state.document.coauthoring.designTasks.map(t=>t.id);await command(adopt);assert.deepEqual(state.document.coauthoring.designTasks.map(t=>t.id),ids);assert.equal((await api('/api/commands','POST',{revision:originalRevision,command:adopt})).status,409);
 for(const id of ids){const task=state.document.coauthoring.designTasks.find(t=>t.id===id),answers=groupAnswers(state.document,task),edit={type:'design.answers',payload:{id,taskRevision:task.revision,answers,dependencies:[],contextStamp:designBasisStamp(operationContext(state.document,task.operation.kind,answers,task))}};await command(edit);if(id===ids[0]){const conflict=await api('/api/commands','POST',{revision:state.revision,command:edit});assert.equal(conflict.status,400);assert.match((await conflict.json()).error,/task changed/);}}
 const task=state.document.coauthoring.designTasks[0];await command({type:'design.prepare',payload:{id:task.id,taskRevision:task.revision}});const alt=state.document.modelAlternatives.records.at(-1),preview=previewAlternative(state.document,alt);
 await command({type:'alternative.apply',payload:{id:alt.id,alternativeRevision:alt.revision,previewStamp:preview.stamp,reviewed:true,reviewer:'Worker QA',reason:'Review the complete related native option.'}});
 state=await(await api('/api/project')).json();assert(state.document.coauthoring.designTasks.every(t=>t.status==='applied'&&designBasisCurrent(state.document,t)));assert.deepEqual(state.document.coauthoring.designTasks.map(t=>t.operation),r.result.architectureOperations);
 const acceptedHistory=structuredClone(state.document.coauthoring.designTasks);await command(adopt);assert.deepEqual(state.document.coauthoring.designTasks,acceptedHistory,'Resume retains the complete accepted history without replaying native changes');
 const appliedAlternative=state.document.modelAlternatives.records.at(-1),undo=previewReversal(state.document,appliedAlternative);assert(undo.allowed);await command({type:'alternative.rollback',payload:{id:appliedAlternative.id,alternativeRevision:appliedAlternative.revision,previewStamp:undo.stamp,reviewed:true,reviewer:'Worker QA',reason:'Undo the complete related synthetic design.'}});
 state=await(await api('/api/project')).json();assert(state.document.coauthoring.designTasks.every(t=>t.status==='dismissed'&&t.reverted));
 const revertedHistory=structuredClone(state.document.coauthoring.designTasks);await command(adopt);assert.deepEqual(state.document.coauthoring.designTasks,revertedHistory);assert.equal(state.document.coauthoring.designTasks.length,ids.length);
 console.log('PASS private Worker group lifecycle: owner isolation, saved run/option identity, idempotent resume, CAS, all native edits, joined acceptance, persisted receipts and complete reversal.');
}finally{env.DB.close();}
