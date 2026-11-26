// Declared failures, their evaluation and their acceptance by a second person (rc44, wp9a slice 2;
// audit/rc44/design/wp9a-deployment.md sections b.1, b.3, c.2, c.4, d.1, d.2 (H4, H5) and d.4): a part of the design
// package p30-deployment (topology.js assembles the parts). Pure: no clock but the `at` a command is handed.
//   Record    runtime.failures fs-NNN / FS-NNN {environmentId, title, scope, quantifier, domainIds, durationMinutes,
//             mustSurvive, mayDegrade, minimumService {continues, deferred, rejected, serviceRef}, exclusions,
//             acceptedCauseIds, inScope, owner, basis, open}: what the design claims to survive, saved as a patch with
//             who wrote each revision (actor, history: never trimmed) and recorded {at, actor, revision}. A draft by Sol
//             or an agent account sends one as its proposal and sets nothing in scope; only a person's save does.
//   Link      runtime.environment-link {id, recoversIds}: a recovery design environment names the environments it
//             recovers (C10-22); the environment's own save keeps it.
//   Reading   evaluateFailure(p, id): one loss case per domain the claim loses (lossCases, at most 64), each walked by
//             the one propagation (runtime-domain.js simulateRuntime with its lost set, hook H4), a plan of the same
//             asset in a linked recovery environment a recovery candidate; a calculated verdict with its bounds and what
//             it does not consider. A verdict reads no ancestor chain an unreviewed draft changed as confirmed (ruling
//             L11 (d)): it names those records, and the acceptance waits for a person to review them.
//   Step      runtime.failure-accept: a second person's acceptance or return, through S0's `second` row (verifierRefusal
//             and two persons at the boundary), kept under the claim's key `review` with the stamp it read; it lapses
//             when the stamp moves (a placement, a zone, a plan, a domain, a node, the claim). failureAccepted reads it.
//   Checks    Chapter 10: domain-shared (a stated cause two or more hosting zones share, not accepted in a claim a second
//             person accepted), failure-unsurvived (an error) and failure-unknown for a claim in scope. Held back until
//             their surface exists (slice 6; contract rule 11): a finding that asks for the acceptance, for a failure set,
//             for the minimum service.
//   Hooks     the slot of runtime-model.js (TOPOLOGY): zoneKey (ruling L2: zones that share a stated cause or lie in one
//             another's domain are one failure domain to the built-in checks, planFacts and the desk), standbyElsewhere
//             (H5) and lostFor (H4 at runtime.simulation).
import {TOPOLOGY,hostingZone,statedField} from './runtime-model.js';
import {simulateRuntime,runtimeEnvironmentStamp} from './runtime-domain.js';
import {patchFields,patchOpen} from './technology-domain.js';
import {isProposed} from './record-lifecycle.js';
import {verifierRefusal} from './architecture-obligations.js';
import {valueFingerprint} from './source-fingerprint.js';
import {remember,memoPass} from './document-memo.js';
import {list} from './util.js';
import {TRACKED,LABELS,topologyTyped,failureDomains,deploymentNodes,hostingComparison,zoneGroups,groupKey,zoneFails,failIndex,requireTyped,storeWritten,standingOf,draftedIds,draftedOf,DRAFT,pad,find,refOf,and,sharedCause,standing,patchBounded,authoredRecord,put,BOOKKEEPING} from './topology-domain.js';
import {failingGate} from './topology-gates.js';

export const FAILURE_SCOPES=['instance','zone','site','region','provider','shared-cause','correlated'],QUANTIFIERS=['any-one','named'];
// What one workspace keeps (rulings L8 and M9 (f): reached through the commands, the suite's case S3.9).
export const FAILURE_LIMITS=Object.freeze({failures:24,plans:48,domains:12,service:24,recovers:12});
// At most this many loss cases are evaluated for one claim; more answer unknown, and nothing is truncated (design d.1).
// This build writes at most 60 failure domains, so through the commands that bound binds first.
export const EVALUATION_BOUND=64;
const BOUNDS={cases:EVALUATION_BOUND,failures:'one at a time, unless the claim names a correlated set',counts:'copies only: no rate, latency or throughput'};
const CONSIDERED=['the zones and placements each case loses, by the typed failure domains they stand in and the nodes they sit in','the copies each plan keeps outside them, and its declared recovery','what each plan requires of another (the walkthrough\'s dependencies)','a plan of the same asset in a linked recovery environment'];
const NOT_CONSIDERED=['control-plane loss with cached authority','data consistency after promotion','health detection time','partial capacity loss','provider facts'];
const words=(v,n=2400)=>typeof v==='string'?v.trim().slice(0,n):'',stated=v=>v!==''&&v!=null&&Number.isFinite(Number(v)),num=v=>stated(v)?Number(v):0;
const failures=p=>list(p?.runtime?.failures),plansOf=(p,envId)=>list(p?.runtime?.plans).filter(r=>r?.environmentId===envId&&!isProposed(r));

