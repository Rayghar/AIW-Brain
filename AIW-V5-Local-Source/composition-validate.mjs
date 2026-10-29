import {compositionFixture,compositionFixtureAnswers,arc,readyComposition} from './composition-fixtures.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createProject} from './shared/projects-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {withFinalReview,exportSDD} from './public/review-domain.js';
import {applyArchitectureCommand,architectureSourceStamp} from './public/architecture-design.js';
import {assessInteraction,interactionReasoningGraph,interactionContextCurrent,architectureGrounding} from './public/architecture-knowledge.js';
import {designBasisCurrent} from './public/design-task-state.js';
import {previewAlternative,applyAlternativeCommand} from './public/model-alternatives.js';
import {previewReversal} from './public/model-reversal.js';
import {intelligencePacket} from './public/intelligence-context.js';
import {analyseQuality,normaliseAnalysis,analysisModelStamp,measurementCurrent} from './public/quality-analysis.js';
import {applyKnowledgeCommand,knowledgeImpactStamp} from './public/knowledge-governance.js';
import {deliveryJourney} from './public/architecture-journey.js';
import {compositionSketch} from './public/composition-ui.js';
import {COMPOSITION_TOPICS,compositionSources} from './public/composition-knowledge.js';
import {decodeArchitectureGrounding} from './shared/architecture-grounding.js';
import {applyRealisationCommand} from './public/realisation-domain.js';

