import assert from 'node:assert/strict';
import {readyComposition} from './composition-fixtures.mjs';
import {intelligencePacket} from './public/intelligence-context.js';
import {assessInteraction,interactionReasoningGraph} from './public/architecture-knowledge.js';
import {decodeArchitectureGrounding} from './shared/architecture-grounding.js';
import {reasoningContract,enforceReasoningContract} from './shared/reasoning-contract.js';
import {requestIntelligence} from './intelligence-provider.js';

const packetFor=p=>intelligencePacket(p,{chapter:2,objectId:'QD-001',mode:'mind',architectureTaskId:p.coauthoring.designTasks.at(-1).id,prompt:'Compare the saved architecture alternatives, prerequisites and operating obligations.'});
const sourceOf=p=>p.sources.find(s=>s.kind==='architecture-knowledge');
const projections=['checks','effects','placement','obligations','nodes','edges'];
const fullGraph=(m,g)=>Object.fromEntries(projections.map(key=>[key,[...m.sharedByEveryAlternative[key],...g[key]]]));
const blockedProject=readyComposition('delivery',{deliveryContract:'required'}),packet=packetFor(blockedProject),before=JSON.stringify(packet),encoded=JSON.parse(sourceOf(packet).excerpt),decoded=decodeArchitectureGrounding(encoded);
assert.equal(encoded.encodingVersion,'aiw-architecture-grounding-2');
assert(encoded.graphs.some(g=>g.checkRefs.length));
assert(/textRef|"answer"/.test(sourceOf(packet).excerpt),'the actual packet exercises pooled prose or saved-answer references');
for(const g of decoded.graphs){
 const combined=fullGraph(decoded,g),assessment=assessInteraction(blockedProject,blockedProject.coauthoring.designTasks.at(-1),g.optionId);
 assert.deepEqual(combined.checks.map(c=>[c.id,c.state,c.fieldKeys]).sort(),assessment.checks.map(c=>[c.id,c.state,c.fieldKeys||[]]).sort(),'all typed check states and answer fields survive compression');
 assert(combined.checks.every(c=>typeof c.detail==='string'));
 const canonical=interactionReasoningGraph(blockedProject,blockedProject.coauthoring.designTasks.at(-1),g.optionId),nodeIds=new Set(combined.nodes.map(n=>n.id));
 assert(canonical.nodes.every(n=>nodeIds.has(n.id)),'explicit and implied graph nodes remain addressable');
 assert(combined.edges.every(e=>nodeIds.has(e.from)&&nodeIds.has(e.to)),'typed graph edges resolve to their nodes');
 assert.deepEqual(combined.edges.map(e=>[e.from,e.kind,e.to]).sort(),canonical.edges.map(e=>[e.from,e.kind,e.to]).sort());
}
const contract=reasoningContract(packet);assert(contract.blocked.length>0,'the required delivery contract blocks lossy publication');
assert.equal(contract.invalid,undefined);
const legacy=structuredClone(packet),legacyMethod={methodId:decoded.methodId,task:decoded.task,sources:decoded.sources,graphs:decoded.graphs,sharedByEveryAlternative:decoded.sharedByEveryAlternative,quantitative:decoded.quantitative};
sourceOf(legacy).excerpt=JSON.stringify(legacyMethod);
assert.deepEqual(reasoningContract(legacy),contract,'historical object packets retain exactly the same eligibility contract');
assert.equal(JSON.stringify(packet),before,'decoding and contract reading do not mutate the packet');
console.log('PASS legacy and compact packets retain every check, blocked state, source, implied node and typed graph edge');

const malformed=structuredClone(packet),bad=JSON.parse(sourceOf(malformed).excerpt);bad.graphs[0].checkRefs.push(bad.checkPool.length);sourceOf(malformed).excerpt=JSON.stringify(bad);
assert.throws(()=>decodeArchitectureGrounding(sourceOf(malformed).excerpt),/invalid reference/);
assert(reasoningContract(malformed).invalid);
const noChecks={summary:'Conditional design guidance.',passage:'Review the project assumptions.',assumptions:[],questions:[],options:[]};
assert.equal(enforceReasoningContract(malformed,noChecks).accepted,false,'an unreadable condition pool cannot silently waive prerequisites');
assert.throws(()=>decodeArchitectureGrounding({...encoded,encodingVersion:'future-unsupported'}),/unsupported encoding/);
assert.throws(()=>decodeArchitectureGrounding({graphs:[],sources:[],textPool:[{textRef:0}],authority:{textRef:0}}),/cyclic reference/);
assert.throws(()=>decodeArchitectureGrounding({...encoded,task:{...encoded.task,answers:{}},authority:{answer:'missing'}}),/answer reference is missing/);
assert.throws(()=>decodeArchitectureGrounding(JSON.parse('{"graphs":[],"sources":[],"__proto__":{}}')),/unsupported object key/);
console.log('PASS invalid indices, encodings, cyclic prose, missing answers and unsafe keys fail closed');

const env={OPENAI_API_KEY:'synthetic-key',AIW_LLM_MODEL:'synthetic-model'};
const response=x=>Response.json({id:'synthetic-response',model:'synthetic-model',status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(x)}]}],usage:{input_tokens:20,output_tokens:10}});
const run=async(p,{reject=false,invalid=false}={})=>{
 let calls=0;const ref=sourceOf(p).ref,draft={title:'Synthetic architecture candidate',summary:'Candidate wording for review.',passage:'Candidate wording must not override the saved prerequisites.',sourceRefs:['S1',ref],assumptions:[],questions:[],options:[],...(p.architectureDraft?{architectureDraft:[]}:{}),...(p.architectureOperations?{architectureOperations:[]}: {})};
 const result=await requestIntelligence(env,p,{fetcher:async(_url,init)=>{calls++;const request=JSON.parse(init.body);return response(request.text.format.name==='aiw_source_check'?{supported:!reject,defects:reject?['Synthetic consistency defect.']:[],notes:[]}:invalid?{}:draft);}});
 return {result,calls};
};
for(const p of [packet,legacy]){
 const {result,calls}=await run(p);assert.equal(calls,2);assert.equal(result.groundingReview.accepted,false);assert(result.groundingReview.deterministic.contract.blocked.length>0);
 assert.match(result.result.passage,/BLOCKED:/);assert.doesNotMatch(result.result.passage,/Candidate wording|\[object Object\]|undefined/);assert.equal(result.result.options.length,0);
}
const unknown=packetFor(readyComposition('resilience',{deadlinePlan:''})),unknownContract=reasoningContract(unknown);assert(unknownContract.unresolved.some(c=>c.fieldKeys.includes('deadlinePlan')));
const open=await run(unknown,{reject:true});assert.equal(open.result.groundingReview.accepted,false);assert(open.result.result.questions.some(q=>q.startsWith('Resolve: ')));assert.doesNotMatch(open.result.result.passage,/\[object Object\]|undefined/);
const corrupt=await run(malformed);assert.equal(corrupt.result.groundingReview.accepted,false);assert.match(corrupt.result.result.summary,/regenerated/);assert.equal(corrupt.result.result.options.length,0);
const invalid=await run(packet,{invalid:true});assert.equal(invalid.calls,1);assert.match(invalid.result.result.passage,/BLOCKED:/);
assert.equal(JSON.stringify(packet),before);
console.log('PASS mocked approving/rejecting/invalid provider outputs retain prerequisites, unknown questions and bounded safe fallback for legacy, compact and corrupt packets');
