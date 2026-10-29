// Process is an additional perspective on the same project identities. Reference
// routes illustrate questions to review; they are never asserted as bank facts.
// Round 6 (Contract T): every project has a process model; its elements carry the BPMN semantics the standard names
// (event type and position, boundary events on a task, gateway type, sub-processes, external pools, data objects), its
// flows are sequence or message flows, and processFindings checks the structure. The bank's reference routes, paths
// and source questions stay the bank's.
import {list} from './util.js';
import {patchIds,within,knownOnly} from './requirement-links.js';
import {requirementGroups} from './requirement-groups.js';
import {RETIRE_ONLY} from './record-lifecycle.js';
// Round 12 (DM-02, DM-09, DM-10): a process element names as many requirements as the project holds, or the requirement
// groups that hold them; an id the project does not hold is refused by name, and a save that leaves the links out keeps them.
function elementLinks(p,raw,old){const r=patchIds(raw,'requirementIds',old),g=patchIds(raw,'requirementGroupIds',old);within(r.ids,5000,'requirements');within(g.ids,500,'requirement groups');knownOnly(r.sent,new Set(p.artefacts.filter(a=>a.type==='requirement').map(a=>a.id)),'requirements');knownOnly(g.sent,new Set(requirementGroups(p).map(x=>x.id)),'requirement groups');return {requirementIds:r.ids,...(g.ids.length||old?.requirementGroupIds?{requirementGroupIds:g.ids}:{})};}
const clean=(v,n=1000)=>String(v??'').trim().slice(0,n);
const bank=p=>p.workspace?.template==='bank-payment'||p.id==='bank-payment';
export const PROCESS_KINDS=['task','gateway','event','account','subprocess','data'];
export const EVENT_TYPES=['none','message','timer','error','signal'];
export const EVENT_POSITIONS=['start','intermediate','end','boundary'];
export const GATEWAY_TYPES=['exclusive','parallel','inclusive','event'];
export const TRANSITION_KINDS=['sequence','message'];
export const PROCESS_LIMITS=Object.freeze({elements:500,transitions:500,claims:500});
export function withProcessModel(p){
 if(!p.processModel)p.processModel={schemaVersion:1,referenceVersion:bank(p)?1:0,version:0,elements:[],transitions:[],claims:[]};
 return p;
}
const reference=[
 ['PROC-REF-START','event','Payment instruction received','Channel',0,0,'start','none'],
 ['PROC-REF-RISK','gateway','Screening disposition','Risk',3,0],
 ['PROC-REF-HELD','event','Instruction held for review','Risk',3,1,'end','none'],
 ['PROC-REF-OUTCOME','gateway','Settlement outcome known?','Payments',6,0],
 ['PROC-REF-PENDING','event','Pending enquiry and reconciliation','Payments',7,1,'end','none'],
 ['PROC-REF-DONE','event','Customer sees confirmed outcome','Channel',9,0,'end','none']
];
const routes=[
 ['PROC-REF-START','JRN-001','Begin'],['JRN-001','JRN-002','Screen'],['JRN-002','PROC-REF-RISK','Disposition'],
 ['PROC-REF-RISK','JRN-003','Allow'],['PROC-REF-RISK','PROC-REF-HELD','Hold'],
 ['JRN-003','JRN-004','Submit once'],['JRN-004','PROC-REF-OUTCOME','Resolve'],
 ['PROC-REF-OUTCOME','JRN-005','Confirmed'],['PROC-REF-OUTCOME','PROC-REF-PENDING','Uncertain'],
 ['JRN-005','PROC-REF-DONE','Communicate']
];
export function referenceProcess(p){
 if(!bank(p)||p.processModel?.referenceVersion!==1||!['JRN-001','JRN-002','JRN-003','JRN-004','JRN-005'].every(id=>list(p.artefacts).some(a=>a.id===id&&a.type==='journey')))return {elements:[],transitions:[]};
 const elements=reference.map(([id,kind,title,lane,order,branch,position,eventType])=>({id,kind,title,lane,order,branch,origin:'reference',confirmed:false,source:'Illustrative Bank Payment Journey brief',purpose:'Illustrative process outcome; review its conditions and responsibilities against project evidence.',...(kind==='event'?{position,eventType}:{gatewayType:'exclusive'})}));
 const transitions=routes.map(([from,to,label],i)=>({id:'PROC-REF-LINK-'+String(i+1).padStart(2,'0'),from,to,label,condition:label,kind:'sequence',origin:'reference',confirmed:false,source:'Illustrative Bank Payment Journey brief'}));
 return {elements,transitions};
}
export const processElements=p=>[...referenceProcess(p).elements,...list(p.processModel?.elements)];
export const processTransitions=p=>[...referenceProcess(p).transitions,...list(p.processModel?.transitions)];
export function processConflicts(p){
 const groups=new Map();for(const claim of list(p.processModel?.claims)){const key=claim.subjectId+'\0'+claim.topic.toLowerCase();if(!groups.has(key))groups.set(key,[]);groups.get(key).push(claim);}
 return [...groups.values()].filter(group=>new Set(group.map(c=>c.statement.toLowerCase())).size>1);
}
export function processPaths(p){if(!referenceProcess(p).elements.length)return [];
 const paths=[['confirmed','Confirmed outcome','PROC-REF-START','JRN-001','JRN-002','PROC-REF-RISK','JRN-003','JRN-004','PROC-REF-OUTCOME','JRN-005','PROC-REF-DONE'],['held','Held for review','PROC-REF-START','JRN-001','JRN-002','PROC-REF-RISK','PROC-REF-HELD'],['uncertain','Uncertain settlement','PROC-REF-START','JRN-001','JRN-002','PROC-REF-RISK','JRN-003','JRN-004','PROC-REF-OUTCOME','PROC-REF-PENDING']];
 return paths.map(([id,title,...ids])=>({id,title,ids}));
}
export function processSourceQuestions(p,id){
 if(!bank(p)||id!=='JRN-004')return [];
 return [{topic:'Outward switch boundary',sources:['PayHub design, page 19','eTranzact outward design, page 13'],question:'Do these diagrams describe the same outward path and level of abstraction? Verify which component owns routing and the switch contract before selecting a boundary.',status:'Open source reconciliation question'}];
}

