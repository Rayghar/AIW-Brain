import assert from 'node:assert/strict';
import {executionCompositionFixture,EXECUTION_FIXTURE_AT as at} from './execution-composition-fixtures.mjs';
import {assessContractExecution,contractExecutionContext,executionMethodSource,normaliseContractExecution,optionFacts,evaluateApplicability} from './public/architecture-applicability.js';
import {architectureContext,architectureIntelligence,architectureIntelligenceSource,architectureIntelligenceCurrent,architectureModelSourceRecord} from './public/architecture-intelligence.js';
import {brainSourceCurrent} from './public/architecture-brain.js';
import {applyInterfacesCommand,withInterfaces,interfaceFindings,exportInterfacesMarkdown} from './public/interfaces-domain.js';
import {previewInterfaceChange,rebaseInterfaceChange} from './public/interface-impact.js';
import {applyRuntimeCommand} from './public/runtime-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {applyKnowledgeCommand,knowledgeImpactStamp} from './public/knowledge-governance.js';
import {EXECUTION_COMPOSITION} from './public/composition-manifest.js';
import {traitsFor} from './public/product-knowledge.js';
import {productMechanisms} from './public/product-applicability.js';
import {intelligencePacket} from './public/intelligence-context.js';
import {readyComposition,arc} from './composition-fixtures.mjs';
import {previewAlternative,applyAlternativeCommand} from './public/model-alternatives.js';
import {withFinalReview} from './public/review-domain.js';
import {choiceReading} from './public/product-choice.js';
import {seedProject} from './public/requirements-domain.js';

const fixture=executionCompositionFixture(),{document:p,ids}=fixture;
const get=x=>x.interfaces.contracts.find(c=>c.id===ids.contractId);
const assess=x=>assessContractExecution(get(x),contractExecutionContext(x,get(x)));
const update=(project,patch)=>applyInterfacesCommand(project,{type:'interfaces.contract',payload:{id:ids.contractId,...patch}},at).document;
const execution=(project,patch)=>update(project,{execution:{...get(project).execution,...patch}});
const before=JSON.stringify(p),good=assess(p);
assert.equal(good.state,'context-match');assert.equal(good.scope.pathId,ids.pathId);assert.equal(good.scope.environmentId,ids.environmentId);
assert(good.obligations.every(o=>o.verification==='pending'),'Consistent declarations do not manufacture an implementation result');
assert(good.placement.some(x=>x.role==='repeat-protection'&&x.componentId===ids.consumer));
assert(good.placement.some(x=>x.role==='outcome-discovery'&&x.componentId===ids.producer));
assert.equal(JSON.stringify(p),before);
console.log('PASS one saved contract/path/environment composes retained intent, repeat ownership and authoritative outcome without claiming runtime proof');

