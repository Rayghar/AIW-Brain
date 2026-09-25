import {applyAssuranceCommand} from './assurance-domain.js';
import {digest} from './brain-integrity.js';
const fields=['kind','title','statement','requirementIds','status','owner','release','environment','observedAt','cycle'];
const text=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
const snapshot=r=>Object.fromEntries(fields.map(k=>[k,k==='requirementIds'?[...new Set(r[k]||[])].sort():text(r[k],k==='statement'?4000:k==='status'?100:k==='observedAt'?80:180)]));
const same=(a,b)=>digest(a??null)===digest(b??null);
export function previewFeedback(p,feed){
 if(!feed||feed.schema!=='aiw.delivery.v1'||!Array.isArray(feed.records)||!feed.records.length||feed.records.length>200)throw Error('Import an aiw.delivery.v1 JSON feed containing 1–200 records.');
 const origin=text(feed.origin,180)||'Imported delivery observations',seen=new Set(),requirements=new Map(p.artefacts.filter(a=>a.type==='requirement').flatMap(a=>[[a.id,a.id],...(a.externalId?[[a.externalId,a.id]]:[])])),conflicts=[];
 const records=feed.records.map((r,index)=>{
  if(typeof r.externalId!=='string'||!r.externalId.trim()||seen.has(r.externalId))throw Error('Each incoming observation needs a unique externalId.');seen.add(r.externalId);
  const requirementIds=(r.requirements||[]).map(id=>requirements.get(id));if(!requirementIds.length||requirementIds.some(id=>!id))throw Error('Map every observation to existing requirement IDs.');
  const prior=p.assurance?.records?.find(a=>a.feed===origin&&a.externalId===r.externalId),hash=digest(r),kind=['test-result','defect','observation','value-outcome','ethos-assessment','promise','change-request'].includes(r.kind)?r.kind:'observation',incoming=snapshot({...r,kind,requirementIds,status:r.status||'Unverified assertion'}),current=prior?snapshot(prior):null,base=prior?.feedSnapshot,change=prior?.feedHash===hash?'unchanged':prior?'update':'new',merged={...incoming};
  if(prior&&kind!==prior.kind)throw Error('The evidence type changed for '+r.externalId+'. Use a new external identity for a different evidence type.');
  if(prior&&change==='update')for(const field of fields){if(base&&same(incoming[field],base[field]))merged[field]=current[field];else if(!same(current[field],incoming[field])&&(!base||!same(current[field],base[field])))conflicts.push({key:index+':'+field,index,externalId:r.externalId,field,before:base?.[field]??null,current:current[field],incoming:incoming[field],baselineKnown:!!base});}
  return {...incoming,externalId:r.externalId,priorId:prior?.id,hash,incoming,merged,change};
 });
 return {records,conflicts,origin,counts:{new:records.filter(r=>r.change==='new').length,update:records.filter(r=>r.change==='update').length,unchanged:records.filter(r=>r.change==='unchanged').length,conflicts:conflicts.length},stamp:digest([p.assurance?.version||0,p.assurance?.records,feed,p.artefacts.map(a=>[a.id,a.externalId,a.description])])};
}
export function applyFeedbackCommand(input,command,at,actor){
 const raw=command.payload||{},q=previewFeedback(input,raw.feed);if(raw.reviewed!==true||raw.stamp!==q.stamp)throw Error('Review the incoming observations and their requirement links.');
 for(const c of q.conflicts){const choice=raw.resolutions?.[c.key];if(!['current','incoming'].includes(choice))throw Error('Resolve each source update that conflicts with a local edit.');q.records[c.index].merged[c.field]=choice==='current'?c.current:c.incoming;}
 let p=structuredClone(input);for(const r of q.records.filter(r=>r.change!=='unchanged')){
  const prior=p.assurance?.records?.find(a=>a.id===r.priorId);p=applyAssuranceCommand(p,{type:'assurance.record',payload:{...r.merged,id:r.priorId,sourceId:raw.sourceId,reviewed:false,reviewer:'',reviewNote:'',objectIds:prior?.objectIds||[]}},at,actor).document;
  const saved=r.priorId?p.assurance.records.find(a=>a.id===r.priorId):p.assurance.records.at(-1);saved.feed=q.origin;saved.externalId=r.externalId;saved.feedHash=r.hash;saved.feedSnapshot=r.incoming;saved.feedReview={at,actor,resolutions:q.conflicts.filter(c=>c.externalId===r.externalId).map(c=>({...c,choice:raw.resolutions[c.key]}))};
 }return {document:p};
}
export function deliveryExchange(p){return {schema:'aiw.delivery.v1',origin:p.name,records:(p.assurance?.records||[]).map(r=>({externalId:r.externalId||r.id,kind:r.kind,title:r.title,statement:r.statement,requirements:r.requirementIds,status:r.status,owner:r.owner,release:r.release,environment:r.environment,observedAt:r.observedAt,cycle:r.cycle})),obligations:p.finalReview.actions.map(a=>({id:a.id,title:a.title,owner:a.owner,due:a.due,acceptance:a.acceptance,objectIds:a.objectIds})),posture:'Portable reviewed sync. A delivery observation does not automatically accept architecture or verify production behaviour.'};}
