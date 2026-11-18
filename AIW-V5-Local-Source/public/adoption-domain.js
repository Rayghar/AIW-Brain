// The adoption record (rc44, wp2 slice S1; audit/rc44/design/wp2-adoption.md §b.1, §b.4, §c): one named record for a
// mechanism applied to the model — a pattern, style, tactic, profile or method — with the definition it pins, the
// records bound to its roles, its parameters, obligations and deviations, who applied it and whether a second signed-in
// person accepted it. p.adoptions {schemaVersion, definition, counter, version, records} is created when the first
// record is written. This slice holds the readers (adoptionReading and its findings), the record's emitter for the
// record graph, the second-person projection, five commands and the tracker; the commands that start, bind, prepare
// and apply an adoption are slice S2's, so every record here was upgraded from an applied guided design task
// (adoption-upgrade.js) and still has that task beside it: the task carries the applied solution the obligation
// readers read (architecture-obligations.js) until S2 and S3 write adoptions of their own.
//
// The steps and who takes them (the package states them at the shared registration point, adoption-package.js):
//   adoption.reassess   {id, revision, reviewed: true, reason}       a signed-in person reads the adoption against the
//                       model as it stands and confirms it. It is the step that puts a person behind a record no
//                       person has stood behind (the lead's ruling F4): an upgraded one, whose applier is a typed
//                       name, and one a project copied from a template carries. It closes an open change (tracker).
//   adoption.accept     {id, revision, deviationIds, note}           a second signed-in person. The one second-person
//                       rule (architecture-obligations.js verifierRefusal) is asked by the boundary on the projection
//                       acceptanceSubject answers, and two persons are asked for (rulings D1, D7.1). The step is kept
//                       under the record's key `review` (ruling F3) with the account kind the boundary hands over;
//                       `accepted` is read (adoptionAccepted), never stored: the status stays 'applied'.
//   adoption.deviation  {id, revision, target: {kind, id}, statement, reason} | {id, revision, deviationId, withdrawn: true, reason}
//   adoption.obligation {id, revision, obligationId, dischargedBy: recordId | null, owner?}
//   adoption.withdraw   {id, revision, reason}                       the records it bound stay; nothing is deleted.
// Every text is bounded and refused past the bound, never cut. Every step appends to the record's history; a step that
// changes what the record says moves its revision, which lapses an acceptance. No knowledge store is read here.
import {verifierRefusal,architectureObligationReading} from './architecture-obligations.js';
import {obligationContent} from './architecture-obligation-basis.js';
import {architectureMethodReceiptStatus} from './composition-manifest.js';
import {COLLECTIONS} from './record-lifecycle.js';
import {forwardTrace} from './trace-kernel.js';
import {remember} from './document-memo.js';

const list=v=>Array.isArray(v)?v:[],plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v),pad=(n,w)=>String(n).padStart(w,'0');
export const ADOPTION_LIMITS=Object.freeze({records:60,deviations:20,text:2000,history:30});
export const adoptionRecords=p=>list(p?.adoptions?.records);
export const adoption=(p,id)=>adoptionRecords(p).find(a=>a?.id===id)||null;
const applied=a=>a?.status==='applied';
const words=(v,what)=>{if(typeof v!=='string'||!v.trim())throw Error(what);if(v.length>ADOPTION_LIMITS.text)throw Error('Use at most '+ADOPTION_LIMITS.text+' characters ('+v.length+' were sent); nothing is cut.');return v.trim();};

// ---------------------------------------------------------------- the record's history
// Each entry {n, at, event, actor, revision, note?, causes?}; n counts up for good, so an acceptance can say what it
// had read (review.seq). The entries the second-person projection and the tracker read are never trimmed.
const KEPT=new Set(['upgrade','apply','reassess','facts','bind','parameters','deviation','changed']);
function note(a,event,actor,at,more){
 const h=Array.isArray(a.history)?a.history:a.history=[];
 h.push({n:(h.at(-1)?.n||0)+1,at,event,actor:actor||null,revision:a.revision,...more});
 for(let i=0,extra=h.filter(x=>!KEPT.has(x.event)).length-ADOPTION_LIMITS.history;extra>0&&i<h.length;)KEPT.has(h[i].event)?i++:(h.splice(i,1),extra--);
}
// The change the tracker recorded that no person has reassessed yet: the last 'changed' entry with no reassess or
// apply after it.
const openChange=a=>{const h=list(a?.history);for(let i=h.length-1;i>=0;i--){if(h[i].event==='changed')return h[i];if(h[i].event==='reassess'||h[i].event==='apply')return null;}return null;};

