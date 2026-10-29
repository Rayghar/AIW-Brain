import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createProject} from './shared/projects-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {withFinalReview,exportSDD} from './public/review-domain.js';
import {applyKnowledgeCommand,knowledgeState,knowledgeStamp,releasedClaims,claimReceipt,claimReceiptCurrent,knowledgeImpactStamp,knowledgeFindings} from './public/knowledge-governance.js';
import {BRAIN_CATALOGUE} from './public/brain-catalogue.js'; // read directly: knowledge-governance no longer re-exports it (round 2, I2-20)
import {CATALOGUE} from './public/catalogue-index.js';
import {brainSourceCurrent,tradeoffSource,methodSources} from './public/architecture-brain.js';
import {BRAIN_TRADEOFFS} from './public/brain-tradeoffs.js';
import {catalogue,catalogueLoaded} from './public/catalogue-store.js';
import {brainContext,generationCurrent} from './public/aiw-brain.js';
import {architectureBrain,brainSources} from './public/architecture-brain.js';
import {intelligencePacket,adoptIntelligence} from './public/intelligence-context.js';
import {digest,sha256} from './public/brain-integrity.js';
import {acquireRepositorySource} from './knowledge-service.js';
import {embedTexts,semanticKnowledge,prepareBrainPacket} from './brain-retrieval.js';
import {localDatabase} from './local-db.js';
import worker from './worker.js';
const at='2026-09-20T21:00:00.000Z',review={reviewed:true,reviewer:'Synthetic acceptance reviewer',reason:'Synthetic test of conditions and source trace; not a real knowledge approval.'};
export function brainFixture(){let p=createProject({name:'Workshop equipment',template:'blank',brief:'Reserve equipment safely.'},'brain-integration-fixture');p=applyCommand(p,{type:'artefact',payload:{type:'requirement',title:'Read equipment descriptions',description:'Repeated catalogue reads may use an older equipment description for up to thirty seconds. Reservation writes require current authoritative state.',acceptance:'A stale description must never authorise a conflicting reservation.',owner:'Facilities',source:'Synthetic workshop',confirmed:true}},at).document;return withFinalReview(p);}
let p=brainFixture();
const command=(type,payload={})=>{const r=applyKnowledgeCommand(p,{type:'knowledge.'+type,payload},at,type==='review'?'synthetic-reviewer':'synthetic-actor');p=r.document;return r.selected;};
for(const value of ['', 'abc','🌲\n'.repeat(500)])assert.equal(sha256(value),createHash('sha256').update(value).digest('hex'));
assert.equal(BRAIN_CATALOGUE.records.length,328);assert.equal(BRAIN_CATALOGUE.repositories.length,30);
// The trade-off pack (round 6, Contract K) stands beside the catalogue, never inside it: the 328 records and their hashes are
// untouched; its 15 passages and 11 figures carry their own hashes, are current by their own receipt and withdrawn by their own id.
assert.equal(BRAIN_TRADEOFFS.id,'AIW-TRADEOFFS-1');assert.equal(BRAIN_TRADEOFFS.passages.length,15);assert.equal(BRAIN_TRADEOFFS.figures.length,11);assert.ok(BRAIN_TRADEOFFS.passages.every(m=>m.sha256===sha256(m.text))&&BRAIN_TRADEOFFS.figures.every(f=>f.sha256===sha256(f.text)));
{const s=tradeoffSource(BRAIN_TRADEOFFS.passages[0]);assert.equal(brainSourceCurrent(p,s),true);assert.equal(brainSourceCurrent(p,{...s,receipt:{...s.receipt,packHash:'other'}}),false);assert.ok(methodSources(p).some(x=>x.receipt.packId===BRAIN_TRADEOFFS.id)&&methodSources(p).some(x=>x.receipt.packId==='AIW-PLAYBOOK-2'),'one method-source shape carries both packs');assert.ok(!BRAIN_CATALOGUE.records.some(r=>/^TO-|^LN-/.test(r.id)),'no trade-off is a catalogue record');}
// The lazily loaded store holds the same catalogue under Node, and the index that receipts and passage suggestions read
// carries the same release, source hash and, per record, id, name, aliases and hash (round 2, I2-20).
assert.equal(catalogueLoaded(),true);assert.equal(catalogue(),BRAIN_CATALOGUE);
assert.deepEqual([CATALOGUE.releaseId,CATALOGUE.sourceSha256],[BRAIN_CATALOGUE.releaseId,BRAIN_CATALOGUE.sourceSha256]);
assert.deepEqual(CATALOGUE.records.map((r,i)=>[r.id,r.name,Buffer.from(CATALOGUE.recordHashes.slice(i*43,i*43+43),'base64url').toString('hex')]),BRAIN_CATALOGUE.records.map(r=>[r.id,r.name,r.recordSha256]));
assert.ok(BRAIN_CATALOGUE.records.every((r,i)=>new Set((r.aliases||[]).filter(a=>a&&a.toLowerCase()!==r.name.toLowerCase())).size===new Set(CATALOGUE.records[i].aliases).size),'the index keeps every alias a passage can name');
// A catalogue receipt is judged from the index exactly as the full catalogue judged it: current, wrong or upper-case
// hash, missing hash, other release, other source, unknown record (round 2, I2-20).
{const full=r=>r.receipt.releaseId===BRAIN_CATALOGUE.releaseId&&r.receipt.sourceHash===BRAIN_CATALOGUE.sourceSha256&&BRAIN_CATALOGUE.records.some(x=>x.id===r.objectId&&x.recordSha256===r.receipt.recordHash),mk=(id,h,rel=BRAIN_CATALOGUE.releaseId,src=BRAIN_CATALOGUE.sourceSha256)=>({kind:'catalogue-description',objectId:id,receipt:{releaseId:rel,sourceHash:src,recordHash:h}});
 let cases=0;for(const r of BRAIN_CATALOGUE.records)for(const x of [mk(r.id,r.recordSha256),mk(r.id,r.recordSha256.toUpperCase()),mk(r.id,'0'.repeat(64)),mk(r.id,undefined),mk(r.id,r.recordSha256,'other'),mk(r.id,r.recordSha256,BRAIN_CATALOGUE.releaseId,'other'),mk('NOT-A-RECORD',r.recordSha256)]){cases++;assert.equal(brainSourceCurrent({},x),full(x),x.objectId+' '+x.receipt.recordHash);}
 assert.equal(cases,BRAIN_CATALOGUE.records.length*7);}
