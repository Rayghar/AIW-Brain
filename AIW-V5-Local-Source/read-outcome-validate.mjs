// Authored native scenarios. No provider response, measured age or runtime
// completion is invented by consistency of the accepted design declarations.
import assert from 'node:assert/strict';
import {readOutcomeFixture} from './read-outcome-fixtures.mjs';
import {driverJourneyFixture,completeDriverJourney,journeyTask,DRIVER_JOURNEY_AT as at} from './driver-led-journey-fixtures.mjs';
import {assessContractExecution,contractExecutionContext,executionMethodSource,executionMethodCurrent,normaliseContractExecution} from './public/architecture-applicability.js';
import {resultReadContext} from './public/result-read-context.js';
import {applyInterfacesCommand,contractReviewCurrent} from './public/interfaces-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyRealisationCommand} from './public/realisation-domain.js';
import {applyKnowledgeCommand,knowledgeImpactStamp} from './public/knowledge-governance.js';
import {architectureIntelligence,architectureIntelligenceSource,architectureIntelligenceCurrent,architectureModelSourceRecord} from './public/architecture-intelligence.js';
import {intelligencePacket,packArchitectureIntelligence} from './public/intelligence-context.js';
import {generationCurrent} from './public/aiw-brain.js';
import {decodeArchitectureGrounding} from './shared/architecture-grounding.js';

const f=readOutcomeFixture(),{ids,document:p}=f,before=JSON.stringify(p);
const contract=(q,id=ids.contractId)=>q.interfaces.contracts.find(c=>c.id===id);
const edit=(q,patch)=>applyInterfacesCommand(q,{type:'interfaces.contract',payload:{id:ids.contractId,execution:{...contract(q).execution,...patch}}},at).document;
const assess=q=>assessContractExecution(contract(q),contractExecutionContext(q,contract(q)));
const check=(q,id)=>assess(q).checks.find(c=>c.id===id);
const snapshot=JSON.stringify(journeyTask(p,ids.readTaskId)),context=contractExecutionContext(p,contract(p)),good=assess(p);
assert.equal(context.outcome.read.current,true);assert.equal(context.outcome.read.methodCurrent,true);
assert.equal(good.state,'context-match');assert(good.checks.filter(c=>c.id.startsWith('outcome-read')).every(c=>c.state==='known'));
assert.deepEqual(context.outcome.read.roleIds,{caller:ids.producer,processor:ids.authority,cache:ids.cacheId});
assert.equal(context.outcome.read.data.id,ids.resultDataId);
assert(good.placement.some(x=>x.role==='result-read-policy'&&x.componentId===ids.producer));
assert(good.placement.some(x=>x.role==='result-read-copy'&&x.componentId===ids.cacheId));
const duty=good.obligations.find(o=>o.id.endsWith(':result-read'));
assert(duty&&duty.verification==='pending'&&duty.targetIds.includes(ids.outcomeContractId));
for(const term of ['pending','final','source age','version','authorization','unavailable','not measured'])assert(duty.evidence.includes(term),term);
assert(context.outcome.read.sourceRecords.every(r=>architectureModelSourceRecord(p,r.id)));
assert.equal(JSON.stringify(journeyTask(p,ids.readTaskId)),snapshot,'Saving the result link must not rewrite its accepted source task');
console.log('PASS exact accepted read, caller, authority, dictionary and current sources compose through native execution fields with pending verification');

