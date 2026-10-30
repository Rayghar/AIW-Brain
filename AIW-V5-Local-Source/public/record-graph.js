// The canonical design graph's records and relations as the records state them (rc.10.73.42, D7): the object types,
// the record collections in registration order, the relationships people record, and the one emitter of every
// relation a record states (recordRelations). The connected model (architecture-model.js) draws its picture over these;
// the trace kernel (trace-kernel.js) walks the record graph (recordGraph) without drawing it. Kept apart from the model
// so a reader of traces does not load the model's picture. Pure; nothing here changes the project.
import {projectNodes} from './model-scope.js';
import {processElements,processTransitions,processConflicts} from './process-model.js';
import {perDocument,findIn} from './document-memo.js';
import {list} from './util.js';
import {linkedRequirementIds} from './requirement-links.js';
import {enterpriseReferences} from './enterprise-references.js';

export const OBJECT_TYPES={
 system:{label:'System',chapter:1,level:'context',color:'#234e42'},
 module:{label:'Responsibility group',chapter:4,level:'logical',color:'#285e4b'},
 requirement:{label:'Requirement',chapter:1,level:'intent',color:'#587448'},
 outcome:{label:'Outcome',chapter:1,level:'intent',color:'#75618c'},
 actor:{label:'Actor',chapter:1,level:'context',color:'#687b66'},
 journey:{label:'Journey step',chapter:1,level:'intent',color:'#947334'},
 task:{label:'Process task',chapter:4,level:'logical',color:'#376857'},
 gateway:{label:'Decision gateway',chapter:4,level:'logical',color:'#9c7540'},
 event:{label:'Process event',chapter:4,level:'logical',color:'#688199'},
 subprocess:{label:'Sub-process',chapter:4,level:'logical',color:'#376857'},
 dataObject:{label:'Process data object',chapter:8,level:'data',color:'#80668d'},
 account:{label:'Process account',chapter:8,level:'data',color:'#80668d'},
 claim:{label:'Source claim',chapter:11,level:'intent',color:'#916e5c'},
 constraint:{label:'Constraint',chapter:1,level:'intent',color:'#976941'},
 assumption:{label:'Assumption',chapter:1,level:'intent',color:'#976941'},
 context:{label:'Context',chapter:1,level:'context',color:'#697d80'},
 quality:{label:'Quality scenario',chapter:2,level:'intent',color:'#987431'},
 decision:{label:'Decision',chapter:3,level:'intent',color:'#805d83'},
 alternative:{label:'Alternative',chapter:3,level:'intent',color:'#805d83'},
 responsibility:{label:'Responsibility',chapter:4,level:'logical',color:'#286954'},
 component:{label:'Application component',chapter:5,level:'application',color:'#35667b'},
 capability:{label:'Technology capability',chapter:6,level:'capability',color:'#69773a'},
 need:{label:'Technology need',chapter:6,level:'capability',color:'#69773a'},
 boundary:{label:'Trust boundary',chapter:6,level:'protection',color:'#936180'},
 technology:{label:'Technology realization',chapter:7,level:'technology',color:'#74653c'},
 sharedService:{label:'Shared enterprise service',chapter:7,level:'technology',color:'#74653c'},
 option:{label:'Technology option',chapter:7,level:'technology',color:'#74653c'},
 contract:{label:'Interface contract',chapter:8,level:'interaction',color:'#9b6643'},
 data:{label:'Data definition',chapter:8,level:'data',color:'#776097'},
 field:{label:'Data field',chapter:8,level:'data',color:'#776097'},
 exchange:{label:'Data exchange',chapter:8,level:'interaction',color:'#9b6643'},
 party:{label:'External participant',chapter:8,level:'context',color:'#687c82'},
 control:{label:'Security control',chapter:9,level:'protection',color:'#99677e'},
 threat:{label:'Threat',chapter:9,level:'protection',color:'#a06450'},
 risk:{label:'Risk',chapter:9,level:'protection',color:'#a06450'},
 environment:{label:'Environment',chapter:10,level:'deployment',color:'#637f9c'},
 zone:{label:'Deployment zone',chapter:10,level:'deployment',color:'#637f9c'},
 runtime:{label:'Operating plan',chapter:10,level:'deployment',color:'#47748a'},
 instance:{label:'Planned placement',chapter:10,level:'deployment',color:'#47748a'},
 path:{label:'Runtime path',chapter:10,level:'deployment',color:'#47748a'},
 evidence:{label:'Evidence',chapter:11,level:'intent',color:'#778478'},
 pattern:{label:'Applied design reasoning',chapter:3,level:'intent',color:'#805d83'},
 baseline:{label:'Frozen baseline',chapter:11,level:'context',color:'#697d80'},
 view:{label:'Saved view',chapter:11,level:'context',color:'#697d80'}
};

