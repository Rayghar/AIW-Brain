// Authored synthetic saved responses exercise the real native design lifecycle.
// This measures neither live-model quality nor browser layout nor a deployed service.
import assert from 'node:assert/strict';
import {outcomeContractFixture,OUTCOME_FIXTURE_AT as at} from './outcome-contract-fixtures.mjs';
import {intelligencePacket,adoptIntelligence} from './public/intelligence-context.js';
import {validateArchitectureOperations,operationContext,operationDependencies,operationReferenceLists} from './public/architecture-operations.js';
import {operationDefaults} from './public/design-planner.js';
import {applyDesignCommand} from './public/design-task-domain.js';
import {designBasisStamp,designBasisCurrent} from './public/design-task-state.js';
import {previewAlternative,applyAlternativeCommand} from './public/model-alternatives.js';
import {previewReversal} from './public/model-reversal.js';
import {applyInterfacesCommand,interfaceFindings,exportInterfacesMarkdown} from './public/interfaces-domain.js';
import {assessContractExecution,contractExecutionContext,executionMethodSource} from './public/architecture-applicability.js';
import {architectureIntelligence,architectureIntelligenceSource,architectureIntelligenceCurrent} from './public/architecture-intelligence.js';
import {interfacesProjection} from './public/interfaces-model.js';
import {sddDocument} from './public/sdd-document.js';
import {architectureMarkdown} from './public/sdd-architecture.js';
import {applyKnowledgeCommand,knowledgeImpactStamp} from './public/knowledge-governance.js';
import {applyCommand} from './public/requirements-domain.js';
import {applyRequirementsCommand} from './public/requirement-commands.js';
import {scopedDocument} from './public/module-lens.js';

