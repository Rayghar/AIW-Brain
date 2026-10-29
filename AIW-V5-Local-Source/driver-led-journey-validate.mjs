// Real native-domain journeys with authored inputs. Passing this suite proves
// model consistency and review behaviour, not rendered UX, provider judgement,
// product performance, customer acceptance or a running architecture.
import assert from 'node:assert/strict';
import {driverJourneyFixture,completeDriverJourney,journeyTask,journeyArchitectureCommand,prepareJourneyChoice,DRIVER_JOURNEY_AT as at} from './driver-led-journey-fixtures.mjs';
import {assessInteraction,architectureDriverContext} from './public/architecture-knowledge.js';
import {architectureReassessment,designBasisCurrent} from './public/design-task-state.js';
import {applyAlternativeCommand} from './public/model-alternatives.js';
import {previewReversal} from './public/model-reversal.js';
import {choiceForDesign} from './public/product-choice.js';
import {applyTechnologyRealisationCommand,selectionCurrent} from './public/technology-realisation-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {architectureModel} from './public/architecture-model.js';
import {componentSpecDocument} from './public/component-spec-document.js';
import {evaluateArchitectureCase,architectureCases,caseConclusionBasis,applyArchitectureCaseCommand} from './public/architecture-case.js';
import {sddDocument} from './public/sdd-document.js';
import {intelligencePacket} from './public/intelligence-context.js';
import {generationCurrent} from './public/aiw-brain.js';
import {decodeArchitectureGrounding} from './shared/architecture-grounding.js';
import {assessContractExecution,contractExecutionContext} from './public/architecture-applicability.js';
import {applyInterfacesCommand} from './public/interfaces-domain.js';
import {architectureIntelligence,architectureIntelligenceSource,architectureIntelligenceCurrent} from './public/architecture-intelligence.js';
import {applyCommand} from './public/requirements-domain.js';
import {applyRequirementsCommand} from './public/requirement-commands.js';
import {applyArchitectureCommand} from './public/architecture-design.js';
import {scopedDocument} from './public/module-lens.js';

const realization=(p,id)=>p.technologyRealisation.records.find(r=>r.id===id);
const tech=(p,type,payload)=>applyTechnologyRealisationCommand(p,{type:'techrealisation.'+type,payload},at).document;
const checks=p=>evaluateArchitectureCase(p,{caseId:architectureCases(p)[0].id});
const execution=(p,id)=>{const c=p.interfaces.contracts.find(c=>c.id===id);return assessContractExecution(c,contractExecutionContext(p,c));};
const obligationsSection=p=>sddDocument(p,{figures:false}).markdown.split('## Accepted architecture obligations\n\n')[1]?.split('\n## ')[0]||'';

