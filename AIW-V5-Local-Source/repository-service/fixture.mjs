// Synthetic acquisition corpus for verification: original text written for the tests, laid out exactly
// like the laptop's acquired snapshots (manifest, content-addressed objects, quarantine). It contains no
// acquired third-party content. Used by repository-service-validate.mjs and knowledge-repository-validate.mjs.
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadConfig} from './corpus.js';

export const hash=b=>createHash('sha256').update(b).digest('hex');
// Manifests record each file's git blob SHA-1, as GitHub's tree does.
export const gitBlob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
export const A='GH-MICROSOFT-ARCH-CENTER',AR='MicrosoftDocs/architecture-center',B='GH-AWESOME-SCALABILITY',BR='binhnguyennus/awesome-scalability';
export const C1='1111111111111111111111111111111111111111',C2='2222222222222222222222222222222222222222';
export const texts={
 queueGuard:['---','title: Guarding a work queue','description: synthetic fixture','---','# Guarding a work queue','','A queue protects a slow dependency when callers outpace it. Pair a Circuit Breaker','with Retry with Backoff so that transient faults are retried and persistent faults stop quickly.','','```sh','# not a heading inside a fence','retry --max 3','```','','## When to use','','Use it when producers are bursty and the consumer has a stable service rate.','A Transactional Outbox keeps the enqueue in the same commit as the business write.','','Setext heading','--------------','','Bulkhead pools keep one noisy tenant from exhausting every worker in the service.',''].join('\n'),
 bom:'﻿# Byte order mark note\r\n\r\nThis synthetic note keeps a byte order mark and CRLF endings to prove exact hashing.\r\nCache-Aside reads fall back to the store when an entry is missing.\r\n',
 large:'# Large synthetic page\n\n'+Array.from({length:900},(_,i)=>`Paragraph ${i}: capacity planning keeps a margin above the measured peak for rolling releases.`).join('\n\n')+'\n',
 adoc:'= Synthetic AsciiDoc guide\n\n== Deployment slots\n\nBlue and green slots let a release be checked before traffic moves across.\n',
 rst:'Synthetic RST guide\n===================\n\nReplicas\n--------\n\nThree replicas across two zones keep a majority when one zone is lost.\n',
 odd:'# Plus path\n\nThis file has a path that the project source contract does not accept.\n',
 scalability:'# Awesome synthetic list\n\nMETADATA-ONLY-SENTINEL text that must never be indexed because the dossier allows metadata only.\n'
};
texts.queueGuard2=texts.queueGuard.replace('stable service rate','stable service rate that can be measured');
const latin=Buffer.from([0x23,0x20,0x4c,0xe9,0x67,0x61,0x63,0x79,0x0a,0x54,0x65,0x78,0x74,0x20,0xff,0xfe,0x0a]);

export const filesA=({changed=false,withAdoc=true,extra=false}={})=>[
 {path:'docs/patterns/queue-guard.md',bytes:changed?texts.queueGuard2:texts.queueGuard,findings:[{severity:'info',code:'EMBEDDED_SCRIPT',detail:'fixture'}]},
 {path:'docs/patterns/bom-note.md',bytes:texts.bom},{path:'docs/guide/large.md',bytes:texts.large},
 ...(withAdoc?[{path:'docs/asciidoc/guide.adoc',bytes:texts.adoc}]:[]),{path:'docs/rst/guide.rst',bytes:texts.rst},
 {path:'docs/odd/plus+path.md',bytes:texts.odd},{path:'docs/legacy/latin.txt',bytes:latin},
 {path:'docs/corrupt/broken.md',bytes:'# Broken\n\nThis object is replaced on disk by different bytes.\n',corrupt:true},
 {path:'docs/data/config.json',bytes:'{"a":1}'},{path:'docs/images/diagram.png',bytes:'PNG',status:'accepted-opaque'},
 {path:'docs/secret/leak.md',bytes:'# Leak\n\nQUARANTINE-SENTINEL-TEXT must never be read or indexed.\n',status:'quarantined'},
 {path:'build/out.md',status:'policy-excluded'},{path:'docs/huge.md',status:'rejected'},
 ...(extra?[{path:'docs/patterns/new-page.md',bytes:'# Newly observed page\n\nA new synthetic page that appears in a later snapshot of the same repository.\n'}]:[])];

