// The adoption record (rc44, wp2 slice S1; audit/rc44/design/wp2-adoption.md §b.1, §b.4, §c; the lead's rulings of
// 2026-11-18 and 2026-11-19, sections D, F and J): one named record for a mechanism applied to the model — a pattern,
// style, tactic, profile, method or released design concern — with the definition it pins, the records bound to its
// roles, its parameters, obligations and deviations, who applied it and whether a second signed-in person accepted it.
// p.adoptions {schemaVersion, definition, counter, version, records} is created when the first record is written. This
// slice holds the readers (adoptionReading and its findings), the record's emitter for the record graph, what the
// record says to the design fingerprint, the second-person projection, three commands and the tracker; the commands
// that start, bind, prepare and apply an adoption are slice S2's, so every record here was upgraded from an applied
// guided design task (adoption-upgrade.js) and still has that task beside it: the task carries the applied solution
// the obligation readers read (architecture-obligations.js) until S2 and S3 write adoptions of their own.
//
// The steps and who takes them (the package states them at the shared registration point, adoption-package.js):
//   adoption.reassess   {id, revision, reviewed: true, reason}       a signed-in person reads the adoption against the
//                       model as it stands and confirms it. It is the step that puts a person behind a record no
//                       person has stood behind (ruling F4): one the upgrade wrote, and one a project copied from a
//                       template carries. It closes an open change (the tracker's).
//   adoption.accept     {id, revision, deviationIds, note}           a second signed-in person. The one second-person
//                       rule (architecture-obligations.js verifierRefusal) is asked by the boundary on the projection
//                       acceptanceSubject answers, and two persons are asked for (rulings D1, D7.1, J1). The step is
//                       kept under the record's key `review` (ruling F3) with the account kind the boundary hands over;
//                       `accepted` is read (adoptionAccepted), never stored: the status stays 'applied'. It is refused
//                       while the earlier path's finding for the same design stands (ruling J6).
//   adoption.deviation  {id, revision, target: {kind, id}, statement, reason} | {id, revision, deviationId, withdrawn: true, reason}
// Held back while the earlier path still holds what they would write a second time (ruling J6): adoption.obligation
// (slice S2, with the obligation readers) and adoption.withdraw (slice S3, with the reversal of an applied design).
// Every text is bounded and refused past the bound, never cut. Every step appends to the record's history; a step that
// changes what the record says moves its revision, which lapses an acceptance. Knowledge is read only through the
// existing rule for released knowledge a receipt pins (knowledge-governance.js claimReceiptCurrent, withdrawn): no
// candidate or unreleased claim reaches a reading here.
import {verifierRefusal,architectureObligationReading} from './architecture-obligations.js';
import {obligationContent} from './architecture-obligation-basis.js';
import {architectureMethodReceiptStatus} from './composition-manifest.js';
import {claimReceiptCurrent,withdrawn,BRAIN_PLAYBOOK} from './knowledge-governance.js';
import {designTaskFindings} from './design-task-state.js';
import {withChanges} from './changes-domain.js';
import {COLLECTIONS} from './record-lifecycle.js';
import {remember} from './document-memo.js';

const list=v=>Array.isArray(v)?v:[],plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v),pad=(n,w)=>String(n).padStart(w,'0');
export const ADOPTION_LIMITS=Object.freeze({records:60,deviations:20,text:2000,history:30});
export const adoptionRecords=p=>list(p?.adoptions?.records);
export const adoption=(p,id)=>adoptionRecords(p).find(a=>a?.id===id)||null;
const applied=a=>a?.status==='applied';
const words=(v,what)=>{if(typeof v!=='string'||!v.trim())throw Error(what);if(v.length>ADOPTION_LIMITS.text)throw Error('Use at most '+ADOPTION_LIMITS.text+' characters ('+v.length+' were sent); nothing is cut.');return v.trim();};
const name=a=>a.id+' · '+(a.title||a.definition?.definitionId||'applied mechanism');
// The task an upgraded adoption was written from, while the document still holds it.
const taskOf=(p,a)=>a?.legacy?.taskId&&list(p?.coauthoring?.designTasks).find(t=>t?.id===a.legacy.taskId)||null;

