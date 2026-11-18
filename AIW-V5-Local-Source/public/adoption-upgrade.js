// The upgrade of a document written before the adoption record (rc44, wp2 slice S1; audit/rc44/design/wp2-adoption.md
// §e.3). It runs on read with the other upgrades (the package states it as its upgrade step: adoption-package.js) and
// the first read stores it, as a storage upgrade with a recovery point (storage-upgrade.js). For each guided design
// task that stands as applied and has no adoption yet it writes one adoption record and the task's adoptionId; the
// task stays where it is. Nothing else in the document is touched, and what the design fingerprint reads is what it
// read (review-domain.js reviewSource leaves an adoption that is still as it was upgraded out: its content is the
// task's, which the fingerprint reads already), so no stamp moves.
//   - origin 'upgrade', status 'applied', no acceptance: who applied it is a typed reviewer name, kept verbatim with
//     its review authority (identity and independence not verified). It reads "applied · not accepted by a second
//     person" until a signed-in person confirms it (adoption.reassess) and a second person accepts it.
//   - the definition is the built-in the task's method receipt identifies, pinned with the receipt and with a
//     snapshot of what this project used: the roles its solution placed and the obligations it carries.
//   - bindings from the solution's placement, facts from the answers the design was applied with (the typed
//     reviewer's declarations), parameters from its specifications with no unit and marked migrated, obligations
//     verbatim with their ids, the decision, and the task's identities under `legacy`. No bounds and no deviations.
//   - a task of another kind (boundary, exchange, security, operation) gives roles from the slots of its applied
//     records and no obligations.
// A frozen baseline source holds no task list (its tasks are kept as guidedDesign) and is answered as it is. The step
// reads no time: the adoption carries the task's own times. A record it writes carries no author stamp.
import {digest} from './brain-integrity.js';
import {builtinFromReceipt,builtinOfKind} from './adoption-builtins.js';
export const ADOPTION_DEFINITION=1;
const list=v=>Array.isArray(v)?v:[],plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v),copy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
const due=t=>t?.status==='applied'&&plain(t.applied)&&!t.adoptionId;
export const needsAdoptionUpgrade=p=>list(p?.coauthoring?.designTasks).some(due);
const CHAPTER_TYPES={3:'decision',4:'responsibility',5:'component',6:'capability',7:'technology',8:'contract',9:'control',10:'runtime'};// by the chapter that holds the record (record-graph.js OBJECT_TYPES)
function fromTask(t,id){
 const x=t.applied,s=t.kind==='architecture'&&plain(x.reasoningGraph?.solution)?x.reasoningGraph.solution:null,receipt=x.methodReceipt||t.methodReceipt||null;
 const built=builtinFromReceipt(receipt)||builtinOfKind(t.kind),definitionId=receipt?.methodId||built.definitionId,version=Number.isInteger(receipt?.sources?.version)?receipt.sources.version:built.version;
 const by={by:x.reviewer||'',identity:'typed-name'},isNew=rid=>list(x.records).find(r=>r?.id===rid)?.isNew===true;
 let roles,bindings;
 if(s){
  roles=list(s.placement).map(r=>({id:r.role,label:r.responsibility||r.role,required:true,cardinality:'one',accepts:[{type:'component'}],...(r.hostRole?{sameAs:r.hostRole}:{})}));
  bindings=list(s.placement).map(r=>({id:id+':'+r.role,roleId:r.role,recordId:r.componentId,recordType:'component',mode:isNew(r.componentId)?'created':'reused',at:x.at,...by}));
 }else{
  const rows=list(x.records).filter(r=>r?.id).map(r=>({r,role:String(r.slot||'record').trim().replace(/[^A-Za-z0-9]+/g,'-')||'record',type:CHAPTER_TYPES[r.chapter]||'component'})),count={};
  roles=[...new Map(rows.map(({role,type,r})=>[role,{id:role,label:String(r.slot||'record'),required:true,cardinality:rows.filter(y=>y.role===role).length>1?'many':'one',accepts:[{type}]}])).values()];
  bindings=rows.map(({r,role,type})=>{const n=count[role]=(count[role]||0)+1;return {id:id+':'+role+(n>1?':'+n:''),roleId:role,recordId:r.id,recordType:type,mode:r.isNew?'created':'reused',at:x.at,...by};});
 }
 const prefix=t.id+':',snapshot={definitionId,version,kind:built.kind,title:built.title+(s?.mechanism?.pattern?' · '+s.mechanism.pattern:''),groupId:t.topic||built.groupId,...(s?.optionId?{optionId:s.optionId}:{}),...(s?.mechanism?{mechanism:copy(s.mechanism)}:{}),roles,
  obligations:list(s?.obligations).map(o=>({id:String(o.id).startsWith(prefix)?o.id.slice(prefix.length):o.id,kind:o.kind,action:o.action,evidence:o.evidence,mandatory:o.declared===true,factKeys:copy(list(o.fieldKeys))}))};
 const answers=plain(x.designAnswers)?x.designAnswers:{};
 return {id,ref:id,revision:1,status:'applied',origin:'upgrade',kind:built.kind,title:t.title||built.title,owner:typeof t.answers?.owner==='string'?t.answers.owner:'',
  scope:{requirementId:t.requirementId,driverId:t.driverId,contextIds:copy(list(t.basis?.contextIds))},
  definition:{definitionId,version,...(s?.optionId?{optionId:s.optionId}:{}),groupId:t.topic||built.groupId,authority:receipt?.governedConcern?'released':'built-in',receipt:copy(receipt),snapshot,snapshotHash:digest(snapshot)},
  facts:Object.fromEntries(Object.entries(answers).filter(([,v])=>v!==''&&v!=null).map(([k,v])=>[k,{value:copy(v),status:'declared',...by,at:x.at}])),
  bindings,
  parameters:list(s?.specifications).flatMap(sp=>Object.entries(plain(sp.parameters)?sp.parameters:{}).map(([name,value])=>({id:id+':P:'+sp.componentId+':'+name,name,value:copy(value),unit:'',scope:'component',basis:'stated',appliesTo:sp.componentId,migrated:true}))),
  obligations:copy(list(s?.obligations)),decisionId:x.decisionId??s?.decisionId??null,deviations:[],
  applied:{at:x.at,reviewer:x.reviewer,reason:x.reason,changeIds:copy(x.changeIds),records:copy(x.records),reviewAuthority:copy(x.reviewAuthority)},
  legacy:{taskId:t.id,solutionId:s?.id??null,alternativeId:x.alternativeId??null,methodReceipt:copy(x.methodReceipt??null),governedKnowledge:copy(t.governedKnowledge??null),answers:copy(t.answers??null)},
  history:[{n:1,at:x.at,event:'upgrade',actor:null,revision:1,note:'Upgraded from '+t.id+', which was applied before adoptions were recorded.'}]};
}
// The document when it needs no upgrade, else an upgraded copy of it; the one handed in is left as it was.
export function upgradeAdoptions(p){
 if(!needsAdoptionUpgrade(p))return p;
 const tasks=p.coauthoring.designTasks.map(t=>due(t)?{...t}:t),held=plain(p.adoptions)?p.adoptions:null;
 const adoptions={schemaVersion:1,definition:ADOPTION_DEFINITION,counter:0,version:0,...held,records:[...list(held?.records)]};
 for(const t of tasks)if(due(t)){const a=fromTask(t,'ADP-'+String(++adoptions.counter).padStart(3,'0'));adoptions.records.push(a);t.adoptionId=a.id;}
 return {...p,coauthoring:{...p.coauthoring,designTasks:tasks},adoptions};
}
