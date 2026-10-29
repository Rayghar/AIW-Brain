// Explicit supported scopes, genuine unknowns and contradictory declarations.
// Synthetic architecture verification only; no runtime or provider claims.
import assert from 'node:assert/strict';
import {executionJourneyFixture,JOURNEY_FIXTURE_AT as at} from './execution-journey-fixtures.mjs';
import {readOutcomeFixture} from './read-outcome-fixtures.mjs';
import {executionJourney,executionMethodSource,executionMethodCurrent,assessContractExecution,contractExecutionContext} from './public/architecture-applicability.js';
import {applyInterfacesCommand,interfaceFindings,contractReviewCurrent,interfaceSourceChanged,exportInterfacesMarkdown} from './public/interfaces-domain.js';
import {applyRuntimeCommand} from './public/runtime-domain.js';
import {architectureIntelligence,architectureIntelligenceSource,architectureIntelligenceCurrent,architectureQuestions} from './public/architecture-intelligence.js';
import {intelligencePacket,packArchitectureIntelligence,adoptIntelligence} from './public/intelligence-context.js';
import {operationContext,OPERATION_DRAFTS,operationDependencies,validateArchitectureOperations} from './public/architecture-operations.js';
import {operationDefaults,operationAnswers,validateOperationReferences} from './public/design-planner.js';
import {applyDesignCommand} from './public/design-task-domain.js';
import {designBasisStamp,designBasisCurrent} from './public/design-task-state.js';
import {previewAlternative,applyAlternativeCommand} from './public/model-alternatives.js';
import {referencesTo,applyRecordLifecycleCommand} from './public/record-lifecycle.js';
import {changeFingerprint} from './public/changes-domain.js';
import {knowledgeState} from './public/knowledge-governance.js';

const contract=(p,id)=>p.interfaces.contracts.find(c=>c.id===id);
const native=(p,id,patch)=>applyInterfacesCommand(p,{type:'interfaces.contract',payload:{id,...patch}},at).document;
const execution=(p,id,patch)=>native(p,id,{execution:{...contract(p,id).execution,...patch}});
const mutate=(p,fn)=>{const q=structuredClone(p);fn(q);return q;};
const no=(p,id,key)=>mutate(p,q=>delete contract(q,id).execution[key]);
const attempts=r=>r.calculations.filter(c=>c.kind==='nested-attempts');

for(const domain of ['museum','permit']){
 const f=executionJourneyFixture({domain}),p=f.document,{ids}=f,[root,child,leaf]=ids.contractIds,before=JSON.stringify(p),r=executionJourney(p,root);
 assert(r.ready,JSON.stringify(r.reasons));assert.equal(attempts(r)[0].value,24);
 assert.deepEqual(attempts(r)[0].contractIds,[root,child,leaf]);
 assert.deepEqual(r.calculations.filter(c=>c.kind==='nested-wait').map(c=>[c.value,c.budget]),[[1500,2000],[500,700]]);
 assert.equal(new Set(ids.contractIds.map(id=>contract(p,id).idempotencyKey)).size,3,'A waiting chain does not assert one business operation or identity');
 assert(r.obligations.every(o=>o.verification==='pending'));assert.match(r.authority,/no runtime, transaction or business-finality proof/);
 assert(r.scope.processTransitionIds.includes(ids.flowId));assert(r.sourceRecords.some(s=>s.id===ids.processIds[0]));
 assert.deepEqual(executionJourney(p,root,{assess:false}).scope,r.scope);
 const detached=mutate(p,q=>q.interfaces.contracts.forEach(c=>{if(c.execution)delete c.execution.invocationParentId;}));
 assert.equal(executionJourney(detached,root),null,'Shared endpoints, sequential process flow and names must not invent nesting');
 assert.equal(JSON.stringify(p),before);
 console.log('PASS '+domain+': three explicit waiting boundaries, separate operation identities, nested waiting fits, 24 declared leaf attempts, process context only, pending verification');
}

