import assert from 'node:assert/strict';
import {generateKeyPairSync,createPublicKey,sign} from 'node:crypto';
import {createProject} from './public/projects-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyKnowledgeCommand,knowledgeStamp,knowledgeEligibility,releasedClaims,claimReceipt,claimReceiptCurrent} from './public/knowledge-governance.js';
import {knowledgeGraph,knowledgeNeighbourhood} from './public/knowledge-graph.js';
import {renderKnowledgeGraph} from './public/knowledge-graph-ui.js';
import {renderAKRDiscovery} from './public/akr-source-discovery-ui.js';
import {renderRepositoryPilot,repositoryLocators} from './public/repository-pilot-ui.js';
import {architectureBrain} from './public/architecture-brain.js';
import {brainContext} from './public/aiw-brain.js';
import {acquireRepositorySource} from './knowledge-service.js';
import {sha256} from './public/brain-integrity.js';
import {AKR_DISCOVERY} from './public/akr-discovery.js';
import {repositorySyncRequest,verifyRepositorySync,applyRepositorySync,canonicalJSON} from './repository-sync.js';

const at='2026-09-23T03:00:00Z',actor='synthetic-architect';
const approval={reviewed:true,reviewer:'Synthetic reviewer',reason:'Synthetic independent examination of exact source text, conditions, and permitted use.'};
let p=createProject({name:'Equipment information',template:'blank',brief:'Retain current reservation state.'},'second-brain-acceptance');
p=withFinalReview(applyCommand(p,{type:'artefact',payload:{type:'requirement',title:'Read equipment descriptions',description:'Descriptive views may be slightly older, but reservations require current state.',acceptance:'Writes remain authoritative.',owner:'Facilities',source:'Synthetic workshop',confirmed:true}},at).document);
const path='docs/patterns/cache-aside-content.md',connectorId='GH-MICROSOFT-ARCH-CENTER';
const firstBody=[
 '# Cache Aside',
 'For equipment catalogue descriptions, a cache-aside read can use a bounded older copy when callers tolerate it and writes remain authoritative.',
 '',
 '# Modular Monolith',
 'A modular monolith may keep service boundaries explicit while maintaining a single deployable unit when distributed operations are not justified.',
].join('\n');
let body=firstBody,commit='a'.repeat(40),urls=[];
const fetcher=async url=>{urls.push(url);return url.includes('api.github.com')?new Response(commit):new Response(body);};
const command=(kind,payload,by=actor)=>{const out=applyKnowledgeCommand(p,{type:'knowledge.'+kind,payload},at,by);p=out.document;return out.selected;};
let result=await acquireRepositorySource(p,{connectorId,path,ref:'main',expectedHash:sha256(body)}, {},actor,at,{fetcher});p=result.document;const sourceId=result.selected;
assert(urls[1].includes('/'+commit+'/'+path));
command('suggest',{sourceId});assert.equal(p.knowledge.suggestions.length,2);
const [cachePassage,modularPassage]=p.knowledge.suggestions;
const cacheId=command('claim',{sourceId,suggestionId:cachePassage.id,lineStart:cachePassage.lineStart,lineEnd:cachePassage.lineEnd,subjectId:'PAT-CACHE-ASIDE',claimType:'applicability',predicate:'permits an older read copy',polarity:'supports',statement:'Equipment descriptions may use a bounded older copy for read views.',conditions:['Callers tolerate bounded age.'],limitations:['Reservation writes require authoritative state.']});
const modularId=command('claim',{sourceId,suggestionId:modularPassage.id,lineStart:modularPassage.lineStart,lineEnd:modularPassage.lineEnd,subjectId:'STYLE-MODULAR-MONOLITH',claimType:'tradeoff',predicate:'offers an alternative boundary',polarity:'supports',statement:'A single deployable unit can preserve explicit module boundaries.',conditions:['Distributed operations are not justified.'],limitations:['Module boundaries still require discipline.']});
for(const id of [cacheId,modularId])command('review',{...approval,id,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true},'synthetic-independent-reviewer');
const releaseId=command('release',{...approval,title:'Synthetic conditional architecture guidance',claimIds:[cacheId,modularId]});
assert.throws(()=>command('activate',{...approval,id:releaseId,stamp:knowledgeStamp(p)}),/signed repository release/);
const {privateKey}=generateKeyPairSync('ed25519'),keyId='synthetic-key',publicKey=Buffer.from(createPublicKey(privateKey).export({format:'jwk'}).x,'base64url').toString('base64url');
const request=repositorySyncRequest(p,{tenantId:'synthetic-architect',projectId:p.id,releaseId});
const {signature:placeholder,...fields}=request,packet={...fields,storeId:'a'.repeat(8)+'-'+['b'.repeat(4),'c'.repeat(4),'d'.repeat(4),'e'.repeat(12)].join('-')};
packet.signature={algorithm:'Ed25519',keyId,value:sign(null,Buffer.from(canonicalJSON(packet)),privateKey).toString('base64url')};
const packetHash=await verifyRepositorySync(packet,{AIW_REPOSITORY_SYNC_KEYS:JSON.stringify({[keyId]:publicKey})},{tenantId:'synthetic-architect',projectId:p.id});
p=applyRepositorySync(p,packet,packetHash,new Date().toISOString(),actor).document;
command('activate',{...approval,id:releaseId,stamp:knowledgeStamp(p)});
const hit=releasedClaims(p).find(x=>x.claim.id===cacheId);assert(hit?.eligible);const receipt=claimReceipt(p,hit.claim,hit.release);

