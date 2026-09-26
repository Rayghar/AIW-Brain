import {generateKeyPairSync,createPublicKey,sign} from 'node:crypto';
import {canonicalJSON,repositorySyncRequest,verifyRepositorySync,applyRepositorySync} from './repository-sync.js';
import assert from 'node:assert/strict';
import {createProject} from './public/projects-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {BRAIN_CATALOGUE,applyKnowledgeCommand,knowledgeStamp,releasedClaims,knowledgeEligibility} from './public/knowledge-governance.js';
import {AKR_DISCOVERY} from './public/akr-discovery.js';
import {renderKnowledgeSources} from './public/knowledge-sources-ui.js';
import {sha256} from './public/brain-integrity.js';
import {acquireRepositorySource} from './knowledge-service.js';
import {brainContext} from './public/aiw-brain.js';

const at=new Date().toISOString(),actor='acceptance-reviewer';
const review={reviewed:true,reviewer:actor,reason:'Synthetic review checks exact provenance and conditional interpretation.'};
const lead=AKR_DISCOVERY.leads.find(x=>x.connectorId==='GH-MICROSOFT-ARCH-CENTER'&&x.path.endsWith('cache-aside-content.md'));
assert(lead,'AKR archive indexes a real Microsoft cache aside locator');
assert.equal(AKR_DISCOVERY.leads.length,56);
assert.equal(AKR_DISCOVERY.indexedConnectorCount,14);
assert.equal(AKR_DISCOVERY.archiveSha256.length,64);
for(const x of AKR_DISCOVERY.leads){
 const repo=BRAIN_CATALOGUE.repositories.find(r=>r.connectorId===x.connectorId);
 assert.equal(x.repository,repo?.repository);
 assert.match(x.commitSha,/^[a-f0-9]{40}$/);
 assert.match(x.contentSha256,/^[a-f0-9]{64}$/);
 assert(!x.path.includes('..'));
}

let p=createProject({name:'Library equipment',template:'blank',brief:'Show catalogue descriptions; keep reservations current.'},'ingestion-acceptance');
p=withFinalReview(applyCommand(p,{type:'artefact',payload:{type:'requirement',title:'Read equipment descriptions',description:'Old descriptions are tolerable for read views only.',acceptance:'Reservation writes remain authoritative.',owner:'Facilities',source:'Synthetic',confirmed:true}},at).document);
const original=[
 '# Cache Aside',
 'For descriptive catalogue reads, a cache-aside copy may be used when callers tolerate a bounded delay and the original service remains authoritative.',
 '',
 'For reservation writes, the service must obtain current authoritative state; a stale cached description cannot authorise a conflicting reservation.',
 '',
 '<script>untrusted source text must remain escaped in the interface</script>',
].join('\n');
const fetchUrls=[];
const fetcher=async url=>{
 fetchUrls.push(url);
 return url.startsWith('https://api.github.com/')?new Response(lead.commitSha):new Response(original);
};
const archived={connectorId:lead.connectorId,ref:lead.commitSha,path:lead.path,expectedHash:lead.contentSha256,discoveryId:lead.id};
await assert.rejects(()=>acquireRepositorySource(p,archived,{},actor,at,{fetcher}),/differs from the requested source hash/);
assert.equal(p.knowledge?.sources?.length||0,0,'A mismatched AKR locator cannot create a source');
assert(fetchUrls[1].includes('/'+lead.commitSha+'/'+lead.path));
await assert.rejects(()=>acquireRepositorySource(p,{...archived,path:'docs/other.md'}, {},actor,at,{fetcher}),/locator differs/);

const retrieved=await acquireRepositorySource(p,{connectorId:lead.connectorId,ref:lead.commitSha,path:lead.path,expectedHash:sha256(original)}, {},actor,at,{fetcher});
p=retrieved.document;const sourceId=retrieved.selected;
assert.equal(p.knowledge.sources[0].hash,sha256(original));
assert.equal(p.knowledge.sources[0].revision,lead.commitSha);
assert.equal(p.knowledge.sources[0].origin,'repository-fetch');
assert.equal(p.knowledge.claims.length,0,'Retrieval alone confers no knowledge authority');
const repeat=await acquireRepositorySource(p,{connectorId:lead.connectorId,ref:lead.commitSha,path:lead.path,expectedHash:sha256(original)}, {},actor,at,{fetcher});
assert.equal(repeat.selected,sourceId);
assert.equal(repeat.document.knowledge.sources.length,1,'Repeated retrieval does not create duplicate revisions');