const contract=(p,id)=>p.interfaces.contracts.find(c=>c.id===id);
const read=(p,id)=>assessContractExecution(contract(p,id),contractExecutionContext(p,contract(p,id)));
const executionText=p=>sddDocument(p,{figures:false}).markdown.split('## Execution agreements and authoritative outcomes\n\n')[1]?.split('\n## ')[0]||'';
function proposalFixture(domain='payment',kind='request'){
 const {document,ids}=outcomeContractFixture({domain,kind}),execution={...contract(document,ids.contractId).execution};
 for(const key of ['outcomeContractId','outcomeMeaning','outcomeCorrelation','outcomeResultKey'])delete execution[key];
 // Explicit zero is a saved fact and must survive an unrelated native refinement.
 execution.callerRetries='none';execution.circuitBreaker='none';execution.backoffBudgetMs=0;
 const p=applyInterfacesCommand(document,{type:'interfaces.contract',payload:{id:ids.contractId,execution}},at).document;
 const packet=intelligencePacket(p,{chapter:8,objectId:ids.contractId,mode:'mind',architectureOperations:true,prompt:'Compare a coordinated submission agreement and authoritative result agreement. Preserve unresolved outcomes and unverified implementation.'});
 const refs=[...new Set(['S1',...packet.architectureOperations.requirementRefs.map(r=>r.ref)])];
 const operations=validateArchitectureOperations(['Submission outcome discovery','Authoritative result contract'].map((title,i)=>({id:'OP'+(i+1),optionId:'O2',optionTitle:'Explicit authoritative result discovery',kind:'interaction',title,intent:'Keep submission acceptance and final business outcome distinct.',mechanism:'Correlate the original operation with a separately owned result under a versioned agreement.',selectedSourceRef:'S1',requirementIds:[ids.requirementId],affectedObjectIds:[ids.contractId],proposedObjects:[title],qualityEffects:[],conditions:['The result authority, correlation semantics and operating path must remain explicit.'],tradeoffs:['The independent result boundary requires an owner and operating verification.'],obligations:['Exercise missing responses, pending results and changed operation intent.'],verification:{steps:['Lose submission and result responses after acceptance.'],passCriteria:['Retain the original operation identity and discover its authoritative business state.']},reconsiderWhen:['Either contract or its supporting result dictionary changes.'],sourceRefs:refs,assumptions:['No implementation or measured result has been verified.']})),packet);
 const run={id:'synthetic-outcome-'+domain+'-'+kind,projectId:p.id,status:'completed',provider:'Authored synthetic fixture',model:'No live provider',updatedAt:at,packet,groundingReview:{accepted:true,issues:[]},result:{title:'Related outcome agreements',summary:'An unselected two-contract option',passage:'Review both native contracts and their pending verification together.',sourceRefs:refs,assumptions:['Synthetic authored response; no model evaluation.'],questions:[],options:[],architectureOperations:operations}};
 return {document:p,ids,run};
}
const start=(p,run)=>adoptIntelligence(p,{kind:'architecture-option',optionId:'O2'},run,at).document;
const save=(p,id,answers)=>{const t=p.coauthoring.designTasks.find(t=>t.id===id);return applyDesignCommand(p,{type:'design.answers',payload:{id,taskRevision:t.revision,answers,dependencies:[],contextStamp:designBasisStamp(operationContext(p,t.operation.kind,answers,t))}},at).document;};
const prepare=p=>{const t=p.coauthoring.designTasks[0];return applyDesignCommand(p,{type:'design.prepare',payload:{id:t.id,taskRevision:t.revision}},at).document;};
function answers(p,t,ids){
 const result=t.operation.id==='OP2',sibling=p.coauthoring.designTasks.find(t=>t.operation.id==='OP2');
 return {...operationDefaults(p,t,result?ids.outcomeContractId:ids.contractId),owner:'Synthetic '+(result?'result':'submission')+' architect',scopeNote:'Refine this exact saved contract; retain the declared operating environment and pending implementation obligations.',rationale:'The customer needs discoverable authoritative business state after submission acceptance.',...(result?{contractVersion:'result-v2'}:{'execution.outcomeContractId':'draft:'+sibling.id,'execution.outcomeCorrelation':'same-operation','execution.outcomeMeaning':'business-outcome','execution.outcomeResultKey':'business_state'})};
}
function ready(f){let p=start(f.document,f.run);for(const t of p.coauthoring.designTasks)p=save(p,t.id,answers(p,t,f.ids));return prepare(p);}
function accept(p){const a=p.modelAlternatives.records.at(-1),q=previewAlternative(p,a);return applyAlternativeCommand(p,{type:'alternative.apply',payload:{id:a.id,alternativeRevision:a.revision,previewStamp:q.stamp,reviewed:true,reviewer:'Synthetic journey reviewer',reason:'Reviewed both exact native contracts, the explicit result link and all pending verification as one option.'}},at).document;}

