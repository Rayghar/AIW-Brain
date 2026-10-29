// Manual, signed handoff of a few selected originals when the repository laptop is not reachable
// by the hosted Worker. This moves source text only. A notice key cannot approve a release.
import {BRAIN_CATALOGUE} from './public/brain-catalogue.js';
import {sha256} from './public/brain-integrity.js';
import {applyKnowledgeCommand,knowledgeState} from './public/knowledge-governance.js';
import {canonicalJSON} from './repository-sync.js';
import {readStoredProject,saveStoredProject} from './project-storage.js';
import {publicMessage} from './error-message.js';
import {json} from './http.js';

export const TRANSFER_VERSION='aiw-repository-transfer-v1';
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,fields)=>object(x)&&Object.keys(x).length===fields.length&&fields.every(k=>Object.hasOwn(x,k));
const fail=why=>{throw Error('Repository transfer: '+why);};
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const id=x=>typeof x==='string'&&/^revision-[a-f0-9]{32}$/.test(x);
const pathOK=x=>typeof x==='string'&&/^[\w./ -]{1,350}$/.test(x)&&!x.startsWith('/')&&!x.split('/').some(s=>!s||s==='.'||s==='..')&&/\.(md|mdx|markdown|txt|adoc|asciidoc|rst)$/i.test(x);
const sourceRevision=s=>'revision-'+sha256(JSON.stringify([s.repository,s.commit,s.path,s.fileSha256])).slice(0,32);
const decode64=x=>{if(typeof x!=='string'||!/^[A-Za-z0-9_-]+$/.test(x)||x.length>150)return null;try{return Uint8Array.from(atob(x.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}catch{return null;}};

export async function verifyRepositoryTransfer(packet,env,{tenantId,projectId,now=Date.now()}={}){
 if(!exact(packet,['schemaVersion','storeId','tenantId','projectId','issuedAt','expiresAt','operatorReview','sources','signature'])||packet.schemaVersion!==TRANSFER_VERSION||!/^[a-f0-9-]{36}$/.test(packet.storeId)||packet.tenantId!==tenantId||packet.projectId!==projectId)fail('invalid authenticated scope or version');
 const issued=Date.parse(packet.issuedAt),expires=Date.parse(packet.expiresAt);
 if(!Number.isFinite(issued)||!Number.isFinite(expires)||issued>now+300000||expires<=now||expires<=issued||expires-issued>86400000)fail('the source transfer expired or exceeds its 24-hour lease');
 const o=packet.operatorReview;
 if(!exact(o,['rightsAcknowledged','purpose','posture'])||o.rightsAcknowledged!==true||o.posture!=='source-use-acknowledgement-only'||typeof o.purpose!=='string'||o.purpose.trim().length<20||o.purpose.length>500)fail('explicit source-use acknowledgement is required');
 if(!Array.isArray(packet.sources)||packet.sources.length<1||packet.sources.length>5)fail('choose one to five selected originals');
 const seen=new Set(),paths=new Set();
 for(const s of packet.sources){
  if(!exact(s,['revisionId','connectorId','repository','commit','path','fileSha256','text','supersedes','title','usePolicy','licenceDisposition']))fail('unexpected source fields');
  const repo=BRAIN_CATALOGUE.repositories.find(r=>r.connectorId===s.connectorId&&r.repository===s.repository);
  if(!repo||!id(s.revisionId)||seen.has(s.revisionId)||!/^[a-f0-9]{40}$/.test(s.commit)||!pathOK(s.path)||!hash(s.fileSha256)||s.revisionId!==sourceRevision(s)||s.supersedes!==null&&!id(s.supersedes))fail('source identity or registered repository mismatch');
  if(typeof s.text!=='string'||!s.text.trim()||s.text.includes('\u0000')||new TextEncoder().encode(s.text).length>60000||sha256(s.text)!==s.fileSha256)fail('original source bytes do not match their SHA-256 or project limit');
  if(typeof s.title!=='string'||!s.title.trim()||s.title.length>180||typeof s.usePolicy!=='string'||s.usePolicy.length>80||typeof s.licenceDisposition!=='string'||s.licenceDisposition.length>200)fail('source metadata exceeds its limits');
  if(paths.has(s.repository+'\n'+s.path))fail('choose at most one current revision per file');
  seen.add(s.revisionId);paths.add(s.repository+'\n'+s.path);
 }
 if(!exact(packet.signature,['algorithm','keyId','value'])||packet.signature.algorithm!=='Ed25519'||!/^[-\w]{1,64}$/.test(packet.signature.keyId))fail('invalid repository signature');
 let keys;try{keys=JSON.parse(env.AIW_REPOSITORY_NOTICE_KEYS||'{}');}catch{fail('trusted repository notice keys are not configured');}
 const publicKey=decode64(keys?.[packet.signature.keyId]),signature=decode64(packet.signature.value);
 if(publicKey?.length!==32||signature?.length!==64)fail('a trusted repository notice key and signature are required');
 const {signature:unused,...payload}=packet;
 try{const key=await crypto.subtle.importKey('raw',publicKey,{name:'Ed25519'},false,['verify']);if(!await crypto.subtle.verify('Ed25519',key,signature,new TextEncoder().encode(canonicalJSON(payload))))fail('signature verification failed');}
 catch(e){if(e.message?.startsWith('Repository transfer:'))throw e;fail('signature verification failed');}
 return packet;
}

function importerAttestation(packet,review){
 if(!exact(review,['rightsAcknowledged','purpose','revisionIds'])||review.rightsAcknowledged!==true||review.purpose!==packet.operatorReview.purpose||!Array.isArray(review.revisionIds)||review.revisionIds.length!==packet.sources.length||review.revisionIds.some((id,i)=>id!==packet.sources[i].revisionId))fail('the authenticated importer must acknowledge permitted source use, the signed purpose and every exact selected revision');
 return review;
}

export function applyRepositoryTransfer(input,packet,at,actor,importerReview){
 importerAttestation(packet,importerReview);
 let p=structuredClone(input),added=[],existing=[],s=knowledgeState(p);
 if(s.repositorySync?.storeId&&s.repositorySync.storeId!==packet.storeId)fail('project is pinned to a different repository store');
 for(const original of packet.sources){
  s=knowledgeState(p);
  const {repository,commit,path,fileSha256,revisionId}=original;
  const exactSource=s.sources.find(x=>x.origin==='repository-fetch'&&x.repository===repository&&x.revision===commit&&x.path===path&&x.hash===fileSha256&&sha256(x.body)===fileSha256);
  if(exactSource){existing.push(exactSource.id);continue;}
  const previous=s.sources.filter(x=>x.origin==='repository-fetch'&&x.repository===repository&&x.path===path&&!s.sources.some(y=>y.supersedes===x.id)).at(-1);
  if(previous){const previousRevision=sourceRevision({repository:previous.repository,commit:previous.revision,path:previous.path,fileSha256:previous.hash});
   if(original.supersedes!==previousRevision)fail('the changed file must identify the exact prior project revision; synchronise notices first');
  }
  const result=applyKnowledgeCommand(p,{type:'knowledge.source',payload:{title:original.title,body:original.text,
   url:'https://raw.githubusercontent.com/'+repository+'/'+commit+'/'+path.split('/').map(encodeURIComponent).join('/'),
   repository,revision:commit,path,license:'Detected '+original.usePolicy+'; '+original.licenceDisposition+'. Reviewer must verify permitted use.',
   supersedes:previous?.id}},at,actor);
  p=result.document;
  const source=p.knowledge.sources.find(x=>x.id===result.selected);
  source.origin='repository-fetch';source.connectorId=original.connectorId;
  source.acquisition={status:'retrieved',transport:'signed-transfer',at,revision:commit,hash:fileSha256,bytes:new TextEncoder().encode(original.text).length,
   corpus:{storeId:packet.storeId,revisionId,transferKeyId:packet.signature.keyId,transferIssuedAt:packet.issuedAt,usePolicy:original.usePolicy,licenceDisposition:original.licenceDisposition},
   usePurpose:packet.operatorReview.purpose,rightsAcknowledged:true,
   importerReview:{actor,at,purpose:importerReview.purpose,rightsAcknowledged:true,revisionId}};
  added.push(source.id);
 }
 if(added.length)p.knowledge.history.push({at,actor,type:'knowledge.repository-transfer',id:added.join(','),
  reason:'Authenticated importer acknowledged use of '+importerReview.revisionIds.join(', ')+' for: '+importerReview.purpose});
 return {document:added.length?p:input,added,existing};
}

export async function handleRepositoryTransfer(request,env,identity,projectId){
 const url=new URL(request.url),owner=identity.owner;
 if(!['owner','editor'].includes(identity.role))return json({error:'A project editor is required.'},403);
 if(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Use JSON from your private workspace origin.'},403);
 let raw='',size=0;const reader=request.body?.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});
 try{if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>800000){await reader.cancel();return json({error:'Select fewer or smaller originals (800 KB maximum).'},413);}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}
 catch{return json({error:'Invalid transfer JSON encoding.'},400);}
 try{
  const incoming=JSON.parse(raw);
  if(!exact(incoming,['transfer','importerReview']))fail('send the signed transfer with an explicit importer acknowledgement');
  const packet=await verifyRepositoryTransfer(incoming.transfer,env,{tenantId:owner,projectId});
  importerAttestation(packet,incoming.importerReview);
  const row=await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();if(!row)return json({error:'Project not found.'},404);
  const stored=await readStoredProject(env,owner,row.document);if(stored.document.workspace?.status==='archived')return json({error:'Restore this project before transferring knowledge.'},409);
  const result=applyRepositoryTransfer(stored.document,packet,new Date().toISOString(),identity.actor||owner,incoming.importerReview);
  if(!result.added.length)return json({unchanged:true,existing:result.existing,revision:row.revision,authority:'unreviewed-originals-only'});
  const saved=await saveStoredProject(env,owner,projectId,result.document,row.revision,new Date().toISOString(),stored.keys);
  if(!saved.meta?.changes)return json({error:'The project changed while saving. Reload and retry.',conflict:true},409);
  return json({added:result.added,existing:result.existing,revision:row.revision+1,authority:'unreviewed-originals-only',next:'Interpret exact passages, obtain independent review and a separate signed release receipt before activation.'});
 }catch(e){return json({error:e instanceof SyntaxError?'Invalid transfer JSON.':publicMessage(e)},400);}
}