const at='2026-09-20T22:00:00.000Z';
const task=p=>p.coauthoring.designTasks.at(-1);
const cases=[['delivery','transactional-outbox',5],['delivery','best-effort-publish',4],['delivery','direct-delivery',3],['resilience','bounded-call',2],['resilience','protected-call',2],['distribution','single-endpoint',2],['distribution','balanced-pool',3],['distribution','reverse-proxy',3],['distribution','proxy-balanced-pool',3],['partitioning','single-partition',3],['partitioning','sharded',3],['structure','layered-module',1],['structure','service-boundaries',2]];
const outcomes=[];
// New families retain the supplied workbook identity and primary-source receipts;
// executable predicates are authored conditional rules, not workbook examples.
const shardSources=compositionSources('partitioning');
assert.equal(shardSources.method.fileSha256,'d3ee19a22e664b365a0e3d618bf60ebb195788b5578a425d25c8672e7c53e4a6');
assert(shardSources.method.passages.some(p=>p.locator==='Components GuideBook v2!B20'));
for(const passage of shardSources.method.passages)assert.equal(passage.sha256,createHash('sha256').update(passage.text).digest('hex'));
assert.equal(shardSources.references[0].id,'MS-SHARDING');
// Composition source receipts use the existing canonical-JSON string digest.
assert.equal(shardSources.references[0].statementSha256,createHash('sha256').update(JSON.stringify(shardSources.references[0].statement)).digest('hex'));
// This is a fulfilment project, so the reusable method and canvas must not
// inherit the repayment-notification language of the SEABaaS sample.
const generic=readyComposition('delivery',{directPlan:'Bound the call and reconcile uncertain outcomes.',lossPlan:'Reconcile lost events against authoritative state.'}),genericJourney=deliveryJourney(generic,'REQ-001');
assert.equal(genericJourney.requirement.title,'Publish fulfilment changes');
assert.equal(genericJourney.options.length,3);
for(const {option,assessment} of genericJourney.options){
 const guidance=[option.title,option.pattern,option.tactic,option.benefit,option.cost,...assessment.effects.flatMap(e=>[e.why,e.verify]),compositionSketch(option.id)].join(' ');
 assert(!/SEABaaS|repayment|schedule|customer|notification/i.test(guidance),'A case example must not become generic delivery guidance: '+option.id);
}
for(const [topic,option,count] of cases){
 let p=readyComposition(topic,['best-effort-publish','direct-delivery'].includes(option)?{deliveryContract:'best-effort'}:{}),a=assessInteraction(p,task(p),option);
 assert(a.ready,JSON.stringify(a));assert.equal(a.score,null);
 const g=interactionReasoningGraph(p,task(p),option),ids=new Set(g.nodes.map(n=>n.id));assert(g.edges.every(e=>ids.has(e.from)&&ids.has(e.to)));
 const prepared=arc(p,'architecture.prepare',{optionId:option}),alt=prepared.document.modelAlternatives.records.find(a=>a.id===prepared.selected),q=previewAlternative(prepared.document,alt);
 assert.equal(p.realisation.components.length,0);assert.equal(q.document.realisation.components.length,count,option);
 assert.equal(q.document.decisions.records[0].status,'draft');assert.equal(q.document.decisions.records[0].alternatives.length,COMPOSITION_TOPICS[topic].options.length);
 const solution=q.solution,componentIds=new Set(q.document.realisation.components.map(c=>c.id));
 assert(solution&&solution.obligations.length,option+' has a concrete solution trace');
 assert(solution.placement.every(place=>componentIds.has(place.componentId)),option+' places each responsibility on a concrete component');
 assert(solution.obligations.every(obligation=>obligation.targetIds.length&&obligation.targetIds.every(id=>componentIds.has(id))&&obligation.verification==='pending'),option+' preserves concrete targets and unverified obligations');
 assert.equal(solution.alternatives.length,COMPOSITION_TOPICS[topic].options.length);assert.equal(solution.alternatives.filter(a=>a.selected).length,1);
 if(option==='direct-delivery')assert(!q.document.realisation.components.some(c=>c.kind==='queue'),'A direct notification call does not invent a broker');
 assert(q.changes.some(c=>c.source.chapter===4));assert(q.changes.some(c=>c.source.chapter===7));
 if(option==='transactional-outbox'){
  assert.equal(q.document.realisation.components.filter(c=>c.kind==='store').length,1,'State and intent belong to one store, not two stores with an invented atomicity guarantee');
  const store=q.document.realisation.components.find(c=>c.kind==='store');assert.equal(q.document.realisation.connections.filter(e=>e.from===store.id&&q.document.interfaces.data.some(d=>d.id===e.to)).length,2);
  assert.equal(q.document.interfaces.lineage.length,1);
 }
 if(option==='layered-module')assert.equal(q.document.realisation.connections.length,0,'Internal modules do not create a network self-call');
 if(option==='protected-call')assert(!q.document.realisation.components.some(c=>c.kind==='adapter'),'A policy need not invent an external proxy');
 if(option==='sharded'){assert(!q.document.realisation.components.some(c=>c.kind==='adapter'),'Application-hosted routing does not create an extra deployable router');assert(q.document.logical.responsibilities.some(r=>r.title.startsWith('Shard-key routing')));assert(q.document.realisation.connections.every(c=>c.from!==c.to),'Shared-host routing has no physical self-call');assert.equal(q.document.interfaces.lineage.length,1);}
 if(option==='sharded'){const processor=solution.placement.find(p=>p.role==='processor').componentId,router=solution.placement.find(p=>p.role==='router');assert.equal(router.componentId,processor);assert.deepEqual(solution.obligations.find(o=>o.id.endsWith(':partition-route')).targetIds,[processor]);}
 if(option==='proxy-balanced-pool'){const router=solution.placement.find(p=>p.role==='router').componentId;for(const suffix of [':traffic-router',':traffic-readiness',':http-boundary'])assert.deepEqual(solution.obligations.find(o=>o.id.endsWith(suffix)).targetIds,[router]);assert.equal(q.document.realisation.components.filter(c=>c.kind==='adapter').length,1,'Proxy and balancing can share one intermediary');}
 assert.throws(()=>applyAlternativeCommand(prepared.document,{type:'alternative.apply',payload:{id:alt.id,alternativeRevision:alt.revision,previewStamp:q.stamp,reviewed:false}},at),/Review/);
 const applied=applyAlternativeCommand(prepared.document,{type:'alternative.apply',payload:{id:alt.id,alternativeRevision:alt.revision,previewStamp:q.stamp,reviewed:true,reviewer:'Synthetic acceptance test',reason:'Reviewed explicit conditions and model changes.'}},at).document;
 assert(designBasisCurrent(applied,task(applied)),option+' remains current after application');assert(interactionContextCurrent(applied,task(applied)));
 const saved=task(applied).applied.reasoningGraph.solution;assert.equal(saved.state,'adopted');assert(saved.obligations.every(o=>o.verification==='pending'));assert.equal(saved.alternatives.length,COMPOSITION_TOPICS[topic].options.length);
 const adoptedGrounding=architectureGrounding(applied,{tasks:[task(applied)]},{prompt:'Compare '+option,architectureTaskId:task(applied).id});assert(adoptedGrounding.excerpt.length<=20000,option+' adopted trace remains within its source budget');
 const decoded=decodeArchitectureGrounding(adoptedGrounding.excerpt);assert.equal(decoded.graphs.length,COMPOSITION_TOPICS[topic].options.length);assert.equal(decoded.task.solution.obligations.length,saved.obligations.length);
 for(const alternative of decoded.graphs){const shared=decoded.sharedByEveryAlternative,nodes=new Set([...shared.nodes,...alternative.nodes,...decoded.sources].map(n=>n.id)),edges=[...shared.edges,...alternative.edges],canonical=interactionReasoningGraph(applied,task(applied),alternative.optionId);assert(edges.every(e=>nodes.has(e.from)&&nodes.has(e.to)));assert.deepEqual(new Set(edges.map(e=>JSON.stringify([e.from,e.kind,e.to]))),new Set(canonical.edges.map(e=>JSON.stringify([e.from,e.kind,e.to]))));assert.deepEqual([...shared.checks,...alternative.checks].map(c=>[c.id,c.state]).sort(),canonical.assessment.checks.map(c=>[c.id,c.state]).sort());}
 for(const obligation of saved.obligations){const restored=decoded.task.solution.obligations.find(o=>o.id===obligation.id);assert.deepEqual(restored.targetIds,obligation.targetIds);assert.equal(restored.verification,'pending');}
 const edited=structuredClone(applied);edited.realisation.components[0].purpose+=' Changed after acceptance.';assert(!interactionContextCurrent(edited,task(edited)),option+' captures newly created object identity');
 if(['transactional-outbox','protected-call'].includes(option)){
  let reuse=applyArchitectureCommand(applied,{type:'architecture.start',payload:{requirementId:'REQ-001',driverId:'QD-001',topic}},at).document;
  reuse=arc(reuse,'architecture.answers',{answers:{...task(applied).answers,contextReview:'Reuse the reviewed operating components and preserve their saved definitions.'}}).document;
  const preparedReuse=arc(reuse,'architecture.prepare',{optionId:option}),reused=previewAlternative(preparedReuse.document,preparedReuse.document.modelAlternatives.records.find(x=>x.id===preparedReuse.selected)).document;
  assert.deepEqual(reused.realisation.components,applied.realisation.components,'Reused component definitions remain unchanged');
  for(const data of applied.interfaces.data)for(const key of ['title','purpose','authorityId','owner','classification','retentionPolicy','retentionDays','retentionBasis','retentionConfirmed','protection','fields','evidence'])assert.deepEqual(reused.interfaces.data.find(d=>d.id===data.id)[key],data[key],'Existing data definition is preserved: '+key);
  for(const need of applied.technology.needs)assert.deepEqual(reused.technology.needs.find(n=>n.id===need.id),need,'Existing confirmed technology needs retain their definition');
 }
 assert(exportSDD(applied).includes(a.option.pattern));assert(exportSDD(applied).includes('Method receipt'));
 const packet=intelligencePacket(p,{chapter:2,objectId:'QD-001',mode:'mind',prompt:'Compare '+a.option.pattern,architectureTaskId:task(p).id});
 const ground=packet.sources.find(s=>s.kind==='architecture-knowledge');assert(ground,option+' LLM grounded method');assert.equal(packet.canDesign,false);assert(ground.excerpt.includes(option));
 const long=structuredClone(p);for(const [k,v] of Object.entries(task(long).answers))if(v&&!k.endsWith('Id')&&!['classification','compositionTopic'].includes(k)&&v.length>60)task(long).answers[k]='Detailed project declaration. '.repeat(80);const bounded=intelligencePacket(long,{chapter:2,objectId:'QD-001',mode:'mind',prompt:'Compare '+a.option.pattern,architectureTaskId:task(long).id});assert(bounded.sources.some(s=>s.kind==='architecture-knowledge'));assert(bounded.sources.reduce((n,s)=>n+s.excerpt.length,0)<=28000);
 const appliedAlt=applied.modelAlternatives.records.find(x=>x.id===alt.id),reversal=previewReversal(applied,appliedAlt);assert(reversal.allowed);
 const reverted=applyAlternativeCommand(applied,{type:'alternative.rollback',payload:{id:alt.id,alternativeRevision:appliedAlt.revision,previewStamp:reversal.stamp,reviewed:true,reviewer:'Synthetic acceptance test',reason:'Verify safe restoration.'}},at).document;assert.equal(reverted.realisation.components.length,0);
 const stale=structuredClone(prepared.document);stale.quality.drivers[0].targetValue='2';assert.throws(()=>previewAlternative(stale,stale.modelAlternatives.records.find(x=>x.id===alt.id)),/sources changed/i);
 outcomes.push({topic,option,components:count,accepted:true,sourceFreshness:true,SDD:true,reversal:true,packetCharacters:adoptedGrounding.excerpt.length});
}
// Hosting the same logical router in storage or an explicit gateway changes the
// topology and obligation target, not the data-model choice or business writer.
for(const [routingOwner,expectedCount,hostRole] of [['platform',3,'store'],['dedicated',4,'router']]){
 const p=readyComposition('partitioning',{routingOwner}),prepared=arc(p,'architecture.prepare',{optionId:'sharded'}),alternative=prepared.document.modelAlternatives.records.find(a=>a.id===prepared.selected),preview=previewAlternative(prepared.document,alternative);
 assert.equal(preview.document.realisation.components.length,expectedCount);
 const route=preview.solution.placement.find(p=>p.role==='router'),host=preview.solution.placement.find(p=>p.role===hostRole);
 assert.equal(route.componentId,host.componentId);
 assert.deepEqual(preview.solution.obligations.find(o=>o.id.endsWith(':partition-route')).targetIds,[host.componentId]);
 assert(preview.document.realisation.connections.every(edge=>edge.from!==edge.to));
 const authority=preview.solution.placement.find(p=>p.role==='processor').componentId;
 assert(preview.document.interfaces.data.every(data=>data.authorityId===authority),'Routing placement does not transfer business-write authority');
}
// A component-only operating driver is a valid focus. No numerical quality
// target is invented just because this design uses a guided method.
let scoped=compositionFixture('resilience');
scoped=applyRealisationCommand(scoped,{type:'realisation.component',payload:{title:'Existing calling application',kind:'service',purpose:'Call the supplier under the existing team owner.',boundary:'Supplier request policy',owner:'Service owner',inputs:'Supplier reference',outputs:'Status or declared unavailability'}},at).document;
const scopedComponent=scoped.realisation.components.at(-1).id;
scoped=applyQualityCommand(scoped,{type:'quality.driver',payload:{kind:'operational',title:'Keep dependency protection with the existing owner',description:'The calling application team owns dependency failures.',impact:'Place timeout, breaker and isolation policies inside the caller.',componentIds:[scopedComponent],requirementIds:[],owner:'Service owner',confirmed:true}},at).document;
const operating=scoped.quality.drivers.at(-1);assert.equal(operating.requirementIds.length,0);
scoped=applyArchitectureCommand(scoped,{type:'architecture.start',payload:{topic:'resilience',requirementId:'REQ-001',driverId:operating.id,contextIds:[scopedComponent]}},at).document;
scoped=arc(scoped,'architecture.answers',{answers:{...compositionFixtureAnswers,callerId:scopedComponent}}).document;
const operatingAssessment=assessInteraction(scoped,task(scoped),'protected-call');assert(operatingAssessment.ready);assert.equal(operatingAssessment.driver.kind,'operational');assert.equal(operatingAssessment.driver.target,operating.description);assert.equal(operatingAssessment.driver.measurable,false);assert.equal(operatingAssessment.checks.find(c=>c.id==='driver').title,'Focus driver');assert(!operatingAssessment.caveats.some(c=>/scenario.*measurable|measurable target/i.test(c)));
const operatingPrepared=arc(scoped,'architecture.prepare',{optionId:'protected-call'}),operatingAlternative=operatingPrepared.document.modelAlternatives.records.find(a=>a.id===operatingPrepared.selected),operatingPreview=previewAlternative(operatingPrepared.document,operatingAlternative);
assert.equal(operatingPreview.solution.focusDriverId,operating.id);assert(operatingPreview.solution.driverIds.includes(operating.id));assert(operatingPreview.solution.obligations.every(o=>o.driverIds.includes(operating.id)&&o.verification==='pending'));assert.equal(operatingAlternative.reasoningGraph.nodes.find(n=>n.id===operating.id).kind,'driver');
// Deliberate counterexamples come from the problem statements, not recipe output.
for(const [topic,option,patch,finding] of [
 ['delivery','best-effort-publish',{deliveryContract:'required'},'delivery-loss'],
 ['delivery','direct-delivery',{deliveryContract:'required'},'delivery-loss'],
 ['delivery','transactional-outbox',{commitScope:'separate'},'atomicity'],
 ['delivery','transactional-outbox',{duplicates:'unsafe'},'duplicate-effect'],
 ['delivery','best-effort-publish',{deliveryContract:'best-effort',duplicates:'unsafe'},'duplicate-effect'],
 ['resilience','bounded-call',{repeatSafety:'unsafe'},'unsafe-retry'],
 ['resilience','protected-call',{fallback:'fabricate'},'false-success'],
 ['resilience','protected-call',{dependencyType:'local'},'local-breaker'],
 ['distribution','balanced-pool',{sessionState:'local'},'session-state'],
 ['distribution','balanced-pool',{independence:'serial'},'serial-work'],
 ['distribution','reverse-proxy',{proxyProtocol:'other'},'proxy-protocol'],
 ['distribution','reverse-proxy',{edgeNeed:'none'},'proxy-need'],
 ['distribution','proxy-balanced-pool',{sessionState:'local'},'session-state'],
 ['partitioning','sharded',{partitionMotivation:'none'},'shard-need'],
 ['partitioning','sharded',{transactionLocality:'cross'},'shard-locality'],
 ['partitioning','single-partition',{singleFit:'shortfall'},'single-store-fit'],
 ['structure','service-boundaries',{crossTransaction:'local'},'distributed-atomicity']
]){const p=readyComposition(topic,patch),r=assessInteraction(p,task(p),option);assert(r.blockers.some(b=>b.id===finding),finding);assert.throws(()=>arc(p,'architecture.prepare',{optionId:option}));}

