import {documentIndex,passRemember,firstById,groupBy,tupleSet} from './document-memo.js';
// Round 12 (DM-04): a plan's availability target, hours of service and batch windows, as the plan states them (a plan
// written before round 12 states none of these: its driver slots name recovery and capacity only).
const planAttrs=r=>{const a=(Array.isArray(r.targets)?r.targets:[]).find(t=>t?.kind==='availability'&&t.value!==''&&t.value!=null),s=r.schedule&&typeof r.schedule==='object'?r.schedule:{},b=Array.isArray(s.batchWindows)?s.batchWindows:[];
 return {...(a?{Availability:(a.operator?a.operator.toLowerCase()+' ':'')+a.value+' '+(a.unit||'%')+(a.window?' over '+a.window:'')}:{}),...(s.serviceHours?{'Hours of service':s.serviceHours}:{}),...(b.length?{'Batch windows':b.map(w=>(w.name||'Batch')+' '+(w.start||'?')+'–'+(w.end||'?')+(w.timeZone?' '+w.timeZone:'')).join('; ')}:{})};};
// Runtime plans and placements extend the shared model without changing asset IDs.
export function runtimeProjection(p,g){
 const m=p.runtime;if(!m)return g;
 const replaced=new Set(m.zones.map(z=>z.id)),nodes=g.nodes.filter(n=>!replaced.has(n.id));
 nodes.push(...m.environments.map((e,i)=>({id:e.id,ref:e.ref,layer:'deployment',col:i%5,title:e.title,sub:e.ref+' · Environment design',description:e.purpose,environmentId:e.id,runtimeKind:'environment',attrs:{Owner:e.owner,Stage:e.stage||'Not stated',Scope:e.assetIds.length+' assets',State:e.confirmed?'Reviewed scope':'Illustrative / working scope'}})));
 nodes.push(...m.zones.map((z,i)=>({id:z.id,ref:z.ref,layer:'deployment',col:i%5,title:z.title,sub:z.ref+' · Failure domain',description:z.isolation,environmentId:z.environmentId,runtimeKind:'zone',attrs:{Owner:z.owner,Domain:z.failureDomain||'Unspecified',Isolation:z.isolation||'Evidence needed','Network boundary':(Array.isArray(z.boundaryIds)?z.boundaryIds.join(', '):z.boundaryId)||'Unassigned',...(z.kind?{Kind:z.kind}:{})}})));
 const envs=firstById(m.environments),plans=m.plans.filter(r=>envs.get(r.environmentId)?.assetIds.includes(r.assetId));
 nodes.push(...plans.map((r,i)=>({id:r.id,ref:r.ref,layer:'deployment',col:i%5,title:r.title,sub:r.ref+' · Runtime plan',description:r.purpose,environmentId:r.environmentId,runtimeKind:'plan',assetId:r.assetId,attrs:{Owner:r.owner||'Owner needed',Version:r.releaseReference||'Release reference needed',State:r.stateMode,Recovery:r.recoveryStrategy,Readiness:(r.minReady===''||r.minReady==null?'Ready copies not stated':r.minReady+' ready replicas')+' · capacity basis '+(r.capacityConfirmed?'confirmed':'unconfirmed'),...planAttrs(r)}})));
 const edges=g.edges.filter(e=>!replaced.has(e.from)&&!replaced.has(e.to));
 for(const z of m.zones){edges.push({id:z.ref+'-environment',from:z.id,to:z.environmentId,label:'belongs to',kind:'trace',environmentId:z.environmentId,runtimeKind:'environment'});(Array.isArray(z.boundaryIds)?z.boundaryIds:z.boundaryId?[z.boundaryId]:[]).forEach((b,i)=>edges.push({id:z.ref+'-trust'+(i?'-'+i:''),from:z.id,to:b,label:'network trust boundary',kind:'trace',environmentId:z.environmentId,runtimeKind:'trust'}));}
 for(const r of plans){edges.push({id:r.ref+'-asset',from:r.assetId,to:r.id,label:'operated through',kind:'trace',environmentId:r.environmentId,runtimeKind:'allocation',planId:r.id});for(const id of r.controlIds)edges.push({id:r.ref+'-control-'+id,from:id,to:r.id,label:'runtime enforcement',kind:'trace',environmentId:r.environmentId,runtimeKind:'control',planId:r.id});if(r.backupZoneId)edges.push({id:r.ref+'-backup',from:r.id,to:r.backupZoneId,label:'planned protected copy',kind:'trace',environmentId:r.environmentId,runtimeKind:'backup',planId:r.id});}
 const planIds=new Set(plans.map(r=>r.id)),planById=firstById(m.plans);
 for(const l of m.placements)if(planIds.has(l.planId))edges.push({id:l.id,from:l.planId,to:l.zoneId,label:(l.replicas===''||l.replicas==null?'':l.replicas+' ')+(l.role||'role not stated')+' · '+l.id,kind:'trace',environmentId:planById.get(l.planId)?.environmentId,runtimeKind:'placement',planId:l.planId,placementId:l.id});
 const contracts=firstById(p.interfaces.contracts),placed=new Map(),planAt=(env,asset)=>placed.get(env)?.get(asset);for(const r of plans){let byAsset=placed.get(r.environmentId);if(!byAsset)placed.set(r.environmentId,byAsset=new Map());if(!byAsset.has(r.assetId))byAsset.set(r.assetId,r);}
 for(const path of m.paths){const c=contracts.get(path.contractId);if(!c)continue;const a=planAt(path.environmentId,c.from),b=planAt(path.environmentId,c.to);if(a)edges.push({id:path.id+'-caller',from:a.id,to:c.id,label:'runtime caller · '+path.id+(Array.isArray(path.boundaryIds)&&path.boundaryIds.length?' · crosses '+path.boundaryIds.join(', '):''),kind:'flow',environmentId:path.environmentId,runtimeKind:'path',pathId:path.id,planId:a.id});if(b)edges.push({id:path.id+'-provider',from:c.id,to:b.id,label:'runtime provider',kind:'flow',environmentId:path.environmentId,runtimeKind:'path',pathId:path.id,planId:b.id});}
 for(const env of m.environments)for(const d of runtimeDependencyProjection(p,env.id))if(d.to)edges.push({id:d.from+'-'+d.source+'-'+d.to,from:d.from,to:d.to,label:d.mode+' · '+d.source,kind:'trace',environmentId:env.id,runtimeKind:'dependency',dependencySource:d.source,planId:d.from});
 return {nodes,edges};
}