// ---------------------------------------------------------------- the second person (rulings D1, D7.1, F3, F4)
// What adoption.accept covers, as the one rule reads it: {id, actor, history: [{revision, actor}]}. `actor` is who
// stands behind the applied record: the signed-in applier (slice S2), or, for a record no signed-in person applied
// (an upgraded one, one a template copy carries), the person who first confirmed it here with adoption.reassess.
// `history` names, once each, everyone since the last apply who applied, who confirmed in the applier's place, and
// who changed its facts, bindings, parameters or deviations. Left out (design §c.1): a save that changed none of
// those — discharging an obligation, and a reassessment of a record a signed-in person applied.
const COVERED=new Set(['apply','facts','bind','parameters','deviation']);
export function acceptanceSubject(a){
 const h=list(a?.history),from=h.findLastIndex(x=>x.event==='apply'),native=a?.applied?.actor||null,seen=new Set(),history=[];
 for(const x of from<0?h:h.slice(from))if(x.actor&&(COVERED.has(x.event)||!native&&x.event==='reassess')&&!seen.has(x.actor)){seen.add(x.actor);history.push({revision:x.revision,actor:x.actor});}
 return {id:a?.id,actor:native||history[0]?.actor||null,history};
}
const activeDeviations=a=>list(a?.deviations).filter(d=>!d.withdrawn);
const sameIds=(xs,ys)=>xs.length===ys.length&&xs.every(x=>ys.includes(x));
// A step taken before the project was restored here or copied from a template is history from elsewhere.
const here=(p,at)=>{const from=[p?.finalReview?.imported?.at,p?.workspace?.templateOrigin?.at].filter(Boolean).sort().pop();return !(from&&!(at>from));};
// Whether the stored acceptance stands: a person's step, of the record as it reads (its revision, its deviations),
// with nothing changed or reassessed since, taken in this project, and independent by the one rule on the same
// projection. A status written by hand, an imported step and an agent's step do not count.
export function adoptionAccepted(p,a){
 const r=a?.review;
 return applied(a)&&plain(r)&&r.account==='person'&&!!r.actor&&r.revision===a.revision&&here(p,r.at)&&!list(a.history).some(x=>x.n>r.seq&&(x.event==='changed'||x.event==='reassess'))&&sameIds(list(r.deviationIds),activeDeviations(a).map(d=>d.id))&&!verifierRefusal(acceptanceSubject(a),r.actor,r.account);
}

