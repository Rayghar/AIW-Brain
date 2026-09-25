import {withRealisation,components,component,componentSources,componentSourceChanged,realisationHandoffCurrent} from './realisation-domain.js';
import {logicalGraph} from './logical-domain.js';
import {decisionCurrent,governanceLabel} from './decisions-domain.js';
import {targetText,targetIsMeasurable} from './quality-domain.js';

export const TECHNOLOGY_CATEGORIES=[['compute','Compute'],['transactional','Transactional storage'],['messaging','Messaging'],['caching','Caching'],['connectivity','Connectivity'],['identity','Identity'],['observability','Observability'],['backup','Backup'],['recovery','Recovery']];
export const DEPENDENCY_TYPES=[['dependency','Required service'],['data','Data movement'],['trust','Trust enforcement'],['resilience','Recovery dependency']];
const clean=(v,n=4000)=>typeof v==='string'?v.trim().slice(0,n):'',sig=v=>JSON.stringify(v),pad=n=>String(n).padStart(3,'0'),unique=v=>[...new Set(Array.isArray(v)?v.filter(x=>typeof x==='string'):[])];
// Compact change detection only; access control never depends on this fingerprint.
function fingerprint(value){const text=sig(value);let a=2166136261,b=2246822507;for(let i=0;i<text.length;i++){const code=text.charCodeAt(i);a=Math.imul(a^code,16777619);b=Math.imul(b^code,3266489909);}return 'fp1:'+text.length+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);}
const compactSnapshot=value=>typeof value==='string'&&value.startsWith('fp1:')?value:fingerprint(JSON.parse(value));
export const capabilities=p=>p.technology?.capabilities||[];
export const capability=(p,id)=>capabilities(p).find(c=>c.id===id);
export const categoryName=id=>TECHNOLOGY_CATEGORIES.find(x=>x[0]===id)?.[1]||id;
export const needsFor=(p,id)=>p.technology.needs.filter(n=>n.applicationId===id);
export const supports=(p,id)=>p.technology.mappings.filter(m=>m.capabilityId===id);
const spec={
 compute:{title:'Application execution',purpose:'Execute application responsibilities within bounded, observable workloads.',boundary:'Own workload execution and resource isolation; financial authority remains with the application.',need:'Execute this component with workload isolation and controlled restart.',owner:'Platform architecture'},
 transactional:{title:'Transactional persistence',purpose:'Retain authoritative application state with explicit consistency and commit boundaries.',boundary:'Own durable state, unique references, and atomic updates. Do not imply ownership of an external core ledger.',need:'Persist this component’s authoritative records and original references consistently.',owner:'Data platform architecture'},
 messaging:{title:'Durable work handoff',purpose:'Carry acknowledged work and events across independently running components.',boundary:'Own durable delivery and redelivery semantics. The consumer still guards repeat financial effects.',need:'Dispatch durable work with explicit acknowledgement and duplicate-safe consumption.',owner:'Integration architecture'},
 caching:{title:'Disposable read acceleration',purpose:'Reduce repeated reads while keeping the source of truth explicit.',boundary:'Hold disposable derived values. Never use a cache-only check to authorise a financial effect.',need:'Accelerate repeat reads while preserving the authoritative record and a bypass path.',owner:'Application architecture'},
 connectivity:{title:'Service connectivity',purpose:'Route controlled requests between channels, application services, and external boundaries.',boundary:'Own routing, admission, and bounded connection behaviour; contracts remain with their producers.',need:'Reach required services with bounded timeouts and explicit failure responses.',owner:'Network architecture'},
 identity:{title:'Identity and access decisions',purpose:'Establish caller identity and enforce the authority to act at each protected boundary.',boundary:'Own authentication and entitlement decisions, credential lifecycle, and auditable denial.',need:'Enforce caller and service authority without treating an unavailable control as permission.',owner:'Identity architecture'},
 observability:{title:'Correlated operational evidence',purpose:'Retain and retrieve the evidence needed to explain behaviour across the payment journey.',boundary:'Own correlated telemetry and alerts; financial records retain their authoritative owner.',need:'Correlate events and failures using the original payment reference and alert an owner.',owner:'Operations architecture'},
 backup:{title:'Recoverable state copies',purpose:'Preserve restorable copies with an explicit retention and integrity policy.',boundary:'Own recoverable copies and verification. A successful copy is not proof of a successful restore.',need:'Retain recoverable copies of required state with an agreed loss boundary.',owner:'Data protection architecture'},
 recovery:{title:'Controlled service recovery',purpose:'Coordinate restoration and reconciliation before a service resumes financial work.',boundary:'Own recovery sequencing, evidence, and authority to resume; do not infer that a timeout means failure.',need:'Restore a usable service and reconcile uncertain outcomes before any controlled replay.',owner:'Service continuity architecture'}
};
function appSnapshot(p,id){const c=component(p,id);return fingerprint({component:c&&{id:c.id,revision:c.revision,needs:c.technologyNeeds,boundary:c.boundary,changed:componentSourceChanged(p,c)},sources:c?componentSources(p,id):null});}
export const needChanged=(p,n)=>n.sourceSnapshot!==appSnapshot(p,n.applicationId);
export function technologySources(p,id){
 const c=capability(p,id),ns=supports(p,id).map(m=>p.technology.needs.find(n=>n.id===m.needId)).filter(Boolean),apps=[...new Set(ns.map(n=>n.applicationId))].map(id=>component(p,id)).filter(Boolean),ss=apps.map(a=>componentSources(p,a.id));
 const byId=xs=>[...new Map(xs.map(x=>[x.id,x])).values()];
 return {needs:ns,applications:apps,logical:byId(ss.flatMap(s=>s.logical)),requirements:byId(ss.flatMap(s=>s.requirements)),drivers:byId([...ss.flatMap(s=>s.drivers),...p.quality.drivers.filter(d=>c?.driverIds.includes(d.id))]),decisions:byId([...ss.flatMap(s=>s.decisions),...p.decisions.records.filter(d=>c?.decisionIds.includes(d.id))])};
}
function capabilitySnapshot(p,c){const s=technologySources(p,c.id);return fingerprint({needs:s.needs.map(n=>({id:n.id,description:n.description,category:n.category,criticality:n.criticality,changed:needChanged(p,n)})),applications:s.applications.map(a=>appSnapshot(p,a.id)),drivers:s.drivers,decisions:s.decisions.map(d=>({id:d.id,revision:d.revision,status:d.status,rationale:d.rationale}))});}
export const capabilityChanged=(p,c)=>c.sourceSnapshot!==capabilitySnapshot(p,c);
export const technologyStamp=p=>sig({technology:p.technology.version,application:p.realisation.version,logical:p.logical.version,requirements:p.contentVersion,quality:p.quality.version,decisions:p.decisions.version});
const intakeStamp=p=>sig(components(p).map(c=>appSnapshot(p,c.id)));
export const technologyIntakeCurrent=p=>p.technology.intake?.stamp===intakeStamp(p);
export const technologyReviewCurrent=p=>p.technology.review?.stamp===technologyStamp(p);
export const technologyHandoffCurrent=p=>p.technology.handoff?.stamp===technologyStamp(p);
export const simulationCurrent=(p,s)=>s?.stamp===technologyStamp(p);
const baseCategories={
 'api-pod':['compute','transactional','connectivity','identity','observability','backup'],
 'risk-engine':['compute','transactional','identity','observability','backup'],
 'core-adapter':['compute','connectivity','identity','observability'],
 worker:['compute','transactional','messaging','connectivity','identity','observability','backup','recovery'],
 'notify-worker':['compute','messaging','connectivity','identity','observability']
};
const cues={compute:/runtime|execut|schedul|worker/i,transactional:/stor|persist|durab|record/i,messaging:/queue|dispatch|event|messag/i,caching:/cach/i,connectivity:/connect|enquir|integrat|network/i,identity:/auth|identity|access/i,observability:/monitor|audit|alert|evidence|correlat/i,backup:/backup|copies/i,recovery:/recover|restore|reconcil/i};
function addNeeds(p,c,seedMappings=false){
 const t=p.technology,cats=baseCategories[c.id]||TECHNOLOGY_CATEGORIES.filter(([id])=>cues[id].test(c.technologyNeeds)).map(([id])=>id);
 for(const category of cats){const n={id:'TN-'+pad(++t.counters.need),applicationId:c.id,category,description:spec[category].need,criticality:category==='caching'||category==='observability'?'degraded':'essential',confirmed:false,origin:baseCategories[c.id]?'reference':'suggestion',sourceSnapshot:appSnapshot(p,c.id)};t.needs.push(n);if(seedMappings){const cap=t.capabilities.find(c=>c.category===category);t.mappings.push({id:'TM-'+pad(++t.counters.mapping),needId:n.id,capabilityId:cap.id,scope:n.description,origin:'reference'});}}
 t.applicationBoundaries[c.id]='tb-002';t.knownApplications.push(c.id);
}
export function withTechnology(input){
 const p=withRealisation(input);
 if(!p.technology){
  p.technology={schemaVersion:1,version:1,counters:{capability:0,need:0,mapping:0,dependency:0,boundary:3},capabilities:[],needs:[],mappings:[],dependencies:[],boundaries:[{id:'tb-001',ref:'TB-001',title:'Channel entry',owner:'Channel security architecture',policy:'Authenticate the caller and authorise the instruction before crossing into payment services.'},{id:'tb-002',ref:'TB-002',title:'Payment services',owner:'Application security architecture',policy:'Use explicit service identities and least-privilege access across component boundaries.'},{id:'tb-003',ref:'TB-003',title:'Restricted state',owner:'Data security architecture',policy:'Restrict state and key access to named authorities; retain auditable access evidence.'}],applicationBoundaries:{},knownApplications:[],intake:null,review:null,handoff:null,simulations:[]};
  const t=p.technology;
  for(const [category] of TECHNOLOGY_CATEGORIES){const seq=++t.counters.capability,id={transactional:'postgres',messaging:'queue',connectivity:'gateway'}[category]||'tc-'+pad(seq);t.capabilities.push({id,ref:'TC-'+pad(seq),revision:1,category,...spec[category],source:'Illustrative logical technology capability; confirm with the project.',rationale:spec[category].need,status:'candidate',origin:'reference',boundaryId:['transactional','backup','identity'].includes(category)?'tb-003':category==='connectivity'?'tb-001':'tb-002',failureDomain:'Primary operating domain',continuity:category==='caching'?'bypass':'single',alternateDomain:'',continuityPlan:category==='caching'?'Read from the authority if the cache is unavailable.':'',recoveryPlan:'',recoveryOwner:'',recoveryMinutes:'',lossMinutes:'',targetsConfirmed:false,assumptions:'Confirm capacity, isolation, access policy, and recovery behaviour before selecting products.',assumptionsResolved:false,driverIds:[],decisionIds:[],history:[]});}
  for(const c of components(p))addNeeds(p,c,!!baseCategories[c.id]);
  const dep=(from,to,type,label,critical=false)=>t.dependencies.push({id:'TD-'+pad(++t.counters.dependency),from,to,type,label,critical,policy:'Illustrative dependency; verify the failure and trust boundary.',origin:'reference'});
  dep('tc-001','gateway','dependency','requires service reachability',true);dep('gateway','tc-006','trust','requires access decisions',true);dep('tc-001','tc-007','data','emits correlated operational evidence');dep('queue','tc-007','data','reports delivery and failure evidence');
  for(const c of t.capabilities)c.sourceSnapshot=capabilitySnapshot(p,c);
 }else{
  // Preserve any earlier review state while compacting pre-release snapshots.
  const t=p.technology;
  for(const n of t.needs)if(n.sourceSnapshot&&!n.sourceSnapshot.startsWith('fp1:'))n.sourceSnapshot=compactSnapshot(n.sourceSnapshot);
  for(const c of t.capabilities)if(c.sourceSnapshot&&!c.sourceSnapshot.startsWith('fp1:')){const old=JSON.parse(c.sourceSnapshot);old.applications=old.applications.map(compactSnapshot);c.sourceSnapshot=fingerprint(old);}
  if(t.intake?.stamp){const old=JSON.parse(t.intake.stamp);if(old.some(v=>!v.startsWith('fp1:')))t.intake.stamp=sig(old.map(compactSnapshot));}
  const unknown=components(p).filter(c=>!p.technology.knownApplications.includes(c.id));
  if(unknown.length){for(const c of unknown)addNeeds(p,c);p.technology.version++;p.technology.review=null;p.technology.handoff=null;}
 }
 return p;
}
export function technologyFindings(p){
 const t=p.technology,fs=[],add=(code,id,title,detail,level='error',extra={})=>fs.push({id:code+':'+id,code,objectId:id,title,detail,level,...extra}),g=logicalGraph(p),ids=new Set(g.nodes.map(n=>n.id));
 if(!technologyIntakeCurrent(p))add('intake','project','Review the application handoff','Application needs or their upstream rationale have changed.','warning');
 for(const a of components(p))if(!needsFor(p,a.id).length)add('no-needs',a.id,'Define technology needs for '+a.ref,'Review the application’s capability needs before treating it as supported.');
 for(const n of t.needs){
  if(!component(p,n.applicationId))add('broken-application',n.id,'Repair '+n.id+' application link','The source application is missing.');
  if(!n.description)add('need-description',n.applicationId,'Describe '+n.id,'State what this application needs from '+categoryName(n.category)+'.');
  if(!n.confirmed||needChanged(p,n))add('need-review',n.applicationId,'Review '+n.id+' application need','Confirm this need against the current application definition.','warning',{needId:n.id,id:'need-review:'+n.id});
  if(!t.mappings.some(m=>m.needId===n.id&&capability(p,m.capabilityId)))add('unsupported',n.applicationId,'Support '+n.id+' · '+categoryName(n.category),n.description,'error',{needId:n.id,id:'unsupported:'+n.id});
 }
 for(const m of t.mappings){const n=t.needs.find(n=>n.id===m.needId),c=capability(p,m.capabilityId);if(!n||!c)add('broken-mapping',m.capabilityId,'Repair '+m.id,'The capability or application need is missing.');else{if(!m.scope)add('mapping-scope',c.id,'Explain '+m.id,'Describe how this capability fulfils the application need.');if(n.category!==c.category)add('mapping-fit',c.id,'Explain the category fit for '+m.id,categoryName(c.category)+' is mapped to a '+categoryName(n.category)+' need. Confirm the scope or choose a matching capability.','warning');}}
 const essentialCaps=new Set(t.mappings.filter(m=>t.needs.some(n=>n.id===m.needId&&n.criticality==='essential')).map(m=>m.capabilityId));
 for(let i=0;i<t.capabilities.length;i++){const before=essentialCaps.size;for(const d of t.dependencies)if(d.critical&&['dependency','trust'].includes(d.type)&&essentialCaps.has(d.from))essentialCaps.add(d.to);if(before===essentialCaps.size)break;}
 for(const c of capabilities(p)){
  const s=technologySources(p,c.id),essential=essentialCaps.has(c.id);
  if(!c.purpose||!c.boundary||!c.owner||!c.rationale||!c.source)add('definition',c.id,'Define '+c.ref+' · '+c.title,'Complete its purpose, owned boundary, owner, rationale, and source.');
  if(!s.needs.length&&!t.dependencies.some(d=>d.from===c.id||d.to===c.id))add('unused',c.id,'Justify '+c.ref,'This capability has no application mapping or dependency. Confirm whether it belongs in the design.','warning');
  if(capabilityChanged(p,c))add('source-change',c.id,'Review changed rationale for '+c.ref,'A supporting application need, quality driver, or decision changed.');
  if(!s.drivers.length)add('driver',c.id,'Link a quality driver to '+c.ref,'Use an application mapping or an explicit quality-driver reference.','warning');
  if(!s.decisions.length)add('decision',c.id,'Record the decision behind '+c.ref,'Link a recorded decision or carry the open question into Chapter 3.','warning');
  else if(s.decisions.some(d=>!decisionCurrent(p,d)))add('decision-review',c.id,'Review supporting decisions for '+c.ref,'Draft or changed decisions remain visible but do not justify an approved technology choice.','warning');
  if(c.driverIds.some(id=>!p.quality.drivers.some(d=>d.id===id))||c.decisionIds.some(id=>!p.decisions.records.some(d=>d.id===id)))add('broken-source',c.id,'Repair source references for '+c.ref,'A named quality driver or decision is missing.');
  if(!t.boundaries.some(b=>b.id===c.boundaryId))add('trust',c.id,'Set a trust boundary for '+c.ref,'Choose the policy boundary controlling this capability.');
  if(!c.failureDomain)add('domain',c.id,'Name the failure domain for '+c.ref,'State which capabilities could be lost together.');
  if(essential&&c.continuity==='single')add('single-point',c.id,'Single support path · '+c.title,'Essential application needs depend on one declared capability path. Record the continuity arrangement or carry the risk explicitly.','warning');
  if(c.continuity==='redundant'&&(!c.alternateDomain||c.alternateDomain.trim().toLowerCase()===c.failureDomain.trim().toLowerCase()||!c.continuityPlan))add('isolation',c.id,'Clarify independent continuity for '+c.ref,'Name a different alternate failure domain and explain how service continues. Two copies in the same domain are not independent.');
  if(c.continuity==='bypass'&&!c.continuityPlan)add('bypass',c.id,'Define the safe bypass for '+c.ref,'Explain which behaviour can continue safely without the capability.');
  if(c.continuity==='bypass'&&['identity','transactional'].includes(c.category))add('unsafe-bypass',c.id,'Review a critical bypass for '+c.ref,'Identity and authoritative state must not fail open. Describe a controlled redundant path or explicit unavailability.');
  if(['transactional','messaging'].includes(c.category)){
   if(!c.recoveryPlan||!c.recoveryOwner||c.recoveryMinutes===''||c.lossMinutes==='')add('recovery-plan',c.id,'Define recovery for '+c.ref,'Record restoration steps, an accountable owner, and explicit recovery-time and data-loss assumptions.');
   if(!t.dependencies.some(d=>d.from===c.id&&d.type==='resilience'&&capability(p,d.to)?.category==='backup'))add('backup',c.id,'Link recoverable copies for '+c.ref,'Show which backup capability supplies restorable state.','error');
   if(!t.dependencies.some(d=>d.from===c.id&&d.type==='resilience'&&capability(p,d.to)?.category==='recovery'))add('recovery-path',c.id,'Link recovery coordination for '+c.ref,'Show which capability owns the restoration dependency.','warning');
  }
  if((c.recoveryMinutes!==''||c.lossMinutes!=='')&&!c.targetsConfirmed)add('target-assumption',c.id,'Confirm recovery assumptions for '+c.ref,'Recovery-time and data-loss numbers remain assumptions until reviewed against evidence.','warning');
  if(c.assumptions&&!c.assumptionsResolved)add('assumption',c.id,'Resolve assumptions for '+c.ref,c.assumptions,'warning');
  if(c.status!=='reviewed')add('review',c.id,'Review '+c.ref+' capability design','Reference and suggested content require a project review.','warning');
 }
 for(const b of t.boundaries)if(!b.title||!b.owner||!b.policy)add('boundary-policy',b.id,'Define '+b.ref+' trust policy','Name the owner and the rule for crossing this boundary.');
 for(const d of t.dependencies){if(!ids.has(d.from)||!ids.has(d.to))add('broken-dependency',d.id,'Repair '+d.id,'A relationship endpoint is missing.','error',{dependencyId:d.id});if(!d.policy)add('dependency-policy',d.from,'Explain '+d.id+' boundary behaviour','Record the exchange, access obligation, or recovery policy.','error',{dependencyId:d.id});if(d.type==='resilience'){const a=capability(p,d.from),b=capability(p,d.to);if(a&&b&&a.failureDomain&&a.failureDomain===b.failureDomain)add('shared-recovery-domain',a.id,'Separate recovery dependencies for '+a.ref,'The primary and recovery capability share a declared failure domain. A domain loss may remove both.','warning',{dependencyId:d.id});}}
 // Directed critical prerequisite cycles make start-up and recovery order unclear.
 const critical=t.dependencies.filter(d=>d.critical&&['dependency','trust'].includes(d.type));
 for(const c of capabilities(p)){const pending=critical.filter(d=>d.from===c.id).map(d=>d.to),seen=new Set();while(pending.length){const id=pending.pop();if(id===c.id){add('cycle',c.id,'Review a circular prerequisite for '+c.ref,'Critical prerequisites loop back to this capability; state a viable start-up and recovery order.');break;}if(seen.has(id))continue;seen.add(id);pending.push(...critical.filter(d=>d.from===id).map(d=>d.to));}}
 return fs;
}
export function technologyMilestones(p){const fs=technologyFindings(p),t=p.technology,none=codes=>!fs.some(f=>codes.includes(f.code));return [
 {id:'intake',name:'Review application inputs',detail:components(p).length+' inherited components',done:technologyIntakeCurrent(p)},
 {id:'needs',name:'Clarify capability needs',detail:t.needs.filter(n=>n.confirmed&&!needChanged(p,n)).length+' / '+t.needs.length+' needs reviewed',done:t.needs.length>0&&none(['no-needs','need-description','need-review'])},
 {id:'support',name:'Support each application need',detail:t.mappings.length+' support mappings',done:t.needs.length>0&&none(['unsupported','broken-mapping','mapping-scope'])},
 {id:'define',name:'Explain the capabilities',detail:capabilities(p).length+' vendor-neutral capabilities',done:capabilities(p).length>0&&none(['definition','source-change','broken-source','trust','domain'])},
 {id:'resilience',name:'Describe recovery and trust',detail:'Continuity, state protection, and access policies',done:capabilities(p).length>0&&none(['recovery-plan','backup','isolation','bypass','unsafe-bypass','dependency-policy','boundary-policy','cycle'])},
 {id:'simulate',name:'Explore two failure scopes',detail:['capability','domain'].filter(mode=>t.simulations.some(s=>s.mode===mode&&simulationCurrent(p,s))).length+' / 2 failure scopes reviewed',done:['capability','domain'].every(mode=>t.simulations.some(s=>s.mode===mode&&simulationCurrent(p,s)))},
 {id:'validate',name:'Validate the logical technology',detail:fs.filter(f=>f.level==='error').length+' content gaps',done:technologyReviewCurrent(p)&&!fs.some(f=>f.level==='error')},
 {id:'handoff',name:'Carry forward to Chapter 7',detail:'Stable technology references and open findings',done:technologyHandoffCurrent(p)}
];}

