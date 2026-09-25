import assert from 'node:assert/strict';
import {createProject} from './public/projects-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {brainContext,knowledgeForContext,knowledgeReceipt,receiptCurrent,generationCurrent,KNOWLEDGE_PACK} from './public/aiw-brain.js';
import {intelligencePacket,adoptIntelligence,generationReceipt} from './public/intelligence-context.js';

const project=description=>applyCommand(withFinalReview(createProject({name:'Equipment reservations',template:'blank'},'equipment-knowledge')),{type:'artefact',payload:{type:'requirement',title:'Reserve equipment',description,owner:'Equipment team',acceptance:'An outcome is recorded.',source:'Reservation workshop'}}).document;
const context=p=>brainContext(p,{id:'REQ-001',chapter:1});
const patterns=p=>context(p).knowledge.filter(k=>k.kind==='context').map(k=>k.id);
for(const [need,wanted] of [
 ['Commit the reservation database transaction and publish an event.',['PAT-TRANSACTIONAL-OUTBOX']],
 ['The upstream inventory dependency can time out.',['PAT-CIRCUIT-BREAKER']],
 ['Retry transient failures without duplicate effects.',['PAT-RETRY-WITH-BACKOFF']],
 ['Separate connection pools must protect reserved capacity.',['PAT-BULKHEAD']],
 ['Workload identity must prevent lateral movement.',['PAT-ZERO-TRUST']],
 ['Reconstruct reservation state from authoritative event history.',['PAT-EVENT-SOURCING']],
 ['Record an audit trail for reservations.',[]],
 ['Keep a pool of equipment available for reservations.',[]],
 ['Retry is not required.',[]],
 ['Do not use event sourcing.',[]],
 ['Never retry requests.',[]],
 ['No circuit breaker is needed.',[]]
])assert.deepEqual(patterns(project(need)),wanted,need);
assert.equal(KNOWLEDGE_PACK.records.length,8);
assert(KNOWLEDGE_PACK.records.every(r=>receiptCurrent(knowledgeReceipt(r.id))));
assert.equal(knowledgeReceipt('STYLE-LAYERED').recordSha256,'2a98b33ad6694b2c4785dbf093a30449f00417c12525897b0221c162706b4298');
const legacy=knowledgeReceipt('STYLE-LAYERED');legacy.content={problem:legacy.content.problem,prerequisites:legacy.content.prerequisites,obligations:legacy.content.obligations};assert(receiptCurrent(legacy),'Old narrow receipts remain current');

let p=project('Reserve available equipment.'),c=context(p);
assert(c.knowledge.every(k=>k.kind==='comparison'&&k.signals.length===0),'Fallback comparisons do not claim a matched need');
c.neighbours.push({id:'OTHER',title:'Unrelated retry policy',record:{description:'Retry network calls using circuit breakers.'}});
c.constraints.push({id:'OTHER-CONSTRAINT',description:'Workload identity for an unrelated programme.'});
assert(knowledgeForContext(c).every(k=>k.kind==='comparison'),'Shared neighbours and general constraints cannot manufacture local pattern intent');
c.drivers=[{id:'QA-001',title:'Temporary errors',record:{response:'Retry transient errors within a bounded latency budget.'}}];
assert.equal(knowledgeForContext(c)[0].signals[0].objectId,'QA-001','Linked quality scenario is a visible retrieval basis');

const request={chapter:1,objectId:'REQ-001',mode:'mind',prompt:'Explore retry with backoff. What must be established first?'};
const packet=intelligencePacket(p,request),source=packet.sources.find(s=>s.objectId==='PAT-RETRY-WITH-BACKOFF');
assert(!packet.canDesign,'A pattern question must not become an unrelated boundary redesign');
assert(intelligencePacket(p,{...request,prompt:'Compare cohesive and separate coordination boundaries, including retry consequences.'}).canDesign,'An explicit boundary question can still enter the supported design review');
assert(source);assert.equal(source.relevance.signals[0].origin,'request');
assert.equal(source.relevance.prerequisiteStatus,'Unassessed; a topic match does not establish suitability');
const excerpt=JSON.parse(source.excerpt);assert(excerpt.risks.some(r=>/Nested retries/.test(r)));assert(excerpt.prerequisites.length);assert(!source.truncated);
assert(!source.receipt.liveSource&&!source.receipt.scoring);assert.equal(source.receipt.claims.length,0);assert.doesNotMatch(JSON.stringify(packet),/bank|payment|ledger/i);
const run={id:'RUN-KNOWLEDGE',status:'completed',provider:'OpenAI',model:'mock-evaluation',updatedAt:'2026-09-20T00:00:00Z',packet,result:{title:'Consider recovery',summary:'An open question.',passage:'Retry remains a candidate. Idempotency and the time budget need evidence.',sourceRefs:['S1',source.ref],assumptions:['Transient error classification is unconfirmed.'],questions:['What bounds retry time?'],options:[]}};
const before=JSON.stringify(p.artefacts),adopted=adoptIntelligence(p,{kind:'passage'},run).document,n=adopted.coauthoring.narratives[0];
assert.equal(JSON.stringify(adopted.artefacts),before);assert(!n.accepted);
const saved=n.generation.sources.find(s=>s.objectId===source.objectId);assert.deepEqual(saved.relevance,source.relevance);assert.deepEqual(saved.receipt.content.risks,source.receipt.content.risks);
assert(generationCurrent(adopted,generationReceipt(run)));
p=applyCommand(adopted,{type:'artefact',payload:{...adopted.artefacts[0],description:'The reservation requirements have changed.'}}).document;
assert(!generationCurrent(p,n.generation),'Changed design requires renewed review, even when the knowledge release is unchanged');
assert.throws(()=>adoptIntelligence(p,{kind:'passage'},run),/source context changed/);
console.log('PASS Knowledge: 12 relevance cases, linked quality basis, no shared-neighbour bleed, explicit uncertainty, original receipt compatibility, request-origin distinction, risk/prerequisite packet, saved provenance and stale-source review. No live provider call.');