const source=command('source',{title:'Synthetic cache reference',body:'Cache copy\nA cached description may lag its authority when the use tolerates bounded staleness.\nNever use a stale description to authorise a conflicting reservation.\n',path:'synthetic/cache.md',revision:'fixture-1'});
assert(p.knowledge.sources[0].body.endsWith('\n'),'Original source whitespace retained');
const claim=command('claim',{sourceId:source,lineStart:2,lineEnd:2,subjectId:'PAT-CACHE-ASIDE',claimType:'applicability',predicate:'permits cached descriptions',polarity:'supports',statement:'Bounded older descriptions may serve repeated equipment catalogue reads.',conditions:['Read tolerates a bounded older description.','Writes use authoritative state.'],limitations:['Does not establish transactional correctness.'],tags:['cache','equipment','catalogue']});
assert.equal(releasedClaims(p).length,0);
assert.throws(()=>command('release',{...review,title:'Unreviewed',claimIds:[claim]}),/explicit source/);
command('review',{...review,id:claim,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true});
const release=command('release',{...review,title:'Synthetic release 1',claimIds:[claim]});
assert.equal(releasedClaims(p).length,0,'Publication does not activate');
assert.throws(()=>command('activate',{...review,id:release,stamp:'stale'}),/changed/);
command('activate',{...review,id:release,stamp:knowledgeStamp(p)});
let hit=releasedClaims(p)[0];assert(hit.eligible);const receipt=claimReceipt(p,hit.claim,hit.release);assert(claimReceiptCurrent(p,receipt));
let c=brainContext(p,{id:'REQ-001',chapter:1});assert(c.governed.claims.some(h=>h.claim.id===claim));
const brain=architectureBrain(p,c,{query:'Should equipment catalogue reads use cache-aside?'});assert(brain.graph.edges.every(e=>brain.graph.nodes.some(n=>n.id===e.from)&&brain.graph.nodes.some(n=>n.id===e.to)));assert(brainSources(p,brain).some(s=>s.receipt?.claimId===claim));
const packet=intelligencePacket(p,{chapter:1,objectId:'REQ-001',mode:'mind',prompt:'Examine cache-aside for equipment catalogue reads.'});assert(packet.sources.some(s=>s.kind==='governed-claim'));assert.equal(packet.canDesign,false,'A pattern question cannot become generic boundary mutation');assert(packet.brainReceipt.claimIds.includes(claim));
const run={id:'synthetic-run',provider:'Synthetic provider',model:'mock',status:'completed',updatedAt:at,packet,result:{title:'Equipment cache reasoning',passage:'A bounded read copy remains conditional on tolerance for older descriptions.',sourceRefs:['S1',packet.sources.find(s=>s.kind==='governed-claim').ref],assumptions:[],questions:[],options:[]}};
p=adoptIntelligence(p,{kind:'passage'},run,at).document;const note=p.coauthoring.narratives.at(-1);assert(generationCurrent(p,note.generation));
const snapshot=JSON.stringify(p.knowledge.releases[0]);
const contradictionClaim=command('claim',{sourceId:source,lineStart:3,lineEnd:3,subjectId:'PAT-CACHE-ASIDE',claimType:'risk',predicate:'permits cached descriptions',polarity:'prohibits',statement:'A stale description must not authorise a conflicting write.',conditions:['Authorising writes.'],limitations:['A different context from descriptive reads.']});
assert(releasedClaims(p)[0].eligible,'An unreviewed candidate cannot revoke active knowledge');
assert.throws(()=>command('review',{...review,id:contradictionClaim,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true}),/contradiction/);
const conflict=p.knowledge.contradictions[0];command('contradiction',{...review,id:conflict.id,status:'context-separated',distinguishingContexts:'Read display tolerates bounded age; reservation authorisation requires current state.'});
command('review',{...review,id:contradictionClaim,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true});
const successor=command('release',{...review,title:'Synthetic successor',supersedes:release,claimIds:[claim,contradictionClaim]});assert.deepEqual(p.knowledge.pins,[release]);
command('link',{...review,objectId:'REQ-001',claimId:claim,releaseId:release});
const staleImpact=knowledgeImpactStamp(p,source);command('source',{title:'Unrelated synthetic source',body:'Unrelated source text.',path:'other.md',revision:'1'});
assert.throws(()=>command('withdraw',{...review,id:source,stamp:staleImpact}),/changed/);
command('withdraw',{...review,id:source,stamp:knowledgeImpactStamp(p,source)});
assert(!releasedClaims(p)[0].eligible);assert(!claimReceiptCurrent(p,receipt));assert(!generationCurrent(p,note.generation));assert.throws(()=>adoptIntelligence(p,{kind:'passage'},run,at),/changed/);assert.equal(knowledgeFindings(p).length,1);assert(exportSDD(p).includes('Support changed; review required'));assert.equal(JSON.stringify(p.knowledge.releases[0]),snapshot,'Historical released content immutable');
assert.throws(()=>command('activate',{...review,id:successor,stamp:knowledgeStamp(p)}),/withdrawn/);
const tampered=structuredClone(p);tampered.knowledge.sources[0].body+='Changed';assert(releasedClaims(tampered).every(h=>!h.eligible));

