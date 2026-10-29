// Authored design counterfactuals; no live provider or infrastructure test.
import assert from 'node:assert/strict';
import {executionCompositionFixture,EXECUTION_FIXTURE_AT as at} from './execution-composition-fixtures.mjs';
import {assessContractExecution,contractExecutionContext,normaliseContractExecution,executionMethodSource} from './public/architecture-applicability.js';
import {applyInterfacesCommand,exportInterfacesMarkdown,withInterfaces,interfaceFindings} from './public/interfaces-domain.js';
import {architectureIntelligence,architectureIntelligenceSource,architectureIntelligenceCurrent} from './public/architecture-intelligence.js';
import {applyKnowledgeCommand,knowledgeImpactStamp} from './public/knowledge-governance.js';
import {previewInterfaceChange,rebaseInterfaceChange} from './public/interface-impact.js';
import {intelligencePacket,packArchitectureIntelligence} from './public/intelligence-context.js';

const fixture=executionCompositionFixture(),{ids}=fixture;
const get=p=>p.interfaces.contracts.find(c=>c.id===ids.contractId);
const command=(p,patch)=>applyInterfacesCommand(p,{type:'interfaces.contract',payload:{id:ids.contractId,...patch}},at).document;
const patch=(p,changes)=>command(p,{execution:{...get(p).execution,...changes}});
const read=p=>assessContractExecution(get(p),contractExecutionContext(p,get(p)));
const caller={callerRetries:'bounded',maxAttempts:3,attemptTimeoutMs:200,backoffBudgetMs:100,callerBudgetMs:700,retryFailures:'transient-only',retryLayers:'one-owner',circuitBreaker:'caller',openCircuit:'stop'};
const p=command(patch(fixture.document,caller),{kind:'request'}),before=JSON.stringify(p),r=read(p);
assert.equal(r.state,'context-match');
assert.equal(r.calculations[0].value,700);assert.equal(r.calculations[0].budget,700);
assert(r.obligations.some(o=>o.id.endsWith(':caller-budget')&&o.verification==='pending'));
assert(r.placement.some(x=>x.role==='circuit-breaker'&&x.componentId===ids.producer));
assert(r.placement.some(x=>x.role==='repeat-protection'&&x.componentId===ids.consumer));
assert.equal(read(fixture.document).calculations.length,0,'Legacy declarations must not acquire an inferred caller budget');
console.log('PASS exact-boundary declared attempt envelope, separate caller/effect placement and pending verification');

for(const [change,id] of [
 [{callerBudgetMs:699},'caller-envelope'],[{retryFailures:'any'},'retry-failures'],
 [{retryLayers:'nested'},'retry-owner'],[{openCircuit:'retry'},'open-circuit'],
 [{repetition:'none'},'caller-repeat'],[{identity:'per-attempt'},'stable-repeat-key'],
 [{timeout:'failed'},'uncertain-result'],[{protection:'broker-only'},'repeat-protection']
]){
 const q=patch(p,change),result=read(q);assert.equal(result.state,'excluded');
 assert(result.blockers.some(c=>c.id===id),id);
 assert(interfaceFindings(q).some(f=>f.code==='execution'&&f.level==='error'));
}
assert(read(command(p,{kind:'event'})).blockers.some(c=>c.id==='request-call'));
assert(read(command(p,{kind:'batch'})).blockers.some(c=>c.id==='request-call'));
assert(read(command(p,{idempotencyKey:'absent_from_request'})).blockers.some(c=>c.id==='idempotencyKey-dictionary'));
assert.match(read(patch(p,{callerBudgetMs:699})).reasons.join(' '),/700 ms.*699 ms/);
console.log('PASS deadline overrun, permanent errors, nested retries, open circuit, unsafe repeat and wrong interaction style are explained conflicts');

for(const key of Object.keys(caller)){
 const result=read(patch(p,{[key]:undefined}));assert.equal(result.state,'needs-context',key);
 assert(result.unknown.length,key);
}
const zero=patch(p,{backoffBudgetMs:0,callerBudgetMs:600});assert.equal(read(zero).state,'context-match');assert.equal(read(zero).calculations[0].value,600);
const noCircuit=patch(p,{circuitBreaker:'none',openCircuit:undefined});assert.equal(read(noCircuit).state,'context-match');assert(!read(noCircuit).checks.some(c=>c.id==='open-circuit'),'A breaker is not compulsory');
const stopped=patch(p,{callerRetries:'none'});assert.equal(read(stopped).calculations.length,0);assert(!read(stopped).obligations.some(o=>o.id.endsWith(':caller-budget')));
assert(read(stopped).placement.some(x=>x.role==='circuit-breaker'));assert(read(stopped).obligations.some(o=>o.id.endsWith(':caller-circuit')));
assert.equal(read(stopped).state,'context-match','A request circuit remains valid without automatic retries');
for(const kind of ['event','batch']){
 const q=command(stopped,{kind}),result=read(q);
 assert.equal(result.state,'excluded');assert(result.blockers.some(c=>c.id==='request-call'),'A circuit must identify its request boundary even without retry');
 const hint=architectureIntelligence(q,{chapter:8,id:ids.contractId}).insights.find(i=>i.kind==='composition');
 assert.equal(hint.actions[0].fieldKey,'kind');
 assert.equal(read(patch(q,{circuitBreaker:'none',openCircuit:undefined})).state,'context-match','A declared absence of caller mechanisms adds no request-only constraint');
}
const missingKind={...get(stopped)};delete missingKind.kind;
assert(assessContractExecution(missingKind,contractExecutionContext(stopped,missingKind)).unknown.some(c=>c.id==='request-call'),'Missing invocation kind remains unknown');
assert(read(patch(stopped,{openCircuit:'retry'})).blockers.some(c=>c.id==='open-circuit'),'An explicitly declared circuit also guards calls with no automatic retry');
for(const raw of [{maxAttempts:2.5},{maxAttempts:1},{maxAttempts:Infinity},{attemptTimeoutMs:-1},{backoffBudgetMs:'0'},{backoffBudgetMs:NaN},{callerBudgetMs:false}])assert.throws(()=>normaliseContractExecution(raw));
assert.equal(normaliseContractExecution({backoffBudgetMs:0}).backoffBudgetMs,0);
assert.equal(get(withInterfaces(JSON.parse(JSON.stringify(zero)))).execution.backoffBudgetMs,0);
assert(exportInterfacesMarkdown(zero).includes('Maximum total delay across retries (ms): 0'));
assert.equal(JSON.stringify(p),before);
console.log('PASS missing facts stay unknown; explicit zero, no-breaker/no-retry choices, numeric validity and persisted/exported values remain exact');

