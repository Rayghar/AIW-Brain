// Process is an additional perspective on the same project identities. Reference
// routes illustrate questions to review; they are never asserted as bank facts.
const list=v=>Array.isArray(v)?v:[];
const clean=(v,n=1000)=>String(v??'').trim().slice(0,n);
const bank=p=>p.workspace?.template==='bank-payment'||p.id==='bank-payment';
export function withProcessModel(p){
 if(bank(p)&&!p.processModel)p.processModel={schemaVersion:1,referenceVersion:1,version:0,elements:[],transitions:[],claims:[]};
 return p;
}
const reference=[
 ['PROC-REF-START','event','Payment instruction received','Channel',0,0],
 ['PROC-REF-RISK','gateway','Screening disposition','Risk',3,0],
 ['PROC-REF-HELD','event','Instruction held for review','Risk',3,1],
 ['PROC-REF-OUTCOME','gateway','Settlement outcome known?','Payments',6,0],
 ['PROC-REF-PENDING','event','Pending enquiry and reconciliation','Payments',7,1],
 ['PROC-REF-DONE','event','Customer sees confirmed outcome','Channel',9,0]
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
 const elements=reference.map(([id,kind,title,lane,order,branch])=>({id,kind,title,lane,order,branch,origin:'reference',confirmed:false,source:'Illustrative Bank Payment Journey brief',purpose:'Illustrative process outcome; review its conditions and responsibilities against project evidence.'}));
 const transitions=routes.map(([from,to,label],i)=>({id:'PROC-REF-LINK-'+String(i+1).padStart(2,'0'),from,to,label,condition:label,origin:'reference',confirmed:false,source:'Illustrative Bank Payment Journey brief'}));
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
export function applyProcessCommand(input,command,at=new Date().toISOString()){
 const p=structuredClone(input),m=p.processModel||{version:0,elements:[],transitions:[],claims:[]},raw=command.payload||{},type=command.type,kind=clean(raw.kind,20),id=clean(raw.id,100);
 if(!['process.element','process.transition','process.claim'].includes(type))throw Error('Unknown process action.');
 const names={'process.element':'elements','process.transition':'transitions','process.claim':'claims'},rows=m[names[type]],old=rows.find(r=>r.id===id);
 if(id&&!old)throw Error('This process record no longer exists. Reload the project.');
 if(rows.length>499)throw Error('Export or consolidate process records before adding more.');
 const nextId=id||'PROC-'+(type==='process.element'?'E':type==='process.transition'?'T':'C')+'-'+crypto.randomUUID();let record;
 if(type==='process.element'){
  if(!['task','gateway','event','account'].includes(kind))throw Error('Choose a process task, gateway, event, or account.');
  const title=clean(raw.title,160);if(!title)throw Error('Name the process object.');
  const authorityId=kind==='account'?clean(raw.authorityId,100):'';
  if(authorityId&&!p.realisation?.components?.some(c=>c.id===authorityId))throw Error('Choose an application component in this project as the account authority.');
  record={...old,id:nextId,kind,title,purpose:clean(raw.purpose),lane:clean(raw.lane,100)||'Unassigned',owner:clean(raw.owner,180),authorityId,source:clean(raw.source,600),sourceLocator:clean(raw.sourceLocator,240),requirementIds:list(raw.requirementIds).filter(x=>p.artefacts.some(a=>a.id===x&&a.type==='requirement')).slice(0,20),origin:old?.origin||'architect',confirmed:false,revision:(old?.revision||0)+1,at};
 }else if(type==='process.transition'){
  const from=clean(raw.from,100),to=clean(raw.to,100),ids=new Set([...p.artefacts.filter(a=>a.type==='journey').map(a=>a.id),...processElements(p).filter(e=>e.kind!=='account').map(e=>e.id)]);
  if(!ids.has(from)||!ids.has(to)||from===to)throw Error('Connect two distinct process objects in this project.');
  const label=clean(raw.label,100),condition=clean(raw.condition,600);if(!label||!condition)throw Error('Name the transition and state its condition.');
  if(processTransitions(p).some(t=>t.from===from&&t.to===to&&t.id!==id))throw Error('This process transition already exists.');
  record={...old,id:nextId,from,to,label,condition,owner:clean(raw.owner,180),source:clean(raw.source,600),sourceLocator:clean(raw.sourceLocator,240),origin:old?.origin||'architect',confirmed:false,revision:(old?.revision||0)+1,at};
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
export function processMarkdown(p){const elements=list(p.processModel?.elements),transitions=list(p.processModel?.transitions),claims=list(p.processModel?.claims),conflicts=processConflicts(p);
 return '## Process perspective and source questions\n\n'+(referenceProcess(p).elements.length?'The reference payment paths (confirmed, held, uncertain) are illustrative and require architect review. They reuse the Chapter 1 journey step identities.\n\n':'')+
 (elements.length?'### Architect process objects\n\n'+elements.map(e=>`- ${e.id} · ${e.kind}: ${e.title} (${e.lane}); ${e.purpose||'Purpose open'}. Source: ${e.source||'Not recorded'} ${e.sourceLocator||''}. Working / unconfirmed.`).join('\n')+'\n\n':'')+
 (transitions.length?'### Conditional transitions\n\n'+transitions.map(e=>`- ${e.from} → ${e.to}: ${e.label}; condition: ${e.condition}. Source: ${e.source||'Not recorded'} ${e.sourceLocator||''}. Working / unconfirmed.`).join('\n')+'\n\n':'')+
 (claims.length?'### Source claims for review\n\n'+claims.map(c=>`- ${c.id} · ${c.subjectId} · ${c.topic}: ${c.statement} (${c.source}, ${c.sourceLocator}; needs review).`).join('\n')+'\n\n':'No source claims have been reviewed for the process perspective.\n\n')+
 (conflicts.length?'Different source statements need reconciliation (they may describe different paths or abstraction levels): '+conflicts.map(g=>g.map(c=>c.id).join(' / ')).join('; ')+'.\n\n':'');
}