for(const [patch,checkId] of [
 [{publication:'after-commit'},'retained-intent'],[{publication:'direct'},'retained-intent'],
 [{protection:'broker-only'},'repeat-protection'],[{protection:'none'},'repeat-protection'],
 [{identity:'per-attempt'},'stable-repeat-key'],[{changedIntent:'allow'},'changed-intent'],
 [{timeout:'failed'},'uncertain-result'],[{timeout:'succeeded'},'uncertain-result'],
 [{discovery:'none'},'outcome-discovery'],[{repeatOwnerId:ids.producer},'repeat-owner'],
 [{repetition:'none'},'relay-repeat']
]){
 const changed=execution(p,patch),r=assess(changed);
 assert.equal(r.state,'excluded',JSON.stringify(patch));assert(r.blockers.some(c=>c.id===checkId),checkId);
 assert(interfaceFindings(changed).some(f=>f.code==='execution'&&f.level==='error'&&f.objectId===ids.contractId));
 assert.deepEqual(changed.realisation.components,p.realisation.components,'A declared conflict does not silently repair or replace its components');
}
const separateAuthority=execution(p,{outcomeAuthorityId:ids.producer}),missingOutcome=assess(separateAuthority);
assert.equal(missingOutcome.state,'needs-context');assert(missingOutcome.unknown.some(c=>c.fact==='outcomeContractId'));
assert(!missingOutcome.ready);assert(interfaceFindings(separateAuthority).some(f=>f.code==='execution'&&f.level==='warning'&&f.objectId===ids.contractId));
for(const key of ['publication','identity','changedIntent','timeout','discovery','environmentId']){
 const r=assess(execution(p,{[key]:undefined}));assert.equal(r.state,'needs-context',key);assert(r.unknown.some(c=>c.fact===key),key);
}
const invalidKey=assess(update(p,{idempotencyKey:'not_in_the_dictionary'}));assert(invalidKey.blockers.some(c=>c.id==='idempotencyKey-dictionary'));
const proseOnly=update(p,{execution:null});assert.equal(assess(proseOnly),null,'Existing policy prose is never promoted into structured declarations');
const bestEffort=executionCompositionFixture({delivery:'best-effort',publication:'after-commit',completion:'acceptance',discovery:undefined,outcomeAuthorityId:undefined}).document;
assert.equal(assess(bestEffort).state,'context-match');assert(!assess(bestEffort).checks.some(c=>c.id==='outcome-discovery'),'An acceptance-only workflow does not acquire an invented business-result promise');
const intrinsic=update(execution(p,{protection:'idempotent-effect',identity:undefined,changedIntent:undefined}),{idempotencyKey:''});
assert.equal(assess(intrinsic).state,'context-match','An intrinsically idempotent operation is distinct from duplicate-record-based protection');
console.log('PASS counterfactual loss window, broker-only protection, changed identity/intent, wrong owner, uncertain response and acceptance-only workflow');

const wrongPath=structuredClone(p);wrongPath.runtime.paths[0].environmentId='elsewhere';
assert.equal(assess(wrongPath).state,'needs-context');assert(assess(wrongPath).unknown.some(c=>c.id==='runtimePath'));
const noPath=structuredClone(p);noPath.runtime.paths=[];assert(assess(noPath).unknown.some(c=>c.id==='runtimePath'));
const proposedPath=structuredClone(p);proposedPath.runtime.paths[0].state='proposed';assert(assess(proposedPath).unknown.some(c=>c.id==='runtimePath'));
assert.equal(architectureIntelligence(p,{chapter:10,id:ids.pathId}).insights.find(i=>i.kind==='composition')?.scope.contractId,ids.contractId);
const unrelated=applyRuntimeCommand(p,{type:'runtime.environment',payload:{title:'Unrelated development boundary',stage:'Development design',assetIds:[]}},at).document;
const otherEnv=unrelated.runtime.environments.at(-1).id;
assert(!architectureIntelligence(unrelated,{chapter:10,id:otherEnv}).insights.some(i=>i.kind==='composition'));
console.log('PASS exact environment/path scope, proposed or absent route stays unknown and unrelated environments cannot borrow the declared composition');

assert.throws(()=>normaliseContractExecution({schemaVersion:2,timeout:'unresolved'}),/version/);
assert.throws(()=>update(p,{execution:{timeout:'maybe'}}),/supported/);
assert.throws(()=>update(p,{execution:{environmentId:'absent'}}),/existing/);
assert.throws(()=>update(p,{execution:{repeatOwnerId:'absent'}}),/existing/);
assert.throws(()=>normaliseContractExecution(JSON.parse('{"__proto__":"no"}')),/Unsupported execution/);
const preserved=update(p,{owner:'Changed accountable contract owner'});assert.deepEqual(get(preserved).execution,get(p).execution);
assert.deepEqual(get(withInterfaces(JSON.parse(JSON.stringify(p)))).execution,get(p).execution,'Save/reload retains the typed declaration exactly');
assert.equal(update(p,{execution:{...get(p).execution}}).interfaces.version,p.interfaces.version,'An unchanged declaration is a no-op');
assert(!get(update(p,{execution:null})).execution);
const command={type:'interfaces.contract',payload:{id:ids.contractId,execution:{...get(p).execution,timeout:'failed'}}},q=previewInterfaceChange(p,command);
assert(q.fields.some(f=>f.key==='execution'));assert(q.signals.some(s=>s.title==='Execution contract changed'));
assert(q.findings.introduced.some(f=>f.code==='execution'));
const rebased=rebaseInterfaceChange(preserved,q);assert.equal(rebased.conflicts.length,0);
assert.equal(get(previewInterfaceChange(preserved,rebased.command).document).owner,'Changed accountable contract owner');
const overlap=rebaseInterfaceChange(execution(p,{discovery:'manual-reconciliation'}),q);assert(overlap.conflicts.some(f=>f.current?.discovery==='manual-reconciliation'&&f.proposed?.timeout==='failed'),'Concurrent changes to the same execution agreement require explicit review');
assert(exportInterfacesMarkdown(p).includes('Execution agreement (declared, verification separate)'));
assert.equal(JSON.stringify(p),before);
console.log('PASS native schema validation, partial patch/clear/no-op, JSON round trip, visible impact and overlapping-edit protection');

