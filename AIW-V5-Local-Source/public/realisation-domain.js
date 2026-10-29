import {isBlankProject,projectScenarios,scenarioSteps,journeyStages} from './model-scope.js';
import {nodes as referenceNodes,edges as referenceEdges} from './model.js';
import {withLogical,logicalGraph,logicalRecords,physicalObjects,responsibility,decisionsForResponsibility,logicalSourceChanged,mappingCurrent,mappingSnapshot,logicalHandoffCurrent,connectedTo,mappingRole,cleanRole,openWords} from './logical-domain.js';
import {QUALITY_TYPES} from './quality-domain.js';
import {PATTERNS,STYLES,TACTICS} from './playbook-knowledge.js';
import {requirementGroups} from './requirement-groups.js';
import {linkedRequirementIds,groupStamp,patchIds,patchText,within,knownOnly,settle} from './requirement-links.js';
import {cleanOpen} from './open-fields.js';
import {checked,isProposed,proposalFinding,openFindings,fieldWords} from './record-lifecycle.js';
import {memoPass,passValue,findIn,filterIn,withIds,firstById,groupBy,remember,sharedList} from './document-memo.js';
import {componentReading,valueFingerprint,recordStamp,driverStamp} from './source-fingerprint.js';
import {decisionCurrent,governanceLabel} from './decisions-domain.js';
import {LIBRARY_KEYS,cleanLibraryRef,cleanProposed,COMPONENT_LIBRARY_KIND} from './component-library.js';
import {driversForComponent} from './driver-scope.js';
// rc39 (PLAN §4.3.3): the design questions a component faces, from the one projection, for the chapter's checks.
import {designQuestions,designQuestionFindings} from './design-questions.js';

