// Location gates and the copies of data they read (rc44, wp9a slice 3; audit/rc44/design/wp9a-deployment.md sections
// b.1, c.2 to c.4, d.2 (H11), d.4 and f.1): a part of the design package p30-deployment (topology.js assembles the parts).
// Pure: no clock but the `at` a command is handed.
//   Gate      runtime.gates lg-NNN / LG-NNN {kind, title, environmentId ('' every environment), dataIds, classifications,
//             personalData, permitted, requires {tiers, exposure}, nodeIds, requirement, source, owner, open}, saved as a
//             patch with who wrote each revision (actor, history) and recorded {at, actor, revision}. A residency gate
//             says where data may rest (jurisdictions), a placement gate in what tier and exposure; the other four say
//             what must be available at named nodes and are read from a second person's evidence.
//   Copy      runtime.copies dcp-NNN / DCP-NNN {dataId, kind, planId, zoneId | nodeId, basis, derivedFrom?}: where a copy
//             of a data definition rests. runtime.copy-proposals proposes, from the trail of each data definition's
//             authority (trace-kernel.js forwardTrace) only, the copies of each stateful plan it reaches: a primary per
//             active placement, a replica per standby, a backup per backup zone (backsUpTo, a relation this part states),
//             each recording the relations it came by (derivedFrom.via); a proposal binds nothing.
//   Reading   gateReading(p, id): pass, fail or unknown, never pass on what is not known. A residency or placement gate
//             reads every copy of its data that applies to its environment: each recorded copy where it rests (the
//             nearest jurisdiction its node or a node above states), each proposal as unknown, and each copy the trail
//             places that no copy records (a fail where its location is not permitted, unknown where it is). The others
//             read the current evidence of each node.
//   Step      runtime.gate-evidence: a second person's evidence for a node (S0's `second` row), kept under the gate's key
//             `review`; it lapses when the gate or the node changes. A residency or placement gate takes none.
//   Checks    Chapter 10: location-gate (an error, hard: the non-waivable class), location-unknown, node-address-overlap
//             (prefixes compared as parsed parts, ruling L8), node-data-exposure.
//   Hook      the slot of runtime-model.js (TOPOLOGY.refuseMerge, H11): a merge that would newly fail a gate is refused.
import {TOPOLOGY,hostingZone} from './runtime-model.js';
import {CLASSIFICATIONS,NOT_CLASSIFIED} from './interfaces-domain.js';
import {SEEDED,PROPOSED,patchFields,patchOpen,retiredOf} from './technology-domain.js';
import {isProposed} from './record-lifecycle.js';
import {verifierRefusal} from './architecture-obligations.js';
import {forwardTrace,traceGraph} from './trace-kernel.js';
import {remember,memoPass} from './document-memo.js';
import {list} from './util.js';
import {TRACKED,LABELS,JURISDICTIONS,NODE_TIERS,NODE_EXPOSURES,topologyTyped,deploymentNodes,parsePrefix,nodeUnder,requireTyped,storeWritten,standingOf,draftedIds,draftedOf,draftedWords,DRAFT,pad,find,refOf,and,chainOf,patchBounded,authoredRecord,BOOKKEEPING} from './topology-domain.js';

export const GATE_KINDS=['residency','placement','required-service','quota','key-custody','identity'],COPY_KINDS=['primary','replica','backup','log','trace','export','crash-dump','key-material','cache','other'];
// What one workspace keeps (rulings L8 and M9 (f): reached through the commands, the suite's case S3.9).
export const GATE_LIMITS=Object.freeze({gates:24,copies:200,data:24,permitted:24,nodes:24});
const READ=['residency','placement'],words=(v,n=2400)=>typeof v==='string'?v.trim().slice(0,n):'';
const gates=p=>list(p?.runtime?.gates),copies=p=>list(p?.runtime?.copies),data=p=>list(p?.interfaces?.data);
const dataName=(p,id)=>{const d=find(data(p),id);return d?(d.ref||d.id)+' '+d.title:id;},kindWords=k=>k.replace('-',' ');