// ---------------------------------------------------------------- the declared failure (Chapter 10)
const FS_FIELDS=[['title','t',160,'name of the declared failure'],['exclusions','t',2400,'exclusions'],['owner','t',180,'owner'],['basis','t',2400,'basis']];
const FS_WORDS={title:'The name of the declared failure is words: send it as text.',exclusions:'The exclusions are words: send them as text.',owner:'The owner is words: send it as text.',basis:'The basis is words: send it as text.'};
const FS_KEYS=['environmentId','title','scope','quantifier','domainIds','durationMinutes','mustSurvive','mayDegrade','minimumService','exclusions','acceptedCauseIds','inScope','owner','basis','open'],FS_OPEN=['durationMinutes','exclusions','owner','basis'];
const SERVICE=['continues','deferred','rejected'];
function saveFailure(p,raw,at,actor){
 requireTyped(p);
 const m=p.runtime,xs=m.failures||[],old=raw.id?find(xs,raw.id):null;if(raw.id&&!old)throw Error('Choose an existing declared failure.');
 for(const [f,w] of Object.entries(FS_WORDS))if(raw[f]!=null&&typeof raw[f]!=='string')throw Error(w);
 const pick=(f,d)=>raw[f]===undefined?old?.[f]??d:raw[f]??d;
 const environmentId=pick('environmentId',''),env=find(m.environments,environmentId);if(!env||isProposed(env))throw Error('Choose an existing environment for the declared failure.');
 const f=patchFields(old,raw,FS_FIELDS);if(!f.title)throw Error('Name the declared failure.');
 const scope=pick('scope',''),quantifier=pick('quantifier','any-one');
 if(!FAILURE_SCOPES.includes(scope))throw Error('Choose what the claim loses: an instance, a zone, a site, a region, a provider, a shared cause or a correlated set.');
 if(!QUANTIFIERS.includes(quantifier))throw Error('Choose whether the claim loses any one domain of its scope or the domains it names.');
 const domains=failureDomains(p),plans=list(m.plans),ref=id=>refOf(find(domains,id))||refOf(find(plans,id))||id;
 const ids=(field,noun,max)=>patchBounded(old,raw,field,()=>true,noun,max,'A declared failure');
 const domainIds=ids('domainIds','failure domains',FAILURE_LIMITS.domains),acceptedCauseIds=ids('acceptedCauseIds','shared causes',FAILURE_LIMITS.domains);
 if(raw.domainIds!==undefined)for(const id of domainIds){const d=authoredRecord(domains,id,'failure domain');if(scope==='shared-cause'&&!sharedCause(d))throw Error(d.ref+(d.cause==='location'?' is a location':' states no cause')+', not a shared cause: a shared-cause claim names causes.');}
 if(!domainIds.length&&scope==='correlated')throw Error('A correlated failure names the failure domains it loses together.');
 if(!domainIds.length&&quantifier==='named')throw Error('A claim of named domains names the failure domains it loses.');
 if(raw.acceptedCauseIds!==undefined)for(const id of acceptedCauseIds){const d=authoredRecord(domains,id,'failure domain');if(!sharedCause(d))throw Error(d.ref+(d.cause==='location'?' is a location':' states no cause')+', not a shared cause: a claim accepts shared causes only.');}
 {const lost=acceptedCauseIds.find(id=>domainIds.includes(id));if(lost)throw Error(ref(lost)+' is a cause the claim loses: it is not also accepted.');}
 const planList=field=>{const xs=ids(field,'runtime plans',FAILURE_LIMITS.plans);if(raw[field]!==undefined||environmentId!==old?.environmentId)for(const id of xs){const r=find(plans,id);if(!r||isProposed(r)||r.environmentId!==environmentId)throw Error('A claim names runtime plans of '+refOf(env)+': '+ref(id)+' is not one.');}return xs;};
 const mustSurvive=planList('mustSurvive'),mayDegrade=planList('mayDegrade');
 {const both=mustSurvive.find(id=>mayDegrade.includes(id));if(both)throw Error(ref(both)+' must survive or may degrade, not both.');}
 const durationMinutes=pick('durationMinutes','');if(durationMinutes!==''&&!(typeof durationMinutes==='number'&&Number.isInteger(durationMinutes)&&durationMinutes>=1&&durationMinutes<=525600))throw Error('State the duration in minutes, from 1 to 525,600, or leave it not stated.');
 const inScope=pick('inScope',false);if(typeof inScope!=='boolean')throw Error('Say whether the claim is in scope: true or false.');
 let minimumService=raw.minimumService===undefined?old?.minimumService:raw.minimumService;
 if(minimumService!=null){
  const ms=minimumService,known=new Set([...list(p.artefacts).filter(a=>a?.type==='requirement').map(a=>a.id),...list(p.logical?.responsibilities).map(r=>r?.id)]);
  if(typeof ms!=='object'||Array.isArray(ms))throw Error('State the minimum service as what continues, what is deferred and what is rejected.');
  if(ms.serviceRef!=null&&ms.serviceRef!=='')throw Error('A business service\'s degraded mode is not recorded in this build: leave the service reference not stated.');
  minimumService={};for(const k of SERVICE){const xs=ms[k]??[];if(!Array.isArray(xs)||xs.length>FAILURE_LIMITS.service)throw Error('The minimum service names up to 24 requirements and responsibilities for what continues, what is deferred and what is rejected.');const bad=xs.find(id=>!known.has(id));if(bad!==undefined)throw Error('The minimum service names requirements and responsibilities of this project: '+bad+' is neither.');minimumService[k]=[...new Set(xs)];}
  minimumService.serviceRef='';
 }
 const next={environmentId,title:f.title,scope,quantifier,domainIds,durationMinutes,mustSurvive,mayDegrade,...(minimumService?{minimumService}:{}),exclusions:f.exclusions,acceptedCauseIds,inScope,owner:f.owner,basis:f.basis},open=patchOpen(old,raw,FS_OPEN);if(open)next.open=open;
 if(!old&&xs.length>=FAILURE_LIMITS.failures)throw Error('This workspace keeps up to '+FAILURE_LIMITS.failures+' declared failures.');
 m.failures=xs;
 return storeWritten(xs,old,next,raw,at,actor,FS_KEYS,()=>{const n=m.counters.failure=(m.counters.failure||0)+1;return {id:'fs-'+pad(n),ref:'FS-'+pad(n)};});
}

