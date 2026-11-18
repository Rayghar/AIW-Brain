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
import {EXTENSIONS,extendTable} from './design-extensions.js';

// The object types, one a line: type|label|chapter|level, and an ink only for a type the notation palette has none for
// (each other type's ink is the palette's, notation-palette.js TYPE_INK, set by architecture-model.js, round-2 D2-20).
export const OBJECT_TYPES=Object.fromEntries(`system|System|1|context
module|Responsibility group|4|logical
requirement|Requirement|1|intent
outcome|Outcome|1|intent
actor|Actor|1|context
journey|Journey step|1|intent
task|Process task|4|logical
gateway|Decision gateway|4|logical
event|Process event|4|logical
subprocess|Sub-process|4|logical
dataObject|Process data object|8|data
account|Process account|8|data
claim|Source claim|11|intent
constraint|Constraint|1|intent
assumption|Assumption|1|intent
context|Context|1|context
quality|Quality scenario|2|intent
decision|Decision|3|intent
alternative|Alternative|3|intent
responsibility|Responsibility|4|logical
component|Application component|5|application
capability|Technology capability|6|capability
need|Technology need|6|capability
boundary|Trust boundary|6|protection
technology|Technology realization|7|technology
sharedService|Shared enterprise service|7|technology|#74653c
option|Technology option|7|technology
contract|Interface contract|8|interaction
data|Data definition|8|data
field|Data field|8|data
exchange|Data exchange|8|interaction
party|External participant|8|context
control|Security control|9|protection
threat|Threat|9|protection
risk|Risk|9|protection
environment|Environment|10|deployment
zone|Deployment zone|10|deployment
runtime|Operating plan|10|deployment
instance|Planned placement|10|deployment
path|Runtime path|10|deployment
evidence|Evidence|11|intent
pattern|Applied design reasoning|3|intent
baseline|Frozen baseline|11|context
view|Saved view|11|context`.split('\n').map(x=>{const [type,label,chapter,level,color]=x.split('|');return [type,{label,chapter:+chapter,level,...color&&{color}}];}));