// ---------------------------------------------------------------- the location gate
const GATE_FIELDS=[['title','t',160,'name of the gate'],['requirement','t',2400,'requirement'],['source','t',2400,'source'],['owner','t',180,'owner']];
const GATE_KEYS=['kind','title','environmentId','dataIds','classifications','personalData','permitted','requires','nodeIds','requirement','source','owner','open'],GATE_OPEN=['permitted','source','owner','requirement'];
const CLASSES=CLASSIFICATIONS.filter(c=>c!==NOT_CLASSIFIED);
function saveGate(p,raw,at,actor){
 requireTyped(p);
 const m=p.runtime,xs=m.gates||[],old=raw.id?find(xs,raw.id):null;if(raw.id&&!old)throw Error('Choose an existing location gate.');
 for(const [f,,,label] of GATE_FIELDS)if(raw[f]!=null&&typeof raw[f]!=='string')throw Error('The '+label+' is words: send it as text.');
 const pick=(f,d)=>raw[f]===undefined?old?.[f]??d:raw[f]??d;
 const kind=pick('kind','');if(!GATE_KINDS.includes(kind))throw Error('Choose the kind of location gate: residency, placement, required service, quota, key custody or identity.');
 const f=patchFields(old,raw,GATE_FIELDS);if(!f.title)throw Error('Name the location gate.');
 const environmentId=pick('environmentId','');if(environmentId!==''&&!find(m.environments,environmentId))throw Error('Choose an existing environment for the gate, or leave it for every environment.');
 const links=(field,noun,max)=>patchBounded(old,raw,field,()=>true,noun,max,'A location gate');
 const dataIds=links('dataIds','data definitions',GATE_LIMITS.data);if(raw.dataIds!==undefined)for(const id of dataIds)if(!find(data(p),id))throw Error('Choose an existing data definition.');
 const classifications=links('classifications','classifications',CLASSES.length);if(classifications.some(c=>!CLASSES.includes(c)))throw Error('Choose classifications this project uses ('+CLASSES.join(', ')+').');
 const personalData=pick('personalData',false);if(typeof personalData!=='boolean')throw Error('Say whether the gate covers personal data: true or false.');
 const permitted=links('permitted','jurisdictions',GATE_LIMITS.permitted);if(permitted.some(c=>!JURISDICTIONS.has(c)))throw Error('Give each permitted jurisdiction as an officially assigned ISO 3166-1 alpha-2 code (NO, SE, GB).');
 const rq=raw.requires===undefined?old?.requires:raw.requires,requires={tiers:list(rq?.tiers),exposure:rq?.exposure??''};
 if(rq!=null&&(typeof rq!=='object'||Array.isArray(rq)||!Array.isArray(rq.tiers??[])||requires.tiers.some(t=>!NODE_TIERS.includes(t))||![...NODE_EXPOSURES,''].includes(requires.exposure)))throw Error('A placement gate requires tiers ('+NODE_TIERS.join(', ')+') and an exposure (private or public).');
 const nodeIds=links('nodeIds','deployment nodes',GATE_LIMITS.nodes);if(raw.nodeIds!==undefined)for(const id of nodeIds)authoredRecord(deploymentNodes(p),id,'deployment node');
 const open=patchOpen(old,raw,GATE_OPEN);
 if(READ.includes(kind)&&!dataIds.length&&!classifications.length&&!personalData)throw Error('A residency or placement gate names what it constrains: data definitions, classifications or personal data.');
 if(kind==='residency'&&!permitted.length&&!open?.permitted)throw Error('A residency gate permits one or more jurisdictions, or keeps the list open.');
 if(kind==='placement'&&!requires.tiers.length&&!requires.exposure)throw Error('A placement gate requires a tier or an exposure.');
 if(!READ.includes(kind)&&!nodeIds.length)throw Error('Name the deployment nodes where the requirement holds.');
 if(!READ.includes(kind)&&!f.requirement)throw Error('State what must be available at those nodes.');
 if(!f.source&&!open?.source)throw Error('State the obligation\'s source (a regulation, a contract clause or a policy), or keep it open.');
 const next={kind,title:f.title,environmentId,dataIds,classifications,personalData,permitted,requires,nodeIds,requirement:f.requirement,source:f.source,owner:f.owner};if(open)next.open=open;
 if(!old&&xs.length>=GATE_LIMITS.gates)throw Error('This workspace keeps up to '+GATE_LIMITS.gates+' location gates.');
 m.gates=xs;
 return storeWritten(xs,old,next,raw,at,actor,GATE_KEYS,()=>{const n=m.counters.gate=(m.counters.gate||0)+1;return {id:'lg-'+pad(n),ref:'LG-'+pad(n)};});
}

