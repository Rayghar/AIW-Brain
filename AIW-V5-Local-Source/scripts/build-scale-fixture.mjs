// Scale fixtures, three of them.
// buildScaleFixture(): a large project through the normal command path (audit F2-03): a new project from the
// reference journey, then `count` Chapter 4 objects, each sent as its own /api/commands request with the revision the
// previous save returned, exactly as the workbench does. Nothing goes through /api/recovery, so every record passed
// the command validators. The browser gate (scale-browser-validate.mjs) wants a responsibility list that fits one Work
// page (50 rows) and a connections register that pages, so the fixture fills the responsibilities to WORK_PAGE (the
// reference journey already holds 5, so 45 new) and makes up the rest with logical.connection records (uniquely
// labelled), which the Chapter 4 model draws as routes. A workspace keeps up to 500 responsibilities (round 5).
//   node scripts/build-scale-fixture.mjs --base http://127.0.0.1:4173 [--count 300] [--name "Scale fixture"]
// Prints JSON: {id, name, revision, responsibilities, connections, url, ms}.
// buildRecoveryFixture(): the audit's own large project, restored through /api/recovery (below).
// buildScaleProject(): 500 records in each of Chapters 1–10, in memory, through the chapters' own command appliers
// (below; the scale gate, scale-validate.mjs). From the command line it writes the document to a file, or restores it
// on a running workbench through /api/recovery for a browser probe:
//   node scripts/build-scale-fixture.mjs --memory [--per 500] [--out scale.json] [--base http://127.0.0.1:4173]
import {projectURL} from '../public/project-context.js';