// ---------------------------------------------------------------- the reading (design §b.4, the part S1 evaluates)
const listAt=(p,path)=>{const [a,b]=path.split('.'),v=b?p?.[a]?.[b]:p?.[a];return Array.isArray(v)?v:[];};
// The document's records by id, across the lifecycle collections (a component's twin under the first path that has it).
const recordIndex=p=>remember(p,'adoption:index','',()=>{const m=new Map();for(const [path,chapter] of COLLECTIONS)for(const r of listAt(p,path))if(r?.id!=null&&!m.has(r.id))m.set(r.id,{record:r,path,chapter});return m;});
const TYPE_PATHS={component:['realisation.components','logical.assets']};
const CONSIDERED=Object.freeze(['recorded facts','bound records and their relations','declared parameters']),NOT_CONSIDERED=Object.freeze(['runtime behaviour','implementation code','measured load','observed operation']);
const name=a=>a.id+' · '+(a.title||a.definition?.definitionId||'applied mechanism');
function read(p,a){
 const def=a.definition||{},snapshot=def.snapshot||{},index=recordIndex(p),retired=new Set(list(p?.retired?.records).map(x=>x?.id)),live=applied(a);
 const current=!def.receipt?.methodId||architectureMethodReceiptStatus(def.receipt).interpretationCurrent;
 const roles=list(snapshot.roles).map(role=>{
  const bound=list(a.bindings).filter(b=>b.roleId===role.id),issues=[];
  for(const b of bound){const at=index.get(b.recordId);if(!at)issues.push(retired.has(b.recordId)?'retired':'removed');else if(TYPE_PATHS[b.recordType]&&!TYPE_PATHS[b.recordType].includes(at.path))issues.push('no longer a '+b.recordType);}
  return {roleId:role.id,required:role.required!==false,state:!bound.length?'unbound':issues.length?'broken':'bound',recordIds:bound.map(b=>b.recordId),issues};
 });
 const obligations=list(a.obligations).map(o=>({id:o.id,state:!live?'withdrawn':o.dischargedBy?'discharged':a.legacy?.taskId&&architectureObligationReading(p,{projectId:p.id,taskId:a.legacy.taskId,solutionId:a.legacy.solutionId,obligationId:o.id})?.state||'open'}));
 const parameters=list(a.parameters).map(x=>({name:x.name,appliesTo:x.appliesTo,state:x.value==null||x.value===''?'open':'stated',unit:x.unit||'unit not stated'}));
 const subject=acceptanceSubject(a),accepted=adoptionAccepted(p,a),change=openChange(a),deviations=activeDeviations(a);
 const next=!live?'':accepted?'':!subject.actor?'No person stands behind '+a.id+' in this project: a signed-in person confirms it as it stands (adoption.reassess), then a second person accepts it (adoption.accept).':change?'A record '+a.id+' rests on changed: a signed-in person reassesses it (adoption.reassess), then a second person accepts it (adoption.accept).':'A second signed-in person, who neither applied '+a.id+' nor changed its facts, bindings, parameters or deviations, accepts it (adoption.accept).';
 const label=!live?String(a.status):accepted?'applied · accepted by '+a.review.actor:!a.applied&&!subject.actor?'applied in another project · not applied or accepted in this project':'applied · not accepted by a second person';
 const findings=[],finding=(code,level,title,detail)=>findings.push({id:code+':'+a.id,code,title,detail,level,objectId:a.id});
 if(live){
  const deviates=id=>deviations.some(d=>d.target?.kind==='role'&&d.target.id===id),rests=ids=>{const os=list(a.obligations).filter(o=>list(o.targetIds).some(id=>ids.includes(id))).map(o=>o.id);return os.length?' Its obligation'+(os.length>1?'s ':' ')+os.join(', ')+' rest'+(os.length>1?'':'s')+' on it.':'';};
  const broken=roles.filter(r=>r.state==='broken'),missing=roles.filter(r=>r.required&&r.state==='unbound'&&!deviates(r.roleId));
  if(broken.length)finding('adoption-role-broken','error','Rebind a role of the applied mechanism',name(a)+': '+broken.map(r=>'the record bound as “'+r.roleId+'” ('+r.recordIds.join(', ')+') is '+r.issues.join(', ')+'.'+rests(r.recordIds)).join(' ')+' Restore the record, or withdraw the adoption and apply the mechanism to the records that stand.');
  if(missing.length)finding('adoption-role-missing','error','Bind every required role of the applied mechanism',name(a)+': no record is bound as '+missing.map(r=>'“'+r.roleId+'”').join(', ')+', and no deviation says why.');
  if(change)finding('adoption-basis','warning','Reassess the applied mechanism',name(a)+' rests on records that changed since it was last read ('+list(change.causes).map(c=>c.id+' '+c.detail).join(', ')+'). A signed-in person reassesses it against the model as it stands.');
  if(accepted===false&&deviations.length)finding('adoption-deviation-unreviewed','warning','Have the deviations of the applied mechanism reviewed',name(a)+': '+deviations.map(d=>d.id).join(', ')+' '+(deviations.length>1?'are':'is')+' not acknowledged by a second signed-in person.');
  if(!accepted)finding('adoption-acceptance','warning','Have the applied mechanism accepted by a second person',name(a)+' is '+label.replace('applied · ','applied and ')+'. '+next);
 }
 return {id:a.id,state:a.status,label,accepted,definition:current?{state:'current',reasons:[]}:{state:'interpretation-changed',reasons:['The architecture method interpretation needs review.']},roles,parameters,obligations,
  deviations:deviations.map(d=>({id:d.id,target:d.target,reviewed:accepted})),acceptance:{accepted,by:accepted?a.review.actor:null,at:accepted?a.review.at:null,next},changed:{required:!!change,since:change?.at||null,causes:list(change?.causes)},
  bounds:{considered:CONSIDERED,notConsidered:NOT_CONSIDERED},findings};
}
// The reading of one adoption, worked out once per settled document.
export const adoptionReading=(p,a)=>remember(p,'adoption:reading',a.id,()=>read(p,a));
// The findings of the applied adoptions (the package states them for Chapter 5: adoption-package.js). None for a
// document without adoptions; draft and prepared records are proposals and withdrawn ones are history.
export const adoptionFindings=p=>adoptionRecords(p).filter(applied).flatMap(a=>adoptionReading(p,a).findings);