// ---------------------------------------------------------------- the data copy
const COPY_KEYS=['dataId','kind','planId','zoneId','nodeId','basis','derivedFrom','open'];
function saveCopy(p,raw,at,actor){
 requireTyped(p);
 const m=p.runtime,xs=m.copies||[],old=raw.id?find(xs,raw.id):null;if(raw.id&&!old)throw Error('Choose an existing data copy.');
 if(raw.basis!=null&&typeof raw.basis!=='string')throw Error('The basis is words: send it as text.');
 const pick=(f,d)=>raw[f]===undefined?old?.[f]??d:raw[f]??d;
 const dataId=pick('dataId','');if(!find(data(p),dataId))throw Error('Choose an existing data definition.');
 const kind=pick('kind','');if(!COPY_KINDS.includes(kind))throw Error('Choose the kind of copy: '+and(COPY_KINDS.map(kindWords))+'.');
 const planId=pick('planId','');if(planId&&!find(m.plans,planId))throw Error('Choose an existing runtime plan.');
 if(raw.zoneId&&raw.nodeId)throw Error('A copy rests in one zone or one node, not both.');
 let zoneId=old?.zoneId||'',nodeId=old?.nodeId||'';if(raw.zoneId!==undefined){zoneId=raw.zoneId||'';nodeId=raw.nodeId||'';}else if(raw.nodeId!==undefined){nodeId=raw.nodeId||'';zoneId='';}
 if(!zoneId&&!nodeId)throw Error('Say where the copy rests: a zone or a deployment node.');
 if(zoneId&&!find(m.zones,zoneId))throw Error('Choose an existing zone.');
 if(nodeId&&nodeId!==old?.nodeId)authoredRecord(deploymentNodes(p),nodeId,'deployment node');
 const f=patchFields(old,raw,[['basis','t',600,'basis']]),open=patchOpen(old,raw,['basis']);
 const next={dataId,kind,planId,zoneId,nodeId,basis:f.basis,...(old?.derivedFrom?{derivedFrom:old.derivedFrom}:{})};if(open)next.open=open;
 if(!old&&xs.length>=GATE_LIMITS.copies)throw Error('This workspace keeps up to '+GATE_LIMITS.copies+' data copies.');
 m.copies=xs;
 return storeWritten(xs,old,next,raw,at,actor,COPY_KEYS,()=>{const n=m.counters.copy=(m.counters.copy||0)+1;return {id:'dcp-'+pad(n),ref:'DCP-'+pad(n)};});
}

// ---------------------------------------------------------------- the copies the trail places
// From the trail of each data definition's authority, read through the kernel only: each stateful plan it reaches (a
// plan that says it keeps state: a Stateful service) and, for each placement of it on the trail, the zone it reaches
// by that placement (primary for an active one, replica for a standby); for its backup zone, the relation backsUpTo
// this part states. Each with the relations it came by, in order from the authority.
const KIND_OF={active:'primary',standby:'replica'};
function chainBack(T,id){const out=[],seen=new Set();for(let x=id;x!==T.start;){if(seen.has(x))return null;seen.add(x);const h=(T.hops.get(x)||[])[0];if(!h)return null;out.unshift(h.relation);x=h.from;}return out;}
export const derivedCopies=p=>remember(p,'topology:derived-copies','all',()=>derive(p));
function derive(p){
 const out=[],seen=new Set(),K=topologyTyped(p)?traceGraph(p):null;if(!K)return out;
 for(const d of data(p)){
  if(!d?.authorityId||isProposed(d))continue;const T=forwardTrace(p,d.authorityId,{graph:K});if(!T)continue;
  for(const plan of (T.layers.plan||[]).map(id=>T.record(id)?.record).filter(r=>r&&!isProposed(r)&&r.stateMode==='Stateful service')){
   const head=chainBack(T,plan.id);if(!head)continue;
   const put=(kind,zoneId,via,placementId='')=>{const k=[d.id,kind,plan.id,zoneId].join('|');if(!seen.has(k)){seen.add(k);out.push({dataId:d.id,kind,planId:plan.id,placementId,zoneId,environmentId:plan.environmentId,authorityId:d.authorityId,via});}};
   for(const lid of T.layers.placement||[]){const l=T.record(lid)?.record,kind=KIND_OF[l?.role],a=(T.hops.get(lid)||[]).find(h=>h.from===plan.id),b=a&&(T.hops.get(l.zoneId)||[]).find(h=>h.from===lid);if(kind&&b)put(kind,l.zoneId,[...head,a.relation,b.relation],lid);}
   const e=(K.G.outgoing.get(plan.id)||[]).find(x=>x.type==='backsUpTo'&&x.to===plan.backupZoneId);if(e)put('backup',e.to,[...head,e.id]);
  }
 }
 return out;
}
const sameCopy=(c,x)=>c.dataId===x.dataId&&c.kind===x.kind&&(c.planId||'')===x.planId&&c.zoneId===x.zoneId;
function proposeCopies(p,raw){
 requireTyped(p);
 const m=p.runtime;if(!find(m.environments,raw.environmentId))throw Error('Choose an existing environment.');
 const held=[...copies(p),...retiredOf(p,'runtime.copies').map(x=>x.record).filter(Boolean)],fresh=derivedCopies(p).filter(x=>x.environmentId===raw.environmentId&&!held.some(c=>sameCopy(c,x)));
 if(!fresh.length)return null;
 const n=copies(p).length+fresh.length;if(n>GATE_LIMITS.copies)throw Error('This workspace keeps up to '+GATE_LIMITS.copies+' data copies; '+fresh.length+(fresh.length>1?' copies':' copy')+' the trail places would make '+n+'.');
 const xs=m.copies||(m.copies=[]),first=xs.length;
 for(const x of fresh){const c=m.counters,seq=c.copy=(c.copy||0)+1,plan=find(m.plans,x.planId);xs.push({id:'dcp-'+pad(seq),ref:'DCP-'+pad(seq),revision:1,dataId:x.dataId,kind:x.kind,planId:x.planId,zoneId:x.zoneId,nodeId:'',basis:'The trail of '+refOf(find(list(p.realisation?.components),x.authorityId)||find(list(p.technologyRealisation?.records),x.authorityId))+' places the '+kindWords(x.kind)+' of '+dataName(p,x.dataId)+' that '+refOf(plan)+' keeps in '+refOf(find(m.zones,x.zoneId))+'. Confirm it, or dismiss it.',derivedFrom:{via:x.via},origin:SEEDED,state:PROPOSED,history:[]});}
 return xs[first].id;
}

