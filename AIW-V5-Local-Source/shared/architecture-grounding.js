// One reader for historical object graphs and the bounded, indexed method
// packet. Decoding restores declarations; it never reassesses an alternative.
const VERSION='aiw-architecture-grounding-2';
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const fail=message=>{throw Object.assign(Error('Architecture method packet: '+message),{code:'invalid_architecture_grounding'});};
const list=(value,name)=>value===undefined?[]:Array.isArray(value)?value:fail(name+' must be an array.');
const text=(value,name)=>typeof value==='string'?value:fail(name+' must be text.');
const index=(pool,key,name)=>Number.isInteger(key)&&key>=0&&key<pool.length&&Object.hasOwn(pool,key)?pool[key]:fail(name+' has an invalid reference.');
const safeKey=key=>typeof key==='string'&&!['__proto__','constructor','prototype'].includes(key);

export function decodeArchitectureGrounding(input){
 let source;try{source=typeof input==='string'?JSON.parse(input):input;}catch{fail('invalid JSON.');}
 if(!object(source))fail('expected a method object.');
 if(source.encodingVersion&&source.encodingVersion!==VERSION)fail('unsupported encoding version.');
 const compact=source.encodingVersion===VERSION||Object.hasOwn(source,'checkPool');
 const texts=list(source.textPool,'textPool'),answers=source.task?.answers||{},active=new Set();let visited=0;
 const resolve=(value,depth=0)=>{
  if(depth>48||++visited>100000)fail('reference expansion exceeds the bounded reader.');
  if(value===null||typeof value!=='object')return value;
  if(active.has(value))fail('cyclic reference.');active.add(value);
  let out;
  if(Array.isArray(value))out=value.map(v=>resolve(v,depth+1));
  else if(Object.hasOwn(value,'textRef')||Object.hasOwn(value,'answer')){
   if(Object.keys(value).length!==1)fail('a prose reference must have exactly one key.');
   if(Object.hasOwn(value,'textRef'))out=resolve(index(texts,value.textRef,'textRef'),depth+1);
   else{if(!safeKey(value.answer)||!Object.hasOwn(answers,value.answer))fail('answer reference is missing.');out=resolve(answers[value.answer],depth+1);}
   text(out,'Referenced prose');
  }else{out={};for(const [key,v]of Object.entries(value)){if(!safeKey(key))fail('unsupported object key.');out[key]=resolve(v,depth+1);}}
  active.delete(value);return out;
 };
 const p=resolve(source);
 const rows=(values,columns,name)=>{
  const cols=list(columns,name+' columns');
  if(new Set(cols).size!==cols.length||cols.some(k=>!safeKey(k)))fail(name+' has invalid columns.');
  return list(values,name).map(value=>{
   if(object(value))return {...value};
   if(!Array.isArray(value)||!cols.length||value.length>cols.length)fail(name+' has an invalid table row.');
   return Object.fromEntries(value.flatMap((v,i)=>v===null?[]:[[cols[i],v]]));
  });
 };
 const pool=(key)=>rows(p[key+'Pool'],p[key+'Columns'],key+'Pool');
 const stem={checks:'check',nodes:'node',edges:'edge',effects:'effect',obligations:'obligation',placement:'placement'};
 const take=(g,key)=>{
  const refs=g[stem[key]+'Refs'];if(refs===undefined)return rows(g[key],[],'graph '+key);
  if(g[key]!==undefined)fail('graph '+key+' mixes object and indexed forms.');
  const values=pool(stem[key]);
  return list(refs,key+'Refs').map(ref=>({...index(values,ref,key+'Refs')}));
 };
 const ids=list(p.idPool,'idPool'),kinds=list(p.nodeKindPool,'nodeKindPool'),relations=list(p.relationshipPool,'relationshipPool');
 const graph=g=>{
  if(!object(g))fail('graph must be an object.');
  const out={...g,checks:take(g,'checks'),effects:take(g,'effects'),placement:take(g,'placement'),obligations:take(g,'obligations'),nodes:take(g,'nodes'),edges:take(g,'edges')};
  for(const key of ['checks','effects','placement','obligations','nodes','edges'])delete out[stem[key]+'Refs'];
  for(const check of out.checks){text(check.id,'Check id');text(check.detail,'Check detail');if(!['known','unknown','blocked'].includes(check.state))fail('check state is invalid.');check.fieldKeys=list(check.fieldKeys,'Check fields');}
  for(const e of out.effects){text(e.quality,'Effect quality');text(e.why,'Effect reason');}
  if(g.nodeRefs!==undefined)out.nodes=out.nodes.map(n=>({...n,id:text(index(ids,n.id,'Node id'),'Node id'),kind:text(index(kinds,n.kind,'Node kind'),'Node kind')}));
  if(g.edgeRefs!==undefined)out.edges=out.edges.map(e=>({from:text(index(ids,e.from,'Edge from'),'Edge from'),to:text(index(ids,e.to,'Edge to'),'Edge to'),kind:text(index(relations,e.relationship,'Edge relationship'),'Edge relationship')}));
  out.obligations=out.obligations.map(o=>{
   if(o.placementRef!==undefined){o.placement={...index(rows(p.obligationPlacementPool,p.obligationPlacementColumns,'Obligation placement'),o.placementRef,'Obligation placement')};delete o.placementRef;}
   if(o.sourceIdRefs!==undefined){o.sourceIds=list(o.sourceIdRefs,'Obligation sources').map(i=>text(index(ids,i,'Obligation source'),'Obligation source'));delete o.sourceIdRefs;}
   return o;
  });
  if(compact){
   const nodes=new Map(out.nodes.map(n=>[n.id,n])),prefix=p.checkNodePrefix||'condition:';
   for(const c of out.checks)nodes.set(prefix+c.id,{id:prefix+c.id,kind:prefix==='criterion:'?'criterion':'prerequisite',label:c.title||c.id,state:c.state});
   for(const q of out.placement)nodes.set('placement:'+q.role,{id:'placement:'+q.role,kind:'placement',label:q.responsibility,role:q.role,hostRole:q.hostRole||'',componentId:q.componentId||'',scope:q.scope});
   for(const o of out.obligations)nodes.set('obligation:'+o.id,{id:'obligation:'+o.id,kind:'design-obligation',label:o.title,state:o.status,obligationKind:o.kind});
   out.nodes=[...nodes.values()];
  }
  return out;
 };
 const shared=graph(p.sharedByEveryAlternative||{}),graphs=list(p.graphs,'graphs').map(graph);
 for(const g of graphs)text(g.optionId,'Alternative id');
 const sources=list(p.sources,'sources').map(s=>{
  if(!object(s))fail('source must be an object.');const out={...s};
  if(s.postureRef!==undefined){out.posture=text(index(list(p.sourcePosturePool,'sourcePosturePool'),s.postureRef,'Source posture'),'Source posture');delete out.postureRef;}
  if(s.passages!==undefined)out.passages=rows(s.passages,p.passageColumns,'Source passages');return out;
 });
 if(compact){
  const nodes=new Map(shared.nodes.map(n=>[n.id,n]));
  for(const s of sources)nodes.set(s.id,{id:s.id,kind:'source',label:s.title});
  for(const r of list(p.governedKnowledge,'governedKnowledge'))if(r.sourceId&&!nodes.has(r.sourceId))nodes.set(r.sourceId,{id:r.sourceId,kind:'source',label:r.path||r.sourceId});
  shared.nodes=[...nodes.values()];
 }
 const task=p.task?{...p.task}:null;
 if(task){
  const driverPathPool=rows(p.driverPathPool,p.driverPathColumns,'Driver path pool'),driverPathKinds=list(p.driverPathKinds,'Driver path kinds');
  task.drivers=list(task.drivers,'Task drivers').map(d=>{
   if(!d.scope||d.scope.paths===undefined&&d.scope.pathRefs===undefined)return d;
   if(d.scope.paths!==undefined&&d.scope.pathRefs!==undefined)fail('driver paths mix direct and indexed forms.');
   const values=d.scope.pathRefs===undefined?rows(d.scope.paths,p.driverPathColumns,'Driver paths'):list(d.scope.pathRefs,'Driver path refs').map(ref=>({...index(driverPathPool,ref,'Driver path ref')}));
   const paths=values.map(path=>path.kindIndex===undefined?path:{kind:text(index(driverPathKinds,path.kindIndex,'Driver path kind'),'Driver path kind'),from:d.id,to:path.to,...(path.via===undefined?{}:{via:path.via})});
   const {pathRefs,...scope}=d.scope;return {...d,scope:{...scope,paths}};
  });
  for(const g of [shared,...graphs])for(const n of g.nodes)if(n.kind==='driver'){const d=task.drivers.find(d=>d.id===n.id);if(d)Object.assign(n,{driverKind:d.kind,category:d.category});}
  if(task.solution){
   const s={...task.solution},selected=graphs.find(g=>g.optionId===s.optionId),obligations=[...shared.obligations,...(selected?.obligations||[])],effects=[...shared.effects,...(selected?.effects||[])];
   s.placement=rows(s.placement,s.placementColumns,'Solution placement');
   s.alternatives=rows(s.alternatives,s.alternativeColumns,'Solution alternatives');
   s.obligations=rows(s.obligations,s.obligationColumns,'Solution obligations').map(o=>{
    const base=o.methodObligationId?obligations.find(x=>x.id===o.methodObligationId):null;
    const effect=o.methodEffectQuality?effects.find(x=>x.quality===o.methodEffectQuality):null;
    if((o.methodObligationId&&!base)||(o.methodEffectQuality&&!effect))fail('saved obligation method reference is missing.');
    return {...(base?{kind:base.kind,action:base.detail,evidence:base.verification,fieldKeys:base.fieldKeys,sourceIds:base.sourceIds}:effect?{kind:'verification',action:effect.quality+': '+effect.why,evidence:effect.verify}:{}),driverIds:s.driverIds||[],...o};
   });
   s.specifications=rows(s.specifications,s.specificationColumns,'Solution specifications').map(value=>{if(value.obligationRefs!==undefined){value.obligationIds=list(value.obligationRefs,'Solution obligation refs').map(i=>index(s.obligations,i,'Solution obligation').id);delete value.obligationRefs;}return value;});
   task.solution=s;
  }
 }
 return {...p,task,sources,graphs,sharedByEveryAlternative:shared};
}
