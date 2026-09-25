import {logicalGraph} from './logical-domain.js';
import {processElements,processTransitions} from './process-model.js';

export const journeyChapters=['','Requirements','Quality drivers','Decisions','Logical application','Application realisation','Logical technology','Technology realization','Interfaces & Data','Security','Deployment / Runtime','Review & Realize'];
const list=value=>Array.isArray(value)?value:[];

// A read-only index of the saved project. No proposed alternative becomes a saved link.
export function journeyIndex(p){
 const graph=logicalGraph(p),nodes=new Map(),edges=[],known=new Map(),edgeKeys=new Set();
 const register=(records,chapter)=>list(records).forEach(r=>known.set(r.id,{chapter,record:r}));
 register(p.artefacts,1);register(p.quality?.drivers,2);register(p.decisions?.records,3);
 register(p.processModel?.elements,4);register(p.processModel?.claims,11);
 register(p.logical?.groups,4);register(p.logical?.responsibilities,4);register(p.realisation?.components,5);
 register(p.technology?.capabilities,6);register(p.technology?.boundaries,6);
 register(p.technologyRealisation?.records,7);
 register(p.interfaces?.parties,8);register(p.interfaces?.contracts,8);register(p.interfaces?.data,8);
 register(p.security?.threats,9);register(p.security?.controls,9);
 register(p.runtime?.environments,10);register(p.runtime?.zones,10);register(p.runtime?.plans,10);register(p.runtime?.placements,10);
 const fallback={process:4,logical:4,physical:5,technology:6,interface:8,data:8,security:9,deployment:10};
 for(const n of graph.nodes){const k=known.get(n.id);nodes.set(n.id,{...n,chapter:k?.chapter||fallback[n.layer],record:k?.record});}
 for(const [id,{chapter,record:r}] of known)if(chapter<=3||!nodes.has(id))nodes.set(id,{id,ref:r.ref||id,title:r.title||r.question||r.topic,chapter,record:r});
 const add=(from,to,label)=>{if(from===to||!nodes.has(from)||!nodes.has(to)||edgeKeys.has(from+'\u0000'+to+'\u0000'+label))return;edgeKeys.add(from+'\u0000'+to+'\u0000'+label);edges.push({from,to,label});};
 for(const e of graph.edges)add(e.from,e.to,e.label);
 for(const e of list(p.relationships))add(e.from,e.to,e.kind||'related');
 for(const e of processTransitions(p))add(e.from,e.to,e.label||'conditional transition');
 for(const e of list(p.processModel?.claims)){const transition=processTransitions(p).find(t=>t.id===e.subjectId);add(e.id,transition?.from||e.subjectId,'asserts');}
 for(const e of list(p.processModel?.elements))for(const id of list(e.requirementIds))add(id,e.id,'motivates process');
 for(const q of list(p.quality?.drivers)){for(const id of list(q.requirementIds))add(id,q.id,'quality scenario');for(const id of list(q.responsibilityIds))add(q.id,id,'constrains');}
 for(const d of list(p.decisions?.records)){for(const id of list(d.requirementIds))add(id,d.id,'design question');for(const id of list(d.driverIds))add(id,d.id,'comparison criterion');}
 for(const r of list(p.logical?.responsibilities)){for(const id of list(r.requirementIds))add(id,r.id,'fulfilled by');for(const id of list(r.decisionIds))add(id,r.id,'informs boundary');}
 for(const r of list(p.logical?.responsibilities))if(r.groupId)add(r.groupId,r.id,'groups responsibility');
 for(const c of [...list(p.realisation?.components),...list(p.technology?.capabilities),...list(p.interfaces?.contracts),...list(p.security?.controls),...list(p.security?.threats)]){
  for(const id of list(c.requirementIds))add(id,c.id,'source requirement');
  for(const id of list(c.driverIds))add(id,c.id,'quality constraint');
  for(const id of list(c.decisionIds))add(id,c.id,'design rationale');
 }
 for(const r of p.assurance?.records||[]){nodes.set(r.id,{id:r.id,ref:r.id,title:r.title,chapter:r.kind==='capability'?4:r.kind==='value-outcome'?1:11,record:r});for(const id of [...r.requirementIds,...(r.objectIds||[])])add(id,r.id,r.kind);}
 for(const g of p.assurance?.groups||[]){nodes.set(g.id,{id:g.id,ref:g.id,title:g.title,chapter:4,record:g});for(const id of g.requirementIds)add(id,g.id,'capability group');}
 return {nodes,edges};
}

// Walk only toward the destination chapter. In particular, a shared capability
// cannot lead backwards into an unrelated application's requirements.
export function journeyTargets(index,sourceId,chapter){
 const source=index.nodes.get(sourceId);if(!source)return [];
 if(source.chapter===chapter)return [{node:source,path:[]}];
 const direction=Math.sign(chapter-source.chapter),queue=[{node:source,path:[]}],visited=new Set([sourceId]),found=[];
 while(queue.length){const here=queue.shift();for(const edge of index.edges){
  if(edge.from!==here.node.id&&edge.to!==here.node.id)continue;
  const id=edge.from===here.node.id?edge.to:edge.from,n=index.nodes.get(id);if(!n||visited.has(id))continue;
  const delta=(n.chapter-here.node.chapter)*direction;
  // One context hop in Requirements lets an outcome or actor reach its requirement.
  const contextHop=here.path.length===0&&here.node.chapter===1&&n.chapter===1&&source.record?.type!=='requirement';
  if((delta<=0&&!contextHop)||(chapter-n.chapter)*direction<0)continue;
  visited.add(id);const next={node:n,path:[...here.path,{from:here.node.id,to:id,label:edge.label,edgeFrom:edge.from,edgeTo:edge.to}]};
  if(n.chapter===chapter)found.push(next);else queue.push(next);
 }}
 return found.sort((a,b)=>a.path.length-b.path.length||String(a.node.ref||a.node.id).localeCompare(String(b.node.ref||b.node.id)));
}
export function journeyObjectURL(node,tab='model'){
 const query=new URLSearchParams({chapter:String(node.chapter),tab});
 query.set(node.chapter===1?'artefact':node.chapter===2?'driver':node.chapter===3?'decision':'object',node.id);
 return '/?'+query;
}
export function journeyStatus(n){
 const r=n.record;if(!r)return 'Model context';
 if(n.chapter===3)return (r.status||'draft')+' decision';
 if(r.origin==='reference'&&!r.confirmed)return 'Illustrative reference';
 if(n.chapter===2&&!r.targetConfirmed)return 'Target assumption';
 return r.confirmed?'User reviewed':r.status||'Working definition';
}
