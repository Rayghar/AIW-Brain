import {digest,sha256} from './public/brain-integrity.js';
import {applyKnowledgeCommand,knowledgeEligibility,knowledgeImpactStamp,knowledgeState} from './public/knowledge-governance.js';
import {readStoredProject,saveStoredProject} from './project-storage.js';

export const REPOSITORY_SYNC_VERSION='aiw-repository-sync-v1';
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,names)=>isObject(x)&&Object.keys(x).length===names.length&&names.every(k=>Object.hasOwn(x,k));
const hash=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const uuid=x=>typeof x==='string'&&/^[0-9a-f-]{36}$/.test(x);
const sourceIdentity=s=>[s.repository,s.revision,s.path,s.hash].join('\n');
const noticeIdentity=n=>[n.repository,n.commit,n.path,n.hash].join('\n');
const fail=message=>{throw Error('Repository sync: '+message);};

// The signed bytes are UTF-8 canonical JSON of all packet fields except signature.
// This is shared with the offline signer; the server never receives a signing key.
export function canonicalJSON(value){
 if(Array.isArray(value))return '['+value.map(canonicalJSON).join(',')+']';
 if(isObject(value))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalJSON(value[k])).join(',')+'}';
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 fail('unsupported signed value');
}
function bytes64(value){
 if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value)||value.length>150)return null;
 try{const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/')),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));return bytes.length?bytes:null;}catch{return null;}
}
export async function verifyRepositorySync(packet,env,{tenantId,projectId,now=Date.now()}={}){
 if(!exact(packet,['schemaVersion','storeId','tenantId','projectId','fromCursor','cursor','issuedAt','expiresAt','release','notices','signature'])||packet.schemaVersion!==REPOSITORY_SYNC_VERSION||!uuid(packet.storeId)||packet.tenantId!==tenantId||packet.projectId!==projectId)fail('invalid authenticated scope or version');
 if(!Number.isSafeInteger(packet.fromCursor)||packet.fromCursor<0||!Number.isSafeInteger(packet.cursor)||packet.cursor<packet.fromCursor||!Array.isArray(packet.notices)||packet.notices.length>100||packet.cursor!==packet.fromCursor+packet.notices.length)fail('invalid notice cursor range');
 const issued=Date.parse(packet.issuedAt),expires=Date.parse(packet.expiresAt);
 if(!Number.isFinite(issued)||!Number.isFinite(expires)||issued>now+300000||expires<=now||expires<=issued||expires-issued>7*86400000)fail('release lease is expired or outside the seven-day limit');
 if(!exact(packet.signature,['algorithm','keyId','value'])||packet.signature.algorithm!=='Ed25519'||!/^[-\w]{1,64}$/.test(packet.signature.keyId)||!bytes64(packet.signature.value))fail('invalid signature field');
 for(let i=0;i<packet.notices.length;i++){
  const n=packet.notices[i];if(!exact(n,['cursor','kind','repository','commit','path','hash','reason'])||n.cursor!==packet.fromCursor+i+1||!['revision','invalidation'].includes(n.kind)||!/^[-\w.]+\/[-\w.]+$/.test(n.repository)||!/^[a-f0-9]{40}$/.test(n.commit)||typeof n.path!=='string'||!/^[\w./ -]{1,350}$/.test(n.path)||n.path.startsWith('/')||n.path.split('/').some(x=>!x||x==='.'||x==='..')||!hash(n.hash)||!(n.kind==='revision'?n.reason==='observed':['withdrawn','superseded','source-unavailable'].includes(n.reason)))fail('invalid signed repository notice');
 }
 if(packet.release!==null){
  const r=packet.release;if(!exact(r,['id','checksum','claims','sources'])||!/^KR-\d{4,}$/.test(r.id)||!hash(r.checksum)||!Array.isArray(r.claims)||!r.claims.length||r.claims.length>250||!Array.isArray(r.sources)||!r.sources.length||r.sources.length>100)fail('invalid release receipt');
  const claimIds=new Set(),sourceIds=new Set();
  for(const c of r.claims){if(!exact(c,['id','hash'])||!/^KC-\d{4,}$/.test(c.id)||!hash(c.hash)||claimIds.has(c.id))fail('invalid claim receipt');claimIds.add(c.id);}
  for(const s of r.sources){if(!exact(s,['id','repository','commit','path','hash'])||!/^KS-\d{4,}$/.test(s.id)||!/^[-\w.]+\/[-\w.]+$/.test(s.repository)||!/^[a-f0-9]{40}$/.test(s.commit)||typeof s.path!=='string'||!/^[\w./ -]{1,350}$/.test(s.path)||!hash(s.hash)||sourceIds.has(s.id))fail('invalid source receipt');sourceIds.add(s.id);}
 }
 let keys;try{keys=JSON.parse(env.AIW_REPOSITORY_SYNC_KEYS||'{}');}catch{fail('trusted public keys are not configured');}
 // A notice key (the repository service's automated key) may sign revision and invalidation notices
 // only. It can never make a release receipt verify, so it cannot make repository claims eligible.
 if(packet.release===null&&!bytes64(keys?.[packet.signature.keyId])){try{keys=JSON.parse(env.AIW_REPOSITORY_NOTICE_KEYS||'{}');}catch{fail('trusted notice keys are not configured');}}
 const publicBytes=bytes64(keys?.[packet.signature.keyId]),signature=bytes64(packet.signature.value);
 if(!publicBytes||publicBytes.length!==32||!signature||signature.length!==64)fail('trusted public key or signature is unavailable');
 const {signature:unused,...payload}=packet;
 try{const key=await crypto.subtle.importKey('raw',publicBytes,{name:'Ed25519'},false,['verify']);if(!await crypto.subtle.verify('Ed25519',key,signature,new TextEncoder().encode(canonicalJSON(payload))))fail('signature verification failed');}
 catch(e){if(e.message?.startsWith('Repository sync:'))throw e;fail('signature verification failed');}
 return digest(packet);
}