for(const [domain,approach,selectedProduct] of [['fulfilment','cache-aside','PostgreSQL'],['payment','direct-read','MySQL']]){
 const f=driverJourneyFixture({domain,approach}),{ids}=f;
 const missing=assessInteraction(f.readStarted,journeyTask(f.readStarted,ids.readTaskId),'cache-aside');
 assert(missing.unknown.length>0);assert.equal(missing.ready,false);
 assert.throws(()=>prepareJourneyChoice(f.readStarted,ids.readTaskId,'cache-aside'),/Freshness|Information|Source|permission/i,'A product or pattern is not selected without its required read contract');
 const prohibited=journeyArchitectureCommand(f.readReady,ids.readTaskId,'architecture.answers',{answers:{freshness:'bounded',maxAge:'30',reuse:'repeated',cachePermission:'prohibited'}}).document;
 assert(assessInteraction(prohibited,journeyTask(prohibited,ids.readTaskId),'cache-aside').blockers.some(c=>c.id==='permission'));
 assert.throws(()=>prepareJourneyChoice(prohibited,ids.readTaskId,'cache-aside'),/must not be retained/);
 const direct=assessInteraction(prohibited,journeyTask(prohibited,ids.readTaskId),'direct-read');assert(direct.ready,'A prohibition on copying does not exclude the source read path');
 const read=journeyTask(f.document,ids.readTaskId),solution=read.applied.reasoningGraph.solution;
 assert.deepEqual(f.readPrepared.document.interfaces,f.readReady.interfaces,'Review preview leaves current contracts and dictionaries unchanged');
 assert.equal(read.status,'applied');assert(designBasisCurrent(f.document,read));
 assert.equal(solution.state,'adopted');assert.equal(solution.verification,'pending');
 assert(solution.driverIds.includes(ids.driverId)&&solution.driverIds.includes(ids.freshnessDriverId)&&solution.driverIds.includes(ids.constraintDriverId));
 assert(solution.alternatives.length>=2);assert(solution.obligations.every(o=>o.verification==='pending'&&o.targetIds.length));
 assert.equal(read.answers.callerId,ids.producer);assert.equal(read.answers.processorId,ids.authority);assert.equal(read.answers.dataId,ids.resultDataId);
 assert.equal(f.document.interfaces.data.find(d=>d.id===ids.resultDataId).authorityId,ids.authority);
 assert.deepEqual(f.document.interfaces.data.find(d=>d.id===ids.resultDataId).fields,f.initial.interfaces.data.find(d=>d.id===ids.resultDataId).fields);
 if(approach==='cache-aside'){
  assert(ids.cacheId);assert.equal(f.document.realisation.components.length,f.initial.realisation.components.length+1);
  assert(f.document.interfaces.lineage.some(l=>l.from===ids.resultDataId));
  assert(!f.document.interfaces.data.some(d=>d.authorityId===ids.cacheId),'A disposable cache cannot inherit result authority');
 }else{
  assert.equal(ids.cacheId,'');assert.equal(f.document.realisation.components.length,f.initial.realisation.components.length);
  assert.equal(f.document.interfaces.lineage.length,f.initial.interfaces.lineage.length);
  assert(!f.document.technology.capabilities.some(c=>c.category==='caching'));
 }
 const a=f.document.modelAlternatives.records.find(a=>a.id===ids.readAlternativeId),reversal=previewReversal(f.document,a);
 assert(reversal.allowed);
 const undone=applyAlternativeCommand(f.document,{type:'alternative.rollback',payload:{id:a.id,alternativeRevision:a.revision,previewStamp:reversal.stamp,reviewed:true,reviewer:'Authored journey reviewer',reason:'Reverse the accepted read arrangement before any dependent product or runtime edits exist.'}},at).document;
 assert.deepEqual(undone.interfaces.data,f.initial.interfaces.data);assert.deepEqual(undone.interfaces.lineage,f.initial.interfaces.lineage);assert.deepEqual(undone.realisation.components,f.initial.realisation.components);

 const complete=completeDriverJourney(f),p=complete.document,cids=complete.ids;
 const persist=journeyTask(p,cids.persistenceTaskId);
 const singleDocument=assessInteraction(complete.persistenceReady,journeyTask(complete.persistenceReady,cids.persistenceTaskId),'aggregate-document');
 assert(singleDocument.blockers.some(c=>c.id==='atomic-scope'),'The selected multi-record invariant excludes this explicitly bounded one-document recipe');
 assert.equal(persist.applied.reasoningGraph.solution.mechanism.pattern,'Relational transaction');
 assert.equal(persist.answers.processorId,ids.authority);assert.equal(persist.answers.dataId,ids.resultDataId);
 const priorChoice=choiceForDesign(complete.productUnassessed,cids.persistencePlanId);
 assert(priorChoice.options.every(o=>o.applicability.state==='needs-context'),'Named products and typed mechanisms do not satisfy an unassessed hard operating constraint');
 assert.equal(priorChoice.record.selectedOptionId,null);assert.equal(priorChoice.record.recorded,null,'A displayed option does not record a selection');
 const compared=choiceForDesign(complete.productCompared,cids.persistencePlanId);
 assert(compared.ruledOut.some(o=>o.id===cids.excludedProductOptionId));assert.notEqual(compared.leanAll,cids.excludedProductOptionId);
 let disallowed=tech(complete.productCompared,'preference',{id:cids.persistencePlanId,optionId:cids.excludedProductOptionId});
 assert.throws(()=>tech(disallowed,'record',{id:cids.persistencePlanId,reviewed:true}),/hard constraint/);
 const plan=realization(p,cids.persistencePlanId);assert(selectionCurrent(p,plan));
 assert.equal(plan.options.find(o=>o.id===plan.selectedOptionId).product,selectedProduct,'The authored operating boundary determines this choice; there is no universal product winner');
 assert(plan.options.every(o=>o.version&&o.specEvidence));
 const model=architectureModel(p),objectIds=new Set(model.objects.keys());
 for(const id of [ids.requirementId,ids.freshnessDriverId,ids.constraintDriverId,cids.readDecisionId,cids.persistenceDecisionId,ids.producer,ids.authority,cids.storeId,cids.persistencePlanId,ids.resultDataId,ids.outcomeContractId,ids.environmentId,cids.runtimePlanId])assert(objectIds.has(id),'The connected model must retain '+id);
 assert(model.relationships.some(e=>e.from===cids.persistencePlanId&&e.to===cids.runtimePlanId));
 const spec=componentSpecDocument(p,ids.authority);
 assert(spec.json.architectureDrivers.some(d=>d.id===ids.constraintDriverId&&d.kind==='constraint'));
 assert(spec.json.architectureObligations.length);assert.match(spec.markdown,/Design: adopted; verification is recorded with the obligations below\./);assert.match(spec.markdown,/Current evidence state: Open obligation\./);
 const report=checks(p);assert.equal(report.journey.anchorRequirementId,ids.requirementId);assert.equal(report.journey.done,8);assert.equal(report.journey.complete,false);
 assert(report.journey.checks.every(c=>c.done=== (c.key!=='recorded-test')),'One complete declared trail still needs real verification evidence');
 assert.equal(report.journey.checks.find(c=>c.key==='quality-target').objectId,ids.freshnessDriverId,'The quality step opens the actual measurable scenario, not the earlier business driver');
 assert.equal(report.acceptance,'blocked');assert.match(report.journey.authority,/has not tested the product/);
 assert.equal(p.runtime.evidence.length,0);assert(p.coauthoring.designTasks.every(t=>!(t.measurements||[]).length));
 const savedCase=architectureCases(p)[0];assert.throws(()=>applyArchitectureCaseCommand(p,{type:'case.conclude',payload:{id:savedCase.id,basis:caseConclusionBasis(p,savedCase),outcome:'support',notes:'A populated model is not evidence of achieved customer quality.',reference:'Synthetic fixture only',reviewed:true}},at,'independent-fixture-reviewer'),/readiness blockers|independent/i);
 const sdd=sddDocument(p,{figures:false}).markdown;
 for(const label of ['Relational transaction',selectedProduct,'Accepted architecture obligations','Execution agreements and authoritative outcomes',approach==='cache-aside'?'Cache-aside':'Authoritative read'])assert(sdd.includes(label),label+' must reach the same SDD');
 const duties=obligationsSection(p);
 assert(duties.includes(cids.persistenceTaskId+':persistence-restore'));assert(duties.includes('Restore into isolation and measure data loss'));assert(duties.includes('Drivers:'));
 if(approach==='cache-aside')assert(duties.includes(ids.readTaskId+':cache-freshness'));
 assert.match(duties,/pending|unverified|Open obligation/i);
 assert(!previewReversal(p,p.modelAlternatives.records.find(a=>a.id===ids.readAlternativeId)).allowed,'A late reversal must protect subsequent product and runtime edits');

 // The exact saved method, scope and pending duties are available to Sol. This
 // examines a source packet, not a generated answer or live provider quality.
 const packet=intelligencePacket(p,{chapter:2,objectId:ids.freshnessDriverId,mode:'mind',architectureTaskId:ids.readTaskId,prompt:'Explain the chosen read boundary, alternatives, supporting drivers and unresolved verification.'});
 assert(packet.sources.length<=22);assert(packet.sources.reduce((n,s)=>n+s.excerpt.length,0)<=28000);
 const method=packet.sources.find(s=>s.kind==='architecture-knowledge');assert(method);
 assert(method.excerpt.length<=20000,'A complete native journey fits the unchanged method-source review limit');
 const encoded=JSON.parse(method.excerpt),encodedBefore=JSON.stringify(encoded),grounding=decodeArchitectureGrounding(encoded);
 const canonicalDrivers=architectureDriverContext(p,journeyTask(p,ids.readTaskId)).drivers,driverScope=drivers=>drivers.map(d=>({id:d.id,kind:d.kind,category:d.category,priority:d.priority,confirmed:d.confirmed,measurable:d.measurable,scope:d.scope}));
 assert.deepEqual(driverScope(grounding.task.drivers),driverScope(canonicalDrivers),'Pooled paths retain every governing driver and exact requirement, decision, responsibility, component and via tuple');
 assert(encoded.driverPathPool.length<encoded.task.drivers.reduce((n,d)=>n+d.scope.pathRefs.length,0),'The normal all-kind driver journey reuses repeated scope paths');
 for(const d of grounding.task.drivers){assert(d.scope.paths.every(path=>path.from===d.id));assert(!Object.hasOwn(d.scope,'pathRefs'));}
 const directPaths=structuredClone(encoded);
 for(const d of directPaths.task.drivers){d.scope.paths=d.scope.pathRefs.map(ref=>structuredClone(directPaths.driverPathPool[ref]));delete d.scope.pathRefs;}
 delete directPaths.driverPathPool;
 assert.deepEqual(driverScope(decodeArchitectureGrounding(directPaths).task.drivers),driverScope(canonicalDrivers),'Previously saved direct path tables still decode without losing driver scope');
 const invalidPath=structuredClone(encoded);invalidPath.task.drivers[0].scope.pathRefs.push(invalidPath.driverPathPool.length);
 assert.throws(()=>decodeArchitectureGrounding(invalidPath),/Driver path ref has an invalid reference/);
 const mixedPaths=structuredClone(encoded);mixedPaths.task.drivers[0].scope.paths=[];
 assert.throws(()=>decodeArchitectureGrounding(mixedPaths),/driver paths mix direct and indexed forms/);
 assert.equal(JSON.stringify(encoded),encodedBefore,'Decoding does not rewrite the pinned source packet');
 assert.equal(grounding.task.solution.state,'adopted');assert(grounding.task.solution.obligations.every(o=>o.verification==='pending'));
 const generation={context:packet.context,basisStamp:packet.basisStamp,sources:structuredClone(packet.sources)};
 assert(generationCurrent(p,generation));
 const history=structuredClone(p.coauthoring.designTasks),alternatives=structuredClone(p.modelAlternatives.records),oldChoice=structuredClone(plan.recorded);
 const changed=applyQualityCommand(p,{type:'quality.driver',payload:{id:ids.freshnessDriverId,targetValue:'5'}},at).document;
 assert(!generationCurrent(changed,generation));
 for(const id of [ids.readTaskId,cids.persistenceTaskId]){assert(!designBasisCurrent(changed,journeyTask(changed,id)));assert(architectureReassessment(changed,journeyTask(changed,id)).changed);}
 assert(!selectionCurrent(changed,realization(changed,cids.persistencePlanId)));
 assert.equal(checks(changed).journey.checks.find(c=>c.key==='product-selection').done,false);
 assert.deepEqual(changed.coauthoring.designTasks,history);assert.deepEqual(changed.modelAlternatives.records,alternatives);assert.deepEqual(realization(changed,cids.persistencePlanId).recorded,oldChoice);
 assert.match(obligationsSection(changed),/review/i);
 assert.equal(execution(p,ids.contractId).state,'context-match');
 const contract=p.interfaces.contracts.find(c=>c.id===ids.contractId);
 const link=(doc,freshness='bounded',maxAgeSeconds=30)=>applyInterfacesCommand(doc,{type:'interfaces.contract',payload:{id:ids.contractId,execution:{...contract.execution,outcomeReadTaskId:ids.readTaskId,outcomeFreshness:freshness,outcomeMaxAgeSeconds:maxAgeSeconds}}},at).document;
 const linked=link(p,approach==='cache-aside'?'bounded':'strict'),resultReading=execution(linked,ids.contractId);
 assert.equal(resultReading.state,'context-match',JSON.stringify(resultReading.reasons));
 assert.equal(resultReading.scope.outcomeReadTaskId,ids.readTaskId);
 assert(resultReading.placement.some(r=>r.componentId===ids.producer&&r.role==='result-read-policy'));
 assert(resultReading.obligations.every(o=>o.verification==='pending'));
 assert.deepEqual(linked.coauthoring.designTasks,p.coauthoring.designTasks,'Linking result discovery preserves the accepted read and persistence history');
 const stricter=execution(link(p,'strict'),ids.contractId),shorter=execution(link(p,'bounded',5),ids.contractId);
 if(approach==='cache-aside'){
  assert(stricter.blockers.some(c=>c.id==='outcome-read-strict'));
  assert(shorter.blockers.some(c=>c.id==='outcome-read-age'));
 }else{assert.equal(stricter.state,'context-match');assert.equal(shorter.state,'context-match','The strict source-read declaration fits a bounded consumer without creating a read copy');}
 const current=architectureIntelligence(linked,{chapter:8,id:ids.contractId}),source=architectureIntelligenceSource(current,{maxCharacters:22000});
 assert(source);assert(architectureIntelligenceCurrent(linked,source));
 const linkedChanged=applyQualityCommand(linked,{type:'quality.driver',payload:{id:ids.freshnessDriverId,targetValue:'5'}},at).document;
 assert(!architectureIntelligenceCurrent(linkedChanged,source));
 assert(execution(linkedChanged,ids.contractId).unknown.some(c=>c.id==='outcome-read-current'),'A tighter driver reopens accepted read support; it does not silently rewrite the consumer agreement or the historical design');
 assert.deepEqual(linkedChanged.interfaces.contracts,linked.interfaces.contracts);
 const linkedSDD=sddDocument(linked,{figures:false}).markdown;assert(linkedSDD.includes(ids.readTaskId));
 assert.match(linkedSDD,/implementation unverified|verification remain pending/i);
 console.log('PASS '+domain+': requirements and all-kind drivers → compared read/persistence approaches → explicit accepted placement → constrained '+selectedProduct+' comparison → runtime/model/SDD → current evidence gap → tighter-driver reassessment and protected history.');
}

