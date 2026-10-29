// Repeatable authored customer journeys. These are synthetic model inputs and
// native command receipts, never customer data, measured performance or a live
// model response. No production module imports this file.
import {outcomeContractFixture} from './outcome-contract-fixtures.mjs';
import {applyCommand} from './public/requirements-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyArchitectureCommand,architectureSourceStamp} from './public/architecture-design.js';
import {previewAlternative,applyAlternativeCommand} from './public/model-alternatives.js';
import {applyDecisionCommand} from './public/decisions-domain.js';
import {applyTechnologyRealisationCommand,realizationCriteria} from './public/technology-realisation-domain.js';
import {applyRuntimeCommand} from './public/runtime-domain.js';
import {applyArchitectureCaseCommand,caseContextBasis} from './public/architecture-case.js';

export const DRIVER_JOURNEY_AT='2026-10-20T21:00:00.000Z';
export const journeyTask=(p,id)=>p.coauthoring.designTasks.find(t=>t.id===id);
export function journeyArchitectureCommand(p,id,type,payload={}){
 const t=journeyTask(p,id);
 return applyArchitectureCommand(p,{type,payload:{id,taskRevision:t?.revision,...payload}},DRIVER_JOURNEY_AT);
}
export function prepareJourneyChoice(p,id,optionId){
 const prepared=journeyArchitectureCommand(p,id,'architecture.prepare',{optionId});
 const alternative=prepared.document.modelAlternatives.records.find(a=>a.id===prepared.selected);
 return {document:prepared.document,alternative,preview:previewAlternative(prepared.document,alternative)};
}
export function acceptJourneyChoice(prepared){
 const {document:p,alternative:a,preview}=prepared;
 return applyAlternativeCommand(p,{type:'alternative.apply',payload:{id:a.id,alternativeRevision:a.revision,previewStamp:preview.stamp,reviewed:true,reviewer:'Authored journey architect',reason:'Review the exact driver, alternatives, authoritative data, placement and outstanding verification before applying this working design.'}},DRIVER_JOURNEY_AT).document;
}

export function driverJourneyFixture({domain='fulfilment',approach='cache-aside'}={}){
 const base=outcomeContractFixture({domain,kind:'request'}),ids={...base.ids};let p=base.document;
 const noun=domain==='fulfilment'?'order fulfilment':'payment settlement';
 const run=(fn,type,payload)=>{const r=fn(p,{type,payload},DRIVER_JOURNEY_AT);p=r.document;return r.selected;};
 run(applyCommand,'artefact',{id:ids.requirementId,type:'requirement',confirmed:true,source:'Authored '+noun+' acceptance scenario. Confirmation applies only to these synthetic inputs.'});
 ids.freshnessDriverId=run(applyQualityCommand,'quality.driver',{title:'Bound the age of displayed '+noun+' state',category:'integrity',requirementIds:[ids.requirementId],stimulus:'An authorised caller requests the state of its existing operation.',conditions:'Synthetic repeated reads, concurrent completion and delayed invalidation.',response:'Return the declared source state only within the permitted age; preserve unresolved state if unavailable.',metric:'Age of returned authoritative state',operator:'At most',targetValue:'30',unit:'seconds',window:'Every successful result read',measurement:'Race completion, cache refill and invalidation; inspect source timestamps and operation identity.',priority:'High',owner:'Authored result owner',source:'Synthetic acceptance contract; no workload measurement.',confirmed:true,targetConfirmed:true});
 ids.constraintDriverId=run(applyQualityCommand,'quality.driver',{kind:'constraint',title:'Keep outcome persistence in the approved operating boundary',description:'The selected database option must use the declared approved operating boundary; a different provider or operating model needs a reviewed exception.',impact:'A violating product option cannot win through weighted preferences.',requirementIds:[ids.requirementId],componentIds:[ids.authority],priority:'Low',owner:'Authored operating owner',source:'Synthetic hard constraint; the options are scenario declarations, not product-wide judgements.',confirmed:true});
 const initial=p;
 const started=applyArchitectureCommand(p,{type:'architecture.start',payload:{topic:'reads',requirementId:ids.requirementId,driverId:ids.freshnessDriverId,dataId:ids.resultDataId,contextIds:[ids.producer,ids.authority]}},DRIVER_JOURNEY_AT);
 p=started.document;ids.readTaskId=started.selected;
 const readStarted=p;
 const readAnswers={callerId:ids.producer,processorId:ids.authority,dataId:ids.resultDataId,readScope:noun+' business result',owner:'Authored result owner',freshness:approach==='direct-read'?'strict':'bounded',maxAge:approach==='direct-read'?'':'30',reuse:approach==='direct-read'?'low':'repeated',cachePermission:'allowed',classification:'Internal',retention:'Retain the authoritative operation result under the authored retention policy.',authorityPolicy:'Only the named result authority writes operation state. A read copy cannot create or finalise an outcome.',freshnessPlan:'Return source version and source timestamp; reject or bypass a value whose source age cannot be established or exceeds 30 seconds.',invalidation:'Commit at the authority before invalidation; fence an older concurrent refill using the returned source version.',cacheFailure:'origin',originFailure:'reject',recovery:'Coalesce concurrent misses and bound origin admission; reject excess work during cold-cache recovery.',isolation:'Authorise the original operation owner on every read; include tenant and visibility scope in cache identity.',failure:'Return an unavailable or unresolved result on a read deadline; never reinterpret silence as failed business execution.',reason:approach==='direct-read'?'The authored read needs current authoritative state and has low reuse. Retain one read path and its explicit source obligations.':'Repeated status views may reuse a 30-second bounded copy while the original result authority retains completion ownership.',contextReview:'Review the original business-outcome driver, the measurable freshness target and the approved operating constraint together.',trustName:'Authored result-read boundary',trustPolicy:'Authenticated service identities and operation-owner access; no additional business writer.'};
 p=journeyArchitectureCommand(p,ids.readTaskId,'architecture.answers',{answers:readAnswers}).document;
 const readReady=p,readPrepared=prepareJourneyChoice(p,ids.readTaskId,approach);
 p=acceptJourneyChoice(readPrepared);const readAccepted=p;
 ids.readAlternativeId=readPrepared.alternative.id;
 ids.readDecisionId=journeyTask(p,ids.readTaskId).applied.decisionId;
 ids.readPlanId=readPrepared.preview.changes.find(r=>r.command.type==='techrealisation.plan').source.id;
 ids.cacheId=journeyTask(p,ids.readTaskId).answers.cacheId||'';
 return {document:p,ids,domain,approach,initial,readStarted,readReady,readPrepared,readAccepted,readAnswers};
}