// ---------------------------------------------------------------- the record's history
// Each entry {n, at, event, actor, revision, note?, causes?, changeId?, identity?}; n counts up for good, so an
// acceptance can say what it had read (review.seq). The entries the second-person projection and the tracker read are
// never trimmed. The history is bookkeeping: to the authorship stamps and to the design fingerprint alike.
const KEPT=new Set(['upgrade','apply','reassess','facts','bind','parameters','deviation','changed']);
function note(a,event,actor,at,more){
 const h=Array.isArray(a.history)?a.history:a.history=[];
 h.push({n:h.reduce((n,x)=>Math.max(n,x?.n||0),0)+1,at,event,actor:actor||null,revision:a.revision,...more});
 for(let i=0,extra=h.filter(x=>!KEPT.has(x.event)).length-ADOPTION_LIMITS.history;extra>0&&i<h.length;)KEPT.has(h[i].event)?i++:(h.splice(i,1),extra--);
}
// The change the tracker recorded that no person has reassessed yet: the last 'changed' entry with no reassess or
// apply by a person after it.
const openChange=a=>{const h=list(a?.history);for(let i=h.length-1;i>=0;i--){if(h[i].event==='changed')return h[i];if(h[i].event==='reassess'||h[i].event==='apply'&&!h[i].identity)return null;}return null;};

// ---------------------------------------------------------------- who applied (ruling J1)
// An adoption written from a design the earlier path applied names the change events of that apply
// (applied.changeIds). The server stamps every event with who sent the commit and of what kind (worker.js), so the
// journal says who applied the design. journalApplier answers every actor those events name, and the signed-in person
// among them who applied it: one actor, every event a person's commit and not an agent account's. An event that names
// an actor without saying it was a person's commit names nobody as the applier; that actor is still named to the
// second-person rule.
export function journalApplier(p,a){
 const ids=new Set(list(a?.applied?.changeIds)),events=ids.size?list(p?.changes?.events).filter(e=>e&&ids.has(e.id)&&e.actor):[],actors=[...new Set(events.map(e=>e.actor))];
 return {actors,person:actors.length===1&&events.every(e=>e.authorKind==='person'&&e.account!=='agent')?actors[0]:null};
}
// The applier put on the record for good, as an entry of its history (bookkeeping: no author stamp, no revision): by
// the upgrade where the journal already says it, else by the first later commit (the tracker) or step.
export const applierEntry=(a,person)=>({at:a.applied?.at??null,event:'apply',actor:person,revision:1,identity:'journal',note:'Named by the change journal ('+list(a.applied?.changeIds).join(', ')+').'});
function nameApplier(p,a){
 if(!plain(a.applied)||a.applied.actor||list(a.history).some(x=>x.event==='apply'))return;
 const {person}=journalApplier(p,a);if(person){const {at,event,...more}=applierEntry(a,person);note(a,event,person,at,more);}
}