const f=executionJourneyFixture(),p=f.document,{ids}=f,[root,child,leaf]=ids.contractIds;
const overrun=execution(p,leaf,{attemptTimeoutMs:200,callerBudgetMs:900}),bad=executionJourney(overrun,root);
assert(bad.blockers.some(c=>c.id.endsWith(':wait-budget')&&c.target.objectId===leaf));
assert.deepEqual(bad.blockers.find(c=>c.id.endsWith(':wait-budget')).target,{objectId:leaf,fieldKey:'execution.attemptTimeoutMs',chapter:8});
const findings=interfaceFindings(overrun).filter(x=>x.code==='execution-journey');assert.equal(findings.length,1);assert.equal(findings[0].id,bad.id);assert.equal(findings[0].objectId,leaf);assert.deepEqual(findings[0].checks,bad.checks);
const single=execution(p,root,{callerRetries:'none',callerBudgetMs:1600});assert.equal(attempts(executionJourney(single,root))[0].value,8);
assert(executionJourney(execution(single,root,{callerBudgetMs:1000}),root).blockers.some(c=>c.id.endsWith(':wait-budget')),'A single-attempt parent uses its own declared total budget');
const noChildRetries=execution(p,leaf,{callerRetries:'none',callerBudgetMs:600});assert(executionJourney(noChildRetries,root).ready);assert.equal(attempts(executionJourney(noChildRetries,root))[0].value,6);
assert(executionJourney(no(noChildRetries,leaf,'callerBudgetMs'),root).unknown.some(c=>c.id.endsWith(':wait-budget')),'A single child call still needs a declared waiting bound');
assert(executionJourney(execution(noChildRetries,leaf,{callerBudgetMs:800}),root).blockers.some(c=>c.id.endsWith(':wait-budget')));
for(const [name,changed,expect] of [
 ['missing ownership',no(p,child,'retryLayers'),'unknown'],
 ['unaccounted retry layer',execution(p,child,{retryLayers:'nested'}),'blocked'],
 ['missing retry policy',no(p,child,'callerRetries'),'unknown'],
 ['proposed parent',mutate(p,q=>contract(q,root).state='proposed'),'unknown'],
 ['missing exact path',mutate(p,q=>q.runtime.paths=q.runtime.paths.filter(x=>x.id!==ids.pathIds[1])),'unknown'],
 ['different environment',mutate(p,q=>contract(q,child).execution.environmentId='another-environment'),'blocked'],
 ['wrong direction',native(p,child,{from:ids.roles[0]}),'blocked'],
 ['event is not a waiting call',native(p,child,{kind:'event'}),'blocked'],
 ['missing referenced parent',mutate(p,q=>q.interfaces.contracts=q.interfaces.contracts.filter(c=>c.id!==root)),'unknown']
]){
 const r=executionJourney(changed,child);assert(r.checks.some(c=>c.state===expect),name);assert(!r.ready,name);assert.equal(attempts(r).length,0,name+' must not promise a finite composed exposure');
}
for(const key of ['maxAttempts','attemptTimeoutMs','backoffBudgetMs','callerBudgetMs'])assert(!executionJourney(no(p,child,key),root).ready,key+' missing stays unknown');
const cycle=mutate(p,q=>contract(q,root).execution.invocationParentId=leaf);assert(executionJourney(cycle,root).blockers.some(c=>c.id.startsWith('journey-cycle:invocation:')));assert.equal(attempts(executionJourney(cycle,root)).length,0);
const limited=executionJourney(p,root,{limit:2});assert(limited.unknown.some(c=>c.id==='journey-coverage'));assert(limited.scope.omittedContractIds.includes(leaf));assert.equal(attempts(limited).length,0);
const many=mutate(p,q=>{for(let n=4;n<=15;n++){const c=structuredClone(contract(q,leaf));c.id='imported-'+n;c.execution.invocationParentId=n===4?leaf:'imported-'+(n-1);q.interfaces.contracts.push(c);}});
const bounded=executionJourney(many,root);assert.equal(bounded.scope.contractIds.length,12);assert(bounded.scope.omittedContractIds.length);assert(!bounded.ready);assert.equal(attempts(bounded).length,0);
console.log('PASS cross-boundary overrun, retry ownership, exact direction/environment/path, imported cycles and bounded scope produce specific conflicts or unknowns; native Validate deduplicates one journey finding');

