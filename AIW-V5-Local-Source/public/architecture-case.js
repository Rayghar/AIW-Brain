import {chapterSummaries,finalFindings,finalMilestones,reviewRequirements,reviewTrace,currentBaseline,latestGovernance,independentApproval} from './review-domain.js';
import {releasedClaims,knowledgeState,claimReceiptCurrent} from './knowledge-governance.js';
import {digest} from './brain-integrity.js';
import {measurementCurrent} from './quality-analysis.js';
import {runtimeEvidenceCurrent} from './runtime-domain.js';
import {evidenceCurrent as controlEvidenceCurrent} from './security-domain.js';
import {remember} from './document-memo.js';
import {groupsOf,requirementGroups} from './requirement-groups.js';
import {decisionCurrent,decisionSourceChanged} from './decisions-domain.js';
import {selectionCurrent} from './technology-realisation-domain.js';
import {driverKind} from './quality-domain.js';

export const CASE_STAGES=[
 ['quality','drivers',2,'Quality'],['decisions','decisions',3,'Decisions'],
 ['logicalApplication','logical',4,'Responsibilities'],['applicationRealization','applications',5,'Applications'],
 ['logicalTechnology','capabilities',6,'Capabilities'],['technologyRealization','realizations',7,'Technology'],
 ['interfaces','contracts',8,'Interfaces'],['data','data',8,'Data'],
 ['security','controls',9,'Protection'],['runtime','runtime',10,'Runtime']
];
export const CASE_DIMENSIONS=['Requirement correctness','Evidence precision','Context and applicability','Alternatives and trade-offs','Missing controls and obligations','Overall usefulness'];
export const CASE_MODES=['focused','end-to-end'];
export const caseMode=c=>c?.mode==='end-to-end'?'end-to-end':'focused';
export const architectureCases=p=>p.finalReview.architectureCases||[];
const signedClaims=p=>releasedClaims(p).filter(x=>x.eligible&&knowledgeState(p).sources.some(s=>s.id===x.claim.sourceId&&s.origin==='repository-fetch'));
const stageKeys=CASE_STAGES.map(([,key])=>key);

