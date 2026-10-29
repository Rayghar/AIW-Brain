import {workbenchMarkdown,guidanceFindings,guideMarkdown} from './guidance-record.js';
// Round 12 (G, GR-UX-16): the chapters named from the one chapter-name table.
import {CHAPTER_TITLES} from './chapter-names.js';
// Round 6 (Contract T): a recorded relationship the standard forbids is a finding of the chapter that owns its source record.
import {relationshipFindings} from './architecture-model.js';
import {remember,isSettled,memoOff,memoPass,documentIndex} from './document-memo.js';
import {assuranceMarkdown,semanticFindings} from './assurance-domain.js';
import {qualityMeasurementFindings} from './quality-analysis.js';
import {knowledgeFindings,knowledgeMarkdown} from './knowledge-governance.js';
import {acceptedNarratives,narrativeFindings,narrativeMarkdown} from './brain-authoring.js';
import {designTaskFindings,designTaskMarkdown,designTasks} from './design-task-state.js';
import {alternativesMarkdown} from './model-alternatives-state.js';
import {withEvidence,evidenceDesignSource,evidenceFindings,evidenceMarkdown} from './evidence-domain.js';
import {architectureRegister,renderSDD} from './sdd-renderer.js';
import {processMarkdown,withProcessModel} from './process-model.js';
import {withChanges,changeSummary,changeCauses,fourEyesOn} from './changes-domain.js';
// The grouped judgements of the review plan (round 12, GR-GOV-04): who reviewed which records, as they read then.
import {recordJudgement,reviewOf,eachRecord,provenanceBlocksMarkdown} from './provenance.js';
// What a review of a record reads of it (round 12, GR-GOV-05): its own fingerprint, not the whole design's.
import {recordStamp} from './source-fingerprint.js';
import {withRuntime,runtimeFindings,runtimeMilestones,runtimeHandoffCurrent,plans,placements,runtimeSources,exportRuntimeMarkdown} from './runtime-domain.js';
import {findings,milestones,exportMarkdown} from './requirements-domain.js';
import {linksRequirement,linkedRequirementIds} from './requirement-links.js';
import {requirementGroups,groupMembers} from './requirement-groups.js';
import {qualityFindings,qualityMilestones,exportQualityMarkdown} from './quality-domain.js';
import {decisionFindings,decisionMilestones,decisionCurrent,exportDecisionsMarkdown} from './decisions-domain.js';
import {logicalGraph,logicalFindings,logicalMilestones,exportLogicalMarkdown} from './logical-domain.js';
import {realisationFindings,realisationMilestones,exportRealisationMarkdown} from './realisation-domain.js';
import {technologyFindings,technologyMilestones,exportTechnologyMarkdown} from './technology-domain.js';
import {technologyRealisationFindings,technologyRealisationMilestones,exportTechnologyRealisationMarkdown} from './technology-realisation-domain.js';
import {interfaceFindings,interfaceMilestones,interfaceSources,exportInterfacesMarkdown} from './interfaces-domain.js';
import {securityFindings,securityMilestones,securitySources,exportSecurityMarkdown} from './security-domain.js';
import {reasoningSource} from './design-reasoning.js';
import {detectAntiPatterns} from './design-spec.js';
import {capacityObjective,capacityPlan,capacityMarkdown,ASSUMPTIONS as CAPACITY_ASSUMPTIONS} from './desk-capacity.js';
import {arsSection} from './ars-document.js';
import {componentSpecsSection} from './component-spec-document.js';
import {reasoningRecordMarkdown} from './reasoning-record.js';
import {withRoadmap,applyRoadmapCommand,actionPlateau,roadmapFindings,transitionSection} from './roadmap-domain.js';
import {architectureObligationsFor,architectureObligationBasis,architectureObligationAction,architectureObligationActionState,architectureActionStamp,architectureEvidenceSources,deliveryActionDefinition} from './architecture-obligations.js';
import {normaliseVerificationContract,verificationForAction,verificationEvidence} from './architecture-verification.js';
import {digest} from './brain-integrity.js';