const shared=executionJourneyFixture({domain:'permit',sharedResult:true}),s=shared.document,si=shared.ids;
assert(executionJourney(s,si.contractIds[0]).ready);
const conflict=execution(s,si.siblingId,{outcomeAuthorityId:si.roles[1]});assert(executionJourney(conflict,si.contractIds[0]).blockers.some(c=>c.id.startsWith('shared-result:')&&c.id.includes(':authority:')));
for(const [v,state] of [['unrelated','blocked'],['','unknown']]){const changed=execution(s,si.siblingId,{outcomeCorrelation:v}),r=executionJourney(changed,si.contractIds[0]);assert(r.checks.some(c=>c.id.includes('shared-result:')&&c.id.includes(':identity:')&&c.state===state));}
const missingAuthority=mutate(s,q=>q.interfaces.data.find(d=>d.id===si.resultDataId).authorityId=''),questions=architectureIntelligence(missingAuthority,{chapter:8,id:si.contractIds[0]},{limit:24}).questions;
const authorityQuestion=questions.find(q=>q.target.objectId===si.resultDataId&&q.target.fieldKey==='authorityId');assert(authorityQuestion);assert(authorityQuestion.dependentIds.includes(si.siblingId));assert(authorityQuestion.dependentIds.includes(si.contractIds[0]));assert.equal(questions.filter(q=>q.target.objectId===si.resultDataId&&q.target.fieldKey==='authorityId').length,1);
const guided=architectureIntelligence(missingAuthority,{chapter:8,id:si.contractIds[0]},{limit:24});assert.equal(guided.primary.actions[0].objectId,si.resultDataId);assert.equal(guided.primary.actions[0].editor,'data');
const syntheticQuestions=architectureQuestions([{id:'single',subjectId:'one',sourceRefs:['model:one'],checks:[{id:'x',state:'unknown',detail:'One missing fact',target:{chapter:8,objectId:'one',fieldKey:'purpose'}}]},{id:'shared',sourceRefs:['model:two'],checks:[{id:'y',state:'unknown',detail:'Shared missing fact',dependentIds:['a','b','c'],target:{chapter:8,objectId:'two',fieldKey:'authorityId'}}]},{id:'conflict',sourceRefs:['model:three'],checks:[{id:'z',state:'blocked',detail:'A contradiction',target:{chapter:8,objectId:'three',fieldKey:'kind'}}]}]);
assert.deepEqual(syntheticQuestions.map(q=>q.target.objectId),['three','two','one'],'Contradictions first, then shared semantic dependencies, not field counts');
console.log('PASS one shared result authority, per-submission operation identity and one dependency-ranked native question for a shared missing fact');