// ---------------------------------------------------------------- the reading
// Where a copy rests and what the nearest node that says states there: {zoneId, nodeId, chain, jurisdiction, why}.
function restsAt(p,c){
 const ns=deploymentNodes(p),z=c.zoneId?find(p.runtime.zones,c.zoneId):null;
 if(c.zoneId&&(!z||isProposed(z)))return {why:(refOf(z)||c.zoneId)+' is not standing in the design.'};
 const nodeId=z?z.nodeId:c.nodeId,chain=chainOf(ns,find(ns,nodeId)),j=chain.find(n=>n.jurisdiction)?.jurisdiction||'';
 if(z&&!chain.length)return {zoneId:z.id,chain,why:z.ref+' stands in no deployment node that states a jurisdiction.'};
 if(!chain.length)return {nodeId,chain,why:(refOf(find(ns,nodeId))||nodeId)+' is not standing in the design.'};
 return {zoneId:z?.id||'',nodeId:chain[0].id,chain,jurisdiction:j,why:j?'':z?z.ref+' stands in no deployment node that states a jurisdiction.':chain[0].ref+' '+chain[0].title+' states no jurisdiction, nor does a node it lies in.'};
}
// The environments a copy applies to: its zone's, its plan's, or those of the zones that sit in or under its node.
function appliesTo(p,c,envId){
 if(!envId)return true;
 const z=find(p.runtime.zones,c.zoneId);if(z)return z.environmentId===envId;const r=find(p.runtime.plans,c.planId);if(r)return r.environmentId===envId;
 const under=list(p.runtime.zones).filter(x=>x?.nodeId&&(x.nodeId===c.nodeId||nodeUnder(p,x.nodeId,c.nodeId)));return !under.length||under.some(x=>x.environmentId===envId);
}
const within=(p,g)=>{const ids=new Set(list(g.dataIds)),cs=new Set(list(g.classifications));return data(p).filter(d=>d&&!isProposed(d)&&(ids.has(d.id)||cs.has(d.classification)||g.personalData&&d.personalData==='yes'));};
// What one location answers for the gate: pass or fail, or unknown with why.
function judge(g,at){
 if(at.why)return {state:'unknown',why:at.why};
 if(g.kind==='residency')return {state:list(g.permitted).includes(at.jurisdiction)?'pass':'fail'};
 const net=at.chain.find(n=>['network','subnet'].includes(n.kind)),rq=g.requires||{};
 if(!net)return {state:'unknown',why:'it rests in no network or subnet a placement gate can read'};
 const t=list(rq.tiers).length?net.tier?list(rq.tiers).includes(net.tier):null:true,x=rq.exposure?net.exposure?net.exposure===rq.exposure:null:true;
 return t===false||x===false?{state:'fail'}:t===null||x===null?{state:'unknown',why:net.ref+' '+net.title+' does not state its '+(t===null?'tier':'exposure')}:{state:'pass'};
}
export const gateEvidenceStamp=(p,g,nodeId)=>JSON.stringify([g?.id,g?.revision,nodeId,find(deploymentNodes(p),nodeId)?.revision??null]);
export const gateReading=(p,id)=>remember(p,'topology:gate',id,()=>readGate(p,id));
// (ruling L11 (d) read for a hard constraint; the fix-up's must-fix 2) A gate reads nothing as holding on a record a draft
// by Sol, an import or an agent account changed last that no person has reviewed since (topology-domain.js draftedIds):
// a row that reads one fails, naming it, and so does the gate for every other such record it reads (itself, the data it
// names, every definition where it names a classification or personal data, the copies of its data and their zones, and
// each zone, placement and plan of the environments it applies to), until a person reviews it. So a draft never turns a
// fail into unknown or pass, whatever command it came by.
const reviews=(xs,what)=>draftedWords(xs)+': '+what+' reads as failing until a person reviews '+(xs.length>1?'them':'it');
function readGate(p,id){
 const g=find(p?.runtime?.gates,id);if(!g||!topologyTyped(p))return null;
 const out={gateId:g.id,kind:g.kind,state:'unknown',rows:[],why:''},rows=out.rows,settle=()=>{out.state=rows.some(r=>r.state==='fail')?'fail':!rows.length||rows.some(r=>r.state==='unknown')?'unknown':'pass';return out;};
 const named=new Set(),held=ids=>{const xs=draftedOf(p,ids);for(const r of xs)named.add(r.id);return xs;},rest=ids=>{const xs=draftedOf(p,ids).filter(r=>!named.has(r.id));if(xs.length)rows.push({copyId:null,dataId:'',kind:'',zoneId:'',nodeId:'',jurisdiction:'',state:'fail',drafted:xs.map(r=>r.id),why:reviews(xs,g.ref)});};
 if(!READ.includes(g.kind)){
  if(!list(g.nodeIds).length)out.why=g.ref+' names no deployment node.';
  for(const nodeId of list(g.nodeIds)){const n=find(deploymentNodes(p),nodeId),s=g.review?.evidence?.[nodeId],now=!!s&&s.account==='person'&&!verifierRefusal(g,s.actor,s.account)&&s.stamp===gateEvidenceStamp(p,g,nodeId),xs=held([nodeId]);
   rows.push(xs.length?{nodeId,state:'fail',drafted:[nodeId],why:reviews(xs,'the evidence for it')}:{nodeId,state:now?s.state:'unknown',why:now?(refOf(n)||nodeId)+(s.state==='pass'?' meets':' does not meet')+' it: '+s.reference+' ('+s.actor+')':'no current evidence for '+(n?n.ref+' '+n.title:nodeId)+' (a second person records it)'});}
  rest([g.id]);return settle();
 }
 const ds=within(p,g),env=g.environmentId,mine=new Set(ds.map(d=>d.id)),drafts=draftedIds(p).size>0;
 if(!ds.length)out.why=g.ref+' names no data definition this project holds.';else if(g.kind==='residency'&&!list(g.permitted).length)out.why='The permitted jurisdictions are not stated: '+g.ref+' reads unknown until they are.';
 else{
  const recorded=copies(p).filter(c=>mine.has(c?.dataId)&&appliesTo(p,c,env));
  for(const c of recorded){
   const of=c.ref+', the '+kindWords(c.kind)+' of '+dataName(p,c.dataId);
   if(isProposed(c)){rows.push({copyId:c.id,dataId:c.dataId,kind:c.kind,zoneId:c.zoneId,nodeId:c.nodeId,jurisdiction:'',state:'unknown',why:c.ref+' is a proposal: a person keeps or dismisses it.'});continue;}
   const at=restsAt(p,c),v=judge(g,at),where=(at.zoneId?' in '+refOf(find(p.runtime.zones,at.zoneId)):'')+(at.nodeId?' at '+at.chain[0].ref+' '+at.chain[0].title:''),xs=drafts?held([c.id,c.zoneId,...list(at.chain).map(n=>n.id),c.planId]):[];
   rows.push({copyId:c.id,dataId:c.dataId,kind:c.kind,zoneId:at.zoneId||c.zoneId,nodeId:at.nodeId||c.nodeId,jurisdiction:at.jurisdiction||'',...xs.length?{state:'fail',drafted:xs.map(r=>r.id),why:reviews(xs,of+',')}:{state:v.state,why:v.state==='unknown'?of+': '+v.why+(v.why.endsWith('.')?'':'.'):of+', rests'+where+(at.jurisdiction?', in '+at.jurisdiction:'')}});
  }
  for(const x of derivedCopies(p).filter(x=>mine.has(x.dataId)&&(!env||x.environmentId===env)&&!recorded.some(c=>sameCopy(c,x)))){
   const z=find(p.runtime.zones,x.zoneId),at=restsAt(p,{zoneId:x.zoneId}),v=judge(g,at),of='the '+kindWords(x.kind)+' of '+dataName(p,x.dataId),xs=drafts?held([x.zoneId,...list(at.chain).map(n=>n.id),x.planId,x.placementId]):[];
   rows.push({copyId:null,dataId:x.dataId,kind:x.kind,zoneId:x.zoneId,nodeId:at.nodeId||'',jurisdiction:at.jurisdiction||'',...xs.length?{state:'fail',drafted:xs.map(r=>r.id),why:reviews(xs,of+' the trail places in '+refOf(z))}:{state:v.state==='pass'?'unknown':v.state,why:v.state==='fail'?of+' the trail places in '+refOf(z)+' rests at '+at.chain[0].ref+' '+at.chain[0].title+(at.jurisdiction?', in '+at.jurisdiction:''):dataName(p,x.dataId)+': the trail places it in '+refOf(z)+' '+(z?.title||'')+' (the '+kindWords(x.kind)+' of '+refOf(find(p.runtime.plans,x.planId))+') and no copy records it'+(v.why?'; '+v.why:'')+'.'}});
  }
  for(const d of ds)if(!rows.some(r=>r.dataId===d.id))rows.push({copyId:null,dataId:d.id,kind:'',zoneId:'',nodeId:'',jurisdiction:'',state:'unknown',why:'No copy of '+dataName(p,d.id)+' is recorded, and the trail places it nowhere.'});
 }
 if(drafts){const m=p.runtime,inEnv=x=>!env||x?.environmentId===env,plans=list(m.plans).filter(inEnv),ids=new Set(plans.map(r=>r.id)),theirs=copies(p).filter(c=>mine.has(c?.dataId));
  rest([g.id,...(list(g.classifications).length||g.personalData?data(p):ds).map(d=>d?.id),...theirs.flatMap(c=>[c.id,c.zoneId]),...list(m.zones).filter(inEnv).map(z=>z.id),...plans.map(r=>r.id),...list(m.placements).filter(l=>ids.has(l?.planId)).map(l=>l.id)]);}
 return settle();
}
// The gates that apply to an environment (its own and those of every environment), standing.
const applying=(p,envId)=>gates(p).filter(g=>g?.id&&!isProposed(g)&&(!g.environmentId||g.environmentId===envId));
export function locationGateState(p,envId){const st=applying(p,envId).map(g=>gateReading(p,g.id)?.state);return st.includes('fail')?'fail':st.includes('unknown')?'unknown':'pass';}
export const failingGate=(p,envId)=>topologyTyped(p)?applying(p,envId).find(g=>gateReading(p,g.id)?.state==='fail')||null:null;
// Every copy of an environment's data: recorded, proposed, or placed by the trail and not recorded, with where it rests.
export function copyInventory(p,envId){
 if(!topologyTyped(p))return [];
 const rows=copies(p).filter(c=>c&&appliesTo(p,c,envId)).map(c=>{const at=restsAt(p,c);return {copyId:c.id,dataId:c.dataId,kind:c.kind,planId:c.planId,zoneId:at.zoneId||c.zoneId,nodeId:at.nodeId||c.nodeId,jurisdiction:at.jurisdiction||'',state:isProposed(c)?'proposed':'recorded'};});
 for(const x of derivedCopies(p).filter(x=>x.environmentId===envId&&!copies(p).some(c=>sameCopy(c,x)))){const at=restsAt(p,{zoneId:x.zoneId});rows.push({copyId:null,dataId:x.dataId,kind:x.kind,planId:x.planId,zoneId:x.zoneId,nodeId:at.nodeId||'',jurisdiction:at.jurisdiction||'',state:'derived'});}
 return rows;
}
// What a gate asks, in words, after what fails it.
const terms=g=>g.kind==='residency'?g.ref+' permits '+and(list(g.permitted)):g.kind==='placement'?g.ref+' requires '+[list(g.requires?.tiers).length?'a '+list(g.requires.tiers).join(' or ')+' tier':'',g.requires?.exposure?'a '+g.requires.exposure+' exposure':''].filter(Boolean).join(' and '):g.ref+' requires: '+g.requirement;

