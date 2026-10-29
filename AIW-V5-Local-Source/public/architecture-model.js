import {logicalGraph} from './logical-domain.js';
import {projectNodes} from './model-scope.js';
import {digest} from './brain-integrity.js';
import {processElements,processTransitions,processConflicts,processSourceQuestions} from './process-model.js';
import {TYPE_INK, archimateOf, archimateTypeOf} from './notation-palette.js';
import {perDocument,firstById,memoOff,findIn} from './document-memo.js';
import {list} from './util.js';
import {linkedRequirementIds} from './requirement-links.js';
import {enterpriseReferences} from './enterprise-references.js';

// A versioned semantic projection of the existing project. Domain commands remain
// the only writers of architecture facts; visual occurrences never create facts.
export const MODEL_SCHEMA='aiw.architecture/1';
export const CONCERNS=[
 ['structure','Structure','Modules and their responsibilities'],
 ['process','Process','Follow the same journey steps through decisions, outcomes and ownership'],
 ['realization','Realization','Follow what implements and supports the design'],
 ['behaviour','Behaviour','Trace exchanges and their contracts'],
 ['data','Data','Ownership, exchanges and lineage'],
 ['security','Protection','Threats, controls and trust boundaries'],
 ['deployment','Deployment','Operating plans, placements and failure domains'],
 ['rationale','Rationale','Requirements, quality scenarios and decisions']
];
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
// One ink per record type everywhere (perspectives, anatomy, chapter maps, Diagram): the notation palette is the source (round-2 D2-20).
for(const [type,t] of Object.entries(OBJECT_TYPES))if(TYPE_INK[type])t.color=TYPE_INK[type];

const safe=v=>JSON.parse(JSON.stringify(v??{},(k,x)=>['history','sourceSnapshot','sourceSnapshots','generation','baselineSource'].includes(k)?undefined:x));
const label=r=>r.title||r.question||r.name||r.description||r.id;
const key=(...parts)=>parts.map(x=>encodeURIComponent(String(x??''))).join(':');
export const objectStatus=r=>r.origin==='reference'&&!r.confirmed?'Illustrative':r.confirmed?'User-confirmed':r.review?'Review recorded':r.status||r.state||'Working definition';
const technical=['fulfils','realizedBy','requires','implementedBy','operatedAs','placedAs','locatedIn'];