// The same trail is used for the report and its review basis. Model objects that
// another requirement happens to share remain in scope; an unrelated chapter,
// SDD baseline, or unlinked repository release does not.
function caseDependencies(p,requirements){
 const traces=requirements.map(record=>({record,trace:reviewTrace(p,record.id)}));
 const objectIds=new Set(traces.flatMap(({record,trace})=>[record.id,...stageKeys.flatMap(key=>(trace?.[key]||[]).map(x=>x.id)),...(trace?.context||[]).map(x=>x.id),...(trace?.parties||[]).map(x=>x.id),...(trace?.threats||[]).map(x=>x.id),...(trace?.paths||[]).map(x=>x.id),...(trace?.zoneIds||[])]));
 const tracedRecords=new Map();for(const {record,trace} of traces){tracedRecords.set(record.id,record);for(const key of [...stageKeys,'context','parties','threats','paths'])for(const row of trace?.[key]||[])tracedRecords.set(row.id,row);}
 const groupIds=new Set(requirements.flatMap(r=>groupsOf(p,r.id)));
 for(const g of requirementGroups(p))if(groupIds.has(g.id)){objectIds.add(g.id);tracedRecords.set(g.id,g);}
 for(const z of p.runtime?.zones||[])if(objectIds.has(z.id))tracedRecords.set(z.id,z);
 const envIds=new Set((p.runtime?.plans||[]).filter(r=>objectIds.has(r.id)).map(r=>r.environmentId));
 for(const e of p.runtime?.environments||[])if(envIds.has(e.id)){objectIds.add(e.id);tracedRecords.set(e.id,e);}
 const boundaryIds=new Set([...(p.technology?.capabilities||[]).filter(c=>objectIds.has(c.id)).map(c=>c.boundaryId),...(p.runtime?.zones||[]).filter(z=>objectIds.has(z.id)).map(z=>z.boundaryId)]);
 const boundaryAssignments=Object.entries(p.technology?.applicationBoundaries||{}).filter(([applicationId])=>objectIds.has(applicationId));
 for(const [,boundaryId] of boundaryAssignments)boundaryIds.add(boundaryId);
 for(const b of p.technology?.boundaries||[])if(boundaryIds.has(b.id)){objectIds.add(b.id);tracedRecords.set(b.id,b);}
 const relationships=[...(p.relationships||[]),...(p.realisation?.connections||[]),...(p.technology?.dependencies||[]),...(p.technologyRealisation?.connections||[])].filter(x=>objectIds.has(x.from)||objectIds.has(x.to));
 const mappings=[...(p.logical?.mappings||[]),...(p.technology?.mappings||[]),...(p.technologyRealisation?.mappings||[])].filter(x=>[x.logicalId,x.physicalId,x.needId,x.capabilityId,x.realizationId].some(id=>objectIds.has(id)));
 mappings.push(...(p.runtime?.placements||[]).filter(x=>objectIds.has(x.planId)));
 mappings.push(...boundaryAssignments);
 const sourceEvidence=[];
 for(const {record:r} of traces)if(r.provenance?.sourceRow&&r.provenance?.cells)sourceEvidence.push({kind:'requirement-original',id:r.id,requirementIds:[r.id],title:r.externalId||r.title,location:[r.provenance.sheet,'row '+r.provenance.sourceRow,r.provenance.cells.description||r.provenance.cells.title].filter(Boolean).join(' · '),revision:r.provenance.revision||'',status:r.confirmed?'Requirement confirmed; original use still requires review':'Requirement unconfirmed',sourceHash:r.provenance.workbookHash||'',rightsStatus:'Review permitted use of the original'});
 const projectTasks=(p.coauthoring?.tasks||[]).filter(t=>t.status==='applied'&&Object.values(t.applied?.ids||{}).some(id=>objectIds.has(id)));
 for(const t of projectTasks){const s=p.coauthoring?.sources?.find(s=>s.id===t.sourceId),revision=t.applied?.sourceRevision??t.sourceRevision,v=revision===undefined?s?.versions?.at(-1):s?.versions?.find(v=>v.revision===revision);if(v)sourceEvidence.push({kind:'project-original',id:s.id,requirementIds:requirements.filter(r=>r.id===t.applied?.ids?.requirement).map(r=>r.id),title:v.title,location:v.location,revision:v.revision,status:revision===undefined?v.status+' · applied revision not recorded':s.versions.at(-1)?.revision===revision?v.status:v.status+' · newer source revision exists; reassess applicability',sourceHash:digest(v.excerpt),rightsStatus:'Review permitted use of the cited original',reviewer:v.confirmedBy||''});}
 const designTasks=(p.coauthoring?.designTasks||[]).filter(t=>objectIds.has(t.requirementId)||objectIds.has(t.driverId)||(t.applied?.records||[]).some(r=>objectIds.has(r.id)));
 const testObservations=[...designTasks.flatMap(t=>(t.measurements||[]).map(m=>({kind:'quality-measurement',id:m.id,taskId:t.id,requirementId:t.requirementId,driverId:t.driverId,metricLabel:m.metricLabel,mean:m.mean,unit:m.unit,samples:m.samples.length,environment:m.environment,workload:m.workload,source:m.source,reviewer:m.reviewer,interpretation:m.reason,current:measurementCurrent(p,t,m),authority:m.authority}))),...(p.runtime?.evidence||[]).filter(e=>objectIds.has(e.planId)).map(e=>({kind:e.kind==='exercise'?'runtime-exercise':'runtime-design-review',id:e.id,planId:e.planId,result:e.result,source:{title:e.reference},observations:e.observations,reviewer:e.reviewer,current:runtimeEvidenceCurrent(p,e),authority:'Architect-recorded reference; AIW has not independently verified the exercise.'})),...(p.security?.evidence||[]).filter(e=>objectIds.has(e.controlId)&&e.kind==='verification'&&!e.withdrawn).map(e=>({kind:'control-verification',id:e.id,controlId:e.controlId,result:e.result,source:{title:e.reference},observations:e.observations,reviewer:e.reviewer,current:controlEvidenceCurrent(p,e),authority:'Architect-recorded reference; AIW has not independently verified the control.'}))];
 const allLinks=knowledgeState(p).links.filter(l=>objectIds.has(l.objectId)),claims=signedClaims(p);
 const links=allLinks.filter(l=>l.status!=='retired'&&claimReceiptCurrent(p,l.receipt)&&claims.some(x=>x.claim.id===l.receipt.claimId&&x.release.id===l.receipt.releaseId));
 return {traces,objectIds,tracedRecords,relationships,mappings,sourceEvidence,projectTasks,designTasks,testObservations,allLinks,links,claims};
}

function caseScopeSnapshot(p,requirementIds){
 const wanted=new Set(requirementIds),requirements=reviewRequirements(p).filter(r=>wanted.has(r.id)),d=caseDependencies(p,requirements);
 // Include missing IDs and the selected records' confirmation and source state.
 // The observations are excluded: recording one must not invalidate another.
 return {requirementIds,missing:requirementIds.filter(id=>!requirements.some(r=>r.id===id)),records:[...d.tracedRecords].map(([id,r])=>[id,r]),relationships:d.relationships,mappings:d.mappings,sourceEvidence:d.sourceEvidence,projectTasks:d.projectTasks,designTasks:d.designTasks,observations:d.testObservations.map(({current,...o})=>o),knowledge:d.allLinks.map(l=>({link:l,current:l.status!=='retired'&&claimReceiptCurrent(p,l.receipt)}))};
}