for(const domain of ['fulfilment','payment'])for(const freshness of ['strict','bounded']){
 const x=readOutcomeFixture({domain,approach:'direct-read',freshness}),c=contract(x.document,x.ids.contractId),r=assessContractExecution(c,contractExecutionContext(x.document,c));
 assert.equal(r.state,'context-match',domain+' direct '+freshness);assert(!r.placement.some(x=>x.role==='result-read-copy'));
 assert(r.obligations.find(o=>o.id.endsWith(':result-read')).verification==='pending');
}
const strict=edit(p,{outcomeFreshness:'strict',outcomeMaxAgeSeconds:undefined}),tight=edit(p,{outcomeMaxAgeSeconds:10});
assert.equal(check(strict,'outcome-read-strict').state,'blocked');assert.equal(check(strict,'outcome-read-strict').target.fieldKey,'execution.outcomeFreshness');
assert.equal(check(tight,'outcome-read-age').state,'blocked');assert.match(check(tight,'outcome-read-age').detail,/30 seconds.*10 second/);
assert.equal(check(tight,'outcome-read-age').target.fieldKey,'execution.outcomeMaxAgeSeconds');
assert.equal(check(edit(p,{outcomeMaxAgeSeconds:60}),'outcome-read-age').state,'known');
for(const key of ['outcomeReadTaskId','outcomeFreshness','outcomeMaxAgeSeconds'])assert.equal(assess(edit(p,{[key]:undefined})).state,'needs-context',key);
for(const value of [0,-1,31536001,Infinity,NaN,'30'])assert.throws(()=>normaliseContractExecution({outcomeMaxAgeSeconds:value}),/maximum result age/);
assert.equal(normaliseContractExecution({outcomeMaxAgeSeconds:0.001}).outcomeMaxAgeSeconds,0.001);
assert.throws(()=>edit(p,{outcomeReadTaskId:'missing-task'}),/accepted read design/);
const legacy=driverJourneyFixture();assert.equal(contractExecutionContext(legacy.document,contract(legacy.document)).outcome.read,undefined);
assert(!assess(legacy.document).checks.some(c=>c.id.startsWith('outcome-read')),'An unlinked legacy contract acquires no read requirement');
console.log('PASS direct strict and bounded reads, precise cache/age conflicts, unknown missing declarations, native numeric guards and unchanged legacy contracts');

for(const [label,mutate] of [
 ['absent task',q=>q.coauthoring.designTasks=[]],
 ['unaccepted task',q=>journeyTask(q,ids.readTaskId).status='questions'],
 ['proposed task',q=>journeyTask(q,ids.readTaskId).state='proposed'],
 ['wrong task family',q=>journeyTask(q,ids.readTaskId).topic='persistence'],
 ['missing dictionary',q=>q.interfaces.data=q.interfaces.data.filter(d=>d.id!==ids.resultDataId)],
 ['proposed dictionary',q=>q.interfaces.data.find(d=>d.id===ids.resultDataId).state='proposed'],
 ['unknown age',q=>journeyTask(q,ids.readTaskId).answers.maxAge=''],
 ['unknown method',q=>journeyTask(q,ids.readTaskId).methodReceipt.fingerprint='obsolete']
]){const q=structuredClone(p);mutate(q);assert.equal(assess(q).state,'needs-context',label);}
for(const [role,id] of [['caller',ids.consumer],['processor',ids.consumer]]){
 const q=structuredClone(p);journeyTask(q,ids.readTaskId).applied.reasoningGraph.solution.placement.find(x=>x.role===role).componentId=id;
 assert.equal(check(q,role==='caller'?'outcome-read-caller':'outcome-read-authority').state,'blocked');
}
const otherData=structuredClone(p);journeyTask(otherData,ids.readTaskId).answers.dataId=ids.queryDataId;assert.equal(check(otherData,'outcome-read-data').state,'blocked');
assert.equal(check(edit(p,{discovery:'correlated-event'}),'outcome-read-channel').state,'blocked','An accepted status read cannot silently supply event freshness');
const renamed=structuredClone(p);for(const c of renamed.realisation.components){c.title='Redis PostgreSQL MySQL queue';c.purpose='Latest, strongly consistent, sharded authority';}
assert.equal(check(renamed,'outcome-read-age').state,'known');assert.equal(check(renamed,'outcome-read-caller').state,'known');assert.equal(check(renamed,'outcome-read-current').state,'unknown','Changed source prose needs review but does not invent a different mechanism');
console.log('PASS absent/proposed/unaccepted source remains unknown; exact roles/data/event scope reject unrelated reuse without text or product-name heuristics');