// The main SDD reads accepted obligations from the active model scope. A
// separate native design in another module must not donate its duties or proof.
{
 const f=completeDriverJourney(driverJourneyFixture());let p=f.document;
 const req=applyCommand(p,{type:'artefact',payload:{type:'requirement',title:'Read independent public article content',description:'Return independent public information unrelated to order outcomes.',owner:'Authored article owner',source:'Synthetic independent module'}},at);p=req.document;
 const driver=applyQualityCommand(p,{type:'quality.driver',payload:{kind:'business',title:'Keep article information independently owned',description:'The article source has no role in the order outcome.',requirementIds:[req.selected],owner:'Authored article owner'}},at);p=driver.document;
 const started=applyArchitectureCommand(p,{type:'architecture.start',payload:{topic:'reads',requirementId:req.selected,driverId:driver.selected}},at);p=started.document;
 p=journeyArchitectureCommand(p,started.selected,'architecture.answers',{answers:{...f.readAnswers,callerId:'',processorId:'',dataId:'',callerTitle:'Independent article reader',processorTitle:'Independent article source',readScope:'Independent article content',freshness:'strict',maxAge:'',reuse:'low',trustName:'Independent article boundary',authorityPolicy:'Only the independent article source writes these public articles.',reason:'No repeated-read need is established; use the independent source.'}}).document;
 const prepared=prepareJourneyChoice(p,started.selected,'direct-read');
 p=applyAlternativeCommand(prepared.document,{type:'alternative.apply',payload:{id:prepared.alternative.id,alternativeRevision:prepared.alternative.revision,previewStamp:prepared.preview.stamp,reviewed:true,reviewer:'Authored independent reviewer',reason:'Accept the separate source-read boundary for this independent module.'}},at).document;
 const grouped=applyRequirementsCommand(p,{type:'requirements.group',payload:{title:'Order outcome module',kind:'module',role:'business',memberIds:[f.ids.requirementId]}},at);p=grouped.document;const moduleId=grouped.selected;
 p=applyRequirementsCommand(p,{type:'requirements.group',payload:{title:'Independent article module',kind:'module',role:'business',memberIds:[req.selected]}},at).document;
 const full=obligationsSection(p),scoped=obligationsSection(scopedDocument(p,moduleId));
 assert(full.includes(f.ids.readTaskId)&&full.includes(started.selected));assert(scoped.includes(f.ids.readTaskId));assert(!scoped.includes(started.selected));assert(!scoped.includes('Independent article'));
 console.log('PASS SDD module scope: both native designs in the full document; only exact active-module accepted obligations in the scoped export.');
}

// A persisted legacy non-quality driver may still contain numeric scenario
// fields. It must not masquerade as the quality check or become its navigation.
{
 const f=completeDriverJourney(driverJourneyFixture()),p=structuredClone(f.document),business=p.quality.drivers.find(d=>d.id===f.ids.driverId),quality=p.quality.drivers.find(d=>d.id===f.ids.freshnessDriverId);
 Object.assign(business,{confirmed:true,targetConfirmed:true,metric:'Legacy field',targetValue:'1',window:'Legacy field'});
 quality.targetConfirmed=false;
 let qualityCheck=checks(p).journey.checks.find(c=>c.key==='quality-target');assert.equal(qualityCheck.done,false);assert.equal(qualityCheck.objectId,quality.id);
 const withoutQuality=structuredClone(p);withoutQuality.quality.drivers=withoutQuality.quality.drivers.filter(d=>d.id!==quality.id);
 qualityCheck=checks(withoutQuality).journey.checks.find(c=>c.key==='quality-target');assert.equal(qualityCheck.done,false);assert.equal(qualityCheck.objectId,null);
 console.log('PASS mixed-kind case guidance: exact current or unresolved quality scenario, no false quality completion from legacy business-driver fields.');
}