// ---------------------------------------------------------------- a recovery environment's link (C10-22)
function linkEnvironment(p,raw){
 requireTyped(p);
 const m=p.runtime,e=find(m.environments,raw.id);if(!e)throw Error('Choose an existing environment.');
 if(raw.promotesToId!==undefined||raw.accountNodeId!==undefined)throw Error('This build records which environments a recovery environment recovers; the promotion order and the account come with a later build.');
 const ids=patchBounded(e,raw,'recoversIds',id=>!!find(m.environments,id),'environments',FAILURE_LIMITS.recovers,'A recovery environment');
 if(ids.includes(e.id))throw Error(refOf(e)+' does not recover itself.');
 if(ids.length&&e.stage!=='Recovery design')throw Error('Only a recovery design environment recovers another: '+refOf(e)+' is '+(e.stage?'a '+e.stage.toLowerCase():'one whose stage is not stated')+'.');
 if(JSON.stringify(ids)===JSON.stringify(list(e.recoversIds)))return {selected:e.id,changed:false};
 const next={...e,revision:(e.revision||0)+1};put(next,'recoversIds',ids);m.environments[m.environments.indexOf(e)]=next;
 return {selected:e.id,changed:true};
}
// The recovery design environments that name an environment as one they recover, standing.
const recoveringEnvironments=(p,envId)=>list(p?.runtime?.environments).filter(e=>e?.id!==envId&&!isProposed(e)&&e.stage==='Recovery design'&&list(e.recoversIds).includes(envId));

