// Shared contextual reasoning: original synthetic scenarios plus the existing
// native proposal path. No provider call, inferred fit or measured result.
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {BRAIN_CATALOGUE} from './public/brain-catalogue.js';
import {architectureContext,architectureIntelligence,architectureIntelligenceSource,architectureIntelligenceCurrent} from './public/architecture-intelligence.js';
import {relevantKnowledge} from './public/knowledge-relevance.js';
import {brainContext,draftNarrative,generationCurrent} from './public/aiw-brain.js';
import {chapterReading,chapterCommands} from './public/chapter-reasoning.js';
import {driversForRequirement,driversForComponent} from './public/driver-scope.js';
import {journeyIndex} from './public/journey-context.js';
import {knowledgeStructures} from './public/knowledge-structure.js';
import {applyKnowledgeCommand,knowledgeStamp,knowledgeImpactStamp} from './public/knowledge-governance.js';
import {applyArchitectureCommand} from './public/architecture-design.js';
import {readyComposition,arc} from './composition-fixtures.mjs';
import {previewAlternative,applyAlternativeCommand} from './public/model-alternatives.js';
import {componentSpec} from './public/design-spec.js';
import {reasoningSource} from './public/design-reasoning.js';
import {reasoningPacket} from './public/brain-reasoning.js';

const at='2026-10-20T17:00:00.000Z',review={reviewed:true,reviewer:'Synthetic reviewer',reason:'Inspect the exact synthetic conditions and original source.'};
const base=()=>createProject({name:'Synthetic architecture reasoning',template:'blank'},'context-fixture');
function sharedBoundary(){
 const p=base();
 p.artefacts=[{id:'REQ-A',type:'requirement',title:'Replace the catalogue incrementally',description:'Explore Strangler Fig around the existing catalogue boundary.',acceptance:'Retain the published catalogue contract.'},{id:'REQ-B',type:'requirement',title:'Retain laboratory history',description:'Retain laboratory evidence under its separate contract.'}];
 p.quality.drivers=[{id:'D-A',kind:'business',title:'Staged catalogue replacement',description:'Retire the old catalogue in stages.',impact:'Preserve the existing contract during replacement.',confirmed:true,requirementIds:['REQ-A']},{id:'D-B',kind:'data',title:'Retain laboratory history',description:'Retain laboratory evidence.',impact:'Keep its retention authority distinct.',confirmed:true,requirementIds:['REQ-B']},{id:'D-C',kind:'operational',title:'Own the shared operating boundary',description:'Name one recovery owner.',impact:'Coordinate rollback of the shared runtime.',confirmed:true,componentIds:['C-shared']}];
 p.logical.responsibilities=[{id:'L-A',title:'Catalogue boundary',purpose:'Serve the catalogue contract.',requirementIds:['REQ-A'],decisionIds:[]},{id:'L-B',title:'Laboratory boundary',purpose:'Retain laboratory history.',requirementIds:['REQ-B'],decisionIds:[]}];
 p.realisation.components=[{id:'C-shared',title:'Shared service process',purpose:'Host the two allocated responsibilities.',dataIds:[]}];
 p.logical.mappings=[{id:'M-A',logicalId:'L-A',physicalId:'C-shared'},{id:'M-B',logicalId:'L-B',physicalId:'C-shared'}];
 return p;
}
const scoped=sharedBoundary(),unchanged=JSON.stringify(scoped);
for(const [id,chapter]of [['REQ-A',1],['L-A',4]]){
 const c=architectureContext(scoped,{id,chapter});
 assert.deepEqual(c.scope.requirementIds,['REQ-A']);assert.deepEqual(c.scope.responsibilityIds,['L-A']);
 assert.deepEqual(c.scope.driverIds,['D-A','D-C'],'An upstream intent keeps its driver and explicit implementation constraints, not a sibling requirement’s driver');
 assert.deepEqual(c.scope.componentIds,['C-shared']);
}
assert.deepEqual(architectureContext(scoped,{id:'C-shared',chapter:5}).scope.driverIds,['D-A','D-B','D-C']);
assert.deepEqual(driversForRequirement(scoped,'REQ-A').map(d=>d.id),['D-A','D-C']);
assert.deepEqual(driversForComponent(scoped,'C-shared').map(d=>d.id),['D-A','D-B','D-C']);
const group=structuredClone(scoped);group.requirementGroups={version:1,counter:1,records:[{id:'RG-A',kind:'theme',title:'Catalogue',memberIds:['REQ-A'],rule:[]}]};group.quality.drivers[0].requirementIds=[];group.quality.drivers[0].requirementGroupIds=['RG-A'];
assert(architectureContext(group,{id:'L-A',chapter:4}).scope.driverIds.includes('D-A'),'Live group membership is positive driver scope');
const other=structuredClone(group);other.requirementGroups.records[0].memberIds=['REQ-B'];assert(!architectureContext(other,{id:'L-A',chapter:4}).scope.driverIds.includes('D-A'),'Changing the group removes its old intent membership');
const nonQuality=brainContext(scoped,{chapter:4,id:'L-A'});
assert(!nonQuality.missing.some(x=>/quality target|measurable target/i.test(x)));assert(!draftNarrative(nonQuality).includes('A measurable target remains to be defined.'));
const driver=chapterReading(withFinalReview(scoped),'M:2:D-A');
assert.deepEqual(driver.knobs.map(x=>x.key),['description','impact','rationale']);
assert.throws(()=>chapterCommands(withFinalReview(scoped),'M:2:D-A',{measurement:'A numeric metric was not requested.'}),/none of the record/);
assert.equal(JSON.stringify(scoped),unchanged,'Every common reader remains read-only');
console.log('PASS exact requirement/responsibility intent, shared implementation constraints, live groups, all-kind source semantics and native driver editing');