// ---------------------------------------------------------------- the second person (rulings D1, D7.1, F3, F4, J1)
// What adoption.accept covers, as the one rule reads it: {id, actor, owner, history: [{revision, actor}]}. `actor` is
// who stands behind the applied record: the signed-in applier (the one on the record, the one the journal named, or
// whom the journal of `p` names now), or, where nobody is named, the person who first confirmed the record here with
// adoption.reassess. `history` names, once each, everyone who applied it (every actor the journal names), and since
// the last apply who confirmed in the applier's place and who changed its facts, bindings, parameters or deviations.
// `owner` is the adoption's: the one rule refuses the owner too. Left out (design §c.1): a save that changed none of
// those — a reassessment of a record whose applier is named. When slice S2 brings the step that discharges an
// obligation, the projection names who discharged one too (ruling J12): the discharge moves the revision, so the
// acceptance covers it.
const COVERED=new Set(['apply','facts','bind','parameters','deviation']);
export function acceptanceSubject(a,p=null){
 const h=list(a?.history),from=h.findLastIndex(x=>x.event==='apply'&&!x.identity),named=h.find(x=>x.event==='apply'&&x.identity==='journal'&&x.actor)?.actor||null;
 const live=!a?.applied?.actor&&!named&&p?journalApplier(p,a):{actors:[],person:null},applier=a?.applied?.actor||named||live.person||null,seen=new Set(),history=[];
 const say=(actor,revision)=>{if(actor&&!seen.has(actor)){seen.add(actor);history.push({revision,actor});}};
 say(applier,1);for(const actor of live.actors)say(actor,1);
 const journal=history.length;
 for(const x of from<0?h:h.slice(from))if(!x.identity&&(COVERED.has(x.event)||!applier&&x.event==='reassess'))say(x.actor,x.revision);
 return {id:a?.id,actor:applier||history[journal]?.actor||null,owner:typeof a?.owner==='string'?a.owner:'',history};
}
const activeDeviations=a=>list(a?.deviations).filter(d=>!d.withdrawn);
const sameIds=(xs,ys)=>xs.length===ys.length&&xs.every(x=>ys.includes(x));
// A step taken before the project was restored here or copied from a template is history from elsewhere.
const here=(p,at)=>{const from=[p?.finalReview?.imported?.at,p?.workspace?.templateOrigin?.at].filter(Boolean).sort().pop();return !(from&&!(at>from));};
// Whether the stored acceptance stands: a person's step, of the record as it reads (its revision, its deviations),
// with nothing changed or reassessed since, taken in this project, of a definition whose knowledge is still current,
// and independent by the one rule on the same projection. A status written by hand, an imported step and an agent's
// step do not count. Nor is there a second truth beside the earlier path (ruling J6): an adoption is not read as
// accepted while that path's finding for the same design stands, and an acceptance given before that path re-read the
// design's sources (architecture.refresh: the task's sourceReview) does not stand again; a second person accepts the
// design as re-read.
export function adoptionAccepted(p,a){
 const r=a?.review;
 return applied(a)&&plain(r)&&r.account==='person'&&!!r.actor&&r.revision===a.revision&&here(p,r.at)&&!list(a.history).some(x=>x.n>r.seq&&(x.event==='changed'||x.event==='reassess'))&&sameIds(list(r.deviationIds),activeDeviations(a).map(d=>d.id))&&definitionOf(p,a).state!=='withdrawn'&&!basisFinding(p,a)&&!(taskOf(p,a)?.sourceReview?.at>r.at)&&!verifierRefusal(acceptanceSubject(a,p),r.actor,r.account);
}

// ---------------------------------------------------------------- the definition's standing (ruling J4)
// A definition is current only if its knowledge is. The released knowledge a definition pins is in its receipts: the
// claim a released design concern rests on, and the claims its design consulted. Each is read with the existing rule
// (claimReceiptCurrent: the release is active, the claim and its source are what was reviewed), and the sources its
// method names with the existing withdrawal reading, as the obligation basis reads them
// (architecture-obligation-basis.js). A built-in definition's own reading is its interpretation, as before.
function definitionOf(p,a){
 const receipt=a?.definition?.receipt,claims=[...list(a?.legacy?.governedKnowledge),receipt?.governedConcern?.receipt].filter(r=>r&&r.claimId),reasons=[];
 const sources=[...claims.flatMap(r=>[r.sourceId,r.claimId,r.releaseId]),receipt?.packId,receipt?.methodId,receipt?.sources?.method?.id,...list(receipt?.sources?.references).map(r=>r?.id),...(receipt?.sources?.method?.file||receipt?.sources?.file?['SA-PLAYBOOK',BRAIN_PLAYBOOK.id]:[])].filter(Boolean);
 if(claims.some(r=>!claimReceiptCurrent(p,r)))reasons.push('A reviewed source interpretation changed or is no longer eligible.');
 if(sources.length&&withdrawn(p,sources).length)reasons.push('A source supporting this definition was withdrawn.');
 if(reasons.length)return {state:'withdrawn',reasons};
 return !receipt?.methodId||architectureMethodReceiptStatus(receipt).interpretationCurrent?{state:'current',reasons:[]}:{state:'interpretation-changed',reasons:['The architecture method interpretation needs review.']};
}
// The earlier path's finding for the same design, while it stands (ruling J6): its sources changed, and
// architecture.refresh is still the step that re-reads them (retired for a task with an adoption in slice S3).
const basisFinding=(p,a)=>taskOf(p,a)?.status==='applied'&&remember(p,'adoption:earlier','',()=>designTaskFindings(p)).find(f=>f.id==='design-source:'+a.legacy.taskId)||null;