// The record kinds the design packages state join the table (rc44, slice S0: design-extensions.js; a built-in type stays).
extendTable(OBJECT_TYPES,e=>e.objectTypes);
export const label=r=>r.title||r.question||r.name||r.description||r.id;
// A part that encodeURIComponent leaves as it is (letters, digits and - _ . ! ~ * ' ( )) is kept without encoding it: the same key.
const PLAIN=/^[\w.!~*'()-]*$/,keyPart=x=>{const s=String(x??'');return PLAIN.test(s)?s:encodeURIComponent(s);};
export const key=(...parts)=>parts.map(keyPart).join(':');
// A stated relation's id: 'rel:' and the key of its source, type and ends.
const relationKey=(source,type,from,to)=>'rel:'+keyPart(source)+':'+keyPart(type)+':'+keyPart(from)+':'+keyPart(to);

// The record collections of the connected model, in registration order: where each lives in the document, the object
// type of its records (a function where the record says) and the path the object's source names. The model registers
// every collection; the chapter checks read the same table to know a record's type without building the model.
export const RECORD_COLLECTIONS=[
 [p=>p.artefacts,r=>OBJECT_TYPES[r.type]?r.type:'context','artefacts'],
 [p=>processElements(p),r=>r.kind==='data'?'dataObject':r.kind,'process.elements'],[p=>list(p.processModel?.claims).map(c=>({...c,title:c.topic,description:c.statement})),'claim','process.claims'],
 // The rest, each type:chapter.list, read as p.chapter?.list.
 ...`quality:quality.drivers decision:decisions.records module:logical.groups responsibility:logical.responsibilities component:realisation.components
 capability:technology.capabilities need:technology.needs boundary:technology.boundaries technology:technologyRealisation.records
 contract:interfaces.contracts data:interfaces.data party:interfaces.parties control:security.controls threat:security.threats risk:security.risks
 environment:runtime.environments zone:runtime.zones runtime:runtime.plans instance:runtime.placements path:runtime.paths
 evidence:security.evidence evidence:runtime.evidence view:workbench.views`.split(/\s+/).map(x=>{const [type,path]=x.split(':'),[a,b]=path.split('.');return [p=>p[a]?.[b],type,path];})
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
 // The connections of Chapters 4 to 7, each chapter.list read as p.chapter?.list.
 ...Object.fromEntries(['logical.connections','realisation.connections','technology.dependencies','technologyRealisation.connections'].map((source,i)=>{const [a,b]=source.split('.');return [source,{rows:p=>list(p[a]?.[b]),type:connectionType,label:r=>r.label,chapter:4+i}];}))
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
 // Up to the components (recordGraph upto 'component', the driver scope's graph), only what the driver scope's walks read
 // is stated: the requirements that name responsibilities and components, what drivers and decisions bear on, and the
 // mappings; the rest is not worked out.
 const part=upto==='component';
 const linkRefs=(r,source,requirements=true)=>{
  for(const [field,type,inverse] of [['requirementIds','fulfils',true],['driverIds','constrains',true],['decisionIds','justifies',true],['sourceIds','supports',true]])if(requirements||field!=='requirementIds'){const named=list(r[field]);for(const id of field==='requirementIds'?linkedRequirementIds(p,r):named)rel(type,inverse?id:r.id,inverse?r.id:id,{source:source+'.'+(field==='requirementIds'&&!named.includes(id)?'requirementGroupIds':field)});}
 };
 if(!part)for(const g of list(p.logical?.groups))rel('memberOf',g.id,root,{source:'logical.groups'});
 for(const r of list(p.logical?.responsibilities)){if(r.groupId&&!part)rel('memberOf',r.id,r.groupId,{source:'logical.responsibilities.groupId'});linkRefs(r,'logical.responsibilities');}
 if(!part)for(const r of list(p.artefacts))if(r.modelRef)rel('fulfils',r.id,r.modelRef,{source:'artefacts.modelRef'});
 // The relationships a person records as relationships (RECORDED, shared with the chapter checks): Chapter 1's links, then
 // the process flows (a message flow crosses pools and carries a contract; a sequence flow stays inside one).
 if(!part)for(const source of ['relationships','process.transitions'])for(const r of RECORDED[source].rows(p))rel(RECORDED[source].type(r,p),r.from,r.to,{id:r.id,label:RECORDED[source].label(r),attributes:r,source});
 if(!part)for(const e of list(p.processModel?.elements)){
  for(const id of linkedRequirementIds(p,e))rel('motivatedBy',e.id,id,{source:'process.elements.requirementIds'});
  if(e.kind==='account'&&e.authorityId)rel('owns',e.authorityId,e.id,{source:'process.elements.authorityId'});
  // Round 6 (Contract T): a sub-process holds its elements, a boundary event hangs on its task, an external pool runs
  // its elements, a data object stands for a Chapter 8 data definition.
  if(e.parentId)rel('partOf',e.id,e.parentId,{source:'process.elements.parentId'});
  if(e.attachedTo)rel('attachedTo',e.id,e.attachedTo,{source:'process.elements.attachedTo'});
  if(e.partyId)rel('inPool',e.partyId,e.id,{source:'process.elements.partyId'});
  if(e.kind==='data'&&e.dataId)rel('describes',e.id,e.dataId,{source:'process.elements.dataId'});
 }
 if(!part)for(const c of list(p.processModel?.claims)){const path=processTransitions(p).find(t=>t.id===c.subjectId);rel('asserts',c.id,path?path.from:c.subjectId,{source:'process.claims',via:path?[path.id]:[],attributes:{topic:c.topic,statement:c.statement,source:c.source,sourceLocator:c.sourceLocator,status:c.status,transitionId:path?.id}});}
 if(!part)for(const group of processConflicts(p))for(let i=1;i<group.length;i++)rel('conflictsWith',group[0].id,group[i].id,{source:'process.claims',attributes:{topic:group[0].topic,status:'Unresolved'}});
 if(!part)for(const j of list(p.artefacts).filter(a=>a.type==='journey'))for(const requirementId of list(p.relationships).filter(r=>r.from===j.id&&r.kind==='requires').map(r=>r.to)){const requirement=p.artefacts.find(a=>a.id===requirementId);if(requirement?.modelRef)rel('implementedBy',j.id,requirement.modelRef,{source:'process.requirement.modelRef',derived:true,via:[requirementId]});}
 for(const q of list(p.quality?.drivers)){linkRefs(q,'quality.drivers',!part);for(const id of list(q.responsibilityIds))rel('constrains',q.id,id,{source:'quality.drivers.responsibilityIds'});for(const id of list(q.componentIds))rel('constrains',q.id,id,{source:'quality.drivers.componentIds'});}
 for(const d of list(p.decisions?.records)){
  linkRefs(d,'decisions.records',!part);if(!part)for(const a of list(d.alternatives)){const id=d.id+'/alternative/'+a.id;add({...a,title:a.title||a.name,id},'alternative','decisions.records.'+d.id+'.alternatives');rel('considers',d.id,id,{source:'decisions.alternatives',attributes:{selected:d.selectedAlternativeId===a.id||d.selected===a.id}});}
 }
 for(const r of list(p.logical?.mappings))rel('realizedBy',r.logicalId,r.physicalId,{id:r.id,label:'realized by',attributes:r,source:'logical.mappings'});
 if(!part)for(const source of ['logical.connections','realisation.connections','technology.dependencies','technologyRealisation.connections'])for(const r of RECORDED[source].rows(p))rel(RECORDED[source].type(r,p),r.from,r.to,{id:r.id,label:RECORDED[source].label(r),attributes:r,source});
 // rc.10.73.42 (D9): a data definition has one owner, the authority Chapter 8 names (below); a component's own data list is
 // data it uses, never a second ownership edge.
 for(const c of list(p.realisation?.components)){linkRefs(c,'realisation.components');if(!part)for(const id of list(c.dataIds))rel('uses',c.id,id,{source:'realisation.components.dataIds'});}
 // A walk up to the components reads nothing stated after them (recordGraph upto).
 if(part)return;
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
 // The records and typed relations each design package states from the document, in the packages' id order (rc44, slice
 // S0). A package's record is registered only under an id nothing holds yet, and `rel` never replaces a relation, so a
 // package only adds.
 for(const e of EXTENSIONS)e.records?.(p,(r,type,source)=>objects.has(r.id)||add(r,type,source),rel);
}

// The records in registration order, as the connected model (architecture-model.js) and the record graph register them
// alike: the system (`root`, its record), the record collections (up to the components on the driver scope's graph,
// `part`), what `between` adds, the declared context objects, the reference graph's nodes no record carries (`nodes`,
// each read by `node`) and, on the whole graph, the co-authoring sources. The order is the model's signature order.
export function registerRecords(p,add,objects,root,nodes,node,{part=false,between}={}){
 add(root,'system','project');
 for(const [rows,type,path] of part?RECORD_COLLECTIONS.slice(0,COMPONENTS+1):RECORD_COLLECTIONS)list(rows(p)).forEach((r,i)=>add(r,typeof type==='function'?type(r):type,path+'['+i+']'));
 between?.();
 for(const o of list(p.modelContext?.objects))if(!objects.has(o.id))add({...o.attributes,id:o.id,title:o.title},o.type,'model.context.'+o.id);
 for(const n of nodes)if(!objects.has(n.id))add(node(n),CONTEXT_LAYER_TYPE[n.layer]||'context','model.context.'+n.id);
 if(!part)for(const s of list(p.coauthoring?.sources)){const v=s.versions?.at(-1)||{};add({...v,id:s.id,title:v.title||s.id},'evidence','coauthoring.sources.'+s.id);}
}
// The model's records and relations without its picture (rc.10.73.42, D7): the records registered as the model registers
// them (with the declared context objects and the reference graph's base nodes, as recordTypes reads them), the relations
// of the one emitter (recordRelations), resolved by the model's rule (both ends registered), each end's relations listed;
// no drawn graph, typing or digest. What the trace kernel (trace-kernel.js) walks. Once per settled document or pass.
// `upto` 'component' is the driver scope's graph (driver-scope.js, which every chapter check and many commands read, so
// it does not pay for the whole graph): the records of the collections up to the components and the reference graph's
// base nodes, and only what a walk from drivers, responsibilities and components up to the components reads — the
// requirements that name responsibilities and components (fulfils), what drivers and decisions bear on (constrains,
// justifies) and the mappings (realizedBy). A walk from a requirement or its context reads the whole graph.
const UPTO_COMPONENT=new Set(['fulfils','constrains','justifies','realizedBy']),COMPONENTS=RECORD_COLLECTIONS.findIndex(([,,path])=>path==='realisation.components');
// A relation stated without attributes or a path shares one frozen empty value: the walks only read them.
const NO_ATTRIBUTES=Object.freeze({}),NO_VIA=Object.freeze([]),NO_OPTIONS=Object.freeze({});
export const recordGraph=perDocument((p,upto)=>{
 const objects=new Map(),relationships=new Map(),root='system:'+p.id,part=upto==='component';
 const add=(r,type,source,id=r.id)=>{if(!id)return null;const prior=objects.get(id);if(prior&&prior.source!==source)return prior;const obj={id,type,title:label(r)||id,ref:r.ref||r.id||id,owner:r.owner||'',source,attributes:{},record:r};objects.set(id,obj);return obj;};
 const rel=(type,from,to,{id,label:meaning,attributes=NO_ATTRIBUTES,source='projection',derived=false,via=NO_VIA}=NO_OPTIONS)=>{
  if(!from||!to||part&&(!UPTO_COMPONENT.has(type)||!objects.has(from)||!objects.has(to)))return;
  id=id||relationKey(source,type,from,to);
  if(relationships.has(id)){const old=relationships.get(id);if(old.type===type&&old.from===from&&old.to===to)return;id=key(source,id,type,from,to);}
  relationships.set(id,{id,type,from,to,label:meaning||type,attributes,source,derived,via});
 };
 registerRecords(p,add,objects,{id:root,title:p.name},projectNodes(p),n=>({...n}),{part});
 recordRelations(p,{add,rel,objects,root,upto});
 const resolved=[...relationships.values()].filter(e=>objects.has(e.from)&&objects.has(e.to)),outgoing=new Map(),incoming=new Map();
 const push=(m,id,e)=>{const xs=m.get(id);if(xs)xs.push(e);else m.set(id,[e]);};
 for(const e of resolved){push(outgoing,e.from,e);push(incoming,e.to,e);}
 return {projectId:p.id,root,objects,relationships:resolved,outgoing,incoming};
},upto=>upto||'');