// Persist only identifiers, labels and fingerprints, never source passages or
// measurement samples. This lets a later reviewer identify a changed connected
// dependency without widening the case basis to unrelated project revisions.
export function caseDependencySnapshot(p,c){
 const snapshot=caseScopeSnapshot(p,c.requirementIds),chapterById=new Map(c.requirementIds.map(id=>[id,1]));
 const requirements=reviewRequirements(p).filter(r=>c.requirementIds.includes(r.id));
 for(const r of requirements){const trace=reviewTrace(p,r.id);for(const [,key,ch] of CASE_STAGES)for(const row of trace?.[key]||[])chapterById.set(row.id,ch);}
 const entries=[];
 const namedFields=new Set(['title','name','ref','confirmed','status','targetValue','targetUnit','owner','version','serviceTier','operatingModel','selectedOptionId','selectedAlternativeId','rationale','assumptions','provenance','sourceHash','revision','result','label','type','from','to','location','rightsStatus','current','receipt']);
 const add=(kind,id,label,record,objectId=id)=>{
  const fields=record&&typeof record==='object'&&!Array.isArray(record)?Object.fromEntries(Object.entries(record).filter(([key])=>namedFields.has(key)).map(([key,value])=>[key,digest(value).slice(0,16)])):{};
  entries.push({key:kind+':'+id,kind,label:String(label||id).slice(0,160),chapter:chapterById.get(objectId)||11,objectId,stamp:digest(record),fields});
 };
 add('scope',c.id,c.title,{revision:c.revision,title:c.title,purpose:c.purpose,requirementIds:c.requirementIds,...(caseMode(c)==='end-to-end'?{mode:c.mode}:{})},c.requirementIds[0]);
 for(const [id,r] of snapshot.records)add(c.requirementIds.includes(id)?'requirement':'object',id,r.ref||r.externalId||r.title||id,r);
 for(const [i,r] of snapshot.relationships.entries())add('relationship',r.id||[r.from,r.to,r.type||r.kind||i].join('→'),[r.from,r.to].join(' → '),r,r.from);
 for(const [i,r] of snapshot.mappings.entries()){
  const id=Array.isArray(r)?r.join('→'):r.id||[r.logicalId,r.physicalId,r.needId,r.capabilityId,r.realizationId,r.planId,i].filter(Boolean).join('→');
  add('mapping',id,'Mapping '+id,r,Array.isArray(r)?r[0]:r.logicalId||r.needId||r.planId||r.capabilityId);
 }
 for(const s of snapshot.sourceEvidence)add('source',s.kind+':'+s.id,s.title||s.id,s,s.requirementIds?.[0]);
 for(const t of snapshot.projectTasks)add('source application',t.id,t.title||t.id,t,t.applied?.ids?.requirement);
 for(const t of snapshot.designTasks)add('design task',t.id,t.title||t.id,t,t.requirementId||t.driverId);
 for(const t of snapshot.observations)add('test evidence',t.id,t.metricLabel||t.id,t,t.requirementId||t.planId||t.controlId||t.driverId);
 for(const l of snapshot.knowledge)add('knowledge claim',l.link.id||[l.link.objectId,l.link.receipt?.claimId].join(':'),l.link.receipt?.claimId||l.link.objectId,l,l.link.objectId);
 const bounded=entries.slice(0,600);
 return {version:1,total:entries.length,truncated:entries.length>bounded.length,entries:bounded};
}

export function caseObservationChanges(p,c,observation){
 if(caseObservationCurrent(p,c,observation))return {available:true,changes:[],truncated:false};
 if(observation?.dependencySnapshot?.version!==1)return {available:false,changes:[],truncated:false};
 const before=observation.dependencySnapshot,now=caseDependencySnapshot(p,c),previous=new Map(before.entries.map(e=>[e.key,e])),current=new Map(now.entries.map(e=>[e.key,e])),changes=[];
 for(const [key,old] of previous){const next=current.get(key);if(!next||next.stamp!==old.stamp){const fieldChanges=next?[...new Set([...Object.keys(old.fields||{}),...Object.keys(next.fields||{})])].filter(field=>old.fields?.[field]!==next.fields?.[field]):[];changes.push({...old,change:next?'changed':'removed',fieldChanges,label:next&&old.label!==next.label?old.label+' → '+next.label:old.label});}}
 for(const [key,entry] of current)if(!previous.has(key))changes.push({...entry,change:'added'});
 return {available:true,changes,truncated:before.truncated||now.truncated};
}

