import {BRAIN_CATALOGUE} from './public/brain-catalogue.js';
import {sha256} from './public/brain-integrity.js';
const VERSION='aiw-repository-packet-v1';
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const fail=message=>{throw Error('Repository packet: '+message);};
const keys=(value,allowed)=>{if(!object(value)||Object.keys(value).some(k=>!allowed.includes(k)))fail('unexpected fields');};
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const id=(kind,x)=>typeof x==='string'&&new RegExp('^'+kind+'-[a-f0-9]{32}$').test(x);
const str=(x,max=500)=>typeof x==='string'&&x.length>0&&x.length<=max;
const pathOK=x=>str(x,350)&&/^[\w./ -]+$/.test(x)&&!x.startsWith('/')&&!x.split('/').some(s=>['','.','..'].includes(s));
const bounded=(x,n)=>Array.isArray(x)&&x.length<=n;

// Read-only projection. The authenticated caller supplies scope, never packet fields.
// No claims, graph objects, source bodies, reviews, releases or pins are imported.
export function prepareRepositoryPacket(project,packet,{tenantId,projectId}){
 if(!object(packet)||new TextEncoder().encode(JSON.stringify(packet)).length>8000000)fail('8 MB limit');
 keys(packet,['schemaVersion','storeId','tenantId','projectId','fromCursor','cursor','authority','productionAccepted','sources','claims','notices','release']);
 if(typeof packet.storeId!=='string'||!/^[a-f0-9-]{36}$/.test(packet.storeId))fail('store identity required');
 if(packet.schemaVersion!==VERSION||packet.tenantId!==tenantId||packet.projectId!==projectId)fail('version or authenticated scope mismatch');
 if(packet.authority!=='candidate'||packet.productionAccepted!==false)fail('candidate authority required');
 if(!Number.isSafeInteger(packet.fromCursor)||packet.fromCursor<0||!Number.isSafeInteger(packet.cursor)||packet.cursor<packet.fromCursor)fail('invalid cursor');
 if(!bounded(packet.sources,100)||!bounded(packet.claims,250)||!bounded(packet.notices,500))fail('project bounds');
 keys(packet.release,['status','reason']);if(packet.release.status!=='blocked'||!str(packet.release.reason,1000))fail('release must remain blocked');
 const seen=new Set(),passages=new Map(),sources=new Map(),locators=[];
 for(const s of packet.sources){
  keys(s,['repositoryId','repository','commit','path','hash','snapshot','object','manifestHash','licenceDisposition','exportDisposition','revisionId','supersedes','passages']);
  if(!str(s.repositoryId,100)||!str(s.repository,160)||! /^[\w.-]+\/[\w.-]+$/.test(s.repository)||! /^[a-f0-9]{40}$/.test(s.commit)||!pathOK(s.path)||!hash(s.hash)||!hash(s.manifestHash)||!id('revision',s.revisionId)||seen.has(s.revisionId))fail('invalid source identity');
  if(!pathOK(s.snapshot)||!pathOK(s.object)||s.exportDisposition!=='metadata-only'||!str(s.licenceDisposition,200)||!bounded(s.passages,8)||(s.supersedes!==null&&!id('revision',s.supersedes)))fail('invalid source disposition');
  if(s.revisionId!=='revision-'+sha256(JSON.stringify([s.repository,s.commit,s.path,s.hash])).slice(0,32))fail('revision identity mismatch');
  seen.add(s.revisionId);sources.set(s.revisionId,s);
  for(const p of s.passages){
   keys(p,['lineStart','lineEnd','excerptHash','passageId']);
   if(!Number.isInteger(p.lineStart)||!Number.isInteger(p.lineEnd)||p.lineStart<1||p.lineEnd<p.lineStart||p.lineEnd-p.lineStart>100||!hash(p.excerptHash)||!id('passage',p.passageId)||passages.has(p.passageId))fail('invalid passage');
   if(p.passageId!=='passage-'+sha256(JSON.stringify([s.revisionId,p.lineStart,p.lineEnd,p.excerptHash])).slice(0,32))fail('passage identity mismatch');
   passages.set(p.passageId,s.revisionId);
  }
  const registered=BRAIN_CATALOGUE.repositories.find(r=>r.connectorId===s.repositoryId&&r.repository.toLowerCase()===s.repository.toLowerCase());
  const supported=!!registered&&/\.(md|mdx|txt|adoc|rst)$/i.test(s.path);
  locators.push({revisionId:s.revisionId,repository:s.repository,path:s.path,licenceDisposition:s.licenceDisposition,status:supported?'ready-for-explicit-source-retrieval':'repository-registration-required',
   command:supported?{type:'knowledge.fetch',payload:{connectorId:s.repositoryId,path:s.path,ref:s.commit,expectedHash:s.hash}}:null});
 }
 const claimIds=new Set();
 for(const c of packet.claims){
  keys(c,['claimId','revisionId','passageId','statement','reviewState','releaseState','eligible','edges','contextStatus']);
  if(!id('claim',c.claimId)||claimIds.has(c.claimId)||!sources.has(c.revisionId)||passages.get(c.passageId)!==c.revisionId||c.claimId!=='claim-'+sha256(JSON.stringify([c.passageId])).slice(0,32))fail('invalid claim provenance');
  if(c.statement!=='Candidate interpretation pending human architecture review.'||c.reviewState!=='unreviewed'||c.releaseState!=='unreleased'||c.eligible!==false||c.contextStatus!=='conditions-limitations-and-polarity-unresolved'||!bounded(c.edges,10))fail('candidate claim required');
  claimIds.add(c.claimId);
  for(const e of c.edges){keys(e,['type','target','label','status','inference']);if(!['concept','pattern','tactic','component','interface','prerequisite','risk','trade-off','alternative','contradiction'].includes(e.type)||!id('concept',e.target)||!str(e.label,60)||e.status!=='suggestion'||e.inference!=='lexical-cue-only; applicability and semantics unverified')fail('descriptive suggestion required');}
 }
 let last=packet.fromCursor;
 for(const n of packet.notices){
  keys(n,['cursor','kind','revisionId','supersedes','reason','dependentClaimsIneligible']);
  if(!Number.isSafeInteger(n.cursor)||n.cursor<=last||n.cursor>packet.cursor||!id('revision',n.revisionId)||!['revision','invalidation'].includes(n.kind))fail('invalid notice');
  if(n.kind==='invalidation'&&(n.dependentClaimsIneligible!==true||!['withdrawn','superseded','source-unavailable'].includes(n.reason)))fail('invalid invalidation');
  last=n.cursor;
 }
 const remainingSources=100-(project.knowledge?.sources?.length||0),remainingClaims=250-(project.knowledge?.claims?.length||0);
 return {schemaVersion:VERSION,storeId:packet.storeId,scope:{tenantId,projectId},cursor:packet.cursor,readOnly:true,authority:'discovery-only',productionAccepted:false,
  locators,counts:{sources:packet.sources.length,candidates:packet.claims.length},capacity:{remainingSources,remainingClaims},
  notices:packet.notices,activation:{allowed:false,reason:'Packet signatures, independent approval and project trust integration are not installed. Use existing source review; no packet claims become eligible.'}};
}
