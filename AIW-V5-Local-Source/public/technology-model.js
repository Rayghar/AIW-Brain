// Projection only: all chapters read the same saved identities and relationships.
export function technologyProjection(p,graph){
 const t=p.technology;if(!t)return graph;
 const ids=new Set(t.capabilities.map(c=>c.id));
 const nodes=[...graph.nodes.filter(n=>!ids.has(n.id)),...t.capabilities.map((c,i)=>({id:c.id,ref:c.ref,layer:'technology',col:i%5,title:c.title,sub:c.ref+' · '+c.category,description:c.purpose,category:c.category,attrs:{'Stable reference':c.ref,Capability:c.category,Owner:c.owner||'Owner needed','Failure domain':c.failureDomain||'Unspecified',Continuity:c.continuity,Review:c.status}})),...t.boundaries.map((b,i)=>({id:b.id,ref:b.ref,layer:'security',col:i%5,title:b.title,sub:b.ref+' · Trust boundary',description:b.policy,attrs:{Owner:b.owner,Boundary:b.title,Policy:b.policy}}))];
 const edges=[...graph.edges.map(e=>ids.has(e.from)||ids.has(e.to)?{...e,techKind:'data'}:e),...t.mappings.map(m=>{const need=t.needs.find(n=>n.id===m.needId);return {id:m.id,from:need?.applicationId||'missing',to:m.capabilityId,label:'requires '+(need?.category||'capability'),kind:'trace',techKind:'support',needId:m.needId,scope:m.scope}}),...t.dependencies.map(d=>({...d,kind:d.type==='data'?'flow':'trace',techKind:d.type})),...t.capabilities.filter(c=>c.boundaryId).map(c=>({id:'boundary-'+c.id,from:c.id,to:c.boundaryId,label:'within trust boundary',kind:'trace',techKind:'trust'})),...Object.entries(t.applicationBoundaries).map(([id,b])=>({id:'boundary-'+id,from:id,to:b,kind:'trace',label:'within trust boundary',techKind:'trust'}))];
 return {nodes,edges};
}