export const label=r=>r.title||r.question||r.name||r.description||r.id;
export const key=(...parts)=>parts.map(x=>encodeURIComponent(String(x??''))).join(':');

// The record collections of the connected model, in registration order: where each lives in the document, the object
// type of its records (a function where the record says) and the path the object's source names. The model registers
// every collection; the chapter checks read the same table to know a record's type without building the model.
export const RECORD_COLLECTIONS=[
 [p=>p.artefacts,r=>OBJECT_TYPES[r.type]?r.type:'context','artefacts'],
 [p=>processElements(p),r=>r.kind==='data'?'dataObject':r.kind,'process.elements'],[p=>list(p.processModel?.claims).map(c=>({...c,title:c.topic,description:c.statement})),'claim','process.claims'],
 [p=>p.quality?.drivers,'quality','quality.drivers'],[p=>p.decisions?.records,'decision','decisions.records'],
 [p=>p.logical?.groups,'module','logical.groups'],[p=>p.logical?.responsibilities,'responsibility','logical.responsibilities'],
 [p=>p.realisation?.components,'component','realisation.components'],
 [p=>p.technology?.capabilities,'capability','technology.capabilities'],[p=>p.technology?.needs,'need','technology.needs'],[p=>p.technology?.boundaries,'boundary','technology.boundaries'],
 [p=>p.technologyRealisation?.records,'technology','technologyRealisation.records'],
 [p=>p.interfaces?.contracts,'contract','interfaces.contracts'],[p=>p.interfaces?.data,'data','interfaces.data'],[p=>p.interfaces?.parties,'party','interfaces.parties'],
 [p=>p.security?.controls,'control','security.controls'],[p=>p.security?.threats,'threat','security.threats'],[p=>p.security?.risks,'risk','security.risks'],
 [p=>p.runtime?.environments,'environment','runtime.environments'],[p=>p.runtime?.zones,'zone','runtime.zones'],[p=>p.runtime?.plans,'runtime','runtime.plans'],[p=>p.runtime?.placements,'instance','runtime.placements'],[p=>p.runtime?.paths,'path','runtime.paths'],
 [p=>p.security?.evidence,'evidence','security.evidence'],[p=>p.runtime?.evidence,'evidence','runtime.evidence'],
 [p=>p.workbench?.views,'view','workbench.views']
];
// The relationships a person records as relationships (round 6, Contract T): Chapter 1's links between artefacts, the
// process flows, and the connections of Chapters 4 to 7 — each source with its rows, the relationship type its records
// carry (as the model registers it), its label and the chapter that owns it. A relationship a record implies through one
// of its fields (a requirement id, a mapping, an exchange) is the record's, checked by its own chapter, so it is not here.
// Round 12 (GR-CMP-09): a responsibility serves or realises a journey step. The kind is read with the responsibility as
// the ArchiMate source whichever way the connection was drawn (a component serves or realizes a business process, never
// the reverse): a step drawn to its responsibility reads as served or realized by it.
const LAYERED={serves:['serves','uses'],realises:['realises','realizedBy']};
const responsibilityEnd=(p,id)=>!!findIn(p,'model:responsibility-end',()=>list(p?.logical?.responsibilities),id);
const connectionType=(r,p)=>r.kind==='flow'?'interaction':LAYERED[r.kind]?LAYERED[r.kind][responsibilityEnd(p,r.to)&&!responsibilityEnd(p,r.from)?1:0]:r.type||'dependency';
export const RECORDED={
 relationships:{rows:p=>list(p.relationships),type:r=>r.kind||'related',label:()=>undefined,chapter:1},
 'process.transitions':{rows:p=>processTransitions(p),type:t=>t.kind==='message'?'message':'sequence',label:t=>t.label,chapter:1},
 'logical.connections':{rows:p=>list(p.logical?.connections),type:connectionType,label:r=>r.label,chapter:4},
 'realisation.connections':{rows:p=>list(p.realisation?.connections),type:connectionType,label:r=>r.label,chapter:5},
 'technology.dependencies':{rows:p=>list(p.technology?.dependencies),type:connectionType,label:r=>r.label,chapter:6},
 'technologyRealisation.connections':{rows:p=>list(p.technologyRealisation?.connections),type:connectionType,label:r=>r.label,chapter:7}
};
// The paths of the record collections, in registration order (round 26, D-26-09): chapter-records.js reads a chapter's
// record set from the objects these collections register, never from projections, so every count agrees.
export const RECORD_COLLECTION_PATHS=RECORD_COLLECTIONS.map(([,,path])=>path);
export const RECORDED_RELATIONSHIP_SOURCES=Object.fromEntries(Object.entries(RECORDED).map(([source,x])=>[source,x.chapter]));
// The object type of a node the reference graph (model.js) draws in a layer, when no record of its own carries it.
export const CONTEXT_LAYER_TYPE={process:'journey',logical:'responsibility',physical:'component',technology:'capability',data:'data',interface:'contract',security:'control',deployment:'zone'};

