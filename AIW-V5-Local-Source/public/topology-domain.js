// The typed topology of a project (rc44, wp9a slice 1; audit/rc44/design/wp9a-deployment.md): failure domains
// (Chapter 6, technology.domains, FD-nnn), deployment nodes (Chapter 10, runtime.nodes, DN-nnn) and where a zone and a
// placement stand in them. One part of the design package p30-deployment (topology.js assembles the parts and registers
// them at the one registration point, design-extensions.js). Pure: no clock but the `at` a command is handed, no
// randomness; ids come from the chapters' counters.
//   The marker    runtime.topology {schemaVersion, review: {actor, at, account}}: a signed-in person chose to type this
//                 project's topology (runtime.topology-start). Every other topology command is refused without it, and
//                 nothing of the package is read into the record graph without it. Who chose it is kept under `review`,
//                 which a project copied from a template clears: the copy stays typed, by nobody there yet.
//   Records       a failure domain {title, scope, cause, parentId, basis, owner, recoveryOwner, treatment}; a node
//                 {kind, title, parentId, domainId, jurisdiction, place, provider, tier, exposure, address, reason,
//                 owner, basis, boundaryIds}. Each is saved as a patch (a field left out keeps its value, null clears
//                 it, words past a limit are refused), keeps its revision and a bounded history, and retires, restores
//                 and keeps through the one lifecycle family (record-lifecycle.js). What is not stated is '', never guessed.
//   Where         a zone names the node it sits in (nodeId), the failure domain it stands in and the causes it shares
//                 (domainIds: the first is the hosting failure domain every reader reads, runtime-model.js
//                 failureDomainKey), and why (reason); a placement names a node under its zone's node. Written by
//                 runtime.locate only; the zone's and the placement's own saves keep them.
//   Proposals     AIW proposes a failure domain for each name in use (technology.domain-proposals) and binds nothing; a
//                 draft by Sol or an agent account sends a node or a domain as its proposal (origin sol-draft). A
//                 proposal is named by no zone, placement or node and is read by nothing until a person keeps it or
//                 saves a change to it; only the tree link (parentId) may name one, so that a drafted tree can stand.
import {withRuntime} from './runtime-domain.js';
import {failureDomainKey,hostingZone,statedField} from './runtime-model.js';
import {NOT_STATED,SEEDED,PROPOSED,isProposed,authoredOrigin,authored,patchFields,patchLinks,patchOpen,sameRecord,retiredOf,fitText} from './technology-domain.js';
import {withChanges} from './changes-domain.js';
import {list} from './util.js';

export const DOMAIN_SCOPES=['instance','node','zone','site','region','provider','global'];
export const DOMAIN_CAUSES=['location','power','network-path','carrier','identity','naming','key-service','configuration','release','control-plane','operator','supplier','data-store','other'];
export const DOMAIN_TREATMENTS=['remove','isolate','accept'];
export const NODE_KINDS=['account','region','availability-zone','site','network','subnet','cluster','node-pool','namespace','cell','managed-service','edge','external-network'];
export const NODE_TIERS=['ingress','workload','data','endpoint','management'],NODE_EXPOSURES=['private','public'];
// What one workspace keeps, and how deep its two trees go.
export const TOPOLOGY_LIMITS=Object.freeze({nodes:2000,domains:500,nodeDepth:8,domainDepth:6,zoneDomains:12});
const DRAFT='sol-draft',pad=n=>String(n).padStart(3,'0'),fmt=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,','),norm=s=>String(s||'').trim().toLowerCase();
const find=(xs,id)=>typeof id==='string'&&id?list(xs).find(x=>x?.id===id)||null:null,refOf=r=>r?.ref||r?.id,and=xs=>xs.length>1?xs.slice(0,-1).join(', ')+' and '+xs.at(-1):xs[0]||'';
// A stated shared cause: a cause that is no location. A domain that states none, or a location, is where something stands.
const sharedCause=d=>!!d?.cause&&d.cause!=='location';
export const topologyTyped=p=>!!p?.runtime?.topology;
export const failureDomains=p=>list(p?.technology?.domains),deploymentNodes=p=>list(p?.runtime?.nodes);

