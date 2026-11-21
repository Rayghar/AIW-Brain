// The upgrade of a document written before the adoption record (rc44, wp2 slice S1; audit/rc44/design/wp2-adoption.md
// §e.3; the lead's rulings J1, J2, J4 and J12 of 2026-11-19). A server module: the browser upgrades no document, so
// the lazy entry that holds the package does not hold this file (adoption-server.js adds the step to the package the
// server registers). It runs on read with the other upgrades, and the first read stores it, as a storage upgrade with
// a recovery point (storage-upgrade.js). For each guided design task that stands as applied and has no adoption it
// writes one adoption record and the task's adoptionId; the task stays where it is. Nothing else in the document is
// touched, and the adoption says nothing to the design fingerprint that its task does not say already
// (adoption-domain.js adoptionDesign), so no stamp moves.
//   - origin 'upgrade', status 'applied', no acceptance. Who applied it: the typed reviewer name, kept verbatim with
//     its review authority (identity and independence not verified), and, where the change journal says who sent the
//     apply, that signed-in person as an entry of the history (identity 'journal': ruling J1). The record carries no
//     author stamp: it reads "applied · not accepted by a second person" until a signed-in person confirms it
//     (adoption.reassess) and a second person, who did not apply it, accepts it.
//   - the definition is the built-in the task's method receipt identifies, or the released design concern it pins
//     (its own skeleton and kind: ruling J4), with the receipt and with a snapshot of what this project used: the
//     roles its solution placed and the obligations it carries.
//   - bindings from the solution's placement, facts from the answers the design was applied with (the typed
//     reviewer's declarations), parameters from its specifications with no unit and marked migrated, obligations
//     verbatim with their ids, the decision, and the task's identities under `legacy`. No bounds and no deviations.
//   - a task of another kind (boundary, exchange, security, operation) gives roles from the slots of its applied
//     records and no obligations. A bound record's type is the one the record graph gives it; a record the graph
//     keeps as a relation (an allocation, a lineage) is no role and stays under `applied.records`; a record that has
//     left the document keeps the type of the chapter it was in, and reads as a broken role.
// A task whose adoptionId names no adoption of its own (a lost or hand-edited key) is linked again to the adoption
// written from it, or upgraded again. A frozen baseline source holds no task list (its tasks are kept as
// guidedDesign) and is answered as it is. The step reads no time: the adoption carries the task's own times.
import {digest} from './brain-integrity.js';
import {builtinFromReceipt,builtinOfKind,receiptDefinition} from './adoption-builtins.js';
import {journalApplier,applierEntry} from './adoption-domain.js';
import {recordGraph} from './record-graph.js';
import {COLLECTIONS} from './record-lifecycle.js';
export const ADOPTION_DEFINITION=1;
const list=v=>Array.isArray(v)?v:[],plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v),copy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
const stands=t=>t?.status==='applied'&&plain(t.applied);
// The adoption written from a task: the one its adoptionId names, when that record says it came from this task.
const adoptionOf=(p,t)=>list(p?.adoptions?.records).find(a=>a?.id===t.adoptionId&&a.legacy?.taskId===t.id)||null;
const due=(p,t)=>stands(t)&&!adoptionOf(p,t);
export const needsAdoptionUpgrade=p=>list(p?.coauthoring?.designTasks).some(t=>due(p,t));
const CHAPTER_TYPES={3:'decision',4:'responsibility',5:'component',6:'capability',7:'technology',8:'contract',9:'control',10:'runtime'};// for a record that has left the document: by the chapter it was in
// The type of an applied record: the one the record graph gives it; null for a record the graph keeps as a relation.
function typeReader(p){
 let objects=null,held=null;
 return r=>{
  if(!objects){try{objects=recordGraph(p).objects;}catch{objects=new Map();}}
  const o=objects.get(r.id);if(o)return o.type;
  held??=new Set(COLLECTIONS.flatMap(([path])=>{const [a,b]=path.split('.'),v=b?p?.[a]?.[b]:p?.[a];return list(v).map(x=>x?.id);}));
  return held.has(r.id)?null:CHAPTER_TYPES[r.chapter]||'component';
 };
}
function fromTask(p,t,id,typeOf){
 const x=t.applied,s=t.kind==='architecture'&&plain(x.reasoningGraph?.solution)?x.reasoningGraph.solution:null,receipt=x.methodReceipt||t.methodReceipt||null;
 const built=builtinFromReceipt(receipt)||receiptDefinition(receipt)||builtinOfKind(t.kind),definitionId=receipt?.methodId||built.definitionId,version=Number.isInteger(receipt?.sources?.version)?receipt.sources.version:built.version;
 const by={by:x.reviewer||'',identity:'typed-name'},isNew=rid=>list(x.records).find(r=>r?.id===rid)?.isNew===true;
 let roles,bindings;
 if(s){
  roles=list(s.placement).map(r=>({id:r.role,label:r.responsibility||r.role,required:true,cardinality:'one',accepts:[{type:'component'}],...(r.hostRole?{sameAs:r.hostRole}:{})}));
  bindings=list(s.placement).map(r=>({id:id+':'+r.role,roleId:r.role,recordId:r.componentId,recordType:'component',mode:isNew(r.componentId)?'created':'reused',at:x.at,...by}));
 }else{
  const rows=list(x.records).filter(r=>r?.id).map(r=>({r,role:String(r.slot||'record').trim().replace(/[^A-Za-z0-9]+/g,'-')||'record',type:typeOf(r)})).filter(y=>y.type),count={};
  roles=[...new Map(rows.map(({role,r})=>[role,{id:role,label:String(r.slot||'record'),required:true,cardinality:rows.filter(y=>y.role===role).length>1?'many':'one',accepts:[...new Set(rows.filter(y=>y.role===role).map(y=>y.type))].map(type=>({type}))}])).values()];
  bindings=rows.map(({r,role,type})=>{const n=count[role]=(count[role]||0)+1;return {id:id+':'+role+(n>1?':'+n:''),roleId:role,recordId:r.id,recordType:type,mode:r.isNew?'created':'reused',at:x.at,...by};});
 }
 const prefix=t.id+':',snapshot={definitionId,version,kind:built.kind,title:built.title+(s?.mechanism?.pattern?' · '+s.mechanism.pattern:''),groupId:t.topic||built.groupId,...(s?.optionId?{optionId:s.optionId}:{}),...(s?.mechanism?{mechanism:copy(s.mechanism)}:{}),roles,
  obligations:list(s?.obligations).map(o=>({id:String(o.id).startsWith(prefix)?o.id.slice(prefix.length):o.id,kind:o.kind,action:o.action,evidence:o.evidence,mandatory:o.declared===true,factKeys:copy(list(o.fieldKeys))}))};
 const answers=plain(x.designAnswers)?x.designAnswers:{};
 const a={id,ref:id,revision:1,status:'applied',origin:'upgrade',kind:built.kind,title:t.title||built.title,owner:typeof t.answers?.owner==='string'?t.answers.owner:'',
  scope:{requirementId:t.requirementId,driverId:t.driverId,contextIds:copy(list(t.basis?.contextIds))},
  definition:{definitionId,version,...(s?.optionId?{optionId:s.optionId}:{}),groupId:t.topic||built.groupId,authority:built.authority,receipt:copy(receipt),snapshot,snapshotHash:digest(snapshot)},
  facts:Object.fromEntries(Object.entries(answers).filter(([,v])=>v!==''&&v!=null).map(([k,v])=>[k,{value:copy(v),status:'declared',...by,at:x.at}])),
  bindings,
  parameters:list(s?.specifications).flatMap(sp=>Object.entries(plain(sp.parameters)?sp.parameters:{}).map(([name,value])=>({id:id+':P:'+sp.componentId+':'+name,name,value:copy(value),unit:'',scope:'component',basis:'stated',appliesTo:sp.componentId,migrated:true}))),
  obligations:copy(list(s?.obligations)),decisionId:x.decisionId??s?.decisionId??null,deviations:[],
  applied:{at:x.at,reviewer:x.reviewer,reason:x.reason,changeIds:copy(x.changeIds),records:copy(x.records),reviewAuthority:copy(x.reviewAuthority)},
  legacy:{taskId:t.id,solutionId:s?.id??null,alternativeId:x.alternativeId??null,methodReceipt:copy(x.methodReceipt??null),governedKnowledge:copy(t.governedKnowledge??null),answers:copy(t.answers??null)},
  history:[{n:1,at:x.at,event:'upgrade',actor:null,revision:1,note:'Upgraded from '+t.id+', which was applied before adoptions were recorded.'}]};
 // Who sent the apply, where the journal says so (in the commit of the apply itself its events are not stamped yet:
 // the tracker names the applier in the next commit).
 const person=journalApplier(p,a).person;if(person)a.history.push({n:2,...applierEntry(a,person)});
 return a;
}
// The document when it needs no upgrade, else an upgraded copy of it; the one handed in is left as it was.
export function upgradeAdoptions(p){
 if(!needsAdoptionUpgrade(p))return p;
 const tasks=p.coauthoring.designTasks.map(t=>due(p,t)?{...t}:t),held=plain(p.adoptions)?p.adoptions:null,typeOf=typeReader(p);
 // The ids the document's records hold, a retired record's too (an id is minted only once nothing holds it).
 let ids=null;const taken=id=>(ids??=new Set(COLLECTIONS.flatMap(([path])=>{const [k,l]=path.split('.'),v=l?p?.[k]?.[l]:p?.[k];return list(v).map(x=>x?.id);}).concat(list(p?.retired?.records).map(x=>x?.id)))).has(id);
 const adoptions={schemaVersion:1,definition:ADOPTION_DEFINITION,counter:0,version:0,...held,records:[...list(held?.records)]};
 for(const t of tasks)if(due(p,t)){
  // a task that lost its pointer is linked again to the adoption written from it; one whose adoption is gone is upgraded again
  const mine=adoptions.records.find(a=>a?.legacy?.taskId===t.id&&!tasks.some(o=>o!==t&&o.adoptionId===a.id));
  // (an id a record of the document already holds is never minted: the counter moves past it)
  if(mine)t.adoptionId=mine.id;else{let id;do id='ADP-'+String(++adoptions.counter).padStart(3,'0');while(taken(id)||adoptions.records.some(a=>a?.id===id));const a=fromTask(p,t,id,typeOf);adoptions.records.push(a);t.adoptionId=a.id;}
 }
 return {...p,coauthoring:{...p.coauthoring,designTasks:tasks},adoptions};
}