const selection={chapter:8,id:ids.contractId},reading=architectureIntelligence(p,selection),insight=reading.insights.find(i=>i.kind==='composition');
const captured=architectureIntelligenceSource({...reading,insights:[insight]},{maxCharacters:12000});
assert(architectureIntelligenceCurrent(p,captured));assert(insight.actions.some(a=>a.kind==='resume-task'&&a.taskId===ids.readTaskId));
for(const id of [ids.readTaskId,ids.resultDataId,ids.producer,ids.authority,ids.cacheId,ids.freshnessDriverId,ids.constraintDriverId])assert(insight.sourceRefs.includes('model:'+id),id);
const taskSource=reading.sources.find(s=>s.objectId===ids.readTaskId),taskProjection=JSON.parse(taskSource.excerpt);
assert.equal(taskProjection.solution.optionId,'cache-aside');assert.equal(taskProjection.answers.maxAge,'30');assert.equal(taskProjection.methodCurrent,true);
assert(!taskProjection.history&&!taskProjection.basis&&!taskProjection.applied,'A bounded operand projection does not repeat the task history');
assert.deepEqual(new Set(taskSource.receipt.sourceRefs),new Set(context.outcome.read.sourceRecords.map(r=>'model:'+r.id)));
const supportOnly=context.outcome.read.sourceRecords.find(r=>!insight.sourceRefs.includes('model:'+r.id)&&p.technology.mappings.some(m=>m.id===r.id));assert(supportOnly,'The fixture has a currentness-only support mapping');
const request={chapter:8,objectId:ids.contractId,mode:'challenge',prompt:'Assess this result read against its declared freshness contract.'};
const packet=intelligencePacket(p,request),generation={context:selection,basisStamp:packet.basisStamp,sources:packet.sources};
assert(generationCurrent(p,generation));
const reviewed=applyInterfacesCommand(p,{type:'interfaces.record-review',payload:{id:ids.contractId,reviewed:true,reviewer:'Authored reviewer',evidence:'Model declaration comparison; no runtime test.'}},at).document;
assert(contractReviewCurrent(reviewed,contract(reviewed)));
const driverChanged=applyQualityCommand(reviewed,{type:'quality.driver',payload:{id:ids.freshnessDriverId,targetValue:'10'}},at).document;
assert.equal(resultReadContext(driverChanged,ids.readTaskId).current,false);assert.equal(check(driverChanged,'outcome-read-current').state,'unknown');
assert(!contractReviewCurrent(driverChanged,contract(driverChanged)));assert(!architectureIntelligenceCurrent(driverChanged,captured));assert(!generationCurrent(driverChanged,generation));
assert.equal(JSON.stringify(journeyTask(driverChanged,ids.readTaskId)),snapshot);
const supportChanged=structuredClone(p);supportChanged.technology.mappings.find(m=>m.id===supportOnly.id).scope='A changed support allocation requires renewed review.';
assert(!resultReadContext(supportChanged,ids.readTaskId).current);assert(!architectureIntelligenceCurrent(supportChanged,captured));assert(!generationCurrent(supportChanged,generation));
const unrelated=applyRealisationCommand(p,{type:'realisation.component',payload:{title:'Unrelated object',kind:'service',purpose:'An unrelated authored boundary.',owner:'Authored owner'}},at).document;
assert(resultReadContext(unrelated,ids.readTaskId).current);assert(architectureIntelligenceCurrent(unrelated,captured));assert(generationCurrent(unrelated,generation));
const withdrawn=applyKnowledgeCommand(p,{type:'knowledge.withdraw',payload:{id:'AIW-READS-1',stamp:knowledgeImpactStamp(p,'AIW-READS-1'),reviewed:true,reviewer:'Authored reviewer',reason:'Exercise method withdrawal; preserve the accepted design history.'}},at,'authored-reviewer').document;
assert.equal(resultReadContext(withdrawn,ids.readTaskId).methodCurrent,false);assert.equal(check(withdrawn,'outcome-read-current').state,'unknown');assert(!generationCurrent(withdrawn,generation));
assert.equal(JSON.stringify(journeyTask(withdrawn,ids.readTaskId)),snapshot);
const method=executionMethodSource(p);assert(executionMethodCurrent(p,method));const methodContent=JSON.parse(method.excerpt);assert(methodContent.sourceReview.accessedAt);assert(methodContent.sources.some(s=>s.id==='MS-CACHE-ASIDE'));assert(methodContent.sources.some(s=>s.id==='MS-CACHING'));
console.log('PASS changed drivers, method withdrawal and currentness-only support reopen review and invalidate native/model/generation receipts while retaining accepted history');