// ---------------------------------------------------------------- the record graph (the package's emitter)
// Each applied adoption is one object of the built-in type `pattern`, from its own collection (ruling D7.2), with
// addresses (its requirement), assesses (its driver), binds {role, mode} (its role records) and scopes (its decision
// and the records its applied design wrote). A relation is stated only to a record the document holds: a binding to
// a record that left is a finding, not a broken link.
export function emitAdoptions(p,add,rel){
 const live=adoptionRecords(p).filter(applied);if(!live.length)return;
 const index=recordIndex(p);
 for(const a of live){
  add(a,'pattern','adoptions.records.'+a.id);
  const seen=new Set(),to=(type,id,source,attributes)=>{if(id&&index.has(id)&&!seen.has(id)){seen.add(id);rel(type,a.id,id,attributes?{source,attributes}:{source});}};
  to('addresses',a.scope?.requirementId,'adoptions.records.scope');to('assesses',a.scope?.driverId,'adoptions.records.scope');
  for(const b of list(a.bindings))to('binds',b.recordId,'adoptions.records.bindings',{role:b.roleId,mode:b.mode});
  for(const id of [a.decisionId,...list(a.applied?.records).map(r=>r?.id)])to('scopes',id,'adoptions.records.applied');
 }
}
export const adoptionRelation=e=>String(e?.source).startsWith('adoptions.records');

// ---------------------------------------------------------------- the commands
export function applyAdoptionCommand(p,command,at,actor,options={}){
 const raw=plain(command?.payload)?command.payload:{},type=command?.type,a=adoption(p,raw.id);
 if(!['adoption.reassess','adoption.accept','adoption.deviation','adoption.obligation','adoption.withdraw'].includes(type))throw Error('Unknown adoption action.');
 if(!a)throw Error('Choose an adoption.');
 if(raw.revision!==a.revision)throw Error('This adoption changed. Reopen it; your input is retained.');
 if(!applied(a))throw Error(a.id+' is '+a.status+': it takes no further step.');
 const changed=()=>{a.revision++;a.confirmed=false;};
 if(type==='adoption.reassess'){
  if(raw.reviewed!==true)throw Error('Confirm that you read '+a.id+' against the model as it stands (reviewed).');
  const reason=words(raw.reason,'Record what you read '+a.id+' against.');
  a.confirmed=true;note(a,'reassess',actor,at,{note:reason});
 }else if(type==='adoption.accept'){
  if(adoptionAccepted(p,a))throw Error(a.id+' is already accepted by '+a.review.actor+'.');
  if(openChange(a))throw Error(a.id+' rests on a record that changed since it was last read: a signed-in person reassesses it first (adoption.reassess).');
  const errors=read(p,a).findings.filter(f=>f.level==='error');
  if(errors.length)throw Error(a.id+' has an open error: '+errors.map(f=>f.title).join('; ')+'. Fix it before the adoption is accepted.');
  const ids=activeDeviations(a).map(d=>d.id);
  if(!Array.isArray(raw.deviationIds)||!sameIds(raw.deviationIds,ids))throw Error('Acknowledge each deviation of '+a.id+' by its id: '+(ids.join(', ')||'it has none')+'.');
  const said=raw.note===undefined||raw.note===''?'':words(raw.note,'');
  a.review={actor,at,account:options?.author?.account??null,revision:a.revision,seq:list(a.history).at(-1)?.n||0,note:said,deviationIds:ids};
  note(a,'accept',actor,at);
 }else if(type==='adoption.deviation'){
  if(raw.withdrawn===true){
   const d=activeDeviations(a).find(x=>x.id===raw.deviationId);if(!d)throw Error('Choose a deviation of '+a.id+'.');
   d.withdrawn={by:actor,at,reason:words(raw.reason,'Record the reason for withdrawing the deviation.')};changed();note(a,'deviation',actor,at,{note:d.id+' withdrawn'});
  }else{
   const target=plain(raw.target)?raw.target:{},snapshot=a.definition?.snapshot||{},id=String(target.id??''),prefix=(a.legacy?.taskId||a.id)+':';
   const known={role:list(snapshot.roles).some(r=>r.id===id),obligation:list(a.obligations).some(o=>o.id===id||o.id===prefix+id),parameter:list(a.parameters).some(x=>x.name===id)}[target.kind];
   if(!known)throw Error('Choose a role, an obligation or a parameter of this definition: “'+id+'” is not in it.');
   const statement=words(raw.statement,'Say how the model deviates from the definition.'),reason=words(raw.reason,'Record the reason for the deviation.');
   if(list(a.deviations).length>=ADOPTION_LIMITS.deviations)throw Error(a.id+' holds '+ADOPTION_LIMITS.deviations+' deviations: withdraw the adoption and apply a definition that fits.');
   a.deviations=[...list(a.deviations),{id:a.id+':DEV-'+pad(list(a.deviations).length+1,2),target:{kind:target.kind,id},statement,reason,by:actor,at}];
   changed();note(a,'deviation',actor,at,{note:a.deviations.at(-1).id});
  }
 }else if(type==='adoption.obligation'){
  const o=list(a.obligations).find(x=>x.id===raw.obligationId);if(!o)throw Error('Choose an obligation of '+a.id+'.');
  if(raw.dischargedBy==null)delete o.dischargedBy;
  else{
   const id=String(raw.dischargedBy),bound=list(a.bindings).map(b=>b.recordId);
   const reached=()=>bound.some(b=>Object.values(forwardTrace(p,b)?.layers||{}).some(ids=>ids.includes(id)));
   if(!recordIndex(p).has(id)||!(bound.includes(id)||list(a.applied?.records).some(r=>r?.id===id)||reached()))throw Error('Choose a record of the project that a bound record of '+a.id+' reaches: “'+id+'” is not one.');
   o.dischargedBy={recordId:id,by:actor,at};
  }
  if(raw.owner!==undefined)o.owner=raw.owner===''?'':words(raw.owner,'');
  changed();note(a,'obligation',actor,at,{note:o.id});
 }else{
  const reason=words(raw.reason,'Record the reason for withdrawing '+a.id+'.');
  a.status='withdrawn';changed();note(a,'withdraw',actor,at,{note:reason});
  // The task an upgraded adoption came from stands as applied no longer, so that no reader of the applied solution
  // lists its obligations (as a reversed design's task is marked: model-reversal.js); what was applied stays on it.
  const t=a.legacy?.taskId&&list(p.coauthoring?.designTasks).find(x=>x.id===a.legacy.taskId);
  if(t&&t.status==='applied'){t.status='dismissed';t.revision=(t.revision||0)+1;t.withdrawn={at,actor:actor||null,reason,adoptionId:a.id};(t.history||=[]).push({at,event:'Withdrawn with '+a.id,note:reason});}
 }
 p.adoptions.version=(p.adoptions.version||0)+1;
 return {document:p,selected:a.id};
}
// What adoption.accept acts on, for the boundary's second-person rule.
export const acceptanceOf=(p,command)=>{const a=adoption(p,command?.payload?.id);return a?acceptanceSubject(a):null;};

