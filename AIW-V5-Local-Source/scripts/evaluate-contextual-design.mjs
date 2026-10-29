// Two bounded, real-provider requests through the production worker routes.
// Synthetic equipment case; no corpus original, design approval or measured target.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import worker from '../worker.js';
import {localDatabase} from '../local-db.js';
import {createProject} from '../shared/projects-domain.js';
import {applyCommand} from '../public/requirements-domain.js';
const output=resolve(process.argv[2]||'evidence/contextual-openai');await mkdir(output,{recursive:true});
assert(process.env.OPENAI_API_KEY,'OpenAI credential required; no request sent.');
const owner='contextual-evaluation',id='equipment-contextual-evaluation',files=new Map();
const env={DB:localDatabase(':memory:'),FILES:{async put(k,v){files.set(k,v)},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}},ASSETS:{fetch:()=>new Response('asset')},OPENAI_API_KEY:process.env.OPENAI_API_KEY,AIW_LLM_PROVIDER:'openai',AIW_LLM_MODEL:'gpt-4.1-mini',AIW_LLM_TIMEOUT_MS:'120000'};
const redact=x=>String(x).split(process.env.OPENAI_API_KEY).join('[REDACTED]').replace(/sk-[\w-]{12,}/g,'[REDACTED]');
const save=(name,value)=>writeFile(resolve(output,name),redact(JSON.stringify(value,null,2)));
let p=createProject({name:'Bounded contextual architecture evaluation',template:'blank'},id);
p=applyCommand(p,{type:'artefact',payload:{type:'requirement',title:'Reserve equipment with an identifiable outcome',description:'Reservation requests can time out after the authoritative store commits. Repeating a request is not established to be safe. A request has a stable identity. No workload, latency, availability or recovery target is agreed. No broker or database is chosen. No runtime test has been executed.',acceptance:'Identify the original reservation outcome before repeating an uncertain request.',source:'Synthetic implementation evaluation; not project evidence.',confirmed:false}}).document;
const before=JSON.stringify(p);
await env.DB.prepare('INSERT INTO projects (owner_id,id,document,revision,updated_at) VALUES (?,?,?,1,?)').bind(owner,id,before,new Date().toISOString()).run();
const api=async(action,body)=>{const r=await worker.fetch(new Request('https://aiw.test/api/intelligence/'+action+(action.includes('?')?'&':'?')+'project='+id,{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':owner,Origin:'https://aiw.test','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);const value=await r.json();assert(r.ok,action+': '+r.status+' '+redact(value.error||''));return value;};
const report={at:new Date().toISOString(),authority:'Implementation-authored evaluation, not independent architectural approval or proof of accuracy.',inputBoundary:'One synthetic equipment requirement; no laptop corpus originals or human reviews.',checks:[],runs:[],passed:false};
const check=(name,condition)=>{report.checks.push({name,passed:!!condition});console.log((condition?'PASS ':'FAIL ')+name);};
try{
 let prior=null;
 for(const [label,prompt] of [
  ['architecture-options','Compare two materially different approaches to handling the uncertain reservation outcome. Propose responsibility, interface, information consistency and recovery operations as relevant, with named proposed components, conditions, costs, obligations and falsifiable failure-injection tests. Keep targets unknown. Explain why retry or a circuit breaker alone cannot settle an uncertain committed outcome. Do not select or approve a design.'],
  ['contextual-follow-up','Build on the preceding alternatives: identify exactly which component owns the durable request identity and outcome, what the caller does after response loss, and a fault-injection procedure with observable pass/fail criteria. Challenge any earlier suggestion that component co-location alone establishes atomicity. Retain unagreed workload and latency, and keep alternatives unselected.']]){
  const raw={chapter:4,objectId:'REQ-001',mode:'mind',architectureOperations:true,prompt,...(prior?{priorRunId:prior.id}:{})};
  const {packet}=await api('context',raw);await save(label+'-packet.json',packet);
  const begun=Date.now(),run=await api('generate',{...raw,packetStamp:packet.stamp,basePacketStamp:packet.advisoryHistory?.basePacketStamp||packet.stamp,requestId:crypto.randomUUID()});
  await save(label+'-run.json',run);
  const saved=await api('runs?id='+run.id);check(label+' completed and retained exact saved result',run.status==='completed'&&JSON.stringify(saved.result)===JSON.stringify(run.result));
  check(label+' real OpenAI provider execution',/openai/i.test(run.provider)&&/^gpt-4\.1-mini(?:-\d{4}-\d{2}-\d{2})?$/.test(run.model)&&run.usage?.inputTokens>0&&run.providerReceipt?.calls?.every(x=>x.kind==='openai'&&x.responseId));
  const ops=run.result?.architectureOperations||[],body=JSON.stringify(run.result||{});
  check(label+' typed architecture mechanisms rendered as proposals',ops.length>=2&&ops.every(x=>x.status==='proposed'&&x.verification.steps.length&&x.verification.passCriteria.length));
  check(label+' uncertain-outcome reasoning and verification present',/uncertain|unknown|response.*lost|response.*loss/i.test(body)&&/identity|identifier|request.?id/i.test(body)&&/inject|simulat|drop.*response/i.test(body));
  check(label+' no unsupported numeric service target',!/\b\d+(?:\.\d+)?\s*(?:ms|milliseconds?|rps|tps|percentile)|\b\d+(?:\.\d+)?\s*%/i.test(body));
  check(label+' workload or timing uncertainty remains visible',/unknown|unagreed|not (?:yet )?(?:agreed|specified|established)|no.*target/i.test(body));
  if(prior)check('Follow-up includes authenticated prior reasoning as advisory history',packet.advisoryHistory?.runId===prior.id&&packet.advisoryHistory.question===prior.packet.request.prompt&&packet.advisoryHistory.authority.includes('Not a design fact'));
  else check('Initial answer explores at least two distinct options',new Set(ops.map(x=>x.optionId)).size>=2);
  report.runs.push({label,id:run.id,durationMs:Date.now()-begun,provider:run.provider,model:run.model,usage:run.usage,providerReceipt:run.providerReceipt,groundingReview:run.groundingReview,operationKinds:[...new Set(ops.map(x=>x.kind))],sourceKinds:[...new Set(packet.sources.map(s=>s.kind))],reviewedClaims:packet.sources.filter(s=>s.kind==='governed-claim').length});prior=run;
 }
 const project=await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,id).first();check('Generation and follow-up preserve canonical project and human choices',project.document===before);
 report.passed=report.checks.every(x=>x.passed);
}catch(e){report.error=redact(e.message);console.log('FAIL '+report.error);}finally{env.DB.close();await save('results.json',report);}
if(!report.passed)process.exitCode=1;
