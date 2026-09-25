import {chapterSummaries,finalFindings,finalMilestones,reviewRequirements,reviewTrace,reviewDesignStamp,currentBaseline} from './review-domain.js';
import {releasedClaims,knowledgeState,claimReceiptCurrent} from './knowledge-governance.js';
import {digest} from './brain-integrity.js';

export const CASE_STAGES=[
 ['quality','drivers',2,'Quality'],['decisions','decisions',3,'Decisions'],
 ['logicalApplication','logical',4,'Responsibilities'],['applicationRealization','applications',5,'Applications'],
 ['logicalTechnology','capabilities',6,'Capabilities'],['technologyRealization','realizations',7,'Technology'],
 ['interfaces','contracts',8,'Interfaces'],['data','data',8,'Data'],
 ['security','controls',9,'Protection'],['runtime','runtime',10,'Runtime']
];
export const CASE_DIMENSIONS=['Requirement correctness','Evidence precision','Context and applicability','Alternatives and trade-offs','Missing controls and obligations','Overall usefulness'];
export const architectureCases=p=>p.finalReview.architectureCases||[];
const signedClaims=p=>releasedClaims(p).filter(x=>x.eligible&&knowledgeState(p).sources.some(s=>s.id===x.claim.sourceId&&s.origin==='repository-fetch'));

// Counts describe actual graph links, including drafts. A link is not proof that
// a requirement is satisfied, and not every requirement needs every stage.
export function evaluateArchitectureCase(p,{caseId='architecture-case',sampleIds=[],requirementIds=null}={}){
 const all=reviewRequirements(p),wanted=requirementIds&&new Set(requirementIds);
 const requirements=wanted?all.filter(r=>wanted.has(r.id)):all;
 const missingRequirementIds=wanted?[...wanted].filter(id=>!requirements.some(r=>r.id===id)):[];
 const source=requirements.filter(r=>r.provenance?.sourceRow&&r.provenance?.cells);
 const traces=requirements.map(record=>({record,trace:reviewTrace(p,record.id)}));
 const coverage=Object.fromEntries(CASE_STAGES.map(([stage,key])=>[stage,{requirements:traces.filter(({trace})=>trace?.[key]?.length).length,confirmedRequirements:traces.filter(({record,trace})=>record.confirmed&&trace?.[key]?.length).length}]));
 const chapters=[...chapterSummaries(p).map(c=>({chapter:c.id,title:c.title,done:c.done,total:c.total,errors:c.errors,warnings:c.warnings})),{chapter:11,title:'Review & Realize',done:finalMilestones(p).filter(x=>x.done).length,total:finalMilestones(p).length,errors:finalFindings(p).filter(x=>x.level==='error').length,warnings:finalFindings(p).filter(x=>x.level==='warning').length}];
 const ids=new Set(traces.flatMap(({record,trace})=>[record.id,...CASE_STAGES.flatMap(([,key])=>trace[key].map(x=>x.id))]));
 const claims=signedClaims(p),links=knowledgeState(p).links.filter(l=>l.status!=='retired'&&ids.has(l.objectId)&&claimReceiptCurrent(p,l.receipt)&&claims.some(x=>x.claim.id===l.receipt.claimId&&x.release.id===l.receipt.releaseId));
 const linkedClaims=claims.filter(x=>links.some(l=>l.receipt.claimId===x.claim.id&&l.receipt.releaseId===x.release.id));
 const rows=traces.map(({record:r,trace})=>({id:r.id,externalId:r.externalId||r.id,found:true,title:r.title,confirmed:!!r.confirmed,source:{sheet:r.provenance?.sheet||null,row:r.provenance?.sourceRow||null,workbookHash:r.provenance?.workbookHash||null,cell:r.provenance?.cells?.description||r.provenance?.cells?.title||null},linkedStages:Object.fromEntries(CASE_STAGES.map(([name,key])=>[name,trace[key].map(x=>({id:x.id,ref:x.ref||x.id,title:x.title||x.question||x.name||x.id}))]))}));
 const sample=sampleIds.map(id=>{const row=rows.find(x=>x.externalId===id||x.id===id);return row?{...row,id,linkedStages:Object.fromEntries(Object.entries(row.linkedStages).map(([k,v])=>[k,v.map(x=>x.id)]))}:{id,found:false};});
 const baseline=currentBaseline(p),blockers=[];
 if(!requirements.length)blockers.push('No in-scope requirements.');
 if(missingRequirementIds.length)blockers.push('Saved case requirements were removed or moved out of scope.');
 if(requirements.some(r=>!r.confirmed))blockers.push('Selected requirements still need architect confirmation and scope review.');
 if(chapters.some(c=>c.done<c.total||c.errors))blockers.push('Project-wide chapter models and validation findings remain incomplete.');
 if(!baseline||baseline.classification!=='Architect reviewed')blockers.push('No current architect-reviewed SDD baseline.');
 if(!linkedClaims.length)blockers.push('No eligible signed repository claim is linked to this case’s requirements or traced objects.');
 return {caseId,projectId:p.id,measure:'Observed model links, including drafts; no generated design or independent quality score.',scope:requirementIds?'selected requirements':'all in-scope requirements',missingRequirementIds,requirements:{inScope:requirements.length,confirmed:requirements.filter(r=>r.confirmed).length,sourceLocated:source.length,missingSourceLocation:requirements.length-source.length},chapters,chapterScope:'whole project',requirementTrail:coverage,fullTrail:traces.filter(({trace})=>CASE_STAGES.every(([,key])=>trace[key].length)).length,eligibleSignedRepositoryClaims:linkedClaims.length,projectEligibleSignedRepositoryClaims:claims.length,knowledgeLinks:links.map(l=>({objectId:l.objectId,claimId:l.receipt.claimId,releaseId:l.receipt.releaseId,reason:l.reason,receipt:l.receipt})),rows,sample,baseline:baseline?{id:baseline.id,classification:baseline.classification}:null,architectAssessment:{status:'awaiting recorded observations',dimensions:CASE_DIMENSIONS},acceptance:blockers.length?'blocked':'ready for independent quality assessment',blockers};
}