// ---------------------------------------------------------------- the tracker (design §c.3; ruling D4)
// Called by the server after the built-in trackers for every commit. For a document without applied adoptions it
// returns at once. In the commit that retires, removes, restores or changes a record an applied adoption binds, or
// changes the requirement, driver or decision it rests on, it records the cause on the adoption's history ('changed',
// merged into a change that is still open): the reading then says a person must reassess, and an acceptance no
// longer stands. It moves neither revision, status nor the step on record, and changes no chapter record. A design
// the earlier path reverses (alternative.rollback marks its task) takes its adoption with it.
const content=r=>JSON.stringify(obligationContent(r));
export function trackAdoptionChange(prior,next,command,at){
 const live=adoptionRecords(next).filter(applied);if(!live.length)return;
 const before=recordIndex(prior),after=recordIndex(next),retired=new Set(list(next?.retired?.records).map(x=>x?.id));
 for(const a of live){
  const t=a.legacy?.taskId&&list(next.coauthoring?.designTasks).find(x=>x.id===a.legacy.taskId);
  if(t&&t.status!=='applied'){a.status='reversed';a.revision++;a.confirmed=false;note(a,'reverse',null,at,{note:'The applied design '+t.id+' was reversed.'});next.adoptions.version=(next.adoptions.version||0)+1;continue;}
  const causes=[],watch=[...list(a.bindings).map(b=>['binding',b.recordId]),['requirement',a.scope?.requirementId],['driver',a.scope?.driverId],['decision',a.decisionId]];
  for(const [kind,id] of watch){
   if(!id||causes.some(c=>c.id===id))continue;
   const was=before.get(id),now=after.get(id);
   if(was&&!now)causes.push({kind,id,detail:retired.has(id)?'retired':'removed'});
   else if(!was&&now&&list(prior?.retired?.records).some(x=>x?.id===id))causes.push({kind,id,detail:'restored'});
   else if(was&&now&&content(was.record)!==content(now.record))causes.push({kind,id,detail:'changed'});
  }
  if(!causes.length)continue;
  const open=openChange(a);
  if(open){for(const c of causes)if(!list(open.causes).some(x=>x.kind===c.kind&&x.id===c.id&&x.detail===c.detail))(open.causes||=[]).push(c);}
  else note(a,'changed',null,at,{causes});
 }
}
