// Signed, selected originals from the laptop store to an authenticated project. Synthetic fixture only.
import assert from 'node:assert/strict';
import {rm} from 'node:fs/promises';
import {generateKeyPairSync} from 'node:crypto';
import {createFixture,filesA,A,AR,C2,texts} from './repository-service/fixture.mjs';
import {buildStore} from './repository-service/build.js';
import {openReader} from './repository-service/reader.js';
import {keyInfo,signedNoticeUpdate} from './repository-service/sync.js';
import {signedSourceTransfer} from './repository-service/transfer.js';
import {verifyRepositoryTransfer,applyRepositoryTransfer} from './repository-transfer.js';
import {verifyRepositorySync,applyRepositorySync} from './repository-sync.js';
import {localDatabase} from './local-db.js';
import {knowledgeEligibility,knowledgeState} from './public/knowledge-governance.js';
import {sha256} from './public/brain-integrity.js';

const checks=[];async function check(name,run){await run();checks.push(name);console.log('PASS',name);}
const {root,config,snapshot,select,snapB}=await createFixture('aiw-transfer-');
const pair=generateKeyPairSync('ed25519'),key={...keyInfo(pair.privateKey),privateKey:pair.privateKey};
const env={AIW_REPOSITORY_NOTICE_KEYS:JSON.stringify({[key.keyId]:key.publicKey})};
const scope={tenantId:'local-architect',projectId:'default'};
const use={...scope,revisionIds:[],purpose:'Evaluate queue protection patterns in this private architecture project.',rightsAcknowledged:true};
const importerReview=packet=>({rightsAcknowledged:true,purpose:packet.operatorReview.purpose,revisionIds:packet.sources.map(x=>x.revisionId)});
let reader,bundle,revisionId,sourceId;
try{
 await buildStore(config);reader=openReader(config);
 revisionId=(await reader.search({q:'Circuit Breaker',retrievable:true})).results[0].revision.revisionId;use.revisionIds=[revisionId];
 await check('operator selects one retrievable original, acknowledges intended use, and signs exact bytes',async()=>{
  bundle=await signedSourceTransfer(reader,use,key);
  assert.equal(bundle.sources.length,1);assert.equal(bundle.sources[0].text,texts.queueGuard);
  assert.equal(bundle.operatorReview.posture,'source-use-acknowledgement-only');
  await verifyRepositoryTransfer(bundle,env,scope);
  await assert.rejects(signedSourceTransfer(reader,{...use,rightsAcknowledged:false},key),/Acknowledge/);
  await assert.rejects(signedSourceTransfer(reader,{...use,revisionIds:[revisionId,revisionId]},key),/distinct/);
  const metadata=(await reader.search({q:'awesome'})).files[0]?.revisionId;
  if(metadata)await assert.rejects(signedSourceTransfer(reader,{...use,revisionIds:[metadata]},key),/not permitted/);
 });
 await check('signature, scope, expiry, source and trust-key tampering fail closed',async()=>{
  const altered=structuredClone(bundle);altered.sources[0].text+='changed';
  await assert.rejects(verifyRepositoryTransfer(altered,env,scope),/SHA-256/);
  const badSig=structuredClone(bundle);badSig.operatorReview.purpose+=' changed';
  await assert.rejects(verifyRepositoryTransfer(badSig,env,scope),/signature verification failed/);
  await assert.rejects(verifyRepositoryTransfer(bundle,env,{...scope,projectId:'elsewhere'}),/scope/);
  await assert.rejects(verifyRepositoryTransfer(bundle,env,{...scope,now:Date.parse(bundle.expiresAt)+1}),/expired/);
  await assert.rejects(verifyRepositoryTransfer(bundle,{AIW_REPOSITORY_NOTICE_KEYS:'{}'},scope),/trusted repository notice key/);
 });
 await check('transfer saves unreviewed repository original; repeat is idempotent and cannot make claims eligible',async()=>{
  const project={id:'default',knowledge:{version:0,counter:0,sources:[],suggestions:[],claims:[],contradictions:[],releases:[],pins:[],withdrawals:[],links:[],history:[]}};
  const result=applyRepositoryTransfer(project,bundle,new Date().toISOString(),'architect',importerReview(bundle));sourceId=result.added[0];
  const source=result.document.knowledge.sources[0];
  assert.equal(source.origin,'repository-fetch');assert.equal(source.acquisition.transport,'signed-transfer');assert.equal(source.hash,sha256(texts.queueGuard));
  assert.equal(source.acquisition.importerReview.actor,'architect');assert.equal(source.acquisition.importerReview.purpose,bundle.operatorReview.purpose);
  assert(result.document.knowledge.history.some(h=>h.type==='knowledge.repository-transfer'&&h.actor==='architect'&&h.reason.includes(bundle.operatorReview.purpose)));
  const {renderKnowledgeSources}=await import('./public/knowledge-sources-ui.js');
  assert.match(renderKnowledgeSources(result.document),/Signed source transfer · unreviewed/);
  assert.equal(result.document.knowledge.claims.length,0);assert.equal(result.document.knowledge.pins.length,0);
  assert.deepEqual(applyRepositoryTransfer(result.document,bundle,new Date().toISOString(),'architect',importerReview(bundle)).added,[]);
  assert.throws(()=>applyRepositoryTransfer(project,bundle,new Date().toISOString(),'architect'),/importer must acknowledge/);
  const {applyKnowledgeCommand}=await import('./public/knowledge-governance.js');
  const claim=applyKnowledgeCommand(result.document,{type:'knowledge.claim',payload:{sourceId,lineStart:7,lineEnd:8,subjectId:'PAT-CIRCUIT-BREAKER',predicate:'pairs-with',statement:'Bounded retries pair with a circuit breaker.',claimType:'applicability',polarity:'supports',conditions:'Dependency faults are distinguishable',limitations:'Capacity still needs measuring'}},new Date().toISOString(),'architect');
  assert.equal(knowledgeEligibility(claim.document,knowledgeState(claim.document).claims[0]).eligible,false);
  await assert.rejects(Promise.resolve().then(()=>applyRepositoryTransfer({...project,knowledge:{...project.knowledge,repositorySync:{storeId:'a'.repeat(36)}}},bundle,new Date().toISOString(),'architect',importerReview(bundle))),/different repository store/);
 });
 await check('Sources shows the bounded transfer, project scope and explicit second confirmation without rendering source text',async()=>{
  const {renderKnowledgeSources}=await import('./public/knowledge-sources-ui.js');
  const p={id:'default',knowledge:{sources:[],suggestions:[],claims:[],contradictions:[],releases:[],pins:[],withdrawals:[],links:[],history:[]}};
  const html=renderKnowledgeSources(p,'',new Set(),new Set(),null,{fileName:'transfer.json',purpose:'Use <script> only as untrusted text',sources:[{repository:AR,path:'docs/patterns/queue-guard.md',commit:'1'.repeat(40)}]},scope,true);
  assert.match(html,/Show this project’s transfer scope/);assert.match(html,/--tenant local-architect --project default/);
  assert.match(html,/I have checked that these specific source texts may be transferred/);
  assert.match(html,/data-k-transfer-confirm checked/,'confirmation must remain visible through redraws');
  assert.match(html,/Use &lt;script&gt; only as untrusted text/);assert(!html.includes(texts.queueGuard));
 });
 await check('authenticated Worker accepts the bounded bundle, rejects other origins and repeats',async()=>{
  const files=new Map(),DB=localDatabase(':memory:');
  const runtime={...env,DB,FILES:{async put(k,v){files.set(k,typeof v==='string'?v:new TextDecoder().decode(v));},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null;},async delete(k){files.delete(k);}},ASSETS:{fetch:()=>new Response('')}};
  const {default:worker}=await import('./worker.js'),origin='https://aiw.test';
  const api=async(path,{method='GET',body,headers={},status=200}={})=>{const response=await worker.fetch(new Request(origin+path,{method,headers:{'oai-authenticated-user-id':scope.tenantId,...(method==='POST'?{Origin:origin,'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})}),runtime);const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return data;};
  try{
   await api('/api/project');const actual=await api('/api/knowledge/repository-packet');
   const siteBundle=await signedSourceTransfer(reader,{...use,tenantId:actual.tenantId,projectId:actual.projectId},key);
   const wrapped={transfer:siteBundle,importerReview:importerReview(siteBundle)};
   await api('/api/knowledge/repository-transfer',{method:'POST',body:wrapped,headers:{Origin:'https://evil.test'},status:403});
   await api('/api/knowledge/repository-transfer',{method:'POST',body:siteBundle,status:400});
   await api('/api/knowledge/repository-transfer',{method:'POST',body:{...wrapped,importerReview:{...wrapped.importerReview,rightsAcknowledged:false}},status:400});
   await api('/api/knowledge/repository-transfer',{method:'POST',body:{...wrapped,importerReview:{...wrapped.importerReview,purpose:'Use in some other context'}},status:400});
   await api('/api/knowledge/repository-transfer',{method:'POST',body:{...wrapped,importerReview:{...wrapped.importerReview,revisionIds:[]}},status:400});
   const accepted=await api('/api/knowledge/repository-transfer',{method:'POST',body:wrapped});assert.equal(accepted.added.length,1);assert.equal(accepted.authority,'unreviewed-originals-only');
   const doc=(await api('/api/project')).document;assert.equal(knowledgeState(doc).sources[0].acquisition.transport,'signed-transfer');assert.equal(knowledgeState(doc).sources[0].acquisition.importerReview.actor,actual.tenantId);assert.equal(knowledgeState(doc).claims.length,0);
   const repeat=await api('/api/knowledge/repository-transfer',{method:'POST',body:wrapped});assert.equal(repeat.unchanged,true);
   const tampered=structuredClone(wrapped);tampered.transfer.sources[0].text+='injection';await api('/api/knowledge/repository-transfer',{method:'POST',body:tampered,status:400});
  }finally{DB.close();}
 });
 await check('changed revision must name the exact predecessor before source supersession',async()=>{
  reader.close();reader=null;
  const next=await snapshot(A,AR,C2,filesA({changed:true}),'derive-claims-only');await select([next,snapB]);await buildStore(config);reader=openReader(config);
  const newRevision=(await reader.search({q:'Circuit Breaker',retrievable:true})).results[0].revision.revisionId;
  const successor=await signedSourceTransfer(reader,{...use,revisionIds:[newRevision]},key);
  const base={id:'default',knowledge:{version:0,counter:0,sources:[],claims:[],suggestions:[],contradictions:[],releases:[],pins:[],withdrawals:[],links:[],history:[]}};
  const first=applyRepositoryTransfer(base,bundle,new Date().toISOString(),'architect',importerReview(bundle));
  const changed=applyRepositoryTransfer(first.document,successor,new Date().toISOString(),'architect',importerReview(successor));
  assert.equal(changed.document.knowledge.sources.at(-1).supersedes,first.added[0]);
  const missing=structuredClone(successor);missing.sources[0].supersedes=null;
  assert.throws(()=>applyRepositoryTransfer(first.document,missing,new Date().toISOString(),'architect',importerReview(missing)),/exact prior project revision/);
  const update=signedNoticeUpdate(reader,{...scope,fromCursor:0,storeId:bundle.storeId},key);
  const hash=await verifyRepositorySync(update,env,scope);
  const revoked=applyRepositorySync(first.document,update,hash,new Date().toISOString(),'repository-service');
  assert(revoked.revoked.includes(first.added[0]),'a signed invalidation must withdraw the transferred original');
 });
}finally{reader?.close();await rm(root,{recursive:true,force:true});}
console.log(JSON.stringify({status:'passed',checks:checks.length,authority:'Synthetic originals; signed handoff does not grant claim or licence approval',checksRun:checks},null,2));