for(const [domain,kind] of [['payment','request'],['fulfilment','event']]){
 const f=proposalFixture(domain,kind),{ids,run}=f,original=structuredClone(f.document),operations=structuredClone(run.result.architectureOperations),initialReading=read(original,ids.contractId);
 assert.equal(initialReading.state,'needs-context');assert.match(executionText(original),/Current reading: unknown/);
 const proposed=ready(f),a=proposed.modelAlternatives.records.at(-1),q=previewAlternative(proposed,a),[submission,result]=proposed.coauthoring.designTasks;
 assert.deepEqual(operationDependencies(submission),[result.id]);assert.equal(q.operationMembers[0].taskId,result.id);
 assert.equal(q.operationMembers.length,2);assert.equal(q.changes.length,2);assert.deepEqual(proposed.interfaces,original.interfaces,'Combined preview cannot mutate either canonical contract');
 assert.equal(contract(q.document,ids.contractId).execution.outcomeContractId,ids.outcomeContractId);assert.equal(contract(q.document,ids.outcomeContractId).contractVersion,'result-v2');assert(!JSON.stringify(q.executed).includes('draft:'));
 assert.equal(read(q.document,ids.contractId).state,'context-match',JSON.stringify(read(q.document,ids.contractId).reasons));
 const applied=accept(proposed),accepted=applied.modelAlternatives.records.at(-1),c=contract(applied,ids.contractId),outcome=contract(applied,ids.outcomeContractId),reading=architectureIntelligence(applied,{chapter:8,id:ids.contractId}),source=architectureIntelligenceSource(reading,{maxCharacters:12000});
 assert(applied.coauthoring.designTasks.every(t=>t.status==='applied'&&designBasisCurrent(applied,t)));assert.deepEqual(applied.coauthoring.designTasks.map(t=>t.operation),operations);
 assert.equal(c.execution.backoffBudgetMs,0);assert.equal(c.execution.publication,original.interfaces.contracts[0].execution.publication);assert.deepEqual(c.exchanges,contract(original,ids.contractId).exchanges);assert.deepEqual(outcome.exchanges,contract(original,ids.outcomeContractId).exchanges);assert(!outcome.execution,'A result contract need not recursively discover its own outcome');
 assert(!interfaceFindings(applied).some(x=>x.code==='execution'));assert(read(applied,ids.contractId).obligations.every(o=>o.verification==='pending'));
 assert(interfacesProjection(applied,{nodes:[],edges:[]}).edges.some(e=>e.from===ids.contractId&&e.to===ids.outcomeContractId&&e.outcomeDiscovery));
 const sdd=executionText(applied);for(const ref of [c.ref,outcome.ref,ids.pathId,ids.outcomePathId,applied.runtime.environments.find(e=>e.id===ids.environmentId).ref,applied.interfaces.data.find(d=>d.id===ids.resultDataId).ref])assert(sdd.includes(ref),ref+' must be named in the SDD');
 for(const words of ['Result meaning: business outcome','result field: business_state','Current reading: consistent declarations; implementation unverified','Verify the separate authoritative result contract','AIW-EXECUTION-COMPOSITION-1','MS-ASYNC-OUTCOME'])assert(sdd.includes(words),words);
 assert(exportInterfacesMarkdown(applied).includes('Separate result contract: '+ids.outcomeContractId));
 assert(architectureMarkdown(applied,{modules:false}).markdown.includes('## Execution agreements and authoritative outcomes'));
 let modular=applyRequirementsCommand(applied,{type:'requirements.group',payload:{title:domain+' outcomes',kind:'module',role:'business',memberIds:[ids.requirementId]}},at).document;
 const moduleId=modular.requirementGroups.records.at(-1).id,otherRequirement=applyCommand(modular,{type:'artefact',payload:{type:'requirement',title:'Independent billing control',description:'A separate module boundary.'}},at);modular=otherRequirement.document;
 modular=applyRequirementsCommand(modular,{type:'requirements.group',payload:{title:'Independent billing',kind:'module',role:'business',memberIds:[otherRequirement.selected]}},at).document;
 const foreign=applyInterfacesCommand(modular,{type:'interfaces.contract',payload:{title:'Out-of-scope execution agreement',kind:'request',from:ids.producer,to:ids.consumer,requirementIds:[otherRequirement.selected],execution:{completion:'acceptance'}}},at);modular=foreign.document;
 const moduleMarkdown=sddDocument(modular,{figures:false}).markdown;assert(moduleMarkdown.includes('## Module overview'));assert(moduleMarkdown.includes('## Execution agreements and authoritative outcomes'));assert(moduleMarkdown.includes('Out-of-scope execution agreement'));
 const scoped=scopedDocument(modular,moduleId);assert(scoped.interfaces.contracts.some(c=>c.id===ids.contractId));assert(scoped.interfaces.contracts.some(c=>c.id===ids.outcomeContractId));assert(!scoped.interfaces.contracts.some(c=>c.id===foreign.selected));assert(!executionText(scoped).includes('Out-of-scope execution agreement'));assert.equal(executionText(scoped),executionText(applied),'Module filtering retains only the current scoped execution agreements and exact supporting records');
 assert(architectureIntelligenceCurrent(applied,source));assert(JSON.parse(source.excerpt).insights.some(i=>i.kind==='composition'&&i.scope?.outcomeContractId===ids.outcomeContractId));
 const history=structuredClone(applied.coauthoring.designTasks),alternativeHistory=structuredClone(accepted);
 const changed=applyInterfacesCommand(applied,{type:'interfaces.data',payload:{id:ids.resultDataId,authorityId:ids.producer}},at).document;
 assert(!architectureIntelligenceCurrent(changed,source));assert.equal(read(changed,ids.contractId).state,'excluded');assert.match(executionText(changed),/Current reading: conflict/);assert(executionText(changed).includes(applied.interfaces.data.find(d=>d.id===ids.resultDataId).ref));
 assert.deepEqual(changed.coauthoring.designTasks,history);assert.deepEqual(changed.modelAlternatives.records.at(-1),alternativeHistory,'A changed supporting fact preserves accepted design and provider history');
 const newer=architectureIntelligence(changed,{chapter:8,id:ids.contractId});assert(newer.insights.some(i=>i.kind==='composition'&&i.state==='excluded'));
 const withdrawn=applyKnowledgeCommand(applied,{type:'knowledge.withdraw',payload:{id:'MS-ASYNC-OUTCOME',stamp:knowledgeImpactStamp(applied,'MS-ASYNC-OUTCOME'),reviewed:true,reviewer:'Synthetic reviewer',reason:'Exercise method withdrawal after accepted native design.'}},at,'synthetic-reviewer').document;
 assert(!executionMethodSource(withdrawn));assert.match(executionText(withdrawn),/unavailable or withdrawn/);assert(!executionText(withdrawn).includes('Current reading: consistent'));assert.deepEqual(contract(withdrawn,ids.contractId).execution,c.execution);
 const reversal=previewReversal(applied,accepted);assert(reversal.allowed,JSON.stringify(reversal));
 const undone=applyAlternativeCommand(applied,{type:'alternative.rollback',payload:{id:accepted.id,alternativeRevision:accepted.revision,previewStamp:reversal.stamp,reviewed:true,reviewer:'Synthetic journey reviewer',reason:'Reverse both reviewed contract refinements together.'}},at).document;
 for(const id of [ids.contractId,ids.outcomeContractId])for(const key of ['execution','exchanges','contractVersion','owner'])assert.deepEqual(contract(undone,id)[key],contract(original,id)[key],id+' '+key+' must restore atomically');
 assert(undone.coauthoring.designTasks.every(t=>t.status==='dismissed'&&t.reverted));assert.equal(read(undone,ids.contractId).state,'needs-context');
 assert.deepEqual(f.document,original);console.log('PASS '+domain+' '+kind+': saved synthetic option → explicit related drafts → combined preview → atomic native acceptance → linked model, validation and SDD → source-change invalidation with history → complete reversal.');
}

