// Live documentation acquisition against a loopback fake of GitHub: an approved connector's branch
// moves to a new commit; unchanged files are reused by git blob hash, changed and new ones downloaded and
// checked against the tree, credential-shaped files quarantined without their bytes, policy and size
// limits applied; the overlay points the connector at the new snapshot and a refresh build turns the
// change into notices. Truncated trees, redirects and tampered bytes fail closed; the original
// acquisition root is never written. Run: npm run test:repository-acquire
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,readdir,stat,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {createFixture,texts,A,AR,B,C1} from './repository-service/fixture.mjs';
import {buildStore} from './repository-service/build.js';
import {openReader} from './repository-service/reader.js';
import {acquireConnector,acquireAll,globMatcher} from './repository-service/acquire.js';
import {sha256 as siteSha256} from './public/brain-integrity.js';

const checks=[],started=Date.now();
async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
const C3='3333333333333333333333333333333333333333';
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const key='-----BEGIN RSA '+'PRIVATE KEY-----\nMIIEfixturefixturefixture\n-----END RSA '+'PRIVATE KEY-----\n';
// The repository at the new commit: one file changed, one unchanged, one new, one removed (the AsciiDoc guide),
// one credential-shaped, one outside the allowed paths, one too large to fetch.
const files={'docs/patterns/queue-guard.md':texts.queueGuard.replace('stable service rate','stable, measured service rate'),'docs/patterns/bom-note.md':texts.bom,'docs/guide/large.md':texts.large,'docs/rst/guide.rst':texts.rst,
 'docs/patterns/new-page.md':'# A page added upstream\n\nIdempotency keys let a consumer drop a repeated delivery without repeating its effect.\n','docs/secrets/setup.md':'# Setup\n\n'+key,'build/generated.md':'# Generated\n\nBuild output outside the allowed paths.\n'};
