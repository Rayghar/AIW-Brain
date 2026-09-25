import {PROJECT_LIMITS} from './intake-domain.js';
import {sourceAssurance,assuranceFindings} from './assurance-domain.js';
export const PROJECT_ID='bank-payment';
export const TYPES=[
  {id:'outcome',name:'Business outcome',plural:'Outcomes',prefix:'OUT',color:'#527343'},
  {id:'stakeholder',name:'Stakeholder',plural:'Stakeholders',prefix:'STK',color:'#886a32'},
  {id:'actor',name:'Actor',plural:'Actors',prefix:'ACT',color:'#386d68'},
  {id:'scope',name:'Scope boundary',plural:'Scope',prefix:'SCP',color:'#797044'},
  {id:'journey',name:'Journey step',plural:'Journey',prefix:'JRN',color:'#906932'},
  {id:'constraint',name:'Constraint',plural:'Constraints',prefix:'CON',color:'#785972'},
  {id:'assumption',name:'Assumption',plural:'Assumptions',prefix:'ASM',color:'#786347'},
  {id:'requirement',name:'Functional requirement',plural:'Requirements',prefix:'REQ',color:'#2f6855'}
];
export const LINK_TYPES=['participates in','requires','delivers','owns','precedes','constrains','supports','informs'];
export const PRIORITIES=['Must','Should','Could'];
export const typeInfo=type=>TYPES.find(t=>t.id===type);
const copy=value=>JSON.parse(JSON.stringify(value));
const text=(value,max=4000)=>typeof value==='string'?value.trim().slice(0,max):'';
export function seedProject(){
  const records=[
    ['OUT-001','outcome','A payment with a known outcome','Customers can follow an instruction to a confirmed, held, or pending outcome.','Product owner'],
    ['OUT-002','outcome','Protect the financial effect','An instruction must not cause an unintended duplicate debit.','Operations lead'],
    ['STK-001','stakeholder','Payments product owner','Accountable for the payment experience and the scope of the service.','Product owner'],
    ['STK-002','stakeholder','Payment operations lead','Accountable for held payments, uncertain outcomes, and operational follow-up.','Operations lead'],
    ['ACT-001','actor','Bank customer','Submits an instruction and needs to understand its current outcome.','Channels team'],
    ['ACT-002','actor','Operations analyst','Investigates held instructions and uncertain settlement outcomes.','Operations lead'],
    ['SCP-001','scope','Domestic account-to-account payment','In scope: instruction capture, risk screening, posting, settlement, and outcome enquiry.','Product owner'],
    ['SCP-002','scope','Card and international payments','Out of scope for this reference journey.','Product owner'],
    ['JRN-001','journey','Initiate payment','The customer submits an instruction with a destination, amount, and request reference.','Channels team'],
    ['JRN-002','journey','Screen the instruction','Screen the instruction and choose whether to allow or hold it.','Risk team'],
    ['JRN-003','journey','Record the posting','Record the authorised financial effect with the existing request reference.','Core banking team'],
    ['JRN-004','journey','Settle the payment','Submit the external leg and track a confirmed or uncertain response.','Payments team'],
    ['JRN-005','journey','Communicate the outcome','Expose the known status and the next action to the customer or operations.','Channels team'],
    ['CON-001','constraint','Use the existing core ledger','The reference project assumes the current ledger remains the book of record. Confirm with the bank.','Architecture lead'],
    ['ASM-001','assumption','Settlement status can be enquired','An enquiry can resolve an uncertain external response. Contract evidence is still required.','Payments team'],
    ['REQ-001','requirement','Accept a traceable payment instruction','The service shall accept a valid instruction and return a stable request reference.','Channels team','Given a valid instruction, when it is accepted, then a request reference is returned and can be used for status enquiry.','api'],
    ['REQ-002','requirement','Hold an instruction that needs review','The service shall hold an instruction that requires additional screening and expose its reason.','Risk team','Given an instruction that requires review, when screening completes, then its status is held and no ledger posting occurs.','risk'],
    ['REQ-003','requirement','Prevent duplicate financial effects','The service shall recognise a repeated instruction reference and preserve one financial effect.','Core banking team','Given an instruction already posted, when the same reference is retried, then the recorded outcome is returned without another debit.','ledger'],
    ['REQ-004','requirement','Retain an uncertain settlement outcome','The service shall keep an uncertain response pending until an enquiry resolves it.','Payments team','Given no definitive settlement response, when the request times out, then the outcome remains pending and the same reference is retained for enquiry.','hub'],
    ['REQ-005','requirement','Notify the customer quickly','The service shall notify the customer quickly after the payment outcome is known.','Channels team','','notify']
  ];
  const artefacts=records.map(([id,type,title,description,owner,acceptance='',modelRef=''])=>({id,type,title,description,owner,source:'Illustrative Bank Payment Journey brief',priority:'Must',acceptance,origin:'reference',confirmed:false,scopeMode:id==='SCP-002'?'out':'in',order:type==='journey'?Number(id.split('-')[1]):0,modelRef}));
  const specs=[['ACT-001','JRN-001','participates in'],['ACT-002','JRN-002','participates in'],['ACT-002','JRN-004','participates in'],['ACT-001','JRN-005','participates in'],['STK-001','OUT-001','owns'],['STK-002','OUT-002','owns'],['SCP-001','JRN-001','supports'],['CON-001','REQ-003','constrains'],['ASM-001','REQ-004','informs']];
  for(let i=1;i<=5;i++){const n=String(i).padStart(3,'0');specs.push(['JRN-'+n,'REQ-'+n,'requires'],['REQ-'+n,i===3?'OUT-002':'OUT-001','delivers']);if(i<5)specs.push(['JRN-'+n,'JRN-'+String(i+1).padStart(3,'0'),'precedes']);}
  const counters=Object.fromEntries(TYPES.map(t=>[t.id,Math.max(0,...artefacts.filter(a=>a.type===t.id).map(a=>Number(a.id.split('-')[1])))]));
  return {schemaVersion:'aiw.project.v2',id:PROJECT_ID,name:'Bank Payment Journey',contentVersion:1,brief:{problem:'Customers and operations need a clear, traceable payment journey, including held instructions and uncertain settlement outcomes.',goal:'Define the responsibilities needed to move a domestic payment from instruction to a known outcome.',source:'Illustrative reference brief — confirm against your project',confirmed:false},artefacts,relationships:specs.map(([from,to,kind],i)=>({id:'REL-'+String(i+1).padStart(3,'0'),from,to,kind})),counters:{...counters,relationship:specs.length},review:null,handoff:null,explorer:null};
}
export function related(project,id){return project.relationships.filter(r=>r.from===id||r.to===id);}
export function neighbours(project,id){const ids=new Set([id]);for(const r of related(project,id)){ids.add(r.from);ids.add(r.to)}return ids;}
export function findings(project){
  const result=[],add=(code,id,title,detail,level='warning',extra={})=>result.push({id:code+':'+id,code,artefactId:id,title,detail,level,...extra});
  const byId=new Map(project.artefacts.map(a=>[a.id,a])),adjacency=new Map(),titles=new Map();
  for(const r of project.relationships){for(const [from,to] of [[r.from,r.to],[r.to,r.from]]){if(!adjacency.has(from))adjacency.set(from,new Set());adjacency.get(from).add(to);}}
  for(const a of project.artefacts){const key=a.type+':'+a.title.toLowerCase().replace(/[^a-z0-9]/g,'');const old=titles.get(key);if(!old||a.id<old.id)titles.set(key,a);}
  if(!project.brief.problem||!project.brief.goal||!project.brief.source)add('brief','brief','Complete the project brief','Capture the problem, intended outcome, and source.','error');
  if(!project.brief.confirmed)add('brief-review','brief','Confirm the project brief','Review the brief and its source before confirming it.');
  for(const type of TYPES)if(!project.artefacts.some(a=>a.type===type.id))add('missing-type',type.id,'Add '+type.name.toLowerCase(),'Define this part of the project context, or explicitly record that it does not apply.','error',{artefactType:type.id});
  for(const a of project.artefacts){
    if(!a.description)add('description',a.id,'Add a description','Explain what this artefact means in your project.','error');
    if(!a.confirmed)add('confirmation',a.id,'Review the '+(a.origin==='reference'?'reference example':'draft'),a.origin==='reference'?'This record is illustrative; confirm it only after checking its content.':'This record has not yet been confirmed by you.');
    if(a.type==='requirement'){
      if(!a.owner||!a.source)add('accountability',a.id,'Name the owner and source','Every requirement needs an accountable owner and a traceable source.','error');
      if(a.acceptance.length<20||/\[[^\]]+\]/.test(a.acceptance))add('acceptance',a.id,'Make acceptance testable','Describe the starting condition, action, and observable expected result.','error');
      if(/\b(quickly|fast|user-friendly|seamless|asap|timely|easy|efficiently)\b/i.test(a.description+' '+a.title))add('ambiguity',a.id,'Resolve ambiguous wording','Replace subjective wording with an observable response or a confirmed measurable target.');
      const near=[...(adjacency.get(a.id)||[])].map(id=>byId.get(id)).filter(Boolean);
      if(!near.some(n=>n.type==='journey'))add('journey-link',a.id,'Link a journey step','Show where this requirement is needed.','error');
      if(!near.some(n=>n.type==='outcome'))add('outcome-link',a.id,'Link a business outcome','Show why this requirement matters.','error');
    }
    const norm=a.title.toLowerCase().replace(/[^a-z0-9]/g,'');
    const duplicate=titles.get(a.type+':'+norm);
    if(duplicate?.id<a.id)add('duplicate',a.id,'Check a possible duplicate',`${duplicate.id} has the same title. Compare the content before keeping both.`,'warning');
  }
  for(const r of project.relationships)if(!byId.has(r.from)||!byId.has(r.to))add('broken-link',r.id,'Repair a broken relationship',`${r.from} → ${r.to} references a missing artefact.`,'error',{relationshipId:r.id});
  return [...result,...sourceAssurance(project.artefacts).findings,...assuranceFindings(project)];
}
export function milestones(project){
  const fs=findings(project),reqs=project.artefacts.filter(a=>a.type==='requirement'),journey=project.artefacts.filter(a=>a.type==='journey');
  const context=['outcome','stakeholder','actor','scope','constraint','assumption'];
  const result = [
    {id:'brief',name:'Confirm the project brief',done:!!(project.brief.problem&&project.brief.goal&&project.brief.source&&project.brief.confirmed),tab:'work',filter:'brief'},
    {id:'context',name:'Review the project context',done:context.every(t=>project.artefacts.some(a=>a.type===t))&&project.artefacts.filter(a=>context.includes(a.type)).every(a=>a.description&&a.confirmed&&!fs.some(f=>f.artefactId===a.id)),tab:'work',filter:'context'},
    {id:'journey',name:'Connect and review the journey',done:journey.length>0&&journey.every(a=>a.confirmed&&a.description&&related(project,a.id).length>0&&!fs.some(f=>f.artefactId===a.id)),tab:'model',filter:'journey'},
    {id:'requirements',name:'Make requirements ready to test',done:reqs.length>0&&reqs.every(a=>a.confirmed)&&!fs.some(f=>f.code==='broken-link'||reqs.some(a=>a.id===f.artefactId)),tab:'work',filter:'requirement'},
    {id:'review',name:'Run and review validation',done:project.review?.contentVersion===project.contentVersion,tab:'validate'},
    {id:'handoff',name:'Carry requirements into Chapter 2',done:project.handoff?.contentVersion===project.contentVersion,tab:'output'}
  ];
  const contextRecords=project.artefacts.filter(a=>context.includes(a.type));
  const details=[project.brief.confirmed?'Brief confirmed':'Problem, outcome, and evidence',`${contextRecords.filter(a=>a.description&&a.confirmed&&!fs.some(f=>f.artefactId===a.id)).length} of ${contextRecords.length} context records reviewed`,`${journey.filter(a=>a.confirmed&&a.description&&related(project,a.id).length>0&&!fs.some(f=>f.artefactId===a.id)).length} of ${journey.length} steps reviewed and linked`,`${reqs.filter(a=>a.confirmed&&!fs.some(f=>f.artefactId===a.id)).length} of ${reqs.length} requirements ready`,`${fs.length} open findings`,project.handoff?.contentVersion===project.contentVersion?'Current revision received':'Same records, no re-entry'];
  return result.map((m,i)=>({...m,detail:details[i]}));
}
export function guidance(project,artefact,tab='work',section='brief'){
  if(!artefact){
    const fs=findings(project),gaps=fs.filter(f=>!['confirmation','brief-review'].includes(f.code));
    const pages={
      work:{heading:section==='brief'?(project.brief.confirmed?'The purpose is recorded.':'Make the brief yours.'):'Give every record a purpose.',explanation:section==='brief'?'Your brief establishes the problem, intended outcome, and source for the project.':'Select an artefact to inspect its owner, evidence, and relationships.',attention:project.brief.confirmed?'The brief is confirmed. Review the people, boundaries, and assumptions that support it.':'Review the reference content before confirming it.',next:'Connect the brief to outcomes, actors, and scope.'},
      model:{heading:'Follow the reason behind it.',explanation:'Actors participate in journey steps. Steps require behaviour, and requirements deliver business outcomes.',attention:'Select an artefact to illuminate its direct relationships. Hidden perspectives are revealed when you follow a connection.',next:'Trace the journey one step at a time, then inspect its requirements.'},
      validate:{heading:gaps.length?'Close the gaps with evidence.':'Review what is still unconfirmed.',explanation:`${gaps.length} content gaps and ${fs.length-gaps.length} confirmation items remain in this revision.`,attention:gaps[0]?.detail||'Structural checks alone cannot confirm that the requirements reflect your project.',next:'Open a finding, make the change, and record checks for the latest revision.'},
      output:{heading:'Carry a clear brief forward.',explanation:'The export includes the brief, requirements, relationships, sources, and open findings.',attention:project.handoff?.contentVersion===project.contentVersion?'The current revision has been received by Chapter 2.':'Confirm what is ready and acknowledge what remains open before the handoff.',next:'Export the requirements brief or review the Chapter 2 handoff.'}
    };return pages[tab]||pages.work;
  }
  const issues=findings(project).filter(f=>f.artefactId===artefact.id),count=related(project,artefact.id).length;
  const context={work:'Clarify the wording, owner, and source before confirming this record.',model:'Follow its connections to see where it belongs and why it matters.',validate:'Resolve the highlighted finding, then run validation again.',output:'This stable ID carries the same record into the next chapter.'};
  const issue=issues.find(f=>!['confirmation','brief-review'].includes(f.code))||issues[0];
  return {explanation:`${typeInfo(artefact.type).name} · ${artefact.id}. ${artefact.description||'A description has not been recorded.'}`,attention:issue?.detail||`${count} relationships connect this artefact to the project.`,next:context[tab]||context.output};
}
export function proposals(project,selected,tab='work'){
  const req=selected?.type==='requirement'?selected:project.artefacts.find(a=>a.type==='requirement'&&!a.acceptance)||project.artefacts.find(a=>a.type==='requirement');
  const result=[];
  if(req){const actor=project.artefacts.find(a=>a.type==='actor');const criterion=req.modelRef==='notify'?'Given a recorded payment outcome, when the customer views the payment using its reference, then the recorded status and next permitted action are shown without treating a pending outcome as failure.':`Given [the starting condition for ${actor?.title.toLowerCase()||'the actor'}], when [the action described in ${req.id} occurs], then [the observable expected result] can be verified.`;result.push({id:'acceptance',label:req.acceptance?'Examine an acceptance boundary':'Make acceptance observable',reason:`${tab==='validate'?'Resolve the testability gap in':tab==='output'?'Make the exported acceptance clear for':tab==='model'?'Connect an observable result to':'Strengthen'} ${req.id}. Replace any bracketed prompts before confirming.`,target:req.id,mode:'edit',record:{...req,...(req.modelRef==='notify'&&!req.acceptance?{title:'Communicate the recorded payment outcome',description:'The service shall expose the recorded payment status and the next permitted action using the payment reference.'}:{}),acceptance:req.acceptance?req.acceptance+'\nGiven [an exception to the normal condition], when [the actor repeats the action], then [the safe, observable result] is verified.':criterion,confirmed:false}});}
  if((!project.workspace?.template||project.workspace.template==='bank-payment')){
  result.push({id:'pending',label:'Make an uncertain outcome explicit',reason:'A timeout does not establish failure. Define what the customer or operations can observe while the result is unknown.',mode:'new',record:{type:'requirement',title:'Enquire about a pending payment',description:'The service shall allow an authorised actor to enquire using the existing payment reference and distinguish pending, confirmed, and held outcomes.',owner:'Payments team',source:'Mind Factory suggestion — review with operations',priority:'Should',acceptance:'Given a payment with an uncertain outcome, when an authorised actor enquires using its reference, then the current known status and the permitted next action are returned.',confirmed:false},links:[['JRN-004','requires','new'],['new','delivers','OUT-001']].filter(([a,,b])=>(a==='new'||project.artefacts.some(n=>n.id===a))&&(b==='new'||project.artefacts.some(n=>n.id===b)))});
  result.push({id:'assumption',label:'Expose an unverified dependency',reason:'Capture evidence still needed to rely on an external settlement enquiry.',mode:'new',record:{type:'assumption',title:'Confirm the external enquiry contract',description:'The external service can provide an authoritative outcome for an existing reference. Obtain contract evidence and test examples before treating this as confirmed.',owner:'Payments team',source:'Mind Factory suggestion — evidence required',priority:'Must',acceptance:'',confirmed:false}});
  }
  if(selected&&selected.type!=='requirement')result.unshift({id:'context-evidence',label:'Test the assumption behind this '+typeInfo(selected.type).name.toLowerCase(),reason:`What evidence would make ${selected.id} dependable${tab==='output'?' for the next chapter':tab==='model'?' in the connected journey':tab==='validate'?' during review':''}? Record an open question before treating it as a fact.`,mode:'new',record:{type:'assumption',title:'Verify '+selected.title,description:`Confirm the evidence, boundaries, and exceptions behind ${selected.id}: ${selected.title}. Record the source before confirming this assumption.`,owner:selected.owner,source:'Mind Factory suggestion — evidence required',priority:'Should',acceptance:'',confirmed:false},links:[['new','informs',selected.id]]});
  if((!!project.workspace?.template&&project.workspace.template!=='bank-payment')&&!result.length)result.push({id:'outcome',mode:'new',label:'Define a useful business outcome',reason:'Start with an observable change for the people in your brief; edit this prompt before confirming.',record:{type:'outcome',title:'Define the intended outcome',description:'[Who benefits, what changes, and how will the change be observed?]',owner:'',source:'Guidance proposal — connect to your project brief',priority:'Must',confirmed:false}});
  const normal=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
  return result.filter(p=>p.mode!=='new'||!project.artefacts.some(a=>a.type===p.record.type&&normal(a.title)===normal(p.record.title)));
}
function cleanRecord(raw,old,id){
  const type=old?.type||raw.type;if(!typeInfo(type))throw Error('Choose a valid artefact type.');
  const title=text(raw.title,160);if(!title)throw Error('Give the artefact a title.');
  const retained=old?Object.fromEntries(['externalId','domain','capability','assessment','provenance','sourceMissing'].filter(k=>old[k]!==undefined).map(k=>[k,old[k]])):{};
  return {...retained,id,type,title,description:text(raw.description),owner:text(raw.owner,180),source:text(raw.source,600),priority:PRIORITIES.includes(raw.priority)?raw.priority:'Must',acceptance:text(raw.acceptance),confirmed:raw.confirmed===true,origin:old?.origin||(['reference','suggestion'].includes(raw.origin)?raw.origin:'user'),scopeMode:raw.scopeMode==='out'?'out':'in',order:Math.max(0,Math.min(999,Number(raw.order)||0)),modelRef:old?.modelRef||''};
}
export function applyCommand(input,command,now=new Date().toISOString()){
  const p=copy(input),payload=command.payload||{};let selected=null,content=true;
  if(command.type==='brief')p.brief={problem:text(payload.problem),goal:text(payload.goal),source:text(payload.source,600),confirmed:payload.confirmed===true};
  else if(command.type==='artefact'){
    const old=payload.id?p.artefacts.find(a=>a.id===payload.id):null;if(payload.id&&!old)throw Error('This artefact no longer exists. Reload the project.');
    const info=typeInfo(old?.type||payload.type);if(!info)throw Error('Choose an artefact type.');
    if(!old&&(p.artefacts.length>=PROJECT_LIMITS.artefacts||info.id==='requirement'&&p.artefacts.filter(a=>a.type==='requirement').length>=PROJECT_LIMITS.requirements))throw Error('This project supports up to 5,000 requirements and 6,000 total artefacts.');
    const id=old?.id||`${info.prefix}-${String(++p.counters[info.id]).padStart(3,'0')}`;
    const record=cleanRecord(payload,old,id);if(old)p.artefacts[p.artefacts.indexOf(old)]=record;else p.artefacts.push(record);selected=id;
    if(!old&&Array.isArray(payload.links))for(const [from,kind,to]of payload.links.slice(0,12))addLink(p,from==='new'?id:from,to==='new'?id:to,kind);
  }else if(command.type==='deleteArtefact'){
    if(!p.artefacts.some(a=>a.id===payload.id))throw Error('This artefact no longer exists.');
    p.artefacts=p.artefacts.filter(a=>a.id!==payload.id);p.relationships=p.relationships.filter(r=>r.from!==payload.id&&r.to!==payload.id);
  }else if(command.type==='relationship')addLink(p,payload.from,payload.to,payload.kind);
  else if(command.type==='deleteRelationship'){p.relationships=p.relationships.filter(r=>r.id!==payload.id);}
  else if(command.type==='review'){content=false;p.review={at:now,contentVersion:p.contentVersion,findings:findings(p).length};p.handoff=null;}
  else if(command.type==='handoff'){
    content=false;if(!p.artefacts.some(a=>a.type==='requirement'))throw Error('Add a requirement before continuing.');
    if(p.review?.contentVersion!==p.contentVersion)throw Error('Run validation for the current requirements first.');
    const open=findings(p);if(open.length&&!payload.acknowledge)throw Error('Acknowledge the open findings before carrying them forward.');
    p.handoff={at:now,contentVersion:p.contentVersion,openFindings:open.length,acknowledged:payload.acknowledge===true};
  }else if(command.type==='explorer'){
    content=false;const e=payload;p.explorer={accepted:Array.isArray(e.accepted)?[...new Set(e.accepted.filter(x=>['review','dedup','recovery'].includes(x)))]:[],completed:Array.isArray(e.completed)?e.completed.filter(x=>['inspect','layers4','flow','review4','physical','candidate','validate','export'].includes(x)):[],note:text(e.note,5000)};
  }else throw Error('Unknown project action.');
  if(content){p.contentVersion++;p.review=null;p.handoff=null;}
  return {document:p,selected};
}
function addLink(p,from,to,kind){
  if(from===to)throw Error('Choose two different artefacts.');
  if(!p.artefacts.some(a=>a.id===from)||!p.artefacts.some(a=>a.id===to))throw Error('Both relationship endpoints must exist.');
  if(!LINK_TYPES.includes(kind))throw Error('Choose a valid relationship.');
  if(p.relationships.some(r=>r.from===from&&r.to===to&&r.kind===kind))throw Error('This relationship already exists.');
  if(p.relationships.length>=PROJECT_LIMITS.relationships)throw Error('This project supports up to 20,000 requirement relationships.');
  p.relationships.push({id:'REL-'+String(++p.counters.relationship).padStart(3,'0'),from,to,kind});
}
export function exportMarkdown(project){
  const fs=findings(project),safe=s=>String(s).replace(/\r?\n/g,' ').replace(/\|/g,'\\|');
  return `# AIW V5 · ${project.name}\n\nChapter 1 — Requirements\n\nContent revision: ${project.contentVersion}. Confirmation records the user's review; it is not governance approval.\n\n## Project brief\n\n${project.brief.problem}\n\nIntended outcome: ${project.brief.goal}\n\nSource: ${project.brief.source}\n\nStatus: ${project.brief.confirmed?'User-confirmed':'Illustrative / unconfirmed'}\n\n`+TYPES.map(t=>`## ${t.plural}\n\n`+project.artefacts.filter(a=>a.type===t.id).map(a=>`### ${a.id} · ${a.title}\n\n${a.description}\n\nOwner: ${a.owner||'Missing'} · Priority: ${a.priority}\n\nSource: ${a.source||'Missing'}\n\nOrigin: ${a.origin} · Status: ${a.confirmed?'User-confirmed':'Unconfirmed'}\n\n${a.type==='requirement'?`Acceptance criteria: ${a.acceptance||'Missing'}\n\n`:''}`).join('')).join('')+`## Relationships\n\n| ID | From | Relationship | To |\n| --- | --- | --- | --- |\n${project.relationships.map(r=>`| ${r.id} | ${r.from} | ${safe(r.kind)} | ${r.to} |`).join('\n')}\n\n## Open findings\n\n${fs.length?fs.map(f=>`- ${f.artefactId}: ${f.title}. ${f.detail}`).join('\n'):'No findings from the current rules.'}\n\n## Chapter 2 handoff\n\n${project.handoff?.contentVersion===project.contentVersion?'Current requirements are available to Chapter 2 using the same stable IDs.':'The current revision has not been handed off.'}\n\nContextual suggestions are rule-based proposals. Live-generation status is shown in Sol.\n`;
}
