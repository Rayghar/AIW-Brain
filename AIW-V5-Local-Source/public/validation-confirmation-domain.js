import {contractReviewCurrent,dataReviewCurrent} from './interfaces-domain.js';
import {applyInterfacesCommand} from './interfaces-domain.js';
import {applyRequirementsCommand} from './requirement-commands.js';
import {applyCanonical} from './canonical-command.js';
import {digest} from './brain-integrity.js';
export function confirmationCandidates(p, chapter, {ids=null}={}) {
  const rows=[],add=(records,type,label,done,patch)=>{for(const r of records||[])if(!done(r)&&(!ids||ids.has(r.id)))rows.push({id:r.id,ref:r.ref||r.code||r.id,title:r.title||r.description||r.id,type,label,record:r,patch:patch(r)});};
  if(chapter===1)add((p.artefacts||[]).filter(r=>r.type==='requirement'),'requirements.confirm','Confirm the requirement definition',r=>r.confirmed,()=>({}));
  if(chapter===2)add(p.quality?.drivers,'quality.driver','Confirm the driver definition; target confirmation stays unchanged',r=>r.confirmed,()=>({confirmed:true}));
  if(chapter===4)add(p.logical?.responsibilities,'logical.responsibility','Confirm the responsibility and its current inputs',r=>r.confirmed,()=>({confirmed:true}));
  if(chapter===5)add(p.realisation?.components,'realisation.component','Mark the component design reviewed; assumptions stay unchanged',r=>r.status==='reviewed',()=>({status:'reviewed'}));
  if(chapter===6)add(p.technology?.needs,'technology.needs','Confirm this application capability need',r=>r.confirmed,()=>({confirmed:true}));
  if(chapter===8)add([...(p.interfaces?.contracts||[]),...(p.interfaces?.data||[])],'interfaces.record-review','Record definition review; no test or approval is implied',r=>r.fields?dataReviewCurrent(p,r):contractReviewCurrent(p,r),()=>({}));
  if(chapter===10)add(p.runtime?.environments,'runtime.environment','Confirm the recorded environment scope and basis',r=>r.confirmed,()=>({confirmed:true}));
  return rows;
}

function nativeConfirmationCommands(p,chapter,selected,{reviewed=false,reviewer='',evidence='',basis,allowedIds=null}={}) {
  if(reviewed!==true||!String(reviewer).trim()||!String(evidence).trim())throw Error('Name the reviewer, record the review basis, and explicitly confirm the selected definitions.');
  if(typeof reviewer!=='string'||reviewer.length>180||typeof evidence!=='string'||evidence.length>2000)throw Error('Use a reviewer name up to 180 characters and review basis up to 2,000 characters.');
  if(basis!==digest(p))throw Error('The project changed. Reopen the review and inspect the current records.');
  if(!Array.isArray(selected)||!selected.length||selected.length>20||new Set(selected).size!==selected.length)throw Error('Review and select 1–20 distinct records.');
  const candidates=confirmationCandidates(p,chapter,{ids:allowedIds}),chosen=selected.map(id=>candidates.find(x=>x.id===id));
  if(chosen.some(x=>!x))throw Error('A selected record is outside this review or no longer needs this confirmation.');
  const commands=[],needs=new Map(),requirements=[];
  for(const x of chosen){
    if(x.type==='requirements.confirm'){requirements.push(x.id);continue;}
    if(x.type==='technology.needs'){if(!needs.has(x.record.applicationId))needs.set(x.record.applicationId,new Set());needs.get(x.record.applicationId).add(x.id);continue;}
    commands.push({type:x.type,payload:{id:x.id,...x.patch,...(x.type==='interfaces.record-review'?{reviewed:true,reviewer:reviewer.trim(),evidence:evidence.trim()}: {})}});
  }
  if(requirements.length)commands.push({type:'requirements.confirm',payload:{ids:requirements,count:requirements.length,reviewed:true}});
  for(const [applicationId,ids] of needs)commands.push({type:'technology.needs',payload:{applicationId,needs:(p.technology?.needs||[]).filter(n=>n.applicationId===applicationId).map(n=>({...n,...(ids.has(n.id)?{confirmed:true}:{})}))}});
  return commands;
}


export function confirmationPlan(p,chapter,ids,options={}) {
 nativeConfirmationCommands(p,chapter,ids,options);
 return {type:'validation.confirm',payload:{chapter,ids,reviewed:true,reviewer:options.reviewer.trim(),evidence:options.evidence.trim(),basis:options.basis}};
}
export function applyValidationConfirmationCommand(input,command,at=new Date().toISOString(),actor='') {
 if(command.type!=='validation.confirm')throw Error('Unknown record confirmation action.');
 if(!actor)throw Error('A signed-in reviewer is required.');
 const raw=command.payload||{},commands=nativeConfirmationCommands(input,Number(raw.chapter),raw.ids,raw);
 let p=input,selected=null;
 for(const c of commands){const result=c.type==='requirements.confirm'?applyRequirementsCommand(p,c,at,actor):c.type==='interfaces.record-review'?applyInterfacesCommand(p,c,at):applyCanonical(p,c,at,actor);p=result.document;selected=result.selected||selected;}
 p.workbench??={version:1,alternatives:[],analyses:[],catalogue:[],views:[],assignments:[]};p.workbench.history??=[];
 p.workbench.history.push({at,actor,commands,changed:[...raw.ids],affected:[],reason:'Record confirmation by '+raw.reviewer.trim()+': '+raw.evidence.trim(),stamp:raw.basis,author:{kind:'human',account:actor,reviewed:true}});
 return {document:p,selected};
}