const selection={chapter:8,id:ids.contractId},reading=architectureIntelligence(p,selection),insight=reading.insights.find(i=>i.kind==='composition'),captured=architectureIntelligenceSource(reading);
assert(insight.detail.includes('700 ms against 700 ms'));assert.equal(architectureIntelligenceCurrent(p,captured),true);
assert.equal(architectureIntelligenceCurrent(patch(p,{callerBudgetMs:650}),captured),false);
const wrongStyle=architectureIntelligence(command(p,{kind:'event'}),selection).insights.find(i=>i.kind==='composition');assert.equal(wrongStyle.actions[0].fieldKey,'kind');
const incomplete=architectureIntelligence(patch(p,{maxAttempts:undefined}),selection).insights.find(i=>i.kind==='composition');assert.equal(incomplete.actions[0].fieldKey,'execution.maxAttempts');
const method=executionMethodSource(p),source='MS-TRANSIENT-FAULTS';
const withdrawn=applyKnowledgeCommand(p,{type:'knowledge.withdraw',payload:{id:source,stamp:knowledgeImpactStamp(p,source),reviewed:true,reviewer:'Synthetic reviewer',reason:'Exercise source support withdrawal.'}},at,'synthetic-reviewer').document;
assert(!executionMethodSource(withdrawn));assert(!architectureIntelligence(withdrawn,selection).insights.some(i=>i.kind==='composition'));
assert.deepEqual(get(withdrawn).execution,get(p).execution);
assert.equal(architectureIntelligenceCurrent(withdrawn,captured),false);
const packet=intelligencePacket(p,{chapter:8,objectId:ids.contractId,mode:'challenge',prompt:'Review the declared request budget and repeated effects together.'});
assert(packet.sources.some(s=>s.id===method.id));assert(packet.sources.some(s=>s.id==='architecture-intelligence:'+ids.contractId));
assert(packet.coverage.characters<=28000);assert(packet.sources.length<=22);
const derived=packet.sources.find(s=>s.id==='architecture-intelligence:'+ids.contractId),body=JSON.parse(derived.excerpt),composed=body.insights.find(i=>i.id===insight.id);
assert(composed,'A full composition must not be displaced by smaller catalogue suggestions');
assert.deepEqual(composed.checks.map(c=>c.id),insight.checks.map(c=>c.id));
assert.deepEqual(composed.obligations.map(o=>[o.id,o.action,o.evidence,o.targetIds]),insight.obligations.map(o=>[o.id,o.action,o.evidence,o.targetIds]));
assert.deepEqual(composed.placement,insight.placement);assert.deepEqual(composed.scope,insight.scope);
assert(derived.receipt.sourceRefs.every(id=>packet.sources.some(s=>s.id===id)),'All supporting facts travel with the deduction');
const circuitPacket=intelligencePacket(stopped,{chapter:8,objectId:ids.contractId,mode:'challenge',prompt:'Review the circuit and the unresolved outcome.'});
assert(JSON.parse(circuitPacket.sources.find(s=>s.kind==='architecture-intelligence').excerpt).insights.find(i=>i.kind==='composition').obligations.some(o=>o.id.endsWith(':caller-circuit')),'A circuit without retries keeps its own verification obligation');
const bounded=packArchitectureIntelligence([{...reading,insights:[insight]}],{maxCharacters:3000,maxSources:22});
assert.equal(bounded.sources.length,0,'A composition with an incomplete source allowance is withheld together');assert.equal(bounded.omitted,1);
console.log('PASS source-backed native guidance, exact model/source currentness and complete bounded provider context');

const proposal={type:'interfaces.contract',payload:{id:ids.contractId,execution:{...get(p).execution,callerBudgetMs:900}}},preview=previewInterfaceChange(p,proposal);
assert(preview.fields.some(f=>f.key==='execution'));
const independent=command(p,{owner:'A different accountable team'}),rebased=rebaseInterfaceChange(independent,preview);
assert.equal(rebased.conflicts.length,0);assert.equal(get(previewInterfaceChange(independent,rebased.command).document).owner,'A different accountable team');
const overlap=rebaseInterfaceChange(patch(p,{maxAttempts:4}),preview);assert(overlap.conflicts.length,'Overlapping caller declarations must be reviewed');
assert.equal(JSON.stringify(p),before);
console.log('PASS native preview keeps saved facts unchanged and requires review of concurrent changes to the execution agreement');