// The case observations are an architect's assessment, not an automated score.
// Changes to the selected requirements, connected design or supporting evidence
// make an observation historical. Whole-project review and approval stay separate.
export function architectureCaseAssessment(p,c){
 if(!c)return {status:'no-case',dimensions:[],missing:[...CASE_DIMENSIONS],gaps:[],independent:[],reviewers:[]};
 const basis=caseReviewBasis(p,c);
 const dimensions=CASE_DIMENSIONS.map(dimension=>{
  const history=(c.observations||[]).filter(o=>o.dimension===dimension);
  const record=[...history].reverse().find(o=>o.basis===basis);
  return {dimension,outcome:record?.outcome||'not-assessed',observationId:record?.id||null,actor:record?.actor||null,
   independent:!!record&&record.actor!==(c.history?.at(-1)?.actor||c.actor),reference:record?.reference||null,sourceRightsReviewed:record?.sourceRightsReviewed===true,historical:history.length>0&&!record};
 });
 const missing=dimensions.filter(d=>d.outcome==='not-assessed').map(d=>d.dimension);
 const gaps=dimensions.filter(d=>d.outcome==='gap').map(d=>d.dimension);
 const independent=dimensions.filter(d=>d.outcome==='observed'&&d.independent).map(d=>d.dimension);
 const reviewers=[...new Set(dimensions.map(d=>d.actor).filter(Boolean))];
 const status=gaps.length?'gaps-identified':missing.length?'assessment-incomplete':independent.length!==CASE_DIMENSIONS.length?'independent-review-needed':'independent-observations-recorded';
 const conclusion=[...(c.conclusions||[])].reverse().find(x=>x.basis===caseConclusionBasis(p,c));
 return {status,dimensions,missing,gaps,independent,reviewers,conclusion:conclusion?{...conclusion,current:true}:null,authority:'Current authenticated architect observations only. A case conclusion does not approve the design or establish measured runtime quality.'};
}