export function applyRepositorySync(input,packet,packetHash,at,actor){
 let p=structuredClone(input),s=p.knowledge||=(structuredClone(knowledgeState(p))),previous=s.repositorySync;
 if(previous&&previous.storeId!==packet.storeId)fail('this project is pinned to a different repository store');
 if(previous?.lastPacketHash===packetHash)return {document:input,unchanged:true,revoked:[],acceptedRelease:null};
 if(packet.fromCursor!==(previous?.cursor||0))fail('the notice cursor changed; obtain a fresh signed update');
 if(previous&&Date.parse(packet.issuedAt)<Date.parse(previous.issuedAt))fail('an older release lease cannot replace the current one');
 const revoked=[];let tombstones=[...(previous?.invalidations||[])];
 for(const n of packet.notices){
  if(n.kind==='revision')continue;
  const fingerprint=noticeIdentity(n),record={identity:fingerprint,cursor:n.cursor,reason:n.reason};
  if(!tombstones.some(t=>t.identity===fingerprint))tombstones.push(record);
  for(const src of s.sources.filter(x=>x.origin==='repository-fetch'&&sourceIdentity(x)===fingerprint)){
   if(s.withdrawals.some(x=>x.targetId===src.id))continue;
   const reason='Signed repository notice '+n.cursor+' ('+n.reason+') for '+n.repository+'/'+n.path+' @ '+n.commit;
   p=applyKnowledgeCommand(p,{type:'knowledge.withdraw',payload:{id:src.id,stamp:knowledgeImpactStamp(p,src.id),reviewed:true,reviewer:'Repository trust key '+packet.signature.keyId,reason}},at,actor).document;
   s=p.knowledge;revoked.push(src.id);
  }
 }
 if(tombstones.length>2000)fail('invalidation history is full; migrate this project to shared storage');
 let acceptedRelease=null;
 if(packet.release){
  const receipt=packet.release,r=s.releases.find(x=>x.id===receipt.id);
  if(!r||r.checksum!==receipt.checksum||digest({...r,checksum:undefined})!==r.checksum)fail('the reviewed project release does not match the signed receipt');
  if(receipt.claims.length!==r.claims.length||receipt.claims.some((x,i)=>x.id!==r.claims[i]?.id||x.hash!==digest(r.claims[i])))fail('signed claims differ from the exact frozen project release');
  const referenced=[...new Set(r.claims.map(c=>c.sourceId))].map(id=>s.sources.find(x=>x.id===id)).filter(x=>x?.origin==='repository-fetch');
  if(!referenced.length||referenced.length!==receipt.sources.length||referenced.some(x=>!receipt.sources.some(y=>y.id===x.id&&y.repository===x.repository&&y.commit===x.revision&&y.path===x.path&&y.hash===x.hash&&sha256(x.body)===x.hash)))fail('signed source receipts do not match original retrieved bytes');
  for(const c of r.claims){
   if(!knowledgeEligibility(p,c).eligible)fail('a claim has lost its local source review');
   if(s.sources.find(x=>x.id===c.sourceId)?.origin==='repository-fetch'&&(!c.review?.actor||!c.actor||c.review.actor===c.actor))fail('repository claims require an independent authenticated reviewer');
  }
  if(referenced.some(x=>tombstones.some(t=>t.identity===sourceIdentity(x))))fail('a signed invalidation withdrew support for this release');
  acceptedRelease={id:r.id,checksum:r.checksum,claimHashes:receipt.claims,sourceIds:referenced.map(x=>x.id),expiresAt:packet.expiresAt,storeId:packet.storeId,proof:structuredClone(packet),assurance:{eligible:true,status:'Signature verified against a current trusted key.'}};
 }
 // Keep unexpired prior receipts. Each renewal must re-sign the exact release.
 const receipts=(previous?.releases||[]).filter(x=>Date.parse(x.expiresAt)>Date.parse(at)&&x.id!==acceptedRelease?.id);
 if(acceptedRelease)receipts.push(acceptedRelease);
 s.repositorySync={storeId:packet.storeId,cursor:packet.cursor,issuedAt:packet.issuedAt,expiresAt:packet.expiresAt,keyId:packet.signature.keyId,lastPacketHash:packetHash,invalidations:tombstones,releases:receipts};
 s.version++;s.history.push({at,actor,type:'knowledge.repository-sync',id:acceptedRelease?.id||'cursor:'+packet.cursor,reason:revoked.length+' source(s) withdrawn; signed release '+(acceptedRelease?.id||'none'),reviewer:'Repository trust key '+packet.signature.keyId});
 if(JSON.stringify(s).length>8000000)fail('the project knowledge collection has reached its storage limit');
 return {document:p,unchanged:false,revoked,acceptedRelease:acceptedRelease?.id||null};
}