// Continue the same result authority through persistence, scoped product
// comparison, runtime placement and an explicitly incomplete evidence review.
export function completeDriverJourney(f){
 const ids={...f.ids};let p=f.document;
 const run=(fn,type,payload)=>{const r=fn(p,{type,payload},DRIVER_JOURNEY_AT);p=r.document;return r.selected;};
 const noun=f.domain==='fulfilment'?'fulfilment':'payment';
 ids.persistenceTaskId=run(applyArchitectureCommand,'architecture.start',{topic:'persistence',requirementId:ids.requirementId,driverId:ids.driverId,dataId:ids.resultDataId,contextIds:[ids.authority]});
 p=journeyArchitectureCommand(p,ids.persistenceTaskId,'architecture.answers',{answers:{processorId:ids.authority,dataId:ids.resultDataId,dataScope:noun+' business result',owner:'Authored result owner',transactionScope:'multi-aggregate',invariant:'Commit the operation identity, permitted state transition and retained outcome in the same owned store.',accessPattern:'Read by tenant and original operation identity; conditionally advance pending state and retain the final business result.',writePolicy:'Only the result authority commits state; acknowledge a final outcome after the declared local durable commit.',concurrency:'Use conditional state transitions and a unique operation key in the same transaction; re-read after a conflict.',failure:'A lost commit response leaves the result unresolved until the authority is consulted under the original identity.',schemaPlan:'Version state transitions and schemas, validate writes, and rehearse compatible migration and rollback.',rpoSeconds:'300',rtoSeconds:'900',recoveryPlan:'Retain a protected base backup and required change chain in a separately controlled recovery location. Restore into isolation and reconcile original operation identities.',restoreTest:'Exercise loss of the active store; measure lost acknowledged results and time through reconciliation before resuming writes.',classification:'Internal',retention:'Retain the authoritative outcomes under the authored retention policy.',isolation:'Only the named authority writes; recovery access uses separate audited credentials.',reason:'The chosen invariant spans related records in one store. Compare the local relational boundary with the bounded single-document recipe before product selection.',contextReview:'Retain the read contract and authority. Persistence and read copies do not become separate business writers.',storeTitle:noun+' outcome persistence',recoveryTitle:noun+' outcome recovery',trustName:'Authored outcome persistence boundary',trustPolicy:'Authenticated authority; separate controlled restore access.'}}).document;
 const persistenceReady=p,persistencePrepared=prepareJourneyChoice(p,ids.persistenceTaskId,'relational-transaction');
 p=acceptJourneyChoice(persistencePrepared);const persistenceAccepted=p;
 ids.persistenceAlternativeId=persistencePrepared.alternative.id;
 const task=journeyTask(p,ids.persistenceTaskId);ids.persistenceDecisionId=task.applied.decisionId;ids.persistencePlanId=persistencePrepared.preview.changes.find(r=>r.command.type==='techrealisation.plan').source.id;
 ids.storeId=task.answers.storeId;
 for(const id of [ids.readDecisionId,ids.persistenceDecisionId]){
  const d=p.decisions.records.find(d=>d.id===id);
  for(const a of d.alternatives){const selected=a.id===d.selectedAlternativeId;
   run(applyDecisionCommand,'decision.alternative',{id,alternativeId:a.id,assessments:Object.fromEntries(d.driverIds.map(driverId=>[driverId,{effect:selected?'supports':'tension',reason:selected?'Authored review: this bounded approach fits the stated role; implementation duties remain open.':'Authored review: this alternative carries the recorded freshness, atomic-scope or operating trade-off.',evidence:'Synthetic scenario comparison of the linked driver and explicit method conditions; no measured benefit.'}]))});
  }
  run(applyDecisionCommand,'decision.record',{id});
 }
 const planId=ids.persistencePlanId;
 run(applyTechnologyRealisationCommand,'techrealisation.plan',{id:planId,purpose:'Compare declared relational implementations for the same outcome authority and invariant.',owner:'Authored data owner',rationale:'Prefer the option that satisfies the authored operating constraint. Product names do not establish suitability or performance.',risks:'Actual compatibility, isolation, restore and workload evidence remain open.'});
 for(const product of ['PostgreSQL','MySQL'])run(applyTechnologyRealisationCommand,'techrealisation.option',{id:planId,option:{title:product+' authored outcome-store option',product,version:product==='PostgreSQL'?'18.1':'8.4.2',vendor:'Synthetic product comparison',operatingModel:product==='PostgreSQL'?'Self managed':'Provider managed',serviceTier:'Authored test configuration',topology:'One declared write primary; recovery is separately specified',replicaCount:1,failureDomains:'Authored primary domain; independent restore location requires evidence',workloadProfile:'Synthetic result updates and repeated status reads; no measured rate supplied',specEvidence:'Authored configuration for regression only; deployment and compatibility unverified',benefits:'Potentially satisfies the local relational invariant when implemented and verified.',drawbacks:'Concurrency, failure recovery, compatibility and operating duties remain to be tested.',evidence:'Synthetic option definition only.',configurationFacts:product==='PostgreSQL'?{'postgres.uniqueConstraint':true,'database.atomicKeyAndEffect':true,'postgres.singlePrimary':true}:{'mysql.innodb':true,'mysql.uniqueConstraint':true,'database.atomicKeyAndEffect':true}}});
 const options=p.technologyRealisation.records.find(r=>r.id===planId).options;
 ids.productOptionIds=options.map(o=>o.id);ids.selectedProductOptionId=options[f.domain==='fulfilment'?0:1].id;ids.excludedProductOptionId=options.find(o=>o.id!==ids.selectedProductOptionId).id;
 const productUnassessed=p;
 for(const o of options)for(const c of realizationCriteria(p,planId).filter(c=>c.driverKind))run(applyTechnologyRealisationCommand,'techrealisation.assessment',{id:planId,optionId:o.id,criterionId:c.id,effect:c.hard&&o.id===ids.excludedProductOptionId?'violates':'supports',reason:c.hard?(o.id===ids.excludedProductOptionId?'This authored option uses an operating boundary outside the scenario approval. This is not a general product rejection.':'This authored option uses the scenario approved operating boundary.'):'The authored comparison declares the same local relational mechanism and retains the linked driver for implementation verification.',evidence:'Synthetic architect-recorded comparison; no real workload, independent review or approval is claimed.'});
 const productCompared=p;
 run(applyTechnologyRealisationCommand,'techrealisation.preference',{id:planId,optionId:ids.selectedProductOptionId});
 run(applyTechnologyRealisationCommand,'techrealisation.record',{id:planId,reviewed:true});
 ids.zoneId=run(applyRuntimeCommand,'runtime.zone',{environmentId:ids.environmentId,title:'Authored outcome-store zone',failureDomain:'Synthetic primary failure domain',isolation:'Independence is a stated assumption awaiting deployment evidence.',owner:'Authored operator'});
 ids.runtimePlanId=run(applyRuntimeCommand,'runtime.plan',{environmentId:ids.environmentId,assetId:planId,title:'Operate the authored outcome store',purpose:'Place the selected relational implementation in the named test environment.',owner:'Authored operator',stateMode:'Stateful service',recoveryStrategy:'Restore',minReady:1,maxReplicas:1,readiness:'Admit work only when the correct schema and operation state are available.',recoveryPlan:'Restore into isolation and reconcile before returning to service.',assumptions:'No infrastructure is provisioned; declared restore and capacity remain unverified.',requirementIds:[ids.requirementId]});
 run(applyRuntimeCommand,'runtime.placement',{planId:ids.runtimePlanId,zoneId:ids.zoneId,role:'active',replicas:1,basis:'Authored placement, not provisioned capacity.',confirmed:false});
 // Explicitly review coordinated model additions; the original adoption receipts
 // remain immutable and are not rewritten as new measured evidence.
 for(const id of [ids.readTaskId,ids.persistenceTaskId])p=journeyArchitectureCommand(p,id,'architecture.refresh',{stamp:architectureSourceStamp(p,journeyTask(p,id)),reviewed:true,reviewer:'Authored journey architect',reason:'Review the connected read, persistence, product and placement declarations while retaining all unverified obligations.'}).document;
 ids.caseId=run(applyArchitectureCaseCommand,'case.save',{title:'Follow the '+noun+' result from driver to operating design',purpose:'Review one connected requirement, compared approaches and products, authoritative contracts, placement and outstanding verification.',mode:'end-to-end',requirementIds:[ids.requirementId],basis:caseContextBasis(p)});
 return {...f,document:p,ids,persistenceReady,persistencePrepared,persistenceAccepted,productUnassessed,productCompared};
}