// One IPv4 or IPv6 prefix, read strictly: an address and its length, no host bit set, no leading zero in a decimal
// part, at most one '::', no IPv4 tail in an IPv6 address. Answers {family, parts, length, text} or null.
export function parsePrefix(value){
 if(typeof value!=='string')return null;
 const text=value.trim().toLowerCase(),m=/^([0-9a-f:.]+)\/(0|[1-9]\d{0,2})$/.exec(text);if(!m)return null;
 const length=+m[2];let parts,bits=16;
 if(m[1].includes('.')){
  const o=/^(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})$/.exec(m[1]);if(!o)return null;
  parts=o.slice(1).map(Number);bits=8;if(parts.some(n=>n>255))return null;
 }else{
  const halves=m[1].split('::'),groups=h=>h===''?[]:h.split(':');if(halves.length>2)return null;
  const head=groups(halves[0]),tail=halves.length===2?groups(halves[1]):[],n=head.length+tail.length;
  if([...head,...tail].some(g=>!/^[0-9a-f]{1,4}$/.test(g))||(halves.length===2?n>7:n!==8))return null;
  parts=[...head,...Array(8-n).fill('0'),...tail].map(g=>parseInt(g,16));
 }
 if(length>bits*parts.length)return null;
 let left=length;for(const part of parts){const keep=Math.min(bits,Math.max(0,left));if(part&(2**(bits-keep)-1))return null;left-=keep;}
 return {family:bits===8?4:6,parts,length,text};
}

// ---------------------------------------------------------------- the two trees
// The records above one in its tree, nearest first; a parent that is not there ends the chain.
function above(xs,r){const out=[],seen=new Set([r.id]);for(let x=find(xs,r.parentId);x&&!seen.has(x.id);x=find(xs,x.parentId)){seen.add(x.id);out.push(x);}return out;}
const height=(xs,id,left=12)=>left?1+Math.max(0,...xs.filter(x=>x.parentId===id).map(x=>height(xs,x.id,left-1))):1;
// Whether a node lies under another, at any depth (never itself).
export const nodeUnder=(p,id,ancestorId)=>{const n=find(deploymentNodes(p),id);return !!n&&above(deploymentNodes(p),n).some(x=>x.id===ancestorId);};
// The parent a save names: kept when the save leaves it out, cleared by null; it exists, the record does not lie inside
// itself and the tree stays within its depth.
function patchParent(xs,old,raw,noun,max){
 const id=raw.parentId===undefined?old?.parentId||'':raw.parentId||'';if(!id||id===old?.parentId)return id;
 const parent=find(xs,id);if(!parent)throw Error('Choose an existing '+noun+' as its parent.');
 const chain=[parent,...above(xs,parent)];
 if(old&&chain.some(x=>x.id===old.id))throw Error(refOf(old)+' cannot lie inside itself.');
 if(chain.length+(old?height(xs,old.id):1)>max)throw Error((noun==='failure domain'?'Failure domains nest':'Deployment nodes nest')+' at most '+max+' deep.');
 return id;
}
// A record a zone, a placement or a node may name: there, and a person's (written or kept).
function authoredRecord(xs,id,noun){const r=find(xs,id);if(!r)throw Error('Choose an existing '+noun+'.');if(isProposed(r))throw Error(refOf(r)+' is still a proposal: keep it first.');return r;}
function revise(r,at,origin){r.history=[...list(r.history),{at,revision:r.revision,title:r.title,...(origin&&origin!==r.origin?{origin:r.origin}:{})}];if(r.history.length>24)r.history=[r.history[0],...r.history.slice(-23)];r.revision++;}
// Stores a save. A new record is its author's, or Sol's proposal when the save says it is a draft (origin sol-draft).
// A person's save of a proposal makes it authored; a draft's save of a proposal leaves it one, and its save of an
// authored record leaves that authored (the server stamps who wrote the change). A save that changes nothing a reader
// sees keeps the record and its revision.
function store(xs,old,next,raw,at,keys,fresh){
 if(old&&sameRecord(old,next,keys))return [old,false];
 const draft=raw.origin===DRAFT;
 if(!old){const r={...fresh(),revision:1,...next,origin:draft?DRAFT:authoredOrigin(null,raw),...(draft?{state:PROPOSED}:{}),history:[]};xs.push(r);return [r,true];}
 const origin=draft?isProposed(old)?DRAFT:old.origin:authoredOrigin(old,raw);
 revise(old,at,origin);Object.assign(old,next);for(const k of keys)if(!(k in next))delete old[k];
 if(draft)old.origin=origin;else authored(old,origin);
 return [old,true];
}