// An end-to-end case is an explicit review question. Keep one selected
// requirement as the spine so disconnected records elsewhere in the case
// cannot collectively masquerade as a payment-to-runtime trail. These are
// recorded design and evidence preconditions, never automatic approval.
function journeyFromRequirement(p,traces,basis,testObservations){
 const record=traces[0]?.record,t=basis?.trace||{},req=basis?.record,drivers=new Set((t.drivers||[]).map(x=>x.id));
 const logicalIds=new Set((t.logical||[]).map(x=>x.id));
 const applicationIds=new Set((p.logical?.mappings||[]).filter(m=>logicalIds.has(m.logicalId)&&(t.applications||[]).some(a=>a.id===m.physicalId)).map(m=>m.physicalId));
 const needIds=new Set((p.technology?.needs||[]).filter(n=>applicationIds.has(n.applicationId)).map(n=>n.id));
 const capabilityIds=new Set((p.technology?.mappings||[]).filter(m=>needIds.has(m.needId)&&(t.capabilities||[]).some(c=>c.id===m.capabilityId)).map(m=>m.capabilityId));
 const realizationIds=new Set((p.technologyRealisation?.mappings||[]).filter(m=>capabilityIds.has(m.capabilityId)&&(t.realizations||[]).some(r=>r.id===m.realizationId)).map(m=>m.realizationId));
 const assetIds=new Set([...applicationIds,...realizationIds]);
 const runtimePlans=(t.runtime||[]).filter(plan=>assetIds.has(plan.assetId)),planIds=new Set(runtimePlans.map(x=>x.id));
 const relevantDecisions=(t.decisions||[]).filter(d=>d.driverIds?.some(id=>drivers.has(id)));
 const spine=!!(drivers.size&&relevantDecisions.length&&logicalIds.size&&applicationIds.size&&capabilityIds.size&&realizationIds.size&&runtimePlans.length);
 const hasText=v=>typeof v==='string'&&!!v.trim();
 const qualityDrivers=(t.drivers||[]).filter(d=>driverKind(d)==='quality'),qualityReady=d=>d.confirmed&&d.targetConfirmed&&hasText(d.metric)&&hasText(d.targetValue)&&hasText(d.window),quality=qualityDrivers.find(qualityReady)||qualityDrivers[0];
 const specified=v=>hasText(v)&&!(/^(not stated|unknown|tbd|tbc)$/i.test(v.trim())||/\bto select\b/i.test(v));
 const assessed=(a,{evidence=false}={})=>a&&a.by!=='sol'&&a.effect&&a.effect!=='unknown'&&hasText(a.reason)&&(!evidence||hasText(a.evidence));
 const comparedDecision=d=>d?.alternatives?.length>=2&&d.driverIds?.some(id=>drivers.has(id)&&d.alternatives.every(a=>assessed(a.assessments?.[id])));
 const recordedDecision=d=>!!d?.selectedAlternativeId&&hasText(d.rationale)&&hasText(d.assumptions)&&(d.status==='recorded'||decisionCurrent(p,d))&&!decisionSourceChanged(p,d);
 const decisions=relevantDecisions,decision=decisions.find(d=>comparedDecision(d)&&recordedDecision(d))||decisions.find(comparedDecision)||decisions.find(recordedDecision)||decisions[0];
 const comparedTechnology=r=>r?.options?.length>=2&&[...drivers].some(id=>r.options.every(o=>specified(o.product)&&assessed(o.assessments?.[id],{evidence:true})));
 const selectedTechnology=r=>{const o=r?.options?.find(o=>o.id===r.selectedOptionId);return !!r&&selectionCurrent(p,r)&&hasText(r.rationale)&&['product','version','serviceTier','operatingModel','topology','failureDomains','workloadProfile','specEvidence'].every(k=>specified(o?.[k]));};
 const technologies=(t.realizations||[]).filter(r=>realizationIds.has(r.id)),technology=technologies.find(r=>comparedTechnology(r)&&selectedTechnology(r))||technologies.find(comparedTechnology)||technologies.find(selectedTechnology)||technologies[0];
 const deployment=runtimePlans.find(plan=>plan.assetId===technology?.id&&(p.runtime?.placements||[]).some(place=>place.planId===plan.id&&(p.runtime?.zones||[]).some(zone=>zone.id===place.zoneId&&zone.environmentId===plan.environmentId&&hasText(zone.failureDomain))));
 const driverIds=drivers,controlIds=new Set((t.controls||[]).map(x=>x.id));
 const observed=testObservations.find(x=>x.current&&((x.kind==='quality-measurement'&&driverIds.has(x.driverId)&&x.samples>0&&hasText(x.environment)&&hasText(x.workload)&&!!x.source)||(x.kind==='runtime-exercise'&&planIds.has(x.planId)&&hasText(x.source?.title))||(x.kind==='control-verification'&&controlIds.has(x.controlId)&&hasText(x.source?.title))));
 const disconnected=traces.filter(x=>!stageKeys.some(k=>x.trace?.[k]?.length));
 const add=(key,label,detail,done,chapter,objectId)=>({key,label,detail,done:!!done,chapter,objectId:objectId||null});
 const checks=[
  add('selected-links','Connect every selected requirement','Each selected requirement needs an explicit link into the model; missing: '+(disconnected.map(x=>x.record.externalId||x.record.id).join(', ')||'none')+'.',traces.length>0&&!disconnected.length,1,disconnected[0]?.record.id||record?.id),
  add('continuous-trail','Trace one requirement through design and runtime','Follow the same requirement through a quality driver, decision, responsibility, mapped application component, allocated technology capability, product realization and its runtime asset.',spine,1,req?.id||record?.id),
  add('quality-target','Confirm the linked quality scenario','Review the measure, target and operating conditions for the linked requirement.',!!quality&&qualityReady(quality),2,quality?.id),
  add('decision-comparison','Compare two architecture approaches','Assess both approaches against the same linked quality driver and explain their effects.',comparedDecision(decision),3,decision?.id),
  add('decision-record','Record the chosen rationale and assumptions','Keep the choice, rationale and open assumptions in a current recorded or architect-accepted decision.',recordedDecision(decision),3,decision?.id),
  add('product-comparison','Compare two named product options','Assess both product options against a linked driver with a reason and evidence reference for each.',comparedTechnology(technology),7,technology?.id),
  add('product-selection','Record a specified technology choice','Name the selected product, version, service tier, operating model, topology, failure domains, workload and configuration basis; retain the selection rationale.',selectedTechnology(technology),7,technology?.id),
  add('deployment','Place the selected technology in an operating environment','Connect the chosen technology realization to a runtime plan, environment and stated failure domain.',!!deployment,10,runtimePlans.find(plan=>plan.assetId===technology?.id)?.id||runtimePlans[0]?.id),
  add('recorded-test','Link a current test or exercise','Record a current quality measurement, runtime exercise or control verification tied to this requirement trail and its exact evidence reference. Case opinions and imported pass counters do not count.',!!observed,observed?.kind==='quality-measurement'?2:observed?.kind==='control-verification'?9:10,observed?.driverId||observed?.controlId||observed?.planId||runtimePlans[0]?.id||t.drivers?.[0]?.id)
 ];
 return {mode:'end-to-end',anchorRequirementId:req?.id||null,checks,complete:checks.every(c=>c.done),done:checks.filter(c=>c.done).length,total:checks.length,authority:'Linked records and architect-recorded evidence only; AIW has not tested the product, verified source rights or approved the whole SDD.'};
}
function caseJourney(p,traces,testObservations){
 // An architect can select several requirements. Choose the most evidenced
 // single spine; never satisfy a check by borrowing a different requirement's
 // unrelated product or exercise.
 return (traces.length?traces:[null]).map(basis=>journeyFromRequirement(p,traces,basis,testObservations)).sort((a,b)=>Number(b.complete)-Number(a.complete)||b.done-a.done)[0];
}