export function repositorySyncRequest(p,{tenantId,projectId,releaseId=null}={}){
 const s=knowledgeState(p),r=releaseId?s.releases.find(x=>x.id===releaseId):null;
 if(releaseId&&!r)fail('choose an existing reviewed release');
 let release=null;
 if(r){
  const sources=[...new Set(r.claims.map(c=>c.sourceId))].map(id=>s.sources.find(x=>x.id===id)).filter(x=>x?.origin==='repository-fetch');
  if(r.claims.some(c=>{const source=s.sources.find(x=>x.id===c.sourceId);return !!source?.repository&&source.origin!=='repository-fetch';}))fail('retrieve repository originals at exact commits before signing this release');
  if(!sources.length)fail('this release has no retrieved repository source');
  release={id:r.id,checksum:r.checksum,claims:r.claims.map(c=>({id:c.id,hash:digest(c)})),sources:sources.map(x=>({id:x.id,repository:x.repository,commit:x.revision,path:x.path,hash:x.hash}))};
 }
 const issuedAt=new Date().toISOString();
 return {schemaVersion:REPOSITORY_SYNC_VERSION,storeId:s.repositorySync?.storeId||null,tenantId,projectId,fromCursor:s.repositorySync?.cursor||0,cursor:s.repositorySync?.cursor||0,issuedAt,expiresAt:new Date(Date.parse(issuedAt)+86400000).toISOString(),release,notices:[],signature:null};
}