const GROUPS=['GRP-001','GRP-002','GRP-003'];
export const WORK_PAGE=50;
export async function buildScaleFixture({base,count=300,name='Scale fixture · '+count+' objects',fetchImpl=globalThis.fetch,log=()=>{}}={}){
  if(!base)throw Error('Give the workbench base URL (--base http://127.0.0.1:PORT).');
  const started=Date.now();
  const origin=new URL(base).origin;
  const json=async(path,body,method=body?'POST':'GET')=>{
    const r=await fetchImpl(origin+path,{method,headers:body?{'Content-Type':'application/json',Origin:origin}:{Origin:origin},body:body?JSON.stringify(body):undefined});
    const data=await r.json();if(!r.ok)throw Error(path+' → '+(data.error||r.status));return data;
  };
  const created=await json('/api/projects',{name,template:'bank-payment',brief:'Generated through the command path for the scale gate.'});
  const id=created.document.id;let revision=created.revision;
  const command=async(type,payload)=>{const result=await json(projectURL('/api/commands',id),{revision,command:{type,payload}});revision=result.revision;return result;};
  const existing=(await json(projectURL('/api/project',id))).document.logical.responsibilities.map(r=>r.id);
  const newResponsibilities=Math.max(0,Math.min(count,WORK_PAGE-existing.length));
  const ids=[];
  for(let i=1;i<=newResponsibilities;i++){
    const result=await command('logical.responsibility',{title:'Scale responsibility '+String(i).padStart(3,'0'),purpose:'Owns step '+i+' of the generated journey and its enquiries.',boundary:'Keeps the reference for step '+i+'; never replays a financial effect.',owner:'Operations team '+(i%7+1),source:'Scale fixture generator',groupId:GROUPS[i%GROUPS.length],requirementIds:['REQ-00'+(i%4+1)],decisionIds:[],confirmed:i%3===0});
    ids.push(result.selected);if(i%50===0)log(i+' responsibilities');
  }
  // Connections: a chain through the new responsibilities, then cross-links over all of them, each with its
  // own label (the validator refuses a duplicate from→to→label).
  const all=[...existing,...ids];let connections=0;const wanted=Math.max(0,count-ids.length);
  for(let i=0;i<wanted;i++){
    const from=all[i%all.length],to=i<ids.length-1?ids[i+1]:all[(i*7+3)%all.length];
    if(from===to)continue;
    await command('logical.connection',{from,to,label:'link '+String(i+1).padStart(3,'0')+(i<ids.length-1?' hands over':' informs'),kind:i%2?'flow':'trace',condition:i%5?'':'Only after link '+(i+1)+' completes'});connections++;if(connections%50===0)log(connections+' connections');
  }
  return {id,name,revision,responsibilities:ids.length,connections,objects:ids.length+connections,url:projectURL('/?chapter=4&tab=work',id),ms:Date.now()-started};
}
// The audit's own large project (round 2, §3.2): the reference document with `count` extra responsibilities and
// count−1 connections, restored as a new project through /api/recovery (preview, then a reviewed restore). The
// restore validates the document as a whole, not each record against the per-command caps (500 responsibilities
// since round 5); it exercises list paging and SVG culling.
export async function buildRecoveryFixture({base,count=300,name='Scale recovery · '+count+' responsibilities',fetchImpl=globalThis.fetch}={}){
  const origin=new URL(base).origin,started=Date.now();
  const json=async(path,body)=>{const r=await fetchImpl(origin+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json',Origin:origin}:{Origin:origin},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(path+' → '+(data.error||r.status));return data;};
  const {document:doc}=await json('/api/project');
  const r0=doc.logical.responsibilities[0],c0=doc.logical.connections[0],extra=[];
  for(let i=1;i<=count;i++){const n=String(i).padStart(3,'0');extra.push({...structuredClone(r0),id:'lr-scale-'+n,ref:'LR-S'+n,title:'Scale responsibility '+i,purpose:'Owns step '+i+' of the generated journey.'});}
  doc.logical.responsibilities.push(...extra);
  for(let i=0;i<count-1;i++)doc.logical.connections.push({...structuredClone(c0),id:'lc-scale-'+String(i+1).padStart(3,'0'),from:extra[i].id,to:extra[i+1].id,label:'link '+(i+1)});
  const preview=await json('/api/recovery?action=preview',{package:doc});
  const restored=await json('/api/recovery?action=restore',{package:doc,hash:preview.hash,name,reviewed:true});
  return {id:restored.id,name,responsibilities:doc.logical.responsibilities.length,connections:doc.logical.connections.length,ms:Date.now()-started};
}
// restoreScaleProject(): a built document restored as a new project on a running workbench through /api/recovery
// (preview, then a reviewed restore), for a browser probe. Returns {id, name, ms}.
export async function restoreScaleProject({base,document,name=document?.name||'Scale fixture',fetchImpl=globalThis.fetch}={}){
  if(!base||!document)throw Error('Give the workbench base URL and the document to restore.');
  const origin=new URL(base).origin,started=Date.now();
  const json=async(path,body)=>{const r=await fetchImpl(origin+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(path+' → '+(data.error||r.status));return data;};
  const preview=await json('/api/recovery?action=preview',{package:document});
  const restored=await json('/api/recovery?action=restore',{package:document,hash:preview.hash,name,reviewed:true});
  return {id:restored.id,name,url:projectURL('/?chapter=4&tab=work',restored.id),ms:Date.now()-started};
}
// ---------------------------------------------------------------- the 500-per-chapter project, in memory (round 5, R5-G)
// buildScaleProject(): the reference journey grown to `perChapter` records in each of Chapters 1–10 through the
// chapters' own command appliers, one command per record, exactly as reconciliation-validate.mjs and
// notation-fixtures.mjs build theirs, so every record passed its validator and the caps are what refuse the next one.
// The linking is the shape of a real programme: each requirement is needed by a journey step and serves an outcome;
// each quality driver and decision answers a requirement; each responsibility fulfils a requirement under a decision
// and hands over to the next; each component is allocated a responsibility and feeds the next; each component states
// a need that a capability meets, and each capability is realised once; each data definition has its key field and an
// authoritative component, and each contract joins two components with that data; each threat targets a data record
// and a control answers it; each environment runs one component in its own zone with a placed replica. A fixed share
// of each chapter is left incomplete (no outcome, no owner, unconfirmed) so the findings are exercised too.
// Deterministic: the same perChapter gives the same document (fixed clock, no randomness).
export const SCALE_AT='2026-10-02T09:00:00.000Z';
const CHAPTER_COLLECTIONS={1:p=>p.artefacts.filter(a=>a.type==='requirement'),2:p=>p.quality.drivers,3:p=>p.decisions.records,4:p=>p.logical.responsibilities,5:p=>p.realisation.components,6:p=>p.technology.capabilities,7:p=>p.technologyRealisation.records,8:p=>[...p.interfaces.contracts,...p.interfaces.data],9:p=>[...p.security.threats,...p.security.controls],10:p=>[...p.runtime.environments,...p.runtime.placements]};
export const scaleCounts=p=>Object.fromEntries(Object.entries(CHAPTER_COLLECTIONS).map(([k,f])=>[k,f(p).length]));
export async function buildScaleProject({perChapter=500,handOff=true,log=()=>{}}={}){
  const [{seedProject,applyCommand},{withFinalReview},{applyQualityCommand},{applyDecisionCommand},{applyLogicalCommand},{applyRealisationCommand},{applyTechnologyCommand,TECHNOLOGY_CATEGORIES,PLATFORM_CATEGORIES},{applyTechnologyRealisationCommand},{applyInterfacesCommand},{applySecurityCommand,THREAT_CATEGORIES,CONTROL_CATEGORIES},{applyRuntimeCommand}]=await Promise.all(['requirements-domain','review-domain','quality-domain','decisions-domain','logical-domain','realisation-domain','technology-domain','technology-realisation-domain','interfaces-domain','security-domain','runtime-domain'].map(m=>import('../public/'+m+'.js')));
  // Each command's result is the next command's input and nothing else keeps it, so it is handed over: the next command
  // changes it in place rather than copying 12 MB first (document-memo.js handOver). handOff:false copies every time.
  const {handOver=d=>d}=await import('../public/document-memo.js'),give=handOff?handOver:d=>d;
  const at=SCALE_AT,N=perChapter,n3=i=>String(i).padStart(3,'0'),timings={};
  let p=withFinalReview(seedProject());p.name='Scale fixture · '+N+' per chapter';
  const run=(apply,type,payload)=>{const r=apply(give(p),{type,payload},at);p=r.document;return r.selected;};
  const chapter=(id,fn)=>{const t=performance.now();fn();p=withFinalReview(p);timings[id]=Math.round(performance.now()-t);log('Chapter '+id+' · '+timings[id]+' ms');};
  const fill=(have,make)=>{const out=[];for(let i=have+1;i<=N;i++)out.push(make(i));return out;};
  const pick=(xs,i)=>xs[i%xs.length];
  // Chapter 1: requirements, each needed by a journey step and serving an outcome (every 9th has no outcome yet).
  chapter(1,()=>{const journeys=p.artefacts.filter(a=>a.type==='journey').map(a=>a.id),outcomes=p.artefacts.filter(a=>a.type==='outcome').map(a=>a.id);
    fill(CHAPTER_COLLECTIONS[1](p).length,i=>run(applyCommand,'artefact',{type:'requirement',title:'Record instruction '+n3(i)+' with its reference',description:'The service accepts instruction '+i+', records it once with its reference, and returns the recorded outcome on enquiry.',acceptance:'Given instruction '+i+' is submitted twice with the same reference, when the second arrives, then the first recorded outcome is returned.',owner:'Payments team '+(i%7+1),source:'Scale fixture brief §'+(i%40+1),priority:['Must','Should','Could'][i%3],confirmed:i%4===0,links:[[pick(journeys,i),'requires','new'],...(i%9?[['new','supports',pick(outcomes,i)]]:[])]}));});
  const reqs=CHAPTER_COLLECTIONS[1](p).map(a=>a.id);
  // Chapter 2: quality drivers, each answering one requirement.
  chapter(2,()=>{const cats=['integrity','availability','performance','recoverability','security','traceability','scalability','maintainability'],refs=p.logical.responsibilities.map(r=>r.id);
    fill(p.quality.drivers.length,i=>run(applyQualityCommand,'quality.driver',{category:pick(cats,i),title:'Respond to instruction '+n3(i)+' within its target',priority:['Critical','Important','Supporting'][i%3],operator:'At most',targetValue:String(200+i%800),metric:'Response time at the 95th percentile',unit:'ms',stimulus:'A burst of instructions at '+(i%5+1)+' times the daily peak',conditions:'Normal operation with one dependency degraded',response:'Each instruction is recorded once and acknowledged',window:'Rolling 1 hour',measurement:'Load test against the recorded peak profile',rationale:'Instruction '+i+' carries a regulatory deadline.',owner:'Quality owner '+(i%5+1),source:'Scale fixture brief',confirmed:i%3===0,targetConfirmed:false,requirementIds:[pick(reqs,i)],responsibilityIds:[pick(refs,i)]}));});
  const drivers=p.quality.drivers.map(d=>d.id);
  // Chapter 3: decisions, each framed by a requirement and a driver; every 25th compares two alternatives.
  chapter(3,()=>{fill(p.decisions.records.length,i=>{const id=run(applyDecisionCommand,'decision.save',{question:'How should instruction '+n3(i)+' be recorded once?',context:'Repeated submissions of instruction '+i+' must not create a second effect.',topic:'custom',requirementIds:[pick(reqs,i)],driverIds:[pick(drivers,i)],owner:'Architecture lead '+(i%4+1),rationale:i%5?'Bind the reference to the recorded outcome.':'',assumptions:'',risks:'A cache-only check misses restarts.',mitigation:'Keep the result with the record.',source:'Scale fixture design workshop'});
      if(i%25===0)for(const title of ['Reference held with the record','Cache in front of the store'])run(applyDecisionCommand,'decision.alternative',{id,title,summary:title+' for instruction '+i+'.',benefits:'Clear ownership.',costs:'One more lookup.',consequences:'Reviewed in Chapter 4.',responsibilityIds:[],relationships:[]});
      return id;});});
  const decisions=p.decisions.records.map(d=>d.id);
  // Chapter 4: responsibilities, each fulfilling a requirement under a decision, chained by hand-overs from the journey.
  let resp=[];
  chapter(4,()=>{const groups=p.logical.groups.map(g=>g.id),first=p.logical.responsibilities[0].id;
    resp=fill(p.logical.responsibilities.length,i=>run(applyLogicalCommand,'logical.responsibility',{title:'Handle instruction '+n3(i),purpose:'Owns the recording of instruction '+i+' and its enquiries.',boundary:'Keeps the reference of instruction '+i+'; never replays a financial effect.',owner:i%11?'Operations team '+(i%7+1):'',source:'Scale fixture brief',groupId:pick(groups,i),requirementIds:[pick(reqs,i)],decisionIds:[pick(decisions,i)],confirmed:i%3===0&&i%11!==0}));
    resp.forEach((id,k)=>run(applyLogicalCommand,'logical.connection',{from:k?resp[k-1]:first,to:id,label:'hands over to',kind:'flow',condition:''}));});
  // Chapter 5: components, each allocated one responsibility and feeding the next.
  let comps=[];
  chapter(5,()=>{const kinds=['service','worker','adapter','queue','store','module'];
    comps=fill(p.realisation.components.length,i=>run(applyRealisationCommand,'realisation.component',{title:'Instruction '+n3(i)+' service',kind:pick(kinds,i),purpose:'Runs the recording of instruction '+i+'.',boundary:'Owns the instruction '+i+' record and its reference.',owner:'Delivery team '+(i%9+1),inputs:'Instruction '+i+' with its reference',outputs:'Recorded outcome of instruction '+i,rationale:'Allocated from its responsibility.',source:'Scale fixture design',technologyNeeds:'Compute and durable storage for the instruction record.',status:'draft',allocations:[{logicalId:resp[(i-1)%resp.length],scope:'All of the responsibility'}],dataIds:[],decisionIds:[pick(decisions,i)]}));
    comps.forEach((id,k)=>{if(k)run(applyRealisationCommand,'realisation.interaction',{from:comps[k-1],to:id,label:'passes the recorded instruction to',interaction:'data',condition:'',failure:''});});});
  // Chapter 6: each new component states a need; a capability meets it; capabilities depend on the next. The needs are
  // of the platform categories; an application platform (round 12, K: a packaged product weighed in Chapter 7 against
  // building the components it provides) is not one, so the project keeps the shape its budgets were measured at.
  let caps=[];
  chapter(6,()=>{const platforms=new Set(PLATFORM_CATEGORIES.map(c=>c[0])),cats=TECHNOLOGY_CATEGORIES.map(c=>c[0]).filter(c=>!platforms.has(c)),bounds=p.technology.boundaries.map(b=>b.id);
    comps.forEach((id,k)=>run(applyTechnologyCommand,'technology.needs',{applicationId:id,boundaryId:pick(bounds,k),needs:[{category:pick(cats,k),description:'Instruction component '+(k+1)+' needs '+pick(cats,k)+'.',criticality:'essential'}],confirmed:k%2===0}));
    const needs=comps.map(id=>p.technology.needs.find(n=>n.applicationId===id).id);
    caps=fill(p.technology.capabilities.length,i=>{const k=(i-1)%needs.length;return run(applyTechnologyCommand,'technology.capability',{title:'Capability for instruction '+n3(i),category:pick(cats,k),purpose:'Meets the stated need of component '+(k+1)+'.',boundary:'One shared platform service.',owner:'Platform team '+(i%6+1),rationale:'Sized for the instruction peak.',source:'Scale fixture platform catalogue',boundaryId:pick(bounds,i),failureDomain:'Region '+(i%3+1),alternateDomain:'',continuity:'single',status:'draft',driverIds:[pick(drivers,i)],decisionIds:[pick(decisions,i)],mappings:[{needId:needs[k],scope:'Whole need'}]});});
    caps.forEach((id,k)=>{if(k)run(applyTechnologyCommand,'technology.dependency',{from:caps[k-1],to:id,type:'dependency',label:'requires',policy:'Fail closed when unavailable.',critical:k%10===0});});});
  // Chapter 7: each capability realised once.
  chapter(7,()=>{fill(p.technologyRealisation.records.length,i=>run(applyTechnologyRealisationCommand,'techrealisation.plan',{title:'Realisation of capability '+n3(i),purpose:'Provides capability '+i+'.',owner:'Platform team '+(i%6+1),operationsPlan:i%4?'On-call platform rota.':'',accessPlan:'Service identities only.',dataPlan:'Encrypted at rest.',resiliencePlan:'Two zones.',interfacePlan:'Published contract.',lifecyclePlan:'Supported release train.',rationale:'',risks:'',assumptions:'',mappings:[{capabilityId:caps[(i-1)%caps.length],scope:'Whole capability'}]}));});
  // Chapter 8: data definitions with their key field (and a reference field on every fourth); contracts join two
  // consecutive components and carry that data.
  let data=[];
  chapter(8,()=>{data=fill(p.interfaces.data.length,i=>{const id=run(applyInterfacesCommand,'interfaces.data',{title:'Instruction record '+n3(i),purpose:'The recorded instruction '+i+'.',owner:'Data owner '+(i%5+1),authorityId:pick(comps,i),classification:['Internal','Confidential','Restricted'][i%3],retentionPolicy:i%6?'Kept for seven years, then deleted.':'',retentionBasis:'',retentionDays:'',protection:'Masked in support views.',evidence:'Scale fixture data catalogue',assumptions:''});
      run(applyInterfacesCommand,'interfaces.field',{id,field:{name:'recordId',type:'string',description:'Stable reference of instruction '+i+'.',key:true,required:true,classification:'Inherited',example:'demo-'+i}});
      if(i%4===0)run(applyInterfacesCommand,'interfaces.field',{id,field:{name:'reference',type:'string',description:'',classification:'Inherited'}});
      return id;});
    fill(p.interfaces.contracts.length,i=>{const k=(i-1)%comps.length;return run(applyInterfacesCommand,'interfaces.contract',{title:'Hand over instruction '+n3(i),kind:'request',from:comps[k],to:comps[(k+1)%comps.length],exchanges:[{dataId:data[(i-1)%data.length],role:'request'}],purpose:'Passes instruction '+i+' on.',owner:'Integration team '+(i%4+1),protocol:'HTTPS / JSON',operation:'POST /instructions/'+i,contractVersion:'1.0',correlationKey:'recordId',idempotencyKey:i%7?'recordId':'',duplicatePolicy:i%7?'Return the first recorded outcome.':'',timeoutMs:'',timeoutBasis:'',timeoutPolicy:'Keep pending; enquire before replay.',retryPolicy:'Retry after enquiry only.',failurePolicy:'Distinguish rejection from an unknown outcome.',authorization:'Service identity',transport:'mTLS',compatibility:'',evidence:'',assumptions:''});});});
  // Chapter 9: each threat targets a data record; each control protects it and answers the threat.
  chapter(9,()=>{const threats=fill(p.security.threats.length,i=>run(applySecurityCommand,'security.threat',{title:'Disclosure of instruction record '+n3(i),category:pick(THREAT_CATEGORIES,i),priority:['Critical','High','Moderate','Low'][i%4],targetIds:[data[(i-1)%data.length]],actor:'An operator without need to know',scenario:'Reads instruction '+i+' in a support view.',consequence:'Personal data escapes its audience.',owner:i%8?'Security officer '+(i%3+1):'',priorityBasis:'Regulated data.',assumptions:''}));
    fill(p.security.controls.length,i=>run(applySecurityCommand,'security.control',{title:'Mask instruction record '+n3(i),category:pick(CONTROL_CATEGORIES,i),failureMode:'Deny or contain',targetIds:[data[(i-1)%data.length]],threatIds:[threats[(i-1)%threats.length]],purpose:'Limits who reads instruction '+i+'.',owner:'Security officer '+(i%3+1),enforcement:'Support view',mechanism:'Field masking',failureResponse:'Deny the view.',telemetry:'Access log',verificationPlan:'Quarterly access review',operatingObligations:'',assumptions:''}));});
  // Chapter 10: each environment runs one component in its own zone with an active replica placed there.
  chapter(10,()=>{const bounds=p.technology.boundaries.map(b=>b.id),envs=fill(p.runtime.environments.length,i=>run(applyRuntimeCommand,'runtime.environment',{title:'Cell '+n3(i),stage:'Production design',purpose:'Runs instruction cell '+i+'.',owner:'Run team '+(i%5+1),basis:'Cell-based deployment.',confirmed:i%2===0,assetIds:[comps[(i-1)%comps.length]]}));
    for(const [k,environmentId] of envs.entries()){const zoneId=run(applyRuntimeCommand,'runtime.zone',{environmentId,title:'Cell '+(k+1)+' zone',owner:'Run team '+(k%5+1),failureDomain:'Region '+(k%3+1),isolation:'Own cluster.',boundaryId:pick(bounds,k)});
      const planId=p.runtime.plans.find(r=>r.environmentId===environmentId).id;run(applyRuntimeCommand,'runtime.placement',{planId,zoneId,role:'active',replicas:2,basis:'Peak plus one.',confirmed:k%3===0});}});
  return {document:p,timings,counts:scaleCounts(p),bytes:JSON.stringify(p).length};
}
// ---------------------------------------------------------------- the command line
const here=process.argv[1]&&import.meta.url.endsWith(process.argv[1].split('/').pop());
if(here&&process.argv.includes('--memory')){
  const arg=(flag,fallback)=>{const i=process.argv.indexOf(flag);return i>0?process.argv[i+1]:fallback;};
  const {writeFileSync}=await import('node:fs');
  const built=await buildScaleProject({perChapter:Number(arg('--per','500')),log:m=>console.error(m)});
  const out=arg('--out',null);if(out)writeFileSync(out,JSON.stringify(built.document));
  const base=arg('--base',process.env.AIW_BASE);const restored=base?await restoreScaleProject({base,document:built.document}):null;
  console.log(JSON.stringify({counts:built.counts,bytes:built.bytes,timings:built.timings,out,restored}));
}else if(here){
  const arg=(flag,fallback)=>{const i=process.argv.indexOf(flag);return i>0?process.argv[i+1]:fallback;};
  buildScaleFixture({base:arg('--base',process.env.AIW_BASE),count:Number(arg('--count','300')),name:arg('--name',undefined),log:m=>console.error(m)}).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exit(1);});
}