// ---------------------------------------------------------------- the structure the flows describe
// The process graph as the checks and the walk read it: every flow node (journey steps and process elements except
// accounts and data objects), the sequence flows between them, the pool each stands in (our process, or the external
// party it names), its event position (recorded, or read from its flows: no incoming flow is a start, no outgoing an
// end) and gateway type (recorded, or exclusive).
export const SCENARIO_LIMIT=12;
export function processGraph(p){
 const steps=list(p.artefacts).filter(a=>a.type==='journey'),elements=processElements(p),transitions=processTransitions(p);
 const nodes=new Map();
 for(const s of steps)nodes.set(s.id,{id:s.id,kind:'task',title:s.title,pool:null,record:s});
 for(const e of elements)if(e.kind!=='account'&&e.kind!=='data')nodes.set(e.id,{id:e.id,kind:e.kind,title:e.title,pool:e.partyId||null,parentId:e.parentId||null,attachedTo:e.attachedTo||null,gatewayType:e.kind==='gateway'?GATEWAY_TYPES.includes(e.gatewayType)?e.gatewayType:'exclusive':null,eventType:e.kind==='event'?EVENT_TYPES.includes(e.eventType)?e.eventType:'none':null,position:e.kind==='event'&&EVENT_POSITIONS.includes(e.position)?e.position:null,record:e});
 // A recorded precedence between two journey steps (Chapter 1) is a sequence flow of the process too, as the picture draws it.
 const flowsOf=new Set(transitions.map(t=>t.from+'\0'+t.to));
 const precedes=list(p.relationships).filter(r=>r.kind==='precedes'&&nodes.has(r.from)&&nodes.has(r.to)&&!flowsOf.has(r.from+'\0'+r.to)).map(r=>({id:r.id,from:r.from,to:r.to,label:'',condition:'',kind:'sequence',precedes:true}));
 const seq=[...transitions.filter(t=>(t.kind||'sequence')==='sequence'),...precedes],msg=transitions.filter(t=>t.kind==='message');
 const outgoing=new Map(),incoming=new Map();for(const id of nodes.keys()){outgoing.set(id,[]);incoming.set(id,[]);}
 for(const t of seq){if(outgoing.has(t.from))outgoing.get(t.from).push(t);if(incoming.has(t.to))incoming.get(t.to).push(t);}
 for(const n of nodes.values())if(n.kind==='event'&&!n.position)n.position=n.attachedTo?'boundary':!incoming.get(n.id).length&&outgoing.get(n.id).length?'start':!outgoing.get(n.id).length&&incoming.get(n.id).length?'end':'intermediate';
 const poolOf=id=>nodes.get(id)?.pool??null;
 return {nodes,steps,elements,transitions,sequence:seq,messages:msg,outgoing,incoming,poolOf};
}
// The paths of a process a token can walk, each from a start event to an end (or to where the flows stop), at most
// SCENARIO_LIMIT of them, in the order the flows are recorded; cycles are walked once. The bank's reference paths are
// the bank's (processPaths); every other project reads its scenarios from its own flows.
export function processScenarios(p){
 const ref=processPaths(p);if(ref.length)return ref;
 const G=processGraph(p),starts=[...G.nodes.values()].filter(n=>n.pool==null&&n.kind==='event'&&n.position==='start').map(n=>n.id);
 if(!starts.length){const first=[...G.nodes.values()].find(n=>n.pool==null&&!G.incoming.get(n.id).length&&G.outgoing.get(n.id).length);if(first)starts.push(first.id);}
 const out=[];
 const walk=(id,path)=>{if(out.length>=SCENARIO_LIMIT)return;const next=G.outgoing.get(id)||[];const open=next.filter(t=>!path.includes(t.to));if(!open.length){out.push([...path]);return;}for(const t of open)walk(t.to,[...path,t.to]);};
 for(const s of starts)walk(s,[s]);
 const title=ids=>{const a=G.nodes.get(ids[0]),z=G.nodes.get(ids.at(-1));return (a?.title||ids[0])+' → '+(z?.title||ids.at(-1));};
 return out.map((ids,i)=>({id:'path-'+(i+1),title:title(ids),ids}));
}
// The words of one step of a walk: where the token is, what kind of element holds it, and the condition of the flow it
// took to get there.
export function describeWalkStep(p,ids,i){
 const G=processGraph(p),id=ids[i],n=G.nodes.get(id);if(!n)return '';
 const took=i>0?G.sequence.find(t=>t.from===ids[i-1]&&t.to===id):null;
 const kind=n.kind==='gateway'?`${/^[aeiou]/.test(n.gatewayType)?'an':'a'} ${n.gatewayType} gateway`:n.kind==='event'?`${n.position==='start'?'the start':n.position==='end'?'an end':n.position==='boundary'?'a boundary':'an intermediate'} event${n.eventType&&n.eventType!=='none'?' ('+n.eventType+')':''}`:n.kind==='subprocess'?'a sub-process':n.record?.type==='journey'?'a journey step':'a task';
 return `${i+1} of ${ids.length} · ${n.title}: ${kind}${n.pool?', in the pool of '+(list(p.interfaces?.parties).find(x=>x.id===n.pool)?.title||n.pool):''}${took?`; reached by “${took.label}”${took.condition&&took.condition!==took.label?' when '+took.condition:''}`:''}.`;
}

