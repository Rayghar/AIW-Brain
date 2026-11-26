// The typed topology of a project (rc44, wp9a slice 1; audit/rc44/design/wp9a-deployment.md): failure domains
// (Chapter 6, technology.domains, FD-nnn), deployment nodes (Chapter 10, runtime.nodes, DN-nnn) and where a zone and a
// placement stand in them. One part of the design package p30-deployment (topology.js assembles the parts and registers
// them at the one registration point, design-extensions.js). Pure: no clock but the `at` a command is handed, no
// randomness; ids come from Chapter 10's counters (runtime.counters.node and .domain, which the design fingerprint does
// not read: a proposal, which says nothing to it, moves no counter it reads; ruling L6).
//   The marker    runtime.topology {schemaVersion, review: {actor, at, account}}: a signed-in person chose to type this
//                 project's topology (runtime.topology-start). Every other topology command is refused without it, and
//                 nothing of the package is read into the record graph without it. Who chose it is kept under `review`,
//                 which a project copied from a template clears and a recovery import moves aside (importedReview). Either
//                 way the project stays typed, by nobody here yet, and its topology commands are refused
//                 until a person here takes the step (ruling L5). Typed or not is design; who chose it, and when, is not.
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
import {failureDomainKey,hostingZone,statedField} from './runtime-model.js';
import {NOT_STATED,SEEDED,PROPOSED,authoredOrigin,authored,patchFields,patchLinks,patchOpen,sameRecord,retiredOf,fitText} from './technology-domain.js';
import {isProposed} from './record-lifecycle.js';
import {withChanges} from './changes-domain.js';
import {judgementOf} from './provenance.js';
import {remember} from './document-memo.js';
import {list} from './util.js';

export const DOMAIN_SCOPES=['instance','node','zone','site','region','provider','global'];
export const DOMAIN_CAUSES=['location','power','network-path','carrier','identity','naming','key-service','configuration','release','control-plane','operator','supplier','data-store','other'];
export const DOMAIN_TREATMENTS=['remove','isolate','accept'];
export const NODE_KINDS=['account','region','availability-zone','site','network','subnet','cluster','node-pool','namespace','cell','managed-service','edge','external-network'];
export const NODE_TIERS=['ingress','workload','data','endpoint','management'],NODE_EXPOSURES=['private','public'];
// What one workspace keeps, and how deep its two trees go (ruling L8, reached through the commands: the suite's case
// S1.18). With every field, open entry and history at its limit, 120 nodes and 60 failure domains take about 3,740,000
// of the 8,000,000 characters a document holds (about 20,800 a record with its stamp): these counts bind first while the
// rest of a project holds less than the other half.
export const TOPOLOGY_LIMITS=Object.freeze({nodes:120,domains:60,nodeDepth:8,domainDepth:6,zoneDomains:12});
// The officially assigned ISO 3166-1 alpha-2 codes (249; none reserved or user-assigned): where a node lies is stated
// as one of these. Here, in the lazy entry, not on the route (ruling L8).
export const JURISDICTIONS=new Set('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' '));
const DRAFT='sol-draft',pad=n=>String(n).padStart(3,'0'),fmt=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,','),norm=s=>String(s||'').trim().toLowerCase();
const find=(xs,id)=>typeof id==='string'&&id?list(xs).find(x=>x?.id===id)||null:null,refOf=r=>r?.ref||r?.id,and=xs=>xs.length>1?xs.slice(0,-1).join(', ')+' and '+xs.at(-1):xs[0]||'';
// A stated shared cause: a cause that is no location. A domain that states none, or a location, is where something stands.
const sharedCause=d=>!!d?.cause&&d.cause!=='location';
export const topologyTyped=p=>!!p?.runtime?.topology;
// Whether a signed-in person chose it in this project: a template copy clears the step (review null) and a recovery
// import moves it aside (importedReview, recovery-service.js neutraliseImportedAuthority), so a step taken elsewhere is
// nobody's here and no date is compared (rulings F3, L5 and M2).
const chosenHere=p=>!!p?.runtime?.topology?.review?.actor;
export const failureDomains=p=>list(p?.technology?.domains),deploymentNodes=p=>list(p?.runtime?.nodes);

