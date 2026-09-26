// The Brain's knowledge chain end to end, on the local server with the synthetic fixture corpus, two
// synthetic local accounts and the provider test double:
// a candidate set built against the corpus → imported as exact originals and candidate claims → the author
// cannot verify, a second person does → released → signed receipt applied → activated → linked to IF-001
// → Sol's packet for IF-001 carries it → the request to the provider sends it. A claim still a candidate
// never reaches Sol. Run: npm run test:brain-chain
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {writeFileSync,readFileSync,rmSync} from 'node:fs';
import {rm} from 'node:fs/promises';
import {generateKeyPairSync,createPublicKey,createHash,sign} from 'node:crypto';
import net from 'node:net';
import path from 'node:path';
import {createFixture,texts,hash,gitBlob,A,AR,C1} from './repository-service/fixture.mjs';
import {buildStore} from './repository-service/build.js';
import {startService} from './repository-service/server.js';
import {excerptOf} from './repository-service/ids.js';
import {canonicalJSON} from './repository-sync.js';
import {knowledgeStamp} from './public/knowledge-governance.js';
import {startMockLLM} from './mock-llm-provider.mjs';
import {importCandidateSet,signIn} from './scripts/import-candidate-set.mjs';

const checks=[],pass=n=>checks.push(n);
const {root,config}=await createFixture('aiw-chain-');await buildStore(config);
const token=createHash('sha256').update('chain-fixture').digest('hex'),service=await startService(config,{token,port:0});
const llm=await startMockLLM();
// The operator's release-signing key (synthetic); the workbench trusts its public half.
const {privateKey}=generateKeyPairSync('ed25519'),publicKey=Buffer.from(createPublicKey(privateKey).export({format:'jwk'}).x,'base64url');
const keyId='repo-'+createHash('sha256').update(publicKey).digest('hex').slice(0,16);
const ACCOUNTS={'architect-a':'architect-secret-0001','steward-b':'steward-secret-000002'};
const port=await new Promise(r=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const db='.aiw-local/brain-chain-'+port+'.sqlite';
const server=spawn(process.execPath,['server.js','--port',String(port)],{env:{...process.env,AIW_LOCAL_DB:db,AIW_LOCAL_ACCOUNTS:JSON.stringify(ACCOUNTS),OPENAI_API_KEY:'test-key',AIW_LLM_MODEL:'mock-sol',AIW_LLM_BASE_URL:llm.url,AIW_KNOWLEDGE_REPOSITORY_URL:service.url,AIW_KNOWLEDGE_REPOSITORY_TOKEN:token,AIW_REPOSITORY_SYNC_KEYS:JSON.stringify({[keyId]:publicKey.toString('base64url')}),AIW_REPOSITORY_SYNC_INTERVAL_MS:'1000000000000000'},stdio:['ignore','pipe','inherit']});
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('ready'))resolve();});server.on('exit',c=>reject(Error('server exited '+c)));});
const base='http://127.0.0.1:'+port;
const api=async(cookie,route,body)=>{const r=await fetch(base+route,{method:body?'POST':'GET',headers:{Cookie:cookie,Origin:base,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {...await r.json().catch(()=>({})),code:r.status};};
try{
  // A candidate corpus in the earlier backend's format, over two fixture files and one file the corpus lacks.
  const queue=texts.queueGuard,slots=texts.adoc,qAt=queue.split('\n').findIndex(l=>l.startsWith('A queue protects'))+1,sAt=slots.split('\n').findIndex(l=>l.startsWith('Blue and green'))+1;
  const licence={recordedSpdxId:'CC-BY-4.0',recordedUsePolicy:'derive-claims-only',reviewStatus:'pending',redistributionApproval:'not-granted'};
  const src=(id,rel,text,sha=hash(text))=>({id,connectorId:A,repository:AR,commitSha:C1,relativePath:rel,contentSha256:sha,gitBlobSha1:gitBlob(Buffer.from(text)),byteLength:Buffer.byteLength(text),admission:'accepted',licence});
  const passage=(id,sourceId,text,start,end)=>({id,sourceId,startLine:start,endLine:end,text:excerptOf(text,start,end),sha256:hash(excerptOf(text,start,end)),role:'mechanism'});
  const asset=(id,kind,title,pid,related)=>({id,title,family:'failure-recovery',kind,relatedPatternIds:related,problem:{text:'Callers outpace a slow dependency.',passageIds:[pid]},mechanism:{text:'Bound the calls and let a queue absorb bursts.',passageIds:[pid]},
    conditions:[{id:id+'-C1',explanation:'Callers can outpace the dependency.',passageIds:[pid]}],exclusions:[{text:'It adds no capacity.',passageIds:[pid]}],tradeoffs:[{text:'Queued work waits longer.',passageIds:[pid]}]});
  const corpus={schemaVersion:'aiw-evidence-candidate-corpus-v1',corpusId:'TEST-SET-1',baseRuntimeRelease:'none',authority:{status:'candidate-only'},fingerprint:'synthetic',
    sources:[src('queue','docs/patterns/queue-guard.md',queue),src('slots','docs/asciidoc/guide.adoc',slots),src('model','docs/model/settings.json','{}','e'.repeat(64))],
    passages:[passage('queue-mechanism','queue',queue,qAt,qAt+1),passage('slots-mechanism','slots',slots,sAt,sAt),{id:'model-settings',sourceId:'model',startLine:1,endLine:1,text:'{}',sha256:hash('{}'),role:'mechanism'}],
    assets:[asset('T-QUEUE','pattern','Guard a slow dependency with a queue','queue-mechanism',['PAT-CIRCUIT-BREAKER']),asset('T-SLOTS','tactic','Check a release in a spare slot','slots-mechanism',[]),asset('T-MODEL','contract','Configured settings','model-settings',[])]};
  writeFileSync(path.join(root,'candidate.json'),JSON.stringify(corpus));
  const built=spawnSync(process.execPath,['scripts/build-candidate-set.mjs',path.join(root,'candidate.json'),'--config',path.join(root,'config.json'),'--out',path.join(root,'pack.json')],{encoding:'utf8'});
  assert.equal(built.status,0,built.stderr);
  const pack=JSON.parse(readFileSync(path.join(root,'pack.json'),'utf8'));
  assert.equal(pack.counts.claims,2);assert.deepEqual(pack.notImported.map(x=>x.assetId),['T-MODEL']);
  assert.ok(!JSON.stringify(pack).includes(queue.split('\n')[qAt-1]),'the pack carries no source text');

  // 1. Import as the signed-in architect.
  const architect=await signIn(base,'architect-a',ACCOUNTS['architect-a']);
  const projectId=(await api(architect,'/api/project')).document.id,q='?project='+encodeURIComponent(projectId);
  const dry=await importCandidateSet({base,pack,cookie:architect,dryRun:true});
  assert.equal(dry.claimsCreated.length,2);assert.equal((await api(architect,'/api/project'+q)).document.knowledge?.claims?.length||0,0,'a dry run changes nothing');
  const imported=await importCandidateSet({base,pack,cookie:architect});
  assert.equal(imported.sourcesRetrieved.length,2);assert.equal(imported.claimsCreated.length,2);assert.deepEqual(imported.notImported.map(x=>x.assetId),['T-MODEL']);
  let d=(await api(architect,'/api/project'+q)).document;
  const claim=d.knowledge.claims.find(c=>c.tags.includes('asset:T-QUEUE')),other=d.knowledge.claims.find(c=>c.tags.includes('asset:T-SLOTS'));
  const source=d.knowledge.sources.find(s=>s.id===claim.sourceId);
  assert.equal(claim.actor,'architect-a');assert.equal(claim.review,undefined);assert.equal(claim.subjectId,'PAT-CIRCUIT-BREAKER');
  assert.equal(source.origin,'repository-fetch');assert.equal(source.acquisition.transport,'akr-corpus');assert.equal(source.body,queue);assert.equal(claim.excerpt,excerptOf(queue,qAt,qAt+1));
  const again=await importCandidateSet({base,pack,cookie:architect});
  assert.equal(again.claimsCreated.length,0);assert.equal(again.skipped.filter(x=>/Already imported/.test(x.reason)).length,2);
  pass('a candidate set built against the corpus imports as exact originals and candidate claims on the anchored lines, authored by the signed-in architect; a dry run changes nothing, a second run adds nothing, and an asset whose evidence the corpus cannot supply is reported instead of imported');

  // 2. Four eyes: the author is refused; a second person, added to the team, verifies.
  const cmd=async(cookie,command)=>{const {revision}=await api(cookie,'/api/project'+q);return api(cookie,'/api/commands'+q,{revision,command});};
  const review={reviewed:true,reviewer:'Steward B',reason:'Checked the passage, the permitted use and the conditions.'},verify={id:claim.id,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true};
  let r=await cmd(architect,{type:'knowledge.review',payload:{...review,...verify}});
  assert.equal(r.code,400);assert.match(r.error,/Another authenticated person must verify it/);
  assert.equal((await api(architect,'/api/access'+q,{actorId:'steward-b',role:'editor'})).code,200);
  const steward=await signIn(base,'steward-b',ACCOUNTS['steward-b']);
  r=await cmd(steward,{type:'knowledge.review',payload:{...review,...verify}});assert.equal(r.code,200,r.error);
  pass('four eyes: the importing architect is refused when verifying the claim; the owner adds a second person, who signs in and verifies it');

  // 3. Release, the operator's signed receipt, activation and a link to IF-001.
  const signoff={reviewed:true,reviewer:'Architect A',reason:'Independently reviewed; used for IF-001.'};
  r=await cmd(architect,{type:'knowledge.release',payload:{...signoff,claimIds:[claim.id],title:'Queue guard guidance'}});assert.equal(r.code,200,r.error);
  const releaseId=r.document.knowledge.releases.at(-1).id;
  const {code:proposalStatus,...proposal}=await api(architect,'/api/knowledge/repository-sync'+q+'&release='+releaseId);assert.equal(proposalStatus,200,proposal.error);
  const storeId=(await (await fetch(service.url+'/v1/status',{headers:{Authorization:'Bearer '+token}})).json()).storeId;
  const {signature:unsigned,...payload}={...proposal,storeId,notices:[],cursor:proposal.fromCursor};
  const packet={...payload,signature:{algorithm:'Ed25519',keyId,value:sign(null,Buffer.from(canonicalJSON(payload)),privateKey).toString('base64url')}};
  r=await api(architect,'/api/knowledge/repository-sync'+q,packet);assert.equal(r.code,200,r.error);assert.equal(r.acceptedRelease,releaseId);
  d=(await api(architect,'/api/project'+q)).document;
  r=await cmd(architect,{type:'knowledge.activate',payload:{...signoff,id:releaseId,stamp:knowledgeStamp(d)}});assert.equal(r.code,200,r.error);
  r=await cmd(architect,{type:'knowledge.link',payload:{...signoff,claimId:claim.id,releaseId,objectId:'rest'}});assert.equal(r.code,200,r.error);
  pass('the verified claim is released, its signed release receipt is verified and applied, the release is activated, and the claim is linked to IF-001');

  // 4. Sol reads it: the packet for IF-001 carries the claim, and the request to the provider sends it.
  const ask={task:'decisions',ids:['M:8:rest'],scope:'M:8:rest'};
  const prepared=await api(architect,'/api/intelligence/reasoning-context'+q,ask);assert.equal(prepared.code,200,prepared.error);
  const governed=prepared.packet.sources.filter(s=>s.kind==='governed-claim'),carries=t=>governed.some(s=>JSON.stringify(s).includes(t));
  assert.ok(carries(claim.statement.slice(0,60)),'Sol\'s packet for IF-001 carries the linked claim: '+JSON.stringify(prepared.packet.sources.map(s=>[s.kind,s.title])));
  assert.ok(!carries(other.statement.slice(0,60)),'a claim that is still a candidate never reaches Sol');
  const n=llm.bodies.length,sent=await api(architect,'/api/intelligence/reason'+q,{...ask,packetStamp:prepared.packet.stamp,requestId:crypto.randomUUID()});
  assert.equal(sent.code,200,sent.error);assert.equal(sent.status,'completed');
  const draft=llm.bodies.slice(n).find(b=>b.text?.format?.name==='aiw_desk_assessment');
  assert.ok(draft&&JSON.stringify(draft.input).includes(claim.statement.slice(0,60)),'the request to the provider carries the claim');
  pass('Sol reads it: the packet for IF-001 carries the released, activated and linked claim, the request to the provider sends it, and the claim still a candidate reaches neither');
}finally{
  server.kill();await llm.close();await service.close();
  for(const f of [db,db+'-wal',db+'-shm'])try{rmSync(f,{force:true});}catch{/* best effort */}
  await rm(root,{recursive:true,force:true});
}
console.log(JSON.stringify({passed:checks.length,checks},null,2));