// ---------------------------------------------------------------- the reading (design §b.4, the part S1 evaluates)
const listAt=(p,path)=>{const [a,b]=path.split('.'),v=b?p?.[a]?.[b]:p?.[a];return Array.isArray(v)?v:[];};
// The document's records by id, across the lifecycle collections (a component's twin under the first path that has it).
const recordIndex=p=>remember(p,'adoption:index','',()=>{const m=new Map();for(const [path,chapter] of COLLECTIONS)for(const r of listAt(p,path))if(r?.id!=null&&!m.has(r.id))m.set(r.id,{record:r,path,chapter});return m;});
const TYPE_PATHS={component:['realisation.components','logical.assets']};
const CONSIDERED=Object.freeze(['recorded facts','bound records and their relations','declared parameters']),NOT_CONSIDERED=Object.freeze(['runtime behaviour','implementation code','measured load','observed operation']);
function read(p,a){
 const snapshot=a.definition?.snapshot||{},index=recordIndex(p),retired=new Set(list(p?.retired?.records).map(x=>x?.id)),live=applied(a),definition=definitionOf(p,a),source=live?basisFinding(p,a):null;
 const roles=list(snapshot.roles).map(role=>{
  const bound=list(a.bindings).filter(b=>b.roleId===role.id),issues=[];
  for(const b of bound){const at=index.get(b.recordId);if(!at)issues.push(retired.has(b.recordId)?'retired':'removed');else if(TYPE_PATHS[b.recordType]&&!TYPE_PATHS[b.recordType].includes(at.path))issues.push('no longer a '+b.recordType);}
  return {roleId:role.id,required:role.required!==false,state:!bound.length?'unbound':issues.length?'broken':'bound',recordIds:bound.map(b=>b.recordId),issues};
 });
 const obligations=list(a.obligations).map(o=>({id:o.id,state:!live?'closed':a.legacy?.taskId&&architectureObligationReading(p,{projectId:p.id,taskId:a.legacy.taskId,solutionId:a.legacy.solutionId,obligationId:o.id})?.state||'open'}));
 const parameters=list(a.parameters).map(x=>({name:x.name,appliesTo:x.appliesTo,state:x.value==null||x.value===''?'open':'stated',unit:x.unit||'unit not stated'}));
 const subject=acceptanceSubject(a,p),accepted=adoptionAccepted(p,a),change=openChange(a),deviations=activeDeviations(a);
 // What must happen next, in a reader's words (no surface offers the steps before slice S3: ruling J7).
 const second='a second signed-in person, who neither applied '+a.id+' nor changed its facts, bindings, parameters or deviations, accepts it';
 const next=!live||accepted?'':definition.state==='withdrawn'?'The knowledge the definition of '+a.id+' rests on is no longer current: it is reviewed with the knowledge steward before the mechanism is accepted.'
  :source?a.id+' rests on '+a.legacy.taskId+', whose sources changed: that design is reviewed first (“'+source.title+'”); then '+second+'.'
  :!subject.actor?'No person stands behind '+a.id+' in this project: a signed-in person reads it against the model and confirms it as it stands; then a second signed-in person accepts it.'
  :change?'A record '+a.id+' rests on has changed: a signed-in person reads it against the model again and confirms it; then '+second+'.'
  :a.confirmed||a.provenance?.author?.kind==='person'?second[0].toUpperCase()+second.slice(1)+'.':'A signed-in person reads '+a.id+' against the model and confirms it as it stands; then '+second+'.';
 const label=!live?String(a.status):accepted?'applied · accepted by '+a.review.actor:!a.applied&&!subject.actor?'applied in another project · not applied or accepted in this project':'applied · not accepted by a second person';
 const findings=[],finding=(code,level,title,detail)=>findings.push({id:code+':'+a.id,code,title,detail,level,objectId:a.id});
 if(live){
  const deviates=id=>deviations.some(d=>d.target?.kind==='role'&&d.target.id===id),rests=ids=>{const os=list(a.obligations).filter(o=>list(o.targetIds).some(id=>ids.includes(id))).map(o=>o.id);return os.length?' Its obligation'+(os.length>1?'s ':' ')+os.join(', ')+' rest'+(os.length>1?'':'s')+' on it.':'';};
  const broken=roles.filter(r=>r.state==='broken'),missing=roles.filter(r=>r.required&&r.state==='unbound'&&!deviates(r.roleId));
  if(broken.length)finding('adoption-role-broken','error','Rebind a role of the applied mechanism',name(a)+': '+broken.map(r=>'the record bound as “'+r.roleId+'” ('+r.recordIds.join(', ')+') is '+r.issues.join(', ')+'.'+rests(r.recordIds)).join(' ')+' Restore the record, or reverse the applied design and apply the mechanism to the records that stand.');
  if(missing.length)finding('adoption-role-missing','error','Bind every required role of the applied mechanism',name(a)+': no record is bound as '+missing.map(r=>'“'+r.roleId+'”').join(', ')+', and no deviation says why.');
  if(definition.state==='withdrawn')finding('adoption-definition-withdrawn','error','Review the knowledge an applied mechanism rests on',name(a)+': '+definition.reasons.join(' ')+' The mechanism was applied from knowledge that is no longer current in this project: review it with the knowledge steward before it is relied on.');
  if(change)finding('adoption-basis','warning','Reassess the applied mechanism',name(a)+' rests on records that changed since it was last read ('+list(change.causes).map(c=>c.id+' '+c.detail).join(', ')+'). A signed-in person reads it against the model as it stands and confirms it.');
  if(accepted===false&&deviations.length)finding('adoption-deviation-unreviewed','warning','Have the deviations of the applied mechanism reviewed',name(a)+': '+deviations.map(d=>d.id).join(', ')+' '+(deviations.length>1?'are':'is')+' not acknowledged by a second signed-in person.');
  // (ruling J7: "not accepted by a second person" is the reading's standing, not a finding, until a surface offers the step: slice S3)
 }
 return {id:a.id,state:a.status,label,accepted,definition,basis:{state:source?'changed':'current',findingId:source?.id||null},roles,parameters,obligations,
  deviations:deviations.map(d=>({id:d.id,target:d.target,reviewed:accepted})),acceptance:{accepted,by:accepted?a.review.actor:null,at:accepted?a.review.at:null,next},changed:{required:!!change,since:change?.at||null,causes:list(change?.causes)},
  bounds:{considered:CONSIDERED,notConsidered:NOT_CONSIDERED},findings};
}
// The reading of one adoption, worked out once per settled document for a record the document holds (a record handed
// in from elsewhere under the same id is read afresh).
export const adoptionReading=(p,a)=>adoption(p,a?.id)===a?remember(p,'adoption:reading',a.id,()=>read(p,a)):read(p,a);
// The findings of the applied adoptions (the package states them for Chapter 5, where the bound records are:
// adoption-package.js). None for a document without adoptions; an adoption that no longer stands is history.
export const adoptionFindings=p=>adoptionRecords(p).filter(applied).flatMap(a=>adoptionReading(p,a).findings);