const urls=[],repository=await acquireRepositorySource(brainFixture(),{connectorId:'GH-MICROSOFT-ARCH-CENTER',ref:'main',path:'docs/patterns/cache-aside.md'}, {},'synthetic-actor',at,{fetcher:async url=>{urls.push(url);return url.includes('api.github.com')?new Response('a'.repeat(40)):new Response('Original bytes\n');}});
assert(urls[1].includes('/'+'a'.repeat(40)+'/'));assert.equal(repository.document.knowledge.sources[0].body,'Original bytes\n');assert.equal(repository.document.knowledge.claims.length,0);assert(repository.document.knowledge.sources[0].acquisition.hash);
await assert.rejects(()=>acquireRepositorySource(p,{connectorId:'GH-MICROSOFT-ARCH-CENTER',path:'../secrets.md'}, {},'test',at),/path/);
await assert.rejects(()=>acquireRepositorySource(p,{connectorId:'GH-MICROSOFT-ARCH-CENTER',path:'file.md',expectedHash:'wrong'}, {},'test',at),/valid SHA-256/);
await assert.rejects(()=>acquireRepositorySource(p,{connectorId:'GH-MICROSOFT-ARCH-CENTER',path:'file.md',expectedHash:'f'.repeat(64)}, {},'test',at,{fetcher:async url=>url.includes('api.github.com')?new Response('a'.repeat(40)):new Response('original')}),/differs/);