// ---------------------------------------------------------------- the loss cases
const hosting=(p,envId)=>list(p?.runtime?.zones).filter(z=>z?.environmentId===envId&&hostingZone(z)&&!isProposed(z));
const lostTitle=(p,ids,together)=>{const ds=failureDomains(p),say=id=>{const d=find(ds,id);return d?d.ref+' '+d.title:id;};return and(ids.map(say))+(together&&ids.length>1?' lost together':' lost');};
// What a case loses: every hosting zone (of any environment) that fails with a lost domain, and every placement in a
// zone it does not lose whose own nodes do; the records read on the way. (The fix-up's must-fix 6: read through the
// document's index of what each zone and placement fails with, once a set of domains: O(zones + placements) a case.)
const losing=(p,lost)=>remember(p,'topology:losing',lost.join('+'),()=>{
 const gone=new Set(lost),X=failIndex(p),zones=new Set(),placements=[],hit=xs=>xs.some(d=>gone.has(d.id));
 for(const [id,xs] of X.zones)if(hit(xs))zones.add(id);
 for(const [id,x] of X.placements)if(!zones.has(x.zoneId)&&hit(x.fails))placements.push(id);
 return {zones:[...zones],placements};
});
// One case for each domain the claim loses: any one of its scope that a hosting zone of the environment holding a
// placement fails with (a zone that fails with none reads unknown), and each domain it names; a correlated set is one
// case. Answers {cases, unknown, bound}: past the bound no case is answered.
export function lossCases(p,fs){
 const env=fs?.environmentId,ds=failureDomains(p),keys=[],unknown=[],seen=new Set(),add=ids=>{const k=ids.join('+');if(!seen.has(k)){seen.add(k);keys.push(ids);}};
 if(fs.scope==='correlated'){if(list(fs.domainIds).length)add([...fs.domainIds]);}
 else{
  if(fs.quantifier==='any-one'){
   const plans=new Set(plansOf(p,env).map(r=>r.id)),X=failIndex(p),fit=d=>fs.scope==='shared-cause'?sharedCause(d):!sharedCause(d)&&d.scope===fs.scope;
   for(const z of hosting(p,env)){
    const placed=(X.byZone.get(z.id)||[]).filter(l=>plans.has(l?.planId));if(!placed.length)continue;
    const own=(X.zones.get(z.id)||[]).filter(fit),under=placed.filter(l=>l.nodeId).flatMap(l=>(X.placements.get(l.id)?.fails||[]).filter(fit));
    if(!own.length&&!under.length&&fs.scope!=='shared-cause')unknown.push(refOf(z)+' stands in no failure domain of scope '+fs.scope+'.');
    for(const d of [...own,...under])add([d.id]);
   }
  }
  for(const id of list(fs.domainIds))if(standing(ds,id))add([id]);else unknown.push((refOf(find(ds,id))||id)+', which '+fs.ref+' names, is not standing in the design.');
 }
 if(keys.length>EVALUATION_BOUND)return {cases:[],unknown:[],bound:'The claim reads '+keys.length+' loss cases, more than the '+EVALUATION_BOUND+' one evaluation reads: narrow the scope.'};
 return {cases:keys.map(ids=>({id:fs.id+':'+ids.join('+'),title:lostTitle(p,ids,fs.scope==='correlated'),lostDomainIds:ids,...prefix(losing(p,ids))})),unknown,bound:null};
}
const prefix=({zones,placements})=>({lostZoneIds:[...zones],lostPlacementIds:[...placements]});
// The plans of an environment that a linked recovery environment takes over in a case, with why: a plan of the same
// asset there, outside what the case loses, with a declared recovery, its state known and its authority written, and
// stated copies enough for its minimum.
function takenOver(p,envId,zones,placements){
 const out={},envs=recoveringEnvironments(p,envId);if(!envs.length)return out;
 for(const r of plansOf(p,envId))for(const e of envs){
  const x=plansOf(p,e.id).find(y=>y.assetId===r.assetId);if(!x)continue;
  const ls=list(p.runtime.placements).filter(l=>l?.planId===x.id&&!zones.includes(l.zoneId)&&!placements.includes(l.id)),copies=ls.reduce((n,l)=>n+num(l.replicas),0),need=stated(x.minReady)?Number(x.minReady):1;
  const ready=['Stateless process','Stateful service'].includes(x.stateMode)&&!['Unspecified',''].includes(x.recoveryStrategy||'')&&statedField(x,'recoveryPlan')&&!!words(x.recoveryPlan)&&(x.stateMode!=='Stateful service'||!!words(x.fencing)&&!!words(x.backupPlan))&&ls.length>0&&ls.every(l=>['active','standby'].includes(l.role)&&stated(l.replicas))&&copies>=need;
  if(ready){out[r.id]=refOf(e)+' recovers '+refOf(find(p.runtime.environments,envId))+': '+x.ref+' keeps '+copies+' declared '+(copies>1?'copies':'copy')+' of '+(r.title||r.ref)+' outside what is lost. Promotion, health and consistency are unproven.';break;}
 }
 return out;
}
const lostSet=(p,fs,c)=>({zones:c.lostZoneIds,placements:c.lostPlacementIds,elsewhere:takenOver(p,fs.environmentId,c.lostZoneIds,c.lostPlacementIds),failureId:fs.id,caseId:c.id});