// ---------------------------------------------------------------- what an adoption says to the design fingerprint (ruling J3)
// The package states this for its key at the registration point (design {adoptions}): review-domain.js reviewSource
// reads it in place of p.adoptions. One rule for every revision: the history, review, confirmed and provenance of a
// record are bookkeeping, so a confirmation and an acceptance move no design stamp. And an adoption written from a
// guided design task leaves out what that task already says to the fingerprint (guidedDesign reads the task whole)
// while the task is in the document: what is left is what the adoption's own steps wrote, its deviations and a status
// that is no longer 'applied'. So the upgrade of an old document moves no stamp. An adoption with no task beside it
// (slice S2's own; one a project copied from a template carries) says all but its bookkeeping. Nothing to say: no key.
const TASK_SAYS=['id','ref','revision','origin','kind','title','owner','scope','definition','facts','bindings','parameters','obligations','decisionId','applied','legacy'];
export function adoptionDesign(p){
 const out=[];
 for(const a of adoptionRecords(p)){
  const {history,review,confirmed,provenance,...says}=a;
  if(taskOf(p,a)){for(const k of TASK_SAYS)delete says[k];if(says.status==='applied')delete says.status;if(!list(says.deviations).length)delete says.deviations;if(Object.keys(says).length)out.push({id:a.id,...says});}
  else out.push(says);
 }
 return out.length?out:undefined;
}