// Case records live outside the design stamp. Recording observations must not
// invalidate an SDD baseline or make the observation immediately stale.
export function caseContextBasis(p){return digest([p.id,reviewDesignStamp(p),currentBaseline(p)?.id||null,releasedClaims(p).map(x=>[x.release.id,x.claim.id,x.eligible,x.reasons])]);}
export const caseReviewBasis=(p,c)=>digest([caseContextBasis(p),c.id,c.revision,c.requirementIds,c.purpose]);
export const caseObservationCurrent=(p,c,o)=>!!o&&o.basis===caseReviewBasis(p,c);
const required=(v,name,max)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Record '+name+' (up to '+max+' characters).');return v.trim();};
export function applyArchitectureCaseCommand(input,command,at=new Date().toISOString(),actor='local-architect'){
 const p=structuredClone(input),records=p.finalReview.architectureCases||=[],raw=command.payload||{};
 if(!actor)throw Error('An authenticated architect is required.');
 let record=records.find(c=>c.id===raw.id);
 if(command.type==='case.save'){
  if(raw.basis!==caseContextBasis(p))throw Error('The project changed. Reload and review the case scope again.');
  if(raw.id&&!record)throw Error('Choose a saved architecture case.');
  if(!Array.isArray(raw.requirementIds)||raw.requirementIds.length<1||raw.requirementIds.length>20||new Set(raw.requirementIds).size!==raw.requirementIds.length)throw Error('Choose 1–20 distinct requirements for a focused case.');
  const available=new Set(reviewRequirements(p).map(r=>r.id));if(raw.requirementIds.some(id=>!available.has(id)))throw Error('Choose current, in-scope requirements from this project.');
  const title=required(raw.title,'a case title',180),purpose=required(raw.purpose,'the question this case should answer',2000);
  if(!record){if(records.length>=12)throw Error('This project supports up to 12 focused architecture cases.');record={id:'AC-'+String(records.length+1).padStart(3,'0'),revision:0,createdAt:at,actor,history:[],observations:[]};records.push(record);}
  if(record.history.length>=20)throw Error('This case has reached its scope revision limit. Start a new case.');
  Object.assign(record,{title,purpose,requirementIds:[...raw.requirementIds],revision:record.revision+1,updatedAt:at});
  record.history.push({revision:record.revision,title,purpose,requirementIds:[...raw.requirementIds],at,actor});
  if(!record.startingPoint)record.startingPoint={at,basis:caseReviewBasis(p,record),report:evaluateArchitectureCase(p,{caseId:record.id,requirementIds:record.requirementIds})};
 }else if(command.type==='case.observe'){
  if(!record)throw Error('Choose a saved architecture case.');
  if(raw.basis!==caseReviewBasis(p,record))throw Error('The design, case scope, or supporting knowledge changed. Review the current case before recording observations.');
  if(raw.reviewed!==true)throw Error('Confirm that these are your observations of the current case.');
  if(record.observations.length>=60)throw Error('This case has reached its observation history limit. Start a new case.');
  if(!CASE_DIMENSIONS.includes(raw.dimension)||!['observed','gap','not-assessed'].includes(raw.outcome))throw Error('Choose a review dimension and an observed outcome.');
  const reviewer=required(raw.reviewer,'the reviewing architect',180),notes=required(raw.notes,'the observation and its limitations',4000);
  const reference=raw.outcome==='not-assessed'?'':required(raw.reference,'an evidence or model reference',1200);
  record.observations.push({id:record.id+'-O'+(record.observations.length+1),at,actor,reviewer,dimension:raw.dimension,outcome:raw.outcome,notes,reference,basis:raw.basis,authority:'Recorded architect observation; not independent approval or measured quality.'});
  record.updatedAt=at;
 }else throw Error('Unknown architecture case action.');
 return {document:p,selected:record.id};
}
export function architectureCaseExport(p,id){
 const c=architectureCases(p).find(x=>x.id===id);if(!c)throw Error('Choose a saved architecture case.');
 return {schema:'aiw.architecture-case.v1',projectId:p.id,case:structuredClone(c),basis:caseReviewBasis(p,c),current:evaluateArchitectureCase(p,{caseId:c.id,requirementIds:c.requirementIds}),observations:c.observations.map(o=>({...o,current:caseObservationCurrent(p,c,o)})),authority:'Starting point and architect observations. This export does not approve the model, establish independent review, or measure runtime quality.'};
}