// ---------------------------------------------------------------- the checks
// PROC-START no start event; PROC-END no end event reachable from a start; PROC-REACH an element no path reaches or that
// reaches no end; PROC-GATEWAY an exclusive or inclusive gateway with two or more outgoing flows missing a condition, or a
// parallel split without a join; PROC-DANGLING a flow whose end is gone (or a sub-process parent that is gone);
// PROC-BOUNDARY a boundary event attached to nothing; PROC-MESSAGE a message flow inside one pool or without a contract,
// or a sequence flow across pools. They apply once the project models a process (an element or a flow beyond the journey
// steps); a journey alone is a list of steps, not a process. External pools are participants: they are not asked for a
// start or an end of their own.
export function processFindings(p){
 const out=[],add=(code,id,title,detail,level='error',extra={})=>out.push({id:code+':'+id,code,artefactId:id,objectId:id,title,detail,level,...extra});
 const G=processGraph(p);
 if(!G.elements.length&&!G.transitions.length)return out;
 const known=new Set(G.nodes.keys()),ours=[...G.nodes.values()].filter(n=>n.pool==null);
 for(const t of G.transitions){
  if(!known.has(t.from)||!known.has(t.to))add('PROC-DANGLING',t.id,'Repair the flow '+(t.label||t.id),`${t.from} → ${t.to}: an end of this flow is no longer in the process. Reconnect it or remove it.`,'error',{relationshipId:t.id});
  else if(t.kind==='message'){
   if(G.poolOf(t.from)===G.poolOf(t.to))add('PROC-MESSAGE',t.id,'Move the message flow '+(t.label||t.id)+' across pools',`${G.nodes.get(t.from).title} → ${G.nodes.get(t.to).title}: a message flow runs between two pools; both ends stand in the same one. Put one end in an external participant's pool, or make it a sequence flow.`,'error',{relationshipId:t.id});
   if(!t.contractId||!list(p.interfaces?.contracts).some(c=>c.id===t.contractId))add('PROC-MESSAGE',t.id+':contract','Name the contract the message flow '+(t.label||t.id)+' carries',`${G.nodes.get(t.from).title} → ${G.nodes.get(t.to).title}: a message flow carries an interface contract; choose one from Chapter 8.`,'error',{relationshipId:t.id});
  }else if(G.poolOf(t.from)!==G.poolOf(t.to))add('PROC-MESSAGE',t.id,'Make the flow '+(t.label||t.id)+' a message flow',`${G.nodes.get(t.from).title} → ${G.nodes.get(t.to).title}: a sequence flow stays inside one pool; across pools the standard draws a message flow that carries a contract.`,'error',{relationshipId:t.id});
 }
 for(const e of G.elements){
  if(e.parentId&&!G.elements.some(x=>x.id===e.parentId&&x.kind==='subprocess'))add('PROC-DANGLING',e.id,'Place '+e.title+' in an existing sub-process','The sub-process it was inside is gone. Choose another or take it out.');
  if(e.kind==='event'&&(e.position==='boundary'||e.attachedTo)){const host=G.nodes.get(e.attachedTo);if(!host||!['task','subprocess'].includes(host.kind))add('PROC-BOUNDARY',e.id,'Attach the boundary event '+e.title+' to a task','A boundary event hangs on the task or sub-process it interrupts; this one is attached to nothing that exists.');}
 }
 const starts=ours.filter(n=>n.kind==='event'&&n.position==='start'),ends=ours.filter(n=>n.kind==='event'&&n.position==='end');
 if(!starts.length)add('PROC-START','project','Add a start event','No event starts the process. Add an event with no incoming flow, or mark one as the start, so a reader knows where a token begins.');
 if(!ends.length)add('PROC-END','project','Add an end event','No event ends the process. Add an event with no outgoing flow, or mark one as the end, so every path reaches an outcome.');
 // Reachability along the sequence flows, inside our pool, from the start events and backwards from the end events; a
 // boundary event is reached with its task.
 if(starts.length){
  const fwd=new Set(),q=starts.map(s=>s.id);while(q.length){const id=q.shift();if(fwd.has(id))continue;fwd.add(id);for(const t of G.outgoing.get(id)||[])q.push(t.to);for(const n of ours)if(n.attachedTo===id)q.push(n.id);}
  const back=new Set(),qb=ends.map(e=>e.id);while(qb.length){const id=qb.shift();if(back.has(id))continue;back.add(id);for(const t of G.incoming.get(id)||[])qb.push(t.from);const n=G.nodes.get(id);if(n?.attachedTo)qb.push(n.attachedTo);}
  if(ends.length&&!ends.some(e=>fwd.has(e.id)))add('PROC-END','project:reach','Connect the process to an end event','No end event is reachable from a start event along the sequence flows.');
  for(const n of ours){
   if(n.kind==='event'&&(n.position==='start'||n.position==='boundary'))continue;
   if(!fwd.has(n.id))add('PROC-REACH',n.id,'Connect '+n.title+' to the process','No sequence flow from a start event reaches it.','warning');
   else if(ends.length&&!back.has(n.id)&&!(n.kind==='event'&&n.position==='end'))add('PROC-REACH',n.id,'Lead '+n.title+' to an end event','From here no sequence flow reaches an end event.','warning');
  }
 }
 for(const n of ours.filter(n=>n.kind==='gateway')){
  const outs=G.outgoing.get(n.id)||[];
  if(['exclusive','inclusive'].includes(n.gatewayType)&&outs.length>=2){const open=outs.filter(t=>!clean(t.condition));if(open.length)add('PROC-GATEWAY',n.id,'State the condition of each path out of '+n.title,`${open.length} of its ${outs.length} outgoing flows ${open.length===1?'has':'have'} no condition: ${open.map(t=>t.label||t.id).join(', ')}. An ${n.gatewayType} gateway chooses by conditions.`);}
  if(n.gatewayType==='parallel'&&outs.length>=2){
   const seen=new Set(),q=outs.map(t=>t.to);let join=false;while(q.length&&!join){const id=q.shift();if(seen.has(id))continue;seen.add(id);const m=G.nodes.get(id);if(m?.kind==='gateway'&&m.gatewayType==='parallel'&&(G.incoming.get(id)||[]).length>=2){join=true;break;}for(const t of G.outgoing.get(id)||[])q.push(t.to);}
   if(!join)add('PROC-GATEWAY',n.id,'Join the parallel paths out of '+n.title,`A parallel gateway splits into ${outs.length} paths; no parallel gateway downstream joins them, so the process cannot know when all are done.`);
  }
 }
 return out;
}

