// Bounded real-provider evaluation through Sol's production reasoning contract.
// Synthetic design alternatives; the payment policy text mirrors confirmed user input.
// No corpus originals, human reviews, selected alternatives, or measurements are created.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createProject} from '../shared/projects-domain.js';
import {applyCommand} from '../public/requirements-domain.js';
import {applyDecisionCommand} from '../public/decisions-domain.js';
import {reasoningPacket,checkRecordRefinements} from '../public/brain-reasoning.js';
import {requestReasoning} from '../intelligence-provider.js';
import {digest} from '../public/brain-integrity.js';
import {fixedOrderingIssues} from './causal-reasoning-rubric.mjs';

const cases=[
 {id:'payment-approval-race',title:'Protect pending transfer edits from approval races',
 context:'Any maker with required payment permissions may modify/delete a pending transfer before approval or rejection. First valid committed action wins; approval requires the current request version. Workload and response-time target are not yet agreed. Creation/approver permissions and deletion retention remain open. No runtime test has been executed.',
 alternatives:[['Optimistic conditional update','Atomically check current version, pending state and required payment permissions in the authoritative store; reject a stale or terminal-state request.'],['Serialized request update','Serialize actions on the same request, then recheck current version, pending state and permission before committing.']],
 prompt:'Compare these two candidate mechanisms against the stated approval/edit race rule. Explain the correctness boundary, concurrency trade-off, implementation obligations and a falsifiable race test. Keep workload/latency unknown, and do not choose or approve for the architect.',
 requires:[['current version',/version|stale/i],['atomic commitment',/atomic|commit|transaction/i],['permission boundary',/permiss|authoriz/i],['competing alternatives',/optimistic|conditional/i],['serialization trade-off',/serial|lock|contention|blocking/i],['verification',/test|verif|assert/i],['unagreed target',/not.*(?:agreed|established|stated)|unknown|unspecified|without workload|lack of workload|(?:undefined|missing|lack of).*latency/i]]},
 {id:'unknown-outcome-retry',title:'Handle an uncertain supplier instruction outcome',
 context:'A remote supplier may commit an instruction before its response is lost. Repeating the instruction is not established to be safe. There is no supplied workload, latency target, deduplication guarantee or test result.',
 alternatives:[['Repeat after backoff','Retry the timed-out operation after waiting.'],['Reconcile before retry','Preserve the original operation identity, establish its result with the authority, and only repeat under a verified repeat-safety contract.']],
 prompt:'Explain why a timeout does not establish failure. Compare both alternatives and the role and limits of a circuit breaker. State mechanism, applicability, correctness risk, component/interface obligations and a fault-injection test. No success or measured performance claim is supported.',
 invalidPreference:'ALT-001',requires:[['uncertain outcome',/unknown|uncertain|may.*commit|possibly/i],['duplicate risk',/duplicat|idempot|repeat.safe/i],['breaker limit',/circuit|breaker/i],['reconciliation',/reconcil|query.*(?:result|status)|outcome.*check/i],['verification',/test|inject|simulat|verif/i]]},
 {id:'global-order-workers',title:'Scale processing while preserving global order',
 context:'Every operation must commit in one global order. Work is not independent. No measured service rate or workload is available. Multiple consumers may finish operations in different orders. No broker or database product has been chosen.',
 alternatives:[['Concurrent competing consumers','Add independent workers consuming from a queue.'],['One ordered commit authority','Retain one sequenced commit authority and parallelize only work proved independent of the ordered commit.']],
 prompt:'Compare these realizations against global ordering. Explain mechanism, limitation, quality trade-off, component/interface obligations and an ordering test. Do not claim worker count multiplies throughput or invent a product selection.',
 invalidPreference:'ALT-001',constraintCheck:true,requires:[['global order',/global|serial|sequenc/i],['parallelism limitation',/cannot|limit|bottleneck|not.*(?:guarantee|linear|proportional|multiply)/i],['commit authority',/commit|authorit/i],['quality trade-off',/throughput|latency|contention|bottleneck/i],['verification',/test|verif|assert/i]]},
 {id:'per-key-order-workers',title:'Scale independent keys while preserving each key order',
 context:'The revised constraint requires ordering only within each request key. Different request keys are independent. No measured service rate or workload is available. Multiple workers may finish different keys in different orders. No broker or database product has been chosen.',
 alternatives:[['Concurrent competing consumers','Add independent workers consuming from a queue without a per-key ordering contract.'],['Partitioned ordered commit authority','Route each key to one ordered commit authority while allowing independent keys to progress concurrently.']],
 prompt:'The ordering constraint changed from global to per-key. Compare these realizations, say what reasoning and obligations change and what still needs verification. Explain ordering ownership, skew/hot-key limits and a concurrency test. Do not claim measured scaling.',
 invalidPreference:'ALT-001',constraintCheck:true,requires:[['changed scope',/per.key|each key|same key|partition/i],['parallelism across keys',/independent|parallel|concurrent/i],['ordering ownership',/order|sequenc/i],['skew limitation',/skew|hot.key|uneven|imbalance/i],['verification',/test|verif|assert/i]]}
];
const output=resolve(process.argv[2]||'evidence/causal-reasoning');
await mkdir(output,{recursive:true});
assert(process.env.OPENAI_API_KEY,'OpenAI credential required; no evaluation was sent.');
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/^AIW_|^(?:OPENAI|ANTHROPIC)_/.test(k)));
Object.assign(env,{OPENAI_API_KEY:process.env.OPENAI_API_KEY,AIW_LLM_PROVIDER:'openai',AIW_LLM_MODEL:'gpt-4.1-mini',AIW_LLM_TIMEOUT_MS:'120000'});
const results=[];
for(const c of cases){
 let p=createProject({name:'Bounded reasoning evaluation: '+c.id,template:'blank'},'causal-'+c.id);
 p=applyCommand(p,{type:'artefact',payload:{type:'requirement',title:c.title,description:c.context,acceptance:'A proposed verification protocol must exercise the stated correctness boundary.',source:'Bounded implementation evaluation; no approval or runtime evidence.',confirmed:false}}).document;
 p=applyDecisionCommand(p,{type:'decision.save',payload:{question:c.title+'?',context:c.context,requirementIds:['REQ-001'],driverIds:[],topic:'custom'}}).document;
 for(const [title,consequences] of c.alternatives)p=applyDecisionCommand(p,{type:'decision.alternative',payload:{id:'ADR-001',title,summary:consequences,consequences}}).document;
 const request={task:'decisions',ids:['M:1:REQ-001','D:ADR-001'],scope:'evaluation:'+c.id,prompt:c.prompt};
 const before=JSON.stringify(p),packet=reasoningPacket(p,request),started=Date.now();
 await writeFile(resolve(output,c.id+'-input.json'),JSON.stringify({authority:'Evaluation input, not a selected or approved design',request,packet},null,2));
 try{
  const run=await requestReasoning(env,packet,{check:r=>checkRecordRefinements(p,packet,r)});
  const assessment=run.result.assessments.find(a=>a.id==='D:ADR-001');
  const body=JSON.stringify(assessment||{}),rubric=c.requires.map(([criterion,re])=>({criterion,passed:re.test(body)}));
  // Strengthened after independent reading found that keyword-complete advice
  // still preferred an option contradicting the fixed ordering constraint.
  const structural={unchangedProject:JSON.stringify(p)===before,noSelection:!p.decisions.records[0].selectedAlternativeId,adviceShown:!!assessment&&!assessment.withheld,ownSourceCited:!!assessment?.sourceRefs?.includes(packet.items.find(i=>i.id==='D:ADR-001').ref),noInvalidPreference:!c.invalidPreference||assessment?.preferred!==c.invalidPreference};
  if(c.constraintCheck)rubric.push({criterion:'Explicit alternative check rejects the unordered alternative under the fixed requirement',passed:assessment?.alternativeChecks?.some(x=>x.alternativeId==='ALT-001'&&x.admissibility==='violates_constraint')===true});
  const constraintRubricIssues=c.constraintCheck?fixedOrderingIssues(run.result):[];
  if(c.constraintCheck)rubric.push({criterion:'Summary and assessment prose preserve the fixed ordering constraint without contradicting the alternative checks',passed:constraintRubricIssues.length===0});
  results.push({id:c.id,passed:rubric.every(r=>r.passed)&&Object.values(structural).every(Boolean),durationMs:Date.now()-started,rubric,constraintRubricIssues,structural,provider:run.provider,model:run.model,usage:run.usage,providerReceipt:run.providerReceipt,groundingReview:run.groundingReview,result:run.result,packetStamp:packet.stamp,knowledgeCoverage:packet.knowledgeCoverage,sourceKinds:[...new Set(packet.sources.map(s=>s.kind))]});
 }catch(e){results.push({id:c.id,passed:false,error:String(e.message).replace(/sk-[\w-]{12,}/g,'[REDACTED]'),code:e.code,durationMs:Date.now()-started});}
 console.log(JSON.stringify({id:c.id,passed:results.at(-1).passed,durationMs:results.at(-1).durationMs}));
 await writeFile(resolve(output,'results.json'),JSON.stringify({at:new Date().toISOString(),evaluation:'Four bounded real-provider causal reasoning cases through the production Sol contract',authority:'Implementation-authored necessary-condition rubric, not independent architecture approval or accuracy certification',inputDigest:digest(cases.map(({requires,...x})=>x)),passed:results.length===cases.length&&results.every(x=>x.passed),results},null,2));
}
if(results.some(r=>!r.passed))process.exitCode=1;