// ---------------------------------------------------------------- the second person's step
function recordEvidence(p,raw,at,actor,options){
 requireTyped(p);
 const m=p.runtime,g=find(m.gates,raw.id);if(!g)throw Error('Choose an existing location gate.');if(isProposed(g))throw Error(g.ref+' is still a proposal: a person keeps it first.');
 if(READ.includes(g.kind))throw Error(g.ref+' is read from where its copies rest: a '+g.kind+' gate takes no evidence.');
 if(!list(g.nodeIds).includes(raw.nodeId))throw Error('Choose one of the deployment nodes '+g.ref+' names.');
 if(!['pass','fail'].includes(raw.state))throw Error('Record whether the requirement holds there: pass or fail.');
 if(raw.reviewed!==true||!words(raw.reference)||!words(raw.observations))throw Error('Review the evidence, and record its reference and what you observed.');
 if(raw.stamp!==gateEvidenceStamp(p,g,raw.nodeId))throw Error('The gate or the node changed since you read them: read them again.');
 const account=options?.author?.account??null;
 g.review={actor,at,account,evidence:{...(g.review?.evidence||{}),[raw.nodeId]:{state:raw.state,actor,at,account,stamp:raw.stamp,reference:words(raw.reference),observations:words(raw.observations)}}};
 m.evidenceVersion++;m.review=null;m.handoff=null;
 return {document:p,selected:g.id};
}