export async function createFixture(prefix='aiw-krs-'){
 const root=await mkdtemp(path.join(tmpdir(),prefix)),live=path.join(root,'github-live');
 async function snapshot(connectorId,repository,commit,files,usePolicy){
  const snapshotId='KSNAP-'+connectorId+'-'+commit.slice(0,12),dir=path.join(live,'snapshots',connectorId,snapshotId);await mkdir(dir,{recursive:true});
  const entries=[];
  for(const f of files){
   if(['policy-excluded','rejected'].includes(f.status)){entries.push({path:f.path,sha:'0'.repeat(40),sizeBytes:10,status:f.status,dispositionReason:'fixture'});continue;}
   const bytes=Buffer.isBuffer(f.bytes)?f.bytes:Buffer.from(f.bytes,'utf8'),h=hash(bytes),store=f.status==='quarantined'?'quarantine':'objects',rel=store+'/sha256/'+h.slice(0,2)+'/'+h;
   await mkdir(path.join(dir,store,'sha256',h.slice(0,2)),{recursive:true});await writeFile(path.join(dir,...rel.split('/')),f.corrupt?Buffer.from('tampered bytes'):bytes);
   entries.push({path:f.path,sha:gitBlob(bytes),sizeBytes:bytes.length,mediaType:'text/markdown',sourceFormat:f.path.split('.').at(-1),parserRequired:'fixture',status:f.status||'accepted',findings:f.findings||[],contentSha256:'sha256:'+h,...(store==='objects'?{contentAddressedObject:rel}:{}),securityDisposition:'fixture',claimCandidateCount:0,sectionCount:0,boundedEvidenceCount:0,parserStatus:'parsed'});
  }
  const manifest={schemaVersion:'aiw-github-acquisition-v4',connectorId,repository,branch:'main',commitSha:commit,snapshotId,acquiredAt:'2026-07-15T10:00:00.000Z',repositoryMetadata:{htmlUrl:'https://github.com/'+repository},api:{contentTransport:'raw-immutable'},tree:{totalBlobs:entries.length},policy:{allowedPaths:['docs/**']},
   licenceEvidence:{repositoryApi:{spdxId:'CC-BY-4.0',name:'Creative Commons Attribution 4.0',path:'LICENSE'},dossierReviewStatus:'requires-review',dossierUsePolicy:usePolicy,finalDisposition:'requires-human-licence-review'},
   files:entries,snapshotChecksum:'sha256:'+hash(connectorId+commit),architectureArtefacts:[{note:'skipped "quoted" {braces} [brackets] \\ é✓'}],crossFileArchitectureGroups:[],coverage:{acceptedFiles:entries.length},candidateClaims:{total:0,authority:'candidate'},
   tricky:'a "quoted" value with {braces}, [brackets], a backslash \\ and é✓',count:3,flag:true,nothing:null,manifestSha256:'sha256:'+hash('manifest'+connectorId+commit)};
  await writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1));
  return {connectorId,repository,immutableCommit:commit,snapshotId,manifestPath:'knowledge-repository/AKR-0.10.73.7/github-live/snapshots/'+connectorId+'/'+snapshotId+'/manifest.json',manifestChecksum:manifest.manifestSha256,snapshotChecksum:manifest.snapshotChecksum,manifest};
 }
 const select=snaps=>writeFile(path.join(root,'index.json'),JSON.stringify({schemaVersion:'aiw-content-snapshot-manifest-index-v1',releaseId:'FIXTURE',productionAccepted:false,knowledgeAuthority:'candidate',manifests:snaps.map(({manifest,...m})=>m)}));
 const catalogue={generatedAt:'2026-07-13T00:00:00Z',connectors:[
  {id:A,name:'Microsoft Architecture Center',owner:'Microsoft',repository:AR,lifecycleStatus:'approved',trustTier:1,categories:['reference'],contentUses:['claim-evidence'],allowedPaths:['docs/**'],deniedPaths:[],maxFileBytes:750000,license:{reviewStatus:'requires-review',usePolicy:'derive-claims-only',note:'Fixture licence note.'}},
  {id:B,name:'Awesome Scalability',owner:'binhnguyennus',repository:BR,lifecycleStatus:'discovery-only',trustTier:2,license:{reviewStatus:'requires-review',usePolicy:'metadata-only',note:'Metadata only.'}}]};
 await writeFile(path.join(root,'catalogue.json'),JSON.stringify(catalogue));
 await writeFile(path.join(root,'SHA256SUMS'),hash(await readFile(path.join(root,'catalogue.json')))+'  catalogue.json\n');
 await writeFile(path.join(root,'config.json'),JSON.stringify({snapshotRoot:'github-live',manifestIndex:'index.json',catalogue:'catalogue.json',catalogueSums:'SHA256SUMS',store:'store/akr.sqlite',secrets:'secrets',port:0}));
 const config=await loadConfig(path.join(root,'config.json'));
 const snapA1=await snapshot(A,AR,C1,filesA(),'derive-claims-only'),snapB=await snapshot(B,BR,C1,[{path:'README.md',bytes:texts.scalability}],'metadata-only');
 await select([snapA1,snapB]);
 return {root,live,config,snapshot,select,snapA1,snapB};
}
