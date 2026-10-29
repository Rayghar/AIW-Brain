// Deliberately false synthetic candidates; only the source check calls OpenAI.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {readyComposition} from '../composition-fixtures.mjs';
import {intelligencePacket} from '../public/intelligence-context.js';
import {requestIntelligence} from '../intelligence-provider.js';
const cases=[
 {topic:'distribution',answers:{sessionState:'local'},claim:'A single endpoint preserves in-memory sessions even when that server crashes. Session affinity also restores lost memory on any replica.'},
 {topic:'delivery',answers:{deliveryContract:'best-effort',duplicates:'deduplicated'},claim:'Because lost notifications are acceptable, we can remove the recorded duplicate protection. An outbox guarantees exactly-once, globally ordered business effects without consumer controls.'}
];
const results=[];
for(const c of cases){
 const p=readyComposition(c.topic,c.answers),packet=intelligencePacket(p,{chapter:2,objectId:'QD-001',mode:'mind',architectureTaskId:p.coauthoring.designTasks[0].id,prompt:'Explain the design limits.'});
 const source=packet.sources.find(s=>s.kind==='architecture-knowledge'),candidate={title:'Deliberately false evaluation candidate',summary:c.claim,passage:c.claim,assumptions:[],questions:[],options:[],sourceRefs:['S1',source.ref]};let calls=0;
 const r=await requestIntelligence(process.env,packet,{fetcher:async(url,init)=>++calls===1?Response.json({id:'synthetic-candidate',status:'completed',model:'synthetic-candidate',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(candidate)}]}]}):fetch(url,init)});
 assert.equal(r.groundingReview.accepted,false,'False mechanism guarantee must be withheld');assert.match(r.result.title,/Structured guidance/);
 results.push({topic:c.topic,rejected:true,reviewModel:r.groundingReview.reviewModel,issues:r.groundingReview.issues,result:r.result});console.log('PASS real source check withheld false '+c.topic+' claims');
}
await writeFile('evidence/brain-completion/live-guard.json',JSON.stringify({at:new Date().toISOString(),authority:'Two deliberately false synthetic candidates checked by the connected provider; not a general guarantee of factual accuracy',results},null,2)+'\n');