const reading=architectureIntelligence(p,{chapter:8,id:ids.contractId}),insight=reading.insights.find(i=>i.kind==='composition'),source=architectureIntelligenceSource(reading,{maxCharacters:12000});
assert.equal(insight.state,'context-match');assert(insight.actions.some(a=>a.fieldKey==='execution.completion'));
for(const id of [ids.requirementId,ids.driverId,ids.contractId,ids.pathId,ids.environmentId,ids.dataId,ids.producer,ids.consumer])assert(insight.sourceRefs.includes('model:'+id),id);
assert(source.excerpt.length<=12000);const composed=JSON.parse(source.excerpt).insights.find(i=>i.kind==='composition');assert(composed);assert(architectureIntelligenceCurrent(p,source));
assert.deepEqual(composed.obligations.map(o=>[o.id,o.action,o.evidence,o.targetIds]),insight.obligations.map(o=>[o.id,o.action,o.evidence,o.targetIds]));
const limited=architectureIntelligenceSource(reading,{maxCharacters:3500});assert(limited.excerpt.length<=3500);assert(!JSON.parse(limited.excerpt).insights.some(i=>i.kind==='composition'),'A small allowance withholds the composition instead of dropping its obligations');
assert.deepEqual(architectureModelSourceRecord(p,ids.pathId),p.runtime.paths[0]);
assert(architectureIntelligenceCurrent(unrelated,source),'An unrelated environment addition does not invalidate this exact basis');
assert(!architectureIntelligenceCurrent(execution(p,{timeout:'failed'}),source));
const changedPath=applyRuntimeCommand(p,{type:'runtime.path',payload:{id:ids.pathId,route:'Changed route requiring review.'}},at).document;
assert(!architectureIntelligenceCurrent(changedPath,source));
const reduced=architectureIntelligenceSource(reading,{sourceIds:reading.sources.map(s=>s.id).filter(id=>id!=='model:'+ids.pathId),maxCharacters:12000});
assert(!JSON.parse(reduced.excerpt).insights.some(i=>i.kind==='composition'),'Withholding a required path also withholds the inference it supports');
const method=executionMethodSource(p);assert(brainSourceCurrent(p,method));assert(!brainSourceCurrent(p,{...method,receipt:{...method.receipt,version:0}}));
for(const target of [EXECUTION_COMPOSITION.id,'AWS-IDEMPOTENT-API','MS-ASYNC-OUTCOME']){
 const withdrawn=applyKnowledgeCommand(p,{type:'knowledge.withdraw',payload:{id:target,stamp:knowledgeImpactStamp(p,target),reviewed:true,reviewer:'Synthetic reviewer',reason:'Test source withdrawal closure.'}},at,'synthetic-reviewer').document;
 assert(!brainSourceCurrent(withdrawn,method));assert(!executionMethodSource(withdrawn));
 assert(!architectureIntelligence(withdrawn,{chapter:8,id:ids.contractId}).insights.some(i=>i.kind==='composition'));
 assert(interfaceFindings(withdrawn).some(f=>f.code==='execution'&&/source interpretation/.test(f.detail)));
 assert.deepEqual(get(withdrawn).execution,get(p).execution,'Withdrawal retains the saved facts and original history');
}
const packet=intelligencePacket(p,{chapter:8,objectId:ids.contractId,mode:'challenge',prompt:'Assess whether the declared payment composition closes its delivery, duplicate and outcome obligations.'});
const packed=packet.sources.find(s=>s.kind==='architecture-intelligence');assert(packed);assert(JSON.parse(packed.excerpt).insights.some(i=>i.kind==='composition'));
assert(packet.sources.some(s=>s.id===method.id));assert(packet.coverage.characters<=28000);assert(packet.sources.length<=22);
console.log('PASS bounded native provider packet retains complete declared composition/source bundle; exact dependencies, currentness and withdrawals fail closed');