// ---------------------------------------------------------------- the evaluation
// The stamp an acceptance reads: the environment and the recovery environments linked to it as their stamps read
// them (zones, plans, placements and paths at their revisions: runtime-domain.js runtimeEnvironmentStamp), what the
// typed failure domains and deployment nodes say, and the claim at its revision.
const said=xs=>list(xs).filter(r=>r&&!isProposed(r)).map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>!BOOKKEEPING.has(k))));
export function failureStamp(p,fs){
 const envs=[fs.environmentId,...recoveringEnvironments(p,fs.environmentId).map(e=>e.id)];
 return JSON.stringify([envs.map(id=>runtimeEnvironmentStamp(p,id)),remember(p,'topology:print','all',()=>valueFingerprint([said(failureDomains(p)),said(deploymentNodes(p))])),fs.id,fs.revision]);
}
// What a plan's row says of it in a case: available, conditional (a declared recovery, here or in a linked recovery environment), unknown, or lost.
const stateOf=r=>['available','conditional'].includes(r.recovery.state)?r.initial.state==='available'?'available':'conditional':[r.initial.state,r.recovery.state].includes('unknown')?'unknown':'lost';
// (the fix-up's must-fix 6) One evaluation is one pass over the document (document-memo.js), so that its cases share the
// index of what each zone fails with, and a case two claims share (the same environment, the same domains lost) is
// walked once.
export const evaluateFailure=(p,id)=>memoPass(p,()=>remember(p,'topology:evaluate',id,()=>evaluate(p,id)));
const walk=(p,envId,fs,c)=>remember(p,'topology:walk',envId+'|'+c.lostDomainIds.join('+'),()=>simulateRuntime(p,{environmentId:envId},lostSet(p,fs,c)).rows);
function evaluate(p,id){
 const fs=find(p?.runtime?.failures,id);if(!fs||!topologyTyped(p))return null;
 const env=find(p.runtime.environments,fs.environmentId),unknown=[],drafted=[],must=list(fs.mustSurvive),may=list(fs.mayDegrade);
 const out={failureId:fs.id,environmentId:fs.environmentId,verdict:'unknown',cases:[],counterexample:null,unknown,drafted,bounds:{...BOUNDS},considered:[...CONSIDERED],notConsidered:[...NOT_CONSIDERED],stamp:failureStamp(p,fs),evidenceClass:'calculated',method:'aiw.topology-eval/1'};
 if(!env||isProposed(env)){unknown.push('The environment of '+fs.ref+' is not standing in the design.');return out;}
 if(!must.length)unknown.push(fs.ref+' names nothing that must survive.');
 const cmp=hostingComparison(p,env.id);if(!cmp.comparable)unknown.push('The zones of '+refOf(env)+' cannot be compared for independence.');
 for(const pid of [...must,...may]){const r=find(p.runtime.plans,pid);if(!r||isProposed(r)||r.environmentId!==env.id)unknown.push((refOf(r)||pid)+' is not a plan of '+refOf(env)+' standing in the design.');else if(list(p.runtime.placements).some(l=>l?.planId===pid&&(!['active','standby'].includes(l.role)||!stated(l.replicas))))unknown.push(refOf(r)+' has a placement whose role or copy count is not stated.');}
 const L=lossCases(p,fs);if(L.bound){unknown.push(L.bound);return out;}
 unknown.push(...L.unknown);
 // (ruling L11 (d); the fix-up's must-fix 3) every record the cases read: the claim, the environment and the recovery
 // environments linked to it, their hosting zones, plans and placements, the domains and nodes those stand in, and what
 // each case loses
 if(draftedIds(p).size){const ns=deploymentNodes(p),X=failIndex(p),envs=[env.id,...recoveringEnvironments(p,env.id).map(e=>e.id)],read=[fs.id,...envs],chain=id=>{for(let n=find(ns,id),k=0;n&&k<9;n=find(ns,n.parentId),k++)read.push(n.id);};
  for(const e of envs)for(const z of hosting(p,e)){read.push(z.id);for(const d of X.zones.get(z.id)||[])read.push(d.id);}
  for(const c of L.cases)read.push(...c.lostDomainIds,...c.lostZoneIds,...c.lostPlacementIds);
  for(const z of list(p.runtime.zones))if(z?.nodeId)chain(z.nodeId);
  const mine=new Set(envs.flatMap(e=>plansOf(p,e).map(r=>r.id)));read.push(...mine);for(const l of list(p.runtime.placements))if(mine.has(l?.planId)){read.push(l.id);if(l.nodeId)chain(l.nodeId);}
  drafted.push(...draftedOf(p,read).map(r=>r.id));}
 const state=stateOf;let lost=null,open=false,conditional=false;
 for(const c of L.cases){
  const rows=walk(p,env.id,fs,c).filter(r=>must.includes(r.id)||may.includes(r.id)).map(r=>({id:r.id,ref:r.ref,title:r.title,role:must.includes(r.id)?'must':'may',initial:r.initial,recovery:r.recovery}));
  out.cases.push({...c,rows});
  for(const r of rows.filter(x=>x.role==='must')){const s=state(r);if(s==='lost'&&!lost)lost={caseId:c.id,planId:r.id,state:r.recovery.state,text:c.title+': '+r.ref+' '+(r.title||'')+' is '+r.recovery.state+'. '+r.recovery.reason};if(s==='unknown')open=true;if(s==='conditional')conditional=true;}
 }
 out.counterexample=lost;
 out.verdict=lost?'does-not-survive':unknown.length||open||!L.cases.length?'unknown':conditional?'recovers-conditionally':'survives';
 if(!L.cases.length&&!unknown.length)unknown.push(fs.ref+' loses no failure domain that hosts something here.');
 return out;
}
// A second person's acceptance that stands: taken by a signed-in person who wrote nothing of the claim (the one rule,
// verifierRefusal, at read time; ruling D7.1), on the claim and the design as they read now.
// (the fix-up's should-fix 3) It lapses while a location gate of the claim's environment fails, as the step is refused then.
export function failureAccepted(p,fs){const s=fs?.review;return !!s&&typeof s==='object'&&!isProposed(fs)&&s.decision==='accepted'&&s.account==='person'&&!verifierRefusal(fs,s.actor,s.account)&&s.stamp===failureStamp(p,fs)&&!failingGate(p,fs.environmentId);}
// The widest declared failure in scope of zone scope or narrower, for the sizing of capacity (wp3); null when none.
export function survivalScope(p,envId){const rank={instance:1,zone:2};let best=null;for(const fs of failures(p))if(fs?.environmentId===envId&&fs.inScope&&!isProposed(fs)&&rank[fs.scope]&&(!best||rank[fs.scope]>rank[best.scope]))best={failureId:fs.id,scope:fs.scope};return best;}

