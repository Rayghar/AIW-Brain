// A revision of an external model is reconciled with the saved source and native records.
// Identity comes from explicit source identifiers and reviewed bindings, never names or parser order.
import {interpretModel,modelCounts,MODEL_LIMIT,MODEL_RULES} from './model-interpreter.js';
import {digest,sha256} from './brain-integrity.js';
import {applyCanonical} from './canonical-command.js';
import {applyEvidenceCommand} from './evidence-domain.js';

const lists=[
 ['artefact',1,p=>p.artefacts,{title:'name',description:'description'}],
 ['logical.responsibility',4,p=>p.logical?.responsibilities,{title:'name',purpose:'description'}],
 ['realisation.component',5,p=>p.realisation?.components,{title:'name',purpose:'description'}],
 ['technology.capability',6,p=>p.technology?.capabilities,{title:'name',purpose:'description'}],
 ['interfaces.data',8,p=>p.interfaces?.data,{title:'name',purpose:'description'}],
 ['interfaces.party',8,p=>p.interfaces?.parties,{title:'name',purpose:'description'}],
 ['runtime.environment',10,p=>p.runtime?.environments,{title:'name',purpose:'description'}],
 ['logical.connection',4,p=>p.logical?.connections,{label:'label',from:'from',to:'to'},true],
 ['realisation.interaction',5,p=>p.realisation?.connections,{label:'label',from:'from',to:'to'},true],
 ['interfaces.contract',8,p=>p.interfaces?.contracts,{title:'label',from:'from',to:'to'},true]
];
const text=(x,n=2000)=>typeof x==='string'?x.trim().slice(0,n):'';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sourceOf=(p,id)=>{const s=p.coauthoring?.sources?.find(s=>s.id===id&&s.kind==='model');if(!s?.text||sha256(s.text)!==s.hash)throw Error('Choose a saved model whose original text still matches its digest.');return s;};
export function reconciliationTargets(p){return lists.flatMap(([command,chapter,get,fields,relationship])=>(get(p)||[]).filter(r=>r.status!=='retired').map(record=>({id:record.id,title:record.title||record.label||record.id,chapter,command,record,relationship:!!relationship,fields:Object.fromEntries(Object.entries(fields).filter(([f])=>typeof record[f]==='string'))})));}
// Bindings travel with source history, including restored projects. They cannot
// expand the canonical field mapping or silently change their reviewed source kind.
function bindingIssue(binding,target){
 if(binding.command!==target.command||typeof binding.sourceKind!=='string'||!binding.sourceKind)return 'The saved link no longer identifies its reviewed command and source kind. Unlink it and review the identities again.';
 if(!binding.fields||typeof binding.fields!=='object'||Array.isArray(binding.fields)||!Object.keys(binding.fields).length||Object.entries(binding.fields).some(([field,sourceField])=>!Object.hasOwn(target.fields,field)||target.fields[field]!==sourceField))return 'The saved link contains an unsupported field mapping. Unlink it and review the supported fields before relinking.';
 return '';
}
function indexModel(text,name,format){
 const model=interpretModel(text,{name,format}),records=[],keys=new Map(),byId=new Map();
 for(const [values,kind] of [[model.elements,'element'],[model.relationships,'relationship']])for(const r of values){const ref=typeof r.attrs?.ref==='string'?r.attrs.ref.trim():'',key=ref?kind+':'+ref:null,row={...r,key,relationship:kind==='relationship',title:r.name||r.label||r.id};records.push(row);byId.set(r.id,row);if(key){if(keys.has(key))keys.set(key,null);else keys.set(key,row);}}
 return {model,records,keys,byId,unidentified:records.filter(r=>!r.key),duplicates:[...keys].filter(([,r])=>!r).map(([key])=>key)};
}
export function modelSourceIndex(p,sourceId){const s=sourceOf(p,sourceId),x=indexModel(s.text,s.name,s.format);return {...x,source:s,targets:reconciliationTargets(p),bindings:s.modelBindings||[]};}
const fieldValue=(x,row,field,bindings,targets)=>{
 if(!['from','to'].includes(field))return row?.[field]??'';
 const end=x.byId.get(row?.[field]);if(!end?.key||x.keys.get(end.key)!==end)return null;
 const matches=bindings.filter(b=>b.key===end.key&&b.sourceKind===end.kind&&targets.some(t=>t.id===b.objectId&&!t.relationship&&!bindingIssue(b,t)));
 return matches.length===1?matches[0].objectId:null;
};
export function modelBindingPreview(p,{sourceId,key,objectId,remove=false}={}){
 const x=modelSourceIndex(p,sourceId),foreign=x.keys.get(key),target=x.targets.find(t=>t.id===objectId),old=x.bindings.find(b=>b.key===key&&b.objectId===objectId);
 if(remove){if(!old)throw Error('Choose a saved source identity link.');}
 else {if(!foreign||!target||foreign.relationship!==target.relationship)throw Error('Link one unambiguous external identity to an existing record of the same object or relationship class.');if(old)throw Error('These identities are already linked.');if(x.bindings.some(b=>b.objectId===objectId))throw Error('This record already has an identity in this source. Remove that link before replacing it.');if(!Object.keys(target.fields).length)throw Error('This record has no supported source fields.');if(x.bindings.length>=500)throw Error('One model source supports up to 500 reviewed identity links.');}
 const binding=remove?old:{key,objectId,command:target.command,fields:target.fields,sourceKind:foreign.kind,sourceValues:Object.fromEntries(Object.entries(target.fields).map(([f,sf])=>[f,fieldValue(x,foreign,sf,x.bindings,x.targets)])),localValues:Object.fromEntries(Object.keys(target.fields).map(f=>[f,target.record[f]??'']))};
 return {binding,remove,sourceId,stamp:digest([p.id,sourceId,x.source.hash,x.source.versions.at(-1)?.revision,x.bindings,target?.record||null,key,objectId,remove])};
}
function incomingFile(raw){
 if(!raw||typeof raw.text!=='string'||!raw.text.trim()||raw.text.length>MODEL_LIMIT)throw Error('Choose a model file with 1–2,000,000 characters of readable text.');
 const name=text(raw.name,180).replace(/^.*[\\/]/,'').replace(/[\u0000-\u001f\u007f]/g,'');if(!name)throw Error('Name the incoming model file.');
 const x=indexModel(raw.text,name,text(raw.format||raw.kind,40));if(x.model.format==='unknown'||!x.model.elements.length)throw Error('The file did not contain a supported readable model.');
 return {...x,text:raw.text,name,hash:sha256(raw.text),format:x.model.format};
}
export function modelRevisionPreview(p,{sourceId,incoming}={}){
 const base=modelSourceIndex(p,sourceId),next=incomingFile(incoming);if(base.model.format!==next.format)throw Error('Use the same model format for a revision. A different format starts a separately identified source.');
 const rows=[],bound=new Set(base.bindings.map(b=>b.key));
 for(const b of base.bindings){const target=base.targets.find(t=>t.id===b.objectId),old=base.keys.get(b.key),fresh=next.keys.get(b.key),issue=target?bindingIssue(b,target):'';
  if(!target||issue||!old||!fresh||old.kind!==b.sourceKind||fresh.kind!==b.sourceKind){rows.push({id:b.key+'|'+b.objectId,key:b.key,objectId:b.objectId,title:target?.title||b.objectId,state:!target?'missing-target':issue?'invalid-binding':next.keys.has(b.key)&&!fresh?'ambiguous':!fresh?'source-removed':'type-changed',fields:[],reason:!target?'The linked AIW record is unavailable.':issue||(!fresh?'The original identifier is absent or ambiguous in this revision. Keep the AIW record, or review its lifecycle in its chapter.':'The external kind no longer matches the reviewed identity link. Keep the AIW record until an explicit unlink and reviewed relink.')});continue;}
  const fields=Object.entries(b.fields).map(([field,sourceField])=>{const previous=Object.hasOwn(b.sourceValues||{},field)?b.sourceValues[field]:fieldValue(base,old,sourceField,base.bindings,base.targets),localBase=b.localValues?.[field]??target.record[field]??'',observed=fieldValue(next,fresh,sourceField,base.bindings,base.targets),current=target.record[field]??'',externalChanged=!same(previous,observed),localChanged=!same(localBase,current);return {id:b.key+'|'+b.objectId+'|'+field,field,sourceField,previous,localBase,current,incoming:observed,state:observed===null?'unresolved':!externalChanged?(localChanged?'local-only':'unchanged'):same(current,observed)?'aligned':localChanged?'conflict':'incoming'};});
  rows.push({id:b.key+'|'+b.objectId,key:b.key,objectId:b.objectId,title:target.title,chapter:target.chapter,command:target.command,state:fields.some(f=>f.state==='conflict')?'conflict':fields.some(f=>f.state==='unresolved')?'unresolved':fields.some(f=>f.state==='incoming')?'incoming':'unchanged',fields});
 }
 const additions=next.records.filter(r=>r.key&&next.keys.get(r.key)===r&&!base.keys.has(r.key)),removals=base.records.filter(r=>r.key&&base.keys.get(r.key)===r&&!next.keys.has(r.key)),unmapped=next.records.filter(r=>!r.key||next.keys.get(r.key)!==r||!bound.has(r.key));
 const stamp=digest([p.id,sourceId,base.source.hash,base.source.versions.at(-1)?.revision,base.bindings,base.targets.filter(t=>base.bindings.some(b=>b.objectId===t.id)).map(t=>t.record),next.hash,MODEL_RULES]);
 return {sourceId,sourceHash:base.source.hash,incoming:{name:next.name,format:next.format,hash:next.hash},stamp,rows,additions:additions.map(r=>({key:r.key,title:r.title,relationship:r.relationship})),removals:removals.map(r=>({key:r.key,title:r.title})),unmapped:unmapped.map(r=>({key:r.key,title:r.title,reason:!r.key?'No stable identifier':next.keys.get(r.key)!==r?'Duplicate identifier':'Not linked to an AIW record'})),omissions:next.model.report.omitted,sourceUnchanged:next.hash===base.source.hash,limits:'Only reviewed identity links and supported fields are compared. New objects, removals, kind changes, absent identifiers and unsupported attributes require chapter review. No record is deleted or approved by importing a source.'};
}
export function applyModelReconciliation(input,command,at=new Date().toISOString(),actor=''){
 const raw=command.payload||{};if(raw.reviewed!==true||!text(raw.reason))throw Error('Review the identity or revision comparison and record your reason.');let p=structuredClone(input),s=sourceOf(p,raw.sourceId);
 if(command.type==='evidence.model-bind'){
  const q=modelBindingPreview(p,raw);if(raw.stamp!==q.stamp)throw Error('The source or linked record changed. Review the identity link again.');
  s.modelBindings=raw.remove?(s.modelBindings||[]).filter(b=>!(b.key===raw.key&&b.objectId===raw.objectId)):[...(s.modelBindings||[]),q.binding];
  s.modelIdentityHistory=[...(s.modelIdentityHistory||[]),{at,actor,key:raw.key,objectId:raw.objectId,event:raw.remove?'Unlinked':'Linked',sourceHash:s.hash,reason:text(raw.reason)}].slice(-200);
  p.coauthoring.version=(p.coauthoring.version||0)+1;return {document:p,selected:s.id};
 }
 if(command.type!=='evidence.model-reconcile')throw Error('Unknown model-source action.');
 const q=modelRevisionPreview(p,raw);if(raw.stamp!==q.stamp)throw Error('The model source or affected design changed. Compare the retained file again.');
 const choices=raw.choices&&typeof raw.choices==='object'&&!Array.isArray(raw.choices)?raw.choices:{},decisions=[],commands=[],appliedCommands=[];
 for(const row of q.rows){if(!row.fields.length){if(choices[row.id]!=='keep')throw Error('Explicitly retain the AIW record for every missing, ambiguous or changed identity.');decisions.push({id:row.id,choice:'keep',state:row.state});continue;}
  const target=reconciliationTargets(p).find(t=>t.id===row.objectId),patch={};
  for(const f of row.fields){if(['unchanged','local-only','aligned'].includes(f.state))continue;const c=choices[f.id];if(!['keep','incoming'].includes(c)||c==='incoming'&&f.state==='unresolved')throw Error('Review each changed field; an unresolved endpoint must stay with the current design.');if(c==='incoming')patch[f.field]=f.incoming;decisions.push({id:f.id,choice:c,state:f.state,before:f.current,incoming:f.incoming});}
  if(Object.keys(patch).length){const cmd={type:row.command,payload:{...target.record,...patch,id:row.objectId,confirmed:false}};p=applyCanonical(p,cmd,at,actor).document;appliedCommands.push(cmd);commands.push({type:cmd.type,id:row.objectId,fields:Object.keys(patch)});}
 }
 s=sourceOf(p,raw.sourceId);const next=incomingFile(raw.incoming),before=s.versions.at(-1);
 if(!q.sourceUnchanged){if(!before.text)Object.assign(before,{text:s.text,hash:s.hash,name:s.name,format:s.format});
  p=applyEvidenceCommand(p,{type:'evidence.source',payload:{id:s.id,title:'Model · '+next.name,location:'Model file '+next.name+' · '+next.format+' · text SHA-256 '+next.hash,version:next.hash.slice(0,16),date:at.slice(0,10),excerpt:next.text,status:'Unconfirmed'}},at,actor).document;
  s=p.coauthoring.sources.find(x=>x.id===raw.sourceId);Object.assign(s,{text:next.text,hash:next.hash,name:next.name,format:next.format});Object.assign(s.versions.at(-1),{text:next.text,hash:next.hash,name:next.name,format:next.format});
 }
 const targets=reconciliationTargets(p);for(const b of s.modelBindings||[]){const row=q.rows.find(r=>r.key===b.key&&r.objectId===b.objectId),r=targets.find(t=>t.id===b.objectId)?.record;if(!row?.fields.length||!r)continue;b.sourceValues=Object.fromEntries(row.fields.map(f=>[f.field,f.incoming]));b.localValues=Object.fromEntries(Object.keys(b.fields).map(f=>[f,r[f]??'']));}
 s.modelReconciliations=[...(s.modelReconciliations||[]),{at,actor,sourceHash:q.sourceHash,incomingHash:next.hash,stamp:q.stamp,reason:text(raw.reason),decisions,commands,unmapped:q.unmapped.length,omissions:q.omissions.length}].slice(-20);
 p.model={...p.model,interpreted:{rules:MODEL_RULES,at,sourceId:s.id,textHash:next.hash,...modelCounts(next.model)}};p.coauthoring.version=(p.coauthoring.version||0)+1;
 return {document:p,selected:s.id,appliedCommands};
}