// These subjects are outside the earlier six-pattern relevance table. Retrieval
// follows actual repository names/content; an editorial hit remains unassessed.
for(const name of ['Strangler Fig','Anti-Corruption Layer','CQRS']){
 const p=base();p.artefacts=[{id:'REQ-Q',type:'requirement',title:'Investigate '+name,description:'Review '+name+' for the selected boundary.'}];
 const c=architectureContext(p,{chapter:1,id:'REQ-Q'}),hit=relevantKnowledge(c,{project:p}).find(h=>h.structure.title===name);
 assert(hit,name);assert.equal(hit.structure.authority.evaluateFit,false);assert.equal(hit.structure.authority.scoring,false);
 const reading=architectureIntelligence(p,{chapter:1,id:'REQ-Q'});assert.equal(reading.primary.title,name);assert.equal(reading.primary.state,'consideration');
 assert(reading.primary.question&&reading.primary.conditions.length);assert(!reading.primary.actions.some(a=>a.kind==='compare'),'Catalogue discovery cannot manufacture a released design concern');
}
const reference=withFinalReview(seedProject()),before=JSON.stringify(reference),ix=journeyIndex(reference),indexed=[...ix.nodes.keys()];
for(const [chapter,id]of [[1,'REQ-001'],[2,'QD-001'],[3,'ADR-001'],[4,'api'],[5,'api-pod'],[6,'tc-001'],[7,'tr-001'],[8,'rest'],[9,'thr-001'],[10,'run-001'],[11,'SDD']]){
 const r=architectureIntelligence(reference,{chapter,id},{prompt:'Explore Strangler Fig',limit:8});
 assert.equal(r.subject.id,id);assert.equal(r.subject.chapter,chapter);assert(r.insights.some(i=>i.title==='Strangler Fig'));
 const work=architectureIntelligence(reference,{chapter,id,tab:'work'},{prompt:'Explore Strangler Fig',limit:8});assert.equal(r.receipt.basisStamp,work.receipt.basisStamp,'Presentation tabs do not change the canonical architectural basis');
 const source=architectureIntelligenceSource(r);assert(source.excerpt.length<=3500);assert.doesNotThrow(()=>JSON.parse(source.excerpt));assert(architectureIntelligenceCurrent(reference,source));
}
assert.equal(JSON.stringify(reference),before);assert.deepEqual([...ix.nodes.keys()],indexed,'The common reader never augments the canonical journey Map');
const narrative=structuredClone(reference);narrative.finalReview.narrative.summary='Use Strangler Fig for the explicitly staged replacement.';assert(architectureIntelligence(narrative,{chapter:11,id:'SDD'}).insights.some(i=>i.title==='Strangler Fig'),'Chapter 11 reads its actual saved narrative without a supplied prompt');
const actionProject=withFinalReview(scoped);actionProject.finalReview.actions=[{id:'ACT-A',title:'Verify catalogue migration',objectIds:['L-A'],acceptance:'Verify the agreed incremental migration.'}];
assert.deepEqual(architectureContext(actionProject,{chapter:11,id:'ACT-A'}).scope.requirementIds,['REQ-A'],'A delivery action reads its explicit native objectIds');
console.log('PASS repository-driven discovery beyond old examples, all eleven selected chapters, stable cross-tab basis and native final-review targets');

