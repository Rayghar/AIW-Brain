// Project-owned definitions enrich the existing model; original object IDs survive.
export function interfacesProjection(p,graph){
 const m=p.interfaces;if(!m)return graph;
 const enriched=new Set([...m.contracts,...m.data].map(r=>r.id));
 const nodes=graph.nodes.filter(n=>!enriched.has(n.id));
 nodes.push(...m.parties.map((r,i)=>({id:r.id,ref:r.ref,layer:'physical',col:i%5,title:r.title,sub:r.ref+' · External boundary',description:r.purpose,attrs:{Owner:r.owner||'Owner needed',Boundary:'External participant',Review:r.confirmed?'User confirmed':'Illustrative / working'}})));
 nodes.push(...m.contracts.map((r,i)=>({id:r.id,ref:r.ref,layer:'interface',col:r.col??i%5,title:r.title,sub:r.ref+' · '+r.kind,description:r.purpose,contract:true,attrs:{Owner:r.owner||'Owner needed',Operation:r.operation||'Define operation',Version:r.contractVersion||'Version needed',Protocol:r.protocol||'Protocol needed',Correlation:r.correlationKey||'Unspecified',State:r.review?'Review recorded · check currency':'Draft contract'}})));
 nodes.push(...m.data.map((r,i)=>({id:r.id,ref:r.ref,layer:'data',col:r.col??i%5,title:r.title,sub:r.ref+' · Data definition',description:r.purpose,dataDefinition:true,attrs:{Owner:r.owner||'Owner needed',Classification:r.classification,Key:r.fields.filter(f=>f.key).map(f=>f.name).join(', ')||'Key needed',Fields:r.fields.length,Retention:r.retentionPolicy||'Policy needed'}})));
 const sourceIds=new Set(m.contracts.map(c=>c.sourceId).filter(Boolean)),contractIds=new Set(m.contracts.map(c=>c.id));
 const edges=graph.edges.filter(e=>!sourceIds.has(e.id)&&!(contractIds.has(e.from)&&e.label==='implemented by'));
 for(const c of m.contracts){
  if(c.from)edges.push({id:c.ref+'-caller',from:c.from,to:c.id,label:c.kind==='event'?'publishes':'calls',kind:'flow',contractId:c.id});
  if(c.to)edges.push({id:c.ref+'-provider',from:c.id,to:c.to,label:c.kind==='event'?'delivers to':'provided by',kind:'flow',contractId:c.id});
  for(const x of c.exchanges)edges.push({id:x.id,from:x.role==='response'?c.id:x.dataId,to:x.role==='response'?x.dataId:c.id,label:x.role==='response'?'returns':c.kind==='event'?'carries event':'request shape',kind:'trace',contractId:c.id,exchange:true});
 }
 for(const d of m.data)if(d.authorityId)edges.push({id:d.ref+'-authority',from:d.id,to:d.authorityId,label:'authoritative in',kind:'trace',dataAuthority:true});
 for(const l of m.lineage)edges.push({...l,label:l.title,kind:'flow',dataLineage:true});
 return {nodes,edges};
}
