import {generateKeyPairSync,createPrivateKey,createPublicKey,createHash,sign} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {canonicalJSON,REPOSITORY_SYNC_VERSION} from '../repository-sync.js';

const [mode,...args]=process.argv.slice(2);
const keyInfo=key=>{const publicKey=createPublicKey(key),raw=Buffer.from(publicKey.export({format:'jwk'}).x,'base64url');return {keyId:'repo-'+createHash('sha256').update(raw).digest('hex').slice(0,16),publicKey:raw.toString('base64url')};};
if(mode==='keygen'){
 const [destination]=args;if(!destination)throw Error('Usage: node scripts/sign-repository-sync.mjs keygen PRIVATE_KEY.pem');
 const {privateKey}=generateKeyPairSync('ed25519');await writeFile(destination,privateKey.export({type:'pkcs8',format:'pem'}),{flag:'wx',mode:0o600});
 console.log(JSON.stringify(keyInfo(privateKey)));
}else if(mode==='sign'){
 const [requestFile,keyFile,destination,storeId,noticesFile]=args;
 if(!requestFile||!keyFile||!destination||!/^[a-f0-9-]{36}$/.test(storeId||''))throw Error('Usage: node scripts/sign-repository-sync.mjs sign REQUEST.json PRIVATE_KEY.pem OUTPUT.json STORE_UUID [NOTICES.json]');
 const request=JSON.parse(await readFile(requestFile,'utf8'));
 if(request.schemaVersion!==REPOSITORY_SYNC_VERSION||request.signature!==null||request.storeId!==null&&request.storeId!==storeId)throw Error('Use a fresh unsigned request for this store.');
 const notices=noticesFile?JSON.parse(await readFile(noticesFile,'utf8')):[];
 if(!Array.isArray(notices)||notices.length>100)throw Error('Provide up to 100 exact invalidation notices.');
 const packet={...request,storeId,notices,cursor:request.fromCursor+notices.length};
 const privateKey=createPrivateKey(await readFile(keyFile)),{keyId}=keyInfo(privateKey);
 const {signature:unsigned,...payload}=packet;
 packet.signature={algorithm:'Ed25519',keyId,value:sign(null,Buffer.from(canonicalJSON(payload)),privateKey).toString('base64url')};
 await writeFile(destination,JSON.stringify(packet,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({signed:destination,keyId,fromCursor:packet.fromCursor,cursor:packet.cursor,release:packet.release?.id||null,expiresAt:packet.expiresAt}));
}else throw Error('Usage: node scripts/sign-repository-sync.mjs keygen PRIVATE_KEY.pem | sign REQUEST.json PRIVATE_KEY.pem OUTPUT.json STORE_UUID [NOTICES.json]');