// New result creation resolves the typed sibling ID, but cannot invent a runtime path.
{
 const f=proposalFixture(),{ids}=f;let p=start(f.document,f.run),[submission,result]=p.coauthoring.designTasks;
 p=save(p,submission.id,answers(p,submission,ids));p=save(p,result.id,{...answers(p,result,ids),targetId:'new',title:'A newly authored result agreement'});p=prepare(p);
 const q=previewAlternative(p,p.modelAlternatives.records.at(-1)),created=q.operationMembers.find(m=>m.taskId===result.id).selected;
 assert.notEqual(created,ids.outcomeContractId);assert.equal(contract(q.document,ids.contractId).execution.outcomeContractId,created);assert.equal(read(q.document,ids.contractId).state,'needs-context');assert(read(q.document,ids.contractId).unknown.some(x=>x.id==='outcome-path'));
 const applied=accept(p),a=applied.modelAlternatives.records.at(-1),undo=previewReversal(applied,a);assert(undo.allowed);
 const undone=applyAlternativeCommand(applied,{type:'alternative.rollback',payload:{id:a.id,alternativeRevision:a.revision,previewStamp:undo.stamp,reviewed:true,reviewer:'Synthetic reviewer',reason:'Remove the reviewed result draft and restore its submission link together.'}},at).document;
 assert(!contract(undone,created));assert.deepEqual(contract(undone,ids.contractId).execution,contract(f.document,ids.contractId).execution);
 console.log('PASS new sibling result creation resolves exact native ID, retains missing-path uncertainty, and reverses dependent link and record atomically.');
}