let p=readyComposition('delivery'),t=task(p);
p=applyKnowledgeCommand(p,{type:'knowledge.withdraw',payload:{id:'AWS-OUTBOX',stamp:knowledgeImpactStamp(p,'AWS-OUTBOX'),reviewed:true,reviewer:'Synthetic QA',reason:'Test reference withdrawal.'}},at,'synthetic-actor').document;
assert(!assessInteraction(p,task(p),'transactional-outbox').ready);

// Independently calculated arithmetic examples and degenerate inputs.
const analyticCases=[
 ['delivery',{arrival:20,service:15,workers:2,backlog:120},'drain',12],
 ['reads',{arrival:1000,hit:80,cacheMs:2,originMs:20},'mean-latency',6],
 ['persistence',{detect:60,sizeGiB:10,rateMiB:128,replay:40,verify:20},'restore-time',200],
 ['resilience',{attempts:3,timeout:100,backoff:10,cap:15,concurrency:5},'deadline',325],
 ['distribution',{arrival:80,service:60,workers:3,downstream:100,efficiency:100},'capacity',100],
 ['structure',{calls:3,roundTrip:4,local:5},'mean-budget',17]
];
for(const [topic,inputs,id,expected] of analyticCases){const r=analyseQuality(topic,{inputs});assert(Math.abs(r.outputs.find(o=>o.id===id).value-expected)<1e-8);assert.equal(r.authority.includes('no achieved target'),true);}
assert.equal(analyseQuality('delivery',{inputs:{arrival:40,service:15,workers:2,backlog:120}}).outputs.find(o=>o.id==='drain').value,null);
for(const bad of [-1,Infinity,'NaN'])assert.throws(()=>normaliseAnalysis({inputs:{workers:bad}},'distribution'),/between/);
assert.throws(()=>normaliseAnalysis({inputs:{workers:1.5}},'distribution'),/whole number/);
assert(!analyseQuality('reads',{inputs:{}}).ready);
assert.equal(analyseQuality('partitioning',null).unsupported,true);
const trafficInputs={inputs:{arrival:80,service:60,workers:3,downstream:100,efficiency:100}};
assert.equal(analyseQuality('distribution',trafficInputs,'reverse-proxy').outputs.find(o=>o.id==='capacity').value,60);
assert.equal(analyseQuality('distribution',trafficInputs,'proxy-balanced-pool').outputs.find(o=>o.id==='capacity').value,100);