// Counts describe actual graph links, including drafts. A link is not proof that
// a requirement is satisfied, and not every requirement needs every stage.
export function evaluateArchitectureCase(p,{caseId='architecture-case',sampleIds=[],requirementIds=null}={}){
 const savedCase=architectureCases(p).find(c=>c.id===caseId);
 // A saved case's recorded scope is authoritative even if a caller supplies a
 // different set of IDs. Unsaved evaluations may still ask for a temporary set.
 if(savedCase)requirementIds=savedCase.requirementIds;
 const all=reviewRequirements(p),wanted=requirementIds&&new Set(requirementIds);
 const requirements=wanted?all.filter(r=>wanted.has(r.id)):all;
 const missingRequirementIds=wanted?[...wanted].filter(id=>!requirements.some(r=>r.id===id)):[];
 const dependencies=caseDependencies(p,requirements),{traces,objectIds,sourceEvidence,testObservations,links,claims,allLinks}=dependencies;
 const mode=caseMode(savedCase),journey=mode==='end-to-end'?caseJourney(p,traces,testObservations):null;
 const located=new Set(sourceEvidence.flatMap(x=>x.requirementIds));
 const coverage=Object.fromEntries(CASE_STAGES.map(([stage,key])=>[stage,{requirements:traces.filter(({trace})=>trace?.[key]?.length).length,confirmedRequirements:traces.filter(({record,trace})=>record.confirmed&&trace?.[key]?.length).length}]));
 const chapters=[...chapterSummaries(p).map(c=>({chapter:c.id,title:c.title,done:c.done,total:c.total,errors:c.errors,warnings:c.warnings})),{chapter:11,title:'Review & realize',done:finalMilestones(p).filter(x=>x.done).length,total:finalMilestones(p).length,errors:finalFindings(p).filter(x=>x.level==='error').length,warnings:finalFindings(p).filter(x=>x.level==='warning').length}];
 const linkedClaims=claims.filter(x=>links.some(l=>l.receipt.claimId===x.claim.id&&l.receipt.releaseId===x.release.id));
 const rows=traces.map(({record:r,trace})=>({id:r.id,externalId:r.externalId||r.id,found:true,title:r.title,confirmed:!!r.confirmed,source:{sheet:r.provenance?.sheet||null,row:r.provenance?.sourceRow||null,workbookHash:r.provenance?.workbookHash||null,cell:r.provenance?.cells?.description||r.provenance?.cells?.title||null},linkedStages:Object.fromEntries(CASE_STAGES.map(([name,key])=>[name,(trace?.[key]||[]).map(x=>({id:x.id,ref:x.ref||x.id,title:x.title||x.question||x.name||x.id}))]))}));
 const sample=sampleIds.map(id=>{const row=rows.find(x=>x.externalId===id||x.id===id);return row?{...row,id,linkedStages:Object.fromEntries(Object.entries(row.linkedStages).map(([k,v])=>[k,v.map(x=>x.id)]))}:{id,found:false};});
 const baseline=currentBaseline(p),worklist=[],assessment=architectureCaseAssessment(p,savedCase);
 const addWork=(key,text,chapter=11,objectId=null,tab='work',anchor='ac-readiness')=>worklist.push({key,text,chapter,objectId,tab,anchor});
 if(!requirements.length)addWork('no-requirements','No in-scope requirements.');
 if(missingRequirementIds.length)addWork('missing-requirements','Saved case requirements were removed or moved out of scope.');
 const unconfirmed=requirements.find(r=>!r.confirmed);
 if(unconfirmed)addWork('confirm-requirements','Selected requirements still need architect confirmation and scope review.',1,unconfirmed.id);
 const unlocated=requirements.find(r=>!located.has(r.id));
 if(unlocated)addWork('locate-source','Locate the original source for each selected requirement and review permitted use.',1,unlocated.id);
 const rights=assessment.dimensions?.find(d=>d.dimension==='Evidence precision'),sourceUseAcknowledged=!!(rights?.independent&&rights.outcome==='observed'&&rights.sourceRightsReviewed);
 if(sourceEvidence.length&&!sourceUseAcknowledged)addWork('source-rights','A second architect must review permitted use and applicability of this case’s exact source originals in Evidence precision.',11,null,'work','ac-assessment');
 if(requirements.length&&!traces.some(({trace})=>stageKeys.some(key=>trace?.[key]?.length)))addWork('connected-model','No connected architecture model objects are available for this case.',1,requirements[0]?.id,'model');
 for(const check of journey?.checks||[])if(!check.done)addWork('journey:'+check.key,check.label+'. '+check.detail,check.chapter,check.objectId,check.chapter===1?'model':'work');
 const blockers=worklist.map(item=>item.text);
 const projectBlockers=[];
 const chapterComplete=chapters.every(c=>c.done>=c.total&&!c.errors);
 if(!chapterComplete)projectBlockers.push('Project-wide chapter models and validation findings remain incomplete.');
 if(!baseline||baseline.classification!=='Architect reviewed')projectBlockers.push('No current architect-reviewed SDD baseline.');
 const governance=baseline&&latestGovernance(p,baseline.id);
 if(!governance||!['Approved','Approved with conditions'].includes(governance.outcome))projectBlockers.push('No current external whole-project approval evidence.');
 else if(!independentApproval(baseline,governance))projectBlockers.push('Whole-project approval evidence must come from a second authenticated person, not the baseline review author or an agent.');
 const baselineSummary=baseline?{id:baseline.id,classification:baseline.classification}:null;
 return {caseId,projectId:p.id,measure:'Observed model links, including drafts; no generated design or independent quality score.',scope:requirementIds?'selected requirements':'all in-scope requirements',caseScope:{requirementIds:requirementIds||requirements.map(r=>r.id),objectIds:[...objectIds]},journey,missingRequirementIds,requirements:{inScope:requirements.length,confirmed:requirements.filter(r=>r.confirmed).length,sourceLocated:located.size,missingSourceLocation:requirements.length-located.size},sourceUse:{required:sourceEvidence.length>0,acknowledged:sourceUseAcknowledged,actor:sourceUseAcknowledged?rights.actor:null,observationId:sourceUseAcknowledged?rights.observationId:null,authority:'Architect acknowledgement for the exact current case sources; AIW does not verify usage rights.'},chapters,chapterScope:'case',projectGate:{ready:!projectBlockers.length,chapterComplete,baseline:baselineSummary,approval:governance?{id:governance.id,outcome:governance.outcome}:null,blockers:projectBlockers},requirementTrail:coverage,fullTrail:traces.filter(({trace})=>CASE_STAGES.every(([,key])=>trace?.[key]?.length)).length,eligibleSignedRepositoryClaims:linkedClaims.length,projectEligibleSignedRepositoryClaims:claims.length,knowledgeStatus:{current:links.length,changed:allLinks.filter(l=>l.status!=='retired'&&!links.includes(l)).length,retired:allLinks.filter(l=>l.status==='retired').length},knowledgeLinks:links.map(l=>({objectId:l.objectId,claimId:l.receipt.claimId,releaseId:l.receipt.releaseId,reason:l.reason,receipt:l.receipt})),sourceEvidence,testObservations,rows,sample,baseline:baselineSummary,architectAssessment:assessment,acceptance:blockers.length?'blocked':assessment.conclusion?.outcome==='support'&&assessment.status==='independent-observations-recorded'?'independent case review recorded':assessment.status==='independent-observations-recorded'?'ready for case conclusion':'ready for independent quality assessment',blockers,worklist};
}