// ---------------------------------------------------------------- failure domains (Chapter 6)
const DOMAIN_FIELDS=[['title','t',160,'failure domain name'],['scope','e',[...DOMAIN_SCOPES,NOT_STATED],'scope'],['cause','e',[...DOMAIN_CAUSES,NOT_STATED],'cause'],['basis','t',2400,'basis'],['owner','t',180,'owner'],['recoveryOwner','t',180,'recovery owner'],['treatment','e',[...DOMAIN_TREATMENTS,NOT_STATED],'treatment']];
const DOMAIN_KEYS=[...DOMAIN_FIELDS.map(([f])=>f),'parentId','open'],DOMAIN_OPEN=['scope','cause','basis','owner','recoveryOwner','treatment'];
function saveDomain(p,raw,at){
 const t=p.technology,xs=t.domains||[],old=raw.id?find(xs,raw.id):null;if(raw.id&&!old)throw Error('Choose an existing failure domain.');
 const f=patchFields(old,raw,DOMAIN_FIELDS);if(!f.title)throw Error('Name the failure domain.');
 const next={...f,parentId:patchParent(xs,old,raw,'failure domain',TOPOLOGY_LIMITS.domainDepth)},open=patchOpen(old,raw,DOMAIN_OPEN);if(open)next.open=open;
 // What a zone reads a domain as does not change under it: the domain it stands in stays one, a cause it shares stays one.
 if(old){
  const zs=list(p.runtime.zones),stand=zs.filter(z=>z.domainIds?.[0]===old.id).map(refOf),share=zs.filter(z=>list(z.domainIds).indexOf(old.id)>0).map(refOf);
  if(stand.length&&sharedCause(next))throw Error(and(stand)+(stand.length>1?' stand':' stands')+' in '+old.ref+': it keeps a location as its cause, or states none.');
  if(share.length&&!sharedCause(next))throw Error(and(share)+(share.length>1?' name ':' names ')+old.ref+' as a cause '+(share.length>1?'they share':'it shares')+': it keeps a cause that is no location.');
 }else if(xs.length>=TOPOLOGY_LIMITS.domains)throw Error('This workspace keeps up to '+fmt(TOPOLOGY_LIMITS.domains)+' failure domains.');
 t.domains=xs;
 return store(xs,old,next,raw,at,DOMAIN_KEYS,()=>{const n=t.counters.domain=(t.counters.domain||0)+1;return {id:'fd-'+pad(n),ref:'FD-'+pad(n)};});
}
// One proposal for each name in use that no failure domain carries yet: the hosting failure domain a zone states by
// name (as every reader reads it: runtime-model.js failureDomainKey) and the primary and alternate failure domain a
// capability states. A zone that stands in a typed domain, a name a domain carries (its title or the names it was
// proposed from), a name whose proposal a person dismissed and a text too long to be a name are left out. Each proposal
// states its name and nothing else: no scope, cause or parent is guessed. It binds nothing and moves no version: a
// proposal counts in no check until a person keeps it.
function proposeDomains(p){
 const t=p.technology,xs=t.domains||[],taken=new Set([...xs,...retiredOf(p,'technology.domains').map(x=>x.record)].flatMap(d=>[norm(d?.title),...list(d?.legacyKeys)])),names=new Map();
 const note=(key,title)=>{if(key&&title.length<=160&&!taken.has(key)&&!names.has(key))names.set(key,title);};
 for(const z of list(p.runtime.zones))if(hostingZone(z)&&!isProposed(z)&&!list(z.domainIds).length)note(failureDomainKey(z),String(z.failureDomain??'').trim());
 for(const c of list(t.capabilities))if(!isProposed(c))for(const f of ['failureDomain','alternateDomain'])if(statedField(c,f))note(norm(c[f]),String(c[f]).trim());
 if(!names.size)return null;
 const n=xs.length+names.size;if(n>TOPOLOGY_LIMITS.domains)throw Error('This workspace keeps up to '+fmt(TOPOLOGY_LIMITS.domains)+' failure domains; '+names.size+(names.size>1?' names':' name')+' in use would make '+fmt(n)+'.');
 t.domains=xs;const first=xs.length;
 for(const [key,title] of names){const seq=t.counters.domain=(t.counters.domain||0)+1;xs.push({id:'fd-'+pad(seq),ref:'FD-'+pad(seq),revision:1,title,scope:'',cause:'',basis:'',owner:'',recoveryOwner:'',treatment:'',parentId:'',legacyKeys:[key],origin:SEEDED,state:PROPOSED,history:[]});}
 return xs[first].id;
}