// A recorded measurement never silently changes a quality target or marks it met.
p=readyComposition('distribution',{analysis:JSON.stringify({inputs:{arrival:80,service:60,workers:3,downstream:100,efficiency:100},scenario:'Synthetic three-replica test'})});
p=applyKnowledgeCommand(p,{type:'knowledge.source',payload:{title:'Synthetic measurement log',path:'synthetic/load-test.log',revision:'test-1',body:'Synthetic test observations in requests/s: 96, 100, 98.\nNo production measurement is represented.'}},at,'synthetic-actor').document;
t=task(p);const source=p.knowledge.sources.at(-1),result=analyseQuality(t.topic,t.answers.analysis,'balanced-pool');
const payload={optionId:'balanced-pool',metricId:'capacity',samples:[96,100,98],environment:'Synthetic test',workload:'80 offered requests/s with three equal replicas',procedure:'Compare fixed observations for the calculation acceptance test.',reviewer:'Synthetic test identity',reason:'Observed mean differs by minus two requests/s.',reviewed:true,sourceId:source.id,lineStart:1,lineEnd:1,analysisStamp:result.stamp,modelStamp:analysisModelStamp(p,t)};
const target=p.quality.drivers[0].targetValue;p=arc(p,'architecture.measure',payload).document;const measurement=task(p).measurements[0];assert.equal(measurement.mean,98);assert.equal(measurement.error,-2);assert.equal(measurement.standardDeviation,2);assert(measurementCurrent(p,task(p),measurement));assert.equal(p.quality.drivers[0].targetValue,target);assert(exportSDD(p).includes('Quantitative design evidence'));
const changed=structuredClone(p);task(changed).answers.analysis=JSON.stringify({inputs:{arrival:80,service:50,workers:3,downstream:100,efficiency:100}});assert(!measurementCurrent(changed,task(changed),measurement));
assert.throws(()=>arc(changed,'architecture.measure',payload),/changed/);
assert.throws(()=>arc(p,'architecture.measure',{...payload,reviewed:false}),/Confirm/);
const withdrawn=applyKnowledgeCommand(p,{type:'knowledge.withdraw',payload:{id:source.id,stamp:knowledgeImpactStamp(p,source.id),reviewed:true,reviewer:'Synthetic QA',reason:'Measurement source invalidated for this test.'}},at,'synthetic-actor').document;assert(!measurementCurrent(withdrawn,task(withdrawn),measurement));assert(exportSDD(withdrawn).includes('Earlier model or source'));assert.throws(()=>arc(withdrawn,'architecture.measure',payload),/withdrawn/);
console.log('PASS 13 composition alternatives, 17 architectural counterexamples, component-only focus, routing placement, complete bounded traces, SDD/reversal, unchanged numerical methods and source-bound measurement calibration. Largest adopted packet: '+Math.max(...outcomes.map(o=>o.packetCharacters))+' characters.');
export {outcomes};