const graph=knowledgeGraph(p),neighbourhood=knowledgeNeighbourhood(graph,'concept:STYLE-MODULAR-MONOLITH',{depth:2});
assert(graph.nodes.some(x=>x.id==='source:'+sourceId&&x.status==='source saved'));
assert(graph.edges.some(x=>x.from==='claim:'+cacheId&&x.to==='source:'+sourceId&&x.kind==='supported by'));
assert(graph.edges.some(x=>x.from==='release:'+releaseId&&x.to==='claim:'+modularId));
assert(graph.edges.some(x=>x.from==='concept:PAT-CACHE-ASIDE'&&x.kind==='carries obligation'));
assert(graph.edges.some(x=>x.from==='concept:PAT-CACHE-ASIDE'&&x.kind==='suggests component role'));
assert(neighbourhood.nodes.some(x=>x.id==='source:'+sourceId),'Two-hop concept exploration reaches exact source');
assert(neighbourhood.backlinks.some(x=>x.node.id==='claim:'+modularId));
const page=renderKnowledgeGraph(p,{focusId:'claim:'+cacheId,search:'equipment'});
assert(page.includes('Backlinks and related items')&&page.includes('Source SHA-256')===false&&page.includes('Excerpt SHA-256'));
assert(renderAKRDiscovery('cache-aside',p.knowledge,new Set()).includes('Select for retrieval'));
assert.equal(repositoryLocators().length,24,'Measured metadata pilot is visible without original source bytes');
const pilotPage=renderRepositoryPilot(p.knowledge,'caching',new Set());
assert(pilotPage.includes('caching.md')&&pilotPage.includes('Retrieve and verify'));
assert(!pilotPage.includes('Candidate interpretation pending human architecture review.'),'Candidate interpretations are not shown as advice');

const ctx=brainContext(p,{id:'REQ-001',chapter:1});
assert(ctx.governed.claims.some(x=>x.claim.id===cacheId));
const related=architectureBrain(p,ctx,{query:'Microservices'});
assert(related.claims.some(x=>x.claim.id===modularId&&x.graphRelation?.kind==='alternative'));
assert(related.receipt.graphLinks.some(x=>x.claimId===modularId&&x.via==='STYLE-MICROSERVICES'));
assert(!related.claims.some(x=>x.claim.id===cacheId&&x.graphRelation),'Contextual lexical retrieval stays distinct from descriptive graph links');

await assert.rejects(()=>acquireRepositorySource(p,{connectorId,path:'docs/other.md',ref:'main',supersedes:sourceId}, {},actor,at,{fetcher}),/retain its registered repository/);
commit='b'.repeat(40);result=await acquireRepositorySource(p,{connectorId,path,ref:'main',supersedes:sourceId}, {},actor,at,{fetcher});
assert.equal(result.selected,sourceId,'A new commit with identical text leaves the reviewed evidence intact');
assert.equal(result.document.knowledge.sources.length,1);
body=firstBody.replace('bounded older copy','fresh copy');commit='c'.repeat(40);
result=await acquireRepositorySource(p,{connectorId,path,ref:'main',supersedes:sourceId}, {},actor,at,{fetcher});p=result.document;
assert.equal(p.knowledge.sources.length,2);assert.equal(p.knowledge.sources[1].supersedes,sourceId);
assert(!knowledgeEligibility(p,hit.claim,hit.release).eligible);
assert(!claimReceiptCurrent(p,receipt));
assert(knowledgeGraph(p).nodes.some(x=>x.id==='source:'+sourceId&&x.status==='superseded'));
assert(!brainContext(p,{id:'REQ-001',chapter:1}).governed.claims.some(x=>x.claim.id===cacheId));
await assert.rejects(()=>acquireRepositorySource(p,{connectorId,path,ref:'main',supersedes:sourceId}, {},actor,at,{fetcher}),/latest saved revision/);
console.log('PASS linked evidence graph, two-hop backlinks, governed graph retrieval, duplicate refresh, changed-source invalidation, and source lineage. Provider responses are synthetic.');