function releaseClaim(project,{subjectId='synthetic-policy',unit=null,predicate='requires',tags=[],statement='Review the synthetic configuration conditions.',linkTo='tr-002'}={}){
 let p=project;
 const command=(type,payload,actor='synthetic-author')=>{const r=applyKnowledgeCommand(p,{type:'knowledge.'+type,payload},at,actor);p=r.document;return r.selected;};
 const sourceId=command('source',{title:'Synthetic interpretation source',body:statement,path:'synthetic/interpretation.txt',revision:'fixture-1',license:'Original synthetic test material'});
 const claimId=command('claim',{sourceId,lineStart:1,lineEnd:1,subjectId,claimType:'prerequisite',predicate,polarity:'requires',statement,conditions:['Apply only at the selected declared boundary.'],limitations:['This is not measured evidence or an automatic selection.'],tags,...(unit?{architectureUnit:unit}:{})});
 command('review',{...review,id:claimId,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true},'synthetic-reviewer');
 const releaseId=command('release',{...review,title:'Synthetic reviewed interpretation',claimIds:[claimId]});command('activate',{...review,id:releaseId,stamp:knowledgeStamp(p)});
 if(linkTo)command('link',{...review,objectId:linkTo,claimId,releaseId});
 return {p,sourceId,claimId,releaseId};
}
const unit={kind:'product-mechanism',mechanism:'Synthetic declared configuration gate.',scope:{product:'PostgreSQL',version:'16'},effects:[{quality:'reliability',direction:'supports',rationale:'The declared gate is a prerequisite; outcomes remain unverified.'}],obligations:[{action:'Test the configured behavior.',evidence:'Retain a scoped execution result.'}],exclusions:[],applicability:{requires:[{id:'disabled',fact:'synthetic.enabled',op:'eq',value:false,label:'The synthetic setting is disabled'},{id:'budget',fact:'synthetic.budget',op:'gte',value:0,label:'The synthetic budget is non-negative'}]},placement:[{target:'data-owner',reason:'The selected store owns this synthetic policy.'}]};
let configured=structuredClone(reference);const realisation=configured.technologyRealisation.records.find(r=>r.id==='tr-002'),option=realisation.options[0];
realisation.version='16';realisation.configurationFacts={'synthetic.enabled':false,'synthetic.budget':0};
realisation.options=[{...option,id:'O-known',product:'postgres',version:'16',configurationFacts:{'synthetic.enabled':false,'synthetic.budget':0}},{...option,id:'O-missing',product:'PostgreSQL',version:'',configurationFacts:{}},{...option,id:'O-conflict',product:'PostgreSQL',version:'16',configurationFacts:{'synthetic.enabled':true,'synthetic.budget':0}},{...option,id:'O-old',product:'PostgreSQL',version:'15',configurationFacts:{'synthetic.enabled':false,'synthetic.budget':0}}];
const released=releaseClaim(configured,{unit});configured=released.p;
const optionReading=architectureIntelligence(configured,{chapter:7,id:'tr-002'},{limit:12}),typed=optionReading.insights.filter(i=>i.id.includes(released.claimId)),byOption=id=>typed.find(i=>i.id.endsWith(':'+id));
assert.equal(byOption('O-known').state,'context-match');assert(byOption('O-known').checks.some(c=>c.value===false));assert(byOption('O-known').checks.some(c=>c.value===0));
assert.equal(byOption('O-missing').state,'needs-context');assert(byOption('O-missing').checks.some(c=>c.fact==='scope.version'&&c.state==='unknown'),'An option cannot inherit its parent’s version');
assert.equal(byOption('O-conflict').state,'excluded');assert.equal(byOption('O-old').state,'excluded');assert(typed.every(i=>i.obligations.every(o=>o.verification==='pending')));
const ownOption=architectureIntelligence(configured,{chapter:7,id:'O-known'});assert(ownOption.insights.some(i=>i.state==='context-match'),'An option selection uses native canonical product aliases');
const independent=architectureIntelligenceSource(optionReading,{maxCharacters:12000});assert(architectureIntelligenceCurrent(configured,independent));
const versionChanged=structuredClone(configured);versionChanged.technologyRealisation.records.find(r=>r.id==='tr-002').options[0].version='17';assert(!architectureIntelligenceCurrent(versionChanged,independent));
const structureChanged=structuredClone(independent);structureChanged.receipt.structureVersion='earlier-interpretation';assert(!architectureIntelligenceCurrent(configured,structureChanged));
console.log('PASS reviewed typed applicability, false and zero, per-option unknowns, canonical product identity, version mismatch and interpretation currentness');