// Typed links keep the existing exact-member, wrong-kind, self, cycle and stale guards.
{
 const f=proposalFixture(),{ids}=f;let p=start(f.document,f.run),[submission,result]=p.coauthoring.designTasks;
 const av=answers(p,submission,ids),bv=answers(p,result,ids);
 assert(!operationReferenceLists(p,{...av,targetId:ids.contractId},submission).contracts.some(c=>c.id===ids.contractId));
 for(const id of ['draft:'+submission.id,'draft:DES-999',ids.contractId,ids.producer])assert.throws(()=>save(p,submission.id,{...av,'execution.outcomeContractId':id}),/Choose current records/);
 p=save(p,submission.id,av);p=save(p,result.id,{...bv,'execution.outcomeContractId':'draft:'+submission.id});assert.throws(()=>prepare(p),/dependency cycle/);
 const proposed=ready(f),a=proposed.modelAlternatives.records.at(-1),partial=structuredClone(a);partial.design.members.pop();assert.throws(()=>previewAlternative(proposed,partial),/every exact operation/);
 const changed=applyInterfacesCommand(proposed,{type:'interfaces.contract',payload:{id:ids.outcomeContractId,contractVersion:'concurrent-v3'}},at).document;assert.throws(()=>previewAlternative(changed,a),/changed/);
 // Saved older operation drafts may have none of the newly exposed optional fields.
 let legacy=start(f.document,f.run);for(const t of legacy.coauthoring.designTasks){const v=answers(legacy,t,ids);for(const k of Object.keys(v))if(k.startsWith('execution.')||['requestDataIds','responseDataIds','contractVersion','correlationKey'].includes(k))delete v[k];legacy=save(legacy,t.id,v);}legacy=prepare(legacy);
 const q=previewAlternative(legacy,legacy.modelAlternatives.records.at(-1));for(const id of [ids.contractId,ids.outcomeContractId])for(const key of ['execution','exchanges','contractVersion','correlationKey'])assert.deepEqual(contract(q.document,id)[key],contract(f.document,id)[key]);
 console.log('PASS typed outcome references retain self/wrong-kind/missing/cycle/member/currentness guards; old draft schemas preserve execution facts and payloads.');
}