function completePacket(q,request){
 const native=intelligencePacket(q,request),current=architectureIntelligence(q,{chapter:request.chapter,id:request.objectId}),expected=current.insights.find(i=>i.kind==='composition');
 const source=native.sources.find(s=>s.kind==='architecture-intelligence'&&JSON.parse(s.excerpt).insights.some(i=>i.id===expected.id));assert(source,'The realistic native result request retains its complete deduction');
 const actual=JSON.parse(source.excerpt).insights.find(i=>i.id===expected.id);
 assert.deepEqual(actual.checks.map(c=>[c.id,c.state]),expected.checks.map(c=>[c.id,c.state]));
 assert.deepEqual(actual.obligations.map(o=>[o.id,o.action,o.evidence,o.targetIds]),expected.obligations.map(o=>[o.id,o.action,o.evidence,o.targetIds]));
 assert.deepEqual(actual.scope,expected.scope);assert.deepEqual(actual.placement,expected.placement);
 assert(source.receipt.sourceRefs.every(id=>native.sources.some(s=>s.id===id)));assert(native.coverage.characters<=28000);assert(native.sources.length<=22);
 for(const id of [ids.requirementId,ids.driverId,ids.freshnessDriverId,ids.constraintDriverId])assert.equal(native.sources.find(s=>s.id==='model:'+id).truncated,false,'Critical source remains untruncated');
 return native;
}
for(const q of [p,strict,tight,driverChanged])completePacket(q,request);
const full=completeDriverJourney(f);completePacket(full.document,request);
completePacket(p,{...request,objectId:ids.outcomeContractId});
const persistenceRequest={...request,prompt:'Compare persistence and database approaches for this result authority.'};
const persistenceMethod=intelligencePacket(p,persistenceRequest);assert.equal(persistenceMethod.sources.find(s=>s.kind==='architecture-knowledge')?.objectId,'persistence-method','An unrelated topic keeps its method when no task exists');
const persistenceQuestion=intelligencePacket(full.persistenceReady,persistenceRequest);
const persistenceGrounding=persistenceQuestion.sources.find(s=>s.kind==='architecture-knowledge');assert(persistenceGrounding,'A linked read does not override a persistence question');
assert.equal(persistenceGrounding.objectId,full.ids.persistenceTaskId);assert.deepEqual(new Set(decodeArchitectureGrounding(persistenceGrounding.excerpt).graphs.map(g=>g.optionId)),new Set(['relational-transaction','aggregate-document']));
const distributionQuestion=intelligencePacket(p,{...request,prompt:'Compare reverse proxy and load balancer responsibilities.'});
assert.equal(distributionQuestion.sources.find(s=>s.kind==='architecture-knowledge')?.objectId,'distribution-method','The same canonical topic selector preserves an unrelated composition-method question');
const explicit=intelligencePacket(p,{...request,mode:'mind',architectureTaskId:ids.readTaskId,prompt:'Compare both read approaches against the same drivers.'});
const grounding=explicit.sources.find(s=>s.kind==='architecture-knowledge');assert(grounding);assert.equal(explicit.architectureDraft,undefined,'An accepted task remains read only');
assert.deepEqual(new Set(decodeArchitectureGrounding(grounding.excerpt).graphs.map(g=>g.optionId)),new Set(['direct-read','cache-aside']));
const draft=intelligencePacket(f.readReady,{...request,mode:'mind',architectureTaskId:ids.readTaskId,prompt:'Compare both read approaches and draft the missing conditions.'});assert.equal(draft.architectureDraft.taskId,ids.readTaskId);assert(draft.sources.some(s=>s.kind==='architecture-knowledge'));
for(const excludedId of [ids.readTaskId,ids.freshnessDriverId,ids.resultDataId,supportOnly.id]){
 const packed=packArchitectureIntelligence([{...reading,insights:[insight]}],{excluded:new Set([excludedId])});assert.equal(packed.sources.length,0,'A withheld operand or currentness dependency withholds the whole deduction');
 const q=structuredClone(p);q.workspace={...q.workspace,aiPolicy:{...q.workspace?.aiPolicy,excludedObjectIds:[excludedId]}};
 const safe=intelligencePacket(q,request);assert(!safe.sources.some(s=>s.kind==='architecture-intelligence'&&JSON.parse(s.excerpt).insights.some(i=>i.id===insight.id)));
 assert(!JSON.stringify(safe).includes(excludedId),'The disclosed packet does not expose excluded source identifiers');
}
const small=packArchitectureIntelligence([{...reading,insights:[insight]}],{maxCharacters:4000});assert.equal(small.sources.length,0);assert.equal(small.omitted,1);
assert.equal(JSON.stringify(p),before);
console.log('PASS native Sol retains every check/obligation for consistent, conflicting, changed and complete journeys within22 sources/28K; unrelated persistence/distribution questions and explicit task alternatives remain available; exclusions and insufficient budget withhold the whole deduction');