// One IPv4 or IPv6 prefix, read strictly: an address and its length, no host bit set, no leading zero in a decimal
// part, at most one '::', no IPv4 tail in an IPv6 address and no IPv4-mapped address (::ffff:0:0/96) in hex either.
// Answers {family, parts, length, text} or null; text is the canonical text (dotted decimal; RFC 5952: lower case, no
// leading zeros, the longest run of two or more zero groups, the first of equals, as '::'), so one prefix has one text.
// A comparison of prefixes (slice 3's overlap check) reads parts and length, never the text.
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
  if(parts.slice(0,5).every(g=>!g)&&parts[5]===0xffff)return null;
 }
 if(length>bits*parts.length)return null;
 let left=length;for(const part of parts){const keep=Math.min(bits,Math.max(0,left));if(part&(2**(bits-keep)-1))return null;left-=keep;}
 return {family:bits===8?4:6,parts,length,text:(bits===8?parts.join('.'):canonical6(parts))+'/'+length};
}
function canonical6(parts){
 let at=-1,run=0;for(let i=0;i<8;){if(parts[i]){i++;continue;}let j=i;while(j<8&&!parts[j])j++;if(j-i>1&&j-i>run){at=i;run=j-i;}i=j;}
 const h=parts.map(g=>g.toString(16));return at<0?h.join(':'):h.slice(0,at).join(':')+'::'+h.slice(at+run).join(':');
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
// Words are sent as text (ruling L8): a field of words sent as an object, a number, a list or a truth value is refused,
// never stored as what String() makes of it. null clears a field, as for every save.
function textOnly(raw,spec){for(const [f,k,,label] of spec)if(k==='t'&&raw[f]!=null&&typeof raw[f]!=='string')throw Error('The '+label+' is words: send it as text.');}
// A link list as every save takes one (whole, or {add, remove}; null clears it; each id exists), bounded here in the
// record's own words.
function patchBounded(old,raw,f,exists,noun,max,owner){const ids=patchLinks(old,raw,f,exists,noun,Infinity);if(ids.length>max)throw Error(owner+' names up to '+max+' '+noun+'; '+fmt(ids.length)+' were sent.');return ids;}
// A record a zone, a placement or a node may name: there, and a person's (written or kept). A record of AIW's or Sol's
// words that is no proposal is a person's only with a person's stamp behind it (ruling L1: a keep that stamps nobody,
// as inside a merged alternative, makes nobody's record).
const PROPOSER=new Set([DRAFT,'suggestion']),stood=r=>{const v=r.provenance||{};return v.author?.kind==='person'||['kept','confirmed'].includes(v.reviewed?.how);};
function authoredRecord(xs,id,noun){const r=find(xs,id);if(!r)throw Error('Choose an existing '+noun+'.');if(isProposed(r))throw Error(refOf(r)+' is still a proposal: keep it first.');if(PROPOSER.has(r.origin)&&!stood(r))throw Error(refOf(r)+' is no person\'s record yet: a person keeps it first.');return r;}
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

// (slices 2 and 3) The same for a record a second person's step reads (a declared failure, a location gate): who wrote
// it is kept as its `actor`, and each earlier revision with its writer in `history`, never trimmed (verifierRefusal reads
// every one: architecture-obligations.js); `recorded` says who saved what it now says, and when.
// (fix-up, the review's must-fix 1 and 2) What a draft by Sol or an agent account may change of a record of slices 2 and 3:
// its proposals only. A declared failure, a location gate or a data copy that stands is a person's to change, since a
// reading of Chapter 10 rests on it; a draft sends its own as a proposal. The one rule of both parts' validate.
export const standingOf=(xs,raw)=>{const old=raw?.id!=null?find(xs,raw.id):null;return old&&!isProposed(old)?old:null;};
// (ruling L11 (d); the fix-up's must-fix 2 and 3) Whose words a reading of slices 2 and 3 does not stand on: a record that
// a draft by Sol, an import or an agent account wrote last and no person has reviewed since (kept, confirmed or merged by
// a person, or judged kept through the review plan). draftedIds answers each such record of what those readings read
// (zones, placements, plans, environments, nodes, failure domains, data, claims, gates, copies), by id, once a document;
// a document without one answers an empty map.
const unreviewed=(p,r)=>{const v=r?.provenance;return !!v?.author&&v.author.kind!=='person'&&!v.reviewed&&judgementOf(p,r)?.outcome!=='kept';};
const READ_PATHS=[['runtime','zones'],['runtime','placements'],['runtime','plans'],['runtime','environments'],['runtime','nodes'],['technology','domains'],['interfaces','data'],['runtime','failures'],['runtime','gates'],['runtime','copies']];
export const draftedIds=p=>remember(p,'topology:drafted','all',()=>{const out=new Map();for(const [a,b] of READ_PATHS)for(const r of list(p?.[a]?.[b]))if(r?.id&&!isProposed(r)&&unreviewed(p,r))out.set(r.id,r);return out;});
// The records of ids a draft changed last, in their order, named; and the sentence that says so ('' for none).
export const draftedOf=(p,ids)=>{const D=draftedIds(p);return D.size?[...new Set(ids)].filter(id=>D.has(id)).map(id=>D.get(id)):[];};
export const draftedWords=xs=>xs.length?and(xs.map(r=>[r.ref||r.id,r.title].filter(Boolean).join(' ')))+(xs.length>1?' were':' was')+' last changed by a draft no person has reviewed':'';
export function storeWritten(xs,old,next,raw,at,actor,keys,fresh){
 if(old&&sameRecord(old,next,keys))return [old,false];
 const draft=raw.origin===DRAFT,who=actor||null;let r=old;
 if(!old){r={...fresh(),revision:1,...next,origin:draft?DRAFT:authoredOrigin(null,raw),...(draft?{state:PROPOSED}:{}),history:[]};xs.push(r);}
 else{const origin=draft?isProposed(old)?DRAFT:old.origin:authoredOrigin(old,raw);old.history=[...list(old.history),{at,revision:old.revision,actor:old.actor??null,title:old.title,...(origin!==old.origin?{origin:old.origin}:{})}];old.revision++;Object.assign(old,next);for(const k of keys)if(!(k in next))delete old[k];if(draft)old.origin=origin;else authored(old,origin);}
 r.actor=who;r.recorded={at,actor:who,revision:r.revision};
 return [r,true];
}
// ---------------------------------------------------------------- failure domains (Chapter 6)
const DOMAIN_FIELDS=[['title','t',160,'failure domain name'],['scope','e',[...DOMAIN_SCOPES,NOT_STATED],'scope'],['cause','e',[...DOMAIN_CAUSES,NOT_STATED],'cause'],['basis','t',2400,'basis'],['owner','t',180,'owner'],['recoveryOwner','t',180,'recovery owner'],['treatment','e',[...DOMAIN_TREATMENTS,NOT_STATED],'treatment']];
const DOMAIN_KEYS=[...DOMAIN_FIELDS.map(([f])=>f),'parentId','open'],DOMAIN_OPEN=['scope','cause','basis','owner','recoveryOwner','treatment'];
function saveDomain(p,raw,at){
 const t=p.technology,xs=t.domains||[],old=raw.id?find(xs,raw.id):null;if(raw.id&&!old)throw Error('Choose an existing failure domain.');
 textOnly(raw,DOMAIN_FIELDS);const f=patchFields(old,raw,DOMAIN_FIELDS);if(!f.title)throw Error('Name the failure domain.');
 const next={...f,parentId:patchParent(xs,old,raw,'failure domain',TOPOLOGY_LIMITS.domainDepth)},open=patchOpen(old,raw,DOMAIN_OPEN);if(open)next.open=open;
 // What a zone reads a domain as does not change under it: the domain it stands in stays one, a cause it shares stays one.
 if(old){
  const zs=list(p.runtime.zones),stand=zs.filter(z=>z.domainIds?.[0]===old.id).map(refOf),share=zs.filter(z=>list(z.domainIds).indexOf(old.id)>0).map(refOf);
  if(stand.length&&sharedCause(next))throw Error(and(stand)+(stand.length>1?' stand':' stands')+' in '+old.ref+': it keeps a location as its cause, or states none.');
  if(share.length&&!sharedCause(next))throw Error(and(share)+(share.length>1?' name ':' names ')+old.ref+' as a cause '+(share.length>1?'they share':'it shares')+': it keeps a cause that is no location.');
 }else if(xs.length>=TOPOLOGY_LIMITS.domains)throw Error('This workspace keeps up to '+fmt(TOPOLOGY_LIMITS.domains)+' failure domains.');
 if(f.cause==='location'&&f.treatment)throw Error('A location is where something stands: it takes no treatment. Leave the treatment not stated, or state a cause that is no location.');
 t.domains=xs;
 return store(xs,old,next,raw,at,DOMAIN_KEYS,()=>{const c=p.runtime.counters,n=c.domain=(c.domain||0)+1;return {id:'fd-'+pad(n),ref:'FD-'+pad(n)};});
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
 for(const [key,title] of names){const c=p.runtime.counters,seq=c.domain=(c.domain||0)+1;xs.push({id:'fd-'+pad(seq),ref:'FD-'+pad(seq),revision:1,title,scope:'',cause:'',basis:'',owner:'',recoveryOwner:'',treatment:'',parentId:'',legacyKeys:[key],origin:SEEDED,state:PROPOSED,history:[]});}
 return xs[first].id;
}

// ---------------------------------------------------------------- deployment nodes (Chapter 10)
const NODE_FIELDS=[['title','t',160,'node name'],['kind','e',NODE_KINDS,'kind of node'],['place','t',160,'place'],['provider','t',160,'provider'],['tier','e',[...NODE_TIERS,NOT_STATED],'tier'],['exposure','e',[...NODE_EXPOSURES,NOT_STATED],'exposure'],['reason','t',600,'reason'],['owner','t',180,'owner'],['basis','t',2400,'basis']];
const NODE_KEYS=[...NODE_FIELDS.map(([f])=>f),'parentId','domainId','jurisdiction','address','boundaryIds','open'],NODE_OPEN=['place','provider','jurisdiction','tier','exposure','address','reason','owner','basis'];
const patchValue=(old,raw,f)=>raw[f]===undefined?old?.[f]??'':raw[f]??'';
function saveNode(p,raw,at){
 const m=p.runtime,xs=m.nodes||[],old=raw.id?find(xs,raw.id):null;if(raw.id&&!old)throw Error('Choose an existing deployment node.');
 textOnly(raw,NODE_FIELDS);const f=patchFields(old,raw,NODE_FIELDS);if(!f.title||!f.kind)throw Error('Name the node and choose its kind.');
 if(f.tier&&!['network','subnet'].includes(f.kind))throw Error('Only a network or a subnet has a tier.');
 const jurisdiction=patchValue(old,raw,'jurisdiction');if(jurisdiction!==''&&!JURISDICTIONS.has(jurisdiction))throw Error('Give the jurisdiction as an officially assigned ISO 3166-1 alpha-2 code (NO, SE, GB), or leave it not stated.');
 let address=patchValue(old,raw,'address');if(address!==''){const x=parsePrefix(address);if(!x)throw Error('Give the address as one IPv4 or IPv6 prefix with its length and no host bit set (10.20.0.0/16, 2001:db8::/32), or leave it not stated.');address=x.text;}
 const domainId=patchValue(old,raw,'domainId');if(domainId&&domainId!==old?.domainId)authoredRecord(p.technology.domains,domainId,'failure domain');
 const boundaryIds=patchBounded(old,raw,'boundaryIds',id=>list(p.technology.boundaries).some(b=>b.id===id),'trust boundaries',20,'A deployment node');
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
 if(raw.placementId!==undefined&&raw.zoneId!==undefined)throw Error('Name a zone or a placement to locate, not both.');
 if(raw.placementId!==undefined){
  const l=m.placements.find(x=>x.id===raw.placementId);if(!l)throw Error('Choose an existing zone or placement.');
  const z=m.zones.find(x=>x.id===l.zoneId),nodeId=raw.nodeId===undefined?l.nodeId||'':raw.nodeId||'';
  // (ruling L4) the answer is the record the command wrote, the placement, so that a batch restamps it as the commit's
  if(nodeId===(l.nodeId||''))return {selected:l.id,selectedIds:[l.id],changed:false};
  if(nodeId){
   authoredRecord(nodes,nodeId,'deployment node');
   if(!z?.nodeId)throw Error('Locate '+(refOf(z)||l.zoneId)+' in a node first: a placement stands in a node under its zone\'s node.');
   if(!nodeUnder(p,nodeId,z.nodeId))throw Error(node(nodeId)+' does not lie under '+node(z.nodeId)+', the node of '+refOf(z)+'.');
  }
  const next={...l,revision:(l.revision||0)+1};put(next,'nodeId',nodeId);m.placements[m.placements.indexOf(l)]=next;
  return {selected:l.id,selectedIds:[l.id],changed:true};
 }
 const z=m.zones.find(x=>x.id===raw.zoneId);if(!z)throw Error('Choose an existing zone or placement.');
 textOnly(raw,[['reason','t',600,'reason']]);const nodeId=raw.nodeId===undefined?z.nodeId||'':raw.nodeId||'',reason=raw.reason===undefined?z.reason||'':fitText(raw.reason,600,'The reason');
 if(nodeId!==(z.nodeId||'')){
  if(nodeId)authoredRecord(nodes,nodeId,'deployment node');
  for(const l of m.placements)if(l.zoneId===z.id&&l.nodeId&&!(nodeId&&nodeUnder(p,l.nodeId,nodeId)))throw Error(l.id+' stands in '+node(l.nodeId)+(nodeId?', which does not lie under '+node(nodeId)+'. Move it first.':', under the node of '+refOf(z)+'. Clear it first.'));
 }
 const domains=p.technology.domains,domainIds=patchBounded(z,raw,'domainIds',id=>!!find(domains,id),'failure domains',TOPOLOGY_LIMITS.zoneDomains,'A zone');
 if(raw.domainIds!==undefined)domainIds.forEach((id,i)=>{
  const d=authoredRecord(domains,id,'failure domain');
  if(!i&&sharedCause(d))throw Error('The first failure domain a zone names is the one it stands in: '+d.ref+' is a shared cause ('+d.cause+').');
  if(i&&!sharedCause(d))throw Error('After the domain it stands in a zone names the causes it shares: '+d.ref+' states no shared cause.');
 });
 if(nodeId===(z.nodeId||'')&&reason===(z.reason||'')&&JSON.stringify(domainIds)===JSON.stringify(list(z.domainIds)))return {selected:z.id,changed:false};
 const next={...z,revision:(z.revision||0)+1};put(next,'nodeId',nodeId);put(next,'domainIds',domainIds);put(next,'reason',reason);m.zones[m.zones.indexOf(z)]=next;
 return {selected:z.id,changed:true};
}

// ---------------------------------------------------------------- whether zones can be compared
// (ruling L2) The one reader of whether the hosting zones of an environment can be compared for independence, which
// every comparison the package makes and every later slice reads (slices 2 and 6 extend it; none writes a second one).
// They cannot when some stand in a typed failure domain and others are only named (a typed domain and a name are never
// compared: 'mixed'), when the hosting domain of one lies inside the hosting domain of another ('nested'), or when a
// zone names a hosting domain, a cause or a node that is not standing: not there, retired or a proposal
// ('not-standing'). A record that is there and no proposal stands, whoever changed it last (ruling M1): one a person
// kept and a draft then changed is the person's to review through the review plan, and one a template copy holds was
// kept in the template. Answers {comparable, zones, issues: [{kind, zones, ids}], groups, shared}; an untyped project's
// zones are compared by name as on rc.10.73.42.
// (slice 2, ruling L2: the reader extended, over the ancestors) groups: each zone that stands in a standing typed domain,
// keyed by the first hosting domain of the zones it fails together with: zones in one domain, in domains one inside the
// other, or that share a stated cause (a cause one names, or one a domain or node it stands in lies in), taken
// together transitively, so the reading errs towards no independence. The built-in checks, planFacts and the desk read
// it through zoneKey (runtime-model.js). shared: each stated cause two or more of the zones share, with those zones.
const standing=(xs,id)=>{const x=find(xs,id);return x&&!isProposed(x)?x:null;};
// A standing record and every one it lies in, nearest first; the chain ends at one that is not standing (ruling M1).
const chainOf=(xs,x)=>{const out=[],seen=new Set();for(;x&&!isProposed(x)&&!seen.has(x.id);x=find(xs,x.parentId)){seen.add(x.id);out.push(x);}return out;};
// What a zone fails with: each standing domain it names and every one those lie in, and the domains the nodes it sits
// in are (with theirs). A placement adds the nodes from its own up to its zone's.
export function zoneFails(p,z,from=z?.nodeId,upto=null){
 const ds=failureDomains(p),ns=deploymentNodes(p),out=new Map(),add=id=>{for(const d of chainOf(ds,find(ds,id)))out.set(d.id,d);};
 if(!upto)for(const id of list(z?.domainIds))add(id);
 for(const n of chainOf(ns,find(ns,from))){if(n.id===upto)break;add(n.domainId);}
 return [...out.values()];
}
// (the fix-up's must-fix 6) What each hosting zone that stands fails with (zones: id -> its domains), what each placement
// with a node of its own fails with from its node up to its zone's (placements: id -> {zoneId, fails}), and the
// placements of each zone (byZone), once a document or a pass: a loss case reads them in O(zones + placements).
export const failIndex=p=>remember(p,'topology:fails','all',()=>{
 const zones=new Map(),placements=new Map(),byZone=new Map(),all=new Map(list(p?.runtime?.zones).filter(z=>z?.id).map(z=>[z.id,z]));
 for(const z of all.values())if(hostingZone(z)&&!isProposed(z))zones.set(z.id,zoneFails(p,z));
 for(const l of list(p?.runtime?.placements)){const z=all.get(l?.zoneId);if(!z)continue;let xs=byZone.get(z.id);if(!xs)byZone.set(z.id,xs=[]);xs.push(l);if(l.nodeId)placements.set(l.id,{zoneId:z.id,fails:zoneFails(p,z,l.nodeId,z.nodeId)});}
 return {zones,placements,byZone};
});
export const hostingComparison=(p,environmentId)=>remember(p,'topology:comparison',environmentId,()=>compareHosting(p,environmentId));
function compareHosting(p,environmentId){
 const zs=list(p?.runtime?.zones).filter(z=>z?.environmentId===environmentId&&hostingZone(z)&&!isProposed(z)),issues=[];
 if(!topologyTyped(p))return {comparable:true,zones:zs.map(z=>z.id),issues};
 const domains=failureDomains(p),nodes=deploymentNodes(p);
 for(const z of zs){const gone=[...list(z.domainIds).filter(id=>!standing(domains,id)),...(z.nodeId&&!standing(nodes,z.nodeId)?[z.nodeId]:[])];if(gone.length)issues.push({kind:'not-standing',zones:[z.id],ids:gone});}
 const typed=zs.filter(z=>list(z.domainIds).length),named=zs.filter(z=>!list(z.domainIds).length&&statedField(z,'failureDomain'));
 if(typed.length&&named.length)issues.push({kind:'mixed',zones:[...typed,...named].map(z=>z.id),ids:[]});
 // (the fix-up's must-fix 6: each zone's hosting domain and what that lies in read once, not once a pair)
 {const host=new Map(typed.map(z=>[z.id,standing(domains,z.domainIds[0])])),up=new Map();for(const d of host.values())if(d&&!up.has(d.id))up.set(d.id,new Set(above(domains,d).map(x=>x.id)));
  for(const a of typed)for(const b of typed){const da=host.get(a.id),db=host.get(b.id);if(a!==b&&da&&db&&da.id!==db.id&&up.get(db.id).has(da.id))issues.push({kind:'nested',zones:[a.id,b.id],ids:[da.id,db.id]});}}
 const {groups,causes}=failGroups(p,typed);
 return {comparable:!issues.length,zones:zs.map(z=>z.id),issues,groups,shared:[...causes].filter(([,xs])=>xs.length>1).map(([causeId,xs])=>({causeId,zones:xs}))};
}
// The one grouping of zones that fail together (ruling L2), over any set of zones: those of one environment
// (hostingComparison) or of an environment and the recovery environments linked to it (zoneGroups, which H5 reads: the
// fix-up's must-fix 5). Each zone that stands in a standing typed domain, keyed by the smallest first hosting domain of
// its group; and each stated cause, with the zones that fail with it.
function failGroups(p,zs){
 const domains=failureDomains(p),held=zs.filter(z=>list(z.domainIds).length&&standing(domains,z.domainIds[0])),fails=new Map(held.map(z=>[z.id,zoneFails(p,z)])),top=new Map(held.map(z=>[z.id,z.id])),root=id=>{while(top.get(id)!==id)id=top.get(id);return id;},causes=new Map();
 for(const z of held)for(const d of fails.get(z.id))if(sharedCause(d)){let xs=causes.get(d.id);if(!xs)causes.set(d.id,xs=[]);xs.push(z.id);}
 const join=(a,b)=>top.set(root(b),root(a)),first=new Map();
 // (the fix-up's must-fix 6) a zone joins every zone whose first hosting domain it fails with, read through an index of first domains
 for(const a of held){let xs=first.get(a.domainIds[0]);if(!xs)first.set(a.domainIds[0],xs=[]);xs.push(a.id);}
 for(const b of held)for(const d of fails.get(b.id))for(const a of first.get(d.id)||[])if(a!==b.id)join(a,b.id);
 for(const xs of causes.values())for(const id of xs)join(xs[0],id);
 const keys=new Map();for(const z of held){const k=root(z.id),was=keys.get(k);if(!was||z.domainIds[0]<was)keys.set(k,z.domainIds[0]);}
 return {groups:Object.fromEntries(held.map(z=>[z.id,keys.get(root(z.id))])),causes};
}
export const zoneGroups=(p,envIds)=>remember(p,'topology:groups',envIds.join('+'),()=>failGroups(p,list(p?.runtime?.zones).filter(z=>envIds.includes(z?.environmentId)&&hostingZone(z)&&!isProposed(z))).groups);
// (slice 2) The hosting key the checks compare (runtime-model.js zoneKey): a zone's group in a typed project, else none.
export const groupKey=(p,z)=>topologyTyped(p)&&z?.domainIds?.length?hostingComparison(p,z.environmentId).groups?.[z.id]:undefined;
// Chapter 10's finding for it: one error for each environment whose hosting zones cannot be compared, which no
// treatment waives (hard). "Cannot be checked" in ruling L2 is the non-waivable class of rc.10.73.42 and nothing
// stricter (ruling M3): while it stands it blocks the review and the freeze as every built-in non-waivable error does
// (fixed before review or carried as an action; no positive review, so a freeze is a working draft), and Chapter 10's
// own check and handoff keep their built-in rule, which reads no error. One rule for every hard finding, no row of its
// own. It names the zones and what a person does.
export function topologyFindings(p){
 if(!topologyTyped(p))return [];
 const zone=id=>refOf(find(p.runtime.zones,id))||id,dom=id=>refOf(find(failureDomains(p),id))||refOf(find(deploymentNodes(p),id))||id,out=[];
 for(const env of list(p.runtime.environments)){
  const {issues}=hostingComparison(p,env.id);if(!issues.length)continue;
  const say=issues.map(x=>{
   if(x.kind==='mixed'){const typed=x.zones.filter(id=>list(find(p.runtime.zones,id).domainIds).length).map(zone),named=x.zones.filter(id=>!list(find(p.runtime.zones,id).domainIds).length).map(zone);return and(typed)+(typed.length>1?' stand':' stands')+' in a typed failure domain and '+and(named)+(named.length>1?' are':' is')+' only named: a typed domain and a name are never compared. Locate '+and(named)+' in '+(named.length>1?'their':'its')+' failure domain, or clear where '+and(typed)+(typed.length>1?' stand.':' stands.');}
   if(x.kind==='nested')return dom(x.ids[1])+', where '+zone(x.zones[1])+' stands, lies inside '+dom(x.ids[0])+', where '+zone(x.zones[0])+' stands: what loses '+dom(x.ids[0])+' loses both. Locate each zone in the failure domain it stands in on its own.';
   return zone(x.zones[0])+' names '+and(x.ids.map(dom))+', which '+(x.ids.length>1?'are':'is')+' not standing in the design (retired, a proposal or not there). Locate '+zone(x.zones[0])+' anew.';
  });
  out.push({id:'topology-incomparable:'+env.id,code:'topology-incomparable',level:'error',hard:true,objectId:env.id,title:'The zones of '+(env.ref||env.title||env.id)+' cannot be compared for independence',detail:say.join(' ')});
 }
 return out;
}

// ---------------------------------------------------------------- the commands
export const UNTYPED='This project\'s topology is not typed yet. A signed-in person chooses typed topology for this project first.',NOT_HERE='The topology of this project is typed, but nobody here has chosen it yet. A signed-in person chooses typed topology for this project first.';
// (document, command, at, actor, {author}) as every handler is called; inside a reviewed batch with the first four.
// It works on the copy it is handed (the server's boundary and the staged path each hand it one), a settled document:
// one that holds its chapters. A change of Chapter 10 moves its version and clears its check and handoff, as its own
// commands do, and a change of Chapter 6 its own; a record that is a proposal after the save (AIW's, or a draft's), and
// a step taken again, move neither and clear nothing (ruling L6: a proposal says nothing to the design).
export function applyTopologyCommand(p,command,at,actor,options){
 const m=p.runtime,t=p.technology,raw=command.payload||{},type=command.type,touch=s=>{s.version++;s.review=null;s.handoff=null;};
 if(!m||!t)throw Error('Open the project before changing its topology.');
 if(type==='runtime.topology-start'){
  // Idempotent: once a person here has chosen it, the step is on record and a second request changes nothing. In a
  // copy or a recovered project the topology is typed and the step is nobody's yet: a person takes it again there.
  if(!chosenHere(p)){if(!m.topology)touch(m);m.topology={schemaVersion:1,review:{actor,at,account:options?.author?.account??null}};}
  return {document:p,selected:null};
 }
 requireTyped(p);
 if(type==='technology.domain'){const [r,changed]=saveDomain(p,raw,at);if(changed&&!isProposed(r))touch(t);return {document:p,selected:r.id};}
 if(type==='technology.domain-proposals')return {document:p,selected:proposeDomains(p)};
 if(type==='runtime.node'){const [r,changed]=saveNode(p,raw,at);if(changed&&!isProposed(r))touch(m);return {document:p,selected:r.id};}
 if(type==='runtime.locate'){const {changed,...answer}=locate(p,raw);if(changed)touch(m);return {document:p,...answer};}
 throw Error('Unknown topology action.');
}
// Every topology command but the step that types the project asks this first (the parts' too).
export function requireTyped(p){if(!p?.runtime||!p.technology)throw Error('Open the project before changing its topology.');if(!p.runtime.topology)throw Error(UNTYPED);if(!chosenHere(p))throw Error(NOT_HERE);}
// What the two record saves refuse by who writes the commit, which a handler is not told inside a reviewed batch: a
// draft by Sol and an agent account send a record as their proposal and say so (a person keeps it), and name no
// jurisdiction: where a node lies is stated by a person, never drafted.
export function refuseDraft(p,command,{author}={}){
 if(!author||author.kind!==DRAFT&&author.account!=='agent')return;
 const raw=command?.payload||{};
 if(raw.origin!==DRAFT)return 'A draft by Sol or an agent account sends a deployment node or a failure domain as its proposal (origin: sol-draft); a person keeps it.';
 // (the fix-up's must-fix 2) nor clears one a person stated, which a location gate reads
 if(command.type==='runtime.node'&&raw.jurisdiction!==undefined&&(raw.jurisdiction!=null&&raw.jurisdiction!==''||find(p?.runtime?.nodes,raw.id)?.jurisdiction))return 'A jurisdiction is stated by a signed-in person: a draft by Sol or an agent account names none, and clears none a person stated.';
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

// ---------------------------------------------------------------- what the lifecycle refuses (ruling L3)
// A node or a failure domain comes back only into a tree that still holds it: its parent there, its failure domain
// standing (a node), and no deeper than its tree goes. Refused in words; the record stays retired.
function canRestoreIn(xs,r,noun,max,refs){
 if(r.parentId&&!find(xs,r.parentId))throw Error(refOf(r)+' cannot come back yet: '+(refs(r.parentId)||r.parentId)+', which it lies in, is not standing in the design. Restore it first, or bring '+refOf(r)+' back elsewhere.');
 const level=1+above(xs,r).length;if(level>max)throw Error((noun==='node'?'Deployment nodes nest':'Failure domains nest')+' at most '+max+' deep: '+refOf(r)+' would come back at level '+level+'.');
}
const retiredRef=(p,path,id)=>refOf(retiredOf(p,path).find(x=>x.record?.id===id)?.record);
const RESTORE={
 'runtime.nodes':(p,r)=>{canRestoreIn(deploymentNodes(p),r,'node',TOPOLOGY_LIMITS.nodeDepth,id=>retiredRef(p,'runtime.nodes',id));if(r.domainId&&!standing(failureDomains(p),r.domainId))throw Error(refOf(r)+' cannot come back yet: '+(refOf(find(failureDomains(p),r.domainId))||retiredRef(p,'technology.domains',r.domainId)||r.domainId)+', the failure domain it is, is not standing in the design. Restore it first.');},
 'technology.domains':(p,r)=>canRestoreIn(failureDomains(p),r,'domain',TOPOLOGY_LIMITS.domainDepth,id=>retiredRef(p,'technology.domains',id))
};

// ---------------------------------------------------------------- the journal
// The package's tracker (design-extensions.js track: called for every command of every commit, and again for each
// command a batch carries): what a commit changed of the typed topology is one change of the journal for each record,
// with the record as its source and what it said before and after. The server stamps who sent the commit, of what
// kind and why. Journalled: the step that types the project; a node or a failure domain made or changed (AIW's own
// proposals are not changes of the design, and a record a restore brought back was not made by the commit); where a
// zone or a placement stands. A change of the typed topology opens no review of other records, and says so.
// One thing the tracker changes itself, and journals (ruling L3): at the end of every commit, every zone and placement of
// the document that names a node or a failure domain that is not standing (absent, retired or a proposal: ruling M1;
// a record that is there and no proposal keeps its name, whoever changed it last) loses that name (mend), however the
// commit got there (a restore of a zone or of the plan a placement left with, a batch that retires and restores in one
// go). So a zone never reads as standing in a domain that is not there: it reads by its own name again, and a person
// locates it anew. The package states the two collections the mend changes and the fields it changes there (trackPaths
// below: a zone's nodeId and domainIds, a placement's nodeId, with the revision moved forward by one); the boundary copies
// them before each call, puts back every other field (ruling T1) and stamps each zone and placement the call changed as
// the commit's (ruling O2, which retired the tracker's answer of ruling M1: the tracker answers nothing). A zone or a
// placement the commit made has where it stands journalled with it.
function mend(p,r,path){
 const nodes=deploymentNodes(p),domains=failureDomains(p),there=standing,was=JSON.stringify([r.nodeId,r.domainIds]);
 if(path==='runtime.zones'){
  if(r.nodeId&&!there(nodes,r.nodeId))delete r.nodeId;
  if(r.domainIds){const ds=list(r.domainIds).map(id=>there(domains,id));put(r,'domainIds',ds[0]&&!sharedCause(ds[0])?ds.filter((d,i)=>d&&(!i||sharedCause(d))).map(d=>d.id):[]);}
 }else if(r.nodeId&&!(there(nodes,r.nodeId)&&nodeUnder(p,r.nodeId,find(p.runtime.zones,r.zoneId)?.nodeId)))delete r.nodeId;
 if(JSON.stringify([r.nodeId,r.domainIds])===was)return false;
 r.revision=(r.revision||0)+1;return true;
}
// (slices 2 and 3) The parts add the rows of the records they journal, and their labels: what a change of a built-in
// record's field (an environment's link) said is journalled the same way, when its revision moved.
export const LABELS={title:'Name',kind:'Kind of node',parentId:'Lies in',domainId:'Failure domain it is',jurisdiction:'Jurisdiction',place:'Place',provider:'Provider',tier:'Tier',exposure:'Exposure',address:'Address prefix',reason:'Reason',owner:'Owner',basis:'Basis',boundaryIds:'Trust boundaries',scope:'Scope',cause:'Cause',recoveryOwner:'Recovery owner',treatment:'Treatment',nodeId:'Deployment node',domainIds:'Failure domains'};
const QUIET='A change of the typed topology opens no review of other records: the checks that read it read it as it stands.';
const said=(r,keys)=>Object.fromEntries(keys.map(k=>[k,structuredClone(r?.[k]??(k.endsWith('Ids')?[]:''))]));
export const TRACKED=[['runtime.nodes',10,'node',NODE_KEYS.filter(k=>k!=='open'),true],['technology.domains',6,'failureDomain',DOMAIN_KEYS.filter(k=>k!=='open'),true],['runtime.zones',10,'zone',['nodeId','domainIds','reason'],false],['runtime.placements',10,'placement',['nodeId'],false]];
const rows=(p,path)=>{const [a,b]=path.split('.');return list(p?.[a]?.[b]);};
export function trackTopology(prior,next,command,at){
 const m=next?.runtime;if(!m?.topology)return;
 const started=chosenHere(next)&&!chosenHere(prior);
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
   let o=old.get(r?.id);if(!r?.id)continue;
   if(!own){const back=!o&&restored.has(path+'|'+r.id),as=back&&structuredClone(r),dropped=mend(next,r,path);if(!dropped&&(back||o&&o.revision===r.revision))continue;if(back)o=as;}
   else if(o?o.revision===r.revision:isProposed(r)&&r.origin===SEEDED||restored.has(path+'|'+r.id))continue;
   const before=said(o,keys),after=said(r,keys),fields=keys.filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k])).map(k=>({key:k,label:LABELS[k],before:before[k],after:after[k]}));
   if(fields.length)journal(chapter,r.id,refOf(r),kind,r.title||r.id,o?before:null,after,fields);
  }
 }
}