const text=(v,max=4000)=>typeof v==='string'?v.trim().slice(0,max):'',unique=xs=>[...new Set(xs)],pad=n=>String(n).padStart(3,'0');
// A compact change detector, not a security signature or a verification claim.
export function reviewFingerprint(value){let a=2166136261,b=5381;const s=JSON.stringify(value);for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619);b=Math.imul(b,33)^s.charCodeAt(i);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
export const reviewSource=p=>({...(acceptedNarratives(p).length?{coauthoredNarratives:acceptedNarratives(p)}:{}),...(designTasks(p).some(t=>t.status==='applied'||t.measurements?.length)?{guidedDesign:designTasks(p).filter(t=>t.status==='applied'||t.measurements?.length)} : {}),...((p.coauthoring?.sources?.length)?{evidence:evidenceDesignSource(p)}:{}),...Object.fromEntries(Object.entries(p).filter(([k])=>!['finalReview','workspace','changes','coauthoring','roadmap','readingsDefinition'].includes(k))),...(p.workspace?.template?{workspace:{template:p.workspace.template}}:{})});
const sourceCache=new WeakMap(),findingCache=new WeakMap(),summaryCache=new WeakMap(),objectCache=new WeakMap(),traceCache=new WeakMap();
export function reviewSourceStamp(p){if(!sourceCache.has(p))sourceCache.set(p,reviewFingerprint(reviewSource(p)));return sourceCache.get(p);}
export const reviewDesignStamp=p=>reviewSourceStamp(p)+':'+p.finalReview.version;
const localReview=(p,r)=>!p.finalReview?.imported||!!(r?.actor&&!r?.importedActor&&r.at>p.finalReview.imported.at);
export const narrativeCurrent=p=>p.finalReview.narrative.confirmed&&p.finalReview.narrative.sourceStamp===reviewSourceStamp(p)&&(!p.finalReview.imported||!!reviewOf(p,p.finalReview.narrative,11));
// A recorded stamp is compared with the design's; with none recorded the answer is no without fingerprinting the whole
// design (round 5, R5-G: at 500 records per chapter the fingerprint reads 12 MB of JSON).
export const reviewIntakeCurrent=p=>p.finalReview.intake?.stamp!=null&&p.finalReview.intake.stamp===reviewSourceStamp(p)&&localReview(p,p.finalReview.intake);
export const finalChecksCurrent=p=>p.finalReview.checks?.stamp!=null&&p.finalReview.checks.stamp===reviewDesignStamp(p)&&localReview(p,p.finalReview.checks);
export const CHAPTERS=[
 {id:1,title:CHAPTER_TITLES[1],key:'requirements',checks:findings,milestones,export:exportMarkdown},
 {id:2,title:CHAPTER_TITLES[2],key:'quality',checks:qualityFindings,milestones:qualityMilestones,export:exportQualityMarkdown},
 {id:3,title:CHAPTER_TITLES[3],key:'decisions',checks:decisionFindings,milestones:decisionMilestones,export:exportDecisionsMarkdown},
 {id:4,title:CHAPTER_TITLES[4],key:'logical',checks:p=>[...logicalFindings(p),...relationshipFindings(p,{chapter:4})],milestones:logicalMilestones,export:exportLogicalMarkdown},
 {id:5,title:CHAPTER_TITLES[5],key:'realisation',checks:p=>[...realisationFindings(p),...relationshipFindings(p,{chapter:5})],milestones:realisationMilestones,export:exportRealisationMarkdown},
 {id:6,title:CHAPTER_TITLES[6],key:'technology',checks:p=>[...technologyFindings(p),...relationshipFindings(p,{chapter:6})],milestones:technologyMilestones,export:exportTechnologyMarkdown},
 {id:7,title:CHAPTER_TITLES[7],key:'technologyRealisation',checks:p=>[...technologyRealisationFindings(p),...relationshipFindings(p,{chapter:7})],milestones:technologyRealisationMilestones,export:exportTechnologyRealisationMarkdown},
 {id:8,title:CHAPTER_TITLES[8],key:'interfaces',checks:interfaceFindings,milestones:interfaceMilestones,export:exportInterfacesMarkdown},
 {id:9,title:CHAPTER_TITLES[9],key:'security',checks:securityFindings,milestones:securityMilestones,export:exportSecurityMarkdown},
 {id:10,title:CHAPTER_TITLES[10],key:'runtime',checks:runtimeFindings,milestones:runtimeMilestones,export:exportRuntimeMarkdown}
];
// Round 12 (GR-SRC-07): a finding the source cannot answer (no recovery target, no window, no owner stated) is raised with
// the source's owner: treated, with who raised it, when and with whom, and listed as raised, not as unfinished work.
export const SOURCE_SILENT='Source silent · raised with the owner';
export const DISPOSITIONS=['Fix before review','Carry as action','Accepted design limitation','Not applicable',SOURCE_SILENT];
export const REVIEW_OUTCOMES=['Revision required','Ready with actions / limitations','Ready for governance'];
export const GOVERNANCE_OUTCOMES=['Approved','Approved with conditions','Rejected','Withdrawn'];
export const DELIVERY_STATES=['Planned','In progress','Blocked','Verified'];
// The roadmap (round 6, Contract S) is Chapter 11's plan, not the design: it is kept beside finalReview, left out of
// the design's source fingerprint (reviewSource), and changed only through the review commands below.
// A document whose records keep copies of what they read is upgraded here, once, to keep fingerprints (round 12, D-04:
// readings-upgrade.js, which the server registers; documents reach the browser upgraded); a frozen baseline's source is
// read as it was frozen ({upgrade:false}), so its figures are the same.
let readingsUpgrade=null;
export function registerReadingsUpgrade(upgrade){readingsUpgrade=typeof upgrade==='function'?upgrade:null;}
// The SDD's title (round 12, GR-SDD-21): the narrative's own; the sample's default title read on another project is no
// title, and the project's name stands in.
export const SAMPLE_SDD_TITLE='Bank Payment Journey — Solution Design';
export const sddTitle=p=>{const t=text(p?.finalReview?.narrative?.title,180);return t&&!(t===SAMPLE_SDD_TITLE&&p.id&&p.id!=='bank-payment')?t:p?.name?text(p.name,100)+' — Solution Design':'Solution Design Document';};
export function withFinalReview(input,{upgrade=true}={}){const p=withRoadmap(withProcessModel(withRuntime(input)));if(!p.finalReview)p.finalReview={schemaVersion:1,version:1,deliveryVersion:1,counters:{action:0,disposition:0,trace:0,review:0,baseline:0,governance:0},narrative:{title:(p.name?String(p.name)+' — ':'')+'Solution Design',owner:'',audience:'',summary:'',scope:'',approach:'',confirmed:false},intake:null,checks:null,dispositions:[],actions:[],traces:[],reviews:[],baselines:[],governance:[],handoff:null};const q=withEvidence(withChanges(p));return upgrade&&readingsUpgrade?readingsUpgrade(q):q;}
// The aggregations below read every chapter's checks; each runs as one pass over the document (document-memo.js,
// round 5), so the chapters share their indexes and the connected graph instead of each building its own.
export function chapterSummaries(p){if(summaryCache.has(p))return summaryCache.get(p);const result=memoPass(p,()=>CHAPTERS.map(c=>{const fs=c.checks(p),ms=c.milestones(p);return {id:c.id,title:c.title,errors:fs.filter(f=>f.level==='error').length,warnings:fs.filter(f=>f.level==='warning').length,done:ms.filter(m=>m.done).length,total:ms.length};}));summaryCache.set(p,result);return result;}
// A finding's stamp binds a disposition to the exact source state. For the store's settled document it is computed
// when it is first read, not when the findings are listed (audit F2-04): a chapter page that only counts findings
// never fingerprints the design. The property stays an ordinary enumerable one to every reader (spread, JSON and
// structuredClone read it as a value). Any other document — a command's working copy, the server's — is stamped
// at once, exactly as before.
function stamped(p,f,compute){if(!isSettled(p)){f.stamp=compute();return f;}let value;Object.defineProperty(f,'stamp',{enumerable:true,configurable:true,get(){if(value===undefined)value=compute();return value;},set(v){value=v;}});return f;}
// A finding's stamp reads its own inputs (round 12, GR-GOV-05): the finding as the rule states it and the records it is
// about, each by its own fingerprint (source-fingerprint.js), so a treatment holds until what it judged changes, not
// until anything in the design changes. A finding about the whole project reads the whole design, as before. The stamp a
// treatment recorded before round 12 took (the whole design's, legacyStampOf below) is still read for it.
const recordIndex=p=>remember(p,'review:records-by-id','',()=>{const m=new Map();eachRecord(p,r=>{if(r.id!=null&&!m.has(r.id))m.set(r.id,r);});return m;});
const findingInputs=(p,f)=>{const ids=[...new Set([f.objectId||f.artefactId||f.driverId||f.decisionId,...(Array.isArray(f.objectIds)?f.objectIds:[]),...(Array.isArray(f.ids)?f.ids:[])].filter(id=>typeof id==='string'&&id&&id!=='project'))];if(!ids.length)return null;const index=recordIndex(p),records=ids.map(id=>index.get(id));return records.every(Boolean)?records.map(r=>[r.id,recordStamp(p,r)]):null;};
export const findingStamp=(p,scope,f)=>{const inputs=findingInputs(p,f);return reviewFingerprint(inputs?['finding',scope,f,inputs]:[reviewSourceStamp(p),scope,f]);};
export function inheritedFindings(p){if(findingCache.has(p))return findingCache.get(p);return memoPass(p,()=>inheritedFindingsOf(p));}
// One chapter's own findings as the inherited list carries them, worked out once per settled document or pass and shared
// with that list (round 5, R5-G): a chapter's passages need only its own, not every chapter's checks.
const chapterInherited=(p,c)=>remember(p,'review:inherited-chapter',c.id,()=>c.checks(p).map(f=>stamped(p,{...f,id:'C'+c.id+':'+f.id,sourceId:f.id,chapter:c.id,chapterTitle:c.title,objectId:f.objectId||f.artefactId||f.driverId||f.decisionId||'project'},()=>findingStamp(p,c.id,f))));
// inheritedFindings(p).filter(f=>f.chapter===chapter&&f.id.startsWith('C'+chapter+':')), the same records in the same order.
export function chapterInheritedFindings(p,chapter){const c=CHAPTERS.find(x=>x.id===Number(chapter));return c?memoPass(p,()=>chapterInherited(p,c)):[];}
const inheritedSupplement=p=>remember(p,'review:inherited-supplement','',()=>[...semanticFindings(p).filter(f=>f.chapter!==1),...evidenceFindings(p),...designTaskFindings(p),...qualityMeasurementFindings(p),...knowledgeFindings(p),...guidanceFindings(p),...narrativeFindings(p)]);
function inheritedBase(p){return remember(p,'review:inherited-base','',()=>{const result=CHAPTERS.flatMap(c=>chapterInherited(p,c));result.push(...inheritedSupplement(p).map(f=>stamped(p,{...f,id:'EVIDENCE:'+f.id,sourceId:f.id},()=>findingStamp(p,'evidence',f))));return result;});}
function inheritedFindingsOf(p){const result=inheritedBase(p).slice();result.push(...antiPatternFindings(p).map(f=>stamped(p,{...f,id:'ANTI:'+f.sourceId},()=>findingStamp(p,'anti',f))));findingCache.set(p,result);return result;}
// Anti-patterns found in the recorded design (design-spec.js) are review items like any other
// finding: each can be treated here, fixed in the chapter that owns it, or accepted with reasons.
function antiPatternFindings(p){let found=[];try{found=detectAntiPatterns(reasoningSource(p));}catch{return [];}return found.map(a=>({sourceId:a.id,code:a.catalogueId,chapter:a.chapter,chapterTitle:(CHAPTERS.find(c=>c.id===a.chapter)||{}).title||'',title:a.name,detail:a.text+(a.ask?' Ask: '+a.ask:''),level:'warning',objectId:a.objects[0]?.id||'project',objectIds:a.objects.map(o=>o.id)}));}
// The review objective and the performance specification it asks for (desk-capacity.js).
export function reviewCapacity(p){const R=reasoningSource(p),O=capacityObjective(R,p.finalReview?.capacity||null);return ['review','driver'].includes(O.source.kind)?capacityPlan(R,O):null;}
// Round 11: the Architecture requirements specification (ars-document.js) stands before the performance specification,
// which it widens to every category: each driver as a requirement with its scenario, target, verification and trace.
function requirementsSpecMarkdown(p){try{return arsSection(p);}catch(e){return '## Architecture requirements specification\n\nThe specification could not be read: '+(e?.message||'unreadable')+'.\n\n';}}
// Round 11: every component's specification (component-spec-document.js), one part each, after the performance specification.
function componentSpecsMarkdown(p){try{return componentSpecsSection(p);}catch(e){return '## Component specifications\n\nThe specifications could not be read: '+(e?.message||'unreadable')+'.\n\n';}}
function performanceMarkdown(p){let C=null;try{C=reviewCapacity(p);}catch{C=null;}return C?capacityMarkdown(C):'## Performance specification\n\nNo load stated: no objective is recorded, so no capacity reading is computed. Set one on the review desk (Chapter 11 → Model → What it takes), or record a scalability driver in Chapter 2.\n\n';}
export function reviewObjects(p){if(objectCache.has(p))return objectCache.get(p);const g=logicalGraph(p),map=new Map();for(const a of p.artefacts)map.set(a.id,{id:a.id,ref:a.id,title:a.title,chapter:1,kind:a.type});for(const d of p.quality.drivers)map.set(d.id,{id:d.id,ref:d.id,title:d.title,chapter:2,kind:'quality driver'});for(const d of p.decisions.records)map.set(d.id,{id:d.id,ref:d.id,title:d.question,chapter:3,kind:'decision'});for(const n of g.nodes)map.set(n.id,{id:n.id,ref:n.ref||n.id,title:n.title,chapter:n.runtimeKind?10:n.layer==='security'?9:n.layer==='interface'||n.layer==='data'?8:n.layer==='technology'?(n.id.startsWith('tr-')?7:6):n.layer==='physical'?5:n.layer==='logical'?4:1,kind:n.runtimeKind||n.layer});const result=[...map.values()];objectCache.set(p,result);return result;}
export function reviewSourceUrl(chapter,id,tab='model'){return '/?chapter='+chapter+'&tab='+tab+(id&&id!=='project'?'&'+(chapter===1?'artefact':chapter===2?'driver':chapter===3?'decision':'object')+'='+encodeURIComponent(id):'');}
export const reviewRequirements=p=>p.artefacts.filter(a=>a.type==='requirement'&&a.scopeMode!=='out');
// A requirement's trail (round 5, R5-G: the same trail, read through sets; the records that carry each requirement in
// their sources are listed once per settled document or pass, rather than every record's sources once per requirement).
const carriersOf=p=>documentIndex(p,'review:trace-carriers',()=>memoPass(p,()=>{const by=(list,sources)=>{const m=new Map();for(const r of list)for(const id of new Set(sources(r).requirements.map(a=>a.id))){let xs=m.get(id);if(!xs)m.set(id,xs=[]);xs.push(r);}return m;};return {contracts:by(p.interfaces.contracts,c=>interfaceSources(p,c)),controls:by(p.security.controls,c=>securitySources(p,c)),runtime:by(plans(p),r=>runtimeSources(p,r))};}));
// A complete SDD asks for every requirement trail. Index each record's explicit and group-derived links once for a
// settled document or read pass; retain the original scan on mutable documents and in unmemoised equivalence checks.
// Each index list is populated in its chapter's record order, so a trail has exactly the same order and wording.
const traceDirectOf=p=>documentIndex(p,'review:trace-direct',()=>{
 const by=rows=>{const index=new Map();for(const row of rows)for(const id of linkedRequirementIds(p,row)){let list=index.get(id);if(!list)index.set(id,list=[]);list.push(row);}return index;};
 const byKey=(rows,key)=>{const index=new Map();for(const row of rows)for(const id of [].concat(key(row)??[])){let list=index.get(id);if(!list)index.set(id,list=[]);list.push(row);}return index;};
 const valuesBy=(rows,key,value)=>{const index=new Map();for(const row of rows){let list=index.get(key(row));if(!list)index.set(key(row),list=[]);list.push(value(row));}return index;};
 const lists={decisions:p.decisions.records,applications:p.realisation.components,needs:p.technology.needs,
  capabilities:p.technology.capabilities,realizations:p.technologyRealisation.records,data:p.interfaces.data};
 const positions=Object.fromEntries(Object.entries(lists).map(([key,rows])=>[key,new Map(rows.map((row,i)=>[row,i]))]));
 const relationships=new Map();for(const link of p.relationships)for(const id of new Set([link.from,link.to])){let set=relationships.get(id);if(!set)relationships.set(id,set=new Set());set.add(link.from);set.add(link.to);}
 return {requirements:new Map(reviewRequirements(p).map(r=>[r.id,r])),relationships,positions,
  decisionsByDriver:byKey(p.decisions.records,r=>r.driverIds),applicationIdsByLogical:valuesBy(p.logical.mappings,r=>r.logicalId,r=>r.physicalId),
  applicationsById:byKey(p.realisation.components,r=>r.id),needsByApplication:byKey(p.technology.needs,r=>r.applicationId),
  capabilityIdsByNeed:valuesBy(p.technology.mappings,r=>r.needId,r=>r.capabilityId),capabilitiesById:byKey(p.technology.capabilities,r=>r.id),
  realizationIdsByCapability:valuesBy(p.technologyRealisation.mappings,r=>r.capabilityId,r=>r.realizationId),
  realizationsById:byKey(p.technologyRealisation.records,r=>r.id),dataById:byKey(p.interfaces.data,r=>r.id),
  drivers:by(p.quality.drivers),decisions:by(p.decisions.records),logical:by(p.logical.responsibilities),
  applications:by(p.realisation.components),needs:by(p.technology.needs),capabilities:by(p.technology.capabilities),
  realizations:by(p.technologyRealisation.records),contracts:by(p.interfaces.contracts),data:by(p.interfaces.data),
  controls:by(p.security.controls),runtime:by(plans(p)),parties:by(p.interfaces.parties||[]),
  threats:by(p.security.threats||[]),paths:by(p.runtime?.paths||[])};
});
export function reviewTrace(p,id){if(traceCache.get(p)?.has(id))return traceCache.get(p).get(id);const direct=traceDirectOf(p),requirement=direct?direct.requirements.get(id):reviewRequirements(p).find(r=>r.id===id);if(!requirement)return null;const linked=direct?(direct.relationships.get(id)||new Set()):new Set(p.relationships.filter(l=>l.from===id||l.to===id).flatMap(l=>[l.from,l.to]));
 // A record answers for the requirement by naming it or by linking a requirement group that holds it (round 12, D-03),
 // a component too, by the groups it links itself, and so does a record of Chapters 6 to 10 that names it or its group
 // beside the trail it inherits (DM-02, DM-03): a need, a capability, a realisation, a party, a contract, a data
 // definition, a threat, a control, a runtime plan or a path.
 const answers=r=>linksRequirement(p,r,id),from=(key,rows)=>direct?(direct[key].get(id)||[]):rows.filter(answers),also=(key,rows,base)=>{const seen=new Set(base);for(const r of from(key,rows))if(!seen.has(r)){seen.add(r);base.push(r);}return base;};
 const ordered=(key,items)=>[...new Set(items)].sort((a,b)=>direct.positions[key].get(a)-direct.positions[key].get(b));
 const joined=(key,rows,items,match)=>direct?ordered(key,[...from(key,rows),...items]):rows.filter(r=>answers(r)||match(r));
 const carriers=carriersOf(p),context=p.artefacts.filter(a=>linked.has(a.id)&&a.id!==id),drivers=from('drivers',p.quality.drivers),driverIds=new Set(drivers.map(d=>d.id));
 const decisions=joined('decisions',p.decisions.records,direct?[...driverIds].flatMap(did=>direct.decisionsByDriver.get(did)||[]):[],d=>d.driverIds.some(did=>driverIds.has(did)));
 const logical=from('logical',p.logical.responsibilities),logicalIds=new Set(logical.map(r=>r.id));
 const appIds=new Set(direct?[...logicalIds].flatMap(lid=>direct.applicationIdsByLogical.get(lid)||[]):p.logical.mappings.filter(m=>logicalIds.has(m.logicalId)).map(m=>m.physicalId));
 const applications=joined('applications',p.realisation.components,direct?[...appIds].flatMap(aid=>direct.applicationsById.get(aid)||[]):[],a=>appIds.has(a.id)),applicationIds=new Set(applications.map(a=>a.id));
 const needs=joined('needs',p.technology.needs,direct?[...applicationIds].flatMap(aid=>direct.needsByApplication.get(aid)||[]):[],n=>applicationIds.has(n.applicationId)),needIds=new Set(needs.map(n=>n.id));
 const capabilityIds=new Set(direct?[...needIds].flatMap(nid=>direct.capabilityIdsByNeed.get(nid)||[]):p.technology.mappings.filter(m=>needIds.has(m.needId)).map(m=>m.capabilityId));
 const capabilities=joined('capabilities',p.technology.capabilities,direct?[...capabilityIds].flatMap(cid=>direct.capabilitiesById.get(cid)||[]):[],c=>capabilityIds.has(c.id)),capabilityHeld=new Set(capabilities.map(c=>c.id));
 const realizationIds=new Set(direct?[...capabilityHeld].flatMap(cid=>direct.realizationIdsByCapability.get(cid)||[]):p.technologyRealisation.mappings.filter(m=>capabilityHeld.has(m.capabilityId)).map(m=>m.realizationId));
 const realizations=joined('realizations',p.technologyRealisation.records,direct?[...realizationIds].flatMap(rid=>direct.realizationsById.get(rid)||[]):[],r=>realizationIds.has(r.id));
 const contracts=also('contracts',p.interfaces.contracts,carriers?(carriers.contracts.get(id)||[]).slice():p.interfaces.contracts.filter(c=>interfaceSources(p,c).requirements.some(r=>r.id===id)));
 const dataIds=new Set(contracts.flatMap(c=>c.exchanges.map(e=>e.dataId)));
 const data=joined('data',p.interfaces.data,direct?[...dataIds].flatMap(did=>direct.dataById.get(did)||[]):[],d=>dataIds.has(d.id));
 const controls=also('controls',p.security.controls,carriers?(carriers.controls.get(id)||[]).slice():p.security.controls.filter(c=>securitySources(p,c).requirements.some(r=>r.id===id)));
 const runtime=also('runtime',plans(p),carriers?(carriers.runtime.get(id)||[]).slice():plans(p).filter(r=>runtimeSources(p,r).requirements.some(a=>a.id===id)));
 const parties=from('parties',p.interfaces.parties||[]),threats=from('threats',p.security.threats||[]),paths=from('paths',p.runtime?.paths||[]),runtimeIds=new Set(runtime.map(r=>r.id)),zoneIds=unique(placements(p).filter(l=>runtimeIds.has(l.planId)).map(l=>l.zoneId));
 const nodes=unique([...context.map(a=>a.modelRef).filter(Boolean),...logical,...applications,...capabilities,...realizations,...contracts,...data,...controls,...runtime].map(n=>typeof n==='string'?n:n.id).concat(zoneIds));
 const result={requirement,context,drivers,decisions,logical,applications,capabilities,realizations,contracts,data,controls,runtime,parties,threats,paths,zoneIds,nodeIds:nodes,steps:[{title:'The obligation',detail:requirement.acceptance||'Acceptance criteria need definition.',ids:context.map(a=>a.modelRef).filter(Boolean)},{title:'Quality and decisions',detail:drivers.length+' linked quality drivers; '+decisions.filter(d=>decisionCurrent(p,d)).length+' currently accepted decisions of '+decisions.length+' linked decisions. Drafts remain visible.',ids:logical.map(r=>r.id)},{title:'Application responsibilities',detail:logical.length+' logical responsibilities are mapped into '+applications.length+' application components. A mapping records design intent, not implementation evidence.',ids:[...logical,...applications].map(r=>r.id)},{title:'Supporting architecture',detail:capabilities.length+' capabilities, '+realizations.length+' realizations, and '+contracts.length+' contracts supply the supporting design.',ids:[...capabilities,...realizations,...contracts,...data].map(r=>r.id)},{title:'Protection and runtime',detail:controls.length+' intended controls and '+runtime.length+' operating plans carry the obligation into operation. Evidence and open findings remain separate.',ids:[...controls,...runtime].map(r=>r.id).concat(zoneIds)}]};if(!traceCache.has(p))traceCache.set(p,new Map());traceCache.get(p).set(id,result);return result;
}
// An action's plateau (round 6) is part of its definition only when it names one, so the verification stamps of earlier
// actions, which name none, are what they were.
export const actionDefinition=deliveryActionDefinition;
export const actionCurrent=(p,a)=>a.architectureObligation?architectureObligationActionState(p,a).current:a.sourceStamp===reviewSourceStamp(p);
// Stamps of a settled (store) document are computed once per revision (audit F2-04, document-memo.js).
export const actionComplete=(p,a)=>a.status==='Verified'&&actionCurrent(p,a)&&a.verification?.stamp===remember(p,'review:action-definition',a,()=>reviewFingerprint(actionDefinition(a)))&&localReview(p,a.verification)&&(!a.architectureObligation||architectureObligationActionState(p,a).verified);
export const actionReady=a=>!!(a.title&&a.owner&&a.due&&a.acceptance&&a.objectIds.length);
// A treatment recorded since round 12 (basis 'finding') holds while its finding's own inputs read the same; one recorded
// before it, while the whole design did (its legacy stamp), as it always did. One treatment for a whole cause (scope
// 'cause', GR-GOV-13) keeps each finding with its own stamp: a change to one finding's inputs reopens that finding alone.
// The stamp a treatment recorded before round 12 took: the whole design's, with the finding as its rule raised it, worked
// out only when such a treatment is read (once per settled document or pass), never kept on every finding.
const evidenceRaw=p=>[...semanticFindings(p).filter(f=>f.chapter!==1),...evidenceFindings(p),...designTaskFindings(p),...qualityMeasurementFindings(p),...knowledgeFindings(p),...guidanceFindings(p),...narrativeFindings(p)];
export function legacyStampOf(p,f){return f?remember(p,'review:legacy-stamp',f.id,()=>{
 const m=/^C(\d+):/.exec(f.id);
 if(m){const c=CHAPTERS.find(x=>x.id===Number(m[1])),raw=c?c.checks(p).find(x=>x.id===f.sourceId):null;return raw?reviewFingerprint([reviewSourceStamp(p),c.id,raw]):null;}
 if(f.id.startsWith('EVIDENCE:')){const raw=evidenceRaw(p).find(x=>x.id===f.sourceId);return raw?reviewFingerprint([reviewSourceStamp(p),raw]):null;}
 if(f.id.startsWith('ANTI:')){const raw=antiPatternFindings(p).find(x=>x.sourceId===f.sourceId);return raw?reviewFingerprint([reviewSourceStamp(p),raw]):null;}
 return null;
}):null;}
const legacyOf=(p,f)=>legacyStampOf(p,f);
export const dispositionCurrent=(p,d,f)=>!!f&&(d.basis==='finding'?d.stamp===f.stamp:d.stamp===legacyOf(p,f));
// The treatments of each finding, newest first: one finding's own, and the causes that named it (appended to, never
// rewritten: an index of the list as it stands, kept while its length is unchanged).
const dispositionIndexes=new WeakMap();
function dispositionIndex(p){const list=p.finalReview?.dispositions||[],kept=dispositionIndexes.get(list);if(kept&&kept.n===list.length)return kept.m;const m=new Map(),add=(id,e)=>{let xs=m.get(id);if(!xs)m.set(id,xs=[]);xs.push(e);};list.forEach(d=>{if(d?.scope==='cause')for(const x of d.findings||[])add(x[0],{d,stamp:x[1]});else if(d?.findingId)add(d.findingId,{d,stamp:null});});for(const xs of m.values())xs.reverse();dispositionIndexes.set(list,{n:list.length,m});return m;}
export function latestDisposition(p,f){for(const e of dispositionIndex(p).get(f.id)||[])if(localReview(p,e.d)&&(e.d.scope==='cause'?e.stamp===f.stamp:dispositionCurrent(p,e.d,f)))return e.d;return undefined;}
const treatmentFor=(p,d)=>{if(!d)return 'Needs assessment';if(d.treatment==='Carry as action'){const a=p.finalReview.actions.find(a=>a.id===d.actionId);return a&&actionReady(a)&&actionCurrent(p,a)?'Carry as action':'Action needs review';}return d.treatment;};
export function findingTreatment(p,f){return treatmentFor(p,latestDisposition(p,f));}
// Anti-pattern findings are review warnings, never content errors. When the readiness board only needs blockers,
// avoid computing every anti-pattern and its reasoning graph merely to discard those warnings.
export const reviewBlockers=p=>memoPass(p,()=>{const findings=findingCache.get(p)||inheritedBase(p);return p.finalReview.dispositions.length?findings.filter(f=>f.level==='error'&&['Needs assessment','Fix before review','Action needs review'].includes(findingTreatment(p,f))):findings.filter(f=>f.level==='error');});
// Chapter 11 needs the number of untreated errors. With no dispositions there is nothing to stamp or test against a
// review: count the same chapter and supplemental errors directly. A recorded treatment retains the full finding path.
// This keeps the large readiness board from allocating a stamped copy of every finding just to read its count.
export function reviewBlockerCount(p){
 if(p.finalReview.dispositions.length||memoOff())return reviewBlockers(p).length;
 return memoPass(p,()=>remember(p,'review:blocker-count','',()=>{
  const own=CHAPTERS.reduce((n,c)=>n+c.checks(p).filter(f=>f.level==='error').length,0);
  return own+inheritedSupplement(p).filter(f=>f.level==='error').length;
 }));
}
// A requirement's trail as a trace review reads it (round 12, GR-GOV-05): every record on it, each by its own fingerprint,
// so an edit elsewhere in the design leaves the review current. A review recorded since round 12 (basis 'trail') keeps
// the stamp of each trail it covers (one requirement, or every requirement of a group or a responsibility); one recorded
// before it read the whole design, and is read so.
export function traceStamp(p,id){return remember(p,'review:trace-stamp',id,()=>{const t=reviewTrace(p,id);if(!t)return null;const zones=new Map((p.runtime?.zones||[]).map(z=>[z.id,z]));return reviewFingerprint([t.requirement,...t.context,...t.drivers,...t.decisions,...t.logical,...t.applications,...t.capabilities,...t.realizations,...t.contracts,...t.data,...t.controls,...t.runtime,...t.parties,...t.threats,...t.paths,...t.zoneIds.map(z=>zones.get(z))].map(r=>r?[r.id,recordStamp(p,r)]:null));});}
export const groupTraceStamp=(p,ids)=>reviewFingerprint(ids.map(id=>[id,traceStamp(p,id)]));
const requirementIdSet=p=>remember(p,'review:requirement-ids','',()=>new Set(reviewRequirements(p).map(r=>r.id)));
export const traceReviewCurrent=(p,t,id=t.requirementId)=>{if(!id||!requirementIdSet(p).has(id)||!localReview(p,t))return false;if(t.basis==='trail')return (t.trails?t.trails[id]:t.stamp)===traceStamp(p,id);return t.stamp===reviewSourceStamp(p);};
const traceIndexes=new WeakMap();
function traceIndex(p){const list=p.finalReview?.traces||[],kept=traceIndexes.get(list);if(kept&&kept.n===list.length)return kept.m;const m=new Map();for(const t of list)for(const id of t?.requirementId?[t.requirementId]:Array.isArray(t?.requirementIds)?t.requirementIds:[]){let xs=m.get(id);if(!xs)m.set(id,xs=[]);xs.push(t);}for(const xs of m.values())xs.reverse();traceIndexes.set(list,{n:list.length,m});return m;}
// The latest trace review that covers the requirement and is current, or null.
export function traceReviewFor(p,id){for(const t of traceIndex(p).get(id)||[])if(traceReviewCurrent(p,t,id))return t;return null;}
// The requirements a grouped trace review covers: a requirement group's members, a responsibility's requirements, or
// named requirements, those in scope only.
export function traceScope(p,scope){
 const inScope=requirementIdSet(p);let ids=[],title='';
 if(scope?.kind==='group'){const g=requirementGroups(p).find(x=>x.id===scope.id||x.alias===scope.id);if(!g)throw Error('Choose a requirement group of this project.');ids=groupMembers(p,g.id);title=g.id+' · '+g.title;}
 else if(scope?.kind==='responsibility'){const r=p.logical.responsibilities.find(x=>x.id===scope.id);if(!r)throw Error('Choose a responsibility of this project.');ids=linkedRequirementIds(p,r);title=(r.ref||r.id)+' · '+r.title;}
 else if(scope?.kind==='requirements'){ids=Array.isArray(scope.ids)?scope.ids.map(String):[];title=ids.length+' named requirements';}
 else throw Error('A trace review covers one requirement, a requirement group, a responsibility, or named requirements.');
 ids=unique(ids).filter(id=>inScope.has(id));if(!ids.length)throw Error('Nothing in this scope is a requirement in scope to review.');
 return {ids,title};
}
export const latestDesignReview=p=>[...p.finalReview.reviews].reverse().find(r=>localReview(p,r)&&r.stamp===reviewDesignStamp(p));
export const baseline=(p,id)=>p.finalReview.baselines.find(b=>b.id===id);
// A baseline frozen before the readings upgrade keeps the stamps of the design as it was then (readings-upgrade.js):
// while the design is what the upgrade made it, those are its stamps too (finalReview.readingsUpgrade).
const upgradedDesignStamp=p=>{const legacy=p.finalReview?.readingsUpgrade?.design?.[reviewSourceStamp(p)];return legacy?legacy+':'+p.finalReview.version:null;};
const designStampIs=(p,stamp)=>stamp===reviewDesignStamp(p)||(stamp!=null&&stamp===upgradedDesignStamp(p));
export const baselineCurrent=(p,b)=>!!b&&designStampIs(p,b.stamp)&&b.reviewId===(latestDesignReview(p)?.id||null);
export const latestGovernance=(p,id)=>[...p.finalReview.governance].reverse().find(g=>localReview(p,g)&&g.baselineId===id);
export const currentBaseline=p=>[...p.finalReview.baselines].reverse().find(b=>baselineCurrent(p,b));
export const finalHandoffCurrent=p=>{const h=p.finalReview.handoff,b=h&&baseline(p,h.baselineId),g=b&&latestGovernance(p,b.id);return !!(b&&baselineCurrent(p,b)&&g&&g.id===h.governanceId&&APPROVALS.includes(g.outcome)&&independentApproval(b,g));};
// Output's explanation of the existing command gates. This reader does not grant
// approval; review.handoff independently enforces the same facts on submission.
export function implementationHandoffNeeds(p,b){
 const needs=[],g=b&&latestGovernance(p,b.id);
 if(!b)needs.push('Freeze an architect-reviewed baseline first.');
 else if(!baselineCurrent(p,b)||b.classification!=='Architect reviewed')needs.push('Use a current architect-reviewed baseline.');
 if(!g||!APPROVALS.includes(g.outcome))needs.push('Record approval evidence for that baseline.');
 else if(!independentApproval(b,g))needs.push('A second signed-in person must record the approval evidence.');
 if(p.finalReview.actions.some(a=>!actionReady(a)||!actionCurrent(p,a)))needs.push('Review each delivery action, owner, due date and acceptance criterion against the current design.');
 return needs;
}
// Four eyes on the deliverable (audit C-02): the person who records approval evidence is signed in, and is not
// the person who recorded the architect review the baseline carries (or, for a baseline without that record,
// the person who froze it). Typed reviewer names describe the external review; they never establish it.
const APPROVALS=['Approved','Approved with conditions'];
export const reviewAuthor=b=>b?.review?.outcome?.actor||b?.actor||null;
// An agent or service account is never one of the four eyes (round 12, GR-GOV-12): the server refuses it any review or
// approval, and a record that says it came from one never counts. A record written before round 12 names no account.
const agentRecord=r=>r?.account==='agent';
export const independentApproval=(b,g)=>!!(g?.actor&&reviewAuthor(b)&&g.actor!==reviewAuthor(b)&&!agentRecord(g)&&!agentRecord(b?.review?.outcome||b));
export function finalFindings(p){return memoPass(p,()=>finalFindingsOf(p));}
function finalFindingsOf(p){const fs=[],add=(code,title,detail,level='error',id='project')=>fs.push({id:code+':'+id,objectId:id,code,title,detail,level}),m=p.finalReview,n=m.narrative;
 if(!reviewIntakeCurrent(p))add('intake','Review the inherited project','Review Chapter 10 and the current cross-chapter findings.','warning');
 if(!n.title||!n.owner||!n.audience||!n.summary||!n.scope||!n.approach||!narrativeCurrent(p))add('narrative','Frame the solution design document','Name the document owner and audience, explain the scope and approach, and confirm the wording.');
 // Counted by cause (round 12, D-05): one change to a shared record is one review, with the records it reaches.
 const changed=changeSummary(p);if(changed.open){const causes=changeCauses(p).length;add('change-review','Review '+causes+' change'+(causes===1?'':'s')+' to '+changed.open+' affected record'+(changed.open===1?'':'s'),'Definition edits have unresolved linked reviews. Record the design assessment for each change, once for all the records it reaches, and any owned follow-up.','warning');}
 const blockers=reviewBlockerCount(p);if(blockers)add('source-findings','Assess '+blockers+' source finding'+(blockers===1?'':'s')+' to fix or treat','Repair them in their source chapters or record an explicit treatment with evidence. They remain visible in the SDD.');
 for(const r of reviewRequirements(p))if(!traceReviewFor(p,r.id))add('trace','Review the '+r.id+' architecture trail','Follow all five stages and record the traceability review.','warning',r.id);
 for(const a of m.actions){if(!actionReady(a))add('action-definition','Define '+a.id+' delivery ownership','Record the owner, due date, linked objects, and acceptance evidence.','error',a.id);if(!actionCurrent(p,a))add('action-source','Review changed inputs for '+a.id,'Revisit the action against the current project. Earlier verification stays in history.','error',a.id);if(a.status==='Blocked')add('delivery-blocked',a.id+' is blocked',a.progress||'Record the blocker and next action.','warning',a.id);if(a.status==='Verified'&&!actionComplete(p,a))add('verification',a.id+' verification needs review','The recorded verification no longer matches the action or source definition.','warning',a.id);}
 for(const o of architectureObligationsFor(p))if(o.verificationState!=='current-verified')add('architecture-obligation',o.verificationState==='review-required'?'Review evidence for '+o.id:o.verificationState==='open'?'Assign verification for '+o.id:'Review observed evidence for '+o.id,o.verificationState==='review-required'?o.verificationReasons.join(' '):o.evidence||o.action,'warning',o.id);
 for(const a of m.actions){const comparison=verificationForAction(p,a);if(comparison&&comparison.state!=='pass')add('verification-comparison',a.id+' · '+comparison.label,comparison.reasons.join(' '),comparison.state==='fail'?'error':'warning',a.id);}
 if(!latestDesignReview(p))add('design-review','Record the architecture review','Record the reviewer, evidence reference, rationale, and outcome.','warning');
 if(latestDesignReview(p)?.outcome==='Revision required')add('revision','The architect requested revision',latestDesignReview(p).rationale);
 const b=currentBaseline(p);if(!b)add('baseline','Freeze a reviewable baseline','The working SDD remains exportable. Freeze an immutable snapshot for review and governance.','warning');
 else {const g=latestGovernance(p,b.id);if(!g)add('governance','Record external governance evidence','Approval applies to the specific frozen baseline.','warning');else if(['Rejected','Withdrawn'].includes(g.outcome))add('governance-rejected','Governance is '+g.outcome.toLowerCase(),g.notes);}
 // The plan's own checks (roadmap-domain.js, round 6): a transition or target without an action, a record introduced
 // with no action naming it, a target with no path, an assignment out of order. Each is to confirm; none without plateaus.
 for(const f of roadmapFindings(p))fs.push(f);
 return fs;
}
export function finalMilestones(p){return memoPass(p,()=>finalMilestonesOf(p));}
function finalMilestonesOf(p){const m=p.finalReview,n=m.narrative,b=currentBaseline(p),g=b&&latestGovernance(p,b.id),r=latestDesignReview(p),reqs=reviewRequirements(p);return [
 {id:'intake',name:'Review the complete project',detail:'Current Chapters 1–10',done:reviewIntakeCurrent(p)},
 {id:'narrative',name:'Frame the SDD',detail:'Owner, audience, scope, and approach',done:!!(narrativeCurrent(p)&&n.title&&n.owner&&n.audience&&n.summary&&n.scope&&n.approach)},
 {id:'trace',name:'Review requirement traceability',detail:reqs.length+' requirement trails',done:reqs.length>0&&reqs.every(r=>traceReviewFor(p,r.id))},
 {id:'findings',name:'Assess source findings to fix or treat',detail:reviewBlockerCount(p)+' still need treatment',done:reviewBlockerCount(p)===0&&!finalFindings(p).some(f=>['action-definition','action-source'].includes(f.code))},
 {id:'review',name:'Record the architect’s review',detail:r?.outcome||'Review outcome needed',done:!!r&&r.outcome!=='Revision required'},
 {id:'baseline',name:'Freeze the reviewed baseline',detail:b?.id||'Working SDD',done:b?.classification==='Architect reviewed'},
 {id:'governance',name:'Record governance evidence',detail:g?.outcome||'External approval remains separate',done:!!g&&['Approved','Approved with conditions'].includes(g.outcome)},
 {id:'handoff',name:'Prepare implementation handoff',detail:'Named actions and verification expectations',done:finalHandoffCurrent(p)}];}