// ---------------------------------------------------------------- deployment nodes (Chapter 10)
const NODE_FIELDS=[['title','t',160,'node name'],['kind','e',NODE_KINDS,'kind of node'],['place','t',160,'place'],['provider','t',160,'provider'],['tier','e',[...NODE_TIERS,NOT_STATED],'tier'],['exposure','e',[...NODE_EXPOSURES,NOT_STATED],'exposure'],['reason','t',600,'reason'],['owner','t',180,'owner'],['basis','t',2400,'basis']];
const NODE_KEYS=[...NODE_FIELDS.map(([f])=>f),'parentId','domainId','jurisdiction','address','boundaryIds','open'],NODE_OPEN=['place','provider','jurisdiction','tier','exposure','address','reason','owner','basis'];
const patchValue=(old,raw,f)=>raw[f]===undefined?old?.[f]??'':raw[f]??'';
function saveNode(p,raw,at){
 const m=p.runtime,xs=m.nodes||[],old=raw.id?find(xs,raw.id):null;if(raw.id&&!old)throw Error('Choose an existing deployment node.');
 const f=patchFields(old,raw,NODE_FIELDS);if(!f.title||!f.kind)throw Error('Name the node and choose its kind.');
 if(f.tier&&!['network','subnet'].includes(f.kind))throw Error('Only a network or a subnet has a tier.');
 const jurisdiction=patchValue(old,raw,'jurisdiction');if(jurisdiction!==''&&!/^[A-Z]{2}$/.test(jurisdiction))throw Error('Give the jurisdiction as two capital letters (ISO 3166-1 alpha-2), or leave it not stated.');
 let address=patchValue(old,raw,'address');if(address!==''){const x=parsePrefix(address);if(!x)throw Error('Give the address as one IPv4 or IPv6 prefix with its length and no host bit set (10.20.0.0/16, 2001:db8::/32), or leave it not stated.');address=x.text;}
 const domainId=patchValue(old,raw,'domainId');if(domainId&&domainId!==old?.domainId)authoredRecord(p.technology.domains,domainId,'failure domain');
 const boundaryIds=patchLinks(old,raw,'boundaryIds',id=>list(p.technology.boundaries).some(b=>b.id===id),'trust boundaries',20);
 const next={...f,parentId:patchParent(xs,old,raw,'deployment node',TOPOLOGY_LIMITS.nodeDepth),domainId,jurisdiction,address,boundaryIds},open=patchOpen(old,raw,NODE_OPEN);if(open)next.open=open;
 if(!old&&xs.length>=TOPOLOGY_LIMITS.nodes)throw Error('This workspace keeps up to '+fmt(TOPOLOGY_LIMITS.nodes)+' deployment nodes.');
 m.nodes=xs;
 return store(xs,old,next,raw,at,NODE_KEYS,()=>{const n=m.counters.node=(m.counters.node||0)+1;return {id:'dn-'+pad(n),ref:'DN-'+pad(n)};});
}

