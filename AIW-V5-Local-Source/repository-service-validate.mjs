// Knowledge repository service: identities, streaming manifests, segmentation, policy gating, search,
// exact originals, refresh notices, packets, signed notices and the loopback HTTP boundary — against a
// synthetic corpus of original text (no acquired third-party content is read). Run: npm run test:repository-service
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,readFile} from 'node:fs/promises';
import {createHash,generateKeyPairSync} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {readManifest} from './repository-service/manifest-stream.js';
import {segment} from './repository-service/passages.js';
import {revisionId as rid,passageId as pid,excerptOf} from './repository-service/ids.js';
import {buildStore,withdrawRevision} from './repository-service/build.js';
import {openReader,ftsQuery} from './repository-service/reader.js';
import {openStore} from './repository-service/store.js';
import {candidatePacket,signedNoticeUpdate,keyInfo} from './repository-service/sync.js';
import {startService} from './repository-service/server.js';
import {loadConfig} from './repository-service/corpus.js';
import {sha256 as siteSha256} from './public/brain-integrity.js';
import {prepareRepositoryPacket} from './repository-packet.js';
import {verifyRepositorySync,applyRepositorySync,canonicalJSON} from './repository-sync.js';
import {acquireRepositorySource} from './knowledge-service.js';
import {repositoryServiceEndpoint,repositoryServiceStatus} from './knowledge-repository.js';
import {knowledgeState} from './public/knowledge-governance.js';

const checks=[],started=Date.now();
async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
const hash=b=>createHash('sha256').update(b).digest('hex');
const root=await mkdtemp(path.join(tmpdir(),'aiw-krs-')),live=path.join(root,'github-live');
const A='GH-MICROSOFT-ARCH-CENTER',AR='MicrosoftDocs/architecture-center',B='GH-AWESOME-SCALABILITY',BR='binhnguyennus/awesome-scalability';
const C1='1111111111111111111111111111111111111111',C2='2222222222222222222222222222222222222222',C3='3333333333333333333333333333333333333333';