// Recheck retained proof against current trust configuration on every server
// read and reasoning request. A stored boolean is never the trust boundary.
export async function refreshRepositoryAssurance(env,owner,p){
 let keys;try{keys=JSON.parse(env.AIW_REPOSITORY_SYNC_KEYS||'{}');}catch{keys={};}
 const configuredKeys=isObject(keys)?Object.entries(keys).filter(([id,value])=>/^[-\w]{1,64}$/.test(id)&&bytes64(value)?.length===32).length:0;
 p.workspace||={};p.workspace.repositoryTrust={configuredKeys,status:configuredKeys?'Trusted public key configured':'Trusted public key needed'};
 const sync=p.knowledge?.repositorySync;if(!sync)return p;
 for(const receipt of sync.releases||[]){
  try{
   const proof=receipt.proof;
   if(!proof)fail('renew this legacy receipt to retain verifiable signed proof');
   await verifyRepositorySync(proof,env,{tenantId:owner,projectId:p.id});
   const signed=proof.release;
   if(!signed||proof.storeId!==sync.storeId||receipt.storeId!==proof.storeId||receipt.expiresAt!==proof.expiresAt||receipt.id!==signed.id||receipt.checksum!==signed.checksum||digest(receipt.claimHashes)!==digest(signed.claims)||digest([...receipt.sourceIds].sort())!==digest(signed.sources.map(x=>x.id).sort()))fail('retained receipt differs from signed proof');
   // Also bind the signed locator to the current original, not just its local ID.
   if(signed.sources.some(x=>!p.knowledge.sources.some(s=>s.id===x.id&&s.origin==='repository-fetch'&&s.repository===x.repository&&s.revision===x.commit&&s.path===x.path&&s.hash===x.hash)))fail('signed source identity changed');
   receipt.assurance={eligible:true,status:'Signature verified against a current trusted key.'};
  }catch(e){receipt.assurance={eligible:false,status:e.message?.startsWith('Repository sync:')?e.message.slice(17).trim():'Signed proof could not be verified.'};}
 }
 return p;
}

export async function handleRepositorySync(request,env,identity,projectId){
 const url=new URL(request.url),owner=identity.owner;
 if(!['owner','editor'].includes(identity.role))return new Response(JSON.stringify({error:'A project editor is required.'}),{status:403});
 if(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return new Response(JSON.stringify({error:'Use JSON from your private workspace origin.'}),{status:403});
 if(Number(request.headers.get('Content-Length')||0)>256000)return new Response(JSON.stringify({error:'Signed updates must be at most 256 KB.'}),{status:413});
 let raw='';const reader=request.body?.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let size=0;
 try{if(reader)for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>256000){await reader.cancel();return new Response(JSON.stringify({error:'Signed updates must be at most 256 KB.'}),{status:413});}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}
 catch{return new Response(JSON.stringify({error:'Invalid signed JSON encoding.'}),{status:400});}
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 try{
  const packet=JSON.parse(raw),packetHash=await verifyRepositorySync(packet,env,{tenantId:owner,projectId});
  const row=await env.DB.prepare('SELECT document,revision,updated_at FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();if(!row)return json({error:'Project not found.'},404);
  const stored=await readStoredProject(env,owner,row.document);if(stored.document.workspace?.status==='archived')return json({error:'Restore this project before applying repository updates.'},409);
  const at=new Date().toISOString(),result=applyRepositorySync(stored.document,packet,packetHash,at,identity.actor||owner);
  if(result.unchanged)return json({unchanged:true,cursor:packet.cursor,revision:row.revision,revoked:[]});
  const saved=await saveStoredProject(env,owner,projectId,result.document,row.revision,at,stored.keys);if(!saved.meta?.changes)return json({error:'The project changed while saving. Reload and retry.',conflict:true},409);
  return json({cursor:packet.cursor,revision:row.revision+1,revoked:result.revoked,acceptedRelease:result.acceptedRelease,expiresAt:packet.expiresAt});
 }catch(e){return json({error:e instanceof SyntaxError?'Invalid signed JSON.':e.message},400);}
}
