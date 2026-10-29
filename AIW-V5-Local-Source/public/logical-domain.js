import {projectNodes,projectEdges,isBlankProject,projectScenarios,scenarioSteps} from './model-scope.js';
import {runtimeProjection} from './runtime-model.js';
import {securityProjection} from './security-model.js';
import {interfacesProjection} from './interfaces-model.js';
import {technologyRealisationProjection} from './technology-realisation-model.js';
import {technologyProjection} from './technology-model.js';
import {nodes as referenceNodes, edges as referenceEdges, suggestions} from './model.js';
import {withDecisions, chosen, decisionCurrent, governanceLabel, appliedDecisionEdges} from './decisions-domain.js';
import {clean} from './util.js';
import {memoPass,passValue,documentIndex,findIn,firstById,groupBy,remember,sharedList} from './document-memo.js';
import {logicalReading,valueFingerprint,recordStamp,driverStamp} from './source-fingerprint.js';
import {requirementGroups} from './requirement-groups.js';
import {isModuleKind} from './module-model.js';
import {linkedRequirementIds,groupStamp,patchIds,patchText,within,knownOnly,settle} from './requirement-links.js';
import {cleanOpen,printable} from './open-fields.js';
import {checked,isProposed,proposalFinding,openFindings,fieldWords} from './record-lifecycle.js';
import {solDisclosure} from './provenance.js';
const sig=x=>JSON.stringify(x),pad=x=>String(x).padStart(3,'0');
const sourceVersions=p=>({requirements:p.contentVersion,quality:p.quality.version,decisions:p.decisions.version});
const versionsMatch=(p,x)=>!!x&&Object.entries(sourceVersions(p)).every(([k,v])=>x[k]===v);
// Explicit bounds (round 5, R5-G): what one workspace keeps, measured by scale-validate.mjs at these sizes.
export const LOGICAL_LIMITS=Object.freeze({responsibilities:500,connections:2000,requirements:5000,links:500});
export const logicalRecords=p=>p.logical?.responsibilities||[];
// Round 12 (DM-14): an allocation says whether the component realises the responsibility or only supports it; '' is
// not stated. Chapter 5 flags two realisers of one responsibility.
export const MAPPING_ROLES=[['realises','Realises'],['supports','Supports']];
export const mappingRole=m=>MAPPING_ROLES.some(([k])=>k===m?.role)?m.role:'';
export const cleanRole=v=>{if(v==null||v==='')return '';if(!MAPPING_ROLES.some(([k])=>k===v))throw Error('Choose whether the component realises or supports the responsibility, or leave it not stated.');return v;};
// Round 12 (DM-24): Chapter 4 connections number LC-nnn, apart from Chapter 1's REL-nnn. A connection saved before keeps
// its id, which a citation may still use, and is cited by the code LC-nnn of the same number.
export const connectionCode=e=>typeof e?.id==='string'&&/^REL-\d+$/.test(e.id)?'LC-'+e.id.slice(4):e?.id||'';
export const RESPONSIBILITY_TEXT=['title','purpose','boundary','owner','source'];
// Round 12 (GR-CMP-09): what a connection says. A structural relationship or a flow as before; a responsibility that
// serves or realises a journey step says so (ArchiMate Serving and Realization, read with the responsibility as the
// source whichever end the connection is drawn from, architecture-model.js), where a flow would cross layers.
export const CONNECTION_KINDS=[['trace','Structural relationship'],['flow','Information / processing flow'],['serves','Serves the journey step'],['realises','Realises the journey step']];
export const LAYER_KINDS=['serves','realises'];
// Round 12 (GR-CMP-10): the fields of a responsibility group, a connection and an implementation mapping that may be
// recorded as not stated or as an open question (open-fields.js): one finding per cause, printed "open: …" once.
export const GROUP_OPEN=['purpose'],CONNECTION_OPEN=['condition'],MAPPING_OPEN=['role','scope','owner','evidence'];
// A field's words as an export prints them: "open: …" once for a field recorded open, else its words as they were.
export const openWords=(r,k,words=r?.[k]??'')=>r?.open?.[k]?printable(r,k,fieldWords(k)):words;
const openOf=(raw,old,fields)=>{const o=raw.open===undefined?old?.open:cleanOpen(raw.open,fields);return o&&Object.keys(o).length?o:undefined;};
const sameOpen=(a,b)=>JSON.stringify(a?.open||{})===JSON.stringify(b?.open||{});
// Lookups (round 5, R5-G): on a settled document, or inside a pass (document-memo.js), each list is indexed once and
// every lookup reads the index; otherwise each searches its list as before. The same records, in the same order.
const ix=(p,name,build)=>documentIndex(p,'logical:'+name,build);
const byPosition=(p,name,list,found)=>{const at=ix(p,'positions:'+name,()=>new Map(list.map((x,i)=>[x,i])));return [...found].sort((a,b)=>at.get(a)-at.get(b));};
export const responsibility=p=>id=>findIn(p,'logical:responsibilities',()=>logicalRecords(p),id);
const artefact=(p,id)=>findIn(p,'logical:artefacts',()=>p.artefacts,id),decision=(p,id)=>findIn(p,'logical:decisions',()=>p.decisions.records,id);
function physicalNode(p,n,local=null){const cs=local||ix(p,'components',()=>firstById(p.realisation?.components||[])),c=cs?(p.realisation?cs.get(n.id):undefined):p.realisation?.components.find(c=>c.id===n.id);return c?{...n,ref:c.ref,title:c.title,sub:c.ref+' · '+c.kind,description:c.purpose,componentKind:c.kind,attrs:{'Stable reference':c.ref,Kind:c.kind,Owner:c.owner||'Owner needed',Boundary:c.boundary||'Boundary needed',Inputs:c.inputs||'Inputs needed',Outputs:c.outputs||'Outputs needed','Design state':c.status}}:n;}
export const physicalObjects=p=>{const cs=p.realisation?firstById(p.realisation.components):null;return [...projectNodes(p).filter(n=>n.layer==='physical'),...(p.logical?.assets||[]).filter(n=>n.layer==='physical')].map(n=>physicalNode(p,n,cs));};
// A driver bears on a responsibility through the responsibility itself, a linked decision, or a shared requirement.
const each=(list,keys)=>{const m=new Map();for(const x of list)for(const k of new Set(keys(x))){let xs=m.get(k);if(!xs)m.set(k,xs=[]);xs.push(x);}return m;};
// Round 12 (D-03): a shared requirement counts through a requirement group the responsibility links, and so does a
// group both link; a responsibility that links no group reads as before.
export function driversForResponsibility(p,r){
 const x=ix(p,'driver-links',()=>({byResponsibility:each(p.quality.drivers,d=>d.responsibilityIds),byRequirement:each(p.quality.drivers,d=>d.requirementIds),byGroup:each(p.quality.drivers,d=>d.requirementGroupIds||[]),byId:groupBy(p.quality.drivers,d=>d.id),decisions:groupBy(p.decisions.records,d=>d.id)}));
 const reqs=r.requirementGroupIds?.length?linkedRequirementIds(p,r):r.requirementIds,groups=r.requirementGroupIds||[];
 if(!x){const decisionDrivers=new Set(p.decisions.records.filter(d=>r.decisionIds.includes(d.id)).flatMap(d=>d.driverIds));return p.quality.drivers.filter(d=>d.responsibilityIds.includes(r.id)||decisionDrivers.has(d.id)||d.requirementIds.some(id=>reqs.includes(id))||(d.requirementGroupIds||[]).some(id=>groups.includes(id)));}
 const found=new Set(x.byResponsibility.get(r.id)||[]);
 for(const id of new Set(r.decisionIds))for(const d of x.decisions.get(id)||[])for(const did of d.driverIds)for(const q of x.byId.get(did)||[])found.add(q);
 for(const id of reqs)for(const q of x.byRequirement.get(id)||[])found.add(q);
 for(const id of groups)for(const q of x.byGroup.get(id)||[])found.add(q);
 return byPosition(p,'drivers',p.quality.drivers,found);
}
export function decisionsForResponsibility(p,r){
 const x=ix(p,'decision-links',()=>({byId:groupBy(p.decisions.records,d=>d.id),byChosen:each(p.decisions.records,d=>chosen(d)?.responsibilityIds||[])}));
 if(!x)return p.decisions.records.filter(d=>r.decisionIds.includes(d.id)||chosen(d)?.responsibilityIds.includes(r.id));
 const found=new Set(x.byChosen.get(r.id)||[]);for(const id of r.decisionIds)for(const d of x.byId.get(id)||[])found.add(d);
 return byPosition(p,'decisions',p.decisions.records,found);
}
// A responsibility keeps one fingerprint of what it reads (round 12, D-04: not a copy): the requirements and drivers it
// names, each as its fingerprint, and the state of its decisions. A reading kept as a copy is read as that fingerprint.
// Round 12 (G-32): a responsibility saved now also keeps the ids of the drivers that bore on it (sourceDriverIds), and its
// reading is taken again over those: a driver that changed, or no longer bears on it, is a changed source; a driver that
// first bears on it after the save (a driver saved later that names it) is not, so the order of saving changes nothing.
// A responsibility saved before keeps the reading of every driver that bears on it now, and is judged as it was. The
// requirements read are those it names, then the members of the requirement groups it links (requirement-groups.js).
function readingOf(p,r,kept){const bearing=driversForResponsibility(p,r),byId=kept&&new Map(bearing.map(d=>[d.id,d]));return valueFingerprint({requirements:[...r.requirementIds.map(id=>recordStamp(p,artefact(p,id)||null)),...(r.requirementGroupIds||[]).map(id=>groupStamp(p,id))],drivers:(kept?kept.map(id=>byId.get(id)||null):bearing).map(d=>driverStamp(p,d)),decisions:r.decisionIds.map(id=>{const d=decision(p,id);return d?{id:d.id,revision:d.revision,status:d.status,selected:d.selectedAlternativeId,rationale:d.rationale}:null})});}
export const logicalSourceChanged=(p,r)=>remember(p,'logical:source-changed',r,()=>logicalReading(r.sourceSnapshot)!==readingOf(p,r,Array.isArray(r.sourceDriverIds)?r.sourceDriverIds:null));
// What a mapping read of its responsibility; the requirement groups count once it links one.
export const mappingSnapshot=r=>sig({title:r.title,purpose:r.purpose,boundary:r.boundary,requirementIds:r.requirementIds,decisionIds:r.decisionIds,...(r.requirementGroupIds?.length?{requirementGroupIds:r.requirementGroupIds}:{})});
// The reading a responsibility would keep now, as logicalSourceChanged takes it (readings-upgrade.js compares it with
// the one kept).
export const currentResponsibilityReading=(p,r)=>readingOf(p,r,Array.isArray(r.sourceDriverIds)?r.sourceDriverIds:null);
export const mappingCurrent=(p,m)=>!!responsibility(p)(m.logicalId)&&m.logicalSnapshot===mappingSnapshot(responsibility(p)(m.logicalId));
export const mappingComplete=(p,m)=>{if(!(mappingCurrent(p,m)&&!!m.scope&&!!m.owner))return false;const ids=ix(p,'physical-ids',()=>new Set(physicalObjects(p).map(n=>n.id)));return ids?ids.has(m.physicalId):physicalObjects(p).some(n=>n.id===m.physicalId);};
// The objects connected to the seeds through the edges, in either direction: what repeating a sweep over the edges
// until nothing changes (at most bound sweeps) reaches. A breadth-first walk finds the same set at once; when the set
// is larger than the sweeps could have reached (only through endpoints that are not objects), the sweeps are run.
export function connectedTo(seeds,edges,bound){
 const reached=new Set(seeds),next=new Map(),link=(a,b)=>{let xs=next.get(a);if(!xs)next.set(a,xs=[]);xs.push(b);};
 for(const e of edges){link(e.from,e.to);link(e.to,e.from);}
 const todo=[...reached];while(todo.length){const id=todo.pop();for(const n of next.get(id)||[])if(!reached.has(n)){reached.add(n);todo.push(n);}}
 if(reached.size-1<=bound)return reached;
 const swept=new Set(seeds);for(let i=0;i<bound;i++){let changed=false;for(const e of edges){if(swept.has(e.from)&&!swept.has(e.to)){swept.add(e.to);changed=true}if(swept.has(e.to)&&!swept.has(e.from)){swept.add(e.from);changed=true}}if(!changed)break;}
 return swept;
}
export function withLogical(input){
 const p=withDecisions(input);if(p.logical)return p;
 const groups=[{id:'GRP-001',title:'Channel & customer',purpose:'Instruction intake and communication.'},{id:'GRP-002',title:'Control & accounting',purpose:'Risk decisions and authoritative financial records.'},{id:'GRP-003',title:'Settlement',purpose:'External handoff and outcome investigation.'}];
 const responsibilities=referenceNodes.filter(n=>n.layer==='logical').map((n,i)=>{
  const r={id:n.id,ref:'LR-'+pad(i+1),revision:1,title:n.title,purpose:n.description,boundary:n.attrs.Responsibility,owner:n.attrs.Owner,source:'Illustrative Bank Payment Journey responsibility',origin:'reference',confirmed:false,groupId:['GRP-001','GRP-002','GRP-002','GRP-003','GRP-001'][i],order:i,requirementIds:p.artefacts.filter(a=>a.type==='requirement'&&a.modelRef===n.id).map(a=>a.id),decisionIds:p.decisions.records.filter(d=>d.alternatives.some(a=>a.responsibilityIds.includes(n.id))).map(d=>d.id),history:[]};
  // Round 12 (GR-REQ-17): a seeded responsibility keeps the ids of the drivers that bore on it (G-32), as one a person
  // saves now does, so a driver added later that names it is not a change of the responsibility.
  r.sourceDriverIds=driversForResponsibility(p,r).map(d=>d.id);r.sourceSnapshot=readingOf(p,r,null);return r;
 });
 const logicalIds=new Set(responsibilities.map(r=>r.id));
 const connections=referenceEdges.filter(e=>(logicalIds.has(e.from)||logicalIds.has(e.to))&&!referenceNodes.some(n=>n.id===e.to&&n.layer==='physical')).map((e,i)=>({...e,id:'REL-'+pad(i+1),condition:e.from==='risk'&&e.to==='ledger'?'Only an explicit allow decision permits posting.':'',origin:'reference'}));
 const mappings=referenceEdges.filter(e=>logicalIds.has(e.from)&&referenceNodes.some(n=>n.id===e.to&&n.layer==='physical')).map((e,i)=>({id:'MAP-'+pad(i+1),logicalId:e.from,physicalId:e.to,scope:responsibilities.find(r=>r.id===e.from).boundary,owner:responsibilities.find(r=>r.id===e.from).owner,status:'candidate',evidence:'Illustrative implementation mapping; confirm the allocation in Chapter 5.',logicalSnapshot:mappingSnapshot(responsibilities.find(r=>r.id===e.from)),origin:'reference'}));
 p.logical={schemaVersion:1,version:1,counters:{responsibility:5,group:3,connection:connections.length,mapping:mappings.length,asset:0},responsibilities,groups,connections,mappings,assets:[],intake:null,scenarios:{},review:null,handoff:null};return p;
}
// The connected graph every chapter reads: worked out once for the length of a pass (document-memo.js), afresh otherwise.
export function logicalGraph(p){return passValue(p,'logical:graph',()=>memoPass(p,()=>logicalGraphOf(p)));}
function logicalGraphOf(p){
 const records=logicalRecords(p),scopeNodes=projectNodes(p);
 const nodes=[...scopeNodes.filter(n=>n.layer!=='logical').map(n=>n.layer==='physical'?physicalNode(p,n):n),...records.map(r=>({id:r.id,ref:r.ref,candidateKey:r.candidateKey,layer:'logical',col:r.order%5,title:r.title,sub:r.ref+' · '+(p.logical.groups.find(g=>g.id===r.groupId)?.title||'Ungrouped'),description:r.purpose,groupId:r.groupId,attrs:{'Stable reference':r.ref,Owner:r.owner||'Owner needed',Responsibility:r.boundary||'Boundary needed',Group:p.logical.groups.find(g=>g.id===r.groupId)?.title||'Ungrouped',Review:r.confirmed&&!logicalSourceChanged(p,r)?'User reviewed':'Working / reference content'}})),...p.logical.assets.map(a=>a.layer==='physical'?physicalNode(p,a):({...a,attrs:{...a.attrs}}))];
 const logicalIds=new Set(records.map(r=>r.id));
 const edges=[...projectEdges(p).filter(e=>!scopeNodes.some(n=>(n.id===e.from||n.id===e.to)&&(n.layer==='logical'||(p.realisation&&n.layer==='physical')))),...(p.realisation?.connections||[]),...(p.realisation?.components||[]).flatMap(c=>c.dataIds.filter(id=>!p.realisation.connections.some(e=>e.from===c.id&&e.to===id&&e.label==='owns')).map(id=>({id:'own-'+c.id+'-'+id,from:c.id,to:id,label:'owns',kind:'trace'}))),...p.logical.connections,...p.logical.mappings.map(m=>({id:m.id,from:m.logicalId,to:m.physicalId,label:'realised by',kind:'trace',mappingId:m.id,stale:!mappingCurrent(p,m)})),...appliedDecisionEdges(p)];
 return runtimeProjection(p,securityProjection(p,interfacesProjection(p,technologyRealisationProjection(p,technologyProjection(p,{nodes,edges})))));
}
// The chapter's checks, worked out once per settled document or pass (each caller gets its own copies).
export function logicalFindings(p){return memoPass(p,()=>sharedList(p,'logical:findings',()=>logicalFindingsOf(p)));}
function logicalFindingsOf(p){
 const l=p.logical,{nodes,edges}=logicalGraph(p),out=[],add=(code,id,title,detail,level='error',extra={})=>out.push({id:code+':'+id,code,objectId:id,title,detail,level,...extra});
 const reqs=p.artefacts.filter(a=>a.type==='requirement');
 if(!l.responsibilities.length)add('empty','project','Define a logical responsibility','Start from a requirement and name the responsibility that fulfils it.');
 if(!versionsMatch(p,l.intake))add('intake','project','Review the inherited inputs','Requirements, quality drivers, or decisions have not been reviewed for this logical model.','warning');
 const own=checked(l.responsibilities),proposals=proposalFinding(l.responsibilities,4),stated=(r,k)=>!!String(r[k]??'').trim()||!!r.open?.[k];if(proposals)out.push({...proposals,objectId:'project'});
 const coveredIds=new Set(own.flatMap(r=>linkedRequirementIds(p,r))),reqIds=new Set(reqs.map(q=>q.id)),groupIds=new Set(requirementGroups(p).map(g=>g.id)),decisionIds=new Set(p.decisions.records.map(d=>d.id)),mappedIds=new Set(l.mappings.map(m=>m.logicalId)),responsibilityIds=new Set(l.responsibilities.map(r=>r.id)),titled=groupBy(l.responsibilities,r=>r.title.toLowerCase());
 for(const q of reqs)if(!coveredIds.has(q.id))add('uncovered',q.id,'Cover '+q.id+' · '+q.title,'Assign this requirement to a responsibility and explain the boundary.','error',{requirementId:q.id});
 const known=new Set(nodes.map(n=>n.id)),reachable=connectedTo(projectNodes(p).filter(n=>n.layer==='process').map(n=>n.id),edges,nodes.length);
 for(const r of own){
  if(!stated(r,'purpose')||!stated(r,'boundary')||!stated(r,'owner')||!stated(r,'source'))add('definition',r.id,'Complete '+r.title,'Describe its purpose, owned boundary, accountable owner, and source.');
  openFindings(r,RESPONSIBILITY_TEXT,add);
  if(!r.groupId)add('group',r.id,'Group '+r.title,'Place it in a meaningful responsibility group.','warning');
  if(!r.requirementIds.length&&!r.requirementGroupIds?.length)add('rationale',r.id,'Justify '+r.title,'Link at least one source requirement.');
  if(r.requirementIds.some(id=>!reqIds.has(id))||r.decisionIds.some(id=>!decisionIds.has(id))||(r.requirementGroupIds||[]).some(id=>!groupIds.has(id)))add('broken-source',r.id,'Repair the source links for '+r.title,'A linked requirement or decision is missing.');
  if(logicalSourceChanged(p,r))add('source-change',r.id,'Review changed inputs for '+r.title,'A linked requirement, quality driver, or decision changed. Review the responsibility and save it against the current inputs.');
  if(!r.decisionIds.length)add('decision-link',r.id,'Explain the design choice for '+r.title,'Link its relevant architecture decisions, or record the missing question in Chapter 3.','warning',{fixChapter:3});
  if(r.decisionIds.some(id=>{const d=decision(p,id);return d&&!decisionCurrent(p,d)}))add('draft-decision',r.id,'Decision rationale still needs acceptance','One or more linked decisions are draft, superseded, or based on changed inputs. They remain visible without implying approval.','warning');
  if(!r.confirmed)add('confirmation',r.id,'Review '+r.title,r.origin==='reference'?'This is illustrative reference content. Confirm its boundary against your project.':'This working responsibility still needs explicit review.','warning');
  if(!reachable.has(r.id))add('disconnected',r.id,'Connect '+r.title,'This responsibility has no connected path to the project journey. Connect its input, output, or process step.');
  if(!mappedIds.has(r.id))add('unmapped',r.id,'Plan the implementation of '+r.title,'No candidate physical component realises this responsibility. Map it now or carry the gap to Chapter 5.','warning',{fixChapter:5});
  if(titled.get(r.title.toLowerCase()).some(x=>x.id!==r.id&&x.ref<r.ref))add('duplicate',r.id,'Review duplicate responsibility names','Another responsibility has this title. Make their boundaries distinct.','warning');
 }
 // Open fields of groups, connections and mappings: one finding per cause each, which opens the record to answer it.
 const about=extra=>(code,id,title,detail,level)=>add(code,id,title,detail,level,extra);
 for(const g of l.groups)openFindings(g,GROUP_OPEN,about({groupId:g.id}));for(const e of l.connections)openFindings(e,CONNECTION_OPEN,about({connectionId:e.id}));for(const m of l.mappings)openFindings(m,MAPPING_OPEN,about({mappingId:m.id}));
 // A step reaches its responsibility through a connection to it, or one from it that serves or realises the step.
 const handsToResponsibility=new Set(edges.flatMap(e=>responsibilityIds.has(e.to)?[e.from]:LAYER_KINDS.includes(e.kind)&&responsibilityIds.has(e.from)?[e.to]:[]));
 for(const n of projectNodes(p).filter(n=>n.layer==='process'))if(!handsToResponsibility.has(n.id))add('process-gap',n.id,'Assign a responsibility to '+n.title,'This process step has no logical responsibility connected to it.');
 for(const e of edges)if(!known.has(e.from)||!known.has(e.to))add('broken-edge',e.id||e.from+e.to,'Repair a model relationship','An endpoint no longer exists.','error',{connectionId:e.id});
 for(const a of nodes.filter(n=>n.layer!=='logical'&&n.layer!=='process'))if(!reachable.has(a.id))add('disconnected-object',a.id,'Connect '+a.title,'This object has no connected path to the project journey.');
 for(const m of l.mappings){if(!known.has(m.physicalId)||!responsibilityIds.has(m.logicalId))add('broken-mapping',m.logicalId,'Repair '+m.id,'The logical or physical endpoint is missing.','error',{mappingId:m.id});else if(!(m.scope||m.open?.scope)||!(m.owner||m.open?.owner))add('incomplete-mapping',m.logicalId,'Complete '+m.id+' implementation scope','Explain which part is realised and who owns the mapping.','error',{mappingId:m.id});else if(!mappingCurrent(p,m))add('stale-mapping',m.logicalId,'Review '+m.id+' after the responsibility changed','Its stable logical reference is retained. Review the implementation scope against the current responsibility.','warning',{mappingId:m.id});}
 return out;
}
export const logicalReviewCurrent=p=>p.logical.review?.version===p.logical.version&&versionsMatch(p,p.logical.review);
export const logicalHandoffCurrent=p=>p.logical.handoff?.version===p.logical.version&&versionsMatch(p,p.logical.handoff);
export const scenarioCurrent=(p,id)=>p.logical.scenarios[id]?.version===p.logical.version&&(!isBlankProject(p)||p.logical.scenarios[id]?.sourceVersion===p.contentVersion);
export function logicalMilestones(p){return memoPass(p,()=>logicalMilestonesOf(p));}
function logicalMilestonesOf(p){
 const l=p.logical,fs=logicalFindings(p),reqs=p.artefacts.filter(a=>a.type==='requirement'),coveredIds=new Set(checked(l.responsibilities).flatMap(r=>linkedRequirementIds(p,r))),covered=reqs.filter(q=>coveredIds.has(q.id)).length,defined=l.responsibilities.filter(r=>r.purpose&&r.boundary&&r.owner&&r.groupId&&(r.requirementIds.length||r.requirementGroupIds?.length)&&!logicalSourceChanged(p,r)).length,mappingsOf=groupBy(l.mappings,m=>m.logicalId),mapped=l.responsibilities.filter(r=>(mappingsOf.get(r.id)||[]).some(m=>mappingComplete(p,m))).length,traced=projectScenarios(p).filter(id=>scenarioCurrent(p,id)).length;
 return [{id:'l-intake',name:'Review inherited inputs',done:versionsMatch(p,l.intake),detail:'Requirements → drivers → decisions'}, {id:'l-coverage',name:'Cover the requirements',done:reqs.length>0&&covered===reqs.length,detail:covered+' / '+reqs.length+' assigned'}, {id:'l-define',name:'Define and group responsibilities',done:l.responsibilities.length>0&&defined===l.responsibilities.length,detail:defined+' / '+l.responsibilities.length+' defined'}, {id:'l-connect',name:'Connect the journey model',done:l.responsibilities.length>0&&!fs.some(f=>['disconnected','disconnected-object','broken-edge','process-gap'].includes(f.code)),detail:'No disconnected or missing process responsibilities'}, {id:'l-mapping',name:'Review implementation links',done:l.responsibilities.length>0&&mapped===l.responsibilities.length,detail:mapped+' / '+l.responsibilities.length+' with current scope'}, {id:'l-scenarios',name:isBlankProject(p)?'Trace your recorded journey':'Trace all three outcomes',done:traced===projectScenarios(p).length,detail:traced+' / '+projectScenarios(p).length+' simulated scenarios reviewed'}, {id:'l-validate',name:'Validate the logical model',done:logicalReviewCurrent(p)&&!fs.some(f=>f.level==='error'),detail:fs.filter(f=>f.level==='error').length+' content gaps'}, {id:'l-handoff',name:'Carry forward to Chapter 5',done:logicalHandoffCurrent(p),detail:'Stable references and open findings travel together'}];
}
// Round 12: an update that leaves a link out keeps it; a link sent is checked, and refused past its bound, never cut.
function refsValid(p,raw,old){const out={};
 for(const [k,noun,max,known] of [['requirementIds','requirements',LOGICAL_LIMITS.requirements,()=>new Set(p.artefacts.filter(a=>a.type==='requirement').map(a=>a.id))],['decisionIds','decisions',LOGICAL_LIMITS.links,()=>new Set(p.decisions.records.map(d=>d.id))],['requirementGroupIds','requirement groups',LOGICAL_LIMITS.links,()=>new Set(requirementGroups(p).map(g=>g.id))]]){const {ids:v,sent}=patchIds(raw,k,old);within(v,max,noun);if(sent.length)knownOnly(sent,known(),noun);out[k]=v;}
 return out;}
