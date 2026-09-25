// The Site with the laptop knowledge repository connected: discovery routes, exact-original retrieval
// through /api/commands, interpretation of a repository passage, automatic signed revocations on
// project read, the explicit sync route and the Sources rendering — through the real Worker, SQLite
// and storage path, against the synthetic fixture corpus. Run: npm run test:knowledge-repository
import assert from 'node:assert/strict';
import {rm} from 'node:fs/promises';
import {generateKeyPairSync,createHash} from 'node:crypto';
import {createFixture,texts,filesA,A,AR,B,C2} from './repository-service/fixture.mjs';
import {buildStore} from './repository-service/build.js';
import {startService} from './repository-service/server.js';
import {keyInfo} from './repository-service/sync.js';
import {localDatabase} from './local-db.js';
import {knowledgeState,knowledgeEligibility} from './public/knowledge-governance.js';

const checks=[],started=Date.now();
async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
const {root,config,snapshot,select,snapB}=await createFixture('aiw-krsite-');
await buildStore(config);
const token=createHash('sha256').update('site-fixture').digest('hex'),pair=generateKeyPairSync('ed25519'),key={...keyInfo(pair.privateKey),privateKey:pair.privateKey};
const service=await startService(config,{token,key,port:0});
const files=new Map(),FILES={async put(k,v){files.set(k,typeof v==='string'?v:new TextDecoder().decode(v));},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null;},async delete(k){files.delete(k);}};
const env={DB:localDatabase(':memory:'),FILES,ASSETS:{fetch:()=>new Response('')},AIW_KNOWLEDGE_REPOSITORY_URL:service.url,AIW_KNOWLEDGE_REPOSITORY_TOKEN:token,AIW_REPOSITORY_NOTICE_KEYS:JSON.stringify({[key.keyId]:key.publicKey}),AIW_REPOSITORY_SYNC_INTERVAL_MS:'0'};
const {default:worker}=await import('./worker.js');
const origin='https://aiw.test';
async function api(path,{method='GET',body,status=200,environment=env,headers={}}={}){
 const res=await worker.fetch(new Request(origin+path,{method,headers:{'oai-authenticated-user-id':'local-architect',...(method!=='GET'?{Origin:origin}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})}),environment);
 const data=await res.json();assert.equal(res.status,status,JSON.stringify(data));return data;
}
const command=async(cmd,status=200)=>{const {revision}=await api('/api/project');return api('/api/commands',{method:'POST',body:{revision,command:cmd},status});};
let hit,sourceId;
try{
await check('discovery routes: status, ranked search and verified passages; never offered for unregistered or metadata-only files',async()=>{
 await api('/api/project');// opening the default project creates it
 const st=await api('/api/knowledge/corpus?view=status');assert.equal(st.connected,true);assert.equal(st.counts.documents,9);assert.equal(st.authority,'discovery-only');assert.equal(st.productionAccepted,false);
 const off=await api('/api/knowledge/corpus?view=status',{environment:{...env,AIW_KNOWLEDGE_REPOSITORY_URL:''}});assert.equal(off.connected,false);assert.match(off.reason,/not configured/);
 assert.match((await api('/api/knowledge/corpus?view=search&q=circuit',{environment:{...env,AIW_KNOWLEDGE_REPOSITORY_URL:'http://127.0.0.1:9'},status:409})).error,/not running/);
 const res=await api('/api/knowledge/corpus?view=search&q='+encodeURIComponent('circuit breaker'));hit=res.results[0];
 assert.equal(hit.revision.path,'docs/patterns/queue-guard.md');assert.equal(hit.revision.command.type,'knowledge.fetch');assert.equal(hit.revision.command.payload.transport,'corpus');assert.equal(hit.revision.licence.clearance,'not-reviewed');
 assert.deepEqual(Object.keys(hit.revision).sort(),['bytes','command','commit','connector','connectorId','fileSha256','findings','licence','path','repository','retrieval','revisionId','savedSourceId','title'].sort(),'only whitelisted fields reach the browser');
 const meta=await api('/api/knowledge/corpus?view=search&q=awesome');assert(meta.files.some(f=>f.connectorId===B&&f.command===null&&f.retrieval.retrievable===false));
 const p=await api('/api/knowledge/corpus?view=passage&id='+hit.passageId);assert.equal(p.passage.verified,true);assert(p.passage.excerpt.includes('Circuit Breaker'));
 await api('/api/knowledge/corpus?view=passage&id=../../x',{status:400});await api('/api/knowledge/corpus?view=nope',{status:400});
});

await check('retrieval and interpretation: the exact original through /api/commands, then a claim on the same line range',async()=>{
 const saved=await command(hit.revision.command);sourceId=saved.selected;
 const s=knowledgeState((await api('/api/project')).document),src=s.sources.find(x=>x.id===sourceId);
 assert.equal(src.origin,'repository-fetch');assert.equal(src.acquisition.transport,'akr-corpus');assert.equal(src.body,texts.queueGuard);assert.equal(src.repository,AR);
 const again=await api('/api/knowledge/corpus?view=search&q='+encodeURIComponent('circuit breaker'));assert.equal(again.results[0].revision.savedSourceId,sourceId);assert.equal(again.results[0].revision.command,null);
 const claim=await command({type:'knowledge.claim',payload:{sourceId,lineStart:hit.lineStart,lineEnd:hit.lineEnd,subjectId:'PAT-CIRCUIT-BREAKER',predicate:'pairs-with',statement:'Pair a circuit breaker with bounded retries for transient faults.',claimType:'applicability',polarity:'supports',conditions:'Transient and persistent faults can be told apart',limitations:'Not a substitute for capacity'}});
 const c=knowledgeState((await api('/api/project')).document).claims.find(x=>x.id===claim.selected);assert.equal(c.excerpt,hit.excerpt);assert.equal(knowledgeEligibility((await api('/api/project')).document,c).eligible,false,'unreviewed claims are never eligible');
 await command({...hit.revision.command,payload:{...hit.revision.command.payload,connectorId:'GH-JAVA-DESIGN-PATTERNS'}},400);
});

await check('automatic revocation: a changed original becomes a signed invalidation, verified and applied when the project is read',async()=>{
 const snapA2=await snapshot(A,AR,C2,filesA({changed:true}),'derive-claims-only');await select([snapA2,snapB]);await buildStore(config);
 const doc=(await api('/api/project')).document,s=knowledgeState(doc);
 assert(s.withdrawals.some(w=>w.targetId===sourceId&&/superseded/.test(w.reason)),'the superseded original is withdrawn');assert(s.repositorySync.storeId);assert(s.repositorySync.cursor>0);
 assert(s.history.some(h=>h.type==='knowledge.repository-sync'&&h.actor==='repository-service'));
 const sync=await api('/api/knowledge/corpus?view=sync',{method:'POST'});assert.equal(sync.status,'current');
 await api('/api/knowledge/corpus?view=sync',{method:'POST',headers:{Origin:'https://evil.example'},status:403});
 const untrusted=await api('/api/knowledge/corpus?view=sync',{method:'POST',environment:{...env,AIW_REPOSITORY_NOTICE_KEYS:''}});assert.equal(untrusted.status,'no-trusted-key');
});

await check('Sources rendering: the connected repository surface, its receipts and actions; offline locators folded away',async()=>{
 globalThis.location={origin,search:''};
 // The browser's same-origin calls reach the Worker; the Worker's own calls still reach the service.
 const realFetch=globalThis.fetch;globalThis.fetch=(url,init={})=>{const u=new URL(url,origin);return u.origin===origin?worker.fetch(new Request(u,{...init,headers:{'oai-authenticated-user-id':'local-architect',...(init.headers||{})}}),env):realFetch(url,init);};
 const ui=await import('./public/repository-corpus-ui.js'),{renderKnowledgeSources}=await import('./public/knowledge-sources-ui.js');
 const p=(await api('/api/project')).document;ui.resetCorpus(p.id);
 let html=renderKnowledgeSources(p);assert.match(html,/Checking the knowledge repository/);assert.match(html,/Laptop repository pilot/,'unconnected: bundled locators stay in view');
 await ui.loadCorpusStatus(()=>{});await ui.searchCorpus(()=>{},{query:'bulkhead'});
 html=renderKnowledgeSources(p);assert.match(html,/Search the acquired architecture corpus/);assert.match(html,/unreviewed passage/);assert.match(html,/detected, not cleared/);
 assert.match(html,/<details class="kw-offline"><summary>Bundled locators and packet preview/);assert.match(html,/contains embedded script; read it as untrusted text/);
 const r=ui.corpusState().results.results[0];assert.equal(ui.corpusRevision(r.revision.revisionId).revisionId,r.revision.revisionId);
 await ui.readCorpusPassage(()=>{},r.passageId);html=renderKnowledgeSources(p);assert.match(html,/Unreviewed repository text · not evidence until interpreted and reviewed/);assert.match(html,/Excerpt SHA-256/);
});
}finally{await service.close();env.DB.close();await rm(root,{recursive:true,force:true});}
console.log(JSON.stringify({status:'passed',checks:checks.length,seconds:Math.round((Date.now()-started)/1000),authority:'Synthetic fixture corpus; Worker, SQLite and storage paths in-process; no network or provider.',checksRun:checks},null,2));