const command=(type,payload)=>{const result=applyKnowledgeCommand(p,{type:'knowledge.'+type,payload},at,type==='review'?'independent-fixture-reviewer':actor);p=result.document;return result.selected;};
command('suggest',{sourceId});
assert.equal(p.knowledge.suggestions.length,2);
assert(p.knowledge.suggestions.every(x=>x.sourceHash===sha256(original)&&x.excerptHash===sha256(x.excerpt)));
const first=p.knowledge.suggestions[0],second=p.knowledge.suggestions[1];
assert(first.conceptIds.includes('PAT-CACHE-ASIDE'),'Candidate links to descriptive catalogue concept');
const version=p.knowledge.version;
command('suggest',{sourceId});assert.equal(p.knowledge.version,version,'Repeated discovery is idempotent');
const rendered=renderKnowledgeSources(p,'cache-aside');
assert(rendered.includes(lead.id)&&rendered.includes('Interpret this passage'));
assert(rendered.includes('&lt;script&gt;')&&!rendered.includes('<script>'));
const tampered=structuredClone(p);tampered.knowledge.sources[0].body+='altered';
assert.throws(()=>applyKnowledgeCommand(tampered,{type:'knowledge.claim',payload:{sourceId,suggestionId:first.id}},at,actor),/changed/);

const claim=command('claim',{sourceId,suggestionId:first.id,lineStart:first.lineStart,lineEnd:first.lineEnd,subjectId:'PAT-CACHE-ASIDE',claimType:'applicability',predicate:'permits a stale copy',polarity:'supports',statement:'Equipment descriptions may use a bounded stale copy for read views.',conditions:['Callers tolerate a bounded delay.'],limitations:['Reservation writes still use authoritative state.']});
assert.equal(p.knowledge.suggestions[0].claimId,claim);
assert.equal(releasedClaims(p).length,0);
// Four eyes: the claim's author cannot verify it; the check is repeated on every read.
assert.throws(()=>applyKnowledgeCommand(p,{type:'knowledge.review',payload:{...review,id:claim,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true}},at,actor),/Another authenticated person must verify it/);
command('review',{...review,id:claim,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true});
const reviewed=p.knowledge.claims.find(x=>x.id===claim);assert.equal(knowledgeEligibility(p,reviewed).eligible,true,'verified by another person');
const selfReviewed=structuredClone(p);selfReviewed.knowledge.claims.find(x=>x.id===claim).review.actor=actor;
assert.match(knowledgeEligibility(selfReviewed,selfReviewed.knowledge.claims.find(x=>x.id===claim)).reasons.join(' '),/Its author verified it/,'a claim its author verified is not used, whenever it was saved');
const release=command('release',{...review,title:'Synthetic catalogue reads',claimIds:[claim]});
assert.throws(()=>command('activate',{...review,id:release,stamp:knowledgeStamp(p)}),/signed repository release/);
// Isolated cryptographic fixture; no production key or source approval is used.
const {privateKey}=generateKeyPairSync('ed25519'),publicKey=createPublicKey(privateKey).export({format:'jwk'}).x;
const signingEnv={AIW_REPOSITORY_SYNC_KEYS:JSON.stringify({'ingestion-fixture':publicKey})};
const {signature:unused,...request}=repositorySyncRequest(p,{tenantId:actor,projectId:p.id,releaseId:release});
request.storeId='10000000-0000-0000-0000-000000000001';
const packet={...request,signature:{algorithm:'Ed25519',keyId:'ingestion-fixture',value:sign(null,Buffer.from(canonicalJSON(request)),privateKey).toString('base64url')}};
p=applyRepositorySync(p,packet,await verifyRepositorySync(packet,signingEnv,{tenantId:actor,projectId:p.id}),at,actor).document;
command('activate',{...review,id:release,stamp:knowledgeStamp(p)});
assert(releasedClaims(p).some(x=>x.claim.id===claim&&x.eligible));
assert(brainContext(p,{id:'REQ-001',chapter:1}).governed.claims.some(x=>x.claim.id===claim));
const legacy=structuredClone(p);delete legacy.knowledge.suggestions;
assert.doesNotThrow(()=>applyKnowledgeCommand(legacy,{type:'knowledge.deactivate',payload:{...review,id:release,stamp:knowledgeStamp(legacy)}},at,actor),'Older project states retain a usable activation stamp');

const secondClaim=command('claim',{sourceId,suggestionId:second.id,lineStart:second.lineStart,lineEnd:second.lineEnd,subjectId:'PAT-CACHE-ASIDE',claimType:'risk',predicate:'permits a stale copy',polarity:'prohibits',statement:'A stale description cannot authorise a reservation write.',conditions:['The caller authorises a reservation write.'],limitations:['Descriptive reads are a separate context.']});
assert.equal(p.knowledge.contradictions.length,1,'Opposing interpretations are surfaced for review');
assert.throws(()=>command('review',{...review,id:secondClaim,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true}),/contradiction/);
command('contradiction',{...review,id:p.knowledge.contradictions[0].id,status:'context-separated',distinguishingContexts:'Descriptive reads tolerate bounded age; reservation writes require current authority.'});
command('review',{...review,id:secondClaim,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true});
assert(releasedClaims(p).some(x=>x.claim.id===claim&&x.eligible));
console.log('PASS AKR discovery hash boundary, exact source retrieval, idempotent passage queue, suggested concept links, escaped source, human review, contradiction disposition and active Brain claim.');