let reviewed=p;
for(const id of [root,child])reviewed=applyInterfacesCommand(reviewed,{type:'interfaces.record-review',payload:{id,reviewed:true,reviewer:'Synthetic architect',evidence:'Reviewed the exact declared waiting links and supporting records; runtime verification is pending.'}},at).document;
assert(contractReviewCurrent(reviewed,contract(reviewed,root)));assert(contractReviewCurrent(reviewed,contract(reviewed,child)),'A neighbour’s review metadata is not a changed architecture fact');
const reading=architectureIntelligence(reviewed,{chapter:8,id:root},{limit:24}),captured=architectureIntelligenceSource(reading,{maxCharacters:12000});assert(architectureIntelligenceCurrent(reviewed,captured));
const context=operationContext(reviewed,'interaction',{targetId:leaf,'execution.invocationParentId':child}),contextStamp=changeFingerprint(context);
for(const edit of [
 q=>contract(q,root).execution.attemptTimeoutMs=1900,
 q=>q.runtime.paths.find(r=>r.id===ids.pathIds[1]).route='Revised exact route',
 q=>q.interfaces.data.find(d=>d.id===ids.dataIds[2]).fields[0].description='Changed operation-identity scope',
 q=>q.realisation.components.find(r=>r.id===ids.roles[2]).owner='Revised accountable team',
 q=>q.processModel.transitions.find(t=>t.id===ids.flowId).condition='Revised process context',
 q=>q.knowledge={...knowledgeState(q),withdrawals:[{targetId:'AIW-EXECUTION-COMPOSITION-1'}]}
]){
 const changed=mutate(reviewed,edit);assert(!contractReviewCurrent(changed,contract(changed,root)));assert(interfaceSourceChanged(changed,contract(changed,root)));assert(!architectureIntelligenceCurrent(changed,captured));assert.notEqual(changeFingerprint(operationContext(changed,'interaction',{targetId:leaf,'execution.invocationParentId':child})),contextStamp);
}
const independent=mutate(reviewed,q=>q.interfaces.data.push({id:'unrelated-dictionary',title:'Separate inventory catalogue',fields:[]}));assert(contractReviewCurrent(independent,contract(independent,root)));assert(architectureIntelligenceCurrent(independent,captured));
assert(referencesTo(p,root).includes('Chapter 8 · '+contract(p,child).ref));assert.throws(()=>applyRecordLifecycleCommand(p,{type:'record.retire',payload:{id:root,reason:'Exercise explicit waiting-reference protection'}},at),/named|reference|Chapter 8|still/i);
for(const invalid of [root,ids.roles[0],'missing-contract'])assert.throws(()=>execution(p,root,{invocationParentId:invalid}),/existing|supported/);
assert.throws(()=>execution(p,root,{invocationParentId:leaf}),/circular/);
assert.equal(contract(native(p,child,{purpose:'Refine purpose only'}),child).execution.invocationParentId,root);assert.equal(contract(execution(p,child,{invocationParentId:''}),child).execution.invocationParentId,undefined);
assert(exportInterfacesMarkdown(p).includes('Request that waits for this call: '+root));
const task={operation:{kind:'interaction',verification:{steps:['Verify waiting and cancellation']}}},defaults=operationDefaults(p,task,child);
assert.equal(defaults['execution.invocationParentId'],root);assert.equal(defaults['execution.backoffBudgetMs'],'100');assert(OPERATION_DRAFTS.interaction.fields.some(f=>f.key==='execution.invocationParentId'&&f.choices==='contracts'));
assert.deepEqual(operationDependencies({operation:{kind:'interaction'},answers:{'execution.invocationParentId':'draft:DES-parent'}}),['DES-parent']);
assert.throws(()=>validateOperationReferences(p,'interaction',{targetId:child,'execution.invocationParentId':child}),/current records/);
assert.equal(operationAnswers('interaction',{'execution.backoffBudgetMs':0})['execution.backoffBudgetMs'],'0');
console.log('PASS exact saved references, omission/clearing, lifecycle protection, native operation dependencies and precise review/currentness propagation without unrelated-record invalidation');