// ---------------------------------------------------------------- the hook of workspace.merge (H11)
// A merge that would add a failing row to a gate (a copy or a location that fails it), whether or not the gate fails
// before it, is refused, the gate and those rows named, before anything is kept (the fix-up's should-fix 2: rows, not the
// gate's state, so a gate that fails already is no leave to move more data where it may not rest).
const rowKey=r=>JSON.stringify([r.copyId,r.dataId,r.kind,r.zoneId,r.nodeId,r.jurisdiction]);
export function refuseMerge(before,after){
 if(!topologyTyped(after))return;
 for(const g of gates(after))if(g?.id&&!isProposed(g)){const now=gateReading(after,g.id);if(now?.state!=='fail')continue;
  const was=new Set((gateReading(before,g.id)?.rows||[]).filter(r=>r.state==='fail').map(rowKey)),added=now.rows.filter(r=>r.state==='fail'&&!was.has(rowKey(r)));if(!added.length)continue;
  throw Error(g.ref+' '+g.title+' would fail: '+added.map(r=>r.why).join('; ')+'; '+terms(g)+'. A location gate is not traded off: revise the alternative.');}
}
Object.assign(TOPOLOGY,{refuseMerge});

// ---------------------------------------------------------------- Chapter 10's findings
const gateFindings=p=>topologyTyped(p)?memoPass(p,()=>gateFindingsOf(p)):[];
function gateFindingsOf(p){
 const out=[];
 for(const g of gates(p))if(g?.id&&!isProposed(g)){
  const r=gateReading(p,g.id);if(!r)continue;
  if(r.state==='fail'){const bad=r.rows.filter(x=>x.state==='fail');out.push({id:'location-gate:'+g.id,code:'location-gate',level:'error',hard:true,objectId:g.id,title:g.ref+' '+g.title+' fails',detail:bad.map(x=>x.why).join('; ')+'; '+terms(g)+'. A location gate is not traded off: '+(bad.every(x=>x.drafted)?'a person reviews what a draft changed.':READ.includes(g.kind)?'change where the copy rests.':'change the design or where it runs.')});}
  else if(r.state==='unknown')out.push({id:'location-unknown:'+g.id,code:'location-unknown',level:'warning',objectId:g.id,title:'Whether '+g.ref+' '+g.title+' holds is not known',detail:[r.why,...r.rows.filter(x=>x.state==='unknown').map(x=>x.why)].filter(Boolean).join(' ')+' Unknown is never pass.'});
 }
 const ns=deploymentNodes(p).filter(n=>n?.id&&!isProposed(n)),nets=ns.map(n=>[n,n.address?parsePrefix(n.address):null]).filter(([,x])=>x);
 // two prefixes overlap where the shorter one's bits are the longer one's first bits (parsed parts, ruling L8)
 const overlap=(a,b)=>{if(a.family!==b.family)return false;const bits=a.family===4?8:16;let left=Math.min(a.length,b.length);for(let i=0;left>0;i++,left-=bits){const k=Math.min(bits,left),s=bits-k;if(a.parts[i]>>s!==b.parts[i]>>s)return false;}return true;};
 for(let i=0;i<nets.length;i++){const [a,x]=nets[i],with_=[];for(let j=i+1;j<nets.length;j++){const [b,y]=nets[j];if(overlap(x,y)&&!nodeUnder(p,a.id,b.id)&&!nodeUnder(p,b.id,a.id))with_.push(b);}
  if(with_.length)out.push({id:'node-address-overlap:'+a.id,code:'node-address-overlap',level:'warning',objectId:a.id,title:'Review the address of '+a.ref+' '+a.title,detail:with_.map(b=>a.ref+' '+a.title+' ('+a.address+') and '+b.ref+' '+b.title+' ('+b.address+') overlap').join('; ')+'. Give networks that do not lie one inside the other prefixes that do not overlap.'});}
 for(const n of ns)if(n.tier==='data'&&n.exposure==='public')out.push({id:'node-data-exposure:'+n.id,code:'node-data-exposure',level:'error',objectId:n.id,title:n.ref+' '+n.title+' exposes a data tier',detail:n.ref+' '+n.title+' is a data tier open to the public: data rests behind a private exposure. Make it private, or say why it is no data tier.'});
 return out;
}