// What a person changes on a responsibility: a save that changes none of it, of a responsibility whose sources did not
// change, leaves it as it is (round 12, G-32): no new revision, and nothing that reads it is marked changed.
const content=r=>sig([...RESPONSIBILITY_TEXT.map(k=>r[k]??''),r.groupId||'',r.requirementIds||[],r.decisionIds||[],r.requirementGroupIds||[],r.open&&Object.keys(r.open).length?r.open:null]),asSaved=r=>content(r)+!!r.confirmed;
function saveResponsibility(p,raw,at,origin='user'){
 const l=p.logical,old=raw.id?responsibility(p)(raw.id):null;if(raw.id&&!old)throw Error('This responsibility no longer exists.');
 const text={};for(const k of RESPONSIBILITY_TEXT)text[k]=patchText(raw,k,old,k==='title'?160:k==='owner'?180:4000,'The '+fieldWords(k));if(!text.title)throw Error('Name the responsibility.');
 const groupId=raw.groupId===undefined&&old?old.groupId:raw.groupId||'';if(groupId&&!l.groups.some(g=>g.id===groupId))throw Error('Choose an existing responsibility group.');const refs=refsValid(p,raw,old);
 if(!old&&l.responsibilities.length>=LOGICAL_LIMITS.responsibilities)throw Error('This workspace keeps up to 500 responsibilities.');
 const count=old?null:++l.counters.responsibility,history=old?[...old.history,{at,revision:old.revision,title:old.title,purpose:old.purpose,boundary:old.boundary,requirementIds:old.requirementIds,decisionIds:old.decisionIds}]:[],r={id:old?.id||'lr-'+pad(count),ref:old?.ref||'LR-'+pad(count),revision:(old?.revision||0)+1,origin:old?.origin||origin,candidateKey:old?.candidateKey||null,order:old?.order??l.responsibilities.length,groupId,confirmed:false,...refs,history:history.length>30?[history[0],...history.slice(-29)]:history};
 Object.assign(r,text);r.open=raw.open===undefined?old?.open:cleanOpen(raw.open,RESPONSIBILITY_TEXT);settle(r,old,['requirementGroupIds','open']);
 // A review not sent again holds only while what was reviewed is unchanged; confirming still needs every field stated.
 r.confirmed=raw.confirmed!==undefined?raw.confirmed===true:!!old?.confirmed&&content(old)===content(r);
 if(r.confirmed&&(!r.purpose||!r.boundary||!r.owner||!r.source||!r.requirementIds.length&&!r.requirementGroupIds?.length))throw Error('Complete the purpose, boundary, owner, source, and requirement links before confirming.');
 if(old&&!isProposed(old)&&!logicalSourceChanged(p,old)&&asSaved(old)===asSaved(r))return old;
 r.sourceDriverIds=driversForResponsibility(p,r).map(d=>d.id);r.sourceSnapshot=readingOf(p,r,null);if(old)l.responsibilities[l.responsibilities.indexOf(old)]=r;else l.responsibilities.push(r);return r;
}
// Why a Chapter 4 connection's two ends would be refused, or '' (rc41 close: one rule for the save and for the canvas's
// kinds menu): two different objects of the logical graph (a journey step stands there as its process step), one of them
// a logical responsibility, neither a physical component.
export function connectionRefusal(p,from,to){const graph=logicalGraph(p);if(from===to||![from,to].every(id=>graph.nodes.some(n=>n.id===id))||![from,to].some(id=>responsibility(p)(id)))return 'Connect two different existing objects, including a logical responsibility.';if([from,to].some(id=>physicalObjects(p).some(n=>n.id===id)))return 'Use implementation mappings to connect physical components.';return '';}
// Why an implementation link would be refused, or '': an existing responsibility, an existing physical candidate, not
// already linked (`except`: the mapping being edited).
export function mappingRefusal(p,logicalId,physicalId,except=null){const r=responsibility(p)(logicalId);if(!r)return 'Choose an existing logical responsibility.';if(!physicalObjects(p).some(a=>a.id===physicalId))return 'Choose an existing physical candidate or describe a new component.';if((p.logical?.mappings||[]).some(m=>m.id!==except&&m.logicalId===r.id&&m.physicalId===physicalId))return 'This implementation mapping already exists.';return '';}
function saveConnection(p,raw){const l=p.logical,old=raw.id?l.connections.find(e=>e.id===raw.id):null;if(raw.id&&!old)throw Error('This connection is read-only here. Review decision impacts in Chapter 3 and implementation mappings separately.');const ends=connectionRefusal(p,raw.from,raw.to);if(ends)throw Error(ends);if(!clean(raw.label,180))throw Error('Describe what this relationship means.');if(l.connections.some(e=>e.id!==old?.id&&e.from===raw.from&&e.to===raw.to&&e.label.toLowerCase()===raw.label.trim().toLowerCase()))throw Error('This labelled connection already exists.');if(!old&&l.connections.length>=LOGICAL_LIMITS.connections)throw Error('This workspace keeps up to 2,000 connections.');const e={id:old?.id||'LC-'+pad(++l.counters.connection),from:raw.from,to:raw.to,label:clean(raw.label,180),kind:CONNECTION_KINDS.some(([k])=>k===raw.kind)?raw.kind:'trace',condition:clean(raw.condition),origin:old?.origin||'user'};const open=openOf(raw,old,CONNECTION_OPEN);if(open)e.open=open;if(old)l.connections[l.connections.indexOf(old)]=e;else l.connections.push(e);return e;}
function addAsset(p,raw){const l=p.logical,id='obj-'+pad(++l.counters.asset),a={id,ref:'OBJ-'+pad(l.counters.asset),layer:raw.layer==='physical'?'physical':'data',col:raw.col??3,title:clean(raw.title,160),sub:clean(raw.sub,100)||'Working candidate',description:clean(raw.description),origin:raw.candidateKey?'suggestion':'user',source:clean(raw.source),candidateKey:raw.candidateKey||null,attrs:{Owner:clean(raw.owner,180)||'Owner needed',Obligation:clean(raw.obligation||raw.boundary)||'Review the implementation boundary'}};if(!a.title||!a.description)throw Error('Describe the candidate and its purpose.');l.assets.push(a);return a;}
export function applyLogicalCommand(input,command,at=new Date().toISOString()){
 const p=withLogical(input),l=p.logical,raw=command.payload||{};let selected=raw.id||null,mutated=true;
 switch(command.type){
 case 'logical.responsibility':{const before=raw.id&&responsibility(p)(raw.id),r=saveResponsibility(p,raw,at);selected=r.id;if(r===before)mutated=false;break;}
 case 'logical.group':{const old=raw.id?l.groups.find(g=>g.id===raw.id):null;if(raw.id&&!old)throw Error('This group no longer exists.');const title=patchText(raw,'title',old,120,'The group name'),purpose=patchText(raw,'purpose',old,4000,'The purpose');if(!title)throw Error('Name the responsibility group.');if(l.groups.some(g=>g.id!==old?.id&&g.title.toLowerCase()===title.toLowerCase()))throw Error('This group name already exists.');selected=null;const open=openOf(raw,old,GROUP_OPEN);const realises=patchIds(raw,'requirementGroupIds',old),groupsById=new Map(requirementGroups(p).map(x=>[x.id,x]));knownOnly(realises.sent,new Set(groupsById.keys()),'requirement groups');if(realises.sent.some(id=>!isModuleKind(groupsById.get(id)?.kind)))throw Error('A responsibility group realises a module or a sub-module of the requirements. Link one of those.');within(realises.ids,12,'modules');const sameModules=(old?.requirementGroupIds||[]).join()===realises.ids.join();if(old&&old.title===title&&old.purpose===purpose&&sameOpen(old,{open})&&sameModules){mutated=false;break;}const g={id:old?.id||'GRP-'+pad(++l.counters.group),title,purpose,...(open?{open}:{}),...(realises.ids.length?{requirementGroupIds:realises.ids}:{})};if(old)l.groups[l.groups.indexOf(old)]=g;else l.groups.push(g);break;}
 case 'logical.connection':selected=saveConnection(p,raw).from;break;
 case 'logical.remove-connection':{if(!l.connections.some(e=>e.id===raw.id))throw Error('This saved connection no longer exists.');l.connections=l.connections.filter(e=>e.id!==raw.id);selected=null;break;}
 case 'logical.mapping':{const r=responsibility(p)(raw.logicalId);if(!r)throw Error('Choose an existing logical responsibility.');const old=raw.id?l.mappings.find(m=>m.id===raw.id):null;if(raw.id&&!old)throw Error('This mapping no longer exists.');let physicalId=raw.physicalId;if(raw.newComponent){const a=addAsset(p,{title:raw.componentTitle,description:raw.componentPurpose,owner:raw.owner,obligation:'Confirm implementation allocation in Chapter 5.',layer:'physical',col:r.order%5,sub:'Application component · candidate'});physicalId=a.id;}{const why=mappingRefusal(p,r.id,physicalId,old?.id);if(why)throw Error(why);}const role=raw.role===undefined?mappingRole(old):cleanRole(raw.role),m={id:old?.id||'MAP-'+pad(++l.counters.mapping),logicalId:r.id,physicalId,scope:patchText(raw,'scope',old,4000,'The scope'),owner:patchText(raw,'owner',old,180,'The owner'),evidence:patchText(raw,'evidence',old,4000,'The evidence'),status:'candidate',...(role||old?.role!==undefined?{role}:{}),logicalSnapshot:mappingSnapshot(r),origin:old?.origin||'user'};const open=openOf(raw,old,MAPPING_OPEN);if(open)m.open=open;const same=old&&['logicalId','physicalId','scope','owner','evidence','role'].every(k=>(old[k]??'')===(m[k]??''))&&sameOpen(old,m);m.status=raw.status!==undefined?raw.status==='reviewed'?'reviewed':'candidate':same?old.status:'candidate';if(m.status==='reviewed'&&(!m.scope||!m.owner||!m.evidence))throw Error('A reviewed mapping needs scope, owner, and supporting evidence.');selected=r.id;if(same&&m.status===old.status&&m.logicalSnapshot===old.logicalSnapshot){mutated=false;break;}if(old)l.mappings[l.mappings.indexOf(old)]=m;else l.mappings.push(m);break;}
 case 'logical.remove-mapping':if(!l.mappings.some(m=>m.id===raw.id))throw Error('This mapping no longer exists.');l.mappings=l.mappings.filter(m=>m.id!==raw.id);selected=null;break;
 case 'logical.candidate':{const key=raw.key;if(isBlankProject(p)&&typeof key==='string'&&key.startsWith('boundary-')){const q=logicalProposal(p,key);if(q.existingId)throw Error('This candidate is already saved.');const r=saveResponsibility(p,raw,at,'suggestion');r.candidateKey=q.key;if(q.source)saveConnection(p,{from:q.source,to:r.id,label:raw.relationship||'performed by',kind:'flow',condition:''});selected=r.id;break;}if(!['review','dedup','recovery'].includes(key))throw Error('Choose a known ghost proposal.');if(l.responsibilities.some(r=>r.candidateKey===key)||l.assets.some(a=>a.candidateKey===key))throw Error('This proposal is already in the shared project.');const source=key==='review'?'risk':key==='dedup'?'ledger':'hub';if(key==='review'){const r=saveResponsibility(p,raw,at,'suggestion');r.candidateKey=key;saveConnection(p,{from:source,to:r.id,label:raw.relationship||'routes held payments to',kind:'flow',condition:'On an explicit risk hold; no posting occurs.'});selected=r.id;}else{const a=addAsset(p,{...raw,description:raw.purpose,layer:key==='dedup'?'data':'physical',col:key==='dedup'?2:3,candidateKey:key});if(key==='dedup')saveConnection(p,{from:source,to:a.id,label:raw.relationship||'checks the original reference in',kind:'trace'});else{l.mappings.push({id:'MAP-'+pad(++l.counters.mapping),logicalId:source,physicalId:a.id,scope:raw.boundary||'Investigate uncertain settlement outcomes',owner:clean(raw.owner,180),status:'candidate',evidence:clean(raw.source),logicalSnapshot:mappingSnapshot(responsibility(p)(source)),origin:'suggestion'})}selected=a.id;}break;}
 case 'logical.intake':mutated=false;l.intake={at,...sourceVersions(p)};break;
 case 'logical.scenario':{mutated=false;if(!['success','hold','timeout'].includes(raw.scenario))throw Error('Choose a supported simulated outcome.');const expected=scenarioSteps(p,raw.scenario);if(!expected.length)throw Error('Add a journey step before recording a trace.');if(!Array.isArray(raw.visited)||!expected.every(x=>raw.visited.includes(x))||raw.visited.some(x=>!expected.includes(x)))throw Error('Trace each relevant step before recording the simulation review.');l.scenarios[raw.scenario]={at,version:l.version,sourceVersion:p.contentVersion,visited:expected,simulated:true};break;}
 case 'logical.review':mutated=false;l.review={at,version:l.version,...sourceVersions(p),findings:logicalFindings(p).length};break;
 case 'logical.handoff':mutated=false;if(!logicalReviewCurrent(p))throw Error('Run checks against the current logical model first.');if(!l.responsibilities.length)throw Error('Define a responsibility before handoff.');if(logicalFindings(p).length&&!raw.acknowledge)throw Error('Acknowledge the open findings that travel to Chapter 5.');l.handoff={at,version:l.version,...sourceVersions(p),responsibilityIds:l.responsibilities.map(r=>r.id),mappingIds:l.mappings.map(m=>m.id),openFindings:logicalFindings(p).length};break;
 default:throw Error('Unknown logical-model action.');
 }
 if(mutated){l.version++;l.review=null;l.handoff=null;}return {document:p,selected};
}
export function logicalProposal(p,key,selectedId){
 const l=p.logical;
 if(isBlankProject(p)){
  const uncovered=p.artefacts.find(a=>a.type==='requirement'&&!l.responsibilities.some(r=>r.requirementIds.includes(a.id))),req=uncovered||p.artefacts.find(a=>a.type==='requirement');
  const source=p.artefacts.find(a=>a.type==='journey'&&p.relationships.some(e=>e.from===a.id&&e.to===req?.id))||p.artefacts.find(a=>a.type==='journey');
  const candidateKey='boundary-'+(req?.id||'first'),existing=l.responsibilities.find(r=>r.candidateKey===candidateKey)||(!uncovered&&req?l.responsibilities.find(r=>r.requirementIds.includes(req.id)):null);
  if(existing)return {key:candidateKey,existingId:existing.id};
  return {key:candidateKey,source:source?.id||'',title:req?'Handle '+req.title:'Define the first responsibility',purpose:req?.description||'Describe the behaviour this responsibility owns.',boundary:'Define the owned behaviour, inputs, outputs, and exclusions.',owner:req?.owner||'',sourceEvidence:req?.source||'Guidance proposal — confirm against the project brief',groupId:'',requirementIds:req?[req.id]:[],decisionIds:[],relationship:'performed by',layer:'logical',reason:req?req.id+' has a required behaviour. Review whether it needs this responsibility boundary.':'Start with one owned behaviour from the brief, then connect its requirements.',effect:'Add a logical responsibility with stable source references'+(source?' and a link from '+source.id:'. Connect it to a journey step after creation')+'.'};
 }
 if(!suggestions[key])return null;const source=key==='review'?'risk':key==='dedup'?'ledger':'hub',r=responsibility(p)(source),s=suggestions[key];
 const existing=l.responsibilities.find(r=>r.candidateKey===key)||l.assets.find(a=>a.candidateKey===key);if(existing)return {existingId:existing.id,key};
 return {key,source,title:s.title,purpose:s.description,boundary:key==='review'?'Resolve held instructions; release or reject with explicit authority.':key==='dedup'?'Retain the original instruction reference and authoritative result.':'Investigate pending outcomes before any controlled replay.',owner:s.attrs.Owner?.replace(' · proposed','')||'',sourceEvidence:'Illustrative '+(key==='review'?'human review boundary':key==='dedup'?'idempotent receiver':'controlled recovery')+' pattern; confirm with project evidence.',groupId:r?.groupId||'',requirementIds:r?.requirementIds||[],decisionIds:r?.decisionIds||[],relationship:key==='review'?'routes held payments to':key==='dedup'?'checks the original reference in':'realised by',layer:s.layer,reason:s.reason,effect:s.effect};
}
// The chapter's export reads its records in one pass (document-memo.js), so its lookups read one index (round 5).
export function exportLogicalMarkdown(p){return memoPass(p,()=>exportLogicalMarkdownOf(p));}
function exportLogicalMarkdownOf(p){const l=p.logical,{nodes,edges}=logicalGraph(p),byId=firstById(nodes),title=id=>byId.get(id)?.title||id;return '# AIW V5 · '+p.name+'\n\n## Chapter 4 — Logical application\n\nLogical model '+l.version+' · Requirements '+p.contentVersion+' · Quality '+p.quality.version+' · Decisions '+p.decisions.version+'.\n\nSimulated design walkthrough; user confirmation and governance approval remain separate.\n\n'+l.responsibilities.map(r=>`### ${r.ref} · ${r.title}\n\nStable model key: ${r.id} · Revision ${r.revision}\n\n${r.purpose}\n\nOwns: ${r.boundary}\n\nOwner: ${r.owner}\n\nGroup: ${l.groups.find(g=>g.id===r.groupId)?.title||'Ungrouped'}\n\nSource: ${r.source} (${r.origin}) · ${r.confirmed?'User reviewed':'Unconfirmed'}${logicalSourceChanged(p,r)?' · Inputs changed':''}\n\nRequirements: ${r.requirementIds.join(', ')||'Missing'}\n\n${r.requirementGroupIds?.length?'Requirement groups: '+r.requirementGroupIds.join(', ')+'\n\n':''}Quality drivers: ${driversForResponsibility(p,r).map(d=>d.id).join(', ')}\n\nDecisions:\n${decisionsForResponsibility(p,r).map(d=>'- '+d.id+' · '+d.question+' · '+(decisionCurrent(p,d)?'Architect accepted':'Requires review')+' · '+governanceLabel(d,p)).join('\n')||'No decision links'}\n\nImplementation mappings:\n${l.mappings.filter(m=>m.logicalId===r.id).map(m=>'- '+m.id+' → '+title(m.physicalId)+(mappingRole(m)?' · '+MAPPING_ROLES.find(([k])=>k===m.role)[1]:m.open?.role?' · '+openWords(m,'role'):'')+' · '+openWords(m,'scope')+' · '+m.status+(mappingCurrent(p,m)?'':' · Review changed responsibility')+' · Owner: '+openWords(m,'owner')+(m.open?.evidence?' · Evidence: '+openWords(m,'evidence'):'')).join('\n')||'No implementation mapping yet'}\n\n`).join('')+(l.groups.length?'## Responsibility groups\n\n'+l.groups.map(g=>'- '+g.id+' · '+g.title+' · Purpose: '+(openWords(g,'purpose')||'Not recorded')).join('\n')+'\n\n':'')+'## Connected relationships\n\n'+edges.map(e=>'- '+(e.id?connectionCode(e)+(e.id!==connectionCode(e)?' (was '+e.id+')':''):'Reference')+': '+title(e.from)+' → '+title(e.to)+' — '+e.label+(LAYER_KINDS.includes(e.kind)?' · '+CONNECTION_KINDS.find(([k])=>k===e.kind)[1]:'')+(e.open?.condition?' · Condition: '+openWords(e,'condition'):e.condition?' · Condition: '+e.condition:'')).join('\n')+'\n\n## Simulation reviews\n\n'+projectScenarios(p).map(id=>'- '+id+': '+(scenarioCurrent(p,id)?'Reviewed for this model':'Review needed')+' (a simulation)').join('\n')+'\n\n## Open findings\n\n'+(logicalFindings(p).map(f=>'- '+f.level.toUpperCase()+': '+f.title+'. '+f.detail).join('\n')||'No findings under the current rules.')+'\n\n## Chapter 5 handoff\n\n'+(logicalHandoffCurrent(p)?'Current working handoff · '+l.handoff.at+' · '+l.handoff.openFindings+' open findings acknowledged.':'Handoff needs review against the current model and inputs.')+'\n\nGuidance uses project rules; no live bank integration. '+solDisclosure(p,4).line+'\n';}