{
 const packet=intelligencePacket(p,{chapter:8,objectId:child,mode:'mind',architectureOperations:true,prompt:'Review the exact waiting-parent declaration.'}),refs=[...new Set(['S1',...packet.architectureOperations.requirementRefs.map(r=>r.ref)])];
 const operation={id:'OP1',optionId:'O1',optionTitle:'Explicitly independent invocation',kind:'interaction',title:'Refine the exact waiting boundary',intent:'Reassess whether this request waits for the child invocation.',mechanism:'Retain independently declared identities and budgets while reviewing the optional waiting link.',selectedSourceRef:'S1',requirementIds:[ids.requirementId],affectedObjectIds:[child],proposedObjects:[],qualityEffects:[],conditions:['Use exact saved contracts.'],tradeoffs:['A removed waiting relationship requires separate coordination.'],obligations:['Verify the actual call chain.'],verification:{steps:['Exercise the requests and cancellation.'],passCriteria:['Observed request nesting matches the declared links.']},reconsiderWhen:['The request coordination changes.'],sourceRefs:refs,assumptions:['Authored synthetic proposal; implementation is not verified.']};
 const operations=validateArchitectureOperations([operation],packet),run={id:'synthetic-waiting-operation',projectId:p.id,status:'completed',provider:'Authored fixture',model:'No live model',updatedAt:at,packet,groundingReview:{accepted:true,issues:[]},result:{title:'A scoped alternative',summary:'Review the optional relation.',passage:'Use the exact native field.',sourceRefs:refs,assumptions:[],questions:[],options:[],architectureOperations:operations}};
 let q=adoptIntelligence(p,{kind:'architecture-operation',operationId:'OP1',optionId:'O1'},run,at).document,t=q.coauthoring.designTasks.at(-1);
 const answers={...operationDefaults(q,t,child),'execution.invocationParentId':'','execution.backoffBudgetMs':'0',scopeNote:'Review this exact existing request; other execution declarations remain part of its contract.',rationale:'The explicit waiting relationship requires a separate design decision.'};
 q=applyDesignCommand(q,{type:'design.answers',payload:{id:t.id,taskRevision:t.revision,answers,contextStamp:designBasisStamp(operationContext(q,'interaction',answers,t))}},at).document;t=q.coauthoring.designTasks.at(-1);
 q=applyDesignCommand(q,{type:'design.prepare',payload:{id:t.id,taskRevision:t.revision}},at).document;
 const alternative=q.modelAlternatives.records.at(-1),preview=previewAlternative(q,alternative);assert.equal(contract(q,child).execution.invocationParentId,root);assert.equal(contract(preview.document,child).execution.invocationParentId,undefined);
 const changed=mutate(q,v=>v.runtime.paths.find(r=>r.id===ids.pathIds[0]).route='Concurrent parent path change');assert.throws(()=>previewAlternative(changed,alternative),/changed|review/i);
 q=applyAlternativeCommand(q,{type:'alternative.apply',payload:{id:alternative.id,alternativeRevision:alternative.revision,previewStamp:preview.stamp,reviewed:true,reviewer:'Synthetic architect',reason:'Reviewed the exact parent-reference removal and remaining implementation obligations.'}},at).document;
 assert.equal(contract(q,child).execution.invocationParentId,undefined);assert.equal(contract(q,child).execution.backoffBudgetMs,0);assert.equal(contract(q,child).execution.circuitBreaker,'caller');assert.deepEqual(q.coauthoring.designTasks.at(-1).operation,operations[0]);assert(designBasisCurrent(q,q.coauthoring.designTasks.at(-1)));
 console.log('PASS saved operation → native parent declaration/zero → unchanged preview → ancestor-change guard → reviewed application, current task and immutable proposal');
}