// The relations the records state, through their fields and as the relationships people record, with the nested parts
// they hold (alternatives, options, exchanges, fields, applied design reasoning, shared services): one emitter, read by
// the model below and by the record graph the trace kernel walks (recordGraph; trace-kernel.js, rc.10.73.42 D7), so both
// hold the same relations in the same order. `add` registers a nested part, `rel` takes a relation, `objects` is what
// is registered so far and `root` is the system's object.
export function recordRelations(p,{add,rel,objects,root,issues=[],upto=null}){
 // A record that links requirement groups fulfils their members as it fulfils the requirements it names (round 12, DM-02).
 const linkRefs=(r,source)=>{
  for(const [field,type,inverse] of [['requirementIds','fulfils',true],['driverIds','constrains',true],['decisionIds','justifies',true],['sourceIds','supports',true]]){const named=list(r[field]);for(const id of field==='requirementIds'?linkedRequirementIds(p,r):named)rel(type,inverse?id:r.id,inverse?r.id:id,{source:source+'.'+(field==='requirementIds'&&!named.includes(id)?'requirementGroupIds':field)});}
 };
 for(const g of list(p.logical?.groups))rel('memberOf',g.id,root,{source:'logical.groups'});
 for(const r of list(p.logical?.responsibilities)){if(r.groupId)rel('memberOf',r.id,r.groupId,{source:'logical.responsibilities.groupId'});linkRefs(r,'logical.responsibilities');}
 for(const r of list(p.artefacts))if(r.modelRef)rel('fulfils',r.id,r.modelRef,{source:'artefacts.modelRef'});
 // The relationships a person records as relationships (RECORDED, shared with the chapter checks): Chapter 1's links, then
 // the process flows (a message flow crosses pools and carries a contract; a sequence flow stays inside one).
 for(const source of ['relationships','process.transitions'])for(const r of RECORDED[source].rows(p))rel(RECORDED[source].type(r,p),r.from,r.to,{id:r.id,label:RECORDED[source].label(r),attributes:r,source});
 for(const e of list(p.processModel?.elements)){
  for(const id of linkedRequirementIds(p,e))rel('motivatedBy',e.id,id,{source:'process.elements.requirementIds'});
  if(e.kind==='account'&&e.authorityId)rel('owns',e.authorityId,e.id,{source:'process.elements.authorityId'});
  // Round 6 (Contract T): a sub-process holds its elements, a boundary event hangs on its task, an external pool runs
  // its elements, a data object stands for a Chapter 8 data definition.
  if(e.parentId)rel('partOf',e.id,e.parentId,{source:'process.elements.parentId'});
  if(e.attachedTo)rel('attachedTo',e.id,e.attachedTo,{source:'process.elements.attachedTo'});
  if(e.partyId)rel('inPool',e.partyId,e.id,{source:'process.elements.partyId'});
  if(e.kind==='data'&&e.dataId)rel('describes',e.id,e.dataId,{source:'process.elements.dataId'});
 }
 for(const c of list(p.processModel?.claims)){const path=processTransitions(p).find(t=>t.id===c.subjectId);rel('asserts',c.id,path?path.from:c.subjectId,{source:'process.claims',via:path?[path.id]:[],attributes:{topic:c.topic,statement:c.statement,source:c.source,sourceLocator:c.sourceLocator,status:c.status,transitionId:path?.id}});}
 for(const group of processConflicts(p))for(let i=1;i<group.length;i++)rel('conflictsWith',group[0].id,group[i].id,{source:'process.claims',attributes:{topic:group[0].topic,status:'Unresolved'}});
 for(const j of list(p.artefacts).filter(a=>a.type==='journey'))for(const requirementId of list(p.relationships).filter(r=>r.from===j.id&&r.kind==='requires').map(r=>r.to)){const requirement=p.artefacts.find(a=>a.id===requirementId);if(requirement?.modelRef)rel('implementedBy',j.id,requirement.modelRef,{source:'process.requirement.modelRef',derived:true,via:[requirementId]});}
 for(const q of list(p.quality?.drivers)){linkRefs(q,'quality.drivers');for(const id of list(q.responsibilityIds))rel('constrains',q.id,id,{source:'quality.drivers.responsibilityIds'});for(const id of list(q.componentIds))rel('constrains',q.id,id,{source:'quality.drivers.componentIds'});}
 for(const d of list(p.decisions?.records)){
  linkRefs(d,'decisions.records');for(const a of list(d.alternatives)){const id=d.id+'/alternative/'+a.id;add({...a,title:a.title||a.name,id},'alternative','decisions.records.'+d.id+'.alternatives');rel('considers',d.id,id,{source:'decisions.alternatives',attributes:{selected:d.selectedAlternativeId===a.id||d.selected===a.id}});}
 }
 for(const r of list(p.logical?.mappings))rel('realizedBy',r.logicalId,r.physicalId,{id:r.id,label:'realized by',attributes:r,source:'logical.mappings'});
 for(const source of ['logical.connections','realisation.connections','technology.dependencies','technologyRealisation.connections'])for(const r of RECORDED[source].rows(p))rel(RECORDED[source].type(r,p),r.from,r.to,{id:r.id,label:RECORDED[source].label(r),attributes:r,source});
 for(const c of list(p.realisation?.components)){linkRefs(c,'realisation.components');for(const id of list(c.dataIds))rel('owns',c.id,id,{source:'realisation.components.dataIds'});}
 // A walk up to the components reads nothing stated after them (recordGraph upto).
 if(upto==='component')return;
 for(const n of list(p.technology?.needs)){
  const obj=objects.get(n.id);if(obj){obj.title=n.description||n.category+' need';obj.owner=objects.get(n.applicationId)?.owner||'';}
  rel('hasNeed',n.applicationId,n.id,{source:'technology.needs'});
 }
 for(const m of list(p.technology?.mappings)){
  const need=p.technology.needs.find(n=>n.id===m.needId);
  rel('metBy',m.needId,m.capabilityId,{id:m.id,attributes:m,source:'technology.mappings'});
  if(need)rel('requires',need.applicationId,m.capabilityId,{id:'support:'+m.id,attributes:{scope:m.scope,criticality:need.criticality},source:'technology.mappings',derived:true,via:[need.id,m.id]});
 }
 for(const [applicationId,boundaryId] of Object.entries(p.technology?.applicationBoundaries||{}))if(boundaryId)rel('withinBoundary',applicationId,boundaryId,{source:'technology.applicationBoundaries'});
 for(const c of list(p.technology?.capabilities)){linkRefs(c,'technology.capabilities');if(c.boundaryId)rel('withinBoundary',c.id,c.boundaryId,{source:'technology.capabilities.boundaryId'});}
 for(const m of list(p.technologyRealisation?.mappings))rel('implementedBy',m.capabilityId,m.realizationId,{id:m.id,attributes:m,source:'technologyRealisation.mappings'});
 for(const t of list(p.technologyRealisation?.records)){
  const selected=t.options?.find(o=>o.id===t.selectedOptionId),obj=objects.get(t.id);
  if(obj){obj.attributes.selectedProduct=selected?.product||selected?.title||'';obj.attributes.selectionRecorded=!!t.recorded;}
  for(const o of list(t.options)){const id=t.id+'/option/'+o.id;add({...o,id},'option','technologyRealisation.records.'+t.id+'.options');rel('considers',t.id,id,{source:'technologyRealisation.options',attributes:{selected:t.selectedOptionId===o.id,recorded:!!t.recorded}});}
 }
 for(const c of list(p.interfaces?.contracts)){
  linkRefs(c,'interfaces.contracts');rel('provides',c.to,c.id,{source:'interfaces.contracts.to'});rel('uses',c.from,c.id,{source:'interfaces.contracts.from'});
  rel('interaction',c.from,c.to,{id:'contract:'+c.id,label:c.title,source:'interfaces.contracts',derived:true,via:[c.id],attributes:{contractId:c.id,protocol:c.protocol,operation:c.operation,kind:c.kind,failure:c.failurePolicy,retry:c.retryPolicy,authorization:c.authorization}});
  for(const x of list(c.exchanges)){const id=c.id+'/exchange/'+x.id;add({...x,id,title:(x.role||'Payload')+' · '+(objects.get(x.dataId)?.title||x.dataId)},'exchange','interfaces.contracts.'+c.id+'.exchanges');rel('exchanges',c.id,x.dataId,{id:'payload:'+id,source:'interfaces.contracts.exchanges',attributes:x,via:[id]});rel('describes',id,x.dataId,{source:'interfaces.contracts.exchanges'});}
 }
 for(const d of list(p.interfaces?.data)){
  if(d.authorityId)rel('owns',d.authorityId,d.id,{source:'interfaces.data.authorityId'});
  for(const f of list(d.fields)){const id=d.id+'/field/'+f.id;add({...f,id,title:f.name},'field','interfaces.data.'+d.id+'.fields');rel('partOf',id,d.id,{source:'interfaces.data.fields'});}
 }
 for(const r of list(p.interfaces?.lineage))rel('transforms',r.from||r.sourceDataId,r.to||r.targetDataId,{id:r.id,attributes:r,source:'interfaces.lineage'});
 for(const c of list(p.security?.controls)){linkRefs(c,'security.controls');for(const id of list(c.targetIds))rel('protects',c.id,id,{source:'security.controls.targetIds'});for(const id of list(c.threatIds))rel('mitigates',c.id,id,{source:'security.controls.threatIds'});}
 for(const t of list(p.security?.threats)){linkRefs(t,'security.threats');for(const id of list(t.targetIds))rel('threatens',t.id,id,{source:'security.threats.targetIds'});}
 for(const z of list(p.runtime?.zones)){rel('partOf',z.id,z.environmentId,{source:'runtime.zones.environmentId'});if(z.boundaryId)rel('withinBoundary',z.id,z.boundaryId,{source:'runtime.zones.boundaryId'});}
 for(const plan of list(p.runtime?.plans)){rel('operatedAs',plan.assetId,plan.id,{source:'runtime.plans.assetId'});rel('inEnvironment',plan.id,plan.environmentId,{source:'runtime.plans.environmentId'});for(const id of list(plan.controlIds))rel('enforces',plan.id,id,{source:'runtime.plans.controlIds'});}
 for(const placement of list(p.runtime?.placements)){
  const plan=objects.get(placement.planId),zone=objects.get(placement.zoneId),obj=objects.get(placement.id);
  if(obj){obj.title=(plan?.title||placement.planId)+' · '+(placement.role||'placement');obj.description=placement.basis||'';obj.attributes.zone=zone?.title||placement.zoneId;obj.owner=plan?.owner||'';}
  rel('placedAs',placement.planId,placement.id,{source:'runtime.placements.planId'});rel('locatedIn',placement.id,placement.zoneId,{source:'runtime.placements.zoneId'});
 }
 for(const r of list(p.runtime?.paths)){rel('realizesContract',r.id,r.contractId,{source:'runtime.paths.contractId'});rel('inEnvironment',r.id,r.environmentId,{source:'runtime.paths.environmentId'});}
 // Round 12 (DM-02, DM-03): a record of Chapters 6 to 10 that names requirements or requirement groups of its own fulfils
 // them, read one way (requirement-links.js); capabilities, contracts, controls and threats are linked above.
 for(const [rows,source] of [[p.technology?.needs,'technology.needs'],[p.technologyRealisation?.records,'technologyRealisation.records'],[p.interfaces?.data,'interfaces.data'],[p.interfaces?.parties,'interfaces.parties'],[p.runtime?.plans,'runtime.plans'],[p.runtime?.paths,'runtime.paths']])for(const r of list(rows))if(list(r.requirementIds).length||list(r.requirementGroupIds).length)for(const id of linkedRequirementIds(p,r))rel('fulfils',id,r.id,{source:source+'.'+(list(r.requirementIds).includes(id)?'requirementIds':'requirementGroupIds')});
 for(const e of list(p.coauthoring?.links))if(e.sourceId&&e.objectId)rel('supports',e.sourceId,e.objectId,{id:e.id,source:'coauthoring.links',attributes:e});
 for(const name of ['security','runtime'])for(const e of list(p[name]?.evidence))for(const field of ['controlId','threatId','planId','objectId','targetId'])if(e[field])rel('evidences',e.id,e[field],{source:name+'.evidence.'+field});
 for(const t of list(p.coauthoring?.designTasks)){if(t.kind!=='architecture')continue;add({...t,title:t.title||t.topic||t.id},'pattern','coauthoring.designTasks.'+t.id);if(t.requirementId)rel('addresses',t.id,t.requirementId,{source:'coauthoring.designTasks'});if(t.driverId)rel('assesses',t.id,t.driverId,{source:'coauthoring.designTasks'});for(const id of [...new Set([...(t.applied?.recordIds||[]),...(t.applied?.records||[]).map(r=>r.id),...['caller','processor','store','queue','relay','consumer'].map(role=>t.answers?.[role+'Id']),t.answers?.dataId,t.applied?.decisionId].filter(Boolean))])if(objects.has(id))rel('scopes',t.id,id,{source:'coauthoring.designTasks'});}
 for(const v of list(p.workbench?.views)){if(v.exploration?.baselineId)rel('framesBaseline',v.id,'baseline:'+v.exploration.baselineId,{source:'workbench.views',attributes:{objectId:v.objectId,exploration:v.exploration}});else if(v.objectId)rel('frames',v.id,v.objectId,{source:'workbench.views'});}
 const sharedDependencies=new Map();for(const use of enterpriseReferences(p)){const group=sharedDependencies.get(use.identity)||[];group.push(use);sharedDependencies.set(use.identity,group);}
 for(const [identity,uses] of sharedDependencies){
  const use=uses[0],values=key=>[...new Set(uses.map(u=>u.asset?.[key]).filter(Boolean))],single=key=>values(key).length===1?values(key)[0]:'',current=uses.every(u=>u.current);
  add({id:identity,title:use.title,purpose:single('boundary')||'Service contracts vary between declared dependencies; inspect each consumer link.',owner:single('owner'),status:current?'Current declarations':'Dependency review required',organizationId:use.organizationId,entryId:use.entryId,serviceType:single('type'),serviceVersions:values('version'),releases:[...new Set(uses.map(u=>u.releaseId))],dependencyIds:uses.map(u=>u.id),lifecycle:single('lifecycle'),interfaceReference:single('interfaceReference'),failureDomain:single('failureDomain'),authority:use.authority},'sharedService','workbench.guidanceUses');
  for(const use of uses){
  rel('dependsOn',use.targetId,use.identity,{id:use.id,label:use.critical?'critically depends on':'depends on',source:'workbench.guidanceUses',attributes:use});
  if(!use.current)issues.push({kind:'enterprise-dependency',id:use.id,from:use.targetId,to:use.identity,detail:use.reasons.join(' ')||use.state});
 }
 }
 // Preserve declared context edges not represented by a richer domain record.
 for(const e of list(p.modelContext?.relationships))rel(e.type,e.from,e.to,e);
}