// ---------------------------------------------------------------- what the design fingerprint reads (rulings L5, L6)
// The marker says typed or not, and leaves out who chose it and when; the two collections say what their records say,
// without their history, review, confirmed and provenance (S0's rule for every package, ruling J3), and a proposal says
// nothing, so AIW's proposals and a draft that arrives as one move no design stamp; keeping one is a design change.
// Each answers nothing for a document without the package's records, which reads as it did.
const BOOKKEEPING=new Set(['history','review','confirmed','provenance']),stated=xs=>{const out=list(xs).filter(r=>r&&!isProposed(r)).map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>!BOOKKEEPING.has(k))));return out.length?out:undefined;};
const DESIGN={'runtime.topology':p=>topologyTyped(p)?{schemaVersion:p.runtime.topology.schemaVersion}:undefined,'technology.domains':p=>stated(p.technology?.domains),'runtime.nodes':p=>stated(p.runtime?.nodes)};

// ---------------------------------------------------------------- what this part registers
// The part of the package this module states (topology.js assembles the parts into the one registration).
const edit={apply:applyTopologyCommand,staged:true},record={...edit,validate:refuseDraft};
export const TOPOLOGY_PART={
 objectTypes:{failureDomain:{label:'Failure domain',chapter:6,level:'capability',prefix:'FD'},node:{label:'Deployment node',chapter:10,level:'deployment',prefix:'DN'}},
 records:emitTopology,
 layers:{node:'node',domain:'failureDomain'},
 hops:[{layer:'node',types:['sitsIn'],from:['zone','placement'],dir:'out',ctx:false},{layer:'domain',types:['failsWith'],from:['zone','node'],dir:'out',ctx:false}],
 commands:{'runtime.topology-start':{apply:applyTopologyCommand,person:true},'technology.domain':record,'technology.domain-proposals':{apply:applyTopologyCommand},'runtime.node':record,'runtime.locate':edit},
 checks:{10:topologyFindings},
 track:trackTopology,
 // (rulings O2, T1) the built-in collections the tracker's mend changes, each with the fields it changes there: the
 // boundary puts back every other field and stamps what a call changed
 trackPaths:{'runtime.zones':['nodeId','domainIds'],'runtime.placements':['nodeId']},
 lifecycle:{'technology.domains':6,'runtime.nodes':10},
 canRestore:RESTORE,
 // (ruling M6) a proposal says nothing to the design (L6): dismissing or restoring one moves no version and clears no check
 quietProposals:{'technology.domains':true,'runtime.nodes':true},
 provenance:{nouns:{'technology.domains':'failure domain','runtime.nodes':'deployment node'},paths:{'technology.domain':['technology.domains'],'technology.domain-proposals':['technology.domains'],'runtime.node':['runtime.nodes']}},
 design:DESIGN,
 designKeys:['runtime.topology','technology.domains','runtime.nodes']
};
// What the parts of the package share with this one (topology-failures.js, topology-gates.js).
export {DRAFT,pad,fmt,norm,find,refOf,and,sharedCause,standing,chainOf,textOnly,patchBounded,authoredRecord,put,stated as statedRecords,BOOKKEEPING};