// ---------------------------------------------------------------- the record graph
// A gate and the data it restricts; a copy, the data it copies, where it rests and the plan that holds it; a plan's
// backup zone (backsUpTo), which the copies the trail places read. Only in a typed project; between objects only.
function emitGates(p,add,rel,has){
 if(!topologyTyped(p))return;
 for(const g of gates(p))if(g?.id&&!isProposed(g)){add(g,'gate','runtime.gates.'+g.id);if(has(g.id))for(const id of list(g.dataIds))if(has(id))rel('restricts',g.id,id,{source:'runtime.gates.dataIds'});}
 for(const c of copies(p))if(c?.id&&!isProposed(c)){add(c,'copy','runtime.copies.'+c.id);if(!has(c.id))continue;
  if(has(c.dataId))rel('copyOf',c.id,c.dataId,{source:'runtime.copies.dataId'});const at=c.zoneId||c.nodeId;if(at&&has(at))rel('restsIn',c.id,at,{source:'runtime.copies.'+(c.zoneId?'zoneId':'nodeId')});if(c.planId&&has(c.planId))rel('heldBy',c.id,c.planId,{source:'runtime.copies.planId'});}
 for(const r of list(p.runtime?.plans))if(r?.backupZoneId&&has(r.id)&&has(r.backupZoneId)&&hostingZone(find(p.runtime.zones,r.backupZoneId)))rel('backsUpTo',r.id,r.backupZoneId,{source:'runtime.plans.backupZoneId'});
}