function saveNeeds(p,raw){
 const t=p.technology,a=component(p,raw.applicationId);if(!a)throw Error('Choose an existing application component.');
 const entries=Array.isArray(raw.needs)?raw.needs:[];if(!entries.length)throw Error('Define at least one capability need for this application.');
 if(new Set(entries.map(n=>n.category)).size!==entries.length||entries.some(n=>!spec[n.category]))throw Error('Use each capability category once.');
 if(!t.boundaries.some(b=>b.id===raw.boundaryId))throw Error('Choose a trust boundary for the application.');
 const previous=needsFor(p,a.id),kept=[];
 for(const input of entries){const old=previous.find(n=>n.category===input.category);const description=clean(input.description);if(!description)throw Error('Describe each selected application need.');const n={id:old?.id||'TN-'+pad(++t.counters.need),applicationId:a.id,category:input.category,description,criticality:['essential','degraded','optional'].includes(input.criticality)?input.criticality:'essential',origin:old?.origin||'user',confirmed:raw.confirmed===true,sourceSnapshot:appSnapshot(p,a.id)};kept.push(n);}
 t.needs=t.needs.filter(n=>n.applicationId!==a.id).concat(kept);const valid=new Set(t.needs.map(n=>n.id));t.mappings=t.mappings.filter(m=>valid.has(m.needId));t.applicationBoundaries[a.id]=raw.boundaryId;return a.id;
}
function saveCapability(p,raw,at){
 const t=p.technology,old=raw.id?capability(p,raw.id):null;if(raw.id&&!old)throw Error('This capability no longer exists.');if(!clean(raw.title,160)||!spec[raw.category])throw Error('Name the capability and choose its category.');
 if(!old&&t.capabilities.length>=60)throw Error('This prototype supports up to 60 technology capabilities.');
 const driverIds=unique(raw.driverIds),decisionIds=unique(raw.decisionIds);if(driverIds.some(id=>!p.quality.drivers.some(d=>d.id===id))||decisionIds.some(id=>!p.decisions.records.some(d=>d.id===id)))throw Error('Choose existing quality drivers and decisions.');
 if(raw.boundaryId&&!t.boundaries.some(b=>b.id===raw.boundaryId))throw Error('Choose an existing trust boundary.');
 const maps=Array.isArray(raw.mappings)?raw.mappings:[];if(new Set(maps.map(m=>m.needId)).size!==maps.length||maps.some(m=>!t.needs.some(n=>n.id===m.needId)))throw Error('Map each existing application need only once.');
 const seq=old?null:++t.counters.capability,c={id:old?.id||'tc-'+pad(seq),ref:old?.ref||'TC-'+pad(seq),revision:(old?.revision||0)+1,category:raw.category,origin:old?.origin||raw.origin||'user',status:['draft','candidate','reviewed'].includes(raw.status)?raw.status:'draft',driverIds,decisionIds,boundaryId:raw.boundaryId||'',continuity:['single','redundant','bypass'].includes(raw.continuity)?raw.continuity:'single',targetsConfirmed:raw.targetsConfirmed===true,assumptionsResolved:raw.assumptionsResolved===true,history:old?[...old.history,{at,revision:old.revision,title:old.title,purpose:old.purpose,continuity:old.continuity,recoveryPlan:old.recoveryPlan}].slice(-30):[]};
 for(const field of ['title','purpose','boundary','owner','rationale','source','failureDomain','alternateDomain','continuityPlan','recoveryPlan','recoveryOwner','assumptions'])c[field]=clean(raw[field],field==='title'?160:field==='owner'?180:4000);
 for(const field of ['recoveryMinutes','lossMinutes']){const v=raw[field];if(v!==''&&v!=null&&(!Number.isFinite(Number(v))||Number(v)<0||Number(v)>5256000))throw Error('Recovery assumptions must be non-negative numbers in minutes.');c[field]=v===''||v==null?'':String(Number(v));}
 if(c.status==='reviewed'&&(!c.purpose||!c.boundary||!c.owner||!c.source||!c.rationale||!c.boundaryId||!c.failureDomain))throw Error('Complete the capability definition, rationale, owner, trust boundary, and failure domain before review.');
 const previous=supports(p,c.id);t.mappings=t.mappings.filter(m=>m.capabilityId!==c.id);
 for(const m of maps){const prior=previous.find(x=>x.needId===m.needId);t.mappings.push({id:prior?.id||'TM-'+pad(++t.counters.mapping),capabilityId:c.id,needId:m.needId,scope:clean(m.scope),origin:prior?.origin||'user'});}
 if(old)t.capabilities[t.capabilities.indexOf(old)]=c;else t.capabilities.push(c);c.sourceSnapshot=capabilitySnapshot(p,c);return c;
}
function saveDependency(p,raw){
 const t=p.technology,g=logicalGraph(p),old=raw.id?t.dependencies.find(d=>d.id===raw.id):null;if(raw.id&&!old)throw Error('This dependency no longer exists.');
 if(raw.from===raw.to||![raw.from,raw.to].every(id=>g.nodes.some(n=>n.id===id))||![raw.from,raw.to].some(id=>capability(p,id)))throw Error('Connect different existing objects, including a technology capability.');
 if(!DEPENDENCY_TYPES.some(([id])=>id===raw.type)||!clean(raw.label,180))throw Error('Choose a relationship type and explain its meaning.');
 if(['dependency','trust','resilience'].includes(raw.type)&&(!capability(p,raw.from)||!capability(p,raw.to)))throw Error('Prerequisite and recovery links connect capabilities; use application mappings and boundary membership for other support.');
 if(t.dependencies.some(d=>d.id!==old?.id&&d.from===raw.from&&d.to===raw.to&&d.type===raw.type))throw Error('This dependency already exists. Edit the existing relationship.');
 const d={id:old?.id||'TD-'+pad(++t.counters.dependency),from:raw.from,to:raw.to,type:raw.type,label:clean(raw.label,180),policy:clean(raw.policy),critical:['dependency','trust'].includes(raw.type)&&raw.critical===true,origin:old?.origin||'user'};
 if(old)t.dependencies[t.dependencies.indexOf(old)]=d;else t.dependencies.push(d);return d;
}
export function technologyProposal(p,key,objectId,needId){
 const t=p.technology;let c=capability(p,objectId),n=t.needs.find(n=>n.id===needId);
 if(key==='missing'){
  n=n||needsFor(p,objectId).find(n=>!t.mappings.some(m=>m.needId===n.id))||t.needs.find(n=>!t.mappings.some(m=>m.needId===n.id));if(!n)return null;
  const existing=t.capabilities.find(c=>c.category===n.category);c=existing||{...spec[n.category],category:n.category,title:spec[n.category].title,owner:spec[n.category].owner,source:'Suggested from '+n.id+'; review before application.',status:'candidate',origin:'suggestion',boundaryId:p.technology.applicationBoundaries[n.applicationId]||'tb-002',failureDomain:'Primary operating domain',continuity:'single',driverIds:[],decisionIds:[],assumptions:'Confirm capacity, isolation, and recovery boundaries.'};
  return {key,objectId,needId:n.id,record:c,mappings:[...supports(p,c.id),{needId:n.id,scope:n.description}],dependencies:[],reason:'No capability currently fulfils '+n.id+' for '+component(p,n.applicationId)?.ref+'.',effect:existing?'Proposes a support mapping to '+existing.ref+'. Existing definitions remain reviewable.':'Proposes one vendor-neutral capability and its application mapping.'};
 }
 c=c||capabilities(p).find(c=>['transactional','messaging'].includes(c.category));if(!c)return null;
 if(key==='isolate')return {key,objectId:c.id,record:{...c,continuity:'redundant',alternateDomain:c.alternateDomain||'Independent recovery domain',continuityPlan:c.continuityPlan||'Continue on an independently isolated path after health and consistency checks; stop financial writes when authority is uncertain.',status:'candidate',assumptionsResolved:false},mappings:supports(p,c.id),dependencies:[],reason:'A shared failure domain can remove several support paths together.',effect:'Proposes an independent continuity arrangement. This is a design assumption, not a failover test.'};
 if(key==='restore'){
  const backup=capabilities(p).find(x=>x.category==='backup'),recovery=capabilities(p).find(x=>x.category==='recovery');
  const deps=[backup&&{from:c.id,to:backup.id,type:'resilience',label:'restores a verified copy from',policy:'Verify the copy, restore consistency, and reconcile the original references before resuming.'},recovery&&{from:c.id,to:recovery.id,type:'resilience',label:'coordinates restoration through',policy:'A named recovery owner authorises restoration order and resumption.'}].filter(d=>d&&!t.dependencies.some(e=>e.from===d.from&&e.to===d.to&&e.type==='resilience'));
  return {key,objectId:c.id,record:{...c,recoveryPlan:c.recoveryPlan||'Restore a verified copy, re-establish consistency, reconcile pending instructions, and authorise resumption.',recoveryOwner:c.recoveryOwner||c.owner,status:'candidate',assumptionsResolved:false},mappings:supports(p,c.id),dependencies:deps,reason:'A durable store or queue still needs a recoverable copy and an owned restoration process.',effect:'Proposes recovery dependencies and an editable restoration plan. Time and data-loss targets require your input.'};
 }return null;
}
const timeFactor=unit=>/^(s|sec|second|seconds)$/i.test(unit?.trim())?1:/^(min|minute|minutes)$/i.test(unit?.trim())?60:/^(h|hour|hours)$/i.test(unit?.trim())?3600:null;
export function simulateTechnology(p,raw){
 const failed=capability(p,raw.capabilityId);if(!failed)throw Error('Choose a capability to simulate.');if(!['capability','domain'].includes(raw.mode))throw Error('Choose the failure scope.');
 const duration=Number(raw.durationMinutes);if(!Number.isFinite(duration)||duration<=0||duration>525600)throw Error('Enter a positive simulated outage duration in minutes.');
 if(raw.mode==='domain'&&!failed.failureDomain)throw Error('Name a failure domain before simulating its loss.');
 const states=new Map(),reasons=new Map();
 const losses=raw.mode==='domain'?capabilities(p).filter(c=>c.failureDomain.trim().toLowerCase()===failed.failureDomain.trim().toLowerCase()):[failed];
 for(const c of losses){const alternate=raw.mode==='domain'&&c.continuity==='redundant'&&c.alternateDomain&&c.alternateDomain.trim().toLowerCase()!==failed.failureDomain.trim().toLowerCase()&&c.continuityPlan;const bypass=c.continuity==='bypass'&&c.continuityPlan&&!['identity','transactional'].includes(c.category);states.set(c.id,alternate||bypass?'degraded':'unavailable');reasons.set(c.id,alternate?'Alternate domain declared; continuity remains an assumption.':bypass?'A safe bypass is declared; degraded behaviour needs evidence.':raw.mode==='domain'?'Shares the failed domain '+failed.failureDomain+'.':'The entire selected capability is unavailable.');}
 const precedence={degraded:1,unavailable:2};
 for(let i=0;i<capabilities(p).length;i++){let more=false;for(const d of p.technology.dependencies.filter(d=>d.critical&&['dependency','trust'].includes(d.type))){const state=states.get(d.to);if(state&&(!states.has(d.from)||precedence[state]>precedence[states.get(d.from)])){states.set(d.from,state);reasons.set(d.from,'Requires '+(capability(p,d.to)?.title||d.to)+' through '+d.id+'.');more=true}}if(!more)break;}
 const applications=[];
 for(const a of components(p)){const affected=needsFor(p,a.id).flatMap(n=>p.technology.mappings.filter(m=>m.needId===n.id&&states.has(m.capabilityId)).map(m=>({need:n,mapping:m,state:states.get(m.capabilityId)})));if(!affected.length)continue;const blocked=affected.some(x=>x.need.criticality==='essential'&&x.state==='unavailable');applications.push({id:a.id,ref:a.ref,title:a.title,state:blocked?'unavailable':'degraded',needs:affected.map(x=>({id:x.need.id,description:x.need.description,capabilityId:x.mapping.capabilityId,criticality:x.need.criticality}))});}
 const sources=[...applications.flatMap(a=>componentSources(p,a.id).drivers),...technologySources(p,failed.id).drivers],drivers=[...new Map(sources.map(d=>[d.id,d])).values()];
 const measurements=Array.isArray(raw.measurements)?raw.measurements:[];
 if(new Set(measurements.map(m=>m.driverId)).size!==measurements.length||measurements.some(m=>!drivers.some(d=>d.id===m.driverId)))throw Error('Use each affected quality driver once.');
 const assessments=drivers.map(d=>{const edit=measurements.find(m=>m.driverId===d.id),factor=timeFactor(d.unit);let value=edit?clean(String(edit.value??''),40):'',basis=edit?clean(edit.basis):'';
  if(!edit&&d.category==='recoverability'&&factor&&applications.some(a=>a.state==='unavailable')){value=String(duration*60/factor);basis='Assume investigation is blocked until the failed support is restored; review whether this matches the scenario conditions.';}
  let result='unassessed';if(value!==''&&(!Number.isFinite(Number(value))||Number(value)<0))throw Error('Simulated measurements must be non-negative numbers.');
  if(value!==''&&!basis)throw Error('Explain the basis for each assumed quality value.');
  if(value!==''&&targetIsMeasurable(d)){const v=Number(value),target=Number(d.targetValue),met=d.operator==='At most'?v<=target:d.operator==='At least'?v>=target:v===target;result=met?'met-assumption':'unmet-assumption';}
  return {driverId:d.id,title:d.title,metric:d.metric,target:targetText(d),targetConfirmed:d.targetConfirmed,unit:d.unit,value,basis,result};
 });
 return {capabilityId:failed.id,mode:raw.mode,durationMinutes:duration,failedDomain:raw.mode==='domain'?failed.failureDomain:null,capabilities:[...states].map(([id,state])=>({id,title:capability(p,id)?.title,state,reason:reasons.get(id)})),applications,assessments,simulated:true};
}
export function applyTechnologyCommand(input,command,at=new Date().toISOString()){
 const p=withTechnology(input),t=p.technology,raw=command.payload||{};let selected=null,changed=true;
 switch(command.type){
  case 'technology.needs':selected=saveNeeds(p,raw);break;
  case 'technology.capability':selected=saveCapability(p,raw,at).id;break;
  case 'technology.dependency':selected=saveDependency(p,raw).from;break;
  case 'technology.remove-dependency':if(!t.dependencies.some(d=>d.id===raw.id))throw Error('This dependency no longer exists.');t.dependencies=t.dependencies.filter(d=>d.id!==raw.id);break;
  case 'technology.boundary':{const old=raw.id?t.boundaries.find(b=>b.id===raw.id):null;if(raw.id&&!old)throw Error('This boundary no longer exists.');if(!clean(raw.title)||!clean(raw.owner)||!clean(raw.policy))throw Error('Name the boundary, accountable owner, and crossing policy.');const seq=old?null:++t.counters.boundary,b={id:old?.id||'tb-'+pad(seq),ref:old?.ref||'TB-'+pad(seq),title:clean(raw.title,160),owner:clean(raw.owner,180),policy:clean(raw.policy)};if(old)t.boundaries[t.boundaries.indexOf(old)]=b;else t.boundaries.push(b);selected=b.id;break;}
  case 'technology.proposal':{if(raw.reviewed!==true)throw Error('Review the proposed capability, mappings, and dependencies before acceptance.');const prop=technologyProposal(p,raw.key,raw.objectId,raw.needId);if(!prop)throw Error('This proposal is no longer needed. Review the current model.');const c=saveCapability(p,{...raw.record,id:prop.record.id,origin:prop.record.id?prop.record.origin:'suggestion',status:'candidate',mappings:raw.mappings||prop.mappings},at);for(const d of prop.dependencies)saveDependency(p,d);selected=c.id;break;}
  case 'technology.intake':changed=false;t.intake={at,stamp:intakeStamp(p),applicationHandoffCurrent:realisationHandoffCurrent(p)};break;
  case 'technology.simulation':{changed=false;if(raw.reviewed!==true||![0,1,2,3].every(i=>raw.visited?.includes(i)))throw Error('Walk through failure, propagation, target review, and recovery before recording.');const result=simulateTechnology(p,raw);t.simulations=[...t.simulations,{...result,at,stamp:technologyStamp(p)}].slice(-20);selected=result.capabilityId;break;}
  case 'technology.review':changed=false;t.review={at,stamp:technologyStamp(p),findings:technologyFindings(p).length};break;
  case 'technology.handoff':{changed=false;if(!technologyReviewCurrent(p))throw Error('Run checks on the current technology model first.');const fs=technologyFindings(p);if(fs.length&&raw.acknowledge!==true)throw Error('Acknowledge the findings and assumptions that travel to Chapter 7.');t.handoff={at,stamp:technologyStamp(p),capabilityRefs:capabilities(p).map(c=>c.ref),needIds:t.needs.map(n=>n.id),mappingIds:t.mappings.map(m=>m.id),applicationRefs:components(p).map(a=>a.ref),findings:fs};break;}
  default:throw Error('Unknown technology action.');
 }
 if(changed){t.version++;t.review=null;t.handoff=null;}return {document:p,selected};
}
export function exportTechnologyMarkdown(p){const t=p.technology,g=logicalGraph(p),label=id=>g.nodes.find(n=>n.id===id)?.title||id,fs=technologyFindings(p);return '# AIW V5 · Logical Technology\n\n'+p.name+' · Working architecture, pending review.\n\nVendor-neutral capabilities; products, sizing, and deployment choices remain for Chapter 7. Guidance is rule-based. Simulations and their numerical outcomes are assumptions, not runtime evidence.\n\n## Application needs\n\n'+t.needs.map(n=>'- '+n.id+' · '+component(p,n.applicationId)?.ref+' · '+categoryName(n.category)+' · '+n.criticality+' · '+(n.confirmed&&!needChanged(p,n)?'Reviewed':'Needs review')+'\n  '+n.description).join('\n')+'\n\n## Logical technology register\n\n'+capabilities(p).map(c=>{const s=technologySources(p,c.id);return '### '+c.ref+' · '+c.title+'\n\n'+c.category+' · Revision '+c.revision+' · '+c.status+' · '+c.origin+'\n\nPurpose: '+c.purpose+'\n\nOwned boundary: '+c.boundary+'\n\nOwner: '+c.owner+'\n\nRationale: '+c.rationale+'\n\nSource: '+c.source+(capabilityChanged(p,c)?' · INPUTS CHANGED':'')+'\n\nApplications: '+s.applications.map(a=>a.ref).join(', ')+'\n\nQuality drivers: '+s.drivers.map(d=>d.id+' '+targetText(d)+(d.targetConfirmed?'':' (assumption)')).join('; ')+'\n\nDecisions: '+s.decisions.map(d=>d.id+' · '+(decisionCurrent(p,d)?'Architect accepted':'Review needed')+' · '+governanceLabel(d,p)).join('; ')+'\n\nTrust boundary: '+label(c.boundaryId)+'\n\nFailure domain: '+c.failureDomain+' · Alternate: '+c.alternateDomain+'\n\nContinuity: '+c.continuity+' · '+c.continuityPlan+'\n\nRecovery: '+c.recoveryPlan+' · Owner: '+c.recoveryOwner+'\n\nRecovery time: '+(c.recoveryMinutes||'Unspecified')+' minutes · Data loss: '+(c.lossMinutes===''?'Unspecified':c.lossMinutes)+' minutes · '+(c.targetsConfirmed?'Targets confirmed':'Targets are assumptions')+'\n\nAssumptions: '+c.assumptions+'\n\n';}).join('')+'## Support mappings\n\nAll mapped capabilities are required for a need. Alternate paths are declared in the capability’s continuity arrangement.\n\n'+t.mappings.map(m=>'- '+m.id+' · '+m.needId+' → '+capability(p,m.capabilityId)?.ref+' · '+m.scope).join('\n')+'\n\n## Dependencies and trust\n\n'+t.dependencies.map(d=>'- '+d.id+' · '+label(d.from)+' → '+label(d.to)+' · '+d.type+' · '+d.label+' · '+(d.critical?'Critical prerequisite':'No automatic failure propagation')+'\n  '+d.policy).join('\n')+'\n\n'+t.boundaries.map(b=>'- '+b.ref+' · '+b.title+' · '+b.owner+' · '+b.policy).join('\n')+'\n\n## Failure simulations\n\n'+(t.simulations.map(s=>'- '+s.at+' · '+s.mode+' · '+label(s.capabilityId)+' · '+s.durationMinutes+' minutes · '+(simulationCurrent(p,s)?'Current model':'Earlier model')+'\n  Affected: '+s.applications.map(a=>a.ref+' '+a.state).join(', ')+'\n  '+s.assessments.map(a=>a.driverId+': '+a.result+'; assumed '+a.value+' '+a.unit+'; '+a.basis).join('\n  ')).join('\n')||'No simulation reviews recorded.')+'\n\n## Open findings\n\n'+fs.map(f=>'- '+f.level.toUpperCase()+' · '+f.title+': '+f.detail).join('\n')+'\n\n## Chapter 7 handoff\n\n'+(technologyHandoffCurrent(p)?'Current saved handoff':'Working preview; handoff needs review')+'\n\nCapability references: '+capabilities(p).map(c=>c.ref).join(', ')+'\n\nRetain logical capability identity when selecting and comparing real technologies. Open assumptions and findings remain attached.\n';}
