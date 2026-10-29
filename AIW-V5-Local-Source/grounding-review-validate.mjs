import assert from 'node:assert/strict';
import {readyComposition} from './composition-fixtures.mjs';
import {intelligencePacket} from './public/intelligence-context.js';
import {requestIntelligence} from './intelligence-provider.js';

const p=readyComposition('delivery',{deliveryContract:'best-effort'}),before=JSON.stringify(p);
const packet=intelligencePacket(p,{chapter:2,objectId:'QD-001',mode:'mind',architectureTaskId:p.coauthoring.designTasks[0].id,prompt:'Compare publication choices and their delivery obligations.'});
const ref=packet.sources.find(s=>s.kind==='architecture-knowledge').ref;
const draft={title:'Publication choices',summary:'A draft interpretation requiring a source check.',passage:'An initial draft candidate.',sourceRefs:['S1',ref],assumptions:[],questions:[],options:[],...(packet.architectureDraft?{architectureDraft:[]}: {})};
const corrected={...draft,summary:'Loss tolerance does not waive duplicate protection.',passage:'Best-effort publication permits the declared notification loss. The recorded consumer duplicate protection remains necessary. The outbox retains intent in one transaction but does not establish ordered or exactly-once downstream effects.',questions:['How will duplicate protection be verified under uncertain publication?']};
const env={OPENAI_API_KEY:'synthetic-key',AIW_LLM_MODEL:'synthetic-model'};
const response=(result,id)=>Response.json({id,model:'synthetic-model',status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(result)}]}],usage:{input_tokens:100,output_tokens:50}});
let calls=0;
const result=await requestIntelligence(env,packet,{fetcher:async(url,init)=>{
 assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(init.redirect,'error');
 const body=JSON.parse(init.body),input=JSON.parse(body.input[0].content);assert.equal(body.store,false);
 if(body.text.format.schema.properties.assumptions)assert.equal(body.text.format.schema.properties.assumptions.items.enum,undefined);
 if(++calls===1){assert.deepEqual(input,packet);return response(draft,'draft-response');}
 assert.deepEqual(input.packet,packet);assert.deepEqual(input.candidate,draft);assert.equal(body.text.format.schema.properties.supported.type,'boolean');
 return response({supported:false,defects:['The interpretation exceeds the recorded conditions.'],notes:[]},'review-response');
}});
assert.equal(calls,2);assert.equal(result.groundingReview.accepted,false);assert.match(result.result.title,/Structured guidance/);assert(!result.result.passage.includes('An initial draft candidate.'));assert.equal(result.usage.inputTokens,200);assert.equal(result.usage.outputTokens,100);
assert.equal(result.groundingReview.packetStamp,packet.stamp);assert.equal(result.groundingReview.draftResponseId,'draft-response');assert.deepEqual(result.groundingReview.draft,draft);assert.equal(JSON.stringify(p),before);
calls=0;await assert.rejects(requestIntelligence(env,packet,{fetcher:async()=>response(++calls===1?draft:{supported:true,defects:'not a reviewed list',notes:[]},'bad-review')}),/unsupported assessment/);
calls=0;await assert.rejects(requestIntelligence(env,packet,{timeoutMs:20,fetcher:async(_url,{signal})=>++calls===1?response(draft,'draft'):new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('test timeout'))))}),/too long/);
console.log('PASS bounded source check: same packet, separate draft/final, structured fallback, aggregate usage, review provenance, invalid-review rejection, shared timeout and no model mutation. Mock provider only.');
