import {isBlankProject,projectScenarios,scenarioSteps,journeyStages} from './model-scope.js';
import {nodes as referenceNodes,edges as referenceEdges} from './model.js';
import {withLogical,logicalGraph,logicalRecords,physicalObjects,responsibility,driversForResponsibility,decisionsForResponsibility,logicalSourceChanged,mappingCurrent,logicalHandoffCurrent} from './logical-domain.js';
import {decisionCurrent,governanceLabel} from './decisions-domain.js';

export const COMPONENT_KINDS=['service','worker','adapter','queue','store','module'];
export const COMPONENT_STATES=['draft','candidate','reviewed'];
const clean=(v,n=4000)=>typeof v==='string'?v.trim().slice(0,n):'';
const unique=v=>[...new Set(Array.isArray(v)?v.filter(x=>typeof x==='string'):[])];
const sig=v=>JSON.stringify(v),pad=n=>String(n).padStart(3,'0');
export const components=p=>p.realisation?.components||[];
export const component=(p,id)=>components(p).find(c=>c.id===id);
export const allocations=(p,id)=>p.logical.mappings.filter(m=>m.physicalId===id);
export const logicalFor=(p,id)=>allocations(p,id).map(m=>responsibility(p)(m.logicalId)).filter(Boolean);
export function componentSources(p,id){
 const c=component(p,id),rs=logicalFor(p,id);
 return {logical:rs,requirements:p.artefacts.filter(a=>a.type==='requirement'&&rs.some(r=>r.requirementIds.includes(a.id))),
 drivers:[...new Map(rs.flatMap(r=>driversForResponsibility(p,r)).map(d=>[d.id,d])).values()],
 decisions:[...new Map([...rs.flatMap(r=>decisionsForResponsibility(p,r)),...p.decisions.records.filter(d=>c?.decisionIds.includes(d.id))].map(d=>[d.id,d])).values()]};
}
function sourceSnapshot(p,c){
 const s=componentSources(p,c.id);
 return sig({logical:s.logical.map(r=>({id:r.id,title:r.title,purpose:r.purpose,boundary:r.boundary,requirements:r.requirementIds,decisions:r.decisionIds,changed:logicalSourceChanged(p,r)})),
 mappings:allocations(p,c.id).map(m=>({id:m.id,logicalId:m.logicalId,scope:m.scope,current:mappingCurrent(p,m)})),
 requirements:s.requirements,drivers:s.drivers,decisions:s.decisions.map(d=>({id:d.id,revision:d.revision,status:d.status,rationale:d.rationale,selected:d.selectedAlternativeId}))});
}
export const componentSourceChanged=(p,c)=>c.sourceSnapshot!==sourceSnapshot(p,c);
export const realisationStamp=p=>sig({application:p.realisation.version,logical:p.logical.version,requirements:p.contentVersion,quality:p.quality.version,decisions:p.decisions.version});
export const realisationReviewCurrent=p=>p.realisation.review?.stamp===realisationStamp(p);
export const realisationHandoffCurrent=p=>p.realisation.handoff?.stamp===realisationStamp(p);
const logicalInputStamp=p=>sig({responsibilities:p.logical.responsibilities.map(r=>({id:r.id,revision:r.revision})),connections:p.logical.connections,requirements:p.contentVersion,quality:p.quality.version,decisions:p.decisions.version});
export const realisationIntakeCurrent=p=>p.realisation.intake?.stamp===logicalInputStamp(p);
export const realisationScenarioCurrent=(p,id)=>p.realisation.scenarios[id]?.stamp===realisationStamp(p);
const seedFields={
 'api-pod':['service','Payment instruction with original reference','Validated instruction or an explained rejection',['instruction'],'Request processing, identity enforcement, and durable instruction storage.'],
 'risk-engine':['service','Validated instruction and risk signals','Explicit allow or hold decision',['risk-record'],'Versioned rules execution and an auditable decision store.'],
 'core-adapter':['adapter','Allowed instruction and original payment reference','Authoritative posting reference or an unresolved posting outcome',[],'Reliable core connectivity and atomic duplicate protection at the posting authority.'],
 'worker':['worker','Posted instruction and original reference','Verified external outcome or pending status',['settlement'],'Durable work dispatch, status enquiry, reconciliation, and operational monitoring.'],
 'notify-worker':['worker','Verified outcome event','Customer communication and delivery status',[],'Durable event consumption and separately controlled communication retries.']
};
function seedComponent(p,n){
 const f=seedFields[n.id]||['worker','','',[], ''];
 const ms=allocations(p,n.id),r={id:n.id,ref:'APP-'+pad(++p.realisation.counters.component),revision:1,title:n.title,kind:f[0],
 purpose:n.description,boundary:ms.map(m=>m.scope).filter(Boolean).join('; ')||n.attrs?.Obligation||'',
 owner:ms[0]?.owner||n.attrs?.Owner||'',inputs:f[1],outputs:f[2],dataIds:f[3],technologyNeeds:f[4],decisionIds:[],
 rationale:ms.map(m=>m.evidence).filter(Boolean).join('\n'),
 source:n.source||'Illustrative component carried from the Chapter 4 allocation.',status:'candidate',origin:n.origin||'reference',
 assumptions:'Confirm the component boundary and operating policies against project evidence.',assumptionsResolved:false,
 patternKey:n.candidateKey||null,history:[]};
 p.realisation.components.push(r);r.sourceSnapshot=sourceSnapshot(p,r);return r;
}
export function withRealisation(input){
 const p=withLogical(input);
 if(!p.realisation){
  p.realisation={schemaVersion:1,version:1,counters:{component:0,connection:0},components:[],connections:[],intake:null,scenarios:{},review:null,handoff:null};
  const physical=new Set(physicalObjects(p).map(n=>n.id));
  p.realisation.connections=referenceEdges.filter(e=>(physical.has(e.from)||physical.has(e.to))&&!logicalRecords(p).some(r=>r.id===e.from||r.id===e.to)).map(e=>({
   ...e,id:'INT-'+pad(++p.realisation.counters.connection),interaction:e.kind==='flow'?(e.from==='worker'?'event':'sync'):'trace',
   condition:'',failure:e.kind==='flow'?'Illustrative policy: retain the original reference, preserve the known outcome, and escalate uncertainty before replay.':'',origin:'reference'
  }));
  for(const n of physicalObjects(p))seedComponent(p,n);
 }else{
  const missing=physicalObjects(p).filter(n=>!component(p,n.id));
  if(missing.length){for(const n of missing)seedComponent(p,n);p.realisation.version++;p.realisation.review=null;p.realisation.handoff=null;}
 }
 return p;
}
export function realisationFindings(p){
 const out=[],add=(code,id,title,detail,level='error',extra={})=>out.push({id:code+':'+id,code,objectId:id,title,detail,level,...extra});
 const cs=components(p),g=logicalGraph(p),ids=new Set(g.nodes.map(n=>n.id));
 if(!realisationIntakeCurrent(p))add('intake','project','Review the inherited logical model','Review the current responsibilities, allocation scopes, and open Chapter 4 findings.','warning');
 for(const r of logicalRecords(p)){
  const ms=p.logical.mappings.filter(m=>m.logicalId===r.id&&component(p,m.physicalId));
  if(!ms.length)add('unmapped',r.id,'Realise '+r.ref+' · '+r.title,'Assign a component and explain the part of this responsibility it realises.');
  for(const m of ms)if(!m.scope||!m.owner||!mappingCurrent(p,m))add('mapping',m.physicalId,'Review '+m.id+' for '+r.ref,'Confirm the allocation scope against the current logical responsibility.','error',{mappingId:m.id});
  const seen=new Map();for(const m of ms){const key=m.scope.trim().toLowerCase();if(key&&seen.has(key))add('overlap',m.physicalId,'Clarify shared ownership of '+r.ref,'Two components have the same allocation scope. Distinguish their responsibilities or explain the shared boundary.','warning',{otherId:seen.get(key)});else seen.set(key,m.physicalId);}
 }
 const reached=new Set(logicalRecords(p).map(r=>r.id));
 for(let i=0;i<g.nodes.length;i++){let more=false;for(const e of g.edges){if(reached.has(e.from)&&!reached.has(e.to)){reached.add(e.to);more=true}if(reached.has(e.to)&&!reached.has(e.from)){reached.add(e.from);more=true}}if(!more)break;}
 for(const c of cs){
  if(!c.purpose||!c.boundary||!c.owner||!c.inputs||!c.outputs)add('definition',c.id,'Define the boundary of '+c.title,'Complete purpose, owned boundary, owner, inputs, and outputs.');
  if(!allocations(p,c.id).length)add('orphan',c.id,'Link '+c.ref+' to a responsibility','A component needs an explicit logical allocation. Dependencies alone do not justify it.');
  if(!c.rationale||!c.source)add('rationale',c.id,'Explain the choice of '+c.title,'Record the reason for this component and its supporting project evidence.');
  if(componentSourceChanged(p,c))add('source-change',c.id,'Review changed inputs for '+c.ref,'An allocated responsibility, source requirement, quality driver, decision, or mapping changed. Review this component against the current inputs.');
  const sources=componentSources(p,c.id);
  if(!sources.decisions.length)add('decision',c.id,'Connect the design rationale for '+c.ref,'Link a relevant architecture decision or record the missing question in Chapter 3.','warning');
  else if(sources.decisions.some(d=>!decisionCurrent(p,d)))add('draft-decision',c.id,'Decision rationale still needs review','One or more inherited choices remain draft or depend on changed inputs. Component review does not approve them.','warning');
  if(c.decisionIds.some(id=>!p.decisions.records.some(d=>d.id===id)))add('broken-decision',c.id,'Repair '+c.ref+' decision links','A linked decision is missing.');
  if(c.dataIds.some(id=>!g.nodes.some(n=>n.id===id&&n.layer==='data')))add('broken-data',c.id,'Repair '+c.ref+' data ownership','A named data record is missing.');
  for(const id of c.dataIds){const other=cs.find(x=>x.id!==c.id&&x.dataIds.includes(id));if(other)add('data-owner-'+id,c.id,'Resolve ownership of '+(g.nodes.find(n=>n.id===id)?.title||id),c.title+' and '+other.title+' both claim ownership. Choose the authority or explain separate records.');}
  if(!reached.has(c.id))add('disconnected',c.id,'Connect '+c.title,'This component is disconnected from the logical application.');
  if(!p.realisation.connections.some(e=>e.from===c.id||e.to===c.id))add('isolated',c.id,'Define an interaction for '+c.ref,'An allocation shows why it exists. Add its input, output, or supporting dependency.','warning');
  if(!c.technologyNeeds)add('technology',c.id,'Describe technology needs for '+c.ref,'State the capabilities Chapter 6 must provide, without assuming a product or deployment is approved.');
  if(c.assumptions&&!c.assumptionsResolved)add('assumptions',c.id,'Resolve assumptions for '+c.ref,c.assumptions,'warning');
  if(c.status!=='reviewed')add('review',c.id,'Review '+c.ref+' component design',c.origin==='reference'?'This component is illustrative reference content. Review it against your project.':'This is a working component design. Confirm its boundary and supporting evidence.','warning');
  if(cs.some(x=>x.ref<c.ref&&x.title.toLowerCase()===c.title.toLowerCase()))add('duplicate',c.id,'Distinguish duplicate component names','Give components distinct names and clear boundaries.','warning');
 }
 for(const e of p.realisation.connections){
  if(!ids.has(e.from)||!ids.has(e.to))add('broken-connection',e.id,'Repair '+e.id,'An interaction endpoint is missing.','error',{connectionId:e.id});
  if(!e.label||(['sync','event'].includes(e.interaction)&&!e.failure))add('interaction',e.from,'Complete '+e.id+' interaction policy','Describe the exchange and how timeout, rejection, or uncertain outcome is handled.','error',{connectionId:e.id});
 }
 return out;
}
export function realisationMilestones(p){
 const fs=realisationFindings(p),cs=components(p),has=codes=>fs.some(f=>codes.includes(f.code));
 return [
  {id:'a-intake',name:'Review the logical handoff',done:realisationIntakeCurrent(p),detail:logicalRecords(p).length+' inherited responsibilities'},
  {id:'a-map',name:'Allocate every responsibility',done:cs.length>0&&!has(['unmapped','orphan','mapping']),detail:p.logical.mappings.length+' allocation links'},
  {id:'a-define',name:'Define component boundaries',done:cs.length>0&&!has(['definition','rationale','source-change','broken-data','broken-decision']),detail:cs.filter(c=>c.purpose&&c.boundary&&c.owner&&c.inputs&&c.outputs).length+' / '+cs.length+' defined'},
  {id:'a-connect',name:'Connect the implementation',done:cs.length>0&&!has(['disconnected','isolated','broken-connection','interaction']),detail:p.realisation.connections.length+' interactions and dependencies'},
  {id:'a-scenarios',name:isBlankProject(p)?'Trace your recorded journey':'Trace the three payment outcomes',done:projectScenarios(p).every(id=>realisationScenarioCurrent(p,id)),detail:projectScenarios(p).filter(id=>realisationScenarioCurrent(p,id)).length+' / '+projectScenarios(p).length+' simulated scenarios reviewed'},
  {id:'a-technology',name:'Describe technology needs',done:cs.length>0&&cs.every(c=>!!c.technologyNeeds),detail:'Capabilities for Chapter 6'},
  {id:'a-validate',name:'Validate the realisation',done:realisationReviewCurrent(p)&&!fs.some(f=>f.level==='error'),detail:fs.filter(f=>f.level==='error').length+' content gaps'},
  {id:'a-handoff',name:'Carry forward to Chapter 6',done:realisationHandoffCurrent(p),detail:'Stable component references and open findings'}
 ];
}
function saveComponent(p,raw,at){
 const a=p.realisation,old=raw.id?component(p,raw.id):null;
 if(raw.id&&!old)throw Error('This component no longer exists.');
 if(!clean(raw.title,160))throw Error('Name the component.');
 if(!COMPONENT_KINDS.includes(raw.kind))throw Error('Choose a component kind.');
 if(!old&&a.components.length>=60)throw Error('This prototype supports up to 60 application components.');
 const dataIds=unique(raw.dataIds),decisionIds=unique(raw.decisionIds),g=logicalGraph(p);
 if(dataIds.some(id=>!g.nodes.some(n=>n.id===id&&n.layer==='data')))throw Error('Choose existing data records.');
 if(decisionIds.some(id=>!p.decisions.records.some(d=>d.id===id)))throw Error('Choose existing architecture decisions.');
 const maps=Array.isArray(raw.allocations)?raw.allocations:[];
 if(maps.some(m=>!responsibility(p)(m.logicalId))||new Set(maps.map(m=>m.logicalId)).size!==maps.length)throw Error('Use each existing logical responsibility only once.');
 let id=old?.id;
 if(!id){id='obj-'+pad(++p.logical.counters.asset);p.logical.assets.push({id,ref:'OBJ-'+pad(p.logical.counters.asset),layer:'physical',col:a.components.length%5,title:clean(raw.title,160),sub:'Working application component',description:clean(raw.purpose),origin:raw.patternKey?'suggestion':'user',candidateKey:raw.patternKey==='recovery'?'recovery':null,attrs:{}});}
 const c={id,ref:old?.ref||'APP-'+pad(++a.counters.component),revision:(old?.revision||0)+1,origin:old?.origin||(raw.patternKey?'suggestion':'user'),kind:raw.kind,status:COMPONENT_STATES.includes(raw.status)?raw.status:'draft',dataIds,decisionIds,assumptionsResolved:raw.assumptionsResolved===true,patternKey:old?.patternKey||raw.patternKey||null,history:old?[...old.history,{at,revision:old.revision,title:old.title,purpose:old.purpose,boundary:old.boundary,owner:old.owner,inputs:old.inputs,outputs:old.outputs,rationale:old.rationale,status:old.status,allocations:allocations(p,id).map(m=>({id:m.id,logicalId:m.logicalId,scope:m.scope}))}].slice(-30):[]};
 for(const k of ['title','purpose','boundary','owner','inputs','outputs','rationale','source','technologyNeeds','assumptions'])c[k]=clean(raw[k],k==='title'?160:k==='owner'?180:4000);
 if(c.status==='reviewed'&&(!c.purpose||!c.boundary||!c.owner||!c.inputs||!c.outputs||!c.rationale||!c.source||!maps.length||maps.some(m=>!clean(m.scope))))throw Error('Complete the component boundary, inputs, outputs, rationale, evidence, and allocation scopes before marking the design reviewed.');
 const previous=allocations(p,id);p.logical.mappings=p.logical.mappings.filter(m=>m.physicalId!==id||maps.some(x=>x.logicalId===m.logicalId));
 for(const rawMap of maps){
  const prior=previous.find(m=>m.logicalId===rawMap.logicalId),r=responsibility(p)(rawMap.logicalId);
  const m={id:prior?.id||'MAP-'+pad(++p.logical.counters.mapping),logicalId:r.id,physicalId:id,scope:clean(rawMap.scope),owner:c.owner,
   evidence:c.source,status:c.status==='reviewed'?'reviewed':'candidate',origin:prior?.origin||'user',
   logicalSnapshot:sig({title:r.title,purpose:r.purpose,boundary:r.boundary,requirementIds:r.requirementIds,decisionIds:r.decisionIds})};
  const index=p.logical.mappings.findIndex(x=>x.id===m.id);if(index<0)p.logical.mappings.push(m);else p.logical.mappings[index]=m;
 }
 if(old)a.components[a.components.indexOf(old)]=c;else a.components.push(c);
 const asset=p.logical.assets.find(n=>n.id===id);if(asset){asset.title=c.title;asset.description=c.purpose;asset.sub=c.kind+' · '+c.status;asset.attrs={Owner:c.owner,Boundary:c.boundary};}
 c.sourceSnapshot=sourceSnapshot(p,c);return c;
}
function saveInteraction(p,raw){
 const a=p.realisation,old=raw.id?a.connections.find(e=>e.id===raw.id):null,g=logicalGraph(p);
 if(raw.id&&!old)throw Error('This interaction no longer exists.');
 if(raw.from===raw.to||![raw.from,raw.to].every(id=>g.nodes.some(n=>n.id===id))||![raw.from,raw.to].some(id=>component(p,id)))throw Error('Connect two different existing objects, including an application component.');
 if([raw.from,raw.to].some(id=>responsibility(p)(id)))throw Error('Use component allocations to connect logical responsibilities.');
 if(!clean(raw.label,180))throw Error('Explain the interaction.');
 if(!['sync','event','data','trace'].includes(raw.interaction))throw Error('Choose an interaction type.');
 if(a.connections.some(e=>e.id!==old?.id&&e.from===raw.from&&e.to===raw.to&&e.label.toLowerCase()===raw.label.trim().toLowerCase()))throw Error('This labelled interaction already exists.');
 const e={id:old?.id||'INT-'+pad(++a.counters.connection),from:raw.from,to:raw.to,label:clean(raw.label,180),interaction:raw.interaction,kind:['sync','event'].includes(raw.interaction)?'flow':'trace',condition:clean(raw.condition),failure:clean(raw.failure),origin:old?.origin||'user'};
 if(old)a.connections[a.connections.indexOf(old)]=e;else a.connections.push(e);return e;
}
export function realisationProposal(p,key){
 if(!['review','dedup','recovery'].includes(key))return null;
 const existing=components(p).find(c=>c.patternKey===key);if(existing)return {key,existingId:existing.id};
 if(isBlankProject(p)){
  const r=logicalRecords(p).find(r=>!p.logical.mappings.some(m=>m.logicalId===r.id))||logicalRecords(p)[0];if(!r)return null;
  const source=components(p)[0],kind=key==='dedup'?'store':key==='review'?'service':'worker';
  return {key,patternKey:key,title:(key==='dedup'?'Recorded result store':key==='review'?'Application service':'Outcome recovery worker')+' · '+r.title,kind,purpose:r.purpose,boundary:r.boundary,owner:r.owner,inputs:'Define the request and stable reference.',outputs:'Define the recorded outcome and permitted next action.',rationale:'Allocate '+r.ref+' to an owned implementation boundary. Review transaction and failure boundaries before accepting.',technologyNeeds:'Describe execution, state, identity, and recovery needs.',assumptions:'Confirm the interaction contract and operating ownership.',relationship:'delegates defined work to',condition:'Define the trigger and preconditions.',failure:'Retain the original reference and investigate an uncertain result before repeating work.',sourceId:source?.id||'',source:r.source,status:'candidate',dataIds:[],decisionIds:r.decisionIds,assumptionsResolved:false,allocations:[{logicalId:r.id,scope:r.boundary}],effect:'Add a reviewable application component that retains '+r.ref+' and its upstream references.'};
 }
 const logicalId=key==='review'?(logicalRecords(p).find(r=>r.candidateKey==='review')?.id||'risk'):key==='dedup'?'ledger':'hub';
 const r=responsibility(p)(logicalId);if(!r)return null;
 const content=key==='review'?{
 title:'Held payment review queue',kind:'queue',purpose:'Dispatch held payments to an accountable reviewer and retain the authorised release or rejection.',
 boundary:'Own review dispatch and evidence. Keep posting blocked until explicit release authority is recorded.',
 owner:'Risk operations',inputs:'Held instruction, risk reason, and original payment reference',outputs:'Authorised release or rejection, with reviewer evidence',
 rationale:'A named queue makes ownership and the release boundary explicit.',technologyNeeds:'Durable work queue, authorised access, ageing alerts, and review evidence.',
 assumptions:'Confirm release authority and review service targets.',relationship:'routes held payments for review',condition:'Only on an explicit risk hold; no posting before release.',failure:'Retain the hold and escalate ageing work; do not release automatically.',sourceId:'risk-engine'
 }:key==='dedup'?{
 title:'Idempotency result store',kind:'store',purpose:'Retain the original payment reference and authoritative result for safe duplicate handling.',
 boundary:'Own the idempotency result and its atomic association with the posting effect; a cache-only check is insufficient.',
 owner:'Core banking team',inputs:'Original reference and authoritative posting outcome',outputs:'Original result or a verified new-reference outcome',
 rationale:'Duplicate protection needs a durable authority and an atomic boundary around the financial effect.',
 technologyNeeds:'Transactional persistence, unique references, atomic posting coordination, retention, and recovery.',
 assumptions:'Confirm the posting authority, atomicity mechanism, retention window, and failure tests.',
 relationship:'checks the original reference and result',condition:'Before any repeat financial effect.',failure:'Resolve uncertain posting state using the original reference; do not blindly replay.',sourceId:'core-adapter',
 newData:{title:'Idempotency result',purpose:'Associates an immutable instruction reference with its authoritative result.'}
 }:{
 title:'Outcome recovery worker',kind:'worker',purpose:'Investigate uncertain settlement outcomes before any controlled retry.',
 boundary:'Own enquiry, reconciliation, and escalation of pending outcomes. Never treat a timeout as proof of failure.',
 owner:'Payments operations',inputs:'Pending outcome and original external reference',outputs:'Verified result or an unresolved case with an accountable next action',
 rationale:'Separating recovery work keeps uncertainty visible and avoids unsafe repeat financial effects.',
 technologyNeeds:'Durable pending-work storage, enquiry connectivity, reconciliation scheduling, and operational alerts.',
 assumptions:'Confirm enquiry limits, escalation ownership, and authorised replay conditions.',
 relationship:'hands uncertain outcomes to recovery',condition:'After an uncertain response using the original payment reference.',failure:'Retain pending status and escalate; retry only after the outcome and replay authority are established.',sourceId:'worker'
 };
 return {key,patternKey:key,...content,source:'Illustrative '+key+' pattern; confirm against project evidence.',status:'candidate',dataIds:[],decisionIds:[],assumptionsResolved:false,allocations:[{logicalId,scope:content.boundary}],effect:'Adds one working '+content.kind+' and an explicit interaction. It does not execute a payment, release a hold, or approve deployment.'};
}
export function applyRealisationCommand(input,command,at=new Date().toISOString()){
 const p=withRealisation(input),a=p.realisation,raw=command.payload||{};let selected=null,mutated=true;
 switch(command.type){
  case 'realisation.component':selected=saveComponent(p,raw,at).id;break;
  case 'realisation.interaction':selected=saveInteraction(p,raw).from;break;
  case 'realisation.remove-interaction':if(!a.connections.some(e=>e.id===raw.id))throw Error('This interaction no longer exists.');a.connections=a.connections.filter(e=>e.id!==raw.id);break;
  case 'realisation.candidate':{
   if(raw.reviewed!==true)throw Error('Review the proposed changes before acceptance.');
   const prop=realisationProposal(p,raw.key);if(!prop)throw Error('Choose a known implementation pattern.');if(prop.existingId)throw Error('This pattern already exists in the shared model.');
   const c=saveComponent(p,{...raw,patternKey:raw.key,status:'candidate'},at);selected=c.id;
   if(prop.newData){const id='obj-'+pad(++p.logical.counters.asset);p.logical.assets.push({id,ref:'OBJ-'+pad(p.logical.counters.asset),layer:'data',col:2,title:prop.newData.title,sub:'Application-owned record',description:prop.newData.purpose,origin:'suggestion',candidateKey:'dedup',attrs:{Owner:'See the application ownership relationship',Key:'paymentReference',Review:'Confirm atomicity and retention'}});c.dataIds.push(id);}
   if(prop.sourceId)saveInteraction(p,{from:prop.sourceId,to:c.id,label:clean(raw.relationship,180)||prop.relationship,interaction:raw.key==='dedup'?'data':'event',condition:clean(raw.condition)||prop.condition,failure:clean(raw.failure)||prop.failure});
   break;
  }
  case 'realisation.intake':mutated=false;a.intake={at,stamp:logicalInputStamp(p),logicalVersion:p.logical.version,requirements:p.contentVersion,quality:p.quality.version,decisions:p.decisions.version,logicalHandoffCurrent:logicalHandoffCurrent(p)};break;
  case 'realisation.scenario':{
   mutated=false;const expected=scenarioSteps(p,raw.scenario);
   if(!expected.length||!Array.isArray(raw.visited)||!expected.every(i=>raw.visited.includes(i))||raw.visited.some(i=>!expected.includes(i)))throw Error('Trace every applicable simulation step before recording this review.');
   a.scenarios[raw.scenario]={at,stamp:realisationStamp(p),visited:expected,simulated:true};break;
  }
  case 'realisation.review':mutated=false;a.review={at,stamp:realisationStamp(p),findings:realisationFindings(p).length};break;
  case 'realisation.handoff':
   mutated=false;if(!realisationReviewCurrent(p))throw Error('Run checks on the current application model before handoff.');
   if(!components(p).length)throw Error('Define an application component before handoff.');
   if(realisationFindings(p).length&&raw.acknowledge!==true)throw Error('Acknowledge the open findings that travel to Chapter 6.');
   a.handoff={at,stamp:realisationStamp(p),componentIds:components(p).map(c=>c.id),componentRefs:components(p).map(c=>c.ref),logicalRefs:logicalRecords(p).map(r=>r.ref),mappingIds:p.logical.mappings.map(m=>m.id),openFindings:realisationFindings(p).length};break;
  default:throw Error('Unknown application-realisation action.');
 }
 if(mutated){a.version++;a.review=null;a.handoff=null;p.logical.version++;p.logical.review=null;p.logical.handoff=null;}
 return {document:p,selected};
}
export function exportRealisationMarkdown(p){
 const a=p.realisation,g=logicalGraph(p),title=id=>g.nodes.find(n=>n.id===id)?.title||id;
 return '# AIW V5 · '+p.name+'\n\n## Chapter 5 — Application Realisation\n\nApplication model '+a.version+'. Working design; no governance or deployment approval.\n\n'+components(p).map(c=>{
  const s=componentSources(p,c.id);
  return '### '+c.ref+' · '+c.title+'\n\nStable model key: '+c.id+' · Revision '+c.revision+' · '+c.kind+' · '+c.status+'\n\n'+c.purpose+'\n\nBoundary: '+c.boundary+'\n\nOwner: '+c.owner+'\n\nInputs: '+c.inputs+'\n\nOutputs: '+c.outputs+'\n\nOwns data: '+(c.dataIds.map(title).join(', ')||'No owned records declared')+'\n\nRationale: '+c.rationale+'\n\nSource: '+c.source+' · '+c.origin+(componentSourceChanged(p,c)?' · INPUTS CHANGED':'')+'\n\nAllocations:\n'+allocations(p,c.id).map(m=>'- '+m.id+' → '+(responsibility(p)(m.logicalId)?.ref||m.logicalId)+' · '+m.scope).join('\n')+'\n\nRequirements: '+s.requirements.map(q=>q.id).join(', ')+'\n\nQuality drivers: '+s.drivers.map(d=>d.id).join(', ')+'\n\nDecisions:\n'+(s.decisions.map(d=>'- '+d.id+' · '+(decisionCurrent(p,d)?'Architect accepted':'Requires review')+' · '+governanceLabel(d,p)).join('\n')||'No decision links')+'\n\nTechnology needs: '+c.technologyNeeds+'\n\nAssumptions: '+(c.assumptions||'None recorded')+' · '+(c.assumptionsResolved?'Reviewed':'Open')+'\n\n';
 }).join('')+'## Interactions and dependencies\n\n'+a.connections.map(e=>'- '+e.id+': '+title(e.from)+' → '+title(e.to)+' · '+e.label+' · '+e.interaction+(e.condition?' · Condition: '+e.condition:'')+(e.failure?' · Failure policy: '+e.failure:'')).join('\n')+'\n\n## Simulation reviews\n\n'+projectScenarios(p).map(id=>'- '+id+': '+(realisationScenarioCurrent(p,id)?'Reviewed':'Review needed')+' · Simulated reference behaviour').join('\n')+'\n\n## Open findings\n\n'+(realisationFindings(p).map(f=>'- '+f.level.toUpperCase()+': '+f.title+'. '+f.detail).join('\n')||'No findings under the current rules.')+'\n\n## Chapter 6 intake\n\n'+(realisationHandoffCurrent(p)?'Current handoff · '+a.handoff.at+' · '+a.handoff.openFindings+' acknowledged findings.':'Handoff needs review against the current model.')+'\n\nStable component references: '+components(p).map(c=>c.ref).join(', ')+'.\n\nGuidance uses project rules. Simulations do not execute banking operations.\n';
}