// A reviewed interpretation can refer to a catalogue subject; only the actual
// catalogue source declares its editorial complements/conflicts/alternatives.
const catalogueAnchor=knowledgeStructures(reference).records.find(r=>r.record.complements?.some(id=>BRAIN_CATALOGUE.records.some(x=>x.id===id)));
const related=releaseClaim(reference,{subjectId:catalogueAnchor.id,linkTo:'api-pod'}),relationReading=architectureIntelligence(related.p,{chapter:5,id:'api-pod'},{limit:12}),reviewedInsight=relationReading.insights.find(i=>i.id.includes(related.claimId));
assert(reviewedInsight);assert(reviewedInsight.interactions.length||reviewedInsight.alternatives.length);
for(const edge of [...reviewedInsight.interactions,...reviewedInsight.alternatives])assert(edge.sourceRefs.includes('catalogue:'+catalogueAnchor.id),'The declaring catalogue source, not merely its reviewed interpretation, supports the relation');
const relationshipSource=architectureIntelligenceSource(relationReading,{sourceIds:relationReading.sources.filter(s=>s.id!=='catalogue:'+catalogueAnchor.id).map(s=>s.id),maxCharacters:12000});
assert(!JSON.parse(relationshipSource.excerpt).insights.some(i=>i.interactions.some(e=>e.from===catalogueAnchor.id)),'An omitted relation source removes the derived relation body');
const ruled=releaseClaim(reference,{subjectId:'design-concern:staged-cutover',predicate:'offers a design concern',statement:'Compare staged replacement against a coordinated cutover.',linkTo:'REQ-001',tags:['title:Staged cutover','question:Which transition preserves the declared contract?','criterion:rollback|Rollback|Who restores the prior boundary?','option:staged|Staged replacement|Two versions need temporary ownership.','option:cutover|Coordinated cutover|One change window concentrates transition risk.']});
const comparison=architectureIntelligence(ruled.p,{chapter:1,id:'REQ-001'},{limit:12}).insights.find(i=>i.id.includes(ruled.claimId)),compare=comparison?.actions.find(a=>a.kind==='compare');
assert(compare?.concernId.startsWith('knowledge:'));
const started=applyArchitectureCommand(ruled.p,{type:'architecture.start',payload:{topic:compare.concernId,requirementId:compare.requirementId,driverId:compare.driverId}},at).document;
assert.equal(started.coauthoring.designTasks.at(-1).governedConcern.receipt.claimId,ruled.claimId,'The common native action opens exactly the current released concern');
const rootContext=brainContext(ruled.p,{chapter:1,id:'REQ-001'}),generation={context:{chapter:1,id:'REQ-001'},basisStamp:rootContext.stamp,sources:[]};
assert(generationCurrent(started,generation),'Creating a proposed task cannot invalidate the source that suggested it');
const answered=structuredClone(started);answered.coauthoring.designTasks.at(-1).answers.reason='Synthetic draft answer';answered.coauthoring.designTasks.at(-1).revision++;
assert(generationCurrent(answered,generation),'Answering a draft is not an architectural source change');
console.log('PASS exact editorial relation evidence, omitted-source closure, released comparison native routing and non-circular draft currentness');