// ---------------------------------------------------------------- where a zone and a placement stand
// {zoneId, nodeId?, domainIds?, reason?} or {placementId, nodeId}: a patch, as every save is. A key that names nothing
// is not kept, so a zone or a placement that names nothing typed has the shape it had before.
const put=(r,k,v)=>{if(Array.isArray(v)?v.length:v)r[k]=v;else delete r[k];};
function locate(p,raw){
 const m=p.runtime,nodes=m.nodes,node=id=>refOf(find(nodes,id))||id;
 if(raw.placementId!==undefined){
  const l=m.placements.find(x=>x.id===raw.placementId);if(!l)throw Error('Choose an existing zone or placement.');
  const z=m.zones.find(x=>x.id===l.zoneId),nodeId=raw.nodeId===undefined?l.nodeId||'':raw.nodeId||'';
  if(nodeId===(l.nodeId||''))return {selected:l.planId,selectedIds:[l.id],changed:false};
  if(nodeId){
   authoredRecord(nodes,nodeId,'deployment node');
   if(!z?.nodeId)throw Error('Locate '+(refOf(z)||l.zoneId)+' in a node first: a placement stands in a node under its zone\'s node.');
   if(!nodeUnder(p,nodeId,z.nodeId))throw Error(node(nodeId)+' does not lie under '+node(z.nodeId)+', the node of '+refOf(z)+'.');
  }
  const next={...l,revision:(l.revision||0)+1};put(next,'nodeId',nodeId);m.placements[m.placements.indexOf(l)]=next;
  return {selected:l.planId,selectedIds:[l.id],changed:true};
 }
 const z=m.zones.find(x=>x.id===raw.zoneId);if(!z)throw Error('Choose an existing zone or placement.');
 const nodeId=raw.nodeId===undefined?z.nodeId||'':raw.nodeId||'',reason=raw.reason===undefined?z.reason||'':fitText(raw.reason,600,'The reason');
 if(nodeId!==(z.nodeId||'')){
  if(nodeId)authoredRecord(nodes,nodeId,'deployment node');
  for(const l of m.placements)if(l.zoneId===z.id&&l.nodeId&&!(nodeId&&nodeUnder(p,l.nodeId,nodeId)))throw Error(l.id+' stands in '+node(l.nodeId)+(nodeId?', which does not lie under '+node(nodeId)+'. Move it first.':', under the node of '+refOf(z)+'. Clear it first.'));
 }
 const domains=p.technology.domains,domainIds=patchLinks(z,raw,'domainIds',id=>!!find(domains,id),'failure domains',TOPOLOGY_LIMITS.zoneDomains);
 if(raw.domainIds!==undefined)domainIds.forEach((id,i)=>{
  const d=authoredRecord(domains,id,'failure domain');
  if(!i&&sharedCause(d))throw Error('The first failure domain a zone names is the one it stands in: '+d.ref+' is a shared cause ('+d.cause+').');
  if(i&&!sharedCause(d))throw Error('After the domain it stands in a zone names the causes it shares: '+d.ref+' states no shared cause.');
 });
 if(nodeId===(z.nodeId||'')&&reason===(z.reason||'')&&JSON.stringify(domainIds)===JSON.stringify(list(z.domainIds)))return {selected:z.id,changed:false};
 const next={...z,revision:(z.revision||0)+1};put(next,'nodeId',nodeId);put(next,'domainIds',domainIds);put(next,'reason',reason);m.zones[m.zones.indexOf(z)]=next;
 return {selected:z.id,changed:true};
}