// ---------------------------------------------------------------- the second person's step
function acceptFailure(p,raw,at,actor,options){
 requireTyped(p);
 const m=p.runtime,fs=find(m.failures,raw.id);if(!fs)throw Error('Choose an existing declared failure.');if(isProposed(fs))throw Error(fs.ref+' is still a proposal: a person keeps it first.');
 if(raw.reviewed!==true||!words(raw.reviewer)||!words(raw.reference)||!words(raw.observations))throw Error('Review the claim, its cases and what it does not consider, and record the reviewer, the reference and what you observed.');
 if(!['accepted','returned'].includes(raw.decision))throw Error('Accept the claim or return it.');
 const e=evaluateFailure(p,fs.id);
 if(raw.stamp!==e.stamp)throw Error('The design or the claim changed since it was evaluated: evaluate '+fs.ref+' again.');
 if(!list(fs.mustSurvive).length)throw Error(fs.ref+' names nothing that must survive: name the plans first.');
 if(raw.decision==='accepted'){
  if(e.verdict==='does-not-survive')throw Error(fs.ref+' does not survive its case '+e.cases.find(c=>c.id===e.counterexample.caseId).title+': a claim that does not survive is not accepted. Change the design, or return the claim.');
  if(e.drafted.length)throw Error(and(e.drafted.map(id=>refOf(draftedIds(p).get(id))))+(e.drafted.length>1?' were':' was')+' last changed by a draft no person has reviewed: a person reviews '+(e.drafted.length>1?'them':'it')+' before the claim is accepted.');
  const g=failingGate(p,fs.environmentId);if(g)throw Error(g.ref+' '+g.title+' fails: a claim of '+refOf(find(m.environments,fs.environmentId))+' is not accepted while a location gate of its environment fails.');
 }
 fs.review={actor,at,account:options?.author?.account??null,decision:raw.decision,stamp:e.stamp,verdict:e.verdict,cases:e.cases.map(c=>c.id),reviewer:words(raw.reviewer,180),reference:words(raw.reference),observations:words(raw.observations)};
 m.evidenceVersion++;m.review=null;m.handoff=null;
 return {document:p,selected:fs.id};
}

