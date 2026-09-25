import {applyInterfacesCommand,contract,dataRecord,interfaceFindings,interfaceSources} from './interfaces-domain.js';
import {withFinalReview} from './review-domain.js';
import {changeFingerprint,changeTargetStamp,withChanges} from './changes-domain.js';

const commands=new Set(['interfaces.contract','interfaces.data','interfaces.field','interfaces.remove-field']);
const chapterNames={1:'Requirements',2:'Quality drivers',3:'Decisions',4:'Logical application',5:'Application realisation',7:'Technology realization',8:'Interfaces & Data',9:'Security',10:'Deployment / Runtime'};
const labels={title:'Name',purpose:'Purpose',owner:'Owner',from:'Caller / publisher',to:'Provider / consumer',kind:'Interaction style',protocol:'Protocol',operation:'Operation',contractVersion:'Contract version',correlationKey:'Correlation key',idempotencyKey:'Repeat key',duplicatePolicy:'Duplicate policy',timeoutMs:'Timing target',timeoutBasis:'Timing basis',timeoutConfirmed:'Timing confirmed',timeoutPolicy:'Missing acknowledgement',retryPolicy:'Retry policy',failurePolicy:'Failure response',authorization:'Caller authority',transport:'Transport protection',compatibility:'Compatibility policy',evidence:'Evidence',assumptions:'Assumptions',assumptionsResolved:'Assumptions resolved',authorityId:'Authoritative system',classification:'Classification',retentionPolicy:'Retention policy',retentionDays:'Retention duration',retentionBasis:'Retention basis',retentionConfirmed:'Retention confirmed',protection:'Data protection',exchanges:'Payload definitions'};
const fieldLabels={name:'Name',type:'Type',description:'Meaning',required:'Required',key:'Record key',classification:'Classification',example:'Example',enumeration:'Allowed values',constraints:'Constraints'};
const distinct=xs=>[...new Set(xs)];
export function impactCommand(command){
  if(command?.type==='interfaces.apply-impact')return impactCommand(command.payload?.command);
  if(command?.type==='interfaces.proposal')return {type:(command.payload?.record?.fields||command.payload?.record?.authorityId!==undefined)?'interfaces.data':'interfaces.contract',payload:{...command.payload.record,id:command.payload.objectId}};
  return command;
}
export function impactSource(p,raw){
  const c=impactCommand(raw);if(!commands.has(c?.type))return null;
  const r=c.type==='interfaces.contract'?contract(p,c.payload?.id):dataRecord(p,c.payload?.id);
  return r?{chapter:8,id:r.id,ref:r.ref,title:r.title,kind:r.fields?'data':'contract'}:null;
}
export function interfaceSnapshot(p,s){const r=s.kind==='data'?dataRecord(p,s.id):contract(p,s.id);if(!r)return null;const out={};for(const k of Object.keys(labels))if(Object.hasOwn(r,k))out[k]=k==='exchanges'?r.exchanges.map(x=>({dataId:x.dataId,role:x.role})):r[k];if(r.fields)out.fields=r.fields.map(f=>Object.fromEntries(['id',...Object.keys(fieldLabels)].map(k=>[k,f[k]])));return out;}
export function interfaceDifferences(before,after){
  const result=[];for(const [key,label] of Object.entries(labels))if(JSON.stringify(before?.[key])!==JSON.stringify(after?.[key]))result.push({key,label,before:before?.[key]??null,after:after?.[key]??null});
  const ids=distinct([...(before?.fields||[]),...(after?.fields||[])].map(f=>f.id));
  for(const id of ids){const a=before?.fields?.find(f=>f.id===id),b=after?.fields?.find(f=>f.id===id);if(!a||!b){const describe=f=>f?f.name+' · '+f.type+' · '+(f.required?'Required':'Optional')+(f.key?' · Record key':'')+'\n'+f.description:null;result.push({key:'field:'+id,label:id+' · '+(b||a).name+(a?' removed':' added'),before:describe(a),after:describe(b)});continue;}
    for(const [key,label] of Object.entries(fieldLabels))if(JSON.stringify(a[key])!==JSON.stringify(b[key]))result.push({key:'field:'+id+':'+key,label:id+' · '+(a.name===b.name?a.name:a.name+' → '+b.name)+' / '+label,before:a[key],after:b[key]});
  }return result;
}
export function interfaceLinkedItems(before,after,source){
  const items=new Map();
  function add(p,chapter,r,why,via=[]){if(!r)return;const key=chapter+':'+r.id,prior=items.get(key);if(prior){prior.via=distinct([...prior.via,...via]);if(!prior.reasons.includes(why))prior.reasons.push(why);return;}items.set(key,{key,chapter,chapterTitle:chapterNames[chapter],id:r.id,ref:r.ref||r.id,title:r.title||r.question,why,reasons:[why],via:distinct(via)});}
  for(const p of [after,before]){
    const root=source.kind==='data'?dataRecord(p,source.id):contract(p,source.id);if(!root)continue;
    const dataIds=new Set(source.kind==='data'?[root.id]:root.exchanges.map(x=>x.dataId)),paths=new Map([...dataIds].map(id=>[id,[source.ref]]));
    if(source.kind==='data'){const queue=[...dataIds];while(queue.length){const id=queue.shift();for(const l of p.interfaces.lineage.filter(l=>l.from===id)){if(dataIds.has(l.to))continue;dataIds.add(l.to);queue.push(l.to);paths.set(l.to,[...paths.get(id),l.id]);}}}
    const cs=source.kind==='contract'?[root]:p.interfaces.contracts.filter(c=>c.exchanges.some(x=>dataIds.has(x.dataId))),apps=new Set(),realizations=new Set(),roots=new Set([...dataIds,...cs.map(c=>c.id)]);
    const participant=(id,why,via)=>{const app=p.realisation.components.find(a=>a.id===id),realization=p.technologyRealisation.records.find(a=>a.id===id),external=p.interfaces.parties.find(a=>a.id===id);if(app){apps.add(id);add(p,5,app,why,via);}if(realization){realizations.add(id);add(p,7,realization,why,via);}if(external)add(p,8,external,why+' Confirm any agreement with the external owner.',via);};
    for(const id of dataIds){const d=dataRecord(p,id);add(p,8,d,id===source.id?'This data definition is changing. Review its meaning, stable keys, classification, and dictionary.':'This recorded payload or derivation is linked to the changed definition. Review its mapping and meaning.',paths.get(id));if(d?.authorityId)participant(d.authorityId,'This participant is the recorded authority for '+d.ref+'. Review ownership and authoritative writes.',[...paths.get(id),d.ref]);}
    for(const c of cs){const xs=c.exchanges.filter(x=>dataIds.has(x.dataId)),via=source.kind==='contract'?[source.ref]:distinct(xs.flatMap(x=>[...paths.get(x.dataId),x.id,c.ref]));add(p,8,c,c.id===source.id?'This contract is changing. Review the declared agreement and the compatibility obligations.':'This contract exchanges the changed data through '+xs.map(x=>x.id+' ('+x.role+')').join(', ')+'. Its schema, reference keys, and recorded checks need review.',via);participant(c.from,'This participant '+(c.kind==='event'?'publishes':'calls')+' '+c.ref+'. Review the payload and response assumptions at this boundary.',via);participant(c.to,'This participant '+(c.kind==='event'?'consumes':'provides')+' '+c.ref+'. Review its handling of the declared exchange.',via);}
    if(source.kind==='data')for(const a of p.realisation.components.filter(a=>a.dataIds.some(id=>dataIds.has(id)))){apps.add(a.id);add(p,5,a,'This application declares use of the changed data. Review its reads, writes, and retained copies.',[source.ref,...a.dataIds.filter(id=>dataIds.has(id)).map(id=>dataRecord(p,id)?.ref||id)]);}
    for(const m of p.logical.mappings.filter(m=>apps.has(m.physicalId)))add(p,4,p.logical.responsibilities.find(r=>r.id===m.logicalId),'This responsibility is realized by an affected application. Check its owned behaviour against the changed exchange.',[source.ref,m.id,p.realisation.components.find(a=>a.id===m.physicalId)?.ref||m.physicalId]);
    for(const r of [root,...cs]){const s=interfaceSources(p,r);for(const [chapter,records,why] of [[1,s.requirements,'This requirement is traced through the participating application. Check that the proposed exchange still supports its acceptance criteria.'],[2,s.drivers,'This quality scenario constrains the participating application. Review the measurement and response affected by the exchange.'],[3,s.decisions,'This decision supplies rationale for the participating application. Review whether its assumptions and consequences still hold.']])for(const record of records)add(p,chapter,record,why,[source.ref,r.ref]);}
    const affected=new Set([...roots,...apps,...realizations]);
    for(const c of p.security.controls.filter(c=>c.targetIds.some(id=>affected.has(id))))add(p,9,c,'This control names an affected boundary, data definition, or application. Review enforcement, data exposure, and verification scope.',[source.ref,...c.targetIds.filter(id=>affected.has(id))]);
    for(const r of p.runtime.plans.filter(r=>apps.has(r.assetId)||realizations.has(r.assetId)))add(p,10,r,'This operating plan supports an affected participant. Review rollout order, compatibility, monitoring, and rollback obligations.',[source.ref,r.assetId,...p.runtime.paths.filter(path=>path.environmentId===r.environmentId&&cs.some(c=>c.id===path.contractId)).map(path=>path.id)]);
  }
  return [...items.values()].sort((a,b)=>a.chapter-b.chapter||a.ref.localeCompare(b.ref)).map(item=>({...item,why:item.reasons.join(' '),capturedStamp:changeTargetStamp(after,item),reviews:[]}));
}
function signals(a,b,source){const result=[];const add=(title,detail)=>result.push({title,detail});
  if(source.kind==='data')for(const old of a.fields||[]){const next=b.fields.find(f=>f.id===old.id);if(!next)add('Field removed · '+old.name,'Existing senders or readers may still depend on this field. Check versioning and migration with linked consumers.');else{if(old.name!==next.name)add('Field renamed · '+old.name+' → '+next.name,'The dictionary reference stays '+old.id+'. Existing messages may still use the earlier name; consumer compatibility requires evidence.');if(old.type!==next.type)add('Field type changed · '+old.name,'Check payload validation and conversion in every linked consumer.');if(!old.required&&next.required)add('Field becomes required · '+next.name,'Earlier messages may omit this field. Confirm a migration or default strategy.');if(old.enumeration&&next.enumeration&&old.enumeration.split(/\n|,/).some(v=>!next.enumeration.split(/\n|,/).includes(v)))add('Allowed values narrowed · '+next.name,'Earlier valid values may be rejected. Verify retained messages and each producer.');}}
  if(source.kind==='data')for(const f of b.fields.filter(f=>!(a.fields||[]).some(old=>old.id===f.id)&&f.required))add('Required field added · '+f.name,'Earlier messages may lack the new field. Review producer rollout and compatibility.');
  if(source.kind==='contract'&&['from','to','kind','protocol','operation','exchanges'].some(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])))add('Exchange boundary or payload changed','Check both participants, version compatibility, and runtime routing against the proposed agreement.');
  if(['classification','protection','authorization','transport','authorityId','retentionPolicy'].some(k=>a[k]!==b[k]))add('Ownership or protection obligation changed','Review the recorded authority, relevant controls, and operating evidence. The model cannot establish live enforcement.');
  return result;
}
export function interfaceFindingDelta(before,after){const a=interfaceFindings(before),b=interfaceFindings(after),same=(x,y)=>x.id===y.id&&x.detail===y.detail;return {introduced:b.filter(f=>!a.some(old=>same(old,f))),resolved:a.filter(f=>!b.some(next=>same(next,f))),existing:b.filter(f=>a.some(old=>same(old,f))).length};}
export function interfaceImpactStamp(p,command){return changeFingerprint([p.id,p.contentVersion,...['quality','decisions','logical','realisation','technology','technologyRealisation','interfaces','security','runtime'].map(k=>p[k]?.version),impactCommand(command)]);}
export function previewInterfaceChange(input,raw,at=new Date().toISOString()){
  const command=impactCommand(raw),source=impactSource(input,command);if(!source)throw Error('Choose an existing interface or data definition to preview.');
  const before=interfaceSnapshot(input,source),result=applyInterfacesCommand(input,command,at),afterProject=withFinalReview(result.document),after=interfaceSnapshot(afterProject,source),fields=interfaceDifferences(before,after);if(!fields.length)throw Error('No definition changes to preview. Edit a value first.');
  return {command:structuredClone(command),source:{...source,title:after.title},before,after,fields,items:interfaceLinkedItems(input,afterProject,source),findings:interfaceFindingDelta(input,afterProject),signals:signals(before,after,source),stamp:interfaceImpactStamp(input,command),document:afterProject,selected:result.selected};
}
export function applyInterfaceImpact(input,command,at){
  const raw=command.payload||{};if(raw.reviewed!==true)throw Error('Review the proposed change and its linked records before applying it.');
  const preview=previewInterfaceChange(input,raw.command,at);if(raw.previewStamp!==preview.stamp)throw Error('The model or proposal changed. Refresh the impact preview before applying it.');return {document:preview.document,selected:preview.source.id};
}
export function rebaseInterfaceChange(p,preview){
  const c=structuredClone(preview.command),s=preview.source,latest=interfaceSnapshot(p,s),conflicts=[];
  if(!latest)throw Error('The source definition was removed. Your proposal is still available for inspection; it cannot be applied.');
  const merge=(old,proposed,current,keys)=>{const result={...current};for(const key of keys)if(JSON.stringify(old?.[key])!==JSON.stringify(proposed?.[key])){if(JSON.stringify(current?.[key])!==JSON.stringify(old?.[key])&&JSON.stringify(current?.[key])!==JSON.stringify(proposed?.[key]))conflicts.push({label:fieldLabels[key]||labels[key]||key,before:old?.[key],current:current?.[key],proposed:proposed?.[key]});result[key]=proposed?.[key];}return result;};
  if(c.type==='interfaces.field'&&c.payload.field.id){const id=c.payload.field.id,old=preview.before.fields.find(f=>f.id===id),proposed=preview.after.fields.find(f=>f.id===id),current=latest.fields.find(f=>f.id===id);if(!current)throw Error('This field was removed. Your proposed wording is retained; choose how to recreate or discard it.');c.payload.field=merge(old,proposed,current,Object.keys(fieldLabels));}
  else if(c.type==='interfaces.remove-field'){const id=c.payload.fieldId,current=latest.fields.find(f=>f.id===id),old=preview.before.fields.find(f=>f.id===id);if(!current)throw Error('This field has already been removed. Inspect the current model and dismiss this proposal.');if(JSON.stringify(current)!==JSON.stringify(old))conflicts.push({label:'Field selected for removal',current:JSON.stringify(current,null,2),proposed:'Remove this field'});}
  else if(c.type!=='interfaces.field')c.payload={...merge(preview.before,preview.after,latest,Object.keys(labels)),id:s.id};
  return {command:c,conflicts};
}
export function trackInterfaceChange(before,after,raw,at){
  let command=impactCommand(raw);if(raw.type==='interfaces.proposal'){const record=contract(before,raw.payload.objectId)||dataRecord(before,raw.payload.objectId);command={type:record?.fields?'interfaces.data':'interfaces.contract',payload:{...raw.payload.record,id:raw.payload.objectId}};}
  const source=impactSource(before,command);if(!source)return;
  const a=interfaceSnapshot(before,source),b=interfaceSnapshot(after,source),fields=interfaceDifferences(a,b);if(!fields.length)return;
  withChanges(after);after.changes.events.push({id:'CHG-'+String(++after.changes.counter).padStart(3,'0'),source:{...source,title:b.title},title:b.title,at,before:a,after:b,fields,items:interfaceLinkedItems(before,after,source),preview:{reviewed:raw.type==='interfaces.apply-impact',findings:interfaceFindingDelta(before,after),signals:signals(a,b,source)}});
}