const ready=readyComposition('resilience'),prepared=arc(ready,'architecture.prepare',{optionId:'protected-call'}),alternative=prepared.document.modelAlternatives.records.find(a=>a.id===prepared.selected),preview=previewAlternative(prepared.document,alternative);
const applied=applyAlternativeCommand(prepared.document,{type:'alternative.apply',payload:{...review,id:alternative.id,alternativeRevision:alternative.revision,previewStamp:preview.stamp}},at).document;
const task=applied.coauthoring.designTasks.at(-1),solution=task.applied.reasoningGraph.solution,componentId=solution.placement.find(x=>x.componentId)?.componentId;
assert(componentId);const solutionReading=architectureIntelligence(applied,{chapter:5,id:componentId},{limit:12}),verification=solutionReading.insights.find(i=>i.kind==='verification');
assert.equal(verification?.state,'pending');assert(verification.obligations.length);assert(verification.obligations.every(o=>o.verification==='pending'));assert(verification.actions.some(a=>a.kind==='resume-task'&&a.taskId===task.id));
assert(componentSpec(reasoningSource(applied),componentId).architectureObligations.some(o=>o.verification==='pending'),'The same accepted recipe supplies pending component specifications');
const historical=JSON.stringify(task.applied),oldInterpretation=structuredClone(applied);oldInterpretation.coauthoring.designTasks.at(-1).methodReceipt.sources.evaluationRevision=1;
assert.equal(architectureIntelligence(oldInterpretation,{chapter:5,id:componentId},{limit:12}).insights.find(i=>i.kind==='verification')?.state,'stale');
const changedRequirement=structuredClone(applied);changedRequirement.artefacts.find(r=>r.id===task.requirementId).description+=' A newly declared obligation.';
assert.equal(architectureIntelligence(changedRequirement,{chapter:5,id:componentId},{limit:12}).insights.find(i=>i.kind==='verification')?.state,'stale');
const withdrawn=applyKnowledgeCommand(applied,{type:'knowledge.withdraw',payload:{...review,id:'MS-CIRCUIT',stamp:knowledgeImpactStamp(applied,'MS-CIRCUIT')}},at,'synthetic-reviewer').document;
assert.equal(architectureIntelligence(withdrawn,{chapter:5,id:componentId},{limit:12}).insights.find(i=>i.kind==='verification')?.state,'stale');
assert.equal(JSON.stringify(withdrawn.coauthoring.designTasks.at(-1).applied),historical,'Changed support never rewrites the adopted model or receipt');
console.log('PASS native reviewed proposal → concrete obligations → component specifications, changed driver basis, interpretation revision and publisher withdrawal with immutable acceptance history');

// The mandatory Chapter 7 reading derives labels/reasons from nested options.
// Removing an option identifier after derivation cannot remove its private text.
const privateOption=structuredClone(reference),privateParent=privateOption.technologyRealisation.records[0];
privateParent.options[0].rationale='ExcludedNestedOptionSecretText';privateParent.options[0].product='ExcludedNestedOptionProductText';privateOption.workspace={...(privateOption.workspace||{}),aiPolicy:{excludedObjectIds:[privateParent.options[0].id]}};
assert.throws(()=>reasoningPacket(privateOption,{task:'decisions',ids:['M:7:'+privateParent.id],prompt:'Review option conditions.'}),/disclosure policy.*narrower allowed scope/,'A required derived comparison with excluded child facts fails closed before a packet is available');
console.log('PASS nested-option disclosure blocks the broader required reasoning request before derived labels or rationale can be transmitted');
const contextualPacket=reasoningPacket(reference,{task:'decisions',ids:['M:5:api-pod'],prompt:'Explore Strangler Fig.'}),contextualSource=contextualPacket.sources.find(s=>s.kind==='architecture-intelligence');
assert(contextualSource);assert(JSON.parse(contextualSource.excerpt).insights.some(i=>i.title==='Strangler Fig'));assert(contextualPacket.sources.some(s=>s.id==='catalogue:PAT-STRANGLER-FIG'));
assert(contextualPacket.sources.some(s=>s.kind==='planning-assumptions'));assert(contextualPacket.coverage.characters<=28000&&contextualPacket.sources.length<=22);
console.log('PASS native instrument basis and a complete contextual deduction/source bundle coexist within the unchanged reasoning bounds');