// ---------------------------------------------------------------- the record graph (the package's emitter)
// Each adoption is one object of the built-in type `pattern`, from its own collection (ruling D7.2), under the id
// prefix the package mints (ADP). An applied one states addresses (its requirement), assesses (its driver), binds
// {role, mode} (its role records) and scopes (its decision and the records its applied design wrote). A relation is
// stated only to an object of the graph (has(id), ruling J2): a record the graph keeps as a relation (a lineage, an
// allocation) and one that left are no end of a relation; a binding to a record that left is a finding. One rule for
// a mechanism that no longer stands (reversed; withdrawn from slice S3 on), as for a design task set aside before it:
// it stays an object, with what it addressed and scoped, and is on no trail (its relations are not the layer's own).
export function emitAdoptions(p,add,rel,has){
 for(const a of adoptionRecords(p)){
  const live=applied(a),source=live?'adoptions.records.':'adoptions.past.',seen=new Set();
  add(a,'pattern','adoptions.records.'+a.id);
  const to=(type,id,field,attributes)=>{if(id&&!seen.has(id)&&has(id)){seen.add(id);rel(type,a.id,id,attributes?{source:source+field,attributes}:{source:source+field});}};
  to('addresses',a.scope?.requirementId,'scope');to('assesses',a.scope?.driverId,'scope');
  if(live)for(const b of list(a.bindings))to('binds',b.recordId,'bindings',{role:b.roleId,mode:b.mode});
  for(const id of [a.decisionId,...list(a.applied?.records).map(r=>r?.id)])to('scopes',id,'applied');
 }
}
export const adoptionRelation=e=>String(e?.source).startsWith('adoptions.records.');

