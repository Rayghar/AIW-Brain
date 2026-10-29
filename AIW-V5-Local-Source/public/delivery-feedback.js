import {applyAssuranceCommand} from './assurance-domain.js';
import {digest} from './brain-integrity.js';
import {normaliseVerificationObservation,verificationContext,verificationPackage,verificationResult} from './architecture-verification.js';
const fields=['kind','title','statement','requirementIds','status','owner','release','environment','observedAt','cycle','verificationObservation'];
const text=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
const snapshot=r=>Object.fromEntries(fields.map(k=>[k,k==='verificationObservation'?r[k]?structuredClone(r[k]):null:k==='requirementIds'?[...new Set(r[k]||[])].sort():text(r[k],k==='statement'?4000:k==='status'?100:k==='observedAt'?80:180)]));
const same=(a,b)=>digest(a??null)===digest(b??null);
export function previewFeedback(p,feed){
 if(!feed||feed.schema!=='aiw.delivery.v1'||!Array.isArray(feed.records)||!feed.records.length||feed.records.length>200)throw Error('Import an aiw.delivery.v1 JSON feed containing 1–200 records.');
 const origin=text(feed.origin,180)||'Imported delivery observations',seen=new Set(),requirements=new Map(p.artefacts.filter(a=>a.type==='requirement').flatMap(a=>[[a.id,a.id],...(a.externalId?[[a.externalId,a.id]]:[])])),conflicts=[];
 const records=feed.records.map((r,index)=>{
  if(typeof r.externalId!=='string'||!r.externalId.trim()||seen.has(r.externalId))throw Error('Each incoming observation needs a unique externalId.');seen.add(r.externalId);
  const requirementIds=(r.requirements||[]).map(id=>requirements.get(id));if(!requirementIds.length||requirementIds.some(id=>!id))throw Error('Map every observation to existing requirement IDs.');
  const prior=p.assurance?.records?.find(a=>a.feed===origin&&a.externalId===r.externalId),hash=digest(r),kind=['test-result','defect','observation','value-outcome','ethos-assessment','promise','change-request'].includes(r.kind)?r.kind:'observation',incoming=snapshot({...r,kind,requirementIds,status:r.status||'Unverified assertion',verificationObservation:r.verificationObservation===undefined?prior?.verificationObservation:r.verificationObservation}),current=prior?snapshot(prior):null,base=prior?.feedSnapshot,change=prior?.feedHash===hash?'unchanged':prior?'update':'new',merged={...incoming};
  if(incoming.verificationObservation)incoming.verificationObservation=merged.verificationObservation=normaliseVerificationObservation(p,{...incoming,objectIds:incoming.verificationObservation.objectIds},incoming.verificationObservation);
  if(prior&&kind!==prior.kind)throw Error('The evidence type changed for '+r.externalId+'. Use a new external identity for a different evidence type.');
  if(prior&&change==='update')for(const field of fields){if(base&&same(incoming[field],base[field]))merged[field]=current[field];else if(!same(current[field],incoming[field])&&(!base||!same(current[field],base[field])))conflicts.push({key:index+':'+field,index,externalId:r.externalId,field,before:base?.[field]??null,current:current[field],incoming:incoming[field],baselineKnown:!!base});}
  return {...incoming,externalId:r.externalId,priorId:prior?.id,hash,incoming,merged,change,...(incoming.verificationObservation?{comparison:verificationResult(p,{...incoming,objectIds:incoming.verificationObservation.objectIds})}:{})};
 });
 return {records,conflicts,origin,counts:{new:records.filter(r=>r.change==='new').length,update:records.filter(r=>r.change==='update').length,unchanged:records.filter(r=>r.change==='unchanged').length,conflicts:conflicts.length},stamp:digest([p.assurance?.version||0,p.assurance?.records,feed,p.artefacts.map(a=>[a.id,a.externalId,a.description]),...records.filter(r=>r.verificationObservation).map(r=>verificationContext(p,p.finalReview.actions.find(a=>a.id===r.verificationObservation.actionId)))])};
}
export function applyFeedbackCommand(input,command,at,actor){
 const raw=command.payload||{},q=previewFeedback(input,raw.feed);if(raw.reviewed!==true||raw.stamp!==q.stamp)throw Error('Review the incoming observations and their requirement links.');
 for(const c of q.conflicts){const choice=raw.resolutions?.[c.key];if(!['current','incoming'].includes(choice))throw Error('Resolve each source update that conflicts with a local edit.');q.records[c.index].merged[c.field]=choice==='current'?c.current:c.incoming;}
 let p=structuredClone(input);for(const r of q.records.filter(r=>r.change!=='unchanged')){
  const prior=p.assurance?.records?.find(a=>a.id===r.priorId);p=applyAssuranceCommand(p,{type:'assurance.record',payload:{...r.merged,id:r.priorId,sourceId:raw.sourceId,verificationSource:raw.verificationSource,reviewed:false,reviewer:'',reviewNote:'',objectIds:r.merged.verificationObservation?.objectIds||prior?.objectIds||[]}},at,actor).document;
  const saved=r.priorId?p.assurance.records.find(a=>a.id===r.priorId):p.assurance.records.at(-1);saved.feed=q.origin;saved.externalId=r.externalId;saved.feedHash=r.hash;saved.feedSnapshot=r.incoming;saved.feedReview={at,actor,resolutions:q.conflicts.filter(c=>c.externalId===r.externalId).map(c=>({...c,choice:raw.resolutions[c.key]}))};
 }return {document:p};
}
// The obligations exported are the accepted ones (round 12, DRF-13): a candidate obligation Sol drafted (a proposal,
// record-lifecycle.js) travels only once a person has kept it.
export function deliveryExchange(p){return {schema:'aiw.delivery.v1',origin:p.name,records:(p.assurance?.records||[]).map(r=>({externalId:r.externalId||r.id,kind:r.kind,title:r.title,statement:r.statement,requirements:r.requirementIds,status:r.status,owner:r.owner,release:r.release,environment:r.environment,observedAt:r.observedAt,cycle:r.cycle,...(r.verificationObservation?{verificationObservation:structuredClone(r.verificationObservation)}:{})})),obligations:p.finalReview.actions.filter(a=>a.state!=='proposed').map(a=>({id:a.id,title:a.title,owner:a.owner,due:a.due,acceptance:a.acceptance,objectIds:a.objectIds})),...(p.finalReview.actions.some(a=>a.verificationContract)?{verification:verificationPackage(p)}:{}),proposedObligations:p.finalReview.actions.filter(a=>a.state==='proposed').length,posture:'Portable reviewed sync. A delivery observation does not automatically accept architecture or verify production behaviour. Candidate obligations a person has not accepted are counted, not exported.'};}