// ---- Synthetic corpus (original text written for this test) ----
const queueGuard=['---','title: Guarding a work queue','description: synthetic fixture','---','# Guarding a work queue','','A queue protects a slow dependency when callers outpace it. Pair a Circuit Breaker','with Retry with Backoff so that transient faults are retried and persistent faults stop quickly.','','```sh','# not a heading inside a fence','retry --max 3','```','','## When to use','','Use it when producers are bursty and the consumer has a stable service rate.','A Transactional Outbox keeps the enqueue in the same commit as the business write.','','Setext heading','--------------','','Bulkhead pools keep one noisy tenant from exhausting every worker in the service.',''].join('\n');
const queueGuard2=queueGuard.replace('stable service rate','stable service rate that can be measured');
const bom='﻿# Byte order mark note\r\n\r\nThis synthetic note keeps a byte order mark and CRLF endings to prove exact hashing.\r\nCache-Aside reads fall back to the store when an entry is missing.\r\n';
const large='# Large synthetic page\n\n'+Array.from({length:900},(_,i)=>`Paragraph ${i}: capacity planning keeps a margin above the measured peak for rolling releases.`).join('\n\n')+'\n';
const adoc='= Synthetic AsciiDoc guide\n\n== Deployment slots\n\nBlue and green slots let a release be checked before traffic moves across.\n';
const rst='Synthetic RST guide\n===================\n\nReplicas\n--------\n\nThree replicas across two zones keep a majority when one zone is lost.\n';
const odd='# Plus path\n\nThis file has a path that the project source contract does not accept.\n';
const scalability='# Awesome synthetic list\n\nMETADATA-ONLY-SENTINEL text that must never be indexed because the dossier allows metadata only.\n';
const latin=Buffer.from([0x23,0x20,0x4c,0xe9,0x67,0x61,0x63,0x79,0x0a,0x54,0x65,0x78,0x74,0x20,0xff,0xfe,0x0a]);
async function snapshot(connectorId,repository,commit,files,usePolicy){
 const snapshotId='KSNAP-'+connectorId+'-'+commit.slice(0,12),dir=path.join(live,'snapshots',connectorId,snapshotId);await mkdir(dir,{recursive:true});
 const entries=[];
 for(const f of files){
  if(['policy-excluded','rejected'].includes(f.status)){entries.push({path:f.path,sha:'0'.repeat(40),sizeBytes:10,status:f.status,dispositionReason:'fixture'});continue;}
  const bytes=Buffer.isBuffer(f.bytes)?f.bytes:Buffer.from(f.bytes,'utf8'),h=hash(bytes),store=f.status==='quarantined'?'quarantine':'objects',rel=store+'/sha256/'+h.slice(0,2)+'/'+h;
  await mkdir(path.join(dir,store,'sha256',h.slice(0,2)),{recursive:true});await writeFile(path.join(dir,...rel.split('/')),f.corrupt?Buffer.from('tampered bytes'):bytes);
  entries.push({path:f.path,sha:'0'.repeat(40),sizeBytes:bytes.length,mediaType:'text/markdown',sourceFormat:f.path.split('.').at(-1),parserRequired:'fixture',status:f.status||'accepted',findings:f.findings||[],contentSha256:'sha256:'+h,...(store==='objects'?{contentAddressedObject:rel}:{}),securityDisposition:'fixture',claimCandidateCount:0,sectionCount:0,boundedEvidenceCount:0,parserStatus:'parsed'});
 }
 const manifest={schemaVersion:'aiw-github-acquisition-v4',connectorId,repository,branch:'main',commitSha:commit,snapshotId,acquiredAt:'2026-07-15T10:00:00.000Z',repositoryMetadata:{htmlUrl:'https://github.com/'+repository},api:{contentTransport:'raw-immutable'},tree:{totalBlobs:entries.length},policy:{allowedPaths:['docs/**']},
  licenceEvidence:{repositoryApi:{spdxId:'CC-BY-4.0',name:'Creative Commons Attribution 4.0',path:'LICENSE'},dossierReviewStatus:'requires-review',dossierUsePolicy:usePolicy,finalDisposition:'requires-human-licence-review'},
  files:entries,snapshotChecksum:'sha256:'+hash(connectorId+commit),architectureArtefacts:[{note:'skipped "quoted" {braces} [brackets] \\ é✓'}],crossFileArchitectureGroups:[],coverage:{acceptedFiles:entries.length},candidateClaims:{total:0,authority:'candidate'},
  tricky:'a "quoted" value with {braces}, [brackets], a backslash \\ and é✓',count:3,flag:true,nothing:null,manifestSha256:'sha256:'+hash('manifest'+connectorId+commit)};
 await writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1));
 return {connectorId,repository,immutableCommit:commit,snapshotId,manifestPath:'knowledge-repository/AKR-0.10.73.7/github-live/snapshots/'+connectorId+'/'+snapshotId+'/manifest.json',manifestChecksum:manifest.manifestSha256,snapshotChecksum:manifest.snapshotChecksum,manifest};
}
const filesA=(changed=false,withAdoc=true,extra=false)=>[
 {path:'docs/patterns/queue-guard.md',bytes:changed?queueGuard2:queueGuard,findings:[{severity:'info',code:'EMBEDDED_SCRIPT',detail:'fixture'}]},
 {path:'docs/patterns/bom-note.md',bytes:bom},{path:'docs/guide/large.md',bytes:large},
 ...(withAdoc?[{path:'docs/asciidoc/guide.adoc',bytes:adoc}]:[]),{path:'docs/rst/guide.rst',bytes:rst},
 {path:'docs/odd/plus+path.md',bytes:odd},{path:'docs/legacy/latin.txt',bytes:latin},
 {path:'docs/corrupt/broken.md',bytes:'# Broken\n\nThis object is replaced on disk by different bytes.\n',corrupt:true},
 {path:'docs/data/config.json',bytes:'{"a":1}'},{path:'docs/images/diagram.png',bytes:'PNG',status:'accepted-opaque'},
 {path:'docs/secret/leak.md',bytes:'# Leak\n\nQUARANTINE-SENTINEL-TEXT must never be read or indexed.\n',status:'quarantined'},
 {path:'build/out.md',status:'policy-excluded'},{path:'docs/huge.md',status:'rejected'},
 ...(extra?[{path:'docs/patterns/new-page.md',bytes:'# Newly observed page\n\nA new synthetic page that appears in a later snapshot of the same repository.\n'}]:[])];
