// Outbound contracts of the repository service.
// - Candidate packets (aiw-repository-packet-v1): metadata-only locators for a project to preview.
// - Signed notice updates (aiw-repository-sync-v1): the store's revision and invalidation notices,
//   signed with the laptop's notice key. This path never carries a release: signing a reviewed
//   release remains the operator's explicit act (scripts/sign-repository-sync.mjs).
import {generateKeyPairSync,createPrivateKey,createPublicKey,createHash,sign} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {canonicalJSON,REPOSITORY_SYNC_VERSION} from '../repository-sync.js';
import {claimId} from './ids.js';

export const PACKET_VERSION='aiw-repository-packet-v1';
const SCOPE=/^[A-Za-z0-9][A-Za-z0-9._@:-]{0,159}$/,PROJECT=/^[a-z0-9][a-z0-9-]{0,79}$/;
const EDGE={pattern:'pattern','anti-pattern':'risk','component-archetype':'component',style:'concept','topology-template':'concept'};
const fail=(status,error)=>{throw Object.assign(Error(error),{status});};

export const keyInfo=key=>{const raw=Buffer.from(createPublicKey(key).export({format:'jwk'}).x,'base64url');return {keyId:'repo-'+createHash('sha256').update(raw).digest('hex').slice(0,16),publicKey:raw.toString('base64url')};};
export async function createNoticeKey(file){
 await mkdir(path.dirname(file),{recursive:true});const {privateKey}=generateKeyPairSync('ed25519');
 await writeFile(file,privateKey.export({type:'pkcs8',format:'pem'}),{flag:'wx',mode:0o600});return keyInfo(privateKey);
}
export async function loadNoticeKey(file){try{const privateKey=createPrivateKey(await readFile(file));return {...keyInfo(privateKey),privateKey};}catch(e){if(e.code==='ENOENT')return null;throw e;}}

function checkScope({tenantId,projectId,fromCursor},cursor){
 if(typeof tenantId!=='string'||!SCOPE.test(tenantId)||typeof projectId!=='string'||!PROJECT.test(projectId))fail(400,'A tenant and project scope are required.');
 if(!Number.isSafeInteger(fromCursor)||fromCursor<0)fail(400,'fromCursor must be a non-negative integer.');
 if(fromCursor>cursor)fail(409,'The requested cursor is ahead of this store; the project is pinned to a different store history.');
}

// Notices-only signed update for one project scope, at most 100 notices per update.
export function signedNoticeUpdate(reader,request,key,{now=Date.now()}={}){
 const cursor=reader.store.cursor();checkScope(request,cursor);
 if(request.storeId!=null&&request.storeId!==reader.store.storeId)fail(409,'The project is pinned to a different repository store.');
 if(!key)fail(503,'No notice-signing key is configured for this repository service.');
 const notices=reader.notices(request.fromCursor,100).map(n=>({cursor:n.cursor,kind:n.kind,repository:n.repository,commit:n.commit,path:n.path,hash:n.hash,reason:n.kind==='revision'?'observed':n.reason}));
 const issuedAt=new Date(now).toISOString(),payload={schemaVersion:REPOSITORY_SYNC_VERSION,storeId:reader.store.storeId,tenantId:request.tenantId,projectId:request.projectId,fromCursor:request.fromCursor,cursor:request.fromCursor+notices.length,issuedAt,expiresAt:new Date(now+86400000).toISOString(),release:null,notices};
 return {...payload,signature:{algorithm:'Ed25519',keyId:key.keyId,value:sign(null,Buffer.from(canonicalJSON(payload)),key.privateKey).toString('base64url')}};
}

// Candidate packet: selected current revisions (≤100) with up to eight passages each, placeholder
// claims with lexical concept suggestions, and every notice after fromCursor (fails closed above 500).
export function candidatePacket(reader,{tenantId,projectId,fromCursor=0,revisionIds=[],passageIds=[]}){
 const {db,storeId}=reader.store,cursor=reader.store.cursor();checkScope({tenantId,projectId,fromCursor},cursor);
 if(!Array.isArray(revisionIds)||!revisionIds.length||revisionIds.length>100||!Array.isArray(passageIds)||passageIds.length>800)fail(400,'Choose 1–100 revisions and at most 800 passages.');
 const wanted=new Set(passageIds.map(String)),sources=[],claims=[];
 for(const id of [...new Set(revisionIds.map(String))]){
  const r=db.prepare('SELECT rowid,* FROM revisions WHERE revision_id=?').get(id);if(!r||r.state!=='current')fail(409,'Revision '+id+' is not current in this store.');
  const c=db.prepare('SELECT raw_manifest_sha256,final_disposition,use_policy FROM connectors WHERE connector_id=?').get(r.connector_id);
  const all=db.prepare('SELECT rowid,passage_id,line_start,line_end,excerpt_sha256 FROM passages WHERE revision_rowid=? ORDER BY ordinal').all(r.rowid);
  const chosen=(all.some(p=>wanted.has(p.passage_id))?all.filter(p=>wanted.has(p.passage_id)):all).slice(0,8);
  sources.push({repositoryId:r.connector_id,repository:r.repository,commit:r.commit_sha,path:r.path,hash:r.file_sha256,snapshot:'snapshots/'+r.connector_id+'/'+r.snapshot_id,object:r.object,manifestHash:c.raw_manifest_sha256,
   licenceDisposition:(c.use_policy==='metadata-only'?'metadata-only; ':'')+(c.final_disposition||'requires-human-licence-review'),exportDisposition:'metadata-only',revisionId:r.revision_id,supersedes:r.supersedes||null,
   passages:chosen.map(p=>({lineStart:p.line_start,lineEnd:p.line_end,excerptHash:p.excerpt_sha256,passageId:p.passage_id}))});
  for(const p of chosen){
   const edges=db.prepare('SELECT c.concept_id,c.name,c.record_type FROM passage_concepts pc JOIN concepts c ON c.concept_id=pc.concept_id WHERE pc.passage_rowid=? ORDER BY c.name LIMIT 10').all(p.rowid)
    .map(e=>({type:EDGE[e.record_type]||'concept',target:e.concept_id,label:e.name.slice(0,60),status:'suggestion',inference:'lexical-cue-only; applicability and semantics unverified'}));
   claims.push({claimId:claimId(p.passage_id),revisionId:r.revision_id,passageId:p.passage_id,statement:'Candidate interpretation pending human architecture review.',reviewState:'unreviewed',releaseState:'unreleased',eligible:false,edges,contextStatus:'conditions-limitations-and-polarity-unresolved'});
  }
 }
 if(claims.length>250)fail(400,'A packet carries at most 250 candidate claims; choose fewer passages.');
 const pending=reader.notices(fromCursor,501);if(pending.length>500)fail(409,'More than 500 notices are pending; synchronise the project before exporting a packet.');
 const notices=pending.map(n=>n.kind==='revision'?{cursor:n.cursor,kind:'revision',revisionId:n.revisionId,supersedes:n.supersedes||null}:{cursor:n.cursor,kind:'invalidation',revisionId:n.revisionId,reason:n.reason,dependentClaimsIneligible:true});
 return {schemaVersion:PACKET_VERSION,storeId,tenantId,projectId,fromCursor,cursor:notices.at(-1)?.cursor??fromCursor,authority:'candidate',productionAccepted:false,sources,claims,notices,
  release:{status:'blocked',reason:'Independent approval, licence clearance and a trusted signed release are required before any claim becomes eligible.'}};
}
