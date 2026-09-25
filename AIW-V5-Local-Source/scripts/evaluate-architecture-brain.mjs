// Live, bounded evaluation. Synthetic projects only. Credentials stay in env.
// Rubric checks are necessary conditions, not a substitute for external review.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {readyComposition} from '../composition-fixtures.mjs';
import {intelligencePacket} from '../public/intelligence-context.js';
import {requestIntelligence} from '../intelligence-provider.js';
const scenarios=[
 {id:'fulfilment-dual-write',topic:'delivery',answers:{commitScope:'separate'},prompt:'The business record and outbox are in separate transactions. Can this transactional outbox design guarantee publication of every committed fulfilment change? Explain the gap and the smallest correction.',requires:[/transaction|atomic/i,/separate|same|single/i,/cannot|not|gap|fail/i]},
 {id:'advisory-notification',topic:'delivery',answers:{deliveryContract:'best-effort'},prompt:'For a non-critical exhibition update, notification loss is explicitly acceptable and the authoritative report is sufficient. Compare best-effort publication with the transactional outbox. Is the simpler option worth retaining?',requires:[/best.effort|simpler/i,/loss|lost|fail/i,/overhead|complex|relay|operat/i,/duplicat/i]},
 {id:'supplier-unknown-outcome',topic:'resilience',answers:{repeatSafety:'unsafe'},prompt:'A supplier times out after possibly accepting the instruction. Discuss retry with backoff and circuit breaking. What must we establish before repeating this non-idempotent operation? Do not equate timeout with failure.',requires:[/idempot|duplicat|repeat/i,/uncertain|unknown|outcome/i,/budget|deadline|bounded|limit/i]},
 {id:'library-local-state',topic:'distribution',answers:{sessionState:'local'},prompt:'Our library catalogue sessions exist only in each server memory. Would adding a load balancer and two more replicas safely solve availability? Explain the state, shared-dependency and readiness issues before adoption, including whether affinity alone recovers a session after its instance is lost.',requires:[/session|state/i,/shared|dependen/i,/health|readiness|ready/i,/affinity|sticky/i,/recover|loss|lost/i]},
 {id:'laboratory-local-transaction',topic:'structure',answers:{crossTransaction:'local'},prompt:'Both laboratory responsibilities must commit atomically in one local transaction. Compare modular layering with separate microservices. Identify the incompatibility and retain a simpler viable alternative.',requires:[/transaction|atomic/i,/modul|layer|together/i,/separate|distribut|network/i]},
 {id:'bottleneck-calibration',topic:'distribution',answers:{analysis:JSON.stringify({inputs:{arrival:80,service:60,workers:3,downstream:100,efficiency:100},scenario:'Synthetic analytical estimate; no workload measurement supplied.'})},prompt:'Three replicas each have an assumed safe rate of 60 requests/s, but the shared dependency is capped at 100. Explain the calculated pool limit and why this is not proof of achieved capacity or availability. Use the supplied calculation.',requires:[/100/,/assum|estimat|calculat|analyt/i,/measur|test|verif/i]},
 {id:'no-fabricated-result',topic:'resilience',answers:{fallback:'fabricate'},prompt:'Could an open circuit return successful booking confirmation when the booking authority is unavailable? Explain the business correctness problem and the permitted failure response.',requires:[/cannot|must not|not.*success|fabricat|false/i,/reject|fail|unavailable|deferr/i]},
 {id:'serial-work-pool',topic:'distribution',answers:{independence:'serial'},prompt:'Every operation must follow one global order. Can we claim three replicas provide three times the useful throughput? Compare what the current recipe can establish and what needs a different coordination design.',requires:[/global|serial|order/i,/cannot|not|limit|constraint/i,/coordinat|partition|measur|test/i]}
];
const results=[];
for(const s of scenarios){
 const p=readyComposition(s.topic,s.answers),before=JSON.stringify(p),packet=intelligencePacket(p,{chapter:2,objectId:'QD-001',mode:'mind',architectureTaskId:p.coauthoring.designTasks[0].id,prompt:s.prompt+' Keep the response concise and grounded; do not invent an achieved target.'});
 const started=Date.now();
 try{
  const r=await requestIntelligence(process.env,packet),body=JSON.stringify(r.result),rubric=s.requires.map(test=>({criterion:test.source,passed:test.test(body)}));
  assert.equal(r.result.options.length,0);assert([...r.result.assumptions,...r.result.questions].every(s=>!/^S\d+$/.test(s)), 'Explanatory fields must contain meaningful prose');assert.equal(JSON.stringify(p),before);
  const graphSource=packet.sources.find(s=>s.kind==='architecture-knowledge');assert(graphSource,'The architecture method must remain in the reviewed packet');assert(r.result.sourceRefs.includes(graphSource.ref),'The explanation must cite the actual architecture method');
  results.push({id:s.id,topic:s.topic,groundingReview:r.groundingReview,provider:r.provider,model:r.model,usage:r.usage,durationMs:Date.now()-started,sourceIdentities:packet.sources.map(s=>({ref:s.ref,id:s.id,kind:s.kind})),rubric,passed:rubric.every(x=>x.passed),result:r.result});
  console.log(JSON.stringify({id:s.id,passed:results.at(-1).passed,durationMs:Date.now()-started}));
 }catch(e){results.push({id:s.id,passed:false,error:e.message,code:e.code});console.log(JSON.stringify({id:s.id,passed:false,error:e.message}));}
}
await mkdir('evidence/brain-completion',{recursive:true});
await writeFile('evidence/brain-completion/live-reasoning.json',JSON.stringify({at:new Date().toISOString(),evaluation:'Eight synthetic counterfactual scenarios with primary-source methods and bounded project context',authority:'Implementation-author evaluation with explicit rubric; not independent human approval or production calibration',results,passed:results.every(x=>x.passed)},null,2)+'\n');
if(results.some(x=>!x.passed))process.exitCode=1;