// ---------------------------------------------------------------- the hooks of built-in code (TOPOLOGY)
// H5: a Failover plan's standby in a recovery design environment linked to the plan's, of the same asset, in a zone of
// another group than every zone of its active copies, as the one grouping reads them across the link (topology-domain.js
// zoneGroups: ruling L2, the fix-up's must-fix 5); a zone in no group is never read as independent.
export function standbyElsewhere(p,r){
 if(!topologyTyped(p)||!r)return false;
 const envs=recoveringEnvironments(p,r.environmentId);if(!envs.length)return false;
 const G=zoneGroups(p,[r.environmentId,...envs.map(e=>e.id)]),active=list(p.runtime.placements).filter(l=>l?.planId===r.id&&l.role==='active').map(l=>G[l.zoneId]);
 if(!active.length||active.some(k=>!k))return false;
 for(const e of envs)for(const x of plansOf(p,e.id).filter(y=>y.assetId===r.assetId))
  for(const l of list(p.runtime.placements).filter(l=>l?.planId===x.id&&l.role==='standby'&&num(l.replicas)>0))if(G[l.zoneId]&&!active.includes(G[l.zoneId]))return true;
 return false;
}
// H4 at runtime.simulation: the walkthrough of one declared case loses what the case loses.
export function lostFor(p,raw){
 if(raw?.failureId===undefined)return undefined;
 const fs=find(p?.runtime?.failures,raw.failureId),e=fs&&!isProposed(fs)&&fs.environmentId===raw.environmentId?evaluateFailure(p,fs.id):null,c=e?.cases.find(x=>x.id===raw.caseId);
 if(!c)throw Error('Choose a declared failure and one of its cases.');
 return lostSet(p,fs,c);
}
Object.assign(TOPOLOGY,{zoneKey:groupKey,standbyElsewhere,lostFor});

// ---------------------------------------------------------------- Chapter 10's findings
// (the fix-up's must-fix 6) one pass over the document: every claim's cases share one index and one walk a case
const failureFindings=p=>topologyTyped(p)?memoPass(p,()=>findingsOf(p)):[];
function findingsOf(p){
 const out=[],m=p.runtime,ds=failureDomains(p),zone=id=>refOf(find(m.zones,id))||id,byCause=new Map();
 for(const env of list(m.environments)){
  const accepted=new Set(failures(p).filter(fs=>fs?.environmentId===env.id&&fs.inScope&&failureAccepted(p,fs)).flatMap(fs=>list(fs.acceptedCauseIds)));
  for(const s of hostingComparison(p,env.id).shared||[])if(!accepted.has(s.causeId)){let xs=byCause.get(s.causeId);if(!xs)byCause.set(s.causeId,xs=[]);xs.push(and(s.zones.map(zone))+' of '+refOf(env));}
 }
 for(const [id,rows] of byCause){const d=find(ds,id);out.push({id:'domain-shared:'+id,code:'domain-shared',level:'warning',objectId:id,title:'Review '+d.ref+' '+d.title+', a cause zones share',detail:rows.map(x=>x+' share '+d.ref+' '+d.title+' ('+d.cause+'): what loses it loses '+(x.split(' and ').length>2||x.includes(', ')?'all of them':'both')+'.').join(' ')+' Remove or isolate the shared cause, or accept it in a declared failure that a second person accepts.'});}
 for(const fs of failures(p))if(fs?.id&&fs.inScope&&!isProposed(fs)){
  const e=evaluateFailure(p,fs.id);if(!e)continue;
  if(e.verdict==='does-not-survive')out.push({id:'failure-unsurvived:'+fs.id,code:'failure-unsurvived',level:'error',objectId:fs.id,title:fs.ref+' '+fs.title+' does not survive',detail:fs.ref+' '+fs.title+' does not survive: '+e.counterexample.text+' Change the design so that it survives, or say the claim is not in scope.'});
  else if(e.verdict==='unknown')out.push({id:'failure-unknown:'+fs.id,code:'failure-unknown',level:'warning',objectId:fs.id,title:'Whether the design survives '+fs.ref+' '+fs.title+' is not known',detail:e.unknown.join(' ')});
 }
 return out;
}