// Round 12 (D-12): a kind the sources do not state is recorded as not stated, not invented. Round 12 (DRF-15): a UI or
// channel entry is a kind of its own ('channel'), beside the application service, the batch worker, the integration
// adapter and the data store.
export const COMPONENT_KINDS=['service','worker','adapter','queue','store','module','channel','not-stated'];
export const componentKindName=k=>k==='not-stated'?'Not stated':k==='channel'?'UI or channel':String(k||'').charAt(0).toUpperCase()+String(k||'').slice(1);
export const COMPONENT_STATES=['draft','candidate','reviewed'];
// Round 12 (DM-18): an interaction may be scheduled (batch) work, or of a type no source states, which is said so.
// Round 12 (GR-CMP-10): the fields of an interaction that may be recorded as not stated or as an open question
// (open-fields.js): one finding per cause, printed "open: …" once.
export const INTERACTION_OPEN=['condition','failure'];
export const INTERACTION_TYPES=[['sync','Request / response'],['event','Event / work handoff'],['scheduled','Scheduled or batch'],['data','Data dependency'],['trace','Trace'],['not-stated','Not stated']];
const FLOWS=['sync','event','scheduled'];
// The kind an interaction is stored with: a request, an event handoff or a scheduled run is a flow; a data dependency, a
// trace or a type not stated is a trace (rc41 close: the canvas types its offer by the record this writes).
export const interactionKind=interaction=>FLOWS.includes(interaction)?'flow':'trace';
// Round 12 (DM-13): a component's quality properties, one per concern (a quality category or a driver), each with the
// mechanism that delivers it; its architectural solution, with the playbook's styles, patterns and tactics it applies;
// and the Chapter 7 realisation it runs in (its container), derived from its compute need when none is chosen.
export const COMPONENT_TEXT=['title','purpose','boundary','owner','inputs','outputs','rationale','source','technologyNeeds','assumptions','architecturalSolution'];
export const PROPERTY_LIMIT=24;
const PATTERN_IDS=new Set([...PATTERNS,...STYLES,...TACTICS].map(x=>x.id));
export function componentContainer(p,c){
 const tr=p?.technologyRealisation,records=tr?.records||[],byId=id=>records.find(r=>r.id===id);
 if(c?.containerId){const r=byId(c.containerId);return r?{id:r.id,ref:r.ref||r.id,title:r.title,derived:false}:{id:c.containerId,ref:c.containerId,title:'',derived:false,missing:true};}
 const need=(p?.technology?.needs||[]).find(n=>n.applicationId===c?.id&&n.category==='compute'),cap=need&&(p.technology.mappings||[]).find(m=>m.needId===need.id)?.capabilityId,rid=cap&&(tr?.mappings||[]).find(m=>m.capabilityId===cap)?.realizationId,r=rid&&byId(rid);
 return r?{id:r.id,ref:r.ref||r.id,title:r.title,derived:true,needId:need.id}:null;
}
const clean=(v,n=4000)=>typeof v==='string'?v.trim().slice(0,n):'';
const sig=v=>JSON.stringify(v),pad=n=>String(n).padStart(3,'0');
// Explicit bounds (round 5, R5-G): what one workspace keeps, measured by scale-validate.mjs at these sizes.
export const REALISATION_LIMITS=Object.freeze({components:500,interactions:2000,links:500});
export const components=p=>p.realisation?.components||[];
// Lookups (round 5, R5-G): on a settled document, or inside a pass (document-memo.js), each list is indexed once and
// every lookup reads the index; otherwise each searches its list as before. The same records, in the same order.
export const component=(p,id)=>findIn(p,'realisation:components',()=>components(p),id);
export const allocations=(p,id)=>filterIn(p,'realisation:allocations',()=>p.logical.mappings,m=>m.physicalId,id);
export const logicalFor=(p,id)=>allocations(p,id).map(m=>responsibility(p)(m.logicalId)).filter(Boolean);
// A component's sources: once per component for the length of a pass (its readers there only read it).
export function componentSources(p,id){return passValue(p,'realisation:sources:'+id,()=>componentSourcesOf(p,id));}
// Round 12 (D-03): the requirements a component carries are those of its responsibilities, each with the members of the
// requirement groups it links, and the members of the groups the component links itself.
function componentSourcesOf(p,id){
 const c=component(p,id),rs=logicalFor(p,id),wanted=new Set([...rs.flatMap(r=>linkedRequirementIds(p,r)),...linkedRequirementIds(p,c)]),own=withIds(p,'realisation:decisions',()=>p.decisions.records,c?.decisionIds);
 return {logical:rs,requirements:p.artefacts.filter(a=>a.type==='requirement'&&wanted.has(a.id)),
 drivers:driversForComponent(p,id),
 decisions:[...new Map([...rs.flatMap(r=>decisionsForResponsibility(p,r)),...own].map(d=>[d.id,d])).values()]};
}
// A component keeps one fingerprint of what it reads (round 12, D-04: not a copy): its responsibilities and allocations
// as before, the requirements and drivers they carry each as its fingerprint, and the state of its decisions. A reading
// kept as a copy is read as that fingerprint (source-fingerprint.js).
// Round 12 (G-32): a component saved now also keeps the ids of the drivers and decisions that bore on it
// (sourceDriverIds, sourceDecisionIds); its reading is taken again over those, so one that changed, or no longer bears on
// it, is a changed source, and one that first bears on it after the save is not. A component saved before is judged as it was.
// A group a responsibility or the component links is read as the group (requirement-links.js groupStamp), beside the
// requirements they name.
function readingOf(p,c,kept){
 const s=componentSources(p,c.id),groups=[...new Set([...s.logical.flatMap(r=>r.requirementGroupIds||[]),...(c.requirementGroupIds||[])])],named=groups.length?(ids=>p.artefacts.filter(a=>a.type==='requirement'&&ids.has(a.id)))(new Set(s.logical.flatMap(r=>r.requirementIds))):s.requirements,pick=(xs,ids)=>{if(!ids)return xs;const m=new Map(xs.map(x=>[x.id,x]));return ids.map(id=>m.get(id)||null);};
 return valueFingerprint({logical:s.logical.map(r=>({id:r.id,title:r.title,purpose:r.purpose,boundary:r.boundary,requirements:r.requirementIds,...(r.requirementGroupIds?.length?{groups:r.requirementGroupIds}:{}),decisions:r.decisionIds,changed:logicalSourceChanged(p,r)})),
 mappings:allocations(p,c.id).map(m=>({id:m.id,logicalId:m.logicalId,scope:m.scope,current:mappingCurrent(p,m)})),
 requirements:[...named.map(a=>recordStamp(p,a)),...groups.map(id=>groupStamp(p,id))],drivers:pick(s.drivers,kept?.drivers).map(d=>driverStamp(p,d)),decisions:pick(s.decisions,kept?.decisions).map(d=>d&&{id:d.id,revision:d.revision,status:d.status,rationale:d.rationale,selected:d.selectedAlternativeId})});
}
export const componentSourceChanged=(p,c)=>remember(p,'realisation:source-changed',c,()=>componentReading(c.sourceSnapshot)!==readingOf(p,c,Array.isArray(c.sourceDriverIds)?{drivers:c.sourceDriverIds,decisions:c.sourceDecisionIds||[]}:null));
// The reading a component would keep now, as componentSourceChanged takes it (readings-upgrade.js compares it with the
// one kept).
export const currentComponentReading=(p,c)=>readingOf(p,c,Array.isArray(c.sourceDriverIds)?{drivers:c.sourceDriverIds,decisions:c.sourceDecisionIds||[]}:null);
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
 owner:ms[0]?.owner||n.attrs?.Owner||'',inputs:f[1],outputs:f[2],dataIds:f[3],consumesDataIds:[],producesDataIds:[],technologyNeeds:f[4],decisionIds:[],
 rationale:ms.map(m=>m.evidence).filter(Boolean).join('\n'),
 source:n.source||'Illustrative component carried from the Chapter 4 allocation.',status:'candidate',origin:n.origin||'reference',
 assumptions:'Confirm the component boundary and operating policies against project evidence.',assumptionsResolved:false,
 patternKey:n.candidateKey||null,history:[]};
 p.realisation.components.push(r);
 // Round 12 (GR-REQ-17): a seeded component keeps the ids of the drivers and decisions that bore on it (G-32), as one a
 // person saves now does, so a driver added later that names its responsibility is not a change of the component.
 const s=componentSources(p,r.id);r.sourceDriverIds=s.drivers.map(d=>d.id);r.sourceDecisionIds=s.decisions.map(d=>d.id);r.sourceSnapshot=readingOf(p,r,null);return r;
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
  const held=new Set(components(p).map(c=>c.id)),missing=physicalObjects(p).filter(n=>!held.has(n.id));
  if(missing.length){for(const n of missing)seedComponent(p,n);p.realisation.version++;p.realisation.review=null;p.realisation.handoff=null;}
 }
 return p;
}
// The chapter's checks, worked out once per settled document or pass (each caller gets its own copies).
export function realisationFindings(p){return memoPass(p,()=>sharedList(p,'realisation:findings',()=>realisationFindingsOf(p)));}
function realisationFindingsOf(p){
 const out=[],add=(code,id,title,detail,level='error',extra={})=>out.push({id:code+':'+id,code,objectId:id,title,detail,level,...extra});
 const cs=components(p),g=logicalGraph(p),ids=new Set(g.nodes.map(n=>n.id));
 if(!realisationIntakeCurrent(p))add('intake','project','Review the inherited logical model','Review the current responsibilities, allocation scopes, and open Chapter 4 findings.','warning');
 const allocated=groupBy(p.logical.mappings,m=>m.logicalId);
 for(const r of logicalRecords(p)){
  const ms=(allocated.get(r.id)||[]).filter(m=>component(p,m.physicalId));
  if(!ms.length)add('unmapped',r.id,'Realise '+r.ref+' · '+r.title,'Assign a component and explain the part of this responsibility it realises.');
  for(const m of ms)if(!(m.scope||m.open?.scope)||!(m.owner||m.open?.owner)||!mappingCurrent(p,m))add('mapping',m.physicalId,'Review '+m.id+' for '+r.ref,'Confirm the allocation scope against the current logical responsibility.','error',{mappingId:m.id});
  const realisers=ms.filter(m=>mappingRole(m)==='realises');if(realisers.length>1)add('realisers',r.id,'Choose one component that realises '+r.ref,realisers.map(m=>component(p,m.physicalId)?.title||m.physicalId).join(' and ')+' each realise it. Let one realise it and the others support it, or split the responsibility.','warning');
  const seen=new Map();for(const m of ms.filter(m=>!mappingRole(m))){const key=m.scope.trim().toLowerCase();if(key&&seen.has(key))add('overlap',m.physicalId,'Clarify shared ownership of '+r.ref,'Two components have the same allocation scope. Distinguish their responsibilities or explain the shared boundary.','warning',{otherId:seen.get(key)});else seen.set(key,m.physicalId);}
 }
 const reached=connectedTo(logicalRecords(p).map(r=>r.id),g.edges,g.nodes.length);
 const decisionIds=new Set(p.decisions.records.map(d=>d.id)),dataIds=new Set(g.nodes.filter(n=>n.layer==='data').map(n=>n.id)),nodeById=firstById(g.nodes),owners=new Map(),linked=new Set(p.realisation.connections.flatMap(e=>[e.from,e.to])),titled=groupBy(cs,x=>x.title.toLowerCase());
 for(const x of cs)for(const id of new Set(x.dataIds)){let xs=owners.get(id);if(!xs)owners.set(id,xs=[]);xs.push(x);}
 const proposals=proposalFinding(cs,5),stated=(r,k)=>!!String(r[k]??'').trim()||!!r.open?.[k];if(proposals)out.push({...proposals,objectId:'project'});
 for(const c of checked(cs)){
  if(!stated(c,'purpose')||!stated(c,'boundary')||!stated(c,'owner')||!stated(c,'inputs')||!stated(c,'outputs'))add('definition',c.id,'Define the boundary of '+c.title,'Complete purpose, owned boundary, owner, inputs, and outputs.');
  openFindings(c,COMPONENT_TEXT,add);
  if(c.containerId&&componentContainer(p,c)?.missing||c.patternIds?.some(id=>!PATTERN_IDS.has(id))||c.properties?.some(x=>!QUALITY_TYPES.some(t=>t.id===x.concern)&&!p.quality.drivers.some(d=>d.id===x.concern)))add('broken-solution',c.id,'Repair the solution links of '+c.ref,'A container, pattern or property concern it names is missing.');
  if(!allocations(p,c.id).length)add('orphan',c.id,'Link '+c.ref+' to a responsibility','A component needs an explicit logical allocation. Dependencies alone do not justify it.');
  if(!stated(c,'rationale')||!stated(c,'source'))add('rationale',c.id,'Explain the choice of '+c.title,'Record the reason for this component and its supporting project evidence.');
  if(componentSourceChanged(p,c))add('source-change',c.id,'Review changed inputs for '+c.ref,'An allocated responsibility, source requirement, quality driver, decision, or mapping changed. Review this component against the current inputs.');
  const sources=componentSources(p,c.id);
  if(!sources.decisions.length)add('decision',c.id,'Connect the design rationale for '+c.ref,'Link a relevant architecture decision or record the missing question in Chapter 3.','warning');
  else if(sources.decisions.some(d=>!decisionCurrent(p,d)))add('draft-decision',c.id,'Decision rationale still needs review','One or more inherited choices remain draft or depend on changed inputs. Component review does not approve them.','warning');
  if(c.decisionIds.some(id=>!decisionIds.has(id)))add('broken-decision',c.id,'Repair '+c.ref+' decision links','A linked decision is missing.');
  if((c.serves||[]).some(s=>!p.quality.drivers.some(d=>d.id===s.driverId)))add('broken-driver',c.id,'Repair the drivers '+c.ref+' serves','A driver it names as served is missing.');
  if(c.dataIds.some(id=>!dataIds.has(id)))add('broken-data',c.id,'Repair '+c.ref+' data ownership','A named data record is missing.');
  if([...(c.consumesDataIds||[]),...(c.producesDataIds||[])].some(id=>!dataIds.has(id)&&!(p.interfaces?.data||[]).some(d=>d.id===id)))add('broken-data-flow',c.id,'Repair '+c.ref+' data links','A data definition it consumes or produces is missing.');
  for(const id of c.dataIds){const other=(owners.get(id)||[]).find(x=>x.id!==c.id);if(other)add('data-owner-'+id,c.id,'Resolve ownership of '+(nodeById.get(id)?.title||id),c.title+' and '+other.title+' both claim ownership. Choose the authority or explain separate records.');}
  if(!reached.has(c.id))add('disconnected',c.id,'Connect '+c.title,'This component is disconnected from the logical application.');
  if(!linked.has(c.id))add('isolated',c.id,'Define an interaction for '+c.ref,'An allocation shows why it exists. Add its input, output, or supporting dependency.','warning');
  if(!stated(c,'technologyNeeds'))add('technology',c.id,'Describe technology needs for '+c.ref,'State the capabilities Chapter 6 must provide, without assuming a product or deployment is approved.');
  if(c.assumptions&&!c.assumptionsResolved)add('assumptions',c.id,'Resolve assumptions for '+c.ref,c.assumptions,'warning');
  if(c.status!=='reviewed')add('review',c.id,'Review '+c.ref+' component design',c.origin==='reference'?'This component is illustrative reference content. Review it against your project.':'This is a working component design. Confirm its boundary and supporting evidence.','warning');
  if(titled.get(c.title.toLowerCase()).some(x=>x.ref<c.ref))add('duplicate',c.id,'Distinguish duplicate component names','Give components distinct names and clear boundaries.','warning');
 }
 // rc39 (PLAN §4.3.3): a driver asks a design question no decision answers: one finding per open question per component, to
 // confirm, through this list so that the frame, its counts, causes and actions carry it unchanged (design-questions.js).
 for(const c of checked(cs))designQuestionFindings(designQuestions(p,c.id),add);
 for(const e of p.realisation.connections){
  if(!ids.has(e.from)||!ids.has(e.to))add('broken-connection',e.id,'Repair '+e.id,'An interaction endpoint is missing.','error',{connectionId:e.id});
  if(e.interaction==='not-stated')add('interaction-type',e.from,'Say what kind of interaction '+e.id+' is','No source states whether it is a request, an event, scheduled work or a data dependency.','warning',{connectionId:e.id});
  openFindings(e,INTERACTION_OPEN,(code,id,title,detail,level)=>add(code,id,title,detail,level,{connectionId:e.id}));
  if(!e.label||(FLOWS.includes(e.interaction)&&!(e.failure||e.open?.failure)))add('interaction',e.from,'Complete '+e.id+' interaction policy','Describe the exchange and how timeout, rejection, or uncertain outcome is handled.','error',{connectionId:e.id});
 }
 return out;
}
export function realisationMilestones(p){return memoPass(p,()=>realisationMilestonesOf(p));}
function realisationMilestonesOf(p){
 const fs=realisationFindings(p),cs=components(p),has=codes=>fs.some(f=>codes.includes(f.code));
 return [
  {id:'a-intake',name:'Review the logical handoff',done:realisationIntakeCurrent(p),detail:logicalRecords(p).length+' inherited responsibilities'},
  {id:'a-map',name:'Allocate every responsibility',done:cs.length>0&&!has(['unmapped','orphan','mapping']),detail:p.logical.mappings.length+' allocation links'},
  {id:'a-define',name:'Define component boundaries',done:cs.length>0&&!has(['definition','rationale','source-change','broken-data','broken-decision','broken-driver']),detail:cs.filter(c=>c.purpose&&c.boundary&&c.owner&&c.inputs&&c.outputs).length+' / '+cs.length+' defined'},
  {id:'a-connect',name:'Connect the implementation',done:cs.length>0&&!has(['disconnected','isolated','broken-connection','interaction']),detail:p.realisation.connections.length+' interactions and dependencies'},
  {id:'a-scenarios',name:isBlankProject(p)?'Trace your recorded journey':'Trace the three payment outcomes',done:projectScenarios(p).every(id=>realisationScenarioCurrent(p,id)),detail:projectScenarios(p).filter(id=>realisationScenarioCurrent(p,id)).length+' / '+projectScenarios(p).length+' simulated scenarios reviewed'},
  {id:'a-technology',name:'Describe technology needs',done:cs.length>0&&cs.every(c=>!!c.technologyNeeds),detail:'Capabilities for Chapter 6'},
  {id:'a-validate',name:'Validate the realisation',done:realisationReviewCurrent(p)&&!fs.some(f=>f.level==='error'),detail:fs.filter(f=>f.level==='error').length+' content gaps'},
  {id:'a-handoff',name:'Carry forward to Chapter 6',done:realisationHandoffCurrent(p),detail:'Stable component references and open findings'}
 ];
}
// Round 12: an update that leaves a link out keeps it (its allocations, data, decisions and requirement groups are left as
// they are), a link sent is checked and refused past its bound, and a save that changes nothing a person changes, of a
// component whose sources did not change, leaves it as it is (G-32): no new revision, and Chapters 6 and 7, which read its
// revision, are not marked changed. A component records its quality properties and its architectural solution (the
// styles and patterns it applies; D-07); a component saved before keeps its shape until one of them is set.
const LINKED=['dataIds','consumesDataIds','producesDataIds','decisionIds','requirementGroupIds','patternIds'],COMPONENT_NEW=['requirementGroupIds','architecturalSolution','properties','patternIds','containerId','serves','open'];
const asSaved=(c,maps)=>sig([...COMPONENT_TEXT.map(k=>c[k]||''),c.kind,c.status,!!c.assumptionsResolved,...LINKED.map(k=>c[k]||[]),c.properties||[],c.serves||[],c.containerId||'',c.open||null,maps.map(m=>m.logicalId+'\u0000'+clean(m.scope)+'\u0000'+mappingRole(m)).sort()]);
// Round 24 (D-24-05): the drivers a component serves, each with why: serves [{driverId, reason}]. A driver the project
// holds, named once, at most SERVES_LIMIT of them, each reason within SERVES_REASON characters (refused past the bounds,
// never cut). Patch semantics as the other links: left out, what is stored stays; null or [] clears it; a list replaces
// it; {add: [{driverId, reason}], remove: [driverIds]} adds (an added driver's reason replaces the stored one) and
// removes. Only what a save names is checked; a served driver that is later removed is a finding (broken-driver). A
// component saved before holds no serves until one is set.
export const SERVES_LIMIT=12,SERVES_REASON=600;
function patchServes(p,raw,old){
 const v=raw?.serves,had=Array.isArray(old?.serves)?old.serves:[];
 if(v===undefined)return had;
 if(v===null)return [];
 const row=x=>{if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Name each driver a component serves, with its reason.');const driverId=String(x.driverId??'').trim(),reason=patchText(x,'reason',null,SERVES_REASON,'The reason a component serves a driver');if(!driverId)throw Error('Name the driver a component serves.');return {driverId,reason};};
 let rows,sent;
 if(Array.isArray(v))rows=sent=v.map(row);
 else if(typeof v==='object'){sent=(Array.isArray(v.add)?v.add:[]).map(row);const remove=new Set((Array.isArray(v.remove)?v.remove:[]).map(x=>String(x)));rows=[...had.filter(s=>!remove.has(s.driverId)&&!sent.some(a=>a.driverId===s.driverId)),...sent];}
 else throw Error('Send the drivers a component serves as a list, or ones to add and remove.');
 knownOnly(sent.map(s=>s.driverId),new Set(p.quality.drivers.map(d=>d.id)),'drivers');
 if(new Set(rows.map(s=>s.driverId)).size!==rows.length)throw Error('Name each driver a component serves once.');
 if(rows.length>SERVES_LIMIT)throw Error(`A component names at most ${SERVES_LIMIT} drivers it serves; ${rows.length} were sent.`);
 return rows;
}
function cleanProperties(p,raw){
 if(!Array.isArray(raw))throw Error('Send the quality properties as a list.');
 if(raw.length>PROPERTY_LIMIT)throw Error(`A component records at most ${PROPERTY_LIMIT} quality properties; ${raw.length} were sent.`);
 return raw.map(x=>{const concern=String(x?.concern??'').trim();if(!QUALITY_TYPES.some(t=>t.id===concern)&&!p.quality.drivers.some(d=>d.id===concern))throw Error('Choose a quality concern or a driver for each property.');const row={concern,statement:patchText(x,'statement',null,2000,'A property statement'),mechanism:patchText(x,'mechanism',null,2000,'A property mechanism'),source:patchText(x,'source',null,600,'A property source')};if(!row.statement)throw Error('State each quality property.');return row;});
}
function saveComponent(p,raw,at){
 const a=p.realisation,old=raw.id?component(p,raw.id):null,keep=k=>raw[k]===undefined&&old;
 if(raw.id&&!old)throw Error('This component no longer exists.');
 const text=Object.fromEntries(COMPONENT_TEXT.map(k=>[k,patchText(raw,k,old,k==='title'?160:k==='owner'?180:4000,'The '+fieldWords(k))]));
 if(!text.title)throw Error('Name the component.');
 const kind=keep('kind')?old.kind:raw.kind;if(!COMPONENT_KINDS.includes(kind))throw Error('Choose a component kind.');
 if(!old&&a.components.length>=REALISATION_LIMITS.components)throw Error('This workspace keeps up to 500 application components.');
 const g=logicalGraph(p),links=Object.fromEntries(LINKED.map(k=>{const v=patchIds(raw,k,old);within(v.ids,REALISATION_LIMITS.links,k==='patternIds'?'patterns':'records');return [k,v];})),{dataIds,consumesDataIds,producesDataIds,decisionIds,requirementGroupIds,patternIds}=Object.fromEntries(LINKED.map(k=>[k,links[k].ids]));
 const prior=old?allocations(p,old.id):[],maps=keep('allocations')?prior.map(m=>({logicalId:m.logicalId,scope:m.scope,role:mappingRole(m)})):Array.isArray(raw.allocations)?raw.allocations.map(m=>({...m,role:m.role===undefined?mappingRole(prior.find(x=>x.logicalId===m.logicalId)):cleanRole(m.role)})):raw.allocations===null?[]:[];
 within(maps,REALISATION_LIMITS.links,'responsibilities');
 knownOnly(links.dataIds.sent,new Set(g.nodes.filter(n=>n.layer==='data').map(n=>n.id)),'data records');
 // Round 11: what it consumes and produces names data definitions (Chapter 8, or the data records Chapter 8 seeds from); the prose inputs and outputs stay as description.
 const knownData=new Set([...g.nodes.filter(n=>n.layer==='data').map(n=>n.id),...(p.interfaces?.data||[]).map(d=>d.id)]);
 knownOnly([...links.consumesDataIds.sent,...links.producesDataIds.sent],knownData,'data definitions');
 knownOnly(links.decisionIds.sent,new Set(p.decisions.records.map(d=>d.id)),'architecture decisions');
 knownOnly(links.requirementGroupIds.sent,new Set(requirementGroups(p).map(x=>x.id)),'requirement groups');
 knownOnly(links.patternIds.sent,PATTERN_IDS,'playbook styles, patterns or tactics');
 if(maps.some(m=>!responsibility(p)(m.logicalId))||new Set(maps.map(m=>m.logicalId)).size!==maps.length)throw Error('Use each existing logical responsibility only once.');
 const properties=raw.properties===undefined?old?.properties:raw.properties===null?[]:cleanProperties(p,raw.properties),serves=patchServes(p,raw,old);
 const containerId=raw.containerId===undefined?old?.containerId||'':String(raw.containerId??'').trim();if(containerId&&!(p.technologyRealisation?.records||[]).some(r=>r.id===containerId))throw Error('Choose an existing Chapter 7 realisation as the container, or leave it to be derived.');
 const open=raw.open===undefined?old?.open:cleanOpen(raw.open,COMPONENT_TEXT),status=keep('status')?old.status:COMPONENT_STATES.includes(raw.status)?raw.status:'draft';
 // A confirmation not sent again holds only while the assumptions it confirmed are unchanged.
 const assumptionsResolved=raw.assumptionsResolved!==undefined?raw.assumptionsResolved===true:!!old?.assumptionsResolved&&text.assumptions===old.assumptions;
 if(status==='reviewed'&&(!text.purpose||!text.boundary||!text.owner||!text.inputs||!text.outputs||!text.rationale||!text.source||!maps.length||maps.some(m=>!clean(m.scope))))throw Error('Complete the component boundary, inputs, outputs, rationale, evidence, and allocation scopes before marking the design reviewed.');
 const next=settle({...text,kind,status,assumptionsResolved,dataIds,consumesDataIds,producesDataIds,decisionIds,requirementGroupIds,patternIds,properties,containerId,serves,open},old,COMPONENT_NEW);
 if(old&&!isProposed(old)&&!componentSourceChanged(p,old)&&asSaved(old,prior)===asSaved(next,maps))return old;
 let id=old?.id;
 if(!id){id='obj-'+pad(++p.logical.counters.asset);p.logical.assets.push({id,ref:'OBJ-'+pad(p.logical.counters.asset),layer:'physical',col:a.components.length%5,title:text.title,sub:'Working application component',description:text.purpose,origin:raw.patternKey?'suggestion':'user',candidateKey:raw.patternKey==='recovery'?'recovery':null,attrs:{}});}
 // Round 11: a component proposed from the library keeps where it came from (`library`) and what was proposed with it (`proposed`) through every later edit.
 const history=old?[...old.history,{at,revision:old.revision,title:old.title,purpose:old.purpose,boundary:old.boundary,owner:old.owner,inputs:old.inputs,outputs:old.outputs,rationale:old.rationale,status:old.status,allocations:prior.map(m=>({id:m.id,logicalId:m.logicalId,scope:m.scope}))}]:[];
 const c={id,ref:old?.ref||'APP-'+pad(++a.counters.component),revision:(old?.revision||0)+1,origin:old?.origin||(raw.patternKey?'suggestion':'user'),kind,status,dataIds,consumesDataIds,producesDataIds,decisionIds,assumptionsResolved,patternKey:old?.patternKey||raw.patternKey||null,...(old?.library?{library:old.library}:{}),...(old?.proposed?{proposed:old.proposed}:{}),history:history.length>30?[history[0],...history.slice(-29)]:history};
 for(const k of COMPONENT_TEXT)if(!COMPONENT_NEW.includes(k))c[k]=text[k];for(const k of COMPONENT_NEW)if(Object.hasOwn(next,k))c[k]=next[k];
 if(!keep('allocations')){
  p.logical.mappings=p.logical.mappings.filter(m=>m.physicalId!==id||maps.some(x=>x.logicalId===m.logicalId));
  for(const rawMap of maps){
   const was=prior.find(m=>m.logicalId===rawMap.logicalId),r=responsibility(p)(rawMap.logicalId);
   const m={id:was?.id||'MAP-'+pad(++p.logical.counters.mapping),logicalId:r.id,physicalId:id,scope:clean(rawMap.scope),owner:c.owner,
    evidence:c.source,status:c.status==='reviewed'?'reviewed':'candidate',...(rawMap.role||was?.role!==undefined?{role:rawMap.role||''}:{}),origin:was?.origin||'user',logicalSnapshot:mappingSnapshot(r)};
   const index=p.logical.mappings.findIndex(x=>x.id===m.id);if(index<0)p.logical.mappings.push(m);else p.logical.mappings[index]=m;
  }
 }
 if(old)a.components[a.components.indexOf(old)]=c;else a.components.push(c);
 const asset=p.logical.assets.find(n=>n.id===id);if(asset){asset.title=c.title;asset.description=c.purpose;asset.sub=c.kind+' · '+c.status;asset.attrs={Owner:c.owner,Boundary:c.boundary};}
 const s=componentSources(p,c.id);c.sourceDriverIds=s.drivers.map(d=>d.id);c.sourceDecisionIds=s.decisions.map(d=>d.id);c.sourceSnapshot=readingOf(p,c,null);return c;
}
// Why a Chapter 5 interaction's two ends would be refused, or '' (rc41 close: one rule for the save and for the canvas's
// kinds menu): two different objects of the logical graph, one of them an application component (two external
// participants interact through a Chapter 8 contract), neither a logical responsibility.
export function interactionRefusal(p,from,to){
 const g=logicalGraph(p);
 if(from===to||![from,to].every(id=>g.nodes.some(n=>n.id===id))||![from,to].some(id=>component(p,id)))return 'Connect two different existing objects, including an application component.';
 if([from,to].some(id=>responsibility(p)(id)))return 'Use component allocations to connect logical responsibilities.';
 return '';
}
function saveInteraction(p,raw){
 const a=p.realisation,old=raw.id?a.connections.find(e=>e.id===raw.id):null;
 if(raw.id&&!old)throw Error('This interaction no longer exists.');
 const ends=interactionRefusal(p,raw.from,raw.to);if(ends)throw Error(ends);
 if(!clean(raw.label,180))throw Error('Explain the interaction.');
 if(!INTERACTION_TYPES.some(([k])=>k===raw.interaction))throw Error('Choose an interaction type, or say it is not stated.');
 if(a.connections.some(e=>e.id!==old?.id&&e.from===raw.from&&e.to===raw.to&&e.label.toLowerCase()===raw.label.trim().toLowerCase()))throw Error('This labelled interaction already exists.');
 if(!old&&a.connections.length>=REALISATION_LIMITS.interactions)throw Error('This workspace keeps up to 2,000 interactions.');
 const e={id:old?.id||'INT-'+pad(++a.counters.connection),from:raw.from,to:raw.to,label:clean(raw.label,180),interaction:raw.interaction,kind:interactionKind(raw.interaction),condition:clean(raw.condition),failure:clean(raw.failure),origin:old?.origin||'user'};
 const open=raw.open===undefined?old?.open:cleanOpen(raw.open,INTERACTION_OPEN);if(open&&Object.keys(open).length)e.open=open;
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
  case 'realisation.component':{const before=raw.id&&component(p,raw.id),c=saveComponent(p,raw,at);selected=c.id;if(c===before)mutated=false;break;}
  case 'realisation.interaction':selected=saveInteraction(p,raw).from;break;
  case 'realisation.remove-interaction':if(!a.connections.some(e=>e.id===raw.id))throw Error('This interaction no longer exists.');a.connections=a.connections.filter(e=>e.id!==raw.id);break;
  case 'realisation.candidate':{
   if(raw.reviewed!==true)throw Error('Review the proposed changes before acceptance.');
   // Round 11: a proposal from the library or a catalogue archetype (component-library.js). The same reviewed path saves
   // the component as a candidate with its origin and where it came from; the contracts and needs proposed with it stay
   // proposals on the record, for Chapter 8 and Chapter 6. No interaction, no data record and nothing else is written.
   if(LIBRARY_KEYS.includes(raw.key)){
    const ref=cleanLibraryRef(raw.library);if((raw.key==='archetype')!==(ref.scope==='catalogue'))throw Error('A library proposal names a library entry; an archetype proposal names a catalogue archetype.');
    if(ref.scope==='project'){const entry=(p.workbench?.catalogue||[]).find(e=>e.id===ref.entryId);if(!entry||entry.kind!==COMPONENT_LIBRARY_KIND)throw Error('Choose a component entry of this project’s library.');if(entry.status==='deprecated')throw Error('This library entry is deprecated. Choose a current one.');ref.title=entry.title;ref.revision=entry.revision;}
    const c=saveComponent(p,{...raw,id:undefined,patternKey:null,status:'candidate'},at);selected=c.id;c.origin=raw.key;c.library=ref;c.proposed=cleanProposed(raw.proposed);
    const asset=p.logical.assets.find(n=>n.id===c.id);if(asset)asset.origin='suggestion';
    break;
   }
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
// The chapter's export reads its records in one pass (document-memo.js), so its lookups read one index (round 5).
export function exportRealisationMarkdown(p){return memoPass(p,()=>exportRealisationMarkdownOf(p));}
// What a component's detail prints of its solution (DM-13): its quality properties, its architectural solution with the
// playbook entries it applies, and the realisation it runs in, marked derived when no one chose it.
const PLAYBOOK_NAMES=new Map([...PATTERNS,...STYLES,...TACTICS].map(x=>[x.id,x.name]));
function solutionMarkdown(p,c){const box=componentContainer(p,c),concern=id=>QUALITY_TYPES.find(t=>t.id===id)?.name||id;return (c.properties?.length?'\n\nQuality properties:\n'+c.properties.map(x=>'- '+concern(x.concern)+': '+x.statement+(x.mechanism?' · Mechanism: '+x.mechanism:'')+(x.source?' · Source: '+x.source:'')).join('\n'):'')+(c.architecturalSolution||c.patternIds?.length?'\n\nArchitectural solution: '+(c.architecturalSolution||'not stated')+(c.patternIds?.length?' · Applies: '+c.patternIds.map(id=>PLAYBOOK_NAMES.get(id)||id).join(', '):''):'')+(box?'\n\nRuns in: '+box.ref+(box.title?' · '+box.title:'')+(box.derived?' (derived from its compute need)':''):'');}
function exportRealisationMarkdownOf(p){
 const a=p.realisation,g=logicalGraph(p),byId=firstById(g.nodes),title=id=>byId.get(id)?.title||id;
 return '# AIW V5 · '+p.name+'\n\n## Chapter 5 — Application realization\n\nApplication model '+a.version+'. Working design; no governance or deployment approval.\n\n'+components(p).map(c=>{
  const s=componentSources(p,c.id);
  return '### '+c.ref+' · '+c.title+'\n\nStable model key: '+c.id+' · Revision '+c.revision+' · '+c.kind+' · '+c.status+'\n\n'+c.purpose+'\n\nBoundary: '+c.boundary+'\n\nOwner: '+c.owner+'\n\nInputs: '+c.inputs+'\n\nOutputs: '+c.outputs+'\n\nOwns data: '+(c.dataIds.map(title).join(', ')||'No owned records declared')+((c.consumesDataIds||[]).length?'\n\nConsumes data: '+c.consumesDataIds.map(title).join(', '):'')+((c.producesDataIds||[]).length?'\n\nProduces data: '+c.producesDataIds.map(title).join(', '):'')+'\n\nRationale: '+c.rationale+'\n\nSource: '+c.source+' · '+c.origin+(componentSourceChanged(p,c)?' · INPUTS CHANGED':'')+'\n\nAllocations:\n'+allocations(p,c.id).sort((x,y)=>(mappingRole(x)==='realises'?0:1)-(mappingRole(y)==='realises'?0:1)).map(m=>'- '+m.id+' → '+(responsibility(p)(m.logicalId)?.ref||m.logicalId)+(mappingRole(m)?' · '+(mappingRole(m)==='realises'?'Realises':'Supports'):'')+' · '+m.scope).join('\n')+'\n\nRequirements: '+s.requirements.map(q=>q.id).join(', ')+'\n\nQuality drivers: '+s.drivers.map(d=>d.id).join(', ')+'\n\nDecisions:\n'+(s.decisions.map(d=>'- '+d.id+' · '+(decisionCurrent(p,d)?'Architect accepted':'Requires review')+' · '+governanceLabel(d,p)).join('\n')||'No decision links')+'\n\nTechnology needs: '+c.technologyNeeds+solutionMarkdown(p,c)+'\n\nAssumptions: '+(c.assumptions||'None recorded')+' · '+(c.assumptionsResolved?'Reviewed':'Open')+'\n\n';
 }).join('')+'## Interactions and dependencies\n\n'+a.connections.map(e=>'- '+e.id+': '+title(e.from)+' → '+title(e.to)+' · '+e.label+' · '+(INTERACTION_TYPES.find(([k])=>k===e.interaction)?.[1]||e.interaction)+(e.open?.condition?' · Condition: '+openWords(e,'condition'):e.condition?' · Condition: '+e.condition:'')+(e.open?.failure?' · Failure policy: '+openWords(e,'failure'):e.failure?' · Failure policy: '+e.failure:'')).join('\n')+'\n\n## Simulation reviews\n\n'+projectScenarios(p).map(id=>'- '+id+': '+(realisationScenarioCurrent(p,id)?'Reviewed':'Review needed')+' · Simulated reference behaviour').join('\n')+'\n\n## Open findings\n\n'+(realisationFindings(p).map(f=>'- '+f.level.toUpperCase()+': '+f.title+'. '+f.detail).join('\n')||'No findings under the current rules.')+'\n\n## Chapter 6 intake\n\n'+(realisationHandoffCurrent(p)?'Current handoff · '+a.handoff.at+' · '+a.handoff.openFindings+' acknowledged findings.':'Handoff needs review against the current model.')+'\n\nStable component references: '+components(p).map(c=>c.ref).join(', ')+'.\n\nGuidance uses project rules. Simulations do not execute banking operations.\n';
}