// ---------------------------------------------------------------- the commands
export const UNTYPED='This project\'s topology is not typed yet. A signed-in person chooses that first (runtime.topology-start).';
// (document, command, at, actor, {author}) as every handler is called; inside a reviewed batch with the first four.
// A change of Chapter 10 moves its version and clears its check and handoff, as its own commands do, and a change of
// Chapter 6 its own; AIW's proposals and a step taken again move neither.
export function applyTopologyCommand(input,command,at,actor,options){
 const p=withRuntime(input),m=p.runtime,t=p.technology,raw=command.payload||{},type=command.type,touch=s=>{s.version++;s.review=null;s.handoff=null;};
 if(type==='runtime.topology-start'){
  // Idempotent: once a person here has chosen it, the step is on record and a second request changes nothing. In a
  // project copied from a template the topology is typed and the step is nobody's yet: a person takes it again there.
  if(!m.topology?.review){if(!m.topology)touch(m);m.topology={schemaVersion:1,review:{actor,at,account:options?.author?.account??null}};}
  return {document:p,selected:null};
 }
 if(!m.topology)throw Error(UNTYPED);
 if(type==='technology.domain'){const [r,changed]=saveDomain(p,raw,at);if(changed)touch(t);return {document:p,selected:r.id};}
 if(type==='technology.domain-proposals')return {document:p,selected:proposeDomains(p)};
 if(type==='runtime.node'){const [r,changed]=saveNode(p,raw,at);if(changed)touch(m);return {document:p,selected:r.id};}
 if(type==='runtime.locate'){const {changed,...answer}=locate(p,raw);if(changed)touch(m);return {document:p,...answer};}
 throw Error('Unknown topology action.');
}
// What the two record saves refuse by who writes the commit, which a handler is not told inside a reviewed batch: a
// draft by Sol and an agent account send a record as their proposal and say so (a person keeps it), and name no
// jurisdiction: where a node lies is stated by a person, never drafted.
export function refuseDraft(p,command,{author}={}){
 if(!author||author.kind!==DRAFT&&author.account!=='agent')return;
 const raw=command?.payload||{};
 if(raw.origin!==DRAFT)return 'A draft by Sol or an agent account sends a deployment node or a failure domain as its proposal (origin: sol-draft); a person keeps it.';
 if(command.type==='runtime.node'&&raw.jurisdiction!=null&&raw.jurisdiction!=='')return 'A jurisdiction is stated by a signed-in person: a draft by Sol or an agent account names none.';
}

// ---------------------------------------------------------------- the record graph
// The records and the relations their fields state, for the one emitter (record-graph.js): only in a typed project,
// only records a person wrote or kept, and a relation only between records that are there. A zone or a placement sits
// in its node and, derived by way of the parents, in each node that node lies in; a zone and a node fail with the
// domain they name and, derived, with each domain that domain lies in. A chain ends at a proposal.
export function emitTopology(p,add,rel){
 if(!topologyTyped(p))return;
 const live=xs=>new Map(list(xs).filter(r=>r?.id&&!isProposed(r)).map(r=>[r.id,r])),nodes=live(p.runtime.nodes),domains=live(p.technology?.domains);
 for(const n of nodes.values())add(n,'node','runtime.nodes.'+n.id);
 for(const d of domains.values())add(d,'failureDomain','technology.domains.'+d.id);
 const chain=(xs,type)=>(from,id,source)=>{const seen=new Set(),via=[];for(let x=xs.get(id);x&&!seen.has(x.id);x=xs.get(x.parentId)){rel(type,from,x.id,via.length?{source,derived:true,via:[...via]}:{source});seen.add(x.id);via.push(x.id);}},sits=chain(nodes,'sitsIn'),fails=chain(domains,'failsWith');
 for(const z of list(p.runtime.zones)){sits(z.id,z.nodeId,'runtime.zones.nodeId');for(const id of list(z.domainIds))fails(z.id,id,'runtime.zones.domainIds');}
 for(const l of list(p.runtime.placements))sits(l.id,l.nodeId,'runtime.placements.nodeId');
 for(const n of nodes.values()){if(nodes.has(n.parentId))rel('partOf',n.id,n.parentId,{source:'runtime.nodes.parentId'});fails(n.id,n.domainId,'runtime.nodes.domainId');}
 for(const d of domains.values())if(domains.has(d.parentId))rel('partOf',d.id,d.parentId,{source:'technology.domains.parentId'});
}