// ---------------------------------------------------------------- the commands
export function applyProcessCommand(input,command,at=new Date().toISOString()){
 const p=structuredClone(input),m=p.processModel||{version:0,elements:[],transitions:[],claims:[]},raw=command.payload||{},type=command.type,kind=clean(raw.kind,20),id=clean(raw.id,100);
 if(type==='process.remove')return removeProcessRecord(p,m,id);
 if(!['process.element','process.transition','process.claim'].includes(type))throw Error('Unknown process action.');
 const names={'process.element':'elements','process.transition':'transitions','process.claim':'claims'},rows=m[names[type]],old=rows.find(r=>r.id===id);
 if(id&&!old)throw Error('This process record no longer exists. Reload the project.');
 if(!old&&rows.length>=PROCESS_LIMITS[names[type]])throw Error('This workspace keeps up to 500 process '+names[type]+'.');
 const nextId=id||'PROC-'+(type==='process.element'?'E':type==='process.transition'?'T':'C')+'-'+crypto.randomUUID();let record;
 const parties=list(p.interfaces?.parties),contracts=list(p.interfaces?.contracts),data=list(p.interfaces?.data);
 if(type==='process.element'){
  if(!PROCESS_KINDS.includes(kind))throw Error('Choose a process task, gateway, event, account, sub-process or data object.');
  const title=clean(raw.title,160);if(!title)throw Error('Name the process object.');
  const authorityId=kind==='account'?clean(raw.authorityId,100):'';
  if(authorityId&&!p.realisation?.components?.some(c=>c.id===authorityId))throw Error('Choose an application component in this project as the account authority.');
  const elements=processElements(p),steps=list(p.artefacts).filter(a=>a.type==='journey');
  // The semantics (round 6, Contract T), each checked against the records it names.
  const eventType=kind==='event'?clean(raw.eventType,20)||'none':'',position=kind==='event'?clean(raw.position,20)||'intermediate':'',attachedTo=kind==='event'?clean(raw.attachedTo,100):'';
  if(kind==='event'&&!EVENT_TYPES.includes(eventType))throw Error('Choose an event type: none, message, timer, error or signal.');
  if(kind==='event'&&!EVENT_POSITIONS.includes(position))throw Error('Say where the event sits: start, intermediate, end or boundary.');
  if(position==='boundary'&&!attachedTo)throw Error('Attach the boundary event to a task.');
  if(attachedTo&&position!=='boundary')throw Error('Only a boundary event is attached to a task.');
  if(attachedTo&&attachedTo!==id&&!(steps.some(s=>s.id===attachedTo)||elements.some(e=>e.id===attachedTo&&['task','subprocess'].includes(e.kind)&&e.id!==id)))throw Error('Attach the boundary event to a task or sub-process in this process.');
  if(attachedTo&&attachedTo===id)throw Error('An event cannot be attached to itself.');
  const gatewayType=kind==='gateway'?clean(raw.gatewayType,20)||'exclusive':'';
  if(kind==='gateway'&&!GATEWAY_TYPES.includes(gatewayType))throw Error('Choose a gateway type: exclusive, parallel, inclusive or event.');
  const parentId=['account','data'].includes(kind)?'':clean(raw.parentId,100);
  if(parentId){if(parentId===id)throw Error('A sub-process cannot be inside itself.');const parent=elements.find(e=>e.id===parentId);if(!parent||parent.kind!=='subprocess')throw Error('Choose a sub-process in this process to place it inside.');let up=parent;const seen=new Set([id]);while(up){if(seen.has(up.id))throw Error('A sub-process cannot be inside one of its own elements.');seen.add(up.id);up=up.parentId?elements.find(e=>e.id===up.parentId):null;}}
  const partyId=['account','data'].includes(kind)?'':clean(raw.partyId,100);
  if(partyId&&!parties.some(x=>x.id===partyId))throw Error('Choose an external participant from Chapter 8 as the pool.');
  const dataId=clean(raw.dataId,100);
  if(dataId&&kind!=='data')throw Error('Only a data object names a data definition.');
  if(kind==='data'&&!dataId)throw Error('Choose the data definition the data object stands for.');
  if(dataId&&!data.some(d=>d.id===dataId))throw Error('Choose a data definition from Chapter 8.');
  record={...old,id:nextId,kind,title,purpose:clean(raw.purpose),lane:clean(raw.lane,100)||'Unassigned',owner:clean(raw.owner,180),authorityId,source:clean(raw.source,600),sourceLocator:clean(raw.sourceLocator,240),...elementLinks(p,raw,old),eventType,position,attachedTo,gatewayType,parentId,partyId,dataId,origin:old?.origin||'architect',confirmed:false,revision:(old?.revision||0)+1,at};
  if(kind!=='event'){delete record.eventType;delete record.position;delete record.attachedTo;}
  if(kind!=='gateway')delete record.gatewayType;
  if(!parentId)delete record.parentId;if(!partyId)delete record.partyId;if(!dataId)delete record.dataId;
  if(kind==='subprocess'&&old&&old.kind!=='subprocess')for(const e of m.elements)if(e.parentId===id)delete e.parentId;
 }else if(type==='process.transition'){
  const from=clean(raw.from,100),to=clean(raw.to,100),flowKind=clean(raw.kind,20)||'sequence';
  if(!TRANSITION_KINDS.includes(flowKind))throw Error('Choose a sequence flow or a message flow.');
  const elements=processElements(p),flowNodes=new Set([...p.artefacts.filter(a=>a.type==='journey').map(a=>a.id),...elements.filter(e=>!['account','data'].includes(e.kind)).map(e=>e.id)]);
  if(!flowNodes.has(from)||!flowNodes.has(to)||from===to)throw Error('Connect two distinct process objects in this project.');
  const target=elements.find(e=>e.id===to);if(target?.kind==='event'&&(target.position==='boundary'||target.attachedTo))throw Error('A boundary event starts a path; a flow cannot lead into it.');
  const label=clean(raw.label,100),condition=clean(raw.condition,600);if(!label)throw Error('Name the transition.');
  if(processTransitions(p).some(t=>t.from===from&&t.to===to&&t.id!==id))throw Error('This process transition already exists.');
  const poolOf=x=>elements.find(e=>e.id===x)?.partyId||'';
  const contractId=clean(raw.contractId,100);
  if(contractId&&!contracts.some(c=>c.id===contractId))throw Error('Choose an interface contract from Chapter 8.');
  if(flowKind==='message'){if(!contractId)throw Error('A message flow names the contract it carries.');if(poolOf(from)===poolOf(to))throw Error('A message flow crosses pools: put one end in an external participant\'s pool.');}
  else if(poolOf(from)!==poolOf(to))throw Error('A sequence flow stays inside one pool; across pools use a message flow with its contract.');
  record={...old,id:nextId,from,to,label,condition,kind:flowKind,contractId,owner:clean(raw.owner,180),source:clean(raw.source,600),sourceLocator:clean(raw.sourceLocator,240),origin:old?.origin||'architect',confirmed:false,revision:(old?.revision||0)+1,at};
  if(!contractId)delete record.contractId;
 }else{
  const subjectId=clean(raw.subjectId,100),known=new Set([...p.artefacts.map(a=>a.id),...processElements(p).map(e=>e.id),...processTransitions(p).map(t=>t.id)]);
  if(!known.has(subjectId))throw Error('Link the claim to an existing process object or transition.');
  const topic=clean(raw.topic,120),statement=clean(raw.statement,1200),source=clean(raw.source,600),sourceLocator=clean(raw.sourceLocator,240);
  if(!topic||!statement||!source||!sourceLocator)throw Error('Record the claim topic, statement, source and exact locator.');
  record={...old,id:nextId,subjectId,topic,statement,source,sourceLocator,owner:clean(raw.owner,180),status:'Needs review',origin:old?.origin||'architect',confirmed:false,revision:(old?.revision||0)+1,at};
 }
 if(old)rows[rows.indexOf(old)]=record;else rows.push(record);
 m.version=(m.version||0)+1;p.processModel=m;return {document:p,selected:nextId};
}
// Removing a record the architect added (round 5, R5-C): a process object, a conditional path or a source claim. A
// reference route is illustrative and never stored, so it cannot be removed; a record that a path or a claim still
// names is removed only after them, so nothing is left pointing at a record that has gone.
function removeProcessRecord(p,m,id){
 const names=['elements','transitions','claims'],rows=names.map(n=>m[n]=list(m[n])).find(r=>r.some(x=>x.id===id));
 if(!id||!rows)throw Error(id.startsWith('PROC-REF-')?'A reference route is illustrative: add a reviewed process object, path or claim instead of removing it.':'This process record no longer exists. Reload the project.');
 const paths=m.transitions.filter(t=>t.id!==id&&(t.from===id||t.to===id)),claims=m.claims.filter(c=>c.subjectId===id);
 if(paths.length)throw Error('Remove the conditional paths that connect it first: '+paths.map(t=>t.label||t.id).join(', ')+'.');
 if(claims.length)throw Error('Remove the source claims recorded on it first: '+claims.map(c=>c.topic||c.id).join(', ')+'.');
 const inside=m.elements.filter(e=>e.id!==id&&e.parentId===id),hanging=m.elements.filter(e=>e.id!==id&&e.attachedTo===id);
 if(inside.length)throw Error('Take the elements out of the sub-process first: '+inside.map(e=>e.title||e.id).join(', ')+'.');
 if(hanging.length)throw Error('Detach the boundary events first: '+hanging.map(e=>e.title||e.id).join(', ')+'.');
 // Round 12 (GR-GOV-24): removing a path is an edit of the process; an element or a claim is a record, and leaves the
 // design only through the one retire path (record.retire, Chapter 1), restorable, with its reason, who and when.
 if(rows!==m.transitions)throw Error(RETIRE_ONLY);
 rows.splice(rows.findIndex(x=>x.id===id),1);
 m.version=(m.version||0)+1;p.processModel=m;return {document:p,selected:null};
}
export function processMarkdown(p){const elements=list(p.processModel?.elements),transitions=list(p.processModel?.transitions),claims=list(p.processModel?.claims),conflicts=processConflicts(p);
 const where=e=>[e.kind==='event'?`${e.position||'intermediate'} event${e.eventType&&e.eventType!=='none'?' ('+e.eventType+')':''}`:e.kind==='gateway'?`${e.gatewayType||'exclusive'} gateway`:e.kind,e.partyId?'pool '+e.partyId:'',e.parentId?'inside '+e.parentId:'',e.attachedTo?'attached to '+e.attachedTo:'',e.dataId?'data '+e.dataId:''].filter(Boolean).join(', ');
 return '## Process perspective and source questions\n\n'+(referenceProcess(p).elements.length?'The reference payment paths (confirmed, held, uncertain) are illustrative and require architect review. They reuse the Chapter 1 journey step identities.\n\n':'')+
 (elements.length?'### Architect process objects\n\n'+elements.map(e=>`- ${e.id} · ${where(e)}: ${e.title} (${e.lane}); ${e.purpose||'Purpose open'}. Source: ${e.source||'Not recorded'} ${e.sourceLocator||''}. Working / unconfirmed.`).join('\n')+'\n\n':'')+
 (transitions.length?'### Conditional transitions\n\n'+transitions.map(e=>`- ${e.from} → ${e.to}: ${e.label}${e.kind==='message'?' (message flow'+(e.contractId?', '+e.contractId:'')+')':''}; condition: ${e.condition||'none recorded'}. Source: ${e.source||'Not recorded'} ${e.sourceLocator||''}. Working / unconfirmed.`).join('\n')+'\n\n':'')+
 (claims.length?'### Source claims for review\n\n'+claims.map(c=>`- ${c.id} · ${c.subjectId} · ${c.topic}: ${c.statement} (${c.source}, ${c.sourceLocator}; needs review).`).join('\n')+'\n\n':'No source claims have been reviewed for the process perspective.\n\n')+
 (conflicts.length?'Different source statements need reconciliation (they may describe different paths or abstraction levels): '+conflicts.map(g=>g.map(c=>c.id).join(' / ')).join('; ')+'.\n\n':'');
}
