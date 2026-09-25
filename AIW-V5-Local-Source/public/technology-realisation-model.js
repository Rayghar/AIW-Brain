// Shared projection: realization identities remain visible in every chapter.
export function technologyRealisationProjection(p,g){
 const t=p.technologyRealisation;if(!t)return g;
 const nodes=[...g.nodes,...t.records.map((r,i)=>{const o=r.options.find(o=>o.id===r.selectedOptionId);return {id:r.id,ref:r.ref,layer:'technology',col:i%5,title:o?.product||o?.title||r.title,sub:r.ref+' · Realization',description:r.purpose,realization:true,attrs:{Boundary:r.title,'Preferred option':o?.title||'Compare options',Product:o?.product||'Unspecified',Owner:r.owner||'Unassigned','Operating model':o?.operatingModel||'Unspecified',State:r.recorded?'Recorded selection · check currency':'Working options'}};})];
 const edges=[...g.edges,...t.mappings.map(m=>({id:m.id,from:m.capabilityId,to:m.realizationId,label:'realized through',kind:'trace',realizationKind:'allocation',scope:m.scope})),...t.connections.map(c=>({...c,label:c.title,kind:'flow',realizationKind:'connection'}))];
 return {nodes,edges};
}