const bytes=Object.fromEntries(Object.entries(files).map(([p,t])=>[p,Buffer.from(t,'utf8')]));
let mode='ok',requests=[];
const github=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://x');requests.push(url.pathname);
 if(mode==='redirect'){res.writeHead(302,{Location:'https://example.com/'});return res.end();}
 if(url.pathname===`/repos/${AR}/commits/main`){res.writeHead(200,{'Content-Type':'text/plain'});return res.end(C3);}
 if(url.pathname===`/repos/${AR}/git/trees/${C3}`){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({sha:C3,truncated:mode==='truncated',tree:[...Object.entries(bytes).map(([p,b])=>({path:p,type:'blob',sha:blob(b),size:b.length})),{path:'docs/huge.md',type:'blob',sha:'a'.repeat(40),size:5_000_000},{path:'docs',type:'tree',sha:'b'.repeat(40)},{path:'docs/../escape.md',type:'blob',sha:'c'.repeat(40),size:10}]}));}
 const raw=url.pathname.startsWith(`/${AR}/${C3}/`)?decodeURIComponent(url.pathname.slice(`/${AR}/${C3}/`.length)):null;
 if(raw&&bytes[raw]){res.writeHead(200);return res.end(mode==='tamper'&&raw==='docs/patterns/new-page.md'?Buffer.from('# Tampered\n'):bytes[raw]);}
 res.writeHead(404);res.end('not found');
});
await new Promise(r=>github.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+github.address().port,bases={api:base,raw:base};
const {root,live,config}=await createFixture('aiw-kracq-');
await buildStore(config);
const listing=async dir=>{const out=[];for(const e of await readdir(dir,{withFileTypes:true,recursive:true}))if(e.isFile())out.push(path.join(e.parentPath||e.path,e.name)+':'+(await stat(path.join(e.parentPath||e.path,e.name))).size);return out.sort();};
const before=await listing(live);
try{
await check('path policy: allowed globs admit, denied globs win',async()=>{
 const allowed=globMatcher(['docs/**','calm/**/*.md']),denied=globMatcher(['**/node_modules/**','docs/private/**']);
 assert(allowed('docs/a.md')&&allowed('docs/x/y.md')&&allowed('calm/a/b.md')&&!allowed('calm/a/b.txt')&&!allowed('build/a.md'));
 assert(denied('docs/node_modules/x.md')&&denied('node_modules/x.md')&&denied('docs/private/a.md')&&!denied('docs/a.md'));
});

await check('dry run: the moved branch is resolved and the refresh planned without writing anything',async()=>{
 const plan=await acquireConnector(config,A,{bases,dryRun:true});
 assert.equal(plan.status,'planned');assert.equal(plan.commit,C3);assert.equal(plan.from,C1);
 assert.equal(plan.reused,3,'unchanged files are reused by git blob hash');assert.equal(plan.downloads,3);assert.equal(plan.excluded,1);assert.equal(plan.rejected,1);
 assert(!existsSync(config.overlay));assert(!existsSync(config.acquiredRoot));
});

await check('fails closed: a truncated tree, a redirect and bytes that do not match the tree write nothing',async()=>{
 for(const m of ['truncated','redirect','tamper']){mode=m;await assert.rejects(acquireConnector(config,A,{bases}),m==='truncated'?/truncated/:m==='redirect'?/redirect|fetch failed/i:/blob hash/);}
 mode='ok';assert(!existsSync(config.overlay));
 assert.equal((await acquireConnector(config,B,{bases})).status,'skipped','discovery-only connectors are never acquired');
});

await check('acquisition: changed and new files downloaded and verified, unchanged reused, credentials quarantined without bytes',async()=>{
 requests=[];const r=await acquireConnector(config,A,{bases});
 assert.equal(r.status,'acquired');assert.equal(r.accepted,5);assert.equal(r.quarantined,1);
 assert(!requests.some(p=>p.endsWith('bom-note.md')||p.endsWith('large.md')||p.endsWith('guide.rst')),'unchanged files are not downloaded again');
 const manifest=JSON.parse(await readFile(path.join(config.acquiredRoot,'snapshots',A,'KSNAP-'+A+'-'+C3.slice(0,12),'manifest.json'),'utf8'));
 const q=manifest.files.find(f=>f.path==='docs/secrets/setup.md');assert.equal(q.status,'quarantined');assert.equal(q.findings[0].code,'PRIVATE_KEY_MATERIAL');assert.equal(q.contentAddressedObject,undefined,'quarantined bytes are not kept');
 assert.equal(manifest.files.find(f=>f.path==='build/generated.md').status,'policy-excluded');assert.equal(manifest.files.find(f=>f.path==='docs/huge.md').status,'rejected');
 assert(!manifest.files.some(f=>f.path.includes('..')));assert.match(manifest.licenceEvidence.note,/not reviewed again/);
 const overlay=JSON.parse(await readFile(config.overlay,'utf8'));assert.equal(overlay.snapshots[0].immutableCommit,C3);assert.equal(overlay.snapshots[0].manifestChecksum,manifest.manifestSha256);
 assert.equal((await acquireConnector(config,A,{bases})).status,'unchanged','a second run finds nothing new');
 assert.deepEqual(await listing(live),before,'the original acquisition root is never written');
});

await check('refresh: the new snapshot becomes successor revisions and notices; exact originals come from the new snapshot',async()=>{
 const summary=await buildStore(config);assert.equal(summary.complete,true);
 const r=openReader(config);try{
  const n=r.notices(0),of=p=>n.filter(x=>x.path===p).map(x=>x.kind+':'+x.reason);
  assert.deepEqual(of('docs/patterns/queue-guard.md'),['revision:observed','invalidation:superseded']);
  assert.deepEqual(of('docs/patterns/bom-note.md'),['revision:observed']);assert.deepEqual(of('docs/patterns/new-page.md'),['revision:observed']);
  assert.deepEqual(of('docs/asciidoc/guide.adoc'),['invalidation:source-unavailable'],'a file removed upstream is withdrawn from use');
  assert.equal((await r.search({q:'QUARANTINE-SENTINEL-TEXT PRIVATE KEY'})).total,0);
  const hit=(await r.search({q:'idempotency keys'})).results[0];assert.equal(hit.revision.commit,C3);
  const o=await r.original(hit.revision.revisionId);assert.equal(o.status,200);assert.equal(siteSha256(o.body.text),o.body.fileSha256);
 }finally{r.close();}
 const all=await acquireAll(config,{bases});assert(all.every(x=>['unchanged','skipped','failed'].includes(x.status)));
});
}finally{github.close();await rm(root,{recursive:true,force:true});}
console.log(JSON.stringify({status:'passed',checks:checks.length,seconds:Math.round((Date.now()-started)/1000),authority:'Loopback fake of the GitHub API and raw content; no network was used.',checksRun:checks},null,2));