const prepared=arc(readyComposition('delivery'),'architecture.prepare',{optionId:'transactional-outbox'}),alternative=prepared.document.modelAlternatives.records.find(a=>a.id===prepared.selected),preview=previewAlternative(prepared.document,alternative);
const agreement=preview.changes.find(c=>c.source.slot==='business delivery agreement');assert(agreement);
assert.equal(agreement.after.execution.publication,'atomic-commit');assert.equal(agreement.after.execution.protection,'atomic-deduplication');
for(const key of ['environmentId','identity','changedIntent','timeout','completion','discovery'])assert(!agreement.after.execution[key],'The proposal cannot invent '+key);
let adopted=applyAlternativeCommand(prepared.document,{type:'alternative.apply',payload:{id:alternative.id,alternativeRevision:alternative.revision,previewStamp:preview.stamp,reviewed:true,reviewer:'Synthetic architect',reason:'Review the concrete delivery proposal and its still-open execution agreement.'}},at).document;
const accepted=JSON.stringify(adopted.coauthoring.designTasks.at(-1).applied),newId=agreement.source.id;
let nativeContract=adopted.interfaces.contracts.find(c=>c.id===newId);
const nativeRead=project=>architectureIntelligence(project,{chapter:8,id:newId},{limit:24}).insights.find(i=>i.kind==='composition');
assert.equal(nativeRead(adopted).state,'needs-context');
assert(adopted.coauthoring.designTasks.at(-1).applied.reasoningGraph.solution.specifications.some(s=>s.contractIds.includes(newId)));
adopted=applyInterfacesCommand(adopted,{type:'interfaces.field',payload:{id:nativeContract.exchanges[0].dataId,field:{name:'operation_id',type:'string',required:true,key:true,description:'Explicit stable business identity for this reviewed instruction.'}}},at).document;
const environment=applyRuntimeCommand(adopted,{type:'runtime.environment',payload:{title:'Reviewed delivery exercise environment',stage:'Pre-production design',assetIds:[nativeContract.from,nativeContract.to],owner:'Synthetic operator',purpose:'Exercise exact reviewed delivery agreement.'}},at);
adopted=withFinalReview(environment.document);
const existingPath=adopted.runtime.paths.find(r=>r.contractId===newId&&r.environmentId===environment.selected);
adopted=applyRuntimeCommand(adopted,{type:'runtime.path',payload:{...(existingPath?{id:existingPath.id}:{environmentId:environment.selected,contractId:newId}),owner:'Synthetic operator',route:'Declared relay/channel path to the effect owner.',mode:'buffered',failureResponse:'Retain uncertainty until the authoritative result is discovered.'}},at).document;
adopted=applyInterfacesCommand(adopted,{type:'interfaces.contract',payload:{id:newId,contractVersion:'delivery-agreement-v1',correlationKey:'operation_id',idempotencyKey:'operation_id',execution:{...nativeContract.execution,environmentId:environment.selected,identity:'stable',changedIntent:'reject',timeout:'unresolved',completion:'business-outcome',discovery:'authoritative-status',outcomeAuthorityId:nativeContract.to}}},at).document;
assert.equal(nativeRead(adopted).state,'context-match');assert(nativeRead(adopted).obligations.every(o=>o.verification==='pending'));
assert.equal(JSON.stringify(adopted.coauthoring.designTasks.at(-1).applied),accepted,'Later contract refinement never rewrites the original reviewed acceptance');
const transport=adopted.interfaces.contracts.filter(c=>c.id!==newId);assert(transport.every(c=>!c.execution?.publication),'The producer’s atomic commit is not silently assigned to a queue transport hop');
console.log('PASS native outbox comparison→reviewed business contract→explicit unanswered facts→contract/path refinement with immutable original acceptance');