// The model's records and relations without its picture (rc.10.73.42, D7): the records registered as the model registers
// them (with the declared context objects and the reference graph's base nodes, as recordTypes reads them), the relations
// of the one emitter (recordRelations), resolved by the model's rule (both ends registered), each end's relations listed;
// no drawn graph, typing or digest. What the trace kernel (trace-kernel.js) walks. Once per settled document or pass.
// `upto` 'component' keeps only what a walk up to the component layer reads — the records of the collections up to the
// components, the reference graph's base nodes, and the relations between them a requirement, a driver, a decision, a
// mapping, a Chapter 1 relationship or a Chapter 4 connection states: the driver scope's (driver-scope.js), which every
// chapter check reads, so it does not pay for the whole graph.
const UPTO_COMPONENT=new Set(['fulfils','constrains','justifies','realizedBy']),COMPONENTS=RECORD_COLLECTIONS.findIndex(([,,path])=>path==='realisation.components');
export const recordGraph=perDocument((p,upto)=>{
 const objects=new Map(),relationships=new Map(),root='system:'+p.id,part=upto==='component';
 const add=(r,type,source,id=r.id)=>{if(!id)return null;const prior=objects.get(id);if(prior&&prior.source!==source)return prior;const obj={id,type,title:label(r)||id,ref:r.ref||r.id||id,owner:r.owner||'',source,attributes:{},record:r};objects.set(id,obj);return obj;};
 const rel=(type,from,to,{id,label:meaning,attributes={},source='projection',derived=false,via=[]}={})=>{
  if(!from||!to||part&&(!UPTO_COMPONENT.has(type)&&source!=='relationships'&&source!=='logical.connections'||!objects.has(from)||!objects.has(to)))return;
  id=id||'rel:'+key(source,type,from,to);
  if(relationships.has(id)){const old=relationships.get(id);if(old.type===type&&old.from===from&&old.to===to)return;id=key(source,id,type,from,to);}
  relationships.set(id,{id,type,from,to,label:meaning||type,attributes,source,derived,via});
 };
 add({id:root,title:p.name},'system','project');
 for(const [rows,type,path] of part?RECORD_COLLECTIONS.slice(0,COMPONENTS+1):RECORD_COLLECTIONS)list(rows(p)).forEach((r,i)=>add(r,typeof type==='function'?type(r):type,path+'['+i+']'));
 for(const o of list(p.modelContext?.objects))if(!objects.has(o.id))add({...o.attributes,id:o.id,title:o.title},o.type,'model.context.'+o.id);
 for(const n of projectNodes(p))if(!objects.has(n.id))add({...n},CONTEXT_LAYER_TYPE[n.layer]||'context','model.context.'+n.id);
 if(!part)for(const s of list(p.coauthoring?.sources)){const v=s.versions?.at(-1)||{};add({...v,id:s.id,title:v.title||s.id},'evidence','coauthoring.sources.'+s.id);}
 recordRelations(p,{add,rel,objects,root,upto});
 const resolved=[...relationships.values()].filter(e=>objects.has(e.from)&&objects.has(e.to)),outgoing=new Map(),incoming=new Map();
 for(const id of objects.keys()){outgoing.set(id,[]);incoming.set(id,[]);}
 for(const e of resolved){outgoing.get(e.from).push(e);incoming.get(e.to).push(e);}
 return {projectId:p.id,root,objects,relationships:resolved,outgoing,incoming};
},upto=>upto||'');
