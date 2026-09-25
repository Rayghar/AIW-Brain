import {logicalGraph} from './logical-domain.js';
import {digest} from './brain-integrity.js';
import {processElements,processTransitions,processConflicts,processSourceQuestions} from './process-model.js';

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
const list=v=>Array.isArray(v)?v:[];
const safe=v=>JSON.parse(JSON.stringify(v??{},(k,x)=>['history','sourceSnapshot','sourceSnapshots','generation','baselineSource'].includes(k)?undefined:x));
const label=r=>r.title||r.question||r.name||r.description||r.id;
const key=(...parts)=>parts.map(x=>encodeURIComponent(String(x??''))).join(':');
export const objectStatus=r=>r.origin==='reference'&&!r.confirmed?'Illustrative':r.confirmed?'User-confirmed':r.review?'Review recorded':r.status||r.state||'Working definition';
const technical=['fulfils','realizedBy','requires','implementedBy','operatedAs','placedAs','locatedIn'];

export function architectureModel(p){
 const objects=new Map(),relationships=new Map(),issues=[],visual=logicalGraph(p);
 const root='system:'+p.id;
 const add=(r,type,source,id=r.id)=>{
  if(!id)return null;
  const meta=OBJECT_TYPES[type]||OBJECT_TYPES.context,prior=objects.get(id),node=visual.nodes.find(n=>n.id===id);
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
 const register=(rows,type,path)=>list(rows).forEach((r,i)=>add(r,typeof type==='function'?type(r):type,path+'['+i+']'));
 register(p.artefacts,r=>OBJECT_TYPES[r.type]?r.type:'context','artefacts');
 register(processElements(p),r=>r.kind,'process.elements');register(list(p.processModel?.claims).map(c=>({...c,title:c.topic,description:c.statement})),'claim','process.claims');
 register(p.quality?.drivers,'quality','quality.drivers');register(p.decisions?.records,'decision','decisions.records');
 register(p.logical?.groups,'module','logical.groups');register(p.logical?.responsibilities,'responsibility','logical.responsibilities');
 register(p.realisation?.components,'component','realisation.components');
 register(p.technology?.capabilities,'capability','technology.capabilities');register(p.technology?.needs,'need','technology.needs');register(p.technology?.boundaries,'boundary','technology.boundaries');
 register(p.technologyRealisation?.records,'technology','technologyRealisation.records');
 register(p.interfaces?.contracts,'contract','interfaces.contracts');register(p.interfaces?.data,'data','interfaces.data');register(p.interfaces?.parties,'party','interfaces.parties');
 register(p.security?.controls,'control','security.controls');register(p.security?.threats,'threat','security.threats');register(p.security?.risks,'risk','security.risks');
 register(p.runtime?.environments,'environment','runtime.environments');register(p.runtime?.zones,'zone','runtime.zones');register(p.runtime?.plans,'runtime','runtime.plans');register(p.runtime?.placements,'instance','runtime.placements');register(p.runtime?.paths,'path','runtime.paths');
 for(const name of ['security','runtime'])register(p[name]?.evidence,'evidence',name+'.evidence');
 register(p.workbench?.views,'view','workbench.views');
 for(const b of list(p.finalReview?.baselines))add({id:'baseline:'+b.id,ref:b.id,title:b.title,at:b.at,classification:b.classification,stamp:b.stamp,status:b.classification},'baseline','finalReview.baselines.'+b.id);
 for(const o of list(p.modelContext?.objects))if(!objects.has(o.id))add({...o.attributes,id:o.id,title:o.title},o.type,'model.context.'+o.id);
 for(const n of visual.nodes)if(!objects.has(n.id))add({...n,description:n.description,attributes:n.attrs,origin:'reference'},({process:'journey',logical:'responsibility',physical:'component',technology:'capability',data:'data',interface:'contract',security:'control',deployment:'zone'}[n.layer]||'context'),'model.context.'+n.id);
 for(const s of list(p.coauthoring?.sources)){const v=s.versions?.at(-1)||{};add({...v,id:s.id,title:v.title||s.id},'evidence','coauthoring.sources.'+s.id);}
 const linkRefs=(r,source)=>{
  for(const [field,type,inverse] of [['requirementIds','fulfils',true],['driverIds','constrains',true],['decisionIds','justifies',true],['sourceIds','supports',true]])for(const id of list(r[field]))rel(type,inverse?id:r.id,inverse?r.id:id,{source:source+'.'+field});
 };
 for(const g of list(p.logical?.groups))rel('memberOf',g.id,root,{source:'logical.groups'});
 for(const r of list(p.logical?.responsibilities)){if(r.groupId)rel('memberOf',r.id,r.groupId,{source:'logical.responsibilities.groupId'});linkRefs(r,'logical.responsibilities');}
 for(const r of list(p.artefacts))if(r.modelRef)rel('fulfils',r.id,r.modelRef,{source:'artefacts.modelRef'});
 for(const r of list(p.relationships))rel(r.kind||'related',r.from,r.to,{id:r.id,attributes:r,source:'relationships'});
 for(const t of processTransitions(p))rel('sequence',t.from,t.to,{id:t.id,label:t.label,attributes:t,source:'process.transitions'});
 for(const e of list(p.processModel?.elements)){for(const id of list(e.requirementIds))rel('motivatedBy',e.id,id,{source:'process.elements.requirementIds'});if(e.kind==='account'&&e.authorityId)rel('owns',e.authorityId,e.id,{source:'process.elements.authorityId'});}
 for(const c of list(p.processModel?.claims)){const path=processTransitions(p).find(t=>t.id===c.subjectId);rel('asserts',c.id,path?path.from:c.subjectId,{source:'process.claims',via:path?[path.id]:[],attributes:{topic:c.topic,statement:c.statement,source:c.source,sourceLocator:c.sourceLocator,status:c.status,transitionId:path?.id}});}
 for(const group of processConflicts(p))for(let i=1;i<group.length;i++)rel('conflictsWith',group[0].id,group[i].id,{source:'process.claims',attributes:{topic:group[0].topic,status:'Unresolved'}});
 for(const j of list(p.artefacts).filter(a=>a.type==='journey'))for(const requirementId of list(p.relationships).filter(r=>r.from===j.id&&r.kind==='requires').map(r=>r.to)){const requirement=p.artefacts.find(a=>a.id===requirementId);if(requirement?.modelRef)rel('implementedBy',j.id,requirement.modelRef,{source:'process.requirement.modelRef',derived:true,via:[requirementId]});}
 for(const q of list(p.quality?.drivers)){linkRefs(q,'quality.drivers');for(const id of list(q.responsibilityIds))rel('constrains',q.id,id,{source:'quality.drivers.responsibilityIds'});}
 for(const d of list(p.decisions?.records)){
  linkRefs(d,'decisions.records');for(const a of list(d.alternatives)){const id=d.id+'/alternative/'+a.id;add({...a,title:a.title||a.name,id},'alternative','decisions.records.'+d.id+'.alternatives');rel('considers',d.id,id,{source:'decisions.alternatives',attributes:{selected:d.selectedAlternativeId===a.id||d.selected===a.id}});}
 }
 for(const r of list(p.logical?.mappings))rel('realizedBy',r.logicalId,r.physicalId,{id:r.id,label:'realized by',attributes:r,source:'logical.mappings'});
 for(const [rows,source] of [[p.logical?.connections,'logical.connections'],[p.realisation?.connections,'realisation.connections'],[p.technology?.dependencies,'technology.dependencies'],[p.technologyRealisation?.connections,'technologyRealisation.connections']])for(const r of list(rows))rel(r.kind==='flow'?'interaction':r.type||'dependency',r.from,r.to,{id:r.id,label:r.label,attributes:r,source});
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
 for(const e of list(p.coauthoring?.links))if(e.sourceId&&e.objectId)rel('supports',e.sourceId,e.objectId,{id:e.id,source:'coauthoring.links',attributes:e});
 for(const name of ['security','runtime'])for(const e of list(p[name]?.evidence))for(const field of ['controlId','threatId','planId','objectId','targetId'])if(e[field])rel('evidences',e.id,e[field],{source:name+'.evidence.'+field});
 for(const t of list(p.coauthoring?.designTasks)){if(t.kind!=='architecture')continue;add({...t,title:t.title||t.topic||t.id},'pattern','coauthoring.designTasks.'+t.id);if(t.requirementId)rel('addresses',t.id,t.requirementId,{source:'coauthoring.designTasks'});if(t.driverId)rel('assesses',t.id,t.driverId,{source:'coauthoring.designTasks'});for(const id of [...new Set([...(t.applied?.recordIds||[]),...(t.applied?.records||[]).map(r=>r.id),...['caller','processor','store','queue','relay','consumer'].map(role=>t.answers?.[role+'Id']),t.answers?.dataId,t.applied?.decisionId].filter(Boolean))])if(objects.has(id))rel('scopes',t.id,id,{source:'coauthoring.designTasks'});}
 for(const v of list(p.workbench?.views)){if(v.exploration?.baselineId)rel('framesBaseline',v.id,'baseline:'+v.exploration.baselineId,{source:'workbench.views',attributes:{objectId:v.objectId,exploration:v.exploration}});else if(v.objectId)rel('frames',v.id,v.objectId,{source:'workbench.views'});}
 // Preserve declared context edges not represented by a richer domain record.
 for(const e of list(p.modelContext?.relationships))rel(e.type,e.from,e.to,e);
 const pairs=new Set([...relationships.values()].map(e=>e.from+'\0'+e.to));
 for(const e of visual.edges)if(!pairs.has(e.from+'\0'+e.to)&&[e.from,e.to].some(id=>objects.get(id)?.source.startsWith('model.context.')))rel(e.kind==='flow'?'interaction':'related',e.from,e.to,{id:e.id||'context:'+key(e.from,e.to,e.label),label:e.label,attributes:e,source:'model.context',derived:true});
 const resolved=[];
 for(const e of relationships.values())if(objects.has(e.from)&&objects.has(e.to))resolved.push(e);else issues.push({kind:'unresolved',id:e.id,from:e.from,to:e.to,detail:'Relationship endpoint is not in the current project model.'});
 const outgoing=new Map(),incoming=new Map();for(const id of objects.keys()){outgoing.set(id,[]);incoming.set(id,[]);}for(const e of resolved){outgoing.get(e.from).push(e);incoming.get(e.to).push(e);}
 const modules=[...objects.values()].filter(o=>o.type==='module');
 const memberships=new Map();
 for(const group of modules){
  const reached=new Set([group.id]),queue=incoming.get(group.id).filter(e=>e.type==='memberOf').map(e=>e.from);
  while(queue.length){const id=queue.shift();if(reached.has(id))continue;reached.add(id);for(const e of outgoing.get(id)||[])if(technical.includes(e.type))queue.push(e.to);}
  for(const id of reached){if(!memberships.has(id))memberships.set(id,new Set());memberships.get(id).add(group.id);}
 }
 for(const o of objects.values()){o.moduleIds=[...(memberships.get(o.id)||[])];o.shared=o.moduleIds.length>1;}
 const signature=digest([...objects.values()].filter(o=>!['view','baseline'].includes(o.type)).map(o=>[o.id,o.type,o.revision,o.attributes]).concat(resolved.filter(e=>!['frames','framesBaseline'].includes(e.type)).map(e=>[e.id,e.type,e.from,e.to,e.attributes])));
 return {schema:MODEL_SCHEMA,projectId:p.id,title:p.name,root,objects,relationships:resolved,outgoing,incoming,modules,issues,signature};
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
 process:['journey','task','gateway','event','account'],
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
 8:{title:'Interfaces & Data',concern:'data',types:['component','party','contract','data'],focus:['contract','data'],prompt:'Find the contract, exchanged data, and its authority.',next:'Examine protection'},
 9:{title:'Security',concern:'security',types:['component','party','contract','data','boundary','control','threat'],focus:['boundary','control','threat'],prompt:'Examine controls, threats, and the boundary they protect.',next:'See operating placement'},
 10:{title:'Deployment / Runtime',concern:'deployment',types:['component','technology','runtime','instance','zone','environment'],focus:['environment','zone','instance'],prompt:'Find the planned placement and shared failure domain.',next:'Review the reasoning'},
 11:{title:'Review & Realize',concern:'rationale',types:['requirement','outcome','quality','decision','responsibility','component','evidence','pattern'],focus:['decision','quality','evidence'],prompt:'Connect the working design to its reasons and evidence.',next:null}
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
 if(concern==='process')relationships=relationships.filter(e=>e.type==='sequence'||e.type==='precedes'&&!model.objects.has('PROC-REF-START'));
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

export function chapterNextSelection(model,id,chapter,scopeId=model.root,anchorId=null){
 const stage=CHAPTER_STAGES[chapter];if(!stage)return id;
 const scoped=architectureScope(model,scopeId).ids,valid=o=>o&&stage.types.includes(o.type)&&scoped.has(o.id);
 const current=model.objects.get(id);if(valid(current)&&stage.focus.includes(current.type))return id;
 if(!current)return null;
 // Chapter 8 returns to the application thread after the technology
 // cross-section. Prefer an actual contract of that component with explicit
 // information and protection links, rather than any nearby shared service.
 if(chapter===8&&model.objects.get(anchorId)?.type==='component'){
  const direct=[...(model.outgoing.get(anchorId)||[]),...(model.incoming.get(anchorId)||[])].map(e=>model.objects.get(e.from===anchorId?e.to:e.from)).filter(o=>o?.type==='contract'&&valid(o));
  if(direct.length){const rank=o=>(model.incoming.get(o.id)||[]).filter(e=>e.type==='protects').length*10+(model.outgoing.get(o.id)||[]).filter(e=>e.type==='exchanges').length;
   direct.sort((a,b)=>rank(b)-rank(a)||a.id.localeCompare(b.id));return direct[0].id;}
 }
 if(chapter===9&&current.type==='contract'){
  const controls=(model.incoming.get(id)||[]).filter(e=>e.type==='protects').map(e=>model.objects.get(e.from)).filter(o=>o?.type==='control'&&valid(o));
  if(controls.length){controls.sort((a,b)=>(model.outgoing.get(b.id)||[]).filter(e=>e.type==='mitigates').length-(model.outgoing.get(a.id)||[]).filter(e=>e.type==='mitigates').length||a.id.localeCompare(b.id));return controls[0].id;}
 }
 const queue=[{id,depth:0}],seen=new Set([id]),candidates=[];
 while(queue.length){const item=queue.shift(),o=model.objects.get(item.id);if(valid(o))candidates.push({o,depth:item.depth});if(item.depth>=3)continue;
  const adjacent=[...(model.outgoing.get(item.id)||[]).map(e=>e.to),...(model.incoming.get(item.id)||[]).map(e=>e.from)];
  for(const next of adjacent)if(!seen.has(next)&&scoped.has(next)){seen.add(next);queue.push({id:next,depth:item.depth+1});}
 }
 candidates.sort((a,b)=>Number(stage.focus.includes(b.o.type))-Number(stage.focus.includes(a.o.type))||a.depth-b.depth||a.o.id.localeCompare(b.o.id));
 return candidates[0]?.o.id||null;
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