let constraints=applyCommand(p,{type:'artefact',payload:{type:'constraint',title:'Retain the posting authority',description:'No migration without a reviewed ownership reason.',links:[['new','constrains',ids.requirementId]]}},at).document;
constraints=applyCommand(constraints,{type:'artefact',payload:{type:'requirement',title:'Unrelated catalogue browsing'}},at).document;
const otherReq=constraints.artefacts.at(-1).id;
constraints=applyCommand(constraints,{type:'artefact',payload:{type:'constraint',title:'Separate catalogue condition',description:'This belongs only to the catalogue.',links:[['new','constrains',otherReq]]}},at).document;
const cc=architectureContext(constraints,{chapter:8,id:ids.contractId});assert(cc.constraints.some(c=>c.title==='Retain the posting authority'));assert(!cc.constraints.some(c=>c.title==='Separate catalogue condition'));
assert(architectureIntelligence(constraints,{chapter:8,id:ids.contractId}).primary.sourceRefs.some(id=>id==='model:'+cc.constraints[0].id));
console.log('PASS traced constraints remain mandatory dependencies without importing a separately scoped requirement’s constraint');

const pg={id:'opt-pg',product:'PostgreSQL',version:'18.1',configurationFacts:{'postgres.uniqueConstraint':true,'database.atomicKeyAndEffect':true,'database.rowPoliciesRequired':true,'postgres.rowLevelSecurity':true,'postgres.policyBypassReviewed':true,'database.nativeMaterializedViewsRequired':true,'database.boundedReadStalenessAllowed':true,'postgres.materializedViews':true}};
for(const id of ['pg-unique','pg-row-policies','pg-materialized']){
 const trait=traitsFor(pg.product).find(t=>t.id===id),read=option=>evaluateApplicability(trait.applicability,optionFacts(option));
 assert.equal(read(pg).state,'context-match',id);assert.equal(read({...pg,version:''}).state,'needs-context',id);
 assert.equal(read({...pg,version:'17.6'}).state,'excluded',id);
 assert.equal(read({...pg,version:'17.6',configurationFacts:{...pg.configurationFacts,'version.major':18}}).state,'excluded','Configuration cannot spoof the actual option version');
}
const my={id:'opt-my',product:'MySQL',version:'8.4.6',configurationFacts:{'mysql.innodb':true,'mysql.uniqueConstraint':true,'database.atomicKeyAndEffect':true,'database.nativeMaterializedViewsRequired':true}};
assert.equal(productMechanisms(my).find(t=>t.id==='mysql-materialized-gap').applicability.state,'context-match');
assert.equal(productMechanisms({...my,version:'9.0'}).find(t=>t.id==='mysql-materialized-gap').applicability.state,'excluded');
const choiceProject=withFinalReview(seedProject()),choice=choiceProject.technologyRealisation.records.find(r=>r.options.some(o=>/postgres/i.test(o.product)));
const oldVersion=choice.options.find(o=>/postgres/i.test(o.product));Object.assign(oldVersion,{...pg,id:oldVersion.id,version:'17.6'});
const candidate=choiceReading(choiceProject,choice.id).options.find(o=>o.option.id===oldVersion.id);
assert.notEqual(candidate.applicability.state,'excluded','An uninspected mechanism version cannot become a hard product exclusion');
console.log('PASS explicit documentation-family gates accept patch versions, retain unknowns and withhold uninspected version claims without inventing product unsuitability');