// Pure runtime relationships are shared by projection and simulation. Called once per environment, so on a settled
// document or inside a pass (document-memo.js) the lists it searches are indexed once (round 5, R5-G); the same
// dependencies come back, in the same order.
const ix=(p,name,build)=>documentIndex(p,'runtime-model:'+name,build);
export function runtimeDependencyProjection(p,envId){return passRemember(p,'runtime-model:dependencies',envId,()=>dependenciesOf(p,envId)).map(d=>({...d}));}
function dependenciesOf(p,envId){
 const inputs=ix(p,'input-ids',()=>new Set([...p.realisation.components,...p.technologyRealisation.records].map(a=>a.id)));
 const list=inputs?null:[...p.realisation.components,...p.technologyRealisation.records],hasInput=id=>inputs?inputs.has(id):list.some(a=>a.id===id);
 const byEnv=ix(p,'plans-by-environment',()=>groupBy(p.runtime.plans,r=>r.environmentId)),env=p.runtime.environments.find(e=>e.id===envId);
 const ps=(byEnv?byEnv.get(envId)||[]:p.runtime.plans).filter(r=>r.environmentId===envId&&env?.assetIds.includes(r.assetId)&&hasInput(r.assetId));
 const routesByEnv=ix(p,'paths-by-environment',()=>groupBy(p.runtime.paths,r=>r.environmentId)),routes=routesByEnv?routesByEnv.get(envId)||[]:p.runtime.paths.filter(r=>r.environmentId===envId);
 const contracts=ix(p,'contracts',()=>firstById(p.interfaces.contracts)),contract=id=>contracts?contracts.get(id):p.interfaces.contracts.find(c=>c.id===id);
 const needMaps=ix(p,'mappings-by-need',()=>groupBy(p.technology.mappings,m=>m.needId)),realised=ix(p,'realisations-by-capability',()=>groupBy(p.technologyRealisation.mappings,m=>m.capabilityId));
 const mappingsOf=id=>needMaps?needMaps.get(id)||[]:p.technology.mappings.filter(m=>m.needId===id),realisationsOf=id=>realised?realised.get(id)||[]:p.technologyRealisation.mappings.filter(x=>x.capabilityId===id);
 const planOf=new Map();for(const r of ps)if(!planOf.has(r.assetId))planOf.set(r.assetId,r);
 const deps=[],seen=tupleSet(),of=id=>planOf.get(id),add=(from,to,source,mode='required',detail='',startup=mode==='required')=>{if(!from||from.id===to?.id||seen.has(from.id,to?.id||null,source))return;seen.add(from.id,to?.id||null,source);deps.push({from:from.id,to:to?.id||null,source,mode,detail,startup});};
 const needsByApp=ix(p,'needs-by-application',()=>{const at=new Map(p.technology.needs.map((n,i)=>[n,i]));return {at,m:groupBy(p.technology.needs,n=>n.applicationId)};});
 const relevant=needsByApp?[...new Set([...planOf.keys()].flatMap(id=>needsByApp.m.get(id)||[]))].sort((x,y)=>needsByApp.at.get(x)-needsByApp.at.get(y)):p.technology.needs;
 // Round 12: a need AIW proposed (DM-17) makes no dependency until a person keeps it; a need whose consequence is not
 // stated (DM-05) makes a dependency whose mode is not stated.
 const modeOf=n=>n.criticality==='essential'?'required':n.criticality===''?'':'buffered';
 for(const n of relevant){if(n.state==='proposed')continue;const a=of(n.applicationId);if(!a)continue;const mappings=mappingsOf(n.id);if(!mappings.length)add(a,null,n.id,modeOf(n),'No capability allocation is declared for this application need.');for(const m of mappings){const rs=realisationsOf(m.capabilityId);if(!rs.length)add(a,null,n.id,modeOf(n),'No realization is allocated to the supporting capability.');for(const rm of rs)add(a,of(rm.realizationId),n.id,modeOf(n),'Requires the realization of '+m.capabilityId+'.');}}
 // A project can have hundreds of environments but only a few realizations in each. The critical capability list is
 // project-wide; index its realized sources once, then read only sources that have a plan in this environment. Keep
 // the dependency and source-mapping ordinal so the returned relationships retain exactly their prior order.
 const critical=ix(p,'critical-dependencies-by-realization',()=>{const by=new Map();p.technology.dependencies.forEach((d,order)=>{
  if(!d.critical||!['dependency','trust'].includes(d.type))return;
  const b=realisationsOf(d.to);realisationsOf(d.from).forEach((x,sourceOrder)=>{let rows=by.get(x.realizationId);if(!rows)by.set(x.realizationId,rows=[]);rows.push({d,b,x,order,sourceOrder});});
 });return by;});
 if(critical){
  const relevant=[...planOf.keys()].flatMap(id=>critical.get(id)||[]).sort((a,b)=>a.order-b.order||a.sourceOrder-b.sourceOrder);
  for(const {d,b,x} of relevant){if(!b.length)add(of(x.realizationId),null,d.id,'required','Supporting capability has no realization.');for(const y of b)add(of(x.realizationId),of(y.realizationId),d.id,'required',d.label);}
 }else for(const d of p.technology.dependencies.filter(d=>d.critical&&['dependency','trust'].includes(d.type))){const a=realisationsOf(d.from),b=realisationsOf(d.to);for(const x of a){if(!b.length)add(of(x.realizationId),null,d.id,'required','Supporting capability has no realization.');for(const y of b)add(of(x.realizationId),of(y.realizationId),d.id,'required',d.label);}}
 // Round 12 (GR-RUN-06): a path is a start-up dependency only when it says it is needed at start-up; a call is not.
 for(const route of routes){if(route.state==='proposed')continue;const c=contract(route.contractId);if(!c)continue;const a=of(c.from),b=of(c.to);if(a&&hasInput(c.to))add(a,b,route.id,route.mode,route.failureResponse||'Runtime exchange policy needs definition.',route.startup==='needed');}
 return deps;
}