// Native DOM path starts at the saved response. It uses real design and impact
// commands with an in-memory store; fetch serves authored history only.
{
 const {Window}=await import('happy-dom'),w=new Window({url:'https://aiw.test/?chapter=8&tab=work&object=if-001',settings:{disableIframePageLoading:true,disableCSSFileLoading:true}});
 for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator','CSS'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
 for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
 document.body.innerHTML='<main id="app"></main><aside id="brain-panel"></aside><div id="toast"></div>';
 const f=proposalFixture('fulfilment','event'),{ids,run}=f,requests=[],writes=[],q=s=>document.querySelector(s),click=s=>{const e=q(s);assert(e,s);e.click();},input=(s,v)=>{const e=q(s);assert(e,s);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},choose=(s,v)=>{const e=q(s);assert(e,s);if(e.multiple)for(const o of e.options)o.selected=v.includes(o.value);else e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}));},waitFor=async(test,label)=>{for(let i=0;i<200;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}assert.fail(label+' '+q('.dc-error')?.textContent+' '+q('.intel-error')?.textContent+' '+q('.ip-error')?.textContent);};
 globalThis.fetch=async(url,opts={})=>{requests.push(String(url));assert.equal(opts.method||'GET','GET');const u=new URL(url,'https://aiw.test');return Response.json(u.pathname.endsWith('/runs')?(u.searchParams.has('id')?run:{runs:[{id:run.id,status:run.status,mode:'mind',createdAt:run.updatedAt}]}):{configured:false,draft:null,runs:[],actorKey:'authored-fixture'});};
 const [{createDesignTaskWorkspace},{createInterfaceImpactWorkspace},{intelligenceSection,mountIntelligence},{brainContext},{SOL}]=await Promise.all([import('./public/design-task-ui.js'),import('./public/interface-impact-ui.js'),import('./public/intelligence-ui.js'),import('./public/aiw-brain.js'),import('./public/brain-reasoning-ui.js')]);
 const store={value:{document:f.document,revision:1},async command(c){writes.push(structuredClone(c));await Promise.resolve();const r=c.type==='intelligence.adopt'?adoptIntelligence(store.value.document,c.payload,run,at):c.type.startsWith('design.')?applyDesignCommand(store.value.document,c,at):applyAlternativeCommand(store.value.document,c,at);store.value={document:r.document,revision:store.value.revision+1};return {...r,revision:store.value.revision};}};window.aiwProjectStore=store;
 const bridge={state:{chapter:8,tab:'work',selected:ids.contractId,visible:['interface','data'],focus:false,zoom:1,pan:{x:0,y:0}},render(){},toast(){}};
 function openSol(){const d=document.createElement('dialog');d.className='logical-dialog';d.setAttribute('aria-labelledby','native-title');d.innerHTML='<header><h2 id="native-title">Native chapter guidance</h2><button type="button" aria-label="Close">Close</button></header>';document.body.append(d);d.showModal();d.querySelector('button').onclick=()=>{d.close();d.remove();};}
 const tasks=createDesignTaskWorkspace({store,bridge:()=>bridge,openSol}),impact=createInterfaceImpactWorkspace({store,bridge:()=>bridge,onStage(){},onEdit(){assert.fail('Return to the exact native operation draft');},onApplied(){}});
 let guard=null;const context=()=>brainContext(store.value.document,{chapter:8,tab:'work',id:ids.contractId}),callbacks={render,guard:fn=>guard=fn,contextCurrent:()=>true,design:id=>tasks.openTask(id)};
 function render(){q('#brain-panel').innerHTML=intelligenceSection(store.value.document,context(),'mind');mountIntelligence(store.value.document,context(),'mind',callbacks);}
 const common=()=>{input('[data-dc-answer="owner"]','Synthetic native architect');input('[data-dc-answer="scopeNote"]','Refine the exact selected agreement and its explicit outcome link.');input('[data-dc-answer="rationale"]','Retain acceptance, pending and final result as distinct business states.');};
 const idle=async()=>{await waitFor(()=>!tasks.busy,'Save the native contract draft');assert(q('.dc-error')?.hidden!==false,q('.dc-error')?.textContent);};
 try{
  Object.assign(SOL,{projectId:f.document.id,config:{configured:false},loading:false});render();await waitFor(()=>q('[data-intel-action="open-run"]'),'Saved authored response');click('[data-intel-action="open-run"]');await waitFor(()=>q('[data-intel-action="adopt-option"]'),'Related option action');click('[data-intel-action="adopt-option"][data-option-id="O2"]');assert(guard);await guard();await waitFor(()=>q('.dc-dialog'),'Native related drafts');
  const [submission,result]=store.value.document.coauthoring.designTasks;assert.equal(writes[0].payload.runId,run.id);assert.equal(writes[0].payload.kind,'architecture-option');assert.equal(q('[data-dc-operation-target]').value,'');
  choose('[data-dc-operation-target]',ids.contractId);assert(q('[data-dc-fields="payload"]'));assert(q('[data-dc-fields="outcome"]'));assert(q('[data-dc-fields="outcome"]').open);assert.equal(q('[data-dc-answer="contractVersion"]').value,contract(f.document,ids.contractId).contractVersion);
  const link='[data-dc-answer="execution.outcomeContractId"]';assert([...q(link).options].some(o=>o.value==='draft:'+result.id));assert(![...q(link).options].some(o=>o.value===ids.contractId));
  choose(link,'draft:'+result.id);choose('[data-dc-answer="execution.outcomeCorrelation"]','same-operation');choose('[data-dc-answer="execution.outcomeMeaning"]','business-outcome');input('[data-dc-answer="execution.outcomeResultKey"]','business_state');common();
  assert.match(q('[data-dc-answer="execution.outcomeMeaning"]').selectedOptions[0].textContent,/Authoritative business state/);
  click('[data-dc-action="operation-member"][data-task-id="'+result.id+'"]');assert(q('.dc-leave'),'Unsaved result declarations require the existing dirty guard');click('[data-dc-action="stay"]');assert.equal(q(link).value,'draft:'+result.id);
  click('[data-dc-action="operation-next"]');await idle();assert.match(q('[data-dc-operation-group]').textContent,/Requires OP2/);
  choose('[data-dc-operation-target]',ids.outcomeContractId);common();input('[data-dc-answer="contractVersion"]','event-result-v2');assert.deepEqual([...q('[data-dc-answer="requestDataIds"]').selectedOptions].map(o=>o.value),[ids.resultDataId]);assert.equal(q('[data-dc-fields="outcome"]').open,false,'A terminal result contract does not open a recursive discovery form');
  click('[data-dc-action="operation-save"]');await idle();click('[data-dc-action="operation-member"][data-task-id="'+submission.id+'"]');assert.equal(q(link).value,'draft:'+result.id);assert.equal(q('[data-dc-answer="execution.outcomeResultKey"]').value,'business_state');
  click('[data-dc-action="operation-preview"]');await waitFor(()=>q('.ip-dialog'),'Combined outcome review');assert.equal(q('[data-ip-change]').options.length,2);assert.deepEqual(store.value.document.interfaces,f.document.interfaces);assert.equal(contract(impact.document,ids.contractId).execution.outcomeContractId,ids.outcomeContractId);assert.equal(read(impact.document,ids.contractId).state,'context-match');
  const a=store.value.document.modelAlternatives.records.at(-1),resultChange=a.changes.find(c=>c.source.taskId===result.id);choose('[data-ip-change]',resultChange.command.type+':'+resultChange.source.id);click('[data-ip-action="edit"]');assert.equal(q('[data-dc-action="operation-member"][aria-current]').dataset.taskId,result.id);assert.equal(q('[data-dc-answer="contractVersion"]').value,'event-result-v2');input('[data-dc-answer="contractVersion"]','event-result-v3');click('[data-dc-action="operation-preview"]');await waitFor(()=>q('.ip-dialog'),'Recomputed joined review');assert.equal(store.value.document.modelAlternatives.records[0].status,'archived');
  click('[data-ip-action="review"]');input('[data-ip-input="reviewer"]','Synthetic native reviewer');input('[data-ip-input="reason"]','Reviewed the explicit result link, both versioned agreements and pending outcome verification together.');q('[data-ip-confirm]').checked=true;click('[data-ip-action="apply"]');await waitFor(()=>!impact.busy&&!impact.pending,'Atomic outcome acceptance');
  assert(store.value.document.coauthoring.designTasks.every(t=>t.status==='applied'));assert.equal(contract(store.value.document,ids.contractId).execution.outcomeContractId,ids.outcomeContractId);assert.equal(contract(store.value.document,ids.outcomeContractId).contractVersion,'event-result-v3');assert.equal(contract(store.value.document,ids.contractId).execution.backoffBudgetMs,0);assert.match(executionText(store.value.document),/consistent declarations; implementation unverified/);
  render();click('[data-intel-action="open-run"]');await waitFor(()=>q('[data-intel-action="adopt-option"]'),'Accepted response history');assert.match(q('[data-intel-action="adopt-option"]').textContent,/View option history/);click('[data-intel-action="adopt-option"]');await guard();assert.match(q('.dc-reading').textContent,/Working design applied/);assert.equal(q('[data-dc-operation-target]'),null);assert(!requests.some(url=>/generate|context$|reason\/run/.test(url)));
  console.log('PASS native DOM saved-response journey: exact option, progressive payload/outcome controls, typed sibling link, dirty guard, save/resume, exact-member refinement, combined preview, explicit acceptance and immutable navigable history.');
 }finally{tasks.dispose();impact.dispose();document.dispatchEvent(new CustomEvent('aiw:project-switched'));await w.happyDOM.abort();w.close();}
}