async function corpus(snaps){
 await writeFile(path.join(root,'index.json'),JSON.stringify({schemaVersion:'aiw-content-snapshot-manifest-index-v1',releaseId:'FIXTURE',productionAccepted:false,knowledgeAuthority:'candidate',manifests:snaps.map(({manifest,...m})=>m)}));
}
const catalogue={generatedAt:'2026-07-13T00:00:00Z',connectors:[
 {id:A,name:'Microsoft Architecture Center',owner:'Microsoft',repository:AR,lifecycleStatus:'approved',trustTier:1,categories:['reference'],contentUses:['claim-evidence'],allowedPaths:['docs/**'],deniedPaths:[],maxFileBytes:750000,license:{reviewStatus:'requires-review',usePolicy:'derive-claims-only',note:'Fixture licence note.'}},
 {id:B,name:'Awesome Scalability',owner:'binhnguyennus',repository:BR,lifecycleStatus:'discovery-only',trustTier:2,license:{reviewStatus:'requires-review',usePolicy:'metadata-only',note:'Metadata only.'}}]};
await writeFile(path.join(root,'catalogue.json'),JSON.stringify(catalogue));
await writeFile(path.join(root,'SHA256SUMS'),hash(await readFile(path.join(root,'catalogue.json')))+'  catalogue.json\n');
await writeFile(path.join(root,'config.json'),JSON.stringify({snapshotRoot:'github-live',manifestIndex:'index.json',catalogue:'catalogue.json',catalogueSums:'SHA256SUMS',store:'store/akr.sqlite',secrets:'secrets',port:0}));
const config=await loadConfig(path.join(root,'config.json'));
const snapA1=await snapshot(A,AR,C1,filesA(),'derive-claims-only'),snapB=await snapshot(B,BR,C1,[{path:'README.md',bytes:scalability}],'metadata-only');
await corpus([snapA1,snapB]);