// ---------------------------------------------------------------- the commands
export function applyAdoptionCommand(p,command,at,actor,options={}){
 const raw=plain(command?.payload)?command.payload:{},type=command?.type,a=adoption(p,raw.id);
 if(!['adoption.reassess','adoption.accept','adoption.deviation'].includes(type))throw Error('Unknown adoption action.');
 if(!a)throw Error('Choose an adoption.');
 if(raw.revision!==a.revision)throw Error('This adoption changed. Reopen it; your input is retained.');
 if(!applied(a))throw Error(a.id+' is '+a.status+': it takes no further step.');
 nameApplier(p,a);
 const changed=()=>{a.revision++;a.confirmed=false;};
 if(type==='adoption.reassess'){
  if(raw.reviewed!==true)throw Error('Confirm that you read '+a.id+' against the model as it stands (reviewed).');
  const reason=words(raw.reason,'Record what you read '+a.id+' against.');
  a.confirmed=true;note(a,'reassess',actor,at,{note:reason});
 }else if(type==='adoption.accept'){
  if(adoptionAccepted(p,a))throw Error(a.id+' is already accepted by '+a.review.actor+'.');
  if(openChange(a))throw Error(a.id+' rests on a record that changed since it was last read: a signed-in person reads it against the model again and confirms it first.');
  const reading=read(p,a),errors=reading.findings.filter(f=>f.level==='error');
  if(errors.length)throw Error(a.id+' has an open error: '+errors.map(f=>f.title).join('; ')+'. Fix it before the adoption is accepted.');
  // No second truth while the earlier path stands (ruling J6): its finding for the same design is cleared there first.
  if(reading.basis.state!=='current')throw Error(a.id+' rests on '+a.legacy.taskId+', whose sources changed ('+reading.basis.findingId+' stands): review that design first; the adoption is accepted once it reads current.');
  const ids=activeDeviations(a).map(d=>d.id);
  if(!Array.isArray(raw.deviationIds)||!sameIds(raw.deviationIds,ids))throw Error('Acknowledge each deviation of '+a.id+' by its id: '+(ids.join(', ')||'it has none')+'.');
  const said=raw.note===undefined||raw.note===''?'':words(raw.note,'');
  a.review={actor,at,account:options?.author?.account??null,revision:a.revision,seq:list(a.history).reduce((n,x)=>Math.max(n,x?.n||0),0),note:said,deviationIds:ids};
  note(a,'accept',actor,at);
 }else if(raw.withdrawn===true){
  const d=activeDeviations(a).find(x=>x.id===raw.deviationId);if(!d)throw Error('Choose a deviation of '+a.id+'.');
  d.withdrawn={by:actor,at,reason:words(raw.reason,'Record the reason for withdrawing the deviation.')};changed();note(a,'deviation',actor,at,{note:d.id+' withdrawn'});
 }else{
  const target=plain(raw.target)?raw.target:{},snapshot=a.definition?.snapshot||{},id=String(target.id??''),prefix=(a.legacy?.taskId||a.id)+':';
  const known={role:list(snapshot.roles).some(r=>r.id===id),obligation:list(a.obligations).some(o=>o.id===id||o.id===prefix+id),parameter:list(a.parameters).some(x=>x.name===id)}[target.kind];
  if(!known)throw Error('Choose a role, an obligation or a parameter of this definition: “'+id+'” is not in it.');
  const statement=words(raw.statement,'Say how the model deviates from the definition.'),reason=words(raw.reason,'Record the reason for the deviation.');
  if(list(a.deviations).length>=ADOPTION_LIMITS.deviations)throw Error(a.id+' holds '+ADOPTION_LIMITS.deviations+' deviations: no further one is recorded.');
  a.deviations=[...list(a.deviations),{id:a.id+':DEV-'+pad(list(a.deviations).length+1,2),target:{kind:target.kind,id},statement,reason,by:actor,at}];
  changed();note(a,'deviation',actor,at,{note:a.deviations.at(-1).id});
 }
 p.adoptions.version=(p.adoptions.version||0)+1;
 return {document:p,selected:a.id};
}
// What adoption.accept acts on, for the boundary's second-person rule.
export const acceptanceOf=(p,command)=>{const a=adoption(p,command?.payload?.id);return a?acceptanceSubject(a,p):null;};