// Case records live outside the design stamp. Recording observations must not
// invalidate an SDD baseline or make the observation immediately stale.
export function caseContextBasis(p){return digest([p.id,'case-scope-v2']);}
export const caseReviewBasis=(p,c)=>remember(p,'case:review-basis',c,()=>digest([caseContextBasis(p),c.id,c.revision,c.title,c.purpose,...(caseMode(c)==='end-to-end'?[c.mode]:[]),caseScopeSnapshot(p,c.requirementIds)]));
export const caseObservationCurrent=(p,c,o)=>!!o&&o.basis===caseReviewBasis(p,c);
export const caseConclusionBasis=(p,c)=>{const basis=caseReviewBasis(p,c);return digest([basis,CASE_DIMENSIONS.map(d=>{
 const o=[...(c.observations||[])].reverse().find(o=>o.dimension===d&&o.basis===basis);return o||null;
})]);};
const required=(v,name,max)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Record '+name+' (up to '+max+' characters).');return v.trim();};
export function applyArchitectureCaseCommand(input,command,at=new Date().toISOString(),actor='local-architect'){
 const p=structuredClone(input),records=p.finalReview.architectureCases||=[],raw=command.payload||{};
 if(!actor)throw Error('An authenticated architect is required.');
 let record=records.find(c=>c.id===raw.id);
 if(command.type==='case.save'){
 if(raw.basis!==caseContextBasis(p))throw Error('This case editor belongs to another project or an older scope protocol. Reopen the case scope.');
  if(raw.id&&!record)throw Error('Choose a saved architecture case.');
  if(!Array.isArray(raw.requirementIds)||raw.requirementIds.length<1||raw.requirementIds.length>20||new Set(raw.requirementIds).size!==raw.requirementIds.length)throw Error('Choose 1–20 distinct requirements for a focused case.');
  const mode=raw.mode===undefined?caseMode(record):raw.mode;
  if(!CASE_MODES.includes(mode))throw Error('Choose focused review or an end-to-end evidence journey.');
  const available=new Set(reviewRequirements(p).map(r=>r.id));if(raw.requirementIds.some(id=>!available.has(id)))throw Error('Choose current, in-scope requirements from this project.');
  const title=required(raw.title,'a case title',180),purpose=required(raw.purpose,'the question this case should answer',2000);
  if(!record){if(records.length>=12)throw Error('This project supports up to 12 focused architecture cases.');record={id:'AC-'+String(records.length+1).padStart(3,'0'),revision:0,createdAt:at,actor,history:[],observations:[],conclusions:[]};records.push(record);}
  if(record.history.length>=20)throw Error('This case has reached its scope revision limit. Start a new case.');
  Object.assign(record,{title,purpose,mode,requirementIds:[...raw.requirementIds],revision:record.revision+1,updatedAt:at});
  record.history.push({revision:record.revision,title,purpose,mode,requirementIds:[...raw.requirementIds],at,actor});
  if(!record.startingPoint)record.startingPoint={at,basis:caseReviewBasis(p,record),report:evaluateArchitectureCase(p,{caseId:record.id,requirementIds:record.requirementIds})};
 }else if(command.type==='case.observe'){
  if(!record)throw Error('Choose a saved architecture case.');
  if(raw.basis!==caseReviewBasis(p,record))throw Error('The design, case scope, or supporting knowledge changed. Review the current case before recording observations.');
  if(raw.reviewed!==true)throw Error('Confirm that these are your observations of the current case.');
  if(record.observations.length>=60)throw Error('This case has reached its observation history limit. Start a new case.');
  if(!CASE_DIMENSIONS.includes(raw.dimension)||!['observed','gap','not-assessed'].includes(raw.outcome))throw Error('Choose a review dimension and an observed outcome.');
  const reviewer=required(raw.reviewer,'the reviewing architect',180),notes=required(raw.notes,'the observation and its limitations',4000);
  const reference=raw.outcome==='not-assessed'?'':required(raw.reference,'an evidence or model reference',1200);
  record.observations.push({id:record.id+'-O'+(record.observations.length+1),at,actor,reviewer,dimension:raw.dimension,outcome:raw.outcome,notes,reference,basis:raw.basis,dependencySnapshot:caseDependencySnapshot(p,record),sourceRightsReviewed:raw.dimension==='Evidence precision'&&raw.sourceRightsReviewed===true,authority:'Recorded architect observation and explicit source-use acknowledgement if given; AIW has not verified rights or measured quality.'});
  record.updatedAt=at;
 }else if(command.type==='case.conclude'){
  if(!record)throw Error('Choose a saved architecture case.');
  if(raw.basis!==caseConclusionBasis(p,record))throw Error('The design, observations, scope, or supporting knowledge changed. Review the current case.');
  if(raw.reviewed!==true||!['support','rework'].includes(raw.outcome))throw Error('Review the case and choose support or rework.');
  const notes=required(raw.notes,'a case conclusion and its limits',4000),reference=required(raw.reference,'the assessment evidence',1200);
  if(record.conclusions?.length>=20)throw Error('This case has reached its conclusion history limit. Start a new case.');
  if(raw.outcome==='support'){
   if(actor===(record.history?.at(-1)?.actor||record.actor))throw Error('A different authenticated architect must conclude the current case scope.');
   const report=evaluateArchitectureCase(p,{caseId:record.id,requirementIds:record.requirementIds});
   if(report.blockers.length)throw Error('Resolve the case readiness blockers before recording support.');
   if(report.architectAssessment.status!=='independent-observations-recorded')throw Error('Every case review dimension needs current support from another authenticated architect.');
  }
  record.conclusions??=[];
  record.conclusions.push({id:record.id+'-C'+(record.conclusions.length+1),at,actor,outcome:raw.outcome,notes,reference,basis:raw.basis,authority:'Independent case assessment only. Formal SDD review, governance approval and actual performance remain separate.'});
  record.updatedAt=at;
 }else throw Error('Unknown architecture case action.');
 return {document:p,selected:record.id};
}
export function architectureCaseExport(p,id){
 const c=architectureCases(p).find(x=>x.id===id);if(!c)throw Error('Choose a saved architecture case.');
 return {schema:'aiw.architecture-case.v1',projectId:p.id,case:structuredClone(c),basis:caseReviewBasis(p,c),conclusionBasis:caseConclusionBasis(p,c),current:evaluateArchitectureCase(p,{caseId:c.id,requirementIds:c.requirementIds}),observations:c.observations.map(o=>({...o,current:caseObservationCurrent(p,c,o)})),conclusions:(c.conclusions||[]).map(x=>({...x,current:x.basis===caseConclusionBasis(p,c)})),authority:'Starting point, architect observations and case conclusions. This export does not approve the model or measure runtime quality.'};
}