function date(raw){const d=text(raw,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)throw Error('Use a valid action due date.');return d;}
function saveAction(p,raw,at){
 const m=p.finalReview,old=raw.id?m.actions.find(a=>a.id===raw.id):null;
 if(raw.id&&!old)throw Error('Choose an existing delivery action.');
 if(!text(raw.title))throw Error('Name the delivery action.');
 const objects=reviewObjects(p);
 if(!Array.isArray(raw.objectIds)||!raw.objectIds.length||raw.objectIds.some(id=>!objects.some(o=>o.id===id)))throw Error('Link existing project objects to this action.');
 if(raw.findingId&&!inheritedFindings(p).some(f=>f.id===raw.findingId))throw Error('Choose a current source finding.');
 const supplied=raw.architectureObligation===undefined?old?.architectureObligation:raw.architectureObligation;
 let obligation=null,basis=null;
 if(old?.architectureObligation&&(!supplied||['projectId','taskId','solutionId','obligationId'].some(key=>supplied[key]!==old.architectureObligation[key])))throw Error('This action already belongs to a different architecture obligation. Create a separate action.');
 if(supplied){
  if(old&&raw.actionStamp!==architectureActionStamp(old))throw Error('The linked action definition changed. Reopen it before saving.');
  basis=architectureObligationBasis(p,supplied);const proposal=architectureObligationAction(p,supplied);
  if(!basis.ready||!proposal)throw Error(basis.reasons.join(' ')||'Choose an accepted obligation in this project.');
  if(supplied.basisStamp!==basis.stamp)throw Error('The architecture obligation changed. Reopen its current definition before saving.');
  if(proposal.objectIds.some(id=>!raw.objectIds.includes(id)))throw Error('The action must include every exact target of this architecture obligation.');
  if(!text(raw.acceptance))throw Error('Define the evidence and acceptance criteria for this obligation.');
  obligation={...basis.reference,basisStamp:basis.stamp};
 }
 const a={id:old?.id||'RA-'+pad(++m.counters.action),revision:(old?.revision||0)+1,title:text(raw.title,180),owner:text(raw.owner,180),due:raw.due?date(raw.due):'',acceptance:text(raw.acceptance),objectIds:unique(raw.objectIds),findingId:raw.findingId||'',plateauId:raw.plateauId===undefined?(old?.plateauId||''):actionPlateau(p,raw.plateauId),sourceStamp:obligation?basis.stamp:reviewSourceStamp(p),...(obligation?{architectureObligation:obligation}:{}),status:old?.status==='Verified'?'Planned':old?.status||'Planned',progress:old?.progress||'',verification:null,history:[...(old?.history||[]),...(old?[{at,revision:old.revision,status:old.status,verification:old.verification,title:old.title,acceptance:old.acceptance,objectIds:old.objectIds,...(old.architectureObligation?{architectureObligation:old.architectureObligation}:{})}]:[])]};
 const contract=normaliseVerificationContract(p,a,raw.verificationContract===undefined?old?.verificationContract:raw.verificationContract);if(contract)a.verificationContract=contract;
 if(old?.verificationContract)a.history.at(-1).verificationContract=structuredClone(old.verificationContract);
 if(old)m.actions[m.actions.indexOf(old)]=a;else m.actions.push(a);return a;
}
export function reviewProposal(p,key,objectId){const o=reviewObjects(p).find(o=>o.id===objectId)||reviewObjects(p)[0];if(!o)return null;const ideas={assurance:['Verify the architecture claim','Record a repeatable check, expected result, observed evidence, limitations, and an accountable reviewer.'],cutover:['Prepare controlled implementation','Define prerequisites, owned stop/go criteria, reconciliation, rollback, and the evidence required before resumption.'],drift:['Check implementation against the baseline','Compare the delivered component, contracts, access, and runtime configuration with the reviewed design; record deviations and their disposition.']};const idea=ideas[key];if(!idea)return null;return {key,objectId:o.id,reason:'Turn the '+o.ref+' design claim into an owned, verifiable delivery obligation.',record:{title:idea[0]+' · '+o.title,owner:'',due:'',acceptance:idea[1],objectIds:[o.id],findingId:''}};}
function chapterStamps(p){return remember(p,'review:chapter-stamps','',()=>computeChapterStamps(p));}
export function computeChapterStamps(p){return Object.fromEntries(CHAPTERS.map(c=>[c.id,reviewFingerprint(c.id===1?{brief:p.brief,artefacts:p.artefacts,relationships:p.relationships,review:p.review,handoff:p.handoff}:p[c.key])]));}
export function baselineChanges(p,b){const now=chapterStamps(p),alias=p.finalReview?.readingsUpgrade?.chapters||{},same=c=>b.chapterStamps[c.id]===now[c.id]||(b.chapterStamps[c.id]!=null&&b.chapterStamps[c.id]===alias[c.id]?.[now[c.id]]);return CHAPTERS.filter(c=>!same(c)).map(c=>c.title).concat(!designStampIs(p,b.stamp)&&CHAPTERS.every(same)?['Review narrative, traceability, findings, or delivery plan']:[]).concat(b.reviewId!==(latestDesignReview(p)?.id||null)?['Architect review outcome']:[]);}
// Four eyes (a project's setting, workspace.governance): a person does not treat a finding of a record they wrote, nor
// review a trail of records they wrote.
const personWriter=r=>r?.provenance?.author?.kind==='person'?r.provenance.author.by:null;
function fourEyesFinding(p,f,actor){if(!fourEyesOn(p)||!actor)return;const r=recordIndex(p).get(f.objectId);if(r&&personWriter(r)===actor)throw Error('Four eyes: '+actor+' wrote '+(r.ref||r.id)+'. Another signed-in person treats its findings.');}
function fourEyesTrail(p,ids,actor){if(!fourEyesOn(p)||!actor)return;for(const id of ids){const t=reviewTrace(p,id);if(!t)continue;const own=[t.requirement,...t.logical,...t.applications].find(r=>personWriter(r)===actor);if(own)throw Error('Four eyes: '+actor+' wrote '+(own.ref||own.id)+', on the trail of '+id+'. Another signed-in person reviews it.');}}
// The cause a finding belongs to: its chapter, its rule and its level (findingGroups groups by these and the treatment).
// A rule that names the record it was raised for in its own code (unbound-SEC-001, impact-ALT-007) is one cause for every
// record it is raised for.
export function findingCause(f){const source=String(f.sourceId||f.id),parts=source.split(':'),chapter=Number(f.chapter)||Number(String(f.id).match(/^C(\d+)/)?.[1])||99,kind=String(parts.length>1?parts[0]:(f.kind||f.title)).replace(/-[A-Z]{2,6}-\d{2,}$/,'');return {key:chapter+'|'+kind+'|'+f.level,chapter,kind,level:f.level,title:f.title};}
// The findings of a cause still to treat (no current treatment), and the stamp of what the reviewer saw.
export function causeFindings(p,key){return memoPass(p,()=>inheritedFindings(p).filter(f=>findingCause(f).key===key&&findingTreatment(p,f)==='Needs assessment'));}
export const causeFindingStamp=(p,findings)=>reviewFingerprint(findings.map(f=>[f.id,f.stamp]));
const CAUSE_TREATMENTS=['Fix before review','Accepted design limitation','Not applicable',SOURCE_SILENT];
// One reviewed treatment for every finding of a cause still to treat (GR-GOV-13): the same gates as one finding's, the
// exceptions named (each with its reason, left open), each finding kept with its own stamp, so a change to one finding's
// inputs reopens it alone.
function treatCause(p,raw,at,actor){
 const m=p.finalReview,all=causeFindings(p,String(raw.cause||''));
 if(!all.length)throw Error('Nothing of this cause is waiting for a treatment.');
 if(raw.stamp!==causeFindingStamp(p,all))throw Error('A finding of this cause changed, or was treated, since you opened it. Reload and review the current findings.');
 if(!CAUSE_TREATMENTS.includes(raw.treatment))throw Error('Choose one treatment for the cause: fix before review, an accepted limitation, not applicable, or raised with the owner of a silent source. Carry each finding as its own action.');
 if(raw.reviewed!==true||!text(raw.rationale)||!text(raw.reviewer))throw Error('Record a treatment, rationale, reviewer, and explicit confirmation.');
 if(['Accepted design limitation','Not applicable',SOURCE_SILENT].includes(raw.treatment)&&!text(raw.reference))throw Error(raw.treatment===SOURCE_SILENT?'Say with whom the question was raised, and where (the owner of the source and the reference of the request).':'Provide the evidence or decision reference for this judgement.');
 const out=new Map((Array.isArray(raw.exceptions)?raw.exceptions:[]).map(x=>[String(x?.findingId??x?.id??x),text(x?.reason,600)]));
 for(const [id,why] of out){if(!all.some(f=>f.id===id))throw Error('An exception names a finding outside this cause: '+id.slice(0,80)+'.');if(!why)throw Error('Give each exception its reason: it stays open.');}
 const members=all.filter(f=>!out.has(f.id));if(!members.length)throw Error('Every finding of the cause is an exception: nothing would be treated.');
 for(const f of members)fourEyesFinding(p,f,actor);
 const c=findingCause(members[0]),id='RF-'+pad(++m.counters.disposition);
 m.dispositions.push({id,at,actor,scope:'cause',cause:{key:c.key,chapter:c.chapter,kind:c.kind,level:c.level,title:c.title,count:all.length},findings:members.map(f=>[f.id,f.stamp]),exceptions:[...out].map(([findingId,reason])=>[findingId,reason]),basis:'finding',treatment:raw.treatment,rationale:text(raw.rationale),reviewer:text(raw.reviewer,180),reference:text(raw.reference),actionId:null});
 return id;
}
// One trace review for every trail of a group, a responsibility or named requirements (GR-GOV-05): each trail kept with
// its own stamp, the exceptions named and left open.
function traceGroup(p,raw,at,actor){
 const m=p.finalReview,{ids,title}=traceScope(p,raw.scope);
 if(raw.stamp!==groupTraceStamp(p,ids))throw Error('A trail in this scope changed since you opened it. Reopen the current trails.');
 if(raw.reviewed!==true||!text(raw.reviewer)||!text(raw.notes))throw Error('Review every trail of the scope and record the reviewer and what you found.');
 const out=new Map((Array.isArray(raw.exceptions)?raw.exceptions:[]).map(x=>[String(x?.requirementId??x?.id??x),text(x?.reason,600)]));
 for(const [id,why] of out){if(!ids.includes(id))throw Error('An exception names a requirement outside this scope: '+id.slice(0,80)+'.');if(!why)throw Error('Give each exception its reason: it stays open.');}
 const members=ids.filter(id=>!out.has(id));if(!members.length)throw Error('Every requirement of the scope is an exception: nothing would be reviewed.');
 fourEyesTrail(p,members,actor);
 const id='TRV-'+pad(++m.counters.trace);
 m.traces.push({id,at,actor,scope:{kind:raw.scope.kind,id:raw.scope.kind==='requirements'?null:String(raw.scope.id),title},requirementIds:members,trails:Object.fromEntries(members.map(r=>[r,traceStamp(p,r)])),basis:'trail',reviewer:text(raw.reviewer,180),notes:text(raw.notes),...(out.size?{exceptions:[...out].map(([requirementId,reason])=>[requirementId,reason])}:{})});
 return id;
}
// author: the commit's author (worker.js), whose account kind the approval and review records keep.
export function applyFinalReviewCommand(input,command,at=new Date().toISOString(),actor=null,{author=null}={}){const p=withFinalReview(input),m=p.finalReview,raw=command.payload||{};let changed=true,selected=null;const account=author?.account==='agent'?{account:'agent'}:{};
 switch(command.type){
 case 'review.intake':m.intake={at,actor,stamp:reviewSourceStamp(p),runtimeHandoffCurrent:runtimeHandoffCurrent(p)};break;
 case 'review.narrative':for(const key of ['title','owner','audience','summary','scope','approach'])m.narrative[key]=text(raw[key],key==='title'||key==='owner'?180:6000);m.narrative.confirmed=raw.confirmed===true;m.narrative.sourceStamp=reviewSourceStamp(p);break;
 case 'review.action':selected=saveAction(p,raw,at).id;break;
 case 'review.proposal':{if(raw.reviewed!==true)throw Error('Review the proposed delivery action before acceptance.');const q=reviewProposal(p,raw.key,raw.objectId);if(!q)throw Error('This proposal is no longer available.');selected=saveAction(p,{...raw.record,id:null},at).id;break;}
 case 'review.delivery':{
  changed=false;const a=m.actions.find(a=>a.id===raw.id);
  if(!a||!DELIVERY_STATES.includes(raw.status))throw Error('Choose an action and delivery status.');
  if(!text(raw.progress))throw Error('Record progress, a blocker, or observed evidence.');
  let extra={};
  if(a.architectureObligation){
   const basis=architectureObligationBasis(p,a.architectureObligation),ref=raw.architectureObligation;
   if(!ref||['projectId','taskId','solutionId','obligationId'].some(key=>ref[key]!==a.architectureObligation[key]))throw Error('This evidence update must name the action’s exact architecture obligation in this project.');
   if(raw.actionStamp!==architectureActionStamp(a))throw Error('The action definition changed. Reopen the current evidence form.');
   if(raw.status==='Verified'){
    if(!basis.ready||ref.basisStamp!==basis.stamp||a.architectureObligation.basisStamp!==basis.stamp)throw Error('The obligation basis changed. Review its linked action before verifying new evidence.');
    if(raw.evidenceSources!==undefined&&(!Array.isArray(raw.evidenceSources)||raw.evidenceSources.length>20))throw Error('Choose up to twenty exact verification evidence sources.');
    extra={architectureObligation:{...basis.reference,basisStamp:basis.stamp},actionStamp:architectureActionStamp(a),evidenceSources:architectureEvidenceSources(p,raw.evidenceSources),reviewed:true};
    if(a.verificationContract){
     const comparison=verificationForAction(p,a),observations=verificationEvidence(p,a);
     if(comparison.state!=='pass')throw Error(comparison.label+'. Resolve the current check and observed evidence before recording verification.');
     if(digest(raw.verificationEvidence)!==digest(observations))throw Error('The observed evidence changed. Reopen and review the exact current observations.');
     if(comparison.records.filter(r=>r.state==='pass').some(r=>!extra.evidenceSources.some(s=>s.sourceId===r.sourceId)))throw Error('Select the original confirmed source of every current comparison you reviewed.');
     extra.verificationEvidence=observations;
    }
   }
  }
  if(raw.status==='Verified'&&(!actionCurrent(p,a)||!actionReady(a)||raw.reviewed!==true||!text(raw.reviewer)||!text(raw.reference)))throw Error('Verification needs a current action, reviewer, evidence reference, and explicit confirmation.');
  a.history.push({at,status:a.status,progress:a.progress,verification:a.verification});a.status=raw.status;a.progress=text(raw.progress);
  a.verification=raw.status==='Verified'?{at,actor,reviewer:text(raw.reviewer,180),reference:text(raw.reference),stamp:reviewFingerprint(actionDefinition(a)),...extra}:null;
  m.deliveryVersion++;selected=a.id;break;
 }
 // A treatment is stamped with its finding's own inputs (round 12, GR-GOV-05: basis 'finding'); one treatment may cover a
 // whole cause (scope 'cause', GR-GOV-13); a finding the source cannot answer may be raised with its owner (GR-SRC-07).
 case 'review.disposition':{if(raw.scope==='cause'){selected=treatCause(p,raw,at,actor);break;}const f=inheritedFindings(p).find(f=>f.id===raw.findingId);if(!f||raw.stamp!==f.stamp)throw Error('The source finding changed. Review its current definition.');if(!DISPOSITIONS.includes(raw.treatment)||!text(raw.rationale)||!text(raw.reviewer)||raw.reviewed!==true)throw Error('Record a treatment, rationale, reviewer, and explicit confirmation.');if(raw.treatment==='Carry as action'){const a=m.actions.find(a=>a.id===raw.actionId);if(!a||!actionReady(a)||!actionCurrent(p,a)||a.findingId!==f.id)throw Error('Link a current, fully defined action for this specific finding.');}if(['Accepted design limitation','Not applicable'].includes(raw.treatment)&&!text(raw.reference))throw Error('Provide the evidence or decision reference for this judgement.');if(raw.treatment===SOURCE_SILENT&&!text(raw.reference))throw Error('Say with whom the question was raised, and where (the owner of the source and the reference of the request).');fourEyesFinding(p,f,actor);m.dispositions.push({id:'RF-'+pad(++m.counters.disposition),at,actor,findingId:f.id,stamp:f.stamp,basis:'finding',treatment:raw.treatment,rationale:text(raw.rationale),reviewer:text(raw.reviewer,180),reference:text(raw.reference),actionId:raw.treatment==='Carry as action'?raw.actionId:null});break;}
 // A trace review keeps the stamp of the trail it covers (round 12, GR-GOV-05); a stamp of the whole design as it is now
 // covers the trail too. One review may cover every requirement of a group or a responsibility (scope).
 case 'review.trace':{if(raw.scope&&typeof raw.scope==='object'){selected=traceGroup(p,raw,at,actor);break;}if(!reviewTrace(p,raw.requirementId)||raw.stamp!==traceStamp(p,raw.requirementId)&&raw.stamp!==reviewSourceStamp(p))throw Error('The requirement trail changed. Reopen the current trail.');if(!Array.isArray(raw.visited)||![0,1,2,3,4].every(i=>raw.visited.includes(i))||raw.reviewed!==true||!text(raw.reviewer)||!text(raw.notes))throw Error('Explore all five stages and record the reviewer and observations.');fourEyesTrail(p,[raw.requirementId],actor);m.traces.push({id:'TRV-'+pad(++m.counters.trace),at,actor,requirementId:raw.requirementId,stamp:traceStamp(p,raw.requirementId),basis:'trail',reviewer:text(raw.reviewer,180),notes:text(raw.notes)});break;}
 case 'review.objective':{const v=Number(raw.value);if(!['users','rate'].includes(raw.kind)||!Number.isFinite(v)||v<=0)throw Error('Give the objective as a positive number of concurrent users or requests a second.');if(raw.reviewed!==true||!text(raw.reviewer))throw Error('Name who sets the objective and confirm it.');const assumptions={};for(const a of CAPACITY_ASSUMPTIONS){const x=raw.assumptions?.[a.key];if(x==null||x==='')continue;if(a.options){if(a.options.some(([o])=>o===x))assumptions[a.key]=x;continue;}const n=Number(x),min=a.key==='utilisation'?1:a.unit==='%'?0:1e-6;if(Number.isFinite(n)&&n>=min&&(a.unit!=='%'||n<=100))assumptions[a.key]=n;}const perReplica={};for(const [k,x] of Object.entries(raw.perReplica||{})){const n=Number(x);if(Number.isFinite(n)&&n>0)perReplica[text(k,80)]=n;}m.capacity={kind:raw.kind,value:v,assumptions,perReplica,surge:raw.surge!==false,reviewer:text(raw.reviewer,180),actor,rationale:text(raw.rationale,2000),at};break;}
 case 'review.objective-clear':if(!m.capacity)throw Error('No review objective is saved.');m.capacity=null;break;
 // One reviewed judgement for a whole group of records (round 12, GR-GOV-04): the review plan's step, its scope stated,
 // each record kept with its fingerprint (provenance.js recordJudgement).
 case 'review.judgement':selected=recordJudgement(p,raw,at,actor,{fourEyes:fourEyesOn(p)});break;
 case 'review.checks':changed=false;m.checks={at,actor,stamp:reviewDesignStamp(p),sourceFindings:inheritedFindings(p).length,blockers:reviewBlockers(p).length};m.handoff=null;break;
 case 'review.record':{changed=false;if(!finalChecksCurrent(p)||raw.stamp!==reviewDesignStamp(p))throw Error('Run current review checks before recording the outcome.');if(!REVIEW_OUTCOMES.includes(raw.outcome)||raw.reviewed!==true||!text(raw.reviewer)||!text(raw.reference)||!text(raw.rationale))throw Error('Record the reviewer, evidence reference, rationale, outcome, and explicit confirmation.');if(raw.outcome==='Ready for governance'&&changeSummary(p).open)throw Error('Resolve the open architecture-change reviews, or record Ready with actions / limitations.');if(raw.outcome!=='Revision required'){if(!finalMilestones(p).slice(0,4).every(m=>m.done))throw Error('Complete context, SDD framing, traceability, and finding treatment before a positive review.');const limitations=inheritedFindings(p).some(f=>f.level==='error'&&findingTreatment(p,f)!=='Not applicable');if(limitations&&raw.outcome==='Ready for governance')throw Error('Use Ready with actions / limitations while source errors remain.');}m.reviews.push({id:'FR-'+pad(++m.counters.review),at,stamp:reviewDesignStamp(p),outcome:raw.outcome,reviewer:text(raw.reviewer,180),actor,...account,reference:text(raw.reference),rationale:text(raw.rationale)});m.handoff=null;break;}
 case 'review.baseline':{changed=false;const steps=freezeSteps(p,raw,at,actor);let step=steps.next();while(!step.done)step=steps.next();selected=recordBaseline(p,step.value).id;break;}
 case 'review.governance':{changed=false;const b=baseline(p,raw.baselineId);if(!b||!GOVERNANCE_OUTCOMES.includes(raw.outcome))throw Error('Choose a frozen baseline and governance outcome.');if(raw.reviewed!==true||!text(raw.reviewer)||!text(raw.reference)||!text(raw.notes))throw Error('Record the external reviewer, evidence reference, scope, and explicit confirmation.');if(['Approved','Approved with conditions'].includes(raw.outcome)&&b.classification!=='Architect reviewed')throw Error('A working draft needs an architect-reviewed baseline before approval evidence can be recorded.');if(raw.outcome==='Approved with conditions'&&!text(raw.conditions))throw Error('Record the approval conditions and how they will be discharged.');if(APPROVALS.includes(raw.outcome)){const author=reviewAuthor(b);if(!actor)throw Error('Sign in to record approval evidence.');if(!author)throw Error('This baseline’s architect review has no signed-in author. Record the architect review again, freeze a new baseline, and ask a second person to record its approval.');if(author===actor)throw Error('A second signed-in person records approval evidence: '+author+' recorded the architect review of this baseline.');}m.governance.push({id:'GV-'+pad(++m.counters.governance),at,actor,...account,reviewAuthor:reviewAuthor(b),baselineId:b.id,outcome:raw.outcome,reviewer:text(raw.reviewer,180),reference:text(raw.reference),notes:text(raw.notes),conditions:text(raw.conditions)});m.handoff=null;break;}
 case 'review.handoff':{changed=false;const b=baseline(p,raw.baselineId),g=b&&latestGovernance(p,b.id);if(!baselineCurrent(p,b)||b.classification!=='Architect reviewed'||!g||!['Approved','Approved with conditions'].includes(g.outcome))throw Error('Use a current architect-reviewed baseline with recorded approval evidence.');if(!independentApproval(b,g))throw Error('The approval evidence for this baseline was not recorded by a second signed-in person. Ask another member of the project team to record it.');if(m.actions.some(a=>!actionReady(a)||!actionCurrent(p,a)))throw Error('Review each delivery action, owner, due date, and acceptance criterion.');if(raw.acknowledge!==true)throw Error('Acknowledge the remaining actions, approval conditions, and verification obligations.');m.handoff={at,baselineId:b.id,governanceId:g.id,actionIds:m.actions.map(a=>a.id),openActionIds:m.actions.filter(a=>!actionComplete(p,a)).map(a=>a.id)};break;}
 // The roadmap's commands (round 6, Contract S) are review commands: the plateaus, the assignments of Chapters 4–10's
 // records to them and the plateau an action names change here, with a history entry each, and like every other
 // change above they bump the review's version so its checks are run again against the plan as it now stands.
 case 'review.plateau':case 'review.plateau-remove':case 'review.plateau-assign':case 'review.plateau-group':case 'review.migration':case 'review.migration-remove':selected=applyRoadmapCommand(p,command,at,{objects:reviewObjects(p).filter(o=>o.chapter>=4&&o.chapter<=10),actions:m.actions,actor}).selected;break;
 default:throw Error('Unknown Review & realize action.');
 }if(changed){m.version++;m.checks=null;m.handoff=null;}return {document:p,selected};
}