// ---------------------------------------------------------------- the journal
// The package's tracker (design-extensions.js track: called for every command of every commit, and again for each
// command a batch carries): what a commit changed of the typed topology is one change of the journal for each record,
// with the record as its source and what it said before and after. The server stamps who sent the commit, of what
// kind and why. Journalled: the step that types the project; a node or a failure domain made or changed (AIW's own
// proposals are not changes of the design, and a record a restore brought back was not made by the commit); where a
// zone or a placement stands. A change of the typed topology opens no review of other records, and says so.
const LABELS={title:'Name',kind:'Kind of node',parentId:'Lies in',domainId:'Failure domain it is',jurisdiction:'Jurisdiction',place:'Place',provider:'Provider',tier:'Tier',exposure:'Exposure',address:'Address prefix',reason:'Reason',owner:'Owner',basis:'Basis',boundaryIds:'Trust boundaries',scope:'Scope',cause:'Cause',recoveryOwner:'Recovery owner',treatment:'Treatment',nodeId:'Deployment node',domainIds:'Failure domains'};
const QUIET='A change of the typed topology is read as it stands by the checks of Chapters 6 and 10: it opens no review of other records.';
const said=(r,keys)=>Object.fromEntries(keys.map(k=>[k,structuredClone(r?.[k]??(k.endsWith('Ids')?[]:''))]));
const TRACKED=[['runtime.nodes',10,'node',NODE_KEYS.filter(k=>k!=='open'),true],['technology.domains',6,'failureDomain',DOMAIN_KEYS.filter(k=>k!=='open'),true],['runtime.zones',10,'zone',['nodeId','domainIds','reason'],false],['runtime.placements',10,'placement',['nodeId'],false]];
const rows=(p,path)=>{const [a,b]=path.split('.');return list(p?.[a]?.[b]);};
export function trackTopology(prior,next,command,at){
 const m=next?.runtime,was=prior?.runtime;if(!m?.topology)return;
 const started=!!m.topology.review&&!was?.topology?.review;
 if(!started&&m.version===was?.version&&next.technology?.version===prior?.technology?.version)return;
 // What this commit has journalled already: a second call for the same commit (a batch's inner command) adds nothing.
 const done=new Set(list(next.changes?.events).slice(list(prior?.changes?.events).length).map(e=>e?.source?.chapter+':'+e?.source?.id));
 const journal=(chapter,id,ref,kind,title,before,after,fields)=>{
  if(done.has(chapter+':'+id))return;done.add(chapter+':'+id);withChanges(next);
  next.changes.events.push({id:'CHG-'+pad(++next.changes.counter),source:{chapter,id,ref,kind,title},title,at,before,after,fields,items:[],quiet:{reason:QUIET}});
 };
 if(started)journal(10,'topology','Topology','topology','The topology of this project is typed',null,{typed:true},[{key:'typed',label:'Typed topology',before:false,after:true}]);
 const restored=new Set(list(prior?.retired?.records).map(x=>x?.path+'|'+x?.id));
 for(const [path,chapter,kind,keys,own] of TRACKED){
  const old=new Map(rows(prior,path).map(r=>[r?.id,r]));
  for(const r of rows(next,path)){
   // (every save of these records moves the revision, so a record at its earlier revision says what it said)
   const o=old.get(r?.id);if(!r?.id||(o?o.revision===r.revision:!own||isProposed(r)&&r.origin===SEEDED||restored.has(path+'|'+r.id)))continue;
   const before=said(o,keys),after=said(r,keys),fields=keys.filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k])).map(k=>({key:k,label:LABELS[k],before:before[k],after:after[k]}));
   if(fields.length)journal(chapter,r.id,refOf(r),kind,r.title||r.id,o?before:null,after,fields);
  }
 }
}

// ---------------------------------------------------------------- what this part registers
// The part of the package this module states (topology.js assembles the parts into the one registration).
const edit={apply:applyTopologyCommand,staged:true},record={...edit,validate:refuseDraft};
export const TOPOLOGY_PART={
 objectTypes:{failureDomain:{label:'Failure domain',chapter:6,level:'capability',prefix:'FD'},node:{label:'Deployment node',chapter:10,level:'deployment',prefix:'DN'}},
 records:emitTopology,
 layers:{node:'node',domain:'failureDomain'},
 hops:[{layer:'node',types:['sitsIn'],from:['zone','placement'],dir:'out',ctx:false},{layer:'domain',types:['failsWith'],from:['zone','node'],dir:'out',ctx:false}],
 commands:{'runtime.topology-start':{apply:applyTopologyCommand,person:true},'technology.domain':record,'technology.domain-proposals':{apply:applyTopologyCommand},'runtime.node':record,'runtime.locate':edit},
 track:trackTopology,
 lifecycle:{'technology.domains':6,'runtime.nodes':10},
 provenance:{nouns:{'technology.domains':'failure domain','runtime.nodes':'deployment node'},paths:{'technology.domain':['technology.domains'],'technology.domain-proposals':['technology.domains'],'runtime.node':['runtime.nodes']}},
 designKeys:['technology.domains','runtime.nodes'],
 evidenceKeys:['runtime.topology']
};
