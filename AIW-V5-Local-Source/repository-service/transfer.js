// Explicit, bounded handoff of selected originals to a hosted AIW project. The automated
// repository key attests exact source bytes and identity; it does not approve a claim or licence.
import {createHash,sign} from 'node:crypto';
import {canonicalJSON} from '../repository-sync.js';

export const TRANSFER_VERSION='aiw-repository-transfer-v1';
const scope=/^[A-Za-z0-9][A-Za-z0-9._@:-]{0,159}$/;
const project=/^[a-z0-9][a-z0-9-]{0,79}$/;

export async function signedSourceTransfer(reader,{tenantId,projectId,revisionIds,purpose,rightsAcknowledged},key,{now=Date.now()}={}){
 if(!scope.test(tenantId||'')||!project.test(projectId||''))throw Error('Choose the exact tenant and project before transferring originals.');
 if(!Array.isArray(revisionIds)||revisionIds.length<1||revisionIds.length>5||new Set(revisionIds).size!==revisionIds.length)throw Error('Choose one to five distinct source revisions.');
 if(rightsAcknowledged!==true||typeof purpose!=='string'||purpose.trim().length<20||purpose.length>500)throw Error('Acknowledge source-use rights and record the specific purpose (20–500 characters). This is not licence clearance.');
 if(!key?.privateKey||!key.keyId)throw Error('The repository notice key is required to attest exact originals.');
 const sources=[];
 for(const revisionId of revisionIds){
  if(!/^revision-[a-f0-9]{32}$/.test(revisionId))throw Error('Choose a repository revision identity.');
  const original=await reader.original(revisionId);
  if(original.status!==200)throw Error('Original '+revisionId+' is unavailable or not permitted for project retrieval: '+original.error);
  const {connectorId,repository,commit,path,fileSha256,text,supersedes,title,licence}=original.body;
  if(new TextEncoder().encode(text).length>60000||createHash('sha256').update(text).digest('hex')!==fileSha256)throw Error('Original '+revisionId+' exceeds the project limit or changed on read.');
  if(typeof title!=='string'||!title.trim()||title.length>180||String(licence?.usePolicy||'unknown').length>80||String(licence?.finalDisposition||'requires-human-review').length>200)throw Error('Source metadata exceeds the project limits.');
  sources.push({revisionId,connectorId,repository,commit,path,fileSha256,text,supersedes:supersedes||null,title,
   usePolicy:licence?.usePolicy||'unknown',licenceDisposition:licence?.finalDisposition||'requires-human-review'});
 }
 const payload={schemaVersion:TRANSFER_VERSION,storeId:reader.store.storeId,tenantId,projectId,
  issuedAt:new Date(now).toISOString(),expiresAt:new Date(now+86400000).toISOString(),
  operatorReview:{rightsAcknowledged:true,purpose:purpose.trim(),posture:'source-use-acknowledgement-only'},sources};
 const packet={...payload,signature:{algorithm:'Ed25519',keyId:key.keyId,value:sign(null,Buffer.from(canonicalJSON(payload)),key.privateKey).toString('base64url')}};
 if(new TextEncoder().encode(JSON.stringify(packet)).length>800000)throw Error('The signed transfer exceeds 800 KB; choose fewer originals.');
 return packet;
}