const method=executionMethodSource(p,{journey:true});assert(executionMethodCurrent(p,method));assert(method.excerpt.includes('journeyScope'));assert.equal(method.receipt.fingerprint,executionMethodSource(p).receipt.fingerprint);
assert(!executionMethodCurrent(p,{...method,receipt:{...method.receipt,version:5}}));
for(const tab of ['work','model','validate','output'])assert.deepEqual(architectureIntelligence(p,{chapter:8,id:root,tab}).insights.find(i=>i.id.startsWith('journey:')).checks,executionJourney(p,root).checks);
const packet=intelligencePacket(p,{chapter:8,objectId:root,mode:'challenge',prompt:'Review these exact waiting boundaries.'}),derived=packet.sources.find(s=>s.kind==='architecture-intelligence'&&JSON.parse(s.excerpt).insights.some(i=>i.id===executionJourney(p,root).id));assert(derived);
const composed=JSON.parse(derived.excerpt).insights.find(i=>i.id.startsWith('journey:'));assert.deepEqual(composed.calculations,executionJourney(p,root).calculations);assert.equal(composed.checks.length,executionJourney(p,root).checks.length);assert(packet.coverage.characters<=28000);assert(packet.sources.length<=22);
const journey=reading.insights.find(i=>i.id.startsWith('journey:'));
for(const id of [ids.pathIds[1],ids.dataIds[2],ids.flowId,ids.roles[2]])assert.equal(packArchitectureIntelligence([{...reading,insights:[journey]}],{excluded:new Set([id])}).sources.length,0,'An excluded supporting fact withholds the whole journey');
assert.equal(packArchitectureIntelligence([{...reading,insights:[journey]}],{maxCharacters:2000}).sources.length,0);
const withdrawn=mutate(p,q=>q.knowledge={...knowledgeState(q),withdrawals:[{targetId:method.objectId}]});assert.equal(executionMethodSource(withdrawn,{journey:true}),null);assert(executionJourney(withdrawn,root).unknown.some(c=>c.id==='journey-method'));assert(!architectureIntelligence(withdrawn,{chapter:8,id:root}).insights.some(i=>i.id.startsWith('journey:')));
console.log('PASS one shared journey reading across views, method receipt versioning, complete bounded provider closure and whole-reading exclusion/withdrawal');

// A shared result reuses accepted-read v5 semantics; grouping cannot weaken them.
const rf=readOutcomeFixture({domain:'fulfilment'}),rc=contract(rf.document,rf.ids.contractId);
let rp=applyInterfacesCommand(rf.document,{type:'interfaces.contract',payload:{title:'Another explicit fulfilment submission',from:rc.from,to:rc.to,kind:rc.kind,purpose:rc.purpose,contractVersion:rc.contractVersion,correlationKey:rc.correlationKey,idempotencyKey:rc.idempotencyKey,exchanges:rc.exchanges,execution:rc.execution}},at).document;
const sibling=rp.interfaces.contracts.at(-1).id;
rp=applyRuntimeCommand(rp,{type:'runtime.path',payload:{environmentId:rf.ids.environmentId,contractId:sibling,owner:'Synthetic operator',route:'Exact additional submission contract',mode:'buffered',failureResponse:'Keep uncertainty.'}},at).document;
const consistent=executionJourney(rp,rc.id);assert(consistent.ready,JSON.stringify(consistent.reasons));
rp=applyInterfacesCommand(rp,{type:'interfaces.record-review',payload:{id:rf.ids.outcomeContractId,reviewed:true,reviewer:'Synthetic result owner',evidence:'Reviewed the exact shared result and its accepted-read dependencies.'}},at).document;
assert(contractReviewCurrent(rp,contract(rp,rf.ids.outcomeContractId)));
const readPack=rp.coauthoring.designTasks.find(t=>t.id===rf.ids.readTaskId).methodReceipt.packId,readWithdrawn=mutate(rp,q=>q.knowledge={...knowledgeState(q),withdrawals:[{targetId:readPack}]});
assert(executionMethodSource(readWithdrawn,{journey:true}));assert(executionJourney(readWithdrawn,rc.id).readSupport.some(r=>!r.methodCurrent));assert(!contractReviewCurrent(readWithdrawn,contract(readWithdrawn,rf.ids.outcomeContractId)),'A linked read-method withdrawal invalidates review at the shared result, which has no local execution declaration');
const strict=execution(rp,rc.id,{outcomeFreshness:'strict'}),local=assessContractExecution(contract(strict,rc.id),contractExecutionContext(strict,contract(strict,rc.id))),joined=executionJourney(strict,rc.id);
assert(local.blockers.some(c=>c.id==='outcome-read-strict'));assert(joined.blockers.some(c=>c.id==='journey-boundary:'+rc.id));assert(!joined.ready);
console.log('PASS shared result grouping preserves accepted-read identity, authority, freshness, currentness and stricter-consumer conflicts');