// ---------------------------------------------------------------- the record graph
// A declared failure a person wrote or kept, the plans it covers and the domains it assumes lost; a recovery
// environment and the environments it recovers. Only in a typed project; a relation only between objects.
function emitFailures(p,add,rel,has){
 if(!topologyTyped(p))return;
 for(const fs of failures(p))if(fs?.id&&!isProposed(fs)){
  add(fs,'failure','runtime.failures.'+fs.id);if(!has(fs.id))continue;
  for(const [field,ids] of [['mustSurvive',fs.mustSurvive],['mayDegrade',fs.mayDegrade]])for(const id of list(ids))if(has(id))rel('covers',fs.id,id,{source:'runtime.failures.'+field});
  for(const id of list(fs.domainIds))if(has(id))rel('assumesLossOf',fs.id,id,{source:'runtime.failures.domainIds'});
 }
 for(const e of list(p.runtime?.environments))for(const id of list(e?.recoversIds))if(has(e.id)&&has(id))rel('recovers',e.id,id,{source:'runtime.environments.recoversIds'});
}

// ---------------------------------------------------------------- what the two record saves refuse by who writes the commit
function refuseDraft(p,command,{author}={}){
 if(!author||author.kind!==DRAFT&&author.account!=='agent')return;
 const raw=command?.payload||{};
 if(command.type==='runtime.environment-link')return 'A signed-in person links a recovery environment: a draft by Sol or an agent account does not.';
 {const old=standingOf(p?.runtime?.failures,raw);if(old)return refOf(old)+' is a declared failure a person saved: a draft by Sol or an agent account changes no claim that stands. It sends a claim of its own as a proposal (origin: sol-draft), and a person keeps it.';}
 if(raw.origin!==DRAFT)return 'A draft by Sol or an agent account sends a declared failure as its proposal (origin: sol-draft); a person keeps it.';
 if(raw.inScope===true)return 'Whether a claim is in scope is a signed-in person\'s statement: a draft by Sol or an agent account sets none.';
 if(raw.durationMinutes!=null&&raw.durationMinutes!=='')return 'A draft by Sol or an agent account states no duration: a person states the minutes.';
}

// ---------------------------------------------------------------- what this part registers
const touch=s=>{s.version++;s.review=null;s.handoff=null;};
function applyFailureCommand(p,command,at,actor,options){
 const raw=command.payload||{};
 if(command.type==='runtime.failure-accept')return acceptFailure(p,raw,at,actor,options);
 if(command.type==='runtime.environment-link'){const {selected,changed}=linkEnvironment(p,raw);if(changed)touch(p.runtime);return {document:p,selected};}
 const [r,changed]=saveFailure(p,raw,at,actor);if(changed&&!isProposed(r))touch(p.runtime);return {document:p,selected:r.id};
}
TRACKED.push(['runtime.failures',10,'failure',FS_KEYS.filter(k=>k!=='open'),true],['runtime.environments',10,'environment',['recoversIds'],true]);
Object.assign(LABELS,{environmentId:'Environment',quantifier:'Quantifier',durationMinutes:'Duration (minutes)',mustSurvive:'Must survive',mayDegrade:'May degrade',minimumService:'Minimum service',exclusions:'Exclusions',acceptedCauseIds:'Accepted shared causes',inScope:'In scope',recoversIds:'Recovers'});
// What a declared failure says to the design fingerprint: all but who wrote and reviewed it, and a step a recovery import
// moved aside (rulings J3, L5, L6; the fix-up's should-fix 7).
const DESIGN_OFF=new Set([...BOOKKEEPING,'actor','recorded','importedReview']),statement=p=>{const xs=failures(p).filter(r=>r&&!isProposed(r)).map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>!DESIGN_OFF.has(k))));return xs.length?xs:undefined;};
const edit={apply:applyFailureCommand,staged:true,validate:refuseDraft};
export const FAILURES_PART={
 objectTypes:{failure:{label:'Declared failure',chapter:10,level:'deployment',prefix:'FS'}},
 records:emitFailures,
 layers:{failure:'failure'},
 hops:[{layer:'failure',types:['covers'],from:['plan'],dir:'in',ctx:true}],
 commands:{'runtime.failure':edit,'runtime.environment-link':edit,'runtime.failure-accept':{apply:applyFailureCommand,second:(p,command)=>find(p?.runtime?.failures,command?.payload?.id)}},
 checks:{10:failureFindings},
 lifecycle:{'runtime.failures':10},
 quietProposals:{'runtime.failures':true},
 provenance:{nouns:{'runtime.failures':'declared failure'},paths:{'runtime.failure':['runtime.failures'],'runtime.failure-accept':['runtime.failures']}},
 design:{'runtime.failures':statement},
 designKeys:['runtime.failures']
};
