import {digest} from './brain-integrity.js';
const domains=['decisions','logical','realisation','technology','technologyRealisation','interfaces'];
const copy=x=>structuredClone(x);
export const reversalBasis=p=>Object.fromEntries(['artefacts','relationships','quality',...domains,'security','runtime'].map(k=>[k,p[k]]).concat([['knowledgeLinks',p.knowledge?.links||[]],['narratives',p.coauthoring?.narratives||[]]]));
export function captureReversal(before,after){return {before:Object.fromEntries(domains.filter(k=>digest(before[k])!==digest(after[k])).map(k=>[k,copy(before[k])])),afterStamp:digest(reversalBasis(after))};}
export function previewReversal(p,a){
 const r=a?.applied?.reversal,reason=!r?'This earlier application has no reversal receipt. Use normal model change review.':a.status!=='applied'?'This design is no longer applied.':r.afterStamp!==digest(reversalBasis(p))?'The model or its recorded references changed after application. Review a new coordinated model change to preserve that work.':'';
 return {allowed:!reason,reason,stamp:digest([a?.id,a?.revision,r?.afterStamp,reversalBasis(p)]),domains:Object.keys(r?.before||{}),records:a?.changes?.map(c=>({id:c.source.id,title:c.source.title,action:c.source.isNew?'Remove created object':'Restore previous definition'}))||[],before:r?.before||{}};
}
function counters(prior,current){if(typeof prior==='number'&&typeof current==='number')return Math.max(prior,current);if(prior&&typeof prior==='object')return Object.fromEntries([...new Set([...Object.keys(prior),...Object.keys(current||{})])].map(k=>[k,counters(prior[k]||0,current?.[k]||0)]));return current??prior;}
export function applyReversal(input,raw,at){
 const p=copy(input),a=p.modelAlternatives?.records?.find(x=>x.id===raw.id);if(!a)throw Error('Choose the applied alternative.');const q=previewReversal(p,a);
 if(!q.allowed)throw Error(q.reason);if(q.stamp!==raw.previewStamp||a.revision!==raw.alternativeRevision)throw Error('The reversal changed. Review it again.');
 if(raw.reviewed!==true||!String(raw.reviewer||'').trim()||!String(raw.reason||'').trim())throw Error('Review the reversal and record the reviewer and rationale.');
 const review={at,reviewer:String(raw.reviewer).trim().slice(0,180),reason:String(raw.reason).trim().slice(0,4000),records:q.records};
 for(const [key,before] of Object.entries(a.applied.reversal.before)){const current=p[key];p[key]=copy(before);for(const k of ['counter','counters'])if(current[k]!==undefined)p[key][k]=counters(before[k],current[k]);if(typeof current.version==='number')p[key].version=current.version+1;}
 a.status='reverted';a.revision++;a.reverted=review;a.history.push({at,event:'Reversed working design',note:review.reason,reviewer:review.reviewer});
 const t=p.coauthoring?.designTasks?.find(x=>x.id===a.taskId);if(t){t.status='dismissed';t.revision++;t.reverted=copy(review);t.history.push({at,event:'Reversed accepted design',note:review.reason,reviewer:review.reviewer});}
 p.changes.events.push({id:'CHG-'+String(++p.changes.counter).padStart(3,'0'),source:{id:a.id,ref:a.id,chapter:4,title:a.name},title:'Reversed '+a.name,at,before:{status:'applied'},after:{status:'reverted'},fields:[],items:[],preview:{reviewed:true},proposal:{alternativeId:a.id,...review}});
 return {document:p,selected:a.id};
}