// ---------------------------------------------------------------- the tracker (design §c.3; rulings D4, J1, J4, J5)
// Called by the server after the built-in trackers for every commit. For a document without adoptions it returns at
// once. In the commit that retires, removes, restores or changes a record an applied adoption binds, changes the
// requirement, driver or decision it rests on, or makes the knowledge its definition pins no longer current, it
// records the cause on the adoption's history ('changed', merged into a change that is still open): the reading then
// says a person must reassess, and an acceptance no longer stands. A design the earlier path reverses
// (alternative.rollback marks its task) takes its adoption with it. Each change it opens or adds to, and each
// reversal, is one change event of the journal with the adoption as its source (ruling J5): the server stamps on it who
// sent the commit, of what kind and why, and lists it in the commit's activity. It moves neither revision, status nor
// the step on record of an adoption that stands, and changes no chapter record. It also puts the applier the journal
// names on the record (ruling J1), as bookkeeping.
const content=r=>JSON.stringify(obligationContent(r));
function journal(next,a,at,title,fields){
 withChanges(next);
 // (neither before nor after: a tracker's event is a change of its own, never folded into an earlier one)
 const event={id:'CHG-'+pad(++next.changes.counter,3),source:{chapter:3,id:a.id,ref:a.ref||a.id,kind:'adoption',title:a.title||a.id},title,at,before:null,after:null,fields,items:[]};
 next.changes.events.push(event);return event;
}
export function trackAdoptionChange(prior,next,command,at){
 const live=adoptionRecords(next).filter(applied);if(!live.length)return;
 const before=recordIndex(prior),after=recordIndex(next),retired=new Set(list(next?.retired?.records).map(x=>x?.id)),knowledge=/^knowledge\./.test(String(command?.type));
 for(const a of live){
  nameApplier(next,a);
  const t=taskOf(next,a);
  if(t&&t.status!=='applied'){
   a.status='reversed';a.revision++;a.confirmed=false;
   const event=journal(next,a,at,'Reversed '+name(a),[{key:'status',label:'Standing',before:'applied',after:'reversed with '+t.id}]);
   note(a,'reverse',null,at,{note:'The applied design '+t.id+' was reversed.',changeId:event.id});next.adoptions.version=(next.adoptions.version||0)+1;continue;
  }
  // An adoption this commit wrote is not flagged by the commit that wrote it.
  const was=adoption(prior,a.id);if(!was)continue;
  const causes=[],watch=[...list(a.bindings).map(b=>['binding',b.recordId]),['requirement',a.scope?.requirementId],['driver',a.scope?.driverId],['decision',a.decisionId]];
  for(const [kind,id] of watch){
   if(!id||causes.some(c=>c.id===id))continue;
   const old=before.get(id),now=after.get(id);
   if(old&&!now)causes.push({kind,id,detail:retired.has(id)?'retired':'removed'});
   else if(!old&&now&&list(prior?.retired?.records).some(x=>x?.id===id))causes.push({kind,id,detail:'restored'});
   else if(old&&now&&content(old.record)!==content(now.record))causes.push({kind,id,detail:'changed'});
  }
  // The knowledge the definition pins (design §c.3), read where a knowledge command could have moved it.
  if(knowledge){const now=definitionOf(next,a).state;if(now!=='current'&&definitionOf(prior,was).state!==now)causes.push({kind:'definition',id:a.definition?.definitionId||a.id,detail:now==='withdrawn'?'rests on knowledge that is no longer current':'has an interpretation that changed'});}
  if(!causes.length)continue;
  const open=openChange(a),fresh=open?causes.filter(c=>!list(open.causes).some(x=>x.kind===c.kind&&x.id===c.id&&x.detail===c.detail)):causes;
  if(!fresh.length)continue;
  const event=journal(next,a,at,'Reassess '+name(a),fresh.map(c=>({key:c.kind+':'+c.id,label:'A '+c.kind+' it rests on',before:null,after:c.id+' '+c.detail})));
  if(open)(open.causes||=[]).push(...fresh);else note(a,'changed',null,at,{causes:fresh,changeId:event.id});
 }
}