// The record collections of the connected model, in registration order: where each lives in the document, the object
// type of its records (a function where the record says) and the path the object's source names. The model registers
// every collection; the chapter checks read the same table to know a record's type without building the model.
const RECORD_COLLECTIONS=[
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
const RECORDED={
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
const CONTEXT_LAYER_TYPE={process:'journey',logical:'responsibility',physical:'component',technology:'capability',data:'data',interface:'contract',security:'control',deployment:'zone'};

function buildArchitectureModel(p){
 const objects=new Map(),relationships=new Map(),issues=[],visual=logicalGraph(p);
 // The graph's nodes by id, the first of each as visual.nodes.find returns it (round 5, R5-G: a search per object was
 // a third of the build at 500 records per chapter).
 const visualNode=firstById(visual.nodes);
 const root='system:'+p.id;
 const add=(r,type,source,id=r.id)=>{
  if(!id)return null;
  const meta=OBJECT_TYPES[type]||OBJECT_TYPES.context,prior=objects.get(id),node=memoOff()?visual.nodes.find(n=>n.id===id):visualNode.get(id);
  if(prior&&prior.source!==source){issues.push({kind:'identity',id,detail:'Duplicate object identity at '+source});return prior;}
  const obj={id,type,title:label(r)||node?.title||id,description:r.purpose||r.description||r.scenario||r.context||r.policy||node?.description||'',chapter:meta.chapter,level:meta.level,color:meta.color,ref:r.ref||r.id||id,owner:r.owner||'',revision:r.revision||1,status:objectStatus(r),source,attributes:safe(r),record:r,visual:node||null};
  objects.set(id,obj);return obj;
 };
 const rel=(type,from,to,{id,label:meaning,attributes={},source='projection',derived=false,via=[]}={})=>{
  if(!from||!to)return;
  id=id||'rel:'+key(source,type,from,to);
  if(relationships.has(id)){const old=relationships.get(id);if(old.type===type&&old.from===from&&old.to===to)return;id=key(source,id,type,from,to);}
  relationships.set(id,{id,type,from,to,label:meaning||({realizedBy:'realized by',implementedBy:'implemented by',operatedAs:'operated as',placedAs:'placed as',locatedIn:'located in',memberOf:'belongs to',fulfils:'fulfilled by',exchanges:'exchanges',mitigates:'mitigates',protects:'protects',requires:'requires'}[type]||type),attributes:safe(attributes),source,derived,via});
 };
 add({id:root,title:p.name,purpose:p.brief?.goal||p.brief?.problem||'',origin:p.workspace?.template==='bank-payment'?'reference':'project'},'system','project');
 for(const [rows,type,path] of RECORD_COLLECTIONS)list(rows(p)).forEach((r,i)=>add(r,typeof type==='function'?type(r):type,path+'['+i+']'));
 for(const b of list(p.finalReview?.baselines))add({id:'baseline:'+b.id,ref:b.id,title:b.title,at:b.at,classification:b.classification,stamp:b.stamp,status:b.classification},'baseline','finalReview.baselines.'+b.id);
 for(const o of list(p.modelContext?.objects))if(!objects.has(o.id))add({...o.attributes,id:o.id,title:o.title},o.type,'model.context.'+o.id);
 for(const n of visual.nodes)if(!objects.has(n.id))add({...n,description:n.description,attributes:n.attrs,origin:'reference'},CONTEXT_LAYER_TYPE[n.layer]||'context','model.context.'+n.id);
 for(const s of list(p.coauthoring?.sources)){const v=s.versions?.at(-1)||{};add({...v,id:s.id,title:v.title||s.id},'evidence','coauthoring.sources.'+s.id);}
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
 for(const q of list(p.quality?.drivers)){linkRefs(q,'quality.drivers');for(const id of list(q.responsibilityIds))rel('constrains',q.id,id,{source:'quality.drivers.responsibilityIds'});}
 for(const d of list(p.decisions?.records)){
  linkRefs(d,'decisions.records');for(const a of list(d.alternatives)){const id=d.id+'/alternative/'+a.id;add({...a,title:a.title||a.name,id},'alternative','decisions.records.'+d.id+'.alternatives');rel('considers',d.id,id,{source:'decisions.alternatives',attributes:{selected:d.selectedAlternativeId===a.id||d.selected===a.id}});}
 }
 for(const r of list(p.logical?.mappings))rel('realizedBy',r.logicalId,r.physicalId,{id:r.id,label:'realized by',attributes:r,source:'logical.mappings'});
 for(const source of ['logical.connections','realisation.connections','technology.dependencies','technologyRealisation.connections'])for(const r of RECORDED[source].rows(p))rel(RECORDED[source].type(r,p),r.from,r.to,{id:r.id,label:RECORDED[source].label(r),attributes:r,source});
 for(const c of list(p.realisation?.components)){linkRefs(c,'realisation.components');for(const id of list(c.dataIds))rel('owns',c.id,id,{source:'realisation.components.dataIds'});}
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
 const pairs=new Set([...relationships.values()].map(e=>e.from+'\0'+e.to));
 for(const e of visual.edges)if(!pairs.has(e.from+'\0'+e.to)&&[e.from,e.to].some(id=>objects.get(id)?.source.startsWith('model.context.')))rel(e.kind==='flow'?'interaction':'related',e.from,e.to,{id:e.id||'context:'+key(e.from,e.to,e.label),label:e.label,attributes:e,source:'model.context',derived:true});
 const resolved=[];
 for(const e of relationships.values())if(objects.has(e.from)&&objects.has(e.to))resolved.push(e);else issues.push({kind:'unresolved',id:e.id,from:e.from,to:e.to,detail:'Relationship endpoint is not in the current project model.'});
 // Every relationship typed by ArchiMate 3.1 (round 6, Contract T): the type its AIW kind asks for where the standard
 // allows it between the two element types, else an Association, with the rule that decided it. A reading of the
 // saved records; the signature does not carry it.
 for(const e of resolved){const a=objects.get(e.from),b=objects.get(e.to);e.archimate=archimateOf(e.type,archimateTypeOf(a.type,a.record),archimateTypeOf(b.type,b.record),e.source);}
 const outgoing=new Map(),incoming=new Map();for(const id of objects.keys()){outgoing.set(id,[]);incoming.set(id,[]);}for(const e of resolved){outgoing.get(e.from).push(e);incoming.get(e.to).push(e);}
 const modules=[...objects.values()].filter(o=>o.type==='module');
 const memberships=new Map();
 for(const group of modules){
  const reached=new Set([group.id]),queue=incoming.get(group.id).filter(e=>e.type==='memberOf').map(e=>e.from);
  while(queue.length){const id=queue.shift();if(reached.has(id))continue;reached.add(id);for(const e of outgoing.get(id)||[])if(technical.includes(e.type))queue.push(e.to);}
  for(const id of reached){if(!memberships.has(id))memberships.set(id,new Set());memberships.get(id).add(group.id);}
 }
 for(const o of objects.values()){o.moduleIds=[...(memberships.get(o.id)||[])];o.shared=o.moduleIds.length>1;}
 // The signature covers what the model says now; its digest is worked out when a reader first asks for it, once (round 5,
 // R5-G: at 500 records per chapter the digest was half the build, and the diagrams, the table and the checks never read
 // it). The tuples are taken here, and the attributes they hold are the model's own copies (safe), which nothing changes
 // once the model is built, so the digest is the one the build would have computed.
 const signed=[...objects.values()].filter(o=>!['view','baseline'].includes(o.type)).map(o=>[o.id,o.type,o.revision,o.attributes]).concat(resolved.filter(e=>!['frames','framesBaseline'].includes(e.type)).map(e=>[e.id,e.type,e.from,e.to,e.attributes]));
 const model={schema:MODEL_SCHEMA,projectId:p.id,title:p.name,root,objects,relationships:resolved,outgoing,incoming,modules,issues,signature:''};
 let signature=null;
 Object.defineProperty(model,'signature',{enumerable:true,configurable:false,get:()=>signature??=digest(signed)});
 return model;
}

export function architectureScope(model,scopeId){
 if(!scopeId||scopeId===model.root)return {ids:new Set(model.objects.keys()),core:new Set(model.objects.keys()),external:new Set(),title:model.title};
 const subject=model.objects.get(scopeId);if(!subject)return architectureScope(model,model.root);
 const core=new Set([scopeId]);
 if(subject.type==='module')for(const o of model.objects.values())if(o.moduleIds.includes(scopeId))core.add(o.id);
 else{
  const ancestors=[scopeId];while(ancestors.length){const id=ancestors.shift();for(const e of model.incoming.get(id)||[])if(technical.includes(e.type)&&!core.has(e.from)){core.add(e.from);ancestors.push(e.from);}}
  const queue=[...core];while(queue.length){const id=queue.shift();for(const e of model.outgoing.get(id)||[])if(technical.includes(e.type)&&!core.has(e.to)){core.add(e.to);queue.push(e.to);}}
 }
 const ids=new Set(core),external=new Set();
 for(const e of model.relationships){const from=core.has(e.from),to=core.has(e.to);if(from===to)continue;const other=from?e.to:e.from,o=model.objects.get(other);
  if(['system','module','view','field','option','alternative','exchange'].includes(o.type))continue;
  // Shared platform consumers are context, never reclassified as module internals.
  if(['requires','realizedBy','implementedBy','operatedAs','placedAs'].includes(e.type)&&!from){external.add(other);continue;}
  ids.add(other);if(['component','responsibility','party'].includes(o.type)&&!core.has(other))external.add(other);
 }
 // Pull the control/threat and data/contract explanation for the scoped objects.
 for(const e of model.relationships)if((ids.has(e.to)&&['protects','threatens','mitigates','exchanges'].includes(e.type))||(ids.has(e.from)&&['exchanges','owns','withinBoundary','locatedIn','inEnvironment'].includes(e.type)))ids.add(ids.has(e.from)?e.to:e.from);
 return {ids,core,external,title:subject.title};
}

const concernTypes={
 structure:['module','responsibility','component','party','capability'],
 process:['journey','task','gateway','event','account','subprocess','dataObject'],
 realization:['responsibility','component','capability','technology','runtime','instance'],
 behaviour:['responsibility','component','party','contract'],
 data:['component','party','data','contract','account'],
 security:['component','party','contract','data','boundary','control','threat'],
 deployment:['component','technology','runtime','instance','zone','environment'],
 rationale:['requirement','outcome','quality','decision','responsibility','component','evidence','pattern','claim']
};
// Each chapter reveals one adjacent mapping of the same model. The complete
// perspective is still available when the architect chooses Explore.
export const CHAPTER_STAGES={
 4:{title:'Logical application',concern:'structure',types:['module','responsibility'],focus:['module','responsibility'],prompt:'Find the responsibility and its boundary.',next:'See its application component'},
 5:{title:'Application realization',concern:'realization',types:['responsibility','component'],focus:['component'],prompt:'Trace a responsibility to its implementing component.',next:'Reveal supporting capabilities'},
 6:{title:'Logical technology',concern:'realization',types:['component','capability'],focus:['capability'],prompt:'See which capabilities each application component needs.',next:'Inspect technology choices'},
 7:{title:'Technology realization',concern:'realization',types:['capability','technology'],focus:['technology'],prompt:'Follow a capability into a recorded technology choice.',next:'Examine contracts and data'},
 8:{title:'Interfaces & data',concern:'data',types:['component','party','contract','data'],focus:['contract','data'],prompt:'Find the contract, exchanged data, and its authority.',next:'Examine protection'},
 9:{title:'Security',concern:'security',types:['component','party','contract','data','boundary','control','threat'],focus:['boundary','control','threat'],prompt:'Examine controls, threats, and the boundary they protect.',next:'See operating placement'},
 10:{title:'Deployment / runtime',concern:'deployment',types:['component','technology','runtime','instance','zone','environment'],focus:['environment','zone','instance'],prompt:'Find the planned placement and shared failure domain.',next:'Review the reasoning'},
 11:{title:'Review & realize',concern:'rationale',types:['requirement','outcome','quality','decision','responsibility','component','evidence','pattern'],focus:['decision','quality','evidence'],prompt:'Connect the working design to its reasons and evidence.',next:null}
};
export function architectureView(model,state={}){
 const concern=CONCERNS.some(([id])=>id===state.concern)?state.concern:'structure',scope=architectureScope(model,concern==='process'?model.root:state.scopeId),types=concernTypes[concern];
 let objects=[...scope.ids].map(id=>model.objects.get(id)).filter(o=>types.includes(o.type));
 if(concern==='process'&&model.objects.has('PROC-REF-START'))objects=objects.filter(o=>o.type!=='journey'||o.source.startsWith('artefacts['));
 if(concern==='realization'&&state.scopeId&&state.scopeId!==model.root)objects=objects.filter(o=>scope.core.has(o.id));
 if(concern==='structure'&&(!state.scopeId||state.scopeId===model.root))objects=objects.filter(o=>o.type==='module'||o.type==='responsibility'&&!o.moduleIds.length||o.type==='party'||o.type==='capability'&&o.shared);
 if(state.context==='owner')objects.sort((a,b)=>a.owner.localeCompare(b.owner)||a.id.localeCompare(b.id));
 const fullCount=objects.length,neighbour=state.mode==='explore'&&state.neighbourId&&model.objects.get(state.neighbourId);
 if(neighbour&&objects.some(o=>o.id===neighbour.id)){
  const available=new Set(objects.map(o=>o.id)),near=new Set([neighbour.id]);
  for(const edge of model.relationships)if(edge.from===neighbour.id&&available.has(edge.to))near.add(edge.to);else if(edge.to===neighbour.id&&available.has(edge.from))near.add(edge.from);
  objects=objects.filter(o=>near.has(o.id));
 }
 const ids=new Set(objects.map(o=>o.id));
 let relationships=model.relationships.filter(e=>ids.has(e.from)&&ids.has(e.to));
 if(concern==='structure'&&model.modules.length&&(!state.scopeId||state.scopeId===model.root)){
  const bundles=new Map();for(const e of model.relationships.filter(e=>e.type==='interaction')){
   const a=model.objects.get(e.from),b=model.objects.get(e.to),left=a.moduleIds.length?a.moduleIds:[a.id],right=b.moduleIds.length?b.moduleIds:[b.id];
   for(const from of left)for(const to of right)if(from!==to&&ids.has(from)&&ids.has(to)){const id='aggregate:'+key(from,to),entry=bundles.get(id)||{id,type:'aggregate',from,to,label:'',attributes:{},source:'view',derived:true,via:[]};entry.via.push(e.id);bundles.set(id,entry);}
  }
  for(const c of objects.filter(o=>o.type==='capability'))for(const from of c.moduleIds)if(ids.has(from)){const underlying=model.relationships.filter(e=>e.type==='requires'&&e.to===c.id&&model.objects.get(e.from).moduleIds.includes(from));const id='aggregate:'+key(from,c.id);bundles.set(id,{id,type:'aggregate',from,to:c.id,label:'shared support',attributes:{meaning:'technology support'},source:'view',derived:true,via:underlying.map(e=>e.id)});}
  relationships=[...bundles.values()].map(e=>({...e,label:e.label||e.via.length+' linked interactions'}));
 }
 if(concern==='rationale')relationships=relationships.filter(e=>['fulfils','constrains','justifies','supports','realizedBy','addresses','assesses','scopes','evidences','delivers','asserts','conflictsWith'].includes(e.type));
 if(concern==='process')relationships=relationships.filter(e=>e.type==='sequence'||e.type==='message'||e.type==='precedes'&&!model.objects.has('PROC-REF-START'));
 if(concern==='data')relationships=relationships.filter(e=>['owns','provides','uses','exchanges','transforms'].includes(e.type));
 if(concern==='security')relationships=relationships.filter(e=>['protects','mitigates','threatens','withinBoundary','provides','uses','exchanges'].includes(e.type));
 if(concern==='behaviour'){
  objects=objects.filter(o=>o.type!=='contract');
  const contracted=new Set(relationships.filter(e=>e.type==='interaction'&&e.attributes.contractId).map(e=>e.from+'\0'+e.to));
  relationships=relationships.filter(e=>e.type==='interaction'&&(e.attributes.contractId||!contracted.has(e.from+'\0'+e.to)));
 }
 if(concern==='realization')relationships=relationships.filter(e=>technical.includes(e.type));
 const selected=model.objects.get(state.selectedId),outsideSelection=!!selected&&!objects.some(o=>o.id===selected.id);
 const gaps=[];
 if(concern==='realization')for(const o of objects){const type={responsibility:'realizedBy',component:'requires',capability:'implementedBy',technology:'operatedAs',runtime:'placedAs'}[o.type];if(type&&!(model.outgoing.get(o.id)||[]).some(e=>e.type===type))gaps.push({id:o.id,type,title:o.title,detail:{realizedBy:'Implementation not mapped',requires:'Technology support not mapped',implementedBy:'Technology choice not mapped',operatedAs:'Operating plan not modelled',placedAs:'Placement not modelled'}[type]});}
 return {concern,scope,objects,relationships,gaps,outsideSelection,selected,context:state.context||'functional',neighbourId:neighbour?.id||null,totalObjects:neighbour?fullCount:objects.length};
}

export function chapterArchitectureView(model,state={}){
 const base=architectureView(model,state),stage=CHAPTER_STAGES[state.chapter];
 if(state.mode==='explore'||!stage||base.concern!==stage.concern)return base;
 let objects=base.objects.filter(o=>stage.types.includes(o.type));
 // The scoped module is drawn as the enclosing group, not as a second card.
 if(state.chapter===4&&model.objects.get(state.scopeId)?.type==='module')objects=objects.filter(o=>o.id!==state.scopeId);
 const totalObjects=objects.length;
 // Keep the immediate design question legible; further objects remain available
 // through the chapter choices, search and the full perspective.
 if(state.chapter>=5&&objects.length>8&&objects.some(o=>o.id===state.selectedId)){
  const allIds=new Set(objects.map(o=>o.id)),near=new Set([state.selectedId]);
  for(const e of base.relationships)if(e.from===state.selectedId&&allIds.has(e.to))near.add(e.to);else if(e.to===state.selectedId&&allIds.has(e.from))near.add(e.from);
  if(state.chapter>=9){const first=new Set(near);for(const e of base.relationships){const other=first.has(e.from)?e.to:first.has(e.to)?e.from:null;const o=model.objects.get(other);if(o&&allIds.has(o.id)&&(['boundary','zone','environment','requirement','quality','decision'].includes(o.type)))near.add(o.id);}
   if(state.chapter===9){
    // A control on a contract is meaningful in the trust boundary of its
    // participating component. Bring that component and boundary into the
    // cross-section without pulling in every consumer of a shared control.
    const anchor=model.objects.get(state.anchorId),linked=anchor?.type==='component'&&allIds.has(anchor.id)&&base.relationships.some(e=>near.has(e.from)&&e.to===anchor.id||near.has(e.to)&&e.from===anchor.id);
    const participants=linked?[anchor.id]:base.relationships.filter(e=>['provides','uses'].includes(e.type)&&((near.has(e.from)&&model.objects.get(e.to)?.type==='component')||(near.has(e.to)&&model.objects.get(e.from)?.type==='component'))).slice(0,1).map(e=>model.objects.get(e.from)?.type==='component'?e.from:e.to);
    for(const id of participants){near.add(id);for(const e of base.relationships)if(e.type==='withinBoundary'&&e.from===id&&allIds.has(e.to))near.add(e.to);}
   }
  }
  objects=objects.filter(o=>near.has(o.id));
 }
 // A shared control can protect several unrelated contracts. In the guided
 // security cross-section, follow the application thread to the one contract
 // this component actually uses; leave the full control scope to Explore.
 if(state.chapter===9&&model.objects.get(state.selectedId)?.type==='control'&&model.objects.get(state.anchorId)?.type==='component'){
  const controlId=state.selectedId,componentId=state.anchorId,ids=new Set(objects.map(o=>o.id));
  const protectedContracts=base.relationships.filter(e=>e.type==='protects'&&e.from===controlId&&ids.has(e.to)&&model.objects.get(e.to)?.type==='contract');
  const contract=protectedContracts.find(p=>base.relationships.some(e=>['uses','provides'].includes(e.type)&&e.from===componentId&&e.to===p.to));
  if(ids.has(componentId)&&contract){
   const keep=new Set([controlId,componentId,contract.to]);
   const threat=base.relationships.find(e=>e.type==='mitigates'&&e.from===controlId&&ids.has(e.to)&&model.objects.get(e.to)?.type==='threat');
   const boundary=base.relationships.find(e=>e.type==='withinBoundary'&&e.from===componentId&&ids.has(e.to));
   if(threat)keep.add(threat.to);
   if(boundary)keep.add(boundary.to);
   objects=objects.filter(o=>keep.has(o.id));
  }
 }
 if(state.chapter===11&&state.investigationId==='bank-settlement-uncertainty'&&state.selectedId==='ADR-003'){
  // Read one requirement → scenario → decision → responsibility path. Other
  // rationale remains available in Explore, without covering the canvas.
  const path=new Set(['REQ-004','QD-004','ADR-003','hub']);
  objects=objects.filter(o=>path.has(o.id));
 }
 const ids=new Set(objects.map(o=>o.id));
 const relationships=base.relationships.filter(e=>ids.has(e.from)&&ids.has(e.to));
 return {...base,objects,relationships,gaps:base.gaps.filter(g=>ids.has(g.id)),outsideSelection:!!base.selected&&!ids.has(base.selected.id),chapter:state.chapter,mode:'guided',totalObjects};
}

export function relationshipPath(model,from,to,{types=['interaction'],limit=30}={}){
 const queue=[{id:from,edges:[]}],seen=new Set([from]);while(queue.length){const item=queue.shift();if(item.id===to)return item.edges;if(item.edges.length>=limit)continue;for(const e of model.outgoing.get(item.id)||[])if(types.includes(e.type)&&!seen.has(e.to)){seen.add(e.to);queue.push({id:e.to,edges:[...item.edges,e]});}}return [];
}

export function explorationContext(model,state){
 const view=chapterArchitectureView(model,state),ids=new Set(view.objects.map(o=>o.id));
 const claims=view.concern==='process'?[...model.objects.values()].filter(o=>o.type==='claim'&&o.attributes.subjectId===state.selectedId).slice(0,8).map(o=>({id:o.id,subjectId:o.attributes.subjectId,topic:o.attributes.topic,statement:o.attributes.statement,source:o.attributes.source,locator:o.attributes.sourceLocator,status:o.status})):[];
 return {schema:'aiw.exploration/1',chapter:state.chapter||null,mode:state.mode||'explore',scopeId:state.scopeId||model.root,scope:view.scope.title,concern:view.concern,context:view.context,investigationId:state.investigationId||null,selectedId:state.selectedId||null,anchorId:model.objects.has(state.anchorId)?state.anchorId:null,baselineId:state.baselineId||null,modelSignature:model.signature,objects:view.objects.slice(0,40).map(o=>({id:o.id,type:o.type,title:o.title,shared:o.shared,status:o.status})),relationships:view.relationships.filter(e=>ids.has(e.from)&&ids.has(e.to)).slice(0,60).map(({id,type,from,to,via})=>({id,type,from,to,via})),...(view.concern==='process'?{processClaims:claims,sourceQuestions:processSourceQuestions({id:model.projectId},state.selectedId)}:{}),omitted:{objects:Math.max(0,view.objects.length-40),relationships:Math.max(0,view.relationships.length-60)},gaps:view.gaps.slice(0,20)};
}

export function normalizeExploration(raw,model){
 const valid=id=>typeof id==='string'&&model.objects.has(id),baseline=typeof raw?.baselineId==='string'?raw.baselineId.slice(0,100):null;
 return {scopeId:valid(raw?.scopeId)?raw.scopeId:model.root,selectedId:valid(raw?.selectedId)?raw.selectedId:null,anchorId:valid(raw?.anchorId)?raw.anchorId:null,neighbourId:valid(raw?.neighbourId)?raw.neighbourId:null,concern:CONCERNS.some(([id])=>id===raw?.concern)?raw.concern:'structure',chapter:CHAPTER_STAGES[raw?.chapter]?Number(raw.chapter):null,mode:raw?.mode==='guided'?'guided':'explore',context:['functional','owner','boundary'].includes(raw?.context)?raw.context:'functional',baselineId:baseline,detail:['compact','expanded'].includes(raw?.detail)?raw.detail:'expanded',pathFrom:valid(raw?.pathFrom)?raw.pathFrom:null,pathTo:valid(raw?.pathTo)?raw.pathTo:null};
}

// The connected model is built once per settled document (document-memo.js): every reader of a saved document gets the
// same object and none of them mutates it; command working copies and server documents are always built fresh (round-2 F2-04).
export const architectureModel=perDocument(buildArchitectureModel);

// The type of every record the model registers, by id, from the same table (RECORD_COLLECTIONS, the first registration
// of an id as add() keeps it): what a chapter check needs to type a recorded relationship without building the model,
// which at 500 records a chapter takes longer than the chapter's whole budget. Once per settled document.
const recordTypes=perDocument(p=>{
 const T=new Map(),put=(r,type)=>{if(r?.id&&!T.has(r.id))T.set(r.id,{type,record:r});};
 for(const [rows,type] of RECORD_COLLECTIONS)for(const r of list(rows(p)))put(r,typeof type==='function'?type(r):type);
 // What the model adds beside the records, as it adds it: the declared context objects and the reference graph's nodes
 // (projectNodes, the base of the graph the model draws from; the graph's other nodes are the records above).
 for(const o of list(p.modelContext?.objects))put({...o.attributes,id:o.id,title:o.title},o.type);
 for(const n of projectNodes(p))put({...n,title:n.title},CONTEXT_LAYER_TYPE[n.layer]||'context');
 return T;
});
// The recorded relationships of a chapter (or of every chapter) with their ArchiMate typing: the same rows, types and
// rule the model gives them (RECORDED and archimateOf), read from the records. A row whose end is not a registered record
// is left out: the chapter's own broken-link check names it.
export function typedRecordedRelationships(p,{chapter=null}={}){
 const T=recordTypes(p),out=[];
 for(const [source,spec] of Object.entries(RECORDED)){
  if(chapter&&spec.chapter!==Number(chapter))continue;
  for(const r of spec.rows(p)){const a=T.get(r.from),b=T.get(r.to);if(!a||!b||!r.id)continue;const type=spec.type(r,p);out.push({id:r.id,source,chapter:spec.chapter,type,from:r.from,to:r.to,fromRecord:a,toRecord:b,record:r,archimate:archimateOf(type,archimateTypeOf(a.type,a.record),archimateTypeOf(b.type,b.record),source)});}
 }
 return out;
}
// The relationship type the model registers for a row a chapter editor writes into one of the recorded sources, and
// whether a typing of such a row is one the chapter's readiness reports as RELATION-INVALID (rc41 close: the canvas's
// kinds menu types each offer by the record its editor will write, and withholds what readiness would report, by these).
export const recordedRelationshipType=(source,row,p)=>RECORDED[source]?RECORDED[source].type(row,p):null;
export const relationInvalid=(source,a)=>!!RECORDED[source]&&!a.valid&&a.wanted!=='Association';
// RELATION-INVALID: a recorded relationship whose kind asks for an ArchiMate relationship the standard does not allow
// between its two element types (a constraint cannot trigger a step; an actor cannot precede one). An error on the
// source record, listed by the chapter that owns it (`chapter`, or every chapter), so it reaches readiness as to fix.
const relationshipFindingsOf=perDocument((p,o)=>{
 const out=[],ref=x=>x.record.ref||x.record.id,title=x=>label(x.record);
 for(const e of typedRecordedRelationships(p,{chapter:o?.chapter||null})){
  const a=e.archimate;if(!relationInvalid(e.source,a))continue;
  const word=e.record.kind||e.record.label||e.type;
  // Round 12 (GR-CMP-09): a Chapter 4 connection between a journey step and a responsibility crosses layers; it says
  // what the responsibility does for the step with "serves" or "realises", which the standard allows.
  const layered=e.source==='logical.connections'&&[e.fromRecord.type,e.toRecord.type].includes('responsibility')&&[a.source,a.target].includes('BusinessProcess');
  out.push({id:'RELATION-INVALID:'+e.id,code:'RELATION-INVALID',level:'error',objectId:e.from,artefactId:e.from,relationshipId:e.id,chapter:e.chapter,title:'Retype the relationship '+ref(e.fromRecord)+' → '+ref(e.toRecord),detail:`“${word}” reads as ${a.wanted} in ArchiMate 3.1, which is not allowed from ${a.source} (${title(e.fromRecord)}) to ${a.target} (${title(e.toRecord)}). ${a.rule} ${layered?'A flow does not cross from a journey step to a responsibility: choose “serves” or “realises” to say what the responsibility does for the step, or record it as an association.':'Choose a kind the standard allows between these two, link other records, or record it as an association.'}`,...(layered?{suggest:['serves','realises']}:{})});
 }
 return out;
},(o={})=>String(o.chapter??''));
export function relationshipFindings(p,{chapter=null}={}){return p?relationshipFindingsOf(p,{chapter}).map(f=>({...f})):[];}