function designJourneySummary(p){const tasks=designTasks(p).filter(t=>t.kind==='architecture'&&t.status==='applied');if(!tasks.length)return '';
 return '## Working design choices\n\n'+tasks.map(t=>{const req=p.artefacts.find(r=>r.id===t.requirementId),driver=p.quality.drivers.find(d=>d.id===t.driverId),graph=t.applied?.reasoningGraph,option=graph?.assessment?.option,records=(t.applied?.records||[]).filter(r=>['processor','store','relay','queue','consumer'].includes(r.slot));
  return '### '+t.id+' · '+(req?.externalId||t.requirementId)+' · '+(req?.title||t.title)+'\n\nWorking choice: '+(option?.title||'See linked decision')+' · '+(option?.pattern||t.topic)+'; decision '+(t.applied?.decisionId||'not linked')+'.\n\nSource: '+(req?.source||'Location not recorded')+' · '+(req?.confirmed?'confirmed':'unconfirmed')+'. Quality scenario: '+(driver?.id||t.driverId)+' · '+(driver?.targetConfirmed?'target confirmed':'target unconfirmed')+'.\n\nRationale: '+(t.applied?.reason||t.answers?.reason||'Not recorded')+'\n\nModel roles: '+(records.map(r=>r.ref+' · '+r.title).join('; ')||'No accepted roles recorded')+'\n\nVerification still needed: '+(graph?.assessment?.effects||[]).map(e=>e.quality+' — '+e.verify).join('; ')+'\n\nA working choice records review of a proposal. It does not establish customer receipt, measured quality, or governance approval.\n\n';}).join('');
}
const FRAMING_HINT='Chapter 11 → Work → Edit document framing';
// A record's display reference by its internal id (round 12, GR-SDD-20): the code a reader knows (LR-001, APP-001,
// TC-001), for the text of the SDD and its registers; an id no record carries is printed as it is.
export function recordRefs(p){return remember(p,'review:record-refs','',()=>{const m=new Map(),add=xs=>{for(const r of xs||[])if(r&&typeof r.id==='string'&&!m.has(r.id))m.set(r.id,r.ref||r.code||r.id);};for(const xs of [p.artefacts,p.requirementGroups?.records,p.quality?.drivers,p.decisions?.records,p.logical?.responsibilities,p.realisation?.components,p.technology?.capabilities,p.technology?.needs,p.technology?.boundaries,p.logical?.groups,p.technologyRealisation?.records,p.interfaces?.contracts,p.interfaces?.data,p.interfaces?.parties,p.security?.threats,p.security?.controls,p.runtime?.environments,p.runtime?.zones,p.runtime?.plans,p.runtime?.paths])add(xs);return m;});}
export const recordRef=(p,id)=>recordRefs(p).get(id)||id;
// Rule-based findings repeat the same rule for many objects. Group findings that share a
// chapter, rule, severity and treatment; keep every finding ID for traceability. Findings
// with a recorded review treatment stay individual because they carry their own evidence.
export function findingGroups(p){
 const groups=new Map(),order=f=>Number(f.chapter)||Number(String(f.id).match(/^C(\d+)/)?.[1])||99;
 for(const f of inheritedFindings(p)){
  const d=latestDisposition(p,f),treatment=treatmentFor(p,d),chapter=order(f),source=String(f.sourceId||f.id),parts=source.split(':'),kind=parts.length>1?parts[0]:(f.kind||f.title),subject=parts.length>1?parts.slice(1).join(':'):'';
  const key=d?'disposition|'+(d.scope==='cause'?d.id:f.id):[chapter,kind,f.level,treatment].join('|');
  if(!groups.has(key))groups.set(key,{chapter,chapterTitle:f.chapterTitle||(CHAPTERS.find(c=>c.id===chapter)?.title)||'Cross-chapter',kind,level:f.level,treatment,disposition:d||null,items:[],subjects:[]});
  const g=groups.get(key);g.items.push(f);if(subject)g.subjects.push(subject);
 }
 return [...groups.values()].sort((a,b)=>a.chapter-b.chapter||(a.level==='error'?0:1)-(b.level==='error'?0:1)||b.items.length-a.items.length);
}
function findingLine(p,f,d){return '- '+f.id+' · '+f.level+' · '+f.title+': '+f.detail+'\n  Treatment: '+findingTreatment(p,f)+(d?' · '+d.id+' · '+d.rationale+' · Reviewer: '+d.reviewer+(d.actor?' (signed in as '+d.actor+')':'')+' · '+(d.treatment===SOURCE_SILENT?'Raised with: ':'Evidence: ')+(d.reference||'See linked action')+(d.actionId?' · '+d.actionId:''):'');}
// The findings raised with the owner of a silent source (GR-SRC-07): open, and raised, not unfinished work: who raised
// each, when, and with whom.
export function raisedFindings(p){return memoPass(p,()=>inheritedFindings(p).map(f=>({finding:f,disposition:latestDisposition(p,f)})).filter(x=>x.disposition?.treatment===SOURCE_SILENT));}
function raisedMarkdown(p){const xs=raisedFindings(p);if(!xs.length)return '';const shown=xs.slice(0,12);return '### Raised with their owners\n\n'+xs.length+' finding'+(xs.length===1?' asks':'s ask')+' what the source does not say. '+(xs.length===1?'It was':'They were')+' raised with the owner of the source: open until the owner answers, and not unfinished work of the design.\n\n'+shown.map(({finding:f,disposition:d})=>'- '+f.id+' · '+f.title+' — raised by '+(d.actor||d.reviewer||'a reviewer')+' on '+String(d.at||'').slice(0,10)+' with '+d.reference).join('\n')+(xs.length>shown.length?'\n- and '+(xs.length-shown.length)+' more, each in the findings below':'')+'\n\n';}
const DETAILS_SHOWN=12;
function groupedFindingsMarkdown(p){
 const all=inheritedFindings(p),groups=findingGroups(p),errors=all.filter(f=>f.level==='error').length;
 if(!all.length)return 'No rule-based findings are open for the current design.\n\n';
 let out=all.length+' rule-based findings in '+groups.length+' groups: '+errors+' content gaps and '+(all.length-errors)+' review items. Findings that share a rule and treatment are grouped; every finding ID is listed for traceability. Findings with a recorded treatment are listed individually.\n\n';
 let chapter=null;
 for(const g of groups){
  if(g.chapter!==chapter){chapter=g.chapter;const n=groups.filter(x=>x.chapter===chapter).reduce((t,x)=>t+x.items.length,0);out=out.replace(/\n*$/,'\n\n');out+='### Chapter '+chapter+' · '+g.chapterTitle+' — '+n+' finding'+(n===1?'':'s')+'\n\n';}
  const f=g.items[0];
  if(g.items.length===1){out+=findingLine(p,f,g.disposition)+'\n';continue;}
  // Round 12 (GR-SDD-17): a cause every record shares prints once with its count; where the records' details differ,
  // each record's own detail prints, the first DETAILS_SHOWN, then how many more.
  const sameDetail=g.items.every(x=>x.detail===f.detail),who=x=>{const s=String(x.sourceId||x.id).split(':');return recordRef(p,s.length>1?s.slice(1).join(':'):x.objectId||x.id);};
  out+='- '+g.level+' · '+f.title+' — '+g.items.length+' records'+(sameDetail?', one cause: '+f.detail:', each with its own detail:')+(sameDetail?'':g.items.slice(0,DETAILS_SHOWN).map(x=>'\n  '+who(x)+': '+x.detail).join('')+(g.items.length>DETAILS_SHOWN?'\n  And '+(g.items.length-DETAILS_SHOWN)+' more records, each in its chapter’s Validate.':''))+'\n  Treatment: '+g.treatment+(g.disposition?' · '+g.disposition.id+' (one treatment for the cause) · '+g.disposition.rationale+' · Reviewer: '+g.disposition.reviewer+(g.disposition.actor?' (signed in as '+g.disposition.actor+')':'')+' · '+(g.disposition.treatment===SOURCE_SILENT?'Raised with: ':'Evidence: ')+(g.disposition.reference||'—'):'')+(g.subjects.length?'\n  Applies to '+g.items.length+': '+g.subjects.map(x=>recordRef(p,x)).join(', '):'')+'\n  Finding IDs: '+g.items.map(x=>x.id).join(', ')+'\n';
 }
 return (out+raisedMarkdown(p)).replace(/\n*$/,'\n\n');
}
// What is left, counted once (round 12, GR-SDD-18): the readiness board's count (readiness-model.js sddOpenCounts), which
// registers itself here when it is loaded, as the SDD builder does; the Output tab, the SDD's At a glance, its risks and
// its Appendix B read it. A suite that loads this module alone has no board, and At a glance says where the count is.
let openCounter=null;
export function registerOpenCounts(counter){openCounter=typeof counter==='function'?counter:null;}
export const openCounts=p=>openCounter?openCounter(p):null;
// Coverage from curated links (round 12, GR-SDD-16): a requirement is traced to a layer when a record of that layer names
// it or its requirement group, or, for application components, when the component realises a responsibility that does
// (its realising component). The trails derived from that component (the products of its needs, the plans that run it)
// are counted apart as inherited, never as traced.
export function traceCoverage(p){return remember(p,'review:coverage','',()=>memoPass(p,()=>{
 const reqs=reviewRequirements(p),ids=new Set(reqs.map(r=>r.id)),named=xs=>{const s=new Set();for(const r of xs||[])for(const id of linkedRequirementIds(p,r))if(ids.has(id))s.add(id);return s;};
 const byResp=new Map();for(const r of p.logical.responsibilities)for(const id of linkedRequirementIds(p,r))if(ids.has(id)){let xs=byResp.get(r.id);if(!xs)byResp.set(r.id,xs=[]);xs.push(id);}
 const compsOf=new Map(),add=(req,c)=>{let xs=compsOf.get(req);if(!xs)compsOf.set(req,xs=new Set());xs.add(c);};
 for(const m of p.logical.mappings)for(const id of byResp.get(m.logicalId)||[])add(id,m.physicalId);
 for(const c of p.realisation.components)for(const id of linkedRequirementIds(p,c))if(ids.has(id))add(id,c.id);
 const needs=new Map();for(const n of p.technology.needs){let xs=needs.get(n.applicationId);if(!xs)needs.set(n.applicationId,xs=[]);xs.push(n.id);}
 const capOf=new Map(p.technology.mappings.map(m=>[m.needId,m.capabilityId])),realsOf=new Map();for(const m of p.technologyRealisation.mappings){let xs=realsOf.get(m.capabilityId);if(!xs)realsOf.set(m.capabilityId,xs=[]);xs.push(m.realizationId);}
 const planned=new Set(p.runtime.plans.map(r=>r.assetId)),compReals=c=>(needs.get(c)||[]).flatMap(n=>realsOf.get(capOf.get(n))||[]);
 const direct={logical:named(p.logical.responsibilities),applications:new Set(compsOf.keys()),realizations:named([...p.technologyRealisation.records,...p.technology.capabilities]),runtime:named([...p.runtime.plans,...(p.runtime.paths||[])])};
 const inherited={logical:new Set(),applications:new Set(),realizations:new Set(),runtime:new Set()};
 for(const [req,cs] of compsOf)for(const c of cs){const rs=compReals(c);if(rs.length&&!direct.realizations.has(req))inherited.realizations.add(req);if((planned.has(c)||rs.some(r=>planned.has(r)))&&!direct.runtime.has(req))inherited.runtime.add(req);}
 return {requirements:reqs.length,layers:[['logical','responsibilities'],['applications','application components'],['realizations','technology realization'],['runtime','runtime placement']].map(([key,label])=>({key,label,direct:direct[key].size,inherited:inherited[key].size}))};
}));}
export function atGlanceMarkdown(p){
 const reqs=reviewRequirements(p),cover=traceCoverage(p),sums=chapterSummaries(p),done=sums.reduce((t,c)=>t+c.done,0),total=sums.reduce((t,c)=>t+c.total,0),C=openCounts(p),m=p.finalReview,n=m.narrative||{},gaps=findingGroups(p).filter(g=>g.level==='error'&&!g.disposition).sort((a,b)=>b.items.length-a.items.length).slice(0,5),warnings=C?C.toConfirm:0;
 const row=(a,b)=>'| '+a+' | '+String(b).replace(/\|/g,'/')+' |';
 const missing=['summary','scope','approach'].filter(k=>!n[k]);
 const next=missing.length?'Write the '+missing.map(k=>({summary:'executive summary',scope:'scope and exclusions',approach:'architecture approach'}[k])).join(', ')+' ('+FRAMING_HINT+').':gaps.length?'Resolve the largest content gap: Chapter '+gaps[0].chapter+' · '+gaps[0].items[0].title+'.':warnings?'Review the remaining review items, then freeze a baseline for governance review.':'Freeze a baseline for governance review.';
 return '## At a glance\n\n'+[
  '| Measure | Current state |','| --- | --- |',
  row('Requirements',reqs.length+' recorded · '+reqs.filter(r=>r.confirmed).length+' confirmed'),
  ...cover.layers.map(l=>row('Traced to '+l.label,l.direct+' of '+reqs.length+(l.key==='realizations'||l.key==='runtime'?' through a record that names them · '+l.inherited+' more inherited through their components':''))),
  row('Chapter milestones',done+' of '+total+' met'),
  row('Content gaps',C?C.toFix+' findings to fix across '+C.chapters.filter(c=>c.toFix).length+' chapters':'counted on the Output tab'),
  row('Review items',C?C.toConfirm+' items to confirm':'counted on the Output tab'),
  row('Delivery obligations',(m.actions||[]).length+' recorded'),
  row('Frozen baselines',(m.baselines||[]).length+' captured')
 ].join('\n')+'\n\n'+(gaps.length?'Largest content gaps:\n\n'+gaps.map(g=>'- Chapter '+g.chapter+' · '+g.items[0].title+(g.items.length>1?' (and '+(g.items.length-1)+' similar)':'')+' — '+g.items.length+' record'+(g.items.length===1?'':'s')).join('\n')+'\n\n':'')+'Next useful step: '+next+'\n\n';
}
// The document a freeze keeps (Contract E): the full edition for everyone, with its figures, open-items appendix,
// provenance notes and change section. That builder (sdd-document.js) draws the figures with the notation modules,
// which the browser's Projects page must not carry, so it registers itself here when it is loaded: the server loads it
// with the export route, and only the server freezes a baseline. Without it, a freeze keeps the registers as assembled.
let documentBuilder=null;
export function registerSDDBuilder(build){documentBuilder=typeof build==='function'?build:null;}
// The SDD's change section (round 12, D-05: change-summary.js, which registers it when loaded, for the same reason: the
// SDD builder loads it, the Projects page does not).
let changeSection=null;
export function registerChangeSection(section){changeSection=typeof section==='function'?section:null;}
const frozenSDD=(p,meta)=>documentBuilder?documentBuilder(p,meta):assembleSDD(p,meta);
// The freeze of a baseline (Contract E; round 12, GR-STO-02): the design as reviewed, captured whole — its source, the
// review state with the change journal of that moment, the inherited findings and chapter summaries, the connected model
// and the frozen SDD (the full edition for everyone, with its figures, built by the registered SDD builder above).
// freezeSteps builds it a part at a time, reading the document and never changing it, and yields the name of each part
// once it is built (FREEZE_STEPS), so the freeze job (baseline-service.js) reports its progress between parts and runs
// off the request path; recordBaseline then adds the baseline to the review, once the design is still the one frozen.
// The review command review.baseline does both in turn: one freeze, whichever path runs it.
export const FREEZE_STEPS=[['source','The design source'],['review','The review state and change journal'],['findings','The inherited findings and chapter summaries'],['model','The connected model'],['document','The frozen SDD']];
const nextBaselineId=m=>'BL-'+pad(m.counters.baseline+1);
export function* freezeSteps(p,raw,at,actor){
 const m=p.finalReview;
 if(!finalChecksCurrent(p)||raw.stamp!==reviewDesignStamp(p))throw Error('Run current checks before freezing this baseline.');
 if(!text(raw.title)||raw.reviewed!==true)throw Error('Name the baseline and acknowledge its open findings.');
 const r=latestDesignReview(p),classification=r&&r.outcome!=='Revision required'?'Architect reviewed':'Working draft';
 const b={id:nextBaselineId(m),at,actor,title:text(raw.title,180),classification,stamp:reviewDesignStamp(p),reviewId:r?.id||null,parentId:m.baselines.at(-1)?.id||null,chapterStamps:chapterStamps(p)};
 b.source=structuredClone(reviewSource(p));yield 'source';
 b.review={changes:structuredClone(p.changes),narrative:structuredClone(m.narrative),actions:structuredClone(m.actions),dispositions:structuredClone(m.dispositions),traces:structuredClone(m.traces),roadmap:structuredClone(p.roadmap),outcome:r?structuredClone(r):null};yield 'review';
 b.findings=inheritedFindings(p);b.summary=chapterSummaries(p);yield 'findings';
 b.model=structuredClone(logicalGraph(p));yield 'model';
 b.markdown=frozenSDD(p,{id:b.id,title:b.title,at,classification});yield 'document';
 return b;
}
// A frozen baseline taken into the review: only while the design is the one it froze, under the next baseline id.
export function recordBaseline(p,b){
 const m=p.finalReview;
 if(!finalChecksCurrent(p)||b?.stamp!==reviewDesignStamp(p))throw Error('The design changed while the baseline was frozen. Run current checks and freeze it again.');
 if(b.id!==nextBaselineId(m)||b.parentId!==(m.baselines.at(-1)?.id||null))throw Error('Another baseline was frozen meanwhile. Freeze this one again.');
 m.counters.baseline++;m.baselines.push(b);m.handoff=null;return b;
}
// The SDD is assembled in one pass over the document (document-memo.js; round 5, R5-G): the checks, the trails and the
// capacity plan its sections read more than once are worked out once. Nothing here changes the document.
export function assembleSDD(p,meta={}){return memoPass(p,()=>assembleSDDOf(p,meta));}
function assembleSDDOf(p,meta){const m=p.finalReview,n=m.narrative,label=items=>items.map(x=>x.ref||x.id).join(', ')||'Not linked';return '# '+sddTitle(p)+'\n\n'+(meta.id||'Working SDD')+' · '+(meta.classification||'Working draft')+(meta.at?' · '+meta.at:'')+'\n\nPrivate architecture record. Reference content and unconfirmed assumptions retain their source status. This document does not establish live implementation, external approval, or production readiness.\n\n## Document ownership\n\nOwner: '+(n.owner||'Unassigned — name an owner in '+FRAMING_HINT)+'\n\nAudience: '+(n.audience||'Unspecified — say who this document is for in '+FRAMING_HINT)+'\n\nNarrative: '+(narrativeCurrent(p)?'User reviewed for current source':'Working / unconfirmed or source changed')+'\n\n'+atGlanceMarkdown(p)+'## Executive summary\n\n'+(n.summary||'Not written yet. Add a short executive summary ('+FRAMING_HINT+'): the problem, the chosen approach and what remains open.')+'\n\n## Scope and exclusions\n\n'+(n.scope||'Not written yet. State what this design covers and what it excludes ('+FRAMING_HINT+').')+'\n\n## Architecture approach\n\n'+(n.approach||'Not written yet. Summarise the architectural approach and the decisions that shape it ('+FRAMING_HINT+').')+'\n\n'+designJourneySummary(p)+processMarkdown(p)+'## Cross-chapter readiness\n\n'+chapterSummaries(p).map(c=>'- Chapter '+c.id+' · '+c.title+': '+c.done+'/'+c.total+' modelling milestones; '+c.errors+' content gaps; '+c.warnings+' review items.').join('\n')+'\n\n## Requirement traceability register\n\n'+reviewRequirements(p).map(r=>{const t=reviewTrace(p,r.id);return '### '+r.id+' · '+r.title+'\n\nExternal source: '+(r.externalId||'No external ID')+' · '+(r.source||'Location not recorded')+'\n\nStatus: '+r.origin+' · '+(r.confirmed?'Confirmed':'Unconfirmed')+'\n\nAcceptance: '+(r.acceptance||'Missing')+'\n\nQuality: '+label(t.drivers)+'\n\nDecisions: '+label(t.decisions)+'\n\nLogical: '+label(t.logical)+'\n\nApplication: '+label(t.applications)+'\n\nTechnology: '+label(t.capabilities)+' → '+label(t.realizations)+'\n\nInterfaces: '+label(t.contracts)+'\n\nData: '+label(t.data)+'\n\nControls: '+label(t.controls)+'\n\nRuntime: '+label(t.runtime)+'\n\n';}).join('')+'## Architect review\n\n'+(latestDesignReview(p)?Object.entries(latestDesignReview(p)).filter(([k])=>k!=='stamp').map(([k,v])=>k+': '+v).join('\n\n'):'No current architect review recorded.')+'\n\n'+assuranceMarkdown(p)+guideMarkdown(p)+workbenchMarkdown(p)+evidenceMarkdown(p)+knowledgeMarkdown(p)+narrativeMarkdown(p)+designTaskMarkdown(p)+alternativesMarkdown(p)+(changeSection?changeSection(p):'')+requirementsSpecMarkdown(p)+performanceMarkdown(p)+componentSpecsMarkdown(p)+reasoningRecordMarkdown(p)+'## Delivery and verification obligations\n\n'+(m.actions.map(a=>'### '+a.id+' · '+a.title+'\n\nOwner: '+(a.owner||'Unassigned')+' · Due: '+(a.due||'Unset')+'\n\nObjects: '+a.objectIds.join(', ')+'\n\nSource finding: '+(a.findingId||'Independent delivery obligation')+'\n\nAcceptance: '+a.acceptance+'\n\nStatus at capture: '+a.status+(actionComplete(p,a)?' · Current verification recorded':' · Verification remains separate')+(a.architectureObligation?'\n\nArchitecture obligation: '+a.architectureObligation.obligationId+' · '+a.architectureObligation.solutionId+' · '+a.architectureObligation.taskId:'')+(a.verification?'\n\nRecorded evidence: '+a.verification.reference+' · '+a.verification.reviewer+' · '+a.verification.at:'')+'\n\nProgress: '+a.progress+'\n\n').join('')||'No delivery actions recorded.\n\n')+transitionSection(p,'full')+'## Source findings and review treatments\n\n'+groupedFindingsMarkdown(p)+architectureRegister(logicalGraph(p))+'## Detailed chapter registers\n\n'+CHAPTERS.map(c=>'# Chapter '+c.id+' — '+c.title+'\n\n'+c.export(p).replace(/^# .*\n/, '')).join('\n\n')+'\n\n'+provenanceBlocksMarkdown(p)+'# Review and realization boundary\n\nThe frozen SDD remains unchanged after capture. Governance and delivery events are recorded separately against its stable baseline reference. Rule-based checks and simulated walkthroughs do not replace implementation or operational evidence.\n';}
export function exportReviewPackage(p,baselineId,{markdown=null}={}){const b=baselineId?baseline(p,baselineId):null;if(baselineId&&!b)throw Error('The selected baseline does not exist.');return b?{exportedAt:new Date().toISOString(),baseline:structuredClone(b),currentAgainstWorkingProject:baselineCurrent(p,b),changesSinceCapture:baselineChanges(p,b),governance:p.finalReview.governance.filter(g=>g.baselineId===b.id),handoff:p.finalReview.handoff?.baselineId===b.id?p.finalReview.handoff:null,guidance:'Frozen architecture snapshot; governance and implementation evidence are separate records.'}:{exportedAt:new Date().toISOString(),project:p,chapterSummary:chapterSummaries(p),sourceFindings:inheritedFindings(p),reviewFindings:finalFindings(p),connectedModel:logicalGraph(p),markdown:markdown??assembleSDD(p),guidance:'Working, rule-based architecture review; no independent evidence verification.'};}
// A frozen baseline's SDD as it was frozen; without a baseline, the registers as assembled (the editions of the working
// SDD are built from them by sdd-document.js, which the export route serves).
export function exportSDD(p,baselineId){if(!baselineId)return assembleSDD(p);const b=baseline(p,baselineId);if(!b)throw Error('The selected baseline does not exist.');return b.markdown;}
export function sddHTML(markdown,model,options={}){return renderSDD(markdown,model,options);}