let token,service,key,project={id:'kr-test',name:'Repository test'},sourceId,baseStoreId;
try{
await check('identities: node SHA-256 equals the Site SHA-256 and revision identity follows the packet contract',async()=>{
 for(const s of ['','abc','é✓ unicode','﻿bom\r\ncrlf'])assert.equal(hash(Buffer.from(s,'utf8')),siteSha256(s));
 const r=rid(AR,C1,'docs/a.md','a'.repeat(64));assert.equal(r,'revision-'+siteSha256(JSON.stringify([AR,C1,'docs/a.md','a'.repeat(64)])).slice(0,32));
 assert.equal(pid(r,1,2,'b'.repeat(64)),'passage-'+siteSha256(JSON.stringify([r,1,2,'b'.repeat(64)])).slice(0,32));
});

await check('manifest stream: identical to JSON.parse at hostile chunk boundaries, artefact arrays skipped, raw SHA-256 recorded',async()=>{
 const file=path.join(live,'snapshots',A,snapA1.snapshotId,'manifest.json'),raw=await readFile(file),full=JSON.parse(raw.toString('utf8'));
 for(const chunkSize of [1,7,13,4096]){const files=[];const {header,rawSha256}=await readManifest(file,e=>files.push(e),{chunkSize});
  assert.deepEqual(files,full.files);assert.equal(rawSha256,hash(raw));assert.equal(header.architectureArtefacts,undefined);
  for(const k of ['tricky','count','flag','nothing','manifestSha256','licenceEvidence','commitSha'])assert.deepEqual(header[k],full[k],k);}
});

await check('segmentation: front matter, fenced hashes, setext/AsciiDoc/RST headings; exact line ranges with CR and BOM kept',async()=>{
 const s=segment(queueGuard,'docs/patterns/queue-guard.md');assert.equal(s.title,'Guarding a work queue');
 assert(!s.passages.some(p=>/not a heading/.test(p.heading)),'a fenced # line is not a heading');
 assert(s.passages.some(p=>p.heading==='Guarding a work queue › When to use'));assert(s.passages.some(p=>/Setext heading/.test(p.heading)));
 for(const p of s.passages){assert(p.lineStart>=5&&p.lineEnd>=p.lineStart&&p.lineEnd-p.lineStart<60);}
 const b=segment(bom,'docs/patterns/bom-note.md');assert.equal(b.passages[0].lineStart,1);assert(excerptOf(bom,1,b.passages[0].lineEnd).startsWith('﻿# Byte'));assert(excerptOf(bom,1,3).includes('\r'));
 assert.equal(segment(adoc,'g.adoc').title,'Synthetic AsciiDoc guide');assert(segment(adoc,'g.adoc').passages.some(p=>/Deployment slots/.test(p.heading)));
 assert(segment(rst,'g.rst').passages.some(p=>/Replicas/.test(p.heading)));
 const big=segment(large,'l.md');assert(big.passages.length>20&&big.passages.every(p=>p.lineEnd-p.lineStart<60));
});

await check('baseline build: policy gating, verified bytes, retrieval decisions, no notices before the baseline',async()=>{
 const summary=await buildStore(config,{concurrency:4});assert.equal(summary.complete,true);assert.equal(summary.cursor,0);assert.deepEqual(summary.errors,[]);baseStoreId=summary.storeId;
 const r=openReader(config);try{
  const st=r.status();assert.equal(st.counts.connectors,2);assert.equal(st.authority,'discovery-only');assert.equal(st.productionAccepted,false);
  const rev=p=>r.store.db.prepare('SELECT * FROM revisions WHERE path=?').get(p);
  assert.equal(rev('docs/patterns/queue-guard.md').retrievable,1);assert.equal(rev('docs/patterns/bom-note.md').retrievable,1);
  assert.equal(rev('docs/guide/large.md').retrieval_reason,'too-large-for-project-source');assert.equal(rev('docs/odd/plus+path.md').retrieval_reason,'path-not-supported');
  assert.equal(rev('docs/legacy/latin.txt').retrieval_reason,'not-text');assert.equal(rev('docs/corrupt/broken.md').state,'unavailable');
  assert.equal(rev('README.md').body_indexed,0);assert.equal(rev('README.md').retrieval_reason,'connector-not-approved');
  for(const p of ['docs/data/config.json','docs/images/diagram.png','docs/secret/leak.md','build/out.md','docs/huge.md'])assert.equal(rev(p),undefined,p+' is not a documentation revision');
  assert.deepEqual(JSON.parse(rev('docs/patterns/queue-guard.md').findings),['EMBEDDED_SCRIPT']);
 }finally{r.close();}
});

await check('search: ranked passages, phrases, prefixes, filters, two per file, and hostile query text never reaches FTS syntax',async()=>{
 const r=openReader(config);try{
  const s=await r.search({q:'circuit breaker'});assert(s.total>=1);const hit=s.results[0];assert.equal(hit.revision.path,'docs/patterns/queue-guard.md');assert.equal(hit.verified,true);assert.match(hit.snippet,/Circuit Breaker/);
  assert(hit.concepts.some(c=>c.catalogueId==='PAT-CIRCUIT-BREAKER'));assert.equal(hit.revision.licence.clearance,'not-reviewed');
  assert.equal(siteSha256(hit.excerpt),hit.excerptSha256);
  assert((await r.search({q:'"transactional outbox"'})).total>=1);assert((await r.search({q:'replic'})).total>=1);
  assert.equal((await r.search({q:'QUARANTINE-SENTINEL-TEXT'})).total,0);assert.equal((await r.search({q:'METADATA-ONLY-SENTINEL'})).total,0);
  assert((await r.search({q:'awesome'})).files.some(f=>f.path==='README.md'&&!f.bodyIndexed));
  assert.equal((await r.search({q:'capacity',connector:B})).total,0);
  const outbox=r.concepts('outbox').find(c=>c.catalogueId==='PAT-TRANSACTIONAL-OUTBOX');assert(outbox);assert((await r.search({q:'commit',concept:outbox.conceptId})).total>=1);
  const many=await r.search({q:'capacity planning margin'});assert(many.total>20);assert(many.results.filter(x=>x.revision.path==='docs/guide/large.md').length<=2);
  assert.equal((await r.search({q:'capacity',retrievable:true})).results.length,0,'the large page is not retrievable');
  for(const q of ['NEAR(a b)','"unterminated','a OR b','-x','*','^start','col:value','(((','"" ""','\u0000',"'; DROP TABLE revisions;--",'a'.repeat(400)])await r.search({q});
  assert.equal(ftsQuery('   '),null);assert.equal(ftsQuery('Retry, backoff'),'"Retry" AND "backoff"*');
 }finally{r.close();}
});

await check('exact originals: BOM and CRLF preserved so the Site hash matches; refused with a reason when not retrievable',async()=>{
 const r=openReader(config);try{
  const id=p=>r.store.db.prepare('SELECT revision_id FROM revisions WHERE path=?').get(p).revision_id;
  const o=await r.original(id('docs/patterns/bom-note.md'));assert.equal(o.status,200);assert.equal(o.body.text,bom);assert.equal(siteSha256(o.body.text),o.body.fileSha256);
  for(const [p,reason] of [['docs/guide/large.md','too-large-for-project-source'],['README.md','connector-not-approved'],['docs/corrupt/broken.md','revision-not-current']]){const x=await r.original(id(p));assert.equal(x.status,409);assert.equal(x.reason,reason);}
  assert.equal((await r.original('revision-'+'0'.repeat(32))).status,404);
 }finally{r.close();}
});

await check('resumable build: a crashed job resumes after its last completed connector; store identity never changes',async()=>{
 const s=openStore(config.store);s.db.prepare("INSERT INTO jobs(id,kind,state,position,started_at,updated_at,data) VALUES('build:crash','build','running',?,?,?,?)").run(A,'2026-09-25T00:00:00Z','2026-09-25T00:00:00Z',JSON.stringify({selection:hash(await readFile(path.join(root,'index.json'))),done:[A]}));s.close();
 const summary=await buildStore(config);assert.equal(summary.job,'build:crash');assert.equal(summary.resumedPast,1);assert.deepEqual(summary.connectors.map(c=>c.connectorId),[B]);assert.equal(summary.storeId,baseStoreId);assert.equal(summary.cursor,0);
});

await check('HTTP service: loopback host, bearer token and no browser origin; bounded JSON routes',async()=>{
 token=createHash('sha256').update('fixture-token').digest('hex');const pair=generateKeyPairSync('ed25519');key={...keyInfo(pair.privateKey),privateKey:pair.privateKey};
 service=await startService(config,{token,key,port:0});
 const call=(route,init={})=>fetch(service.url+route,{...init,headers:{Authorization:'Bearer '+token,...(init.headers||{})}});
 assert.equal((await fetch(service.url+'/v1/status')).status,401);
 assert.equal((await fetch(service.url+'/v1/status',{headers:{Authorization:'Bearer '+'x'.repeat(64)}})).status,401);
 assert.equal((await call('/v1/status',{headers:{Origin:'https://evil.example'}})).status,403);
 const st=await (await call('/v1/status')).json();assert.equal(st.storeId,baseStoreId);assert.equal(st.signing.purpose,'notices-only');
 assert.equal((await call('/v1/search?q=bulkhead')).status,200);assert.equal((await call('/v1/passages/passage-'+'0'.repeat(32))).status,404);
 assert.equal((await call('/v1/nothing')).status,404);assert.equal((await call('/v1/revisions/../../etc')).status,404);
 assert.equal((await call('/v1/sync',{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'})).status,415);
 assert.equal((await call('/v1/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);
 assert.equal((await call('/v1/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pad:'x'.repeat(70000)})})).status,413);
 const http=await import('node:http');const status=await new Promise(res=>{const q=http.request({host:'127.0.0.1',port:service.port,path:'/v1/status',headers:{Host:'attacker.example',Authorization:'Bearer '+token}},r=>{res(r.statusCode);r.resume();});q.end();});assert.equal(status,421);
});

await check('Site retrieval through the corpus transport: same origin and identity as a GitHub read, re-verified, idempotent',async()=>{
 const env={AIW_KNOWLEDGE_REPOSITORY_URL:service.url,AIW_KNOWLEDGE_REPOSITORY_TOKEN:token};assert.equal(repositoryServiceEndpoint(env).configured,true);
 assert.equal(repositoryServiceEndpoint({AIW_KNOWLEDGE_REPOSITORY_URL:'http://example.com',AIW_KNOWLEDGE_REPOSITORY_TOKEN:token}).configured,false,'plain http off loopback is refused');
 const st=await repositoryServiceStatus(env);assert.equal(st.connected,true);assert.equal(st.counts.connectors,2);
 const hit=(await (await fetch(service.url+'/v1/search?q=circuit',{headers:{Authorization:'Bearer '+token}})).json()).results[0].revision;
 const payload={transport:'corpus',revisionId:hit.revisionId,connectorId:hit.connectorId,path:hit.path,ref:hit.commit,expectedHash:hit.fileSha256};
 const at='2026-09-25T12:00:00.000Z',result=await acquireRepositorySource(project,payload,env,'local-architect',at);
 const src=result.document.knowledge.sources.find(x=>x.id===result.selected);sourceId=src.id;
 assert.equal(src.origin,'repository-fetch');assert.equal(src.acquisition.transport,'akr-corpus');assert.equal(src.hash,hit.fileSha256);assert.equal(src.revision,C1);assert.equal(src.repository,AR);assert.equal(src.body,queueGuard);
 assert.equal(src.acquisition.corpus.storeId,baseStoreId);project=result.document;
 assert.equal((await acquireRepositorySource(project,payload,env,'local-architect',at)).selected,sourceId,'idempotent');
 await assert.rejects(acquireRepositorySource(project,{...payload,expectedHash:'f'.repeat(64)},env,'local-architect',at),/does not identify/);
 const lying=async()=>new Response(JSON.stringify({revisionId:hit.revisionId,connectorId:A,repository:AR,commit:C1,path:hit.path,fileSha256:hit.fileSha256,text:queueGuard+'tampered'}),{status:200});
 await assert.rejects(acquireRepositorySource({id:'other'},payload,env,'local-architect',at,{fetcher:lying}),/differs from the requested source hash/);
 await assert.rejects(acquireRepositorySource({id:'other'},{...payload,connectorId:'GH-JAVA-DESIGN-PATTERNS'},env,'local-architect',at),/registered public repository/);
 await assert.rejects(acquireRepositorySource({id:'other'},{...payload},{},'local-architect',at),/not configured/);
});

await check('candidate packet: accepted unchanged by the Site packet validator; locators carry exact knowledge.fetch commands',async()=>{
 const r=openReader(config);try{
  const q=p=>r.store.db.prepare('SELECT revision_id FROM revisions WHERE path=?').get(p).revision_id;
  const packet=candidatePacket(r,{tenantId:'local-architect',projectId:'kr-test',fromCursor:0,revisionIds:[q('docs/patterns/queue-guard.md'),q('docs/asciidoc/guide.adoc')]});
  const preview=prepareRepositoryPacket(project,packet,{tenantId:'local-architect',projectId:'kr-test'});
  assert.equal(preview.authority,'discovery-only');assert.equal(preview.activation.allowed,false);assert.equal(preview.locators.length,2);assert(preview.locators.every(l=>l.command?.type==='knowledge.fetch'));
  assert(packet.claims.every(c=>c.eligible===false&&c.statement.startsWith('Candidate')));assert(packet.claims.some(c=>c.edges.some(e=>e.label==='Circuit Breaker')));
  assert.throws(()=>candidatePacket(r,{tenantId:'local-architect',projectId:'kr-test',fromCursor:5,revisionIds:[q('docs/rst/guide.rst')]}),/ahead of this store/);
  assert.throws(()=>candidatePacket(r,{tenantId:'local-architect',projectId:'kr-test',revisionIds:[q('docs/corrupt/broken.md')]}),/not current/);
 }finally{r.close();}
});

await check('refresh after the baseline: successors, same-content commits, removals and withdrawals become contiguous notices',async()=>{
 const snapA2=await snapshot(A,AR,C2,filesA(true,false,true),'derive-claims-only');await corpus([snapA2,snapB]);
 const summary=await buildStore(config);assert.equal(summary.complete,true);assert.equal(summary.storeId,baseStoreId);
 const r=openReader(config);try{
  const notices=r.notices(0);assert.deepEqual(notices.map(n=>n.cursor),notices.map((_,i)=>i+1),'contiguous cursors');
  const of=p=>notices.filter(n=>n.path===p).map(n=>n.kind+':'+n.reason);
  assert.deepEqual(of('docs/patterns/queue-guard.md'),['revision:observed','invalidation:superseded']);
  assert.deepEqual(of('docs/patterns/bom-note.md'),['revision:observed'],'same bytes at a new commit is not an invalidation');
  assert.deepEqual(of('docs/asciidoc/guide.adoc'),['invalidation:source-unavailable']);
  assert.deepEqual(of('docs/patterns/new-page.md'),['revision:observed']);
  assert.deepEqual(of('docs/odd/plus+path.md'),[],'paths a project cannot hold emit no notices');
  assert.equal((await r.search({q:'stable service rate'})).results.every(x=>x.revision.commit===C2),true,'superseded passages leave search');
  const w=withdrawRevision(config,r.store.db.prepare("SELECT revision_id FROM revisions WHERE path='docs/rst/guide.rst' AND state='current'").get().revision_id,'Fixture licence decision');assert.equal(w.cursor,notices.length+1);
 }finally{r.close();}
 await buildStore(config);const r2=openReader(config);try{assert.equal(r2.store.db.prepare("SELECT state FROM revisions WHERE path='docs/rst/guide.rst' AND commit_sha=?").get(C2).state,'withdrawn','withdrawn revisions never recover');}finally{r2.close();}
});

await check('signed notices: verified by the Site with a notices-only key, applied to withdraw the invalidated project source',async()=>{
 const r=openReader(config);let update;try{update=signedNoticeUpdate(r,{tenantId:'local-architect',projectId:'kr-test',fromCursor:0},key);}finally{r.close();}
 assert.equal(update.release,null);assert(update.notices.length>=5);assert.equal(update.cursor,update.fromCursor+update.notices.length);
 const env={AIW_REPOSITORY_NOTICE_KEYS:JSON.stringify({[key.keyId]:key.publicKey})};
 const packetHash=await verifyRepositorySync(update,env,{tenantId:'local-architect',projectId:'kr-test'});
 await assert.rejects(verifyRepositorySync(update,{},{tenantId:'local-architect',projectId:'kr-test'}),/trusted public key/);
 const release={...update,release:{id:'KR-0001',checksum:'a'.repeat(64),claims:[{id:'KC-0001',hash:'b'.repeat(64)}],sources:[{id:'KS-0001',repository:AR,commit:C1,path:'docs/patterns/queue-guard.md',hash:'c'.repeat(64)}]},signature:undefined};
 const {signature:_,...payload}=release;const {sign}=await import('node:crypto');
 const forged={...payload,signature:{algorithm:'Ed25519',keyId:key.keyId,value:sign(null,Buffer.from(canonicalJSON(payload)),key.privateKey).toString('base64url')}};
 await assert.rejects(verifyRepositorySync(forged,env,{tenantId:'local-architect',projectId:'kr-test'}),/trusted public key/,'a notice key cannot sign a release receipt');
 const applied=applyRepositorySync(project,update,packetHash,'2026-09-25T13:00:00.000Z','local-architect');
 assert.deepEqual(applied.revoked,[sourceId]);const s=knowledgeState(applied.document);assert(s.withdrawals.some(w=>w.targetId===sourceId&&/superseded/.test(w.reason)));assert.equal(s.repositorySync.storeId,baseStoreId);
 const again=await (await fetch(service.url+'/v1/sync',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({tenantId:'local-architect',projectId:'kr-test',fromCursor:update.cursor,storeId:baseStoreId})})).json();
 assert.equal(again.fromCursor,update.cursor);
 assert.equal((await fetch(service.url+'/v1/sync',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({tenantId:'local-architect',projectId:'kr-test',fromCursor:0,storeId:'00000000-0000-0000-0000-000000000000'})})).status,409);
});
}finally{await service?.close();await rm(root,{recursive:true,force:true});}
console.log(JSON.stringify({status:'passed',checks:checks.length,seconds:Math.round((Date.now()-started)/1000),authority:'Synthetic corpus of original text; no acquired content, network or provider was used.',checksRun:checks},null,2));