const files=new Map(),env={DB:localDatabase(':memory:'),OPENAI_API_KEY:'synthetic-only',FILES:{async get(k){return files.has(k)?{text:async()=>files.get(k)}:null;},async put(k,v){files.set(k,v);},async delete(k){files.delete(k);}},ASSETS:{fetch:()=>new Response('asset')}};
let embedCalls=0;const fetcher=async(url,init)=>{assert.equal(url,'https://api.openai.com/v1/embeddings');const b=JSON.parse(init.body);assert.equal(b.dimensions,256);embedCalls++;return Response.json({model:b.model,usage:{total_tokens:b.input.length},data:b.input.map((t,i)=>({index:i,embedding:Array.from({length:256},(_,n)=>n===0?1:(n===1?t.length%17/17:0))}))});};
assert.equal((await embedTexts(env,['test'],{fetcher})).vectors[0].length,256);
await assert.rejects(()=>embedTexts(env,['test'],{fetcher:async()=>Response.json({model:'text-embedding-3-small',data:[{index:0,embedding:[1]}]})}),/dimensions/);
const semantic=await semanticKnowledge(env,'tenant-a',p,'equipment caching',{fetcher});assert.equal(semantic.receipt.mode,'graph + lexical + semantic');assert(!semantic.sources.some(x=>x.kind==='governed-claim'),'Withdrawn claims excluded before vector ranking');const calls=embedCalls;await semanticKnowledge(env,'tenant-a',p,'equipment caching',{fetcher});assert.equal(embedCalls,calls+1,'Only the new query is embedded after index reuse');
{const indexKeys=[...files.keys()].filter(k=>k.startsWith('brain-index/'));assert.deepEqual(indexKeys,['brain-index/tenant-a/'+encodeURIComponent(p.id)+'/index.json'],'One index object per project (round 2, B2-04)');const saved=files.get(indexKeys[0]);files.set(indexKeys[0],JSON.stringify({...JSON.parse(saved),scope:'an-earlier-scope'}));const again=embedCalls;await semanticKnowledge(env,'tenant-a',p,'equipment caching',{fetcher});assert(embedCalls>again+1,'An index saved for another scope is rebuilt, never reused');assert.equal(JSON.parse(files.get(indexKeys[0])).scope,JSON.parse(saved).scope,'and the rebuilt index replaces it under the same key');assert.equal([...files.keys()].filter(k=>k.startsWith('brain-index/')).length,1);}
const request={chapter:1,objectId:'REQ-001',mode:'mind',prompt:'Explain equipment cache reasoning',semantic:true};
const prepared=await prepareBrainPacket(env,'tenant-a',p,request,{fetcher});assert(prepared.retrieval);const before=embedCalls;assert.equal((await prepareBrainPacket(env,'tenant-a',p,request,{forGeneration:true,expectedStamp:prepared.stamp,fetcher})).stamp,prepared.stamp);assert.equal(before,embedCalls,'Generation uses the reviewed retrieval packet');
await assert.rejects(()=>prepareBrainPacket(env,'tenant-b',p,request,{forGeneration:true,expectedStamp:prepared.stamp,fetcher}),/changed|expired/);
const absent=await prepareBrainPacket({...env,OPENAI_API_KEY:''},'tenant-c',p,request);assert.equal(absent.retrieval.mode,'graph + lexical');assert(absent.retrieval.reason.includes('unavailable'));
// Sol on Anthropic (round 5): the semantic source search stays an OpenAI embedding call; an Anthropic key is never sent to it.
const anthropicOnly=await prepareBrainPacket({...env,OPENAI_API_KEY:'',ANTHROPIC_API_KEY:'synthetic-anthropic-key',AIW_LLM_PROVIDER:'anthropic'},'tenant-d',p,request,{fetcher:async()=>{throw Error('No embedding request without the OpenAI key.');}});assert.equal(anthropicOnly.retrieval.mode,'graph + lexical');assert(anthropicOnly.retrieval.reason.includes('unavailable'));
const post=async(owner,path,body)=>worker.fetch(new Request('https://aiw.test'+path,{method:'POST',headers:{'oai-authenticated-user-id':owner,Origin:'https://aiw.test','Content-Type':'application/json'},body:JSON.stringify(body)}),env);
let response=await post('owner-a','/api/projects',{name:'Knowledge API',template:'blank',brief:'Private knowledge.'}),stored=await response.json();
response=await post('owner-b','/api/commands?project='+stored.document.id,{revision:stored.revision,command:{type:'knowledge.source',payload:{title:'X',body:'Y',revision:'1',path:'z'}}});assert.equal(response.status,404);
response=await post('owner-a','/api/commands?project='+stored.document.id,{revision:stored.revision,command:{type:'knowledge.source',payload:{title:'Private source',body:'Persist original bytes.',revision:'1',path:'private.md'}}});assert.equal(response.status,200);stored=await response.json();assert.equal(stored.document.knowledge.sources[0].actor,'owner-a');
response=await post('owner-a','/api/commands?project='+stored.document.id,{revision:stored.revision-1,command:{type:'knowledge.source',payload:{}}});assert.equal(response.status,409);
const storedRow=await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind('owner-a',stored.document.id).first();
const metadata=JSON.parse(storedRow.document);assert(metadata.knowledge.storageKey);assert(!metadata.knowledge.sources,'Original source bytes stay outside the D1 row');
const storageKey=metadata.knowledge.storageKey,originalBytes=files.get(storageKey);files.set(storageKey,originalBytes.replace('Persist original bytes.','Tampered original bytes.'));
let reopened=await worker.fetch(new Request('https://aiw.test/api/project?project='+stored.document.id,{headers:{'oai-authenticated-user-id':'owner-a'}}),env);assert.equal(reopened.status,422,'Content corruption cannot be silently accepted');assert.equal((await reopened.json()).code,'integrity','and is reported as an integrity fault, not a transient outage (round 2, B2-06)');files.set(storageKey,originalBytes);
const put=env.FILES.put;env.FILES.put=async()=>{throw Error('Synthetic knowledge storage failure');};response=await post('owner-a','/api/commands?project='+stored.document.id,{revision:stored.revision,command:{type:'knowledge.source',payload:{title:'Unstored',body:'Do not lose the saved original.',revision:'2',path:'new.md'}}});assert.equal(response.status,503);env.FILES.put=put;
reopened=await worker.fetch(new Request('https://aiw.test/api/project?project='+stored.document.id,{headers:{'oai-authenticated-user-id':'owner-a'}}),env);const reopenedData=await reopened.json();assert.equal(reopenedData.revision,stored.revision);assert.equal(reopenedData.document.knowledge.sources.length,1);assert.equal(reopenedData.document.knowledge.sources[0].body,'Persist original bytes.');
env.DB.close();
console.log('PASS Brain integration: exact source identity, untrusted catalogue, the trade-off pack beside it with its own hashes and receipts, conditional claim review, contradictions, immutable releases, explicit pins, source withdrawal, model/SDD impact, saved-response rejection, repository boundaries, real embedding protocol validation, semantic cache isolation, truthful fallback and owner/revision guards. Provider transport is synthetic.');
