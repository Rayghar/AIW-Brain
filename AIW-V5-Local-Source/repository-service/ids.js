// Contract v1 identities (repository-packet.js): 32 hex characters of SHA-256 over compact JSON.
// node:crypto is used for speed; repository-service-validate.mjs checks parity with the Site's sha256.
import {createHash} from 'node:crypto';
export const sha256=value=>createHash('sha256').update(value).digest('hex');
const identity=(kind,parts)=>kind+'-'+sha256(JSON.stringify(parts)).slice(0,32);
export const revisionId=(repository,commit,path,fileSha256)=>identity('revision',[repository,commit,path,fileSha256]);
export const passageId=(revision,lineStart,lineEnd,excerptSha256)=>identity('passage',[revision,lineStart,lineEnd,excerptSha256]);
export const claimId=passage=>identity('claim',[passage]);
export const conceptId=catalogueId=>identity('concept',['catalogue',catalogueId]);
export const excerptOf=(text,lineStart,lineEnd)=>text.split('\n').slice(lineStart-1,lineEnd).join('\n');
