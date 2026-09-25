// Security enriches the same model. Existing security object identities survive.
export function securityProjection(p,g){
 const m=p.security;if(!m)return g;
 const replaced=new Set(m.controls.map(c=>c.id)),nodes=g.nodes.filter(n=>!replaced.has(n.id));
 nodes.push(...m.controls.map((c,i)=>({id:c.id,ref:c.ref,layer:'security',col:c.col??i%5,title:c.title,sub:c.ref+' · '+c.category,description:c.purpose,securityControl:true,attrs:{Owner:c.owner||'Owner needed',Enforcement:c.enforcement||'To define',Failure:c.failureMode,State:'Control design · evidence recorded separately'}})));
 nodes.push(...m.threats.map((t,i)=>({id:t.id,ref:t.ref,layer:'security',col:i%5,title:t.title,sub:t.ref+' · '+t.priority,description:t.scenario,securityThreat:true,attrs:{Owner:t.owner||'Owner needed',Actor:t.actor||'To define',Consequence:t.consequence||'To define',Priority:t.priority,State:'Threat hypothesis · review required'}})));
 const edges=g.edges.filter(e=>!replaced.has(e.from)&&!replaced.has(e.to));
 for(const t of m.threats)for(const id of t.targetIds)edges.push({id:t.ref+'-target-'+id,from:t.id,to:id,label:'threatens',kind:'trace',securityKind:'exposure',threatId:t.id});
 for(const c of m.controls){for(const id of c.targetIds)edges.push({id:c.ref+'-target-'+id,from:c.id,to:id,label:'intended protection',kind:'trace',securityKind:'protection',controlId:c.id});for(const id of c.threatIds)edges.push({id:c.ref+'-threat-'+id,from:c.id,to:id,label:'addresses',kind:'trace',securityKind:'mitigation',controlId:c.id,threatId:id});}
 return {nodes,edges};
}