// ---------------------------------------------------------------- what the record saves refuse by who writes the commit
function refuseDraft(p,command,{author}={}){
 if(!author||author.kind!==DRAFT&&author.account!=='agent')return;
 const raw=command?.payload||{},gate=command.type==='runtime.gate';
 {const old=standingOf(gate?gates(p):copies(p),raw);if(old)return refOf(old)+(gate?' is a location gate a person saved: a draft by Sol or an agent account changes no gate that stands. It sends a gate':' is a data copy a person saved: a draft by Sol or an agent account changes no copy that stands. It sends a copy')+' of its own as a proposal (origin: sol-draft), and a person keeps it.';}
 if(raw.origin!==DRAFT)return 'A draft by Sol or an agent account sends a location gate or a data copy as its proposal (origin: sol-draft); a person keeps it.';
 if(command.type==='runtime.gate'&&list(raw.permitted).length)return 'A draft by Sol or an agent account names no permitted jurisdiction: a person states where data may rest, from the obligation\'s source.';
}

// ---------------------------------------------------------------- what this part registers
const touch=s=>{s.version++;s.review=null;s.handoff=null;};
function applyGateCommand(p,command,at,actor,options){
 const raw=command.payload||{},type=command.type;
 if(type==='runtime.gate-evidence')return recordEvidence(p,raw,at,actor,options);
 if(type==='runtime.copy-proposals')return {document:p,selected:proposeCopies(p,raw)};
 const [r,changed]=(type==='runtime.gate'?saveGate:saveCopy)(p,raw,at,actor);if(changed&&!isProposed(r))touch(p.runtime);
 return {document:p,selected:r.id};
}
TRACKED.push(['runtime.gates',10,'gate',GATE_KEYS.filter(k=>k!=='open'),true],['runtime.copies',10,'copy',COPY_KEYS.filter(k=>k!=='open'),true]);
Object.assign(LABELS,{dataIds:'Data',classifications:'Classifications',personalData:'Personal data',permitted:'Permitted jurisdictions',requires:'Requires',nodeIds:'Deployment nodes',requirement:'Requirement',source:'Source',dataId:'Data',planId:'Runtime plan',zoneId:'Zone',derivedFrom:'Derived from'});
// What gates and copies say to the design fingerprint: all but who wrote and reviewed them, and a step a recovery import
// moved aside (the fix-up's should-fix 7); a proposal says nothing.
const DESIGN_OFF=new Set([...BOOKKEEPING,'actor','recorded','importedReview']),statement=xs=>{const out=xs.filter(r=>r&&!isProposed(r)).map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>!DESIGN_OFF.has(k))));return out.length?out:undefined;};
const edit={apply:applyGateCommand,staged:true,validate:refuseDraft};
export const GATES_PART={
 objectTypes:{gate:{label:'Location gate',chapter:10,level:'deployment',prefix:'LG'},copy:{label:'Data copy',chapter:10,level:'deployment',prefix:'DCP'}},
 records:emitGates,
 layers:{copy:'copy',gate:'gate'},
 hops:[{layer:'copy',types:['copyOf'],from:['data'],dir:'in',ctx:true},{layer:'gate',types:['restricts'],from:['data'],dir:'in',ctx:true}],
 commands:{'runtime.gate':edit,'runtime.copy':edit,'runtime.copy-proposals':{apply:applyGateCommand},'runtime.gate-evidence':{apply:applyGateCommand,second:(p,command)=>find(p?.runtime?.gates,command?.payload?.id)}},
 checks:{10:gateFindings},
 lifecycle:{'runtime.gates':10,'runtime.copies':10},
 quietProposals:{'runtime.gates':true,'runtime.copies':true},
 provenance:{nouns:{'runtime.gates':'location gate','runtime.copies':'data copy'},paths:{'runtime.gate':['runtime.gates'],'runtime.gate-evidence':['runtime.gates'],'runtime.copy':['runtime.copies'],'runtime.copy-proposals':['runtime.copies']}},
 design:{'runtime.gates':p=>statement(gates(p)),'runtime.copies':p=>statement(copies(p))},
 designKeys:['runtime.gates','runtime.copies']
};
